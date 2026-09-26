// A small shell reader for the PreToolUse gate. It splits a command into simple
// commands, respecting quotes, and notes redirection targets. Heredoc bodies are
// skipped. It is deliberately conservative: anything it cannot read counts as
// "not only flow".

const OPERATORS = ['&&', '||', ';', '|', '&', '\n'];

export function splitCommands(command) {
  const segments = [];
  let tokens = [];
  let redirects = [];
  let word = null;
  let pendingRedirect = false;
  let heredocs = [];
  let opaque = false;
  const src = String(command || '');

  const endWord = () => {
    if (word === null) return;
    if (pendingRedirect) {
      redirects.push(word);
      pendingRedirect = false;
    } else {
      tokens.push(word);
    }
    word = null;
  };
  const endSegment = () => {
    endWord();
    if (tokens.length || redirects.length) segments.push({ tokens, redirects, opaque });
    tokens = [];
    redirects = [];
    opaque = false;
  };

  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (c === "'") {
      const end = src.indexOf("'", i + 1);
      if (end < 0) { opaque = true; word = (word || '') + src.slice(i + 1); break; }
      word = (word || '') + src.slice(i + 1, end);
      i = end;
    } else if (c === '"') {
      let j = i + 1;
      let buf = '';
      while (j < src.length && src[j] !== '"') {
        if (src[j] === '\\' && j + 1 < src.length) { buf += src[j + 1]; j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '(') opaque = true;
        if (src[j] === '`') opaque = true;
        buf += src[j];
        j += 1;
      }
      word = (word || '') + buf;
      i = j;
    } else if (c === '\\' && i + 1 < src.length) {
      if (src[i + 1] !== '\n') word = (word || '') + src[i + 1];
      i += 1;
    } else if (c === '$' && src[i + 1] === '(') {
      opaque = true;
      word = (word || '') + c;
    } else if (c === '`') {
      opaque = true;
      word = (word || '') + c;
    } else if (c === '<' && src[i + 1] === '<') {
      endWord();
      let j = i + 2;
      if (src[j] === '-') j += 1;
      while (src[j] === ' ') j += 1;
      const m = /^(['"]?)([A-Za-z_][\w]*)\1/.exec(src.slice(j));
      if (m) {
        heredocs.push(m[2]);
        i = j + m[0].length - 1;
      } else {
        i += 1;
      }
    } else if (c === '>' || c === '<') {
      // A digit right before, as in 2>, names a file descriptor, not an argument.
      if (word !== null && /^\d+$/.test(word)) word = null;
      endWord();
      if (c === '>') pendingRedirect = true;
      if (src[i + 1] === '&' && /[\d-]/.test(src[i + 2] || '')) {
        // >&1 or 2>&- duplicates or closes a descriptor. No file is written.
        i += 2;
        while (/\d/.test(src[i + 1] || '')) i += 1;
        pendingRedirect = false;
        continue;
      }
      if (src[i + 1] === '>' || src[i + 1] === '&' || src[i + 1] === '|') i += 1;
      if (c === '<') pendingRedirect = false;
    } else if (c === '\n' && heredocs.length) {
      endSegment();
      // Skip each heredoc body up to its closing line.
      let pos = i + 1;
      for (const delim of heredocs) {
        const re = new RegExp(`^[\\t ]*${delim}[\\t ]*$`, 'm');
        const rest = src.slice(pos);
        const m = re.exec(rest);
        pos = m ? pos + m.index + m[0].length : src.length;
      }
      heredocs = [];
      i = pos - 1;
    } else if (OPERATORS.includes(c)) {
      endSegment();
      if ((c === '&' || c === '|') && src[i + 1] === c) i += 1;
    } else if (c === ' ' || c === '\t') {
      endWord();
    } else if (c === '(' || c === ')' || c === '{' || c === '}') {
      endSegment();
      opaque = opaque || c === '(';
    } else {
      word = (word || '') + c;
    }
  }
  endSegment();
  return segments;
}

// The program of a simple command, skipping VAR=value prefixes and `env`.
export function programOf(tokens) {
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i += 1;
  if (tokens[i] === 'env') {
    i += 1;
    while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i += 1;
  }
  return { program: tokens[i] || '', args: tokens.slice(i + 1) };
}

export function isFlowProgram(program, args) {
  if (program === 'flow' || /(^|\/)bin\/flow$/.test(program)) return { flow: true, args };
  if (program === 'node' && args[0] && /(^|\/)bin\/flow$/.test(args[0])) return { flow: true, args: args.slice(1) };
  return { flow: false, args };
}
