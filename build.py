#!/usr/bin/env python3
"""Rebuild the bundled main.js from code-only sources. No vault is required."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
source = (root / "src" / "main.js").read_text(encoding="utf-8")
html = (root / "src" / "viewer.html").read_text(encoding="utf-8")
marker = "const BUNDLED_HTML = null; // @bundle-html"
if source.count(marker) != 1:
    raise SystemExit("Expected exactly one unbundled HTML marker")
encoded = json.dumps(html, ensure_ascii=False).replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
output = source.replace(marker, "const BUNDLED_HTML = " + encoded + "; // @bundle-html")
(root / "main.js").write_text(output, encoding="utf-8", newline="\n")
print("Built main.js from src/main.js and src/viewer.html")
