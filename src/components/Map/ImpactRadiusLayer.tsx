import { ImpactZone } from '../../utils/deadlineCalculator';
import maplibregl from 'maplibre-gl';

/**
 * Generates a GeoJSON Polygon representing a circle of a specified radius in kilometers.
 */
export function getCircleGeoJSON(
  lng: number,
  lat: number,
  radiusKm: number,
  points: number = 64
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  
  // Approximate conversion factors for lat/lng degrees to kilometers
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([lng + x, lat + y]);
  }
  
  // Close the polygon
  coords.push(coords[0]);

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
}

/**
 * Draws or updates three concentric circular layers representing deadline impact zones on the map.
 */
export function renderImpactRadiusOnMap(
  map: maplibregl.Map,
  lng: number,
  lat: number,
  zones: ImpactZone[]
) {
  zones.forEach((zone) => {
    const sourceId = `impact-source-${zone.name.toLowerCase()}`;
    const fillLayerId = `impact-layer-fill-${zone.name.toLowerCase()}`;
    const lineLayerId = `impact-layer-line-${zone.name.toLowerCase()}`;

    const geojson = getCircleGeoJSON(lng, lat, zone.radiusKm);

    // If source already exists, update data
    const existingSource = map.getSource(sourceId) as maplibregl.GeoJSONSource;
    if (existingSource) {
      existingSource.setData(geojson);
    } else {
      // Add GeoJSON source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
      });

      // Add Semi-transparent fill layer
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': zone.color,
          'fill-opacity': zone.opacity
        }
      });

      // Add crisp outer stroke layer
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': zone.borderColor,
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': zone.name === 'Medium' ? [4, 4] : [1] // Dashed for outer threshold
        }
      });
    }
  });
}

/**
 * Clears the concentric zone layers and sources from the MapLibre instance.
 */
export function clearImpactRadiusFromMap(map: maplibregl.Map) {
  const zoneNames = ['critical', 'high', 'medium'];
  
  zoneNames.forEach((name) => {
    const fillLayerId = `impact-layer-fill-${name}`;
    const lineLayerId = `impact-layer-line-${name}`;
    const sourceId = `impact-source-${name}`;

    if (map.getLayer(fillLayerId)) {
      map.removeLayer(fillLayerId);
    }
    if (map.getLayer(lineLayerId)) {
      map.removeLayer(lineLayerId);
    }
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  });
}
