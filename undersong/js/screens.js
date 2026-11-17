'use strict';
/* UNDERSONG — screens: splash, title, death summary, field notes (codex), workshop. */
(function () {
  const { sin, cos, min, max, abs, floor, PI, round, hypot, atan2 } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, I = G.input, UI = G.UI, im = G.im, SCREENS = G.SCREENS;

  function logo(u, x, y, size, a, t, align) {
    const o = { align: align || 'left', spacing: 3.6, reveal: t * 9 };
    G.stext(u, 'UNDERSONG', x, y, size, Object.assign({ color: 'rgba(90,220,255,0.35)', lw: size * 0.2, alpha: a * 0.5 }, o));
    G.stext(u, 'UNDERSONG', x, y, size, Object.assign({ color: '#ffffff', lw: size * 0.055, alpha: a }, o));
  }

  // ================================================================= splash (needs one click so the browser lets us make sound)
  SCREENS.splash = {
    update(s) {
      if (s.t > 0.4 && (I.anyPressed || I.mouse.pressed[0]) && !s.closing) {
        I.mouse.pressed[0] = false; I.confirm = false;
        G.menu.close(s);
        G.after(0.25, () => { G.sfx('title'); G.menu.open('title'); });
      }
    },
    draw(s, u, a) {
      u.fillStyle = `rgba(1,5,11,${0.72 * a})`; u.fillRect(0, 0, G.W, G.H);
      logo(u, G.W / 2, 268, 64, a, s.t, 'center');
      G.text(u, 'a small light, descending', G.W / 2, 380, { size: 17, font: 'serif', italic: true, color: UI.DIM, align: 'center', alpha: a * clamp(s.t - 1, 0, 1) });
      G.text(u, 'CLICK TO BEGIN', G.W / 2, 470, { size: 12, font: 'mono', weight: 700, color: UI.INK, align: 'center', spacing: 5, alpha: a * (0.55 + 0.45 * sin(G.time * 3)) * clamp(s.t - 1.4, 0, 1) });
      G.text(u, 'headphones recommended', G.W / 2, 498, { size: 12, font: 'serif', italic: true, color: UI.DIM, align: 'center', alpha: a * clamp(s.t - 1.8, 0, 1) * 0.8 });
    },
  };

  // ================================================================= title
  SCREENS.title = {
    update(s) { if (s.data.go) { s.data.go += G.rdt; if (s.data.go > 0.25 && !s.closing) { G.menu.close(s); G.game.startDive(); } } },
    draw(s, u, a) {
      const x = 96, d = G.meta.data;
      const g = u.createLinearGradient(0, 0, 560, 0); g.addColorStop(0, `rgba(2,10,20,${0.55 * a})`); g.addColorStop(1, 'rgba(2,10,20,0)');
      u.fillStyle = g; u.fillRect(0, 0, 560, G.H);
      logo(u, x, 150, 52, a, s.t);
      G.text(u, 'a small light, descending', x + 4, 244, { size: 16, font: 'serif', italic: true, color: G.mixCss(UI.DIM, UI.INK, 0.4), alpha: a * clamp(s.t - 0.8, 0, 1) });
      const al = a * clamp((s.t - 0.6) * 2, 0, 1);
      let y = 318;
      if (im.entry(u, 't_dive', x, y, 'DIVE', 24, { alpha: al }) && !s.data.go) s.data.go = 0.001;
      y += 62; if (im.entry(u, 't_shop', x, y, 'WORKSHOP', 20, { alpha: al, note: d.pearls ? d.pearls + ' pearls' : '' })) G.menu.open('workshop');
      const cp = G.meta.codexProgress();
      y += 54; if (im.entry(u, 't_codex', x, y, 'FIELD NOTES', 20, { alpha: al, note: cp.have + ' / ' + cp.total })) G.menu.open('codex');
      y += 54; if (im.entry(u, 't_set', x, y, 'SETTINGS', 20, { alpha: al })) G.menu.open('settings');
      if (d.stats.dives > 0) {
        const bits = ['DIVES ' + d.stats.dives, 'DEEPEST ' + G.fmtInt(d.stats.bestDepth) + ' M'];
        if (d.stats.wins) bits.push('SONGS BROUGHT HOME ' + d.stats.wins);
        G.text(u, bits.join('     '), x, G.H - 44, { size: 10, font: 'mono', color: UI.DIM, spacing: 2, alpha: al });
      } else G.text(u, `${I.label('move')} swim   ${I.label('fire')} pulse   ${I.label('dash')} dash   ${I.label('flare')} flare   ${I.label('sonar')} sonar`, x, G.H - 44, { size: 10, font: 'mono', color: UI.DIM, spacing: 1.2, alpha: al });
      G.text(u, 'A GAME BY CLAUDE', G.W - 30, G.H - 24, { size: 9, font: 'mono', color: UI.DIM, align: 'right', spacing: 3, alpha: al * 0.7 });
      if (!G.meta.ok) G.text(u, 'saving is unavailable in this browser window; progress will last until you close it', G.W - 30, 30, { size: 11, font: 'serif', italic: true, color: UI.WARN, align: 'right', alpha: al });
    },
  };

  // ================================================================= death
  const EPITAPHS = [
    'I\'ve got you. I\'ve always got the tether. Rest a minute, then we go again.',
    'Not this time. That\'s all right. The sea has had more practice than we have.',
    'The hull\'s a write-off. The core is fine. You\'re fine. Tell me what you saw.',
    'Reeling you in. I\'ll have a new shell on you by morning.',
    'You went further than I thought that hull could. So did I, honestly.',
  ];
  SCREENS.death = {
    pause: false,
    open(s) { s.data.line = EPITAPHS[(G.rand() * EPITAPHS.length) | 0]; s.data.hullNo = G.meta.data.stats.dives; G.hud.comm = null; G.hud.commQ.length = 0; G.hud.hintMsg = null; },
    draw(s, u, a) {
      const r = G.run, p = G.player, cx = G.W / 2;
      G.veil(u, a, 0.74);
      G.text(u, 'HULL No. ' + s.data.hullNo, cx, 122, { size: 11, font: 'mono', weight: 700, color: UI.DIM, align: 'center', spacing: 5, alpha: a });
      G.stext(u, 'LINE HAULED IN', cx, 140, 34, { align: 'center', color: '#fff', lw: 2.4, spacing: 3.2, alpha: a, reveal: s.t * 22 });
      G.para(u, '“' + s.data.line + '”', cx, 226, 620, { size: 16, font: 'serif', italic: true, color: '#ffd9a8', align: 'center', alpha: a * clamp(s.t - 0.6, 0, 1), lh: 24 });
      const rows = [
        ['DEPTH REACHED', G.fmtInt(r.maxDepth) + ' m'], ['ZONE', G.ZONES[r.zone].name], ['CREATURES PERSUADED', String(r.dissuaded)],
        ['SPECIES OBSERVED', r.scans + (r.fresh ? '   (' + r.fresh + ' new)' : '')], ['VOICES FOUND', String(G.bitCount(r.noteMask)) + ' of 6'],
        ['PEARLS BANKED', '+' + (p.banked || 0) + '   (' + G.meta.data.pearls + ' total)'], ['TIME UNDER', G.fmtTime(r.time)],
      ];
      let y = 310;
      rows.forEach((row, i) => {
        const al = a * clamp((s.t - 0.9 - i * 0.09) * 4, 0, 1);
        G.text(u, row[0], cx - 16, y, { size: 11, font: 'mono', weight: 700, color: UI.DIM, align: 'right', spacing: 2, alpha: al });
        G.text(u, row[1], cx + 16, y, { size: 14, font: 'mono', color: UI.INK, alpha: al });
        y += 30;
      });
      if (s.t > 1.6) {
        if (im.button(u, 'd_again', cx - 232, 566, 220, 42, 'DIVE AGAIN', { alpha: a })) { G.game.toTitle(); G.menu.stack.length = 0; G.game.startDive(); G.game.fade = 1; G.game.fadeTo = 0; }
        if (im.button(u, 'd_surf', cx + 12, 566, 220, 42, 'SURFACE', { alpha: a, sound: 'back' })) G.game.toTitle();
      }
    },
  };
  G.bitCount = n => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
  G.fmtTime = s => { s = round(s); const m = floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };

  // ================================================================= field notes
  const TABS = ['SHALLOWS', 'TWILIGHT', 'MIDNIGHT', 'ABYSS', 'TRENCH', 'VOICES'];
  const specimens = {};
  const FAR = { x: 1e6, y: 1e6, vx: 0, vy: 0, dead: false, r: 13 };
  // A posed, animated stand-in for a codex entry. Creatures swim in place; scenery and props just live.
  function specimenFor(id) {
    if (specimens[id] !== undefined) return specimens[id];
    const entry = G.CODEX[id] || {};
    let sp = null;
    try {
      if (entry.decor && G.DECOR[entry.decor]) {
        const def = G.DECOR[entry.decor];
        const d = Object.assign({ type: entry.decor, def, x: 0, y: 0, nx: 0, ny: -1, ang: -PI / 2, s: 1, ph: 1.3, react: 0, t: 0, data: null, dead: false }, entry.decorO || {});
        if (def.init) def.init(d);
        sp = { kind: 'decor', o: d, def, showR: entry.showR || def.r * 1.5, dy: entry.showY === undefined ? def.r * 0.6 : entry.showY };
      } else if (entry.prop && G.PROPS[entry.prop]) {
        const def = G.PROPS[entry.prop];
        const pr = Object.assign({ type: entry.prop, def, x: 0, y: 0, r: def.r, t: 0, ph: 1.3, used: false, dead: false, pd: 999, n: 0 }, entry.propO || {});
        if (def.init) def.init(pr);
        sp = { kind: 'prop', o: pr, def, showR: entry.showR || def.r * 2.4, dy: entry.showY || 0 };
      } else {
        let type = null, extra = null;
        if (entry.spec) { type = entry.spec.type; extra = entry.spec.o; }
        else for (const k in G.CREATURES) { const d = G.CREATURES[k]; if ((d.codex || d.id) === id) { type = k; break; } }
        const def = type && G.CREATURES[type];
        if (def) {
          const c = {
            uid: 99000 + Object.keys(specimens).length, id: 0, type, def, x: 0, y: 0, vx: 0, vy: 0, kx: 0, ky: 0, r: def.r, hp: def.hp, maxHp: def.hp, face: 0, up: 0, t: 0, st: 'idle', stT: 0,
            ph: 1.3, wa: 0, flash: 0, stun: 0, vuln: 0, mark: 0, hurtCd: 0, alpha: 1, home: { x: 0, y: 0 }, leash: 100, aggro: false, pd: 300, hittable: false, fleeing: 0, dead: false, scan: 0, awake: true, touch: false,
            nx: 0, ny: -1, dir: 1, specimen: true,
          };
          if (extra) Object.assign(c, extra);
          if (def.init) def.init(c);
          sp = { kind: 'creature', o: c, def, showR: entry.showR || def.showR || def.r * 2.6, dy: entry.showY || def.showY || 0 };
        }
      }
    } catch (e) { sp = null; }
    return (specimens[id] = sp);
  }
  function drawSpecimen(u, id, cx, cy, box, dt) {
    const sp = specimenFor(id);
    if (!sp) return false;
    const o = sp.o, def = sp.def;
    let ox = 0;
    try {
      o.t += dt;
      if (sp.kind === 'creature') {
        o.stT += dt;
        if (!def.fixed && !def.showStill) {      // hold station, nose to the right, and let the body do the swimming
          o.face = sin(o.t * 0.6) * 0.16; o.vx = cos(o.face) * 46; o.vy = sin(o.face) * 46;
          o.x = 0; o.y = sin(o.t * 1.1) * 3;
          if (o.ch) ox = o.ch.seg * (o.ch.n - 1) * 0.45;
        }
        if (def.show) def.show(o, dt);
        if (def.anim) def.anim(o, dt);
      } else if (sp.kind === 'decor') {
        const k = max(0, sin(o.t * 0.55)); o.react = k * k * k * k;       // now and then, show what it does when startled
        if (def.update) def.update(o, dt, FAR);
      } else if (def.show) def.show(o, dt);
    } catch (e) { /* keep the page alive */ }
    const sc = clamp(box / (sp.showR * 1.6), 0.45, 2.8);
    u.save(); u.translate(cx + ox * sc, cy + sp.dy * sc); u.scale(sc, sc);
    try {
      def.draw(o, u);
      if (def.glow) { u.globalCompositeOperation = 'lighter'; def.glow(o, u); u.globalCompositeOperation = 'source-over'; }
    } catch (e) { /* a specimen that cannot pose simply does not */ }
    u.restore(); u.globalAlpha = 1; u.globalCompositeOperation = 'source-over';
    return true;
  }
  G.drawSpecimen = drawSpecimen;

  function emblem(u, kind, x, y, s, col) {
    u.save(); u.translate(x, y); u.scale(s, s); u.strokeStyle = col; u.lineWidth = 2; u.lineCap = 'round'; u.lineJoin = 'round';
    if (kind === 'echo') {
      u.beginPath(); u.arc(0, 0, 13, 0, TAU); u.stroke(); u.beginPath(); u.arc(4, -2, 6, 0, TAU); u.stroke();
      u.beginPath(); u.moveTo(0, -13); u.quadraticCurveTo(4, -22, 9, -19); u.stroke();
      for (let i = 1; i <= 2; i++) { u.globalAlpha = 0.5 / i; u.beginPath(); u.arc(0, 0, 13 + i * 9, -0.6, 0.6); u.stroke(); u.beginPath(); u.arc(0, 0, 13 + i * 9, PI - 0.6, PI + 0.6); u.stroke(); }
    } else {
      u.beginPath(); u.moveTo(0, 18); u.quadraticCurveTo(-4, 0, 0, -18); u.stroke();
      for (let i = 0; i < 4; i++) { const yy = 12 - i * 9, sd = i & 1 ? 1 : -1; u.beginPath(); u.moveTo(0, yy); u.quadraticCurveTo(sd * 10, yy - 8, sd * 15, yy - 3); u.quadraticCurveTo(sd * 8, yy + 2, 0, yy); u.stroke(); }
    }
    u.restore(); u.globalAlpha = 1;
  }

  SCREENS.codex = {
    pause: true, page: true,
    open(s) { s.data.tab = G.zone && G.game.state === 'play' ? G.zone.idx : 0; s.data.sel = null; s.data.scroll = 0; },
    update(s) { if (I.back) { I.back = false; G.sfx('back'); G.menu.close(s); } },
    draw(s, u, a) {
      const d = s.data, md = G.meta.data;
      G.veil(u, a, 0.92);
      G.stext(u, 'FIELD NOTES', 70, 48, 26, { color: '#fff', lw: 2.1, spacing: 3, alpha: a });
      const cp = G.meta.codexProgress();
      G.text(u, cp.have + ' OF ' + cp.total + ' CATALOGUED', 72, 104, { size: 10, font: 'mono', weight: 700, color: UI.DIM, spacing: 3, alpha: a });
      // tabs
      let tx = 70;
      TABS.forEach((nm, i) => {
        const w = G.textWidth(u, nm, { size: 11, font: 'mono', weight: 700, spacing: 2 }) + 30;
        const r = im.reg('ct' + i, tx, 124, w, 28), on = d.tab === i;
        u.globalAlpha = a; u.fillStyle = on ? 'rgba(127,230,255,0.2)' : `rgba(127,230,255,${0.04 + r.k * 0.1})`; G.roundRect(u, tx, 124, w, 28, 14); u.fill();
        if (on) { u.strokeStyle = UI.CYAN; u.lineWidth = 1.2; G.roundRect(u, tx, 124, w, 28, 14); u.stroke(); }
        u.globalAlpha = 1;
        G.text(u, nm, tx + w / 2, 143, { size: 11, font: 'mono', weight: 700, color: on ? '#fff' : UI.DIM, align: 'center', spacing: 2, alpha: a });
        if (r.hit) { d.tab = i; d.sel = null; G.sfx('select'); }
        tx += w + 8;
      });
      // entries
      const list = G.CODEX_ORDER.filter(id => { const e = G.CODEX[id]; return d.tab === 5 ? e.kind === 'echo' : e.kind !== 'echo' && e.zone === d.tab; });
      const lx = 70, ly = 172, cols = 2, cw = 250, rh = 43;
      list.forEach((id, i) => {
        const e = G.CODEX[id], seen = !!md.codex[id], x = lx + (i % cols) * (cw + 12), y = ly + floor(i / cols) * (rh + 6);
        if (y > G.H - 70) return;
        const r = im.reg('ce' + id, x, y, cw, rh), on = d.sel === id;
        u.globalAlpha = a;
        u.fillStyle = on ? 'rgba(127,230,255,0.16)' : `rgba(150,215,255,${0.035 + r.k * 0.08})`; G.roundRect(u, x, y, cw, rh, 8); u.fill();
        if (on) { u.strokeStyle = 'rgba(127,230,255,0.8)'; u.lineWidth = 1.2; G.roundRect(u, x, y, cw, rh, 8); u.stroke(); }
        u.globalAlpha = 1;
        G.text(u, seen ? e.name : '? ? ?', x + 16, y + 19, { size: 14, weight: 600, color: seen ? UI.INK : UI.DIM, alpha: a });
        G.text(u, seen ? e.latin : 'not yet observed', x + 16, y + 35, { size: 11, font: 'serif', italic: true, color: UI.DIM, alpha: a * 0.9 });
        if (seen && e.boss) G.text(u, '★', x + cw - 22, y + 29, { size: 14, color: UI.GOLD, alpha: a });
        if (r.hit) { d.sel = id; G.sfx('select'); }
      });
      if (!list.length) G.text(u, 'Nothing here yet.', lx, ly + 30, { size: 14, font: 'serif', italic: true, color: UI.DIM, alpha: a });
      // detail
      const px = 620, py = 124, pw = 590, ph = 540;
      G.panel(u, px, py, pw, ph, a);
      const sel = d.sel && md.codex[d.sel] ? G.CODEX[d.sel] : null;
      if (sel) {
        u.save(); u.beginPath(); u.rect(px + 1, py + 1, pw - 2, 250); u.clip();
        const g = u.createRadialGradient(px + pw / 2, py + 130, 10, px + pw / 2, py + 130, 300);
        const zc = G.ZONES[min(4, sel.zone)].water; g.addColorStop(0, G.css(G.mix(zc[0], zc[1], 0.3), 0.9 * a)); g.addColorStop(1, G.css(zc[1], 0.2 * a));
        u.fillStyle = g; u.fillRect(px, py, pw, 250);
        u.globalAlpha = a;
        if (!drawSpecimen(u, sel.id, px + pw / 2, py + 128, 150, G.rdt)) emblem(u, sel.kind, px + pw / 2, py + 128, 2.6, sel.kind === 'echo' ? '#c9b8ff' : '#9dffb8');
        u.restore(); u.globalAlpha = 1;
        G.text(u, sel.name, px + 30, py + 292, { size: 26, weight: 600, color: '#fff', alpha: a });
        G.text(u, sel.latin, px + 30, py + 318, { size: 15, font: 'serif', italic: true, color: G.mixCss(UI.DIM, UI.INK, 0.4), alpha: a });
        const meta = [sel.size, sel.kind === 'echo' ? 'recovered log' : G.ZONES[min(4, sel.zone)].name.toLowerCase()];
        const n = md.codex[sel.id].n; if (n) meta.push('persuaded ×' + n);
        G.text(u, meta.filter(Boolean).join('   ·   ').toUpperCase(), px + 30, py + 346, { size: 10, font: 'mono', weight: 700, color: UI.CYAN, spacing: 2, alpha: a });
        G.para(u, sel.notes, px + 30, py + 384, pw - 60, { size: 16, font: 'serif', color: UI.INK, alpha: a, lh: 25 });
        G.text(u, sel.kind === 'echo' ? '' : '— WICK-7', px + pw - 30, py + ph - 24, { size: 10, font: 'mono', color: UI.DIM, align: 'right', spacing: 2, alpha: a });
      } else {
        G.para(u, d.sel ? 'Something lives here that I have not had a proper look at yet. Keep the lamp on it for a moment and I will write it up.' : 'Hold the lamp on anything new and it ends up here. Pick an entry to read it.', px + pw / 2, py + ph / 2 - 10, 380, { size: 15, font: 'serif', italic: true, color: UI.DIM, align: 'center', alpha: a, lh: 23 });
      }
      if (im.button(u, 'c_back', 70, G.H - 52, 150, 34, 'BACK', { alpha: a, sound: 'back' })) G.menu.close(s);
    },
  };

  // ================================================================= contact sheet (dev: ?sheet=<zone>) — every specimen of a zone at once
  SCREENS.sheet = {
    draw(s, u, a) {
      u.fillStyle = '#0a2238'; u.fillRect(0, 0, G.W, G.H);
      const z = s.data.zone, ids = G.CODEX_ORDER.filter(id => G.CODEX[id].zone === z && G.CODEX[id].kind !== 'echo');
      const cols = 6, cw = G.W / cols, rh = 176;
      ids.forEach((id, i) => {
        const x = (i % cols) * cw + cw / 2, y = floor(i / cols) * rh + 84;
        const ok = drawSpecimen(u, id, x, y, 120, G.rdt);
        if (!ok) emblem(u, G.CODEX[id].kind, x, y, 1.6, '#9dffb8');
        G.text(u, G.CODEX[id].name, x, y + 78, { size: 11, font: 'mono', color: '#cfe9f5', align: 'center' });
      });
    },
  };

  // ================================================================= workshop
  SCREENS.workshop = {
    pause: true, page: true,
    update(s) { if (I.back) { I.back = false; G.sfx('back'); G.menu.close(s); } },
    draw(s, u, a) {
      const md = G.meta.data, W = G.meta.WORKSHOP, p = G.player;
      G.veil(u, a, 0.92);
      G.stext(u, 'WORKSHOP', 70, 48, 26, { color: '#fff', lw: 2.1, spacing: 3, alpha: a });
      G.text(u, 'ABOARD THE HALCYON  ·  WHAT YOU BUILD HERE STAYS BUILT', 72, 104, { size: 10, font: 'mono', weight: 700, color: UI.DIM, spacing: 3, alpha: a });
      // pearls
      u.globalAlpha = a; u.fillStyle = '#ffeaf6'; u.beginPath(); u.arc(G.W - 86, 62, 8, 0, TAU); u.fill(); u.globalAlpha = 1;
      G.text(u, String(md.pearls), G.W - 104, 70, { size: 26, font: 'mono', weight: 700, color: '#ffeaf6', align: 'right', alpha: a });
      const x0 = 70, y0 = 140, cw = 556, rh = 62;
      W.forEach((w, i) => {
        const x = x0 + (i % 2) * (cw + 28), y = y0 + floor(i / 2) * (rh + 12), lv = G.meta.level(w.id), price = G.meta.price(w), can = price !== null && md.pearls >= price;
        const r = im.reg('ws' + w.id, x, y, cw, rh);
        u.globalAlpha = a; u.fillStyle = `rgba(150,215,255,${0.04 + r.k * 0.09})`; G.roundRect(u, x, y, cw, rh, 10); u.fill();
        u.strokeStyle = `rgba(150,215,255,${0.16 + r.k * 0.5})`; u.lineWidth = 1; G.roundRect(u, x, y, cw, rh, 10); u.stroke(); u.globalAlpha = 1;
        G.text(u, w.name, x + 20, y + 27, { size: 16, weight: 600, color: UI.INK, alpha: a });
        G.text(u, w.desc, x + 20, y + 46, { size: 12, font: 'serif', italic: true, color: UI.DIM, alpha: a });
        for (let k = 0; k < w.max; k++) { u.globalAlpha = a; u.fillStyle = k < lv ? UI.GOLD : 'rgba(160,200,220,0.25)'; u.beginPath(); u.arc(x + cw - 150 + k * 14, y + rh / 2, 4, 0, TAU); u.fill(); u.globalAlpha = 1; }
        if (price === null) G.text(u, 'FITTED', x + cw - 22, y + rh / 2 + 4, { size: 11, font: 'mono', weight: 700, color: UI.GOLD, align: 'right', spacing: 2, alpha: a });
        else {
          u.globalAlpha = a; u.fillStyle = can ? '#ffeaf6' : 'rgba(255,234,246,0.35)'; u.beginPath(); u.arc(x + cw - 62, y + rh / 2, 5, 0, TAU); u.fill(); u.globalAlpha = 1;
          G.text(u, String(price), x + cw - 22, y + rh / 2 + 5, { size: 15, font: 'mono', weight: 700, color: can ? '#ffeaf6' : UI.DIM, align: 'right', alpha: a });
        }
        if (r.hit) { if (G.meta.buy(w.id)) { G.sfx('buy'); p.recalc(); if (G.run) G.run.rerolls = G.meta.level('reroll'); } else G.sfx('deny'); }
      });
      // paint
      const py = y0 + 4 * (rh + 12) + 26;
      G.text(u, 'PAINT', x0, py, { size: 10, font: 'mono', weight: 700, color: UI.DIM, spacing: 3, alpha: a });
      G.PAINTS.forEach((pt, i) => {
        const x = x0 + i * 150, y = py + 16, own = G.meta.paintOwned(pt.id), on = md.paint === pt.id;
        const r = im.reg('pt' + pt.id, x, y, 138, 64);
        u.globalAlpha = a; u.fillStyle = `rgba(150,215,255,${0.04 + r.k * 0.09})`; G.roundRect(u, x, y, 138, 64, 10); u.fill();
        if (on) { u.strokeStyle = UI.CYAN; u.lineWidth = 1.4; G.roundRect(u, x, y, 138, 64, 10); u.stroke(); }
        const g = u.createRadialGradient(x + 28, y + 28, 2, x + 32, y + 32, 17); g.addColorStop(0, G.mixCss(pt.hull, '#ffffff', 0.4)); g.addColorStop(0.5, pt.hull); g.addColorStop(1, pt.shade);
        u.fillStyle = g; u.beginPath(); u.arc(x + 32, y + 32, 16, 0, TAU); u.fill();
        u.fillStyle = '#27303c'; u.beginPath(); u.arc(x + 37, y + 30, 8.5, 0, TAU); u.fill(); u.fillStyle = '#9fe9f7'; u.beginPath(); u.arc(x + 37, y + 30, 6.4, 0, TAU); u.fill();
        u.globalAlpha = 1;
        G.text(u, pt.name.toUpperCase(), x + 58, y + 28, { size: 9, font: 'mono', weight: 700, color: UI.INK, spacing: 1, alpha: a });
        G.text(u, on ? 'in use' : own ? 'owned' : pt.cost + ' pearls', x + 58, y + 45, { size: 11, font: 'serif', italic: true, color: on ? UI.CYAN : own ? UI.DIM : (md.pearls >= pt.cost ? '#ffeaf6' : UI.DIM), alpha: a });
        if (r.hit) {
          if (own) { md.paint = pt.id; G.meta.save(); G.sfx('select'); }
          else if (G.meta.buyPaint(pt.id)) G.sfx('buy'); else G.sfx('deny');
          p.paint = G.PAINTS.find(q => q.id === md.paint) || G.PAINTS[0];
        }
      });
      if (md.shades) {
        if (im.button(u, 'w_shades', G.W - 330, py + 104, 260, 34, 'SUNGLASSES  ·  ' + (md.shadesOn ? 'ON' : 'OFF'), { alpha: a })) { md.shadesOn = !md.shadesOn; p.shades = md.shadesOn; G.meta.save(); }
      }
      if (im.button(u, 'w_back', 70, G.H - 60, 150, 34, 'BACK', { alpha: a, sound: 'back' })) G.menu.close(s);
    },
  };
})();
