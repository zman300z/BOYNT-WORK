// Dev helper: render music or sound effects through an OfflineAudioContext and write a WAV.
//   node tools/audiotest.js music <mode> <seconds> <intensity> <found> out.wav
//   node tools/audiotest.js sfx out.wav            (every effect, one per second; prints peak/rms table)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const [kind, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '')));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', 'index.html') + '?mute&nofx');
  await page.waitForTimeout(600);
  const opts = kind === 'music'
    ? { kind, mode: rest[0] || 'title', secs: +(rest[1] || 20), inten: +(rest[2] || 0), found: +(rest[3] || 0) }
    : { kind: 'sfx' };
  const out = kind === 'music' ? (rest[4] || 'music.wav') : (rest[0] || 'sfx.wav');
  const res = await page.evaluate(async (o) => {
    const SR = 44100;
    const names = Object.keys(G.sfxTable);
    const secs = o.kind === 'music' ? o.secs : names.length + 1;
    const ctx = new OfflineAudioContext(2, SR * secs, SR);
    G.audio.init(ctx);
    if (o.kind === 'music') {
      G.music.found = o.found; G.music.target = o.inten; G.music.inten = o.inten;
      G.music.set(o.mode, true); G.music.start();
      for (let t = 0.1; t < secs; t += 0.1) ctx.suspend(t).then(() => { G.music.update(0.1); ctx.resume(); });
      G.music.update(0.1);
    } else {
      G.music.build();
      names.forEach((n, i) => { ctx.suspend(i + 0.05).then(() => { try { G.sfxTable[n]({ n: 3, p: 0.5, i: 2, size: 0.4 }); } catch (e) { console.error('sfx ' + n + ': ' + e.message); } ctx.resume(); }); });
    }
    const buf = await ctx.startRendering();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const stats = [];
    if (o.kind === 'sfx') names.forEach((n, i) => {
      let pk = 0, sq = 0; const a = i * SR, b = Math.min(L.length, a + SR);
      for (let k = a; k < b; k++) { const v = Math.max(Math.abs(L[k]), Math.abs(R[k])); if (v > pk) pk = v; sq += L[k] * L[k]; }
      stats.push([n, +pk.toFixed(3), +Math.sqrt(sq / (b - a)).toFixed(4)]);
    });
    let pk = 0, bad = 0;
    const pcm = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) {
      if (!isFinite(L[i]) || !isFinite(R[i])) bad++;
      pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
      pcm[i * 2] = Math.max(-1, Math.min(1, L[i])) * 32767; pcm[i * 2 + 1] = Math.max(-1, Math.min(1, R[i])) * 32767;
    }
    const bytes = new Uint8Array(pcm.buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { b64: btoa(bin), peak: pk, bad, stats, secs };
  }, opts);
  const pcm = Buffer.from(res.b64, 'base64');
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20);
  hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(44100, 24); hdr.writeUInt32LE(44100 * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34);
  hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(out, Buffer.concat([hdr, pcm]));
  console.log(`wrote ${out}  ${res.secs}s  peak ${res.peak.toFixed(3)}  nonfinite ${res.bad}`);
  if (res.stats.length) console.log(res.stats.map(s => s[0].padEnd(13) + ' peak ' + String(s[1]).padEnd(6) + ' rms ' + s[2]).join('\n'));
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})();
