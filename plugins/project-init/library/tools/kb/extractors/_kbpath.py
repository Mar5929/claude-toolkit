"""Put tools/kb on sys.path so the flat modules beside it import cleanly.

file_registry.py, resolver.py and the rest sit one level up from this package
and are written as flat modules, not as a package. Importing this module first
makes `from file_registry import long_path` work from anywhere inside
`extractors/`.
"""

import os
import sys

_KB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _KB_DIR not in sys.path:
    sys.path.insert(0, _KB_DIR)
