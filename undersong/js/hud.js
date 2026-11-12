'use strict';
/* UNDERSONG — hud: everything drawn over the dive. Hull, flares, depth, pearls, the seven notes,
   boss bar, comms box (with a failing radio link), scan toasts, title cards, prompts, reticle. */
(function () {
  const { sin, cos, min, max, abs, floor, PI, round } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU;
  const INK = '#dff6ff', DIM = '#7fa6b8', CYAN = '#7fe6ff', GOLD = '#ffd98a', WARN = '#ff8a7a';
  G.UI = { INK, DIM, CYAN, GOLD, WARN, PANEL: 'rgba(5,14,26,0.84)', LINE: 'rgba(150,215,255,0.28)' };

  const SPEAKERS = {
    noor: { tag: 'NOOR  ·  R/V HALCYON', color: '#ffd9a8', font: 'ui' },
    wick: { tag: 'WICK-7  ·  LOG', color: '#9ff0ff', font: 'mono' },
    hermit: { tag: 'THE HERMIT', color: '#ffb07a', font: 'ui' },
    log: { tag: 'RECOVERED LOG', color: '#c9b8ff', font: 'mono' },
    sys: { tag: 'SYSTEM', color: '#9fb8c8', font: 'mono' },
  };

  const hud = G.hud = {
    toasts: [], comm: null, commQ: [], card: null, hintMsg: null, hintT: 0,
    boss: { vis: 0, name: '', sub: '', hp: 1, lag: 1, ref: null },
    hullAnim: [], pearlShow: 0, pearlPop: 0, xpShow: 0, depthShow: 0, retK: 0, show: 1, notePop: -1, notePopT: 0, lvlPop: 0,

    reset() { this.toasts.length = 0; this.comm = null; this.commQ.length = 0; this.card = null; this.boss.ref = null; this.boss.vis = 0; this.hintMsg = null; },

    // ---------- comms
    // o: {hold, garble 0..1, tag, now}
    say(who, text, o) {
      o = o || {};
      const m = { who, text, hold: o.hold, garble: o.garble || 0, tag: o.tag, t: 0, shown: 0, done: 0, src: text };
      if (m.garble > 0) m.text = this.garble(text, m.garble);
      if (o.now) { this.commQ.length = 0; this.comm = null; }
      this.commQ.push(m);
    },
    garble(text, amt) {
      let out = '';
      const rng = G.RNG((text.length * 7919 + amt * 1000) | 0);
      let run = 0;
      for (const ch of text) {
        if (ch === ' ') { out += ' '; continue; }
        if (run > 0) { run--; out += run % 2 ? '·' : '░'; continue; }
        if (rng() < amt * 0.16) { run = rng.int(1, 2 + floor(amt * 6)); out += '░'; continue; }
        out += ch;
      }
      return out;
    },
    skipComm() { const m = this.comm; if (!m) return false; if (m.shown < m.text.length) m.shown = m.text.length; else m.done = 99; return true; },
    busy() { return !!this.comm || this.commQ.length > 0; },

    toast(title, sub, o) {
      o = o || {};
      this.toasts.push({ title, sub: sub || '', tag: o.tag || '', color: o.color || CYAN, t: 0, life: o.life || 3.6, icon: o.icon || null });
      if (this.toasts.length > 4) this.toasts.shift();
    },
    // big centred title (zone names, bosses)
    title(title, sub, o) { o = o || {}; this.card = { title, sub: sub || '', t: 0, life: o.life || 4.4, color: o.color || INK, small: !!o.small }; },
    hint(msg, secs) { this.hintMsg = msg; this.hintT = secs || 5; },
    setBoss(c, name, sub) { const b = this.boss; b.ref = c; b.name = name; b.sub = sub || ''; b.hp = 1; b.lag = 1; },

    update(dt) {
      const p = G.player;
      // comms typewriter
      if (!this.comm && this.commQ.length) { this.comm = this.commQ.shift(); if (this.comm.garble > 0.3) G.sfx('static', { t: 0.25 }); }
      const m = this.comm;
      if (m) {
        m.t += dt;
        if (m.shown < m.text.length) {
          const before = floor(m.shown);
          m.shown = min(m.text.length, m.shown + dt * 46);
          if (floor(m.shown) > before) { const ch = m.text[floor(m.shown) - 1]; if (ch !== ' ' && ch !== '░' && ch !== '·') G.sfx('blip', { who: m.who }); else if (ch === '░' && G.rand() < 0.3) G.sfx('static', { t: 0.05 }); }
        } else {
          m.done += dt;
          const hold = m.hold !== undefined ? m.hold : 1.8 + m.text.length * 0.038;
          if (m.done > hold) this.comm = null;
        }
      }
      for (let i = this.toasts.length - 1; i >= 0; i--) { const t = this.toasts[i]; t.t += dt; if (t.t > t.life) this.toasts.splice(i, 1); }
      if (this.card) { this.card.t += dt; if (this.card.t > this.card.life) this.card = null; }
      if (this.hintT > 0) { this.hintT -= dt; if (this.hintT <= 0) this.hintMsg = null; }
      const b = this.boss;
      if (b.ref && !b.ref.dead && !b.ref.fleeing) { b.vis = damp(b.vis, 1, 4, dt); b.hp = max(0, b.ref.hp / b.ref.maxHp); }
      else { b.vis = damp(b.vis, 0, 3, dt); if (b.vis < 0.02) b.ref = null; if (b.ref) b.hp = 0; }
      b.lag = b.lag > b.hp ? max(b.hp, b.lag - dt * 0.35) : b.hp;
      this.pearlShow = damp(this.pearlShow, p.pearls, 10, dt); this.pearlPop = max(0, this.pearlPop - dt * 4);
      this.xpShow = damp(this.xpShow, p.xp / p.xpNext, 10, dt);
      this.lvlPop = max(0, this.lvlPop - dt * 2); this.notePopT = max(0, this.notePopT - dt);
      this.retK = max(0, this.retK - dt * 9);
      if (G.zone) this.depthShow = damp(this.depthShow, G.world.depthAt(p.y), 8, dt);
      // per-pip hull animation
      const mh = p.st.maxHull;
      while (this.hullAnim.length < mh) this.hullAnim.push({ v: 0, pop: 0 });
      for (let i = 0; i < this.hullAnim.length; i++) {
        const h = this.hullAnim[i], want = i < p.hull ? 1 : 0;
        if (want !== h.want) { h.want = want; h.pop = 1; }
        h.v = damp(h.v, want, 14, dt); h.pop = max(0, h.pop - dt * 3.5);
      }
    },

    draw(u) {
      const p = G.player, t = G.time, a = this.show;
      if (a > 0.01 && G.game.state === 'play') {
        u.globalAlpha = a;
        this.drawVitals(u, p, t);
        this.drawDepth(u, p, t);
        this.drawAbilities(u, p, t);
        u.globalAlpha = 1;
      }
      this.drawBoss(u, t);
      this.drawToasts(u, t);
      this.drawComm(u, t);
      this.drawCard(u, t);
      this.drawPrompt(u, t);
    },

    drawVitals(u, p, t) {
      const x0 = 28, y0 = 26, mh = p.st.maxHull;
      // hull pips
      for (let i = 0; i < mh; i++) {
        const h = this.hullAnim[i] || { v: 1, pop: 0 }, x = x0 + i * 23, s = 1 + h.pop * 0.5 * sin(h.pop * PI);
        const low = p.hull <= 1 && i === 0 ? 0.5 + 0.5 * sin(t * 9) : 0;
        u.save(); u.translate(x + 9, y0 + 7); u.scale(s, s);
        G.roundRect(u, -9, -7, 18, 14, 4);
        u.fillStyle = 'rgba(4,12,22,0.6)'; u.fill();
        if (h.v > 0.02) { u.globalAlpha = this.show * h.v; G.roundRect(u, -9, -7, 18, 14, 4); u.fillStyle = low > 0 ? G.mixCss('#ffcf5a', '#ff5a4a', low) : '#ffcf5a'; u.fill(); u.fillStyle = 'rgba(255,255,255,0.55)'; G.roundRect(u, -6.5, -5, 13, 3.2, 1.5); u.fill(); u.globalAlpha = this.show; }
        G.roundRect(u, -9, -7, 18, 14, 4); u.strokeStyle = h.v > 0.5 ? 'rgba(255,240,200,0.9)' : 'rgba(160,200,220,0.45)'; u.lineWidth = 1.3; u.stroke();
        u.restore();
      }
      if (p.plateReady) { u.strokeStyle = '#dfe8c8'; u.lineWidth = 1.5; G.roundRect(u, x0 - 4, y0 - 4, mh * 23 + 3, 22, 7); u.stroke(); }
      // flares
      const fy = y0 + 27;
      for (let i = 0; i < p.st.flareMax; i++) {
        const x = x0 + i * 17, full = i < p.flares, charging = i === p.flares;
        u.save(); u.translate(x + 5, fy + 8); u.rotate(0.35);
        G.roundRect(u, -3.5, -8, 7, 16, 3); u.fillStyle = 'rgba(4,12,22,0.6)'; u.fill();
        if (full) { G.roundRect(u, -3.5, -8, 7, 16, 3); u.fillStyle = '#ffb45a'; u.fill(); u.fillStyle = '#fff2c8'; u.fillRect(-3.5, -8, 7, 4); }
        else if (charging && p.flareFill > 0) { u.save(); u.beginPath(); u.rect(-4, 8 - 16 * p.flareFill, 8, 16 * p.flareFill); u.clip(); G.roundRect(u, -3.5, -8, 7, 16, 3); u.fillStyle = 'rgba(255,180,90,0.5)'; u.fill(); u.restore(); }
        G.roundRect(u, -3.5, -8, 7, 16, 3); u.strokeStyle = full ? 'rgba(255,230,180,0.9)' : 'rgba(160,200,220,0.45)'; u.lineWidth = 1.2; u.stroke();
        u.restore();
      }
      // xp
      const xy = fy + 30, xw = 170;
      u.fillStyle = 'rgba(4,12,22,0.6)'; G.roundRect(u, x0, xy, xw, 5, 2.5); u.fill();
      u.fillStyle = '#c8ff9a'; G.roundRect(u, x0, xy, max(3, xw * clamp(this.xpShow, 0, 1)), 5, 2.5); u.fill();
      const lp = this.lvlPop;
      G.text(u, 'LV ' + p.level, x0 + xw + 10, xy + 6, { size: 11 + lp * 5, font: 'mono', weight: 700, color: lp > 0 ? '#eaffc8' : '#c8ff9a', spacing: 1 });
    },

    drawDepth(u, p, t) {
      const xr = G.W - 28, zone = G.zone;
      const d = max(0, round(this.depthShow)), str = G.fmtInt(d);
      G.stext(u, 'M', xr, 22, 11, { align: 'right', color: DIM, lw: 1.4 });
      G.stext(u, str, xr - 18, 22, 22, { align: 'right', color: INK, lw: 2 });
      G.text(u, zone.def.name, xr, 62, { size: 10, font: 'mono', weight: 700, color: DIM, align: 'right', spacing: 2 });
      // pearls
      const py = 84, pop = this.pearlPop;
      const g = u.createRadialGradient(xr - 7, py - 1.5, 0.5, xr - 6, py, 6); g.addColorStop(0, '#fff'); g.addColorStop(1, '#c9b0e6');
      u.fillStyle = g; u.beginPath(); u.arc(xr - 6, py, 5.5 + pop * 2, 0, TAU); u.fill();
      G.text(u, String(round(this.pearlShow)), xr - 18, py + 5, { size: 14 + pop * 3, font: 'mono', weight: 700, color: '#ffeaf6', align: 'right' });
      // the seven notes
      const found = G.run ? G.run.notes : 0, ny = 108;
      for (let i = 0; i < 7; i++) {
        const x = xr - 6 - (6 - i) * 13, on = i < found, pp = this.notePop === i ? this.notePopT : 0;
        u.beginPath(); u.arc(x, ny, 3.6 + pp * 5, 0, TAU);
        if (on) { u.fillStyle = i === 6 ? '#ffd98a' : '#c9b8ff'; u.fill(); }
        else { u.strokeStyle = i === 6 ? 'rgba(255,217,138,0.28)' : 'rgba(201,184,255,0.35)'; u.lineWidth = 1.1; u.stroke(); }
      }
    },

    drawAbilities(u, p, t) {
      if (!G.settings.hints && G.meta.data.stats.dives > 2) return;
      const y = G.H - 34, items = [
        { k: G.input.label('dash'), n: 'DASH', f: min(1, p.dashCharge), ok: p.dashCharge >= 1 },
        { k: G.input.label('flare'), n: 'FLARE', f: p.flares > 0 ? 1 : p.flareFill, ok: p.flares > 0 },
        { k: G.input.label('sonar'), n: 'SONAR', f: 1 - p.sonarT / p.st.sonarCd, ok: p.sonarT <= 0 },
      ];
      let x = G.W - 28;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i], w = 92;
        x -= w;
        u.fillStyle = 'rgba(4,12,22,0.5)'; G.roundRect(u, x, y - 13, w - 8, 26, 5); u.fill();
        u.fillStyle = it.ok ? 'rgba(127,230,255,0.16)' : 'rgba(127,230,255,0.07)'; G.roundRect(u, x, y - 13, (w - 8) * clamp(it.f, 0, 1), 26, 5); u.fill();
        G.text(u, it.n, x + 8, y - 1, { size: 9, font: 'mono', weight: 700, color: it.ok ? INK : DIM, spacing: 1.2 });
        G.text(u, it.k, x + 8, y + 9, { size: 8, font: 'mono', color: DIM, spacing: 0.6 });
      }
    },

    drawBoss(u, t) {
      const b = this.boss;
      if (b.vis < 0.02) return;
      const w = 460, x = G.W / 2 - w / 2, y = 34 - (1 - b.vis) * 30;
      u.globalAlpha = b.vis;
      G.stext(u, b.name, G.W / 2, y - 18, 12, { align: 'center', color: INK, lw: 1.5 });
      u.fillStyle = 'rgba(4,12,22,0.7)'; G.roundRect(u, x - 3, y, w + 6, 12, 6); u.fill();
      u.fillStyle = 'rgba(255,255,255,0.75)'; G.roundRect(u, x, y + 3, max(0, w * b.lag), 6, 3); u.fill();
      const g = u.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#ff9a6a'); g.addColorStop(1, '#ffd98a');
      u.fillStyle = g; G.roundRect(u, x, y + 3, max(0, w * b.hp), 6, 3); u.fill();
      u.strokeStyle = 'rgba(255,230,200,0.5)'; u.lineWidth = 1; G.roundRect(u, x - 3, y, w + 6, 12, 6); u.stroke();
      if (b.sub) G.text(u, b.sub, G.W / 2, y + 27, { size: 10, font: 'serif', italic: true, color: DIM, align: 'center' });
      u.globalAlpha = 1;
    },

    drawToasts(u, t) {
      let y = G.H - 150;
      for (let i = this.toasts.length - 1; i >= 0; i--) {
        const s = this.toasts[i], inn = min(1, s.t / 0.3), out = min(1, (s.life - s.t) / 0.4), al = G.ease.outCubic(inn) * out;
        G.font(u, 15, 'ui', 600);
        const tw = u.measureText(s.title).width;
        G.font(u, 12, 'serif', 400, true);
        const sw = s.sub ? u.measureText(s.sub).width + 14 : 0;
        const tagW = s.tag ? G.textWidth(u, s.tag, { size: 9, font: 'mono', weight: 700, spacing: 1.5 }) + 22 : 0;
        const w = tw + sw + tagW + 36, x = G.W / 2 - w / 2, yy = y + (1 - G.ease.outBack(inn)) * 18;
        u.globalAlpha = al;
        u.fillStyle = G.UI.PANEL; G.roundRect(u, x, yy - 17, w, 34, 17); u.fill();
        u.strokeStyle = G.css(s.color, 0.55); u.lineWidth = 1.2; G.roundRect(u, x, yy - 17, w, 34, 17); u.stroke();
        let cx = x + 18;
        if (s.tag) { G.text(u, s.tag, cx, yy + 4, { size: 9, font: 'mono', weight: 700, color: s.color, spacing: 1.5 }); cx += tagW; }
        G.text(u, s.title, cx, yy + 5, { size: 15, weight: 600, color: INK });
        if (s.sub) G.text(u, s.sub, cx + tw + 14, yy + 5, { size: 12, font: 'serif', italic: true, color: DIM });
        u.globalAlpha = 1;
        y -= 42;
      }
    },

    drawComm(u, t) {
      const m = this.comm;
      if (!m) return;
      const sp = SPEAKERS[m.who] || SPEAKERS.sys, w = 470, x = 28, lh = 21;
      const o = { size: 15, font: sp.font, weight: sp.font === 'mono' ? 400 : 500 };
      const lines = G.wrapText(u, m.text, w - 36, o), h = 38 + lines.length * lh;
      const y = G.H - 30 - h, inn = G.ease.outCubic(min(1, m.t / 0.25));
      u.globalAlpha = inn;
      u.fillStyle = G.UI.PANEL; G.roundRect(u, x, y + (1 - inn) * 10, w, h, 8); u.fill();
      u.fillStyle = sp.color; u.fillRect(x, y + 10 + (1 - inn) * 10, 2.5, h - 20);
      // signal bars: how much of the surface link is left
      const tag = m.tag || sp.tag;
      G.text(u, tag, x + 18, y + 21, { size: 9, font: 'mono', weight: 700, color: sp.color, spacing: 1.6 });
      if (m.who === 'noor') {
        const bars = 4 - round(m.garble * 4), tx = x + w - 40;
        for (let i = 0; i < 4; i++) { u.fillStyle = i < bars ? sp.color : 'rgba(255,217,168,0.2)'; u.fillRect(tx + i * 5, y + 22 - (i + 1) * 2.5, 3, (i + 1) * 2.5); }
      }
      o.color = INK; o.reveal = floor(m.shown); o.lh = lh;
      G.para(u, m.text, x + 18, y + 44, w - 36, o);
      u.globalAlpha = 1;
    },

    drawCard(u, t) {
      const c = this.card;
      if (!c) return;
      const inn = min(1, c.t / 1.1), out = clamp((c.life - c.t) / 0.9, 0, 1), al = min(1, c.t / 0.3) * out;
      const y = c.small ? 150 : 250, size = c.small ? 26 : 44;
      const w = G.stextWidth(c.title, size, 3.2);
      u.globalAlpha = al * 0.55; u.strokeStyle = c.color; u.lineWidth = 1;
      const lw = (w / 2 + 60) * G.ease.outCubic(inn);
      u.beginPath(); u.moveTo(G.W / 2 - lw, y + size + 18); u.lineTo(G.W / 2 + lw, y + size + 18); u.stroke();
      u.globalAlpha = 1;
      G.stext(u, c.title, G.W / 2, y, size, { align: 'center', color: c.color, lw: c.small ? 2 : 2.6, spacing: 3.2, alpha: al, reveal: c.t * 16 });
      if (c.sub) G.text(u, c.sub.toUpperCase(), G.W / 2, y + size + 42, { size: 11, font: 'mono', color: DIM, align: 'center', spacing: 4, alpha: al * clamp((c.t - 0.7) / 0.6, 0, 1) });
    },

    drawPrompt(u, t) {
      const f = G.props.focus;
      let label = null, key = null;
      if (f && f.def.prompt && G.game.state === 'play' && !G.game.overlay) { label = typeof f.def.prompt === 'function' ? f.def.prompt(f) : f.def.prompt; key = G.input.label('interact'); }
      const y = G.H - 96;
      if (label) {
        const tw = G.textWidth(u, label, { size: 12, font: 'mono', weight: 700, spacing: 1.5 }), kw = G.textWidth(u, key, { size: 12, font: 'mono', weight: 700 }) + 14;
        const w = tw + kw + 34, x = G.W / 2 - w / 2;
        u.fillStyle = G.UI.PANEL; G.roundRect(u, x, y - 15, w, 30, 15); u.fill();
        u.fillStyle = INK; G.roundRect(u, x + 8, y - 9, kw, 18, 4); u.fill();
        G.text(u, key, x + 8 + kw / 2, y + 4.5, { size: 12, font: 'mono', weight: 700, color: '#06121e', align: 'center' });
        G.text(u, label, x + 18 + kw, y + 4.5, { size: 12, font: 'mono', weight: 700, color: INK, spacing: 1.5 });
      } else if (this.hintMsg && G.game.state === 'play' && !G.game.overlay) {
        const al = min(1, this.hintT / 0.5);
        G.text(u, this.hintMsg, G.W / 2, y + 4, { size: 12, font: 'mono', weight: 700, color: INK, align: 'center', spacing: 2, alpha: al * (0.7 + 0.3 * sin(t * 4)), shadow: 'rgba(0,10,20,0.7)' });
      }
    },

    // the cursor: a reticle in play, a soft dot in menus
    drawCursor(u, menu) {
      const m = G.input.mouse, t = G.time;
      if (!m.seen || G.input.usingPad) return;
      if (menu) {
        u.fillStyle = 'rgba(223,246,255,0.95)'; u.beginPath(); u.arc(m.x, m.y, 3.4, 0, TAU); u.fill();
        u.strokeStyle = 'rgba(127,230,255,0.6)'; u.lineWidth = 1.2; u.beginPath(); u.arc(m.x, m.y, 8, 0, TAU); u.stroke();
        return;
      }
      const k = this.retK, r = 9 + k * 5;
      u.strokeStyle = 'rgba(4,20,34,0.55)'; u.lineWidth = 3.4; u.beginPath(); u.arc(m.x, m.y, r, 0, TAU); u.stroke();
      u.strokeStyle = 'rgba(232,252,255,0.95)'; u.lineWidth = 1.6; u.beginPath(); u.arc(m.x, m.y, r, 0, TAU); u.stroke();
      u.beginPath();
      for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; u.moveTo(m.x + cos(a) * (r + 3), m.y + sin(a) * (r + 3)); u.lineTo(m.x + cos(a) * (r + 7), m.y + sin(a) * (r + 7)); }
      u.stroke();
      u.fillStyle = '#fff'; u.beginPath(); u.arc(m.x, m.y, 1.4, 0, TAU); u.fill();
    },
  };

  G.on('shoot', () => { hud.retK = 1; });
  G.on('pearls', () => { hud.pearlPop = 1; });
  G.on('levelup', () => { hud.lvlPop = 1; });
  G.on('scan', (id, isNew) => {
    const e = G.CODEX[id];
    if (!e) return;
    hud.toast(e.name, e.latin, { tag: isNew ? 'NEW SPECIES' : 'OBSERVED', color: isNew ? GOLD : CYAN, life: isNew ? 5 : 3 });
  });
})();
