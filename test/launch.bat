@echo off
echo ========================================
echo   Suspense Mystery: Hundred Years Cycle
echo   Game Launcher
echo ========================================
echo.

echo Checking Python...
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python found
    goto start_server
)

python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Python3 found
    set PYTHON_CMD=python3
    goto start_server
)

echo [ERROR] Python not found
echo Please install Python 3.x from:
echo https://www.python.org/downloads/
echo Remember to check "Add Python to PATH"
echo.
pause
exit /b 1

:start_server
if not defined PYTHON_CMD set PYTHON_CMD=python

echo.
echo Starting game server...
echo Game URL: http://localhost:8000
echo Press Ctrl+C to stop server
echo.

%PYTHON_CMD% start_server.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server failed to start
    echo Possible reasons:
    echo   - Port 8000 is in use
    echo   - Missing Python libraries
    echo   - File permission issues
    echo.
    echo Solutions:
    echo   1. Change port in start_server.py
    echo   2. Install dependencies: %PYTHON_CMD% -m pip install requests
    echo.
    pause
    exit /b 1
)