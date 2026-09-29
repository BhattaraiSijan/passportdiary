# Design directions

Three directions, all running in the real app. Open one with `?design=1`, `?design=2` or
`?design=3`, or use the small switcher in the bottom-left corner (`Now 1 2 3`). The choice is
kept in localStorage. Without a parameter and with nothing stored, the app shows the design it
had before, unchanged.

Shared by all three:

- Primary colour is a mid blue leaning dark, secondary a mid green leaning light.
- Every surface has a 1px edge. Nothing is borderless, nothing is heavy.
- No panel exists before a passport is chosen.
- The passport field is on the centre line of the page. It is larger on the start screen and
  settles to its normal size once a passport is chosen.
- The globe is sized from the free space that is actually left (`src/map/frame.ts`), so it is
  as large as the layout allows and stays on the centre line.
- Phones get one column: header, globe, then key, list or detail. An opened country comes
  straight after the globe.

Screenshots are in `design/screens/`, named `<direction>-<wide|laptop|phone>-<state>.png`.

## 1. Visa page

**Concept.** A printed travel document. The start screen is the cover of the passport; choosing
a passport opens it to paper pages. The globe is a plate in the middle with a ruled ring around
it, and the answer for a country is stamped on the page.

**Palette**

| Role | Hex |
|---|---|
| Primary blue (cover, edges, links, figure) | `#21509f` |
| Deep blue | `#173c7c` |
| Ink (text) | `#10264d` |
| Soft ink (secondary text) | `#485a7e` |
| Secondary green (buttons, start ring, cover emblem) | `#6ecb93` |
| Deep green (edges of green) | `#2b8454` |
| Paper background | `#f0f4fa` |
| Page surface | `#ffffff` |
| Hairline | `#ccd7ea` |

Map: sea `#dbe6f6`, home `#10264d`, visa-free `#35a36b`, visa on arrival `#9adbb0`,
ETA `#f0d26b`, eVisa `#8eb2ea`, visa required `#2c5cb0`, no admission `#4a4450`,
no data `#e3e0d8`. Stripes are white. Faint blue lines of latitude and longitude.

The scale runs from green to blue ink, not green to red. A visa is paperwork, not a
prohibition, and for a weak passport a globe that is mostly red reads as "forbidden".
Green and blue also stay apart for people with red-green colour blindness.

**Typefaces.** Besley (headings, wordmark, stamp) and Public Sans (text).

**Layout.** Wordmark centred at the top, passport field centred under it. Two pages of equal
width and equal height on either side of the globe.

**Key and list.** Separate, but mirrored: the left page is the summary and the key, with one
line under each term that says what it means and a bar for its share; the right page is the
list or the opened country. When a country is open the key stays on the left page.

**First visit.** Blue cover, the question in large type, the field with a green ring directly
under it, four one-tap examples, the globe as a green emblem, and a quiet key along the bottom.
After choosing, a tip sits at the foot of the left page.

**Different from the others.** The only light, paper design; the only serif; the only one that
keeps key and list apart; the calm green-to-blue map.

## 2. Departures

**Concept.** Airport wayfinding. A blue sign across the top, a bold globe on a light floor, and
one board under it that holds everything else. The page scrolls; the globe fills the first
screen and the board starts at its foot.

**Palette**

| Role | Hex |
|---|---|
| Primary blue (sign, sea, active key entry) | `#2554a4` |
| Deep blue | `#1a3f85` |
| Ink (text, edges) | `#0e2452` |
| Soft ink | `#46587c` |
| Secondary green (focus, checked control, start ring) | `#74d39b` |
| Deep green | `#2a8a57` |
| Floor background | `#f2f4f8` |
| Surface | `#ffffff` |
| Hairline | `#d3dbea` |

Map: sea `#2554a4`, home `#ffffff`, visa-free `#58c98a`, visa on arrival `#b9ecae`,
ETA `#fbe58c`, eVisa `#f5ae62`, visa required `#e26a5a`, no admission `#2b1f33`,
no data `#93a9d6`. White country lines, dark blue stripes.

This is the familiar green, yellow, red reading, softened (coral, not pure red) so it sits
with the blue. Each step also differs in lightness.

**Typeface.** Archivo, one family. Its width axis does the work: wide for headings, slightly
condensed for the dense list.

**Layout.** Wordmark left in the sign, field centred. Globe centred on a pale disc. Under it a
board as wide as the page: summary line, proportion bar, key, search, then every destination
in columns. Because the page scrolls, the mouse wheel scrolls the page and the globe has
zoom buttons (pinch and ctrl/cmd + wheel still zoom).

**Key and list.** One surface. The key is the head of the board and stays stuck to the top of
the screen while the list scrolls. The proportion bar is summary and key at once. An opened
country is pinned as a card beside the globe, with the key still visible under the globe.

**First visit.** The whole page is the blue sign. The question and the field are in the middle
of the screen, on a large globe drawn tone on tone, so the field is the brightest thing on the
page. When a passport is chosen the globe keeps its place and takes colour.

**Different from the others.** The only one that scrolls; the list is laid out in columns like
a departures board; the conventional colour reading.

## 3. Night flight

**Concept.** The earth from a window seat at night. The globe is the page and everything else
lies over it. The easier a country is to enter, the brighter it is lit.

**Palette**

| Role | Hex |
|---|---|
| Primary blue (globe sea, brand) | `#2a5cb4` family: sea `#14306a`, background `#1d4288` to `#0a1a3c` |
| Secondary green (buttons, figure, active key entry) | `#74dba0` |
| Deep green | `#3fa56d` |
| Text | `#f0f4ff` |
| Soft text | `#b7c6e8` |
| Link blue | `#9cc0ff` |
| Surface | `#0b1b3e` at 97% |
| Edge | white at 34% |

Map: home `#ffffff`, visa-free `#5fe0a0`, visa on arrival `#b4f0b8`, ETA `#f6e58a`,
eVisa `#8fb6ff`, visa required `#4d6db5`, no admission `#0a1226`, no data `#26406f`.
Lightness falls step by step from easy to hard.

**Typefaces.** Bricolage Grotesque (headings, wordmark) and Figtree (text).

**Layout.** Wordmark top left, field centred, globe centred with a glow. One dock centred under
the globe.

**Key and list.** One surface. The dock always shows the summary and the key. "Show all
destinations" opens the list out of the dock, in columns; tapping a country opens its detail
the same way, as one wide band, with the key still in the dock below. When the sheet is open
the globe turns so that the chosen country shows above it. On phones the list is always open.

**First visit.** The top of a very large globe rises from the bottom of the screen; the
question, the field and the examples sit in the dark sky above it.

**Different from the others.** The only dark design; the list is folded away until asked for;
the globe has the most room on wide screens.

## Tips after the first step (all three)

One short tip at a time, inside a surface that is already there:

1. "Tap a country on the globe, or a name in the list, to see what you need to enter."
2. "Tap a colour in the key to show only those countries."
3. "Do you hold two passports? Use 'Compare with another passport' at the top."

A tip goes away for good when the person has done what it says. "Hide tips" removes them all.
Both are remembered in localStorage. There is no tour, no popup and no overlay. A returning
visitor with a remembered passport goes straight to their globe.
