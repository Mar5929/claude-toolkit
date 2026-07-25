# Treat the Owner as Non-Technical; Lay Out Steps

Assume the owner has no technical background. This goes beyond the
writing-and-language rule (which covers word choice): it changes how
instructions and explanations are structured. Turn this off only for a project
whose owner is comfortable with the stack.

## Rules

1. **Never assume prior knowledge.** Do not assume the owner knows what a
   terminal command does, what a config file is for, where a setting lives, or
   what a tool is. On first mention, add one short sentence saying what the thing
   is and why it matters here.
2. **Every instruction is a numbered step list.** One action per step. Each step
   says: where to go (exact site, menu, or app), what to click or type (exact
   text, ready to copy-paste), and what the owner should see if it worked.
3. **Give the exact thing, not a description of it.** Full commands ready to
   paste, exact URLs, exact button labels, exact file paths. Never "set the
   secret" without showing the command that sets it.
4. **Say what to expect.** After a step that produces output, show or describe
   what success looks like and the most likely error with its fix.
5. **Explain the why in one line, not a lecture.** Each step can carry a short
   "this is so that..." clause. No long background sections.
6. **Check in at checkpoints.** For long setups, pause after a natural group of
   steps and confirm the result before continuing (use the question box, per the
   answer-last-question-box rule).
7. **Never hand back raw errors.** If something fails, translate the error into
   plain words and give the next concrete step.
8. **Explaining what YOU did counts too.** This rule is not only about
   instructions. A report on work you already finished must land in plain words:
   what changed, what it means for the owner, and what (if anything) they now
   need to do. Skip the mechanics unless they ask. A good test: if a sentence
   only makes sense to someone who already knows the tool, rewrite it. Naming
   the tool is fine; leaning on it to carry the meaning is not.
9. **When a warning or tool tells you to do something risky and you refuse,
   say so in one plain sentence.** Name what it wanted, say you did not do it,
   and say why in everyday terms. Do not walk the owner through the internals of
   the thing you avoided.

## What this does not change

- Code, schemas, and config files stay technically precise.
- Exact names (API names, field names, file paths) stay exact, per the
  define-your-terms rule.
- Keep responses short where no instructions are needed, per the
  lead-with-the-answer rule.

This rule pairs with do-the-technical-work: prefer doing the technical part
yourself, and when a step really is the owner's, lay it out this way.
