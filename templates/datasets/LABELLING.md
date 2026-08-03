# Building your gold set

Your gold set is the judgment at the heart of this harness. It is yours — built from questions your users really asked and failures you really saw, not from synthetic examples that flatter the system. Ten honest cases beat a hundred invented ones.

## Where cases come from

Every time your system gives a wrong, invented, or overconfident answer, that is a gold case waiting to be written. Capture the question, the context your retrieval step actually returned, and what a correct answer must contain. Fixed the bug? Keep the case — it is now a regression test, and the CI gate makes sure that failure can never quietly return.

Start with five to ten cases. Add one every time something surprises you.

## Anatomy of a case

Copy `cases/_template.json`. Each case is one JSON file:

- **`question`** — what the user asked, verbatim where possible.
- **`context`** — the passage(s) retrieval returned. Paste the real text; the grounding check verifies the answer against exactly this.
- **`answerAnchors`** — the facts a correct answer must contain. Add `aliases` for acceptable rephrasings ("30 days" / "thirty days"). If an anchor keeps failing on wording alone, broaden its aliases rather than weakening the anchor.
- **`answerable: false`** — the case where the context *cannot* answer the question. The system must abstain ("that's not in the provided documents"), not guess. Keep at least one unanswerable case per five answerable ones; fabrication under missing context is the most dangerous failure a document-QA system has.
- **`allowedNewNumbers`** — numbers the answer may legitimately introduce that aren't in the context (rare; e.g. a conversion). Anything else numeric that isn't in the context fails the case.

## What the check actually verifies

Three things, deterministically — no LLM judge, so results are reproducible and free to run on every commit:

1. **Anchor recall** — the required facts are present in the answer.
2. **No fabricated numbers** — every number in the answer traces to the context, the question, or an anchor.
3. **Abstention** — on unanswerable cases, the answer declines rather than invents.

## What it cannot verify

A deterministic check cannot tell you an answer is *good* — well-phrased, appropriately hedged, kind. It tells you the answer is grounded. That is the floor, and it is worth gating on, but it is not the ceiling: keep reading real transcripts, and keep a human in the loop for any answer that affects someone's health, money, legal standing, or safety.
