import os
import math
import uuid
import logging
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from fastapi import APIRouter, HTTPException, status

logger = logging.getLogger("resources")

router = APIRouter(
    prefix="/resources",
    tags=["Disaster Resource Logistics"]
)

# =====================================================================
# DATA MODELS & SCHEMAS
# =====================================================================

class ResourceTypeInfo(BaseModel):
    key: str
    name: str
    category: str  # Medical, Rescue, Supplies, Power, Air
    unit: str
    description: str

class ResourceInventoryItem(BaseModel):
    key: str
    name: str
    category: str
    unit: str
    total_qty: int
    available_qty: int
    deployed_qty: int
    status: str  # "Optimal", "Low", "Critical"
    description: str

class DepotLocation(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    resources: Dict[str, int]  # Map resource key -> qty

class ResourceAllocationRequest(BaseModel):
    disaster_id: str = Field(..., description="The ID of the disaster event")
    disaster_title: str = Field(..., description="Title of the disaster event")
    risk_level: str = Field(..., description="Risk level (Low, Medium, High, Panic, Critical)")
    affected_population: int = Field(..., description="Total estimated affected population")
    infrastructure_damage: int = Field(..., description="Number of critical infrastructure facilities damaged")
    disaster_lat: float = Field(..., description="Latitude of the disaster center")
    disaster_lng: float = Field(..., description="Longitude of the disaster center")

class AllocationRecommendation(BaseModel):
    resource_type: str
    resource_name: str
    unit: str
    recommended_qty: int
    depot_allocations: List[Dict[str, Any]]  # List of {depot_id, depot_name, qty_allocated}
    total_allocated: int
    shortfall: int
    justification: str

class DeploymentRoute(BaseModel):
    depot_id: str
    depot_name: str
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    distance_km: float
    duration_mins: float
    coordinates: List[List[float]]  # List of [lat, lng] for rendering on Map

class ResourceAllocationResponse(BaseModel):
    disaster_id: str
    disaster_title: str
    recommendations: List[AllocationRecommendation]
    routes: List[DeploymentRoute]
    total_shortfalls: int
    has_shortfalls: bool

# =====================================================================
# REALISTIC MOCK DATA
# =====================================================================

RESOURCE_TYPES = {
    "ambulances": ResourceTypeInfo(
        key="ambulances", name="Ambulance Units", category="Medical", unit="vehicles",
        description="Trauma support and patient transport vehicles equipped with life support."
    ),
    "fire_trucks": ResourceTypeInfo(
        key="fire_trucks", name="Fire Engines", category="Rescue", unit="vehicles",
        description="Heavy pumpers and aerial ladders for suppression, extrication, and rescue."
    ),
    "rescue_teams": ResourceTypeInfo(
        key="rescue_teams", name="Heavy Rescue Teams", category="Rescue", unit="teams",
        description="Specialized personnel trained in urban search, canine assistance, and debris clearing."
    ),
    "medical_kits": ResourceTypeInfo(
        key="medical_kits", name="First Aid & Trauma Kits", category="Medical", unit="kits",
        description="Comprehensive trauma dressings, splints, tourniquets, and field meds."
    ),
    "water_units": ResourceTypeInfo(
        key="water_units", name="Clean Water Units (100L)", category="Supplies", unit="units",
        description="Pallets of purified water and high-capacity portable filtration systems."
    ),
    "food_rations": ResourceTypeInfo(
        key="food_rations", name="Emergency Food Pallets", category="Supplies", unit="pallets",
        description="MREs (Meals Ready-to-Eat) and shelf-stable nutritional packages."
    ),
    "generators": ResourceTypeInfo(
        key="generators", name="Mobile Heavy Power Generators", category="Power", unit="generators",
        description="Heavy-duty diesel generators with distribution panels for critical medical/shelter sites."
    ),
    "helicopters": ResourceTypeInfo(
        key="helicopters", name="Air Rescue Helicopters", category="Air", unit="helicopters",
        description="Rotary wing aircraft configured for medical evacuation and heavy cargo airlifts."
    ),
    "hazmat_units": ResourceTypeInfo(
        key="hazmat_units", name="Hazardous Materials Teams", category="Rescue", unit="teams",
        description="CBRN response specialists equipped with detectors, neutralizers, and containment kits."
    ),
    "mobile_shelters": ResourceTypeInfo(
        key="mobile_shelters", name="Temporary Housing Kits", category="Supplies", unit="kits",
        description="Rapid-deployment weatherproof family structures with solar blankets and cots."
    )
}

DEPOTS = [
    DepotLocation(
        id="depot-1",
        name="Central Logistics Hub (SF Center)",
        lat=37.7749,
        lng=-122.4194,
        resources={
            "ambulances": 15, "fire_trucks": 8, "rescue_teams": 6, "medical_kits": 500,
            "water_units": 400, "food_rations": 300, "generators": 10, "helicopters": 3,
            "hazmat_units": 4, "mobile_shelters": 250
        }
    ),
    DepotLocation(
        id="depot-2",
        name="North Bay Response Depot (San Rafael)",
        lat=38.0560,
        lng=-122.5310,
        resources={
            "ambulances": 8, "fire_trucks": 12, "rescue_teams": 4, "medical_kits": 200,
            "water_units": 250, "food_rations": 150, "generators": 5, "helicopters": 1,
            "hazmat_units": 2, "mobile_shelters": 120
        }
    ),
    DepotLocation(
        id="depot-3",
        name="East Bay Emergency Supply (Oakland)",
        lat=37.8044,
        lng=-122.2711,
        resources={
            "ambulances": 12, "fire_trucks": 10, "rescue_teams": 5, "medical_kits": 350,
            "water_units": 300, "food_rations": 250, "generators": 8, "helicopters": 2,
            "hazmat_units": 3, "mobile_shelters": 180
        }
    ),
    DepotLocation(
        id="depot-4",
        name="South Bay Tactical Depot (San Jose)",
        lat=37.3382,
        lng=-121.8863,
        resources={
            "ambulances": 14, "fire_trucks": 11, "rescue_teams": 6, "medical_kits": 400,
            "water_units": 350, "food_rations": 300, "generators": 12, "helicopters": 0,
            "hazmat_units": 5, "mobile_shelters": 220
        }
    ),
    DepotLocation(
        id="depot-5",
        name="West Peninsula Operations (San Mateo)",
        lat=37.5630,
        lng=-122.3255,
        resources={
            "ambulances": 6, "fire_trucks": 5, "rescue_teams": 3, "medical_kits": 150,
            "water_units": 180, "food_rations": 100, "generators": 4, "helicopters": 1,
            "hazmat_units": 1, "mobile_shelters": 80
        }
    )
]

# Track current live status in-memory for testing purposes. Real allocations are saved in Firestore.
# Real deployment counts would subtract from available quantities. Let's make an active_deployments tracker.
ACTIVE_DEPLOYMENTS: Dict[str, Dict[str, int]] = {} # depot_id -> resource_key -> quantity_deployed

# =====================================================================
# GEOSPATIAL GEODESIC MATH HELPERS
# =====================================================================

def calculate_haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def generate_interpolated_path(lat1: float, lng1: float, lat2: float, lng2: float, steps: int = 10) -> List[List[float]]:
    coords = []
    # Create slightly curved paths for visual variety on Leaflet, rather than exact straight lines
    # Mid-point shift
    mid_lat = (lat1 + lat2) / 2.0
    mid_lng = (lng1 + lng2) / 2.0
    # Add a tiny ortho perpendicular offset
    offset_lat = (lng1 - lng2) * 0.05
    offset_lng = (lat2 - lat1) * 0.05
    
    for i in range(steps + 1):
        t = i / steps
        # Quadratic Bezier curve using offset midpoint
        control_lat = mid_lat + offset_lat
        control_lng = mid_lng + offset_lng
        
        # Bezier formula: (1-t)^2 * p0 + 2*(1-t)*t * p1 + t^2 * p2
        lat = (1 - t)**2 * lat1 + 2 * (1 - t) * t * control_lat + t**2 * lat2
        lng = (1 - t)**2 * lng1 + 2 * (1 - t) * t * control_lng + t**2 * lng2
        coords.append([lat, lng])
    return coords

# =====================================================================
# ENDPOINTS
# =====================================================================

@router.get("/inventory", response_model=List[ResourceInventoryItem])
async def get_resource_inventory():
    """
    Returns current resource inventories aggregated across all 5 depots, accounting for deployed resources.
    """
    inventory_sum: Dict[str, Dict[str, int]] = {}
    
    # Initialize aggregated count
    for key, r_info in RESOURCE_TYPES.items():
        inventory_sum[key] = {"total": 0, "available": 0, "deployed": 0}
        
    for depot in DEPOTS:
        for key, qty in depot.resources.items():
            if key in inventory_sum:
                deployed = ACTIVE_DEPLOYMENTS.get(depot.id, {}).get(key, 0)
                available = max(0, qty - deployed)
                inventory_sum[key]["total"] += qty
                inventory_sum[key]["deployed"] += deployed
                inventory_sum[key]["available"] += available
                
    response_items = []
    for key, r_info in RESOURCE_TYPES.items():
        stats = inventory_sum[key]
        # Determine health status of resource
        pct_avail = (stats["available"] / stats["total"]) * 100 if stats["total"] > 0 else 0
        if pct_avail < 20:
            status_label = "Critical"
        elif pct_avail < 50:
            status_label = "Low"
        else:
            status_label = "Optimal"
            
        response_items.append(ResourceInventoryItem(
            key=key,
            name=r_info.name,
            category=r_info.category,
            unit=r_info.unit,
            total_qty=stats["total"],
            available_qty=stats["available"],
            deployed_qty=stats["deployed"],
            status=status_label,
            description=r_info.description
        ))
        
    return response_items

@router.get("/depots", response_model=List[DepotLocation])
async def get_depots():
    """
    Returns all resource depot hub details including live available inventories.
    """
    response_depots = []
    for depot in DEPOTS:
        live_resources = {}
        for key, total_qty in depot.resources.items():
            deployed = ACTIVE_DEPLOYMENTS.get(depot.id, {}).get(key, 0)
            live_resources[key] = max(0, total_qty - deployed)
            
        response_depots.append(DepotLocation(
            id=depot.id,
            name=depot.name,
            lat=depot.lat,
            lng=depot.lng,
            resources=live_resources
        ))
    return response_depots

@router.post("/allocate", response_model=ResourceAllocationResponse)
async def allocate_resources(payload: ResourceAllocationRequest):
    """
    Calculates dynamic risk-based resource recommendations based on:
    - Disaster Risk Level (Low, Medium, High, Panic/Critical)
    - Affected Population (scale)
    - Critical Infrastructure Damage count
    
    Optimally pulls resources from nearest depots to the disaster coordinates.
    Computes visual transportation routes from selected depots to the site.
    """
    risk = payload.risk_level.lower()
    pop = payload.affected_population
    dmg = payload.infrastructure_damage
    
    # 1. Establish risk multipliers
    if risk in ["panic", "critical"]:
        risk_multiplier = 2.5
        urgency_word = "extreme urgency"
    elif risk == "high":
        risk_multiplier = 1.8
        urgency_word = "elevated danger"
    elif risk == "medium":
        risk_multiplier = 1.2
        urgency_word = "moderate severity"
    else:
        risk_multiplier = 0.8
        urgency_word = "precautionary standby"
        
    # 2. Risk-based allocation logic for 10 types of resources
    recommendations = []
    shortfalls_count = 0
    depots_involved = set()
    
    # Define calculation helpers per resource type
    req_formulas = {}
    
    # Ambulances
    # Base: 1 per 3,000 affected population, scaled by risk. Min 2 if critical infrastructure is hit.
    req_ambulances = max(1, int((pop / 3000) * risk_multiplier))
    if dmg > 3:
        req_ambulances += int(dmg / 2)
    req_formulas["ambulances"] = (
        max(2 if risk in ["high", "critical", "panic"] else 1, req_ambulances),
        f"Recommended {req_ambulances} ambulances based on {pop:,} affected civilians and {dmg} critical damage points under {urgency_word} conditions."
    )
    
    # Fire Trucks
    # Base: 1 per 6,000 affected population, scaled by risk. Min 1.
    req_fire = max(1, int((pop / 6000) * risk_multiplier))
    if dmg > 5:
        req_fire += 2
    req_formulas["fire_trucks"] = (
        max(1, req_fire),
        f"Allocated {req_fire} Fire Engines to secure transit corridors, control localized hazards, and support trapped victims."
    )
    
    # Rescue Teams
    # Base: 1 team per 10,000 population. Add 1 for every 2 damaged structures.
    req_rescue = max(1, int((pop / 8000) * risk_multiplier))
    req_rescue += max(1, int(dmg / 2))
    req_formulas["rescue_teams"] = (
        max(1, req_rescue),
        f"Assigned {req_rescue} Heavy Rescue Teams for specialized extrication, search operations, and immediate debris clearing."
    )
    
    # Medical Kits
    # Base: 1 per 150 affected population, scaled by risk.
    req_med = max(5, int((pop / 150) * risk_multiplier))
    req_formulas["medical_kits"] = (
        req_med,
        f"Dispatched {req_med} trauma-grade First Aid & Medical Kits to field clinics supporting the {pop:,} affected population."
    )
    
    # Water Units (100L each)
    # Base: 3 liters/person/day for 3 days = 9 liters per person. 
    # Each unit is 100L, so 1 unit per 11 people. Scaled by risk.
    req_water = max(10, int((pop / 11) * risk_multiplier * 0.15)) # adjusted fraction for practical supply lines
    req_formulas["water_units"] = (
        max(5, req_water),
        f"Recommended {req_water} high-capacity water units (100L) providing hydration for up to 3 days of localized isolation."
    )
    
    # Food Rations (pallets)
    # Base: 1 pallet supports 50 people. Scaled by risk.
    req_food = max(5, int((pop / 50) * risk_multiplier * 0.2))
    req_formulas["food_rations"] = (
        max(5, req_food),
        f"Provisioned {req_food} emergency nutritional food pallets to satisfy dietary loads for the first critical 72 hours."
    )
    
    # Generators
    # Base: 1 generator per damaged facility, plus 1 per 15,000 population.
    req_gen = max(1, int(dmg + (pop / 15000)))
    req_formulas["generators"] = (
        req_gen,
        f"Deployed {req_gen} Mobile Heavy Generators to power local medical clinics, field triage spaces, and emergency lights."
    )
    
    # Helicopters
    # Only if high/panic risk, or pop > 30,000, or dmg > 6.
    req_heli = 0
    if risk in ["high", "critical", "panic"] or pop > 25000 or dmg > 4:
        req_heli = max(1, int(pop / 35000) + 1)
    req_formulas["helicopters"] = (
        req_heli,
        f"Allocated {req_heli} Rescue Helicopters to perform high-speed medical evacuations and deliver emergency airlifts."
    )
    
    # Hazmat Units
    # Base: 1 team if damage > 4, or high risk.
    req_haz = 0
    if dmg > 4 or risk in ["critical", "panic"]:
        req_haz = max(1, int(dmg / 6) + 1)
    req_formulas["hazmat_units"] = (
        req_haz,
        f"Dispatched {req_haz} Hazmat Specialists to detect chemical leaks, verify water safety, and contain thermal spill hazards."
    )
    
    # Mobile Shelters
    # Base: 1 kit per 100 affected people, scaled by risk and infrastructure damage.
    req_shelter = max(5, int((pop / 100) * risk_multiplier))
    req_formulas["mobile_shelters"] = (
        req_shelter,
        f"Recommended {req_shelter} weather-resistant Rapid Housing Kits to shelter displaced families."
    )
    
    # 3. Perform supply-demand matching using distance-prioritized depot retrieval
    # Rank depots based on distance to disaster site
    depots_ranked = []
    for d in DEPOTS:
        dist = calculate_haversine(d.lat, d.lng, payload.disaster_lat, payload.disaster_lng)
        depots_ranked.append((dist, d))
    depots_ranked.sort(key=lambda x: x[0]) # Closest first
    
    # Process allocations per resource type
    for key, (recommended, justification) in req_formulas.items():
        if recommended <= 0:
            continue
            
        remaining_needed = recommended
        allocations_made = []
        
        # Pull from closest depots with inventory
        for dist, depot in depots_ranked:
            if remaining_needed <= 0:
                break
                
            # Account for active deployments
            deployed = ACTIVE_DEPLOYMENTS.get(depot.id, {}).get(key, 0)
            avail = max(0, depot.resources.get(key, 0) - deployed)
            
            if avail > 0:
                alloc_qty = min(remaining_needed, avail)
                allocations_made.append({
                    "depot_id": depot.id,
                    "depot_name": depot.name,
                    "qty_allocated": alloc_qty,
                    "distance_km": round(dist, 1)
                })
                remaining_needed -= alloc_qty
                depots_involved.add(depot.id)
                
        total_allocated = recommended - remaining_needed
        shortfall = remaining_needed
        if shortfall > 0:
            shortfalls_count += shortfall
            justification += f" (Note: Detected shortfall of {shortfall} {RESOURCE_TYPES[key].unit} due to depot supply depletion)."
            
        recommendations.append(AllocationRecommendation(
            resource_type=key,
            resource_name=RESOURCE_TYPES[key].name,
            unit=RESOURCE_TYPES[key].unit,
            recommended_qty=recommended,
            depot_allocations=allocations_made,
            total_allocated=total_allocated,
            shortfall=shortfall,
            justification=justification
        ))
        
    # 4. Generate visual logistics routes for all involved depots
    routes = []
    for d_id in depots_involved:
        # Find depot details
        depot_obj = next((d for d in DEPOTS if d.id == d_id), None)
        if not depot_obj:
            continue
            
        dist = calculate_haversine(depot_obj.lat, depot_obj.lng, payload.disaster_lat, payload.disaster_lng)
        # Average response convoy speed: 50 km/h
        duration = (dist / 50.0) * 60.0 + 10.0 # 10 mins loading offset
        
        route_coords = generate_interpolated_path(
            depot_obj.lat, depot_obj.lng,
            payload.disaster_lat, payload.disaster_lng
        )
        
        routes.append(DeploymentRoute(
            depot_id=depot_obj.id,
            depot_name=depot_obj.name,
            start_lat=depot_obj.lat,
            start_lng=depot_obj.lng,
            end_lat=payload.disaster_lat,
            end_lng=payload.disaster_lng,
            distance_km=round(dist, 1),
            duration_mins=round(duration, 1),
            coordinates=route_coords
        ))
        
    return ResourceAllocationResponse(
        disaster_id=payload.disaster_id,
        disaster_title=payload.disaster_title,
        recommendations=recommendations,
        routes=routes,
        total_shortfalls=shortfalls_count,
        has_shortfalls=shortfalls_count > 0
    )

@router.post("/deploy-approve", status_code=status.HTTP_200_OK)
async def approve_and_deploy_resources(allocation: Dict[str, Any]):
    """
    Simulates database persistence block. Increments the in-memory active deployments
    state to reflect that supplies are loaded and deployed from depots to a specific disaster site.
    In real app, this can trigger firebase updates too.
    """
    recs = allocation.get("recommendations", [])
    disaster_title = allocation.get("disaster_title", "Disaster Site")
    
    for rec in recs:
        r_type = rec.get("resource_type")
        dep_allocs = rec.get("depot_allocations", [])
        for da in dep_allocs:
            d_id = da.get("depot_id")
            qty = da.get("qty_allocated", 0)
            if d_id and qty > 0:
                if d_id not in ACTIVE_DEPLOYMENTS:
                    ACTIVE_DEPLOYMENTS[d_id] = {}
                if r_type not in ACTIVE_DEPLOYMENTS[d_id]:
                    ACTIVE_DEPLOYMENTS[d_id][r_type] = 0
                ACTIVE_DEPLOYMENTS[d_id][r_type] += qty
                
    logger.info(f"Approved and deployed resources to: {disaster_title}")
    return {"status": "success", "message": f"Logistics allocation successfully deployed to {disaster_title}"}

@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_deployments():
    """
    Resets all deployed resources to return inventories to optimal baseline.
    """
    ACTIVE_DEPLOYMENTS.clear()
    return {"status": "success", "message": "All deployed resources have been returned to tactical depots."}
