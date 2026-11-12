'use strict';
/* UNDERSONG — decor + props.
   decor = scenery that notices you (kelp that parts, worms that hide, clams that snap shut).
           Thousands may exist per zone, bucketed in rows so only the ones near the camera run.
   props = one-off interactive objects (supply pods, wrecks, cleaning stations, barriers, the shop). */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, exp, PI, hypot, floor } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU;
  const ROW = 420;

  G.DECOR = {};
  G.defDecor = function (id, def) { def.id = id; if (def.r === undefined) def.r = 40; G.DECOR[id] = def; return def; };

  const D = G.decor = {
    rows: [], n: 0, vis: [], visBack: [],
    clear() { this.rows = []; this.n = 0; this.vis.length = 0; this.visBack.length = 0; },
    add(type, x, y, nx, ny, o) {
      const def = G.DECOR[type];
      if (!def) { console.warn('unknown decor', type); return null; }
      const d = { type, def, x, y, nx: nx || 0, ny: ny === undefined ? -1 : ny, ang: atan2(ny === undefined ? -1 : ny, nx || 0), s: 1, ph: G.rand() * TAU, react: 0, t: 0, data: null, dead: false };
      if (o) Object.assign(d, o);
      if (def.init) def.init(d);
      const ri = max(0, floor(y / ROW));
      (this.rows[ri] || (this.rows[ri] = [])).push(d);
      this.n++;
      return d;
    },
    update(dt) {
      const cam = G.cam, p = G.player, vis = this.vis, visBack = this.visBack;
      vis.length = 0; visBack.length = 0;
      const r0 = max(0, floor((cam.top - 260) / ROW)), r1 = floor((cam.bottom + 260) / ROW);
      const x0 = cam.left - 200, x1 = cam.right + 200;
      for (let ri = r0; ri <= r1; ri++) {
        const row = this.rows[ri];
        if (!row) continue;
        for (let i = 0; i < row.length; i++) {
          const d = row[i];
          if (d.dead || d.x < x0 || d.x > x1) continue;
          const def = d.def;
          d.t += dt;
          if (def.reactR) {
            const dx = p.x - d.x, dy = p.y - d.y, near = !p.dead && dx * dx + dy * dy < def.reactR * def.reactR;
            d.react = damp(d.react, near ? 1 : 0, near ? (def.reactIn || 14) : (def.reactOut || 1.5), dt);
            if (near && !d.was && def.onNear) def.onNear(d, p);
            d.was = near;
          }
          if (def.update) def.update(d, dt, p);
          if (def.light) def.light(d);
          (def.back ? visBack : vis).push(d);
        }
      }
      // pulses passing close by can set things off too
      if (G.ents.shots.length) {
        for (const d of vis) {
          const def = d.def;
          if (!def.onShot) continue;
          for (const s of G.ents.shots) { if (!s.dead && abs(s.x - d.x) < def.r && abs(s.y - d.y) < def.r) { if (def.onShot(d, s) === true) G.shots.end(s, false); break; } }
        }
      }
    },
    drawBack(ctx) { for (const d of this.visBack) d.def.draw(d, ctx); ctx.globalAlpha = 1; },
    draw(ctx) { for (const d of this.vis) if (d.def.draw) d.def.draw(d, ctx); ctx.globalAlpha = 1; },
    drawGlow(ctx) {
      for (const d of this.visBack) if (d.def.glow) d.def.glow(d, ctx);
      for (const d of this.vis) if (d.def.glow) d.def.glow(d, ctx);
      ctx.globalAlpha = 1;
    },
  };

  // ================================================================= props
  G.PROPS = {};
  G.defProp = function (id, def) { def.id = id; if (def.r === undefined) def.r = 24; G.PROPS[id] = def; return def; };

  const PR = G.props = {
    focus: null,
    add(type, x, y, o) {
      const def = G.PROPS[type];
      if (!def) { console.warn('unknown prop', type); return null; }
      const pr = { type, def, x, y, r: def.r, t: 0, ph: G.rand() * TAU, used: false, dead: false, scan: 0, codex: def.codex || null, scanTime: def.scanTime, scanXp: def.scanXp, solid: !!def.solid, data: null };
      if (o) Object.assign(pr, o);
      if (def.init) def.init(pr);
      G.ents.props.push(pr);
      return pr;
    },
    update(dt) {
      const arr = G.ents.props, p = G.player;
      let focus = null, fd = 1e9;
      for (let i = 0; i < arr.length; i++) {
        const pr = arr[i], def = pr.def;
        if (pr.dead) continue;
        pr.t += dt;
        const dx = p.x - pr.x, dy = p.y - pr.y, d = sqrt(dx * dx + dy * dy);
        pr.pd = d;
        if (d > 1700 && !def.always) continue;
        if (pr !== G.scan.target) pr.scan = max(0, (pr.scan || 0) - dt * 0.35);
        if (def.update) def.update(pr, dt, p);
        if (pr.solid && !p.dead && d < pr.r + p.r) {       // simple round collider
          const k = (pr.r + p.r - d) / (d || 1);
          p.x += dx * k; p.y += dy * k;
          const vn = (p.vx * dx + p.vy * dy) / (d || 1);
          if (vn < 0) { p.vx -= dx / (d || 1) * vn; p.vy -= dy / (d || 1) * vn; }
        }
        if (def.light && G.cam.sees(pr.x, pr.y, 400)) def.light(pr);
        if (def.interact && !pr.used && !p.dead && p.control && d < (def.reach || pr.r + 46) && d < fd && (!def.canInteract || def.canInteract(pr, p))) { focus = pr; fd = d; }
      }
      this.focus = focus;
      if (focus && G.input.interact) { focus.def.interact(focus, p); G.input.interact = false; }
      // solid props stop pulses
      for (const s of G.ents.shots) {
        if (s.dead || s.kind === 'wave') continue;
        for (const pr of arr) if (pr.solid && !pr.dead && G.dist2(s.x, s.y, pr.x, pr.y) < pr.r * pr.r) { if (pr.def.onShot) pr.def.onShot(pr, s); G.shots.end(s, true); break; }
      }
      for (const s of G.ents.shots) {
        if (s.dead) continue;
        for (const pr of arr) { const def = pr.def; if (!pr.solid && def.onShot && !pr.dead && G.dist2(s.x, s.y, pr.x, pr.y) < pr.r * pr.r) { if (def.onShot(pr, s) === true) { G.shots.end(s, false); break; } } }
      }
      G.removeDead(arr);
    },
    draw(ctx) {
      const cam = G.cam;
      for (const pr of G.ents.props) if (!pr.dead && pr.def.draw && cam.sees(pr.x, pr.y, pr.def.viewR || pr.r + 120)) pr.def.draw(pr, ctx);
      ctx.globalAlpha = 1;
    },
    drawGlow(ctx) {
      const cam = G.cam;
      for (const pr of G.ents.props) if (!pr.dead && pr.def.glow && cam.sees(pr.x, pr.y, pr.def.viewR || pr.r + 120)) pr.def.glow(pr, ctx);
      ctx.globalAlpha = 1;
    },
    find(type) { for (const pr of G.ents.props) if (pr.type === type && !pr.dead) return pr; return null; },
  };

  // ----------------------------------------------------------------- shared props
  // A plug of boulders wedged in a passage. open() makes it crumble.
  G.defProp('barrier', {
    r: 84, solid: true, always: true,
    init(pr) {
      const rng = G.RNG((pr.x * 13 + pr.y * 7) | 0);
      pr.rocks = [];
      for (let i = 0; i < 9; i++) { const a = rng.ang(), d = rng.range(0, pr.r * 0.62); pr.rocks.push({ x: cos(a) * d, y: sin(a) * d * 0.8, r: rng.range(22, 40), ph: rng.ang(), pts: 7 + rng.int(0, 3), sd: rng.int(1, 9999) }); }
      pr.openT = -1;
    },
    open(pr) { if (pr.openT < 0) { pr.openT = 0; pr.solid = false; G.sfx('gate'); G.cam.shake(0.5); } },
    update(pr, dt) {
      if (pr.openT >= 0) {
        pr.openT += dt;
        if (G.rand() < dt * 40) { const a = G.rand() * TAU; G.particles.dust(pr.x + cos(a) * pr.r * 0.6, pr.y + sin(a) * pr.r * 0.6, 2, G.css(G.zone.def.rockL), 90); G.particles.bubble(pr.x + G.rr(-60, 60), pr.y + G.rr(-40, 40), G.rr(2, 5), 0, -30); }
        if (pr.openT > 1.3) pr.dead = true;
      }
    },
    draw(pr, ctx) {
      const def = G.zone.def, u = pr.openT < 0 ? 0 : min(1, pr.openT / 1.3);
      for (const k of pr.rocks) {
        const fall = u * u * 260, x = pr.x + k.x * (1 + u * 0.8), y = pr.y + k.y + fall, rot = k.ph + u * (k.ph - 3);
        ctx.globalAlpha = 1 - u * u;
        ctx.fillStyle = G.css(G.mix(def.rockL, def.rockD, 0.35 + 0.4 * G.hash1(k.sd, 3)));
        ctx.beginPath();
        for (let i = 0; i < k.pts; i++) { const a = rot + i * TAU / k.pts, rr = k.r * (0.78 + 0.3 * G.hash1(k.sd + i, 9)); if (i) ctx.lineTo(x + cos(a) * rr, y + sin(a) * rr); else ctx.moveTo(x + cos(a) * rr, y + sin(a) * rr); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = G.css(def.rim, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  });

  // ----------------------------------------------------------------- scenery shared by several zones
  // rising bubble stream from a crack
  G.defDecor('bubbler', {
    r: 30,
    update(d, dt) {
      d.acc = (d.acc || 0) + dt;
      const burst = sin(d.t * 0.7 + d.ph) > 0.2;
      if (burst && d.acc > 0.11) { d.acc = 0; G.particles.bubble(d.x + G.rr(-4, 4), d.y, G.rr(1.5, 4.5), G.rr(-12, 12), G.rr(-80, -40), G.rr(2, 4)); }
    },
    draw(d, ctx) { ctx.fillStyle = 'rgba(8,16,30,0.6)'; ctx.beginPath(); ctx.ellipse(d.x, d.y + 1, 9, 3.5, d.ang + PI / 2, 0, TAU); ctx.fill(); },
  });
})();
