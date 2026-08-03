// Demo adapter — identical in shape to what `groundwork init` scaffolds, but
// answer() calls the local demo system (../system.mjs) instead of an HTTP
// endpoint. Fully offline: no network, no API key.

export const meta = { name: "groundwork-demo" };

export const onlineAvailable = () => true;
export const onlineConfigHint = () => "the demo system is local — always available.";

// ---------------------------------------------------------------------------
// Redaction pre-step (same pattern as the scaffolded adapter)
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

let _redactor = null;
async function redactIfEnabled(text) {
  const config = JSON.parse(
    readFileSync(join(HERE, "groundwork.config.json"), "utf8")
  );
  if (!config.redaction?.enabled) return text;
  if (_redactor === null) {
    const { Redactor } = await import("@pharmatools/redacta");
    const redactionConfig = JSON.parse(
      readFileSync(join(HERE, "redaction.config.json"), "utf8")
    );
    _redactor = new Redactor(redactionConfig.categories);
  }
  return _redactor.redactText(String(text)).text;
}

// ---------------------------------------------------------------------------
// The "system" — local, extractive, abstains when unsure
// ---------------------------------------------------------------------------
import { answerLocally } from "../system.mjs";

export async function answer({ question, context }) {
  const ctx = Array.isArray(context) ? context.join("\n") : String(context ?? "");
  const safeQuestion = await redactIfEnabled(question);
  const safeContext = await redactIfEnabled(ctx);
  return answerLocally({ question: safeQuestion, context: safeContext });
}
