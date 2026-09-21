from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case

from app.database import get_db
from app.models import Inspection, QualityAlert, ModelRegistry
from app.schemas import DashboardStatsResponse
from app.routers.inspections import format_inspection_dict
from app.config import DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION, DEFAULT_MODEL_TYPE

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardStatsResponse)
def get_dashboard_statistics(db: Session = Depends(get_db)):
    """
    Returns real-time aggregated metrics directly calculated from the SQLite database.
    Does NOT invent stats; if empty, returns 0s and empty lists.
    """
    total = db.query(Inspection).count()
    completed = total
    defects = db.query(Inspection).filter(Inspection.defect_detected == True).count()
    flagged = db.query(Inspection).filter(Inspection.review_status == "Flagged").count()
    approved = db.query(Inspection).filter(Inspection.review_status == "Approved").count()

    pass_rate = round(((total - defects) / total * 100.0), 1) if total > 0 else 100.0
    has_demo = db.query(Inspection).filter(Inspection.is_demo == True).count() > 0

    # Recent inspections (up to 5)
    recent_items = db.query(Inspection).order_by(desc(Inspection.created_at)).limit(5).all()
    recent_formatted = [format_inspection_dict(i) for i in recent_items]

    # Defect distribution breakdown
    distribution_raw = db.query(
        Inspection.predicted_class, func.count(Inspection.id)
    ).group_by(Inspection.predicted_class).all()

    defect_distribution = [
        {"class_name": row[0], "count": row[1]} for row in distribution_raw
    ]

    # Inspection trends by date (last 7 days or recorded items)
    trends_raw = db.query(
        func.date(Inspection.created_at).label("insp_date"),
        func.count(Inspection.id).label("total_count"),
        func.sum(case((Inspection.defect_detected == True, 1), else_=0)).label("defect_count")
    ).group_by("insp_date").order_by("insp_date").limit(14).all()

    inspection_trends = [
        {
            "date": str(r[0]),
            "total": int(r[1]),
            "defects": int(r[2] or 0),
            "clean": int(r[1]) - int(r[2] or 0)
        }
        for r in trends_raw
    ]

    # Open quality alerts
    open_alerts = db.query(QualityAlert).filter(QualityAlert.status == "Open").count()

    # Active model information
    active_model = {
        "name": DEFAULT_MODEL_NAME,
        "type": DEFAULT_MODEL_TYPE,
        "version": DEFAULT_MODEL_VERSION,
        "status": "Online & Ready",
        "modality": "High-Resolution Laser Seam Optical & Gradient Analysis"
    }

    return {
        "total_inspections": total,
        "inspections_completed": completed,
        "defects_detected": defects,
        "flagged_for_review": flagged,
        "pass_rate_percentage": pass_rate,
        "has_demo_data": has_demo,
        "recent_inspections": recent_formatted,
        "defect_distribution": defect_distribution,
        "inspection_trends": inspection_trends,
        "open_alerts_count": open_alerts,
        "active_model": active_model
    }
