# Archived second-brain v1 project profiles

Historical evidence only. Each file is a block of configuration that v1 setup
pasted into the two curator roles in `../agents/`, tuning them for one kind of
project. V3 has no curators and no profiles: it asks about the project directly
and creates only the system areas that are real.

Do not paste these into anything. They are kept because they record how the old
system was tuned per project type.

| File | The project type it described |
|---|---|
| `salesforce.md` | A Salesforce org build, org merge, or managed service, where org data and metadata matter as much as code. |
| `app.md` | A user-facing application (iOS, Android, web, desktop) built from source you compile and test. |
| `other-code.md` | Code that is neither: a library, service, command-line tool, or internal tooling. |
| `docs-only.md` | Little or no code: a documentation set, research base, policy library, or planning workspace. |

The one part of these files that is still live is their advice on which
dependency graph suits which project type. That now lives with the tools
themselves, in `project-init`'s `salesforce-dependency-graph.md` and
`graphify-dependency-graph.md`.
