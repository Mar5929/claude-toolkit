// The rules for a valid `.toolkit-memory.json` (issue #404). They are the same
// rules as second-brain's readMemoryConfig
// (plugins/second-brain/hooks/knowledge-manual.mjs). protocol-guard ships
// without second-brain, so it keeps its own copy.
// tests/knowledge-schema.test.mjs checks that every reader agrees.

export const MEMORY_SERVICES = ['mem0', 'hindsight']

const line = (v) => typeof v === 'string' && v.trim() !== '' && !/[\r\n]/.test(v)

// "files" or "external" for a valid config; undefined for an invalid one.
export function validMemory(c) {
  if (c === null || typeof c !== 'object' || Array.isArray(c)) return undefined
  if (c.format !== 1) return undefined
  if (c.memory === 'files') return 'files'
  if (c.memory !== 'external') return undefined
  if (!MEMORY_SERVICES.includes(c.service)) return undefined
  if (!line(c.server) || !/^[A-Za-z0-9_-]+$/.test(c.server)) return undefined
  if (!line(c.project)) return undefined
  return 'external'
}
