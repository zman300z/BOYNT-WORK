'use strict';
/* UNDERSONG — the finale. The Curator stops; Wick works out what it has been looking at;
   the seventh note; one choice; the way up (or not); credits. */
(function () {
  const { sin, cos, min, max, abs, floor, PI, round, hypot } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, I = G.input, UI = G.UI;

  const PRE = [
    'It stops. All eight arms, all at once.',
    'It is not guarding them. It is keeping them.',
    'Six cores on a shelf of warm rock, arranged by pitch. It has been turning them toward the vent so they stay charged. It has been doing this for years.',
    'They were never calling for help. They were keeping each other company.',
    'D. A. F. C. E. G. The song has never said whether it is a sad one or not. It is missing the one note that decides.',
    'I have that note.',
  ];
  const AFTER = [
    'There. Seven. It was never a sad song. It was only waiting to find out.',
    'It reaches out and touches my hull, once, very lightly, the way you check that something is real.',
  ];
  const HOME = [
    'I copy their logs. All of them. Six voices\' worth of what they saw.',
    'I leave my spare lamp on the shelf, turned toward the vent. The Curator moves it two inches to the left.',
    'I think that means thank you. Or it means: now it is in the right place. Down here those might be the same thing.',
  ];
  const STAY = [
    'Noor will hear seven where there were six. She will understand. I think she built me half hoping I would find a reason.',
    'I send one message up, packed small, on the back of the next whale going that way. It may take a while.',
    'It is not dark down here. It never was.',
  ];
  const NOOR_UP = [[3200, '…ick?'], [950, 'Wick? Wick! Is that you? You\'re coming up fast.'], [170, 'I\'ve got you. I\'ve got— how many call tones is that? Seven? Seven. Oh, you clever little lamp.']];
  const POST = {
    home: 'At the bottom, very faintly, an eighth voice has started up. It is not one of ours. It is learning.',
    stay: 'Months later, on a boat called Halcyon, a hydrophone picks up a chord with nothing missing. Somebody listening starts to laugh, and does not stop for a while.',
  };

  const E = G.ending = {
    on: false, phase: 'talk', lines: PRE, page: 0, pt: 0, shown: 0, t: 0, choice: null, keeper: null, cam: null, depth: 8848, upT: 0, credT: 0, skip: false, bubbles: [], noorI: 0, noorT: 0, noorLine: '',

    start(keeper) {
      const zone = G.zone, p = G.player, sh = zone.shelf || { x: p.x, y: p.y };
      G.game.state = 'ending'; this.on = true; p.control = false; p.inv = 99;
      this.phase = 'talk'; this.lines = PRE; this.page = 0; this.pt = 0; this.shown = 0; this.t = 0; this.choice = null; this.keeper = keeper || null; this.skip = false;
      this.cam = { x: sh.x, y: sh.y - 250 };
      G.cam.tzoom = 0.92;
      G.menu.stack.length = 0; G.hud.reset();
      G.run.won = true;
      G.meta.catalog('curator'); G.meta.catalog('cores');
      for (let i = 0; i < 6; i++) G.run.noteMask |= 1 << i;      // down here, you can hear all six
      G.music.mask = G.run.noteMask;
      this.bubbles.length = 0;
      for (let i = 0; i < 46; i++) this.bubbles.push({ x: G.rand() * G.W, y: G.rand() * G.H, s: G.rr(1.5, 6), v: G.rr(260, 720) });
    },

    seventh() {
      const p = G.player;
      G.run.noteMask |= 64; G.music.mask = G.run.noteMask;
      G.sfx('songNote', { i: 6 });
      G.music.set('ending', true);
      G.fx.wave(p.x, p.y, { speed: 380, maxR: 900, str: 0.8 });
      G.lights.flash(p.x, p.y, 700, '#ffffff', 2.4, 1);
      G.particles.ring(p.x, p.y, 12, 320, '#ffffff', 1.4, 4);
      for (let i = 0; i < 14; i++) G.particles.note(p.x + G.rr(-30, 30), p.y + G.rr(-24, 10), G.NOTE_COLORS[i % 7]);
      if (G.zone.cores) G.zone.cores.forEach((c, i) => G.after(0.25 + i * 0.16, () => G.PROPS.core.pulse(c)));
      if (this.keeper) this.keeper.gift = true;
      p.happy = 3; p.wide = 1;
    },

    next() {
      const L = this.lines;
      if (this.shown < L[this.page].length) { this.shown = L[this.page].length; return; }
      this.page++; this.pt = 0; this.shown = 0;
      if (this.page >= L.length) {
        if (L === PRE) { this.seventh(); this.lines = AFTER; this.page = 0; this.phase = 'talk'; }
        else if (L === AFTER) { this.phase = 'choice'; this.t = 0; G.im.focus = null; }
        else if (L === HOME) { this.phase = 'ascent'; this.upT = 0; this.depth = 8848; this.noorI = 0; this.noorLine = ''; G.music.fade(1); }
        else { this.phase = 'credits'; this.credT = 0; }
      }
    },
    choose(c) {
      this.choice = c; G.run.ending = c;
      this.lines = c === 'home' ? HOME : STAY; this.page = 0; this.pt = 0; this.shown = 0; this.phase = 'talk';
      G.sfx('select');
    },
    finish() {
      const p = G.player;
      p.pearls += 40; p.inv = 0;
      G.game.bank(true);
      G.meta.flag('ending_' + (this.choice || 'home'), true);
      this.on = false;
      G.game.toTitle();
    },
    botAdvance() { this.skip = true; },

    update(dt, rdt) {
      const p = G.player, zone = G.zone, sh = zone.shelf;
      this.t += rdt;
      // Wick drifts to a place above the shelf and waits there
      if (sh && this.phase !== 'ascent') { const tx = sh.x - 30, ty = sh.y - 150; p.ax += (tx - p.x) * 5 - p.vx * 3; p.ay += (ty - p.y) * 5 - p.vy * 3; p.aim = Math.atan2(sh.y - p.y, sh.x + 60 - p.x); }
      const press = (I.mouse.pressed[0] || I.confirm || this.skip);
      if (this.phase === 'talk') {
        this.pt += rdt;
        const line = this.lines[this.page];
        const before = floor(this.shown);
        this.shown = min(line.length, this.shown + rdt * 38);
        if (floor(this.shown) > before && line[floor(this.shown) - 1] !== ' ') G.sfx('blip', { who: 'wick' });
        if ((press && this.pt > 0.25) || (this.shown >= line.length && this.pt > line.length * 0.07 + 5)) { I.mouse.pressed[0] = false; I.confirm = false; this.next(); }
      } else if (this.phase === 'choice') {
        if (this.skip && this.t > 0.6) this.choose('home');
      } else if (this.phase === 'ascent') {
        this.upT += rdt;
        const u = clamp(this.upT / 13, 0, 1);
        this.depth = 8848 * (1 - G.ease.inOutSine(u));
        const n = NOOR_UP[this.noorI];
        if (n && this.depth < n[0]) { this.noorLine = n[1]; this.noorT = 0; this.noorI++; G.sfx('static', { t: 0.2 }); }
        this.noorT += rdt;
        for (const b of this.bubbles) { b.y += b.v * rdt * (0.4 + sin(u * PI) * 1.2); if (b.y > G.H + 10) { b.y = -10; b.x = G.rand() * G.W; } }
        if (u >= 1 && this.upT > 15.5) { this.phase = 'credits'; this.credT = 0; G.sfx('levelup'); }
        if (this.skip && this.upT > 1) this.upT = max(this.upT, 15.6);
      } else if (this.phase === 'credits') {
        this.credT += rdt;
        if ((this.credT > 19 && press) || this.credT > 60 || (this.skip && this.credT > 1)) { I.mouse.pressed[0] = false; this.finish(); }
      }
    },

    draw(u) {
      const t = this.t, cx = G.W / 2;
      G.im.begin(true);
      if (this.phase === 'talk' || this.phase === 'choice') {
        // a soft band along the bottom for the words
        const g = u.createLinearGradient(0, G.H - 260, 0, G.H); g.addColorStop(0, 'rgba(2,6,14,0)'); g.addColorStop(1, 'rgba(2,6,14,0.82)');
        u.fillStyle = g; u.fillRect(0, G.H - 260, G.W, 260);
      }
      if (this.phase === 'talk') {
        const line = this.lines[this.page], o = { size: 22, font: 'serif', color: '#f4f8ff', align: 'center', lh: 33, reveal: floor(this.shown) };
        const lines = G.wrapText(u, line, 820, o);
        G.para(u, line, cx, G.H - 96 - (lines.length - 1) * 33, 820, o);
        if (this.shown >= line.length) G.text(u, 'CLICK', cx, G.H - 34, { size: 9, font: 'mono', weight: 700, color: UI.DIM, align: 'center', spacing: 4, alpha: 0.4 + 0.3 * sin(t * 4) });
      } else if (this.phase === 'choice') {
        const a = clamp(this.t / 0.6, 0, 1);
        G.text(u, 'And now?', cx, G.H - 170, { size: 24, font: 'serif', italic: true, color: '#f4f8ff', align: 'center', alpha: a });
        if (G.im.button(u, 'e_home', cx - 270, G.H - 124, 250, 46, 'GO HOME', { alpha: a, size: 13 })) this.choose('home');
        if (G.im.button(u, 'e_stay', cx + 20, G.H - 124, 250, 46, 'STAY', { alpha: a, size: 13, color: '#c9b8ff' })) this.choose('stay');
        G.text(u, 'carry the song up to Noor', cx - 145, G.H - 54, { size: 13, font: 'serif', italic: true, color: UI.DIM, align: 'center', alpha: a });
        G.text(u, 'make it seven', cx + 145, G.H - 54, { size: 13, font: 'serif', italic: true, color: UI.DIM, align: 'center', alpha: a });
      } else if (this.phase === 'ascent') this.drawAscent(u);
      else if (this.phase === 'credits') this.drawCredits(u);
      G.im.end();
    },

    drawAscent(u) {
      const up = clamp(this.upT / 1.2, 0, 1), d = this.depth, cx = G.W / 2;
      // water colour for this depth, read off the same palettes the dive used
      let zi = 4; for (let i = 0; i < 5; i++) if (d <= G.ZONES[i].depth[1]) { zi = i; break; }
      const Z = G.ZONES[zi], k = clamp((d - Z.depth[0]) / (Z.depth[1] - Z.depth[0]), 0, 1), amb = lerp((Z.amb[0][0] + Z.amb[0][2]) / 2, (Z.amb[1][0] + Z.amb[1][2]) / 2, k);
      const c0 = G.mix(G.mix(Z.water[0], Z.water[1], max(0, k - 0.25)), [0, 0, 0], 1 - min(1, amb * 1.6 + 0.12)), c1 = G.mix(G.mix(Z.water[0], Z.water[1], min(1, k + 0.25)), [0, 0, 0], 1 - min(1, amb * 1.6 + 0.06));
      const g = u.createLinearGradient(0, 0, 0, G.H); g.addColorStop(0, G.css(c0, up)); g.addColorStop(1, G.css(c1, up));
      u.fillStyle = g; u.fillRect(0, 0, G.W, G.H);
      u.globalAlpha = up * 0.5;
      for (const b of this.bubbles) u.drawImage(G.spr.bubble, b.x - b.s, b.y - b.s, b.s * 2, b.s * 2 + b.v * 0.012);
      u.globalAlpha = 1;
      // the probe, rising, with its lamp pointed up
      const p = G.player, y = G.H / 2 + 40 + sin(this.t * 2) * 5, pt = p.paint;
      G.drawGlow(u, cx, y - 90, 260, '#fff3d6', 0.12 * up);
      const hg = u.createRadialGradient(cx - 5, y - 6, 2, cx, y, 17); hg.addColorStop(0, G.mixCss(pt.hull, '#ffffff', 0.45)); hg.addColorStop(0.5, pt.hull); hg.addColorStop(1, pt.shade);
      u.globalAlpha = up; u.fillStyle = hg; u.beginPath(); u.arc(cx, y, 16, 0, TAU); u.fill();
      u.strokeStyle = pt.dark; u.lineWidth = 1.6; u.beginPath(); u.arc(cx, y, 16, 0, TAU); u.stroke();
      u.fillStyle = '#27303c'; u.beginPath(); u.arc(cx, y - 6, 9.6, 0, TAU); u.fill();
      u.fillStyle = '#bff4ff'; u.beginPath(); u.arc(cx, y - 6, 7.6, 0, TAU); u.fill();
      u.fillStyle = '#0d2530'; u.beginPath(); u.arc(cx, y - 8.4, 3.2, 0, TAU); u.fill();
      u.globalAlpha = 1;
      for (let i = 0; i < 7; i++) G.drawGlow(u, cx + Math.cos(this.t * 1.4 + i * TAU / 7) * 40, y + Math.sin(this.t * 1.4 + i * TAU / 7) * 40, 9, G.NOTE_COLORS[i], 0.9 * up);
      G.stext(u, G.fmtInt(max(0, d)) + ' M', cx, 96, 34, { align: 'center', color: '#ffffff', lw: 2.2, spacing: 3, alpha: up });
      G.text(u, Z.name, cx, 166, { size: 11, font: 'mono', weight: 700, color: '#dff6ff', align: 'center', spacing: 5, alpha: up * 0.75 });
      if (this.noorLine) {
        const a = clamp(this.noorT / 0.4, 0, 1) * clamp((6 - this.noorT) / 1, 0, 1);
        G.text(u, 'NOOR  ·  R/V HALCYON', cx, G.H - 150, { size: 9, font: 'mono', weight: 700, color: '#ffd9a8', align: 'center', spacing: 2, alpha: a });
        G.para(u, this.noorLine, cx, G.H - 118, 760, { size: 20, font: 'ui', weight: 500, color: '#fff4e4', align: 'center', alpha: a, lh: 28 });
      }
      // breaking the surface
      const out = clamp((this.upT - 13) / 2.2, 0, 1);
      if (out > 0) {
        const sg = u.createLinearGradient(0, 0, 0, G.H); sg.addColorStop(0, `rgba(120,180,232,${out})`); sg.addColorStop(0.6, `rgba(255,226,188,${out})`); sg.addColorStop(1, `rgba(255,208,160,${out})`);
        u.fillStyle = sg; u.fillRect(0, 0, G.W, G.H);
        G.drawGlow(u, cx, G.H * 0.62, 520 * out, '#fff6dc', out);
      }
    },

    drawCredits(u) {
      const t = this.credT, cx = G.W / 2, home = this.choice !== 'stay';
      const veil = clamp(t / 1.5, 0, 1);
      if (home) { const sg = u.createLinearGradient(0, 0, 0, G.H); sg.addColorStop(0, '#78b4e8'); sg.addColorStop(0.6, '#ffe2bc'); sg.addColorStop(1, '#ffd0a0'); u.fillStyle = sg; u.fillRect(0, 0, G.W, G.H); G.drawGlow(u, cx, G.H * 0.62, 520, '#fff6dc', 1); }
      u.fillStyle = home ? `rgba(8,24,44,${0.5 * veil})` : `rgba(2,6,14,${0.62 * veil})`; u.fillRect(0, 0, G.W, G.H);
      const cp = G.meta.codexProgress(), r = G.run;
      const ink = '#ffffff';
      const fadeAt = (t0, len) => clamp((t - t0) / 0.9, 0, 1) * clamp((t0 + len - t) / 0.9, 0, 1);
      // title card
      let a = fadeAt(0.6, 6.2);
      if (a > 0) {
        G.stext(u, home ? 'DIVE COMPLETE' : 'SEVEN', cx, 232, 46, { align: 'center', color: ink, lw: 2.8, spacing: 3.6, alpha: a, reveal: (t - 0.6) * 12 });
        G.text(u, home ? 'seven call tones, one small lamp, home' : 'one chord, nothing missing', cx, 330, { size: 18, font: 'serif', italic: true, color: ink, align: 'center', alpha: a * 0.9 });
        G.text(u, `${G.fmtInt(8848)} M   ·   ${G.fmtTime(r.time)}   ·   ${cp.have} OF ${cp.total} CATALOGUED   ·   ${r.dissuaded} PERSUADED, NONE HARMED`, cx, 384, { size: 10, font: 'mono', weight: 700, color: ink, align: 'center', spacing: 2.4, alpha: a * 0.75 });
      }
      // credits
      a = fadeAt(7.2, 6.6);
      if (a > 0) {
        G.stext(u, 'UNDERSONG', cx, 220, 40, { align: 'center', color: ink, lw: 2.5, spacing: 3.6, alpha: a });
        G.text(u, 'a game by Claude', cx, 312, { size: 20, font: 'serif', italic: true, color: ink, align: 'center', alpha: a });
        G.text(u, 'every picture drawn and every note played by the code, as you went', cx, 366, { size: 15, font: 'serif', color: ink, align: 'center', alpha: a * 0.9 });
        G.text(u, 'no images.  no recordings.', cx, 394, { size: 15, font: 'serif', color: ink, align: 'center', alpha: a * 0.9 });
      }
      a = clamp((t - 14.4) / 1.2, 0, 1);
      if (a > 0) {
        G.para(u, POST[home ? 'home' : 'stay'], cx, 300, 700, { size: 21, font: 'serif', italic: true, color: ink, align: 'center', alpha: a, lh: 32 });
        G.text(u, 'thank you for listening', cx, 452, { size: 13, font: 'mono', weight: 700, color: ink, align: 'center', spacing: 4, alpha: a * clamp((t - 17) / 1, 0, 1) * 0.8 });
        if (t > 19) G.text(u, 'CLICK TO SURFACE', cx, G.H - 60, { size: 10, font: 'mono', weight: 700, color: ink, align: 'center', spacing: 4, alpha: 0.4 + 0.3 * sin(t * 4) });
      }
    },
  };
})();
