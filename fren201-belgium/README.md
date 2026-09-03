# FREN 201 — Projet Francophonie : La Belgique

`La_Belgique_FREN201.pptx` — a 21-slide presentation on Belgium, built for the
FREN 201 Francophonie assignment (region chosen: Europe).

## What the assignment asked for, and where it is

| Requirement | Slide |
|---|---|
| Country marked on a blank map of the region, with its surroundings | 3 |
| Location | 3, 5 |
| Name — former and current | 7 |
| Status (independent or not) | 4, 11 |
| History | 8, 9, 10 |
| Culture | 16, 17, 18 |
| Visitor information | 18, 19 |
| Political organisation (democracy/dictatorship, monarchy/republic) | 12 |
| Leadership (king, prime minister) | 13, 14 |
| Minimum 15 slides | 21 slides |

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
node build_deck.js           # writes La_Belgique_FREN201.pptx
```

`build_deck.js` expects the photographs in `deckimg/`. They are licensed Adobe
Stock images and are not committed here; the deck ships with them embedded.

## Sources

Slide 21 lists them: belgium.be, monarchie.be, premier.be, european-union.europa.eu,
whc.unesco.org, diplomatie.belgium.be, Britannica, the CIA World Factbook, and the
Flemish, Brussels and Walloon tourist boards.
