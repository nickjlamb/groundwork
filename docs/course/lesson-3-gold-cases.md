# Lesson 3 · Gold cases from real failures — the part that's actually yours

**Goal:** five cases encoding what *correct* means for your system — drawn from reality, not imagination. **Time:** 45+ minutes, and worth every one. This is the heart of the course.

## The rule of the house

**Every case comes from a question a user really asked or a failure you really saw.** Synthetic cases produce box-ticking evals: they test what you imagined, and systems rarely fail where you imagined. Real transcripts are where the bodies are.

## Do this

1. Open your logs, support inbox, or pilot transcripts. Collect: three questions your documents *can* answer (at least one involving a number), and two your documents **cannot** answer — ideally ones where something related appears in the documents, because that's where systems improvise most dangerously.

2. Delete the example cases in `groundwork/datasets/cases/` and write yours from `_template.json`. For each:
   - `context` — paste the passage your retrieval actually returns for this question. Real text, verbatim.
   - `answerAnchors` — the shortest distinctive phrase a correct answer must contain. Put acceptable rephrasings in `aliases`; keep the anchor itself tight.
   - `allowedNewNumbers` — leave empty unless an answer legitimately computes a number absent from the context.
   - Unanswerable cases: `"answerable": false`, no anchors needed.

3. Run it:

```bash
npx groundwork check
```

## Reading your first real results

Failures now are *information*, not defeat. `missing answer fact` on a correct-looking answer → add the phrasing to `aliases`. `ungrounded number` on a legitimate figure → is it truly derivable? Then `allowedNewNumbers`. But pause on each one first — some of what looks like scorer pedantry is your system paraphrasing a fact into something subtly different. That pause is the skill this lesson teaches.

## Checkpoint ✅

- [ ] Five real cases, at least two with `"answerable": false`
- [ ] `npx groundwork check` runs them — the `grounding` row shows `n_cases: 5`, not SKIPPED
- [ ] You can defend every anchor out loud: "a correct answer must contain this because…"

## Judgment call, flagged

What counts as "correct" for your users is yours, not Groundwork's. The tool checks that answers carry your anchors and invent nothing; *choosing* the anchors is domain expertise. If you're unsure about a case, that uncertainty usually means the underlying document is ambiguous — which is worth knowing all by itself.

**Next:** [Lesson 4 · The gate →](lesson-4-the-gate.md)
