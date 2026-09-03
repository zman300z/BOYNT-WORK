/* =========================================================================
   1 — TITLE                                                        [0:15]
   ========================================================================= */
{
  n++;
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addImage({ path: IMG + "grandplace.jpg", x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H }, transparency: 62 });
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 6.9, h: H, fill: { color: INK, transparency: 22 } });

  txt(s, "PROJET FRANCOPHONIE  ·  FREN 201", { x: M, y: 1.55, w: 6.2, h: 0.3, fontSize: 12.5, bold: true, charSpacing: 2.4, color: GOLD });
  txt(s, "LA BELGIQUE", { x: M, y: 2.02, w: 7.6, h: 1.1, fontSize: 60, bold: true, color: WHITE, fontFace: SERIF, charSpacing: 1 });
  txt(s, "Le Royaume de Belgique", { x: M, y: 3.32, w: 6.4, h: 0.45, fontSize: 22, color: GOLDL, fontFace: SERIF, italic: true });
  txt(s, "Koninkrijk België  ·  Königreich Belgien  ·  Kingdom of Belgium", { x: M, y: 3.82, w: 6.4, h: 0.3, fontSize: 12.5, color: LMUTE });

  s.addShape(pres.ShapeType.roundRect, { x: M, y: 4.5, w: 5.6, h: 1.0, rectRadius: 0.09, fill: { color: INK2 }, line: { color: "3A3A44", width: 1 } });
  txt(s, "A French-speaking country in the heart of Europe —", { x: M + 0.28, y: 4.66, w: 5.05, h: 0.3, fontSize: 12, color: LMUTE });
  txt(s, "and the capital of the European Union.", { x: M + 0.28, y: 4.96, w: 5.05, h: 0.3, fontSize: 12, color: LMUTE });

  txt(s, "Nom  ______________________________     Date  ____________________", {
    x: M, y: 6.55, w: 7.2, h: 0.3, fontSize: 11, color: "8A8A96",
  });
  s.addNotes("[0:15] Open: Belgium — a French-speaking country in Europe, and the one that happens to host the capital of the EU. Region chosen for the assignment: Europe.");
}

/* =========================================================================
   2 — WHERE IS BELGIUM (the marked map + the land)                  [0:45]
   ========================================================================= */
{
  const s = slide("Où se trouve la Belgique ?", "Western Europe, on the North Sea");
  const mw = 6.1, mh = mw / 1.2969;
  s.addImage({ path: IMG + "map_europe_belgium.png", x: M, y: TOP, w: mw, h: mh });
  txt(s, "Belgium marked in red on the blank outline map supplied with the assignment.", {
    x: M, y: TOP + mh + 0.12, w: mw, h: 0.3, fontSize: 9.5, color: MUTE, italic: true,
  });

  const px = 7.32, pw = W - M - px;
  card(s, px, TOP, pw, 2.02);
  txt(s, "LAND BORDERS  ·  1,297 km IN TOTAL", { x: px + 0.28, y: TOP + 0.16, w: pw - 0.56, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  factRows(s, [
    ["France", "556 km — south and south-west"],
    ["Netherlands", "478 km — north"],
    ["Germany", "133 km — east"],
    ["Luxembourg", "130 km — south-east"],
  ], px + 0.28, TOP + 0.48, pw - 0.56, 0.36, 1.42, 11);

  card(s, px, TOP + 2.18, pw, 1.88);
  txt(s, "THREE LANDSCAPES", { x: px + 0.28, y: TOP + 2.34, w: pw - 0.56, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  factRows(s, [
    ["Coast", "66.5 km of North Sea beach and polder"],
    ["Middle", "Fertile loam plateaus — Brussels sits here"],
    ["Ardennes", "Forest and river valleys, up to 694 m"],
  ], px + 0.28, TOP + 2.66, pw - 0.56, 0.46, 1.15, 11);

  card(s, px, TOP + 4.22, pw, 0.80, INK);
  txt(s, "About 50° N, 4° E — where Germanic and Latin Europe meet.", {
    x: px + 0.28, y: TOP + 4.40, w: pw - 0.56, h: 0.46, fontSize: 10.5, color: GOLDL, lineSpacingMultiple: 1.04,
  });
  s.addNotes("[0:45] The assignment's map requirement. Belgium is the red country: France below, the Netherlands above, Germany and Luxembourg to the east, and a short North Sea coast facing Britain. It is small — 30,689 km2, about Maryland — but it sits exactly where Germanic and Latin Europe meet, which explains both its wealth and its wars.");
}

/* =========================================================================
   3 — BY THE NUMBERS + STATUS                                      [0:35]
   ========================================================================= */
{
  const s = slide("La Belgique en chiffres", "The country's identity card");
  const stats = [
    ["11.8 M", "inhabitants (2025)"],
    ["30,689", "square kilometres"],
    ["389", "people per km²"],
    ["3", "official languages"],
    ["1830", "independence declared"],
  ];
  const sw = (CW - 4 * 0.28) / 5;
  stats.forEach((st, i) => {
    const x = M + i * (sw + 0.28);
    card(s, x, TOP, sw, 1.30, INK);
    txt(s, st[0], { x: x + 0.12, y: TOP + 0.18, w: sw - 0.24, h: 0.60, fontSize: 30, bold: true, color: GOLD, fontFace: SERIF, align: "center" });
    txt(s, st[1], { x: x + 0.1, y: TOP + 0.84, w: sw - 0.2, h: 0.32, fontSize: 10.5, color: "C9C9D2", align: "center" });
  });

  const y2 = TOP + 1.48;
  txt(s, "CARTE D'IDENTITÉ", { x: M, y: y2, w: 7.15, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.2, color: GOLD });
  factRows(s, [
    ["Official name", "Royaume de Belgique · Koninkrijk België · Königreich Belgien"],
    ["Capital", "Brussels (Bruxelles / Brussel) — officially bilingual"],
    ["Status", "Fully independent sovereign state since 1830"],
    ["Government", "Federal parliamentary constitutional monarchy"],
    ["Head of State", "King Philippe, King of the Belgians (since 21 July 2013)"],
    ["Prime Minister", "Bart De Wever (since 3 February 2025)"],
    ["Currency", "Euro (€) — founding member of the eurozone"],
    ["National day", "21 July — accession of Leopold I in 1831"],
    ["Member of", "EU · NATO · UN · eurozone · Schengen · Benelux · Francophonie"],
  ], M, y2 + 0.32, 7.15, 0.35, 1.75, 11.5);

  const px = M + 7.5, pw = W - M - px;
  const fh = 1.90;
  s.addImage({ path: IMG + "flag.jpg", x: px, y: y2 + 0.32, w: pw, h: fh, sizing: { type: "cover", w: pw, h: fh } });
  txt(s, "The tricolour of 1830 — black, yellow and red, from the arms of Brabant.", {
    x: px, y: y2 + 0.42 + fh, w: pw, h: 0.34, fontSize: 10, color: MUTE, italic: true,
  });
  card(s, px, y2 + 0.86 + fh, pw, 0.88, INK);
  txt(s, "INDEPENDENT — NOT A TERRITORY", { x: px + 0.26, y: y2 + 1.00 + fh, w: pw - 0.52, h: 0.24, fontSize: 9.5, bold: true, charSpacing: 1, color: GOLD });
  txt(s, "A sovereign state since 1830, not a French possession — it simply shares the language.", {
    x: px + 0.26, y: y2 + 1.26 + fh, w: pw - 0.52, h: 0.40, fontSize: 10.5, color: "D2D2DA", lineSpacingMultiple: 1.04,
  });
  s.addNotes("[0:35] The identity card. Two things to stress: Belgium is fully independent — it is NOT a French territory, it just shares the language. And it is a monarchy with a prime minister, which the next slides unpack.");
}

/* =========================================================================
   4 — REGIONS, COMMUNITIES, LANGUAGES                              [0:50]
   ========================================================================= */
{
  const s = slide("Régions, communautés, langues", "One country, three languages");
  const mw = 7.10, mh = mw / 1.5417;
  s.addImage({ path: IMG + "map_belgium_regions.png", x: 0.48, y: TOP + 0.02, w: mw, h: mh });

  const px = 8.15, pw = W - M - px;
  const regs = [
    ["FLANDRE / VLAANDEREN", "Dutch-speaking · north", "≈ 13,600 km²  ·  58 % of the population", GOLD],
    ["WALLONIE", "French-speaking · south", "≈ 16,900 km²  ·  32 % of the population", RED],
    ["BRUXELLES-CAPITALE", "Bilingual French / Dutch", "162 km²  ·  11 % of the population", INK],
  ];
  regs.forEach((r, i) => {
    const y = TOP + i * 1.24;
    card(s, px, y, pw, 1.08);
    s.addShape(pres.ShapeType.ellipse, { x: px + 0.24, y: y + 0.22, w: 0.24, h: 0.24, fill: { color: r[3] } });
    txt(s, r[0], { x: px + 0.6, y: y + 0.17, w: pw - 0.84, h: 0.28, fontSize: 12, bold: true, color: INK });
    txt(s, r[1], { x: px + 0.6, y: y + 0.45, w: pw - 0.84, h: 0.24, fontSize: 10.5, color: MUTE });
    txt(s, r[2], { x: px + 0.6, y: y + 0.71, w: pw - 0.84, h: 0.24, fontSize: 10.5, bold: true, color: BODY });
  });

  card(s, px, TOP + 3.74, pw, 1.16, INK);
  txt(s, "AND THREE COMMUNITIES", { x: px + 0.26, y: TOP + 3.9, w: pw - 0.52, h: 0.24, fontSize: 10, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "Regions govern territory — economy, transport, environment. Communities govern people — language, education and culture. The German-speaking Community has about 78,000 members.", {
    x: px + 0.26, y: TOP + 4.16, w: pw - 0.52, h: 0.72, fontSize: 10.5, color: "D2D2DA", lineSpacingMultiple: 1.03,
  });

  txt(s, "Dutch is spoken by about 60 % of Belgians, French by about 40 %, German by under 1 %.", {
    x: 1.28, y: TOP + mh + 0.14, w: mw, h: 0.3, fontSize: 10.5, color: MUTE, italic: true,
  });
  s.addNotes("[0:50] The single most important thing to understand about Belgium. Gold is Dutch-speaking Flanders, red is French-speaking Wallonia, and Brussels is the bilingual capital — a French-speaking island inside Flanders. This split runs through everything: the parties, the parliaments, the governments.");
}

/* =========================================================================
   5 — THE NAME                                                     [0:30]
   ========================================================================= */
{
  const s = slide("Le nom, hier et aujourd'hui", "Former names and the name today");
  const lw = 7.55;
  const rows = [
    ["57 BC", "Belgae", "Julius Caesar describes the Belgae, the tribes living between the Seine and the Rhine, in his account of the Gallic Wars. Their name is the root of every later one."],
    ["c. 22 BC", "Gallia Belgica", "Rome organises the conquered land as the province of Gallia Belgica — the first time the name marks a territory."],
    ["1556–1794", "Pays-Bas espagnols, puis autrichiens", "The Spanish Netherlands, then the Austrian Netherlands: the southern, Catholic half of the Low Countries, ruled from Madrid and then Vienna."],
    ["1790", "États-Belgiques-Unis", "The short-lived United Belgian States — the first time a country actually calls itself Belgian. It lasted less than a year."],
    ["1830 →", "Royaume de Belgique", "The modern kingdom. In Dutch Koninkrijk België, in German Königreich Belgien — three official names for one country."],
  ];
  rows.forEach((r, i) => tlRow(s, M, TOP + i * 0.97, lw, r[0], r[1], r[2], 1.2));

  const px = M + lw + 0.45, pw = W - M - px;
  card(s, px, TOP, pw, 2.5, INK);
  txt(s, "“Of all these peoples, the bravest are the Belgae.”", {
    x: px + 0.3, y: TOP + 0.35, w: pw - 0.6, h: 1.2, fontSize: 17, italic: true, color: GOLDL, fontFace: SERIF, lineSpacingMultiple: 1.1,
  });
  txt(s, "Julius Caesar, De Bello Gallico, Book I — the sentence Belgian schoolchildren still learn.", {
    x: px + 0.3, y: TOP + 1.7, w: pw - 0.6, h: 0.6, fontSize: 10.5, color: "A8A8B4",
  });

  card(s, px, TOP + 2.75, pw, 2.15);
  txt(s, "A DETAIL THAT MATTERS", { x: px + 0.3, y: TOP + 2.95, w: pw - 0.6, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "The monarch's title is Roi des Belges — King of the Belgians, not King of Belgium. The crown belongs to a people, not to a piece of land. That wording was deliberate in 1831 and it still says something about how the country understands itself.", {
    x: px + 0.3, y: TOP + 3.28, w: pw - 0.6, h: 1.5, fontSize: 11, color: BODY, lineSpacingMultiple: 1.05,
  });
  s.addNotes("[0:30] The name traces straight back to Caesar. Hit the Caesar quote and the King of the Belgians detail — both are memorable and both make the point that Belgium's identity is about a people, not a fixed territory.");
}

/* =========================================================================
   6 — HISTORY I                                                    [0:45]
   ========================================================================= */
{
  const s = slide("Histoire I  ·  57 av. J.-C. – 1815", "Ruled by everyone else", { titleW: 6.6 });
  s.addImage({ path: IMG + "waterloo.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.55, w: W - 7.35, h: 1.95, fill: { color: INK, transparency: 12 } });
  txt(s, "THE LION'S MOUND, WATERLOO", { x: 7.7, y: 5.82, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "Raised on the battlefield 15 km south of Brussels where Napoleon was finally defeated on 18 June 1815 — on what was not yet Belgian soil.", {
    x: 7.7, y: 6.14, w: 5.2, h: 1.0, fontSize: 11, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });

  const lw = 6.35;
  const rows = [
    ["57 BC", "Rome conquers the Belgae", "Caesar defeats the Belgic tribes and the land becomes the Roman province of Gallia Belgica. It stays Roman for four centuries."],
    ["5th c.", "The Franks", "Roman rule collapses. The Merovingians and then the Carolingians rule from the Meuse valley — Charlemagne's family heartland."],
    ["11th–15th c.", "Cloth cities and Burgundy", "Bruges, Ghent and Ypres grow rich weaving English wool. The Dukes of Burgundy unite the Low Countries and Flemish painting has its golden age."],
    ["1556–1794", "The Habsburgs", "The Spanish Netherlands, then the Austrian Netherlands. The Dutch Revolt splits the Protestant north from the Catholic south — the origin of today's border."],
    ["1795–1815", "France, then Waterloo", "Revolutionary France annexes the territory and makes French the language of law. Napoleon is beaten at Waterloo, and the powers hand the land to the Dutch."],
  ];
  rows.forEach((r, i) => tlRow(s, M, TOP + i * 0.99, lw, r[0], r[1], r[2], 1.15));
  s.addNotes("[0:45] The through-line: for nearly two thousand years this land was ruled from somewhere else — Rome, Burgundy, Madrid, Vienna, Paris, The Hague. Independence in 1830 is very recent. Don't read every row; land the pattern and point at Waterloo.");
}

/* =========================================================================
   7 — HISTORY II                                                   [0:50]
   ========================================================================= */
{
  const s = slide("Histoire II  ·  1830 – aujourd'hui", "Independence, empire and war", { titleW: 6.6 });
  s.addImage({ path: IMG + "ypres_menin.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.55, w: W - 7.35, h: 1.95, fill: { color: INK, transparency: 12 } });
  txt(s, "THE MENIN GATE, YPRES", { x: 7.7, y: 5.82, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "A memorial to 54,000 missing soldiers of the Ypres Salient. The Last Post has been sounded here every evening since 1928.", {
    x: 7.7, y: 6.14, w: 5.2, h: 1.0, fontSize: 11, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });

  const lw = 6.35;
  const rows = [
    ["1830–31", "Revolution and a king", "A performance of the opera La Muette de Portici sets off riots in Brussels. Independence is declared on 4 October 1830, and Leopold I is sworn in on 21 July 1831 — still the national day."],
    ["1839", "Recognised at last", "The Treaty of London: the Netherlands accepts Belgian independence and the powers guarantee Belgium's permanent neutrality."],
    ["1885–1960", "The Congo", "Leopold II takes the Congo as personal property; his regime's violence forces Belgium to take it over in 1908. The Congo becomes independent in 1960, Rwanda and Burundi in 1962."],
    ["1914–1945", "Neutrality broken twice", "Germany invades in 1914 and again in 1940. The Western Front settles into Flanders — Ypres, Passchendaele — and the Ardennes see the Battle of the Bulge."],
    ["1970–2014", "Six state reforms", "Tension between Dutch and French speakers is answered by rebuilding the country from the inside, turning a unitary state into today's federation."],
  ];
  rows.forEach((r, i) => tlRow(s, M, TOP + i * 0.99, lw, r[0], r[1], r[2], 1.15));
  s.addNotes("[0:50] The modern country in five beats. Worth saying out loud: in 2020 King Philippe expressed his 'deepest regrets' for the wounds of the colonial past — the first Belgian monarch to do so. Then the Menin Gate photo: the Last Post still sounds there every night.");
}

/* =========================================================================
   8 — POLITICAL ORGANISATION                                       [0:50]
   ========================================================================= */
{
  const s = slide("Organisation politique", "A federal parliamentary constitutional monarchy");
  const chips = [
    ["DEMOCRACY", "not a dictatorship"],
    ["MONARCHY", "not a republic"],
    ["FEDERAL", "not unitary, since 1993"],
    ["PARLIAMENTARY", "the government answers to parliament"],
  ];
  const cw2 = (CW - 3 * 0.28) / 4;
  chips.forEach((c, i) => {
    const x = M + i * (cw2 + 0.28);
    card(s, x, TOP, cw2, 0.92, INK);
    txt(s, c[0], { x: x + 0.15, y: TOP + 0.17, w: cw2 - 0.3, h: 0.3, fontSize: 14, bold: true, color: GOLD, align: "center", fontFace: SERIF });
    txt(s, c[1], { x: x + 0.1, y: TOP + 0.53, w: cw2 - 0.2, h: 0.28, fontSize: 10, color: "BFBFC9", align: "center" });
  });

  txt(s, "THREE LEVELS OF GOVERNMENT", { x: M, y: TOP + 1.10, w: CW, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.2, color: GOLD });

  const tiers = [
    ["THE FEDERAL LEVEL", "Defence, justice, police, foreign affairs, social security, most taxation.",
      "King Philippe, Head of State  ·  Prime Minister Bart De Wever  ·  Chamber of Representatives, 150 members elected by proportional representation  ·  Senate, 60 members, mostly appointed by the regional and community parliaments"],
    ["THE THREE REGIONS", "Territory: economy, employment, transport, housing, environment, agriculture.",
      "Flanders  ·  Wallonia  ·  Brussels-Capital — each with its own elected parliament and its own government"],
    ["THE THREE COMMUNITIES", "People: education, culture, language, health and welfare policy.",
      "Flemish Community  ·  French Community (Fédération Wallonie-Bruxelles)  ·  German-speaking Community"],
  ];
  tiers.forEach((t, i) => {
    const y = TOP + 1.42 + i * 1.18;
    card(s, M, y, CW, 1.06);
    badge(s, M + 0.28, y + 0.31, 0.44, String(i + 1));
    txt(s, t[0], { x: M + 0.9, y: y + 0.13, w: 3.4, h: 0.28, fontSize: 13, bold: true, color: INK });
    txt(s, t[1], { x: M + 0.9, y: y + 0.42, w: 3.4, h: 0.55, fontSize: 9.5, color: MUTE, lineSpacingMultiple: 1.0 });
    txt(s, t[2], { x: M + 4.5, y: y + 0.16, w: CW - 4.8, h: 0.78, fontSize: 10.5, color: BODY, lineSpacingMultiple: 1.05 });
  });

  txt(s, "Voting is compulsory from the age of 18, and because parties are organised by language, every federal government is a coalition.", {
    x: 1.28, y: TOP + 4.86, w: CW - 0.58, h: 0.3, fontSize: 10.5, italic: true, color: MUTE,
  });
  s.addNotes("[0:50] Answers the assignment's question directly: democracy not dictatorship, monarchy not republic. The four chips are the fastest way to say it. Then the three levels — a country of 11.8 million with six parliaments. Mention compulsory voting; it usually gets a reaction.");
}

/* =========================================================================
   9 — THE KING AND THE GOVERNMENT                                  [0:45]
   ========================================================================= */
{
  const s = slide("Le Roi et le gouvernement", "Who leads Belgium today", { titleW: 6.4 });
  s.addImage({ path: IMG + "royalpalace.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.7, w: W - 7.35, h: 1.8, fill: { color: INK, transparency: 12 } });
  txt(s, "THE ROYAL PALACE, BRUSSELS", { x: 7.7, y: 5.96, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "The King's official workplace. The royal family actually lives at Laeken, on the edge of the city.", {
    x: 7.7, y: 6.28, w: 5.2, h: 0.8, fontSize: 11, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });

  const lw = 6.35;
  card(s, M, TOP, lw, 2.30, INK);
  txt(s, "CHEF DE L'ÉTAT  ·  HEAD OF STATE", { x: M + 0.3, y: TOP + 0.20, w: lw - 0.6, h: 0.26, fontSize: 10, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "King Philippe", { x: M + 0.3, y: TOP + 0.50, w: lw - 0.6, h: 0.58, fontSize: 28, bold: true, color: WHITE, fontFace: SERIF });
  txt(s, "Seventh King of the Belgians, on the throne since 21 July 2013, when his father Albert II abdicated. His heir is Princess Elisabeth, who will be Belgium's first reigning queen.", {
    x: M + 0.3, y: TOP + 1.14, w: lw - 0.6, h: 0.66, fontSize: 10.5, color: "C4C4CE", lineSpacingMultiple: 1.04,
  });
  txt(s, "He signs laws but cannot veto them. His real power is quiet: choosing the negotiators who build a coalition.", {
    x: M + 0.3, y: TOP + 1.82, w: lw - 0.6, h: 0.42, fontSize: 10.5, color: GOLDL, lineSpacingMultiple: 1.04,
  });

  card(s, M, TOP + 2.48, lw, 2.24);
  txt(s, "PREMIER MINISTRE  ·  PRIME MINISTER", { x: M + 0.3, y: TOP + 2.66, w: lw - 0.6, h: 0.26, fontSize: 10, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "Bart De Wever", { x: M + 0.3, y: TOP + 2.96, w: lw - 0.6, h: 0.58, fontSize: 28, bold: true, color: INK, fontFace: SERIF });
  txt(s, "Sworn in on 3 February 2025, leading the five-party “Arizona” coalition: N-VA · MR · Les Engagés · Vooruit · CD&V. Head of government, accountable to the Chamber.", {
    x: M + 0.3, y: TOP + 3.60, w: lw - 0.6, h: 0.66, fontSize: 10.5, color: BODY, lineSpacingMultiple: 1.04,
  });
  txt(s, "It took eight months of negotiation to form. Belgium once went 541 days without an elected government.", {
    x: M + 0.3, y: TOP + 4.28, w: lw - 0.6, h: 0.42, fontSize: 10.5, bold: true, color: RED, lineSpacingMultiple: 1.04,
  });
  s.addNotes("[0:45] Two people, two jobs. The King reigns but does not rule — no veto. De Wever governs, and he is the first Flemish nationalist ever to lead the country. The 541-day record is the line people remember; use it to explain why the language split makes governing so hard.");
}

/* =========================================================================
   10 — BRUSSELS                                                    [0:40]
   ========================================================================= */
{
  const s = slide("Bruxelles", "The capital of Belgium — and of Europe");
  const ih = 3.16;
  const iwA = 4.55, iwB = 2.56;
  s.addImage({ path: IMG + "brussels_aerial.jpg", x: M, y: TOP, w: iwA, h: ih, sizing: { type: "cover", w: iwA, h: ih } });
  s.addImage({ path: IMG + "berlaymont.jpg", x: M + iwA + 0.24, y: TOP, w: iwB, h: ih, sizing: { type: "cover", w: iwB, h: ih } });
  txt(s, "Brussels from the Koekelberg basilica — the Atomium is on the horizon. Right: the Berlaymont, home of the European Commission.", {
    x: M, y: TOP + ih + 0.10, w: iwA + iwB + 0.24, h: 0.4, fontSize: 9.5, color: MUTE, italic: true,
  });

  const px = 8.15, pw = W - M - px;
  const facts = [
    ["1.25 million", "people in the Brussels-Capital Region; about 2.1 million in the wider metropolitan area."],
    ["Officially bilingual", "French and Dutch have equal status. In practice around 80 % of residents speak French — a French-speaking region surrounded by Flanders."],
    ["Capital of the EU", "Home to the European Commission, the Council of the EU and part of the European Parliament."],
    ["NATO headquarters", "Since 1967 — Belgium was a founding member in 1949."],
  ];
  let y = TOP;
  facts.forEach((f) => {
    txt(s, f[0], { x: px, y, w: pw, h: 0.26, fontSize: 12.5, bold: true, color: INK });
    txt(s, f[1], { x: px, y: y + 0.26, w: pw, h: 0.80, fontSize: 10.5, color: BODY, lineSpacingMultiple: 1.03 });
    y += 1.00;
  });

  card(s, M, TOP + 3.96, CW, 1.02, INK);
  txt(s, "WHAT TO SEE", { x: M + 0.32, y: TOP + 4.10, w: CW - 0.64, h: 0.24, fontSize: 10, bold: true, charSpacing: 1.2, color: GOLD });
  txt(s, "The Grand-Place, a UNESCO World Heritage site since 1998  ·  Manneken Pis  ·  the Art Nouveau town houses of Victor Horta, also UNESCO  ·  the Atomium  ·  the Magritte Museum  ·  the Belgian Comic Strip Center", {
    x: M + 0.32, y: TOP + 4.38, w: CW - 0.64, h: 0.50, fontSize: 10.5, color: "D2D2DA", lineSpacingMultiple: 1.06,
  });
  s.addNotes("[0:40] Brussels is the payoff slide. A city of 1.25 million that runs a continent: the Commission, the Council, and NATO. And it is a French-speaking island inside Dutch-speaking Flanders — which is exactly why it works as neutral ground.");
}

/* =========================================================================
   11 — CULTURE                                                     [0:35]
   ========================================================================= */
{
  const s = slide("Culture", "Painters, surrealists and the ninth art");
  const lw = 7.5;
  const blocks = [
    ["LA PEINTURE", "Jan van Eyck's Ghent Altarpiece (1432) is one of the founding works of European painting. Pieter Bruegel the Elder painted peasant life; Peter Paul Rubens made Antwerp a capital of the baroque; René Magritte turned Belgian surrealism into an image everyone knows — Ceci n'est pas une pipe."],
    ["LA BANDE DESSINÉE", "Belgium invented the modern European comic and calls it the ninth art. Hergé created Tintin in 1929; Peyo created the Smurfs (Les Schtroumpfs); Morris created Lucky Luke. Brussels has a comic-strip museum and a walking trail of painted murals."],
    ["LA MUSIQUE ET LE CINÉMA", "Adolphe Sax, born in Dinant in 1814, invented the saxophone. César Franck came from Liège, Jacques Brel from Brussels. The Dardenne brothers have won the Palme d'Or at Cannes twice."],
  ];
  let y = TOP;
  blocks.forEach((b) => {
    txt(s, b[0], { x: M, y, w: lw, h: 0.28, fontSize: 12.5, bold: true, charSpacing: 1.1, color: GOLD });
    txt(s, b[1], { x: M, y: y + 0.32, w: lw, h: 1.25, fontSize: 11.5, color: BODY, lineSpacingMultiple: 1.06 });
    y += 1.72;
  });

  const px = M + lw + 0.5, pw = W - M - px;
  photo(s, "antwerp_cathedral.jpg", px, TOP, pw, 2.25, "The Cathedral of Our Lady, Antwerp — its belfry is UNESCO-listed and it holds four Rubens altarpieces.");
  photo(s, "mannekenpis.jpg", px, TOP + 2.92, pw, 1.72, "Manneken Pis, Brussels — cast in bronze in 1619.");
  s.addNotes("[0:35] Pick two, don't read all three. Best bets: Magritte, because everyone has seen the pipe; and Tintin and the Smurfs, because almost nobody knows they are Belgian. Adolphe Sax and the saxophone is a good closer.");
}

/* =========================================================================
   12 — FOOD                                                        [0:25]
   ========================================================================= */
{
  const s = slide("Gastronomie", "Four things Belgium is famous for — and rightly so");
  const items = [
    ["chocolate.jpg", "LE CHOCOLAT", "The filled praline was invented in Brussels by Jean Neuhaus II in 1912. Belgium has several hundred chocolatiers and exports chocolate worldwide."],
    ["waffles.jpg", "LA GAUFRE", "Two rival waffles: the light rectangular gaufre de Bruxelles, and the dense, chewy gaufre de Liège studded with caramelised pearl sugar."],
    ["frites.jpg", "LES FRITES", "Belgians claim to have invented them, fry them twice, sell them from a friterie and eat them from a paper cone with mayonnaise — never as a side dish."],
    ["beer.jpg", "LA BIÈRE", "More than a thousand Belgian beers, from Trappist abbey ales to sour lambics. Belgian beer culture was added to UNESCO's Intangible Cultural Heritage list in 2016."],
  ];
  const cw2 = (CW - 3 * 0.32) / 4, ih = 2.05;
  items.forEach((it, i) => {
    const x = M + i * (cw2 + 0.32);
    s.addImage({ path: IMG + it[0], x, y: TOP, w: cw2, h: ih, sizing: { type: "cover", w: cw2, h: ih } });
    txt(s, it[1], { x, y: TOP + ih + 0.22, w: cw2, h: 0.3, fontSize: 13, bold: true, charSpacing: 1, color: INK });
    txt(s, it[2], { x, y: TOP + ih + 0.54, w: cw2, h: 1.30, fontSize: 11, color: BODY, lineSpacingMultiple: 1.05 });
  });

  card(s, M, TOP + 4.06, CW, 0.92, INK);
  txt(s, "AT THE TABLE", { x: M + 0.32, y: TOP + 4.20, w: CW - 0.64, h: 0.24, fontSize: 10, bold: true, charSpacing: 1.2, color: GOLD });
  txt(s, "Moules-frites  ·  carbonnade flamande, beef stewed in beer  ·  waterzooi from Ghent  ·  chicons au gratin  ·  speculoos biscuits  ·  and, in season, the grey shrimp of the North Sea coast.", {
    x: M + 0.32, y: TOP + 4.48, w: CW - 0.64, h: 0.46, fontSize: 11, color: "D2D2DA", lineSpacingMultiple: 1.05,
  });
  s.addNotes("[0:25] Move fast, the pictures do the work. Two facts worth saying: the praline was invented in Brussels in 1912, and Belgian beer culture is on the UNESCO heritage list. The frites-are-Belgian-not-French claim usually gets a laugh.");
}

/* =========================================================================
   13 — CITIES OF ART                                               [0:30]
   ========================================================================= */
{
  const s = slide("Les villes d'art", "Three cities worth the trip");
  const cities = [
    ["bruges.jpg", "BRUGES / BRUGGE", "The Venice of the North. The entire historic centre is a UNESCO World Heritage site, along with its belfry and its béguinage. Medieval brick gables, canals, and the Groeninge Museum's Flemish Primitives."],
    ["ghent.jpg", "GAND / GENT", "A working city rather than a museum. The Gravensteen castle, the guild houses of the Graslei, and van Eyck's Ghent Altarpiece in Saint Bavo's Cathedral. A UNESCO Creative City of Music."],
    ["antwerp_station.jpg", "ANVERS / ANTWERPEN", "Rubens' city and Belgium's port. Central Station is known as the railway cathedral. More than 70 % of the world's rough diamonds still pass through the Antwerp diamond district."],
  ];
  const cw2 = (CW - 2 * 0.42) / 3, ih = 2.7;
  cities.forEach((c, i) => {
    const x = M + i * (cw2 + 0.42);
    s.addImage({ path: IMG + c[0], x, y: TOP, w: cw2, h: ih, sizing: { type: "cover", w: cw2, h: ih } });
    txt(s, c[1], { x, y: TOP + ih + 0.26, w: cw2, h: 0.3, fontSize: 14, bold: true, charSpacing: 1, color: INK });
    txt(s, c[2], { x, y: TOP + ih + 0.62, w: cw2, h: 1.5, fontSize: 11, color: BODY, lineSpacingMultiple: 1.06 });
  });
  txt(s, "Belgium has 13 UNESCO World Heritage sites in a country the size of Maryland — including 33 of the belfries of Belgium and France, and the Carnival of Binche on the Intangible Heritage list.", {
    x: 1.28, y: TOP + 4.74, w: CW - 0.58, h: 0.3, fontSize: 10.5, italic: true, color: MUTE,
  });
  s.addNotes("[0:30] Bruges is the postcard, Ghent is the one locals prefer, Antwerp is the working city. The diamond statistic — over 70 % of the world's rough diamonds — is the one that lands.");
}

/* =========================================================================
   14 — VISITOR INFORMATION                                         [0:25]
   ========================================================================= */
{
  const s = slide("Infos pratiques", "What a visitor needs to know");
  const info = [
    ["1", "MONEY", "The euro. Cards and contactless are accepted almost everywhere; American Express often is not. Service is included and tipping is not expected."],
    ["2", "GETTING IN", "Belgium is in the Schengen area. Visitors from the US, UK, Canada, Australia and Japan may stay 90 days without a visa; an ETIAS travel authorisation is being introduced. Fly into Brussels (BRU) or Charleroi (CRL)."],
    ["3", "GETTING AROUND", "The rail network is one of the densest in the world and almost nowhere is more than about two hours from anywhere else. Trams and metro in the cities; bicycles everywhere in Flanders."],
    ["4", "LANGUAGE", "French in Wallonia and Brussels, Dutch in Flanders, German in the far east. English is widely spoken in cities. Open in French in Brussels and Wallonia, in Dutch or English in Flanders — the choice of language is never neutral."],
    ["5", "WHEN TO GO", "May to September for the best weather; December for the Christmas markets. Bring a raincoat in any month — the Belgians have a word for a downpour, une drache."],
    ["6", "DON'T MISS", "The Grand-Place lit up at night  ·  a canal boat in Bruges  ·  a cone of frites from a friterie  ·  a Trappist beer in an abbey café  ·  Dinant on the Meuse."],
  ];
  const cw2 = (CW - 0.4) / 2;
  info.forEach((it, i) => {
    const x = M + (i % 2) * (cw2 + 0.4), y = TOP + Math.floor(i / 2) * 1.30;
    badge(s, x, y + 0.02, 0.46, it[0]);
    txt(s, it[1], { x: x + 0.64, y: y + 0.01, w: cw2 - 0.64, h: 0.28, fontSize: 12.5, bold: true, charSpacing: 1, color: INK });
    txt(s, it[2], { x: x + 0.64, y: y + 0.31, w: cw2 - 0.64, h: 0.86, fontSize: 10.5, color: BODY, lineSpacingMultiple: 1.04 });
  });

  const by = TOP + 4.06;
  s.addImage({ path: IMG + "dinant.jpg", x: M, y: by, w: CW, h: 0.78, sizing: { type: "cover", w: CW, h: 0.78 } });
  txt(s, "Dinant on the Meuse, in Wallonia — birthplace of Adolphe Sax, inventor of the saxophone.", {
    x: 1.28, y: by + 0.86, w: CW - 0.58, h: 0.3, fontSize: 10, color: MUTE, italic: true,
  });
  s.addNotes("[0:25] Fastest slide in the deck — do not read the boxes. Say three things: it is in Schengen so no visa for 90 days, the trains reach everything in two hours, and which language you open with matters. Then move on.");
}

/* =========================================================================
   15 — FRANCOPHONIE / CONCLUSION                                   [0:30]
   ========================================================================= */
{
  n++;
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addImage({ path: IMG + "grandplace.jpg", x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H }, transparency: 78 });

  txt(s, "LA BELGIQUE ET LA FRANCOPHONIE", { x: M, y: 0.62, w: CW, h: 0.3, fontSize: 11.5, bold: true, charSpacing: 2.2, color: GOLD });
  txt(s, "A French-speaking country at the centre of Europe", { x: M, y: 0.98, w: CW, h: 0.6, fontSize: 31, bold: true, color: WHITE, fontFace: SERIF });

  const blocks = [
    ["≈ 40 %", "of Belgians — roughly 4.5 million people — have French as their mother tongue, concentrated in Wallonia and Brussels."],
    ["2 seats", "Belgium is a founding member of the Organisation internationale de la Francophonie and is represented twice: the Kingdom of Belgium, and the French Community."],
    ["septante", "Belgian French keeps septante for 70 and nonante for 90, where France says soixante-dix and quatre-vingt-dix."],
  ];
  const cw2 = (CW - 2 * 0.4) / 3;
  blocks.forEach((b, i) => {
    const x = M + i * (cw2 + 0.4);
    s.addShape(pres.ShapeType.roundRect, { x, y: 2.0, w: cw2, h: 2.15, rectRadius: 0.09, fill: { color: INK2, transparency: 12 }, line: { color: "42424E", width: 1 } });
    txt(s, b[0], { x: x + 0.26, y: 2.24, w: cw2 - 0.52, h: 0.6, fontSize: 27, bold: true, color: GOLD, fontFace: SERIF });
    txt(s, b[1], { x: x + 0.26, y: 2.9, w: cw2 - 0.52, h: 1.15, fontSize: 11, color: "CFCFD8", lineSpacingMultiple: 1.06 });
  });

  txt(s, "A few Belgicismes worth knowing", { x: M, y: 4.42, w: CW, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.2, color: GOLD });
  txt(s, "un GSM — a mobile phone  ·  une drache — a sudden downpour  ·  faire la file — to queue  ·  savoir used where France would say pouvoir  ·  un kot — a student room", {
    x: M, y: 4.74, w: CW, h: 0.4, fontSize: 12, color: "D6D6DE",
  });

  s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.32, w: CW, h: 1.12, rectRadius: 0.09, fill: { color: GOLD } });
  txt(s, "Belgium is where Germanic and Latin Europe meet. It is a small, young, complicated country that has learned to hold three languages, six parliaments and two thousand years of other people's empires — and it houses the capital of Europe while doing it.", {
    x: M + 0.34, y: 5.48, w: CW - 0.68, h: 0.85, fontSize: 12.5, bold: true, color: INK, lineSpacingMultiple: 1.06,
  });
  chrome(s, true);
  s.addNotes("[0:30] Close here. Read the gold box out loud — it is the thesis. Then stop and take questions. Do not click to the sources slide unless someone asks.");
}

/* =========================================================================
   16 — SOURCES                                                     [0:05]
   ========================================================================= */
{
  const s = slide("Sources", "Where the facts in this presentation come from");
  const src = [
    ["belgium.be", "The federal government's official portal — history, regions and institutions."],
    ["monarchie.be", "The Belgian Monarchy — the King's role, duties and family."],
    ["premier.be  ·  kanselarij.belgium.be", "Office of the Prime Minister — the current federal government."],
    ["european-union.europa.eu", "European Union country profile: Belgium."],
    ["whc.unesco.org", "UNESCO World Heritage Centre — Belgium's listed sites and its beer culture."],
    ["diplomatie.belgium.be", "Belgian Foreign Affairs — Belgium and the Organisation internationale de la Francophonie."],
    ["Britannica  ·  CIA World Factbook", "Population, area, borders, coastline and general geography."],
    ["visitflanders.com  ·  visitbruges.be  ·  visitwallonia.be", "Official tourist boards — visitor information."],
  ];
  src.forEach((r, i) => {
    const y = TOP + i * 0.55;
    badge(s, M, y + 0.02, 0.34, String(i + 1));
    txt(s, r[0], { x: M + 0.5, y, w: 4.4, h: 0.28, fontSize: 11.5, bold: true, color: INK });
    txt(s, r[1], { x: M + 5.0, y, w: CW - 5.0, h: 0.4, fontSize: 11, color: BODY });
  });
  txt(s, "Photographs licensed from Adobe Stock. The map of Europe is the blank outline map supplied with the assignment, with Belgium marked and its neighbours labelled; the map of Belgium's regions was drawn from that same outline. Language and community boundaries are shown approximately.", {
    x: 1.28, y: TOP + 4.62, w: CW - 0.58, h: 0.7, fontSize: 10, color: MUTE, italic: true, lineSpacingMultiple: 1.06,
  });
  s.addNotes("[0:05] Leave this up during questions. Timings on each slide add up to 9 minutes 15, leaving about 45 seconds of buffer in a 10-minute slot.");
}

pres.writeFile({ fileName: __dirname + "/La_Belgique_FREN201.pptx" }).then((f) => console.log("wrote", f, "—", n, "slides"));
