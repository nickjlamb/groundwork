// A real Claude-backed extraction system — the "your system" side of the
// adapter boundary. Small on purpose, but production-shaped in the three ways
// that matter:
//
//   1. The prompt states the extraction contract explicitly: every schema
//      field present, and null — never a guess — for anything the document
//      does not state. The gate downstream holds the model to exactly that.
//   2. The instructions and schema are sent with cache_control: when you
//      process forms at scale, the schema is the constant and the documents
//      vary, so the cached prefix is the schema side (the mirror image of
//      document QA, where the document is the constant and questions vary).
//   3. Token usage from every response is returned to the caller, which is
//      what gives `groundwork cost` real numbers instead of guesses.
//
// Env:
//   ANTHROPIC_API_KEY    required for live runs
//   CLAUDE_MODEL         default "claude-haiku-4-5" — cheap and strong at
//                        structured extraction; try "claude-sonnet-5" to compare
//   ANTHROPIC_BASE_URL   default "https://api.anthropic.com" — pointed at a
//                        local mock server by the offline tests

const BASE = () => process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const MODEL = () => process.env.CLAUDE_MODEL || "claude-haiku-4-5";

const INSTRUCTIONS = [
  "You extract a structured record from the document provided in the conversation, following the JSON Schema below.",
  "Rules, in order:",
  "1. Return ONLY a JSON object — no prose, no code fences.",
  "2. Every property in the schema must be present in the object.",
  "3. If the document does not state a field's value, that field is null. Never guess, infer, or fill in a plausible value — an unstated date of birth is null, not an estimate.",
  "4. Copy stated values faithfully, as the document writes them.",
].join("\n");

/**
 * @param {{ document: string, schema: object }} input
 * @returns {Promise<{ record: object, usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number, cache_read_input_tokens: number } }>}
 */
export async function extractClaude({ document, schema }) {
  const res = await fetch(`${BASE()}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL(),
      max_tokens: 500,
      system: [
        { type: "text", text: INSTRUCTIONS },
        {
          type: "text",
          text: `<schema>\n${JSON.stringify(schema, null, 2)}\n</schema>`,
          // The schema rides along with every document — mark it cacheable so
          // a pile of referrals reads the schema from cache at ~10% of the
          // input price.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: `<document>\n${document}\n</document>` }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Accept a bare object or one wrapped in code fences (rule 1 says bare, but
  // parsing defensively beats failing a whole case on formatting).
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let record;
  try {
    record = JSON.parse(jsonText);
  } catch {
    throw new Error(`model did not return valid JSON: ${text.slice(0, 200)}`);
  }

  const u = data.usage ?? {};
  const prompt =
    (u.input_tokens ?? 0) +
    (u.cache_read_input_tokens ?? 0) +
    (u.cache_creation_input_tokens ?? 0);
  const completion = u.output_tokens ?? 0;

  return {
    record,
    usage: {
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: prompt + completion,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
    },
  };
}
