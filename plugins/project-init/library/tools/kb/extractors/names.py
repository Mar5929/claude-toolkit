"""names.py — pull references out of the strings Salesforce hides them in.

Formulas, merge fields, SOQL and Apex all carry references as text rather than as
XML elements, so each needs its own reader. This module holds those readers, and
nothing else touches them, so a fix lands in one place.

The gap this closes. The old parser matched formula references with the pattern
`[A-Za-z_][A-Za-z0-9_]*__c`, which only ever matches a CUSTOM field. Every
standard field a formula uses (StageName, Amount, Priority, CloseDate) and every
cross-object reference (Account.Industry) produced nothing at all. The rule here
is the other way round: a bare word IS a field reference unless something says it
is not, and the things that say it is not are being followed by an opening
bracket (that makes it a function), sitting inside a quoted string, or being one
of a short list of literals.
"""

from __future__ import annotations

import re

# Words that appear bare in a formula and are not field names.
FORMULA_LITERALS = frozenset({
    "TRUE", "FALSE", "NULL", "AND", "OR", "NOT",
})

# The globals a formula can reach through. The value after the global is not a
# field on the current object, so each one is reported with its own target type.
FORMULA_GLOBALS = {
    "$User": "User",
    "$Profile": "Profile",
    "$UserRole": "UserRole",
    "$Organization": "Organization",
    "$RecordType": "RecordType",
    "$Setup": "CustomSetting",
    "$Label": "CustomLabel",
    "$ObjectType": "CustomObject",
    "$Permission": "CustomPermission",
    "$CustomMetadata": "CustomMetadata",
    "$Site": "CustomSite",
    "$System": "System",
    "$Api": "System",
    "$Action": "System",
    "$Network": "Network",
    "$Resource": "StaticResource",
    "$Component": "ApexComponent",
    "$Page": "ApexPage",
    "$SObjectType": "CustomObject",
    "$FieldSet": "FieldSet",
}

_STRING_LITERAL = re.compile(r"'[^']*'|\"[^\"]*\"")
_TOKEN = re.compile(
    r"(\$?[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*(\()?"
)
_MERGE_FIELD = re.compile(r"\{!\s*([^}]+?)\s*\}")
_API_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_QUALIFIED = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$")
_NAMESPACE = re.compile(r"^([A-Za-z][A-Za-z0-9]*)__[A-Za-z]")


def is_api_name(text: str) -> bool:
    """A single unqualified Salesforce api name: letters, digits, underscores."""
    return bool(text) and bool(_API_NAME.match(text))


def is_qualified_name(text: str) -> bool:
    """A dotted api name such as Account.Industry."""
    return bool(text) and bool(_QUALIFIED.match(text))


def namespace_of(api_name: str) -> str:
    """The managed package namespace on a name, or "".

    npsp__Foo__c -> npsp.  Foo__c has no namespace: the double underscore before
    a single letter marks the suffix, not a namespace, so `__c`, `__r`, `__mdt`,
    `__e`, `__x`, `__b`, `__Share`, `__History` are all excluded.
    """
    if not api_name:
        return ""
    head = api_name.split(".", 1)[0]
    parts = head.split("__")
    if len(parts) < 3:
        return ""
    return parts[0]


def strip_string_literals(text: str) -> str:
    """Blank out quoted strings, keeping the length so offsets still line up."""
    return _STRING_LITERAL.sub(lambda m: " " * len(m.group(0)), text)


def formula_references(formula: str) -> list:
    """Every field, global and cross-object reference a formula makes.

    Returns dicts with:
        raw          the token exactly as written
        kind         "field" | "traversal" | "global"
        global_name  the leading $Global for a global reference, else ""

    A token immediately followed by "(" is a function call and is dropped. A
    token inside a quoted string is a value and is dropped. Everything else is
    treated as a reference, which is what makes standard fields appear at all.
    """
    if not formula:
        return []
    cleaned = strip_string_literals(formula)
    out = []
    seen = set()
    for match in _TOKEN.finditer(cleaned):
        token = match.group(1)
        if match.group(2):                       # followed by "(" -> a function
            continue
        upper = token.upper()
        if upper in FORMULA_LITERALS:
            continue
        if token[0].isdigit():
            continue
        if token in seen:
            continue
        seen.add(token)

        if token.startswith("$"):
            head = token.split(".", 1)[0]
            out.append({"raw": token, "kind": "global",
                        "global_name": FORMULA_GLOBALS.get(head, head)})
        elif "." in token:
            out.append({"raw": token, "kind": "traversal", "global_name": ""})
        else:
            out.append({"raw": token, "kind": "field", "global_name": ""})
    return out


def merge_field_references(text: str) -> list:
    """Every {!...} merge field in Visualforce markup, a web link url, or an email.

    The inside of a merge field can be a whole expression, so each one is run
    through the formula reader. Returns the same dict shape.
    """
    if not text or "{!" not in text:
        return []
    out = []
    seen = set()
    for match in _MERGE_FIELD.finditer(text):
        for ref in formula_references(match.group(1)):
            if ref["raw"] in seen:
                continue
            seen.add(ref["raw"])
            out.append(ref)
    return out


# ---------------------------------------------------------------------------
# Apex
# ---------------------------------------------------------------------------

# Identifiers that start with a capital letter and are not user code.
APEX_BUILTINS = frozenset([
    "List", "Map", "Set", "Database", "System", "String", "Integer", "Decimal",
    "Date", "Datetime", "Time", "Boolean", "Id", "Schema", "SObject", "Test",
    "Trigger", "Long", "Double", "Object", "Type", "Exception", "Pattern",
    "Matcher", "Limits", "JSON", "EncodingUtil", "Crypto", "Http", "HttpRequest",
    "HttpResponse", "PageReference", "ApexPages", "UserInfo", "Url", "Blob",
    "Math", "Messaging", "Approval", "ConnectApi", "Auth", "Cache", "Cookie",
    "FieldSet", "FieldSetMember", "Comparable", "Iterable", "Iterator",
    "Queueable", "Schedulable", "Batchable", "Stateful", "AllowsCallouts",
    "RaisesPlatformEvents", "QueryLocator", "BatchableContext", "QueueableContext",
    "SchedulableContext", "DescribeFieldResult", "DescribeSObjectResult",
    "PicklistEntry", "RecordTypeInfo", "ChildRelationship", "SaveResult",
    "DeleteResult", "UpsertResult", "MergeResult", "Error", "StatusCode",
    "Label", "Site", "Network", "Search", "Flow", "Metadata", "Reports",
    "Address", "Location", "SelectOption", "StaticResourceCalloutMock",
    "HttpCalloutMock", "WebServiceMock", "Version", "Formula", "Assert",
])

# Words that look like a class name in `Foo.bar()` but are language, not code.
APEX_SOQL_KEYWORDS = frozenset({
    "SELECT", "FROM", "WHERE", "ORDER", "GROUP", "BY", "LIMIT", "OFFSET",
    "HAVING", "AND", "OR", "NOT", "IN", "LIKE", "NULL", "TRUE", "FALSE",
    "ASC", "DESC", "NULLS", "FIRST", "LAST", "FOR", "UPDATE", "VIEW",
    "REFERENCE", "WITH", "SECURITY_ENFORCED", "TYPEOF", "END", "WHEN", "THEN",
    "ELSE", "USING", "SCOPE", "COUNT", "COUNT_DISTINCT", "SUM", "AVG", "MIN",
    "MAX", "TOLABEL", "FORMAT", "CONVERTTIMEZONE", "CALENDAR_YEAR", "GROUPING",
})

APEX_LINE_COMMENT = re.compile(r"//[^\n]*")
APEX_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.DOTALL)
APEX_STRING = re.compile(r"'(?:\\.|[^'\\])*'")

APEX_CLASS_HEADER = re.compile(
    r"\b(?:global|public|private|protected)\s+(?:abstract\s+|virtual\s+|with\s+sharing\s+"
    r"|without\s+sharing\s+|inherited\s+sharing\s+|static\s+)*"
    r"(class|interface|enum)\s+([A-Za-z_][A-Za-z0-9_]*)",
    re.IGNORECASE,
)
APEX_EXTENDS = re.compile(r"\bextends\s+([A-Za-z_][A-Za-z0-9_.]*)", re.IGNORECASE)
APEX_IMPLEMENTS = re.compile(r"\bimplements\s+([A-Za-z_][A-Za-z0-9_.,\s]*?)\s*\{",
                             re.IGNORECASE)
APEX_NEW = re.compile(r"\bnew\s+([A-Z][A-Za-z0-9_]*)\s*[\(<]")
APEX_STATIC_CALL = re.compile(r"\b([A-Z][A-Za-z0-9_]+)\s*\.\s*[a-zA-Z_]")
# A label reference can carry a namespace: Label.site.passwords_dont_match is one
# label called `passwords_dont_match` in the `site` namespace, not a label called
# `site`. Both segments are captured so phase 3 can split them.
APEX_LABEL = re.compile(
    r"\bSystem\.Label\.([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)"
    r"|\bLabel\.([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?)"
)
APEX_INVOCABLE = re.compile(r"@InvocableMethod|@InvocableVariable", re.IGNORECASE)
APEX_TEST_ANNOTATION = re.compile(r"@isTest", re.IGNORECASE)
APEX_TRIGGER_HEADER = re.compile(
    r"\btrigger\s+([A-Za-z_][A-Za-z0-9_]*)\s+on\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)",
    re.IGNORECASE,
)
APEX_SOQL = re.compile(
    r"\[\s*SELECT\s+([\s\S]+?)\s+FROM\s+([A-Za-z_][A-Za-z0-9_]*)"
    r"([\s\S]*?)\]",
    re.IGNORECASE,
)
APEX_DYNAMIC_SOQL = re.compile(
    r"Database\s*\.\s*(?:query|queryWithBinds|getQueryLocator|countQuery)\s*\(",
    re.IGNORECASE,
)
APEX_SOBJECT_TYPE = re.compile(
    r"\b(?:new\s+)?([A-Za-z_][A-Za-z0-9_]*(?:__c|__mdt|__e|__x|__b))\s*[\(\.]"
)
APEX_SCHEMA_TYPE = re.compile(
    r"Schema\s*\.\s*SObjectType\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)"
    r"(?:\s*\.\s*fields\s*\.\s*([A-Za-z_][A-Za-z0-9_]*))?",
    re.IGNORECASE,
)
APEX_FLOW_CALL = re.compile(
    r"Flow\s*\.\s*Interview\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)"
    r"|Flow\s*\.\s*Interview\s*\.\s*createInterview\s*\(\s*'([^']+)'",
    re.IGNORECASE,
)
APEX_TYPE_FORNAME = re.compile(r"Type\s*\.\s*forName\s*\(", re.IGNORECASE)


def strip_apex_noise(source: str) -> str:
    """Blank out comments and string literals, keeping offsets so lines still line up."""
    def blank(match):
        return re.sub(r"[^\n]", " ", match.group(0))
    source = APEX_BLOCK_COMMENT.sub(blank, source)
    source = APEX_LINE_COMMENT.sub(blank, source)
    source = APEX_STRING.sub(blank, source)
    return source


def line_of(source: str, offset: int) -> int:
    """1-based line number of a character offset, for an evidence location."""
    return source.count("\n", 0, offset) + 1


def soql_select_fields(fields_clause: str) -> list:
    """The field names in a SELECT list, subqueries and function calls dropped.

    Parent traversal (Account.Name) IS kept, unlike the old parser which skipped
    every dotted name as too noisy. A traversal is a real reference; phase 3
    decides what it resolves to.
    """
    out = []
    depth = 0
    current = []
    for char in fields_clause:
        if char == "(":
            depth += 1
            current.append(char)
        elif char == ")":
            depth -= 1
            current.append(char)
        elif char == "," and depth == 0:
            out.append("".join(current))
            current = []
        else:
            current.append(char)
    out.append("".join(current))

    fields = []
    for chunk in out:
        text = chunk.strip()
        if not text or "(" in text or text == "*":
            continue
        # "Name alias" -> take the first token, not the alias.
        token = text.split()[0]
        if token.upper() in APEX_SOQL_KEYWORDS:
            continue
        if is_api_name(token) or is_qualified_name(token):
            fields.append(token)
    return fields


def soql_where_fields(tail: str) -> list:
    """Field names appearing in the WHERE / ORDER BY / GROUP BY part of a query."""
    if not tail:
        return []
    cleaned = strip_string_literals(tail)
    out = []
    seen = set()
    for match in _TOKEN.finditer(cleaned):
        token = match.group(1)
        if match.group(2) or token.startswith(":"):
            continue
        if token.upper() in APEX_SOQL_KEYWORDS:
            continue
        if token.startswith("$") or token[0].isdigit():
            continue
        if token in seen:
            continue
        seen.add(token)
        out.append(token)
    return out


# ---------------------------------------------------------------------------
# Lightning web components and Aura
# ---------------------------------------------------------------------------

LWC_SCHEMA_IMPORT = re.compile(
    r"""from\s+['"]@salesforce/schema/([^'"]+)['"]"""
)
LWC_APEX_IMPORT = re.compile(
    r"""from\s+['"]@salesforce/apex/([^'"]+)['"]"""
)
LWC_LABEL_IMPORT = re.compile(
    r"""from\s+['"]@salesforce/label/([^'"]+)['"]"""
)
LWC_RESOURCE_IMPORT = re.compile(
    r"""from\s+['"]@salesforce/resourceUrl/([^'"]+)['"]"""
)
LWC_PERMISSION_IMPORT = re.compile(
    r"""from\s+['"]@salesforce/(?:userPermission|customPermission)/([^'"]+)['"]"""
)
LWC_MODULE_IMPORT = re.compile(
    r"""from\s+['"](c/[A-Za-z0-9_]+)['"]"""
)
AURA_COMPONENT_TAG = re.compile(r"<\s*(c|lightning|force|forceChatter|ui|aura)\s*:\s*([A-Za-z0-9_]+)")
AURA_CONTROLLER_ATTR = re.compile(r"""controller\s*=\s*["']([A-Za-z0-9_.]+)["']""")
AURA_OBJECT_ATTR = re.compile(
    r"""(?:sObjectName|objectApiName|objectName)\s*=\s*["']\{?!?\s*([A-Za-z0-9_]+)"""
)
VF_CONTROLLER_ATTR = re.compile(r"""\bcontroller\s*=\s*["']([A-Za-z0-9_]+)["']""",
                                re.IGNORECASE)
VF_EXTENSIONS_ATTR = re.compile(r"""\bextensions\s*=\s*["']([^"']+)["']""",
                                re.IGNORECASE)
VF_STANDARD_CONTROLLER = re.compile(
    r"""\bstandardController\s*=\s*["']([A-Za-z0-9_]+)["']""", re.IGNORECASE)
VF_COMPONENT_TAG = re.compile(r"<\s*c\s*:\s*([A-Za-z0-9_]+)")
