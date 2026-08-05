// Demo adapter — identical in shape to what `groundwork init extraction`
// scaffolds, but extract() calls the local demo system (../system.mjs)
// instead of an HTTP endpoint. Fully offline: no network, no API key.

export const meta = { name: "groundwork-demo-extraction" };

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
// The "system" — local, rule-based, null when the document doesn't state it
// ---------------------------------------------------------------------------
import { extractLocally } from "../system.mjs";

export async function extract({ document, schema }) {
  const safeDocument = await redactIfEnabled(String(document ?? ""));
  return extractLocally({ document: safeDocument, schema });
}
