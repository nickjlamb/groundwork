# Building your gold set

Your gold set is the judgment at the heart of this harness. It is yours — built from documents your system really processes and failures you really saw, not from synthetic examples that flatter the system. Ten honestly-labelled documents beat a hundred invented ones.

## Where cases come from

Every time your system extracts a wrong value, invents a value the document never stated, or silently drops a field, that is a gold case waiting to be written. Capture the document exactly as your system receives it, and label every field by hand — from the document, never from your system's output. Copying the system's output pins its current bugs as ground truth.

Start with five to ten documents. Add one every time something surprises you.

## Anatomy of a case

Copy `cases/_template-extraction.json`. Each case is one JSON file:

- **`document`** — the source text, verbatim. If redaction is enabled (it is by default), remember the eval redacts the document *before* extraction — so gate on business fields (dates, amounts, reasons, categories), not the identifiers redaction exists to strip.
- **`schema`** — the JSON Schema your system fills. **Nullability is the abstention contract**: a field the system must always find is non-nullable (`"type": "string"`); a field the document may legitimately not state is nullable (`"type": ["string", "null"]`). A null in a non-nullable required field fails the schema gate — that is how a dropped required field turns the build red with no extra configuration.
- **`gold`** — the hand-labelled record. **`null` means the document does not state it.** This is the line that matters most: a non-null extraction in a null-gold field is a fabrication — a guessed date of birth on a referral is the extraction twin of a fabricated dose — and the gate names it per field.
- **`normalize`** — per-field: `"date"` (any common form → ISO `YYYY-MM-DD`; slashed dates read day-first), `"money"` (symbols and separators stripped, compared in minor units), `"number"`, `"text"` (whitespace/case folded — also the default for strings).
- **`aliases`** — acceptable alternative gold values per field, for wording the document itself varies ("routine" / "non-urgent"). If a field keeps failing on phrasing alone, add the phrasing here rather than weakening the gold.

## What the check actually verifies

All deterministic — no LLM judge, so results are reproducible and free to run on every commit:

1. **Schema validity** (gate) — the record validates against your schema, nullability included.
2. **Field accuracy** (gate) — every extracted value equals its gold value after normalisation. Wrong values are named: `WRONG field "amount_requested": got …, expected …`.
3. **No fabricated fields** (gate) — a value in a field whose gold is `null` fails, named: `FABRICATED field "date_of_birth": document does not state it`.
4. **Missed fields and abstentions** (metrics) — null-where-gold-has-a-value counts as a missed field; null-where-gold-is-null counts as a correct abstention. Reported as precision/recall, and gated against your baseline so they can't quietly regress.

## Keep at least one null-gold field per case

Fabrication under missing information is the most dangerous failure an extraction system has — a plausible guessed value flows silently into whatever decision the record feeds. Make sure your gold set includes fields the documents genuinely don't state, so the gate is exercising abstention every run.

## What it cannot verify

A deterministic check cannot tell you a record is *fit for the decision it feeds* — that the reason field captures what matters, or that the referral should be acted on at all. It tells you the extraction is faithful to the document. That is the floor, and it is worth gating on, but it is not the ceiling: keep a human reviewing extracted records that affect someone's health, money, legal standing, or safety.
