import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "WeldGuard" in data["service"]

def test_list_models():
    response = client.get("/api/models")
    assert response.status_code == 200
    models = response.json()
    assert len(models) >= 1
    assert "Porosity" in models[0]["supported_classes"]
    assert "Crack" in models[0]["supported_classes"]

def test_seed_demo_and_dashboard():
    # Seed demo inspections
    seed_resp = client.post("/api/inspections/seed-demo")
    assert seed_resp.status_code == 200
    seed_data = seed_resp.json()
    assert len(seed_data["seeded_ids"]) >= 1

    # Check dashboard stats reflect database records
    dash_resp = client.get("/api/dashboard")
    assert dash_resp.status_code == 200
    dash_data = dash_resp.json()
    assert dash_data["total_inspections"] >= len(seed_data["seeded_ids"])
    assert dash_data["has_demo_data"] is True
    assert len(dash_data["recent_inspections"]) >= 1

def test_image_inspection_sample_crack():
    response = client.post(
        "/api/inspections/image",
        data={
            "sample_key": "crack",
            "component_id": "TEST-CRACK-SPECIMEN-01",
            "operator_name": "Test Runner",
            "material": "Inconel 718"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["defect_detected"] is True
    assert data["predicted_class"] == "Crack"
    assert data["severity"] == "High"
    assert len(data["defect_boxes"]) > 0
    assert data["recommendations"] is not None
    assert len(data["recommendations"]["corrective_actions"]) > 0

    # Test human review update
    insp_id = data["id"]
    review_resp = client.patch(
        f"/api/inspections/{insp_id}/review",
        json={"review_status": "Approved", "review_notes": "Manually verified by senior NDT tech."}
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["review_status"] == "Approved"

    # Test PDF download
    pdf_resp = client.get(f"/api/reports/{insp_id}/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 1000

def test_image_inspection_sample_good_weld():
    response = client.post(
        "/api/inspections/image",
        data={
            "sample_key": "good_weld",
            "component_id": "TEST-GOOD-SPECIMEN-02",
            "operator_name": "Test Runner"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["defect_detected"] is False
    assert data["predicted_class"] == "Good Weld (No Defect)"
    assert data["severity"] is None

def test_alerts_workflow():
    alerts_resp = client.get("/api/alerts?status=Open")
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    if alerts:
        first_id = alerts[0]["id"]
        patch_resp = client.patch(f"/api/alerts/{first_id}", json={"status": "Resolved"})
        assert patch_resp.status_code == 200
        assert patch_resp.json()["status"] == "Resolved"

def test_analytics():
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "defect_class_counts" in data
    assert "correlation_disclaimer" in data

def test_csv_export():
    response = client.get("/api/reports/export/csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert b"component_id" in response.content

def test_invalid_file_upload():
    fake_file = io.BytesIO(b"This is an invalid file content.")
    response = client.post(
        "/api/inspections/image",
        files={"file": ("malicious.exe", fake_file, "application/octet-stream")}
    )
    assert response.status_code == 400
