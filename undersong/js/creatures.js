'use strict';
/* UNDERSONG — creatures: shared framework.
   kit  = procedural anatomy (follow-the-leader spines, verlet ropes, side-view fish bodies, eyes)
   ai   = steering helpers (seek, wander, wall avoidance, flow-field chase, cached line of sight)
   creatures = manager: spawn / update / draw, damage, and the "dissuade" exit (nothing here dies;
               it just decides you are not worth it and leaves)
   scan = holding the lamp on a species catalogues it. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, exp, PI, hypot, floor, pow } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU;
  const _v = { x: 0, y: 0 };

  G.CREATURES = {};
  G.defCreature = function (id, def) {
    def.id = id;
    if (def.r === undefined) def.r = 12;
    if (def.hp === undefined) def.hp = 20;
    if (def.mass === undefined) def.mass = 1;
    if (def.xp === undefined) def.xp = 3;
    G.CREATURES[id] = def;
    return def;
  };
  let nextId = 1;

  // ================================================================= kit
  const TOP = new Float32Array(64), BOT = new Float32Array(64), OUT = [];
  const kit = G.kit = {
    ex: 0, ey: 0, hx: 0, hy: 0, tx: 0, ty: 0,      // last fish(): eye position, nose, tail tip

    chain(n, seg) { return { n, seg, x: new Float32Array(n), y: new Float32Array(n) }; },
    chainSet(ch, x, y, ang) { for (let i = 0; i < ch.n; i++) { ch.x[i] = x - cos(ang) * ch.seg * i; ch.y[i] = y - sin(ang) * ch.seg * i; } },
    // head leads, every joint keeps its distance; `bend` limits the angle between neighbours
    chainFollow(ch, hx, hy, ang, bend) {
      const X = ch.x, Y = ch.y, seg = ch.seg;
      X[0] = hx; Y[0] = hy;
      let pa = ang + PI;
      for (let i = 1; i < ch.n; i++) {
        let a = atan2(Y[i] - Y[i - 1], X[i] - X[i - 1]);
        if (bend !== undefined) { const d = G.angDiff(pa, a); if (d > bend) a = pa + bend; else if (d < -bend) a = pa - bend; }
        X[i] = X[i - 1] + cos(a) * seg; Y[i] = Y[i - 1] + sin(a) * seg;
        pa = a;
      }
    },
    rope(n, seg) { return { n, seg, x: new Float32Array(n), y: new Float32Array(n), px: new Float32Array(n), py: new Float32Array(n) }; },
    ropeSet(r, x, y, dx, dy) { for (let i = 0; i < r.n; i++) { r.x[i] = r.px[i] = x + dx * r.seg * i; r.y[i] = r.py[i] = y + dy * r.seg * i; } },
    // verlet, anchored at index 0. gx/gy = acceleration (px/s²), keep = velocity retained per step
    ropeStep(r, ax, ay, dt, gx, gy, keep) {
      const X = r.x, Y = r.y, PX = r.px, PY = r.py, n = r.n, seg = r.seg, d2 = dt * dt;
      for (let i = 1; i < n; i++) {
        const vx = (X[i] - PX[i]) * keep, vy = (Y[i] - PY[i]) * keep;
        PX[i] = X[i]; PY[i] = Y[i];
        X[i] += vx + gx * d2; Y[i] += vy + gy * d2;
      }
      X[0] = ax; Y[0] = ay;
      for (let it = 0; it < 2; it++) {
        for (let i = 1; i < n; i++) {
          const dx = X[i] - X[i - 1], dy = Y[i] - Y[i - 1], d = sqrt(dx * dx + dy * dy) || 1e-4, k = (d - seg) / d;
          if (i === 1) { X[i] -= dx * k; Y[i] -= dy * k; }
          else { X[i - 1] += dx * k * 0.5; Y[i - 1] += dy * k * 0.5; X[i] -= dx * k * 0.5; Y[i] -= dy * k * 0.5; }
        }
      }
    },
    // nudge rope points away from a moving disc (kelp parting around the probe, etc.)
    ropePush(r, x, y, rad, vx, vy, k) {
      for (let i = 1; i < r.n; i++) {
        const dx = r.x[i] - x, dy = r.y[i] - y, d2 = dx * dx + dy * dy;
        if (d2 < rad * rad) { const f = (1 - sqrt(d2) / rad) * k; r.x[i] += vx * f + dx * f * 0.02; r.y[i] += vy * f + dy * f * 0.02; }
      }
    },
    ropeDraw(ctx, r, w0, w1, color, alpha) {
      const n = r.n;
      ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      if (abs(w0 - w1) < 0.6) {
        ctx.lineWidth = w0; ctx.beginPath(); ctx.moveTo(r.x[0], r.y[0]);
        for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(r.x[i], r.y[i], (r.x[i] + r.x[i + 1]) / 2, (r.y[i] + r.y[i + 1]) / 2);
        ctx.lineTo(r.x[n - 1], r.y[n - 1]); ctx.stroke();
      } else {
        const parts = 3;
        for (let p = 0; p < parts; p++) {
          const a = floor(p * (n - 1) / parts), b = floor((p + 1) * (n - 1) / parts);
          ctx.lineWidth = lerp(w0, w1, (p + 0.5) / parts);
          ctx.beginPath(); ctx.moveTo(r.x[a], r.y[a]);
          for (let i = a + 1; i <= b; i++) ctx.lineTo(r.x[i], r.y[i]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },

    /* Side-view fish from a chain. o: {w, prof[], up(+1/-1), phase, amp, body, belly, fin, tail, dorsal, pect, alpha,
       nose, stripes:[i..], stripeCol, anal} — leaves eye/nose/tail positions in kit.ex.. for the caller. */
    fish(ctx, ch, o) {
      const n = ch.n, X = ch.x, Y = ch.y, up = o.up || 1, prof = o.prof, w = o.w, amp = o.amp || 0, ph = o.phase || 0, A = o.alpha === undefined ? 1 : o.alpha;
      let mx = 0, my = 0, mnx = 0, mny = 0;
      for (let i = 0; i < n; i++) {
        const i0 = i > 0 ? i - 1 : 0, i1 = i < n - 1 ? i + 1 : n - 1;
        let tx = X[i0] - X[i1], ty = Y[i0] - Y[i1]; const l = sqrt(tx * tx + ty * ty) || 1; tx /= l; ty /= l;
        const nx = -ty * up, ny = tx * up;                    // toward the dorsal side
        const u = i / (n - 1), wave = sin(ph - i * 0.85) * amp * pow(u, 1.35);
        const cx = X[i] + nx * wave, cy = Y[i] + ny * wave, hw = w * prof[i];
        TOP[i * 2] = cx + nx * hw * 0.9; TOP[i * 2 + 1] = cy + ny * hw * 0.9;
        BOT[i * 2] = cx - nx * hw * 1.1; BOT[i * 2 + 1] = cy - ny * hw * 1.1;
        if (i === (n >> 1)) { mx = cx; my = cy; mnx = nx; mny = ny; }
        if (i === 0) { this.hx = cx + tx * (o.nose || w * 0.7); this.hy = cy + ty * (o.nose || w * 0.7); this.ex = cx + nx * hw * 0.32 - tx * w * 0.15; this.ey = cy + ny * hw * 0.32 - ty * w * 0.15; }
      }
      ctx.globalAlpha = A;
      const tailI = n - 1, tdx = X[tailI] - X[tailI - 1], tdy = Y[tailI] - Y[tailI - 1], tl = sqrt(tdx * tdx + tdy * tdy) || 1;
      const wag = sin(ph - n * 0.85) * 0.5 * min(1, amp / 3);
      const ta = atan2(tdy, tdx) + wag, tcx = (TOP[tailI * 2] + BOT[tailI * 2]) / 2, tcy = (TOP[tailI * 2 + 1] + BOT[tailI * 2 + 1]) / 2;
      const T = o.tail || w * 1.6;
      this.tx = tcx + cos(ta) * T; this.ty = tcy + sin(ta) * T;
      // fins first (behind the body)
      ctx.fillStyle = o.fin || o.body;
      ctx.beginPath();
      ctx.moveTo(tcx, tcy);
      ctx.lineTo(tcx + cos(ta - 0.62) * T, tcy + sin(ta - 0.62) * T);
      ctx.quadraticCurveTo(tcx + cos(ta) * T * 0.5, tcy + sin(ta) * T * 0.5, tcx + cos(ta + 0.62) * T, tcy + sin(ta + 0.62) * T);
      ctx.closePath(); ctx.fill();
      if (o.dorsal) {
        const a = max(1, floor(n * 0.25)), b = min(n - 2, floor(n * 0.62)), m = (a + b) >> 1;
        const pnx = (TOP[m * 2] - BOT[m * 2]), pny = (TOP[m * 2 + 1] - BOT[m * 2 + 1]), pl = sqrt(pnx * pnx + pny * pny) || 1;
        ctx.beginPath(); ctx.moveTo(TOP[a * 2], TOP[a * 2 + 1]);
        ctx.quadraticCurveTo(TOP[m * 2] + pnx / pl * o.dorsal * 1.3, TOP[m * 2 + 1] + pny / pl * o.dorsal * 1.3, TOP[b * 2], TOP[b * 2 + 1]);
        ctx.closePath(); ctx.fill();
      }
      if (o.anal) {
        const a = floor(n * 0.5), b = min(n - 2, floor(n * 0.75)), m = (a + b) >> 1;
        const pnx = (BOT[m * 2] - TOP[m * 2]), pny = (BOT[m * 2 + 1] - TOP[m * 2 + 1]), pl = sqrt(pnx * pnx + pny * pny) || 1;
        ctx.beginPath(); ctx.moveTo(BOT[a * 2], BOT[a * 2 + 1]);
        ctx.quadraticCurveTo(BOT[m * 2] + pnx / pl * o.anal * 1.3, BOT[m * 2 + 1] + pny / pl * o.anal * 1.3, BOT[b * 2], BOT[b * 2 + 1]);
        ctx.closePath(); ctx.fill();
      }
      // body outline: nose, along the back, round the tail stock, back along the belly
      OUT.length = 0;
      OUT.push(this.hx, this.hy);
      for (let i = 0; i < n; i++) OUT.push(TOP[i * 2], TOP[i * 2 + 1]);
      for (let i = n - 1; i >= 0; i--) OUT.push(BOT[i * 2], BOT[i * 2 + 1]);
      if (o.belly) {
        const g = ctx.createLinearGradient(mx + mnx * w, my + mny * w, mx - mnx * w * 1.2, my - mny * w * 1.2);
        g.addColorStop(0, o.body); g.addColorStop(0.55, o.body); g.addColorStop(1, o.belly);
        ctx.fillStyle = g;
      } else ctx.fillStyle = o.body;
      ctx.beginPath(); G.smoothPath(ctx, OUT, true); ctx.fill();
      if (o.stripes) {
        ctx.strokeStyle = o.stripeCol || '#fff'; ctx.lineWidth = o.stripeW || 2; ctx.lineCap = 'round';
        for (const i of o.stripes) {
          if (i >= n) continue;
          const ax = TOP[i * 2], ay = TOP[i * 2 + 1], bx = BOT[i * 2], by = BOT[i * 2 + 1];
          ctx.beginPath(); ctx.moveTo(lerp(ax, bx, 0.12), lerp(ay, by, 0.12)); ctx.lineTo(lerp(ax, bx, 0.88), lerp(ay, by, 0.88)); ctx.stroke();
        }
      }
      if (o.pect) {
        const i = min(n - 1, 2), cx = (TOP[i * 2] + BOT[i * 2]) / 2, cy = (TOP[i * 2 + 1] + BOT[i * 2 + 1]) / 2;
        const ba = atan2(Y[min(n - 1, 3)] - Y[1], X[min(n - 1, 3)] - X[1]) - up * (0.5 + 0.35 * sin(ph * 1.3));
        ctx.fillStyle = o.fin || o.body;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + cos(ba - 0.4) * o.pect, cy + sin(ba - 0.4) * o.pect, cx + cos(ba) * o.pect * 1.15, cy + sin(ba) * o.pect * 1.15);
        ctx.quadraticCurveTo(cx + cos(ba + 0.5) * o.pect * 0.6, cy + sin(ba + 0.5) * o.pect * 0.6, cx, cy);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    // o: {lid, iris, dazed, angry, alpha, pupil}
    eye(ctx, x, y, r, look, o) {
      o = o || {};
      const A = o.alpha === undefined ? 1 : o.alpha;
      ctx.globalAlpha = A;
      ctx.fillStyle = o.white || '#f6fbff'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (o.dazed) {
        ctx.strokeStyle = '#1a2230'; ctx.lineWidth = max(1, r * 0.28); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.5, y + r * 0.5); ctx.moveTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x - r * 0.5, y + r * 0.5); ctx.stroke();
      } else {
        const pr = r * (o.pupil || 0.55), px = x + cos(look) * r * 0.36, py = y + sin(look) * r * 0.36;
        if (o.iris) { ctx.fillStyle = o.iris; ctx.beginPath(); ctx.arc(px, py, min(r * 0.86, pr * 1.45), 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#10161f'; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px - pr * 0.35, py - pr * 0.4, max(0.6, pr * 0.3), 0, TAU); ctx.fill();
        if (o.lid > 0.02) { const th = Math.acos(1 - 2 * min(1, o.lid)); ctx.fillStyle = o.lidCol || '#1a2230'; ctx.beginPath(); ctx.arc(x, y, r * 1.04, -PI / 2 - th, -PI / 2 + th); ctx.closePath(); ctx.fill(); }
        if (o.angry) { ctx.strokeStyle = o.lidCol || '#1a2230'; ctx.lineWidth = max(1.2, r * 0.3); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - r * 1.1 * o.angry, y - r * 1.15); ctx.lineTo(x + r * 1.1 * o.angry, y - r * 0.45); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    },
    stars(ctx, x, y, r, t) {
      ctx.fillStyle = '#fff2a8';
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + i * TAU / 3, sx = x + cos(a) * r, sy = y + sin(a) * r * 0.35, s = 3 + sin(t * 9 + i) * 0.8;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s * 0.3, sy - s * 0.3); ctx.lineTo(sx + s, sy); ctx.lineTo(sx + s * 0.3, sy + s * 0.3);
        ctx.lineTo(sx, sy + s); ctx.lineTo(sx - s * 0.3, sy + s * 0.3); ctx.lineTo(sx - s, sy); ctx.lineTo(sx - s * 0.3, sy - s * 0.3); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // which way is "up" for a side-view body, with hysteresis so it doesn't flicker when vertical
    upSide(c) {
      const cf = cos(c.face);
      if (cf > 0.25) c.up = -1; else if (cf < -0.25) c.up = 1; else if (!c.up) c.up = -1;
      return c.up;
    },
    // standard spindle profiles, n points
    profile(n, headFat, tailThin) {
      const p = new Float32Array(n);
      for (let i = 0; i < n; i++) { const u = i / (n - 1); p[i] = pow(sin(PI * min(1, u * (1 - tailThin * 0.2) * 0.9 + 0.12 + headFat * 0.1)), 0.75) * (1 - u * tailThin * 0.55) + 0.06; }
      return p;
    },
  };

  // ================================================================= ai
  const ai = G.ai = {
    set(c, st) { c.st = st; c.stT = 0; },
    seek(c, tx, ty, speed, k, dt) {
      const dx = tx - c.x, dy = ty - c.y, d = hypot(dx, dy) || 1;
      c.vx = damp(c.vx, dx / d * speed, k, dt); c.vy = damp(c.vy, dy / d * speed, k, dt);
      return d;
    },
    steer(c, dx, dy, speed, k, dt) { c.vx = damp(c.vx, dx * speed, k, dt); c.vy = damp(c.vy, dy * speed, k, dt); },
    brake(c, k, dt) { const e = exp(-k * dt); c.vx *= e; c.vy *= e; },
    // soft repulsion from rock; returns clearance
    avoid(c, margin, force, dt) {
      const d = G.sdfGrad(c.x, c.y, _v);
      if (d < margin) { const f = (1 - d / margin) * force * dt; c.vx += _v.x * f; c.vy += _v.y * f; }
      return d;
    },
    // amble around `home`, staying within c.leash
    wander(c, speed, dt) {
      c.wa += (G.noise2(c.t * 0.35, c.ph * 10, 5) - 0.5) * 3.2 * dt;
      const hx = c.home.x - c.x, hy = c.home.y - c.y, hd = hypot(hx, hy);
      if (hd > c.leash) c.wa = G.angLerp(c.wa, atan2(hy, hx), min(1, dt * 2));
      this.steer(c, cos(c.wa), sin(c.wa), speed, 2.5, dt);
      const d = this.avoid(c, c.r + 34, 520, dt);
      if (d < c.r + 14) c.wa = G.angLerp(c.wa, atan2(_v.y, _v.x), min(1, dt * 4));
    },
    // line of sight to the player, refreshed a few times a second (staggered by id)
    see(c, p, range) {
      if (c.pd > range) { c.sees = false; return false; }
      if (((G.frame + c.uid) & 7) === 0 || c.sees === undefined) c.sees = G.los(c.x, c.y, p.x, p.y);
      return c.sees;
    },
    // approach the player around walls: straight when visible, down the flow field otherwise
    chase(c, p, speed, k, dt) {
      if (this.see(c, p, 900)) { this.seek(c, p.x, p.y, speed, k, dt); c.lastX = p.x; c.lastY = p.y; }
      else if (G.flowDir(c.x, c.y, _v)) this.steer(c, _v.x, _v.y, speed, k, dt);
      else if (c.lastX !== undefined) this.seek(c, c.lastX, c.lastY, speed * 0.7, k, dt);
      this.avoid(c, c.r + 16, 700, dt);
    },
    away(c, p, speed, k, dt) {
      const dx = c.x - p.x, dy = c.y - p.y, d = hypot(dx, dy) || 1;
      this.steer(c, dx / d, dy / d, speed, k, dt);
      this.avoid(c, c.r + 30, 800, dt);
    },
    face(c, ang, rate, dt) { c.face = G.angDamp(c.face, ang, rate, dt); },
    faceVel(c, rate, dt) { if (c.vx * c.vx + c.vy * c.vy > 60) c.face = G.angDamp(c.face, atan2(c.vy, c.vx), rate, dt); },
    toPlayer(c, p) { return atan2(p.y - c.y, p.x - c.x); },
    // generic "notice the player" rule for hostiles
    notice(c, p, range, dt) {
      if (c.aggro) {
        if (c.pd > range * 2.2 && !this.see(c, p, range * 2.2)) { c.calmT = (c.calmT || 0) + dt; if (c.calmT > 4) { c.aggro = false; c.calmT = 0; } } else c.calmT = 0;
      } else if (c.pd < range && this.see(c, p, range)) { c.aggro = true; G.emit('aggro', c); }
      return c.aggro;
    },
  };

  // ================================================================= manager
  const CR = G.creatures = {
    aggro: 0, threat: 0,
    spawn(type, x, y, o) {
      const def = G.CREATURES[type];
      if (!def) { console.warn('unknown creature', type); return null; }
      const c = {
        uid: nextId++, id: 0, type, def, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: def.r, hp: def.hp, maxHp: def.hp,
        face: G.rand() * TAU, up: 0, t: G.rand() * 10, st: 'idle', stT: 0, ph: G.rand() * TAU, wa: G.rand() * TAU,
        flash: 0, stun: 0, vuln: 0, mark: 0, hurtCd: 0, alpha: 1,
        home: { x, y }, leash: def.leash || 160, aggro: false, sees: undefined, pd: 9999,
        hittable: def.hittable !== false, passive: !!def.passive, hostile: !!def.hostile, boss: !!def.boss,
        fleeing: 0, fleeJ: G.rr(-0.5, 0.5), dead: false, scan: 0, awake: false, touch: true, data: null,
      };
      c.id = c.uid;
      if (o) Object.assign(c, o);
      if (G.settings.calm && c.hostile) { c.hp *= 0.8; c.maxHp = c.hp; }
      if (def.init) def.init(c);
      G.ents.creatures.push(c);
      return c;
    },

    // a creature has had enough
    dissuade(c) {
      if (c.fleeing || c.dead) return;
      const def = c.def, p = G.player;
      c.fleeing = 0.0001; c.hittable = false; c.aggro = false; c.hp = 0;
      if (!c.passive) {
        G.pickups.loot(c.x, c.y, def.xp, G.rand() < (def.pearl || 0) + p.st.luck * 0.03 ? 1 + (def.pearlN || 0) : 0);
        if (G.rand() < (def.heal || 0.02)) G.pickups.spawn('heal', c.x, c.y, 1);
      }
      const big = c.r > 30;
      G.particles.bubbles(c.x, c.y, min(26, 6 + c.r * 0.5), c.r * 0.8, 150);
      G.particles.motes(c.x, c.y, big ? 16 : 7, def.color || '#bff6ff', { s0: 40, s1: 200, life: 0.6, size0: 3, size1: 8 });
      G.particles.ring(c.x, c.y, c.r * 0.6, c.r * 2.4 + 16, '#ffffff', 0.3, 2.5);
      G.lights.flash(c.x, c.y, c.r * 5 + 60, def.color || '#bff6ff', 0.25, 0.8);
      G.sfx('flee', { x: c.x, y: c.y, size: clamp(c.r / 46, 0, 1) });
      if (big) { G.game.hitstop(0.06); G.cam.shake(0.25); }
      if (def.onFlee) def.onFlee(c);
      if (G.meta) G.meta.count(def.codex || c.type);
      G.emit('dissuade', c);
    },

    update(dt) {
      const arr = G.ents.creatures, p = G.player;
      let aggro = 0, threat = 0;
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i], def = c.def;
        if (c.dead) continue;
        c.t += dt;
        const dx = p.x - c.x, dy = p.y - c.y;
        c.pd = sqrt(dx * dx + dy * dy);
        if (c.pd > 1500 && !c.boss && !c.fleeing) { c.awake = false; continue; }
        c.awake = true;
        if (c.fleeing) { this.updateFlee(c, dt, p); continue; }
        c.flash = max(0, c.flash - dt * 5); c.vuln = max(0, c.vuln - dt); c.mark = max(0, c.mark - dt); c.hurtCd = max(0, c.hurtCd - dt);
        c.stT += dt;
        if (c !== SC.target) c.scan = max(0, c.scan - dt * 0.35);
        if (c.stun > 0) { c.stun -= dt; ai.brake(c, 3, dt); }
        else if (def.think) def.think(c, dt, p);
        if (c.kx || c.ky) {
          c.x += c.kx * dt; c.y += c.ky * dt;
          const k = exp(-7 * dt); c.kx *= k; c.ky *= k;
          if (abs(c.kx) + abs(c.ky) < 2) c.kx = c.ky = 0;
        }
        if (!def.fixed) { c.x += c.vx * dt; c.y += c.vy * dt; if (!def.noclip) G.collide(c, 0.3); }
        // touching the probe
        if (!p.dead && c.touch && c.pd < c.r + p.r - 3) {
          if (p.dashT > 0 && p.st.dashDmg && c.hurtCd <= 0 && c.hittable) {
            c.hurtCd = 0.35;
            G.damageCreature(c, 14 * p.st.dashDmg, { x: p.x, y: p.y, vx: -dx, vy: -dy, aoe: true, knock: 2.2 });
          } else if (def.dmg && c.stun <= 0) {
            if (p.hurt(def.dmg, c.x, c.y) && def.onTouch) def.onTouch(c, p);
            if (p.st.thorns && c.hurtCd <= 0 && c.hittable) { c.hurtCd = 0.6; G.damageCreature(c, 12 * p.st.thorns, { x: p.x, y: p.y, vx: -dx, vy: -dy, aoe: true, knock: 1.5 }); }
          } else if (def.onBump && c.hurtCd <= 0) { c.hurtCd = 0.5; def.onBump(c, p); }
        }
        if (def.anim) def.anim(c, dt);
        if (def.light && G.cam.sees(c.x, c.y, 320)) def.light(c);
        if (c.aggro && c.hostile) { aggro++; threat += c.boss ? 6 : c.pd < 520 ? 1 : 0.3; }
      }
      // keep bodies from stacking
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        if (!a.awake || a.dead || a.fleeing || a.def.fixed || a.def.noSep) continue;
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j];
          if (!b.awake || b.dead || b.fleeing || b.def.fixed || b.def.noSep) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
          if (abs(dx) > rr || abs(dy) > rr) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 < rr * rr && d2 > 0.01) {
            const d = sqrt(d2), push = (rr - d) / d * 0.5, ma = b.def.mass / (a.def.mass + b.def.mass);
            a.x -= dx * push * ma; a.y -= dy * push * ma; b.x += dx * push * (1 - ma); b.y += dy * push * (1 - ma);
          }
        }
      }
      this.aggro = aggro; this.threat = threat;
      G.removeDead(arr);
    },

    updateFlee(c, dt, p) {
      const def = c.def, style = def.fleeStyle || 'dart', T = def.fleeTime || 0.9;
      c.fleeing += dt; c.flash = max(0, c.flash - dt * 4);
      const u = min(1, c.fleeing / T);
      if (style === 'dart') {
        const a = atan2(c.y - p.y, c.x - p.x) + c.fleeJ;
        ai.face(c, a, 12, dt);
        c.vx = damp(c.vx, cos(a) * 560, 5, dt); c.vy = damp(c.vy, sin(a) * 560, 5, dt);
      } else if (style === 'drift') { c.vx *= exp(-2 * dt); c.vy = damp(c.vy, -70, 2, dt); }
      else if (style === 'sink') { c.vx *= exp(-2 * dt); c.vy = damp(c.vy, 90, 2, dt); }
      else { c.vx = c.vy = 0; }
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.alpha = 1 - u * u;
      if (def.anim) def.anim(c, dt);
      if (c.fleeing > T) c.dead = true;
    },

    draw(ctx) {
      const cam = G.cam;
      for (const c of G.ents.creatures) {
        const def = c.def;
        if (c.dead || !c.awake || !cam.sees(c.x, c.y, def.viewR || c.r * 3 + 80)) continue;
        if (c.fleeing && (def.fleeStyle || 'dart') !== 'retract') {
          const s = 1 - 0.45 * min(1, c.fleeing / (def.fleeTime || 0.9));
          ctx.save(); ctx.translate(c.x, c.y); ctx.scale(s, s); ctx.translate(-c.x, -c.y);
          def.draw(c, ctx); ctx.restore();
        } else def.draw(c, ctx);
      }
      ctx.globalAlpha = 1;
    },

    drawGlow(ctx) {
      const cam = G.cam, t = G.time;
      for (const c of G.ents.creatures) {
        const def = c.def;
        if (c.dead || !c.awake || !cam.sees(c.x, c.y, def.viewR || c.r * 3 + 80)) continue;
        if (def.glow) def.glow(c, ctx);
        if (c.flash > 0.03) {
          const keep = c.alpha;
          c.alpha = c.flash * 0.85; def.draw(c, ctx); c.alpha = keep;
          G.drawGlow(ctx, c.x, c.y, c.r * 2 + 8, '#ffffff', c.flash * 0.4);
        }
        if (c.stun > 0.05 && !c.fleeing) kit.stars(ctx, c.x, c.y - c.r - 8, c.r * 0.7 + 6, t + c.ph);
        if (c.vuln > 0 || c.mark > 0) {
          ctx.globalAlpha = 0.5 + 0.25 * sin(t * 8); ctx.strokeStyle = c.mark > 0 ? '#7fe6ff' : '#ffe6a8'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]);
          ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 7, t, t + TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        }
      }
      ctx.globalAlpha = 1;
    },

    // helpers for spawn code
    count(type) { let n = 0; for (const c of G.ents.creatures) if (!c.dead && !c.fleeing && (!type || c.type === type)) n++; return n; },
    hostilesNear(x, y, r) { let n = 0; for (const c of G.ents.creatures) if (c.hostile && !c.dead && !c.fleeing && G.dist2(c.x, c.y, x, y) < r * r) n++; return n; },
  };

  // src: a shot or {x,y,vx,vy,aoe,crit,knock}
  G.damageCreature = function (c, dmg, src) {
    if (!c.hittable || c.dead || c.fleeing) return false;
    const def = c.def;
    if (def.onHit) {
      const r = def.onHit(c, dmg, src);
      if (r === 'reflect') {
        G.sfx('clang', { x: c.x, y: c.y });
        G.particles.sparks(src.x, src.y, 5, '#ffe9c0', { s0: 80, s1: 260, life: 0.25 });
        return 'reflect';
      }
      if (r === false) return false;
      if (typeof r === 'number') dmg = r;
    }
    if (c.vuln > 0) dmg *= 1.4;
    if (c.mark > 0) dmg *= 1.25;
    c.hp -= dmg; c.flash = 1;
    if (c.hostile && !c.aggro) { c.aggro = true; G.emit('aggro', c); }
    const sl = hypot(src.vx || 0, src.vy || 0) || 1, kn = (src.knock || 1) * G.player.st.knock * (src.aoe ? 150 : 95) / def.mass;
    c.kx += (src.vx || 0) / sl * kn; c.ky += (src.vy || 0) / sl * kn;
    const hx = src.aoe ? c.x : src.x, hy = src.aoe ? c.y : src.y;
    G.particles.sparks(hx, hy, src.crit ? 9 : 4, src.crit ? '#ffe08a' : (def.color || '#bff6ff'), { s0: 60, s1: 260, life: 0.3 });
    G.sfx('hit', { x: c.x, y: c.y, crit: src.crit, big: c.r > 30 });
    if (src.crit) { c.stun = max(c.stun, c.boss ? 0 : 0.4); G.particles.text(c.x, c.y - c.r - 10, 'DAZZLED', '#ffe08a', 11, 0.7); }
    G.emit('hit', c, dmg);
    if (c.hp <= 0) {
      if (def.onDown) { if (def.onDown(c) !== false) CR.dissuade(c); }
      else CR.dissuade(c);
    } else if (c.passive && !def.sturdy) CR.dissuade(c);
    return true;
  };

  // flare: stun everything nearby, wipe hostile projectiles
  G.on('flare', (p, R) => {
    const st = p.st;
    for (const c of G.ents.creatures) {
      if (c.dead || c.fleeing || !c.awake) continue;
      const d = c.pd;
      if (d > R + c.r) continue;
      if (c.def.onFlare) { if (c.def.onFlare(c) === false) continue; }
      if (c.passive) { CR.dissuade(c); continue; }
      c.stun = max(c.stun, c.boss ? st.flareStun * 0.3 : st.flareStun * (c.def.flareResist ? 0.5 : 1));
      if (st.flareVuln) c.vuln = max(c.vuln, 4);
      if (!c.boss && !c.def.fixed) { const k = (1 - d / (R + c.r)) * 260 / c.def.mass; c.kx += (c.x - p.x) / (d || 1) * k; c.ky += (c.y - p.y) / (d || 1) * k; }
      if (c.hostile) c.aggro = true;
    }
    for (const s of G.ents.eshots) {
      if (G.dist2(s.x, s.y, p.x, p.y) < R * R) {
        G.eshots.kill(s);
        if (st.flareAbsorb) G.pickups.spawn('glow', s.x, s.y, 1, 0, 0);
      }
    }
  });

  // ================================================================= scanning
  const SC = G.scan = {
    target: null, known: {}, label: null, labelT: 0,
    reset() { this.known = {}; this.target = null; },
    idOf(e) { return e.def ? (e.def.codex || e.type) : e.codex; },
    update(dt) {
      const p = G.player;
      this.labelT = max(0, this.labelT - dt);
      if (p.dead || !p.control || p.lampPower < 0.5) { this.target = null; return; }
      const st = p.st, range = st.lampR * 0.82, half = st.lampHalf * 0.95;
      let best = null, bs = 1e9;
      const consider = e => {
        const id = this.idOf(e);
        if (!id || this.known[id]) return;
        const dx = e.x - p.x, dy = e.y - p.y, d = hypot(dx, dy);
        if (d > range + e.r) return;
        const a = abs(G.angDiff(p.face, atan2(dy, dx)));
        if (a > half + Math.atan2(e.r, d)) return;
        const score = a * 220 + d * 0.3 - (e === this.target ? 90 : 0);
        if (score < bs) { bs = score; best = e; }
      };
      for (const c of G.ents.creatures) if (!c.dead && !c.fleeing && c.awake && !c.def.noScan && !c.hidden) consider(c);
      for (const pr of G.ents.props) if (pr.codex && !pr.dead) consider(pr);
      if (best && !G.los(p.x, p.y, best.x, best.y) && hypot(best.x - p.x, best.y - p.y) > best.r + 40) best = null;
      this.target = best;
      if (best) {
        const time = (best.def && best.def.scanTime) || best.scanTime || 1.25;
        best.scan = (best.scan || 0) + dt / time * st.scanMul;
        G.sfx('scanTick', { p: best.scan });
        if (best.scan >= 1) this.complete(best);
      }
    },
    complete(e) {
      const p = G.player, id = this.idOf(e);
      this.known[id] = true; e.scan = 0; this.target = null;
      const isNew = G.meta ? G.meta.catalog(id) : false;
      const xp = ((e.def && e.def.scanXp) || e.scanXp || 5) * (isNew ? 2 : 1);
      for (let i = 0; i < xp; i += 2) { const k = G.pickups.spawn('glow', e.x + G.rr(-e.r, e.r) * 0.5, e.y + G.rr(-e.r, e.r) * 0.5, min(2, xp - i)); k.mag = true; k.t = 0.3; }
      if (isNew) for (let i = 0; i < 2; i++) { const k = G.pickups.spawn('pearl', e.x, e.y, 1); k.mag = true; k.t = 0.1; }
      G.sfx(isNew ? 'newSpecies' : 'scanDone');
      G.particles.ring(e.x, e.y, e.r + 30, e.r + 4, '#9ff0ff', 0.45, 2.5);
      G.particles.motes(e.x, e.y, 8, '#9ff0ff', { s0: 20, s1: 90, life: 0.7, spread: e.r });
      p.wide = 1; p.happy = isNew ? 1.2 : 0.5;
      G.emit('scan', id, isNew, e);
    },
    // brackets + progress ring around whatever is being read (glow pass)
    draw(ctx) {
      const e = this.target;
      if (!e) return;
      const t = G.time, r = e.r + 12 + sin(t * 6) * 1.5, pr = e.scan || 0, p = G.player;
      ctx.strokeStyle = '#9ff0ff'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.9;
      for (let k = 0; k < 4; k++) { const a = t * 0.9 + k * PI / 2; ctx.beginPath(); ctx.arc(e.x, e.y, r, a - 0.32, a + 0.32); ctx.stroke(); }
      ctx.lineWidth = 3; ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(e.x, e.y, r + 6, -PI / 2, -PI / 2 + TAU * pr); ctx.stroke();
      // sweep line from the eye across the subject
      const sw = sin(t * 9) * e.r, a = atan2(e.y - p.y, e.x - p.x);
      ctx.globalAlpha = 0.28; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p.x + cos(a) * 14, p.y + sin(a) * 14); ctx.lineTo(e.x - sin(a) * sw, e.y + cos(a) * sw); ctx.stroke();
      ctx.globalAlpha = 1;
      const id = this.idOf(e), known = G.meta && G.meta.seen(id);
      const nm = known && G.CODEX && G.CODEX[id] ? G.CODEX[id].name.toUpperCase() : 'UNCATALOGUED';
      G.text(ctx, nm, e.x, e.y - r - 14, { size: 10, font: 'mono', weight: 700, color: '#bff6ff', align: 'center', spacing: 1.5, alpha: 0.9 });
    },
  };
})();
