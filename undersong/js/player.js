'use strict';
/* UNDERSONG — player: WICK-7, a survey probe with one big eye.
   Movement, dash, pulse emitter, flare, sonar, damage, XP, and its own drawing. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, exp, PI, floor, hypot } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU;
  const I = G.input;
  const R = 13, DASH_SPEED = 830, DASH_TIME = 0.17;

  G.PAINTS = [
    { id: 'classic', name: 'Survey Yellow', hull: '#ffd040', shade: '#d98c1a', stripe: '#fff7e0', dark: '#3b2a14', cost: 0 },
    { id: 'buoy', name: 'Buoy Orange', hull: '#ff8a3c', shade: '#c9541c', stripe: '#fff1dc', dark: '#3d1d10', cost: 40 },
    { id: 'seaglass', name: 'Sea Glass', hull: '#7fe0c4', shade: '#3a9e8e', stripe: '#f2fffa', dark: '#123a36', cost: 40 },
    { id: 'coral', name: 'Coral Pink', hull: '#ff8fa8', shade: '#cc5577', stripe: '#fff0f3', dark: '#3d1422', cost: 60 },
    { id: 'pearl', name: 'Pearl', hull: '#f2f0ea', shade: '#b9b4c4', stripe: '#8fd8ff', dark: '#2c2a3a', cost: 90 },
    { id: 'midnight', name: 'Midnight', hull: '#4a5a9a', shade: '#27306a', stripe: '#9fe8ff', dark: '#0d1030', cost: 90 },
  ];

  G.baseStats = function () {
    return {
      dmg: 10, rate: 4.6, speed: 660, range: 540, count: 1, spread: 0.05, pierce: 0, bounce: 0, size: 1, homing: 0, crit: 0, critMul: 2.5,
      split: 0, burst: 0, chain: 0, echo: 0, chord: 0, crescendo: 0, breath: 0, knock: 1,
      move: 255, dashCd: 1.15, dashCharges: 1, dashDmg: 0, decoy: 0, punch: 0,
      flareMax: 2, flareR: 270, flareStun: 1.7, flareVuln: 0, flareAbsorb: 0, flareCost: 34,
      maxHull: 5, magnet: 95, pearlMul: 1, lampR: 560, lampHalf: 0.5, scanMul: 1, glowMul: 1, xpMul: 1,
      thorns: 0, plating: 0, lastStand: 0, inkReflex: 0, regen: 0, wisps: 0, remora: 0, pilot: 0, shrimp: 0, veil: 0,
      sonarCd: 4, sonarDmg: 0, sonarMark: 0, luck: 0,
    };
  };

  const pl = G.player = {
    x: 0, y: 0, vx: 0, vy: 0, r: R, ax: 0, ay: 0,
    aim: 0, face: 0, aimDist: 200,
    st: G.baseStats(), mods: {}, modList: [],
    hull: 5, flares: 2, flareFill: 0, xp: 0, level: 1, xpNext: 14, pearls: 0, pendingLevels: 0,
    fireT: 0, shotN: 0, heat: 0, restT: 0, echoQ: [],
    dashT: 0, dashCharge: 1, dashX: 1, dashY: 0, ghostT: 0,
    inv: 0, hurtT: 0, sonarT: 0, regenT: 0, plateT: 0, plateReady: false, standUsed: false,
    control: true, dead: false, deadT: 0, slow: 1, lampPower: 1, lampBoost: 0, lampWant: 1,
    paint: G.PAINTS[0], shades: false,
    // animation state
    bob: 0, prop: 0, blinkT: 2, lid: 0, squint: 0, wide: 0, happy: 0, tilt: 0, sq: 0, antX: 0, antY: -22, antVX: 0, antVY: 0, beaconT: 0, bumpT: 0, thrustT: 0, wakeT: 0,
    _lamp: { x: 0, y: 0, ang: 0, range: 0, half: 0, power: 0, glow: 0 },

    reset(x, y) {
      this.x = x; this.y = y; this.vx = this.vy = 0; this.ax = this.ay = 0;
      this.mods = {}; this.modList = [];
      this.recalc();
      this.hull = this.st.maxHull; this.flares = this.st.flareMax; this.flareFill = 0;
      this.xp = 0; this.level = 1; this.xpNext = 14; this.pearls = 0; this.pendingLevels = 0;
      this.fireT = 0; this.shotN = 0; this.heat = 0; this.restT = 0; this.echoQ.length = 0;
      this.dashT = 0; this.dashCharge = this.st.dashCharges; this.inv = 0; this.hurtT = 0; this.sonarT = 0; this.regenT = 0;
      this.plateT = 0; this.plateReady = this.st.plating > 0; this.standUsed = false;
      this.control = true; this.dead = false; this.deadT = 0; this.lampPower = 1; this.lampWant = 1;
      this.antX = x; this.antY = y - 22; this.antVX = this.antVY = 0;
    },

    // rebuild stats from workshop upgrades + modules
    recalc() {
      const st = G.baseStats();
      if (G.meta) G.meta.applyWorkshop(st);
      if (G.MODULES) for (const id in this.mods) { const def = G.MODULES[id]; if (def && def.apply) def.apply(st, this.mods[id]); }
      if (G.settings.calm) st.maxHull += 3;
      this.st = st;
      if (this.hull > st.maxHull) this.hull = st.maxHull;
      if (this.flares > st.flareMax) this.flares = st.flareMax;
      return st;
    },
    addModule(id) {
      const before = this.st.maxHull, beforeF = this.st.flareMax;
      this.mods[id] = (this.mods[id] || 0) + 1;
      if (this.mods[id] === 1) this.modList.push(id);
      this.recalc();
      if (this.st.maxHull > before) this.hull = min(this.st.maxHull, this.hull + (this.st.maxHull - before));
      if (this.st.flareMax > beforeF) this.flares = min(this.st.flareMax, this.flares + (this.st.flareMax - beforeF));
      if (this.st.plating && !this.plateT) this.plateReady = true;
      const def = G.MODULES[id];
      if (def && def.onGet) def.onGet(this);
      G.emit('module', id);
    },

    lampParams() {
      const L = this._lamp, st = this.st;
      L.x = this.x; L.y = this.y; L.ang = this.face;
      L.range = st.lampR * (1 + 0.05 * this.lampBoost); L.half = st.lampHalf; L.power = this.lampPower; L.glow = 205 * st.glowMul;
      return L;
    },

    update(dt) {
      const st = this.st, t = G.time;
      this.inv = max(0, this.inv - dt); this.hurtT = max(0, this.hurtT - dt);
      this.lampBoost = max(0, this.lampBoost - dt * 5);
      this.bumpT = max(0, this.bumpT - dt);
      // lamp flicker: after a hit, and now and then when nearly broken
      let want = this.lampWant;
      if (this.hurtT > 0) want *= 0.35 + 0.65 * (G.noise2(t * 40, 3, 7) > 0.45 ? 1 : 0);
      else if (this.hull <= 1 && !this.dead && G.noise2(t * 9, 1, 3) > 0.84) want *= 0.5;
      if (this.dead) want = max(0, 1 - this.deadT * 0.9) * (G.noise2(t * 30, 5, 1) > 0.5 ? 1 : 0.25);
      this.lampPower = damp(this.lampPower, want, 26, dt);

      if (this.dead) {
        this.deadT += dt;
        this.vx = damp(this.vx, 0, 1.5, dt); this.vy = damp(this.vy, 26, 1.2, dt);
        this.x += this.vx * dt; this.y += this.vy * dt;
        G.collide(this, 0.2);
        this.tilt = damp(this.tilt, 2.2, 0.8, dt);
        if (G.rand() < dt * 5) G.particles.bubble(this.x + G.rr(-6, 6), this.y - 8, G.rr(1.5, 3.5), G.rr(-10, 10), -20);
        this.animate(dt);
        return;
      }

      // ---- aim
      if (this.control) {
        if (I.aimStick) this.aim = atan2(I.aimY, I.aimX);
        else if (!I.usingPad) {
          const dx = G.cam.toWorldX(I.mouse.x) - this.x, dy = G.cam.toWorldY(I.mouse.y) - this.y, d2 = dx * dx + dy * dy;
          if (d2 > 30) { this.aim = atan2(dy, dx); this.aimDist = sqrt(d2); }
        } else if (I.moveX || I.moveY) this.aim = atan2(I.moveY, I.moveX);
      }
      this.face = G.angDamp(this.face, this.aim, 24, dt);

      // ---- dash
      this.dashCharge = min(st.dashCharges, this.dashCharge + dt / st.dashCd);
      if (this.control && I.dash && this.dashCharge >= 1 && this.dashT <= 0) this.startDash();
      let mx = this.control ? I.moveX : 0, my = this.control ? I.moveY : 0;
      if (this.dashT > 0) {
        this.dashT -= dt;
        const u = max(0, this.dashT / DASH_TIME), sp = DASH_SPEED * (0.72 + 0.28 * u);
        this.vx = this.dashX * sp; this.vy = this.dashY * sp;
        this.ghostT -= dt;
        if (this.ghostT <= 0) {
          this.ghostT = 0.022;
          G.particles.mote(this.x, this.y, 0, 0, this.paint.hull, 15, 0.26, 0, 0);
          G.particles.bubble(this.x + G.rr(-6, 6), this.y + G.rr(-6, 6), G.rr(1.5, 4), -this.dashX * 60, -this.dashY * 60);
        }
        if (this.dashT <= 0) {
          this.vx = this.dashX * st.move * 1.1; this.vy = this.dashY * st.move * 1.1;
          G.emit('dashEnd', this);
        }
      } else {
        const sp = st.move * this.slow;
        const k = (mx || my) ? 10.5 : 4.2;
        this.vx = damp(this.vx, mx * sp, k, dt); this.vy = damp(this.vy, my * sp, k, dt);
      }
      this.slow = 1;
      this.vx += this.ax * dt; this.vy += this.ay * dt; this.ax = this.ay = 0;
      this.x += this.vx * dt; this.y += this.vy * dt;

      const speed = hypot(this.vx, this.vy);
      if (G.collide(this, 0.2)) {
        if (speed > 190 && this.bumpT <= 0) {
          this.bumpT = 0.25;
          const n = G.hitN;
          G.particles.dust(this.x - n.x * R, this.y - n.y * R, 5, G.css(G.zone.def.rockL), 50, n.x, n.y);
          G.sfx('bump', { v: clamp(speed / 700, 0.2, 1) });
          this.sq = max(this.sq, 0.5);
        }
      }
      const zone = G.zone;
      if (zone.idx === 0 && this.y < zone.surfaceY + R + 3) {
        if (this.vy < -150) { G.particles.bubbles(this.x, zone.surfaceY + 6, 8, 12, 90); G.sfx('splash'); }
        this.y = zone.surfaceY + R + 3; if (this.vy < 0) this.vy *= -0.2;
      }
      if (this.y < R) { this.y = R; if (this.vy < 0) this.vy = 0; }

      // ---- thruster bubbles + wake
      if ((mx || my) && this.dashT <= 0) {
        this.thrustT -= dt;
        if (this.thrustT <= 0) {
          this.thrustT = 0.07;
          const l = hypot(mx, my) || 1, bx = -mx / l, by = -my / l;
          G.particles.bubble(this.x + bx * 12 + G.rr(-5, 5), this.y + by * 12 + G.rr(-5, 5) + 5, G.rr(1.2, 3), bx * 70 + G.rr(-20, 20), by * 70 + G.rr(-20, 20), G.rr(0.5, 1.1));
        }
      }
      if (zone.def.glowWake && speed > 110) {
        this.wakeT -= dt * speed / 100;
        if (this.wakeT <= 0) {
          this.wakeT = 0.05;
          G.particles.mote(this.x + G.rr(-11, 11), this.y + G.rr(-11, 11), G.rr(-14, 14), G.rr(-14, 14), zone.def.glowWake, G.rr(2.5, 6), G.rr(0.8, 1.9), 0, 1.5);
        }
      }

      // ---- emitter
      const wantFire = this.control && I.fire && this.dashT <= 0;
      this.fireT -= dt;
      if (st.crescendo) this.heat = wantFire ? min(1, this.heat + dt * 0.45) : max(0, this.heat - dt * 1.6);
      if (wantFire) {
        if (this.fireT <= 0) { this.fireT = 1 / (st.rate * (1 + 0.28 * st.crescendo * this.heat)); this.shoot(); }
      } else {
        this.restT += dt;
        if (st.breath && this.restT >= 1 && this.restT - dt < 1) { G.sfx('breathReady'); G.particles.ring(this.x, this.y, 26, 8, '#bff6ff', 0.3, 2); }
      }
      for (let i = this.echoQ.length - 1; i >= 0; i--) {
        const e = this.echoQ[i]; e.t -= dt;
        if (e.t <= 0) { this.echoQ.splice(i, 1); this.volley(e.ang, e.mul, true); G.sfx('shoot', { echo: true }); }
      }

      // ---- abilities
      this.sonarT = max(0, this.sonarT - dt);
      if (this.control && I.flare) this.flare();
      if (this.control && I.sonar && this.sonarT <= 0) this.sonar();
      if (this.flares < st.flareMax) {
        this.flareFill += dt / 50;
        if (this.flareFill >= 1) { this.flareFill = 0; this.flares++; G.sfx('flareReady'); }
      } else this.flareFill = 0;
      if (st.regen && this.hull < st.maxHull) { this.regenT += dt; if (this.regenT > 80 / st.regen) { this.regenT = 0; this.heal(1); } }
      if (st.plating && !this.plateReady) { this.plateT -= dt; if (this.plateT <= 0) { this.plateReady = true; G.sfx('plate'); G.particles.ring(this.x, this.y, 30, 18, '#d8e4c0', 0.4, 2); } }
      if (this.hull <= 2 && G.rand() < dt * (this.hull <= 1 ? 6 : 2.5)) G.particles.bubble(this.x + G.rr(-8, 8), this.y - 6, G.rr(1.2, 2.6), 0, -20, 0.9);

      this.animate(dt);
    },

    animate(dt) {
      const t = G.time, speed = hypot(this.vx, this.vy);
      this.bob = sin(t * 2.1) * 1.6 * (1 - min(1, speed / 160));
      this.prop += dt * (6 + speed * 0.09);
      if (!this.dead) this.tilt = damp(this.tilt, clamp(this.vx / 320, -1, 1) * 0.24, 8, dt);
      this.sq = damp(this.sq, this.dashT > 0 ? 1 : 0, 14, dt);
      this.squint = damp(this.squint, this.hurtT > 0 ? 1 : 0, 12, dt);
      this.wide = damp(this.wide, 0, 3, dt);
      this.happy = max(0, this.happy - dt);
      this.blinkT -= dt;
      if (this.blinkT <= 0) this.blinkT = G.rr(2.2, 5.5);
      this.lid = this.dead ? min(1, this.deadT * 0.7) : (this.blinkT < 0.13 ? sin(this.blinkT / 0.13 * PI) : 0);
      // springy antenna tip
      const c = cos(this.tilt), s = sin(this.tilt);
      const rx = this.x + s * 22, ry = this.y + this.bob - c * 22;
      this.antVX += ((rx - this.antX) * 190 - this.antVX * 11) * dt; this.antVY += ((ry - this.antY) * 190 - this.antVY * 11) * dt;
      this.antX += this.antVX * dt; this.antY += this.antVY * dt;
      if (hypot(this.antX - rx, this.antY - ry) > 14) { this.antX = rx; this.antY = ry; this.antVX = this.antVY = 0; }
      this.beaconT = (this.beaconT + dt) % 1.7;
    },

    startDash() {
      let dx = I.moveX, dy = I.moveY; const l = hypot(dx, dy);
      if (l < 0.2) { dx = cos(this.aim); dy = sin(this.aim); } else { dx /= l; dy /= l; }
      this.dashCharge -= 1; this.dashT = DASH_TIME; this.dashX = dx; this.dashY = dy; this.ghostT = 0;
      this.inv = max(this.inv, DASH_TIME + 0.09);
      this.vx = dx * DASH_SPEED; this.vy = dy * DASH_SPEED;
      G.particles.bubbles(this.x - dx * 8, this.y - dy * 8, 12, 9, 130);
      G.particles.ring(this.x, this.y, 8, 34, '#dff8ff', 0.28, 2.5);
      G.cam.kick(dx * 5, dy * 5);
      G.fx.wave(this.x, this.y, { speed: 520, maxR: 150, str: 0.35 });
      G.sfx('dash');
      G.emit('dash', this);
    },

    // one volley of pulses along `ang`
    volley(ang, mul, isEcho) {
      const st = this.st, n = st.count;
      const charged = !isEcho && st.breath > 0 && this.restT >= 1;
      for (let i = 0; i < n; i++) {
        const k = i - (n - 1) / 2;
        const a = ang + k * 0.085 + (G.rand() - 0.5) * st.spread;
        const lat = k * 7.5;
        const x = this.x + cos(ang) * 16 - sin(ang) * lat, y = this.y + sin(ang) * 16 + cos(ang) * lat;
        let dmg = st.dmg * mul, crit = false;
        if (st.crit && G.rand() < st.crit) { dmg *= st.critMul; crit = true; }
        if (charged && i === 0) {
          G.shots.fire(x, y, a, { dmg: dmg * (3 + st.breath), speed: st.speed * 1.15, life: st.range / st.speed, r: 9 * st.size, pierce: 4 + st.pierce, bounce: st.bounce, homing: st.homing, kind: 'big', crit });
        } else {
          G.shots.fire(x, y, a, { dmg, speed: st.speed, life: st.range / st.speed, r: 5 * st.size, pierce: st.pierce, bounce: st.bounce, homing: st.homing, kind: isEcho ? 'echo' : 'pulse', crit });
        }
      }
      return charged;
    },

    shoot() {
      const st = this.st, a = this.aim;
      this.shotN++;
      let charged = false;
      if (st.chord && this.shotN % 5 === 0) {
        G.shots.fire(this.x + cos(a) * 16, this.y + sin(a) * 16, a, { dmg: st.dmg * (2.2 + st.chord * 0.9), speed: st.speed * 0.8, life: st.range / st.speed * 1.1, r: 20 * st.size, pierce: 99, bounce: 0, homing: 0, kind: 'wave', crit: false });
        G.sfx('chord');
      } else {
        charged = this.volley(a, 1, false);
        G.sfx(charged ? 'shootBig' : 'shoot', { n: st.count, heat: this.heat });
      }
      if (st.echo) this.echoQ.push({ t: 0.14, ang: a, mul: 0.4 + 0.15 * st.echo });
      this.restT = 0;
      const kick = charged ? 70 : 16;
      this.vx -= cos(a) * kick; this.vy -= sin(a) * kick;
      this.lampBoost = 1;
      G.cam.kick(-cos(a) * (charged ? 5 : 1.4), -sin(a) * (charged ? 5 : 1.4));
      G.lights.flash(this.x + cos(a) * 20, this.y + sin(a) * 20, charged ? 150 : 70, '#bff4ff', 0.09, 0.8);
      if (charged) { G.fx.wave(this.x, this.y, { speed: 600, maxR: 180, str: 0.5 }); G.cam.shake(0.18); }
      G.emit('shoot', this);
    },

    flare(free) {
      const st = this.st;
      if (!free) {
        if (this.flares <= 0) { G.sfx('deny'); return; }
        this.flares--;
      }
      const R2 = st.flareR * (free ? 1.5 : 1);
      G.lights.flash(this.x, this.y, R2 * 2.6, '#fff6e0', 1.1, 1);
      G.fx.wave(this.x, this.y, { speed: 900, maxR: R2 * 1.5, str: 1.3 });
      G.fx.punch(0.5, 0.42);
      G.cam.shake(0.45);
      G.particles.ring(this.x, this.y, 10, R2, '#fff6dc', 0.5, 5);
      G.particles.ring(this.x, this.y, 10, R2 * 0.7, '#ffe6a8', 0.38, 3);
      G.particles.sparks(this.x, this.y, 26, '#fff0c0', { s0: 200, s1: 620, life: 0.5, size: 2.4 });
      G.sfx('flare');
      this.wide = 1;
      G.emit('flare', this, R2);
    },

    sonar() {
      this.sonarT = this.st.sonarCd;
      G.sfx('sonar');
      G.emit('sonar', this);
    },

    hurt(n, sx, sy) {
      if (this.dead || this.inv > 0 || G.game.god) return false;
      const st = this.st;
      if (this.plateReady) {
        this.plateReady = false; this.plateT = max(8, 22 - st.plating * 4); this.inv = 0.7;
        G.particles.flakes(this.x, this.y, 10, '#c8d0b0', 240);
        G.particles.ring(this.x, this.y, 16, 44, '#e8f0d0', 0.3, 3);
        G.sfx('plateBreak'); G.cam.shake(0.2);
        return false;
      }
      this.hull -= n; this.inv = 1.2 + (st.inkReflex ? 0.6 : 0); this.hurtT = 0.45;
      let dx = this.x - sx, dy = this.y - sy; const l = hypot(dx, dy) || 1; dx /= l; dy /= l;
      this.vx += dx * 340; this.vy += dy * 340; this.dashT = 0;
      G.game.hitstop(0.09);
      G.cam.shake(0.6); G.cam.kick(dx * 10, dy * 10);
      G.fx.punch(0.75, 0.16);
      G.particles.flakes(this.x, this.y, 8, this.paint.hull, 260);
      G.particles.bubbles(this.x, this.y, 14, 10, 160);
      G.particles.sparks(this.x, this.y, 10, '#ffb080', { s0: 120, s1: 420, life: 0.4 });
      G.sfx('hurt');
      if (st.inkReflex) { for (let i = 0; i < 5; i++) G.particles.ink(this.x + G.rr(-20, 20), this.y + G.rr(-20, 20), G.rr(26, 44), G.rr(2.2, 3.4), G.rr(-30, 30), G.rr(-30, 30)); G.emit('inkReflex', this); }
      G.emit('hurt', this, n);
      if (this.hull <= 0) {
        if (st.lastStand && !this.standUsed) {
          this.standUsed = true; this.hull = 1; this.inv = 2.2;
          this.flare(true);
          G.particles.text(this.x, this.y - 30, 'PRESSURE VALVE', '#ffe6a8', 14, 1.6);
        } else this.die();
      }
      return true;
    },

    heal(n) {
      if (this.dead) return;
      const before = this.hull;
      this.hull = min(this.st.maxHull, this.hull + n);
      if (this.hull > before) {
        G.particles.motes(this.x, this.y, 10, '#9dffb8', { s0: 20, s1: 90, life: 0.8, size0: 4, size1: 9 });
        G.particles.ring(this.x, this.y, 30, 12, '#9dffb8', 0.4, 2.5);
        G.sfx('heal'); this.happy = 1;
        G.emit('heal', this);
      }
    },

    addXp(n) {
      if (this.dead) return;
      n *= this.st.xpMul;
      this.xp += n;
      if (this.flares < this.st.flareMax) {
        this.flareFill += n / this.st.flareCost;
        if (this.flareFill >= 1) { this.flareFill = 0; this.flares++; G.sfx('flareReady'); G.particles.ring(this.x, this.y, 34, 14, '#ffe6a8', 0.4, 2.5); }
      }
      while (this.xp >= this.xpNext) {
        this.xp -= this.xpNext;
        this.level++;
        this.xpNext = floor(this.xpNext * 1.19 + 7);
        this.pendingLevels++;
        G.emit('levelup', this);
      }
    },
    addPearls(n) { n = Math.round(n * this.st.pearlMul); this.pearls += n; G.emit('pearls', n); return n; },

    die() {
      if (this.dead) return;
      this.dead = true; this.deadT = 0; this.hull = 0; this.control = false; this.dashT = 0;
      G.game.hitstop(0.5);
      G.cam.shake(0.9);
      G.fx.punch(1.2, 0.3);
      G.fx.wave(this.x, this.y, { speed: 500, maxR: 500, str: 1.2 });
      G.particles.flakes(this.x, this.y, 18, this.paint.hull, 300);
      G.particles.bubbles(this.x, this.y, 30, 14, 200);
      G.sfx('death');
      G.emit('death', this);
    },

    // ------------------------------------------------------------- drawing
    draw(ctx) {
      const t = G.time, pt = this.paint;
      if (this.inv > 0 && this.hurtT <= 0 && this.dashT <= 0 && !this.dead && floor(t * 22) % 2 === 0) ctx.globalAlpha = 0.45;
      const x = this.x, y = this.y + this.bob;
      // antenna (world space, springy)
      const c0 = cos(this.tilt), s0 = sin(this.tilt);
      const ax = x + s0 * 12, ay = y - c0 * 12;
      ctx.strokeStyle = pt.dark; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(x + s0 * 19, y - c0 * 19, this.antX, this.antY + this.bob * 0.3); ctx.stroke();
      ctx.fillStyle = this.beaconT < 0.14 ? '#d8ffe2' : '#4a6a58';
      ctx.beginPath(); ctx.arc(this.antX, this.antY + this.bob * 0.3, 2.3, 0, TAU); ctx.fill();

      ctx.save();
      ctx.translate(x, y);
      if (this.sq > 0.02) {       // stretch along the dash
        const a = atan2(this.dashY, this.dashX), k = this.sq;
        ctx.rotate(a); ctx.scale(1 + 0.3 * k, 1 - 0.2 * k); ctx.rotate(-a);
      }
      ctx.rotate(this.tilt);
      // thruster pods
      const sp = hypot(this.vx, this.vy), pr = abs(sin(this.prop));
      for (let s = -1; s <= 1; s += 2) {
        const px = s * 10.5, py = 9;
        ctx.fillStyle = '#3a4352'; ctx.beginPath(); ctx.ellipse(px, py, 4.6, 3.3, s * 0.5, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#8b98ab'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(px + s * 2.6 - 3.6 * pr * 0.5, py + 3.6 + s * 0); ctx.lineTo(px + s * 2.6 + 3.6 * pr * 0.5, py + 3.6); ctx.stroke();
      }
      // fins
      const fl = sin(t * (5 + min(8, sp * 0.03))) * 0.32;
      ctx.fillStyle = pt.shade;
      for (let s = -1; s <= 1; s += 2) {
        ctx.save(); ctx.translate(s * 11.5, 0); ctx.rotate(s * (0.5 + fl));
        ctx.beginPath(); ctx.moveTo(0, -2.5); ctx.quadraticCurveTo(s * 9, -1, s * 8, 5); ctx.quadraticCurveTo(s * 3, 3, 0, 2.5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // hull
      const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, R + 1);
      g.addColorStop(0, G.mixCss(pt.hull, '#ffffff', 0.45)); g.addColorStop(0.45, pt.hull); g.addColorStop(1, pt.shade);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      // stripe (a chord band across the lower hull)
      ctx.fillStyle = pt.stripe;
      ctx.beginPath(); ctx.arc(0, 0, R - 0.4, 0.34, PI - 0.34); ctx.arc(0, 0, R - 0.4, PI - 0.72, 0.72, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = pt.dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      // rivets
      ctx.fillStyle = G.css(pt.dark, 0.55);
      for (let i = -1; i <= 1; i++) { const a = -PI / 2 + i * 0.5; ctx.beginPath(); ctx.arc(cos(a) * 10, sin(a) * 10, 0.9, 0, TAU); ctx.fill(); }
      if (this.hull <= 2 && !this.dead || this.dead) {
        ctx.strokeStyle = G.css(pt.dark, 0.8); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-5, -3); ctx.lineTo(-7, 1); ctx.lineTo(-3, 3); ctx.stroke();
        if (this.hull <= 1) { ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(6, -3); ctx.lineTo(10, 0); ctx.stroke(); }
      }
      ctx.restore();

      // eye — rides around the hull toward wherever Wick is looking
      const ex = x + cos(this.face) * 4.4, ey = y + sin(this.face) * 4.4;
      ctx.fillStyle = '#27303c'; ctx.beginPath(); ctx.arc(ex, ey, 8, 0, TAU); ctx.fill();
      const eg = ctx.createRadialGradient(ex - 2, ey - 2.5, 0.5, ex, ey, 6.6);
      eg.addColorStop(0, '#f2feff'); eg.addColorStop(0.5, '#9fe9f7'); eg.addColorStop(1, '#3d9fb8');
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, 6.4, 0, TAU); ctx.fill();
      const pr2 = 2.5 + this.wide * 1.3 - this.squint * 0.6;
      const pxx = ex + cos(this.face) * 1.9, pyy = ey + sin(this.face) * 1.9;
      if (this.happy > 0 && !this.dead) {
        ctx.strokeStyle = '#0d2530'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(pxx, pyy + 1.6, 2.8, PI * 1.12, PI * 1.88); ctx.stroke();
      } else {
        ctx.fillStyle = '#0d2530'; ctx.beginPath(); ctx.arc(pxx, pyy, pr2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(pxx - 1.1, pyy - 1.2, 0.95, 0, TAU); ctx.fill();
      }
      // lids: blink closes from the top; a wince closes from both
      const lidTop = min(1, this.lid + this.squint * 0.34), lidBot = this.squint * 0.3;
      ctx.fillStyle = '#27303c';
      if (lidTop > 0.02) { const th = Math.acos(1 - 2 * min(1, lidTop)); ctx.beginPath(); ctx.arc(ex, ey, 6.6, -PI / 2 - th, -PI / 2 + th); ctx.closePath(); ctx.fill(); }
      if (lidBot > 0.02) { const th = Math.acos(1 - 2 * lidBot); ctx.beginPath(); ctx.arc(ex, ey, 6.6, PI / 2 - th, PI / 2 + th); ctx.closePath(); ctx.fill(); }
      if (this.shades) {
        // floating sunglasses, worn with total confidence
        ctx.save(); ctx.translate(ex, ey - 0.5); ctx.rotate(this.tilt * 0.6);
        ctx.fillStyle = '#10141c'; ctx.strokeStyle = '#ff7a59'; ctx.lineWidth = 1.1;
        for (let s = -1; s <= 1; s += 2) { G.roundRect(ctx, s * 4.6 - 4, -3.2, 8, 6, 2.2); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-0.9, -1.4); ctx.lineTo(0.9, -1.4); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-7, -1.4); ctx.lineTo(-4.4, -1.4); ctx.moveTo(2.2, -1.4); ctx.lineTo(4.8, -1.4); ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },

    drawGlow(ctx) {
      const t = G.time, x = this.x, y = this.y + this.bob, st = this.st;
      const ex = x + cos(this.face) * 4.4, ey = y + sin(this.face) * 4.4;
      if (!this.shades) G.drawGlow(ctx, ex, ey, 26 + this.lampBoost * 10, '#9fe6ff', (0.26 + this.lampBoost * 0.3) * this.lampPower);
      if (this.beaconT < 0.14) G.drawGlow(ctx, this.antX, this.antY, 11, '#9dffb0', 0.9);
      if (this.hull <= 1 && !this.dead) G.drawGlow(ctx, x, y, 34, '#ff5040', 0.22 + 0.22 * sin(t * 9));
      if (this.dashT > 0) G.drawGlow(ctx, x - this.dashX * 12, y - this.dashY * 12, 26, '#dff8ff', 0.6);
      // dash recharge arc
      if (!this.dead && this.dashCharge < st.dashCharges) {
        const f = this.dashCharge % 1;
        ctx.globalAlpha = 0.5; ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y, 21, -PI / 2, -PI / 2 + TAU * f); ctx.stroke(); ctx.globalAlpha = 1;
      }
      if (this.plateReady) {
        ctx.globalAlpha = 0.5 + 0.15 * sin(t * 3); ctx.strokeStyle = '#dfe8c8'; ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) { const a = t * 0.5 + i * TAU / 5; ctx.beginPath(); ctx.arc(x, y, 18.5, a, a + 0.8); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      if (st.breath && this.restT >= 1 && !this.dead) {
        const mxp = x + cos(this.face) * 17, myp = y + sin(this.face) * 17;
        G.drawGlow(ctx, mxp, myp, 13 + sin(t * 12) * 2, '#bff6ff', 0.9);
      }
    },
  };
})();
