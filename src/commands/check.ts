// `groundwork check` — the local readiness loop:
//   1. redaction self-test (Redacta): identifiers in, tokens out, no residue;
//   2. the archetype's eval (OpenGATE) through the repo's adapter and gold
//      set — grounding for document-qa, extraction for extraction.
//
// Groundwork doesn't reimplement the eval — it drives OpenGATE's runner with
// the right flags, so results, baselines, and reports stay fully
// `npx @pharmatools/opengate`-compatible. Returns a process exit code.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadConfig, resolveFromRepo } from "../lib/config.js";
import { runRedactionSelfTest } from "../lib/redaction-selftest.js";

const require = createRequire(import.meta.url);

export interface CheckOptions {
  dir: string;
  baseline?: boolean;
  ci?: boolean;
  report?: boolean;
}

function opengateRunnerPath(): string {
  // The package exports "." → src/index.mjs; the CLI runner sits beside it.
  const index = require.resolve("@pharmatools/opengate");
  return join(dirname(index), "runner.mjs");
}

export async function runCheck(opts: CheckOptions): Promise<number> {
  const out = process.stdout;
  const config = loadConfig(opts.dir);

  out.write(`\ngroundwork check — ${config.project}\n\n`);

  // 1. Redaction self-test -------------------------------------------------
  const redaction = await runRedactionSelfTest(opts.dir, config);
  if (!redaction.enabled) {
    out.write(
      `  ⊘ redaction   DISABLED in groundwork.config.json — make sure nothing\n` +
        `                sensitive can reach your system's API, or re-enable it\n`
    );
  } else if (redaction.passed) {
    out.write(
      `  ✓ redaction   self-test passed (categories: ${redaction.categories.join(", ")})\n`
    );
  } else {
    out.write(`  ✗ redaction   SELF-TEST FAILED\n`);
    for (const f of redaction.failures) out.write(`                ${f}\n`);
    out.write(
      `\nStopping before the grounding eval — fix the redaction step first;\n` +
        `nothing should reach your system's API until identifiers are stripped.\n`
    );
    return 1;
  }

  // 2. The archetype's eval (OpenGATE) -------------------------------------
  // The scorer row that decides the verdict depends on the deployment pattern.
  const scorerId = config.archetype === "extraction" ? "extraction" : "grounding";
  const args = [
    opengateRunnerPath(),
    "--online",
    "--adapter",
    resolveFromRepo(opts.dir, config.eval.adapter),
    "--datasets",
    resolveFromRepo(opts.dir, config.eval.datasets),
    "--results",
    resolveFromRepo(opts.dir, config.eval.results),
  ];
  if (opts.baseline) args.push("--baseline");
  if (opts.ci) args.push("--ci");
  if (opts.report) args.push("--report");

  out.write(`  → ${scorerId.padEnd(12)}running OpenGATE…\n\n`);
  // stderr is piped so we can drop the harmless "not a git repository"
  // noise OpenGATE emits (via git, for run provenance) when the partner
  // hasn't run `git init` yet. Everything else passes through.
  const res = spawnSync(process.execPath, args, {
    cwd: opts.dir,
    stdio: ["inherit", "inherit", "pipe"],
    encoding: "utf8",
  });
  const stderrText = (res.stderr ?? "")
    .split("\n")
    .filter((line) => !/not a git repository/i.test(line))
    .join("\n")
    .trim();
  if (stderrText) process.stderr.write(stderrText + "\n");

  const code = res.status ?? 1;
  if (code !== 0) return code;

  // 3. Honest summary — a run where the archetype's scorer never executed is
  // not a pass, whatever the exit code says.
  const main = latestScorerResult(
    resolveFromRepo(opts.dir, config.eval.results),
    scorerId
  );
  if (main?.skipped) {
    out.write(
      `\nNot a pass yet: the ${scorerId} check itself did not run.\n` +
        `  reason: ${main.reason ?? "unknown"}\n` +
        `Wire your system in groundwork/adapter.mjs (see GROUNDWORK.md, step 1),\n` +
        `then run \`groundwork check\` again.\n\n`
    );
    return 1;
  }
  if (main && main.passed === false) {
    if (scorerId === "extraction") {
      out.write(
        `\nExtraction check FAILED — the named failures above are the point of\n` +
          `this harness: each one is a record that broke your schema, got a\n` +
          `field wrong, or fabricated a value the document never stated. Fix,\n` +
          `or turn any genuine surprise into a gold case, and run again.\n\n`
      );
    } else {
      out.write(
        `\nGrounding check FAILED — the named failures above are the point of\n` +
          `this harness: each one is an answer that missed a required fact,\n` +
          `invented a number, or failed to abstain. Fix, or turn any genuine\n` +
          `surprise into a gold case, and run again.\n\n`
      );
    }
    return 1;
  }

  if (scorerId === "extraction") {
    out.write(
      `\nChecks passed. What that does and doesn't mean: extractions are\n` +
        `faithful to your gold-labelled documents — a strong floor, not a\n` +
        `certification. Keep a human in the loop for high-stakes outputs.\n\n`
    );
  } else {
    out.write(
      `\nChecks passed. What that does and doesn't mean: answers are grounded\n` +
        `against your gold set — a strong floor, not a certification. Keep a\n` +
        `human in the loop for high-stakes outputs.\n\n`
    );
  }
  return 0;
}

interface ScorerEntry {
  id: string;
  skipped?: boolean;
  reason?: string;
  passed?: boolean;
}

/** Read one scorer's entry from the newest scorecard, if any. */
function latestScorerResult(
  resultsDir: string,
  scorerId: string
): ScorerEntry | undefined {
  if (!existsSync(resultsDir)) return undefined;
  const runs = readdirSync(resultsDir)
    .filter((n) => /^\d{4}-.*\.json$/.test(n))
    .sort();
  const newest = runs[runs.length - 1];
  if (!newest) return undefined;
  try {
    const scorecard = JSON.parse(
      readFileSync(join(resultsDir, newest), "utf8")
    ) as { results?: ScorerEntry[] };
    return scorecard.results?.find((r) => r.id === scorerId);
  } catch {
    return undefined;
  }
}
