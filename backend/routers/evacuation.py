import os
import math
import logging
import uuid
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

# Set up logging for router operations
logger = logging.getLogger("evacuation")

router = APIRouter(
    prefix="/evacuation",
    tags=["Evacuation Route Planning"]
)

# =====================================================================
# REQUEST AND RESPONSE SCHEMA SCHEMAS
# =====================================================================

class SafeZoneInput(BaseModel):
    id: str = Field(..., description="Unique safe zone identifier")
    name: str = Field(..., description="Name of the evacuation shelter/safe zone")
    lat: float = Field(..., description="Latitude of the safe zone")
    lng: float = Field(..., description="Longitude of the safe zone")

class AvoidPolygonInput(BaseModel):
    # A list of [lng, lat] coordinates forming a ring.
    # OpenRouteService expects longitude first for GeoJSON.
    coordinates: List[List[float]] = Field(..., description="List of [lng, lat] coordinates forming a polygon ring")

class EvacuationRouteRequest(BaseModel):
    start_lat: float = Field(..., description="Latitude of the disaster impact starting zone")
    start_lng: float = Field(..., description="Longitude of the disaster impact starting zone")
    safe_zones: List[SafeZoneInput] = Field(..., description="List of potential evacuation destinations")
    avoid_polygons: Optional[List[AvoidPolygonInput]] = Field(default=None, description="Disaster risk boundary zones to bypass")

class RouteOption(BaseModel):
    id: str = Field(..., description="Unique identifier for this route option")
    safe_zone_id: str = Field(..., description="ID of destination safe zone")
    safe_zone_name: str = Field(..., description="Name of destination safe zone")
    duration_mins: float = Field(..., description="Travel time duration in minutes")
    distance_km: float = Field(..., description="Travel distance in kilometers")
    road_type: str = Field(..., description="Primary road type description e.g. Highway, Local Roads")
    coordinates: List[List[float]] = Field(..., description="Array of [lat, lng] coordinates for rendering on Leaflet")
    is_fallback: bool = Field(..., description="Whether this route uses the straight-line simulated fallback")
    warning: Optional[str] = Field(None, description="Optional warning message if API fails or polygon intersects")
    rank: int = Field(..., description="Optimal routing rank (1 to 3)")

class EvacuationRouteResponse(BaseModel):
    routes: List[RouteOption] = Field(..., description="Top 3 ranked optimal evacuation routes")
    used_fallback: bool = Field(..., description="True if any route calculation fell back to straight lines")

# =====================================================================
# OPENROUTESERVICE API SPECIFICATION COMMENTS (USER REQUESTED)
# =====================================================================
"""
EXAMPLE OPENROUTESERVICE API REQUEST PAYLOAD (POST /v2/directions/driving-car):
{
  "coordinates": [
    [-73.9857, 40.7484],  // Start Location: [lng, lat]
    [-73.9772, 40.7527]   // Safe Zone: [lng, lat]
  ],
  "options": {
    "avoid_polygons": {
      "type": "MultiPolygon",
      "coordinates": [
        [
          [
            [-73.9810, 40.7500],
            [-73.9830, 40.7500],
            [-73.9830, 40.7520],
            [-73.9810, 40.7520],
            [-73.9810, 40.7500]  // Loop closed
          ]
        ]
      ]
    }
  }
}

EXAMPLE OPENROUTESERVICE API RESPONSE PAYLOAD (SUCCESS):
{
  "type": "FeatureCollection",
  "features": [
    {
      "bbox": [-73.9857, 40.7484, -73.9772, 40.7527],
      "type": "Feature",
      "properties": {
        "summary": {
          "distance": 1250.4,  // Meters
          "duration": 180.2    // Seconds
        },
        "segments": [
          {
            "distance": 1250.4,
            "duration": 180.2,
            "steps": [
              {
                "distance": 250.0,
                "duration": 40.0,
                "type": 11,
                "instruction": "Head northeast on 5th Ave",
                "name": "5th Ave",
                "way_points": [0, 5]
              }
            ]
          }
        ],
        "way_points": [0, 25]
      },
      "geometry": {
        "coordinates": [
          [-73.9857, 40.7484],
          [-73.9841, 40.7495],
          [-73.9772, 40.7527]
        ],
        "type": "LineString"
      }
    }
  ],
  "bbox": [-73.9857, 40.7484, -73.9772, 40.7527],
  "metadata": {
    "attribution": "openrouteservice.org | Map data OpenStreetMap contributors",
    "service": "routing",
    "timestamp": 1624541756000,
    "query": {
      "coordinates": [[-73.9857, 40.7484], [-73.9772, 40.7527]],
      "profile": "driving-car",
      "format": "json"
    }
  }
}
"""

# =====================================================================
# GEOSPATIAL HELPER FUNCTIONS
# =====================================================================

def calculate_haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Computes the great-circle distance between two points on the Earth's surface
    using the Haversine formula in kilometers.
    """
    R = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    
    a = (math.sin(d_lat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def generate_straight_line_route(
    start_lat: float, start_lng: float,
    end_lat: float, end_lng: float,
    num_segments: int = 8
) -> List[List[float]]:
    """
    Generates a list of [lat, lng] coordinates representing a multi-segment 
    straight line between the starting point and the target destination.
    """
    coords = []
    for i in range(num_segments + 1):
        fraction = i / num_segments
        lat = start_lat + fraction * (end_lat - start_lat)
        lng = start_lng + fraction * (end_lng - start_lng)
        coords.append([lat, lng])
    return coords

# =====================================================================
# ROUTER IMPLEMENTATION
# =====================================================================

@router.post("/plan", response_model=EvacuationRouteResponse, status_code=status.HTTP_200_OK)
async def plan_evacuation_routes(payload: EvacuationRouteRequest):
    """
    POST /api/evacuation/plan
    Calculates evacuation routes to multiple safe zones, avoids specified disaster impact polygons,
    ranks the routes by shortest travel duration, and returns the top three options.
    If OpenRouteService fails or no key is present, falls back gracefully to Haversine straight lines.
    """
    ors_api_key = os.getenv("OPENROUTESERVICE_API_KEY") or os.getenv("ORS_API_KEY")
    routes_calculated = []
    used_any_fallback = False

    # Check for empty safe zones list
    if not payload.safe_zones:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one safe zone must be provided for evacuation routing."
        )

    # Format avoid polygons to OpenRouteService standard if provided
    formatted_avoid_polygons = None
    if payload.avoid_polygons:
        polygon_list = []
        for p in payload.avoid_polygons:
            # OpenRouteService expects a ring coordinates array: [[[lng1, lat1], [lng2, lat2], ..., [lng1, lat1]]]
            ring = p.coordinates
            if len(ring) > 0:
                # Ensure the polygon ring is closed
                if ring[0] != ring[-1]:
                    ring.append(ring[0])
                polygon_list.append([ring])
        
        if polygon_list:
            formatted_avoid_polygons = {
                "type": "MultiPolygon",
                "coordinates": polygon_list
            }

    # Loop through each safe zone and find route
    for sz in payload.safe_zones:
        success = False
        duration_mins = 0.0
        distance_km = 0.0
        road_type = "Evacuation Route"
        route_coords = [] # Leaflet format: [lat, lng]
        warning_msg = None
        is_fallback_active = False

        # Attempt to make real OpenRouteService call if API key exists
        if ors_api_key and ors_api_key.strip():
            headers = {
                "Authorization": ors_api_key,
                "Content-Type": "application/json"
            }
            # Body coordinates in GeoJSON format: [longitude, latitude]
            request_body = {
                "coordinates": [
                    [payload.start_lng, payload.start_lat],
                    [sz.lng, sz.lat]
                ]
            }
            
            if formatted_avoid_polygons:
                request_body["options"] = {
                    "avoid_polygons": formatted_avoid_polygons
                }

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
                        json=request_body,
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        res_data = response.json()
                        features = res_data.get("features", [])
                        if features:
                            route_feature = features[0]
                            properties = route_feature.get("properties", {})
                            summary = properties.get("summary", {})
                            
                            # Convert distance (m) to km and duration (s) to mins
                            distance_km = round(summary.get("distance", 0.0) / 1000.0, 2)
                            duration_mins = round(summary.get("duration", 0.0) / 60.0, 1)
                            
                            # Retrieve coordinates list and swap to Leaflet [lat, lng] format
                            geom = route_feature.get("geometry", {})
                            geojson_coords = geom.get("coordinates", [])
                            route_coords = [[pt[1], pt[0]] for pt in geojson_coords]
                            
                            road_type = "High-Capacity Bypass" if distance_km > 10 else "Municipal Evacuation Trunk"
                            success = True
                            logger.info(f"Successfully calculated ORS route to {sz.name}: {distance_km} km, {duration_mins} mins")
                        else:
                            warning_msg = "ORS responded but found no route features."
                    else:
                        warning_msg = f"ORS API error (HTTP {response.status_code}): {response.text}"
                        logger.warning(warning_msg)
            except Exception as e:
                warning_msg = f"Exception occurred while calling ORS directions: {str(e)}"
                logger.error(warning_msg)

        # Fallback mechanism if ORS is unavailable or fails
        if not success:
            is_fallback_active = True
            used_any_fallback = True
            
            # Compute geodesic direct distance
            distance_km = round(calculate_haversine_distance(
                payload.start_lat, payload.start_lng,
                sz.lat, sz.lng
            ), 2)
            
            # Average evacuation speed: 35 km/h
            duration_mins = round((distance_km / 35.0) * 60.0, 1)
            
            # Generate linear path for leaflet rendering
            route_coords = generate_straight_line_route(
                payload.start_lat, payload.start_lng,
                sz.lat, sz.lng
            )
            
            road_type = "Direct Line Rescue Path"
            warning_msg = warning_msg or "OpenRouteService API key missing or offline. Rendering straight-line fallback."
            logger.warning(f"Using straight-line evacuation fallback for safe zone {sz.name}")

        # Ensure we always have coordinates
        if not route_coords:
            route_coords = [[payload.start_lat, payload.start_lng], [sz.lat, sz.lng]]

        routes_calculated.append(RouteOption(
            id=f"route-{uuid.uuid4().hex[:8]}",
            safe_zone_id=sz.id,
            safe_zone_name=sz.name,
            duration_mins=duration_mins,
            distance_km=distance_km,
            road_type=road_type,
            coordinates=route_coords,
            is_fallback=is_fallback_active,
            warning=warning_msg,
            rank=999 # Rank placeholder, will be sorted and ranked next
        ))

    # Sort routes by duration ascending (shortest first)
    routes_calculated.sort(key=lambda x: x.duration_mins)

    # Pick top 3 routes and update rank labels
    top_routes = routes_calculated[:3]
    for idx, r in enumerate(top_routes):
        r.rank = idx + 1

    return EvacuationRouteResponse(
        routes=top_routes,
        used_fallback=used_any_fallback
    )
