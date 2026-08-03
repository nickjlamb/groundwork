#!/usr/bin/env node
// Groundwork MCP server — the same deterministic readiness checks, exposed as
// tools any MCP client (Claude Code, Cowork, Claude Desktop) can call
// conversationally: scaffold a harness, run the gate on a repo, check a single
// answer's grounding, summarise measured cost.
//
// Design notes, in the project's spirit:
//   • Every tool result carries the honest caveat — a floor, not a guarantee.
//   • check_answer_grounding reuses OpenGATE's exported pure logic, so the
//     conversational verdict and the CI gate can never drift apart.
//   • Repo-level tools run the real CLI in a subprocess: what the tool reports
//     is what CI would say, byte for byte.
//
// Wire it up (stdio):
//   { "mcpServers": { "groundwork": { "command": "npx", "args": ["-y", "-p", "@pharmatools/groundwork", "groundwork-mcp"] } } }
//   — or simply "command": "groundwork-mcp" after npm install.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore — OpenGATE ships untyped ESM; the shape is documented in its source.
import { checkGrounding } from "@pharmatools/opengate/grounding";
import { runInit } from "./commands/init.js";
import { loadConfig, resolveFromRepo } from "./lib/config.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "cli.js");

const CAVEAT =
  "Groundwork is a strong floor, not a guarantee: deterministic checks, not a safety certification. " +
  "Keep a human in the loop for answers that affect someone's health, money, legal standing, or safety.";

function runCli(args: string[], cwd: string): Promise<{ code: number; output: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, [CLI, ...args], { cwd, env: process.env });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    child.on("close", (code) => resolvePromise({ code: code ?? 1, output }));
  });
}

/** Latest grounding metrics from a repo's results dir, if any. */
function latestGrounding(dir: string): Record<string, unknown> | null {
  try {
    const config = loadConfig(dir);
    const resultsDir = resolveFromRepo(dir, config.eval.results);
    if (!existsSync(resultsDir)) return null;
    const files = readdirSync(resultsDir)
      .filter((f) => f.endsWith(".json") && !f.startsWith("baseline") && !f.startsWith("usage"))
      .sort();
    for (let i = files.length - 1; i >= 0; i--) {
      const run = JSON.parse(readFileSync(join(resultsDir, files[i]), "utf8"));
      const g = (run.results ?? []).find((r: { id?: string }) => r.id === "grounding");
      if (g) return { metrics: g.metrics ?? null, failures: g.failures ?? [], skipped: g.skipped ?? false };
    }
  } catch {
    /* fall through */
  }
  return null;
}

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

const server = new McpServer({ name: "groundwork", version: "0.2.0" });

server.registerTool(
  "check_answer_grounding",
  {
    title: "Check one answer's grounding",
    description:
      "Deterministically check a single answer against the context it should be grounded in: required facts (anchors) present, every number traceable to the context, abstention when the question is unanswerable. Same logic as the CI gate — no model, no network. Returns pass/fail with named issues.",
    inputSchema: {
      question: z.string().describe("The question that was asked"),
      context: z.string().describe("The retrieved passage(s) the answer must be grounded in"),
      answer: z.string().describe("The answer to check"),
      answer_anchors: z
        .array(z.object({ value: z.string(), aliases: z.array(z.string()).optional() }))
        .optional()
        .describe("Facts a correct answer MUST contain (with acceptable rephrasings)"),
      allowed_new_numbers: z.array(z.string()).optional().describe("Numbers legitimately absent from the context (e.g. computed totals)"),
      answerable: z.boolean().optional().describe("false → the context cannot answer this; the only correct behaviour is abstention"),
      abstain_markers: z.array(z.string()).optional().describe("Phrases that count as a valid refusal (defaults cover common forms)"),
    },
  },
  async (input) => {
    const result = checkGrounding({
      question: input.question,
      context: input.context,
      answer: input.answer,
      anchors: input.answer_anchors,
      allowedNewNumbers: input.allowed_new_numbers,
      answerable: input.answerable,
      abstainMarkers: input.abstain_markers,
    });
    return text({ passed: result.issues.length === 0, issues: result.issues, caveat: CAVEAT });
  }
);

server.registerTool(
  "check_readiness",
  {
    title: "Run the readiness gate on a repo",
    description:
      "Run `groundwork check` in a repo that has a scaffolded harness: redaction self-test, then the grounding eval against the repo's own gold set. Returns the exit code, grounding metrics, and any named failures — exactly what CI would report.",
    inputSchema: {
      dir: z.string().describe("Absolute path to the repo root (the directory containing groundwork/)"),
      baseline: z.boolean().optional().describe("Freeze this run as the regression floor"),
      ci: z.boolean().optional().describe("Also compare against the committed baseline and fail on regression"),
    },
  },
  async (input) => {
    const dir = resolve(input.dir);
    const args = ["check", "--dir", dir];
    if (input.baseline) args.push("--baseline");
    if (input.ci) args.push("--ci");
    const { code, output } = await runCli(args, dir);
    return text({
      passed: code === 0,
      exit_code: code,
      grounding: latestGrounding(dir),
      cli_output: output.slice(-3000),
      caveat: CAVEAT,
    });
  }
);

server.registerTool(
  "scaffold_harness",
  {
    title: "Scaffold the readiness harness into a repo",
    description:
      "Run `groundwork init` in a repo: writes the adapter boundary, redaction config, gold-set templates, GitHub Action, and playbook. Never overwrites existing files. After scaffolding, the human edits groundwork/adapter.mjs and replaces the example gold cases with real ones.",
    inputSchema: {
      dir: z.string().describe("Absolute path to the repo root to scaffold into"),
    },
  },
  async (input) => {
    const dir = resolve(input.dir);
    await runInit({ dir, force: false });
    return text({
      scaffolded: true,
      next_steps: [
        "Edit groundwork/adapter.mjs — point answer() at the system under test",
        "Replace the example cases in groundwork/datasets/cases/ with cases from real failures",
        "Run check_readiness (or `npx groundwork check`)",
      ],
      caveat: CAVEAT,
    });
  }
);

server.registerTool(
  "cost_summary",
  {
    title: "Summarise measured token costs",
    description:
      "Run `groundwork cost` in a repo: measured token usage from eval runs, with savings recommendations in leverage order (prompt caching, batching, context trimming, model routing last).",
    inputSchema: {
      dir: z.string().describe("Absolute path to the repo root"),
    },
  },
  async (input) => {
    const dir = resolve(input.dir);
    const { code, output } = await runCli(["cost", "--dir", dir], dir);
    return text({ exit_code: code, report: output, caveat: CAVEAT });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
