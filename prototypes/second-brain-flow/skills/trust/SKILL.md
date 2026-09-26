---
name: trust
description: Owner only. Turns second-brain-flow trusted memory mode on or off.
argument-hint: on|off
disable-model-invocation: true
---

The owner typed the trust command with this argument: `$ARGUMENTS`.

1. If the argument is not `on` or `off`, tell the owner to type
   `/second-brain-flow:trust on` or `/second-brain-flow:trust off`, and stop.
2. Run `flow route chat`.
3. Run `flow trust set $ARGUMENTS`.
4. Tell the owner the new memory mode in one sentence, using the words the
   command printed.

`on` means trusted mode: saves go to the memory-librarian agent without asking,
and the owner can review them with `flow memory log`. `off` means onboarding
mode: every save waits for the owner's approval.
