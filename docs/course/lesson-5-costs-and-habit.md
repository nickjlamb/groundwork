# Lesson 5 · Costs and the habit — measured, not guessed

**Goal:** know what your system spends and why; start the two habits that keep the harness alive. **Time:** ~15 minutes.

## Costs

```bash
npx groundwork cost
```

If your adapter reports token usage (see `examples/claude-doc-qa/groundwork/adapter.mjs` for the ~15-line pattern), this prints *measured* numbers from your eval runs and recommendations in leverage order:

1. **Prompt caching** — for document QA usually the biggest win, because the same documents ride along with every question.
2. **Batching** — anything not user-facing-urgent at roughly half price.
3. **Trim the context** — cheaper *and* safer: less room to ground an answer in the wrong passage.
4. **Model routing** — only after 1–3, and always re-run `check` to prove grounding held.

That last clause is the point of the whole tool: cheaper is only better if the grounding score doesn't move.

## The two habits

**Weekly:** read a handful of real transcripts. When one surprises you, it becomes a gold case — two minutes that permanently pin the failure down. A gold set that stops growing is a gate that stops learning.

**Ongoing:** fill in **`groundwork/DEPLOYMENT-LOG.md`** as things happen. Groundwork sends no telemetry — nothing about your users leaves your machines — so this file *is* the measurement: time from prototype to production, incidents the gate caught before users saw them, incidents that got through and the case you added after.

## Checkpoint ✅

- [ ] `npx groundwork cost` runs (with usage if your adapter reports it; the empty-state message tells you how)
- [ ] `DEPLOYMENT-LOG.md` has its first milestone rows filled in
- [ ] A weekly transcript-reading slot exists somewhere a calendar will enforce it

**Next:** [Completion checklist →](completion.md)
