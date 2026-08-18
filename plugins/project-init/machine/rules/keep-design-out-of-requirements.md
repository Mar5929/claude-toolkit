# Keep Build Decisions Out of Requirements

Requirements say what a thing must do. They never say how it will be built.
Those are two different documents, and mixing them takes away the owner's
ability to change one without rewriting the other.

This holds in every repository on this computer, including ones nobody ever set
up with the toolkit.

## Three documents, three jobs

- **The functional requirements.** What the thing does, and what the person
  using it experiences. Written so someone non-technical can read it end to end.
  No technology in it at all.
- **The technical specification.** How it gets built. Systems, data, interfaces,
  code structure, anything a builder needs.
- **The architectural decision records.** Short notes, one per choice, each
  saying what was decided, what else was considered, and why this one won. They
  are the bridge between the other two: a decision record points back at the
  requirement it serves and forward at the part of the technical specification
  it produced.

Skip the middle piece and, months later, nobody can tell whether a technical
choice was forced by a requirement or was just what somebody preferred that day.
So it gets defended as if it were a requirement, and the real requirement gets
lost behind it.

## What the functional requirements hold

One document, five sections:

1. **Business requirements.** What the organization needs out of this, and what
   it is worth to them.
2. **Personas.** Each type of person who touches this, and how it should behave
   for each one. What one of them is allowed to do is often not what another is.
3. **Functional requirements.** What the thing does, feature by feature, seen
   from outside.
4. **Process requirements.** The steps a piece of work moves through, in order,
   including who hands it to whom and what happens when it stalls.
5. **Logic requirements.** The rules that decide outcomes: when this is true,
   that happens. Written as rules in plain words, never as code.

## What never goes in them

Anything the owner could change their mind about without changing what the thing
does:

- A language, framework, library, database, or vendor.
- A data model, table, field name, object name, or schema.
- A file path, folder layout, module name, or class name.
- An interface shape, endpoint, or message format.
- A hosting, deployment, or infrastructure choice.
- A performance technique such as caching, batching, or queueing, unless the
  owner asked for it as a requirement in its own right.

When one of these turns up while requirements are being written, do not delete
it. Move it. The choice goes in the technical specification, and the reason it
was chosen goes in a decision record.

## Offer it, do not assume it

Not every piece of work needs a functional requirements document. A one-line fix
does not.

So when work starts on something big enough to be worth it, ask the owner one
question: do you want functional requirements written for this? Then do what
they say. Never produce the document unasked, and never skip the question
because the answer looks obvious.

## This rule names no folders

Where the three documents live is the project's business. A ticket body, a
knowledge folder, a work item folder, a wiki: all fine. This rule is about what
belongs in each document and what never does, not about where they sit or what
they are named.

## How this sits next to the project rule

Toolkit projects carry a rule called "Log the Work, Spec It, Then Build It",
which already says a ticket's requirements are what and why, never how. The two
agree. That one reaches a folder only when someone set that project up with the
toolkit, and it stops at the ticket. This one is on the whole computer, and it
adds the five sections, the separate technical specification, and the decision
records that join the two together. Where a project carries both, follow both.
