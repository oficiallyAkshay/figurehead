// Every id in references/contract.md's "The checks" table gets at least one
// passing fixture (drawn from examples/, the repo's real specs and SVGs) and
// one failing fixture (a small spec or SVG built here) — plus a couple of
// full check() integration runs and a CLI exit-code check, per the checks
// builder's brief.
import { test } from "node:test";
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
const pierlessSpec = readJson("examples/pierless/pierless.hero.json");

const fails = (findings) => findings.filter((f) => f.level === "fail");

// ---------------------------------------------------------------------------
// spec/shape
// ---------------------------------------------------------------------------

test("spec/shape passes for readmerlin's real spec", () => {
  assert.deepEqual(_internal.checkSpecShape(readmerlinSpec), []);
});

test("spec/shape fails for pierless's committed spec (style, and unknown fields)", () => {
  // pierless.hero.json predates the contract's field list: its "style" is not
  // "flat"/"chart", it has a top-level "links" the contract does not document,
  // and hub.ring is not a documented hub field. All three should be caught.
  const findings = fails(_internal.checkSpecShape(pierlessSpec));
  assert.ok(findings.length >= 3, `expected at least 3 fails, got ${findings.length}`);
  assert.ok(findings.some((f) => /"style"/.test(f.message)));
  assert.ok(findings.some((f) => /"links"/.test(f.message)));
  assert.ok(findings.some((f) => /"ring"/.test(f.message)));
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

// ---------------------------------------------------------------------------
// curves/no-hook
// ---------------------------------------------------------------------------

test("curves/no-hook passes for tidy-inbox's real fan curves", () => {
  assert.deepEqual(_internal.checkCurvesNoHook(tidyInboxSvg), []);
});

test("curves/no-hook fails when a control point is not between its endpoints", () => {
  const svg = '<svg><path d="M100,50 C 60,50 40,60 120,60"/></svg>';
  const findings = fails(_internal.checkCurvesNoHook(svg));
  assert.equal(findings.length, 1);
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

test("check() returns no findings for the readmerlin golden pair", async () => {
  const findings = await check(readmerlinSpec, readmerlinSvg);
  assert.deepEqual(findings, []);
});

test("check() returns no findings for the tidy-inbox golden pair (kind absent, defaults to fan)", async () => {
  const findings = await check(tidyInboxSpec, tidyInboxSvg);
  assert.deepEqual(findings, []);
});

test("CLI exits 0 and prints nothing for a passing pair", () => {
  const res = spawnSync("node", ["scripts/check.mjs", "examples/readmerlin/readmerlin.hero.json", "examples/readmerlin/readmerlin.svg"], { cwd: root, encoding: "utf8" });
  assert.equal(res.status, 0);
  assert.equal(res.stdout.trim(), "");
});

test("CLI exits 1 and prints tab-separated findings for a failing pair", () => {
  // pierless's committed spec predates the contract's field list (see the PR
  // body), so it is a real failing pair, not one built just for this test.
  const res = spawnSync("node", ["scripts/check.mjs", "examples/pierless/pierless.hero.json", "examples/pierless/reference.svg"], { cwd: root, encoding: "utf8" });
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
