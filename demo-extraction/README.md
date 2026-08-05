# The offline extraction demo

Proof that the whole loop runs with **no API key and no network**: a tiny rule-based "extraction system" (`system.mjs`), wrapped in exactly the harness `groundwork init extraction` scaffolds — redaction pre-step, schema validation, field-level accuracy against hand-labelled gold, fabrication and abstention checks, and a committed regression baseline.

```bash
npm run demo:extraction         # the well-behaved system — every check green
npm run demo:extraction:break   # the same system, misbehaving — the gate catches it by name
```

The break mode makes the system do the two things real extraction systems do wrong silently:

1. **Guess a value the document never states** — a plausible date of birth on a referral that doesn't contain one. Gold for that field is `null`, so the gate fails with `FABRICATED field "date_of_birth": document does not state it`. This is the extraction hallucination: the record looks *more* complete, and everything downstream trusts it.
2. **Drop a required field** — `referral_date` comes back `null`. The schema types it non-nullable, so schema validation fails: nullability is the abstention contract, and it catches a dropped field with no extra configuration.

The point of the demo is the harness, not the system: swap `system.mjs` for your real pipeline by editing one file (`groundwork/adapter.mjs`), label ten real documents as gold, and you have the same loop around something that matters. The walkthrough scaffolded by `groundwork init extraction` (GROUNDWORK.md) takes it from there.

Both behaviours — green when faithful, red with named failures when not — are asserted in CI on every commit.
