# How the memory system works

The design for saving and reading persistent information in a project: the
folders, what goes in each, who may write to them, what every file looks like,
how files link to each other, and what every session knows at startup.

## Words used in this document

Defined here so no agent has to guess.

- **The user**: the human being talking to the agent. In this repository that is
  Mike. Never another agent, and never a helper agent an agent started.
- **The agent**: any AI assistant working in this repository. Claude Code,
  Codex, or a helper agent one of them started.
- **A save**: creating a file in `specs/` or `memory/`, or editing one.
- **A specification**: a file in `specs/`. It says what a thing must do.
- **A memory**: a file in `memory/`. It says something worth knowing.
- **A persona**: a kind of person who uses the thing being specified, described
  by what that person is trying to get done.
- **An area**: a functional part of the system being built, like intake or
  billing. Area names become folder names inside `specs/`.
- **A brainstorm**: a raw transcript of a refinement or brainstorming session,
  stored in `brainstorms/`. It records what was said, not what was approved.
- **The index**: the one file listing every specification and memory file with
  its one-sentence summary. A script rebuilds it after every save. Nobody edits
  it by hand.

## What it is for

A chat session ends and everything in it is gone. Anything a future session
needs has to be in a file. This system is how those files get written, and the
one thing it protects against is a file getting written that the user never
read, because a wrong fact saved once is repeated by every session after it.

## Who uses it

- **The user.** Wants to write things down without reading a manual, and wants
  to see every word before it is saved, so nothing invented or guessed gets in.
- **The agent.** Needs to know exactly where a fact goes, exactly what a file
  looks like, and exactly when it is allowed to write, with no judgement calls
  left open.

## Where an agent goes to figure things out

Two folders hold what this project knows about itself.

- **`specs/` is the specification system.** It says what things must do.
- **`memory/` is the memory system.** It says what is worth knowing.

Whenever an agent needs to understand this project, whether it is about to
change something, answer a question about it, or pick up work a previous session
started, those two folders are the first place it looks. Before searching the
code, and before asking the user something the project already wrote down.

At the start of a session, the agent reads the index at `memory/index.md`, so
it knows what is already written down before the first task begins.

Before changing how something behaves, the agent reads that thing's
specification first. If no specification covers it, the agent says so before
building.

A third folder, `brainstorms/`, sits beside these two and is a different kind
of thing: raw transcripts of refinement and brainstorming sessions. A
transcript records what was said, not what was approved. An agent may read one
when a task calls for it, and treats every line in it as unchecked words, never
as saved truth.

## What it must do

### What goes in `specs/`

What a thing must do. One file per capability, named after the capability. The
files are grouped into one folder per area, so a person can open `specs/` and
see at a glance which specifications belong to which part of the system.

    specs/
      intake/
        lead-routing.md
        web-to-lead-form.md
      billing/
        invoice-generation.md

The agent never invents a new area folder on its own. The first time a
specification needs an area that does not exist yet, the agent proposes the
folder name as part of the save, and the user approves it with everything
else.

### What goes in `memory/`, and which folder

| Folder | Put a file here when | Do not put it here when | For example |
| --- | --- | --- | --- |
| `memory/context/` | Something about the situation shapes several pieces of work: who is involved, what the project is up against, a limit that comes from outside. | It is what someone is working on right now, or what is blocked. That belongs in the work tracker. | The client ran on an Access database until 2021, and the old record IDs still live in a legacy field. |
| `memory/decisions/` | A choice was made that is not obvious, and knowing why will stop someone reversing it or arguing it again. | The choice was routine, or it is already written in a specification. | Why intake was built with flows instead of custom code. |
| `memory/knowledge/` | Something was worked out that would take real effort to work out again, or that stops a mistake somebody is likely to make. | It is obvious from reading the nearby code, or it is really a decision or a specification. | The old record IDs are not unique, so never match on them alone. |
| `memory/domain/` | A word or a business rule in this project means something specific that an agent could get wrong. | It describes how the software behaves. That is a specification. | To this client, a household means every account that shares one advisor. |
| `memory/operations/` | There is a repeatable procedure for running, releasing, or recovering something, along with how to tell it worked. | It is a one time task, or it is a password or a key. Those never go in any file here. | The steps to release to production, and how to confirm the release worked. |
| `memory/planning/` | The direction matters beyond one piece of work: where this is going, in what order, and what could go wrong along the way. | It is the status of one ticket. | The goal of the project, and the roadmap of phases for the next six months. |
| `memory/references/` | An outside source matters to this project, and someone needs to know what it supports and why. | The thing already has a home in this repository and can simply be linked. | The vendor's pricing page, and which of our choices depend on it. |

Files start out sitting directly inside these seven folders, with no folders
below them. When one folder grows crowded enough that a person can no longer
scan it, the agent may propose grouping its files into area folders, using the
same area names as `specs/` where they fit. The grouping happens only after the
user says yes, and never ahead of the crowding it solves.

If a file could sit in two of these folders, it goes in the one that says why it
matters, not the one that says what it is about. When it is still unclear, the
agent says so and asks rather than guessing.

One event can produce two files. When a big choice changes the direction, the
choice and its reason go in `memory/decisions/`, the roadmap in
`memory/planning/` is updated to match, and the two files link to each other.

### Things that may stop being true

Some of what gets saved will not be true forever. That is fine, and it is not a
reason to leave it out. When a file says something that a specific future change
would make wrong, the file says so on its own `Stops being true if:` line, so a
later reader knows to check it rather than trust it.

### The small part that is always loaded

Every session carries these four lines to the top of the ai agent's mind, and no more:

1. `specs/` says what things must do. `memory/` says what is worth knowing.
   Look there before searching the code, and before asking the user something
   the project already wrote down.
2. At the start of a session, read the index at `memory/index.md` to see what
   is already written down.
3. `brainstorms/` holds raw transcripts. Nothing in them is approved truth.
4. Never write into `specs/` or `memory/` without first showing the user the
   exact words and getting a yes from the user.

Those four lines are the only part of this document loaded into every session.
Everything else here loads only when a save actually runs.

### When a save runs

Three moments:

1. The user asks for something to be remembered, or types `/remember`.
2. A pull request is about to open.
3. The session is about to be cleared, or handed to a fresh session.

Not at the end of a message, not on a commit, and not after a small fix. Saving
at those moments is what fills the folders with things nobody needs.

### The shape of a memory file

Every file in `memory/` looks like this.

    # Title saying what this is

    One sentence saying what this file covers.

    Source: the user said this in this session
    Date: 2026-08-05
    Stops being true if: the /remember skill is rewritten

    The body, written in whatever shape fits the content.

    ## Related

    - [title of the other file](../knowledge/other-file-name.md): a few words on
      how it connects.

The `Source:` line is exactly one of these three, copied word for word:

- `Source: the user said this in this session`
- `Source: read from <exact file path>`
- `Source: the agent worked this out. Nobody has checked it.`

The `Source:` line at the top covers the whole file. If one fact inside the body
came from somewhere else, put its own `Source:` label on that line where it
sits.

`Stops being true if:` is included only when a specific future change would make
the file wrong. Most files will not have it.

`Related` is included only when there is at least one related file.

### The shape of a specification file

Every file in `specs/` looks like this.

    # Title saying what this is

    One sentence saying what this file covers.

    ## What it is for

    Why this exists and what problem it solves.

    ## Who uses it

    One entry per persona, saying what that person is trying to get done.

    ## What it must do

    Everything that has to be true for this to count as working.

    ## How it behaves from the outside

    Step by step: what the person does, and what happens back. Not the
    internals.

    ## Edge cases

    The odd and unhappy situations, each one with exactly what should happen.
    Name the behavior, not just the situation.

    ## What it deliberately does not do

    What was left out on purpose, and why. This stops a future agent adding it
    back.

    ## Related

    - [title of the other file](../memory/decisions/other-file-name.md): a few
      words on how it connects.

Rules for those sections:

- `What it is for`, `What it must do`, `How it behaves from the outside`, and
  `Edge cases` are always included.
- `Who uses it` is included only when more than one kind of person uses the
  thing and they need different things from it.
- `What it deliberately does not do` is included only when something was
  actually left out on purpose.
- `Related` is included only when there is at least one related file.
- A specification has no `Source:` line, because the user approved every word of
  it before it was written.
- A section with nothing to say is left out, never left in with a placeholder.

### How files link to each other

A link is a plain Markdown link pointing at the other file from where this one
sits.

    [why we dropped the memory verifier](../decisions/why-we-dropped-the-memory-verifier.md)
    [how the memory system works](../../specs/memory-system.md)

A link can sit in two places:

- **Inside the body**, where naming the other file helps the sentence read.
- **In the `Related` section at the bottom**, which lists every connected file
  with a few words saying how it connects.

**Links go both ways.** When a link is added from one file to another, the
matching link back is added in the same save. A one way link means a future
agent reading the second file never learns the first one exists.

Never link to a file that does not exist yet. If it needs to exist, save it in
the same save and link both ways then.

When a file moves or is renamed, every link pointing at it is fixed in the
same change, so no link is left pointing at a file that is not there.

### File names

Lower case, words joined by hyphens, describing the content in plain words.
`why-we-dropped-the-memory-verifier.md`, not `decision-001.md`. Files get found
by name, so the name has to say what is inside.

### The index

One file, `memory/index.md`, lists every file in `specs/` and `memory/`: its
title, its one-sentence summary, and a link. Reading it tells a new session
what the project already knows, in a page or so, without opening anything else.

Nobody maintains the index by hand. A small script rebuilds it from the files
themselves, copying each file's title and one-sentence summary. The agent runs
the script as the last step of every save. The user already approved every
title and summary during the save, so the rebuilt index contains nothing the
user has not seen.

The index is the one file in `memory/` that does not follow the memory file
shape, because it is a table of contents, not a memory.

A hand-kept index was tried in an earlier version of this system and failed:
agents spent more time tending the list than using it. The script exists so
that never happens again.

### How an agent finds things

An agent does not load every file. It starts from the index to see what
exists, reads the folder names above to work out which folder holds the kind
of thing it needs, searches the text inside `specs/` and `memory/` for the
subject, opens only what the task needs, and follows a link only when the
linked file matters to that task. It does not search `brainstorms/` to answer
whether something is saved, because a transcript is not a save.

## How it behaves from the outside

A save runs in six steps:

1. **Search first.** Read the index, and search the text inside `specs/` and
   `memory/` for the fact about to be saved. `brainstorms/` does not count: a
   fact sitting in a transcript is not saved.
2. **Prefer an edit.** If a file already covers the fact, propose an edit to
   that file. Never create a second file about the same fact.
3. **Draft the real words.** Write out what would actually be saved, not a
   description of it. Number each piece and give its file path.
4. **Label where every fact came from**, using one of the three `Source:` labels
   word for word.
5. **Show the user, then stop.** The user replies with numbers: keep, cut, or
   edit.
6. **Write only what the user kept**, run the index script, then state exactly
   which files were written and what was cut.

What the user's reply means:

- **Keep:** write it exactly as drafted.
- **Cut:** write nothing, keep no list of it, and do not raise it again.
- **Edit:** write the user's words exactly as typed, with no checking and no
  argument, because the user is the source.

## Edge cases

- **Nothing is worth saving.** Say so in one line and show nothing else.
- **The fact already exists in a file.** Name that file and write nothing.
- **The right folder is unclear.** Say which two folders it could go in and ask.
  Do not guess.
- **The user does not reply.** Write nothing. A pull request still opens with
  the code in it.
- **The user cuts everything.** Write nothing, and keep no list for later.
- **A fact is a guess.** Show it anyway, labelled
  `Source: the agent worked this out. Nobody has checked it.`, so the user can
  cut it on sight.
- **Two saved files disagree with each other.** Show the user both files and the
  exact sentences that disagree. Do not pick one, and do not edit either.
- **A related file does not exist yet.** Leave the link out.
- **The save is part of a pull request and the user has not replied yet.** The
  pull request opens with the code in it. The saved files are added to the same
  pull request whenever the user answers.
- **A fact appears only in a brainstorm transcript.** It does not count as
  saved. If it is worth keeping, it goes through a save like any other fact.
- **The index disagrees with the files.** The files win. Run the script again;
  nobody edits the index by hand.

## What it deliberately does not do

| Not here | Why |
| --- | --- |
| A helper agent that checks the draft | A helper agent starts with no memory of the conversation, so it cannot check whether the user said something. Checking it would mean pasting the whole conversation in, and by then the check has already happened. The user reading the words is the check. |
| A script that checks file shape | The user reading the exact words before the save is the check. A checker script is one more thing to maintain. |
| A hand-maintained index | Tried in an earlier version. Agents spent more time tending the list than using it. A script rebuilds the index from the approved titles and summaries instead. |
| The memory instructions copied into `CLAUDE.md` and `AGENTS.md` | Replaced by the four small lines that are always loaded. |
| Any fixed field beyond `Source:`, `Date:`, and `Stops being true if:` | Every required field is one more thing to get wrong and one more thing to maintain. |
