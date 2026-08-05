# The Groundwork course — from prototype to production

Seven short lessons that take a working prototype to a gated, measured deployment — six on the document-QA pattern, and one that runs the same loop on the second archetype, structured extraction. Each lesson ends with a **checkpoint you can verify** — not "you have read this" but "this specific thing now works on your machine." Nothing here requires an ML background; the judgment calls are flagged as judgment calls.

Total time: about two and a half hours, and the biggest block is Lesson 3 — writing gold cases — because that's the part that's actually yours.

| Lesson | You will | Checkpoint | Time |
|---|---|---|---|
| [0 · Orientation](lesson-0-orientation.md) | Run the gate on a toy system, then watch it catch fabrication | `demo` green, `demo:break` red, on your machine | 10 min |
| [1 · Wire your system](lesson-1-wire-your-system.md) | Connect your prototype through one file | A one-liner returns your system's `{ text }` | 15 min |
| [2 · The privacy pre-step](lesson-2-privacy-pre-step.md) | See redaction work, and learn exactly where it stops | A synthetic identifier comes back as a token | 10 min |
| [3 · Gold cases from real failures](lesson-3-gold-cases.md) | Encode your judgment as five regression tests | `check` runs your cases; grounding row not SKIPPED | 45+ min |
| [4 · The gate](lesson-4-the-gate.md) | Freeze a baseline, then *sabotage your own system* to prove CI catches it | A deliberately-broken PR goes red, is reverted, goes green | 20 min |
| [5 · Costs and the habit](lesson-5-costs-and-habit.md) | Read measured spend; start the deployment log | `cost` shows real usage; log's first row filled | 15 min |
| [6 · Structured extraction](lesson-6-structured-extraction.md) | Run the loop on the second archetype; catch a guessed field by name | `demo:extraction` green, `demo:extraction:break` red; one real case labelled | 20 min |

Then the [completion checklist](completion.md) — including the one item no tool can check for you.

**Prefer it as one page?** [`docs/GETTING-STARTED.md`](../GETTING-STARTED.md) covers the same ground as a reference walkthrough. The course adds exercises and checkpoints; the content agrees with itself.
