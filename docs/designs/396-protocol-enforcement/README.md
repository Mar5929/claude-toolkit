# Working records behind the #396 plan

These files support [the plan](../396-protocol-enforcement.md) for issue #396.
They are proposals and test code, not shipped behavior. They are deleted with
the plan at stage `14-spec-update`.

| File | What it is |
| --- | --- |
| `part-a-knowledge.md` | Which Knowledge System requirements become forced protocols, the copied how-to to remove, and proposed PRD wording |
| `part-b-toolkit.md` | The same review for the rest of the toolkit, plus protocols that permission rules can cover |
| `part-c-style.md` | The proposed Plain English style text, the reply check, and DragonFly's conflicting rules |
| `part-d-engine.md` | The design of the one protocol engine: the protocol list, events, fail-safe rules, backup, and how it is turned on |
| `prototypes/engine/hooks/engine.ts` | Part D's prototype engine, a function-hook module driven by the protocol list |
| `prototypes/engine/protocols.default.json` | The prototype's default protocol list |
| `prototypes/engine/tests/engine.test.ts` | The prototype's offline tests |
| `prototypes/engine/tsconfig.json` | TypeScript settings for the prototype; its declarations folder is not kept, so regenerate it with `/plugin-types` before reuse |
| `prototypes/engine/hooks/hooks.json` and `prototypes/engine/.claude-plugin/plugin.json` | The prototype plugin's module list and manifest |
| `prototypes/reply-check/hooks/index.ts` | Part C's prototype reply check, which sends a failed reply back to the main agent |
| `prototypes/reply-check/hooks/hooks.json` and `prototypes/reply-check/.claude-plugin/plugin.json` | That prototype's module list and manifest |

The prototypes ran only against Claude Code 2.1.280 in print mode, with
`CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1`. They are not installed anywhere.
