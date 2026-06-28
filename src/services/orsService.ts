// OpenRouteService Service layer using native fetch

// Interface for geocoding results
export interface GeocodeResult {
  lat: number;
  lng: number;
  label: string;
}

// Interface for route summaries
export interface RouteSummary {
  distanceKm: number;
  durationMins: number;
  coordinates: [number, number][]; // Array of [lng, lat]
}

const ORS_BASE_URL = 'https://api.openrouteservice.org';

/**
 * Geocodes an address string to geographic coordinates using OpenRouteService.
 * Falls back to high-fidelity Manhattan geocoding simulation if no API key is specified.
 */
export async function geocodeAddress(address: string, apiKey?: string): Promise<GeocodeResult> {
  if (!apiKey || apiKey.trim() === '') {
    return simulateGeocode(address);
  }

  try {
    const url = new URL(`${ORS_BASE_URL}/geocode/search`);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('text', address);
    url.searchParams.append('size', '1');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const features = data?.features;
    if (features && features.length > 0) {
      const first = features[0];
      const [lng, lat] = first.geometry.coordinates;
      return {
        lat,
        lng,
        label: first.properties.label || address
      };
    } else {
      throw new Error('No coordinates resolved for the specified address.');
    }
  } catch (error) {
    console.warn('OpenRouteService Geocode failed, falling back to simulation:', error);
    return simulateGeocode(address);
  }
}

/**
 * Calculates a route between a start and end coordinate pair using OpenRouteService.
 * Falls back to standard grid-aligned routing simulation if no API key is specified.
 */
export async function calculateRoute(
  start: [number, number], // [lng, lat]
  end: [number, number],   // [lng, lat]
  apiKey?: string
): Promise<RouteSummary> {
  if (!apiKey || apiKey.trim() === '') {
    return simulateRoute(start, end);
  }

  try {
    const [startLng, startLat] = start;
    const [endLng, endLat] = end;

    const url = new URL(`${ORS_BASE_URL}/v2/directions/driving-car`);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('start', `${startLng},${startLat}`);
    url.searchParams.append('end', `${endLng},${endLat}`);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const route = data?.features?.[0];
    if (route) {
      const coords = route.geometry.coordinates as [number, number][];
      const summary = route.properties.summary; // contains distance (m) and duration (s)
      return {
        distanceKm: Number((summary.distance / 1000).toFixed(2)),
        durationMins: Math.round(summary.duration / 60),
        coordinates: coords
      };
    } else {
      throw new Error('No route features found.');
    }
  } catch (error) {
    console.warn('OpenRouteService Directions failed, falling back to simulation:', error);
    return simulateRoute(start, end);
  }
}

/**
 * Simulates geocoding results for testing in the preview environment.
 * Uses realistic New York City bounds.
 */
function simulateGeocode(address: string): GeocodeResult {
  const query = address.toLowerCase();
  
  // Manhattan reference coordinates
  const bases: Record<string, {lat: number, lng: number, label: string}> = {
    'office': { lat: 40.7484, lng: -73.9857, label: 'Empire State Building (Office), NY' },
    'co-working': { lat: 40.7527, lng: -73.9772, label: 'Chrysler Building (Co-Working), NY' },
    'market': { lat: 40.7420, lng: -73.9879, label: 'Madison Square Park (Market), NY' },
    'times': { lat: 40.7580, lng: -73.9855, label: 'Times Square, New York, NY' },
    'central park': { lat: 40.7829, lng: -73.9654, label: 'Central Park, New York, NY' },
    'brooklyn': { lat: 40.6926, lng: -73.9872, label: 'DUMBO, Brooklyn, NY' }
  };

  // Check matches
  for (const key in bases) {
    if (query.includes(key)) {
      return bases[key];
    }
  }

  // Generate deterministic coordinate within Manhattan based on string hash
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Manhattan bounding box: Lat 40.70 to 40.82, Lng -74.01 to -73.93
  const seedLat = Math.abs(Math.sin(hash)) * 0.10 + 40.71;
  const seedLng = -74.01 + Math.abs(Math.cos(hash)) * 0.07;

  return {
    lat: Number(seedLat.toFixed(5)),
    lng: Number(seedLng.toFixed(5)),
    label: `${address} (Simulated Location, NYC)`
  };
}

/**
 * Generates a mock grid-aligned driving route to match Manhattan roads.
 */
function simulateRoute(start: [number, number], end: [number, number]): RouteSummary {
  const [startLng, startLat] = start;
  const [endLng, endLat] = end;

  // Manhattan-style grid routing (staircase path between coordinates)
  const coords: [number, number][] = [];
  coords.push([startLng, startLat]);

  // Intermediate grid point 1 (move horizontally)
  coords.push([endLng, startLat]);

  // End point
  coords.push([endLng, endLat]);

  // Haversine-based distance calculation
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distance = getDistanceKm(startLat, startLng, endLat, endLng);
  // Average driving speed of 25 km/h in Manhattan traffic plus traffic stop times
  const duration = Math.max(3, Math.round((distance / 20) * 60));

  return {
    distanceKm: Number(distance.toFixed(2)),
    durationMins: duration,
    coordinates: coords
  };
}
