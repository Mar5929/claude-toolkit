"""xmlutil.py — read Salesforce metadata XML and say exactly where each value sat.

Two jobs.

1. **Open files the operating system can actually reach.** Every path goes
   through `long_path()` from file_registry.py. Without it Python's own open()
   silently refuses any path over 260 characters on Windows, which loses 4 files
   in Red and 11 in Blue. An extractor that calls ET.parse() on a plain path
   misses those files and reports nothing wrong.

2. **Give every value an element path.** SPEC requirement 6 says an edge has to
   be checkable back to the exact spot it came from. XML has no useful line
   numbers, so the location of a value is its path through the document:

       decisions[Is_High_Priority]/rules/conditions/leftValueReference

   Repeated elements are told apart by their own fullName or name where they
   have one, and by position where they do not. Both the deep extractors and the
   generic pass build paths through `walk()`, so when both read the same element
   the two locations match exactly and the driver can drop the duplicate.
"""

from __future__ import annotations

import re
from xml.etree import ElementTree as ET

from . import _kbpath  # noqa: F401  (puts tools/kb on sys.path)
from file_registry import long_path  # noqa: E402

NAMESPACE = "{http://soap.sforce.com/2006/04/metadata}"

# Child elements that name their parent well enough to identify it in a path.
_IDENTIFYING_CHILDREN = (
    "fullName", "name", "apiName", "developerName", "field", "componentName",
)

_PATH_SAFE = re.compile(r"[^A-Za-z0-9_.\- ]")


def local(elem) -> str:
    """The tag name with the Salesforce metadata namespace removed."""
    tag = elem.tag
    if isinstance(tag, str) and tag.startswith(NAMESPACE):
        return tag[len(NAMESPACE):]
    if isinstance(tag, str) and tag.startswith("{"):
        return tag.split("}", 1)[1]
    return tag if isinstance(tag, str) else ""


def parse_file(abs_path):
    """(root element, error message). Exactly one of the two is None.

    Never raises. A file that will not parse is a reported error, not a crash
    and not a silent skip.
    """
    try:
        with open(long_path(abs_path), "rb") as handle:
            data = handle.read()
    except OSError as exc:
        return None, f"file read error: {exc}"
    if not data.strip():
        return None, "file is empty"
    try:
        return ET.fromstring(data), None
    except ET.ParseError as exc:
        return None, f"XML parse error: {exc}"


def read_text(abs_path):
    """(text, error message) for a non-XML file such as Apex or JavaScript."""
    try:
        with open(long_path(abs_path), "r", encoding="utf-8", errors="replace") as handle:
            return handle.read(), None
    except OSError as exc:
        return None, f"file read error: {exc}"


def _identifier(elem) -> str:
    """A short name for one element among siblings sharing its tag."""
    for wanted in _IDENTIFYING_CHILDREN:
        for child in elem:
            if local(child) == wanted and child.text and child.text.strip():
                return _PATH_SAFE.sub("_", child.text.strip())[:60]
    return ""


def _segments(parent) -> list:
    """(child element, path segment) for every direct child of parent.

    An element with a name of its own is always qualified by it, even when it is
    the only child with its tag. That keeps a path stable: adding a second
    `subflows` block to a flow must not silently change the path recorded against
    the first one, or every edge in the committed JSON output would move.
    Position is the fallback, used only when there is no name to use.
    """
    counts: dict = {}
    for child in parent:
        name = local(child)
        counts[name] = counts.get(name, 0) + 1

    seen: dict = {}
    out = []
    for child in parent:
        name = local(child)
        index = seen.get(name, 0)
        seen[name] = index + 1
        ident = _identifier(child)
        if ident:
            out.append((child, f"{name}[{ident}]"))
        elif counts[name] == 1:
            out.append((child, name))
        else:
            out.append((child, f"{name}[{index}]"))
    return out


def walk(root, base: str = ""):
    """Yield (element, path) for every element under root. Root itself is skipped.

    Depth first, document order, so a reader sees a parent before its children.
    """
    stack = []
    for child, seg in reversed(_segments(root)):
        stack.append((child, f"{base}/{seg}" if base else seg))
    while stack:
        elem, path = stack.pop()
        yield elem, path
        for child, seg in reversed(_segments(elem)):
            stack.append((child, f"{path}/{seg}"))


def children(elem, name: str):
    """Direct children with the given tag name."""
    if elem is None:
        return
    for child in elem:
        if local(child) == name:
            yield child


def child_text(elem, name: str):
    """Text of the first direct child with this tag, or None."""
    if elem is None:
        return None
    for child in elem:
        if local(child) == name:
            return child.text.strip() if child.text else None
    return None


def child_texts(elem, name: str) -> list:
    """Text of every direct child with this tag, blanks dropped."""
    out = []
    for child in children(elem, name):
        if child.text and child.text.strip():
            out.append(child.text.strip())
    return out


def collect(elem, name: str):
    """(descendant element, relative path) for every descendant with this tag."""
    for desc, path in walk(elem):
        if local(desc) == name:
            yield desc, path


def is_leaf(elem) -> bool:
    return len(list(elem)) == 0


def text_of(elem) -> str:
    return elem.text.strip() if elem.text else ""
