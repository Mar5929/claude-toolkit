# First-time infrastructure setup (run ONCE, ever)

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

2. **Create the KV namespace.**
   ```
   npx wrangler kv namespace create OAUTH_KV
   ```
   It prints an `id`. Paste that id into `wrangler.jsonc` where it says
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
   - Put the Client ID into `wrangler.jsonc` where it says
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
   npx wrangler deploy
   ```
   Success looks like: it prints your live URL, e.g.
   `https://second-brain.<your-subdomain>.workers.dev`. Workers AI (the `ai`
   binding) needs no key; it is billed to your Cloudflare account.

6. **Record your origin.** That deployed URL is your `BRAIN_MCP_ORIGIN`. Every
   project's `.mcp.json`, settings, and connector use it. You are done with
   infrastructure forever; new projects only add a database and a grant.

## Verify

- Visit `https://second-brain.<your-subdomain>.workers.dev/mcp/none` in a browser.
  You should get an auth or "unknown project" response, not a crash. That proves
  the Worker is live and routing.
