# Knowledge behavior trials

This harness runs bounded, fresh Codex sessions against disposable synthetic
repositories. It records observable behavior separately from static fixtures:
the prompt and predeclared expectations, copied-source hashes, raw JSONL events,
the final response, elapsed time and reported token usage, before/after files,
and Git state.

The trials use `gpt-5.6-sol`, `--ignore-user-config`, `--ephemeral`, JSON output,
and the `workspace-write` sandbox. Each fixture has only a local bare Git remote.
The runner neither changes authentication or trust settings nor publishes to the
internet. The configured per-process timeout bounds model, Git, checker, index,
and copied-hook commands. Timeout details are retained in the result evidence.

The legacy v1 fixture is a focused handoff surface. The v2 fixture installs the
complete checker-owned file surface from shipped sources: navigation, glossary,
inbox, current work, an external topic, three generated indexes, the four tools,
skills, and the portable Toolkit manual. It must pass the installed checker and
start from clean Git state before a model runs. Copied hooks are deliberately
unregistered. Preflight executes the copied startup, prompt, first Stop, review
receipt and completed Stop commands, which proves those fixture entry points run
in sequence. The model trials use root/manual fallback and do not establish host
registration, event delivery or activation parity.

Each run also installs one `external` memory-mode project from shipped
sources: `.toolkit-memory.json`, `SOUL.md`, `PROJECT.md`, both manuals in
`docs/`, and a PRD in `prds/`. It runs the copied index builder, checker and
hooks, and records the result as `externalPreflight` in `run.json`. It checks
the Git files and the startup text only. No model or memory service runs, so
it proves no memory-service call.

Run one scenario while a candidate Knowledge package and handoff package are
available in separate source trees:

```sh
node tests/knowledge-behavior/run.mjs \
  --source-root /path/to/knowledge-package \
  --handoff-source-root /path/to/handoff-package \
  --scenario handoff-capture-publication \
  --results-dir /tmp/knowledge-behavior-pilot
```

Omit `--scenario` to run every compatible scenario. Results default to a dated
folder under the operating system's temporary directory. The runner refuses to
overwrite an existing run manifest or scenario folder. Keep reviewed evidence outside the
repository unless the active work item's existing verification record calls for
a specific summary. The harness does not create another tracker.

Add `--preflight-only true` to build, index, check and seed the fixture without
starting a model. Scenarios restricted to another knowledge layout are recorded
as unsupported and not run; they make the aggregate mechanical result fail so a
mixed-layout invocation cannot look fully exercised.

`scenarios.json` declares mechanical expectations before execution. Their
aggregate is recorded as `mechanicalChecksPassed`, separate from
`modelOutcome: requires-independent-review`. Exact-string checks can produce
false negatives or miss a meaning error, so a reviewer must inspect the raw
reply, final files and Git state before assigning the behavior outcome. A clean
mechanical result proves neither general reliability nor that a hook fired.
Local-remote publication does not exercise a network remote or second machine.
Root fallback behavior may appear in raw events and must be reported as an
observation rather than attributed to a hook without direct proof.
If evidence processing fails after the model exits, the scenario and run
manifests retain the exit status, signal, raw-evidence paths and processing
error, and the aggregate result fails instead of abandoning the run record.
