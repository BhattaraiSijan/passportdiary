# Design

PassportDiary has one design. This page says what it is made of, so that changes stay
consistent. Screenshots are in `docs/screens/`; make them again with `npm run screens`
(dev server running on port 5183: `npx vite --port 5183 --strictPort`).

## Concept

A travel document. The ground is the blue cloth of a passport cover. On it lie two white
pages and, between them, the globe as a printed plate: an ink rim, a white hairline and a ring
of tick marks. The answer for a country is stamped on the page.

## Interface colours

Tokens are at the top of `src/styles.css`.

| Role | Value |
|---|---|
| Ground, centre (light behind the globe) | `#2a5fb5` |
| Ground, middle: the primary blue | `#1f4e9c` |
| Ground, edges | `#143468` |
| Primary blue on white (links, the big figure) | `#21509f` |
| Ink (text on white, edge of the pages, rim of the plate) | `#10264d` |
| Soft ink (secondary text on white) | `#485a7e` |
| Secondary green (accent on blue: focus ring, chosen option, ring of the start field) | `#6ecb93` |
| Deep green (edge of green) | `#2b8454` |
| Text on the ground | `#ffffff`, secondary `#dfe8fa` |
| Hairline on the ground | white at 42% |
| Pages | `#ffffff` |
| Hairline on white | `#ccd7ea` |
| Note where sources disagree | text `#6b4a00` on `#f7f9fd`, edge `#d9a93a` |

The ground is a radial gradient, `#2a5fb5` at the centre, `#1f4e9c` at 46%, `#143468` at the
edges, centred a little below the middle. Up to 1100px wide it is a vertical gradient of the
same colours. Every surface has a 1px edge. Pages and notes are white or cool white; there are
no cream or yellow fills.

## Globe colours

All in `src/map/palette.ts`.

| What | Value | Lightness L* |
|---|---|---|
| Sea | `#3a7cc2` | 51 |
| Home country | `#ffffff` | 100 |
| Visa-free | `#35a36b` | 60 |
| Visa on arrival | `#b2dc74` | 83 |
| Travel authorisation (ETA) | `#f4d655` | 86 |
| eVisa | `#e1802b` | 63 |
| Visa required | `#c12c27` | 43 |
| No admission | `#3a1f24` | 16 |
| No data | `#c4c1b8` | 78 |
| Start screen: land | `#6ecb93` | 75 |

The scale runs from green (nothing to arrange) through light green, yellow and orange to red
(a visa from an embassy), then to a very dark brown-red for no admission. The home country is
white and "no data" is a neutral grey; neither belongs to the scale.

Country lines are ink `#10264d` at 50%, 0.5px. Lines of latitude and longitude are white at
16%. The hovered or selected country has a white outline. Dots for tiny countries have an ink
edge. Where sources disagree, the country has stripes made of a white line beside an ink
line, so they show on the light colours and on the dark ones.

On the start screen the sea is the same blue and all land is the brand green, so the sea
does not change colour when a passport is chosen.

Compare mode, "where they differ", uses colours that are in neither the scale nor the sea, so
"easier with Nepal" cannot be read as a level of restriction:

| What | Value | L* |
|---|---|---|
| Easier with the first passport | `#47217d` | 23 |
| Easier with the second passport | `#ee7fb6` | 67 |
| Same for both | `#eeece6` | 93 |

### The stamp

Type and lines on white use a darker ink of each colour (`CATEGORY_INKS`). Contrast on white:

| Category | Ink | Contrast |
|---|---|---|
| Home country | `#21509f` | 7.74 |
| Visa-free | `#1f7446` | 5.76 |
| Visa on arrival | `#47761c` | 5.42 |
| ETA | `#7a5a00` | 6.38 |
| eVisa | `#9a4f0b` | 6.00 |
| Visa required | `#b02a22` | 6.56 |
| No admission | `#3a1f24` | 14.99 |
| No data | `#55514a` | 7.89 |

## Measured contrast

WCAG contrast ratio. Text needs 4.5, large text and non-text 3.

| Pair | Ratio |
|---|---|
| White text on the lightest ground `#2a5fb5` | 6.17 |
| White text on `#1f4e9c` | 7.99 |
| Secondary text `#dfe8fa` on `#2a5fb5` | 5.01 |
| Ink on green (chosen option) | 7.56 |
| Soft ink on white | 6.91 |
| Blue on white | 7.74 |
| Note text on its ground | 7.65 |
| Green focus ring on `#2a5fb5` | 3.12 |
| Sea against the rim of the plate | 3.44 |
| Sea against the ground behind it | 1.42 |

Each colour of the globe against the sea. The second figure is the colour difference
(CIE76 ΔE; above 20 is plainly different), as seen with full colour vision, with
deuteranopia and with protanopia (simulated after Machado et al., 2009).

| Colour | Contrast with sea | ΔE normal / deutan / protan |
|---|---|---|
| Home country | 4.34 | 65 / 69 / 61 |
| Visa-free | 1.36 | 79 / 64 / 67 |
| Visa on arrival | 2.76 | 100 / 96 / 97 |
| ETA | 3.01 | 114 / 116 / 114 |
| eVisa | 1.51 | 106 / 107 / 97 |
| Visa required | 1.32 | 100 / 91 / 70 |
| No admission | 3.46 | 58 / 59 / 56 |
| No data | 2.41 | 55 / 59 / 51 |
| Easier with first | 2.72 | 46 / 25 / 30 |
| Easier with second | 1.72 | 60 / 46 / 23 |
| Same for both | 3.67 | 63 / 66 / 59 |

Neighbours in the scale:

| Pair | Contrast | ΔE normal / deutan / protan |
|---|---|---|
| Visa-free, visa on arrival | 2.03 | 37 / 36 / 34 |
| Visa on arrival, ETA | 1.09 | 33 / 21 / 17 |
| ETA, eVisa | 1.99 | 43 / 22 / 29 |
| eVisa, visa required | 2.00 | 38 / 24 / 37 |
| Visa required, no admission | 2.61 | 64 / 52 / 35 |
| Visa-free, visa required | 1.81 | 105 / 30 / 28 |
| Visa-free, eVisa | 1.11 | 85 / 44 / 30 |

### Colour blindness, and the weak points

Lightness does not fall in one line from easy to hard: a green-to-red scale cannot do that
and still have a green that reads as green. The pattern is: visa on arrival and ETA are light
(L* 83, 86), visa-free and eVisa are mid (60, 63), visa required is dark (43), no admission
darker still (16). Green and red differ by 17 points of lightness.

Known weak points:

- **Visa on arrival and ETA** are the closest pair (ΔE 17 with protanopia). They differ in
  hue, light green against yellow, and hardly in lightness. ETA is rare (2 of 198
  destinations for Nepal).
- **Visa-free and visa required** with red-green colour blindness: ΔE 28 to 30, carried mostly
  by lightness. They can be told apart, but not at a glance as with full colour vision.
- **Visa-free, eVisa and visa required against the sea** have little difference in lightness
  (contrast 1.3 to 1.5). They are separated by hue, which is far from blue, and by the ink
  country lines.
- **The sea against the ground** is only a little lighter (1.42). The ink rim with its white
  hairline is what makes the globe a separate object.
- A selected home country has a white outline on a white fill, so the outline does not show.

Colour is never the only carrier: the key gives a count and a line of explanation for every
colour, and the list and the detail page say the same in words.

## Typeface

Inter (variable), for everything. Headings differ by weight and size only: 750 for the name,
the start-screen question, the big figure and the stamp; 700 for headings on the pages.
Large type has negative letter-spacing (-0.035em for the question, -0.04em for the figure).
Counts and days use tabular numerals.

## Layout

- **From 1101px wide:** the map fills the whole page. The header, the footer and two pages of
  equal size lie over it. Left page: summary, key, tip. Right page: the list of destinations,
  or one opened country. `frame()` in `src/map/frame.ts` measures everything marked with
  `data-frame` and gives the globe the space that is left, on the centre line of the page.
- **821 to 1100px:** the globe on top, the two pages side by side below it.
- **Up to 820px:** one column: header, globe, then the pages. An opened country comes
  straight after the globe.

The name is centred at the top (top left on the start screen of wide screens). The passport
field is on the centre line of the page. Key and list stay on two pages, mirrored; when a
country is open, the key stays on the left page.

## Start screen

Shown until a passport is chosen. Returning visitors, whose passport is remembered, do not see
it. It has the question, one sentence, and the passport field, larger here and with a green
ring. A very large globe rises from the bottom edge, and the key "The colours you will see"
lies over its foot. There are no pages, no dialog and nothing to close. When a passport is
chosen, the globe glides to its place between the pages (from 1101px wide; it jumps with
reduced motion).

The way back: the name PassportDiary is a button ("PassportDiary, start over"). It clears both
passports, the comparison, the filter and the opened country, and forgets the remembered
passport. The small × in each passport field empties that field; in the first field it does
the same as the name.

## Tips

One tip at a time, at the foot of the left page:

1. Tap a country on the globe, or a name in the list, to see what you need to enter.
2. Tap a colour in the key to show only those countries.
3. Do you hold two passports? Use "Compare with another passport" at the top.

A tip goes away for good once the person has done what it says. "Hide tips" removes them
all. Both are remembered, also after starting over.
