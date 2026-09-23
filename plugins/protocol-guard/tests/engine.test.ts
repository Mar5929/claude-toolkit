// Offline tests of the protocol-guard engine: no model, no files, no network.
// Run: CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 claude plugin test plugins/protocol-guard
//
// Each test uses its own session id, because module memory lasts across tests.
import { test, expect } from 'claude-code/testing'
import DEFAULTS from './defaults.fixture.mjs'

const ROOT = '/project'
const MANUAL = `${ROOT}/knowledge/knowledge-manual.md`
const INBOX = `${ROOT}/knowledge/memory-inbox.md`
const CURRENT = `${ROOT}/knowledge/memory/current.md`
const BUILD_AND_CHECK = 'node .claude/tools/build-knowledge-index.mjs && node .claude/tools/check-knowledge.mjs'

type World = {
  session: string
  exists?: string[]
  files?: Record<string, string>
  agents?: { id: string; status: string }[]
  failCwd?: boolean
  failAgents?: boolean
  stops?: any[]
  prompts?: any[]
}

// The world beneath the plugin: session, files, tools, model steps.
function world(on: any, w: World) {
  const exists = new Set(w.exists ?? [MANUAL])
  on('session.id', () => ({ value: w.session }))
  on('session.root', () => ({ value: ROOT }))
  on('session.cwd', () => (w.failCwd === true ? { deny: 'cwd unavailable' } : { value: ROOT }))
  on('fs.exists', ($: any, e: any) => ({ value: exists.has(e.path) }))
  on('fs.read', ($: any, e: any) => {
    if (String(e.path).endsWith('/protocols.default.json')) return { value: JSON.stringify(DEFAULTS) }
    const text = w.files?.[e.path]
    return text === undefined ? { deny: 'ENOENT' } : { value: text }
  })
  on('agent.list', () => (w.failAgents === true ? { deny: 'agent list unavailable' } : { value: w.agents ?? [] }))
  on('ui.log', () => ({ value: undefined }))
  on('session.start', ($: any, e: any) => ({ cwd: e.cwd }))
  on('session.end', ($: any, e: any) => ({ sessionId: e.sessionId }))
  on('session.compact', ($: any, e: any) => ({ messages: e.messages }))
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: 'the answer' }))
  on('skill.prompt', () => ({ text: 'skill text' }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text, context: e.context }))
  on('classic.Stop', ($: any, e: any) => { w.stops?.push(e); return {} })
  on('classic.UserPromptSubmit', ($: any, e: any) => { w.prompts?.push(e); return {} })
  on('tool.call', ($: any, e: any) => {
    if (e.tool === 'Bash' && String(e.command).includes('exit 1')) return { isError: true, result: 'Exit code 1', text: 'Exit code 1' }
    if (e.tool === 'Skill' && e.skill === 'missing') return { isError: true, result: 'Unknown skill', text: 'Unknown skill' }
    if (e.tool === 'Bash') return { result: { stdout: '', stderr: '', interrupted: false } }
    return { result: { ok: true } }
  })
  on('turn.step', async function* ($: any, e: any) {
    yield { kind: 'text', index: 0, text: 'Done.' }
    yield { kind: 'stop', stopReason: 'end_turn', usage: null }
    return { turnId: e.turnId, index: e.index, answer: 'Done.', toolUses: [], stopReason: 'end_turn', usage: null }
  })
}

async function turn($: any, id: string) {
  await $.turn.start({ text: 'go', turnId: id })
}

async function call($: any, input: Record<string, unknown>) {
  return (await $.tool.call({ tool_use_id: `toolu_${Math.random().toString(36).slice(2)}`, ...input })) as any
}

const write = (path: string, agentId?: string) => ({ tool: 'Write', file_path: path, content: 'x', ...(agentId === undefined ? {} : { agentId }) })
const bash = (command: string, agentId?: string) => ({ tool: 'Bash', command, ...(agentId === undefined ? {} : { agentId }) })
const skill = (name: string, agentId?: string) => ({ tool: 'Skill', skill: name, ...(agentId === undefined ? {} : { agentId }) })

// Runs one final model step and says whether the reply was shown or held.
async function step($: any, turnId: string) {
  const stream = $.turn.step({ turnId, index: 0, model: 'test', messageCount: 1 })
  const chunks: any[] = []
  for await (const c of stream) chunks.push(c)
  const result = await stream.result
  return { shown: chunks.some((c) => c.kind === 'text'), result }
}

// ---------- K4 ----------

test('K4: an inbox write is refused until knowledge-save is opened this turn', async ($, on) => {
  world(on, { session: 'k4-a' })
  await turn($, 't1')
  const refused = await call($, write(INBOX))
  expect(refused.deny).toContain('K4')
  expect(refused.deny).toContain('Do not mention this check in your reply.')
  await call($, skill('second-brain:knowledge-save'))
  expect((await call($, write(INBOX))).deny).toBeUndefined()
})

test('K4: an opening from an earlier turn covers memory files but not the inbox', async ($, on) => {
  world(on, { session: 'k4-b' })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await turn($, 't2')
  expect((await call($, write(INBOX))).deny).toContain('K4')
  expect((await call($, write(`${ROOT}/knowledge/memory/memory-entries/a.md`))).deny).toBeUndefined()
  expect((await call($, write(`${ROOT}/knowledge/prds/a.md`))).deny).toBeUndefined()
})

test('K4: shell writes are refused, shell reads and commit messages are not', async ($, on) => {
  world(on, { session: 'k4-c' })
  await turn($, 't1')
  expect((await call($, bash('echo note >> knowledge/memory-inbox.md'))).deny).toContain('K4')
  expect((await call($, bash('sed -i s/a/b/ knowledge/memory/current.md'))).deny).toContain('K4')
  expect((await call($, bash('cd knowledge && rm memory-inbox.md'))).deny).toContain('K4')
  expect((await call($, bash('cat knowledge/memory-inbox.md | head -5'))).deny).toBeUndefined()
  expect((await call($, bash('git commit -m "update knowledge/memory-inbox.md"'))).deny).toBeUndefined()
  expect((await call($, bash('grep -n x knowledge/memory/current.md 2>/dev/null'))).deny).toBeUndefined()
})

test('K4: a Read of SKILL.md or a typed /knowledge-save opens the skill', async ($, on) => {
  world(on, { session: 'k4-d' })
  await turn($, 't1')
  await call($, { tool: 'Read', file_path: '/home/me/.claude/plugins/second-brain/skills/knowledge-save/SKILL.md' })
  expect((await call($, write(INBOX))).deny).toBeUndefined()
  await turn($, 't2')
  expect((await call($, write(INBOX))).deny).toContain('K4')
  await $.skill.prompt({ skill: 'second-brain:knowledge-save', text: 'steps' })
  expect((await call($, write(INBOX))).deny).toBeUndefined()
})

test('K4: a failed Skill call does not count', async ($, on) => {
  world(on, { session: 'k4-e' })
  await turn($, 't1')
  const failed = await call($, skill('missing'))
  expect(failed.isError).toBe(true)
  expect((await call($, write(INBOX))).deny).toContain('K4')
})

test('K4: a helper inherits the main agent opening; an unrelated helper does not', async ($, on) => {
  world(on, { session: 'k4-f' })
  await turn($, 't1')
  expect((await call($, write(INBOX, 'helper-early'))).deny).toContain('K4')
  await call($, skill('knowledge-save'))
  expect((await call($, write(INBOX, 'helper-late'))).deny).toBeUndefined()
})

test('K4: a helper save still running blocks another agent writing the same file', async ($, on) => {
  const w: World = { session: 'k4-g', agents: [{ id: 'saver', status: 'running' }] }
  world(on, w)
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  expect((await call($, write(CURRENT, 'saver'))).deny).toBeUndefined()
  expect((await call($, write(CURRENT))).deny).toContain('still running')
  w.agents = [{ id: 'saver', status: 'completed' }]
  expect((await call($, write(CURRENT))).deny).toBeUndefined()
})

test('K4: compaction and /clear make the skill need opening again', async ($, on) => {
  const w: World = { session: 'k4-h' }
  world(on, w)
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await $.session.compact({ trigger: 'manual', messages: [{ role: 'user', text: 'summary', toolUses: [] }] })
  expect((await call($, write(`${ROOT}/knowledge/prds/a.md`))).deny).toContain('K4')
  await call($, skill('knowledge-save'))
  expect((await call($, write(`${ROOT}/knowledge/prds/a.md`))).deny).toBeUndefined()
  await $.session.end({ reason: 'clear', sessionId: 'k4-h', resume: { id: 'k4-h' } } as any)
  w.session = 'k4-h-after-clear'
  await turn($, 't2')
  expect((await call($, write(`${ROOT}/knowledge/prds/a.md`))).deny).toContain('K4')
})

test('K4: session start (and a plugin reload) clears the record', async ($, on) => {
  world(on, { session: 'k4-i' })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await $.session.start({ cwd: ROOT, surface: null, isInteractive: false })
  expect((await call($, write(`${ROOT}/knowledge/prds/a.md`))).deny).toContain('K4')
})

test('K4: a project can turn it off in .claude/protocols.json', async ($, on) => {
  world(on, { session: 'k4-j', exists: [MANUAL, `${ROOT}/.claude/protocols.json`], files: { [`${ROOT}/.claude/protocols.json`]: JSON.stringify({ off: ['K4'] }) } })
  await turn($, 't1')
  expect((await call($, write(INBOX))).deny).toBeUndefined()
})

test('K4: nothing is checked in a project without the knowledge system', async ($, on) => {
  world(on, { session: 'k4-k', exists: [] })
  await turn($, 't1')
  expect((await call($, write(INBOX))).deny).toBeUndefined()
  expect((await step($, 't1')).shown).toBe(true)
})

// ---------- K5 ----------

test('K5: generated indexes are refused even with knowledge-save open', async ($, on) => {
  world(on, { session: 'k5-a' })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  const r = await call($, { tool: 'Edit', file_path: `${ROOT}/knowledge/memory/memory-index.md`, old_string: 'a', new_string: 'b' })
  expect(r.deny).toContain('K5')
  expect((await call($, write(`${ROOT}/ai-external-knowledge/README.md`))).deny).toContain('K5')
  expect((await call($, write(`${ROOT}/src/app.ts`))).deny).toBeUndefined()
})

// ---------- CW ----------

test('CW: a work-item change with no current.md write holds the reply once and opens knowledge-save', async ($, on) => {
  world(on, { session: 'cw-a' })
  await turn($, 't1')
  await call($, bash('gh issue close 12 --comment "done"'))
  expect((await step($, 't1')).shown).toBe(false)
  // Claude Code asks once for a visible reply; that draft is held back too.
  expect((await step($, 't1')).shown).toBe(false)
  const stop: any = await $.classic.Stop({ stop_hook_active: false } as any)
  expect(stop.block).toContain('CW')
  expect(stop.block).toContain('knowledge-save')
  expect(stop.block).toContain('Do not mention this check in your reply.')
  await call($, skill('knowledge-save'))
  await call($, write(CURRENT))
  await call($, bash(BUILD_AND_CHECK))
  expect((await step($, 't1')).shown).toBe(true)
  expect((await $.turn.complete({ turnId: 't1', reason: 'answer', isAborted: false, answer: 'the answer', durationMs: 5 } as any)).text).toBe('the answer')
})

test('CW: a turn with no work-item change is not held', async ($, on) => {
  world(on, { session: 'cw-b' })
  await turn($, 't1')
  await call($, bash('gh issue view 12'))
  await call($, bash('ls'))
  expect((await step($, 't1')).shown).toBe(true)
})

test('CW: a failed work-item command does not count', async ($, on) => {
  world(on, { session: 'cw-c' })
  await turn($, 't1')
  await call($, bash('gh issue close 12; exit 1'))
  expect((await step($, 't1')).shown).toBe(true)
})

test('CW: order counts: a current.md write before the change does not satisfy it', async ($, on) => {
  world(on, { session: 'cw-d' })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, write(CURRENT))
  await call($, bash(BUILD_AND_CHECK))
  await call($, bash('node plugins/work-tracker/skills/work/scripts/work.mjs update WI-1 --stage 08'))
  expect((await step($, 't1')).shown).toBe(false)
})

test('CW: GitHub tool calls count; one hold per turn, then the reply is shown with a notice', async ($, on) => {
  world(on, { session: 'cw-e' })
  await turn($, 't1')
  await call($, { tool: 'mcp__github__issue_write', method: 'update', issue_number: 3, state: 'closed' })
  expect((await step($, 't1')).shown).toBe(false)
  expect(((await $.classic.Stop({ stop_hook_active: false } as any)) as any).block).toContain('CW')
  expect((await step($, 't1')).shown).toBe(true)
  expect(((await $.classic.Stop({ stop_hook_active: true } as any)) as any).block).toBeUndefined()
  const done = await $.turn.complete({ turnId: 't1', reason: 'answer', isAborted: false, answer: 'the answer', durationMs: 5 } as any)
  expect(done.text).toContain('Required workflow check not met after one retry: CW')
})

test('CW: a helper write of current.md in the same turn satisfies the main agent', async ($, on) => {
  world(on, { session: 'cw-f' })
  await turn($, 't1')
  await call($, bash('gh issue create --title x --body y'))
  await call($, skill('knowledge-save'))
  await call($, write(CURRENT, 'saver'))
  await call($, bash(BUILD_AND_CHECK, 'saver'))
  expect((await step($, 't1')).shown).toBe(true)
})

test('CW: a helper save still running is pending: no hold now, still open next turn', async ($, on) => {
  const w: World = { session: 'cw-g', agents: [] }
  world(on, w)
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, bash('gh issue close 4'))
  await call($, { tool: 'Read', file_path: CURRENT, agentId: 'saver' })
  w.agents = [{ id: 'saver', status: 'running' }]
  expect((await step($, 't1')).shown).toBe(true)
  w.agents = [{ id: 'saver', status: 'completed' }]
  await turn($, 't2')
  expect((await step($, 't2')).shown).toBe(false)
})

// ---------- K6 ----------

test('K6: a knowledge write needs the index builder and then the checker, both exiting 0', async ($, on) => {
  world(on, { session: 'k6-a' })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, write(INBOX))
  await call($, bash('node .claude/tools/check-knowledge.mjs && node .claude/tools/build-knowledge-index.mjs'))
  expect((await step($, 't1')).shown).toBe(false)
  expect(((await $.classic.Stop({ stop_hook_active: false } as any)) as any).block).toContain('K6')
  await turn($, 't2')
  await call($, bash('node .claude/tools/build-knowledge-index.mjs'))
  await call($, bash('node .claude/tools/check-knowledge.mjs; exit 1'))
  expect((await step($, 't2')).shown).toBe(false)
  await turn($, 't3')
  await call($, bash('node .claude/tools/build-knowledge-index.mjs'))
  await call($, bash('node .claude/tools/check-knowledge.mjs'))
  expect((await step($, 't3')).shown).toBe(true)
})

// ---------- Engine errors and the backup field ----------

test('Engine errors: two refusals, then the engine stops for the turn with one notice and no field', async ($, on) => {
  const w: World = { session: 'err-a', failCwd: true, stops: [] }
  world(on, w)
  await turn($, 't1')
  expect((await call($, bash('ls'))).deny).toContain('could not run')
  expect((await call($, bash('ls'))).deny).toContain('could not run')
  expect((await call($, bash('ls'))).deny).toBeUndefined()
  await $.classic.Stop({ stop_hook_active: false } as any)
  expect(w.stops![0].toolkit_protocol_engine).toBeUndefined()
  const done = await $.turn.complete({ turnId: 't1', reason: 'answer', isAborted: false, answer: 'the answer', durationMs: 5 } as any)
  expect(done.text).toBe('Workflow checks are off for this turn after an error.')
  w.failCwd = false
  await turn($, 't2')
  expect((await call($, write(INBOX))).deny).toContain('K4')
})

test('Reply hold fails open: on an error the reply is shown with the notice', async ($, on) => {
  world(on, { session: 'err-b', failAgents: true })
  await turn($, 't1')
  await call($, skill('knowledge-save', 'helper'))
  await call($, bash('gh issue close 9'))
  expect((await step($, 't1')).shown).toBe(true)
  const done = await $.turn.complete({ turnId: 't1', reason: 'answer', isAborted: false, answer: 'the answer', durationMs: 5 } as any)
  expect(done.text).toBe('Workflow checks are off for this turn after an error.')
})

test('Backup field: classic UserPromptSubmit and Stop carry the active protocols', async ($, on) => {
  const w: World = { session: 'field-a', stops: [], prompts: [] }
  world(on, w)
  await $.classic.UserPromptSubmit({ prompt: 'hi' } as any)
  await turn($, 't1')
  await $.classic.Stop({ stop_hook_active: false } as any)
  expect(w.prompts![0].toolkit_protocol_engine).toEqual({ version: '0.1.0', active: ['K4', 'CW', 'K5', 'K6'] })
  expect(w.stops![0].toolkit_protocol_engine.active).toEqual(['K4', 'CW', 'K5', 'K6'])
})
