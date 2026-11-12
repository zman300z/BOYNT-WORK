'use strict';
/* UNDERSONG — the Shallows, scenery: kelp, seagrass, corals, anemones (some with a tenant),
   giant clams, garden eels, Christmas-tree worms, starfish. All of it reacts to the probe. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, PI, hypot, floor, pow } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit;
  const pick = arr => arr[(G.rand() * arr.length) | 0];

  // an invisible, scannable marker for scenery that deserves a codex entry
  G.defProp('specimen', { r: 26 });

  // ------------------------------------------------------------------ giant kelp
  const KELP = [['#7f8f2e', '#a9b445', '#d2d86c'], ['#6f8a34', '#98b24a', '#c6dd70'], ['#8a8430', '#b5a944', '#dccf6a']];
  G.defDecor('kelp', {
    r: 70, back: true,
    init(d) {
      const n = d.len || (7 + ((G.rand() * 7) | 0));
      d.rope = kit.rope(n, 22 * d.s); kit.ropeSet(d.rope, d.x, d.y, 0, -1);
      d.col = pick(KELP);
    },
    update(d, dt, p) {
      const r = d.rope, sway = sin(d.t * 0.9 + d.ph) * 70 + sin(d.t * 0.37 + d.ph * 2.1) * 45;
      kit.ropeStep(r, d.x, d.y, dt, sway, -270, pow(0.9, dt * 60));
      if (abs(p.x - d.x) < 150 && p.y < d.y + 30 && p.y > d.y - r.n * r.seg - 40) kit.ropePush(r, p.x, p.y, 40, p.vx * dt, p.vy * dt, 1.1);
    },
    draw(d, ctx) {
      const r = d.rope, n = r.n, X = r.x, Y = r.y, c = d.col, t = d.t;
      ctx.strokeStyle = c[0]; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(X[0], Y[0]);
      for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(X[i], Y[i], (X[i] + X[i + 1]) / 2, (Y[i] + Y[i + 1]) / 2);
      ctx.lineTo(X[n - 1], Y[n - 1]); ctx.stroke();
      for (let i = 1; i < n; i++) {
        const tx = X[i] - X[i - 1], ty = Y[i] - Y[i - 1], tl = sqrt(tx * tx + ty * ty) || 1;
        const side = i & 1 ? 1 : -1, sw = sin(t * 1.3 + i * 0.9 + d.ph) * 0.3;
        const a = atan2(ty, tx) + side * (1.05 + sw), L = (19 + ((i * 7) % 5) * 2.2) * d.s * (i === n - 1 ? 1.25 : 1);
        const dx = cos(a), dy = sin(a), px = -dy, py = dx, x = X[i], y = Y[i];
        ctx.fillStyle = c[1 + (i & 1)];
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + dx * L * 0.5 + px * 5.5, y + dy * L * 0.5 + py * 5.5, x + dx * L, y + dy * L);
        ctx.quadraticCurveTo(x + dx * L * 0.5 - px * 5.5, y + dy * L * 0.5 - py * 5.5, x, y);
        ctx.fill();
        ctx.fillStyle = c[2]; ctx.beginPath(); ctx.arc(x + dx * 3, y + dy * 3, 2.3, 0, TAU); ctx.fill();
      }
    },
  });

  // ------------------------------------------------------------------ seagrass
  G.defDecor('seagrass', {
    r: 40, reactR: 62, reactIn: 8, reactOut: 1.6,
    init(d) { d.n = 5 + ((G.rand() * 4) | 0); d.h = G.rr(15, 30) * d.s; d.side = 1; },
    update(d, dt, p) { if (d.react > 0.05) d.side = p.x > d.x ? -1 : 1; },
    draw(d, ctx) {
      const tx = -d.ny, ty = d.nx;
      ctx.lineCap = 'round'; ctx.lineWidth = 2.3;
      for (let i = 0; i < d.n; i++) {
        const u = i / (d.n - 1) - 0.5, bx = d.x + tx * u * 15, by = d.y + ty * u * 15;
        const h = d.h * (0.7 + 0.6 * G.hash1(i, (d.ph * 100) | 0));
        const bend = sin(d.t * 1.7 + d.ph + i * 1.3) * 5 + u * 9 + d.react * d.side * 13;
        ctx.strokeStyle = i & 1 ? '#3fbf7a' : '#74dc92';
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + d.nx * h * 0.6 + tx * bend * 0.3, by + d.ny * h * 0.6 + ty * bend * 0.3, bx + d.nx * h + tx * bend, by + d.ny * h + ty * bend);
        ctx.stroke();
      }
    },
  });

  // ------------------------------------------------------------------ corals (pre-rendered)
  const fanCache = {}, lumpCache = {};
  const FAN_COLS = ['#ff6f9e', '#ffa040', '#b98cff', '#ff5d5d', '#ffd24a', '#5fd8d0'];
  function fanSprite(ci, v) {
    const key = ci * 8 + v;
    if (fanCache[key]) return fanCache[key];
    const c = G.makeCanvas(112, 112), x = c.getContext('2d'), rng = G.RNG(1000 + key * 31), col = FAN_COLS[ci];
    x.lineCap = 'round'; x.strokeStyle = col;
    const branch = (bx, by, a, len, w, depth) => {
      const ex = bx + cos(a) * len, ey = by + sin(a) * len;
      x.lineWidth = w; x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
      if (depth <= 0) { x.fillStyle = G.mixCss(col, '#ffffff', 0.5); x.beginPath(); x.arc(ex, ey, w * 0.9, 0, TAU); x.fill(); return; }
      const n = rng.int(2, 3);
      for (let i = 0; i < n; i++) branch(ex, ey, a + (i - (n - 1) / 2) * rng.range(0.4, 0.75) + rng.range(-0.12, 0.12), len * rng.range(0.66, 0.8), max(1.1, w * 0.72), depth - 1);
    };
    branch(56, 110, -PI / 2, 24, 4.4, 4);
    fanCache[key] = c;
    return c;
  }
  G.defDecor('fan', {
    r: 60,
    init(d) { d.ci = (G.rand() * FAN_COLS.length) | 0; d.v = (G.rand() * 3) | 0; d.s *= G.rr(0.55, 1.05); },
    draw(d, ctx) {
      const sp = fanSprite(d.ci, d.v), s = d.s;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang + PI / 2 + sin(d.t * 0.8 + d.ph) * 0.05);
      ctx.drawImage(sp, -56 * s, -109 * s, 112 * s, 112 * s);
      ctx.restore();
    },
  });
  const LUMP_COLS = [['#d8b04a', '#8a6a22'], ['#58c4b4', '#2a7a72'], ['#e88aa8', '#a04a6a'], ['#c8a8e8', '#7a5aa8']];
  function lumpSprite(ci, v) {
    const key = ci * 8 + v;
    if (lumpCache[key]) return lumpCache[key];
    const c = G.makeCanvas(80, 60), x = c.getContext('2d'), rng = G.RNG(2000 + key * 17), col = LUMP_COLS[ci];
    const g = x.createRadialGradient(34, 22, 3, 40, 40, 40); g.addColorStop(0, G.mixCss(col[0], '#ffffff', 0.35)); g.addColorStop(0.6, col[0]); g.addColorStop(1, col[1]);
    x.fillStyle = g; x.beginPath(); x.ellipse(40, 44, 36, 34, 0, PI, TAU); x.fill();
    x.save(); x.beginPath(); x.ellipse(40, 44, 36, 34, 0, PI, TAU); x.clip();
    x.strokeStyle = G.css(col[1], 0.75); x.lineWidth = 1.6; x.lineCap = 'round';
    for (let i = 0; i < 16; i++) {      // brain-coral meanders
      let px = rng.range(6, 74), py = rng.range(12, 44), a = rng.ang();
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 7; k++) { a += rng.range(-1.2, 1.2); px += cos(a) * 6; py += sin(a) * 5; x.lineTo(px, py); }
      x.stroke();
    }
    x.restore();
    lumpCache[key] = c;
    return c;
  }
  G.defDecor('lump', {
    r: 44,
    init(d) { d.ci = (G.rand() * LUMP_COLS.length) | 0; d.v = (G.rand() * 3) | 0; d.s *= G.rr(0.5, 1); },
    draw(d, ctx) {
      const sp = lumpSprite(d.ci, d.v), s = d.s;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang + PI / 2);
      ctx.drawImage(sp, -40 * s, -42 * s, 80 * s, 60 * s);
      ctx.restore();
    },
  });

  // ------------------------------------------------------------------ anemone (+ sometimes a clownfish)
  const ANEM = [['#ff6fae', '#ffd1e6', '#b83a78'], ['#ff8a4a', '#ffe0b8', '#b85a22'], ['#b388ff', '#eadcff', '#6a4ab8'], ['#5fe0c8', '#d6fff6', '#2a8a7a']];
  G.defDecor('anemone', {
    r: 46, reactR: 56, reactIn: 16, reactOut: 0.7,
    init(d) {
      d.n = 10 + ((G.rand() * 4) | 0); d.col = pick(ANEM); d.len = G.rr(17, 25) * d.s; d.hold = 0;
      d.fish = d.tenant ? { e: 1, ph: G.rand() * TAU } : null;
    },
    onShot(d) { d.hold = 2.2; d.react = 1; },
    onNear(d) { G.particles.bubble(d.x + d.nx * 14, d.y + d.ny * 14, 2.4, d.nx * 30, d.ny * 30); },
    update(d, dt) {
      if (d.hold > 0) { d.hold -= dt; d.react = 1; }
      if (d.fish) d.fish.e = damp(d.fish.e, d.react > 0.25 ? 0 : 1, d.react > 0.25 ? 14 : 1.1, dt);
    },
    draw(d, ctx) {
      const c = d.col, nx = d.nx, ny = d.ny, tx = -ny, ty = nx, ext = 1 - d.react * 0.78;
      const bx = d.x + nx * 5, by = d.y + ny * 5;
      ctx.lineCap = 'round';
      // tenant, behind the front tentacles
      const f = d.fish;
      if (f && f.e > 0.03) {
        const hov = d.len * 0.7 + 9 * f.e + sin(d.t * 2 + f.ph) * 2.5, sx = sin(d.t * 0.9 + f.ph) * 9 * f.e;
        const fx = bx + nx * hov + tx * sx, fy = by + ny * hov + ty * sx, dir = cos(d.t * 0.9 + f.ph) >= 0 ? 1 : -1;
        ctx.save(); ctx.translate(fx, fy); ctx.scale(dir * (0.55 + 0.45 * f.e), 0.55 + 0.45 * f.e);
        ctx.globalAlpha = min(1, f.e * 2);
        ctx.fillStyle = '#ff7a1c'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.6, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, -3.5 + sin(d.t * 9) * 1.2); ctx.lineTo(-12, 3.5 + sin(d.t * 9) * 1.2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 2.1;
        ctx.beginPath(); ctx.moveTo(3, -4); ctx.lineTo(3, 4); ctx.moveTo(-2.5, -4.4); ctx.lineTo(-2.5, 4.4); ctx.stroke();
        ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(5.6, -1, 1.1, 0, TAU); ctx.fill();
        ctx.restore(); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = c[2]; ctx.beginPath(); ctx.ellipse(d.x + nx * 3, d.y + ny * 3, 9 * d.s, 6 * d.s, d.ang + PI / 2, 0, TAU); ctx.fill();
      ctx.lineWidth = 3.2;
      for (let i = 0; i < d.n; i++) {
        const u = i / (d.n - 1) - 0.5, a = u * 2.3 + sin(d.t * 1.9 + i * 0.8 + d.ph) * 0.24 * ext;
        const L = d.len * ext * (0.8 + 0.3 * G.hash1(i, 7)), ca = cos(a), sa = sin(a);
        const dx = nx * ca + tx * sa, dy = ny * ca + ty * sa, cu = sin(d.t * 2.6 + i + d.ph) * 4 * ext;
        const sx = bx + tx * u * 9, sy = by + ty * u * 9, ex = sx + dx * L, ey = sy + dy * L;
        ctx.strokeStyle = c[0];
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + dx * L * 0.5 + tx * cu, sy + dy * L * 0.5 + ty * cu, ex, ey); ctx.stroke();
        ctx.fillStyle = c[1]; ctx.beginPath(); ctx.arc(ex, ey, 2.3, 0, TAU); ctx.fill();
      }
    },
  });

  // ------------------------------------------------------------------ giant clam
  const MANTLE = ['#2f7dff', '#22d6a8', '#9b5cff', '#ffcf3a'];
  G.defDecor('clam', {
    r: 26, reactR: 84, reactIn: 26, reactOut: 0.45,
    init(d) { d.pearl = G.rand() < 0.6; d.col = pick(MANTLE); d.shut = 0; },
    onNear(d) { G.sfx('clack', { x: d.x, y: d.y }); G.particles.bubbles(d.x + d.nx * 10, d.y + d.ny * 10, 4, 6, 60); },
    onShot(d, s) {
      const open = 1 - d.react;
      if (open > 0.45 && d.pearl) {
        d.pearl = false; d.shut = 2.5; d.react = 1;
        G.pickups.spawn('pearl', d.x + d.nx * 16, d.y + d.ny * 16, 1, d.nx * 150 + G.rr(-40, 40), d.ny * 150 + G.rr(-40, 40));
        G.sfx('pop', { x: d.x }); G.particles.ring(d.x, d.y, 6, 30, '#ffeaf6', 0.3, 2);
        return true;
      }
      if (open < 0.4) { G.sfx('clang', { x: d.x, y: d.y }); return true; }
      return false;
    },
    update(d, dt) { if (d.shut > 0) { d.shut -= dt; d.react = 1; } },
    draw(d, ctx) {
      const open = 1 - d.react, s = d.s;
      ctx.save(); ctx.translate(d.x + d.nx * 6, d.y + d.ny * 6); ctx.rotate(d.ang + PI / 2); ctx.scale(s, s);
      // lower valve
      ctx.fillStyle = '#b9ab95'; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.quadraticCurveTo(-16, 12, 0, 12); ctx.quadraticCurveTo(16, 12, 17, 0); ctx.closePath(); ctx.fill();
      if (open > 0.05) {
        ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(0, -0.5, 14.5, 1 + 5 * open, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 3.9, -0.5 + sin(d.t * 3 + i) * 1.2 * open, 0.9, 0, TAU); ctx.fill(); }
        if (d.pearl && open > 0.3) {
          const g = ctx.createRadialGradient(1, -3.5 * open - 1, 0.3, 2, -3 * open, 4); g.addColorStop(0, '#fff'); g.addColorStop(1, '#d9c2e8');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(2, -3 * open, 3.6, 0, TAU); ctx.fill();
        }
      }
      // upper valve, hinged on the left
      ctx.translate(-17, 0); ctx.rotate(-open * 0.62);
      ctx.fillStyle = '#e4d9c6';
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let i = 0; i <= 6; i++) { const u = i / 6, x = u * 34, y = -sin(u * PI) * 13; ctx.quadraticCurveTo(x - 2.8, y - 3.2, x, y + (i === 6 ? 0 : 0)); }
      ctx.lineTo(34, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,104,84,0.6)'; ctx.lineWidth = 1.1;
      for (let i = 1; i < 6; i++) { const u = i / 6; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(u * 34, -sin(u * PI) * 12); ctx.stroke(); }
      ctx.restore();
    },
    glow(d, ctx) { if (d.pearl && d.react < 0.6) G.drawGlow(ctx, d.x + d.nx * 9, d.y + d.ny * 9, 15, '#ffeaf6', 0.4 * (1 - d.react)); },
  });

  // ------------------------------------------------------------------ garden eels
  G.defDecor('eels', {
    r: 80, reactR: 175, reactIn: 5, reactOut: 0.8,
    init(d) {
      d.eels = [];
      const n = 4 + ((G.rand() * 4) | 0);
      for (let i = 0; i < n; i++) d.eels.push({ off: (i - (n - 1) / 2) * G.rr(15, 22), len: G.rr(26, 46), ph: G.rand() * TAU, e: 1, lag: G.rr(0, 0.25) });
    },
    update(d, dt, p) {
      for (const e of d.eels) {
        const dist = hypot(p.x - (d.x - d.ny * e.off), p.y - (d.y + d.nx * e.off));
        const want = p.dead ? 1 : clamp((dist - 70) / 110, 0.05, 1);
        e.e = damp(e.e, want, want < e.e ? 9 : 1.2 - e.lag, dt);
      }
      d.look = p.x > d.x ? 1 : -1;
    },
    draw(d, ctx) {
      const nx = d.nx, ny = d.ny, tx = -ny, ty = nx;
      ctx.lineCap = 'round';
      for (const e of d.eels) {
        const bx = d.x + tx * e.off, by = d.y + ty * e.off, h = e.len * e.e;
        ctx.fillStyle = 'rgba(40,30,40,0.5)'; ctx.beginPath(); ctx.ellipse(bx, by + 1, 5, 2, d.ang + PI / 2, 0, TAU); ctx.fill();
        if (h < 3) continue;
        const sw = sin(d.t * 1.5 + e.ph) * 5 * e.e, lean = d.look * 4 * e.e;
        const mx = bx + nx * h * 0.55 + tx * (sw - lean), my = by + ny * h * 0.55 + ty * (sw - lean);
        const hx = bx + nx * h + tx * (sw * 0.4 + lean), hy = by + ny * h + ty * (sw * 0.4 + lean);
        ctx.strokeStyle = '#efe4c8'; ctx.lineWidth = 4.4;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, hx, hy); ctx.stroke();
        ctx.fillStyle = '#5a4a3a';
        for (let k = 1; k <= 3; k++) { const u = k / 4, a = 1 - u; ctx.beginPath(); ctx.arc(a * a * bx + 2 * a * u * mx + u * u * hx, a * a * by + 2 * a * u * my + u * u * hy, 0.9, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.arc(hx, hy, 3, 0, TAU); ctx.fill();
        ctx.fillStyle = '#181818'; ctx.beginPath(); ctx.arc(hx + tx * d.look * 1.3 + nx * 0.6, hy + ty * d.look * 1.3 + ny * 0.6, 1.1, 0, TAU); ctx.fill();
      }
    },
  });

  // ------------------------------------------------------------------ Christmas-tree worms
  const XMAS = ['#ffd23a', '#4aa8ff', '#ff6a4a', '#ffffff', '#ff7ad0', '#7affb0'];
  G.defDecor('xmas', {
    r: 34, reactR: 66,
    init(d) {
      d.w = [];
      const n = 3 + ((G.rand() * 4) | 0);
      for (let i = 0; i < n; i++) d.w.push({ off: G.rr(-20, 20), col: pick(XMAS), s: G.rr(0.75, 1.2), e: 1, wait: 0 });
    },
    update(d, dt, p) {
      for (const w of d.w) {
        const wx = d.x - d.ny * w.off, wy = d.y + d.nx * w.off, near = !p.dead && G.dist2(p.x, p.y, wx, wy) < 58 * 58;
        if (near) { if (w.e > 0.5) { G.sfx('pop', { x: wx, y: wy }); } w.e = damp(w.e, 0, 45, dt); w.wait = G.rr(1.1, 2.4); }
        else if (w.wait > 0) w.wait -= dt;
        else w.e = damp(w.e, 1, 1.6, dt);
      }
    },
    draw(d, ctx) {
      const nx = d.nx, ny = d.ny, tx = -ny, ty = nx, ang = d.ang + PI / 2;
      for (const w of d.w) {
        const bx = d.x + tx * w.off, by = d.y + ty * w.off;
        ctx.fillStyle = 'rgba(20,16,30,0.55)'; ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, TAU); ctx.fill();
        if (w.e < 0.04) continue;
        ctx.fillStyle = w.col;
        for (let side = -1; side <= 1; side += 2) {
          for (let k = 0; k < 5; k++) {
            const hgt = (2 + k * 2.5) * w.e * w.s, wd = (5.4 - k * 1) * w.s * (0.4 + 0.6 * w.e);
            const cx = bx + nx * hgt + tx * side * 3 * w.s, cy = by + ny * hgt + ty * side * 3 * w.s;
            ctx.globalAlpha = 0.95 - k * 0.07;
            ctx.beginPath(); ctx.ellipse(cx, cy, wd, 1.5 * w.s, ang + sin(d.t * 2 + k) * 0.1, 0, TAU); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
    },
  });

  // ------------------------------------------------------------------ starfish
  const STAR = [['#ff8a3c', '#ffc58a'], ['#b06aff', '#dcc0ff'], ['#ff5a6a', '#ffb0b8'], ['#3ab8ff', '#b0e4ff']];
  G.defDecor('star', {
    r: 20, reactR: 90, reactIn: 3, reactOut: 1,
    init(d) { d.col = pick(STAR); d.rot = G.rand() * TAU; d.s *= G.rr(0.7, 1.1); },
    draw(d, ctx) {
      const R = 11 * d.s, c = d.col;
      ctx.save(); ctx.translate(d.x + d.nx * 2, d.y + d.ny * 2); ctx.rotate(d.ang + PI / 2);
      ctx.scale(1, 0.72); ctx.rotate(d.rot);
      ctx.fillStyle = c[0];
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const wave = i === 0 ? sin(d.t * 7) * 0.35 * d.react : 0, a = i * TAU / 5 + wave, b = a + TAU / 10;
        ctx.lineTo(cos(a) * R, sin(a) * R); ctx.lineTo(cos(b) * R * 0.42, sin(b) * R * 0.42);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = c[1];
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5; ctx.beginPath(); ctx.arc(cos(a) * R * 0.5, sin(a) * R * 0.5, 1.1, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
      ctx.restore();
    },
  });

  // ------------------------------------------------------------------ field notes
  G.codexAdd('kelp', { name: 'Giant Kelp', latin: 'Macrocystis pyrifera', zone: 0, kind: 'flora', size: 'to 45 m', notes: 'Not a plant. An alga with ambitions. Grows half a metre on a good day and holds itself up with little gas-filled floats, which I respect: it found a way to stand in a place with nothing to stand on.' });
  G.codexAdd('anemone', { name: 'Sea Anemone', latin: 'Heteractis magnifica', zone: 0, kind: 'flora', size: '20 cm', notes: 'An animal that decided to be a flower. Every tentacle is armed. It folds up when I get close, which I try not to take personally.' });
  G.codexAdd('clownfish', { name: 'Clownfish', latin: 'Amphiprion ocellaris', zone: 0, kind: 'fauna', size: '8 cm', notes: 'Lives inside an anemone that would sting anyone else. Pays rent in housekeeping. Peeks out at me, hides, peeks again. We have been doing this for some time and I believe it is a game.' });
  G.codexAdd('clam', { name: 'Giant Clam', latin: 'Tridacna gigas', zone: 0, kind: 'fauna', size: '1 m', notes: 'Farms algae in its own lips and lives a century on sunlight. Slams shut if I come near. A quick pulse from a distance sometimes shakes a pearl loose. It does not seem to miss it.' });
  G.codexAdd('gardeneel', { name: 'Spotted Garden Eel', latin: 'Heteroconger hassi', zone: 0, kind: 'fauna', size: '40 cm', notes: 'A whole meadow of them, each in its own hole, all facing the current like an audience. They sink out of sight when I approach and rise when I leave. I have never seen one from closer than this.' });
  G.codexAdd('xmas', { name: 'Christmas Tree Worm', latin: 'Spirobranchus giganteus', zone: 0, kind: 'fauna', size: '4 cm', notes: 'Two spiral plumes for breathing and catching food. Vanishes into the rock faster than I can register it. Comes back out when it is good and ready.' });
  G.codexAdd('fan', { name: 'Sea Fan', latin: 'Gorgonia ventalina', zone: 0, kind: 'flora', size: '1.5 m', notes: 'A colony of thousands of tiny animals building one shared lattice, always at right angles to the current. Nobody is in charge. It works anyway.' });
})();
