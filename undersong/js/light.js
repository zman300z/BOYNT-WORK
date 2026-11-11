'use strict';
/* UNDERSONG — light: the low-res lightmap that the scene is multiplied by.
   Ambient falls off with depth; the lamp is a ray-marched visibility fan so rock casts shadows;
   everything else is cheap additive discs. Ink is drawn as darkness on top. */
(function () {
  const { sin, cos, min, max, PI } = Math;
  const TAU = G.TAU;
  const pts = [];
  const LAMP = '#fff3d6';
  const CONE = [[1.7, 0.78, 0.26, 24], [1.28, 0.9, 0.34, 28], [1.0, 1.0, 0.6, 36]];   // half-angle x, range x, intensity, rays

  const Lt = G.lights = {
    list: [], n: 0, dark: [], nd: 0, flashes: [],
    ambMul: 1, ambTarget: 1,
    lampPoly: [], lampX: 0, lampY: 0, lampR: 0, lampOn: 0,
    add(x, y, r, color, a) {
      if (!G.cam.sees(x, y, r)) return;
      let L = this.list[this.n];
      if (!L) L = this.list[this.n] = { x: 0, y: 0, r: 0, color: '', a: 0 };
      L.x = x; L.y = y; L.r = r; L.color = color; L.a = a === undefined ? 1 : a;
      this.n++;
    },
    addDark(x, y, r, a) {
      if (!G.cam.sees(x, y, r)) return;
      let L = this.dark[this.nd];
      if (!L) L = this.dark[this.nd] = { x: 0, y: 0, r: 0, a: 0 };
      L.x = x; L.y = y; L.r = r; L.a = a;
      this.nd++;
    },
    // a light that fades on its own (explosions, flares, pickups)
    flash(x, y, r, color, dur, a) { this.flashes.push({ x, y, r, color, t: dur, dur, a: a === undefined ? 1 : a }); },
    begin() { this.n = 0; this.nd = 0; },
    update(dt) {
      this.ambMul = G.damp(this.ambMul, this.ambTarget, 2.5, dt);
      for (let i = this.flashes.length - 1; i >= 0; i--) { const f = this.flashes[i]; f.t -= dt; if (f.t <= 0) this.flashes.splice(i, 1); }
    },
    ambientAt(y, out) {
      const zone = G.zone, A = zone.def.amb, t = G.clamp01(y / zone.pxH), m = this.ambMul;
      out[0] = (A[0][0] + (A[1][0] - A[0][0]) * t) * m; out[1] = (A[0][1] + (A[1][1] - A[0][1]) * t) * m; out[2] = (A[0][2] + (A[1][2] - A[0][2]) * t) * m;
      return out;
    },
    ambientLuma(y) { const a = this.ambientAt(y, _a0); return (a[0] + a[1] + a[2]) / 3; },

    fan(px, py, ang, half, range, n, ext) {
      pts.length = 0;
      for (let i = 0; i <= n; i++) {
        const a = ang - half + 2 * half * i / n, dx = cos(a), dy = sin(a);
        let d = G.raycast(px, py, dx, dy, range);
        d = min(range, d + ext);
        pts.push(px + dx * d, py + dy * d);
      }
      return pts;
    },

    // p: {x,y,ang,range,half,power,glow} or null
    render(p) {
      const L = G.lctx, cam = G.cam, w = G.lightC.width, h = G.lightC.height, s = w / G.W;
      L.setTransform(1, 0, 0, 1, 0, 0);
      L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1;
      const a0 = this.ambientAt(cam.top, _a0), a1 = this.ambientAt(cam.bottom, _a1);
      const g = L.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `rgb(${min(255, a0[0] * 255) | 0},${min(255, a0[1] * 255) | 0},${min(255, a0[2] * 255) | 0})`);
      g.addColorStop(1, `rgb(${min(255, a1[0] * 255) | 0},${min(255, a1[1] * 255) | 0},${min(255, a1[2] * 255) | 0})`);
      L.fillStyle = g; L.fillRect(0, 0, w, h);
      cam.apply(L, s);
      // open air above the surface is always fully lit
      const zone = G.zone;
      if (zone.idx === 0 && cam.top < zone.surfaceY) { L.fillStyle = '#fff'; L.fillRect(cam.left - 50, cam.top - 50, G.W / cam.zoom + 100, zone.surfaceY - cam.top + 50); }
      L.globalCompositeOperation = 'lighter';
      this.lampOn = 0;
      if (p && p.power > 0.01) {
        const pw = p.power;
        // body glow, occluded
        let poly = this.fan(p.x, p.y, 0, PI, p.glow, 40, 30);
        let gr = L.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glow);
        gr.addColorStop(0, G.css(LAMP, 0.95 * pw)); gr.addColorStop(0.4, G.css(LAMP, 0.55 * pw)); gr.addColorStop(1, G.css(LAMP, 0));
        L.fillStyle = gr; L.beginPath(); L.moveTo(poly[0], poly[1]);
        for (let i = 2; i < poly.length; i += 2) L.lineTo(poly[i], poly[i + 1]);
        L.closePath(); L.fill();
        // wide soft cone, then the bright core
        // three nested fans: a soft penumbra, a mid wash, the bright core
        for (let pass = 0; pass < 3; pass++) {
          const c = CONE[pass], half = p.half * c[0], range = p.range * c[1], inten = c[2] * pw;
          poly = this.fan(p.x, p.y, p.ang, half, range, c[3], 42);
          gr = L.createRadialGradient(p.x, p.y, 0, p.x, p.y, range);
          gr.addColorStop(0, G.css(LAMP, inten)); gr.addColorStop(0.5, G.css(LAMP, inten * 0.74)); gr.addColorStop(0.82, G.css(LAMP, inten * 0.3)); gr.addColorStop(1, G.css(LAMP, 0));
          L.fillStyle = gr; L.beginPath(); L.moveTo(p.x, p.y);
          for (let i = 0; i < poly.length; i += 2) L.lineTo(poly[i], poly[i + 1]);
          L.closePath(); L.fill();
          if (pass === 1) { this.lampPoly = poly.slice(); this.lampX = p.x; this.lampY = p.y; this.lampR = range; this.lampOn = pw; }
        }
      }
      for (let i = 0; i < this.n; i++) {
        const l = this.list[i];
        L.globalAlpha = min(1, l.a);
        L.drawImage(G.lightSprite(l.color), l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      }
      for (const f of this.flashes) {
        if (!cam.sees(f.x, f.y, f.r)) continue;
        const k = f.t / f.dur;
        L.globalAlpha = min(1, k * k * f.a);
        const r = f.r * (0.6 + 0.4 * (1 - k));
        L.drawImage(G.lightSprite(f.color), f.x - r, f.y - r, r * 2, r * 2);
      }
      if (this.nd) {
        L.globalCompositeOperation = 'source-over';
        const sp = G.lightSprite('#000000');
        for (let i = 0; i < this.nd; i++) { const l = this.dark[i]; L.globalAlpha = min(1, l.a); L.drawImage(sp, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2); }
      }
      L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
    },

    // faint visible beam in the water itself (emissive pass). Caller has the world transform + 'lighter' set.
    drawBeam(ctx, alpha) {
      if (this.lampOn <= 0.01 || alpha <= 0.004) return;
      const poly = this.lampPoly, x = this.lampX, y = this.lampY;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, this.lampR);
      const a = alpha * this.lampOn;
      gr.addColorStop(0, G.css(LAMP, a)); gr.addColorStop(0.5, G.css(LAMP, a * 0.45)); gr.addColorStop(1, G.css(LAMP, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]);
      ctx.closePath(); ctx.fill();
    },
  };
  const _a0 = [0, 0, 0], _a1 = [0, 0, 0];
})();
