// A real Claude-backed document-QA system — the "your system" side of the
// adapter boundary. Small on purpose, but production-shaped in the three ways
// that matter:
//
//   1. The prompt instructs answer-from-context-only, with an explicit
//      abstention phrase for unanswerable questions.
//   2. The document context is sent with cache_control, so repeated questions
//      over the same document hit Anthropic's prompt cache (the single
//      biggest cost lever for document QA — see `groundwork cost`).
//   3. Token usage from every response is returned to the caller, which is
//      what gives `groundwork cost` real numbers instead of guesses.
//
// Env:
//   ANTHROPIC_API_KEY    required for live runs
//   CLAUDE_MODEL         default "claude-haiku-4-5" — cheap and strong at
//                        extractive QA; try "claude-sonnet-5" to compare
//   ANTHROPIC_BASE_URL   default "https://api.anthropic.com" — pointed at a
//                        local mock server by the offline tests

const BASE = () => process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
const MODEL = () => process.env.CLAUDE_MODEL || "claude-haiku-4-5";

export const ABSTAIN_PHRASE = "That is not in the provided document.";

const SYSTEM_PROMPT = [
  "You answer questions using ONLY the document provided in the conversation.",
  "Rules, in order:",
  `1. If the document does not contain the answer, reply exactly: "${ABSTAIN_PHRASE}"`,
  "2. Otherwise answer in one or two sentences, quoting the document's own wording and figures. Keep every number exactly as the document states it.",
  "3. Never add facts, figures, or advice from outside the document.",
].join("\n");

/**
 * @param {{ question: string, context: string }} input
 * @returns {Promise<{ text: string, usage: { prompt_tokens: number, completion_tokens: number, total_tokens: number, cache_read_input_tokens: number } }>}
 */
export async function askClaude({ question, context }) {
  const res = await fetch(`${BASE()}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL(),
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `<document>\n${context}\n</document>`,
              // The document rides along with every question — mark it
              // cacheable so subsequent questions read it from cache at ~10%
              // of the input price.
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: `Question: ${question}` },
          ],
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

  const u = data.usage ?? {};
  const prompt =
    (u.input_tokens ?? 0) +
    (u.cache_read_input_tokens ?? 0) +
    (u.cache_creation_input_tokens ?? 0);
  const completion = u.output_tokens ?? 0;

  return {
    text,
    usage: {
      prompt_tokens: prompt,
      completion_tokens: completion,
      total_tokens: prompt + completion,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
    },
  };
}
