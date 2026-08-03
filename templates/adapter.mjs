// groundwork/adapter.mjs — the ONE file you edit to connect your system.
//
// This is an OpenGATE grounding adapter: given { question, context }, return
// { text } — your system's answer. The eval never talks to your system except
// through this file, so wiring Groundwork to your stack means editing the
// answer() function below and nothing else.
//
// Before the question and context reach your system, they pass through the
// redaction pre-step (deterministic, local, no network) if it's enabled in
// groundwork/groundwork.config.json — the same pattern your production path
// should use, so what you evaluate is what you ship.

export const meta = { name: "{{PROJECT_NAME}}" };

const BASE = process.env.SYSTEM_URL;
const TOKEN = process.env.SYSTEM_TOKEN;

export const onlineAvailable = () => Boolean(BASE);
export const onlineConfigHint = () =>
  "Set SYSTEM_URL (and SYSTEM_TOKEN if your API needs auth) to run the grounding eval against your system.";

// ---------------------------------------------------------------------------
// Redaction pre-step (leave as is; configured in groundwork.config.json)
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
    let mod;
    try {
      mod = await import("@pharmatools/redacta");
    } catch {
      throw new Error(
        "Redaction is enabled but @pharmatools/redacta is not installed. " +
          "Run: npm install --save-dev @pharmatools/redacta " +
          "(or set redaction.enabled to false in groundwork/groundwork.config.json)."
      );
    }
    const redactionConfig = JSON.parse(
      readFileSync(join(HERE, "redaction.config.json"), "utf8")
    );
    _redactor = new mod.Redactor(redactionConfig.categories);
  }
  return _redactor.redactText(String(text)).text;
}

// ---------------------------------------------------------------------------
// Your system (edit this)
// ---------------------------------------------------------------------------

/**
 * Answer a question from the provided context.
 * @param {{ question: string, context: string | string[] }} input
 * @returns {Promise<{ text: string }>}
 */
export async function answer({ question, context }) {
  const ctx = Array.isArray(context) ? context.join("\n") : String(context ?? "");

  // Redaction pre-step — identifiers are stripped before anything leaves
  // this machine.
  const safeQuestion = await redactIfEnabled(question);
  const safeContext = await redactIfEnabled(ctx);

  // EDIT BELOW: call your system. The default assumes a JSON endpoint at
  // POST ${SYSTEM_URL}/answer taking { question, context } and returning
  // { text: "..." } (or { answer: "..." }). Reshape as needed.
  const res = await fetch(`${BASE}/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ question: safeQuestion, context: safeContext }),
  });
  if (!res.ok) {
    throw new Error(`system responded ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return { text: data.text ?? data.answer ?? "" };
}
