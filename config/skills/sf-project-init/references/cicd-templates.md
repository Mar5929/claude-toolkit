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
