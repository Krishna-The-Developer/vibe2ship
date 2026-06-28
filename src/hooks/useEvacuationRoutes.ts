import { useState, useCallback, useMemo } from 'react';

export interface SafeZoneInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface AvoidPolygonInput {
  // Array of [lng, lat] coordinates representing the polygon ring
  coordinates: number[][];
}

export interface RouteOption {
  id: string;
  safe_zone_id: string;
  safe_zone_name: string;
  duration_mins: number;
  distance_km: number;
  road_type: string;
  coordinates: [number, number][]; // Array of [lat, lng] for Leaflet
  is_fallback: boolean;
  warning?: string;
  rank: number;
}

export interface EvacuationRouteResponse {
  routes: RouteOption[];
  used_fallback: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

const buildFallbackRoutes = (
  startLat: number,
  startLng: number,
  safeZones: SafeZoneInput[]
): RouteOption[] => {
  if (!safeZones.length) return [];

  return safeZones
    .slice(0, 3)
    .map((zone, index) => {
      const latDelta = zone.lat - startLat;
      const lngDelta = zone.lng - startLng;
      const distanceKm = Math.max(
        1,
        Math.round(Math.sqrt(latDelta * latDelta + lngDelta * lngDelta) * 111 * 10) / 10
      );
      const durationMins = Math.max(10, Math.round(distanceKm * 3.5));
      const midLat = startLat + latDelta * 0.5;
      const midLng = startLng + lngDelta * 0.5;

      return {
        id: `fallback-${zone.id}`,
        safe_zone_id: zone.id,
        safe_zone_name: zone.name,
        duration_mins: durationMins,
        distance_km: distanceKm,
        road_type: index === 0 ? 'Primary arterial' : 'Secondary collector',
        coordinates: [
          [startLat, startLng],
          [midLat, midLng],
          [zone.lat, zone.lng],
        ] as [number, number][],
        is_fallback: true,
        warning: 'Live routing service unavailable. Previewing offline route guidance.',
        rank: index + 1,
      };
    })
    .sort((a, b) => a.duration_mins - b.duration_mins);
};

export function useEvacuationRoutes() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState<boolean>(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const fetchEvacuationPlan = useCallback(async (
    startLat: number,
    startLng: number,
    safeZones: SafeZoneInput[],
    avoidPolygons: AvoidPolygonInput[] = []
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/evacuation/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_lat: startLat,
          start_lng: startLng,
          safe_zones: safeZones,
          avoid_polygons: avoidPolygons.length > 0 ? avoidPolygons : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: EvacuationRouteResponse = await response.json();
      setRoutes(data.routes);
      setUsedFallback(data.used_fallback);
      
      // Default select the top-ranked (shortest duration) route
      if (data.routes.length > 0) {
        setSelectedRouteId(data.routes[0].id);
      } else {
        setSelectedRouteId(null);
      }
    } catch (err: any) {
      console.error('Error fetching evacuation plan from FastAPI:', err);
      const fallbackRoutes = buildFallbackRoutes(startLat, startLng, safeZones);
      setRoutes(fallbackRoutes);
      setUsedFallback(fallbackRoutes.length > 0);
      setSelectedRouteId(fallbackRoutes[0]?.id || null);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  return {
    routes,
    loading,
    error,
    usedFallback,
    selectedRouteId,
    selectedRoute,
    fetchEvacuationPlan,
    setSelectedRouteId,
  };
}
