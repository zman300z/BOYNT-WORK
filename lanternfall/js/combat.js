'use strict';
// ============================================================================
// Combat: statuses, damage helpers, projectiles, explosions, pickups, drops
// ============================================================================
(function () {
  const G = window.G;
  const TS = G.TS;

  // ---------------------------------------------------------------- statuses
  const ST_COLORS = { bleed: '#ff3a3a', poison: '#6ae04a', burn: '#ff9a30', oil: '#6a5a3a', freeze: '#80e8ff', stun: '#ffe060', root: '#8a6a3a', slow: '#6090ff', curse: '#b040ff' };
  G.ST_COLORS = ST_COLORS;
  G.applyStatuses = (t, st, power, opts) => {
    if (!st || t.dead) return;
    opts = opts || {};
    const S = t.st || (t.st = {});
    power = power || 1;
    const resist = t.isBoss ? 0.35 : t.elite ? 0.6 : 1;
    for (const k in st) {
      const v = st[k];
      if (!v) continue;
      switch (k) {
        case 'bleed':
          S.bleed = S.bleed || { n: 0, t: 0, p: 0 };
          S.bleed.n = Math.min(6, S.bleed.n + v);
          S.bleed.t = 4;
          S.bleed.p = Math.max(S.bleed.p * 0.9, power);
          break;
        case 'poison':
          S.poison = S.poison || { n: 0, t: 0, p: 0 };
          S.poison.n = Math.min(8, S.poison.n + v);
          S.poison.t = 6;
          S.poison.p = Math.max(S.poison.p * 0.9, power);
          break;
        case 'burn': {
          S.burn = S.burn || { t: 0, p: 0 };
          const dur = (3 + v * 1.5) * (S.oil && S.oil.t > 0 ? 2 : 1);
          S.burn.t = Math.max(S.burn.t, dur);
          S.burn.p = Math.max(S.burn.p * 0.9, power);
          break;
        }
        case 'oil':
          S.oil = { t: v };
          break;
        case 'freeze':
          if (t.isBoss) { S.slow = { t: Math.max((S.slow && S.slow.t) || 0, v) }; break; }
          S.freeze = { t: Math.max((S.freeze && S.freeze.t) || 0, v * resist) };
          if (t.onFrozen) t.onFrozen();
          break;
        case 'freezeChance':
          if (Math.random() < v) G.applyStatuses(t, { freeze: 1.5 }, power);
          break;
        case 'stun':
          if (t.isBoss) { if (t.addStagger) t.addStagger(v * 20); break; }
          S.stun = { t: Math.max((S.stun && S.stun.t) || 0, v * resist) };
          if (t.onStunned) t.onStunned();
          break;
        case 'root':
          if (t.isBoss) break;
          S.root = { t: Math.max((S.root && S.root.t) || 0, v * resist) };
          break;
        case 'slow':
          S.slow = { t: Math.max((S.slow && S.slow.t) || 0, v) };
          break;
      }
    }
  };
  G.hasSt = (t, k) => !!(t.st && t.st[k] && (t.st[k].t > 0));
  G.isDisabled = (t) => G.hasSt(t, 'stun') || G.hasSt(t, 'freeze') || G.hasSt(t, 'root');
  // tick DoTs; returns nothing. target must implement takeHit
  G.tickStatuses = (t, dt) => {
    const S = t.st;
    if (!S) return;
    S._acc = (S._acc || 0) + dt;
    let dps = 0;
    if (S.bleed && S.bleed.t > 0) dps += S.bleed.n * 4 * S.bleed.p;
    if (S.poison && S.poison.t > 0) dps += S.poison.n * 3 * S.poison.p;
    if (S.burn && S.burn.t > 0) dps += 6 * S.burn.p * (S.oil && S.oil.t > 0 ? 2 : 1);
    if (S._acc >= 0.5) {
      const amt = dps * S._acc;
      S._acc = 0;
      if (amt > 0.05 && !t.dead && !t.dying) {
        const col = S.burn && S.burn.t > 0 ? ST_COLORS.burn : S.poison && S.poison.t > 0 ? ST_COLORS.poison : ST_COLORS.bleed;
        t.takeHit({ dmg: amt, kind: 'dot', team: t.team === 'player' ? 'enemy' : 'player', color: col, noKnock: true });
      }
      // burning spreads
      if (S.burn && S.burn.t > 0 && t.isEnemy && Math.random() < 0.25) {
        for (const o of G.world.enemies) {
          if (o === t || o.dead) continue;
          if (Math.abs(o.cx - t.cx) < 40 && Math.abs(o.cy - t.cy) < 30 && !G.hasSt(o, 'burn')) { G.applyStatuses(o, { burn: 1 }, S.burn.p * 0.7); break; }
        }
      }
    }
    for (const k in S) {
      const s = S[k];
      if (s && typeof s === 'object' && s.t > 0) {
        s.t -= dt;
        if (s.t <= 0) { s.t = 0; if (s.n) s.n = 0; }
      }
    }
    // particles
    if (S.burn && S.burn.t > 0 && Math.random() < 0.5) G.fx.spawn({ x: t.x + Math.random() * t.w, y: t.y + t.h * 0.3 + Math.random() * t.h * 0.6, vx: (Math.random() - 0.5) * 10, vy: -40 - Math.random() * 30, life: 0.5, color: Math.random() < 0.5 ? '#ffb040' : '#ff6020', color2: '#401010', size: 2, size2: 0, add: true });
    if (S.poison && S.poison.t > 0 && Math.random() < 0.15) G.fx.spawn({ x: t.x + Math.random() * t.w, y: t.y + Math.random() * t.h, vy: -15, life: 0.7, color: '#6ae04a', size: 2, size2: 0 });
    if (S.bleed && S.bleed.t > 0 && Math.random() < 0.12) G.fx.spawn({ x: t.x + Math.random() * t.w, y: t.y + Math.random() * t.h * 0.5, vy: 20, grav: 300, life: 0.6, color: '#c01818', size: 1 });
  };
  // draw status icons above an entity
  G.drawStatusIcons = (ctx, t, x, y) => {
    const S = t.st;
    if (!S) return;
    let i = 0;
    for (const k of ['bleed', 'poison', 'burn', 'freeze', 'stun', 'root', 'oil', 'slow']) {
      const s = S[k];
      if (!s || !(s.t > 0)) continue;
      ctx.fillStyle = ST_COLORS[k];
      ctx.fillRect(Math.round(x + i * 5), Math.round(y), 4, 4);
      if (s.n > 1) G.text(ctx, '' + s.n, x + i * 5, y - 8, ST_COLORS[k], { shadow: '#000' });
      i++;
    }
  };

  // ---------------------------------------------------------------- hit fx
  G.hitFx = (x, y, dir, color, big) => {
    const n = big ? 14 : 7;
    G.fx.burst(x, y, n, { color: [color || '#ffffff', '#ffffff'], speed: big ? 220 : 150, life: 0.3, size: 1, type: 'spark', angle: dir > 0 ? 0 : Math.PI, spread: 1.6, drag: 0.06 });
    G.fx.spawn({ x, y, type: 'glow', size: big ? 22 : 14, size2: 4, life: 0.12, color: '#ffffff', add: true });
  };
  G.bloodFx = (x, y, dir, color, n) => {
    G.fx.burst(x, y, n || 6, { color: color || '#8a1a1a', speed: 120, life: 0.6, size: 2, size2: 1, grav: 500, angle: dir > 0 ? -0.4 : Math.PI + 0.4, spread: 1.4, collide: true });
  };
  G.dmgNumber = (x, y, amount, color, crit) => {
    const n = Math.max(1, Math.round(amount));
    G.fx.text(x, y, crit ? n + '!' : '' + n, color || (crit ? '#ffe14a' : '#ffffff'), crit ? 2 : 1, crit ? 0.9 : 0.7);
  };

  // ---------------------------------------------------------------- explosions
  G.explode = (x, y, r, dmg, team, opts) => {
    opts = opts || {};
    G.fx.ring(x, y, r, opts.color || '#ffb050', 0.3, 3);
    G.fx.spawn({ x, y, type: 'glow', size: r * 1.6, size2: r * 0.4, life: 0.25, color: opts.color || '#ff9040', add: true });
    G.fx.burst(x, y, 16, { color: opts.colors || ['#ffd060', '#ff8030', '#ff4020'], speed: r * 5, life: 0.4, size: 2, size2: 0, drag: 0.08, add: true });
    G.fx.burst(x, y, 8, { color: '#3a3030', speed: r * 2, life: 0.9, size: 6, size2: 14, type: 'smoke', drag: 0.05, vy: -20 });
    G.addLight(x, y, r * 4, opts.color || '#ffa050', 1.5);
    G.shake(opts.shake === undefined ? 0.3 : opts.shake);
    if (!opts.silent) G.Audio.play(opts.sfx || 'explosion', { x, y });
    const hits = [];
    if (team === 'player' || team === 'neutral') {
      for (const e of G.world.enemies) {
        if (e.dead || e.dying) continue;
        if (Math.hypot(e.cx - x, e.cy - y) < r + Math.max(e.w, e.h) / 2) {
          e.takeHit({ dmg, kind: opts.kind || 'skill', team: 'player', x, y, dir: e.cx > x ? 1 : -1, knock: opts.knock || 200, statuses: opts.statuses, power: opts.power, item: opts.item, poise: 40 });
          hits.push(e);
        }
      }
    }
    if (team === 'enemy' || team === 'neutral') {
      const p = G.world.player;
      if (p && !p.dead && Math.hypot(p.cx - x, p.cy - y) < r + 8) p.takeHit({ dmg: opts.pdmg || dmg, kind: 'explosion', team: 'enemy', x, y, dir: p.cx > x ? 1 : -1, knock: 220, statuses: opts.pstatuses });
    }
    return hits;
  };

  // lightning bolt visual between two points
  G.boltFx = (x0, y0, x1, y1, color) => {
    const n = 8;
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const nx = x0 + (x1 - x0) * t + (i < n ? (Math.random() - 0.5) * 16 : 0);
      const ny = y0 + (y1 - y0) * t + (i < n ? (Math.random() - 0.5) * 16 : 0);
      const steps = Math.ceil(Math.hypot(nx - px, ny - py) / 3);
      for (let k = 0; k < steps; k++) G.fx.spawn({ x: px + ((nx - px) * k) / steps, y: py + ((ny - py) * k) / steps, life: 0.18, color: k % 3 ? color || '#a0d0ff' : '#ffffff', size: 2, size2: 1, add: true });
      px = nx;
      py = ny;
    }
    G.addLight((x0 + x1) / 2, (y0 + y1) / 2, 140, color || '#a0d0ff', 1.3);
  };

  // ---------------------------------------------------------------- projectiles
  class Proj extends G.Entity {
    constructor(o) {
      const w = o.w || 6, h = o.h || 4;
      super(o.x - w / 2, o.y - h / 2, w, h);
      Object.assign(this, o);
      this.w = w;
      this.h = h;
      this.layer = 5;
      this.life = o.life || 3;
      this.age = 0;
      this.hitSet = new Set();
      this.pierce = o.pierce || 0;
      this.grav = o.grav || 0;
      this.alwaysDraw = true;
    }
    get ang() { return Math.atan2(this.vy, this.vx); }
    update(dt) {
      this.age += dt;
      this.life -= dt;
      if (this.life <= 0) return this.expire();
      const L = G.world.level;
      const T = this.type;
      if (this.homing && this.age > 0.2) {
        const tgt = this.team === 'enemy' ? G.world.player : G.world.nearestEnemy(this.cx, this.cy, 260);
        if (tgt && !tgt.dead) {
          const a = Math.atan2(tgt.cy - this.cy, tgt.cx - this.cx);
          const sp = Math.hypot(this.vx, this.vy);
          let cur = this.ang;
          const diff = G.wrapAngle(a - cur);
          cur += G.clamp(diff, -this.homing * dt, this.homing * dt);
          this.vx = Math.cos(cur) * sp;
          this.vy = Math.sin(cur) * sp;
        }
      }
      if (T === 'chakram') {
        const p = G.world.player;
        if (!this.returning && this.age > (this.outTime || 0.45)) { this.returning = true; this.hitSet.clear(); }
        if (this.returning && p) {
          const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
          const sp = Math.min(520, Math.hypot(this.vx, this.vy) + 900 * dt);
          this.vx = Math.cos(a) * sp;
          this.vy = Math.sin(a) * sp;
          if (Math.hypot(p.cx - this.cx, p.cy - this.cy) < 14) { G.world.kill(this); if (p.chakramBack) p.chakramBack(); return; }
        } else this.vx *= Math.pow(0.2, dt);
      }
      this.vy += this.grav * dt;
      if (T === 'wave' || T === 'shock') {
        // hug the ground
        this.x += this.vx * dt;
        const fx = this.vx > 0 ? this.x + this.w : this.x;
        if (L.solidAt(fx, this.y + this.h / 2) || (!L.solidAt(fx, this.y + this.h + 4) && !L.isOneWay(Math.floor(fx / TS), Math.floor((this.y + this.h + 4) / TS)))) return this.expire();
        if (Math.random() < 0.7) G.fx.spawn({ x: this.cx, y: this.y + this.h, vx: -this.vx * 0.1, vy: -60 - Math.random() * 60, grav: 400, life: 0.4, color: T === 'wave' ? (Math.random() < 0.5 ? '#6ad0e0' : '#ffffff') : (this.color || '#c0a080'), size: 2, size2: 0 });
      } else {
        const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
        if (!this.ghost && L.rectSolid(nx, ny, this.w, this.h)) {
          if (T === 'bomb' || T === 'grenade' || T === 'bubble' || T === 'glob') {
            if (T === 'grenade' || T === 'glob' || T === 'bubble') { this.x = nx; this.y = ny; return this.expire(); }
            if (L.rectSolid(nx, this.y, this.w, this.h)) this.vx *= -0.5;
            else { this.vy *= -0.45; this.vx *= 0.7; }
          } else if (T === 'chakram' && !this.returning) {
            this.returning = true;
            this.hitSet.clear();
          } else {
            this.x = nx - this.vx * dt * 0.5;
            this.y = ny - this.vy * dt * 0.5;
            return this.expire(true);
          }
        } else { this.x = nx; this.y = ny; }
      }
      // trails
      this.trail();
      // hits
      if (this.team === 'player') {
        const r = this.hitR || 0;
        for (const e of G.world.enemiesIn(this.x - r, this.y - r, this.w + r * 2, this.h + r * 2)) {
          if (this.hitSet.has(e)) continue;
          this.hitSet.add(e);
          this.hitEnemy(e);
          if (this.dead) return;
        }
        for (const o of G.world.hittablesIn(this.x, this.y, this.w, this.h)) {
          if (this.hitSet.has(o) || !o.projHittable) continue;
          this.hitSet.add(o);
          o.onHit({ dmg: this.dmg, kind: 'ranged', dir: Math.sign(this.vx) || 1, proj: this });
          if (!this.pierce) return this.expire();
        }
      } else if (this.team === 'enemy') {
        const p = G.world.player;
        if (p && !p.dead && G.overlap(this, p)) {
          const res = p.takeHit({ dmg: this.dmg, kind: 'ranged', team: 'enemy', x: this.cx - this.vx * 0.05, y: this.cy, dir: Math.sign(this.vx) || (p.cx > this.cx ? 1 : -1), knock: this.knock || 120, statuses: this.statuses, proj: this, unblockable: this.unblockable });
          if (res === 'reflect') {
            this.team = 'player';
            this.vx = -this.vx * 1.3;
            this.vy = -this.vy * 0.5 - 30;
            this.dmg *= p.reflectMult || 1;
            this.hitSet.clear();
            this.life = 2;
            G.Audio.play('parry');
          } else if (res !== 'miss') {
            if (T === 'glob') this.expire();
            else if (!this.pierce) this.expire();
          }
        }
      }
    }
    hitEnemy(e) {
      const p = G.world.player;
      let crit = this.crit;
      if (this.critIf === 'returning' && this.returning) crit = true;
      if (this.critIf === 'far' && p && Math.hypot(e.cx - this.startX, e.cy - this.startY) > 160) crit = true;
      const dmg = p ? p.finalDamage(this.dmg, e, this.item, crit || (this.critIf && p.checkCrit(this.critIf, e, { proj: this }))) : { dmg: this.dmg, crit };
      e.takeHit({ dmg: dmg.dmg, crit: dmg.crit, kind: 'ranged', team: 'player', x: this.cx - this.vx * 0.05, y: this.cy, dir: Math.sign(this.vx) || 1, knock: this.knock === undefined ? 80 : this.knock, statuses: this.statuses, power: this.power, item: this.item, poise: this.poise || 8 });
      if (this.type === 'harpoon' && !e.isBoss && !e.heavy) {
        e.pullTo = { x: p.cx + p.facing * 16, t: 0.3 };
      }
      if (this.type === 'fireball' || this.type === 'grenade') return this.expire();
      if (this.pierce > 0) { this.pierce--; return; }
      this.expire();
    }
    trail() {
      const T = this.type;
      if (T === 'fireball') {
        G.fx.spawn({ x: this.cx, y: this.cy, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 0.35, color: '#ffa030', color2: '#601010', size: 4, size2: 0, add: true });
        G.addLight(this.cx, this.cy, 70, '#ff8030', 1);
      } else if (T === 'frostbolt') {
        G.fx.spawn({ x: this.cx, y: this.cy, life: 0.3, color: '#a0f0ff', size: 2, size2: 0, add: true });
        G.addLight(this.cx, this.cy, 50, '#80e0ff', 0.8);
      } else if (T === 'orb') {
        G.fx.spawn({ x: this.cx, y: this.cy, life: 0.4, color: this.color || '#60e0c0', size: 3, size2: 0, add: true });
        G.addLight(this.cx, this.cy, 60, this.color || '#60e0c0', 0.9);
      } else if (T === 'crescent' || T === 'chakram') {
        G.fx.spawn({ x: this.cx, y: this.cy, life: 0.15, color: T === 'crescent' ? '#ff90d0' : '#80e0f0', size: 2, size2: 0, add: true });
      } else if (T === 'glob' || T === 'bubble') {
        if (Math.random() < 0.4) G.fx.spawn({ x: this.cx, y: this.cy, vy: 20, life: 0.3, color: this.color || '#8ae04a', size: 2, size2: 0 });
      } else if (T === 'bomb' || T === 'grenade') {
        if (Math.random() < 0.5) G.fx.spawn({ x: this.cx, y: this.cy - 3, vy: -20, life: 0.3, color: '#ffd060', size: 1, add: true });
      } else if (T === 'spore') {
        G.addLight(this.cx, this.cy, 30, '#c090ff', 0.6);
      }
    }
    expire(wall) {
      if (this.dead) return;
      G.world.kill(this);
      const T = this.type;
      if (T === 'fireball' || T === 'grenade' || T === 'bomb') {
        if (this.onExplode) this.onExplode(this);
        else G.explode(this.cx, this.cy, this.aoe || 32, this.dmg, this.team, { statuses: this.statuses, power: this.power, item: this.item, pdmg: this.dmg });
      } else if (T === 'glob') {
        G.world.add(new G.Puddle(this.cx, this.cy, this.puddle || 'poison', this.dmg * 0.5));
        G.Audio.play('splash', { x: this.cx, y: this.cy, vol: 0.5 });
      } else if (T === 'bubble') {
        G.fx.ring(this.cx, this.cy, 16, '#a0e0ff', 0.25, 2);
        G.Audio.play('bubble', { x: this.cx, y: this.cy });
        if (this.puddle) G.world.add(new G.Puddle(this.cx, this.cy, this.puddle, this.dmg * 0.4));
      } else if (T === 'frostbolt') G.fx.burst(this.cx, this.cy, 8, { color: ['#a0f0ff', '#ffffff'], speed: 80, life: 0.3, size: 2, size2: 0 });
      else if (wall && (T === 'arrow' || T === 'bolt' || T === 'earrow' || T === 'knife')) {
        G.fx.spawn({ x: this.cx, y: this.cy, life: 1.2, type: 'shard', size: 3, rot: this.ang, color: '#8a6a4a' });
        G.fx.burst(this.cx, this.cy, 3, { color: '#c0c0c0', speed: 60, life: 0.2, size: 1 });
      } else G.fx.burst(this.cx, this.cy, 4, { color: this.color || '#ffffff', speed: 60, life: 0.25, size: 1 });
    }
    draw(ctx, cx, cy) {
      const x = this.cx - cx, y = this.cy - cy;
      const T = this.type;
      const a = this.ang;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      switch (T) {
        case 'arrow': case 'earrow':
          ctx.rotate(a);
          ctx.fillStyle = T === 'earrow' ? '#c8a070' : '#d8c090';
          ctx.fillRect(-8, -0.5, 12, 1);
          ctx.fillStyle = '#e0e0e8';
          ctx.fillRect(3, -1, 3, 3);
          ctx.fillStyle = T === 'earrow' ? '#a03030' : '#f0f0f0';
          ctx.fillRect(-9, -1.5, 3, 1); ctx.fillRect(-9, 1, 3, 1);
          break;
        case 'bolt':
          ctx.rotate(a);
          ctx.fillStyle = '#9aa8b0'; ctx.fillRect(-6, -1, 10, 2);
          ctx.fillStyle = '#e8f0f0'; ctx.fillRect(4, -1.5, 3, 3);
          break;
        case 'knife':
          ctx.rotate(this.age * 30);
          ctx.fillStyle = '#d0d8e0'; ctx.fillRect(-4, -1, 6, 2);
          ctx.fillStyle = '#6a2a2a'; ctx.fillRect(-6, -1, 2, 2);
          break;
        case 'thorn':
          ctx.rotate(a);
          ctx.fillStyle = '#a0c060'; ctx.fillRect(-4, -1, 7, 2);
          ctx.fillStyle = '#e0f090'; ctx.fillRect(2, -1, 2, 1);
          break;
        case 'fireball':
          G.pixCircle(ctx, 0, 0, 4, '#ff7020'); G.pixCircle(ctx, 0, 0, 2, '#ffe080');
          break;
        case 'frostbolt':
          ctx.rotate(a);
          ctx.fillStyle = '#80e0ff'; ctx.fillRect(-5, -2, 8, 4);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -1, 4, 2);
          break;
        case 'orb':
          G.pixCircle(ctx, 0, 0, 4, this.color || '#40c0a0');
          G.pixCircle(ctx, 0, 0, 2, '#ffffff');
          break;
        case 'chakram':
          ctx.rotate(this.age * 25);
          ctx.strokeStyle = '#60c0d0'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(3, -1, 2, 2);
          break;
        case 'harpoon': case 'eharpoon':
          ctx.rotate(a);
          ctx.fillStyle = '#6a5038'; ctx.fillRect(-12, -1, 14, 2);
          ctx.fillStyle = '#b0b8c0'; ctx.fillRect(2, -2, 5, 4); ctx.fillRect(0, -3, 2, 1); ctx.fillRect(0, 2, 2, 1);
          break;
        case 'wave':
          ctx.fillStyle = '#3a9ab0'; ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
          ctx.fillStyle = '#9ae8f0'; ctx.fillRect(-this.w / 2, -this.h / 2, this.w, 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(this.vx > 0 ? this.w / 2 - 3 : -this.w / 2, -this.h / 2 - 2, 3, 3);
          break;
        case 'shock':
          ctx.fillStyle = this.color || '#e0c080';
          for (let i = 0; i < 3; i++) ctx.fillRect(-4 + i * 3, this.h / 2 - 4 - ((i * 3 + this.age * 40) % 6), 2, 4 + ((i * 3 + this.age * 40) % 6));
          break;
        case 'crescent':
          ctx.scale(Math.sign(this.vx) || 1, 1);
          ctx.strokeStyle = '#ff90d0'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(-6, 0, 10, -1.1, 1.1); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(-5, 0, 10, -0.9, 0.9); ctx.stroke();
          break;
        case 'glob':
          G.pixCircle(ctx, 0, 0, 3, this.color || '#6ab030');
          ctx.fillStyle = '#d0ff90'; ctx.fillRect(-1, -2, 2, 1);
          break;
        case 'bubble':
          ctx.strokeStyle = this.color || '#a0e0ff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -2, 1, 1);
          break;
        case 'bomb': case 'grenade': {
          const col = this.color || '#3a3a44';
          G.pixCircle(ctx, 0, 0, 4, col);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, -2, 1, 1);
          ctx.fillStyle = '#c0a060'; ctx.fillRect(0, -6, 1, 2);
          if ((this.age * 10) % 2 < 1) { ctx.fillStyle = '#ffe060'; ctx.fillRect(-1, -8, 2, 2); }
          break;
        }
        case 'spore':
          ctx.globalAlpha = 0.8;
          G.pixCircle(ctx, 0, 0, 3, '#b080f0');
          ctx.fillStyle = '#f0d0ff'; ctx.fillRect(-1, -1, 2, 2);
          break;
        case 'feather':
          ctx.rotate(a);
          ctx.fillStyle = '#d0d8e0'; ctx.fillRect(-5, -1, 8, 2);
          ctx.fillStyle = '#8090a0'; ctx.fillRect(-5, 0, 8, 1);
          break;
        case 'blade':
          ctx.rotate(Math.PI / 2);
          ctx.fillStyle = '#80c0ff'; ctx.fillRect(-1, -8, 3, 14);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -8, 1, 12);
          G.addLight(this.cx, this.cy, 40, '#80c0ff', 0.7);
          break;
        default:
          ctx.fillStyle = this.color || '#ffffff';
          ctx.fillRect(-2, -2, 4, 4);
      }
      ctx.restore();
    }
  }
  G.Proj = Proj;

  // hazardous puddle (poison / brine / fire)
  class Puddle extends G.Entity {
    constructor(x, y, kind, dps) {
      super(x - 18, y - 4, 36, 6);
      this.kind = kind;
      this.dps = Math.max(2, dps || 4);
      this.life = kind === 'fire' ? 3 : 4;
      this.layer = 0;
      this.tick = 0;
      // settle on ground
      const gy = G.world.level.groundBelow(x, y - 4, 200);
      if (gy !== null) this.y = gy - 4;
    }
    update(dt) {
      this.life -= dt;
      if (this.life <= 0) return G.world.kill(this);
      this.tick -= dt;
      const col = this.kind === 'fire' ? '#ff8030' : this.kind === 'brine' ? '#6ae0c0' : '#8ae04a';
      if (Math.random() < 0.3) G.fx.spawn({ x: this.x + Math.random() * this.w, y: this.y + 2, vy: -20 - Math.random() * 20, life: 0.5, color: col, size: 2, size2: 0, add: this.kind === 'fire' });
      if (this.kind === 'fire') G.addLight(this.cx, this.y, 60, '#ff8030', 0.7);
      if (this.tick <= 0) {
        this.tick = 0.4;
        if (this.kind === 'fire') {
          for (const e of G.world.enemiesIn(this.x, this.y - 12, this.w, 16)) G.applyStatuses(e, { burn: 1 }, this.dps / 6);
        } else {
          const p = G.world.player;
          if (p && !p.dead && G.rectsOverlap(this.x, this.y - 8, this.w, 12, p.x, p.y, p.w, p.h)) G.applyStatuses(p, { poison: 1 }, this.dps / 8);
        }
      }
    }
    draw(ctx, cx, cy) {
      const a = Math.min(1, this.life);
      ctx.globalAlpha = a * 0.8;
      const col = this.kind === 'fire' ? '#ff7030' : this.kind === 'brine' ? '#3aa090' : '#5aa030';
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(this.x - cx), Math.round(this.y - cy + 2), this.w, 3);
      ctx.fillRect(Math.round(this.x - cx + 4), Math.round(this.y - cy + 1), this.w - 8, 1);
      ctx.globalAlpha = 1;
    }
  }
  G.Puddle = Puddle;

  // ---------------------------------------------------------------- pickups
  class Coin extends G.Entity {
    constructor(x, y, value, kind) {
      super(x - 3, y - 3, 6, 6);
      this.value = value;
      this.kind = kind || 'gold';
      this.vx = (Math.random() - 0.5) * 160;
      this.vy = -120 - Math.random() * 140;
      this.age = 0;
      this.layer = 4;
    }
    update(dt) {
      this.age += dt;
      const p = G.world.player;
      const magnet = this.age > 0.45 && p && !p.dead;
      if (magnet && Math.hypot(p.cx - this.cx, p.cy - this.cy) < (this.kind === 'ember' ? 120 : 80)) {
        const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
        this.vx = G.lerp(this.vx, Math.cos(a) * 420, 0.2);
        this.vy = G.lerp(this.vy, Math.sin(a) * 420, 0.2);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (Math.hypot(p.cx - this.cx, p.cy - this.cy) < 10) {
          G.world.kill(this);
          if (this.kind === 'gold') p.addGold(this.value);
          else p.addEmbers(this.value);
        }
        return;
      }
      this.vy = Math.min(this.vy + 900 * dt, 400);
      this.vx *= Math.pow(0.3, dt);
      if (this.moveX(this.vx * dt)) this.vx *= -0.5;
      const r = this.moveY(this.vy * dt);
      if (r === 'floor') { this.vy = Math.abs(this.vy) > 60 ? -this.vy * 0.4 : 0; this.vx *= 0.8; }
      if (this.age > 30) G.world.kill(this);
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      if (this.kind === 'gold') {
        const s = Math.abs(Math.sin(this.age * 6 + this.value));
        const w = Math.max(1, Math.round(s * 5));
        ctx.fillStyle = '#a07010';
        ctx.fillRect(x + 3 - w / 2, y, w, 6);
        ctx.fillStyle = '#ffd24a';
        ctx.fillRect(x + 3 - w / 2, y, Math.max(1, w - 1), 5);
        if (w > 3) { ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 2, y + 1, 1, 2); }
      } else {
        const p = Math.sin(this.age * 8) * 0.5 + 0.5;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        ctx.drawImage(G.glowSprite('#ff8a30'), x - 7, y - 7, 20, 20);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ff9a3c';
        ctx.fillRect(x + 1, y + 1, 4, 4);
        ctx.fillStyle = p > 0.5 ? '#fff0c0' : '#ffd080';
        ctx.fillRect(x + 2, y + 2, 2, 2);
        G.addLight(this.cx, this.cy, 30, '#ff9a3c', 0.6);
      }
    }
  }
  G.Coin = Coin;

  G.spawnGold = (x, y, total) => {
    total = Math.round(total);
    if (total <= 0) return;
    const n = Math.min(10, Math.max(1, Math.round(total / 6)));
    let left = total;
    for (let i = 0; i < n; i++) {
      const v = i === n - 1 ? left : Math.max(1, Math.round(total / n));
      left -= v;
      if (v > 0) G.world.add(new Coin(x, y, v, 'gold'));
    }
  };
  G.spawnEmbers = (x, y, total) => {
    const n = Math.min(12, total);
    let left = total;
    for (let i = 0; i < n; i++) {
      const v = i === n - 1 ? left : Math.max(1, Math.floor(total / n));
      left -= v;
      if (v > 0) G.world.add(new Coin(x, y, v, 'ember'));
    }
  };

  // loot from a slain enemy
  G.dropLoot = (e) => {
    const tier = G.world.level.tier || 1;
    const p = G.world.player;
    const greed = p && p.hasMut('greed') ? 1.6 : 1;
    let gold = (e.def.gold || 3) * (0.7 + Math.random() * 0.6) * (1 + (tier - 1) * 0.7) * greed;
    if (e.elite) gold *= 6;
    G.spawnGold(e.cx, e.cy, gold);
    let emb = 0;
    if (Math.random() < (e.def.ember || 0.3)) emb = 1 + (Math.random() < 0.35 ? 1 : 0);
    if (e.elite) emb += 8 + Math.floor(Math.random() * 8);
    if (emb) G.spawnEmbers(e.cx, e.cy, emb);
    // blueprints
    for (const id in G.ITEMS) {
      const d = G.ITEMS[id];
      if (!d.bp || d.bp.from !== e.id) continue;
      if (G.save.bpFound[id] || G.save.unlocked[id]) continue;
      if (Math.random() < d.bp.chance * (e.elite ? 4 : 1)) G.world.add(new G.BlueprintDrop(e.cx, e.cy - 6, id));
    }
    if (e.elite) {
      const pool = G.itemPool();
      const it = G.makeItem(G.rng.pick(pool), tier, G.rng, { bonus: 0.4 });
      G.world.add(new G.ItemDrop(e.cx, e.y + e.h, it, { pop: true }));
      if (Math.random() < 0.5) {
        // elites often carry an unfound blueprint
        const locked = Object.keys(G.ITEMS).filter((id) => G.ITEMS[id].bp && !G.ITEMS[id].bossItem && G.ITEMS[id].bp.from !== 'guardian' && !G.save.bpFound[id] && !G.save.unlocked[id]);
        if (locked.length) G.world.add(new G.BlueprintDrop(e.cx, e.cy - 10, G.rng.pick(locked)));
      }
    }
    if (Math.random() < 0.025) G.world.add(new G.FoodDrop(e.cx, e.y + e.h, tier));
  };
})();
