@echo off
TITLE WeldGuard AI - Launcher
echo ========================================================
echo         WELDGUARD AI - LASER WELDING INSPECTION        
echo        100%% Software-Only Prototype Startup Script     
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "WeldGuard Backend" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0run_backend.ps1"

echo [2/3] Waiting for backend initialization...
timeout /t 3 /nobreak >nul

echo [3/3] Starting Vite Frontend on http://localhost:5173 ...
start "WeldGuard Frontend" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0run_frontend.ps1"

timeout /t 4 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================================
echo Both backend and frontend services are now running!
echo Access the application at: http://localhost:5173
echo API Docs (Swagger):        http://127.0.0.1:8000/docs
echo ========================================================
pause
