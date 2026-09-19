---
name: figurehead
description: Draw the hero graphic at the top of a README for a skill, agent, plugin or MCP server repo, from the reader's chair rather than the builder's. Use when a README needs its opening picture, when an existing hero reads like an architecture diagram, or when readmerlin asks for the hero. Writes a concept statement first, then picks the shape, then renders an SVG from a committed spec.
license: MIT
compatibility: Node 20 or newer, nothing else
metadata:
  version: "0.1.0"
  peers: readmerlin writes the README around this hero; archify draws the architecture diagram below the fold
---

# figurehead

Draw the reader's day, not the system's parts.

## The script

Everything below runs one script that sits beside this file, at `scripts/figurehead.mjs` in this skill's folder. It needs Node 20 or newer and nothing else. Give Node the script's full path.

## Steps

**Step A. The concept statement.**

Read the repo's README, SKILL or manifest and its one-line description. Write, in chat, the three layers described in `references/concept.md`:

- the outcome, in one sentence
- three to five parts, each a two or three word title plus a subtitle naming the concrete object of the verb, ordered by value
- the one part that carries the surprise

Apply the litmus test in `references/concept.md` before going on: if an engineer would sketch the same picture to explain the architecture to another engineer, it is mechanism and does not belong here. Show the statement in chat and wait for the owner's word. Do not start Step B until they answer.

**Step B. Shape and render.**

Answer the three questions in `references/shape.md` to choose `kind`. Use `references/style.md` to choose `style`. Write `<name>.hero.json` beside where the SVG will live, using only the fields the contract defines and icons listed in `references/icons.md`.

Run:

```
node <path-to-this-skill>/scripts/figurehead.mjs render <name>.hero.json --out <name>.svg
node <path-to-this-skill>/scripts/figurehead.mjs check <name>.hero.json <name>.svg --repo <repo-root>
```

Fix every fail `check` reports. Show the SVG in chat at full width, in light and in dark. Expect several passes: each rejection gets a one-line diagnosis of what went wrong before the next render, never a fresh guess offered without one. Commit the SVG and the spec together only when the owner says to. Never draw Mermaid, never the architecture (that is Archify's, below the fold), never animation.

## What gets rejected

- Another hero's layout with new labels. Derive the shape from the concept, never start from a template.
- An icon plus a caption standing in for a concept. That is not a picture of anything.
- The right objects buried inside the wrong macro-shape. Find the concept type before drawing.
- Anything an engineer would sketch to explain the architecture to another engineer. Run the litmus test in `references/concept.md`.
- A checklist, even one that collapses to a single checkmark. Cataloguing chores is still a list.
- One payoff drawn alone. The outcome is a sum of three to five parts, not one.
- A fan whose hub is an anonymous dot instead of the product's own mark. See the counter-lesson in `references/shape.md`.
- A curve whose control point falls outside the two endpoints it connects, which hooks the line back on itself at the hub.
- Texture, colour or grain layered onto what is still structurally a diagram. Dressing a diagram does not undress it.
- Whimsy that tips into craftbook: washi tape, stickies, cute captions, gulls near the title. See the handmade line in `references/style.md`.

## Peers

readmerlin calls this skill for the hero it puts at the top of a README. Archify draws the architecture diagram that lives below the fold; figurehead never does.
