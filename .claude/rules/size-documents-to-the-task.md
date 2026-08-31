# Size a Written Document to the Job It Has to Do

Cover the substance and stop. A document written to disk is as long as its
content and no longer. Do not pad it with filler sections, restated summaries,
or boilerplate nobody asked for.

This covers everything an agent writes into the repository: specifications,
persistent knowledge files, work item notes, handoff prompts, commit messages,
pull request text, READMEs, analyses, and reports.

## What padding looks like

- A closing summary that repeats what the document already said.
- A heading with one sentence under it, added so the document has more
  sections.
- Background the reader already has, restated to fill space.
- A next-steps list that is the requirements list again in different words.
- Hedging that names nothing: "it depends on the situation", "there are
  tradeoffs to weigh", with no situation and no tradeoff given.
- An introduction explaining what the document is about to say.

## Short is not the goal

Never cut a fact, a number, a date, a file path, a warning, or the reason
behind a decision to make a document shorter. Someone who was not in the
conversation has to act from this document alone, and a missing number costs
far more than an extra paragraph.

When completeness and brevity pull against each other, completeness wins. Write
the fact. Then delete the sentence that only introduced it.

A long document is not automatically padded. A specification with twenty
requirements is long because it has twenty requirements, and that is correct.

## Why this is a rule and not part of the output style

The output style shapes how Claude talks in the conversation, and it is
delivered in the main conversation's system prompt only. A helper agent never
sees it, and helper agents write specifications, pull request descriptions, and
handoff prompts. Claude Code loads every rule file into a helper agent's
context, so this rule reaches them and a style could not.
