// Bundles scripts/check.mjs into one file with esbuild, copies only that file to an empty folder,
// and runs it with node alone, the way a consumer that vendors the bundle would. esbuild is
// fetched with npx while this test runs (the repository itself gains no dependency). If esbuild
// cannot be fetched or exits non-zero, the test fails and prints esbuild's output; it never skips.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const specPath = resolve(root, "examples/pierless/pierless.hero.json");
const svgPath = resolve(root, "examples/pierless/pierless.svg");
const BANNER = 'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);';
// A spawned child's own coverage output would add run-to-run variance (see test/check.test.mjs).
const CHILD_ENV = { ...process.env, NODE_V8_COVERAGE: "" };

let buildDir;
let runDir;
let bundlePath;

before(() => {
  buildDir = mkdtempSync(join(tmpdir(), "figurehead-bundle-build-"));
  runDir = mkdtempSync(join(tmpdir(), "figurehead-bundle-run-"));
  const built = join(buildDir, "check.bundle.mjs");
  const res = spawnSync(
    "npx",
    ["--yes", "esbuild@0.28.2", resolve(root, "scripts/check.mjs"), "--bundle", "--platform=node", "--format=esm", "--target=node20", `--banner:js=${BANNER}`, `--outfile=${built}`],
    { cwd: root, encoding: "utf8", env: CHILD_ENV },
  );
  assert.equal(res.status, 0, `esbuild did not build the bundle:\n${res.stdout}\n${res.stderr}`);
  bundlePath = join(runDir, "check.bundle.mjs");
  copyFileSync(built, bundlePath);
});

after(() => {
  rmSync(buildDir, { recursive: true, force: true });
  rmSync(runDir, { recursive: true, force: true });
});

function runBundle(spec) {
  return spawnSync("node", [bundlePath, spec, svgPath], { cwd: runDir, encoding: "utf8", env: CHILD_ENV });
}

test("the bundle is the only file in its folder, and it checks the pierless sample with exit code 0 and only check output", () => {
  assert.deepEqual(readdirSync(runDir), ["check.bundle.mjs"]);
  const res = runBundle(specPath);
  assert.equal(res.status, 0, res.stdout + res.stderr);
  // Only check output: no SVG from the render command line, no usage text.
  assert.equal(res.stderr, "");
  for (const line of res.stdout.split("\n").filter(Boolean)) assert.equal(line.split("\t").length, 4, line);
});

test("the bundle exits non-zero and prints a spec/shape fail for a spec with a field the schema does not allow", () => {
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  spec.notAField = "x";
  const badPath = join(buildDir, "bad.hero.json");
  writeFileSync(badPath, JSON.stringify(spec));
  const res = runBundle(badPath);
  assert.notEqual(res.status, 0);
  assert.ok(res.stdout.split("\n").some((l) => l.startsWith("spec/shape\tfail\t")), res.stdout + res.stderr);
});
