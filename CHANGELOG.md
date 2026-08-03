# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- **Retrieval fidelity for document QA** — adapters can expose `fetchRecord({ id })` and add gold cases of kind `"retrieval"`: hand-copied anchors from the source document that catch ingestion regressions (truncated bodies, dropped titles, garbled fields) before they silently poison every grounded answer downstream. Scaffolded as an opt-in block in the adapter template plus `_template-retrieval.json`; the demo now exercises it in both pass and break modes.
- **The course** (`docs/course/`) — six checkpoint-driven lessons from prototype to gated deployment, including the sabotage test (deliberately break your system on a branch; prove CI catches it) and a completion checklist whose final item is the one no tool can check.
- `init` now scaffolds `groundwork/DEPLOYMENT-LOG.md` — the no-telemetry measurement story: time-to-production milestones, incidents the gate caught before users saw them, and the weekly gold-set habit, recorded by the partner in about a minute a week.

## [0.2.0] — 2026-08-03

### Added

- **MCP server** (`groundwork-mcp`, stdio) — the same deterministic checks as MCP tools for Claude Code, Cowork, and Claude Desktop: `check_readiness`, `check_answer_grounding` (single answer, shares OpenGATE's exact gate logic), `scaffold_harness`, `cost_summary`. Every result carries the floor-not-guarantee caveat.
- **Agent Skill** (`skills/groundwork-readiness/`) — teaches an agent to detect a harness, run the gate, read results honestly, and refuse to present green checks as safety certification. Ships in the npm package.

## [0.1.0] — 2026-08-03

First public release.

### Added

- `groundwork init` — scaffolds the readiness harness into a repo: adapter boundary, redaction pre-step config, gold-set templates with labelling guide, GitHub Action, and the `GROUNDWORK.md` playbook. Never overwrites existing files.
- `groundwork check` — redaction self-test (Redacta) followed by the OpenGATE grounding eval: anchored facts, number tracing, abstention on unanswerable questions. `--baseline` freezes a regression floor; `--ci` fails on regression; `--report` writes an HTML report.
- `groundwork cost` — reads measured token usage from eval results and recommends savings in leverage order (prompt caching, batching, context trimming, model routing).
- Offline demo (`npm run demo` / `npm run demo:break`) — the full loop with no API key, including a fabricating mode the gate catches by name; both behaviours asserted in CI.
- Claude-backed example (`examples/claude-doc-qa/`) — fictional medicine leaflet, answer-from-document-only prompting, prompt caching, key-gated live evals, a mock Anthropic API for offline CI, and usage capture feeding `cost`.
- Committed regression baselines for the demo and the example, enforced by the test suite.
- Docs: `docs/GETTING-STARTED.md` walkthrough; website at [pharmatools.ai/groundwork](https://www.pharmatools.ai/groundwork).

[Unreleased]: https://github.com/nickjlamb/groundwork/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/nickjlamb/groundwork/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nickjlamb/groundwork/releases/tag/v0.1.0
