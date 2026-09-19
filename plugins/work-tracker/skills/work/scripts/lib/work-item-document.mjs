import { createHash } from "node:crypto";
import { WorkError } from "./common.mjs";

export const DOCUMENT_NAME = "WORK-ITEM.md";
const HEADINGS = [
  "Overview",
  "Roadmap",
  "Tasks",
  "Recent History",
  "Requirements",
];
const NAMES = {
  description: "Purpose",
  next_step: "Next action",
  roadmap_stage: "Roadmap phase",
};
const REVERSE = Object.fromEntries(
  Object.entries(NAMES).map(([k, v]) => [v, k]),
);
const own = (o, k) => Object.hasOwn(o, k);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = (message) => {
  throw new WorkError(message, "invalid_work_item_document");
};
export const documentHash = (source) =>
  createHash("sha256").update(source).digest("hex");
const label = (key) =>
  NAMES[key] ?? key[0].toUpperCase() + key.slice(1).replaceAll("_", " ");
const keyFor = (name) =>
  REVERSE[name] ?? name.toLowerCase().replaceAll(" ", "_");

function linesOf(source) {
  const lines = [];
  let offset = 0;
  let fence = null;
  let comment = false;
  for (const full of source.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const text = full.replace(/\r?\n$/, "");
    const hidden = comment || text.trimStart().startsWith("<!--");
    // Comment examples inside code are literal, including unclosed examples.
    if (!fence && !/^ {4}/.test(text)) {
      if (text.includes("<!--") && !text.includes("-->")) comment = true;
      if (text.includes("-->")) comment = false;
    }
    const mark = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    const visible = !hidden && !fence && !mark;
    if (!hidden && mark) {
      if (!fence) fence = { char: mark[1][0], size: mark[1].length };
      else if (
        mark[1][0] === fence.char &&
        mark[1].length >= fence.size &&
        !mark[2].trim()
      )
        fence = null;
    }
    lines.push({ text, start: offset, end: offset + full.length, visible });
    offset += full.length;
  }
  return lines;
}
function fields(source, start, end, all) {
  const result = Object.create(null),
    spans = Object.create(null);
  const lines = all.filter((l) => l.start >= start && l.start < end);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.visible) continue;
    const m = l.text.match(/^(?:- )?([A-Z][A-Za-z0-9 ]*):(?: (.*))?$/);
    if (!m) continue;
    const key = keyFor(m[1]);
    if (own(result, key)) fail(`Duplicate ${m[1]} field`);
    let raw = m[2] ?? "",
      last = l.end,
      value;
    if (raw === "|") {
      const body = [];
      while (i + 1 < lines.length && lines[i + 1].text.startsWith("    ")) {
        const next = lines[++i];
        body.push(next.text.slice(4));
        last = next.end;
      }
      value = body.join("\n");
    } else {
      if (raw === "null") value = null;
      else if (raw === "true" || raw === "false") value = raw === "true";
      else if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) value = Number(raw);
      else if (/^[\[{\"]/.test(raw)) {
        try {
          value = JSON.parse(raw);
        } catch {
          fail(
            `Invalid value for ${m[1]}; quote text beginning with a bracket or quote`,
          );
        }
      } else value = raw;
    }
    result[key] = value;
    spans[key] = { start: l.start, end: last };
  }
  return { values: result, spans, start, end };
}
function renderField(key, value, nl) {
  let text;
  if (typeof value === "string") {
    if (value.includes("\n"))
      text = `|${nl}${value
        .split("\n")
        .map((l) => `    ${l}`)
        .join(nl)}`;
    else
      text =
        !value ||
        value.trim() !== value ||
        /^(?:null|true|false|-?\d|[\[{\"])/.test(value)
          ? JSON.stringify(value)
          : value;
  } else text = JSON.stringify(value);
  return `- ${label(key)}: ${text}${nl}`;
}
function renderFields(values, nl, omit = []) {
  return Object.entries(values)
    .filter(([k, v]) => !omit.includes(k) && v !== undefined)
    .map(([k, v]) => renderField(k, v, nl))
    .join("");
}
function titleLine(id, title, prefix, nl) {
  if (typeof title !== "string" || /[\r\n]/.test(title))
    fail("Titles must fit on one line");
  return prefix === "**"
    ? `**${id}: ${title}**${nl}`
    : `${prefix} ${id}: ${title}${nl}`;
}
function entries(section, all, source, prefix) {
  const headings = all.filter(
    (l) =>
      l.visible &&
      l.start >= section.start &&
      l.start < section.end &&
      /^## /.test(l.text),
  );
  const result = [];
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i],
      end = headings[i + 1]?.start ?? section.end;
    const match = h.text.match(new RegExp(`^## (${prefix}-[0-9]+): (.*)$`));
    if (!match) fail(`Expected a ${prefix} heading in ${section.name}`);
    if (result.some((e) => e.id === match[1])) fail(`Duplicate ${match[1]}`);
    const f = fields(source, h.end, end, all);
    if (prefix === "TASK" && own(f.values, "next_step")) {
      f.values.next_action = f.values.next_step;
      delete f.values.next_step;
      f.spans.next_action = f.spans.next_step;
      delete f.spans.next_step;
    }
    if (own(f.values, "id") || own(f.values, "title"))
      fail(`${match[1]} ID and title belong only in its heading`);
    result.push({ id: match[1], title: match[2], fields: f, heading: h, end });
  }
  return result;
}
export function parseDocument(source) {
  if (
    typeof source !== "string" ||
    !/^<!-- work-item-format: 1 -->\r?\n/.test(source)
  )
    fail("WORK-ITEM.md needs format marker 1");
  const all = linesOf(source),
    top = all.filter((l) => l.visible && /^# /.test(l.text));
  if (
    top.length !== HEADINGS.length ||
    top.some((l, i) => l.text !== `# ${HEADINGS[i]}`)
  )
    fail(`Required sections, in order: ${HEADINGS.join(", ")}`);
  const sections = Object.fromEntries(
    top.map((l, i) => [
      HEADINGS[i],
      {
        name: HEADINGS[i],
        start: l.end,
        end: top[i + 1]?.start ?? source.length,
      },
    ]),
  );
  const titles = all.filter(
    (l) => l.visible && l.start < top[0].start && /^\*\*/.test(l.text),
  );
  const title =
    titles.length === 1 &&
    titles[0].text.match(/^\*\*([A-Z][A-Z0-9]*-\d+): (.+)\*\*$/);
  if (!title) fail("Expected one bold item ID and title before Overview");
  const overview = sections.Overview;
  const sub = all.filter(
    (l) =>
      l.visible &&
      l.start >= overview.start &&
      l.start < overview.end &&
      /^## /.test(l.text),
  );
  const of = fields(source, overview.start, sub[0]?.start ?? overview.end, all);
  if (own(of.values, "id") || own(of.values, "title"))
    fail("Item ID and title belong only in the page title");
  const approvalHeads = sub.filter(
    (l) => l.text === "## Requirements approval",
  );
  if (approvalHeads.length !== 1)
    fail("Overview needs exactly one Requirements approval subsection");
  const ah = approvalHeads[0],
    ai = sub.indexOf(ah);
  const approval = fields(
    source,
    ah.end,
    sub[ai + 1]?.start ?? overview.end,
    all,
  );
  const stages = entries(sections.Roadmap, all, source, "STAGE");
  const tasks = entries(sections.Tasks, all, source, "TASK");
  const roadmapFields = fields(
    source,
    sections.Roadmap.start,
    stages[0]?.heading.start ?? sections.Roadmap.end,
    all,
  );
  if (own(roadmapFields.values, "stages") || own(roadmapFields.values, "tasks"))
    fail("Roadmap and tasks belong in their own blocks");
  const historyEntries = entries(
    sections["Recent History"],
    all,
    source,
    "ENTRY",
  );
  const record = { ...of.values, id: title[1], title: title[2] };
  for (const key of [
    "description",
    "type",
    "priority",
    "status",
    "created_date",
    "updated_date",
    "next_step",
  ]) {
    if (typeof record[key] !== "string")
      fail(`Overview needs a text ${label(key)} field`);
  }
  if (
    record.schema_version !== 2 ||
    !Array.isArray(record.blockers) ||
    !record.git ||
    typeof record.git !== "object" ||
    Array.isArray(record.git) ||
    !record.relationships ||
    typeof record.relationships !== "object" ||
    Array.isArray(record.relationships)
  )
    fail("Overview record fields are malformed");
  const roadmap = {
    ...roadmapFields.values,
    stages: stages.map((e) => ({
      ...e.fields.values,
      id: e.id,
      title: e.title,
    })),
    tasks: tasks.map((e) => ({ ...e.fields.values, id: e.id, title: e.title })),
  };
  const history = historyEntries.map((e) => ({ ...e.fields.values }));
  return {
    source,
    hash: documentHash(source),
    nl: source.includes("\r\n") ? "\r\n" : "\n",
    sections,
    all,
    title: titles[0],
    overview: of,
    approval,
    stages,
    tasks,
    roadmapFields,
    historyEntries,
    record,
    roadmap,
    history,
    requirements: {
      meta: { ...approval.values },
      body: source.slice(
        sections.Requirements.start,
        sections.Requirements.end,
      ),
    },
  };
}
export function createDocument(record, requirements, roadmap, history = []) {
  const nl = "\n";
  let source = `<!-- work-item-format: 1 -->\n${titleLine(record.id, record.title, "**", nl)}\n# Overview\n\n`;
  source +=
    renderFields(record, nl, ["id", "title"]) +
    "\n## Requirements approval\n\n" +
    renderFields(requirements.meta, nl);
  source +=
    "\n## Open questions\n\nNone.\n\n## Context and notes\n\n\n# Roadmap\n\n" +
    renderFields(roadmap, nl, ["stages", "tasks"]);
  for (const e of roadmap.stages)
    source +=
      "\n" +
      titleLine(e.id, e.title, "##", nl) +
      renderFields(e, nl, ["id", "title"]);
  source += "\n# Tasks\n\n";
  for (const e of roadmap.tasks)
    source +=
      titleLine(e.id, e.title, "##", nl) +
      renderFields(e, nl, ["id", "title"]) +
      "\n";
  source += "# Recent History\n\n";
  for (const [i, e] of history.entries())
    source +=
      `## ENTRY-${i + 1}: ${e.action ?? "Update"}\n` +
      renderFields(e, nl) +
      "\n";
  source += "# Requirements\n" + requirements.body;
  parseDocument(source);
  return source;
}
export function patchDocument(
  doc,
  {
    record = doc.record,
    requirements = doc.requirements,
    roadmap = doc.roadmap,
    history = doc.history,
  } = {},
) {
  const edits = [],
    nl = doc.nl;
  function changeFields(old, next, omit = []) {
    for (const k of new Set([
      ...Object.keys(old.values),
      ...Object.keys(next),
    ])) {
      if (omit.includes(k)) continue;
      if (same(old.values[k], next[k])) continue;
      const text = next[k] === undefined ? "" : renderField(k, next[k], nl),
        span = old.spans[k];
      if (span) edits.push({ ...span, text });
      else edits.push({ start: old.end, end: old.end, text: nl + text });
    }
  }
  if (record.id !== doc.record.id) fail("Cannot change item ID");
  if (record.title !== doc.record.title)
    edits.push({
      start: doc.title.start,
      end: doc.title.end,
      text: titleLine(record.id, record.title, "**", nl),
    });
  changeFields(doc.overview, record, ["id", "title"]);
  changeFields(doc.approval, requirements.meta);
  changeFields(doc.roadmapFields, roadmap, ["stages", "tasks"]);
  for (const [old, next, section] of [
    [doc.stages, roadmap.stages, "Roadmap"],
    [doc.tasks, roadmap.tasks, "Tasks"],
  ]) {
    for (const e of old) {
      const n = next.find((n) => n.id === e.id);
      if (!n)
        fail(
          "Removing task or stage blocks is not supported; cancel them instead",
        );
      if (n.title !== e.title)
        edits.push({
          start: e.heading.start,
          end: e.heading.end,
          text: titleLine(n.id, n.title, "##", nl),
        });
      changeFields(e.fields, n, ["id", "title"]);
    }
    const added = next.filter((n) => !old.some((o) => o.id === n.id));
    if (added.length)
      edits.push({
        start: doc.sections[section].end,
        end: doc.sections[section].end,
        text: added
          .map(
            (n) =>
              nl +
              titleLine(n.id, n.title, "##", nl) +
              renderFields(n, nl, ["id", "title"]) +
              nl,
          )
          .join(""),
      });
  }
  if (
    history.length < doc.history.length ||
    !same(history.slice(0, doc.history.length), doc.history)
  )
    fail("Existing history must be preserved");
  if (history.length > doc.history.length) {
    const max = Math.max(
      0,
      ...doc.historyEntries.map((e) => Number(e.id.slice(6))),
    );
    // Insert before a trailing details close, keeping the existing collapse intact.
    const sec = doc.sections["Recent History"];
    const closing = doc.all
      .filter(
        (l) =>
          l.start >= sec.start &&
          l.start < sec.end &&
          l.visible &&
          l.text.trim() === "</details>",
      )
      .at(-1);
    const at = closing?.start ?? sec.end;
    edits.push({
      start: at,
      end: at,
      text: history
        .slice(doc.history.length)
        .map(
          (e, i) =>
            `${nl}## ENTRY-${max + i + 1}: ${e.action ?? "Update"}${nl}` +
            renderFields(e, nl) +
            nl,
        )
        .join(""),
    });
  }
  if (requirements.body !== doc.requirements.body)
    edits.push({
      start: doc.sections.Requirements.start,
      end: doc.sections.Requirements.end,
      text: requirements.body,
    });
  let source = doc.source;
  // Stable order keeps new fields deterministic even when several share an offset.
  for (const edit of edits.sort((a, b) => b.start - a.start))
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  const checked = parseDocument(source);
  if (!same(checked.record, record) && !sameSorted(checked.record, record))
    fail("Record update did not round-trip");
  if (
    !sameSorted(checked.roadmap, roadmap) ||
    !sameSorted(checked.requirements.meta, requirements.meta) ||
    !sameSorted(checked.history, history)
  )
    fail("Document update did not round-trip");
  return source;
}
function sameSorted(a, b) {
  const normalize = (v) =>
    Array.isArray(v)
      ? v.map(normalize)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, normalize(v[k])]),
          )
        : v;
  return same(normalize(a), normalize(b));
}
