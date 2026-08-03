// Adapter for the Claude-backed example. Same one-file boundary as the
// scaffolded adapter, with two additions worth stealing for your own:
//
//   • Key-gated availability — without ANTHROPIC_API_KEY the grounding eval
//     skips with a clear hint instead of failing with a cryptic 401.
//   • Usage capture — token usage from every Claude response is accumulated
//     and written as a sidecar file into the results dir, which is where
//     `groundwork cost` reads real numbers from. tokenTotals()/resetTokens()
//     are also exported for eval harnesses that collect usage themselves.

export const meta = { name: "claude-doc-qa" };

export const onlineAvailable = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_BASE_URL);
export const onlineConfigHint = () =>
  "Set ANTHROPIC_API_KEY to run the grounding eval against Claude " +
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
  // Sidecar into the results dir: `groundwork cost` sums usage blocks from
  // every JSON file it finds there.
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(
    join(RESULTS_DIR, `usage.${RUN_STAMP}.json`),
    JSON.stringify(
      { note: "token usage recorded by the claude-doc-qa adapter", usage: _totals },
      null,
      2
    ) + "\n"
  );
}

// ---------------------------------------------------------------------------
// The system: Claude, answer-from-document-only (see ../system.mjs)
// ---------------------------------------------------------------------------
import { askClaude } from "../system.mjs";

export async function answer({ question, context }) {
  const ctx = Array.isArray(context) ? context.join("\n") : String(context ?? "");
  const safeQuestion = await redactIfEnabled(question);
  const safeContext = await redactIfEnabled(ctx);

  const { text, usage } = await askClaude({
    question: safeQuestion,
    context: safeContext,
  });
  recordUsage(usage);
  return { text };
}
