'use strict';
/* UNDERSONG — bot: an autopilot used for automated playtests (and nothing else).
   It follows the song downhill, keeps its distance from trouble, sidesteps projectiles,
   opens what it finds, and picks modules at random. Turn on with ?bot or G.bot.on = true. */
(function () {
  const { sin, cos, min, max, abs, atan2, hypot, PI } = Math;
  const { clamp } = G;
  const I = G.input, _v = { x: 0, y: 0 };

  const bot = G.bot = {
    on: !!G.params.bot, t: 0, stuckT: 0, lx: 0, ly: 0, wanderT: 0, wx: 0, wy: 0, sonarT: 2, menuT: 0, strafe: 1, strafeT: 0,
    log: { hits: [], zones: [], deaths: 0, events: [] }, skill: G.params.skill === undefined ? 1 : +G.params.skill,

    note(msg) { this.log.events.push(`${(G.run ? G.run.time : 0).toFixed(0)}s z${G.zone ? G.zone.idx : '?'} ${msg}`); },

    menus(dt) {
      const top = G.menu.top();
      if (!top) { this.menuT = 0; return false; }
      this.menuT += dt;
      if (this.menuT < 0.5) return true;
      const id = top.id;
      if (id === 'levelup') { if (top.data.picked < 0 && top.data.ids.length) { G.SCREENS.levelup.pick(top, (G.rand() * top.data.ids.length) | 0); this.menuT = 0; } }
      else if (id === 'title') { top.data.go = top.data.go || 0.001; }
      else if (id === 'splash') { G.menu.close(top); G.menu.open('title'); }
      else if (id === 'pause' || id === 'settings' || id === 'codex' || id === 'workshop') G.menu.close(top);
      else if (id === 'ending') { if (G.ending && G.ending.botAdvance) G.ending.botAdvance(); }
      return true;
    },

    drive(dt) {
      this.t += dt;
      I.fire = I.dash = I.flare = I.sonar = I.interact = I.pause = false; I.moveX = I.moveY = 0;
      if (G.game.state === 'ending' && G.ending) { G.ending.botAdvance(); return; }
      if (this.menus(dt)) return;
      const p = G.player, zone = G.zone;
      if (!zone || G.game.state !== 'play' || p.dead || !p.control) return;
      let mx = 0, my = 0;
      // ---- who to worry about
      let foe = null, fd = 1e9, crowd = 0;
      for (const c of G.ents.creatures) {
        if (!c.hostile || c.dead || c.fleeing || !c.awake || c.asleep || !c.hittable) continue;
        const d = hypot(c.x - p.x, c.y - p.y) - c.r;
        if (d < 170) crowd++;
        if (d > 560) continue;
        if (!c.aggro && d > 300 && !c.boss) continue;
        const pri = d - (c.boss ? 0 : c.type === 'part' ? -200 : 60);
        if (c.botSkip) continue;
        if (pri < fd && (d < 120 || G.los(p.x, p.y, c.x, c.y))) { fd = pri; foe = c; }
      }
      // ---- where to go
      let goalX = 0, goalY = 0, hasGoal = false;
      // things worth opening
      let prop = null, pd = 520;
      for (const pr of G.ents.props) {
        if (pr.dead || pr.used || !pr.def.interact) continue;
        if (pr.def.canInteract && !pr.def.canInteract(pr, p)) continue;
        if (pr.botSkip || (pr.price !== undefined && p.pearls < pr.price)) continue;
        const d = hypot(pr.x - p.x, pr.y - p.y);
        if (d < pd && G.los(p.x, p.y, pr.x, pr.y - 6)) { pd = d; prop = pr; }
      }
      const cleaner = !prop && p.hull < p.st.maxHull ? G.ents.props.find(pr => pr.type === 'cleaner' && !pr.used && hypot(pr.x - p.x, pr.y - p.y) < 480 && G.los(p.x, p.y, pr.x, pr.y - 20)) : null;
      if (prop && !foe) {
        goalX = prop.x - p.x; goalY = prop.y - 14 - p.y; hasGoal = true; if (pd < prop.r + 40) I.interact = true;
        prop.botT = (prop.botT || 0) + dt;                    // accumulates even if line of sight flickers
        if (prop.botT > 9) { prop.botSkip = true; this.note('gave up on ' + prop.type); }
      }
      else if (cleaner && !foe) { const dx = cleaner.x - p.x, dy = cleaner.y - 30 - p.y; if (hypot(dx, dy) > 16) { goalX = dx; goalY = dy; hasGoal = true; } else hasGoal = true; }
      else if (G.game.bossOn && zone.boss) {
        // stay in the room, off the walls
        const A = zone.arena; goalX = (A.x - p.x) * 0.4; goalY = (A.y - p.y) * 0.4; hasGoal = hypot(goalX, goalY) > 60;
      } else if (G.exitDir(p.x, p.y, _v)) { goalX = _v.x; goalY = _v.y; hasGoal = true; }
      if (hasGoal) { const l = hypot(goalX, goalY) || 1; mx += goalX / l; my += goalY / l; }
      // ---- a target whose health has not moved in a long while is out of reach: leave it
      if (foe && !foe.boss) {
        if (foe !== this.tgt) { this.tgt = foe; this.tgtHp = foe.hp; this.tgtT = 0; }
        this.tgtT += dt;
        if (foe.hp < this.tgtHp - 0.5) { this.tgtHp = foe.hp; this.tgtT = 0; }
        if (this.tgtT > 12) { foe.botSkip = true; this.note('gave up on ' + foe.type); foe = null; }
      }
      // ---- fighting
      if (foe) {
        const dx = foe.x - p.x, dy = foe.y - p.y, d = hypot(dx, dy) || 1, sp = p.st.speed, tt = d / sp;
        const ax = dx + (foe.vx || 0) * tt * 0.8, ay = dy + (foe.vy || 0) * tt * 0.8, al = hypot(ax, ay) || 1;
        I.aimStick = true; I.aimX = ax / al; I.aimY = ay / al;
        I.fire = this.skill > 0;
        const keep = foe.boss ? 300 : 210;
        this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = G.rr(0.8, 2.2); this.strafe = -this.strafe; }
        if (d < keep) { const k = (keep - d) / keep * 2.4; mx -= dx / d * k; my -= dy / d * k; }
        else if (d > keep + 150 && !hasGoal) { mx += dx / d; my += dy / d; }
        mx += -dy / d * this.strafe * 0.8 * this.skill; my += dx / d * this.strafe * 0.8 * this.skill;
        if (!G.game.bossOn && !foe.boss && hasGoal && d > 320) { /* keep travelling */ } else if (!foe.boss && hasGoal && !prop) { mx *= 0.6; my *= 0.6; }
      } else if (hasGoal) { I.aimStick = true; I.aimX = mx; I.aimY = my; const l = hypot(mx, my) || 1; I.aimX /= l; I.aimY /= l; }
      // ---- projectiles
      let close = 0;
      for (const s of G.ents.eshots) {
        const dx = p.x - s.x, dy = p.y - s.y, d = hypot(dx, dy);
        if (d > 170) continue;
        const sv = hypot(s.vx, s.vy) || 1, along = (dx * s.vx + dy * s.vy) / sv;
        if (along < -10) continue;
        const px = dx - s.vx / sv * along, py = dy - s.vy / sv * along, miss = hypot(px, py);
        if (miss > 44) continue;
        close++;
        const k = (1 - d / 170) * 3.2 * this.skill, side = miss > 1 ? 1 : (G.rand() < 0.5 ? 1 : -1);
        mx += (miss > 1 ? px / miss : -s.vy / sv * side) * k; my += (miss > 1 ? py / miss : s.vx / sv * side) * k;
        if (d < 50 && p.dashCharge >= 1 && this.skill > 0.5) I.dash = true;
      }
      // telegraphed blasts: step out of a filling ring, dash if it is about to go
      for (const h of G.hazards.list) {
        if (h.fired) continue;
        const dx = p.x - h.x, dy = p.y - h.y, d = hypot(dx, dy), margin = h.r + p.r + 20;
        if (d >= margin) continue;
        const left = h.delay - h.t, k = ((1 - d / margin) * 3 + (1 - clamp(left / h.delay, 0, 1)) * 2) * this.skill;
        if (d > 1) { mx += dx / d * k; my += dy / d * k; } else mx += k;
        if (left < 0.3 && d < h.r + p.r && p.dashCharge >= 1 && this.skill > 0.5) I.dash = true;
      }
      if (this.skill > 0.5 && p.flares > 0 && (close >= 4 || crowd >= 3 || (p.hull <= 2 && (close >= 2 || crowd >= 2)))) I.flare = true;
      // creatures winding up a charge straight at us: step aside
      for (const c of G.ents.creatures) {
        if ((c.st === 'dash' || c.st === 'jabDash' || c.st === 'lunge') && !c.fleeing && c.pd < 420) {
          const a = c.da !== undefined && c.st !== 'lunge' ? c.da : c.face, dx = p.x - c.x, dy = p.y - c.y, along = dx * cos(a) + dy * sin(a);
          if (along > 0) { const px = dx - cos(a) * along, py = dy - sin(a) * along, miss = hypot(px, py); if (miss < 70) { const s = miss > 2 ? 1 / miss : 0; mx += (s ? px * s : -sin(a)) * 3 * this.skill; my += (s ? py * s : cos(a)) * 3 * this.skill; if (c.pd < 150 && p.dashCharge >= 1 && this.skill > 0.5) I.dash = true; } }
        }
      }
      // ---- walls: lean away
      const d = G.sdfGrad(p.x, p.y, _v);
      if (d < 46) { const k = (1 - d / 46) * 1.4; mx += _v.x * k; my += _v.y * k; }
      // ---- unstick
      this.stuckT += dt;
      if (hypot(p.x - this.lx, p.y - this.ly) > 46) { this.lx = p.x; this.ly = p.y; this.stuckT = 0; }
      if (this.stuckT > 3.5 && !foe && !cleaner) { this.wanderT = 1.2; const a = G.rand() * G.TAU; this.wx = cos(a); this.wy = sin(a); this.stuckT = 0; this.note('unstick'); }
      if (this.wanderT > 0) { this.wanderT -= dt; mx = this.wx; my = this.wy; if (p.dashCharge >= 1) I.dash = true; }
      const l = hypot(mx, my);
      if (l > 0.05) { I.moveX = mx / l; I.moveY = my / l; }
      this.sonarT -= dt;
      if (this.sonarT <= 0 && p.sonarT <= 0) { this.sonarT = 7; I.sonar = true; }
    },
  };

  // step the game without drawing; returns a summary. Used by tools/playtest.js
  G.game.simulate = function (seconds, opts) {
    opts = opts || {};
    const dt = 1 / 60, n = Math.round(seconds / dt), p = G.player, start = performance.now();
    let steps = 0, lastHull = p.hull, lastZone = G.zone.idx;
    for (let i = 0; i < n; i++) {
      G.rdt = dt; G.time += dt; G.frame++;
      I.update(dt);
      this.update(dt);
      I.endFrame();
      steps++;
      if (p.hull < lastHull && !p.dead) bot.log.hits.push({ t: +G.run.time.toFixed(1), z: G.zone.idx, hull: p.hull, d: Math.round(G.world.depthAt(p.y)) });
      lastHull = p.hull;
      if (G.zone.idx !== lastZone) { bot.log.zones.push({ z: lastZone, t: +G.run.time.toFixed(1), lv: p.level, hull: p.hull, mods: p.modList.length }); lastZone = G.zone.idx; }
      if (this.state === 'ending') this._sawEnding = true;
      if (opts.untilDead && (this.state === 'dead' || (this.state === 'ending' && !opts.through) || (opts.through && this.state === 'title' && this._sawEnding))) break;
    }
    return {
      state: this.state, simSeconds: +(steps * dt).toFixed(1), realMs: Math.round(performance.now() - start), zone: G.zone.idx, depth: Math.round(G.world.depthAt(p.y)),
      hull: p.hull, maxHull: p.st.maxHull, level: p.level, mods: p.modList.map(id => id + (p.mods[id] > 1 ? 'x' + p.mods[id] : '')), pearls: p.pearls, time: +G.run.time.toFixed(1),
      scans: G.run.scans, dissuaded: G.run.dissuaded, bosses: G.run.bosses, notes: G.run.noteMask, boss: G.zone.boss && !G.zone.boss.dead ? Math.round(G.zone.boss.hp) + '/' + G.zone.boss.maxHp : null,
      creatures: G.ents.creatures.length, eshots: G.ents.eshots.length, menu: G.menu.top() ? G.menu.top().id : null,
    };
  };

  const baseUpdate = I.update;
  I.update = function (dt) { baseUpdate.call(I, dt); if (bot.on) bot.drive(dt); };
})();
