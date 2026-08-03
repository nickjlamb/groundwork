Groundwork's checks are now callable from Claude itself.

## MCP server

`groundwork-mcp` (stdio) exposes the same deterministic gate as four MCP tools for Claude Code, Cowork, and Claude Desktop:

- **`check_answer_grounding`** — paste a question, context, and answer; get a pass/fail with named issues (missing anchored facts, ungrounded numbers, missed abstention). No repo needed. Imports OpenGATE's exported gate logic directly, so the conversational verdict and the CI gate can never drift apart.
- **`check_readiness`** — runs the full `groundwork check` on a repo and returns exit code, grounding metrics, and named failures: exactly what CI would say.
- **`scaffold_harness`** — `groundwork init`, conversationally; never overwrites.
- **`cost_summary`** — measured token usage with savings in leverage order.

```json
{ "mcpServers": { "groundwork": { "command": "npx", "args": ["-y", "-p", "@pharmatools/groundwork", "groundwork-mcp"] } } }
```

Every tool result carries the caveat in the payload: a strong floor, not a guarantee — human in the loop for high-stakes answers.

## Agent Skill

[`skills/groundwork-readiness/`](skills/groundwork-readiness/) teaches an agent to detect a harness, scaffold one if missing, insist on gold cases from *real* failures rather than synthetic ones, read results correctly (a SKIPPED grounding row is not a pass), and refuse to present a green check as a safety certification. Ships in the npm tarball.

## Install / upgrade

```bash
npm install -D @pharmatools/groundwork@latest
```

Full history in [CHANGELOG.md](CHANGELOG.md).
