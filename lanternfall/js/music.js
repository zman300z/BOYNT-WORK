'use strict';
// ============================================================================
// Music: track definitions for the sequencer in audio.js
// Melody tokens are scale degrees (0 = key root) — '-' holds, '.' rests.
// The "Lantern motif" (leitmotif) recurs through the game and resolves to
// major in the ending.
// ============================================================================
(function () {
  const G = window.G;

  const MOTIF =
    '-3 - 0 - 1 2 1 - | 0 - -1 -3 -2 - - - | -3 - 0 - 1 2 3 - | 4 - - 3 2 - 1 - | ' +
    '2 - 1 - 0 - -1 - | -2 - -3 - -4 - - - | -3 - 0 - 1 - 2 4 | 1 - - - 0 - - -';
  const MOTIF_SLOW = // quarter-note units (4 tokens per bar), first half of motif
    '-3 0 1 2 | 1 0 -1 -3 | -2 - -3 - | -4 - - - | -3 0 1 2 | 3 4 3 2 | 1 - 0 - | -1 - - -';
  const MOTIF_PROG = [0, 5, 0, 6, 2, 5, 0, '4^'];
  G.MOTIF = MOTIF;

  const T = (G.TRACKS = {});

  T.title = {
    bpm: 70, root: 50, mode: 'aeolian', reverb: 0.8, fadeIn: 3,
    prog: MOTIF_PROG,
    sections: [
      { name: 'intro', bars: 4, prog: [0, 5, 6, 0], parts: ['choir', 'sub'] },
      { name: 'A', bars: 8, parts: ['choir', 'strings', 'harp', 'sub', 'bells'] },
      { name: 'B', bars: 8, parts: ['choir', 'strings', 'harp', 'sub', 'brass', 'drums'] },
      { name: 'C', bars: 4, prog: [5, 6, 0, '4^'], parts: ['choir', 'harp*0.7', 'sub'] },
    ],
    loopFrom: 1,
    parts: {
      choir: { kind: 'pad', inst: 'choir', vol: 0.045, oct: 0 },
      strings: { kind: 'pad', inst: 'strings', vol: 0.03, oct: -1 },
      harp: { kind: 'arp', inst: 'harp', vol: 0.06, oct: 1, pat: 'x.x.x.x.x.x.x.x.', seq: [0, 1, 2, 3, 4, 3, 2, 1] },
      sub: { kind: 'bass', inst: 'subbass', vol: 0.2, oct: -1, pat: 'x-------x-------' },
      bells: { kind: 'melody', inst: 'bell', vol: 0.075, oct: 1, mel: { all: MOTIF } },
      brass: { kind: 'melody', inst: 'brass', vol: 0.06, oct: 1, harm: -2, mel: { all: MOTIF } },
      drums: { kind: 'drums', vol: 0.35, kit: { taiko: 'x.......x..x....', crash: 'x...............' }, mix: { crash: 0.12 } },
    },
  };

  T.undercroft = {
    bpm: 84, root: 50, mode: 'aeolian', reverb: 0.7,
    prog: [0, 5, 3, 4],
    sections: [
      { name: 'A', bars: 8, parts: ['pad', 'arp', 'bass', 'heart'] },
      { name: 'B', bars: 8, parts: ['pad', 'arp', 'bass', 'heart', 'flute', 'shk'] },
      { name: 'C', bars: 4, prog: [5, 3, 0, 0], parts: ['pad', 'bells'] },
      { name: 'D', bars: 8, parts: ['pad', 'arp', 'bass', 'heart', 'flute', 'shk', 'kal'] },
    ],
    parts: {
      pad: { kind: 'pad', inst: 'pad', vol: 0.05, oct: 0 },
      arp: { kind: 'arp', inst: 'pluck', vol: 0.05, oct: 0, pat: 'x...x...x...x.x.', seq: [0, 2, 1, 3, 2, 4] },
      bass: { kind: 'bass', inst: 'bass', vol: 0.12, oct: -1, pat: 'x-------x---o---' },
      heart: { kind: 'drums', vol: 0.3, kit: { kick: 'x..g............' } },
      shk: { kind: 'drums', vol: 0.12, kit: { shaker: '..x...x...x...x.' } },
      flute: {
        kind: 'melody', inst: 'flute', vol: 0.07, oct: 1,
        mel: {
          all:
            '4 - - 2 3 - 4 - | 5 - 4 - 2 - - - | 3 - - 2 1 - 0 - | 1 - - - . . . . | ' +
            '4 - - 2 3 - 4 - | 5 - 7 - 6 - 5 - | 4 - 3 - 2 - 1 - | 1 - 0 - -1# - - -',
        },
      },
      bells: { kind: 'melody', inst: 'bell', vol: 0.05, oct: 1, unit: 4, mel: { all: '4 - 2 - | 3 - 1 - | 0 - -1# - | 0 - - -' } },
      kal: { kind: 'arp', inst: 'kalimba', vol: 0.04, oct: 2, pat: '..x...x...x...x.', seq: [2, 1, 0, 1] },
    },
  };

  T.saltmarsh = {
    bpm: 132, root: 57, mode: 'dorian', stepsPerBar: 12, reverb: 0.55,
    prog: [0, 6, 0, 3, 0, 6, 4, 0],
    sections: [
      { name: 'A', bars: 8, parts: ['pad', 'bass', 'drums', 'reed'] },
      { name: 'B', bars: 8, parts: ['pad', 'bass', 'drums', 'reed', 'harp'] },
      { name: 'C', bars: 4, prog: [0, 6, 3, 4], parts: ['pad', 'harp', 'sea'] },
      { name: 'D', bars: 8, parts: ['pad', 'bass', 'drums', 'reed*0.8', 'harp', 'fl'] },
    ],
    parts: {
      pad: { kind: 'pad', inst: 'strings', vol: 0.03, oct: -1 },
      bass: { kind: 'bass', inst: 'bass', vol: 0.12, oct: -1, pat: 'x-----o-----' },
      drums: { kind: 'drums', vol: 0.28, kit: { kick: 'x.....x.....', clap: '...x.....x..', tamb: 'x.x.x.x.x.x.' }, mix: { tamb: 0.3, clap: 0.5 } },
      sea: { kind: 'drums', vol: 0.12, kit: { ohat: 'x...........' } },
      reed: {
        kind: 'melody', inst: 'reed', vol: 0.055, oct: 1,
        mel: { all: '0 - 0 2 - 4 | 6 - 4 1 - - | 0 - 0 2 - 4 | 5 - 4 3 - - | 7 - 7 6 - 4 | 6 - 4 1 - 2 | 4 - 2 1 - 4 | 0 - - - - -' },
      },
      fl: {
        kind: 'melody', inst: 'flute', vol: 0.05, oct: 2,
        mel: { all: '4 - - 2 - - | 1 - - -1 - - | 4 - - 2 - - | 3 - - - - - | 4 - - 6 - - | 4 - - 1 - - | 2 - - 1 - - | 0 - - - - -' },
      },
      harp: { kind: 'arp', inst: 'harp', vol: 0.05, oct: 1, pat: 'x.x.x.x.x.x.', seq: [0, 1, 2, 3, 2, 1] },
    },
  };

  T.thornwood = {
    bpm: 92, root: 52, mode: 'dorian', reverb: 0.75,
    prog: [0, 3, 0, 6, 2, 3, 6, 0],
    sections: [
      { name: 'A', bars: 8, parts: ['pad', 'harp', 'bass', 'shk'] },
      { name: 'B', bars: 8, parts: ['pad', 'harp', 'bass', 'shk', 'flute', 'kick'] },
      { name: 'C', bars: 8, parts: ['pad', 'harp', 'bass', 'glass', 'kick', 'shk'] },
    ],
    parts: {
      pad: { kind: 'pad', inst: 'strings', vol: 0.03, oct: 0 },
      harp: { kind: 'arp', inst: 'harp', vol: 0.05, oct: 1, pat: 'xxxxxxxxxxxxxxxx', seq: [0, 1, 2, 3, 4, 3, 2, 1] },
      bass: { kind: 'bass', inst: 'subbass', vol: 0.16, oct: -1, pat: 'x-------x---x---' },
      shk: { kind: 'drums', vol: 0.12, kit: { shaker: 'x.x.x.x.x.x.x.x.' } },
      kick: { kind: 'drums', vol: 0.22, kit: { kick: 'x.......x.......', tom: '......x.......x.' } },
      flute: {
        kind: 'melody', inst: 'flute', vol: 0.07, oct: 1,
        mel: { all: '4 - 2 - 1 - 0 - | 3 - 5 - 4 - - - | 4 - 7 - 6 - 4 - | 5 - 6 - - - . . | 2 - 4 - 6 - 7 - | 8 - 7 - 5 - 3 - | 6 - 5 - 4 - 3 - | 4 - - - - - . .' },
      },
      glass: { kind: 'melody', inst: 'glass', vol: 0.05, oct: 2, unit: 4, mel: { all: '4 - 2 0 | 3 - - - | 4 - 7 6 | 5 - - - | 2 4 6 7 | 8 - 5 - | 6 5 4 3 | 4 - - -' } },
    },
  };

  T.ramparts = {
    bpm: 120, root: 48, mode: 'aeolian', reverb: 0.5,
    prog: MOTIF_PROG,
    sections: [
      { name: 'A', bars: 8, prog: [0, 5, 6, 0, 3, 5, '4^', '4^'], parts: ['str', 'bass', 'drums', 'ost'] },
      { name: 'B', bars: 8, parts: ['str', 'bass', 'drums', 'ost', 'brass'] },
      { name: 'C', bars: 4, prog: [5, 6, 3, '4^'], parts: ['str', 'roll', 'bass'] },
      { name: 'D', bars: 8, parts: ['str', 'bass', 'drums', 'ost', 'brass', 'choir'] },
    ],
    parts: {
      str: { kind: 'pad', inst: 'strings', vol: 0.035, oct: 0 },
      choir: { kind: 'pad', inst: 'choir', vol: 0.03, oct: 1, voices: 2 },
      bass: { kind: 'bass', inst: 'bass', vol: 0.13, oct: -1, pat: 'x.x.x.x.x.x.x.o.' },
      ost: { kind: 'arp', inst: 'pluck', vol: 0.035, oct: 1, pat: 'xxxxxxxxxxxxxxxx', seq: [0, 1, 2, 1] },
      drums: { kind: 'drums', vol: 0.3, kit: { kick: 'x.......x.x.....', snare: '....x..g....x.gg', hat: 'x.x.x.x.x.x.x.x.' }, mix: { hat: 0.35 } },
      roll: { kind: 'drums', vol: 0.25, kit: { snare: 'x.x.x.x.xxxxXXXX', taiko: 'x.......x.......' } },
      brass: { kind: 'melody', inst: 'brass', vol: 0.065, oct: 1, mel: { all: MOTIF } },
    },
  };

  T.glowcap = {
    bpm: 90, root: 54, mode: 'phrygian', reverb: 0.85,
    prog: [0, 1, 0, 6],
    sections: [
      { name: 'A', bars: 8, parts: ['pad', 'glass', 'sub'] },
      { name: 'B', bars: 8, parts: ['pad', 'glass', 'sub', 'kal', 'hats'] },
      { name: 'C', bars: 8, parts: ['pad', 'glass', 'sub', 'kal', 'hats', 'pulse'] },
    ],
    parts: {
      pad: { kind: 'pad', inst: 'pad', vol: 0.045, oct: 0 },
      glass: { kind: 'arp', inst: 'glass', vol: 0.035, oct: 1, pat: 'x..x..x.x..x..x.', seq: [0, 2, 4, 1, 3, 5] },
      sub: { kind: 'bass', inst: 'subbass', vol: 0.2, oct: -1, pat: 'x---x---x---x---' },
      pulse: { kind: 'drums', vol: 0.2, kit: { kick: 'x...x...x...x...' } },
      hats: { kind: 'drums', vol: 0.1, kit: { hat: '..x...x...x..xx.', shaker: 'x...............' } },
      kal: { kind: 'melody', inst: 'kalimba', vol: 0.07, oct: 1, mel: { all: '0 . 2 . 4 . 2 . | 1 . . 3 . . 5 . | 4 . 2 . 0 . -1 . | -1 . . . 1 . . .' } },
    },
  };

  T.cathedral = {
    bpm: 64, root: 55, mode: 'harmonic', reverb: 1.0,
    prog: [0, 5, 3, '4^', 0, 2, 5, '4^'],
    sections: [
      { name: 'A', bars: 8, parts: ['organ', 'bass'] },
      { name: 'B', bars: 8, parts: ['organ', 'bass', 'choir', 'bells'] },
      { name: 'C', bars: 8, parts: ['organ', 'bass', 'choir', 'bells', 'timp', 'arp'] },
    ],
    parts: {
      organ: { kind: 'pad', inst: 'organ', vol: 0.03, oct: -1, bassNote: true },
      choir: { kind: 'pad', inst: 'choir', vol: 0.04, oct: 0 },
      bass: { kind: 'bass', inst: 'subbass', vol: 0.15, oct: -2, pat: 'x---------------' },
      timp: { kind: 'drums', vol: 0.3, kit: { taiko: 'x.............x.' } },
      arp: { kind: 'arp', inst: 'harp', vol: 0.04, oct: 1, pat: 'x.x.x.x.x.x.x.x.', seq: [0, 1, 2, 3, 2, 1, 2, 1] },
      bells: { kind: 'melody', inst: 'bell', vol: 0.06, oct: 1, unit: 4, mel: { all: MOTIF_SLOW } },
    },
  };

  T.ossuary = {
    bpm: 104, root: 59, mode: 'phrygian', reverb: 0.6,
    prog: [0, 1, 0, 5],
    sections: [
      { name: 'A', bars: 8, parts: ['choir', 'bones', 'bass', 'toms'] },
      { name: 'B', bars: 8, parts: ['choir', 'bones', 'bass', 'toms', 'lead', 'hat'] },
      { name: 'C', bars: 4, prog: [5, 1, 5, 0], parts: ['choir', 'bass'] },
    ],
    parts: {
      choir: { kind: 'pad', inst: 'choir', vol: 0.035, oct: -1 },
      bones: { kind: 'arp', inst: 'kalimba', vol: 0.05, oct: 0, pat: 'x.xx.x.xx.x.x.x.', seq: [0, 1, 2, 1, 3, 2] },
      bass: { kind: 'bass', inst: 'bass', vol: 0.11, oct: -2, pat: 'x..x..x.x..x..x.' },
      toms: { kind: 'drums', vol: 0.25, kit: { tom: 'x.....x...x.....', kick: 'x.......x.......' }, toms: { tom: 40 } },
      hat: { kind: 'drums', vol: 0.1, kit: { hat: '..x...x...x...x.' } },
      lead: { kind: 'melody', inst: 'glass', vol: 0.05, oct: 1, mel: { all: '0 - 1 - 0 - -2 - | 1 - - - 3 - 1 - | 0 - 4 - 3 - 1 - | 0 - - - . . . .' } },
    },
  };

  T.spire = {
    bpm: 132, root: 47, mode: 'aeolian', reverb: 0.6,
    prog: MOTIF_PROG,
    sections: [
      { name: 'A', bars: 8, prog: [0, 5, 2, 6, 0, 5, 3, '4^'], parts: ['str', 'ost', 'bass', 'drums'] },
      { name: 'B', bars: 8, parts: ['str', 'ost', 'bass', 'drums', 'brass', 'choir'] },
      { name: 'C', bars: 4, prog: [5, 6, 5, '4^'], parts: ['choir', 'roll', 'bass'] },
      { name: 'D', bars: 8, parts: ['str', 'ost', 'bass', 'drums', 'brass', 'choir', 'bells'] },
    ],
    parts: {
      str: { kind: 'pad', inst: 'strings', vol: 0.035, oct: 1 },
      choir: { kind: 'pad', inst: 'choir', vol: 0.035, oct: 1 },
      ost: { kind: 'arp', inst: 'pluck', vol: 0.035, oct: 2, pat: 'xxxxxxxxxxxxxxxx', seq: [0, 1, 2, 3, 2, 1] },
      bass: { kind: 'bass', inst: 'bass', vol: 0.13, oct: 0, pat: 'x.x.8.x.x.x.8.o.' },
      drums: { kind: 'drums', vol: 0.3, kit: { kick: 'x..x....x..x....', snare: '....x.......x..g', hat: 'xxxxxxxxxxxxxxxx', taiko: 'x...............' }, mix: { hat: 0.25, taiko: 0.6 } },
      roll: { kind: 'drums', vol: 0.25, kit: { snare: 'x.x.x.x.xxxxXXXX', taiko: 'x...x...x...x...' } },
      brass: { kind: 'melody', inst: 'brass', vol: 0.065, oct: 2, mel: { all: MOTIF } },
      bells: { kind: 'melody', inst: 'bell', vol: 0.045, oct: 2, unit: 4, mel: { all: MOTIF_SLOW } },
    },
  };

  T.passage = {
    bpm: 72, root: 53, mode: 'ionian', reverb: 0.8,
    prog: [0, 3, 5, 4],
    sections: [
      { name: 'A', bars: 8, parts: ['pad', 'harp', 'bass'] },
      { name: 'B', bars: 8, parts: ['pad', 'harp', 'bass', 'box'] },
    ],
    parts: {
      pad: { kind: 'pad', inst: 'pad', vol: 0.04, oct: 0 },
      harp: { kind: 'arp', inst: 'harp', vol: 0.05, oct: 1, pat: 'x...x...x...x...', seq: [0, 1, 2, 3] },
      bass: { kind: 'bass', inst: 'subbass', vol: 0.15, oct: -1, pat: 'x---------------' },
      box: {
        kind: 'melody', inst: 'glass', vol: 0.06, oct: 1,
        mel: { all: '4 - 2 - 0 - 2 - | 3 - 5 - 7 - - - | 5 - 4 - 2 - 4 - | 4 - - - - - . . | 7 - 6 - 4 - 2 - | 3 - 2 - 3 - 5 - | 4 - 2 - 1 - 2 - | 1 - 2 - 4 - - -' },
      },
    },
  };

  T.boss1 = {
    bpm: 144, root: 52, mode: 'harmonic', reverb: 0.5, fadeIn: 0.3,
    prog: [0, 0, 5, '4^'],
    sections: [
      { name: 'A', bars: 8, parts: ['str', 'bass', 'drums', 'bells'] },
      { name: 'B', bars: 8, parts: ['str', 'bass', 'drums', 'bells', 'brass'] },
      { name: 'P2', bars: 8, prog: [0, 6, 5, '4^'], parts: ['str', 'bass', 'drums2', 'bells', 'brass', 'choir'], next: 'P2b' },
      { name: 'P2b', bars: 8, prog: [5, 3, 0, '4^'], parts: ['str', 'bass', 'drums2', 'ost', 'brass', 'choir'], next: 'P2' },
    ],
    order: [0, 1],
    parts: {
      str: { kind: 'pad', inst: 'strings', vol: 0.035, oct: 0 },
      choir: { kind: 'pad', inst: 'choir', vol: 0.035, oct: 1 },
      bass: { kind: 'bass', inst: 'bass', vol: 0.14, oct: -1, pat: 'x.8.x.8.x.8.x.8.' },
      ost: { kind: 'arp', inst: 'pluck', vol: 0.035, oct: 1, pat: 'xxxxxxxxxxxxxxxx', seq: [0, 1, 2, 1] },
      drums: { kind: 'drums', vol: 0.32, kit: { kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', crash: 'x...............' }, mix: { hat: 0.3, crash: 0.1 } },
      drums2: { kind: 'drums', vol: 0.34, kit: { kick: 'x.xx..x.x.xx..x.', snare: '....x..x....x.xx', hat: 'xxxxxxxxxxxxxxxx', taiko: 'x.......x.......' }, mix: { hat: 0.25 } },
      bells: { kind: 'melody', inst: 'bell', vol: 0.07, oct: 0, mel: { all: '0 . . . . . . . | 0 . . . 7 . . . | 0 . . . . . . . | 6 . . . 4 . . .' } },
      brass: { kind: 'melody', inst: 'brass', vol: 0.06, oct: 1, mel: { all: '0 - - 1 2 - 4 - | 3 - 2 - 1 - - - | 2 - - 3 4 - 7 - | 6 - - - 4 - - -' } },
    },
  };

  T.boss2 = {
    bpm: 128, root: 49, mode: 'harmonic', reverb: 0.8, fadeIn: 0.3,
    prog: [0, 5, 3, '4^'],
    sections: [
      { name: 'A', bars: 8, parts: ['choir', 'trem', 'sub', 'toms'] },
      { name: 'B', bars: 8, parts: ['choir', 'trem', 'sub', 'toms', 'lead'] },
      { name: 'P2', bars: 8, prog: [0, 6, 5, '4^'], parts: ['choir', 'trem', 'sub', 'drums', 'lead', 'glass'], next: 'P2' },
    ],
    order: [0, 1],
    parts: {
      choir: { kind: 'pad', inst: 'choir', vol: 0.045, oct: 0 },
      trem: { kind: 'arp', inst: 'strings', vol: 0.025, oct: 0, pat: 'xxxxxxxxxxxxxxxx', seq: [0, 2, 0, 2], len: 1 },
      sub: { kind: 'bass', inst: 'subbass', vol: 0.2, oct: -1, pat: 'x-----x-----x---' },
      toms: { kind: 'drums', vol: 0.3, kit: { taiko: 'x.....x.....x...', tom: '..........x..x..' }, toms: { tom: 38 } },
      drums: { kind: 'drums', vol: 0.32, kit: { taiko: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, mix: { hat: 0.3 } },
      lead: { kind: 'melody', inst: 'choir', vol: 0.05, oct: 1, unit: 4, mel: { all: '4 - 2 - | 5 - 4 - | 3 - 2 - | 1 - - -' } },
      glass: { kind: 'arp', inst: 'glass', vol: 0.03, oct: 2, pat: 'x..x..x..x..x.x.', seq: [2, 1, 0, 1, 2, 3] },
    },
  };

  T.boss3 = {
    bpm: 150, root: 50, mode: 'harmonic', reverb: 0.6, fadeIn: 0.3,
    prog: [0, 5, 3, '4^'],
    sections: [
      { name: 'A', bars: 8, parts: ['str', 'bass', 'drums', 'ost'] },
      { name: 'B', bars: 8, parts: ['str', 'bass', 'drums', 'ost', 'lead'] },
      { name: 'P2', bars: 8, prog: [0, 6, 5, '4^'], parts: ['str', 'bass', 'drums2', 'ost', 'lead', 'choir'], next: 'P2b' },
      { name: 'P2b', bars: 8, prog: [3, 5, 0, '4^'], parts: ['str', 'bass', 'drums2', 'ost', 'choir', 'bells'], next: 'P2' },
      { name: 'P3', bars: 8, prog: MOTIF_PROG, parts: ['str', 'bass', 'drums2', 'ost', 'brass', 'choir'], next: 'P3' },
    ],
    order: [0, 1],
    parts: {
      str: { kind: 'pad', inst: 'strings', vol: 0.035, oct: 0 },
      choir: { kind: 'pad', inst: 'choir', vol: 0.04, oct: 1 },
      bass: { kind: 'bass', inst: 'bass', vol: 0.14, oct: -1, pat: 'x.x.x.8.x.x.x.o.' },
      ost: { kind: 'arp', inst: 'pluck', vol: 0.035, oct: 1, pat: 'xxxxxxxxxxxxxxxx', seq: [0, 1, 2, 3, 2, 1] },
      drums: { kind: 'drums', vol: 0.32, kit: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, mix: { hat: 0.3 } },
      drums2: { kind: 'drums', vol: 0.34, kit: { kick: 'x.x.x..xx.x.x..x', snare: '....x..g....x.xg', hat: 'xxxxxxxxxxxxxxxx', taiko: 'x.......x.......', crash: 'x...............' }, mix: { hat: 0.22, crash: 0.1 } },
      lead: { kind: 'melody', inst: 'lead', vol: 0.045, oct: 1, mel: { all: '4 - 3 - 2 - 1 - | 2 - 0 - -2 - - - | 3 - 2 - 1 - 0 - | 1 - - - 6 - - -' } },
      bells: { kind: 'melody', inst: 'bell', vol: 0.06, oct: 1, unit: 4, mel: { all: MOTIF_SLOW } },
      brass: { kind: 'melody', inst: 'brass', vol: 0.07, oct: 1, harm: 2, mel: { all: MOTIF } },
    },
  };

  T.ending = {
    bpm: 72, root: 50, mode: 'ionian', reverb: 0.9, fadeIn: 3,
    prog: [0, 5, 0, 4, 2, 5, 0, 4],
    sections: [
      { name: 'A', bars: 8, parts: ['pad', 'harp', 'sub', 'bells'] },
      { name: 'B', bars: 8, parts: ['pad', 'choir', 'harp', 'sub', 'strMel', 'drums'] },
      { name: 'C', bars: 8, parts: ['pad', 'choir', 'harp', 'sub', 'bells', 'strMel'] },
    ],
    loopFrom: 0,
    parts: {
      pad: { kind: 'pad', inst: 'strings', vol: 0.035, oct: 0 },
      choir: { kind: 'pad', inst: 'choir', vol: 0.035, oct: 1 },
      harp: { kind: 'arp', inst: 'harp', vol: 0.055, oct: 1, pat: 'x.x.x.x.x.x.x.x.', seq: [0, 1, 2, 3, 4, 3, 2, 1] },
      sub: { kind: 'bass', inst: 'subbass', vol: 0.17, oct: -1, pat: 'x-------x-------' },
      bells: { kind: 'melody', inst: 'bell', vol: 0.07, oct: 1, mel: { all: MOTIF } },
      strMel: { kind: 'melody', inst: 'flute', vol: 0.07, oct: 1, mel: { all: MOTIF } },
      drums: { kind: 'drums', vol: 0.25, kit: { taiko: 'x.......x.......' } },
    },
  };

  T.silence = { bpm: 60, root: 50, mode: 'aeolian', prog: [0], sections: [{ name: 'A', bars: 1, parts: [] }], parts: {} };

  // Jingles
  G.JINGLES = {
    death: () => G.Audio.jingle('bell', 62, 'aeolian', '4 - 2 - 0 - -1 - -3 - - - . . . .', 90, 0.12),
    victory: () => G.Audio.jingle('brass', 62, 'ionian', '0+2+4 - 0+2+4 4+7 - - - . 5+8 - 4+7 - - - - -', 120, 0.09),
    rune: () => G.Audio.jingle('bell', 62, 'ionian', '0 2 4 7 - 9 - 11 - 14 - - -', 150, 0.1),
    passage: () => G.Audio.jingle('glass', 65, 'ionian', '0 4 7 - 11 - - -', 140, 0.06),
    ending: () => G.Audio.jingle('bell', 62, 'ionian', '-3 - 0 - 1 2 1 - 0 - - -', 80, 0.1),
  };
})();
