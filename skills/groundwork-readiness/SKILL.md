---
name: groundwork-readiness
description: Run deployment-readiness checks on a document-QA AI repo using Groundwork — scaffold the harness, check answer grounding against gold cases, freeze regression baselines, and profile token costs. Use when the user asks to check grounding, evaluate a RAG or document-QA system, set up deployment readiness, catch hallucination/fabrication, add a regression gate, or mentions groundwork, gold cases, or abstention checks.
---

# Groundwork deployment-readiness

Groundwork wraps a document-QA system in deterministic readiness checks: a redaction pre-step, a grounding eval built from the team's own gold cases, and a CI regression gate. Same inputs, same result, every time — no LLM judge, no API key for the checks.

## Detect the situation first

- **Repo already has a `groundwork/` directory** → the harness is scaffolded; go straight to running checks.
- **No harness yet** → scaffold it: `npx @pharmatools/groundwork init` (never overwrites existing files). Then the two human steps that no tool should do for them: wire `groundwork/adapter.mjs` to their system, and replace the example gold cases with cases from *real* failures — questions users actually asked. Offer to help draft cases, but insist on real sources over invented ones; synthetic gold sets produce box-ticking evals.

## Commands

```bash
npx groundwork check                 # redaction self-test + grounding eval
npx groundwork check --baseline      # freeze a good run as the regression floor
npx groundwork check --ci            # fail on any regression vs the committed baseline
npx groundwork cost                  # measured token usage + savings in leverage order
```

## Reading the output

The row that matters is `grounding`. PASS requires: all anchored facts present (`answer_recall`), zero `ungrounded_numbers` (every figure traces to the context), and full `abstention_rate` on unanswerable cases. Named failures like `ungrounded number "14" — not in the provided context` are the product working, not noise — each one is a fabrication that would otherwise have shipped.

Two readings to get right: other scorers showing SKIPPED is normal (they belong to other eval shapes); the **grounding row itself** showing SKIPPED is *not* a pass — usually the adapter isn't available or no cases were found.

If an anchor fails on phrasing alone, add the phrasing to that anchor's `aliases` rather than weakening the anchor.

## Gold-case shape

```json
{
  "id": "max-daily",
  "kind": "grounding",
  "question": "What is the maximum amount I can take in 24 hours?",
  "context": "…the passage retrieval returned…",
  "answerAnchors": [{ "value": "100 mg", "aliases": ["100mg"] }],
  "allowedNewNumbers": [],
  "answerable": true
}
```

Always keep at least one case with `"answerable": false` — abstention failures are where document-QA systems hurt people.

## The caveat that must survive summarisation

When reporting results to the user, always carry this through: a passing gate is a strong **floor**, not a safety certification. For answers affecting health, money, legal standing, or safety, a human reviews before the answer reaches the person it affects. Never present a green check as "the system is safe."

## MCP alternative

If the `groundwork` MCP server is connected, prefer its tools: `check_readiness`, `check_answer_grounding` (single answer, no repo needed), `scaffold_harness`, `cost_summary`. Server: `groundwork-mcp` (stdio), shipped with the npm package.
