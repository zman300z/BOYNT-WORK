// Dev helper: time every draw/update stage while the autopilot plays, per zone.
//   node tools/profile.js [zones=0,1,2,3,4] [seconds=6]
// Headless Chromium renders WebGL in software, so absolute numbers run high; compare stages.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const zones = (process.argv[2] || '0,1,2,3,4').split(',').map(Number), secs = +(process.argv[3] || 6);
  const b = await chromium.launch();
  for (const z of zones) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    await p.goto('file://' + path.resolve(__dirname, '..', 'index.html') + `?zone=${z}&mute&nopause&bot&seed=7`);
    await p.waitForTimeout(1500);
    await p.evaluate(() => { G.game.simulate(25); });
    const r = await p.evaluate(async (secs) => {
      const acc = {}, names = [
        'backdrop.draw', 'decor.drawBack', 'world.drawWalls', 'decor.draw', 'props.draw', 'pickups.draw', 'creatures.draw', 'player.draw', 'particles.drawLit',
        'lights.render', 'world.drawVeins', 'lights.drawBeam', 'decor.drawGlow', 'props.drawGlow', 'pickups.drawGlow', 'creatures.drawGlow', 'player.drawGlow',
        'particles.drawGlow', 'sonar.draw', 'hazards.draw', 'shots.draw', 'eshots.draw', 'backdrop.drawFront', 'post.render', 'hud.draw', 'menu.draw',
        'creatures.update', 'props.update', 'decor.update', 'particles.update', 'world.update', 'player.update', 'shots.update', 'eshots.update', 'scan.update'];
      for (const n of names) {
        const [o, f] = n.split('.'), obj = G[o]; if (!obj || !obj[f]) continue;
        const fn = obj[f];
        obj[f] = function () { const t0 = performance.now(); const r = fn.apply(this, arguments); acc[n] = (acc[n] || 0) + performance.now() - t0; return r; };
      }
      const cf = G.computeFlow; G.computeFlow = function () { const t0 = performance.now(); cf.apply(this, arguments); acc.computeFlow = (acc.computeFlow || 0) + performance.now() - t0; };
      const f0 = G.frame, t0 = performance.now();
      await new Promise(res => setTimeout(res, secs * 1000));
      const frames = G.frame - f0, wall = performance.now() - t0;
      const per = Object.entries(acc).map(([k, v]) => [k, v / frames]).sort((a, b) => b[1] - a[1]);
      return { fps: +(frames / wall * 1000).toFixed(1), frames, upd: +G.game.ms.upd.toFixed(2), draw: +G.game.ms.draw.toFixed(2), creatures: G.ents.creatures.length, particles: G.particles.count(), decorVis: G.decor.vis.length + G.decor.visBack.length,
        top: per.slice(0, 10).map(([k, v]) => k + ' ' + v.toFixed(2)).join(' | ') };
    }, secs);
    console.log(`zone ${z}: ${r.fps} fps  upd ${r.upd}ms  draw ${r.draw}ms  ents ${r.creatures}  parts ${r.particles}  decor ${r.decorVis}\n   ${r.top}`);
    await p.close();
  }
  await b.close();
})();
