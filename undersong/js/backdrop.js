'use strict';
/* UNDERSONG — backdrop: water gradient, sky + surface (zone 1), god rays, parallax far walls,
   and three depths of marine snow. */
(function () {
  const { sin, cos, min, max, floor, PI } = Math;
  const { clamp, lerp, smoothstep } = G;
  const TAU = G.TAU;
  const EX = 1700, EY = 1000;

  const B = G.backdrop = {
    far: [], snow: [], rays: [], clouds: [], birds: [], zoneIdx: -1, t: 0,

    init(zone) {
      const def = zone.def, seed = zone.seed;
      this.zoneIdx = zone.idx;
      // two parallax silhouettes, built once per zone from tiling noise
      this.far = [];
      for (let k = 0; k < 2; k++) {
        const size = 512, tex = G.makeNoiseTex(size, k ? 5 : 3, seed + 31 + k * 97, 4);
        const c = G.makeCanvas(size, size), x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
        const col = def.far[k], th = zone.idx === 0 ? (k ? 0.6 : 0.63) : (k ? 0.52 : 0.55);
        for (let i = 0; i < size * size; i++) {
          const n = tex[i], a = smoothstep(th, th + 0.07, n), shade = 0.82 + 0.3 * smoothstep(th + 0.02, th + 0.3, n);
          d[i * 4] = col[0] * shade; d[i * 4 + 1] = col[1] * shade; d[i * 4 + 2] = col[2] * shade; d[i * 4 + 3] = a * (k ? 235 : 215);
        }
        x.putImageData(img, 0, 0);
        this.far.push({ canvas: c, pattern: null, par: k ? 0.52 : 0.26, scale: k ? 2.2 : 3 });
      }
      const rng = G.RNG(seed + 5);
      this.snow = [];
      const layers = [
        { n: 80, par: 0.55, s0: 1.1, s1: 2, a0: 0.25, a1: 0.55, v0: 5, v1: 12, front: 0 },
        { n: 60, par: 1.0, s0: 1.4, s1: 2.8, a0: 0.4, a1: 0.9, v0: 9, v1: 22, front: 0 },
        { n: 14, par: 1.7, s0: 9, s1: 24, a0: 0.025, a1: 0.07, v0: 16, v1: 34, front: 1 },
      ];
      for (const L of layers) for (let i = 0; i < L.n; i++) {
        this.snow.push({ u: rng(), v: rng(), par: L.par, s: rng.range(L.s0, L.s1), a: rng.range(L.a0, L.a1), vy: rng.range(L.v0, L.v1), ph: rng.ang(), sw: rng.range(4, 14), front: L.front });
      }
      this.rays = [];
      if (zone.idx === 0) for (let i = 0; i < 11; i++) this.rays.push({ x: rng.range(-200, zone.pxW + 200), w: rng.range(40, 150), ph: rng.ang(), sp: rng.range(0.2, 0.6), len: rng.range(700, 1300), a: rng.range(0.05, 0.13) });
      this.clouds = [];
      if (zone.idx === 0) for (let i = 0; i < 7; i++) this.clouds.push({ x: rng.range(0, zone.pxW), y: rng.range(30, 150), w: rng.range(140, 360), h: rng.range(22, 50), v: rng.range(3, 9) });
      this.birds = [];
      if (zone.idx === 0) for (let i = 0; i < 3; i++) this.birds.push({ x: rng.range(0, zone.pxW), y: rng.range(40, 130), v: rng.range(22, 40) * rng.sign(), ph: rng.ang() });
    },

    update(dt) {
      this.t += dt;
      for (const s of this.snow) { s.v += s.vy * dt / EY; if (s.v > 1) s.v -= 1; s.u += sin(this.t * 0.6 + s.ph) * s.sw * dt / EX; }
      const zone = G.zone;
      for (const c of this.clouds) { c.x += c.v * dt; if (c.x - c.w > zone.pxW + 300) c.x = -300 - c.w; }
      for (const b of this.birds) { b.x += b.v * dt; if (b.x > zone.pxW + 200) b.x = -200; if (b.x < -200) b.x = zone.pxW + 200; }
    },

    surfaceWave(x, t) { return sin(x * 0.021 + t * 1.3) * 3 + sin(x * 0.047 - t * 0.9) * 2 + sin(x * 0.009 + t * 0.5) * 3; },

    draw(ctx) {
      const zone = G.zone, def = zone.def, cam = G.cam, S = G.S, t = this.t;
      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      // water column
      const d0 = clamp(cam.top / zone.pxH, 0, 1), d1 = clamp(cam.bottom / zone.pxH, 0, 1);
      const g = ctx.createLinearGradient(0, 0, 0, G.H);
      g.addColorStop(0, G.mixCss(def.water[0], def.water[1], d0)); g.addColorStop(1, G.mixCss(def.water[0], def.water[1], d1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, G.W, G.H);

      // far walls
      for (const L of this.far) {
        if (!L.pattern) L.pattern = ctx.createPattern(L.canvas, 'repeat');
        cam.apply(ctx, S, L.par);
        ctx.scale(L.scale, L.scale);
        const hw = G.W / 2 / cam.zoom + 40, hh = G.H / 2 / cam.zoom + 40, cx = cam.x * L.par, cy = cam.y * L.par;
        ctx.fillStyle = L.pattern;
        ctx.fillRect((cx - hw) / L.scale, (cy - hh) / L.scale, hw * 2 / L.scale, hh * 2 / L.scale);
      }

      if (zone.idx === 0) {
        // open water: let distance swallow the far reef near the surface
        cam.apply(ctx, S);
        const sy = zone.surfaceY, fg = ctx.createLinearGradient(0, sy + 250, 0, sy + 1000);
        fg.addColorStop(0, G.css(def.water[0], 1)); fg.addColorStop(1, G.mixCss(def.water[0], def.water[1], 0.16, 0));
        ctx.fillStyle = G.css(def.water[0]); ctx.fillRect(cam.left - 40, cam.top - 40, G.W / cam.zoom + 80, max(0, sy + 250 - cam.top + 40));
        ctx.fillStyle = fg; ctx.fillRect(cam.left - 40, sy + 250, G.W / cam.zoom + 80, 750);
        this.drawSky(ctx);
      }

      // far + mid snow (will be lit by the lightmap)
      ctx.setTransform(S, 0, 0, S, 0, 0);
      ctx.fillStyle = G.css(def.snow);
      const sa = def.snowA;
      for (const s of this.snow) {
        if (s.front) continue;
        const x = G.wrap(s.u * EX - cam.x * s.par, EX) - (EX - G.W) / 2, y = G.wrap(s.v * EY - cam.y * s.par, EY) - (EY - G.H) / 2;
        if (x < -4 || x > G.W + 4 || y < -4 || y > G.H + 4) continue;
        ctx.globalAlpha = s.a * sa;
        ctx.fillRect(x, y, s.s, s.s);
      }
      ctx.globalAlpha = 1;
    },

    drawSky(ctx) {
      const zone = G.zone, cam = G.cam, S = G.S, t = this.t, sy = zone.surfaceY;
      cam.apply(ctx, S);
      const x0 = cam.left - 40, x1 = cam.right + 40;
      if (cam.top < sy + 12) {
        // sky, clipped along the wave line
        ctx.beginPath(); ctx.moveTo(x0, cam.top - 40);
        ctx.lineTo(x1, cam.top - 40);
        for (let x = x1; x >= x0 - 16; x -= 16) ctx.lineTo(x, sy + this.surfaceWave(x, t));
        ctx.closePath();
        const g = ctx.createLinearGradient(0, sy - 420, 0, sy);
        g.addColorStop(0, '#5fa6de'); g.addColorStop(0.55, '#a9d4ec'); g.addColorStop(0.86, '#ffe3bd'); g.addColorStop(1, '#ffd0a0');
        ctx.fillStyle = g; ctx.fill();
        // sun
        const sunX = zone.pxW * 0.5 + 330 + (cam.x - zone.pxW * 0.5) * 0.75, sunY = sy - 96;
        G.drawGlow(ctx, sunX, sunY, 240, '#fff1c8', 0.9);
        ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, TAU); ctx.fill();
        // clouds
        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        for (const c of this.clouds) {
          const cx = c.x + (cam.x - zone.pxW * 0.5) * 0.5, cy = sy - 60 - c.y;
          if (cx + c.w < x0 || cx - c.w > x1) continue;
          ctx.beginPath();
          ctx.ellipse(cx, cy, c.w * 0.5, c.h * 0.5, 0, 0, TAU);
          ctx.ellipse(cx - c.w * 0.24, cy + c.h * 0.12, c.w * 0.3, c.h * 0.42, 0, 0, TAU);
          ctx.ellipse(cx + c.w * 0.26, cy + c.h * 0.1, c.w * 0.32, c.h * 0.4, 0, 0, TAU);
          ctx.fill();
        }
        // gulls
        ctx.strokeStyle = 'rgba(40,60,90,0.75)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        for (const b of this.birds) {
          const bx = b.x, by = sy - 70 - b.y + sin(t * 0.7 + b.ph) * 8, fl = sin(t * 5 + b.ph) * 4, d = b.v > 0 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(bx - 8, by - fl); ctx.quadraticCurveTo(bx - 3, by - 3 - fl * 0.3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3 - fl * 0.3, bx + 8, by - fl); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + d * 3, by + 0.6); ctx.stroke();
        }
      }
      // light pooling just under the surface + the wave line itself
      if (cam.top < sy + 260) {
        const g2 = ctx.createLinearGradient(0, sy, 0, sy + 240);
        g2.addColorStop(0, 'rgba(190,250,255,0.42)'); g2.addColorStop(0.3, 'rgba(150,240,250,0.16)'); g2.addColorStop(1, 'rgba(150,240,250,0)');
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.moveTo(x0, sy + 240); ctx.lineTo(x1, sy + 240);
        for (let x = x1; x >= x0 - 16; x -= 16) ctx.lineTo(x, sy + this.surfaceWave(x, t));
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let x = x0 - 16; x <= x1 + 16; x += 12) { const y = sy + this.surfaceWave(x, t); if (x === x0 - 16) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
        // glitter
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        for (let i = 0; i < 26; i++) {
          const gx = G.wrap(i * 173.3 + floor(t * 0.4 + i * 0.37) * 97.1, x1 - x0) + x0;
          const tw = sin(t * 3 + i * 1.7);
          if (tw > 0.55) ctx.fillRect(gx, sy + this.surfaceWave(gx, t) - 1, 5 * tw, 1.6);
        }
      }
      // god rays
      const depthFade = 1 - smoothstep(sy + 500, sy + 2600, cam.y);
      if (depthFade > 0.01) {
        ctx.globalCompositeOperation = 'lighter';
        for (const r of this.rays) {
          if (r.x + 700 < cam.left || r.x - 200 > cam.right) continue;
          const a = r.a * (0.55 + 0.45 * sin(t * r.sp + r.ph)) * depthFade;
          if (a < 0.004) continue;
          ctx.save();
          ctx.transform(1, 0, 0.34, 1, r.x + sin(t * 0.13 + r.ph) * 40, sy);
          const g3 = ctx.createLinearGradient(0, 0, 0, r.len);
          g3.addColorStop(0, `rgba(200,250,255,${a})`); g3.addColorStop(0.5, `rgba(170,240,250,${a * 0.5})`); g3.addColorStop(1, 'rgba(170,240,250,0)');
          ctx.fillStyle = g3; ctx.fillRect(-r.w / 2, 0, r.w, r.len);
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    },

    // near-plane bokeh, drawn additively after lighting
    drawFront(ctx) {
      const def = G.zone.def, cam = G.cam, S = G.S;
      ctx.setTransform(S, 0, 0, S, 0, 0);
      const sp = G.spr.bokeh, sa = min(1, def.snowA * 1.4);
      for (const s of this.snow) {
        if (!s.front) continue;
        const x = G.wrap(s.u * EX - cam.x * s.par, EX) - (EX - G.W) / 2, y = G.wrap(s.v * EY - cam.y * s.par, EY) - (EY - G.H) / 2;
        if (x < -30 || x > G.W + 30 || y < -30 || y > G.H + 30) continue;
        ctx.globalAlpha = s.a * sa;
        ctx.drawImage(sp, x - s.s, y - s.s, s.s * 2, s.s * 2);
      }
      ctx.globalAlpha = 1;
    },
  };
})();
