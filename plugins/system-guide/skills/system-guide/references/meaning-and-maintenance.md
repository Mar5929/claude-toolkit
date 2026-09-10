# Meaning and maintenance

## Keep only useful understanding

Before proposing content, ask what a future reader learns that a quick source read would not show, or what substantial investigation the content saves. Keep supported connections across parts, their role in a larger process, important effects, and business meaning. Leave out obvious function summaries, duplicated prose, command history, and inventories that do not improve navigation.

Generated pages report what configured sources show, including scope, revision or capture date, gaps, and uncertainty. Meaning pages explain purpose, importance, and authority. Generated content can link to meaning, but refresh never edits the separate meaning files.

## Propose exact meaning

For every addition, correction, move, merge, or deletion, show:

- the exact proposed text or exact text to remove;
- its destination;
- the evidence source;
- uncertainty; and
- for deletion or merge, why the existing words no longer help.

Create a deterministic preview with `propose --request <request.json>`. Present that preview to the owner. An approval must clearly apply to that exact proposal and come from the human owner. Silence, a helper-agent answer, approval of a refresh, or a broad instruction to continue is not meaning approval.

After approval, record it in the approval input and run `apply --preview <preview-id> --approval <approval.json>`. Applying a changed or unmatched proposal must fail. Record who approved it and when.

## Refresh and cleanup

Refresh after configured source material changes. A successful refresh updates affected generated pages and indexes, preserves meaning, records the source and successful time, and flags meaning whose subject changed or disappeared. A failed refresh must not claim success. Partial or failed evidence does not prove that unrelated parts were removed.

When reading or updating an affected page, notice wrong claims, duplicates, obvious code repetition, and explanations that no longer help. Refresh may remove obsolete generated facts supported by complete evidence. Meaning cleanup still needs exact owner approval. Update affected current links and indexes with an approved removal; retain short history only when it helps explain today's system.
