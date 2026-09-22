// Offline tests of the protocol engine: no model, no files, no network.
// Run with: CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test <plugin dir>
import { test, expect } from 'claude-code/testing'

const ROOT = '/project'
const DEFAULTS = JSON.stringify({
  format: 1,
  protocols: [
    {
      name: 'knowledge-save-before-memory-write',
      owner: { skill: 'knowledge-save' },
      appliesIf: { exists: 'knowledge/knowledge-manual.md' },
      on: { tool: { files: ['knowledge/memory-inbox.md', 'knowledge/memory/'], shellQuestion: 'Q1' } },
      require: ['owner-opened-this-turn'],
      tell: 'Open knowledge-save first.',
    },
  ],
})

// The world beneath the plugin: files, session, model and the tools.
function world(on: any, judge: string) {
  on('session.id', () => ({ value: 'test-session' }))
  on('session.root', () => ({ value: ROOT }))
  on('fs.exists', ($: any, e: any) => ({ value: e.path === `${ROOT}/knowledge/knowledge-manual.md` }))
  on('fs.read', ($: any, e: any) => (e.path.endsWith('/protocols.default.json') ? { value: DEFAULTS } : { deny: 'ENOENT' }))
  on('fs.write', () => ({ value: undefined }))
  on('clock.now', () => ({ value: 1 }))
  on('env.get', () => ({ value: undefined }))
  on('model.complete', () => ({ value: { isAnswered: true, text: judge, usage: {} } }))
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('tool.call', ($: any, e: any) => ({ result: { ok: true } }))
  on('skill.prompt', ($: any, e: any) => ({ text: 'skill text' }))
}

test('an inbox edit is refused until knowledge-save is opened', async ($, on) => {
  world(on, '{"yes": []}')
  await $.turn.start({ text: 'save it', turnId: 't1' } as any)
  const refused: any = await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/knowledge/memory-inbox.md`, old_string: 'a', new_string: 'b' } as any)
  expect(refused.deny).toBeDefined()
  await $.tool.call({ tool: 'Skill', skill: 'second-brain:knowledge-save' } as any)
  const allowed: any = await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/knowledge/memory-inbox.md`, old_string: 'a', new_string: 'b' } as any)
  expect(allowed.deny).toBeUndefined()
})

test('an edit elsewhere is never refused', async ($, on) => {
  world(on, '{"yes": []}')
  await $.turn.start({ text: 'x', turnId: 't2' } as any)
  const r: any = await $.tool.call({ tool: 'Edit', file_path: `${ROOT}/src/app.ts`, old_string: 'a', new_string: 'b' } as any)
  expect(r.deny).toBeUndefined()
})

test('a shell command the judge says changes memory is refused', async ($, on) => {
  world(on, '{"yes": [1]}')
  await $.turn.start({ text: 'x', turnId: 't3' } as any)
  const r: any = await $.tool.call({ tool: 'Bash', command: 'some command' } as any)
  expect(r.deny).toBeDefined()
})

test('a shell command is refused when the judge is unavailable', async ($, on) => {
  world(on, 'not json')
  await $.turn.start({ text: 'x', turnId: 't4' } as any)
  const r: any = await $.tool.call({ tool: 'Bash', command: 'some command' } as any)
  expect(r.deny).toBeDefined()
})
