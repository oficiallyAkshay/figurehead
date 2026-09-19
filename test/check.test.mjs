// Every id in references/contract.md's "The checks" table gets at least one
// passing fixture (drawn from examples/, the repo's real specs and SVGs) and
// one failing fixture (a small spec or SVG built here) — plus a couple of
// full check() integration runs and a CLI exit-code check, per the checks
// builder's brief.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { check, _internal } from "../scripts/check.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
const readText = (p) => readFileSync(resolve(root, p), "utf8");

const readmerlinSpec = readJson("examples/readmerlin/readmerlin.hero.json");
const readmerlinSvg = readText("examples/readmerlin/readmerlin.svg");
const tidyInboxSpec = readJson("examples/tidy-inbox/tidy-inbox.hero.json");
const tidyInboxSvg = readText("examples/tidy-inbox/tidy-inbox.svg");

const fails = (findings) => findings.filter((f) => f.level === "fail");

// A failing fixture that does not depend on any committed example staying
// invalid: a copy of readmerlin's real (valid) spec, with an invalid "style"
// and an unknown top-level "links" field added. Written to a temp file so the
// CLI test can point the CLI at it, same as any other spec on disk.
const badSpecDir = mkdtempSync(join(tmpdir(), "figurehead-badspec-"));
const badSpec = { ...readmerlinSpec, style: "hand-inked", links: "twisted rope, tied through brass grommets" };
const badSpecPath = join(badSpecDir, "bad.hero.json");
writeFileSync(badSpecPath, JSON.stringify(badSpec, null, 2));
after(() => rmSync(badSpecDir, { recursive: true, force: true }));

// ---------------------------------------------------------------------------
// spec/shape
// ---------------------------------------------------------------------------

test("spec/shape has no fails for readmerlin's real spec (only the missing-style warn)", () => {
  assert.deepEqual(fails(_internal.checkSpecShape(readmerlinSpec)), []);
});

test('spec/shape warns exactly once, with id "spec/shape", when style is absent (readmerlin\'s real spec)', () => {
  const findings = _internal.checkSpecShape(readmerlinSpec).filter((f) => f.level === "warn");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, "spec/shape");
  assert.match(findings[0].message, /No style chosen/);
});

test("spec/shape produces no warn for the pierless golden (a style is already chosen)", () => {
  const pierlessSpec = readJson("examples/pierless/pierless.hero.json");
  const findings = _internal.checkSpecShape(pierlessSpec).filter((f) => f.level === "warn");
  assert.deepEqual(findings, []);
});

test("spec/shape fails a copy of readmerlin's spec with an invalid style and an unknown field", () => {
  // Built inline rather than borrowed from a committed example: an example's
  // spec can be normalised out from under a fixture that relies on it staying
  // invalid (as happened when the renderer builder fixed pierless's spec).
  const spec = JSON.parse(readFileSync(badSpecPath, "utf8"));
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.length >= 2, `expected at least 2 fails, got ${findings.length}`);
  assert.ok(findings.some((f) => /"style"/.test(f.message)));
  assert.ok(findings.some((f) => /"links"/.test(f.message)));
});

test("spec/shape fails a spec missing title and handled, but not a missing kind", () => {
  const findings = fails(_internal.checkSpecShape({ source: { label: "a", icon: "mail" } }));
  assert.ok(!findings.some((f) => /"kind"/.test(f.message)), "an absent kind defaults to fan and should not fail");
  assert.ok(findings.some((f) => /"title"/.test(f.message)));
  assert.ok(findings.some((f) => /"handled"/.test(f.message)));
});

test("spec/shape fails an invalid, present kind", () => {
  const findings = fails(_internal.checkSpecShape({ kind: "sideways", title: "t" }));
  assert.ok(findings.some((f) => /"kind" is "sideways"/.test(f.message)));
});

test("spec/shape fails handled outside three to nine items and a bad theme", () => {
  const spec = {
    kind: "fan",
    title: "t",
    source: { label: "a", icon: "mail" },
    handled: [
      { label: "a", icon: "mail" },
      { label: "b", icon: "calendar", theme: "beige" },
    ],
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /"handled" must be an array of three to nine/.test(f.message)));
  assert.ok(findings.some((f) => /theme.*beige/.test(f.message)));
});

test("spec/shape fails when two before.problems items share the same \"at\"", () => {
  const spec = {
    kind: "before-after",
    title: "t",
    before: {
      label: "before",
      problems: [
        { label: "A problem", at: "fold" },
        { label: "Another problem", at: "fold" },
      ],
    },
    by: { label: "by", icon: "mail" },
    after: { label: "after", parts: [{ label: "A part", at: "top" }] },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => f.message.includes('"before.problems"') && f.message.includes('"fold"')));
});

test("spec/shape fails when two after.parts items share the same \"at\"", () => {
  const spec = {
    kind: "before-after",
    title: "t",
    before: { label: "before", problems: [{ label: "A problem", at: "fold" }] },
    by: { label: "by", icon: "mail" },
    after: {
      label: "after",
      parts: [
        { label: "A part", at: "top" },
        { label: "Another part", at: "top" },
      ],
    },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => f.message.includes('"after.parts"') && f.message.includes('"top"')));
});

test("spec/shape passes for the pierless golden's chart spec (single source, hub present, no deliverable)", () => {
  const pierlessSpec = readJson("examples/pierless/pierless.hero.json");
  assert.deepEqual(_internal.checkSpecShape(pierlessSpec), []);
});

test("spec/shape fails a chart-style copy of tidy-inbox's spec for its \"sources\" and \"deliverable\"", () => {
  // tidy-inbox is a real, otherwise-valid flat spec that happens to use both
  // "sources" (plural) and "deliverable" — exactly the two fields chart has
  // no layout for. Setting its style to "chart" should report both by name.
  // It also has no "hub", so a third fail for that is expected too; this
  // test only asserts the two named fields are among the fails.
  const spec = { ...tidyInboxSpec, style: "chart" };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^"sources" is not allowed when "style" is "chart"/.test(f.message)), "expected a fail naming \"sources\"");
  assert.ok(findings.some((f) => /^"deliverable" is not allowed when "style" is "chart"/.test(f.message)), "expected a fail naming \"deliverable\"");
});

test("spec/shape fails a chart spec with no \"hub\"", () => {
  const spec = {
    kind: "fan",
    style: "chart",
    title: "t",
    source: { label: "a", icon: "mail" },
    handled: [
      { label: "a", icon: "mail" },
      { label: "b", icon: "car" },
      { label: "c", icon: "plane" },
    ],
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^A chart spec needs "hub"/.test(f.message)));
  assert.ok(!findings.some((f) => /"sources"/.test(f.message)));
  assert.ok(!findings.some((f) => /"deliverable"/.test(f.message)));
});

test("spec/shape does not apply the chart-only rules to a flat spec (unchanged)", () => {
  // A flat spec using "sources" and "deliverable" with no "hub" is exactly
  // tidy-inbox's own real, valid shape — style stays absent (flat), which
  // now also earns the missing-style warn, so only the fails are asserted
  // empty here.
  assert.deepEqual(fails(_internal.checkSpecShape(tidyInboxSpec)), []);
});

// ---------------------------------------------------------------------------
// spec/shape — style "window" (a third style being added to the renderer
// concurrently in a separate, in-progress PR this builder does not depend on)
// ---------------------------------------------------------------------------

// Two app-surface sources, a hub, a deliverable, and seven handled items with
// "more" — the shape window's own layout needs, per the owner's brief.
const validWindowSpec = {
  kind: "fan",
  style: "window",
  title: "Two inboxes, one packet",
  headline: "Two inboxes become one packet",
  sources: [
    { label: "Support inbox", icon: "mail" },
    { label: "Calendar", icon: "calendar" },
  ],
  hub: { label: "Packet", icon: "target" },
  deliverable: { label: "Weekly report", kind: "document" },
  handled: [
    { label: "Triaged", icon: "mail" },
    { label: "Scheduled", icon: "calendar" },
    { label: "Verified", icon: "badge-check" },
    { label: "Archived", icon: "archive" },
    { label: "Locked down", icon: "lock" },
    { label: "Alerted", icon: "bell" },
    { label: "Linked", icon: "link" },
  ],
  more: true,
};

test('spec/shape accepts "window" as a style value and has no fails for a well-formed window spec', () => {
  assert.deepEqual(fails(_internal.checkSpecShape(validWindowSpec)), []);
});

test('spec/shape fails a window spec whose "sources" does not have exactly two entries', () => {
  const spec = { ...validWindowSpec, sources: [validWindowSpec.sources[0]] };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^"sources" must have exactly two entries when "style" is "window"/.test(f.message)));
});

test('spec/shape fails a window spec with three "sources" too (still not exactly two)', () => {
  const spec = { ...validWindowSpec, sources: [...validWindowSpec.sources, { label: "Docs", icon: "folder" }] };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^"sources" must have exactly two entries when "style" is "window"/.test(f.message)));
});

test('spec/shape fails a window spec with no "hub"', () => {
  const { hub, ...spec } = validWindowSpec;
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^A window spec needs "hub"/.test(f.message)));
});

test('spec/shape fails a window spec with no "deliverable"', () => {
  const { deliverable, ...spec } = validWindowSpec;
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^A window spec needs "deliverable"/.test(f.message)));
});

test('spec/shape fails a window spec that also sets "source"', () => {
  const spec = { ...validWindowSpec, source: { label: "Just one", icon: "mail" } };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^"source" is not allowed when "style" is "window"/.test(f.message)));
});

test('spec/shape fails a window spec that also sets "aside"', () => {
  const spec = { ...validWindowSpec, aside: "a handwritten note" };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^"aside" is not allowed when "style" is "window"/.test(f.message)));
});

test('spec/shape fails a window spec whose handled item sets a "theme"', () => {
  const spec = { ...validWindowSpec, handled: [{ ...validWindowSpec.handled[0], theme: "navy" }, ...validWindowSpec.handled.slice(1)] };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /^"handled\[0\]\.theme" is not allowed when "style" is "window"/.test(f.message)));
});

// ---------------------------------------------------------------------------
// icons/known
// ---------------------------------------------------------------------------

test("icons/known passes for tidy-inbox's real icons", async () => {
  const iconNames = await _internal.loadIconNames();
  assert.deepEqual(_internal.checkIconsKnown(tidyInboxSpec, iconNames), []);
});

test("icons/known fails for an icon not in the subset", async () => {
  const iconNames = await _internal.loadIconNames();
  const findings = fails(_internal.checkIconsKnown({ source: { label: "a", icon: "nope" } }, iconNames));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /"nope"/);
});

// ---------------------------------------------------------------------------
// icons/distinct
// ---------------------------------------------------------------------------

test("icons/distinct passes for tidy-inbox's distinct handled icons", () => {
  assert.deepEqual(_internal.checkIconsDistinct(tidyInboxSpec), []);
});

test("icons/distinct fails when two handled items share an icon", () => {
  const spec = {
    handled: [
      { label: "A", icon: "mail" },
      { label: "B", icon: "mail" },
      { label: "C", icon: "car" },
    ],
  };
  const findings = fails(_internal.checkIconsDistinct(spec));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /"mail"/);
});

// ---------------------------------------------------------------------------
// text/fits
// ---------------------------------------------------------------------------

test("text/fits passes for tidy-inbox's short flat-style card labels", () => {
  const widths = _internal.loadWidths();
  assert.deepEqual(_internal.checkTextFits(tidyInboxSpec, widths), []);
});

test("text/fits fails when a flat handled title is too long for its 152px room", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    handled: [{ label: "This label is much too long to fit inside the card", icon: "mail" }],
  };
  const findings = fails(_internal.checkTextFits(spec, widths));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /does not fit the 152px room/);
});

test("text/fits fails when a chart-style handled sub is too long for its 220px room", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "chart",
    handled: [{ label: "Short", sub: "a subtitle so long it will not fit the two hundred twenty pixel room a chart card gives it", icon: "mail" }],
  };
  const findings = fails(_internal.checkTextFits(spec, widths));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /does not fit the 220px room/);
});

test("text/fits passes the pierless golden's chart headline and subhead", () => {
  const pierlessSpec = readJson("examples/pierless/pierless.hero.json");
  const widths = _internal.loadWidths();
  assert.deepEqual(_internal.checkTextFits(pierlessSpec, widths), []);
});

test("text/fits fails when a chart headline is too long for its 740px room", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "chart",
    headline: "This editorial headline is written deliberately long so that, once measured in the chart's bold serif face at size twenty seven, it will not fit the seven hundred forty pixel room the chart canvas gives it",
  };
  const findings = fails(_internal.checkTextFits(spec, widths));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /the chart headline/);
  assert.match(findings[0].message, /does not fit the 740px room/);
});

test("text/fits fails when a chart subhead is too long for its 740px room", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "chart",
    subhead: "This italic subhead is also written deliberately long so that, once measured in the chart's italic serif face at size sixteen, it too will not fit the seven hundred forty pixel room the chart canvas gives it",
  };
  const findings = fails(_internal.checkTextFits(spec, widths));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /the chart subhead/);
  assert.match(findings[0].message, /does not fit the 740px room/);
});

test("text/fits passes for a short window headline and short inbox row labels", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "window",
    headline: "One packet",
    handled: [
      { label: "Triaged", icon: "mail" },
      { label: "Scheduled", icon: "calendar" },
    ],
  };
  assert.deepEqual(fails(_internal.checkTextFits(spec, widths)), []);
});

test("text/fits fails when a window headline is too long for its 820px room (approximated from sans-600-19 scaled by 25/19)", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "window",
    headline:
      "This window headline is written deliberately long so that, once its sans-600-19 advance is measured and scaled up by twenty five over nineteen to approximate the real twenty five pixel size, it will not fit the eight hundred twenty pixel room the window canvas gives it, not even close to fitting",
  };
  const findings = fails(_internal.checkTextFits(spec, widths));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /the window headline/);
  assert.match(findings[0].message, /does not fit the 820px room/);
});

test('text/fits warns, but does not fail, a window inbox row label since "sans-600-14" is not a measured face', () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "window",
    handled: [{ label: "Triaged", icon: "mail" }],
  };
  const findings = _internal.checkTextFits(spec, widths);
  assert.deepEqual(fails(findings), []);
  assert.ok(findings.some((f) => f.level === "warn" && /No measured face "sans-600-14"/.test(f.message)));
});

test("text/fits fails when a before-after label is too long for its 180px room", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "before-after",
    before: { problems: [{ label: "This before label is far too long to fit in its allotted room", at: "fold" }] },
  };
  const findings = fails(_internal.checkTextFits(spec, widths));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /does not fit the 180px room/);
});

// ---------------------------------------------------------------------------
// spec/agrees
// ---------------------------------------------------------------------------

test("spec/agrees passes for the readmerlin pair", () => {
  assert.deepEqual(_internal.checkSpecAgrees(readmerlinSpec, readmerlinSvg), []);
});

test("spec/agrees fails when a label is missing from the svg", () => {
  const brokenSvg = readmerlinSvg.replace("Ten seconds end here", "");
  const findings = fails(_internal.checkSpecAgrees(readmerlinSpec, brokenSvg));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /Ten seconds end here/);
});

test("spec/agrees passes when a label is split across two <text> elements", () => {
  // Matches how the renderer draws pierless's two-line aside: one label,
  // "no pier, no port. it drops anchor itself.", as two separate <text> nodes.
  const spec = { kind: "fan", title: "t", aside: "no pier, no port. it drops anchor itself.", source: { label: "a", icon: "mail" }, handled: [{ label: "a", icon: "mail" }, { label: "b", icon: "car" }, { label: "c", icon: "plane" }] };
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1">',
    '<title id="t1">t</title>',
    '<text>a</text><text>b</text><text>c</text>',
    '<text class="hand muted" x="1" y="1">no pier, no port.</text>',
    '<text class="hand muted" x="1" y="2">it drops anchor itself.</text>',
    "</svg>",
  ].join("\n");
  assert.deepEqual(_internal.checkSpecAgrees(spec, svg), []);
});

test("spec/agrees still fails when a label split across text elements is missing entirely", () => {
  const spec = { kind: "fan", title: "t", aside: "no pier, no port. it drops anchor itself.", source: { label: "a", icon: "mail" }, handled: [{ label: "a", icon: "mail" }, { label: "b", icon: "car" }, { label: "c", icon: "plane" }] };
  const svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1">', '<title id="t1">t</title>', '<text>a</text><text>b</text><text>c</text>', "</svg>"].join("\n");
  const findings = fails(_internal.checkSpecAgrees(spec, svg));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /no pier, no port\. it drops anchor itself\./);
});

// ---------------------------------------------------------------------------
// register/reader-nouns (only runs with --repo)
// ---------------------------------------------------------------------------

test("register/reader-nouns is skipped without --repo", () => {
  assert.deepEqual(_internal.checkReaderNouns(tidyInboxSpec, undefined), []);
});

test("register/reader-nouns passes when no label matches a repo name", () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-nouns-pass-"));
  try {
    mkdirSync(join(dir, "widgets"));
    writeFileSync(join(dir, "utils.mjs"), "export function doThing() {}\n");
    const spec = { handled: [{ label: "Ship it" }, { label: "Go fast" }] };
    assert.deepEqual(_internal.checkReaderNouns(spec, dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("register/reader-nouns fails when a label equals a directory, file or export name", () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-nouns-fail-"));
  try {
    mkdirSync(join(dir, "widgets"));
    writeFileSync(join(dir, "utils.mjs"), "export function doThing() {}\n");
    const spec = {
      handled: [{ label: "widgets" }, { label: "doThing" }, { label: "Ship it" }],
    };
    const findings = fails(_internal.checkReaderNouns(spec, dir));
    assert.equal(findings.length, 2);
    assert.ok(findings.some((f) => /"widgets"/.test(f.message)));
    assert.ok(findings.some((f) => /"doThing"/.test(f.message)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("register/reader-nouns passes when the hub label equals a folder name (the product's own mark)", () => {
  // Reproduces pierless: examples/pierless is a real folder, and pierless's
  // hub.label is "Pierless" — the product's own name, meant to be said.
  const dir = mkdtempSync(join(tmpdir(), "figurehead-nouns-hub-"));
  try {
    mkdirSync(join(dir, "pierless"));
    const spec = {
      hub: { label: "Pierless", icon: "anchor" },
      handled: [{ label: "Ship it" }, { label: "Go fast" }],
    };
    assert.deepEqual(_internal.checkReaderNouns(spec, dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("register/reader-nouns passes when a label equals the checked repo directory's own basename", () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-nouns-reponame-"));
  try {
    const projectDir = join(dir, "pierless");
    mkdirSync(projectDir);
    const spec = { source: { label: "Pierless", icon: "git-merge" }, handled: [{ label: "Ship it" }] };
    assert.deepEqual(_internal.checkReaderNouns(spec, projectDir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('register/reader-nouns exempts "gives" and before-after\'s "with" (a verb/phrase on an arrow, not a product name), but still fails a handled label with the same word', () => {
  // Reproduces the real false positive: a source's "gives" happens to equal
  // a real example folder's name ("receipts"), which is not the product
  // being named — it is the phrase drawn on the fan's arrow.
  const dir = mkdtempSync(join(tmpdir(), "figurehead-nouns-gives-"));
  try {
    mkdirSync(join(dir, "receipts"));
    const spec = {
      sources: [{ label: "Email", icon: "mail", gives: "receipts" }],
      by: { label: "Sorter", icon: "target", with: "receipts" },
      handled: [
        { label: "receipts", icon: "car" },
        { label: "Ship it", icon: "plane" },
      ],
    };
    const findings = fails(_internal.checkReaderNouns(spec, dir));
    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /"receipts"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// curves/no-hook
// ---------------------------------------------------------------------------

test("curves/no-hook passes for tidy-inbox's real fan curves", () => {
  assert.deepEqual(_internal.checkCurvesNoHook(tidyInboxSvg), []);
});

test("curves/no-hook fails when a fan link's control point is not between its endpoints", () => {
  const svg = '<svg><path class="flow" d="M100,50 C 60,50 40,60 120,60"/></svg>';
  const findings = fails(_internal.checkCurvesNoHook(svg));
  assert.equal(findings.length, 1);
});

test("curves/no-hook ignores a hooked curve that isn't a fan link", () => {
  // Reproduces pierless's aside-to-hub squiggle: class "line", not "flow"/"rope".
  const svg = '<svg><path class="line" d="M100,50 C 60,50 40,60 120,60"/></svg>';
  assert.deepEqual(_internal.checkCurvesNoHook(svg), []);
});

// ---------------------------------------------------------------------------
// geometry/inside
// ---------------------------------------------------------------------------

test("geometry/inside passes for readmerlin's real svg", () => {
  const widths = _internal.loadWidths();
  assert.deepEqual(_internal.checkGeometryInside(readmerlinSvg, widths), []);
});

test("geometry/inside fails when a rect leaves the viewBox", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-labelledby="t1"><title id="t1">x</title><rect x="90" y="90" width="50" height="50"/></svg>';
  const findings = fails(_internal.checkGeometryInside(svg, _internal.loadWidths()));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /leaves the viewBox/);
});

test("geometry/inside passes for pierless's real chart-style svg (headline, subhead and hub label resolve their face from their own inline attributes)", () => {
  const pierlessSvg = readText("examples/pierless/pierless.svg");
  const widths = _internal.loadWidths();
  assert.deepEqual(_internal.checkGeometryInside(pierlessSvg, widths), []);
});

test("geometry/inside reads an element's own font-weight over the class rule, and fails a too-wide headline the class-only reading used to silently skip", () => {
  // The class only sets font-family and fill, exactly like the chart style's
  // real .serif/.ink rules; the bold weight comes solely from the element's
  // own font-weight="700", matching the chart headline's own markup.
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" role="img" aria-labelledby="t1">',
    '<title id="t1">x</title>',
    "<style>.serif { font-family: Georgia, serif; } .ink { fill: #1f2d45; }</style>",
    '<text class="serif ink" x="10" y="50" font-size="27" font-weight="700">A headline far too wide for this tiny two hundred pixel canvas</text>',
    "</svg>",
  ].join("\n");
  const findings = fails(_internal.checkGeometryInside(svg, _internal.loadWidths()));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /leaves the viewBox/);
});

// ---------------------------------------------------------------------------
// xml/valid
// ---------------------------------------------------------------------------

test("xml/valid passes for readmerlin's real svg", () => {
  assert.deepEqual(_internal.checkXmlValid(readmerlinSvg), []);
});

test("xml/valid fails when role=\"img\" is missing", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" aria-labelledby="t1"><title id="t1">x</title></svg>';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /role="img"/.test(f.message)));
});

test("xml/valid fails when aria-labelledby does not match the title's id", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="wrong-id"><title id="t1">x</title></svg>';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /does not match the title/.test(f.message)));
});

test("xml/valid fails on an unbalanced tag", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title><g><rect x="0" y="0" width="1" height="1"/></svg>';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /not well formed/.test(f.message)));
});

// ---------------------------------------------------------------------------
// check() end to end, and the CLI
// ---------------------------------------------------------------------------

test("check() has no fail findings for the readmerlin golden pair (only the missing-style warn)", async () => {
  const findings = await check(readmerlinSpec, readmerlinSvg);
  assert.deepEqual(fails(findings), []);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, "spec/shape");
  assert.equal(findings[0].level, "warn");
});

test("check() has no fail findings for the tidy-inbox golden pair (kind absent, defaults to fan; only the missing-style warn)", async () => {
  const findings = await check(tidyInboxSpec, tidyInboxSvg);
  assert.deepEqual(fails(findings), []);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, "spec/shape");
  assert.equal(findings[0].level, "warn");
});

test("CLI exits 0 for a passing pair even though it prints a warn (a warn never changes the exit code)", () => {
  const res = spawnSync("node", ["scripts/check.mjs", "examples/readmerlin/readmerlin.hero.json", "examples/readmerlin/readmerlin.svg"], { cwd: root, encoding: "utf8" });
  assert.equal(res.status, 0);
  const lines = res.stdout.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^spec\/shape\twarn\tNo style chosen/);
});

test("CLI exits 1 and prints tab-separated findings for a failing pair", () => {
  // The same inline-built bad spec, checked against readmerlin's real SVG so
  // only spec/shape (not spec/agrees) is expected to fail.
  const res = spawnSync("node", ["scripts/check.mjs", badSpecPath, resolve(root, "examples/readmerlin/readmerlin.svg")], { cwd: root, encoding: "utf8" });
  assert.equal(res.status, 1);
  const lines = res.stdout.trim().split("\n");
  assert.ok(lines.length >= 1);
  for (const line of lines) assert.equal(line.split("\t").length, 4);
  assert.match(lines[0], /^spec\/shape\tfail\t/);
});

test("CLI's --repo flag runs register/reader-nouns", () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-cli-nouns-"));
  try {
    mkdirSync(join(dir, "rides"));
    const specPath = join(dir, "t.hero.json");
    const svgPath = join(dir, "t.svg");
    writeFileSync(
      specPath,
      JSON.stringify({
        kind: "fan",
        title: "t",
        source: { label: "a", icon: "mail" },
        handled: [
          { label: "rides", icon: "car" },
          { label: "meals", icon: "utensils" },
          { label: "flights", icon: "plane" },
        ],
      })
    );
    writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">t</title><text>rides</text><text>meals</text><text>flights</text><text>a</text></svg>');
    const res = spawnSync("node", [resolve(root, "scripts/check.mjs"), specPath, svgPath, "--repo", dir], { cwd: root, encoding: "utf8" });
    assert.equal(res.status, 1);
    assert.match(res.stdout, /register\/reader-nouns\tfail\t.*"rides"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
