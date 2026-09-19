# Contract

The shared file. The conductor owns it. Builders read it, build to it, and do not change it; a builder who finds it wrong says so in the PR body and the conductor changes it for everyone.

The brief for everything here is `FIGUREHEAD-HANDOFF.md` in the owner's `_handoff` folder (outside this repo). Its philosophy, wording rules, style rules, palette and technical rules apply. This file fixes only what two builders must agree on.

## What figurehead is

An agent skill. Not a package. Installed with `npx skills add oficiallyAkshay/figurehead`, which copies this folder. Its scripts run with `node` from wherever the folder landed and need nothing installed. There is no npm publish, no `bin`, no Action.

## Layout and ownership

| Path | Owner | What it is |
| --- | --- | --- |
| `SKILL.md` | skill builder (body only; front matter is fixed) | The skill: step A writes the concept statement, step B picks the shape and renders |
| `references/concept.md` | skill builder | How to write a concept statement: outcome, three to five parts, one deeper layer; the litmus test |
| `references/shape.md` | skill builder | The three questions that map a statement to a shape; the wording rules for cards |
| `references/style.md` | skill builder | The two styles, when each applies, the palette, what "handmade not craftbook" means |
| `references/icons.md` | renderer builder | The published icon list, generated from `scripts/icons.mjs` by a test that fails when they differ |
| `scripts/figurehead.mjs` | renderer builder | The CLI and the `render(spec)` export. Seeded from readmerlin's `hero-svg.mjs`; that history is kept |
| `scripts/icons.mjs` | renderer builder | The icon subset, one entry per name |
| `scripts/check.mjs` | checks builder | The `check(spec, svg, options)` export and the check rules |
| `scripts/widths.json` | checks builder | Measured character advances for the faces and sizes the renderer uses |
| `test/render.test.mjs` | renderer builder | Goldens rebuild byte for byte; unknown icon refused; determinism |
| `test/check.test.mjs` | checks builder | Every rule has a passing and a failing fixture |
| `examples/<name>/` | renderer builder | Goldens, see below |
| `.github/`, `README.md`, `package.json`, this file | conductor | |

One worktree and one branch per PR, created from the repo root: `git worktree add .claude/worktrees/<name> -b claude/<name>`. Never touch a file outside your rows. Never arm auto-merge.

## The spec

One JSON file beside the SVG, named `<name>.hero.json`. `readmerlin check` already accepts that name. Fields:

```
kind        "fan" | "before-after"            default "fan" when absent
style       "flat" | "chart"                  default "flat"
title       string                            required; becomes the SVG title and alt text
headline    string                            optional; chart draws it as the editorial line, brand word in brand colour
subhead     string                            optional; chart draws it under the headline

fan:
  source    { label, icon, note? }            the one thing the reader does; or
  sources   [ { label, icon, gives } ]        one to three, flat style, kept for readmerlin's goldens
  hub       { label, icon }                   the product's own mark; chart draws a coiled rope ring around it
  handled   [ { label, sub?, icon, theme? } ] three to nine; theme in navy | sea | ochre | plum, cycled when absent
  more      boolean                           adds the dashed "and more" card
  deliverable { label, kind, heading?, backing }   flat style only; kind in document | table; heading is the word on the page
  aside     string                            chart style: the one handwritten line

before-after:
  before    { label, problems: [ { label, at } ] }
  by        { label, icon, with }
  after     { label, parts: [ { label, at } ], backing }

scene       object                            documentation only in v1; the renderer ignores it
```

Unknown fields are an error. Unknown icon names are an error naming the known list. Anything else the brief's wording rules say about labels is a check, not a render error.

## The two styles

**flat** is readmerlin's current look and is exactly what the seed renders today: slate and one amber accent, outline icons, no fills. Its output for the two readmerlin goldens must not change by a byte.

**chart** is the pierless look: parchment with grain and a vignette, faint rhumb lines and a compass rose top right, a few depth soundings, two gulls top left, three wave bands with ink crests along the bottom and a sailboat flying signal flags, rope links (solid rope colour under a darker dashed twist) tied through brass grommets, the hub in navy with a brass rim inside a coiled rope, a Georgia stack for headline, titles and italic subtitles, one handwritten aside, and hand-drawn wobble on outlines from `feTurbulence` into `feDisplacementMap` at scale 2.4. Dark mode swaps parchment for night blue, sun for moon and stars, and lightens brass and rope. The palette is in the brief; the reference SVG is `examples/pierless/reference.svg`.

## Goldens

`examples/<name>/<name>.hero.json` is rendered to `examples/<name>/<name>.svg` and a test fails when the bytes differ.

| Example | Spec | Status of the SVG |
| --- | --- | --- |
| `readmerlin` | from readmerlin, unchanged | byte golden from day one; the seed already reproduces it |
| `tidy-inbox` | from readmerlin, unchanged | byte golden from day one |
| `boomerang` | written by the renderer builder from `reference.svg` | the renderer's own output, committed once it visually matches the reference; `reference.svg` is hand-made and never a byte golden |
| `pierless` | the spec pierless already has | the renderer's own output in `chart` style, committed once the owner accepts it in chat; `reference.svg` is hand-made and never a byte golden |

The conductor looks at every golden rendered, at full width, in light and dark, before it merges.

## The CLI

```
node scripts/figurehead.mjs render <spec.hero.json> [--out <file.svg>]     SVG to stdout or the file
node scripts/figurehead.mjs check <spec.hero.json> <file.svg> [--repo <dir>]  runs every check, exit 1 on a fail
node scripts/figurehead.mjs goldens                                          re-renders every example in place
```

Determinism: same spec, same bytes. Fixed filter seeds, no dates, no randomness, no environment reads.

## The checks

Each has an id, a level (fail or warn), a message and a repair line, printed one per line as `id<TAB>level<TAB>message<TAB>repair`.

| Id | Fails when |
| --- | --- |
| `spec/shape` | a required field is missing, a field is unknown, or a count is out of range |
| `icons/known` | an icon name is not in the subset |
| `icons/distinct` | two handled items share an icon |
| `text/fits` | a label's measured width, plus ten percent, exceeds the room its card gives it |
| `spec/agrees` | a label in the spec does not appear as text in the SVG |
| `register/reader-nouns` | with `--repo`, a label equals a path, module, export or function name in that repo |
| `curves/no-hook` | a fan curve's control x is not strictly between its two endpoints |
| `geometry/inside` | any element's bounding box leaves the viewBox |
| `xml/valid` | the SVG is not well formed, or lacks a title, `role="img"` and `aria-labelledby` |

`text/fits` reads `scripts/widths.json`. That file holds, for each face the renderer uses (sans, serif, hand) and each size, the advance of every printable ASCII character, measured once in a browser and committed, with the measurement method written at the top of `scripts/check.mjs`.

## Builders return

A PR whose title is a plain sentence describing the resulting state, and whose body is a claim table: one row per claim, with the test name or command that proves it and the file and line. Commits use the neutral identity and the fixed trailer:

```
git -c user.name="oficiallyAkshay" -c user.email="186180952+oficiallyAkshay@users.noreply.github.com" commit -m "..."
```

with the last line of every message `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. `npm test` is green before the PR opens. A verifier who did not write the code confirms each claim before the conductor merges.
