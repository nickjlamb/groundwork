// The Claude-backed extraction example must run its full loop offline via the
// mock API: adapter → extract → schema + field gates → usage sidecar. Live
// runs (real ANTHROPIC_API_KEY) are the user's to make; CI proves the
// plumbing — including that a model which guesses gets caught.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RESULTS = join(ROOT, "examples", "claude-extraction", "groundwork", "results");

function runMock(args = [], env = {}) {
  return spawnSync(
    process.execPath,
    [join(ROOT, "examples", "claude-extraction", "run-mock.mjs"), ...args],
    { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env } }
  );
}

test("extraction example passes offline against the mock API, capturing usage", () => {
  // Clear old run artifacts but NEVER baseline.* — those are committed, and
  // deleting them would silently disable the --ci regression gate below.
  if (existsSync(RESULTS)) {
    for (const name of readdirSync(RESULTS)) {
      if (!name.startsWith("baseline.")) rmSync(join(RESULTS, name), { force: true });
    }
  }

  const res = runMock([], { MOCK_FABRICATE: "" });
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /✓ extraction\s+PASS/);
  assert.match(res.stdout, /n_cases\s+3/);
  assert.match(res.stdout, /field_accuracy\s+100\.0%/);
  assert.match(res.stdout, /fabricated_fields\s+0/);
  assert.match(res.stdout, /schema_failures\s+0/);
  assert.match(res.stdout, /abstention_rate\s+100\.0%/);

  const usageFiles = readdirSync(RESULTS).filter((n) => n.startsWith("usage."));
  assert.equal(usageFiles.length, 1, "adapter should write one usage sidecar per run");
  const usage = JSON.parse(readFileSync(join(RESULTS, usageFiles[0]), "utf8")).usage;
  assert.equal(usage.calls, 3);
  assert.ok(usage.prompt_tokens > 0 && usage.completion_tokens > 0);
});

test("extraction example respects its committed baseline (check --ci)", (t) => {
  const baseline = join(RESULTS, "baseline.claude-extraction.json");
  if (!existsSync(baseline)) {
    t.skip("no committed baseline yet — freeze one with check --baseline");
    return;
  }
  const res = runMock(["--ci"], { MOCK_FABRICATE: "" });
  assert.equal(res.status, 0, res.stdout + res.stderr);
});

test("a guessing model fails: the invented date of birth is named per case", () => {
  const res = runMock([], { MOCK_FABRICATE: "1" });
  assert.equal(res.status, 1, res.stdout + res.stderr);
  assert.match(res.stdout, /✗ extraction\s+FAIL/);
  assert.match(res.stdout, /FABRICATED field "date_of_birth": document does not state it/);
  assert.match(res.stdout, /Extraction check FAILED/);
});
