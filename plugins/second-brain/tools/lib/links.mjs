#!/usr/bin/env node

/**
 * Ordinary relative Markdown links, in one place.
 *
 * Architecture section 12.4 gives canonical records ordinary relative Markdown
 * links with explicit .md targets, derives backlinks by searching the files
 * themselves, and repairs every affected link when a record moves. Three entry
 * points need the same answer about what a link is and where it points:
 * `memory.mjs related`, validator checks MV-21 and MV-22, and the move
 * transaction in `memory-write.mjs`. Two copies of a link parser is how a
 * repair and a check start disagreeing about the same line, so there is one.
 *
 * This module reads text it is handed and paths it is told about. It writes
 * nothing, builds no registry, graph, index, or cache, and never needs
 * `.memory/` to exist.
 */

import { existsSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

/** A fenced block opens and closes with three or more backticks or tildes. */
const FENCE = /^\s{0,3}(```|~~~)/;

/** `[label](target)` and `![alt](target)`, with an optional quoted title. */
const INLINE = /(!?)\[([^\]]*)\]\(\s*(<[^>]*>|[^)\s]*)((?:\s+"[^"]*")|(?:\s+'[^']*'))?\s*\)/g;

/** A reference definition: `[label]: target "optional title"`. */
const REFERENCE = /^(\s{0,3}\[[^\]]+\]:\s*)(<[^>]*>|\S+)(.*)$/;

/** Anything with a scheme, a protocol-relative host, or a root-absolute path. */
const NOT_RELATIVE = /^(?:[a-zA-Z][a-zA-Z0-9+.-]*:|\/\/|\/|#)/;

function posix(path) {
  return path.split(sep).join("/");
}

/**
 * The character ranges one line spends inside a code span. A link written
 * inside backticks is an example, not a link, so nothing reads or rewrites it.
 */
function codeSpans(line) {
  const spans = [];
  const runs = /`+/g;
  let open = null;
  let match;
  while ((match = runs.exec(line)) !== null) {
    if (open === null) open = { start: match.index, length: match[0].length };
    else if (match[0].length === open.length) {
      spans.push([open.start, match.index + match[0].length]);
      open = null;
    }
  }
  return spans;
}

function insideSpan(spans, index) {
  return spans.some(([start, end]) => index >= start && index < end);
}

/** Strip angle brackets and split an explicit anchor off the path. */
export function splitTarget(raw) {
  let text = String(raw ?? "").trim();
  if (text.startsWith("<") && text.endsWith(">")) text = text.slice(1, -1).trim();
  const hash = text.indexOf("#");
  if (hash === -1) return { path: text, anchor: "" };
  return { path: text.slice(0, hash), anchor: text.slice(hash) };
}

/** An ordinary relative link, as opposed to a URL, a mail address, or an anchor. */
export function isRelativeTarget(path) {
  const text = String(path ?? "");
  if (!text) return false;
  return !NOT_RELATIVE.test(text);
}

/**
 * Every link in one Markdown text, in file order. Fenced blocks and code spans
 * are skipped. Image links are reported with `image: true` so a caller may
 * treat a picture differently from a link to a record.
 */
export function scanLinks(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const found = [];
  let fenced = false;

  lines.forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;

    const spans = codeSpans(line);

    const definition = REFERENCE.exec(line);
    if (definition && !insideSpan(spans, definition[1].length)) {
      const { path, anchor } = splitTarget(definition[2]);
      found.push({
        line: index + 1,
        kind: "reference",
        image: false,
        raw: definition[2],
        path,
        anchor,
        relative: isRelativeTarget(path),
      });
      return;
    }

    INLINE.lastIndex = 0;
    let match;
    while ((match = INLINE.exec(line)) !== null) {
      if (insideSpan(spans, match.index)) continue;
      const { path, anchor } = splitTarget(match[3]);
      found.push({
        line: index + 1,
        kind: "inline",
        image: match[1] === "!",
        raw: match[3],
        path,
        anchor,
        relative: isRelativeTarget(path),
      });
    }
  });

  return found;
}

/**
 * Where one relative link points, as a scope-relative path. A target that
 * climbs out of the scope root returns null, which is what keeps a link scan
 * inside the project it was asked about.
 */
export function resolveLinkTarget(scopeRoot, fromPath, linkPath) {
  if (!isRelativeTarget(linkPath)) return null;
  const decoded = decodeURI(linkPath);
  const absolute = resolve(dirname(resolve(scopeRoot, fromPath)), decoded);
  const inside = relative(scopeRoot, absolute);
  if (!inside || inside.startsWith("..") || resolve(scopeRoot, inside) !== absolute) return null;
  return posix(inside);
}

/** The relative link text one file uses to point at another. */
export function relativeLinkText(fromPath, toPath) {
  const text = posix(relative(dirname(`/${fromPath}`), `/${toPath}`));
  return text.startsWith(".") ? text : `./${text}`;
}

/**
 * Rewrite link targets. The mapper receives the parsed path and anchor and
 * returns a replacement path, or null to leave the link exactly as written.
 * Only the target text changes: label, title, and every other byte of the line
 * survive, so a repair never reformats a file it was asked to fix.
 */
export function rewriteLinks(text, mapper) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  let changed = 0;
  let fenced = false;

  const out = lines.map((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return line;
    }
    if (fenced) return line;

    const spans = codeSpans(line);

    const definition = REFERENCE.exec(line);
    if (definition && !insideSpan(spans, definition[1].length)) {
      const { path, anchor } = splitTarget(definition[2]);
      const replacement = mapper({ path, anchor, line: index + 1, kind: "reference", image: false });
      if (replacement === null || replacement === undefined) return line;
      changed++;
      return `${definition[1]}${replacement}${anchor}${definition[3]}`;
    }

    INLINE.lastIndex = 0;
    let rebuilt = "";
    let cursor = 0;
    let match;
    while ((match = INLINE.exec(line)) !== null) {
      if (insideSpan(spans, match.index)) continue;
      const { path, anchor } = splitTarget(match[3]);
      const replacement = mapper({
        path,
        anchor,
        line: index + 1,
        kind: "inline",
        image: match[1] === "!",
      });
      if (replacement === null || replacement === undefined) continue;
      const title = match[4] ?? "";
      rebuilt += line.slice(cursor, match.index);
      rebuilt += `${match[1]}[${match[2]}](${replacement}${anchor}${title})`;
      cursor = match.index + match[0].length;
      changed++;
    }
    if (cursor === 0) return line;
    return rebuilt + line.slice(cursor);
  });

  return { text: out.join("\n"), changed };
}

/**
 * Whether a link target resolves to a file that is actually there. A caller
 * that has already resolved the target passes the scope-relative path.
 */
export function targetExists(scopeRoot, resolvedPath) {
  return resolvedPath !== null && existsSync(resolve(scopeRoot, resolvedPath));
}
