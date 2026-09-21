import os
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Inspection
from app.routers.inspections import format_inspection_dict
from app.reports_service import generate_inspection_pdf, export_inspections_to_csv
from app.config import REPORTS_DIR

router = APIRouter(prefix="/api/reports", tags=["Reports & Exports"])

@router.get("/{inspection_id}/pdf")
def download_inspection_pdf(inspection_id: str, db: Session = Depends(get_db)):
    """
    Generates and returns an official PDF inspection report for the specified inspection ID.
    """
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found.")

    insp_dict = format_inspection_dict(insp)
    insp_dict["original_file_path"] = insp.original_file_path
    insp_dict["annotated_file_path"] = insp.annotated_file_path

    pdf_filename = f"WeldGuard_Report_{inspection_id}.pdf"
    pdf_path = str(REPORTS_DIR / pdf_filename)

    try:
        generate_inspection_pdf(insp_dict, output_path=pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=500, detail="Generated PDF file could not be accessed.")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_filename,
        headers={"Content-Disposition": f"attachment; filename={pdf_filename}"}
    )

@router.get("/export/csv")
def export_csv_history(db: Session = Depends(get_db)):
    """
    Exports complete inspection history as a downloadable CSV spreadsheet.
    """
    inspections = db.query(Inspection).order_by(Inspection.created_at.desc()).all()
    records = []
    for i in inspections:
        records.append({
            "id": i.id,
            "created_at": i.created_at,
            "component_id": i.component_id,
            "operator_name": i.operator_name,
            "material": i.material,
            "welding_process": i.welding_process,
            "input_source": i.input_source,
            "defect_detected": i.defect_detected,
            "predicted_class": i.predicted_class,
            "confidence": i.confidence,
            "severity": i.severity,
            "review_status": i.review_status,
            "review_notes": i.review_notes,
            "model_name": i.model_name,
            "model_version": i.model_version,
            "is_demo": i.is_demo
        })

    csv_content = export_inspections_to_csv(records)
    filename = "weldguard_inspection_history.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
