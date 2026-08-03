# {{PROJECT_NAME}} — deployment-readiness playbook

This file was scaffolded by `groundwork init`. It walks you from a working document-QA prototype to something you can responsibly put in front of users — in an afternoon, without an ML engineer. Work top to bottom; each step leaves something running.

**What Groundwork is, honestly:** a strong floor, not a guarantee. It automates the checks that can be automated — redaction, grounding, regression gating, cost hygiene. It cannot certify an AI system safe, and it does not replace human review for answers that affect someone's health, money, legal standing, or safety. Keep a person in that loop. That is not a limitation of this tool so much as the current state of the field, stated plainly.

## Step 1 — Wire your system (one file)

Edit **`groundwork/adapter.mjs`** — the only code you need to touch. Point the `answer()` function at your system: it receives `{ question, context }` and must return `{ text }`. The default assumes a JSON endpoint at `POST $SYSTEM_URL/answer`; reshape the fetch call if yours differs.

```bash
export SYSTEM_URL="https://your-api.example.com"
export SYSTEM_TOKEN="…"        # only if your API needs it
```

## Step 2 — Redaction: nothing sensitive leaves your machine

The adapter already runs every question and context through a deterministic redaction pass (Redacta) before anything is sent — identifiers like NHS numbers, phone numbers, and dates of birth become labelled tokens locally. Configure what's caught in **`groundwork/redaction.config.json`** (add `"safeharbor"` for the stricter US HIPAA pass).

Use the same pattern in production: the ~40 lines at the top of the adapter are exactly the pre-step your live pipeline should run. Redaction is deterministic and keyword-anchored — it will not catch names in free prose. Review its report before sensitive text goes anywhere.

## Step 3 — Build your gold set from real failures

Open **`groundwork/datasets/LABELLING.md`** and replace the three example cases in `groundwork/datasets/cases/` with your own. The rule of the house: every case comes from a question a user really asked or a failure you really saw. Keep at least one *unanswerable* case — when the documents can't answer, your system must say so rather than invent.

## Step 4 — Run the check

```bash
npx @pharmatools/groundwork check
```

This runs the redaction self-test, then the grounding eval: are the required facts in each answer? Does every number trace to your documents? Does the system abstain when it should? All deterministic — no judge model, no API key for the checks themselves, results reproducible to the decimal.

The output lists several scorers; for document QA the row that matters is **`grounding`** (the others belong to eval shapes your adapter doesn't implement, and skip cleanly). If the grounding row itself was skipped, the run is not a pass — the summary will say so and point at what's missing.

## Step 5 — Freeze a baseline and gate your CI

Happy with a run? Save it as the floor future changes are measured against, and commit it:

```bash
npx @pharmatools/groundwork check --baseline
git add groundwork/results/baseline.*.json .github/workflows/groundwork.yml
git commit -m "Add grounding baseline and CI gate"
```

The scaffolded GitHub Action (`.github/workflows/groundwork.yml`) now fails any pull request that makes grounding worse. Set the `SYSTEM_URL` variable (and `SYSTEM_TOKEN` secret) in your repository settings. From here, reliability can't quietly regress — a prompt tweak that breaks abstention shows up as a red build, not a user complaint.

## Step 6 — Costs

```bash
npx @pharmatools/groundwork cost
```

Reads token usage from your eval runs and recommends the cheap wins in leverage order — prompt caching for repeated document context (often the single biggest saving for document-QA), batching for non-urgent work, and model routing only after those. Measure first; optimise second.

## The habit that makes this work

Once a week, read a handful of real transcripts. When one surprises you, turn it into a gold case (Step 3) — two minutes of work that permanently pins down the failure. The gold set growing out of real use is what turns this harness from scaffolding into judgment.

---

*Scaffolded by [Groundwork](https://www.npmjs.com/package/@pharmatools/groundwork). These files are MIT-0 — yours, no attribution needed.*
