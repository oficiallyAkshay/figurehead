# Statement to shape

Three questions, asked of layer two, not a lookup table. The four heroes that exist today (the receipts hero, readmerlin, clonometer, pierless) each landed on a different shape; those shapes are outputs of the questions, not a menu to pick from.

## Q1. How many named parts, and are they the same kind or different kinds?

- Many of one kind converge on one thing. Draw a hub with a fan: `kind: fan`.
- One kind appearing twice, a before and an after of the same subject. Draw an axis of comparison: `kind: before-after`.
- A few fixed parts of different kinds, none converging and none opposing. Draw them as distinct labelled nodes: call this shape **topology**. Not yet, ask the owner; the renderer does not draw this today.
- One kind recurring over time, with something that persists across the recurrence. Draw a cycle feeding a static accumulator: call this shape **conveyor**. Not yet, ask the owner; the renderer does not draw this today.

## Q2. What does the relationship do to the parts?

- Merges them into one thing: draw a convergence, which is what `fan` renders.
- Replaces one with a better version of itself: draw a diff, which is what `before-after` renders.
- Constrains which may touch: draw edges, and draw a forbidden edge as visibly as an allowed one. This is **topology** again; see the counter-lesson below for a case where a topology-shaped concept was rejected outright rather than merely unbuilt.
- Cycles one thing while conserving something out of it: draw the motion and the thing it drops off. This is **conveyor** again. Not yet, ask the owner.

## Q3. Where does the surprise live?

Every concept has one place where recognition does the work: the fact that, once seen, makes the reader trust the rest. That part earns literal, textured, drawn-as-itself detail, and it is the natural home of layer three from `references/concept.md`. Everything else in the picture stays a simple labelled shape.

For pierless the surprise lived in the source: not an arrow labelled "merge", but a real green "Merge pull request" button. For readmerlin's before-after it lives in the after, drawn with the same specificity as the before rather than as a generic checkmark.

## Mapping to what the renderer draws

| Q1 answer | Q2 answer | `kind` |
| --- | --- | --- |
| many of one kind | merge into one thing | `fan` |
| one kind, twice | replace with a better version | `before-after` |
| a few kinds, fixed | constrained edges | **topology**, not yet, ask the owner |
| one kind, recurring | cycle plus accumulator | **conveyor**, not yet, ask the owner |

Only `fan` and `before-after` exist in the renderer today. If the three questions point somewhere else, say so to the owner and stop rather than force the concept into the nearest shape that renders.

## The litmus test, applied to shape

If an engineer would sketch the same picture to explain the architecture to another engineer, it is mechanism, and it belongs below the fold no matter how true, clever or hard-won the fact is. Mermaid already owns that register; nicer icons on the same layout do not change what kind of picture it is.

The three-way trust **topology** considered for pierless was correct, interesting, and rejected for exactly this reason: three nodes, forbidden edges, arrows between components. It read as a data-flow diagram regardless of how well it matched the mechanism. Q1 and Q2 both pointed at "constrained edges", and the shape was still wrong, because the litmus test overrides the questions: mechanism informs the drawing, it is never the drawing's subject. A **topology** is not disqualified in general by this one case; it is disqualified whenever it reads as an architecture sketch, which a topology of components very often will.

## The counter-lesson: the fan is not owned by the receipts hero

The fan was rejected for pierless once, then accepted. Rejected: it was the receipts hero's geometry (`examples/tidy-inbox`) with new labels and an anonymous dot at the hub, which reads as a copied template. Accepted: the hub became the product's own mark (an anchor, not a dot), the source became the one literal thing the reader does (the merge button), and the fanned items became value-framed capabilities rather than mechanisms or rules.

Shape families are reusable when the concept type matches the questions above. What reads as borrowed is a copied drawing with new words on it, not a shared grammar. Before reusing a shape from another hero, check that the hub in the new picture is this product's own mark, not the last product's mark relabelled.

## What goes on the cards: wording rules

Each rule below was a correction from the owner on a specific pierless card. Apply all four before showing a draft.

- **Capability, not defence.** Say what the picture does for the reader, not what it refuses.
  - Before: "The only door in"
  - After: "Deploys instantly / the moment you merge"
  - Security facts still belong somewhere: they go in the badge row, as spec claims, not on a card.

- **Name the object of every verb.**
  - Before: "Heals and restarts"
  - After: "Fixes itself / stuck deploys, dropped daemons"
  - "Heals what, restarts what" is the test: if the subtitle doesn't name a concrete thing, the title fails.

- **No edge cases as headline value.** Define value by what happens every time, not by the elimination of a rare failure.
  - Before: "Never overwrites you" (guards a rare force-push scenario)
  - After: "Only what changed / never a full reinstall" (true on every deploy)

- **Consolidate and order.** Merge two or three guarantees into one stronger claim rather than listing each; seven README bullets became four cards on pierless. Order the survivors by value: the core promise first, reliability second, efficiency third, attention last.

Title plus subtitle is the format that carries this: a bold title of two or three words, an italic or muted subtitle of four or five words carrying the specifics. One editorial headline can sit over the whole set, with the brand word in the brand colour and a subhead that frames the cards as a set, for example "Merge it. Pierless takes it from there." over "four things happen, all on their own".
