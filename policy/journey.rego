package documentation.journey

import rego.v1

# Rule: any PR that modifies files under src/ must also update JOURNEY.md.
# Input schema: { "changed_files": ["path/to/file", ...] }

deny[msg] {
    some file in input.changed_files
    startswith(file, "src/")
    not journey_updated(input.changed_files)
    msg := sprintf(
        "Source code under 'src/' was modified (e.g. '%v') but 'JOURNEY.md' was not updated. Please append a session entry to JOURNEY.md to maintain agent context and auditability.",
        [file]
    )
}

journey_updated(files) {
    some f in files
    f == "JOURNEY.md"
}
