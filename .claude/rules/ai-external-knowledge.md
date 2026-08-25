# Outside Documentation Goes in ai-external-knowledge

Agents work better when the documentation they need is already in the repository
instead of behind a web search. Pulling a vendor's docs, an API reference, or a
framework guide into the project as Markdown is a normal thing to do here. It has
one home.

## Where it goes

`ai-external-knowledge/` at the root of the project. Inside it, one folder per
topic, holding Markdown files. Each topic folder gets a short `README.md` naming
the source, the URL it came from, and the date it was captured.

Nothing else goes in there. Not project decisions, not meeting notes, not files
the client sent, not anything the project wrote about itself.

## It is raw source material

What sits in that folder is somebody else's writing. It is not the project's
truth, and saving it does not make it the project's truth.

- What the project concluded after reading it belongs in the project's own
  knowledge or documentation, linked back to the source file.
- When a captured document and the project's current truth disagree, the
  project's truth wins. Say the disagreement out loud instead of quietly picking
  one.
- Never edit a captured document to make it agree with the project. Keep it as
  it was published and write the difference down somewhere else.

## Nothing reads it on its own

A session does not open `ai-external-knowledge/` unless something tells it to.
Saving documents there makes them findable, not read. When agents should use a
topic by default, point at it from a rule, a skill, or the project's persistent
knowledge, and say which folder to open and when.

## Keep it trustworthy

- Record the source URL and the capture date every time. A document with neither
  is one nobody can trust six months later.
- When the source changes, capture it again rather than patching the old copy.
- Do not commit material the project has no right to redistribute. Public
  documentation is usually fine. Paid, licensed, or customer material is not,
  unless someone checked.
- Capturing a large documentation site fills the repository fast. Take the pages
  the project actually needs, and say roughly how much is coming before starting.
