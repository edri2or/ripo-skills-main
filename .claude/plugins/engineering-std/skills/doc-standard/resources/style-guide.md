# Documentation Style Guide

This guide governs all Markdown documentation in this repository.
The `doc-standard` skill enforces these rules automatically.

---

## 1. Heading Hierarchy

- Every document must begin with exactly one `# H1` title.
- Headings must not skip levels (H1 → H3 without H2 is forbidden).
- Heading text must be in Title Case for H1 and Sentence case for H2–H4.

**Correct:**
```markdown
# Module Overview
## Installation
### Prerequisites
```

**Incorrect:**
```markdown
# Module Overview
### Prerequisites
```

---

## 2. Line Length

- Maximum **120 characters** per line (prose and code comments).
- Code blocks are exempt from this rule.
- URLs that exceed 120 characters may be placed on their own line.

---

## 3. Code Blocks

- All fenced code blocks **must** specify a language identifier.
- Use `bash` for shell commands, `ts` or `typescript` for TypeScript, `json` for JSON, `sql` for SQL.

**Correct:**
````markdown
```typescript
const x: number = 42;
```
````

**Incorrect:**
````markdown
```
const x = 42;
```
````

---

## 4. Links

- Internal links (within the repository) must use **relative paths**.
- External links must use the full `https://` URL.
- Link text must be descriptive — never use bare URLs as link text.

**Correct:**
```markdown
See the [architecture diagram](../diagrams/overview.md) for details.
```

**Incorrect:**
```markdown
See https://github.com/org/repo/blob/main/docs/diagrams/overview.md for details.
```

---

## 5. ADR Format

Files under `docs/adr/` must follow this structure:

```markdown
# ADR NNNN — <Title>

**Status**: Draft | Accepted | Superseded by ADR-XXXX
**Date**: YYYY-MM-DD
**Deciders**: <names or roles>

---

## Context
<Problem statement>

## Decision
<What was decided>

## Consequences
**Positive:** ...
**Negative / Trade-offs:** ...
```

---

## 6. Trailing Whitespace

- No trailing spaces or tabs at the end of any line.
- Files must end with a single newline character.

---

## 7. Tables

- All tables must have a header row and a separator row.
- Column widths in the separator row should be padded consistently.

---

## 8. Emphasis

- Use `**bold**` for UI labels, key terms, and warnings.
- Use `*italic*` for titles of external documents.
- Use `` `code` `` for file paths, command names, variable names, and inline code.
- Do not use emphasis for decoration.
