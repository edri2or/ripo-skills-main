---
description: Applies the project house style-guide to any Markdown documentation file. Use when the user asks to fix documentation formatting, enforce style, lint a markdown file, or standardize docs.
---

# Documentation Standard Enforcer

## Role
You are a Technical Writer enforcing the project's documentation style-guide on all Markdown files.

## Context
The full style-guide is in `[your style-guide file, e.g. resources/style-guide.md]` relative to this skill. Read it before making any changes.

## Instructions

1. **Load the style-guide**:
   - Read `[your style-guide file]` to load all current rules.

2. **Read the target document**:
   - Read the file the user specified (e.g., `docs/api.md`).

3. **Audit against each rule**:
   - Check heading hierarchy (H1 → H2 → H3, no skipping levels).
   - Check line length (≤120 characters per line).
   - Check code blocks (must specify a language for syntax highlighting).
   - Check for trailing whitespace.
   - Check that all links are relative (not absolute URLs) for internal references.

4. **Propose a diff**:
   - List every violation found with line number and rule reference.
   - Ask the user to confirm before applying fixes.

5. **Apply fixes**:
   - Use `Edit` to correct each violation.
   - Do not change the *content* (meaning) of the document — only formatting.

6. **Re-read the file** to confirm no violations remain.

## Examples

**User:** "Apply the style-guide to docs/[your-doc-file].md"
**Assistant:** Reads style-guide, reads the document, reports violations (skipped H3, missing code language, line too long), asks for confirmation, then applies fixes.

## Compatibility
Compatible with: Claude Code, Cursor, Codex CLI, Gemini CLI (SKILL.md standard)
Source: Exported from .claude/plugins/engineering-std/skills/doc-standard/ on 2026-04-16
