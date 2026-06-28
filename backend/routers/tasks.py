from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from backend.models.schemas import (
    TaskCreate, 
    TaskResponse, 
    TaskUpdate, 
    SubtaskResponse, 
    AIBreakdownRequest
)
from backend.services.task_service import TaskService
from backend.services.gemini_service import GeminiService

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks & Micro-steps"]
)

# Dependency Providers
def get_task_service() -> TaskService:
    if not hasattr(get_task_service, "_instance"):
        get_task_service._instance = TaskService()
    return get_task_service._instance

def get_gemini_service() -> GeminiService:
    if not hasattr(get_gemini_service, "_instance"):
        get_gemini_service._instance = GeminiService()
    return get_gemini_service._instance


@router.get("/", response_model=List[TaskResponse])
async def get_all_tasks(
    completed: Optional[bool] = None,
    service: TaskService = Depends(get_task_service)
):
    """
    Retrieve all tasks in the system. Supports optional filtering by completion state.
    """
    return service.get_all_tasks(completed=completed)


@router.get("/urgent", response_model=List[TaskResponse])
async def get_urgent_tasks(
    service: TaskService = Depends(get_task_service)
):
    """
    Retrieve list of critical/urgent rescue tasks.
    Returns simulated/sample urgent tasks for anti-procrastination intervention.
    """
    all_tasks = service.get_all_tasks(completed=False)
    urgent = [t for t in all_tasks if t.get("priority") in ["panic", "high"]]
    
    if not urgent:
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        sample_tasks = [
            {
                "id": "urgent-sample-1",
                "title": "CRITICAL: Fix server memory leak in production",
                "description": "Production container is crashing every 2 hours. Inspect heap logs immediately.",
                "priority": "panic",
                "duration": 45,
                "deadline": (now + timedelta(minutes=45)).isoformat(),
                "category": "DevOps",
                "completed": False,
                "created_at": now,
                "subtasks": [
                    {"id": "sub-1", "title": "Check container memory graphs", "completed": False},
                    {"id": "sub-2", "title": "Deploy node --max-old-space-size patch", "completed": False}
                ]
            },
            {
                "id": "urgent-sample-2",
                "title": "URGENT: Submit draft budget to investors",
                "description": "Pitch deck needs the final financial breakdown for Q3 projection.",
                "priority": "high",
                "duration": 60,
                "deadline": (now + timedelta(hours=2)).isoformat(),
                "category": "Finance",
                "completed": False,
                "created_at": now,
                "subtasks": [
                    {"id": "sub-3", "title": "Validate Q2 balance sheets", "completed": True},
                    {"id": "sub-4", "title": "Review cost of goods sold (COGS) model", "completed": False}
                ]
            }
        ]
        return sample_tasks
    return urgent


@router.get("/urgent-tasks", response_model=List[TaskResponse])
async def get_urgent_tasks_alt(
    service: TaskService = Depends(get_task_service)
):
    """
    Retrieve list of critical/urgent rescue tasks from alternative endpoint.
    Returns simulated/sample urgent tasks or live data with fallback.
    """
    return await get_urgent_tasks(service)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_by_id(
    task_id: str,
    service: TaskService = Depends(get_task_service)
):
    """
    Retrieve details of a single project rescue task by its UUID/ID.
    """
    task = service.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Task with ID '{task_id}' not found."
        )
    return task


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    service: TaskService = Depends(get_task_service)
):
    """
    Create a new urgent rescue task. If subtasks are provided, they are appended.
    """
    return service.create_task(task_in)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_in: TaskUpdate,
    service: TaskService = Depends(get_task_service)
):
    """
    Update field registers on a task (e.g., toggling completion, changing urgency level).
    """
    updated = service.update_task(task_id, task_in)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' not found."
        )
    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    service: TaskService = Depends(get_task_service)
):
    """
    Permanently delete a task and all related nested micro-steps from records.
    """
    success = service.delete_task(task_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' not found or already deleted."
        )
    return None


@router.post("/{task_id}/subtasks", response_model=SubtaskResponse, status_code=status.HTTP_201_CREATED)
async def add_manual_subtask(
    task_id: str,
    title: str,
    service: TaskService = Depends(get_task_service)
):
    """
    Manually add an actionable micro-step directly to an existing active task.
    """
    subtask = service.add_subtask(task_id, title)
    if not subtask:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID '{task_id}' not found."
        )
    return subtask


@router.post("/ai-breakdown", response_model=TaskResponse)
async def ai_breakdown_task(
    request: AIBreakdownRequest,
    task_service: TaskService = Depends(get_task_service),
    gemini_service: GeminiService = Depends(get_gemini_service)
):
    """
    AI Procrastination Breaker: Calls Gemini API to split a specific task into
    actionable 15-minute micro-steps, then updates the database.
    """
    parent_task = task_service.get_task(request.task_id)
    if not parent_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parent Task with ID '{request.task_id}' not found."
        )

    generated_steps = await gemini_service.breakdown_task(
        title=parent_task["title"],
        description=parent_task.get("description"),
        step_count=request.step_count
    )

    for step in generated_steps:
        task_service.add_subtask(request.task_id, step)

    return task_service.get_task(request.task_id)
