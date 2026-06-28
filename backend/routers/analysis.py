from fastapi import APIRouter, status, HTTPException
from fastapi.responses import StreamingResponse
import asyncio
from backend.models.schemas import (
    TaskImpactRequest, 
    TaskImpactResponse, 
    ZoneDetail,
    CriticalTaskAnalysisRequest,
    CriticalTaskAnalysisResponse,
    TaskAnalysisItem,
    RiskScoreRequest,
    RiskScoreResponse,
    ScoreBreakdown,
    SituationAnalysisRequest,
    SituationAnalysisResponse,
    SituationReportRequest,
    SituationReportResponse,
    RiskForecastRequest,
    RiskForecastResponse
)
from backend.services.impact_service import estimate_task_impact
from backend.services.task_analysis_service import analyze_critical_tasks
from backend.services.risk_scoring_service import calculate_risk_score
from backend.services.gemini_service import GeminiService
import uuid

gemini_service = GeminiService()

router = APIRouter(
    prefix="/analysis",
    tags=["Task Impact Analysis"]
)

@router.post("/task-impact", response_model=TaskImpactResponse, status_code=status.HTTP_200_OK)
async def analyze_task_impact_endpoint(payload: TaskImpactRequest):
    """
    POST /api/analysis/task-impact
    Computes a smart safety zone impact map, an urgency index, and contextual productivity recommendations.
    """
    try:
        # Run the core impact calculation service
        result = estimate_task_impact(
            deadline_str=payload.deadline,
            estimated_duration_hours=payload.estimated_duration_hours
        )
        
        # Parse output zones to match ZoneDetail schema structure
        zones_detail = [
            ZoneDetail(
                name=z["name"],
                duration_hours=z["duration_hours"],
                percentage=z["percentage"],
                description=z["description"],
                color=z["color"]
            )
            for z in result["zones"]
        ]
        
        return TaskImpactResponse(
            title=payload.title,
            deadline=payload.deadline,
            hours_remaining=result["hours_remaining"],
            urgency_score=result["urgency_score"],
            zones=zones_detail,
            recommendations=result["recommendations"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during impact simulation: {str(e)}"
        )

@router.post("/critical-tasks", response_model=CriticalTaskAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_critical_tasks_endpoint(payload: CriticalTaskAnalysisRequest):
    """
    POST /api/analysis/critical-tasks
    Accepts a list of tasks and analyzes them, computing risk categories, colors, and contextual suggestions.
    """
    try:
        # Map pydantic models to dict lists
        tasks_dict_list = []
        for t in payload.tasks:
            tasks_dict_list.append({
                "id": t.id,
                "title": t.title,
                "priority": t.priority,
                "duration": t.duration,
                "deadline": t.deadline,
                "category": t.category,
                "completed": t.completed
            })
            
        result = analyze_critical_tasks(tasks_dict_list)
        
        # Parse task items
        items = [
            TaskAnalysisItem(
                id=item["id"],
                title=item["title"],
                priority=item["priority"],
                hours_left=item["hours_left"],
                risk_level=item["risk_level"],
                suggested_action=item["suggested_action"],
                color_code=item["color_code"]
            )
            for item in result["analyzed_tasks"]
        ]
        
        return CriticalTaskAnalysisResponse(
            critical_count=result["critical_count"],
            high_count=result["high_count"],
            medium_count=result["medium_count"],
            low_count=result["low_count"],
            analyzed_tasks=items,
            overall_recommendations=result["overall_recommendations"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during list-wide task analysis: {str(e)}"
        )


# ==========================================
# In-Memory Cache for Geospatial Risk Scores
# ==========================================
risk_score_cache = {
    "disaster-001": {
        "disaster_id": "disaster-001",
        "total_score": 78.42,
        "breakdown": {
            "magnitude_score": 18.75, # 7.5 magnitude
            "population_score": 26.54, # ~70k affected
            "infrastructure_score": 21.13, # 15/18 critical
            "depth_type_score": 12.0 # Hurricane default
        },
        "severity_label": "Critical",
        "recommended_response_level": 4
    },
    "disaster-002": {
        "disaster_id": "disaster-002",
        "total_score": 93.12,
        "breakdown": {
            "magnitude_score": 22.5, # 9.0 magnitude
            "population_score": 32.12, # ~600k affected
            "infrastructure_score": 24.5, # 49/50 critical
            "depth_type_score": 14.0 # Earthquake shallow (10km)
        },
        "severity_label": "Catastrophic",
        "recommended_response_level": 5
    },
    "disaster-003": {
        "disaster_id": "disaster-003",
        "total_score": 41.25,
        "breakdown": {
            "magnitude_score": 12.5, # 5.0 magnitude
            "population_score": 18.25, # ~3k affected
            "infrastructure_score": 4.5, # 2/11 critical
            "depth_type_score": 6.0 # Minor other type
        },
        "severity_label": "Moderate",
        "recommended_response_level": 2
    }
}


@router.post("/risk-score", response_model=RiskScoreResponse, status_code=status.HTTP_200_OK)
async def post_risk_score_endpoint(payload: RiskScoreRequest):
    """
    POST /api/analysis/risk-score
    Accepts a combined payload containing disaster event details, population impact, and infrastructure analysis.
    Computes a weighted composite geospatial risk score and caches the result.
    """
    try:
        disaster_id = payload.disaster_event.id or f"disaster-{uuid.uuid4().hex[:8]}"
        
        disaster_dict = {
            "type": payload.disaster_event.type,
            "magnitude": payload.disaster_event.magnitude,
            "depth_km": payload.disaster_event.depth_km
        }
        
        pop_dict = {
            "total_affected": payload.population_impact.total_affected
        }
        
        infra_dict = {
            "damaged_critical": payload.infrastructure_analysis.damaged_critical,
            "total_critical": payload.infrastructure_analysis.total_critical
        }
        
        result = calculate_risk_score(disaster_dict, pop_dict, infra_dict)
        
        response_data = RiskScoreResponse(
            disaster_id=disaster_id,
            total_score=result["total_score"],
            breakdown=ScoreBreakdown(
                magnitude_score=result["breakdown"]["magnitude_score"],
                population_score=result["breakdown"]["population_score"],
                infrastructure_score=result["breakdown"]["infrastructure_score"],
                depth_type_score=result["breakdown"]["depth_type_score"]
            ),
            severity_label=result["severity_label"],
            recommended_response_level=result["recommended_response_level"]
        )
        
        # Save to cache
        risk_score_cache[disaster_id] = response_data.model_dump()
        return response_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during risk score calculation: {str(e)}"
        )


@router.get("/risk-score/{disaster_id}", response_model=RiskScoreResponse, status_code=status.HTTP_200_OK)
async def get_risk_score_endpoint(disaster_id: str):
    """
    GET /api/analysis/risk-score/{disaster_id}
    Retrieves a cached risk score by disaster ID. If not found in cache, generates a dynamic mock one.
    """
    if disaster_id in risk_score_cache:
        cached_data = risk_score_cache[disaster_id]
        return RiskScoreResponse(**cached_data)
        
    # Dynamic fallback generator for any unspecified/queried IDs to ensure robustness
    try:
        # Create a dynamic event based on the ID for consistency
        # Let's seed the numbers pseudo-randomly using hash of disaster_id
        seed_val = sum(ord(c) for c in disaster_id)
        magnitude = 4.5 + (seed_val % 50) / 10.0 # 4.5 - 9.5
        affected = 5000 + (seed_val * 123) % 950000 # 5,000 - 955,000
        total_crit = 10 + (seed_val % 40) # 10 - 50
        damaged_crit = (seed_val * 7) % (total_crit + 1)
        depth_km = 5.0 + (seed_val % 90) # 5 - 95 km
        
        disaster_dict = {
            "type": "earthquake" if seed_val % 2 == 0 else "hurricane",
            "magnitude": magnitude,
            "depth_km": depth_km
        }
        
        pop_dict = {
            "total_affected": affected
        }
        
        infra_dict = {
            "damaged_critical": damaged_crit,
            "total_critical": total_crit
        }
        
        result = calculate_risk_score(disaster_dict, pop_dict, infra_dict)
        
        response_data = RiskScoreResponse(
            disaster_id=disaster_id,
            total_score=result["total_score"],
            breakdown=ScoreBreakdown(
                magnitude_score=result["breakdown"]["magnitude_score"],
                population_score=result["breakdown"]["population_score"],
                infrastructure_score=result["breakdown"]["infrastructure_score"],
                depth_type_score=result["breakdown"]["depth_type_score"]
            ),
            severity_label=result["severity_label"],
            recommended_response_level=result["recommended_response_level"]
        )
        
        # Save to cache so next requests are truly instantaneous
        risk_score_cache[disaster_id] = response_data.model_dump()
        return response_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disaster risk score for ID {disaster_id} could not be retrieved: {str(e)}"
        )


@router.post("/situation", response_model=SituationAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_disaster_situation_endpoint(payload: SituationAnalysisRequest):
    """
    POST /api/analysis/situation
    Aggregates disaster, impact, infrastructure, risk, and resource data, and invokes the Gemini-powered disaster analysis engine.
    """
    try:
        disaster_data = {
            "disaster_title": payload.disaster_title,
            "disaster_type": payload.disaster_type,
            "magnitude": payload.magnitude,
            "affected_population": payload.affected_population,
            "damaged_critical_facilities": payload.damaged_critical_facilities,
            "total_critical_facilities": payload.total_critical_facilities,
            "risk_score": payload.risk_score,
            "resources": payload.resources
        }
        result = await gemini_service.analyze_disaster_situation(disaster_data)
        return SituationAnalysisResponse(**result)
    except Exception as e:
        import traceback
        traceback.print_exc()
        fallback_data = gemini_service.generate_fallback_analysis({
            "disaster_title": payload.disaster_title,
            "disaster_type": payload.disaster_type,
            "magnitude": payload.magnitude,
            "affected_population": payload.affected_population,
            "damaged_critical_facilities": payload.damaged_critical_facilities,
            "total_critical_facilities": payload.total_critical_facilities,
            "risk_score": payload.risk_score,
            "resources": payload.resources
        })
        fallback_data["confidence_explanation"] += f" (Recovered from internal error: {str(e)})"
        return SituationAnalysisResponse(**fallback_data)


@router.post("/situation/stream")
async def analyze_disaster_situation_stream_endpoint(payload: SituationAnalysisRequest):
    """
    POST /api/analysis/situation/stream
    Streams the Gemini analysis in real-time as chunks of text/markdown.
    """
    async def event_generator():
        try:
            # Setup prompt and system instruction
            system_instruction = (
                "You are DIEP-AI, a highly precise, hyper-analytical virtual emergency command center intelligence specialist. "
                "Your core mandate is to analyze structured disaster information, population impacts, damaged infrastructure, risk matrices, and logistics resources, "
                "then convert them into actionable, safety-first emergency intelligence. You never speculate, exaggerate, or invent facts outside the physical plausibility of the disaster context. "
                "You prioritize human safety above all else. Your output must strictly conform to the expected JSON schema. "
                "Never include any markdown framing or extra text outside of the JSON object."
            )
            disaster_data = {
                "disaster_title": payload.disaster_title,
                "disaster_type": payload.disaster_type,
                "magnitude": payload.magnitude,
                "affected_population": payload.affected_population,
                "damaged_critical_facilities": payload.damaged_critical_facilities,
                "total_critical_facilities": payload.total_critical_facilities,
                "risk_score": payload.risk_score,
                "resources": payload.resources
            }
            prompt = gemini_service.build_disaster_prompt(disaster_data)

            # Try streaming from API if client is configured
            if gemini_service.client:
                try:
                    # pyrefly: ignore [missing-import]
                    from google.genai import types
                    response_stream = None
                    # Try gemini-2.5-flash, fallback to gemini-1.5-flash
                    for model_name in ["gemini-2.5-flash", "gemini-1.5-flash"]:
                        try:
                            response_stream = gemini_service.client.models.generate_content_stream(
                                model=model_name,
                                contents=prompt,
                                config=types.GenerateContentConfig(
                                    system_instruction=system_instruction,
                                    response_mime_type="application/json",
                                    response_schema={
                                        "type": "OBJECT",
                                        "properties": {
                                            "executive_summary": {"type": "STRING", "description": "High-level overview of posture and status"},
                                            "immediate_threats": {
                                                "type": "ARRAY",
                                                "items": {
                                                    "type": "OBJECT",
                                                    "properties": {
                                                        "threat": {"type": "STRING"},
                                                        "severity": {"type": "STRING", "description": "Critical, High, Moderate"},
                                                        "impact_area": {"type": "STRING"}
                                                    },
                                                    "required": ["threat", "severity", "impact_area"]
                                                }
                                            },
                                            "priority_actions": {
                                                "type": "ARRAY",
                                                "items": {
                                                    "type": "OBJECT",
                                                    "properties": {
                                                        "action": {"type": "STRING"},
                                                        "responsible_party": {"type": "STRING"},
                                                        "time_criticality": {"type": "STRING"}
                                                    },
                                                    "required": ["action", "responsible_party", "time_criticality"]
                                                }
                                            },
                                            "resource_gaps": {
                                                "type": "ARRAY",
                                                "items": {
                                                    "type": "OBJECT",
                                                    "properties": {
                                                        "resource": {"type": "STRING"},
                                                        "needed": {"type": "INTEGER"},
                                                        "available": {"type": "INTEGER"},
                                                        "gap": {"type": "INTEGER"},
                                                        "mitigation_plan": {"type": "STRING"}
                                                    },
                                                    "required": ["resource", "needed", "available", "gap", "mitigation_plan"]
                                                }
                                            },
                                            "estimated_response_window": {"type": "STRING", "description": "Critical rescue window info"},
                                            "confidence_level": {"type": "STRING", "description": "High, Medium, or Low"},
                                            "confidence_explanation": {"type": "STRING", "description": "Explanation of confidence level"}
                                        },
                                        "required": [
                                            "executive_summary",
                                            "immediate_threats",
                                            "priority_actions",
                                            "resource_gaps",
                                            "estimated_response_window",
                                            "confidence_level",
                                            "confidence_explanation"
                                        ]
                                    }
                                )
                            )
                            break
                        except Exception as model_err:
                            print(f"Error starting stream with model {model_name}: {model_err}")
                    
                    if response_stream:
                        for chunk in response_stream:
                            if chunk.text:
                                yield f"data: {chunk.text}\n\n"
                                await asyncio.sleep(0.01)
                        return # Finished streaming successfully
                except Exception as api_err:
                    print(f"Failed API stream: {api_err}. Falling back to sandbox stream.")

            # Fallback local stream
            import json
            fallback_data = gemini_service.generate_fallback_analysis(disaster_data)
            if gemini_service.client:
                fallback_data["confidence_explanation"] += " (API streaming connection failed, local backup active)"
            json_str = json.dumps(fallback_data)
            
            chunk_size = 35
            for i in range(0, len(json_str), chunk_size):
                chunk = json_str[i:i+chunk_size]
                yield f"data: {chunk}\n\n"
                await asyncio.sleep(0.02)
                
        except Exception as e:
            print(f"Error in streaming situation analysis: {e}")
            # Final fallback that matches expected JSON schema perfectly
            from datetime import datetime
            import json
            err_json = {
                "executive_summary": f"Recovered from critical stream error: {str(e)}",
                "immediate_threats": [{"threat": f"Analysis execution exception", "severity": "High", "impact_area": "System Operations"}],
                "priority_actions": [{"action": "Audit service logs and verify API configuration keys", "responsible_party": "IT Administrator", "time_criticality": "Within 2 hours"}],
                "resource_gaps": [],
                "estimated_response_window": "Immediate diagnosis required.",
                "confidence_level": "Low",
                "confidence_explanation": f"Stream error occurred: {str(e)}",
                "updated_at": datetime.utcnow().isoformat() + "Z"
            }
            yield f"data: {json.dumps(err_json)}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/situation-report", response_model=SituationReportResponse, status_code=status.HTTP_200_OK)
async def generate_situation_report_endpoint(payload: SituationReportRequest):
    """
    POST /api/analysis/situation-report
    Generates a structured professional emergency management Situation Report (SitRep) in Markdown.
    """
    try:
        from datetime import datetime
        disaster_data = {
            "disaster_title": payload.disaster_title,
            "disaster_type": payload.disaster_type,
            "magnitude": payload.magnitude,
            "affected_population": payload.affected_population,
            "damaged_critical_facilities": payload.damaged_critical_facilities,
            "total_critical_facilities": payload.total_critical_facilities,
            "risk_score": payload.risk_score,
            "resources": payload.resources
        }
        
        report_num = len(payload.previous_reports) + 1 if payload.previous_reports else 1
        title = f"Situation Report #{report_num} - {payload.disaster_title}"
        
        markdown_content = await gemini_service.generate_situation_report(
            disaster_data=disaster_data,
            situation_analysis=payload.situation_analysis,
            previous_reports=payload.previous_reports
        )
        
        created_at = datetime.utcnow().isoformat() + "Z"
        
        return SituationReportResponse(
            report_content=markdown_content,
            title=title,
            created_at=created_at
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Situation Report: {str(e)}"
        )


@router.post("/forecast", response_model=RiskForecastResponse, status_code=status.HTTP_200_OK)
async def generate_risk_forecast_endpoint(payload: RiskForecastRequest):
    """
    POST /api/analysis/forecast
    Generates 6-hour, 12-hour, and 24-hour predictive risk forecasts using Gemini models.
    """
    try:
        disaster_event = {
            "title": payload.disaster_title,
            "type": payload.disaster_type,
            "magnitude": payload.magnitude,
            "population_affected": payload.affected_population,
            "damaged_critical": payload.damaged_critical_facilities,
            "total_critical": payload.total_critical_facilities,
            "total_score": payload.risk_score
        }
        
        forecast_data = await gemini_service.generate_risk_forecast(
            disaster_event=disaster_event,
            current_analysis=payload.current_analysis
        )
        
        return forecast_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate predictive risk forecast: {str(e)}"
        )


