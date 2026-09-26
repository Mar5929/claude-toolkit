// FOCUS.md: an engine-owned list of open items plus owner to-dos and upcoming dates.
import { projectPaths, readText, writeText, renderTemplate, withLock, refuse, today } from './core.mjs';
import { listItems } from './items.mjs';

const SECTIONS = ['items', 'todo', 'upcoming'];

function readFocus(root) {
  return readText(projectPaths(root).focus) || renderTemplate('FOCUS.md', { items: '- None yet.' });
}

function markers(name) {
  return [`<!-- flow:${name}:start -->`, `<!-- flow:${name}:end -->`];
}

export function getSection(text, name) {
  const [start, end] = markers(name);
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) return null;
  return text.slice(a + start.length, b).trim();
}

function setSection(text, name, content) {
  const [start, end] = markers(name);
  const a = text.indexOf(start);
  const b = text.indexOf(end);
  if (a < 0 || b < a) return text;
  return `${text.slice(0, a + start.length)}\n${content ? `${content}\n` : ''}${text.slice(b)}`;
}

export function focusItemsText(root) {
  const open = listItems(root).filter((i) => i.fm.stage !== 'done');
  if (!open.length) return '- None yet.';
  return open.map((i) => `- ${i.fm.id} ${i.fm.title} (${i.fm.stage}). Next: ${i.next || 'not recorded'}`).join('\n');
}

export function refreshFocus(root) {
  return withLock(root, 'focus', () => {
    const text = setSection(readFocus(root), 'items', focusItemsText(root));
    writeText(projectPaths(root).focus, text);
    return text;
  });
}

export function addFocusLine(root, section, line) {
  if (!['todo', 'upcoming'].includes(section)) refuse('Focus sections you can add to: todo, upcoming.');
  if (!line) refuse('Pass the line with `--text "..."`.');
  return withLock(root, 'focus', () => {
    const text = readFocus(root);
    const current = getSection(text, section) || '';
    const next = `${current ? `${current}\n` : ''}- ${line.trim()} (added ${today()})`;
    writeText(projectPaths(root).focus, setSection(text, section, next));
  });
}

export function removeFocusLine(root, match) {
  if (!match) refuse('Pass the words of the line to remove with `--text "..."`.');
  return withLock(root, 'focus', () => {
    let text = readFocus(root);
    let removed = 0;
    for (const section of ['todo', 'upcoming']) {
      const lines = (getSection(text, section) || '').split('\n').filter(Boolean);
      const kept = lines.filter((l) => !l.toLowerCase().includes(match.toLowerCase()));
      removed += lines.length - kept.length;
      text = setSection(text, section, kept.join('\n'));
    }
    if (!removed) refuse(`No to-do or upcoming line contains "${match}".`);
    writeText(projectPaths(root).focus, text);
    return removed;
  });
}

export function focusProblems(text) {
  return SECTIONS.filter((s) => getSection(text, s) === null).map((s) => `FOCUS.md is missing the ${s} markers.`);
}
