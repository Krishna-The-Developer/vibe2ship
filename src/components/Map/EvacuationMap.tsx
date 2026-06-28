import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RouteOption, SafeZoneInput, AvoidPolygonInput } from '../../hooks/useEvacuationRoutes';
import { useMapLayers } from '../../context/MapLayersContext';
import LayerControlPanel from './LayerControlPanel';
import MapLegend from './MapLegend';

interface EvacuationMapProps {
  startLat: number;
  startLng: number;
  routes: RouteOption[];
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  avoidPolygons: AvoidPolygonInput[];
  safeZones: SafeZoneInput[];
}

export default function EvacuationMap({
  startLat,
  startLng,
  routes,
  selectedRouteId,
  onSelectRoute,
  avoidPolygons,
  safeZones,
}: EvacuationMapProps) {
  const { layers } = useMapLayers();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  
  // Layer groups to easily clear/re-add elements on data changes
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map instance
    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 13,
      zoomControl: false, // We'll add zoom control at a custom position
    });

    // Use a clean dark-themed tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Add zoom control in bottom-right corner to stay out of side panels
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    // Initialize layer groups
    routesLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    polygonsLayerGroupRef.current = L.layerGroup().addTo(map);

    // Cleanup map on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map features when routes, polygons, or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const routesGroup = routesLayerGroupRef.current;
    const markersGroup = markersLayerGroupRef.current;
    const polygonsGroup = polygonsLayerGroupRef.current;

    if (!routesGroup || !markersGroup || !polygonsGroup) return;

    // Clear old layers
    routesGroup.clearLayers();
    markersGroup.clearLayers();
    polygonsGroup.clearLayers();

    // 1. Draw Avoidance Polygons (Disaster Risk Boundaries)
    if (layers.hazardRisks) {
      avoidPolygons.forEach((poly, idx) => {
        // Coordinates in GeoJSON are [lng, lat], convert to Leaflet standard [lat, lng]
        const leafletCoords = poly.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
        
        const polygonLayer = L.polygon(leafletCoords, {
          color: '#ef4444',       // bright red border
          fillColor: '#ef4444',   // red fill
          fillOpacity: 0.25,      // semi-transparent
          weight: 2,
          dashArray: '5, 5',
          className: 'disaster-polygon-animation'
        });

        polygonLayer.bindPopup(`
          <div style="color: #fca5a5; font-family: sans-serif; font-size: 11px;">
            <strong style="color: #f87171; text-transform: uppercase;">Hazard Zone ${idx + 1}</strong>
            <p style="margin: 4px 0 0 0;">Route optimization engine actively recalculates paths to bypass this boundary.</p>
          </div>
        `, { className: 'custom-leaflet-popup' });

        polygonLayer.addTo(polygonsGroup);
      });
    }

    const bounds: L.LatLngBounds = L.latLngBounds([]);

    // 2. Draw Escape Routes (Primary and Alternative)
    if (layers.evacuationRoutes) {
      // We draw alternative routes first, so the primary route sits on top visually
      const sortedRoutesForDraw = [...routes].sort((a, b) => {
        if (a.id === selectedRouteId) return 1;
        if (b.id === selectedRouteId) return -1;
        return 0;
      });

      sortedRoutesForDraw.forEach((route) => {
        const isSelected = route.id === selectedRouteId;
        
        // Leaflet coordinates are already [lat, lng]
        const pathPoints = route.coordinates.map(pt => L.latLng(pt[0], pt[1]));
        
        // Update map bounds to include route points
        pathPoints.forEach(pt => bounds.extend(pt));

        // Style configurations based on priority selection
        const routeColor = isSelected ? '#10b981' : '#3b82f6'; // emerald green if primary/selected, else blue
        const routeWeight = isSelected ? 6 : 3.5;
        const routeOpacity = isSelected ? 0.9 : 0.45;
        const routeDash = isSelected ? undefined : '6, 8';

        // Create polyline
        const polyline = L.polyline(pathPoints, {
          color: routeColor,
          weight: routeWeight,
          opacity: routeOpacity,
          dashArray: routeDash,
          lineJoin: 'round',
          lineCap: 'round',
        });

        // Interactive click on route to select it
        polyline.on('click', () => {
          onSelectRoute(route.id);
        });

        // Add a nice interactive tooltip to route
        polyline.bindTooltip(`
          <div style="font-family: sans-serif; font-size: 11px; font-weight: bold; padding: 2px 4px;">
            Rank #${route.rank}: ${route.safe_zone_name} (${route.duration_mins} mins)
          </div>
        `, { sticky: true });

        polyline.addTo(routesGroup);

        // Add directional chevron indicators along selected primary route
        if (isSelected && pathPoints.length > 2) {
          // Place directional indicators along the primary route segments
          // We'll place an indicator roughly every 4 segments
          const interval = Math.max(2, Math.floor(pathPoints.length / 4));
          for (let i = interval; i < pathPoints.length - 1; i += interval) {
            const p1 = pathPoints[i];
            const p2 = pathPoints[i + 1];
            
            // Calculate angle/bearing of the segment
            const angle = Math.atan2(p2.lng - p1.lng, p2.lat - p1.lat) * (180 / Math.PI);

            const arrowIcon = L.divIcon({
              html: `
                <div style="transform: rotate(${angle}deg); color: #10b981;" class="flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              `,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
              className: 'directional-arrow-indicator'
            });

            L.marker(p1, { icon: arrowIcon, interactive: false }).addTo(routesGroup);
          }
        }
      });
    }

    // 3. Draw Start/End Markers with Custom Tailwind divIcons
    // Start Marker (Evacuation Origin / Disaster Impact Zone)
    if (layers.activeDisasters) {
      const pulseIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute inline-flex h-8 w-8 rounded-full bg-red-500 opacity-40 animate-ping"></span>
            <div class="relative h-6 w-6 rounded-full bg-red-600 border-2 border-white flex items-center justify-center shadow-lg">
              <svg class="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
          </div>
        `,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([startLat, startLng], { icon: pulseIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px;">
            <strong style="color: #ef4444; text-transform: uppercase;">Disaster Impact Origin</strong>
            <p style="margin: 4px 0 0 0; color: #cbd5e1;">Starting point for urgent evacuation routing plan.</p>
          </div>
        `, { className: 'custom-leaflet-popup' })
        .addTo(markersGroup);
    }

    // End Markers (Destination Safe Zones / Emergency Shelters)
    if (layers.emergencyShelters) {
      safeZones.forEach((sz) => {
        // Check if this safe zone is reached by our active route
        const associatedRoute = routes.find(r => r.safe_zone_id === sz.id);
        const isDestinationActive = associatedRoute?.id === selectedRouteId;

        const shelterIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              ${isDestinationActive ? '<span class="absolute inline-flex h-9 w-9 rounded-full bg-emerald-500 opacity-30 animate-pulse"></span>' : ''}
              <div class="relative h-6 w-6 rounded-full ${isDestinationActive ? 'bg-emerald-500 border-2 border-white' : 'bg-blue-600 border-2 border-slate-300'} flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-200">
                <svg class="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
            </div>
          `,
          className: 'custom-leaflet-marker',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([sz.lat, sz.lng], { icon: shelterIcon });
        
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px;">
            <strong style="color: ${isDestinationActive ? '#10b981' : '#3b82f6'}; text-transform: uppercase;">
              ${isDestinationActive ? 'Active Evacuation Shelter' : 'Alternative Shelter'}
            </strong>
            <h4 style="margin: 4px 0 2px 0; color: #ffffff; font-size: 12px; font-weight: bold;">${sz.name}</h4>
            ${associatedRoute ? `
              <p style="margin: 0; color: #cbd5e1;">Distance: ${associatedRoute.distance_km} km</p>
              <p style="margin: 0; color: #cbd5e1;">Duration: ${associatedRoute.duration_mins} mins</p>
            ` : ''}
            <button 
              style="margin-top: 8px; width: 100%; border: none; background: #3b82f6; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 10px;"
              onclick="window.dispatchEvent(new CustomEvent('select-evac-zone', { detail: '${associatedRoute?.id || ""}' }))"
            >
              Select This Route
            </button>
          </div>
        `, { className: 'custom-leaflet-popup' });

        marker.addTo(markersGroup);
      });
    }

    // Fit map bounds to contain all markers and routes nicely
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
        animate: true,
        duration: 1.0,
      });
    }

  }, [routes, avoidPolygons, safeZones, selectedRouteId, layers]);

  // Hook up window dispatcher event so clicking "Select This Route" inside the Leaflet popup triggers selection
  useEffect(() => {
    const handleSelectFromPopup = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        onSelectRoute(customEvent.detail);
      }
    };

    window.addEventListener('select-evac-zone', handleSelectFromPopup);
    return () => {
      window.removeEventListener('select-evac-zone', handleSelectFromPopup);
    };
  }, [onSelectRoute]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '350px' }} />
      
      {/* Floating Layer Control Panel */}
      <div className="absolute top-4 right-4 z-[1000]">
        <LayerControlPanel />
      </div>

      {/* Dynamic Map Legend Overlay */}
      <div className="absolute left-4 bottom-4 z-[1000]">
        <MapLegend />
      </div>
    </div>
  );
}
