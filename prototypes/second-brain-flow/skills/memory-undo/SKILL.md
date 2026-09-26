---
name: memory-undo
description: Owner only. Undoes one second-brain-flow memory change by its change id.
argument-hint: chg-<id>
disable-model-invocation: true
---

The owner typed the undo command with this argument: `$ARGUMENTS`.

1. If the argument is not a change id such as `chg-1a2b3c`, tell the owner to
   type `/second-brain-flow:memory-undo <change id>`. `flow memory log` lists the ids.
   Stop.
2. Run `flow route chat`.
3. Run `flow memory undo $ARGUMENTS`.
4. Tell the owner in one sentence what the command printed. If it was refused
   because a later change touched the same file, name that change so the owner
   can undo it first.
