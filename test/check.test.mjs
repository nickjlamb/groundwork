import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { loadConfig } = await import("../dist/lib/config.js");
const { runInit } = await import("../dist/commands/init.js");
const { runRedactionSelfTest } = await import("../dist/lib/redaction-selftest.js");

test("loadConfig fails helpfully when init hasn't been run", () => {
  const dir = mkdtempSync(join(tmpdir(), "gw-noinit-"));
  assert.throws(() => loadConfig(dir), /groundwork init/);
});

test("loadConfig reads a scaffolded config", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gw-cfg-"));
  await runInit({ dir, force: false });
  const config = loadConfig(dir);
  assert.equal(config.archetype, "document-qa");
  assert.equal(config.redaction.enabled, true);
  assert.equal(config.review.humanInLoop, true);
});

test("redaction self-test passes on a scaffolded repo and strips identifiers", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gw-redact-"));
  await runInit({ dir, force: false });
  const result = await runRedactionSelfTest(dir, loadConfig(dir));
  assert.equal(result.enabled, true);
  assert.deepEqual(result.failures, []);
  assert.equal(result.passed, true);
});

test("redaction self-test is skipped-but-honest when disabled", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gw-redoff-"));
  await runInit({ dir, force: false });
  const config = loadConfig(dir);
  config.redaction.enabled = false;
  const result = await runRedactionSelfTest(dir, config);
  assert.equal(result.enabled, false);
  assert.equal(result.passed, true);
});
