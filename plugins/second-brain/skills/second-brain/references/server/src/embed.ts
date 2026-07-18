import type { Env } from "./types";

// Workers AI text-embedding model. bge-m3 dense embeddings are 1024-dim, which
// matches the nodes.embedding vector(1024) column. bge-m3 is multi-function;
// only the { text } input path returns { shape, data } — do NOT reuse this
// access path for the { query, contexts } rerank path (that returns { response }).
const EMBED_MODEL = "@cf/baai/bge-m3";
export const EMBED_DIM = 1024;

interface EmbeddingResponse {
  shape: number[];
  data: number[][];
}

// Embed one string. Best-effort: returns null on ANY failure (run() throws on
// error and on over-long input, so it's wrapped) so recall and writes degrade
// to keyword-only instead of erroring. Input is clipped defensively; bge-m3's
// context window is large (60k tokens) but truncate_inputs defaults to false,
// so an over-long string would otherwise throw.
export async function embedText(env: Env, text: string): Promise<number[] | null> {
  const clipped = text.length > 8000 ? text.slice(0, 8000) : text;
  if (clipped.trim().length === 0) return null;
  try {
    const res = (await env.AI.run(EMBED_MODEL, { text: clipped })) as EmbeddingResponse;
    const vec = res?.data?.[0];
    // Assert the dimension at runtime: Cloudflare's model page doesn't print
    // 1024, so fail closed (keyword-only) rather than write a wrong-width vector.
    if (!Array.isArray(vec) || vec.length !== EMBED_DIM) return null;
    return vec;
  } catch {
    return null;
  }
}

// pgvector text literal, e.g. "[0.1,0.2,...]". Bind this STRING as a parameter
// and cast `::vector(1024)` in SQL. A raw JS number[] would be serialized as a
// Postgres array literal ({0.1,0.2}) which pgvector's input parser rejects.
export function toVector(vec: number[]): string {
  return "[" + vec.join(",") + "]";
}
