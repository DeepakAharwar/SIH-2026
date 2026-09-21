# WeldGuard AI — AI-Powered Laser Welding Inspection System

**WeldGuard AI** is a 100% software-only, industrial-grade quality inspection platform designed to detect, localize, and classify laser welding defects from macro optical images and video feeds. It features defensible ISO 5817-aligned defect severity assessment, real-time quality alerting, interactive traceability, and automated PDF inspection certificate generation.

---

## ⚠️ Strict Software-Only Certification

* **Zero External Hardware:** No ESP32, Arduino, Raspberry Pi, external sensors, pyrometers, or PLCs required.
* **No Machine Control:** The system does not command physical laser drives or welding machinery.
* **Standard Laptop/PC CPU Execution:** Optimized for CPU-based inference via Python and OpenCV with no GPU or Docker prerequisites.
* **Optional Optical Webcam Capture:** The laptop's built-in webcam is utilized strictly as an optical image acquisition source, not as an in-situ laser sensor.

---

## 🚀 Key Modules & Capabilities

1. **Executive Quality Dashboard:**
   - Real-time KPI counters calculated directly from SQLite (Pass Rate %, Total Scans, Defects Identified, Flagged for Review, Active Alerts).
   - Recharts defect classification breakdown and daily volume trends.
   - Quick one-click "Load Demo Specimen Data" seeder.

2. **Weld Defect Inspection Pipeline:**
   - **Input Flexibility:** Upload images (JPG, PNG, WEBP), select calibrated demo specimens (Crack, Porosity, Burn-through, Incomplete Penetration, Good Weld), or capture via webcam.
   - **Computer Vision Defect Engine:** CLAHE contrast enhancement, bilateral edge filtering, morphological gradient void detection, and contour geometry profiling.
   - **Defect Localization:** High-contrast bounding boxes with confidence scores.
   - **Defensible Severity Assessment:** Explicit ISO 5817 Level B standards rubric. Planar cracks and burn-through voids evaluate to High; volumetric gas pores are evaluated against a measured defect-to-seam area ratio (<2% Low, 2-8% Medium, >8% High).
   - **Advisory Recommendations Catalog:** Possible contributing factors, suggested non-destructive verifications, and corrective machine maintenance actions.
   - **Human Review Disposition Gate:** Quality inspectors can record official decisions (`Approved`, `Flagged`, `Rejected`, `Pending`) and audit notes.

3. **Optical Webcam Module:**
   - Browser `getUserMedia` capture interface with viewfinder crosshairs.
   - Graceful camera permission and missing hardware error handling.
   - Automatic camera track cleanup upon unmount.

4. **Video Frame Inspection:**
   - Upload MP4/WebM weld seam videos.
   - Configurable frame sampling intervals (0.5s to 3.0s) and frame caps.
   - Analyzed frame filmstrip with defect tags, timestamps, and bounding box preview.

5. **Traceability & Inspection History:**
   - Filterable, searchable, and paginated historical log.
   - Filter by defect class, severity rating, input source, and review disposition.
   - Download individual PDF inspection certificates or export all history as CSV.

6. **Quality Analytics:**
   - Defect frequency distributions and review status breakdowns.
   - Exploratory process parameter scatter plot (Laser Power vs. Speed) with prominent non-causal advisory disclaimer.

7. **Downloadable PDF Certificates & CSV Export:**
   - Generated on-the-fly via ReportLab with side-by-side original/annotated image evidence, severity formulas, and legal disclaimers.

---

## 🛠️ Technology Stack

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Axios.
* **Backend:** Python 3.10+, FastAPI, SQLAlchemy, SQLite, Pydantic v2, ReportLab, OpenCV (cv2), Pillow, NumPy.

---

## ⚡ Quick Start Instructions (Windows)

### Prerequisites
* Python 3.10 or higher installed with `pip`.
* Node.js 18 or higher installed with `npm`.

---

### Option A: One-Click Startup (Recommended)

Double-click the provided launcher batch script:
```powershell
.\start_weldguard.bat
```
This automatically launches both the FastAPI backend and Vite frontend in parallel and opens `http://localhost:5173` in your default browser.

---

### Option B: Manual Startup

#### Step 1: Start the FastAPI Backend
Open a PowerShell terminal in the project root:
```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend will initialize the SQLite database (`backend/weldguard.db`) and be available at:
* API Root: `http://127.0.0.1:8000`
* Interactive API Docs (Swagger): `http://127.0.0.1:8000/docs`

#### Step 2: Start the React Frontend
Open a second PowerShell terminal in the project root:
```powershell
cd frontend
npm install
npm run dev
```
Open your browser and navigate to:
```
http://localhost:5173
```

---

## 🧪 Running Automated Tests

Run the comprehensive pytest suite to verify all API endpoints, computer vision inference, severity calculations, and PDF generation:

```powershell
cd backend
pytest tests/ -v
```

---

## 🔬 Supported Defect Classes & Severity Logic

| Defect Class | Detection Metric | Defensible Severity Rubric |
| :--- | :--- | :--- |
| **Crack** | Aspect ratio $\ge 3.2$, dark crevice depth | **High** (ISO 5817 Level B Critical Tier 1: dynamic stress concentration risk) |
| **Burn-through** | Intensity void ($<50$ mean), area $>350$ px | **High** (Through-thickness void / loss of joint containment) |
| **Porosity** | Circularity $\ge 0.40$, bounded dark pits | Area ratio $<2\%$ **Low**, $2\%-8\%$ **Medium**, $>8\%$ **High** |
| **Incomplete Penetration** | Elongated joint-axis depression | Span $>35\%$ **High**, $\le 35\%$ **Medium** |
| **Underfill** | Bead concavity below parent metal | **Medium** |
| **Weld Discontinuity** | Irregular boundary contrast anomaly | Area ratio $>5\%$ **Medium**, $\le 5\%$ **Low** |
| **Good Weld (No Defect)** | Low gradient, uniform ripples | **Nominal / None** |

---

## 🛡️ Engineering & Legal Disclaimer

*WeldGuard AI is an automated decision-support prototype. Optical visual analysis inspects visible top surface features only and cannot guarantee internal volumetric integrity without supplementary NDT (radiographic or ultrasonic) validation. WeldGuard AI does not interface with or alter physical machinery controls.*