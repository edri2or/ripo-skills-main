#!/usr/bin/env python3
"""
Documentation policy enforcer — Python implementation of the Rego rules in policy/*.rego.

Usage:
    python3 scripts/check_policies.py <base_sha> <head_sha>
    python3 scripts/check_policies.py --input input.json

Exits 0 if all policies pass, 1 if any policy is violated.
"""

import json
import subprocess
import sys


def get_changed_files(base_sha: str, head_sha: str) -> list[str]:
    for args in (
        ["git", "diff", "--name-only", f"{base_sha}...{head_sha}"],
        ["git", "diff", "--name-only", base_sha, head_sha],
    ):
        result = subprocess.run(args, capture_output=True, text=True)
        if result.returncode == 0:
            files = [f for f in result.stdout.strip().splitlines() if f]
            if files:
                return files
    return []


def load_from_json(path: str) -> list[str]:
    with open(path) as fh:
        data = json.load(fh)
    return data.get("changed_files", [])


def check_claude(changed: list[str]) -> list[str]:
    first = next((f for f in changed if f.startswith("src/agent/")), None)
    if first and "CLAUDE.md" not in changed:
        return [
            f"[claude] Agent core logic changed (e.g. '{first}') but "
            "'CLAUDE.md' was not updated. Update the agent context file to keep "
            "the AI's operative memory aligned with its behaviour."
        ]
    return []


def check_journey(changed: list[str]) -> list[str]:
    first = next((f for f in changed if f.startswith("src/")), None)
    if first and "JOURNEY.md" not in changed:
        return [
            f"[journey] Source code changed (e.g. '{first}') but "
            "'JOURNEY.md' was not updated. Please append a session entry to "
            "JOURNEY.md to maintain agent context and auditability."
        ]
    return []


def check_adr(changed: list[str]) -> list[str]:
    arch_exact = {
        "package.json", "package-lock.json", "yarn.lock",
        "go.mod", "go.sum", "requirements.txt", "Pipfile",
    }
    arch_prefixes = ["terraform/", "infra/", "k8s/", "helm/", ".github/workflows/"]

    def is_arch(f: str) -> bool:
        return f in arch_exact or any(f.startswith(p) for p in arch_prefixes)

    def is_new_adr(f: str) -> bool:
        return f.startswith("docs/adr/") and f.endswith(".md") and f != "docs/adr/README.md"

    first_arch = next((f for f in changed if is_arch(f)), None)
    if first_arch and not any(is_new_adr(f) for f in changed):
        return [
            f"[adr] Architectural change detected (e.g. '{first_arch}') but "
            "no new ADR was added in 'docs/adr/'. Please create an Architecture "
            "Decision Record following the format in docs/adr/README.md."
        ]
    return []


def main() -> None:
    args = sys.argv[1:]

    if len(args) == 2 and not args[0].startswith("-"):
        changed = get_changed_files(args[0], args[1])
    elif len(args) == 2 and args[0] == "--input":
        changed = load_from_json(args[1])
    elif len(args) == 1:
        changed = load_from_json(args[0])
    else:
        print("Usage:", file=sys.stderr)
        print("  check_policies.py <base_sha> <head_sha>", file=sys.stderr)
        print("  check_policies.py --input input.json", file=sys.stderr)
        sys.exit(2)

    print(f"Evaluating {len(changed)} changed file(s):")
    for f in changed:
        print(f"  {f}")
    print()

    violations = check_claude(changed) + check_journey(changed) + check_adr(changed)

    if violations:
        print("FAIL — documentation policy violations detected:\n")
        for v in violations:
            print(f"  x {v}")
        print()
        print("See CLAUDE.md for the full policy reference.")
        sys.exit(1)

    print("PASS — all documentation policies satisfied.")


if __name__ == "__main__":
    main()
