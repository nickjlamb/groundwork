# Getting started with Groundwork

> Prefer a guided path? [The course](course/) covers this same material as six short lessons with verifiable checkpoints — including the sabotage test that proves your CI gate actually catches regressions.

This walkthrough takes you from a working document-QA prototype to a system with a redaction pre-step, a grounding eval built from your own real failures, and a CI gate that fails any change which makes reliability worse. Plan for about half an hour, most of it spent writing gold cases — which is the half hour that matters.

You need Node 18+ and a document-QA system you can call from JavaScript: an HTTP endpoint, or a local module. No ML engineering, no eval expertise, and — for the checks themselves — no API key. Every check is deterministic: same inputs, same result, free.

**What Groundwork is, honestly, before you start:** a strong floor, not a guarantee. It automates the checks that can be automated. It cannot certify your system safe, and it does not replace human review for answers that affect someone's health, money, legal standing, or safety.

## 1. See it work first (60 seconds)

Before touching your own system, watch the loop run on the built-in demo:

```bash
git clone https://github.com/nickjlamb/groundwork.git && cd groundwork
npm install && npm run build
npm run demo          # the whole loop passes, fully offline
npm run demo:break    # the system starts fabricating — the gate catches it by name
```

The second command is the product in miniature: a system that invents a figure or answers when it should abstain turns the build red, with each failure named. Everything below wires that same gate to *your* system.

## 2. Install it in your project

```bash
npm install -D @pharmatools/groundwork
```

(To track the unreleased main branch instead: `npm install -D github:nickjlamb/groundwork` — the package builds itself on install.)

## 3. Scaffold the harness

From your project root:

```bash
npx groundwork init
```

which writes ten files and won't overwrite anything that already exists:

```
groundwork init — your-project

  + GROUNDWORK.md
  + groundwork/adapter.mjs
  + groundwork/datasets/LABELLING.md
  + groundwork/datasets/cases/_template.json
  + groundwork/datasets/cases/example-eligibility.json
  + groundwork/datasets/cases/example-numeric.json
  + groundwork/datasets/cases/example-unanswerable.json
  + groundwork/groundwork.config.json
  + groundwork/redaction.config.json
  + .github/workflows/groundwork.yml
```

`GROUNDWORK.md` is the same playbook as this walkthrough, living in your repo. These scaffolded files are MIT-0 — yours, no attribution needed.

## 4. Wire your system (one file)

`groundwork/adapter.mjs` is the only code you edit. The eval never talks to your system except through its `answer()` function: it receives `{ question, context }` and must return `{ text }` — your system's answer as a string.

If your system is an **HTTP endpoint**, the scaffolded default is already close: set `SYSTEM_URL` (and `SYSTEM_TOKEN` if you need auth) and reshape the `fetch` call to match your API.

If your system is a **local module** — a pipeline you can import — replace the fetch block with a call to it, and make the adapter always available:

```js
export const onlineAvailable = () => true;

// …inside answer(), after the redaction pre-step:
const { answerFromDocs } = await import("../qa-pipeline.mjs");
return answerFromDocs(safeQuestion, safeContext);
```

Leave the redaction pre-step at the top of the file alone: it runs every question and context through a deterministic, local redaction pass before anything reaches your system, so identifiers like phone numbers and NHS numbers become labelled tokens without leaving the machine. Configure what's caught in `groundwork/redaction.config.json` (add `"safeharbor"` for the stricter US HIPAA pass). Be clear about its limits: it's keyword-anchored and will not catch names in free prose — review its output before sensitive text goes anywhere.

## 5. Build your gold set from real failures

This is the judgment step, and no tool can do it for you. Replace the three example cases in `groundwork/datasets/cases/` with your own — `_template.json` shows the shape, `LABELLING.md` the method. The rule of the house: **every case comes from a question a user really asked or a failure you really saw.**

A case looks like this:

```json
{
  "id": "office-hours",
  "kind": "grounding",
  "description": "Opening days must come from the handbook, not memory.",
  "question": "When is the support office open?",
  "context": "The support office is open Monday to Friday, from 9am to 5pm, at the Civic Centre.",
  "answerAnchors": [
    { "value": "Monday to Friday", "aliases": ["monday-friday", "weekdays"] }
  ],
  "allowedNewNumbers": [],
  "answerable": true
}
```

Three habits make cases robust. Keep each anchor to the shortest distinctive phrase a correct answer must contain, and put acceptable rephrasings in `aliases` rather than making the anchor long. Leave `allowedNewNumbers` empty unless an answer legitimately introduces a number the context doesn't contain (a computed total, say) — everything else numeric must trace to the context or the case fails. And always keep at least one case with `"answerable": false`: a question your documents *cannot* answer, where the only correct behaviour is to say so. Unanswerable questions are where document-QA systems fail most dangerously, and where the example systems people demo never get tested.

## 5½. Optional: guard the layer under the answers

Grounding checks verify answers against the context they were given — but if your ingestion pipeline serves a truncated or garbled section, every answer grounded on it inherits the damage, and nothing in the answers will look wrong. If your system serves sections by stable ID, uncomment `fetchRecord` in the adapter and add two or three cases of kind `"retrieval"` (template: `_template-retrieval.json`): `requireFields` plus anchors **hand-copied from the source document, never from your system's output**. The demo shows the failure mode: `npm run demo:break` truncates a section's ingestion and the gate names it — `FIDELITY fidelity-savings: body missing "£16,000"`.

(For PubMed-shaped systems, `fetchRecord` can wrap a structured retrieval layer like [PubCrawl](https://www.npmjs.com/package/@pharmatools/pubcrawl) — the scorer's field/anchor checks were built for exactly that record shape.)

## 6. Run the check

```bash
npx groundwork check
```

The redaction self-test runs first, then the grounding eval. A passing run ends like this:

```
  ✓ grounding            PASS
      n_cases                    2
      n_answerable               1
      answer_recall              100.0%
      ungrounded_numbers         0
      abstention_rate            100.0%

Checks passed. What that does and doesn't mean: answers are grounded
against your gold set — a strong floor, not a certification. Keep a
human in the loop for high-stakes outputs.
```

A failing run names each failure — `missing answer fact "resident of the borough"`, `ungrounded number "14" — not in the provided context`, `unanswerable question — the answer did not abstain` — and exits non-zero. That's the harness doing its job: fix the system, or if the failure taught you something, turn it into a gold case and keep it.

Two readings to get right. The output lists several scorers; for document QA the row that matters is `grounding` — the others belong to eval shapes your adapter doesn't implement and skip cleanly. But if the *grounding* row itself says SKIPPED, the run is **not** a pass, whatever the exit code of the underlying tools — `groundwork check` will say so explicitly and point at what's missing.

## 7. Freeze a baseline and gate your CI

Happy with a run? Make it the floor:

```bash
npx groundwork check --baseline
git add groundwork/results/baseline.*.json .github/workflows/groundwork.yml
git commit -m "Add grounding baseline and CI gate"
```

The scaffolded GitHub Action runs `groundwork check --ci` on every pull request and fails any change that scores below the committed baseline. If your adapter calls an HTTP endpoint, set the `SYSTEM_URL` variable (and `SYSTEM_TOKEN` secret) in your repository settings; a local-module adapter needs nothing. From here, a prompt tweak that breaks abstention shows up as a red build, not a user complaint.

## 8. Check your costs

```bash
npx groundwork cost
```

Reads token usage from your eval results and recommends savings in leverage order: prompt caching for repeated document context first (typically the biggest win for document QA, since the same documents ride along with every question), batching for non-urgent work second, trimming context third — which is also *safer*, because less context gives the model less room to ground an answer in the wrong passage — and model routing only after those, re-running `groundwork check` to prove grounding held. Cheaper is only better if the grounding score doesn't move.

## 9. The habit that keeps it honest

Once a week, read a handful of real transcripts. When one surprises you, turn it into a gold case — two minutes of work that permanently pins that failure down. A gold set that grows out of real use is the difference between scaffolding and judgment. And keep the human review step for anything high-stakes: the gate proves your system's grounding is *measured*, not that its answers are *safe*.

## Troubleshooting

**"adapter is not available for online runs"** — your adapter's `onlineAvailable()` returned false. For the HTTP shape that means `SYSTEM_URL` isn't set; the hint printed alongside comes from `onlineConfigHint()` in your adapter, so make it say something useful for your team.

**Grounding row says SKIPPED** — the eval found no grounding cases. Check that your case files are in `groundwork/datasets/cases/`, are valid JSON, and have `"kind": "grounding"`.

**"Redaction is enabled but @pharmatools/redacta is not installed"** — it's a dependency of Groundwork, so this usually means an install with `--omit=dev` removed it or your package manager didn't hoist it. `npm install --save-dev @pharmatools/redacta` fixes it directly; or set `redaction.enabled` to `false` in `groundwork/groundwork.config.json` if you truly don't need the pre-step (be sure about that).

**An anchor fails on an answer that looks correct** — the answer phrased the fact differently. Add that phrasing to the anchor's `aliases` rather than loosening the anchor itself; the point of an anchor is that a correct answer can't dodge it.

**A case fails on an ungrounded number that's actually fine** — if the number is legitimately derived (a computed total, a date the user supplied), add it to that case's `allowedNewNumbers`. If you find yourself doing this often, your system may be doing arithmetic you're not checking — worth a look rather than a waiver.
