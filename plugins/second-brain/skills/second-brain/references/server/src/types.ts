export interface Env {
  GITHUB_CLIENT_ID: string;      // var
  GITHUB_CLIENT_SECRET: string;  // secret
  OAUTH_KV: KVNamespace;
  // Workers AI binding (wrangler.jsonc: "ai": { "binding": "AI" }). Used for
  // node/query embeddings via @cf/baai/bge-m3 (1024-dim). No API key needed:
  // it runs on the same Cloudflare account, so cloud sessions can embed too.
  AI: Ai;
  // WI-002 Phase 4 auto-curation. ANTHROPIC_API_KEY is a secret set from the
  // Cloudflare dashboard (never via chat-run wrangler); until it exists the
  // cron is a silent no-op. CURATOR_MODEL overrides the default
  // claude-haiku-4-5; AUTO_CURATE="0" is the kill switch.
  ANTHROPIC_API_KEY?: string;
  CURATOR_MODEL?: string;
  AUTO_CURATE?: string;
  // One Neon database per project. Each connection string is its own secret,
  // named DATABASE_URL_<project id, uppercased, '-' replaced by '_'>.
  // Example: project 'dragonfly' reads DATABASE_URL_DRAGONFLY.
  [key: `DATABASE_URL_${string}`]: string | undefined;
  // Injected by @cloudflare/workers-oauth-provider into the default handler.
  OAUTH_PROVIDER: {
    parseAuthRequest(request: Request): Promise<AuthRequest>;
    lookupClient(clientId: string): Promise<unknown>;
    completeAuthorization(options: {
      request: AuthRequest;
      userId: string;
      metadata?: Record<string, unknown>;
      scope: string[];
      props: Record<string, unknown>;
    }): Promise<{ redirectTo: string }>;
  };
}

export interface AuthRequest {
  responseType: string;
  clientId: string;
  redirectUri: string;
  scope: string[];
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

// Props attached to every OAuth grant at authorization time; the provider
// hands them back on each authorized API request via ctx.props.
export interface UserProps extends Record<string, unknown> {
  login: string;  // GitHub login, the identity grants are keyed on
  name: string;
}
