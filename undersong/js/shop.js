'use strict';
/* UNDERSONG — shop: the Hermit, a crab who trades parts for pearls at the top of every zone
   below the first. He keeps his stock in bubbles so it does not sink into the silt, and he
   changes shells as he goes down: a diving helmet, a lantern jar, a teapot, a ship's bell. */
(function () {
  const { sin, cos, min, max, abs, PI, hypot, floor } = Math;
  const { clamp, lerp, damp } = G;
  const TAU = G.TAU;
  const PRICE = [10, 16, 26, 40];

  function drawShell(ctx, kind, t) {
    if (kind === 1) {            // brass diving helmet
      const g = ctx.createRadialGradient(-6, -26, 2, 0, -20, 26); g.addColorStop(0, '#ffe08a'); g.addColorStop(0.6, '#c8922e'); g.addColorStop(1, '#7a5216');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -20, 21, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a5e1a'; G.roundRect(ctx, -24, -6, 48, 9, 3); ctx.fill();
      ctx.fillStyle = '#20303c'; ctx.beginPath(); ctx.arc(6, -22, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(6, -22, 9, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(160,230,255,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(6, -22, 5.5, PI * 1.1, PI * 1.6); ctx.stroke();
      ctx.fillStyle = '#c8922e'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-18 + i * 12, -1.5, 1.6, 0, TAU); ctx.fill(); }
    } else if (kind === 2) {     // lantern jar with something glowing in it
      ctx.fillStyle = 'rgba(190,235,255,0.42)'; G.roundRect(ctx, -17, -42, 34, 40, 9); ctx.fill();
      ctx.strokeStyle = 'rgba(220,245,255,0.8)'; ctx.lineWidth = 1.6; G.roundRect(ctx, -17, -42, 34, 40, 9); ctx.stroke();
      ctx.fillStyle = '#6a5a4a'; G.roundRect(ctx, -12, -48, 24, 8, 3); ctx.fill();
      ctx.fillStyle = '#eaffb0'; ctx.beginPath(); ctx.arc(sin(t * 1.3) * 5, -22 + cos(t * 1.7) * 6, 3, 0, TAU); ctx.fill();
    } else if (kind === 3) {     // teapot
      const g = ctx.createRadialGradient(-6, -26, 2, 0, -18, 26); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#d8e4f0'); g.addColorStop(1, '#8fa2b8');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -18, 22, 18, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8fa2b8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-24, -18, 9, PI * 0.5, PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(19, -14); ctx.quadraticCurveTo(32, -18, 33, -32); ctx.stroke();
      ctx.fillStyle = '#b8c8d8'; ctx.beginPath(); ctx.ellipse(0, -35, 11, 3.6, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, -40, 3.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3a6ad0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(2, -17, 7, 0, TAU); ctx.moveTo(-5, -17); ctx.quadraticCurveTo(2, -24, 9, -17); ctx.stroke();
    } else {                     // ship's bell
      const g = ctx.createLinearGradient(-20, 0, 20, 0); g.addColorStop(0, '#8a6a1e'); g.addColorStop(0.45, '#f0d070'); g.addColorStop(1, '#7a5a16');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-22, -3); ctx.quadraticCurveTo(-18, -8, -15, -24); ctx.quadraticCurveTo(-12, -44, 0, -44); ctx.quadraticCurveTo(12, -44, 15, -24); ctx.quadraticCurveTo(18, -8, 22, -3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a4e12'; G.roundRect(ctx, -24, -6, 48, 6, 3); ctx.fill();
      ctx.strokeStyle = '#6a4e12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -47, 4, PI, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,60,10,0.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(16, -18); ctx.stroke();
    }
  }

  G.defProp('hermit', {
    r: 26, viewR: 140, codex: 'hermit', scanXp: 8,
    init(pr) { pr.peek = 0.3; pr.dir = 1; pr.wave = 0; pr.greeted = false; pr.bumpCd = 0; pr.kind = pr.kind || 1; },
    show(pr) { pr.peek = 0.85 + 0.15 * sin(pr.t * 1.3); pr.dir = 1; pr.wave = sin(pr.t * 0.5) > 0.9 ? 1 : 0; },
    update(pr, dt, p) {
      const near = pr.pd < 300;
      pr.peek = damp(pr.peek, near ? 1 : 0.25, 3.5, dt);
      pr.dir = p.x >= pr.x ? 1 : -1;
      pr.wave = max(0, pr.wave - dt); pr.bumpCd -= dt;
      if (near && !pr.greeted && !p.dead) { pr.greeted = true; pr.wave = 1.6; G.story.hermit('greet', G.zone.idx); }
      if (pr.pd < pr.r + p.r && pr.bumpCd <= 0) { pr.bumpCd = 5; pr.wave = 1; G.story.hermit('bump'); G.sfx('clack', { x: pr.x, y: pr.y }); }
    },
    draw(pr, ctx) {
      const t = G.time, pk = pr.peek, d = pr.dir;
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.scale(d, 1);
      // legs and claws poke out from under the shell
      ctx.strokeStyle = '#e8663a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 3; i++) {
        const sw = sin(t * 3 + i * 1.4) * 1.5 * pk;
        ctx.beginPath(); ctx.moveTo(4 + i * 5, -2); ctx.lineTo(10 + i * 7 + sw, -8 * pk); ctx.lineTo(15 + i * 8 + sw, 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-6 - i * 4, -2); ctx.lineTo(-13 - i * 5, -5 * pk); ctx.lineTo(-17 - i * 6, 3); ctx.stroke();
      }
      drawShell(ctx, pr.kind, t);
      // the crab himself
      const hx = 17 * pk + 3, hy = -7 - 3 * pk;
      ctx.fillStyle = '#f07a48'; ctx.beginPath(); ctx.ellipse(hx, hy, 10, 7.5, 0, 0, TAU); ctx.fill();
      const wv = pr.wave > 0 ? sin(t * 14) * 0.5 : sin(t * 2) * 0.1;
      ctx.save(); ctx.translate(hx + 7, hy + 2); ctx.rotate(-0.5 - wv - (pr.wave > 0 ? 0.9 : 0));
      ctx.strokeStyle = '#e8663a'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(11, -3); ctx.stroke();
      ctx.fillStyle = '#ff9a5a'; ctx.beginPath(); ctx.ellipse(16, -4, 8, 5.4, -0.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff0d8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(24, -6); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ff9a5a'; ctx.beginPath(); ctx.ellipse(hx + 3, hy + 7, 4.4, 3, 0.4, 0, TAU); ctx.fill();
      for (let s = -1; s <= 1; s += 2) {
        const ex = hx + 2 + s * 4, ey = hy - 12 - pk * 3 + sin(t * 2.4 + s) * 0.8;
        ctx.strokeStyle = '#f07a48'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(hx + s * 3, hy - 5); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, 2.8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#16181c'; ctx.beginPath(); ctx.arc(ex + 0.9, ey, 1.4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
    glow(pr, ctx) { if (pr.kind === 2) G.drawGlow(ctx, pr.x, pr.y - 22, 34, '#eaffb0', 0.55 + 0.15 * sin(G.time * 2)); },
    light(pr) { G.lights.add(pr.x, pr.y - 30, 260, '#ffe6c0', 0.55); },
  });

  // one item of stock, floating in a bubble
  G.defProp('ware', {
    r: 24, reach: 62,
    prompt(pr) { return pr.kind === 'patch' ? `PATCH HULL  ·  ${pr.price} PEARLS` : `BUY  ·  ${pr.price} PEARLS`; },
    init(pr) { pr.by = pr.y; pr.pop = 0; },
    canInteract(pr, p) { return !(pr.kind === 'patch' && p.hull >= p.st.maxHull); },
    interact(pr, p) {
      if (p.pearls < pr.price) { G.sfx('deny'); G.story.hermit('poor'); pr.shake = 0.4; return; }
      p.pearls -= pr.price; pr.used = true; pr.pop = 0.001;
      G.sfx('buy'); G.sfx('pop', { x: pr.x, y: pr.y });
      G.particles.bubbles(pr.x, pr.y, 12, 16, 110);
      G.particles.motes(pr.x, pr.y, 10, pr.color, { s0: 30, s1: 150, life: 0.7 });
      if (pr.kind === 'patch') { p.heal(2); G.story.hermit('heal'); }
      else { p.addModule(pr.mod); G.sfx('module'); G.story.hermit('buy'); G.hud.toast(G.MODULES[pr.mod].name, 'fitted', { tag: 'BOUGHT', color: pr.color }); }
      const h = G.zone.hermit; if (h) h.wave = 1.2;
    },
    update(pr, dt) {
      pr.y = pr.by + sin(G.time * 1.6 + pr.ph) * 4;
      pr.shake = max(0, (pr.shake || 0) - dt);
      if (pr.pop > 0) { pr.pop += dt * 3; if (pr.pop > 1) pr.dead = true; }
    },
    draw(pr, ctx) {
      if (pr.pop > 0) return;
      const sx = pr.shake > 0 ? sin(G.time * 60) * 3 : 0, R = 25;
      ctx.globalAlpha = 0.9; ctx.drawImage(G.spr.bubble, pr.x - R + sx, pr.y - R, R * 2, R * 2); ctx.globalAlpha = 1;
    },
    glow(pr, ctx) {
      if (pr.pop > 0) return;
      const p = G.player, can = p.pearls >= pr.price, sx = pr.shake > 0 ? sin(G.time * 60) * 3 : 0, focus = G.props.focus === pr;
      G.drawGlow(ctx, pr.x, pr.y, 40 + (focus ? 8 : 0), pr.color, 0.28 + (focus ? 0.2 : 0));
      if (pr.kind === 'patch') { ctx.fillStyle = '#9dffb8'; ctx.fillRect(pr.x - 2.5 + sx, pr.y - 10, 5, 20); ctx.fillRect(pr.x - 10 + sx, pr.y - 2.5, 20, 5); }
      else G.modIcon(ctx, G.MODULES[pr.mod].icon, pr.x + sx, pr.y, 1.05, pr.color);
      // price tag
      const ty = pr.by + 42;
      ctx.fillStyle = can ? '#ffeaf6' : 'rgba(255,234,246,0.4)'; ctx.beginPath(); ctx.arc(pr.x - 12, ty - 4, 4, 0, TAU); ctx.fill();
      G.text(ctx, String(pr.price), pr.x - 4, ty, { size: 12, font: 'mono', weight: 700, color: can ? '#ffeaf6' : '#b08a9a' });
    },
    light(pr) { if (!pr.used) G.lights.add(pr.x, pr.y, 110, pr.color, 0.4); },
  });

  G.shop = {
    setup(zone) {
      const rng = G.RNG((zone.seed ^ 0x51ed270b) >>> 0), H = G.popHelp, sx = zone.start.x, sy = zone.start.y;
      // the Hermit takes the floor of the entry chamber, off to one side
      const side = rng.sign();
      let fl = H.surface(rng, sx + side * 110, sy + 90, 150, 'floor', 30) || H.surface(rng, sx, sy + 90, 220, 'floor', 30);
      const hx = fl ? fl.x + fl.nx * 4 : sx + side * 120, hy = fl ? fl.y + fl.ny * 4 : sy + 70;
      zone.hermit = G.props.add('hermit', hx, hy, { kind: clamp(zone.idx, 1, 4) });
      // stock: three modules and a hull patch, strung out across the chamber away from him
      const ids = G.offerModules(3);
      const items = ids.map(id => ({ kind: 'module', mod: id, color: G.RARITY[G.MODULES[id].rarity].color, price: PRICE[G.MODULES[id].rarity] + zone.idx * 2 }));
      items.push({ kind: 'patch', color: '#9dffb8', price: 7 + zone.idx * 2 });
      const n = items.length;
      items.forEach((it, i) => {
        let x = sx - side * 20 + (i - (n - 1) / 2) * 84, y = sy + 8 + (i & 1 ? 26 : -12);
        for (let k = 0; k < 12 && G.sdf(x, y) < 34; k++) { x += (sx - x) * 0.2; y += (sy - y) * 0.2; }
        G.props.add('ware', x, y, it);
      });
    },
  };

  G.codexAdd('hermit', { name: 'The Hermit', latin: 'Pagurus sp., probably', zone: 1, kind: 'fauna', size: 'depends on the shell', prop: 'hermit', propO: { kind: 1, peek: 1 }, showR: 40, showY: 26, notes: 'A hermit crab, wearing whatever has fallen off the surface world most recently. Sells salvaged parts for pearls and keeps the stock in bubbles. I asked how he gets ahead of me at every level. He said he takes the stairs.' });
})();
