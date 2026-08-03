# Groundwork demo — the whole loop in 60 seconds, no API key

This folder is a miniature partner repo: a tiny document-QA "system" (`system.mjs` — extractive, local, deliberately boring) wrapped in the harness that `groundwork init` scaffolds. Everything runs offline; there is nothing to sign up for.

## Run it

From the repository root:

```bash
npm install && npm run build
npm run demo
```

You'll see the redaction self-test pass, then the grounding eval run five gold cases against the demo system: three answerable (facts and figures must trace to `docs/programme-guide.md`) and two unanswerable (the system must abstain, not guess). It passes: 100% anchor recall, zero ungrounded numbers, 100% abstention.

## Now break it

```bash
npm run demo:break
```

This flips the demo system into the failure modes real systems actually have: it appends an invented figure to correct answers, and it confidently answers questions the document can't support. The gate catches both, by name — three `ungrounded number "14"` failures and two failed abstentions — and the build exits non-zero. That red build is the product: with the baseline committed and the GitHub Action in place, a prompt or model change that starts fabricating can't reach production quietly.

## What to look at

- `system.mjs` — the stand-in for *your* system, and the `DEMO_FABRICATE` switch.
- `groundwork/adapter.mjs` — the one-file boundary; identical in shape to the scaffolded one, pointed at the local system instead of an HTTP endpoint.
- `groundwork/datasets/cases/` — five gold cases; note the two unanswerable ones, which is where document-QA systems fail most dangerously.

The checks are deterministic — same inputs, same result, every time, free. And the usual caveat, because it is true here too: passing this gate makes the system's grounding *measured*, not its answers *safe*. Keep a human in the loop for outputs that matter.
