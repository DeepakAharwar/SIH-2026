from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String(50), primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    component_id = Column(String(100), nullable=True, index=True)
    operator_name = Column(String(100), nullable=True)
    material = Column(String(100), nullable=True)
    welding_process = Column(String(100), nullable=True)
    input_source = Column(String(50), default="upload")  # upload, webcam, video, demo
    
    original_file_path = Column(String(255), nullable=False)
    annotated_file_path = Column(String(255), nullable=True)
    
    defect_detected = Column(Boolean, default=False, index=True)
    predicted_class = Column(String(100), default="Good Weld (No Defect)", index=True)
    confidence = Column(Float, default=0.0)
    defect_boxes_json = Column(Text, nullable=True)  # JSON array of boxes
    
    severity = Column(String(50), nullable=True)     # Low, Medium, High, or "Severity not established"
    severity_method = Column(Text, nullable=True)    # Explicit calculation formula/rubric
    
    review_status = Column(String(50), default="Pending", index=True)  # Pending, Approved, Flagged, Rejected
    review_notes = Column(Text, nullable=True)
    
    process_params_json = Column(Text, nullable=True) # JSON object of laser power, speed, etc.
    is_demo = Column(Boolean, default=False, index=True)
    
    model_name = Column(String(100), default="WeldGuard-CV-Precision")
    model_version = Column(String(50), default="2.4.1")

    # Relationships
    frames = relationship("VideoFrame", back_populates="inspection", cascade="all, delete-orphan")
    alerts = relationship("QualityAlert", back_populates="inspection", cascade="all, delete-orphan")

class VideoFrame(Base):
    __tablename__ = "video_frames"

    id = Column(Integer, primary_key=True, autoincrement=True)
    inspection_id = Column(String(50), ForeignKey("inspections.id"), nullable=False, index=True)
    frame_number = Column(Integer, nullable=False)
    timestamp_sec = Column(Float, nullable=False)
    file_path = Column(String(255), nullable=False)
    annotated_path = Column(String(255), nullable=True)
    defect_detected = Column(Boolean, default=False)
    predicted_class = Column(String(100), default="Good Weld (No Defect)")
    confidence = Column(Float, default=0.0)
    defect_boxes_json = Column(Text, nullable=True)

    inspection = relationship("Inspection", back_populates="frames")

class QualityAlert(Base):
    __tablename__ = "quality_alerts"

    id = Column(String(50), primary_key=True, index=True)
    inspection_id = Column(String(50), ForeignKey("inspections.id"), nullable=True, index=True)
    category = Column(String(100), nullable=False) # Defect Detected, Review Required, Low Confidence, Model Unavailable
    severity = Column(String(50), default="Medium") # Low, Medium, High, Critical
    message = Column(Text, nullable=False)
    status = Column(String(50), default="Open", index=True) # Open, Resolved
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)

    inspection = relationship("Inspection", back_populates="alerts")

class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    model_type = Column(String(100), nullable=False)
    weights_status = Column(String(50), default="Active") # Active, Missing Weights, Standby
    weights_path = Column(String(255), nullable=True)
    supported_classes_json = Column(Text, nullable=False)
    description = Column(Text, nullable=False)
    limitations = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False)
