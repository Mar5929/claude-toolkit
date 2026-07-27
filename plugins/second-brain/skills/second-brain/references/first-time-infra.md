# First-time infrastructure setup (run ONCE, ever)

> **Do not create or deploy this infrastructure.** This is a retained v1
> reference. Unit 00 allows only a separately approved synchronization and
> containment deployment of the already existing Worker. Follow
> `v1-freeze-and-export.md`.

This stands up the ONE shared Worker that serves every project. You do this a
single time per person/account. After it exists, every new project skips this
file entirely and uses the per-project recipe (`setup-recipe.md`).

> **For Mike: this is already done.** The shared Worker is live at
> `https://second-brain.rihm.workers.dev`. Do NOT redo it. Go straight to
> `setup-recipe.md` for a new project. This file is here so a brand-new adopter
> (or a rebuild) has the full record.

## What you are creating

- A Cloudflare Worker named `second-brain` (the MCP server).
- A Cloudflare KV namespace `OAUTH_KV` (stores OAuth state).
- A GitHub OAuth app (sign-in identity for every project).
- Workers AI enabled (embeddings for recall; no API key).

## Prerequisites

- Node.js and npm installed.
- A Cloudflare account (free tier is fine to start).
- A GitHub account.
- `npx wrangler login` completed (opens a browser; authorizes wrangler to your
  Cloudflare account). Wrangler is Cloudflare's command-line tool for Workers.

## Steps

1. **Get the server code.** Copy this skill's `references/server/` directory to a
   working folder you control, then install dependencies:
   ```
   cd <your-working-folder>/server
   npm install
   ```
   Success looks like: `node_modules/` appears, no error.

   Then make your **local deploy config** from the committed template:
   ```
   cp wrangler.jsonc wrangler.local.jsonc
   ```
   You fill its two placeholder values in the next steps. It is gitignored, so
   your real (non-secret) KV id and GitHub client id never get committed to the
   (public) toolkit repo - the committed `wrangler.jsonc` stays a clean template.
   **Every deploy below uses `-c wrangler.local.jsonc`.**

2. **Create the KV namespace.**
   ```
   npx wrangler kv namespace create OAUTH_KV
   ```
   It prints an `id`. Paste that id into `wrangler.local.jsonc` where it says
   `"<OAUTH_KV_NAMESPACE_ID>"`.

3. **Create the GitHub OAuth app.** On GitHub: Settings > Developer settings >
   OAuth Apps > New OAuth App.
   - Application name: anything (e.g. `second-brain`).
   - Homepage URL: `https://second-brain.<your-cloudflare-subdomain>.workers.dev`
     (you will know the exact subdomain after the first deploy; you can edit this
     later).
   - Authorization callback URL: your Worker's OAuth callback. Check the exact path
     in `server/src/github-handler.ts`; then set it to
     `https://second-brain.<your-subdomain>.workers.dev/<that-path>`.
   - Register, then copy the **Client ID** and generate a **Client secret**.

4. **Wire the OAuth credentials.**
   - Put the Client ID into `wrangler.local.jsonc` where it says
     `"<GITHUB_OAUTH_CLIENT_ID>"` (not a secret).
   - Set the client secret as a real secret:
     ```
     npx wrangler secret put GITHUB_CLIENT_SECRET
     ```
     Paste the value when prompted. (Setting secrets from the Cloudflare dashboard
     is the reliable path; a chat-run `wrangler secret put` cannot prompt and has
     saved empty values.)

5. **Deploy.**
   ```
   npx wrangler deploy -c wrangler.local.jsonc
   ```
   Success looks like: it prints your live URL, e.g.
   `https://second-brain.<your-subdomain>.workers.dev`. Workers AI (the `ai`
   binding) needs no key; it is billed to your Cloudflare account. (Deploying the
   committed `wrangler.jsonc` by mistake fails with `KV namespace
   '<OAUTH_KV_NAMESPACE_ID>' is not valid` - that just means you deployed the
   placeholder template instead of `-c wrangler.local.jsonc`.)

6. **Record your origin.** That deployed URL is your `BRAIN_MCP_ORIGIN`. Every
   project's `.mcp.json`, settings, and connector use it. You are done with
   infrastructure forever; new projects only add a database and a grant.

## Verify

- Visit `https://second-brain.<your-subdomain>.workers.dev/mcp/none` in a browser.
  You should get an auth or "unknown project" response, not a crash. That proves
  the Worker is live and routing.

## Redeploying the Worker (after a server code change)

The Worker is deployed ONCE at setup, but you redeploy it whenever the shared
server code changes (e.g. a recall or curation improvement lands in the toolkit).
This is the ONLY time an existing install redeploys - new *projects* never do.

```
cd <your server folder>                    # references/server (or your working copy)
git pull                                    # get the latest server code, if from a clone
npm install
npx wrangler deploy -c wrangler.local.jsonc
```

Notes:
- Use `-c wrangler.local.jsonc` (your filled-in config), NOT the committed
  placeholder template - same reason as the first deploy.
- **Secrets** (`DATABASE_URL_*`, `GITHUB_CLIENT_SECRET`, `ANTHROPIC_API_KEY`) live
  on the Worker and are preserved across deploys; a deploy never touches them.
- **One deploy updates every project at once** - there is a single shared Worker.
- **A gotcha when you verify:** an ALREADY-OPEN MCP session (e.g. the Claude
  session you deployed from) keeps talking to its pre-deploy Worker instance, so
  it can still show the OLD behavior. A FRESH session, a cloud session, and the
  token fast-path the hooks use all pick up the new code immediately. To confirm
  a deploy landed, hit the fast path directly rather than trusting the session
  you deployed from:
  ```
  curl -s -H "Authorization: Bearer $BRAIN_MCP_TOKEN" \
    "https://second-brain.<subdomain>.workers.dev/fast/<project>/recall?q=test&limit=1"
  ```
