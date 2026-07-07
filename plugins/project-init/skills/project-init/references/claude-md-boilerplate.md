# CLAUDE.md standard boilerplate rules

Offer these in Gate 5 as rules to fold into the project's CLAUDE.md. They're the
things the owner wants in **every** project. Present them one by one (or as a short
menu); let the user accept, edit, or drop each. Adapt the wording to the project's
voice: these are the intent, not fixed prose.

> As this list stabilizes it should move into a dedicated CLAUDE.md-boilerplate
> library in `claude-toolkit` so it's reused verbatim, not retyped.

---

## 1. Keep CLAUDE.md alive (the self-updating rule)

> **Keep this file current.** If, during a session, we identify something that
> future sessions would need to know (a new convention, a corrected assumption, a
> decision, a gotcha, a changed workflow), update CLAUDE.md to capture it **before
> the task ends**. Don't let hard-won context evaporate when the session closes. If
> unsure whether something belongs here, ask; a slightly-too-full CLAUDE.md beats a
> stale one.

This is the rule the owner always wants. Default it ON.

## 2. Wrap-up ritual

> **At the end of a chunk of work:** update the live status/handoff doc (if the
> project has one), write any changed decisions back into the design/decision docs,
> then commit and push. Leave the next session a clean handoff.

## 3. Ask before exceeding scope

> **Stay in scope.** Don't expand beyond what was asked without checking first.
> Surface the option, recommend, and let the owner decide; don't silently
> gold-plate.

## 4. Secrets never touch git

> **Secrets are never committed.** API keys and credentials live outside the repo
> (environment/keychain/secret store). Respect `.gitignore`. If a secret would need
> to be committed for something to work, stop and raise it.

## 5. Be honest about verification

> **Don't claim more than you verified.** If code wasn't run/compiled/tested, say
> so plainly and leave exact steps to verify. "Builds green" is a claim; only make
> it when it's true. Report failures with their output.

## 6. Memory system ground rules (only if Gate 3 set it up)

> **Long-term memory is single-owner.** All writes to the memory store go through
> the curator; don't hand-edit it. To remember something, delegate to the curator.
> Curated context is injected at session start; treat it as continuity.

## 7. Knowledge layer ground rules (only if Gate 4 set it up)

> **Knowledge nodes pin their sources.** A node declares the files it covers; when
> those files drift, the node is flagged stale. Keep nodes reconciled with the code
> they describe.

## 8. Multi-agent protocol: work in your own silo (default ON)

The owner routinely runs **several Claude Code sessions on the same repo at
once** (multiple VS Code terminals, plus desktop-app sessions). Every project's
CLAUDE.md gets this protocol so each session assumes it is **not alone**:

> **Assume parallel agents.** Other Claude sessions may be working in this repo
> right now. Work in your own silo:
>
> - **Before your first file change**, create and enter **your own git worktree
>   on your own new branch**. Use the native worktree tool (`EnterWorktree`),
>   or `git worktree add .claude/worktrees/<name> -b claude/<name>` as a
>   fallback. Desktop-app sessions that already start inside an isolated
>   worktree stay there; don't create another.
> - **One session = one worktree = one branch.** Never check out, commit to,
>   push to, or delete a branch another session is using.
> - **Never** edit files, switch branches, `git reset`, or `git rebase` in the
>   repo's **shared primary checkout**; that pulls files out from under other
>   sessions. Reading files there is fine, and so is `git fetch`/`git pull`
>   while it sits on the default branch. The primary checkout stays on the
>   default branch, clean, always.
> - Land finished work on the default branch **via pull request**. The owner
>   merges unless he explicitly says otherwise. After the merge, remove your
>   worktree and delete the branch.
> - If the primary checkout is dirty or on an unexpected branch, do **not**
>   "fix" it; another session may be mid-task. Tell the owner instead.
> - Keep shared status/handoff docs' edits small and additive so parallel PRs
>   merge cleanly.
> - If sessions share a device/simulator/server for testing, don't fight over
>   it; spin up your own instance.

Also wire this into **Gate 2 (session-start hook)** when the project takes one:
the orientation hook should remind each new session to enter its own worktree
before changing anything.

## 9. Language rules (default ON)

How Claude writes, everywhere in the project: chat replies, docs, comments,
commit messages, README text.

> **Write plainly.**
>
> - **No em dashes.** Use a comma, colon, parentheses, or a new sentence
>   instead.
> - **No section signs.** Write "section 7", never "§7".
> - **No AI filler language.** Skip empty phrases like "it's worth noting",
>   "great question", "certainly!", "delve", "leverage", hedging boilerplate,
>   and praise that carries no information. Just say the thing.
> - **Calibrate to the owner.** He is a little technical, not deeply technical.
>   Explain in plain language, define jargon the first time it appears, and
>   don't assume expert knowledge of any stack. Don't oversimplify either;
>   include the steps an expert would consider too obvious to mention.

Default: ON for every project. These rules also apply to the toolkit's own
files; clean up violations in any file you're already editing.

---

## Notes for the assembling agent

- Rules 1-5, 8, and 9 are near-universal: offer them for essentially every
  project, and default rule 8 (multi-agent protocol) and rule 9 (language
  rules) **ON**. Only drop rule 8 if the owner explicitly says the project is
  single-session.
- Rules 6-7 are conditional: only include them if the matching gate ran (memory
  or knowledge layer).
- Keep the final CLAUDE.md tight and skimmable. Boilerplate should read as a short
  "hard rules" section, not a wall of prose.
