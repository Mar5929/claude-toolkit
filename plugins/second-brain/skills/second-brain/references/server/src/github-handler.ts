import { autoCurateDisabledReason, curateSession } from "./curate";
import {
  blockedWriteHttpResponse,
  legacyAdvisoryText,
  v1WritesAreReadOnly,
} from "./containment";
import { appendJournal, bodySnippet, capRecall, db, getDigest, getGrant, loginForToken, recallNodes, upsertNode } from "./db";
import { embedText } from "./embed";
import type { AuthRequest, Env } from "./types";

// Default (non-MCP) handler. Serves:
//   /authorize  - start of the OAuth flow: bounce the user to GitHub
//   /callback   - GitHub redirects back here; we finish the OAuth grant
//   /fast/...   - bearer-token fast path for local hooks (no browser)
export const GitHubHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize") return authorize(request, env);
    if (url.pathname === "/callback") return callback(request, env);
    if (url.pathname.startsWith("/fast/")) return fastPath(request, env, url, ctx);
    if (url.pathname === "/") {
      return new Response(
        "second-brain v1 legacy/advisory server. Writes are contained read-only.",
        {
          headers: { "content-type": "text/plain" },
        },
      );
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
//   POST /fast/<project>/journal   (blocked during Unit 00 containment)
//   POST /fast/<project>/curate    (blocked during Unit 00 containment)
//   POST /fast/<project>/node      (blocked during Unit 00 containment)
//
// `node` exists because `/mcp/<id>` is OAuth-only, so a headless surface (a
// background job, a cron fire, a cloud session whose MCP connection dropped) has
// no way to persist a finished curated note. Without it the curator does the
// whole job and the note is thrown away. See references/curator-write-path.md.
const MAX_JOURNAL_BODY = 64 * 1024;
const MAX_NODE_BODY = 256 * 1024;
const NODE_TYPES = new Set([
  "decision", "knowledge", "preference", "rule", "session", "entity", "question", "blocker", "work-item",
]);
// A node arriving here was written by a curator that could not read the graph
// first, so it may duplicate or contradict what is already stored. Default it
// due for review a week out; the next curator pass reconciles it. A caller that
// DID dedupe can pass its own review_after (or "" to clear).
const FALLBACK_REVIEW_DAYS = 7;

async function fastPath(request: Request, env: Env, url: URL, ctx: ExecutionContext): Promise<Response> {
  const match = url.pathname.match(/^\/fast\/([a-z0-9-]+)\/(digest|recall|journal|curate|node)$/);
  if (!match) return new Response("Not found", { status: 404 });
  const [, projectId, action] = match;

  // Fail closed before authentication or body parsing. These route names are
  // write-only, and Unit 00 requires one unambiguous response from every write
  // surface while v1 is contained. No database or model call can occur first.
  if (
    (action === "journal" || action === "curate" || action === "node") &&
    v1WritesAreReadOnly(env)
  ) {
    return blockedWriteHttpResponse();
  }

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
    return new Response(legacyAdvisoryText(digest ?? ""), {
      headers: { "content-type": "text/markdown" },
    });
  }

  if (action === "recall") {
    const query = url.searchParams.get("q");
    if (!query) return new Response("Missing q parameter", { status: 400 });
    const n = Math.floor(Number(url.searchParams.get("limit")));
    const limit = Number.isFinite(n) && n >= 1 ? Math.min(n, 25) : 5;
    const nodes = await recallNodes(
      sql, projectId, query, limit, null, !v1WritesAreReadOnly(env),
    );  // keyword-only fast path
    // Pointer-first: id + title + status + a short snippet, never full bodies.
    // This feeds the per-prompt injection hook, so it must stay cheap.
    const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const text = nodes
      .map((n) => `<match id="${n.id}" title="${esc(n.title)}" status="${n.status}">\n${bodySnippet(n.markdown)}\n</match>`)
      .join("\n");
    return new Response(legacyAdvisoryText(capRecall(text)), {
      headers: { "content-type": "text/markdown" },
    });
  }

  // action === "curate": the SessionEnd hook telling us a chat session is over,
  // so curate exactly that session's undrained entries. Returns 202 immediately
  // and does the model call in waitUntil: the caller is a hook on a session that
  // is already closing, and it must never wait on us.
  if (action === "curate") {
    if (request.method !== "POST") return new Response("Use POST", { status: 405 });
    if (role !== "write" && role !== "admin") {
      return new Response("Forbidden: curation requires write access", { status: 403 });
    }
    let session = "";
    try {
      const parsed = JSON.parse((await request.text()).slice(0, 4096)) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        const s = (parsed as { session?: unknown }).session;
        if (typeof s === "string") session = s.slice(0, 200);
      }
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    const off = autoCurateDisabledReason(env);
    if (off) {
      return Response.json({
        outcome: "skipped",
        reason: "auto_curate_disabled",
        detail: off,
        next_action: "leave curation disabled or restore it through a separate reviewed change",
      }, {
        status: 409,
        headers: { "cache-control": "no-store" },
      });
    }
    ctx.waitUntil((async () => {
      try {
        const r = await curateSession(env, sql, projectId, session);
        console.log(JSON.stringify({
          event: "auto_curate_session_end_result",
          project: projectId,
          session,
          read: r.read,
          drained: r.drained,
          nodes_written: r.nodes_written,
          digest_updated: r.digest_updated,
          skipped: r.skipped,
          error: r.error,
        }));
      } catch (e) {
        console.error(JSON.stringify({
          event: "auto_curate_session_end_failed",
          project: projectId,
          error: (e as Error).message,
        }));
      }
    })());
    return new Response("accepted", { status: 202 });
  }

  // action === "node": persist ONE finished node without OAuth. Same write path
  // as the MCP `upsert_node` tool (history snapshot, edge validation, review
  // cascade all included), reached with a bearer token so a headless surface can
  // land a curated note instead of losing it.
  if (action === "node") {
    if (request.method !== "POST") return new Response("Use POST", { status: 405 });
    if (role !== "write" && role !== "admin") {
      return new Response("Forbidden: node upsert requires write access", { status: 403 });
    }
    const ct = request.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return new Response("Expected application/json", { status: 415 });
    const declared = Number(request.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > MAX_NODE_BODY) return new Response("Body too large", { status: 413 });
    let raw_body: string;
    try {
      raw_body = await request.text();
    } catch {
      return new Response("Could not read body", { status: 400 });
    }
    if (new TextEncoder().encode(raw_body).length > MAX_NODE_BODY) return new Response("Body too large", { status: 413 });
    let input: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw_body) as unknown;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return new Response("Body must be a JSON object", { status: 400 });
      }
      input = parsed as Record<string, unknown>;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    // Validate the same shape the MCP tool's zod schema enforces. This path has
    // no schema layer in front of it, so a malformed node must be rejected here
    // rather than written half-formed.
    const str = (k: string) => (typeof input[k] === "string" ? (input[k] as string).trim() : "");
    const id = str("id"), path = str("path"), type = str("type"), title = str("title");
    const markdown = typeof input.markdown === "string" ? input.markdown : "";
    const missing = ["id", "path", "type", "title", "markdown"].filter((k) => !(k === "markdown" ? markdown : str(k)));
    if (missing.length) return new Response(`Missing required field(s): ${missing.join(", ")}`, { status: 400 });
    if (!NODE_TYPES.has(type)) {
      return new Response(`Unknown node type '${type}' (expected one of: ${[...NODE_TYPES].join(", ")})`, { status: 400 });
    }
    if (!markdown.startsWith("---")) {
      return new Response("markdown must be the FULL node file, starting with a --- frontmatter block", { status: 400 });
    }
    let edges: { to: string; rel: string }[] | undefined;
    if (input.edges !== undefined) {
      if (!Array.isArray(input.edges)) return new Response("edges must be an array", { status: 400 });
      edges = [];
      for (const e of input.edges) {
        const to = typeof (e as { to?: unknown })?.to === "string" ? (e as { to: string }).to.trim() : "";
        const rel = typeof (e as { rel?: unknown })?.rel === "string" ? (e as { rel: string }).rel.trim() : "";
        if (!to || !rel) return new Response("each edge needs a non-empty 'to' and 'rel'", { status: 400 });
        edges.push({ to, rel });
      }
    }
    const review_after = typeof input.review_after === "string"
      ? input.review_after
      : new Date(Date.now() + FALLBACK_REVIEW_DAYS * 86400_000).toISOString();

    try {
      const vec = await embedText(env, `${title}\n\n${markdown}`);
      const result = await upsertNode(sql, projectId, login, {
        id, path, type, title, markdown, review_after, edges,
        status: typeof input.status === "string" ? input.status : undefined,
        frontmatter: typeof input.frontmatter === "object" && input.frontmatter !== null && !Array.isArray(input.frontmatter)
          ? (input.frontmatter as Record<string, unknown>)
          : undefined,
        pinned: typeof input.pinned === "boolean" ? input.pinned : undefined,
      }, vec);
      return new Response(JSON.stringify({ ok: true, ...result }), {
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      // A missing critical edge endpoint throws here (upsertNode never silently
      // drops a corrects/supersedes edge). 422 so the caller keeps its copy and
      // retries with the referenced node created first.
      return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
        status: 422, headers: { "content-type": "application/json" },
      });
    }
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
