# Lesson 6 · The second archetype — structured extraction

**Goal:** run the whole loop on the extraction pattern — documents → structured fields → schema validation → human review — and catch a guessed field the way Lesson 0 caught a fabricated figure. **Time:** ~20 minutes.

Everything you built in Lessons 1–5 was one deployment pattern: document QA. Groundwork's units are patterns, and the second one ships the same way — one adapter file, hand-labelled gold, the same gate. If your team processes referrals, applications, or forms into structured records, this is your archetype.

## See it work, then see it caught

```bash
npm run demo:extraction         # documents → fields, every check green
npm run demo:extraction:break   # the same system, guessing — red, by name
```

The break run names two failures worth reading slowly:

```
✗ EXTRACTION demo-referral: SCHEMA: /referral_date must be string
✗ EXTRACTION demo-referral: FABRICATED field "date_of_birth": document does not state it (got "12 April 1988")
```

The second one is the extraction hallucination: the document never states a date of birth, and the system produced a plausible one anyway. Notice what makes it dangerous — the record looks *more* complete, nothing downstream will flag it, and a guessed date of birth on a referral is the extraction twin of a fabricated dose.

## The idea that does the safety work

Two contracts replace the anchors and abstention markers you know from document QA:

- **Gold `null` means the document does not state it.** You label every field by hand from the document — never from your system's output — and `null` is a real label, not a gap. A value extracted into a null-gold field fails, named per field.
- **Nullability is the abstention contract.** In each case's JSON Schema, a field the system must always find is non-nullable (`"type": "string"`); a field the document may not state is nullable (`"type": ["string", "null"]`). That's why the dropped `referral_date` above fails *schema validation* with no extra configuration.

Values compare exactly after per-field normalisation — `"14 March 2026"`, `"14/03/2026"` and `"2026-03-14"` are one value with `"normalize": { "referral_date": "date" }`; money compares in minor units — so there is no paraphrase problem and nothing for a judge model to judge. Wording the document itself varies goes in `aliases`, not in weakened gold.

## Exercise — scaffold it for real

In a scratch directory (or your real repo, if extraction is your pattern):

```bash
npx groundwork init extraction
```

Open the scaffolded `GROUNDWORK.md` and `groundwork/datasets/cases/example-referral.json`, then write **one case from a real document your team handles**: paste the document, write the schema (decide field by field what's required and what's nullable — that decision is the judgment), and label the gold by hand. Make sure at least one field is genuinely unstated so its gold is `null`.

## Checkpoint ✅

- [ ] `demo:extraction` green and `demo:extraction:break` red on your machine, with both failures named
- [ ] You can say out loud why the dropped field failed *schema validity* rather than accuracy
- [ ] One extraction case written from a real document, with at least one null-gold field
- [ ] You know which archetype your own system is — and if it's both, that each gets its own harness

## What you've actually built

The same floor as Lessons 0–5, under a different pattern: extraction accuracy measured against your own labelled documents, fabrication named per field, and a gate that stops a prompt tweak from quietly turning "unknown" into a guess. The human part is unchanged — extracted records feed decisions, so a person reviews the high-stakes ones before they take effect.

**Next:** [the completion checklist →](completion.md)
