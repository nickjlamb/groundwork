# {{PROJECT_NAME}} — deployment log

Groundwork has no telemetry, by design: nothing about your system, your documents, or your users leaves your infrastructure. That means the measurement that matters is recorded here, by you, in about a minute a week. If an organisation is supporting your deployment, this file is what you show them.

## Milestones

| Milestone | Date | Notes |
|---|---|---|
| Prototype answering real questions | | |
| Groundwork harness scaffolded | | |
| Adapter wired to the real system | | |
| First gold set from real failures (n cases) | | |
| Baseline frozen, CI gate live | | |
| **First production use with real users** | | |

The gap between the first row and the last is your **time-to-production** — the number this harness exists to shrink.

## Incidents the gate caught

Every named failure in a red `check` run is a fabrication, missing fact, or failed abstention that would otherwise have shipped. Log the ones that mattered:

| Date | What the gate caught | Would a user have been harmed or misled? |
|---|---|---|
| | | |

## Incidents in production

Anything wrong that reached a real user — and the gold case you added afterwards so it can never recur silently:

| Date | What happened | Gold case added |
|---|---|---|
| | | |

## Weekly habit check

A gold set that stops growing is a gate that stops learning. Once a week, read a handful of real transcripts; when one surprises you, add a case.

| Week of | Transcripts read | Cases added |
|---|---|---|
| | | |
