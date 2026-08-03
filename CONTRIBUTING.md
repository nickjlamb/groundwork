# Contributing to Groundwork

Thanks for being here. Groundwork stays useful by staying honest and small — contributions that fit that spirit are very welcome.

## The two-minute setup

```bash
git clone https://github.com/nickjlamb/groundwork.git && cd groundwork
npm install        # also builds, via the prepare script
npm test           # 13 tests, all offline — should be green before you start
```

Node 18+. No API keys needed for anything in the test suite: the Claude example runs against a local mock in tests, and the live path is exercised manually by maintainers.

## What's especially welcome

- **Bug reports with a failing case.** The repo's own medicine is the best format: a gold case (or test) that demonstrates the problem beats a description of it.
- **Gold-case patterns from real deployments.** Anonymised patterns of how document-QA systems actually fail — these improve the templates and `LABELLING.md` for everyone.
- **Examples.** A worked example in a new domain (legal, local government, education) following the shape of `examples/claude-doc-qa/`: offline mock for CI, key-gated live path, usage capture.
- **Docs fixes.** If the walkthrough confused you, that's a bug in the walkthrough.

Before starting anything sizeable, [open an issue](https://github.com/nickjlamb/groundwork/issues) first — the [roadmap](ROADMAP.md) lists several things deliberately *not* planned (LLM judges, hosted anything, new archetypes for now), and it's better to find that out before writing code.

## Ground rules for changes

1. **Determinism is load-bearing.** Checks must produce the same result for the same inputs, offline. Anything that adds a model call, network dependency, or randomness to the check path will be declined.
2. **The gate must keep gating.** `npm test` includes tests that assert the demo *fails* when the system fabricates, and that committed baselines survive the suite. If your change breaks those, the change is wrong — not the tests.
3. **Honest copy is part of the product.** The "strong floor, not a guarantee" framing and the human-in-the-loop caveats are deliberate, everywhere they appear. Don't soften them, don't inflate them.
4. **Scaffolded files stay MIT-0.** Everything under `templates/` lands in a partner's repo as theirs — keep it dependency-light and attribution-free.

## Pull requests

- One change per PR, with tests where behaviour changes.
- `npm test` green (CI runs it, plus the offline demo in both pass and break modes).
- If you change what `check` prints, include before/after output in the PR description.
- Update `CHANGELOG.md` under **Unreleased** — one line, user-facing phrasing.

## Conduct

Be kind and assume good faith. The maintainer reserves the boring right to close anything hostile or off-mission. Substantive disagreement — especially "this check gives false confidence" — is not off-mission; it's the most valuable issue you can file.

## Security

For anything sensitive (a redaction bypass above all), see [SECURITY.md](SECURITY.md) rather than a public issue.
