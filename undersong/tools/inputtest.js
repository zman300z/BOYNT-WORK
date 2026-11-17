// Dev helper: drive the game with real mouse and keyboard events, the way a person would.
//   node tools/inputtest.js [outdir]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '.';
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [], log = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const step = (name, v) => { log.push(name + ': ' + JSON.stringify(v)); };
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?nofx&seed=7');
  await p.waitForTimeout(1500);
  step('screen at load', await p.evaluate(() => G.menu.top() && G.menu.top().id));
  await p.mouse.move(640, 360); await p.mouse.down(); await p.mouse.up();          // splash: click to begin
  await p.waitForTimeout(1200);
  step('after click', await p.evaluate(() => ({ menu: G.menu.top() && G.menu.top().id, audio: G.audio.ready, music: G.music.mode })));
  await p.mouse.move(140, 335); await p.waitForTimeout(250); await p.mouse.down(); await p.mouse.up();   // DIVE
  await p.waitForTimeout(1500);
  const s0 = await p.evaluate(() => ({ state: G.game.state, x: G.player.x, y: G.player.y }));
  step('after DIVE', s0);
  await p.keyboard.down('d'); await p.waitForTimeout(900); await p.keyboard.up('d');
  await p.keyboard.down('s'); await p.waitForTimeout(600); await p.keyboard.up('s');
  const s1 = await p.evaluate(() => ({ x: Math.round(G.player.x), y: Math.round(G.player.y) }));
  step('moved by', { dx: Math.round(s1.x - s0.x), dy: Math.round(s1.y - s0.y) });
  await p.mouse.move(900, 500); await p.waitForTimeout(100);
  const aim = await p.evaluate(() => ({ mx: Math.round(G.input.mouse.x), my: Math.round(G.input.mouse.y), aim: +G.player.aim.toFixed(2) }));
  step('mouse maps to', aim);
  await p.mouse.down(); await p.waitForTimeout(700);
  step('shots while held', await p.evaluate(() => G.story.shotsFired));
  await p.mouse.up();
  await p.keyboard.press('Space'); await p.waitForTimeout(80);
  step('dashing', await p.evaluate(() => G.player.dashT > 0 || G.player.dashCharge < 1));
  await p.keyboard.press('q'); await p.waitForTimeout(150);
  step('sonar pings', await p.evaluate(() => G.sonar.pings.length));
  await p.keyboard.down('Tab'); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(out, 'in_map.png') });
  step('chart open', await p.evaluate(() => +G.map.k.toFixed(2)));
  await p.keyboard.up('Tab');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  step('paused', await p.evaluate(() => G.menu.top() && G.menu.top().id));
  await p.screenshot({ path: path.join(out, 'in_pause.png') });
  await p.mouse.move(200, 290); await p.waitForTimeout(250); await p.mouse.down(); await p.mouse.up();   // RESUME
  await p.waitForTimeout(500);
  step('resumed', await p.evaluate(() => ({ menu: G.menu.top() ? G.menu.top().id : null, state: G.game.state })));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(150);
  step('keyboard focus', await p.evaluate(() => G.im.focus));
  await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  step('opened with Enter', await p.evaluate(() => G.menu.top() && G.menu.top().id));
  await p.screenshot({ path: path.join(out, 'in_settings.png') });
  console.log(log.join('\n'));
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors');
  await b.close();
})();
