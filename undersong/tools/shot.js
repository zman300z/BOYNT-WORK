// Dev helper: load the game in headless Chromium, optionally run code in the page, save a screenshot.
//   node tools/shot.js "zone=2&seed=5&debug" out.png [--eval "<js>"] [--wait 1500] [--size 1280x720] [--after 400]
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const query = args[0] || '';
  const out = args[1] || 'shot.png';
  let evalCode = null, wait = 1200, after = 400, w = 1280, h = 720;
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--eval') evalCode = args[++i];
    else if (args[i] === '--wait') wait = +args[++i];
    else if (args[i] === '--after') after = +args[++i];
    else if (args[i] === '--size') [w, h] = args[++i].split('x').map(Number);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text());
    else if (process.env.VERBOSE) console.log('[page]', m.text());
  });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '')));
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + (query ? '?' + query : ''));
  await page.waitForTimeout(wait);
  if (evalCode) {
    const r = await page.evaluate(evalCode);
    if (r !== undefined) console.log('eval:', JSON.stringify(r));
    await page.waitForTimeout(after);
  }
  await page.screenshot({ path: out });
  const uniq = [...new Set(errors.filter(e => !/GPU stall due to ReadPixels/.test(e)))];
  console.log(uniq.length ? 'ERRORS (' + errors.length + ' total, ' + uniq.length + ' unique):\n' + uniq.slice(0, 8).join('\n').slice(0, 3000) : 'no errors');
  await browser.close();
})();
