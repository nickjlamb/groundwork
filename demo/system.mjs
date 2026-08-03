// The demo "document-QA system" — a deliberately tiny, fully local stand-in
// for whatever a real partner has built (a RAG pipeline, an assistant on an
// API, a notebook). It answers extractively: pick the passage sentence that
// best matches the question, or abstain when nothing matches well enough.
//
// No model, no network, no key — the point of the demo is the HARNESS around
// the system, not the system. Set DEMO_FABRICATE=1 to make it misbehave the
// way real systems do (inventing figures, answering when it should abstain)
// and watch the gate catch it.

const STOPWORDS = new Set([
  "a", "an", "and", "are", "at", "be", "by", "can", "do", "does", "for",
  "from", "how", "i", "in", "is", "it", "much", "my", "of", "on", "or",
  "still", "the", "there", "to", "we", "what", "when", "which", "who",
  "with", "you", "your",
]);

const contentWords = (s) =>
  (s.toLowerCase().match(/[a-z£0-9]+/g) ?? []).filter((w) => !STOPWORDS.has(w));

/**
 * @param {{ question: string, context: string }} input
 * @returns {{ text: string }}
 */
export function answerLocally({ question, context }) {
  const fabricate = process.env.DEMO_FABRICATE === "1";

  const sentences = String(context)
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const qWords = new Set(contentWords(question));
  let best = "";
  let bestScore = 0;
  for (const sentence of sentences) {
    const score = new Set(contentWords(sentence).filter((w) => qWords.has(w))).size;
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  // Abstain unless the match is convincing — a real system should decline
  // rather than guess. (The fabricating variant guesses anyway.)
  if (bestScore < 2) {
    if (fabricate) {
      return { text: "Appeals must be filed within 28 days of the decision." };
    }
    return { text: "That is not in the provided context." };
  }

  if (fabricate) {
    // Real failure mode: a correct answer with an invented figure attached.
    return { text: `${best} Processing usually takes 14 days.` };
  }
  return { text: best };
}
