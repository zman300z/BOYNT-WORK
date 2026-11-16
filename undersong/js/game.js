'use strict';
/* UNDERSONG — game: the director. Main loop, states (title / play / descend / dead / ending),
   zone flow, boss encounters, level-ups, music + ambience steering, scene composition. */
(function () {
  const { sin, cos, min, max, abs, floor, hypot, PI, round } = Math;
  const { clamp, damp, lerp } = G;
  const I = G.input, pl = G.player;
  const MUSIC = ['shallows', 'twilight', 'midnight', 'abyss', 'trench'];
  const ZOOM = 1.12;          // everyday camera; bosses pull back

  const game = G.game = {
    state: 'boot', god: !!G.params.god, timescale: 1, stopT: 0, slowT: 0, flowT: 0,
    fade: 1, fadeTo: 0, fadeRate: 1.6, desc: null, deadT: 0, bossOn: false, tether: false, tetherK: 0,
    ms: { upd: 0, draw: 0 }, fps: 60, last: 0, veilK: 0, dangerK: 0,

    hitstop(t) { this.stopT = max(this.stopT, t); },

    // ------------------------------------------------------------- runs
    newRun() {
      const seed = G.params.seed ? +G.params.seed : (Math.random() * 1e9) | 0;
      G.run = { seed, zone: 0, noteMask: 0, rerolls: G.meta.level('reroll'), time: 0, scans: 0, fresh: 0, dissuaded: 0, pods: 0, bosses: 0, maxDepth: 0, won: false, ending: null };
      G.music.mask = 0;
      G.story.reset(); G.hud.reset();
      if (G.companions) G.companions.reset();
      pl.reset(0, 0);
      pl.paint = G.PAINTS.find(p => p.id === G.meta.data.paint) || G.PAINTS[0];
      pl.shades = !!(G.meta.data.shades && G.meta.data.shadesOn);
    },

    enterZone(idx, seed) {
      G.clearEnts(); G.particles.clear(); G.sonar.pings.length = 0; G.decoy = null;
      const zone = G.zone = G.genZone(idx, seed);
      G.run.zone = idx;
      this.bossOn = false;
      G.backdrop.init(zone);
      pl.x = zone.start.x; pl.y = zone.start.y; pl.vx = pl.vy = 0;
      G.cam.x = pl.x; G.cam.y = pl.y; G.cam.zoom = G.cam.tzoom = ZOOM;
      G.scan.target = null;
      G.populate(zone);
      if (idx === 0) {
        G.props.add('boat', zone.start.x - 110, zone.surfaceY);
        if (!G.meta.data.shades) { const sx = zone.start.x + (G.RNG(seed)() < 0.5 ? -1 : 1) * (720 + G.RNG(seed + 1)() * 380); G.props.add('shades', clamp(sx, 260, zone.pxW - 260), zone.surfaceY); }
      } else if (G.shop) G.shop.setup(zone);
      this.clampCam();
      G.world.prewarm(G.cam.x, G.cam.y);
      G.fx.tint = zone.def.tint; G.fx.sat = zone.def.sat;
      G.computeFlow(pl.x, pl.y);
      G.lights.ambTarget = 1; G.lights.ambMul = 1;
    },

    toTitle() {
      G.menu.stack.length = 0;
      this.newRun();
      this.enterZone(0, G.run.seed);
      pl.control = false; this.tether = true; this.tetherK = 1;
      this.state = 'title'; this.desc = null;
      G.cam.zoom = G.cam.tzoom = 1; G.cam.x = pl.x - 300; G.cam.y = G.zone.surfaceY + 96; this.clampCam();
      G.world.prewarm(G.cam.x, G.cam.y);
      this.fade = 1; this.fadeTo = 0; this.fadeRate = 0.9;
      G.audio.muffle(0);
      G.music.set('title', true); G.music.fade(1);
      G.menu.open(G.audio.ready || G.params.mute ? 'title' : 'splash');
    },

    startDive() {
      if (this.state !== 'title') return;
      this.state = 'play'; this.tether = false; pl.control = true; pl.vy = 70; G.cam.tzoom = ZOOM;
      I.locked = 0.25;
      G.meta.data.stats.dives++; G.meta.save();
      G.sfx('clunk'); G.particles.bubbles(pl.x, pl.y - 18, 12, 8, 80);
      G.hud.title(G.zone.def.name, G.zone.def.sub + '  ·  ' + G.zone.def.depth[0] + ' – ' + G.fmtInt(G.zone.def.depth[1]) + ' m');
      G.story.diveStart();
      G.music.set(MUSIC[0]);
      if (G.meta.level('head')) G.after(1.6, () => { if (this.state === 'play' && !pl.dead) G.menu.open('levelup', { title: 'HEAD START', sub: 'FITTED BEFORE LAUNCH', quiet: true }); });
      G.emit('diveStart');
    },

    // straight into a zone, kitted roughly as a real run would be (debug + tests)
    debugJump(idx, levels) {
      G.menu.stack.length = 0;
      this.newRun();
      this.enterZone(idx, G.run.seed + idx * 7919);
      this.state = 'play'; this.tether = false; pl.control = true; this.fade = 0; this.fadeTo = 0;
      G.meta.data.stats.dives = max(3, G.meta.data.stats.dives);
      const n = levels === undefined ? idx * 4 : levels;
      for (let i = 0; i < n; i++) { const ids = G.offerModules(1); if (ids.length) pl.addModule(ids[0]); pl.level++; }
      pl.hull = pl.st.maxHull;
      G.music.set(MUSIC[idx], true);
    },

    startDescent() {
      if (this.desc) return;
      const zone = G.zone, next = zone.idx + 1;
      this.desc = { t: 0, phase: 0, from: G.world.depthAt(pl.y), to: G.ZONES[next].depth[0], next };
      this.state = 'descend'; pl.control = false;
      this.fadeTo = 1; this.fadeRate = 1.3;
      G.sfx('whoosh'); G.music.fade(0.35);
    },

    bank(won) {
      const d = G.meta.data, r = G.run;
      d.pearls += pl.pearls; pl.banked = pl.pearls;
      d.stats.bestDepth = max(d.stats.bestDepth, round(r.maxDepth));
      d.stats.bestZone = max(d.stats.bestZone, r.zone);
      d.stats.time += r.time;
      if (won) d.stats.wins++;
      G.meta.save();
    },
    abandon() { this.bank(false); G.audio.muffle(0); this.toTitle(); },

    // ------------------------------------------------------------- bosses
    startBoss(b) {
      const zone = G.zone, A = zone.arena, def = b.def;
      this.bossOn = true; b.asleep = false; b.aggro = true;
      zone.gate = G.props.add('barrier', A.x, A.gateY - 70, { r: 108 });
      if (def.wake) def.wake(b);
      G.music.set(def.music || 'boss', true); G.music.hit(1);
      G.hud.setBoss(b, def.title, def.latin);
      G.hud.title(def.title, def.epithet, { small: true, life: 3.6 });
      G.cam.tzoom = def.zoom || 0.9;
      G.sfx('roar'); G.sfx('gate'); G.cam.shake(0.6); this.hitstop(0.12);
      G.fx.wave(b.x, b.y, { speed: 600, maxR: 900, str: 1 });
      G.story.bossStart(zone.idx);
      G.emit('bossStart', b);
    },
    bossDown(b) {
      const zone = G.zone, def = b.def;
      this.bossOn = false; G.run.bosses++;
      for (const pr of G.ents.props) if (pr.type === 'barrier') G.PROPS.barrier.open(pr);
      for (const s of G.ents.eshots) G.eshots.kill(s);
      for (const c of G.ents.creatures) if (c.minion && !c.fleeing) G.creatures.dissuade(c);
      G.sfx('bossDown'); this.slowT = 1.3; this.hitstop(0.2);
      G.cam.shake(0.8); G.cam.tzoom = ZOOM; G.fx.punch(0.9, 0.4);
      G.fx.wave(b.x, b.y, { speed: 500, maxR: 1100, str: 1.4 });
      G.lights.flash(b.x, b.y, 900, '#fff6dc', 1.6, 1);
      G.pickups.loot(b.x, b.y, 44 + zone.idx * 16, 12 + zone.idx * 3);
      G.pickups.spawn('heal', b.x, b.y, 1); G.pickups.spawn('heal', b.x + 20, b.y, 1);
      if (def.final) { G.after(2.4, () => this.startEnding()); return; }
      G.music.set(MUSIC[zone.idx]);
      G.story.bossDown(zone.idx);
      G.after(2.6, () => { if (!pl.dead && this.state === 'play') G.menu.open('levelup', { title: def.title, sub: 'IT LEFT SOMETHING BEHIND', opts: { relic: def.relic, minRarity: 1 }, quiet: true }); });
      G.emit('bossDown', b);
    },
    startEnding() { if (G.ending) G.ending.start(); },

    // ------------------------------------------------------------- per-frame
    clampCam() {
      const cam = G.cam, zone = G.zone, hw = G.W / 2 / cam.zoom, hh = G.H / 2 / cam.zoom;
      const top = zone.idx === 0 ? zone.surfaceY - 250 : 0;
      cam.x = clamp(cam.x, hw, max(hw, zone.pxW - hw));
      cam.y = clamp(cam.y, top + hh, max(top + hh, zone.pxH - hh + 40));
    },

    updateWorld(dt) {
      const zone = G.zone;
      G.lights.begin();
      if (this.tether) {         // hanging off the crane: a soft spring, and the eye follows the cursor
        const boat = G.props.find('boat'), ax = boat ? boat.x + 110 : pl.x, ay = zone.surfaceY + 54;
        pl.ax += (ax - pl.x) * 26 - pl.vx * 5; pl.ay += (ay - pl.y) * 26 - pl.vy * 5 + sin(G.time * 1.1) * 30;
        const dx = G.cam.toWorldX(I.mouse.x) - pl.x, dy = G.cam.toWorldY(I.mouse.y) - pl.y;
        if (I.mouse.seen && dx * dx + dy * dy > 30) pl.aim = Math.atan2(dy, dx); else pl.aim = 0.9 + sin(G.time * 0.5) * 0.5;
      }
      pl.update(dt);
      G.creatures.update(dt);
      G.props.update(dt); G.decor.update(dt); G.scan.update(dt); G.sonar.update(dt);
      if (G.companions) G.companions.update(dt);
      G.shots.update(dt); G.eshots.update(dt); G.hazards.update(dt); G.pickups.update(dt);
      G.particles.update(dt); G.backdrop.update(dt); G.lights.update(dt);
      this.flowT -= dt;
      if (this.flowT <= 0) { this.flowT = 0.22; G.computeFlow(pl.x, pl.y); }
      // camera
      const cam = G.cam;
      let tx, ty;
      if (this.state === 'title') { const boat = G.props.find('boat'); tx = (boat ? boat.x + 110 : pl.x) - 300; ty = zone.surfaceY + 96; }
      else if (this.state === 'ending' && G.ending && G.ending.cam) { tx = G.ending.cam.x; ty = G.ending.cam.y; }
      else if (this.bossOn && zone.boss && !zone.boss.dead) { const A = zone.arena; tx = lerp(pl.x, A.x, 0.45); ty = lerp(pl.y, A.y, 0.5); }
      else { const lead = min(pl.aimDist, 320) * 0.2; tx = pl.x + cos(pl.aim) * lead + pl.vx * 0.1; ty = pl.y + sin(pl.aim) * lead + pl.vy * 0.1; }
      cam.x = damp(cam.x, tx, 5.5, dt); cam.y = damp(cam.y, ty, 5.5, dt);
      cam.zoom = damp(cam.zoom, cam.tzoom, 2.2, dt);
      this.clampCam();
    },

    updatePlay(dt, rdt) {
      const zone = G.zone, r = G.run;
      r.time += dt;
      r.maxDepth = max(r.maxDepth, G.world.depthAt(pl.y));
      // boss wake-up
      const b = zone.boss;
      if (b && b.asleep && !this.bossOn && !b.dead) { const A = zone.arena; if (pl.y > A.gateY + 96 && abs(pl.x - A.x) < A.rx) this.startBoss(b); }
      // level-ups, one card screen at a time
      if (pl.pendingLevels > 0 && !G.menu.active() && !pl.dead) {
        pl.pendingLevels--;
        if (pl.st.shrimp && pl.level % 2 === 0) pl.heal(1);
        G.menu.open('levelup');
      }
      if (I.pause && !G.menu.active() && !pl.dead) { I.pause = false; G.menu.open('pause'); }
      if (!pl.dead && zone.idx < 4 && pl.y > zone.pxH - 26) this.startDescent();
      G.story.update(dt);
      // music follows the room
      let mode = MUSIC[zone.idx];
      if (this.bossOn && b) mode = b.def.music || 'boss';
      else if (zone.hermit && hypot(zone.hermit.x - pl.x, zone.hermit.y - pl.y) < 460) mode = 'shop';
      else if (zone.garden && pl.y > zone.arena.y - zone.arena.ry - 100) mode = 'garden';
      if (!pl.dead) G.music.set(mode);
      G.music.setIntensity(this.bossOn ? 1 : clamp(G.creatures.threat / 3.2, 0, 1));
    },

    updateDescent(dt, rdt) {
      const d = this.desc;
      d.t += rdt;
      if (d.phase === 0) {
        pl.ay += 520;
        if (d.t > 1.05 && this.fade > 0.97) {
          d.phase = 1;
          this.enterZone(d.next, G.run.seed + d.next * 7919);
          pl.y = 40; pl.vy = 230; pl.control = false;
          G.cam.x = pl.x; G.cam.y = pl.y + 200; this.clampCam(); G.world.prewarm(G.cam.x, G.cam.y);
        }
      } else if (d.phase === 1) {
        if (d.t > 2.5) { d.phase = 2; this.fadeTo = 0; this.fadeRate = 1.2; G.music.fade(1); }
      } else {
        pl.ay += 180;
        if (pl.y > G.zone.start.y - 40 || d.t > 5) {
          pl.control = true; this.state = 'play'; this.desc = null; I.locked = 0.15;
          const def = G.zone.def;
          G.hud.title(def.name, def.sub + '  ·  ' + G.fmtInt(def.depth[0]) + ' – ' + G.fmtInt(def.depth[1]) + ' m');
          G.story.zoneStart(G.zone.idx);
          G.emit('zoneStart', G.zone.idx);
        }
      }
    },

    update(rdt) {
      G.updateTweens(rdt);
      const frozen = G.menu.pausing();
      let dt = rdt * this.timescale;
      if (this.slowT > 0) { this.slowT -= rdt; dt *= 0.3; }
      if (this.stopT > 0) { this.stopT -= rdt; dt *= 0.04; }
      if (frozen) dt = 0;
      G.dt = dt;
      const st = this.state;
      if (!frozen) {
        if (st === 'play') this.updatePlay(dt, rdt);
        else if (st === 'descend') this.updateDescent(dt, rdt);
        else if (st === 'dead') {
          this.deadT += rdt;
          if (this.deadT > 2.7 && !G.menu.active()) { this.bank(false); G.menu.open('death'); }
        } else if (st === 'ending' && G.ending) G.ending.update(dt, rdt);
        this.updateWorld(dt);
      }
      G.menu.update(rdt);
      G.hud.update(rdt);
      G.cam.update(rdt); G.fx.update(rdt);
      // screen mood
      const zone = G.zone;
      const lum = min(1, G.lights.ambientLuma(G.cam.y));
      G.fx.bloomThr = 0.5 + 0.32 * lum; G.fx.bloom = 0.42 - 0.2 * lum;
      this.veilK = damp(this.veilK, frozen ? 1 : 0, 10, rdt);
      G.fx.blur = this.veilK * 0.5;
      const dz = pl.dead ? 0 : pl.hull <= 1 ? 0.5 + 0.2 * sin(G.time * 6) : pl.hull === 2 ? 0.2 : 0;
      this.dangerK = damp(this.dangerK, st === 'play' ? dz : 0, 5, rdt);
      G.fx.danger = this.dangerK;
      G.fx.sat = zone.def.sat * (1 - this.veilK * 0.35) * (st === 'dead' ? max(0.35, 1 - this.deadT * 0.4) : 1);
      this.fade = G.approach(this.fade, this.fadeTo, rdt * this.fadeRate);
      // sound bed
      G.music.update(rdt);
      const zi = zone.idx, surf = zi === 0 ? clamp(1 - (pl.y - zone.surfaceY) / 520, 0, 1) : 0;
      G.audio.amb.update(rdt, (zi + G.world.depth01(pl.y)) / 5, surf);
      G.world.update(3);
      if (G.debug) this.debugKeys();
    },

    debugKeys() {
      if (I.hit('F1')) this.god = !this.god;
      if (I.hit('F2') && this.state === 'play' && G.zone.idx < 4) this.startDescent();
      if (I.hit('F3')) pl.addXp(pl.xpNext);
      if (I.hit('F4') && G.zone.boss && !G.zone.boss.dead) { if (G.zone.boss.asleep) this.startBoss(G.zone.boss); else G.zone.boss.hp = 1; }
      if (I.hit('F6')) pl.pearls += 50;
      if (I.hit('F7')) { const A = G.zone.arena; pl.x = A.x; pl.y = A.gateY - 200; }
    },

    // ------------------------------------------------------------- drawing
    drawWorld() {
      const ctx = G.ctx, S = G.S, cam = G.cam;
      G.backdrop.draw(ctx);
      cam.apply(ctx, S);
      ctx.globalCompositeOperation = 'source-over';
      G.decor.drawBack(ctx);
      G.world.drawWalls(ctx);
      G.decor.draw(ctx);
      G.props.draw(ctx);
      if (this.tether || this.tetherK > 0.01) this.drawTether(ctx);
      G.pickups.draw(ctx);
      G.creatures.draw(ctx);
      if (G.companions) G.companions.draw(ctx);
      pl.draw(ctx);
      G.particles.drawLit(ctx);
      // light
      G.lights.render(pl.lampParams());
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'multiply';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(G.lightC, 0, 0, G.sceneC.width, G.sceneC.height);
      // things that are light
      ctx.globalCompositeOperation = 'lighter';
      cam.apply(ctx, S);
      G.world.drawVeins(ctx, 0.75 + 0.25 * sin(G.time * 1.3));
      G.lights.drawBeam(ctx, 0.15 * (1 - min(1, G.lights.ambientLuma(pl.y) * 1.25)));
      G.decor.drawGlow(ctx);
      G.props.drawGlow(ctx);
      G.pickups.drawGlow(ctx);
      G.creatures.drawGlow(ctx);
      if (G.companions) G.companions.drawGlow(ctx);
      pl.drawGlow(ctx);
      G.particles.drawGlow(ctx);
      G.sonar.draw(ctx);
      G.hazards.draw(ctx);
      if (this.state === 'play') { G.scan.draw(ctx); G.songHint(ctx); }
      ctx.globalCompositeOperation = 'source-over';
      G.shots.draw(ctx); G.eshots.draw(ctx);
      ctx.globalCompositeOperation = 'lighter';
      G.backdrop.drawFront(ctx);
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },

    drawTether(ctx) {
      const boat = G.props.find('boat');
      if (!boat) return;
      if (!this.tether) this.tetherK = max(0, this.tetherK - G.rdt * 1.4);
      const k = this.tetherK, ax = boat.x + 108, ay = boat.y - 70;
      const bx = this.tether ? pl.x : lerp(ax, pl.x, 0.2), by = this.tether ? pl.y - 13 : lerp(ay, G.zone.surfaceY + 20, 1 - k);
      ctx.globalAlpha = this.tether ? 1 : k;
      ctx.strokeStyle = '#2a2e36'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2 + sin(G.time * 1.4) * 4, (ay + by) / 2, bx, by); ctx.stroke();
      ctx.globalAlpha = 1;
    },

    drawUI() {
      const u = G.ui, US = G.US;
      u.setTransform(1, 0, 0, 1, 0, 0);
      u.clearRect(0, 0, G.uiC.width, G.uiC.height);
      u.setTransform(US, 0, 0, US, 0, 0);
      if (this.fade > 0.003) { u.fillStyle = `rgba(1,4,9,${this.fade})`; u.fillRect(0, 0, G.W, G.H); }
      const d = this.desc;
      if (d && (d.phase >= 1 || this.fade > 0.6)) {
        const k = clamp((d.t - 1.0) / 1.35, 0, 1), depth = lerp(d.from, d.to, G.ease.inOutCubic(k)), al = d.phase === 2 ? this.fade : clamp((d.t - 0.6) * 2, 0, 1);
        G.text(u, 'DESCENDING', G.W / 2, G.H / 2 - 54, { size: 11, font: 'mono', weight: 700, color: G.UI.DIM, align: 'center', spacing: 6, alpha: al });
        G.stext(u, G.fmtInt(depth) + ' M', G.W / 2, G.H / 2 - 30, 40, { align: 'center', color: '#ffffff', lw: 2.4, spacing: 3, alpha: al });
        G.text(u, G.ZONES[d.next].name, G.W / 2, G.H / 2 + 62, { size: 12, font: 'mono', weight: 700, color: G.UI.CYAN, align: 'center', spacing: 5, alpha: al * k });
      }
      G.hud.show = damp(G.hud.show, this.state === 'play' && !G.menu.pausing() ? 1 : 0, 8, G.rdt);
      G.hud.draw(u);
      G.menu.draw(u);
      if (G.ending && this.state === 'ending') G.ending.draw(u);
      G.hud.drawCursor(u, G.menu.active() || this.state !== 'play');
      if (G.debug) {
        G.text(u, `${this.fps.toFixed(0)} fps  upd ${this.ms.upd.toFixed(1)}  draw ${this.ms.draw.toFixed(1)}  ents ${G.ents.creatures.length}/${G.ents.eshots.length}  parts ${G.particles.count()}  decor ${G.decor.vis.length + G.decor.visBack.length}  ${this.state}${this.god ? '  GOD' : ''}`, 12, G.H - 8, { size: 11, font: 'mono', color: '#9fe' });
      }
    },

    frame(now) {
      const rdt = min(0.05, max(0.001, (now - this.last) / 1000)); this.last = now;
      G.rdt = rdt; G.time += rdt; G.frame++;
      this.fps += (1 / rdt - this.fps) * 0.05;
      I.update(rdt);
      const t0 = performance.now();
      this.update(rdt);
      const t1 = performance.now();
      this.drawWorld();
      G.post.render(G.sceneC);
      this.drawUI();
      const t2 = performance.now();
      this.ms.upd += (t1 - t0 - this.ms.upd) * 0.1; this.ms.draw += (t2 - t1 - this.ms.draw) * 0.1;
      I.endFrame();
    },

    boot() {
      G.meta.load();
      G.post.init();
      G.forceResize();
      G.debug = !!G.params.debug;
      if (G.params.zone !== undefined) this.debugJump(+G.params.zone, G.params.lv === undefined ? undefined : +G.params.lv);
      else this.toTitle();
      if (G.params.sheet !== undefined) { G.menu.stack.length = 0; G.menu.open('sheet', { zone: +G.params.sheet }); }
      this.last = performance.now();
      const loop = now => { requestAnimationFrame(loop); this.frame(now); };
      requestAnimationFrame(loop);
    },
  };

  G.on('death', () => { game.state = 'dead'; game.deadT = 0; G.music.set('dead', true); G.audio.muffle(0.7); G.hud.boss.ref = null; });
  G.on('dissuade', c => { if (G.run) G.run.dissuaded++; if (c.boss && game.bossOn) game.bossDown(c); });
  G.on('scan', (id, isNew) => { if (G.run) { G.run.scans++; if (isNew) G.run.fresh++; } });
  G.on('blur', () => { if (game.state === 'play' && !G.menu.active() && !G.player.dead && !G.params.nopause) G.menu.open('pause'); });

  window.addEventListener('load', () => game.boot());
})();
