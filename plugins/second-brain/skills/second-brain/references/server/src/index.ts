import { OAuthProvider } from "@cloudflare/workers-oauth-provider";
import { createMcpHandler } from "agents/mcp";
import { db, getGrant } from "./db";
import { GitHubHandler } from "./github-handler";
import { buildMemoryServer } from "./mcp";
import type { Env, UserProps } from "./types";

// MCP endpoint: /mcp/<project-id>. The OAuth provider has already verified
// the access token by the time this runs; ctx.props carries the GitHub
// identity captured at sign-in. Per-project access is checked here on every
// request, so revoking a grant takes effect immediately.
const apiHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/mcp\/([a-z0-9-]+)$/);
    if (!match) {
      return new Response("Use /mcp/<project-id>, e.g. /mcp/dragonfly", { status: 404 });
    }
    const projectId = match[1];

    const props = (ctx as ExecutionContext & { props?: UserProps }).props;
    if (!props?.login) return new Response("Unauthorized", { status: 401 });

    const sql = db(env, projectId);
    if (!sql) {
      return new Response(`Unknown project '${projectId}' (no database registered)`, { status: 404 });
    }

    const role = await getGrant(sql, props.login, projectId);
    if (!role) {
      return new Response(`'${props.login}' has no access to project '${projectId}'`, { status: 403 });
    }

    const server = buildMemoryServer(env, sql, projectId, props.login, role);
    // createMcpHandler only answers on its configured route (default "/mcp"),
    // so point it at the per-project path this request came in on.
    return createMcpHandler(server, { route: `/mcp/${projectId}` })(request, env, ctx);
  },
};

export default new OAuthProvider({
  apiRoute: "/mcp/",
  apiHandler,
  defaultHandler: GitHubHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
