#!/usr/bin/env python3
"""Build registry/index.json from the skill manifests.

Run from the repo root:  python3 tools/build_index.py
Validates every skill.json against spec v0.1 basics and refuses to build a
broken index. CI runs this on every push to keep index.json current.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "registry" / "skills"
INDEX_PATH = ROOT / "registry" / "index.json"

REQUIRED = [
    "manifest_version", "id", "name", "version", "description",
    "platform", "runtime", "author", "license", "compatibility",
    "files", "safety", "categories",
]
RISK_LEVELS = {"low", "medium", "high"}
PLATFORMS = {"klipper", "lerobot-arm", "droid", "humanoid"}

# Fields copied into the lightweight index entry the storefront reads.
INDEX_FIELDS = [
    "id", "name", "version", "description", "icon", "platform",
    "author", "license", "categories", "tags", "variables",
]


def validate(manifest: dict, folder: Path, errors: list[str]) -> None:
    where = folder.name
    for field in REQUIRED:
        if field not in manifest:
            errors.append(f"{where}: missing required field '{field}'")
    if manifest.get("id") != folder.name:
        errors.append(f"{where}: id '{manifest.get('id')}' must match folder name")
    if manifest.get("platform") not in PLATFORMS:
        errors.append(f"{where}: unknown platform '{manifest.get('platform')}'")
    if manifest.get("safety", {}).get("risk_level") not in RISK_LEVELS:
        errors.append(f"{where}: safety.risk_level must be low|medium|high")
    for f in manifest.get("files", []):
        payload = folder / f.get("path", "")
        if not payload.is_file():
            errors.append(f"{where}: payload file '{f.get('path')}' not found")
        if "/" in f.get("dest", "") or f.get("dest", "").startswith("."):
            errors.append(f"{where}: dest '{f.get('dest')}' must be a flat filename")


def main() -> int:
    if not SKILLS_DIR.is_dir():
        print(f"error: {SKILLS_DIR} does not exist", file=sys.stderr)
        return 1

    entries, errors, seen_ids = [], [], set()
    for folder in sorted(p for p in SKILLS_DIR.iterdir() if p.is_dir()):
        manifest_path = folder / "skill.json"
        if not manifest_path.is_file():
            errors.append(f"{folder.name}: no skill.json")
            continue
        try:
            manifest = json.loads(manifest_path.read_text())
        except json.JSONDecodeError as exc:
            errors.append(f"{folder.name}: invalid JSON ({exc})")
            continue

        validate(manifest, folder, errors)
        skill_id = manifest.get("id", folder.name)
        if skill_id in seen_ids:
            errors.append(f"{folder.name}: duplicate id '{skill_id}'")
        seen_ids.add(skill_id)

        entry = {k: manifest[k] for k in INDEX_FIELDS if k in manifest}
        entry["risk_level"] = manifest.get("safety", {}).get("risk_level", "high")
        entry["path"] = f"registry/skills/{folder.name}"
        entries.append(entry)

    if errors:
        print("index build FAILED:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        return 1

    index = {
        "registry_version": "0.1",
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "skill_count": len(entries),
        "skills": entries,
    }
    INDEX_PATH.write_text(json.dumps(index, indent=2) + "\n")
    print(f"wrote {INDEX_PATH.relative_to(ROOT)} with {len(entries)} skills")
    return 0


if __name__ == "__main__":
    sys.exit(main())
