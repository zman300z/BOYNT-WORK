'use strict';
/* UNDERSONG — modules: the upgrades offered on level-up, in pods, in the shop, and by bosses.
   Each one only edits the stat block in player.recalc(); behaviour lives where the stat is read. */
(function () {
  const { sin, cos, PI, min, max } = Math;
  const TAU = G.TAU;

  G.RARITY = [
    { name: 'COMMON', color: '#9fd8ff', w: 60 },
    { name: 'UNCOMMON', color: '#9dffb8', w: 30 },
    { name: 'RARE', color: '#ffd98a', w: 11 },
    { name: 'RELIC', color: '#ff9ad0', w: 0 },
  ];

  const M = G.MODULES = {};
  const def = (id, name, rarity, max, icon, desc, flavor, apply, extra) => { M[id] = Object.assign({ id, name, rarity, max, icon, desc, flavor, apply }, extra || {}); };

  // ---- emitter
  def('voice', 'Second Voice', 1, 3, 'arcs2', '+1 pulse per volley. Each pulse a little softer.', 'Two notes at once is a chord. Three is an argument.', (st, n) => { st.count += n; st.dmg *= Math.pow(0.82, n); });
  def('staccato', 'Staccato', 0, 4, 'arcs3', '+20% fire rate.', 'Short notes. Lots of them.', (st, n) => { st.rate *= 1 + 0.2 * n; });
  def('forte', 'Fortissimo', 0, 4, 'arcbig', '+25% pulse strength.', 'The same thing, but louder. It works more often than it should.', (st, n) => { st.dmg *= 1 + 0.25 * n; st.size *= 1 + 0.07 * n; });
  def('long', 'Long Tone', 0, 2, 'arclong', '+30% range, faster pulses.', 'Hold it until it gets there.', (st, n) => { st.range *= 1 + 0.3 * n; st.speed *= 1 + 0.14 * n; });
  def('undertow', 'Undertow', 0, 2, 'push', 'Pulses shove creatures back much harder. +8% strength.', 'A firm suggestion.', (st, n) => { st.knock *= 1 + 0.6 * n; st.dmg *= 1 + 0.08 * n; });
  def('reverb', 'Reverb', 1, 2, 'bounce', 'Pulses skip off rock once more, and hit harder for it.', 'The cave is an instrument. Play it.', (st, n) => { st.bounce += n; });
  def('pierce', 'Piercing Note', 1, 3, 'pierce', 'Pulses pass through one more creature.', 'Some sounds go straight through you.', (st, n) => { st.pierce += n; });
  def('homing', 'Call Note', 1, 2, 'home', 'Pulses bend toward creatures.', 'It knows who it is for.', (st, n) => { st.homing += 0.9 * n; });
  def('cresc', 'Crescendo', 1, 2, 'cresc', 'Fire rate climbs while you hold the trigger.', 'Start quietly. Do not stay quiet.', (st, n) => { st.crescendo += n; });
  def('dazzle', 'Dazzle', 1, 3, 'star', '+12% chance for a pulse to dazzle: far stronger, and it stuns.', 'Right in the photoreceptors.', (st, n) => { st.crit += 0.12 * n; });
  def('echo', 'Echo', 2, 2, 'echo', 'Every volley repeats itself a moment later, softer.', '…later, softer.', (st, n) => { st.echo += n; });
  def('chord', 'Chord', 2, 2, 'chord', 'Every fifth shot is a wide wave that passes through everything.', 'One, two, three, four —', (st, n) => { st.chord += n; });
  def('split', 'Overtones', 2, 2, 'split', 'Pulses split in two when they land.', 'Every note is secretly several.', (st, n) => { st.split += n; });
  def('burst', 'Cavitation', 2, 2, 'burst', 'Pulses burst where they end, pushing on everything nearby.', 'A bubble collapsing is hotter than the sun for about a billionth of a second.', (st, n) => { st.burst += n; });
  def('static', 'Static', 2, 2, 'bolt', 'Hits arc to a second creature nearby.', 'Salt water carries a current. Lucky you.', (st, n) => { st.chain += n; });
  def('breath', 'Held Breath', 2, 2, 'breath', 'After a second of silence, the next pulse is enormous.', 'The rest is part of the music.', (st, n) => { st.breath += n; });
  // ---- thrusters
  def('slip', 'Slipstream', 0, 3, 'dash', 'Dash recharges 22% faster. Slightly quicker overall.', 'Be elsewhere.', (st, n) => { st.dashCd *= Math.pow(0.78, n); st.move *= 1 + 0.05 * n; });
  def('wake', 'Shock Wake', 1, 2, 'wake', 'Dashing through a creature jolts it and knocks it away.', 'Excuse me. Coming through.', (st, n) => { st.dashDmg += n; });
  def('afterglow', 'Afterglow', 1, 1, 'ghost', 'Dashing leaves a decoy light. Creatures chase it instead of you.', 'I was right there a second ago.', (st, n) => { st.decoy += n; });
  def('kick', 'Double Kick', 2, 1, 'dash2', 'Hold a second dash in reserve.', 'And again.', (st, n) => { st.dashCharges += n; });
  // ---- flares
  def('magnesium', 'Magnesium', 0, 2, 'flare', 'Flares reach 30% further and stun longer.', 'Briefly, it is noon down here.', (st, n) => { st.flareR *= 1 + 0.3 * n; st.flareStun += 0.6 * n; });
  def('rack', 'Spare Flare', 0, 2, 'flare2', 'Carry one more flare.', 'For the second emergency.', (st, n) => { st.flareMax += n; });
  def('scatter', 'Backscatter', 1, 1, 'absorb', 'A flare turns every projectile it erases into glow for you.', 'Thank you, I will take those.', (st, n) => { st.flareAbsorb += n; });
  def('phosphor', 'Phosphor', 1, 1, 'mark', 'Creatures caught in a flare take 40% more for four seconds.', 'They are still seeing spots.', (st, n) => { st.flareVuln += n; });
  // ---- hull & kit
  def('hull', 'Reinforced Hull', 0, 4, 'shield', '+1 hull, and patch one point now.', 'More of me to dent.', (st, n) => { st.maxHull += n; });
  def('bilge', 'Bilge Pump', 1, 2, 'plus', 'Slowly mends one hull point at a time.', 'It gurgles. It helps.', (st, n) => { st.regen += n; });
  def('barnacle', 'Barnacle Plating', 1, 2, 'plate', 'Shrugs off one hit, then regrows.', 'They moved in. I let them.', (st, n) => { st.plating += n; });
  def('valve', 'Pressure Valve', 2, 1, 'valve', 'Once per dive, a hit that would end you sets off a huge flare instead.', 'Not yet.', (st, n) => { st.lastStand += n; });
  def('ink', 'Ink Reflex', 1, 1, 'ink', 'When hurt, vent a cloud of ink and stay untouchable a little longer.', 'Borrowed from the squid. They have not asked for it back.', (st, n) => { st.inkReflex += n; });
  def('thorn', 'Thorn Coral', 1, 2, 'thorn', 'Creatures that ram you get jolted and thrown back.', 'Hug me. Go on.', (st, n) => { st.thorns += n; });
  def('tide', 'Tide Pull', 0, 2, 'magnet', '+60% pickup reach.', 'Things drift my way.', (st, n) => { st.magnet *= 1 + 0.6 * n; });
  def('oyster', 'Oyster Knife', 0, 2, 'pearl', '+30% pearls.', 'There is usually one more in there.', (st, n) => { st.pearlMul *= 1 + 0.3 * n; });
  def('aperture', 'Wide Aperture', 0, 2, 'eye', 'A longer, wider lamp, and quicker scans.', 'Let more in.', (st, n) => { st.lampR *= 1 + 0.12 * n; st.lampHalf *= 1 + 0.15 * n; st.scanMul *= 1 + 0.3 * n; });
  def('naturalist', 'Field Naturalist', 1, 1, 'note', 'Scans finish 50% faster, and all glow is worth 15% more.', 'Paying attention is a skill. It compounds.', (st, n) => { st.scanMul *= 1 + 0.5 * n; st.xpMul *= 1 + 0.15 * n; });
  def('ping', 'Active Sonar', 1, 2, 'sonar', 'Sonar pings jolt creatures and mark them: marked ones take 25% more.', 'Now I know where you are. So do you.', (st, n) => { st.sonarDmg += n; st.sonarMark = 1; });
  def('echoloc', 'Echolocation', 0, 1, 'sonar2', 'Sonar recharges twice as fast.', 'Ask more often.', (st, n) => { st.sonarCd *= Math.pow(0.5, n); });
  // ---- company
  def('wisp', 'Sea Sparkle', 1, 3, 'orbit', 'A mote of living light orbits you, stinging what it touches and soaking up shots.', 'Noctiluca. It glows when bothered. I bother it gently.', (st, n) => { st.wisps += n; });
  def('remora', 'Remora', 2, 1, 'fish', 'A small fish attaches itself to you and nips at anything hostile nearby.', 'I did not adopt it. It adopted me.', (st, n) => { st.remora += n; });
  def('pilot', 'Pilot Fish', 1, 1, 'fish2', 'A striped little fish fetches glow and pearls from far away.', 'It thinks I am a shark. I have not corrected it.', (st, n) => { st.pilot += n; });
  def('shrimp', 'Stowaway Shrimp', 2, 1, 'shrimp', 'A cleaner shrimp rides along. Mends one hull every second level.', 'Tiny. Diligent. Unpaid.', (st, n) => { st.shrimp += n; });
  // ---- relics (bosses only)
  def('knuckle', "The Pugilist's Knuckle", 3, 1, 'fist', 'Your dash ends in a cavitation punch that staggers everything around you.', 'A parting gift, I think. Or it dropped it.', (st, n) => { st.punch += n; });
  def('veil', 'Bloom Veil', 3, 1, 'veil', 'Trailing stingers drift behind you and sting whatever follows.', 'It sheds these. I asked first, in the sense that I was not eaten.', (st, n) => { st.veil += n; });
  def('lure', 'Borrowed Lure', 3, 1, 'lure', 'Every flare leaves a false light behind: creatures near it stand and stare.', 'It works on everyone. It nearly worked on me.', (st, n) => { st.lureFlare = 1; st.flareMax += 1; });
  def('crest', 'Ribbon Crest', 3, 1, 'crest', 'Pulses travel in a ribbon: +1 pierce, +1 bounce, +20% strength.', 'A length of red fin. It still ripples when the current does.', (st, n) => { st.pierce += n; st.bounce += n; st.dmg *= 1.2; });

  // n choices the player can still take. o: {relic:id, minRarity, exclude:Set}
  G.offerModules = function (n, o) {
    o = o || {};
    const p = G.player, luck = p.st.luck || 0, out = [];
    const pool = [];
    for (const id in M) {
      const d = M[id];
      if (d.rarity === 3) continue;
      if ((p.mods[id] || 0) >= d.max) continue;
      if (o.minRarity && d.rarity < o.minRarity) continue;
      if (o.exclude && o.exclude.has(id)) continue;
      pool.push(d);
    }
    const weight = d => {
      let w = G.RARITY[d.rarity].w;
      if (d.rarity === 1) w *= 1 + luck * 0.2; else if (d.rarity === 2) w *= 1 + luck * 0.45;
      if (p.mods[d.id]) w *= 1.25;                 // a little momentum toward a build
      return w;
    };
    if (o.relic && M[o.relic] && !p.mods[o.relic]) out.push(o.relic);
    while (out.length < n && pool.length) {
      const d = G.rand.weighted(pool, weight);
      pool.splice(pool.indexOf(d), 1);
      out.push(d.id);
    }
    return out;
  };

  // ---- icons: small line drawings in a ~28px box centred on (x,y)
  G.modIcon = function (ctx, icon, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const arc = (cx, r, a, lw) => { ctx.lineWidth = lw || 2; ctx.beginPath(); ctx.arc(cx, 0, r, -a, a); ctx.stroke(); };
    const dot = (px, py, r) => { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); };
    const line = (...p) => { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.stroke(); };
    switch (icon) {
      case 'arcs2': ctx.save(); ctx.translate(0, -5); arc(-10, 12, 0.6); ctx.translate(0, 10); arc(-10, 12, 0.6); ctx.restore(); break;
      case 'arcs3': arc(-14, 8, 0.7); arc(-8, 8, 0.7); arc(-2, 8, 0.7); break;
      case 'arcbig': arc(-12, 16, 0.75, 3.6); break;
      case 'arclong': arc(-4, 10, 0.7); line(-12, 0, 2, 0); break;
      case 'push': arc(-12, 12, 0.7); line(4, -5, 10, 0, 4, 5); break;
      case 'bounce': line(-11, 8, -2, -7, 3, 1, 10, -8); line(6, -8, 10, -8, 10, -4); break;
      case 'pierce': ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke(); line(-12, 0, 12, 0); line(8, -4, 12, 0, 8, 4); break;
      case 'home': ctx.beginPath(); ctx.arc(0, 4, 9, PI, PI * 1.9); ctx.stroke(); line(5, -6, 9, -2, 10, -8); dot(-9, 6, 2); break;
      case 'cresc': line(10, -8, -10, 0, 10, 8); break;
      case 'star': ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * PI / 4, r = i & 1 ? 3.5 : 12; ctx.lineTo(cos(a) * r, sin(a) * r); } ctx.closePath(); ctx.fill(); break;
      case 'echo': arc(-12, 12, 0.7); ctx.setLineDash([2, 4]); arc(-4, 12, 0.7); ctx.setLineDash([]); break;
      case 'chord': arc(-16, 14, 0.8); arc(-10, 14, 0.8); arc(-4, 14, 0.8); break;
      case 'split': line(-11, 0, 0, 0, 9, -8); line(0, 0, 9, 8); break;
      case 'burst': ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.stroke(); for (let i = 0; i < 8; i++) { const a = i * PI / 4; line(cos(a) * 8, sin(a) * 8, cos(a) * 12, sin(a) * 12); } break;
      case 'bolt': line(3, -12, -5, 1, 2, 1, -3, 12); break;
      case 'breath': ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke(); dot(0, 0, 3.5); break;
      case 'dash': line(-8, -7, 0, 0, -8, 7); line(1, -7, 9, 0, 1, 7); break;
      case 'dash2': line(-11, -7, -4, 0, -11, 7); line(-3, -7, 4, 0, -3, 7); line(5, -7, 12, 0, 5, 7); break;
      case 'wake': line(-9, -7, -1, 0, -9, 7); line(4, -9, 7, -3, 3, -1, 7, 5, 4, 9); break;
      case 'ghost': ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]); dot(0, 0, 2.5); break;
      case 'flare': dot(0, 0, 4.5); for (let i = 0; i < 8; i++) { const a = i * PI / 4; line(cos(a) * 8, sin(a) * 8, cos(a) * 13, sin(a) * 13); } break;
      case 'flare2': ctx.save(); ctx.rotate(0.5); ctx.strokeRect(-9, -3, 7, 14); ctx.strokeRect(2, -6, 7, 14); ctx.restore(); break;
      case 'absorb': ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke(); line(-6, -6, -2, -2); line(6, -6, 2, -2); line(-6, 6, -2, 2); line(6, 6, 2, 2); break;
      case 'mark': ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]); line(0, -4, 0, 4); line(-4, 0, 4, 0); break;
      case 'shield': ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, -7); ctx.quadraticCurveTo(10, 6, 0, 12); ctx.quadraticCurveTo(-10, 6, -10, -7); ctx.closePath(); ctx.stroke(); break;
      case 'plus': ctx.lineWidth = 4; line(0, -9, 0, 9); line(-9, 0, 9, 0); break;
      case 'plate': for (let i = 0; i < 5; i++) { const a = i * TAU / 5 - PI / 2; ctx.beginPath(); ctx.arc(cos(a) * 8, sin(a) * 8, 4, 0, TAU); ctx.stroke(); } break;
      case 'valve': ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke(); for (let i = 0; i < 3; i++) { const a = i * PI / 3; line(-cos(a) * 11, -sin(a) * 11, cos(a) * 11, sin(a) * 11); } break;
      case 'ink': ctx.beginPath(); ctx.arc(-3, 0, 7, 0, TAU); ctx.arc(5, -4, 5, 0, TAU); ctx.arc(5, 5, 4, 0, TAU); ctx.fill(); break;
      case 'thorn': ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke(); for (let i = 0; i < 6; i++) { const a = i * PI / 3; line(cos(a) * 6, sin(a) * 6, cos(a) * 13, sin(a) * 13); } break;
      case 'magnet': ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 1, 8, 0, PI); ctx.stroke(); line(-8, 1, -8, -9); line(8, 1, 8, -9); break;
      case 'pearl': ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(-1, -1, 5, PI * 1.1, PI * 1.6); ctx.stroke(); break;
      case 'eye': ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(0, -11, 13, 0); ctx.quadraticCurveTo(0, 11, -13, 0); ctx.stroke(); dot(0, 0, 3.6); break;
      case 'note': ctx.strokeRect(-8, -11, 16, 22); line(-4, -5, 4, -5); line(-4, 0, 4, 0); line(-4, 5, 1, 5); break;
      case 'sonar': dot(-9, 0, 2.5); arc(-9, 8, 0.8); arc(-9, 14, 0.8); arc(-9, 20, 0.8); break;
      case 'sonar2': dot(-9, 0, 2.5); arc(-9, 9, 0.8); arc(-9, 16, 0.8); line(6, -10, 10, -6); break;
      case 'orbit': ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]); dot(0, 0, 3); dot(7.1, -7.1, 3.2); break;
      case 'fish': case 'fish2':
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(0, -8, -7, 0); ctx.quadraticCurveTo(0, 8, 10, 0); ctx.stroke(); line(-7, 0, -12, -5, -12, 5, -7, 0); dot(5, -1, 1.2);
        if (icon === 'fish2') { line(1, -4, 1, 4); line(-3, -3, -3, 3); } break;
      case 'shrimp': ctx.beginPath(); ctx.arc(0, 0, 8, PI * 0.2, PI * 1.5); ctx.stroke(); line(-2, -8, 8, -11); line(-2, -8, 10, -7); dot(-1, -6, 1.3); break;
      case 'fist': ctx.strokeRect(-7, -6, 13, 12); line(-3, -6, -3, -1); line(1, -6, 1, -1); for (let i = 0; i < 3; i++) { const a = -0.6 + i * 0.6; line(9 + cos(a) * 2, sin(a) * 6, 9 + cos(a) * 6, sin(a) * 10); } break;
      case 'veil': ctx.beginPath(); ctx.arc(0, -4, 9, PI, TAU); ctx.closePath(); ctx.stroke(); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5, -4); ctx.quadraticCurveTo(i * 5 + 3, 3, i * 5 - 1, 11); ctx.stroke(); } break;
      case 'lure': ctx.beginPath(); ctx.moveTo(-8, 10); ctx.quadraticCurveTo(-10, -10, 4, -8); ctx.stroke(); dot(6, -6, 4); break;
      case 'crest': ctx.beginPath(); ctx.moveTo(-12, 4); ctx.quadraticCurveTo(-6, -8, 0, 2); ctx.quadraticCurveTo(6, 10, 12, -4); ctx.stroke(); line(-6, -3, -6, -10); line(0, 2, 0, -6); line(6, 4, 6, -4); break;
      default: ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };
})();
