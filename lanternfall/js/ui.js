'use strict';
// ============================================================================
// UI: HUD, modal screens, maps, menus
// ============================================================================
(function () {
  const G = window.G;
  const I = () => G.Input;
  const W = G.W, H = G.H;

  const ui = (G.ui = {
    stack: [],
    notes: [],
    banners: [],
    get modal() { return this.stack.length ? this.stack[this.stack.length - 1] : null; },
    open(name, data) {
      const S = SCREENS[name];
      if (!S) return;
      const m = Object.assign({ name, t: 0, sel: 0, data: data || {} }, S);
      if (m.init) m.init(m);
      this.stack.push(m);
      G.Input.clearAll();
      G.Audio.play('uiSelect', { vol: 0.5 });
    },
    close(m) {
      const i = this.stack.indexOf(m || this.modal);
      if (i >= 0) this.stack.splice(i, 1);
      G.Input.clearAll();
    },
    closeAll() { this.stack.length = 0; },
    confirm(text, cb) { this.open('confirm', { text, cb }); },
    update(dt) {
      const m = this.modal;
      if (m) { m.t += dt; m.update(m, dt); }
      for (let i = this.notes.length - 1; i >= 0; i--) { this.notes[i].t -= dt; if (this.notes[i].t <= 0) this.notes.splice(i, 1); }
      for (let i = this.banners.length - 1; i >= 0; i--) { this.banners[i].t += dt; if (this.banners[i].t > this.banners[i].dur) this.banners.splice(i, 1); }
    },
    draw(ctx) {
      for (const m of this.stack) m.draw(ctx, m);
    },
    notify(text) {
      if (this.notes.length && this.notes[0].text === text) { this.notes[0].t = 4; return; }
      this.notes.unshift({ text, t: 4 });
      if (this.notes.length > 4) this.notes.pop();
    },
    banner(title, sub, color, dur) {
      this.banners.push({ title, sub, color: color || '#ffd080', t: 0, dur: dur || 3.5 });
    },
  });

  // ---------------------------------------------------------------- helpers
  function menuNav(m, n, opts) {
    const In = I();
    opts = opts || {};
    if (In.pressed[opts.h ? 'mleft' : 'mup']) { m.sel = (m.sel - 1 + n) % n; G.Audio.play('uiMove'); }
    if (In.pressed[opts.h ? 'mright' : 'mdown']) { m.sel = (m.sel + 1) % n; G.Audio.play('uiMove'); }
    // mouse hover
    if (opts.rects && In.mouse.moved) {
      for (let i = 0; i < opts.rects.length; i++) {
        const r = opts.rects[i];
        if (r && In.mouse.x >= r.x && In.mouse.x < r.x + r.w && In.mouse.y >= r.y && In.mouse.y < r.y + r.h) { if (m.sel !== i) { m.sel = i; } }
      }
      In.mouse.moved = false;
    }
  }
  function confirmPressed() {
    const In = I();
    return In.pressed.confirm;
  }
  function cancelPressed() {
    const In = I();
    return In.pressed.cancel;
  }
  function dim(ctx, a) {
    ctx.fillStyle = 'rgba(4,3,8,' + (a === undefined ? 0.75 : a) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  function title(ctx, text, y, color) {
    G.text(ctx, text, W / 2, y, color || '#ffd080', { align: 'center', scale: 2, outline: '#000' });
  }
  function button(ctx, x, y, w, h, label, selected, opts) {
    opts = opts || {};
    G.panel(ctx, x, y, w, h, { bg: selected ? 'rgba(80,50,30,0.95)' : 'rgba(20,16,28,0.9)', border: selected ? '#ffb060' : '#4a3a5a', hi: selected ? '#ffd090' : '#6a5a7a', corner: selected, cornerColor: '#ffe0a0' });
    G.text(ctx, label, x + (opts.left ? 8 : w / 2), y + Math.round(h / 2) - 4, opts.disabled ? '#6a6070' : selected ? '#ffffff' : '#c8c0d0', { align: opts.left ? 'left' : 'center' });
    return { x, y, w, h };
  }
  G.drawKeyHint = (ctx, x, y, act, label, align) => {
    const k = G.Input.keyName(act);
    const txt = '[#ffd080][' + k + '][] ' + label;
    G.text(ctx, txt, x, y, '#c8c0d0', { align: align || 'left', outline: '#000' });
  };
  function tooltip(ctx, inst, x, y, w, player, header) {
    const lines = G.itemTooltip(inst, player);
    const name = G.itemName(inst);
    const wrapped = [];
    for (const l of lines) for (const wl of G.wrap(l, w - 16)) wrapped.push(wl);
    const h = 30 + wrapped.length * 10 + (header ? 12 : 0);
    if (y + h > H - 4) y = H - 4 - h;
    if (y < 4) y = 4;
    G.panel(ctx, x, y, w, h, { border: G.QUALITY_COLORS[inst.q], hi: G.shade(G.QUALITY_COLORS[inst.q], -0.3), cornerColor: G.QUALITY_COLORS[inst.q] });
    let yy = y + 6;
    if (header) { G.text(ctx, header, x + 8, yy, '#8a8098'); yy += 12; }
    ctx.drawImage(G.itemIcon(inst.id), x + 8, yy - 2);
    G.text(ctx, name, x + 28, yy + 2, G.QUALITY_COLORS[inst.q]);
    yy += 20;
    for (const l of wrapped) { G.text(ctx, l, x + 8, yy, '#c8c0d0'); yy += 10; }
    return h;
  }
  G.drawTooltip = tooltip;

  // ================================================================ HUD
  G.drawHUD = (ctx) => {
    const p = G.world.player;
    if (!p) return;
    const game = G.game;
    // --- health bar
    const hx = 8, hy = 8, hw = 150, hh = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(hx - 2, hy - 2, hw + 4, hh + 4);
    const frac = Math.max(0, p.hp) / p.maxHp;
    const rallyFrac = Math.min(1, (Math.max(0, p.hp) + p.rally) / p.maxHp);
    G.bar(ctx, hx, hy, hw, hh, frac, p.curse > 0 ? '#a050e0' : '#d83a3a', '#2a1418', rallyFrac, '#e89040');
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(hx, hy, Math.round(hw * frac), 2);
    G.text(ctx, Math.ceil(Math.max(0, p.hp)) + ' / ' + p.maxHp, hx + hw / 2, hy + 1, '#ffffff', { align: 'center', outline: '#300808' });
    // flask
    let fx = hx;
    const fy = hy + hh + 5;
    for (let i = 0; i < p.flaskMax; i++) {
      const full = i < p.flask;
      ctx.fillStyle = '#2a2230';
      ctx.fillRect(fx, fy, 8, 11);
      ctx.fillStyle = full ? '#50d060' : '#3a3a40';
      ctx.fillRect(fx + 1, fy + 4, 6, 6);
      ctx.fillStyle = '#c0b8a0';
      ctx.fillRect(fx + 2, fy, 4, 3);
      if (full) { ctx.fillStyle = '#b0ffb0'; ctx.fillRect(fx + 2, fy + 5, 1, 2); }
      fx += 10;
    }
    G.text(ctx, '[' + G.Input.keyName('heal') + ']', fx + 2, fy + 2, '#8a8098', { outline: '#000' });
    // gold & embers
    const gy = fy + 15;
    drawCoin(ctx, hx, gy);
    G.text(ctx, G.fmtNum(p.gold), hx + 10, gy, game.goldFlash > 0 ? '#ffffff' : '#ffd24a', { outline: '#000' });
    drawEmber(ctx, hx + 58, gy);
    G.text(ctx, '' + p.embers, hx + 68, gy, game.emberFlash > 0 ? '#ffffff' : '#ff9a3c', { outline: '#000' });
    // scroll stats
    const sy = gy + 12;
    let sx = hx;
    for (const k of ['fury', 'cunning', 'vigor']) {
      ctx.fillStyle = G.STAT_COLORS[k];
      ctx.fillRect(sx, sy + 1, 6, 6);
      ctx.fillStyle = '#000';
      ctx.fillRect(sx + 2, sy + 3, 2, 2);
      G.text(ctx, '' + p.stats[k], sx + 9, sy, G.FONT_COLORS[k], { outline: '#000' });
      sx += 26;
    }
    // curse
    if (p.curse > 0) {
      G.text(ctx, '★ CURSED: ' + p.curse + ' kills', hx, sy + 12, '#c080ff', { outline: '#000' });
    }
    // buffs
    let by = sy + (p.curse > 0 ? 24 : 12);
    if (p.kindledT > 0) { G.text(ctx, 'Kindled ' + p.kindledT.toFixed(1), hx, by, '#ff8060', { outline: '#000' }); by += 10; }
    if (p.ward) { G.text(ctx, 'Salt Ward', hx, by, '#c0e8ff', { outline: '#000' }); by += 10; }
    // --- equipment slots (bottom left)
    const slots = [
      [p.weapons[0], 'attack1', 0, 'w'],
      [p.weapons[1], 'attack2', 1, 'w'],
      [p.skills[0], 'skill1', 0, 's'],
      [p.skills[1], 'skill2', 1, 's'],
    ];
    let ex = 8;
    const ey = H - 32;
    for (const [inst, act, idx, type] of slots) {
      G.panel(ctx, ex, ey, 24, 24, { bg: 'rgba(10,8,16,0.85)', border: inst ? G.QUALITY_COLORS[inst.q] : '#3a3040', hi: '#2a2230', corner: false });
      if (inst) {
        ctx.drawImage(G.itemIcon(inst.id), ex + 4, ey + 4);
        if (type === 's' && p.cds[idx] > 0) {
          const f = p.cds[idx] / p.cdMax[idx];
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(ex + 1, ey + 1 + Math.round(22 * (1 - f)), 22, Math.round(22 * f));
          G.text(ctx, '' + Math.ceil(p.cds[idx]), ex + 12, ey + 9, '#ffffff', { align: 'center', outline: '#000' });
        }
        if (type === 'w' && p.reload[idx] > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(ex + 1, ey + 1, 22, 22);
          G.text(ctx, 'RLD', ex + 12, ey + 9, '#ffe060', { align: 'center', outline: '#000' });
        }
        const d = G.ITEMS[inst.id];
        ctx.fillStyle = G.STAT_COLORS[d.stats[0]];
        ctx.fillRect(ex + 2, ey + 20, 4, 2);
        if (d.stats[1]) { ctx.fillStyle = G.STAT_COLORS[d.stats[1]]; ctx.fillRect(ex + 6, ey + 20, 4, 2); }
      }
      G.text(ctx, G.Input.keyName(act), ex + 12, ey - 9, '#8a8098', { align: 'center', outline: '#000' });
      ex += 28;
    }
    // mutations
    let mx = ex + 6;
    for (const id of p.muts) {
      const M = G.MUTATIONS[id];
      G.panel(ctx, mx, ey + 4, 16, 16, { bg: 'rgba(10,8,16,0.85)', border: G.STAT_COLORS[M.stat], hi: '#2a2230', corner: false });
      G.text(ctx, M.name[0], mx + 8, ey + 8, G.FONT_COLORS[M.stat], { align: 'center' });
      mx += 19;
    }
    // --- minimap / biome info (top right)
    drawMinimap(ctx, p);
    // --- run timer & biome
    const L = G.world.level;
    const bname = L.biome.name;
    G.text(ctx, bname, W - 8, 90, '#c8b8a0', { align: 'right', outline: '#000' });
    G.text(ctx, G.fmtTime(game.runTime) + (L.tier ? '   Tier ' + G.roman(L.tier) : ''), W - 8, 100, '#8a8098', { align: 'right', outline: '#000' });
    // boss / guardian bar
    const boss = G.world.boss && !G.world.boss.dead && G.world.boss.state !== 'idle' ? G.world.boss : G.world.enemies.find((e) => e.guardian && e.aggro && !e.dead && !e.dying);
    if (boss && boss.state !== 'dying') {
      const bw = 300, bx = W / 2 - bw / 2, byy = H - 22;
      G.text(ctx, boss.name, W / 2, byy - 12, '#ffd8b0', { align: 'center', outline: '#000' });
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx - 2, byy - 2, bw + 4, 10);
      G.bar(ctx, bx, byy, bw, 6, boss.hp / boss.maxHp, '#c83040', '#2a1014');
      if (boss.isBoss && boss.def.phases) for (const th of boss.def.phases) { ctx.fillStyle = '#ffd080'; ctx.fillRect(bx + Math.round(bw * th), byy - 1, 1, 8); }
      if (boss.isBoss) {
        ctx.fillStyle = '#ffe060';
        ctx.fillRect(bx, byy + 6, Math.round(bw * Math.min(1, boss.stag / boss.def.stagger)), 1);
      }
    }
    // interaction prompt
    if (game.prompt && !G.ui.modal) {
      const o = game.prompt;
      const cx = G.cam.rx, cy = G.cam.ry;
      const text = '[#ffd080][' + G.Input.keyName('interact') + '][] ' + o.text;
      const tw = G.textWidth(text);
      const px = Math.round(o.obj.cx - cx), py = Math.round(o.obj.y - cy) - 18;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(px - tw / 2 - 4, py - 3, tw + 8, 13);
      G.text(ctx, text, px, py, '#ffffff', { align: 'center' });
    }
    // item tooltip when near
    if (game.nearItem && !G.ui.modal) {
      const it = game.nearItem.inst;
      const cur = G.ITEMS[it.id].kind === 'skill' ? p.skills : p.weapons;
      let th = tooltip(ctx, it, W - 196, 116, 188, p, 'ON THE GROUND');
      if (cur[0] && cur[1]) G.text(ctx, '[gray]Both slots full - you will choose which to swap.[]', W - 192, 116 + th + 2, '#8a8098', { outline: '#000' });
    }
    // notifications
    let ny = H - 58;
    for (const n of ui.notes) {
      const a = Math.min(1, n.t * 2);
      const tw = G.textWidth(n.text);
      ctx.globalAlpha = a * 0.7;
      ctx.fillStyle = '#000';
      ctx.fillRect(W / 2 - tw / 2 - 6, ny - 3, tw + 12, 13);
      ctx.globalAlpha = a;
      G.text(ctx, n.text, W / 2, ny, '#ffffff', { align: 'center' });
      ctx.globalAlpha = 1;
      ny -= 15;
    }
    // banners
    for (const b of ui.banners) {
      const t = b.t, d = b.dur;
      const a = t < 0.5 ? t / 0.5 : t > d - 0.8 ? Math.max(0, (d - t) / 0.8) : 1;
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 118, W, 50);
      ctx.globalAlpha = a;
      G.text(ctx, b.title, W / 2, 124, b.color, { align: 'center', scale: 2, outline: '#000' });
      if (b.sub) G.text(ctx, b.sub, W / 2, 150, '#d8d0e0', { align: 'center', outline: '#000' });
      ctx.globalAlpha = 1;
    }
  };
  function drawCoin(ctx, x, y) {
    ctx.fillStyle = '#a07010'; ctx.fillRect(x, y, 7, 7);
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(x, y, 6, 6);
    ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 1, y + 1, 1, 3);
  }
  function drawEmber(ctx, x, y) {
    ctx.fillStyle = '#c04010'; ctx.fillRect(x + 1, y + 1, 5, 6);
    ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x + 2, y, 3, 6);
    ctx.fillStyle = '#fff0c0'; ctx.fillRect(x + 3, y + 3, 1, 2);
  }
  G.drawCoin = drawCoin;
  G.drawEmber = drawEmber;

  // ================================================================ maps
  const ICON_COL = { exit: '#ffe060', shop: '#ffd24a', chest: '#ffa040', cursed: '#b060ff', scroll: '#c080ff', lore: '#ffffff', npc: '#8ad0ff', keeper: '#ffb060', vault: '#ff60ff', pearl: '#ff90d0', seed: '#70e060', mural: '#d0b080', fountain: '#80d0ff', mutation: '#c080ff' };
  function mapIcons(L) {
    const out = [];
    for (const e of G.world.ents) {
      if (e.dead || !e.mapIcon) continue;
      if (!isRevealed(L, e.cx, e.cy)) continue;
      out.push({ x: e.cx, y: e.cy, t: e.mapIcon });
    }
    return out;
  }
  function isRevealed(L, x, y) {
    for (let i = 0; i < L.cells.length; i++) {
      const c = L.cells[i];
      if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.h && L.revealed[i]) return true;
    }
    return false;
  }
  G.buildShownMap = (L) => {
    if (!L.mapShown) L.mapShown = G.makeCanvas(L.w, L.h);
    const c = L.mapShown.ctx;
    c.clearRect(0, 0, L.w, L.h);
    for (let i = 0; i < L.cells.length; i++) {
      if (!L.revealed[i]) continue;
      const cl = L.cells[i];
      const x = Math.floor(cl.x / 16), y = Math.floor(cl.y / 16), w = Math.ceil(cl.w / 16), h = Math.ceil(cl.h / 16);
      c.drawImage(L.mapCanvas, x, y, w, h, x, y, w, h);
    }
    L.mapDirty = false;
  };
  function drawMapIcon(ctx, t, x, y) {
    const col = ICON_COL[t] || '#ffffff';
    x = Math.round(x);
    y = Math.round(y);
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 2, y - 2, 5, 5);
    ctx.fillStyle = col;
    if (t === 'exit') { ctx.fillRect(x - 1, y - 2, 3, 5); ctx.fillStyle = '#000'; ctx.fillRect(x, y, 1, 2); }
    else if (t === 'shop') { ctx.fillRect(x - 1, y - 1, 3, 3); }
    else ctx.fillRect(x - 1, y - 1, 3, 3);
  }
  function drawMinimap(ctx, p) {
    const L = G.world.level;
    const mw = 128, mh = 72, mx = W - mw - 8, my = 8;
    ctx.fillStyle = 'rgba(6,5,10,0.75)';
    ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    G.strokeRect(ctx, mx - 2, my - 2, mw + 4, mh + 4, '#4a3a5a');
    if (!G.save.hasMap) {
      G.text(ctx, 'No map', mx + mw / 2, my + mh / 2 - 8, '#5a5068', { align: 'center' });
      G.text(ctx, '(find a cartographer)', mx + mw / 2, my + mh / 2 + 3, '#4a4058', { align: 'center' });
      return;
    }
    if (!L.mapShown || L.mapDirty) G.buildShownMap(L);
    const sc = 2;
    const ptx = p.cx / 16, pty = p.cy / 16;
    const sx = ptx - mw / sc / 2, sy = pty - mh / sc / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, mw, mh);
    ctx.clip();
    ctx.drawImage(L.mapShown, sx, sy, mw / sc, mh / sc, mx, my, mw, mh);
    for (const ic of mapIcons(L)) drawMapIcon(ctx, ic.t, mx + (ic.x / 16 - sx) * sc, my + (ic.y / 16 - sy) * sc);
    if (p.hasMut('tidesense')) for (const e of G.world.enemies) { if (e.dead || e.dying) continue; ctx.fillStyle = '#ff4040'; ctx.fillRect(Math.round(mx + (e.cx / 16 - sx) * sc) - 1, Math.round(my + (e.cy / 16 - sy) * sc) - 1, 2, 2); }
    ctx.restore();
    const blink = Math.floor(G.time * 4) % 2 === 0;
    ctx.fillStyle = blink ? '#ffffff' : '#ffb060';
    ctx.fillRect(mx + mw / 2 - 1, my + mh / 2 - 2, 3, 4);
    G.text(ctx, '[' + G.Input.keyName('map') + '] Map', mx + mw, my + mh + 4, '#6a6078', { align: 'right' });
  }

  // ================================================================ screens
  const SCREENS = {};
  G.SCREENS = SCREENS;

  // ---------------------------------------------------- dialogue
  SCREENS.dialogue = {
    init(m) { m.i = 0; m.chars = 0; },
    update(m, dt) {
      const line = m.data.lines[m.i];
      const text = G.stripMarkup(line[1]);
      m.chars += dt * 55;
      if (Math.floor(m.chars) % 3 === 0 && m.chars < text.length && Math.floor(m.chars) !== m.lastC) { m.lastC = Math.floor(m.chars); if (line[0] !== 'tablet') G.Audio.play('uiMove', { vol: 0.25 }); }
      if (confirmPressed() || I().pressed.interact || I().pressed.attack1) {
        if (m.chars < text.length) m.chars = text.length;
        else {
          m.i++;
          m.chars = 0;
          if (m.i >= m.data.lines.length) {
            ui.close(m);
            if (m.data.cb) m.data.cb();
          }
        }
      }
    },
    draw(ctx, m) {
      const line = m.data.lines[Math.min(m.i, m.data.lines.length - 1)];
      const sp = G.SPEAKERS[line[0]] || { name: '', color: '#fff' };
      const bx = 60, by = H - 96, bw = W - 120, bh = 80;
      G.panel(ctx, bx, by, bw, bh, { bg: 'rgba(8,6,14,0.94)' });
      let tx = bx + 12;
      if (line[0] !== 'tablet') {
        drawPortrait(ctx, line[0], bx + 10, by + 10);
        tx = bx + 66;
        G.text(ctx, sp.name, tx, by + 8, sp.color);
      }
      const full = line[1];
      // reveal progressively (strip-aware)
      const plain = G.stripMarkup(full);
      const n = Math.floor(m.chars);
      let shown = full;
      if (n < plain.length) {
        let cnt = 0, out = '';
        for (let i = 0; i < full.length && cnt < n; i++) {
          if (full[i] === '[') { const j = full.indexOf(']', i); if (j > i) { const tag = full.slice(i + 1, j); if (tag === '' || tag[0] === '#' || G.FONT_COLORS[tag]) { out += full.slice(i, j + 1); i = j; continue; } } }
          out += full[i];
          cnt++;
        }
        shown = out;
      }
      G.textBlock(ctx, shown, tx, by + (line[0] !== 'tablet' ? 24 : 12), bw - (tx - bx) - 12, '#e0d8e8');
      if (n >= plain.length && Math.floor(m.t * 3) % 2 === 0) G.text(ctx, '↓', bx + bw - 14, by + bh - 14, '#ffd080');
    },
  };
  function drawPortrait(ctx, who, x, y) {
    G.panel(ctx, x, y, 48, 48, { bg: '#120e18', corner: false });
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, 46, 46);
    ctx.clip();
    const cx = x + 24, cy = y + 30;
    const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(cx + a, cy + b, w, h); };
    if (who === 'keeper') {
      R(-18, -4, 36, 24, '#2a2230'); R(-14, -24, 28, 22, '#1a1420'); R(-8, -18, 16, 14, '#e8dcc8'); R(-8, -6, 6, 8, '#d8ccb0'); R(4, -5, 4, 9, '#d8ccb0'); R(-4, -13, 2, 2, '#ffb060'); R(3, -13, 2, 2, '#ffb060');
    } else if (who === 'mara') {
      R(-14, 4, 28, 16, '#3a6a8a'); R(-8, -16, 16, 18, '#e0c0a0'); R(-10, -20, 20, 6, '#c05a30'); R(-12, -16, 4, 16, '#c05a30'); R(2, -9, 2, 2, '#2a1a10'); R(-4, -9, 2, 2, '#2a1a10'); R(-2, -3, 5, 1, '#a06050'); R(8, 2, 2, 14, '#ffffff');
    } else if (who === 'pellam') {
      R(-16, 4, 32, 16, '#6a3a5a'); R(-8, -14, 16, 16, '#b09080'); R(-12, -20, 24, 8, '#4a2a3a'); R(-8, -26, 16, 6, '#4a2a3a'); R(2, -8, 3, 2, '#ffd24a'); R(-5, -8, 3, 2, '#2a1a10'); R(-3, -2, 7, 2, '#6a4a3a');
    } else if (who === 'oris') {
      R(-16, 4, 32, 16, '#3a4a6a'); R(-8, -16, 16, 18, '#8aa0b0'); R(-10, -22, 20, 5, '#d8b050'); R(-10, -27, 3, 5, '#d8b050'); R(-1, -28, 3, 6, '#d8b050'); R(7, -27, 3, 5, '#d8b050'); R(3, -9, 3, 2, '#a0e0ff'); R(-5, -9, 3, 2, '#a0e0ff'); R(-6, -2, 12, 2, '#6a8090');
    } else if (who === 'ilyse') {
      R(-14, 4, 28, 16, '#e0d0f0'); R(-7, -16, 14, 18, '#f0e0e8'); R(-11, -20, 22, 6, '#f8f0ff'); R(-12, -16, 4, 18, '#f8f0ff'); R(8, -16, 4, 18, '#f8f0ff'); R(-4, -9, 2, 1, '#6090c0'); R(2, -9, 2, 1, '#6090c0'); R(-1, -3, 3, 1, '#c08090');
    } else if (who === 'hale') {
      R(-16, 2, 32, 18, '#5a5060'); R(-10, -24, 20, 24, '#9a7a3a'); R(-12, -4, 24, 4, '#c8a050'); R(-6, -14, 12, 3, '#1a1008'); R(-4, -13, 3, 1, '#ffd060'); R(2, -13, 3, 1, '#ffd060');
    } else if (who === 'brine') {
      R(-20, -30, 40, 20, '#6a2a58'); R(-8, -12, 16, 20, '#e8d8e8'); R(-5, -5, 3, 1, '#40d0ff'); R(3, -5, 3, 1, '#40d0ff'); R(-1, 2, 3, 3, '#2a0a1a'); R(-18, 8, 4, 12, '#8a3a78'); R(14, 8, 4, 12, '#8a3a78');
    }
    ctx.restore();
  }

  // ---------------------------------------------------- lore
  SCREENS.lore = {
    update(m) { if ((confirmPressed() || cancelPressed() || I().pressed.interact) && m.t > 0.2) ui.close(m); },
    draw(ctx, m) {
      dim(ctx, 0.6);
      const bw = 380, bx = W / 2 - bw / 2;
      const lines = G.wrap(m.data.text, bw - 40);
      const bh = 70 + lines.length * 11;
      const by = H / 2 - bh / 2;
      G.panel(ctx, bx, by, bw, bh, { bg: 'rgba(30,24,20,0.97)', border: '#8a7050', hi: '#b09070', cornerColor: '#d8b070' });
      G.text(ctx, m.data.title, W / 2, by + 12, '#f0d8a8', { align: 'center' });
      if (m.data.isNew) G.text(ctx, 'NEW ENTRY ADDED TO CODEX', W / 2, by + 24, '#8ad0ff', { align: 'center' });
      for (let i = 0; i < lines.length; i++) G.text(ctx, lines[i], bx + 20, by + 42 + i * 11, '#d8ccb8');
      G.drawKeyHint(ctx, W / 2, by + bh - 14, 'confirm', 'Close', 'center');
    },
  };

  // ---------------------------------------------------- confirm
  SCREENS.confirm = {
    init(m) { m.sel = 1; },
    update(m) {
      menuNav(m, 2, { h: true, rects: m.rects });
      if (confirmPressed() && m.t > 0.15) { ui.close(m); m.data.cb(m.sel === 0); }
      else if (cancelPressed()) { ui.close(m); m.data.cb(false); }
    },
    draw(ctx, m) {
      dim(ctx, 0.5);
      const bw = 340, bx = W / 2 - bw / 2;
      const lines = G.wrap(m.data.text, bw - 30);
      const bh = 60 + lines.length * 11;
      const by = H / 2 - bh / 2;
      G.panel(ctx, bx, by, bw, bh);
      for (let i = 0; i < lines.length; i++) G.text(ctx, lines[i], bx + 15, by + 12 + i * 11, '#e0d8e8');
      m.rects = [button(ctx, W / 2 - 90, by + bh - 30, 80, 20, 'Yes', m.sel === 0), button(ctx, W / 2 + 10, by + bh - 30, 80, 20, 'No', m.sel === 1)];
    },
  };

  // ---------------------------------------------------- scroll of power
  SCREENS.scroll = {
    update(m) {
      const ch = m.data.altar.choices;
      menuNav(m, ch.length, { h: true, rects: m.rects });
      if (confirmPressed() && m.t > 0.2) { ui.close(m); m.data.altar.apply(ch[m.sel]); }
      else if (cancelPressed()) ui.close(m);
    },
    draw(ctx, m) {
      dim(ctx, 0.6);
      title(ctx, 'SCROLL OF POWER', 70);
      G.text(ctx, 'Choose a strength to deepen. Each point adds health and empowers weapons of that color.', W / 2, 96, '#c8c0d0', { align: 'center' });
      const ch = m.data.altar.choices;
      const bw = 150, gap = 16, tot = ch.length * bw + (ch.length - 1) * gap;
      m.rects = [];
      const p = G.world.player;
      ch.forEach((k, i) => {
        const x = W / 2 - tot / 2 + i * (bw + gap), y = 130;
        const sel = m.sel === i;
        G.panel(ctx, x, y, bw, 120, { bg: sel ? 'rgba(40,24,30,0.95)' : 'rgba(16,12,22,0.92)', border: sel ? G.STAT_COLORS[k] : '#3a3048', hi: sel ? G.shade(G.STAT_COLORS[k], 0.3) : '#4a4058', cornerColor: G.STAT_COLORS[k] });
        G.text(ctx, G.STAT_NAMES[k], x + bw / 2, y + 14, G.FONT_COLORS[k], { align: 'center', scale: 2 });
        G.text(ctx, 'Level ' + p.stats[k] + ' → ' + (p.stats[k] + 1), x + bw / 2, y + 40, '#e0d8e8', { align: 'center' });
        G.text(ctx, '+15% ' + G.STAT_NAMES[k] + ' damage', x + bw / 2, y + 58, '#c8c0d0', { align: 'center' });
        G.text(ctx, '+' + (k === 'vigor' ? 22 : 10) + ' max health', x + bw / 2, y + 70, '#c8c0d0', { align: 'center' });
        const eq = [...p.weapons, ...p.skills].filter((it) => it && G.ITEMS[it.id].stats.includes(k)).length;
        G.text(ctx, eq + ' equipped item' + (eq === 1 ? '' : 's') + ' scale', x + bw / 2, y + 90, eq ? '#a0e0a0' : '#8a8098', { align: 'center' });
        m.rects.push({ x, y, w: bw, h: 120 });
      });
      G.drawKeyHint(ctx, W / 2, 270, 'confirm', 'Choose', 'center');
    },
  };

  // ---------------------------------------------------- item swap
  SCREENS.swap = {
    update(m) {
      const In = I();
      if (In.pressed.attack1 || In.pressed.skill1 || (In.pressed.mleft && (m.sel = 0, false))) return this.pick(m, 0);
      if (In.pressed.attack2 || In.pressed.skill2 || (In.pressed.mright && (m.sel = 1, false))) return this.pick(m, 1);
      if (In.pressed.mleft) m.sel = 0;
      if (In.pressed.mright) m.sel = 1;
      if (In.pressed.confirm && m.t > 0.2 && !In.pressed.attack1) return this.pick(m, m.sel);
      if (In.pressed.cancel || In.pressed.interact) ui.close(m);
    },
    pick(m, slot) {
      ui.close(m);
      G.game.equipFromDrop(m.data.drop, slot);
    },
    draw(ctx, m) {
      dim(ctx, 0.6);
      const p = G.world.player;
      const inst = m.data.drop.inst;
      const isSkill = G.ITEMS[inst.id].kind === 'skill';
      const cur = isSkill ? p.skills : p.weapons;
      title(ctx, 'SWAP EQUIPMENT', 20);
      tooltip(ctx, inst, W / 2 - 110, 46, 220, p, 'NEW');
      const keys = isSkill ? ['skill1', 'skill2'] : ['attack1', 'attack2'];
      for (let i = 0; i < 2; i++) {
        const x = i === 0 ? 20 : W - 220;
        if (cur[i]) tooltip(ctx, cur[i], x, 170, 200, p, 'SLOT ' + (i + 1) + (m.sel === i ? '  <' : ''));
        G.text(ctx, '[#ffd080][' + G.Input.keyName(keys[i]) + '][] Replace slot ' + (i + 1), x + 100, 156, m.sel === i ? '#ffffff' : '#a098a8', { align: 'center', outline: '#000' });
      }
      G.drawKeyHint(ctx, W / 2, H - 14, 'cancel', 'Leave it', 'center');
    },
  };

  // ---------------------------------------------------- keeper
  SCREENS.keeper = {
    init(m) { m.scroll = 0; this.build(m); },
    build(m) {
      const rows = [];
      const found = Object.keys(G.save.bpFound).filter((id) => !G.save.unlocked[id]);
      for (const id of found) rows.push({ type: 'bp', id, name: G.ITEMS[id].name, cost: G.ITEMS[id].bp.cost, desc: G.ITEMS[id].desc, icon: id });
      for (const u of G.UPGRADES) {
        if (G.hasUpgrade(u.id)) continue;
        if (u.req && !G.hasUpgrade(u.req)) continue;
        rows.push({ type: 'up', id: u.id, name: u.name, cost: u.cost, desc: u.desc });
      }
      for (const id in G.MUTATIONS) {
        const M = G.MUTATIONS[id];
        if (M.start || G.save.mutUnlocked[id]) continue;
        rows.push({ type: 'mut', id, name: 'Mutation: ' + M.name, cost: M.cost, desc: M.desc, stat: M.stat });
      }
      m.rows = rows;
      m.sel = Math.min(m.sel, Math.max(0, rows.length - 1));
    },
    progress(r) {
      const key = r.type + ':' + r.id;
      return G.save.invest[key] || 0;
    },
    update(m) {
      if (!m.rows.length) { if (confirmPressed() || cancelPressed()) ui.close(m); return; }
      menuNav(m, m.rows.length, { rects: m.rects });
      if (m.sel < m.scroll) m.scroll = m.sel;
      if (m.sel >= m.scroll + 8) m.scroll = m.sel - 7;
      if (cancelPressed()) { ui.close(m); G.game.saveMeta(); return; }
      if (confirmPressed() && m.t > 0.2) {
        const r = m.rows[m.sel];
        const p = G.world.player;
        const key = r.type + ':' + r.id;
        const have = G.save.invest[key] || 0;
        const need = r.cost - have;
        if (p.embers <= 0) { G.Audio.play('uiDeny'); G.game.notify('[ember]You have no embers to give.[]'); return; }
        const give = Math.min(need, p.embers);
        p.embers -= give;
        G.save.invest[key] = have + give;
        G.game.stats.embersSpent += give;
        G.Audio.play('ember');
        if (G.save.invest[key] >= r.cost) {
          delete G.save.invest[key];
          if (r.type === 'bp') { G.save.unlocked[r.id] = true; G.game.notify('[q2]' + r.name + '[] can now appear on the isle.'); }
          else if (r.type === 'mut') { G.save.mutUnlocked[r.id] = true; G.game.notify('Mutation [purple]' + G.MUTATIONS[r.id].name + '[] learned.'); }
          else { G.save.upgrades[r.id] = true; G.game.notify('[ember]' + r.name + '[] complete!'); G.world.player.recalc(); if (r.id.startsWith('flask')) { G.world.player.flask = G.world.player.flaskMax; } }
          G.Audio.play('rune');
          this.build(m);
        }
        G.game.saveMeta();
      }
    },
    draw(ctx, m) {
      dim(ctx, 0.8);
      title(ctx, 'THE KEEPER', 14);
      G.text(ctx, '"Embers you carry are lost when you fall. Give them to me, and the wax remembers."', W / 2, 38, '#c8b8a0', { align: 'center' });
      const p = G.world.player;
      drawEmber(ctx, W / 2 - 40, 52);
      G.text(ctx, p.embers + ' embers carried', W / 2 - 28, 52, '#ff9a3c');
      if (!m.rows.length) { G.text(ctx, 'There is nothing more the Keeper can do. For now.', W / 2, 150, '#a098a8', { align: 'center' }); G.drawKeyHint(ctx, W / 2, H - 16, 'cancel', 'Leave', 'center'); return; }
      const lx = 30, ly = 70, lw = 330, rh = 30;
      m.rects = [];
      for (let i = m.scroll; i < Math.min(m.rows.length, m.scroll + 8); i++) {
        const r = m.rows[i];
        const y = ly + (i - m.scroll) * rh;
        const sel = i === m.sel;
        G.panel(ctx, lx, y, lw, rh - 3, { bg: sel ? 'rgba(70,40,20,0.95)' : 'rgba(16,12,22,0.9)', border: sel ? '#ffb060' : '#3a3048', corner: false });
        m.rects[i] = { x: lx, y, w: lw, h: rh - 3 };
        if (r.icon) ctx.drawImage(G.itemIcon(r.icon), lx + 5, y + 5);
        else { ctx.fillStyle = r.type === 'mut' ? G.STAT_COLORS[r.stat] : '#ff9a3c'; ctx.fillRect(lx + 8, y + 8, 10, 10); }
        const tag = r.type === 'bp' ? '[q2]Blueprint[]' : r.type === 'mut' ? '[purple]Mutation[]' : '[ember]Upgrade[]';
        G.text(ctx, r.name.replace('Mutation: ', ''), lx + 26, y + 4, '#ffffff');
        G.text(ctx, tag, lx + 26, y + 14, '#a098a8');
        const prog = this.progress(r);
        const bw = 90;
        G.bar(ctx, lx + lw - bw - 8, y + 16, bw, 4, prog / r.cost, '#ff9a3c', '#2a1a10');
        G.text(ctx, prog + ' / ' + r.cost, lx + lw - 8, y + 4, '#ff9a3c', { align: 'right' });
      }
      if (m.scroll > 0) G.text(ctx, '↑', lx + lw / 2, ly - 10, '#ffd080');
      if (m.scroll + 8 < m.rows.length) G.text(ctx, '↓', lx + lw / 2, ly + 8 * rh, '#ffd080');
      // detail
      const r = m.rows[m.sel];
      const dx = 375, dw = W - dx - 20;
      G.panel(ctx, dx, ly, dw, 170);
      G.text(ctx, r.name, dx + 10, ly + 10, '#ffd080');
      G.textBlock(ctx, r.desc, dx + 10, ly + 28, dw - 20, '#d8d0e0');
      if (r.type === 'bp') {
        const d = G.ITEMS[r.id];
        G.text(ctx, 'Unlocking adds this item to the pool', dx + 10, ly + 128, '#8a8098');
        G.text(ctx, 'of weapons found across the isle.', dx + 10, ly + 138, '#8a8098');
        G.text(ctx, d.stats.map((s) => '[' + s + ']' + G.STAT_NAMES[s] + '[]').join(' / '), dx + 10, ly + 152, '#fff');
      }
      G.drawKeyHint(ctx, dx + 10, ly + 190, 'confirm', 'Invest embers', 'left');
      G.drawKeyHint(ctx, dx + 10, ly + 204, 'cancel', 'Leave', 'left');
      G.text(ctx, 'Blueprints found: ' + Object.keys(G.save.bpFound).length + '   Unlocked items: ' + G.itemPool().length + '/' + Object.keys(G.ITEMS).length, 30, H - 16, '#6a6078');
    },
  };

  // ---------------------------------------------------- mutations
  SCREENS.mutations = {
    init(m) {
      const p = G.world.player;
      const altar = m.data.altar;
      if (!altar.offer) {
        const avail = Object.keys(G.MUTATIONS).filter((id) => (G.MUTATIONS[id].start || G.save.mutUnlocked[id]) && !p.muts.includes(id));
        altar.offer = G.rng.shuffle(avail).slice(0, 3);
      }
      m.offer = altar.offer;
      m.stage = altar.used ? 'view' : 'pick';
    },
    update(m) {
      const p = G.world.player;
      if (m.stage === 'view') { if (confirmPressed() || cancelPressed()) ui.close(m); return; }
      if (m.stage === 'pick') {
        menuNav(m, m.offer.length, { h: true, rects: m.rects });
        if (cancelPressed()) { ui.close(m); return; }
        if (confirmPressed() && m.t > 0.2) {
          const id = m.offer[m.sel];
          if (p.muts.length < 3) { this.give(m, id); }
          else { m.pending = id; m.stage = 'replace'; m.sel = 0; }
        }
      } else if (m.stage === 'replace') {
        menuNav(m, 3, { h: true, rects: m.rects });
        if (cancelPressed()) { m.stage = 'pick'; m.sel = 0; return; }
        if (confirmPressed()) { p.muts.splice(m.sel, 1); this.give(m, m.pending); }
      }
    },
    give(m, id) {
      const p = G.world.player;
      p.muts.push(id);
      p.recalc();
      if (id === 'alchemy') p.flask = Math.min(p.flaskMax, p.flask + 1);
      m.data.altar.used = true;
      m.data.altar.mapIcon = null;
      G.Audio.play('scroll');
      G.game.notify('Mutation gained: [purple]' + G.MUTATIONS[id].name + '[]');
      ui.close(m);
    },
    draw(ctx, m) {
      dim(ctx, 0.7);
      const p = G.world.player;
      title(ctx, 'MUTATIONS', 22);
      G.text(ctx, 'The wax can be reshaped once per passage. You may hold three mutations.', W / 2, 46, '#c8c0d0', { align: 'center' });
      const list = m.stage === 'replace' ? p.muts : m.stage === 'view' ? p.muts : m.offer;
      if (m.stage === 'replace') G.text(ctx, 'Replace which mutation with ' + G.MUTATIONS[m.pending].name + '?', W / 2, 62, '#ffd080', { align: 'center' });
      if (m.stage === 'view') G.text(ctx, 'You have already reshaped your wax here. Current mutations:', W / 2, 62, '#a098a8', { align: 'center' });
      const bw = 170, gap = 14, tot = list.length * bw + (list.length - 1) * gap;
      m.rects = [];
      list.forEach((id, i) => {
        const M = G.MUTATIONS[id];
        const x = W / 2 - tot / 2 + i * (bw + gap), y = 84;
        const sel = m.sel === i && m.stage !== 'view';
        G.panel(ctx, x, y, bw, 130, { bg: sel ? 'rgba(40,24,40,0.95)' : 'rgba(16,12,22,0.92)', border: sel ? G.STAT_COLORS[M.stat] : '#3a3048', cornerColor: G.STAT_COLORS[M.stat] });
        G.text(ctx, M.name, x + bw / 2, y + 12, G.FONT_COLORS[M.stat], { align: 'center' });
        G.textBlock(ctx, M.desc, x + 10, y + 34, bw - 20, '#d8d0e0');
        m.rects.push({ x, y, w: bw, h: 130 });
      });
      if (m.stage === 'pick' && p.muts.length) G.text(ctx, 'Current: ' + p.muts.map((id) => G.MUTATIONS[id].name).join(', '), W / 2, 230, '#8a8098', { align: 'center' });
      G.drawKeyHint(ctx, W / 2 - 60, 250, 'confirm', m.stage === 'view' ? 'Close' : 'Choose', 'center');
      if (m.stage !== 'view') G.drawKeyHint(ctx, W / 2 + 60, 250, 'cancel', 'Back', 'center');
    },
  };

  // ---------------------------------------------------- full map
  SCREENS.map = {
    init(m) { m.zoom = 3; m.ox = 0; m.oy = 0; },
    update(m, dt) {
      const In = I();
      if (In.pressed.map || cancelPressed() || In.pressed.pause) { ui.close(m); return; }
      const sp = 200 * dt;
      if (In.down.mleft) m.ox -= sp;
      if (In.down.mright) m.ox += sp;
      if (In.down.mup) m.oy -= sp;
      if (In.down.mdown) m.oy += sp;
      if (In.pressed.tabL) m.zoom = Math.max(1, m.zoom - 1);
      if (In.pressed.tabR) m.zoom = Math.min(5, m.zoom + 1);
    },
    draw(ctx, m) {
      ctx.fillStyle = 'rgba(6,5,12,0.94)';
      ctx.fillRect(0, 0, W, H);
      const L = G.world.level;
      const p = G.world.player;
      title(ctx, L.biome.name.toUpperCase(), 8);
      if (!G.save.hasMap) {
        G.text(ctx, 'You have no map of this place.', W / 2, H / 2 - 10, '#8a8098', { align: 'center' });
        G.text(ctx, 'Perhaps someone on the isle charts these shifting halls...', W / 2, H / 2 + 4, '#6a6078', { align: 'center' });
        return;
      }
      if (!L.mapShown || L.mapDirty) G.buildShownMap(L);
      const z = m.zoom;
      const cx = p.cx / 16 + m.ox / z, cy = p.cy / 16 + m.oy / z;
      const vx = W / 2 - cx * z, vy = H / 2 + 6 - cy * z;
      ctx.save();
      ctx.beginPath();
      ctx.rect(10, 30, W - 20, H - 56);
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(L.mapShown, vx, vy, L.w * z, L.h * z);
      for (const ic of mapIcons(L)) {
        const x = vx + (ic.x / 16) * z, y = vy + (ic.y / 16) * z;
        drawMapIcon(ctx, ic.t, x, y);
      }
      if (p.hasMut('tidesense')) for (const e of G.world.enemies) { if (e.dead || e.dying) continue; ctx.fillStyle = '#ff4040'; ctx.fillRect(Math.round(vx + (e.cx / 16) * z) - 1, Math.round(vy + (e.cy / 16) * z) - 1, 3, 3); }
      const blink = Math.floor(G.time * 4) % 2 === 0;
      ctx.fillStyle = blink ? '#ffffff' : '#ff9040';
      ctx.fillRect(Math.round(vx + (p.cx / 16) * z) - 2, Math.round(vy + (p.cy / 16) * z) - 3, 5, 6);
      ctx.restore();
      // legend
      const leg = [['exit', 'Exit'], ['shop', 'Merchant'], ['chest', 'Treasure'], ['scroll', 'Scroll'], ['lore', 'Lore'], ['vault', 'Vault'], ['npc', 'NPC'], ['seed', 'Rune gate']];
      let lx = 16;
      for (const [k, n] of leg) { drawMapIcon(ctx, k, lx + 2, H - 18); G.text(ctx, n, lx + 7, H - 21, '#a098a8'); lx += G.textWidth(n) + 18; }
      const rev = L.revealed.reduce((a, b) => a + b, 0);
      G.text(ctx, 'Explored ' + Math.round((rev / L.cells.length) * 100) + '%', W - 16, H - 21, '#8a8098', { align: 'right' });
      G.text(ctx, '[' + G.Input.keyName('tabL') + '/' + G.Input.keyName('tabR') + '] Zoom   [Arrows] Pan', W - 16, 14, '#6a6078', { align: 'right' });
    },
  };

  // ---------------------------------------------------- isle map
  const ISLE_LINKS = () => {
    const out = [];
    for (const id in G.BIOMES) {
      const B = G.BIOMES[id];
      if (!B.exits || !B.isle) continue;
      for (const e of B.exits) if (G.BIOMES[e.to] && G.BIOMES[e.to].isle) out.push({ a: id, b: e.to, rune: e.rune });
    }
    return out;
  };
  G.drawIsle = (ctx, ox, oy, highlight, t) => {
    // island cross-section
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(ox - 10, oy + 190, 480, 50);
    ctx.fillStyle = '#123050';
    for (let i = 0; i < 40; i++) ctx.fillRect(ox - 10 + ((i * 53) % 480), oy + 196 + ((i * 17) % 40), 10, 1);
    ctx.fillStyle = '#2a2230';
    ctx.beginPath();
    ctx.moveTo(ox + 10, oy + 240);
    ctx.lineTo(ox + 60, oy + 170);
    ctx.lineTo(ox + 120, oy + 110);
    ctx.lineTo(ox + 170, oy + 70);
    ctx.lineTo(ox + 205, oy + 40);
    ctx.lineTo(ox + 255, oy + 40);
    ctx.lineTo(ox + 290, oy + 70);
    ctx.lineTo(ox + 340, oy + 110);
    ctx.lineTo(ox + 400, oy + 170);
    ctx.lineTo(ox + 450, oy + 240);
    ctx.fill();
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(ox + 222, oy + 2, 16, 40);
    ctx.fillRect(ox + 218, oy - 2, 24, 6);
    ctx.fillStyle = G.save.victories ? '#ffd070' : '#1a1a24';
    ctx.fillRect(ox + 225, oy - 12, 10, 10);
    if (G.save.victories) G.addLight(ox + 230 + G.cam.x, oy - 8 + G.cam.y, 60, '#ffd070', 1);
    ctx.fillStyle = '#4a3a50';
    ctx.fillRect(ox + 222, oy - 14, 16, 3);
    // links
    for (const l of ISLE_LINKS()) {
      const A = G.BIOMES[l.a].isle, B = G.BIOMES[l.b].isle;
      const known = G.save.visited[l.a] || G.save.visited[l.b];
      if (!known) continue;
      const locked = l.rune && !G.save.runes[l.rune];
      ctx.globalAlpha = 0.8;
      G.pixLine(ctx, ox + A.x, oy + A.y, ox + B.x, oy + B.y, locked ? '#5a3a3a' : '#8a7a60');
      ctx.globalAlpha = 1;
      if (l.rune) {
        const mx = ox + (A.x + B.x) / 2, my = oy + (A.y + B.y) / 2;
        ctx.fillStyle = locked ? '#3a2020' : '#203a20';
        ctx.fillRect(mx - 4, my - 4, 9, 9);
        ctx.fillStyle = G.RUNES[l.rune].color;
        ctx.fillRect(mx - 2, my - 2, 5, 5);
      }
    }
    // nodes
    for (const id of G.BIOME_ORDER) {
      const B = G.BIOMES[id];
      const v = G.save.visited[id];
      const x = ox + B.isle.x, y = oy + B.isle.y;
      const cur = id === highlight;
      const col = B.boss ? '#c04040' : B.tier <= 1 ? '#8aa0c0' : B.tier === 2 ? '#80c080' : B.tier === 3 ? '#d0b060' : B.tier === 4 ? '#c080c0' : '#ff9060';
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 5, y - 5, 11, 11);
      ctx.fillStyle = v ? col : '#3a3440';
      ctx.fillRect(x - 4, y - 4, 9, 9);
      if (B.boss) { ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 2, 3, 3); }
      if (cur) {
        const r = 8 + Math.sin(t * 5) * 2;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - r, y - r, r * 2 + 1, r * 2 + 1);
      }
      const name = v || cur ? B.name : '???';
      const right = B.isle.x > 230;
      G.text(ctx, name, x + (right ? 10 : -10), y - 4, cur ? '#ffffff' : v ? '#c8c0b0' : '#5a5068', { align: right ? 'left' : 'right', outline: '#000' });
    }
  };
  SCREENS.islemap = {
    update(m) { if ((confirmPressed() || cancelPressed() || I().pressed.map) && m.t > 0.2) ui.close(m); },
    draw(ctx, m) {
      ctx.fillStyle = 'rgba(4,6,14,0.96)';
      ctx.fillRect(0, 0, W, H);
      title(ctx, 'THE ISLE OF VAEL', 10);
      const cur = G.game.currentBiomeForMap();
      G.drawIsle(ctx, 90, 80, cur, m.t);
      G.text(ctx, 'You are here: [yellow]' + (G.BIOMES[cur] ? G.BIOMES[cur].name : '?') + '[]', W / 2, 36, '#c8c0d0', { align: 'center' });
      let ry = 50;
      const runes = Object.keys(G.RUNES).filter((r) => G.save.runes[r]);
      G.text(ctx, 'Runes: ' + (runes.length ? runes.map((r) => '[' + G.RUNES[r].color + ']' + G.RUNES[r].short + '[]').join(', ') : '[gray]none[]'), W / 2, ry, '#a098a8', { align: 'center' });
      G.text(ctx, 'Pearls of Ilyse: ' + Object.keys(G.save.pearls).length + '/4', W / 2, ry + 12, '#ff90d0', { align: 'center' });
      G.text(ctx, 'Deeper and higher regions are more dangerous. The Lantern waits at the summit.', W / 2, H - 16, '#6a6078', { align: 'center' });
    },
  };

  // ---------------------------------------------------- pause
  SCREENS.pause = {
    init(m) {
      m.items = ['Resume', 'Character', 'Level Map', 'Isle Map', 'Codex', 'Settings', 'Controls', 'Abandon Run', 'Quit to Title'];
    },
    update(m) {
      menuNav(m, m.items.length, { rects: m.rects });
      if ((I().pressed.pause || cancelPressed()) && m.t > 0.1) { ui.close(m); return; }
      if (confirmPressed() && m.t > 0.15) {
        const it = m.items[m.sel];
        if (it === 'Resume') ui.close(m);
        else if (it === 'Character') ui.open('character');
        else if (it === 'Level Map') ui.open('map');
        else if (it === 'Isle Map') { if (G.save.hasMap) ui.open('islemap'); else G.game.notify('[gray]You have no map yet.[]'); }
        else if (it === 'Codex') ui.open('codex');
        else if (it === 'Settings') ui.open('settings');
        else if (it === 'Controls') ui.open('controls');
        else if (it === 'Abandon Run') ui.confirm('Abandon this run? Your wax will melt and you will wake in the Undercroft. Unspent embers are lost.', (y) => { if (y) { ui.closeAll(); G.game.abandonRun(); } });
        else if (it === 'Quit to Title') ui.confirm('Quit to title? Your run is saved only at the start of each passage.', (y) => { if (y) { ui.closeAll(); G.game.toTitle(); } });
      }
    },
    draw(ctx, m) {
      dim(ctx, 0.75);
      title(ctx, 'PAUSED', 40);
      m.rects = [];
      m.items.forEach((it, i) => { m.rects.push(button(ctx, W / 2 - 80, 74 + i * 26, 160, 22, it, m.sel === i)); });
      const p = G.world.player;
      G.text(ctx, 'Run time ' + G.fmtTime(G.game.runTime) + '   Kills ' + G.game.stats.kills, W / 2, H - 20, '#8a8098', { align: 'center' });
    },
  };

  SCREENS.character = {
    update(m) { if ((confirmPressed() || cancelPressed()) && m.t > 0.15) ui.close(m); },
    draw(ctx, m) {
      ctx.fillStyle = 'rgba(8,6,14,0.96)';
      ctx.fillRect(0, 0, W, H);
      title(ctx, 'THE WICK', 8);
      const p = G.world.player;
      // equipment
      let y = 36;
      const slots = [['Weapon 1', p.weapons[0]], ['Weapon 2', p.weapons[1]], ['Skill 1', p.skills[0]], ['Skill 2', p.skills[1]]];
      const col1 = 10, col2 = 326;
      slots.forEach(([n, it], i) => {
        const x = i < 2 ? col1 : col2, yy = i % 2 === 0 ? y : y + 118;
        if (it) tooltip(ctx, it, x, yy, 304, p, n.toUpperCase());
        else { G.panel(ctx, x, yy, 304, 30); G.text(ctx, n + ': empty', x + 10, yy + 11, '#6a6078'); }
      });
      // stats
      const sy = 272;
      G.panel(ctx, 10, sy, W - 20, 80);
      G.text(ctx, 'Health ' + Math.ceil(p.hp) + '/' + p.maxHp + '   Flasks ' + p.flask + '/' + p.flaskMax + '   Gold ' + p.gold + '   Embers ' + p.embers, 20, sy + 8, '#e0d8e8');
      G.text(ctx, '[fury]Fury ' + p.stats.fury + '[]   [cunning]Cunning ' + p.stats.cunning + '[]   [vigor]Vigor ' + p.stats.vigor + '[]', 20, sy + 20, '#fff');
      G.text(ctx, 'Mutations: ' + (p.muts.length ? p.muts.map((id) => '[' + G.MUTATIONS[id].stat + ']' + G.MUTATIONS[id].name + '[]').join(', ') : '[gray]none[]'), 20, sy + 32, '#c8c0d0');
      const runes = Object.keys(G.RUNES).filter((r) => G.save.runes[r]);
      G.text(ctx, 'Runes: ' + (runes.length ? runes.map((r) => '[' + G.RUNES[r].color + ']' + G.RUNES[r].name + '[]').join(', ') : '[gray]none[]'), 20, sy + 44, '#c8c0d0');
      if (p.curse > 0) G.text(ctx, '[purple]Cursed:[] ' + p.curse + ' kills remaining', 20, sy + 56, '#c8c0d0');
      G.drawKeyHint(ctx, W - 20, sy + 62, 'cancel', 'Back', 'right');
    },
  };

  SCREENS.codex = {
    init(m) { m.tab = 0; m.scroll = 0; },
    entries(m) {
      if (m.tab === 0) {
        const out = [];
        for (const id of G.BIOME_ORDER) {
          const ids = Object.keys(G.LORE).filter((k) => G.LORE[k].biome === id);
          for (const k of ids) out.push({ id: k, title: G.save.lore[k] ? G.LORE[k].title : '???', sub: G.BIOMES[id].name, text: G.save.lore[k] ? G.LORE[k].text : 'Not yet found.', found: !!G.save.lore[k] });
        }
        for (const k in G.PEARLS) out.push({ id: k, title: G.save.pearls[k] ? G.PEARLS[k].title : '??? (Pearl)', sub: 'Memory of Ilyse', text: G.save.pearls[k] ? G.PEARLS[k].text : 'A lost memory, locked in a vault somewhere on the isle.', found: !!G.save.pearls[k], pearl: true });
        return out;
      }
      if (m.tab === 1) {
        return Object.keys(G.ENEMIES).filter((k) => !G.ENEMIES[k].noBestiary).map((k) => {
          const n = (G.save.bestiary || {})[k] || 0;
          return { id: k, title: n ? G.ENEMIES[k].name : '???', sub: n ? 'Slain: ' + n : 'Not yet encountered', text: n ? G.ENEMIES[k].desc : '', found: n > 0, enemy: true };
        });
      }
      return Object.keys(G.ITEMS).map((k) => {
        const d = G.ITEMS[k];
        const u = G.isUnlocked(k);
        return { id: k, title: u || G.save.bpFound[k] ? d.name : '???', sub: u ? 'Unlocked' : G.save.bpFound[k] ? 'Blueprint found - unlock with the Keeper' : 'Blueprint not found', text: u || G.save.bpFound[k] ? d.desc : '', found: u, icon: u || G.save.bpFound[k] ? k : null };
      });
    },
    update(m) {
      const In = I();
      const list = this.entries(m);
      if (In.pressed.tabL || In.pressed.mleft) { m.tab = (m.tab + 2) % 3; m.sel = 0; m.scroll = 0; G.Audio.play('uiMove'); }
      if (In.pressed.tabR || In.pressed.mright) { m.tab = (m.tab + 1) % 3; m.sel = 0; m.scroll = 0; G.Audio.play('uiMove'); }
      menuNav(m, list.length, { rects: m.rects });
      if (m.sel < m.scroll) m.scroll = m.sel;
      if (m.sel >= m.scroll + 24) m.scroll = m.sel - 23;
      if (cancelPressed() && m.t > 0.1) ui.close(m);
    },
    draw(ctx, m) {
      ctx.fillStyle = 'rgba(8,6,14,0.97)';
      ctx.fillRect(0, 0, W, H);
      title(ctx, 'CODEX', 6);
      const tabs = ['Lore', 'Bestiary', 'Armory'];
      tabs.forEach((t, i) => button(ctx, 150 + i * 116, 28, 108, 18, t, m.tab === i));
      const list = this.entries(m);
      const found = list.filter((e) => e.found).length;
      G.text(ctx, found + ' / ' + list.length, W - 14, 32, '#8a8098', { align: 'right' });
      m.rects = [];
      for (let i = m.scroll; i < Math.min(list.length, m.scroll + 24); i++) {
        const e = list[i];
        const y = 54 + (i - m.scroll) * 12;
        const sel = i === m.sel;
        if (sel) { ctx.fillStyle = 'rgba(120,80,40,0.5)'; ctx.fillRect(10, y - 2, 220, 12); }
        m.rects[i] = { x: 10, y: y - 2, w: 220, h: 12 };
        G.text(ctx, e.found || e.icon ? e.title : '???  [#3a3448]' + e.sub + '[]', 16, y, e.found ? (e.pearl ? '#ff90d0' : '#e0d8e8') : '#5a5068');
      }
      const e = list[m.sel];
      if (e) {
        G.panel(ctx, 240, 54, W - 252, H - 80);
        if (e.icon) ctx.drawImage(G.itemIcon(e.icon), 252, 64);
        if (e.enemy && e.found) {
          // draw the enemy
          const fake = { def: G.ENEMIES[e.id], facing: 1, walkT: m.t * 3, animT: m.t, vx: 0, onGround: true, atk: null, sc: 1, cx: -999, cy: -999, y: -999, bottom: -999, w: 10, h: 10, st: {} };
          ctx.save();
          ctx.translate(W - 60, 120);
          ctx.scale(2, 2);
          try { G.ENEMY_DRAW[G.ENEMIES[e.id].draw](ctx, fake, (c) => c); } catch (err) {}
          ctx.restore();
        }
        G.text(ctx, e.title, e.icon ? 274 : 252, 66, '#ffd080');
        G.text(ctx, e.sub, e.icon ? 274 : 252, 78, '#8a8098');
        G.textBlock(ctx, e.text, 252, 100, W - 290 - (e.enemy ? 60 : 0), '#d8ccb8');
      }
      G.text(ctx, '[' + G.Input.keyName('tabL') + '/' + G.Input.keyName('tabR') + '] Tabs   [' + G.Input.keyName('cancel') + '] Back', W / 2, H - 16, '#6a6078', { align: 'center' });
    },
  };

  SCREENS.settings = {
    init(m) { m.items = ['music', 'sfx', 'shake', 'fullscreen', 'back']; },
    update(m) {
      const In = I();
      menuNav(m, m.items.length, { rects: m.rects });
      const k = m.items[m.sel];
      const s = G.settings;
      if (k === 'fullscreen' && (confirmPressed() || In.pressed.mleft || In.pressed.mright)) { G.toggleFullscreen(); return; }
      if (k !== 'back' && k !== 'fullscreen' && (In.pressed.mleft || In.pressed.mright)) {
        const d = In.pressed.mleft ? -0.1 : 0.1;
        s[k] = Math.round(G.clamp(s[k] + d, 0, 1) * 10) / 10;
        G.Audio.applyVolumes();
        G.Audio.play('uiMove');
        G.game.saveSettings();
      }
      if ((confirmPressed() && k === 'back') || cancelPressed()) { G.game.saveSettings(); ui.close(m); }
    },
    draw(ctx, m) {
      dim(ctx, 0.85);
      title(ctx, 'SETTINGS', 40);
      const names = { music: 'Music Volume', sfx: 'Sound Volume', shake: 'Screen Shake', fullscreen: 'Toggle Fullscreen (F11)', back: 'Back' };
      m.rects = [];
      m.items.forEach((k, i) => {
        const y = 90 + i * 34;
        const sel = m.sel === i;
        m.rects.push(button(ctx, W / 2 - 140, y, 280, 26, '', sel));
        G.text(ctx, names[k], W / 2 - 128, y + 9, sel ? '#ffffff' : '#c8c0d0');
        if (k !== 'back' && k !== 'fullscreen') {
          G.bar(ctx, W / 2 + 10, y + 10, 100, 6, G.settings[k], '#ffb060', '#2a2030');
          G.text(ctx, Math.round(G.settings[k] * 100) + '%', W / 2 + 118, y + 9, '#c8c0d0');
        }
      });
      G.text(ctx, '[Left/Right] Adjust', W / 2, 250, '#6a6078', { align: 'center' });
    },
  };

  SCREENS.controls = {
    update(m) { if ((confirmPressed() || cancelPressed()) && m.t > 0.15) ui.close(m); },
    draw(ctx, m) {
      dim(ctx, 0.9);
      title(ctx, 'CONTROLS', 20);
      const rows = [
        ['Move', 'A/D or Arrows', 'D-pad / Stick'],
        ['Jump / Double jump', 'Space or Z', 'A'],
        ['Drop through platform', 'Down + Jump', 'Down + A'],
        ['Ground slam', 'Down + Jump (in air)', 'Down + A (air)'],
        ['Climb ladders', 'W/S or Up/Down', 'D-pad'],
        ['Roll (dodge, invulnerable)', 'Shift or L', 'B'],
        ['Weapon 1 / Weapon 2', 'J / K  (or X / C, mouse)', 'X / Y'],
        ['Skill 1 / Skill 2', 'Q / E  (or U / I)', 'LT / RT'],
        ['Interact / pick up', 'F', 'RB'],
        ['Drink health flask', 'R', 'LB'],
        ['Map', 'M or Tab', 'Select'],
        ['Pause / menu', 'Esc or P', 'Start'],
      ];
      rows.forEach((r, i) => {
        const y = 50 + i * 20;
        G.text(ctx, r[0], 60, y, '#e0d8e8');
        G.text(ctx, r[1], 300, y, '#ffd080');
        G.text(ctx, r[2], 500, y, '#8ad0ff');
      });
      G.text(ctx, 'Hold a shield to block; raise it just before a hit to PARRY. Hit back quickly after taking damage to recover the orange rally health.', W / 2, 300, '#a098a8', { align: 'center' });
      G.text(ctx, 'Enemies flash red and show "!" before attacking. Roll through attacks to avoid them.', W / 2, 312, '#a098a8', { align: 'center' });
      G.drawKeyHint(ctx, W / 2, H - 20, 'cancel', 'Back', 'center');
    },
  };

  G.ui.menuNav = menuNav;
  G.ui.button = button;
  G.ui.dim = dim;
  G.ui.title = title;
  G.ui.confirmPressed = confirmPressed;
  G.ui.cancelPressed = cancelPressed;
})();
