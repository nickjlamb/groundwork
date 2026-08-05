# {{PROJECT_NAME}} — deployment-readiness playbook

This file was scaffolded by `groundwork init extraction`. It walks you from a working document-extraction prototype — documents in, structured fields out — to something you can responsibly put in front of users: in an afternoon, without an ML engineer. Work top to bottom; each step leaves something running.

**What Groundwork is, honestly:** a strong floor, not a guarantee. It automates the checks that can be automated — redaction, schema validation, field-level accuracy against your own labelled documents, regression gating, cost hygiene. It cannot certify an AI system safe, and it does not replace human review for records that affect someone's health, money, legal standing, or safety. Extraction feeds decisions — a wrong field is a wrong decision — so keep a person in that loop. That is not a limitation of this tool so much as the current state of the field, stated plainly.

## Step 1 — Wire your system (one file)

Edit **`groundwork/adapter.mjs`** — the only code you need to touch. Point the `extract()` function at your system: it receives `{ document, schema }` and must return `{ record }`, with every schema field present and **null for anything the document does not state** — unknown → null, never guessed. The default assumes a JSON endpoint at `POST $SYSTEM_URL/extract`; reshape the fetch call if yours differs.

```bash
export SYSTEM_URL="https://your-api.example.com"
export SYSTEM_TOKEN="…"        # only if your API needs it
```

## Step 2 — Redaction: nothing sensitive leaves your machine

The adapter already runs every document through a deterministic redaction pass (Redacta) before anything is sent — identifiers like NHS numbers, phone numbers, and dates of birth become labelled tokens locally. Configure what's caught in **`groundwork/redaction.config.json`** (add `"safeharbor"` for the stricter US HIPAA pass).

One interplay to understand: redaction runs *before* extraction, so the fields you extract and gate on should be business fields — dates, amounts, reasons, categories — not the identifiers redaction exists to strip. Use the same pattern in production: the ~40 lines at the top of the adapter are exactly the pre-step your live pipeline should run. Redaction is deterministic and keyword-anchored — it will not catch names in free prose. Review its report before sensitive text goes anywhere.

## Step 3 — Write your schema: nullability is the abstention contract

The JSON Schema in each gold case is your contract with the system, and one design choice does most of the safety work: a field the system must always find is non-nullable (`"type": "string"`); a field a document may legitimately not state is nullable (`"type": ["string", "null"]`). From then on, a dropped required field fails schema validation and turns the build red — no extra configuration.

## Step 4 — Label real documents as gold

Open **`groundwork/datasets/LABELLING.md`** and replace the example cases in `groundwork/datasets/cases/` with your own: real referrals, applications, or forms, each field labelled by hand **from the document, never from your system's output**. The line that matters most: **gold `null` means the document does not state it** — a value extracted there is a fabrication (a guessed date of birth on a referral is the extraction twin of a fabricated dose), and the gate names it per field. Ten labelled documents is a working gold set.

## Step 5 — Run the check

```bash
npx @pharmatools/groundwork check
```

This runs the redaction self-test, then the extraction eval: does each record validate against your schema? Does every field match its hand-labelled gold value (dates compared in ISO, money in minor units, wording variants via aliases)? Is every unstated field null? All deterministic — no judge model, no API key for the checks themselves, results reproducible to the decimal.

The output lists several scorers; for extraction the row that matters is **`extraction`** (the others belong to eval shapes your adapter doesn't implement, and skip cleanly). If the extraction row itself was skipped, the run is not a pass — the summary will say so and point at what's missing.

## Step 6 — Freeze a baseline and gate your CI

Happy with a run? Save it as the floor future changes are measured against, and commit it:

```bash
npx @pharmatools/groundwork check --baseline
git add groundwork/results/baseline.*.json .github/workflows/groundwork.yml
git commit -m "Add extraction baseline and CI gate"
```

The scaffolded GitHub Action (`.github/workflows/groundwork.yml`) now fails any pull request that makes extraction worse — including the quiet regressions: `missed_fields` creeping up, `value_recall` drifting down. Set the `SYSTEM_URL` variable (and `SYSTEM_TOKEN` secret) in your repository settings. From here, reliability can't quietly regress — a prompt tweak that starts guessing missing values shows up as a red build, not a wrong record in someone's case file.

## Step 7 — Costs

```bash
npx @pharmatools/groundwork cost
```

Reads token usage from your eval runs and recommends the cheap wins in leverage order — prompt caching for repeated schema and instruction context (often the single biggest saving when you process forms at scale), batching for non-urgent queues, and model routing only after those. Measure first; optimise second.

## The habit that makes this work

Once a week, review a handful of extracted records against their source documents. When one surprises you — a wrong value, a guess where the document was silent — turn it into a gold case (Step 4): two minutes of work that permanently pins down the failure. The gold set growing out of real use is what turns this harness from scaffolding into judgment.

## Step 8 — Keep the score honest

Groundwork sends no telemetry — nothing about your system, your documents, or your users leaves your machines. So the measurement lives with you: **`groundwork/DEPLOYMENT-LOG.md`** tracks your time-to-production, the failures the gate caught before users saw them, and the weekly gold-set habit. A minute a week; it's also exactly what a supporting organisation will ask to see.

---

*Scaffolded by [Groundwork](https://www.npmjs.com/package/@pharmatools/groundwork). These files are MIT-0 — yours, no attribution needed.*
