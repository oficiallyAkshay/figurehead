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

Each statement below is read off the project's own committed hero, not invented for this file. The citation after each line names where to check it.

**boomerang**

- Outcome: "one PDF: summary page, then every receipt" (`examples/boomerang/reference.svg`).
- Parts, the handled items the reference hero draws: Rides, Meals, Flights, Hotels, Transit, Wi-Fi, and more (`examples/boomerang/reference.svg`).
- Deeper: not pushed in this golden. Every handled item sits at the same depth; the reference draws a fan, not one item singled out further.

**readmerlin**

- Outcome: "The README people finish" (`examples/readmerlin/readmerlin.hero.json`, `after.label`).
- What it replaces, the before: "Ten seconds end here" (fold), "Code before value" (code), "A stale badge" (badge), "A dead link" (link) (`examples/readmerlin/readmerlin.hero.json`, `before.problems`).
- Parts, the after: "What they get, first" (tagline), "One picture" (picture), "Badges that are true" (badges), "Features at a glance" (features) (`examples/readmerlin/readmerlin.hero.json`, `after.parts`).
- Deeper: the after itself, drawn part for part against the before rather than collapsed into one checkmark.

**clonometer**

- Outcome: "a count that never loses a day" (this is the handoff's own example outcome for clonometer, `FIGUREHEAD-HANDOFF.md`, the outcome layer's list of examples).
- Parts, the one metaphor the clonometer hero landed on, nothing more: the fourteen-day window, new boxes entering on the right; the belt that drops the oldest day off the left; the all-time total that catches the number it drops (`_handoff/HEROFOLD-ITEMS.md`, "what the clonometer hero taught").
- Deeper: not pushed past layer two. The window, the drop and the total are the whole accepted picture.

**pierless**

- Outcome: "Merge it. Pierless takes it from there." (`examples/pierless/pierless.hero.json`, `headline`).
- Parts, the four handled cards, quoted exactly: "Deploys instantly / the moment you merge", "Fixes itself / stuck deploys, dropped daemons", "Only what changed / never a full reinstall", "Stays quiet / alerts only when something's red" (`examples/pierless/pierless.hero.json`, `handled`).
- Deeper: the source, drawn as a real green "Merge pull request" button rather than a labelled arrow (`examples/pierless/pierless.hero.json`, `source`), because that one object is what makes the reader believe the rest is automatic.
