'use strict';
/* UNDERSONG — the Shallows, animals. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, exp, PI, hypot, floor } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit, ai = G.ai;
  const _v = { x: 0, y: 0 };
  const P6 = kit.profile(6, 0.9, 0.5), P9 = kit.profile(9, 0.15, 0.75);

  // ------------------------------------------------------------------ sardine school (one entity, many fish)
  G.defCreature('school', {
    r: 44, hp: 1, passive: true, hittable: false, noSep: true, noclip: true, codex: 'sardine', scanXp: 5, leash: 300, viewR: 260,
    init(c) {
      c.fish = [];
      const n = c.n || (16 + ((G.rand() * 12) | 0));
      for (let i = 0; i < n; i++) c.fish.push({ x: c.x + G.rr(-50, 50), y: c.y + G.rr(-40, 40), vx: G.rr(-30, 30), vy: G.rr(-30, 30), ph: G.rand() * TAU });
      c.scare = 0; c.tint = c.tint || '#7fa8c8';
    },
    think(c, dt, p) {
      ai.wander(c, 40, dt);
      const near = c.pd < 170 && !p.dead;
      c.scare = damp(c.scare, near ? 1 : 0, near ? 10 : 0.7, dt);
      const shots = G.ents.shots, top = 80 + 250 * c.scare, fr = G.frame;
      for (let i = 0; i < c.fish.length; i++) {
        const f = c.fish[i];
        let dx = c.x - f.x, dy = c.y - f.y;
        let ax = dx * 1.8 - dy * 1.1, ay = dy * 1.8 + dx * 1.1;       // pull in + swirl
        const px = f.x - p.x, py = f.y - p.y, pd2 = px * px + py * py;
        if (pd2 < 150 * 150 && !p.dead) { const pd = sqrt(pd2) || 1, k = (1 - pd / 150) * 2600; ax += px / pd * k; ay += py / pd * k; }
        for (let s = 0; s < shots.length; s++) { const sx = f.x - shots[s].x, sy = f.y - shots[s].y, sd2 = sx * sx + sy * sy; if (sd2 < 70 * 70) { const sd = sqrt(sd2) || 1; ax += sx / sd * 3000; ay += sy / sd * 3000; c.scare = 1; } }
        const o = c.fish[(i * 7 + fr) % c.fish.length];              // cheap separation: one neighbour per frame
        if (o !== f) { const ox = f.x - o.x, oy = f.y - o.y, od2 = ox * ox + oy * oy; if (od2 < 16 * 16 && od2 > 0.01) { ax += ox * 26; ay += oy * 26; } }
        f.vx += ax * dt; f.vy += ay * dt;
        const sp = hypot(f.vx, f.vy) || 1;
        if (sp > top) { f.vx *= top / sp; f.vy *= top / sp; } else if (sp < 34) { f.vx *= 1.06; f.vy *= 1.06; }
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (((i + fr) & 3) === 0) { const d = G.sdfGrad(f.x, f.y, _v); if (d < 10) { f.x += _v.x * (10 - d); f.y += _v.y * (10 - d); f.vx += _v.x * 60; f.vy += _v.y * 60; } }
      }
    },
    draw(c, ctx) {
      const t = G.time;
      ctx.globalAlpha = c.alpha;
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass ? '#ffffff' : c.tint;
        ctx.beginPath();
        for (const f of c.fish) {
          const shim = sin(t * 5 + f.ph * 3 + f.x * 0.02) > 0.72;
          if (shim !== !!pass) continue;
          const a = atan2(f.vy, f.vx), ca = cos(a), sa = sin(a);
          ctx.moveTo(f.x + ca * 8, f.y + sa * 8);
          ctx.quadraticCurveTo(f.x - sa * 3.8, f.y + ca * 3.8, f.x - ca * 6, f.y - sa * 6);
          ctx.lineTo(f.x - ca * 11 - sa * 3.6, f.y - sa * 11 + ca * 3.6); ctx.lineTo(f.x - ca * 11 + sa * 3.6, f.y - sa * 11 - ca * 3.6); ctx.lineTo(f.x - ca * 6, f.y - sa * 6);
          ctx.quadraticCurveTo(f.x + sa * 3.8, f.y - ca * 3.8, f.x + ca * 8, f.y + sa * 8);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  });

  // ------------------------------------------------------------------ garibaldi: all conviction, no damage
  G.defCreature('garibaldi', {
    r: 11, hp: 12, passive: true, color: '#ff8a2a', scanXp: 5, leash: 110,
    init(c) { c.ch = kit.chain(6, 5.5); kit.chainSet(c.ch, c.x, c.y, c.face); c.swim = 0; c.cd = G.rr(0.5, 2.5); },
    think(c, dt, p) {
      c.cd -= dt;
      if (c.st === 'idle') { ai.wander(c, 30, dt); if (c.pd < 240 && c.cd <= 0 && !p.dead && ai.see(c, p, 240)) ai.set(c, 'charge'); }
      else if (c.st === 'charge') { ai.seek(c, p.x, p.y, 215, 5, dt); if (c.stT > 2.4) ai.set(c, 'back'); }
      else { ai.seek(c, c.home.x, c.home.y, 120, 3, dt); if (c.stT > 1.1) { ai.set(c, 'idle'); c.cd = G.rr(1.6, 3.8); } }
      ai.faceVel(c, 9, dt);
    },
    onBump(c, p) {
      const a = atan2(p.y - c.y, p.x - c.x);
      p.vx += cos(a) * 130; p.vy += sin(a) * 130; c.kx = -cos(a) * 190; c.ky = -sin(a) * 190;
      G.sfx('pop', { x: c.x, y: c.y }); G.particles.text(c.x, c.y - 18, '!', '#ffb060', 17, 0.6); G.particles.bubbles(c.x, c.y, 4, 5, 60);
      ai.set(c, 'back');
    },
    anim(c, dt) { kit.chainFollow(c.ch, c.x, c.y, c.face, 0.5); c.swim += dt * (5 + hypot(c.vx, c.vy) * 0.07); },
    draw(c, ctx) {
      kit.fish(ctx, c.ch, { w: 8.5, prof: P6, up: kit.upSide(c), phase: c.swim, amp: 2.2, body: '#ff8a2a', belly: '#ffbd5a', fin: '#e5670f', tail: 11, dorsal: 5, anal: 4, pect: 6, alpha: c.alpha });
      kit.eye(ctx, kit.ex, kit.ey, 2.6, ai.toPlayer(c, G.player), { alpha: c.alpha, angry: c.st === 'charge' ? 1 : 0, iris: '#3a2a10' });
    },
  });

  // ------------------------------------------------------------------ pufferfish
  function spines(c, n, off) {
    G.eshots.ring(c.x, c.y, n, 185, { kind: 'spine', r: 4, color: '#ffd27a', life: 2.6 }, off);
    G.sfx('spit', { x: c.x, y: c.y }); G.particles.ring(c.x, c.y, c.r, c.r + 28, '#ffe6a8', 0.25, 2);
  }
  G.defCreature('puffer', {
    r: 13, hp: 34, hostile: true, dmg: 1, xp: 4, pearl: 0.12, color: '#ffe08a', mass: 1.2, leash: 140,
    init(c) { c.puff = 0; c.cd = 0; c.touch = false; c.dir = 1; },
    think(c, dt, p) {
      c.cd -= dt;
      const aggro = ai.notice(c, p, 310, dt);
      if (c.st === 'idle') {
        if (aggro && c.pd > 150) ai.chase(c, p, 62, 2, dt); else ai.wander(c, 32, dt);
        if (aggro && c.pd < 200 && c.cd <= 0) { ai.set(c, 'puff'); G.sfx('inflate', { x: c.x, y: c.y }); }
      } else if (c.st === 'puff') { ai.brake(c, 4, dt); c.puff = min(1, c.stT / 0.42); if (c.stT > 0.42) { ai.set(c, 'big'); c.fired = 0; } }
      else if (c.st === 'big') {
        c.puff = 1; ai.chase(c, p, 44, 1.5, dt);
        if (c.fired === 0 && c.stT > 0.1) { spines(c, 10, c.ph); c.fired = 1; }
        if (c.fired === 1 && c.stT > 1.2) { spines(c, 10, c.ph + PI / 10); c.fired = 2; }
        if (c.stT > 2.3) ai.set(c, 'deflate');
      } else { c.puff = max(0, 1 - c.stT / 0.5); if (c.stT > 0.5) { ai.set(c, 'idle'); c.cd = 1.7; } }
      c.r = 13 + 11 * c.puff; c.touch = c.puff > 0.4;
      if (abs(c.vx) > 6) c.dir = c.vx > 0 ? 1 : -1;
    },
    draw(c, ctx) {
      const t = G.time, r = c.r, pf = c.puff, A = c.alpha, d = c.dir;
      ctx.save(); ctx.translate(c.x, c.y + sin(t * 2.5 + c.ph) * 1.5); ctx.scale(d, 1);
      ctx.globalAlpha = A;
      // tail + fins
      ctx.fillStyle = '#d8a84a';
      const wg = sin(t * 9 + c.ph) * 0.4;
      ctx.beginPath(); ctx.moveTo(-r * 0.85, 0); ctx.lineTo(-r - 9, -5 + wg * 6); ctx.lineTo(-r - 9, 5 + wg * 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-r * 0.1, r * 0.55, 5, 2.6, 0.6 + sin(t * 14) * 0.5, 0, TAU); ctx.fill();
      // spines
      if (pf > 0.15) {
        ctx.strokeStyle = '#fff2c8'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = i * TAU / 16 + 0.2, l = 7 * pf; ctx.moveTo(cos(a) * r * 0.92, sin(a) * r * 0.92); ctx.lineTo(cos(a) * (r + l), sin(a) * (r + l)); }
        ctx.stroke();
      }
      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, '#d9a93e'); g.addColorStop(0.5, '#f0cf6a'); g.addColorStop(0.72, '#fff6dc'); g.addColorStop(1, '#fffdf4');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, r, r * (0.82 + 0.18 * pf), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(140,96,30,0.5)';
      for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.42; ctx.beginPath(); ctx.arc(cos(a) * r * 0.55, sin(a) * r * 0.55 - r * 0.1, 1.5, 0, TAU); ctx.fill(); }
      ctx.restore();
      const ey = c.y + sin(t * 2.5 + c.ph) * 1.5 - r * 0.2, look = ai.toPlayer(c, G.player);
      kit.eye(ctx, c.x + d * r * 0.5, ey, 3 + pf * 1.4, look, { alpha: A, dazed: c.stun > 0, pupil: pf > 0.5 ? 0.38 : 0.55 });
      ctx.globalAlpha = A; ctx.strokeStyle = '#7a4a1a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(c.x + d * r * 0.86, ey + r * 0.4, 1.6 + pf * 1.2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    },
  });

  // ------------------------------------------------------------------ barracuda
  G.defCreature('barracuda', {
    r: 13, hp: 48, hostile: true, dmg: 1, xp: 5, pearl: 0.16, color: '#cfe6f2', mass: 1.4, leash: 230,
    init(c) { c.ch = kit.chain(9, 9); kit.chainSet(c.ch, c.x, c.y, c.face); c.swim = 0; c.da = 0; },
    think(c, dt, p) {
      const aggro = ai.notice(c, p, 450, dt);
      if (c.st === 'idle') {
        if (aggro) { if (c.pd < 470 && c.stT > 0.7 && ai.see(c, p, 470)) { ai.set(c, 'aim'); G.sfx('telegraph', { x: c.x, y: c.y }); } else ai.chase(c, p, 130, 3, dt); }
        else ai.wander(c, 52, dt);
        ai.faceVel(c, 5, dt);
      } else if (c.st === 'aim') {
        const a = ai.toPlayer(c, p);
        ai.face(c, a, 10, dt); ai.steer(c, -cos(a), -sin(a), 46, 4, dt);
        if (c.stT > 0.62) { c.da = c.face; ai.set(c, 'dash'); G.sfx('whoosh', { x: c.x, y: c.y }); }
      } else if (c.st === 'dash') {
        c.vx = cos(c.da) * 720; c.vy = sin(c.da) * 720;
        if (G.rand() < dt * 50) G.particles.bubble(c.x - cos(c.da) * 20, c.y - sin(c.da) * 20, G.rr(1.5, 3.5), 0, 0, 0.7);
        if (G.sdf(c.x + cos(c.da) * 22, c.y + sin(c.da) * 22) < 5) {       // nose-first into rock
          c.stun = 0.9; c.vx *= -0.2; c.vy *= -0.2; ai.set(c, 'rest');
          G.sfx('bump', { v: 0.8 }); G.particles.dust(c.x + cos(c.da) * 20, c.y + sin(c.da) * 20, 7, G.css(G.zone.def.rockL), 80); G.cam.shake(0.12);
        } else if (c.stT > 0.5) ai.set(c, 'rest');
      } else { ai.brake(c, 3.5, dt); ai.faceVel(c, 3, dt); if (c.stT > 0.95) ai.set(c, 'idle'); }
    },
    anim(c, dt) { kit.chainFollow(c.ch, c.x, c.y, c.face, 0.42); c.swim += dt * (4 + hypot(c.vx, c.vy) * 0.05); },
    draw(c, ctx) {
      const tense = c.st === 'aim' ? min(1, c.stT / 0.6) : 0;
      kit.fish(ctx, c.ch, { w: 7.2, prof: P9, up: kit.upSide(c), phase: c.swim, amp: c.st === 'aim' ? 1 : 3.4, body: '#9fb8c8', belly: '#eef6fa', fin: '#6f8898', tail: 14, dorsal: 5, anal: 4, pect: 6, stripes: [2, 3, 4, 5, 6], stripeCol: 'rgba(60,80,96,0.5)', stripeW: 2.4, nose: 13, alpha: c.alpha });
      // underbite + teeth
      ctx.globalAlpha = c.alpha; ctx.strokeStyle = '#f4fbff'; ctx.lineWidth = 1.2;
      const a = c.face, jx = kit.hx, jy = kit.hy;
      ctx.beginPath();
      for (let i = 1; i <= 3; i++) { const bx = jx - cos(a) * i * 3.2 + sin(a) * kit_up(c) * -2.5, by = jy - sin(a) * i * 3.2 - cos(a) * kit_up(c) * -2.5; ctx.moveTo(bx, by); ctx.lineTo(bx + sin(a) * kit_up(c) * -2.6, by - cos(a) * kit_up(c) * -2.6); }
      ctx.stroke(); ctx.globalAlpha = 1;
      kit.eye(ctx, kit.ex, kit.ey, 2.8, ai.toPlayer(c, G.player), { alpha: c.alpha, angry: 0.6 + tense * 0.4, iris: '#e8d24a', dazed: c.stun > 0 });
    },
    glow(c, ctx) {
      if (c.st !== 'aim') return;
      const u = min(1, c.stT / 0.62), a = c.face, d = G.raycast(c.x, c.y, cos(a), sin(a), 560);
      ctx.globalAlpha = 0.15 + 0.4 * u; ctx.strokeStyle = '#ffb090'; ctx.lineWidth = 1 + 2 * u; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -G.time * 90;
      ctx.beginPath(); ctx.moveTo(c.x + cos(a) * 16, c.y + sin(a) * 16); ctx.lineTo(c.x + cos(a) * d, c.y + sin(a) * d); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      G.drawGlow(ctx, kit.ex, kit.ey, 9 + u * 6, '#ffd060', 0.5 + 0.5 * u);
    },
  });
  const kit_up = c => (c.up || -1);

  // ------------------------------------------------------------------ purple urchin (sits on rock, bristles at you)
  G.defCreature('urchin', {
    r: 15, hp: 26, hostile: true, dmg: 1, xp: 2, fixed: true, color: '#c79aff', fleeStyle: 'retract', fleeTime: 0.55, flareResist: true, noSep: true, mass: 60, noScanMove: true,
    init(c) { c.spk = 0; c.aggro = false; },
    think(c, dt, p) { c.spk = damp(c.spk, c.pd < 130 ? 1 : 0, 7, dt); },
    draw(c, ctx) {
      const t = G.time, p = G.player, A = c.alpha, gone = c.fleeing ? min(1, c.fleeing / 0.55) : 0;
      const pa = atan2(p.y - c.y, p.x - c.x), r = c.r * (1 - gone * 0.35);
      ctx.globalAlpha = A; ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#e9d6ff' : '#7d4fc4'; ctx.lineWidth = pass ? 1.1 : 2.6;
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const a = i * TAU / 20 + sin(t * 1.5 + i * 1.7 + c.ph) * 0.07, toward = max(0, cos(a - pa));
          const l = (9 + 5 * G.hash1(i, c.uid) + c.spk * (4 + 9 * toward)) * (1 - gone);
          const r0 = pass ? r * 0.9 + l * 0.55 : r * 0.7;
          ctx.moveTo(c.x + cos(a) * r0, c.y + sin(a) * r0); ctx.lineTo(c.x + cos(a) * (r * 0.9 + l), c.y + sin(a) * (r * 0.9 + l));
        }
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(c.x - 3, c.y - 4, 1, c.x, c.y, r);
      g.addColorStop(0, '#9a6ae0'); g.addColorStop(1, '#3d2470');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.86, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    },
  });

  // ------------------------------------------------------------------ green moray (lives in a hole, lunges)
  function morayAim(c, ux, uy, rate, dt) {
    const base = atan2(c.ny, c.nx), want = clamp(G.angDiff(base, atan2(uy, ux)), -1.05, 1.05) + base;
    c.dirA = G.angDamp(c.dirA, want, rate, dt);
  }
  G.defCreature('moray', {
    r: 14, hp: 72, hostile: true, dmg: 1, xp: 7, pearl: 0.28, fixed: true, color: '#c8dc6a', fleeStyle: 'retract', fleeTime: 0.6, mass: 60, noSep: true, viewR: 300,
    init(c) { c.bx = c.x; c.by = c.y; c.nx = c.nx === undefined ? 0 : c.nx; c.ny = c.ny === undefined ? -1 : c.ny; c.ext = 24; c.dirA = atan2(c.ny, c.nx); c.jaw = 0.15; c.cd = 0; c.reach = 0; c.touch = false; },
    think(c, dt, p) {
      const dxp = p.x - c.bx, dyp = p.y - c.by, dp = hypot(dxp, dyp) || 1, front = (dxp * c.nx + dyp * c.ny) / dp;
      c.cd -= dt;
      if (c.st === 'idle') {
        c.ext = damp(c.ext, 26 + sin(c.t * 1.3) * 4, 4, dt);
        morayAim(c, dxp / dp, dyp / dp, 3, dt);
        c.jaw = damp(c.jaw, 0.16 + 0.12 * sin(c.t * 3.2), 6, dt);
        if (!p.dead && dp < 220 && front > 0.2 && c.cd <= 0 && G.los(c.bx + c.nx * 22, c.by + c.ny * 22, p.x, p.y)) { ai.set(c, 'warn'); c.aggro = true; G.sfx('growl', { x: c.x, y: c.y }); }
      } else if (c.st === 'warn') {
        morayAim(c, dxp / dp, dyp / dp, 9, dt);
        c.jaw = damp(c.jaw, 1, 14, dt); c.ext = damp(c.ext, 15, 8, dt);
        if (c.stT > 0.44) { ai.set(c, 'lunge'); c.reach = min(235, dp + 30); G.sfx('snap', { x: c.x, y: c.y }); }
      } else if (c.st === 'lunge') {
        c.ext = min(c.reach, c.ext + 1050 * dt);
        if (c.ext > c.reach * 0.8) c.jaw = damp(c.jaw, 0, 30, dt);
        if (c.ext >= c.reach) ai.set(c, 'hold');
      } else if (c.st === 'hold') { c.jaw = damp(c.jaw, 0.1, 10, dt); if (c.stT > 0.32) ai.set(c, 'back'); }
      else { c.ext = max(24, c.ext - 270 * dt); if (c.ext <= 24.5) { ai.set(c, 'idle'); c.cd = 1.5; c.aggro = false; } }
      c.touch = c.st === 'lunge' || c.st === 'hold';
    },
    anim(c, dt) {
      if (c.fleeing) c.ext = max(0, c.ext - 380 * dt);
      c.x = c.bx + cos(c.dirA) * c.ext; c.y = c.by + sin(c.dirA) * c.ext; c.face = c.dirA;
    },
    draw(c, ctx) {
      const A = c.alpha, t = G.time, a = c.dirA, ca = cos(a), sa = sin(a), px = -sa, py = ca;
      // the hole
      ctx.fillStyle = 'rgba(8,6,14,0.9)'; ctx.beginPath(); ctx.ellipse(c.bx + c.nx * 2, c.by + c.ny * 2, 17, 8, atan2(c.ny, c.nx) + PI / 2, 0, TAU); ctx.fill();
      if (c.fleeing && c.ext < 3) return;
      const ext = c.ext, sw = sin(t * 2 + c.ph) * min(10, ext * 0.16);
      const bx = c.bx - c.nx * 14, by = c.by - c.ny * 14;
      const mx = c.bx + ca * ext * 0.5 + px * sw, my = c.by + sa * ext * 0.5 + py * sw;
      ctx.globalAlpha = A; ctx.lineCap = 'round';
      ctx.strokeStyle = '#3f5220'; ctx.lineWidth = 23; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, c.x - ca * 6, c.y - sa * 6); ctx.stroke();
      ctx.strokeStyle = '#7f9a38'; ctx.lineWidth = 19; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(mx, my, c.x - ca * 6, c.y - sa * 6); ctx.stroke();
      ctx.strokeStyle = '#a8c050'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx + px * 3, by + py * 3); ctx.quadraticCurveTo(mx + px * 3, my + py * 3, c.x - ca * 8 + px * 3, c.y - sa * 8 + py * 3); ctx.stroke();
      // head: two jaws hinged at the back of the skull
      const hx = c.x - ca * 9, hy = c.y - sa * 9, open = c.jaw * 0.6;
      for (let s = -1; s <= 1; s += 2) {
        const ja = a + s * open;
        ctx.fillStyle = s < 0 ? '#7f9a38' : '#96ae44';
        ctx.beginPath(); ctx.moveTo(hx - px * s * 2, hy - py * s * 2);
        ctx.quadraticCurveTo(hx + cos(ja + s * 0.5) * 13, hy + sin(ja + s * 0.5) * 13, hx + cos(ja) * 25, hy + sin(ja) * 25);
        ctx.lineTo(hx + cos(a) * 6, hy + sin(a) * 6); ctx.closePath(); ctx.fill();
        if (c.jaw > 0.3) {
          ctx.fillStyle = '#fbfff0';
          for (let k = 1; k <= 3; k++) { const tx = hx + cos(ja) * (8 + k * 5), ty = hy + sin(ja) * (8 + k * 5); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - cos(ja) * 2 - px * s * -3.4, ty - sin(ja) * 2 - py * s * -3.4); ctx.lineTo(tx - cos(ja) * 4, ty - sin(ja) * 4); ctx.fill(); }
        }
      }
      ctx.globalAlpha = 1;
      const side = ca >= 0 ? -1 : 1;
      kit.eye(ctx, hx + ca * 8 + px * side * 5.5, hy + sa * 8 + py * side * 5.5, 3, ai.toPlayer(c, G.player), { alpha: A, white: '#f4e86a', pupil: 0.4, angry: c.st === 'warn' || c.st === 'lunge' ? 1 : 0.4, dazed: c.stun > 0 });
    },
    glow(c, ctx) { if (c.st === 'warn') G.drawGlow(ctx, c.x, c.y, 26, '#ffb060', 0.4 * min(1, c.stT / 0.4)); },
  });

  // ------------------------------------------------------------------ Sally Lightfoot crab (walks the rock, any way up)
  G.defCreature('crab', {
    r: 10, hp: 10, passive: true, color: '#ff7a4a', fixed: true, noSep: true, fleeStyle: 'retract', fleeTime: 0.35, scanXp: 5,
    init(c) { c.dir = G.rand() < 0.5 ? 1 : -1; c.walk = 0; c.claw = 0; c.wait = G.rr(0.5, 2); c.go = 0; c.snapT = 0; c.nx = 0; c.ny = -1; },
    think(c, dt, p) {
      const d = G.sdfGrad(c.x, c.y, _v);
      c.nx = _v.x; c.ny = _v.y;
      c.x += _v.x * (c.r * 0.7 - d); c.y += _v.y * (c.r * 0.7 - d);
      const tx = -c.ny, ty = c.nx;
      let sp = 0;
      c.snapT -= dt;
      if (c.pd < 160 && !p.dead) {
        c.dir = ((c.x - p.x) * tx + (c.y - p.y) * ty) >= 0 ? 1 : -1;
        sp = 40 + 150 * (1 - c.pd / 160);
        c.claw = damp(c.claw, c.pd < 76 ? 1 : 0.35, 9, dt);
        if (c.pd < 76 && c.snapT <= 0) { G.sfx('clack', { x: c.x, y: c.y }); c.snapT = 0.55; }
      } else {
        c.wait -= dt;
        if (c.wait < 0) { c.wait = G.rr(1, 3.6); c.dir = G.rand() < 0.5 ? 1 : -1; c.go = G.rr(0.4, 1.5); }
        if (c.go > 0) { c.go -= dt; sp = 38; }
        c.claw = damp(c.claw, 0, 3, dt);
      }
      c.x += tx * c.dir * sp * dt; c.y += ty * c.dir * sp * dt; c.walk += sp * dt * 0.2;
    },
    draw(c, ctx) {
      const A = c.alpha, t = G.time, shrink = c.fleeing ? 1 - min(1, c.fleeing / 0.35) : 1;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(atan2(c.ny, c.nx) + PI / 2); ctx.scale(shrink, shrink);
      ctx.globalAlpha = A; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#d8402a'; ctx.lineWidth = 2;
      for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 4; i++) {
        const ph = c.walk + i * 1.6 + (s > 0 ? 0.8 : 0), lift = max(0, sin(ph)) * 3, reach = cos(ph) * 2.5;
        const kx = s * (8 + i * 2.2), ky = -2 - lift - i * 0.6, fx = s * (12 + i * 2.6) + reach, fy = 5 - lift * 0.5;
        ctx.beginPath(); ctx.moveTo(s * 5, 0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      }
      // claws
      for (let s = -1; s <= 1; s += 2) {
        const up = c.claw * 9, cx = s * (9 + c.claw * 2), cy = -4 - up, sn = c.claw > 0.6 ? abs(sin(t * 14)) * 0.5 : 0.25;
        ctx.strokeStyle = '#d8402a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(s * 5, -2); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.fillStyle = '#ff6a3a';
        ctx.beginPath(); ctx.ellipse(cx, cy, 3.4, 2.6, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + s * 3.5, cy - 3.5 - sn * 3); ctx.moveTo(cx, cy); ctx.lineTo(cx + s * 4.4, cy - 1 + sn * 2); ctx.stroke();
      }
      const g = ctx.createLinearGradient(0, -7, 0, 6);
      g.addColorStop(0, '#ff5a2e'); g.addColorStop(0.6, '#ff8a4a'); g.addColorStop(1, '#8fd4ff');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -1, 9, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe07a';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 3, -2.5 + abs(i) * 0.8, 0.9, 0, TAU); ctx.fill(); }
      // eye stalks
      for (let s = -1; s <= 1; s += 2) {
        const ex = s * 3.2 + sin(t * 3 + s) * 0.4, ey = -9;
        ctx.strokeStyle = '#ff8a4a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(s * 2.6, -5); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.arc(ex, ey, 1.5, 0, TAU); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    },
  });

  // ------------------------------------------------------------------ green sea turtle (unbothered)
  G.defCreature('turtle', {
    r: 30, hp: 99999, passive: true, sturdy: true, color: '#9fe0b0', scanXp: 10, scanTime: 1.7, mass: 40, leash: 9999, viewR: 160, noSep: true,
    init(c) { c.dir = G.rand() < 0.5 ? 1 : -1; c.look = 0; c.turnCd = 0; c.blink = 0; },
    onHit(c) { c.look = 1; c.blink = 1; return 'reflect'; },
    onFlare() { return false; },
    think(c, dt, p) {
      c.turnCd -= dt;
      ai.steer(c, c.dir, sin(c.t * 0.3) * 0.22, 36, 1, dt);
      ai.avoid(c, 90, 320, dt);
      const zone = G.zone;
      if (c.turnCd <= 0 && (G.sdf(c.x + c.dir * 130, c.y) < 44 || c.x < 220 || c.x > zone.pxW - 220)) { c.dir = -c.dir; c.turnCd = 4; }
      if (zone.idx === 0 && c.y < zone.surfaceY + 70) c.vy += 60 * dt;
      c.look = damp(c.look, c.pd < 210 ? 1 : 0, 2, dt); c.blink = max(0, c.blink - dt * 0.8);
    },
    draw(c, ctx) {
      const t = c.t, A = c.alpha, d = c.dir, flap = sin(t * 1.5);
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(d, 1); ctx.rotate(sin(t * 0.3) * 0.08);
      ctx.globalAlpha = A;
      const skin = '#7fb886', skinD = '#4f8a62';
      // far flippers
      ctx.fillStyle = skinD;
      ctx.save(); ctx.translate(13, 4); ctx.rotate(0.5 - flap * 0.55); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, 20, -4, 36); ctx.quadraticCurveTo(-9, 16, 0, 0); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(-22, 6); ctx.rotate(-0.4 + flap * 0.25); ctx.beginPath(); ctx.ellipse(-5, 4, 9, 4, 0.5, 0, TAU); ctx.fill(); ctx.restore();
      // tail, head
      ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(-28, 2); ctx.lineTo(-37, 5); ctx.lineTo(-27, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(34, -2 + c.look * -1, 10, 7.5, -0.15, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(22, -6); ctx.lineTo(30, -7); ctx.lineTo(30, 4); ctx.lineTo(22, 6); ctx.fill();
      // plastron + shell
      ctx.fillStyle = '#e8e2b8'; ctx.beginPath(); ctx.ellipse(0, 5, 27, 9, 0, 0, PI); ctx.fill();
      const g = ctx.createLinearGradient(0, -20, 0, 8);
      g.addColorStop(0, '#6a8a4a'); g.addColorStop(1, '#3d5a34');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-29, 5); ctx.quadraticCurveTo(-27, -19, 0, -20); ctx.quadraticCurveTo(26, -19, 29, 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(210,225,150,0.55)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-14, 5); ctx.lineTo(-9, -17); ctx.moveTo(0, 5); ctx.lineTo(0, -20); ctx.moveTo(14, 5); ctx.lineTo(9, -17); ctx.moveTo(-25, -5); ctx.quadraticCurveTo(0, -9, 25, -5); ctx.stroke();
      // near flipper
      ctx.fillStyle = skin;
      ctx.save(); ctx.translate(16, 5); ctx.rotate(0.35 + flap * 0.6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(13, 22, -3, 42); ctx.quadraticCurveTo(-11, 18, 0, 0); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(-20, 7); ctx.rotate(-0.3 - flap * 0.3); ctx.beginPath(); ctx.ellipse(-6, 4, 10, 4.4, 0.5, 0, TAU); ctx.fill(); ctx.restore();
      ctx.restore(); ctx.globalAlpha = 1;
      kit.eye(ctx, c.x + d * 37, c.y - 4, 2.6, ai.toPlayer(c, G.player), { alpha: A, lid: max(0.25, c.blink > 0 ? abs(sin(c.blink * 6)) : 0.25), lidCol: '#4f8a62' });
    },
  });

  // ------------------------------------------------------------------ cleaning station
  G.defProp('cleaner', {
    r: 26, codex: 'cleaner', scanXp: 6,
    init(pr) { pr.prog = 0; pr.shr = [{ a: -0.9, ph: 0 }, { a: 0.1, ph: 2 }, { a: 1, ph: 4 }]; pr.lead = 0; },
    update(pr, dt, p) {
      const near = pr.pd < 58 && !p.dead, slow = hypot(p.vx, p.vy) < 70;
      pr.hint = null;
      if (pr.used) { pr.lead = damp(pr.lead, 0, 2, dt); return; }
      if (near && p.hull < p.st.maxHull) {
        pr.hint = 'HOLD STILL';
        if (slow) {
          pr.prog += dt / 1.7; pr.lead = damp(pr.lead, 1, 4, dt);
          if (G.rand() < dt * 9) G.particles.mote(p.x + G.rr(-10, 10), p.y + G.rr(-10, 10), 0, -20, '#9dffb8', 4, 0.5, 0, 1);
          if (pr.prog >= 1) { pr.used = true; p.heal(G.settings.calm ? 2 : 1); G.particles.text(pr.x, pr.y - 44, 'ALL CLEAN', '#9dffb8', 12, 1.4); G.emit('cleaned', pr); }
        } else pr.prog = max(0, pr.prog - dt);
      } else {
        if (near) pr.hint = 'HULL IS SPOTLESS';
        pr.prog = max(0, pr.prog - dt); pr.lead = damp(pr.lead, 0, 3, dt);
      }
    },
    draw(pr, ctx) {
      const t = G.time, p = G.player;
      // a coral head to work from
      const g = ctx.createRadialGradient(pr.x - 6, pr.y - 8, 2, pr.x, pr.y, 26);
      g.addColorStop(0, '#ffb4c8'); g.addColorStop(1, '#b8587a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(pr.x, pr.y + 6, 24, 17, 0, PI, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,40,70,0.5)'; ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(pr.x + i * 8, pr.y + 6, 12, PI * 1.15, PI * 1.85); ctx.stroke(); }
      for (const s of pr.shr) {
        let sx = pr.x + sin(s.a) * 19, sy = pr.y + 6 - cos(s.a) * 15;
        if (pr.lead > 0.02) { sx = lerp(sx, p.x + cos(t * 3 + s.ph) * 11, pr.lead); sy = lerp(sy, p.y + sin(t * 3 + s.ph) * 11, pr.lead); }
        const wv = sin(t * 5 + s.ph);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.moveTo(sx + 3, sy - 1); ctx.quadraticCurveTo(sx + 8, sy - 7 + wv * 2, sx + 13, sy - 6 + wv * 4); ctx.moveTo(sx + 3, sy - 1); ctx.quadraticCurveTo(sx + 7, sy - 9 - wv * 2, sx + 10, sy - 12 - wv * 3); ctx.stroke();
        ctx.fillStyle = '#e8283a'; ctx.beginPath(); ctx.ellipse(sx, sy, 4.4, 2.2, -0.3, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sx - 4, sy + 0.6); ctx.lineTo(sx + 4, sy - 1); ctx.stroke();
      }
    },
    glow(pr, ctx) {
      const t = G.time, p = G.player;
      if (!pr.used) {
        const y = pr.y - 36 + sin(t * 2.5) * 3;
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#7dffb0'; ctx.fillRect(pr.x - 1.6, y - 6, 3.2, 12); ctx.fillRect(pr.x - 6, y - 1.6, 12, 3.2); ctx.globalAlpha = 1;
        G.drawGlow(ctx, pr.x, y, 20, '#7dffb0', 0.35);
      }
      if (pr.prog > 0.01) { ctx.strokeStyle = '#9dffb8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(p.x, p.y, 27, -PI / 2, -PI / 2 + TAU * pr.prog); ctx.stroke(); }
      if (pr.hint) G.text(ctx, pr.hint, pr.x, pr.y - 54, { size: 10, font: 'mono', weight: 700, color: '#bfffd2', align: 'center', spacing: 1.5 });
    },
  });

  // ------------------------------------------------------------------ field notes
  const add = G.codexAdd;
  add('sardine', { name: 'Pacific Sardine', latin: 'Sardinops sagax', zone: 0, kind: 'fauna', size: '20 cm', notes: 'Several hundred animals moving as one thought. There is no leader. Each one watches its nearest few neighbours, and that turns out to be enough. I find this the most reassuring fact I have collected so far.' });
  add('garibaldi', { name: 'Garibaldi', latin: 'Hypsypops rubicundus', zone: 0, kind: 'fauna', size: '30 cm', notes: 'Guards a patch of algae about the size of a dinner plate against all comers, me included. I outweigh it forty times over. It has rammed me repeatedly. No damage. Enormous conviction.' });
  add('puffer', { name: 'Porcupinefish', latin: 'Diodon holocanthus', zone: 0, kind: 'fauna', size: '30 cm', notes: 'When alarmed it gulps water until it is a ball of spines, which is a fine answer to most questions. It throws a few for good measure. Afterwards it deflates and looks, I think, a little embarrassed.' });
  add('barracuda', { name: 'Great Barracuda', latin: 'Sphyraena barracuda', zone: 0, kind: 'fauna', size: '1.5 m', notes: 'Hangs perfectly still, and then is somewhere else. Drawn to shiny things. I am, regrettably, a shiny thing. It commits to a straight line, so the rock behind me has been a useful friend.' });
  add('urchin', { name: 'Purple Sea Urchin', latin: 'Strongylocentrotus purpuratus', zone: 0, kind: 'fauna', size: '10 cm', notes: 'No brain, no eyes, five teeth, and firm views on personal space. It senses light with its whole body and points its spines at whatever comes close. Mostly that has been me.' });
  add('moray', { name: 'Green Moray', latin: 'Gymnothorax funebris', zone: 0, kind: 'fauna', size: '2 m', notes: 'The constant gaping is just breathing. The lunge is the part to watch for. It also has a second set of jaws further down its throat, which I did not need to learn and am now passing on to you.' });
  add('crab', { name: 'Sally Lightfoot Crab', latin: 'Grapsus grapsus', zone: 0, kind: 'fauna', size: '8 cm', notes: 'Runs sideways in every direction at once and commits to none of them. When I get close it raises both claws. I have decided to read this as a wave.' });
  add('turtle', { name: 'Green Sea Turtle', latin: 'Chelonia mydas', zone: 0, kind: 'fauna', size: '1.2 m', notes: 'Has been making this commute since before the boat above us was built. My pulses skip off its shell. It looked at me once, slowly, the way you might look at weather.' });
  add('cleaner', { name: 'Scarlet Cleaner Shrimp', latin: 'Lysmata amboinensis', zone: 0, kind: 'fauna', size: '6 cm', notes: 'Runs a clinic. Fish queue up, hold still and get groomed, and nobody eats anybody. It went over my hull seals for a while. I had not asked. It is the kindest thing that has happened to me today.' });
})();
