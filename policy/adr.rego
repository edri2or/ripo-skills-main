package documentation.adr

import rego.v1

# Rule: architecturally significant changes (new dependencies, infrastructure changes)
# must be accompanied by a new Architecture Decision Record in docs/adr/.
# Input schema: { "changed_files": ["path/to/file", ...] }

# Files/path prefixes that indicate an architectural change.
arch_trigger_files   := {"package.json", "package-lock.json", "yarn.lock", "go.mod", "go.sum", "requirements.txt", "Pipfile"}
arch_trigger_prefixes := {"terraform/", "infra/", "k8s/", "helm/", ".github/workflows/"}

# An architectural change is detected if any changed file matches a trigger.
arch_changed {
    some file in input.changed_files
    file in arch_trigger_files
}

arch_changed {
    some file in input.changed_files
    some prefix in arch_trigger_prefixes
    startswith(file, prefix)
}

# An ADR is considered "added" if a new file appears under docs/adr/ (any .md file).
adr_added {
    some file in input.changed_files
    startswith(file, "docs/adr/")
    endswith(file, ".md")
    # Exclude the index file itself — a new numbered ADR must be present.
    file != "docs/adr/README.md"
}

deny[msg] {
    arch_changed
    not adr_added
    msg := "An architecturally significant change was detected (dependency, infrastructure, or workflow file). Please create a new Architecture Decision Record in docs/adr/ following the format described in docs/adr/README.md."
}
