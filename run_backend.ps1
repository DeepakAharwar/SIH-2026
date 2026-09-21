# WeldGuard AI - Backend Startup Script
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   WeldGuard AI - FastAPI Inference Backend   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path "$ScriptDir\backend"

Write-Host "Checking and installing Python dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt --quiet

Write-Host "Starting Uvicorn ASGI server on http://127.0.0.1:8000 ..." -ForegroundColor Green
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
