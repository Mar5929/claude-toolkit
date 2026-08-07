"""extractors — WI-007 phase 2: turn metadata files into components and references.

    from extractors import extract_org
    result = extract_org("force-app/<org>/main/default", "<org>")

One generic pass plus deep extractors, per SPEC decision 6. `generic.py` reads
any metadata XML and picks out reference-shaped elements, so all 106 metadata
types produce a stated result. The modules beside it go deeper on the types that
carry the real connections.

Nothing here contacts a Salesforce org. The whole tool is built from local files
only, which is what makes it safe to run against a snapshot of a production org;
the org cross-check is phase 7 and is read-only.
"""

from .contracts import (  # noqa: F401
    CATEGORIES, CONFIDENCE, RELATIONSHIPS,
    ExtractedComponent, ExtractionResult, FileContext, FileOutcome, RawReference,
    category_for, component_id, split_component_id,
)
from .driver import DEEP_EXTRACTORS, extract_org, process_file  # noqa: F401

__all__ = [
    "CATEGORIES", "CONFIDENCE", "RELATIONSHIPS", "DEEP_EXTRACTORS",
    "ExtractedComponent", "ExtractionResult", "FileContext", "FileOutcome",
    "RawReference", "category_for", "component_id", "split_component_id",
    "extract_org", "process_file",
]
