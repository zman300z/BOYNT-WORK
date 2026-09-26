'use strict';
// ============================================================================
// Graphics: canvas, camera, particles, lights, screen effects, sprite helpers
// ============================================================================
(function () {
  const G = window.G;

  G.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    c.ctx = x;
    return c;
  };

  // build a sprite from rows of chars and a palette {char: color}
  G.spriteFromRows = (rows, pal) => {
    const h = rows.length, w = rows[0].length;
    const c = G.makeCanvas(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (!col) continue;
        c.ctx.fillStyle = col;
        c.ctx.fillRect(x, y, 1, 1);
      }
    return c;
  };

  // tint a canvas (returns new canvas) — used for hit flashes
  const tintCache = new WeakMap();
  G.tinted = (src, color) => {
    let m = tintCache.get(src);
    if (!m) { m = {}; tintCache.set(src, m); }
    if (m[color]) return m[color];
    const c = G.makeCanvas(src.width, src.height);
    c.ctx.drawImage(src, 0, 0);
    c.ctx.globalCompositeOperation = 'source-in';
    c.ctx.fillStyle = color;
    c.ctx.fillRect(0, 0, c.width, c.height);
    m[color] = c;
    return c;
  };

  // ---------------------------------------------------------------- canvas
  G.initCanvas = () => {
    const c = document.getElementById('game');
    c.width = G.W;
    c.height = G.H;
    G.canvas = c;
    G.ctx = c.getContext('2d', { alpha: false });
    G.ctx.imageSmoothingEnabled = false;
    G.lightC = G.makeCanvas(G.W / 2, G.H / 2);
    const resize = () => {
      const s = Math.min(window.innerWidth / G.W, window.innerHeight / G.H);
      const scale = s >= 2 ? Math.floor(s * 4) / 4 : s;
      c.style.width = Math.floor(G.W * scale) + 'px';
      c.style.height = Math.floor(G.H * scale) + 'px';
    };
    window.addEventListener('resize', resize);
    resize();
    // light sprite
    G.lightSprite = G.makeCanvas(64, 64);
    const lx = G.lightSprite.ctx;
    const gr = lx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.75)');
    gr.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    lx.fillStyle = gr;
    lx.fillRect(0, 0, 64, 64);
    // vignette
    G.vignette = G.makeCanvas(G.W, G.H);
    const vx = G.vignette.ctx;
    const vg = vx.createRadialGradient(G.W / 2, G.H / 2, G.H * 0.35, G.W / 2, G.H / 2, G.W * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    vx.fillStyle = vg;
    vx.fillRect(0, 0, G.W, G.H);
  };

  const glowCache = new Map();
  G.glowSprite = (color) => {
    let c = glowCache.get(color);
    if (c) return c;
    c = G.makeCanvas(64, 64);
    const x = c.ctx;
    const rgb = G.hexToRgb(color);
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    gr.addColorStop(0.3, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`);
    gr.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
    return c;
  };

  // ---------------------------------------------------------------- camera
  const cam = (G.cam = {
    x: 0, y: 0, trauma: 0, ox: 0, oy: 0, bounds: null, lookX: 0, zoomPunch: 0,
    snapTo(x, y) {
      this.x = x - G.W / 2;
      this.y = y - G.H / 2;
      this.clampBounds();
    },
    clampBounds() {
      const b = this.bounds;
      if (!b) return;
      if (b.w <= G.W) this.x = b.x + (b.w - G.W) / 2;
      else this.x = G.clamp(this.x, b.x, b.x + b.w - G.W);
      if (b.h <= G.H) this.y = b.y + (b.h - G.H) / 2;
      else this.y = G.clamp(this.y, b.y, b.y + b.h - G.H);
    },
    follow(tx, ty, dt, facing) {
      this.lookX = G.lerp(this.lookX, facing * 40, 1 - Math.pow(0.05, dt));
      const gx = tx + this.lookX - G.W / 2;
      const gy = ty - G.H / 2 - 20;
      this.x = G.lerp(this.x, gx, 1 - Math.pow(0.0008, dt));
      this.y = G.lerp(this.y, gy, 1 - Math.pow(0.004, dt));
      this.clampBounds();
    },
    update(dt) {
      const mult = G.settings ? G.settings.shake : 1;
      const t2 = this.trauma * this.trauma * mult;
      const tt = G.time * 60;
      this.ox = (Math.sin(tt * 1.7) * 0.6 + Math.sin(tt * 3.1 + 1) * 0.4) * 9 * t2;
      this.oy = (Math.sin(tt * 2.3 + 2) * 0.6 + Math.sin(tt * 2.9) * 0.4) * 7 * t2;
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
    },
    get rx() { return Math.round(this.x + this.ox); },
    get ry() { return Math.round(this.y + this.oy); },
  });
  G.shake = (amt) => {
    cam.trauma = Math.min(1, cam.trauma + amt);
  };
  G.hitstop = 0;
  G.hitStop = (frames) => {
    G.hitstop = Math.max(G.hitstop, frames);
  };
  G.slowmo = { t: 0, scale: 1 };
  G.slowMo = (dur, scale) => {
    G.slowmo.t = dur;
    G.slowmo.scale = scale;
  };

  // ---------------------------------------------------------------- screen fx
  G.flash = { color: '#fff', t: 0, dur: 0.1, a: 0.5 };
  G.screenFlash = (color, dur, alpha) => {
    G.flash.color = color;
    G.flash.t = dur;
    G.flash.dur = dur;
    G.flash.a = alpha === undefined ? 0.5 : alpha;
  };
  G.fade = { a: 1, target: 0, speed: 2, cb: null };
  G.fadeTo = (target, speed, cb) => {
    G.fade.target = target;
    G.fade.speed = speed || 2;
    G.fade.cb = cb || null;
  };
  G.updateFade = (dt) => {
    const f = G.fade;
    if (f.a !== f.target) f.a = G.approach(f.a, f.target, f.speed * dt);
    if (f.a === f.target && f.cb) {
      const cb = f.cb;
      f.cb = null;
      cb();
    }
    if (G.flash.t > 0) G.flash.t -= dt;
  };
  G.drawScreenFx = (ctx) => {
    if (G.flash.t > 0) {
      ctx.globalAlpha = (G.flash.t / G.flash.dur) * G.flash.a;
      ctx.fillStyle = G.flash.color;
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.globalAlpha = 1;
    }
    if (G.fade.a > 0) {
      ctx.globalAlpha = G.fade.a;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, G.W, G.H);
      ctx.globalAlpha = 1;
    }
  };

  // ---------------------------------------------------------------- particles
  const MAXP = 1800;
  const parts = [];
  G.particles = parts;
  G.fx = {
    spawn(o) {
      if (parts.length >= MAXP) parts.shift();
      const p = {
        x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
        life: o.life || 0.5, max: o.life || 0.5,
        size: o.size || 1, size2: o.size2 === undefined ? (o.size || 1) : o.size2,
        color: o.color || '#fff', color2: o.color2 || null,
        type: o.type || 'px', grav: o.grav || 0, drag: o.drag === undefined ? 0 : o.drag,
        add: !!o.add, rot: o.rot || 0, vr: o.vr || 0, collide: !!o.collide,
        text: o.text, scale: o.scale || 1, delay: o.delay || 0, alpha: o.alpha === undefined ? 1 : o.alpha,
        fg: !!o.fg,
      };
      parts.push(p);
      return p;
    },
    burst(x, y, n, o) {
      for (let i = 0; i < n; i++) {
        const a = (o.angle !== undefined ? o.angle : 0) + (Math.random() - 0.5) * (o.spread !== undefined ? o.spread : Math.PI * 2);
        const s = (o.speed || 80) * (0.4 + Math.random() * 0.8);
        this.spawn({
          x: x + (Math.random() - 0.5) * (o.jitter || 0), y: y + (Math.random() - 0.5) * (o.jitter || 0),
          vx: Math.cos(a) * s + (o.vx || 0), vy: Math.sin(a) * s + (o.vy || 0),
          life: (o.life || 0.5) * (0.6 + Math.random() * 0.8), size: o.size || 1, size2: o.size2,
          color: Array.isArray(o.color) ? o.color[(Math.random() * o.color.length) | 0] : o.color,
          type: o.type || 'px', grav: o.grav || 0, drag: o.drag, add: o.add, collide: o.collide,
          vr: (Math.random() - 0.5) * 20, alpha: o.alpha,
        });
      }
    },
    text(x, y, str, color, scale, life) {
      this.spawn({ x, y, vx: (Math.random() - 0.5) * 20, vy: -55, life: life || 0.8, type: 'text', text: str, color, scale: scale || 1, grav: 90, fg: true });
    },
    ring(x, y, r, color, life, width) {
      this.spawn({ x, y, type: 'ring', size: 1, size2: r, color, life: life || 0.3, add: true, rot: width || 2 });
    },
    clear() {
      parts.length = 0;
    },
    update(dt, level) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.grav * dt;
        if (p.drag) {
          const d = Math.pow(1 - Math.min(0.99, p.drag), dt * 60);
          p.vx *= d;
          p.vy *= d;
        }
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        if (p.collide && level) {
          if (level.solidAt(nx, ny)) {
            if (level.solidAt(p.x, ny)) { p.vy *= -0.3; p.vx *= 0.7; }
            else p.vx *= -0.4;
          } else { p.x = nx; p.y = ny; }
        } else { p.x = nx; p.y = ny; }
        p.rot += p.vr * dt;
      }
    },
    draw(ctx, cx, cy, fgPass) {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p.delay > 0 || p.fg !== fgPass) continue;
        const t = 1 - p.life / p.max; // 0..1
        const x = p.x - cx, y = p.y - cy;
        if (x < -80 || y < -80 || x > G.W + 80 || y > G.H + 80) continue;
        const sz = p.size + (p.size2 - p.size) * t;
        let a = Math.min(1, (p.life / p.max) * 2) * p.alpha;
        const col = p.color2 ? G.mix(p.color, p.color2, t) : p.color;
        ctx.globalAlpha = a;
        if (p.add) ctx.globalCompositeOperation = 'lighter';
        switch (p.type) {
          case 'px':
            ctx.fillStyle = col;
            ctx.fillRect(Math.round(x - sz / 2), Math.round(y - sz / 2), Math.max(1, Math.round(sz)), Math.max(1, Math.round(sz)));
            break;
          case 'spark': {
            ctx.strokeStyle = col;
            ctx.lineWidth = Math.max(1, sz);
            const len = 0.035;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - p.vx * len, y - p.vy * len);
            ctx.stroke();
            break;
          }
          case 'glow': {
            const s = G.glowSprite(col);
            const r = sz;
            ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
            break;
          }
          case 'smoke':
            ctx.fillStyle = col;
            ctx.globalAlpha = a * 0.5;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(0.5, sz), 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'ring':
            ctx.strokeStyle = col;
            ctx.lineWidth = p.rot * (1 - t) + 0.5;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(0.5, sz), 0, Math.PI * 2);
            ctx.stroke();
            break;
          case 'shard':
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(p.rot);
            ctx.fillStyle = col;
            ctx.fillRect(-sz, -sz / 2, sz * 2, Math.max(1, sz));
            ctx.restore();
            break;
          case 'text':
            ctx.globalAlpha = Math.min(1, (p.life / p.max) * 3);
            G.text(ctx, p.text, x, y - (t < 0.15 ? (0.15 - t) * 20 : 0), col, { align: 'center', scale: p.scale, outline: '#000' });
            break;
          case 'streak':
            ctx.fillStyle = col;
            ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(sz)), Math.max(1, Math.round(p.rot || 6)));
            break;
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    },
  };

  // ---------------------------------------------------------------- lights
  const lights = [];
  G.lights = lights;
  G.addLight = (x, y, r, color, intensity) => {
    lights.push({ x, y, r, color: color || '#ffcc88', i: intensity === undefined ? 1 : intensity });
  };
  G.renderLighting = (ctx, cx, cy, ambient, darkness, glowAmt) => {
    const lc = G.lightC, l = lc.ctx;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, lc.width, lc.height);
    if (darkness > 0.01) {
      l.fillStyle = G.rgba(ambient, darkness);
      l.fillRect(0, 0, lc.width, lc.height);
      l.globalCompositeOperation = 'destination-out';
      for (const L of lights) {
        const x = (L.x - cx) / 2, y = (L.y - cy) / 2, r = L.r / 2;
        if (x + r < 0 || y + r < 0 || x - r > lc.width || y - r > lc.height) continue;
        l.globalAlpha = Math.min(1, L.i);
        l.drawImage(G.lightSprite, x - r, y - r, r * 2, r * 2);
      }
      l.globalAlpha = 1;
      l.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(lc, 0, 0, G.W, G.H);
      ctx.imageSmoothingEnabled = false;
    }
    // additive colored glows
    if (glowAmt > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (const L of lights) {
        const x = L.x - cx, y = L.y - cy, r = L.r * 0.8;
        if (x + r < 0 || y + r < 0 || x - r > G.W || y - r > G.H) continue;
        ctx.globalAlpha = Math.min(1, glowAmt * L.i * 0.35);
        ctx.drawImage(G.glowSprite(L.color), x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    lights.length = 0;
  };

  // ---------------------------------------------------------------- drawing helpers
  G.rect = (ctx, x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  G.strokeRect = (ctx, x, y, w, h, color) => {
    ctx.fillStyle = color;
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  };
  // pixel-art panel with bevel
  G.panel = (ctx, x, y, w, h, opts) => {
    opts = opts || {};
    const bg = opts.bg || 'rgba(12,10,20,0.92)';
    const border = opts.border || '#5a4a6a';
    const hi = opts.hi || '#8a7a9a';
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    ctx.fillStyle = bg;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = border;
    ctx.fillRect(x + 1, y, w - 2, 1);
    ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
    ctx.fillRect(x, y + 1, 1, h - 2);
    ctx.fillRect(x + w - 1, y + 1, 1, h - 2);
    ctx.fillStyle = hi;
    ctx.fillRect(x + 2, y + 1, w - 4, 1);
    if (opts.corner !== false) {
      ctx.fillStyle = opts.cornerColor || '#d8a860';
      ctx.fillRect(x, y, 2, 2);
      ctx.fillRect(x + w - 2, y, 2, 2);
      ctx.fillRect(x, y + h - 2, 2, 2);
      ctx.fillRect(x + w - 2, y + h - 2, 2, 2);
    }
  };
  G.bar = (ctx, x, y, w, h, frac, color, bg, frac2, color2) => {
    ctx.fillStyle = bg || '#1a1420';
    ctx.fillRect(x, y, w, h);
    if (frac2 !== undefined && frac2 > frac) {
      ctx.fillStyle = color2 || '#ff9a40';
      ctx.fillRect(x, y, Math.round(w * G.clamp(frac2, 0, 1)), h);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.round(w * G.clamp(frac, 0, 1)), h);
  };
  // line of pixels (Bresenham) — for crisp beams/ropes
  G.pixLine = (ctx, x0, y0, x1, y1, color) => {
    ctx.fillStyle = color;
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if ((x0 === x1 && y0 === y1) || n++ > 2000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  };
  // filled pixel circle
  G.pixCircle = (ctx, cx, cy, r, color) => {
    ctx.fillStyle = color;
    cx = Math.round(cx); cy = Math.round(cy);
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  };
  // draw an image rotated around pivot (px,py in image coords) at (x,y)
  G.drawRot = (ctx, img, x, y, ang, px, py, flip, sx, sy) => {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.rotate(ang);
    if (sx || sy) ctx.scale(sx || 1, sy || 1);
    ctx.drawImage(img, -px, -py);
    ctx.restore();
  };
})();
