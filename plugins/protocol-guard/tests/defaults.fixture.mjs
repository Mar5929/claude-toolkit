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
      "tell": "Open the knowledge-save skill with the Skill tool and follow it, then make this change again. If the skill is not installed, tell the owner and stop."
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
      "tell": "Update knowledge/memory/current.md for this work-item change, following the knowledge-save skill. If it cannot be published now, record the pending publication in the work item. If the skill is not installed, tell the owner and stop."
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
      "tell": "Run node .claude/tools/build-knowledge-index.mjs, then node .claude/tools/check-knowledge.mjs, and fix any problem it reports. If the skill is not installed, tell the owner and stop."
    },
    {
      "name": "K7",
      "why": "Opening a pull request, closing a work item, and merging are save-review moments: knowledge-save is opened this turn first, so what the work changed reaches its owning record.",
      "owner": {
        "skill": "knowledge-save"
      },
      "appliesIf": {
        "exists": "knowledge/knowledge-manual.md"
      },
      "on": {
        "action": [
          "pr-create",
          "issue-close",
          "pr-merge",
          "work-finish"
        ]
      },
      "require": [
        {
          "opened": "owner",
          "within": "turn"
        }
      ],
      "tell": "Open the knowledge-save skill with the Skill tool, review what this work changed and preserve any pending save, then run this action again. If the skill is not installed, tell the owner and stop."
    },
    {
      "name": "P2",
      "why": "Closing a work item goes through the work skill, which asks the owner for approval. The check proves only that the skill was opened.",
      "owner": {
        "skill": "work"
      },
      "on": {
        "action": [
          "issue-close",
          "work-finish"
        ]
      },
      "require": [
        {
          "opened": "owner",
          "within": "turn"
        }
      ],
      "tell": "Open the work skill with the Skill tool and follow its steps for closing a work item, including the owner's approval, then run this action again if it still applies. If the skill is not installed, tell the owner and stop."
    },
    {
      "name": "P3",
      "why": "A merge goes through merge-and-clean-up, which lands an approved pull request and removes only its own branch and worktree.",
      "owner": {
        "skill": "merge-and-clean-up"
      },
      "on": {
        "action": [
          "pr-merge"
        ]
      },
      "require": [
        {
          "opened": "owner",
          "within": "session"
        }
      ],
      "tell": "Open the merge-and-clean-up skill with the Skill tool and follow it, then run this merge again if it still applies. If the skill is not installed, tell the owner and stop."
    }
  ]
}
