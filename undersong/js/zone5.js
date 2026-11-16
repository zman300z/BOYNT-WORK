'use strict';
/* UNDERSONG — the Trench (hadal zone) and the Garden at the bottom of it.
   Quiet on purpose. Amphipod swarms, ghostly snailfish, a swimming sea cucumber, a whale fall,
   something's arms reaching out of the rock to sort you — and then a cavern full of collected lights. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, PI, hypot, floor, pow } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit, ai = G.ai;
  const _v = { x: 0, y: 0 };
  const pick = arr => arr[(G.rand() * arr.length) | 0];

  // one colour per voice: D A F C E G, and the seventh
  G.NOTE_COLORS = ['#ff7a6a', '#ffb45a', '#ffe66a', '#7dffb0', '#6ad8ff', '#9a8cff', '#ffffff'];

  // ---- reach: pin a chain at (bx,by) and pull its tip to (tx,ty) (FABRIK), with a little life in the middle
  kit.reach = function (ch, bx, by, tx, ty, wig, t) {
    const n = ch.n, seg = ch.seg, X = ch.x, Y = ch.y, maxR = seg * (n - 1) * 0.985;
    let dx = tx - bx, dy = ty - by, d = hypot(dx, dy) || 1e-4;
    if (d > maxR) { tx = bx + dx / d * maxR; ty = by + dy / d * maxR; d = maxR; }
    if (wig) { const px = -dy / d, py = dx / d; for (let i = 1; i < n - 1; i++) { const u = i / (n - 1), k = sin(u * PI) * wig * sin(t * 1.7 + i * 0.55); X[i] += px * k; Y[i] += py * k; } }
    for (let it = 0; it < 2; it++) {
      X[n - 1] = tx; Y[n - 1] = ty;
      for (let i = n - 2; i >= 0; i--) { dx = X[i] - X[i + 1]; dy = Y[i] - Y[i + 1]; d = hypot(dx, dy) || 1e-4; X[i] = X[i + 1] + dx / d * seg; Y[i] = Y[i + 1] + dy / d * seg; }
      X[0] = bx; Y[0] = by;
      for (let i = 1; i < n; i++) { dx = X[i] - X[i - 1]; dy = Y[i] - Y[i - 1]; d = hypot(dx, dy) || 1e-4; X[i] = X[i - 1] + dx / d * seg; Y[i] = Y[i - 1] + dy / d * seg; }
    }
  };
  // tapered arm along a chain, with suckers down one side
  const RIB = [];
  kit.tentacle = function (ctx, ch, w0, w1, col, under, alpha, suck) {
    const n = ch.n, X = ch.x, Y = ch.y;
    RIB.length = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < n; k++) {
        const i = pass ? n - 1 - k : k, i0 = max(0, i - 1), i1 = min(n - 1, i + 1);
        let tx = X[i1] - X[i0], ty = Y[i1] - Y[i0]; const l = hypot(tx, ty) || 1; tx /= l; ty /= l;
        const w = lerp(w0, w1, i / (n - 1)) * 0.5 * (pass ? -1 : 1);
        RIB.push(X[i] - ty * w, Y[i] + tx * w);
      }
    }
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = col; ctx.beginPath(); G.smoothPath(ctx, RIB, true); ctx.fill();
    if (suck) {
      ctx.fillStyle = under;
      for (let i = 3; i < n - 1; i++) {
        const tx = X[i + 1] - X[i - 1], ty = Y[i + 1] - Y[i - 1], l = hypot(tx, ty) || 1, w = lerp(w0, w1, i / (n - 1)) * 0.3 * suck;
        ctx.beginPath(); ctx.arc(X[i] + ty / l * w, Y[i] - tx / l * w, max(1, w * 0.55), 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  // ================================================================= scenery
  // xenophyophore: a single cell the size of a cabbage
  G.defDecor('xeno', {
    r: 30,
    init(d) { d.s *= G.rr(0.8, 1.3); d.sd = (G.rand() * 9999) | 0; },
    draw(d, ctx) {
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang + PI / 2); ctx.scale(d.s, d.s);
      for (let i = 0; i < 7; i++) {
        const a = -PI + i * PI / 6, r = 13 + 5 * G.hash1(i, d.sd), cx = cos(a) * 9, cy = -6 + sin(a) * 3;
        ctx.fillStyle = i & 1 ? '#c9c3b4' : '#aaa598';
        ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.3, r * 0.5, r * 0.9, a * 0.5 + PI / 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(70,66,60,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.3, r * 0.5, r * 0.9, a * 0.5 + PI / 2, PI, TAU); ctx.stroke();
      }
      ctx.restore();
    },
  });

  // whale fall: a skeleton that has been feeding a town for decades
  G.defDecor('whalefall', {
    r: 190, back: false, reactR: 150, reactIn: 6, reactOut: 0.8,
    init(d) { d.worms = []; for (let i = 0; i < 26; i++) d.worms.push({ u: G.rand(), h: G.rr(5, 11), ph: G.rand() * TAU, rib: (G.rand() * 8) | 0 }); },
    update(d, dt) { if (G.rand() < dt * 2.2) G.particles.mote(d.x + G.rr(-150, 150), d.y - G.rr(10, 90), G.rr(-6, 6), G.rr(-16, -5), '#ffd0a8', G.rr(2, 4), G.rr(1.5, 3), 0, 0.5); },
    draw(d, ctx) {
      const t = d.t, bone = '#e4dcc8', shade = '#a89e88';
      ctx.save(); ctx.translate(d.x, d.y);
      ctx.lineCap = 'round';
      // spine
      ctx.strokeStyle = shade; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(-150, -8); ctx.quadraticCurveTo(0, -20, 140, -6); ctx.stroke();
      ctx.strokeStyle = bone; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-150, -9); ctx.quadraticCurveTo(0, -21, 140, -7); ctx.stroke();
      ctx.fillStyle = shade; for (let i = 0; i < 13; i++) { const x = -146 + i * 24, y = -9 - sin((i / 12) * PI) * 12; ctx.fillRect(x - 1, y - 7, 2.2, 14); }
      // ribs, far side then near side
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < 8; i++) {
        const x = -96 + i * 26, y0 = -12 - sin(((i + 2) / 12) * PI) * 12, hgt = 56 + sin((i / 7) * PI) * 34, lean = pass ? 12 : -8;
        ctx.strokeStyle = pass ? bone : shade; ctx.lineWidth = pass ? 5.5 : 4.5;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + lean - 26, y0 - hgt * 0.9, x + lean + 6, y0 - hgt); ctx.stroke();
      }
      // skull
      ctx.fillStyle = bone; ctx.beginPath(); ctx.moveTo(140, -18); ctx.quadraticCurveTo(196, -40, 236, -6); ctx.quadraticCurveTo(190, 2, 140, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a342c'; ctx.beginPath(); ctx.ellipse(164, -14, 7, 5, 0.2, 0, TAU); ctx.fill();
      // bone worms: red plumes that duck when you come close
      const ext = 1 - d.react * 0.9;
      for (const w of d.worms) {
        const x = -150 + w.u * 290, y = -10 - sin(w.u * PI) * 13, sw = sin(t * 2 + w.ph) * 2.5 * ext;
        ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw, y - w.h * 0.6 * ext, x + sw * 1.6, y - w.h * ext); ctx.stroke();
        ctx.fillStyle = '#ff9a8a'; ctx.beginPath(); ctx.arc(x + sw * 1.6, y - w.h * ext, 1.6 * ext + 0.3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
    light(d) { G.lights.add(d.x, d.y - 40, 260, '#ffd8b0', 0.16); },
  });

  // things the Curator has collected. They ring, softly, when you swim past.
  const TRINK = ['float', 'float', 'float', 'bottle', 'bottle', 'lantern', 'bell', 'pearls', 'float'];
  const JEWEL = ['#5ff0d8', '#ffb45a', '#ff8ab0', '#9a8cff', '#d8ff7a', '#6ad8ff', '#ff7a6a', '#ffe66a'];
  G.defDecor('trinket', {
    r: 40, reactR: 62, reactIn: 10, reactOut: 1.2,
    init(d) { d.kind = d.kind || pick(TRINK); d.col = d.col || pick(JEWEL); d.note = (G.rand() * 12) | 0; d.s *= G.rr(0.8, 1.25); d.ring = 0; d.rot = G.rr(-0.4, 0.4); },
    onNear(d) { d.ring = 1; G.sfx('mote', { n: d.note }); G.particles.note(d.x + d.nx * 20, d.y + d.ny * 20, d.col); },
    update(d, dt) { d.ring = max(0, d.ring - dt * 1.4); },
    draw(d, ctx) {
      const t = d.t, s = d.s, k = d.kind;
      ctx.save(); ctx.translate(d.x + d.nx * 6, d.y + d.ny * 6); ctx.rotate(d.ang + PI / 2 + d.rot + sin(t * 9) * 0.07 * d.ring); ctx.scale(s, s);
      if (k === 'float') {
        ctx.fillStyle = G.css(d.col, 0.55); ctx.beginPath(); ctx.arc(0, -12, 12, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(20,20,26,0.55)'; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.arc(0, -12, 12, 0, TAU); ctx.moveTo(-12, -12); ctx.quadraticCurveTo(0, -5, 12, -12); ctx.moveTo(-12, -12); ctx.quadraticCurveTo(0, -19, 12, -12); ctx.moveTo(0, -24); ctx.quadraticCurveTo(-7, -12, 0, 0); ctx.moveTo(0, -24); ctx.quadraticCurveTo(7, -12, 0, 0); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-4.5, -17, 2.6, 4, -0.6, 0, TAU); ctx.fill();
      } else if (k === 'bottle') {
        ctx.fillStyle = G.css(d.col, 0.5); G.roundRect(ctx, -6, -22, 12, 22, 4); ctx.fill(); ctx.fillRect(-2.6, -31, 5.2, 10);
        ctx.strokeStyle = G.css(d.col, 0.9); ctx.lineWidth = 1.2; G.roundRect(ctx, -6, -22, 12, 22, 4); ctx.stroke();
        ctx.fillStyle = '#8a6a4a'; ctx.fillRect(-3, -34, 6, 4);
      } else if (k === 'lantern') {
        ctx.fillStyle = '#4a4a52'; G.roundRect(ctx, -9, -4, 18, 5, 2); ctx.fill(); G.roundRect(ctx, -7, -29, 14, 5, 2); ctx.fill();
        ctx.fillStyle = G.css(d.col, 0.45); ctx.fillRect(-7, -24, 14, 20);
        ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-7, -24); ctx.lineTo(-7, -4); ctx.moveTo(7, -24); ctx.lineTo(7, -4); ctx.moveTo(0, -24); ctx.lineTo(0, -4); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -33, 5, PI, TAU); ctx.stroke();
      } else if (k === 'bell') {
        const g = ctx.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, '#7a5a16'); g.addColorStop(0.45, '#f0d070'); g.addColorStop(1, '#6a4e12');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-10, -6, -9, -15); ctx.quadraticCurveTo(-7, -27, 0, -27); ctx.quadraticCurveTo(7, -27, 9, -15); ctx.quadraticCurveTo(10, -6, 13, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a4210'; ctx.beginPath(); ctx.arc(sin(t * 9) * 4 * d.ring, 1, 3, 0, TAU); ctx.fill();
      } else {
        for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 3 + i * 1.5; ctx.fillStyle = i & 1 ? '#ffeaf6' : '#e2d2f0'; ctx.beginPath(); ctx.arc(cos(a) * r, -4 - abs(sin(a)) * r * 0.5, 3.3, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
    },
    glow(d, ctx) {
      if (d.kind === 'bell') { if (d.ring > 0.02) G.drawGlow(ctx, d.x + d.nx * 16, d.y + d.ny * 16, 30, '#ffe6a8', d.ring * 0.6); return; }
      const pulse = 0.5 + 0.2 * sin(d.t * 1.4 + d.ph) + d.ring * 0.6;
      G.drawGlow(ctx, d.x + d.nx * 18 * d.s, d.y + d.ny * 18 * d.s, (d.kind === 'pearls' ? 18 : 30) * d.s * (1 + d.ring * 0.3), d.kind === 'pearls' ? '#ffeaf6' : d.col, pulse * 0.75);
    },
    light(d) { if (d.kind !== 'bell') G.lights.add(d.x + d.nx * 18, d.y + d.ny * 18, 150 * d.s, d.kind === 'pearls' ? '#ffeaf6' : d.col, 0.42 + d.ring * 0.3); },
  });

  // ================================================================= the six cores
  G.defProp('core', {
    r: 12, always: true, viewR: 80,
    init(pr) { pr.ping = 0; pr.col = G.NOTE_COLORS[pr.n]; },
    update(pr, dt) { pr.ping = max(0, pr.ping - dt * 1.1); },
    pulse(pr) { pr.ping = 1; G.particles.ring(pr.x, pr.y, 8, 54, pr.col, 0.6, 2.5); G.lights.flash(pr.x, pr.y, 240, pr.col, 0.6, 0.8); },
    draw(pr, ctx) {
      const y = pr.y - 6 + sin(G.time * 1.3 + pr.n) * 1.2;
      // each one has been given its own little stand of warm stone
      ctx.fillStyle = '#5a4a44'; ctx.beginPath(); ctx.moveTo(pr.x - 15, pr.y + 16); ctx.lineTo(pr.x - 10, pr.y + 5); ctx.lineTo(pr.x + 10, pr.y + 5); ctx.lineTo(pr.x + 15, pr.y + 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a6a4a'; ctx.beginPath(); ctx.ellipse(pr.x, pr.y + 5, 12, 3.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a323c'; ctx.beginPath(); ctx.arc(pr.x, y, 12.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#e0b84e'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(pr.x, y, 12.5, 0, TAU); ctx.stroke();
      const g = ctx.createRadialGradient(pr.x - 3, y - 3.5, 0.5, pr.x, y, 9.6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, pr.col); g.addColorStop(1, G.mixCss(pr.col, '#102030', 0.5));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pr.x, y, 9.2, 0, TAU); ctx.fill();
    },
    glow(pr, ctx) { const t = G.time; G.drawGlow(ctx, pr.x, pr.y - 6, 40 + pr.ping * 46 + sin(t * 2 + pr.n) * 4, pr.col, 0.7 + pr.ping * 0.3); G.drawGlow(ctx, pr.x, pr.y - 6, 9, '#ffffff', 0.7); },
    light(pr) { G.lights.add(pr.x, pr.y - 6, 250 + pr.ping * 170, pr.col, 0.6 + pr.ping * 0.4); },
  });
  G.on('motif', i => { if (!G.zone || !G.zone.cores) return; const pr = G.zone.cores[i]; if (pr) G.PROPS.core.pulse(pr); });

  // ================================================================= fauna
  // supergiant amphipod: comes in handfuls
  G.defCreature('amphipod', {
    r: 7, hp: 26, hostile: true, dmg: 1, xp: 2, pearl: 0.04, mass: 0.5, color: '#f4e4d8', leash: 200, showR: 16,
    init(c) { c.jx = c.x; c.jy = c.y; c.cd = G.rr(0, 0.6); c.curl = 0; },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 330, dt);
      c.cd -= dt;
      if (aggro) {
        if (c.cd <= 0) { c.cd = G.rr(0.35, 0.7); const a = G.rand() * TAU, d = G.rr(0, 46); c.jx = p.x + cos(a) * d; c.jy = p.y + sin(a) * d; }
        if (ai.see(c, p, 600)) ai.seek(c, c.jx, c.jy, 215, 7, dt); else ai.chase(c, p, 190, 5, dt);
        ai.avoid(c, 20, 800, dt);
      } else ai.wander(c, 46, dt);
      ai.faceVel(c, 12, dt);
      c.curl += dt * (8 + hypot(c.vx, c.vy) * 0.05);
    },
    draw(c, ctx) {
      const A = c.alpha, a = c.face, k = sin(c.curl) * 0.25;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(a);
      ctx.globalAlpha = A * 0.9; ctx.strokeStyle = '#f4e4d8'; ctx.lineWidth = 5.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-1, 3, 6.5, PI * (1.05 + k), PI * (1.95 - k * 0.3)); ctx.stroke();
      ctx.strokeStyle = '#ff9a6a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-1, 3, 6.5, PI * 1.25, PI * 1.7); ctx.stroke();
      ctx.strokeStyle = 'rgba(244,228,216,0.8)'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const b = PI * (1.15 + i * 0.16), lx = -1 + cos(b) * 6.5, ly = 3 + sin(b) * 6.5; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + cos(b + 2.3) * 3.5, ly + 3.6 + sin(c.curl * 2 + i) * 1.2); ctx.stroke(); }
      ctx.fillStyle = '#20202a'; ctx.beginPath(); ctx.arc(5, -1.2, 1, 0, TAU); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) { G.drawGlow(ctx, c.x, c.y, 11, '#ffd8c0', 0.3 * c.alpha); },
  });

  // hadal snailfish: the deepest fish anyone has filmed
  const PS = kit.profile(7, 1.2, 1.3);
  G.defCreature('snailfish', {
    r: 12, hp: 14, passive: true, color: '#ffe4ee', scanXp: 8, leash: 190,
    init(c) { c.ch = kit.chain(7, 6.5); kit.chainSet(c.ch, c.x, c.y, c.face); c.swim = 0; c.cur = 0; },
    think(c, dt, p) {
      // curious about the lamp, shy about the probe
      if (c.pd < 250 && c.pd > 110 && !p.dead) { ai.seek(c, p.x, p.y, 34, 1.5, dt); ai.avoid(c, 30, 400, dt); }
      else if (c.pd <= 110) ai.away(c, p, 70, 2, dt);
      else ai.wander(c, 22, dt);
      ai.faceVel(c, 3, dt);
    },
    anim(c, dt) { kit.chainFollow(c.ch, c.x, c.y, c.face, 0.5); c.swim += dt * (3 + hypot(c.vx, c.vy) * 0.08); },
    draw(c, ctx) {
      kit.fish(ctx, c.ch, { w: 9.5, prof: PS, up: kit.upSide(c), phase: c.swim, amp: 3, body: 'rgba(255,228,238,0.82)', belly: 'rgba(255,196,214,0.9)', fin: 'rgba(255,214,228,0.55)', tail: 7, dorsal: 3.5, anal: 3.5, pect: 9, nose: 5, alpha: c.alpha });
      kit.eye(ctx, kit.ex, kit.ey, 1.9, ai.toPlayer(c, G.player), { alpha: c.alpha, white: '#20242c', pupil: 0.8 });
    },
    glow(c, ctx) { G.drawGlow(ctx, c.x, c.y, 20, '#ffd8e6', 0.2 * c.alpha); },
  });

  // Enypniastes: a sea cucumber that swims. People call it the headless chicken monster.
  G.defCreature('dreamer', {
    r: 15, hp: 10, passive: true, color: '#ff8aa8', scanXp: 9, leash: 220, fleeStyle: 'drift', fleeTime: 1.4, showStill: true, showR: 30,
    init(c) { c.fl = 0; c.dir = 1; c.flash = 0; },
    onFlee(c) { G.lights.flash(c.x, c.y, 300, '#ff9ab8', 0.7, 1); G.particles.motes(c.x, c.y, 16, '#ffb0c8', { s0: 10, s1: 60, life: 1.6, size0: 4, size1: 9, drag: 1 }); },
    think(c, dt) {
      c.fl += dt * 1.6;
      const beat = max(0, sin(c.fl));
      ai.wander(c, 12 + beat * 30, dt);
      c.vy -= beat * 26 * dt; c.vy += 9 * dt;
      if (abs(c.vx) > 3) c.dir = c.vx > 0 ? 1 : -1;
    },
    show(c, dt) { c.fl += dt * 1.6; },
    draw(c, ctx) {
      const A = c.alpha, beat = sin(c.fl), d = c.dir;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(d, 1); ctx.rotate(-0.25 + beat * 0.1);
      ctx.globalAlpha = A * 0.5; ctx.fillStyle = '#ff9ab8';       // the veil it rows with
      ctx.beginPath(); ctx.moveTo(6, -4); ctx.quadraticCurveTo(26 + beat * 4, -20 - beat * 7, 22, 2); ctx.quadraticCurveTo(28 + beat * 4, 18 + beat * 7, 6, 6); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = A * 0.82;
      const g = ctx.createRadialGradient(-2, -3, 1, 0, 0, 17); g.addColorStop(0, '#ffc2d2'); g.addColorStop(0.6, '#f2607e'); g.addColorStop(1, '#a8284a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-2, 0, 15, 10.5, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = A * 0.55; ctx.strokeStyle = '#6a1830'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, 1); ctx.quadraticCurveTo(-4, -5, 3, 1); ctx.quadraticCurveTo(-3, 6, -9, 3); ctx.stroke();    // you can see its dinner
      ctx.globalAlpha = A * 0.7; ctx.strokeStyle = '#ffb0c6'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 2, 5 + i * 0.6); ctx.lineTo(-19 + i * 2 - beat * 2, 12 + i); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) { G.drawGlow(ctx, c.x, c.y, 26, '#ff9ab8', (0.22 + 0.1 * sin(c.fl)) * c.alpha); },
    light(c) { G.lights.add(c.x, c.y, 80, '#ff9ab8', 0.2); },
  });

  // an arm, reaching out of the rock. It is not hunting. It is sorting.
  G.defCreature('arm', {
    r: 13, hp: 85, hostile: true, dmg: 0, xp: 8, pearl: 0.3, fixed: true, noSep: true, mass: 60, color: '#d88aa8', fleeStyle: 'retract', fleeTime: 0.9, viewR: 340, flareResist: true, showR: 96, showY: 70,
    init(c) {
      c.bx = c.x; c.by = c.y; if (c.nx === undefined) { c.nx = 0; c.ny = -1; }
      c.ch = kit.chain(15, 17); kit.chainSet(c.ch, c.bx, c.by, atan2(c.ny, c.nx) + PI);
      c.tx = c.bx + c.nx * 44; c.ty = c.by + c.ny * 44; c.hold = 0; c.cd = G.rr(0, 1.5); c.touch = false; c.x = c.tx; c.y = c.ty;
    },
    show(c) { c.tx = c.bx + sin(c.t * 0.8) * 60; c.ty = c.by - 130 - cos(c.t * 1.1) * 40; },
    think(c, dt, p) {
      const dp = hypot(p.x - c.bx, p.y - c.by), REACH = 232;
      const rx = c.bx + c.nx * 46 + sin(c.t * 0.9 + c.ph) * 14 * -c.ny, ry = c.by + c.ny * 46 + sin(c.t * 0.9 + c.ph) * 14 * c.nx;
      c.cd -= dt;
      const toward = (x, y, sp) => { const dx = x - c.tx, dy = y - c.ty, d = hypot(dx, dy); if (d < sp * dt) { c.tx = x; c.ty = y; return 0; } c.tx += dx / d * sp * dt; c.ty += dy / d * sp * dt; return d; };
      if (c.st === 'idle') {
        toward(rx, ry, 60);
        if (!p.dead && dp < 250 && c.cd <= 0 && G.los(c.bx + c.nx * 24, c.by + c.ny * 24, p.x, p.y)) { ai.set(c, 'reach'); c.aggro = true; G.sfx('squelch', { x: c.bx, y: c.by }); }
      } else if (c.st === 'reach') {
        const d = toward(p.x, p.y, 172);
        if (d < 22 && p.dashT <= 0 && !p.dead && p.inv <= 0.5) { ai.set(c, 'hold'); c.hold = 0; G.sfx('squelch', { x: c.x, y: c.y }); G.cam.shake(0.15); }
        if (dp > 340 || c.stT > 6) { ai.set(c, 'back'); c.cd = 1.5; }
      } else if (c.st === 'hold') {
        c.hold += dt; c.tx = p.x; c.ty = p.y;
        const dx = c.bx - p.x, dy = c.by - p.y, d = hypot(dx, dy) || 1;
        p.ax += dx / d * 1500; p.ay += dy / d * 1500; p.slow = 0.3;
        G.hud.hint(`${G.input.label('dash')}  BREAK FREE`, 0.3);
        if (p.dashT > 0 || p.dead) { ai.set(c, 'back'); c.cd = 2.6; c.stun = 0.9; G.particles.bubbles(p.x, p.y, 10, 10, 140); G.sfx('pop', { x: p.x, y: p.y }); }
        else if (c.hold > 2.1 || d < 34) { p.inv = 0; p.hurt(1, c.bx, c.by); ai.set(c, 'back'); c.cd = 2.2; }
      } else { if (toward(rx, ry, 280) < 6) { ai.set(c, 'idle'); c.aggro = false; } }
      const ex = c.tx - c.bx, ey = c.ty - c.by, ed = hypot(ex, ey);
      if (ed > REACH) { c.tx = c.bx + ex / ed * REACH; c.ty = c.by + ey / ed * REACH; if (c.st === 'hold') { ai.set(c, 'back'); c.cd = 2; } }
    },
    anim(c, dt) {
      if (c.fleeing) { c.tx = damp(c.tx, c.bx - c.nx * 20, 5, dt); c.ty = damp(c.ty, c.by - c.ny * 20, 5, dt); }
      kit.reach(c.ch, c.bx - c.nx * 12, c.by - c.ny * 12, c.tx, c.ty, 1.3, c.t + c.ph);
      c.x = c.tx; c.y = c.ty;
    },
    draw(c, ctx) {
      ctx.fillStyle = 'rgba(6,5,12,0.92)'; ctx.beginPath(); ctx.ellipse(c.bx + c.nx * 2, c.by + c.ny * 2, 19, 9, atan2(c.ny, c.nx) + PI / 2, 0, TAU); ctx.fill();
      kit.tentacle(ctx, c.ch, 19, 5, c.st === 'hold' ? '#a83a5a' : '#8a3450', '#f0c8d8', c.alpha, 1);
    },
    glow(c, ctx) {
      const ch = c.ch, on = c.st === 'reach' || c.st === 'hold' ? 1 : 0.35, t = G.time;
      for (let i = 4; i < ch.n; i += 2) G.drawGlow(ctx, ch.x[i], ch.y[i], 7, '#7fd8ff', (0.3 + 0.25 * sin(t * 5 - i * 0.6)) * on * c.alpha);
      G.drawGlow(ctx, c.x, c.y, 15, c.st === 'hold' ? '#ff8aa8' : '#9fe0ff', 0.5 * on * c.alpha);
    },
  });

  // ================================================================= rules
  G.ZONE_CONTENT[4] = {
    boss: null, safeTop: 760, pockets: ['wreck', 'pod'],
    get hostiles() {
      const list = [{ type: 'amphipod', cost: 0.7, w: 5 }, { type: 'arm', cost: 2.4, w: 2.2, wall: true, sink: 0 }];
      if (G.CREATURES.viperfish) list.push({ type: 'viperfish', cost: 2.2, w: 0.8 });
      return list;
    },
    budget: t => 3.2 + t * 3.6,
    decorAt(zone, rng, x, y, nx, ny) {
      const D = G.decor, r = rng(), A = zone.arena, H = G.popHelp;
      const inGarden = pow((x - A.x) / (A.rx + 30), 2) + pow((y - A.y) / (A.ry + 30), 2) < 1;
      if (inGarden) {
        // arranged, not scattered: denser toward the middle of the floor
        const floorish = ny < -0.6, k = 1 - min(1, abs(x - A.x) / A.rx);
        if (floorish ? r < 0.2 + k * 0.2 : r < 0.07) D.add('trinket', x, y, nx, ny, { s: rng.range(0.85, 1.2) });
        return;
      }
      if (ny < -0.72) {
        if (r < 0.022) { D.add('xeno', x, y, nx, ny, { s: 1 }); H.specimen('xeno', x + nx * 12, y + ny * 12, 2, 26); }
        else if (r < 0.028) D.add('bubbler', x, y, nx, ny);
        else if (r < 0.036 && y > zone.pxH * 0.72) D.add('trinket', x, y, nx, ny, { s: 0.9 });      // a trail of lights, closer to the bottom
      }
    },
    ambient(zone, rng, H) {
      const CR = G.creatures, A = zone.arena;
      zone.garden = true;
      // a whale fall in the first good room
      const room = zone.chambers.find(c => c.r > 150) || zone.chambers[0];
      if (room) {
        const fl = H.surface(rng, room.x, room.y + room.ry * 0.5, room.r, 'floor', 60);
        if (fl) { G.decor.add('whalefall', fl.x, fl.y + 6, 0, -1); G.props.add('specimen', fl.x, fl.y - 46, { codex: 'whalefall', r: 70 }); }
      }
      for (const c of zone.chambers) {
        const n = rng.int(1, 3);
        for (let i = 0; i < n; i++) { const p = H.open(rng, c.x, c.y, c.r * 0.7, 34); if (p) CR.spawn('snailfish', p.x, p.y); }
        if (rng.chance(0.6)) { const p = H.open(rng, c.x, c.y, c.r * 0.6, 44); if (p) CR.spawn('dreamer', p.x, p.y); }
      }
      // WICK-6, at the mouth of the garden
      let best = null;
      for (const p of zone.path) if (p.y < A.gateY - 60 && (!best || p.y > best.y)) best = p;
      if (best) {
        const fl = H.surface(rng, best.x, best.y + 40, 190, 'floor', 30) || { x: best.x, y: best.y + 50, nx: 0, ny: -1 };
        G.props.add('wreck', fl.x + fl.nx * 22, fl.y + fl.ny * 22, { n: 5 });
      }
      // the shelf, the cores, and whoever keeps them
      const d = G.raycast(A.x, A.y, 0, 1, 900), fy = A.y + d;
      zone.shelf = { x: A.x, y: fy - 16 };
      zone.cores = [];
      for (let i = 0; i < 6; i++) zone.cores.push(G.props.add('core', A.x + (i - 2.5) * 50, fy - 20 - (1 - pow((i - 2.5) / 2.5, 2)) * 12, { n: i }));
      G.props.add('specimen', A.x, fy - 40, { codex: 'cores', r: 110, scanTime: 2 });
      if (G.CREATURES.curator) { const b = CR.spawn('curator', A.x, A.y - A.ry * 0.62); if (b) { b.asleep = true; zone.keeper = b; } }
      for (let i = 0; i < 4; i++) { const p = H.open(rng, A.x, A.y, A.rx * 0.7, 40); if (p) CR.spawn('snailfish', p.x, p.y); }
    },
  };

  // ================================================================= field notes
  const add = G.codexAdd;
  add('amphipod', { name: 'Supergiant Amphipod', latin: 'Alicella gigantea', zone: 4, kind: 'fauna', size: '30 cm', notes: 'A sand flea, scaled up by a factor that seems unreasonable. They arrive in handfuls and try everything once. I am metal and they have found that disappointing, though not so disappointing that they stop.' });
  add('snailfish', { name: 'Hadal Snailfish', latin: 'Pseudoliparis swirei', zone: 4, kind: 'fauna', size: '25 cm', notes: 'The deepest fish anyone has ever filmed. No scales, soft bones, a body like a thought that has not quite finished. The pressure here would crush a submarine and it swims about in it like an afterthought. It came to look at my lamp. We looked at each other for a while.' });
  add('dreamer', { name: 'Swimming Sea Cucumber', latin: 'Enypniastes eximia', zone: 4, kind: 'fauna', size: '20 cm', notes: 'People call it the headless chicken monster. I did not name it. It rows itself off the bottom with a little veil, and you can see what it ate. When startled it sheds a glowing skin and leaves that behind for you instead. I think the genus name means something like dreamer. I prefer that one.' });
  add('arm', { name: 'Unidentified Arm', latin: 'attached to something', zone: 4, kind: 'fauna', size: 'the visible part: 4 m', notes: 'It comes out of the rock slowly and it does not grab the way a hungry thing grabs. It takes hold, turns me a little, and tries to carry me somewhere. A sharp kick of the thrusters and it lets go at once, as if it is sorry. It is not hunting. I think it is sorting.' });
  add('xeno', { name: 'Xenophyophore', latin: 'Syringammina fragilissima', zone: 4, kind: 'flora', size: '20 cm', decor: 'xeno', showR: 30, showY: 12, notes: 'This is one cell. A single cell, the size of a cabbage, that builds itself a house out of whatever settles on it. It has no brain and has been getting along without one for a very long time. I am trying not to take that as a comment.' });
  add('whalefall', { name: 'Whale Fall', latin: 'what a whale becomes', zone: 4, kind: 'flora', size: '14 m', decor: 'whalefall', showR: 150, showY: 50, notes: 'A whale died up in the light, a long time ago, and sank for most of a day. It has been feeding a town down here ever since: decades of it. The red plumes are bone worms. I heard one of these singing, on the way down. It is good to know where the song goes afterwards.' });
  add('cores', { name: 'The Six', latin: 'WICK-1 through WICK-6', zone: 4, kind: 'echo', size: 'six cores, one shelf', notes: 'Six cores on a ledge of warm rock, arranged by pitch. Something has been turning them toward the vent so they stay charged. They are still switched on. They have been keeping each other company for years, one note each.' });
})();
