// Dev helper: let the autopilot play a run headlessly and report what happened.
//   node tools/playtest.js [seed] [maxSimSeconds] [extraQuery]
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const seed = process.argv[2] || '1', maxT = +(process.argv[3] || 600), extra = process.argv[4] || '';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?mute&nofx&nopause&bot&seed=${seed}${extra ? '&' + extra : ''}`);
  await page.waitForTimeout(800);
  let total = 0, last = null;
  while (total < maxT) {
    let r;
    try { r = await page.evaluate((through) => G.game.simulate(30, { untilDead: true, through }), /through/.test(extra)); }
    catch (e) { console.log('EVALUATE FAILED: ' + e.message.split('\n')[0]); break; }
    total += r.simSeconds; last = r;
    console.log(`t=${String(Math.round(total)).padStart(4)}s ${r.state.padEnd(7)} z${r.zone} ${String(r.depth).padStart(5)}m hull ${r.hull}/${r.maxHull} lv${r.level} pearls ${r.pearls} scans ${r.scans} diss ${r.dissuaded} boss ${r.boss || '-'} menu ${r.menu || '-'} ents ${r.creatures}/${r.eshots} (${r.realMs}ms)`);
    if (r.state === 'dead' || (r.state === 'ending' && !/through/.test(extra)) || (/through/.test(extra) && r.state === 'title')) break;
    if (errors.length > 20) break;
  }
  const log = await page.evaluate(() => G.bot.log).catch(() => null);
  if (last) console.log('MODS: ' + last.mods.join(', '));
  if (log) {
    console.log('ZONES: ' + JSON.stringify(log.zones));
    console.log('HITS (' + log.hits.length + '): ' + log.hits.map(h => `z${h.z}@${h.t}s`).join(' '));
    if (log.events.length) console.log('EVENTS: ' + log.events.slice(-12).join(' | '));
  }
  const uniq = [...new Set(errors.filter(e => !/GPU stall/.test(e)))];
  console.log(uniq.length ? 'ERRORS (' + errors.length + ' total):\n' + uniq.slice(0, 8).join('\n').slice(0, 4000) : 'no errors');
  await browser.close();
})();
