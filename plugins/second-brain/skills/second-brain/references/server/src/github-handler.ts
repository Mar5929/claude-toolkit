import { appendJournal, db, getDigest, getGrant, loginForToken, recallNodes } from "./db";
import type { AuthRequest, Env } from "./types";

// Default (non-MCP) handler. Serves:
//   /authorize  - start of the OAuth flow: bounce the user to GitHub
//   /callback   - GitHub redirects back here; we finish the OAuth grant
//   /fast/...   - bearer-token fast path for local hooks (no browser)
export const GitHubHandler = {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize") return authorize(request, env);
    if (url.pathname === "/callback") return callback(request, env);
    if (url.pathname.startsWith("/fast/")) return fastPath(request, env, url);
    if (url.pathname === "/") {
      return new Response("second-brain MCP server. Connect via /mcp/<project-id>.", {
        headers: { "content-type": "text/plain" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};

// Parse the MCP client's OAuth request, then send the user to GitHub to prove
// who they are. The original request rides along in `state`; it holds nothing
// secret and completeAuthorization re-validates it against the registered client.
async function authorize(request: Request, env: Env): Promise<Response> {
  const oauthReqInfo = await env.OAUTH_PROVIDER.parseAuthRequest(request);
  const redirectUri = new URL("/callback", request.url).href;
  const gh = new URL("https://github.com/login/oauth/authorize");
  gh.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  gh.searchParams.set("redirect_uri", redirectUri);
  gh.searchParams.set("scope", "read:user");
  gh.searchParams.set("state", b64urlEncode(JSON.stringify(oauthReqInfo)));
  return Response.redirect(gh.href, 302);
}

async function callback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return new Response("Missing code or state", { status: 400 });

  let oauthReqInfo: AuthRequest;
  try {
    oauthReqInfo = JSON.parse(b64urlDecode(state));
  } catch {
    return new Response("Bad state", { status: 400 });
  }

  // Exchange the GitHub code for a GitHub access token.
  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: new URL("/callback", request.url).href,
    }),
  });
  const tokenJson = (await tokenResp.json()) as { access_token?: string };
  if (!tokenJson.access_token) return new Response("GitHub token exchange failed", { status: 502 });

  // Ask GitHub who this is. We keep only login + name; the GitHub token is dropped.
  const userResp = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${tokenJson.access_token}`,
      accept: "application/vnd.github+json",
      "user-agent": "second-brain-mcp",
    },
  });
  if (!userResp.ok) return new Response("GitHub user lookup failed", { status: 502 });
  const user = (await userResp.json()) as { login: string; name: string | null };

  // Anyone with a GitHub account can finish sign-in; per-project access is
  // still enforced by the grants table on every MCP request.
  const { redirectTo } = await env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: user.login,
    metadata: { via: "github" },
    scope: [],
    props: { login: user.login, name: user.name ?? user.login },
  });
  return Response.redirect(redirectTo, 302);
}

// Local fast path: bash/node hooks call these with a minted bearer token so the
// digest injects and the turn journals without a browser sign-in.
//   GET  /fast/<project>/digest
//   GET  /fast/<project>/recall?q=<query>&limit=<n>   (keyword-only; snappy)
//   POST /fast/<project>/journal   (JSON turn entry; write role required)
const MAX_JOURNAL_BODY = 64 * 1024;

async function fastPath(request: Request, env: Env, url: URL): Promise<Response> {
  const match = url.pathname.match(/^\/fast\/([a-z0-9-]+)\/(digest|recall|journal)$/);
  if (!match) return new Response("Not found", { status: 404 });
  const [, projectId, action] = match;

  const auth = request.headers.get("authorization") ?? "";
  const raw = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!raw) return new Response("Missing bearer token", { status: 401 });

  const sql = db(env, projectId);
  if (!sql) return new Response(`Unknown project '${projectId}' (no database registered)`, { status: 404 });
  const login = await loginForToken(sql, raw);
  if (!login) return new Response("Invalid or revoked token", { status: 401 });
  const role = await getGrant(sql, login, projectId);
  if (!role) return new Response(`No access to project '${projectId}'`, { status: 403 });

  if (action === "digest") {
    const digest = await getDigest(sql, projectId);
    return new Response(digest ?? "", { headers: { "content-type": "text/markdown" } });
  }

  if (action === "recall") {
    const query = url.searchParams.get("q");
    if (!query) return new Response("Missing q parameter", { status: 400 });
    const n = Math.floor(Number(url.searchParams.get("limit")));
    const limit = Number.isFinite(n) && n >= 1 ? Math.min(n, 25) : 5;
    const nodes = await recallNodes(sql, projectId, query, limit);  // keyword-only fast path
    const text = nodes.map((n) => `<node id="${n.id}" path="${n.path}" status="${n.status}">\n${n.markdown}\n</node>`).join("\n\n");
    return new Response(text, { headers: { "content-type": "text/markdown" } });
  }

  // action === "journal": append a raw turn record. Write-gated + hardened:
  // a read-only token gets 403; oversized/non-JSON/array bodies are rejected.
  if (request.method !== "POST") return new Response("Use POST", { status: 405 });
  if (role !== "write" && role !== "admin") {
    return new Response("Forbidden: journal append requires write access", { status: 403 });
  }
  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return new Response("Expected application/json", { status: 415 });
  // Reject oversized bodies before buffering when Content-Length is present.
  const declared = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_JOURNAL_BODY) return new Response("Body too large", { status: 413 });
  let body: string;
  try {
    body = await request.text();
  } catch {
    return new Response("Could not read body", { status: 400 });
  }
  // Byte-accurate backstop (Content-Length may be absent on chunked bodies).
  if (new TextEncoder().encode(body).length > MAX_JOURNAL_BODY) return new Response("Body too large", { status: 413 });
  let entry: unknown;
  try {
    entry = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    return new Response("Entry must be a JSON object", { status: 400 });
  }
  await appendJournal(sql, projectId, entry as Record<string, unknown>, "local");
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
}

function b64urlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): string {
  return atob(value.replace(/-/g, "+").replace(/_/g, "/"));
}
