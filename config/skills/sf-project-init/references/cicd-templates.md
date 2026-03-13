# CI/CD Templates Reference

GitHub Actions workflow templates for Salesforce DX projects. These templates are generated during `sf-project-init` scaffolding.

---

## sf-validate.yml — PR Validation

Runs on every pull request to `develop` or `main`. Validates the deployment against the target org and runs all Apex tests.

```yaml
name: Validate PR

on:
  pull_request:
    branches: [develop, main]
    paths:
      - 'force-app/**'
      - 'config/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Install Salesforce CLI
        uses: salesforcecli/setup-sf@v1

      - name: Authenticate to target org
        run: |
          echo "${{ secrets.SF_AUTH_URL }}" > authfile
          sf org login sfdx-url -f authfile -a target-org
          rm authfile

      - name: Validate deployment
        run: |
          sf project deploy validate \
            --target-org target-org \
            --source-dir force-app \
            --test-level RunLocalTests \
            --wait 30

      - name: Check test coverage
        run: |
          sf apex get test --target-org target-org --code-coverage --result-format json | \
          python3 -c "
          import json, sys
          data = json.load(sys.stdin)
          coverage = data.get('result', {}).get('summary', {}).get('orgWideCoverage', '0%')
          pct = float(coverage.replace('%', ''))
          print(f'Code coverage: {coverage}')
          if pct < 85:
              print(f'ERROR: Coverage {coverage} is below 85% threshold')
              sys.exit(1)
          "
```

**Secrets required:**
- `SF_AUTH_URL` — SFDX auth URL for the target org. Generate with: `sf org display --target-org MyOrg --verbose` → copy the "Sfdx Auth Url" value.

---

## sf-deploy.yml — Deploy to Target Org

Runs on merge to `develop` or `main`. Deploys source to the appropriate target org.

```yaml
name: Deploy

on:
  push:
    branches: [develop, main]
    paths:
      - 'force-app/**'
      - 'config/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ github.ref_name == 'main' && 'production' || 'sandbox' }}
    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Install Salesforce CLI
        uses: salesforcecli/setup-sf@v1

      - name: Authenticate to target org
        run: |
          if [ "${{ github.ref_name }}" = "main" ]; then
            echo "${{ secrets.SF_PROD_AUTH_URL }}" > authfile
          else
            echo "${{ secrets.SF_SANDBOX_AUTH_URL }}" > authfile
          fi
          sf org login sfdx-url -f authfile -a target-org
          rm authfile

      - name: Deploy source
        run: |
          sf project deploy start \
            --target-org target-org \
            --source-dir force-app \
            --test-level RunLocalTests \
            --wait 30

      - name: Post deployment summary
        if: always()
        run: |
          echo "## Deployment Summary" >> $GITHUB_STEP_SUMMARY
          echo "- **Branch:** ${{ github.ref_name }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Commit:** ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Status:** ${{ job.status }}" >> $GITHUB_STEP_SUMMARY
```

**Secrets required:**
- `SF_SANDBOX_AUTH_URL` — Auth URL for the sandbox org (used when deploying from `develop`)
- `SF_PROD_AUTH_URL` — Auth URL for the production org (used when deploying from `main`)

**Environment protection rules (recommended):**
- `production` environment: require manual approval, restrict to release managers
- `sandbox` environment: auto-deploy on merge to `develop`

---

## sf-scheduled-tests.yml — Nightly Test Run (Optional)

Runs all Apex tests nightly to catch regressions early.

```yaml
name: Nightly Tests

on:
  schedule:
    - cron: '0 6 * * 1-5'  # 6 AM UTC, weekdays
  workflow_dispatch:  # Allow manual trigger

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Install Salesforce CLI
        uses: salesforcecli/setup-sf@v1

      - name: Authenticate
        run: |
          echo "${{ secrets.SF_AUTH_URL }}" > authfile
          sf org login sfdx-url -f authfile -a target-org
          rm authfile

      - name: Run all tests
        run: |
          sf apex run test \
            --target-org target-org \
            --test-level RunLocalTests \
            --code-coverage \
            --result-format human \
            --wait 30
```

---

## linear-sync.yml — Daily Backlog Sync from Linear (Optional)

Syncs Linear project state to `docs/BACKLOG.md` daily. Linear is the source of truth — Linear state overwrites BACKLOG.md. Items in BACKLOG.md not found in Linear are flagged with `[NOT IN LINEAR]`.

```yaml
name: Linear Backlog Sync

on:
  schedule:
    - cron: '0 8 * * 1-5'  # 8 AM UTC, weekdays
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install @linear/sdk

      - name: Run Linear sync
        env:
          LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}
          LINEAR_TEAM_ID: ${{ secrets.LINEAR_TEAM_ID }}
          LINEAR_PROJECT_ID: ${{ secrets.LINEAR_PROJECT_ID }}
        run: node scripts/linear-sync.js

      - name: Check for changes
        id: changes
        run: |
          if git diff --quiet docs/BACKLOG.md; then
            echo "changed=false" >> $GITHUB_OUTPUT
          else
            echo "changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Create PR if changes
        if: steps.changes.outputs.changed == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          BRANCH="auto/linear-sync-$(date +%Y%m%d)"
          git checkout -b "$BRANCH"
          git add docs/BACKLOG.md
          git commit -m "chore: sync BACKLOG.md from Linear ($(date +%Y-%m-%d))"
          git push origin "$BRANCH"
          gh pr create \
            --title "chore: Linear backlog sync $(date +%Y-%m-%d)" \
            --body "Automated sync of BACKLOG.md from Linear project state. Review changes and merge." \
            --base develop
```

### linear-sync.js — Sync Script

```javascript
/**
 * Linear → BACKLOG.md Sync Script
 *
 * Fetches all issues from a Linear project and updates docs/BACKLOG.md.
 * Linear is the source of truth. Items in BACKLOG.md not in Linear are flagged.
 *
 * Required environment variables:
 *   LINEAR_API_KEY    — Personal API key with read access
 *   LINEAR_TEAM_ID    — Team identifier
 *   LINEAR_PROJECT_ID — Project identifier
 */

const { LinearClient } = require('@linear/sdk');
const fs = require('fs');
const path = require('path');

const BACKLOG_PATH = path.join(__dirname, '..', 'docs', 'BACKLOG.md');

async function main() {
  const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });

  // Fetch project
  const project = await client.project(process.env.LINEAR_PROJECT_ID);
  if (!project) {
    console.error('Project not found:', process.env.LINEAR_PROJECT_ID);
    process.exit(1);
  }

  // Fetch all issues in the project
  const issues = [];
  let hasMore = true;
  let cursor = undefined;

  while (hasMore) {
    const result = await project.issues({ first: 100, after: cursor });
    for (const issue of result.nodes) {
      const state = await issue.state;
      const assignee = await issue.assignee;
      const labels = await issue.labels();
      const milestone = await issue.projectMilestone;

      issues.push({
        identifier: issue.identifier,
        title: issue.title,
        priority: issue.priority,
        priorityLabel: issue.priorityLabel,
        status: state?.name || 'Unknown',
        assignee: assignee?.name || 'Unassigned',
        labels: labels.nodes.map(l => l.name),
        milestone: milestone?.name || 'No Milestone',
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
      });
    }
    hasMore = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  console.log(`Fetched ${issues.length} issues from Linear`);

  // Read existing BACKLOG.md
  let existingContent = '';
  if (fs.existsSync(BACKLOG_PATH)) {
    existingContent = fs.readFileSync(BACKLOG_PATH, 'utf-8');
  }

  // Extract existing BL-XXX IDs from BACKLOG.md
  const existingIds = new Set();
  const blPattern = /\|\s*(BL-\d+)\s*\|/g;
  let match;
  while ((match = blPattern.exec(existingContent)) !== null) {
    existingIds.add(match[1]);
  }

  // Build Linear ID set
  const linearIds = new Set(issues.map(i => i.identifier));

  // Flag items in BACKLOG.md not in Linear
  let updatedContent = existingContent;
  for (const id of existingIds) {
    if (!linearIds.has(id)) {
      const flagPattern = new RegExp(`(\\|\\s*${id}\\s*\\|)`, 'g');
      updatedContent = updatedContent.replace(flagPattern, `| ${id} [NOT IN LINEAR] |`);
    }
  }

  // Group issues by milestone
  const byMilestone = {};
  for (const issue of issues) {
    if (!byMilestone[issue.milestone]) {
      byMilestone[issue.milestone] = [];
    }
    byMilestone[issue.milestone].push(issue);
  }

  // Generate sync summary
  const summaryLines = [
    '',
    '---',
    '',
    `## Linear Sync Summary (${new Date().toISOString().split('T')[0]})`,
    '',
    `**Project:** ${project.name}`,
    `**Issues:** ${issues.length}`,
    '',
    '| Identifier | Title | Priority | Status | Assignee | Milestone |',
    '|---|---|---|---|---|---|',
  ];

  // Sort by priority (1=urgent, 4=low, 0=none)
  issues.sort((a, b) => (a.priority || 5) - (b.priority || 5));

  for (const issue of issues) {
    summaryLines.push(
      `| ${issue.identifier} | ${issue.title} | ${issue.priorityLabel} | ${issue.status} | ${issue.assignee} | ${issue.milestone} |`
    );
  }

  // Append or update sync summary in BACKLOG.md
  const syncHeader = '## Linear Sync Summary';
  if (updatedContent.includes(syncHeader)) {
    // Replace existing sync summary
    const syncStart = updatedContent.indexOf(syncHeader);
    const nextSection = updatedContent.indexOf('\n## ', syncStart + syncHeader.length);
    if (nextSection > -1) {
      updatedContent = updatedContent.substring(0, syncStart) + summaryLines.join('\n') + '\n' + updatedContent.substring(nextSection);
    } else {
      updatedContent = updatedContent.substring(0, syncStart) + summaryLines.join('\n') + '\n';
    }
  } else {
    updatedContent += '\n' + summaryLines.join('\n') + '\n';
  }

  fs.writeFileSync(BACKLOG_PATH, updatedContent, 'utf-8');
  console.log('BACKLOG.md updated successfully');

  // Log change summary
  const newIssues = issues.filter(i => !existingIds.has(i.identifier));
  const removedIds = [...existingIds].filter(id => !linearIds.has(id));

  if (newIssues.length > 0) {
    console.log(`New issues from Linear: ${newIssues.map(i => i.identifier).join(', ')}`);
  }
  if (removedIds.length > 0) {
    console.log(`Items flagged [NOT IN LINEAR]: ${removedIds.join(', ')}`);
  }
  if (newIssues.length === 0 && removedIds.length === 0) {
    console.log('No structural changes detected');
  }
}

main().catch(err => {
  console.error('Linear sync failed:', err.message);
  process.exit(1);
});
```

**Secrets required:**
- `LINEAR_API_KEY` — Personal API key with read access. Generate at: Linear → Settings → API → Personal API keys
- `LINEAR_TEAM_ID` — Team identifier (e.g., `dfe15bc4-6dd0-4bde-8609-6620efc3140d`)
- `LINEAR_PROJECT_ID` — Project identifier. Find via Linear MCP or the project URL

**Sync behavior:**
- Linear is the **source of truth** — Linear state overwrites BACKLOG.md sync summary
- Items in BACKLOG.md not found in Linear are flagged with `[NOT IN LINEAR]` for review
- One-way sync avoids merge conflicts
- Creates a PR for review rather than committing directly

---

## Setup Instructions

Include these instructions in the project README when CI/CD is enabled:

### 1. Generate Auth URL

```bash
# Authenticate to your org first
sf org login web -a MyOrg

# Get the auth URL
sf org display --target-org MyOrg --verbose
# Copy the "Sfdx Auth Url" value
```

### 2. Add GitHub Secrets

In your GitHub repo: Settings → Secrets and variables → Actions → New repository secret

- `SF_AUTH_URL` — for PR validation (typically the dev/QA sandbox)
- `SF_SANDBOX_AUTH_URL` — for sandbox deployments
- `SF_PROD_AUTH_URL` — for production deployments

### 3. Configure Environments (Optional)

In your GitHub repo: Settings → Environments

- Create `sandbox` environment (auto-deploy)
- Create `production` environment (require approval, add required reviewers)

### 4. Branch Protection Rules

In your GitHub repo: Settings → Branches → Add rule

- `develop` branch:
  - Require pull request reviews (1+ reviewer)
  - Require status checks to pass (Validate PR workflow)
  - Require branches to be up to date

- `main` branch:
  - Require pull request reviews (2+ reviewers)
  - Require status checks to pass
  - Require branches to be up to date
  - Restrict who can push (release managers only)
