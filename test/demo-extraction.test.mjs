// The extraction demo is the archetype's acceptance test: the whole loop —
// redaction self-test, schema validation, field accuracy, fabrication and
// abstention — must run offline, with no API key, and judge both the faithful
// and the fabricating system correctly.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "dist", "cli.js");

function runDemo(env = {}) {
  return spawnSync(process.execPath, [CLI, "check", "--dir", "demo-extraction"], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("extraction demo passes offline: full field accuracy, correct abstentions, valid schemas", () => {
  const res = runDemo({ DEMO_FABRICATE: "" });
  assert.equal(res.status, 0, res.stdout + res.stderr);
  assert.match(res.stdout, /✓ redaction/);
  assert.match(res.stdout, /✓ extraction\s+PASS/);
  assert.match(res.stdout, /field_accuracy\s+100\.0%/);
  assert.match(res.stdout, /fabricated_fields\s+0/);
  assert.match(res.stdout, /schema_failures\s+0/);
  assert.match(res.stdout, /abstention_rate\s+100\.0%/);
});

test("extraction demo:break fails loudly: the guessed date of birth and dropped required field are named", () => {
  const res = runDemo({ DEMO_FABRICATE: "1" });
  assert.equal(res.status, 1, res.stdout + res.stderr);
  assert.match(res.stdout, /✗ extraction\s+FAIL/);
  assert.match(res.stdout, /FABRICATED field "date_of_birth": document does not state it/);
  assert.match(res.stdout, /SCHEMA: \/referral_date must be string/);
  assert.match(res.stdout, /Extraction check FAILED/);
});
