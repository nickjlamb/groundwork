# Example: Claude-backed structured extraction, gated

The extraction demo proves the harness with a rule-based toy; this example wires it to the real thing — a Claude-backed system that fills a JSON Schema from **fictional** referral letters ([`docs/referrals.md`](docs/referrals.md); the service and every detail are invented, which is the point — nothing here describes a real person or case).

Three files carry the ideas worth stealing:

- [`system.mjs`](system.mjs) — the "your system" side: a prompt that states the extraction contract explicitly (*every schema field present; null — never a guess — for anything the document does not state*), the instructions and schema sent with `cache_control`, and token usage returned from every call. Note the caching inversion versus document QA: there the document is the constant and questions vary; here the **schema** is the constant and documents vary, so the cached prefix is the schema side — the shape that pays off when you process forms at scale.
- [`groundwork/adapter.mjs`](groundwork/adapter.mjs) — the harness side: key-gated availability (no key → the eval skips with a helpful hint, not a 401), the redaction pre-step, and usage written into the results dir where `groundwork cost` reads it.
- [`groundwork/datasets/cases/`](groundwork/datasets/cases/) — one schema, three letters, every field hand-labelled from the letter itself. None of the letters state a date of birth, so that field's gold is `null` three times — the trap this example sets on purpose. The third letter is *incomplete* (no session count, no deadline): the only faithful extraction returns null for both, and the missed-field and abstention metrics tell faithfulness apart from helpfulness.

## Run it offline (no key)

From the repository root:

```bash
npm run example:extraction:mock
```

This starts a local mock of the Anthropic API (deterministic extractions, realistic usage numbers including schema-cache reads) and runs the full check against it — the same plumbing as a live run, minus the model. CI runs this on every push. To watch the gate catch a guessing model:

```bash
MOCK_FABRICATE=1 npm run example:extraction:mock
```

```
✗ EXTRACTION referral-knee-routine: FABRICATED field "date_of_birth": document does not state it (got "12 April 1988")
```

That failure is the whole archetype in one line: the guessed value makes the record look *more* complete, nothing downstream would flag it, and it is exactly the kind of plausible filler a capable model produces when the prompt doesn't forbid it — and the gate doesn't trust the prompt.

## Run it live against Claude

```bash
export ANTHROPIC_API_KEY="sk-ant-…"
npm run example:extraction:check
```

The default model is `claude-haiku-4-5` — a full three-letter run costs well under a penny. Set `CLAUDE_MODEL=claude-sonnet-5` to compare a bigger model against the same gold set: that comparison, gated by the same checks, is exactly how model routing decisions should be made.

If a live value fails on formatting alone (a date written differently, say), that's the designed workflow, not a bug: set the field's `normalize` entry or add the wording to its `aliases` and run again. Gold tightens with use — it never weakens.

## Then look at the money

```bash
node dist/cli.js cost --dir examples/claude-extraction
```

Usage from your runs is real, not estimated. Extraction at scale is prompt-dominated too — the schema and instructions ride along with every document — which is why `system.mjs` marks them cacheable, and why prompt caching leads the recommendations.

The standing caveat, here more than anywhere: this example *measures faithfulness to the document*. An extracted record feeds a decision — triage, eligibility, scheduling — and a wrong field is a wrong decision. In a real service, a person reviews each record before it enters a case file. The gate is the floor; the human is the ceiling.
