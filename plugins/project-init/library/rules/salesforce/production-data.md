---
paths:
  - "delivery/data/**"
  - "engagement/data/**"
---
# Production Data Files

- Backups go in `delivery/data/production-backups/prod-backup-<MMDDYYYY>-<slug>/`. Load files go in `delivery/data/data-loads/<change-slug>-<MMDDYYYY>/`.
- Every subfolder has a committed `README.md`. Write it in the same response that creates the file.
- Never commit `*.csv`, `*.xlsx`, or `*.xls` here. Keep each tree's `.gitignore`.
- Layout and README fields: the `sf-data-change` skill (`.claude/skills/sf-data-change/SKILL.md`).
