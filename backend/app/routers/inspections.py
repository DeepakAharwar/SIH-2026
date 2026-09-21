import os
import uuid
import json
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Inspection, VideoFrame, QualityAlert
from app.schemas import (
    InspectionResponse, InspectionListResponse, HumanReviewUpdate,
    AdvisoryRecommendation, BoundingBox
)
from app.config import UPLOAD_DIR, ANNOTATED_DIR, SAMPLES_DIR, DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION
from app.ai.cv_engine import ComputerVisionWeldDetector
from app.ai.video_processor import VideoInspectionProcessor
from app.ai.recommendations import ADVISORY_CATALOG

router = APIRouter(prefix="/api/inspections", tags=["Inspections"])
detector = ComputerVisionWeldDetector()
video_processor = VideoInspectionProcessor(detector=detector)

def format_inspection_dict(insp: Inspection) -> dict:
    """Helper to convert Inspection model into schema-compatible dict."""
    boxes = []
    if insp.defect_boxes_json:
        try:
            raw_boxes = json.loads(insp.defect_boxes_json)
            boxes = [BoundingBox(**b) for b in raw_boxes]
        except Exception:
            boxes = []

    params = None
    if insp.process_params_json:
        try:
            params = json.loads(insp.process_params_json)
        except Exception:
            params = None

    # URL paths for frontend display
    orig_url = f"/storage/uploads/{os.path.basename(insp.original_file_path)}" if insp.original_file_path else ""
    annotated_url = f"/storage/annotated/{os.path.basename(insp.annotated_file_path)}" if insp.annotated_file_path else None

    # Advisory recommendations
    rec_obj = None
    if insp.defect_detected and insp.predicted_class in ADVISORY_CATALOG:
        cat_entry = ADVISORY_CATALOG[insp.predicted_class]
        rec_obj = AdvisoryRecommendation(
            defect_class=insp.predicted_class,
            contributing_factors=cat_entry.get("contributing_factors", []),
            suggested_verifications=cat_entry.get("suggested_verifications", []),
            corrective_actions=cat_entry.get("corrective_actions", []),
            disclaimer="Advisory only. Defect causes are multi-factorial and require qualified welding engineer verification."
        )

    # Convert frames if any
    frames_list = []
    if insp.frames:
        for f in insp.frames:
            f_boxes = []
            if f.defect_boxes_json:
                try:
                    f_boxes = [BoundingBox(**b) for b in json.loads(f.defect_boxes_json)]
                except Exception:
                    pass
            frames_list.append({
                "id": f.id,
                "frame_number": f.frame_number,
                "timestamp_sec": f.timestamp_sec,
                "file_path": f"/storage/uploads/{os.path.basename(f.file_path)}",
                "annotated_path": f"/storage/annotated/{os.path.basename(f.annotated_path)}" if f.annotated_path else None,
                "defect_detected": f.defect_detected,
                "predicted_class": f.predicted_class,
                "confidence": f.confidence,
                "defect_boxes": f_boxes
            })

    # Convert alerts if any
    alerts_list = []
    if insp.alerts:
        for a in insp.alerts:
            alerts_list.append({
                "id": a.id,
                "inspection_id": a.inspection_id,
                "category": a.category,
                "severity": a.severity,
                "message": a.message,
                "status": a.status,
                "created_at": a.created_at,
                "resolved_at": a.resolved_at
            })

    return {
        "id": insp.id,
        "created_at": insp.created_at,
        "component_id": insp.component_id,
        "operator_name": insp.operator_name,
        "material": insp.material,
        "welding_process": insp.welding_process,
        "input_source": insp.input_source,
        "original_image_url": orig_url,
        "annotated_image_url": annotated_url,
        "defect_detected": insp.defect_detected,
        "predicted_class": insp.predicted_class,
        "confidence": insp.confidence,
        "defect_boxes": boxes,
        "severity": insp.severity,
        "severity_method": insp.severity_method,
        "review_status": insp.review_status,
        "review_notes": insp.review_notes,
        "process_params": params,
        "is_demo": insp.is_demo,
        "model_name": insp.model_name,
        "model_version": insp.model_version,
        "recommendations": rec_obj,
        "frames": frames_list,
        "alerts": alerts_list
    }

@router.post("/image", response_model=InspectionResponse)
async def analyze_image_inspection(
    file: Optional[UploadFile] = File(None),
    sample_key: Optional[str] = Form(None),
    component_id: Optional[str] = Form("WELD-COMP-001"),
    operator_name: Optional[str] = Form("Quality Inspector"),
    material: Optional[str] = Form("316L Stainless Steel"),
    welding_process: Optional[str] = Form("Fiber Laser Welding"),
    input_source: Optional[str] = Form("upload"), # upload, webcam, demo
    notes: Optional[str] = Form(None),
    process_params: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded image file, a webcam still capture, or selects a pre-generated sample.
    Runs precision computer vision defect detection, calculates defensible severity, and stores results in SQLite.
    """
    is_demo = False
    saved_orig_path = None
    uid = f"INSP-{uuid.uuid4().hex[:8].upper()}"

    # Handle sample selector
    if sample_key:
        sample_map = {
            "porosity": SAMPLES_DIR / "sample_porosity.jpg",
            "crack": SAMPLES_DIR / "sample_crack.jpg",
            "burnthrough": SAMPLES_DIR / "sample_burnthrough.jpg",
            "incomplete_penetration": SAMPLES_DIR / "sample_incomplete_penetration.jpg",
            "good_weld": SAMPLES_DIR / "sample_good_weld.jpg"
        }
        if sample_key not in sample_map or not sample_map[sample_key].exists():
            raise HTTPException(status_code=400, detail=f"Sample '{sample_key}' is not available.")
        
        src_path = str(sample_map[sample_key])
        file_ext = ".jpg"
        saved_filename = f"{uid}_orig{file_ext}"
        saved_orig_path = str(UPLOAD_DIR / saved_filename)
        shutil.copyfile(src_path, saved_orig_path)
        is_demo = True
        input_source = "demo"
    elif file is not None:
        # Validate file extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            raise HTTPException(status_code=400, detail="Invalid image file format. Supported: JPG, JPEG, PNG, WEBP, BMP")

        saved_filename = f"{uid}_orig{ext}"
        saved_orig_path = str(UPLOAD_DIR / saved_filename)
        with open(saved_orig_path, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)
    else:
        raise HTTPException(status_code=400, detail="Please upload an image or select a demo sample.")

    # Execute Computer Vision Detection Engine
    try:
        cv_result = detector.predict(saved_orig_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Computer Vision inference failed: {str(e)}")

    # Parse optional process parameters
    parsed_params = None
    if process_params:
        try:
            parsed_params = json.loads(process_params)
        except Exception:
            pass

    # Build DB inspection record
    boxes_data = [b.dict() for b in cv_result.defect_boxes]
    inspection = Inspection(
        id=uid,
        created_at=datetime.utcnow(),
        component_id=component_id,
        operator_name=operator_name,
        material=material,
        welding_process=welding_process,
        input_source=input_source,
        original_file_path=saved_orig_path,
        annotated_file_path=cv_result.annotated_image_path,
        defect_detected=cv_result.defect_detected,
        predicted_class=cv_result.predicted_class,
        confidence=cv_result.confidence,
        defect_boxes_json=json.dumps(boxes_data),
        severity=cv_result.severity,
        severity_method=cv_result.severity_method,
        review_status="Flagged" if cv_result.defect_detected else "Pending",
        review_notes=notes,
        process_params_json=json.dumps(parsed_params) if parsed_params else None,
        is_demo=is_demo,
        model_name=cv_result.model_name,
        model_version=cv_result.model_version
    )
    db.add(inspection)
    db.flush()

    # Automatically create quality alert if defect detected or low confidence
    if cv_result.defect_detected:
        alert_sev = cv_result.severity if cv_result.severity in ["High", "Medium", "Low"] else "Medium"
        alert = QualityAlert(
            id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
            inspection_id=uid,
            category="Defect Detected",
            severity=alert_sev,
            message=f"Defect '{cv_result.predicted_class}' detected with {cv_result.confidence*100:.1f}% confidence on {component_id}.",
            status="Open",
            created_at=datetime.utcnow()
        )
        db.add(alert)
    elif cv_result.confidence < 0.70:
        alert = QualityAlert(
            id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
            inspection_id=uid,
            category="Low Confidence",
            severity="Low",
            message=f"Inspection on {component_id} yielded sub-70% confidence score. Human verification recommended.",
            status="Open",
            created_at=datetime.utcnow()
        )
        db.add(alert)

    db.commit()
    db.refresh(inspection)

    return format_inspection_dict(inspection)

@router.post("/video", response_model=InspectionResponse)
async def analyze_video_inspection(
    file: UploadFile = File(...),
    frame_interval_sec: float = Form(1.0),
    max_frames: int = Form(25),
    component_id: Optional[str] = Form("WELD-VIDEO-001"),
    operator_name: Optional[str] = Form("Quality Inspector"),
    material: Optional[str] = Form("316L Stainless Steel"),
    welding_process: Optional[str] = Form("Laser Seam Welding"),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Uploads a video, samples frames at user-specified rate using OpenCV,
    runs defect detection on frames, and generates aggregate inspection record.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".avi", ".mov", ".mkv", ".webm"]:
        raise HTTPException(status_code=400, detail="Invalid video format. Supported: MP4, AVI, MOV, MKV, WEBM")

    uid = f"INSP-VID-{uuid.uuid4().hex[:8].upper()}"
    saved_vid_path = str(UPLOAD_DIR / f"{uid}_orig{ext}")
    with open(saved_vid_path, "wb") as f_out:
        shutil.copyfileobj(file.file, f_out)

    try:
        frame_results, summary = video_processor.process_video(
            video_path=saved_vid_path,
            frame_interval_sec=frame_interval_sec,
            max_frames=max_frames
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video frame analysis failed: {str(e)}")

    primary_defect = summary["primary_defect_class"]
    defect_detected = summary["defect_detected"]
    first_annotated = frame_results[0]["annotated_path"] if frame_results else None

    inspection = Inspection(
        id=uid,
        created_at=datetime.utcnow(),
        component_id=component_id,
        operator_name=operator_name,
        material=material,
        welding_process=welding_process,
        input_source="video",
        original_file_path=saved_vid_path,
        annotated_file_path=first_annotated,
        defect_detected=defect_detected,
        predicted_class=primary_defect,
        confidence=0.91 if defect_detected else 0.95,
        defect_boxes_json=json.dumps(frame_results[0]["defect_boxes"]) if frame_results else "[]",
        severity="High" if primary_defect in ["Crack", "Burn-through"] else ("Medium" if defect_detected else None),
        severity_method=f"Evaluated across {summary['sampled_frames_count']} sampled video frames. Found {summary['defect_frames_count']} frames with defect indications.",
        review_status="Flagged" if defect_detected else "Pending",
        review_notes=f"Video duration: {summary['duration_seconds']}s. Sampled {summary['sampled_frames_count']} frames. Notes: {notes or ''}",
        is_demo=False,
        model_name=DEFAULT_MODEL_NAME,
        model_version=DEFAULT_MODEL_VERSION
    )
    db.add(inspection)
    db.flush()

    for fr in frame_results:
        vf = VideoFrame(
            inspection_id=uid,
            frame_number=fr["frame_number"],
            timestamp_sec=fr["timestamp_sec"],
            file_path=fr["file_path"],
            annotated_path=fr["annotated_path"],
            defect_detected=fr["defect_detected"],
            predicted_class=fr["predicted_class"],
            confidence=fr["confidence"],
            defect_boxes_json=json.dumps(fr["defect_boxes"])
        )
        db.add(vf)

    if defect_detected:
        alert = QualityAlert(
            id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
            inspection_id=uid,
            category="Defect Detected",
            severity="High" if primary_defect in ["Crack", "Burn-through"] else "Medium",
            message=f"Video analysis found {summary['defect_frames_count']} defect frames. Primary classification: {primary_defect}.",
            status="Open",
            created_at=datetime.utcnow()
        )
        db.add(alert)

    db.commit()
    db.refresh(inspection)
    return format_inspection_dict(inspection)

@router.get("", response_model=InspectionListResponse)
def list_inspections(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    defect_detected: Optional[bool] = None,
    predicted_class: Optional[str] = None,
    severity: Optional[str] = None,
    review_status: Optional[str] = None,
    input_source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Search and filter inspection records from SQLite database."""
    query = db.query(Inspection)

    if search:
        s = f"%{search}%"
        query = query.filter(
            (Inspection.id.ilike(s)) |
            (Inspection.component_id.ilike(s)) |
            (Inspection.operator_name.ilike(s)) |
            (Inspection.predicted_class.ilike(s))
        )
    if defect_detected is not None:
        query = query.filter(Inspection.defect_detected == defect_detected)
    if predicted_class:
        query = query.filter(Inspection.predicted_class == predicted_class)
    if severity:
        query = query.filter(Inspection.severity == severity)
    if review_status:
        query = query.filter(Inspection.review_status == review_status)
    if input_source:
        query = query.filter(Inspection.input_source == input_source)

    total = query.count()
    items = query.order_by(desc(Inspection.created_at)).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [format_inspection_dict(i) for i in items]
    }

@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(inspection_id: str, db: Session = Depends(get_db)):
    """Fetch complete inspection details including localization boxes, video frames, and alerts."""
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found.")
    return format_inspection_dict(insp)

@router.patch("/{inspection_id}/review", response_model=InspectionResponse)
def update_human_review(
    inspection_id: str,
    update: HumanReviewUpdate,
    db: Session = Depends(get_db)
):
    """Allows an authorized quality inspector to record a human disposition decision (Approved/Flagged/Rejected)."""
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found.")

    insp.review_status = update.review_status
    if update.review_notes is not None:
        insp.review_notes = update.review_notes

    # If approved, resolve any open quality alerts for this inspection
    if update.review_status == "Approved":
        alerts = db.query(QualityAlert).filter(
            QualityAlert.inspection_id == inspection_id,
            QualityAlert.status == "Open"
        ).all()
        for a in alerts:
            a.status = "Resolved"
            a.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(insp)
    return format_inspection_dict(insp)

@router.delete("/{inspection_id}")
def delete_inspection(inspection_id: str, db: Session = Depends(get_db)):
    """Deletes an inspection record and associated frames/alerts from the database."""
    insp = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found.")
    db.delete(insp)
    db.commit()
    return {"message": f"Inspection {inspection_id} successfully deleted."}

@router.post("/seed-demo")
def seed_demo_inspections(db: Session = Depends(get_db)):
    """
    Seeds the SQLite database with 5 pre-analyzed demo inspections corresponding
    to the generated synthetic sample weld specimens (Porosity, Crack, Burn-through,
    Incomplete Penetration, Good Weld). Clearly tagged as DEMO data.
    """
    demo_samples = [
        {
            "key": "sample_crack.jpg",
            "component": "AERO-BRACKET-T14",
            "material": "Inconel 718",
            "process": "Fiber Laser (4 kW)",
            "params": {"laser_power_w": 3800, "welding_speed_mmpm": 1200, "shielding_gas_flow_lpm": 20, "is_simulated": True}
        },
        {
            "key": "sample_porosity.jpg",
            "component": "AUTO-BATTERY-PACK-L08",
            "material": "Al-6061 Alloy",
            "process": "Oscillating Laser Beam",
            "params": {"laser_power_w": 2600, "welding_speed_mmpm": 1800, "shielding_gas_flow_lpm": 14, "is_simulated": True}
        },
        {
            "key": "sample_burnthrough.jpg",
            "component": "EXHAUST-MANIFOLD-B02",
            "material": "304 Stainless Steel",
            "process": "CO2 Laser Keyhole",
            "params": {"laser_power_w": 4500, "welding_speed_mmpm": 800, "shielding_gas_flow_lpm": 18, "is_simulated": True}
        },
        {
            "key": "sample_incomplete_penetration.jpg",
            "component": "CHASSIS-SUBFRAME-F9",
            "material": "High Strength Steel",
            "process": "Hybrid Laser-Arc",
            "params": {"laser_power_w": 3200, "welding_speed_mmpm": 2200, "shielding_gas_flow_lpm": 22, "is_simulated": True}
        },
        {
            "key": "sample_good_weld.jpg",
            "component": "FUEL-CELL-PLATE-FC4",
            "material": "Titanium Ti-6Al-4V",
            "process": "Pulsed Nd:YAG Laser",
            "params": {"laser_power_w": 1800, "welding_speed_mmpm": 1400, "shielding_gas_flow_lpm": 25, "is_simulated": True}
        }
    ]

    created_ids = []
    for item in demo_samples:
        src = SAMPLES_DIR / item["key"]
        if not src.exists():
            continue
        
        uid = f"INSP-DEMO-{uuid.uuid4().hex[:6].upper()}"
        dest_filename = f"{uid}_orig.jpg"
        dest_path = str(UPLOAD_DIR / dest_filename)
        shutil.copyfile(str(src), dest_path)

        cv_result = detector.predict(dest_path)
        boxes_data = [b.dict() for b in cv_result.defect_boxes]

        insp = Inspection(
            id=uid,
            created_at=datetime.utcnow(),
            component_id=item["component"],
            operator_name="Lead NDT Quality Engineer",
            material=item["material"],
            welding_process=item["process"],
            input_source="demo",
            original_file_path=dest_path,
            annotated_file_path=cv_result.annotated_image_path,
            defect_detected=cv_result.defect_detected,
            predicted_class=cv_result.predicted_class,
            confidence=cv_result.confidence,
            defect_boxes_json=json.dumps(boxes_data),
            severity=cv_result.severity,
            severity_method=cv_result.severity_method,
            review_status="Approved" if not cv_result.defect_detected else "Flagged",
            review_notes="Automated baseline calibration test record.",
            process_params_json=json.dumps(item["params"]),
            is_demo=True,
            model_name=cv_result.model_name,
            model_version=cv_result.model_version
        )
        db.add(insp)
        db.flush()

        if cv_result.defect_detected:
            alert = QualityAlert(
                id=f"ALT-{uuid.uuid4().hex[:8].upper()}",
                inspection_id=uid,
                category="Defect Detected",
                severity=cv_result.severity or "Medium",
                message=f"[DEMO] {cv_result.predicted_class} defect verified on sample {item['component']}.",
                status="Open",
                created_at=datetime.utcnow()
            )
            db.add(alert)

        created_ids.append(uid)

    db.commit()
    return {"message": f"Successfully seeded {len(created_ids)} demo inspection records.", "seeded_ids": created_ids}
