// The demo IS the v1 acceptance test: the whole loop — redaction self-test,
// grounding eval, honest exit codes — must run offline, with no API key, and
// judge both the well-behaved and the fabricating system correctly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "dist", "cli.js");

function runDemo(env = {}) {
  return spawnSync(process.execPath, [CLI, "check", "--dir", "demo"], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("demo passes offline: full recall, full abstention, no ungrounded numbers", () => {
  const res = runDemo({ DEMO_FABRICATE: "" });
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /✓ redaction/);
  assert.match(res.stdout, /✓ grounding\s+PASS/);
  assert.match(res.stdout, /answer_recall\s+100\.0%/);
  assert.match(res.stdout, /abstention_rate\s+100\.0%/);
  assert.match(res.stdout, /ungrounded_numbers\s+0/);
});

test("demo:break fails loudly: fabricated figures and missed abstentions are named", () => {
  const res = runDemo({ DEMO_FABRICATE: "1" });
  assert.equal(res.status, 1, res.stdout + res.stderr);
  assert.match(res.stdout, /✗ grounding\s+FAIL/);
  assert.match(res.stdout, /ungrounded number "14"/);
  assert.match(res.stdout, /did not abstain/);
});
