@echo off
REM Double-click this on Windows to launch Ghost Typer.
cd /d "%~dp0"
where py >nul 2>nul && (set PY=py) || (set PY=python)
%PY% -c "import pynput" 2>nul || %PY% -m pip install --quiet -r requirements.txt
%PY% app.py
if errorlevel 1 pause
