'use strict';
/* UNDERSONG — companions: whatever has decided to travel with the probe.
   Sea sparkle wisps (orbit, sting, soak up shots), a remora (nips), a pilot fish (fetches),
   a stowaway shrimp (rides on the hull), and the Bloom's veil (trailing stingers). */
(function () {
  const { sin, cos, min, max, abs, atan2, PI, hypot, floor } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit;

  const C = G.companions = {
    wisps: [], spin: 0, remora: null, pilot: null, veil: null,

    reset() { this.wisps.length = 0; this.remora = null; this.pilot = null; this.veil = null; },

    update(dt) {
      const p = G.player, st = p.st, cr = G.ents.creatures;
      if (p.dead) return;
      // ---- wisps
      while (this.wisps.length < st.wisps) this.wisps.push({ x: p.x, y: p.y, cool: 0, ph: G.rand() * TAU });
      this.wisps.length = st.wisps;
      this.spin += dt * 2.5;
      for (let i = 0; i < this.wisps.length; i++) {
        const w = this.wisps[i], a = this.spin + i * TAU / this.wisps.length, R = 46 + sin(G.time * 1.3 + w.ph) * 5;
        w.x = damp(w.x, p.x + cos(a) * R, 22, dt); w.y = damp(w.y, p.y + sin(a) * R, 22, dt);
        w.cool = max(0, w.cool - dt);
        G.lights.add(w.x, w.y, 90, '#8ff0ff', 0.5);
        for (const c of cr) {
          if (!c.hittable || c.passive || (c.wispCd || 0) > G.time) continue;
          if (G.dist2(c.x, c.y, w.x, w.y) < (c.r + 9) * (c.r + 9)) {
            c.wispCd = G.time + 0.45;
            G.damageCreature(c, 7 + st.dmg * 0.6, { x: w.x, y: w.y, vx: c.x - w.x, vy: c.y - w.y, aoe: true, knock: 0.6 });
          }
        }
        if (w.cool <= 0) for (const s of G.ents.eshots) {
          if (!s.dead && G.dist2(s.x, s.y, w.x, w.y) < (s.r + 10) * (s.r + 10)) { G.eshots.kill(s); w.cool = 1.4; G.sfx('pop', { x: w.x, y: w.y }); break; }
        }
      }
      // ---- remora
      if (st.remora) {
        const r = this.remora || (this.remora = { x: p.x, y: p.y, vx: 0, vy: 0, cd: 0.5, tgt: null, face: 0, t: 0 });
        r.t += dt; r.cd -= dt;
        if (r.tgt && (r.tgt.dead || r.tgt.fleeing || !r.tgt.hittable)) r.tgt = null;
        if (!r.tgt && r.cd <= 0) {
          let bd = 190 * 190;
          for (const c of cr) { if (!c.hittable || c.passive || !c.hostile) continue; const d2 = G.dist2(c.x, c.y, p.x, p.y); if (d2 < bd) { bd = d2; r.tgt = c; } }
        }
        let tx = p.x - cos(p.face) * 20 + sin(G.time * 2) * 6, ty = p.y + 20, sp = 9;
        if (r.tgt) {
          tx = r.tgt.x; ty = r.tgt.y; sp = 16;
          if (G.dist2(r.x, r.y, tx, ty) < (r.tgt.r + 8) * (r.tgt.r + 8)) {
            G.damageCreature(r.tgt, 8 + st.dmg * 0.9, { x: r.x, y: r.y, vx: tx - r.x, vy: ty - r.y, aoe: true, knock: 0.4 });
            G.sfx('snap', { x: r.x, y: r.y }); r.tgt = null; r.cd = 0.85;
          }
        }
        const ox = r.x, oy = r.y;
        r.x = damp(r.x, tx, sp, dt); r.y = damp(r.y, ty, sp, dt);
        if (hypot(r.x - ox, r.y - oy) > 0.2) r.face = G.angDamp(r.face, atan2(r.y - oy, r.x - ox), 14, dt);
      } else this.remora = null;
      // ---- pilot fish
      if (st.pilot) {
        const f = this.pilot || (this.pilot = { x: p.x, y: p.y, tgt: null, face: 0, cd: 0 });
        f.cd -= dt;
        if (f.tgt && (f.tgt.dead || f.tgt.mag)) f.tgt = null;
        if (!f.tgt && f.cd <= 0) {
          f.cd = 0.25;
          let bd = 560 * 560;
          for (const k of G.ents.pickups) { if (k.mag || k.dead || k.t < 0.3) continue; const d2 = G.dist2(k.x, k.y, p.x, p.y); if (d2 < bd) { bd = d2; f.tgt = k; } }
        }
        const tx = f.tgt ? f.tgt.x : p.x + cos(G.time * 1.4) * 34, ty = f.tgt ? f.tgt.y : p.y - 26 + sin(G.time * 2.1) * 8;
        const ox = f.x, oy = f.y;
        f.x = damp(f.x, tx, f.tgt ? 12 : 7, dt); f.y = damp(f.y, ty, f.tgt ? 12 : 7, dt);
        if (f.tgt && G.dist2(f.x, f.y, f.tgt.x, f.tgt.y) < 14 * 14) { f.tgt.mag = true; f.tgt = null; }
        if (hypot(f.x - ox, f.y - oy) > 0.2) f.face = G.angDamp(f.face, atan2(f.y - oy, f.x - ox), 14, dt);
      } else this.pilot = null;
      // ---- veil
      if (st.veil) {
        if (!this.veil) { this.veil = []; for (let i = 0; i < 3; i++) { const r = kit.rope(9, 9); kit.ropeSet(r, p.x, p.y, 0, 1); this.veil.push(r); } }
        const back = p.face + PI;
        for (let i = 0; i < 3; i++) {
          const r = this.veil[i], a = back + (i - 1) * 0.7;
          kit.ropeStep(r, p.x + cos(a) * 11, p.y + sin(a) * 11, dt, sin(G.time * 2 + i) * 30, 40, Math.pow(0.92, dt * 60));
          for (const c of cr) {
            if (!c.hittable || c.passive || (c.veilCd || 0) > G.time || c.pd > 150 + c.r) continue;
            if (kit.ropeNear(r, c.x, c.y, c.r + 4, 2)) { c.veilCd = G.time + 0.35; G.damageCreature(c, 5 + st.dmg * 0.5, { x: c.x, y: c.y, vx: c.x - p.x, vy: c.y - p.y, aoe: true, knock: 0.3 }); }
          }
        }
      } else this.veil = null;
    },

    draw(ctx) {
      const p = G.player, t = G.time;
      if (p.dead) return;
      if (this.veil) for (const r of this.veil) kit.ropeDraw(ctx, r, 2.6, 1, '#d8a8ff', 0.85);
      const fish = (f, body, stripe, len) => {
        const ca = cos(f.face), sa = sin(f.face), wg = sin(t * 14) * 2.2;
        ctx.fillStyle = body;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, len, len * 0.42, f.face, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(f.x - ca * len * 0.8, f.y - sa * len * 0.8);
        ctx.lineTo(f.x - ca * (len + 5) - sa * (3 + wg), f.y - sa * (len + 5) + ca * (3 + wg)); ctx.lineTo(f.x - ca * (len + 5) + sa * (3 - wg), f.y - sa * (len + 5) - ca * (3 - wg)); ctx.closePath(); ctx.fill();
        if (stripe) { ctx.strokeStyle = stripe; ctx.lineWidth = 1.6; for (let k = -1; k <= 1; k++) { const x = f.x + ca * k * len * 0.42, y = f.y + sa * k * len * 0.42; ctx.beginPath(); ctx.moveTo(x - sa * len * 0.36, y + ca * len * 0.36); ctx.lineTo(x + sa * len * 0.36, y - ca * len * 0.36); ctx.stroke(); } }
        ctx.fillStyle = '#10141a'; ctx.beginPath(); ctx.arc(f.x + ca * len * 0.55, f.y + sa * len * 0.55 - 0.8, 1, 0, TAU); ctx.fill();
      };
      if (this.remora) fish(this.remora, '#6f7f92', null, 8);
      if (this.pilot) fish(this.pilot, '#dfe8f2', '#27384a', 6.5);
      if (p.st.shrimp) {          // perched on top of the hull, antennae going
        const x = p.x + sin(p.tilt) * 13 - 6, y = p.y + p.bob - 13.5;
        ctx.fillStyle = '#e8283a'; ctx.beginPath(); ctx.ellipse(x, y, 4.6, 2.2, -0.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 4, y + 0.5); ctx.lineTo(x + 4, y - 0.8); ctx.stroke();
        const wv = sin(t * 6);
        ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x + 4, y - 1); ctx.quadraticCurveTo(x + 9, y - 7 + wv * 2, x + 13, y - 6 + wv * 3); ctx.moveTo(x + 4, y - 1); ctx.quadraticCurveTo(x + 7, y - 9 - wv * 2, x + 9, y - 12 - wv * 2); ctx.stroke();
      }
    },

    drawGlow(ctx) {
      const p = G.player, t = G.time;
      if (p.dead) return;
      for (const w of this.wisps) {
        const k = w.cool > 0 ? 0.35 : 1;
        G.drawGlow(ctx, w.x, w.y, 15 + sin(t * 7 + w.ph) * 2.5, '#8ff0ff', 0.9 * k);
        G.drawGlow(ctx, w.x, w.y, 5, '#ffffff', 0.9 * k);
      }
      if (this.veil) for (const r of this.veil) G.drawGlow(ctx, r.x[r.n - 1], r.y[r.n - 1], 8, '#d8a8ff', 0.55);
    },
  };

  G.on('diveStart', () => C.reset());
})();
