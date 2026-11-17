// Build: bundle the game into one self-contained HTML file.
//   node tools/build.js [fragmentOut]
// Writes dist/undersong.html (a complete page: double-click to play, works offline).
// With fragmentOut, also writes the same game as a body fragment (title + style + markup + script, no
// <html>/<head>/<body>) for hosts that wrap pages in their own document skeleton.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const EXCLUDE = new Set(['js/bot.js']);          // the playtest autopilot stays out of the shipped game

const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]).filter(s => !EXCLUDE.has(s));
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1].trim());
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8').trim();
const stage = html.match(/<div id="stage">[\s\S]*?<\/div><\/div>|<div id="stage">[\s\S]*?<\/div>\s*\n/);
if (!stage) throw new Error('could not find the #stage markup in index.html');

// a literal "</script" inside the code would end the inline <script> early
const safe = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
let js = '';
for (const s of scripts) js += `\n/* ---- ${s} ---- */\n` + fs.readFileSync(path.join(root, s), 'utf8');
js = safe(js);

const markup = stage[0].trim();
const head = '<title>Undersong</title>\n<meta name="description" content="A small survey probe dives five zones of ocean to find out what is singing at the bottom.">';
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
<style>
${css}
</style>
</head>
<body>
${markup}
<script>
${safe(inline.join('\n'))}
</script>
<script>${js}
</script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'undersong.html');
fs.writeFileSync(out, page);

const fragOut = process.argv[2];
if (fragOut) {
  const frag = `${head}
<style>
${css}
</style>
${markup}
<script>
${safe(inline.join('\n'))}
</script>
<script>${js}
</script>
`;
  fs.writeFileSync(fragOut, frag);
}
const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`bundled ${scripts.length} scripts (${EXCLUDE.size} excluded) -> ${path.relative(process.cwd(), out)} ${kb(Buffer.byteLength(page))}` + (fragOut ? `, fragment ${kb(fs.statSync(fragOut).size)}` : ''));
