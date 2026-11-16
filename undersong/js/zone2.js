'use strict';
/* UNDERSONG — the Twilight (mesopelagic, 200–1,000 m). The sun gives out on the way down.
   Sea pens that light up as you pass, glass sponges with tenants, lanternfish, comb jellies,
   a whale you only ever hear; then jellies in blooms, sea nettles, squid with ink, hatchetfish,
   a siphonophore like a string of lamps — and at the bottom, THE BLOOM. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, exp, PI, hypot, floor, pow } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit, ai = G.ai;
  const pick = arr => arr[(G.rand() * arr.length) | 0];

  // ================================================================= scenery
  // sea pen: a feather that answers a touch with light
  G.defDecor('seapen', {
    r: 46, reactR: 104, reactIn: 5, reactOut: 0.7,
    init(d) { d.h = G.rr(34, 52) * d.s; d.col = pick([['#ffb08a', '#ffe0c8'], ['#ff8aa0', '#ffd0d8'], ['#f0d08a', '#fff0c8']]); },
    draw(d, ctx) {
      const nx = d.nx, ny = d.ny, tx = -ny, ty = nx, h = d.h, sw = sin(d.t * 1.2 + d.ph) * 5;
      const ex = d.x + nx * h + tx * sw, ey = d.y + ny * h + ty * sw, mx = d.x + nx * h * 0.5, my = d.y + ny * h * 0.5;
      ctx.lineCap = 'round'; ctx.strokeStyle = d.col[0]; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      ctx.lineWidth = 1.7; ctx.strokeStyle = d.col[1];
      for (let k = 2; k <= 9; k++) {
        const u = k / 10, a = 1 - u, bx = a * a * d.x + 2 * a * u * mx + u * u * ex, by = a * a * d.y + 2 * a * u * my + u * u * ey, L = (4 + sin(u * PI) * 11) * d.s;
        for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + tx * s * L + nx * L * 0.55, by + ty * s * L + ny * L * 0.55); ctx.stroke(); }
      }
    },
    glow(d, ctx) {
      if (d.react < 0.03) return;
      const nx = d.nx, ny = d.ny, h = d.h;
      for (let k = 0; k < 5; k++) { const u = (k / 5 + d.t * 0.6) % 1; G.drawGlow(ctx, d.x + nx * h * u, d.y + ny * h * u, 9 + sin(u * PI) * 9, '#7dffd8', d.react * (0.3 + 0.5 * sin(u * PI))); }
    },
    light(d) { if (d.react > 0.05) G.lights.add(d.x + d.nx * d.h * 0.6, d.y + d.ny * d.h * 0.6, 150, '#7dffd8', d.react * 0.55); },
  });

  // Venus' flower basket: a glass house with two shrimp who moved in young and can never leave
  G.defDecor('sponge', {
    r: 50,
    init(d) { d.h = G.rr(44, 60) * d.s; d.w = G.rr(8, 11) * d.s; },
    draw(d, ctx) {
      const h = d.h, w = d.w, t = d.t;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang + PI / 2 + sin(t * 0.7 + d.ph) * 0.03);
      ctx.fillStyle = 'rgba(235,246,255,0.2)';
      ctx.beginPath(); ctx.moveTo(-w * 0.6, 0); ctx.quadraticCurveTo(-w * 1.3, -h * 0.6, -w, -h); ctx.lineTo(w, -h); ctx.quadraticCurveTo(w * 1.3, -h * 0.6, w * 0.6, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(240,250,255,0.62)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const y = -h * i / 8, ww = w * (0.6 + 0.5 * sin((i / 8) * PI * 0.9 + 0.3)); ctx.moveTo(-ww, y); ctx.lineTo(ww, y); }
      for (let i = -3; i <= 3; i++) { ctx.moveTo(i * w * 0.2, 0); ctx.quadraticCurveTo(i * w * 0.42, -h * 0.6, i * w * 0.32, -h); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, -h, w, 2.6, 0, 0, TAU); ctx.stroke();
      // the tenants
      for (let s = -1; s <= 1; s += 2) {
        const sx = s * w * 0.3 + sin(t * 0.9 + s) * 1.6, sy = -h * (0.42 + s * 0.14) + cos(t * 1.1 + s * 2) * 2.2;
        ctx.fillStyle = '#ffb4a0'; ctx.beginPath(); ctx.ellipse(sx, sy, 3.6, 1.7, s * 0.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,210,0.9)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(sx + 3, sy); ctx.lineTo(sx + 7, sy - 3 + sin(t * 4 + s)); ctx.stroke();
      }
      ctx.restore();
    },
    glow(d, ctx) { G.drawGlow(ctx, d.x + d.nx * d.h * 0.5, d.y + d.ny * d.h * 0.5, d.h * 0.7, '#dff2ff', 0.1); },
  });

  // sea whip: one long line, leaning with the water and away from you
  G.defDecor('whip', {
    r: 60, reactR: 70, reactIn: 6, reactOut: 1.2,
    init(d) { d.h = G.rr(60, 110) * d.s; d.col = pick(['#ff7a4a', '#ffc04a', '#ff5a7a', '#c88aff']); d.side = 1; },
    update(d, dt, p) { if (d.react > 0.05) d.side = ((p.x - d.x) * -d.ny + (p.y - d.y) * d.nx) > 0 ? -1 : 1; },
    draw(d, ctx) {
      const nx = d.nx, ny = d.ny, tx = -ny, ty = nx, h = d.h, bend = sin(d.t * 0.9 + d.ph) * 12 + d.react * d.side * 26;
      const ex = d.x + nx * h + tx * bend, ey = d.y + ny * h + ty * bend, mx = d.x + nx * h * 0.55 + tx * bend * 0.2, my = d.y + ny * h * 0.55 + ty * bend * 0.2;
      ctx.lineCap = 'round'; ctx.strokeStyle = d.col; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let k = 1; k < 9; k++) { const u = k / 9, a = 1 - u; ctx.beginPath(); ctx.arc(a * a * d.x + 2 * a * u * mx + u * u * ex, a * a * d.y + 2 * a * u * my + u * u * ey, 1.1, 0, TAU); ctx.fill(); }
    },
  });

  // ================================================================= passive life
  // comb jelly: the rainbow is not light it makes, it is light it combs
  G.defCreature('combjelly', {
    r: 13, hp: 8, passive: true, color: '#bfe8ff', scanXp: 7, leash: 200, fleeStyle: 'drift', fleeTime: 1.3, showStill: true, showR: 26,
    init(c) { c.rot = G.rr(-0.6, 0.6); },
    think(c, dt) { ai.wander(c, 14, dt); c.rot += sin(c.t * 0.4 + c.ph) * 0.2 * dt; },
    draw(c, ctx) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      ctx.globalAlpha = c.alpha * 0.3; ctx.fillStyle = '#d8f0ff'; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 14, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = c.alpha * 0.6; ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 14, 0, 0, TAU); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const t = c.t, ca = cos(c.rot), sa = sin(c.rot);
      for (let row = -1.5; row <= 1.5; row += 1) for (let i = 0; i < 8; i++) {
        const u = i / 7 - 0.5, lx = row * 4.6 * cos(u * 2.4), ly = u * 24;
        ctx.globalAlpha = c.alpha * 0.9; ctx.fillStyle = G.hsl((t * 260 + i * 42 + row * 70) % 360, 100, 66);
        ctx.fillRect(c.x + lx * ca - ly * sa - 1.3, c.y + lx * sa + ly * ca - 1, 2.6, 2);
      }
      ctx.globalAlpha = 1;
      G.drawGlow(ctx, c.x, c.y, 20, '#bfe8ff', 0.16 * c.alpha);
    },
  });

  G.on('whale', () => {
    if (!G.zone || G.zone.idx !== 1 || G.game.state !== 'play') return;
    if (G.meta.catalog('whale')) { G.hud.toast('Humpback Whale', 'Megaptera novaeangliae', { tag: 'HEARD', color: G.UI.GOLD, life: 5 }); G.sfx('newSpecies'); if (G.run) { G.run.scans++; G.run.fresh++; } }
  });

  // ================================================================= hostiles
  // pulse-swimmer shared by the two jellies: squeeze, coast, squeeze
  function pulseSwim(c, dt, p, period, kick, range) {
    const aggro = ai.notice(c, p, range, dt);
    c.pt += dt;
    const want = aggro ? ai.toPlayer(c, p) : c.wa;
    c.dirA = G.angDamp(c.dirA, want, 1.4, dt);
    if (!aggro) c.wa += (G.noise2(c.t * 0.3, c.ph * 9, 3) - 0.5) * 2 * dt;
    if (c.pt >= period) { c.pt -= period; c.vx += cos(c.dirA) * kick; c.vy += sin(c.dirA) * kick; if (G.cam.sees(c.x, c.y, 0)) G.sfx('pulse', { x: c.x, y: c.y }); }
    ai.brake(c, 1.5, dt);
    const d = ai.avoid(c, c.r + 26, 500, dt);
    if (d < c.r + 12 && !aggro) c.wa = atan2(G.hitN.y, G.hitN.x);
    c.sq = max(0, 1 - c.pt / (period * 0.35));      // 1 right at the squeeze
    return aggro;
  }

  G.defCreature('jelly', {
    r: 15, hp: 26, hostile: true, dmg: 1, xp: 2, pearl: 0.05, mass: 0.6, color: '#bfe6ff', fleeStyle: 'drift', fleeTime: 1.2, leash: 200, showStill: true, showR: 30,
    init(c) { c.pt = G.rr(0, 1.7); c.dirA = -PI / 2 + G.rr(-0.6, 0.6); c.sq = 0; c.wa = c.dirA; },
    show(c, dt) { c.pt = (c.pt + dt) % 1.7; c.sq = max(0, 1 - c.pt / 0.6); c.dirA = -PI / 2; },
    think(c, dt, p) { pulseSwim(c, dt, p, 1.7, 92, 290); },
    draw(c, ctx) {
      const A = c.alpha, r = c.r, sq = c.sq, t = c.t;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.dirA + PI / 2);
      const w = r * (1.06 - sq * 0.2), h = r * (0.95 + sq * 0.28);
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(215,236,255,0.7)'; ctx.lineWidth = 1; ctx.globalAlpha = A;
      ctx.beginPath();
      for (let i = 0; i < 11; i++) { const u = i / 10 - 0.5, x = u * w * 1.9; ctx.moveTo(x, 2); ctx.quadraticCurveTo(x + sin(t * 3 + i) * 3, 8 + sq * 3, x + sin(t * 2.2 + i * 1.7) * 4, 12 + (1 - sq) * 5); }
      ctx.stroke();
      const g = ctx.createRadialGradient(0, -h * 0.4, 1, 0, 0, r * 1.25);
      g.addColorStop(0, 'rgba(255,255,255,0.8)'); g.addColorStop(0.6, 'rgba(190,226,255,0.52)'); g.addColorStop(1, 'rgba(150,196,255,0.3)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w, 2); ctx.bezierCurveTo(-w * 1.05, -h * 1.25, w * 1.05, -h * 1.25, w, 2); ctx.quadraticCurveTo(0, 6 - sq * 3, -w, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,170,220,0.85)'; ctx.lineWidth = 1.5;            // the four-leaf clover every moon jelly carries
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + 0.6; ctx.beginPath(); ctx.arc(cos(a) * 4.2, -h * 0.45 + sin(a) * 2.6, 2.7, a - 2, a + 2); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) { G.drawGlow(ctx, c.x, c.y, 24 + c.sq * 6, '#bfe6ff', (0.22 + c.sq * 0.14) * c.alpha); },
    light(c) { G.lights.add(c.x, c.y, 74, '#bfe6ff', 0.24); },
  });

  G.defCreature('nettle', {
    r: 22, hp: 80, hostile: true, dmg: 1, xp: 6, pearl: 0.2, mass: 1.7, color: '#ffc27a', fleeStyle: 'drift', fleeTime: 1.5, leash: 220, viewR: 200, showStill: true, showR: 60, showY: -30,
    init(c) {
      c.pt = G.rr(0, 2.2); c.dirA = -PI / 2 + G.rr(-0.5, 0.5); c.sq = 0; c.wa = c.dirA; c.cd = G.rr(1.5, 3);
      c.ropes = [];
      for (let i = 0; i < 4; i++) { const r = kit.rope(9, 11); kit.ropeSet(r, c.x, c.y, 0, 1); c.ropes.push(r); }
    },
    show(c, dt) { c.pt = (c.pt + dt) % 2.2; c.sq = max(0, 1 - c.pt / 0.75); c.dirA = -PI / 2; },
    think(c, dt, p) {
      const aggro = pulseSwim(c, dt, p, 2.2, 104, 390);
      c.cd -= dt;
      if (aggro && c.cd <= 0 && c.pd < 430 && ai.see(c, p, 430)) {
        c.cd = 3.4;
        for (let i = -1; i <= 1; i++) { const a = ai.toPlayer(c, p) + i * 0.7; G.eshots.fire(c.x, c.y, cos(a) * 96, sin(a) * 96, { r: 5, color: '#ffb070', life: 4.6, homing: 1.1, wob: 22 }); }
        G.sfx('spit', { x: c.x, y: c.y }); c.sq = 1;
      }
      if (c.pd < 190 && !p.dead) for (const r of c.ropes) if (kit.ropeNear(r, p.x, p.y, p.r + 3, 2)) { p.hurt(1, c.x, c.y); break; }
    },
    anim(c, dt) {
      const back = c.dirA + PI, k = pow(0.9, dt * 60);
      for (let i = 0; i < 4; i++) { const off = (i - 1.5) * 9, ax = c.x + cos(back) * 5 - sin(back) * off, ay = c.y + sin(back) * 5 + cos(back) * off; kit.ropeStep(c.ropes[i], ax, ay, dt, sin(c.t * 1.3 + i) * 26, 46, k); }
    },
    draw(c, ctx) {
      const A = c.alpha, r = c.r, sq = c.sq, t = c.t;
      for (const rp of c.ropes) kit.ropeDraw(ctx, rp, 2, 1, '#c8642a', A * 0.9);
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.dirA + PI / 2);
      const w = r * (1.05 - sq * 0.18), h = r * (1.0 + sq * 0.26);
      ctx.globalAlpha = A * 0.85; ctx.lineCap = 'round'; ctx.strokeStyle = '#ffd2a0'; ctx.lineWidth = 4;        // frilled mouth-arms
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5, 2); ctx.bezierCurveTo(i * 9 + sin(t * 2 + i) * 6, 16, i * 3 - sin(t * 1.6 + i) * 7, 30, i * 7 + sin(t * 1.9 + i * 2) * 6, 44); ctx.stroke(); }
      const g = ctx.createRadialGradient(0, -h * 0.5, 2, 0, 0, r * 1.25);
      g.addColorStop(0, 'rgba(255,236,196,0.94)'); g.addColorStop(0.6, 'rgba(240,160,74,0.84)'); g.addColorStop(1, 'rgba(176,84,34,0.74)');
      ctx.globalAlpha = A; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-w, 3); ctx.bezierCurveTo(-w * 1.08, -h * 1.3, w * 1.08, -h * 1.3, w, 3); ctx.quadraticCurveTo(0, 8 - sq * 4, -w, 3); ctx.fill();
      ctx.strokeStyle = 'rgba(130,52,20,0.6)'; ctx.lineWidth = 1.5;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.27, 2); ctx.quadraticCurveTo(i * w * 0.2, -h * 0.5, i * w * 0.07, -h * 0.9); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) { G.drawGlow(ctx, c.x, c.y, 36 + c.sq * 8, '#ffb070', (0.2 + c.sq * 0.16) * c.alpha); for (const r of c.ropes) G.drawGlow(ctx, r.x[r.n - 1], r.y[r.n - 1], 7, '#ffb070', 0.5 * c.alpha); },
    light(c) { G.lights.add(c.x, c.y, 110, '#ffc27a', 0.3); },
  });

  // Humboldt squid: ink first, then straight through it
  G.defCreature('squid', {
    r: 17, hp: 62, hostile: true, dmg: 1, xp: 6, pearl: 0.2, mass: 1.3, color: '#ff8a8a', leash: 240, showR: 46,
    init(c) { c.jet = G.rr(0, 0.9); c.cd = G.rr(1.5, 3); c.flick = 0; c.da = 0; c.orbit = G.rand() < 0.5 ? 1 : -1; c.arm = 0; },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 440, dt);
      c.cd -= dt; c.jet -= dt;
      if (c.st === 'idle') {
        if (aggro) {
          // hold a wary distance, sliding around the probe in spurts
          const a = atan2(c.y - p.y, c.x - p.x) + c.orbit * 0.8, tx = p.x + cos(a) * 300, ty = p.y + sin(a) * 300;
          if (c.jet <= 0) { c.jet = 0.85; const d = hypot(tx - c.x, ty - c.y) || 1; c.vx += (tx - c.x) / d * 190; c.vy += (ty - c.y) / d * 190; }
          ai.brake(c, 2, dt); ai.avoid(c, 40, 700, dt);
          ai.face(c, ai.toPlayer(c, p), 5, dt);
          if (c.cd <= 0 && c.pd < 470 && ai.see(c, p, 470)) {
            const a2 = ai.toPlayer(c, p);
            G.eshots.fire(c.x + cos(a2) * 18, c.y + sin(a2) * 18, cos(a2) * 270, sin(a2) * 270, {
              r: 8, color: '#5a3a8a', life: min(1.3, c.pd / 270), dmg: 0,
              onEnd(s) { for (let i = 0; i < 4; i++) G.particles.ink(s.x + G.rr(-22, 22), s.y + G.rr(-22, 22), G.rr(34, 56), G.rr(3, 4.2), G.rr(-16, 16), G.rr(-16, 16)); if (G.cam.sees(s.x, s.y, 0)) G.sfx('squelch', { x: s.x, y: s.y }); },
            });
            G.sfx('spit', { x: c.x, y: c.y });
            ai.set(c, 'flash'); G.sfx('telegraph', { x: c.x, y: c.y });
          }
        } else { ai.wander(c, 40, dt); ai.faceVel(c, 4, dt); }
      } else if (c.st === 'flash') {
        ai.brake(c, 4, dt); ai.face(c, ai.toPlayer(c, p), 9, dt);
        if (c.stT > 0.62) { c.da = c.face; ai.set(c, 'lunge'); G.sfx('whoosh', { x: c.x, y: c.y }); }
      } else if (c.st === 'lunge') {
        c.vx = cos(c.da) * 640; c.vy = sin(c.da) * 640;
        if (c.stT > 0.5 || G.sdf(c.x + cos(c.da) * 24, c.y + sin(c.da) * 24) < 5) { ai.set(c, 'rest'); c.cd = G.rr(2.6, 3.8); if (G.rand() < 0.5) c.orbit = -c.orbit; }
      } else { ai.brake(c, 3, dt); if (c.stT > 0.8) ai.set(c, 'idle'); }
      c.flick = c.st === 'flash' ? (sin(c.stT * 44) > 0 ? 1 : 0) : damp(c.flick, 0, 8, dt);
      c.arm += dt * (5 + hypot(c.vx, c.vy) * 0.03);
    },
    draw(c, ctx) {
      const A = c.alpha, a = c.face, t = c.t, body = G.mixCss('#b8323a', '#fff0ea', c.flick), dark = G.mixCss('#7a1e2a', '#e8c8c0', c.flick);
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(a); ctx.globalAlpha = A; ctx.lineCap = 'round';
      // arms lead, mantle trails (it is aimed at you)
      ctx.strokeStyle = dark; ctx.lineWidth = 2.6;
      for (let i = 0; i < 6; i++) { const u = (i - 2.5) * 0.24, w = sin(c.arm + i * 0.9) * 4; ctx.beginPath(); ctx.moveTo(8, u * 14); ctx.quadraticCurveTo(20, u * 26 + w, 30, u * 22 - w); ctx.stroke(); }
      ctx.lineWidth = 1.8;
      for (let s = -1; s <= 1; s += 2) { const w = sin(c.arm * 0.8 + s) * 5; ctx.beginPath(); ctx.moveTo(8, s * 3); ctx.quadraticCurveTo(26, s * 9 + w, 43, s * 4 - w); ctx.stroke(); ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(44, s * 4 - w, 4, 2.2, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = dark;
      for (let s = -1; s <= 1; s += 2) { ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-34, s * 15); ctx.lineTo(-10, s * 7); ctx.closePath(); ctx.fill(); }
      const g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, dark); g.addColorStop(0.45, body); g.addColorStop(1, G.mixCss(body, '#ffffff', 0.3));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(10, -7); ctx.quadraticCurveTo(-8, -12, -36, 0); ctx.quadraticCurveTo(-8, 12, 10, 7); ctx.quadraticCurveTo(14, 0, 10, -7); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
      kit.eye(ctx, c.x + cos(a) * 7 - sin(a) * 5 * (cos(a) >= 0 ? -1 : 1), c.y + sin(a) * 7 + cos(a) * 5 * (cos(a) >= 0 ? -1 : 1), 4.2, ai.toPlayer(c, G.player), { alpha: A, pupil: 0.6, dazed: c.stun > 0 });
    },
    glow(c, ctx) {
      if (c.st === 'flash') {
        G.drawGlow(ctx, c.x, c.y, 44, '#ff8a8a', 0.4 + 0.4 * c.flick);
        const u = min(1, c.stT / 0.62), a = c.face, d = G.raycast(c.x, c.y, cos(a), sin(a), 420);
        ctx.globalAlpha = 0.15 + 0.4 * u; ctx.strokeStyle = '#ffb0a0'; ctx.lineWidth = 1 + 2 * u; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -G.time * 90;
        ctx.beginPath(); ctx.moveTo(c.x + cos(a) * 20, c.y + sin(a) * 20); ctx.lineTo(c.x + cos(a) * d, c.y + sin(a) * d); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else G.drawGlow(ctx, c.x, c.y, 20, '#ff8a8a', 0.14 * c.alpha);
    },
  });

  // hatchetfish: a sliver of mirror with a row of lamps along its keel
  G.defCreature('hatchet', {
    r: 7, hp: 12, hostile: true, dmg: 1, xp: 1, mass: 0.4, color: '#dfeaf4', leash: 150, showR: 15,
    init(c) { c.atk = G.rr(1.5, 5); c.orb = G.rr(150, 215); c.dirn = G.rand() < 0.5 ? 1 : -1; c.swim = 0; },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 310, dt);
      if (!aggro) { ai.wander(c, 60, dt); ai.faceVel(c, 8, dt); return; }
      if (c.st === 'dive') {
        ai.seek(c, p.x, p.y, 345, 6, dt);
        if (c.stT > 0.85 || c.pd < 14) { ai.set(c, 'idle'); c.atk = G.rr(2.2, 5); }
      } else {
        const a = atan2(c.y - p.y, c.x - p.x) + c.dirn * 0.5;
        ai.seek(c, p.x + cos(a) * c.orb, p.y + sin(a) * c.orb, 210, 4, dt);
        c.atk -= dt;
        if (c.atk <= 0 && ai.see(c, p, 400)) { ai.set(c, 'dive'); if (G.rand() < 0.4) G.sfx('whoosh', { x: c.x, y: c.y }); }
      }
      ai.avoid(c, 18, 700, dt); ai.faceVel(c, 12, dt);
      c.swim += dt * 14;
    },
    draw(c, ctx) {
      const A = c.alpha, t = G.time, flip = cos(c.face) < 0 ? -1 : 1, shim = sin(t * 4 + c.ph * 5 + c.x * 0.03) > 0.55;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.face); ctx.scale(1, flip);
      ctx.globalAlpha = A; ctx.fillStyle = shim ? '#ffffff' : '#b9c8d8';
      ctx.beginPath(); ctx.moveTo(7, -2); ctx.lineTo(1, -6); ctx.lineTo(-5, -3.4); ctx.lineTo(-10 + sin(c.swim) * 1.5, -5); ctx.lineTo(-10 + sin(c.swim) * 1.5, 2); ctx.lineTo(-5, 0); ctx.lineTo(-1, 8); ctx.lineTo(5, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#12161e'; ctx.beginPath(); ctx.arc(3.4, -2.6, 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8f2ff'; ctx.beginPath(); ctx.arc(3.9, -3.1, 0.8, 0, TAU); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const ca = cos(c.face), sa = sin(c.face), fl = ca < 0 ? -1 : 1;
      for (let i = 0; i < 3; i++) { const lx = -3 + i * 3.2, ly = 5.5 * fl; G.drawGlow(ctx, c.x + lx * ca - ly * sa, c.y + lx * sa + ly * ca, 4.6, '#7fd0ff', 0.85 * c.alpha); }
      if (c.st === 'dive') G.drawGlow(ctx, c.x, c.y, 13, '#ffd0c0', 0.5);
    },
  });

  // giant siphonophore: not one animal but a colony of them, in a line, sharing a stomach
  G.defCreature('siphon', {
    r: 12, hp: 84, hostile: true, dmg: 1, xp: 8, pearl: 0.26, mass: 2, color: '#bfe0ff', leash: 280, viewR: 300, fleeStyle: 'drift', fleeTime: 1.6, showR: 110,
    init(c) { c.ch = kit.chain(c.specimen ? 11 : 17, 15); kit.chainSet(c.ch, c.x, c.y, c.face); c.turn = G.rand() < 0.5 ? 1 : -1; },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 400, dt);
      if (aggro) {
        // close in on a curve, so the tail swings round behind
        const a = ai.toPlayer(c, p) + c.turn * (c.pd < 210 ? 1.25 : 0.5);
        ai.steer(c, cos(a), sin(a), 66, 2, dt); ai.avoid(c, 30, 600, dt);
      } else ai.wander(c, 34, dt);
      ai.faceVel(c, 3, dt);
      if (c.pd < 320 && !p.dead) { const X = c.ch.x, Y = c.ch.y, rr = (p.r + 7) * (p.r + 7); for (let i = 2; i < c.ch.n; i++) if ((X[i] - p.x) * (X[i] - p.x) + (Y[i] - p.y) * (Y[i] - p.y) < rr) { p.hurt(1, X[i], Y[i]); break; } }
    },
    anim(c, dt) { kit.chainFollow(c.ch, c.x, c.y, c.face, 0.5); },
    draw(c, ctx) {
      const A = c.alpha, ch = c.ch, X = ch.x, Y = ch.y, t = c.t;
      ctx.globalAlpha = A * 0.7; ctx.strokeStyle = '#dfefff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X[0], Y[0]); for (let i = 1; i < ch.n; i++) ctx.lineTo(X[i], Y[i]); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,170,110,0.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let i = 2; i < ch.n; i++) { const sw = sin(t * 2 + i) * 3; ctx.moveTo(X[i], Y[i]); ctx.lineTo(X[i] + sw, Y[i] + 11); } ctx.stroke();
      for (let i = 1; i < ch.n; i++) { ctx.globalAlpha = A * 0.5; ctx.fillStyle = '#e4f2ff'; ctx.beginPath(); ctx.arc(X[i], Y[i], 4.4 - i * 0.1, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = A * 0.72; ctx.fillStyle = '#f0f8ff'; ctx.beginPath(); ctx.ellipse(c.x, c.y, 12, 9, c.face, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const ch = c.ch, t = c.t;
      for (let i = 0; i < ch.n; i++) G.drawGlow(ctx, ch.x[i], ch.y[i], i ? 9 : 17, i % 3 === 2 ? '#ffb070' : '#bfe0ff', (0.3 + 0.35 * max(0, sin(t * 3 - i * 0.6))) * c.alpha);
    },
    light(c) { const ch = c.ch; for (let i = 0; i < ch.n; i += 5) G.lights.add(ch.x[i], ch.y[i], 84, '#bfe0ff', 0.26); },
  });

  // ================================================================= THE BLOOM
  const ORDER = ['ring', 'zap', 'sweep', 'ring', 'brood', 'zap'];
  G.defCreature('bloom', {
    boss: true, hostile: true, r: 76, hp: 2400, dmg: 1, xp: 0, mass: 40, color: '#ffd0a0', flareResist: true, viewR: 520, noSep: true, scanTime: 2, scanXp: 14, fleeStyle: 'drift', fleeTime: 2.4, noclip: true,
    title: 'THE BLOOM', latin: 'Cyanea capillata', epithet: "lion's mane jellyfish", relic: 'veil', music: 'boss', showStill: true, showR: 150, showY: -50,
    init(c) {
      c.ropes = [];
      const n = c.specimen ? 5 : 7;
      for (let i = 0; i < n; i++) { const r = kit.rope(c.specimen ? 8 : 12, c.specimen ? 12 : 19); kit.ropeSet(r, c.x, c.y, 0, 1); c.ropes.push(r); }
      c.phase = 1; c.k = 0; c.sq = 0; c.pt = 0; c.hot = 0; c.dir = 1; c.fired = 0; c.asleep = !c.specimen; c.mag = 0; c.hx = c.x; c.hy = c.y;
    },
    wake(c) { ai.set(c, 'idle'); c.stT = -0.6; },
    show(c, dt) { c.pt = (c.pt + dt) % 2.4; c.sq = max(0, 1 - c.pt / 0.8); },
    think(c, dt, p) {
      const zone = G.zone, A = zone.arena;
      c.pt += dt; if (c.pt > 2.4) c.pt -= 2.4;
      c.sq = damp(c.sq, max(0, 1 - c.pt / 0.8) * 0.6, 10, dt);
      c.hot = max(0, c.hot - dt);
      if (c.asleep) { c.vx = c.vy = 0; return; }
      const hard = c.phase === 2;
      if (!hard && c.hp < c.maxHp * 0.5) {
        c.phase = 2; G.sfx('roar'); G.cam.shake(0.5); G.fx.punch(0.5, 0.2);
        G.particles.ring(c.x, c.y, 40, 380, '#ff9ad8', 0.7, 5); G.hud.toast('The whole of it is glowing now', '', { color: '#ff9ad8', life: 2.6 });
        ai.set(c, 'idle'); c.stT = 0;
      }
      c.mag = damp(c.mag, hard ? 1 : 0, 1.5, dt);
      // it hangs above the probe, never leaving the room
      let tx = clamp(p.x, A.x - A.rx * 0.62, A.x + A.rx * 0.62), ty = clamp(p.y - 340, A.y - A.ry * 0.66, A.y + A.ry * 0.05), sp = 70;
      if (c.st === 'idle') {
        if (c.stT > (hard ? 0.75 : 1.25) && !p.dead) { const nm = ORDER[c.k++ % ORDER.length]; ai.set(c, nm); c.fired = 0; if (nm !== 'brood') G.sfx('telegraph', { x: c.x, y: c.y }); if (nm === 'sweep') { c.dir = p.x > c.x ? 1 : -1; c.hot = 3.2; } }
      } else if (c.st === 'ring') {
        sp = 20; c.sq = damp(c.sq, 1, 8, dt);
        const shots = hard ? 22 : 16;
        if (c.fired === 0 && c.stT > 0.55) { c.fired = 1; G.eshots.ring(c.x, c.y + 10, shots, 140, { r: 5, color: hard ? '#ff9ad8' : '#bfe0ff', life: 6 }, c.t); G.sfx('pulse', { x: c.x, y: c.y }); G.sfx('spit', { x: c.x, y: c.y }); G.particles.ring(c.x, c.y, 60, 150, '#ffffff', 0.4, 4); c.vy -= 60; }
        if (hard && c.fired === 1 && c.stT > 1.0) { c.fired = 2; G.eshots.ring(c.x, c.y + 10, shots, 166, { r: 5, color: '#ffc0ea', life: 6 }, c.t + PI / shots); G.sfx('spit', { x: c.x, y: c.y }); }
        if (c.stT > (hard ? 1.5 : 1.1)) ai.set(c, 'idle');
      } else if (c.st === 'zap') {
        sp = 40;
        if (c.fired === 0 && c.stT > 0.2) {
          c.fired = 1;
          const n = hard ? 6 : 4, delay = hard ? 0.8 : 0.95;
          for (let i = 0; i < n; i++) {
            const a = G.rand() * TAU, d = i === 0 ? 0 : i === 1 ? 0 : G.rr(90, 230);
            const x = p.x + (i === 1 ? p.vx * 0.7 : cos(a) * d), y = p.y + (i === 1 ? p.vy * 0.7 : sin(a) * d);
            G.hazards.add({ x, y, r: 58, delay: delay + i * 0.09, color: hard ? '#ff9ad8' : '#9fd8ff', dmg: 1 });
          }
        }
        if (c.stT > 1.6) ai.set(c, 'idle');
      } else if (c.st === 'sweep') {
        // drag the curtain across the room
        if (c.stT < 0.9) { sp = 10; } else { tx = c.x + c.dir * 400; ty = clamp(p.y - 170, A.y - A.ry * 0.5, A.y + A.ry * 0.2); sp = hard ? 205 : 165; }
        if (c.stT > 3 || (c.stT > 0.8 && abs(c.x - A.x) > A.rx * 0.66 && (c.x - A.x) * c.dir > 0)) ai.set(c, 'idle');
      } else if (c.st === 'brood') {
        sp = 30;
        if (c.fired === 0 && c.stT > 0.4) {
          c.fired = 1;
          let have = 0; for (const o of G.ents.creatures) if (o.minion && !o.fleeing && !o.dead) have++;
          const n = min(hard ? 5 : 4, 8 - have);
          for (let i = 0; i < n; i++) {
            const a = PI * 0.15 + (i / max(1, n - 1)) * PI * 0.7, m = G.creatures.spawn('jelly', c.x + cos(a) * 50, c.y + 30 + sin(a) * 30, { minion: true });
            if (m) { m.hp = m.maxHp = 16; m.vx = cos(a) * 150; m.vy = sin(a) * 150; m.aggro = true; m.dirA = a; }
          }
          G.sfx('squelch', { x: c.x, y: c.y }); G.particles.bubbles(c.x, c.y + 40, 14, 40, 120);
        }
        if (c.stT > 1.2) ai.set(c, 'idle');
      }
      ai.seek(c, tx, ty, sp, 1.6, dt);
      // the curtain stings, always
      if (!p.dead && c.pd < 420) for (const r of c.ropes) if (kit.ropeNear(r, p.x, p.y, p.r + 4, 2)) { p.hurt(1, c.x, c.y); break; }
    },
    anim(c, dt) {
      const k = pow(0.93, dt * 60), n = c.ropes.length, w = c.r * (1.02 - c.sq * 0.12);
      for (let i = 0; i < n; i++) { const u = (i / (n - 1) - 0.5) * 1.8; kit.ropeStep(c.ropes[i], c.x + u * w, c.y + 14 - abs(u) * 10, dt, sin(c.t * 1.1 + i * 1.3) * 30 - c.vx * 1.2, 60, k); }
    },
    draw(c, ctx) {
      const A = c.alpha, t = c.t, r = c.r, sq = c.sq, mg = c.mag;
      const cA = G.mixCss('#ffe2b0', '#ffc8f0', mg), cB = G.mixCss('#f0903a', '#e84aa8', mg), cC = G.mixCss('#a8401e', '#8a1e6a', mg);
      for (const rp of c.ropes) kit.ropeDraw(ctx, rp, 2.2, 1, c.hot > 0 ? '#ff9ad8' : cB, A * 0.85);
      ctx.save(); ctx.translate(c.x, c.y);
      const w = r * (1.04 - sq * 0.12), h = r * (0.74 + sq * 0.2);
      // the mane: a mass of frilled arms
      ctx.globalAlpha = A * 0.8; ctx.lineCap = 'round'; ctx.strokeStyle = cC; ctx.lineWidth = 9;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 14, 6); ctx.bezierCurveTo(i * 22 + sin(t * 1.4 + i) * 12, 40, i * 8 - sin(t * 1.1 + i) * 14, 78, i * 18 + sin(t * 1.3 + i * 2) * 12, 116 + (c.specimen ? -40 : 0)); ctx.stroke(); }
      ctx.strokeStyle = cB; ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 12 + 5, 6); ctx.bezierCurveTo(i * 18 - sin(t * 1.6 + i) * 10, 34, i * 10 + sin(t * 1.2 + i) * 12, 64, i * 14 - sin(t * 1.5 + i) * 10, 92 + (c.specimen ? -30 : 0)); ctx.stroke(); }
      // the bell, scalloped
      const g = ctx.createRadialGradient(-10, -h * 0.5, 4, 0, 0, r * 1.2);
      g.addColorStop(0, G.css(cA, 0.95)); g.addColorStop(0.55, G.css(cB, 0.86)); g.addColorStop(1, G.css(cC, 0.78));
      ctx.globalAlpha = A; ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-w, 8); ctx.bezierCurveTo(-w * 1.06, -h * 1.34, w * 1.06, -h * 1.34, w, 8);
      for (let i = 8; i >= 1; i--) { const x1 = -w + (i / 8) * 2 * w, x0 = -w + ((i - 1) / 8) * 2 * w; ctx.quadraticCurveTo((x0 + x1) / 2, 20 - sq * 6, x0, 8); }
      ctx.fill();
      ctx.strokeStyle = G.css(cC, 0.5); ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w * 0.27, 6); ctx.quadraticCurveTo(i * w * 0.2, -h * 0.5, i * w * 0.06, -h * 0.94); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(-w * 0.3, -h * 0.55, w * 0.3, h * 0.2, -0.4, 0, TAU); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const t = c.t, col = c.mag > 0.5 ? '#ff9ad8' : '#ffd0a0', A = c.alpha;
      G.drawGlow(ctx, c.x, c.y - 10, 190 + c.sq * 30, col, (0.2 + c.sq * 0.2) * A);
      for (let i = 0; i < 9; i++) { const u = i / 8 - 0.5; G.drawGlow(ctx, c.x + u * 2 * c.r, c.y + 9, 9, '#ffffff', (0.3 + 0.3 * sin(t * 3 + i)) * A); }
      const hot = min(1, c.hot);
      for (const r of c.ropes) for (let i = 2; i < r.n; i += 3) G.drawGlow(ctx, r.x[i], r.y[i], 8 + hot * 8, hot > 0 ? '#ff9ad8' : col, (0.22 + hot * 0.6) * A);
    },
    light(c) { G.lights.add(c.x, c.y, 470, c.mag > 0.5 ? '#ffb8e4' : '#ffe0c0', c.asleep ? 0.3 : 0.6); },
  });

  // ================================================================= rules
  G.ZONE_CONTENT[1] = {
    boss: 'bloom', safeTop: 760,
    pockets: ['pod', 'cleaner', 'wreck', 'pod', 'nest'],
    hostiles: [
      { type: 'jelly', cost: 1, w: 4 },
      { type: 'nettle', cost: 3, w: 2, minT: 0.18 },
      { type: 'squid', cost: 3, w: 2, minT: 0.3 },
      { type: 'siphon', cost: 3, w: 1.3, minT: 0.45 },
    ],
    budget: t => 3.5 + t * 6,
    decorAt(zone, rng, x, y, nx, ny) {
      const D = G.decor, r = rng(), H = G.popHelp, s = rng.range(0.85, 1.2);
      if (ny < -0.7) {
        if (r < 0.055) { D.add('seapen', x, y + 2, nx, ny, { s }); H.specimen('seapen', x + nx * 24, y + ny * 24, 2, 26); }
        else if (r < 0.08) { D.add('sponge', x, y + 3, nx, ny, { s }); H.specimen('sponge', x + nx * 26, y + ny * 26, 2, 28); }
        else if (r < 0.125) { D.add('whip', x, y + 2, nx, ny, { s }); H.specimen('whip', x + nx * 40, y + ny * 40, 2, 30); }
        else if (r < 0.148) D.add('anemone', x, y, nx, ny, { s });
        else if (r < 0.165) D.add('star', x, y, nx, ny, { s });
        else if (r < 0.172) D.add('bubbler', x, y, nx, ny);
      } else if (ny > 0.7) {
        if (r < 0.03) D.add('whip', x, y - 2, nx, ny, { s: s * 0.8 });
        else if (r < 0.045) D.add('xmas', x, y, nx, ny);
      } else {
        if (r < 0.035) D.add('whip', x - nx * 2, y - ny * 2, nx, ny, { s });
        else if (r < 0.06) D.add('seapen', x, y, nx, ny, { s: s * 0.9 });
        else if (r < 0.075) D.add('xmas', x, y, nx, ny);
      }
    },
    ambient(zone, rng, H) {
      const CR = G.creatures;
      for (const c of zone.chambers) {
        if (rng.chance(0.65)) { const p = H.open(rng, c.x, c.y, c.r * 0.5, 50); if (p) CR.spawn('school', p.x, p.y, { n: rng.int(12, 20), tint: '#5a6e92', glowCol: '#7fd8ff', codexId: 'lanternfish' }); }
        const n = rng.int(1, 2);
        for (let i = 0; i < n; i++) { const p = H.open(rng, c.x, c.y, c.r * 0.75, 30); if (p) CR.spawn('combjelly', p.x, p.y); }
        if (c.t > 0.22 && rng.chance(0.5)) { const p = H.open(rng, c.x, c.y, c.r * 0.6, 40); if (p) { const k = rng.int(5, 7); for (let i = 0; i < k; i++) CR.spawn('hatchet', p.x + rng.range(-40, 40), p.y + rng.range(-30, 30)); } }
      }
      // loose jellies drifting in the passages
      let k = 0;
      for (const p of zone.path) { k++; if (k % 5 === 0 && p.y > 900 && p.y < zone.arena.gateY - 300 && rng.chance(0.5)) { const o = H.open(rng, p.x, p.y, p.r, 30); if (o) CR.spawn('jelly', o.x, o.y); } }
      const top = H.open(rng, zone.start.x, zone.start.y + 420, 200, 40);
      if (top) CR.spawn('school', top.x, top.y, { n: 16, tint: '#5a6e92', glowCol: '#7fd8ff', codexId: 'lanternfish' });
    },
  };

  // ================================================================= field notes
  const add = G.codexAdd;
  add('seapen', { name: 'Sea Pen', latin: 'Pennatula phosphorea', zone: 1, kind: 'flora', size: '40 cm', decor: 'seapen', showR: 44, showY: 34, notes: 'A colony shaped like an old quill pen, standing in the mud. Touch one and a wave of green light runs up it, and its neighbours sometimes answer. I have been swimming past them slowly, on purpose, to watch it happen.' });
  add('sponge', { name: "Venus' Flower Basket", latin: 'Euplectella aspergillum', zone: 1, kind: 'flora', size: '30 cm', decor: 'sponge', showR: 46, showY: 38, notes: 'A sponge that weaves itself out of glass fibre finer than anything I am made of. Two shrimp swim in when they are small, grow too large to leave, and spend their whole lives inside together. Their young slip out through the lattice. I am not sure whether this is a sad arrangement or the opposite.' });
  add('whip', { name: 'Sea Whip', latin: 'Ellisella sp.', zone: 1, kind: 'flora', size: '1.5 m', decor: 'whip', showR: 70, showY: 60, notes: 'One long unbranched line of coral, as if the reef were drawn up here by somebody who was running out of ink. It leans away when I pass and straightens afterwards.' });
  add('lanternfish', { name: 'Lanternfish', latin: 'Myctophum punctatum', zone: 1, kind: 'fauna', size: '10 cm', spec: { type: 'school', o: { n: 14, tint: '#5a6e92', glowCol: '#7fd8ff', codexId: 'lanternfish' } }, notes: 'Possibly the most numerous backboned animal on the planet, and almost nobody has met one. Every night the whole population swims up toward the surface to feed, and back down before dawn. It is the largest migration on Earth and it happens in the dark, twice a day, without anyone clapping.' });
  add('combjelly', { name: 'Comb Jelly', latin: 'Beroe cucumis', zone: 1, kind: 'fauna', size: '15 cm', notes: 'Not a jellyfish. It rows itself along with eight rows of tiny beating paddles, and the rainbow is not light it makes: it is my own lamp, combed into colours on the way back. So in a sense we are doing that together.' });
  add('whale', { name: 'Humpback Whale', latin: 'Megaptera novaeangliae', zone: 1, kind: 'fauna', size: '15 m', notes: 'Heard, not seen. Somewhere a long way off, a very large animal is singing a song with verses, and other whales an ocean away will be singing the same one by next season. I logged it under species observed. I think listening counts.' });
  add('jelly', { name: 'Moon Jelly', latin: 'Aurelia aurita', zone: 1, kind: 'fauna', size: '30 cm', notes: 'No brain, no heart, no blood, and a little four-leaf clover in the middle. It does not chase me so much as happen in my direction. A bloom of them is like weather: nothing personal, and best gone around.' });
  add('nettle', { name: 'Sea Nettle', latin: 'Chrysaora fuscescens', zone: 1, kind: 'fauna', size: 'bell 50 cm, trailing 4 m', notes: 'The bell is the small part. Most of a sea nettle is what follows it: metres of fine tentacle, each one armed along its whole length. I keep misjudging where it ends.' });
  add('squid', { name: 'Humboldt Squid', latin: 'Dosidicus gigas', zone: 1, kind: 'fauna', size: '1.5 m', notes: 'Talks with its skin. It flashes red and white at the others to coordinate, and at me, I think, to say what happens next. First the ink, to put my lamp out. Then it comes through the ink. I have learned to move when the flashing starts.' });
  add('hatchet', { name: 'Hatchetfish', latin: 'Argyropelecus hemigymnus', zone: 1, kind: 'fauna', size: '4 cm', notes: 'Thin as a coin and silvered like a mirror, with a row of lamps along its belly tuned to match the faint light from above, so that from below it has no shadow. All of that to disappear. Then it bites me, which rather gives the game away.' });
  add('siphon', { name: 'Giant Siphonophore', latin: 'Praya dubia', zone: 1, kind: 'fauna', size: 'to 40 m', notes: 'The longest animal there is, except it is not one animal. It is a chain of hundreds, each doing a single job: some swim, some sting, some digest, none could live alone. From a distance it looks like a string of lamps somebody left on.' });
  add('bloom', { name: "Lion's Mane Jellyfish", latin: 'Cyanea capillata', zone: 1, kind: 'fauna', boss: true, size: 'bell 2 m, tentacles 30 m', notes: 'The largest jellyfish known. It has no brain to decide anything with, and it filled an entire cavern anyway. Smaller jellies shelter under it. I do not think it wanted me gone so much as it was simply everywhere I needed to be. When it finally drifted up and away, it lit the whole room on its way out.' });
})();
