#!/usr/bin/env python3
"""Build the single-file site.

Reads source/index.html, swaps every 'images/<name>.webp' path for an embedded
copy of that image, and writes ../index.html — one file you can upload on its own.

    python3 build.py
"""
import base64
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "index.html"
OUT = HERE.parent / "index.html"
MIME = {".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}


def inline(match):
    path = HERE / match.group(1)
    if not path.exists():
        raise SystemExit(f"missing image: {path}")
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"'data:{MIME[path.suffix.lower()]};base64,{data}'"


html = SRC.read_text(encoding="utf-8")
built, count = re.subn(r"'(images/[\w.-]+\.(?:webp|jpe?g|png))'", inline, html)
OUT.write_text(built, encoding="utf-8")
print(f"embedded {count} images -> {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")
