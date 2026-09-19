# The two styles

## flat

Slate and one amber accent, outline icons, no fills. This is readmerlin's current look, and it is exactly what the seed renderer draws today for the two readmerlin goldens; their output must not change by a byte.

Use `flat` when the tool's world has no pun to draw. A tool named for what it does rather than what it evokes (readmerlin gathering and checking a README, tidy-inbox sorting mail) has no harbour, no anchor, no boat waiting inside its name. Reaching for a scene anyway produces a rocket or a magic wand: a borrowed world, not the product's own. Stay flat.

## chart

Parchment with grain and a vignette, faint rhumb lines and a compass rose top right, a few depth soundings, two gulls top left, three wave bands with ink crests along the bottom, a sailboat flying signal flags, rope links (solid rope colour under a darker dashed twist) tied through brass grommets, the hub in navy with a brass rim inside a coiled rope, a Georgia stack for headline, titles and italic subtitles, one handwritten aside, and hand-drawn wobble on outlines. Dark mode swaps parchment for night blue, sun for moon and stars, and lightens brass and rope.

Use `chart` when the name itself gives a world to draw, the way pierless's name gave a harbour: a pier, an anchor, water. The scene has to be the product's own pun, not a decoration added after the fact. A rocket or a magic wand is still not allowed even in `chart`; if the name doesn't supply the scene, the scene doesn't belong.

## What survives from the eight old decisions, and what was relaxed

An earlier pass fixed eight style decisions: one accent colour, one line weight, nothing filled, no scene, no gradients, one light style. The owner walked most of that back on pierless, one explicit ask at a time: prettier and colourful, then more expressive and editorialised, then background elements and texture, then whimsy and natural texture, then "more nautical harbour handmade than harbour craftbook".

Survives, in both styles:
- Recognition over abstraction. A real merge button, a real anchor, a real boat. Never an icon with a caption standing in for a concept.
- Feature text in a legible face at legible size. A hand font is for one aside only, because the handwriting stack falls back differently on every machine.
- One meaning per colour within the picture: each card, its icon, its rope and its grommet share one theme colour.
- Wide and short. The pierless hero is 820 by 500.
- Light and dark from one file, via CSS classes under `prefers-color-scheme: dark`, including `display: none` swaps such as sun by day, moon and stars by night.
- Every label fits its card, checked by measurement (`text/fits` in `scripts/check.mjs`), not by eye.

Relaxed, for `chart` only:
- Colour per item, in muted tones: navy, sea green, ochre, plum on parchment. Bright pastels read as a scrapbook, not as this style.
- Fills, gradients, drop shadows, grain and a vignette are allowed.
- A scene is allowed, but only when the scene is the name's own pun, as above.
- Hand-drawn wobble on every outline, via `feTurbulence` plus `feDisplacementMap` at scale 2.4.

## Handmade, not craftbook

The line between the two took one full pass to find, and it is the line `chart` has to stay on.

Handmade: an inked chart, twisted rope, brass, a serif face, muted sea tones, a single handwritten note.

Craftbook: washi tape, sticky notes, rounded pastel cards, cute captions, gulls near the title.

Adult, not cute. When a draft in `chart` starts to look like a scrapbook page, it has drifted toward craftbook; pull it back toward ink, brass and rope.

## Palette, light then dark

| Element | Light | Dark |
| --- | --- | --- |
| parchment | `#f3ead3` | `#122036` |
| ink | `#1f2d45` | `#ece3cc` |
| muted | `#6b5d48` | `#a6b3c8` |
| brass | `#a8741f` | `#e0b562` |
| rope | `#a67c45` with twist `#6e4e27` | `#cfa66a` with twist `#8a6a3c` |
| hub | `#1f3a66`, rimmed brass | `#1f3a66`, rimmed brass |
| card theme: navy | `#2b4a7e` | `#8fb4ff` |
| card theme: sea | `#2f7d6d` | `#6fd1b9` |
| card theme: ochre | `#b7791f` | `#f0c064` |
| card theme: plum | `#7a3b69` | `#d69ad0` |
| waves | `#d3dfdc`, `#a9c3c4`, `#7ea3ab` | `#1b3252`, `#1f3d63`, `#254a78` |

Type: a Georgia stack for the headline, titles and subtitles; system-ui for the merge button; a Bradley Hand stack for the one aside.
