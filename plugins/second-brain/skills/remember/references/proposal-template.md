# The save proposal template

Read this every run, right before showing the owner anything. Every save
proposal, in every project, uses this one shape: the same parts, in the same
order, under the same labels. Nothing added, nothing left out, nothing
reordered. The owner should be able to read the tenth proposal the same way he
read the first, without looking for where anything went.

## Two hard rules

**Send it as rendered Markdown.** Never put a proposal inside a code fence, and
never dump it as plain indented text. The owner reads the formatted result. The
fences below exist only to show you the markup to write.

**Keep the blank lines.** Each label sits on its own line, with a blank line
after it. That white space is what lets the owner tell one part from the next at
a glance. A block with the air squeezed out of it is a block that gets skimmed.

## The shape

```markdown
### 1. <a short plain sentence naming the thing being saved>

**Save as** <Memory (a thing that stayed true) or Spec (how the system is supposed to work)>

**What it says**

<two or three short sentences>

**Why keep it**

<one or two sentences on what a future agent gets out of this>

**Where it goes**

`<exact file path>`, <new file, or an edit to a file that exists>

**Where it came from**

<who said it, and how sure: you said it, we worked it out together, or I worked it out>

**Labels**

<the tags, separated by commas>

**Guesses I made**

<anything unchecked, or the word None>

**What I checked**

<the files, rules, and settings opened to confirm this is not already written down>
```

## How to write the words

Write every line as if the owner is five years old. Short words. Short
sentences. One idea per sentence. No jargon, and none of the toolkit's own
vocabulary.

**The subject line comes first and is never left out.** It says what is being
saved in ordinary words, so the owner knows what he is looking at before he
reads a single detail. It is not a file path, and it is not a label like
"Memory proposal".

**`Save as`** says Memory or Spec in that word, with the short explanation
beside it. The owner should never have to read a folder path to work out which
of the two he is being asked to approve.

**`What it says`** is the meaning that would land in the file, in three
sentences at most. It is not the file's full text. Do not show full text unless
he asks for it.

**`What I checked`** goes in the block, not held back for later, so he sees the
reasoning before he answers.

No preamble. No restating what he just told you. No filler.

## More than one file

Number the blocks 1, 2, 3, in the order you want them read, and put a horizontal
rule between them. After the last block, close with one line and nothing else:

```markdown
Reply with the numbers you want saved, or tell me what to change.
```

## A memory, worked through

```markdown
### 1. The client wants demos on Thursday, not Friday

**Save as** Memory (a thing that stayed true)

**What it says**

Davis moved the weekly demo to Thursday at 2pm. Friday did not work because
their finance team is closed. This started the week of March 3.

**Why keep it**

A new session would otherwise plan around Friday and be a day late.

**Where it goes**

`knowledge/memory/demo-schedule.md`, new file

**Where it came from**

You said it in this chat. Heard directly.

**Labels**

scheduling, davis, meetings

**Guesses I made**

None

**What I checked**

Opened the memory index and `knowledge/current.md`. Nothing about demo timing is
written down yet.
```

## A specification, worked through

Same shape. Only the `Save as` line and the path change.

```markdown
### 1. What happens when someone submits the form twice

**Save as** Spec (how the system is supposed to work)

**What it says**

If someone clicks submit twice, only one record gets made. The second click
shows a message saying it already went through. Nothing is lost.

**Why keep it**

The code shows the check exists, but not that the second click is meant to be
friendly instead of an error.

**Where it goes**

`knowledge/specs/intake-form.md`, an edit adding one section

**Where it came from**

You and I worked it out together during the intake work item.

**Labels**

intake, forms

**Guesses I made**

I assumed the wording of the message is ours to pick. Tell me if you already
have wording for it.

**What I checked**

Opened the spec index and `knowledge/specs/intake-form.md`. It covers the fields
but says nothing about double submits.
```

## After the blocks

Stop and wait. Nothing is queued, cached, or written on silence, on an unclear
answer, or on a request to see more text. `knowledge/README.md` owns what
approval means and what the owner is approving. This file owns only how the
proposal looks.
