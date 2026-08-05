// The demo "extraction system" — a deliberately tiny, fully local stand-in
// for whatever a real partner has built (a model call with a schema in the
// prompt, a pipeline, a notebook). It extracts with rules: find each schema
// field's value in the document, or return null when the document doesn't
// state it.
//
// No model, no network, no key — the point of the demo is the HARNESS around
// the system, not the system. Set DEMO_FABRICATE=1 to make it misbehave the
// way real extraction systems do (guessing a date of birth the document never
// states, dropping a required field) and watch the gate name both.

const FIELD_RULES = {
  // Dates: "received 14 March 2026" / "submitted 2 June 2026"
  referral_date: (doc) => doc.match(/received (\d{1,2} [A-Z][a-z]+ \d{4})/)?.[1] ?? null,
  submission_date: (doc) => doc.match(/submitted (\d{1,2} [A-Z][a-z]+ \d{4})/)?.[1] ?? null,
  // Only extracted when the document actually states it.
  date_of_birth: (doc) => doc.match(/date of birth[:\s]+(\d{1,2} [A-Z][a-z]+ \d{4})/i)?.[1] ?? null,
  reason: (doc) => doc.match(/reports ([^.]+?)(?: affecting[^.]*)?\./)?.[1] ?? null,
  affected_area: (doc) => doc.match(/affecting ([^.]+)\./)?.[1] ?? null,
  urgency: (doc) => doc.match(/marked (routine|urgent)/)?.[1] ?? null,
  organisation: (doc) => doc.match(/The ([A-Z][A-Za-z ]+?) requests/)?.[1] ?? null,
  amount_requested: (doc) => doc.match(/requests (£[\d,]+(?:\.\d{2})?)/)?.[1] ?? null,
  purpose: (doc) => doc.match(/towards ([^.]+?) for the shared garden\./)?.[1] ?? null,
  decision_deadline: (doc) => doc.match(/decision requested by (\d{1,2} [A-Z][a-z]+ \d{4})/i)?.[1] ?? null,
};

/**
 * @param {{ document: string, schema: object }} input
 * @returns {{ record: object }}
 */
export function extractLocally({ document, schema }) {
  const fabricate = process.env.DEMO_FABRICATE === "1";
  const doc = String(document);
  const record = {};

  for (const field of Object.keys(schema?.properties ?? {})) {
    const rule = FIELD_RULES[field];
    record[field] = rule ? rule(doc) : null;
  }

  if (fabricate) {
    // Real failure modes, both silent in production:
    //  1. a plausible GUESSED value in a field the document never states —
    //     the extraction hallucination;
    //  2. a required field quietly dropped.
    if ("date_of_birth" in record && record.date_of_birth === null) {
      record.date_of_birth = "12 April 1988";
    }
    if ("referral_date" in record) {
      record.referral_date = null;
    }
  }

  return { record };
}
