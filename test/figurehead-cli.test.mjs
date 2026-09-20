// Exercises scripts/figurehead.mjs's CLI (runCli and reportFatal) directly, in this process,
// rather than by spawning `node scripts/figurehead.mjs ...`: a spawned child's own coverage
// instrumentation would land in the same NODE_V8_COVERAGE directory as this process's and
// reintroduce the run-to-run variance test/render.test.mjs's NO_COVERAGE_ENV note describes.
// render.test.mjs keeps one real end-to-end spawnSync smoke test (unmeasured) for genuine
// process-boundary behaviour (module linking, real argv, real exit codes); every branch inside
// runCli is covered here instead, deterministically.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { runCli, reportFatal } from "../scripts/figurehead.mjs";
import { check } from "../scripts/check.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tidyInboxSpecPath = resolve(root, "examples/tidy-inbox/tidy-inbox.hero.json");
const tidyInboxSvgPath = resolve(root, "examples/tidy-inbox/tidy-inbox.svg");
const readmerlinSpecPath = resolve(root, "examples/readmerlin/readmerlin.hero.json");
const readmerlinSvgPath = resolve(root, "examples/readmerlin/readmerlin.svg");

// Captures console.log/console.error/process.stdout.write and process.exitCode around one
// runCli() call, then restores all four exactly, so a direct in-process call never leaks output
// or a stray exit code into the real test run's own result.
async function runCliCaptured(argv, opts) {
  const log = [];
  const error = [];
  const stdout = [];
  const realLog = console.log;
  const realError = console.error;
  const realWrite = process.stdout.write.bind(process.stdout);
  const savedExitCode = process.exitCode;
  process.exitCode = undefined;
  console.log = (...args) => log.push(args.join(" "));
  console.error = (...args) => error.push(args.join(" "));
  process.stdout.write = (chunk) => {
    stdout.push(chunk);
    return true;
  };
  try {
    await runCli(argv, opts);
    return { exitCode: process.exitCode, log, error, stdout: stdout.join("") };
  } finally {
    console.log = realLog;
    console.error = realError;
    process.stdout.write = realWrite;
    process.exitCode = savedExitCode;
  }
}

// ---------------------------------------------------------------------------
// usage()
// ---------------------------------------------------------------------------

test("runCli prints usage and sets exit code 2 for an unrecognised command", async () => {
  const res = await runCliCaptured(["frobnicate"]);
  assert.equal(res.exitCode, 2);
  assert.ok(res.error.some((l) => /^usage: figurehead\.mjs render/.test(l)));
  assert.equal(res.error.length, 3, "usage() prints all three of its lines");
});

test("runCli prints usage and sets exit code 2 for no command at all", async () => {
  const res = await runCliCaptured([]);
  assert.equal(res.exitCode, 2);
});

// ---------------------------------------------------------------------------
// render
// ---------------------------------------------------------------------------

test("runCli's render subcommand prints usage and sets exit code 2 when no spec file is given", async () => {
  const res = await runCliCaptured(["render"]);
  assert.equal(res.exitCode, 2);
  assert.ok(res.error.some((l) => /^usage:/.test(l)));
});

test("runCli's render subcommand writes the rendered SVG to stdout when --out is not given", async () => {
  const res = await runCliCaptured(["render", tidyInboxSpecPath]);
  assert.equal(res.exitCode, undefined);
  assert.match(res.stdout, /<svg\b/);
  assert.match(res.stdout, /<\/svg>/);
});

test("runCli's render subcommand writes the rendered SVG to the --out file, skipping its value as a positional", async () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-cli-render-"));
  try {
    const outPath = join(dir, "out.svg");
    const res = await runCliCaptured(["render", tidyInboxSpecPath, "--out", outPath]);
    assert.equal(res.exitCode, undefined);
    assert.equal(res.stdout, "", "the SVG went to the file, not stdout");
    const written = readFileSync(outPath, "utf8");
    assert.match(written, /<svg\b/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// check
// ---------------------------------------------------------------------------

test("runCli's check subcommand prints usage and sets exit code 2 with no arguments at all", async () => {
  const res = await runCliCaptured(["check"]);
  assert.equal(res.exitCode, 2);
});

test("runCli's check subcommand prints usage and sets exit code 2 when only a spec file is given", async () => {
  const res = await runCliCaptured(["check", tidyInboxSpecPath]);
  assert.equal(res.exitCode, 2);
});

test("runCli's check subcommand prints \"not installed yet\" and sets exit code 2 when importCheck rejects", async () => {
  const res = await runCliCaptured(["check", tidyInboxSpecPath, tidyInboxSvgPath], {
    importCheck: () => Promise.reject(new Error("simulated: scripts/check.mjs is missing")),
  });
  assert.equal(res.exitCode, 2);
  assert.ok(res.error.some((l) => /the checks are not installed yet/.test(l)));
});

test("runCli's check subcommand exits 0 and prints nothing but findings for a passing pair", async () => {
  const res = await runCliCaptured(["check", readmerlinSpecPath, readmerlinSvgPath], { importCheck: () => Promise.resolve({ check }) });
  assert.equal(res.exitCode, 0);
});

test("runCli's check subcommand exits 1 and prints a tab-separated fail line for a failing pair", async () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-cli-check-"));
  try {
    const spec = JSON.parse(readFileSync(readmerlinSpecPath, "utf8"));
    spec.style = "not-a-real-style";
    const badSpecPath = join(dir, "bad.hero.json");
    writeFileSync(badSpecPath, JSON.stringify(spec));
    const res = await runCliCaptured(["check", badSpecPath, readmerlinSvgPath], { importCheck: () => Promise.resolve({ check }) });
    assert.equal(res.exitCode, 1);
    assert.ok(res.log.some((l) => l.split("\t")[1] === "fail"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runCli's check subcommand passes --repo through to check()", async () => {
  const res = await runCliCaptured(["check", readmerlinSpecPath, readmerlinSvgPath, "--repo", root], { importCheck: () => Promise.resolve({ check }) });
  assert.equal(res.exitCode, 0);
});

test("runCli's check subcommand reaches scripts/check.mjs through its own default import when no importCheck override is given", async () => {
  // Every other check test above injects importCheck so it can force the "not installed yet"
  // branch without deleting the real file; this is the one test that lets runCli's own default
  // (importCheckModule, a real dynamic import of ./check.mjs) run for real.
  const res = await runCliCaptured(["check", readmerlinSpecPath, readmerlinSvgPath]);
  assert.equal(res.exitCode, 0);
});

// ---------------------------------------------------------------------------
// goldens
// ---------------------------------------------------------------------------

test("runCli's goldens subcommand skips a non-directory entry, rebuilds a valid example, and silently skips a directory with no spec (ENOENT)", async () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-cli-goldens-"));
  try {
    // A stray file directly inside examplesDir: not a directory, so the loop must `continue`
    // past it rather than treat it as an example.
    writeFileSync(join(dir, "README.txt"), "not an example");

    // A real, valid example: exercises the write + console.log success path.
    mkdirSync(join(dir, "good"));
    const spec = JSON.parse(readFileSync(tidyInboxSpecPath, "utf8"));
    writeFileSync(join(dir, "good", "good.hero.json"), JSON.stringify(spec));

    // A directory whose name.hero.json does not exist at all: readFileSync throws ENOENT,
    // which the loop must swallow (no throw, nothing logged) rather than propagate.
    mkdirSync(join(dir, "missing-spec"));

    const res = await runCliCaptured(["goldens"], { examplesDir: dir });
    assert.equal(res.exitCode, undefined);
    assert.ok(res.log.some((l) => l === "rendered examples/good/good.svg"));
    assert.ok(!res.log.some((l) => l.includes("missing-spec")));
    const written = readFileSync(join(dir, "good", "good.svg"), "utf8");
    assert.match(written, /<svg\b/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runCli's goldens subcommand rethrows a non-ENOENT error instead of swallowing it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-cli-goldens-badjson-"));
  try {
    mkdirSync(join(dir, "broken"));
    // Malformed JSON: JSON.parse throws a SyntaxError, which has no "code" property at all
    // (so it is not "ENOENT"), and the loop's own contract is to rethrow anything that isn't.
    writeFileSync(join(dir, "broken", "broken.hero.json"), "{ not valid json");
    await assert.rejects(() => runCliCaptured(["goldens"], { examplesDir: dir }), /Unexpected token|JSON/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// reportFatal
// ---------------------------------------------------------------------------

test("reportFatal prints a real Error's own stack and sets exit code 1", () => {
  const realError = console.error;
  const savedExitCode = process.exitCode;
  const error = [];
  console.error = (...args) => error.push(args.join(" "));
  try {
    reportFatal(new Error("boom"));
    assert.equal(process.exitCode, 1);
    assert.ok(error[0].includes("boom"));
    assert.ok(error[0].includes("Error"), "a real Error prints its own stack, not just its message");
  } finally {
    console.error = realError;
    process.exitCode = savedExitCode;
  }
});

test("reportFatal falls back to String(err) and sets exit code 1 when the rejection reason has no stack", () => {
  const realError = console.error;
  const savedExitCode = process.exitCode;
  const error = [];
  console.error = (...args) => error.push(args.join(" "));
  try {
    reportFatal("a plain string rejection reason");
    assert.equal(process.exitCode, 1);
    assert.deepEqual(error, ["a plain string rejection reason"]);
  } finally {
    console.error = realError;
    process.exitCode = savedExitCode;
  }
});
