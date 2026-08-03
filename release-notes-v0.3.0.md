Document QA, deepened — this release guards the layer *underneath* the answers, teaches the whole thing as a course, and gives partners the measurement story.

## Retrieval fidelity

Grounding checks verify answers against the context they were given. But if your ingestion pipeline serves a truncated or garbled section, every answer grounded on it inherits the damage — and nothing in the answers looks wrong. Adapters can now expose `fetchRecord({ id })`, with gold cases of kind `"retrieval"` pinning `requireFields` and anchors **hand-copied from the source document, never from your system's output**. Two or three cases on your most load-bearing sections catch a bad ingestion deploy by name:

```
✗ FIDELITY fidelity-savings: body missing "£16,000"
```

Opt-in via a commented block in the scaffolded adapter; `npm run demo` / `demo:break` exercise it in both directions. (For PubMed-shaped systems, `fetchRecord` can wrap a structured retrieval layer like PubCrawl.)

## The course

[`docs/course/`](docs/course/) — six checkpoint-driven lessons from prototype to gated deployment. Every checkpoint is verifiable ("this now works on your machine", never "you have read this"), including the **sabotage test**: deliberately break your own system on a branch and prove CI catches it. The completion checklist ends with the one item no tool can check — a named person reviews high-stakes outputs, and everyone on the team can say who.

## Deployment log

`init` now scaffolds `groundwork/DEPLOYMENT-LOG.md`. Groundwork sends no telemetry — so the measurement lives with you: time-to-production milestones, incidents the gate caught before users saw them, and the weekly gold-set habit. About a minute a week; it's also what a supporting organisation will ask to see.

## Install / upgrade

```bash
npm install -D @pharmatools/groundwork@latest
```

Roadmap note: this closes the 0.3.x retrieval item by deepening document QA rather than starting a second archetype — the "explicitly not planned" list stands. Full history in [CHANGELOG.md](CHANGELOG.md).
