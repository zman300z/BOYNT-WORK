/* ============================================================
   PILE-DRIVER  ::  audio.js   tiny web-audio noise box
   ============================================================ */
const Sfx = (() => {
  let ctx = null, on = true, master = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }

  function beep(freq, dur, type, vol, slide) {
    if (!on) return;
    init();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.3, ctx.currentTime + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }

  function noise(dur, vol) {
    if (!on) return;
    init();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol || 0.2;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 1200;
    s.connect(f); f.connect(g); g.connect(master);
    s.start();
  }

  /* ---------------- background music ----------------
     A driving little casino-lounge loop, all synthesised so the file stays
     self-contained. It reacts to the game: as your TEMPO and HEAT climb the
     tempo nudges up, a hat layer and an arp come in, and the filter opens.   */
  let musicOn = false, musicTimer = null, step = 0, musicGain = null, musicFilter = null;
  let intensity = 0, targetIntensity = 0;

  const ROOT = 55;                                    // A1
  /* i - VI - III - VII : the four chords every card game runs on */
  const PROG = [
    { deg: 0,  quality: [0, 3, 7, 10] },
    { deg: 8,  quality: [0, 4, 7, 11] },
    { deg: 3,  quality: [0, 4, 7, 11] },
    { deg: 10, quality: [0, 4, 7, 10] }
  ];
  const PENT = [0, 3, 5, 7, 10, 12, 15];
  const semi = n => Math.pow(2, n / 12);

  function mtone(freq, dur, type, vol, when, slide) {
    if (!ctx || !musicGain) return;
    const t = when || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicFilter);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function kick(when) {
    if (!ctx || !musicGain) return;
    const t = when || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.2);
  }

  function noiseHit(when, dur, hp, vol) {
    if (!ctx || !musicGain) return;
    const t = when || ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(t);
  }

  /* one sixteenth */
  function tick() {
    if (!musicOn || !ctx) return;
    intensity += (targetIntensity - intensity) * 0.08;

    const bar = Math.floor(step / 16) % PROG.length;
    const chord = PROG[bar];
    const s16 = step % 16;
    const t = ctx.currentTime + 0.03;
    const rootHz = ROOT * semi(chord.deg);

    if (musicFilter) musicFilter.frequency.setTargetAtTime(700 + intensity * 4200, ctx.currentTime, 0.25);

    /* backbeat */
    if (s16 === 0 || s16 === 6 || s16 === 10) kick(t);
    if (s16 === 4 || s16 === 12) noiseHit(t, 0.13, 1400, 0.16 + intensity * 0.07);   // snare
    if (s16 % 2 === 0) noiseHit(t, 0.03, 7000, s16 % 4 === 0 ? 0.035 : 0.02);        // hats
    if (intensity > 0.35 && s16 % 2 === 1) noiseHit(t, 0.02, 9000, 0.016);           // driving 16ths

    /* bass: root, fifth, octave walk */
    if (s16 % 4 === 0) mtone(rootHz, 0.2, 'triangle', 0.2, t);
    else if (s16 === 6) mtone(rootHz * semi(7), 0.13, 'triangle', 0.13, t);
    else if (s16 === 14) mtone(rootHz * semi(10), 0.13, 'triangle', 0.12, t);

    /* offbeat chord stabs */
    if (s16 === 2 || s16 === 8 || s16 === 14) {
      chord.quality.forEach(iv => mtone(rootHz * 4 * semi(iv), 0.14, 'sawtooth', 0.028 + intensity * 0.02, t));
    }

    /* the arp only shows up when things are going well */
    if (intensity > 0.5 && s16 % 2 === 0) {
      const n = PENT[(step * 3 + bar) % PENT.length];
      mtone(rootHz * 8 * semi(n + chord.quality[1]), 0.1, 'square', 0.03 + intensity * 0.025, t);
    }
    if (intensity > 0.8 && s16 === 15) {
      mtone(rootHz * 8 * semi(12), 0.18, 'square', 0.05, t, rootHz * 16);
    }

    step++;
    /* 124bpm sixteenths, up to ~15% faster when the table is hot */
    const ms = 121 - intensity * 18;
    clearTimeout(musicTimer);
    musicTimer = setTimeout(tick, ms);
  }

  const api = {
    toggle(v) { on = v == null ? !on : v; return on; },
    music(v) {
      init();
      if (!ctx) return false;
      const want = v == null ? !musicOn : v;
      if (want && !musicOn) {
        if (ctx.state === 'suspended') ctx.resume();
        if (!musicGain) {
          musicGain = ctx.createGain();
          musicGain.gain.value = 0.42;
          musicFilter = ctx.createBiquadFilter();
          musicFilter.type = 'lowpass';
          musicFilter.frequency.value = 900;
          musicFilter.Q.value = 0.7;
          musicFilter.connect(musicGain);
          musicGain.connect(master);
        }
        musicOn = true;
        musicGain.gain.setTargetAtTime(0.42, ctx.currentTime, 0.3);
        clearTimeout(musicTimer);
        tick();
      } else if (!want && musicOn) {
        musicOn = false;
        clearTimeout(musicTimer);
        musicTimer = null;
        if (musicGain) musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
      }
      return musicOn;
    },
    musicOn: () => musicOn,
    /* the game tells the music how excited to be (0..1) */
    setIntensity(v) { targetIntensity = Math.max(0, Math.min(1, v || 0)); },
    stinger() {
      if (!ctx || !musicGain) return;
      const t = ctx.currentTime;
      [0, 4, 7, 12].forEach((iv, i) => mtone(220 * semi(iv), 0.3, 'square', 0.07, t + i * 0.05));
    },
    isOn: () => on,
    click: () => beep(420, 0.05, 'square', 0.15),
    flip:  () => { noise(0.06, 0.12); beep(700, 0.05, 'triangle', 0.12); },
    place: () => beep(520, 0.07, 'triangle', 0.2, 780),
    deal:  () => noise(0.05, 0.08),
    error: () => beep(150, 0.14, 'sawtooth', 0.18, 90),
    money: () => { beep(880, 0.06, 'square', 0.16); setTimeout(() => beep(1320, 0.09, 'square', 0.14), 60); },
    chip: (i) => beep(340 + Math.min(24, i) * 42, 0.05, 'square', 0.13),
    mult: (i) => beep(520 + Math.min(24, i) * 55, 0.06, 'sawtooth', 0.11),
    score: (mag) => {
      const base = 300 + Math.min(900, mag * 6);
      beep(base, 0.12, 'square', 0.22, base * 2);
      setTimeout(() => beep(base * 1.5, 0.16, 'triangle', 0.18, base * 3), 90);
    },
    big: () => {
      [0, 90, 180, 300].forEach((t, i) => setTimeout(() => beep(440 * Math.pow(1.26, i), 0.2, 'square', 0.2), t));
    },
    shatter: () => { noise(0.3, 0.3); beep(1800, 0.2, 'sawtooth', 0.12, 200); },
    win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => beep(f, 0.3, 'triangle', 0.22), i * 110)),
    lose: () => [400, 330, 260, 180].forEach((f, i) => setTimeout(() => beep(f, 0.35, 'sawtooth', 0.2), i * 150))
  };
  return api;
})();
