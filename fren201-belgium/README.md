# FREN 201 — Projet Francophonie : La Belgique

Two versions of the same presentation on Belgium, built for the FREN 201
Francophonie assignment (region chosen: Europe).

| File | Slides | Use |
|---|---|---|
| `La_Belgique_FREN201.pptx` | 16 | **The one to present.** Speaker notes carry a per-slide target time; they total 9:15, leaving buffer in a 10-minute slot. |
| `La_Belgique_FREN201_long.pptx` | 21 | The fuller version — separate slides for geography, status, the contents page, and three history slides instead of two. |

Both are above the assignment's 15-slide minimum. Both are written in English;
only section labels and Belgian proper nouns are in French.

## What the assignment asked for, and where it is

Slide numbers below are for the 16-slide version.

| Requirement | Slide |
|---|---|
| Country marked on a blank map of the region, with its surroundings | 2 |
| Location | 2 |
| Name — former and current | 5 |
| Status (independent or not) | 3 |
| History | 6, 7 |
| Culture | 11, 12, 13 |
| Visitor information | 13, 14 |
| Political organisation (democracy/dictatorship, monarchy/republic) | 8 |
| Leadership (king, prime minister) | 9 |
| Minimum 15 slides | 16 slides |

## Maps

Both maps are derived from `Blank_maps.docx`, the blank outline maps supplied with
the assignment.

- `map_europe_belgium.png` — the blank Europe map with Belgium filled in red and
  its neighbours, the North Sea and the English Channel labelled. Built by
  `make_map.py` (flood-fills the country polygons in the original outline).
- `map_belgium_regions.png` — Belgium's three regions and three communities,
  traced from the same outline. Built by `make_regions.py`. The language frontier
  and the German-speaking community boundary are approximate and labelled as such.

## Rebuilding

```
npm install pptxgenjs
pip install Pillow
python3 make_map.py          # writes img/map_europe_belgium.png
python3 make_regions.py      # writes img/map_belgium_regions.png
node build_deck.js           # writes La_Belgique_FREN201.pptx (16 slides)
node build_deck_long.js      # writes La_Belgique_FREN201_long.pptx (21 slides)
```

`build_deck.js` concatenates a shared helper block with `slides_short.js`. Both
build scripts expect the photographs in `deckimg/`. They are licensed Adobe
Stock images and are not committed here; the deck ships with them embedded.

## Sources

Slide 21 lists them: belgium.be, monarchie.be, premier.be, european-union.europa.eu,
whc.unesco.org, diplomatie.belgium.be, Britannica, the CIA World Factbook, and the
Flemish, Brussels and Walloon tourist boards.
