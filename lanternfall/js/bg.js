'use strict';
// ============================================================================
// Parallax backgrounds & ambient weather
// ============================================================================
(function () {
  const G = window.G;
  const LW = 960; // layer width (tileable)

  function tri(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + w / 2, y - h);
    c.lineTo(x + w, y);
    c.fill();
  }
  // draw shape at x and x±LW so the layer tiles seamlessly
  function wrap(fn, x, w) {
    fn(x);
    if (x < w) fn(x + LW);
    if (x + w > LW - w) fn(x - LW);
  }

  const BUILDERS = {
    pillars(c, col, rng, H) {
      for (let x = 0; x < LW; x += 120) {
        const w = 26 + rng.int(0, 10);
        c.fillStyle = col;
        c.fillRect(x, 0, w, H);
        c.fillRect(x - 6, 40, w + 12, 10);
        c.fillRect(x - 6, H - 60, w + 12, 12);
        c.fillStyle = G.shade(col, 0.08);
        c.fillRect(x + 4, 0, 3, H);
        // arch between pillars
        c.fillStyle = col;
        c.beginPath();
        c.arc(x + w + 47, 60, 50, Math.PI, 0);
        c.lineTo(x + w + 97, 40);
        c.lineTo(x + w - 3, 40);
        c.fill();
      }
      c.fillStyle = col;
      c.fillRect(0, 0, LW, 20);
    },
    arches(c, col, rng, H) {
      c.fillStyle = col;
      for (let x = 0; x < LW; x += 160) {
        c.fillRect(x, 120, 30, H);
        c.beginPath();
        c.moveTo(x, 120);
        c.quadraticCurveTo(x + 95, 20, x + 190, 120);
        c.lineTo(x + 190, 100);
        c.quadraticCurveTo(x + 95, 0, x, 100);
        c.fill();
      }
      c.fillRect(0, H - 40, LW, 40);
    },
    lighthouse(c, col, rng, H, L) {
      const s = 0.5 + (L.dist || 0.3) * 1.6;
      const x = 640, base = H - 60;
      c.fillStyle = col;
      // island
      c.beginPath();
      c.ellipse(x, base + 30, 150 * s, 40 * s, 0, 0, Math.PI * 2);
      c.fill();
      // tower
      const tw = 22 * s, th = 150 * s;
      c.beginPath();
      c.moveTo(x - tw, base);
      c.lineTo(x - tw * 0.6, base - th);
      c.lineTo(x + tw * 0.6, base - th);
      c.lineTo(x + tw, base);
      c.fill();
      c.fillRect(x - tw * 0.9, base - th - 6 * s, tw * 1.8, 6 * s);
      c.fillRect(x - tw * 0.5, base - th - 28 * s, tw, 22 * s);
      tri(c, x - tw * 0.7, base - th - 28 * s, tw * 1.4, 14 * s, col);
      // dark (unlit) lantern window
      c.fillStyle = G.shade(col, -0.35);
      c.fillRect(x - tw * 0.35, base - th - 24 * s, tw * 0.7, 14 * s);
    },
    sea(c, col, rng, H) {
      const top = H - 110;
      c.fillStyle = col;
      c.fillRect(0, top, LW, H - top);
      c.fillStyle = G.shade(col, 0.15);
      for (let i = 0; i < 90; i++) c.fillRect(rng.int(0, LW), top + 4 + rng.int(0, 100), rng.int(6, 24), 1);
      c.fillStyle = G.shade(col, 0.3);
      c.fillRect(0, top, LW, 1);
    },
    ships(c, col, rng, H) {
      c.fillStyle = col;
      for (let i = 0; i < 4; i++) {
        const x = 60 + i * 240 + rng.int(-30, 30), y = H - 70;
        c.beginPath();
        c.moveTo(x - 60, y);
        c.lineTo(x + 70, y);
        c.lineTo(x + 50, y + 22);
        c.lineTo(x - 45, y + 22);
        c.fill();
        c.fillRect(x - 2, y - 110, 3, 110);
        c.fillRect(x + 30, y - 80, 3, 80);
        c.fillRect(x - 30, y - 90, 60, 2);
        c.fillRect(x - 20, y - 60, 40, 2);
        // torn sail
        c.beginPath();
        c.moveTo(x + 2, y - 105);
        c.lineTo(x + 28, y - 95);
        c.lineTo(x + 22, y - 70);
        c.lineTo(x + 2, y - 72);
        c.fill();
        G.pixLine(c, x - 2, y - 110, x - 60, y, col);
        G.pixLine(c, x + 1, y - 110, x + 70, y, col);
      }
      c.fillRect(0, H - 48, LW, 48);
    },
    houses(c, col, rng, H) {
      let x = 0;
      while (x < LW) {
        const w = rng.int(50, 90), h = rng.int(60, 130);
        const y = H - h;
        c.fillStyle = col;
        c.fillRect(x, y, w, h);
        tri(c, x - 6, y, w + 12, rng.int(20, 36), col);
        if (rng.chance(0.4)) c.fillRect(x + w - 16, y - 34, 8, 20);
        for (let wy = y + 14; wy < H - 20; wy += 22)
          for (let wx = x + 8; wx < x + w - 10; wx += 18)
            if (rng.chance(0.25)) {
              c.fillStyle = rng.chance(0.3) ? '#c89040' : G.shade(col, 0.12);
              c.fillRect(wx, wy, 5, 7);
            }
        x += w + rng.int(4, 20);
      }
      // piers
      c.fillStyle = col;
      c.fillRect(0, H - 16, LW, 16);
      for (let px = 0; px < LW; px += 30) c.fillRect(px, H - 34, 4, 20);
    },
    hills(c, col, rng, H) {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(0, H);
      for (let x = 0; x <= LW; x += 8) {
        const y = H - 120 - Math.sin((x / LW) * Math.PI * 2 * 2) * 40 - Math.sin((x / LW) * Math.PI * 2 * 5 + 1) * 16;
        c.lineTo(x, y);
      }
      c.lineTo(LW, H);
      c.fill();
    },
    trees(c, col, rng, H) {
      c.fillStyle = col;
      for (let i = 0; i < 22; i++) {
        const x = rng.int(0, LW), h = rng.int(100, 200);
        wrap((xx) => {
          c.fillRect(xx - 4, H - h, 8, h);
          if (rng.chance(0.5)) {
            for (let k = 0; k < 5; k++) {
              c.beginPath();
              c.arc(xx + rng.int(-24, 24), H - h + rng.int(-10, 30), rng.int(18, 34), 0, Math.PI * 2);
              c.fill();
            }
          } else {
            for (let k = 0; k < 5; k++) tri(c, xx - 30 + k * 4, H - h + 40 + k * 26, 60 - k * 8 + 20, 60, col);
          }
        }, x, 60);
      }
      c.fillRect(0, H - 30, LW, 30);
    },
    thorns(c, col, rng, H) {
      c.strokeStyle = col;
      c.fillStyle = col;
      for (let i = 0; i < 9; i++) {
        let x = rng.int(0, LW), y = H;
        c.lineWidth = rng.int(6, 12);
        c.beginPath();
        c.moveTo(x, y);
        const pts = [];
        for (let k = 0; k < 8; k++) {
          x += rng.int(-40, 40);
          y -= rng.int(20, 40);
          c.lineTo(x, y);
          pts.push([x, y]);
        }
        c.stroke();
        for (const [px, py] of pts) {
          tri(c, px - 3, py, 6, 14, col);
          tri(c, px + 2, py + 8, 6, -12, col);
        }
      }
      c.fillRect(0, H - 20, LW, 20);
    },
    clouds(c, col, rng, H) {
      c.fillStyle = col;
      for (let i = 0; i < 16; i++) {
        const x = rng.int(0, LW), y = rng.int(40, H - 120), w = rng.int(80, 200);
        wrap((xx) => {
          c.globalAlpha = 0.55;
          for (let k = 0; k < 6; k++) {
            c.beginPath();
            c.ellipse(xx + (k / 6) * w, y + Math.sin(k) * 6, w / 5, 12 + (k % 3) * 5, 0, 0, Math.PI * 2);
            c.fill();
          }
          c.globalAlpha = 1;
        }, x, w);
      }
    },
    towers(c, col, rng, H, L) {
      c.fillStyle = col;
      const big = L.big;
      let x = rng.int(0, 60);
      while (x < LW) {
        const w = big ? rng.int(50, 80) : rng.int(24, 44), h = big ? rng.int(150, 260) : rng.int(90, 200);
        c.fillRect(x, H - h, w, h);
        for (let k = 0; k < w; k += 10) c.fillRect(x + k, H - h - 8, 6, 8);
        if (rng.chance(0.5)) tri(c, x - 4, H - h - 8, w + 8, rng.int(30, 60), col);
        c.fillStyle = G.shade(col, -0.2);
        for (let wy = H - h + 20; wy < H - 20; wy += 34) c.fillRect(x + w / 2 - 2, wy, 4, 10);
        c.fillStyle = col;
        // wall between towers
        const gap = rng.int(40, 120);
        c.fillRect(x + w, H - (big ? 90 : 60), gap, big ? 90 : 60);
        for (let k = 0; k < gap; k += 12) c.fillRect(x + w + k, H - (big ? 98 : 68), 7, 8);
        x += w + gap;
      }
    },
    stalactites(c, col, rng, H) {
      c.fillStyle = col;
      c.fillRect(0, 0, LW, 30);
      c.fillRect(0, H - 30, LW, 30);
      for (let x = 0; x < LW; x += rng.int(14, 40)) {
        const h = rng.int(30, 140);
        tri(c, x, 30, rng.int(16, 36), -h, col);
        if (rng.chance(0.6)) tri(c, x + 10, H - 30, rng.int(20, 40), rng.int(20, 100), col);
      }
    },
    crystals(c, col, rng, H) {
      for (let i = 0; i < 14; i++) {
        const x = rng.int(0, LW), y = H - rng.int(0, 40);
        const glow = rng.chance(0.5) ? '#2a6a7a' : '#5a3a7a';
        for (let k = 0; k < 4; k++) {
          const hh = rng.int(30, 110), ww = rng.int(10, 20), ang = rng.range(-0.5, 0.5);
          c.save();
          c.translate(x + k * 8, y);
          c.rotate(ang);
          c.fillStyle = col;
          c.fillRect(-ww / 2, -hh, ww, hh);
          tri(c, -ww / 2, -hh, ww, 14, col);
          c.fillStyle = G.mix(col, glow, 0.5);
          c.fillRect(-ww / 2 + 2, -hh + 4, 2, hh - 8);
          c.restore();
        }
      }
      c.fillStyle = col;
      c.fillRect(0, H - 24, LW, 24);
    },
    gothic(c, col, rng, H) {
      c.fillStyle = col;
      for (let x = 0; x < LW; x += 140) {
        c.fillRect(x, 60, 50, H);
        tri(c, x - 4, 60, 58, 90, col);
        c.fillRect(x + 22, -40, 6, 100);
        // flying buttress
        c.beginPath();
        c.moveTo(x + 50, 160);
        c.quadraticCurveTo(x + 95, 150, x + 140, 240);
        c.lineTo(x + 140, 250);
        c.quadraticCurveTo(x + 95, 170, x + 50, 176);
        c.fill();
        c.fillStyle = '#3a2a4a';
        c.fillRect(x + 18, 110, 14, 40);
        c.fillStyle = col;
      }
    },
    glass(c, col, rng, H) {
      for (let x = 30; x < LW; x += 200) {
        c.fillStyle = col;
        c.fillRect(x - 10, 0, 120, H);
        const cx = x + 50, cy = 120;
        c.beginPath();
        c.arc(cx, cy, 44, 0, Math.PI * 2);
        c.fillStyle = '#20182e';
        c.fill();
        const cols = ['#5a2a3a', '#2a3a5a', '#3a5a3a', '#5a4a2a'];
        for (let k = 0; k < 8; k++) {
          c.fillStyle = cols[k % 4];
          c.beginPath();
          c.moveTo(cx, cy);
          c.arc(cx, cy, 40, (k / 8) * Math.PI * 2, ((k + 1) / 8) * Math.PI * 2);
          c.fill();
        }
        c.fillStyle = col;
        c.beginPath();
        c.arc(cx, cy, 10, 0, Math.PI * 2);
        c.fill();
        c.fillRect(x + 10, 190, 80, H);
        c.fillStyle = '#1a1424';
        c.fillRect(x + 22, 200, 16, 90);
        c.fillRect(x + 62, 200, 16, 90);
      }
    },
    skulls(c, col, rng, H) {
      c.fillStyle = col;
      c.fillRect(0, 0, LW, H);
      c.fillStyle = G.shade(col, -0.35);
      for (let y = 20; y < H; y += 36)
        for (let x = (y / 36) % 2 ? 0 : 20; x < LW; x += 40) {
          c.fillRect(x + 6, y, 28, 26);
          if (rng.chance(0.7)) {
            c.fillStyle = G.shade(col, 0.25);
            c.fillRect(x + 13, y + 8, 14, 12);
            c.fillRect(x + 15, y + 20, 10, 4);
            c.fillStyle = G.shade(col, -0.35);
            c.fillRect(x + 15, y + 11, 3, 4);
            c.fillRect(x + 22, y + 11, 3, 4);
          }
        }
    },
    ribs(c, col, rng, H) {
      c.strokeStyle = col;
      for (let x = 40; x < LW; x += 110) {
        c.lineWidth = 16;
        c.beginPath();
        c.moveTo(x, H);
        c.quadraticCurveTo(x - 30, H * 0.3, x + 60, 10);
        c.stroke();
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(x + 50, H);
        c.quadraticCurveTo(x + 20, H * 0.5, x + 90, 60);
        c.stroke();
      }
    },
  };

  G.buildBackground = (style, seed) => {
    const rng = new G.RNG(seed || 1234);
    const H = 360;
    const sky = G.makeCanvas(1, 256);
    const g = sky.ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, style.sky.top);
    g.addColorStop(1, style.sky.bottom);
    sky.ctx.fillStyle = g;
    sky.ctx.fillRect(0, 0, 1, 256);
    const layers = [];
    for (const L of style.layers || []) {
      const cv = G.makeCanvas(LW, H);
      const b = BUILDERS[L.kind];
      if (b) b(cv.ctx, L.color, rng, H, L);
      layers.push({ img: cv, f: L.factor, kind: L.kind });
    }
    const stars = [];
    if (style.sky.stars) for (let i = 0; i < 90; i++) stars.push({ x: rng.next() * G.W, y: rng.next() * G.H * 0.7, s: rng.chance(0.15) ? 2 : 1, p: rng.next() * 6 });
    const bg = {
      style, sky, layers, stars, lightning: 0, nextBolt: 4 + rng.next() * 8,
      draw(ctx, camX, camY, levelH, t, dt) {
        ctx.drawImage(sky, 0, 0, G.W, G.H);
        for (const s of stars) {
          const a = 0.4 + Math.sin(t * 2 + s.p) * 0.3;
          ctx.globalAlpha = a;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(s.x, s.y, s.s, s.s);
        }
        ctx.globalAlpha = 1;
        const cel = style.sky.celestial;
        const vy = -(camY - Math.max(0, levelH - G.H)) * 0.02;
        if (cel === 'moon' || cel === 'bigmoon') {
          const r = cel === 'bigmoon' ? 60 : 22;
          const mx = G.W * 0.75 - camX * 0.01, my = 70 + vy;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.25;
          ctx.drawImage(G.glowSprite('#a0c0ff'), mx - r * 4, my - r * 4, r * 8, r * 8);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          G.pixCircle(ctx, mx, my, r, '#e8ecf0');
          ctx.fillStyle = '#c8ccd8';
          ctx.fillRect(mx - r * 0.4, my - r * 0.3, r * 0.3, r * 0.3);
          ctx.fillRect(mx + r * 0.2, my + r * 0.2, r * 0.4, r * 0.25);
          ctx.fillRect(mx - r * 0.1, my + r * 0.5, r * 0.2, r * 0.15);
        } else if (cel === 'sun') {
          const mx = G.W * 0.3 - camX * 0.01, my = 210 + vy;
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = 0.5;
          ctx.drawImage(G.glowSprite('#ff9050'), mx - 180, my - 180, 360, 360);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          G.pixCircle(ctx, mx, my, 38, '#ffc070');
          ctx.fillStyle = '#ffe0a0';
          for (let i = 0; i < 4; i++) ctx.fillRect(mx - 38, my + 8 + i * 7, 76, 2);
        }
        for (const L of layers) {
          const w = L.img.width;
          let ox = -((camX * L.f) % w);
          if (ox > 0) ox -= w;
          const oy = -(camY - Math.max(0, levelH - G.H)) * L.f * 0.5;
          for (let x = ox; x < G.W; x += w) ctx.drawImage(L.img, Math.round(x), Math.round(G.H - L.img.height + oy));
        }
        // storm lightning
        if (style.sky.storm) {
          this.nextBolt -= dt;
          if (this.nextBolt <= 0) {
            this.nextBolt = 5 + Math.random() * 10;
            this.lightning = 0.35;
            if (G.Audio) setTimeout(() => G.Audio.play('thunder'), 300 + Math.random() * 600);
          }
          if (this.lightning > 0) {
            this.lightning -= dt;
            ctx.globalAlpha = Math.max(0, this.lightning) * (Math.random() < 0.6 ? 1.2 : 0.4);
            ctx.fillStyle = '#c8d0ff';
            ctx.fillRect(0, 0, G.W, G.H);
            ctx.globalAlpha = 1;
          }
        }
      },
    };
    return bg;
  };

  // ------------------------------------------------------------ ambient particles
  const amb = [];
  G.Ambient = {
    clear() { amb.length = 0; },
    update(dt, kind, cam) {
      if (!kind) return;
      const cx = cam.x, cy = cam.y;
      const rate = { dust: 6, rain: 90, fireflies: 3, embers: 8, spores: 7, bubbles: 6, ghosts: 1.5, wind: 10 }[kind] || 0;
      let n = rate * dt;
      while (n > 0) {
        if (Math.random() < n) {
          const p = { x: cx + Math.random() * G.W, y: cy + Math.random() * G.H, vx: 0, vy: 0, life: 4, max: 4, k: kind, ph: Math.random() * 6 };
          switch (kind) {
            case 'dust': p.vx = (Math.random() - 0.5) * 6; p.vy = 3 + Math.random() * 4; p.life = p.max = 5; break;
            case 'rain': p.x = cx + Math.random() * (G.W + 120) - 40; p.y = cy - 10; p.vx = -90; p.vy = 520 + Math.random() * 100; p.life = p.max = 0.9; break;
            case 'fireflies': p.life = p.max = 6; break;
            case 'embers': p.y = cy + G.H + 5; p.vx = 10 + Math.random() * 20; p.vy = -30 - Math.random() * 30; p.life = p.max = 8; break;
            case 'spores': p.vy = -6 - Math.random() * 6; p.life = p.max = 6; break;
            case 'bubbles': p.y = cy + G.H + 5; p.vy = -20 - Math.random() * 20; p.life = p.max = 10; break;
            case 'ghosts': p.vx = (Math.random() - 0.5) * 10; p.vy = -4; p.life = p.max = 6; break;
            case 'wind': p.x = cx - 20; p.vx = 300 + Math.random() * 200; p.vy = 10; p.life = p.max = 2.5; break;
          }
          if (amb.length < 400) amb.push(p);
        }
        n -= 1;
      }
      for (let i = amb.length - 1; i >= 0; i--) {
        const p = amb[i];
        p.life -= dt;
        if (p.life <= 0 || p.k !== kind) { amb.splice(i, 1); continue; }
        if (p.k === 'fireflies' || p.k === 'spores' || p.k === 'ghosts') {
          p.vx += Math.sin(G.time * 1.3 + p.ph) * 8 * dt;
          p.vy += Math.cos(G.time * 1.1 + p.ph * 2) * 8 * dt;
        }
        if (p.k === 'bubbles') p.vx = Math.sin(G.time * 3 + p.ph) * 8;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    },
    draw(ctx, cx, cy) {
      for (const p of amb) {
        const x = p.x - cx, y = p.y - cy;
        if (x < -20 || y < -20 || x > G.W + 20 || y > G.H + 20) continue;
        const a = Math.min(1, p.life / p.max * 3, (p.max - p.life) * 2);
        switch (p.k) {
          case 'dust': ctx.globalAlpha = a * 0.35; ctx.fillStyle = '#d8d0c0'; ctx.fillRect(x, y, 1, 1); break;
          case 'rain': ctx.globalAlpha = 0.35; ctx.fillStyle = '#a0c8d8'; ctx.fillRect(x, y, 1, 6); ctx.fillRect(x - 1, y + 5, 1, 3); break;
          case 'fireflies': {
            const f = 0.5 + Math.sin(G.time * 4 + p.ph) * 0.5;
            ctx.globalAlpha = a * f;
            ctx.fillStyle = '#e0ff80';
            ctx.fillRect(x, y, 2, 2);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = a * f * 0.4;
            ctx.drawImage(G.glowSprite('#c0ff60'), x - 8, y - 8, 18, 18);
            ctx.globalCompositeOperation = 'source-over';
            break;
          }
          case 'embers': ctx.globalAlpha = a * 0.8; ctx.fillStyle = Math.sin(p.ph + G.time * 5) > 0 ? '#ffb050' : '#ff7030'; ctx.fillRect(x, y, 1, 1); break;
          case 'spores': ctx.globalAlpha = a * 0.6; ctx.fillStyle = p.ph > 3 ? '#70f0e0' : '#c090ff'; ctx.fillRect(x, y, 1, 1); break;
          case 'bubbles': ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#a0d8f0'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x), Math.round(y), 2, 2); break;
          case 'ghosts': ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#90ffb0'; ctx.fillRect(x, y, 2, 4); ctx.fillRect(x - 1, y + 1, 4, 2); break;
          case 'wind': ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#e0e8ff'; ctx.fillRect(x, y, 14, 1); break;
        }
      }
      ctx.globalAlpha = 1;
    },
  };
})();
