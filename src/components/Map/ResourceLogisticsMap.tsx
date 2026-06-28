import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapLayers } from '../../context/MapLayersContext';

interface Depot {
  id: string;
  name: string;
  lat: number;
  lng: number;
  resources: Record<string, number>;
}

interface DeploymentRoute {
  depot_id: string;
  depot_name: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  distance_km: number;
  duration_mins: number;
  coordinates: [number, number][];
}

interface ResourceLogisticsMapProps {
  depots: Depot[];
  routes: DeploymentRoute[];
  disasterCoords: { lat: number; lng: number } | null;
  disasterTitle: string;
}

export default function ResourceLogisticsMap({
  depots,
  routes,
  disasterCoords,
  disasterTitle
}: ResourceLogisticsMapProps) {
  const { layers } = useMapLayers();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map centered on Bay Area center by default
    const map = L.map(mapContainerRef.current, {
      center: [37.68, -122.15],
      zoom: 9.5,
      zoomControl: false,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers and paths
  useEffect(() => {
    const map = mapRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Draw Depot Markers
    if (layers.tacticalDepots) {
      depots.forEach((depot) => {
        const depotLatLng = L.latLng(depot.lat, depot.lng);
        bounds.extend(depotLatLng);

        // Custom DivIcon for Depot
        const depotIcon = L.divIcon({
          className: 'custom-depot-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="h-8 w-8 rounded-full bg-slate-900 border-2 border-indigo-500 shadow-lg shadow-indigo-500/20 flex items-center justify-center text-indigo-400 hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div class="absolute -bottom-5 bg-slate-900/90 border border-slate-800 text-[8px] font-black tracking-wider text-slate-300 px-1 py-0.2 rounded shadow whitespace-nowrap uppercase">
                \${depot.name.split(' (')[0]}
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const listHtml = Object.entries(depot.resources)
          .map(([key, val]) => `
            <div class="flex justify-between gap-4 py-0.5 border-b border-slate-800/60 last:border-0">
              <span class="capitalize text-slate-400 font-medium">\${key.replace('_', ' ')}:</span>
              <span class="font-bold text-slate-200">\${val}</span>
            </div>
          `).join('');

        const depotMarker = L.marker(depotLatLng, { icon: depotIcon });
        depotMarker.bindPopup(`
          <div class="p-3 bg-slate-950 border border-indigo-950/40 rounded-xl text-xs max-w-xs text-slate-100 font-sans shadow-xl">
            <h4 class="font-black text-indigo-400 text-xs mb-1.5 border-b border-indigo-950/40 pb-1.5 uppercase">\${depot.name}</h4>
            <span class="text-[9px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">Available Logistics Supply</span>
            <div class="max-h-36 overflow-y-auto pr-1 space-y-0.5">
              \${listHtml}
            </div>
          </div>
        `, { className: 'custom-leaflet-popup' });

        depotMarker.addTo(layerGroup);
      });
    }

    // 2. Draw Disaster Site Marker
    if (layers.activeDisasters && disasterCoords) {
      const disasterLatLng = L.latLng(disasterCoords.lat, disasterCoords.lng);
      bounds.extend(disasterLatLng);

      // Pulsating Danger DivIcon
      const disasterIcon = L.divIcon({
        className: 'custom-disaster-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-10 w-10 rounded-full bg-red-500/20 animate-ping"></span>
            <div class="h-9 w-9 rounded-full bg-red-600 border-2 border-white shadow-xl shadow-red-600/30 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const disasterMarker = L.marker(disasterLatLng, { icon: disasterIcon });
      disasterMarker.bindPopup(`
        <div class="p-2.5 bg-slate-950 border border-red-950/40 rounded-xl text-xs max-w-xs text-slate-100 font-sans shadow-xl">
          <span class="px-2 py-0.5 text-[8px] font-black rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-widest mb-1 inline-block">Active Disaster Area</span>
          <h4 class="font-extrabold text-white text-xs mt-1 uppercase">\${disasterTitle}</h4>
          <p class="text-[9px] text-slate-500 mt-1">Latitude: \${disasterCoords.lat.toFixed(4)} | Longitude: \${disasterCoords.lng.toFixed(4)}</p>
        </div>
      `, { className: 'custom-leaflet-popup' });

      disasterMarker.addTo(layerGroup);
    }

    // 2.2 Draw hazard risk zone
    if (layers.hazardRisks && disasterCoords) {
      const disasterLatLng = L.latLng(disasterCoords.lat, disasterCoords.lng);
      bounds.extend(disasterLatLng);

      // Draw a subtle translucent radius around disaster center
      L.circle(disasterLatLng, {
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.1,
        radius: 3500, // 3.5 km
        weight: 1,
        dashArray: '3, 4'
      }).addTo(layerGroup);
    }

    // 3. Draw Deployment Routes (Paths)
    if (layers.dispatchRoutes) {
      routes.forEach((route) => {
        const pathPoints = route.coordinates.map(pt => L.latLng(pt[0], pt[1]));

        // Animated flowing polyline using Leaflet
        const polyline = L.polyline(pathPoints, {
          color: '#a855f7', // pulsing logistics purple
          weight: 4,
          opacity: 0.8,
          lineJoin: 'round',
          lineCap: 'round',
        });

        polyline.bindTooltip(`
          <div class="px-2 py-1.5 bg-slate-950 border border-purple-950 text-[10px] text-slate-200 font-sans rounded shadow-lg uppercase">
            <strong class="text-purple-400">\${route.depot_name.split(' (')[0]} Convoy</strong><br/>
            Distance: \${route.distance_km} km<br/>
            Est. Time: \${route.duration_mins} mins
          </div>
        `, { sticky: true, className: 'custom-leaflet-tooltip' });

        polyline.addTo(layerGroup);
      });
    }

    // Fit map bounds to contain all elements nicely
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 12
      });
    }
  }, [depots, routes, disasterCoords, disasterTitle, layers]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-md">
      {/* Container where Leaflet will render */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Legend Overlay */}
      {(layers.tacticalDepots || layers.activeDisasters || layers.dispatchRoutes) && (
        <div className="absolute top-4 left-4 z-20 bg-slate-950/90 border border-slate-800/80 px-3 py-2.5 rounded-xl text-[10px] font-sans text-slate-200 shadow-md space-y-1.5 uppercase">
          <span className="text-[8px] font-black text-indigo-400 tracking-wider">Logistics Map Legend</span>
          {layers.tacticalDepots && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full border border-white"></div>
              <span>Tactical Depot Hub</span>
            </div>
          )}
          {layers.activeDisasters && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-red-600 rounded-full border border-white animate-pulse"></div>
              <span>Disaster Incident Site</span>
            </div>
          )}
          {layers.dispatchRoutes && (
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.75 bg-purple-500"></div>
              <span>Deployment Convoy Route</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
