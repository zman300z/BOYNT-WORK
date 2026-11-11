'use strict';
/* UNDERSONG — core: namespace, math, rng, noise, colour, tweens, events.
   Every other file is an IIFE that reads what it needs off the single global `G`. */
const G = {};
window.G = G;

(function () {
  const { sin, cos, abs, min, max, floor, sqrt, atan2, PI, exp, pow } = Math;

  G.W = 1280;            // logical view size; everything is authored against this
  G.H = 720;
  G.TAU = PI * 2;
  G.time = 0;            // real seconds since boot
  G.dt = 0;              // scaled frame delta (gameplay)
  G.rdt = 0;             // real frame delta (ui, tweens)
  G.debug = false;

  // ---------- math ----------
  G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  G.clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.invLerp = (a, b, v) => (v - a) / (b - a);
  G.remap = (v, a, b, c, d) => c + (d - c) * G.clamp01((v - a) / (b - a));
  G.smoothstep = (a, b, v) => { const t = G.clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  G.damp = (a, b, lambda, dt) => a + (b - a) * (1 - exp(-lambda * dt));
  G.dist = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return sqrt(dx * dx + dy * dy); };
  G.dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
  G.angDiff = (a, b) => { let d = (b - a) % G.TAU; if (d > PI) d -= G.TAU; else if (d < -PI) d += G.TAU; return d; };
  G.angLerp = (a, b, t) => a + G.angDiff(a, b) * t;
  G.angDamp = (a, b, lambda, dt) => a + G.angDiff(a, b) * (1 - exp(-lambda * dt));
  G.sign = v => v < 0 ? -1 : 1;
  G.approach = (v, target, step) => v < target ? min(v + step, target) : max(v - step, target);
  G.wrap = (v, m) => ((v % m) + m) % m;

  // ---------- easing ----------
  G.ease = {
    lin: t => t,
    inQuad: t => t * t,
    outQuad: t => 1 - (1 - t) * (1 - t),
    inOutQuad: t => t < 0.5 ? 2 * t * t : 1 - pow(-2 * t + 2, 2) / 2,
    inCubic: t => t * t * t,
    outCubic: t => 1 - pow(1 - t, 3),
    inOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2,
    outQuint: t => 1 - pow(1 - t, 5),
    outExpo: t => t >= 1 ? 1 : 1 - pow(2, -10 * t),
    inOutSine: t => -(cos(PI * t) - 1) / 2,
    outBack: t => { const c = 1.70158; return 1 + (c + 1) * pow(t - 1, 3) + c * pow(t - 1, 2); },
    inBack: t => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
    outElastic: t => t <= 0 ? 0 : t >= 1 ? 1 : pow(2, -10 * t) * sin((t * 10 - 0.75) * (G.TAU / 3)) + 1,
    outBounce: t => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };

  // ---------- seeded rng (mulberry32) ----------
  G.RNG = function (seed) {
    let s = seed >>> 0;
    const r = function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (a, b) => a + (b - a) * r();
    r.int = (a, b) => a + floor(r() * (b - a + 1));
    r.pick = arr => arr[floor(r() * arr.length)];
    r.chance = p => r() < p;
    r.sign = () => r() < 0.5 ? -1 : 1;
    r.ang = () => r() * G.TAU;
    r.shuffle = arr => {
      for (let i = arr.length - 1; i > 0; i--) { const j = floor(r() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    };
    // weighted pick: items [{w:..}, ...] or parallel weights
    r.weighted = (items, wf) => {
      let total = 0;
      for (let i = 0; i < items.length; i++) total += wf(items[i]);
      let v = r() * total;
      for (let i = 0; i < items.length; i++) { v -= wf(items[i]); if (v <= 0) return items[i]; }
      return items[items.length - 1];
    };
    return r;
  };
  G.rand = G.RNG((Math.random() * 4294967296) >>> 0);   // free-running, for effects
  G.rr = (a, b) => G.rand.range(a, b);

  // ---------- hashing + value noise ----------
  function hash2(x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  G.hash2 = hash2;
  G.hash1 = (x, s) => hash2(x, 7919, s);
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

  G.noise2 = function (x, y, s) {
    const ix = floor(x), iy = floor(y);
    const fx = fade(x - ix), fy = fade(y - iy);
    const a = hash2(ix, iy, s), b = hash2(ix + 1, iy, s), c = hash2(ix, iy + 1, s), d = hash2(ix + 1, iy + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  G.fbm = function (x, y, oct, s) {
    let v = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { v += G.noise2(x * f, y * f, s + i * 131) * amp; norm += amp; amp *= 0.5; f *= 2; }
    return v / norm;
  };
  // 1D smooth noise for wobble / shake, -1..1
  G.wobble = (t, s) => G.noise2(t, s * 17.13, s | 0) * 2 - 1;

  // Tiling fbm texture, values 0..1. `cells` = lattice period of the first octave.
  G.makeNoiseTex = function (size, cells, seed, octaves) {
    const out = new Float32Array(size * size);
    let amp = 0.5, norm = 0, per = cells;
    for (let o = 0; o < octaves; o++) {
      const sc = per / size, sd = seed + o * 977;
      for (let y = 0; y < size; y++) {
        const fy0 = y * sc, iy = floor(fy0), ty = fade(fy0 - iy);
        const y0 = iy % per, y1 = (iy + 1) % per;
        for (let x = 0; x < size; x++) {
          const fx0 = x * sc, ix = floor(fx0), tx = fade(fx0 - ix);
          const x0 = ix % per, x1 = (ix + 1) % per;
          const a = hash2(x0, y0, sd), b = hash2(x1, y0, sd), c = hash2(x0, y1, sd), d = hash2(x1, y1, sd);
          out[y * size + x] += (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty) * amp;
        }
      }
      norm += amp; amp *= 0.5; per *= 2;
    }
    for (let i = 0; i < out.length; i++) out[i] /= norm;
    return out;
  };

  // ---------- colour ----------
  const colorCache = new Map();
  G.rgb = function (c) {           // '#rgb' | '#rrggbb' | 'rgb(r,g,b)' | [r,g,b] -> [r,g,b]
    if (typeof c !== 'string') return c;
    let v = colorCache.get(c);
    if (v) return v;
    if (c[0] === '#') {
      if (c.length === 4) v = [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16)];
      else v = [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    } else {
      const m = c.match(/[\d.]+/g);
      v = [+m[0], +m[1], +m[2]];
    }
    colorCache.set(c, v);
    return v;
  };
  G.css = (c, a) => {
    const v = G.rgb(c);
    return a === undefined || a >= 1 ? `rgb(${v[0] | 0},${v[1] | 0},${v[2] | 0})` : `rgba(${v[0] | 0},${v[1] | 0},${v[2] | 0},${a < 0 ? 0 : a})`;
  };
  G.mix = (c1, c2, t) => { const a = G.rgb(c1), b = G.rgb(c2); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  G.mixCss = (c1, c2, t, a) => G.css(G.mix(c1, c2, t), a);
  G.hsl = (h, s, l, a) => a === undefined ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a})`;

  // ---------- tweens & timers (real time; used by UI and one-off animation) ----------
  const tweens = [];
  G.tween = function (obj, to, dur, ease, delay, done) {
    const tw = { obj, to, from: null, dur: max(dur, 0.0001), ease: ease || G.ease.outCubic, t: -(delay || 0), done, dead: false };
    tweens.push(tw);
    return tw;
  };
  G.killTweens = obj => { for (const tw of tweens) if (tw.obj === obj) tw.dead = true; };
  const timers = [];
  G.after = (sec, fn) => { const tm = { t: sec, fn, dead: false }; timers.push(tm); return tm; };
  G.updateTweens = function (dt) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      if (tw.dead) { tweens.splice(i, 1); continue; }
      tw.t += dt;
      if (tw.t < 0) continue;
      if (!tw.from) { tw.from = {}; for (const k in tw.to) tw.from[k] = tw.obj[k]; }
      const u = min(tw.t / tw.dur, 1), e = tw.ease(u);
      for (const k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (u >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
    }
    for (let i = timers.length - 1; i >= 0; i--) {
      const tm = timers[i];
      if (tm.dead) { timers.splice(i, 1); continue; }
      tm.t -= dt;
      if (tm.t <= 0) { timers.splice(i, 1); tm.fn(); }
    }
  };

  // ---------- events ----------
  const handlers = {};
  G.on = (evt, fn) => { (handlers[evt] || (handlers[evt] = [])).push(fn); };
  G.emit = (evt, a, b, c) => { const hs = handlers[evt]; if (hs) for (let i = 0; i < hs.length; i++) hs[i](a, b, c); };

  // audio is optional: these are replaced by audio.js / music.js once loaded
  G.sfx = function () {};
  G.frame = 0;

  // ---------- misc ----------
  G.removeDead = function (arr) {      // stable compaction of anything with .dead
    let j = 0;
    for (let i = 0; i < arr.length; i++) { const e = arr[i]; if (!e.dead) arr[j++] = e; }
    arr.length = j;
  };
  G.params = (function () {
    const out = {};
    try {
      const q = (location.search || '').slice(1);
      for (const kv of q.split('&')) { if (!kv) continue; const [k, v] = kv.split('='); out[decodeURIComponent(k)] = v === undefined ? '1' : decodeURIComponent(v); }
    } catch (e) { /* no query in some frames */ }
    return out;
  })();
  G.fmtInt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
})();
