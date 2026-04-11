from fastapi import APIRouter

from app.db.mongo import get_client

router = APIRouter(prefix="/health", tags=["health"])


@router.get(
    "/",
    summary="Liveness check",
    description="Returns 200 when the server process is running.",
)
async def health() -> dict[str, str]:
    """Simple liveness endpoint."""
    return {"status": "ok"}


@router.get(
    "/ready",
    summary="Readiness check",
    description=(
        "Verifies that all external dependencies are reachable. "
        "Returns `status: ready` when healthy, `status: degraded` otherwise."
    ),
)
async def readiness() -> dict[str, str]:
    """Check MongoDB connectivity and report overall readiness."""
    checks: dict[str, str] = {}

    try:
        client = get_client()
        await client.admin.command("ping")
        checks["mongodb"] = "ok"
    except Exception:  # noqa: BLE001
        checks["mongodb"] = "error"

    overall = "ready" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, **checks}

