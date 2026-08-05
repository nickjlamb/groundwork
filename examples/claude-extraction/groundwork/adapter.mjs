// Adapter for the Claude-backed extraction example. Same one-file boundary as
// the scaffolded adapter, with two additions worth stealing for your own:
//
//   • Key-gated availability — without ANTHROPIC_API_KEY the extraction eval
//     skips with a clear hint instead of failing with a cryptic 401.
//   • Usage capture — token usage from every Claude response is accumulated
//     and written as a sidecar file into the results dir, which is where
//     `groundwork cost` reads real numbers from.

export const meta = { name: "claude-extraction" };

export const onlineAvailable = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_BASE_URL);
export const onlineConfigHint = () =>
  "Set ANTHROPIC_API_KEY to run the extraction eval against Claude " +
  "(a full run costs well under a penny with the default haiku model).";

// ---------------------------------------------------------------------------
// Redaction pre-step (same pattern as the scaffolded adapter)
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

let _redactor = null;
async function redactIfEnabled(text) {
  const config = JSON.parse(
    readFileSync(join(HERE, "groundwork.config.json"), "utf8")
  );
  if (!config.redaction?.enabled) return text;
  if (_redactor === null) {
    const { Redactor } = await import("@pharmatools/redacta");
    const redactionConfig = JSON.parse(
      readFileSync(join(HERE, "redaction.config.json"), "utf8")
    );
    _redactor = new Redactor(redactionConfig.categories);
  }
  return _redactor.redactText(String(text)).text;
}

// ---------------------------------------------------------------------------
// Usage capture — real numbers for `groundwork cost`
// ---------------------------------------------------------------------------
const RESULTS_DIR = join(HERE, "results");
const RUN_STAMP = new Date().toISOString().replace(/[:.]/g, "-");

let _totals = {
  prompt_tokens: 0,
  completion_tokens: 0,
  reasoning_tokens: 0,
  total_tokens: 0,
  calls: 0,
};

export function resetTokens() {
  _totals = { prompt_tokens: 0, completion_tokens: 0, reasoning_tokens: 0, total_tokens: 0, calls: 0 };
}
export function tokenTotals() {
  return { ..._totals };
}

function recordUsage(usage) {
  _totals.prompt_tokens += usage.prompt_tokens;
  _totals.completion_tokens += usage.completion_tokens;
  _totals.total_tokens += usage.total_tokens;
  _totals.calls += 1;
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(RESULTS_DIR, `usage.${RUN_STAMP}.json`),
    JSON.stringify(
      { note: "token usage recorded by the claude-extraction adapter", usage: _totals },
      null,
      2
    ) + "\n"
  );
}

// ---------------------------------------------------------------------------
// The system: Claude, schema-following, unknown → null (see ../system.mjs)
// ---------------------------------------------------------------------------
import { extractClaude } from "../system.mjs";

export async function extract({ document, schema }) {
  const safeDocument = await redactIfEnabled(String(document ?? ""));
  const { record, usage } = await extractClaude({ document: safeDocument, schema });
  recordUsage(usage);
  return { record };
}
