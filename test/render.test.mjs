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
