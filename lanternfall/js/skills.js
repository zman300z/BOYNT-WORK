'use strict';
// ============================================================================
// Skills: grenades, traps, turrets, powers, summons
// ============================================================================
(function () {
  const G = window.G;
  const TS = G.TS;

  class Deployable extends G.Entity {
    constructor(x, y, w, h, o) {
      super(x - w / 2, y - h, w, h);
      Object.assign(this, o);
      this.layer = 2;
      this.age = 0;
    }
    settle(dt) {
      this.vy = Math.min(400, this.vy + 1200 * dt);
      const r = this.moveY(this.vy * dt);
      if (r === 'floor') this.vy = 0;
    }
  }

  class Trap extends Deployable {
    constructor(x, y, o) { super(x, y, 14, 6, o); this.armed = 0.25; }
    update(dt) {
      this.age += dt;
      this.settle(dt);
      if (this.age > 30) return G.world.kill(this);
      if (this.sprung) { this.sprungT -= dt; if (this.sprungT <= 0) G.world.kill(this); return; }
      if (this.age < this.armed) return;
      for (const e of G.world.enemiesIn(this.x - 2, this.y - 10, this.w + 4, this.h + 10)) {
        if (e.flying) continue;
        this.sprung = true;
        this.sprungT = 1.5;
        const fd = this.p.finalDamage(this.dmg, e, this.inst, false);
        e.takeHit({ dmg: fd.dmg, crit: fd.crit, kind: 'skill', team: 'player', x: this.cx, y: this.cy, dir: 0, knock: 0, statuses: this.st, power: this.pow, item: this.inst, poise: 20 });
        G.Audio.play('lever', { x: this.cx });
        G.Audio.play('hit', { x: this.cx });
        G.fx.burst(this.cx, this.y, 8, { color: '#c0c0c8', speed: 90, life: 0.3, size: 1, type: 'spark' });
        break;
      }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      ctx.fillStyle = '#5a5a60';
      ctx.fillRect(x, y + 4, 14, 2);
      ctx.fillStyle = '#9a9aa4';
      if (this.sprung) { for (let i = 0; i < 5; i++) ctx.fillRect(x + 2 + i * 2, y - 2, 1, 6); }
      else { for (let i = 0; i < 5; i++) { ctx.fillRect(x + i * 1, y + 3 - i % 2, 1, 2); ctx.fillRect(x + 13 - i, y + 3 - i % 2, 1, 2); } ctx.fillStyle = '#c0a060'; ctx.fillRect(x + 6, y + 3, 2, 1); }
    }
  }

  class Turret extends Deployable {
    constructor(x, y, o) { super(x, y, 12, 14, o); this.fireT = 0.3; }
    update(dt) {
      this.age += dt;
      this.settle(dt);
      if (this.age > this.life) { G.fx.burst(this.cx, this.cy, 8, { color: '#8a7a6a', speed: 60, life: 0.4, size: 2, grav: 300 }); return G.world.kill(this); }
      this.fireT -= dt;
      const tgt = G.world.nearestEnemy(this.cx, this.cy - 4, this.flame ? 60 : 240, (e) => G.world.level.los(this.cx, this.y + 4, e.cx, e.cy));
      if (tgt) this.facing = Math.sign(tgt.cx - this.cx) || this.facing;
      if (tgt && this.fireT <= 0) {
        this.fireT = this.rate;
        if (this.flame) {
          for (let i = 0; i < 3; i++) G.fx.spawn({ x: this.cx + this.facing * 6, y: this.y + 4, vx: this.facing * (120 + Math.random() * 80), vy: (Math.random() - 0.5) * 40, life: 0.35, color: '#ffa030', color2: '#601010', size: 3, size2: 6, add: true, drag: 0.05 });
          for (const e of G.world.enemiesIn(this.facing > 0 ? this.cx : this.cx - 60, this.y - 12, 60, 30)) {
            e.takeHit({ dmg: this.dmg, kind: 'skill', team: 'player', x: this.cx, dir: this.facing, knock: 0, statuses: { burn: 1 }, power: this.pow, item: this.inst, silent: true, poise: 1 });
          }
          G.addLight(this.cx + this.facing * 20, this.y, 70, '#ff8030', 1);
          if (Math.random() < 0.3) G.Audio.play('fire', { x: this.cx, vol: 0.3 });
        } else {
          const a = Math.atan2(tgt.cy - (this.y + 4), tgt.cx - this.cx);
          G.world.add(new G.Proj({ x: this.cx, y: this.y + 4, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, type: 'bolt', team: 'player', dmg: this.dmg, item: this.inst, power: this.pow, life: 1 }));
          G.Audio.play('turret', { x: this.cx, vol: 0.5 });
        }
      }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
      if (this.flame) {
        ctx.fillStyle = '#6a5a50'; ctx.fillRect(x + 2, y + 2, 8, 12);
        ctx.fillStyle = '#2a2020'; ctx.fillRect(x + 3, y + 5, 2, 2); ctx.fillRect(x + 7, y + 5, 2, 2); ctx.fillRect(x + 4, y + 9, 4, 1);
        const f = Math.sin(this.age * 12) * 0.5 + 0.5;
        ctx.fillStyle = '#ff8030'; ctx.fillRect(x + 3, y - 2 - f * 2, 6, 4);
        ctx.fillStyle = '#ffe080'; ctx.fillRect(x + 5, y - 3 - f * 2, 2, 3);
        G.addLight(this.cx, this.y, 50, '#ff8030', 0.8);
      } else {
        ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 4, y + 6, 4, 8); ctx.fillRect(x, y + 12, 12, 2);
        ctx.fillStyle = '#8a9aa0'; ctx.fillRect(x + 1, y + 3, 10, 3);
        ctx.fillStyle = '#6a5040'; ctx.fillRect(this.facing > 0 ? x + 8 : x, y + 1, 4, 7);
      }
      // lifetime bar
      ctx.fillStyle = '#000'; ctx.fillRect(x, y - 5, 12, 2);
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x, y - 5, Math.round(12 * (1 - this.age / this.life)), 2);
    }
  }

  class OrbitBlades extends G.Entity {
    constructor(o) { super(0, 0, 1, 1); Object.assign(this, o); this.layer = 4; this.age = 0; this.hitT = new Map(); this.alwaysDraw = true; }
    update(dt) {
      this.age += dt;
      const p = G.world.player;
      if (this.age > this.life || !p || p.dead) return G.world.kill(this);
      this.x = p.cx;
      this.y = p.cy;
      for (let i = 0; i < 3; i++) {
        const a = this.age * 5 + (i / 3) * Math.PI * 2;
        const bx = this.x + Math.cos(a) * 30, by = this.y + Math.sin(a) * 22;
        for (const e of G.world.enemiesIn(bx - 5, by - 5, 10, 10)) {
          const t = this.hitT.get(e) || 0;
          if (G.world.time - t < 0.3) continue;
          this.hitT.set(e, G.world.time);
          const fd = p.finalDamage(this.dmg, e, this.inst, false);
          e.takeHit({ dmg: fd.dmg, crit: fd.crit, kind: 'skill', team: 'player', x: this.x, y: this.y, dir: Math.sign(e.cx - this.x) || 1, knock: 60, item: this.inst, poise: 6 });
        }
        if (Math.random() < 0.3) G.fx.spawn({ x: bx, y: by, life: 0.2, color: '#80c0ff', size: 1, add: true });
      }
      G.addLight(this.x, this.y, 70, '#80c0ff', 0.6);
    }
    draw(ctx, cx, cy) {
      for (let i = 0; i < 3; i++) {
        const a = this.age * 5 + (i / 3) * Math.PI * 2;
        const bx = this.x + Math.cos(a) * 30 - cx, by = this.y + Math.sin(a) * 22 - cy;
        ctx.save();
        ctx.translate(Math.round(bx), Math.round(by));
        ctx.rotate(a + Math.PI / 2);
        ctx.globalAlpha = Math.min(1, (this.life - this.age) * 2);
        ctx.fillStyle = '#80c0ff'; ctx.fillRect(-1, -7, 3, 12);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-1, -7, 1, 10);
        ctx.fillStyle = '#806040'; ctx.fillRect(-2, 4, 5, 1);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  class Gull extends G.Entity {
    constructor(x, y, o) { super(x - 5, y - 4, 10, 8); Object.assign(this, o); this.layer = 4; this.age = 0; this.state = 'hover'; this.t = Math.random(); this.alwaysDraw = true; }
    update(dt) {
      this.age += dt;
      const p = G.world.player;
      if (this.age > this.life || !p) { G.fx.burst(this.cx, this.cy, 6, { color: '#d0e0f0', speed: 60, life: 0.4, size: 1 }); return G.world.kill(this); }
      this.t -= dt;
      if (this.state === 'hover') {
        const tx = p.cx + Math.cos(this.age * 2 + this.i * 2) * 26, ty = p.y - 18 + Math.sin(this.age * 3 + this.i) * 6;
        this.x += (tx - this.cx) * 4 * dt;
        this.y += (ty - this.cy) * 4 * dt;
        if (this.t <= 0) {
          const e = G.world.nearestEnemy(this.cx, this.cy, 220);
          if (e) { this.state = 'dive'; this.target = e; this.t = 0.8; }
          else this.t = 0.3;
        }
      } else {
        const e = this.target;
        if (!e || e.dead || this.t <= 0) { this.state = 'hover'; this.t = 0.6; return; }
        const a = Math.atan2(e.cy - this.cy, e.cx - this.cx);
        this.vx = Math.cos(a) * 360;
        this.vy = Math.sin(a) * 360;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.facing = Math.sign(this.vx) || 1;
        if (G.overlap(this, e.hurtbox ? e.hurtbox() : e)) {
          const fd = p.finalDamage(this.dmg, e, this.inst, false);
          e.takeHit({ dmg: fd.dmg, crit: fd.crit, kind: 'skill', team: 'player', x: this.cx, y: this.cy, dir: this.facing, knock: 60, item: this.inst, poise: 6, statuses: { bleed: 1 }, power: this.pow });
          this.state = 'hover';
          this.t = 0.7;
        }
      }
    }
    draw(ctx, cx, cy) {
      const x = Math.round(this.cx - cx), y = Math.round(this.cy - cy);
      const flap = Math.sin(this.age * 20) > 0;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#d0e0f0';
      ctx.fillRect(x - 2, y - 1, 5, 3);
      ctx.fillRect(x - 6, y - (flap ? 3 : -1), 4, 2);
      ctx.fillRect(x + 3, y - (flap ? 3 : -1), 4, 2);
      ctx.fillStyle = '#ffb040';
      ctx.fillRect(x + (this.facing > 0 ? 3 : -4), y, 2, 1);
      ctx.globalAlpha = 1;
      G.addLight(this.cx, this.cy, 30, '#d0e0f0', 0.4);
    }
  }
  G.Deployables = { Trap, Turret, OrbitBlades, Gull };

  G.Skills = {
    use(p, inst, def) {
      const pw = p.power(inst);
      const pow = p.dotPower(inst);
      const st = p.itemStatuses(inst);
      const W = G.world;
      switch (def.type) {
        case 'grenade': {
          const tgt = W.nearestEnemy(p.cx + p.facing * 60, p.cy, 200, (e) => Math.sign(e.cx - p.cx) === p.facing || Math.abs(e.cx - p.cx) < 20);
          let vx = p.facing * 200, vy = -260;
          if (tgt) {
            const dx = tgt.cx - p.cx, t = G.clamp(Math.abs(dx) / 220, 0.3, 0.9);
            vx = dx / t;
            vy = (tgt.cy - p.cy - 0.5 * 900 * t * t) / t;
          }
          const col = def.look.glass;
          W.add(new G.Proj({
            x: p.cx, y: p.cy - 6, w: 7, h: 7, vx, vy: Math.max(-420, vy), grav: 900, type: 'grenade', team: 'player', dmg: pw, color: col, life: 2,
            onExplode: (pr) => {
              const colors = inst.id === 'rime_flask' ? ['#a0f0ff', '#ffffff', '#60c0e0'] : inst.id === 'pitch_flask' ? ['#4a4030', '#2a2a2a', '#6a5a40'] : ['#ffd060', '#ff8030', '#ff4020'];
              G.explode(pr.cx, pr.cy, def.aoe, pw, 'player', { statuses: st, power: pow, item: inst, color: colors[0], colors, sfx: inst.id === 'rime_flask' ? 'freeze' : 'explosion' });
              if (inst.id === 'cinder_flask') for (let i = -1; i <= 1; i++) W.add(new G.Puddle(pr.cx + i * 24, pr.cy, 'fire', pow * 6));
            },
          }));
          G.Audio.play('throw');
          break;
        }
        case 'blast': {
          G.explode(p.cx, p.cy, def.aoe, pw, 'player', { statuses: st, power: pow, item: inst, color: '#ffe060', colors: ['#ffffff', '#ffe060', '#c0a040'], sfx: 'lightning', shake: 0.4 });
          G.screenFlash('#fff0c0', 0.15, 0.4);
          break;
        }
        case 'trap':
          W.add(new Trap(p.cx + p.facing * 10, p.bottom, { dmg: pw, st, pow, inst, p }));
          G.Audio.play('lever');
          break;
        case 'turret':
          W.add(new Turret(p.cx + p.facing * 12, p.bottom, { dmg: pw, pow, inst, life: def.life, rate: def.rate, facing: p.facing }));
          G.Audio.play('turret');
          break;
        case 'flameturret':
          W.add(new Turret(p.cx + p.facing * 12, p.bottom, { dmg: pw * 0.5, pow, inst, life: def.life, rate: def.rate, flame: true, facing: p.facing }));
          G.Audio.play('fire');
          break;
        case 'phase': {
          const e = W.nearestEnemy(p.cx, p.cy, def.range, (e) => W.level.los(p.cx, p.cy, e.cx, e.cy));
          if (!e) { G.game.notify('[gray]No target in range.[]'); G.Audio.play('uiDeny'); return false; }
          const L = W.level;
          const side = e.facing ? -e.facing : Math.sign(e.cx - p.cx) || 1;
          let nx = e.cx + side * (e.w / 2 + 10) - p.w / 2;
          const ny = e.bottom - p.h;
          if (L.rectSolid(nx, ny, p.w, p.h)) nx = e.cx - side * (e.w / 2 + 10) - p.w / 2;
          if (L.rectSolid(nx, ny, p.w, p.h)) { nx = p.x; }
          G.fx.burst(p.cx, p.cy, 16, { color: ['#c080ff', '#ffffff'], speed: 120, life: 0.4, size: 2, add: true });
          p.x = nx;
          p.y = ny;
          p.facing = Math.sign(e.cx - p.cx) || 1;
          p.resetScarf();
          p.invuln = Math.max(p.invuln, 0.3);
          p.nextCritT = 1;
          G.applyStatuses(e, { stun: 1 });
          e.takeHit({ dmg: pw, kind: 'skill', team: 'player', x: p.cx, y: p.cy, dir: p.facing, knock: 40, item: inst, poise: 20 });
          G.fx.burst(p.cx, p.cy, 16, { color: ['#c080ff', '#ffffff'], speed: 120, life: 0.4, size: 2, add: true });
          G.Audio.play('teleport');
          break;
        }
        case 'chain': {
          let from = { cx: p.cx, cy: p.cy - 6 };
          const hit = new Set();
          let n = 0;
          for (let j = 0; j < def.jumps; j++) {
            let best = null, bd = j === 0 ? def.range : 110;
            for (const e of W.enemies) {
              if (e.dead || e.dying || hit.has(e)) continue;
              const d = Math.hypot(e.cx - from.cx, e.cy - from.cy);
              if (d < bd) { bd = d; best = e; }
            }
            if (!best) break;
            hit.add(best);
            G.boltFx(from.cx, from.cy, best.cx, best.cy, '#a0d0ff');
            const fd = p.finalDamage(pw, best, inst, false);
            best.takeHit({ dmg: fd.dmg, crit: fd.crit, kind: 'skill', team: 'player', x: from.cx, y: from.cy, dir: Math.sign(best.cx - from.cx) || 1, knock: 60, statuses: Object.assign({ stun: 0.3 }, st), power: pow, item: inst, poise: 20 });
            from = best;
            n++;
          }
          if (!n) { G.game.notify('[gray]No target in range.[]'); G.Audio.play('uiDeny'); return false; }
          G.Audio.play('lightning');
          G.shake(0.2);
          break;
        }
        case 'orbit':
          W.add(new OrbitBlades({ dmg: pw, inst, life: def.life }));
          G.Audio.play('magic');
          break;
        case 'ward':
          p.ward = { t: def.life };
          G.Audio.play('freeze');
          break;
        case 'gulls':
          for (let i = 0; i < 3; i++) W.add(new Gull(p.cx, p.y - 10, { dmg: pw, inst, pow, life: def.life, i }));
          G.Audio.play('magic');
          break;
      }
      return true;
    },
  };
})();
