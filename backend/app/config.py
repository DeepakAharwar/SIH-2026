import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BASE_DIR / "app"
STORAGE_DIR = BASE_DIR / "storage"

UPLOAD_DIR = STORAGE_DIR / "uploads"
ANNOTATED_DIR = STORAGE_DIR / "annotated"
REPORTS_DIR = STORAGE_DIR / "reports"
SAMPLES_DIR = APP_DIR / "samples"

# Ensure all persistent storage directories exist
for path in [UPLOAD_DIR, ANNOTATED_DIR, REPORTS_DIR, SAMPLES_DIR]:
    path.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'weldguard.db'}")

# CORS Origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

# Supported Laser Welding Defect Classes
SUPPORTED_DEFECT_CLASSES = [
    "Porosity",
    "Crack",
    "Incomplete Penetration",
    "Burn-through",
    "Underfill",
    "Weld Discontinuity",
    "Good Weld (No Defect)"
]

# Active Model Information
DEFAULT_MODEL_NAME = "WeldGuard-CV-Precision-v2.4"
DEFAULT_MODEL_TYPE = "Computer Vision Seam & Gradient Defect Extractor"
DEFAULT_MODEL_VERSION = "2.4.1"
