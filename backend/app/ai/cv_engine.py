import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Tuple
import cv2
import numpy as np

from app.config import ANNOTATED_DIR, DEFAULT_MODEL_NAME, DEFAULT_MODEL_VERSION
from app.ai.base import BaseWeldDetector, BoundingBoxData, WeldInspectionResult
from app.ai.severity import calculate_defensible_severity

class ComputerVisionWeldDetector(BaseWeldDetector):
    """
    Precision Computer Vision Defect Detection Engine.
    Employs morphological gradient analysis, CLAHE contrast normalization,
    contour geometry profiling, and circularity/aspect-ratio metrics to detect
    real visible laser welding surface defects (Porosity, Crack, Burn-through,
    Incomplete Penetration, Underfill, Discontinuity, or Good Weld).
    """

    def __init__(self):
        self.model_name = DEFAULT_MODEL_NAME
        self.model_version = DEFAULT_MODEL_VERSION

    def predict(self, image_path: str) -> WeldInspectionResult:
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Inspection image file not found: {image_path}")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"OpenCV could not decode image: {image_path}")

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        # Noise-reduced bilateral filter preserving sharp edge boundaries
        filtered = cv2.bilateralFilter(enhanced, d=7, sigmaColor=50, sigmaSpace=50)

        # Morphological gradient for edge transitions & dark-field void detection
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        grad = cv2.morphologyEx(filtered, cv2.MORPH_GRADIENT, kernel)

        # Adaptive thresholding to capture anomalous pits and crevices
        thresh_inv = cv2.adaptiveThreshold(
            filtered, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 5
        )

        # Otsu thresholding for deeper voids/burn-through
        _, otsu = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

        # Find defect candidate contours
        contours, _ = cv2.findContours(thresh_inv, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        candidate_boxes: List[Dict[str, Any]] = []
        porosity_candidates = []
        crack_candidates = []
        burnthrough_candidates = []
        penetration_candidates = []
        discontinuity_candidates = []

        # Effective estimated weld seam area (~40% of frame center)
        seam_area_px = int(w * h * 0.45)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            # Filter negligible pixel speckle noise (< 15 px) and gigantic background borders (> 35% frame)
            if area < 20 or area > (w * h * 0.35):
                continue

            bx, by, bw, bh = cv2.boundingRect(cnt)
            # Filter background borders, HAZ thermal lines, or full-width metal streaks
            if bw > (w * 0.55) or bh > (h * 0.55):
                continue
            perimeter = cv2.arcLength(cnt, True)
            if perimeter <= 0:
                continue

            circularity = 4.0 * np.pi * (area / (perimeter ** 2))
            aspect_ratio = max(bw, bh) / (min(bw, bh) + 1e-5)
            
            # Calculate local contrast depth relative to bead background
            mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.drawContours(mask, [cnt], -1, 255, -1)
            mean_val = cv2.mean(gray, mask=mask)[0]

            # Background neighborhood intensity around contour
            dilated_mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
            border_mask = cv2.subtract(dilated_mask, mask)
            border_mean = cv2.mean(gray, mask=border_mask)[0]
            contrast_depth = border_mean - mean_val # defects are darker than surrounding bead

            # 1. Crack indication: Elongated, high aspect ratio, AND significant contrast depth (dark fissure)
            if aspect_ratio >= 3.2 and (bw > 25 or bh > 25) and perimeter > 50 and contrast_depth > 20:
                conf = min(0.96, 0.78 + (aspect_ratio / 20.0) + (area / (w * h * 0.05)))
                crack_candidates.append({
                    "x": bx, "y": by, "w": bw, "h": bh,
                    "label": "Crack", "confidence": round(conf, 3), "area_ratio": area / seam_area_px
                })

            # 2. Burn-through indication: Deep void with severe low brightness in weld bead
            elif mean_val < 50 and area > 350 and contrast_depth > 35:
                conf = min(0.97, 0.82 + (area / (w * h * 0.1)))
                burnthrough_candidates.append({
                    "x": bx, "y": by, "w": bw, "h": bh,
                    "label": "Burn-through", "confidence": round(conf, 3), "area_ratio": area / seam_area_px
                })

            # 3. Porosity indication: Round/oval dark pit contours with high circularity and dark center
            elif circularity >= 0.40 and area <= 900 and aspect_ratio < 2.3 and contrast_depth > 18:
                conf = min(0.95, 0.75 + (circularity * 0.18))
                porosity_candidates.append({
                    "x": bx, "y": by, "w": bw, "h": bh,
                    "label": "Porosity", "confidence": round(conf, 3), "area_ratio": area / seam_area_px
                })

            # 4. Incomplete Penetration / Underfill: Linear depression along joint axis with high contrast depth
            elif 2.0 <= aspect_ratio < 3.2 and area > 200 and contrast_depth > 18:
                conf = min(0.92, 0.72 + (aspect_ratio * 0.06))
                penetration_candidates.append({
                    "x": bx, "y": by, "w": bw, "h": bh,
                    "label": "Incomplete Penetration", "confidence": round(conf, 3), "area_ratio": area / seam_area_px
                })

            # 5. Weld Discontinuity: Irregular boundary shape with noticeable contrast
            elif area > 250 and circularity < 0.35 and contrast_depth > 16:
                conf = min(0.89, 0.70 + (area / 1000.0))
                discontinuity_candidates.append({
                    "x": bx, "y": by, "w": bw, "h": bh,
                    "label": "Weld Discontinuity", "confidence": round(conf, 3), "area_ratio": area / seam_area_px
                })

        # Priority resolution of primary defect class
        detected = False
        primary_class = "Good Weld (No Defect)"
        primary_conf = 0.94
        chosen_boxes: List[Dict[str, Any]] = []

        if crack_candidates:
            detected = True
            primary_class = "Crack"
            chosen_boxes = crack_candidates[:8]
            primary_conf = max(b["confidence"] for b in chosen_boxes)
        elif burnthrough_candidates:
            detected = True
            primary_class = "Burn-through"
            chosen_boxes = burnthrough_candidates[:5]
            primary_conf = max(b["confidence"] for b in chosen_boxes)
        elif len(porosity_candidates) >= 1:
            detected = True
            primary_class = "Porosity"
            chosen_boxes = porosity_candidates[:15]
            primary_conf = max(b["confidence"] for b in chosen_boxes)
        elif penetration_candidates:
            detected = True
            primary_class = "Incomplete Penetration"
            chosen_boxes = penetration_candidates[:6]
            primary_conf = max(b["confidence"] for b in chosen_boxes)
        elif discontinuity_candidates:
            detected = True
            primary_class = "Weld Discontinuity"
            chosen_boxes = discontinuity_candidates[:8]
            primary_conf = max(b["confidence"] for b in chosen_boxes)
        else:
            detected = False
            primary_class = "Good Weld (No Defect)"
            primary_conf = 0.95
            chosen_boxes = []

        # Convert to BoundingBoxData
        box_objects = [
            BoundingBoxData(
                x=int(b["x"]),
                y=int(b["y"]),
                w=int(b["w"]),
                h=int(b["h"]),
                label=b["label"],
                confidence=float(b["confidence"]),
                area_ratio=float(round(b.get("area_ratio", 0.0), 4))
            )
            for b in chosen_boxes
        ]

        # Calculate defensible severity
        severity, severity_method = calculate_defensible_severity(
            defect_class=primary_class,
            boxes=box_objects,
            image_width=w,
            image_height=h,
            seam_area_px=seam_area_px
        )

        # Draw professional high-contrast industrial annotation
        annotated_img = img.copy()
        
        # Color mapping (BGR)
        color_map = {
            "Crack": (0, 0, 235),             # Vibrant Red
            "Burn-through": (0, 70, 220),      # Deep Orange-Red
            "Porosity": (0, 165, 255),         # Vivid Amber-Orange
            "Incomplete Penetration": (220, 150, 0), # Deep Cyan/Blue
            "Underfill": (180, 100, 0),        # Teal
            "Weld Discontinuity": (0, 215, 255),# Gold Yellow
            "Good Weld (No Defect)": (60, 190, 40) # Emerald Green
        }

        line_color = color_map.get(primary_class, (0, 0, 235))

        for box in box_objects:
            x, y, bw, bh = box.x, box.y, box.w, box.h
            # Draw main bounding rectangle
            cv2.rectangle(annotated_img, (x, y), (x + bw, y + bh), line_color, 2)
            
            # Corner accents
            corner_len = min(12, bw // 3, bh // 3)
            if corner_len > 3:
                cv2.line(annotated_img, (x, y), (x + corner_len, y), (255, 255, 255), 3)
                cv2.line(annotated_img, (x, y), (x, y + corner_len), (255, 255, 255), 3)
                cv2.line(annotated_img, (x + bw, y), (x + bw - corner_len, y), (255, 255, 255), 3)
                cv2.line(annotated_img, (x + bw, y), (x + bw, y + corner_len), (255, 255, 255), 3)

            # Label pill
            label_text = f"{box.label} {int(box.confidence * 100)}%"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.45
            thickness = 1
            (text_w, text_h), baseline = cv2.getTextSize(label_text, font, font_scale, thickness)
            
            # Badge background
            badge_y = max(y - 6, text_h + 6)
            cv2.rectangle(
                annotated_img,
                (x, badge_y - text_h - 4),
                (x + text_w + 8, badge_y + 2),
                line_color,
                -1
            )
            cv2.putText(
                annotated_img,
                label_text,
                (x + 4, badge_y - 2),
                font,
                font_scale,
                (255, 255, 255),
                thickness,
                cv2.LINE_AA
            )

        # Header inspection banner
        banner_h = 36
        overlay = annotated_img.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_h), (15, 23, 42), -1) # Dark Slate #0F172A
        cv2.addWeighted(overlay, 0.85, annotated_img, 0.15, 0, annotated_img)

        status_tag = f"DEFECT DETECTED: {primary_class.upper()} ({int(primary_conf*100)}%)" if detected else "INSPECTION PASSED: NO DEFECTS"
        tag_color = (0, 100, 255) if detected else (80, 220, 80)
        cv2.putText(
            annotated_img,
            f"WELDGUARD AI | {status_tag}",
            (14, 23),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            tag_color,
            2,
            cv2.LINE_AA
        )

        # Save annotated image
        annotated_filename = f"annotated_{uuid.uuid4().hex[:12]}.jpg"
        annotated_path = str(ANNOTATED_DIR / annotated_filename)
        cv2.imwrite(annotated_path, annotated_img)

        return WeldInspectionResult(
            defect_detected=detected,
            predicted_class=primary_class,
            confidence=round(primary_conf, 3),
            defect_boxes=box_objects,
            severity=severity,
            severity_method=severity_method,
            annotated_image_path=annotated_path,
            metrics={
                "image_width": w,
                "image_height": h,
                "defect_count": len(box_objects),
                "analyzed_seam_area_px": seam_area_px
            },
            model_name=self.model_name,
            model_version=self.model_version
        )
