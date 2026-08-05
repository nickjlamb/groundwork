#!/usr/bin/env node
// Groundwork MCP server — the same deterministic readiness checks, exposed as
// tools any MCP client (Claude Code, Cowork, Claude Desktop) can call
// conversationally: scaffold a harness for a deployment pattern, run the gate
// on a repo, check a single answer's grounding or a single extracted record,
// summarise measured cost.
//
// Design notes, in the project's spirit:
//   • Every tool result carries the honest caveat — a floor, not a guarantee.
//   • check_answer_grounding and check_extraction reuse OpenGATE's exported
//     pure logic, so the conversational verdict and the CI gate can never
//     drift apart.
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
// @ts-ignore — same untyped ESM.
import { checkExtraction } from "@pharmatools/opengate/extraction";
// @ts-ignore — same untyped ESM.
import { validateRecordAgainstSchema } from "@pharmatools/opengate/schema";
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

/** Latest main-scorer metrics from a repo's results dir, if any — grounding
 * for document-qa, extraction for extraction. */
function latestMainResult(dir: string): Record<string, unknown> | null {
  try {
    const config = loadConfig(dir);
    const scorerId = config.archetype === "extraction" ? "extraction" : "grounding";
    const resultsDir = resolveFromRepo(dir, config.eval.results);
    if (!existsSync(resultsDir)) return null;
    const files = readdirSync(resultsDir)
      .filter((f) => f.endsWith(".json") && !f.startsWith("baseline") && !f.startsWith("usage"))
      .sort();
    for (let i = files.length - 1; i >= 0; i--) {
      const run = JSON.parse(readFileSync(join(resultsDir, files[i]), "utf8"));
      const g = (run.results ?? []).find((r: { id?: string }) => r.id === scorerId);
      if (g) return { scorer: scorerId, metrics: g.metrics ?? null, failures: g.failures ?? [], skipped: g.skipped ?? false };
    }
  } catch {
    /* fall through */
  }
  return null;
}

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }],
});

const server = new McpServer({ name: "groundwork", version: "0.4.0" });

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
  "check_extraction",
  {
    title: "Check one extracted record",
    description:
      "Deterministically check a structured extraction against its hand-labelled gold record: schema validity (nullable fields are the abstention contract), field accuracy with per-field normalisers (dates → ISO, money → minor units) and aliases, and fabrication — a non-null value in a field whose gold is null (a guessed date of birth the document never stated). Same logic as the CI gate — no model, no network. Returns pass/fail with named issues and a per-field verdict.",
    inputSchema: {
      record: z
        .record(z.string(), z.any())
        .describe("The record the system extracted ({ field: value | null })"),
      gold: z
        .record(z.string(), z.any())
        .describe("The hand-labelled gold record; null means THE DOCUMENT DOES NOT STATE IT — gold's keys define which fields are compared"),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe("The JSON Schema the record must validate against (type a must-find field non-nullable, a may-be-absent field nullable)"),
      normalize: z
        .record(z.string(), z.enum(["date", "money", "number", "text"]))
        .optional()
        .describe("Per-field normaliser applied to both sides before comparing"),
      aliases: z
        .record(z.string(), z.array(z.any()))
        .optional()
        .describe("Per-field acceptable alternative gold values (matched after normalisation)"),
    },
  },
  async (input) => {
    const issues: string[] = [];
    if (input.schema) {
      const schemaResult = validateRecordAgainstSchema(input.record, input.schema);
      for (const e of schemaResult.errors) issues.push(`SCHEMA: ${e}`);
    }
    const result = checkExtraction({
      record: input.record,
      gold: input.gold,
      normalize: input.normalize,
      aliases: input.aliases,
    });
    issues.push(...result.issues);
    return text({
      passed: issues.length === 0,
      issues,
      per_field: result.perField,
      counts: result.counts,
      caveat: CAVEAT,
    });
  }
);

server.registerTool(
  "check_readiness",
  {
    title: "Run the readiness gate on a repo",
    description:
      "Run `groundwork check` in a repo that has a scaffolded harness: redaction self-test, then the archetype's eval (grounding for document-qa, extraction for extraction) against the repo's own gold set. Returns the exit code, the main scorer's metrics, and any named failures — exactly what CI would report.",
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
      main_check: latestMainResult(dir),
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
      "Run `groundwork init [archetype]` in a repo: writes the adapter boundary, redaction config, gold-set templates, GitHub Action, and playbook for a deployment pattern — document-qa (documents → grounded answers) or extraction (documents → structured fields). Never overwrites existing files. After scaffolding, the human wires groundwork/adapter.mjs and replaces the example gold cases with real ones.",
    inputSchema: {
      dir: z.string().describe("Absolute path to the repo root to scaffold into"),
      archetype: z
        .enum(["document-qa", "extraction"])
        .optional()
        .describe("Deployment pattern to scaffold (default: document-qa)"),
    },
  },
  async (input) => {
    const dir = resolve(input.dir);
    await runInit({ dir, force: false, archetype: input.archetype });
    const wireStep =
      input.archetype === "extraction"
        ? "Edit groundwork/adapter.mjs — point extract() at the system under test (unknown → null, never guessed)"
        : "Edit groundwork/adapter.mjs — point answer() at the system under test";
    return text({
      scaffolded: true,
      archetype: input.archetype ?? "document-qa",
      next_steps: [
        wireStep,
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
