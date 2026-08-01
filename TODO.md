- [ ] Have codex audit agent adherence in this toolkit -> sync toolkit-enabled projects

- [ ] **Hook: kick off `/remember` after a PR is opened.** Second-brain v3 says the
  main agent proposes durable memory updates when a substantial task is done,
  right before the pull request is opened or merged. Today that depends on the
  agent remembering to do it, which is exactly the kind of once-per-session rule
  that gets skipped. Build a hook in `hooks-library` that fires once a PR has
  been opened and starts the memory proposal pass, so the review happens on its
  own. Decide where it hooks in (Stop, or off the PR-creation tool call), and
  keep the same fail-open and loop-cap safety the writing-guard already has.

- [ ] **Hook: make sessions read and follow the project rules at start.**
  A SessionStart hook that loads the project's `.claude/rules/` and the toolkit
  rules into the session and states them as binding, instead of hoping the agent
  reads CLAUDE.md on its own. This is the "SessionStart orientation" item
  already listed in the README roadmap, so build it there in `hooks-library` and
  tick the roadmap line when it lands.

- [ ] **Lay out every toolkit rule so Mike can prune.** Produce one readable
  table of all 18 files in
  `plugins/project-init/skills/project-init/references/general-rules/`: what each
  rule actually asks for in plain words, whether it is default ON or
  conditional, whether a hook now enforces it, and where it overlaps another
  rule. The goal is deciding which rules to retire, merge, or convert into
  hooks. Do the same for anything a rule duplicates in CLAUDE.md.
