import json
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ModelRegistry
from app.schemas import ModelMetadataResponse
from app.config import (
    DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION, DEFAULT_MODEL_TYPE, SUPPORTED_DEFECT_CLASSES
)

router = APIRouter(prefix="/api/models", tags=["Model Management"])

@router.get("", response_model=List[ModelMetadataResponse])
def list_models(db: Session = Depends(get_db)):
    """
    Returns registered inspection models, active weights status,
    supported classes, and explicit limitations.
    """
    db_models = db.query(ModelRegistry).all()
    if not db_models:
        # Return default active precision CV model
        return [
            ModelMetadataResponse(
                id="model-cv-prec-v2.4",
                name=DEFAULT_MODEL_NAME,
                version=DEFAULT_MODEL_VERSION,
                model_type=DEFAULT_MODEL_TYPE,
                weights_status="Active (Algorithmic / Built-in)",
                supported_classes=SUPPORTED_DEFECT_CLASSES,
                description=(
                    "Hybrid Computer Vision Engine utilizing CLAHE contrast enhancement, bilateral filtering, "
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
        ]

    result = []
    for m in db_models:
        classes = []
        try:
            classes = json.loads(m.supported_classes_json)
        except Exception:
            classes = SUPPORTED_DEFECT_CLASSES

        result.append(ModelMetadataResponse(
            id=m.id,
            name=m.name,
            version=m.version,
            model_type=m.model_type,
            weights_status=m.weights_status,
            supported_classes=classes,
            description=m.description,
            limitations=m.limitations,
            is_active=m.is_active
        ))
    return result
