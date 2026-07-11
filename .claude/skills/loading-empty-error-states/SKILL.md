---
name: loading-empty-error-states
description: Design the states every data UI forgets. Use this skill for ANY component that lists, loads, or computes data asynchronously — a list, a table, a dashboard card, a fetch, a worker/background computation, a file import, anything async in the UI. Apply it when building the component AND when reviewing a diff that adds one.
---

# Loading / Empty / Error States

AI-built UIs handle the happy path and crash on the others. Design all of these:

- **Loading** — skeletons that match the final layout (not a centered spinner that shifts everything). Long operations need cancel.
- **Empty** — a real first-run state: what it is, and the one action to fill it. Not a blank box.
- **Error** — what failed, in human terms, plus a retry. Never a raw stack trace or silent nothing. Two siblings that are NOT errors and must not look like errors:
  - **Cancelled** — the user aborted; acknowledge calmly, no red alarm.
  - **Timeout** — say it was time, offer retry; don't blame the data.
- **Partial** — slow/streaming/chunked results, optimistic updates that can roll back.

"Async" includes more than network fetches: web-worker computations, file imports/parsing, and heavy background processing all have the same four states.

For each async operation in the diff, confirm all states exist. In bilingual/RTL projects, check empty and error layouts in both languages — longer translations break them first. The empty and error states are where products feel broken.
