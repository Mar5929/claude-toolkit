# Write Artifacts in Plain English

An artifact is something an agent generates for a person to look at: a
diagram, a chart, a dashboard, a visualization, a mockup, a slide deck, a
published page, or a generated document. This rule is about the words inside
one: the title, the headings, the labels, the notes, the captions, the body
text.

The project's output style says how the agent talks in chat. The words inside
an artifact follow the same style. This rule exists because the output style
reaches only the main chat: a helper agent, a skill, or a Codex session that
makes an artifact never sees it. Read the active style file when there is
one. Where this rule and that file differ, the style file wins.

## Write about the subject

Every word describes the thing the artifact shows. The reader opened it to
learn about that thing, not about the artifact or the conversation that
produced it.

- Do not narrate the artifact. "Here is where the change lands, but only the
  key pieces" says nothing about the system. Cut it, or say what changed.
- Do not tell the reader what matters. "Here is the load-bearing decision"
  tells them how to feel. Write the decision.
- Bring in the conversation only when it is the fact. A quote earns its place
  when the exact words are what the reader needs, and then it says who said
  it and when. A quote the reader cannot place is noise.

## A heading names what is under it

A heading is a label, not a hook. It says what the reader is about to look
at, in the words of the subject.

The four headings below came from a page of options for who can see and edit
which records in Salesforce. The left column sells the section; the right
column names it.

| Written | Say instead |
|---|---|
| Three ways to build the role tree, pick one | Role hierarchy options |
| One question decides the whole shape | Decision: can a department leader edit their own team's records? |
| Four facts that rule out the most obvious answers | How role hierarchy access works |
| What shape actually hands to a real person | Record visibility by role |

A number belongs in a heading when the number is the fact: "Three departments
share one role". "Three ways to build it" only counts the section below, and
the reader can count.

## Use the real name

Call a thing what the system calls it, every time. In that same Salesforce
design the real names were role hierarchy, record visibility, sharing rule,
View All, and permission set. The page used picture words instead: "shape"
for the hierarchy, "lever" for a setting, "leaks" for access people should not
have, "flows up" for a manager getting access to their team's records. That is
figurative language, and it is not allowed. It makes the reader translate, and
a reader who does not know the system cannot.

A term the reader may not know gets a plain definition the first time it
appears. After that, the term is used unchanged.

A box or label carries the real name. Anything it needs to say about itself
is one plain line.

## Say the plain thing

The output style's rules on words apply inside the artifact:

- Common words. Short sentences. One idea each.
- No figurative or metaphorical language. No idioms, no jokes, no picture word
  standing in for a real thing.
- No preamble. Start with the content.
- No closing line that sums up or cheers.
- Fewer words, never fewer facts. Every number, name, date, and quotation
  stays exactly as it is.

## What this rule does not decide

How the artifact is laid out: how many boxes, what an arrow says, where a
note goes, whether there is a key. Every artifact is different, and the agent
making it decides. This rule decides the words.
