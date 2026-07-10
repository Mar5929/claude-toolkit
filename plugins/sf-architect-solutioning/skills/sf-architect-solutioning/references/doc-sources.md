# Official Salesforce Documentation Sources

How to fetch, traverse, and verify against official Salesforce documentation during solutioning.

**Rule: never assert a platform capability, limit, API detail, or feature status from memory.** Verify it against one of these sources and cite the URL in the solution plan (Section "Sources Verified").

---

## Fetch Recipes by Site

| Site | How to read it |
|---|---|
| `developer.salesforce.com` classic "atlas" guides (`/docs/atlas.en-us.*`) | Fetch the JSON table of contents first (see traversal trick below), pick the relevant topics, then WebFetch each topic page. Pages return full content. |
| `developer.salesforce.com` new-style docs (`/docs/platform/...`, `/docs/ai/...`) | WebFetch directly. Pages return full content; follow in-page links by fetching them. |
| `architect.salesforce.com` | WebFetch directly. Pages return full content. |
| `help.salesforce.com` | JavaScript shell; WebFetch returns an empty page. Use the Playwright MCP browser (`browser_navigate`, wait for content, `browser_snapshot`). Before reaching for the browser, check whether the same content exists on developer.salesforce.com. |
| Topic not in the source map | WebSearch with `site:developer.salesforce.com <topic>` or `site:architect.salesforce.com <topic>`, then fetch the winning URL. |
| Apex / LWC API cross-check | Context7 MCP (`resolve-library-id` then `query-docs`) as a second opinion; official docs win on conflict. |

## Traversal Trick for Atlas Guides

Every atlas guide has a machine-readable table of contents. One fetch returns the entire link tree of the guide (every topic name and its page URL) plus the current release and API version:

```
https://developer.salesforce.com/docs/get_document/atlas.en-us.<guide-id>.meta
```

Then fetch any topic from the tree:

```
https://developer.salesforce.com/docs/atlas.en-us.<guide-id>.meta/<guide-id>/<topic-href>
```

- Use this to confirm the **current API version** at the start of any design session (the JSON reports it, e.g. "Summer '26 (API version 67.0)").
- To read an older release, pin the version in the URL: `atlas.en-us.<release>.0.<guide-id>.meta` (e.g. `atlas.en-us.256.0.apexcode.meta`).
- Verified working 2026-07-10.

---

## Source Map

Starting points, not limits. Traverse the TOC trees and in-page links to reach anything not listed here.

### Hubs

| Source | URL |
|---|---|
| All documentation hub | <https://developer.salesforce.com/docs> |
| API index (every Salesforce API) | <https://developer.salesforce.com/docs/apis> |

### Apex and Code

| Guide | Guide id | Entry URL |
|---|---|---|
| Apex Developer Guide | `apexcode` | <https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_dev_guide.htm> |
| Apex Reference Guide (classes, methods, namespaces) | `apexref` | <https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_ref_guide.htm> |
| Governor limits (topic in Apex Dev Guide) | `apexcode` | <https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_gov_limits.htm> |
| Secure Coding Guidelines | `secure_coding_guide` | <https://developer.salesforce.com/docs/atlas.en-us.secure_coding_guide.meta/secure_coding_guide/secure_coding_guidelines.htm> |

### Data Model and Queries

| Guide | Guide id | Entry URL |
|---|---|---|
| Object Reference (every standard object and field) | `object_reference` | <https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_concepts.htm> |
| SOQL and SOSL Reference | `soql_sosl` | <https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql.htm> |

### APIs and Integration

| Guide | Guide id | Entry URL |
|---|---|---|
| Metadata API Developer Guide | `api_meta` | <https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_intro.htm> |
| REST API Developer Guide | `api_rest` | <https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm> |
| SOAP API Developer Guide | `api` | <https://developer.salesforce.com/docs/atlas.en-us.api.meta/api/sforce_api_quickstart_intro.htm> |
| Bulk API 2.0 and async APIs | `api_asynch` | <https://developer.salesforce.com/docs/atlas.en-us.api_asynch.meta/api_asynch/asynch_api_intro.htm> |
| Tooling API | `api_tooling` | <https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/intro_api_tooling.htm> |
| Integration Patterns and Practices | `integration_patterns_and_practices` | <https://developer.salesforce.com/docs/atlas.en-us.integration_patterns_and_practices.meta/integration_patterns_and_practices/integ_pat_intro_overview.htm> |

### UI (new-style docs, WebFetch directly)

| Source | URL |
|---|---|
| Lightning Web Components Developer Guide | <https://developer.salesforce.com/docs/platform/lwc/guide> |
| Lightning Component Reference (base components) | <https://developer.salesforce.com/docs/platform/lightning-component-reference/guide> |

### AI (new-style docs, WebFetch directly)

| Source | URL |
|---|---|
| Agentforce Developer Guide | <https://developer.salesforce.com/docs/ai/agentforce/guide> |
| Agentforce Models API | <https://developer.salesforce.com/docs/ai/agentforce/guide/models-api.html> |

### Architecture (WebFetch directly)

| Source | URL |
|---|---|
| Well-Architected framework overview (pillars: Trusted, Easy, Adaptable) | <https://architect.salesforce.com/well-architected/overview> |
| Decision guides hub (e.g. record-triggered automation, Flow vs Apex) | <https://architect.salesforce.com/decision-guides> |
| Reference architecture diagrams | <https://architect.salesforce.com/diagrams> |

If an architect.salesforce.com URL 404s (that site reorganizes), WebSearch `site:architect.salesforce.com <topic>` and fetch the current location.

### Release Notes (Playwright required)

| Source | URL |
|---|---|
| Release notes: development | <https://help.salesforce.com/s/articleView?id=release-notes.rn_development.htm&release=262&type=5> |
| Release notes: full index | <https://help.salesforce.com/s/articleView?id=release-notes.salesforce_release_notes.htm&type=5> |

Swap the `release=` parameter for other releases (262 = Summer '26; each release adds 2).

---

## When to Verify

Always verify before the solution plan is presented:

1. **API version**: pull the current version from any atlas TOC feed at session start; use it for all designed metadata.
2. **Feature capability claims**: anything of the form "Flow can/cannot do X", "this object supports Y", "limit is N". One fetch per claim.
3. **Anything released after the model's knowledge cutoff**: new features, renamed products, retired features. Check the current release notes.
4. **Base component availability** before proposing an LWC design that depends on one.

Cache what you learn in the session; do not re-fetch the same page for the same question.
