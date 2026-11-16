'use strict';
/* UNDERSONG — THE CURATOR. A very large octopus at the bottom of the world, and the last thing
   between the probe and the six cores it has been keeping.

   The fight runs on the music's clock: arms come down on the beat, and each core fires on its
   own note — unless you found that probe's wreck on the way down, in which case its voice knows
   you and takes your side instead. Nothing here is killed. At zero it simply stops. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, PI, hypot, floor, pow } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, kit = G.kit, ai = G.ai;
  const BEAT = 60 / 116;
  let active = null;

  const moodCol = (c, shade) => G.mixCss(G.mix('#5a4aa8', '#b8364e', c.mood), shade ? '#140a24' : '#ffffff', shade ? 0.45 : 0.0);

  function slam(c, x, y, delayBeats, r) {
    const arm = c.arms[c.slamI++ % 4 + 2];       // the four inner arms do the hitting
    arm.mode = 'slam'; arm.t = 0; arm.delay = delayBeats * BEAT; arm.gx = x; arm.gy = y;
    G.hazards.add({ x, y, r: r || 62, delay: arm.delay, color: '#ffb0c8', dmg: 1, onFire() { G.particles.dust(x, y, 8, '#b0a8c8', 110); G.particles.bubbles(x, y, 8, 20, 160); G.sfx('crack', { x, y }); } });
  }

  function onBeat(c) {
    const p = G.player, A = G.zone.arena, ph = c.phase, b = c.beat++;
    if (c.calm || p.dead) return;
    c.pulse = 1;
    if (c.stagger > 0) return;
    // slams
    if (ph === 1) { if (b % 2 === 0) slam(c, p.x, p.y, 2, 60); }
    else if (ph === 2) { if (b % 2 === 0) { slam(c, p.x, p.y, 2, 64); slam(c, clamp(p.x + p.vx * 0.6 + G.rr(-60, 60), A.x - A.rx * 0.8, A.x + A.rx * 0.8), p.y + p.vy * 0.6 + G.rr(-40, 40), 2.5, 58); } }
    else { slam(c, p.x + p.vx * 0.25, p.y + p.vy * 0.25, 1.75, 62); if (b % 4 === 2) slam(c, p.x + G.rr(-150, 150), p.y + G.rr(-110, 110), 2.25, 70); }
    // sweep
    if (ph >= 2 && b % 16 === 8) {
      const arm = c.arms[b % 32 === 8 ? 1 : 6], dir = arm === c.arms[1] ? 1 : -1;
      arm.mode = 'sweep'; arm.t = 0; arm.dir = dir; arm.sy = G.zone.shelf.y - 150 - G.rr(0, 120);
      G.sfx('telegraph', { x: c.x, y: c.y });
    }
    // it throws its treasures, and looks sorry about it
    if (ph >= 2 && b % 8 === 4) {
      for (let i = 0; i < (ph === 3 ? 4 : 3); i++) {
        const a = atan2(p.y - c.y, p.x - c.x) + (i - 1) * 0.42 + G.rr(-0.1, 0.1);
        G.eshots.fire(c.x + cos(a) * 70, c.y + sin(a) * 70, cos(a) * 250, sin(a) * 250, { r: 9, color: ['#5ff0d8', '#ffb45a', '#ff8ab0', '#9a8cff'][i & 3], life: 5.5, bounce: 3 });
      }
      G.sfx('spit', { x: c.x, y: c.y }); c.blink = 0.4;
    }
    // reach for the probe
    if (ph === 3 && b % 12 === 6) { const arm = c.arms[b % 24 === 6 ? 0 : 7]; if (arm.mode === 'idle') { arm.mode = 'grab'; arm.t = 0; arm.hold = 0; G.sfx('squelch', { x: c.x, y: c.y }); } }
  }

  function onMotif(c, i) {
    const zone = G.zone, core = zone.cores && zone.cores[i];
    if (!core || c.calm) return;
    const col = G.NOTE_COLORS[i], found = !!(G.run.noteMask & (1 << i));
    if (found) {
      // a voice you carried down: it sweeps the water clean around the shelf and nudges its keeper
      G.particles.ring(core.x, core.y, 12, 250, col, 0.55, 3);
      for (const s of G.ents.eshots) if (G.dist2(s.x, s.y, core.x, core.y) < 250 * 250) G.eshots.kill(s);
      G.particles.note(core.x, core.y - 14, col);
      if (c.hittable) { G.bolt(core.x, core.y, c.x, c.y + 30, col); G.damageCreature(c, 34, { x: c.x, y: c.y + 40, vx: 0, vy: -1, aoe: true, knock: 0 }); }
    } else {
      const n = c.phase === 1 ? 8 : c.phase === 2 ? 10 : 12;
      G.eshots.ring(core.x, core.y - 8, n, 122 + c.phase * 8, { r: 5, color: col, life: 6.5 }, i * 0.4 + c.beat * 0.13);
      G.sfx('spit', { x: core.x, y: core.y });
    }
  }

  G.on('beat', () => { if (active) { active.extT = 1.4; onBeat(active); } });
  G.on('motif', i => { if (active) { active.extM = 4; onMotif(active, i); } });

  G.defCreature('curator', {
    boss: true, final: true, hostile: true, r: 58, hp: 5400, dmg: 0, xp: 0, mass: 999, fixed: true, noSep: true, flareResist: true, viewR: 1000, color: '#c9a0ff', scanTime: 2.2, scanXp: 20,
    title: 'THE CURATOR', latin: 'Enteroctopus sp.', epithet: 'keeper of the six', music: 'curator', zoom: 0.82, showR: 150, showY: -40,
    init(c) {
      c.hx = c.x; c.hy = c.y; c.rise = c.specimen ? 1 : 0; c.arms = [];
      for (let i = 0; i < 8; i++) {
        const ch = kit.chain(c.specimen ? 9 : 20, c.specimen ? 16 : 31);
        kit.chainSet(ch, c.x, c.y, -PI / 2);
        c.arms.push({ ch, a: PI / 2 + (i - 3.5) * 0.31, len: c.specimen ? 105 : 300 + (i % 2) * 50, tx: c.x, ty: c.y + 200, gx: 0, gy: 0, mode: 'idle', t: 0, ph: i * 1.7, glow: 0 });
      }
      c.phase = 1; c.beat = 0; c.beatT = 0; c.extT = 0; c.extM = 0; c.mPend = -1; c.mT = 0; c.mood = 0; c.slamI = 0; c.asleep = !c.specimen; c.calm = false; c.pulse = 0; c.blink = 0; c.stagger = 0;
      c.touch = false; c.hittable = false; c.hidden = !c.specimen; c.eyes = c.specimen ? 1 : 0;
    },
    wake(c) { c.hittable = true; c.hidden = false; active = c; c.beat = 0; c.beatT = 0; c.stagger = 1.6; },
    // at zero it does not flee: it stops
    onDown(c) {
      c.calm = true; c.hittable = false; c.hp = 0; active = null;
      for (const a of c.arms) a.mode = 'idle';
      for (const s of G.ents.eshots) G.eshots.kill(s);
      G.hazards.list.length = 0;
      G.game.bossOn = false; G.run.bosses++;
      G.hud.boss.ref = null;
      G.game.hitstop(0.35); G.game.slowT = 1.6; G.cam.shake(0.5); G.fx.punch(0.6, 0.35);
      G.sfx('bossDown'); G.music.set('garden', true);
      G.after(3.2, () => { if (G.ending) G.ending.start(c); });
      return false;
    },
    onFlare() { return false; },
    show(c) { c.mood = 0.25 + 0.25 * sin(c.t * 0.4); c.eyes = 1; },
    think(c, dt, p) {
      const zone = G.zone, A = zone.arena;
      if (c.specimen) return;
      c.pulse = max(0, c.pulse - dt * 3); c.blink = max(0, c.blink - dt);
      if (c.asleep) {
        // watching from the dark; comes out when the probe goes near the shelf
        c.eyes = damp(c.eyes, c.pd < 760 ? 1 : 0, 1.5, dt);
        if (!p.dead && zone.shelf && hypot(p.x - zone.shelf.x, p.y - zone.shelf.y) < 250 && G.game.state === 'play') { zone.boss = c; G.game.startBoss(c); }
        return;
      }
      c.rise = damp(c.rise, 1, 1.6, dt); c.eyes = 1;
      if (c.calm) { c.mood = damp(c.mood, 0, 0.8, dt); return; }
      c.stagger = max(0, c.stagger - dt);
      // phases
      const f = c.hp / c.maxHp, want = f < 0.34 ? 3 : f < 0.67 ? 2 : 1;
      if (want > c.phase) {
        c.phase = want; c.stagger = 2.2;
        G.sfx('roar'); G.cam.shake(0.6); G.fx.punch(0.5, 0.2);
        for (let i = 0; i < 12; i++) G.particles.ink(c.x + G.rr(-160, 160), c.y + G.rr(-40, 140), G.rr(50, 90), G.rr(2.5, 4), G.rr(-40, 40), G.rr(10, 70));
        for (const s of G.ents.eshots) G.eshots.kill(s);
        G.fx.wave(c.x, c.y, { speed: 700, maxR: 1100, str: 1.1 });
      }
      c.mood = damp(c.mood, c.phase === 1 ? 0.25 : c.phase === 2 ? 0.6 : 1, 1.2, dt);
      // the clock: follow the music if it is playing, keep our own time if not
      c.extT -= dt; c.extM -= dt;
      if (c.extT <= 0) {
        c.beatT += dt;
        if (c.beatT >= BEAT) { c.beatT -= BEAT; if (c.extM <= 0) { const k = c.beat % 8; if (k < 6) { c.mPend = k; c.mT = BEAT * 0.5; } } onBeat(c); }
      }
      if (c.mPend >= 0) { c.mT -= dt; if (c.mT <= 0) { const k = c.mPend; c.mPend = -1; if (G.zone.cores && G.zone.cores[k]) G.PROPS.core.pulse(G.zone.cores[k]); onMotif(c, k); } }
    },
    anim(c, dt) {
      const p = G.player, zone = G.zone, t = c.t;
      c.x = c.hx; c.y = c.hy - (1 - c.rise) * 170 + sin(t * 0.8) * 5;
      const A = zone && zone.arena;
      for (let i = 0; i < c.arms.length; i++) {
        const arm = c.arms[i];
        arm.t += dt; arm.glow = max(0, arm.glow - dt * 2);
        let gx, gy, rate = 3;
        const slack = c.calm ? 0.55 : 1;
        if (arm.mode === 'slam') {
          const u = arm.t / arm.delay;
          if (u < 0.82) { gx = arm.gx + (c.x - arm.gx) * 0.25; gy = arm.gy - 170; rate = 6; arm.glow = max(arm.glow, u); }
          else { gx = arm.gx; gy = arm.gy; rate = 34; arm.glow = 1; }
          if (arm.t > arm.delay + 0.45) arm.mode = 'idle';
        } else if (arm.mode === 'sweep' && A) {
          const T0 = 1.0, T1 = 1.5, x0 = A.x - arm.dir * A.rx * 0.86, x1 = A.x + arm.dir * A.rx * 0.86;
          if (arm.t < T0) { gx = x0; gy = arm.sy; rate = 5; arm.glow = max(arm.glow, arm.t / T0); }
          else {
            const u = min(1, (arm.t - T0) / T1); gx = lerp(x0, x1, u); gy = arm.sy + sin(u * PI) * 60; rate = 22; arm.glow = 1;
            if (!p.dead && kit.ropeNear(arm.ch, p.x, p.y, 30, 9)) p.hurt(1, gx, gy);
            if (u >= 1) arm.mode = 'idle';
          }
        } else if (arm.mode === 'grab') {
          arm.glow = max(arm.glow, 0.6);
          if (arm.hold > 0) {
            arm.hold += dt; gx = p.x; gy = p.y; rate = 40;
            const dx = c.x - p.x, dy = c.y + 60 - p.y, d = hypot(dx, dy) || 1;
            p.ax += dx / d * 1300; p.ay += dy / d * 1300; p.slow = 0.3;
            G.hud.hint(`${G.input.label('dash')}  BREAK FREE`, 0.3);
            if (p.dashT > 0 || p.dead) { arm.mode = 'idle'; arm.hold = 0; G.particles.bubbles(p.x, p.y, 10, 10, 140); G.sfx('pop', { x: p.x, y: p.y }); }
            else if (arm.hold > 2) { p.inv = 0; p.hurt(1, gx, gy); arm.mode = 'idle'; arm.hold = 0; }
          } else {
            const dx = p.x - arm.tx, dy = p.y - arm.ty, d = hypot(dx, dy) || 1;
            gx = arm.tx + dx / d * min(d, 230 * dt * 12); gy = arm.ty + dy / d * min(d, 230 * dt * 12); rate = 12;
            if (d < 24 && p.dashT <= 0 && !p.dead) { arm.hold = 0.001; G.sfx('squelch', { x: p.x, y: p.y }); G.cam.shake(0.15); }
            if (arm.t > 4.5) arm.mode = 'idle';
          }
        } else {
          const L = arm.len * slack, sw = sin(t * 0.7 + arm.ph) * 0.16;
          gx = c.x + cos(arm.a + sw) * L; gy = c.y + sin(arm.a + sw) * L * (c.calm ? 0.8 : 1) + sin(t * 1.1 + arm.ph) * 22;
        }
        arm.tx = damp(arm.tx, gx, rate, dt); arm.ty = damp(arm.ty, gy, rate, dt);
        const ba = arm.a, bx = c.x + cos(ba) * 40, by = c.y + 38 + sin(ba) * 12;
        kit.reach(arm.ch, bx, by, arm.tx, arm.ty, c.specimen ? 0.6 : 1.6, t + arm.ph);
      }
    },
    draw(c, ctx) {
      const A = c.alpha, t = c.t, p = G.player;
      if (c.rise < 0.02 && !c.specimen) return;
      const body = moodCol(c), dark = moodCol(c, true), pale = G.mixCss(body, '#ffe6f2', 0.6);
      // arms behind the head
      for (let i = 0; i < c.arms.length; i++) kit.tentacle(ctx, c.arms[i].ch, c.specimen ? 20 : 40, c.specimen ? 3 : 6, i & 1 ? dark : body, pale, A, 1);
      ctx.globalAlpha = A;
      const x = c.x, y = c.y, br = 1 + sin(t * 1.3) * 0.03 + c.pulse * 0.04;
      // mantle
      let g = ctx.createRadialGradient(x - 18, y - 96, 8, x, y - 70, 120);
      g.addColorStop(0, G.mixCss(body, '#ffffff', 0.25)); g.addColorStop(0.6, body); g.addColorStop(1, dark);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y - 78, 74 * br, 92 * br, 0, 0, TAU); ctx.fill();
      // spots that breathe
      ctx.fillStyle = G.css(pale, 0.3);
      for (let i = 0; i < 16; i++) { const a = i * 2.39, r = 16 + (i * 13) % 52; ctx.beginPath(); ctx.arc(x + cos(a) * r, y - 82 + sin(a) * r * 1.2, 3 + 2 * sin(t * 1.5 + i), 0, TAU); ctx.fill(); }
      // head
      g = ctx.createRadialGradient(x - 10, y - 16, 6, x, y, 84);
      g.addColorStop(0, G.mixCss(body, '#ffffff', 0.2)); g.addColorStop(0.7, body); g.addColorStop(1, dark);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y + 6, 80, 54, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x + 46, y + 40, 12, 8, 0.5, 0, TAU); ctx.fill();   // siphon
      ctx.globalAlpha = 1;
      // eyes: gold, with the sideways bar of an octopus pupil. Lids say how it feels.
      const look = atan2(p.y - y, p.x - x), lid = c.calm ? 0.42 : c.blink > 0 ? 0.9 : c.stun > 0 ? 0.7 : 0.14 + (1 - c.mood) * 0.12;
      for (let s = -1; s <= 1; s += 2) {
        const ex = x + s * 36 + cos(look) * 3, ey = y - 4 + sin(look) * 3;
        ctx.globalAlpha = A;
        ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(ex, ey, 19, 16, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.ellipse(ex, ey, 15, 12.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#15101c'; G.roundRect(ctx, ex - 9 + cos(look) * 2, ey - 3 + sin(look) * 2, 18, 6, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(ex - 5, ey - 5, 2.4, 0, TAU); ctx.fill();
        const th = Math.acos(1 - 2 * min(1, lid)); ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(ex, ey, 16, 13.5, 0, -PI / 2 - th, -PI / 2 + th); ctx.closePath(); ctx.fill();
        if (!c.calm && c.mood > 0.5) { ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(ex - s * 17, ey - 19 + (c.mood - 0.5) * 8); ctx.lineTo(ex + s * 14, ey - 13 + (c.mood - 0.5) * 14); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    },
    glow(c, ctx) {
      const t = c.t, x = c.x, y = c.y, A = c.alpha;
      if (c.asleep) {     // two gold points in the dark
        if (c.eyes > 0.02) for (let s = -1; s <= 1; s += 2) G.drawGlow(ctx, c.hx + s * 36, c.hy - 120, 12, '#ffd98a', c.eyes * (0.5 + 0.2 * sin(t * 1.3)));
        return;
      }
      for (let s = -1; s <= 1; s += 2) G.drawGlow(ctx, x + s * 36, y - 4, 26, '#ffd98a', 0.4 * A);
      G.drawGlow(ctx, x, y - 60, 170, moodCol(c), (0.16 + c.pulse * 0.12) * A);
      for (const arm of c.arms) {
        const ch = arm.ch, k = arm.glow;
        for (let i = 4; i < ch.n; i += 2) G.drawGlow(ctx, ch.x[i], ch.y[i], 9 + k * 8, k > 0.3 ? '#ffb0c8' : '#7fd8ff', (0.2 + 0.2 * sin(t * 4 - i * 0.5 + arm.ph) + k * 0.6) * A);
        if (arm.mode === 'sweep' && arm.t < 1) { const AA = G.zone.arena; ctx.globalAlpha = 0.25 + 0.4 * arm.t; ctx.strokeStyle = '#ffb0c8'; ctx.lineWidth = 3; ctx.setLineDash([16, 12]); ctx.lineDashOffset = -t * 120; ctx.beginPath(); ctx.moveTo(AA.x - AA.rx * 0.86, arm.sy); ctx.quadraticCurveTo(AA.x, arm.sy + 120, AA.x + AA.rx * 0.86, arm.sy); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
      }
    },
    light(c) { if (!c.asleep) G.lights.add(c.x, c.y - 30, 520, c.calm ? '#c9b8ff' : '#e0a8c8', 0.5); },
  });

  G.codexAdd('curator', { name: 'The Curator', latin: 'Enteroctopus sp., undescribed', zone: 4, kind: 'fauna', boss: true, size: 'arm span 12 m', notes: 'Three hearts, nine brains, and nobody to talk to. Octopuses collect things: shells, bottles, anything that catches the light. This one found six small machines dying alone in the dark, and carried each of them down to the one warm place it knew, and kept them. It fought me because it thought I had come to take them away. I would have fought me too.' });
})();
