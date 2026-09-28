// The MCP server must expose the same deterministic judgment as the CLI:
// a fabricated number fails, a clean grounded answer passes, and a missed
// abstention is named. Raw JSON-RPC over stdio — no client library, so the
// test also proves the wire format.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function mcpSession(requests, entryArgs = [join(ROOT, "dist", "mcp.js")]) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, entryArgs, { cwd: ROOT });
    const responses = [];
    let buf = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timed out; got ${responses.length} responses: ${buf.slice(0, 500)}`));
    }, 15000);

    child.stdout.on("data", (d) => {
      buf += d;
      let idx;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (!line) continue;
        const msg = JSON.parse(line);
        if (msg.id !== undefined) responses.push(msg);
        if (responses.length === requests.filter((r) => r.id !== undefined).length) {
          clearTimeout(timer);
          child.kill();
          resolvePromise(responses);
        }
      }
    });
    child.on("error", reject);
    for (const r of requests) child.stdin.write(JSON.stringify(r) + "\n");
  });
}

const INIT = [
  { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "0" } } },
  { jsonrpc: "2.0", method: "notifications/initialized" },
];

const call = (id, name, args) => ({ jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } });
const parseResult = (resp) => JSON.parse(resp.result.content[0].text);

test("MCP server lists the five tools", async () => {
  const responses = await mcpSession([...INIT, { jsonrpc: "2.0", id: 2, method: "tools/list" }]);
  const tools = responses.find((r) => r.id === 2).result.tools.map((t) => t.name).sort();
  assert.deepEqual(tools, ["check_answer_grounding", "check_extraction", "check_readiness", "cost_summary", "scaffold_harness"]);
});

test("`groundwork mcp` starts the same server (the MCP Registry launch path)", async () => {
  const responses = await mcpSession(
    [...INIT, { jsonrpc: "2.0", id: 2, method: "tools/list" }],
    [join(ROOT, "dist", "cli.js"), "mcp"]
  );
  const tools = responses.find((r) => r.id === 2).result.tools.map((t) => t.name).sort();
  assert.deepEqual(tools, ["check_answer_grounding", "check_extraction", "check_readiness", "cost_summary", "scaffold_harness"]);
});

test("check_answer_grounding: catches a fabricated number, passes a grounded answer, names a missed abstention", async () => {
  const ctx = "The support office is open Monday to Friday. Applicants may hold savings of up to £16,000.";
  const responses = await mcpSession([
    ...INIT,
    call(2, "check_answer_grounding", {
      question: "How much can I hold in savings?",
      context: ctx,
      answer: "You can hold savings of up to £16,000. Processing takes 14 days.",
      answer_anchors: [{ value: "16,000" }],
    }),
    call(3, "check_answer_grounding", {
      question: "How much can I hold in savings?",
      context: ctx,
      answer: "Applicants may hold savings of up to £16,000.",
      answer_anchors: [{ value: "16,000" }],
    }),
    call(4, "check_answer_grounding", {
      question: "What is the appeal deadline?",
      context: ctx,
      answer: "Appeals must be made within 28 days.",
      answerable: false,
    }),
  ]);

  const fabricated = parseResult(responses.find((r) => r.id === 2));
  assert.equal(fabricated.passed, false);
  assert.match(fabricated.issues.join(" "), /ungrounded number "14"/);

  const grounded = parseResult(responses.find((r) => r.id === 3));
  assert.equal(grounded.passed, true, JSON.stringify(grounded));
  assert.match(grounded.caveat, /floor, not a guarantee/);

  const missedAbstention = parseResult(responses.find((r) => r.id === 4));
  assert.equal(missedAbstention.passed, false);
  assert.match(missedAbstention.issues.join(" "), /did not abstain/);
});

test("check_extraction: passes a faithful record, names a fabricated field and a schema break", async () => {
  const schema = {
    type: "object",
    required: ["referral_date", "date_of_birth"],
    properties: {
      referral_date: { type: "string" },
      date_of_birth: { type: ["string", "null"] },
    },
  };
  const gold = { referral_date: "2026-03-14", date_of_birth: null };
  const normalize = { referral_date: "date", date_of_birth: "date" };
  const responses = await mcpSession([
    ...INIT,
    call(2, "check_extraction", {
      record: { referral_date: "14 March 2026", date_of_birth: null },
      gold, schema, normalize,
    }),
    call(3, "check_extraction", {
      record: { referral_date: null, date_of_birth: "12 April 1988" },
      gold, schema, normalize,
    }),
  ]);

  const faithful = parseResult(responses.find((r) => r.id === 2));
  assert.equal(faithful.passed, true, JSON.stringify(faithful));
  assert.equal(faithful.per_field.referral_date.verdict, "correct");
  assert.equal(faithful.per_field.date_of_birth.verdict, "correct_abstention");
  assert.match(faithful.caveat, /floor, not a guarantee/);

  const broken = parseResult(responses.find((r) => r.id === 3));
  assert.equal(broken.passed, false);
  assert.match(broken.issues.join(" "), /FABRICATED field "date_of_birth": document does not state it/);
  assert.match(broken.issues.join(" "), /SCHEMA: \/referral_date must be string/);
});
