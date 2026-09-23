// protocol-guard engine: required workflow checks (issue #396, roadmap step 5).
//
// One module applies every protocol in a list. The list is data: the shipped
// defaults (protocols.default.json beside this plugin) plus the project's own
// changes (.claude/protocols.json: `off` and `protocols`). Changing a protocol
// that uses the words below is a list edit; a new word is a change here.
//
// Every check reads facts Claude Code reports: which skill was opened, which
// file a tool wrote, which program a shell command ran, whether a call
// succeeded, and whether a turn is ending. Nothing reads the agent's words,
// and nothing calls a model. The checks prove a step happened, not that it was
// done well, and never that the owner approved anything.
//
// On a failed check the main agent redoes the step:
// - A tool call is refused with the protocol's `tell`. Tool checks fail
//   closed: a check that cannot decide refuses the call.
// - A final reply is held once per protocol per turn: dropped before display,
//   then the classic Stop event continues the turn with a note that says what
//   is missing and which skill to open. The reply hold fails open: on an
//   error the reply is shown with a notice.
// After two engine errors in one turn the engine stops for that turn, leaves
// the `toolkit_protocol_engine` field off the classic Stop hook input so the
// old command hooks run in full, and shows one notice.
//
// State is kept in module memory, by session. A new session id (/clear, a
// resume) starts clean; session start and a plugin reload clear it;
// compaction clears which skills were opened.
import type { Register } from 'claude-code'
import { STAGE_LABEL, changesWorkItem, fileWords, nodeScript, onlyReads, readCommand, reviewActions } from './shell-reader.mjs'

const VERSION = '0.2.0'
const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])
const ACTIONS = ['pr-create', 'pr-merge', 'issue-close', 'work-finish']
const NO_MENTION = 'Do not mention this check in your reply.'
const OFF_NOTICE = 'Workflow checks are off for this turn after an error.'
// Who is speaking: a held reply comes back as a Stop hook's continuation, so
// the note names its source and why it asks for silence.
const HOLD_INTRO = 'This note is from protocol-guard, the required workflow check that the project owner turned on in .claude/settings.json.'
const OWNER_ASKED = 'The owner set up these checks and wants replies about the work, not about the checks.'
const REFUSAL_INTRO = 'This refusal is from protocol-guard, the required workflow check that the project owner turned on in .claude/settings.json.'

// A refusal names its source and why it asks for silence, so the agent does
// not take it for a prompt injection.
function refusalText(failed: string[]): string {
  return `${REFUSAL_INTRO}\n${[...new Set(failed)].join('\n')}\n${OWNER_ASKED} ${NO_MENTION}`
}

type Owner = { skill?: string; file?: string }
type Require =
  | { opened: 'owner'; within: 'turn' | 'reset' | 'session'; paths?: string[] }
  | { never: true }
  | { wrote: string[] }
  | { ran: string[] }
type Protocol = {
  name: string
  why?: string
  owner: Owner
  appliesIf?: { exists: string }
  on: {
    action?: string[]
    write?: string[]
    shell?: boolean
    oneWriter?: string[]
    turnEnd?: { afterWorkItemChange?: boolean; afterWrite?: string[] }
  }
  require: Require[]
  tell: string
}
type NewFact =
  | { kind: 'write'; path: string; agent: string; certain: boolean }
  | { kind: 'work-item'; agent: string }
  | { kind: 'ran'; script: string; agent: string }
type Fact = NewFact & { seq: number }
type Loop = { turn: Set<string>; reset: Set<string>; session: Set<string> }
type Turn = { holds: Set<string>; errors: number; off: boolean; offNotice: boolean }
type State = {
  key: string
  root: string
  protocols: Protocol[]
  notes: string[]
  loops: Map<string, Loop>
  facts: Fact[]
  seq: number
  turn: Turn
  writers: Map<string, string>
  pendingStop?: string
  pendingDrops: number
  // The last fact before this turn: a turn-end check looks only at facts of
  // this turn, except for a check carried over from a helper save that was
  // still running when the last turn ended.
  turnSeq: number
  carried: Map<string, number>
  carriedNow: Map<string, number>
  // Checks switched off because their owner skill is not installed; the
  // owner is told once.
  missing: string[]
  missingShown: boolean
  // The first draft reply held this turn, shown if the turn ends without one.
  heldDraft?: string
}

const states = new Map<string, State>()
let skillCallsInFlight = 0

// ---------- paths and names (identifiers only; no language is read) ----------

function slashes(p: string): string {
  let s = String(p ?? '').split('\\').join('/')
  if (/^[A-Za-z]:\//.test(s)) s = s[0].toLowerCase() + s.slice(1)
  return s
}

function normalize(p: string): string {
  const abs = p.startsWith('/') || /^[a-z]:\//.test(p)
  const out: string[] = []
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') { out.pop(); continue }
    out.push(part)
  }
  const joined = out.join('/')
  return abs && !/^[a-z]:/.test(joined) ? `/${joined}` : joined
}

function absolute(base: string, p: string): string {
  const s = slashes(p)
  if (s.startsWith('/') || /^[a-z]:\//.test(s)) return normalize(s)
  if (s.startsWith('~')) return s
  return normalize(`${slashes(base)}/${s}`)
}

function relative(root: string, abs: string): string {
  const r = normalize(slashes(root))
  const a = normalize(slashes(abs))
  if (a === r) return ''
  return a.startsWith(r + '/') ? a.slice(r.length + 1) : a
}

function covers(rel: string, entries: readonly string[]): boolean {
  // An entry ending in "/" covers that folder and everything under it.
  return entries.some((f) => (f.endsWith('/') ? rel.startsWith(f) || rel === f.slice(0, -1) : rel === f))
}

function skillName(raw: unknown): string {
  // A skill id is "plugin:skill" or "skill".
  const s = String(raw ?? '')
  const i = s.lastIndexOf(':')
  return i >= 0 ? s.slice(i + 1) : s
}

function ownerKey(o: Owner): string {
  return o.skill !== undefined ? `skill:${o.skill}` : `file:${o.file ?? ''}`
}

// ---------- the protocol list ----------

function isStrings(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}

// A protocol that uses a word this engine does not know is dropped with a note.
function validProtocol(p: any): p is Protocol {
  if (p === null || typeof p !== 'object') return false
  if (typeof p.name !== 'string' || typeof p.tell !== 'string') return false
  if (p.owner === null || typeof p.owner !== 'object' || (typeof p.owner.skill !== 'string' && typeof p.owner.file !== 'string')) return false
  if (p.appliesIf !== undefined && typeof p.appliesIf?.exists !== 'string') return false
  const on = p.on
  if (on === null || typeof on !== 'object') return false
  for (const k of Object.keys(on)) if (!['action', 'write', 'shell', 'oneWriter', 'turnEnd'].includes(k)) return false
  if (on.action !== undefined && !(isStrings(on.action) && on.action.every((x: string) => ACTIONS.includes(x)))) return false
  if (on.write !== undefined && !isStrings(on.write)) return false
  if (on.oneWriter !== undefined && !isStrings(on.oneWriter)) return false
  if (on.shell !== undefined && typeof on.shell !== 'boolean') return false
  if (on.turnEnd !== undefined) {
    const t = on.turnEnd
    for (const k of Object.keys(t)) if (!['afterWorkItemChange', 'afterWrite'].includes(k)) return false
    if (t.afterWrite !== undefined && !isStrings(t.afterWrite)) return false
  }
  if (on.write === undefined && on.turnEnd === undefined && on.action === undefined) return false
  if (!Array.isArray(p.require) || p.require.length === 0) return false
  for (const r of p.require) {
    if (r === null || typeof r !== 'object') return false
    const keys = Object.keys(r).sort().join(',')
    if (keys === 'never' && r.never === true) continue
    if (keys === 'wrote' && isStrings(r.wrote)) continue
    if (keys === 'ran' && isStrings(r.ran) && r.ran.length > 0) continue
    if ((keys === 'opened,within' || keys === 'opened,paths,within') && r.opened === 'owner' && (r.within === 'turn' || r.within === 'reset' || r.within === 'session') && (r.paths === undefined || isStrings(r.paths))) continue
    return false
  }
  return true
}

async function load($: any, s: State) {
  let defaults: unknown[] = []
  try {
    const parsed = JSON.parse(await $.fs.read(`${$.plugin.root}/protocols.default.json`))
    defaults = Array.isArray(parsed?.protocols) ? parsed.protocols : []
  } catch (err) {
    s.notes.push(`The shipped protocol list could not be read (${String(err)}). No required workflow checks run in this session. Tell the owner once.`)
  }
  let off: string[] = []
  let extra: unknown[] = []
  const projectFile = `${s.root}/.claude/protocols.json`
  let exists = false
  try { exists = await $.fs.exists(projectFile) } catch { exists = false }
  if (exists) {
    try {
      const p = JSON.parse(await $.fs.read(projectFile))
      off = isStrings(p?.off) ? p.off : []
      extra = Array.isArray(p?.protocols) ? p.protocols : []
    } catch (err) {
      s.notes.push(`The project protocol list .claude/protocols.json could not be read (${String(err)}). The shipped defaults apply.`)
    }
  }
  const byName = new Map<string, Protocol>()
  for (const p of [...defaults, ...extra]) {
    if (!validProtocol(p)) {
      s.notes.push(`A protocol entry was ignored because it uses a word the engine does not know: ${JSON.stringify((p as any)?.name ?? p)}.`)
      continue
    }
    byName.set(p.name, p) // a project entry with a default's name replaces it
  }
  const active: Protocol[] = []
  for (const p of byName.values()) {
    if (off.includes(p.name)) continue
    if (p.appliesIf !== undefined) {
      let ok = false
      try { ok = await $.fs.exists(`${s.root}/${p.appliesIf.exists}`) } catch { ok = false }
      if (!ok) continue
    }
    active.push(p)
  }
  // A check whose owner skill is not installed would trap the agent: it is
  // switched off, and the owner is told once. When the list cannot be read,
  // every check stays on.
  let installed: Set<string> | undefined
  try {
    const list = (await $.command.list()) as { name: string }[]
    if (list.length > 0) installed = new Set(list.map((c) => skillName(c.name)))
  } catch { installed = undefined }
  s.protocols = active.filter((p) => {
    if (installed === undefined || p.owner.skill === undefined || installed.has(p.owner.skill)) return true
    s.missing.push(`${p.name} (${p.owner.skill})`)
    return false
  })
  if (s.missing.length > 0) s.notes.push(`These required workflow checks are off because their skill is not installed: ${s.missing.join(', ')}.`)
}

function freshTurn(): Turn {
  return { holds: new Set(), errors: 0, off: false, offNotice: false }
}

async function state($: any): Promise<State> {
  const key = String(await $.session.id())
  let s = states.get(key)
  if (s === undefined) {
    s = {
      key,
      root: slashes(String(await $.session.root())),
      protocols: [],
      notes: [],
      loops: new Map(),
      facts: [],
      seq: 0,
      turn: freshTurn(),
      writers: new Map(),
      pendingDrops: 0,
      turnSeq: 0,
      carried: new Map(),
      carriedNow: new Map(),
      missing: [],
      missingShown: false,
    }
    states.set(key, s)
    await load($, s)
  }
  return s
}

// The command hooks that run before a tool (PreToolUse) get no engine field,
// so the engine also names its active checks in an environment variable that
// every process it starts inherits. It is unset while the engine is off.
async function signal($: any, s: State) {
  const names = s.turn.off ? '' : s.protocols.map((p) => p.name).join(',')
  await $.env.set('TOOLKIT_PROTOCOL_ENGINE', names === '' ? undefined : names)
}

function loopOf(s: State, agentId: string | undefined): Loop {
  const key = agentId ?? 'main'
  let l = s.loops.get(key)
  if (l === undefined) {
    // A helper starts with what the main agent had opened when the helper
    // first acted, so the main agent's opening counts for a helper it starts.
    const main = agentId === undefined ? undefined : loopOf(s, undefined)
    l = { turn: new Set(main?.turn ?? []), reset: new Set(main?.reset ?? []), session: new Set(main?.session ?? []) }
    s.loops.set(key, l)
  }
  return l
}

function engineError(s: State | undefined, $: any, where: string, err: unknown) {
  try { $.ui.log(`protocol-guard error in ${where}: ${String(err)}`, { to: 'debug' }) } catch { /* never throws */ }
  if (s === undefined) return
  s.turn.errors++
  if (s.turn.errors >= 2) {
    s.turn.off = true
    s.turn.offNotice = true
    signal($, s).catch(() => undefined)
  }
}

function record(s: State, fact: NewFact) {
  s.seq++
  s.facts.push({ ...fact, seq: s.seq })
}

// ---------- reading one tool call ----------

type Touch = { path: string; shell: boolean }

// The project files a call would change. A shell command counts every file
// word of every command except commands that only read.
function touches(s: State, cwd: string, e: any): Touch[] | undefined {
  if (FILE_TOOLS.has(e.tool)) {
    const p = e.file_path ?? e.notebook_path
    if (typeof p !== 'string' || p === '') return undefined // cannot decide
    return [{ path: relative(s.root, absolute(cwd, p)), shell: false }]
  }
  if (e.tool === 'Bash') {
    if (typeof e.command !== 'string') return undefined
    const out: Touch[] = []
    let dir = cwd
    for (const cmd of readCommand(e.command).commands) {
      if (cmd.program === 'cd' && typeof cmd.args[0] === 'string') { dir = absolute(dir, cmd.args[0]); continue }
      if (onlyReads(cmd)) continue
      for (const w of fileWords(cmd)) out.push({ path: relative(s.root, absolute(dir, w)), shell: true })
    }
    return out
  }
  return []
}

// The facts a successful call adds. Shell facts used to satisfy a
// requirement come only from commands that must have exited 0.
function factsOf(s: State, cwd: string, e: any, agent: string): NewFact[] {
  const out: NewFact[] = []
  if (FILE_TOOLS.has(e.tool)) {
    const p = e.file_path ?? e.notebook_path
    if (typeof p === 'string') out.push({ kind: 'write', path: relative(s.root, absolute(cwd, p)), agent, certain: true })
    return out
  }
  if (e.tool === 'Bash' && typeof e.command === 'string') {
    const { commands, certain } = readCommand(e.command)
    let dir = cwd
    for (const cmd of commands) {
      if (cmd.program === 'cd' && typeof cmd.args[0] === 'string') { dir = absolute(dir, cmd.args[0]); continue }
      const sure = certain.includes(cmd)
      if (changesWorkItem(cmd)) out.push({ kind: 'work-item', agent })
      const script = nodeScript(cmd)
      if (script !== undefined && sure) out.push({ kind: 'ran', script, agent })
      if (!onlyReads(cmd)) for (const w of fileWords(cmd)) out.push({ kind: 'write', path: relative(s.root, absolute(dir, w)), agent, certain: sure })
    }
    return out
  }
  if (typeof e.tool === 'string' && e.tool.startsWith('mcp__')) {
    const name = e.tool.slice(e.tool.lastIndexOf('__') + 2)
    // A label change counts only when a label has the stage form, such as 08-build.
    const stage = Array.isArray(e.labels) && e.labels.some((l: unknown) => STAGE_LABEL.test(String(l)))
    const changesState = e.state !== undefined || stage
    if ((name === 'issue_write' && (e.method === 'create' || (e.method === 'update' && changesState)))
      || name === 'create_issue'
      || (name === 'update_issue' && changesState)) out.push({ kind: 'work-item', agent })
  }
  return out
}

// The review actions a call takes: shell commands, or GitHub tools by name.
function actionsOf(e: any): string[] {
  if (e.tool === 'Bash') {
    if (typeof e.command !== 'string') return []
    return readCommand(e.command).commands.flatMap((c: any) => reviewActions(c))
  }
  if (typeof e.tool === 'string' && e.tool.startsWith('mcp__')) {
    const name = e.tool.slice(e.tool.lastIndexOf('__') + 2)
    if (name === 'create_pull_request') return ['pr-create']
    if (name === 'merge_pull_request' || name === 'enable_pr_auto_merge') return ['pr-merge']
    if ((name === 'issue_write' && e.method === 'update' && e.state === 'closed') || (name === 'update_issue' && e.state === 'closed')) return ['issue-close']
  }
  return []
}

function succeeded(e: any, r: any): boolean {
  if (r === undefined || r === null || r.deny !== undefined || r.isError === true) return false
  if (e.tool === 'Bash') {
    const res = r.result ?? {}
    if (res.interrupted === true || res.backgroundTaskId !== undefined) return false
  }
  return true
}

// ---------- the checks ----------

// The refusal for a call, or undefined to let it run.
async function refusal($: any, s: State, e: any, loop: Loop, agent: string): Promise<string | undefined> {
  const failed: string[] = []
  const actions = actionsOf(e)
  if (actions.length > 0) {
    for (const p of s.protocols) {
      if (p.on.action === undefined || !actions.some((a) => p.on.action!.includes(a))) continue
      const opened = p.require.find((r): r is Extract<Require, { opened: 'owner' }> => 'opened' in r)
      if (opened === undefined) continue
      const window = opened.within === 'turn' ? loop.turn : opened.within === 'reset' ? loop.reset : loop.session
      if (!window.has(ownerKey(p.owner))) failed.push(`Required workflow check ${p.name}: ${p.tell}`)
    }
  }
  const writers = s.protocols.filter((p) => p.on.write !== undefined)
  if (writers.length === 0 || !(FILE_TOOLS.has(e.tool) || e.tool === 'Bash')) return failed.length === 0 ? undefined : refusalText(failed)
  const cwd = slashes(String(await $.session.cwd()))
  const t = touches(s, cwd, e)
  if (t === undefined) return 'Required workflow check: the file this call changes could not be read, so the call was refused. Name the file path in the call. ' + NO_MENTION
  for (const p of writers) {
    for (const touch of t) {
      if (touch.shell && p.on.shell !== true) continue
      if (!covers(touch.path, p.on.write ?? [])) continue
      if (p.require.some((r) => 'never' in r)) { failed.push(`Required workflow check ${p.name}: ${p.tell}`); break }
      const opened = p.require.find((r): r is Extract<Require, { opened: 'owner' }> => 'opened' in r && (r.paths === undefined || covers(touch.path, r.paths)))
      if (opened !== undefined) {
        const has = (opened.within === 'turn' ? loop.turn : opened.within === 'reset' ? loop.reset : loop.session).has(ownerKey(p.owner))
        if (!has) { failed.push(`Required workflow check ${p.name}: ${p.tell}`); break }
      }
      if (p.on.oneWriter !== undefined && covers(touch.path, p.on.oneWriter)) {
        const other = s.writers.get(touch.path)
        if (other !== undefined && other !== agent && other !== 'main') {
          const running = ((await $.agent.list()) as any[]).some((a) => a.id === other && a.status === 'running')
          if (running) { failed.push(`Required workflow check ${p.name}: another agent's save of ${touch.path} is still running. Wait for it to finish, then read the file again before changing it.`); break }
        }
      }
    }
  }
  if (failed.length === 0) return undefined
  return refusalText(failed)
}

// Why a turn-end protocol is not met, or undefined when it is met or not due.
function unmetReason(s: State, p: Protocol): string | undefined {
  const t = p.on.turnEnd
  if (t === undefined) return undefined
  let trigger: Fact | undefined
  const from = s.carriedNow.get(p.name) ?? s.turnSeq
  for (const f of s.facts) {
    if (f.seq <= from) continue
    if (t.afterWorkItemChange === true && f.kind === 'work-item') trigger = f
    if (t.afterWrite !== undefined && f.kind === 'write' && covers(f.path, t.afterWrite)) trigger = f
  }
  if (trigger === undefined) return undefined
  const after = s.facts.filter((f) => f.seq > trigger!.seq)
  const what = trigger.kind === 'write' ? `${trigger.path} changed` : 'a work item changed'
  for (const r of p.require) {
    if ('wrote' in r) {
      if (!after.some((f) => f.kind === 'write' && f.certain && covers(f.path, r.wrote))) return `${what}, and ${r.wrote.join(', ')} was not written after that`
    }
    if ('ran' in r) {
      let from = trigger.seq
      for (const script of r.ran) {
        const hit = after.find((f) => f.seq > from && f.kind === 'ran' && f.script === script)
        if (hit === undefined) return `${what}, and ${r.ran.join(' then ')} did not both finish with exit code 0 after that`
        from = hit.seq
      }
    }
  }
  return undefined
}

// A save by a helper that is still running is pending: the obligation stays
// open for the next turn, and the reply is not held for it now.
// Only a helper that wrote a knowledge file since `since` counts: this turn,
// or, for a carried check, since the turn it was first carried from.
async function helperSavePending($: any, s: State, since: number): Promise<boolean> {
  const savers = new Set(s.facts.filter((f) => f.seq > since && f.kind === 'write' && f.agent !== 'main' && covers(f.path, ['knowledge/'])).map((f) => f.agent))
  if (savers.size === 0) return false
  const running = ((await $.agent.list()) as any[]).filter((a) => a.status === 'running').map((a) => a.id)
  return running.some((id) => savers.has(id))
}

async function openAtTurnEnd($: any, s: State): Promise<{ p: Protocol; reason: string }[]> {
  const out: { p: Protocol; reason: string }[] = []
  for (const p of s.protocols) {
    const reason = unmetReason(s, p)
    if (reason === undefined) { s.carried.delete(p.name); continue }
    // Pending: not held now; checked again at the end of the next turn, from
    // the turn it was first carried.
    const since = s.carriedNow.get(p.name) ?? s.turnSeq
    if (await helperSavePending($, s, since)) { s.carried.set(p.name, since); continue }
    out.push({ p, reason })
  }
  return out
}

// ---------- the engine ----------

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    try {
      // A plugin reload fires this again: start this session's record over.
      states.delete(String(await $.session.id()))
      await signal($, await state($))
    } catch (err) { engineError(undefined, $, 'session.start', err) }
    return next(e)
  })

  on('session.end', async ($, e, next) => {
    states.delete(String(e.sessionId))
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    try {
      const s = await state($)
      s.turn = freshTurn()
      s.pendingStop = undefined
      s.pendingDrops = 0
      s.heldDraft = undefined
      s.turnSeq = s.seq
      s.carriedNow = s.carried
      s.carried = new Map()
      loopOf(s, undefined)
      for (const l of s.loops.values()) l.turn.clear()
      await signal($, s)
    } catch (err) { engineError(undefined, $, 'turn.start', err) }
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const r: any = await next(e)
    try {
      if (e.trigger !== 'precompute' && r?.messages !== undefined) {
        const s = await state($)
        // The owner's text may no longer be in context: skills must be opened again.
        const loops = e.agentId === undefined ? [...s.loops.values()] : [loopOf(s, e.agentId)]
        for (const l of loops) { l.turn.clear(); l.reset.clear() }
      }
    } catch (err) { engineError(undefined, $, 'session.compact', err) }
    return r
  })

  // A load problem is told to the agent once, with the next prompt.
  on('prompt.submit', async ($, e, next) => {
    try {
      const s = await state($)
      if (s.notes.length > 0) {
        const notes = s.notes.splice(0)
        return next({ ...e, context: [...(e.context ?? []), ...notes] })
      }
    } catch (err) { engineError(undefined, $, 'prompt.submit', err) }
    return next(e)
  })

  // Old command hooks read this field to know which checks run now.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    try {
      const s = await state($)
      return next({ ...e, toolkit_protocol_engine: { version: VERSION, active: s.protocols.map((p) => p.name) } } as typeof e)
    } catch { return next(e) }
  })
  on('classic.Stop', async ($, e, next) => {
    let s: State | undefined
    try { s = await state($) } catch { return next(e) }
    const pending = s.pendingStop
    s.pendingStop = undefined
    const r = s.turn.off
      ? await next(e)
      : await next({ ...e, toolkit_protocol_engine: { version: VERSION, active: s.protocols.map((p) => p.name) } } as typeof e)
    // A held reply: continue the turn with the note.
    if (pending !== undefined && !s.turn.off) return { ...r, block: r.block ? `${r.block}\n\n${pending}` : pending }
    return r
  })

  // A skill typed as /name, or preloaded, opens it for the main agent.
  on('skill.prompt', async ($, e, next) => {
    const r = await next(e)
    try {
      if (skillCallsInFlight === 0) {
        const s = await state($)
        const main = loopOf(s, undefined)
        const key = `skill:${skillName(e.skill)}`
        main.turn.add(key); main.reset.add(key); main.session.add(key)
      }
    } catch (err) { engineError(undefined, $, 'skill.prompt', err) }
    return r
  })

  // The tool guard and the fact recorder.
  on('tool.call', async ($, e, next) => {
    const ev: any = e
    let s: State | undefined
    let loop: Loop | undefined
    const agent = e.agentId ?? 'main'
    try {
      s = await state($)
      loop = loopOf(s, e.agentId)
    } catch (err) {
      engineError(undefined, $, 'tool.call', err)
      return { deny: `Required workflow check could not run. Try the call again. ${NO_MENTION}` }
    }
    if (s.turn.off) return next(e)

    // Before the call: fails closed.
    if (FILE_TOOLS.has(ev.tool) || ev.tool === 'Bash' || String(ev.tool).startsWith('mcp__')) {
      try {
        const why = await refusal($, s, ev, loop, agent)
        if (why !== undefined) return { deny: why }
      } catch (err) {
        engineError(s, $, 'tool check', err)
        return { deny: `Required workflow check could not run, so the call was refused. Try it again. ${NO_MENTION}` }
      }
    }

    if (ev.tool === 'Skill') skillCallsInFlight++
    let r: any
    try { r = await next(e) } finally { if (ev.tool === 'Skill') skillCallsInFlight-- }

    // After the call: only a call that succeeded counts, in order.
    try {
      if (!succeeded(ev, r)) return r
      if (ev.tool === 'Skill') {
        const key = `skill:${skillName(ev.skill)}`
        loop.turn.add(key); loop.reset.add(key); loop.session.add(key)
        return r
      }
      if (ev.tool === 'Read' && typeof ev.file_path === 'string') {
        const abs = absolute(slashes(String(await $.session.cwd())), ev.file_path)
        if (abs.endsWith('/SKILL.md')) {
          const parts = abs.split('/')
          const key = `skill:${parts[parts.length - 2]}`
          loop.turn.add(key); loop.reset.add(key); loop.session.add(key)
        }
        const rel = relative(s.root, abs)
        for (const p of s.protocols) {
          if (p.owner.file !== undefined && p.owner.file === rel) { loop.turn.add(ownerKey(p.owner)); loop.reset.add(ownerKey(p.owner)); loop.session.add(ownerKey(p.owner)) }
        }
        return r
      }
      const cwd = slashes(String(await $.session.cwd()))
      for (const f of factsOf(s, cwd, ev, agent)) {
        record(s, f)
        if (f.kind === 'write') s.writers.set(f.path, agent)
      }
    } catch (err) { engineError(s, $, 'tool record', err) }
    return r
  }).catch(async ($, e, next) => {
    if (next.called) return undefined // the tool already ran; nothing left to refuse
    const s = states.get(String(await $.session.id()))
    engineError(s, $, 'tool.call timeout', next.error.message ?? next.error.kind)
    if (s?.turn.off === true) return undefined
    return { deny: `Required workflow check could not run, so the call was refused. Try it again. ${NO_MENTION}` }
  })

  // The reply hold. Fails open: on any problem the reply is shown.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e) // helpers' replies are not shown to the reader
    let s: State | undefined
    let open: { p: Protocol; reason: string }[] = []
    try {
      s = await state($)
      if (!s.turn.off) open = (await openAtTurnEnd($, s)).filter((o) => !s!.turn.holds.has(o.p.name))
    } catch (err) {
      engineError(s, $, 'reply check', err)
      if (s !== undefined) s.turn.offNotice = true
      open = []
    }
    // A reply already held this turn waits for the classic Stop event, which
    // continues the turn with the note. Claude Code may ask for a visible
    // reply first; that one is held back too.
    if (s !== undefined && s.pendingStop !== undefined && s.pendingDrops < 2) {
      s.pendingDrops++
      const waiting = next(e)
      for await (const c of waiting) if (c.kind !== 'text') yield c
      return { ...(await waiting.result), answer: '' }
    }
    if (s === undefined || open.length === 0) return yield* next(e) // streams as normal

    const stream = next(e)
    const held: any[] = []
    for await (const c of stream) held.push(c)
    const result: any = await stream.result

    let note: string | undefined
    try {
      if (result.stopReason === 'end_turn') {
        const hold = (await openAtTurnEnd($, s)).filter((o) => !s!.turn.holds.has(o.p.name))
        if (hold.length > 0) {
          const owner = hold[0].p.owner
          const lines = hold.map((o) => `${o.p.name}: ${o.reason}. ${o.p.tell}`)
          note = `${HOLD_INTRO} It held back your reply before the reader saw it.\nMissing step:\n${lines.join('\n')}\nOpen ${owner.skill !== undefined ? `the ${owner.skill} skill` : owner.file}, do the missing step now, then write your reply again. ${OWNER_ASKED} ${NO_MENTION}`
          for (const o of hold) s.turn.holds.add(o.p.name)
          s.pendingStop = note
          s.pendingDrops = 0
          if (s.heldDraft === undefined) s.heldDraft = held.filter((c) => c.kind === 'text').map((c) => c.text).join('')
        }
      }
    } catch (err) {
      engineError(s, $, 'reply check', err)
      s.turn.offNotice = true
      note = undefined
    }

    if (note === undefined) {
      for (const c of held) yield c
      return result
    }

    // Drop the draft reply before display. The classic Stop event that follows
    // then continues the turn with the note, as a Stop hook's block does, and
    // the agent does the step and writes the reply again itself.
    for (const c of held) if (c.kind !== 'text') yield c
    return { ...result, answer: '' }
  })

  // One line beneath the answer: the checks were off after an error, or a
  // required step was still missing after its one hold.
  on('turn.complete', async ($, e, next) => {
    const r: any = await next(e)
    if (e.agentId !== undefined) return r
    try {
      const s = states.get(String(await $.session.id()))
      if (s === undefined) return r
      const lines: string[] = []
      // The continuation after a hold ended with no reply (an error or an
      // interrupt): show the held draft rather than nothing.
      const draft = s.heldDraft
      s.heldDraft = undefined
      if (draft !== undefined && draft !== '' && (e.answer === '' || e.reason !== 'answer')) lines.push(draft)
      if (s.missing.length > 0 && !s.missingShown) {
        s.missingShown = true
        lines.push(`Workflow checks off because their skill is not installed: ${s.missing.join(', ')}.`)
      }
      if (s.turn.offNotice) lines.push(OFF_NOTICE)
      else if (e.reason === 'answer') {
        const still = (await openAtTurnEnd($, s)).filter((o) => s.turn.holds.has(o.p.name))
        if (still.length > 0) lines.push(`Required workflow check not met after one retry: ${still.map((o) => o.p.name).join(', ')}.`)
      }
      if (lines.length === 0) return r
      return { ...r, text: lines.join('\n') }
    } catch (err) { engineError(undefined, $, 'turn.complete', err); return r }
  })
}
