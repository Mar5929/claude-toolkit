---
summary: Mike keeps the style handshake hook because Claude stops following the output style in long chats; it must work unseen, and agents should not propose removing it.
group: Toolkit design
type: decision
status: current
source: Mike Rihm's answer on 2026-09-21 in the Claude Code desktop conversation "Main Orchestrator"
context: A read-only investigation on 2026-09-21 recommended removing the style handshake hook because Claude Code already delivers the active output style; Mike rejected that from his own experience.
confidence: reported
created_at: 2026-09-21
updated_at: 2026-09-21
tags: [toolkit-design, output-style, hooks, claude-code]
approved_by: Mike Rihm
approval_date: 2026-09-21
project: claude-toolkit
work_item: "375"
---

# Why the style handshake hook stays

On 2026-09-21 Mike decided the style hook stays. In his experience Claude stops
following the selected output style once a chat gets long, even though the app
delivers the style by itself, so the hook has to put the style back in front of
the agent on every message.

The hook is the hooks-library style handshake, at
`plugins/hooks-library/hooks/style-handshake.mjs`. It runs when a user message
arrives, so the style is re-delivered on every message.

## What Mike decided

- Keep the forced re-read of the output style on every user message.
- Delete the visible sentence `I read the output style and will follow it.` He
  does not want to see it. The hook should do its work unseen.
- Do not recommend removing the hook on the grounds that the app already
  delivers the style. Mike has heard that argument and rejected it.

## Where this came from

A read-only investigation on 2026-09-21 recommended removing the hook, because
Claude Code sends the active output style with every request, which made the
hook look like repeated work. Mike rejected that recommendation from his own
experience of long chats. This is reported experience, not a measured result.

An earlier hook named `style-reminder` re-stated the output style on every
message. Mike removed it on 2026-08-21 as per-message overhead for an
instruction the harness already re-delivers, and the toolkit stopped shipping
it. That history is in [.claude/rules/README.md](../../../.claude/rules/README.md).
The decision recorded here is newer and goes the other way for the style
handshake.

## Related records

- GitHub issue #375 tracks the build that makes the style handshake work without
  the visible sentence. It is not recorded here as shipped.
