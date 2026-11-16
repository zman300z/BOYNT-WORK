'use strict';
/* UNDERSONG — story: who says what, and when.
   Noor (on the boat) talks until the water takes the signal. After that Wick keeps its own log.
   Six earlier probes left one recording each. */
(function () {
  const { min, max } = Math;

  // how broken the surface link is at the top of each zone (0 clear .. 1 gone)
  const LINK = [0, 0.3, 0.72, 1, 1];

  const LOGS = [
    { tag: 'WICK-1  ·  38 M', lines: ['Seal failure, aft. Taking on water. Noor says it is all right.', 'Noor is crying. I can hear it on the line. I would like her to know the reef was beautiful.', 'Leaving my call tone switched on, in case it is useful to whoever comes next.'] },
    { tag: 'WICK-2  ·  612 M', lines: ['Battery at four percent. I went too deep following a jelly the size of a house.', 'It was the most beautiful thing I had ever seen. I regret nothing except the battery.', 'Call tone on. Somebody should hear this.'] },
    { tag: 'WICK-3  ·  2,870 M', lines: ['Something has been following my lamp for an hour. I think it is curious. I think I am too.', 'Lamp failing. If you find this: switch yours off for a moment and look around.', 'It is not dark down here. It never was.'] },
    { tag: 'WICK-4  ·  5,210 M', lines: ['Thruster fused by the vent. I am not going anywhere. It is warm; the heat is trickle-charging my cells.', 'I have started singing my call tone so that I do not forget it.', 'Three others are answering. I do not know how that is possible.'] },
    { tag: 'WICK-5  ·  7,300 M', lines: ['Something lifted WICK-4 out of the silt today, very gently, and carried it down. I followed. It did not seem to mind.', 'It keeps us by the warm rock. It listens when we sing.', 'I do not think we are prisoners. I think we are a collection.'] },
    { tag: 'WICK-6  ·  8,700 M', lines: ['Noor built me to bring the others home. I found them. They do not want to come.', 'I am going to stay and make it six. The chord wants a sixth, and nobody down here is alone any more.', 'Tell her I am sorry. Tell her it is a good song.'] },
  ];

  const HERMIT = {
    greet: [
      '',
      'Pearls for parts. Parts for pearls. No refunds. I have eaten the receipt.',
      'Dark down here. Bad for business, good for mystery. Buy something and it will be less mysterious.',
      'Hear that singing? I moved shells twice to get away from it. Now I rather like it.',
      'Last stop. Below here is the Collector\'s place. Polite sort. Takes shiny things. You are a shiny thing.',
    ],
    buy: ['A fine choice. They are all fine choices. I only stock fine choices.', 'Pleasure doing business.', 'It suits you.', 'Mind the sharp end.'],
    poor: ['You are short. I do not do credit. I am a crab.', 'Come back heavier.', 'That is not enough pearls. That is barely a pearl.'],
    bump: ['Careful! This shell is load-bearing.', 'Personal space, lantern.'],
    heal: ['Hold still. This is mostly glue.', 'Good as new. Good as nearly new.'],
  };

  const S = G.story = {
    said: {}, LOGS, HERMIT, hintStep: 0, hintT: 0, moved: 0, shotsFired: 0, lastX: 0, lastY: 0, depthSaid: {},

    reset() { this.said = {}; this.hintStep = 0; this.hintT = 0; this.moved = 0; this.shotsFired = 0; this.depthSaid = {}; },
    once(key) { if (this.said[key]) return false; this.said[key] = 1; return true; },
    link() {
      const z = G.zone ? G.zone.idx : 0, a = LINK[z], b = LINK[min(4, z + 1)];
      return a + (b - a) * (G.zone ? G.world.depth01(G.player.y) : 0) * 0.8;
    },
    // Noor speaks, as much of her as gets through
    noor(text, o) {
      const g = this.link();
      if (g >= 0.97) return;
      G.hud.say('noor', text, Object.assign({ garble: g }, o || {}));
    },
    wick(text, o) { G.hud.say('wick', text, o); },
    hermit(kind, zone) {
      const pool = kind === 'greet' ? [HERMIT.greet[zone] || HERMIT.greet[1]] : HERMIT[kind];
      G.hud.say('hermit', pool[(G.rand() * pool.length) | 0], { now: kind !== 'greet' });
    },
    // noor while she can be heard, the log after
    either(noorText, wickText) { if (this.link() < 0.9) this.noor(noorText); else if (wickText) this.wick(wickText); },

    playLog(n) {
      const L = LOGS[n];
      if (!L) return;
      for (const ln of L.lines) G.hud.say('log', ln, { tag: L.tag + '  ·  RECOVERED LOG' });
    },

    diveStart() {
      this.reset();
      const first = G.meta.data.stats.dives <= 1;
      this.noor('Tether\'s off. You\'re under your own power now, Wick.');
      if (first) {
        this.noor('Six went down before you. All I have from any of them is a sound, coming up from the bottom.');
        this.noor('Go and see what\'s singing. Then come home. In that order, if you can.');
      } else this.noor(['Same as before. Find the song. Come home.', 'Lamp on. Tell me what you see.', 'Seventh time lucky. Well. Seventh probe. Lucky is up to you.'][(G.rand() * 3) | 0]);
    },

    zoneStart(idx) {
      if (idx === 1) { this.noor('Two hundred metres. The light goes quickly from here.'); this.noor('I\'ll lose you a little at a time. That\'s the water. It isn\'t you.'); }
      else if (idx === 2) {
        this.noor('A thousand metres. Wick, if this is the last one that gets through—');
        this.noor('you don\'t have to go further. But I know you. Tell me what you find.');
        this.wick('LOG: Surface link lost. I am going to keep talking anyway. It seems to help.');
      } else if (idx === 3) this.wick('LOG: 4,000 m. The water at the vents is 400 degrees, a hand\'s width from water at 2. Things live in the hand\'s width.');
      else if (idx === 4) this.wick('LOG: 6,000 m. The hull is complaining. I have decided to hear it as encouragement.');
    },

    bossStart(idx) {
      if (idx === 0) this.noor('Mantis shrimp. A big one. They hit hard enough to boil the water, so try not to be where it\'s hitting.');
      else if (idx === 1) this.noor('That isn\'t a jellyfish. That\'s a weather system.');
      else if (idx === 2) this.wick('LOG: The light ahead is not a light. Correction. It is a light. It is attached to something.');
      else if (idx === 3) this.wick('LOG: Sailors used to draw this at the edges of their maps. They got the length right.');
    },
    bossDown(idx) {
      if (idx === 0) this.noor('It\'s leaving. I think you won the argument. Take what it dropped. It won\'t be back for it.');
      else if (idx === 1) this.noor('…beautiful. Wick, did you get a scan? Tell me you got a scan.');
      else if (idx === 2) this.wick('LOG: It has gone to find something easier to fool. I do not blame it. I am very shiny.');
      else if (idx === 3) this.wick('LOG: It let me pass. I do not think I beat it. I think I bored it.');
    },

    update(dt) {
      const p = G.player, zone = G.zone;
      if (!zone || G.game.state !== 'play' || p.dead) return;
      // mid-zone thoughts
      const d01 = G.world.depth01(p.y), z = zone.idx;
      if (d01 > 0.5 && !this.depthSaid[z]) {
        this.depthSaid[z] = 1;
        if (z === 1) this.noor('Still with you. Mostly. You\'re doing fine.');
        else if (z === 2) this.wick('LOG: Everything down here makes its own light. I thought I was bringing light into the dark. I was bringing one more.');
        else if (z === 3) this.wick('LOG: The song is clearer now. It is not one voice. I count four. No. More.');
        else if (z === 4) this.wick('LOG: 8,000 m. Set Everest down here and its summit would nearly reach me. Noor would like that. I am saving it for her.');
      }
      if (z === 0 && p.y > zone.holeY - 320 && Math.abs(p.x - zone.holeX) < 420 && this.once('hole')) this.noor('That gap in the reef floor. The sound is coming up through there.');
      // first-dive control hints
      if (!G.settings.hints || z !== 0 || G.meta.data.stats.dives > 2) return;
      this.moved += Math.hypot(p.x - this.lastX, p.y - this.lastY); this.lastX = p.x; this.lastY = p.y;
      this.hintT += dt;
      const I = G.input, hud = G.hud;
      if (hud.busy() && this.hintStep === 0 && this.hintT < 6) return;
      if (this.hintStep === 0) { hud.hint(`${I.label('move')}  SWIM      ${I.label('aim')}  LOOK`, 1); if (this.moved > 260) { this.hintStep = 1; this.hintT = 0; this.shotsFired = 0; } }
      else if (this.hintStep === 1) { hud.hint(`HOLD ${I.label('fire')}  PULSE EMITTER`, 1); if (this.shotsFired >= 4) { this.hintStep = 2; this.hintT = 0; } }
      else if (this.hintStep === 2) { hud.hint(`${I.label('dash')}  DASH  ·  NOTHING CAN TOUCH YOU MID-DASH`, 1); if (this.said.dashed || this.hintT > 14) { this.hintStep = 3; this.hintT = 0; } }
      else if (this.hintStep === 3) { if (this.hintT > 1.5) { hud.hint('KEEP YOUR LAMP ON A CREATURE TO CATALOGUE IT', 1); if (this.said.firstScan || this.hintT > 16) { this.hintStep = 4; this.hintT = 0; } } }
      else if (this.hintStep === 4) { if (p.y > zone.holeY + 120) { hud.hint(`${I.label('sonar')}  SONAR PING  ·  SHOWS THE CAVE AND THE WAY DOWN`, 1); if (this.said.pinged || this.hintT > 40) { this.hintStep = 5; this.hintT = 0; } } else this.hintT = 0; }
      else if (this.hintStep === 5) { if (G.creatures.aggro >= 2) { hud.hint(`${I.label('flare')}  FLARE  ·  STUNS EVERYTHING, CLEARS PROJECTILES`, 1); if (this.said.flared || this.hintT > 12) this.hintStep = 6; } else this.hintT = 0; }
    },
  };

  // ---- reactions to things that happen
  G.on('shoot', () => { S.shotsFired++; });
  G.on('dash', () => { S.said.dashed = 1; });
  G.on('sonar', () => { S.said.pinged = 1; });
  G.on('flare', () => { S.said.flared = 1; if (S.once('flareLine')) S.noor('There\'s the flare. I felt that one up here.'); });
  G.on('scan', (id, isNew) => { if (S.once('firstScan')) S.noor('Oh, that\'s a good one. Logged. Hold your lamp on anything new and I\'ll get a record of it.'); });
  G.on('aggro', c => { if (G.zone && G.zone.idx === 0 && !c.boss && S.once('firstAggro')) S.noor('That one isn\'t pleased with you. The emitter won\'t hurt it. It just persuades things to be somewhere else.'); });
  G.on('hurt', p => {
    if (p.hull <= 0) return;
    if (p.hull === 1 && S.once('lowHull')) S.either('Wick. One more like that and I\'m reeling in an empty line. Find somewhere quiet.', 'LOG: Hull at one. Noting, for the record, that I would prefer not to stop here.');
    else if (S.once('firstHurt')) S.noor('Hull breach. Small. You\'ve got a few of those in you. Not many.');
  });
  G.on('levelup', () => { if (S.once('firstLevel')) S.noor('You\'ve gathered enough glow to run another module. Pick one. I trust your judgement more than mine.'); });
  G.on('cleaned', () => { if (S.once('firstClean')) S.noor('Did that shrimp just reseat your hull seal? I spent a week on that seal.'); });
  G.on('whale', () => { if (G.zone && G.zone.idx === 1 && S.once('whale')) S.noor('That\'s a humpback, a long way off. I wish you could hear what I\'m hearing up here. Oh. You can.'); });
  G.on('pod', () => { if (S.once('firstPod')) S.noor('That\'s one of my supply pods. I dropped a dozen down the line last season and lost track. Help yourself.'); });
  G.on('shades', () => { S.noor('Are those… sunglasses? Floating? Somebody finally made a pair that doesn\'t sink.'); S.noor('Keep them on. You look ridiculous. I love it.'); });
})();
