/* ==========================  1 — TITLE  [0:15]  ========================== */
{
  n++;
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addImage({ path: IMG + "grandplace.jpg", x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H }, transparency: 62 });
  s.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 6.9, h: H, fill: { color: INK, transparency: 22 } });

  txt(s, "FRENCH-SPEAKING WORLD PROJECT  ·  FREN 201", { x: M, y: 1.60, w: 6.2, h: 0.3, fontSize: 12.5, bold: true, charSpacing: 2.2, color: GOLD });
  txt(s, "BELGIUM", { x: M, y: 2.05, w: 7.6, h: 1.2, fontSize: 68, bold: true, color: WHITE, fontFace: SERIF, charSpacing: 1 });
  txt(s, "The Kingdom of Belgium", { x: M, y: 3.42, w: 6.4, h: 0.45, fontSize: 24, color: GOLDL, fontFace: SERIF, italic: true });

  s.addShape(pres.ShapeType.roundRect, { x: M, y: 4.35, w: 6.0, h: 1.05, rectRadius: 0.09, fill: { color: INK2 }, line: { color: "3A3A44", width: 1 } });
  txt(s, "A French-speaking country in the heart of Europe —", { x: M + 0.3, y: 4.53, w: 5.4, h: 0.32, fontSize: 13, color: LMUTE });
  txt(s, "and the capital of the European Union.", { x: M + 0.3, y: 4.87, w: 5.4, h: 0.32, fontSize: 13, color: LMUTE });

  txt(s, "Name  ______________________________     Date  ____________________", {
    x: M, y: 6.55, w: 7.2, h: 0.3, fontSize: 11, color: "8A8A96",
  });
  s.addNotes("[0:15] Belgium — a French-speaking country in Europe, and the country that hosts the capital of the EU. Region chosen for the assignment: Europe.");
}

/* ====================  2 — WHERE BELGIUM IS  [0:45]  ==================== */
{
  const s = slide("Location", "Western Europe, on the North Sea");
  const mw = 6.1, mh = mw / 1.2969;
  s.addImage({ path: IMG + "map_europe_belgium_en.png", x: M, y: TOP, w: mw, h: mh });
  txt(s, "Belgium marked in red on the blank outline map supplied with the assignment.", {
    x: M, y: TOP + mh + 0.12, w: mw, h: 0.3, fontSize: 9.5, color: MUTE, italic: true,
  });

  const px = 7.32, pw = W - M - px;
  card(s, px, TOP, pw, 2.30);
  txt(s, "FOUR NEIGHBOURS", { x: px + 0.3, y: TOP + 0.22, w: pw - 0.6, h: 0.26, fontSize: 11, bold: true, charSpacing: 1.1, color: GOLD });
  factRows(s, [
    ["France", "south"],
    ["Netherlands", "north"],
    ["Germany", "east"],
    ["Luxembourg", "south-east"],
  ], px + 0.3, TOP + 0.62, pw - 0.6, 0.40, 2.0, 13);

  card(s, px, TOP + 2.50, pw, 1.55);
  txt(s, "THE LAND", { x: px + 0.3, y: TOP + 2.70, w: pw - 0.6, h: 0.26, fontSize: 11, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "Flat coast and farmland in the north. Rolling plateaus in the middle, where Brussels sits. Forested Ardennes hills in the south.", {
    x: px + 0.3, y: TOP + 3.04, w: pw - 0.6, h: 0.90, fontSize: 12.5, color: BODY, lineSpacingMultiple: 1.08,
  });

  card(s, px, TOP + 4.22, pw, 0.80, INK);
  txt(s, "30,689 km² — about the size of Maryland.", {
    x: px + 0.3, y: TOP + 4.42, w: pw - 0.6, h: 0.42, fontSize: 12.5, bold: true, color: GOLDL,
  });
  s.addNotes("[0:45] The map requirement. Belgium is the red country, surrounded by France, the Netherlands, Germany and Luxembourg, with a short North Sea coast facing Britain. Small country, but it sits exactly where Germanic and Latin Europe meet.");
}

/* ==================  3 — BELGIUM AT A GLANCE  [0:35]  =================== */
{
  const s = slide("Key facts", "Belgium at a glance");
  const stats = [
    ["11.8 M", "people"],
    ["30,689", "square km"],
    ["3", "official languages"],
    ["1830", "independence"],
  ];
  const sw = (CW - 3 * 0.3) / 4;
  stats.forEach((st, i) => {
    const x = M + i * (sw + 0.3);
    card(s, x, TOP, sw, 1.35, INK);
    txt(s, st[0], { x: x + 0.12, y: TOP + 0.20, w: sw - 0.24, h: 0.62, fontSize: 34, bold: true, color: GOLD, fontFace: SERIF, align: "center" });
    txt(s, st[1], { x: x + 0.1, y: TOP + 0.88, w: sw - 0.2, h: 0.32, fontSize: 11.5, color: "C9C9D2", align: "center" });
  });

  const y2 = TOP + 1.66;
  factRows(s, [
    ["Official name", "Kingdom of Belgium"],
    ["Capital", "Brussels"],
    ["Status", "Independent since 1830"],
    ["Government", "Federal parliamentary constitutional monarchy"],
    ["Head of State", "King Philippe, since 2013"],
    ["Prime Minister", "Bart De Wever, since 2025"],
    ["Languages", "Dutch, French and German"],
    ["Currency", "Euro (€)"],
  ], M, y2, 7.15, 0.44, 1.9, 13);

  const px = M + 7.5, pw = W - M - px;
  const fh = 1.90;
  s.addImage({ path: IMG + "flag.jpg", x: px, y: y2, w: pw, h: fh, sizing: { type: "cover", w: pw, h: fh } });
  txt(s, "The tricolour of 1830 — black, yellow and red.", {
    x: px, y: y2 + 0.12 + fh, w: pw, h: 0.32, fontSize: 10.5, color: MUTE, italic: true,
  });
  card(s, px, y2 + 0.58 + fh, pw, 1.06, INK);
  txt(s, "INDEPENDENT COUNTRY", { x: px + 0.28, y: y2 + 0.74 + fh, w: pw - 0.56, h: 0.24, fontSize: 10, bold: true, charSpacing: 1, color: GOLD });
  txt(s, "Belgium is not a French territory. It is a sovereign state that happens to share the language.", {
    x: px + 0.28, y: y2 + 1.02 + fh, w: pw - 0.56, h: 0.54, fontSize: 11.5, color: "D2D2DA", lineSpacingMultiple: 1.05,
  });
  s.addNotes("[0:35] Two things to stress: Belgium is fully independent — not a French territory — and it is a monarchy that also has a prime minister. The next slides explain how that works.");
}

/* ============  4 — THREE REGIONS, THREE LANGUAGES  [0:45]  ============== */
{
  const s = slide("Regions and languages", "One country, three languages");
  const mw = 7.10, mh = mw / 1.5417;
  s.addImage({ path: IMG + "map_belgium_regions_en.png", x: 0.48, y: TOP + 0.02, w: mw, h: mh });

  const px = 8.15, pw = W - M - px;
  const regs = [
    ["FLANDERS", "Dutch-speaking, in the north", "58 % of the population", GOLD],
    ["WALLONIA", "French-speaking, in the south", "32 % of the population", RED],
    ["BRUSSELS", "Bilingual, the capital", "11 % of the population", INK],
  ];
  regs.forEach((r, i) => {
    const y = TOP + i * 1.24;
    card(s, px, y, pw, 1.08);
    s.addShape(pres.ShapeType.ellipse, { x: px + 0.26, y: y + 0.20, w: 0.26, h: 0.26, fill: { color: r[3] } });
    txt(s, r[0], { x: px + 0.64, y: y + 0.15, w: pw - 0.88, h: 0.30, fontSize: 14, bold: true, color: INK });
    txt(s, r[1], { x: px + 0.64, y: y + 0.46, w: pw - 0.88, h: 0.26, fontSize: 11.5, color: MUTE });
    txt(s, r[2], { x: px + 0.64, y: y + 0.73, w: pw - 0.88, h: 0.26, fontSize: 11.5, bold: true, color: BODY });
  });

  card(s, px, TOP + 3.80, pw, 1.10, INK);
  txt(s, "Each region has its own parliament and government. There is also a small German-speaking community of about 78,000 people in the east.", {
    x: px + 0.28, y: TOP + 3.98, w: pw - 0.56, h: 0.78, fontSize: 11.5, color: "D2D2DA", lineSpacingMultiple: 1.06,
  });

  txt(s, "About 60 % of Belgians speak Dutch, 40 % speak French, and under 1 % speak German.", {
    x: 1.28, y: TOP + mh + 0.14, w: mw, h: 0.3, fontSize: 11, color: MUTE, italic: true,
  });
  s.addNotes("[0:45] The most important slide for understanding Belgium. Gold is Dutch-speaking Flanders, red is French-speaking Wallonia, and Brussels is the bilingual capital — a French-speaking island inside Flanders. This split runs through everything.");
}

/* =================  5 — THE NAME, THEN AND NOW  [0:30]  ================= */
{
  const s = slide("The name", "What Belgium used to be called");
  const lw = 7.55;
  const rows = [
    ["57 BC", "The Belgae", "Julius Caesar writes about the Belgae, the tribes living here. Every later name comes from theirs."],
    ["22 BC", "Gallia Belgica", "Rome makes the territory a province and gives the name to a piece of land for the first time."],
    ["1556–1794", "The Spanish, then Austrian Netherlands", "Ruled from Madrid and then from Vienna — the Catholic southern half of the Low Countries."],
    ["1830", "The Kingdom of Belgium", "The modern name. In Dutch, Koninkrijk België; in German, Königreich Belgien."],
  ];
  rows.forEach((r, i) => tlRow(s, M, TOP + i * 1.22, lw, r[0], r[1], r[2], 1.35));

  const px = M + lw + 0.45, pw = W - M - px;
  card(s, px, TOP, pw, 2.35, INK);
  txt(s, "“Of all these peoples, the bravest are the Belgae.”", {
    x: px + 0.32, y: TOP + 0.36, w: pw - 0.64, h: 1.2, fontSize: 17, italic: true, color: GOLDL, fontFace: SERIF, lineSpacingMultiple: 1.1,
  });
  txt(s, "Julius Caesar, 57 BC", { x: px + 0.32, y: TOP + 1.72, w: pw - 0.64, h: 0.4, fontSize: 11.5, color: "A8A8B4" });

  card(s, px, TOP + 2.60, pw, 2.30);
  txt(s, "A DETAIL WORTH KNOWING", { x: px + 0.32, y: TOP + 2.82, w: pw - 0.64, h: 0.26, fontSize: 11, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "The title is King of the Belgians, not King of Belgium. The crown belongs to a people, not to a piece of land — and that wording was chosen deliberately in 1831.", {
    x: px + 0.32, y: TOP + 3.18, w: pw - 0.64, h: 1.5, fontSize: 12.5, color: BODY, lineSpacingMultiple: 1.08,
  });
  s.addNotes("[0:30] The name goes straight back to Caesar. Use the quote and the King of the Belgians detail — both are easy to remember and both make the same point about people rather than territory.");
}

/* ==================  6 — HISTORY I  ·  57 BC – 1815  [0:45]  ============ */
{
  const s = slide("History, part 1", "Ruled by everyone else", { titleW: 6.6 });
  s.addImage({ path: IMG + "waterloo.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.62, w: W - 7.35, h: 1.88, fill: { color: INK, transparency: 12 } });
  txt(s, "THE LION'S MOUND, WATERLOO", { x: 7.7, y: 5.90, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "Napoleon was defeated here on 18 June 1815, 15 km south of Brussels.", {
    x: 7.7, y: 6.24, w: 5.2, h: 0.8, fontSize: 11.5, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });

  const lw = 6.35;
  const rows = [
    ["57 BC", "Rome conquers the Belgae", "The land becomes a Roman province and stays Roman for four hundred years."],
    ["5th c.", "The Franks", "Frankish kings take over and rule from the Meuse valley — Charlemagne's family heartland."],
    ["11th–15th c.", "Rich cloth cities", "Bruges, Ghent and Ypres grow wealthy weaving wool, and Flemish painting has its golden age."],
    ["1556–1794", "Spanish, then Austrian rule", "The Catholic south splits away from the Protestant Dutch north — the border we still have today."],
    ["1795–1815", "France, then Waterloo", "France annexes the land and makes French official. Napoleon falls at Waterloo in 1815."],
  ];
  rows.forEach((r, i) => tlRow(s, M, TOP + i * 0.99, lw, r[0], r[1], r[2], 1.20));
  s.addNotes("[0:45] One idea: for two thousand years this land was ruled from somewhere else — Rome, Burgundy, Madrid, Vienna, Paris. Independence in 1830 is very recent. Don't read every row; make that point and gesture at Waterloo.");
}

/* ================  7 — HISTORY II  ·  1830 – TODAY  [0:50]  ============= */
{
  const s = slide("History, part 2", "Independence, empire and war", { titleW: 6.6 });
  s.addImage({ path: IMG + "ypres_menin.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.62, w: W - 7.35, h: 1.88, fill: { color: INK, transparency: 12 } });
  txt(s, "THE MENIN GATE, YPRES", { x: 7.7, y: 5.90, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "A memorial to 54,000 missing soldiers. The Last Post has sounded here every evening since 1928.", {
    x: 7.7, y: 6.24, w: 5.2, h: 0.8, fontSize: 11.5, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });

  const lw = 6.35;
  const rows = [
    ["1830", "Revolution and independence", "Riots in Brussels drive out the Dutch. Independence is declared on 4 October."],
    ["1831", "A king and a constitution", "Leopold I is sworn in on 21 July — a date that is still the national day."],
    ["1885–1960", "The Congo", "Leopold II runs the Congo as a brutal private colony; Belgium takes it over in 1908. The Congo becomes independent in 1960."],
    ["1914–1945", "Invaded twice", "Germany breaks Belgian neutrality in 1914 and again in 1940. The Western Front settles into Flanders."],
    ["1970–2014", "Six state reforms", "Tension between Dutch and French speakers turns a single unified state into today's federation."],
  ];
  rows.forEach((r, i) => tlRow(s, M, TOP + i * 0.99, lw, r[0], r[1], r[2], 1.20));
  s.addNotes("[0:50] Worth saying out loud: in 2020 King Philippe expressed his 'deepest regrets' for the wounds of the colonial past — the first Belgian monarch to do so. Then finish on the Menin Gate: the Last Post still sounds there every night.");
}

/* ==============  8 — HOW BELGIUM IS GOVERNED  [0:50]  ================== */
{
  const s = slide("Political organisation", "How Belgium is governed");
  const chips = [
    ["DEMOCRACY", "not a dictatorship"],
    ["MONARCHY", "not a republic"],
    ["FEDERAL", "not one central state"],
    ["PARLIAMENTARY", "government answers to parliament"],
  ];
  const cw2 = (CW - 3 * 0.28) / 4;
  chips.forEach((c, i) => {
    const x = M + i * (cw2 + 0.28);
    card(s, x, TOP, cw2, 1.00, INK);
    txt(s, c[0], { x: x + 0.15, y: TOP + 0.18, w: cw2 - 0.3, h: 0.32, fontSize: 15, bold: true, color: GOLD, align: "center", fontFace: SERIF });
    txt(s, c[1], { x: x + 0.1, y: TOP + 0.58, w: cw2 - 0.2, h: 0.30, fontSize: 10.5, color: "BFBFC9", align: "center" });
  });

  const tiers = [
    ["THE FEDERAL GOVERNMENT", "Defence, justice, police, foreign affairs, taxes",
      "King Philippe as Head of State, Prime Minister Bart De Wever, and a Chamber of 150 elected members"],
    ["THE THREE REGIONS", "Economy, transport, housing, environment",
      "Flanders, Wallonia and Brussels-Capital — each with its own parliament and government"],
    ["THE THREE COMMUNITIES", "Education, culture and language",
      "The Flemish, French and German-speaking communities"],
  ];
  tiers.forEach((t, i) => {
    const y = TOP + 1.30 + i * 1.20;
    card(s, M, y, CW, 1.06);
    badge(s, M + 0.30, y + 0.31, 0.44, String(i + 1));
    txt(s, t[0], { x: M + 0.94, y: y + 0.16, w: 3.7, h: 0.28, fontSize: 13.5, bold: true, color: INK });
    txt(s, t[1], { x: M + 0.94, y: y + 0.48, w: 3.7, h: 0.44, fontSize: 10.5, color: MUTE, lineSpacingMultiple: 1.0 });
    txt(s, t[2], { x: M + 4.85, y: y + 0.24, w: CW - 5.15, h: 0.66, fontSize: 12, color: BODY, lineSpacingMultiple: 1.06 });
  });

  txt(s, "Voting is compulsory from age 18, and every federal government is a coalition.", {
    x: 1.28, y: TOP + 4.82, w: CW - 0.58, h: 0.3, fontSize: 11.5, italic: true, color: MUTE,
  });
  s.addNotes("[0:50] This answers the assignment's question directly. The four boxes across the top are the whole answer: a democracy, a monarchy, federal, parliamentary. Then point at the three levels — a country of 11.8 million with six parliaments. Compulsory voting usually gets a reaction.");
}

/* ==================  9 — WHO LEADS BELGIUM  [0:45]  ===================== */
{
  const s = slide("Leadership", "Who leads Belgium today", { titleW: 6.4 });
  s.addImage({ path: IMG + "royalpalace.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.78, w: W - 7.35, h: 1.72, fill: { color: INK, transparency: 12 } });
  txt(s, "THE ROYAL PALACE, BRUSSELS", { x: 7.7, y: 6.04, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "The King's official workplace. The royal family lives at Laeken, outside the city.", {
    x: 7.7, y: 6.38, w: 5.2, h: 0.7, fontSize: 11.5, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });

  const lw = 6.35;
  card(s, M, TOP, lw, 2.28, INK);
  txt(s, "HEAD OF STATE", { x: M + 0.32, y: TOP + 0.22, w: lw - 0.64, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "King Philippe", { x: M + 0.32, y: TOP + 0.54, w: lw - 0.64, h: 0.60, fontSize: 30, bold: true, color: WHITE, fontFace: SERIF });
  txt(s, "The seventh King of the Belgians, on the throne since 2013. His heir, Princess Elisabeth, will be Belgium's first reigning queen.", {
    x: M + 0.32, y: TOP + 1.22, w: lw - 0.64, h: 0.60, fontSize: 12, color: "C4C4CE", lineSpacingMultiple: 1.06,
  });
  txt(s, "He signs laws but cannot veto them.", {
    x: M + 0.32, y: TOP + 1.84, w: lw - 0.64, h: 0.32, fontSize: 12, bold: true, color: GOLDL,
  });

  card(s, M, TOP + 2.50, lw, 2.28);
  txt(s, "HEAD OF GOVERNMENT", { x: M + 0.32, y: TOP + 2.72, w: lw - 0.64, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "Bart De Wever", { x: M + 0.32, y: TOP + 3.04, w: lw - 0.64, h: 0.60, fontSize: 30, bold: true, color: INK, fontFace: SERIF });
  txt(s, "Prime Minister since February 2025, leading a coalition of five parties. He answers to parliament, not to the King.", {
    x: M + 0.32, y: TOP + 3.72, w: lw - 0.64, h: 0.60, fontSize: 12, color: BODY, lineSpacingMultiple: 1.06,
  });
  txt(s, "Belgium once went 541 days without an elected government.", {
    x: M + 0.32, y: TOP + 4.34, w: lw - 0.64, h: 0.32, fontSize: 12, bold: true, color: RED,
  });
  s.addNotes("[0:45] Two people, two different jobs. The King reigns but does not rule — no veto. De Wever governs. The 541-day record is the line people remember: use it to explain why the language split makes forming a government so hard.");
}

/* ==============  10 — BRUSSELS, CAPITAL OF EUROPE  [0:40]  ============== */
{
  const s = slide("The capital", "Brussels — capital of Belgium and of Europe");
  const ih = 3.16, iwA = 4.55, iwB = 2.56;
  s.addImage({ path: IMG + "brussels_aerial.jpg", x: M, y: TOP, w: iwA, h: ih, sizing: { type: "cover", w: iwA, h: ih } });
  s.addImage({ path: IMG + "berlaymont.jpg", x: M + iwA + 0.24, y: TOP, w: iwB, h: ih, sizing: { type: "cover", w: iwB, h: ih } });
  txt(s, "Left: Brussels, with the Atomium on the horizon. Right: the Berlaymont, home of the European Commission.", {
    x: M, y: TOP + ih + 0.10, w: iwA + iwB + 0.24, h: 0.4, fontSize: 10, color: MUTE, italic: true,
  });

  const px = 8.15, pw = W - M - px;
  const facts = [
    ["1.25 million people", "in the Brussels-Capital Region; about 2.1 million in the wider area."],
    ["Officially bilingual", "French and Dutch are equal, but about 80 % of residents speak French."],
    ["Capital of the EU", "Home to the European Commission and the Council of the EU."],
    ["NATO headquarters", "Since 1967. Belgium was a founding member of NATO in 1949."],
  ];
  let y = TOP;
  facts.forEach((f) => {
    txt(s, f[0], { x: px, y, w: pw, h: 0.28, fontSize: 13.5, bold: true, color: INK });
    txt(s, f[1], { x: px, y: y + 0.30, w: pw, h: 0.68, fontSize: 11.5, color: BODY, lineSpacingMultiple: 1.05 });
    y += 1.02;
  });

  card(s, M, TOP + 3.96, CW, 1.02, INK);
  txt(s, "TO SEE IN BRUSSELS", { x: M + 0.32, y: TOP + 4.10, w: CW - 0.64, h: 0.24, fontSize: 10, bold: true, charSpacing: 1.2, color: GOLD });
  txt(s, "The Grand-Place, a UNESCO World Heritage site  ·  Manneken Pis  ·  the Atomium  ·  the Magritte Museum  ·  the Belgian Comic Strip Center", {
    x: M + 0.32, y: TOP + 4.38, w: CW - 0.64, h: 0.50, fontSize: 11.5, color: "D2D2DA", lineSpacingMultiple: 1.06,
  });
  s.addNotes("[0:40] The payoff slide. A city of 1.25 million that runs a continent: the European Commission, the Council, and NATO. And it is a French-speaking island inside Dutch-speaking Flanders, which is part of why it works as neutral ground.");
}

/* ====================  11 — ART AND COMICS  [0:35]  ===================== */
{
  const s = slide("Culture", "Painting, comics and music");
  const lw = 7.5;
  const blocks = [
    ["PAINTING", "Jan van Eyck, Pieter Bruegel and Peter Paul Rubens all worked here. In the 20th century René Magritte made Belgian surrealism famous with the painting of a pipe labelled “this is not a pipe”."],
    ["COMICS", "Belgium invented the modern European comic and calls it the ninth art. Tintin, the Smurfs and Lucky Luke are all Belgian. Brussels has a comic museum and a trail of painted murals."],
    ["MUSIC AND FILM", "Adolphe Sax, born in Dinant in 1814, invented the saxophone. The Dardenne brothers have won the top prize at Cannes twice."],
  ];
  let y = TOP;
  blocks.forEach((b) => {
    txt(s, b[0], { x: M, y, w: lw, h: 0.30, fontSize: 13.5, bold: true, charSpacing: 1.1, color: GOLD });
    txt(s, b[1], { x: M, y: y + 0.36, w: lw, h: 1.15, fontSize: 12.5, color: BODY, lineSpacingMultiple: 1.08 });
    y += 1.72;
  });

  const px = M + lw + 0.5, pw = W - M - px;
  photo(s, "antwerp_cathedral.jpg", px, TOP, pw, 2.25, "The Cathedral of Our Lady, Antwerp — it holds four Rubens altarpieces.");
  photo(s, "mannekenpis.jpg", px, TOP + 2.85, pw, 1.75, "Manneken Pis, Brussels — cast in bronze in 1619.");
  s.addNotes("[0:35] Pick two, don't read all three. Best bets: Magritte, because everyone has seen the pipe painting, and Tintin and the Smurfs, because almost nobody knows they are Belgian. Finish with the saxophone.");
}

/* ====================  12 — FOOD AND DRINK  [0:25]  ===================== */
{
  const s = slide("Food and drink", "Four things Belgium is famous for");
  const items = [
    ["chocolate.jpg", "CHOCOLATE", "The filled praline was invented in Brussels in 1912. Belgium has hundreds of chocolate makers."],
    ["waffles.jpg", "WAFFLES", "Two rival kinds: the light Brussels waffle, and the dense Liège waffle made with pearl sugar."],
    ["frites.jpg", "FRIES", "Belgians say they invented them. They fry them twice and serve them in a paper cone with mayonnaise."],
    ["beer.jpg", "BEER", "Over a thousand Belgian beers. UNESCO added Belgian beer culture to its heritage list in 2016."],
  ];
  const cw2 = (CW - 3 * 0.32) / 4, ih = 2.25;
  items.forEach((it, i) => {
    const x = M + i * (cw2 + 0.32);
    s.addImage({ path: IMG + it[0], x, y: TOP, w: cw2, h: ih, sizing: { type: "cover", w: cw2, h: ih } });
    txt(s, it[1], { x, y: TOP + ih + 0.24, w: cw2, h: 0.32, fontSize: 14, bold: true, charSpacing: 1, color: INK });
    txt(s, it[2], { x, y: TOP + ih + 0.60, w: cw2, h: 1.15, fontSize: 11.5, color: BODY, lineSpacingMultiple: 1.06 });
  });

  card(s, M, TOP + 4.14, CW, 0.86, INK);
  txt(s, "Other Belgian dishes: mussels and fries, beef stewed in beer, waterzooi, and speculoos biscuits.", {
    x: M + 0.32, y: TOP + 4.32, w: CW - 0.64, h: 0.50, fontSize: 12, color: "D2D2DA",
  });
  s.addNotes("[0:25] Move fast, the pictures do the work. Two facts: the praline was invented in Brussels in 1912, and Belgian beer culture is on the UNESCO heritage list. The fries-are-Belgian-not-French claim usually gets a laugh.");
}

/* ==================  13 — THREE CITIES TO VISIT  [0:30]  ================ */
{
  const s = slide("Cities to visit", "Three cities worth the trip");
  const cities = [
    ["bruges.jpg", "BRUGES", "Called the Venice of the North. The whole historic centre is a UNESCO World Heritage site — medieval brick houses, canals and a famous belfry."],
    ["ghent.jpg", "GHENT", "A working city rather than a museum. A medieval castle, guild houses along the river, and van Eyck's Ghent Altarpiece in the cathedral."],
    ["antwerp_station.jpg", "ANTWERP", "Rubens' city and Belgium's port. Its central station is called the railway cathedral, and over 70 % of the world's rough diamonds pass through here."],
  ];
  const cw2 = (CW - 2 * 0.42) / 3, ih = 2.7;
  cities.forEach((c, i) => {
    const x = M + i * (cw2 + 0.42);
    s.addImage({ path: IMG + c[0], x, y: TOP, w: cw2, h: ih, sizing: { type: "cover", w: cw2, h: ih } });
    txt(s, c[1], { x, y: TOP + ih + 0.26, w: cw2, h: 0.32, fontSize: 15, bold: true, charSpacing: 1, color: INK });
    txt(s, c[2], { x, y: TOP + ih + 0.64, w: cw2, h: 1.4, fontSize: 11.5, color: BODY, lineSpacingMultiple: 1.06 });
  });
  txt(s, "Belgium has 13 UNESCO World Heritage sites in a country the size of Maryland.", {
    x: 1.28, y: TOP + 4.72, w: CW - 0.58, h: 0.3, fontSize: 11.5, italic: true, color: MUTE,
  });
  s.addNotes("[0:30] Bruges is the postcard, Ghent is the one locals prefer, Antwerp is the working city. The diamond figure — over 70 % of the world's rough diamonds — is the one that lands.");
}

/* ==================  14 — VISITING BELGIUM  [0:25]  ==================== */
{
  const s = slide("Visitor information", "What a visitor needs to know");
  const info = [
    ["1", "MONEY", "The euro. Cards work almost everywhere, and tipping is not expected."],
    ["2", "GETTING IN", "Belgium is in the Schengen area. Americans can stay 90 days without a visa. Fly into Brussels."],
    ["3", "GETTING AROUND", "One of the densest rail networks in the world — almost nowhere is more than two hours away."],
    ["4", "LANGUAGE", "French in the south and in Brussels, Dutch in the north. English is widely spoken in cities."],
    ["5", "WHEN TO GO", "May to September for the weather, December for the Christmas markets. Bring a raincoat."],
    ["6", "DON'T MISS", "The Grand-Place at night, a canal boat in Bruges, and fries from a street stand."],
  ];
  const cw2 = (CW - 0.4) / 2;
  info.forEach((it, i) => {
    const x = M + (i % 2) * (cw2 + 0.4), y = TOP + Math.floor(i / 2) * 1.28;
    badge(s, x, y + 0.04, 0.48, it[0]);
    txt(s, it[1], { x: x + 0.68, y: y + 0.02, w: cw2 - 0.68, h: 0.30, fontSize: 13.5, bold: true, charSpacing: 1, color: INK });
    txt(s, it[2], { x: x + 0.68, y: y + 0.36, w: cw2 - 0.68, h: 0.72, fontSize: 11.5, color: BODY, lineSpacingMultiple: 1.06 });
  });

  const by = TOP + 4.02;
  s.addImage({ path: IMG + "dinant.jpg", x: M, y: by, w: CW, h: 0.82, sizing: { type: "cover", w: CW, h: 0.82 } });
  txt(s, "Dinant, on the Meuse river — the birthplace of Adolphe Sax.", {
    x: 1.28, y: by + 0.90, w: CW - 0.58, h: 0.3, fontSize: 10.5, color: MUTE, italic: true,
  });
  s.addNotes("[0:25] Fastest slide in the deck — do not read the boxes. Say three things: no visa for 90 days, the trains reach everything in two hours, and which language you open with matters. Then move on.");
}

/* ===========  15 — BELGIUM AND THE FRENCH-SPEAKING WORLD  [0:30]  ======= */
{
  n++;
  const s = pres.addSlide();
  s.background = { color: INK };
  s.addImage({ path: IMG + "grandplace.jpg", x: 0, y: 0, w: W, h: H, sizing: { type: "cover", w: W, h: H }, transparency: 78 });

  txt(s, "BELGIUM AND THE FRENCH-SPEAKING WORLD", { x: M, y: 0.62, w: CW, h: 0.3, fontSize: 11.5, bold: true, charSpacing: 2.2, color: GOLD });
  txt(s, "A French-speaking country at the centre of Europe", { x: M, y: 0.98, w: CW, h: 0.6, fontSize: 31, bold: true, color: WHITE, fontFace: SERIF });

  const blocks = [
    ["4.5 million", "Belgians speak French as their first language — about 40 % of the country, living in Wallonia and Brussels."],
    ["2 seats", "Belgium helped found the international organisation of French-speaking countries, and holds two seats in it."],
    ["Different French", "Belgians say septante for 70 and nonante for 90, where France says soixante-dix and quatre-vingt-dix."],
  ];
  const cw2 = (CW - 2 * 0.4) / 3;
  blocks.forEach((b, i) => {
    const x = M + i * (cw2 + 0.4);
    s.addShape(pres.ShapeType.roundRect, { x, y: 2.05, w: cw2, h: 2.10, rectRadius: 0.09, fill: { color: INK2, transparency: 12 }, line: { color: "42424E", width: 1 } });
    txt(s, b[0], { x: x + 0.28, y: 2.28, w: cw2 - 0.56, h: 0.6, fontSize: 25, bold: true, color: GOLD, fontFace: SERIF });
    txt(s, b[1], { x: x + 0.28, y: 2.94, w: cw2 - 0.56, h: 1.1, fontSize: 11.5, color: "CFCFD8", lineSpacingMultiple: 1.06 });
  });

  txt(s, "Belgian French has its own words: un GSM for a mobile phone, une drache for a downpour, un kot for a student room.", {
    x: M, y: 4.45, w: CW, h: 0.4, fontSize: 12.5, color: "D6D6DE",
  });

  s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.20, w: CW, h: 1.18, rectRadius: 0.09, fill: { color: GOLD } });
  txt(s, "Belgium is where Germanic and Latin Europe meet. It is a small, young country that has learned to hold three languages and six parliaments together — and it houses the capital of Europe while doing it.", {
    x: M + 0.36, y: 5.40, w: CW - 0.72, h: 0.85, fontSize: 13.5, bold: true, color: INK, lineSpacingMultiple: 1.08,
  });
  chrome(s, true);
  s.addNotes("[0:30] Close here. Read the gold box out loud — that is the thesis of the whole presentation. Then stop and take questions.");
}

/* =======================  16 — SOURCES  [0:05]  ========================= */
{
  const s = slide("Sources", "Where these facts come from");
  const src = [
    ["belgium.be", "The Belgian government's official portal — history, regions and institutions."],
    ["monarchie.be", "The Belgian Monarchy — the King's role and duties."],
    ["premier.be", "Office of the Prime Minister — the current federal government."],
    ["european-union.europa.eu", "European Union country profile: Belgium."],
    ["whc.unesco.org", "UNESCO World Heritage Centre — Belgium's listed sites and its beer culture."],
    ["Britannica  ·  CIA World Factbook", "Population, area, borders and geography."],
    ["visitflanders.com  ·  visitwallonia.be", "Official tourist boards — visitor information."],
  ];
  src.forEach((r, i) => {
    const y = TOP + i * 0.62;
    badge(s, M, y + 0.02, 0.36, String(i + 1));
    txt(s, r[0], { x: M + 0.54, y: y + 0.02, w: 4.4, h: 0.30, fontSize: 12.5, bold: true, color: INK });
    txt(s, r[1], { x: M + 5.0, y: y + 0.02, w: CW - 5.0, h: 0.4, fontSize: 12, color: BODY });
  });
  txt(s, "Photographs licensed from Adobe Stock. Both maps were drawn from the blank outline map supplied with the assignment; language boundaries are approximate.", {
    x: 1.28, y: TOP + 4.62, w: CW - 0.58, h: 0.5, fontSize: 10.5, color: MUTE, italic: true, lineSpacingMultiple: 1.06,
  });
  s.addNotes("[0:05] Leave this up during questions. Slide timings add up to about 9 minutes 15, leaving buffer in a 10-minute slot.");
}

pres.writeFile({ fileName: __dirname + "/Belgium_FREN201_English.pptx" }).then((f) => console.log("wrote", f, "—", n, "slides"));
