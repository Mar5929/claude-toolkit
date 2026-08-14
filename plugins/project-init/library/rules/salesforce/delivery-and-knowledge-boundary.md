# Salesforce Delivery and Knowledge Have Separate Homes

Use one current home for each kind of project information. Link between homes
when useful, but do not copy the same meaning into both.

## What `knowledge/` owns

`knowledge/` is curated working context that helps future agents work
correctly. It owns:

- approved product and system behavior;
- durable Salesforce org and client context;
- important decisions that matter beyond one work item;
- lasting risks, assumptions, and direction;
- business terms and meaning; and
- reusable operating knowledge.

Use the project's normal approval process before making any of this current
knowledge.

## What `delivery/` owns

New Salesforce projects use `delivery/` for the files produced or received
while doing the client work. It owns:

- project briefs and framing supplied by the client;
- communications and meeting records;
- raw client sources and org exports;
- work items and their routine choices;
- deployment records and release evidence;
- data files and backups;
- deliverables; and
- archives.

## The boundary cases

- Keep routine ticket choices in `delivery/work-items/`. Save a decision to
  `knowledge/` only when it matters beyond that work item and passes the
  project's persistent-information test.
- Keep raw client meetings and client-provided artifacts in `delivery/`. Put
  internal exploration and owner interviews in `knowledge/brainstorms/`.
- A source record may preserve what someone originally said. It does not become
  a second current authority. Link it to the approved specification or memory
  instead of copying current meaning back into the source.
- When the project knowledge system is selected, do not create
  `delivery/knowledge-base/`. The knowledge system is the one curated knowledge
  home.

## Existing projects stay where they are

An existing Salesforce project may already use `engagement/`. Keep using it as
that project's delivery-artifact root. Do not rename it, move its files, or
create a parallel `delivery/` tree automatically.

When a rule below names a `delivery/` path, substitute the existing
`engagement/` path for a project that already uses it. The ownership boundary
stays the same.
