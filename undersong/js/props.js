'use strict';
/* UNDERSONG — props: supply pods, the six wrecks, the boat, the floating sunglasses, decoy lights,
   plus two world-space helpers: the sonar sweep and the "toward the song" trail. */
(function () {
  const { sin, cos, min, max, abs, atan2, sqrt, PI, hypot, floor } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU;
  const _v = { x: 0, y: 0 };

  // ------------------------------------------------------------------ supply pod
  G.defProp('pod', {
    r: 20, prompt: 'OPEN SUPPLY POD',
    init(pr) { pr.open = 0; pr.tilt = G.rr(-0.25, 0.25); },
    interact(pr, p) {
      pr.used = true; pr.open = 0.001;
      G.sfx('cache'); G.emit('pod', pr);
      G.particles.bubbles(pr.x, pr.y - 10, 14, 12, 120);
      G.particles.motes(pr.x, pr.y - 12, 12, '#ffd98a', { s0: 30, s1: 160, life: 0.8 });
      G.lights.flash(pr.x, pr.y, 260, '#ffe6a8', 0.5, 1);
      const n = pr.rare ? G.rand.int(8, 12) : G.rand.int(4, 7);
      for (let i = 0; i < n; i++) G.pickups.spawn('pearl', pr.x + G.rr(-8, 8), pr.y - 14, 1, G.rr(-120, 120), G.rr(-200, -60));
      if (G.rand() < 0.35) G.pickups.spawn('heal', pr.x, pr.y - 14, 1, G.rr(-60, 60), -140);
      G.run.pods++;
      G.after(0.75, () => { if (!p.dead) G.menu.open('levelup', { title: 'SUPPLY POD', sub: pr.rare ? 'SOMETHING GOOD IN THIS ONE' : 'TAKE ONE MODULE', opts: { minRarity: pr.rare ? 2 : 1 }, quiet: true, canSkip: true }); });
    },
    update(pr, dt) { if (pr.open > 0) pr.open = min(1, pr.open + dt * 3); },
    draw(pr, ctx) {
      const o = G.ease.outBack(pr.open);
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.tilt);
      // body
      const g = ctx.createLinearGradient(-18, 0, 18, 0); g.addColorStop(0, '#c9962a'); g.addColorStop(0.5, '#ffd24a'); g.addColorStop(1, '#b8801c');
      ctx.fillStyle = g; G.roundRect(ctx, -17, -12, 34, 26, 7); ctx.fill();
      ctx.fillStyle = '#2a2a30'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 8 - 3, 14); ctx.lineTo(i * 8 + 3, 14); ctx.lineTo(i * 8 + 9, 4); ctx.lineTo(i * 8 + 3, 4); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#5a4212'; ctx.lineWidth = 1.5; G.roundRect(ctx, -17, -12, 34, 26, 7); ctx.stroke();
      if (pr.open > 0) { ctx.fillStyle = '#1a1408'; G.roundRect(ctx, -13, -12, 26, 8, 3); ctx.fill(); }
      // lid, hinged left
      ctx.translate(-17, -12); ctx.rotate(-o * 1.9);
      ctx.fillStyle = '#ffe07a'; G.roundRect(ctx, 0, -9, 34, 11, 5); ctx.fill();
      ctx.strokeStyle = '#5a4212'; G.roundRect(ctx, 0, -9, 34, 11, 5); ctx.stroke();
      ctx.fillStyle = '#3a3a44'; ctx.fillRect(13, -12, 8, 4);
      ctx.restore();
    },
    glow(pr, ctx) {
      const t = G.time;
      if (!pr.used) { const b = (t * 0.9 + pr.ph) % 1; if (b < 0.16) G.drawGlow(ctx, pr.x + sin(pr.tilt) * 20, pr.y - 22, 20, '#ffcf6a', 0.9); G.drawGlow(ctx, pr.x, pr.y, 44, '#ffcf6a', 0.14 + 0.05 * sin(t * 2)); }
      else if (pr.open < 1) G.drawGlow(ctx, pr.x, pr.y - 12, 70, '#ffe6a8', 1 - pr.open);
    },
    light(pr) { if (!pr.used) G.lights.add(pr.x, pr.y, 90, '#ffcf6a', 0.35); },
  });

  // ------------------------------------------------------------------ the six who went first
  const FADED = ['#c9b56a', '#c98a5a', '#7fb0a4', '#b8849a', '#a9a8b8', '#6a78a8'];
  G.defProp('wreck', {
    r: 24, prompt: 'RECOVER LOG', scanXp: 8, scanTime: 1.5, viewR: 200,
    init(pr) { pr.codex = 'echo' + (pr.n + 1); pr.tilt = G.rr(0.5, 1.1) * (G.rand() < 0.5 ? -1 : 1); pr.sing = 0; },
    interact(pr, p) {
      pr.used = true; pr.sing = 1;
      G.run.noteMask |= 1 << pr.n; G.music.mask = G.run.noteMask;
      G.hud.notePop = pr.n; G.hud.notePopT = 1;
      G.sfx('songNote', { i: pr.n });
      for (let i = 0; i < 7; i++) G.particles.note(pr.x + G.rr(-14, 14), pr.y - 10 + G.rr(-8, 8), '#c9b8ff');
      G.lights.flash(pr.x, pr.y, 420, '#c9b8ff', 1.4, 1);
      G.fx.wave(pr.x, pr.y, { speed: 420, maxR: 520, str: 0.6 });
      G.particles.ring(pr.x, pr.y, 10, 160, '#c9b8ff', 0.9, 3);
      G.meta.data.echoes[pr.n] = 1; G.meta.catalog(pr.codex); G.scan.known[pr.codex] = true;
      G.story.playLog(pr.n);
      G.emit('wreck', pr.n);
      G.after(1.3, () => { if (!p.dead) G.menu.open('levelup', { title: 'WICK-' + (pr.n + 1), sub: 'IT KEPT SOMETHING FOR YOU', opts: { minRarity: 1 }, quiet: true, canSkip: true }); });
    },
    update(pr, dt) { pr.sing = max(0, pr.sing - dt * 0.25); },
    draw(pr, ctx) {
      const col = FADED[pr.n % 6], R = 13;
      ctx.save(); ctx.translate(pr.x, pr.y + 6); ctx.rotate(pr.tilt);
      ctx.strokeStyle = '#3a3440'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -R); ctx.quadraticCurveTo(5, -R - 8, 9, -R - 5); ctx.stroke();         // bent antenna
      for (let s = -1; s <= 1; s += 2) { ctx.fillStyle = '#343a46'; ctx.beginPath(); ctx.ellipse(s * 10.5, 9, 4.6, 3.3, s * 0.5, 0, TAU); ctx.fill(); }
      const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, R + 1);
      g.addColorStop(0, G.mixCss(col, '#ffffff', 0.25)); g.addColorStop(0.5, col); g.addColorStop(1, G.mixCss(col, '#20202a', 0.55));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#2a2630'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      // where the core used to be: a neat, empty socket
      ctx.fillStyle = '#0c0a12'; ctx.beginPath(); ctx.arc(-5, 4, 4.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(220,210,235,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-5, 4, 6.2, 0, TAU); ctx.stroke();
      if (pr.n > 0) { ctx.strokeStyle = 'rgba(30,20,40,0.5)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-11 + i * 3.4, -6 + (i & 1) * 2.4, 1.3, 0, TAU); ctx.stroke(); } }   // sucker rings
      // dark eye, cracked
      ctx.fillStyle = '#20262e'; ctx.beginPath(); ctx.arc(5, -2, 7.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3f5560'; ctx.beginPath(); ctx.arc(5, -2, 5.8, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#11161c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -6); ctx.lineTo(5, -2); ctx.lineTo(3, 2); ctx.moveTo(5, -2); ctx.lineTo(9, -1); ctx.stroke();
      // barnacles and a decal
      ctx.fillStyle = 'rgba(200,205,190,0.8)';
      for (let i = 0; i < 5; i++) { const a = 2.2 + i * 0.45; ctx.beginPath(); ctx.arc(cos(a) * 11, sin(a) * 11, 1.8, 0, TAU); ctx.fill(); }
      ctx.restore();
      G.text(ctx, String(pr.n + 1), pr.x + cos(pr.tilt + 2.2) * 7, pr.y + 8 + sin(pr.tilt + 2.2) * 7, { size: 7, font: 'mono', weight: 700, color: 'rgba(30,24,36,0.75)', align: 'center' });
    },
    glow(pr, ctx) {
      const t = G.time, a = pr.tilt - PI / 2, bx = pr.x + cos(a) * 20 + 6, by = pr.y + 6 + sin(a) * 20;
      const pulse = pr.used ? 0.35 + 0.15 * sin(t * 1.6 + pr.ph) : ((t * 0.5 + pr.ph) % 1 < 0.1 ? 0.9 : 0.06);
      G.drawGlow(ctx, bx, by, 12 + pr.sing * 30, '#c9b8ff', pulse + pr.sing);
      if (pr.sing > 0.02) G.drawGlow(ctx, pr.x, pr.y, 90, '#c9b8ff', pr.sing * 0.5);
    },
    light(pr) { G.lights.add(pr.x, pr.y, 80 + pr.sing * 200, '#c9b8ff', 0.2 + pr.sing * 0.6); },
  });
  const ECHO_NOTES = ['D', 'A', 'F', 'C', 'E', 'G'];
  G.story.LOGS.forEach((L, i) => G.codexAdd('echo' + (i + 1), { name: 'WICK-' + (i + 1), latin: 'call tone: ' + ECHO_NOTES[i], zone: min(4, i), kind: 'echo', size: L.tag.split('·')[1].trim(), notes: L.lines.join(' ') }));

  // ------------------------------------------------------------------ R/V Halcyon, seen from below
  G.defProp('boat', {
    r: 60, always: true, viewR: 500,
    update(pr, dt) { const z = G.zone; pr.y = z.surfaceY + G.backdrop.surfaceWave(pr.x, G.backdrop.t) * 0.7; pr.roll = sin(G.backdrop.t * 0.8) * 0.025; },
    draw(pr, ctx) {
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.roll || 0);
      // cabin + mast above the waterline
      ctx.fillStyle = '#f2ece0'; G.roundRect(ctx, -64, -74, 84, 40, 5); ctx.fill();
      ctx.fillStyle = '#5fb6d8'; for (let i = 0; i < 3; i++) { G.roundRect(ctx, -56 + i * 26, -66, 18, 14, 3); ctx.fill(); }
      ctx.strokeStyle = '#6a7078'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-34, -74); ctx.lineTo(-34, -128); ctx.stroke();
      ctx.fillStyle = '#ff7a59'; ctx.beginPath(); ctx.moveTo(-34, -128); ctx.lineTo(-10, -120); ctx.lineTo(-34, -112); ctx.fill();
      // a-frame crane over the stern for the tether
      ctx.strokeStyle = '#8a9098'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(70, -34); ctx.lineTo(108, -70); ctx.lineTo(120, -34); ctx.stroke();
      // hull
      ctx.fillStyle = '#c9412e';
      ctx.beginPath(); ctx.moveTo(-150, -34); ctx.lineTo(140, -34); ctx.quadraticCurveTo(128, 30, 96, 34); ctx.lineTo(-104, 34); ctx.quadraticCurveTo(-140, 24, -150, -34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f2ece0'; ctx.fillRect(-148, -34, 286, 9);
      ctx.fillStyle = '#7a2218'; ctx.beginPath(); ctx.moveTo(-134, 8); ctx.lineTo(126, 8); ctx.quadraticCurveTo(118, 31, 96, 34); ctx.lineTo(-104, 34); ctx.quadraticCurveTo(-126, 28, -134, 8); ctx.fill();
      ctx.fillStyle = '#3a3a40'; ctx.fillRect(-126, 30, 10, 16);
      ctx.restore();
      G.text(ctx, 'HALCYON', pr.x - 96, pr.y - 12, { size: 9, font: 'mono', weight: 700, color: 'rgba(255,255,255,0.85)', spacing: 2 });
    },
  });

  // ------------------------------------------------------------------ floating sunglasses
  G.defProp('shades', {
    r: 16, always: true,
    update(pr, dt, p) {
      const z = G.zone;
      pr.y = z.surfaceY + G.backdrop.surfaceWave(pr.x, G.backdrop.t) + 3;
      if (!pr.used && pr.pd < 34 && !p.dead) {
        pr.used = true; pr.dead = true;
        p.shades = true; p.happy = 2;
        G.meta.data.shades = true; G.meta.data.shadesOn = true; G.meta.save();
        G.sfx('newSpecies'); G.particles.ring(pr.x, pr.y, 6, 60, '#ff7a59', 0.5, 3);
        G.particles.motes(pr.x, pr.y, 14, '#ffb48a', { s0: 30, s1: 160, life: 0.9 });
        G.hud.toast('Floating Sunglasses', 'they float. obviously.', { tag: 'FOUND', color: '#ff9a7a', life: 5 });
        G.emit('shades');
      }
    },
    draw(pr, ctx) {
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(sin(G.backdrop.t * 1.3 + pr.ph) * 0.2);
      ctx.fillStyle = '#10141c'; ctx.strokeStyle = '#ff7a59'; ctx.lineWidth = 1.6;
      for (let s = -1; s <= 1; s += 2) { G.roundRect(ctx, s * 9 - 7.5, -5, 15, 10, 3.5); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-1.5, -2.5); ctx.lineTo(1.5, -2.5); ctx.stroke();
      ctx.restore();
    },
    glow(pr, ctx) { G.drawGlow(ctx, pr.x, pr.y, 26 + sin(G.time * 3) * 4, '#ff9a6a', 0.35); },
  });

  // ------------------------------------------------------------------ decoy light (Afterglow / Borrowed Lure)
  G.decoy = null;
  G.defProp('decoy', {
    r: 13, always: true,
    init(pr) {
      pr.life = pr.life || 2.6; pr.vx = 0; pr.vy = 0; pr.inv = 0; pr.dashT = 0; pr.st = G.player.st; pr.aim = 0; pr.hurt = () => false;
      if (G.decoy) G.decoy.dead = true;
      G.decoy = pr;
    },
    update(pr, dt) {
      pr.life -= dt;
      if (pr.stunR) for (const c of G.ents.creatures) if (c.hostile && !c.boss && !c.fleeing && G.dist2(c.x, c.y, pr.x, pr.y) < pr.stunR * pr.stunR) c.stun = max(c.stun, 0.4);
      if (G.rand() < dt * 14) G.particles.mote(pr.x + G.rr(-8, 8), pr.y + G.rr(-8, 8), G.rr(-10, 10), G.rr(-30, -8), '#fff3d6', G.rr(3, 6), 0.6, 0, 1);
      if (pr.life <= 0) { pr.dead = true; if (G.decoy === pr) G.decoy = null; G.particles.ring(pr.x, pr.y, 20, 4, '#fff3d6', 0.25, 2); }
    },
    glow(pr, ctx) {
      const k = min(1, pr.life * 2), t = G.time;
      G.drawGlow(ctx, pr.x, pr.y, 34 + sin(t * 10) * 4, '#fff3d6', 0.8 * k);
      ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(pr.x, pr.y, 13, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      if (pr.stunR) { ctx.globalAlpha = 0.25 * k; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.stunR, t, t + TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    },
    light(pr) { G.lights.add(pr.x, pr.y, 220, '#fff3d6', min(1, pr.life)); },
  });
  G.on('dash', p => { if (p.st.decoy) G.props.add('decoy', p.x, p.y, { life: 2.2 + p.st.decoy * 0.6 }); });
  G.on('flare', p => { if (p.st.lureFlare) G.props.add('decoy', p.x, p.y, { life: 4, stunR: 170 }); });
  G.on('dashEnd', p => {
    if (!p.st.punch) return;
    const R = 96;
    G.particles.ring(p.x, p.y, 10, R, '#fff6dc', 0.3, 4); G.particles.bubbles(p.x, p.y, 12, 20, 160);
    G.fx.wave(p.x, p.y, { speed: 700, maxR: 220, str: 0.8 }); G.cam.shake(0.25); G.sfx('crack', { x: p.x, y: p.y });
    G.lights.flash(p.x, p.y, 260, '#fff6dc', 0.2, 1);
    for (const c of G.ents.creatures) if (c.hittable && G.dist2(c.x, c.y, p.x, p.y) < (R + c.r) * (R + c.r)) G.damageCreature(c, p.st.dmg * 3.2, { x: p.x, y: p.y, vx: c.x - p.x, vy: c.y - p.y, aoe: true, knock: 2.4 });
    for (const s of G.ents.eshots) if (G.dist2(s.x, s.y, p.x, p.y) < R * R) G.eshots.kill(s);
  });

  // ------------------------------------------------------------------ sonar sweep
  const SN = G.sonar = {
    pings: [], trail: [], trailT: 0,
    ping(x, y) {
      this.pings.push({ x, y, r: 0, t: 0, max: 1050, hit: new Set() });
      // trace the way toward the song from here
      this.trail.length = 0; this.trailT = 3.4;
      let px = x, py = y;
      for (let i = 0; i < 26; i++) {
        if (!G.exitDir(px, py, _v)) break;
        px += _v.x * 34; py += _v.y * 34;
        this.trail.push(px, py);
      }
    },
    update(dt) {
      const p = G.player, st = p.st;
      this.trailT = max(0, this.trailT - dt);
      for (let i = this.pings.length - 1; i >= 0; i--) {
        const s = this.pings[i];
        s.t += dt; s.r = min(s.max, s.r + 980 * dt);
        for (const c of G.ents.creatures) {
          if (c.dead || c.fleeing || s.hit.has(c.uid)) continue;
          if (G.dist2(c.x, c.y, s.x, s.y) < s.r * s.r) {
            s.hit.add(c.uid); c.echo = 2.4;
            if (st.sonarDmg && c.hittable && !c.passive) { G.damageCreature(c, 12 * st.sonarDmg, { x: s.x, y: s.y, vx: c.x - s.x, vy: c.y - s.y, aoe: true }); c.mark = max(c.mark, 5); }
          }
        }
        for (const pr of G.ents.props) if (!pr.echo && pr.def.prompt && !pr.used && G.dist2(pr.x, pr.y, s.x, s.y) < s.r * s.r) pr.echo = 3;
        if (s.t > 2.7) this.pings.splice(i, 1);
      }
      for (const c of G.ents.creatures) if (c.echo > 0) c.echo -= dt;
      for (const pr of G.ents.props) if (pr.echo > 0) pr.echo -= dt;
    },
    draw(ctx) {       // glow pass, world transform
      const t = G.time;
      for (const s of this.pings) {
        const fade = max(0, 1 - s.t / 2.7), R = max(20, s.r);
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
        const front = max(0.01, (R - 46) / R);
        g.addColorStop(0, `rgba(120,230,255,${0.34 * fade})`); g.addColorStop(max(0.005, front - 0.12), `rgba(120,230,255,${0.38 * fade})`);
        g.addColorStop(front, `rgba(200,250,255,${min(1, 0.9 * fade + (s.r < s.max ? 0.3 : 0))})`); g.addColorStop(1, 'rgba(120,230,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
        G.world.strokeOutlines(ctx);
        if (s.r < s.max) { ctx.globalAlpha = 0.5 * (1 - s.r / s.max); ctx.strokeStyle = '#c8faff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      }
      // echoes: outlines of whatever the ping found
      ctx.lineWidth = 1.6;
      for (const c of G.ents.creatures) {
        if (!(c.echo > 0) || c.dead || !G.cam.sees(c.x, c.y, c.r + 20)) continue;
        const a = min(1, c.echo * 0.8);
        ctx.globalAlpha = a; ctx.strokeStyle = c.hostile ? '#ff9a8a' : '#8ff0ff';
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r + 5, 0, TAU); ctx.stroke();
        if (c.hostile) { ctx.beginPath(); ctx.moveTo(c.x - 4, c.y - c.r - 12); ctx.lineTo(c.x, c.y - c.r - 18); ctx.lineTo(c.x + 4, c.y - c.r - 12); ctx.stroke(); }
      }
      for (const pr of G.ents.props) {
        if (!(pr.echo > 0) || pr.dead) continue;
        const a = min(1, pr.echo * 0.8), r = pr.r + 10 + sin(t * 4) * 2;
        ctx.globalAlpha = a; ctx.strokeStyle = '#ffd98a';
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y - r); ctx.lineTo(pr.x + r, pr.y); ctx.lineTo(pr.x, pr.y + r); ctx.lineTo(pr.x - r, pr.y); ctx.closePath(); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // the trail toward the song
      if (this.trailT > 0 && this.trail.length) {
        const n = this.trail.length >> 1, age = 3.4 - this.trailT;
        for (let i = 0; i < n; i++) {
          const show = clamp(age * 9 - i, 0, 1), a = show * min(1, this.trailT) * (0.9 - i / n * 0.5);
          if (a > 0.01) G.drawGlow(ctx, this.trail[i * 2], this.trail[i * 2 + 1], 7 + sin(t * 5 - i * 0.6) * 2, '#ffd98a', a);
        }
      }
    },
  };
  G.on('sonar', p => SN.ping(p.x, p.y));

  // a small always-on pointer: which way is the song?
  G.songHint = function (ctx) {
    const p = G.player;
    if (p.dead || !G.settings.hints || G.creatures.threat > 1.5) return;
    if (!G.exitDir(p.x, p.y, _v)) return;
    const a = atan2(_v.y, _v.x), r = 34, t = G.time, x = p.x + cos(a) * r, y = p.y + sin(a) * r;
    ctx.globalAlpha = 0.28 + 0.14 * sin(t * 3); ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + cos(a + 2.5) * 6, y + sin(a + 2.5) * 6); ctx.lineTo(x + cos(a) * 4, y + sin(a) * 4); ctx.lineTo(x + cos(a - 2.5) * 6, y + sin(a - 2.5) * 6); ctx.stroke();
    ctx.globalAlpha = 1;
  };
})();
