'use strict';
/* UNDERSONG — the Midnight (zone index 2), 1,000–4,000 m.
   No sunlight reaches here. A body is only seen in the lamp, so anything that should be visible in
   the dark — eyes, lures, photophores, warnings — is drawn in glow(). Every hostile carries a light
   of its own; nothing attacks unseen.
   Scenery: glow polyps, bamboo coral, sea lilies.  Company: barreleyes, sea angels, lanternfish.
   Trouble: footballfish (anglers), viperfish, vampire squid, pelican eels.  Boss: THE LURE. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, exp, PI, hypot, floor, pow } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit, ai = G.ai;
  const pick = arr => arr[(G.rand() * arr.length) | 0];
  const MOTE = '#c8ff9a';        // the colour of the glow Wick collects — and of every angler's lure
  const SPIT = '#ffb36a';

  // =================================================================== scenery
  // ---- zoanthid polyps: they brighten when something passes, and answer a sonar ping
  const POLYP = ['#59e6ff', '#7dffc8', '#b8a8ff', '#8fd0ff'];
  G.defDecor('glowpolyp', {
    r: 34, reactR: 150, reactIn: 3.5, reactOut: 0.5,
    init(d) {
      d.col = pick(POLYP); d.flash = 0; d.pp = [];
      const n = 4 + ((G.rand() * 4) | 0);
      for (let i = 0; i < n; i++) d.pp.push({ off: G.rr(-18, 18), h: G.rr(7, 15) * d.s, ph: G.rand() * TAU, r: G.rr(2.2, 3.4) });
    },
    update(d, dt) {
      d.flash = max(0, d.flash - dt * 1.1);
      const pings = G.sonar.pings;
      for (let i = 0; i < pings.length; i++) { const s = pings[i]; if (s.r < s.max && abs(hypot(d.x - s.x, d.y - s.y) - s.r) < 46) d.flash = 1; }
    },
    draw(d, ctx) {
      const tx = -d.ny, ty = d.nx, t = d.t;
      ctx.lineCap = 'round';
      for (const q of d.pp) {
        const sw = sin(t * 1.4 + q.ph) * 2.2, bx = d.x + tx * q.off, by = d.y + ty * q.off;
        const ex = bx + d.nx * q.h + tx * sw, ey = by + d.ny * q.h + ty * sw;
        ctx.strokeStyle = '#5a6a8c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = '#a8bce0'; ctx.beginPath(); ctx.arc(ex, ey, q.r, 0, TAU); ctx.fill();
      }
    },
    glow(d, ctx) {
      const tx = -d.ny, ty = d.nx, t = d.t;
      for (const q of d.pp) {
        const sw = sin(t * 1.4 + q.ph) * 2.2, ex = d.x + tx * (q.off + sw) + d.nx * q.h, ey = d.y + ty * (q.off + sw) + d.ny * q.h;
        const k = 0.16 + d.react * 0.62 * (0.6 + 0.4 * sin(t * 5 + q.ph)) + d.flash * 0.7;
        G.drawGlow(ctx, ex, ey, 6 + k * 9, d.col, min(1, k));
      }
    },
    light(d) { const k = d.react * 0.3 + d.flash * 0.5; if (k > 0.03) G.lights.add(d.x + d.nx * 10, d.y + d.ny * 10, 90 + 70 * k, d.col, k); },
  });

  // ---- bamboo coral: touch it and the light runs down the whole colony, joint by joint
  G.defDecor('bamboo', {
    r: 62, reactR: 48, reactIn: 20, reactOut: 2,
    init(d) {
      const rng = G.RNG(((d.x * 31 + d.y * 17) | 0) + 911), segs = d.segs = [];
      const H = rng.range(46, 72) * d.s, steps = 5;
      let x = d.x, y = d.y, a = atan2(d.ny, d.nx);
      for (let i = 0; i < steps; i++) {
        a += rng.range(-0.16, 0.16);
        const L = H / steps, x2 = x + cos(a) * L, y2 = y + sin(a) * L;
        segs.push({ x0: x, y0: y, x1: x2, y1: y2, u: (i + 1) / steps * 0.7, w: 0 });
        x = x2; y = y2;
        if (i >= 1) {
          const side = i & 1 ? 1 : -1;
          let bx = x, by = y, ba = a + side * rng.range(0.6, 0.95), bu = (i + 1) / steps * 0.7;
          const bn = rng.int(2, 3);
          for (let k = 0; k < bn; k++) {
            ba += rng.range(-0.25, 0.25) - side * 0.12;
            const bl = rng.range(9, 14) * d.s, ex = bx + cos(ba) * bl, ey = by + sin(ba) * bl;
            bu += 0.1;
            segs.push({ x0: bx, y0: by, x1: ex, y1: ey, u: bu, w: 1 });
            if (k === 0 && rng.chance(0.5)) { const ta = ba - side * 0.8, tl = rng.range(7, 10) * d.s; segs.push({ x0: ex, y0: ey, x1: ex + cos(ta) * tl, y1: ey + sin(ta) * tl, u: bu + 0.1, w: 1 }); }
            bx = ex; by = ey;
          }
        }
      }
      d.wave = -1; d.rt = 0; d.col = rng.chance(0.5) ? '#7dffe0' : '#8fd0ff';
    },
    onNear(d) { if (d.wave < 0) { d.wave = 0; G.sfx('mote', { n: 2 + ((d.ph * 2) | 0), x: d.x }); } },
    onShot(d) { if (d.wave < 0) d.wave = 0; },
    update(d, dt) {
      if (d.react > 0.5) { d.rt -= dt; if (d.rt <= 0 && d.wave < 0) { d.rt = 1.5; d.wave = 0; } }
      if (d.wave >= 0) { d.wave += dt * 1.25; if (d.wave > 1.5) d.wave = -1; }
    },
    draw(d, ctx) {
      const segs = d.segs;
      ctx.lineCap = 'round'; ctx.strokeStyle = '#e9dce6';
      ctx.lineWidth = 3; ctx.beginPath();
      for (const s of segs) if (!s.w) { ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); }
      ctx.stroke();
      ctx.lineWidth = 1.9; ctx.beginPath();
      for (const s of segs) if (s.w) { ctx.moveTo(s.x0, s.y0); ctx.lineTo(s.x1, s.y1); }
      ctx.stroke();
      ctx.fillStyle = '#5a4a5e';
      for (const s of segs) { ctx.beginPath(); ctx.arc(s.x0, s.y0, s.w ? 1.5 : 2.1, 0, TAU); ctx.fill(); }
    },
    glow(d, ctx) {
      if (d.wave < 0) return;
      for (const s of d.segs) { const k = (s.u - d.wave) / 0.17, e = exp(-k * k); if (e > 0.03) G.drawGlow(ctx, s.x1, s.y1, 6 + e * 6, d.col, e); }
    },
    light(d) { if (d.wave >= 0) G.lights.add(d.x + d.nx * 34, d.y + d.ny * 34, 130, d.col, 0.4 * (1 - d.wave / 1.5)); },
  });

  // ---- sea lily: a starfish's cousin on a stalk. Folds when approached.
  const CRIN = [['#ffd24a', '#b8861a'], ['#ff8a4a', '#b8501a'], ['#e85a6a', '#8a2a3a'], ['#f2f0e0', '#9a968a']];
  G.defDecor('crinoid', {
    r: 52, reactR: 112, reactIn: 5, reactOut: 0.7,
    init(d) { d.col = pick(CRIN); d.h = G.rr(24, 40) * d.s; d.arms = 9 + ((G.rand() * 4) | 0); d.len = G.rr(17, 24) * d.s; },
    draw(d, ctx) {
      const tx = -d.ny, ty = d.nx, t = d.t, c = d.col, open = 1 - d.react;
      const sway = sin(t * 0.8 + d.ph) * 4 * open;
      const cx = d.x + d.nx * d.h + tx * sway, cy = d.y + d.ny * d.h + ty * sway;
      ctx.lineCap = 'round';
      ctx.strokeStyle = c[1]; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.quadraticCurveTo(d.x + d.nx * d.h * 0.5 - tx * sway * 0.6, d.y + d.ny * d.h * 0.5 - ty * sway * 0.6, cx, cy); ctx.stroke();
      const base = atan2(d.ny, d.nx), n = d.arms, spread = 0.16 + 1.12 * open, L = d.len * (0.8 + 0.2 * open);
      ctx.strokeStyle = c[0]; ctx.lineWidth = 1.9; ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1) * 2 - 1, a = base + u * spread + sin(t * 1.1 + i * 1.7 + d.ph) * 0.07 * open;
        const bend = a - u * (0.25 + 0.5 * (1 - open));       // tips curl back toward the axis as it closes
        const mx = cx + cos(a) * L * 0.55, my = cy + sin(a) * L * 0.55;
        ctx.moveTo(cx, cy); ctx.quadraticCurveTo(mx, my, mx + cos(bend) * L * 0.5, my + sin(bend) * L * 0.5);
      }
      ctx.stroke();
      if (open > 0.15) {         // pinnules: the feathering that actually catches the snow
        ctx.lineWidth = 1; ctx.globalAlpha = 0.8 * open; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const u = i / (n - 1) * 2 - 1, a = base + u * spread + sin(t * 1.1 + i * 1.7 + d.ph) * 0.07 * open, ca = cos(a), sa = sin(a);
          for (let k = 1; k <= 4; k++) {
            const q = k / 4.6, px = cx + ca * L * q, py = cy + sa * L * q, pn = 4.2 * open * (1 - q * 0.4);
            ctx.moveTo(px - sa * pn, py + ca * pn); ctx.lineTo(px + sa * pn, py - ca * pn);
          }
        }
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
    },
  });

  // =================================================================== quiet company
  // ---- barreleye: a clear dome of a head, with the eyes inside it pointing up
  const P6B = kit.profile(6, 0.8, 0.6);
  G.defCreature('barreleye', {
    r: 12, hp: 10, passive: true, color: '#7dffb0', scanXp: 6, leash: 90, showR: 28,
    init(c) { c.ch = kit.chain(6, 6); c.face = G.rand() < 0.5 ? 0.1 : PI - 0.1; kit.chainSet(c.ch, c.x, c.y, c.face); c.swim = 0; c.look = 0; c.gx = c.x; c.gy = c.y; },
    think(c, dt) {
      ai.wander(c, 12, dt); ai.faceVel(c, 2, dt);
      c.look = damp(c.look, c.pd < 220 ? 1 : 0, 2.5, dt);
    },
    show(c) { c.look = 0.5 + 0.5 * sin(c.t * 0.7); },
    anim(c, dt) { kit.chainFollow(c.ch, c.x, c.y, c.face, 0.4); c.swim += dt * (2.5 + hypot(c.vx, c.vy) * 0.08); },
    draw(c, ctx) {
      const up = kit.upSide(c), A = c.alpha, X = c.ch.x, Y = c.ch.y;
      kit.fish(ctx, c.ch, { w: 7.5, prof: P6B, up, phase: c.swim, amp: 1.4, body: '#5a5068', belly: '#8a8098', fin: '#463c56', tail: 9, dorsal: 3.5, anal: 3, pect: 7, alpha: A });
      const fa = atan2(Y[0] - Y[1], X[0] - X[1]), fx = cos(fa), fy = sin(fa), nx = -fy * up, ny = fx * up;
      const hx = X[0] + fx * 2.5 + nx * 3, hy = Y[0] + fy * 2.5 + ny * 3;
      c.gx = hx; c.gy = hy;
      ctx.globalAlpha = A * 0.34; ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.arc(hx, hy, 7.4, 0, TAU); ctx.fill();
      ctx.globalAlpha = A * 0.6; ctx.strokeStyle = '#e6f6ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx, hy, 7.4, 0, TAU); ctx.stroke();
      // the eyes: two green barrels, aimed straight up through the top of its own head — unless something is worth a look
      const an = atan2(ny, nx), ba = an + G.angDiff(an, fa) * c.look * 0.75, bx = cos(ba), by = sin(ba);
      ctx.globalAlpha = A; ctx.lineCap = 'round';
      for (let s = -1; s <= 1; s += 2) {
        const ex = hx + fx * s * 2.5 - nx * 0.6, ey = hy + fy * s * 2.5 - ny * 0.6;
        ctx.strokeStyle = '#2fbf6c'; ctx.lineWidth = 3.3; ctx.beginPath(); ctx.moveTo(ex - bx * 2.4, ey - by * 2.4); ctx.lineTo(ex + bx * 2.2, ey + by * 2.2); ctx.stroke();
        ctx.fillStyle = '#c8ffdc'; ctx.beginPath(); ctx.arc(ex + bx * 2.6, ey + by * 2.6, 1.5, 0, TAU); ctx.fill();
      }
      // the things on its face that look like eyes are nostrils
      ctx.fillStyle = '#1a1622'; ctx.beginPath(); ctx.arc(kit.hx - fx * 2 + nx * 1.2, kit.hy - fy * 2 + ny * 1.2, 0.9, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    },
    glow(c, ctx) { G.drawGlow(ctx, c.gx, c.gy, 10, '#59ff9a', 0.5 * c.alpha); },
  });

  // ---- sea angel: a snail that gave up its shell and learned to fly
  G.defCreature('seaangel', {
    r: 7, hp: 6, passive: true, color: '#bfe8ff', scanXp: 5, leash: 70, showR: 15, noSep: true, showStill: true,
    init(c) { c.flap = G.rand() * TAU; },
    think(c, dt) {
      ai.wander(c, 10, dt);
      c.vy -= max(0, sin(c.flap)) * 26 * dt; c.vy += 8 * dt;
    },
    anim(c, dt) { c.flap += dt * 7; },
    draw(c, ctx) {
      const A = c.alpha, w = sin(c.flap) * 0.9;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(clamp(c.vx / 60, -0.5, 0.5));
      ctx.globalAlpha = A * 0.5; ctx.fillStyle = '#d8eeff';
      for (let s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.translate(s * 2, -3); ctx.rotate(s * (0.5 + w * 0.8));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 7, -5, s * 9, 0); ctx.quadraticCurveTo(s * 6, 3, 0, 1.5); ctx.fill(); ctx.restore();
      }
      ctx.globalAlpha = A * 0.55; ctx.fillStyle = '#cfe6ff';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(4.6, -5, 3.2, 1); ctx.quadraticCurveTo(1.6, 7, 0, 9.5); ctx.quadraticCurveTo(-1.6, 7, -3.2, 1); ctx.quadraticCurveTo(-4.6, -5, 0, -7); ctx.fill();
      ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-1.6, -6.4); ctx.lineTo(-2.6, -9); ctx.moveTo(1.6, -6.4); ctx.lineTo(2.6, -9); ctx.stroke();
      ctx.globalAlpha = A * 0.9; ctx.fillStyle = '#ff8a3c'; ctx.beginPath(); ctx.ellipse(0, -1.5, 1.7, 2.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffb46a'; ctx.beginPath(); ctx.arc(0, 4.6, 1, 0, TAU); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) { G.drawGlow(ctx, c.x, c.y, 14, '#9fd0ff', 0.3 * c.alpha); G.drawGlow(ctx, c.x, c.y - 1.5, 5, '#ff9a4a', 0.5 * c.alpha); },
  });

  // =================================================================== anglers (shared anatomy)
  // Local frame: nose toward +x, back toward -y. Caller has translated / rotated / flipped.
  function anglerBody(ctx, r, jaw, swim, o) {
    const t = G.time, wag = sin(swim) * 0.4;
    ctx.fillStyle = o.fin;
    ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.12); ctx.lineTo(-r * 1.55, -r * 0.55 + wag * r * 0.4);
    ctx.quadraticCurveTo(-r * 1.3, wag * r * 0.3, -r * 1.55, r * 0.55 + wag * r * 0.4); ctx.lineTo(-r * 0.7, r * 0.12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.92); ctx.quadraticCurveTo(-r * 0.75, -r * 1.3, -r * 0.92, -r * 0.5); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(-r * 0.15, r * 0.5); ctx.rotate(0.5 + sin(t * 4 + o.ph) * 0.35);
    ctx.beginPath(); ctx.ellipse(-r * 0.22, 0, r * 0.36, r * 0.15, 0, 0, TAU); ctx.fill(); ctx.restore();
    // the mouth: a wedge cut out of the front, far too big for the fish
    const a1 = 0.1 + jaw * 0.42, a2 = 0.24 + jaw * 0.8, hx = r * 0.1, hy = r * 0.05;
    ctx.fillStyle = o.mouth; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(0, 0, r * 0.98, -a1, a2); ctx.closePath(); ctx.fill();
    const g = ctx.createRadialGradient(-r * 0.25, -r * 0.4, r * 0.1, 0, 0, r * 1.08);
    g.addColorStop(0, o.skin[0]); g.addColorStop(0.6, o.skin[1]); g.addColorStop(1, o.skin[2]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(cos(-a1) * r * 1.06, sin(-a1) * r * 1.06);
    ctx.arc(0, 0, r * 1.06, -a1, a2, true); ctx.closePath(); ctx.fill();
    // needle teeth along both jaws, pointing into the gap
    ctx.fillStyle = o.tooth;
    const n = o.teeth;
    for (let s = 0; s < 2; s++) {
      const a = s ? a2 : -a1, ca = cos(a), sa = sin(a), dn = s ? -1 : 1, px = -sa * dn, py = ca * dn;
      for (let i = 1; i <= n; i++) {
        const u = 0.36 + 0.62 * i / n, bx = hx + (ca * r * 1.04 - hx) * u, by = hy + (sa * r * 1.04 - hy) * u;
        const L = r * (0.2 + 0.1 * ((i * 7) % 3)) * (0.7 + 0.3 * jaw), w = r * 0.04;
        ctx.beginPath(); ctx.moveTo(bx - ca * w, by - sa * w); ctx.lineTo(bx + px * L, by + py * L); ctx.lineTo(bx + ca * w, by + sa * w); ctx.fill();
      }
    }
    if (o.wart) {
      ctx.fillStyle = o.wart;
      for (let i = 0; i < 10; i++) { const a = 2.1 + i * 0.36, d = r * (0.42 + 0.11 * ((i * 5) % 4)); ctx.beginPath(); ctx.arc(cos(a) * d, sin(a) * d, r * 0.045, 0, TAU); ctx.fill(); }
    }
  }
  const SKIN_FOOT = { skin: ['#7a6470', '#55424e', '#2e222c'], fin: '#3e2f3a', mouth: '#2a0a14', tooth: 'rgba(235,245,255,0.9)', teeth: 4, wart: 'rgba(20,12,18,0.45)', ph: 0 };
  const SKIN_LURE = { skin: ['#6e6480', '#473d56', '#241c2e'], fin: '#352a42', mouth: '#2c0816', tooth: 'rgba(240,248,255,0.92)', teeth: 7, wart: 'rgba(14,10,20,0.5)', ph: 0 };
  const SKIN_LURE2 = { skin: ['#86586a', '#5a3448', '#2c1622'], fin: '#42243a', mouth: '#3a0a18', tooth: 'rgba(255,244,240,0.95)', teeth: 7, wart: 'rgba(20,8,14,0.5)', ph: 0 };
  // a point given in the fish's local frame -> world
  function fishPt(c, lx, ly, out) {
    const fa = c.face, flip = cos(fa) < 0 ? -1 : 1, cs = cos(fa), sn = sin(fa);
    out.x = c.x + lx * cs - ly * flip * sn; out.y = c.y + lx * sn + ly * flip * cs;
    return out;
  }
  const _q = { x: 0, y: 0 };
  function moteGlow(ctx, x, y, size, anger, a, strobe) {       // a lure: reads as a mote until it turns
    const tw = 0.75 + 0.25 * sin(G.time * 6 + x * 0.01);
    if (anger < 0.98) G.drawGlow(ctx, x, y, size * tw + 3, MOTE, 0.95 * a * (1 - anger) * strobe);
    if (anger > 0.02) G.drawGlow(ctx, x, y, (size * 1.3 + 4) * (0.8 + 0.2 * strobe), '#ff9a5a', a * anger);
    G.drawGlow(ctx, x, y, size * 0.34, '#ffffff', 0.9 * a);
  }

  // ---- footballfish: sits in the dark holding out exactly the light you were looking for
  G.defCreature('angler', {
    r: 20, hp: 110, hostile: true, dmg: 1, xp: 9, pearl: 0.3, mass: 2.6, color: MOTE, leash: 60, viewR: 170, showR: 46, showY: 10, scanTime: 1.4,
    init(c) {
      c.jaw = 0.15; c.lit = 0; c.cd = 0; c.da = 0; c.swim = 0; c.lk = 0; c.touch = false;
      c.face = G.rand() < 0.5 ? 0 : PI;
      c.lx = c.x + cos(c.face) * 24; c.ly = c.y - 22;
      if (c.minion) { c.st = 'hunt'; c.aggro = true; c.cd = G.rr(0.8, 1.6); } else c.st = 'lurk';
    },
    show(c) { c.jaw = 0.18 + 0.3 * max(0, sin(c.t * 1.3)); },
    think(c, dt, p) {
      const pl = G.player;
      c.cd -= dt;
      if (c.st === 'lurk') {
        ai.brake(c, 3, dt);
        c.jaw = damp(c.jaw, 0.12 + 0.05 * sin(c.t * 1.2), 3, dt); c.lk = damp(c.lk, 0, 3, dt);
        let trig = c.aggro || c.pd < 132;
        if (!trig && c.pd < pl.st.lampR * 0.72) {        // it does not like being stared at
          const a = abs(G.angDiff(pl.face, atan2(c.y - pl.y, c.x - pl.x)));
          if (a < pl.st.lampHalf * 0.75 && ai.see(c, p, 600)) c.lit += dt; else c.lit = max(0, c.lit - dt * 0.5);
          if (c.lit > 0.8) trig = true;
        }
        if (trig && !p.dead) {
          c.aggro = true; ai.set(c, 'warn');
          G.sfx('growl', { x: c.x, y: c.y }); G.particles.ring(c.lx, c.ly, 6, 34, '#ff9a5a', 0.3, 2);
        }
      } else if (c.st === 'warn') {
        ai.brake(c, 4, dt); ai.face(c, ai.toPlayer(c, p), 10, dt);
        c.jaw = damp(c.jaw, 1, 14, dt); c.lk = damp(c.lk, 1, 16, dt);
        if (c.stT > 0.42) { c.da = c.face; ai.set(c, 'lunge'); G.sfx('snap', { x: c.x, y: c.y }); }
      } else if (c.st === 'lunge') {
        c.vx = cos(c.da) * 640; c.vy = sin(c.da) * 640;
        if (c.stT > 0.32) c.jaw = damp(c.jaw, 0, 30, dt);
        if (c.stT > 0.46 || G.sdf(c.x + cos(c.da) * 28, c.y + sin(c.da) * 28) < 6) { ai.set(c, 'hunt'); c.cd = G.rr(1.8, 2.8); }
      } else {          // hunt: slow, patient, and every so often not slow at all
        ai.chase(c, p, 105, 2, dt); ai.faceVel(c, 4, dt);
        c.jaw = damp(c.jaw, 0.3 + 0.15 * sin(c.t * 4), 6, dt); c.lk = damp(c.lk, 0.35, 3, dt);
        if (c.cd <= 0 && c.pd < 340 && !p.dead && ai.see(c, p, 340)) { ai.set(c, 'warn'); G.sfx('growl', { x: c.x, y: c.y }); }
        if (!c.minion) { ai.notice(c, p, 400, dt); if (!c.aggro) { ai.set(c, 'lurk'); c.lit = 0; } }
      }
      c.touch = c.st !== 'lurk';
    },
    anim(c, dt) {
      c.swim += dt * (3 + hypot(c.vx, c.vy) * 0.03);
      const rx = c.x + cos(c.face) * c.r * 1.25 + sin(c.t * 1.7 + c.ph) * 4, ry = c.y + sin(c.face) * c.r * 1.25 - c.r * 1.05 + cos(c.t * 1.3 + c.ph) * 2;
      const k = min(1, dt * 9);
      c.lx += (rx - c.lx) * k; c.ly += (ry - c.ly) * k;
    },
    draw(c, ctx) {
      const A = c.alpha, r = c.r, fa = c.face, flip = cos(fa) < 0 ? -1 : 1;
      // the rod, from forehead to lantern
      fishPt(c, r * 0.45, -r * 0.9, _q);
      ctx.globalAlpha = A; ctx.strokeStyle = '#6a5560'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(_q.x, _q.y); ctx.quadraticCurveTo((_q.x + c.lx) / 2, min(_q.y, c.ly) - 8, c.lx, c.ly); ctx.stroke();
      ctx.fillStyle = '#e8ffd0'; ctx.beginPath(); ctx.arc(c.lx, c.ly, 3.2, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(fa); ctx.scale(1, flip);
      SKIN_FOOT.ph = c.ph;
      anglerBody(ctx, r, c.jaw, c.swim, SKIN_FOOT);
      kit.eye(ctx, r * 0.38, -r * 0.5, r * 0.13, (ai.toPlayer(c, G.player) - fa) * flip, { alpha: A, white: '#d8e8f0', pupil: 0.5, dazed: c.stun > 0, angry: c.st === 'lurk' ? 0 : 0.8, lidCol: '#2e222c' });
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const A = c.alpha, strobe = c.st === 'warn' ? 0.6 + 0.4 * sin(G.time * 40) : 1;
      moteGlow(ctx, c.lx, c.ly, 9 + c.lk * 2, c.lk, A, strobe);
      if (c.st !== 'lurk') { fishPt(c, c.r * 0.38, -c.r * 0.5, _q); G.drawGlow(ctx, _q.x, _q.y, 6, '#ffd0a0', 0.5 * A); }
    },
    light(c) { G.lights.add(c.lx, c.ly, 74, MOTE, 0.42); },      // just enough to catch the teeth
  });

  // ---- viperfish: weaves at the edge of the lamp, then is suddenly through you
  const P8V = kit.profile(8, 0.3, 0.8);
  G.defCreature('viperfish', {
    r: 11, hp: 52, hostile: true, dmg: 1, xp: 5, pearl: 0.14, mass: 0.9, color: '#7fd0ff', leash: 200, showR: 34,
    init(c) { c.ch = kit.chain(8, 7); kit.chainSet(c.ch, c.x, c.y, c.face); c.swim = 0; c.cd = G.rr(1, 2); c.side = G.rand() < 0.5 ? 1 : -1; c.da = 0; c.gk = 0.4; c.jaw = 0; },
    show(c) { c.gk = 0.7 + 0.3 * sin(c.t * 2); c.jaw = 0.3 + 0.3 * max(0, sin(c.t * 1.1)); },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 400, dt);
      c.cd -= dt;
      if (c.st === 'idle') {
        if (!aggro) { ai.wander(c, 46, dt); c.gk = damp(c.gk, 0.38, 3, dt); }
        else {
          if (G.rand() < dt * 0.6) c.side = -c.side;
          const a = atan2(c.y - p.y, c.x - p.x) + c.side * 0.8, R = 250 + sin(c.t * 3.1) * 50;
          ai.seek(c, p.x + cos(a) * R, p.y + sin(a) * R, 200, 3.5, dt); ai.avoid(c, 30, 700, dt);
          c.gk = damp(c.gk, 0.62, 3, dt);
          if (c.cd <= 0 && c.pd < 380 && !p.dead && ai.see(c, p, 380)) { ai.set(c, 'aim'); G.sfx('telegraph', { x: c.x, y: c.y }); }
        }
        ai.faceVel(c, 7, dt); c.jaw = damp(c.jaw, 0.15, 5, dt);
      } else if (c.st === 'aim') {
        ai.face(c, ai.toPlayer(c, p), 12, dt); ai.brake(c, 5, dt);
        c.gk = damp(c.gk, 1.7, 14, dt); c.jaw = damp(c.jaw, 1, 12, dt);
        if (c.stT > 0.36) { c.da = c.face; ai.set(c, 'dart'); G.sfx('whoosh', { x: c.x, y: c.y }); }
      } else if (c.st === 'dart') {
        c.vx = cos(c.da) * 600; c.vy = sin(c.da) * 600;
        if (c.stT > 0.52 || G.sdf(c.x + cos(c.da) * 18, c.y + sin(c.da) * 18) < 5) ai.set(c, 'away');
      } else {
        ai.brake(c, 2.5, dt); ai.faceVel(c, 5, dt); c.gk = damp(c.gk, 0.5, 4, dt); c.jaw = damp(c.jaw, 0.1, 6, dt);
        if (c.stT > 0.55) { ai.set(c, 'idle'); c.cd = G.rr(1.3, 2.3); }
      }
    },
    anim(c, dt) { kit.chainFollow(c.ch, c.x, c.y, c.face, 0.45); c.swim += dt * (5 + hypot(c.vx, c.vy) * 0.05); },
    draw(c, ctx) {
      const A = c.alpha, up = kit.upSide(c);
      kit.fish(ctx, c.ch, { w: 5.6, prof: P8V, up, phase: c.swim, amp: c.st === 'aim' ? 0.8 : 3, body: '#34486a', belly: '#6a8cb0', fin: '#28385a', tail: 9, dorsal: 3, anal: 2.5, pect: 5, nose: 9, alpha: A });
      // jaws: the lower one juts, and the fangs do not fit inside
      const fa = c.face, fx = cos(fa), fy = sin(fa), nx = -fy * up, ny = fx * up, jx = kit.hx, jy = kit.hy, open = 0.25 + c.jaw * 0.75;
      const lx = jx + fx * 2 - nx * (3 + open * 5), ly = jy + fy * 2 - ny * (3 + open * 5);
      ctx.globalAlpha = A; ctx.lineCap = 'round';
      ctx.strokeStyle = '#28385a'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(jx - fx * 8 - nx * 3, jy - fy * 8 - ny * 3); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.strokeStyle = 'rgba(235,245,255,0.92)'; ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) { const q = k * 2.6; ctx.moveTo(lx - fx * q, ly - fy * q); ctx.lineTo(lx - fx * (q + 0.5) + nx * (6.5 - k), ly - fy * (q + 0.5) + ny * (6.5 - k)); }
      for (let k = 0; k < 2; k++) { const q = 1 + k * 3; ctx.moveTo(jx - fx * q, jy - fy * q); ctx.lineTo(jx - fx * q - nx * 4.5, jy - fy * q - ny * 4.5); }
      ctx.stroke(); ctx.globalAlpha = 1;
      kit.eye(ctx, kit.ex, kit.ey, 2.6, ai.toPlayer(c, G.player), { alpha: A, white: '#cfe8ff', pupil: 0.5, angry: 0.7, dazed: c.stun > 0, lidCol: '#1c2840' });
    },
    glow(c, ctx) {
      const A = c.alpha, ch = c.ch, X = ch.x, Y = ch.y, n = ch.n, up = c.up || -1, k = c.gk;
      for (let i = 1; i < n - 1; i++) {        // a row of lights down the belly
        let tx = X[i - 1] - X[i + 1], ty = Y[i - 1] - Y[i + 1]; const l = hypot(tx, ty) || 1; tx /= l; ty /= l;
        G.drawGlow(ctx, X[i] + ty * up * 4.6, Y[i] - tx * up * 4.6, 3.4 + k * 1.4, '#7fd0ff', min(1, 0.5 * k) * A);
      }
      G.drawGlow(ctx, X[0], Y[0], 5 + k * 2, '#bfe8ff', min(1, 0.4 * k) * A);
      if (c.st === 'aim') {
        const u = min(1, c.stT / 0.36), a = c.face, d = G.raycast(c.x, c.y, cos(a), sin(a), 420);
        ctx.globalAlpha = (0.12 + 0.4 * u) * A; ctx.strokeStyle = '#9fdcff'; ctx.lineWidth = 1 + 1.6 * u; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -G.time * 100;
        ctx.beginPath(); ctx.moveTo(c.x + cos(a) * 14, c.y + sin(a) * 14); ctx.lineTo(c.x + cos(a) * d, c.y + sin(a) * d); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    },
  });

  // ---- vampire squid: neither. Turns inside out and throws light instead of ink.
  function mucus(c, p) {
    const a0 = atan2(p.y - c.y, p.x - c.x);
    for (let i = 0; i < 7; i++) {
      const a = a0 + (i - 3) * 0.3 + G.rr(-0.1, 0.1), sp = G.rr(300, 520);
      G.eshots.fire(c.x + cos(a) * 14, c.y + sin(a) * 14, cos(a) * sp, sin(a) * sp, { r: 6, color: '#59c8ff', life: G.rr(4.4, 5.8), drag: 1.7 });
    }
    G.sfx('squelch', { x: c.x, y: c.y }); G.particles.motes(c.x, c.y, 8, '#59c8ff', { s0: 30, s1: 130, life: 0.7 });
    G.lights.flash(c.x, c.y, 200, '#59c8ff', 0.25, 0.8);
  }
  G.defCreature('vampsquid', {
    r: 17, hp: 84, hostile: true, dmg: 0, xp: 8, pearl: 0.26, mass: 1.6, color: '#7fb8ff', leash: 150, showR: 40, showStill: true,
    init(c) { c.inv = 0; c.cd = G.rr(2, 3.5); c.flap = G.rand() * TAU; c.tipK = 0; c.pineCd = 0; c.pineT = 2; c.dir = 1; },
    show(c) { const k = sin(c.t * 0.55); c.inv = damp(c.inv, k > 0.6 ? 1 : 0, 6, 0.016); c.tipK = c.inv * 0.8; },
    onHit(c) {
      if (c.inv > 0.6) return 'reflect';
      if (c.st !== 'pine' && c.st !== 'throw' && c.pineCd <= 0 && G.rand() < 0.3) { ai.set(c, 'pine'); c.pineT = 1.7; c.pineCd = 5; G.sfx('inflate', { x: c.x, y: c.y }); }
    },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 380, dt);
      c.cd -= dt; c.pineCd -= dt;
      if (c.st === 'throw') {
        ai.brake(c, 4, dt); c.tipK = damp(c.tipK, 1, 8, dt);
        if (c.stT > 0.55) { mucus(c, p); ai.set(c, 'pine'); c.pineT = 2.3; c.pineCd = 4; }
      } else if (c.st === 'pine') {
        c.inv = damp(c.inv, 1, 9, dt); c.tipK = damp(c.tipK, 0.8, 4, dt);
        ai.away(c, p, 60, 1.5, dt);
        if (c.stT > c.pineT) { ai.set(c, 'idle'); c.cd = G.rr(2.6, 4); }
      } else {
        c.inv = damp(c.inv, 0, 5, dt); c.tipK = damp(c.tipK, 0, 4, dt);
        if (aggro) {
          const d = c.pd;
          if (d < 210) ai.away(c, p, 120, 2.5, dt); else if (d > 330) ai.chase(c, p, 70, 2, dt); else ai.wander(c, 30, dt);
          if (c.cd <= 0 && d < 430 && !p.dead && ai.see(c, p, 430)) { ai.set(c, 'throw'); G.sfx('telegraph', { x: c.x, y: c.y }); }
        } else ai.wander(c, 24, dt);
      }
      if (abs(p.x - c.x) > 12) c.dir = p.x > c.x ? 1 : -1;
    },
    anim(c, dt) { c.flap += dt * (c.inv > 0.5 ? 2 : 5); },
    draw(c, ctx) {
      const A = c.alpha, r = c.r, inv = c.inv, t = G.time, web = '#a02c48', dark = '#5a1428';
      ctx.save(); ctx.translate(c.x, c.y + sin(t * 1.8 + c.ph) * 2); ctx.rotate(clamp(c.vx / 220, -0.35, 0.35));
      ctx.globalAlpha = A;
      if (inv < 0.5) {
        // the cloak: eight arms joined by a web, hanging like a skirt
        const open = 1 - inv * 2, hw = r * (0.9 + 0.5 * open);
        ctx.fillStyle = web;
        ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.1);
        for (let i = 0; i <= 8; i++) {
          const u = i / 8, x = lerp(-hw, hw, u), y = r * (0.5 + 0.9 * open) + sin(t * 2.4 + i * 1.1 + c.ph) * 2.5 * open - abs(u - 0.5) * r * 0.5;
          if (i === 0) ctx.lineTo(x, y); else ctx.quadraticCurveTo(lerp(-hw, hw, (i - 0.5) / 8), y - r * 0.3 * open, x, y);
        }
        ctx.lineTo(r * 0.7, r * 0.1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = dark; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
          const u = i / 8, x = lerp(-hw, hw, u), y = r * (0.5 + 0.9 * open) + sin(t * 2.4 + i * 1.1 + c.ph) * 2.5 * open - abs(u - 0.5) * r * 0.5;
          ctx.moveTo(lerp(-r * 0.6, r * 0.6, u), r * 0.15); ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // ear-fins
      ctx.fillStyle = web;
      for (let s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.translate(s * r * 0.68, -r * 0.72); ctx.rotate(s * (0.25 + sin(c.flap) * 0.55));
        ctx.beginPath(); ctx.ellipse(s * r * 0.3, 0, r * 0.42, r * 0.2, 0, 0, TAU); ctx.fill(); ctx.restore();
      }
      // mantle
      const g = ctx.createRadialGradient(-r * 0.25, -r * 0.6, r * 0.1, 0, -r * 0.25, r);
      g.addColorStop(0, '#b8405c'); g.addColorStop(0.6, '#7a1e36'); g.addColorStop(1, '#4a1024');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.82, r * 0.95, 0, 0, TAU); ctx.fill();
      if (inv < 0.5) kit.eye(ctx, c.dir * r * 0.32, -r * 0.05, r * 0.3, c.dir > 0 ? 0.3 : PI - 0.3, { alpha: A * (1 - inv * 2), white: '#cfe6ff', iris: '#3a7ad8', pupil: 0.42, dazed: c.stun > 0 });
      else {
        // pineapple posture: the cloak pulled up over everything, soft spines out
        const k = inv * 2 - 1;
        ctx.globalAlpha = A * k; ctx.fillStyle = '#3a0e1e';
        ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 1.02, r * 1.08, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#f0b0c0'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath();
        for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 12; i++) {
          const a = i * TAU / 12 + ring * 0.26 + sin(t * 1.5 + i) * 0.04, r0 = r * (ring ? 0.5 : 0.86), r1 = r0 + r * (ring ? 0.22 : 0.34) * k;
          ctx.moveTo(cos(a) * r0, -r * 0.1 + sin(a) * r0 * 1.05); ctx.lineTo(cos(a) * r1, -r * 0.1 + sin(a) * r1 * 1.05);
        }
        ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const A = c.alpha, r = c.r, t = G.time, y0 = c.y + sin(t * 1.8 + c.ph) * 2;
      for (let s = -1; s <= 1; s += 2) G.drawGlow(ctx, c.x + s * r * 0.55, y0 - r * 0.62, 5.5, '#7fb8ff', 0.62 * A * (1 - c.inv * 0.6));
      if (c.tipK > 0.03) {
        for (let i = 0; i < 8; i++) {      // arm tips: along the hem when open, crowning the ball when it is not
          const a = lerp(PI * (0.14 + 0.72 * i / 7), -PI * (0.14 + 0.72 * i / 7), c.inv);
          G.drawGlow(ctx, c.x + cos(a) * r * 1.3, y0 + sin(a) * r * 1.3 + r * 0.2 * (1 - c.inv), 4.6, '#59c8ff', c.tipK * (0.55 + 0.45 * sin(t * 9 + i * 1.3)) * A);
        }
      }
    },
  });

  // ---- pelican eel: mostly mouth, then a long afterthought with a light on the end
  G.defCreature('gulper', {
    r: 19, hp: 132, hostile: true, dmg: 1, xp: 10, pearl: 0.32, mass: 2.2, color: '#ff8ac0', leash: 220, viewR: 260, showR: 62,
    init(c) { c.ch = kit.chain(15, 9); kit.chainSet(c.ch, c.x, c.y, c.face); c.gape = 0.05; c.cd = G.rr(1.5, 3); c.swim = 0; c.touch = false; c.tailX = c.x; c.tailY = c.y; },
    show(c) { c.gape = 0.15 + 0.85 * max(0, sin(c.t * 0.8)); },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 420, dt), pl = G.player, st = c.st;
      c.cd -= dt;
      if (st === 'idle') {
        c.gape = damp(c.gape, 0.06, 4, dt);
        if (aggro) {
          if (c.pd > 300) ai.chase(c, p, 95, 2, dt); else ai.wander(c, 40, dt);
          ai.face(c, ai.toPlayer(c, p), 2.5, dt);
          if (c.cd <= 0 && c.pd < 400 && !p.dead && ai.see(c, p, 400)) { ai.set(c, 'gape'); G.sfx('inflate', { x: c.x, y: c.y }); }
        } else { ai.wander(c, 34, dt); ai.faceVel(c, 3, dt); }
      } else if (st === 'gape') {
        ai.brake(c, 4, dt); ai.face(c, ai.toPlayer(c, p), 6, dt);
        c.gape = damp(c.gape, 1, 7, dt);
        if (c.stT > 0.6) { ai.set(c, 'inhale'); G.sfx('whoosh', { x: c.x, y: c.y }); }
      } else if (st === 'inhale') {
        ai.brake(c, 4, dt); ai.face(c, ai.toPlayer(c, p), 1.6, dt);
        c.gape = 1;
        const fa = c.face, mx = c.x + cos(fa) * 22, my = c.y + sin(fa) * 22;
        const dx = mx - pl.x, dy = my - pl.y, d = hypot(dx, dy) || 1, off = abs(G.angDiff(fa, atan2(-dy, -dx)));
        if (!pl.dead && d < 470 && off < 0.95 && G.los(mx, my, pl.x, pl.y)) {      // the sea pours in, and takes the probe with it
          const k = (1 - d / 470) * (1 - off / 0.95 * 0.5) * 1900;
          pl.ax += dx / d * k; pl.ay += dy / d * k;
          if (d < 30 && pl.inv <= 0) { pl.hurt(1, c.x, c.y); ai.set(c, 'snap'); G.sfx('snap', { x: c.x, y: c.y }); }
        }
        if (G.rand() < dt * 34) {
          const a = fa + G.rr(-0.8, 0.8), dd = G.rr(120, 430), sx = mx + cos(a) * dd, sy = my + sin(a) * dd;
          if (G.sdf(sx, sy) > 4) G.particles.mote(sx, sy, -cos(a) * dd * 2, -sin(a) * dd * 2, '#9fd8ff', G.rr(2.5, 5), 0.45, 0, 0);
        }
        if (c.st === 'inhale' && c.stT > 1.6) { ai.set(c, 'snap'); G.sfx('snap', { x: c.x, y: c.y }); }
      } else if (st === 'snap') {
        c.gape = damp(c.gape, 0, 26, dt);
        if (c.stT > 0.25) ai.set(c, 'rest');
      } else {
        c.gape = damp(c.gape, 0.05, 6, dt); ai.brake(c, 1.5, dt);
        if (c.stT > 1.4) { ai.set(c, 'idle'); c.cd = G.rr(2.2, 3.4); }
      }
      c.touch = st === 'inhale' || st === 'snap';
    },
    anim(c, dt) {
      const ch = c.ch, n = ch.n, X = ch.x, Y = ch.y;
      kit.chainFollow(ch, c.x, c.y, c.face, 0.5);
      c.swim += dt * (3.2 + hypot(c.vx, c.vy) * 0.04);
      const i = n - 1; let tx = X[i - 1] - X[i], ty = Y[i - 1] - Y[i]; const l = hypot(tx, ty) || 1, w = sin(c.swim - i * 0.6) * 5 * (i / n);
      c.tailX = X[i] - ty / l * w; c.tailY = Y[i] + tx / l * w;
    },
    draw(c, ctx) {
      const A = c.alpha, ch = c.ch, n = ch.n, X = ch.x, Y = ch.y, t = c.swim;
      ctx.globalAlpha = A; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // body: a long taper, three strokes of shrinking width
      for (let g = 0; g < 3; g++) {
        const a = g === 0 ? 0 : g === 1 ? 4 : 9, b = g === 0 ? 4 : g === 1 ? 9 : n - 1;
        ctx.strokeStyle = g === 0 ? '#4a3a48' : g === 1 ? '#40313e' : '#352834'; ctx.lineWidth = g === 0 ? 8.5 : g === 1 ? 5 : 2.3;
        ctx.beginPath();
        for (let i = a; i <= b; i++) {
          const i0 = i > 0 ? i - 1 : 0, i1 = i < n - 1 ? i + 1 : n - 1, tx = X[i0] - X[i1], ty = Y[i0] - Y[i1], l = hypot(tx, ty) || 1;
          const w = sin(t - i * 0.6) * 5 * (i / n), px = X[i] - ty / l * w, py = Y[i] + tx / l * w;
          if (i === a) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      // the mouth
      const fa = c.face, ga = 0.14 + c.gape * 0.95, L = 18 + c.gape * 30, hx = X[0] - cos(fa) * 3, hy = Y[0] - sin(fa) * 3, s = cos(fa) >= 0 ? -1 : 1;
      const ua = fa + s * ga, la = fa - s * ga;                  // dorsal jaw, belly jaw
      const ux = hx + cos(ua) * L, uy = hy + sin(ua) * L, lx = hx + cos(la) * L, ly = hy + sin(la) * L;
      const bx = hx - cos(fa) * 9, by = hy - sin(fa) * 9;
      ctx.fillStyle = '#5a1630';
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ux, uy); ctx.quadraticCurveTo(hx + cos(fa) * L * 0.5, hy + sin(fa) * L * 0.5, lx, ly); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#40313e';     // the pouch, slung under the lower jaw
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lx, ly);
      ctx.quadraticCurveTo(hx + cos(la - s * 0.8) * L * 1.2, hy + sin(la - s * 0.8) * L * 1.2, bx, by); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ux, uy);
      ctx.quadraticCurveTo(hx + cos(ua + s * 0.6) * L * 0.7, hy + sin(ua + s * 0.6) * L * 0.7, bx, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6a5462'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ux, uy); ctx.moveTo(hx, hy); ctx.lineTo(lx, ly); ctx.stroke();
      // a very small eye, a very long way forward
      ctx.fillStyle = c.stun > 0 ? '#fff2a8' : '#e8f0ff'; ctx.beginPath(); ctx.arc(hx + cos(ua) * L * 0.84 + cos(ua + s * PI / 2) * 2.4, hy + sin(ua) * L * 0.84 + sin(ua + s * PI / 2) * 2.4, 1.7, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const A = c.alpha, t = G.time;
      G.drawGlow(ctx, c.tailX, c.tailY, 8 + sin(t * 4 + c.ph) * 1.6, '#ff7ab8', 0.85 * A);
      G.drawGlow(ctx, c.tailX, c.tailY, 2.6, '#ffffff', 0.8 * A);
      if (c.gape > 0.3) { const fa = c.face; G.drawGlow(ctx, c.x + cos(fa) * 24, c.y + sin(fa) * 24, 16 + c.gape * 22, '#ff9ab8', 0.22 * c.gape * A); }
    },
    light(c) { G.lights.add(c.tailX, c.tailY, 54, '#ff7ab8', 0.3); },
  });

  // =================================================================== THE LURE
  function placeDecoys(c, hard) {
    const A = G.zone.arena, p = G.player, n = hard ? 7 : 5, base = G.rand() * TAU, slots = [];
    for (let k = 0; k <= n; k++) {
      const a = base + k * TAU / (n + 1) + G.rr(-0.18, 0.18);
      let x = A.x + cos(a) * A.rx * 0.6, y = A.y + sin(a) * A.ry * 0.56;
      for (let it = 0; it < 10 && G.sdf(x, y) < 66; it++) { x += (A.x - x) * 0.14; y += (A.y - y) * 0.14; }
      slots.push({ x, y, d: hypot(x - p.x, y - p.y) });
    }
    let me = 0, tries = 0;
    do { me = (G.rand() * slots.length) | 0; tries++; } while (slots[me].d < 250 && tries < 14);
    c.decoys.length = 0;
    for (let k = 0; k < slots.length; k++) if (k !== me) c.decoys.push({ x: slots[k].x, y: slots[k].y, t: -0.08 * k, pop: false, fuse: -1, loud: 0, ph: G.rand() * TAU });
    return slots[me];
  }
  function popDecoy(q, shots) {
    if (q.pop) return;
    q.pop = true;
    G.particles.ring(q.x, q.y, 6, 60, MOTE, 0.3, 3); G.particles.sparks(q.x, q.y, 8, MOTE, { s0: 60, s1: 240, life: 0.3 });
    G.lights.flash(q.x, q.y, 220, MOTE, 0.2, 0.9); G.sfx('pop', { x: q.x, y: q.y });
    if (shots) G.eshots.ring(q.x, q.y, shots, 180, { r: 5, color: SPIT, life: 2.6 }, G.rand() * TAU);
  }
  function lurePick(c, hard) {
    c.count++;
    const r = G.rand();
    if (c.count % 4 === 0) { ai.set(c, 'darkOut'); G.sfx('telegraph', { x: c.x, y: c.y }); }
    else if (r < 0.42) { c.n = hard ? 2 : 1; c.quick = false; ai.set(c, 'lungeAim'); G.sfx('telegraph', { x: c.x, y: c.y }); }
    else if (r < 0.76) { c.n = hard ? 4 : 3; c.acc = 0.4; ai.set(c, 'spit'); }
    else { c.n = hard ? 5 : 3; c.acc = 0.35; ai.set(c, 'flash'); }
  }

  G.defCreature('lure', {
    boss: true, hostile: true, r: 46, hp: 3400, dmg: 1, xp: 0, mass: 30, color: MOTE, scanTime: 2, scanXp: 16, flareResist: true, viewR: 440, noSep: true, showR: 92, showY: 26,
    title: 'THE LURE', latin: 'Melanocetus johnsonii', epithet: 'black seadevil', relic: 'lure', music: 'boss',
    init(c) {
      c.rod = kit.rope(6, 15); c.face = 0; kit.ropeSet(c.rod, c.x + 23, c.y - 41, 0.3, -0.95);
      c.jaw = 0.2; c.lk = 0; c.lamp = 1; c.vis = 1; c.cd = 1.5; c.phase = 1; c.n = 0; c.da = 0; c.went = 0; c.reach = 0; c.acc = 0; c.swim = 0;
      c.count = 0; c.decoys = []; c.hpDark = 0; c.darkT = 4; c.restT = 1; c.orbit = 1; c.quick = false;
    },
    wake(c) { ai.set(c, 'idle'); c.cd = 1.6; G.lights.ambTarget = 0.4; },
    onFlee(c) { G.lights.ambTarget = 1; for (const q of c.decoys) q.pop = true; c.hidden = false; },
    onHit(c, dmg) { if (c.st === 'dark') return dmg * 1.5; },
    show(c) { c.jaw = 0.22 + 0.3 * max(0, sin(c.t * 1.2)); c.lamp = 1; c.vis = 1; },
    think(c, dt, p) {
      const pl = G.player, A = G.zone.arena;
      if (c.asleep) { ai.brake(c, 3, dt); c.jaw = damp(c.jaw, 0.12 + 0.04 * sin(c.t), 3, dt); c.lamp = 0.8 + 0.2 * sin(c.t * 1.3); return; }
      // decoys on a fuse go off whatever else is happening
      for (const q of c.decoys) { if (!q.pop && q.fuse >= 0) { q.fuse -= dt; if (q.fuse < 0) popDecoy(q, q.loud); } }
      const hard = c.hp < c.maxHp * 0.5;
      if (hard && c.phase === 1) {
        c.phase = 2; c.hidden = false; c.vis = 1;
        for (const q of c.decoys) q.pop = true;
        G.sfx('roar'); G.cam.shake(0.5); G.fx.punch(0.5, 0.2);
        G.particles.ring(c.x, c.y, 30, 260, '#ff9a5a', 0.5, 4);
        G.hud.toast('It has stopped pretending', '', { color: '#ff9a5a', life: 2.6 });
        for (let s = -1; s <= 1; s += 2) {
          let x = A.x + s * A.rx * 0.55, y = A.y + G.rr(-60, 60);
          for (let it = 0; it < 8 && G.sdf(x, y) < 40; it++) { x += (A.x - x) * 0.15; y += (A.y - y) * 0.15; }
          const m = G.creatures.spawn('angler', x, y, { minion: true });
          if (m) { m.hp = m.maxHp = 70; }
        }
        ai.set(c, 'recover'); c.restT = 0.8;
      }
      const toP = ai.toPlayer(c, p), d = c.pd, st = c.st;
      if (st === 'idle') {
        const a = atan2(c.y - p.y, c.x - p.x) + c.orbit * 0.6;
        const tx = clamp(p.x + cos(a) * 310, A.x - A.rx * 0.72, A.x + A.rx * 0.72), ty = clamp(p.y + sin(a) * 310, A.y - A.ry * 0.6, A.y + A.ry * 0.6);
        ai.seek(c, tx, ty, hard ? 150 : 115, 2, dt); ai.avoid(c, 80, 900, dt);
        ai.face(c, toP, 4, dt);
        c.jaw = damp(c.jaw, 0.22 + 0.1 * sin(c.t * 2), 4, dt); c.lk = damp(c.lk, 0, 4, dt); c.lamp = damp(c.lamp, 1, 4, dt); c.vis = damp(c.vis, 1, 5, dt);
        if (G.rand() < dt * 0.25) c.orbit = -c.orbit;
        c.cd -= dt;
        if (c.cd <= 0 && !p.dead) lurePick(c, hard);
      } else if (st === 'lungeAim') {
        const T = c.quick ? 0.42 : hard ? 0.52 : 0.72;
        ai.face(c, toP, 9, dt); ai.steer(c, -cos(toP), -sin(toP), 50, 4, dt);
        c.jaw = damp(c.jaw, 1, 10, dt); c.lk = damp(c.lk, 1, 12, dt); c.lamp = damp(c.lamp, 1, 8, dt); c.vis = damp(c.vis, 1, 6, dt);
        if (c.stT > T) { c.da = c.face; c.reach = clamp(d + 140, 320, 720); c.went = 0; ai.set(c, 'lunge'); G.sfx('whoosh', { x: c.x, y: c.y }); G.sfx('growl', { x: c.x, y: c.y }); }
      } else if (st === 'lunge') {
        const sp = 800;
        c.vx = cos(c.da) * sp; c.vy = sin(c.da) * sp; c.went += sp * dt;
        if (c.went > c.reach * 0.75) c.jaw = damp(c.jaw, 0, 26, dt);
        if (G.rand() < dt * 50) G.particles.bubble(c.x - cos(c.da) * 40 + G.rr(-16, 16), c.y - sin(c.da) * 40 + G.rr(-16, 16), G.rr(2, 5), 0, 0, 0.8);
        const wall = G.sdf(c.x + cos(c.da) * 62, c.y + sin(c.da) * 62) < 8;
        if (c.went >= c.reach || wall) {
          c.vx *= 0.12; c.vy *= 0.12; c.n--;
          G.sfx('snap', { x: c.x, y: c.y }); G.cam.shake(wall ? 0.35 : 0.18);
          if (wall) { G.particles.dust(c.x + cos(c.da) * 50, c.y + sin(c.da) * 50, 10, G.css(G.zone.def.rockL), 110); G.sfx('bump', { v: 1 }); }
          if (c.n > 0) { c.quick = true; ai.set(c, 'lungeAim'); G.sfx('telegraph', { x: c.x, y: c.y }); }
          else { c.quick = false; ai.set(c, 'recover'); c.restT = wall ? 1.3 : 0.9; if (wall) c.stun = 0.8; }
        }
      } else if (st === 'spit') {
        ai.face(c, toP, 6, dt); ai.brake(c, 3, dt);
        if (d < 240) ai.steer(c, -cos(toP), -sin(toP), 110, 3, dt);
        c.acc -= dt;
        c.jaw = damp(c.jaw, c.acc < 0.22 ? 1 : 0.3, 14, dt); c.lk = damp(c.lk, 0.2, 4, dt);
        if (c.acc <= 0) {
          c.acc = hard ? 0.46 : 0.58; c.n--;
          const mx = c.x + cos(c.face) * c.r * 0.9, my = c.y + sin(c.face) * c.r * 0.9, tt = d / 260;
          const a = atan2(p.y + (p.vy || 0) * tt * 0.5 - my, p.x + (p.vx || 0) * tt * 0.5 - mx), wide = (c.n & 1) === 0;
          G.eshots.fan(mx, my, a, hard ? (wide ? 7 : 6) : (wide ? 5 : 4), wide ? 1.15 : 0.8, 250, { r: 6, color: SPIT, life: 3.2 });
          G.sfx('spit', { x: mx, y: my }); G.particles.ring(mx, my, 6, 46, SPIT, 0.2, 3); G.lights.flash(mx, my, 180, SPIT, 0.14, 0.9);
          c.kx -= cos(c.face) * 60; c.ky -= sin(c.face) * 60;
          if (c.n <= 0) { ai.set(c, 'recover'); c.restT = 0.6; }
        }
      } else if (st === 'flash') {
        ai.brake(c, 3, dt); ai.face(c, toP, 4, dt);
        c.lk = damp(c.lk, 0.5, 6, dt); c.jaw = damp(c.jaw, 0.5, 5, dt);
        c.acc -= dt;
        if (c.acc <= 0) {
          c.acc = hard ? 0.34 : 0.42; c.n--;
          G.hazards.add({ x: pl.x + pl.vx * 0.3, y: pl.y + pl.vy * 0.3, r: 66, delay: 0.85, color: MOTE });
          G.sfx('telegraph', { x: pl.x, y: pl.y });
          if (c.n <= 0) { ai.set(c, 'recover'); c.restT = 0.9; }
        }
      } else if (st === 'darkOut') {
        ai.brake(c, 4, dt);
        c.lamp = damp(c.lamp, 0, 9, dt); c.lk = damp(c.lk, 0, 6, dt); c.jaw = damp(c.jaw, 0.1, 5, dt);
        if (c.stT > 0.5) c.vis = damp(c.vis, 0, 12, dt);
        if (c.stT > 0.78) {
          for (let i = 0; i < 4; i++) G.particles.ink(c.x + G.rr(-30, 30), c.y + G.rr(-30, 30), G.rr(30, 50), G.rr(1.4, 2.2), G.rr(-20, 20), G.rr(-20, 20));
          const me = placeDecoys(c, hard);
          c.x = me.x; c.y = me.y; c.vx = c.vy = 0; c.kx = c.ky = 0;
          c.face = atan2(pl.y - c.y, pl.x - c.x);
          kit.ropeSet(c.rod, c.x, c.y - c.r, 0.3, -0.95);
          c.hidden = true; c.hpDark = c.hp; c.darkT = hard ? 3.8 : 4.6; c.lamp = 0; c.vis = 0;
          ai.set(c, 'dark'); G.sfx('pulse', { x: c.x, y: c.y });
        }
      } else if (st === 'dark') {
        ai.brake(c, 5, dt); ai.face(c, toP, 2, dt);
        c.vis = damp(c.vis, 1, 4, dt); c.lamp = damp(c.lamp, 1, 3, dt); c.jaw = damp(c.jaw, 0.12, 4, dt);
        for (const q of c.decoys) q.t += dt;
        const shots = G.ents.shots;          // the probe's own pulses set the false lights off
        for (let i = 0; i < shots.length; i++) {
          const s = shots[i];
          if (s.dead) continue;
          for (const q of c.decoys) {
            if (q.pop || q.t < 0.3) continue;
            const dx = s.x - q.x, dy = s.y - q.y;
            if (dx * dx + dy * dy < 400) { popDecoy(q, hard ? 12 : 10); G.shots.end(s, false); break; }
          }
        }
        if (c.hpDark - c.hp >= 170) {         // found: the rest go out quietly
          for (const q of c.decoys) if (!q.pop) { q.pop = true; G.particles.motes(q.x, q.y, 5, MOTE, { s0: 10, s1: 60, life: 0.5 }); }
          c.hidden = false; c.stun = 1.3; ai.set(c, 'recover'); c.restT = 1.7;
          G.particles.text(c.x, c.y - c.r - 22, 'FOUND', MOTE, 13, 1); G.sfx('scanDone');
        } else if (c.stT > c.darkT) {         // never found: the lanterns burst, and it comes
          let k = 0;
          for (const q of c.decoys) if (!q.pop) { q.fuse = k * 0.11; q.loud = hard ? 9 : 8; k++; }
          c.hidden = false; c.quick = true; c.n = hard ? 2 : 1; ai.set(c, 'lungeAim'); G.sfx('telegraph', { x: c.x, y: c.y });
        }
      } else {          // recover
        ai.brake(c, 3, dt); ai.face(c, toP, 3, dt);
        c.jaw = damp(c.jaw, 0.2, 4, dt); c.lk = damp(c.lk, 0, 5, dt); c.lamp = damp(c.lamp, 1, 4, dt); c.vis = damp(c.vis, 1, 5, dt);
        if (c.stT > c.restT) { ai.set(c, 'idle'); c.cd = hard ? G.rr(0.5, 1) : G.rr(0.9, 1.5); }
      }
      c.touch = !(st === 'darkOut' && c.stT > 0.5);
    },
    anim(c, dt) {
      c.swim += dt * (3 + hypot(c.vx, c.vy) * 0.02);
      fishPt(c, c.r * 0.5, -c.r * 0.9, _q);
      const sway = c.st === 'dark' ? sin(c.t * 2.3) * 420 : sin(c.t * 1.1) * 70;
      kit.ropeStep(c.rod, _q.x, _q.y, dt, cos(c.face) * 90 + sway, -270, pow(0.86, dt * 60));
    },
    draw(c, ctx) {
      const A = c.alpha * c.vis, r = c.r, fa = c.face, flip = cos(fa) < 0 ? -1 : 1, rod = c.rod, e = rod.n - 1;
      if (A < 0.01) return;
      kit.ropeDraw(ctx, rod, 3, 1.4, '#6a5a6a', A);
      ctx.globalAlpha = A; ctx.fillStyle = '#e8ffd0'; ctx.beginPath(); ctx.arc(rod.x[e], rod.y[e], 5, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(fa); ctx.scale(1, flip);
      const skin = c.phase === 2 ? SKIN_LURE2 : SKIN_LURE; skin.ph = c.ph;
      anglerBody(ctx, r, c.jaw, c.swim, skin);
      // gill slit and a few old scars
      ctx.strokeStyle = 'rgba(16,10,20,0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-r * 0.1, r * 0.1, r * 0.5, 2.2, 3.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(220,200,230,0.22)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(-r * 0.2, -r * 0.66); ctx.moveTo(-r * 0.62, -r * 0.2); ctx.lineTo(-r * 0.4, -r * 0.3); ctx.stroke();
      kit.eye(ctx, r * 0.42, -r * 0.46, r * 0.1, (ai.toPlayer(c, G.player) - fa) * flip, { alpha: A, white: '#d8e0f0', pupil: 0.5, dazed: c.stun > 0, angry: 0.9, lidCol: '#241c2e' });
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const t = G.time, A = c.alpha, rod = c.rod, e = rod.n - 1, lx = rod.x[e], ly = rod.y[e];
      const strobe = c.st === 'lungeAim' || c.st === 'flash' ? 0.55 + 0.45 * sin(t * 42) : 1;
      if (c.lamp > 0.02) moteGlow(ctx, lx, ly, 20, c.lk, c.lamp * A, strobe);
      if (!c.asleep && c.st !== 'dark' && c.st !== 'darkOut') { fishPt(c, c.r * 0.42, -c.r * 0.46, _q); G.drawGlow(ctx, _q.x, _q.y, 9, '#ffd9b0', 0.5 * A * c.vis); }
      if (c.st === 'lungeAim') {
        const u = min(1, c.stT / 0.5), a = c.face, d = G.raycast(c.x, c.y, cos(a), sin(a), 760);
        ctx.globalAlpha = 0.14 + 0.42 * u; ctx.strokeStyle = '#ffc9a0'; ctx.lineWidth = 2 + 5 * u; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 150;
        ctx.beginPath(); ctx.moveTo(c.x + cos(a) * 52, c.y + sin(a) * 52); ctx.lineTo(c.x + cos(a) * d, c.y + sin(a) * d); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      for (const q of c.decoys) {          // false lights: they hang perfectly still
        if (q.pop || q.t <= 0) continue;
        moteGlow(ctx, q.x, q.y, 20, 0, min(1, q.t * 2) * (0.9 + 0.1 * sin(t * 7 + q.ph)), 1);
      }
      if (c.phase === 2 && !c.fleeing) G.drawGlow(ctx, c.x, c.y, c.r * 1.5, '#ff6a5a', 0.1 * c.vis + 0.04 * sin(t * 5));
    },
    light(c) {
      const rod = c.rod, e = rod.n - 1;
      if (c.lamp > 0.02) G.lights.add(rod.x[e], rod.y[e], 210, MOTE, 0.6 * c.lamp);
      for (const q of c.decoys) if (!q.pop && q.t > 0) G.lights.add(q.x, q.y, 120, MOTE, 0.4 * min(1, q.t * 2));
    },
  });

  // =================================================================== field notes
  const add = G.codexAdd;
  add('zoanthid', { name: 'Deep-sea Zoanthid', latin: 'Epizoanthus sp.', zone: 2, kind: 'flora', size: '2 cm each', decor: 'glowpolyp', showR: 24, showY: 8, notes: 'They light up when I pass. Not at me. Because of me. I have checked the difference several times, and it matters a little less each time. They answer the sonar too, a moment late, like an echo with manners.' });
  add('bamboo', { name: 'Bamboo Coral', latin: 'Isidella tentaculum', zone: 2, kind: 'flora', size: '60 cm', decor: 'bamboo', showR: 54, showY: 38, notes: 'Touch one branch and the light runs down the whole colony, joint by joint, like a thought crossing a mind. Some of these are older than any ship that ever sailed. I touched it anyway. Gently. Twice.' });
  add('crinoid', { name: 'Sea Lily', latin: 'Bathycrinus sp.', zone: 2, kind: 'fauna', size: '40 cm', decor: 'crinoid', showR: 48, showY: 34, notes: 'A starfish\'s cousin on a stalk, combing the snow out of the water with its arms. Its family has looked like this for 480 million years. It folds up when I come close and opens when I leave. I am starting to notice a pattern in how the deep feels about me.' });
  add('barreleye', { name: 'Barreleye', latin: 'Macropinna microstoma', zone: 2, kind: 'fauna', size: '15 cm', notes: 'Its head is a clear dome and its eyes are inside it: two green barrels pointed straight up, watching for shadows. The things on its face that look like eyes are nostrils. The real ones swivelled forward to look at me. I was not built to feel seen, and yet.' });
  add('seaangel', { name: 'Sea Angel', latin: 'Clione limacina', zone: 2, kind: 'fauna', size: '3 cm', notes: 'A snail that gave up its shell and learned to fly instead. It is about the size of my lamp\'s reflection and is not afraid of anything, as far as I can tell. I followed one for a while. I do not have a good reason, and nobody is asking.' });
  add('angler', { name: 'Footballfish', latin: 'Himantolophus groenlandicus', zone: 2, kind: 'fauna', size: '45 cm', notes: 'The light is bacteria. The fish only grows the lantern and lets them live in it. Every one I have met is female; the males are a few centimetres long and spend their lives fused to her side. The lure looks exactly like the glow I collect. That is not a coincidence, and I keep falling for it.' });
  add('viperfish', { name: 'Sloane\'s Viperfish', latin: 'Chauliodus sloani', zone: 2, kind: 'fauna', size: '30 cm', notes: 'Teeth too long for its mouth; they slide up past its eyes when it closes. It hits prey so hard that the first bone of its spine works as a shock absorber. I have been the prey in this experiment more than once. The lights along its belly are how I see it coming.' });
  add('vampsquid', { name: 'Vampire Squid', latin: 'Vampyroteuthis infernalis', zone: 2, kind: 'fauna', size: '30 cm', notes: 'The name means vampire squid from hell. It is not a vampire, it is not a squid, and it eats drifting snow. When frightened it turns itself inside out into a ball of soft spines and throws glowing mucus, because ink is no use where it is already dark. I respect an animal that has been this badly served by its publicist.' });
  add('gulper', { name: 'Pelican Eel', latin: 'Eurypharynx pelecanoides', zone: 2, kind: 'fauna', size: '75 cm', notes: 'Mostly mouth, then a long afterthought. The jaw unfolds into a bag bigger than the rest of the animal and the sea simply pours in, with me in it if I am slow. There is a small pink light at the very end of its tail. I assume it is so the mouth can find the rest of itself.' });
  add('lure', { name: 'Black Seadevil', latin: 'Melanocetus johnsonii', zone: 2, kind: 'fauna', boss: true, size: '18 cm, usually', notes: 'I followed a light for four hundred metres because it looked like company. It was attached to this. When it wanted to hide it did not go anywhere: it hung a dozen false lanterns and let me choose. I have been thinking about that. Down here a light is a promise, and it has learned to make ones it does not mean to keep. I would rather not learn that.' });

  // =================================================================== who lives where
  const H = G.popHelp;
  const LANTERN = { tint: '#4f6f96', glowCol: '#7fd8ff', codexId: 'lanternfish' };
  G.ZONE_CONTENT[2] = {
    boss: 'lure',
    pockets: ['pod', 'cleaner', 'wreck', 'pod', 'nest', 'pod'],
    hostiles: [
      { type: 'viperfish', cost: 2, w: 3 },
      { type: 'vampsquid', cost: 3, w: 2 },
      { type: 'angler', cost: 4, w: 2, minT: 0.12 },
      { type: 'gulper', cost: 4, w: 1.5, minT: 0.34 },
    ],
    budget: t => 4.5 + t * 6.5,
    decorAt(zone, rng, x, y, nx, ny) {
      if (y < 420) return;                  // keep the Hermit's ledge tidy
      const D = G.decor, r = rng(), floorish = ny < -0.7, ceil = ny > 0.7, s = rng.range(0.85, 1.2);
      if (floorish) {
        if (r < 0.055) { D.add('crinoid', x, y + 2, nx, ny, { s }); H.specimen('crinoid', x + nx * 30, y + ny * 30, 2, 30); }
        else if (r < 0.09) { D.add('bamboo', x, y + 2, nx, ny, { s }); H.specimen('bamboo', x + nx * 30, y + ny * 30, 2, 34); }
        else if (r < 0.135) { D.add('glowpolyp', x, y, nx, ny, { s }); H.specimen('zoanthid', x + nx * 8, y + ny * 8, 3, 24); }
        else if (r < 0.141) D.add('bubbler', x, y, nx, ny);
      } else if (ceil) {
        if (r < 0.05) { D.add('glowpolyp', x, y, nx, ny, { s }); H.specimen('zoanthid', x + nx * 8, y + ny * 8, 3, 24); }
        else if (r < 0.07) D.add('bamboo', x, y - 2, nx, ny, { s: s * 0.85 });
      } else {
        if (r < 0.06) { D.add('glowpolyp', x, y, nx, ny, { s }); H.specimen('zoanthid', x + nx * 8, y + ny * 8, 3, 24); }
        else if (r < 0.08) D.add('bamboo', x - nx * 2, y - ny * 2, nx, ny, { s: s * 0.9 });
        else if (r < 0.095) D.add('crinoid', x, y, nx, ny, { s: s * 0.9 });
      }
    },
    ambient(zone, rng, H) {
      const CR = G.creatures, A = zone.arena;
      for (const c of zone.chambers) {
        if (rng.chance(0.65)) { const p = H.open(rng, c.x, c.y, c.r * 0.5, 50); if (p) CR.spawn('school', p.x, p.y, Object.assign({ n: rng.int(9, 15) }, LANTERN)); }
        if (rng.chance(0.5)) { const p = H.open(rng, c.x, c.y - c.r * 0.3, c.r * 0.5, 30); if (p) CR.spawn('barreleye', p.x, p.y); }
        const n = rng.int(0, 3);
        for (let i = 0; i < n; i++) { const p = H.open(rng, c.x, c.y, c.r * 0.8, 20); if (p) CR.spawn('seaangel', p.x, p.y); }
      }
      zone.path.forEach((p, i) => {
        if (i % 4 !== 2 || p.y < 520 || p.y > A.gateY - 200 || !rng.chance(0.55)) return;
        const q = H.open(rng, p.x, p.y, 40, 18);
        if (q) CR.spawn(rng.chance(0.3) ? 'barreleye' : 'seaangel', q.x, q.y);
      });
    },
  };
})();
