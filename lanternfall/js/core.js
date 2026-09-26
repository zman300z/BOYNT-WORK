'use strict';
// ============================================================================
// LANTERNFALL — core: namespace, math, RNG, colors, input, storage
// ============================================================================
(function () {
  const G = (window.G = window.G || {});
  G.W = 640;
  G.H = 360;
  G.TS = 16;
  G.DT = 1 / 60;
  G.time = 0; // total seconds of simulated game time
  G.frame = 0;

  // ---------------------------------------------------------------- math
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
  G.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  G.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  G.angleTo = (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1);
  G.wrapAngle = (a) => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  G.overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  G.rectsOverlap = (x1, y1, w1, h1, x2, y2, w2, h2) => x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  G.ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inCubic: (t) => t * t * t,
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  };
  G.fmtTime = (s) => {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  };
  G.fmtNum = (n) => {
    n = Math.round(n);
    if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return '' + n;
  };
  G.roman = (n) => ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || '' + n;

  // ---------------------------------------------------------------- RNG
  class RNG {
    constructor(seed) {
      this.s = seed >>> 0 || 0x9e3779b9;
    }
    next() {
      let t = (this.s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(a, b) {
      return a + (b - a) * this.next();
    }
    int(a, b) {
      return a + Math.floor(this.next() * (b - a + 1));
    }
    chance(p) {
      return this.next() < p;
    }
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    }
    sign() {
      return this.next() < 0.5 ? -1 : 1;
    }
    weighted(items, wf) {
      let tot = 0;
      for (const it of items) tot += Math.max(0, wf(it));
      if (tot <= 0) return items[0];
      let r = this.next() * tot;
      for (const it of items) {
        r -= Math.max(0, wf(it));
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    }
    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
      }
      return a;
    }
  }
  G.RNG = RNG;
  G.rng = new RNG((Math.random() * 4294967295) >>> 0);
  G.rnd = (a, b) => (b === undefined ? G.rng.next() * a : a + G.rng.next() * (b - a));
  G.hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 2246822519) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // ---------------------------------------------------------------- colors
  const hexCache = new Map();
  G.hexToRgb = (hex) => {
    let c = hexCache.get(hex);
    if (c) return c;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache.set(hex, c);
    return c;
  };
  const to2 = (v) => {
    v = G.clamp(Math.round(v), 0, 255).toString(16);
    return v.length < 2 ? '0' + v : v;
  };
  G.rgbToHex = (r, g, b) => '#' + to2(r) + to2(g) + to2(b);
  G.mix = (a, b, t) => {
    const A = G.hexToRgb(a), B = G.hexToRgb(b);
    return G.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  G.shade = (hex, amt) => (amt >= 0 ? G.mix(hex, '#ffffff', amt) : G.mix(hex, '#000000', -amt));
  G.rgba = (hex, a) => {
    const c = G.hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  };

  // stat colors (scroll colors)
  G.STAT_COLORS = { fury: '#e8483c', cunning: '#a55cf0', vigor: '#4fcf5a', none: '#c8c8c8' };
  G.STAT_NAMES = { fury: 'Fury', cunning: 'Cunning', vigor: 'Vigor' };
  G.QUALITY_COLORS = ['#d8d8d8', '#6fd46f', '#58a8ff', '#ffb43c'];
  G.QUALITY_NAMES = ['', 'Fine', 'Superior', 'Legendary'];

  // ---------------------------------------------------------------- storage
  G.store = {
    get(key, def) {
      try {
        const v = localStorage.getItem('lanternfall.' + key);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem('lanternfall.' + key, JSON.stringify(val));
      } catch (e) {}
    },
    del(key) {
      try {
        localStorage.removeItem('lanternfall.' + key);
      } catch (e) {}
    },
  };

  // ---------------------------------------------------------------- input
  const DEFAULT_BINDS = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    jump: ['Space', 'KeyZ'],
    attack1: ['KeyJ', 'KeyX', 'Mouse0'],
    attack2: ['KeyK', 'KeyC', 'Mouse2'],
    roll: ['KeyL', 'ShiftLeft', 'ShiftRight'],
    skill1: ['KeyQ', 'KeyU'],
    skill2: ['KeyE', 'KeyI'],
    interact: ['KeyF', 'KeyV'],
    heal: ['KeyR', 'KeyH'],
    map: ['KeyM', 'Tab'],
    pause: ['Escape', 'KeyP'],
    confirm: ['Enter', 'Space', 'KeyJ', 'KeyF', 'KeyX'],
    cancel: ['Escape', 'Backspace', 'KeyK', 'KeyC'],
    mleft: ['ArrowLeft', 'KeyA'],
    mright: ['ArrowRight', 'KeyD'],
    mup: ['ArrowUp', 'KeyW'],
    mdown: ['ArrowDown', 'KeyS'],
    tabL: ['KeyQ', 'PageUp'],
    tabR: ['KeyE', 'PageDown'],
  };
  // standard gamepad mapping
  const PAD_BINDS = {
    jump: [0],
    roll: [1],
    attack1: [2],
    attack2: [3],
    heal: [4],
    interact: [5],
    skill1: [6],
    skill2: [7],
    map: [8],
    pause: [9],
    up: [12],
    down: [13],
    left: [14],
    right: [15],
    confirm: [0],
    cancel: [1],
    mup: [12],
    mdown: [13],
    mleft: [14],
    mright: [15],
    tabL: [4],
    tabR: [5],
  };
  const Input = (G.Input = {
    binds: DEFAULT_BINDS,
    keys: Object.create(null),
    latched: Object.create(null), // codes pressed since last poll
    down: Object.create(null),
    pressed: Object.create(null),
    released: Object.create(null),
    prev: Object.create(null),
    device: 'kb',
    anyKeyLatched: false,
    anyPressed: false,
    padIndex: -1,
    padPrev: [],
    axisX: 0,
    axisY: 0,
    mouse: { x: 0, y: 0, moved: false },
    init(canvas) {
      const prevent = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Tab', 'Backspace']);
      window.addEventListener('keydown', (e) => {
        if (prevent.has(e.code)) e.preventDefault();
        if (!e.repeat) {
          this.latched[e.code] = true;
          this.anyKeyLatched = true;
        }
        this.keys[e.code] = true;
        this.device = 'kb';
        if (G.Audio) G.Audio.unlock();
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });
      window.addEventListener('blur', () => {
        this.keys = Object.create(null);
      });
      canvas.addEventListener('mousedown', (e) => {
        const c = 'Mouse' + e.button;
        this.keys[c] = true;
        this.latched[c] = true;
        this.anyKeyLatched = true;
        this.device = 'kb';
        if (G.Audio) G.Audio.unlock();
        e.preventDefault();
      });
      window.addEventListener('mouseup', (e) => {
        this.keys['Mouse' + e.button] = false;
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - r.left) / r.width) * G.W;
        this.mouse.y = ((e.clientY - r.top) / r.height) * G.H;
        this.mouse.moved = true;
      });
      window.addEventListener('gamepadconnected', (e) => {
        this.padIndex = e.gamepad.index;
      });
      // touch: tap anywhere counts as confirm on menus (basic)
      canvas.addEventListener('touchstart', () => {
        this.latched['Enter'] = true;
        this.anyKeyLatched = true;
        if (G.Audio) G.Audio.unlock();
      }, { passive: true });
    },
    poll() {
      // gamepad
      let pad = null;
      if (navigator.getGamepads) {
        const pads = navigator.getGamepads();
        if (this.padIndex >= 0 && pads[this.padIndex]) pad = pads[this.padIndex];
        else for (const p of pads) if (p) { pad = p; this.padIndex = p.index; break; }
      }
      const padDown = [];
      this.axisX = 0;
      this.axisY = 0;
      if (pad) {
        for (let i = 0; i < pad.buttons.length; i++) {
          const b = pad.buttons[i];
          padDown[i] = b && (b.pressed || b.value > 0.5);
          if (padDown[i] && !this.padPrev[i]) {
            this.device = 'gp';
            this.anyKeyLatched = true;
            if (G.Audio) G.Audio.unlock();
          }
        }
        const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
        if (Math.abs(ax) > 0.35) { this.axisX = ax; this.device = 'gp'; }
        if (Math.abs(ay) > 0.45) { this.axisY = ay; this.device = 'gp'; }
      }
      const padPrev = this.padPrev;
      for (const act in this.binds) {
        let now = false, latch = false;
        for (const code of this.binds[act]) {
          if (this.keys[code]) now = true;
          if (this.latched[code]) latch = true;
        }
        const pb = PAD_BINDS[act];
        if (pb) for (const bi of pb) {
          if (padDown[bi]) now = true;
          if (padDown[bi] && !padPrev[bi]) latch = true;
        }
        if (act === 'left' || act === 'mleft') { if (this.axisX < -0.35) now = true; }
        if (act === 'right' || act === 'mright') { if (this.axisX > 0.35) now = true; }
        if (act === 'up' || act === 'mup') { if (this.axisY < -0.45) now = true; }
        if (act === 'down' || act === 'mdown') { if (this.axisY > 0.45) now = true; }
        const was = this.prev[act] || false;
        this.pressed[act] = (now && !was) || (latch && !was) || (latch && now === false);
        this.released[act] = !now && was;
        this.down[act] = now || latch;
        this.prev[act] = now;
      }
      this.anyPressed = this.anyKeyLatched;
      this.anyKeyLatched = false;
      this.latched = Object.create(null);
      this.padPrev = padDown;
    },
    consume(act) {
      this.pressed[act] = false;
    },
    clearAll() {
      for (const k in this.pressed) this.pressed[k] = false;
      this.anyPressed = false;
    },
    // pretty key names for prompts
    keyName(act) {
      if (this.device === 'gp') {
        const names = { jump: 'A', roll: 'B', attack1: 'X', attack2: 'Y', heal: 'LB', interact: 'RB', skill1: 'LT', skill2: 'RT', map: 'SELECT', pause: 'START', confirm: 'A', cancel: 'B', up: 'UP', down: 'DOWN' };
        return names[act] || act;
      }
      const code = this.binds[act] && this.binds[act][0];
      if (!code) return '?';
      if (code.startsWith('Key')) return code.slice(3);
      if (code === 'Space') return 'SPACE';
      if (code.startsWith('Arrow')) return code.slice(5).toUpperCase();
      if (code.startsWith('Shift')) return 'SHIFT';
      if (code === 'Escape') return 'ESC';
      return code.toUpperCase();
    },
  });
})();
