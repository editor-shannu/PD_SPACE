'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

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

export default function FacilityLocatorPage() {
  // Default coordinates: null to ensure we wait for device geolocation first
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [activeFilter, setActiveFilter] = useState<FacilityFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  // Mobile UI toggle: list vs map
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  // Store last fetched coordinates to avoid double-fetching for tiny GPS jitter
  const lastFetchedCoords = useRef<{ lat: number; lng: number } | null>(null);

  // Helper to fetch IP-based location as a fallback if browser GPS fails/is denied
  const fetchIPLocation = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return { lat: data.latitude, lng: data.longitude };
        }
      }
    } catch (e) {
      console.warn('ipapi.co failed, trying fallback...');
    }

    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (res.ok) {
        const data = await res.json();
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return { lat: data.latitude, lng: data.longitude };
        }
      }
    } catch (e) {
      console.warn('freeipapi.com failed');
    }

    return null;
  };

  // Helper: calculate distance in km on client
  const getClientDistance = (facLat: number, facLng: number, currentLat: number | null = lat, currentLng: number | null = lng) => {
    if (currentLat === null || currentLng === null) return 99999;
    const R = 6371; // km
    const dLat = ((facLat - currentLat) * Math.PI) / 180;
    const dLon = ((facLng - currentLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((currentLat * Math.PI) / 180) *
        Math.cos((facLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Fetch facilities based on current lat/lng
  const fetchFacilities = async (currentLat: number, currentLng: number) => {
    // Only fetch if coordinates changed significantly (e.g. > 50 meters or approx 0.0005 degrees)
    if (lastFetchedCoords.current) {
      const latDiff = Math.abs(lastFetchedCoords.current.lat - currentLat);
      const lngDiff = Math.abs(lastFetchedCoords.current.lng - currentLng);
      if (latDiff < 0.0005 && lngDiff < 0.0005) {
        return; // Skip API request for minimal movement/noise
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/facilities?lat=${currentLat}&lng=${currentLng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.facilities)) {
          setFacilities(data.facilities);
          lastFetchedCoords.current = { lat: currentLat, lng: currentLng };
          
          // Pre-calculate distance client-side to find the closest one correctly
          const sorted = data.facilities
            .map((fac: any) => ({
              ...fac,
              distance: getClientDistance(fac.lat, fac.lng, currentLat, currentLng),
            }))
            .filter((fac: any) => fac.distance <= 50) // only select facilities within 50km
            .sort((a: any, b: any) => a.distance - b.distance);

          if (sorted.length > 0) {
            setSelectedFacility(sorted[0]);
          } else {
            setSelectedFacility(null);
          }
        }
      }
    } catch (e) {
      console.error('Error fetching facilities:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Get user geolocation on mount and continuously watch position
  useEffect(() => {
    let watchId: number | null = null;
    let isActive = true;

    const handleLocationSuccess = (position: GeolocationPosition) => {
      if (!isActive) return;
      const uLat = position.coords.latitude;
      const uLng = position.coords.longitude;
      setLat(uLat);
      setLng(uLng);
      setLocationStatus('granted');
      fetchFacilities(uLat, uLng);
    };

    const handleLocationError = async (error: GeolocationPositionError) => {
      if (!isActive) return;
      console.warn('Browser geolocation failed or timed out:', error.message);
      
      // Fallback to IP-based geolocation
      const ipLocation = await fetchIPLocation();
      if (!isActive) return;
      
      if (ipLocation) {
        console.log(`Using IP-based coordinates as fallback: ${ipLocation.lat}, ${ipLocation.lng}`);
        setLat(ipLocation.lat);
        setLng(ipLocation.lng);
        setLocationStatus('denied'); // Mark as denied/coarse warning but load coordinates
        fetchFacilities(ipLocation.lat, ipLocation.lng);
      } else {
        // Final fallback to Bangalore
        console.log('Using default Bangalore coordinates as fallback.');
        const defaultLat = 12.9716;
        const defaultLng = 77.5946;
        setLat(defaultLat);
        setLng(defaultLng);
        setLocationStatus('denied');
        fetchFacilities(defaultLat, defaultLng);
      }
    };

    if (typeof window === 'undefined' || !navigator.geolocation) {
      handleLocationError({
        code: 0,
        message: 'Geolocation not supported',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      } as any);
      return;
    }

    // Try to get current position immediately with high accuracy and a 5-second timeout
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleLocationSuccess(position);
        
        // Start watching for changes in the background
        watchId = navigator.geolocation.watchPosition(
          handleLocationSuccess,
          (err) => console.warn('Watch position error:', err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      },
      (err) => {
        // If high accuracy fails or times out, try low accuracy once
        navigator.geolocation.getCurrentPosition(
          handleLocationSuccess,
          handleLocationError,
          { enableHighAccuracy: false, timeout: 8000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );

    return () => {
      isActive = false;
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  if (lat === null || lng === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-10 max-w-5xl mx-auto">
        <div className="h-10 w-10 border-4 border-[#2ab8d8]/30 border-t-[#2ab8d8] rounded-full animate-spin" />
        <p className="text-[#003893] text-sm font-black animate-pulse">Detecting your location...</p>
        <p className="text-gray-400 text-xs font-semibold">Please allow location permissions if prompted.</p>
      </div>
    );
  }

  // Filter facilities by active tab type and client-side distance (within 50km)
  const processedFacilities = facilities
    .map((fac) => ({
      ...fac,
      distance: getClientDistance(fac.lat, fac.lng),
    }))
    .filter((fac) => {
      // Strict 50km radius check from the device location
      if (fac.distance > 50) return false;
      
      if (activeFilter === 'all') return true;
      return fac.type === activeFilter;
    })
    .sort((a, b) => a.distance - b.distance);

  const getEmoji = (type: string) => {
    if (type === 'hospital') return '🏥';
    if (type === 'clinic') return '🩺';
    if (type === 'pharmacy') return '💊';
    return '🔬';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/patient"
            className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition text-[#2ab8d8]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#003893] tracking-tight">Facility Locator</h1>
            <p className="text-xs text-gray-400 font-semibold">Locate nearby medical centers, diagnostics & pharmacies</p>
          </div>
        </div>
      </div>

      {/* Geolocation Notice Banner */}
      {locationStatus === 'denied' && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-lg">📍</span>
          <div>
            <h4 className="text-xs font-bold text-amber-800">Location permission required</h4>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
              Please enable location access in your browser settings to search for real clinics, hospitals, and pharmacies near your location.
            </p>
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
              if (lat !== null && lng !== null) {
                fetchFacilities(lat, lng);
              }
            }}
            className="px-4 py-2 text-xs font-bold rounded-full bg-white text-[#2ab8d8] border border-gray-200 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-1.5"
            title="Refresh current location and search again"
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

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Side: Scrollable List */}
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
              <p className="text-3xl mb-3">📍</p>
              <h3 className="font-bold text-gray-800 text-sm">No facilities found</h3>
              <p className="text-gray-400 text-xs mt-1">Try simulating another location or changing filters.</p>
            </div>
          ) : (
            processedFacilities.map((fac: Facility) => {
              const isSelected = selectedFacility?.id === fac.id;
              return (
                <div
                  key={fac.id}
                  onClick={() => setSelectedFacility(fac)}
                  className={`bg-white/80 border rounded-3xl p-5 cursor-pointer shadow-sm hover:shadow transition-all duration-200 relative overflow-hidden ${
                    isSelected ? 'border-[#2ab8d8] bg-white/95 ring-2 ring-[#2ab8d8]/20' : 'border-white hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-lg flex-shrink-0">
                        {getEmoji(fac.type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#003893] leading-tight hover:text-[#2ab8d8] transition">
                          {fac.name}
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold mt-1 leading-snug">
                          {fac.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Badges / Meta row */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100/60 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span className="text-[#2ab8d8] font-black">{fac.distance} km away</span>
                    {fac.rating && (
                      <span className="flex items-center gap-0.5 text-amber-500 font-extrabold">
                        ⭐ {fac.rating}
                      </span>
                    )}
                    <span className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded-lg border border-sky-100">
                      {fac.type}
                    </span>
                  </div>

                  {/* Actions */}
                  {isSelected && (
                    <div className="flex gap-2 mt-4 pt-2 animate-fade-in">
                      {fac.phone && (
                        <a
                          href={`tel:${fac.phone}`}
                          className="flex-1 py-2 text-center bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-600 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📞 Call
                        </a>
                      )}
                      <Link
                        href={`/dashboard/patient/booking?facility=${encodeURIComponent(
                          fac.name
                        )}&type=${fac.type}`}
                        className="flex-1 py-2 text-center bg-[#003893] hover:bg-[#0c4091] rounded-xl text-xs font-bold text-white transition shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🩺 Book Now
                      </Link>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Interactive Map */}
        <div className={`md:col-span-7 ${mobileView === 'map' ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-3xl p-3 shadow-md h-[400px] md:h-[550px] relative">
            <FacilityMap
              userLat={lat}
              userLng={lng}
              facilities={processedFacilities}
              selectedFacility={selectedFacility}
              onSelectFacility={(fac) => setSelectedFacility(fac)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
