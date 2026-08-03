// Redaction self-test — before any eval touches the partner's system, prove
// the redaction pre-step is actually working on this machine: known
// identifiers go in, labelled tokens come out, and a second pass finds no
// residue. Deterministic, local, no network.

import { readFileSync } from "node:fs";
import { resolveFromRepo, type GroundworkConfig } from "./config.js";

export interface SelfTestResult {
  enabled: boolean;
  passed: boolean;
  categories: string[];
  failures: string[];
}

// Probes use synthetic identifiers with valid checksums (the NHS number
// passes Modulus-11) so the deterministic patterns must catch them.
const PROBES: Array<{ label: string; text: string; mustNotSurvive: string }> = [
  { label: "NHS number", text: "NHS Number: 943 476 5919", mustNotSurvive: "943 476 5919" },
  { label: "email", text: "Contact: jane.doe@example.org", mustNotSurvive: "jane.doe@example.org" },
  { label: "phone", text: "Tel: 07700 900123", mustNotSurvive: "07700 900123" },
  { label: "patient name", text: "Patient: Mrs Patricia Hartley attended today.", mustNotSurvive: "Patricia Hartley" },
];

export async function runRedactionSelfTest(
  dir: string,
  config: GroundworkConfig
): Promise<SelfTestResult> {
  if (!config.redaction?.enabled) {
    return { enabled: false, passed: true, categories: [], failures: [] };
  }

  const redacta = await import("@pharmatools/redacta");
  const { Redactor, selfCheck } = redacta;
  type Category = ConstructorParameters<typeof Redactor>[0] extends
    | (infer C)[]
    | undefined
    ? C
    : never;
  const redactionConfig = JSON.parse(
    readFileSync(resolveFromRepo(dir, config.redaction.configFile), "utf8")
  );
  const categories: Category[] = redactionConfig.categories ?? [
    "clinical",
    "general",
  ];

  const failures: string[] = [];
  for (const probe of PROBES) {
    const redactor = new Redactor(categories);
    const { text } = redactor.redactText(probe.text);
    if (text.includes(probe.mustNotSurvive)) {
      failures.push(`${probe.label} survived redaction: "${probe.text}" → "${text}"`);
      continue;
    }
    const residue = selfCheck(text);
    if (residue.length > 0) {
      failures.push(`${probe.label}: self-check found residue in "${text}"`);
    }
  }

  return { enabled: true, passed: failures.length === 0, categories, failures };
}
