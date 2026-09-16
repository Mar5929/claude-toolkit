# Team roles and how to size the team

The main conversation proposes a team before any agent starts, and the owner
agrees or changes it. Every agent runs on Opus. Every agent reads the prep file
first, so the whole team works from the same understanding of what the
requirements are for.

## The roles

| Role | Agent file | What it does | What it returns |
| --- | --- | --- | --- |
| Researcher | `agents/design-researcher.md` | Answers one bounded question from official documentation, project evidence, and community sources such as Reddit, Stack Overflow, GitHub issues, and forums | Findings, each with source, date, and a label: official, project evidence, or community claim |
| Architect | `agents/design-architect.md` | Writes one design option from the prep file, the requirements, the research, and the existing build. Verifies community claims before using them. Recommends a rewrite when that serves the requirements better than extending what exists | A draft design file, and a list of what changed after each fix round |
| Critic | `agents/design-critic.md` | Checks a draft against every requirement and against the writing rules | One line per requirement (satisfied, partly, not), plus findings on language, unnecessary custom work, and the end-to-end experience |

Optional roles, filled by a researcher or architect with a narrower brief:

| Role | When to add it | Brief |
| --- | --- | --- |
| Existing-build surveyor | The project is not greenfield and nobody in the session has read what exists for this area | A researcher told to map what the current build does for these requirements, with file paths, and where it falls short of the intent |
| Domain specialist | The platform has its own installed method, for example `sf-architect-solutioning` for Salesforce | The architect, told to invoke that skill and follow its verification rules |
| Experience reviewer | The requirements describe a flow a person goes through with several steps or screens | A critic told to walk the flow start to finish as that person and report where the design breaks it |

## Sizing

Count the requirements, the platforms or systems touched, and the number of
design options the owner wants. Then size from this table and adjust.

| Item | Researchers | Architects | Critics |
| --- | --- | --- | --- |
| Small: up to 5 requirements, one platform, one option | 1 | 1 | 1 |
| Medium: 6 to 15 requirements, or two platforms, or two options | 2 to 3, one per open question area | 1 per option | 1 |
| Large: more than 15 requirements, or three or more platforms, or three options | 3 to 5, one per open question area | 1 per option | 1 per option |

Add the surveyor when the build exists. Add the experience reviewer when the
flow has more than three steps. Add the domain specialist brief whenever the
platform's skill is installed.

## What the owner sees

Present the team as a short list: role, count, and one line on what each one
will read and return. Say how many agent runs the first pass will take
(researchers, then architects, then critics). The owner can cut, add, or
rename roles. Record the agreed team in the prep file.
