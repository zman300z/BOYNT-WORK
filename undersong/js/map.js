'use strict';
/* UNDERSONG — map: hold TAB for a chart of the cave so far. Only what the lamp or the sonar
   has touched is drawn; the song's source is always marked, because you can always hear it. */
(function () {
  const { sin, cos, min, max, floor, ceil, PI, round } = Math;
  const { clamp } = G;
  const TAU = G.TAU, B = 8;       // one "seen" block = 8x8 cells

  const M = G.map = {
    zone: null, base: null, shown: null, sctx: null, seen: null, bw: 0, bh: 0, k: 0,

    build(zone) {
      this.zone = zone;
      const W = zone.W, H = zone.H, NW = zone.NW, sd = zone.sd;
      this.base = G.makeCanvas(W, H);
      const x = this.base.getContext('2d'), img = x.createImageData(W, H), d = img.data;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const v = sd[j * NW + i], o = (j * W + i) * 4;
        if (v > 0) { const e = v < 22 ? 1 : 0; d[o] = e ? 190 : 80; d[o + 1] = e ? 236 : 150; d[o + 2] = 255; d[o + 3] = e ? 235 : 120; }
      }
      x.putImageData(img, 0, 0);
      this.shown = G.makeCanvas(W, H); this.sctx = this.shown.getContext('2d');
      this.bw = ceil(W / B); this.bh = ceil(H / B);
      this.seen = new Uint8Array(this.bw * this.bh);
    },
    reveal(x, y, r) {
      const cs = G.CS * B, i0 = max(0, floor((x - r) / cs)), i1 = min(this.bw - 1, floor((x + r) / cs)), j0 = max(0, floor((y - r) / cs)), j1 = min(this.bh - 1, floor((y + r) / cs));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * this.bw + i;
        if (this.seen[k]) continue;
        const cx = (i + 0.5) * cs - x, cy = (j + 0.5) * cs - y;
        if (cx * cx + cy * cy > (r + cs * 0.5) * (r + cs * 0.5)) continue;
        this.seen[k] = 1;
        this.sctx.drawImage(this.base, i * B, j * B, B, B, i * B, j * B, B, B);
      }
    },
    isSeen(x, y) { const cs = G.CS * B, i = floor(x / cs), j = floor(y / cs); return i >= 0 && j >= 0 && i < this.bw && j < this.bh && !!this.seen[j * this.bw + i]; },

    update(dt) {
      const zone = G.zone, p = G.player;
      if (!zone) return;
      if (this.zone !== zone) this.build(zone);
      if ((G.frame & 7) === 0) this.reveal(p.x, p.y, 430);
      this.k = G.damp(this.k, G.input.map && G.game.state === 'play' && !G.menu.active() ? 1 : 0, 14, dt);
    },

    draw(u) {
      if (this.k < 0.02 || !this.zone) return;
      const zone = this.zone, p = G.player, a = this.k, t = G.time;
      const sc = min(600 / zone.H, 520 / zone.W), w = zone.W * sc, h = zone.H * sc, x0 = G.W / 2 - w / 2, y0 = (G.H - h) / 2 + 6;
      u.globalAlpha = a;
      const pw = max(w + 52, 400), px = G.W / 2 - pw / 2;
      u.fillStyle = 'rgba(3,10,20,0.9)'; G.roundRect(u, px, y0 - 44, pw, h + 76, 12); u.fill();
      u.strokeStyle = G.UI.LINE; u.lineWidth = 1; G.roundRect(u, px, y0 - 44, pw, h + 76, 12); u.stroke();
      G.text(u, zone.def.name, px + 20, y0 - 20, { size: 10, font: 'mono', weight: 700, color: G.UI.DIM, spacing: 3 });
      G.text(u, G.fmtInt(G.world.depthAt(p.y)) + ' M', px + pw - 20, y0 - 20, { size: 10, font: 'mono', weight: 700, color: G.UI.INK, align: 'right', spacing: 2 });
      u.imageSmoothingEnabled = false;
      u.drawImage(this.shown, x0, y0, w, h);
      u.imageSmoothingEnabled = true;
      const mx = wx => x0 + wx / G.CS * sc, my = wy => y0 + wy / G.CS * sc;
      // where the song is coming from
      const ex = zone.idx === 4 && zone.shelf ? zone.shelf : zone.exit;
      u.strokeStyle = G.UI.GOLD; u.lineWidth = 1.6;
      u.globalAlpha = a * (0.6 + 0.4 * sin(t * 3)); u.beginPath(); u.arc(mx(ex.x), my(min(ex.y, zone.pxH - 30)), 6 + sin(t * 3) * 1.5, 0, TAU); u.stroke();
      u.globalAlpha = a;
      // things found but not yet used
      for (const pr of G.ents.props) {
        if (pr.dead || pr.used || !this.isSeen(pr.x, pr.y)) continue;
        const X = mx(pr.x), Y = my(pr.y);
        if (pr.type === 'pod') { u.fillStyle = G.UI.GOLD; u.beginPath(); u.moveTo(X, Y - 4); u.lineTo(X + 4, Y); u.lineTo(X, Y + 4); u.lineTo(X - 4, Y); u.closePath(); u.fill(); }
        else if (pr.type === 'cleaner') { u.fillStyle = '#7dffb0'; u.fillRect(X - 1, Y - 4, 2, 8); u.fillRect(X - 4, Y - 1, 8, 2); }
        else if (pr.type === 'wreck') { u.fillStyle = '#c9b8ff'; u.beginPath(); u.arc(X, Y, 3.4, 0, TAU); u.fill(); u.strokeStyle = '#c9b8ff'; u.lineWidth = 1; u.beginPath(); u.arc(X, Y, 6.5, 0, TAU); u.stroke(); }
        else if (pr.type === 'hermit') { u.fillStyle = '#ffb07a'; u.beginPath(); u.arc(X, Y, 3.2, 0, TAU); u.fill(); }
      }
      // you
      const X = mx(p.x), Y = my(p.y);
      u.fillStyle = '#ffd040'; u.beginPath(); u.arc(X, Y, 3.6, 0, TAU); u.fill();
      u.strokeStyle = '#fff3d6'; u.lineWidth = 1.4; u.beginPath(); u.moveTo(X, Y); u.lineTo(X + cos(p.face) * 11, Y + sin(p.face) * 11); u.stroke();
      G.text(u, '◆ pod    + cleaning station    ● wreck    ○ the song', G.W / 2, y0 + h + 22, { size: 9, font: 'mono', color: G.UI.DIM, align: 'center', spacing: 1 });
      u.globalAlpha = 1;
    },
  };
  G.on('sonar', p => { if (M.zone === G.zone) M.reveal(p.x, p.y, 1050); });
})();
