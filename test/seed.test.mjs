// The two goldens the seed renderer already reproduces. The renderer builder
// replaces this file with test/render.test.mjs covering every example.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { render } from "../scripts/figurehead.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const goldens = ["readmerlin", "tidy-inbox"];

for (const name of goldens) {
  test(`examples/${name}/${name}.svg is what its spec draws`, () => {
    const spec = JSON.parse(readFileSync(resolve(root, "examples", name, `${name}.hero.json`), "utf8"));
    const svg = readFileSync(resolve(root, "examples", name, `${name}.svg`), "utf8");
    assert.equal(render(spec), svg, `examples/${name}/${name}.svg has drifted from its spec`);
  });
}

test("an icon the renderer does not know is refused by name", () => {
  assert.throws(
    () => render({ title: "t", sources: [{ label: "a", icon: "nope" }], handled: [], deliverable: { label: "x" } }),
    /Unknown icon/
  );
});
