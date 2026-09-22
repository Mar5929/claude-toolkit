// Issue 396, part C prototype: the reply check.
//
// On the main agent's final reply of a turn (turn.step, stopReason end_turn):
//   1. hold every piece of the reply back from the screen;
//   2. ask a small model to judge the reply against the selected output style,
//      read at run time from the system prompt section the engine sends;
//   3. PASS, or the judge is unavailable, or the retry limit is used up:
//      show the reply unchanged;
//   4. FAIL: drop the reply's text and make this step call the plugin's own
//      tool `reply_check`. That tool's result hands the main agent its own
//      held-back draft and the reason, and the agent writes the reply again.
//      The small model never writes any of the reply.
import type { Register } from 'claude-code'

const TOOL = 'reply_check'
const DEFAULT_MAX_RETRIES = 1

const JUDGE_SYSTEM = `You check one chat reply before the user sees it. The user's writing style is below, between <style> and </style>. It is the only rule set. Do not add rules of your own.

Fail the reply only for a break that matters to the reader: words they would not understand, a decision they could not make from the reply, or something the style says to leave out. Word choice that is only less than ideal is not a fault. You must be able to quote the words that break the style. A fact, name, number, or date is never a fault by itself; a name is a fault only when the style asks for an explanation and none is given. Do not fail for length alone.

Answer with JSON only, one line:
{"verdict":"PASS"}
or
{"verdict":"FAIL","reason":"<every break you found: quote the words, then name the rule they break>"}`

async function log($: any, entry: Record<string, unknown>) {
  const path = `${$.plugin.root}/../log.jsonl`
  let old = ''
  try { old = await $.fs.read(path) } catch { old = '' }
  await $.fs.write(path, old + JSON.stringify({ t: await $.clock.now(), ...entry }) + '\n')
}

// The style text in force: the system prompt section that carries the output
// style, captured by the prompt.section hook below.
async function styleText($: any): Promise<string> {
  const s = await $.store.get('styleSection')
  if (typeof s === 'string' && s !== '') return s
  // Otherwise read the selected style's file now, so the check always uses
  // the current text. The name comes from the /config row, a fact the engine
  // reports; the file is the one whose front matter carries that name.
  const rows: any[] = await $.config.list()
  const row = rows.find((r: any) => r.key === 'outputStyle')
  await log($, { hook: 'styleText', row: row ?? null })
  const name = row ? String(row.value) : ''
  if (name === '') return ''
  const home = await $.env.get('CLAUDE_CONFIG_DIR')
  for (const dir of ['.claude/output-styles', home ? `${home}/output-styles` : '']) {
    if (dir === '') continue
    let entries: any[] = []
    try { entries = await $.fs.list(dir) } catch { continue }
    for (const f of entries) {
      if (!String(f.name).endsWith('.md')) continue
      const text: string = await $.fs.read(`${dir}/${f.name}`)
      const header = text.startsWith('---') ? text.slice(3, text.indexOf('\n---', 3)) : ''
      const line = header.split('\n').find((l: string) => l.startsWith('name:'))
      if (line !== undefined && line.slice(5).trim().replace(/^["']|["']$/g, '') === name) {
        return text.slice(text.indexOf('\n---', 3) + 4).trim()
      }
    }
  }
  return ''
}

async function recentChat($: any): Promise<string> {
  const msgs: any = await $.session.messages()
  if (!Array.isArray(msgs)) return ''
  await log($, { hook: 'recentChat', messages: msgs.length })
  return msgs.slice(-8)
    .filter((m: any) => typeof m.text === 'string' && m.text.trim() !== '')
    .map((m: any) => `${m.role}: ${m.text.slice(0, 2000)}`)
    .join('\n\n')
}

async function judge($: any, reply: string, context?: string): Promise<{ failed: boolean, reason: string, note: string }> {
  const style = await styleText($)
  if (style === '') return { failed: false, reason: '', note: 'no style section captured' }
  const forced = await $.env.get('RC_FORCE_FAIL')
  if (forced === '1') return { failed: true, reason: 'Forced failure for the retry-limit test.', note: 'forced' }
  const model = (await $.env.get('RC_JUDGE_MODEL')) || 'haiku'
  const r = await $.model.complete({
    model, effort: 'low', maxTokens: 600, timeoutMs: 15000,
    system: `${JUDGE_SYSTEM}\n\n<style>\n${style}\n</style>`,
    prompt: `Recent messages, for context only:\n<<<\n${context ?? await recentChat($)}\n>>>\n\nThe reply to check:\n<<<\n${reply}\n>>>`,
  })
  if (!r.isAnswered) return { failed: false, reason: '', note: `judge unavailable: ${r.reason}` }
  // Read the judge's own answer: its verdict field, and its reason.
  let parsed: any
  try { parsed = JSON.parse(r.text.slice(r.text.indexOf('{'), r.text.lastIndexOf('}') + 1)) } catch { parsed = undefined }
  if (parsed !== undefined && (parsed.verdict === 'PASS' || parsed.verdict === 'FAIL')) {
    return { failed: parsed.verdict === 'FAIL', reason: String(parsed.reason ?? ''), note: parsed.verdict }
  }
  // Broken JSON (usually an unescaped quote inside the reason): the verdict
  // field is still there to read; the whole answer serves as the reason.
  if (r.text.includes('"verdict":"FAIL"')) return { failed: true, reason: r.text, note: 'FAIL (answer was not valid JSON)' }
  if (r.text.includes('"verdict":"PASS"')) return { failed: false, reason: '', note: 'PASS (answer was not valid JSON)' }
  return { failed: false, reason: '', note: `judge answer not readable: ${r.text}` }
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    try {
      const reg: any = await $.tool.register({
        name: TOOL,
        description: 'Used only by the reply check. Never call it yourself.',
        inputSchema: { type: 'object', properties: {} },
      })
      await $.store.set('toolName', reg.tool)
      await log($, { hook: 'session.start', registered: reg.tool })
    } catch (err: any) {
      await log($, { hook: 'session.start', registerError: String(err?.message ?? err) })
    }
    return r
  })

  on('prompt.section', async ($, e, next) => {
    const r: any = await next(e)
    await log($, { hook: 'prompt.section', name: e.name, chars: r?.text?.length ?? null, head: typeof r?.text === 'string' ? r.text.slice(0, 80) : null })
    if (typeof r?.text === 'string' && /output.?style/i.test(e.name)) {
      await $.store.set('styleSection', r.text)
    }
    return r
  })

  on('turn.start', async ($, e, next) => {
    await $.store.set('retries', 0)
    // Test harness only: judge stored replies with the same judge call.
    const only = await $.env.get('RC_JUDGE_ONLY')
    if (only) {
      const repeat = Number((await $.env.get('RC_JUDGE_REPEAT')) || 1)
      const items = String(await $.fs.read(only)).split('\n=====ITEM=====\n')
      for (const item of items) {
        const [name, text] = item.split('\n#####\n')
        const ctx = name.startsWith('DF-2') ? 'user: For my decisions: 1. I don\'t know what those five items are. When you say "the five-item deploy," I don\'t know what you mean by that. You can deploy it, and I can just approve it. 2. I don\'t know. It\'s whatever you recommend. 3. I don\'t know what you recommend. 4. For the memory save proposal, is that really the format that the toolkit, the knowledge system, proposes?'
          : name.startsWith('DF-3') ? 'user: Okay, first question is: are you running on the most up-to-date toolkit, all the hooks and everything for the knowledge system?' : ''
        for (let i = 0; i < repeat; i++) {
          const t0 = await $.clock.now()
          const v = await judge($, text, ctx)
          const t1 = await $.clock.now()
          await log($, { hook: 'judge-only', item: name, run: i, failed: v.failed, reason: v.reason, ms: t1 - t0 })
        }
      }
    }
    return next(e)
  })

  // The plugin's own tool: answer it here, with no permission prompt.
  on('tool.call', async ($, e, next) => {
    const name = await $.store.get('toolName')
    if (typeof name !== 'string' || e.tool !== name) return next(e)
    const held = await $.store.get('heldReply')
    const reason = await $.store.get('heldReason')
    if (typeof held !== 'string' || held === '') return { result: 'Nothing is held back. Carry on.' }
    await $.store.set('heldReply', '')
    const text = `Your last reply was held back before the user saw it. The user has not seen any of it.\n\nWhy: ${reason}\n\nYour held-back reply:\n<<<\n${held}\n>>>\n\nWrite the whole reply again. Fix every point above, and check the rest of the reply against the output style too. Keep every fact, number, name, and date. Do not mention this check.`
    await log($, { hook: 'tool.call', answered: name })
    return { result: text }
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    const started = await $.clock.now()
    const stream = next(e)
    const held: any[] = []
    const textByBlock = new Map<number, string>()
    for await (const c of stream) {
      held.push(c)
      if (c.kind === 'text') textByBlock.set(c.index, (textByBlock.get(c.index) ?? '') + c.text)
    }
    const result = await stream.result
    const modelDone = await $.clock.now()
    const text = [...textByBlock.values()].join('')
    try {
      if (result.stopReason !== 'end_turn' || text.trim() === '') {
        for (const c of held) yield c
        return result
      }
      const retries = Number((await $.store.get('retries')) ?? 0)
      const MAX_RETRIES = Number((await $.env.get('RC_MAX_RETRIES')) || DEFAULT_MAX_RETRIES)
      const toolName = await $.store.get('toolName')
      const always = (await $.env.get('RC_JUDGE_ALWAYS')) === '1'
      if (!always && (retries >= MAX_RETRIES || typeof toolName !== 'string')) {
        await log($, { hook: 'turn.step', step: e.index, action: 'shown unchecked', retries, toolName: toolName ?? null, reply: text })
        for (const c of held) yield c
        return result
      }
      const v = await judge($, text)
      const judged = await $.clock.now()
      await log($, { hook: 'turn.step', step: e.index, failed: v.failed, reason: v.reason, note: v.note, reply: text, modelMs: modelDone - started, judgeMs: judged - modelDone })
      if (!v.failed || retries >= MAX_RETRIES || typeof toolName !== 'string') {
        if (v.failed) await log($, { hook: 'turn.step', step: e.index, action: 'failed again; retry limit reached; shown anyway' })
        for (const c of held) yield c
        return result
      }
      // Send the main agent back: drop the text, call reply_check instead.
      await $.store.set('retries', retries + 1)
      await $.store.set('heldReply', text)
      await $.store.set('heldReason', v.reason)
      let toolIndex = 0
      for (const c of held) {
        if (c.kind === 'text' || c.kind === 'stop') continue
        if (typeof c.index === 'number' && c.index >= toolIndex) toolIndex = c.index + 1
        yield c
      }
      const id = 'toolu_rc' + String(await $.clock.now())
      yield { kind: 'tool', index: toolIndex, id, name: toolName }
      yield { kind: 'input', index: toolIndex, json: '{}' }
      yield { kind: 'stop', stopReason: 'tool_use', usage: result.usage }
      return { ...result, answer: '', toolUses: [{ name: toolName, input: {} }], stopReason: 'tool_use' }
    } catch (err: any) {
      // Never lose the reply: on any error show it unchanged.
      try { await log($, { hook: 'turn.step', error: String(err?.message ?? err) }) } catch { }
      for (const c of held) yield c
      return result
    }
  }).catch(async function* ($, e, next) {
    return yield* next(e)
  })
}
