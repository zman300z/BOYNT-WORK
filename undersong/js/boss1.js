'use strict';
/* UNDERSONG — boss of the Shallows: THE PUGILIST, a peacock mantis shrimp.
   Also defines 'part': an invisible hit-circle that forwards pulses to a parent (long-bodied bosses). */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, PI, hypot, floor } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit, ai = G.ai;

  G.defCreature('part', {
    r: 18, hp: 1, hostile: true, dmg: 1, xp: 0, fixed: true, noSep: true, noScan: true, mass: 99, flareResist: true,
    think(c) { const o = c.parent; if (!o || o.dead || o.fleeing) { c.dead = true; return; } c.touch = o.touch !== false && !o.asleep; c.hittable = o.hittable; },
    onHit(c, dmg, src) { const o = c.parent; if (o && !o.dead) G.damageCreature(o, dmg * (c.mul || 1), src); return false; },
    onFlare() { return false; },
    draw() { },
  });
  // attach n hit-circles to chain joints
  G.addParts = function (c, idxs, r, mul) {
    c.parts = idxs.map(i => G.creatures.spawn('part', c.x, c.y, { parent: c, joint: i, r, mul: mul || 1 }));
  };
  G.syncParts = function (c, ch) { if (c.parts) for (const p of c.parts) { p.x = ch.x[p.joint]; p.y = ch.y[p.joint]; } };

  function strike(c, x, y, R) {
    const p = G.player;
    G.sfx('crack', { x, y });
    G.particles.ring(x, y, 8, R, '#eaffff', 0.32, 5); G.particles.ring(x, y, 4, R * 0.6, '#9fe9ff', 0.22, 3);
    G.particles.bubbles(x, y, 18, 16, 220);
    G.particles.sparks(x, y, 14, '#eaffff', { s0: 120, s1: 460, life: 0.3, size: 2.2 });
    G.lights.flash(x, y, R * 3.4, '#eaffff', 0.22, 1);
    G.fx.wave(x, y, { speed: 800, maxR: R * 2.6, str: 0.9 });
    G.cam.shake(0.3);
    if (!p.dead && G.dist2(p.x, p.y, x, y) < (R + p.r) * (R + p.r)) p.hurt(1, x, y);
  }

  G.defCreature('mantis', {
    boss: true, hostile: true, r: 30, hp: 1500, dmg: 1, xp: 0, mass: 14, color: '#7dffb0', scanTime: 2, scanXp: 14, flareResist: true, viewR: 280, noSep: true, showR: 72,
    title: 'THE PUGILIST', latin: 'Odontodactylus scyllarus', epithet: 'peacock mantis shrimp', relic: 'knuckle', music: 'boss',
    init(c) {
      c.ch = kit.chain(9, 13); kit.chainSet(c.ch, c.x, c.y, c.face);
      c.arm = 0; c.ext = 0; c.swim = 0; c.cd = 1.2; c.phase = 1; c.n = 0; c.spin = 0; c.da = 0; c.orbit = 1; c.acc = 0;
      if (!c.specimen) G.addParts(c, [3, 5, 7], 15);
    },
    wake(c) { ai.set(c, 'idle'); c.cd = 1.4; },
    show(c) { c.arm = 0.5 + 0.5 * sin(c.t * 1.5); },
    think(c, dt, p) {
      if (c.asleep) { ai.brake(c, 3, dt); ai.face(c, ai.toPlayer(c, p), 2, dt); return; }
      const hard = c.hp < c.maxHp * 0.5;
      if (hard && c.phase === 1) {
        c.phase = 2; G.sfx('roar'); G.cam.shake(0.5); G.fx.punch(0.5, 0.2);
        G.particles.ring(c.x, c.y, 20, 220, '#ff9a6a', 0.5, 4); G.hud.toast('It is taking you seriously now', '', { color: '#ff9a6a', life: 2.6 });
        ai.set(c, 'idle'); c.cd = 0.8;
      }
      const toP = ai.toPlayer(c, p), d = c.pd;
      if (c.st === 'idle') {
        // circle the probe at a boxer's distance
        const want = 250, a = atan2(c.y - p.y, c.x - p.x) + c.orbit * 0.9;
        const tx = p.x + cos(a) * want, ty = p.y + sin(a) * want;
        ai.seek(c, tx, ty, hard ? 190 : 150, 3, dt); ai.avoid(c, 60, 900, dt);
        ai.face(c, toP, 6, dt);
        c.arm = damp(c.arm, 0.25, 5, dt); c.ext = damp(c.ext, 0, 8, dt);
        c.cd -= dt;
        if (G.rand() < dt * 0.3) c.orbit = -c.orbit;
        if (c.cd <= 0 && !p.dead) {
          const r = G.rand();
          if (hard && r < 0.26) { ai.set(c, 'jabAim'); c.n = 3; }
          else if (r < 0.42 || d < 130) { ai.set(c, 'jabAim'); c.n = 1; }
          else if (r < 0.74) { ai.set(c, 'volley'); c.n = hard ? 5 : 3; c.acc = 0.3; }
          else { ai.set(c, 'spin'); c.acc = 0; }
          if (c.st === 'jabAim') G.sfx('telegraph', { x: c.x, y: c.y });
        }
      } else if (c.st === 'jabAim') {
        const T = c.n > 1 || hard ? 0.4 : 0.56;
        ai.face(c, toP, 11, dt); ai.steer(c, -cos(toP), -sin(toP), 70, 5, dt);
        c.arm = damp(c.arm, 1, 12, dt);
        if (c.stT > T) { c.da = c.face; c.reach = clamp(d + 40, 200, 560); c.went = 0; ai.set(c, 'jabDash'); G.sfx('whoosh', { x: c.x, y: c.y }); }
      } else if (c.st === 'jabDash') {
        const sp = 820;
        c.vx = cos(c.da) * sp; c.vy = sin(c.da) * sp; c.went += sp * dt;
        if (G.rand() < dt * 60) G.particles.bubble(c.x - cos(c.da) * 30 + G.rr(-10, 10), c.y - sin(c.da) * 30 + G.rr(-10, 10), G.rr(2, 4), 0, 0, 0.8);
        const wall = G.sdf(c.x + cos(c.da) * 46, c.y + sin(c.da) * 46) < 8;
        if (c.went >= c.reach || wall) {
          c.vx *= 0.1; c.vy *= 0.1; c.ext = 1; c.arm = 0;
          strike(c, c.x + cos(c.da) * 52, c.y + sin(c.da) * 52, 92);
          if (hard) G.eshots.fan(c.x + cos(c.da) * 52, c.y + sin(c.da) * 52, c.da, 7, 2.2, 230, { r: 5, color: '#9fe9ff', life: 2.2 });
          c.n--; ai.set(c, c.n > 0 ? 'jabAim' : 'rest'); c.restT = wall ? 1.1 : 0.75;
          if (c.n > 0) G.sfx('telegraph', { x: c.x, y: c.y });
        }
      } else if (c.st === 'volley') {
        ai.face(c, toP, 9, dt); ai.brake(c, 3, dt);
        if (d < 220) ai.steer(c, -cos(toP), -sin(toP), 120, 3, dt);
        c.acc -= dt;
        c.arm = damp(c.arm, c.acc < 0.2 ? 1 : 0.2, 14, dt); c.ext = damp(c.ext, 0, 10, dt);
        if (c.acc <= 0) {
          c.acc = hard ? 0.36 : 0.46; c.ext = 1; c.arm = 0; c.n--;
          const mx = c.x + cos(c.face) * 44, my = c.y + sin(c.face) * 44;
          // lead the target a little
          const tt = d / 440, a = atan2(p.y + p.vy * tt * 0.6 - my, p.x + p.vx * tt * 0.6 - mx);
          G.eshots.fan(mx, my, a, hard ? 3 : 1, 0.5, 440, { r: 8, color: '#b8f4ff', life: 2.4 });
          G.sfx('crack', { x: mx, y: my }); G.particles.ring(mx, my, 6, 40, '#eaffff', 0.2, 3); G.lights.flash(mx, my, 160, '#eaffff', 0.12, 0.9); G.cam.shake(0.1);
          if (c.n <= 0) { ai.set(c, 'rest'); c.restT = 0.6; }
        }
      } else if (c.st === 'spin') {
        ai.brake(c, 4, dt);
        const wind = min(1, c.stT / 0.45);
        c.spin += dt * (4 + wind * 9) * c.orbit; c.face = c.spin;
        c.arm = 1;
        if (c.stT > 0.45) {
          c.acc -= dt;
          if (c.acc <= 0) {
            c.acc = hard ? 0.055 : 0.075;
            const a = c.spin * 1.0;
            G.eshots.fire(c.x + cos(a) * 30, c.y + sin(a) * 30, cos(a) * 215, sin(a) * 215, { r: 5, color: '#ffb48a', life: 3 });
            if (hard) G.eshots.fire(c.x - cos(a) * 30, c.y - sin(a) * 30, -cos(a) * 215, -sin(a) * 215, { r: 5, color: '#ffb48a', life: 3 });
            G.sfx('spit', { x: c.x, y: c.y });
          }
        }
        if (c.stT > 2.1) { ai.set(c, 'rest'); c.restT = 1.2; c.stun = 1.0; }      // dizzy
      } else {       // rest
        ai.brake(c, 4, dt); ai.face(c, toP, 3, dt);
        c.ext = damp(c.ext, 0, 4, dt); c.arm = damp(c.arm, 0.15, 4, dt);
        if (c.stT > c.restT) { ai.set(c, 'idle'); c.cd = hard ? G.rr(0.5, 1) : G.rr(0.9, 1.5); }
      }
    },
    anim(c, dt) {
      kit.chainFollow(c.ch, c.x, c.y, c.face, 0.45);
      c.swim += dt * (7 + hypot(c.vx, c.vy) * 0.03);
      G.syncParts(c, c.ch);
    },
    draw(c, ctx) {
      const A = c.alpha, ch = c.ch, n = ch.n, up = kit.upSide(c), t = G.time, hard = c.phase === 2;
      const X = ch.x, Y = ch.y;
      ctx.globalAlpha = A; ctx.lineCap = 'round';
      const tang = i => atan2(Y[max(0, i - 1)] - Y[min(n - 1, i + 1)], X[max(0, i - 1)] - X[min(n - 1, i + 1)]);
      // tail fan
      const ta = tang(n - 1) + PI, tx = X[n - 1], ty = Y[n - 1];
      for (let k = -2; k <= 2; k++) {
        const a = ta + k * 0.42 + sin(t * 3 + k) * 0.06, L = 24 - abs(k) * 3;
        ctx.fillStyle = ['#ff5a4a', '#3a8cff', '#ffd24a', '#3a8cff', '#ff5a4a'][k + 2];
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + cos(a - 0.3) * L * 0.8, ty + sin(a - 0.3) * L * 0.8, tx + cos(a) * L, ty + sin(a) * L);
        ctx.quadraticCurveTo(tx + cos(a + 0.3) * L * 0.8, ty + sin(a + 0.3) * L * 0.8, tx, ty); ctx.fill();
      }
      // swimmerets + walking legs on the belly side
      ctx.strokeStyle = '#ff6a3a'; ctx.lineWidth = 3;
      for (let i = 2; i < n - 1; i++) {
        const a = tang(i), bx = -sin(a) * -up, by = cos(a) * -up, sw = sin(c.swim - i * 0.9) * 7;
        const x = X[i] + bx * 9, y = Y[i] + by * 9;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + bx * 11 - cos(a) * sw, y + by * 11 - sin(a) * sw); ctx.stroke();
      }
      // body plates, tail first so the head overlaps
      for (let i = n - 1; i >= 0; i--) {
        const a = tang(i), w = lerp(21, 11, i / (n - 1)) * (i === 0 ? 1.12 : 1), len = i === 0 ? 17 : 10.5;
        const g = ctx.createLinearGradient(X[i] - sin(a) * up * w, Y[i] + cos(a) * up * w, X[i] + sin(a) * up * w, Y[i] - cos(a) * up * w);
        g.addColorStop(0, hard ? '#3ad08a' : '#2fb878'); g.addColorStop(0.55, i & 1 ? '#3fcf8a' : '#4ad998'); g.addColorStop(1, '#e8f7a8');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(X[i], Y[i], len, w, a, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,90,60,0.75)'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(X[i], Y[i], len, w, a, PI * 0.5, PI * 1.5); ctx.stroke();
      }
      // head furniture
      const ha = c.face, hx = X[0], hy = Y[0], fx = cos(ha), fy = sin(ha), px = -fy, py = fx;
      ctx.strokeStyle = '#ff8a5a'; ctx.lineWidth = 1.6;
      for (let s = -1; s <= 1; s += 2) {       // antennae
        const wv = sin(t * 4 + s) * 6;
        ctx.beginPath(); ctx.moveTo(hx + fx * 14 + px * s * 5, hy + fy * 14 + py * s * 5);
        ctx.quadraticCurveTo(hx + fx * 34 + px * s * (12 + wv), hy + fy * 34 + py * s * (12 + wv), hx + fx * 52 + px * s * (5 + wv * 2), hy + fy * 52 + py * s * (5 + wv * 2)); ctx.stroke();
        ctx.fillStyle = '#ffa24a';                // antennal scales
        ctx.beginPath(); ctx.ellipse(hx + fx * 12 + px * s * 20, hy + fy * 12 + py * s * 20, 9, 5, ha + s * 0.6, 0, TAU); ctx.fill();
      }
      // raptorial clubs: folded under the chin, or thrown forward
      const cock = c.arm, ext = c.ext;
      for (let s = -1; s <= 1; s += 2) {
        const sx = hx + fx * 6 + px * s * 12, sy = hy + fy * 6 + py * s * 12;
        const ea = ha + s * (1.2 - ext * 1.0) + s * cock * 0.5, el = 15;
        const ex = sx + cos(ea) * el, ey = sy + sin(ea) * el;
        const ca = ha - s * (1.4 * (1 - ext)) + s * cock * 0.3, cl = 14 + ext * 20;
        const cx = ex + cos(ca) * cl, cy = ey + sin(ca) * cl;
        ctx.strokeStyle = '#e84a3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#ffd9c8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(cx, cy); ctx.stroke();
        ctx.fillStyle = '#fff4ea'; ctx.beginPath(); ctx.arc(cx, cy, 6.5 + cock * 1.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff5a4a'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, TAU); ctx.fill();
        if (s === 1) { c.clubX = cx; c.clubY = cy; }
      }
      // stalked eyes with their odd horizontal band
      const look = ai.toPlayer(c, G.player);
      for (let s = -1; s <= 1; s += 2) {
        const bx = hx + fx * 12 + px * s * 7, by = hy + fy * 12 + py * s * 7;
        const ex = bx + fx * 9 + px * s * 6 + cos(look) * 2, ey = by + fy * 9 + py * s * 6 + sin(look) * 2;
        ctx.strokeStyle = '#2fb878'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = c.stun > 0 ? '#d8c8ff' : '#c86aff'; ctx.beginPath(); ctx.ellipse(ex, ey, 6, 4.4, ha + PI / 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#2a0a4a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ex - fx * 4, ey - fy * 4); ctx.lineTo(ex + fx * 4, ey + fy * 4); ctx.stroke();
        ctx.fillStyle = '#12051f'; ctx.beginPath(); ctx.arc(ex + cos(look) * 1.5, ey + sin(look) * 1.5, 1.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const t = G.time;
      if (c.asleep) return;
      if (c.arm > 0.3 && c.clubX !== undefined) G.drawGlow(ctx, c.clubX, c.clubY, 16 + c.arm * 16, '#eaffff', c.arm * 0.7);
      if (c.st === 'jabAim') {
        const u = min(1, c.stT / 0.5), a = c.face, d = G.raycast(c.x, c.y, cos(a), sin(a), 620);
        ctx.globalAlpha = 0.14 + 0.42 * u; ctx.strokeStyle = '#ffd0b0'; ctx.lineWidth = 2 + 4 * u; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 140;
        ctx.beginPath(); ctx.moveTo(c.x + cos(a) * 40, c.y + sin(a) * 40); ctx.lineTo(c.x + cos(a) * d, c.y + sin(a) * d); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      if (c.phase === 2) { const ch = c.ch; for (let i = 1; i < ch.n; i += 2) G.drawGlow(ctx, ch.x[i], ch.y[i], 20, '#ff9a6a', 0.22 + 0.12 * sin(t * 6 + i)); }
    },
    light(c) { if (!c.asleep) G.lights.add(c.x, c.y, 150, '#b8ffe0', 0.25); },
  });

  G.codexAdd('mantis', { name: 'Peacock Mantis Shrimp', latin: 'Odontodactylus scyllarus', zone: 0, kind: 'fauna', boss: true, size: '18 cm, usually', notes: 'Sixteen kinds of colour receptor to my three. Its punch accelerates like a bullet, and the water it leaves behind boils for an instant. This one did not want me near the way down, and it made the argument very clearly. We disagreed. Then it left, and I have been thinking about what it sees when it looks at a reef.' });
})();
