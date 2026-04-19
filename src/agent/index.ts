/**
 * src/agent/index.ts
 *
 * Skills router for the Claude Code agent framework.
 *
 * Responsibilities:
 *   1. Discovery  — Scans .claude/plugins/ for SKILL.md files and extracts YAML frontmatter.
 *   2. Routing    — Matches a user intent string to the best skill via keyword/cosine similarity.
 *   3. Activation — Returns the full SKILL.md body for the matched skill (Progressive Disclosure).
 *
 * This module is intentionally dependency-free (no npm packages) so it can be
 * executed with ts-node or compiled to plain JS without additional setup.
 */

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillMeta {
  /** Unique machine-readable identifier from YAML frontmatter `name` field. */
  name: string;
  /** Human-readable description used for semantic routing. */
  description: string;
  /** Tools the skill is permitted to use (from YAML frontmatter). */
  allowedTools: string[];
  /** Absolute path to the SKILL.md file. */
  filePath: string;
}

export interface SkillFull extends SkillMeta {
  /** Full Markdown body of the skill (everything after the YAML frontmatter). */
  body: string;
}

// ---------------------------------------------------------------------------
// YAML frontmatter parser (minimal, no external dependency)
// ---------------------------------------------------------------------------

function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const FENCE = '---';
  const lines = content.split('\n');

  if (lines[0].trim() !== FENCE) {
    return { meta: {}, body: content };
  }

  const closingIndex = lines.findIndex((line, idx) => idx > 0 && line.trim() === FENCE);
  if (closingIndex === -1) {
    return { meta: {}, body: content };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join('\n').trimStart();

  const meta: Record<string, unknown> = {};
  let currentArray: string[] | null = null;

  for (const line of frontmatterLines) {
    // Array item
    if (line.match(/^\s+-\s+(.+)/) && currentArray !== null) {
      currentArray.push(line.replace(/^\s+-\s+/, '').trim());
      continue;
    }
    // Key-value pair
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (value.trim() === '') {
        currentArray = [];
        meta[key] = currentArray;
      } else {
        meta[key] = value.trim();
        currentArray = null;
      }
    }
  }

  return { meta, body };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * Scans `.claude/plugins/` (relative to the project root) for all SKILL.md files
 * and returns their metadata. Only the frontmatter is read at this stage
 * (Progressive Disclosure — keeps context window lean).
 *
 * @param projectRoot Absolute path to the repository root. Defaults to cwd.
 */
export function discoverSkills(projectRoot: string = process.cwd()): SkillMeta[] {
  const pluginsDir = path.join(projectRoot, '.claude', 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  const skills: SkillMeta[] = [];

  function walkDir(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name === 'SKILL.md') {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const { meta } = parseFrontmatter(content);

        const name = typeof meta['name'] === 'string' ? meta['name'] : path.basename(path.dirname(fullPath));
        const description = typeof meta['description'] === 'string' ? meta['description'] : '';
        const allowedTools = Array.isArray(meta['allowed-tools'])
          ? (meta['allowed-tools'] as string[])
          : [];

        skills.push({ name, description, allowedTools, filePath: fullPath });
      }
    }
  }

  walkDir(pluginsDir);
  return skills;
}

// ---------------------------------------------------------------------------
// Routing (keyword-based similarity)
// ---------------------------------------------------------------------------

/**
 * Tokenises a string into lowercase word tokens for similarity scoring.
 */
function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

/**
 * Computes Jaccard similarity between two token sets.
 * Returns a value in [0, 1].
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersectionSize = 0;
  for (const t of a) {
    if (b.has(t)) intersectionSize++;
  }
  const unionSize = a.size + b.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

/**
 * Routes a user intent string to the best matching skill from the discovered list.
 *
 * @param userIntent  Natural-language description of what the user wants.
 * @param skills      List produced by `discoverSkills()`.
 * @param threshold   Minimum similarity score to consider a match (default 0.05).
 * @returns The best-matching SkillMeta, or `null` if no skill clears the threshold.
 */
export function routeIntent(
  userIntent: string,
  skills: SkillMeta[],
  threshold = 0.05,
): SkillMeta | null {
  const intentTokens = tokenise(userIntent);

  let bestSkill: SkillMeta | null = null;
  let bestScore = -1;

  for (const skill of skills) {
    const descTokens = tokenise(skill.description);
    const score = jaccardSimilarity(intentTokens, descTokens);
    if (score === 1.0) return skill;
    if (score > bestScore) {
      bestScore = score;
      bestSkill = skill;
    }
  }

  return bestScore >= threshold ? bestSkill : null;
}

// ---------------------------------------------------------------------------
// Activation (Progressive Disclosure — loads full body on demand)
// ---------------------------------------------------------------------------

/**
 * Loads the full SKILL.md body for a matched skill.
 * Called only after routing — keeps the initial discovery lean.
 */
export function activateSkill(skill: SkillMeta): SkillFull {
  const content = fs.readFileSync(skill.filePath, 'utf-8');
  const { body } = parseFrontmatter(content);
  return { ...skill, body };
}

// ---------------------------------------------------------------------------
// CLI entrypoint (optional: `ts-node src/agent/index.ts "<intent>"`)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const intent = process.argv.slice(2).join(' ');
  if (!intent) {
    console.error('Usage: ts-node src/agent/index.ts "<user intent>"');
    process.exit(1);
  }

  const skills = discoverSkills();
  console.log(`Discovered ${skills.length} skill(s).`);

  const match = routeIntent(intent, skills);
  if (!match) {
    console.log('No matching skill found for:', intent);
    process.exit(0);
  }

  const full = activateSkill(match);
  console.log(`\nActivated skill: ${full.name}`);
  console.log(`Allowed tools:   ${full.allowedTools.join(', ') || '(all)'}`);
  console.log('\n--- Skill Body ---\n');
  console.log(full.body);
}
