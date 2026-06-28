import math
from typing import Dict, Any, Optional

def calculate_risk_score(
    disaster_event: Dict[str, Any],
    population_impact: Dict[str, Any],
    infrastructure_analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Computes a weighted composite geospatial risk score on a scale of 0-100.
    
    Weights:
    1. Magnitude Score (25%): Normalizes 0-10 magnitude to 0-25.
    2. Population Impact Score (35%): Logarithmic scale of total affected population
       divided by 1,000,000, multiplied by 35.
    3. Infrastructure Score (25%): (damaged_critical / total_critical) * 25.
    4. Depth/Type Score (15%): Shallow earthquakes receive higher scores; other types have type modifiers.
    """
    # 1. Magnitude Score (25%)
    magnitude = float(disaster_event.get("magnitude", 0.0))
    # Clamped to 0-10 range
    magnitude_clamped = max(0.0, min(10.0, magnitude))
    magnitude_score = (magnitude_clamped / 10.0) * 25.0

    # 2. Population Impact Score (35%)
    affected_pop = max(1, int(population_impact.get("total_affected", 0)))
    # Logarithmic scale: log10(pop) / log10(1,000,000) * 35
    # Since log10(1,000,000) is 6.0:
    population_score = (math.log10(affected_pop) / 6.0) * 35.0
    population_score = max(0.0, min(35.0, population_score))

    # 3. Infrastructure Score (25%)
    damaged_critical = float(infrastructure_analysis.get("damaged_critical", 0.0))
    total_critical = float(infrastructure_analysis.get("total_critical", 0.0))
    if total_critical <= 0:
        infrastructure_score = 0.0
    else:
        infrastructure_ratio = max(0.0, min(1.0, damaged_critical / total_critical))
        infrastructure_score = infrastructure_ratio * 25.0

    # 4. Depth/Type Score (15%)
    disaster_type = str(disaster_event.get("type", "earthquake")).lower()
    depth_km = disaster_event.get("depth_km")

    if "earthquake" in disaster_type:
        if depth_km is not None:
            depth_val = max(0.0, float(depth_km))
            # Shallow depth (<70km) is more destructive, deep is less.
            # Normalizing depth of 0-150 km. Shallow gets higher score.
            depth_ratio = max(0.0, min(1.0, depth_val / 150.0))
            depth_type_score = (1.0 - depth_ratio) * 15.0
        else:
            # Default to a moderately shallow depth (e.g. 15km)
            depth_type_score = (1.0 - (15.0 / 150.0)) * 15.0
    else:
        # For non-earthquake types, assign a standard hazard factor based on type
        if "hurricane" in disaster_type or "typhoon" in disaster_type:
            depth_type_score = 13.5
        elif "flood" in disaster_type:
            depth_type_score = 11.0
        elif "wildfire" in disaster_type:
            depth_type_score = 12.5
        elif "tsunami" in disaster_type:
            depth_type_score = 14.0
        else:
            depth_type_score = 8.0

    # Composite Total Score
    total_score = magnitude_score + population_score + infrastructure_score + depth_type_score
    total_score = max(0.0, min(100.0, round(total_score, 2)))

    # Determine Severity Label
    if total_score <= 25.0:
        severity_label = "Low"
        recommended_response_level = 1
    elif total_score <= 50.0:
        severity_label = "Moderate"
        recommended_response_level = 2
    elif total_score <= 75.0:
        severity_label = "High"
        recommended_response_level = 3
    elif total_score <= 90.0:
        severity_label = "Critical"
        recommended_response_level = 4
    else:
        severity_label = "Catastrophic"
        recommended_response_level = 5

    return {
        "total_score": total_score,
        "breakdown": {
            "magnitude_score": round(magnitude_score, 2),
            "population_score": round(population_score, 2),
            "infrastructure_score": round(infrastructure_score, 2),
            "depth_type_score": round(depth_type_score, 2)
        },
        "severity_label": severity_label,
        "recommended_response_level": recommended_response_level
    }
