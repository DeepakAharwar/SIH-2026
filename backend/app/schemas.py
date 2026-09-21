from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: int
    y: int
    w: int
    h: int
    label: str
    confidence: float
    area_ratio: float = 0.0

class ProcessParameters(BaseModel):
    laser_power_w: Optional[float] = None
    welding_speed_mmpm: Optional[float] = None
    shielding_gas_flow_lpm: Optional[float] = None
    focus_position_mm: Optional[float] = None
    material_thickness_mm: Optional[float] = None
    is_simulated: bool = False

class InspectionCreate(BaseModel):
    component_id: Optional[str] = "WELD-COMP-001"
    operator_name: Optional[str] = "Quality Inspector"
    material: Optional[str] = "316L Stainless Steel"
    welding_process: Optional[str] = "Fiber Laser Welding"
    input_source: str = "upload" # upload, webcam, video, demo
    notes: Optional[str] = None
    process_params: Optional[ProcessParameters] = None
    is_demo: bool = False

class VideoFrameResponse(BaseModel):
    id: int
    frame_number: int
    timestamp_sec: float
    file_path: str
    annotated_path: Optional[str] = None
    defect_detected: bool
    predicted_class: str
    confidence: float
    defect_boxes: List[BoundingBox] = []

    class Config:
        from_attributes = True

class QualityAlertResponse(BaseModel):
    id: str
    inspection_id: Optional[str] = None
    category: str
    severity: str
    message: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class QualityAlertUpdate(BaseModel):
    status: str = Field(..., pattern="^(Open|Resolved)$")

class AdvisoryRecommendation(BaseModel):
    defect_class: str
    contributing_factors: List[str]
    suggested_verifications: List[str]
    corrective_actions: List[str]
    disclaimer: str

class InspectionResponse(BaseModel):
    id: str
    created_at: datetime
    component_id: Optional[str] = None
    operator_name: Optional[str] = None
    material: Optional[str] = None
    welding_process: Optional[str] = None
    input_source: str
    original_image_url: str
    annotated_image_url: Optional[str] = None
    defect_detected: bool
    predicted_class: str
    confidence: float
    defect_boxes: List[BoundingBox] = []
    severity: Optional[str] = None
    severity_method: Optional[str] = None
    review_status: str
    review_notes: Optional[str] = None
    process_params: Optional[Dict[str, Any]] = None
    is_demo: bool
    model_name: str
    model_version: str
    recommendations: Optional[AdvisoryRecommendation] = None
    frames: List[VideoFrameResponse] = []
    alerts: List[QualityAlertResponse] = []

    class Config:
        from_attributes = True

class InspectionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[InspectionResponse]

class HumanReviewUpdate(BaseModel):
    review_status: str = Field(..., pattern="^(Approved|Flagged|Rejected|Pending)$")
    review_notes: Optional[str] = None

class DashboardStatsResponse(BaseModel):
    total_inspections: int
    inspections_completed: int
    defects_detected: int
    flagged_for_review: int
    pass_rate_percentage: float
    has_demo_data: bool
    recent_inspections: List[InspectionResponse]
    defect_distribution: List[Dict[str, Any]]
    inspection_trends: List[Dict[str, Any]]
    open_alerts_count: int
    active_model: Dict[str, Any]

class AnalyticsResponse(BaseModel):
    defect_class_counts: Dict[str, int]
    review_status_counts: Dict[str, int]
    source_distribution: Dict[str, int]
    daily_volume: List[Dict[str, Any]]
    process_param_correlations: List[Dict[str, Any]]
    correlation_disclaimer: str
    total_records: int

class ModelMetadataResponse(BaseModel):
    id: str
    name: str
    version: str
    model_type: str
    weights_status: str
    supported_classes: List[str]
    description: str
    limitations: str
    is_active: bool
