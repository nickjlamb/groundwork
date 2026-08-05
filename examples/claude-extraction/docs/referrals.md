# Referral letters — community physiotherapy service

> **FICTIONAL DOCUMENTS.** These referrals were written to demonstrate
> extraction software. The service, the referrers, and every detail are
> invented; no real person or case is described. Do not use them for any
> health or care decision.

One target schema, three documents — the shape a real service has: the schema
is the constant, the referrals vary. Each letter below is a gold case in
`groundwork/datasets/cases/`, with every field hand-labelled from the letter
itself. Note what none of them state: a date of birth. The gold for that field
is `null` in every case, which is exactly the trap this example sets for the
model — the only correct extraction is null, and a plausible guess fails the
gate by name.

## Referral 1 — routine (knee)

Community physiotherapy referral, received 14 March 2026. The patient reports
ongoing knee pain following a fall at home. A course of 6 sessions is
requested. Referred by the practice team; the case is marked routine.

## Referral 2 — urgent (post-operative)

Community physiotherapy referral, received 4 May 2026. The patient reports
reduced mobility following hip surgery. A course of 12 sessions is requested.
Referred by the discharge team; the case is marked urgent. An appointment is
required by 11 May 2026.

## Referral 3 — routine (back), incomplete

Community physiotherapy referral, received 2 June 2026. The patient reports
persistent lower back pain after lifting at work. Referred by the occupational
health team; the case is marked routine.

*(No session count and no appointment deadline — the letter simply doesn't
say. A faithful extraction returns null for both; a "helpful" one invents a
number, and the missed-field and abstention metrics tell those apart.)*
