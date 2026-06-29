from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from models.schemas import (
    ScheduleCreate, 
    ScheduleResponse, 
    ScheduleUpdate, 
    AIScheduleGenerationRequest
)
from services.task_service import TaskService
from services.gemini_service import GeminiService

router = APIRouter(
    prefix="/scheduler",
    tags=["Chronological Timeline"]
)

# Reuse existing dependencies
from routers.tasks import get_task_service, get_gemini_service


@router.get("/", response_model=List[ScheduleResponse])
async def get_chronological_schedule(
    service: TaskService = Depends(get_task_service)
):
    """
    Retrieve today's optimized actions sorted chronologically by start time.
    """
    # TODO: Fetch and filter by specific day or timezone if needed
    return service.get_all_schedule_items()


@router.post("/", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule_block(
    item_in: ScheduleCreate,
    service: TaskService = Depends(get_task_service)
):
    """
    Manually add a timeline block (Task, Fixed Meeting, or Health Break).
    """
    # TODO: Add safety check to prevent double-booking or overlapping times
    return service.create_schedule_item(item_in)


@router.put("/{item_id}", response_model=ScheduleResponse)
async def update_schedule_block(
    item_id: str,
    item_in: ScheduleUpdate,
    service: TaskService = Depends(get_task_service)
):
    """
    Modify details or complete an existing timeline action block.
    """
    # TODO: Trigger desktop/browser alert notifications if block is active
    updated = service.update_schedule_item(item_id, item_in)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timeline item with ID '{item_id}' not found."
        )
    return updated


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule_block(
    item_id: str,
    service: TaskService = Depends(get_task_service)
):
    """
    Remove an action block from today's chronological focus schedule.
    """
    success = service.delete_schedule_item(item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Timeline item with ID '{item_id}' not found or already deleted."
        )
    return None


@router.post("/auto-optimize", response_model=List[ScheduleResponse])
async def trigger_ai_scheduling(
    request: AIScheduleGenerationRequest,
    task_service: TaskService = Depends(get_task_service),
    gemini_service: GeminiService = Depends(get_gemini_service)
):
    """
    AI Auto-Scheduler: Allocate unassigned high-priority tasks into free timeline gaps,
    scheduling deep work sessions around fixed commitments and inserting health breaks.
    """
    # TODO: In production, integrate full Gemini prompt passing existing schedules and active tasks
    # For now, we simulate the auto-scheduler logic:
    
    # 1. Fetch active (uncompleted) tasks
    active_tasks = task_service.get_all_tasks(completed=False)
    
    # 2. Filter tasks not already assigned to a timeline item
    existing_items = task_service.get_all_schedule_items()
    assigned_task_ids = {item["task_id"] for item in existing_items if item["task_id"]}
    
    unassigned_tasks = [t for t in active_tasks if t["id"] not in assigned_task_ids]
    
    # 3. Chronologically append unassigned tasks as "task" focus blocks
    # (Simulating greedy scheduling engine)
    new_items = []
    current_hour = 14  # Start scheduling from 14:00 (2:00 PM) for demo
    
    for task in unassigned_tasks:
        start_time = f"{current_hour:02d}:00"
        end_time = f"{(current_hour + 1):02d}:00"
        
        # Avoid scheduling past typical sleep times
        if current_hour >= 22:
            break
            
        schedule_in = ScheduleCreate(
            title=f"Focus: {task['title']}",
            start_time=start_time,
            end_time=end_time,
            type="task",
            task_id=task["id"]
        )
        created = task_service.create_schedule_item(schedule_in)
        new_items.append(created)
        
        # Add a 15-minute quick health rest block after the work session
        break_start = end_time
        break_end = f"{(current_hour + 1):02d}:15"
        break_in = ScheduleCreate(
            title="Hydration & Cognitive Decompression Break",
            start_time=break_start,
            end_time=break_end,
            type="break"
        )
        task_service.create_schedule_item(break_in)
        
        # Advance clock for next task
        current_hour += 2  # Leave space
        
    return task_service.get_all_schedule_items()
