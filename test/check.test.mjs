// Every id in references/contract.md's "The checks" table gets at least one
// passing fixture (drawn from examples/, the repo's real specs and SVGs) and
// one failing fixture (a small spec or SVG built here) — plus a couple of
// full check() integration runs and a CLI exit-code check, per the checks
// builder's brief.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { check, _internal } from "../scripts/check.mjs";
import { render } from "../scripts/figurehead.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
const readText = (p) => readFileSync(resolve(root, p), "utf8");

// `node --test --experimental-test-coverage` points NODE_V8_COVERAGE at a
// directory and every child process inherits that env var by default, so an
// un-overridden spawnSync here would have the CLI's own child process write
// its own coverage files into the same directory. Node then merges whatever
// happened to finish flushing by the time this process reads its own coverage,
// which is exactly the 0.3-1.3 point run-to-run variance the coverage gate
// used to show. Every spawnSync below the CLI itself instead runs unmeasured
// (real behaviour is still checked end to end); test/check.test.mjs's and
// test/render.test.mjs's in-process runCli() tests are what the coverage
// number is measured against, deterministically, since they run in this
// process.
const NO_COVERAGE_ENV = { ...process.env, NODE_V8_COVERAGE: "" };

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

// A spec with no "style" at all, to exercise the missing-style warn. Both
// readmerlin's and tidy-inbox's real committed specs now set "style"
// explicitly (so `check` no longer warns on them), so this fixture is built
// inline instead of relying on a committed example lacking a style. It is
// otherwise readmerlin's real, valid spec — before-after rendering ignores
// "style" entirely, so readmerlin's real SVG still matches it byte for byte.
const noStyleSpec = { ...readmerlinSpec };
delete noStyleSpec.style;
const noStyleDir = mkdtempSync(join(tmpdir(), "figurehead-nostyle-"));
const noStyleSpecPath = join(noStyleDir, "no-style.hero.json");
const noStyleSvgPath = join(noStyleDir, "no-style.svg");
writeFileSync(noStyleSpecPath, JSON.stringify(noStyleSpec, null, 2));
writeFileSync(noStyleSvgPath, render(noStyleSpec));
after(() => rmSync(noStyleDir, { recursive: true, force: true }));

// ---------------------------------------------------------------------------
// spec/shape
// ---------------------------------------------------------------------------

test("spec/shape has no fails for readmerlin's real spec", () => {
  assert.deepEqual(fails(_internal.checkSpecShape(readmerlinSpec)), []);
});

test('spec/shape warns exactly once, with id "spec/shape", when style is absent (readmerlin\'s spec, minus its "style")', () => {
  const findings = _internal.checkSpecShape(noStyleSpec).filter((f) => f.level === "warn");
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

test("spec/shape fails once, naming the spec itself, when the spec is not a JSON object at all (a string)", () => {
  const findings = _internal.checkSpecShape("not an object");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, "spec/shape");
  assert.equal(findings[0].level, "fail");
  assert.match(findings[0].message, /The spec is not a JSON object/);
});

test("spec/shape fails once, naming the spec itself, when the spec is an array rather than an object", () => {
  const findings = _internal.checkSpecShape([1, 2, 3]);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /The spec is not a JSON object/);
});

test('spec/shape fails when "headline" is present but not a string', () => {
  const findings = fails(_internal.checkSpecShape({ title: "t", source: { label: "a", icon: "mail" }, headline: 123 }));
  assert.ok(findings.some((f) => /"headline" is present but is not a string/.test(f.message)));
});

test('spec/shape fails when "source" is present but not an object (a string)', () => {
  const findings = fails(_internal.checkSpecShape({ title: "t", source: "not an object" }));
  assert.ok(findings.some((f) => /"source" is not an object/.test(f.message)));
});

test('spec/shape fails when a required field on "source" is present but blank (whitespace only)', () => {
  const findings = fails(_internal.checkSpecShape({ title: "t", source: { label: "   ", icon: "mail" } }));
  assert.ok(findings.some((f) => /"source" is missing "label"/.test(f.message)));
});

test('spec/shape fails when "source" has a field its own vocabulary does not allow', () => {
  const findings = fails(_internal.checkSpecShape({ title: "t", source: { label: "a", icon: "mail", extra: "nope" } }));
  assert.ok(findings.some((f) => /"source" has an unknown field "extra"/.test(f.message)));
});

test('spec/shape skips a non-object before.problems item rather than crashing, and still catches a missing "at" on a well-formed one', () => {
  const spec = {
    kind: "before-after",
    title: "t",
    before: {
      label: "before",
      problems: ["not an object", { label: "Missing at" }, { label: "A problem", at: "fold" }],
    },
    by: { label: "by", icon: "mail" },
    after: { label: "after", parts: [{ label: "A part", at: "top" }] },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /"before\.problems\[0\]" is not an object/.test(f.message)));
  assert.ok(findings.some((f) => /"before\.problems\[1\]" is missing "at"/.test(f.message)));
  assert.ok(!findings.some((f) => /share the same "at"/.test(f.message)), "the malformed items must not be treated as sharing a place with anything");
});

test('a before-after spec missing "before" entirely is refused by name', () => {
  const spec = { kind: "before-after", title: "t", by: { label: "by", icon: "mail" }, after: { label: "after", parts: [{ label: "A", at: "top" }] } };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /A before-after spec needs "before"/.test(f.message)));
});

test('a before-after spec whose "before.problems" is present but empty is refused by name', () => {
  const spec = {
    kind: "before-after",
    title: "t",
    before: { label: "before", problems: [] },
    by: { label: "by", icon: "mail" },
    after: { label: "after", parts: [{ label: "A", at: "top" }] },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /"before.problems" must be a non-empty array/.test(f.message)));
});

test('a before-after spec missing "by" entirely is refused by name', () => {
  const spec = {
    kind: "before-after",
    title: "t",
    before: { label: "before", problems: [{ label: "A", at: "top" }] },
    after: { label: "after", parts: [{ label: "A", at: "top" }] },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /A before-after spec needs "by"/.test(f.message)));
});

test('a before-after spec missing "after" entirely is refused by name', () => {
  const spec = {
    kind: "before-after",
    title: "t",
    before: { label: "before", problems: [{ label: "A", at: "top" }] },
    by: { label: "by", icon: "mail" },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /A before-after spec needs "after"/.test(f.message)));
});

test('a before-after spec whose "after.parts" is present but not an array (a string) is refused by name', () => {
  const spec = {
    kind: "before-after",
    title: "t",
    before: { label: "before", problems: [{ label: "A", at: "top" }] },
    by: { label: "by", icon: "mail" },
    after: { label: "after", parts: "not an array" },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /"after.parts" must be a non-empty array/.test(f.message)));
});

test('a fan spec whose "sources" array has more than three items is refused by name', () => {
  const spec = {
    title: "t",
    sources: [
      { label: "a", icon: "mail" },
      { label: "b", icon: "calendar" },
      { label: "c", icon: "plane" },
      { label: "d", icon: "car" },
    ],
    handled: [
      { label: "a", icon: "mail" },
      { label: "b", icon: "car" },
      { label: "c", icon: "plane" },
    ],
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /"sources" must be an array of one to three items/.test(f.message)));
});

test('a fan spec whose "handled" is present but not an array (a string) is refused by name', () => {
  const findings = fails(_internal.checkSpecShape({ title: "t", source: { label: "a", icon: "mail" }, handled: "not an array" }));
  assert.ok(findings.some((f) => /"handled" must be an array of three to nine items/.test(f.message)));
});

test('a fan spec whose "more" is present but not a boolean is refused by name', () => {
  const spec = {
    title: "t",
    source: { label: "a", icon: "mail" },
    handled: [
      { label: "a", icon: "mail" },
      { label: "b", icon: "car" },
      { label: "c", icon: "plane" },
    ],
    more: "yes",
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /"more" must be a boolean/.test(f.message)));
});

test('a fan spec whose "deliverable.kind" is present but not "document" or "table" is refused by name', () => {
  const spec = {
    title: "t",
    source: { label: "a", icon: "mail" },
    handled: [
      { label: "a", icon: "mail" },
      { label: "b", icon: "car" },
      { label: "c", icon: "plane" },
    ],
    deliverable: { label: "one thing", kind: "spreadsheet" },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => /"deliverable.kind" is "spreadsheet"/.test(f.message)));
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

test('spec/shape names a shared "at" by its positional index (e.g. "before.problems[1]") when the item sharing it has no "label" of its own', () => {
  const spec = {
    kind: "before-after",
    title: "t",
    before: {
      label: "before",
      problems: [{ label: "A problem", at: "fold" }, { at: "fold" }],
    },
    by: { label: "by", icon: "mail" },
    after: { label: "after", parts: [{ label: "A part", at: "top" }] },
  };
  const findings = fails(_internal.checkSpecShape(spec));
  assert.ok(findings.some((f) => f.message.includes('"before.problems"') && f.message.includes("before.problems[1]")));
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
  // tidy-inbox's own real, valid shape.
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

test('icons/known collects icons from a spec with no "sources" key at all (only "source")', async () => {
  const iconNames = await _internal.loadIconNames();
  assert.deepEqual(_internal.checkIconsKnown({ source: { label: "a", icon: "mail" } }, iconNames), []);
});

test('icons/known skips a "sources" item that is present but has no "icon" of its own', async () => {
  const iconNames = await _internal.loadIconNames();
  assert.deepEqual(_internal.checkIconsKnown({ sources: [{ label: "a" }] }, iconNames), []);
});

test('icons/known also collects a "hub" icon (not just source/sources/handled/by)', async () => {
  const iconNames = await _internal.loadIconNames();
  const findings = fails(_internal.checkIconsKnown({ hub: { label: "Hub", icon: "nope" } }, iconNames));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /^hub\.icon "nope"/);
});

test("loadIconNames rejects, naming scripts/icons.mjs, when the module at the given URL cannot be imported at all", async () => {
  const missing = new URL("./does-not-exist-at-all.mjs", import.meta.url);
  await assert.rejects(() => _internal.loadIconNames(missing), /Could not load scripts\/icons\.mjs/);
});

test('loadIconNames rejects when the module it imports exports an "ICONS" that is not an object', async () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-badicons-"));
  try {
    const modPath = join(dir, "bad-icons.mjs");
    writeFileSync(modPath, "export const ICONS = 42;\n");
    await assert.rejects(() => _internal.loadIconNames(pathToFileURL(modPath)), /does not export an ICONS object/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('check() reports an "icons/known" fail (rather than throwing) when iconsUrl points at a module that fails to import', async () => {
  const missing = new URL("./does-not-exist-at-all.mjs", import.meta.url);
  const findings = await check(tidyInboxSpec, tidyInboxSvg, { iconsUrl: missing });
  const iconFindings = findings.filter((f) => f.id === "icons/known");
  assert.equal(iconFindings.length, 1);
  assert.equal(iconFindings[0].level, "fail");
  assert.match(iconFindings[0].message, /Could not load scripts\/icons\.mjs/);
});

test('check() reports a "text/fits" fail (rather than throwing) when widthsUrl points at a file that cannot be read', async () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-badwidths-"));
  try {
    const missingPath = join(dir, "does-not-exist.json");
    const findings = await check(tidyInboxSpec, tidyInboxSvg, { widthsUrl: pathToFileURL(missingPath) });
    const widthFindings = findings.filter((f) => f.id === "text/fits");
    assert.equal(widthFindings.length, 1);
    assert.equal(widthFindings[0].level, "fail");
    assert.match(widthFindings[0].message, /Could not read scripts\/widths\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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

test('icons/distinct passes a spec with no "handled" key at all', () => {
  assert.deepEqual(_internal.checkIconsDistinct({ title: "t" }), []);
});

test('icons/distinct skips a handled item that has no "icon" of its own, rather than crashing', () => {
  const spec = { handled: [{ label: "A" }, { label: "B", icon: "car" }] };
  assert.deepEqual(_internal.checkIconsDistinct(spec), []);
});

test('icons/distinct names a shared icon\'s owner by its positional index (e.g. "handled[1]") when that item has no "label" of its own', () => {
  const spec = {
    handled: [
      { label: "A", icon: "mail" },
      { icon: "mail" },
    ],
  };
  const findings = fails(_internal.checkIconsDistinct(spec));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /handled\[1\]/);
});

// ---------------------------------------------------------------------------
// text/fits
// ---------------------------------------------------------------------------

test("measureLabel substitutes the face's average advance for a character that face's table does not measure (an em dash)", () => {
  const widths = _internal.loadWidths();
  const faces = widths.faces;
  const withDash = _internal.measureLabel(faces, "sans-600-17", "a—b");
  const withoutDash = _internal.measureLabel(faces, "sans-600-17", "ab");
  assert.ok(withDash > withoutDash, "an unmeasured character should still add some width (the face's average), not zero");
});

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

test("text/fits passes for a short window headline and a short inbox row label", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "window",
    headline: "One packet",
    handled: [{ label: "Triaged", icon: "mail" }],
  };
  assert.deepEqual(fails(_internal.checkTextFits(spec, widths)), []);
});

test("text/fits fails when a window headline is too long for its 820px room (measured at sans-700-25)", () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "window",
    headline:
      "This window headline is written deliberately long so that, once measured at its real twenty five pixel bold system-ui face, it will not fit the eight hundred twenty pixel room the window canvas gives it, not even close to fitting inside that room at all",
  };
  const findings = fails(_internal.checkTextFits(spec, widths));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /the window headline/);
  assert.match(findings[0].message, /does not fit the 820px room/);
});

test('text/fits fails a window inbox row label of twenty characters, too long for its 60px room (measured at sans-600-14)', () => {
  const widths = _internal.loadWidths();
  const spec = {
    kind: "fan",
    style: "window",
    handled: [{ label: "Exactly twenty chars", icon: "mail" }],
  };
  const findings = fails(_internal.checkTextFits(spec, widths));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /a window inbox row label/);
  assert.match(findings[0].message, /does not fit the 60px room/);
});

test('text/fits warns, rather than failing, when scripts/widths.json has no measured face for the room being checked', () => {
  const spec = { kind: "fan", style: "chart", headline: "A short headline" };
  const findings = _internal.checkTextFits(spec, { faces: {} });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].level, "warn");
  assert.match(findings[0].message, /No measured face "serif-700-27" for the chart headline/);
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

test('text/fits passes a before-after spec with no "before" key at all, rather than crashing', () => {
  const widths = _internal.loadWidths();
  const spec = { kind: "before-after", after: { parts: [{ label: "A short label", at: "top" }] } };
  assert.deepEqual(fails(_internal.checkTextFits(spec, widths)), []);
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
// Tag stripping runs on already-decoded text (CodeQL js/incomplete-multi-character-sanitization):
// stripping before unescaping XML entities would let a fake tag written as "&lt;script&gt;" pass
// the strip pass untouched (it has no literal "<"/">" yet) and only turn into a real "<script>"
// afterward, once unescapeXml runs. Both call sites (spec/agrees's text collector and
// geometry/inside's text-width reader) now decode first, then strip, in that order.
// ---------------------------------------------------------------------------

test("stripTags removes markup in one pass and stays stable if run again (looping to a fixed point rather than a single pass)", () => {
  const nested = "before <b>bold <i>italic</i></b> after";
  const once = _internal.stripTags(nested);
  assert.equal(once, "before bold italic after");
  assert.equal(_internal.stripTags(once), once, "stripping already-stripped text must be a no-op");
});

test('spec/agrees fails a label that only reads as a literal tag ("<mark>highlighted</mark>") after XML-entity decoding, rather than letting the decode smuggle it past the tag strip as this would have before the strip/decode order was fixed', () => {
  // Before the fix, the svg's text content was tag-stripped BEFORE unescapeXml ran: the escaped
  // "&lt;mark&gt;...&lt;/mark&gt;" has no literal "<"/">" at strip time, so nothing was stripped,
  // and decoding afterward turned it into literal "<mark>highlighted</mark>" text that survived
  // into the comparison haystack whole -- so this exact spec label would have been found, and
  // this test would have failed (no "spec/agrees" fail finding). Decoding first and stripping
  // after means the tags are gone by the time the label is compared, so the literal-angle-bracket
  // label is correctly reported as not present.
  const spec = { title: "t", label: "<mark>highlighted</mark>" };
  const svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1">', '<title id="t1">t</title>', "<text>Some &lt;mark&gt;highlighted&lt;/mark&gt; text</text>", "</svg>"].join("\n");
  const findings = fails(_internal.checkSpecAgrees(spec, svg));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /<mark>highlighted<\/mark>/);
});

// ---------------------------------------------------------------------------
// register/reader-nouns (only runs with --repo)
// ---------------------------------------------------------------------------

test("register/reader-nouns is skipped without --repo", () => {
  assert.deepEqual(_internal.checkReaderNouns(tidyInboxSpec, undefined), []);
});

test("register/reader-nouns treats a repo directory that cannot be read (does not exist) as having no nouns at all, rather than throwing", () => {
  const missingDir = join(tmpdir(), "figurehead-nouns-does-not-exist-" + Date.now());
  const spec = { handled: [{ label: "Ship it" }, { label: "Go fast" }] };
  assert.deepEqual(_internal.checkReaderNouns(spec, missingDir), []);
});

test("register/reader-nouns skips a code-extension file it cannot read (permission denied), rather than throwing", { skip: process.getuid && process.getuid() === 0 && "root can read a file with no permission bits, so this fixture cannot fail the read" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-nouns-noperm-"));
  try {
    const unreadable = join(dir, "unreadable.mjs");
    writeFileSync(unreadable, "export function doThing() {}\n");
    chmodSync(unreadable, 0o000);
    const spec = { handled: [{ label: "Ship it" }, { label: "Go fast" }] };
    assert.deepEqual(_internal.checkReaderNouns(spec, dir), []);
  } finally {
    chmodSync(join(dir, "unreadable.mjs"), 0o644);
    rmSync(dir, { recursive: true, force: true });
  }
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

test("register/reader-nouns checks a repeated label only once (its second occurrence is deduplicated, not double-reported)", () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-nouns-dedup-"));
  try {
    mkdirSync(join(dir, "widgets"));
    const spec = { handled: [{ label: "widgets" }, { label: "widgets" }] };
    const findings = fails(_internal.checkReaderNouns(spec, dir));
    assert.equal(findings.length, 1, "a label repeated twice must be reported once, not twice");
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

test("curves/no-hook ignores a <path> with no \"d\" attribute at all, rather than crashing", () => {
  const svg = '<svg><path class="flow"/></svg>';
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

test('geometry/inside measures a text-anchor="end" element from its right edge (the box extends left from x, not right)', () => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" role="img" aria-labelledby="t1">',
    '<title id="t1">x</title>',
    "<style>.title { font-family: system-ui; font-weight: 600; }</style>",
    '<text class="title" x="10" y="50" font-size="17" text-anchor="end">A right-aligned label far too wide for this room</text>',
    "</svg>",
  ].join("\n");
  const findings = fails(_internal.checkGeometryInside(svg, _internal.loadWidths()));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /leaves the viewBox/);
});

test("geometry/inside passes with no findings, rather than crashing, when the <svg> has no viewBox attribute at all", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="t1"><title id="t1">x</title><rect x="9999" y="9999" width="1" height="1"/></svg>';
  assert.deepEqual(_internal.checkGeometryInside(svg, _internal.loadWidths()), []);
});

test("geometry/inside reads a single-argument translate() (no y) as dy=0", () => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-labelledby="t1">',
    '<title id="t1">x</title>',
    '<g transform="translate(90)"><rect x="20" y="0" width="20" height="20"/></g>',
    "</svg>",
  ].join("\n");
  // The <rect> sits at x=20 within the <g>; translate(90) (no y given) shifts it to x=110,
  // outside the 100-wide viewBox, but must not shift it vertically (dy=0) or crash.
  const findings = fails(_internal.checkGeometryInside(svg, _internal.loadWidths()));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /leaves the viewBox/);
});

test("geometry/inside skips a <text> element with no class attribute at all (no measured face can be resolved for it), rather than crashing", () => {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1">',
    '<title id="t1">x</title>',
    "<style>.title { font-family: system-ui; font-weight: 600; }</style>",
    '<text x="9999" y="9999" font-size="17">Off canvas, but unclassed, so skipped</text>',
    "</svg>",
  ].join("\n");
  assert.deepEqual(_internal.checkGeometryInside(svg, _internal.loadWidths()), []);
});

test("geometry/inside reads a bare <rect/> with no x/y/width/height attributes as all zero, rather than crashing", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title><rect/></svg>';
  assert.deepEqual(_internal.checkGeometryInside(svg, _internal.loadWidths()), []);
});

test("geometry/inside reads a bare <circle/> with no cx/cy/r attributes as all zero, rather than crashing", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title><circle/></svg>';
  assert.deepEqual(_internal.checkGeometryInside(svg, _internal.loadWidths()), []);
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

const baseSvg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title>${inner}</svg>`;

test("xml/valid passes an SVG containing a well-formed XML comment (a closed <!-- ... -->)", () => {
  assert.deepEqual(_internal.checkXmlValid(baseSvg('<!-- a comment --><rect x="0" y="0" width="1" height="1"/>')), []);
});

test("xml/valid fails on an unterminated XML comment (no closing -->)", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title><!-- never closed';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /not well formed/.test(f.message)));
});

test("xml/valid passes an SVG containing a well-formed CDATA section (a closed <![CDATA[ ... ]]>)", () => {
  assert.deepEqual(_internal.checkXmlValid(baseSvg("<![CDATA[some data]]><rect x=\"0\" y=\"0\" width=\"1\" height=\"1\"/>")), []);
});

test("xml/valid fails on an unterminated CDATA section (no closing ]]>)", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title><![CDATA[ never closed';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /not well formed/.test(f.message)));
});

test("xml/valid passes an SVG containing a well-formed processing instruction (a closed <? ... ?>)", () => {
  assert.deepEqual(_internal.checkXmlValid(baseSvg('<?embedded instruction?><rect x="0" y="0" width="1" height="1"/>')), []);
});

test("xml/valid fails on an unterminated processing instruction (no closing ?>)", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title><?never closed';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /not well formed/.test(f.message)));
});

test("xml/valid passes an SVG containing a well-formed declaration such as <!DOCTYPE ...> (closed by its own >)", () => {
  assert.deepEqual(_internal.checkXmlValid(baseSvg('<!DOCTYPE anything><rect x="0" y="0" width="1" height="1"/>')), []);
});

test("xml/valid fails on an unterminated declaration such as <!DOCTYPE (no closing >)", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title><!DOCTYPE never closed';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /not well formed/.test(f.message)));
});

test("xml/valid fails on a malformed tag that is neither a valid close tag nor a valid open tag", () => {
  const svg = baseSvg("<1not-a-valid-tag-name>");
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /not well formed/.test(f.message)));
});

test("xml/valid fails on an unterminated <style> block (no closing </style>)", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title id="t1">x</title><style>.a { fill: red; }';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /not well formed/.test(f.message)));
});

test("xml/valid fails, naming the missing root, when there is no <svg> element at all", () => {
  const findings = fails(_internal.checkXmlValid('<title id="t1">x</title>'));
  assert.ok(findings.some((f) => /No <svg> root element was found/.test(f.message)));
});

test('xml/valid fails when aria-labelledby is missing even though role="img" is present', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img"><title id="t1">x</title></svg>';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /missing aria-labelledby/.test(f.message)));
});

test("xml/valid fails, naming the missing child, when the <svg> has no <title> at all", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><rect x="0" y="0" width="1" height="1"/></svg>';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /The <svg> has no <title> child/.test(f.message)));
});

test("xml/valid fails when the <title> child has no id attribute of its own", () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" role="img" aria-labelledby="t1"><title>x</title></svg>';
  const findings = fails(_internal.checkXmlValid(svg));
  assert.ok(findings.some((f) => /title.*child has no id/.test(f.message)));
});

// ---------------------------------------------------------------------------
// check() end to end, and the CLI
// ---------------------------------------------------------------------------

test("check() has no findings at all for the readmerlin golden pair", async () => {
  const findings = await check(readmerlinSpec, readmerlinSvg);
  assert.deepEqual(findings, []);
});

test("check() has no findings at all for the tidy-inbox golden pair (kind absent, defaults to fan)", async () => {
  const findings = await check(tidyInboxSpec, tidyInboxSvg);
  assert.deepEqual(findings, []);
});

test("check() warns exactly once, with id \"spec/shape\", on readmerlin's spec minus its \"style\"", async () => {
  const findings = await check(noStyleSpec, readmerlinSvg);
  assert.deepEqual(fails(findings), []);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, "spec/shape");
  assert.equal(findings[0].level, "warn");
});

test("CLI exits 0 for a passing pair even though it prints a warn (a warn never changes the exit code)", () => {
  // readmerlin's and tidy-inbox's real, committed specs both set "style" now, so
  // the missing-style warn is exercised here against an inline fixture (readmerlin's
  // spec minus its "style", paired with its own real SVG, which before-after
  // rendering produces identically whether or not "style" is set) rather than a
  // committed example.
  const res = spawnSync("node", ["scripts/check.mjs", noStyleSpecPath, noStyleSvgPath], { cwd: root, encoding: "utf8", env: NO_COVERAGE_ENV });
  assert.equal(res.status, 0);
  const lines = res.stdout.trim().split("\n").filter(Boolean);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^spec\/shape\twarn\tNo style chosen/);
});

test("CLI exits 1 and prints tab-separated findings for a failing pair", () => {
  // The same inline-built bad spec, checked against readmerlin's real SVG so
  // only spec/shape (not spec/agrees) is expected to fail.
  const res = spawnSync("node", ["scripts/check.mjs", badSpecPath, resolve(root, "examples/readmerlin/readmerlin.svg")], { cwd: root, encoding: "utf8", env: NO_COVERAGE_ENV });
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
    const res = spawnSync("node", [resolve(root, "scripts/check.mjs"), specPath, svgPath, "--repo", dir], { cwd: root, encoding: "utf8", env: NO_COVERAGE_ENV });
    assert.equal(res.status, 1);
    assert.match(res.stdout, /register\/reader-nouns\tfail\t.*"rides"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
