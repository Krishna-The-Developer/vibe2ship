import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DIEP API")

# ── CORS ────────────────────────────────────────
# Read allowed origins from environment variable
# Set this in Render dashboard as:
# ALLOWED_ORIGINS=https://your-app.vercel.app
raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:5174"
)

# Support comma-separated list of origins
ALLOWED_ORIGINS = [
    o.strip() for o in raw_origins.split(",")
    if o.strip()
]

# Always include localhost for development
for default_origin in [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
]:
    if default_origin not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(default_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT",
                   "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ── Public routes (never need auth) ─────────────
PUBLIC_ROUTES = [
    "/health",
    "/ping",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/disasters/urgent-tasks",
    "/api/disasters/earthquakes",
    "/api/ai/health",
]

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Always pass OPTIONS
    if request.method == "OPTIONS":
        return await call_next(request)

    # Always pass public routes
    for route in PUBLIC_ROUTES:
        if request.url.path.startswith(route):
            return await call_next(request)

    # Protected routes — check token
    auth_header = request.headers.get(
        "Authorization", ""
    )
    if not auth_header.startswith("Bearer "):
        return JSONResponse(
            status_code=401,
            content={
                "error": "Unauthorized",
                "path": request.url.path,
            }
        )

    return await call_next(request)

# ── Health endpoints ─────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "environment": os.getenv(
            "ENVIRONMENT", "production"
        ),
    }

@app.get("/ping")
async def ping():
    return {"pong": True}

# ── Routers ──────────────────────────────────────
try:
    from routers import (
        disasters, analysis,
        routing, resources, ai
    )
    app.include_router(
        disasters.router,
        prefix="/api/disasters"
    )
    app.include_router(
        analysis.router,
        prefix="/api/analysis"
    )
    app.include_router(
        routing.router,
        prefix="/api/routing"
    )
    app.include_router(
        resources.router,
        prefix="/api/resources"
    )
    app.include_router(
        ai.router,
        prefix="/api/ai"
    )
except ImportError as e:
    print(f"[DIEP] Router import warning: {e}")
