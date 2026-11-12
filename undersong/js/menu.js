'use strict';
/* UNDERSONG — menu: a tiny immediate-mode UI (mouse, keyboard and pad), the screen stack,
   and the in-dive screens: module choice, pause, settings. Title/codex/workshop live in screens.js. */
(function () {
  const { sin, cos, min, max, abs, floor, PI, round } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU, I = G.input, UI = G.UI;

  // ================================================================= immediate-mode widgets
  const im = G.im = {
    items: [], focus: null, enabled: true, anim: {},
    begin(enabled) { this.items.length = 0; this.enabled = enabled !== false; },
    // register a hit box; returns {hot, hit, k} where k is a smoothed 0..1 highlight
    reg(id, x, y, w, h) {
      const m = I.mouse, inside = this.enabled && m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
      if (this.enabled) this.items.push({ id, x, y, w, h });
      if (inside && G.time - m.moved < 0.25 && this.focus !== id) { this.focus = id; G.sfx('hover'); }
      const hot = this.enabled && this.focus === id;
      let hit = false;
      if (this.enabled && ((inside && m.pressed[0]) || (hot && I.confirm && !m.pressed[0]))) { hit = true; m.pressed[0] = false; I.confirm = false; }
      const a = this.anim[id] || (this.anim[id] = { k: 0 });
      a.k = damp(a.k, hot ? 1 : 0, 16, G.rdt);
      return { hot, hit, k: a.k, inside };
    },
    end() {
      if (!this.enabled || !this.items.length) return;
      const nx = I.navX, ny = I.navY;
      if (!nx && !ny) return;
      const cur = this.items.find(i => i.id === this.focus);
      if (!cur) { this.focus = this.items[0].id; G.sfx('hover'); return; }
      const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
      let best = null, bs = 1e9;
      for (const it of this.items) {
        if (it === cur) continue;
        const dx = it.x + it.w / 2 - cx, dy = it.y + it.h / 2 - cy, along = dx * nx + dy * ny;
        if (along < 8) continue;
        const across = abs(dx * ny) + abs(dy * nx), score = along + across * 2.5;
        if (score < bs) { bs = score; best = it; }
      }
      if (best) { this.focus = best.id; G.sfx('hover'); }
    },
    // outlined pill button with a mono label
    button(u, id, x, y, w, h, label, o) {
      o = o || {};
      const r = this.reg(id, x, y, w, h), col = o.color || UI.CYAN, dis = !!o.disabled;
      u.globalAlpha = (o.alpha === undefined ? 1 : o.alpha) * (dis ? 0.4 : 1);
      u.fillStyle = G.css(col, 0.06 + r.k * 0.16); G.roundRect(u, x, y, w, h, h / 2); u.fill();
      u.strokeStyle = G.css(col, 0.4 + r.k * 0.6); u.lineWidth = 1.2 + r.k * 0.6; G.roundRect(u, x, y, w, h, h / 2); u.stroke();
      G.text(u, label, x + w / 2, y + h / 2 + 4.5, { size: o.size || 12, font: 'mono', weight: 700, color: r.k > 0.3 ? '#ffffff' : UI.INK, align: 'center', spacing: 2 });
      u.globalAlpha = 1;
      if (r.hit && !dis) { G.sfx(o.sound || 'select'); return true; }
      return false;
    },
    // big stroke-face menu entry
    entry(u, id, x, y, label, size, o) {
      o = o || {};
      const w = G.stextWidth(label, size, 2.6), align = o.align || 'left', bx = align === 'center' ? x - w / 2 : x;
      const r = this.reg(id, bx - 16, y - 10, w + 32, size + 20), al = o.alpha === undefined ? 1 : o.alpha;
      u.globalAlpha = al * r.k; u.strokeStyle = UI.CYAN; u.lineWidth = 1.5;
      u.beginPath(); u.moveTo(bx, y + size + 8); u.lineTo(bx + w * r.k, y + size + 8); u.stroke();
      u.globalAlpha = 1;
      G.stext(u, label, bx + r.k * 6, y, size, { color: r.k > 0.3 ? '#ffffff' : G.mixCss(UI.DIM, UI.INK, 0.6), lw: 1.6 + r.k * 0.5, spacing: 2.6, alpha: al * (o.disabled ? 0.35 : 1) });
      if (o.note) G.text(u, o.note, bx + w + 22, y + size * 0.72, { size: 11, font: 'mono', color: UI.DIM, alpha: al, spacing: 1 });
      if (r.hit && !o.disabled) { G.sfx(o.sound || 'select'); return true; }
      return false;
    },
    slider(u, id, x, y, w, v, label) {
      const r = this.reg(id, x - 8, y - 14, w + 16, 30), m = I.mouse;
      if (this.enabled && r.inside && m.down[0]) v = clamp((m.x - x) / w, 0, 1);
      if (r.hot && this.enabled) { if (I.navX) { v = clamp(round((v + I.navX * 0.1) * 10) / 10, 0, 1); I.navX = 0; } }
      u.fillStyle = 'rgba(150,215,255,0.18)'; G.roundRect(u, x, y - 2, w, 4, 2); u.fill();
      u.fillStyle = G.mixCss(UI.DIM, UI.CYAN, 0.5 + r.k * 0.5); G.roundRect(u, x, y - 2, w * v, 4, 2); u.fill();
      u.fillStyle = '#fff'; u.beginPath(); u.arc(x + w * v, y, 6 + r.k * 2, 0, TAU); u.fill();
      G.text(u, label, x - 18, y + 4, { size: 12, font: 'mono', weight: 700, color: r.k > 0.3 ? '#fff' : UI.INK, align: 'right', spacing: 1.5 });
      G.text(u, round(v * 100) + '', x + w + 18, y + 4, { size: 12, font: 'mono', color: UI.DIM });
      return v;
    },
    // label on the left, current value on the right; click cycles
    option(u, id, x, y, w, label, value) {
      const r = this.reg(id, x - 190, y - 14, w + 250, 30);
      G.text(u, label, x - 18, y + 4, { size: 12, font: 'mono', weight: 700, color: r.k > 0.3 ? '#fff' : UI.INK, align: 'right', spacing: 1.5 });
      u.strokeStyle = G.css(UI.CYAN, 0.3 + r.k * 0.7); u.lineWidth = 1.2; G.roundRect(u, x, y - 12, w, 24, 12); u.stroke();
      G.text(u, value, x + w / 2, y + 4, { size: 11, font: 'mono', weight: 700, color: r.k > 0.3 ? '#fff' : UI.CYAN, align: 'center', spacing: 1.5 });
      if (r.hit) { G.sfx('select'); return true; }
      return false;
    },
  };

  G.panel = function (u, x, y, w, h, alpha) {
    u.globalAlpha = alpha === undefined ? 1 : alpha;
    u.fillStyle = UI.PANEL; G.roundRect(u, x, y, w, h, 10); u.fill();
    u.strokeStyle = UI.LINE; u.lineWidth = 1; G.roundRect(u, x, y, w, h, 10); u.stroke();
    u.globalAlpha = 1;
  };

  // ================================================================= screen stack
  const SCREENS = G.SCREENS = {};
  const menu = G.menu = {
    stack: [],
    open(id, data) {
      const def = SCREENS[id];
      if (!def) { console.warn('unknown screen', id); return null; }
      const s = { id, def, t: 0, closing: 0, data: data || {} };
      this.stack.push(s);
      im.focus = null;
      if (def.open) def.open(s);
      return s;
    },
    close(s) { s = s || this.top(); if (s && !s.closing) { s.closing = 0.0001; im.focus = null; } },
    closeAll() { for (const s of this.stack) if (!s.closing) s.closing = 0.0001; },
    top() { for (let i = this.stack.length - 1; i >= 0; i--) if (!this.stack[i].closing) return this.stack[i]; return null; },
    has(id) { return this.stack.some(s => s.id === id && !s.closing); },
    active() { return this.stack.length > 0; },
    pausing() { return this.stack.some(s => s.def.pause); },
    update(dt) {
      for (let i = this.stack.length - 1; i >= 0; i--) {
        const s = this.stack[i];
        s.t += dt;
        if (s.closing) { s.closing += dt; if (s.closing > 0.2) { this.stack.splice(i, 1); if (s.def.closed) s.def.closed(s); } }
      }
      const top = this.top();
      if (top && top.def.update) top.def.update(top, dt);
    },
    draw(u) {
      const top = this.top();
      for (const s of this.stack) {
        const a = min(1, s.t / 0.22) * (s.closing ? max(0, 1 - s.closing / 0.2) : 1);
        im.begin(s === top);
        s.def.draw(s, u, a, s === top);
        im.end();
      }
    },
  };

  // dim + desaturate the world behind a pausing screen
  function veil(u, a, strength) {
    u.fillStyle = `rgba(2,8,16,${(strength || 0.6) * a})`;
    u.fillRect(0, 0, G.W, G.H);
  }
  G.veil = veil;

  // ================================================================= module card
  G.drawModuleCard = function (u, id, x, y, w, h, k, alpha, o) {
    o = o || {};
    const d = G.MODULES[id], rar = G.RARITY[d.rarity], p = G.player, have = p.mods[id] || 0;
    u.save(); u.globalAlpha = alpha;
    u.translate(x + w / 2, y + h / 2 - k * 10); u.scale(1 + k * 0.03, 1 + k * 0.03); u.translate(-w / 2, -h / 2);
    const g = u.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(12,30,50,0.95)'); g.addColorStop(1, 'rgba(4,12,24,0.95)');
    u.fillStyle = g; G.roundRect(u, 0, 0, w, h, 12); u.fill();
    u.strokeStyle = G.css(rar.color, 0.35 + k * 0.65); u.lineWidth = 1.3 + k * 1.2; G.roundRect(u, 0, 0, w, h, 12); u.stroke();
    u.fillStyle = rar.color; G.roundRect(u, 16, 14, 26, 3, 1.5); u.fill();
    G.text(u, rar.name, 50, 20, { size: 9, font: 'mono', weight: 700, color: rar.color, spacing: 2 });
    if (o.key) G.text(u, o.key, w - 18, 21, { size: 10, font: 'mono', weight: 700, color: UI.DIM, align: 'right' });
    // icon in a ring
    const iy = 92;
    u.strokeStyle = G.css(rar.color, 0.25 + k * 0.3); u.lineWidth = 1; u.beginPath(); u.arc(w / 2, iy, 40, 0, TAU); u.stroke();
    u.globalAlpha = alpha * (0.12 + k * 0.1); u.fillStyle = rar.color; u.beginPath(); u.arc(w / 2, iy, 40, 0, TAU); u.fill(); u.globalAlpha = alpha;
    G.modIcon(u, d.icon, w / 2, iy, 2.2 + k * 0.15, rar.color);
    G.text(u, d.name, w / 2, 164, { size: 19, weight: 600, color: '#ffffff', align: 'center' });
    // stack pips
    if (d.max > 1) {
      const pw = d.max * 12 - 4;
      for (let i = 0; i < d.max; i++) { u.fillStyle = i < have ? rar.color : i === have ? '#ffffff' : 'rgba(160,200,220,0.25)'; u.beginPath(); u.arc(w / 2 - pw / 2 + 4 + i * 12, 180, i === have ? 3.4 : 2.6, 0, TAU); u.fill(); }
    } else if (!have) G.text(u, 'UNIQUE', w / 2, 184, { size: 8, font: 'mono', weight: 700, color: UI.DIM, align: 'center', spacing: 2 });
    G.para(u, d.desc, w / 2, 212, w - 44, { size: 14, color: UI.INK, align: 'center', lh: 20 });
    const fl = G.wrapText(u, d.flavor, w - 48, { size: 12, font: 'serif', italic: true });
    G.para(u, d.flavor, w / 2, h - 22 - (fl.length - 1) * 16, w - 48, { size: 12, font: 'serif', italic: true, color: UI.DIM, align: 'center', lh: 16 });
    if (o.price !== undefined) {
      const can = o.afford;
      u.fillStyle = 'rgba(2,8,16,0.9)'; G.roundRect(u, w / 2 - 38, -13, 76, 26, 13); u.fill();
      u.strokeStyle = can ? '#ffeaf6' : UI.WARN; u.lineWidth = 1.2; G.roundRect(u, w / 2 - 38, -13, 76, 26, 13); u.stroke();
      u.fillStyle = '#ffeaf6'; u.beginPath(); u.arc(w / 2 - 18, 0, 5, 0, TAU); u.fill();
      G.text(u, String(o.price), w / 2 + 2, 5, { size: 14, font: 'mono', weight: 700, color: can ? '#ffeaf6' : UI.WARN });
    }
    u.restore();
  };

  // ================================================================= choose a module
  // data: {title, sub, opts (for offerModules), ids (preset), onPick, canSkip}
  SCREENS.levelup = {
    pause: true,
    open(s) {
      const d = s.data;
      if (!d.ids) d.ids = G.offerModules(3, d.opts);
      d.picked = -1; d.pt = 0;
      d.title = d.title || 'LEVEL ' + G.player.level;
      d.sub = d.sub || 'CHOOSE A MODULE';
      if (!d.quiet) G.sfx('levelup');
      if (!d.ids.length) { G.player.heal(1); G.pickups.loot(G.player.x, G.player.y, 0, 5); s.closing = 0.0001; }
    },
    pick(s, i) {
      const d = s.data;
      if (d.picked >= 0) return;
      d.picked = i; d.pt = 0;
      G.sfx('module');
    },
    update(s, dt) {
      const d = s.data;
      if (d.picked >= 0) {
        d.pt += dt;
        if (d.pt > 0.42 && !s.closing) {
          const id = d.ids[d.picked];
          G.player.addModule(id);
          if (d.onPick) d.onPick(id);
          G.menu.close(s);
        }
        return;
      }
      for (let i = 0; i < d.ids.length; i++) if (I.hit('Digit' + (i + 1)) || I.hit('Numpad' + (i + 1))) this.pick(s, i);
    },
    draw(s, u, a, top) {
      const d = s.data, n = d.ids.length, w = 270, h = 356, gap = 26;
      veil(u, a, 0.62);
      const rise = (1 - G.ease.outCubic(min(1, s.t / 0.35))) * 26;
      G.stext(u, d.title, G.W / 2, 74 - rise * 0.4, 30, { align: 'center', color: '#ffffff', lw: 2.2, spacing: 3, alpha: a, reveal: s.t * 26 });
      G.text(u, d.sub, G.W / 2, 136, { size: 11, font: 'mono', weight: 700, color: UI.DIM, align: 'center', spacing: 4, alpha: a });
      const x0 = G.W / 2 - (n * w + (n - 1) * gap) / 2, y0 = 170;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (w + gap), st = clamp((s.t - 0.08 - i * 0.07) / 0.3, 0, 1), up = (1 - G.ease.outBack(st)) * 50;
        const r = im.reg('lv' + i, x, y0, w, h);
        let k = r.k, al = a * st;
        if (d.picked >= 0) { if (i === d.picked) k = 1; else al *= max(0, 1 - d.pt * 4); }
        G.drawModuleCard(u, d.ids[i], x, y0 + up, w, h, k, al, { key: String(i + 1) });
        if (r.hit) this.pick(s, i);
        if (d.picked === i) { u.globalAlpha = max(0, 1 - d.pt * 3) * 0.6; u.fillStyle = '#fff'; G.roundRect(u, x, y0 - 10, w, h, 12); u.fill(); u.globalAlpha = 1; }
      }
      if (d.picked < 0 && G.run && G.run.rerolls > 0 && !d.noReroll && s.t > 0.4) {
        if (im.button(u, 'reroll', G.W / 2 - 100, y0 + h + 28, 200, 34, 'REROLL  ·  ' + G.run.rerolls, { alpha: a })) {
          G.run.rerolls--;
          d.ids = G.offerModules(3, Object.assign({}, d.opts, { exclude: new Set(d.ids) }));
          if (!d.ids.length) d.ids = G.offerModules(3, d.opts);
          s.t = 0.08;
        }
      } else if (d.canSkip && d.picked < 0 && s.t > 0.4) {
        if (im.button(u, 'skip', G.W / 2 - 100, y0 + h + 28, 200, 34, 'LEAVE IT', { alpha: a, sound: 'back' })) G.menu.close(s);
      }
    },
  };

  // ================================================================= pause
  SCREENS.pause = {
    pause: true,
    open() { G.audio.muffle(0.75); G.sfx('select'); },
    closed() { G.audio.muffle(0); },
    update(s) { if (I.back || I.pause) { I.back = I.pause = false; G.sfx('back'); G.menu.close(s); } },
    draw(s, u, a) {
      veil(u, a, 0.7);
      const p = G.player, x = 150;
      G.stext(u, 'PAUSED', x, 150, 34, { color: '#fff', lw: 2.4, spacing: 3.4, alpha: a });
      G.text(u, G.zone.def.name + '  ·  ' + G.fmtInt(G.world.depthAt(p.y)) + ' M', x, 216, { size: 11, font: 'mono', color: UI.DIM, spacing: 3, alpha: a });
      let y = 270;
      if (im.entry(u, 'p_resume', x, y, 'RESUME', 20, { alpha: a })) G.menu.close(s);
      y += 54; if (im.entry(u, 'p_codex', x, y, 'FIELD NOTES', 20, { alpha: a })) G.menu.open('codex');
      y += 54; if (im.entry(u, 'p_set', x, y, 'SETTINGS', 20, { alpha: a })) G.menu.open('settings');
      y += 54;
      if (im.entry(u, 'p_quit', x, y, s.data.sure ? 'REALLY SURFACE?' : 'ABANDON DIVE', 20, { alpha: a, sound: 'back' })) {
        if (s.data.sure) { G.menu.closeAll(); G.game.abandon(); } else s.data.sure = true;
      }
      // what you are carrying
      const px = 660, py = 150, cols = 2;
      G.text(u, 'MODULES', px, py, { size: 10, font: 'mono', weight: 700, color: UI.DIM, spacing: 3, alpha: a });
      if (!p.modList.length) G.text(u, 'Nothing fitted yet.', px, py + 34, { size: 14, font: 'serif', italic: true, color: UI.DIM, alpha: a });
      p.modList.forEach((id, i) => {
        const d = G.MODULES[id], rar = G.RARITY[d.rarity], cx = px + (i % cols) * 250, cy = py + 30 + floor(i / cols) * 40;
        const r = im.reg('pm' + i, cx - 6, cy - 16, 240, 36);
        u.globalAlpha = a * (0.1 + r.k * 0.16); u.fillStyle = rar.color; G.roundRect(u, cx - 6, cy - 16, 240, 36, 8); u.fill(); u.globalAlpha = 1;
        u.globalAlpha = a; G.modIcon(u, d.icon, cx + 14, cy + 2, 0.9, rar.color); u.globalAlpha = 1;
        G.text(u, d.name + (p.mods[id] > 1 ? '  ×' + p.mods[id] : ''), cx + 36, cy + 7, { size: 14, weight: 500, color: UI.INK, alpha: a });
        if (r.hot) s.data.tip = id;
      });
      if (s.data.tip && p.mods[s.data.tip]) {
        const d = G.MODULES[s.data.tip];
        G.para(u, d.desc, px, 600, 480, { size: 14, color: UI.INK, alpha: a, lh: 20 });
        G.text(u, d.flavor, px, 656, { size: 12, font: 'serif', italic: true, color: UI.DIM, alpha: a });
      }
      G.text(u, `${I.label('move')} swim   ${I.label('fire')} pulse   ${I.label('dash')} dash   ${I.label('flare')} flare   ${I.label('sonar')} sonar   ${I.label('interact')} use`, x, G.H - 44, { size: 10, font: 'mono', color: UI.DIM, spacing: 1, alpha: a });
    },
  };

  // ================================================================= settings
  const GFX = ['low', 'medium', 'high'], SHAKE = [0, 0.5, 1];
  SCREENS.settings = {
    pause: true,
    update(s) { if (I.back) { I.back = false; G.sfx('back'); G.menu.close(s); } },
    closed() { G.meta.save(); },
    draw(s, u, a) {
      veil(u, a, 0.86);
      const S = G.settings, cx = G.W / 2, x = cx - 40, w = 260;
      G.stext(u, 'SETTINGS', cx, 84, 28, { align: 'center', color: '#fff', lw: 2.2, spacing: 3, alpha: a });
      u.globalAlpha = a;
      let y = 190;
      const before = S.master + S.music + S.sfx;
      S.master = im.slider(u, 's_ma', x, y, w, S.master, 'MASTER'); y += 44;
      S.music = im.slider(u, 's_mu', x, y, w, S.music, 'MUSIC'); y += 44;
      S.sfx = im.slider(u, 's_fx', x, y, w, S.sfx, 'EFFECTS'); y += 56;
      if (before !== S.master + S.music + S.sfx) G.audio.setVolumes();
      if (im.option(u, 's_gfx', x, y, w, 'GRAPHICS', S.gfx.toUpperCase())) { S.gfx = GFX[(GFX.indexOf(S.gfx) + 1) % 3]; G.post.applyQuality(); G.forceResize(); } y += 40;
      if (im.option(u, 's_shake', x, y, w, 'SCREEN SHAKE', S.shake === 0 ? 'OFF' : S.shake < 1 ? 'GENTLE' : 'FULL')) S.shake = SHAKE[(SHAKE.indexOf(S.shake) + 1) % 3]; y += 40;
      if (im.option(u, 's_flash', x, y, w, 'BRIGHT FLASHES', S.flashes ? 'ON' : 'OFF')) S.flashes = !S.flashes; y += 40;
      if (im.option(u, 's_calm', x, y, w, 'CALM SEAS', S.calm ? 'ON' : 'OFF')) { S.calm = !S.calm; G.player.recalc(); if (S.calm && G.game.state === 'play') G.player.hull = min(G.player.st.maxHull, G.player.hull + 3); } y += 40;
      if (im.option(u, 's_hint', x, y, w, 'CONTROL HINTS', S.hints ? 'ON' : 'OFF')) S.hints = !S.hints; y += 40;
      if (im.option(u, 's_full', x, y, w, 'FULLSCREEN', document.fullscreenElement ? 'ON' : 'OFF')) G.toggleFullscreen(); y += 40;
      G.text(u, S.calm ? 'Calm seas: +3 hull, softer creatures, slower projectiles.' : 'Calm seas is an easier dive, for when you just want to look around.', cx, y + 14, { size: 12, font: 'serif', italic: true, color: UI.DIM, align: 'center' });
      u.globalAlpha = 1;
      if (im.button(u, 's_back', cx - 80, G.H - 84, 160, 36, 'BACK', { alpha: a, sound: 'back' })) G.menu.close(s);
    },
  };

  G.toggleFullscreen = function () {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else { const el = document.getElementById('stage'); const r = el.requestFullscreen && el.requestFullscreen(); if (r && r.catch) r.catch(() => { }); }
    } catch (e) { /* not available in this frame */ }
  };
})();
