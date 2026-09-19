# The concept statement

A concept statement is not a logline. It is three nested layers, and the picture must carry the first two.

## Layer one: the outcome

What the reader walks away with. Not what the tool does, what they have afterward. One PDF. A README people finish. A count that never loses a day. A Mac already running it. Say it in one sentence, in the reader's own terms, with no component names in it.

## Layer two: the highest-level parts

The smallest set of named things, three to five of them, whose arrangement produces the outcome, stated so a reader can verify it by eye with no knowledge of the implementation.

Three to five, not one. An earlier draft of this framework said pick one payoff and draw only that; the owner rejected the picture it produced. The outcome as a sum of its highest-level parts is what lets a reader opt in: shown a handful of concrete things, they can check each one against what they need, and trust builds across the set. One part alone reads as a claim; three to five read as a case.

This is the opt-in layer: the reader is not told the thing is valuable, they are shown the shape of why it would be.

Each part gets:
- a bold title of two or three words
- a subtitle naming the concrete object of the verb

"Heals and restarts" fails this test: heals what, restarts what. "Fixes itself, stuck deploys, dropped daemons" passes. Name the object every time.

Order the parts by value: the core promise first, reliability second, efficiency third, attention last.

## Layer three: one part, one notch deeper

For the reader who wants to interrogate one specific part one notch further. Attached to one part only, never to all of them. Pushing every part a level deeper draws the architecture diagram, which already lives below the fold and is Archify's job, not this skill's.

## The litmus test

If an engineer would sketch the same picture to explain the architecture to another engineer, it is mechanism, and it belongs below the fold, no matter how true, clever or hard-won the fact is. Mermaid already owns that register; nicer icons do not change what kind of picture it is.

Apply this before showing the statement to the owner. A statement that survives the litmus test still has to earn the shape and the wording; it has only cleared the first bar.

## Four worked statements

**boomerang**

- Outcome: a Mac that already has what you use, restored without you touching it again.
- Parts: capture what's installed, replay it on a new machine, keep the list current as you add things.
- Deeper: the replay step, because that's the part a reader doubts.

**readmerlin**

- Outcome: a README people finish, checked so it stays true.
- Parts: gather what the repo already says, draw the hero from the reader's chair, write six sections in a fixed order, check the page on every push.
- Deeper: the check, because "checked on every push" is the claim a skeptical reader wants proof of.

**clonometer**

- Outcome: an install count that never loses a day, however traffic is undercounted.
- Parts: a belt of workflows that runs on a schedule, a ledger that never overwrites what it already knows, a badge that reads straight from the ledger.
- Deeper: the ledger, because "never loses a day" is the one claim readers have been burned by before.

**pierless**

- Outcome: a merge that deploys itself, with no server left half-updated and no pager going off for nothing.
- Parts: deploys the moment you merge, fixes itself when a deploy sticks or a daemon drops, reinstalls only what changed, stays quiet unless something is actually red.
- Deeper: the source, drawn as a real green "Merge pull request" button rather than a labelled arrow, because that one object is what makes the reader believe the rest is automatic.
