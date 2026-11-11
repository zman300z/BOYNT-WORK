#!/usr/bin/env python3
"""Make an all-in-one copy of the site: website/index.html with every photo
from website/images/ embedded, written to single-file/index.html.

Only needed if your host can take just one file. The normal site is the
website/ folder (index.html + images/), which loads faster.

    python3 tools/build-single-file.py
"""
import base64, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'website' / 'index.html').read_text(encoding='utf-8')

def embed(m):
    data = (root / 'website' / m.group(1)).read_bytes()
    return "'data:image/webp;base64," + base64.b64encode(data).decode() + "'"

html, n = re.subn(r"'(images/[\w-]+\.webp)'", embed, html)
html = re.sub(r'<link rel="preload" as="image"[^>]*>\n', '', html)
out = root / 'single-file' / 'index.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print('embedded %d photos -> %s (%d KB)' % (n, out, out.stat().st_size // 1024))
