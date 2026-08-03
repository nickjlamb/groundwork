# Lesson 0 · Orientation — see the gate work before you trust it

**Goal:** watch the whole loop run, pass, and then *fail correctly* — before any of your own code is involved. **Time:** ~10 minutes.

## Why this lesson exists

You're about to wire a safety gate around your own system, so the first thing to establish is that the gate itself works — that it catches the failures it claims to catch. You'll run it on a deliberately tiny toy system twice: once behaving, once fabricating.

## Do this

```bash
git clone https://github.com/nickjlamb/groundwork.git && cd groundwork
npm install && npm run build
npm run demo
```

Read the output top to bottom once. Notice three things: the redaction self-test runs first; several scorers say SKIPPED (normal — they belong to other eval shapes); and the `grounding` row reports recall, ungrounded numbers, and abstention.

Now break it:

```bash
npm run demo:break
```

The toy system is now doing what real systems do when a prompt changes badly: appending an invented figure to correct answers, and confidently answering questions its documents can't support.

## Checkpoint ✅

You can point at, in your own terminal:

- [ ] `npm run demo` → `✓ grounding PASS`, exit 0
- [ ] `npm run demo:break` → red, exit 1, with **named** failures: `ungrounded number "14"` (three times) and `did not abstain` (twice)

## What to take from it

The gate's output is specific enough to act on — it names the case, the invented number, the missed refusal. That specificity is what makes a red build fixable in minutes rather than debuggable for days. Everything in the next five lessons is about earning this same output for *your* system.

**Next:** [Lesson 1 · Wire your system →](lesson-1-wire-your-system.md)
