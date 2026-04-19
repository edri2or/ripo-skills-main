package documentation.claude

import rego.v1

# Rule: any PR that modifies agent core logic under src/agent/ must also update CLAUDE.md.
# This prevents the agent from operating with a stale context window that no longer
# reflects its actual behaviour.
# Input schema: { "changed_files": ["path/to/file", ...] }

agent_core_path := "src/agent/"
context_file    := "CLAUDE.md"

deny[msg] {
    some file in input.changed_files
    startswith(file, agent_core_path)
    not context_updated(input.changed_files)
    msg := sprintf(
        "Agent core logic in '%v' was modified (e.g. '%v') but '%v' was not updated. Update the agent context file to keep the AI's operative memory aligned with its behaviour.",
        [agent_core_path, file, context_file]
    )
}

context_updated(files) {
    some f in files
    f == context_file
}
