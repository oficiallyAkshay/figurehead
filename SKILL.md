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

(The skill body is written by the skill builder. This file's front matter is fixed by `references/contract.md` and is not theirs to change.)
