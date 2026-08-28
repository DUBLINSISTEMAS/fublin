@echo off
chcp 65001 >nul
title Relacionador - Desinstalar
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0desinstalar.ps1"
echo.
pause
