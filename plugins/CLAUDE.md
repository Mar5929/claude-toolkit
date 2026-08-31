# plugins: the seven plugins this repo ships

Each folder here is one Claude Code plugin. Each has its own `README.md`, which
is that plugin's canonical description. `docs/toolkit-map.md` is the
cross-cutting catalog across all seven.

A plugin holds a group of skills, not one skill each. `session-skills` is the
worked example: five single-skill plugins became one, because packaging each of
them cost more than writing it and splitting them bought nothing at runtime.
Claude Code loads every skill's name and one-line description at session start
whatever plugin it sits in, so plugin count changes nothing in front of the
agent. Before adding a plugin, ask whether the skill belongs in one that
exists.

One folder is not a plugin's own material: `project-init/library/` holds the
reusable files other projects receive (`rules/general/`, `rules/salesforce/`,
`tools/`, `templates/`, `guides/`). It sits inside the
`project-init` plugin because a plugin ships only the files inside its own
folder, so a `library/` at the repository root would vanish on install.
`project-sync` reads the same folder.

`project-init/machine/` is the same idea for a whole computer: the
machine-wide rules and the settings values every machine must carry, installed
into `~/.claude/` by the `machine-sync` skill. Its `README.md` holds the
two-question test for what belongs there instead of in `library/`, and the
folder stays small on purpose.

## Working in here

- **One canonical home.** Each item lives in exactly one place; other files
  reference it. When you change something, update every document that mentions
  it: the plugin's `SKILL.md`, `references/setup-flow.md`, and the `README.md`
  files. When you add, rename, or remove a plugin or skill, update that plugin's
  `README.md`, `docs/toolkit-map.md`, and the top-level `README.md` in the same
  change, so a future session can still answer "what is each thing, and is
  anything redundant?" from the repo itself.
- **Opt-in by default.** Nothing is forced on a project unless Mike says every
  project should get it. Then mark it default ON in
  `project-init/library/rules/general/README.md`, not conditional.
- **Give every agent you add the writing rules in its own text.** An output
  style is delivered in the main conversation's system prompt and never reaches
  a helper agent, so an agent definition under `*/agents/` has to carry those
  rules itself. Its findings are read back to Mike, so a word he has to decode
  once would spread instead of being forgotten.
- **Check a new skill's name against Claude Code's own commands before using
  it.** A skill named `x` creates `/x`, and Claude Code's built-in commands are
  the same namespace. Searching this repo and the installed plugin cache does
  not cover them. Read the list at `https://code.claude.com/docs/en/commands`.
  Names that look natural for a toolkit skill and are already taken include
  `/tasks`, `/init`, `/review`, `/debug`, `/recap`, `/goal`, `/plan`, `/focus`,
  `/diff`, `/context`, `/memory`, `/branch`, and `/fork`.
- **Bump versions.** A content change to a plugin bumps `version` in its
  `.claude-plugin/plugin.json`, `version` in its `.codex-plugin/plugin.json`,
  and `metadata.version` in the repository's `.claude-plugin/marketplace.json`.
- **Keep `main` installable.** `claude plugin validate .` must pass, because
  `main` is what every machine installs from. Run the three checks in `tests/`
  as well.
- Older files may still contain em dashes and section signs. Clean them up in
  any file you are already editing.

## Where a new piece goes

Most sessions here start with Mike saying some version of "I want every project
to also do X". Classify X first, then place it.

| X is... | It goes... |
| --- | --- |
| A rule for how agents behave, write, or work in every project | A new file in `project-init/library/rules/general/`, plus a row in that folder's `README.md` (default ON or conditional) |
| A rule that must hold in every repository on the machine, including ones nobody set up with the toolkit | A new file in `project-init/machine/rules/`, plus a row in that folder's `README.md` and an entry in the `machine-sync` skill. Only when a project rule genuinely cannot cover it |
| A setup step for new projects | The right gate in `project-init/skills/project-init/SKILL.md` and `references/setup-flow.md`, or a proposed new gate |
| A guard hook or automation | The `hooks-library` plugin. A hook checks an output, triggers a process agents forget to run, or orients a session at its start. If it needs none of those, it stays a rule |
| A repeatable procedure | A skill, in a plugin that already exists where one fits |
| A whole reusable system | A new plugin here, with its own `README.md`, registered in `../.claude-plugin/marketplace.json`, offered by `project-init`, and listed in `../docs/toolkit-map.md` |

Mike describes things loosely. Tighten the wording, keep the intent, and ask
before writing when placement is ambiguous.

## Where the detail lives

- Each plugin's `README.md`: what that plugin is.
- `../docs/toolkit-map.md`: how the pieces relate, and what looks redundant but
  is not.
- `../tests/CLAUDE.md`: what each check asks and how to run it.
