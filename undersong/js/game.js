'use strict';
/* UNDERSONG — game: main loop, world update order, scene composition. (v0: straight into a zone.) */
(function () {
  const { sin, cos, min, max, abs, floor, hypot, PI } = Math;
  const { clamp, damp } = G;
  const I = G.input, pl = G.player;

  const game = G.game = {
    state: 'boot', god: !!G.params.god, timescale: 1, stopT: 0, paused: false, flowT: 0, seed: 1, zoneIdx: 0,
    ms: { upd: 0, draw: 0 },

    hitstop(t) { this.stopT = max(this.stopT, t); },

    enterZone(idx, seed) {
      G.clearEnts(); G.particles.clear();
      this.zoneIdx = idx;
      const zone = G.zone = G.genZone(idx, seed);
      G.backdrop.init(zone);
      pl.x = zone.start.x; pl.y = zone.start.y; pl.vx = pl.vy = 0;
      G.cam.x = pl.x; G.cam.y = pl.y;
      this.clampCam();
      G.world.prewarm(G.cam.x, G.cam.y);
      G.fx.tint = zone.def.tint; G.fx.sat = zone.def.sat;
      G.computeFlow(pl.x, pl.y);
      if (G.populate) G.populate(zone);
    },

    clampCam() {
      const cam = G.cam, zone = G.zone, hw = G.W / 2 / cam.zoom, hh = G.H / 2 / cam.zoom;
      const top = zone.idx === 0 ? zone.surfaceY - 250 : 0;
      cam.x = clamp(cam.x, hw, max(hw, zone.pxW - hw));
      cam.y = clamp(cam.y, top + hh, max(top + hh, zone.pxH - hh + 40));
    },

    updateWorld(dt) {
      G.lights.begin();
      pl.update(dt);
      if (G.creatures) G.creatures.update(dt);
      G.shots.update(dt); G.eshots.update(dt); G.pickups.update(dt);
      G.particles.update(dt); G.backdrop.update(dt); G.lights.update(dt);
      this.flowT -= dt;
      if (this.flowT <= 0) { this.flowT = 0.22; G.computeFlow(pl.x, pl.y); }
      // camera: lead toward the aim, a little toward velocity
      const cam = G.cam, lead = min(pl.aimDist, 320) * 0.2;
      const tx = pl.x + cos(pl.aim) * lead + pl.vx * 0.1, ty = pl.y + sin(pl.aim) * lead + pl.vy * 0.1;
      cam.x = damp(cam.x, tx, 5.5, dt); cam.y = damp(cam.y, ty, 5.5, dt);
      cam.zoom = damp(cam.zoom, cam.tzoom, 2.5, dt);
      this.clampCam();
    },

    update(rdt) {
      G.updateTweens(rdt);
      let dt = rdt * this.timescale;
      if (this.stopT > 0) { this.stopT -= rdt; dt *= 0.04; }
      G.dt = dt;
      if (this.state === 'play' && !this.paused) this.updateWorld(dt);
      G.cam.update(rdt); G.fx.update(rdt);
      if (G.zone) {      // bloom follows how dark the water is: in the deep, anything bright blooms
        const lum = min(1, G.lights.ambientLuma(G.cam.y));
        G.fx.bloomThr = 0.5 + 0.32 * lum; G.fx.bloom = 0.42 - 0.2 * lum;
      }
      G.world.update(3);
    },

    drawWorld() {
      const ctx = G.ctx, S = G.S, cam = G.cam, zone = G.zone;
      G.backdrop.draw(ctx);
      cam.apply(ctx, S);
      ctx.globalCompositeOperation = 'source-over';
      if (G.decor) G.decor.drawBack(ctx);
      G.world.drawWalls(ctx);
      if (G.decor) G.decor.draw(ctx);
      G.pickups.draw(ctx);
      if (G.creatures) G.creatures.draw(ctx);
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
      if (G.decor) G.decor.drawGlow(ctx);
      G.pickups.drawGlow(ctx);
      if (G.creatures) G.creatures.drawGlow(ctx);
      pl.drawGlow(ctx);
      G.particles.drawGlow(ctx);
      ctx.globalCompositeOperation = 'source-over';
      G.shots.draw(ctx); G.eshots.draw(ctx);
      ctx.globalCompositeOperation = 'lighter';
      G.backdrop.drawFront(ctx);
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },

    drawUI() {
      const u = G.ui, US = G.US;
      u.setTransform(1, 0, 0, 1, 0, 0);
      u.clearRect(0, 0, G.uiC.width, G.uiC.height);
      u.setTransform(US, 0, 0, US, 0, 0);
      // reticle
      const m = I.mouse;
      u.strokeStyle = 'rgba(220,250,255,0.9)'; u.lineWidth = 1.5;
      u.beginPath(); u.arc(m.x, m.y, 9, 0, G.TAU); u.stroke();
      u.fillStyle = '#fff'; u.fillRect(m.x - 1, m.y - 1, 2, 2);
      if (G.debug) {
        G.text(u, `upd ${this.ms.upd.toFixed(1)}ms  draw ${this.ms.draw.toFixed(1)}ms  parts ${G.particles.count()}  chunks ${G.zone.chunks.size}  depth ${G.world.depthAt(pl.y) | 0}m`, 12, 20, { size: 12, font: 'mono', color: '#9fe' });
      }
    },

    frame(now) {
      const rdt = min(0.05, max(0.001, (now - this.last) / 1000)); this.last = now;
      G.rdt = rdt; G.time += rdt; G.frame++;
      I.update(rdt);
      let t0 = performance.now();
      this.update(rdt);
      let t1 = performance.now();
      this.drawWorld();
      G.post.render(G.sceneC);
      this.drawUI();
      const t2 = performance.now();
      this.ms.upd += (t1 - t0 - this.ms.upd) * 0.1; this.ms.draw += (t2 - t1 - this.ms.draw) * 0.1;
      I.endFrame();
    },

    boot() {
      G.post.init();
      G.resize();
      G.debug = !!G.params.debug;
      pl.reset(0, 0);
      this.seed = G.params.seed ? +G.params.seed : (Math.random() * 1e9) | 0;
      this.enterZone(G.params.zone ? +G.params.zone : 0, this.seed);
      this.state = 'play';
      this.last = performance.now();
      const loop = now => { requestAnimationFrame(loop); this.frame(now); };
      requestAnimationFrame(loop);
    },
  };

  window.addEventListener('load', () => game.boot());
})();
