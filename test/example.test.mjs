// The Claude-backed example must run its full loop offline via the mock API:
// adapter → answer → grounding gate → usage sidecar → cost. Live runs (real
// ANTHROPIC_API_KEY) are the user's to make; CI proves the plumbing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS = join(ROOT, "examples", "claude-doc-qa", "groundwork", "results");

test("example passes offline against the mock API, capturing usage", () => {
  rmSync(RESULTS, { recursive: true, force: true });

  const res = spawnSync(
    process.execPath,
    [join(ROOT, "examples", "claude-doc-qa", "run-mock.mjs")],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /✓ grounding\s+PASS/);
  assert.match(res.stdout, /n_cases\s+6/);
  assert.match(res.stdout, /abstention_rate\s+100\.0%/);

  const usageFiles = readdirSync(RESULTS).filter((n) => n.startsWith("usage."));
  assert.equal(usageFiles.length, 1, "adapter should write one usage sidecar per run");
  const usage = JSON.parse(readFileSync(join(RESULTS, usageFiles[0]), "utf8")).usage;
  assert.equal(usage.calls, 6);
  assert.ok(usage.prompt_tokens > 0 && usage.completion_tokens > 0);
});

test("example respects its committed baseline (check --ci)", (t) => {
  const baseline = join(RESULTS, "baseline.claude-doc-qa.json");
  if (!existsSync(baseline)) {
    t.skip("no committed baseline yet — freeze one with check --baseline");
    return;
  }
  const res = spawnSync(
    process.execPath,
    [join(ROOT, "examples", "claude-doc-qa", "run-mock.mjs"), "--ci"],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(res.status, 0, res.stdout + res.stderr);
});

test("cost reads the example's captured usage and leads with prompt caching", () => {
  assert.ok(existsSync(RESULTS), "run after the mock check test");
  const res = spawnSync(
    process.execPath,
    [join(ROOT, "dist", "cli.js"), "cost", "--dir", "examples/claude-doc-qa"],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /prompt tokens\s+[\d,]+/);
  assert.match(res.stdout, /1\. Prompt caching/);
});
