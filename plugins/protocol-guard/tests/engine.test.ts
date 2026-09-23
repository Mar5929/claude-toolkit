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
  stopBlock?: string
  env?: Record<string, string | undefined>
  skills?: string[]
  prompts?: any[]
  failTools?: string[]
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
  on('env.set', ($: any, e: any) => { if (w.env !== undefined) w.env[e.name] = e.value; return { value: undefined } })
  on('command.list', () => ({ value: (w.skills ?? ['second-brain:knowledge-save', 'work', 'git-workflows:merge-and-clean-up', 'clear']).map((name) => ({ name, description: '', source: 'plugin' })) }))
  on('session.start', ($: any, e: any) => ({ cwd: e.cwd }))
  on('session.end', ($: any, e: any) => ({ sessionId: e.sessionId }))
  on('session.compact', ($: any, e: any) => ({ messages: e.messages }))
  on('turn.start', ($: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: 'the answer' }))
  on('skill.prompt', () => ({ text: 'skill text' }))
  on('prompt.submit', ($: any, e: any) => ({ text: e.text, context: e.context }))
  on('classic.Stop', ($: any, e: any) => { w.stops?.push(e); return w.stopBlock === undefined ? {} : { block: w.stopBlock } })
  on('classic.UserPromptSubmit', ($: any, e: any) => { w.prompts?.push(e); return {} })
  on('tool.call', ($: any, e: any) => {
    if (e.tool === 'Bash' && String(e.command).includes('exit 1')) return { isError: true, result: 'Exit code 1', text: 'Exit code 1' }
    if (w.failTools?.includes(e.tool)) return { isError: true, result: 'server down', text: 'server down' }
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
  expect(refused.deny).toContain('protocol-guard')
  expect(refused.deny).not.toContain('Do not mention this check')
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
  await call($, bash('gh issue reopen 12 --comment "done"'))
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
  await call($, bash('gh issue reopen 12; exit 1'))
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
  await call($, { tool: 'mcp__github__issue_write', method: 'update', issue_number: 3, state: 'open' })
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
  await call($, bash('gh issue reopen 4'))
  await call($, write(INBOX, 'saver'))
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
  await call($, skill('knowledge-save'))
  await call($, write(INBOX))
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
  await call($, skill('knowledge-save'))
  expect((await call($, write(INBOX, 'helper'))).deny).toBeUndefined()
  expect((await call($, bash('gh issue reopen 9'))).deny).toBeUndefined()
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
  expect(w.prompts![0].toolkit_protocol_engine).toEqual({ version: '0.3.0', active: ['K4', 'CW', 'K5', 'K6', 'K7', 'P2', 'P3'] })
  expect(w.stops![0].toolkit_protocol_engine.active).toEqual(['K4', 'CW', 'K5', 'K6', 'K7', 'P2', 'P3'])
})

// ---------- Review fixes (PR #402) ----------

test('Fix 1: an unmet check is not held again in later turns', async ($, on) => {
  world(on, { session: 'fix1-a' })
  await turn($, 't1')
  await call($, bash('gh issue reopen 12'))
  expect((await step($, 't1')).shown).toBe(false)
  await $.classic.Stop({ stop_hook_active: false } as any)
  expect((await step($, 't1')).shown).toBe(true)
  await turn($, 't2')
  expect((await step($, 't2')).shown).toBe(true)
  await turn($, 't3')
  await call($, bash('ls'))
  expect((await step($, 't3')).shown).toBe(true)
})

test('Fix 2: read-only shell commands pass K4; copying into a knowledge file does not', async ($, on) => {
  world(on, { session: 'fix2-a' })
  await turn($, 't1')
  for (const c of [
    'cut -d, -f1 knowledge/memory/current.md',
    'sort knowledge/memory/current.md | uniq -c',
    'tr a-z A-Z < knowledge/memory-inbox.md',
    "awk '{print $1}' knowledge/memory/current.md",
    'od -c knowledge/memory-inbox.md | head',
    'git -C /project --no-pager diff knowledge/memory/current.md',
    'git -c core.pager=cat log -- knowledge/memory/current.md',
    'cp knowledge/memory/current.md /tmp/current-backup.md',
  ]) expect((await call($, bash(c))).deny).toBeUndefined()
  for (const c of [
    'cp /tmp/x.md knowledge/memory/current.md',
    'cp -t knowledge/memory /tmp/x.md',
    'sort -o knowledge/memory/current.md knowledge/memory/current.md',
    'awk -i inplace 1 knowledge/memory/current.md',
    'git -C /project checkout knowledge/memory/current.md',
  ]) expect((await call($, bash(c))).deny).toContain('K4')
})

test('Fix 4: another Stop hook block is kept beside the note', async ($, on) => {
  world(on, { session: 'fix4-a', stopBlock: 'Another hook asks for a review.' })
  await turn($, 't1')
  await call($, bash('gh issue reopen 12'))
  expect((await step($, 't1')).shown).toBe(false)
  const stop: any = await $.classic.Stop({ stop_hook_active: false } as any)
  expect(stop.block).toContain('Another hook asks for a review.')
  expect(stop.block).toContain('CW')
})

test('Fix 5: a held draft is shown when the continuation ends without a reply', async ($, on) => {
  world(on, { session: 'fix5-a' })
  await turn($, 't1')
  await call($, bash('gh issue reopen 12'))
  expect((await step($, 't1')).shown).toBe(false)
  await $.classic.Stop({ stop_hook_active: false } as any)
  const done = await $.turn.complete({ turnId: 't1', reason: 'aborted', isAborted: true, answer: '', durationMs: 5 } as any)
  expect(done.text).toContain('Done.')
})

test('Fix 6: only stage labels count as a work-item change', async ($, on) => {
  world(on, { session: 'fix6-a' })
  await turn($, 't1')
  await call($, bash('gh issue edit 5 --add-label bug'))
  await call($, { tool: 'mcp__github__issue_write', method: 'update', issue_number: 5, labels: ['bug', 'enhancement'] })
  expect((await step($, 't1')).shown).toBe(true)
  await turn($, 't2')
  await call($, bash('gh issue edit 5 --remove-label 07-review --add-label 08-build'))
  expect((await step($, 't2')).shown).toBe(false)
})

test('Fix 7: a helper keeps no turn opening across turns; a reading helper is not a pending save', async ($, on) => {
  const w: World = { session: 'fix7-a', agents: [{ id: 'reader', status: 'running' }] }
  world(on, w)
  await turn($, 't1')
  await call($, skill('knowledge-save', 'old-helper'))
  expect((await call($, write(INBOX, 'old-helper'))).deny).toBeUndefined()
  await turn($, 't2')
  expect((await call($, write(INBOX, 'old-helper'))).deny).toContain('K4')
  await call($, bash('gh issue reopen 3'))
  await call($, { tool: 'Read', file_path: CURRENT, agentId: 'reader' })
  expect((await step($, 't2')).shown).toBe(false)
})

// ---------- Step 6: K7, P2, P3 ----------

test('K7: gh pr create is refused until knowledge-save is opened this turn', async ($, on) => {
  world(on, { session: 'k7-a' })
  await turn($, 't1')
  const r = await call($, bash('gh pr create --title t --body b'))
  expect(r.deny).toContain('K7')
  expect(r.deny).toContain('If the skill is not installed, tell the owner and stop.')
  await call($, skill('knowledge-save'))
  expect((await call($, bash('gh pr create --title t --body b'))).deny).toBeUndefined()
  await turn($, 't2')
  expect((await call($, bash('git push && gh pr create --fill'))).deny).toContain('K7')
})

test('K7: the GitHub pull-request tool counts too; a quoted mention does not', async ($, on) => {
  world(on, { session: 'k7-b' })
  await turn($, 't1')
  expect((await call($, { tool: 'mcp__github__create_pull_request', owner: 'o', repo: 'r', title: 't', head: 'b', base: 'main' })).deny).toContain('K7')
  expect((await call($, bash('git commit -m "then gh pr create"'))).deny).toBeUndefined()
  expect((await call($, { tool: 'mcp__github__pull_request_read', method: 'get', pullNumber: 1 })).deny).toBeUndefined()
})

test('P2: closing an item needs the work skill this turn as well as knowledge-save', async ($, on) => {
  world(on, { session: 'p2-a' })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  const close = await call($, bash('gh issue close 12'))
  expect(close.deny).toContain('P2')
  expect(close.deny).not.toContain('K7')
  expect((await call($, bash('node plugins/work-tracker/skills/work/scripts/work.mjs finish WI-3 --evidence x'))).deny).toContain('P2')
  expect((await call($, bash('work finish WI-3 --approved-by Mike'))).deny).toContain('P2')
  expect((await call($, { tool: 'mcp__github__issue_write', method: 'update', issue_number: 3, state: 'closed' })).deny).toContain('P2')
  await call($, skill('work-tracker:work'))
  expect((await call($, bash('gh issue close 12'))).deny).toBeUndefined()
  expect((await call($, { tool: 'mcp__github__issue_write', method: 'update', issue_number: 3, state: 'closed' })).deny).toBeUndefined()
  await turn($, 't2')
  await call($, skill('knowledge-save'))
  expect((await call($, bash('gh issue close 13'))).deny).toContain('P2')
})

test('P3: a merge needs merge-and-clean-up once per session; compaction keeps it', async ($, on) => {
  world(on, { session: 'p3-a' })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  const merge = await call($, bash('gh pr merge 5 --squash'))
  expect(merge.deny).toContain('P3')
  expect((await call($, { tool: 'mcp__github__enable_pr_auto_merge', owner: 'o', repo: 'r', pullNumber: 5 })).deny).toContain('P3')
  await call($, skill('git-workflows:merge-and-clean-up'))
  expect((await call($, bash('gh pr merge 5 --squash'))).deny).toBeUndefined()
  await $.session.compact({ trigger: 'auto', messages: [{ role: 'user', text: 'summary', toolUses: [] }] })
  await turn($, 't2')
  const later = await call($, { tool: 'mcp__github__merge_pull_request', owner: 'o', repo: 'r', pullNumber: 6 })
  expect(later.deny).toContain('K7')
  expect(later.deny).not.toContain('P3')
})

test('Fix A: a check whose skill is not installed is off, with one notice to the owner', async ($, on) => {
  world(on, { session: 'fixA-a', skills: ['second-brain:knowledge-save', 'clear'] })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  expect((await call($, bash('gh issue close 12'))).deny).toBeUndefined()
  expect((await call($, bash('gh pr merge 5'))).deny).toBeUndefined()
  const done = await $.turn.complete({ turnId: 't1', reason: 'answer', isAborted: false, answer: 'x', durationMs: 5 } as any)
  expect(done.text).toContain('P2 (work)')
  expect(done.text).toContain('P3 (merge-and-clean-up)')
  await turn($, 't2')
  expect((await $.turn.complete({ turnId: 't2', reason: 'answer', isAborted: false, answer: 'x', durationMs: 5 } as any)).text).toBe('the answer')
})

test('Fix B: a carried check counts a helper that wrote in the turn it was carried from', async ($, on) => {
  const w: World = { session: 'fixB-a', agents: [{ id: 'saver', status: 'running' }] }
  world(on, w)
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, bash('gh issue reopen 4'))
  await call($, write(INBOX, 'saver'))
  expect((await step($, 't1')).shown).toBe(true)
  await turn($, 't2')
  expect((await step($, 't2')).shown).toBe(true)
  w.agents = [{ id: 'saver', status: 'completed' }]
  await turn($, 't3')
  expect((await step($, 't3')).shown).toBe(false)
})

test('The engine names its active checks for PreToolUse command hooks, and clears them when it stops', async ($, on) => {
  const w: World = { session: 'env-a', env: {}, failCwd: true }
  world(on, w)
  await turn($, 't1')
  expect(w.env!.TOOLKIT_PROTOCOL_ENGINE).toBe('env-a:K4,CW,K5,K6,K7,P2,P3')
  await call($, bash('ls'))
  await call($, bash('ls'))
  expect(w.env!.TOOLKIT_PROTOCOL_ENGINE).toBeUndefined()
})

// ---------- Review of PR #403 ----------

test('gh -R and --repo do not bypass K7, P2 or P3; help and dry runs are not actions', async ($, on) => {
  world(on, { session: 'r403-a' })
  await turn($, 't1')
  expect((await call($, bash('gh -R o/r issue close 3'))).deny).toContain('K7')
  expect((await call($, bash('gh --repo o/r pr merge 5'))).deny).toContain('P3')
  expect((await call($, bash('gh --repo=o/r pr create --fill'))).deny).toContain('K7')
  expect((await call($, bash('gh pr merge --help'))).deny).toBeUndefined()
  expect((await call($, bash('gh issue close -h'))).deny).toBeUndefined()
  expect((await call($, bash('gh pr create --dry-run --fill'))).deny).toBeUndefined()
})

test('K5 needs no skill, so its refusal does not mention one', async ($, on) => {
  world(on, { session: 'r403-b' })
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  const r = await call($, write(`${ROOT}/knowledge/prds/prd-index.md`))
  expect(r.deny).toContain('K5')
  expect(r.deny).not.toContain('If the skill is not installed')
})

// ---------- Memory mode (#404) ----------

const CONFIG = `${ROOT}/.toolkit-memory.json`
const MEM0 = { format: 1, memory: 'external', service: 'mem0', server: 'mem0', project: 'demo' }
const HINDSIGHT = { format: 1, memory: 'external', service: 'hindsight', server: 'hindsight', project: 'demo' }
// A project in a memory mode: the config file (an object, or raw text).
function memoryWorld(session: string, config: unknown, extra: Partial<World> = {}): World {
  const text = typeof config === 'string' ? config : JSON.stringify(config)
  const external = typeof config === 'object' && (config as any)?.memory === 'external'
  return { session, exists: [external ? `${ROOT}/docs/knowledge-manual.md` : MANUAL, CONFIG], files: { [CONFIG]: text }, env: {}, ...extra }
}
const mem0Add = (kind?: string, agentId?: string) => ({ tool: 'mcp__mem0__add_memory', text: 'x', infer: false, ...(kind === undefined ? {} : { metadata: { toolkit_kind: kind, toolkit_project: 'demo' } }), ...(agentId === undefined ? {} : { agentId }) })
const retain = (kind: string, agentId?: string) => ({ tool: 'mcp__hindsight__retain', bank_id: 'demo', content: 'x', document_id: `${kind}:a`, tags: [`toolkit_kind:${kind}`, `toolkit_key:${kind}:a`], ...(agentId === undefined ? {} : { agentId }) })

test('Memory mode: a missing config runs the files checks only', async ($, on) => {
  const w: World = { session: 'mem-a', env: {} }
  world(on, w)
  await turn($, 't1')
  expect(w.env!.TOOLKIT_PROTOCOL_ENGINE).toBe('mem-a:K4,CW,K5,K6,K7,P2,P3')
})

test('Memory mode: "files" runs the files checks only', async ($, on) => {
  const w = memoryWorld('mem-b', { format: 1, memory: 'files' })
  world(on, w)
  await turn($, 't1')
  expect(w.env!.TOOLKIT_PROTOCOL_ENGINE).toBe('mem-b:K4,CW,K5,K6,K7,P2,P3')
  expect((await call($, write(INBOX))).deny).toContain('K4')
})

test('Memory mode: "external" runs the external checks and K7, not the files checks', async ($, on) => {
  const w = memoryWorld('mem-c', MEM0)
  world(on, w)
  await turn($, 't1')
  expect(w.env!.TOOLKIT_PROTOCOL_ENGINE).toBe('mem-c:K4X,CWX,K5X,K6X,K7,P2,P3')
  // Files-mode paths are not checked in external mode.
  expect((await call($, write(INBOX))).deny).toBeUndefined()
  expect((await call($, write(`${ROOT}/knowledge/prds/prd-index.md`))).deny).toBeUndefined()
  expect((await call($, bash('gh pr create --fill'))).deny).toContain('K7')
})

for (const [id, config] of [
  ['mem-d', '{ not json'],
  ['mem-e', { format: 1, memory: 'external', service: 'mem0' }],
  ['mem-f', { format: 1, memory: 'cloud' }],
  ['mem-j', { memory: 'external', service: 'mem0', server: 'mem0', project: 'demo' }],
  ['mem-k', { ...MEM0, server: 'mem0.cloud' }],
  ['mem-l', { ...MEM0, service: 'toString' }],
] as const) {
  test(`Memory mode: an invalid config (${id}) means files, and the agent is told`, async ($, on) => {
    const w = memoryWorld(id, config, { exists: [MANUAL, CONFIG] })
    world(on, w)
    await turn($, 't1')
    expect(w.env!.TOOLKIT_PROTOCOL_ENGINE).toBe(`${id}:K4,CW,K5,K6,K7,P2,P3`)
    const r: any = await $.prompt.submit({ text: 'hi', context: [] } as any)
    expect(JSON.stringify(r)).toContain('.toolkit-memory.json')
  })
}

test('Memory mode: in external mode a current.md write does not meet CWX', async ($, on) => {
  world(on, memoryWorld('mem-g', MEM0))
  await turn($, 't1')
  await call($, bash('gh issue reopen 12'))
  await call($, skill('knowledge-save'))
  await call($, write(CURRENT))
  expect((await step($, 't1')).shown).toBe(false)
  expect(((await $.classic.Stop({ stop_hook_active: false } as any)) as any).block).toContain('CWX')
})

test('Memory mode: external checks do not fire in files mode', async ($, on) => {
  world(on, { session: 'mem-h' })
  await turn($, 't1')
  expect((await call($, mem0Add('lasting'))).deny).toBeUndefined()
  expect((await call($, write(`${ROOT}/prds/prd-index.md`))).deny).toBeUndefined()
})

for (const [id, config, save] of [['k4x-a', MEM0, mem0Add('lasting')], ['k4x-b', HINDSIGHT, retain('lasting')]] as const) {
  test(`K4X: a memory-write call is refused before knowledge-save is opened and allowed after (${config.service})`, async ($, on) => {
    world(on, memoryWorld(id, config))
    await turn($, 't1')
    const r = await call($, save)
    expect(r.deny).toContain('K4X')
    expect(r.deny).toContain('knowledge-save')
    await call($, skill('second-brain:knowledge-save'))
    expect((await call($, save)).deny).toBeUndefined()
    // Reads are never refused.
    expect((await call($, { tool: config === MEM0 ? 'mcp__mem0__search_memories' : 'mcp__hindsight__recall', query: 'x' })).deny).toBeUndefined()
  })
}

test('K4X: Hindsight update_memory, invalidate_memory and delete_bank are writes; update_bank is not', async ($, on) => {
  world(on, memoryWorld('k4x-e', HINDSIGHT))
  await turn($, 't1')
  expect((await call($, { tool: 'mcp__hindsight__update_memory', memory_id: 'm1', content: 'x' })).deny).toContain('K4X')
  expect((await call($, { tool: 'mcp__hindsight__invalidate_memory', memory_id: 'm1' })).deny).toContain('K4X')
  expect((await call($, { tool: 'mcp__hindsight__delete_bank' })).deny).toContain('K4X')
  expect((await call($, { tool: 'mcp__hindsight__update_bank', config_updates: { retain_extraction_mode: 'chunks' } })).deny).toBeUndefined()
  await call($, skill('knowledge-save'))
  expect((await call($, { tool: 'mcp__hindsight__update_memory', memory_id: 'm1', content: 'x' })).deny).toBeUndefined()
  expect((await call($, { tool: 'mcp__hindsight__invalidate_memory', memory_id: 'm1' })).deny).toBeUndefined()
})

test('CWX: Hindsight update_memory and invalidate_memory carry no document id, so they do not meet CWX', async ($, on) => {
  world(on, memoryWorld('cwx-f', HINDSIGHT))
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, { tool: 'mcp__github__issue_write', method: 'create', title: 't' })
  await call($, { tool: 'mcp__hindsight__update_memory', memory_id: 'working:m1', content: 'x' })
  await call($, { tool: 'mcp__hindsight__invalidate_memory', memory_id: 'working:m1' })
  expect((await step($, 't1')).shown).toBe(false)
})

test('K4X: mem0 delete_entities is a write', async ($, on) => {
  world(on, memoryWorld('k4x-f', MEM0))
  await turn($, 't1')
  expect((await call($, { tool: 'mcp__mem0__delete_entities', user_id: 'u' })).deny).toContain('K4X')
})

test('K4X: a pending record needs knowledge-save opened this turn; a lasting one since the last reset', async ($, on) => {
  world(on, memoryWorld('k4x-c', HINDSIGHT))
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  expect((await call($, retain('pending'))).deny).toBeUndefined()
  await turn($, 't2')
  expect((await call($, retain('pending'))).deny).toContain('K4X')
  expect((await call($, retain('lasting'))).deny).toBeUndefined()
  expect((await call($, mem0Add('pending'))).deny).toBeUndefined() // another server's tool: not the memory service
  await call($, skill('knowledge-save'))
  expect((await call($, retain('pending'))).deny).toBeUndefined()
})

test('K4X: files in prds/ need knowledge-save, by a file tool or a shell command', async ($, on) => {
  world(on, memoryWorld('k4x-d', MEM0))
  await turn($, 't1')
  expect((await call($, write(`${ROOT}/prds/area/a.md`))).deny).toContain('K4X')
  expect((await call($, bash('echo x >> prds/area/a.md'))).deny).toContain('K4X')
  expect((await call($, bash('cat prds/area/a.md'))).deny).toBeUndefined()
  await call($, skill('knowledge-save'))
  expect((await call($, write(`${ROOT}/prds/area/a.md`))).deny).toBeUndefined()
})

test('CWX: a work-item change is met by a working-kind write or a delete, not by a lasting-kind write', async ($, on) => {
  world(on, memoryWorld('cwx-a', MEM0))
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, bash('gh issue reopen 12'))
  await call($, mem0Add('lasting'))
  await call($, mem0Add())
  expect((await step($, 't1')).shown).toBe(false)
  const stop: any = await $.classic.Stop({ stop_hook_active: false } as any)
  expect(stop.block).toContain('CWX')
  expect(stop.block).toContain("memory service's save tool")
  await call($, mem0Add('working'))
  expect((await step($, 't1')).shown).toBe(true)

  await turn($, 't2')
  await call($, bash('gh issue close 12 --reason completed; true'))
  await call($, { tool: 'mcp__mem0__delete_memory', memory_id: 'abc' })
  expect((await step($, 't2')).shown).toBe(true)
})

test('CWX: Hindsight tags and a metadata string both carry the kind; a write before the change does not count', async ($, on) => {
  world(on, memoryWorld('cwx-b', HINDSIGHT))
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, retain('working'))
  await call($, { tool: 'mcp__github__issue_write', method: 'create', title: 't' })
  expect((await step($, 't1')).shown).toBe(false)
  await $.classic.Stop({ stop_hook_active: false } as any)
  await turn($, 't2')
  await call($, { tool: 'mcp__github__issue_write', method: 'create', title: 't' })
  await call($, { tool: 'mcp__hindsight__sync_retain', content: 'x', metadata: JSON.stringify({ toolkit_kind: 'working' }) })
  expect((await step($, 't2')).shown).toBe(true)
  await turn($, 't3')
  await call($, { tool: 'mcp__github__issue_write', method: 'create', title: 't' })
  await call($, { tool: 'mcp__hindsight__delete_document', bank_id: 'demo', document_id: 'working:WI-1' })
  expect((await step($, 't3')).shown).toBe(true)
})

test('CWX: on Hindsight only a delete of a working: document counts; clear_memories does not', async ($, on) => {
  world(on, memoryWorld('cwx-e', HINDSIGHT))
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, { tool: 'mcp__github__issue_write', method: 'create', title: 't' })
  await call($, { tool: 'mcp__hindsight__delete_document', bank_id: 'demo', document_id: 'pending:0b6c' })
  await call($, { tool: 'mcp__hindsight__clear_memories', bank_id: 'demo' })
  await call($, { tool: 'mcp__hindsight__delete_document', bank_id: 'demo', document_id: 'workingx' })
  expect((await step($, 't1')).shown).toBe(false)
  expect(((await $.classic.Stop({ stop_hook_active: false } as any)) as any).block).toContain('CWX')
  await turn($, 't2')
  await call($, { tool: 'mcp__github__issue_write', method: 'create', title: 't' })
  await call($, { tool: 'mcp__hindsight__delete_document', bank_id: 'demo', document_id: 'working:issue-42' })
  expect((await step($, 't2')).shown).toBe(true)
})

test('CWX: a failed memory-write call does not count', async ($, on) => {
  world(on, memoryWorld('cwx-c', MEM0, { failTools: ['mcp__mem0__add_memory'] }))
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, bash('gh issue reopen 3'))
  expect((await call($, mem0Add('working'))).isError).toBe(true)
  expect((await step($, 't1')).shown).toBe(false)
})

test('CWX: a helper memory-write still running is a pending save', async ($, on) => {
  const w = memoryWorld('cwx-d', MEM0, { agents: [] })
  world(on, w)
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  await call($, bash('gh issue reopen 4'))
  await call($, mem0Add('lasting', 'saver'))
  w.agents = [{ id: 'saver', status: 'running' }]
  expect((await step($, 't1')).shown).toBe(true)
  w.agents = [{ id: 'saver', status: 'completed' }]
  await turn($, 't2')
  expect((await step($, 't2')).shown).toBe(false)
})

test('K5X and K6X: prds/prd-index.md is never edited by hand; a prds/ write needs the builder and checker', async ($, on) => {
  world(on, memoryWorld('k56x-a', MEM0))
  await turn($, 't1')
  await call($, skill('knowledge-save'))
  expect((await call($, write(`${ROOT}/prds/prd-index.md`))).deny).toContain('K5X')
  expect((await call($, write(`${ROOT}/ai-external-knowledge/README.md`))).deny).toContain('K5X')
  await call($, write(`${ROOT}/prds/area/a.md`))
  expect((await step($, 't1')).shown).toBe(false)
  expect(((await $.classic.Stop({ stop_hook_active: false } as any)) as any).block).toContain('K6X')
  await turn($, 't2')
  await call($, skill('knowledge-save'))
  await call($, write(`${ROOT}/prds/area/a.md`))
  await call($, bash(BUILD_AND_CHECK))
  expect((await step($, 't2')).shown).toBe(true)
})

test('Memory mode: a server name with - and _ matches its tool names', async ($, on) => {
  world(on, memoryWorld('mem-i', { ...MEM0, server: 'mem0-cloud_2' }))
  await turn($, 't1')
  expect((await call($, { tool: 'mcp__mem0-cloud_2__add_memory', text: 'x', metadata: { toolkit_kind: 'lasting' } })).deny).toContain('K4X')
})
