// A copy of ../protocols.default.json for the offline tests, which cannot read
// files. tests/protocol-guard-check.mjs fails when the two differ.
export default {
  "format": 1,
  "protocols": [
    {
      "name": "K4",
      "why": "Knowledge files change only with the knowledge-save skill open. The pending-memory inbox needs it open this turn; other knowledge files need it open since the last reset.",
      "owner": {
        "skill": "knowledge-save"
      },
      "appliesIf": {
        "exists": "knowledge/knowledge-manual.md"
      },
      "on": {
        "write": [
          "knowledge/memory-inbox.md",
          "knowledge/memory/",
          "knowledge/prds/",
          "knowledge/memory-self-improvement.md"
        ],
        "shell": true,
        "oneWriter": [
          "knowledge/memory/current.md",
          "knowledge/memory-inbox.md"
        ]
      },
      "require": [
        {
          "opened": "owner",
          "within": "turn",
          "paths": [
            "knowledge/memory-inbox.md"
          ]
        },
        {
          "opened": "owner",
          "within": "reset"
        }
      ],
      "tell": "Open the knowledge-save skill with the Skill tool and follow it, then make this change again."
    },
    {
      "name": "CW",
      "why": "Working memory follows the current focus: a work item created, closed, or moved to another stage is written to knowledge/memory/current.md in the same turn.",
      "owner": {
        "skill": "knowledge-save"
      },
      "appliesIf": {
        "exists": "knowledge/knowledge-manual.md"
      },
      "on": {
        "turnEnd": {
          "afterWorkItemChange": true
        }
      },
      "require": [
        {
          "wrote": [
            "knowledge/memory/current.md"
          ]
        }
      ],
      "tell": "Update knowledge/memory/current.md for this work-item change, following the knowledge-save skill. If it cannot be published now, record the pending publication in the work item."
    },
    {
      "name": "K5",
      "why": "Generated indexes are rebuilt by the index builder, never edited by hand.",
      "owner": {
        "skill": "knowledge-save"
      },
      "appliesIf": {
        "exists": "knowledge/knowledge-manual.md"
      },
      "on": {
        "write": [
          "knowledge/memory/memory-index.md",
          "knowledge/prds/prd-index.md",
          "ai-external-knowledge/README.md"
        ]
      },
      "require": [
        {
          "never": true
        }
      ],
      "tell": "This index is generated. Do not edit it. Change its source files, then run node .claude/tools/build-knowledge-index.mjs."
    },
    {
      "name": "K6",
      "why": "After a knowledge write, the indexes are rebuilt and the checker passes before the turn ends.",
      "owner": {
        "skill": "knowledge-save"
      },
      "appliesIf": {
        "exists": "knowledge/knowledge-manual.md"
      },
      "on": {
        "turnEnd": {
          "afterWrite": [
            "knowledge/memory-inbox.md",
            "knowledge/memory/",
            "knowledge/prds/",
            "knowledge/memory-self-improvement.md"
          ]
        }
      },
      "require": [
        {
          "ran": [
            "build-knowledge-index.mjs",
            "check-knowledge.mjs"
          ]
        }
      ],
      "tell": "Run node .claude/tools/build-knowledge-index.mjs, then node .claude/tools/check-knowledge.mjs, and fix any problem it reports."
    }
  ]
}
