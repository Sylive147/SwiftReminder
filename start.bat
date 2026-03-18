@echo off
setlocal

set "HOST=127.0.0.1"
set "PORT=8000"

if not "%~1"=="" set "HOST=%~1"
if not "%~2"=="" set "PORT=%~2"

cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
  set "PYTHON_CMD=python"
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    set "PYTHON_CMD=py -3"
  ) else (
    echo [ERROR] Python 3 not found. Please install Python and add it to PATH.
    pause
    exit /b 1
  )
)

echo Starting local server...
echo Project Dir: %cd%
echo URL: http://%HOST%:%PORT%/
echo Press Ctrl+C to stop.
echo.

%PYTHON_CMD% -m card_server --host %HOST% --port %PORT% --dir .
endlocal
