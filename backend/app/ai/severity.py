from typing import List, Tuple, Optional
from app.ai.base import BoundingBoxData

def calculate_defensible_severity(
    defect_class: str,
    boxes: List[BoundingBoxData],
    image_width: int,
    image_height: int,
    seam_area_px: int
) -> Tuple[Optional[str], Optional[str]]:
    """
    Computes a defensible severity rating based on geometric criteria,
    defect criticality, and defect-to-weld-seam area ratio.
    
    Returns:
        (severity: "Low" | "Medium" | "High" | "Severity not established" | None,
         method_explanation: str)
    """
    if defect_class == "Good Weld (No Defect)" or not boxes:
        return (None, "No visible defect detected; severity assessment is not applicable.")

    total_defect_px = sum(box.w * box.h for box in boxes)
    effective_seam_area = max(seam_area_px, image_width * image_height * 0.25)
    area_ratio = total_defect_px / effective_seam_area

    # Rule 1: High Criticality Planar & Penetration Defects
    if defect_class == "Crack":
        return (
            "High",
            "Geometric Rubric (Criticality Tier 1): Cracks exhibit extreme stress concentration factors and propagation tendencies under dynamic cyclic load. Any confirmed crack is evaluated as High severity per ISO 5817 Level B standards."
        )

    if defect_class == "Burn-through":
        return (
            "High",
            "Geometric Rubric (Criticality Tier 1): Burn-through constitutes a through-thickness void and complete loss of joint containment. Evaluated as High severity."
        )

    # Rule 2: Volumetric Defects (Porosity) evaluated via relative area ratio
    if defect_class == "Porosity":
        if area_ratio < 0.02:
            return (
                "Low",
                f"Area Ratio Rubric: Measured porosity area covers {area_ratio*100:.2f}% of the weld seam (<2.0% limit for isolated pores). Evaluated as Low severity."
            )
        elif area_ratio <= 0.08:
            return (
                "Medium",
                f"Area Ratio Rubric: Measured porosity area covers {area_ratio*100:.2f}% of the weld seam (2.0% - 8.0% range). Evaluated as Medium severity requiring engineering review."
            )
        else:
            return (
                "High",
                f"Area Ratio Rubric: Measured clustered porosity area covers {area_ratio*100:.2f}% of the weld seam (>8.0% critical threshold). Evaluated as High severity."
            )

    # Rule 3: Seam Geometry Defects (Incomplete Penetration, Underfill, Discontinuity)
    if defect_class in ["Incomplete Penetration", "Underfill"]:
        max_box_dimension = max(max(b.w, b.h) for b in boxes)
        relative_length = max_box_dimension / max(image_width, image_height)
        if relative_length > 0.35:
            return (
                "High",
                f"Dimensional Rubric: Major defect dimension spans {relative_length*100:.1f}% of inspected frame (>35% continuous span). Evaluated as High severity."
            )
        else:
            return (
                "Medium",
                f"Dimensional Rubric: Major defect dimension spans {relative_length*100:.1f}% of frame (<=35% localized defect). Evaluated as Medium severity."
            )

    if defect_class == "Weld Discontinuity":
        if area_ratio > 0.05:
            return (
                "Medium",
                f"Morphological Rubric: Surface discontinuity irregularity covers {area_ratio*100:.2f}% of weld area. Evaluated as Medium severity."
            )
        else:
            return (
                "Low",
                f"Morphological Rubric: Minor surface irregularity covers {area_ratio*100:.2f}% of weld area. Evaluated as Low severity."
            )

    # Fallback if unvalidated or ambiguous
    return (
        "Severity not established",
        "Empirical calibration data insufficient to confirm physical severity tolerance under current inspection parameters. Manual NDT verification advised."
    )
