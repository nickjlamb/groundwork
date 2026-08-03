// `groundwork cost` — read token usage from eval runs and recommend the cheap
// wins in leverage order. Honest scope: these are heuristics from measured
// usage, not a bill audit. Measure first; optimise second.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, resolveFromRepo } from "../lib/config.js";

export interface CostOptions {
  dir: string;
}

interface Usage {
  prompt: number;
  completion: number;
  total: number;
  calls: number;
}

/** Recursively sum any { prompt_tokens, completion_tokens, … } blocks found. */
function collectUsage(node: unknown, acc: Usage): void {
  if (Array.isArray(node)) {
    for (const item of node) collectUsage(item, acc);
    return;
  }
  if (node === null || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const prompt = obj["prompt_tokens"];
  const completion = obj["completion_tokens"];
  if (typeof prompt === "number" || typeof completion === "number") {
    acc.prompt += typeof prompt === "number" ? prompt : 0;
    acc.completion += typeof completion === "number" ? completion : 0;
    acc.total +=
      typeof obj["total_tokens"] === "number"
        ? (obj["total_tokens"] as number)
        : (typeof prompt === "number" ? prompt : 0) +
          (typeof completion === "number" ? completion : 0);
    acc.calls += typeof obj["calls"] === "number" ? (obj["calls"] as number) : 1;
  }
  for (const value of Object.values(obj)) collectUsage(value, acc);
}

export async function runCost(opts: CostOptions): Promise<number> {
  const out = process.stdout;
  const config = loadConfig(opts.dir);
  const resultsDir = resolveFromRepo(opts.dir, config.eval.results);

  const usage: Usage = { prompt: 0, completion: 0, total: 0, calls: 0 };
  let runs = 0;

  if (existsSync(resultsDir)) {
    for (const name of readdirSync(resultsDir).filter((n) => n.endsWith(".json"))) {
      try {
        collectUsage(JSON.parse(readFileSync(join(resultsDir, name), "utf8")), usage);
        runs++;
      } catch {
        /* unreadable file — skip */
      }
    }
  }

  out.write(`\ngroundwork cost — ${config.project}\n\n`);

  if (usage.total === 0) {
    out.write(
      `No token usage found in ${config.eval.results} yet.\n\n` +
        `Usage is captured when your adapter reports it — return a\n` +
        `\`usage: { prompt_tokens, completion_tokens }\` block from your API and\n` +
        `implement the optional tokenTotals() export (see OpenGATE's ADAPTERS.md).\n` +
        `Then re-run \`groundwork check\` and come back.\n\n`
    );
  } else {
    const ratio = usage.completion > 0 ? usage.prompt / usage.completion : Infinity;
    out.write(`  measured across ${runs} run file(s):\n`);
    out.write(`    prompt tokens      ${usage.prompt.toLocaleString()}\n`);
    out.write(`    completion tokens  ${usage.completion.toLocaleString()}\n`);
    out.write(`    total              ${usage.total.toLocaleString()}\n\n`);
    if (ratio >= 3) {
      out.write(
        `  Your prompt:completion ratio is ${ratio.toFixed(1)}:1 — typical for\n` +
          `  document QA, where the same documents are re-sent with every question.\n`
      );
    }
  }

  out.write(
    `Recommendations, in leverage order (highest saving, lowest risk first):\n\n` +
      `  1. Prompt caching — for document QA this is usually the single biggest\n` +
      `     win: cache the document context that repeats across questions.\n` +
      `     Cached input tokens are typically ~90% cheaper on major providers.\n` +
      `  2. Batching — anything not user-facing-urgent (evals, backfills,\n` +
      `     summaries) can run through a batch API at roughly half price.\n` +
      `  3. Trim the context — send the passages retrieval selected, not whole\n` +
      `     documents. Less context is also *safer*: it gives the model less\n` +
      `     room to ground an answer in the wrong passage.\n` +
      `  4. Model routing — only after 1–3. Route easy questions to a smaller\n` +
      `     model, and re-run \`groundwork check\` to prove grounding held.\n\n` +
      `Any change you make here goes back through the gate: cheaper is only\n` +
      `better if the grounding score doesn't move.\n\n`
  );
  return 0;
}
