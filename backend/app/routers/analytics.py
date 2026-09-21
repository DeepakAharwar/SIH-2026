import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Inspection
from app.schemas import AnalyticsResponse

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    """
    Computes statistical breakdowns of inspections:
    - Defect distribution
    - Review status disposition
    - Input source frequency
    - Daily volume
    - Exploratory process parameter correlations with clear non-causal disclaimer.
    """
    total = db.query(Inspection).count()

    # Defect class counts
    class_counts_raw = db.query(Inspection.predicted_class, func.count(Inspection.id)).group_by(Inspection.predicted_class).all()
    defect_class_counts = {k: v for k, v in class_counts_raw}

    # Review status counts
    status_counts_raw = db.query(Inspection.review_status, func.count(Inspection.id)).group_by(Inspection.review_status).all()
    review_status_counts = {k: v for k, v in status_counts_raw}

    # Source distribution
    source_counts_raw = db.query(Inspection.input_source, func.count(Inspection.id)).group_by(Inspection.input_source).all()
    source_distribution = {k: v for k, v in source_counts_raw}

    # Daily volume
    daily_raw = db.query(
        func.date(Inspection.created_at).label("day"),
        func.count(Inspection.id)
    ).group_by("day").order_by("day").limit(30).all()
    daily_volume = [{"date": str(d[0]), "inspections": d[1]} for d in daily_raw]

    # Process parameter exploratory correlations
    inspections_with_params = db.query(Inspection).filter(Inspection.process_params_json.isnot(None)).all()
    param_correlations = []

    for insp in inspections_with_params:
        try:
            p = json.loads(insp.process_params_json)
            if p.get("laser_power_w") and p.get("welding_speed_mmpm"):
                param_correlations.append({
                    "id": insp.id,
                    "component_id": insp.component_id,
                    "laser_power_w": p.get("laser_power_w"),
                    "welding_speed_mmpm": p.get("welding_speed_mmpm"),
                    "shielding_gas_flow_lpm": p.get("shielding_gas_flow_lpm"),
                    "defect_detected": insp.defect_detected,
                    "predicted_class": insp.predicted_class,
                    "is_simulated": p.get("is_simulated", False)
                })
        except Exception:
            continue

    disclaimer = (
        "EXPLORATORY DATA NOTICE: Parameter correlations are observational and exploratory. "
        "They do not establish physical causation or predictive metallurgical guarantees. "
        "Simulated demo parameters are labeled as simulated."
    )

    return {
        "defect_class_counts": defect_class_counts,
        "review_status_counts": review_status_counts,
        "source_distribution": source_distribution,
        "daily_volume": daily_volume,
        "process_param_correlations": param_correlations,
        "correlation_disclaimer": disclaimer,
        "total_records": total
    }
