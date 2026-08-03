# Lesson 1 · Wire your system — one file, one function

**Goal:** your prototype answers questions through Groundwork's adapter boundary. **Time:** ~15 minutes.

## Do this

In **your project's** repo:

```bash
npm install -D @pharmatools/groundwork
npx groundwork init
```

`init` writes the harness and never overwrites existing files. Open **`groundwork/adapter.mjs`** — the only code file you edit in this entire course. Its contract: `answer({ question, context })` returns `{ text }`.

Pick your shape:

- **HTTP endpoint** — the scaffolded default is nearly done: set `SYSTEM_URL` (and `SYSTEM_TOKEN` if needed), reshape the `fetch` body to match your API.
- **Local module** — replace the fetch block with an import of your pipeline, and make `onlineAvailable` return `true`:

```js
export const onlineAvailable = () => true;
// inside answer(), after the redaction pre-step:
const { answerFromDocs } = await import("../qa-pipeline.mjs");
return answerFromDocs(safeQuestion, safeContext);
```

Leave the redaction block at the top of the file alone — that's Lesson 2.

## Checkpoint ✅

This one-liner returns a real answer from *your* system:

```bash
node -e "import('./groundwork/adapter.mjs').then(async m => console.log(await m.answer({question:'<a question your docs can answer>', context:'<a real passage from your docs>'})))"
```

- [ ] It prints `{ text: '…' }` with an answer that looks like your system produced it.

## What could go wrong

`onlineAvailable() === false` later makes the eval skip with your `onlineConfigHint()` message — so take thirty seconds now to make that hint say something your teammates will understand, like `"Set SYSTEM_URL — ask Priya for the staging URL"`.

**Next:** [Lesson 2 · The privacy pre-step →](lesson-2-privacy-pre-step.md)
