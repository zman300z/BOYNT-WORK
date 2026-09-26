'use strict';
// ============================================================================
// Player: "the Wick" — movement, combat, skills, health, drawing
// ============================================================================
(function () {
  const G = window.G;
  const TS = G.TS;
  const GRAV = 1400, MAXFALL = 480, RUN = 150, JUMP_V = 400, DJUMP_V = 370;
  const ROLL_V = 290, ROLL_T = 0.32;
  const NOINPUT = { down: {}, pressed: {}, released: {} };

  class Player extends G.Entity {
    constructor() {
      super(0, 0, 10, 22);
      this.layer = 3;
      this.team = 'player';
      this.alwaysDraw = true;
      this.baseHp = 100;
      this.maxHp = 100;
      this.hp = 100;
      this.rally = 0;
      this.rallyT = 0;
      this.state = 'normal';
      this.stateT = 0;
      this.airJumps = 0;
      this.coyote = 0;
      this.jumpBuf = 0;
      this.dropT = 0;
      this.invuln = 0;
      this.flashT = 0;
      this.rollCd = 0;
      this.lastRollEnd = -99;
      this.weapons = [null, null];
      this.skills = [null, null];
      this.cds = [0, 0];
      this.cdMax = [1, 1];
      this.ammo = [0, 0];
      this.reload = [0, 0];
      this.flaskMax = 1;
      this.flask = 1;
      this.healLeft = 0;
      this.gold = 0;
      this.embers = 0;
      this.stats = { fury: 0, cunning: 0, vigor: 0 };
      this.scrolls = 0;
      this.muts = [];
      this.curse = 0;
      this.st = {};
      this.atk = null;
      this.lastAtk = null;
      this.kindledT = 0;
      this.nextCritT = 0;
      this.deathsDoorUsed = false;
      this.ward = null;
      this.anim = { run: 0, t: 0, land: 0, bob: 0 };
      this.scarf = [];
      for (let i = 0; i < 7; i++) this.scarf.push({ x: 0, y: 0, px: 0, py: 0 });
      this.control = true;
      this.chakramOut = [false, false];
      this.wallDir = 0;
      this.wallLock = 0;
      this.kills = 0;
      this.stepT = 0;
    }
    // ------------------------------------------------------------ stats
    recalc() {
      const s = this.stats;
      const old = this.maxHp;
      this.maxHp = Math.round(this.baseHp + this.scrolls * 10 + s.vigor * 12);
      if (this.maxHp > old) this.hp += this.maxHp - old;
      this.hp = Math.min(this.hp, this.maxHp);
      this.flaskMax = 1 + (G.hasUpgrade('flask1') ? 1 : 0) + (G.hasUpgrade('flask2') ? 1 : 0) + (G.hasUpgrade('flask3') ? 1 : 0) + (this.hasMut('alchemy') ? 1 : 0);
      this.flask = Math.min(this.flask, this.flaskMax);
    }
    statMult(stats) {
      let lv = 0;
      for (const k of stats) lv = Math.max(lv, this.stats[k] || 0);
      return 1 + 0.15 * lv;
    }
    hasMut(id) {
      return this.muts.includes(id);
    }
    dominantStat() {
      const s = this.stats;
      if (s.fury === 0 && s.cunning === 0 && s.vigor === 0) return null;
      if (s.fury >= s.cunning && s.fury >= s.vigor) return 'fury';
      if (s.cunning >= s.vigor) return 'cunning';
      return 'vigor';
    }
    atkSpeed(def) {
      let s = 1;
      if (this.hasMut('frenzy')) s += 0.18;
      const inst = this.atk && this.atk.inst;
      if (inst) s += (G.itemMods(inst).aspd || 0) / 100;
      if (def && def.kind === 'ranged' && this.hasMut('quiver')) s += 0.2;
      if (G.hasSt(this, 'slow')) s *= 0.7;
      return s;
    }
    runSpeed() {
      let s = RUN * (this.hasMut('quickwick') ? 1.15 : 1);
      if (G.hasSt(this, 'slow')) s *= 0.6;
      return s;
    }
    addGold(v) {
      this.gold += v;
      G.Audio.play('gold', { vol: 0.6 });
      G.game.goldFlash = 0.4;
    }
    addEmbers(v) {
      if (this.hasMut('embersoul')) v += 1;
      G.game.hint('embers', '[ember]Embers[] are lost when you fall. Spend them with the Keeper in the passage between biomes.');
      this.embers += v;
      G.Audio.play('ember', { vol: 0.7 });
      G.game.emberFlash = 0.4;
      G.game.stats.embers += v;
    }
    heal(v, silent) {
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + v);
      this.rally = Math.max(0, this.rally - (this.hp - before));
      if (!silent && this.hp - before >= 1) G.fx.text(this.cx, this.y - 6, '+' + Math.round(this.hp - before), '#70e070', 1, 0.7);
    }

    // ------------------------------------------------------------ damage out
    checkCrit(cond, e, ctx) {
      if (!cond) return false;
      switch (cond) {
        case 'lastHit': return !!(ctx && ctx.last);
        case 'behind': return e.facing !== undefined && Math.sign(this.cx - e.cx) === -e.facing;
        case 'burning': return G.hasSt(e, 'burn');
        case 'bleeding': return G.hasSt(e, 'bleed');
        case 'poisoned': return G.hasSt(e, 'poison');
        case 'frozen': return G.hasSt(e, 'freeze');
        case 'stunned': return G.hasSt(e, 'stun') || (e.isBoss && e.staggered > 0);
        case 'disabled': return G.isDisabled(e) || (e.isBoss && e.staggered > 0);
        case 'afterRoll': return G.world.time - this.lastRollEnd < 1.0 || this.state === 'roll';
        case 'lowHp': return e.hp < e.maxHp * 0.4;
        case 'charged': return !!(ctx && ctx.charged);
        case 'close': return Math.hypot(e.cx - this.cx, e.cy - this.cy) < 70;
        case 'tip': return ctx && ctx.box && Math.abs(e.cx - this.cx) > ctx.reach * 0.6;
        default: return false;
      }
    }
    finalDamage(base, e, inst, crit) {
      let d = base;
      const m = inst ? G.itemMods(inst) : {};
      const def = inst ? G.ITEMS[inst.id] : null;
      if (m.vsBleed && G.hasSt(e, 'bleed')) d *= 1 + m.vsBleed / 100;
      if (m.vsBurn && G.hasSt(e, 'burn')) d *= 1 + m.vsBurn / 100;
      if (m.vsPoison && G.hasSt(e, 'poison')) d *= 1 + m.vsPoison / 100;
      if (m.vsDisabled && G.isDisabled(e)) d *= 1 + m.vsDisabled / 100;
      if (m.fullHp && this.hp >= this.maxHp - 0.5) d *= 1 + m.fullHp / 100;
      if (m.elite && (e.elite || e.isBoss)) d *= 1 + m.elite / 100;
      if (m.air && !this.onGround) d *= 1 + m.air / 100;
      if (this.kindledT > 0) d *= 1.35;
      if (this.hasMut('laststand') && this.hp < this.maxHp * 0.4) d *= 1.45;
      if (this.hasMut('hunter') && (e.elite || e.isBoss)) d *= 1.3;
      if (def && def.kind === 'ranged' && this.hasMut('quiver')) d *= 1.3;
      if (!crit) {
        let cc = (m.crit || 0) / 100 + (this.hasMut('tidesense') ? 0.1 : 0);
        if (cc > 0 && G.rng.next() < cc) crit = true;
      }
      if (this.nextCritT > 0) { crit = true; this.nextCritT = 0; }
      if (crit) d *= (def && def.critMult) || 2;
      return { dmg: d, crit };
    }
    itemStatuses(inst, extra) {
      const def = G.ITEMS[inst.id];
      const m = G.itemMods(inst);
      const st = Object.assign({}, def.onHit || {}, extra || {});
      if (m.bleed) st.bleed = (st.bleed || 0) + 1;
      if (m.burn) st.burn = (st.burn || 0) + 1;
      if (m.poison) st.poison = (st.poison || 0) + 1;
      if (m.chill) st.freezeChance = Math.max(st.freezeChance || 0, m.chill / 100);
      if (m.skillStun) st.stun = Math.max(st.stun || 0, 0.8);
      return st;
    }
    power(inst) {
      const def = G.ITEMS[inst.id];
      return G.itemPower(inst) * this.statMult(def.stats);
    }
    dotPower(inst) {
      const def = G.ITEMS[inst.id];
      return G.itemScale(inst.tier) * this.statMult(def.stats);
    }
    onDealtDamage(amount) {
      if (this.rally > 0) {
        const mult = this.hasMut('secondwind') ? 2 : 1;
        const r = Math.min(this.rally, Math.max(1, amount * 0.3 * mult));
        this.rally -= r;
        this.hp = Math.min(this.maxHp, this.hp + r);
      }
    }
    onKill(e) {
      this.kills++;
      G.game.stats.kills++;
      if (this.hasMut('kindled')) this.kindledT = 4;
      if (this.hasMut('leech')) this.heal(this.maxHp * 0.03, true);
      const inst = e.lastItem;
      if (inst) {
        const m = G.itemMods(inst);
        if (m.killHeal) this.heal(this.maxHp * m.killHeal / 100, true);
        if (m.killBoom) G.explode(e.cx, e.cy, 36, this.power(inst) * 0.8, 'player', { shake: 0.15 });
      }
      if (this.curse > 0) {
        this.curse--;
        if (this.curse === 0) {
          G.game.notify('[purple]The curse is lifted![]');
          G.Audio.play('solved');
          G.fx.burst(this.cx, this.cy, 30, { color: ['#c080ff', '#ffffff'], speed: 160, life: 0.8, size: 2, add: true });
        }
      }
    }

    // ------------------------------------------------------------ update
    input() {
      return this.control && G.game.canControl() ? G.Input : NOINPUT;
    }
    update(dt) {
      const I = this.input();
      const W = G.world;
      this.stateT += dt;
      if (this.invuln > 0) this.invuln -= dt;
      if (this.flashT > 0) this.flashT -= dt;
      if (this.rollCd > 0) this.rollCd -= dt;
      if (this.kindledT > 0) this.kindledT -= dt;
      if (this.nextCritT > 0) this.nextCritT -= dt;
      if (this.dropT > 0) this.dropT -= dt;
      if (this.wallLock > 0) this.wallLock -= dt;
      for (let i = 0; i < 2; i++) {
        if (this.cds[i] > 0) this.cds[i] -= dt;
        if (this.reload[i] > 0) { this.reload[i] -= dt; if (this.reload[i] <= 0) this.ammo[i] = 0; }
      }
      if (this.ward) { this.ward.t -= dt; if (this.ward.t <= 0) this.ward = null; }
      // rally decay
      if (this.rally > 0) {
        this.rallyT -= dt;
        if (this.rallyT <= 0) this.rally = Math.max(0, this.rally - this.maxHp * (this.hasMut('secondwind') ? 0.04 : 0.08) * dt);
      }
      // flask healing over time
      if (this.healLeft > 0) {
        const h = Math.min(this.healLeft, this.maxHp * 0.9 * dt);
        this.healLeft -= h;
        this.hp = Math.min(this.maxHp, this.hp + h);
        this.rally = Math.max(0, this.rally - h);
        if (Math.random() < 0.4) G.fx.spawn({ x: this.x + Math.random() * this.w, y: this.y + this.h, vy: -40, life: 0.6, color: '#70f070', size: 2, size2: 0, add: true });
      }
      G.tickStatuses(this, dt);
      if (this.dead) return;
      // hazards
      if (W.level.rectHazard(this.x + 2, this.y, this.w - 4, this.h) && this.invuln <= 0 && this.state !== 'dead') {
        const tier = Math.max(1, W.level.tier || 1);
        this.takeHit({ dmg: 12 * G.TIER_DMG[tier], kind: 'hazard', team: 'enemy', x: this.cx, dir: -this.facing, knock: 60, knockUp: 330 });
      }
      const frozen = G.hasSt(this, 'freeze') || G.hasSt(this, 'stun');
      if (frozen && this.state !== 'dead') {
        this.vx = G.approach(this.vx, 0, 1200 * dt);
        this.gravity(dt);
        this.physics(dt, false);
        this.atk = null;
        if (this.state !== 'hurt') this.state = 'normal';
        return;
      }
      switch (this.state) {
        case 'normal': this.stNormal(dt, I); break;
        case 'attack': this.stNormal(dt, I, true); this.updateAttack(dt, I); break;
        case 'roll': this.stRoll(dt, I); break;
        case 'climb': this.stClimb(dt, I); break;
        case 'cling': this.stCling(dt, I); break;
        case 'hurt':
          this.gravity(dt);
          this.vx = G.approach(this.vx, 0, 500 * dt);
          this.physics(dt, false);
          if (this.stateT > 0.22) this.state = 'normal';
          break;
        case 'heal':
          this.stNormal(dt, I, true, 0.35);
          if (this.stateT > 0.5) this.state = 'normal';
          break;
        case 'stomp': this.stStomp(dt); break;
        case 'cast':
          this.stNormal(dt, I, true, 0.3);
          if (this.stateT > 0.16) this.state = 'normal';
          break;
        case 'dead':
          this.gravity(dt);
          this.vx *= 0.9;
          this.physics(dt, false);
          break;
        case 'cutscene':
          this.gravity(dt);
          this.vx = G.approach(this.vx, this.autoWalk || 0, 1200 * dt);
          if (this.autoWalk) this.facing = Math.sign(this.autoWalk);
          this.physics(dt, false);
          break;
      }
      this.updateAnim(dt);
    }
    gravity(dt, mult) {
      this.vy = Math.min(MAXFALL, this.vy + GRAV * (mult || 1) * dt);
    }
    physics(dt, allowMantle) {
      const wasGround = this.onGround;
      const hitX = this.moveX(this.vx * dt);
      if (hitX && allowMantle && !this.onGround && this.vy > -120) this.tryMantle();
      const r = this.moveY(this.vy * dt, this.dropT > 0 || this.state === 'climb');
      if (r === 'floor') {
        if (this.vy > 300) {
          G.Audio.play('land', { vol: Math.min(1, this.vy / 480) });
          G.fx.burst(this.cx, this.bottom, 5, { color: '#a09a90', speed: 50, life: 0.3, size: 1, angle: -Math.PI / 2, spread: 2.5 });
          this.anim.land = 0.12;
        }
        this.vy = 0;
      } else if (r === 'ceil') {
        // corner correction
        if (this.vy < -100) {
          const L = G.world.level;
          for (const off of [4, -4, 7, -7]) {
            if (!L.rectSolid(this.x + off, this.y - 3, this.w, this.h)) { this.x += off; this.y -= 3; return; }
          }
        }
        this.vy = Math.max(0, this.vy);
      }
      this.onGround = this.vy >= 0 && this.groundCheck();
      if (this.onGround) { this.airJumps = 0; this.coyote = 0.1; }
      else if (wasGround) { /* coyote runs */ }
    }
    tryMantle() {
      const L = G.world.level;
      const f = this.facing;
      const fx = f > 0 ? this.x + this.w + 2 : this.x - 2;
      const tx = Math.floor(fx / TS);
      const feet = this.y + this.h;
      const ty = Math.floor((feet - 2) / TS);
      for (const t of [ty, ty - 1]) {
        const top = t * TS;
        if (L.isSolid(tx, t) && !L.isSolid(tx, t - 1) && !L.isSolid(tx, t - 2) && feet - top < 14 && feet - top > -2) {
          const nx = f > 0 ? tx * TS + 1 : tx * TS + TS - this.w - 1;
          if (!L.rectSolid(nx, top - this.h - 0.5, this.w, this.h)) {
            this.x = nx;
            this.y = top - this.h - 0.01;
            this.vy = 0;
            this.onGround = true;
            this.anim.land = 0.1;
            return true;
          }
        }
      }
      return false;
    }
    onLadderTile() {
      const L = G.world.level;
      const tx = Math.floor(this.cx / TS);
      const ty0 = Math.floor((this.y + 4) / TS), ty1 = Math.floor((this.y + this.h - 1) / TS);
      for (let ty = ty0; ty <= ty1; ty++) if (L.isLadder(tx, ty)) return tx;
      return -1;
    }
    stNormal(dt, I, attacking, slowMult) {
      const L = G.world.level;
      const dir = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
      let speed = this.runSpeed();
      let mult = slowMult !== undefined ? slowMult : 1;
      if (attacking && this.atk) {
        const a = this.atk;
        if (a.kind === 'melee') mult = this.onGround ? (a.phase === 'a' ? 0.1 : 0.25) : 0.7;
        else if (a.kind === 'ranged') mult = this.onGround ? 0.35 : 0.75;
        else if (a.kind === 'shield') mult = (a.def.slow || 0.45);
      }
      if (this.wallLock > 0 && dir === this.wallDir) mult = 0;
      const target = dir * speed * mult;
      const acc = this.onGround ? (dir ? 1500 : 2400) : 1000;
      this.vx = G.approach(this.vx, target, acc * dt);
      if (dir && (!attacking || !this.atk || this.atk.canTurn)) this.facing = dir;
      if (this.coyote > 0) this.coyote -= dt;
      if (I.pressed.jump) this.jumpBuf = 0.12;
      else if (this.jumpBuf > 0) this.jumpBuf -= dt;
      // ladders
      if (!attacking && (I.down.up || I.down.down)) {
        const tx = this.onLadderTile();
        const below = this.onGround && I.down.down && L.isLadder(Math.floor(this.cx / TS), Math.floor((this.bottom + 2) / TS));
        if ((tx >= 0 && (I.down.up || !this.onGround)) || below) {
          const lx = (below ? Math.floor(this.cx / TS) : tx) * TS + TS / 2;
          if (Math.abs(lx - this.cx) < 9) {
            this.x = lx - this.w / 2;
            this.state = 'climb';
            this.stateT = 0;
            this.vx = 0;
            if (below) this.y += 3;
            return;
          }
        }
      }
      // drop through
      if (this.jumpBuf > 0 && I.down.down && this.onGround) {
        const tyB = Math.floor((this.bottom + 1) / TS);
        const x0 = Math.floor((this.x + 1) / TS), x1 = Math.floor((this.x + this.w - 1) / TS);
        let oneWay = true;
        for (let tx = x0; tx <= x1; tx++) if (L.isSolid(tx, tyB)) oneWay = false;
        if (oneWay) { this.dropT = 0.2; this.jumpBuf = 0; this.onGround = false; this.y += 1; }
      }
      // jumps
      const canAct = !attacking || !this.atk || this.atk.phase === 'r' || this.atk.kind === 'shield' || this.atk.phase === 'pre';
      if (this.jumpBuf > 0 && canAct) {
        if (this.onGround || this.coyote > 0) {
          this.cancelAtk();
          this.vy = -JUMP_V;
          this.jumpBuf = 0;
          this.coyote = 0;
          this.onGround = false;
          G.Audio.play('jump', { vol: 0.8 });
          G.fx.burst(this.cx, this.bottom, 4, { color: '#a09a90', speed: 40, life: 0.25, size: 1, angle: Math.PI / 2, spread: 2 });
        } else if (I.down.down && this.state !== 'stomp') {
          this.jumpBuf = 0;
          this.cancelAtk();
          this.state = 'stomp';
          this.stateT = 0;
          this.vy = -120;
          this.vx = 0;
          return;
        } else if (this.airJumps < 1) {
          this.cancelAtk();
          this.airJumps++;
          this.vy = -DJUMP_V;
          this.jumpBuf = 0;
          G.Audio.play('djump', { vol: 0.8 });
          G.fx.ring(this.cx, this.bottom, 10, '#ffb060', 0.25, 2);
          G.fx.burst(this.cx, this.bottom, 8, { color: ['#ffb060', '#ff7030'], speed: 70, life: 0.3, size: 1, angle: Math.PI / 2, spread: 2, add: true });
        }
      }
      if (I.released.jump && this.vy < -150) this.vy *= 0.5;
      this.gravity(dt);
      this.physics(dt, true);
      // wall cling (spider rune)
      if (G.save.runes.spider && !this.onGround && this.vy > 20 && dir !== 0 && !attacking && this.wallLock <= 0) {
        if (this.wallAhead(dir * 1.5)) {
          this.state = 'cling';
          this.stateT = 0;
          this.wallDir = dir;
          this.airJumps = 0;
          return;
        }
      }
      if (this.state === 'climb') return;
      // actions
      if (I.pressed.roll && this.rollCd <= 0 && (canAct || (this.atk && this.atk.phase === 'w'))) return this.startRoll(dir);
      if (this.state === 'normal' || (this.state === 'attack' && this.atk && this.atk.phase === 'r')) {
        if (I.pressed.attack1 && this.state === 'normal') this.startAttack(0);
        else if (I.pressed.attack2 && this.state === 'normal') this.startAttack(1);
      }
      if (this.state === 'normal') {
        if (I.pressed.skill1) this.useSkill(0);
        else if (I.pressed.skill2) this.useSkill(1);
        else if (I.pressed.heal) this.drinkFlask();
      }
      // footsteps
      if (this.onGround && Math.abs(this.vx) > 60) {
        this.stepT -= dt;
        if (this.stepT <= 0) { this.stepT = 0.28; G.Audio.play('step', { vol: 0.5 }); }
      }
    }
    stRoll(dt, I) {
      const sp = ROLL_V * (this.hasMut('quickwick') ? 1.15 : 1);
      this.vx = this.facing * sp * (this.stateT > ROLL_T * 0.75 ? 0.6 : 1);
      this.gravity(dt);
      this.physics(dt, true);
      this.rollIframe = this.stateT > 0.01 && this.stateT < ROLL_T - 0.03;
      if (this.hasMut('scorched') && Math.random() < 0.3 && this.onGround) {
        if (!this._lastFire || G.world.time - this._lastFire > 0.12) {
          this._lastFire = G.world.time;
          G.world.add(new G.Puddle(this.cx, this.bottom, 'fire', this.weapons[0] ? this.dotPower(this.weapons[0]) * 6 : 6));
        }
      }
      if (Math.random() < 0.6) G.fx.spawn({ x: this.cx - this.facing * 4, y: this.cy, vx: -this.facing * 30, life: 0.25, color: '#ffa050', size: 2, size2: 0, add: true });
      if (I.pressed.jump && this.onGround && this.stateT > 0.08) {
        this.state = 'normal';
        this.jumpBuf = 0.12;
        this.lastRollEnd = G.world.time;
        return;
      }
      if (this.stateT >= ROLL_T) {
        this.state = 'normal';
        this.rollIframe = false;
        this.lastRollEnd = G.world.time;
        this.vx *= 0.5;
      }
    }
    startRoll(dir) {
      this.cancelAtk();
      if (dir) this.facing = dir;
      this.state = 'roll';
      this.stateT = 0;
      this.rollCd = ROLL_T + (this.hasMut('quickwick') ? 0.08 : 0.2);
      G.Audio.play('roll', { vol: 0.7 });
      G.fx.burst(this.cx, this.bottom, 5, { color: '#a09a90', speed: 50, life: 0.3, size: 1, angle: this.facing > 0 ? Math.PI : 0, spread: 1 });
    }
    stClimb(dt, I) {
      const L = G.world.level;
      const dirY = (I.down.down ? 1 : 0) - (I.down.up ? 1 : 0);
      this.vy = dirY * 130;
      this.vx = 0;
      const beforeY = this.y;
      this.moveY(this.vy * dt, true);
      if (dirY && Math.floor(this.y / 6) !== Math.floor(beforeY / 6)) G.Audio.play('ladder', { vol: 0.5 });
      const tx = Math.floor(this.cx / TS);
      const onL = this.onLadderTile() >= 0;
      // reached top: stand on the ladder top
      if (dirY < 0) {
        const feetT = Math.floor((this.bottom - 1) / TS);
        if (!L.isLadder(tx, feetT) && L.isOneWay(tx, feetT + 1)) { this.y = (feetT + 1) * TS - this.h - 0.01; this.state = 'normal'; this.vy = 0; this.onGround = true; return; }
      }
      if (!onL) { this.state = 'normal'; return; }
      if (dirY > 0 && this.groundCheck() && !L.isLadder(tx, Math.floor((this.bottom + 2) / TS))) { this.state = 'normal'; return; }
      if (I.pressed.jump) {
        const dir = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
        this.state = 'normal';
        this.vy = dir ? -300 : -150;
        this.vx = dir * 120;
        this.dropT = 0.15;
        if (dir) this.facing = dir;
        return;
      }
      if (I.pressed.roll && (I.down.left || I.down.right)) { this.state = 'normal'; this.startRoll((I.down.right ? 1 : 0) - (I.down.left ? 1 : 0)); }
      if (I.pressed.attack1 || I.pressed.attack2) { this.state = 'normal'; this.startAttack(I.pressed.attack1 ? 0 : 1); }
    }
    stCling(dt, I) {
      const dir = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
      this.vy = Math.min(this.vy + 800 * dt, 50);
      this.vx = this.wallDir * 30;
      this.facing = -this.wallDir;
      this.physics(dt, false);
      if (Math.random() < 0.2) G.fx.spawn({ x: this.wallDir > 0 ? this.x + this.w : this.x, y: this.y + 4, vy: 30, life: 0.3, color: '#a09a90', size: 1 });
      if (I.pressed.jump) {
        this.state = 'normal';
        this.vy = -390;
        this.vx = -this.wallDir * 210;
        this.facing = -this.wallDir;
        this.wallLock = 0.16;
        this.airJumps = 0;
        this.jumpBuf = 0;
        G.Audio.play('jump');
        return;
      }
      if (this.onGround || dir !== this.wallDir || !this.wallAhead(this.wallDir * 1.5)) this.state = 'normal';
    }
    stStomp(dt) {
      this.invuln = Math.max(this.invuln, 0.05);
      if (this.stateT < 0.12) { this.vy = G.approach(this.vy, 0, 2000 * dt); this.moveY(this.vy * dt); return; }
      this.vy = 640;
      const r = this.moveY(this.vy * dt, this.dropT > 0);
      G.fx.spawn({ x: this.cx, y: this.y, life: 0.2, color: '#ffb060', size: 3, size2: 0, add: true });
      if (r === 'floor' || this.groundCheck()) {
        this.vy = 0;
        this.onGround = true;
        this.state = 'normal';
        this.invuln = 0.25;
        const L = G.world.level;
        // Ram rune: shatter rune-marked floor
        if (G.save.runes.ram) {
          const tyB = Math.floor((this.bottom + 2) / TS);
          let broke = false;
          for (let tx = Math.floor((this.x - 8) / TS); tx <= Math.floor((this.x + this.w + 8) / TS); tx++)
            for (let ty = tyB; ty <= tyB + 1; ty++)
              if (L.get(tx, ty) === G.T.RAM) { L.breakAt(tx, ty); broke = true; }
          if (broke) { G.Audio.play('crumble'); G.shake(0.5); this.onGround = false; }
        } else {
          const tyB = Math.floor((this.bottom + 2) / TS);
          if (L.get(Math.floor(this.cx / TS), tyB) === G.T.RAM && !G.game.ramHintShown) {
            G.game.ramHintShown = true;
            G.game.notify('The cracked floor holds firm. You need the [orange]Rune of Ruin[].');
          }
        }
        const tier = G.world.level.tier || 1;
        const best = Math.max(this.stats.fury, this.stats.cunning, this.stats.vigor);
        const dmg = 16 * G.itemScale(Math.max(1, tier)) * (1 + 0.15 * best);
        for (const e of G.world.enemiesIn(this.cx - 30, this.bottom - 24, 60, 30)) e.takeHit({ dmg, kind: 'melee', team: 'player', x: this.cx, y: this.cy, dir: e.cx > this.cx ? 1 : -1, knock: 200, knockUp: 200, statuses: { stun: 1 }, poise: 50 });
        G.Audio.play('stomp');
        G.shake(0.35);
        G.fx.burst(this.cx, this.bottom, 14, { color: ['#c0b8a8', '#ffb060'], speed: 160, life: 0.4, size: 2, angle: -Math.PI / 2, spread: 2.8, grav: 400 });
        G.fx.ring(this.cx, this.bottom, 30, '#ffb060', 0.25, 3);
      }
    }

    // ------------------------------------------------------------ attacks
    cancelAtk() {
      if (this.atk && this.atk.kind === 'melee') this.lastAtk = { slot: this.atk.slot, step: this.atk.step, end: G.world.time };
      this.atk = null;
      if (this.state === 'attack') this.state = 'normal';
    }
    startAttack(slot) {
      const inst = this.weapons[slot];
      if (!inst) return;
      const def = G.ITEMS[inst.id];
      const I = this.input();
      const dir = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
      if (dir) this.facing = dir;
      if (def.kind === 'melee') {
        let step = 0;
        const la = this.lastAtk;
        if (la && la.slot === slot && G.world.time - la.end < 0.5 && la.step < def.combo.length - 1) step = la.step + 1;
        this.atk = { slot, inst, def, kind: 'melee', step, phase: def.chargeable && step === 0 ? 'pre' : 'w', t: 0, hit: new Set(), queued: false, charge: 0, canTurn: true };
      } else if (def.kind === 'ranged') {
        if (this.reload[slot] > 0) { G.Audio.play('uiDeny', { vol: 0.4 }); return; }
        if (def.shot.type === 'chakram' && this.chakramOut[slot]) return;
        this.atk = { slot, inst, def, kind: 'ranged', phase: 'w', t: 0, shots: 0, canTurn: true };
        if (def.charge) G.Audio.play('bowDraw');
      } else if (def.kind === 'shield') {
        this.atk = { slot, inst, def, kind: 'shield', phase: 'up', t: 0, canTurn: true };
        G.Audio.play('shield');
      }
      this.state = 'attack';
      this.stateT = 0;
    }
    held(slot) {
      const I = this.input();
      return slot === 0 ? I.down.attack1 : I.down.attack2;
    }
    pressedSlot(slot) {
      const I = this.input();
      return slot === 0 ? I.pressed.attack1 : I.pressed.attack2;
    }
    updateAttack(dt) {
      const a = this.atk;
      if (!a || this.state !== 'attack') return;
      if (a.kind === 'melee') this.updateMelee(dt, a);
      else if (a.kind === 'ranged') this.updateRanged(dt, a);
      else this.updateShield(dt, a);
    }
    meleeStep(a) {
      return a.chargedStep ? a.def.charged : a.def.combo[a.step];
    }
    updateMelee(dt, a) {
      const spd = this.atkSpeed(a.def);
      a.t += dt * (a.phase === 'pre' || a.phase === 'charge' ? 1 : spd);
      const step = this.meleeStep(a);
      if (this.pressedSlot(a.slot) && (a.phase === 'a' || a.phase === 'r' || (a.phase === 'w' && a.t > step.w * 0.5))) a.queued = true;
      const other = 1 - a.slot;
      switch (a.phase) {
        case 'pre':
          if (!this.held(a.slot)) { a.phase = 'w'; a.t = 0; }
          else if (a.t >= 0.14) { a.phase = 'charge'; a.t = 0; }
          break;
        case 'charge':
          a.charge += dt;
          a.canTurn = true;
          if (a.charge >= a.def.chargeable && !a.chargedFx) { a.chargedFx = true; G.Audio.play('charge'); G.fx.ring(this.cx, this.cy, 16, '#a0c8ff', 0.3, 2); }
          if (Math.random() < 0.5) G.fx.spawn({ x: this.cx + (Math.random() - 0.5) * 24, y: this.cy + (Math.random() - 0.5) * 24, vx: 0, vy: 0, life: 0.3, color: a.charge >= a.def.chargeable ? '#ffffff' : '#80a0ff', size: 1, add: true });
          if (!this.held(a.slot)) {
            if (a.charge >= a.def.chargeable) a.chargedStep = true;
            a.phase = 'w';
            a.t = 0;
          }
          break;
        case 'w':
          a.canTurn = a.t < step.w * 0.5;
          if (a.t >= step.w) {
            a.phase = 'a';
            a.t = 0;
            a.canTurn = false;
            a.hit.clear();
            a.tick = 0;
            G.Audio.play(step.sfx || 'swing', { vol: 0.9 });
            if (step.shake) G.shake(step.shake * 0.4);
            if (step.iframes) this.invuln = Math.max(this.invuln, step.a + 0.05);
            this.spawnStepExtras(a, step);
          }
          break;
        case 'a': {
          if (step.lunge) this.vx = this.facing * step.lunge * (this.onGround ? 1 : 0.6);
          const n = step.multi || 1;
          const interval = step.a / n;
          if (a.t >= (a.tick + 1) * interval && a.tick < n - 1) { a.tick++; a.hit.clear(); }
          this.doMeleeHits(a, step);
          if (a.t >= step.a) { a.phase = 'r'; a.t = 0; }
          break;
        }
        case 'r':
          if (a.queued && a.t >= step.r * 0.35 && !a.chargedStep && a.step < a.def.combo.length - 1) {
            a.step++;
            a.phase = 'w';
            a.t = 0;
            a.queued = false;
            a.canTurn = true;
            const I = this.input();
            const dir = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
            if (dir) this.facing = dir;
          } else if (a.t >= step.r * 0.35 && this.pressedSlot(other) && this.weapons[other]) {
            this.lastAtk = null;
            this.startAttack(other);
          } else if (a.t >= step.r) {
            this.lastAtk = { slot: a.slot, step: a.chargedStep ? a.def.combo.length - 1 : a.step, end: G.world.time };
            this.atk = null;
            this.state = 'normal';
            if (a.queued && a.step >= a.def.combo.length - 1) {
              this.lastAtk = null;
              this.startAttack(a.slot);
            }
          }
          break;
      }
    }
    stepBox(step) {
      const [bx, by, bw, bh] = step.box;
      const x = this.facing > 0 ? this.cx + bx : this.cx - bx - bw;
      return { x, y: this.cy + by, w: bw, h: bh };
    }
    spawnStepExtras(a, step) {
      const pw = this.power(a.inst);
      if (step.shock) {
        const dirs = step.shock.n === 2 ? [1, -1] : [this.facing];
        for (const d of dirs)
          G.world.add(new G.Proj({ x: this.cx + d * 20, y: this.bottom - 7, w: 12, h: 14, vx: d * 260, vy: 0, type: 'shock', team: 'player', dmg: pw * step.dmg * step.shock.dmg, life: 0.9, pierce: 99, item: a.inst, statuses: { stun: 0.5 }, knock: 120, color: '#c0b090' }));
        G.Audio.play('shockwave');
      }
      if (step.proj) {
        if (step.proj.type === 'wave')
          G.world.add(new G.Proj({ x: this.cx + this.facing * 16, y: this.bottom - 9, w: 16, h: 18, vx: this.facing * 300, type: 'wave', team: 'player', dmg: pw * step.proj.dmg, life: 1.2, pierce: 99, item: a.inst, knock: 180, statuses: { slow: 1.5 } }));
        else
          G.world.add(new G.Proj({ x: this.cx + this.facing * 14, y: this.cy - 4, w: 14, h: 22, vx: this.facing * 380, type: 'crescent', team: 'player', dmg: pw * step.proj.dmg, life: 0.8, pierce: 99, item: a.inst, statuses: this.itemStatuses(a.inst) }));
      }
      if (step.ring) {
        const r = step.ring;
        G.fx.ring(this.cx + this.facing * 20, this.bottom - 4, r, '#ffd080', 0.35, 4);
        G.Audio.play('toll', { vol: 0.35 });
        for (const e of G.world.enemiesIn(this.cx + this.facing * 20 - r, this.bottom - r, r * 2, r * 2)) {
          const fd = this.finalDamage(pw * step.dmg * 0.6, e, a.inst, this.checkCrit(a.def.critIf, e, {}));
          e.takeHit({ dmg: fd.dmg, crit: fd.crit, kind: 'melee', team: 'player', x: this.cx, y: this.cy, dir: e.cx > this.cx ? 1 : -1, knock: 150, statuses: { stun: step.stun || 0.8 }, item: a.inst, poise: 40 });
        }
      }
    }
    doMeleeHits(a, step) {
      const box = this.stepBox(step);
      const pw = this.power(a.inst);
      const last = a.chargedStep || a.step === a.def.combo.length - 1;
      let hitAny = false;
      for (const e of G.world.enemiesIn(box.x, box.y, box.w, box.h)) {
        if (a.hit.has(e)) continue;
        a.hit.add(e);
        const crit = !!step.crit || this.checkCrit(a.def.critIf, e, { last, charged: a.chargedStep, box, reach: step.box[0] + step.box[2] });
        const fd = this.finalDamage(pw * step.dmg, e, a.inst, crit);
        const extra = {};
        if (step.freeze) extra.freeze = step.freeze;
        if (step.stun) extra.stun = step.stun;
        e.takeHit({ dmg: fd.dmg, crit: fd.crit, kind: 'melee', team: 'player', x: this.cx, y: this.cy, dir: this.facing, knock: step.knock || 90, statuses: this.itemStatuses(a.inst, extra), power: this.dotPower(a.inst), item: a.inst, poise: step.poise || 14 * step.dmg });
        hitAny = true;
      }
      for (const o of G.world.hittablesIn(box.x, box.y, box.w, box.h)) {
        if (a.hit.has(o)) continue;
        a.hit.add(o);
        o.onHit({ dmg: pw * step.dmg, kind: 'melee', dir: this.facing });
      }
      // breakable walls
      const L = G.world.level;
      const x0 = Math.floor(box.x / TS), x1 = Math.floor((box.x + box.w) / TS), y0 = Math.floor(box.y / TS), y1 = Math.floor((box.y + box.h) / TS);
      for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++)
          if (L.get(tx, ty) === G.T.BREAK && !a.hit.has('t' + tx + ',' + ty)) {
            a.hit.add('t' + tx + ',' + ty);
            // break the whole vertical stack of cracked blocks
            for (let yy = ty - 3; yy <= ty + 3; yy++) if (L.get(tx, yy) === G.T.BREAK) L.breakAt(tx, yy);
            G.Audio.play('break');
            G.shake(0.2);
            G.game.stats.secrets++;
          }
      if (hitAny) {
        G.hitStop(step.dmg >= 1.5 ? 4 : 2);
        G.shake(0.06 + (step.shake || 0) * 0.5);
      }
    }
    aimAt(maxRange) {
      let best = null, bs = 1e9;
      for (const e of G.world.enemies) {
        if (e.dead || e.dying || e.hidden) continue;
        const dx = e.cx - this.cx, dy = e.cy - (this.cy - 4);
        if (Math.sign(dx) !== this.facing && Math.abs(dx) > 8) continue;
        const d = Math.hypot(dx, dy);
        if (d > maxRange) continue;
        const ang = Math.abs(Math.atan2(dy, Math.abs(dx)));
        if (ang > 0.75) continue;
        if (!G.world.level.los(this.cx, this.cy - 4, e.cx, e.cy)) continue;
        const score = d + ang * 200;
        if (score < bs) { bs = score; best = e; }
      }
      if (!best) return 0;
      return Math.atan2(best.cy - (this.cy - 4), Math.abs(best.cx - this.cx));
    }
    updateRanged(dt, a) {
      const def = a.def;
      a.t += dt * this.atkSpeed(def);
      if (a.phase === 'w') {
        a.canTurn = true;
        if (def.charge) {
          a.aim = this.aimAt(500);
          if (!this.held(a.slot) || a.t >= def.draw * 2.5) this.fire(a, Math.min(1, a.t / def.draw));
          else if (a.t >= def.draw && !a.fullFx) { a.fullFx = true; G.fx.ring(this.cx + this.facing * 8, this.cy - 4, 8, '#ffe0a0', 0.2, 1); G.Audio.play('timer'); }
        } else if (a.t >= def.draw) this.fire(a, 1);
      } else if (a.phase === 'burst') {
        a.canTurn = false;
        if (a.t >= def.burstGap) { a.t = 0; this.fire(a, 1); }
      } else if (a.phase === 'r') {
        a.canTurn = false;
        if (this.pressedSlot(a.slot) && a.t >= def.rec * 0.5 && !def.charge) { this.atk = null; this.state = 'normal'; this.startAttack(a.slot); return; }
        if (a.t >= def.rec) { this.atk = null; this.state = 'normal'; }
      }
    }
    fire(a, charge) {
      const def = a.def;
      const sh = def.shot;
      const ang = def.charge ? (a.aim || 0) : this.aimAt(420);
      const pw = this.power(a.inst) * (charge < 1 ? 0.45 : 1);
      const sp = sh.speed * (charge < 1 ? 0.7 : 1);
      const x = this.cx + this.facing * 8, y = this.cy - 4;
      const o = {
        x, y, vx: Math.cos(ang) * sp * this.facing, vy: Math.sin(ang) * sp, type: sh.type, team: 'player', dmg: pw,
        pierce: sh.pierce || 0, item: a.inst, statuses: this.itemStatuses(a.inst), power: this.dotPower(a.inst), critIf: def.critIf, startX: x, startY: y, life: 1.6,
      };
      if (sh.type === 'fireball') Object.assign(o, { w: 8, h: 8, aoe: sh.aoe, life: 1.4 });
      if (sh.type === 'chakram') { Object.assign(o, { w: 8, h: 8, pierce: 99, life: 3, outTime: 0.45 }); this.chakramOut[a.slot] = true; const slot = a.slot; this.chakramBack = () => { this.chakramOut[slot] = false; }; }
      if (sh.type === 'harpoon') Object.assign(o, { w: 10, h: 4 });
      if (sh.type === 'knife') Object.assign(o, { vy: o.vy + (a.shots - 1) * 20 });
      if (charge >= 1 && def.charge) o.pierce = (sh.pierce || 0) + 1;
      G.world.add(new G.Proj(o));
      G.Audio.play(sh.type === 'fireball' || sh.type === 'frostbolt' ? 'magic' : sh.type === 'knife' || sh.type === 'chakram' ? 'throw' : 'arrow', { vol: 0.8 });
      this.vx -= this.facing * 30;
      a.shots++;
      if (def.ammo) {
        this.ammo[a.slot]++;
        if (this.ammo[a.slot] >= def.ammo) { this.reload[a.slot] = def.reload; G.Audio.play('lever', { vol: 0.4 }); }
      }
      if (def.burst && a.shots < def.burst) { a.phase = 'burst'; a.t = 0; }
      else { a.phase = 'r'; a.t = 0; }
    }
    updateShield(dt, a) {
      a.t += dt;
      if (a.phase === 'up') {
        a.canTurn = a.t < 0.08;
        if ((!this.held(a.slot) && a.t > 0.3) || a.t > 2.5) { a.phase = 'r'; a.t = 0; }
      } else if (a.t > 0.18) { this.atk = null; this.state = 'normal'; }
    }
    // ------------------------------------------------------------ skills & flask
    useSkill(slot) {
      const inst = this.skills[slot];
      if (!inst) return;
      if (this.cds[slot] > 0) { G.Audio.play('uiDeny', { vol: 0.4 }); return; }
      const def = G.ITEMS[inst.id];
      const ok = G.Skills.use(this, inst, def);
      if (ok === false) return;
      let cd = def.cd * (1 - (G.itemMods(inst).cd || 0) / 100) * (this.hasMut('stillwater') ? 0.7 : 1);
      this.cds[slot] = cd;
      this.cdMax[slot] = cd;
      if (this.state === 'normal') { this.state = 'cast'; this.stateT = 0; }
    }
    drinkFlask() {
      if (this.flask <= 0) { G.game.notify('[gray]Your flask is empty.[]'); G.Audio.play('uiDeny'); return; }
      if (this.hp >= this.maxHp) { G.game.notify('[gray]You are already at full health.[]'); return; }
      this.flask--;
      const pct = G.hasUpgrade('potency2') ? 0.8 : G.hasUpgrade('potency1') ? 0.7 : 0.6;
      this.healLeft += this.maxHp * pct * (this.hasMut('alchemy') ? 1.2 : 1);
      this.state = 'heal';
      this.stateT = 0;
      G.Audio.play('flask');
      G.Audio.play('heal');
      G.fx.burst(this.cx, this.cy, 12, { color: ['#70f070', '#c0ffc0'], speed: 60, life: 0.6, size: 2, size2: 0, add: true });
    }

    // ------------------------------------------------------------ damage in
    takeHit(h) {
      if (this.dead || this.state === 'dead') return 'miss';
      if (G.game.godMode) return 'miss';
      let dmg = h.dmg;
      if (h.kind === 'dot') {
        this.hp -= dmg;
        this.rallyT = 0.5;
        G.dmgNumber(this.cx, this.y - 4, dmg, h.color || '#ff5050');
        if (this.hp <= 0) this.die(h);
        return 'hit';
      }
      if (this.invuln > 0 || (this.state === 'roll' && this.rollIframe) || this.state === 'cutscene') return 'miss';
      if (this.ward && h.kind !== 'hazard') {
        this.ward = null;
        this.invuln = 0.5;
        G.Audio.play('parry');
        G.fx.burst(this.cx, this.cy, 20, { color: ['#e0f0ff', '#80c0ff'], speed: 140, life: 0.5, size: 2, add: true });
        if (h.src && h.src.takeHit && !h.src.dead) G.applyStatuses(h.src, { stun: 2 });
        return h.proj ? 'block' : 'miss';
      }
      const a = this.atk;
      if (a && a.kind === 'shield' && a.phase === 'up' && !h.unblockable && h.kind !== 'hazard') {
        const fromX = h.x !== undefined ? h.x : h.src ? h.src.cx : this.cx + this.facing;
        const front = Math.sign(fromX - this.cx) === this.facing || Math.abs(fromX - this.cx) < 3;
        if (front) {
          const def = a.def;
          const m = G.itemMods(a.inst);
          if (a.t <= def.parryWin + 0.04) return this.parry(h, a, def, m);
          const block = Math.min(0.98, def.block + (m.blockPlus || 0) / 100) + (this.hasMut('ironwill') ? 0.2 : 0);
          dmg *= Math.max(0, 1 - block);
          G.Audio.play('block');
          G.hitFx(this.cx + this.facing * 8, this.cy - 4, -this.facing, '#e0e0ff');
          this.vx = -this.facing * 90;
          G.shake(0.12);
          if (dmg < 0.5) return h.proj ? 'block' : 'blocked';
          if (this.hasMut('ironwill')) { this.hp -= dmg; this.rally += dmg; this.rallyT = 3; G.dmgNumber(this.cx, this.y - 4, dmg, '#ff9090'); if (this.hp <= 0) this.die(h); return 'blocked'; }
        }
      }
      if (this.curse > 0 && h.kind !== 'hazard') {
        dmg = this.hp + 999;
        G.game.notify('[purple]The curse claims you.[]');
      }
      if (this.hasMut('saltskin')) dmg *= 0.8;
      this.hp -= dmg;
      if (h.kind !== 'hazard') {
        this.rally += dmg;
        this.rallyT = this.hasMut('secondwind') ? 4 : 2;
        if (G.game.stats.damageTaken > 0) G.game.hint('rally', 'The [orange]orange[] part of your health can be won back: strike enemies quickly after being hurt.');
      }
      this.invuln = 0.75;
      this.flashT = 0.15;
      const dir = h.dir || (h.x !== undefined ? Math.sign(this.cx - h.x) || 1 : -this.facing);
      this.vx = dir * (h.knock === undefined ? 160 : h.knock);
      this.vy = -(h.knockUp || 160);
      this.cancelAtk();
      if (this.state !== 'climb') { this.state = 'hurt'; this.stateT = 0; }
      else { this.state = 'normal'; }
      if (h.statuses) G.applyStatuses(this, h.statuses, h.power || 1);
      G.Audio.play('hurt');
      G.shake(0.4);
      G.hitStop(4);
      G.screenFlash('#ff2020', 0.25, 0.25);
      G.bloodFx(this.cx, this.cy, dir, '#ffb060', 8);
      G.dmgNumber(this.cx, this.y - 4, dmg, '#ff5050');
      G.game.stats.damageTaken += dmg;
      if (this.hp <= 0) this.die(h);
      return 'hit';
    }
    parry(h, a, def, m) {
      G.Audio.play('parry');
      G.hitStop(7);
      G.shake(0.3);
      G.screenFlash('#ffffff', 0.12, 0.35);
      G.fx.ring(this.cx + this.facing * 8, this.cy - 4, 22, '#ffffff', 0.25, 3);
      G.fx.burst(this.cx + this.facing * 8, this.cy - 4, 16, { color: ['#ffffff', '#ffe080'], speed: 200, life: 0.35, size: 1, type: 'spark' });
      this.invuln = Math.max(this.invuln, 0.3);
      G.game.stats.parries++;
      if (this.hasMut('riposte')) { this.heal(this.maxHp * 0.06); this.nextCritT = 2; }
      if (m.parryHeal) this.heal(this.maxHp * m.parryHeal / 100);
      const src = h.src;
      const pw = this.power(a.inst);
      if (src && src.takeHit && !src.dead && !h.proj) {
        const st = { stun: def.parryStun };
        if (def.parryBleed) st.bleed = def.parryBleed;
        if (m.parryBurn) st.burn = 2;
        const fd = this.finalDamage(pw * def.parryMult, src, a.inst, true);
        src.takeHit({ dmg: fd.dmg, crit: true, kind: 'melee', team: 'player', x: this.cx, y: this.cy, dir: this.facing, knock: 160, statuses: st, power: this.dotPower(a.inst), item: a.inst, poise: 80, parried: true });
      }
      if (m.parryBoom) G.explode(this.cx + this.facing * 16, this.cy, 44, pw * 1.5, 'player', { color: '#fff0a0', shake: 0.2, silent: true });
      if (h.proj) {
        if (def.reflect) { this.reflectMult = def.reflect; return 'reflect'; }
        this.reflectMult = 1;
        return 'reflect';
      }
      return 'parried';
    }
    die(h) {
      if (this.hasMut('deathsdoor') && !this.deathsDoorUsed) {
        this.deathsDoorUsed = true;
        this.hp = 1;
        this.invuln = 2;
        G.game.notify('[vigor]Death’s Door![] You cling to the wick.');
        G.Audio.play('curse');
        G.screenFlash('#ffffff', 0.4, 0.5);
        return;
      }
      this.hp = 0;
      this.state = 'dead';
      this.stateT = 0;
      this.atk = null;
      this.vy = -200;
      G.game.onPlayerDeath(h);
    }

    // ------------------------------------------------------------ animation & drawing
    updateAnim(dt) {
      const A = this.anim;
      A.t += dt;
      if (this.onGround && Math.abs(this.vx) > 20) A.run += dt * Math.abs(this.vx) / 11;
      else A.run = 0;
      if (A.land > 0) A.land -= dt;
      // scarf verlet
      const s = this.scarf;
      const nx = this.cx - this.facing * 2, ny = this.y + 7;
      s[0].x = nx;
      s[0].y = ny;
      for (let i = 1; i < s.length; i++) {
        const p = s[i];
        const vx = (p.x - p.px) * 0.86, vy = (p.y - p.py) * 0.86;
        p.px = p.x;
        p.py = p.y;
        p.x += vx - this.facing * 12 * dt + Math.sin(A.t * 7 + i) * 3 * dt * 10;
        p.y += vy + 60 * dt * dt * 60;
      }
      for (let k = 0; k < 3; k++)
        for (let i = 1; i < s.length; i++) {
          const a = s[i - 1], b = s[i];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const diff = (d - 2.5) / d;
          b.x -= dx * diff;
          b.y -= dy * diff;
        }
    }
    resetScarf() {
      for (const p of this.scarf) { p.x = p.px = this.cx; p.y = p.py = this.y + 7; }
    }
    flameColors() {
      const d = this.dominantStat();
      if (this.curse > 0) return ['#8a30d0', '#c070ff', '#f0d0ff'];
      if (d === 'fury') return ['#e8402a', '#ff8a40', '#fff0c0'];
      if (d === 'cunning') return ['#9040e0', '#d080ff', '#fff0ff'];
      if (d === 'vigor') return ['#30a040', '#80e060', '#f0ffd0'];
      return ['#ff7a2a', '#ffb040', '#fff0b0'];
    }
    weaponPose() {
      const a = this.atk;
      if (!a) return null;
      const def = a.def;
      if (a.kind === 'melee') {
        const step = this.meleeStep(a);
        const anim = step.anim;
        let p;
        const ph = a.phase;
        const tw = ph === 'w' ? Math.min(1, a.t / step.w) : 0, ta = ph === 'a' ? Math.min(1, a.t / step.a) : 0, tr = ph === 'r' ? Math.min(1, a.t / step.r) : 0;
        const E = G.ease.outCubic;
        const lerpP = (w0, w1, a1, r1) => ph === 'pre' || ph === 'charge' ? w0 : ph === 'w' ? G.lerp(w0, w1, E(tw)) : ph === 'a' ? G.lerp(w1, a1, E(ta)) : G.lerp(a1, r1, tr);
        switch (anim) {
          case 'slash': p = { ang: lerpP(-0.6, -2.2, 0.9, 0.7), hx: 0, arc: [-2.2, 0.9] }; break;
          case 'slash2': p = { ang: lerpP(0.5, 1.0, -1.9, -1.6), hx: 0, arc: [1.0, -1.9] }; break;
          case 'overhead': p = { ang: lerpP(-1.0, -2.7, 1.25, 1.0), hx: 0, arc: [-2.7, 1.25] }; break;
          case 'spin': p = { ang: lerpP(-1.0, -1.6, -1.6 + Math.PI * 2 * (step.multi > 1 ? 1.5 : 1), 0.8), hx: 0, arc: null, spin: true }; break;
          case 'thrust': case 'stab': case 'stab2':
            p = { ang: anim === 'stab2' ? 0.3 : anim === 'stab' ? -0.15 : 0, hx: lerpP(0, -5, 9, 3), thrust: true }; break;
          case 'punch': case 'punch2': p = { ang: 0, hx: lerpP(0, -4, 9, 4), hy: anim === 'punch2' ? -2 : 1, thrust: true }; break;
          case 'whip': p = { ang: lerpP(-1, -2.1, 0.1, 0.2), hx: 0, whip: ph === 'a' ? ta : ph === 'r' ? 1 - tr : 0 }; break;
          default: p = { ang: 0, hx: 0 };
        }
        p.active = ph === 'a';
        p.t = ta;
        p.id = a.inst.id;
        return p;
      }
      if (a.kind === 'ranged') {
        const pull = a.phase === 'w' ? Math.min(1, a.t / def.draw) : 0;
        return { ang: def.charge ? (a.aim || 0) : 0, hx: 3, ranged: true, pull, id: a.inst.id };
      }
      return { ang: 0, hx: 5, shield: true, id: a.inst.id, up: a.phase === 'up' };
    }
    draw(ctx, cx, cy) {
      if (this.hidden) return;
      const x = Math.round(this.cx - cx), y = Math.round(this.bottom - cy);
      const f = this.facing;
      const A = this.anim;
      const flash = this.flashT > 0 || (this.invuln > 0 && this.state !== 'roll' && Math.floor(this.invuln * 20) % 2 === 0 && this.invuln > 0.3);
      const fc = this.flameColors();
      // scarf (world space)
      const s = this.scarf;
      for (let i = 1; i < s.length; i++) {
        ctx.fillStyle = i % 2 ? '#c8402a' : '#e05a3a';
        const px = Math.round(s[i].x - cx), py = Math.round(s[i].y - cy);
        ctx.fillRect(px - 1, py - 1, 2, 2 + (i < 3 ? 1 : 0));
      }
      if (this.state === 'dead') {
        // puddle of wax
        const t = Math.min(1, this.stateT * 2);
        ctx.fillStyle = '#d8d0c0';
        ctx.fillRect(x - 6 * t - 2, y - 2, 12 * t + 4, 2);
        ctx.fillStyle = '#2e4a5e';
        ctx.fillRect(x - 4, y - 3, 7, 2);
        return;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(f, 1);
      if (flash) ctx.globalAlpha = 0.6;
      const wax = flash ? '#ffffff' : '#e6dcc8', waxD = flash ? '#ffffff' : '#b8ab94';
      const cloth = flash ? '#ffffff' : '#2e4a5e', clothD = flash ? '#ffffff' : '#1e3242';
      if (this.state === 'roll') {
        const ang = (this.stateT / ROLL_T) * Math.PI * 2;
        ctx.save();
        ctx.translate(0, -7);
        ctx.rotate(ang);
        G.pixCircle(ctx, 0, 0, 6, cloth);
        ctx.fillStyle = wax;
        ctx.fillRect(-2, -4, 4, 6);
        ctx.fillStyle = fc[1];
        ctx.fillRect(-2, -8, 4, 3);
        ctx.restore();
        ctx.restore();
        return;
      }
      const run = A.run;
      const moving = this.onGround && Math.abs(this.vx) > 20;
      const air = !this.onGround && this.state !== 'climb' && this.state !== 'cling';
      const bob = moving ? Math.abs(Math.sin(run)) * 1 : Math.sin(A.t * 2.5) * 0.4;
      const crouch = A.land > 0 ? 2 : 0;
      const bodyY = -Math.round(bob) + crouch;
      // legs
      let fl, bl; // [footX, footY]
      if (this.state === 'climb') {
        const c = Math.sin(this.y * 0.3);
        fl = [2, -1 - (c > 0 ? 2 : 0)];
        bl = [-2, -1 - (c <= 0 ? 2 : 0)];
      } else if (air) {
        fl = [3, this.vy < 0 ? -4 : -2];
        bl = [-2, this.vy < 0 ? -2 : -1];
      } else if (moving) {
        fl = [Math.round(Math.sin(run) * 4), -Math.round(Math.max(0, Math.cos(run)) * 2)];
        bl = [Math.round(-Math.sin(run) * 4), -Math.round(Math.max(0, -Math.cos(run)) * 2)];
      } else {
        fl = [2, 0];
        bl = [-2, 0];
      }
      const hipY = -8 + bodyY;
      const leg = (foot, col) => {
        ctx.fillStyle = col;
        const kx = Math.round((foot[0]) * 0.5 + 1), ky = Math.round((hipY + foot[1]) / 2);
        ctx.fillRect(Math.min(0, kx) - 1, hipY, 2, ky - hipY + 1);
        ctx.fillRect(Math.min(kx, foot[0]) - 1, ky, Math.abs(foot[0] - kx) + 2, foot[1] - ky);
        ctx.fillRect(foot[0] - 1, foot[1] - 1, 3, 1);
      };
      leg(bl, clothD);
      leg(fl, cloth);
      // cape
      const capeSw = G.clamp(-this.vx / 60, -2, 3) + Math.sin(A.t * 5) * 0.5;
      ctx.fillStyle = clothD;
      ctx.fillRect(-5 - Math.round(capeSw), -15 + bodyY, 3, 8);
      ctx.fillRect(-6 - Math.round(capeSw * 1.4), -9 + bodyY, 3, 3);
      // torso
      ctx.fillStyle = wax;
      ctx.fillRect(-3, -16 + bodyY, 6, 9);
      ctx.fillStyle = waxD;
      ctx.fillRect(2, -16 + bodyY, 1, 9);
      ctx.fillStyle = cloth;
      ctx.fillRect(-3, -12 + bodyY, 6, 5);
      ctx.fillStyle = '#6a4a2a';
      ctx.fillRect(-3, -9 + bodyY, 6, 1);
      ctx.fillStyle = '#c8a050';
      ctx.fillRect(0, -9 + bodyY, 1, 1);
      // weapon & arms
      const pose = this.weaponPose();
      const sh = { x: 1, y: -14 + bodyY };
      let hand = { x: 4, y: -9 + bodyY };
      let back = { x: -3, y: -9 + bodyY };
      if (moving && !pose) { hand = { x: 1 - Math.round(Math.sin(run) * 3), y: -9 + bodyY }; back = { x: -1 + Math.round(Math.sin(run) * 3), y: -9 + bodyY }; }
      if (air && !pose) { hand = { x: 4, y: -15 + bodyY }; back = { x: -4, y: -13 + bodyY }; }
      if (this.state === 'climb') { const c = Math.sin(this.y * 0.3); hand = { x: 2, y: (c > 0 ? -20 : -16) + bodyY }; back = { x: -2, y: (c > 0 ? -16 : -20) + bodyY }; }
      if (this.state === 'heal') { hand = { x: 2, y: -18 + bodyY }; }
      if (this.state === 'cling') { hand = { x: 4, y: -18 + bodyY }; back = { x: 4, y: -12 + bodyY }; }
      if (this.state === 'cast') { hand = { x: 6, y: -16 + bodyY }; }
      // back arm
      ctx.fillStyle = waxD;
      G.pixLine(ctx, sh.x - 2, sh.y, back.x, back.y, waxD);
      if (pose) {
        if (pose.thrust || pose.ranged || pose.shield) hand = { x: sh.x + 3 + (pose.hx || 0), y: sh.y + 2 + (pose.hy || 0) };
        else hand = { x: sh.x + Math.round(Math.cos(pose.ang) * 5), y: sh.y + Math.round(Math.sin(pose.ang) * 5) };
        this.drawWeapon(ctx, pose, hand, sh);
      }
      if (this.state === 'heal') {
        ctx.fillStyle = '#70c070';
        ctx.fillRect(hand.x - 1, hand.y - 4, 3, 4);
        ctx.fillStyle = '#c0ffc0';
        ctx.fillRect(hand.x, hand.y - 3, 1, 1);
      }
      // front arm
      G.pixLine(ctx, sh.x, sh.y, hand.x, hand.y, wax);
      ctx.fillStyle = wax;
      ctx.fillRect(hand.x - 1, hand.y - 1, 2, 2);
      // head: the flame
      const hy = -17 + bodyY;
      const fl2 = Math.sin(A.t * 13) * 0.5 + 0.5, fl3 = Math.sin(A.t * 17 + 1) * 0.5 + 0.5;
      const lean = G.clamp(-this.vx / 90, -2, 2);
      ctx.fillStyle = fc[0];
      ctx.fillRect(-3, hy - 6, 7, 6);
      ctx.fillRect(-2 + Math.round(lean * 0.5), hy - 8 - Math.round(fl2), 5, 3);
      ctx.fillRect(-1 + Math.round(lean), hy - 10 - Math.round(fl3 * 2), 3, 3);
      ctx.fillRect(Math.round(lean * 1.5), hy - 12 - Math.round(fl2 * 2), 1, 2);
      ctx.fillStyle = fc[1];
      ctx.fillRect(-2, hy - 5, 5, 5);
      ctx.fillRect(-1 + Math.round(lean * 0.5), hy - 7 - Math.round(fl3), 3, 3);
      ctx.fillStyle = fc[2];
      ctx.fillRect(-1, hy - 4, 3, 3);
      ctx.fillRect(0 + Math.round(lean * 0.5), hy - 6 - Math.round(fl2), 1, 2);
      // eye
      ctx.fillStyle = '#2a0808';
      ctx.fillRect(1, hy - 4, 2, 1);
      ctx.restore();
      // light from the flame
      const lc = fc[1];
      G.addLight(this.cx, this.y - 2, 150 + Math.sin(A.t * 10) * 6, lc, 1);
      if (Math.random() < 0.25) G.fx.spawn({ x: this.cx + (Math.random() - 0.5) * 4, y: this.y - 6, vx: -this.vx * 0.2 + (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 20, life: 0.5, color: fc[1], size: 1, add: true });
      // ward bubble
      if (this.ward) {
        ctx.globalAlpha = 0.35 + Math.sin(A.t * 6) * 0.1;
        ctx.strokeStyle = '#c0e8ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y - 11, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (this.curse > 0) {
        G.addLight(this.cx, this.cy, 60, '#b040ff', 0.8);
      }
      G.drawStatusIcons(ctx, this, x - 10, y - 38);
    }
    drawWeapon(ctx, pose, hand, sh) {
      const d = G.ITEMS[pose.id];
      const spr = G.heldSprite(pose.id);
      if (pose.shield) {
        const up = pose.up;
        ctx.save();
        ctx.translate(hand.x + 2, hand.y - (up ? 2 : 0));
        ctx.drawImage(spr.img, -spr.img.width / 2, -spr.img.height / 2);
        ctx.restore();
        if (up && this.atk && this.atk.t < this.atk.def.parryWin) {
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(hand.x + 4, hand.y - spr.img.height / 2 - 2, 2, spr.img.height + 2);
          ctx.globalAlpha = 1;
        }
        return;
      }
      if (pose.ranged) {
        ctx.save();
        ctx.translate(hand.x, hand.y);
        ctx.rotate(pose.ang);
        ctx.drawImage(spr.img, -spr.px, -spr.py);
        if ((d.look.shape === 'bow' || d.look.shape === 'longbow') && pose.pull > 0) {
          ctx.fillStyle = '#fff0d0';
          const pull = Math.round(pose.pull * 5);
          ctx.fillRect(-spr.px + 6 - pull, -spr.py + 1, 1, spr.img.height - 2);
          ctx.fillStyle = '#d8c090';
          ctx.fillRect(-spr.px + 6 - pull, -1, 12, 1);
        }
        ctx.restore();
        return;
      }
      // melee
      if (pose.active && !pose.thrust && pose.arc) {
        // smear
        const r = spr.img.width - spr.px + 3;
        const a0 = pose.arc[0];
        const a1 = G.lerp(pose.arc[0], pose.arc[1], G.ease.outCubic(pose.t));
        ctx.save();
        ctx.translate(sh.x, sh.y);
        const glow = d.look.glow || '#ffffff';
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = 0.28 - i * 0.07;
          ctx.strokeStyle = i === 0 ? '#ffffff' : glow;
          ctx.lineWidth = 5 - i * 1.5;
          ctx.beginPath();
          const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
          ctx.arc(0, 0, r + 4 - i * 3, lo, hi);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      if (pose.spin && pose.active) {
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (d.look.shape === 'whip') {
        // lash
        ctx.save();
        ctx.translate(hand.x, hand.y);
        ctx.rotate(pose.ang);
        ctx.drawImage(spr.img, -spr.px, -spr.py);
        ctx.restore();
        const ext = pose.whip || 0;
        if (ext > 0) {
          const len = 66 * ext;
          for (let i = 0; i < len; i += 2) {
            const t = i / 66;
            ctx.fillStyle = i > len - 4 ? '#b0ff90' : d.look.lash;
            ctx.fillRect(Math.round(hand.x + 3 + i), Math.round(hand.y - 5 + Math.sin(t * 9 - ext * 6) * (1 - ext) * 6 + t * 3), 2, 1);
          }
        }
        return;
      }
      if (d.look.shape === 'flail') {
        ctx.save();
        ctx.translate(hand.x, hand.y);
        ctx.rotate(pose.ang);
        ctx.drawImage(spr.img, -spr.px, -spr.py);
        ctx.restore();
        const bx = hand.x + Math.cos(pose.ang) * 22, by = hand.y + Math.sin(pose.ang) * 22;
        G.pixLine(ctx, hand.x + Math.cos(pose.ang) * 6, hand.y + Math.sin(pose.ang) * 6, bx, by, '#8a8a90');
        G.pixCircle(ctx, bx, by, 4, d.look.ball);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 6, 2, 2);
        ctx.fillRect(Math.round(bx) + 4, Math.round(by) - 1, 2, 2);
        ctx.fillRect(Math.round(bx) - 6, Math.round(by) - 1, 2, 2);
        return;
      }
      ctx.save();
      ctx.translate(hand.x, hand.y);
      ctx.rotate(pose.ang);
      ctx.drawImage(spr.img, -spr.px, -spr.py);
      if (d.look.twin) { ctx.rotate(0.5); ctx.globalAlpha = 0.8; ctx.drawImage(spr.img, -spr.px - 2, -spr.py + 3); ctx.globalAlpha = 1; }
      ctx.restore();
      if (d.look.glow) G.addLight(this.cx + this.facing * 10, this.cy - 6, 50, d.look.glow, 0.7);
      if (pose.active && pose.thrust) {
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hand.x + 2, hand.y - 1, spr.img.width + 10, 2);
        ctx.globalAlpha = 1;
      }
    }
  }
  G.Player = Player;
})();
