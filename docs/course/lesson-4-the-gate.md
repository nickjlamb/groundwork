# Lesson 4 · The gate — freeze a floor, then try to break it

**Goal:** a CI gate that provably catches regressions — proven by you, sabotaging your own system on purpose. **Time:** ~20 minutes.

## Freeze the baseline

When `check` reflects a run you're happy with:

```bash
npx groundwork check --baseline
git add groundwork/results/baseline.*.json .github/workflows/groundwork.yml
git commit -m "Add grounding baseline and CI gate"
git push
```

The scaffolded GitHub Action now runs `check --ci` on every pull request and fails anything below the committed floor. (HTTP-shaped adapter: set `SYSTEM_URL` as a repo variable and `SYSTEM_TOKEN` as a secret in GitHub settings.)

## Exercise — the sabotage test

A gate you've never seen fail is a gate you're trusting on faith. So, on a branch, make your system worse **on purpose**. Pick one:

- Edit your system prompt to *encourage* helpfulness over grounding — "always give your best estimate even if the documents don't say."
- Or crudely: in the adapter, append `" Processing typically takes 14 days."` to every answer before returning it.

Open a PR. Watch the Action go red, and read the named failures — this is exactly what a bad prompt change by a well-meaning teammate will look like six months from now. Then revert the branch and watch it go green.

## Checkpoint ✅

- [ ] Baseline file committed; Action present in `.github/workflows/`
- [ ] The sabotage PR went **red**, with failures named in the log
- [ ] The revert went **green**
- [ ] Nobody merged the sabotage PR 🙂

## What you've actually built

From this commit forward, "did we make the AI worse?" is no longer a matter of opinion, vigilance, or hoping someone re-tested manually. It's a build status. That's the whole trick — reliability turned into infrastructure.

**Next:** [Lesson 5 · Costs and the habit →](lesson-5-costs-and-habit.md)
