"""Validate data/types.csv and data/plant_template.json. Standard library only."""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
errors = []
ALLOWED_NODE_FIELDS = {"id", "code", "label", "parent", "type", "kind", "ebl_code", "comment", "en_draft"}


def err(msg):
    errors.append(msg)


def check_hierarchy(items, label):
    """items: dict code -> parent. Checks parents exist and there are no cycles."""
    for code, parent in items.items():
        if parent and parent not in items:
            err(f"{label}: '{code}' has unknown parent '{parent}'")
    for code in items:
        seen, cur = set(), code
        while cur:
            if cur in seen:
                err(f"{label}: cycle involving '{code}'")
                break
            seen.add(cur)
            cur = items.get(cur) or None


def validate_types(rules):
    path = ROOT / "data" / "types.csv"
    with path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        cols = reader.fieldnames or []
        rows = list(reader)
    for c in rules["required_columns"]:
        if c not in cols:
            err(f"types.csv: missing column '{c}'")
    lang_re = re.compile(rules["language_column_pattern"])
    attr_re = re.compile(rules["attribute_column_pattern"])
    for c in cols:
        if c in rules["required_columns"] or lang_re.match(c) or attr_re.match(c):
            continue
        err(f"types.csv: column '{c}' not allowed (use label_xx or attr_*)")
    for c in cols:
        if any(w in c.lower() for w in rules["forbidden_column_words"]):
            err(f"types.csv: definition-like column '{c}' is forbidden")
    codes = {}
    for i, r in enumerate(rows, start=2):
        code = (r.get("code") or "").strip()
        if not code:
            err(f"types.csv line {i}: empty code")
            continue
        if code in codes:
            err(f"types.csv line {i}: duplicate code '{code}'")
        codes[code] = (r.get("parent") or "").strip()
        for lang in rules["required_languages"]:
            if not (r.get(f"label_{lang}") or "").strip():
                err(f"types.csv line {i} ({code}): label_{lang} is empty")
    check_hierarchy(codes, "types.csv")
    return set(codes)


def validate_template(type_codes):
    path = ROOT / "data" / "plant_template.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    try:
        import jsonschema
        schema = json.loads((ROOT / "schema" / "plant_template.schema.json").read_text(encoding="utf-8"))
        for e in jsonschema.Draft202012Validator(schema).iter_errors(data):
            err(f"plant_template.json: {'/'.join(map(str, e.path))}: {e.message}")
    except ImportError:
        print("jsonschema not installed; running built-in checks only")
    ids = {}
    for n in data:
        nid = n.get("id")
        if nid in ids:
            err(f"plant_template.json: duplicate id '{nid}'")
        ids[nid] = n.get("parent") or ""
        label = n.get("label") or {}
        for lang in ("no", "en"):
            if not str(label.get(lang) or "").strip():
                err(f"plant_template.json: '{nid}' missing label.{lang}")
        t = n.get("type")
        if t and t not in type_codes:
            err(f"plant_template.json: '{nid}' references unknown type '{t}'")
        if set(n) - ALLOWED_NODE_FIELDS:
            err(f"plant_template.json: '{nid}' has unexpected fields")
    check_hierarchy(ids, "plant_template.json")
    if sum(1 for p in ids.values() if not p) != 1:
        err("plant_template.json: expected exactly one root node")
    parents = set(ids.values())
    for n in data:
        if n.get("kind") == "choice" and n.get("id") not in parents:
            err(f"plant_template.json: choice '{n.get('id')}' has no alternatives")


def main():
    rules = json.loads((ROOT / "schema" / "types.rules.json").read_text(encoding="utf-8"))
    type_codes = validate_types(rules)
    validate_template(type_codes)
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main()
