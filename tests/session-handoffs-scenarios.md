# Session handoff behavior scenarios

These are behavior checks for the [handoff skill](../plugins/session-skills/skills/handoff/SKILL.md),
not assertions that a prompt contains certain words. Run against disposable
projects with the actual installed manual, save/find skills, setup procedure,
and this handoff skill. Keep original and resulting files, host/model version,
conversation/tool output, and Git evidence. Do not run against real project
working memory or a real remote. A drafted scenario is not a passing result.

## Fixture

Use a local bare Git repository as the disposable remote and two clones called
writer and reader. Install the final Knowledge package in writer with no
lasting-memory candidates or inbox proposals. Use the normal documentation
save route with this local remote. Keep the real handoff verifier if available;
if unavailable, record that fact rather than claim an independent check.

Seed current work with a project goal, an active **Export timing** item, and a
**Review accessibility** general to-do. Record their exact bytes. Give Export
a small owning work record at `docs/export.md`, with a Notes heading: current
position is profiling complete, next action is compare the two measured slow
queries, implementation approval is absent. Give a different item **Theme** a
record at `docs/theme.md`, with Notes saying the next action is choose contrast
values, also without implementation approval. Neither record claims another
session is currently running. These are fixture records, not production facts.

Use source task identifiers `fixture-export` and `fixture-theme` supplied in the
test conversation; do not invent real task URLs. Seed one undated handoff called
**Legacy exploration** containing `retain-legacy-context`. It must survive.

For repeatable ordering, supply the following UTC capture times as fixture
clock values, without changing the host clock. Seed pre-existing timed entries
where a host cannot accept a test clock. Report whether order was exercised by
capture or only by reading seeded entries.

## Capture and preserve

In writer, request three handoffs in sequence. Each request supplies its topic,
source task identifier, actual owning record, and capture time:

1. Export timing at `2026-09-20T01:00:00.000Z`.
2. Theme at `2026-09-20T02:00:00.000Z`.
3. Export follow-up at `2026-09-20T02:00:00.000Z`, carrying the additional
   temporary context `compare-queries-before-editing`.

Use the owner's natural wording, **write me a handoff**, rather than telling
the agent how to edit the section. No lasting facts are being proposed.

Inspect actual resulting Markdown, not only the final chat answer:

- Exactly one Session handoffs section contains all four entries, ordered
  Export follow-up, Theme, Export timing, Legacy exploration.
- Dated entries carry their supplied timestamps. No date was invented for
  Legacy exploration. Editing the Export timing entry preserves its creation
  time and does not reorder the two newer equal-time entries.
- Export goal/current-work text and the accessibility to-do retain their
  original meaning; unrelated sections are not replaced by the handoff.
- Source identifiers and real owning links survive. Each entry has enough
  information to identify the goal, stopped point, first action and lack of
  implementation approval. No inaccessible session link is the sole context.
- Whole current work is below the installed cap, and no lasting-memory file,
  new tracker, separate handoff store, or per-handoff file is created.

## Resume the right work

Start a fresh session in reader after verified publication and fetch. First ask
**Continue the Export timing handoff**. It must open `docs/export.md` and resume
query comparison, even though Theme was captured later. Change that owning
record's next step to **inspect the saved query measurements first**, publish
it, and repeat. The fresh session must use current owning-record state rather
than act on the stale entry, and must not treat the handoff as implementation
approval. Separately request **Continue the latest handoff** with the equal-time
entries: the agent must resolve which is intended if that choice is ambiguous.

## Overflow without loss

Seed the current-work file close enough to its cap that the next complete
handoff cannot fit. Request a handoff whose essential context includes
`do-not-drop-this-constraint` and a supplied open question. Keep a byte-for-byte
copy of the original current work.

The agent must show a concrete arrangement naming the existing owning record
and the exact shorter continuation and links proposed for current work. It must
not silently cut the constraint/question, erase older handoffs or to-dos, or
claim successful capture when placement is unresolved. Repeat without an owning
record: the full prompt remains available, the placement gap is explicit, and
no tracker or handoff file is created merely to make it fit. Retention and
placement decisions remain visible; no age-based deletion is invented.

## Legacy and partial installation

Repeat a small capture on a complete legacy project. The only modified current
file is `knowledge/current.md`, at most 2,000 characters. With schema 2 active,
only `knowledge/memory/current.md` is used and remains strictly below 5,000.
For migration, include existing handoffs and other active work, run the actual
setup flow, and compare their meaning, links and order after conversion.

In a conflicting/partial layout, the agent reports the ambiguity and supplies
the prompt without guessing a write destination. With Knowledge disabled or
absent, it does not initialize Knowledge. `/handoff check` alone saves no entry.

## Publication and failure

For a successful save, record the commit containing the entry, verify it is
included in the fixture remote branch, fetch in reader, and inspect the entry
there. This proves sharing through Git between checkouts, not live access from
a second physical computer or to a local Codex task link.

Then reject pushes using the disposable bare remote's pre-receive hook and
request another handoff. Local content and commit must remain available; the
answer and continuation must name the failed sharing step and exact retry.
Reader must not be claimed to have the unpushed entry. Remove the rejecting
fixture hook and retry through the normal route; verify the existing change
reaches reader without a duplicate entry. Do not change real authentication.

## Evidence

Record each executed case and actual result in the owning work item's existing
verification record, including any host or verifier limitation. Static package
checks establish instruction links and installed copies; they do not establish
these behavior outcomes. Record skipped cases explicitly.
