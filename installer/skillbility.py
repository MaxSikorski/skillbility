#!/usr/bin/env python3
"""skillbility — install robot skills on your Klipper printer.

Run this on the printer's host (Pi, etc.):

    python3 skillbility.py list                 # browse the registry
    python3 skillbility.py install status-report
    python3 skillbility.py installed            # what's on this machine
    python3 skillbility.py remove status-report

Skills live in ~/printer_data/config/skillbility/. The first install adds one
line to printer.cfg ([include skillbility/*.cfg]) after asking you, and backs
up printer.cfg first. After every change, Klipper is restarted through
Moonraker so new commands appear immediately.

No dependencies beyond Python 3 stdlib, which every Klipper host already has.
"""

import json
import shutil
import sys
import urllib.request
from pathlib import Path

# ---------------------------------------------------------------- settings
# One-repo layout: registry/ lives in the main skillbility repo (see CLAUDE.md).
REGISTRY_RAW = "https://raw.githubusercontent.com/MaxSikorski/skillbility/main"
MOONRAKER_URL = "http://localhost:7125"
INCLUDE_LINE = "[include skillbility/*.cfg]"
USER_AGENT = "skillbility-cli/0.1"

RISK_BADGE = {"low": "[low risk]", "medium": "[MEDIUM risk]", "high": "[HIGH RISK]"}


# ----------------------------------------------------------------- helpers
def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read()


def fetch_json(url: str) -> dict:
    return json.loads(fetch(url).decode("utf-8"))


def config_dir() -> Path:
    for candidate in (Path.home() / "printer_data" / "config",
                      Path.home() / "klipper_config"):
        if candidate.is_dir():
            return candidate
    sys.exit("error: couldn't find a Klipper config directory "
             "(looked for ~/printer_data/config and ~/klipper_config)")


def skills_dir() -> Path:
    d = config_dir() / "skillbility"
    d.mkdir(exist_ok=True)
    return d


def state_path() -> Path:
    return skills_dir() / ".installed.json"


def load_state() -> dict:
    if state_path().is_file():
        return json.loads(state_path().read_text())
    return {}


def save_state(state: dict) -> None:
    state_path().write_text(json.dumps(state, indent=2) + "\n")


def ensure_include() -> None:
    cfg = config_dir() / "printer.cfg"
    if not cfg.is_file():
        sys.exit(f"error: {cfg} not found")
    if INCLUDE_LINE in cfg.read_text():
        return
    print(f"\nSkillbility needs one line added to printer.cfg:\n    {INCLUDE_LINE}")
    answer = input("Add it now? A backup is saved first. [y/N] ").strip().lower()
    if answer != "y":
        sys.exit("aborted: add the include line yourself, then re-run.")
    shutil.copy2(cfg, cfg.with_suffix(".cfg.skillbility-bak"))
    with cfg.open("a") as f:
        f.write(f"\n# Added by Skillbility — manages skills in skillbility/\n{INCLUDE_LINE}\n")
    print(f"added. Backup at {cfg.name}.skillbility-bak")


def restart_klipper() -> None:
    try:
        req = urllib.request.Request(f"{MOONRAKER_URL}/printer/restart", method="POST",
                                     headers={"User-Agent": USER_AGENT})
        urllib.request.urlopen(req, timeout=10)
        print("Klipper restarting — new commands available in a few seconds.")
    except Exception:
        print("note: couldn't reach Moonraker to restart. Run RESTART in your "
              "printer console to load the change.")


def check_compat(manifest: dict) -> None:
    required = manifest.get("compatibility", {}).get("requires_sections", [])
    if not required:
        return
    try:
        objects = fetch_json(f"{MOONRAKER_URL}/printer/objects/list")["result"]["objects"]
    except Exception:
        print(f"note: couldn't query the printer to verify it has: {', '.join(required)}")
        return
    missing = [s for s in required if s not in objects]
    if missing:
        print(f"warning: your printer.cfg seems to lack: {', '.join(missing)} — "
              "the skill may not work until those exist.")


# ---------------------------------------------------------------- commands
def cmd_list() -> None:
    index = fetch_json(f"{REGISTRY_RAW}/registry/index.json")
    installed = load_state()
    print(f"\nSkillbility registry — {index['skill_count']} skills\n")
    for s in index["skills"]:
        mark = "*" if s["id"] in installed else " "
        badge = RISK_BADGE.get(s.get("risk_level", "high"), "")
        print(f" {mark} {s['id']:<20} v{s['version']:<8} {badge:<14} {s['description']}")
    print("\n * = installed on this printer")
    print("install with: python3 skillbility.py install <id>\n")


def cmd_install(skill_id: str) -> None:
    manifest = fetch_json(f"{REGISTRY_RAW}/registry/skills/{skill_id}/skill.json")
    safety = manifest.get("safety", {})
    print(f"\n{manifest.get('icon', '')} {manifest['name']} v{manifest['version']} — "
          f"{RISK_BADGE.get(safety.get('risk_level', 'high'))}")
    print(f"   {manifest['description']}")
    if safety.get("notes"):
        print(f"   Safety: {safety['notes']}")
    files = manifest.get("files", [])
    print(f"   Installs {len(files)} file(s) into config/skillbility/")
    if input("Proceed? [y/N] ").strip().lower() != "y":
        sys.exit("aborted.")

    ensure_include()
    check_compat(manifest)

    dest_dir = skills_dir()
    for f in files:
        dest = (dest_dir / f["dest"]).resolve()
        if dest_dir.resolve() not in dest.parents:
            sys.exit(f"error: refusing path outside skillbility/: {f['dest']}")
        data = fetch(f"{REGISTRY_RAW}/registry/skills/{skill_id}/{f['path']}")
        dest.write_bytes(data)
        print(f"   wrote {dest.name}")

    state = load_state()
    state[skill_id] = {"version": manifest["version"], "files": [f["dest"] for f in files]}
    save_state(state)
    restart_klipper()
    print(f"\ninstalled {skill_id} v{manifest['version']}.")


def cmd_remove(skill_id: str) -> None:
    state = load_state()
    if skill_id not in state:
        sys.exit(f"{skill_id} is not installed.")
    for name in state[skill_id]["files"]:
        target = skills_dir() / name
        if target.is_file():
            target.unlink()
            print(f"   removed {name}")
    del state[skill_id]
    save_state(state)
    restart_klipper()
    print(f"removed {skill_id}.")


def cmd_installed() -> None:
    state = load_state()
    if not state:
        print("no skills installed yet. Try: python3 skillbility.py install status-report")
        return
    for skill_id, info in state.items():
        print(f"  {skill_id:<20} v{info['version']}")


def main() -> None:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        return
    cmd, rest = args[0], args[1:]
    if cmd == "list":
        cmd_list()
    elif cmd == "install" and rest:
        cmd_install(rest[0])
    elif cmd == "remove" and rest:
        cmd_remove(rest[0])
    elif cmd == "installed":
        cmd_installed()
    else:
        sys.exit("usage: skillbility.py [list | install <id> | remove <id> | installed]")


if __name__ == "__main__":
    main()
