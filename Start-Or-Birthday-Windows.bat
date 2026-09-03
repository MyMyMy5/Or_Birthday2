@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\bootstrap-windows.ps1"
set "OR_BIRTHDAY_EXIT=%ERRORLEVEL%"

if not "%OR_BIRTHDAY_EXIT%"=="0" (
    echo.
    echo Or Birthday could not start. Read the message above for details.
    echo.
    pause
)

exit /b %OR_BIRTHDAY_EXIT%
