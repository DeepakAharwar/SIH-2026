from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import QualityAlert
from app.schemas import QualityAlertResponse, QualityAlertUpdate

router = APIRouter(prefix="/api/alerts", tags=["Quality Alerts"])

@router.get("", response_model=List[QualityAlertResponse])
def get_quality_alerts(
    status: Optional[str] = Query(None, pattern="^(Open|Resolved)$"),
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves system-wide software quality alerts."""
    query = db.query(QualityAlert)
    if status:
        query = query.filter(QualityAlert.status == status)
    if severity:
        query = query.filter(QualityAlert.severity == severity)

    return query.order_by(desc(QualityAlert.created_at)).all()

@router.patch("/{alert_id}", response_model=QualityAlertResponse)
def update_alert_status(
    alert_id: str,
    update: QualityAlertUpdate,
    db: Session = Depends(get_db)
):
    """Mark an alert as Resolved or Open."""
    alert = db.query(QualityAlert).filter(QualityAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")

    alert.status = update.status
    if update.status == "Resolved":
        alert.resolved_at = datetime.utcnow()
    else:
        alert.resolved_at = None

    db.commit()
    db.refresh(alert)
    return alert
