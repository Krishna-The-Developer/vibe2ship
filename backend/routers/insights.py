from fastapi import APIRouter, Depends, Query, status
from models.schemas import InsightBase, InsightResponse
from services.task_service import TaskService
from services.gemini_service import GeminiService

router = APIRouter(
    prefix="/insights",
    tags=["Productivity & Stress Insights"]
)

# Reuse existing dependencies from tasks router
from routers.tasks import get_task_service, get_gemini_service


@router.get("/metrics")
async def get_productivity_metrics(
    service: TaskService = Depends(get_task_service)
):
    """
    Get high-level real-time index calculations for tasks, panic states, and completion ratio.
    """
    tasks = service.get_all_tasks()
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t["completed"]])
    
    panic_tasks = [t for t in tasks if t["priority"] == "panic"]
    total_panic = len(panic_tasks)
    completed_panic = len([t for t in panic_tasks if t["completed"]])

    completion_rate = round((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
    panic_defused_rate = round((completed_panic / total_panic) * 100) if total_panic > 0 else 0

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "completion_rate_percentage": completion_rate,
        "panic_deadlines_total": total_panic,
        "panic_deadlines_defused": completed_panic,
        "panic_defused_percentage": panic_defused_rate,
        "efficiency_index_description": "Calculated live from active in-memory system registers."
    }


@router.post("/stress-diagnostic", response_model=InsightResponse, status_code=status.HTTP_200_OK)
async def evaluate_stress_level(
    payload: InsightBase,
    gemini_service: GeminiService = Depends(get_gemini_service)
):
    """
    Stress & Procrastination Diagnostic: Submit a self-reported anxiety scale (1-10)
    to receive direct, zone-based cognitive-behavioral advice from the AI engine.
    """
    # TODO: Log historical stress entries to draw long-term emotional wellness charts
    advice_payload = await gemini_service.generate_stress_advice(payload.stress_level)
    return advice_payload
