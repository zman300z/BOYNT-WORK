const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const gi = require("react-icons/gi");

const C = {
  brown: "3B2418",   // dark chocolate
  butter: "8A5A2B",  // brown butter
  gold: "C8963E",    // golden crust
  almond: "F6EEE2",  // card tint
  ink: "2A1D15",
  muted: "6E5A4B",
  white: "FFFFFF",
};
const HEAD = "Cambria", BODY = "Calibri";

async function icon(Comp, color, size = 256) {
  const svg = RDS.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// Icon inside a filled circle
async function circleIcon(slide, Comp, x, y, d, bg, fg) {
  slide.addShape("ellipse", { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg } });
  const pad = d * 0.25;
  slide.addImage({ data: await icon(Comp, fg), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad });
}

function title(slide, text, color = C.brown, sub) {
  slide.addText(text, { x: 0.6, y: 0.4, w: 12.1, h: 0.8, fontFace: HEAD, fontSize: 38, bold: true, color, margin: 0, isTextBox: true });
  if (sub) slide.addText(sub, { x: 0.6, y: 1.15, w: 12.1, h: 0.45, fontFace: BODY, fontSize: 16, italic: true, color: C.muted, margin: 0, isTextBox: true });
}

// A little "gold bar" financier drawn with shapes
function financier(slide, x, y, w, h) {
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.08, fill: { color: C.gold }, line: { color: C.butter, width: 1.5 },
    shadow: { type: "outer", color: "000000", opacity: 0.35, blur: 6, offset: 3, angle: 90 } });
  slide.addShape("roundRect", { x: x + w * 0.08, y: y + h * 0.15, w: w * 0.84, h: h * 0.35, rectRadius: 0.05, fill: { color: "E0B566" }, line: { color: "E0B566" } });
}

const fs = require("fs");
const path = require("path");
const PHOTO_DIR = process.env.PHOTO_DIR || path.join(__dirname, "photos");
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

// Adds a photo (cropped to fill the frame) if photos/<key>.jpg|png exists,
// otherwise a labelled placeholder image the user can swap via "Change Picture".
async function photo(slide, key, x, y, w, h, label, opts = {}) {
  const px = 150, W = Math.round(w * px), H = Math.round(h * px);
  const file = [".jpg", ".jpeg", ".png"].map((e) => path.join(PHOTO_DIR, key + e)).find((f) => fs.existsSync(f));
  let buf;
  if (file) {
    buf = await sharp(file).resize(W, H, { fit: "cover", position: "attention" }).jpeg({ quality: 85 }).toBuffer();
  } else {
    const cam = RDS.renderToStaticMarkup(React.createElement(fa.FaCamera, { color: "#" + C.gold, size: Math.min(W, H) * 0.28 }));
    const fs_ = Math.max(16, Math.min(34, W / 24));
    const text = W > 200 ? `<text x="${W / 2}" y="${H / 2 + Math.min(W, H) * 0.24}" font-family="Arial" font-size="${fs_}" font-weight="bold" fill="#${C.butter}" text-anchor="middle">${esc("Photo: " + label)}</text>` : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="${opts.round ? Math.min(W, H) / 2 : 18}" fill="#${C.almond}" stroke="#${C.gold}" stroke-width="6" stroke-dasharray="18 12"/>` +
      `<g fill="#${C.gold}" transform="translate(${W / 2 - Math.min(W, H) * 0.14},${H / 2 - Math.min(W, H) * (text ? 0.22 : 0.14)})">${cam.replace(/^<svg[^>]*>/, "<svg>").replace("<svg>", `<svg width="${Math.min(W, H) * 0.28}" height="${Math.min(W, H) * 0.28}" viewBox="0 0 576 512">`)}</g>${text}</svg>`;
    buf = await sharp(Buffer.from(svg)).png().toBuffer();
  }
  const mime = file ? "image/jpeg" : "image/png";
  slide.addImage({ data: `${mime};base64,` + buf.toString("base64"), x, y, w, h, rounding: !!opts.round, altText: label });
  if (opts.caption) slide.addText(opts.caption, { x, y: y + h + 0.08, w, h: 0.3, fontFace: BODY, fontSize: 11, italic: true, color: opts.captionColor || C.muted, margin: 0, isTextBox: true });
  return !!file;
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = "Petits Financiers";

  // 1. Title
  let s = pres.addSlide();
  s.background = { color: C.brown };
  await photo(s, "financiers_hero", 8.0, 0, 5.333, 7.5, "a plate of financiers");
  s.addText("Petits Financiers", { x: 0.7, y: 2.0, w: 7.2, h: 1.3, fontFace: HEAD, fontSize: 54, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText("The little golden almond cakes of France", { x: 0.7, y: 3.3, w: 7.0, h: 0.6, fontFace: HEAD, fontSize: 22, italic: true, color: C.gold, margin: 0, isTextBox: true });
  s.addText("History  ·  How & when they're eaten  ·  Recipe  ·  Ingredients & tools  ·  Method", { x: 0.7, y: 4.4, w: 6.8, h: 0.8, fontFace: BODY, fontSize: 15, color: "E8DCCB", margin: 0, isTextBox: true });
  s.addNotes("Petits financiers are small French cakes made with almond flour, egg whites, sugar and brown butter. Today we'll cover their history, when French people eat them, the recipe, and how to make them.");

  // 2. History timeline
  s = pres.addSlide();
  s.background = { color: C.white };
  title(s, "A Brief History", C.brown, "From a convent kitchen to the Paris stock exchange");
  const events = [
    ["1600s", "Nancy, Lorraine", "Nuns of the Order of the Visitation bake small almond cakes called \"visitandines\" — a way to use up leftover egg whites.", gi.GiChurch],
    ["1890", "Paris", "Pastry chef Lasne, whose shop was near the Paris Bourse (stock exchange), reshapes the cake into a small rectangle.", gi.GiCakeSlice],
    ["The name", "\"Financier\"", "Shaped like a gold bar, it was sold to bankers and stockbrokers — a clean snack eaten by hand without soiling suits.", gi.GiGoldBar],
    ["Today", "Everywhere", "A classic of French pâtisserie, sold in bakeries and cafés and made in countless flavours.", fa.FaStore],
  ];
  const tx0 = 0.6, tw = 12.1 / 4;
  s.addShape("line", { x: tx0 + 0.55, y: 2.55, w: 12.1 - tw + 0.0, h: 0, line: { color: C.gold, width: 3 } });
  for (let i = 0; i < events.length; i++) {
    const [yr, place, txt, ic] = events[i];
    const x = tx0 + i * tw;
    await circleIcon(s, ic, x + 0.05, 2.05, 1.0, C.brown, C.gold);
    s.addText(yr, { x, y: 3.25, w: tw - 0.3, h: 0.55, fontFace: HEAD, fontSize: 24, bold: true, color: C.butter, margin: 0, isTextBox: true });
    s.addText(place, { x, y: 3.8, w: tw - 0.3, h: 0.4, fontFace: BODY, fontSize: 15, bold: true, color: C.ink, margin: 0, isTextBox: true });
    s.addText(txt, { x, y: 4.3, w: tw - 0.35, h: 2.2, fontFace: BODY, fontSize: 14, color: C.muted, valign: "top", margin: 0, isTextBox: true });
  }
  s.addText("Fun fact: brown butter (beurre noisette) is what gives financiers their nutty, toasty flavour.", { x: 0.6, y: 6.55, w: 12.1, h: 0.4, fontFace: BODY, fontSize: 13, italic: true, color: C.butter, margin: 0, isTextBox: true });
  s.addNotes("The ancestor of the financier is the visitandine, made by Visitation nuns in Nancy in the 1600s. Around 1890 the Parisian pastry chef Lasne, near the stock exchange, made them rectangular like gold bars, and the busy financiers who bought them gave the cake its name.");

  // 2b. Where it comes from — photos of the places
  s = pres.addSlide();
  s.background = { color: C.brown };
  s.addText("Where It Comes From", { x: 0.6, y: 0.4, w: 12.1, h: 0.8, fontFace: HEAD, fontSize: 38, bold: true, color: C.white, margin: 0, isTextBox: true });
  s.addText("Two French cities shaped the financier", { x: 0.6, y: 1.15, w: 12.1, h: 0.45, fontFace: BODY, fontSize: 16, italic: true, color: C.gold, margin: 0, isTextBox: true });
  const places = [
    ["nancy", "Nancy, Lorraine (north-east France)", "Place Stanislas, Nancy", "Birthplace of the visitandine, the almond cake baked by Visitation nuns in the 1600s."],
    ["paris_bourse", "Paris — the Bourse", "Palais Brongniart, the old Paris stock exchange", "Where chef Lasne sold the gold-bar-shaped cakes to bankers around 1890."],
  ];
  for (let i = 0; i < places.length; i++) {
    const [key, head, cap, txt] = places[i];
    const x = 0.6 + i * 6.2;
    await photo(s, key, x, 1.9, 5.9, 3.3, head, { caption: cap, captionColor: "E8DCCB" });
    s.addText(head, { x, y: 5.6, w: 5.9, h: 0.45, fontFace: HEAD, fontSize: 20, bold: true, color: C.gold, margin: 0, isTextBox: true });
    s.addText(txt, { x, y: 6.1, w: 5.9, h: 0.8, fontFace: BODY, fontSize: 14, color: C.white, valign: "top", margin: 0, isTextBox: true });
  }
  s.addNotes("Financiers trace back to two places: Nancy in Lorraine, where the Visitation nuns made visitandines, and the Paris stock exchange district, where they got their gold-bar shape and name.");

  // 3. How and when eaten
  s = pres.addSlide();
  s.background = { color: C.white };
  title(s, "How & When They're Eaten", C.brown, "A small cake for many moments of the French day");
  const moments = [
    [fa.FaClock, "Le goûter", "The 4 o'clock afternoon snack — especially popular with children after school."],
    [fa.FaCoffee, "With coffee or tea", "Served alongside an espresso or a cup of tea in cafés and at home."],
    [gi.GiCupcake, "Petits fours", "Part of the tray of mignardises (tiny sweets) served at the end of a restaurant meal."],
    [fa.FaGift, "Gifts & celebrations", "Boxed as gifts, served at parties, weddings and buffets."],
    [fa.FaWalking, "On the go", "Bought from a boulangerie and eaten by hand — no plate or fork needed."],
    [fa.FaThermometerHalf, "How to serve", "At room temperature, ideally the day they're baked: crisp golden edges, soft moist centre."],
  ];
  const cw = 3.85, ch = 1.5;
  for (let i = 0; i < moments.length; i++) {
    const [ic, h, t] = moments[i];
    const x = 0.6 + (i % 2) * (cw + 0.25), y = 1.9 + Math.floor(i / 2) * (ch + 0.2);
    s.addShape("roundRect", { x, y, w: cw, h: ch, rectRadius: 0.12, fill: { color: C.almond }, line: { color: C.almond } });
    await circleIcon(s, ic, x + 0.2, y + 0.2, 0.6, C.brown, C.gold);
    s.addText(h, { x: x + 0.95, y: y + 0.2, w: cw - 1.1, h: 0.6, fontFace: HEAD, fontSize: 17, bold: true, color: C.brown, valign: "middle", margin: 0, isTextBox: true });
    s.addText(t, { x: x + 0.2, y: y + 0.85, w: cw - 0.4, h: 0.6, fontFace: BODY, fontSize: 12, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  }
  await photo(s, "financiers_coffee", 8.75, 1.9, 3.98, 4.7, "financiers with coffee", { caption: "Financiers with an afternoon coffee" });
  s.addNotes("Financiers are eaten at goûter (afternoon snack), with coffee or tea, as petits fours after a meal, and as gifts. They're best at room temperature on the day they're baked.");

  // 4. Recipe card (the physical recipe)
  s = pres.addSlide();
  s.background = { color: C.brown };
  s.addShape("roundRect", { x: 0.6, y: 0.45, w: 12.1, h: 6.6, rectRadius: 0.15, fill: { color: C.white }, line: { color: C.gold, width: 2 },
    shadow: { type: "outer", color: "000000", opacity: 0.4, blur: 10, offset: 4, angle: 90 } });
  s.addText("Recipe Card: Petits Financiers", { x: 1.0, y: 0.7, w: 8.0, h: 0.7, fontFace: HEAD, fontSize: 32, bold: true, color: C.brown, margin: 0, isTextBox: true });
  const stats = [["12", "financiers"], ["15 min", "prep"], ["12–15 min", "bake"], ["200°C", "400°F oven"]];
  for (let i = 0; i < stats.length; i++) {
    const x = 1.0 + i * 1.95;
    s.addText(stats[i][0], { x, y: 1.45, w: 1.8, h: 0.5, fontFace: HEAD, fontSize: 22, bold: true, color: C.gold, margin: 0, isTextBox: true });
    s.addText(stats[i][1], { x, y: 1.93, w: 1.8, h: 0.3, fontFace: BODY, fontSize: 12, color: C.muted, margin: 0, isTextBox: true });
  }
  s.addText("Ingredients", { x: 1.0, y: 2.5, w: 4.4, h: 0.45, fontFace: HEAD, fontSize: 20, bold: true, color: C.butter, margin: 0, isTextBox: true });
  const ing = [
    "125 g (½ cup + 1 tbsp) unsalted butter",
    "100 g (1 cup) almond flour",
    "50 g (⅓ cup) plain flour",
    "150 g (1¼ cups) powdered sugar",
    "4 large egg whites (about 120 g)",
    "1 pinch of salt",
    "½ tsp vanilla extract (optional)",
    "Topping: flaked almonds or raspberries (optional)",
  ];
  s.addText(ing.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < ing.length - 1 } })),
    { x: 1.0, y: 3.0, w: 4.6, h: 3.8, fontFace: BODY, fontSize: 14, color: C.ink, paraSpaceAfter: 6, valign: "top", margin: 0, isTextBox: true });
  s.addText("Method", { x: 6.1, y: 2.5, w: 6.2, h: 0.45, fontFace: HEAD, fontSize: 20, bold: true, color: C.butter, margin: 0, isTextBox: true });
  const meth = [
    "Brown the butter until nutty and golden; strain and let cool slightly.",
    "Heat oven to 200°C / 400°F. Butter the moulds.",
    "Sift the almond flour, flour, powdered sugar and salt into a bowl.",
    "Stir in the egg whites (unwhipped) until smooth.",
    "Whisk in the warm brown butter (and vanilla).",
    "Rest the batter 30 min in the fridge (optional).",
    "Fill moulds ¾ full; add toppings.",
    "Bake 12–15 min until golden at the edges. Cool 5 min, unmould.",
  ];
  s.addText(meth.map((t, i) => ({ text: t, options: { bullet: { type: "number" }, breakLine: i < meth.length - 1 } })),
    { x: 6.1, y: 3.0, w: 6.2, h: 3.8, fontFace: BODY, fontSize: 14, color: C.ink, paraSpaceAfter: 6, valign: "top", margin: 0, isTextBox: true });
  await circleIcon(s, gi.GiCookingPot, 11.3, 0.8, 1.0, C.brown, C.gold);
  s.addNotes("This slide is the full printable recipe. The next slides go through the ingredients, tools and each step in detail.");

  // 5. Ingredients explained
  s = pres.addSlide();
  s.background = { color: C.white };
  title(s, "The Ingredients", C.brown, "Only six basic ingredients — each one has a job");
  const ingr = [
    [fa.FaFire, "Brown butter", "125 g", "Butter cooked until the milk solids toast. Gives the signature nutty flavour."],
    [gi.GiAlmond, "Almond flour", "100 g", "Finely ground almonds. Makes the cake moist, rich and tender."],
    [gi.GiWheat, "Plain flour", "50 g", "A small amount holds the cake together."],
    [fa.FaCubes, "Powdered sugar", "150 g", "Sweetens and helps create the crisp, caramelised crust."],
    [fa.FaEgg, "Egg whites", "4 large", "Bind everything. Only whites are used — no yolks, no whisking needed."],
    [gi.GiSaltShaker, "Salt & vanilla", "pinch / ½ tsp", "Balance the sweetness and round out the flavour."],
  ];
  const ingKeys = ["butter", "almond_flour", "flour", "powdered_sugar", "egg_whites", "salt_vanilla"];
  for (let i = 0; i < ingr.length; i++) {
    const [ic, name, qty, desc] = ingr[i];
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.2, y = 1.95 + row * 1.65;
    await photo(s, ingKeys[i], x, y + 0.05, 1.05, 1.05, name, { round: true });
    s.addText([
      { text: name, options: { bold: true, color: C.brown, fontFace: HEAD, fontSize: 19 } },
      { text: "   " + qty, options: { color: C.butter, fontSize: 15, bold: true } },
    ], { x: x + 1.2, y: y + 0.05, w: 4.7, h: 0.45, fontFace: BODY, margin: 0, isTextBox: true });
    s.addText(desc, { x: x + 1.2, y: y + 0.52, w: 4.7, h: 0.85, fontFace: BODY, fontSize: 14, color: C.ink, valign: "top", margin: 0, isTextBox: true });
  }
  s.addNotes("Financiers use almond flour, a little plain flour, powdered sugar, egg whites and brown butter. The brown butter is the key flavour.");

  // 6. Tools
  s = pres.addSlide();
  s.background = { color: C.almond };
  title(s, "The Tools You Need", C.brown, "Standard kitchen equipment — plus one special mould");
  // featured tool
  s.addShape("roundRect", { x: 0.6, y: 1.95, w: 4.3, h: 4.9, rectRadius: 0.15, fill: { color: C.brown }, line: { color: C.brown } });
  // draw a mould: tray with rectangular cavities
  await photo(s, "financier_mould", 1.0, 2.3, 3.5, 2.0, "financier mould");
  s.addText("Financier mould", { x: 1.0, y: 4.5, w: 3.5, h: 0.5, fontFace: HEAD, fontSize: 21, bold: true, color: C.gold, margin: 0, isTextBox: true });
  s.addText("A tray of small rectangular \"gold bar\" cavities. No mould? A mini-muffin tin or small silicone moulds work too.", { x: 1.0, y: 5.05, w: 3.5, h: 1.6, fontFace: BODY, fontSize: 14, color: C.white, valign: "top", margin: 0, isTextBox: true });
  const tools = [
    [fa.FaBalanceScale, "Kitchen scale", "For accurate measuring"],
    [gi.GiCookingPot, "Small saucepan", "Light-coloured, to see the butter brown"],
    [fa.FaFilter, "Fine sieve", "Sift dry ingredients & strain butter"],
    [gi.GiWhisk, "Whisk & bowl", "To mix the batter"],
    [fa.FaPaintBrush, "Pastry brush", "To butter the moulds"],
    [fa.FaFillDrip, "Piping bag or spoon", "To fill the moulds neatly"],
    [gi.GiKitchenKnives, "Spatula", "Scrape the bowl, loosen the cakes"],
    [fa.FaThLarge, "Cooling rack & oven", "Bake at 200°C, then cool"],
  ];
  for (let i = 0; i < tools.length; i++) {
    const [ic, n, d] = tools[i];
    const col = i % 2, row = Math.floor(i / 2);
    const x = 5.35 + col * 3.7, y = 1.95 + row * 1.25;
    await circleIcon(s, ic, x, y, 0.8, C.brown, C.gold);
    s.addText(n, { x: x + 0.95, y: y + 0.02, w: 2.65, h: 0.4, fontFace: BODY, fontSize: 16, bold: true, color: C.brown, margin: 0, isTextBox: true });
    s.addText(d, { x: x + 0.95, y: y + 0.4, w: 2.65, h: 0.55, fontFace: BODY, fontSize: 13, color: C.muted, valign: "top", margin: 0, isTextBox: true });
  }
  s.addNotes("The only special tool is the rectangular financier mould. Everything else is basic: scale, saucepan, sieve, whisk and bowl, pastry brush, piping bag, spatula, cooling rack and an oven.");

  // 7-8. Step-by-step method
  const steps = [
    ["Brown the butter", "Melt the butter in a small pan over medium heat. Keep cooking 5–7 min, swirling, until it foams, smells nutty and turns golden-brown. Strain and let cool until just warm.", gi.GiFire],
    ["Prepare the oven & moulds", "Preheat to 200°C / 400°F. Brush the moulds with soft butter so the cakes release easily.", fa.FaPaintBrush],
    ["Mix the dry ingredients", "Sift the almond flour, plain flour, powdered sugar and salt into a bowl to remove lumps.", fa.FaFilter],
    ["Add the egg whites", "Pour in the egg whites and stir with a whisk until smooth. Don't beat them to foam — just combine.", fa.FaEgg],
    ["Add the brown butter", "Slowly pour in the warm brown butter (and vanilla), whisking until the batter is glossy.", gi.GiWhisk],
    ["Rest the batter", "Chill for 30 minutes (or up to overnight). This gives a better rise and texture.", fa.FaClock],
    ["Fill & top", "Spoon or pipe the batter into the moulds about ¾ full. Add flaked almonds or a raspberry if you like.", fa.FaFillDrip],
    ["Bake & cool", "Bake 12–15 min until the edges are golden and the tops spring back. Cool 5 min, then unmould onto a rack.", fa.FaCheck],
  ];
  for (let part = 0; part < 2; part++) {
    s = pres.addSlide();
    s.background = { color: C.white };
    title(s, `How to Make Them (${part + 1}/2)`, C.brown, part === 0 ? "Steps 1–4: brown butter and batter base" : "Steps 5–8: finish, fill and bake");
    for (let j = 0; j < 4; j++) {
      const k = part * 4 + j;
      const [h, t, ic] = steps[k];
      const x = 0.6 + j * 3.1, y = 1.95;
      s.addShape("roundRect", { x, y, w: 2.85, h: 4.9, rectRadius: 0.12, fill: { color: C.almond }, line: { color: C.almond } });
      s.addShape("ellipse", { x: x + 0.25, y: y + 0.3, w: 0.8, h: 0.8, fill: { color: C.brown }, line: { color: C.brown } });
      s.addText(String(k + 1), { x: x + 0.25, y: y + 0.3, w: 0.8, h: 0.8, fontFace: HEAD, fontSize: 26, bold: true, color: C.gold, align: "center", valign: "middle", margin: 0, isTextBox: true });
      s.addImage({ data: await icon(ic, C.gold), x: x + 1.85, y: y + 0.4, w: 0.65, h: 0.65 });
      s.addText(h, { x: x + 0.25, y: y + 1.3, w: 2.4, h: 0.8, fontFace: HEAD, fontSize: 18, bold: true, color: C.brown, valign: "top", margin: 0, isTextBox: true });
      s.addText(t, { x: x + 0.25, y: y + 2.15, w: 2.4, h: 2.6, fontFace: BODY, fontSize: 14, color: C.ink, valign: "top", margin: 0, isTextBox: true });
    }
    s.addNotes(steps.slice(part * 4, part * 4 + 4).map((st, j) => `Step ${part * 4 + j + 1}: ${st[0]}. ${st[1]}`).join(" "));
  }

  // 9. Tips & variations
  s = pres.addSlide();
  s.background = { color: C.white };
  title(s, "Tips & Variations", C.brown);
  s.addShape("roundRect", { x: 0.6, y: 1.5, w: 5.8, h: 5.3, rectRadius: 0.12, fill: { color: C.almond }, line: { color: C.almond } });
  await circleIcon(s, fa.FaLightbulb, 0.95, 1.8, 0.75, C.brown, C.gold);
  s.addText("Baker's tips", { x: 1.9, y: 1.8, w: 4.2, h: 0.75, fontFace: HEAD, fontSize: 22, bold: true, color: C.brown, valign: "middle", margin: 0, isTextBox: true });
  const tips = [
    "Watch the butter closely — it goes from brown to burnt in seconds.",
    "Leftover yolks? Use them for crème brûlée or custard.",
    "Don't overfill the moulds; the cakes puff up in the oven.",
    "Store in an airtight box for 2–3 days, or freeze for a month.",
  ];
  s.addText(tips.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < tips.length - 1 } })),
    { x: 0.95, y: 2.8, w: 5.1, h: 3.8, fontFace: BODY, fontSize: 15, color: C.ink, paraSpaceAfter: 10, valign: "top", margin: 0, isTextBox: true });
  const vlist = [
    [gi.GiRaspberry, "Raspberry", "A fresh raspberry pressed into each cake"],
    [gi.GiChocolateBar, "Chocolate", "Add cocoa powder or chocolate chips"],
    [fa.FaLeaf, "Pistachio or matcha", "Swap some almond flour for pistachio or add matcha"],
    [gi.GiLemon, "Citrus", "Add lemon or orange zest to the batter"],
  ];
  for (let i = 0; i < vlist.length; i++) {
    const [ic, n, d] = vlist[i];
    const y = 1.5 + i * 1.35;
    await circleIcon(s, ic, 6.9, y + 0.1, 0.9, C.gold, C.brown);
    s.addText(n, { x: 8.0, y: y + 0.08, w: 4.7, h: 0.45, fontFace: HEAD, fontSize: 19, bold: true, color: C.brown, margin: 0, isTextBox: true });
    s.addText(d, { x: 8.0, y: y + 0.52, w: 4.7, h: 0.5, fontFace: BODY, fontSize: 14, color: C.muted, margin: 0, isTextBox: true });
  }
  s.addNotes("A few tips for success and popular flavour variations.");

  // 10. Closing
  s = pres.addSlide();
  s.background = { color: C.brown };
  await photo(s, "financiers_closing", 0, 0, 13.333, 7.5, "financiers in a bakery window");
  s.addShape("rect", { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.brown, transparency: 25 }, line: { color: C.brown, transparency: 100 } });
  s.addText("Bon appétit !", { x: 0.6, y: 2.7, w: 12.1, h: 1.2, fontFace: HEAD, fontSize: 60, bold: true, color: C.white, align: "center", margin: 0, isTextBox: true });
  s.addText("Simple ingredients, a little brown butter, and a slice of French history in every bite.", { x: 1.5, y: 4.1, w: 10.3, h: 0.6, fontFace: HEAD, fontSize: 20, italic: true, color: C.gold, align: "center", margin: 0, isTextBox: true });
  s.addText("Questions?", { x: 0.6, y: 5.4, w: 12.1, h: 0.5, fontFace: BODY, fontSize: 18, color: "E8DCCB", align: "center", margin: 0, isTextBox: true });

  await pres.writeFile({ fileName: process.argv[2] });
})();
