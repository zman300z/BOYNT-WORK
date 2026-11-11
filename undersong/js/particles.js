'use strict';
/* UNDERSONG — particles: pooled, two draw passes.
   lit  = things light falls on (bubbles, ink, silt, flakes)
   glow = things that are light (sparks, motes, rings, floating text) */
(function () {
  const { sin, cos, min, max, sqrt, exp, PI } = Math;
  const TAU = G.TAU;
  const BUBBLE = 0, SPARK = 1, MOTE = 2, RING = 3, INK = 4, DUST = 5, TEXT = 6, FLAKE = 7, NOTE = 8;
  const CAP = 1100;
  const pool = [];
  function make() { return { k: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, s1: 1, color: '#fff', a: 1, drag: 0, grav: 0, rot: 0, vr: 0, ph: 0, str: '', lw: 1, dead: false }; }

  const P = G.particles = {
    lit: [], glow: [],
    count() { return this.lit.length + this.glow.length; },
    clear() { for (const p of this.lit) pool.push(p); for (const p of this.glow) pool.push(p); this.lit.length = 0; this.glow.length = 0; },
    _new(kind, lit) {
      if (this.lit.length + this.glow.length >= CAP) return null;
      const p = pool.pop() || make();
      p.k = kind; p.dead = false; p.a = 1; p.rot = 0; p.vr = 0; p.grav = 0; p.drag = 0; p.ph = G.rand() * TAU;
      (lit ? this.lit : this.glow).push(p);
      return p;
    },

    bubble(x, y, size, vx, vy, life) {
      const p = this._new(BUBBLE, true); if (!p) return;
      p.x = x; p.y = y; p.vx = vx || 0; p.vy = vy || 0; p.size = size; p.life = p.max = life || G.rr(1.2, 2.8); p.grav = -(60 + size * 26); p.drag = 2.2;
    },
    bubbles(x, y, n, spread, speed) {
      for (let i = 0; i < n; i++) {
        const a = G.rand() * TAU, s = G.rand() * (speed || 60);
        this.bubble(x + cos(a) * G.rand() * (spread || 6), y + sin(a) * G.rand() * (spread || 6), G.rr(1.2, 4.2), cos(a) * s, sin(a) * s);
      }
    },
    spark(x, y, ang, speed, color, life, size) {
      const p = this._new(SPARK, false); if (!p) return;
      p.x = x; p.y = y; p.vx = cos(ang) * speed; p.vy = sin(ang) * speed; p.color = color; p.life = p.max = life; p.size = size || 2; p.drag = 4.5;
    },
    // o: {ang, arc, s0, s1, life, size}
    sparks(x, y, n, color, o) {
      o = o || {};
      const ang = o.ang === undefined ? 0 : o.ang, arc = o.arc === undefined ? TAU : o.arc, s0 = o.s0 || 80, s1 = o.s1 || 320;
      for (let i = 0; i < n; i++) this.spark(x, y, ang + (G.rand() - 0.5) * arc, G.rr(s0, s1), color, (o.life || 0.4) * G.rr(0.6, 1.2), o.size || 2);
    },
    mote(x, y, vx, vy, color, size, life, grav, drag) {
      const p = this._new(MOTE, false); if (!p) return;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.color = color; p.size = size; p.life = p.max = life; p.grav = grav || 0; p.drag = drag === undefined ? 2 : drag;
      return p;
    },
    motes(x, y, n, color, o) {
      o = o || {};
      for (let i = 0; i < n; i++) {
        const a = G.rand() * TAU, s = G.rr(o.s0 || 10, o.s1 || 90);
        this.mote(x + cos(a) * (o.spread || 0) * G.rand(), y + sin(a) * (o.spread || 0) * G.rand(), cos(a) * s, sin(a) * s, color, G.rr(o.size0 || 3, o.size1 || 8), (o.life || 0.7) * G.rr(0.6, 1.3), o.grav || 0, o.drag);
      }
    },
    ring(x, y, r0, r1, color, life, lw) {
      const p = this._new(RING, false); if (!p) return;
      p.x = x; p.y = y; p.size = r0; p.s1 = r1; p.color = color; p.life = p.max = life; p.lw = lw || 2; p.vx = p.vy = 0;
    },
    ink(x, y, r, life, vx, vy) {
      const p = this._new(INK, true); if (!p) return;
      p.x = x; p.y = y; p.vx = vx || 0; p.vy = vy || 0; p.size = r; p.life = p.max = life; p.drag = 1.6;
      return p;
    },
    dust(x, y, n, color, speed, nx, ny) {
      for (let i = 0; i < n; i++) {
        const p = this._new(DUST, true); if (!p) return;
        const a = G.rand() * TAU, s = G.rand() * (speed || 70);
        p.x = x + G.rr(-4, 4); p.y = y + G.rr(-4, 4); p.vx = cos(a) * s + (nx || 0) * s; p.vy = sin(a) * s + (ny || 0) * s;
        p.color = color; p.size = G.rr(2.5, 7); p.life = p.max = G.rr(0.5, 1.3); p.drag = 3; p.grav = -8;
      }
    },
    flake(x, y, vx, vy, color, size, life) {
      const p = this._new(FLAKE, true); if (!p) return;
      p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.color = color; p.size = size; p.life = p.max = life; p.drag = 2.4; p.grav = 26; p.rot = G.rand() * TAU; p.vr = G.rr(-8, 8);
    },
    flakes(x, y, n, color, speed) {
      for (let i = 0; i < n; i++) { const a = G.rand() * TAU, s = G.rr(40, speed || 220); this.flake(x, y, cos(a) * s, sin(a) * s, color, G.rr(2, 5), G.rr(0.6, 1.4)); }
    },
    text(x, y, str, color, size, life) {
      const p = this._new(TEXT, false); if (!p) return;
      p.x = x; p.y = y; p.vx = 0; p.vy = -34; p.str = str; p.color = color || '#fff'; p.size = size || 13; p.life = p.max = life || 1.1; p.drag = 1.5;
    },
    note(x, y, color) {
      const p = this._new(NOTE, false); if (!p) return;
      p.x = x; p.y = y; p.vx = G.rr(-18, 18); p.vy = G.rr(-60, -34); p.color = color; p.size = G.rr(7, 10); p.life = p.max = G.rr(1.2, 1.9); p.drag = 0.8;
    },

    update(dt) {
      const zone = G.zone, surf = zone ? zone.surfaceY + 4 : -1e9;
      for (let pass = 0; pass < 2; pass++) {
        const arr = pass ? this.glow : this.lit;
        let j = 0;
        for (let i = 0; i < arr.length; i++) {
          const p = arr[i];
          p.life -= dt;
          if (p.life <= 0) { pool.push(p); continue; }
          if (p.drag) { const k = exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
          p.vy += p.grav * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.k === BUBBLE) {
            p.x += sin(p.ph + p.life * 7) * 14 * dt;
            if (p.y < surf || (zone && (i & 3) === (G.frame & 3) && G.sdf(p.x, p.y) < 0)) { pool.push(p); continue; }
          } else if (p.k === INK) {
            const u = p.life / p.max;
            G.lights.addDark(p.x, p.y, p.size * (2.3 - u * 0.9), min(1, u * 2.2) * 0.92);
          } else if (p.k === FLAKE) p.rot += p.vr * dt;
          arr[j++] = p;
        }
        arr.length = j;
      }
    },

    drawLit(ctx) {
      const cam = G.cam, bub = G.spr.bubble;
      for (const p of this.lit) {
        if (!cam.sees(p.x, p.y, 60)) continue;
        const u = p.life / p.max;
        if (p.k === BUBBLE) {
          ctx.globalAlpha = min(1, u * 4) * 0.9;
          const s = p.size * (1 + (1 - u) * 0.25);
          ctx.drawImage(bub, p.x - s, p.y - s, s * 2, s * 2);
        } else if (p.k === INK) {
          const r = p.size * (1.9 - u * 0.9);
          ctx.globalAlpha = min(1, u * 2.4) * 0.8;
          ctx.fillStyle = '#05060c';
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
        } else if (p.k === DUST) {
          ctx.globalAlpha = u * 0.55; ctx.fillStyle = p.color;
          const s = p.size * (1.6 - u * 0.6);
          ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
        } else if (p.k === FLAKE) {
          ctx.globalAlpha = min(1, u * 3); ctx.fillStyle = p.color;
          const c = cos(p.rot), s = sin(p.rot), w = p.size, h = p.size * 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x + c * w, p.y + s * w); ctx.lineTo(p.x - s * h, p.y + c * h); ctx.lineTo(p.x - c * w, p.y - s * w); ctx.lineTo(p.x + s * h, p.y - c * h);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },

    drawGlow(ctx) {
      const cam = G.cam;
      ctx.lineCap = 'round';
      for (const p of this.glow) {
        if (!cam.sees(p.x, p.y, p.k === RING ? p.s1 : 40)) continue;
        const u = p.life / p.max;
        if (p.k === SPARK) {
          ctx.globalAlpha = min(1, u * 1.6); ctx.strokeStyle = p.color; ctx.lineWidth = p.size * (0.5 + u * 0.6);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
        } else if (p.k === MOTE) {
          const a = u < 0.7 ? u / 0.7 : 1;
          G.drawGlow(ctx, p.x, p.y, p.size * (0.6 + 0.6 * u), p.color, a * p.a);
        } else if (p.k === RING) {
          const e = 1 - (u * u * u);
          ctx.globalAlpha = u * p.a; ctx.strokeStyle = p.color; ctx.lineWidth = p.lw * (0.4 + u * 0.8);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (p.s1 - p.size) * e, 0, TAU); ctx.stroke();
        } else if (p.k === TEXT) {
          G.text(ctx, p.str, p.x, p.y, { size: p.size, font: 'mono', weight: 700, color: p.color, align: 'center', alpha: min(1, u * 2.5) });
        } else if (p.k === NOTE) {
          const a = min(1, u * 2.5), s = p.size, x = p.x + sin(p.ph + p.life * 3) * 5, y = p.y;
          ctx.globalAlpha = a; ctx.fillStyle = p.color; ctx.strokeStyle = p.color; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.ellipse(x, y, s * 0.42, s * 0.3, -0.4, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x + s * 0.36, y - s * 0.1); ctx.lineTo(x + s * 0.36, y - s * 1.25); ctx.quadraticCurveTo(x + s * 0.9, y - s * 1.05, x + s * 0.8, y - s * 0.6); ctx.stroke();
          G.drawGlow(ctx, x, y - s * 0.4, s * 1.8, p.color, a * 0.35);
        }
      }
      ctx.globalAlpha = 1;
    },
  };
})();
