@echo off
setlocal

cd /d "%~dp0\..\.."

echo [AntGravity] backend dev server starting on http://localhost:8001
python scripts\dev\run_backend.py
