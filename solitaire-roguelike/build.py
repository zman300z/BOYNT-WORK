#!/usr/bin/env python3
"""Bundle PILEDRIVER into one self-contained HTML file.

Usage:  python3 build.py
Writes: piledriver-standalone.html  (open it in any browser, no server needed)
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
JS_ORDER = ['icons', 'data', 'engine', 'score', 'game', 'audio', 'ui', 'overlays', 'main']
OUT = 'piledriver-standalone.html'


def read(*parts):
    with open(os.path.join(HERE, *parts), encoding='utf-8') as f:
        return f.read()


def main():
    html = read('index.html')
    css = read('css', 'style.css')

    blocks = []
    for name in JS_ORDER:
        src = read('js', '%s.js' % name)
        if '</script' in src.lower():
            raise SystemExit('js/%s.js contains a closing script tag; cannot inline' % name)
        blocks.append('/* ===== js/%s.js ===== */\n%s' % (name, src))
    script = '<script>\n' + '\n'.join(blocks) + '\n</script>\n'

    html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + css + '\n</style>')
    html, n = re.subn(r'(?:<script src="js/[a-z]+\.js"></script>\s*)+', lambda m: script, html)
    if n != 1:
        raise SystemExit('expected exactly one run of script tags, found %d' % n)
    html = html.replace('<title>', '<!-- PILEDRIVER - single-file build. Save it anywhere and open it in any browser. -->\n<title>')

    with open(os.path.join(HERE, OUT), 'w', encoding='utf-8') as f:
        f.write(html)
    print('wrote %s (%d bytes)' % (OUT, len(html.encode('utf-8'))))


if __name__ == '__main__':
    main()
