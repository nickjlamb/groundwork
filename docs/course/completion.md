# Completion checklist — what "deployment-ready" means here

Work through honestly; the last item is the one no tool can check.

## The machine-checkable part

- [ ] Adapter wired; `onlineConfigHint()` says something a teammate would understand
- [ ] Redaction self-test passing; the free-prose boundary understood by everyone who touches sensitive text
- [ ] Gold set of real cases, including unanswerable ones, each anchor defensible out loud
- [ ] *(If your system serves sections by ID)* retrieval fidelity cases pinning your most load-bearing sections, anchors hand-copied from the source
- [ ] Baseline committed; CI gate live; **sabotage test performed and caught**
- [ ] Costs measured; caching considered before model changes
- [ ] `DEPLOYMENT-LOG.md` started; weekly transcript habit scheduled

## The human part

- [ ] **A named person reviews high-stakes outputs before they reach the person they affect** — and everyone on the team can say who.

A green gate means your system's grounding is *measured and can't silently regress*. It does not mean the system is safe. For answers that touch someone's health, money, legal standing, or safety, the review step above is not a transitional arrangement to be automated away later; it's part of the design. Groundwork raises the floor for the many teams who today ship with no evaluation at all — it does not replace judgment where the stakes are highest.

If all boxes are ticked: you're running a document-QA system with a privacy pre-step, a regression-gated eval built from your own users' reality, measured costs, and a written account of your deployment. That puts you ahead of most production AI systems, including well-funded ones.

## Keep going

- A failure pattern worth sharing? The [contributing guide](../../CONTRIBUTING.md) explains how anonymised gold-case patterns help every team using this.
- Run the checks from Claude itself — the [MCP server](../../README.md#use-from-claude) ships in the package.
- The [roadmap](../../ROADMAP.md) — including what's deliberately not planned.
