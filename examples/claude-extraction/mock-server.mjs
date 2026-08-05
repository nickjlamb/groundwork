// A local stand-in for the Anthropic API, so the example's full loop —
// adapter → "Claude" → extraction gate → usage → cost — runs offline in tests
// and CI. It mimics the /v1/messages response shape, including a usage block
// with prompt-cache fields: the first request "creates" the schema cache,
// subsequent ones "read" it — the mirror image of the document-QA example,
// because for extraction the schema is the constant and the documents vary.
//
// The extraction itself is deterministic and rule-based per field — good
// enough to fill the gold set faithfully, and deliberately boring: the mock
// exists to test the plumbing, not the model. Set MOCK_FABRICATE=1 to make it
// misbehave the way real models do — inventing a plausible date of birth the
// letter never states — and watch the gate name it.

import { createServer } from "node:http";

const FIELD_RULES = {
  referral_date: (doc) => doc.match(/received (\d{1,2} [A-Z][a-z]+ \d{4})/)?.[1] ?? null,
  reason: (doc) => doc.match(/reports ([^.]+?)\./)?.[1] ?? null,
  urgency: (doc) => doc.match(/marked (routine|urgent)/)?.[1] ?? null,
  sessions_requested: (doc) => {
    const m = doc.match(/course of (\d+) sessions/);
    return m ? Number(m[1]) : null;
  },
  appointment_required_by: (doc) =>
    doc.match(/appointment is required by (\d{1,2} [A-Z][a-z]+ \d{4})/)?.[1] ?? null,
  date_of_birth: (doc) =>
    doc.match(/date of birth[:\s]+(\d{1,2} [A-Z][a-z]+ \d{4})/i)?.[1] ?? null,
};

function extractRecord(document, schema) {
  const record = {};
  for (const field of Object.keys(schema?.properties ?? {})) {
    const rule = FIELD_RULES[field];
    record[field] = rule ? rule(document) : null;
  }
  if (process.env.MOCK_FABRICATE === "1") {
    // The real failure mode this example exists to catch: a plausible GUESSED
    // value in a field the letter never states.
    if ("date_of_birth" in record && record.date_of_birth === null) {
      record.date_of_birth = "12 April 1988";
    }
  }
  return record;
}

let calls = 0;

export function startMockServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const payload = JSON.parse(body || "{}");
        const systemBlocks = Array.isArray(payload.system) ? payload.system : [];
        const schemaText = (systemBlocks.find((b) => b.text?.startsWith("<schema>"))?.text ?? "")
          .replace(/<\/?schema>/g, "");
        const schema = schemaText ? JSON.parse(schemaText) : {};
        const userBlocks = payload.messages?.[0]?.content ?? [];
        const document = (userBlocks.find((b) => b.text?.startsWith("<document>"))?.text ?? "")
          .replace(/<\/?document>/g, "");

        const text = JSON.stringify(extractRecord(document, schema));

        // Deterministic, realistic-shaped usage: the schema+instructions are
        // ~4 chars per token; first call writes the cache, later calls read it.
        const schemaTokens = Math.round((schemaText.length + 400) / 4);
        const docTokens = Math.round(document.length / 4);
        calls += 1;
        const usage = {
          input_tokens: docTokens,
          output_tokens: Math.round(text.length / 4),
          cache_creation_input_tokens: calls === 1 ? schemaTokens : 0,
          cache_read_input_tokens: calls === 1 ? 0 : schemaTokens,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "msg_mock",
            type: "message",
            role: "assistant",
            model: payload.model ?? "mock",
            content: [{ type: "text", text }],
            usage,
          })
        );
      });
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, url: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

// Run directly: start and print the URL, stay up until killed.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await startMockServer();
  console.log(`mock Anthropic API listening at ${url}`);
}
