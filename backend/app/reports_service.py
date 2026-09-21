import os
import csv
import io
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
)

from app.config import REPORTS_DIR

def generate_inspection_pdf(inspection_data: Dict[str, Any], output_path: Optional[str] = None) -> str:
    """
    Generates a high-quality, professional ISO-traceable PDF inspection report using ReportLab.
    Includes original and annotated images, bounding boxes, severity rubric, advisory notes, and disclaimers.
    """
    insp_id = inspection_data.get("id", "INSP-UNKNOWN")
    if not output_path:
        filename = f"report_{insp_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        output_path = str(REPORTS_DIR / filename)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    primary_color = colors.HexColor("#0f172a")    # Slate 900
    brand_blue = colors.HexColor("#0284c7")       # Sky 600
    text_dark = colors.HexColor("#1e293b")        # Slate 800
    text_muted = colors.HexColor("#64748b")       # Slate 500
    card_bg = colors.HexColor("#f8fafc")          # Slate 50
    border_color = colors.HexColor("#cbd5e1")     # Slate 300
    danger_color = colors.HexColor("#dc2626")     # Red 600
    warning_color = colors.HexColor("#d97706")    # Amber 600
    success_color = colors.HexColor("#16a34a")    # Green 600

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_color
    )

    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=text_muted
    )

    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=text_dark
    )

    body_bold = ParagraphStyle(
        "DocBodyBold",
        parent=body_style,
        fontName="Helvetica-Bold"
    )

    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        alignment=1  # Centered
    )

    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=10,
        textColor=text_muted
    )

    story = []

    # 1. Header with branding
    header_data = [
        [
            Paragraph("<b>WELDGUARD AI</b>", title_style),
            Paragraph(f"<b>REPORT ID:</b> {insp_id}<br/><b>DATE:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", subtitle_style)
        ],
        [
            Paragraph("Laser Welding Quality Inspection & Defect Analysis Certificate", subtitle_style),
            Paragraph("ISO 5817 Level B Advisory Protocol", subtitle_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[360, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=brand_blue, spaceBefore=0, spaceAfter=10))

    # 2. Inspection Metadata Table
    meta_data = [
        [
            Paragraph("<b>Component ID:</b>", body_style),
            Paragraph(str(inspection_data.get("component_id") or "N/A"), body_bold),
            Paragraph("<b>Inspection Date:</b>", body_style),
            Paragraph(str(inspection_data.get("created_at") or datetime.utcnow().strftime('%Y-%m-%d %H:%M')), body_style)
        ],
        [
            Paragraph("<b>Operator:</b>", body_style),
            Paragraph(str(inspection_data.get("operator_name") or "Unassigned"), body_style),
            Paragraph("<b>Input Source:</b>", body_style),
            Paragraph(str(inspection_data.get("input_source") or "Upload").upper(), body_style)
        ],
        [
            Paragraph("<b>Material:</b>", body_style),
            Paragraph(str(inspection_data.get("material") or "316L Stainless Steel"), body_style),
            Paragraph("<b>Welding Process:</b>", body_style),
            Paragraph(str(inspection_data.get("welding_process") or "Fiber Laser Welding"), body_style)
        ],
        [
            Paragraph("<b>Inspection Engine:</b>", body_style),
            Paragraph(f"{inspection_data.get('model_name', 'WeldGuard-CV')} v{inspection_data.get('model_version', '2.4.1')}", body_style),
            Paragraph("<b>Data Classification:</b>", body_style),
            Paragraph("DEMO SAMPLE DATA" if inspection_data.get("is_demo") else "IN-SITU INSPECTION", body_bold)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[110, 160, 110, 160])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), card_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. AI Prediction & Defect Classification Card
    defect_detected = inspection_data.get("defect_detected", False)
    pred_class = inspection_data.get("predicted_class", "Good Weld (No Defect)")
    confidence = float(inspection_data.get("confidence", 0.0)) * 100
    severity = inspection_data.get("severity") or "Severity not established"
    review_status = inspection_data.get("review_status", "Pending")

    sev_color = danger_color if severity == "High" else (warning_color if severity == "Medium" else success_color)
    status_color = success_color if review_status == "Approved" else (danger_color if review_status == "Rejected" else warning_color)

    summary_rows = [
        [
            Paragraph("<b>Defect Classification</b>", body_bold),
            Paragraph("<b>Model Confidence</b>", body_bold),
            Paragraph("<b>Defensible Severity</b>", body_bold),
            Paragraph("<b>Human Review Status</b>", body_bold)
        ],
        [
            Paragraph(f"<font color='{'#dc2626' if defect_detected else '#16a34a'}'><b>{pred_class}</b></font>", badge_style),
            Paragraph(f"<b>{confidence:.1f}%</b>", badge_style),
            Paragraph(f"<font color='{sev_color.hexval()}'><b>{severity}</b></font>", badge_style),
            Paragraph(f"<font color='{status_color.hexval()}'><b>{review_status}</b></font>", badge_style)
        ]
    ]

    summary_table = Table(summary_rows, colWidths=[135, 135, 135, 135])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # 4. Severity Assessment & Methodology Explanation
    sev_method = inspection_data.get("severity_method") or "Defect severity evaluated based on geometric ISO 5817 criteria."
    story.append(Paragraph("<b>Defensible Severity Assessment Methodology</b>", section_heading))
    sev_box = Table(
        [[Paragraph(f"<b>Basis of Severity Rating:</b> {sev_method}", body_style)]],
        colWidths=[540]
    )
    sev_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(sev_box)
    story.append(Spacer(1, 10))

    # 5. Visual Inspection Evidence
    orig_path = inspection_data.get("original_file_path")
    annotated_path = inspection_data.get("annotated_file_path")

    def get_scaled_image(img_path: str, max_w=255, max_h=145):
        if img_path and os.path.exists(img_path):
            try:
                return RLImage(img_path, width=max_w, height=max_h)
            except Exception:
                return Paragraph("<i>Image format unreadable by PDF engine</i>", body_style)
        return Paragraph("<i>Image file unavailable</i>", body_style)

    if orig_path or annotated_path:
        story.append(Paragraph("<b>Visual Inspection Evidence & Defect Localization</b>", section_heading))
        img_row = [
            get_scaled_image(orig_path, 255, 145),
            get_scaled_image(annotated_path or orig_path, 255, 145)
        ]
        label_row = [
            Paragraph("<b>Original Raw Frame</b>", body_style),
            Paragraph("<b>Computer Vision Localized Defect Seam</b>", body_style)
        ]
        img_table = Table([label_row, img_row], colWidths=[270, 270])
        img_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            ('TOPPADDING', (0, 1), (-1, 1), 2),
        ]))
        story.append(img_table)
        story.append(Spacer(1, 10))

    # 6. Advisory Recommendations Panel
    recom = inspection_data.get("recommendations")
    if recom and isinstance(recom, dict):
        story.append(Paragraph("<b>Engineering Advisory Recommendations</b>", section_heading))
        
        factors = recom.get("contributing_factors", [])
        verifications = recom.get("suggested_verifications", [])
        actions = recom.get("corrective_actions", [])

        factors_txt = "<br/>".join([f"• {f}" for f in factors]) if factors else "No specific anomaly noted."
        verif_txt = "<br/>".join([f"• {v}" for v in verifications]) if verifications else "Standard visual NDT."
        action_txt = "<br/>".join([f"• {a}" for a in actions]) if actions else "Maintain current calibrated WPS parameters."

        rec_table_data = [
            [Paragraph("<b>Possible Contributing Factors:</b>", body_bold), Paragraph(factors_txt, body_style)],
            [Paragraph("<b>Suggested Verifications:</b>", body_bold), Paragraph(verif_txt, body_style)],
            [Paragraph("<b>Recommended Corrective Actions:</b>", body_bold), Paragraph(action_txt, body_style)],
        ]
        rec_table = Table(rec_table_data, colWidths=[160, 380])
        rec_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), card_bg),
            ('BOX', (0, 0), (-1, -1), 0.5, border_color),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(rec_table)
        story.append(Spacer(1, 10))

    # 7. Human Review Disposition & Notes
    review_notes = inspection_data.get("review_notes") or "No engineering review notes recorded."
    story.append(Paragraph("<b>Inspector Disposition & Review Notes</b>", section_heading))
    disp_table = Table([
        [Paragraph(f"<b>Current Review Status:</b> {review_status}", body_style)],
        [Paragraph(f"<b>Review Notes:</b> {review_notes}", body_style)]
    ], colWidths=[540])
    disp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fafafa")),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(disp_table)
    story.append(Spacer(1, 12))

    # 8. Mandatory System Disclaimer
    story.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=4, spaceAfter=6))
    disclaimer_text = (
        "<b>LEGAL & TECHNICAL DISCLAIMER:</b> WeldGuard AI is an automated decision-support and computer vision advisory tool "
        "developed as a software prototype. Surface optical analysis does not inspect internal volumetric structures beneath "
        "the visible seam surface. All automated defect classifications and severity ratings must be corroborated by certified "
        "Non-Destructive Testing (NDT Level II/III) inspection personnel before releasing mission-critical welded assemblies. "
        "WeldGuard AI does not directly control physical welding machinery or modify live welding parameters."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    doc.build(story)
    return output_path


def export_inspections_to_csv(inspections: List[Dict[str, Any]]) -> str:
    """
    Generates a CSV string representation of the inspections table for auditing and traceability.
    """
    output = io.StringIO()
    fieldnames = [
        "id", "created_at", "component_id", "operator_name", "material", "welding_process",
        "input_source", "defect_detected", "predicted_class", "confidence", "severity",
        "review_status", "review_notes", "model_name", "model_version", "is_demo"
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()

    for item in inspections:
        row = dict(item)
        if "confidence" in row and isinstance(row["confidence"], float):
            row["confidence"] = f"{row['confidence']:.4f}"
        if "created_at" in row and hasattr(row["created_at"], "isoformat"):
            row["created_at"] = row["created_at"].isoformat()
        writer.writerow(row)

    return output.getvalue()
