from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class BoundingBoxData(BaseModel):
    x: int
    y: int
    w: int
    h: int
    label: str
    confidence: float
    area_ratio: float = 0.0

class WeldInspectionResult(BaseModel):
    defect_detected: bool
    predicted_class: str
    confidence: float
    defect_boxes: List[BoundingBoxData] = []
    severity: Optional[str] = None
    severity_method: Optional[str] = None
    annotated_image_path: Optional[str] = None
    metrics: Dict[str, Any] = {}
    model_name: str
    model_version: str

class BaseWeldDetector(ABC):
    @abstractmethod
    def predict(self, image_path: str) -> WeldInspectionResult:
        """Run weld defect inspection on an image file and return structured result."""
        pass
