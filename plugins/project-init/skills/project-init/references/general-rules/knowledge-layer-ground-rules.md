# Knowledge Layer Ground Rules

Include this rule only in a project that already has the v1 knowledge layer. Do
not add it to a new project during Unit 00 containment.

Existing `know-*` nodes, SHA pins, drift reports, curator files, and outbox files
are legacy migration evidence. Do not refresh, reconcile, promote, or delete
them. Do not dispatch the knowledge-curator or use a v1 write fallback.

Useful legacy explanations must be verified against current code and
specifications before use. A verified explanation may later be proposed through
the Git-native v2 review flow, but it does not become current truth
automatically.
