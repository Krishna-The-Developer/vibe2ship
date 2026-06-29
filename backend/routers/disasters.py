from fastapi import APIRouter
import httpx

router = APIRouter()

@router.get("/urgent-tasks")
async def get_urgent_tasks():
    """Public endpoint — no auth required."""
    try:
        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:
            resp = await client.get(
                "https://earthquake.usgs.gov"
                "/earthquakes/feed/v1.0"
                "/summary/significant_week.geojson"
            )
            data = resp.json()
            features = data.get("features", [])
            tasks = [
                {
                    "id": f["id"],
                    "title": f["properties"]["title"],
                    "magnitude": f["properties"]["mag"],
                    "place": f["properties"]["place"],
                    "time": f["properties"]["time"],
                    "severity": (
                        "CRITICAL"
                        if f["properties"]["mag"] >= 7
                        else "HIGH"
                        if f["properties"]["mag"] >= 5
                        else "MEDIUM"
                    ),
                }
                for f in features[:10]
            ]
            return {
                "tasks": tasks,
                "source": "live",
                "count": len(tasks),
            }
    except Exception as e:
        return {
            "tasks": [],
            "source": "fallback",
            "error": str(e),
            "count": 0,
        }

@router.get("/earthquakes")
async def get_earthquakes(
    period: str = "week",
    minmagnitude: float = 2.5,
):
    """Public endpoint — no auth required."""
    try:
        url = (
            "https://earthquake.usgs.gov"
            f"/earthquakes/feed/v1.0"
            f"/summary/all_{period}.geojson"
        )
        async with httpx.AsyncClient(
            timeout=10.0
        ) as client:
            resp = await client.get(url)
            return resp.json()
    except Exception as e:
        return {"features": [], "error": str(e)}
