import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, status, HTTPException
from backend.models.schemas import (
    AlertGenerateRequest,
    AlertResponse,
    AlertSeverityEnum
)

router = APIRouter(
    prefix="/alerts",
    tags=["Emergency Alerts Platform"]
)

# In-memory storage for active alerts (allows backend-first simulation)
active_alerts_cache: Dict[str, Dict[str, Any]] = {
    "alert-preset-001": {
        "id": "alert-preset-001",
        "disaster_id": "disaster-preset-001",
        "disaster_title": "Coastal Tidal Inundation",
        "disaster_type": "flood",
        "severity": AlertSeverityEnum.CRITICAL,
        "headline": "CRITICAL FLOOD WARNING: Rapid Tidal Rise in Low-Lying Coastlines",
        "summary": "Heavy tidal flooding triggered by a tropical wave is impacting several low-lying coastal regions. Significant street flooding, blocked culverts, and water ingress into coastal basements are actively happening. Residents should avoid driving in flooded streets and protect important assets.",
        "affected_area": "Sectors A & B coastal margins, shoreline highways, and harbor residential parks.",
        "recommended_actions": [
            "Do not drive or walk through flood waters — Turn around, don't drown.",
            "Move important paperwork, medical supplies, and emergency assets to higher shelves.",
            "Stay off shoreline beaches and docks due to high swell action.",
            "Prepare a basic emergency kit and monitor local civil broadcast channels."
        ],
        "issued_at": datetime.utcnow() - timedelta(minutes=15),
        "expires_at": datetime.utcnow() + timedelta(hours=2),
        "acknowledged": False
    },
    "alert-preset-002": {
        "id": "alert-preset-002",
        "disaster_id": "disaster-preset-002",
        "disaster_title": "Wildland Fire Incident",
        "disaster_type": "wildfire",
        "severity": AlertSeverityEnum.EMERGENCY,
        "headline": "EMERGENCY EVACUATION ORDER: Severe Wildfire Encroaching Residential Sector C",
        "summary": "An out-of-control wildfire has crossed defensive lines and is spreading rapidly toward Sector C under strong wind gusts. Extreme smoke exposure, zero visibility, and burning debris are immediate hazards. Immediate evacuation is required for all residents in the specified boundaries.",
        "affected_area": "Resident sector C, dry forest borders, and secondary mountain escape corridors.",
        "recommended_actions": [
            "EVACUATE IMMEDIATELY: Take route 14 South or the highway pass to safe shelters.",
            "Gather essential items only: passport, driver license, prescription medicines, and core electronics.",
            "Keep car windows closed and headlights on while navigating smoked corridors.",
            "If trapped, stay in your car, cover yourself with dry blankets, and call 911 with your coordinates."
        ],
        "issued_at": datetime.utcnow() - timedelta(minutes=5),
        "expires_at": datetime.utcnow() + timedelta(hours=1),
        "acknowledged": False
    }
}

def determine_severity_level(risk_score: float) -> AlertSeverityEnum:
    if risk_score < 30:
        return AlertSeverityEnum.INFO
    elif risk_score < 50:
        return AlertSeverityEnum.MODERATE
    elif risk_score < 70:
        return AlertSeverityEnum.HIGH
    elif risk_score < 90:
        return AlertSeverityEnum.CRITICAL
    else:
        return AlertSeverityEnum.EMERGENCY

def generate_default_headline(disaster_type: str, severity: AlertSeverityEnum, title: str) -> str:
    dtype = disaster_type.upper()
    if severity == AlertSeverityEnum.INFO:
        return f"ADVISORY: Monitored {dtype} Activity - {title}"
    elif severity == AlertSeverityEnum.MODERATE:
        return f"WARN: Moderate {dtype} Threat Alert - {title}"
    elif severity == AlertSeverityEnum.HIGH:
        return f"WARNING: High-Risk {dtype} Hazard Detected - {title}"
    elif severity == AlertSeverityEnum.CRITICAL:
        return f"CRITICAL ALERT: Urgent Action Required for {dtype} - {title}"
    else: # EMERGENCY
        return f"EMERGENCY BROADCAST: Immediate Evacuation / Action for {dtype} - {title}"

def generate_default_summary(disaster_type: str, severity: AlertSeverityEnum, score: float) -> str:
    dtype = disaster_type.lower()
    if severity == AlertSeverityEnum.INFO:
        return f"A low-level {dtype} activity is currently being monitored. Current risk index is {score:.1f}/100. No immediate protective actions are required, but residents should remain vigilant."
    elif severity == AlertSeverityEnum.MODERATE:
        return f"A moderate-risk {dtype} event has been registered. Risk score is {score:.1f}/100. Local conditions may deteriorate. Secure loose objects and keep communication devices charged."
    elif severity == AlertSeverityEnum.HIGH:
        return f"A high-threat {dtype} emergency is developing rapidly. With a composite risk index of {score:.1f}/100, significant impacts on local infrastructure and travel safety are expected. Please limit outdoor exposure."
    elif severity == AlertSeverityEnum.CRITICAL:
        return f"CRITICAL: A severe {dtype} is active with extreme hazards present. Risk score is {score:.1f}/100. Power outages, structural damage, and localized hazards are highly probable. Mobilize safety preparations immediately."
    else: # EMERGENCY
        return f"IMMEDIATE DANGER: Catastrophic {dtype} emergency poses an imminent threat to life and property. Composite risk score is {score:.1f}/100. Standard utility networks may fail. Follow official directives and prioritize life safety."

def generate_default_actions(disaster_type: str, severity: AlertSeverityEnum) -> List[str]:
    dtype = disaster_type.lower()
    
    if severity == AlertSeverityEnum.INFO:
        return [
            f"Monitor official channels for updates on the ongoing {dtype}.",
            "Review your household emergency plan and check supply levels.",
            "Verify that emergency contacts are up to date."
        ]
    elif severity == AlertSeverityEnum.MODERATE:
        return [
            f"Prepare emergency kits and secure outdoor furniture/property against {dtype} impacts.",
            "Maintain continuous communication with family members and neighbors.",
            "Charge mobile phones and power banks to prepare for potential disruptions.",
            "Stay alert for rapid changes in official warning levels."
        ]
    elif severity == AlertSeverityEnum.HIGH:
        return [
            f"Avoid non-essential travel in affected {dtype} sectors.",
            "Locate and verify route accessibility to your nearest designated safe shelter.",
            "Secure important documents, medication, and core survival resources.",
            "Keep emergency battery-operated radios tuned to civil response channels."
        ]
    elif severity == AlertSeverityEnum.CRITICAL:
        return [
            f"Shelter in place inside a structurally secure building away from windows.",
            "Do not drive through flooded zones or near high-hazard areas.",
            "Prepare for immediate emergency evacuation if ordered by civil authorities.",
            "Establish a secondary, non-grid communication link with contacts."
        ]
    else: # EMERGENCY
        return [
            f"EVACUATE IMMEDIATELY: Follow designated evacuation routes away from the {dtype} zone.",
            "Take only life-essential items (water, ID, medications, essential devices).",
            "Do not delay departure to secure physical property.",
            "If evacuation is blocked, climb to the highest structurally safe point or take immediate cover.",
            "Report your status to emergency coordination personnel once safe."
        ]

@router.post("/generate", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def generate_alert_endpoint(payload: AlertGenerateRequest):
    """
    Generates a structured emergency alert based on a disaster event and its risk score.
    Automatically assigns alert severity levels and default templates if overrides are not provided.
    """
    try:
        alert_id = f"alert-{uuid.uuid4().hex[:12]}"
        severity = determine_severity_level(payload.risk_score)
        
        # Assemble values with fallback templates
        headline = payload.custom_headline or generate_default_headline(payload.disaster_type, severity, payload.disaster_title)
        summary = payload.custom_summary or generate_default_summary(payload.disaster_type, severity, payload.risk_score)
        affected_area = payload.affected_area or "Active hazard perimeter and surrounding response grid sectors."
        recommended_actions = payload.custom_actions or generate_default_actions(payload.disaster_type, severity)
        
        issued_at = datetime.utcnow()
        # Set expiry duration based on severity
        expiry_hours = 1 if severity == AlertSeverityEnum.EMERGENCY else (2 if severity == AlertSeverityEnum.CRITICAL else 4)
        expires_at = issued_at + timedelta(hours=expiry_hours)
        
        alert_data = {
            "id": alert_id,
            "disaster_id": payload.disaster_id,
            "disaster_title": payload.disaster_title,
            "disaster_type": payload.disaster_type,
            "severity": severity,
            "headline": headline,
            "summary": summary,
            "affected_area": affected_area,
            "recommended_actions": recommended_actions,
            "issued_at": issued_at,
            "expires_at": expires_at,
            "acknowledged": False
        }
        
        active_alerts_cache[alert_id] = alert_data
        
        return AlertResponse(**alert_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate structured emergency alert: {str(e)}"
        )

@router.get("/active", response_model=List[AlertResponse], status_code=status.HTTP_200_OK)
async def get_active_alerts():
    """
    Retrieves all active, non-expired emergency alerts from the platform cache.
    """
    now = datetime.utcnow()
    active_alerts = []
    for alert_id, alert in active_alerts_cache.items():
        if alert["expires_at"] > now:
            active_alerts.append(AlertResponse(**alert))
            
    # Sort active alerts: highest severity first, then newest first
    severity_rank = {
        AlertSeverityEnum.EMERGENCY: 5,
        AlertSeverityEnum.CRITICAL: 4,
        AlertSeverityEnum.HIGH: 3,
        AlertSeverityEnum.MODERATE: 2,
        AlertSeverityEnum.INFO: 1
    }
    active_alerts.sort(key=lambda a: (severity_rank[a.severity], a.issued_at), reverse=True)
    return active_alerts

@router.put("/acknowledge/{alert_id}", response_model=AlertResponse, status_code=status.HTTP_200_OK)
async def acknowledge_alert(alert_id: str):
    """
    Updates an alert's acknowledgment state in the platform cache.
    """
    if alert_id not in active_alerts_cache:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found or has expired."
        )
    
    active_alerts_cache[alert_id]["acknowledged"] = True
    return AlertResponse(**active_alerts_cache[alert_id])
