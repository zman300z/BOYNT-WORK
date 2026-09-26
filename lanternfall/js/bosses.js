'use strict';
// ============================================================================
// Bosses: The Bellwarden, Mother Brine, King Oris
// ============================================================================
(function () {
  const G = window.G;
  const TS = G.TS;
  const GRAV = 1400;

  const BOSSES = {
    bellwarden: { name: 'THE BELLWARDEN', title: 'Captain Hale, Who Tolls for No One', w: 34, h: 50, hp: 1150, dmg: 24, stagger: 260, music: 'boss1', intro: 'haleIntro', phases: [0.5] },
    motherbrine: { name: 'MOTHER BRINE', title: 'What the Sea Returned', w: 44, h: 44, hp: 1450, dmg: 26, stagger: 320, music: 'boss2', intro: 'brineIntro', phases: [0.5], floaty: true },
    oris: { name: 'ORIS, THE DROWNED CROWN', title: 'Last Memory of Vael', w: 16, h: 38, hp: 1650, dmg: 28, stagger: 300, music: 'boss3', intro: 'orisIntro', phases: [0.65, 0.3] },
  };
  G.BOSSES = BOSSES;

  class Boss extends G.Entity {
    constructor(id, x, y) {
      const def = BOSSES[id];
      super(0, 0, def.w, def.h);
      this.setFeet(x, y);
      this.id = id;
      this.def = def;
      this.isEnemy = true;
      this.team = 'enemy';
      this.layer = 2;
      this.alwaysDraw = true;
      const tier = Math.max(1, G.world.level.tier || 4);
      this.maxHp = this.hp = Math.round(def.hp * G.TIER_HP[tier]);
      this.dmgMul = G.TIER_DMG[tier];
      this.name = def.name;
      this.title = def.title;
      this.state = 'idle';
      this.phase = 1;
      this.facing = -1;
      this.mv = null;
      this.mvCd = 1.2;
      this.cds = {};
      this.stag = 0;
      this.staggered = 0;
      this.st = {};
      this.flashT = 0;
      this.animT = 0;
      this.invulnT = 0;
    }
    get isBoss() { return true; }
    hurtbox() { return this; }
    dmg(mult) { return this.def.dmg * this.dmgMul * (mult || 1); }
    player() { return G.world.player; }
    update(dt) {
      this.animT += dt;
      if (this.flashT > 0) this.flashT -= dt;
      if (this.invulnT > 0) this.invulnT -= dt;
      if (this.state === 'dying') return this.updateDying(dt);
      G.tickStatuses(this, dt);
      if (this.state === 'idle') {
        const p = this.player();
        const ar = G.world.level.arena;
        if (p && ar && p.cx > ar.x0 + 40 && p.cx < ar.x1 - 40) G.game.startBossIntro(this);
        this.physics(dt);
        return;
      }
      if (this.state !== 'fight') { this.physics(dt); return; }
      for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
      // phase transitions
      const th = this.def.phases[this.phase - 1];
      if (th !== undefined && this.hp <= this.maxHp * th) return this.nextPhase();
      if (this.staggered > 0) {
        this.staggered -= dt;
        this.vx = G.approach(this.vx, 0, 600 * dt);
        this.physics(dt);
        return;
      }
      const slow = G.hasSt(this, 'slow') ? 0.75 : 1;
      if (this.mv) this.updateMove(dt * slow);
      else {
        this.mvCd -= dt;
        this.idleMove(dt);
        if (this.mvCd <= 0) this.chooseMove();
      }
      this.physics(dt);
    }
    physics(dt) {
      if (this.def.floaty) return;
      this.vy = Math.min(600, this.vy + GRAV * dt);
      this.moveX(this.vx * dt);
      const r = this.moveY(this.vy * dt);
      if (r === 'floor') { if (this.vy > 300 && this.onLand) this.onLand(); this.vy = 0; }
      this.onGround = this.vy >= 0 && this.groundCheck();
      const ar = G.world.level.arena;
      if (ar) this.x = G.clamp(this.x, ar.x0, ar.x1 - this.w);
    }
    idleMove(dt) {
      const p = this.player();
      if (!p) return;
      this.facing = Math.sign(p.cx - this.cx) || this.facing;
      const dist = Math.abs(p.cx - this.cx);
      const sp = this.walkSpeed || 60;
      this.vx = G.approach(this.vx, dist > 70 ? this.facing * sp : 0, 400 * dt);
    }
    chooseMove() {
      const p = this.player();
      if (!p || p.dead) return;
      const dist = Math.abs(p.cx - this.cx);
      const opts = this.moves.filter((m) => (m.phase || 1) <= this.phase && !(this.cds[m.id] > 0) && dist >= m.range[0] && dist <= m.range[1]);
      if (!opts.length) { this.mvCd = 0.2; return; }
      const m = G.rng.weighted(opts, (m) => m.weight);
      this.mv = { m, ph: 'w', t: 0, data: {} };
      this.facing = Math.sign(p.cx - this.cx) || this.facing;
      this.vx = 0;
      if (m.w >= 0.6) G.Audio.play('telegraph', { vol: 0.8 });
      this.onMoveStart(this.mv, p);
    }
    updateMove(dt) {
      const mv = this.mv;
      const m = mv.m;
      const p = this.player();
      const spd = this.phase >= 2 ? 1.18 : 1;
      mv.t += dt * spd;
      if (mv.ph === 'w') {
        this.moveWindup(mv, dt, p);
        if (mv.t >= m.w) { mv.ph = 'a'; mv.t = 0; this.onActive(mv, p); }
      } else if (mv.ph === 'a') {
        const done = this.moveActive(mv, dt, p);
        if (done || mv.t >= m.a) { mv.ph = 'r'; mv.t = 0; this.onRecover && this.onRecover(mv, p); }
      } else {
        this.vx = G.approach(this.vx, 0, 900 * dt);
        if (mv.t >= m.r) {
          this.cds[m.id] = m.cd;
          this.mv = null;
          this.mvCd = (this.phase >= 3 ? 0.15 : this.phase >= 2 ? 0.3 : 0.5) + G.rng.next() * 0.4;
        }
      }
    }
    onMoveStart() {}
    moveWindup() {}
    onActive() {}
    moveActive() { return false; }
    boxW(box) {
      const [bx, by, bw, bh] = box;
      const x = this.facing > 0 ? this.cx + bx : this.cx - bx - bw;
      return { x, y: this.bottom + by, w: bw, h: bh };
    }
    hit(box, mult, opts) {
      const p = this.player();
      if (!p || p.dead) return null;
      const b = box.x !== undefined ? box : this.boxW(box);
      if (!G.rectsOverlap(b.x, b.y, b.w, b.h, p.x, p.y, p.w, p.h)) return null;
      opts = opts || {};
      return p.takeHit(Object.assign({ dmg: this.dmg(mult), team: 'enemy', kind: 'melee', x: this.cx, y: this.cy, dir: Math.sign(p.cx - this.cx) || this.facing, knock: 200, src: this, power: this.dmgMul }, opts));
    }
    addStagger(v) {
      if (this.state !== 'fight' || this.staggered > 0) return;
      this.stag += v;
      if (this.stag >= this.def.stagger) {
        this.stag = 0;
        this.staggered = 2.2;
        this.mv = null;
        this.cleanupMove && this.cleanupMove();
        G.Audio.play('stomp');
        G.fx.text(this.cx, this.y - 10, 'STAGGERED!', '#ffe060', 2, 1.2);
        G.shake(0.3);
      }
    }
    nextPhase() {
      this.phase++;
      this.mv = null;
      this.cleanupMove && this.cleanupMove();
      this.invulnT = 1.8;
      this.staggered = 0;
      this.mvCd = 1.8;
      G.Audio.play('bossRoar');
      G.shake(0.6);
      G.screenFlash('#ffffff', 0.3, 0.5);
      G.fx.ring(this.cx, this.cy, 80, '#ffffff', 0.5, 4);
      G.Audio.musicSection(this.phase === 2 ? 'P2' : 'P3');
      if (this.onPhase) this.onPhase(this.phase);
    }
    takeHit(h) {
      if (this.state !== 'fight' || this.invulnT > 0) {
        if (h.kind !== 'dot' && this.state === 'fight') G.Audio.play('hitMetal', { x: this.cx });
        return 'miss';
      }
      let dmg = h.dmg;
      if (this.staggered > 0 && h.kind !== 'dot') dmg *= 1.25;
      this.hp -= dmg;
      if (h.kind !== 'dot') {
        this.flashT = 0.08;
        this.addStagger((h.poise || 10) * 0.35 + (h.crit ? 4 : 0));
        if (h.statuses) G.applyStatuses(this, h.statuses, h.power || 1);
        if (!h.silent) {
          G.Audio.play(h.crit ? 'hitCrit' : 'hit', { x: this.cx, y: this.cy });
          G.hitFx(h.x !== undefined ? G.clamp(h.x + (h.dir || 0) * 12, this.x, this.x + this.w) : this.cx, h.y !== undefined ? G.clamp(h.y, this.y, this.bottom) : this.cy, h.dir || 1, h.crit ? '#ffe14a' : '#ffffff', h.crit);
          G.bloodFx(this.cx, this.cy, h.dir || 1, this.blood || '#a0a0b0', 5);
        }
      }
      G.dmgNumber(this.cx + (Math.random() - 0.5) * 20, this.y + 10, dmg, h.kind === 'dot' ? h.color : null, h.crit);
      const p = this.player();
      if (p && h.kind !== 'dot') p.onDealtDamage(dmg);
      G.game.stats.damageDealt += dmg;
      if (this.hp <= 0) this.die();
      return 'hit';
    }
    die() {
      this.hp = 0;
      this.state = 'dying';
      this.dyingT = 0;
      this.mv = null;
      this.cleanupMove && this.cleanupMove();
      G.slowMo(1.6, 0.25);
      G.shake(0.8);
      G.Audio.play('bossRoar');
      G.Audio.stopMusic(2.5);
      G.screenFlash('#ffffff', 0.5, 0.8);
      for (const e of G.world.enemies) if (e !== this && !e.dead) { e.die({}); }
      for (const e of G.world.ents) if (e.bossHazard) G.world.kill(e);
    }
    updateDying(dt) {
      this.dyingT += dt;
      if (Math.random() < 0.5) G.fx.burst(this.x + Math.random() * this.w, this.y + Math.random() * this.h, 4, { color: ['#ffffff', '#ffd080', this.blood || '#a0a0b0'], speed: 140, life: 0.5, size: 2, add: true });
      if (Math.random() < 0.15) G.Audio.play('explosion', { vol: 0.3 });
      if (this.dyingT > 2.2 && !this.doneDying) {
        this.doneDying = true;
        G.fx.burst(this.cx, this.cy, 60, { color: ['#ffffff', '#ffe080', '#ff9040'], speed: 300, life: 1.2, size: 3, size2: 0, add: true });
        G.fx.ring(this.cx, this.cy, 140, '#ffffff', 0.6, 5);
        G.Audio.play('explosion');
        G.world.kill(this);
        G.game.onBossDefeated(this);
      }
    }
    drawBar() {}
  }
  G.Boss = Boss;

  // ------------------------------------------------------------------ hazards
  class DropHazard extends G.Entity {
    constructor(x, groundY, w, delay, dmg, kind) {
      super(x - w / 2, groundY - 40, w, 40);
      const L = G.world.level;
      const gy = L.groundBelow(x, groundY - 30, 300);
      this.ground = gy !== null ? gy : groundY;
      this.y = this.ground - 40;
      this.delay = delay;
      this.t = 0;
      this.dmg = dmg;
      this.kind = kind;
      this.layer = 4;
      this.bossHazard = true;
      this.alwaysDraw = true;
      this.fall = -220;
    }
    update(dt) {
      this.t += dt;
      if (this.t >= this.delay && !this.landed) {
        this.fall += 900 * dt;
        if (this.fall >= 0) {
          this.landed = true;
          this.after = this.kind === 'bigbell' ? 1.2 : 0.35;
          G.shake(this.kind === 'bigbell' ? 0.8 : 0.25);
          G.Audio.play(this.kind === 'sword' ? 'hitMetal' : this.kind === 'bigbell' ? 'toll' : 'bellHit', { x: this.cx, note: 60 + G.rng.int(0, 12) });
          G.fx.burst(this.cx, this.ground, this.kind === 'bigbell' ? 40 : 12, { color: ['#c0b0a0', '#ffd080'], speed: this.kind === 'bigbell' ? 260 : 140, life: 0.5, size: 2, angle: -Math.PI / 2, spread: 2.8, grav: 500 });
          const p = G.world.player;
          if (p && G.rectsOverlap(this.x, this.ground - (this.kind === 'bigbell' ? 70 : 40), this.w, this.kind === 'bigbell' ? 70 : 40, p.x, p.y, p.w, p.h))
            p.takeHit({ dmg: this.dmg, team: 'enemy', kind: 'drop', x: this.cx, dir: Math.sign(p.cx - this.cx) || 1, knock: 220, unblockable: this.kind === 'bigbell' });
          if (this.kind === 'bigbell') for (const s of [1, -1]) G.world.add(new G.Proj({ x: this.cx + s * (this.w / 2 + 6), y: this.ground - 8, w: 12, h: 16, vx: s * 280, type: 'shock', team: 'enemy', dmg: this.dmg * 0.4, life: 1.4, pierce: 99, color: '#ffd080' }));
        }
      }
      if (this.landed) { this.after -= dt; if (this.after <= 0) G.world.kill(this); }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), gy = Math.round(this.ground - cy);
      if (!this.landed) {
        const warn = Math.min(1, this.t / this.delay);
        ctx.globalAlpha = 0.25 + warn * 0.4;
        ctx.fillStyle = '#ff3020';
        ctx.fillRect(x, gy - 2, this.w, 2);
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.2 + warn * 0.3;
        ctx.fillRect(x + (1 - warn) * this.w / 2, gy - 4, this.w * warn, 2);
        ctx.globalAlpha = 1;
      }
      const yy = gy + (this.landed ? 0 : this.fall);
      if (this.t >= this.delay || this.landed) {
        ctx.globalAlpha = this.landed ? Math.min(1, this.after * 3) : 1;
        if (this.kind === 'bell') {
          ctx.fillStyle = '#9a7a3a';
          ctx.fillRect(x + 2, yy - 18, this.w - 4, 14);
          ctx.fillRect(x, yy - 5, this.w, 5);
          ctx.fillStyle = '#c8a860';
          ctx.fillRect(x + 4, yy - 16, 2, 10);
        } else if (this.kind === 'bigbell') {
          ctx.fillStyle = '#8a6a30';
          ctx.beginPath();
          ctx.moveTo(x + this.w * 0.25, yy - 64);
          ctx.lineTo(x + this.w * 0.75, yy - 64);
          ctx.lineTo(x + this.w, yy - 4);
          ctx.lineTo(x, yy - 4);
          ctx.fill();
          ctx.fillStyle = '#a0803a';
          ctx.fillRect(x - 2, yy - 6, this.w + 4, 6);
          ctx.fillStyle = '#c8a050';
          ctx.fillRect(x + this.w * 0.3, yy - 58, 4, 48);
        } else if (this.kind === 'sword') {
          ctx.fillStyle = '#80c0ff';
          ctx.fillRect(x + this.w / 2 - 2, yy - 34, 4, 30);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + this.w / 2 - 2, yy - 34, 1, 28);
          ctx.fillStyle = '#80a0c0';
          ctx.fillRect(x + this.w / 2 - 6, yy - 38, 12, 3);
          ctx.fillRect(x + this.w / 2 - 1, yy - 44, 2, 6);
          G.addLight(this.cx, yy - 20 + cy, 50, '#80c0ff', 0.8);
        }
        ctx.globalAlpha = 1;
      }
    }
  }
  G.DropHazard = DropHazard;

  class Tentacle extends G.Entity {
    constructor(x, groundY, delay, dmg, h) {
      super(x - 9, groundY - (h || 96), 18, h || 96);
      this.ground = groundY;
      this.delay = delay;
      this.t = 0;
      this.dmg = dmg;
      this.layer = 4;
      this.bossHazard = true;
      this.alwaysDraw = true;
      this.hitDone = false;
    }
    update(dt) {
      this.t += dt;
      if (this.t < this.delay) {
        if (Math.random() < 0.6) G.fx.spawn({ x: this.x + Math.random() * this.w, y: this.ground - 2, vy: -40 - Math.random() * 40, life: 0.4, color: '#e080b0', size: 2, size2: 0 });
        return;
      }
      const up = this.t - this.delay;
      if (!this.sfx) { this.sfx = true; G.Audio.play('splash', { x: this.cx }); G.shake(0.15); }
      const ext = Math.min(1, up / 0.12);
      const p = G.world.player;
      if (!this.hitDone && p && ext > 0.5 && G.rectsOverlap(this.x + 2, this.ground - this.h * ext, this.w - 4, this.h * ext, p.x, p.y, p.w, p.h)) {
        this.hitDone = true;
        p.takeHit({ dmg: this.dmg, team: 'enemy', kind: 'tentacle', x: this.cx, dir: Math.sign(p.cx - this.cx) || 1, knock: 160, knockUp: 280 });
      }
      if (up > 0.7) G.world.kill(this);
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), gy = Math.round(this.ground - cy);
      if (this.t < this.delay) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ff60a0';
        ctx.fillRect(x, gy - 2, this.w, 2);
        ctx.globalAlpha = 1;
        return;
      }
      const up = this.t - this.delay;
      const ext = up < 0.12 ? up / 0.12 : up > 0.55 ? Math.max(0, 1 - (up - 0.55) / 0.15) : 1;
      const hh = this.h * ext;
      for (let i = 0; i < hh; i += 4) {
        const w = Math.max(3, this.w * (1 - i / this.h) * 0.9);
        const wob = Math.sin(i * 0.15 + this.t * 10) * 2;
        ctx.fillStyle = i % 8 ? '#8a3a6a' : '#a04a80';
        ctx.fillRect(Math.round(x + this.w / 2 - w / 2 + wob), gy - i - 4, Math.round(w), 4);
        if (i % 12 === 4) { ctx.fillStyle = '#f0b0d0'; ctx.fillRect(Math.round(x + this.w / 2 + wob + w / 2 - 3), gy - i - 3, 2, 2); }
      }
    }
  }

  class Flood extends G.Entity {
    constructor(ar, dur, dps) {
      super(ar.x0, ar.floor - 12, ar.x1 - ar.x0, 12);
      this.dur = dur;
      this.t = 0;
      this.dps = dps;
      this.layer = 4;
      this.bossHazard = true;
      this.alwaysDraw = true;
      this.tick = 0;
    }
    level() { return this.t < 0.8 ? this.t / 0.8 : this.t > this.dur - 0.8 ? Math.max(0, (this.dur - this.t) / 0.8) : 1; }
    update(dt) {
      this.t += dt;
      if (this.t >= this.dur) return G.world.kill(this);
      this.tick -= dt;
      const lv = this.level();
      const p = G.world.player;
      if (lv > 0.6 && this.tick <= 0 && p && p.bottom > this.bottom - 12 * lv && p.cx > this.x && p.cx < this.x + this.w) {
        this.tick = 0.5;
        p.takeHit({ dmg: this.dps * 0.5, team: 'enemy', kind: 'hazard', x: p.cx, dir: 0, knock: 0, knockUp: 260, statuses: { poison: 1 } });
      }
    }
    draw(ctx, cx, cy) {
      const lv = this.level();
      const h = Math.round(14 * lv);
      const x = Math.round(this.x - cx), y = Math.round(this.bottom - cy);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#2a7a70';
      ctx.fillRect(x, y - h, this.w, h);
      ctx.fillStyle = '#7ae0d0';
      for (let i = 0; i < this.w; i += 4) ctx.fillRect(x + i, y - h + Math.round(Math.sin(i * 0.1 + this.t * 5)), 3, 1);
      ctx.globalAlpha = 1;
      G.addLight(this.cx, this.bottom - 6, 200, '#40c0b0', 0.4 * lv);
    }
  }

  class Sweep extends G.Entity {
    constructor(ar, dir, dmg) {
      super(dir > 0 ? ar.x0 - 40 : ar.x1, ar.floor - 18, 40, 18);
      this.dir = dir;
      this.ar = ar;
      this.dmg = dmg;
      this.t = 0;
      this.layer = 4;
      this.bossHazard = true;
      this.alwaysDraw = true;
      this.hitDone = false;
    }
    update(dt) {
      this.t += dt;
      if (this.t < 0.6) return;
      this.x += this.dir * 420 * dt;
      if (Math.random() < 0.8) G.fx.spawn({ x: this.cx, y: this.bottom, vx: -this.dir * 60, vy: -80 - Math.random() * 60, grav: 500, life: 0.4, color: '#e080b0', size: 2, size2: 0 });
      const p = G.world.player;
      if (!this.hitDone && p && G.overlap(this, p)) { this.hitDone = true; p.takeHit({ dmg: this.dmg, team: 'enemy', kind: 'sweep', x: this.cx, dir: this.dir, knock: 260, knockUp: 200 }); }
      if ((this.dir > 0 && this.x > this.ar.x1 + 20) || (this.dir < 0 && this.x + this.w < this.ar.x0 - 20)) G.world.kill(this);
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      if (this.t < 0.6) {
        ctx.globalAlpha = 0.6 * (Math.sin(this.t * 30) * 0.5 + 0.5);
        ctx.fillStyle = '#ff60a0';
        const ex = this.dir > 0 ? Math.round(this.ar.x0 - cx) : Math.round(this.ar.x1 - cx) - 6;
        ctx.fillRect(ex, y, 6, this.h);
        ctx.globalAlpha = 1;
        return;
      }
      ctx.fillStyle = '#8a3a6a';
      ctx.fillRect(x, y + 4, this.w, this.h - 4);
      ctx.fillStyle = '#a04a80';
      ctx.fillRect(x, y + 4, this.w, 3);
      for (let i = 0; i < this.w; i += 8) { ctx.fillStyle = '#f0b0d0'; ctx.fillRect(x + i + 2, y + this.h - 4, 3, 2); }
      const tipX = this.dir > 0 ? x + this.w : x - 8;
      ctx.fillStyle = '#8a3a6a';
      ctx.fillRect(tipX, y + 8, 8, this.h - 10);
    }
  }

  // ================================================================ BELLWARDEN
  class Bellwarden extends Boss {
    constructor(x, y) {
      super('bellwarden', x, y);
      this.blood = '#b09060';
      this.walkSpeed = 55;
      this.moves = [
        { id: 'slam', w: 0.8, a: 0.3, r: 0.9, range: [0, 95], weight: 3, cd: 0.6 },
        { id: 'sweep', w: 0.6, a: 0.3, r: 0.7, range: [0, 85], weight: 3, cd: 0.6 },
        { id: 'charge', w: 0.9, a: 2.2, r: 0.9, range: [110, 999], weight: 2.5, cd: 3.5 },
        { id: 'toll', w: 1.0, a: 1.6, r: 0.8, range: [0, 999], weight: 1.5, cd: 7 },
        { id: 'leap', w: 0.6, a: 1.2, r: 0.8, range: [80, 999], weight: 2, cd: 4, phase: 2 },
        { id: 'greatbell', w: 0.5, a: 2.2, r: 1.0, range: [0, 999], weight: 1.4, cd: 11, phase: 2 },
      ];
    }
    onActive(mv, p) {
      const m = mv.m;
      const ar = G.world.level.arena;
      switch (m.id) {
        case 'slam': {
          G.Audio.play('swingHeavy');
          this.hit([6, -60, 64, 62], 1.3, { knock: 260 });
          G.shake(0.45);
          G.Audio.play('stomp');
          G.fx.burst(this.cx + this.facing * 40, this.bottom, 18, { color: ['#a09080', '#ffd080'], speed: 180, life: 0.5, size: 2, angle: -Math.PI / 2, spread: 2.6, grav: 500 });
          const n = this.phase >= 2 ? [1, -1] : [this.facing, -this.facing];
          for (const d of n) G.world.add(new G.Proj({ x: this.cx + d * 40, y: this.bottom - 8, w: 12, h: 16, vx: d * 250, type: 'shock', team: 'enemy', dmg: this.dmg(0.6), life: 1.6, pierce: 99, color: '#ffd080' }));
          if (this.phase >= 2) setTimeoutWorld(0.35, () => { for (const d of [1, -1]) G.world.add(new G.Proj({ x: this.cx + d * 30, y: this.bottom - 8, w: 12, h: 16, vx: d * 170, type: 'shock', team: 'enemy', dmg: this.dmg(0.5), life: 2, pierce: 99, color: '#ffd080' })); });
          break;
        }
        case 'sweep':
          G.Audio.play('swingHeavy');
          this.hit([-10, -44, 80, 44], 1.1, { knock: 300 });
          this.vx = this.facing * 120;
          break;
        case 'charge':
          mv.data.dir = this.facing;
          G.Audio.play('bossRoar', { vol: 0.5 });
          break;
        case 'toll': {
          G.Audio.play('toll');
          G.shake(0.4);
          G.fx.ring(this.cx, this.y + 10, 120, '#ffd080', 0.6, 4);
          G.fx.ring(this.cx, this.y + 10, 200, '#ffd080', 0.8, 2);
          const n = this.phase >= 2 ? 7 : 5;
          const pts = [p.cx];
          for (let i = 1; i < n; i++) pts.push(ar.x0 + 20 + G.rng.next() * (ar.x1 - ar.x0 - 40));
          pts.forEach((x, i) => G.world.add(new DropHazard(x, ar.floor, 22, 0.8 + i * 0.12, this.dmg(0.8), 'bell')));
          // ring shockwave on the ground
          for (const d of [1, -1]) G.world.add(new G.Proj({ x: this.cx + d * 30, y: this.bottom - 7, w: 12, h: 14, vx: d * 200, type: 'shock', team: 'enemy', dmg: this.dmg(0.5), life: 2.4, pierce: 99, color: '#ffd080' }));
          break;
        }
        case 'leap': {
          const t = 0.75;
          this.vx = (p.cx - this.cx) / t;
          this.vy = -GRAV * t / 2;
          mv.data.air = true;
          G.Audio.play('jump', { vol: 1 });
          this.onLand = () => {
            this.onLand = null;
            if (!this.mv || this.mv.m.id !== 'leap') return;
            this.vx = 0;
            G.shake(0.6);
            G.Audio.play('stomp');
            this.hit([-30, -40, 60, 42], 1.3, { knock: 260 });
            for (const d of [1, -1]) G.world.add(new G.Proj({ x: this.cx + d * 30, y: this.bottom - 8, w: 12, h: 16, vx: d * 260, type: 'shock', team: 'enemy', dmg: this.dmg(0.6), life: 1.6, pierce: 99, color: '#ffd080' }));
            G.fx.burst(this.cx, this.bottom, 24, { color: ['#a09080', '#ffd080'], speed: 200, life: 0.5, size: 2, angle: -Math.PI / 2, spread: 2.8, grav: 500 });
            this.mv.t = this.mv.m.a;
          };
          break;
        }
        case 'greatbell':
          G.Audio.play('toll');
          G.game.notify('[orange]The great bell breaks loose![]');
          G.world.add(new DropHazard(p.cx, ar.floor, 64, 1.3, this.dmg(2.2), 'bigbell'));
          break;
      }
    }
    moveWindup(mv, dt, p) {
      if (mv.m.id === 'charge' && Math.random() < 0.4) G.fx.spawn({ x: this.cx - this.facing * 20, y: this.bottom - 2, vx: -this.facing * 80, vy: -40, life: 0.3, color: '#ffd080', size: 1, type: 'spark' });
      if (mv.m.id === 'toll') this.vx = 0;
    }
    moveActive(mv, dt, p) {
      if (mv.m.id === 'charge') {
        this.vx = mv.data.dir * (this.phase >= 2 ? 420 : 360);
        if (Math.random() < 0.8) G.fx.spawn({ x: this.cx - mv.data.dir * 20, y: this.bottom - 2, vx: -mv.data.dir * 120, vy: -60, life: 0.3, color: '#ffd080', size: 1, type: 'spark' });
        if (!mv.data.hit && this.hit([4, -48, 30, 48], 1.2, { knock: 320 })) mv.data.hit = true;
        const ar = G.world.level.arena;
        if ((mv.data.dir > 0 && this.x + this.w >= ar.x1 - 2) || (mv.data.dir < 0 && this.x <= ar.x0 + 2)) {
          G.shake(0.6);
          G.Audio.play('toll', { vol: 0.6 });
          G.fx.burst(this.cx + mv.data.dir * 20, this.cy, 20, { color: '#c0b0a0', speed: 160, life: 0.5, size: 2 });
          this.vx = -mv.data.dir * 100;
          this.addStagger(this.def.stagger * 0.8);
          if (this.phase >= 2) for (let i = 0; i < 3; i++) G.world.add(new DropHazard(ar.x0 + 30 + G.rng.next() * (ar.x1 - ar.x0 - 60), ar.floor, 22, 0.6 + i * 0.2, this.dmg(0.8), 'bell'));
          return true;
        }
      }
      if (mv.m.id === 'leap' && this.onGround && mv.t > 0.2 && mv.data.air) return false;
      return false;
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      const flash = this.flashT > 0;
      const mv = this.mv;
      const tele = mv && mv.ph === 'w' && Math.floor(mv.t * 12) % 2 === 0;
      const C = flash ? () => '#ffffff' : tele ? (c) => G.mix(c, '#ff5040', 0.4) : (c) => c;
      const R = (a, b, w, h, c) => { ctx.fillStyle = C(c); ctx.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
      ctx.save();
      ctx.translate(x, y);
      if (this.state === 'dying') ctx.translate((Math.random() - 0.5) * 3, 0);
      ctx.scale(this.facing, 1);
      const walk = Math.abs(this.vx) > 10 && this.onGround ? Math.sin(this.animT * 8) : 0;
      let lean = 0, hamAng = 0.6;
      if (mv) {
        const id = mv.m.id, t = mv.ph === 'w' ? Math.min(1, mv.t / mv.m.w) : 1;
        if (id === 'slam') hamAng = mv.ph === 'w' ? G.lerp(0.6, -2.6, G.ease.outCubic(t)) : mv.ph === 'a' ? 1.3 : 1.2;
        if (id === 'sweep') hamAng = mv.ph === 'w' ? G.lerp(0.6, 2.8, t) : mv.ph === 'a' ? G.lerp(2.8, -0.2, Math.min(1, mv.t / 0.15)) : -0.2;
        if (id === 'charge') { hamAng = 2.4; lean = mv.ph === 'a' ? 6 : -2; }
        if (id === 'toll' || id === 'greatbell') hamAng = -1.6;
        if (id === 'leap') hamAng = -2.2;
        if (mv.ph === 'w' && id !== 'charge') lean = -t * 3;
      }
      if (this.staggered > 0) { lean = -4; hamAng = 1.6; }
      // legs
      R(-12 + walk * 3, -16, 8, 16, '#3a3440');
      R(4 - walk * 3, -16, 8, 16, '#4a4450');
      R(-13 + walk * 3, -3, 10, 3, '#2a2430');
      R(3 - walk * 3, -3, 10, 3, '#2a2430');
      // torso
      R(-16 + lean, -40, 32, 26, '#5a5060');
      R(-16 + lean, -40, 32, 4, '#8a8090');
      R(-16 + lean, -22, 32, 3, '#b08a4a');
      R(-10 + lean, -34, 20, 10, '#6a6070');
      R(-2 + lean, -34, 4, 12, '#b08a4a');
      // pauldrons
      R(-20 + lean, -42, 10, 8, '#7a7080');
      R(12 + lean, -42, 10, 8, '#7a7080');
      // bell head
      ctx.fillStyle = C('#9a7a3a');
      ctx.beginPath();
      ctx.moveTo(-8 + lean, -60);
      ctx.lineTo(8 + lean, -60);
      ctx.lineTo(13 + lean, -42);
      ctx.lineTo(-13 + lean, -42);
      ctx.fill();
      R(-14 + lean, -44, 28, 4, '#c8a050');
      R(-3 + lean, -64, 6, 4, '#7a5a2a');
      R(-6 + lean, -54, 12, 3, '#1a1008');
      const eye = this.phase >= 2 ? '#ff5030' : '#ffd060';
      R(-4 + lean, -53, 3, 1, eye);
      R(2 + lean, -53, 3, 1, eye);
      G.addLight(this.cx, this.y + 8, 60, eye, 0.8);
      // arm + hammer
      const sx = 10 + lean, sy = -36;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(hamAng);
      R(0, -3, 12, 6, '#5a5060');
      R(10, -2, 30, 4, '#5a4030');
      R(36, -9, 14, 18, '#8a6a30');
      R(36, -9, 14, 3, '#c8a050');
      R(48, -7, 3, 14, '#6a5020');
      ctx.restore();
      if (mv && mv.ph === 'a' && (mv.m.id === 'slam' || mv.m.id === 'sweep') && mv.t < 0.2) {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(sx, sy, 44, mv.m.id === 'slam' ? -2.6 : -0.2, mv.m.id === 'slam' ? 1.3 : 2.8);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (this.staggered > 0) for (let i = 0; i < 4; i++) { const a = this.animT * 5 + (i / 4) * Math.PI * 2; ctx.fillStyle = '#ffe060'; ctx.fillRect(Math.round(x + Math.cos(a) * 14), Math.round(this.y - cy - 12 + Math.sin(a) * 3), 2, 2); }
      if (mv && mv.ph === 'w') G.text(ctx, '!', x, Math.round(this.y - cy) - 26, '#ff4030', { align: 'center', outline: '#000', scale: 2 });
    }
  }

  // ================================================================ MOTHER BRINE
  class MotherBrine extends Boss {
    constructor(x, y) {
      super('motherbrine', x, y);
      this.blood = '#e080b0';
      this.baseY = y - 60;
      this.y = this.baseY - this.h;
      this.moves = [
        { id: 'tentacles', w: 0.5, a: 1.6, r: 0.6, range: [0, 999], weight: 3, cd: 2.5 },
        { id: 'bubbles', w: 0.7, a: 0.9, r: 0.7, range: [0, 999], weight: 2.5, cd: 3 },
        { id: 'sweep', w: 0.5, a: 1.6, r: 0.5, range: [0, 999], weight: 2, cd: 5 },
        { id: 'summon', w: 0.8, a: 0.3, r: 0.8, range: [0, 999], weight: 1, cd: 12 },
        { id: 'beam', w: 1.2, a: 0.7, r: 0.8, range: [0, 999], weight: 2, cd: 6, phase: 2 },
        { id: 'flood', w: 0.8, a: 0.4, r: 0.4, range: [0, 999], weight: 1.5, cd: 14, phase: 2 },
      ];
    }
    hurtbox() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    physics(dt) {
      const p = this.player();
      const ar = G.world.level.arena;
      if (!ar) return;
      if (this.state === 'fight' && p && !(this.mv && this.mv.m.id === 'beam')) {
        const tx = G.clamp(p.cx, ar.x0 + 80, ar.x1 - 80);
        this.vx = G.approach(this.vx, G.clamp((tx - this.cx) * 0.8, -50, 50), 60 * dt);
      } else this.vx *= 0.95;
      this.x += this.vx * dt;
      const bob = Math.sin(this.animT * 1.4) * 8;
      const dip = this.staggered > 0 ? 36 : 0;
      this.y = G.lerp(this.y, this.baseY - this.h + bob + dip, 1 - Math.pow(0.02, dt));
      this.x = G.clamp(this.x, ar.x0 + 20, ar.x1 - this.w - 20);
      this.facing = p ? Math.sign(p.cx - this.cx) || 1 : 1;
      // contact damage
      if (p && this.state === 'fight' && G.rectsOverlap(this.x + 6, this.y + 6, this.w - 12, this.h - 12, p.x, p.y, p.w, p.h)) p.takeHit({ dmg: this.dmg(0.6), team: 'enemy', kind: 'contact', x: this.cx, dir: Math.sign(p.cx - this.cx) || 1, knock: 220, src: this });
    }
    idleMove() {}
    onActive(mv, p) {
      const ar = G.world.level.arena;
      switch (mv.m.id) {
        case 'tentacles': {
          const n = this.phase >= 2 ? 6 : 4;
          const xs = [p.cx];
          for (let i = 1; i < n; i++) xs.push(G.clamp(p.cx + (G.rng.next() - 0.5) * 360, ar.x0 + 12, ar.x1 - 12));
          xs.forEach((x, i) => G.world.add(new Tentacle(x, ar.floor, 0.75 + i * 0.12, this.dmg(0.9))));
          G.Audio.play('bubble');
          break;
        }
        case 'bubbles': {
          const n = this.phase >= 2 ? 7 : 5;
          for (let i = 0; i < n; i++) {
            const tx = p.cx + (i - (n - 1) / 2) * 34;
            const t = 1.0 + i * 0.04;
            const sx = this.cx, sy = this.y + this.h - 10;
            G.world.add(new G.Proj({ x: sx, y: sy, w: 8, h: 8, vx: (tx - sx) / t, vy: (ar.floor - 6 - sy - 0.5 * 500 * t * t) / t, grav: 500, type: 'bubble', team: 'enemy', dmg: this.dmg(0.7), life: 3, puddle: 'brine', color: '#a0e0ff' }));
          }
          G.Audio.play('bubble');
          G.Audio.play('splash');
          break;
        }
        case 'sweep':
          G.world.add(new Sweep(ar, p.cx > (ar.x0 + ar.x1) / 2 ? 1 : -1, this.dmg(1)));
          if (this.phase >= 2) setTimeoutWorld(1.1, () => G.world.add(new Sweep(ar, G.rng.sign(), this.dmg(1))));
          G.Audio.play('scream', { vol: 0.5 });
          break;
        case 'summon':
          for (const s of [-1, 1]) {
            const m = G.world.add(new G.Enemy('slime', G.clamp(this.cx + s * 60, ar.x0 + 20, ar.x1 - 20), ar.floor, { tier: this.def.tier || 4 }));
            m.aggro = true;
          }
          G.Audio.play('splash');
          break;
        case 'beam':
          mv.data.fire = true;
          G.Audio.play('lightning');
          G.shake(0.4);
          break;
        case 'flood':
          G.world.add(new Flood(ar, 6, this.dmg(1)));
          G.game.notify('[teal]The brine rises! Get to higher ground![]');
          G.Audio.play('scream');
          break;
      }
    }
    moveWindup(mv, dt, p) {
      if (mv.m.id === 'beam') {
        mv.data.ax = G.lerp(mv.data.ax === undefined ? p.cx : mv.data.ax, p.cx, mv.t < mv.m.w - 0.3 ? 0.08 : 0);
        mv.data.ay = G.lerp(mv.data.ay === undefined ? p.cy : mv.data.ay, p.cy, mv.t < mv.m.w - 0.3 ? 0.08 : 0);
      }
    }
    moveActive(mv, dt, p) {
      if (mv.m.id === 'beam' && mv.data.fire) {
        const sx = this.cx, sy = this.y + this.h * 0.55;
        const ang = Math.atan2(mv.data.ay - sy, mv.data.ax - sx);
        mv.data.ang = ang;
        // extend beam to far
        const ex = sx + Math.cos(ang) * 700, ey = sy + Math.sin(ang) * 700;
        mv.data.ex = ex; mv.data.ey = ey;
        if (!mv.data.hit && p) {
          // distance from player centre to segment
          const vx = ex - sx, vy = ey - sy, wx = p.cx - sx, wy = p.cy - sy;
          const t = G.clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
          const d = Math.hypot(sx + vx * t - p.cx, sy + vy * t - p.cy);
          if (d < 12) { mv.data.hit = true; p.takeHit({ dmg: this.dmg(1.3), team: 'enemy', kind: 'beam', x: sx, dir: Math.sign(p.cx - sx) || 1, knock: 260, unblockable: true }); }
        }
        if (Math.random() < 0.8) {
          const r = Math.random();
          G.fx.spawn({ x: sx + (ex - sx) * r * 0.5, y: sy + (ey - sy) * r * 0.5, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.3, color: '#ffc0e0', size: 2, add: true });
        }
      }
      return false;
    }
    cleanupMove() {}
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.y - cy);
      const flash = this.flashT > 0;
      const mv = this.mv;
      const tele = mv && mv.ph === 'w' && Math.floor(mv.t * 10) % 2 === 0;
      const C = flash ? () => '#ffffff' : tele ? (c) => G.mix(c, '#ff5070', 0.35) : (c) => c;
      const t = this.animT;
      // trailing tentacles
      for (let i = 0; i < 7; i++) {
        const bx = x - 30 + i * 10;
        for (let k = 0; k < 14; k++) {
          const yy = y + this.h - 6 + k * 5;
          const xx = bx + Math.sin(t * 2 + i + k * 0.4) * (2 + k * 0.7);
          ctx.fillStyle = C(k % 3 ? '#7a3060' : '#9a4a80');
          ctx.fillRect(Math.round(xx), Math.round(yy), Math.max(1, 4 - k * 0.25), 5);
        }
      }
      // bell of the jellyfish
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = C('#6a2a58');
      ctx.beginPath();
      ctx.ellipse(x, y + 18, 46, 38, 0, Math.PI, 0);
      ctx.lineTo(x + 46, y + 30);
      ctx.lineTo(x - 46, y + 30);
      ctx.fill();
      ctx.fillStyle = C('#8a3a78');
      ctx.beginPath();
      ctx.ellipse(x, y + 14, 36, 28, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 8; i++) { ctx.fillStyle = C('#f0a0d0'); ctx.fillRect(x - 40 + i * 11, y + 26 + Math.round(Math.sin(t * 3 + i) * 2), 4, 4); }
      // glowing organs
      const pulse = Math.sin(t * 3) * 0.5 + 0.5;
      G.addLight(this.cx, this.y + 10, 160 + pulse * 30, '#ff80c0', 1);
      ctx.fillStyle = C('#ff90c8');
      ctx.fillRect(x - 14, y - 6, 6, 6);
      ctx.fillRect(x + 8, y - 10, 5, 5);
      // the face (Ilyse's)
      const fy = y + 20;
      ctx.fillStyle = C('#e8d8e8');
      ctx.fillRect(x - 9, fy, 18, 20);
      ctx.fillRect(x - 7, fy + 20, 14, 3);
      ctx.fillStyle = C('#f0e8ff');
      ctx.fillRect(x - 11, fy - 2, 22, 4);
      ctx.fillRect(x - 12, fy, 3, 16);
      ctx.fillRect(x + 9, fy, 3, 16);
      const eyeC = this.phase >= 2 ? '#ff3080' : '#40d0ff';
      ctx.fillStyle = '#1a0a1a';
      ctx.fillRect(x - 6, fy + 7, 4, 2);
      ctx.fillRect(x + 2, fy + 7, 4, 2);
      ctx.fillStyle = eyeC;
      ctx.fillRect(x - 5, fy + 7, 2, 1);
      ctx.fillRect(x + 3, fy + 7, 2, 1);
      const open = mv && (mv.m.id === 'beam' || mv.m.id === 'bubbles') ? 4 : 1;
      ctx.fillStyle = '#2a0a1a';
      ctx.fillRect(x - 2, fy + 14, 4, open);
      // tears
      ctx.fillStyle = '#a0e0ff';
      ctx.fillRect(x - 5, fy + 10 + Math.round((t * 10) % 8), 1, 2);
      ctx.fillRect(x + 4, fy + 10 + Math.round((t * 10 + 4) % 8), 1, 2);
      // crown remnant
      ctx.fillStyle = C('#c0a050');
      ctx.fillRect(x - 8, fy - 5, 16, 2);
      ctx.fillRect(x - 8, fy - 8, 2, 3);
      ctx.fillRect(x - 1, fy - 9, 2, 4);
      ctx.fillRect(x + 6, fy - 8, 2, 3);
      // beam
      if (mv && mv.m.id === 'beam') {
        const sx = x, sy = Math.round(this.y + this.h * 0.55 - cy);
        if (mv.ph === 'w' && mv.data.ax !== undefined) {
          ctx.globalAlpha = 0.3 + (mv.t / mv.m.w) * 0.5;
          G.pixLine(ctx, sx, sy, mv.data.ax - cx, mv.data.ay - cy, mv.t > mv.m.w - 0.3 ? '#ffffff' : '#ff4080');
          ctx.globalAlpha = 1;
        } else if (mv.ph === 'a' && mv.data.ex !== undefined) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = '#ff80c0';
          ctx.lineWidth = 10;
          ctx.globalAlpha = 0.5;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mv.data.ex - cx, mv.data.ey - cy); ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mv.data.ex - cx, mv.data.ey - cy); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
          G.addLight((this.cx + mv.data.ex) / 2, (this.cy + mv.data.ey) / 2, 200, '#ff80c0', 1);
        }
      }
      if (this.staggered > 0) G.text(ctx, '* * *', x, y - 20, '#ffe060', { align: 'center', outline: '#000' });
    }
  }

  // ================================================================ KING ORIS
  class Oris extends Boss {
    constructor(x, y) {
      super('oris', x, y);
      this.blood = '#6a9ab8';
      this.walkSpeed = 90;
      this.moves = [
        { id: 'combo', w: 0.45, a: 1.0, r: 0.5, range: [0, 80], weight: 3.5, cd: 0.5 },
        { id: 'thrust', w: 0.65, a: 0.4, r: 0.6, range: [90, 320], weight: 2.5, cd: 2.5 },
        { id: 'leapslam', w: 0.5, a: 1.3, r: 0.7, range: [60, 999], weight: 2, cd: 4 },
        { id: 'crown', w: 0.5, a: 1.6, r: 0.4, range: [100, 999], weight: 1.8, cd: 5 },
        { id: 'wave', w: 0.8, a: 0.5, r: 0.8, range: [0, 999], weight: 2, cd: 6, phase: 2 },
        { id: 'swords', w: 0.6, a: 0.6, r: 0.6, range: [0, 999], weight: 2, cd: 7, phase: 2 },
        { id: 'puddle', w: 0.4, a: 0.8, r: 0.1, range: [0, 999], weight: 1.8, cd: 5, phase: 2 },
        { id: 'undertow', w: 0.8, a: 2.6, r: 0.9, range: [0, 999], weight: 2, cd: 10, phase: 3 },
        { id: 'whirl', w: 0.5, a: 1.1, r: 0.6, range: [0, 90], weight: 2.5, cd: 3, phase: 3 },
      ];
    }
    onPhase(ph) {
      if (ph === 3) {
        G.game.darkPhase = true;
        G.game.say(G.DIALOGUE.orisPhase3);
        G.world.level.lanternLit = false;
      }
    }
    onActive(mv, p) {
      const ar = G.world.level.arena;
      switch (mv.m.id) {
        case 'combo': mv.data.k = 0; mv.data.next = 0; break;
        case 'thrust':
          this.vx = this.facing * (this.phase >= 3 ? 520 : 440);
          G.Audio.play('thrust');
          break;
        case 'leapslam': {
          const t = 0.7;
          this.vx = (p.cx - this.cx) / t;
          this.vy = -GRAV * t / 2;
          G.Audio.play('djump');
          this.onLand = () => {
            this.onLand = null;
            if (!this.mv || this.mv.m.id !== 'leapslam') return;
            this.vx = 0;
            G.shake(0.5);
            G.Audio.play('stomp');
            this.hit([-26, -36, 52, 38], 1.2, { knock: 240 });
            for (const d of [1, -1]) G.world.add(new G.Proj({ x: this.cx + d * 20, y: this.bottom - 9, w: 14, h: 18, vx: d * 280, type: 'wave', team: 'enemy', dmg: this.dmg(0.6), life: 1.4, pierce: 99 }));
            this.mv.t = this.mv.m.a;
          };
          break;
        }
        case 'crown':
          G.world.add(new CrownProj(this, p, this.dmg(0.8)));
          G.Audio.play('throw');
          break;
        case 'wave': {
          const dir = p.cx > this.cx ? 1 : -1;
          const sx = dir > 0 ? ar.x0 + 10 : ar.x1 - 10;
          G.world.add(new G.Proj({ x: sx, y: ar.floor - 22, w: 26, h: 44, vx: dir * 300, type: 'wave', team: 'enemy', dmg: this.dmg(1.1), life: 3, pierce: 99 }));
          if (this.phase >= 3) setTimeoutWorld(0.9, () => G.world.add(new G.Proj({ x: dir > 0 ? ar.x1 - 10 : ar.x0 + 10, y: ar.floor - 22, w: 26, h: 44, vx: -dir * 300, type: 'wave', team: 'enemy', dmg: this.dmg(1.1), life: 3, pierce: 99 })));
          G.Audio.play('splash');
          G.shake(0.3);
          break;
        }
        case 'swords': {
          const n = this.phase >= 3 ? 7 : 5;
          for (let i = 0; i < n; i++) G.world.add(new DropHazard(G.clamp(p.cx + (i - (n - 1) / 2) * 44 + (G.rng.next() - 0.5) * 16, ar.x0 + 10, ar.x1 - 10), ar.floor, 14, 0.7 + i * 0.1, this.dmg(0.9), 'sword'));
          G.Audio.play('magic');
          break;
        }
        case 'puddle':
          this.hidden = true;
          mv.data.target = p;
          G.fx.burst(this.cx, this.bottom, 20, { color: ['#3a7a90', '#a0e0f0'], speed: 100, life: 0.5, size: 2, grav: 300 });
          G.Audio.play('splash');
          break;
        case 'undertow':
          mv.data.hitT = 0;
          G.Audio.play('bossRoar');
          G.game.notify('[teal]The undertow drags you in![]');
          break;
        case 'whirl':
          mv.data.k = -1;
          G.Audio.play('swingHeavy');
          break;
      }
    }
    moveActive(mv, dt, p) {
      const id = mv.m.id;
      if (id === 'combo') {
        // three quick slashes
        if (mv.t >= mv.data.next && mv.data.k < 3) {
          mv.data.k++;
          mv.data.next = mv.t + (this.phase >= 3 ? 0.26 : 0.32);
          mv.data.hit = false;
          this.facing = Math.sign(p.cx - this.cx) || this.facing;
          this.vx = this.facing * 160;
          G.Audio.play('swing');
        }
        this.vx = G.approach(this.vx, 0, 900 * dt);
        if (!mv.data.hit && mv.t < mv.data.next - 0.12 && this.hit([0, -40, 44, 42], 0.8, { knock: 180 })) mv.data.hit = true;
        return mv.data.k >= 3 && mv.t >= mv.data.next;
      }
      if (id === 'thrust') {
        if (!mv.data.hit && this.hit([4, -30, 30, 16], 1.3, { knock: 260 })) mv.data.hit = true;
        if (Math.random() < 0.7) G.fx.spawn({ x: this.cx, y: this.cy, vx: -this.vx * 0.2, life: 0.25, color: '#a0e0ff', size: 2, add: true });
        this.vx = G.approach(this.vx, 0, 700 * dt);
      }
      if (id === 'puddle') {
        if (mv.t > 0.6 && this.hidden) {
          this.hidden = false;
          const side = -(p.facing || 1);
          const ar = G.world.level.arena;
          this.x = G.clamp(p.cx + side * 34 - this.w / 2, ar.x0, ar.x1 - this.w);
          this.y = p.bottom - this.h;
          this.facing = Math.sign(p.cx - this.cx) || 1;
          G.fx.burst(this.cx, this.bottom, 20, { color: ['#3a7a90', '#a0e0f0'], speed: 100, life: 0.5, size: 2, grav: 300 });
          G.Audio.play('splash');
          // immediate slash
          this.mv = { m: this.moves[0], ph: 'w', t: 0.2, data: {} };
          return false;
        }
      }
      if (id === 'undertow') {
        const d = this.cx - p.cx;
        if (Math.abs(d) > 20 && p.state !== 'dead') p.x += Math.sign(d) * 80 * dt;
        mv.data.hitT -= dt;
        for (let i = 0; i < 4; i++) {
          const a = this.animT * 4 + (i / 4) * Math.PI * 2;
          const bx = this.cx + Math.cos(a) * 52, by = this.cy + Math.sin(a) * 30;
          if (Math.random() < 0.3) G.fx.spawn({ x: bx, y: by, life: 0.2, color: '#80c0ff', size: 2, add: true });
          if (mv.data.hitT <= 0 && Math.hypot(p.cx - bx, p.cy - by) < 12) { mv.data.hitT = 0.5; p.takeHit({ dmg: this.dmg(0.7), team: 'enemy', kind: 'blade', x: bx, dir: Math.sign(p.cx - bx) || 1, knock: 160 }); }
        }
        if (Math.random() < 0.5) G.fx.spawn({ x: p.cx + Math.sign(-d) * 30 + (Math.random() - 0.5) * 20, y: p.bottom - 4, vx: Math.sign(d) * 120, life: 0.3, color: '#6ad0e0', size: 1 });
      }
      if (id === 'whirl') {
        const k = Math.floor(mv.t / 0.27);
        if (k !== mv.data.k) { mv.data.k = k; mv.data.hit = false; G.Audio.play('swingHeavy', { vol: 0.6 }); }
        this.vx = Math.sign(p.cx - this.cx) * 120;
        if (!mv.data.hit && this.hit({ x: this.cx - 40, y: this.bottom - 44, w: 80, h: 46 }, 0.7, { knock: 200 })) mv.data.hit = true;
      }
      return false;
    }
    cleanupMove() { this.hidden = false; }
    draw(ctx, cx, cy) {
      if (this.hidden) {
        const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
        ctx.fillStyle = '#2a6a80';
        ctx.fillRect(x - 12, y - 2, 24, 2);
        return;
      }
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      const flash = this.flashT > 0;
      const mv = this.mv;
      const tele = mv && mv.ph === 'w' && Math.floor(mv.t * 12) % 2 === 0;
      const C = flash ? () => '#ffffff' : tele ? (c) => G.mix(c, '#ff5040', 0.4) : (c) => c;
      const R = (a, b, w, h, c) => { ctx.fillStyle = C(c); ctx.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(this.facing, 1);
      const walk = Math.abs(this.vx) > 10 && this.onGround ? Math.sin(this.animT * 10) : 0;
      let swAng = 0.9, lean = 0;
      if (mv) {
        const id = mv.m.id, t = mv.ph === 'w' ? Math.min(1, mv.t / mv.m.w) : 0;
        if (id === 'combo') swAng = mv.ph === 'w' ? G.lerp(0.9, -2.2, t) : mv.ph === 'a' ? (mv.data.k % 2 ? -1.8 : 1.1) : 1;
        if (id === 'thrust') { swAng = 0; lean = mv.ph === 'a' ? 5 : -3 * t; }
        if (id === 'leapslam') swAng = -2.4;
        if (id === 'wave' || id === 'swords' || id === 'undertow') swAng = -1.57;
        if (id === 'whirl' && mv.ph === 'a') swAng = this.animT * 20;
        if (id === 'crown') swAng = 0.9;
      }
      if (this.staggered > 0) { lean = -3; swAng = 1.4; }
      // cape
      const capeSw = Math.sin(this.animT * 3) * 2 - G.clamp(this.vx / 60, -4, 4);
      R(-10 - capeSw, -32, 8, 30, '#1a2a4a');
      R(-12 - capeSw * 1.4, -8, 6, 8, '#1a2a4a');
      // legs
      R(-5 + walk * 3, -14, 4, 14, '#2a3040');
      R(1 - walk * 3, -14, 4, 14, '#3a4050');
      // body
      R(-7 + lean, -30, 14, 17, '#3a4a6a');
      R(-7 + lean, -30, 14, 3, '#6a7a9a');
      R(-7 + lean, -17, 14, 2, '#c0a050');
      R(-2 + lean, -28, 4, 10, '#c0a050');
      // head
      R(-5 + lean, -38, 10, 9, '#8aa0b0');
      R(-5 + lean, -38, 10, 2, '#a0b8c8');
      R(0 + lean, -34, 3, 1, '#0a1020');
      const eye = this.phase >= 3 ? '#ff4040' : '#a0e0ff';
      R(1 + lean, -34, 2, 1, eye);
      G.addLight(this.cx, this.y + 4, 40, eye, 0.6);
      R(-5 + lean, -30, 3, 6, '#6a8090');
      // crown (if not thrown)
      if (!(mv && mv.m.id === 'crown' && mv.ph !== 'w')) {
        R(-6 + lean, -41, 12, 3, '#d8b050');
        R(-6 + lean, -44, 2, 3, '#d8b050');
        R(-1 + lean, -45, 2, 4, '#d8b050');
        R(4 + lean, -44, 2, 3, '#d8b050');
        R(-1 + lean, -43, 2, 1, '#ff4060');
      }
      // dripping brine
      if (Math.random() < 0.2) G.fx.spawn({ x: this.cx + (Math.random() - 0.5) * 10, y: this.y + 4, vy: 30, grav: 400, life: 0.5, color: '#6ad0e0', size: 1 });
      // greatsword
      ctx.save();
      ctx.translate(4 + lean, -27);
      ctx.rotate(swAng);
      R(0, -2, 5, 4, '#3a4a6a');
      R(4, -2, 4, 4, '#2a2020');
      R(8, -5, 2, 10, '#d8b050');
      R(10, -2, 28, 4, '#90b8d0');
      R(10, -2, 28, 1, '#e0f8ff');
      R(38, -1, 3, 2, '#90b8d0');
      ctx.restore();
      if (mv && mv.ph === 'a' && (mv.m.id === 'combo' || mv.m.id === 'whirl')) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#c0f0ff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(4, -27, 40, mv.m.id === 'whirl' ? 0 : -2.2, mv.m.id === 'whirl' ? Math.PI * 2 : 1.1);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (mv && mv.m.id === 'undertow' && mv.ph === 'a') {
        for (let i = 0; i < 4; i++) {
          const a = this.animT * 4 + (i / 4) * Math.PI * 2;
          const bx = Math.round(this.cx + Math.cos(a) * 52 - cx), by = Math.round(this.cy + Math.sin(a) * 30 - cy);
          ctx.fillStyle = '#80c0ff'; ctx.fillRect(bx - 1, by - 6, 3, 12);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(bx - 1, by - 6, 1, 10);
        }
      }
      if (this.staggered > 0) for (let i = 0; i < 3; i++) { const a = this.animT * 6 + (i / 3) * Math.PI * 2; ctx.fillStyle = '#ffe060'; ctx.fillRect(Math.round(x + Math.cos(a) * 9), Math.round(this.y - cy - 10 + Math.sin(a) * 2), 2, 2); }
      if (mv && mv.ph === 'w') G.text(ctx, '!', x, Math.round(this.y - cy) - 22, mv.m.w >= 0.6 ? '#ff4030' : '#ffb040', { align: 'center', outline: '#000', scale: 2 });
    }
  }

  class CrownProj extends G.Entity {
    constructor(owner, p, dmg) {
      super(owner.cx - 6, owner.y - 4, 12, 8);
      this.owner = owner;
      this.dmg = dmg;
      this.t = 0;
      this.layer = 5;
      this.bossHazard = true;
      this.alwaysDraw = true;
      const ang = Math.atan2(p.cy - this.cy, p.cx - this.cx);
      this.vx = Math.cos(ang) * 360;
      this.vy = Math.sin(ang) * 360;
      this.hitT = 0;
    }
    update(dt) {
      this.t += dt;
      this.hitT -= dt;
      const o = this.owner;
      if (this.t > 0.6) {
        const a = Math.atan2(o.cy - 20 - this.cy, o.cx - this.cx);
        const sp = Math.min(460, Math.hypot(this.vx, this.vy) + 800 * dt);
        this.vx = G.lerp(this.vx, Math.cos(a) * sp, 0.1);
        this.vy = G.lerp(this.vy, Math.sin(a) * sp, 0.1);
        if (Math.hypot(o.cx - this.cx, o.cy - 20 - this.cy) < 16 || this.t > 2.4) return G.world.kill(this);
      } else { this.vx *= Math.pow(0.3, dt); this.vy *= Math.pow(0.3, dt); }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const p = G.world.player;
      if (p && this.hitT <= 0 && G.overlap(this, p)) { this.hitT = 0.5; p.takeHit({ dmg: this.dmg, team: 'enemy', kind: 'ranged', x: this.cx, dir: Math.sign(this.vx) || 1, knock: 150, proj: null }); }
      G.fx.spawn({ x: this.cx, y: this.cy, life: 0.2, color: '#ffd060', size: 2, add: true });
      G.addLight(this.cx, this.cy, 50, '#ffd060', 0.8);
    }
    draw(ctx, cx, cy) {
      ctx.save();
      ctx.translate(Math.round(this.cx - cx), Math.round(this.cy - cy));
      ctx.rotate(this.t * 14);
      ctx.fillStyle = '#d8b050';
      ctx.fillRect(-6, -1, 12, 3);
      ctx.fillRect(-6, -4, 2, 3);
      ctx.fillRect(-1, -5, 2, 4);
      ctx.fillRect(4, -4, 2, 3);
      ctx.restore();
    }
  }

  // delayed callbacks in world time
  class Timer extends G.Entity {
    constructor(t, fn) { super(0, 0, 1, 1); this.t = t; this.fn = fn; this.bossHazard = true; }
    update(dt) { this.t -= dt; if (this.t <= 0) { G.world.kill(this); this.fn(); } }
    draw() {}
  }
  function setTimeoutWorld(t, fn) { G.world.add(new Timer(t, fn)); }
  G.setTimeoutWorld = setTimeoutWorld;

  G.makeBoss = (id, x, y) => {
    if (id === 'bellwarden') return new Bellwarden(x, y);
    if (id === 'motherbrine') return new MotherBrine(x, y);
    return new Oris(x, y);
  };
})();
