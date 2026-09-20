/**
 * Parse the knowledge schema's YAML subset: scalars and flat scalar lists.
 * Unsupported structures and duplicate keys are errors, never guessed values.
 * The checker owns field types; quoted booleans remain strings, not consent.
 */
function withoutComment(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote === '"' && c === "\\") { i++; continue; }
    if (quote === "'" && c === "'" && text[i + 1] === "'") { i++; continue; }
    if (c === quote) quote = null;
    else if (!quote && (c === '"' || c === "'") && (i === 0 || /[\s\[,]$/.test(text.slice(0, i)))) quote = c;
    else if (!quote && c === "#" && (i === 0 || /\s/.test(text[i - 1]))) return text.slice(0, i).trimEnd();
  }
  return text.trimEnd();
}

function scalar(text) {
  const value = withoutComment(text).trim();
  if (value.startsWith('"')) {
    const result = JSON.parse(value);
    if (typeof result !== "string") throw new Error("expected a quoted string");
    return result;
  }
  if (value.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(value)) throw new Error("unclosed or invalid quoted string");
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (/^[|>{}\[\]&*!]/.test(value) || /:\s/.test(value)) throw new Error("use a quoted string or a flat list; this YAML form is unsupported");
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
  if (/^(null|~)$/i.test(value)) return null;
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function inlineList(text) {
  const value = withoutComment(text).trim();
  if (!value.endsWith("]")) throw new Error("unclosed inline list");
  const content = value.slice(1, -1);
  const parts = [];
  let quote = null, start = 0;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (quote === '"' && c === "\\") { i++; continue; }
    if (quote === "'" && c === "'" && content[i + 1] === "'") { i++; continue; }
    if (c === quote) quote = null;
    else if (!quote && (c === '"' || c === "'") && !content.slice(start, i).trim()) quote = c;
    else if (!quote && c === ",") { parts.push(content.slice(start, i)); start = i + 1; }
  }
  if (quote) throw new Error("unclosed quoted list item");
  if (content.slice(start).trim()) parts.push(content.slice(start));
  return parts.map(item => {
    if (!item.trim()) throw new Error("empty list item");
    return scalar(item);
  });
}

export function parseFrontmatter(text) {
  const normalised = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const lines = normalised.split("\n");
  const errors = [], data = {};
  if (lines[0]?.trim() !== "---") return { hasFrontmatter: false, data, body: normalised, errors };
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === "---");
  if (end < 0) return { hasFrontmatter: false, data, body: normalised, errors: ["the frontmatter opens with --- but never closes"] };
  let listKey = null;
  for (let i = 1; i < end; i++) {
    const line = lines[i].trimEnd();
    if (!line.trim() || line.trim().startsWith("#")) continue;
    try {
      const item = line.match(/^\s+-\s+(.*)$/);
      if (item) {
        if (!listKey) throw new Error("a list item needs an empty field above it; it cannot replace a scalar");
        if (!Array.isArray(data[listKey])) data[listKey] = [];
        data[listKey].push(scalar(item[1]));
        continue;
      }
      listKey = null;
      const pair = line.match(/^([A-Za-z][A-Za-z0-9_]*):(?:\s+(.*)|\s*)$/);
      if (!pair) throw new Error("expected a field with a scalar or flat list");
      const [, key, rest = ""] = pair;
      if (Object.hasOwn(data, key)) throw new Error(`duplicate field ${key}`);
      const value = withoutComment(rest).trim();
      if (!value) { data[key] = ""; listKey = key; }
      else Object.defineProperty(data, key, { value: value.startsWith("[") ? inlineList(value) : scalar(value), enumerable: true, configurable: true, writable: true });
    } catch (error) { errors.push(`line ${i + 1}: ${error.message}`); listKey = null; }
  }
  return { hasFrontmatter: true, data, body: lines.slice(end + 1).join("\n"), errors };
}

/** The first level-one heading in the body, or null. */
export function bodyTitle(body) {
  for (const line of body.split("\n")) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) return match[1].trim();
  }
  return null;
}
