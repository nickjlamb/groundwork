// groundwork/adapter.mjs — the ONE file you edit to connect your system.
//
// This is an OpenGATE extraction adapter: given { document, schema }, return
// { record } — your system's structured extraction of the document into the
// schema's fields. The eval never talks to your system except through this
// file, so wiring Groundwork to your stack means editing the extract()
// function below and nothing else.
//
// The house rule your system must follow: a field the document does not state
// comes back as null — unknown → null, never guessed. A fabricated value in a
// missing field (a guessed date of birth on a referral) is the extraction
// hallucination, and the gate names it per field.
//
// Before the document reaches your system, it passes through the redaction
// pre-step (deterministic, local, no network) if it's enabled in
// groundwork/groundwork.config.json — the same pattern your production path
// should use, so what you evaluate is what you ship. Note the interplay:
// redaction replaces identifiers with tokens BEFORE extraction, so fields you
// extract and gate on should be business fields (dates, amounts, reasons,
// categories), not the identifiers redaction exists to strip.

export const meta = { name: "{{PROJECT_NAME}}" };

const BASE = process.env.SYSTEM_URL;
const TOKEN = process.env.SYSTEM_TOKEN;

export const onlineAvailable = () => Boolean(BASE);
export const onlineConfigHint = () =>
  "Set SYSTEM_URL (and SYSTEM_TOKEN if your API needs auth) to run the extraction eval against your system.";

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
 * Extract a structured record from a document, following the JSON Schema.
 * Every schema field must be present in the record; a field the document
 * does not state must be null.
 * @param {{ document: string, schema: object }} input
 * @returns {Promise<{ record: object }>}
 */
export async function extract({ document, schema }) {
  // Redaction pre-step — identifiers are stripped before anything leaves
  // this machine.
  const safeDocument = await redactIfEnabled(String(document ?? ""));

  // EDIT BELOW: call your system. The default assumes a JSON endpoint at
  // POST ${SYSTEM_URL}/extract taking { document, schema } and returning
  // { record: { … } }. Reshape as needed. If your system is a model call,
  // put the schema in the prompt and insist on null for missing fields —
  // the gate will hold it to that.
  const res = await fetch(`${BASE}/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ document: safeDocument, schema }),
  });
  if (!res.ok) {
    throw new Error(`system responded ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return { record: data.record ?? data };
}
