'use strict';
/* UNDERSONG — entities: the player's pulses, hostile projectiles, and pickups.
   G.ents holds every live list; creatures / props / decor are filled by their own files. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, exp, PI, hypot } = Math;
  const TAU = G.TAU;
  const _g = { x: 0, y: 0 };

  G.ents = { creatures: [], shots: [], eshots: [], pickups: [], props: [], decor: [] };
  G.clearEnts = function () { for (const k in G.ents) G.ents[k].length = 0; };

  // ================================================================= player pulses
  const SH = G.shots = {
    fire(x, y, ang, o) {
      const s = {
        x, y, ang, vx: cos(ang) * o.speed, vy: sin(ang) * o.speed, speed: o.speed, life: o.life, max: o.life, t: 0,
        dmg: o.dmg, r: o.r || 5, r0: o.r || 5, pierce: o.pierce || 0, bounce: o.bounce || 0, homing: o.homing || 0,
        kind: o.kind || 'pulse', crit: !!o.crit, child: !!o.child, hit: null, dead: false,
      };
      G.ents.shots.push(s);
      return s;
    },

    end(s, wall) {
      if (s.dead) return;
      s.dead = true;
      const st = G.player.st, col = s.crit ? '#ffe08a' : '#8ff0ff';
      if (wall) {
        G.sdfGrad(s.x, s.y, _g);
        G.particles.sparks(s.x, s.y, s.kind === 'big' ? 9 : 4, col, { ang: atan2(_g.y, _g.x), arc: 2.2, s0: 60, s1: 240, life: 0.28 });
        if (G.cam.sees(s.x, s.y, 0) && G.rand() < 0.35) G.sfx('tick', { x: s.x });
      } else if (s.kind !== 'mini') G.particles.mote(s.x, s.y, s.vx * 0.1, s.vy * 0.1, col, 7, 0.22, 0, 3);
      if (st.burst && !s.child && s.kind !== 'wave') {
        const R = 46 + st.burst * 16, dmg = st.dmg * (0.4 + 0.2 * st.burst);
        G.particles.ring(s.x, s.y, 6, R, '#bff6ff', 0.28, 3);
        G.particles.bubbles(s.x, s.y, 5, R * 0.4, 60);
        G.lights.flash(s.x, s.y, R * 2, '#bff6ff', 0.14, 0.7);
        if (G.cam.sees(s.x, s.y, 0)) G.sfx('pop', { x: s.x });
        for (const c of G.ents.creatures) {
          if (!c.hittable || (s.hit && s.hit.includes(c.id))) continue;
          const d = hypot(c.x - s.x, c.y - s.y);
          if (d < R + c.r) G.damageCreature(c, dmg, { x: s.x, y: s.y, vx: c.x - s.x, vy: c.y - s.y, aoe: true });
        }
      }
    },

    update(dt) {
      const arr = G.ents.shots, cr = G.ents.creatures, st = G.player.st;
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (s.dead) continue;
        s.t += dt; s.life -= dt;
        if (s.life <= 0) { this.end(s, false); continue; }
        if (s.kind === 'wave') s.r = s.r0 + s.t * 52;
        if (s.homing > 0 && s.t > 0.05) {
          let best = null, bd = 300 * 300;
          for (const c of cr) {
            if (!c.hittable || c.passive) continue;
            const dx = c.x - s.x, dy = c.y - s.y, d2 = dx * dx + dy * dy;
            if (d2 < bd && dx * s.vx + dy * s.vy > 0) { bd = d2; best = c; }
          }
          if (best) {
            const want = atan2(best.y - s.y, best.x - s.x);
            s.ang += G.clamp(G.angDiff(s.ang, want), -s.homing * 4.2 * dt, s.homing * 4.2 * dt);
            s.vx = cos(s.ang) * s.speed; s.vy = sin(s.ang) * s.speed;
          }
        }
        s.x += s.vx * dt; s.y += s.vy * dt;
        // rock
        const d = G.sdf(s.x, s.y);
        if (s.kind === 'wave') { if (d < -26) { this.end(s, true); continue; } }
        else if (d < 2) {
          if (s.bounce > 0) {
            G.sdfGrad(s.x, s.y, _g);
            const vn = s.vx * _g.x + s.vy * _g.y;
            if (vn < 0) { s.vx -= 2 * vn * _g.x; s.vy -= 2 * vn * _g.y; s.ang = atan2(s.vy, s.vx); }
            s.x += _g.x * (3 - d); s.y += _g.y * (3 - d);
            s.bounce--; s.dmg *= 1.25; s.life = min(s.max, s.life + 0.25); s.hit = null;
            G.particles.sparks(s.x, s.y, 3, '#8ff0ff', { ang: atan2(_g.y, _g.x), arc: 1.6, s0: 50, s1: 160, life: 0.2 });
            if (G.cam.sees(s.x, s.y, 0)) G.sfx('ricochet', { x: s.x });
          } else { this.end(s, true); continue; }
        }
        // creatures
        for (let j = 0; j < cr.length; j++) {
          const c = cr[j];
          if (!c.hittable) continue;
          const dx = c.x - s.x, dy = c.y - s.y, rr = c.r + s.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          if (s.hit && s.hit.includes(c.id)) continue;
          const res = G.damageCreature(c, s.dmg, s);
          if (res === 'reflect') {   // armour: the pulse skips off
            s.vx = -s.vx * 0.7 + G.rr(-90, 90); s.vy = -s.vy * 0.7 + G.rr(-90, 90); s.ang = atan2(s.vy, s.vx);
            s.life = min(s.life, 0.18); (s.hit || (s.hit = [])).push(c.id);
            continue;
          }
          if (st.split && !s.child && s.kind !== 'wave') {
            for (let k = -1; k <= 1; k += 2) {
              const m = this.fire(s.x, s.y, s.ang + k * 0.55, { dmg: s.dmg * (0.3 + 0.12 * st.split), speed: s.speed * 0.9, life: 0.3, r: 3.5, pierce: 0, bounce: 0, homing: st.homing, kind: 'mini', child: true });
              m.hit = [c.id];
            }
          }
          if (st.chain && !s.child) {
            let best = null, bd = 190 * 190;
            for (const o of cr) { if (o === c || !o.hittable || o.passive) continue; const d2 = G.dist2(o.x, o.y, c.x, c.y); if (d2 < bd) { bd = d2; best = o; } }
            if (best) { G.damageCreature(best, s.dmg * (0.3 + 0.15 * st.chain), { x: c.x, y: c.y, vx: best.x - c.x, vy: best.y - c.y, aoe: true }); G.bolt(c.x, c.y, best.x, best.y, '#bff6ff'); }
          }
          if (s.pierce > 0) { s.pierce--; (s.hit || (s.hit = [])).push(c.id); if (s.kind !== 'wave') s.dmg *= 0.86; }
          else { this.end(s, false); break; }
        }
      }
      G.removeDead(arr);
    },

    draw(ctx) {
      const cam = G.cam;
      ctx.lineCap = 'round';
      for (const s of G.ents.shots) {
        if (!cam.sees(s.x, s.y, 60)) continue;
        const fade = min(1, s.life * 7), core = s.crit ? '#fff6c8' : s.kind === 'echo' ? '#e2d8ff' : '#f0ffff', glow = s.crit ? '#ffc94a' : s.kind === 'echo' ? '#a590ff' : '#55e2ff';
        const a = s.ang, half = s.kind === 'wave' ? 0.95 : 0.8;
        const R = s.kind === 'wave' ? s.r : s.kind === 'big' ? 15 : s.kind === 'mini' ? 5 : 9.5 * (s.r0 / 5);
        const cx = s.x - cos(a) * R, cy = s.y - sin(a) * R;
        ctx.globalCompositeOperation = 'lighter';
        G.drawGlow(ctx, s.x, s.y, R * 2.1 + 6, glow, 0.6 * fade);
        ctx.globalCompositeOperation = 'source-over';
        // dark under-stroke so pulses read on bright water too
        ctx.globalAlpha = 0.5 * fade; ctx.strokeStyle = '#06344a'; ctx.lineWidth = s.kind === 'mini' ? 4 : s.kind === 'big' ? 7.5 : 6;
        ctx.beginPath(); ctx.arc(cx, cy, R, a - half, a + half); ctx.stroke();
        ctx.globalAlpha = fade; ctx.strokeStyle = core; ctx.lineWidth = s.kind === 'mini' ? 2 : s.kind === 'big' ? 4.5 : 3.2;
        ctx.beginPath(); ctx.arc(cx, cy, R, a - half, a + half); ctx.stroke();
        if (s.kind !== 'mini') {   // trailing ripple
          ctx.globalAlpha = 0.4 * fade; ctx.lineWidth = 1.8; ctx.strokeStyle = glow;
          const b = s.kind === 'wave' ? 14 : 8;
          ctx.beginPath(); ctx.arc(cx - cos(a) * b, cy - sin(a) * b, R, a - half * 0.75, a + half * 0.75); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    },
  };

  // quick lightning-ish connector (chain hits, scanning, etc.)
  G.bolt = function (x0, y0, x1, y1, color) {
    const n = max(3, (hypot(x1 - x0, y1 - y0) / 22) | 0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      G.particles.mote(x0 + (x1 - x0) * t + G.rr(-6, 6), y0 + (y1 - y0) * t + G.rr(-6, 6), 0, 0, color, G.rr(4, 8), G.rr(0.12, 0.24), 0, 0);
    }
  };

  // ================================================================= hostile projectiles
  const ES = G.eshots = {
    // o: {r, dmg, life, color, kind, ax, ay, homing, wob, bounce, drag, grow}
    fire(x, y, vx, vy, o) {
      o = o || {};
      const calm = G.settings.calm ? 0.8 : 1;
      const s = {
        x, y, vx: vx * calm, vy: vy * calm, r: o.r || 5, dmg: o.dmg || 1, life: o.life || 4.5, max: o.life || 4.5, t: 0,
        color: o.color || '#ff7a5c', kind: o.kind || 'orb', ax: o.ax || 0, ay: o.ay || 0, homing: o.homing || 0, wob: o.wob || 0,
        bounce: o.bounce || 0, drag: o.drag || 0, grow: o.grow || 0, ph: G.rand() * TAU, dead: false, owner: o.owner || null,
      };
      G.ents.eshots.push(s);
      return s;
    },
    ring(x, y, n, speed, o, offset) {
      for (let i = 0; i < n; i++) { const a = (offset || 0) + i * TAU / n; this.fire(x, y, cos(a) * speed, sin(a) * speed, o); }
    },
    fan(x, y, ang, n, arc, speed, o) {
      for (let i = 0; i < n; i++) { const a = ang + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc); this.fire(x, y, cos(a) * speed, sin(a) * speed, o); }
    },
    kill(s, quiet) {
      if (s.dead) return;
      s.dead = true;
      if (!quiet) G.particles.sparks(s.x, s.y, 4, s.color, { s0: 40, s1: 160, life: 0.25 });
    },
    update(dt) {
      const arr = G.ents.eshots, p = G.player;
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        if (s.dead) continue;
        s.t += dt; s.life -= dt;
        if (s.life <= 0) { this.kill(s, true); G.particles.mote(s.x, s.y, 0, 0, s.color, s.r * 2, 0.25, 0, 0); continue; }
        if (s.drag) { const k = exp(-s.drag * dt); s.vx *= k; s.vy *= k; }
        s.vx += s.ax * dt; s.vy += s.ay * dt;
        if (s.homing && !p.dead) {
          const sp = hypot(s.vx, s.vy) || 1, want = atan2(p.y - s.y, p.x - s.x), cur = atan2(s.vy, s.vx);
          const na = cur + G.clamp(G.angDiff(cur, want), -s.homing * dt, s.homing * dt);
          s.vx = cos(na) * sp; s.vy = sin(na) * sp;
        }
        let mx = s.vx, my = s.vy;
        if (s.wob) { const w = cos(s.t * 6 + s.ph) * s.wob, sp = hypot(s.vx, s.vy) || 1; mx += -s.vy / sp * w; my += s.vx / sp * w; }
        s.x += mx * dt; s.y += my * dt;
        if (s.grow) s.r += s.grow * dt;
        const d = G.sdf(s.x, s.y);
        if (d < 1) {
          if (s.bounce > 0) {
            G.sdfGrad(s.x, s.y, _g);
            const vn = s.vx * _g.x + s.vy * _g.y;
            if (vn < 0) { s.vx -= 2 * vn * _g.x; s.vy -= 2 * vn * _g.y; }
            s.x += _g.x * (2 - d); s.y += _g.y * (2 - d); s.bounce--;
          } else { this.kill(s); continue; }
        }
        if (!p.dead) {
          const dx = p.x - s.x, dy = p.y - s.y, rr = p.r + s.r - 3;
          if (dx * dx + dy * dy < rr * rr && p.inv <= 0) { if (p.hurt(s.dmg, s.x, s.y)) this.kill(s); }
        }
      }
      G.removeDead(arr);
    },
    draw(ctx) {
      const cam = G.cam, t = G.time;
      for (const s of G.ents.eshots) {
        if (!cam.sees(s.x, s.y, 40)) continue;
        const fade = min(1, s.life * 5, s.t * 12 + 0.3), pulse = 1 + 0.12 * sin(t * 14 + s.ph);
        ctx.globalCompositeOperation = 'lighter';
        G.drawGlow(ctx, s.x, s.y, s.r * 3.4 * pulse, s.color, 0.75 * fade);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade;
        if (s.kind === 'spine') {
          const sp = hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
          ctx.strokeStyle = '#2a0c14'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(s.x - ux * 9, s.y - uy * 9); ctx.lineTo(s.x + ux * 6, s.y + uy * 6); ctx.stroke();
          ctx.strokeStyle = s.color; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(s.x - ux * 9, s.y - uy * 9); ctx.lineTo(s.x + ux * 6, s.y + uy * 6); ctx.stroke();
          ctx.strokeStyle = '#fff4e6'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + ux * 6, s.y + uy * 6); ctx.stroke();
        } else {
          ctx.fillStyle = '#2a0c14'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 1.6, 0, TAU); ctx.fill();
          ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
          ctx.fillStyle = '#fff6ea'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.5 * pulse, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  };

  // ================================================================= pickups
  const GLOW = '#c8ff9a', PEARL = '#ffeaf6';
  let combo = 0, comboT = 0;
  const PK = G.pickups = {
    spawn(kind, x, y, val, vx, vy) {
      const a = G.rand() * TAU, sp = G.rr(40, 190);
      const k = { kind, x, y, vx: vx === undefined ? cos(a) * sp : vx, vy: vy === undefined ? sin(a) * sp : vy, val: val || 1, t: 0, ph: G.rand() * TAU, mag: false, dead: false, r: kind === 'glow' ? 4 : 7, life: kind === 'glow' ? 40 : 1e9 };
      G.ents.pickups.push(k);
      return k;
    },
    // scatter experience + pearls from a point
    loot(x, y, xp, pearls) {
      while (xp > 0) { const v = xp >= 12 ? 5 : xp >= 5 ? 2 : 1; this.spawn('glow', x + G.rr(-6, 6), y + G.rr(-6, 6), v); xp -= v; }
      for (let i = 0; i < (pearls || 0); i++) this.spawn('pearl', x + G.rr(-6, 6), y + G.rr(-6, 6), 1);
    },
    collect(k) {
      const p = G.player;
      k.dead = true;
      if (k.kind === 'glow') {
        p.addXp(k.val);
        combo = comboT > 0 ? min(combo + 1, 14) : 0; comboT = 0.55;
        G.sfx('mote', { n: combo });
        G.particles.mote(k.x, k.y, 0, 0, GLOW, 9, 0.2, 0, 0);
      } else if (k.kind === 'pearl') {
        const n = p.addPearls(k.val);
        G.sfx('pearl');
        G.particles.ring(k.x, k.y, 4, 18, PEARL, 0.3, 2);
        if (n > 1) G.particles.text(k.x, k.y - 14, '+' + n, PEARL, 12, 0.8);
        p.happy = max(p.happy, 0.35);
      } else if (k.kind === 'heal') {
        if (p.hull >= p.st.maxHull) { p.addXp(8); G.particles.text(k.x, k.y - 14, 'HULL FULL  +GLOW', '#9dffb8', 11, 1); G.sfx('pearl'); }
        else p.heal(k.val);
      } else if (k.kind === 'flare') {
        if (p.flares < p.st.flareMax) p.flares++; else p.addXp(6);
        G.sfx('flareReady'); G.particles.ring(k.x, k.y, 4, 22, '#ffe6a8', 0.3, 2);
      }
      G.emit('pickup', k);
    },
    update(dt) {
      const arr = G.ents.pickups, p = G.player, mag = p.st.magnet;
      comboT -= dt;
      for (let i = 0; i < arr.length; i++) {
        const k = arr[i];
        if (k.dead) continue;
        k.t += dt; k.life -= dt;
        if (k.life <= 0) { k.dead = true; continue; }
        const dx = p.x - k.x, dy = p.y - k.y, d = hypot(dx, dy);
        if (!p.dead && k.t > 0.3 && (k.mag || d < mag * (k.kind === 'glow' ? 1 : 0.75))) {
          k.mag = true;
          const sp = min(760, 240 + k.t * 520);
          k.vx = G.damp(k.vx, dx / (d || 1) * sp, 12, dt); k.vy = G.damp(k.vy, dy / (d || 1) * sp, 12, dt);
          if (d < p.r + 6) { this.collect(k); continue; }
        } else {
          const kk = exp(-2.6 * dt); k.vx *= kk; k.vy *= kk;
          k.vy += (k.kind === 'pearl' ? 14 : -3) * dt;
        }
        k.x += k.vx * dt; k.y += k.vy * dt;
        if (!k.mag) { k.r = 5; G.collide(k, 0.4); }
      }
      G.removeDead(arr);
    },
    draw(ctx) {      // lit pass: things with a body
      const cam = G.cam, t = G.time;
      for (const k of G.ents.pickups) {
        if (!cam.sees(k.x, k.y, 20)) continue;
        const y = k.y + sin(t * 3 + k.ph) * 1.5;
        if (k.kind === 'pearl') {
          const g = ctx.createRadialGradient(k.x - 1.5, y - 1.8, 0.3, k.x, y, 5.2);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#ffe2f0'); g.addColorStop(1, '#b8a6d8');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(k.x, y, 5, 0, TAU); ctx.fill();
        } else if (k.kind === 'heal') {
          ctx.save(); ctx.translate(k.x, y); ctx.rotate(sin(t * 2 + k.ph) * 0.3);
          ctx.fillStyle = '#eafff0'; G.roundRect(ctx, -6, -8, 12, 16, 4); ctx.fill();
          ctx.fillStyle = '#3ecf7a'; ctx.fillRect(-1.6, -5, 3.2, 10); ctx.fillRect(-4.5, -1.6, 9, 3.2);
          ctx.restore();
        } else if (k.kind === 'flare') {
          ctx.save(); ctx.translate(k.x, y); ctx.rotate(0.6 + sin(t * 2 + k.ph) * 0.3);
          ctx.fillStyle = '#ffd98a'; G.roundRect(ctx, -3, -8, 6, 16, 2.5); ctx.fill();
          ctx.fillStyle = '#ff7a4a'; ctx.fillRect(-3, -8, 6, 4);
          ctx.restore();
        }
      }
    },
    drawGlow(ctx) {
      const cam = G.cam, t = G.time;
      for (const k of G.ents.pickups) {
        if (!cam.sees(k.x, k.y, 30)) continue;
        const tw = 0.75 + 0.25 * sin(t * 6 + k.ph), fade = min(1, k.life * 0.5);
        if (k.kind === 'glow') { const r = 7 + k.val * 1.6; G.drawGlow(ctx, k.x, k.y, r * tw + 3, GLOW, 0.95 * fade); G.drawGlow(ctx, k.x, k.y, 3.2, '#ffffff', 0.9 * fade); }
        else if (k.kind === 'pearl') G.drawGlow(ctx, k.x, k.y, 17 * tw, PEARL, 0.4);
        else if (k.kind === 'heal') G.drawGlow(ctx, k.x, k.y, 26 * tw, '#7dffb0', 0.5);
        else G.drawGlow(ctx, k.x, k.y, 24 * tw, '#ffd98a', 0.5);
      }
    },
  };

  // creatures.js replaces this; until then pulses simply pass through
  G.damageCreature = G.damageCreature || function () { return true; };
})();
