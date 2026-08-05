# Roadmap

Directional, not promised — items ship when they're done properly, and the ordering follows one rule: **depth before breadth**. Each deployment pattern gets finished before the next one is started.

## The plan: three archetypes, then stop

Groundwork's units are deployment patterns, not products — think Terraform modules for trustworthy AI deployments. `groundwork init <archetype>` scaffolds the whole harness for a pattern. The plan is three, chosen because each has structurally different deployment concerns, and stopping there so the templates embody engineering judgment rather than genericness:

1. **Document QA** — documents → retrieval → grounded answers → human review. **Shipped** (v0.1–v0.3): grounding, abstention, retrieval fidelity, redaction, costs, CI gate, course, live Claude example.
2. **Structured extraction** — documents → structured fields → schema validation → human review. **Shipped** (v0.4): field accuracy against hand-labelled gold, per-field abstention (null = the document doesn't state it), fabricated-field detection, real JSON Schema validation where nullability is the abstention contract.
3. **Research & evidence synthesis** — questions → evidence → synthesis → human review. **Planned.** Not started; it starts when extraction is genuinely finished.

## Near term

- **Extraction case linting** — warnings on weak extraction gold sets: no null-gold fields (abstention never exercised), schemas with everything nullable (nothing required), gold suspiciously identical to a system's output.
- **HTML report polish** — `check --report` output worth showing a stakeholder: per-case detail, baseline deltas, redaction summary — now per archetype.
- **Windows support for the demo scripts** — the `demo:*:break` scripts use POSIX env syntax; make every npm script cross-platform.
- **Doc-freshness test in CI** — docs quote CLI and demo output; a test that fails when quoted lines drift from real output.
- **Gold-case pattern library** — documented case patterns from real deployments: dose-ceiling traps, entity-confusion pairs, near-miss abstentions, guessed-identifier fields.

## Explicitly not planned

These keep the project honest rather than ambitious:

- **No LLM judges.** Deterministic checks only — reproducibility is the point.
- **No hosted SaaS or dashboard.** Groundwork is a thing you run, not a thing you sign up for.
- **No safety certification.** The gate is a floor. A human reviews high-stakes outputs, always.
- **No fourth archetype.** Classification, workflow automation, and everything else stay out — three patterns done with judgment beat a template zoo. If your pattern fits one of the three, the harness is yours; if it doesn't, Groundwork is honestly not the tool.
- **No archetype started before the previous one is genuinely finished.**

Suggestions and real-world failure patterns are the most useful input — [open an issue](https://github.com/nickjlamb/groundwork/issues).
