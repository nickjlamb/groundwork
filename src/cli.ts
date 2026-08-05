#!/usr/bin/env node
// Groundwork CLI — deployment-readiness scaffolding for AI deployment patterns.
//
// Commands:
//   groundwork init [archetype]   scaffold the readiness harness for a pattern
//                                 (document-qa, extraction) into the current repo
//   groundwork check              run the local loop: redaction pre-step + eval
//
// No CLI framework — argument handling is small enough to keep dependency-free,
// matching the OpenGATE/Redacta house style.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function version(): string {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8")
  );
  return pkg.version;
}

const HELP = `groundwork ${version()} — deployment-readiness for AI deployment patterns

Usage:
  groundwork init [archetype]                scaffold the readiness harness
        [--force] [--dir <path>]             for a deployment pattern:
                                               document-qa   documents → grounded answers
                                               extraction    documents → structured fields
                                             (default: document-qa)
  groundwork check [--dir <path>]            redaction self-test + the archetype's eval
        [--baseline]                         save this run as the regression floor
        [--ci]                               fail (exit 1) on regression vs baseline
        [--report]                           write a self-contained HTML report
  groundwork cost [--dir <path>]             token usage + savings, leverage order
  groundwork --help | --version

groundwork is a strong floor, not a guarantee. It automates the checks that
can be automated; a human must stay in the loop for high-stakes outputs.
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const flagValue = (name: string): string | undefined => {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
  };

  if (!cmd || flags.has("--help") || cmd === "help") {
    process.stdout.write(HELP);
    return;
  }
  if (flags.has("--version") || cmd === "version") {
    process.stdout.write(version() + "\n");
    return;
  }

  switch (cmd) {
    case "init": {
      const { runInit } = await import("./commands/init.js");
      // Positional archetype: `groundwork init extraction`. The bare form
      // keeps its original meaning (document-qa) so nothing shipped breaks.
      const positional = args
        .slice(1)
        .find((a, i) => !a.startsWith("--") && args[i] !== "--dir");
      await runInit({
        dir: flagValue("--dir") ?? process.cwd(),
        force: flags.has("--force"),
        archetype: positional,
      });
      return;
    }
    case "check": {
      const { runCheck } = await import("./commands/check.js");
      const code = await runCheck({
        dir: flagValue("--dir") ?? process.cwd(),
        baseline: flags.has("--baseline"),
        ci: flags.has("--ci"),
        report: flags.has("--report"),
      });
      process.exitCode = code;
      return;
    }
    case "cost": {
      const { runCost } = await import("./commands/cost.js");
      process.exitCode = await runCost({
        dir: flagValue("--dir") ?? process.cwd(),
      });
      return;
    }
    default:
      process.stderr.write(`Unknown command: ${cmd}\n\n${HELP}`);
      process.exitCode = 2;
  }
}

main().catch((err) => {
  process.stderr.write(`groundwork: ${err?.message ?? err}\n`);
  process.exitCode = 1;
});
