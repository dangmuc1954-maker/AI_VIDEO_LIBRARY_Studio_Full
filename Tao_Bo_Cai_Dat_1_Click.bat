@echo off
chcp 65001 >nul
title AI VIDEO LIBRARY - TAO BO CAI DAT 1-CLICK
echo ======================================================================
echo 🚀 DANG TU DONG DONG BO VA TAO BO CAI DAT (WINDOWS EXE & MAC UNIVERSAL) 🚀
echo ======================================================================
echo.

cd /d "%~dp0"

echo [*] Buoc 1: Dong bo ma nguon sach sang thu muc dist...
node scripts/sync_dist.cjs
if %errorlevel% neq 0 (
    echo.
    echo ❌ Loi khi dong bo dist!
    pause
    exit /b %errorlevel%
)

echo.
echo [*] Buoc 2: Nen va bien dich bo cai dat Windows Setup EXE & Mac Universal...
node scripts/create_zip_and_installer.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ Loi khi bien dich!
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================================
echo 🎉 HOAN TAT 100%! BO CAI DAT DA DUOC TAO SAN TRONG THU MUC dist/ 🎉
echo 👉 Windows EXE : dist\AI_VIDEO_LIBRARY_Setup_v3.0.exe
echo 👉 Mac ZIP     : dist\AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip
echo ======================================================================
echo.
pause
