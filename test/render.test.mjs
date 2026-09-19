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
