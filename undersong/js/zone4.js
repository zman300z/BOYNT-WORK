'use strict';
/* UNDERSONG — the Abyss (zone index 3): a hydrothermal vent field.
   Black basalt, ember light, sulphur. Nothing here has ever needed the sun: the vents are the lamps.
   Scenery: black smokers (hazard + light), tube-worm tufts, mussel beds, sulphur crust, bacterial mats.
   Company: dumbo octopus, sea pig, vent shrimp.  Trouble: yeti crab, giant tube worm, giant isopod.
   Boss: THE RIBBON, a giant oarfish. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, exp, PI, hypot, floor, pow } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit, ai = G.ai;
  const _v = { x: 0, y: 0 };
  const EMBER = '#ff7a30', HOT = '#ffd9a0', SOOT = '#1c1412';

  // =================================================================== black smoker
  // Cycle: idle -> rumble (about a second of warning) -> erupt (two seconds) -> idle.
  // The jet burns close to the mouth and is only an updraft further out, so it can be ridden.
  const JET = 310, CORE = 128;
  function chimneySprite(d) {
    const s = d.s, h = d.h, W = Math.ceil(96 * s), H = Math.ceil(h + 36 * s);
    const c = G.makeCanvas(W, H), x = c.getContext('2d');
    const rng = G.RNG(((((d.x * 13.7) | 0) ^ ((d.y * 7.3) | 0)) >>> 0) || 7);
    const cx = W / 2, by = H - 13 * s;
    // talus at the foot
    for (let i = 0; i < 7; i++) {
      x.fillStyle = i & 1 ? '#3a2824' : '#2a1b1a';
      x.beginPath(); x.ellipse(cx + rng.range(-30, 30) * s, by + rng.range(-2, 7) * s, rng.range(7, 15) * s, rng.range(4, 8) * s, rng.range(-0.4, 0.4), 0, TAU); x.fill();
    }
    // the stack: a lumpy taper that straightens toward the mouth
    const n = 7, L = [], R = [], ph = rng() * 6;
    for (let k = 0; k <= n; k++) {
      const u = k / n, w = lerp(21, 8, pow(u, 0.8)) * s * rng.range(0.84, 1.18), off = sin(u * 3.1 + ph) * 5 * sin(u * PI) * s, y = by - u * h;
      L.push(cx + off - w, y); R.push(cx + off + w, y);
    }
    const pts = [];
    for (let k = 0; k <= n; k++) pts.push(L[k * 2], L[k * 2 + 1]);
    for (let k = n; k >= 0; k--) pts.push(R[k * 2], R[k * 2 + 1]);
    const g = x.createLinearGradient(cx - 22 * s, 0, cx + 22 * s, 0);
    g.addColorStop(0, '#77594f'); g.addColorStop(0.45, '#503a35'); g.addColorStop(1, '#201516');
    x.fillStyle = g; x.beginPath(); G.smoothPath(x, pts, true); x.fill();
    x.save(); x.clip();
    // flanges, mineral crust, grit
    for (let k = 1; k < n; k += 2) {
      const y = by - (k / n) * h, w = (R[k * 2] - L[k * 2]) / 2, mx = (R[k * 2] + L[k * 2]) / 2;
      x.fillStyle = 'rgba(16,10,10,0.55)'; x.beginPath(); x.ellipse(mx, y + 2.5 * s, w * 1.2, 3.4 * s, 0, 0, TAU); x.fill();
      x.fillStyle = 'rgba(160,120,102,0.5)'; x.beginPath(); x.ellipse(mx, y, w * 1.15, 2.2 * s, 0, 0, TAU); x.fill();
    }
    for (let i = 0; i < 9; i++) {
      const u = rng(), y = by - u * h;
      x.fillStyle = rng.chance(0.6) ? 'rgba(220,186,70,0.8)' : 'rgba(172,94,50,0.72)';
      x.beginPath(); x.ellipse(cx + rng.range(-14, 14) * s * (1 - u * 0.5), y, rng.range(2.5, 6) * s, rng.range(1.6, 3.4) * s, rng.range(-0.6, 0.6), 0, TAU); x.fill();
    }
    for (let i = 0; i < 46; i++) { x.fillStyle = rng.chance(0.5) ? 'rgba(255,220,190,0.22)' : 'rgba(0,0,0,0.3)'; x.fillRect(cx + rng.range(-22, 22) * s, by - rng() * h, 1.4, 1.4); }
    x.restore();
    x.strokeStyle = 'rgba(255,208,170,0.32)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(L[0], L[1]); for (let k = 1; k <= n; k++) x.lineTo(L[k * 2], L[k * 2 + 1]); x.stroke();
    const tw = (R[n * 2] - L[n * 2]) / 2, tmx = (R[n * 2] + L[n * 2]) / 2;
    x.fillStyle = '#0a0606'; x.beginPath(); x.ellipse(tmx, by - h + 1, tw * 0.86, 3.6 * s, 0, 0, TAU); x.fill();
    return { c, W, H, ax: cx, ay: by };
  }

  G.defDecor('smoker', {
    r: 46,
    init(d) {
      d.h = (d.h || G.rr(46, 80)) * d.s;
      d.cycle = G.rr(4.4, 7.6); d.clock = G.rr(0.6, d.cycle);
      d.st = 0; d.stT = 0; d.heat = 0.25; d.burn = 0; d.acc = 0; d.sm = 0; d.spr = null;
      d.mx = d.x + d.nx * d.h; d.my = d.y + d.ny * d.h;
    },
    update(d, dt, p) {
      if (d.specimen) { d.heat = 0.5 + 0.4 * sin(d.t * 1.3); return; }
      d.stT += dt;
      const seen = G.cam.sees(d.mx, d.my, 360), close = abs(p.x - d.x) < 620 && abs(p.y - d.y) < 460;
      if (d.st === 0) {
        d.heat = damp(d.heat, 0.25, 2.2, dt);
        d.clock -= dt;
        if (d.clock <= 0) { d.st = 1; d.stT = 0; if (close) G.sfx('rumble', { t: 1.1 }); }
        if (seen && G.rand() < dt * 2.4) G.particles.dust(d.mx, d.my, 1, SOOT, 30, d.nx * 1.6, d.ny * 1.6);
        if (seen && G.rand() < dt * 1.6) G.particles.mote(d.mx + G.rr(-4, 4), d.my, d.nx * G.rr(30, 80) + G.rr(-14, 14), d.ny * G.rr(30, 80), EMBER, G.rr(2.5, 5), G.rr(0.7, 1.4), 0, 0.8);
      } else if (d.st === 1) {
        d.heat = damp(d.heat, 1, 3.5, dt);
        if (seen && G.rand() < dt * 22) G.particles.mote(d.mx + G.rr(-6, 6), d.my + G.rr(-3, 3), d.nx * G.rr(60, 200) + G.rr(-50, 50), d.ny * G.rr(60, 200) + G.rr(-50, 50), G.rand() < 0.4 ? HOT : EMBER, G.rr(3, 6), G.rr(0.3, 0.6), 0, 2);
        if (d.stT > 1.0) { d.st = 2; d.stT = 0; d.burn = 0; if (close) { G.sfx('whoosh', { x: d.mx, y: d.my }); G.sfx('growl', { x: d.mx, y: d.my }); if (seen) G.cam.shake(0.1); } }
      } else {
        d.heat = 1;
        if (seen) {
          d.acc += dt * 44;
          while (d.acc >= 1) {
            d.acc -= 1;
            const sp = G.rr(400, 640), j = G.rr(-0.11, 0.11), cj = cos(j), sj = sin(j);
            G.particles.mote(d.mx + G.rr(-5, 5), d.my + G.rr(-5, 5), (d.nx * cj - d.ny * sj) * sp, (d.ny * cj + d.nx * sj) * sp, G.rand() < 0.3 ? HOT : EMBER, G.rr(5, 12), G.rr(0.55, 0.95), 0, 1.2);
          }
          d.sm += dt * 15;
          while (d.sm >= 1) { d.sm -= 1; const a = G.rr(30, 190); G.particles.dust(d.mx + d.nx * a, d.my + d.ny * a, 1, SOOT, 60, d.nx * 2.4, d.ny * 2.4); }
        }
        // the jet itself
        if (!p.dead) {
          const ax = p.x - d.mx, ay = p.y - d.my, along = ax * d.nx + ay * d.ny, side = abs(ay * d.nx - ax * d.ny);
          if (along > -8 && along < JET && side < 22 + along * 0.07) {
            const k = 1 - along / JET;
            p.ax += d.nx * (1500 + 1500 * k); p.ay += d.ny * (1500 + 1500 * k);
            if (along < CORE) { d.burn += dt; if (d.burn > 0.1) p.hurt(1, d.mx - d.nx * 14, d.my - d.ny * 14); } else d.burn = 0;
          } else d.burn = 0;
        }
        if (d.stT > 2.0) { d.st = 0; d.stT = 0; d.clock = d.cycle * G.rr(0.8, 1.25); }
      }
    },
    draw(d, ctx) {
      const sp = d.spr || (d.spr = chimneySprite(d));
      let jx = 0, jy = 0;
      if (d.st === 1) { jx = sin(d.t * 71) * 1.3; jy = cos(d.t * 57) * 0.9; }
      ctx.save(); ctx.translate(d.x + jx, d.y + jy); ctx.rotate(d.ang + PI / 2);
      ctx.drawImage(sp.c, -sp.ax, -sp.ay, sp.W, sp.H);
      ctx.restore();
    },
    glow(d, ctx) {
      const t = G.time, h = d.heat, s = d.s, fl = 0.86 + 0.14 * sin(t * 11 + d.ph) * sin(t * 7.3 + d.ph * 2);
      G.drawGlow(ctx, d.mx, d.my, (20 + 30 * h) * fl * s, '#ff6a20', 0.45 + 0.5 * h);
      G.drawGlow(ctx, d.mx, d.my, (7 + 9 * h) * s, '#ffe2a8', 0.5 + 0.5 * h);
      // heat showing through cracks in the stack
      for (let i = 1; i <= 3; i++) {
        const u = i / 4.2, k = 0.5 + 0.5 * sin(t * 2.3 + i * 2 + d.ph), o = (i & 1 ? 5 : -6) * s;
        G.drawGlow(ctx, d.x + d.nx * d.h * u - d.ny * o, d.y + d.ny * d.h * u + d.nx * o, 7 * s, '#ff5a1a', (0.12 + 0.5 * h) * k);
      }
      if (d.st === 1) {            // where the jet is about to be
        const u = min(1, d.stT), b = 0.5 + 0.5 * sin(t * 18);
        for (let i = 0; i < 5; i++) G.drawGlow(ctx, d.mx + d.nx * (30 + i * 54), d.my + d.ny * (30 + i * 54), 26 + i * 3, EMBER, 0.06 + 0.12 * u * b);
      } else if (d.st === 2) {
        const k = min(1, d.stT * 5) * min(1, (2.0 - d.stT) * 3);
        for (let i = 0; i < 5; i++) G.drawGlow(ctx, d.mx + d.nx * (14 + i * 34), d.my + d.ny * (14 + i * 34), (27 - i * 2.5) * fl, i < 2 ? HOT : EMBER, (0.78 - i * 0.12) * k);
      }
    },
    light(d) {
      const fl = 0.86 + 0.14 * sin(d.t * 9.3 + d.ph);
      G.lights.add(d.mx, d.my, (235 + 215 * d.heat) * d.s, '#ff9048', (0.5 + 0.5 * d.heat) * fl);
      if (d.st === 2) G.lights.add(d.mx + d.nx * 140, d.my + d.ny * 140, 250, '#ff7a30', 0.5);
    },
  });

  // =================================================================== small tube worms (harmless; they duck)
  G.defDecor('tubelets', {
    r: 36, reactR: 80,
    init(d) {
      d.w = [];
      const n = 5 + ((G.rand() * 4) | 0);
      for (let i = 0; i < n; i++) d.w.push({ off: G.rr(-22, 22), h: G.rr(12, 26) * d.s, lean: G.rr(-0.35, 0.35), e: 1, wait: 0, ph: G.rand() * TAU });
    },
    update(d, dt, p) {
      for (const w of d.w) {
        const wx = d.x - d.ny * w.off, wy = d.y + d.nx * w.off, near = !p.dead && G.dist2(p.x, p.y, wx, wy) < 72 * 72;
        if (near || d.react > 0.6) { w.e = damp(w.e, 0, 30, dt); w.wait = G.rr(1.2, 2.6); }
        else if (w.wait > 0) w.wait -= dt;
        else w.e = damp(w.e, 1, 1.4, dt);
      }
    },
    draw(d, ctx) {
      const nx = d.nx, ny = d.ny, tx = -ny, ty = nx, base = atan2(ny, nx);
      for (const w of d.w) {
        const bx = d.x + tx * w.off, by = d.y + ty * w.off, a = base + w.lean, dx = cos(a), dy = sin(a);
        const ex = bx + dx * w.h, ey = by + dy * w.h;
        ctx.lineCap = 'butt';
        ctx.strokeStyle = '#3a2c28'; ctx.lineWidth = 5.6; ctx.beginPath(); ctx.moveTo(bx - dx * 3, by - dy * 3); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#ebe2d0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(bx - dx * 3, by - dy * 3); ctx.lineTo(ex, ey); ctx.stroke();
        if (w.e > 0.05) {
          const L = 7 * w.e, sw = sin(d.t * 2.6 + w.ph) * 0.14;
          ctx.fillStyle = '#e8362c';
          ctx.beginPath(); ctx.ellipse(ex + cos(a + sw) * L * 0.55, ey + sin(a + sw) * L * 0.55, L * 0.62, 2.9 * w.e, a + sw, 0, TAU); ctx.fill();
          ctx.fillStyle = '#ff988a'; ctx.beginPath(); ctx.ellipse(ex + cos(a + sw) * L * 0.6, ey + sin(a + sw) * L * 0.6, L * 0.34, 1.1 * w.e, a + sw, 0, TAU); ctx.fill();
        } else { ctx.fillStyle = '#140c0c'; ctx.beginPath(); ctx.arc(ex, ey, 1.6, 0, TAU); ctx.fill(); }
      }
    },
  });

  // =================================================================== mussel beds, sulphur crust (pre-rendered)
  const musselCache = [], sulfurCache = [];
  function musselSprite(v) {
    if (musselCache[v]) return musselCache[v];
    const c = G.makeCanvas(96, 52), x = c.getContext('2d'), rng = G.RNG(4100 + v * 13), n = 8 + v;
    for (let i = 0; i < n; i++) {
      const px = 14 + rng() * 68, py = 35 + rng.range(-4, 7), a = rng.range(-0.9, 0.9) - PI / 2, L = rng.range(9, 14), w = L * 0.46;
      x.save(); x.translate(px, py); x.rotate(a);
      const g = x.createLinearGradient(0, -w, 0, w); g.addColorStop(0, '#77667c'); g.addColorStop(0.5, '#463650'); g.addColorStop(1, '#281d2e');
      x.fillStyle = g; x.beginPath(); x.moveTo(-L, 0); x.quadraticCurveTo(-L * 0.2, -w * 1.5, L, 0); x.quadraticCurveTo(-L * 0.2, w * 1.5, -L, 0); x.fill();
      x.strokeStyle = 'rgba(200,180,210,0.42)'; x.lineWidth = 0.8;
      for (let k = 1; k <= 2; k++) { x.beginPath(); x.moveTo(-L * 0.9, 0); x.quadraticCurveTo(-L * 0.2, -w * 1.5 * k / 3, L * 0.85, 0); x.stroke(); }
      if (rng.chance(0.4)) { x.strokeStyle = 'rgba(255,176,120,0.75)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-L * 0.7, 0.5); x.lineTo(L * 0.8, 0.5); x.stroke(); }
      x.restore();
    }
    return (musselCache[v] = c);
  }
  G.defDecor('mussels', {
    r: 40,
    init(d) { d.v = (G.rand() * 3) | 0; d.s *= G.rr(0.8, 1.15); },
    draw(d, ctx) {
      const sp = musselSprite(d.v), s = d.s;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang + PI / 2);
      ctx.drawImage(sp, -48 * s, -42 * s, 96 * s, 52 * s);
      ctx.restore();
    },
  });
  function sulfurSprite(v) {
    if (sulfurCache[v]) return sulfurCache[v];
    const c = G.makeCanvas(84, 48), x = c.getContext('2d'), rng = G.RNG(5200 + v * 29), n = 7 + v * 2;
    x.fillStyle = 'rgba(196,160,48,0.55)'; x.beginPath(); x.ellipse(42, 42, 34, 6, 0, 0, TAU); x.fill();
    for (let i = 0; i < n; i++) {
      const px = 12 + rng() * 60, a = rng.range(-0.75, 0.75), L = rng.range(9, 24), w = rng.range(2.6, 5.2);
      x.save(); x.translate(px, 42); x.rotate(a);
      const g = x.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#fff2a0'); g.addColorStop(0.5, '#f0cf48'); g.addColorStop(1, '#b98e24');
      x.fillStyle = g; x.beginPath(); x.moveTo(-w, 0); x.lineTo(-w * 0.5, -L * 0.8); x.lineTo(0, -L); x.lineTo(w, -L * 0.25); x.lineTo(w * 0.6, 3); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,230,0.6)'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(-w * 0.5, -L * 0.8); x.lineTo(-w * 0.1, 0); x.stroke();
      x.restore();
    }
    return (sulfurCache[v] = c);
  }
  G.defDecor('sulfur', {
    r: 34,
    init(d) { d.v = (G.rand() * 3) | 0; d.s *= G.rr(0.7, 1.15); },
    draw(d, ctx) {
      const sp = sulfurSprite(d.v), s = d.s;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang + PI / 2);
      ctx.drawImage(sp, -42 * s, -41 * s, 84 * s, 48 * s);
      ctx.restore();
    },
    glow(d, ctx) {
      const k = sin(G.time * 2.1 + d.ph);
      if (k > 0.9) G.drawGlow(ctx, d.x + d.nx * 9 - d.ny * 6, d.y + d.ny * 9 + d.nx * 6, 8, '#fff4a8', (k - 0.9) * 7);
    },
  });

  // =================================================================== bacterial mat: where the food chain starts
  G.defDecor('bactmat', {
    r: 40,
    init(d) {
      d.w = G.rr(22, 40) * d.s; d.hairs = [];
      const n = 8 + ((G.rand() * 7) | 0);
      for (let i = 0; i < n; i++) d.hairs.push({ off: G.rr(-1, 1), h: G.rr(7, 17) * d.s, ph: G.rand() * TAU });
    },
    draw(d, ctx) {
      const nx = d.nx, ny = d.ny, tx = -ny, ty = nx;
      ctx.fillStyle = 'rgba(236,230,212,0.5)';
      ctx.beginPath(); ctx.ellipse(d.x + nx * 1.5, d.y + ny * 1.5, d.w, 4.6, d.ang + PI / 2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(250,246,232,0.42)';
      ctx.beginPath(); ctx.ellipse(d.x + nx * 2 + tx * d.w * 0.3, d.y + ny * 2 + ty * d.w * 0.3, d.w * 0.5, 3, d.ang + PI / 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(248,244,230,0.78)'; ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      ctx.beginPath();
      for (const h of d.hairs) {
        const bx = d.x + tx * h.off * d.w * 0.9, by = d.y + ty * h.off * d.w * 0.9, sw = sin(d.t * 1.3 + h.ph) * 4;
        ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + nx * h.h * 0.6 + tx * sw * 0.4, by + ny * h.h * 0.6 + ty * sw * 0.4, bx + nx * h.h + tx * sw, by + ny * h.h + ty * sw);
      }
      ctx.stroke();
    },
  });

  // =================================================================== dumbo octopus (company)
  G.defCreature('dumbo', {
    r: 15, hp: 12, passive: true, color: '#ffc0a8', scanXp: 8, scanTime: 1.4, leash: 150, showR: 32, showStill: true, mass: 0.8,
    init(c) { c.pulse = G.rand() * TAU; c.open = 0.6; c.shy = 0; c.startle = 0; c.was = false; },
    show(c, dt) { c.pulse += dt * 2.6; c.open = damp(c.open, sin(c.pulse) < 0 ? 1 : 0.25, 6, dt); },
    think(c, dt, p) {
      const near = c.pd < 125 && !p.dead;
      if (near && !c.was) { c.startle = 0.55; G.particles.bubble(c.x, c.y - 10, 2.2, 0, -30); }
      c.was = near;
      c.shy = damp(c.shy, near ? 1 : 0, 3, dt);
      if (c.startle > 0) {           // spreads its whole web and just hangs there, hoping to look large
        c.startle -= dt; c.open = damp(c.open, 1.25, 18, dt); ai.brake(c, 5, dt);
        return;
      }
      c.pulse += dt * (c.shy > 0.3 ? 5.4 : 2.6);
      const k = sin(c.pulse);
      c.wa += (G.noise2(c.t * 0.3, c.ph * 10, 5) - 0.5) * 2.2 * dt;
      let dx = cos(c.wa) * 0.7, dy = -0.5;
      const hx = c.home.x - c.x, hy = c.home.y - c.y, hd = hypot(hx, hy);
      if (hd > c.leash) { dx = hx / hd; dy = hy / hd; }
      if (c.shy > 0.3) { const l = c.pd || 1; dx = (c.x - p.x) / l; dy = (c.y - p.y) / l - 0.35; }
      const thrust = max(0, k) * (c.shy > 0.3 ? 170 : 78);
      c.vx = damp(c.vx, dx * thrust, 3, dt); c.vy = damp(c.vy, dy * thrust + (k < 0 ? 17 : 0), 3, dt);   // parachutes down between strokes
      ai.avoid(c, 42, 520, dt);
      c.open = damp(c.open, k < 0 ? 1 : 0.22, 6, dt);
    },
    draw(c, ctx) {
      const A = c.alpha, o = c.open, x = c.x, y = c.y + sin(c.pulse) * 1.5;
      ctx.globalAlpha = A;
      // web: an umbrella that opens on the glide and shuts on the stroke
      const w = 11 + 9 * o, hgt = 13 - 5 * min(1, o);
      ctx.fillStyle = '#e88672';
      ctx.beginPath(); ctx.moveTo(x - w, y + 2);
      for (let i = 0; i < 7; i++) {
        const u0 = i / 7, u1 = (i + 1) / 7, y0 = y + 3 + hgt * pow(sin(PI * u0), 0.6), y1 = y + 3 + hgt * pow(sin(PI * u1), 0.6);
        ctx.quadraticCurveTo(x - w + (u0 + u1) * w, (y0 + y1) / 2 - 3.2, x - w + u1 * 2 * w, y1);
      }
      ctx.quadraticCurveTo(x, y - 8, x - w, y + 2); ctx.fill();
      // the ears (fins, technically)
      const flap = sin(c.pulse * 2 + 0.6) * 0.55;
      ctx.fillStyle = '#ffb8a0';
      for (let s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.translate(x + s * 10, y - 9); ctx.rotate(s * (0.5 + flap));
        ctx.beginPath(); ctx.ellipse(s * 6, -2, 8.5, 4.6, s * -0.3, 0, TAU); ctx.fill();
        ctx.restore();
      }
      const g = ctx.createRadialGradient(x - 4, y - 8, 2, x, y - 3, 17);
      g.addColorStop(0, '#ffe4d6'); g.addColorStop(0.6, '#ffb49c'); g.addColorStop(1, '#ee8a78');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 4, 13.5, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,112,128,0.42)';
      ctx.beginPath(); ctx.ellipse(x - 8.6, y + 1.8, 3, 1.8, 0, 0, TAU); ctx.ellipse(x + 8.6, y + 1.8, 3, 1.8, 0, 0, TAU); ctx.fill();
      const look = ai.toPlayer(c, G.player), eo = { alpha: A, pupil: 0.68 + c.shy * 0.14, dazed: c.stun > 0 };
      kit.eye(ctx, x - 5.2, y - 2.2, 3.5, look, eo); kit.eye(ctx, x + 5.2, y - 2.2, 3.5, look, eo);
      ctx.globalAlpha = 1;
    },
    glow(c, ctx) { G.drawGlow(ctx, c.x, c.y - 3, 30, '#ffc0a8', 0.13 * c.alpha); },
  });

  // =================================================================== sea pig (plods; unbothered)
  G.defCreature('seapig', {
    r: 11, hp: 10, passive: true, color: '#ffb0c0', fixed: true, noSep: true, fleeStyle: 'retract', fleeTime: 0.4, scanXp: 6, showR: 26, showY: 6,
    init(c) { c.dir = c.dir || (G.rand() < 0.5 ? 1 : -1); c.walk = G.rand() * 10; c.pause = G.rr(0, 2); c.sniff = 0; if (c.nx === undefined) { c.nx = 0; c.ny = -1; } },
    show(c, dt) { c.walk += dt * 4.4; },
    think(c, dt, p) {
      c.pause -= dt;
      let sp = 9;
      if (c.pause > 0) sp = 0; else if (G.rand() < dt * 0.12) c.pause = G.rr(0.8, 2.2);
      ai.crawl(c, c.dir, sp, dt);
      if (c.ny > -0.3) { c.dir = -c.dir; ai.crawl(c, c.dir, 40, dt); }       // floors only: back off anything steep
      c.walk += sp * dt * 0.55;
      c.sniff = damp(c.sniff, c.pd < 110 ? 1 : 0, 4, dt);
    },
    draw(c, ctx) {
      const A = c.alpha, shrink = max(0.02, c.fleeing ? 1 - min(1, c.fleeing / 0.4) : 1), sw = sin(c.t * 1.6 + c.ph) * 1.5;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(atan2(c.ny, c.nx) + PI / 2); ctx.scale(shrink * c.dir, shrink);
      ctx.globalAlpha = A; ctx.lineCap = 'round';
      // tube feet: fat, slow, taking turns
      ctx.strokeStyle = '#ffc4d2'; ctx.lineWidth = 3.2;
      for (let i = 0; i < 5; i++) {
        const ph = c.walk + i * 1.3, lift = max(0, sin(ph)) * 2.2;
        ctx.beginPath(); ctx.moveTo(-8 + i * 4, 1); ctx.lineTo(-8 + i * 4 + cos(ph) * 1.2, 7 - lift); ctx.stroke();
      }
      // the "antennae" on its back are also legs
      ctx.strokeStyle = '#ffb0c4'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(5, -6); ctx.quadraticCurveTo(8 + sw, -13, 12 + sw * 1.5, -15);
      ctx.moveTo(1, -7); ctx.quadraticCurveTo(2 + sw, -14, 5 + sw * 1.5, -17);
      ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-8, -10, -10 - sw, -11);
      ctx.stroke();
      const g = ctx.createLinearGradient(0, -9, 0, 5);
      g.addColorStop(0, '#ffc6d2'); g.addColorStop(0.6, '#ff9cb4'); g.addColorStop(1, '#ffd8e0');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -2, 12, 7.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,90,120,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-7, -1); ctx.quadraticCurveTo(0, 2, 7, -2); ctx.stroke();       // lunch, visible from outside
      ctx.fillStyle = '#ff8aa6';
      for (let i = 0; i < 4; i++) { const a = -0.7 + i * 0.47 + sin(c.t * 3 + i) * 0.12 * (1 + c.sniff); ctx.beginPath(); ctx.arc(12 + cos(a) * 3, -1 + sin(a) * 4.2, 1.5, 0, TAU); ctx.fill(); }
      ctx.restore(); ctx.globalAlpha = 1;
    },
  });

  // =================================================================== yeti crab (crawls the rock, then leaps)
  G.defCreature('yeti', {
    r: 13, hp: 80, hostile: true, dmg: 1, xp: 6, pearl: 0.14, color: '#fff2c8', fixed: true, noSep: true, mass: 1.5, fleeStyle: 'sink', fleeTime: 0.8, showR: 34, showY: 8,
    init(c) {
      c.dir = G.rand() < 0.5 ? 1 : -1; c.walk = 0; c.arm = 0.15; c.cd = G.rr(0.5, 1.5); c.wave = G.rand() * TAU; c.wait = 0; c.go = 0; c.da = 0;
      if (c.nx === undefined) { c.nx = 0; c.ny = -1; }
    },
    show(c, dt) { c.walk += dt * 2; c.arm = 0.25 + 0.25 * sin(c.t * 0.9); },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 340, dt);
      c.cd -= dt;
      if (c.st === 'idle') {
        let sp = 0;
        if (aggro && !p.dead) {
          c.dir = ((p.x - c.x) * -c.ny + (p.y - c.y) * c.nx) >= 0 ? 1 : -1;
          sp = 74;
          if (c.cd <= 0 && c.pd < 290 && c.pd > 44 && ai.see(c, p, 300)) { ai.set(c, 'crouch'); G.sfx('telegraph', { x: c.x, y: c.y }); }
        } else {                    // pottering about, tending the crop
          c.wait -= dt;
          if (c.wait <= 0) { c.wait = G.rr(1.5, 4); c.dir = G.rand() < 0.5 ? 1 : -1; c.go = G.rr(0.3, 1.2); }
          if (c.go > 0) { c.go -= dt; sp = 22; }
        }
        ai.crawl(c, c.dir, sp, dt); c.walk += sp * dt * 0.2;
        c.arm = damp(c.arm, aggro ? 0.5 : 0.15, 5, dt);
      } else if (c.st === 'crouch') {
        ai.crawl(c, c.dir, 0, dt);
        c.arm = damp(c.arm, 1, 12, dt);
        if (c.stT > 0.38) {
          const tt = c.pd / 440, ax = p.x + (p.vx || 0) * tt * 0.5 - c.x, ay = p.y + (p.vy || 0) * tt * 0.5 - c.y, l = hypot(ax, ay) || 1;
          c.vx = ax / l * 440; c.vy = ay / l * 440 - 70;
          c.x += c.nx * 6; c.y += c.ny * 6;
          ai.set(c, 'dash'); G.sfx('whoosh', { x: c.x, y: c.y });
          G.particles.dust(c.x, c.y, 5, G.css(G.zone.def.rockL), 60, c.nx, c.ny);
        }
      } else {                       // 'dash': in the water, committed
        c.vy += 250 * dt;            // it sinks, which is the arc
        const k = exp(-0.5 * dt); c.vx *= k; c.vy *= k;
        const d = G.sdfGrad(c.x, c.y, _v);
        if (c.stT > 1.25) { c.vx -= _v.x * 520 * dt; c.vy -= _v.y * 520 * dt; }      // missed everything: paddle for the nearest rock
        c.x += c.vx * dt; c.y += c.vy * dt;
        c.da = c.face = atan2(c.vy, c.vx);
        if (c.stT > 0.12 && d < c.r * 0.85) {
          c.nx = _v.x; c.ny = _v.y; c.vx = c.vy = 0;
          ai.set(c, 'idle'); c.cd = G.rr(1.5, 2.3);
          G.particles.dust(c.x - c.nx * 8, c.y - c.ny * 8, 5, G.css(G.zone.def.rockL), 60, c.nx, c.ny);
          G.sfx('clack', { x: c.x, y: c.y });
        }
      }
    },
    draw(c, ctx) {
      const A = c.alpha, t = c.t, leap = c.st === 'dash', arm = c.arm;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(leap ? c.face + PI / 2 : atan2(c.ny, c.nx) + PI / 2);
      ctx.globalAlpha = A; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#d9cdb0'; ctx.lineWidth = 2;
      for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 3; i++) {
        const ph = c.walk + i * 2.1 + (s > 0 ? 1 : 0), lift = leap ? 3 : max(0, sin(ph)) * 2.6, reach = leap ? -2 : cos(ph) * 2.2;
        ctx.beginPath(); ctx.moveTo(s * 5, 1); ctx.lineTo(s * (8 + i * 2.4), -1 - lift - i * 0.5); ctx.lineTo(s * (12.5 + i * 2.6) + reach, leap ? 9 : 6 - lift * 0.5); ctx.stroke();
      }
      // the arms: long, raised, furred with the bacteria it farms
      for (let s = -1; s <= 1; s += 2) {
        const wv = sin(t * 2.2 + (s > 0 ? 0 : 1.4) + c.wave) * (0.32 - arm * 0.2);
        const a = -PI / 2 + s * (1.05 - arm * 0.75) + wv * s, a2 = a - s * (0.5 - arm * 0.3);
        const ex = s * 6 + cos(a) * 11, ey = -3 + sin(a) * 11, hx = ex + cos(a2) * 12, hy = ey + sin(a2) * 12;
        ctx.strokeStyle = '#efe4c6'; ctx.lineWidth = 3.6;
        ctx.beginPath(); ctx.moveTo(s * 6, -3); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,248,214,0.9)'; ctx.lineWidth = 1;
        ctx.beginPath();
        const pa = a2 + PI / 2, pb = a + PI / 2;
        for (let k = 0; k < 7; k++) {
          const u = k / 6, bx = lerp(ex, hx, u), by = lerp(ey, hy, u), hl = 4.4 - u * 1.2;
          ctx.moveTo(bx - cos(pa) * hl, by - sin(pa) * hl); ctx.lineTo(bx + cos(pa) * hl, by + sin(pa) * hl);
          if (k < 5) { const qx = lerp(s * 6, ex, u), qy = lerp(-3, ey, u); ctx.moveTo(qx - cos(pb) * 3.4, qy - sin(pb) * 3.4); ctx.lineTo(qx + cos(pb) * 3.4, qy + sin(pb) * 3.4); }
        }
        ctx.stroke();
        ctx.strokeStyle = '#fff6e0'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + cos(a2 - 0.5) * 4, hy + sin(a2 - 0.5) * 4); ctx.moveTo(hx, hy); ctx.lineTo(hx + cos(a2 + 0.5) * 4, hy + sin(a2 + 0.5) * 4); ctx.stroke();
      }
      const g = ctx.createLinearGradient(0, -8, 0, 6); g.addColorStop(0, '#fbf3dc'); g.addColorStop(1, '#cdbd98');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -1, 8.5, 6.8, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,70,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-5, 1.5); ctx.quadraticCurveTo(0, 3.5, 5, 1.5); ctx.moveTo(-3, -5.6); ctx.lineTo(3, -5.6); ctx.stroke();
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(-2.6, -3.4, 0.9, 0, TAU); ctx.arc(2.6, -3.4, 0.9, 0, TAU); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const k = c.st === 'crouch' ? min(1, c.stT / 0.38) : c.st === 'dash' ? 0.6 : 0;
      if (c.aggro || k) G.drawGlow(ctx, c.x, c.y, 20 + k * 16, '#fff2c8', (0.18 + 0.55 * k) * c.alpha);
    },
  });

  // =================================================================== giant tube worm (a turret that ducks)
  function wormHide(c, secs) { ai.set(c, 'idle'); c.hide = secs; c.tele = 0; }
  G.defCreature('tubeworm', {
    r: 11, hp: 60, hostile: true, dmg: 0, xp: 4, pearl: 0.08, color: '#ff6a5a', fixed: true, noSep: true, mass: 80, fleeStyle: 'retract', fleeTime: 0.5, showR: 46, showY: 34,
    init(c) {
      if (c.nx === undefined) { c.nx = 0; c.ny = -1; }
      c.bx = c.x; c.by = c.y; c.len = G.rr(40, 58);
      const a = atan2(c.ny, c.nx) + G.rr(-0.25, 0.25);
      c.dx = cos(a); c.dy = sin(a); c.bend = G.rr(-6, 6);
      c.tx = c.bx + c.dx * c.len; c.ty = c.by + c.dy * c.len; c.x = c.tx; c.y = c.ty;
      c.out = 0; c.hide = G.rr(0, 1.5); c.shot = 1; c.tele = 0;
    },
    show(c) { c.out = clamp(0.55 + 0.75 * sin(c.t * 1.1), 0, 1); c.tele = 0; },
    think(c, dt, p) {
      c.hide -= dt;
      const sees = !p.dead && c.pd < 400 && ai.see(c, p, 400), crowd = c.pd < 84;
      if (c.st === 'idle') {
        c.out = damp(c.out, 0, 22, dt);
        if (c.hide <= 0 && sees && !crowd) { ai.set(c, 'out'); c.shot = G.rr(0.7, 1.1); c.aggro = true; }
        else if (!sees && c.aggro && c.stT > 3) c.aggro = false;
      } else if (c.st === 'out') {
        c.out = damp(c.out, 1, 9, dt);
        if (crowd || (!sees && c.stT > 1.4)) { wormHide(c, 0.9); G.sfx('pop', { x: c.x, y: c.y }); return; }
        c.shot -= dt;
        c.tele = c.shot < 0.4 ? 1 - c.shot / 0.4 : 0;
        if (c.shot <= 0 && c.out > 0.8) {
          const a = atan2(p.y - c.y, p.x - c.x);
          G.eshots.fire(c.x + c.dx * 10, c.y + c.dy * 10, cos(a) * 176, sin(a) * 176, { r: 6, color: '#ff8a5c', life: 3.6, wob: 14 });
          G.sfx('spit', { x: c.x, y: c.y });
          G.particles.motes(c.x + c.dx * 12, c.y + c.dy * 12, 4, '#ff8a5c', { s0: 20, s1: 80, life: 0.4, size0: 3, size1: 6 });
          c.shot = G.rr(1.5, 1.9);
        }
      } else if (c.stT > 0.22) { wormHide(c, 1.25); G.sfx('pop', { x: c.x, y: c.y }); }          // 'flinch': a beat exposed, then gone
    },
    onHit(c) {
      if (c.st === 'idle' || c.out < 0.35) return 'reflect';
      if (c.st === 'out') ai.set(c, 'flinch');
    },
    anim(c, dt) {
      if (c.fleeing) c.out = damp(c.out, 0, 20, dt);
      c.x = c.tx; c.y = c.ty;
    },
    draw(c, ctx) {
      const A = c.alpha, out = c.out, t = c.t;
      const bx = c.bx, by = c.by, tx = c.tx, ty = c.ty, dx = c.dx, dy = c.dy, px = -dy, py = dx, da = atan2(dy, dx);
      const mx = (bx + tx) / 2 + px * c.bend, my = (by + ty) / 2 + py * c.bend;
      ctx.globalAlpha = A;
      if (out > 0.04) {            // the plume: red for the same reason blood is
        const L = 19 * out, sw = sin(t * 2.4 + c.ph) * 0.12;
        ctx.strokeStyle = '#d8281e'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = -3; i <= 3; i++) { const a = da + i * 0.2 + sw * (1 + abs(i) * 0.3); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + cos(a) * L * 0.6 + px * i * 0.8, ty + sin(a) * L * 0.6 + py * i * 0.8, tx + cos(a) * L, ty + sin(a) * L); }
        ctx.stroke();
        ctx.fillStyle = '#f0463a'; ctx.beginPath(); ctx.ellipse(tx + dx * L * 0.45, ty + dy * L * 0.45, L * 0.5, 4.2 * out, da, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff9c8c'; ctx.beginPath(); ctx.ellipse(tx + dx * L * 0.5, ty + dy * L * 0.5, L * 0.3, 1.6 * out, da, 0, TAU); ctx.fill();
      }
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#3a2c28'; ctx.lineWidth = 12.5; ctx.beginPath(); ctx.moveTo(bx - dx * 6, by - dy * 6); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.strokeStyle = '#eee4d0'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(bx - dx * 6, by - dy * 6); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,250,0.7)'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(bx + px * 2.4, by + py * 2.4); ctx.quadraticCurveTo(mx + px * 2.4, my + py * 2.4, tx + px * 2.4, ty + py * 2.4); ctx.stroke();
      ctx.strokeStyle = 'rgba(120,100,84,0.55)'; ctx.lineWidth = 1.2;
      for (let k = 1; k <= 4; k++) {
        const u = k / 5, a = 1 - u, rx = a * a * bx + 2 * a * u * mx + u * u * tx, ry = a * a * by + 2 * a * u * my + u * u * ty;
        ctx.beginPath(); ctx.moveTo(rx - px * 5, ry - py * 5); ctx.lineTo(rx + px * 5, ry + py * 5); ctx.stroke();
      }
      ctx.fillStyle = out > 0.3 ? '#8a1a14' : '#140c0c'; ctx.beginPath(); ctx.ellipse(tx, ty, 5, 2.4, da + PI / 2, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    },
    glow(c, ctx) { if (c.out > 0.1) G.drawGlow(ctx, c.tx + c.dx * 9, c.ty + c.dy * 9, 16 + 12 * c.tele, '#ff5a4a', (0.3 + 0.6 * c.tele) * c.out * c.alpha); },
    light(c) { if (c.out > 0.3) G.lights.add(c.x, c.y, 76, '#ff7a5a', 0.3 * c.out); },
  });

  // =================================================================== giant isopod (armoured pinball)
  const ROLL = 400;
  G.defCreature('isopod', {
    r: 17, hp: 150, hostile: true, dmg: 1, xp: 9, pearl: 0.22, color: '#d8ccf0', fixed: true, noSep: true, mass: 4, fleeStyle: 'sink', fleeTime: 0.9, showR: 40, showY: 6,
    init(c) {
      c.dir = G.rand() < 0.5 ? 1 : -1; c.walk = 0; c.curl = 0; c.spin = 0; c.cd = G.rr(0, 1); c.bn = 0; c.touch = false; c.da = 0;
      if (c.nx === undefined) { c.nx = 0; c.ny = -1; }
    },
    show(c, dt) { c.walk += dt * 1.6; c.curl = 0; },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 330, dt);
      c.cd -= dt;
      if (c.st === 'idle') {                     // trundling along the floor
        c.curl = damp(c.curl, 0, 6, dt); c.touch = false;
        ai.crawl(c, c.dir, 26, dt); c.walk += 26 * dt * 0.3;
        if (c.ny > -0.15) { c.dir = -c.dir; ai.crawl(c, c.dir, 50, dt); }
        if (aggro && c.cd <= 0 && c.pd < 360 && !p.dead) { ai.set(c, 'curl'); G.sfx('telegraph', { x: c.x, y: c.y }); }
      } else if (c.st === 'curl') {
        ai.crawl(c, c.dir, 0, dt);
        c.curl = min(1, c.stT / 0.42); c.touch = c.curl > 0.6;
        if (c.stT > 0.5) {
          const a = atan2(p.y - c.y, p.x - c.x);
          c.vx = cos(a) * ROLL; c.vy = sin(a) * ROLL; c.x += c.nx * 8; c.y += c.ny * 8; c.bn = 0;
          ai.set(c, 'dash'); G.sfx('whoosh', { x: c.x, y: c.y });
        }
      } else if (c.st === 'dash') {              // rolling
        c.curl = 1; c.touch = true;
        let sp = hypot(c.vx, c.vy);
        if (sp < ROLL * 0.5 && !p.dead) { const a = atan2(p.y - c.y, p.x - c.x); c.vx = cos(a) * ROLL; c.vy = sin(a) * ROLL; sp = ROLL; }
        c.x += c.vx * dt; c.y += c.vy * dt; c.spin += sp * dt / c.r * (c.vx >= 0 ? 1 : -1);
        c.da = atan2(c.vy, c.vx);
        const d = G.sdfGrad(c.x, c.y, _v);
        if (d < c.r) {
          c.x += _v.x * (c.r - d); c.y += _v.y * (c.r - d);
          const vn = c.vx * _v.x + c.vy * _v.y;
          if (vn < 0) {
            c.vx -= 2 * vn * _v.x; c.vy -= 2 * vn * _v.y;
            if (!p.dead) {        // each rebound leans toward the probe: a threat, not a screensaver
              const a = atan2(c.vy, c.vx), na = a + clamp(G.angDiff(a, atan2(p.y - c.y, p.x - c.x)), -0.6, 0.6);
              c.vx = cos(na) * ROLL; c.vy = sin(na) * ROLL;
            }
            c.bn++;
            if (G.cam.sees(c.x, c.y, 40)) { G.particles.dust(c.x - _v.x * c.r, c.y - _v.y * c.r, 4, G.css(G.zone.def.rockL), 70, _v.x, _v.y); G.sfx('clack', { x: c.x, y: c.y }); G.cam.shake(0.05); }
          }
        }
        if (c.stT > 4.2 || c.bn >= 9) { ai.set(c, 'dizzy'); c.stun = 2.2; c.vx *= 0.12; c.vy *= 0.12; }
      } else if (c.st === 'dizzy') ai.set(c, 'settle');           // (think resumes once the stun runs out)
      else {                                     // 'settle': find the floor again
        c.curl = damp(c.curl, 0, 5, dt); c.touch = false;
        const d = G.sdfGrad(c.x, c.y, _v);
        if (d > c.r * 0.78 && c.stT < 3) { c.x -= _v.x * 130 * dt; c.y -= _v.y * 130 * dt; c.spin += dt * 2; }
        else { c.nx = _v.x; c.ny = _v.y; ai.set(c, 'idle'); c.cd = G.rr(2.2, 3.4); }
      }
    },
    onHit(c) { if ((c.st === 'curl' && c.curl > 0.5) || c.st === 'dash') return 'reflect'; },
    onFlare(c) { if (c.st === 'dash' || c.st === 'curl') { c.st = 'dizzy'; c.stT = 0; c.vx *= 0.1; c.vy *= 0.1; } },
    anim(c, dt) {
      if (c.stun > 0 && c.st === 'dizzy') {       // spun itself silly: uncurling, sinking, harmless
        c.curl = damp(c.curl, 0.3, 2, dt); c.touch = false; c.spin += dt * 1.3;
        if (G.sdf(c.x, c.y + 4) > c.r) c.y += 24 * dt;
      }
    },
    draw(c, ctx) {
      const A = c.alpha, t = c.t, curl = c.curl;
      ctx.globalAlpha = A; ctx.lineCap = 'round';
      if (curl > 0.55) {
        const r = c.r * (0.86 + 0.14 * curl);
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.spin);
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r);
        g.addColorStop(0, '#f2ecff'); g.addColorStop(0.55, '#c6b8e0'); g.addColorStop(1, '#7c6ea0');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(80,66,116,0.75)'; ctx.lineWidth = 1.5;
        for (let i = -3; i <= 3; i++) { const xx = i * r * 0.27, hh = sqrt(max(0, r * r - xx * xx)); ctx.beginPath(); ctx.moveTo(xx, -hh); ctx.quadraticCurveTo(xx + r * 0.16, 0, xx, hh); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
        ctx.restore();
      } else {
        const L = 17 * (1 - curl * 0.5);
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(atan2(c.ny, c.nx) + PI / 2); ctx.scale(c.dir, 1);
        ctx.strokeStyle = '#a89cc4'; ctx.lineWidth = 1.7;
        for (let i = 0; i < 7; i++) { const ph = c.walk * 3 + i * 0.9, lx = -11 + i * 3.7; ctx.beginPath(); ctx.moveTo(lx, 1); ctx.lineTo(lx + cos(ph) * 2.2, 7.5 - max(0, sin(ph)) * 2); ctx.stroke(); }
        ctx.fillStyle = '#9d90bd'; ctx.beginPath(); ctx.moveTo(-L + 2, -4); ctx.lineTo(-L - 6, -2); ctx.lineTo(-L - 5, 3); ctx.lineTo(-L + 2, 3); ctx.fill();
        for (let i = 0; i < 7; i++) {            // plates, tail first
          const u = i / 6, x = lerp(-L + 3, L - 4, u), w = 5.2, y = -1 - curl * 4 * sin(PI * u), h = 9.5 * (0.72 + 0.28 * sin(PI * (0.12 + u * 0.8))) - curl * 2;
          const g = ctx.createLinearGradient(0, -h - 2, 0, 4);
          g.addColorStop(0, '#efe8ff'); g.addColorStop(0.6, '#c9bce4'); g.addColorStop(1, '#8f82b2');
          ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, PI, TAU); ctx.lineTo(x + w, 3); ctx.lineTo(x - w, 3); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(90,76,128,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, PI * 1.02, TAU * 0.99); ctx.stroke();
        }
        ctx.fillStyle = '#d6cbee'; ctx.beginPath(); ctx.ellipse(L - 2, 0, 5.5, 6.2, 0, -PI / 2, PI / 2); ctx.lineTo(L - 2, 3); ctx.fill();
        const aw = sin(t * 3 + c.ph) * 2;
        ctx.strokeStyle = '#b4a8d0'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(L + 2, -2); ctx.quadraticCurveTo(L + 9, -7 + aw, L + 15, -4 + aw); ctx.moveTo(L + 2, 0); ctx.quadraticCurveTo(L + 7, -1 - aw, L + 11, 2 - aw); ctx.stroke();
        ctx.fillStyle = '#1c1630'; ctx.beginPath(); ctx.moveTo(L - 3, -4.6); ctx.lineTo(L + 2.2, -2.6); ctx.lineTo(L - 2.4, -0.6); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const A = c.alpha;
      if (c.curl > 0.55) {
        const hot = c.st === 'dash' ? 1 : 0.5;
        G.drawGlow(ctx, c.x, c.y, c.r * 2.3, '#d8ccf0', 0.3 * hot * A);
        ctx.globalAlpha = 0.5 * hot * A; ctx.strokeStyle = '#efe6ff'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 1.5, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      } else {             // the eye throws the lamp straight back, like a cat's
        const ang = atan2(c.ny, c.nx) + PI / 2, lx = (17 * (1 - c.curl * 0.5) - 1) * c.dir, ly = -2.6;
        G.drawGlow(ctx, c.x + cos(ang) * lx - sin(ang) * ly, c.y + sin(ang) * lx + cos(ang) * ly, 6.5, '#d8ffe4', 0.8 * A);
        if (c.st === 'curl') G.drawGlow(ctx, c.x, c.y, 30, '#efe6ff', 0.5 * c.curl * A);
      }
    },
    light(c) { if (c.st === 'dash') G.lights.add(c.x, c.y, 100, '#c8b8f0', 0.32); },
  });

  // =================================================================== THE RIBBON — giant oarfish
  const RN = 28, RSEG = 22;
  const RW = new Float32Array(RN);
  for (let i = 0; i < RN; i++) RW[i] = i < 2 ? 12 + i * 1.5 : lerp(15, 2.6, pow((i - 2) / (RN - 3), 1.15));
  const RTX = new Float32Array(RN), RTY = new Float32Array(RN), RBX = new Float32Array(RN), RBY = new Float32Array(RN);
  const RCX = new Float32Array(RN), RCY = new Float32Array(RN), RNX = new Float32Array(RN), RNY = new Float32Array(RN);
  const ROUT = [];
  // per-joint frame: centre line (with the swim ripple), dorsal normal scaled by how far that joint has rolled over
  function ribbonFrame(c) {
    const X = c.ch.x, Y = c.ch.y, S = c.side;
    for (let i = 0; i < RN; i++) {
      const i0 = i > 0 ? i - 1 : 0, i1 = i < RN - 1 ? i + 1 : RN - 1;
      let tx = X[i0] - X[i1], ty = Y[i0] - Y[i1];
      const l = sqrt(tx * tx + ty * ty) || 1; tx /= l; ty /= l;
      const nx = -ty * S[i], ny = tx * S[i], wave = sin(c.swim - i * 0.55) * 5 * (i / (RN - 1));
      const cx = X[i] + nx * wave, cy = Y[i] + ny * wave, hw = RW[i];
      RCX[i] = cx; RCY[i] = cy; RNX[i] = nx; RNY[i] = ny;
      RTX[i] = cx + nx * hw; RTY[i] = cy + ny * hw; RBX[i] = cx - nx * hw * 0.92; RBY[i] = cy - ny * hw * 0.92;
    }
  }
  const finH = (i, c) => (10 + 3.5 * sin(c.swim * 1.5 - i * 0.9)) * (1 - 0.6 * i / RN);
  function ribbonSpine(c, j, hard) {
    const X = c.ch.x, Y = c.ch.y;
    let tx = X[j - 1] - X[j + 1], ty = Y[j - 1] - Y[j + 1];
    const l = hypot(tx, ty) || 1; tx /= l; ty /= l;
    const sd = c.side[j] >= 0 ? 1 : -1, nx = -ty * sd, ny = tx * sd, sp = hard ? 232 : 195;
    if (hard || c.fside > 0) G.eshots.fire(X[j] + nx * 16, Y[j] + ny * 16, nx * sp, ny * sp, { r: 5, color: '#ff7a66', life: 3.4, kind: 'spine' });
    if (hard || c.fside < 0) G.eshots.fire(X[j] - nx * 14, Y[j] - ny * 14, -nx * sp, -ny * sp, { r: 5, color: '#ff7a66', life: 3.4, kind: 'spine' });
    if (j % 6 === 0) G.sfx('spit', { x: X[j], y: Y[j] });
  }

  G.defCreature('ribbon', {
    boss: true, hostile: true, r: 28, hp: 4600, dmg: 1, xp: 0, mass: 60, color: '#ff8a7a', scanTime: 2.2, scanXp: 16, flareResist: true, noclip: true, noSep: true,
    viewR: 780, showR: 330, fleeTime: 1.6,
    title: 'THE RIBBON', latin: 'Regalecus glesne', epithet: 'giant oarfish', relic: 'crest', music: 'boss',
    init(c) {
      c.ch = kit.chain(RN, RSEG); c.side = new Float32Array(RN).fill(-1);
      c.swim = 0; c.phase = 1; c.cd = 1.5; c.speed = 0; c.arm = 0; c.last = ''; c.orb = 1; c.n = 0; c.da = 0; c.went = 0;
      c.glowK = 0; c.fireOn = false; c.fpar = 0; c.fside = 1; c.restT = 1; c.r0 = 300; c.pulsed = 0; c.sside = 1; c.sdir = 1; c.sx0 = 0; c.sph = 0;
      if (!c.specimen) {
        const A = G.zone.arena;
        c.x = A.x + A.rx * 0.4; c.y = A.y - A.ry * 0.62;
        c.face = c.hd = -PI / 2;
        kit.chainSet(c.ch, c.x, c.y, -PI / 2);          // asleep it hangs head-up, the way they really do
        const idx = []; for (let i = 2; i < RN; i += 2) idx.push(i);
        G.addParts(c, idx, 16, 0.6);
      } else { c.face = c.hd = 0; kit.chainSet(c.ch, 0, 0, 0); }
    },
    wake(c) { ai.set(c, 'intro'); c.cd = 1.2; c.hd = c.face = -PI / 2 - 0.5; },
    onHit(c) { if (c.asleep) return false; },
    think(c, dt, p) {
      if (c.asleep) { c.vx = c.vy = 0; return; }
      const A = G.zone.arena, hard = c.hp < c.maxHp * 0.5;
      if (hard && c.phase === 1) {
        c.phase = 2; G.sfx('roar'); G.cam.shake(0.5); G.fx.punch(0.5, 0.2);
        G.particles.ring(c.x, c.y, 20, 260, '#ff6a55', 0.6, 4);
        G.hud.toast('Its crest is lit from end to end', '', { color: '#ff8a7a', life: 2.6 });
        c.fireOn = false; ai.set(c, 'cruise'); c.cd = 0.7;
      }
      const toP = ai.toPlayer(c, p);
      // default: a slow circuit of the room
      const oa = atan2((c.y - A.y) / A.ry, (c.x - A.x) / A.rx) + c.orb * 0.55;
      let want = atan2(A.y + sin(oa) * A.ry * 0.52 - c.y, A.x + cos(oa) * A.rx * 0.6 - c.x), sp = hard ? 300 : 250, turn = 3.4, weave = 0.2;
      if (c.st === 'intro') { sp = 210; if (c.stT > 1.2) ai.set(c, 'cruise'); }
      else if (c.st === 'cruise') {
        c.arm = damp(c.arm, 0, 4, dt);
        c.cd -= dt;
        if (G.rand() < dt * 0.12) c.orb = -c.orb;
        if (c.cd <= 0 && !p.dead) {
          const opts = ['sweep', 'coil', 'volley', 'charge'], k = opts.indexOf(c.last);
          if (k >= 0) opts.splice(k, 1);
          const pk = opts[(G.rand() * opts.length) | 0];
          c.last = pk;
          if (pk === 'sweep') { ai.set(c, 'sweepGo'); c.sside = c.x < A.x ? -1 : 1; c.n = hard ? 3 : 2; }
          else if (pk === 'coil') { ai.set(c, 'coil'); c.r0 = clamp(c.pd, 250, 420); c.orb = G.rand() < 0.5 ? 1 : -1; c.pulsed = 0; }
          else if (pk === 'volley') { ai.set(c, 'volley'); c.n = 2; c.glowK = -7; c.fpar = 0; c.fside = 1; c.fireOn = true; G.sfx('telegraph', { x: c.x, y: c.y }); }
          else { ai.set(c, 'aim'); c.n = hard ? 2 : 1; G.sfx('telegraph', { x: c.x, y: c.y }); }
        }
      } else if (c.st === 'sweepGo') {             // out to one wall…
        want = atan2(A.y - c.y, A.x + c.sside * A.rx * 0.84 - c.x); sp = 430; turn = 5; weave = 0;
        if (abs(A.x + c.sside * A.rx * 0.84 - c.x) < 90 || c.stT > 2.4) {
          ai.set(c, 'sweep'); c.sdir = -c.sside; c.sx0 = c.x; c.sph = G.rand() < 0.5 ? 0 : PI;
          G.sfx('growl', { x: c.x, y: c.y });
        }
      } else if (c.st === 'sweep') {               // …then back across the room as one long travelling wave
        const span = A.rx * 1.66, u = (c.x - c.sx0) * c.sdir / span, tu = u + 0.07;
        want = atan2(A.y + sin(tu * TAU * 1.5 + c.sph) * A.ry * 0.52 - c.y, c.sx0 + c.sdir * tu * span - c.x);
        sp = hard ? 540 : 460; turn = 7.5; weave = 0;
        if (u >= 1 || c.stT > 4) {
          c.n--;
          if (c.n > 0) { c.sdir = -c.sdir; c.sx0 = c.x; c.sph += PI * 0.5; c.stT = 0; }
          else { ai.set(c, 'cruise'); c.cd = hard ? 0.9 : 1.4; }
        }
      } else if (c.st === 'coil') {                // rings the probe, tightening, then strikes through the middle
        const T = hard ? 4.0 : 3.4, u = min(1, c.stT / T), R = lerp(c.r0, 150, u);
        const ox = clamp(p.x, A.x - A.rx * 0.62, A.x + A.rx * 0.62), oy = clamp(p.y, A.y - A.ry * 0.5, A.y + A.ry * 0.5);
        const a = atan2(c.y - oy, c.x - ox) + c.orb * 0.5;
        want = atan2(oy + sin(a) * R - c.y, ox + cos(a) * R - c.x); sp = hard ? 430 : 370; turn = 7; weave = 0;
        // now and then the whole coil spits inward
        if ((c.pulsed === 0 && u > 0.5) || (hard && c.pulsed === 1 && u > 0.82)) {
          c.pulsed++;
          const X = c.ch.x, Y = c.ch.y;
          for (let j = 3; j < RN; j += 4) { const dx = ox - X[j], dy = oy - Y[j], l = hypot(dx, dy) || 1; G.eshots.fire(X[j] + dx / l * 18, Y[j] + dy / l * 18, dx / l * 150, dy / l * 150, { r: 5, color: '#ff7a66', life: 2.6 }); }
          G.sfx('spit', { x: c.x, y: c.y });
        }
        if (c.stT > T) { ai.set(c, 'aim'); c.n = 1; G.sfx('telegraph', { x: c.x, y: c.y }); }
      } else if (c.st === 'volley') {              // every spine of the crest lets go in turn, head to tail
        sp = 105;
        const rate = hard ? 24 : 17, lead = 3.5, before = floor(c.glowK - lead);
        c.glowK += rate * dt;
        const now = floor(c.glowK - lead);
        for (let j = max(1, before + 1); j <= min(RN - 2, now); j++) if (j % 2 === c.fpar) ribbonSpine(c, j, hard);
        if (c.glowK - lead > RN) {
          c.n--;
          if (c.n > 0) { c.glowK = -6; c.fpar = 1 - c.fpar; c.fside = -c.fside; G.sfx('telegraph', { x: c.x, y: c.y }); }
          else { c.fireOn = false; ai.set(c, 'rest'); c.restT = 0.7; }
        }
      } else if (c.st === 'aim') {                 // rears, sights down its own nose
        want = toP; turn = 8; sp = 30; weave = 0;
        c.arm = damp(c.arm, 1, 12, dt);
        if (c.stT > (hard ? 0.44 : 0.58)) { c.da = c.hd; c.went = 0; ai.set(c, 'dash'); G.sfx('whoosh', { x: c.x, y: c.y }); G.sfx('growl', { x: c.x, y: c.y }); }
      } else if (c.st === 'dash') {
        want = c.da; turn = 0; weave = 0; sp = hard ? 960 : 880; c.speed = sp; c.went += sp * dt;
        if (G.rand() < dt * 70) G.particles.bubble(c.x - cos(c.da) * 30 + G.rr(-12, 12), c.y - sin(c.da) * 30 + G.rr(-12, 12), G.rr(2, 4.5), 0, 0, 0.8);
        const ex = (c.x - A.x) / (A.rx * 0.97), ey = (c.y - A.y) / (A.ry * 0.95);
        if (c.went > 760 || (c.went > 120 && ex * ex + ey * ey > 1) || c.stT > 0.9) {
          c.n--; c.speed = 220;
          if (c.n > 0) { ai.set(c, 'aim'); G.sfx('telegraph', { x: c.x, y: c.y }); }
          else { ai.set(c, 'rest'); c.restT = 0.9; }
        }
      } else {                                     // 'rest'
        sp = 110; c.arm = damp(c.arm, 0, 4, dt);
        if (c.stT > c.restT) { ai.set(c, 'cruise'); c.cd = hard ? G.rr(0.7, 1.2) : G.rr(1.2, 1.9); }
      }
      // stay in the room (it is free of the rock only because it keeps itself out of it)
      if (c.st !== 'dash') {
        const ex = (c.x - A.x) / (A.rx * 0.9), ey = (c.y - A.y) / (A.ry * 0.86);
        if (ex * ex + ey * ey > 1) { want = atan2(A.y - c.y, A.x - c.x); turn = max(turn, 5.5); }
      }
      c.hd += clamp(G.angDiff(c.hd, want), -turn * dt, turn * dt);
      c.face = c.hd + sin(c.t * 2.2) * weave;
      c.speed = damp(c.speed, sp, 4, dt);
      c.vx = cos(c.face) * c.speed; c.vy = sin(c.face) * c.speed;
    },
    anim(c, dt) {
      const ch = c.ch, X = ch.x, Y = ch.y, S = c.side;
      if (c.asleep) { const t = c.t; for (let i = 0; i < RN; i++) { X[i] = c.x + sin(t * 0.7 - i * 0.22) * i * 0.55; Y[i] = c.y + i * RSEG; } }
      else kit.chainFollow(ch, c.x, c.y, c.face, 0.36);
      c.swim += dt * (c.asleep ? 1.4 : 3 + (c.speed || 0) * 0.012);
      // each joint rolls its back uppermost a moment after the one before: a turn runs down the body as a twist
      const k = 1 - exp(-9 * dt);
      for (let i = 0; i < RN; i++) {
        const i0 = i > 0 ? i - 1 : 0, i1 = i < RN - 1 ? i + 1 : RN - 1, tx = X[i0] - X[i1], u = tx / (hypot(tx, Y[i0] - Y[i1]) || 1);
        S[i] += ((u > 0.3 ? -1 : u < -0.3 ? 1 : (S[i] >= 0 ? 1 : -1)) - S[i]) * k;
      }
      G.syncParts(c, ch);
    },
    draw(c, ctx) {
      const A = c.alpha, n = RN, hard = c.phase === 2;
      ribbonFrame(c);
      ctx.globalAlpha = A; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const hx = RCX[0], hy = RCY[0], dnx = RNX[0], dny = RNY[0];
      let ftx = RCX[0] - RCX[1], fty = RCY[0] - RCY[1];
      const fl = hypot(ftx, fty) || 1; ftx /= fl; fty /= fl;
      // the "oars": two long pelvic rays, each ending in a little paddle
      ctx.strokeStyle = '#e8483a'; ctx.lineWidth = 1.8; ctx.fillStyle = '#ff5a48';
      for (let k = 0; k < 2; k++) {
        const e = 9 + k * 3, m = (2 + e) >> 1, sw = sin(c.swim * 0.7 + k * 1.7) * 9, drop = 30 + k * 14 + sw;
        const ex = RBX[e] - RNX[e] * drop, ey = RBY[e] - RNY[e] * drop, mx = RBX[m] - RNX[m] * 20, my = RBY[m] - RNY[m] * 20;
        ctx.beginPath(); ctx.moveTo(RBX[2], RBY[2]); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(ex, ey, 6, 2.6, atan2(ey - my, ex - mx), 0, TAU); ctx.fill();
      }
      // dorsal fin: one continuous red ribbon, rippling
      ctx.fillStyle = hard ? '#ff4a38' : '#e03a30';
      ctx.beginPath(); ctx.moveTo(RTX[1], RTY[1]);
      for (let i = 2; i < n - 1; i++) ctx.lineTo(RTX[i], RTY[i]);
      for (let i = n - 2; i >= 1; i--) { const fh = finH(i, c); ctx.lineTo(RTX[i] + RNX[i] * fh, RTY[i] + RNY[i] * fh); }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(120,20,16,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < n - 1; i++) { const fh = finH(i, c); ctx.moveTo(RTX[i], RTY[i]); ctx.lineTo(RTX[i] + RNX[i] * fh, RTY[i] + RNY[i] * fh); }
      ctx.stroke();
      // the crown: the first rays of that fin, grown absurdly long
      const rear = c.arm, back = 0.85 - rear * 0.6, upk = 0.45 + rear * 0.55;
      ctx.strokeStyle = '#ff5040'; ctx.lineWidth = 2; ctx.fillStyle = '#ff6a55';
      for (let k = 0; k < 6; k++) {
        const j = k < 3 ? 0 : 1, L = 44 + k * 9, sw = sin(c.swim * 0.9 + k * 0.8) * 7;
        const bx = RTX[j] - ftx * k * 2.5, by = RTY[j] - fty * k * 2.5;
        const ex = bx - ftx * L * back + dnx * (L * upk + sw), ey = by - fty * L * back + dny * (L * upk + sw);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - ftx * L * back * 0.3 + dnx * L * upk * 0.8, by - fty * L * back * 0.3 + dny * L * upk * 0.8, ex, ey); ctx.stroke();
        ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, TAU); ctx.fill();
      }
      // body: a long silver blade
      const O = ROUT; O.length = 0;
      O.push(hx + ftx * 14 - dnx * 2, hy + fty * 14 - dny * 2);
      for (let i = 0; i < n; i++) O.push(RTX[i], RTY[i]);
      O.push(RCX[n - 1] * 2 - RCX[n - 2], RCY[n - 1] * 2 - RCY[n - 2]);
      for (let i = n - 1; i >= 0; i--) O.push(RBX[i], RBY[i]);
      ctx.fillStyle = '#d3dde8'; ctx.beginPath(); G.smoothPath(ctx, O, true); ctx.fill();
      ctx.strokeStyle = 'rgba(138,158,184,0.85)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(RTX[0] * 0.7 + RCX[0] * 0.3, RTY[0] * 0.7 + RCY[0] * 0.3);
      for (let i = 1; i < n - 2; i++) ctx.lineTo(RTX[i] * 0.7 + RCX[i] * 0.3, RTY[i] * 0.7 + RCY[i] * 0.3);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(RCX[0], RCY[0]);
      for (let i = 1; i < n - 3; i++) ctx.lineTo(RCX[i], RCY[i]);
      ctx.stroke();
      // the dark dashes down its flank
      ctx.strokeStyle = 'rgba(70,90,120,0.5)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 3; i < n - 4; i += 2) {
        const tx = (RCX[i - 1] - RCX[i + 1]) * 0.1, ty = (RCY[i - 1] - RCY[i + 1]) * 0.1, k = RW[i] * 0.55;
        ctx.moveTo(RCX[i] + RNX[i] * k + tx, RCY[i] + RNY[i] * k + ty); ctx.lineTo(RCX[i] - RNX[i] * k * 0.3 - tx, RCY[i] - RNY[i] * k * 0.3 - ty);
      }
      ctx.stroke();
      // head: gill cover, small down-turned mouth, a very large eye
      ctx.strokeStyle = 'rgba(90,110,140,0.65)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(hx - ftx * 8 + dnx * 9, hy - fty * 8 + dny * 9); ctx.quadraticCurveTo(hx - ftx * 2, hy - fty * 2, hx - ftx * 8 - dnx * 9, hy - fty * 8 - dny * 9); ctx.stroke();
      ctx.strokeStyle = '#3a4656'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx + ftx * 13 - dnx * 2.5, hy + fty * 13 - dny * 2.5); ctx.lineTo(hx + ftx * 7 - dnx * 5.5, hy + fty * 7 - dny * 5.5); ctx.stroke();
      c.eyeX = hx + ftx * 3 + dnx * 3.6; c.eyeY = hy + fty * 3 + dny * 3.6;
      ctx.globalAlpha = 1;
      kit.eye(ctx, c.eyeX, c.eyeY, 6.2, ai.toPlayer(c, G.player), { alpha: A, white: '#e9f1f7', iris: hard ? '#ff6a50' : '#8fa6bc', pupil: 0.5, dazed: c.stun > 0 });
    },
    glow(c, ctx) {
      const A = c.alpha, t = G.time, hard = c.phase === 2;
      ribbonFrame(c);
      const base = (c.asleep ? 0.1 : hard ? 0.3 : 0.17) * A;
      for (let i = 1; i < RN - 1; i += 2) {
        const fh = finH(i, c) * 0.6, k = c.glowK - i;
        let a = base * (0.75 + 0.25 * sin(t * 3 - i * 0.5)), big = false;
        if (c.fireOn && k > -1.5 && k < 4) { const w = (1 - abs(k - 1.2) / 2.8) * 0.95 * A; if (w > a) { a = w; big = true; } }      // the volley's warning light, running down the crest
        G.drawGlow(ctx, RTX[i] + RNX[i] * fh, RTY[i] + RNY[i] * fh, big ? 24 : 15, big ? '#ffb090' : '#ff4a38', a);
      }
      if (c.eyeX !== undefined) G.drawGlow(ctx, c.eyeX, c.eyeY, 11, hard ? '#ff8a70' : '#e8f4ff', 0.5 * A);
      if (c.st === 'aim') {
        const u = min(1, c.stT / 0.5), a = c.hd, d = G.raycast(c.x, c.y, cos(a), sin(a), 800);
        ctx.globalAlpha = 0.14 + 0.42 * u; ctx.strokeStyle = '#ffc0b0'; ctx.lineWidth = 2 + 5 * u; ctx.setLineDash([16, 11]); ctx.lineDashOffset = -t * 160;
        ctx.beginPath(); ctx.moveTo(c.x + cos(a) * 36, c.y + sin(a) * 36); ctx.lineTo(c.x + cos(a) * d, c.y + sin(a) * d); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        G.drawGlow(ctx, c.x, c.y, 40 + u * 20, '#ffb090', 0.3 + 0.4 * u);
      }
    },
    light(c) {
      if (c.fleeing) return;
      const X = c.ch.x, Y = c.ch.y, k = c.asleep ? 0.6 : 1, a = (c.phase === 2 ? 0.4 : 0.26) * k;
      G.lights.add(c.x, c.y, 240, '#ffd8c8', 0.5 * k);
      for (let i = 5; i < RN; i += 6) G.lights.add(X[i], Y[i], 170, '#ff9a88', a);
    },
  });

  // =================================================================== field notes
  const add = G.codexAdd;
  add('smoker', { name: 'Black Smoker', latin: 'hydrothermal vent chimney', zone: 3, kind: 'flora', size: 'to 60 m', decor: 'smoker', decorO: { specimen: true, h: 64 }, showR: 66, showY: 44, notes: 'Seawater sinks into the crust, meets magma, and comes back at 400 degrees carrying dissolved metal. The smoke is that metal freezing into grains the instant it touches the cold. Nobody knew these existed until 1977. It rumbles before it goes. Above the hot part the jet is only a lift, and I have ridden it twice, on purpose, the second time.' });
  add('bactmat', { name: 'Bacterial Mat', latin: 'Beggiatoa and friends', zone: 3, kind: 'flora', size: 'a film', decor: 'bactmat', showR: 34, showY: 8, notes: 'Everything I catalogued above this depth was, in the end, eating sunlight at one or two removes. Not here. These eat the sulphur in the vent water, and everything else down here eats them, or eats what does. A whole world that never needed the sun. I find I keep coming back to that.' });
  add('mussel', { name: 'Vent Mussel', latin: 'Bathymodiolus thermophilus', zone: 3, kind: 'fauna', size: '20 cm', decor: 'mussels', showR: 36, showY: 14, notes: 'Keeps bacteria in its gills that turn hydrogen sulphide into food. That is the gas that smells of bad eggs and kills most animals. The mussel has arranged for it to be lunch instead, and delegated the cooking.' });
  add('ventshrimp', { name: 'Vent Shrimp', latin: 'Rimicaris exoculata', zone: 3, kind: 'fauna', size: '6 cm', spec: { type: 'school', o: { n: 14, tint: '#f4f4f0', codexId: 'ventshrimp' } }, notes: 'No eyes to speak of. Instead a patch on its back that senses the faint glow of the vent itself: water hot enough to shine. They crowd as close to it as they can without cooking. That is a narrow margin, and thousands of them live in it.' });
  add('dumbo', { name: 'Dumbo Octopus', latin: 'Grimpoteuthis sp.', zone: 3, kind: 'fauna', size: '30 cm', notes: 'Flies with its ears. They are fins, technically, but look at it. It has no ink, because down here there has never been anyone to hide from, and it drifts like an umbrella somebody let go of. When I came close it spread its whole web and held very still, hoping to look large. I watched for longer than the survey strictly required.' });
  add('seapig', { name: 'Sea Pig', latin: 'Scotoplanes globosa', zone: 3, kind: 'fauna', size: '15 cm', notes: 'A sea cucumber that walks, by inflating and deflating its legs. Herds of them all face into the current, sniffing for scraps that fell from the world above. The feelers on its back are also legs. I asked no further questions.' });
  add('yeti', { name: 'Yeti Crab', latin: 'Kiwa hirsuta', zone: 3, kind: 'fauna', size: '15 cm', notes: 'Blind, pale, and furred all down its arms. The fur is a farm: it grows bacteria there and waves its arms over the vent to feed them, slowly, in rhythm. I took this for a greeting. It was gardening. Then it jumped on me, which I gather is not part of the gardening.' });
  add('tubeworm', { name: 'Giant Tube Worm', latin: 'Riftia pachyptila', zone: 3, kind: 'fauna', size: '2.4 m', notes: 'No mouth and no gut. Two metres of animal living entirely on bacteria it keeps inside itself, fed through that plume, which is red for the same reason blood is. It is gone into its tube before I have finished noticing it, and my pulses ring off the outside. It also spits. The trick is to catch it with its plume out.' });
  add('isopod', { name: 'Giant Isopod', latin: 'Bathynomus giganteus', zone: 3, kind: 'fauna', size: '50 cm', notes: 'A woodlouse the size of a boot. One in an aquarium went five years without eating and seemed to consider it a personal best. When bothered it rolls into an armoured ball that my pulses skip straight off, and bounces around the room until it has made itself dizzy. So I wait. I am good at waiting.' });
  add('ribbon', { name: 'Giant Oarfish', latin: 'Regalecus glesne', zone: 3, kind: 'fauna', boss: true, size: '11 m, on paper', notes: 'The longest bony fish there is. It hangs upright in the dark like something left in a wardrobe, and swims by rippling one red fin that runs the whole length of it. Every sea-serpent story I have on file starts with somebody meeting one of these at the surface. It looked me over the way you would look over a moth, and then it stopped being in the way.' });

  // =================================================================== what lives where
  const H = G.popHelp;
  G.ZONE_CONTENT[3] = {
    boss: 'ribbon',
    pockets: ['pod', 'cleaner', 'wreck', 'pod', 'nest'],
    hostiles: [
      { type: 'yeti', cost: 2, w: 3, wall: true, sink: 9 },
      { type: 'tubeworm', cost: 1.5, w: 3, wall: true, sink: 0 },
      { type: 'isopod', cost: 3, w: 2, wall: 'floor', sink: 12, minT: 0.12 },
    ],
    budget: t => 5 + t * 7,
    decorAt(zone, rng, x, y, nx, ny) {
      const D = G.decor, r = rng(), s = rng.range(0.85, 1.2), A = zone.arena;
      const floorish = ny < -0.72, ceil = ny > 0.7;
      if (floorish) {
        if (r < 0.03) {
          // vents: spaced out, with headroom, and never where the probe arrives or rests
          const sm = zone.smokers || (zone.smokers = []);
          const ex = (x - A.x) / A.rx, ey = (y - A.y) / A.ry, inArena = ex * ex + ey * ey < 1.15;
          if (inArena && rng() < 0.5) return;
          if (G.dist2(x, y, zone.start.x, zone.start.y) < 440 * 440) return;
          if (G.sdf(x + nx * 150, y + ny * 150) < 44) return;
          for (const q of sm) if (G.dist2(q.x, q.y, x, y) < 170 * 170) return;
          for (const pk of zone.pockets) if (G.dist2(pk.x, pk.y, x, y) < (pk.r + 40) * (pk.r + 40)) return;
          const d = D.add('smoker', x, y + 2, nx, ny, { s });
          sm.push({ x, y, nx, ny });
          if (d) H.specimen('smoker', d.x + nx * d.h * 0.6, d.y + ny * d.h * 0.6, 3, 38);
        } else if (r < 0.068) D.add('tubelets', x, y, nx, ny, { s });
        else if (r < 0.118) { D.add('mussels', x, y + 2, nx, ny, { s }); H.specimen('mussel', x + nx * 8, y + ny * 8, 3, 24); }
        else if (r < 0.158) D.add('sulfur', x, y + 2, nx, ny, { s });
        else if (r < 0.218) { D.add('bactmat', x, y, nx, ny, { s }); H.specimen('bactmat', x + nx * 6, y + ny * 6, 2, 24); }
        else if (r < 0.224) D.add('bubbler', x, y, nx, ny);
      } else if (ceil) {
        if (r < 0.03) D.add('sulfur', x, y - 2, nx, ny, { s: s * 0.8 });
        else if (r < 0.05) D.add('bactmat', x, y, nx, ny, { s });
      } else {
        if (r < 0.03) D.add('tubelets', x, y, nx, ny, { s });
        else if (r < 0.07) D.add('sulfur', x - nx * 2, y - ny * 2, nx, ny, { s });
        else if (r < 0.1) D.add('bactmat', x, y, nx, ny, { s });
        else if (r < 0.12) D.add('mussels', x - nx * 2, y - ny * 2, nx, ny, { s });
      }
    },
    ambient(zone, rng, H) {
      const CR = G.creatures;
      // company
      for (const c of zone.chambers) {
        if (rng.chance(0.6)) { const p = H.open(rng, c.x, c.y - c.r * 0.2, c.r * 0.6, 44); if (p) CR.spawn('dumbo', p.x, p.y); }
      }
      for (let i = 0; i < 3; i++) { const q = zone.path[rng.int(4, max(5, zone.path.length - 8))]; if (q && G.sdf(q.x, q.y) > 44) CR.spawn('dumbo', q.x, q.y); }
      let herds = 0;
      for (const c of zone.chambers) {
        if (herds >= 5 || !rng.chance(0.65)) continue;
        const fl = H.surface(rng, c.x, c.y + c.r * 0.5, c.r * 1.1, 'floor', 30);
        if (!fl) continue;
        const dir = rng.sign(), n = rng.int(3, 5);
        for (let i = 0; i < n; i++) CR.spawn('seapig', fl.x - fl.ny * (i - n / 2) * 30 + fl.nx * 8, fl.y + fl.nx * (i - n / 2) * 30 + fl.ny * 8, { dir, nx: fl.nx, ny: fl.ny });
        herds++;
      }
      // shrimp crowd the vents
      const sm = zone.smokers || [];
      for (let i = 0; i < min(7, sm.length); i++) {
        const q = sm[(i * 5 + 2) % sm.length], x = q.x + q.nx * 120 + rng.range(-40, 40), y = q.y + q.ny * 120;
        if (G.sdf(x, y) > 40) CR.spawn('school', x, y, { n: rng.int(10, 16), tint: '#f4f4f0', codexId: 'ventshrimp' });
      }
      // tube worms come in stands
      for (const c of zone.chambers) {
        if (!rng.chance(0.5)) continue;
        const sp = H.surface(rng, c.x, c.y, c.r * 1.15, undefined, 60);
        if (!sp) continue;
        const n = rng.int(2, 3);
        for (let k = 0; k < n; k++) {
          const q = k === 0 ? sp : H.surface(rng, sp.x, sp.y, 76, undefined, 40);
          if (q && !H.crowded(q.x, q.y, 26)) CR.spawn('tubeworm', q.x, q.y, { nx: q.nx, ny: q.ny });
        }
      }
      // a few neighbours from the zone above, if that zone has been built
      if (G.CREATURES.angler) {
        try {
          let n = 0;
          for (const c of zone.chambers) { if (n >= 3 || c.t < 0.3 || !rng.chance(0.4)) continue; const p = H.open(rng, c.x, c.y, c.r * 0.6, 60); if (p && CR.spawn('angler', p.x, p.y)) n++; }
        } catch (e) { /* not ours to depend on */ }
      }
    },
  };
})();
