## Always Clarify Before These Salesforce Changes

Some changes are expensive to undo or ripple across the org. For the categories
below, confirm intent and scope with the owner before you act, even when the
request seems clear. This builds on the general "ask before assuming" rule; these
categories always require a check regardless.

Confirm first before:

- **Object-model changes:** new or changed objects, fields, relationships,
  validation rules, or record types. Data-model changes are hard to reverse once
  data lands.
- **Security and access changes:** profiles, permission sets, permission set
  groups, sharing rules, or field-level security.
- **Integration changes:** API connections, external data-source configuration,
  named credentials, remote site settings, or connector field mappings.
- **Data-source priority:** which source system wins for a given field or object
  when more than one can write it. Record the decision and its rationale where
  the project keeps decisions.
- **Anything that contradicts the project's stated requirements** (the
  requirements doc, spec, or signed-off scope).

When you confirm, state what you plan to change, which components it touches, and
what could break, then let the owner decide. One short question is cheaper than
undoing a wrong schema or permission change.
