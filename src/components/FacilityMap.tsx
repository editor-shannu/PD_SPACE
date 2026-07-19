'use client';

import React, { useEffect, useRef, useState } from 'react';

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

interface FacilityMapProps {
  userLat: number;
  userLng: number;
  facilities: Facility[];
  selectedFacility: Facility | null;
  onSelectFacility: (fac: Facility) => void;
}

export const FacilityMap: React.FC<FacilityMapProps> = ({
  userLat,
  userLng,
  facilities,
  selectedFacility,
  onSelectFacility,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const leafletLib = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const lastCenteredCoords = useRef<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const isInitializing = useRef(false);

  // 1. Initialize Leaflet & Map once on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    let isMounted = true;

    const initMap = async () => {
      if (mapInstance.current || isInitializing.current) return;
      isInitializing.current = true;

      try {
        const L = await import('leaflet');
        if (!isMounted) return;
        leafletLib.current = L;

        // Inject CSS if missing
        if (!document.getElementById('leaflet-css-cdn')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css-cdn';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (mapRef.current && !mapInstance.current) {
          const container = mapRef.current;

          // Guard to check if container is already initialized by Leaflet
          if ((container as any)._leaflet_id) {
            delete (container as any)._leaflet_id;
          }

          const safeLat = typeof userLat === 'number' && !isNaN(userLat) ? userLat : 12.9716;
          const safeLng = typeof userLng === 'number' && !isNaN(userLng) ? userLng : 77.5946;

          const map = L.map(container, {
            zoomControl: false,
          }).setView([safeLat, safeLng], 14);

          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap, © CartoDB',
            maxZoom: 20,
          }).addTo(map);

          L.control.zoom({ position: 'topright' }).addTo(map);

          mapInstance.current = map;
          lastCenteredCoords.current = { lat: safeLat, lng: safeLng };

          setTimeout(() => {
            if (mapInstance.current) {
              try {
                mapInstance.current.invalidateSize();
              } catch (_) {}
            }
          }, 200);

          if (isMounted) setMapReady(true);
        }
      } catch (err) {
        console.error('Error initializing Leaflet map:', err);
      } finally {
        isInitializing.current = false;
      }
    };

    initMap();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        mapInstance.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Invalidate map size whenever container element size changes (e.g. mobile tab switch)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !mapInstance.current) return;

    const handleResize = () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.invalidateSize();
        } catch (_) {}
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [mapReady]);

  // 2. Update Map Markers & User Pin
  useEffect(() => {
    const L = leafletLib.current;
    const map = mapInstance.current;
    if (!mapReady || !L || !map) return;

    try {
      const safeUserLat = typeof userLat === 'number' && !isNaN(userLat) ? userLat : 12.9716;
      const safeUserLng = typeof userLng === 'number' && !isNaN(userLng) ? userLng : 77.5946;

      // Check if user coordinates updated significantly
      const hasMovedSignificantly =
        !lastCenteredCoords.current ||
        Math.abs(lastCenteredCoords.current.lat - safeUserLat) > 0.001 ||
        Math.abs(lastCenteredCoords.current.lng - safeUserLng) > 0.001;

      if (hasMovedSignificantly) {
        map.setView([safeUserLat, safeUserLng], 14);
        lastCenteredCoords.current = { lat: safeUserLat, lng: safeUserLng };
      }

      // Remove existing markers
      Object.values(markersRef.current).forEach((marker) => {
        try {
          if (marker && map) map.removeLayer(marker);
        } catch (e) {
          console.warn('Error removing marker layer:', e);
        }
      });
      markersRef.current = {};

      // Add user pin marker
      const userMarkerHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 bg-sky-500/30 rounded-full animate-ping"></div>
          <div class="relative w-4 h-4 bg-[#003893] border-2 border-white rounded-full shadow-md"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        className: 'custom-user-pin',
        html: userMarkerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const userMarker = L.marker([safeUserLat, safeUserLng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<b class="text-xs">Your Location</b>');

      markersRef.current['user'] = userMarker;

      // Add facility markers
      if (Array.isArray(facilities)) {
        facilities.forEach((fac) => {
          if (typeof fac.lat !== 'number' || typeof fac.lng !== 'number' || isNaN(fac.lat) || isNaN(fac.lng)) return;

          const iconEmoji =
            fac.type === 'hospital'
              ? '🏥'
              : fac.type === 'clinic'
              ? '🩺'
              : fac.type === 'pharmacy'
              ? '💊'
              : '🔬';
          const isSelected = selectedFacility?.id === fac.id;
          const markerHtml = `
            <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 transition-all duration-200 ${
              isSelected
                ? 'bg-[#003893] text-white border-white scale-125 z-[999]'
                : 'bg-white text-gray-700 border-[#2ab8d8] hover:scale-110'
            }">
              <span class="text-sm">${iconEmoji}</span>
            </div>
          `;
          const markerIcon = L.divIcon({
            className: `facility-pin-${fac.id}`,
            html: markerHtml,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });

          const marker = L.marker([fac.lat, fac.lng], { icon: markerIcon })
            .addTo(map)
            .on('click', () => {
              onSelectFacility(fac);
            });

          markersRef.current[fac.id] = marker;
        });
      }
    } catch (err) {
      console.error('Error updating map markers:', err);
    }
  }, [mapReady, userLat, userLng, facilities, selectedFacility, onSelectFacility]);

  // 3. Handle selection and flyTo
  useEffect(() => {
    const L = leafletLib.current;
    const map = mapInstance.current;
    if (!mapReady || !L || !map || !selectedFacility) return;
    if (typeof selectedFacility.lat !== 'number' || typeof selectedFacility.lng !== 'number' || isNaN(selectedFacility.lat) || isNaN(selectedFacility.lng)) return;

    try {
      map.invalidateSize();
      map.flyTo([selectedFacility.lat, selectedFacility.lng], 15, {
        animate: true,
        duration: 1.5,
      });

      const marker = markersRef.current[selectedFacility.id];
      if (marker) {
        marker
          .bindPopup(`
          <div class="p-2 text-xs min-w-[120px]">
            <h4 class="font-bold text-[#003893]">${selectedFacility.name || 'Facility'}</h4>
            <p class="text-[10px] text-gray-400 font-semibold mt-0.5">${selectedFacility.address || ''}</p>
            <div class="flex items-center justify-between mt-2 pt-1 border-t border-gray-100">
              <span class="text-[9px] font-black uppercase text-[#2ab8d8]">${selectedFacility.type || ''}</span>
              <span class="text-[9px] font-bold text-gray-500">${selectedFacility.distance ?? 0} km away</span>
            </div>
          </div>
        `)
          .openPopup();
      }
    } catch (err) {
      console.warn('Error in map flyTo/popup:', err);
    }
  }, [mapReady, selectedFacility]);

  const handleRecenter = () => {
    if (mapInstance.current) {
      try {
        const safeLat = typeof userLat === 'number' && !isNaN(userLat) ? userLat : 12.9716;
        const safeLng = typeof userLng === 'number' && !isNaN(userLng) ? userLng : 77.5946;
        mapInstance.current.invalidateSize();
        mapInstance.current.setView([safeLat, safeLng], 14);
        lastCenteredCoords.current = { lat: safeLat, lng: safeLng };
      } catch (err) {
        console.warn('Error recentering map:', err);
      }
    }
  };

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden border border-white shadow-inner bg-slate-50">
      <div ref={mapRef} className="w-full h-full min-h-[350px] md:min-h-[500px] z-10" />

      <button
        onClick={handleRecenter}
        className="absolute bottom-4 right-4 z-[400] px-3.5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl shadow-lg transition-all duration-200 text-gray-700 hover:text-[#003893] flex items-center justify-center gap-1.5 text-xs font-bold"
        title="Recenter on my location"
      >
        <span className="text-sm">🎯</span> Recenter
      </button>
    </div>
  );
};

