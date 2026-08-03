#!/usr/bin/env node
// Groundwork CLI — deployment-readiness scaffolding for document-QA AI systems.
//
// Commands:
//   groundwork init    scaffold the readiness harness into the current repo
//   groundwork check   run the local loop: redaction pre-step + grounding eval
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

const HELP = `groundwork ${version()} — deployment-readiness for document-QA AI

Usage:
  groundwork init [--force] [--dir <path>]   scaffold the readiness harness
  groundwork check [--dir <path>]            run redaction + grounding locally
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
      await runInit({
        dir: flagValue("--dir") ?? process.cwd(),
        force: flags.has("--force"),
      });
      return;
    }
    case "check": {
      const { runCheck } = await import("./commands/check.js");
      const code = await runCheck({ dir: flagValue("--dir") ?? process.cwd() });
      process.exitCode = code;
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
