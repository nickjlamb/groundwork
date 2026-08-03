# Example: Claude-backed document QA, gated

The demo proves the harness with a toy system; this example wires it to the real thing — a document-QA system built on Claude, answering questions about a **fictional** medicine leaflet ([`docs/luminexa-pil.md`](docs/luminexa-pil.md); the drug does not exist, which is the point — nothing here is medical information).

Three files carry the ideas worth stealing:

- [`system.mjs`](system.mjs) — the "your system" side: an answer-from-the-document-only prompt with an explicit abstention phrase, the document sent with `cache_control` so repeated questions hit Anthropic's prompt cache, and token usage returned from every call.
- [`groundwork/adapter.mjs`](groundwork/adapter.mjs) — the harness side: key-gated availability (no key → the eval skips with a helpful hint, not a 401), the redaction pre-step, and usage written into the results dir where `groundwork cost` reads it.
- [`groundwork/datasets/cases/`](groundwork/datasets/cases/) — six gold cases including the two that matter most for a medicines document: the fabricated-dose-ceiling case (`max-daily`) and the pregnancy question the leaflet cannot answer (`unanswerable-pregnancy`), where the only correct behaviour is to say so.

## Run it offline (no key)

From the repository root:

```bash
npm run example:mock
```

This starts a local mock of the Anthropic API (deterministic answers, realistic usage numbers including cache reads) and runs the full check against it — the same plumbing as a live run, minus the model. CI runs this on every push.

## Run it live against Claude

```bash
export ANTHROPIC_API_KEY="sk-ant-…"
npm run example:check
```

The default model is `claude-haiku-4-5` — a full six-case run costs well under a penny. Set `CLAUDE_MODEL=claude-sonnet-5` to compare a bigger model against the same gold set: that comparison, gated by the same checks, is exactly how model routing decisions should be made.

If a live answer fails an anchor on phrasing alone, that's the designed workflow, not a bug: add the phrasing to the anchor's `aliases` and run again. Anchors tighten with use.

## Then look at the money

```bash
node dist/cli.js cost --dir examples/claude-doc-qa
```

Usage from your runs is real, not estimated. Document QA typically shows a heavily prompt-dominated ratio (the leaflet rides along with every question) — which is why `system.mjs` marks the document cacheable, and why prompt caching leads the recommendations.

The standing caveat, here more than anywhere: this example *measures grounding* against a fictional leaflet. A real medicines-information system needs a pharmacist in the loop before anything reaches a patient. The gate is the floor; the human is the ceiling.
