// Shell command reader for the protocol-guard engine (issue #396, decision 7).
//
// Reads what a shell command runs: each command's program, its arguments,
// and the files it redirects output to. It never reads the agent's words:
// quoted text is one argument, and a heredoc body is dropped, so a commit
// message that mentions a path is never taken for that path.
//
// Plain JavaScript with no imports, because a function-hook module has no
// Node. tests/protocol-guard-check.mjs compares it with the command hooks'
// reader, plugins/second-brain/hooks/command-parsing.mjs, on one command list.

const OPERATORS = ['&&', '||', ';;', ';', '|&', '|', '&', '\n', '(', ')']
const REDIRECT = /^(\d*|&)(>>?|>\||<)$/
const WRAPPERS = new Set(['sudo', 'env', 'command', 'time', 'nohup', 'exec'])

// Splits a command into words and operators. A word keeps its quotes removed;
// `quoted` marks a word that had any quoted part.
export function tokenize(command) {
  const tokens = []
  let word = ''
  let inWord = false
  let quoted = false
  const heredocs = []
  const push = () => {
    if (inWord) tokens.push({ kind: 'word', text: word, quoted })
    word = ''
    inWord = false
    quoted = false
  }
  let i = 0
  const s = String(command ?? '')
  while (i < s.length) {
    const c = s[i]
    if (c === "'") {
      const end = s.indexOf("'", i + 1)
      word += s.slice(i + 1, end < 0 ? s.length : end)
      inWord = true
      quoted = true
      i = end < 0 ? s.length : end + 1
      continue
    }
    if (c === '"') {
      let j = i + 1
      while (j < s.length && s[j] !== '"') {
        if (s[j] === '\\' && j + 1 < s.length) { word += s[j + 1]; j += 2; continue }
        word += s[j]
        j++
      }
      inWord = true
      quoted = true
      i = j + 1
      continue
    }
    if (c === '\\' && i + 1 < s.length) {
      if (s[i + 1] !== '\n') { word += s[i + 1]; inWord = true }
      i += 2
      continue
    }
    if (c === '#' && !inWord) {
      while (i < s.length && s[i] !== '\n') i++
      continue
    }
    if (c === ' ' || c === '\t') { push(); i++; continue }
    // A heredoc: `<<WORD`, `<<-WORD`, `<<'WORD'`. Its body is data and is dropped.
    const here = /^<<(-|~)?[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\2/.exec(s.slice(i))
    if (here !== null) {
      push()
      heredocs.push(here[3])
      i += here[0].length
      continue
    }
    if (c === '<' && s[i + 1] === '<' && s[i + 2] === '<') { push(); tokens.push({ kind: 'word', text: '<<<', quoted: false }); i += 3; continue }
    const op = s.startsWith('&>', i) ? undefined : OPERATORS.find((o) => s.startsWith(o, i))
    if (op !== undefined) {
      push()
      tokens.push({ kind: 'op', text: op })
      i += op.length
      if (op === '\n' && heredocs.length > 0) {
        // Skip each pending heredoc body up to its closing line.
        for (const tag of heredocs.splice(0)) {
          while (i < s.length) {
            const lineEnd = s.indexOf('\n', i)
            const line = s.slice(i, lineEnd < 0 ? s.length : lineEnd)
            i = lineEnd < 0 ? s.length : lineEnd + 1
            if (line.trim() === tag) break
          }
        }
      }
      continue
    }
    if (c === '>' || c === '<' || (c === '&' && s[i + 1] === '>')) {
      // A redirection operator stands alone even when written against a word.
      // `2>&1` and `>&2` point at another descriptor, not a file: dropped.
      let j = c === '&' ? i + 1 : i
      while (j < s.length && (s[j] === '>' || s[j] === '<' || s[j] === '|')) j++
      const prefix = c === '&' ? '&' : inWord && /^\d+$/.test(word) ? word : ''
      if (prefix === '' || c === '&') push()
      word = ''
      inWord = false
      const dup = /^&(\d+|-)/.exec(s.slice(j))
      if (dup !== null) { i = j + dup[0].length; continue }
      tokens.push({ kind: 'word', text: prefix + s.slice(c === '&' ? i + 1 : i, j), quoted: false, redirect: true })
      i = j
      continue
    }
    word += c
    inWord = true
    i++
  }
  push()
  return tokens
}

function basename(path) {
  const p = String(path).split('\\').join('/')
  const i = p.lastIndexOf('/')
  return i >= 0 ? p.slice(i + 1) : p
}

// One simple command: `{ program, args, redirects, words }`.
// `program` is the basename of the first word after `VAR=value` prefixes and
// wrappers such as `sudo` or `env`. `args` are the words after it. `redirects`
// are the files output is written to (`>`, `>>`); `inputs` the files read (`<`).
function simple(words) {
  const redirects = []
  const inputs = []
  const plain = []
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (w.redirect === true && REDIRECT.test(w.text)) {
      const target = words[i + 1]
      if (target !== undefined) (w.text.endsWith('<') ? inputs : redirects).push(target.text)
      i++
      continue
    }
    if (w.redirect === true) continue
    plain.push(w)
  }
  let k = 0
  while (k < plain.length && !plain[k].quoted && /^[A-Za-z_][A-Za-z0-9_]*=/.test(plain[k].text)) k++
  while (k < plain.length && WRAPPERS.has(basename(plain[k].text))) {
    k++
    while (k < plain.length && (plain[k].text.startsWith('-') || /^[A-Za-z_][A-Za-z0-9_]*=/.test(plain[k].text))) k++
  }
  const program = k < plain.length ? basename(plain[k].text) : ''
  return { program, args: plain.slice(k + 1).map((w) => w.text), redirects, inputs }
}

// Reads a whole command line.
//
// Returns `{ commands, certain }`. `commands` lists every simple command in
// order. `certain` lists the ones that must have exited 0 when the whole
// command exited 0: the commands of the last `&&` chain, leaving out any
// command whose output was piped to another. A command before `;`, `||`, `&`
// or a newline may have failed without failing the whole line.
export function readCommand(command) {
  const tokens = tokenize(command)
  const commands = []
  let certain = []
  let newChain = false
  let words = []
  const end = (op) => {
    if (words.length > 0) {
      const cmd = simple(words)
      commands.push(cmd)
      if (newChain) { certain = []; newChain = false }
      // Piped output, or a command sent to the background: its exit code is
      // not the line's exit code.
      if (op !== '|' && op !== '|&' && op !== '&') certain.push(cmd)
    }
    words = []
    if (op === ';' || op === '||' || op === '&' || op === '\n' || op === ';;') newChain = true
  }
  for (const t of tokens) {
    if (t.kind === 'op') {
      end(t.text === '(' || t.text === ')' ? '&&' : t.text)
      continue
    }
    words.push(t)
  }
  end('end')
  return { commands, certain }
}

// The words of a command that name files it may write: its arguments that are
// not flags, and its redirection targets. A flag's own value (`-m text`) is not
// known to be a file, so a word after a flag still counts: a word is only a
// file when it matches a path the caller asks about. `cp`, `install` and `ln`
// write only their target: `-t <dir>` or `--target-directory=<dir>`, or else
// the last word.
const TARGET_ONLY = new Set(['cp', 'install', 'ln'])
export function fileWords(cmd) {
  const words = cmd.args.filter((a) => a !== '' && !a.startsWith('-'))
  if (TARGET_ONLY.has(cmd.program)) {
    const a = cmd.args
    const t = a.findIndex((x) => x === '-t' || x === '--target-directory')
    const eq = a.find((x) => x.startsWith('--target-directory='))
    const target = t >= 0 ? a[t + 1] : eq !== undefined ? eq.slice('--target-directory='.length) : words[words.length - 1]
    return [...(target === undefined ? [] : [target]), ...cmd.redirects]
  }
  return [...words, ...cmd.redirects]
}

// Programs that only read the files they name. A command with one of these as
// its program and no output redirection changes no named file. `sed` counts
// only without `-i`; `git` only with the subcommands listed.
const READERS = new Set([
  'cat', 'head', 'tail', 'less', 'more', 'grep', 'egrep', 'fgrep', 'rg', 'wc', 'ls', 'stat', 'file',
  'diff', 'cmp', 'md5sum', 'sha256sum', 'shasum', 'test', '[', 'realpath', 'readlink', 'basename',
  'dirname', 'echo', 'printf', 'jq', 'nl', 'column', 'du', 'tree', 'find', 'cd', 'pwd',
  'cut', 'tr', 'uniq', 'od', 'xxd', 'bat', 'sort', 'awk', 'gawk',
])
const GIT_READERS = new Set(['status', 'diff', 'log', 'show', 'blame', 'ls-files', 'grep', 'add', 'commit', 'rev-parse', 'cat-file', 'check-ignore'])

// git's subcommand: the first word after its global options. `-C <dir>`,
// `-c <key=value>`, `--git-dir <dir>` and `--work-tree <dir>` take a value.
export function gitSubcommand(cmd) {
  const a = cmd.args
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '-C' || a[i] === '-c' || a[i] === '--git-dir' || a[i] === '--work-tree' || a[i] === '--namespace') { i++; continue }
    if (a[i].startsWith('-')) continue
    return a[i]
  }
  return undefined
}

export function onlyReads(cmd) {
  if (cmd.redirects.some((r) => r !== '/dev/null')) return false
  const a = cmd.args
  if (cmd.program === 'sed') return !a.some((x) => /^-[a-zA-Z]*i/.test(x) || x.startsWith('--in-place'))
  if (cmd.program === 'find') return !a.some((x) => x === '-delete' || x === '-exec' || x === '-execdir' || x === '-fprint')
  if (cmd.program === 'sort') return !a.some((x) => /^-[a-zA-Z]*o/.test(x) || x.startsWith('--output'))
  if (cmd.program === 'awk' || cmd.program === 'gawk') {
    return !a.some((x, i) => x === '--inplace' || x === '-i' && a[i + 1] === 'inplace' || x === '-iinplace' || x === '--include=inplace')
  }
  if (cmd.program === 'git') {
    const sub = gitSubcommand(cmd)
    return sub !== undefined && GIT_READERS.has(sub)
  }
  return READERS.has(cmd.program)
}

// The script a `node` command runs: its first argument that is not a flag.
export function nodeScript(cmd) {
  if (cmd.program !== 'node' && cmd.program !== 'node.exe') return undefined
  const script = cmd.args.find((a) => !a.startsWith('-'))
  return script === undefined ? undefined : basename(script)
}

// True when an `--add-label` or `--remove-label` value names a lifecycle stage.
export const STAGE_LABEL = /^\d{2}-/
function stageLabels(a) {
  for (let i = 0; i < a.length; i++) {
    const m = /^--(add-label|remove-label)(?:=(.*))?$/.exec(a[i])
    if (m === null) continue
    const value = m[2] ?? a[i + 1] ?? ''
    if (value.split(',').some((l) => STAGE_LABEL.test(l.trim()))) return true
  }
  return false
}

// gh's arguments after a leading `-R <repo>`, `--repo <repo>` or `--repo=<repo>`.
export function ghArgs(a) {
  let i = 0
  while (i < a.length) {
    if (a[i] === '-R' || a[i] === '--repo') { i += 2; continue }
    if (a[i].startsWith('--repo=')) { i += 1; continue }
    break
  }
  return a.slice(i)
}

// True when the command creates, closes, reopens, deletes or moves a work item,
// or changes its stage, through `gh` or the work tracker's `work` command.
export function changesWorkItem(cmd) {
  let a = cmd.args
  if (cmd.program === 'gh') {
    a = ghArgs(a)
    if (a[0] === 'issue' && ['create', 'new', 'close', 'reopen', 'delete', 'transfer'].includes(a[1] ?? '')) return true
    // A label edit counts only when a label has the stage form, such as 08-build.
    if (a[0] === 'issue' && a[1] === 'edit') return stageLabels(a)
    if (a[0] === 'project' && a[1] === 'item-edit') return true
    return false
  }
  let sub
  if (cmd.program === 'work') sub = a.filter((x) => !x.startsWith('-'))[0]
  else if (nodeScript(cmd) === 'work.mjs') {
    const rest = a.slice(a.findIndex((x) => !x.startsWith('-')) + 1)
    sub = rest.filter((x) => !x.startsWith('-'))[0]
  } else return false
  const rest = cmd.program === 'work' ? a : a.slice(a.findIndex((x) => !x.startsWith('-')) + 1)
  if (['add', 'finish', 'archive', 'unarchive', 'start'].includes(sub ?? '')) return true
  if (sub === 'update') return rest.some((x) => /^--(stage|status)(=|$)/.test(x))
  if (sub === 'requirements') return rest.some((x) => x === '--finalize' || x === '--reopen')
  return false
}

// The review actions a command takes: `pr-create` (gh pr create), `pr-merge`
// (gh pr merge, with or without --auto), `issue-close` (gh issue close) and
// `work-finish` (the work tracker's `work finish`).
export function reviewActions(cmd) {
  let a = cmd.args
  if (cmd.program === 'gh') {
    a = ghArgs(a)
    // Help and a dry run change nothing.
    if (a.includes('--help') || a.includes('-h')) return []
    if (a[0] === 'pr' && a[1] === 'create') return a.includes('--dry-run') ? [] : ['pr-create']
    if (a[0] === 'pr' && a[1] === 'merge') return ['pr-merge']
    if (a[0] === 'issue' && a[1] === 'close') return ['issue-close']
    return []
  }
  let sub
  if (cmd.program === 'work') sub = a.filter((x) => !x.startsWith('-'))[0]
  else if (nodeScript(cmd) === 'work.mjs') sub = a.slice(a.findIndex((x) => !x.startsWith('-')) + 1).filter((x) => !x.startsWith('-'))[0]
  return sub === 'finish' ? ['work-finish'] : []
}
