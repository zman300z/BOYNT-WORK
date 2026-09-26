'use strict';
// ============================================================================
// Level: tiles, collision, chunked rendering, decorations, map
// ============================================================================
(function () {
  const G = window.G;
  const TS = 16;
  const T = (G.T = {
    AIR: 0, SOLID: 1, PLAT: 2, LADDER: 3, HAZARD: 4, BREAK: 5, RAM: 6, SEED: 7, VINE: 8, GRIP: 9,
  });
  const isSolidT = (t) => t === 1 || t === 5 || t === 6 || t === 9;
  const isLadderT = (t) => t === 3 || t === 8;
  G.isSolidT = isSolidT;
  const CHUNK = 16;

  class Level {
    constructor(w, h, biomeId) {
      this.w = w;
      this.h = h;
      this.pw = w * TS;
      this.ph = h * TS;
      this.biomeId = biomeId;
      this.biome = G.BIOMES[biomeId];
      this.style = this.biome.style;
      this.tiles = new Uint8Array(w * h).fill(T.SOLID);
      this.back = new Uint8Array(w * h);
      this.depth = null;
      this.decos = [];
      this.animDecos = [];
      this.spawns = [];
      this.cells = [];
      this.chunks = new Map();
      this.seed = 1;
      this.dirtyChunks = [];
      this.revealed = null;
    }
    idx(tx, ty) {
      return ty * this.w + tx;
    }
    get(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return T.SOLID;
      return this.tiles[ty * this.w + tx];
    }
    set(tx, ty, v) {
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;
      this.tiles[ty * this.w + tx] = v;
      if (this.depth) this.invalidate(tx, ty);
    }
    setBack(tx, ty, v) {
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return;
      this.back[ty * this.w + tx] = v;
    }
    getBack(tx, ty) {
      if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return 0;
      return this.back[ty * this.w + tx];
    }
    fill(x0, y0, w, h, v) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, v);
    }
    fillBack(x0, y0, w, h, v) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.setBack(x, y, v);
    }
    isSolid(tx, ty) {
      return isSolidT(this.get(tx, ty));
    }
    solidAt(px, py) {
      return isSolidT(this.get(Math.floor(px / TS), Math.floor(py / TS)));
    }
    isLadder(tx, ty) {
      return isLadderT(this.get(tx, ty));
    }
    // one-way surface: platform, or top of a ladder/vine run
    isOneWay(tx, ty) {
      const t = this.get(tx, ty);
      if (t === T.PLAT) return true;
      if (isLadderT(t) && !isLadderT(this.get(tx, ty - 1))) return true;
      return false;
    }
    rectSolid(x, y, w, h) {
      const x0 = Math.floor(x / TS), x1 = Math.floor((x + w - 0.001) / TS);
      const y0 = Math.floor(y / TS), y1 = Math.floor((y + h - 0.001) / TS);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidT(this.get(tx, ty))) return true;
      return false;
    }
    rectHazard(x, y, w, h) {
      const x0 = Math.floor(x / TS), x1 = Math.floor((x + w - 0.001) / TS);
      const y0 = Math.floor(y / TS), y1 = Math.floor((y + h - 0.001) / TS);
      for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++)
          if (this.get(tx, ty) === T.HAZARD) {
            // hazard occupies bottom 8px of tile
            if (y + h > ty * TS + 8) return true;
          }
      return false;
    }
    // line of sight between two points (tile stepping)
    los(x0, y0, x1, y1) {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.ceil(d / 8);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        if (this.solidAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false;
      }
      return true;
    }
    // find ground y below a point (returns pixel y of surface or null)
    groundBelow(px, py, maxDist) {
      const tx = Math.floor(px / TS);
      let ty = Math.floor(py / TS);
      const end = ty + Math.ceil((maxDist || 400) / TS);
      for (; ty <= end && ty < this.h; ty++) {
        const t = this.get(tx, ty);
        if (isSolidT(t) || t === T.PLAT) return ty * TS;
      }
      return null;
    }
    cellAt(px, py) {
      for (const c of this.cells) if (px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h) return c;
      return null;
    }

    // ------------------------------------------------------------ finalize
    finalize() {
      this.computeDepth();
      this.buildMap();
      this.revealed = new Uint8Array(this.cells.length);
      this.animDecos = this.decos.filter((d) => ANIM_DECOS.has(d.type));
    }
    computeDepth() {
      const w = this.w, h = this.h;
      const D = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) D[i] = isSolidT(this.tiles[i]) ? 9 : 0;
      for (let pass = 0; pass < 4; pass++) {
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (D[i] === 0) continue;
            let m = 9;
            if (x > 0) m = Math.min(m, D[i - 1]);
            if (x < w - 1) m = Math.min(m, D[i + 1]);
            if (y > 0) m = Math.min(m, D[i - w]);
            if (y < h - 1) m = Math.min(m, D[i + w]);
            D[i] = Math.min(D[i], m + 1);
          }
      }
      this.depth = D;
    }
    invalidate(tx, ty) {
      // recompute local depth & mark chunks dirty
      if (this.depth) {
        for (let y = ty - 4; y <= ty + 4; y++)
          for (let x = tx - 4; x <= tx + 4; x++) {
            if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
            const i = y * this.w + x;
            if (!isSolidT(this.tiles[i])) { this.depth[i] = 0; continue; }
            let m = 9;
            for (let yy = -4; yy <= 4; yy++)
              for (let xx = -4; xx <= 4; xx++) {
                const X = x + xx, Y = y + yy;
                if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue;
                if (!isSolidT(this.tiles[Y * this.w + X])) m = Math.min(m, Math.abs(xx) + Math.abs(yy));
              }
            this.depth[i] = m;
          }
      }
      for (let y = ty - 5; y <= ty + 5; y += 5)
        for (let x = tx - 5; x <= tx + 5; x += 5) {
          const key = Math.floor(x / CHUNK) + ',' + Math.floor(y / CHUNK);
          this.chunks.delete(key);
        }
      if (this.mapCanvas) this.drawMapTile(tx, ty);
    }

    // ------------------------------------------------------------ rendering
    getChunk(cx, cy) {
      const key = cx + ',' + cy;
      let c = this.chunks.get(key);
      if (!c) {
        c = this.renderChunk(cx, cy);
        this.chunks.set(key, c);
      }
      return c;
    }
    renderChunk(cx, cy) {
      const cv = G.makeCanvas(CHUNK * TS, CHUNK * TS);
      const ctx = cv.ctx;
      const st = this.style;
      const tx0 = cx * CHUNK, ty0 = cy * CHUNK;
      for (let ty = ty0; ty < ty0 + CHUNK; ty++) {
        if (ty >= this.h) break;
        for (let tx = tx0; tx < tx0 + CHUNK; tx++) {
          if (tx >= this.w) break;
          const t = this.get(tx, ty);
          const px = (tx - tx0) * TS, py = (ty - ty0) * TS;
          if (!isSolidT(t) && this.getBack(tx, ty)) drawBack(ctx, px, py, tx, ty, this, st);
          if (isSolidT(t)) drawSolid(ctx, px, py, tx, ty, t, this, st);
          else if (t === T.PLAT) drawPlatform(ctx, px, py, tx, ty, this, st);
          else if (t === T.LADDER) drawLadder(ctx, px, py, tx, ty, this, st);
          else if (t === T.VINE) drawVine(ctx, px, py, tx, ty, this);
          else if (t === T.HAZARD) drawHazard(ctx, px, py, tx, ty, this, st);
        }
      }
      // static decorations
      const x0 = tx0 * TS, y0 = ty0 * TS, x1 = x0 + CHUNK * TS, y1 = y0 + CHUNK * TS;
      for (const d of this.decos) {
        if (ANIM_DECOS.has(d.type)) continue;
        if (d.x + (d.w || 32) < x0 - 16 || d.x - 32 > x1 || d.y + (d.h || 48) < y0 - 16 || d.y - 64 > y1) continue;
        drawStaticDeco(ctx, d, d.x - x0, d.y - y0, this, st);
      }
      return cv;
    }
    draw(ctx, camX, camY) {
      const cx0 = Math.floor(camX / (CHUNK * TS)), cy0 = Math.floor(camY / (CHUNK * TS));
      const cx1 = Math.floor((camX + G.W) / (CHUNK * TS)), cy1 = Math.floor((camY + G.H) / (CHUNK * TS));
      let built = 0;
      for (let cy = cy0; cy <= cy1; cy++)
        for (let cx = cx0; cx <= cx1; cx++) {
          if (cx < 0 || cy < 0 || cx * CHUNK >= this.w || cy * CHUNK >= this.h) continue;
          const key = cx + ',' + cy;
          let c = this.chunks.get(key);
          if (!c) { c = this.renderChunk(cx, cy); this.chunks.set(key, c); built++; }
          ctx.drawImage(c, cx * CHUNK * TS - camX, cy * CHUNK * TS - camY);
        }
      // pre-build a neighbour chunk per frame to avoid hitches
      if (!built) {
        for (let cy = cy0 - 1; cy <= cy1 + 1; cy++)
          for (let cx = cx0 - 1; cx <= cx1 + 1; cx++) {
            if (cx < 0 || cy < 0 || cx * CHUNK >= this.w || cy * CHUNK >= this.h) continue;
            const key = cx + ',' + cy;
            if (!this.chunks.has(key)) { this.chunks.set(key, this.renderChunk(cx, cy)); return; }
          }
      }
    }
    drawAnimDecos(ctx, camX, camY, t) {
      const st = this.style;
      for (const d of this.animDecos) {
        const x = d.x - camX, y = d.y - camY;
        if (x < -60 || y < -80 || x > G.W + 60 || y > G.H + 80) continue;
        drawAnimDeco(ctx, d, x, y, t, st, this);
      }
    }
    breakAt(tx, ty) {
      const t = this.get(tx, ty);
      if (t !== T.BREAK && t !== T.RAM) return false;
      this.set(tx, ty, T.AIR);
      const col = this.style.tile.base;
      G.fx.burst(tx * TS + 8, ty * TS + 8, 10, { color: [col, this.style.tile.light, this.style.tile.dark], speed: 140, life: 0.7, size: 2, grav: 500, collide: true, type: 'px' });
      G.fx.burst(tx * TS + 8, ty * TS + 8, 4, { color: '#888', speed: 30, life: 0.8, size: 5, size2: 10, type: 'smoke' });
      return true;
    }

    // ------------------------------------------------------------ map
    buildMap() {
      this.mapCanvas = G.makeCanvas(this.w, this.h);
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.drawMapTile(x, y, true);
    }
    drawMapTile(x, y, noClear) {
      const c = this.mapCanvas.ctx;
      const t = this.get(x, y);
      if (!noClear) c.clearRect(x, y, 1, 1);
      let col = null;
      if (isSolidT(t)) {
        // edge solid visible, deep solid transparent
        const d = this.depth ? this.depth[y * this.w + x] : 1;
        if (d <= 1) col = t === T.BREAK ? '#7a6a8a' : t === T.RAM ? '#b0703a' : t === T.GRIP ? '#8a7ab8' : '#a8a4b8';
      } else if (t === T.PLAT) col = '#8a7050';
      else if (t === T.LADDER) col = '#a08050';
      else if (t === T.VINE) col = '#5fae4a';
      else if (t === T.HAZARD) col = '#c04040';
      else col = '#23202e';
      if (col) {
        c.fillStyle = col;
        c.fillRect(x, y, 1, 1);
      }
    }
  }
  G.Level = Level;
  G.CHUNK = CHUNK;

  // ================================================================ tile painters
  function h(tx, ty, s) {
    return G.hash(tx, ty, s || 0);
  }
  function R(ctx, x, y, w, hh, col) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, hh);
  }

  function drawSolid(ctx, px, py, tx, ty, t, L, st) {
    const S = st.tile;
    const d = L.depth ? L.depth[ty * L.w + tx] : 1;
    if (d >= 3) {
      R(ctx, px, py, TS, TS, S.deep);
      if (h(tx, ty, 7) < 0.12) R(ctx, px + ((h(tx, ty, 8) * 10) | 0), py + ((h(tx, ty, 9) * 14) | 0), 4, 1, G.mix(S.deep, S.dark, 0.18));
      return;
    }
    const base = d === 2 ? G.mix(S.base, S.deep, 0.62) : S.base;
    const dark = d === 2 ? G.mix(S.dark, S.deep, 0.62) : S.dark;
    const light = d === 2 ? G.mix(S.light, S.deep, 0.62) : S.light;
    PATTERNS[S.pattern](ctx, px, py, tx, ty, base, dark, light, S);
    if (t === T.BREAK) {
      // cracks
      ctx.fillStyle = S.deep;
      const s = h(tx, ty, 3);
      for (let i = 0; i < 6; i++) ctx.fillRect(px + 3 + i * 2, py + 3 + Math.round(Math.sin(i + s * 6) * 3) + i, 1, 2);
      ctx.fillRect(px + 8, py + 2, 1, 5);
      ctx.fillRect(px + 5, py + 10, 5, 1);
    }
    if (t === T.RAM) {
      R(ctx, px, py, TS, TS, G.mix(S.base, '#402010', 0.4));
      ctx.fillStyle = '#ff8a3a';
      ctx.fillRect(px + 7, py + 3, 2, 10);
      ctx.fillRect(px + 4, py + 6, 8, 2);
      ctx.fillStyle = S.deep;
      ctx.fillRect(px + 1, py + 1, 3, 1); ctx.fillRect(px + 12, py + 13, 3, 1); ctx.fillRect(px + 2, py + 12, 1, 3);
    }
    if (t === T.GRIP) {
      ctx.fillStyle = '#8a70d0';
      for (let i = 0; i < 3; i++) ctx.fillRect(px + ((h(tx, ty, i) * 14) | 0), py + i * 5 + 1, 2, 2);
    }
    if (d > 1) return;
    // exposure
    const up = !isSolidT(L.get(tx, ty - 1));
    const dn = !isSolidT(L.get(tx, ty + 1));
    const lf = !isSolidT(L.get(tx - 1, ty));
    const rt = !isSolidT(L.get(tx + 1, ty));
    if (lf) { R(ctx, px, py, 1, TS, light); R(ctx, px + 1, py, 1, TS, G.mix(light, base, 0.5)); }
    if (rt) { R(ctx, px + TS - 1, py, 1, TS, dark); }
    if (dn) {
      R(ctx, px, py + TS - 2, TS, 2, dark);
      R(ctx, px, py + TS - 1, TS, 1, S.deep);
      if (S.rimKind === 'weed' || S.rimKind === 'grass' || S.rimKind === 'glow') {
        // hanging roots / weeds
        const n = (h(tx, ty, 5) * 3) | 0;
        for (let i = 0; i < n; i++) {
          const x = px + 2 + ((h(tx, ty, 10 + i) * 12) | 0);
          const len = 2 + ((h(tx, ty, 20 + i) * 5) | 0);
          R(ctx, x, py + TS, 1, len, S.rimKind === 'glow' ? G.mix(S.rim, S.dark, 0.5) : G.mix(S.rim, S.dark, 0.4));
        }
      }
    }
    if (up) {
      R(ctx, px, py, TS, 2, light);
      R(ctx, px, py + 2, TS, 1, G.mix(light, base, 0.5));
      rim(ctx, px, py, tx, ty, S, lf, rt);
    }
  }
  function rim(ctx, px, py, tx, ty, S, lf, rt) {
    const k = S.rimKind;
    if (k === 'none') return;
    if (k === 'gold') {
      R(ctx, px, py, TS, 1, S.rim);
      R(ctx, px, py + 3, TS, 1, G.mix(S.rim, S.base, 0.6));
      return;
    }
    const col = S.rim, col2 = G.shade(S.rim, -0.3), col3 = G.shade(S.rim, 0.25);
    R(ctx, px, py - 1, TS, 3, col);
    R(ctx, px, py + 2, TS, 1, col2);
    for (let i = 0; i < TS; i += 2) {
      const r = h(tx * 16 + i, ty, 11);
      if (k === 'grass') {
        if (r < 0.55) R(ctx, px + i, py - 2 - ((r * 4) | 0), 1, 2 + ((r * 4) | 0), r < 0.2 ? col3 : col);
      } else if (k === 'moss') {
        if (r < 0.3) R(ctx, px + i, py + 3, 2, 1 + ((r * 6) | 0), col2);
      } else if (k === 'weed') {
        if (r < 0.25) R(ctx, px + i, py - 3, 1, 3, col3);
        if (r > 0.7) R(ctx, px + i, py + 3, 1, 2, col2);
      } else if (k === 'glow') {
        if (r < 0.18) { R(ctx, px + i, py - 3, 2, 2, col3); R(ctx, px + i, py - 1, 1, 1, '#ffffff'); }
      }
    }
    if (lf) R(ctx, px - 1, py - 1, 1, 4, col2);
    if (rt) R(ctx, px + TS, py - 1, 1, 4, col2);
  }

  const PATTERNS = {
    brick(ctx, px, py, tx, ty, base, dark, light) {
      R(ctx, px, py, TS, TS, base);
      for (let row = 0; row < 2; row++) {
        const y = py + row * 8;
        const off = ((ty * 2 + row) % 2) * 8;
        R(ctx, px, y + 7, TS, 1, dark);
        for (let bx = -8 + off; bx < TS; bx += 16) {
          const x = px + bx;
          if (bx >= 0) R(ctx, x, y, 1, 7, dark);
          const v = h(tx * 3 + bx, ty * 2 + row, 1);
          if (v < 0.3) R(ctx, Math.max(px, x + 1), y, Math.min(15, px + TS - Math.max(px, x + 1)), 7, G.mix(base, dark, 0.25));
          else if (v > 0.8) R(ctx, Math.max(px, x + 1), y, Math.min(15, px + TS - Math.max(px, x + 1)), 1, G.mix(base, light, 0.4));
        }
      }
    },
    stone(ctx, px, py, tx, ty, base, dark, light) {
      R(ctx, px, py, TS, TS, base);
      const v = h(tx >> 1, ty >> 1, 2);
      const sx = (tx & 1) * 16, sy = (ty & 1) * 16;
      // 2x2 super-tile with irregular stones
      const splitX = 10 + ((v * 12) | 0), splitY = 12 + ((h(tx >> 1, ty >> 1, 3) * 8) | 0);
      if (splitX >= sx && splitX < sx + 16) R(ctx, px + splitX - sx, py, 1, TS, dark);
      if (splitY >= sy && splitY < sy + 16) R(ctx, px, py + splitY - sy, TS, 1, dark);
      if (h(tx, ty, 4) < 0.4) R(ctx, px + 3, py + 4, 4, 1, G.mix(base, light, 0.5));
      if (h(tx, ty, 5) < 0.3) R(ctx, px + 9, py + 10, 3, 2, G.mix(base, dark, 0.4));
      if (h(tx, ty, 6) < 0.2) R(ctx, px + 2, py + 12, 2, 2, G.mix(base, '#5a8a6a', 0.3));
    },
    block(ctx, px, py, tx, ty, base, dark, light) {
      const v = h(tx, ty, 1);
      const b = v < 0.3 ? G.mix(base, dark, 0.15) : v > 0.85 ? G.mix(base, light, 0.12) : base;
      R(ctx, px, py, TS, TS, b);
      R(ctx, px, py, TS, 1, G.mix(b, light, 0.5));
      R(ctx, px, py, 1, TS, G.mix(b, light, 0.3));
      R(ctx, px, py + TS - 1, TS, 1, dark);
      R(ctx, px + TS - 1, py, 1, TS, dark);
      if (h(tx, ty, 2) < 0.25) { R(ctx, px + 4, py + 5, 1, 4, G.mix(b, dark, 0.5)); R(ctx, px + 5, py + 8, 3, 1, G.mix(b, dark, 0.5)); }
    },
    earth(ctx, px, py, tx, ty, base, dark, light) {
      R(ctx, px, py, TS, TS, base);
      for (let i = 0; i < 6; i++) {
        const r = h(tx * 7 + i, ty * 5, 3);
        R(ctx, px + ((r * 15) | 0), py + ((h(tx, ty * 3 + i, 4) * 15) | 0), 1 + (r > 0.7 ? 1 : 0), 1, r < 0.5 ? dark : light);
      }
      if (h(tx, ty, 9) < 0.25) { R(ctx, px + 2, py + 9, 6, 1, dark); R(ctx, px + 7, py + 10, 5, 1, dark); }
      if (h(tx, ty, 10) < 0.15) R(ctx, px + 9, py + 3, 3, 3, G.mix(light, '#888', 0.4));
    },
    cave(ctx, px, py, tx, ty, base, dark, light) {
      R(ctx, px, py, TS, TS, base);
      for (let i = 0; i < 5; i++) {
        const r = h(tx * 5 + i, ty * 3 + i, 12);
        const w = 2 + ((r * 5) | 0);
        R(ctx, px + ((h(tx, ty, 20 + i) * (16 - w)) | 0), py + ((h(tx, ty, 30 + i) * 15) | 0), w, 1, r < 0.5 ? dark : G.mix(base, light, 0.5));
      }
      if (h(tx, ty, 40) < 0.3) { R(ctx, px + 5, py + 2, 1, 6, dark); R(ctx, px + 6, py + 7, 1, 4, dark); }
    },
    marble(ctx, px, py, tx, ty, base, dark, light) {
      R(ctx, px, py, TS, TS, base);
      const v = h(tx, ty, 2);
      ctx.fillStyle = G.mix(base, light, 0.45);
      for (let i = 0; i < 16; i++) {
        const y = Math.round(8 + Math.sin(i * 0.4 + v * 10 + tx) * 5);
        if (h(tx * 16 + i, ty, 3) < 0.7) ctx.fillRect(px + i, py + y, 1, 1);
      }
      R(ctx, px, py + TS - 1, TS, 1, G.mix(base, dark, 0.6));
      if ((tx + ty) % 3 === 0) R(ctx, px + TS - 1, py, 1, TS, G.mix(base, dark, 0.4));
    },
    bone(ctx, px, py, tx, ty, base, dark, light) {
      R(ctx, px, py, TS, TS, G.mix(base, dark, 0.4));
      const v = h(tx, ty, 2);
      if (v < 0.25) {
        // skull
        R(ctx, px + 4, py + 3, 8, 7, light);
        R(ctx, px + 5, py + 10, 6, 2, light);
        R(ctx, px + 5, py + 5, 2, 2, dark);
        R(ctx, px + 9, py + 5, 2, 2, dark);
        R(ctx, px + 7, py + 8, 2, 1, dark);
      } else {
        for (let i = 0; i < 3; i++) {
          const r = h(tx, ty * 3 + i, 5);
          const y = py + 2 + i * 5;
          const x = px + ((r * 6) | 0);
          R(ctx, x, y, 9, 2, i % 2 ? base : light);
          R(ctx, x - 1, y - 1, 2, 4, light);
          R(ctx, x + 8, y - 1, 2, 4, light);
        }
      }
    },
  };

  function drawBack(ctx, px, py, tx, ty, L, st) {
    const S = st.back;
    const p = S.pattern;
    const base = S.base, dark = S.dark, light = S.light;
    switch (p) {
      case 'brick':
        R(ctx, px, py, TS, TS, base);
        for (let row = 0; row < 2; row++) {
          const y = py + row * 8, off = ((ty * 2 + row) % 2) * 8;
          R(ctx, px, y + 7, TS, 1, dark);
          for (let bx = off; bx < TS; bx += 16) R(ctx, px + bx, y, 1, 7, dark);
        }
        break;
      case 'block':
        R(ctx, px, py, TS, TS, base);
        R(ctx, px, py + TS - 1, TS, 1, dark);
        if ((tx + (ty % 2) * 1) % 2 === 0) R(ctx, px + TS - 1, py, 1, TS, dark);
        if (h(tx, ty, 5) < 0.12) R(ctx, px + 3, py + 4, 6, 1, light);
        break;
      case 'plank':
        R(ctx, px, py, TS, TS, base);
        R(ctx, px + 7, py, 1, TS, dark);
        R(ctx, px + 15, py, 1, TS, dark);
        if (ty % 4 === 0) { R(ctx, px, py + 3, TS, 1, dark); R(ctx, px + 3, py + 3, 1, 1, light); R(ctx, px + 11, py + 3, 1, 1, light); }
        if (h(tx, ty, 2) < 0.2) R(ctx, px + 2, py + 6, 3, 1, G.mix(base, light, 0.5));
        break;
      case 'hedge':
        R(ctx, px, py, TS, TS, base);
        for (let i = 0; i < 8; i++) {
          const r = h(tx * 8 + i, ty, 3);
          R(ctx, px + ((r * 14) | 0), py + ((h(tx, ty * 8 + i, 4) * 14) | 0), 3, 2, r < 0.5 ? dark : light);
        }
        break;
      case 'cave':
        R(ctx, px, py, TS, TS, base);
        for (let i = 0; i < 3; i++) {
          const r = h(tx * 3 + i, ty, 7);
          R(ctx, px + ((r * 12) | 0), py + ((h(tx, ty * 3 + i, 8) * 15) | 0), 4, 1, r < 0.5 ? dark : light);
        }
        break;
      case 'gothic': {
        R(ctx, px, py, TS, TS, base);
        const col = ((tx % 6) + 6) % 6;
        if (col === 0) R(ctx, px + 4, py, 8, TS, dark);
        if (col === 0) R(ctx, px + 5, py, 1, TS, light);
        if (ty % 8 === 0) R(ctx, px, py + 12, TS, 2, dark);
        break;
      }
      case 'catacomb': {
        R(ctx, px, py, TS, TS, base);
        const cx = ((tx % 3) + 3) % 3, cy = ((ty % 3) + 3) % 3;
        if (cx === 1 && cy === 1) {
          R(ctx, px + 2, py + 3, 12, 11, dark);
          if (h(tx, ty, 5) < 0.6) { R(ctx, px + 5, py + 7, 6, 5, light); R(ctx, px + 6, py + 9, 1, 1, dark); R(ctx, px + 9, py + 9, 1, 1, dark); }
        }
        if (cy === 0) R(ctx, px, py + 15, TS, 1, dark);
        break;
      }
      default:
        R(ctx, px, py, TS, TS, base);
    }
    // soft darkening near solids gives depth
    if (L.isSolid(tx, ty - 1)) R(ctx, px, py, TS, 3, 'rgba(0,0,0,0.35)');
    if (L.isSolid(tx - 1, ty)) R(ctx, px, py, 3, TS, 'rgba(0,0,0,0.25)');
  }
  function drawPlatform(ctx, px, py, tx, ty, L, st) {
    const P = st.plat;
    R(ctx, px, py, TS, 4, P.base);
    R(ctx, px, py, TS, 1, G.shade(P.base, 0.25));
    R(ctx, px, py + 4, TS, 1, P.dark);
    if (tx % 2 === 0) R(ctx, px + 15, py, 1, 4, P.dark);
    // support struts at ends
    const lfP = L.get(tx - 1, ty) === T.PLAT, rtP = L.get(tx + 1, ty) === T.PLAT;
    if (!lfP) { R(ctx, px + 1, py + 5, 2, 4, P.dark); R(ctx, px + 3, py + 8, 2, 2, P.dark); }
    if (!rtP) { R(ctx, px + 13, py + 5, 2, 4, P.dark); R(ctx, px + 11, py + 8, 2, 2, P.dark); }
  }
  function drawLadder(ctx, px, py, tx, ty, L, st) {
    const P = st.plat;
    R(ctx, px + 2, py, 2, TS, P.dark);
    R(ctx, px + 12, py, 2, TS, P.dark);
    R(ctx, px + 2, py, 1, TS, P.base);
    R(ctx, px + 12, py, 1, TS, P.base);
    for (let i = 2; i < TS; i += 5) R(ctx, px + 4, py + i, 8, 2, P.base);
    if (!isLadderT(L.get(tx, ty - 1))) R(ctx, px, py, TS, 3, P.base);
  }
  function drawVine(ctx, px, py, tx, ty, L) {
    R(ctx, px + 6, py, 4, TS, '#2f6a2a');
    R(ctx, px + 7, py, 1, TS, '#5fae4a');
    for (let i = 0; i < 3; i++) {
      const y = py + i * 5 + ((tx + ty) % 3);
      R(ctx, px + (i % 2 ? 10 : 2), y, 4, 2, '#4f9a3a');
      R(ctx, px + (i % 2 ? 12 : 2), y, 2, 1, '#8ae070');
    }
  }
  function drawHazard(ctx, px, py, tx, ty, L, st) {
    const k = st.hazard;
    if (k === 'spikes' || k === 'bones') {
      const c1 = k === 'bones' ? '#c8bea8' : '#8a8a9a', c2 = k === 'bones' ? '#8a8270' : '#50505e';
      for (let i = 0; i < 4; i++) {
        const x = px + i * 4;
        R(ctx, x + 1, py + 8, 2, 8, c2);
        R(ctx, x + 1, py + 6, 1, 2, c1);
        R(ctx, x + 1, py + 8, 1, 6, c1);
      }
      R(ctx, px, py + 14, TS, 2, c2);
    } else if (k === 'thorns') {
      R(ctx, px, py + 10, TS, 6, '#2a3a1e');
      for (let i = 0; i < 5; i++) {
        const x = px + ((h(tx * 5 + i, ty, 1) * 14) | 0);
        R(ctx, x, py + 5 + ((h(tx, ty, i) * 4) | 0), 1, 6, '#6a8a3a');
        R(ctx, x + 1, py + 7, 1, 1, '#c8e060');
      }
    } else {
      // brine
      R(ctx, px, py + 8, TS, 8, '#1e5a54');
      R(ctx, px, py + 8, TS, 1, '#6ae0c0');
      R(ctx, px + ((h(tx, ty, 1) * 12) | 0), py + 11, 3, 1, '#3a8a7a');
    }
  }

  // ================================================================ decorations
  const ANIM_DECOS = new Set(['torch', 'candle', 'lantern', 'mushroom', 'crystal', 'window', 'brazierDeco', 'glowvine', 'bigbell', 'lanternTop', 'waterfall', 'fire']);
  G.ANIM_DECOS = ANIM_DECOS;
  function drawStaticDeco(ctx, d, x, y, L, st) {
    const S = st.tile;
    switch (d.type) {
      case 'chain': {
        for (let i = 0; i < d.len; i++) {
          const yy = y + i * 4;
          R(ctx, x, yy, 2, 3, i % 2 ? '#5a5a66' : '#6e6e7a');
          R(ctx, x, yy + 3, 2, 1, '#2a2a30');
        }
        if (d.hook) { R(ctx, x - 1, y + d.len * 4, 4, 2, '#6e6e7a'); R(ctx, x + 2, y + d.len * 4 - 2, 1, 3, '#6e6e7a'); }
        break;
      }
      case 'rope':
        for (let i = 0; i < d.len * 4; i++) R(ctx, x + Math.round(Math.sin(i * 0.2) * 0.6), y + i, 1, 1, i % 3 ? '#8a7050' : '#6a5038');
        break;
      case 'bars':
        R(ctx, x, y, 24, 2, '#3a3a44');
        R(ctx, x, y + 22, 24, 2, '#3a3a44');
        for (let i = 0; i < 5; i++) { R(ctx, x + 1 + i * 5, y, 2, 24, '#4a4a56'); R(ctx, x + 1 + i * 5, y, 1, 24, '#6a6a76'); }
        break;
      case 'cobweb': {
        ctx.fillStyle = 'rgba(210,210,220,0.35)';
        const s = d.flip ? -1 : 1;
        for (let i = 0; i < 10; i++) { ctx.fillRect(x + s * i, y + i, 1, 1); ctx.fillRect(x + s * i, y, 1, 1); ctx.fillRect(x, y + i, 1, 1); }
        for (let r = 3; r <= 9; r += 3) for (let i = 0; i <= r; i++) ctx.fillRect(x + s * i, y + r - Math.round(i * 0.9), 1, 1);
        break;
      }
      case 'bones':
        R(ctx, x, y - 2, 7, 2, '#c8bea8');
        R(ctx, x - 1, y - 3, 2, 3, '#d8cfb8');
        R(ctx, x + 6, y - 3, 2, 3, '#d8cfb8');
        if (d.v > 0.5) { R(ctx, x + 9, y - 5, 5, 5, '#d8cfb8'); R(ctx, x + 10, y - 4, 1, 1, '#3a3228'); R(ctx, x + 12, y - 4, 1, 1, '#3a3228'); }
        break;
      case 'skull':
        R(ctx, x, y - 6, 6, 5, '#d8cfb8');
        R(ctx, x + 1, y - 1, 4, 1, '#c8bea8');
        R(ctx, x + 1, y - 4, 1, 2, '#2a2218');
        R(ctx, x + 4, y - 4, 1, 2, '#2a2218');
        break;
      case 'banner': {
        const c = d.color || '#6a2030';
        R(ctx, x - 2, y, 16, 2, '#6a5030');
        R(ctx, x, y + 2, 12, d.len * 8, c);
        R(ctx, x, y + 2, 1, d.len * 8, G.shade(c, 0.2));
        R(ctx, x + 11, y + 2, 1, d.len * 8, G.shade(c, -0.3));
        for (let i = 0; i < 6; i++) R(ctx, x + i * 2, y + 2 + d.len * 8, 1, 3 - (i % 2) * 2 + 1, c);
        R(ctx, x + 4, y + 6, 4, 4, '#d8b060');
        R(ctx, x + 5, y + 4, 2, 8, '#d8b060');
        break;
      }
      case 'grass': {
        const c = S.rim;
        for (let i = 0; i < 6; i++) {
          const hh = 2 + ((G.hash(d.x + i, d.y, 1) * 5) | 0);
          R(ctx, x + i * 2, y - hh, 1, hh, i % 2 ? c : G.shade(c, -0.2));
        }
        break;
      }
      case 'flower': {
        R(ctx, x + 1, y - 6, 1, 6, '#3a6a2a');
        const c = d.v < 0.33 ? '#d04a8a' : d.v < 0.66 ? '#e0d060' : '#b060e0';
        R(ctx, x, y - 8, 3, 3, c);
        R(ctx, x + 1, y - 7, 1, 1, '#fff0a0');
        break;
      }
      case 'weed':
        for (let i = 0; i < d.len * 4; i++) R(ctx, x + Math.round(Math.sin(i * 0.35) * 1.5), y + i, 2, 1, i % 4 ? '#2f6a5a' : '#4f9a7a');
        break;
      case 'vine':
        for (let i = 0; i < d.len * 4; i++) {
          R(ctx, x + Math.round(Math.sin(i * 0.25 + d.v * 5) * 2), y + i, 1, 1, '#3a6a2a');
          if (i % 6 === 3) R(ctx, x + Math.round(Math.sin(i * 0.25 + d.v * 5) * 2) + 1, y + i, 2, 2, '#5a9a3a');
        }
        break;
      case 'net':
        ctx.fillStyle = 'rgba(160,140,110,0.5)';
        for (let i = 0; i < 20; i += 4) { ctx.fillRect(x + i, y, 1, 20); ctx.fillRect(x, y + i, 20, 1); }
        break;
      case 'weaponrack':
        R(ctx, x, y - 20, 18, 2, '#5a4030');
        R(ctx, x, y - 4, 18, 2, '#5a4030');
        R(ctx, x + 3, y - 24, 1, 22, '#9aa0a8');
        R(ctx, x + 8, y - 26, 1, 24, '#6a5038');
        R(ctx, x + 7, y - 28, 3, 3, '#b0b8c0');
        R(ctx, x + 13, y - 22, 2, 20, '#8a8a96');
        break;
      case 'statue':
        R(ctx, x, y - 6, 20, 6, S.dark);
        R(ctx, x + 1, y - 7, 18, 1, S.light);
        R(ctx, x + 6, y - 30, 8, 24, S.base);
        R(ctx, x + 7, y - 36, 6, 6, S.base);
        R(ctx, x + 4, y - 26, 3, 12, S.base);
        R(ctx, x + 13, y - 26, 3, 12, S.base);
        R(ctx, x + 6, y - 30, 1, 24, S.light);
        R(ctx, x + 8, y - 40, 4, 4, '#d8b060');
        break;
      case 'crateStatic':
        R(ctx, x, y - 14, 14, 14, '#6a4a30');
        R(ctx, x, y - 14, 14, 2, '#8a6a48');
        R(ctx, x + 1, y - 12, 1, 12, '#4a3020');
        R(ctx, x + 12, y - 12, 1, 12, '#4a3020');
        break;
      case 'sign': {
        R(ctx, x + 7, y - 20, 2, 20, '#5a4030');
        R(ctx, x - 6, y - 30, 28, 12, '#6a4a30');
        R(ctx, x - 6, y - 30, 28, 1, '#8a6a48');
        R(ctx, x - 6, y - 19, 28, 1, '#3a2818');
        break;
      }
      case 'archway': {
        // big doorway frame (exits / entrance)
        const c = S.light, c2 = S.dark;
        R(ctx, x - 22, y - 60, 8, 60, c2);
        R(ctx, x + 14, y - 60, 8, 60, c2);
        R(ctx, x - 22, y - 66, 44, 8, c2);
        R(ctx, x - 21, y - 60, 1, 60, c);
        R(ctx, x + 15, y - 60, 1, 60, c);
        R(ctx, x - 22, y - 66, 44, 1, c);
        break;
      }
      case 'painting':
        R(ctx, x, y, 22, 28, '#6a5028');
        R(ctx, x + 2, y + 2, 18, 24, '#3a4a5a');
        R(ctx, x + 7, y + 6, 8, 8, '#d8c8b0');
        R(ctx, x + 6, y + 14, 10, 12, '#8a3a5a');
        break;
    }
  }
  function drawAnimDeco(ctx, d, x, y, t, st, L) {
    const lc = st.lightColor;
    switch (d.type) {
      case 'torch': {
        R(ctx, x - 1, y, 4, 8, '#4a3a2a');
        R(ctx, x - 3, y - 1, 8, 2, '#5a4a3a');
        const f = Math.sin(t * 12 + d.v * 20) * 0.5 + 0.5;
        const col = d.color || lc;
        R(ctx, x - 1, y - 5 - (f * 2 | 0), 4, 5, col);
        R(ctx, x, y - 7 - (f * 3 | 0), 2, 4, G.shade(col, 0.4));
        R(ctx, x, y - 3, 2, 2, '#ffffff');
        G.addLight(d.x + 1, d.y - 4, 110 + f * 14, col, 1);
        if (Math.random() < 0.05) G.fx.spawn({ x: d.x + 1 + (Math.random() - 0.5) * 3, y: d.y - 8, vx: (Math.random() - 0.5) * 10, vy: -30, life: 0.8, color: col, size: 1, type: 'px', add: true });
        break;
      }
      case 'candle': {
        R(ctx, x, y - 6, 3, 6, '#e8e0c8');
        R(ctx, x + 2, y - 6, 1, 6, '#b8b098');
        const f = Math.sin(t * 15 + d.v * 30) * 0.5 + 0.5;
        R(ctx, x + 1, y - 9 - (f | 0), 1, 3, '#ffd070');
        R(ctx, x + 1, y - 8, 1, 1, '#ffffff');
        G.addLight(d.x + 1, d.y - 8, 50 + f * 6, '#ffc060', 0.8);
        break;
      }
      case 'lantern': {
        const sw = Math.sin(t * 1.5 + d.v * 10) * 0.12;
        const len = d.len || 2;
        const ex = x + Math.sin(sw) * len * 8, ey = y + Math.cos(sw) * len * 8;
        G.pixLine(ctx, x, y, ex, ey, '#3a3a3a');
        R(ctx, ex - 3, ey, 7, 2, '#3a3028');
        R(ctx, ex - 3, ey + 2, 7, 7, '#e0a040');
        R(ctx, ex - 2, ey + 3, 5, 5, '#ffe090');
        R(ctx, ex - 3, ey + 9, 7, 1, '#3a3028');
        G.addLight(d.x + (ex - x), d.y + (ey - y) + 5, 100, '#ffc870', 1);
        break;
      }
      case 'mushroom': {
        const pulse = Math.sin(t * 2 + d.v * 10) * 0.5 + 0.5;
        const cap = d.v < 0.5 ? '#40e0d0' : '#c070ff';
        const s = d.big ? 2 : 1;
        R(ctx, x + 2 * s, y - 5 * s, 2 * s, 5 * s, '#d8d0c0');
        R(ctx, x, y - 8 * s, 6 * s, 3 * s, cap);
        R(ctx, x + 1 * s, y - 9 * s, 4 * s, 1 * s, G.shade(cap, 0.4));
        R(ctx, x + 1, y - 7 * s, 1, 1, '#ffffff');
        G.addLight(d.x + 3 * s, d.y - 7 * s, (d.big ? 70 : 40) + pulse * 16, cap, 0.7 + pulse * 0.3);
        break;
      }
      case 'crystal': {
        const pulse = Math.sin(t * 1.3 + d.v * 10) * 0.5 + 0.5;
        const c = d.v < 0.5 ? '#80f0ff' : '#e090ff';
        ctx.fillStyle = G.shade(c, -0.3);
        ctx.fillRect(x, y - 10, 4, 10);
        ctx.fillStyle = c;
        ctx.fillRect(x + 1, y - 13, 3, 12);
        ctx.fillRect(x + 4, y - 7, 3, 7);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 2, y - 12, 1, 4);
        G.addLight(d.x + 3, d.y - 6, 60 + pulse * 14, c, 0.8);
        break;
      }
      case 'window': {
        // arched window with a light shaft
        const glass = d.color || '#3a4a6a';
        R(ctx, x - 1, y - 1, 18, 34, '#2a2432');
        R(ctx, x, y + 4, 16, 28, glass);
        R(ctx, x + 2, y + 1, 12, 4, glass);
        R(ctx, x + 7, y + 1, 2, 31, '#2a2432');
        R(ctx, x, y + 16, 16, 2, '#2a2432');
        if (d.stained) {
          R(ctx, x + 1, y + 5, 6, 10, '#a04060'); R(ctx, x + 9, y + 5, 6, 10, '#4060a0');
          R(ctx, x + 1, y + 18, 6, 13, '#40a060'); R(ctx, x + 9, y + 18, 6, 13, '#c0a040');
        } else {
          R(ctx, x + 2, y + 6, 2, 8, G.shade(glass, 0.3));
        }
        const pulse = Math.sin(t * 0.7 + d.v * 5) * 0.1 + 0.9;
        ctx.globalCompositeOperation = 'lighter';
        const shaft = ctx.createLinearGradient(0, y, 0, y + 90);
        shaft.addColorStop(0, d.stained ? 'rgba(255,208,160,0.09)' : 'rgba(160,192,255,0.07)');
        shaft.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = pulse;
        ctx.fillStyle = shaft;
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.lineTo(x + 16, y + 4);
        ctx.lineTo(x + 40, y + 90);
        ctx.lineTo(x + 14, y + 90);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        G.addLight(d.x + 8, d.y + 16, 70, d.stained ? '#ffd0a0' : '#a0c0ff', 0.7);
        break;
      }
      case 'glowvine': {
        const pulse = Math.sin(t * 2 + d.v * 7) * 0.5 + 0.5;
        for (let i = 0; i < d.len * 4; i++) R(ctx, x + Math.round(Math.sin(i * 0.3 + t + d.v * 6)), y + i, 1, 1, '#3aa088');
        R(ctx, x - 1, y + d.len * 4, 3, 3, '#6affe0');
        G.addLight(d.x, d.y + d.len * 4, 30 + pulse * 10, '#6affe0', 0.8);
        break;
      }
      case 'brazierDeco': {
        R(ctx, x - 6, y - 10, 12, 4, '#6a5a4a');
        R(ctx, x - 2, y - 6, 4, 6, '#4a3a2a');
        R(ctx, x - 5, y, 10, 2, '#4a3a2a');
        const f = Math.sin(t * 10 + d.v * 10) * 0.5 + 0.5;
        R(ctx, x - 4, y - 16 - f * 2, 8, 6, '#ff8030');
        R(ctx, x - 2, y - 19 - f * 3, 4, 5, '#ffd060');
        G.addLight(d.x, d.y - 14, 130, '#ffa050', 1);
        if (Math.random() < 0.15) G.fx.spawn({ x: d.x + (Math.random() - 0.5) * 6, y: d.y - 18, vx: (Math.random() - 0.5) * 20, vy: -40, life: 0.9, color: '#ffa040', size: 1, type: 'px', add: true });
        break;
      }
      case 'bigbell': {
        const sw = Math.sin(t * 0.8) * 0.05 + (d.swing || 0);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(sw);
        R(ctx, -1, 0, 3, 20, '#3a3a3a');
        ctx.fillStyle = '#8a6a30';
        ctx.beginPath();
        ctx.moveTo(-12, 20); ctx.lineTo(12, 20); ctx.lineTo(20, 58); ctx.lineTo(-20, 58);
        ctx.fill();
        R(ctx, -22, 56, 44, 5, '#a0803a');
        R(ctx, -10, 24, 3, 30, '#b8904a');
        ctx.restore();
        break;
      }
      case 'lanternTop': {
        // the great Lantern (final area). lit flag controls glow
        const lit = L.lanternLit;
        R(ctx, x - 20, y - 4, 40, 6, '#5a4a30');
        R(ctx, x - 16, y - 50, 4, 46, '#6a5a3a');
        R(ctx, x + 12, y - 50, 4, 46, '#6a5a3a');
        R(ctx, x - 22, y - 56, 44, 6, '#7a6a40');
        R(ctx, x - 14, y - 70, 28, 14, '#5a4a30');
        R(ctx, x - 4, y - 80, 8, 10, '#7a6a40');
        R(ctx, x - 12, y - 48, 24, 42, lit ? 'rgba(255,220,120,0.5)' : 'rgba(60,70,90,0.5)');
        if (lit) {
          const f = Math.sin(t * 8) * 0.5 + 0.5;
          R(ctx, x - 6, y - 30 - f * 3, 12, 20, '#ffb040');
          R(ctx, x - 3, y - 36 - f * 4, 6, 14, '#fff0b0');
          G.addLight(d.x, d.y - 26, 420, '#ffd070', 1.4);
        } else {
          R(ctx, x - 4, y - 14, 8, 8, '#2a2a30');
          R(ctx, x - 1, y - 16, 2, 3, '#555');
        }
        break;
      }
      case 'waterfall': {
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < d.w; i += 2) {
          const off = (t * 120 + i * 13) % 16;
          ctx.fillStyle = i % 4 ? '#3a8aa0' : '#6ac0d0';
          for (let yy = -16 + off; yy < d.h; yy += 16) ctx.fillRect(x + i, y + yy, 2, 10);
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'fire': {
        const f = Math.sin(t * 12 + d.v * 10) * 0.5 + 0.5;
        R(ctx, x - 3, y - 6 - f * 2, 6, 6, '#ff7030');
        R(ctx, x - 1, y - 9 - f * 2, 3, 5, '#ffd060');
        G.addLight(d.x, d.y - 4, 70, '#ff9040', 0.9);
        break;
      }
    }
  }
})();
