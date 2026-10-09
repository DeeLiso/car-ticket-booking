from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["system"])
def health():
    return {"status": "ok"}


@router.get("/health/ready", tags=["system"])
def readiness():
    from sqlalchemy import text

    from app.db.session import engine

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "up"}
    except Exception:
        return {"status": "degraded", "database": "down"}
