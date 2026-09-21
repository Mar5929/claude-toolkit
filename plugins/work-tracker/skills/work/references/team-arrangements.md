# Team arrangements

This file explains the two answers to the team-arrangement question in
[agent-led delivery](agent-led-delivery.md). That file owns the question, when
it is asked, and where the answer is recorded. Read this file to learn what
each answer means and how to work under it.

## One team inside this chat

- This chat's main agent is the lead. It plans the work, splits it, briefs
  helper agents, judges and verifies what they return, makes the calls, keeps
  the work item current, and reports to the owner.
- Helper agents do the token-heavy work: reading long files, searching,
  building, drafting, and running checks.
- One writer per path at a time. A reviewer never edits what it reviews. It
  returns its findings to the lead.
- Helper use follows the helper authority stated under "Divide responsibility"
  in [agent-led delivery](agent-led-delivery.md). Where that authority is
  absent, the main agent does the work itself.
- This is also the arrangement used on a host that cannot support the
  multi-chat arrangement below.

## Main Orchestrator with other chats

- Rename this chat to "Main Orchestrator" using the host's chat-title feature.
  If the agent cannot rename it, ask the owner to rename it.
- Run one chat per responsibility. For example one build item, one review, one
  sync. Each chat has its own lead and its own helpers, arranged as in "One
  team inside this chat".
- The Main Orchestrator coordinates the chats, checks their results, owns the
  work tracker, owns shared files such as shared version numbers and indexes,
  owns merges, and reports to the owner in plain product-owner language. It
  does not do a chat's work for it.
- Each chat lead plans, briefs, judges, and verifies. Its helper agents do the
  token-heavy reading, building, drafting, and check runs. One writer per path
  at a time. Reviewers never edit.
- Chats report to the Main Orchestrator by message and also save their reports
  to files through the project's documentation route. A report that exists only
  in a chat transcript is lost with the chat.
- Live status, meaning chat ids, chat states, and next actions, belongs in the
  work item, not in a plan or design file. A recorded chat id is coordination
  information. It is not proof the chat is still running.

## Starting a chat

These are host facts, observed in the Claude Code desktop app on 2026-09-21.
Check the current host's behavior when it matters.

- A new chat starts from a task button the owner clicks. The Main Orchestrator
  cannot create a chat silently. The button's "Start with worktree" option
  gives the chat its own folder.
- A chat started from the Main Orchestrator copies its model. Set the lead's
  model on purpose.
- The Main Orchestrator can message chats, read their transcripts, and group
  them in the sidebar. It cannot approve their permission prompts. It sees the
  20 most recent local chats.
- A chat will not let a message from another chat lift a limit set in its own
  starting prompt. So put every permission the chat will need in its starting
  prompt, including permission to save its own report to a file. Include only
  permissions the owner or the project has already given.
- Open every starting prompt with the project's working principles as the owner
  stated them, including building what the requirements ask and no more, and
  with the lead-and-helper split.

## Models

- The most capable available model leads and guides: the lead of a single-chat
  team, the Main Orchestrator, and each chat lead.
- The project's helper model does the execution.
- A project rule or the owner's recorded preference supplies the actual models.
  Use only models the current host offers.
