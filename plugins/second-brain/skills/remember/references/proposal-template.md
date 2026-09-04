# The save proposal template

Read this every run, right before showing the owner anything. Every save
proposal, in every project, uses this one shape: the same parts, in the same
order, under the same labels. Nothing added, nothing left out, nothing
reordered. The owner should be able to read the tenth proposal the same way he
read the first, without looking for where anything went.

## Three hard rules

**Send it as rendered Markdown.** Never put a proposal inside a code fence, and
never dump it as plain indented text. The owner reads the formatted result. The
fences below exist only to show you the markup to write.

**Lead with the headline, then the words that would land.** The owner decides
from those two things. Everything after them is supporting detail and stays
short.

**Keep the blank lines.** The headline, the quoted text, and the bullet list are
three separate blocks with air between them. A block with the air squeezed out
is a block that gets skimmed.

## The shape

```markdown
**1. <one plain sentence saying what gets saved>** → <New memory file>

> <the meaning that would land in the file, two or three short sentences>

- **Why:** <what a future agent gets out of this, one line>
- **Where:** `<exact path>` (<new> or <edit>) · tags: <tags, comma separated>
- **From:** <who said it, and how sure>
- **Unsure:** <anything unchecked, or the word "nothing">
- **Checked:** <the files, rules and settings opened to confirm this is not already written down>
```

## The two parts that carry the decision

**The headline** is one sentence in ordinary words saying what is being saved.
It is not a file path and not a label like "Memory proposal". After the arrow,
say which of the four it is, in these words:

- `New memory file`
- `Memory, edit to an existing file`
- `New spec file`
- `Spec, edit to an existing file`

The owner should never have to read a folder path to work out whether he is
approving a memory (a thing that stayed true) or a spec (how the system is
supposed to work).

**The quoted block** is the meaning that would land in the file, in three
sentences at most. It is not the file's full text. Do not show full text unless
he asks for it. Write it so he can approve or edit the exact words, because
those are the words that get written.

## The five bullets

Each is one line. If a bullet needs two lines, it is too long.

- **Why** is what a future session gets out of it, not a restatement of what it
  says.
- **Where** carries the path, whether the file is new or an edit, and the tags.
  Tags ride along here because the owner rarely needs to weigh them, but he
  should still be able to see them without asking.
- **From** says who it came from and how sure it is: you said it, we worked it
  out together, or I worked it out. Name which.
- **Unsure** lists anything unchecked, or the single word "nothing". Never leave
  it out, and never soften a real guess into silence.
- **Checked** names the files, rules and settings opened. It goes in the block,
  not held back for later, so he sees the reasoning before he answers.

## How to write the words

Write every line as if the owner is five years old. Short words. Short
sentences. One idea per sentence. No jargon, and none of the toolkit's own
vocabulary.

No preamble. No restating what he just told you. No filler.

## More than one file

Number them 1, 2, 3, in the order you want them read, and put a horizontal rule
between them. After the last one, close with one line and nothing else:

```markdown
Reply with the numbers you want saved, or tell me what to change.
```

Two proposals that belong in the same file are still two numbered blocks, and
both `Where` lines name that one file. Say in the closing line that they would
land together.

## A memory, worked through

```markdown
**1. The client wants demos on Thursday, not Friday.** → New memory file

> Davis moved the weekly demo to Thursday at 2pm. Friday did not work because
> their finance team is closed. This started the week of March 3.

- **Why:** a new session would otherwise plan around Friday and be a day late
- **Where:** `knowledge/memory/demo-schedule.md` (new) · tags: scheduling, davis, meetings
- **From:** you said it in this chat, heard directly
- **Unsure:** nothing
- **Checked:** the memory index and `knowledge/current.md`. Nothing about demo timing is written down yet.
```

## A specification, worked through

Same shape. Only the arrow and the path change.

```markdown
**1. What happens when someone submits the form twice.** → Spec, edit to an existing file

> If someone clicks submit twice, only one record gets made. The second click
> shows a message saying it already went through. Nothing is lost.

- **Why:** the code shows the check exists, but not that the second click is meant to be friendly instead of an error
- **Where:** `knowledge/specs/intake-form.md` (edit, adds one section) · tags: intake, forms
- **From:** you and I worked it out together during the intake work item
- **Unsure:** I assumed the wording of the message is ours to pick. Tell me if you already have wording.
- **Checked:** the spec index and `knowledge/specs/intake-form.md`. It covers the fields but says nothing about double submits.
```

## After the blocks

Stop and wait. Nothing is queued, cached, or written on silence, on an unclear
answer, or on a request to see more text. `knowledge/README.md` owns what
approval means and what the owner is approving. This file owns only how the
proposal looks.
