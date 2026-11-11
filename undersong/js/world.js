'use strict';
/* UNDERSONG — world: zone definitions, cave generation as a signed-distance field,
   collision / raycast queries, lazily shaded wall chunks, flow fields.

   The cave is one scalar field `sd` sampled on a 16px node grid: positive = open water (px to the
   nearest wall, a conservative estimate), negative = rock. Everything — collision, light rays,
   wall art, enemy navigation, decoration placement — reads the same field. */
(function () {
  const { sin, cos, abs, min, max, floor, ceil, sqrt, round, hypot, PI } = Math;
  const { clamp, lerp, smoothstep } = G;
  const CS = G.CS = 16;
  const CH = 512;                 // chunk size in px (multiple of CS)
  const AO = 30;                  // px of soft contact shadow in the water next to rock
  const MAX_CHUNKS = 44;

  // ------------------------------------------------------------------ zone definitions
  // depth: metres shown on the HUD at top/bottom of the zone. amb: ambient light multiplier top/bottom.
  G.ZONES = [
    {
      id: 'shallows', name: 'THE SHALLOWS', sub: 'sunlight zone', depth: [0, 200], cols: 170, rows: 372, pockets: 5, rough: 1,
      arenaRx: 38, arenaRy: 22,
      water: [[70, 200, 214], [12, 86, 136]], amb: [[1, 1, 1], [0.74, 0.84, 0.95]], far: [[44, 150, 176], [24, 112, 152]],
      rockL: [150, 120, 128], rockD: [72, 58, 86], deep: [30, 28, 54], rim: [255, 238, 196], shadow: [6, 38, 70], aoA: 0.42,
      moss: [84, 192, 122], mossD: 11, mossA: 0.92, fleck: [255, 246, 226], strata: 0.22, veins: null,
      snow: [200, 240, 255], snowA: 0.35, tint: [1.0, 1.0, 1.0], sat: 1.06,
    },
    {
      id: 'twilight', name: 'THE TWILIGHT', sub: 'mesopelagic', depth: [200, 1000], cols: 170, rows: 400, pockets: 5, rough: 1.05,
      arenaRx: 40, arenaRy: 24,
      water: [[20, 92, 160], [10, 42, 100]], amb: [[0.62, 0.72, 0.92], [0.2, 0.27, 0.46]], far: [[20, 70, 130], [12, 46, 100]],
      rockL: [110, 134, 192], rockD: [52, 66, 120], deep: [16, 22, 56], rim: [190, 226, 255], shadow: [3, 10, 32], aoA: 0.5,
      moss: [136, 112, 196], mossD: 7, mossA: 0.6, fleck: [190, 230, 255], strata: 0.2, veins: null,
      snow: [170, 210, 255], snowA: 0.5, tint: [0.97, 1.0, 1.04], sat: 1.05,
    },
    {
      id: 'midnight', name: 'THE MIDNIGHT', sub: 'bathypelagic', depth: [1000, 4000], cols: 170, rows: 416, pockets: 6, rough: 1.1,
      arenaRx: 40, arenaRy: 24,
      water: [[12, 38, 80], [6, 18, 46]], amb: [[0.16, 0.19, 0.3], [0.065, 0.08, 0.135]], far: [[16, 40, 80], [10, 26, 58]],
      rockL: [124, 138, 196], rockD: [60, 70, 122], deep: [16, 20, 46], rim: [196, 224, 255], shadow: [1, 3, 10], aoA: 0.55,
      moss: null, mossD: 0, mossA: 0, fleck: [140, 220, 255], strata: 0.26, veins: [70, 240, 216], veinA: 0.9,
      snow: [150, 200, 255], snowA: 0.6, tint: [0.96, 1.0, 1.06], sat: 1.1,
    },
    {
      id: 'abyss', name: 'THE ABYSS', sub: 'abyssopelagic', depth: [4000, 6000], cols: 170, rows: 400, pockets: 5, rough: 1.2,
      arenaRx: 42, arenaRy: 24,
      water: [[40, 17, 26], [22, 9, 15]], amb: [[0.105, 0.07, 0.075], [0.075, 0.046, 0.054]], far: [[58, 25, 32], [36, 15, 21]],
      rockL: [182, 122, 116], rockD: [96, 60, 66], deep: [28, 15, 20], rim: [255, 196, 136], shadow: [2, 1, 2], aoA: 0.55,
      moss: [206, 174, 62], mossD: 5, mossA: 0.5, fleck: [255, 200, 120], strata: 0.3, veins: [255, 118, 36], veinA: 1,
      snow: [255, 190, 150], snowA: 0.45, tint: [1.05, 0.98, 0.95], sat: 1.12,
    },
    {
      id: 'trench', name: 'THE TRENCH', sub: 'hadal zone', depth: [6000, 8848], cols: 120, rows: 330, pockets: 2, rough: 0.9,
      arenaRx: 46, arenaRy: 27, trench: true,
      water: [[16, 25, 46], [9, 14, 30]], amb: [[0.075, 0.085, 0.12], [0.058, 0.068, 0.105]], far: [[23, 34, 58], [15, 23, 43]],
      rockL: [174, 188, 216], rockD: [86, 96, 130], deep: [24, 28, 46], rim: [234, 242, 255], shadow: [1, 2, 5], aoA: 0.5,
      moss: [176, 182, 198], mossD: 7, mossA: 0.7, fleck: [220, 230, 255], strata: 0.18, veins: [176, 150, 255], veinA: 0.55,
      snow: [200, 215, 255], snowA: 0.7, tint: [0.98, 1.0, 1.05], sat: 1.0,
    },
  ];

  let N1 = null, N2 = null;       // tiling noise textures for wall shading
  function ensureNoise() {
    if (N1) return;
    N1 = G.makeNoiseTex(256, 32, 9001, 3);
    N2 = G.makeNoiseTex(256, 8, 4242, 4);
  }
  function n2(x, y) {              // bilinear, wrapped
    const ix = floor(x), iy = floor(y), tx = x - ix, ty = y - iy;
    const x0 = ix & 255, x1 = (ix + 1) & 255, y0 = (iy & 255) << 8, y1 = ((iy + 1) & 255) << 8;
    const a = N2[y0 | x0], b = N2[y0 | x1], c = N2[y1 | x0], d = N2[y1 | x1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }

  // ------------------------------------------------------------------ generation
  G.genZone = function (idx, seed) {
    ensureNoise();
    const def = G.ZONES[idx], rng = G.RNG(seed);
    const W = def.cols, H = def.rows, NW = W + 1, NH = H + 1;
    const F = new Float32Array(NW * NH).fill(-999);
    const zone = {
      idx, def, seed, W, H, NW, NH, pxW: W * CS, pxH: H * CS, sd: F,
      chambers: [], pockets: [], path: [], surfaceY: -1e9, start: null, exit: null, arena: null,
      chunks: new Map(), queue: [], surf: null,
      flow: new Uint16Array(NW * NH), flowStamp: new Uint32Array(NW * NH), flowGen: 0, flowQ: new Int32Array(NW * NH),
      toExit: null,
    };
    const protect = [];

    const PAD = 9;                     // cells of falloff kept around every carve, so rock depth is a true distance
    const disc = (cx, cy, r) => {
      const i0 = max(0, floor(cx - r - PAD)), i1 = min(NW - 1, ceil(cx + r + PAD)), j0 = max(0, floor(cy - r - PAD)), j1 = min(NH - 1, ceil(cy + r + PAD));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const v = r - hypot(i - cx, j - cy), k = j * NW + i;
        if (v > F[k]) F[k] = v;
      }
    };
    const ellipse = (cx, cy, rx, ry) => {
      const i0 = max(0, floor(cx - rx - PAD)), i1 = min(NW - 1, ceil(cx + rx + PAD)), j0 = max(0, floor(cy - ry - PAD)), j1 = min(NH - 1, ceil(cy + ry + PAD));
      const m = min(rx, ry);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const v = (1 - hypot((i - cx) / rx, (j - cy) / ry)) * m, k = j * NW + i;
        if (v > F[k]) F[k] = v;
      }
    };
    const blob = (cx, cy, r) => {      // solid lump (pillars, spires)
      const i0 = max(0, floor(cx - r - 2)), i1 = min(NW - 1, ceil(cx + r + 2)), j0 = max(0, floor(cy - r - 2)), j1 = min(NH - 1, ceil(cy + r + 2));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const v = hypot(i - cx, j - cy) - r, k = j * NW + i;
        if (v < F[k]) F[k] = v;
      }
    };
    let tunnelSeed = 0;
    const tunnel = (x0, y0, x1, y1, r0, r1, bend, record) => {
      const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, L = hypot(dx, dy) || 1;
      const cx = mx - dy / L * bend, cy = my + dx / L * bend;
      const n = max(2, ceil(L / 0.8)), ts = (tunnelSeed += 37);
      for (let k = 0; k <= n; k++) {
        const t = k / n, u = 1 - t;
        const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        const r = lerp(r0, r1, t) * (0.82 + 0.36 * G.noise2(k * 0.11, ts, seed));
        disc(x, y, r);
        protect.push(x, y);
        if (record && k % 7 === 3) zone.path.push({ x: x * CS, y: y * CS, r: r * CS });
      }
    };
    const chamber = (cx, cy, r) => {
      const rx = r * rng.range(0.95, 1.3), ry = r * rng.range(0.72, 0.98);
      ellipse(cx, cy, rx, ry);
      const n = rng.int(2, 3);
      for (let i = 0; i < n; i++) { const a = rng.ang(), d = r * rng.range(0.4, 0.75); disc(cx + cos(a) * d * 1.1, cy + sin(a) * d * 0.8, r * rng.range(0.4, 0.6)); }
      const c = { x: cx * CS, y: cy * CS, r: min(rx, ry) * CS, rx: rx * CS, ry: ry * CS, t: cy / H, pillars: [] };
      zone.chambers.push(c);
      return c;
    };

    // ---- layout
    const margin = 22;
    let x = W / 2 + rng.range(-10, 10), y = 11;
    if (idx === 0) {
      // open water under the surface, a sloping floor, then a hole down into the reef
      const SURF = 12;
      zone.surfaceY = SURF * CS;
      const floorY = i => 49 + (G.fbm(i * 0.028, 3.3, 3, seed + 5) - 0.5) * 26 + 6 * smoothstep(40, 0, min(i, NW - 1 - i));
      zone.floorY = px => floorY(px / CS) * CS;
      for (let i = 0; i < NW; i++) {
        const fy = floorY(i);
        for (let j = 0; j < min(NH, ceil(fy) + 10); j++) {
          const sky = j < SURF ? (SURF - j) * 2.6 : 0;
          const eL = 9 + G.noise2(j * 0.12, 1.5, seed) * 4 - sky, eR = NW - 10 - G.noise2(j * 0.12, 7.5, seed) * 4 + sky;
          const v = min(i - eL, eR - i, (fy - j) * 0.85);
          const k = j * NW + i;
          if (v > F[k]) F[k] = v;
        }
      }
      // coral spires rising off the floor
      const nSp = rng.int(4, 6);
      for (let s = 0; s < nSp; s++) {
        const sx = rng.range(24, W - 24), fy = floorY(sx), hgt = rng.range(7, 17);
        if (abs(sx - W / 2) < 9) continue;
        for (let t = 0; t <= 1; t += 0.12) blob(sx + sin(t * 3 + s) * 1.2, fy - t * hgt, lerp(3.4, 1.3, t));
      }
      zone.start = { x: (W / 2) * CS, y: (SURF + 3.2) * CS };
      // the way down
      x = clamp(W / 2 + rng.sign() * rng.range(20, 46), margin + 10, W - margin - 10);
      const fy = floorY(x);
      tunnel(x, fy - 5, x + rng.range(-4, 4), fy + 12, 6.5, 5.5, rng.range(-3, 3), true);
      y = fy + 12;
      zone.holeX = x * CS; zone.holeY = fy * CS;
    } else {
      zone.start = { x: x * CS, y: y * CS };
      tunnel(x, -4, x, y, 4.2, 5.5, 0, false);
      disc(x, y, 8.5);
    }

    const trench = !!def.trench;
    const yEnd = H - def.arenaRy * 2 - 24;
    let first = true;
    while (y < yEnd) {
      const ny = min(yEnd + 2, y + (trench ? rng.range(20, 30) : rng.range(17, 27)));
      const reach = trench ? rng.range(8, 20) : rng.range(18, 48);
      let nx = x + rng.sign() * reach;
      if (nx < margin + 6 || nx > W - margin - 6) nx = x - (nx - x);
      nx = clamp(nx, margin + 6, W - margin - 6);
      const tr = trench ? rng.range(4.6, 5.8) : rng.range(5.2, 7);
      tunnel(x, y, nx, ny, tr, tr + rng.range(-0.6, 0.8), rng.range(-9, 9), true);
      x = nx; y = ny;
      if (!first && rng.chance(trench ? 0.42 : 0.64) && y < yEnd - 6) chamber(x, y, rng.range(11.5, 17));
      first = false;
    }
    // boss arena + the way out
    const ax = clamp(x + rng.range(-10, 10), def.arenaRx + 8, W - def.arenaRx - 8), ay = H - def.arenaRy - 15;
    tunnel(x, y, ax, ay - def.arenaRy + 3, 6, 6.5, rng.range(-5, 5), true);
    ellipse(ax, ay, def.arenaRx, def.arenaRy);
    ellipse(ax, ay + 3, def.arenaRx * 0.82, def.arenaRy * 0.95);
    zone.arena = { x: ax * CS, y: ay * CS, rx: def.arenaRx * CS, ry: def.arenaRy * CS, gateY: (ay - def.arenaRy - 3) * CS };
    if (!trench) {
      tunnel(ax, ay + def.arenaRy - 4, ax, H + 4, 4.6, 4.6, 0, false);
      zone.exit = { x: ax * CS, y: (H - 1.5) * CS, plugY: (ay + def.arenaRy + 3) * CS };
    } else zone.exit = { x: ax * CS, y: ay * CS, plugY: 1e9 };

    // ---- side pockets (caches, wrecks, cleaning stations…)
    const cand = zone.path.filter(p => p.y > (idx === 0 ? 86 : 30) * CS && p.y < (ay - def.arenaRy - 12) * CS);
    rng.shuffle(cand);
    for (const p of cand) {
      if (zone.pockets.length >= def.pockets) break;
      if (zone.pockets.some(q => abs(q.py - p.y) < 20 * CS)) continue;
      const px = p.x / CS, py = p.y / CS;
      let dir = px < W / 2 ? 1 : -1; if (rng.chance(0.18)) dir = -dir;
      const len = rng.range(17, trench ? 22 : 30);
      const ex = clamp(px + dir * len, 13, W - 13), ey = py + rng.range(-9, 7);
      if (abs(ex - px) < 12) continue;
      // don't punch into another part of the route
      let clash = false;
      for (const q of zone.path) if (q !== p && hypot(q.x / CS - ex, q.y / CS - ey) < 15) { clash = true; break; }
      if (clash) continue;
      tunnel(px, py, ex, ey, 4.1, 4.4, rng.range(-5, 5), false);
      const r = rng.range(6.8, 9);
      disc(ex, ey, r); disc(ex + rng.range(-3, 3), ey + rng.range(-2, 2), r * 0.7);
      zone.pockets.push({ x: ex * CS, y: ey * CS, r: r * CS, t: ey / H, py: p.y, kind: null });
    }
    zone.pockets.sort((a, b) => a.y - b.y);

    // ---- roughen with noise near the carved space
    const rough = 3.3 * def.rough;
    for (let j = 0; j < NH; j++) for (let i = 0; i < NW; i++) {
      const k = j * NW + i;
      if (F[k] > -7) F[k] += (G.fbm(i * 0.085, j * 0.085, 3, seed + 77) - 0.5) * rough + (G.noise2(i * 0.31, j * 0.31, seed + 5) - 0.5) * 0.9;
    }
    // pillars inside the bigger rooms
    for (const c of zone.chambers) {
      if (c.r < 12.5 * CS) continue;
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const a = rng.ang(), d = rng.range(0.3, 0.62);
        const bx = c.x / CS + cos(a) * c.rx / CS * d, by = c.y / CS + sin(a) * c.ry / CS * d, br = rng.range(1.8, 3.2);
        blob(bx, by, br);
        c.pillars.push({ x: bx * CS, y: by * CS, r: br * CS });
      }
    }
    {   // a few for the arena too, kept off the centre line
      const A = zone.arena, n = trench ? 0 : rng.int(2, 3);
      A.pillars = [];
      for (let i = 0; i < n; i++) {
        const sx = (i % 2 ? 1 : -1) * rng.range(0.38, 0.66), sy = rng.range(-0.25, 0.4);
        const bx = A.x / CS + sx * def.arenaRx, by = A.y / CS + sy * def.arenaRy, br = rng.range(2.2, 3.2);
        blob(bx, by, br); A.pillars.push({ x: bx * CS, y: by * CS, r: br * CS });
      }
    }
    // keep the route passable whatever the noise did
    for (let i = 0; i < protect.length; i += 2) disc(protect[i], protect[i + 1], 3.3);

    // ---- borders
    for (let j = 0; j < NH; j++) {
      if (idx === 0 && j < 9) continue;          // open sky above the lagoon
      for (let i = 0; i < 3; i++) { const v = i - 2.4; let k = j * NW + i; if (F[k] > v) F[k] = v; k = j * NW + (NW - 1 - i); if (F[k] > v) F[k] = v; }
    }
    if (idx !== 0) for (let i = 0; i < NW; i++) { if (abs(i * CS - zone.start.x) > 5 * CS) { if (F[i] > -1.5) F[i] = -1.5; if (F[NW + i] > -0.6) F[NW + i] = -0.6; } }
    for (let i = 0; i < NW; i++) {
      if (!trench && abs(i * CS - zone.exit.x) < 6 * CS) continue;
      const k = (NH - 1) * NW + i; if (F[k] > -1.5) F[k] = -1.5;
      const k2 = (NH - 2) * NW + i; if (F[k2] > -0.6) F[k2] = -0.6;
    }

    // ---- seal anything unreachable
    {
      const seen = new Uint8Array(NW * NH), q = zone.flowQ;
      let head = 0, tail = 0;
      const s = clamp(round(zone.start.y / CS), 0, NH - 1) * NW + clamp(round(zone.start.x / CS), 0, NW - 1);
      seen[s] = 1; q[tail++] = s;
      while (head < tail) {
        const n = q[head++], i = n % NW, j = (n / NW) | 0;
        if (i > 0 && !seen[n - 1] && F[n - 1] > 0) { seen[n - 1] = 1; q[tail++] = n - 1; }
        if (i < NW - 1 && !seen[n + 1] && F[n + 1] > 0) { seen[n + 1] = 1; q[tail++] = n + 1; }
        if (j > 0 && !seen[n - NW] && F[n - NW] > 0) { seen[n - NW] = 1; q[tail++] = n - NW; }
        if (j < NH - 1 && !seen[n + NW] && F[n + NW] > 0) { seen[n + NW] = 1; q[tail++] = n + NW; }
      }
      for (let k = 0; k < F.length; k++) if (F[k] > 0 && !seen[k]) F[k] = -0.6;
    }
    for (let k = 0; k < F.length; k++) F[k] = (F[k] < -8 ? -8 : F[k]) * CS;

    buildSurface(zone);
    buildExitField(zone);
    zone.pal = def;
    return zone;
  };

  // boundary samples (position on the wall + outward normal) for decoration, spawning, effects
  function buildSurface(zone) {
    const { NW, NH, sd } = zone, out = [];
    const g = { x: 0, y: 0 };
    for (let j = 0; j < NH - 1; j++) for (let i = 0; i < NW - 1; i++) {
      const k = j * NW + i, a = sd[k], b = sd[k + 1], c = sd[k + NW], d = sd[k + NW + 1];
      const pos = (a > 0) + (b > 0) + (c > 0) + (d > 0);
      if (pos === 0 || pos === 4) continue;
      let x = (i + 0.5) * CS, y = (j + 0.5) * CS;
      for (let it = 0; it < 3; it++) { const v = sampleGrad(zone, x, y, g); x -= g.x * v; y -= g.y * v; }
      sampleGrad(zone, x, y, g);
      out.push(x, y, g.x, g.y);
    }
    zone.surf = new Float32Array(out);
  }

  function buildExitField(zone) {
    const { NW, NH, sd } = zone, d = new Uint16Array(NW * NH).fill(65535), q = zone.flowQ;
    let head = 0, tail = 0;
    let s = clamp(round(zone.exit.y / CS), 0, NH - 1) * NW + clamp(round(zone.exit.x / CS), 0, NW - 1);
    d[s] = 0; q[tail++] = s;
    while (head < tail) {
      const n = q[head++], i = n % NW, j = (n / NW) | 0, nd = d[n] + 1;
      if (i > 0 && d[n - 1] === 65535 && sd[n - 1] > 10) { d[n - 1] = nd; q[tail++] = n - 1; }
      if (i < NW - 1 && d[n + 1] === 65535 && sd[n + 1] > 10) { d[n + 1] = nd; q[tail++] = n + 1; }
      if (j > 0 && d[n - NW] === 65535 && sd[n - NW] > 10) { d[n - NW] = nd; q[tail++] = n - NW; }
      if (j < NH - 1 && d[n + NW] === 65535 && sd[n + NW] > 10) { d[n + NW] = nd; q[tail++] = n + NW; }
    }
    zone.toExit = d;
  }

  // ------------------------------------------------------------------ field queries
  function sample(zone, x, y) {
    const NW = zone.NW, sd = zone.sd;
    let fx = x / CS, fy = y / CS, i = floor(fx), j = floor(fy);
    if (i < 0) { i = 0; fx = 0; } else if (i > NW - 2) { i = NW - 2; fx = NW - 1; }
    if (j < 0) { j = 0; fy = 0; } else if (j > zone.NH - 2) { j = zone.NH - 2; fy = zone.NH - 1; }
    const tx = fx - i, ty = fy - j, k = j * NW + i;
    const a = sd[k], b = sd[k + 1], c = sd[k + NW], d = sd[k + NW + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
  function sampleGrad(zone, x, y, out) {
    const NW = zone.NW, sd = zone.sd;
    let fx = x / CS, fy = y / CS, i = floor(fx), j = floor(fy);
    if (i < 0) { i = 0; fx = 0; } else if (i > NW - 2) { i = NW - 2; fx = NW - 1; }
    if (j < 0) { j = 0; fy = 0; } else if (j > zone.NH - 2) { j = zone.NH - 2; fy = zone.NH - 1; }
    const tx = fx - i, ty = fy - j, k = j * NW + i;
    const a = sd[k], b = sd[k + 1], c = sd[k + NW], d = sd[k + NW + 1];
    let gx = (b - a) * (1 - ty) + (d - c) * ty, gy = (c - a) * (1 - tx) + (d - b) * tx;
    const l = sqrt(gx * gx + gy * gy);
    if (l > 1e-5) { out.x = gx / l; out.y = gy / l; } else { out.x = 0; out.y = -1; }
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  }
  const _g = { x: 0, y: 0 };
  G.sdf = (x, y) => sample(G.zone, x, y);
  G.sdfGrad = (x, y, out) => sampleGrad(G.zone, x, y, out);
  // distance along a ray until rock (sphere-traced), capped at maxD
  G.raycast = function (x, y, dx, dy, maxD) {
    const zone = G.zone;
    let t = 0;
    for (let i = 0; i < 64 && t < maxD; i++) {
      const d = sample(zone, x + dx * t, y + dy * t);
      if (d < 1.5) return t;
      t += d * 0.72 + 1;
    }
    return t < maxD ? t : maxD;
  };
  G.los = function (ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L = sqrt(dx * dx + dy * dy);
    if (L < 1) return true;
    return G.raycast(ax, ay, dx / L, dy / L, L) >= L - 2;
  };
  // push a circle {x,y,r,vx,vy} out of rock. returns true on contact; leaves the normal in G.hitN
  G.hitN = { x: 0, y: 0 };
  G.collide = function (e, bounce) {
    const zone = G.zone;
    let hit = false;
    for (let it = 0; it < 3; it++) {
      const d = sampleGrad(zone, e.x, e.y, _g);
      if (d >= e.r) break;
      const push = e.r - d;
      e.x += _g.x * push; e.y += _g.y * push;
      const vn = e.vx * _g.x + e.vy * _g.y;
      if (vn < 0) { const k = 1 + (bounce || 0); e.vx -= _g.x * vn * k; e.vy -= _g.y * vn * k; }
      G.hitN.x = _g.x; G.hitN.y = _g.y;
      hit = true;
    }
    return hit;
  };

  // ------------------------------------------------------------------ flow fields
  const FLOW_MAX = 72, PASS = 13;
  G.computeFlow = function (px, py) {
    const zone = G.zone, { NW, NH, sd, flow, flowStamp: st, flowQ: q } = zone;
    const stamp = ++zone.flowGen;
    let i0 = clamp(round(px / CS), 1, NW - 2), j0 = clamp(round(py / CS), 1, NH - 2);
    let head = 0, tail = 0;
    const s = j0 * NW + i0;
    flow[s] = 0; st[s] = stamp; q[tail++] = s;
    while (head < tail) {
      const n = q[head++], d = flow[n];
      if (d >= FLOW_MAX) continue;
      const i = n % NW, j = (n / NW) | 0, nd = d + 1;
      if (i > 0 && st[n - 1] !== stamp && sd[n - 1] > PASS) { st[n - 1] = stamp; flow[n - 1] = nd; q[tail++] = n - 1; }
      if (i < NW - 1 && st[n + 1] !== stamp && sd[n + 1] > PASS) { st[n + 1] = stamp; flow[n + 1] = nd; q[tail++] = n + 1; }
      if (j > 0 && st[n - NW] !== stamp && sd[n - NW] > PASS) { st[n - NW] = stamp; flow[n - NW] = nd; q[tail++] = n - NW; }
      if (j < NH - 1 && st[n + NW] !== stamp && sd[n + NW] > PASS) { st[n + NW] = stamp; flow[n + NW] = nd; q[tail++] = n + NW; }
    }
  };
  const NB = [-1, 0, 1, 0, 0, -1, 0, 1, -1, -1, 1, -1, -1, 1, 1, 1];
  // direction that walks toward the player around walls. false when out of range.
  G.flowDir = function (x, y, out) {
    const zone = G.zone, { NW, NH, flow, flowStamp: st } = zone, stamp = zone.flowGen;
    const i = clamp(round(x / CS), 1, NW - 2), j = clamp(round(y / CS), 1, NH - 2), n = j * NW + i;
    let base = st[n] === stamp ? flow[n] : 9999, sx = 0, sy = 0, any = false;
    for (let k = 0; k < 16; k += 2) {
      const m = (j + NB[k + 1]) * NW + i + NB[k];
      if (st[m] !== stamp) continue;
      const diff = base - flow[m];
      if (diff > 0) { const w = diff / (k < 8 ? 1 : 1.414); sx += NB[k] * w; sy += NB[k + 1] * w; any = true; }
    }
    if (!any) return false;
    const l = sqrt(sx * sx + sy * sy) || 1;
    out.x = sx / l; out.y = sy / l;
    return true;
  };
  G.flowDist = function (x, y) {
    const zone = G.zone, n = clamp(round(y / CS), 0, zone.NH - 1) * zone.NW + clamp(round(x / CS), 0, zone.NW - 1);
    return zone.flowStamp[n] === zone.flowGen ? zone.flow[n] * CS : Infinity;
  };
  // direction along the cave toward this zone's exit ("toward the song")
  G.exitDir = function (x, y, out) {
    const zone = G.zone, { NW, NH, toExit: d } = zone;
    const i = clamp(round(x / CS), 1, NW - 2), j = clamp(round(y / CS), 1, NH - 2), n = j * NW + i;
    let base = d[n], sx = 0, sy = 0, any = false;
    if (base === 65535) {     // standing in a tight spot: borrow the best neighbour
      for (let k = 0; k < 16; k += 2) { const m = (j + NB[k + 1]) * NW + i + NB[k]; if (d[m] < base) base = d[m] + 2; }
      if (base === 65535) return false;
    }
    for (let k = 0; k < 16; k += 2) {
      const m = (j + NB[k + 1]) * NW + i + NB[k];
      if (d[m] === 65535) continue;
      const diff = base - d[m];
      if (diff > 0) { const w = diff / (k < 8 ? 1 : 1.414); sx += NB[k] * w; sy += NB[k + 1] * w; any = true; }
    }
    if (!any) return false;
    const l = sqrt(sx * sx + sy * sy) || 1;
    out.x = sx / l; out.y = sy / l;
    return true;
  };
  G.exitDist = function (x, y) {
    const zone = G.zone, n = clamp(round(y / CS), 0, zone.NH - 1) * zone.NW + clamp(round(x / CS), 0, zone.NW - 1);
    return zone.toExit[n];
  };

  // ------------------------------------------------------------------ wall chunks
  function getChunk(zone, cx, cy, create) {
    const key = cy * 4096 + cx;
    let ch = zone.chunks.get(key);
    if (ch || !create) return ch;
    ch = { key, cx, cy, x: cx * CH, y: cy * CH, row: 0, done: false, canvas: null, ctx: null, img: null, vein: null, vimg: null, empty: true, used: 0, outline: null };
    zone.chunks.set(key, ch);
    zone.queue.push(ch);
    return ch;
  }

  function shadeRows(zone, ch, r0, r1) {
    const P = zone.pal, sd = zone.sd, NW = zone.NW, NH = zone.NH;
    if (!ch.img) {
      ch.canvas = G.makeCanvas(CH, CH); ch.ctx = ch.canvas.getContext('2d');
      ch.img = ch.ctx.createImageData(CH, CH);
      if (P.veins) { ch.vein = G.makeCanvas(CH, CH); ch.vimg = ch.vein.getContext('2d').createImageData(CH, CH); }
    }
    const data = ch.img.data, vdata = ch.vimg ? ch.vimg.data : null;
    const L = P.rockL, D = P.rockD, DP = P.deep, RM = P.rim, SH = P.shadow, MS = P.moss, FK = P.fleck, VN = P.veins;
    const aoA = P.aoA * 255, strata = P.strata, mossD = P.mossD, mossA = P.mossA, veinA = P.veinA || 0;
    const x0 = ch.x, y0 = ch.y;
    let any = !ch.empty;
    for (let py = r0; py < r1; py++) {
      const wy = y0 + py + 0.5, wyI = y0 + py;
      let fy = wy / CS, j = floor(fy);
      if (j > NH - 2) { j = NH - 2; fy = NH - 1; } else if (j < 0) { j = 0; fy = 0; }
      const ty = fy - j, ra = j * NW, rb = ra + NW;
      let o = py * CH * 4;
      for (let px = 0; px < CH;) {
        let i = floor((x0 + px + 0.5) / CS);
        const clampX = i > NW - 2;
        if (clampX) i = NW - 2;
        const a = sd[ra + i], b = sd[ra + i + 1], c = sd[rb + i], d = sd[rb + i + 1];
        const spanEnd = min(CH, px + CS - (px % CS));
        if (a > AO && b > AO && c > AO && d > AO) { o += (spanEnd - px) * 4; px = spanEnd; continue; }
        any = true;
        for (; px < spanEnd; px++, o += 4) {
          const wx = x0 + px + 0.5, wxI = x0 + px;
          const tx = clampX ? 1 : wx / CS - i;
          const top = a + (b - a) * tx, bot = c + (d - c) * tx, v = top + (bot - top) * ty;
          if (v >= AO) continue;
          if (v > 0.7) {
            const k = 1 - v / AO;
            data[o] = SH[0]; data[o + 1] = SH[1]; data[o + 2] = SH[2]; data[o + 3] = k * k * aoA;
            continue;
          }
          const depth = -v;
          const nA = N1[((wyI & 255) << 8) | (wxI & 255)];
          const nB = n2(wx * 0.31, wy * 0.31);
          let t = depth < 46 ? depth / 46 : 1; t = t * t * (3 - 2 * t);
          let r = L[0] + (D[0] - L[0]) * t, g = L[1] + (D[1] - L[1]) * t, bl = L[2] + (D[2] - L[2]) * t;
          let lum = 0.7 + 0.36 * nB + 0.26 * (nA - 0.5);
          const s = sin(wy * 0.085 + nB * 9 + nA * 1.3);
          if (s > 0.7) lum *= 1 - strata * (s - 0.7) / 0.3;
          const crack = abs(n2(wx * 0.13 + 40, wy * 0.13 + 90) - 0.5);
          if (crack < 0.012 && depth > 5) lum *= 0.72 + crack * 20;
          if (depth > 38) { const u = min(1, (depth - 38) / 74) * 0.9; r += (DP[0] - r) * u; g += (DP[1] - g) * u; bl += (DP[2] - bl) * u; lum = lum + (0.9 - lum) * u; }
          if (depth < 22) {
            const gx = (b - a) * (1 - ty) + (d - c) * ty, gy = (c - a) * (1 - tx) + (d - b) * tx;
            const up = -gy / (sqrt(gx * gx + gy * gy) + 1e-6);
            if (MS && up > 0.1 && depth < mossD * (0.45 + nA * 1.1)) {
              let k = (up - 0.1) / 0.5; if (k > 1) k = 1; k *= mossA;
              const ml = 0.72 + 0.5 * nA;
              r += (MS[0] * ml - r) * k; g += (MS[1] * ml - g) * k; bl += (MS[2] * ml - bl) * k;
              lum = lum + (1 - lum) * k * 0.8;
            }
            if (depth < 2.3) {
              const k = (0.3 + 0.7 * (0.5 + 0.5 * up)) * (1 - depth / 4.6);
              r += (RM[0] - r) * k; g += (RM[1] - g) * k; bl += (RM[2] - bl) * k; lum = lum + (1.02 - lum) * k;
            } else if (depth < 8) lum *= 0.62 + 0.38 * (depth - 2.3) / 5.7;
          } else if (depth > 7) {
            const h = G.hash2(wxI, wyI, 77);
            if (h < 0.0016) { const k = 0.3 + h * 300; r += (FK[0] - r) * k; g += (FK[1] - g) * k; bl += (FK[2] - bl) * k; lum = 1; }
          }
          r *= lum; g *= lum; bl *= lum;
          if (v > -0.7) {
            // antialias the silhouette over the contact shadow
            const al = (0.7 - v) / 1.4, sa = aoA / 255, oa = al + sa * (1 - al);
            data[o] = (r * al + SH[0] * sa * (1 - al)) / oa; data[o + 1] = (g * al + SH[1] * sa * (1 - al)) / oa;
            data[o + 2] = (bl * al + SH[2] * sa * (1 - al)) / oa; data[o + 3] = oa * 255;
          } else { data[o] = r; data[o + 1] = g; data[o + 2] = bl; data[o + 3] = 255; }
          if (vdata && depth > 2 && depth < 34) {
            // glowing mineral veins, in clustered patches
            const patch = n2(wx * 0.045 + 300, wy * 0.045 + 100);
            if (patch > 0.5) {
              const ridge = 1 - abs(n2(wx * 0.19 + 7, wy * 0.19 + 3) * 2 - 1);
              let k = (ridge - 0.955) / 0.045;
              if (k > 0) {
                k *= min(1, (patch - 0.5) * 7) * min(1, (depth - 2) / 5) * min(1, (34 - depth) / 12) * veinA;
                vdata[o] = VN[0]; vdata[o + 1] = VN[1]; vdata[o + 2] = VN[2]; vdata[o + 3] = k * 255;
                ch.hasVein = true;
              }
            }
          }
        }
      }
    }
    ch.empty = !any;
  }

  function finishChunk(zone, ch) {
    if (ch.row < CH) { shadeRows(zone, ch, ch.row, CH); ch.row = CH; }
    if (ch.empty) { ch.canvas = null; ch.ctx = null; ch.vein = null; }
    else {
      ch.ctx.putImageData(ch.img, 0, 0);
      if (ch.vein) { if (ch.hasVein) ch.vein.getContext('2d').putImageData(ch.vimg, 0, 0); else ch.vein = null; }
    }
    ch.img = null; ch.vimg = null; ch.done = true;
  }

  // marching-squares outline of one chunk as a Path2D (for the sonar sweep)
  function chunkOutline(zone, ch) {
    if (ch.outline !== null) return ch.outline;
    const { NW, NH, sd } = zone, p = new Path2D();
    let n = 0;
    const i0 = ch.x / CS, j0 = ch.y / CS, cells = CH / CS;
    const pts = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let j = j0; j < min(j0 + cells, NH - 1); j++) for (let i = i0; i < min(i0 + cells, NW - 1); i++) {
      const k = j * NW + i, a = sd[k], b = sd[k + 1], c = sd[k + NW], d = sd[k + NW + 1];
      const pos = (a > 0) + (b > 0) + (c > 0) + (d > 0);
      if (pos === 0 || pos === 4) continue;
      let m = 0;
      const x = i * CS, y = j * CS;
      if ((a > 0) !== (b > 0)) { pts[m++] = x + CS * a / (a - b); pts[m++] = y; }
      if ((b > 0) !== (d > 0)) { pts[m++] = x + CS; pts[m++] = y + CS * b / (b - d); }
      if ((c > 0) !== (d > 0)) { pts[m++] = x + CS * c / (c - d); pts[m++] = y + CS; }
      if ((a > 0) !== (c > 0)) { pts[m++] = x; pts[m++] = y + CS * a / (a - c); }
      if (m === 4) { p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3]); n++; }
      else if (m === 8) { p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3]); p.moveTo(pts[4], pts[5]); p.lineTo(pts[6], pts[7]); n += 2; }
    }
    ch.outline = n ? p : false;
    return ch.outline;
  }

  const W_ = G.world = {
    CH,
    // request chunks around the camera and spend up to `budgetMs` shading queued ones
    update(budgetMs) {
      const zone = G.zone, cam = G.cam;
      if (!zone) return;
      const m = 300;
      const cx0 = max(0, floor((cam.left - m) / CH)), cx1 = min(ceil(zone.pxW / CH) - 1, floor((cam.right + m) / CH));
      const cy0 = max(0, floor((cam.top - m) / CH)), cy1 = min(ceil(zone.pxH / CH) - 1, floor((cam.bottom + m * 1.6) / CH));
      const stamp = G.time;
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) getChunk(zone, cx, cy, true).used = stamp;
      const q = zone.queue;
      if (q.length) {
        const t0 = performance.now(), ccx = cam.x / CH - 0.5, ccy = cam.y / CH - 0.5;
        if (q.length > 1) q.sort((a, b) => (abs(a.cx - ccx) + abs(a.cy - ccy)) - (abs(b.cx - ccx) + abs(b.cy - ccy)));
        while (q.length && performance.now() - t0 < budgetMs) {
          const ch = q[0], r1 = min(CH, ch.row + 32);
          shadeRows(zone, ch, ch.row, r1); ch.row = r1;
          if (r1 >= CH) { finishChunk(zone, ch); q.shift(); }
        }
      }
      if (zone.chunks.size > MAX_CHUNKS) {
        for (const [key, ch] of zone.chunks) {
          if (ch.done && stamp - ch.used > 3) { zone.chunks.delete(key); if (zone.chunks.size <= MAX_CHUNKS - 6) break; }
        }
      }
    },
    // shade everything near a point right now (used behind the descent screen)
    prewarm(x, y) {
      const zone = G.zone, cam = G.cam, ox = cam.x, oy = cam.y;
      cam.x = x; cam.y = y;
      this.update(1e9);
      cam.x = ox; cam.y = oy;
    },
    forVisible(fn) {
      const zone = G.zone, cam = G.cam;
      const cx0 = max(0, floor(cam.left / CH)), cx1 = min(ceil(zone.pxW / CH) - 1, floor(cam.right / CH));
      const cy0 = max(0, floor(cam.top / CH)), cy1 = min(ceil(zone.pxH / CH) - 1, floor(cam.bottom / CH));
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const ch = getChunk(zone, cx, cy, true);
        if (!ch.done) { const qi = zone.queue.indexOf(ch); if (qi >= 0) zone.queue.splice(qi, 1); finishChunk(zone, ch); }
        fn(ch);
      }
    },
    drawWalls(ctx) {
      this.forVisible(ch => { if (ch.canvas) ctx.drawImage(ch.canvas, ch.x, ch.y); });
      // solid rock beyond the zone edges so the camera never shows a void
      const zone = G.zone, cam = G.cam, P = zone.pal;
      ctx.fillStyle = G.css(P.deep);
      if (cam.left < 0) ctx.fillRect(cam.left - 40, cam.top - 40, -cam.left + 40, G.H / cam.zoom + 80);
      if (cam.right > zone.pxW) ctx.fillRect(zone.pxW, cam.top - 40, cam.right - zone.pxW + 40, G.H / cam.zoom + 80);
      if (zone.idx !== 0 && cam.top < 0) ctx.fillRect(cam.left - 40, cam.top - 40, G.W / cam.zoom + 80, -cam.top + 40);
    },
    drawVeins(ctx, pulse) {
      if (!G.zone.pal.veins) return;
      ctx.globalAlpha = pulse;
      this.forVisible(ch => { if (ch.vein) ctx.drawImage(ch.vein, ch.x, ch.y); });
      ctx.globalAlpha = 1;
    },
    // stroke wall outlines with whatever strokeStyle the caller set (sonar sweep)
    strokeOutlines(ctx) {
      const zone = G.zone;
      this.forVisible(ch => { const p = chunkOutline(zone, ch); if (p) ctx.stroke(p); });
    },
    // random boundary sample -> {x,y,nx,ny}; returns false if the zone has none
    surfaceAt(index, out) {
      const s = G.zone.surf, n = s.length >> 2;
      if (!n) return false;
      const k = (index % n) * 4;
      out.x = s[k]; out.y = s[k + 1]; out.nx = s[k + 2]; out.ny = s[k + 3];
      return true;
    },
    surfaceCount() { return G.zone.surf.length >> 2; },
    depthAt(y) {       // HUD metres
      const zone = G.zone, d = zone.def.depth;
      const top = zone.idx === 0 ? zone.surfaceY : 0;
      return d[0] + (d[1] - d[0]) * clamp((y - top) / (zone.pxH - top), 0, 1);
    },
    depth01(y) { const zone = G.zone; return clamp(y / zone.pxH, 0, 1); },
  };
})();
