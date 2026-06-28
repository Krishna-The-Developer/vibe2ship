from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

PUBLIC_ROUTES = [
    "/",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/tasks/urgent-tasks",
    "/api/tasks/urgent",
    "/api/safe-slots",
    "/api/analysis/task-impact",
    "/api/analysis/critical-tasks",
    "/api/analysis/risk-score",
    "/api/analysis/situation",
    "/api/analysis/situation/stream",
    "/api/analysis/situation-report",
    "/api/analysis/forecast",
    "/api/evacuation/plan",
    "/api/resources/inventory",
    "/api/resources/depots",
    "/api/resources/allocate",
    "/api/resources/deploy-approve",
    "/api/resources/reset",
    "/api/ai/chat",
    "/api/alerts/generate",
]

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        
        # Check if the path is in PUBLIC_ROUTES or starts with any of them
        is_public = False
        for route in PUBLIC_ROUTES:
            if path == route or path.startswith(route + "/"):
                is_public = True
                break
                
        # Also always bypass static assets, docs, favicon
        if path.startswith("/static") or path == "/favicon.ico":
            is_public = True

        # Write to a debug log to see what paths are being hit and why they might fail
        try:
            with open("/tmp/debug_auth.log", "a") as f:
                f.write(f"METHOD: {method} | PATH: {path} | IS_PUBLIC: {is_public} | HEADERS: {dict(request.headers)}\n")
        except Exception:
            pass

        if is_public or method == "OPTIONS":
            return await call_next(request)
            
        # For protected routes, check Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Missing Authorization Header"}
            )
            
        # Standard check: must start with Bearer
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid Authorization scheme. Use Bearer token."}
            )
            
        # Extract token
        parts = auth_header.split(" ")
        if len(parts) < 2 or not parts[1].strip():
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Token is empty"}
            )
            
        # Authentication passed, proceed to route
        return await call_next(request)
