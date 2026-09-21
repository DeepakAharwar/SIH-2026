import os
import uuid
from typing import List, Dict, Any, Tuple
import cv2

from app.config import UPLOAD_DIR, ANNOTATED_DIR
from app.ai.cv_engine import ComputerVisionWeldDetector
from app.ai.base import WeldInspectionResult

class VideoInspectionProcessor:
    """
    Extracts and inspects video frames at user-specified sampling rates using OpenCV.
    Ensures safe bounded memory usage and outputs timestamps, frame detections, and aggregates.
    """

    def __init__(self, detector: ComputerVisionWeldDetector = None):
        self.detector = detector or ComputerVisionWeldDetector()

    def process_video(
        self,
        video_path: str,
        frame_interval_sec: float = 1.0,
        max_frames: int = 25
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if fps <= 0:
            fps = 25.0
        duration_sec = total_frames / fps

        frame_step = max(1, int(fps * frame_interval_sec))
        
        extracted_results: List[Dict[str, Any]] = []
        frame_idx = 0
        analyzed_count = 0
        defect_frame_count = 0
        detected_defect_types = set()

        while cap.isOpened() and analyzed_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_step == 0:
                analyzed_count += 1
                timestamp_sec = round(frame_idx / fps, 2)
                
                # Save extracted frame temporarily
                frame_filename = f"vid_frame_{uuid.uuid4().hex[:10]}_{frame_idx}.jpg"
                frame_path = str(UPLOAD_DIR / frame_filename)
                cv2.imwrite(frame_path, frame)

                # Run inference on frame
                result: WeldInspectionResult = self.detector.predict(frame_path)
                
                if result.defect_detected:
                    defect_frame_count += 1
                    detected_defect_types.add(result.predicted_class)

                extracted_results.append({
                    "frame_number": frame_idx,
                    "timestamp_sec": timestamp_sec,
                    "file_path": frame_path,
                    "annotated_path": result.annotated_image_path,
                    "defect_detected": result.defect_detected,
                    "predicted_class": result.predicted_class,
                    "confidence": result.confidence,
                    "defect_boxes": [b.dict() for b in result.defect_boxes],
                    "severity": result.severity
                })

            frame_idx += 1

        cap.release()

        # Summary of video analysis
        overall_defect_detected = defect_frame_count > 0
        primary_defect = "Good Weld (No Defect)"
        if overall_defect_detected:
            # Most critical defect detected
            for high_crit in ["Crack", "Burn-through", "Incomplete Penetration", "Porosity", "Underfill", "Weld Discontinuity"]:
                if high_crit in detected_defect_types:
                    primary_defect = high_crit
                    break

        summary = {
            "total_video_frames": total_frames,
            "duration_seconds": round(duration_sec, 2),
            "sampled_frames_count": analyzed_count,
            "defect_frames_count": defect_frame_count,
            "defect_detected": overall_defect_detected,
            "primary_defect_class": primary_defect,
            "detected_defect_classes": list(detected_defect_types),
            "sampling_interval_sec": frame_interval_sec
        }

        return extracted_results, summary
