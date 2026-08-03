# Groundwork

**A deployment-readiness harness for document-QA AI systems.**

You have a prototype: your documents, users' questions, a model's answers. Groundwork scaffolds the layer between that prototype and safe production — redaction before anything leaves your machine, grounding checks against your own gold set, a CI gate so reliability can't quietly regress, and a playbook written for teams without an ML engineer.

```bash
npx @pharmatools/groundwork init
```

## What `init` gives you

- **Redaction pre-step** ([Redacta](https://www.npmjs.com/package/@pharmatools/redacta)) — deterministic identifier stripping, so sensitive inputs never reach an API.
- **Grounding eval** ([OpenGATE](https://www.npmjs.com/package/@pharmatools/opengate)) — does every answer trace to your documents? Does the system abstain when it should? Deterministic, no LLM judge.
- **A gold-set template** you fill from your *real* failures — your judgment, encoded as regression tests.
- **A CI regression gate** — a GitHub Action that fails the build if grounding drops below your baseline.
- **A cost profiler** — measures token usage and recommends the cheap wins (caching, batching) in leverage order.
- **A playbook** (`GROUNDWORK.md`) that walks a non-ML team through all of it.

## What Groundwork is not

Groundwork is a strong **floor**, not a guarantee. Deterministic checks catch the failures that can be caught deterministically; they cannot certify an AI system safe. For high-stakes outputs — anything touching health, legal standing, benefits, or safety — a human must review before the answer reaches the person it affects. The scaffolded playbook says this too, on purpose, where your team will read it.

## Status

Early — v1 targets a single archetype (document QA) and does it properly before anything else is added.

## Licence

MIT. Files scaffolded into your repo are MIT-0 — use them without attribution.
