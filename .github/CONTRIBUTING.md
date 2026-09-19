# Contributing

figurehead is an agent skill: the words in `SKILL.md` and `references/` are the product, and the scripts exist so a wrong picture cannot ship. Changes to the words need a reason from a real hero; changes to the scripts need a test.

## Run it

```
node scripts/figurehead.mjs render <name>.hero.json --out <name>.svg
node scripts/figurehead.mjs check <name>.hero.json <name>.svg --repo <repo root>
node scripts/figurehead.mjs goldens
npm test
```

Node 20 or newer. Nothing to install.

## What CI runs

| Job | What it proves |
| --- | --- |
| `checks` | no secret anywhere in history (gitleaks), the workflows lint (actionlint), every script parses |
| `test` on Node 20 and 22 | the suite, which rebuilds every example in `examples/` from its spec and fails on a byte of drift |
| `ci` | the one context the branch ruleset requires; green only when both jobs are |

`clonometer` runs daily and keeps a lifetime clone count on the `badges` branch. Nothing here phones home from a user's machine.

## A change must satisfy

| Change | Proof it needs |
| --- | --- |
| a renderer change | the goldens still rebuild byte for byte, or the golden is re-rendered in the same PR with the picture shown |
| a new style | a hand-drawn reference accepted by the owner first, then a golden the renderer reproduces from a spec |
| a new check | a passing fixture and a failing fixture, the failing one built inline, never a committed example |
| a new icon | an entry in `scripts/icons.mjs` and `references/icons.md` regenerated; the test compares them |
| a spec field | the contract updated first, then the renderer, then the check |
| a wording change in `SKILL.md` or `references/` | the sentence it replaces and the hero that showed it was wrong |

## How it fits together

Step A writes a concept statement from the repo. Step B picks a shape and a world, writes `<name>.hero.json` beside the SVG, renders, checks, and shows the picture before anything is committed. `references/contract.md` fixes the spec, the styles, the goldens, the CLI and the checks. `scripts/figurehead.mjs` renders, `scripts/check.mjs` checks, `scripts/widths.json` holds measured character advances so text fit is arithmetic rather than a guess.

## For agents

Read `SKILL.md`, then `references/concept.md`, `references/shape.md`, `references/style.md`, then the contract. The CLI is exact: `render`, `check`, `goldens`. Findings print as `id<TAB>level<TAB>message<TAB>repair`; exit 1 means a fail. A style is chosen for every hero; flat exists only so readmerlin's goldens do not move. A new world is proposed in one sentence and accepted before drawing. Commit the SVG and its spec together, only when told. Branch per change, plain-sentence titles, a claim table in the PR body, no auto-merge.
