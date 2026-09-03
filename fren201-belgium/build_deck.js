const pptxgen = require("pptxgenjs");
const IMG = __dirname + "/deckimg/";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";                 // 13.333 x 7.5
pres.author = "FREN 201 — Projet Francophonie";
pres.title  = "La Belgique";

const W = 13.333, H = 7.5;

/* ---------------- palette ---------------- */
const INK    = "17171B";
const INK2   = "24242C";
const GOLD   = "E3B23C";
const GOLDL  = "F2D68C";
const RED     = "C1121F";
const WHITE  = "FFFFFF";
const BODY   = "3E3E48";
const MUTE   = "70707C";
const CARD   = "F4F4F6";
const CARDB  = "E4E4E9";
const LMUTE  = "BDBDC6";          // muted text on dark

const SERIF = "Cambria";
const SANS  = "Calibri";

const M = 0.7;                     // page margin
const CW = W - 2 * M;              // 11.933 content width
const TOP = 1.62;                  // top of content band
const BOT = 6.52;                  // bottom of content band

let n = 0;
const sh = () => ({ type: "outer", color: "9A9AA6", blur: 10, offset: 2, angle: 90, opacity: 0.22 });

/* ---------------- chrome ---------------- */
function chrome(s, dark) {
  s.addShape(pres.ShapeType.ellipse, { x: M, y: 6.74, w: 0.42, h: 0.42, fill: { color: GOLD } });
  s.addText(String(n), {
    x: M, y: 6.74, w: 0.42, h: 0.42, fontSize: 12, bold: true, color: INK,
    align: "center", valign: "middle", fontFace: SANS, isTextBox: true, margin: 0,
  });
  s.addText("La Belgique  ·  FREN 201  ·  Projet Francophonie", {
    x: 6.6, y: 6.83, w: W - 6.6 - M, h: 0.26, fontSize: 9, color: dark ? "8A8A96" : MUTE,
    align: "right", fontFace: SANS, isTextBox: true, margin: 0,
  });
}

/* light content slide with kicker + title */
function slide(kicker, title, opts = {}) {
  n++;
  const s = pres.addSlide();
  s.background = { color: opts.bg || WHITE };
  const tw = opts.titleW || CW;
  s.addText(kicker.toUpperCase(), {
    x: M, y: 0.44, w: tw, h: 0.26, fontSize: 11.5, bold: true, charSpacing: 2.2,
    color: GOLD, fontFace: SANS, isTextBox: true, margin: 0,
  });
  s.addText(title, {
    x: M, y: 0.74, w: tw, h: 0.66, fontSize: opts.titleSize || 31, bold: true,
    color: opts.dark ? WHITE : INK, fontFace: SERIF, isTextBox: true, margin: 0,
  });
  chrome(s, !!opts.dark);
  return s;
}

/* rounded card */
function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.09,
    fill: { color: fill || CARD }, line: { color: fill ? fill : CARDB, width: 1 },
    shadow: sh(),
  });
}

/* small gold badge with text */
function badge(s, x, y, d, txt, fill, col) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill || GOLD } });
  s.addText(txt, {
    x, y, w: d, h: d, fontSize: d > 0.5 ? 14 : 11.5, bold: true, color: col || INK,
    align: "center", valign: "middle", fontFace: SANS, isTextBox: true, margin: 0,
  });
}

function txt(s, t, o) {
  s.addText(t, Object.assign({ fontFace: SANS, isTextBox: true, margin: 0, color: BODY }, o));
}

/* bullet list */
function bullets(s, items, o) {
  const runs = items.map((t, i) => ({
    text: t, options: { bullet: true, breakLine: i < items.length - 1 },
  }));
  s.addText(runs, Object.assign({
    fontFace: SANS, isTextBox: true, margin: 0, color: BODY,
    fontSize: 13, lineSpacingMultiple: 1.06, paraSpaceAfter: 7,
  }, o));
}

/* a labelled fact row: bold label + value */
function factRows(s, rows, x, y, w, rowH, labelW, fs) {
  rows.forEach((r, i) => {
    const yy = y + i * rowH;
    txt(s, r[0], { x, y: yy, w: labelW, h: rowH, fontSize: fs || 12, bold: true, color: INK, valign: "top" });
    txt(s, r[1], { x: x + labelW, y: yy, w: w - labelW, h: rowH, fontSize: fs || 12, color: BODY, valign: "top" });
  });
}

/* timeline row: year chip + heading + text */
function tlRow(s, x, y, w, year, head, body, chipW) {
  const cw2 = chipW || 1.15;
  s.addShape(pres.ShapeType.roundRect, {
    x, y: y + 0.03, w: cw2, h: 0.34, rectRadius: 0.06, fill: { color: INK }, line: { color: INK, width: 1 },
  });
  txt(s, year, { x, y: y + 0.03, w: cw2, h: 0.34, fontSize: 11, bold: true, color: GOLD, align: "center", valign: "middle" });
  txt(s, head, { x: x + cw2 + 0.22, y, w: w - cw2 - 0.22, h: 0.28, fontSize: 13.5, bold: true, color: INK });
  txt(s, body, { x: x + cw2 + 0.22, y: y + 0.28, w: w - cw2 - 0.22, h: 0.52, fontSize: 11.5, color: BODY, lineSpacingMultiple: 1.02 });
}

/* photo with caption underneath */
function photo(s, file, x, y, w, h, caption) {
  s.addImage({ path: IMG + file, x, y, w, h, sizing: { type: "cover", w, h } });
  if (caption) txt(s, caption, { x, y: y + h + 0.09, w, h: 0.3, fontSize: 9.5, color: MUTE, italic: true });
}

/* =========================================================================
   1 — TITLE
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

  {
    s.addShape(pres.ShapeType.roundRect, { x: M, y: 4.5, w: 5.6, h: 1.0, rectRadius: 0.09, fill: { color: INK2 }, line: { color: "3A3A44", width: 1 } });
    txt(s, "A French-speaking country in the heart of Europe —", { x: M + 0.28, y: 4.66, w: 5.05, h: 0.3, fontSize: 12, color: LMUTE });
    txt(s, "and the capital of the European Union.", { x: M + 0.28, y: 4.96, w: 5.05, h: 0.3, fontSize: 12, color: LMUTE });
  }

  txt(s, "Nom  ______________________________     Date  ____________________", {
    x: M, y: 6.55, w: 7.2, h: 0.3, fontSize: 11, color: "8A8A96",
  });
  s.addNotes("FREN 201 Francophonie project. Region chosen: Europe. Country: Belgium — a French-speaking country in Western Europe.");
}

/* =========================================================================
   2 — CONTENTS
   ========================================================================= */
{
  const s = slide("Au sommaire", "What this presentation covers");
  const items = [
    ["Où se trouve la Belgique ?", "Location, neighbours and the map"],
    ["La Belgique en chiffres", "The country's identity card"],
    ["Géographie et paysages", "Three landscapes, one small country"],
    ["Régions, communautés, langues", "How one country holds three languages"],
    ["Le nom, hier et aujourd'hui", "From the Belgae to the Kingdom of Belgium"],
    ["Histoire", "Rome, the Habsburgs, France, independence, the wars"],
    ["Statut et alliances", "An independent state at the centre of Europe"],
    ["Organisation politique", "A federal parliamentary constitutional monarchy"],
    ["Le Roi et le gouvernement", "Who leads Belgium today"],
    ["Bruxelles, capitale de l'Europe", "The EU, NATO and a bilingual city"],
    ["Culture et gastronomie", "Painters, comic strips, chocolate and beer"],
    ["Infos pratiques", "What a visitor needs to know"],
  ];
  const colW = 5.7, gap = 0.53, rowH = 0.79;
  items.forEach((it, i) => {
    const c = i < 6 ? 0 : 1, r = i % 6;
    const x = M + c * (colW + gap), y = TOP + r * rowH;
    badge(s, x, y + 0.05, 0.4, String(i + 1));
    txt(s, it[0], { x: x + 0.58, y: y + 0.01, w: colW - 0.58, h: 0.3, fontSize: 13.5, bold: true, color: INK });
    txt(s, it[1], { x: x + 0.58, y: y + 0.31, w: colW - 0.58, h: 0.3, fontSize: 11, color: MUTE });
  });
  s.addNotes("Roadmap of the presentation — every item required by the assignment is covered.");
}

/* =========================================================================
   3 — WHERE IS BELGIUM (the marked map)
   ========================================================================= */
{
  const s = slide("Où se trouve la Belgique ?", "Western Europe, on the North Sea");
  const mw = 6.1, mh = mw / 1.2969;
  s.addImage({ path: IMG + "map_europe_belgium.png", x: M, y: TOP, w: mw, h: mh });
  txt(s, "Belgium marked in red on the blank outline map supplied with the assignment.", {
    x: M, y: TOP + mh + 0.12, w: mw, h: 0.3, fontSize: 9.5, color: MUTE, italic: true,
  });

  const px = 7.32, pw = W - M - px;
  card(s, px, TOP, pw, 2.50);
  txt(s, "LAND BORDERS  ·  1,297 km IN TOTAL", { x: px + 0.28, y: TOP + 0.16, w: pw - 0.56, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  factRows(s, [
    ["France", "556 km — south and south-west"],
    ["Netherlands", "478 km — north"],
    ["Germany", "133 km — east"],
    ["Luxembourg", "130 km — south-east"],
  ], px + 0.28, TOP + 0.48, pw - 0.56, 0.40, 1.42, 11.5);
  txt(s, "Plus 66.5 km of North Sea coastline.", {
    x: px + 0.28, y: TOP + 2.10, w: pw - 0.56, h: 0.3, fontSize: 11, italic: true, color: MUTE,
  });

  card(s, px, TOP + 2.66, pw, 1.32);
  txt(s, "POSITION", { x: px + 0.28, y: TOP + 2.82, w: pw - 0.56, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "About 50° N, 4° E — the crossroads where Germanic northern Europe meets Latin southern Europe. That position made Belgium rich in trade, and made it a battlefield.", {
    x: px + 0.28, y: TOP + 3.12, w: pw - 0.56, h: 0.80, fontSize: 11, color: BODY, lineSpacingMultiple: 1.04,
  });

  card(s, px, TOP + 4.14, pw, 0.88, INK);
  txt(s, "BY TRAIN FROM BRUSSELS", { x: px + 0.28, y: TOP + 4.28, w: pw - 0.56, h: 0.24, fontSize: 10, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "Paris 1 h 25  ·  London 2 h 00  ·  Amsterdam 1 h 50  ·  Cologne 1 h 50", {
    x: px + 0.28, y: TOP + 4.56, w: pw - 0.56, h: 0.3, fontSize: 10, color: "D8D8DE",
  });
  s.addNotes("Assignment requirement: mark the chosen country on a blank map of the region and show what surrounds it. Belgium sits between France, Germany, Luxembourg and the Netherlands, with a short North Sea coast.");
}

/* =========================================================================
   4 — BELGIUM BY THE NUMBERS
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
  s.addImage({ path: IMG + "flag.jpg", x: px, y: y2 + 0.32, w: pw, h: pw / 1.875, sizing: { type: "cover", w: pw, h: pw / 1.875 } });
  txt(s, "The tricolour of 1830 — black, yellow and red, taken from the arms of the Duchy of Brabant.", {
    x: px, y: y2 + 0.44 + pw / 1.875, w: pw, h: 0.55, fontSize: 10, color: MUTE, italic: true,
  });
  card(s, px, y2 + 1.06 + pw / 1.875, pw, 0.80, INK);
  txt(s, "Roughly the land area of Maryland, with twice the people.", {
    x: px + 0.26, y: y2 + 1.24 + pw / 1.875, w: pw - 0.52, h: 0.46, fontSize: 11, color: GOLDL,
  });
  s.addNotes("Key figures. Population 11.8 million; area 30,689 km2 — roughly the size of Maryland.");
}

/* =========================================================================
   5 — GEOGRAPHY
   ========================================================================= */
{
  const s = slide("Géographie et paysages", "Three landscapes in 30,689 km²");
  const lw = 7.0;
  const belts = [
    ["BASSE-BELGIQUE", "Lower Belgium — 0 to 100 m", "A flat coastal plain: 66.5 km of North Sea beaches, polders reclaimed from the sea, canals and the Flemish plain. Nearly all of it is below 50 m."],
    ["MOYENNE-BELGIQUE", "Middle Belgium — 100 to 200 m", "Gently rolling, very fertile loam plateaus. This is the busy, urban heart of the country: Brussels, Hainaut, Brabant and the Hesbaye farmland."],
    ["HAUTE-BELGIQUE", "High Belgium — 200 to 700 m", "The Ardennes: forest, deep river valleys, caves and moorland. The Signal de Botrange, 694 m, is the highest point in the country."],
  ];
  belts.forEach((b, i) => {
    const y = TOP + i * 1.66;
    card(s, M, y, lw, 1.44);
    badge(s, M + 0.26, y + 0.24, 0.42, String(i + 1));
    txt(s, b[0], { x: M + 0.84, y: y + 0.2, w: lw - 1.1, h: 0.28, fontSize: 13.5, bold: true, color: INK });
    txt(s, b[1], { x: M + 0.84, y: y + 0.48, w: lw - 1.1, h: 0.24, fontSize: 10.5, color: GOLD, bold: true });
    txt(s, b[2], { x: M + 0.84, y: y + 0.75, w: lw - 1.1, h: 0.6, fontSize: 11, color: BODY, lineSpacingMultiple: 1.02 });
  });

  const px = M + lw + 0.5, pw = W - M - px;
  photo(s, "meuse_huy.jpg", px, TOP, pw, 2.05, "The Meuse near Huy, Wallonia — one of Belgium's two great rivers, with the Scheldt.");
  photo(s, "burgreuland.jpg", px, TOP + 2.62, pw, 2.05, "Burg-Reuland in the eastern Ardennes — the German-speaking corner of Belgium.");
  s.addNotes("Climate: temperate maritime — mild, grey and wet, about 800 mm of rain a year. Two major rivers: the Scheldt (l'Escaut) and the Meuse.");
}

/* =========================================================================
   6 — REGIONS, COMMUNITIES, LANGUAGES
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
  s.addNotes("Federalisation ran through six state reforms from 1970 onward. Article 1 of the Constitution now reads: Belgium is a federal State composed of Communities and Regions.");
}

/* =========================================================================
   7 — THE NAME
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
}

/* =========================================================================
   8 — HISTORY I
   ========================================================================= */
{
  const s = slide("Histoire I  ·  57 av. J.-C. – 1794", "From Rome to the Habsburgs");
  const rows = [
    ["57 BC", "Rome conquers the Belgae", "Caesar defeats the Belgic tribes. The land becomes the Roman province of Gallia Belgica and stays Roman for four centuries."],
    ["5th c.", "The Franks", "Roman rule collapses and Frankish kingdoms take over. The Merovingians and then the Carolingians rule from the Meuse valley — Charlemagne's family heartland."],
    ["11th–14th c.", "The cloth cities", "Bruges, Ghent and Ypres grow rich weaving English wool. Bruges becomes one of the great trading ports of Europe. Power sits with the County of Flanders, the Duchy of Brabant and the Prince-Bishopric of Liège."],
    ["1384–1477", "The Burgundian Netherlands", "The Dukes of Burgundy unite the Low Countries. Under Philip the Good, Flemish painting has its golden age — Jan van Eyck finishes the Ghent Altarpiece in 1432."],
    ["1477–1794", "The Habsburgs", "The territory passes to the Habsburgs: the Spanish Netherlands from 1556, then the Austrian Netherlands from 1714. The Dutch Revolt (1568–1648) splits the Protestant north away from the Catholic south — the origin of the border between Belgium and the Netherlands today."],
  ];
  const ws = CW;
  let y = TOP;
  rows.forEach((r, i) => {
    const h = i >= 2 ? 1.14 : 0.9;
    tlRow(s, M, y, ws, r[0], r[1], r[2], 1.35);
    y += h - 0.05;
  });
  s.addNotes("The key takeaway: for nearly 2,000 years this land was ruled from somewhere else — Rome, Burgundy, Madrid, Vienna, Paris, The Hague. Independence in 1830 is very recent.");
}

/* =========================================================================
   9 — HISTORY II
   ========================================================================= */
{
  const s = slide("Histoire II  ·  1795 – 1839", "From France to independence", { titleW: 6.6 });
  s.addImage({ path: IMG + "waterloo.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.55, w: W - 7.35, h: 1.95, fill: { color: INK, transparency: 12 } });
  txt(s, "THE LION'S MOUND, WATERLOO", { x: 7.7, y: 5.82, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "Raised on the battlefield 15 km south of Brussels where Napoleon was finally defeated on 18 June 1815 — on what was not yet Belgian soil.", {
    x: 7.7, y: 6.14, w: 5.2, h: 1.0, fontSize: 11, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });

  const lw = 6.35;
  const rows = [
    ["1795", "Annexed by France", "Revolutionary France annexes the Austrian Netherlands and divides it into départements. French becomes the language of law and administration — a legacy that has never gone away."],
    ["1815", "Waterloo, then the Dutch", "Napoleon is beaten at Waterloo. The great powers hand the territory to the Dutch, creating the United Kingdom of the Netherlands under William I."],
    ["1830", "Revolution in Brussels", "On 25 August a performance of the opera La Muette de Portici sets off riots. Dutch troops are driven out on 27 September, and on 4 October a provisional government declares independence."],
    ["1831", "A king and a constitution", "A strikingly liberal constitution is adopted on 7 February. On 21 July Leopold of Saxe-Coburg is sworn in as Leopold I, first King of the Belgians — still the national day."],
    ["1839", "Recognised at last", "The Treaty of London: the Netherlands finally accepts Belgian independence, and the powers guarantee Belgium's permanent neutrality."],
  ];
  rows.forEach((r, i) => tlRow(s, M, TOP + i * 0.99, lw, r[0], r[1], r[2], 0.95));
}

/* =========================================================================
   10 — HISTORY III
   ========================================================================= */
{
  const s = slide("Histoire III  ·  1885 – aujourd'hui", "Empire, war, and federalism", { titleW: 6.6 });
  s.addImage({ path: IMG + "ypres_menin.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.55, w: W - 7.35, h: 1.95, fill: { color: INK, transparency: 12 } });
  txt(s, "THE MENIN GATE, YPRES", { x: 7.7, y: 5.82, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "A memorial to 54,000 missing soldiers of the Ypres Salient. The Last Post has been sounded here every evening since 1928.", {
    x: 7.7, y: 6.14, w: 5.2, h: 1.0, fontSize: 11, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });

  const lw = 6.35;
  const rows = [
    ["1885", "The Congo Free State", "King Leopold II takes the Congo as his personal possession. His regime's forced labour and violence cause enormous suffering; international outcry forces Belgium to take the colony over from him in 1908."],
    ["1914–18", "Neutrality broken", "Germany invades neutral Belgium. The Western Front settles into Flanders: Ypres, Passchendaele, the Yser. The poppies of Flanders Fields become the symbol of remembrance."],
    ["1940–45", "Occupied again", "A second German occupation. The last great German offensive of the war, the Battle of the Bulge, is fought in the Ardennes in the winter of 1944–45."],
    ["1960–62", "Decolonisation", "The Congo becomes independent on 30 June 1960; Rwanda and Burundi follow on 1 July 1962. In 2020 King Philippe expressed his “deepest regrets” for the wounds of the colonial past."],
    ["1970–2014", "Six state reforms", "Tension between Dutch and French speakers is answered by rebuilding the country from the inside. Six reforms turn a unitary state into the federation Belgium is today."],
  ];
  rows.forEach((r, i) => tlRow(s, M, TOP + i * 0.99, lw, r[0], r[1], r[2], 1.05));
}

/* =========================================================================
   11 — STATUS
   ========================================================================= */
{
  const s = slide("Statut", "Independent since 1830", { titleW: 7.4 });
  const lw = 7.2;
  card(s, M, TOP, lw, 1.5, INK);
  txt(s, "INDEPENDENT — NOT A TERRITORY OF ANY OTHER COUNTRY", { x: M + 0.3, y: TOP + 0.24, w: lw - 0.6, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "Belgium declared independence on 4 October 1830 and has been a fully sovereign state ever since, recognised internationally by the Treaty of London in 1839. It is not, and has never been, a French overseas territory — it simply shares France's language.", {
    x: M + 0.3, y: TOP + 0.58, w: lw - 0.6, h: 0.85, fontSize: 11.5, color: "D4D4DC", lineSpacingMultiple: 1.05,
  });

  txt(s, "FROM NEUTRALITY TO ALLIANCE", { x: M, y: TOP + 1.78, w: lw, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.2, color: GOLD });
  txt(s, "The 1839 treaty made Belgium permanently neutral. Germany violated that neutrality in 1914 and again in 1940. After the Second World War Belgium abandoned neutrality for good and helped build the alliances that replaced it.", {
    x: M, y: TOP + 2.1, w: lw, h: 0.85, fontSize: 11.5, color: BODY, lineSpacingMultiple: 1.05,
  });

  const mem = [
    ["1944", "Benelux", "Customs union with the Netherlands and Luxembourg — a rehearsal for European integration."],
    ["1945", "United Nations", "A founding member."],
    ["1949", "NATO", "A founding member; the alliance's headquarters moved to Brussels in 1967."],
    ["1951 / 1957", "The European Union", "Founding member of the Coal and Steel Community and then, by the Treaty of Rome, of the EEC."],
    ["1999", "The eurozone", "A founding member of the single currency."],
    ["1970", "La Francophonie", "A founding member — with two seats, the Kingdom and the French Community."],
  ];
  const cw2 = (lw - 0.3) / 2;
  mem.forEach((m, i) => {
    const x = M + (i % 2) * (cw2 + 0.3), y = TOP + 3.12 + Math.floor(i / 2) * 0.62;
    txt(s, m[0] + "  ·  " + m[1], { x, y, w: cw2, h: 0.24, fontSize: 11.5, bold: true, color: INK });
    txt(s, m[2], { x, y: y + 0.23, w: cw2, h: 0.36, fontSize: 10, color: MUTE, lineSpacingMultiple: 1.0 });
  });

  const px = M + lw + 0.45, pw = W - M - px;
  photo(s, "berlaymont.jpg", px, TOP, pw, 3.2, null);
  txt(s, "The Berlaymont in Brussels — headquarters of the European Commission, and the reason Brussels is called the capital of Europe.", {
    x: px, y: TOP + 3.32, w: pw, h: 0.8, fontSize: 10.5, color: MUTE, italic: true, lineSpacingMultiple: 1.05,
  });
  card(s, px, TOP + 4.2, pw, 0.72, INK);
  txt(s, "A founding member of both the EU and NATO — and the host of both.", {
    x: px + 0.24, y: TOP + 4.34, w: pw - 0.48, h: 0.5, fontSize: 11, bold: true, color: GOLDL, lineSpacingMultiple: 1.0,
  });
}

/* =========================================================================
   12 — POLITICAL ORGANISATION (diagram)
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
  s.addNotes("Article 1 of the Constitution: Belgium is a federal State composed of Communities and Regions. Six state reforms: 1970, 1980, 1988-89, 1993, 2001 and 2011-14.");
}

/* =========================================================================
   13 — THE KING
   ========================================================================= */
{
  const s = slide("Le Roi Philippe", "Head of State since 21 July 2013", { titleW: 6.4 });
  s.addImage({ path: IMG + "royalpalace.jpg", x: 7.35, y: 0, w: W - 7.35, h: H, sizing: { type: "cover", w: W - 7.35, h: H } });
  s.addShape(pres.ShapeType.rect, { x: 7.35, y: 5.7, w: W - 7.35, h: 1.8, fill: { color: INK, transparency: 12 } });
  txt(s, "THE ROYAL PALACE, BRUSSELS", { x: 7.7, y: 5.96, w: 5.2, h: 0.28, fontSize: 11, bold: true, charSpacing: 1.4, color: GOLD });
  txt(s, "The King's official workplace. The royal family actually lives at Laeken, on the edge of the city.", {
    x: 7.7, y: 6.28, w: 5.2, h: 0.8, fontSize: 11, color: "E2E2E8", lineSpacingMultiple: 1.05,
  });
  const rows = [
    ["Full title", "Philippe, Roi des Belges — King of the Belgians, the seventh since 1831"],
    ["House", "Saxe-Coburg and Gotha — the dynasty founded by Leopold I in 1831"],
    ["Accession", "21 July 2013, when his father Albert II abdicated for health reasons"],
    ["Born", "15 April 1960, Brussels. Married to Queen Mathilde; four children"],
    ["Heir", "Princess Elisabeth, Duchess of Brabant — Belgium's first reigning queen, under absolute primogeniture since 1991"],
    ["Languages", "Dutch, French, German, English, Italian and Spanish"],
  ];
  factRows(s, rows, M, TOP + 0.06, 6.2, 0.56, 1.35, 11.5);

  card(s, M, TOP + 3.68, 6.2, 1.30, INK);
  txt(s, "WHAT THE KING CAN AND CANNOT DO", { x: M + 0.28, y: TOP + 3.84, w: 5.65, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "He appoints the government, signs laws and royal decrees, is commander-in-chief and represents Belgium abroad — but he has no veto and no personal policy. His real influence is quiet: appointing the negotiators who assemble a coalition, and holding the country together when its two language groups cannot agree.", {
    x: M + 0.28, y: TOP + 4.14, w: 5.65, h: 0.78, fontSize: 10.5, color: "D2D2DA", lineSpacingMultiple: 1.04,
  });
}

/* =========================================================================
   14 — THE GOVERNMENT
   ========================================================================= */
{
  const s = slide("Le gouvernement fédéral", "Who governs Belgium today");
  card(s, M, TOP, 6.1, 2.05, INK);
  txt(s, "PREMIER MINISTRE  ·  PRIME MINISTER", { x: M + 0.32, y: TOP + 0.24, w: 5.46, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "Bart De Wever", { x: M + 0.32, y: TOP + 0.56, w: 5.46, h: 0.62, fontSize: 32, bold: true, color: WHITE, fontFace: SERIF });
  txt(s, "Sworn in on 3 February 2025. Leader of the New Flemish Alliance (N-VA) and the first Flemish nationalist ever to head the Belgian federal government.", {
    x: M + 0.32, y: TOP + 1.24, w: 5.46, h: 0.7, fontSize: 11, color: "C4C4CE", lineSpacingMultiple: 1.05,
  });

  const px = M + 6.4, pw = W - M - px;
  card(s, px, TOP, pw, 2.05);
  txt(s, "“L'ARIZONA” — THE COALITION", { x: px + 0.3, y: TOP + 0.24, w: pw - 0.6, h: 0.26, fontSize: 10.5, bold: true, charSpacing: 1.1, color: GOLD });
  txt(s, "Five parties, named after the colours of the Arizona flag:", { x: px + 0.3, y: TOP + 0.56, w: pw - 0.6, h: 0.26, fontSize: 11, color: MUTE });
  txt(s, "N-VA  ·  MR  ·  Les Engagés  ·  Vooruit  ·  CD&V", { x: px + 0.3, y: TOP + 0.86, w: pw - 0.6, h: 0.3, fontSize: 13, bold: true, color: INK });
  txt(s, "Three Flemish parties and two French-speaking ones. Deputy prime ministers include Jan Jambon, David Clarinval, Maxime Prévot, Frank Vandenbroucke and Vincent Van Peteghem.", {
    x: px + 0.3, y: TOP + 1.22, w: pw - 0.6, h: 0.72, fontSize: 10.5, color: BODY, lineSpacingMultiple: 1.03,
  });

  const y2 = TOP + 2.23;
  const st = [
    ["150", "seats in the Chamber of Representatives, elected by proportional representation"],
    ["5", "parties needed to form the current federal majority"],
    ["8", "months of negotiation after the June 2024 election before a government was sworn in"],
    ["541", "days without an elected government in 2010–11 — a world record at the time"],
  ];
  const sw = (CW - 3 * 0.3) / 4;
  st.forEach((x0, i) => {
    const x = M + i * (sw + 0.3);
    card(s, x, y2, sw, 1.68);
    txt(s, x0[0], { x: x + 0.15, y: y2 + 0.16, w: sw - 0.3, h: 0.66, fontSize: 36, bold: true, color: RED, fontFace: SERIF, align: "center" });
    txt(s, x0[1], { x: x + 0.22, y: y2 + 0.86, w: sw - 0.44, h: 0.74, fontSize: 10.5, color: BODY, align: "center", lineSpacingMultiple: 1.03 });
  });

  card(s, M, y2 + 1.84, CW, 0.86, INK);
  txt(s, "Why coalitions are so hard: Belgian parties do not compete nationally. Voters in Flanders and voters in Wallonia choose from two entirely separate sets of parties, so a federal majority must always be negotiated across the language border.", {
    x: M + 0.32, y: y2 + 2.0, w: CW - 0.64, h: 0.58, fontSize: 10.5, color: "D2D2DA", lineSpacingMultiple: 1.05,
  });
}

/* =========================================================================
   15 — BRUSSELS
   ========================================================================= */
{
  const s = slide("Bruxelles", "The capital of Belgium — and of Europe");
  const iw = 7.35, ih = 3.16;
  photo(s, "brussels_aerial.jpg", M, TOP, iw, ih, "Brussels from the Koekelberg basilica. The Atomium, built for the 1958 World's Fair, is visible on the horizon.");

  const px = M + iw + 0.45, pw = W - M - px;
  const facts = [
    ["1.25 million", "people in the Brussels-Capital Region; about 2.1 million in the wider metropolitan area."],
    ["Officially bilingual", "French and Dutch have equal status. In practice around 80 % of residents speak French — a French-speaking region surrounded by Flanders."],
    ["Capital of the EU", "Home to the European Commission, the Council of the EU and part of the European Parliament."],
    ["NATO headquarters", "Since 1967."],
  ];
  let y = TOP;
  facts.forEach((f) => {
    txt(s, f[0], { x: px, y, w: pw, h: 0.26, fontSize: 12.5, bold: true, color: INK });
    txt(s, f[1], { x: px, y: y + 0.26, w: pw, h: 0.80, fontSize: 10.5, color: BODY, lineSpacingMultiple: 1.03 });
    y += 1.00;
  });

  card(s, M, TOP + 3.96, CW, 1.02, INK);
  txt(s, "WHAT TO SEE", { x: M + 0.32, y: TOP + 4.10, w: CW - 0.64, h: 0.24, fontSize: 10, bold: true, charSpacing: 1.2, color: GOLD });
  txt(s, "The Grand-Place, a UNESCO World Heritage site since 1998 and one of the most complete baroque squares in Europe  ·  Manneken Pis  ·  the Art Nouveau town houses of Victor Horta, also UNESCO  ·  the Atomium  ·  the Royal Museums of Fine Arts and the Magritte Museum  ·  the Belgian Comic Strip Center", {
    x: M + 0.32, y: TOP + 4.38, w: CW - 0.64, h: 0.50, fontSize: 10.5, color: "D2D2DA", lineSpacingMultiple: 1.06,
  });
}

/* =========================================================================
   16 — CULTURE I
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
}

/* =========================================================================
   17 — FOOD
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
}

/* =========================================================================
   18 — CITIES OF ART
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
}

/* =========================================================================
   19 — VISITOR INFORMATION
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
}

/* =========================================================================
   20 — FRANCOPHONIE / CONCLUSION
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
  s.addNotes("Conclusion: Belgium's identity is built on being a meeting point rather than a single nation.");
}

/* =========================================================================
   21 — SOURCES
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
}

pres.writeFile({ fileName: __dirname + "/La_Belgique_FREN201.pptx" }).then((f) => console.log("wrote", f, "—", n, "slides"));
