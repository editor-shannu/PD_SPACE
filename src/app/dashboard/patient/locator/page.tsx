'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';

interface Facility {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  type: 'hospital' | 'clinic' | 'pharmacy' | 'diagnostic';
  rating?: number;
  phone?: string;
  distance?: number;
}

// Load map dynamically to prevent SSR errors
const FacilityMap = dynamic(
  () => import('@/components/FacilityMap').then((m) => m.FacilityMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[350px] md:min-h-[500px] flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur rounded-3xl border border-dashed border-gray-200">
        <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin mb-3" />
        <p className="text-gray-400 text-xs font-semibold">Loading interactive map...</p>
      </div>
    ),
  }
);

type FacilityFilter = 'all' | 'hospital' | 'clinic' | 'pharmacy' | 'diagnostic';

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

export default function FacilityLocatorPage() {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // Keep a ref that is always in sync with state — used inside async callbacks to avoid stale closures
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [activeFilter, setActiveFilter] = useState<FacilityFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Mobile UI toggle
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // AI summary cache keyed by facility id
  const [facilityDetails, setFacilityDetails] = useState<{
    [id: string]: { summary: string; loading: boolean };
  }>({});
  const loadedDetailIds = useRef<Set<string>>(new Set());

  // Prevent duplicate fetch calls for the same coords
  const lastFetchedCoords = useRef<{ lat: number; lng: number } | null>(null);

  const getEmoji = (type: string) => {
    if (type === 'hospital') return '🏥';
    if (type === 'clinic') return '🩺';
    if (type === 'pharmacy') return '💊';
    return '🔬';
  };

  // ─── Fetch Facilities ────────────────────────────────────────────────────────
  const fetchFacilities = useCallback(async (currentLat: number, currentLng: number) => {
    // Skip if moved less than ~55 metres (0.0005 deg)
    if (lastFetchedCoords.current) {
      const dLat = Math.abs(lastFetchedCoords.current.lat - currentLat);
      const dLng = Math.abs(lastFetchedCoords.current.lng - currentLng);
      if (dLat < 0.0005 && dLng < 0.0005) return;
    }

    lastFetchedCoords.current = { lat: currentLat, lng: currentLng };
    setIsLoading(true);
    setLocationError(null);

    try {
      const res = await fetch(`/api/facilities?lat=${currentLat}&lng=${currentLng}`);
      if (!res.ok) {
        setLocationError(`Server returned ${res.status}. Please try again.`);
        setIsLoading(false);
        return;
      }
      const data = await res.json();

      if (data.success && Array.isArray(data.facilities) && data.facilities.length > 0) {
        // Recalculate distance from the EXACT coordinates we have right now
        const enriched: Facility[] = data.facilities.map((fac: Facility) => ({
          ...fac,
          distance: haversine(currentLat, currentLng, fac.lat, fac.lng),
        }));

        const within50 = enriched.filter((f) => (f.distance ?? 999) <= 50);
        within50.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));

        setFacilities(within50);
        if (within50.length > 0) setSelectedFacility(within50[0]);
        else setSelectedFacility(null);
      } else {
        setFacilities([]);
        setSelectedFacility(null);
        if (!data.success) {
          setLocationError(data.error || 'No facilities found. The external map service may be temporarily unavailable.');
        }
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
      setLocationError('Network error while fetching facilities. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Geolocation on Mount ────────────────────────────────────────────────────
  useEffect(() => {
    let watchId: number | null = null;
    let active = true;

    const applyCoords = (newLat: number, newLng: number) => {
      if (!active) return;
      coordsRef.current = { lat: newLat, lng: newLng };
      setLat(newLat);
      setLng(newLng);
      fetchFacilities(newLat, newLng);
    };

    const tryIPFallback = async () => {
      if (!active) return;
      try {
        const r1 = await fetch('https://ipapi.co/json/');
        if (r1.ok) {
          const d = await r1.json();
          if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
            setLocationStatus('denied');
            applyCoords(d.latitude, d.longitude);
            return;
          }
        }
      } catch (_) { /* ignore */ }

      try {
        const r2 = await fetch('https://freeipapi.com/api/json');
        if (r2.ok) {
          const d = await r2.json();
          if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
            setLocationStatus('denied');
            applyCoords(d.latitude, d.longitude);
            return;
          }
        }
      } catch (_) { /* ignore */ }

      // Absolute last resort — Bangalore
      setLocationStatus('denied');
      applyCoords(12.9716, 77.5946);
    };

    const onSuccess = (pos: GeolocationPosition) => {
      if (!active) return;
      setLocationStatus('granted');
      applyCoords(pos.coords.latitude, pos.coords.longitude);

      // Keep watching for movement
      if (watchId === null) {
        watchId = navigator.geolocation.watchPosition(
          (p) => active && applyCoords(p.coords.latitude, p.coords.longitude),
          (e) => console.warn('watchPosition error:', e.message),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      }
    };

    const onError = () => {
      if (!active) return;
      // Try low accuracy first
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        () => tryIPFallback(),
        { enableHighAccuracy: false, timeout: 8000 }
      );
    };

    if (typeof window === 'undefined' || !navigator?.geolocation) {
      tryIPFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 5000,
    });

    return () => {
      active = false;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [fetchFacilities]);

  // ─── AI Summary Loader ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedFacility) return;
    const id = selectedFacility.id;
    if (loadedDetailIds.current.has(id)) return;
    loadedDetailIds.current.add(id);

    setFacilityDetails((prev) => ({ ...prev, [id]: { summary: '', loading: true } }));

    (async () => {
      try {
        const res = await fetch(
          `/api/facilities/info?name=${encodeURIComponent(selectedFacility.name)}&address=${encodeURIComponent(
            selectedFacility.address
          )}&type=${selectedFacility.type}`
        );
        const data = res.ok ? await res.json() : null;
        setFacilityDetails((prev) => ({
          ...prev,
          [id]: {
            summary: data?.success && data.summary ? data.summary : 'No overview available for this facility.',
            loading: false,
          },
        }));
      } catch {
        setFacilityDetails((prev) => ({
          ...prev,
          [id]: { summary: 'Failed to load facility info.', loading: false },
        }));
      }
    })();
  }, [selectedFacility]);

  // ─── Derived list (filter by type only — distances already guaranteed ≤50km) ─
  const processedFacilities = facilities.filter((fac) =>
    activeFilter === 'all' ? true : fac.type === activeFilter
  );

  // ─── Loading State — waiting for first location fix ─────────────────────────
  if (lat === null || lng === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-10 max-w-5xl mx-auto">
        <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
        <p className="text-[#003893] text-sm font-black animate-pulse">Detecting your location...</p>
        <p className="text-gray-400 text-xs font-semibold">Please allow location permissions if prompted.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <a
          href="/dashboard/patient"
          className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition text-[#2ab8d8]"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </a>
        <div>
          <h1 className="text-xl font-bold text-[#003893] tracking-tight">Facility Locator</h1>
          <p className="text-xs text-gray-400 font-semibold">Locate nearby medical centers, diagnostics &amp; pharmacies</p>
        </div>
      </div>

      {/* Location Banner */}
      {locationStatus === 'denied' && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-lg">📍</span>
          <div>
            <h4 className="text-xs font-bold text-amber-800">Using approximate location</h4>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
              Exact GPS location was unavailable. Showing results based on your approximate network location. Enable location access in browser settings for better accuracy.
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {locationError && (
        <div className="bg-red-50/80 border border-red-200/80 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <h4 className="text-xs font-bold text-red-800">Could not load facilities</h4>
            <p className="text-[11px] text-red-600 font-semibold mt-0.5">{locationError}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs & Mobile View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'hospital', 'clinic', 'pharmacy', 'diagnostic'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all duration-200 capitalize border ${
                activeFilter === filter
                  ? 'bg-[#003893] text-white border-[#003893] shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {filter === 'all' ? 'Show All' : `${getEmoji(filter)} ${filter}s`}
            </button>
          ))}
          <button
            onClick={() => {
              lastFetchedCoords.current = null;
              if (coordsRef.current) fetchFacilities(coordsRef.current.lat, coordsRef.current.lng);
            }}
            className="px-4 py-2 text-xs font-bold rounded-full bg-white text-[#2ab8d8] border border-gray-200 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-1.5"
            title="Refresh search"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Mobile View Switcher */}
        <div className="md:hidden flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setMobileView('list')}
            className={`flex-1 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mobileView === 'list' ? 'bg-[#2ab8d8] text-white' : 'text-gray-500'
            }`}
          >
            📄 List
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={`flex-1 px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mobileView === 'map' ? 'bg-[#2ab8d8] text-white' : 'text-gray-500'
            }`}
          >
            🗺️ Map
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Facility List */}
        <div
          className={`md:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1 ${
            mobileView === 'list' ? 'block' : 'hidden md:block'
          }`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white/60 rounded-3xl border border-white">
              <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
              <p className="text-gray-400 text-xs font-semibold animate-pulse">Scanning nearby medical centers...</p>
            </div>
          ) : processedFacilities.length === 0 ? (
            <div className="bg-white/60 border border-gray-200 rounded-3xl p-10 text-center shadow-sm">
              <p className="text-3xl mb-3">🏥</p>
              <h3 className="font-bold text-gray-800 text-sm">No facilities found nearby</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                OpenStreetMap may not have data for your area, or all services are temporarily busy. Try the Refresh button or change filters.
              </p>
              <button
                onClick={() => {
                  lastFetchedCoords.current = null;
                  if (coordsRef.current) fetchFacilities(coordsRef.current.lat, coordsRef.current.lng);
                }}
                className="mt-4 px-5 py-2 bg-[#003893] text-white text-xs font-bold rounded-full shadow hover:bg-[#0c4091] transition"
              >
                🔄 Try Again
              </button>
            </div>
          ) : (
            processedFacilities.map((fac) => {
              const isSelected = selectedFacility?.id === fac.id;
              return (
                <div
                  key={fac.id}
                  onClick={() => setSelectedFacility(fac)}
                  className={`bg-white/80 border rounded-3xl p-5 cursor-pointer shadow-sm hover:shadow transition-all duration-200 ${
                    isSelected
                      ? 'border-[#2ab8d8] bg-white/95 ring-2 ring-[#2ab8d8]/20'
                      : 'border-white hover:bg-white'
                  }`}
                >
                  {/* Name & Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-lg flex-shrink-0">
                      {getEmoji(fac.type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#003893] leading-tight">{fac.name}</h3>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5 leading-snug">{fac.address}</p>
                    </div>
                  </div>

                  {/* Meta badges */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100/60 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="text-[#2ab8d8] font-black">{fac.distance} km away</span>
                    {fac.rating && (
                      <span className="flex items-center gap-0.5 text-amber-500 font-extrabold">
                        ⭐ {fac.rating}
                      </span>
                    )}
                    <span className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-lg border border-sky-100 capitalize">
                      {fac.type}
                    </span>
                  </div>

                  {/* Expanded: AI Summary + Call */}
                  {isSelected && (
                    <div
                      className="mt-4 pt-3 border-t border-gray-100/60 space-y-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-sky-50/50 border border-sky-100/60 rounded-2xl p-4 text-xs">
                        <h4 className="font-extrabold text-[#003893] flex items-center gap-1.5 mb-2 uppercase tracking-wide text-[10px]">
                          ✨ AI Overview
                        </h4>
                        {facilityDetails[fac.id]?.loading ? (
                          <div className="space-y-1.5 animate-pulse">
                            <div className="h-3 bg-sky-200/50 rounded w-full" />
                            <div className="h-3 bg-sky-200/50 rounded w-11/12" />
                            <div className="h-3 bg-sky-200/50 rounded w-4/5" />
                          </div>
                        ) : (
                          <p className="text-gray-600 font-medium leading-relaxed">
                            {facilityDetails[fac.id]?.summary || 'Loading overview...'}
                          </p>
                        )}
                      </div>

                      {fac.phone && (
                        <a
                          href={`tel:${fac.phone}`}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#003893] hover:bg-[#0c4091] text-white rounded-2xl text-xs font-bold transition shadow-sm"
                        >
                          📞 Call Facility &nbsp;·&nbsp; {fac.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Map */}
        <div className={`md:col-span-7 ${mobileView === 'map' ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-3 shadow-md h-[400px] md:h-[550px] relative">
            <FacilityMap
              userLat={lat}
              userLng={lng}
              facilities={processedFacilities}
              selectedFacility={selectedFacility}
              onSelectFacility={setSelectedFacility}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
