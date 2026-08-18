@echo off
title RBX Server Manager
cd /d "%~dp0"

echo ===================================================
echo   Starting RBX Server Manager...
echo ===================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo Launching local server on http://localhost:3000...
  node serve.js
) else (
  echo Node not detected. Opening index.html directly...
  start "" "%~dp0index.html"
)
