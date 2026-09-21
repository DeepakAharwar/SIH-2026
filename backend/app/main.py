import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import (
    UPLOAD_DIR, ANNOTATED_DIR, REPORTS_DIR, SAMPLES_DIR,
    ALLOWED_ORIGINS, DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION, DEFAULT_MODEL_TYPE,
    SUPPORTED_DEFECT_CLASSES
)
from app.database import engine, Base, SessionLocal
from app.models import ModelRegistry
from app.routers import inspections, dashboard, alerts, analytics, models, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    
    # Pre-seed model registry entry if not present
    db = SessionLocal()
    try:
        existing = db.query(ModelRegistry).filter(ModelRegistry.id == "model-cv-prec-v2.4").first()
        if not existing:
            default_entry = ModelRegistry(
                id="model-cv-prec-v2.4",
                name=DEFAULT_MODEL_NAME,
                version=DEFAULT_MODEL_VERSION,
                model_type=DEFAULT_MODEL_TYPE,
                weights_status="Active",
                weights_path=None,
                supported_classes_json=json.dumps(SUPPORTED_DEFECT_CLASSES),
                description=(
                    "Adaptive Computer Vision Engine utilizing CLAHE contrast enhancement, bilateral filtering, "
                    "morphological gradient void detection, and contour geometry profiling calibrated for "
                    "laser seam surface defect localization."
                ),
                limitations=(
                    "Analyzes only visible top-surface weld bead geometry and seam discontinuities. "
                    "Cannot detect subsurface porosity or root lack-of-fusion without X-ray/radiographic NDT. "
                    "Designed for optical macro-inspection."
                ),
                is_active=True
            )
            db.add(default_entry)
            db.commit()
    finally:
        db.close()
    
    yield

app = FastAPI(
    title="WeldGuard AI — Laser Welding Inspection API",
    description="Automated AI-assisted laser welding defect detection, defensible severity assessment, and quality traceability system.",
    version="2.4.1",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file directories for serving inspection and annotated images
app.mount("/storage/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/storage/annotated", StaticFiles(directory=str(ANNOTATED_DIR)), name="annotated")
app.mount("/storage/reports", StaticFiles(directory=str(REPORTS_DIR)), name="reports")
app.mount("/samples", StaticFiles(directory=str(SAMPLES_DIR)), name="samples")

# Include Routers
app.include_router(inspections.router)
app.include_router(dashboard.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(models.router)
app.include_router(reports.router)

@app.get("/api/health", tags=["Health"])
def health_check():
    """Confirms that the FastAPI backend and inference pipeline are operational."""
    return {
        "status": "online",
        "service": "WeldGuard AI Backend",
        "version": "2.4.1",
        "hardware_mode": "100% Software Prototype (No physical PLC/sensors required)",
        "active_model": DEFAULT_MODEL_NAME
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
