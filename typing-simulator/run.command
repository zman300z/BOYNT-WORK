#!/bin/bash
# Double-click this on macOS to launch Ghost Typer.
cd "$(dirname "$0")"
python3 -c "import pynput" 2>/dev/null || python3 -m pip install --quiet -r requirements.txt
python3 app.py
