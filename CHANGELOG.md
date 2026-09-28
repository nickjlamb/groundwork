# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [semantic versioning](https://semver.org/).

## [Unreleased]

## [0.4.1] — 2026-09-28

### Added

- **`groundwork mcp`** — starts the MCP server over stdio, same as the `groundwork-mcp` binary. This is the launch path for MCP Registry clients, which run `npx -y @pharmatools/groundwork mcp`.
- **MCP Registry listing** — `mcpName` (`io.github.nickjlamb/groundwork`) in `package.json` and a `server.json` for publishing to the official registry.
- **Claude-backed extraction example** (`examples/claude-extraction/`) — the archetype's success test against a real model: Claude fills one schema from three fictional referral letters, with the extraction contract in the prompt (every field present; unknown → null, never guessed), the schema as the cached prefix (the mirror image of document QA's cached document), key-gated evals, usage feeding `groundwork cost`, and a mock Anthropic API so the whole loop runs offline in CI — including a `MOCK_FABRICATE=1` mode proving the gate names a guessed date of birth.

### Fixed

- The MCP server reports its version from `package.json` instead of a hard-coded value.

## [0.4.0] — 2026-08-04

The second archetype. Groundwork's units are deployment patterns, not products — `groundwork init <archetype>` scaffolds the whole harness for one. This release adds **structured extraction**: documents → structured fields → schema validation → human review.

### Added

- **`groundwork init extraction`** — scaffolds the extraction archetype: an `extract({ document, schema }) → { record }` adapter boundary (unknown → null, never guessed), an extraction playbook and labelling guide, gold-case templates and examples, plus the shared redaction pre-step, GitHub Action, and deployment log. `groundwork init` (and `init document-qa`) keeps scaffolding document QA — nothing shipped changes behaviour.
- **The extraction eval** (via [OpenGATE 0.10](https://github.com/nickjlamb/opengate)) — deterministic, per field: schema validity gates, with **nullability as the abstention contract** (a dropped required field fails schema validation, no extra configuration); field accuracy against hand-labelled gold with per-field normalisers (dates → ISO, money → minor units, text folding) and aliases; fabrication named per field — `FABRICATED field "date_of_birth": document does not state it` is the extraction twin of a fabricated dose; missed fields and abstentions reported as precision/recall and gated on regression via the existing baseline machinery. `groundwork check` reads the repo's archetype and judges the right scorer row.
- **Offline extraction demo** (`npm run demo:extraction` / `demo:extraction:break`) — the full loop with no API key on fictional referral and grant documents; the break mode guesses a date of birth the document never states and drops a required field, and the gate names both. Asserted in CI in both modes, like the document-QA demo.
- **MCP: `check_extraction`** — check a single extracted record against gold + schema conversationally, sharing OpenGATE's exact gate logic; `scaffold_harness` takes an `archetype`; `check_readiness` reports the archetype's main scorer. The Agent Skill now covers both archetypes.
- **Course lesson 6** — structured extraction: run the loop, catch the guessed field, write one case from a real document.

### Changed

- Templates reorganised per archetype (`templates/document-qa/`, `templates/extraction/`, shared files in `templates/shared/`) — `initFiles()` output for document QA is unchanged.
- Roadmap restated around the three-pattern plan (document QA ✅, extraction ✅, research synthesis planned) — and a fourth archetype added to "explicitly not planned".

## [0.3.0] — 2026-08-03

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

[Unreleased]: https://github.com/nickjlamb/groundwork/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/nickjlamb/groundwork/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/nickjlamb/groundwork/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nickjlamb/groundwork/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nickjlamb/groundwork/releases/tag/v0.1.0
