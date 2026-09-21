# WeldGuard AI - Frontend Startup Script
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   WeldGuard AI - React & Vite UI Dashboard   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path "$ScriptDir\frontend"

Write-Host "Starting Vite Development Server..." -ForegroundColor Green
npm run dev
