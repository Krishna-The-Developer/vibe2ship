import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from backend.models.schemas import TaskCreate, TaskUpdate, ScheduleCreate, ScheduleUpdate

class TaskService:
    def __init__(self):
        # In-memory mock databases
        self.tasks_db: Dict[str, Dict[str, Any]] = {}
        self.schedule_db: Dict[str, Dict[str, Any]] = {}
        
        # Seed initial tasks to mimic existing system state
        self._seed_data()

    def _seed_data(self):
        # Initial Tasks
        task1_id = str(uuid.uuid4())
        self.tasks_db[task1_id] = {
            "id": task1_id,
            "title": "Submit final presentation deck",
            "description": "Detail calculations and coordinate with Sarah",
            "priority": "panic",
            "duration": 45,
            "deadline": (datetime.utcnow() + timedelta(hours=3)).isoformat(),
            "category": "Work",
            "completed": False,
            "created_at": datetime.utcnow(),
            "subtasks": [
                {"id": str(uuid.uuid4()), "title": "Check financial summary slides", "completed": False},
                {"id": str(uuid.uuid4()), "title": "Verify formatting and export to PDF", "completed": False}
            ]
        }

        task2_id = str(uuid.uuid4())
        self.tasks_db[task2_id] = {
            "id": task2_id,
            "title": "Clean workspace for deep work session",
            "description": "Clear desk and prep essential documents",
            "priority": "low",
            "duration": 15,
            "deadline": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            "category": "Health",
            "completed": True,
            "created_at": datetime.utcnow() - timedelta(hours=2),
            "subtasks": []
        }

        # Initial Timeline Items
        item1_id = str(uuid.uuid4())
        self.schedule_db[item1_id] = {
            "id": item1_id,
            "title": "Standup Meeting (Fixed sync)",
            "start_time": "10:00",
            "end_time": "10:30",
            "type": "fixed",
            "task_id": None,
            "completed": True
        }

        item2_id = str(uuid.uuid4())
        self.schedule_db[item2_id] = {
            "id": item2_id,
            "title": "Polish Presentation Deck",
            "start_time": "13:00",
            "end_time": "14:00",
            "type": "task",
            "task_id": task1_id,
            "completed": False
        }

    # ==========================================
    # Task / Micro-steps CRUD Operations
    # ==========================================
    def get_all_tasks(self, completed: Optional[bool] = None) -> List[Dict[str, Any]]:
        tasks = list(self.tasks_db.values())
        if completed is not None:
            return [t for t in tasks if t["completed"] == completed]
        return tasks

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        return self.tasks_db.get(task_id)

    def create_task(self, task_in: TaskCreate) -> Dict[str, Any]:
        task_id = str(uuid.uuid4())
        
        # Populate nested subtasks
        subtasks_list = []
        if task_in.subtasks:
            for s in task_in.subtasks:
                subtasks_list.append({
                    "id": str(uuid.uuid4()),
                    "title": s.title,
                    "completed": s.completed
                })

        new_task = {
            "id": task_id,
            "title": task_in.title,
            "description": task_in.description,
            "priority": task_in.priority.value,
            "duration": task_in.duration,
            "deadline": task_in.deadline,
            "category": task_in.category,
            "completed": False,
            "created_at": datetime.utcnow(),
            "subtasks": subtasks_list
        }
        self.tasks_db[task_id] = new_task
        return new_task

    def update_task(self, task_id: str, task_in: TaskUpdate) -> Optional[Dict[str, Any]]:
        if task_id not in self.tasks_db:
            return None
        
        current_task = self.tasks_db[task_id]
        update_data = task_in.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            if key == "priority" and value:
                current_task[key] = value.value
            else:
                current_task[key] = value

        return current_task

    def delete_task(self, task_id: str) -> bool:
        if task_id in self.tasks_db:
            del self.tasks_db[task_id]
            return True
        return False

    def add_subtask(self, task_id: str, title: str) -> Optional[Dict[str, Any]]:
        if task_id not in self.tasks_db:
            return None
        
        new_subtask = {
            "id": str(uuid.uuid4()),
            "title": title,
            "completed": False
        }
        self.tasks_db[task_id]["subtasks"].append(new_subtask)
        return new_subtask

    def toggle_subtask(self, task_id: str, subtask_id: str) -> Optional[Dict[str, Any]]:
        if task_id not in self.tasks_db:
            return None
        
        for sub in self.tasks_db[task_id]["subtasks"]:
            if sub["id"] == subtask_id:
                sub["completed"] = not sub["completed"]
                return sub
        return None

    # ==========================================
    # Schedule / Chronological Timeline Operations
    # ==========================================
    def get_all_schedule_items(self) -> List[Dict[str, Any]]:
        # Return sorted by start_time
        items = list(self.schedule_db.values())
        return sorted(items, key=lambda x: x["start_time"])

    def create_schedule_item(self, item_in: ScheduleCreate) -> Dict[str, Any]:
        item_id = str(uuid.uuid4())
        new_item = {
            "id": item_id,
            "title": item_in.title,
            "start_time": item_in.start_time,
            "end_time": item_in.end_time,
            "type": item_in.type.value,
            "task_id": item_in.task_id,
            "completed": False
        }
        self.schedule_db[item_id] = new_item
        return new_item

    def update_schedule_item(self, item_id: str, item_in: ScheduleUpdate) -> Optional[Dict[str, Any]]:
        if item_id not in self.schedule_db:
            return None
        
        current_item = self.schedule_db[item_id]
        update_data = item_in.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            if key == "type" and value:
                current_item[key] = value.value
            else:
                current_item[key] = value
                
        return current_item

    def delete_schedule_item(self, item_id: str) -> bool:
        if item_id in self.schedule_db:
            del self.schedule_db[item_id]
            return True
        return False
