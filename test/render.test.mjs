// Renderer tests: every committed example rebuilds byte for byte from its own spec, rendering is deterministic,
// bad input is refused by name, and the published icon list agrees with the table it is generated from.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { render } from "../scripts/figurehead.mjs";
import { ICONS } from "../scripts/icons.mjs";
import { esc } from "../scripts/components/esc.mjs";
import { glyph, themedGlyph, rawGlyph } from "../scripts/components/glyphs.mjs";
import { svgHead } from "../scripts/components/svg-shell.mjs";
import { okBadge } from "../scripts/components/badges.mjs";
import { flowCurve, ropeLink, grommet } from "../scripts/components/curves.mjs";
import { stackedSheet } from "../scripts/components/sheets.mjs";
import { flatCard, chartHandledCard } from "../scripts/components/cards.mjs";
import { chip } from "../scripts/components/chip.mjs";
import { chartHub, windowHandoffHub } from "../scripts/components/hub-disc.mjs";
import { brandedText, chartHeadlineBlock, windowHeadlineBlock } from "../scripts/components/headline.mjs";
import { panelWithChrome } from "../scripts/components/panel.mjs";
import { listRow } from "../scripts/components/list-rows.mjs";
import { calendarGrid } from "../scripts/components/calendar.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examplesDir = resolve(root, "examples");
const examples = readdirSync(examplesDir).filter((name) => statSync(join(examplesDir, name)).isDirectory());
const cliPath = resolve(root, "scripts", "figurehead.mjs");
const checksInstalled = existsSync(resolve(root, "scripts", "check.mjs"));

for (const name of examples) {
  const specPath = join(examplesDir, name, `${name}.hero.json`);
  const svgPath = join(examplesDir, name, `${name}.svg`);
  test(`examples/${name}/${name}.svg is what its spec draws`, () => {
    const spec = JSON.parse(readFileSync(specPath, "utf8"));
    const svg = readFileSync(svgPath, "utf8");
    assert.equal(render(spec), svg, `examples/${name}/${name}.svg has drifted from its spec`);
  });
}

test("rendering the same spec twice gives equal bytes", () => {
  const spec = JSON.parse(readFileSync(join(examplesDir, "pierless", "pierless.hero.json"), "utf8"));
  assert.equal(render(spec), render(spec));
});

test("an icon the renderer does not know is refused by name", () => {
  assert.throws(
    () => render({ title: "t", sources: [{ label: "a", icon: "nope" }], handled: [], deliverable: { label: "x" } }),
    /Unknown icon "nope"/
  );
});

test("a field the spec vocabulary does not know is refused by name", () => {
  assert.throws(
    () => render({ title: "t", sources: [{ label: "a", icon: "mail" }], handled: [], deliverable: { label: "x" }, wrongField: true }),
    /Unknown field "wrongField"/
  );
});

test("a handled item field the spec vocabulary does not know is refused by name", () => {
  assert.throws(
    () => render({ title: "t", sources: [{ label: "a", icon: "mail" }], handled: [{ label: "b", icon: "car", nope: 1 }], deliverable: { label: "x" } }),
    /Unknown field "nope"/
  );
});

test("a chart card title too long for its card is refused by name", () => {
  const longLabel = "This title is far too long to fit";
  assert.throws(
    () =>
      render({
        kind: "fan",
        style: "chart",
        title: "t",
        source: { label: "Go", icon: "git-merge" },
        hub: { label: "Hub", icon: "anchor" },
        handled: [{ label: longLabel, icon: "bell", theme: "navy" }],
      }),
    new RegExp(`Label "${longLabel}" does not fit its card`)
  );
});

test('a chart spec with "sources" (a flat-style field) is refused by name', () => {
  assert.throws(
    () =>
      render({
        kind: "fan",
        style: "chart",
        title: "t",
        sources: [
          { label: "Inbox", icon: "mail", gives: "receipts" },
          { label: "Calendar", icon: "calendar", gives: "dates" },
        ],
        hub: { label: "Hub", icon: "anchor" },
        handled: [{ label: "One", icon: "bell" }],
      }),
    /Field "sources" is not drawn by the chart style/
  );
});

test('a chart spec with a "deliverable" (a flat-style field) is refused by name', () => {
  assert.throws(
    () =>
      render({
        kind: "fan",
        style: "chart",
        title: "t",
        source: { label: "Go", icon: "git-merge" },
        hub: { label: "Hub", icon: "anchor" },
        handled: [{ label: "One", icon: "bell" }],
        deliverable: { label: "one claim", kind: "table" },
      }),
    /Field "deliverable" is not drawn by the chart style/
  );
});

test('a chart spec with no "hub" is refused by name', () => {
  assert.throws(
    () =>
      render({
        kind: "fan",
        style: "chart",
        title: "t",
        source: { label: "Go", icon: "git-merge" },
        handled: [{ label: "One", icon: "bell" }],
      }),
    /The chart style needs a "hub"/
  );
});

test("the tidy-inbox spec, flipped to the chart style, is refused rather than silently missing pieces", () => {
  const spec = JSON.parse(readFileSync(join(examplesDir, "tidy-inbox", "tidy-inbox.hero.json"), "utf8"));
  spec.style = "chart";
  assert.throws(() => render(spec));
});

test("a chart headline too long for the canvas is refused by name", () => {
  const longHeadline = "This headline is deliberately far too long to fit across the eight hundred twenty pixel canvas at all";
  assert.throws(
    () =>
      render({
        kind: "fan",
        style: "chart",
        title: "t",
        headline: longHeadline,
        hub: { label: "Hub", icon: "anchor" },
        handled: [{ label: "One", icon: "bell" }],
      }),
    new RegExp(`Label "${longHeadline}" does not fit its headline`)
  );
});

test("two before problems at the same place are refused by name", () => {
  assert.throws(
    () =>
      render({
        kind: "before-after",
        title: "t",
        before: {
          label: "Old",
          problems: [
            { label: "A", at: "code" },
            { label: "B", at: "code" },
          ],
        },
        by: { label: "Fix", icon: "car" },
        after: { label: "New", parts: [{ label: "C", at: "tagline" }] },
      }),
    /Two problems share the place "code"/
  );
});

test("two after parts at the same place are refused by name", () => {
  assert.throws(
    () =>
      render({
        kind: "before-after",
        title: "t",
        before: { label: "Old", problems: [{ label: "A", at: "code" }] },
        by: { label: "Fix", icon: "car" },
        after: {
          label: "New",
          parts: [
            { label: "C", at: "tagline" },
            { label: "D", at: "tagline" },
          ],
        },
      }),
    /Two parts share the place "tagline"/
  );
});

// Chart layout at many items: the canvas height grows with the handled-item count (the "more" card counts as one
// more item) instead of compressing the gap between cards until they overlap the sea or leave the canvas.
function chartSpecWithHandled(count, more = false) {
  const icons = ["mail", "calendar", "target", "car", "utensils", "plane", "bed", "train", "wifi"];
  return {
    kind: "fan",
    style: "chart",
    title: "t",
    hub: { label: "Hub", icon: "anchor" },
    handled: Array.from({ length: count }, (_, i) => ({ label: `Item ${i + 1}`, icon: icons[i % icons.length] })),
    ...(more ? { more: true } : {}),
  };
}

// Parses only what the fix promises: every handled (and "more") card's raw rect attributes, the first wave
// path's baseline y, and the viewBox, all straight out of the rendered text.
function chartLayoutFacts(svg) {
  const [, w, h] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const [, waveY] = /<path class="w1" d="M-50,([\d.]+)/.exec(svg);
  const cards = [...svg.matchAll(/<rect class="c-(?:navy|sea|ochre|plum)" x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(
    ([, x, y, cw, ch]) => ({ x: +x, y: +y, right: +x + +cw, bottom: +y + +ch })
  );
  return { width: +w, height: +h, waveY: +waveY, cards };
}

for (const count of [3, 5, 7, 9]) {
  test(`a chart with ${count} handled items keeps every card above the wave line and inside the viewBox`, () => {
    const svg = render(chartSpecWithHandled(count));
    const { width, height, waveY, cards } = chartLayoutFacts(svg);
    assert.equal(cards.length, count, `expected ${count} handled cards, found ${cards.length}`);
    for (const c of cards) {
      assert.ok(c.bottom < waveY, `card bottom ${c.bottom} is not above the wave line at ${waveY}`);
      assert.ok(c.y >= 0 && c.bottom <= height, `card y-range [${c.y}, ${c.bottom}] is not inside the viewBox height ${height}`);
      assert.ok(c.x >= 0 && c.right <= width, `card x-range [${c.x}, ${c.right}] is not inside the viewBox width ${width}`);
    }
  });
}

test("a chart with 9 handled items and more:true keeps the more card above the wave line and inside the viewBox too", () => {
  const svg = render(chartSpecWithHandled(9, true));
  const { width, height, waveY, cards } = chartLayoutFacts(svg);
  assert.equal(cards.length, 10, `expected 9 handled cards plus the more card, found ${cards.length}`);
  for (const c of cards) {
    assert.ok(c.bottom < waveY, `card bottom ${c.bottom} is not above the wave line at ${waveY}`);
    assert.ok(c.y >= 0 && c.bottom <= height, `card y-range [${c.y}, ${c.bottom}] is not inside the viewBox height ${height}`);
    assert.ok(c.x >= 0 && c.right <= width, `card x-range [${c.x}, ${c.right}] is not inside the viewBox width ${width}`);
  }
});

test("the pierless four-item chart still computes the same 820x500 canvas and 446 wave line", () => {
  const spec = JSON.parse(readFileSync(join(examplesDir, "pierless", "pierless.hero.json"), "utf8"));
  const svg = render(spec);
  const { width, height, waveY } = chartLayoutFacts(svg);
  assert.equal(width, 820, "the pierless canvas width must stay 820");
  assert.equal(height, 500, "the pierless canvas height must stay 500");
  assert.equal(waveY, 446, "the pierless wave line must stay at y=446");
});

test("a chart card subtitle too long for its card is refused by name", () => {
  const longSub = "This subtitle is also much too long to fit inside the card";
  assert.throws(
    () =>
      render({
        kind: "fan",
        style: "chart",
        title: "t",
        source: { label: "Go", icon: "git-merge" },
        hub: { label: "Hub", icon: "anchor" },
        handled: [{ label: "Short", sub: longSub, icon: "bell", theme: "navy" }],
      }),
    new RegExp(`Label "${longSub}" does not fit its card`)
  );
});

// The window style: an automation between two app surfaces (an inbox panel, a calendar
// panel), a hub disc and a stacked deliverable sheet. See examples/receipts for the golden.
function windowSpec(overrides = {}) {
  return {
    kind: "fan",
    style: "window",
    title: "t",
    sources: [
      { label: "Inbox", gives: "receipts" },
      { label: "Calendar", gives: "trip dates" },
    ],
    hub: { label: "Hub", icon: "git-merge" },
    handled: [{ label: "One", icon: "car" }],
    deliverable: { label: "one PDF", heading: "Summary", backing: "back" },
    ...overrides,
  };
}

test("rendering the same window spec twice gives equal bytes", () => {
  const spec = JSON.parse(readFileSync(join(examplesDir, "receipts", "receipts.hero.json"), "utf8"));
  assert.equal(render(spec), render(spec));
});

test('a window spec with "source" (a chart/flat-style field) is refused by name', () => {
  assert.throws(() => render(windowSpec({ source: { label: "Go", icon: "git-merge" } })), /Field "source" is not drawn by the window style/);
});

test('a window spec with "aside" (a chart-style field) is refused by name', () => {
  assert.throws(() => render(windowSpec({ aside: "a note" })), /Field "aside" is not drawn by the window style/);
});

test('a window spec with a handled item\'s "theme" (a chart-style field) is refused by name', () => {
  assert.throws(() => render(windowSpec({ handled: [{ label: "One", icon: "car", theme: "navy" }] })), /Field "theme" on "One" is not drawn by the window style/);
});

test('a window spec with no "sources" is refused by name', () => {
  const spec = windowSpec();
  delete spec.sources;
  assert.throws(() => render(spec), /The window style needs "sources"/);
});

test('a window spec with one "sources" instead of two is refused by name', () => {
  assert.throws(() => render(windowSpec({ sources: [{ label: "Inbox" }] })), /needs exactly two "sources"/);
});

test('a window spec with no "hub" is refused by name', () => {
  const spec = windowSpec();
  delete spec.hub;
  assert.throws(() => render(spec), /The window style needs a "hub"/);
});

test('a window spec with no "deliverable" is refused by name', () => {
  const spec = windowSpec();
  delete spec.deliverable;
  assert.throws(() => render(spec), /The window style needs a "deliverable"/);
});

// Window layout at many items: the inbox panel's (and so, when it is the taller panel, the
// canvas's) height grows with the handled-item count (the "more" row counts as one more
// item) instead of compressing rows until they overlap or leave the panel.
function windowSpecWithHandled(count, more = false) {
  const icons = ["mail", "calendar", "target", "car", "utensils", "plane", "bed", "train", "wifi"];
  return windowSpec({
    handled: Array.from({ length: count }, (_, i) => ({ label: `Item ${i + 1}`, icon: icons[i % icons.length] })),
    ...(more ? { more: true } : {}),
  });
}

// Parses only what the fix promises: the viewBox, the inbox panel's own rect (the first
// "panel"-classed rect), and the row dividers straight out of the rendered rowline path.
function windowLayoutFacts(svg) {
  const [, w, h] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  const [, px, py, pw, ph] = /<rect class="panel" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  const [, rowlineD] = /<path class="rowline" d="([^"]+)"/.exec(svg);
  const dividers = [...rowlineD.matchAll(/M[\d.]+,([\d.]+)/g)].map(([, y]) => +y);
  return { width: +w, height: +h, panel: { x: +px, y: +py, right: +px + +pw, bottom: +py + +ph }, dividers };
}

for (const count of [3, 5, 9]) {
  test(`a window with ${count} handled items keeps every inbox row inside its panel and the panel inside the viewBox`, () => {
    const svg = render(windowSpecWithHandled(count));
    const { width, height, panel, dividers } = windowLayoutFacts(svg);
    assert.equal(dividers.length, count + 1, `expected ${count + 1} row dividers for ${count} rows, found ${dividers.length}`);
    for (let i = 0; i < count; i++) {
      const top = dividers[i];
      const bottom = dividers[i + 1];
      assert.ok(top >= panel.y && bottom <= panel.bottom, `row ${i} range [${top}, ${bottom}] is not inside the panel [${panel.y}, ${panel.bottom}]`);
    }
    assert.ok(panel.x >= 0 && panel.right <= width, `panel x-range [${panel.x}, ${panel.right}] is not inside the viewBox width ${width}`);
    assert.ok(panel.y >= 0 && panel.bottom <= height, `panel y-range [${panel.y}, ${panel.bottom}] is not inside the viewBox height ${height}`);
  });
}

test("a window with 9 handled items and more:true keeps the more row inside its panel and the panel inside the viewBox too", () => {
  const svg = render(windowSpecWithHandled(9, true));
  const { width, height, panel, dividers } = windowLayoutFacts(svg);
  assert.equal(dividers.length, 11, `expected 9 handled rows plus the more row (11 dividers), found ${dividers.length}`);
  for (let i = 0; i < 10; i++) {
    const top = dividers[i];
    const bottom = dividers[i + 1];
    assert.ok(top >= panel.y && bottom <= panel.bottom, `row ${i} range [${top}, ${bottom}] is not inside the panel [${panel.y}, ${panel.bottom}]`);
  }
  assert.ok(panel.x >= 0 && panel.right <= width, `panel x-range [${panel.x}, ${panel.right}] is not inside the viewBox width ${width}`);
  assert.ok(panel.y >= 0 && panel.bottom <= height, `panel y-range [${panel.y}, ${panel.bottom}] is not inside the viewBox height ${height}`);
});

test("the receipts seven-row window still computes the same 900x480 canvas and 318-tall inbox panel", () => {
  const spec = JSON.parse(readFileSync(join(examplesDir, "receipts", "receipts.hero.json"), "utf8"));
  const svg = render(spec);
  const { width, height, panel } = windowLayoutFacts(svg);
  assert.equal(width, 900, "the receipts canvas width must stay 900");
  assert.equal(height, 480, "the receipts canvas height must stay 480");
  assert.equal(panel.bottom - panel.y, 318, "the receipts inbox panel must stay 318 tall");
});

test("the icons doc lists exactly the icons the table has", () => {
  const doc = readFileSync(resolve(root, "references", "icons.md"), "utf8");
  const documented = new Set(
    doc
      .split("\n")
      .map((line) => /^([a-z][a-z-]*):/.exec(line.trim())?.[1])
      .filter(Boolean)
  );
  const known = new Set(Object.keys(ICONS));
  assert.deepEqual(documented, known, "references/icons.md and scripts/icons.mjs have drifted apart");
});

test("the Lucide licence notice is present in both the icon table and its doc", () => {
  const iconsSrc = readFileSync(resolve(root, "scripts", "icons.mjs"), "utf8");
  const iconsDoc = readFileSync(resolve(root, "references", "icons.md"), "utf8");
  for (const [label, text] of [["scripts/icons.mjs", iconsSrc], ["references/icons.md", iconsDoc]]) {
    assert.match(text, /simplified from Lucide/, `${label} is missing the "simplified from Lucide" notice`);
    assert.match(text, /ISC/, `${label} is missing the ISC licence mention`);
    assert.match(text, /lucide\.dev\/license/, `${label} is missing the licence link`);
  }
});

// Component modules (scripts/components/*.mjs): step one of the renderer's own refactor
// (components-plan.md) moved the shared drawing primitives out of the three style functions
// into small pure functions here, each taking explicit props and returning an SVG string (or
// an array of them, for the ones that build up several lines). The golden tests above already
// prove these produce byte-identical output for the real specs; this only proves each module
// is independently importable and that, given a minimal set of props, it draws the root tag
// its name promises.
test("esc escapes the five XML-special characters", () => {
  assert.equal(esc(`<a> & "b" 'c'`), "&lt;a&gt; &amp; &quot;b&quot; 'c'");
});

test("brandedText returns escaped text, or the brand word wrapped in a coloured tspan", () => {
  assert.equal(brandedText("Plain text", null, "brass"), "Plain text");
  assert.ok(brandedText("Hello World", "World", "brass").includes('<tspan class="brass">World</tspan>'));
});

const componentCases = [
  { name: "glyph", fn: () => glyph("mail", 0, 0, 20), tag: "<g" },
  { name: "themedGlyph", fn: () => themedGlyph("mail", 0, 0, 20, "i-navy"), tag: "<g" },
  { name: "rawGlyph", fn: () => rawGlyph("mail", 0, 0, 20, 'fill="none"'), tag: "<g" },
  { name: "svgHead", fn: () => svgHead({ width: 100, height: 100, title: "t" }).join("\n"), tag: "<svg" },
  { name: "okBadge", fn: () => okBadge(0, 0), tag: "<g" },
  { name: "flowCurve", fn: () => flowCurve({ x1: 0, y1: 0, c1x: 1, c1y: 1, c2x: 2, c2y: 2, x2: 3, y2: 3 }), tag: "<path" },
  { name: "ropeLink", fn: () => ropeLink({ x1: 0, y1: 0, c1x: 1, c1y: 1, c2x: 2, c2y: 2, x2: 3, y2: 3 }), tag: "<path" },
  { name: "grommet", fn: () => grommet(0, 0), tag: "<circle" },
  {
    name: "stackedSheet",
    fn: () => stackedSheet({ x: 0, y: 0, w: 10, h: 10, rx: 1, back2: { dx: 2, dy: 2, cls: "a" }, back1: { dx: 1, dy: 1, cls: "a" }, frontClass: "b" }).join("\n"),
    tag: "<rect",
  },
  { name: "flatCard", fn: () => flatCard({ x: 0, y: 0, icon: "mail", label: "L" }).join("\n"), tag: "<g" },
  { name: "chartHandledCard", fn: () => chartHandledCard({ cx: 0, cy: 0, w: 10, h: 10, tilt: 0, theme: "navy", icon: "mail", label: "L" }).join("\n"), tag: "<g" },
  { name: "chip", fn: () => chip({ x: 0, y: 0, icon: "mail", label: "L" }), tag: "<g" },
  { name: "chartHub", fn: () => chartHub({ cx: 0, cy: 0, r: 10, ring: 12, icon: "mail", label: "L" }).join("\n"), tag: "<g" },
  { name: "windowHandoffHub", fn: () => windowHandoffHub({ calRight: 0, arrowY: 0, label: "L" }).join("\n"), tag: "<path" },
  { name: "chartHeadlineBlock", fn: () => chartHeadlineBlock({ headline: "L", subhead: "S" }).join("\n"), tag: "<text" },
  { name: "windowHeadlineBlock", fn: () => windowHeadlineBlock({ headline: "L", subhead: "S" }).join("\n"), tag: "<text" },
  { name: "panelWithChrome", fn: () => panelWithChrome({ x: 0, y: 0, w: 10, h: 10, iconGlyph: "<rect/>", labelX: 0, label: "L" }).join("\n"), tag: "<rect" },
  { name: "listRow", fn: () => listRow({ x: 0, top: 0, icon: "mail", label: "L", w1: 1, w2: 1, rightX: 10 }).join("\n"), tag: "<g" },
  { name: "calendarGrid", fn: () => calendarGrid({ x: 0, top: 0 }).join("\n"), tag: "<g" },
];

for (const { name, fn, tag } of componentCases) {
  test(`the ${name} component returns a string with its root tag for a minimal props object`, () => {
    const out = fn();
    assert.equal(typeof out, "string");
    assert.ok(out.includes(tag), `expected ${name}'s output to include "${tag}", got: ${out}`);
  });
}

// End-to-end: actually spawns `node scripts/figurehead.mjs check`, the way a real caller would, rather than
// calling an imported function. This is what caught the module ever having deadlocked on Node's own top-level
// await warning (exit code 13) instead of running the checks and exiting 0 or 1.
//
// scripts/check.mjs is owned by another PR; on this branch alone it may not exist yet. When it is absent the
// contract says the CLI itself prints one line and exits 2 (covered by the CLI usage above), and there is
// nothing to run this end-to-end test against, so it is skipped with a message explaining why. Once both PRs
// share a branch (or land on main together) `checksInstalled` is true and this test runs for real.
test(
  "the check subcommand exits 0 on a passing pair and 1 on a failing pair, printing tab-separated findings",
  { skip: !checksInstalled && "scripts/check.mjs is not on this branch yet (it lands in a separate PR); this test runs for real once both are merged" },
  () => {
    const passing = spawnSync(process.execPath, [cliPath, "check", join(examplesDir, "readmerlin", "readmerlin.hero.json"), join(examplesDir, "readmerlin", "readmerlin.svg"), "--repo", root], {
      encoding: "utf8",
    });
    assert.equal(passing.status, 0, `expected exit 0 on a passing pair, got ${passing.status}. stderr: ${passing.stderr}`);
    for (const line of passing.stdout.split("\n").filter(Boolean)) {
      assert.equal(line.split("\t").length, 4, `expected id/level/message/repair, got: ${line}`);
    }

    // Built inline, never a committed example: a copy of readmerlin's real spec with an invalid style and an
    // unknown field, guaranteed to fail spec/shape regardless of what any example currently looks like.
    const dir = mkdtempSync(join(tmpdir(), "figurehead-check-"));
    const badSpecPath = join(dir, "bad.hero.json");
    try {
      const spec = JSON.parse(readFileSync(join(examplesDir, "readmerlin", "readmerlin.hero.json"), "utf8"));
      spec.style = "not-a-real-style";
      spec.notAKnownField = true;
      writeFileSync(badSpecPath, JSON.stringify(spec));

      const failing = spawnSync(process.execPath, [cliPath, "check", badSpecPath, join(examplesDir, "readmerlin", "readmerlin.svg")], { encoding: "utf8" });
      assert.equal(failing.status, 1, `expected exit 1 on a failing pair, got ${failing.status}. stderr: ${failing.stderr}`);
      const lines = failing.stdout.split("\n").filter(Boolean);
      assert.ok(lines.length > 0, "expected at least one finding line for a spec with an invalid style and an unknown field");
      for (const line of lines) {
        assert.equal(line.split("\t").length, 4, `expected id/level/message/repair, got: ${line}`);
      }
      assert.ok(lines.some((l) => l.split("\t")[1] === "fail"), "expected at least one fail-level finding");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
);
