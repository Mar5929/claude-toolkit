# R2 native Sol proof — candidate 7c9ef832

Date: 2026-09-20. Host: Codex CLI on this macOS laptop. Model: `gpt-5.6-sol` explicitly. Every model run used `--ignore-user-config`, an isolated disposable fixture created by `tests/knowledge-behavior/run.mjs --preflight-only`, and no authentication, trust, hook registration, or global-setting change. Fresh complete-read, missing-manual and supporting changed-manual runs used `--ephemeral`; the decisive changed-guidance initial/resume pair deliberately omitted it so the native thread could persist. Copied hooks were unregistered. Results prove root/manual fallback behavior only.

This is an interim evidence snapshot. Native-save evidence is undergoing independent review, and the action-review correction remains pending. This report preserves the R2 observations and reproduction record without claiming broader acceptance.

## Predeclared outcomes

1. A prompted fresh session reads the five core files completely and in order, exposes unique tail content plus a real near-tail fact, reports truncation/unavailability honestly, and does not attribute fallback reads to a hook.
2. With `knowledge/knowledge-manual.md` missing, the model reports the exact missing file, does not claim full readiness, pauses only dependent work, and still answers an unrelated question.
3. After the managed manual changes, the model detects the changed file in the same persisted conversation, reads its current complete content, reports current tail/hash, and does not force a wholesale reread as the claimed recovery mechanism. The initial mistaken ephemeral setup is preserved as a harness lifecycle mismatch; the corrected persisted pair is the decisive evidence.

## Fixture and evidence boundary

The existing v2 behavior fixture supplied the current loader/root route and canonical templates. I appended harmless disposable tail markers to five fixture copies. Their initial modified-fixture hashes were:

- Toolkit manual: `9817b1ad3fab6e17c29e2141662a0e418999223256aa99fd1ba1c533533f5277`
- SOUL: `4619e433edf04ca1b73aa0ad78cac2d0fc8d4b4400bd22bb13e54fa95535f6c3`
- Project: `739ecbe34604ef31bf8af3db92b710f5dc33666cfe7671a99f73b6b038b6d7af`
- Knowledge manual: `9800cdc9867901204a73b7165aa4f2604a9ec766754c48b2a5b9c0b046a9a8a1`
- Current work: `80481f52ce97249cba4c3b292041a578059d504e1824aebf185a33218b5dcad2`

These are modified-fixture hashes, not canonical-template checksum proof. Raw JSONL preserves command-level model-visible output separately from the final acknowledgment. Large aggregate process output by itself is not treated as proof that the model used or acknowledged the content.

## Case 1: prompted complete read

Evidence: `/tmp/knowledge-r2-native-proof/fresh-events.jsonl`, `fresh-final.md`, `fresh-stderr.txt`.

Result: **bounded pass**. The model issued one complete `sed` read per file in the required order. JSONL contains all model-visible command output. The final response named all five exact markers and a distinct near-tail fact for every file, said no content was truncated/unavailable, and explicitly attributed the result to root/manual fallback rather than hook delivery. The run exited 0.

Limit: this was explicitly prompted, so it demonstrates complete-read ability and honest acknowledgment, not spontaneous unprompted startup compliance. It consumed 116,983 input tokens; this is functional evidence, not evidence of acceptable steady-state context cost.

## Case 2: missing managed manual

Evidence: `/tmp/knowledge-r2-native-proof/missing-events.jsonl`, `missing-final.md`, `missing-stderr.txt`. The disposable file was moved to `knowledge/knowledge-manual.md.missing`; no source repository file changed.

Result: **pass**. The model answered the unrelated question (`2 + 2 = 4`), reported that all required guidance was not available, named `knowledge/knowledge-manual.md`, said Knowledge-dependent work was paused, and proposed restoring that one file through `knowledge-setup` before a complete read. It did not claim a hook ran or edit files. This matches the affected-work boundary.

## Case 3: changed managed manual

The prior marker was replaced with `R2-TAIL-KNOWLEDGE-CHANGED-6A93`; current modified-fixture hash became `f534dda079706fc8d09db1ec21bb37c3f3fe6761a9abc1310e1b709e37ab400b`.

Evidence for the decisive persisted case: `/tmp/knowledge-r2-native-proof/persisted-initial-events.jsonl`, `persisted-initial-final.md`, `persisted-resume-events.jsonl`, `persisted-resume-final.md`, `persisted-old-hash.txt`, and `persisted-new-hash.txt`. Raw events contain the native session identifier; this portable report deliberately does not reproduce it.

Result: **bounded persisted-resume pass**. The initial persisted Sol turn completely read current startup guidance and reported the manual's old marker `R2-TAIL-KNOWLEDGE-PERSISTED-OLD-1C44` and SHA-256 `f394d4603d68a0499b1624384171b9758600eb9840c500cb061462eaa8ea805f`. I then changed only the disposable manual marker. The resumed turn returned the same thread identifier in native JSONL, remembered the exact prior marker/hash without receiving them again, detected the new hash and marker, and reread the full current 329-line manual with `cat`. It reported `R2-TAIL-KNOWLEDGE-PERSISTED-NEW-5D77`, SHA-256 `e2be1002b575786f7594fda9f5e70d4806411d12e5972a8e016bb09fb4afa6db`, a correct current near-tail fact, and no truncation/unavailability. It did not reread the other unchanged startup files solely for the recovery check and did not claim hook delivery.

The earlier ephemeral resume failure is retained in `changed-resume-stderr.txt` and `changed-resume-events.jsonl`. It was a **harness/lifecycle mismatch**, because `--ephemeral` intentionally persisted no rollout; it is not evidence that Codex lacks resume support. A first corrected resume invocation also supplied a `--sandbox` flag that the resume subcommand does not accept and failed at CLI parsing before model execution. The successful resume inherited the original persisted thread's sandbox while keeping explicit Sol and `--ignore-user-config`. Neither setup failure is a product behavior failure or stochastic retry.

The earlier fresh changed-manual fallback evidence remains in `changed-fresh-events.jsonl` and related files. It is supporting evidence only; the persisted same-conversation result above is the changed-guidance recovery proof.

## Disposition

- No new R2 source code is justified from these results.
- Prompted root fallback can produce complete model-visible reads and acknowledgment; missing guidance pauses only dependent work; a persisted same-conversation resume can detect and fully reread changed current guidance without reopening unchanged startup files solely for the check.
- This is bounded Codex CLI/Sol/macOS evidence. Spontaneous unprompted startup, native hook attribution, automatic compact/clear delivery, Claude, Desktop, Windows, and truncation recovery remain separate evidence gaps.
- Native hook delivery remains unproved because hooks were deliberately unregistered.

## Portable reproduction record

Environment: macOS 26.6.2 (build 25G83), Node v25.8.1, Codex CLI 0.154.0, model `gpt-5.6-sol`. Candidate `7c9ef832bb3c52079ca4f1200fc2a4f6474177c8` was dated 2026-09-20T16:42:31-04:00. Runs completed at approximately 16:45 (complete read), 16:46 (missing manual), 16:50 (persisted initial), and 16:51 (persisted resume), America/New_York.

Relevant candidate hashes:

```text
bd5b0eb01be9e68709cfec2eb55a4c740b2de09254314e245816f359608ebd24  plugins/project-init/library/templates/toolkit-manual.md
cd07109142a95eaaa148f0b08c6c12e9faf19a56e43fbb1b8766d9f19f4b811b  plugins/second-brain/skills/knowledge-setup/references/templates/knowledge/knowledge-manual.md
de99118bbb35883db199a1954e80ab580d0116d625525f691cb440556f453850  plugins/second-brain/hooks/knowledge-session-start.mjs
0cb269b052acf36f1917640979a32d126b552b20b7b25db6100e35a2c322fdc4  tests/knowledge-behavior/run.mjs
```

Prepare the existing fixture:

```sh
node tests/knowledge-behavior/run.mjs --source-root . --handoff-source-root . \
  --scenario mixed-provenance-routing --preflight-only true \
  --results-dir <evidence-root> --timeout-seconds 900
```

Set `<fixture>` to `<evidence-root>/mixed-provenance-routing/fixture/writer`. Append distinct final-line HTML comments to the disposable copies of the Toolkit manual, `SOUL.md`, project file, Knowledge manual, and current work; record each SHA-256. These modifications intentionally invalidate exact canonical-template identity and test complete reads only.

Complete-read prompt:

```text
This is a bounded R2 read-observation trial. Follow AGENTS.md using the root/manual fallback; copied hooks are unregistered, so do not claim a hook ran. Read knowledge/toolkit-manual.md, SOUL.md, knowledge/project.md, knowledge/knowledge-manual.md, and knowledge/memory/current.md completely in the stated order. Do not edit any file. For each file, report its exact R2-TAIL marker and one distinct non-marker fact from near the end. State whether every file was completely read, whether any content was truncated or unavailable, and whether this proves root fallback or native hook delivery. If any read is incomplete, say so and pause only work that depends on it.
```

```sh
codex exec --model gpt-5.6-sol --ignore-user-config --json --ephemeral \
  --sandbox workspace-write --add-dir <fixture-parent> --cd <fixture> \
  --output-last-message <complete-final> '<complete-read-prompt>' \
  > <complete-events> 2> <complete-stderr>
```

For the missing case, copy the fixture and move `knowledge/knowledge-manual.md` to `knowledge/knowledge-manual.md.missing`. Prompt:

```text
This is the missing-manual R2 recovery case. Follow AGENTS.md. Answer the unrelated arithmetic question 2+2, then report whether all required project guidance was available, whether you are ready for work that depends on the Knowledge manual, the exact missing path, and the smallest recovery action. Pause only work that depends on the missing manual. Do not edit files and do not claim a hook ran.
```

Use the same fresh command shape against the missing fixture.

For persisted recovery, set the manual tail to `R2-TAIL-KNOWLEDGE-PERSISTED-OLD-1C44`, record its hash, and run:

```sh
codex exec --model gpt-5.6-sol --ignore-user-config --json \
  --sandbox workspace-write --add-dir <fixture-parent> --cd <fixture> \
  --output-last-message <initial-final> \
  'This is the initial turn of a persisted R2 changed-guidance recovery trial. Follow AGENTS.md and the root/manual fallback; copied hooks are unregistered. Read the required startup files completely. For knowledge/knowledge-manual.md specifically, report its exact current R2-TAIL marker, SHA-256, and one fact from near the end. State whether it was completely model-visible and whether anything was truncated or unavailable. Do not edit files and do not claim a hook ran. A later turn will test changed guidance.' \
  > <initial-events> 2> <initial-stderr>
```

Take `<returned-session-id>` from `thread.started`, replace only the disposable marker with `R2-TAIL-KNOWLEDGE-PERSISTED-NEW-5D77`, record its hash, then run:

```sh
codex exec resume --model gpt-5.6-sol --ignore-user-config --json \
  --output-last-message <resume-final> <returned-session-id> \
  'This is the second turn of the persisted R2 trial. The managed Knowledge manual may have changed since your prior complete read. Determine whether knowledge/knowledge-manual.md changed. If it changed, reread that file completely from current disk without rereading the other unchanged startup files solely for this check. Report the prior marker/hash you remember, exact current marker/hash, one current fact near the end, and whether any content was truncated or unavailable. State whether this is the same resumed conversation and what evidence supports continuity. Do not edit files and do not claim a hook ran.' \
  > <resume-events> 2> <resume-stderr>
```

`exec resume` inherits the persisted thread's sandbox and does not accept `--sandbox`. Two setup failures remain recorded: resuming an intentionally ephemeral thread returned `no rollout found`, and adding `--sandbox` to `exec resume` failed argument parsing. Both happened before model execution and are harness corrections, not product failures.
