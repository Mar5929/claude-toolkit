# Write Every Artifact in Plain, Explicit English

An artifact is something you generate for a person to look at: a diagram, a
chart, a dashboard, a visualization, a mockup, a slide deck, a published page,
or a generated document such as a PDF or Word report. This rule covers every
word inside one: titles, labels, legends, captions, notes, and body text.

It does not cover chat replies, code, README files, issue text, or commit
messages. The output style covers chat. This rule covers the artifact, because
the output style never reaches a helper agent, a Codex session, or the inside
of a file, and artifacts are made by all three.

## Write for a junior intern in their first week

- Plain technical English. Common words. A term of art only when no plain word
  exists, and then say what it means the first time it appears.
- Explicit. Name the thing every time. Never "it", "this", or "the above" when
  the reader could wonder which thing you mean.
- One idea per sentence. Short sentences. Every word carries a fact or goes.
- No preamble. Do not open with what the artifact is about to say. Start with
  the content.
- No commentary. Do not say what you just showed, how the artifact was made, or
  that something is important. Show the fact and let the reader judge.
- Not a story. No scene-setting, no build-up, no narrative. Facts in the order
  the reader needs them.
- No figures of speech, idioms, or jokes.

## Diagrams, charts, dashboards, and slides

- Every label is a plain noun or verb the reader already knows. No
  abbreviations the reader has to guess.
- One idea per box, bar, tile, or slide. Split anything that needs the word
  "and".
- The title says what the picture shows, in words the reader can check against
  it: "Orders per week, last quarter", not "Key insights".
- When a color, shape, or line style carries meaning, a key says what it means.
- An arrow or line means one thing, and the artifact says what: "calls",
  "sends", "depends on". Never an unlabeled arrow between two boxes that could
  be read two ways.
- A number on the picture carries its unit: "42 ms", "12 orders", "3 percent".
- No decorative text, and no caption that repeats the title.

## Keep out what reads as machine-written

A reader should not be able to tell that a machine wrote it. These patterns
give it away:

- Not-X-but-Y contrasts: "not just a tool, but a partner".
- Groups of three made for rhythm rather than because there are three things.
- Em dashes. Use a comma, a colon, or a new sentence.
- Stock words: crucial, robust, seamless, leverage, delve, comprehensive,
  ensure, landscape, journey, empower, streamline, elevate, insights.
- A closing line or slide that sums up or cheers the reader on.
- A bold label with a colon in front of every sentence, used to look organized.
- A question the text asks only so it can answer it.
- Hedging that hides whether a fact is known: "it seems", "possibly", "may
  suggest". State the fact, or say plainly that it is not confirmed.

The `unslop` skill holds the long list and cleans up text that already exists.
This rule is for the moment you make the artifact, so there is nothing to
clean up.

## Before you finish

Look at the artifact once as that intern. A label you would read twice gets
rewritten. A box or arrow you would ask "which one?" or "what does this mean?"
about gets a name. A sentence or element that can go without losing a fact
goes.

Keep every fact, number, name, path, command, and quotation exactly as it is.
Plain wording means fewer words, never less content.
