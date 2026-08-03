# Roadmap

Directional, not promised — items ship when they're done properly, and the ordering follows one rule: **depth before breadth**. Document QA gets finished before a second archetype is started.

## Near term (0.2.x)

- **HTML report polish** — `check --report` output worth showing a stakeholder: per-case detail, baseline deltas, redaction summary.
- **Windows support for the demo scripts** — `demo:break` uses POSIX env syntax; make every npm script cross-platform.
- **Grounding usage capture upstream** — the example's usage-sidecar pattern belongs in OpenGATE's grounding scorer, so every adapter gets `cost` data without custom code.
- **Richer case linting** — `groundwork check` warning on weak gold sets: no unanswerable cases, anchors that also appear in the question, empty `aliases` on long anchors.

## Medium term (0.3.x)

- **Retrieval scoring for document QA** — when the adapter exposes retrieval, score whether the right passage was found before scoring the answer (OpenGATE already has the scorer; wire the archetype).
- **A second worked example** — a different domain (legal or local-government documents) to show the harness isn't pharma-shaped.
- **Gold-case pattern library** — documented case patterns from real deployments: dose-ceiling traps, entity-confusion pairs, near-miss abstentions.

## Explicitly not planned

These keep the project honest rather than ambitious:

- **No LLM judges.** Deterministic checks only — reproducibility is the point.
- **No hosted SaaS or dashboard.** Groundwork is a thing you run, not a thing you sign up for.
- **No safety certification.** The gate is a floor. A human reviews high-stakes outputs, always.
- **No second archetype before document QA is genuinely finished.**

Suggestions and real-world failure patterns are the most useful input — [open an issue](https://github.com/nickjlamb/groundwork/issues).
