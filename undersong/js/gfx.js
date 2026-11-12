'use strict';
/* UNDERSONG — gfx: canvases, camera, sprite cache, text (incl. the hand-built stroke face),
   and the WebGL post chain (bloom, water wobble, shockwaves, aberration, grade, grain).
   Scene is drawn with Canvas2D into G.sceneC, then pushed through G.post.render(). */
(function () {
  const { sin, cos, min, max, floor, round, PI, sqrt, exp } = Math;
  const TAU = G.TAU;

  G.makeCanvas = function (w, h) { const c = document.createElement('canvas'); c.width = max(1, w | 0); c.height = max(1, h | 0); return c; };

  const stage = document.getElementById('stage');
  let viewC = document.getElementById('view');
  const uiC = document.getElementById('ui');
  G.uiC = uiC;
  G.ui = uiC.getContext('2d');
  G.sceneC = G.makeCanvas(G.W, G.H);
  G.ctx = G.sceneC.getContext('2d', { alpha: false });
  G.lightC = G.makeCanvas(G.W / 4, G.H / 4);
  G.lctx = G.lightC.getContext('2d', { alpha: false });
  G.S = 1;              // scene pixels per logical unit
  G.US = 1;             // ui pixels per logical unit
  G.viewRect = { x: 0, y: 0, w: G.W, h: G.H };

  G.settings = {
    master: 0.8, music: 0.7, sfx: 0.8, shake: 1, gfx: 'high', calm: false, flashes: true, hints: true, fullscreen: false,
  };
  const RES_CAP = { high: 1080, medium: 900, low: 720 };
  let sizedW = 0, sizedH = 0;
  G.forceResize = function () { sizedW = sizedH = 0; G.resize(); };

  G.resize = function () {
    const sw = stage.clientWidth || window.innerWidth, sh = stage.clientHeight || window.innerHeight;
    let w = sw, h = sw * 9 / 16;
    if (h > sh) { h = sh; w = sh * 16 / 9; }
    w = max(160, floor(w)); h = max(90, floor(h));
    const x = floor((sw - w) / 2), y = floor((sh - h) / 2);
    const rect = stage.getBoundingClientRect();
    G.viewRect = { x: rect.left + x, y: rect.top + y, w, h };
    for (const c of [viewC, uiC]) { c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.width = w + 'px'; c.style.height = h + 'px'; }
    const dpr = min(window.devicePixelRatio || 1, 2);
    const cap = RES_CAP[G.settings.gfx] || 1080;
    const ph = max(180, min(round(h * dpr), cap)), pw = round(ph * 16 / 9);
    const uh = max(180, min(round(h * dpr), 1440)), uw = round(uh * 16 / 9);
    if (sizedW !== pw || sizedH !== ph) {
      sizedW = pw; sizedH = ph;
      G.sceneC.width = pw; G.sceneC.height = ph;
      viewC.width = pw; viewC.height = ph;
      G.lightC.width = max(1, round(pw / 4)); G.lightC.height = max(1, round(ph / 4));
      G.post.resize(pw, ph);
    }
    if (uiC.width !== uw || uiC.height !== uh) { uiC.width = uw; uiC.height = uh; }
    G.S = ph / G.H; G.US = uh / G.H;
  };
  window.addEventListener('resize', () => G.resize());

  // ---------- camera ----------
  const cam = G.cam = {
    x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tzoom: 1,
    trauma: 0, kx: 0, ky: 0, sx: 0, sy: 0, rot: 0,
    shake(amount) { this.trauma = min(1, this.trauma + amount * G.settings.shake); },
    kick(dx, dy) { this.kx += dx * G.settings.shake; this.ky += dy * G.settings.shake; },
    update(dt) {
      this.trauma = max(0, this.trauma - dt * 1.6);
      const s = this.trauma * this.trauma, t = G.time;
      this.sx = G.wobble(t * 19, 11) * 16 * s + this.kx;
      this.sy = G.wobble(t * 19, 23) * 16 * s + this.ky;
      this.rot = G.wobble(t * 13, 37) * 0.012 * s;
      const k = exp(-dt * 14);
      this.kx *= k; this.ky *= k;
    },
    // world transform for a context that renders at `scale` px per logical unit
    apply(ctx, scale, parallax) {
      const z = this.zoom, p = parallax === undefined ? 1 : parallax;
      const cx = (this.x + this.sx) * p, cy = (this.y + this.sy) * p;
      const c = cos(this.rot), s = sin(this.rot), k = scale * z;
      ctx.setTransform(k * c, k * s, -k * s, k * c,
        (G.W / 2) * scale - k * (cx * c - cy * s), (G.H / 2) * scale - k * (cx * s + cy * c));
    },
    toScreenX(wx) { return (wx - this.x - this.sx) * this.zoom + G.W / 2; },
    toScreenY(wy) { return (wy - this.y - this.sy) * this.zoom + G.H / 2; },
    toWorldX(sx) { return (sx - G.W / 2) / this.zoom + this.x + this.sx; },
    toWorldY(sy) { return (sy - G.H / 2) / this.zoom + this.y + this.sy; },
    get left() { return this.x - G.W / 2 / this.zoom; },
    get right() { return this.x + G.W / 2 / this.zoom; },
    get top() { return this.y - G.H / 2 / this.zoom; },
    get bottom() { return this.y + G.H / 2 / this.zoom; },
    sees(x, y, r) { const hw = G.W / 2 / this.zoom + r, hh = G.H / 2 / this.zoom + r; return x > this.x - hw && x < this.x + hw && y > this.y - hh && y < this.y + hh; },
  };

  // ---------- sprite cache ----------
  const glowCache = new Map();
  G.glowSprite = function (color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = G.makeCanvas(128, 128);
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, G.css(color, 1)); g.addColorStop(0.12, G.css(color, 0.72)); g.addColorStop(0.3, G.css(color, 0.3));
    g.addColorStop(0.6, G.css(color, 0.08)); g.addColorStop(1, G.css(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
    return c;
  };
  // additive-friendly soft glow; caller sets composite mode
  G.drawGlow = function (ctx, x, y, r, color, a) {
    if (a <= 0.003 || r <= 0) return;
    ctx.globalAlpha = a > 1 ? 1 : a;
    ctx.drawImage(G.glowSprite(color), x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };
  // harder-edged light disc for the lightmap
  const lightCache = new Map();
  G.lightSprite = function (color) {
    let c = lightCache.get(color);
    if (c) return c;
    c = G.makeCanvas(128, 128);
    const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, G.css(color, 1)); g.addColorStop(0.35, G.css(color, 0.62)); g.addColorStop(0.7, G.css(color, 0.2)); g.addColorStop(1, G.css(color, 0));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    lightCache.set(color, c);
    return c;
  };
  G.spr = {};
  (function buildSprites() {
    // bubble: thin rim + highlight
    let c = G.makeCanvas(48, 48), x = c.getContext('2d');
    x.strokeStyle = 'rgba(220,245,255,0.85)'; x.lineWidth = 2.2; x.beginPath(); x.arc(24, 24, 19, 0, TAU); x.stroke();
    let g = x.createRadialGradient(24, 24, 4, 24, 24, 20); g.addColorStop(0, 'rgba(200,240,255,0)'); g.addColorStop(1, 'rgba(200,240,255,0.22)');
    x.fillStyle = g; x.beginPath(); x.arc(24, 24, 19, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.arc(24, 24, 13, PI * 1.15, PI * 1.45); x.stroke();
    G.spr.bubble = c;
    // soft dot
    c = G.makeCanvas(32, 32); x = c.getContext('2d');
    g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    G.spr.dot = c;
    // bokeh disc (flat with soft edge) for near-plane snow
    c = G.makeCanvas(48, 48); x = c.getContext('2d');
    g = x.createRadialGradient(24, 24, 0, 24, 24, 24); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.75, 'rgba(255,255,255,0.42)'); g.addColorStop(0.9, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 48, 48);
    G.spr.bokeh = c;
  })();

  // ---------- drawing helpers ----------
  G.rr = G.rr; // (keep rng alias from core)
  G.roundRect = function (ctx, x, y, w, h, r) {
    r = min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  };
  // smooth closed/open curve through points [x0,y0,x1,y1,...] using midpoint quadratics
  G.smoothPath = function (ctx, pts, closed) {
    const n = pts.length >> 1;
    if (n < 2) return;
    if (closed) {
      let mx = (pts[0] + pts[2 * n - 2]) / 2, my = (pts[1] + pts[2 * n - 1]) / 2;
      ctx.moveTo(mx, my);
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        ctx.quadraticCurveTo(pts[2 * i], pts[2 * i + 1], (pts[2 * i] + pts[2 * j]) / 2, (pts[2 * i + 1] + pts[2 * j + 1]) / 2);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(pts[2 * i], pts[2 * i + 1], (pts[2 * i] + pts[2 * i + 2]) / 2, (pts[2 * i + 1] + pts[2 * i + 3]) / 2);
      ctx.lineTo(pts[2 * n - 2], pts[2 * n - 1]);
    }
  };

  // ---------- text ----------
  G.FONT = {
    ui: '"Avenir Next", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, Menlo, "DejaVu Sans Mono", monospace',
    serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  };
  G.font = function (ctx, size, family, weight, italic) {
    ctx.font = (italic ? 'italic ' : '') + (weight || 400) + ' ' + size + 'px ' + (G.FONT[family || 'ui']);
  };
  // o: {size, font, weight, italic, color, align, alpha, base, spacing}
  G.text = function (ctx, str, x, y, o) {
    o = o || {};
    G.font(ctx, o.size || 16, o.font, o.weight, o.italic);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic';
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.spacing) {
      // manual tracking (letterSpacing isn't everywhere yet)
      let w = 0; const ws = [];
      for (const ch of str) { const cw = ctx.measureText(ch).width + o.spacing; ws.push(cw); w += cw; }
      w -= o.spacing;
      let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      ctx.textAlign = 'left';
      let i = 0;
      if (o.shadow) { ctx.fillStyle = o.shadow; let sx = cx; for (const ch of str) { ctx.fillText(ch, sx + 1, y + 1.5); sx += ws[i++]; } i = 0; }
      ctx.fillStyle = o.color || '#fff';
      for (const ch of str) { ctx.fillText(ch, cx, y); cx += ws[i++]; }
    } else {
      if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillText(str, x + 1, y + 1.5); }
      ctx.fillStyle = o.color || '#fff';
      ctx.fillText(str, x, y);
    }
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
  };
  G.textWidth = function (ctx, str, o) {
    G.font(ctx, o.size || 16, o.font, o.weight, o.italic);
    let w = ctx.measureText(str).width;
    if (o.spacing) w += o.spacing * (str.length - 1);
    return w;
  };
  const wrapCache = new Map();
  G.wrap = G.wrap; // numeric wrap lives in core; text wrapping is wrapText
  G.wrapText = function (ctx, str, maxW, o) {
    const key = (o.size || 16) + '|' + (o.font || 'ui') + '|' + (o.weight || 400) + '|' + (o.italic ? 1 : 0) + '|' + maxW + '|' + str;
    let lines = wrapCache.get(key);
    if (lines) return lines;
    G.font(ctx, o.size || 16, o.font, o.weight, o.italic);
    lines = [];
    for (const para of str.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
      }
      lines.push(line);
    }
    if (wrapCache.size > 600) wrapCache.clear();
    wrapCache.set(key, lines);
    return lines;
  };
  // draws wrapped text; returns height used. o.lh = line height, o.reveal = max chars to show
  G.para = function (ctx, str, x, y, maxW, o) {
    const lines = G.wrapText(ctx, str, maxW, o), lh = o.lh || (o.size || 16) * 1.4;
    let left = o.reveal === undefined ? Infinity : o.reveal;
    for (let i = 0; i < lines.length && left > 0; i++) {
      const ln = lines[i].length > left ? lines[i].slice(0, left) : lines[i];
      G.text(ctx, ln, x, y + i * lh, o);
      left -= lines[i].length + 1;
    }
    return lines.length * lh;
  };

  // ---------- "Sounding" — the stroke display face. Glyphs live in a 4x6 box, drawn as round-capped lines. ----------
  const GLYPHS = {
    A: 'M0 6L2 0L4 6M1 4.1L3 4.1', B: 'M0 6L0 0L2.4 0Q4 0 4 1.5Q4 3 2.4 3L0 3M2.4 3Q4 3 4 4.5Q4 6 2.4 6L0 6',
    C: 'M4 1.2Q4 0 2.5 0L2 0Q0 0 0 2L0 4Q0 6 2 6L2.5 6Q4 6 4 4.8', D: 'M0 0L0 6L2 6Q4 6 4 4L4 2Q4 0 2 0L0 0',
    E: 'M4 0L0 0L0 6L4 6M0 3L3 3', F: 'M4 0L0 0L0 6M0 3L3 3',
    G: 'M4 1.2Q4 0 2.5 0L2 0Q0 0 0 2L0 4Q0 6 2 6L2.5 6Q4 6 4 4.6L4 3.3L2.4 3.3', H: 'M0 0L0 6M4 0L4 6M0 3L4 3',
    I: 'M1 0L1 6', J: 'M3.4 0L3.4 4.4Q3.4 6 1.9 6L1.5 6Q0 6 0 4.5', K: 'M0 0L0 6M4 0L0 3.4M1.3 2.3L4 6', L: 'M0 0L0 6L3.8 6',
    M: 'M0 6L0 0L2.25 3.6L4.5 0L4.5 6', N: 'M0 6L0 0L4 6L4 0', O: 'M2 0Q0 0 0 2L0 4Q0 6 2 6Q4 6 4 4L4 2Q4 0 2 0',
    P: 'M0 6L0 0L2.4 0Q4 0 4 1.65Q4 3.3 2.4 3.3L0 3.3', Q: 'M2 0Q0 0 0 2L0 4Q0 6 2 6Q4 6 4 4L4 2Q4 0 2 0M2.6 4.4L4.2 6.2',
    R: 'M0 6L0 0L2.4 0Q4 0 4 1.65Q4 3.3 2.4 3.3L0 3.3M2.1 3.3L4 6',
    S: 'M4 1.1Q4 0 2.6 0L1.5 0Q0 0 0 1.5Q0 3 1.5 3L2.5 3Q4 3 4 4.5Q4 6 2.5 6L1.4 6Q0 6 0 4.9', T: 'M0 0L4 0M2 0L2 6',
    U: 'M0 0L0 4Q0 6 2 6Q4 6 4 4L4 0', V: 'M0 0L2 6L4 0', W: 'M0 0L1.2 6L2.5 2L3.8 6L5 0', X: 'M0 0L4 6M4 0L0 6',
    Y: 'M0 0L2 3.1L4 0M2 3.1L2 6', Z: 'M0 0L4 0L0 6L4 6',
    0: 'M2 0Q0 0 0 2L0 4Q0 6 2 6Q4 6 4 4L4 2Q4 0 2 0M1.3 4.2L2.7 1.8', 1: 'M0.4 1.3L1.6 0L1.6 6', 2: 'M0 1.5Q0 0 2 0Q4 0 4 1.6Q4 2.9 2.2 3.9L0 6L4 6',
    3: 'M0 0.9Q0.5 0 2 0Q4 0 4 1.5Q4 3 2 3Q4 3 4 4.5Q4 6 2 6Q0.5 6 0 5.1', 4: 'M3 6L3 0L0 4.2L4 4.2',
    5: 'M3.8 0L0.4 0L0.1 2.7Q0.9 2.2 2 2.2Q4 2.2 4 4.1Q4 6 2 6Q0.6 6 0 5', 6: 'M3.5 0.5Q3 0 2 0Q0 0 0 2.4L0 4.1Q0 6 2 6Q4 6 4 4.3Q4 2.7 2 2.7Q0.6 2.7 0 3.7',
    7: 'M0 0L4 0L1.5 6', 8: 'M2 0Q0.3 0 0.3 1.5Q0.3 3 2 3Q3.7 3 3.7 1.5Q3.7 0 2 0M2 3Q0 3 0 4.5Q0 6 2 6Q4 6 4 4.5Q4 3 2 3',
    9: 'M0.5 5.5Q1 6 2 6Q4 6 4 3.6L4 1.9Q4 0 2 0Q0 0 0 1.7Q0 3.3 2 3.3Q3.4 3.3 4 2.3',
    '-': 'M0.6 3L3 3', '.': 'M0.6 5.9L0.6 6', ',': 'M0.8 5.6L0.4 6.8', ':': 'M0.6 2L0.6 2.1M0.6 5.3L0.6 5.4', "'": 'M0.6 0L0.4 1.2',
    '!': 'M0.6 0L0.6 4M0.6 5.9L0.6 6', '?': 'M0 1.4Q0 0 1.8 0Q3.6 0 3.6 1.5Q3.6 2.7 1.8 3.2L1.8 4.1M1.8 5.9L1.8 6', '/': 'M0 6L3 0',
    '+': 'M0.4 3L3.2 3M1.8 1.6L1.8 4.4', '~': 'M0 3.3Q1 2 2 3Q3 4 4 2.7', '>': 'M0.4 1.4L3 3L0.4 4.6', '<': 'M3 1.4L0.4 3L3 4.6',
    '%': 'M0 6L4 0M0.9 0.4L0.9 1.2M3.1 4.8L3.1 5.6', '&': 'M4 6L1 1.8Q0.6 0 2 0Q3.2 0 3 1.4Q2.8 2.4 0.6 3.6Q-0.4 4.6 0.6 5.6Q2 6.6 4 3.6',
  };
  const GW = { I: 2, '1': 2.2, M: 4.5, W: 5, '.': 1.2, ',': 1.2, ':': 1.2, "'": 1.2, '!': 1.2, ' ': 2.4, '-': 3.6, L: 3.8, '/': 3, '+': 3.6, '>': 3.4, '<': 3.4 };
  const glyphCmds = {};
  for (const ch in GLYPHS) {
    const src = GLYPHS[ch], cmds = [];
    const re = /([MLQ])([^MLQ]*)/g; let m;
    while ((m = re.exec(src))) cmds.push(m[1], ...m[2].trim().split(/\s+/).map(Number));
    glyphCmds[ch] = cmds;
  }
  G.stextWidth = function (str, size, spacing) {
    const k = size / 6, sp = spacing === undefined ? 1.7 : spacing;
    let w = 0;
    for (const ch of str) w += ((GW[ch] !== undefined ? GW[ch] : 4) + sp) * k;
    return w - sp * k;
  };
  // o: {align, color, lw, alpha, spacing, reveal (0..n letters, fractional fades), glow}
  G.stext = function (ctx, str, x, y, size, o) {
    o = o || {};
    str = str.toUpperCase();
    const k = size / 6, sp = o.spacing === undefined ? 1.7 : o.spacing;
    const w = G.stextWidth(str, size, sp);
    let cx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    const baseA = o.alpha === undefined ? 1 : o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = o.color || '#fff';
    ctx.lineWidth = o.lw || max(1.2, size * 0.09);
    let idx = 0;
    for (const ch of str) {
      const cmds = glyphCmds[ch];
      let a = baseA;
      if (o.reveal !== undefined) a *= G.clamp01(o.reveal - idx);
      if (cmds && a > 0.004) {
        const rise = o.reveal !== undefined ? (1 - G.clamp01(o.reveal - idx)) * size * 0.25 : 0;
        ctx.globalAlpha = a;
        ctx.beginPath();
        for (let i = 0; i < cmds.length;) {
          const c = cmds[i++];
          if (c === 'M') { ctx.moveTo(cx + cmds[i] * k, y + cmds[i + 1] * k + rise); i += 2; }
          else if (c === 'L') { ctx.lineTo(cx + cmds[i] * k, y + cmds[i + 1] * k + rise); i += 2; }
          else { ctx.quadraticCurveTo(cx + cmds[i] * k, y + cmds[i + 1] * k + rise, cx + cmds[i + 2] * k, y + cmds[i + 3] * k + rise); i += 4; }
        }
        ctx.stroke();
      }
      cx += ((GW[ch] !== undefined ? GW[ch] : 4) + sp) * k;
      idx++;
    }
    ctx.globalAlpha = 1;
    return w;
  };

  // ---------- screen fx state (read by the post shader) ----------
  const fx = G.fx = {
    flash: 0, aberr: 0, danger: 0, sat: 1, tint: [1, 1, 1], distort: 1, bloom: 0.3, bloomThr: 0.6, vig: 1, blur: 0,
    waves: [],
    wave(x, y, o) {   // world-space shockwave ring
      o = o || {};
      if (this.waves.length >= 4) this.waves.shift();
      this.waves.push({ x, y, r: o.r0 || 0, speed: o.speed || 700, maxR: o.maxR || 600, str: o.str || 1 });
    },
    punch(aberr, flash) { this.aberr = max(this.aberr, aberr || 0); if (flash && G.settings.flashes) this.flash = max(this.flash, flash); },
    update(dt) {
      this.flash = max(0, this.flash - dt * 3.2);
      this.aberr = max(0, this.aberr - dt * 2.4);
      for (let i = this.waves.length - 1; i >= 0; i--) { const w = this.waves[i]; w.r += w.speed * dt; if (w.r > w.maxR) this.waves.splice(i, 1); }
    },
  };

  // ---------- WebGL post ----------
  const VS = `#version 300 es
in vec2 p; out vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
  const FS_BRIGHT = `#version 300 es
precision mediump float; in vec2 uv; out vec4 o; uniform sampler2D t; uniform vec2 px; uniform float thr;
void main(){
  vec3 c = texture(t, uv + px*vec2(-.5,-.5)).rgb + texture(t, uv + px*vec2(.5,-.5)).rgb + texture(t, uv + px*vec2(-.5,.5)).rgb + texture(t, uv + px*vec2(.5,.5)).rgb;
  c *= .25; float l = max(c.r, max(c.g, c.b))*.6 + dot(c, vec3(.299,.587,.114))*.4; float k = smoothstep(thr, thr + .2, l);
  o = vec4(c*k, 1.);
}`;
  const FS_DOWN = `#version 300 es
precision mediump float; in vec2 uv; out vec4 o; uniform sampler2D t; uniform vec2 px;
void main(){
  vec4 s = texture(t, uv)*4.;
  s += texture(t, uv - px); s += texture(t, uv + px); s += texture(t, uv + vec2(px.x,-px.y)); s += texture(t, uv - vec2(px.x,-px.y));
  o = s/8.;
}`;
  const FS_UP = `#version 300 es
precision mediump float; in vec2 uv; out vec4 o; uniform sampler2D t; uniform vec2 px; uniform float amt;
void main(){
  vec4 s = texture(t, uv + vec2(-px.x*2.,0.)); s += texture(t, uv + vec2(-px.x,px.y))*2.; s += texture(t, uv + vec2(0.,px.y*2.));
  s += texture(t, uv + vec2(px.x,px.y))*2.; s += texture(t, uv + vec2(px.x*2.,0.)); s += texture(t, uv + vec2(px.x,-px.y))*2.;
  s += texture(t, uv + vec2(0.,-px.y*2.)); s += texture(t, uv + vec2(-px.x,-px.y))*2.;
  o = s/12.*amt;
}`;
  const FS_FINAL = `#version 300 es
precision highp float; in vec2 uv; out vec4 o;
uniform sampler2D scene; uniform sampler2D bloom;
uniform float time, aberr, bloomAmt, grain, vig, distort, flash, sat, danger, blurAmt;
uniform vec3 tint; uniform vec2 res; uniform vec4 waves[4];
float hash(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
void main(){
  vec2 p = uv;
  float asp = res.x/res.y;
  // slow water wobble
  p += vec2(sin(p.y*17. + time*1.25) + sin(p.y*7.3 - time*.71), cos(p.x*13. + time*1.07) + sin(p.x*5.7 + time*.53)) * distort * .00055;
  // shockwave rings
  for (int i = 0; i < 4; i++){
    vec4 s = waves[i];
    if (s.w > 0.){
      vec2 d = p - s.xy; d.x *= asp; float l = length(d) + 1e-5;
      float k = (l - s.z)/.045; float ring = exp(-k*k);
      p += (d/l) * ring * s.w * .022 * vec2(1./asp, 1.);
    }
  }
  vec2 c = p - .5; float r2 = dot(c, c);
  vec2 off = c * (aberr * (.35 + r2*2.2));
  vec3 col;
  col.r = texture(scene, p + off).r; col.g = texture(scene, p).g; col.b = texture(scene, p - off).b;
  vec3 bl = texture(bloom, p).rgb;
  col = mix(col, bl*1.6, blurAmt);
  col += bl * bloomAmt;
  float l = dot(col, vec3(.299,.587,.114));
  col = mix(vec3(l), col, sat) * tint;
  col = mix(col, col*col*(3. - 2.*col), .18);
  float v = smoothstep(1.02, .28, length(c*vec2(1., .82))*1.18);
  col *= mix(1., v, vig);
  float edge = smoothstep(.25, .75, length(c*vec2(.9, 1.)));
  col = mix(col, vec3(col.r*1.25 + .1, col.g*.45, col.b*.45), danger*edge);
  col += (hash(floor(uv*res) + floor(fract(time*7.)*97.)*vec2(13., 7.)) - .5) * grain;
  col += flash;
  o = vec4(col, 1.);
}`;

  const post = G.post = {
    ok: false, gl: null, enabled: true, levels: [], w: 0, h: 0, ctx2d: null,
    init() {
      let gl = null;
      if (!G.params.nofx) {
        try { gl = viewC.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
      }
      if (!gl) { this.fallback(); return; }
      this.gl = gl;
      try {
        this.pBright = this.prog(FS_BRIGHT); this.pDown = this.prog(FS_DOWN); this.pUp = this.prog(FS_UP); this.pFinal = this.prog(FS_FINAL);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        this.sceneTex = this.tex();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.disable(gl.DEPTH_TEST);
        this.ok = true;
        viewC.addEventListener('webglcontextlost', e => { e.preventDefault(); this.ok = false; this.lost = true; });
        viewC.addEventListener('webglcontextrestored', () => { this.lost = false; this.levels = []; this.init(); this.resize(G.sceneC.width, G.sceneC.height); });
      } catch (e) {
        console.warn('post fx unavailable:', e);
        this.replaceCanvas(); this.fallback();
      }
    },
    replaceCanvas() {
      const n = document.createElement('canvas'); n.id = 'view';
      n.width = viewC.width; n.height = viewC.height; n.style.cssText = viewC.style.cssText;
      viewC.parentNode.replaceChild(n, viewC); viewC = n;
    },
    fallback() { this.ok = false; this.gl = null; this.ctx2d = viewC.getContext('2d', { alpha: false }); },
    // called when the graphics setting changes: 'low' draws straight to a 2D canvas, the others need GL back
    applyQuality() {
      if (G.settings.gfx === 'low' || this.ok || G.params.nofx) return;
      this.replaceCanvas(); this.ctx2d = null; this.levels = []; this.gl = null;
      this.init(); this.resize(G.sceneC.width, G.sceneC.height);
    },
    prog(fs) {
      const gl = this.gl, p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace('[0]', ''); u[name] = gl.getUniformLocation(p, info.name); }
      return { p, u };
    },
    tex() {
      const gl = this.gl, t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    },
    resize(w, h) {
      this.w = w; this.h = h;
      if (!this.ok) return;
      const gl = this.gl;
      for (const L of this.levels) { gl.deleteTexture(L.tex); gl.deleteFramebuffer(L.fbo); }
      this.levels = [];
      let lw = w, lh = h;
      for (let i = 0; i < 5; i++) {
        lw = max(2, lw >> 1); lh = max(2, lh >> 1);
        const tex = this.tex();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, lw, lh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        this.levels.push({ tex, fbo, w: lw, h: lh });
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },
    pass(prog, srcTex, dst, w, h) {
      const gl = this.gl;
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst);
      gl.viewport(0, 0, w, h);
      gl.useProgram(prog.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform1i(prog.u.t, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    render(src) {
      const useGL = this.ok && G.settings.gfx !== 'low';
      if (!useGL) {
        if (!this.ctx2d) {
          if (this.gl) { this.replaceCanvas(); }
          this.fallback();
        }
        this.ctx2d.drawImage(src, 0, 0, viewC.width, viewC.height);
        // cheap stand-ins for flash + danger so low mode still reads
        if (fx.flash > 0.01) { this.ctx2d.fillStyle = `rgba(255,255,255,${min(0.8, fx.flash)})`; this.ctx2d.fillRect(0, 0, viewC.width, viewC.height); }
        return;
      }
      const gl = this.gl, L = this.levels, w = this.w, h = this.h;
      gl.bindVertexArray(this.vao);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.disable(gl.BLEND);
      // bright pass -> L0
      gl.useProgram(this.pBright.p);
      gl.uniform2f(this.pBright.u.px, 1 / w, 1 / h); gl.uniform1f(this.pBright.u.thr, fx.bloomThr);
      this.pass(this.pBright, this.sceneTex, L[0].fbo, L[0].w, L[0].h);
      // down chain
      for (let i = 1; i < L.length; i++) {
        gl.useProgram(this.pDown.p); gl.uniform2f(this.pDown.u.px, 1 / L[i - 1].w, 1 / L[i - 1].h);
        this.pass(this.pDown, L[i - 1].tex, L[i].fbo, L[i].w, L[i].h);
      }
      // up chain, additive
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = L.length - 1; i > 0; i--) {
        gl.useProgram(this.pUp.p); gl.uniform2f(this.pUp.u.px, 0.5 / L[i].w, 0.5 / L[i].h); gl.uniform1f(this.pUp.u.amt, 0.9);
        this.pass(this.pUp, L[i].tex, L[i - 1].fbo, L[i - 1].w, L[i - 1].h);
      }
      gl.disable(gl.BLEND);
      // final
      const P = this.pFinal, u = P.u;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneTex); gl.uniform1i(u.scene, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, L[0].tex); gl.uniform1i(u.bloom, 1);
      const med = G.settings.gfx === 'medium';
      gl.uniform1f(u.time, G.time % 1000);
      gl.uniform1f(u.aberr, 0.0016 + fx.aberr * 0.02);
      gl.uniform1f(u.bloomAmt, fx.bloom);
      gl.uniform1f(u.grain, 0.035);
      gl.uniform1f(u.vig, 0.85 * fx.vig);
      gl.uniform1f(u.distort, med ? 0 : fx.distort);
      gl.uniform1f(u.flash, fx.flash);
      gl.uniform1f(u.sat, fx.sat);
      gl.uniform1f(u.danger, fx.danger);
      gl.uniform1f(u.blurAmt, fx.blur);
      gl.uniform3f(u.tint, fx.tint[0], fx.tint[1], fx.tint[2]);
      gl.uniform2f(u.res, w, h);
      const wv = this.wv || (this.wv = new Float32Array(16));
      const asp = G.W / G.H;
      for (let i = 0; i < 4; i++) {
        const s = fx.waves[i];
        if (s) {
          const life = 1 - s.r / s.maxR;
          wv[i * 4] = cam.toScreenX(s.x) / G.W; wv[i * 4 + 1] = 1 - cam.toScreenY(s.y) / G.H;
          wv[i * 4 + 2] = s.r * cam.zoom / G.H; wv[i * 4 + 3] = s.str * life * (med ? 0.5 : 1);
        } else wv[i * 4 + 3] = 0;
      }
      gl.uniform4fv(u.waves, wv);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.activeTexture(gl.TEXTURE0);
    },
  };
})();
