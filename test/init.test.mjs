import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { initFiles, runInit } = await import("../dist/commands/init.js");

test("initFiles returns the full scaffold with the project name interpolated", () => {
  const files = initFiles("test-project");
  const paths = files.map((f) => f.path).sort();

  for (const expected of [
    "GROUNDWORK.md",
    ".github/workflows/groundwork.yml",
    "groundwork/adapter.mjs",
    "groundwork/groundwork.config.json",
    "groundwork/redaction.config.json",
    "groundwork/datasets/LABELLING.md",
    "groundwork/datasets/cases/_template.json",
    "groundwork/datasets/cases/example-unanswerable.json",
  ]) {
    assert.ok(paths.includes(expected), `missing ${expected}`);
  }

  const playbook = files.find((f) => f.path === "GROUNDWORK.md");
  assert.match(playbook.content, /test-project/);
  assert.doesNotMatch(playbook.content, /\{\{PROJECT_NAME\}\}/);

  // every JSON template must parse
  for (const f of files.filter((x) => x.path.endsWith(".json"))) {
    assert.doesNotThrow(() => JSON.parse(f.content), `${f.path} is not valid JSON`);
  }
});

test("the honest-limits stance is present in the scaffolded playbook", () => {
  const playbook = initFiles("x").find((f) => f.path === "GROUNDWORK.md");
  assert.match(playbook.content, /strong floor, not a guarantee/);
  assert.match(playbook.content, /human/i);
});

test("runInit writes files and never overwrites without force", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gw-init-"));
  await runInit({ dir, force: false });
  assert.ok(existsSync(join(dir, "GROUNDWORK.md")));
  assert.ok(existsSync(join(dir, "groundwork/adapter.mjs")));
  assert.ok(existsSync(join(dir, ".github/workflows/groundwork.yml")));

  // second run must not clobber a user edit
  const configPath = join(dir, "groundwork/groundwork.config.json");
  writeFileSync(configPath, '{"edited": true}');
  await runInit({ dir, force: false });
  assert.equal(JSON.parse(readFileSync(configPath, "utf8")).edited, true);
});

test("runInit picks up the project name from package.json", async () => {
  const dir = mkdtempSync(join(tmpdir(), "gw-name-"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "acme-docqa" }));
  await runInit({ dir, force: false });
  const adapter = readFileSync(join(dir, "groundwork/adapter.mjs"), "utf8");
  assert.match(adapter, /acme-docqa/);
});
