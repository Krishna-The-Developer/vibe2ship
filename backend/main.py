import os
import uvicorn
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environmental configurations
load_dotenv()

# Initialize App Instance
app = FastAPI(
    title="Last-Minute Life Saver API",
    description="Cognitive load minimizer and anti-procrastination engine powered by Google Gemini",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 1. Custom Authentication Middleware - Skips all routes in PUBLIC_ROUTES
from middleware.auth import AuthMiddleware
app.add_middleware(AuthMiddleware)

# 2. CORS Configuration - Added LAST so it's the outermost middleware and executes first
# This ensures that OPTIONS requests return 200 OK without hitting AuthMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://YOUR-VERCEL-DOMAIN.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and Mount Routers
from routers.tasks import router as tasks_router
from routers.insights import router as insights_router
from routers.scheduler import router as scheduler_router
from routers.analysis import router as analysis_router
from routers.evacuation import router as evacuation_router
from routers.resources import router as resources_router
from routers.alerts import router as alerts_router
from routers.ai import router as ai_router

# Prefix all routes for versioning and clarity
app.include_router(tasks_router, prefix="/api")
app.include_router(insights_router, prefix="/api")
app.include_router(scheduler_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(evacuation_router, prefix="/api")
app.include_router(resources_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(ai_router, prefix="/api")

# ==========================================
# Safe Time Slots Engine Endpoint
# ==========================================
from datetime import datetime, timedelta
from models.schemas import SafeSlotsRequest, SafeSlotsResponse, SafeSlot

def generate_safe_slots(deadline_str: str) -> list:
    try:
        # Standard ISO string parse
        cleaned = deadline_str.replace("Z", "")
        if "T" in cleaned:
            if "." in cleaned:
                cleaned = cleaned.split(".")[0]
            deadline_dt = datetime.strptime(cleaned, "%Y-%m-%dT%H:%M:%S")
        else:
            deadline_dt = datetime.fromisoformat(cleaned)
    except Exception:
        # Fallback if text format or unparsable
        deadline_dt = datetime.now() + timedelta(hours=6)

    now = datetime.now()
    total_minutes_left = int((deadline_dt - now).total_seconds() / 60)

    # If the deadline is in the past or extremely close (e.g. less than 15 minutes)
    if total_minutes_left < 15:
        base_dt = now
        slots = [
            {
                "start_time": (base_dt + timedelta(minutes=2)).isoformat(),
                "end_time": (base_dt + timedelta(minutes=30)).isoformat(),
                "score": 90,
                "label": "Emergency Escape Window",
                "description": "Immediate focus block. Close all communication tabs and work continuously."
            },
            {
                "start_time": (base_dt + timedelta(minutes=35)).isoformat(),
                "end_time": (base_dt + timedelta(minutes=60)).isoformat(),
                "score": 75,
                "label": "Emergency Review & Polish",
                "description": "Secondary sprint. Final review of the output under extreme focus constraint."
            },
            {
                "start_time": (base_dt + timedelta(minutes=70)).isoformat(),
                "end_time": (base_dt + timedelta(minutes=95)).isoformat(),
                "score": 60,
                "label": "Post-Overdue Damage Control",
                "description": "Buffer slot in case of extension or late submission grace period."
            },
            {
                "start_time": (base_dt + timedelta(minutes=105)).isoformat(),
                "end_time": (base_dt + timedelta(minutes=135)).isoformat(),
                "score": 45,
                "label": "Mitigation & Retro Block",
                "description": "Post-deadline clean-up, review feedback, and configure preventive actions."
            },
            {
                "start_time": (base_dt + timedelta(minutes=140)).isoformat(),
                "end_time": (base_dt + timedelta(minutes=170)).isoformat(),
                "score": 30,
                "label": "Decompression & Sleep Slot",
                "description": "Complete shutdown window to restore cognitive reserve. No work permitted."
            }
        ]
        return slots

    # If we have a healthy window (e.g. at least 4 hours left)
    if total_minutes_left >= 240:
        s1_start = deadline_dt - timedelta(hours=4)
        s1_end = deadline_dt - timedelta(hours=3)
        s2_start = deadline_dt - timedelta(hours=6)
        s2_end = deadline_dt - timedelta(hours=5)
        s3_start = deadline_dt - timedelta(minutes=150)
        s3_end = deadline_dt - timedelta(minutes=90)
        s4_start = deadline_dt - timedelta(minutes=90)
        s4_end = deadline_dt - timedelta(minutes=45)
        s5_start = deadline_dt - timedelta(hours=9)
        s5_end = deadline_dt - timedelta(hours=8)
    else:
        # Dynamically partition the available remaining time into 5 slots
        chunk = total_minutes_left / 5.5
        s1_start = now + timedelta(minutes=int(chunk * 0.5))
        s1_end = now + timedelta(minutes=int(chunk * 1.3))
        
        s2_start = now + timedelta(minutes=int(chunk * 1.5))
        s2_end = now + timedelta(minutes=int(chunk * 2.3))
        
        s3_start = now + timedelta(minutes=int(chunk * 2.5))
        s3_end = now + timedelta(minutes=int(chunk * 3.3))
        
        s4_start = now + timedelta(minutes=int(chunk * 3.5))
        s4_end = now + timedelta(minutes=int(chunk * 4.3))
        
        s5_start = now + timedelta(minutes=int(chunk * 4.5))
        s5_end = now + timedelta(minutes=int(chunk * 5.2))

    # Helper to check if a slot's start time is in the past. If so, shift it up to 'now'
    def adjust_slot(start, end):
        if start < now:
            diff = now - start + timedelta(minutes=5)
            return now + timedelta(minutes=5), end + diff
        return start, end

    s1_start, s1_end = adjust_slot(s1_start, s1_end)
    s2_start, s2_end = adjust_slot(s2_start, s2_end)
    s3_start, s3_end = adjust_slot(s3_start, s3_end)
    s4_start, s4_end = adjust_slot(s4_start, s4_end)
    s5_start, s5_end = adjust_slot(s5_start, s5_end)

    slots = [
        {
            "start_time": s1_start.isoformat(),
            "end_time": s1_end.isoformat(),
            "score": 95 if total_minutes_left >= 240 else 92,
            "label": "Optimal Focus Window",
            "description": "High cognitive performance slot. Offers the best balance of safety and focus."
        },
        {
            "start_time": s2_start.isoformat(),
            "end_time": s2_end.isoformat(),
            "score": 88 if total_minutes_left >= 240 else 85,
            "label": "Deep Work Buffer",
            "description": "Early intervention window to tackle hardest micro-steps without rushing."
        },
        {
            "start_time": s3_start.isoformat(),
            "end_time": s3_end.isoformat(),
            "score": 78 if total_minutes_left >= 240 else 76,
            "label": "Cognitive Sprint Window",
            "description": "High concentration block for rapid execution. Clear external notifications."
        },
        {
            "start_time": s4_start.isoformat(),
            "end_time": s4_end.isoformat(),
            "score": 62 if total_minutes_left >= 240 else 58,
            "label": "Last Safe Harbor",
            "description": "Late-stage revision. Excellent for compiling final assets and proofreading."
        },
        {
            "start_time": s5_start.isoformat(),
            "end_time": s5_end.isoformat(),
            "score": 82 if total_minutes_left >= 240 else 72,
            "label": "Strategic Outline Block",
            "description": "Initial setup window. Map out flow, list dependencies, and prepare tools."
        }
    ]

    slots.sort(key=lambda x: x["score"], reverse=True)
    return slots

@app.post("/api/safe-slots", response_model=SafeSlotsResponse, tags=["Timeline Safe Slots"])
async def get_safe_slots_endpoint(payload: SafeSlotsRequest):
    """
    Computes 5 dynamic safe time slots prior to the deadline with productivity scoring.
    """
    slots = generate_safe_slots(payload.deadline)
    return SafeSlotsResponse(deadline=payload.deadline, slots=slots)

# Health Check Endpoints
@app.get("/", tags=["Infrastructure Health Check"])
async def root_index():
    """
    Root status check listing documentation and environment state.
    """
    return {
        "app_name": app.title,
        "status": "online",
        "api_documentation": "/docs",
        "supported_features": [
            "AI Micro-breakdown (Gemini 3.5)",
            "Dynamic Stress Coping Advisor",
            "Timeline Block Allocator"
        ]
    }

@app.get("/health", status_code=status.HTTP_200_OK, tags=["Infrastructure Health Check"])
async def health_check():
    """
    Standard heartbeat check for monitoring scripts or ingress routers.
    """
    return {
        "status": "healthy",
        "gemini_api_configured": os.getenv("GEMINI_API_KEY") is not None
    }

if __name__ == "__main__":
    # Load running parameters
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    print(f"Starting 'Last-Minute Life Saver API' server on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=debug)
