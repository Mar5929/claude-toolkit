export class YamlError extends Error {
  constructor(message, line) {
    super(line ? `${message} at line ${line}` : message);
    this.name = "YamlError";
  }
}

function parseScalar(text, line) {
  const value = text.trim();
  if (value === "") return {};
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?(0|[1-9]\d*)$/.test(value)) return Number(value);
  if (value.startsWith("[") || value.startsWith("{") || value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      throw new YamlError("invalid JSON-style YAML scalar", line);
    }
  }
  if (/^[A-Za-z0-9_./:@+-]+(?: [A-Za-z0-9_./:@+-]+)*$/.test(value)) {
    return value;
  }
  throw new YamlError("plain scalar contains unsupported characters; quote it", line);
}

export function parseStrictYaml(text, label = "YAML") {
  if (text.includes("\t")) throw new YamlError(`${label} contains a tab`);
  const root = {};
  const stack = [{ indent: -2, value: root }];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (raw.trim() === "" || raw.trimStart().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    if (indent % 2 !== 0) throw new YamlError(`${label} indentation must use two spaces`, index + 1);
    const match = raw.trim().match(/^([A-Za-z][A-Za-z0-9_]*):(?:\s*(.*))?$/);
    if (!match) throw new YamlError(`${label} must contain key-value mappings only`, index + 1);
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1);
    if (indent !== parent.indent + 2) throw new YamlError(`${label} has an invalid indentation jump`, index + 1);
    const [, key, scalar = ""] = match;
    if (Object.hasOwn(parent.value, key)) throw new YamlError(`${label} contains duplicate key ${key}`, index + 1);
    const parsed = parseScalar(scalar, index + 1);
    parent.value[key] = parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      scalar.trim() === ""
    ) {
      stack.push({ indent, value: parsed });
    }
  }
  return root;
}

export function parseFrontmatter(content, label) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) throw new YamlError(`${label} must start with YAML frontmatter`);
  const closing = normalized.indexOf("\n---\n", 4);
  if (closing < 0) throw new YamlError(`${label} has no closing frontmatter delimiter`);
  const header = normalized.slice(4, closing);
  const body = normalized.slice(closing + 5);
  return { metadata: parseStrictYaml(header, `${label} frontmatter`), body };
}
