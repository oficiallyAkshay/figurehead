# AGENTS.md

Skill path: `SKILL.md` at the repo root. Install with the skills CLI or copy the folder.

Reference: [CONTRIBUTING](.github/CONTRIBUTING.md) holds the commands, what CI runs, what a change must satisfy, and how the pieces fit.

Order of work: read `SKILL.md`, then `references/concept.md`, `references/shape.md`, `references/style.md`, then `references/contract.md`. Write the concept statement and wait for the owner's word, pick a shape and a style, write `<name>.hero.json` beside the SVG, render, check, fix every fail, show the SVG in chat at full width in light and dark, then commit the spec and the SVG together, only when told.

The CLI is exact: `render`, `check`, `goldens`. Findings print as `id<TAB>level<TAB>message<TAB>repair`; exit 1 means a fail.

A style is chosen for every hero; `flat` exists only so readmerlin's and tidy-inbox's goldens do not move. A new world is proposed in one sentence and accepted before drawing.

Branch per change, plain-sentence titles, a claim table in the PR body, no auto-merge.
