# Lesson 2 · The privacy pre-step — see it work, learn where it stops

**Goal:** verify identifiers are stripped before anything leaves the machine — and know precisely what this pass does *not* catch. **Time:** ~10 minutes.

## What's already true

Your adapter (Lesson 1) already routes every question and context through Redacta before your system sees them. It's deterministic and local: NHS numbers, phone numbers, dates of birth and similar become labelled tokens like `[PHONE_1]`. Configuration lives in `groundwork/redaction.config.json` — add `"safeharbor"` to the categories for the stricter US HIPAA pass.

## Exercise — watch it happen

Feed a **synthetic** identifier (never a real one) through your adapter:

```bash
node -e "import('./groundwork/adapter.mjs').then(async m => console.log(await m.answer({question:'What did the caller on 07700 900123 ask about?', context:'A caller rang about repeat prescriptions.'})))"
```

Your system should receive — and its answer reflect — a labelled token, not the number. (07700 900123 is a reserved fictional UK number, safe for tests.)

## Checkpoint ✅

- [ ] The synthetic phone number does not appear in what your system was sent (add a temporary `console.log(safeQuestion)` in the adapter if you want to see it directly — then remove it).
- [ ] `npx groundwork check` starts with `✓ redaction self-test passed`.

## The honest boundary — read this part twice

The pass is **keyword-anchored and deterministic**. It will catch structured identifiers reliably; it will **not** catch a name in free prose ("as I told Mrs Okafor yesterday…"). That's a documented boundary, not a bug — and it's why the pre-step *reduces* what needs human attention rather than replacing it. If your documents contain free-text personal detail, your review process (Lesson 6's checklist) has to own that.

**Next:** [Lesson 3 · Gold cases from real failures →](lesson-3-gold-cases.md)
