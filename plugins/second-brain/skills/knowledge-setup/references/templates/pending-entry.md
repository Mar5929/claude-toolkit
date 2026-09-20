# Pending entry template

One entry in `knowledge/memory-inbox.md`, never a separate per-save file/store.
Use an opaque UUID once; keep it through retries and revisions. All fields below
are ordinary Markdown for the agent to maintain. A state is not authority.

```markdown
<!-- knowledge-save:<stable UUID>:start -->
## <Readable topic>

Reference: <same stable UUID>
Revision: <current proposal revision>
Destination: <project-relative paths>
Operation: <create/update/supersede/retire/delete/consolidate>
State: <awaiting approval | approved, save unfinished | blocked by conflict>
Source: <evidence and its actual date>
Conversation: <host and actual conversation ID, or explicitly unavailable>
Updated: <actual ISO date/time>
Next: <specific remaining action or blocker>

### Exact card or owed update
<Preserve shown card text and layout exactly. If no card was shown, record only
what authorized upkeep owes, with scope and delivery links; do not invent one.>

### Authority
<Actual person/source/date, approved revision and precise operation/meaning/scope,
or reference to applicable ongoing permission. Awaiting approval says none.
Preserve prior authority when a revised proposal or conflict appears.>

### Execution evidence
<Worker/host/session/checkout when known; actual destination read-back;
checks actually run; commit; actual remote branch and last verification;
local/shared limits; publication and cleanup separately. Unknown stays unknown.>
<!-- knowledge-save:<same stable UUID>:end -->
```

Write and read back before destination mutation or helper dispatch. Share promptly
through the existing publication route. An entry inaccessible to another computer
cannot promise recovery there. Rejecting a card permits removing only this entry.
After verified destination publication, remove only its completed entry and
publish/verify cleanup. If cleanup fails, recover only cleanup after checking the
actual destination and current remote again. Never infer approval from card
numbers, silence, time, a commit trailer or the existence of this entry.
