// Exercises scripts/check.mjs's CLI (runCli) directly, in this process, rather than by spawning
// `node scripts/check.mjs ...`: a spawned child's own coverage instrumentation would land in the
// same NODE_V8_COVERAGE directory as this process's and reintroduce the run-to-run variance
// test/check.test.mjs's NO_COVERAGE_ENV note describes. test/check.test.mjs keeps its spawnSync
// CLI tests (unmeasured) for genuine process-boundary behaviour; every branch inside runCli is
// covered here instead, deterministically.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { runCli } from "../scripts/check.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readmerlinSpecPath = resolve(root, "examples/readmerlin/readmerlin.hero.json");
const readmerlinSvgPath = resolve(root, "examples/readmerlin/readmerlin.svg");

// See test/figurehead-cli.test.mjs's own runCliCaptured for the same reasoning: captures
// console.log/console.error and process.exitCode around one runCli() call, then restores all
// three exactly, so a direct in-process call never leaks output or a stray exit code into the
// real test run's own result.
async function runCliCaptured(argv) {
  const log = [];
  const error = [];
  const realLog = console.log;
  const realError = console.error;
  const savedExitCode = process.exitCode;
  process.exitCode = undefined;
  console.log = (...args) => log.push(args.join(" "));
  console.error = (...args) => error.push(args.join(" "));
  try {
    await runCli(argv);
    return { exitCode: process.exitCode, log, error };
  } finally {
    console.log = realLog;
    console.error = realError;
    process.exitCode = savedExitCode;
  }
}

test("runCli prints usage and sets exit code 2 when no arguments at all are given", async () => {
  const res = await runCliCaptured([]);
  assert.equal(res.exitCode, 2);
  assert.ok(res.error.some((l) => /^usage: node scripts\/check\.mjs/.test(l)));
});

test("runCli prints usage and sets exit code 2 when only a spec path is given", async () => {
  const res = await runCliCaptured([readmerlinSpecPath]);
  assert.equal(res.exitCode, 2);
});

test("runCli exits 0 and prints nothing but findings for a passing pair", async () => {
  const res = await runCliCaptured([readmerlinSpecPath, readmerlinSvgPath]);
  assert.equal(res.exitCode, 0);
  assert.deepEqual(res.log, []);
  assert.deepEqual(res.error, []);
});

test("runCli exits 1 and prints a tab-separated fail line for a failing pair", async () => {
  const dir = mkdtempSync(join(tmpdir(), "figurehead-checkcli-"));
  try {
    const spec = JSON.parse(readFileSync(readmerlinSpecPath, "utf8"));
    spec.style = "not-a-real-style";
    const badSpecPath = join(dir, "bad.hero.json");
    writeFileSync(badSpecPath, JSON.stringify(spec));
    const res = await runCliCaptured([badSpecPath, readmerlinSvgPath]);
    assert.equal(res.exitCode, 1);
    assert.ok(res.log.some((l) => l.split("\t")[1] === "fail"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runCli's --repo flag is threaded through to check(), running register/reader-nouns", async () => {
  const res = await runCliCaptured([readmerlinSpecPath, readmerlinSvgPath, "--repo", root]);
  assert.equal(res.exitCode, 0);
});
