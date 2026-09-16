# Team roles, default models, and example compositions

The team is recommended fresh for every item. The main conversation weighs
the complexity and effort of the requirements in the context of what is
being built, proposes a team, and the owner agrees or changes it before any
agent starts. Every agent reads the prep file first, so the whole team works
from the same understanding of what the requirements are for.

## The roles

| Role | Agent file | Default model | What it does | What it returns |
| --- | --- | --- | --- | --- |
| Product analyst | `agents/design-product-analyst.md` | The strongest reasoning model available (Opus by default) | Checks the requirements are complete, explicit end to end, and coherent inside the larger system before design starts. Walks the end-to-end experience as the person who uses the result | A confidence percentage, the missing pieces, the places that are not explicit, and the misreading risks, each with a fix |
| Researcher | `agents/design-researcher.md` | A capable, cheaper model (Sonnet by default), because the work is reading and reporting | Answers one bounded question from official documentation, project evidence, and community sources such as Reddit, Stack Overflow, GitHub issues, and forums | Findings, each with source, date, and a label: official, project evidence, or community claim |
| Technical architect | `agents/design-architect.md` | The strongest reasoning model available (Opus by default) | Writes one design option from the prep file, the requirements, the research, and the existing build. Verifies community claims before using them. Recommends a rewrite when that serves the requirements better than extending what exists | A draft design file, and a list of what changed after each fix round |
| Critic | `agents/design-critic.md` | The strongest reasoning model available (Opus by default) | Checks a draft against every requirement and against the writing rules | One line per requirement (satisfied, partly, not), plus findings on language, unnecessary custom work, and the end-to-end experience |
| Task agent | The host's general-purpose agent, no packaged file | Whatever fits the task; a cheaper model for reading and summarizing, a stronger one for judgment | A bounded job the others should not spend context on: map what the existing build does for one area, list every place a setting is used, draft a diagram, check one source, fill one section of the prep file from a document | The result the brief asked for, with file paths and sources |

Narrower briefs for the same roles:

| Brief | When to add it | Given to |
| --- | --- | --- |
| Existing-build survey | The project is not greenfield and nobody in the session has read what exists for this area | A task agent or researcher: map what the current build does for these requirements, with file paths, and where it falls short of the intent |
| Domain specialist | The platform has its own installed method, for example `sf-architect-solutioning` for Salesforce | The architect: invoke that skill and follow its verification rules |
| Experience walk | The requirements describe a flow with several steps or screens | The product analyst before design, and a critic after: walk the flow start to finish as that person and report where it breaks |

Pass the model on every Agent call, even when it matches the agent file, so
the choice is visible. A project that forces one model for every subagent
overrides both, and that is fine.

## How to size the team

Weigh, in the context of what is being built:

- how many requirements there are, and how many are unclear;
- how many systems, platforms, or teams the result touches;
- whether a build already exists, and how much of it the result changes;
- how many design options the owner wants;
- how much is unknown about the platform, the version, or the data.

Then recommend a team, say why each role and count is there, and say how many
agent runs the first pass will take. Cut what the item does not need. A small
item still gets a product analyst and a critic; those two are what make the
loop stop for the right reason.

## Example compositions

Starting points, not rules.

| Item | Product analyst | Researchers | Architects | Critics | Task agents |
| --- | --- | --- | --- | --- | --- |
| Small: up to 5 clear requirements, one platform, one option, greenfield | 1 | 1 | 1 | 1 | 0 |
| Medium: 6 to 15 requirements, or two platforms, or two options, or an existing build | 1 | 2 to 3, one per open question area | 1 per option | 1 | 1 for the existing-build survey |
| Large: more than 15 requirements, or three or more platforms, or three options, or a rewrite decision | 1, with the experience walk | 3 to 5, one per open question area | 1 per option | 1 per option | 1 to 3 for surveys and source checks |

## What the owner sees

A short list: role, count, model, and one line on what each one reads and
returns. The owner can cut, add, rename, or change the model for any role.
Record the agreed team in the prep file.
