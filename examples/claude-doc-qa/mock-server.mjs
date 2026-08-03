// A local stand-in for the Anthropic API, so the example's full loop —
// adapter → "Claude" → grounding gate → usage → cost — runs offline in tests
// and CI. It mimics the /v1/messages response shape, including a usage block
// with prompt-cache fields: the first request "creates" the document cache,
// subsequent ones "read" it, which is exactly the pattern `groundwork cost`
// should reward.
//
// The answers themselves are deterministic extractive picks (best-overlap
// sentence, abstain under threshold) — good enough to pass the gold set, and
// deliberately boring: the mock exists to test the plumbing, not the model.

import { createServer } from "node:http";

const ABSTAIN_PHRASE = "That is not in the provided document.";

// Low-information words for this corpus — including the drug name, which
// appears in nearly every sentence.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for",
  "from", "how", "i", "if", "in", "is", "it", "its", "much", "my", "of", "on",
  "or", "should", "still", "the", "there", "this", "to", "we", "what", "when",
  "which", "who", "with", "you", "your", "during",
  "luminexa", "fictionol", "medicine", "tablet", "tablets",
]);

const words = (s) =>
  (s.toLowerCase().match(/[a-z0-9°]+/g) ?? []).filter((w) => !STOPWORDS.has(w));

function extractiveAnswer(question, document) {
  const sentences = document
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const q = new Set(words(question));
  let best = "";
  let bestScore = 0;
  for (const s of sentences) {
    const score = new Set(words(s).filter((w) => q.has(w))).size;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return bestScore >= 2 ? best : ABSTAIN_PHRASE;
}

let calls = 0;

export function startMockServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const payload = JSON.parse(body || "{}");
        const blocks = payload.messages?.[0]?.content ?? [];
        const doc = (blocks.find((b) => b.text?.startsWith("<document>"))?.text ?? "")
          .replace(/<\/?document>/g, "");
        const question = (blocks.find((b) => b.text?.startsWith("Question:"))?.text ?? "")
          .replace(/^Question:\s*/, "");

        const text = extractiveAnswer(question, doc);

        // Deterministic, realistic-shaped usage: the document is ~4 chars per
        // token; first call writes the cache, later calls read it.
        const docTokens = Math.round(doc.length / 4);
        const otherTokens = Math.round((question.length + 200) / 4);
        calls += 1;
        const usage = {
          input_tokens: otherTokens,
          output_tokens: Math.round(text.length / 4),
          cache_creation_input_tokens: calls === 1 ? docTokens : 0,
          cache_read_input_tokens: calls === 1 ? 0 : docTokens,
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
