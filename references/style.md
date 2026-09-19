# The two styles

## flat

Slate and one amber accent, outline icons, no fills. This is readmerlin's current look, and it is exactly what the seed renderer draws today for the two readmerlin goldens; their output must not change by a byte.

Use `flat` only for compatibility: when a hero already renders flat and must not move, such as readmerlin's and tidy-inbox's goldens. Flat is not the default and not a first choice. A new hero never lands here just because no world came to mind; it is only for the case where the bytes already exist and have to stay put.

## chart

Parchment with grain and a vignette, faint rhumb lines and a compass rose top right, a few depth soundings, two gulls top left, three wave bands with ink crests along the bottom, a sailboat flying signal flags, rope links (solid rope colour under a darker dashed twist) tied through brass grommets, the hub in navy with a brass rim inside a coiled rope, a Georgia stack for headline, titles and italic subtitles, one handwritten aside, and hand-drawn wobble on outlines. Dark mode swaps parchment for night blue, sun for moon and stars, and lightens brass and rope.

Use `chart` when the product's own world is a harbour or the sea: a pier, an anchor, water, the way pierless's name gave one. It is not a general answer for "give it a pun"; it fits only when the world itself is nautical. A rocket or a magic wand is still not allowed even in `chart`; if the name doesn't supply a harbour or the sea, `chart` is the wrong style too, not just the wrong decoration.

## Earning a new style

Most products are neither a compatibility case nor a harbour. A receipts tool's own feeling is efficiency, structure and time back, not a harbour: its world is the throw itself, one clean loop on drafting paper, not `chart`, and it should not default to `flat` either just because nothing else fits. A world like that is earned, not faked:

1. Propose the world in chat, in one sentence, and wait for the owner to accept it before drawing anything. For the receipts tool, that sentence was: its feeling is efficiency, structure and time back, so its world is the throw itself, one clean loop on drafting paper. The owner accepted that world before anything was drawn.
2. Make a hand-drawn reference for that world and get it accepted first, the same way `chart`'s reference (`examples/pierless/reference.svg`) was accepted before the renderer reproduced it.
3. Only then does the renderer learn the style by name, with its own section in this file and its own golden in `examples/`. Proposing a world is not the same step as naming a style; only `chart` and `flat` exist in the renderer today, and the receipts tool's world has not yet earned a name of its own.

A new world is never rendered by reusing `chart`'s harbour, or `flat`'s slate, with different labels on top. That is faking a style, not earning one.

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
