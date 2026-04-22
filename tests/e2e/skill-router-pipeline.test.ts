/**
 * E2E tests for the skill-router pipeline.
 *
 * Verifies the full discover → route → activate flow against the real repo
 * filesystem, with specific assertions for the skill-router skill.
 * All operations are synchronous fs I/O — no async, no mocks, no temp dirs.
 */

import * as fs from "fs";
import * as path from "path";
import {
  activateSkill,
  discoverSkills,
  routeIntent,
  SkillMeta,
} from "../../src/agent/index";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PLUGIN_JSON = path.join(
  REPO_ROOT,
  ".claude",
  "plugins",
  "engineering-std",
  ".claude-plugin",
  "plugin.json",
);
const SKILL_ROUTER_MD = path.join(
  REPO_ROOT,
  ".claude",
  "plugins",
  "engineering-std",
  "skills",
  "skill-router",
  "SKILL.md",
);
const NONEXISTENT_ROOT = path.join("/tmp", "nonexistent-ripo-skills-root");

// tokenise() keeps length > 1 (2-char tokens like "to", "or"), matching src/agent/index.ts.
// The real routing margin for the primary query is ~0.049 with this tokenizer.
const ROUTING_MARGIN_THRESHOLD = 0.04;

// ---------------------------------------------------------------------------
// Helpers — mirror src/agent/index.ts internals for margin assertions.
// Not imported because exporting scoring internals would leak implementation.
// ---------------------------------------------------------------------------

function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Returns scores sorted descending. Uses pre-tokenised descriptions to avoid redundant work. */
function scoreAll(
  query: string,
  tokenisedDescs: Map<string, Set<string>>,
): { name: string; score: number }[] {
  const qTokens = tokenise(query);
  return [...tokenisedDescs.entries()]
    .map(([name, dTokens]) => ({ name, score: jaccard(qTokens, dTokens) }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Shared fixtures — loaded once for the whole suite
// ---------------------------------------------------------------------------

let realSkills: SkillMeta[];
let skillRouterMeta: SkillMeta;
let preTokenisedDescs: Map<string, Set<string>>;

beforeAll(() => {
  realSkills = discoverSkills(REPO_ROOT);
  skillRouterMeta = realSkills.find((s) => s.name === "skill-router")!;
  preTokenisedDescs = new Map(realSkills.map((s) => [s.name, tokenise(s.description)]));
});

// ---------------------------------------------------------------------------
// 1 — Discoverability
// ---------------------------------------------------------------------------

describe("skill-router — discoverability", () => {
  it("is found by discoverSkills in the real repo", () => {
    expect(skillRouterMeta).toBeDefined();
  });

  it("has correct allowed-tools: Bash and Read", () => {
    expect(skillRouterMeta.allowedTools).toContain("Bash");
    expect(skillRouterMeta.allowedTools).toContain("Read");
    expect(skillRouterMeta.allowedTools).toHaveLength(2);
  });

  it("filePath points to an existing SKILL.md", () => {
    expect(fs.existsSync(skillRouterMeta.filePath)).toBe(true);
    expect(path.basename(skillRouterMeta.filePath)).toBe("SKILL.md");
  });
});

// ---------------------------------------------------------------------------
// 2 — Full pipeline
// ---------------------------------------------------------------------------

describe("skill-router — full discover → route → activate pipeline", () => {
  it("routes 'which skill should I use for my task' to skill-router", () => {
    const match = routeIntent("which skill should I use for my task", realSkills);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("skill-router");
  });

  it("activates skill-router and returns a non-empty body", () => {
    const full = activateSkill(skillRouterMeta);
    expect(full.body.length).toBeGreaterThan(200);
  });

  it("activated body contains expected structural sections", () => {
    const full = activateSkill(skillRouterMeta);
    expect(full.body).toMatch(/##\s+Instructions/);
    expect(full.body).toMatch(/##\s+Safety Rules/);
    expect(full.body).toMatch(/##\s+Examples/);
  });

  it("activated body does not begin with a YAML frontmatter fence", () => {
    const full = activateSkill(skillRouterMeta);
    // Body may contain "---" in markdown table separators — only the opening fence matters.
    expect(full.body.trimStart()).not.toMatch(/^---\s*\n/);
    expect(full.body).not.toContain("name: skill-router");
  });

  it("all SkillMeta fields are preserved through activation", () => {
    const full = activateSkill(skillRouterMeta);
    expect(full.name).toBe(skillRouterMeta.name);
    expect(full.description).toBe(skillRouterMeta.description);
    expect(full.allowedTools).toEqual(skillRouterMeta.allowedTools);
    expect(full.filePath).toBe(skillRouterMeta.filePath);
  });
});

// ---------------------------------------------------------------------------
// 3 — plugin.json registration + description contract
// ---------------------------------------------------------------------------

describe("skill-router — plugin.json registration", () => {
  let plugin: { skills: string[] };
  let description: string;

  beforeAll(() => {
    plugin = JSON.parse(fs.readFileSync(PLUGIN_JSON, "utf-8")) as { skills: string[] };
    const content = fs.readFileSync(SKILL_ROUTER_MD, "utf-8");
    description = content.match(/^description:\s*"(.+)"$/m)![1];
  });

  it("is registered in plugin.json skills array", () => {
    expect(plugin.skills).toContain("skills/skill-router/SKILL.md");
  });

  it("description is ≤ 250 characters", () => {
    expect(description.length).toBeLessThanOrEqual(250);
  });

  it("description front-loads the primary use case in first 10 words", () => {
    const firstTenWords = description.split(/\s+/).slice(0, 10).join(" ").toLowerCase();
    expect(firstTenWords).toMatch(/skill/);
  });
});

// ---------------------------------------------------------------------------
// 4 — Invalid input
// ---------------------------------------------------------------------------

describe("skill-router — invalid / unmatched input", () => {
  it("routeIntent with empty string returns null", () => {
    expect(routeIntent("", realSkills)).toBeNull();
  });

  it("routeIntent with unrelated gibberish returns null", () => {
    expect(routeIntent("zzzqqqxxx unrelated gibberish xyz", realSkills)).toBeNull();
  });

  it("routeIntent with whitespace-only string returns null", () => {
    expect(routeIntent("   \t  ", realSkills)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5 — External dependency failure
// ---------------------------------------------------------------------------

describe("skill-router — external dependency failure", () => {
  it("discoverSkills returns [] when plugins dir does not exist", () => {
    expect(discoverSkills(NONEXISTENT_ROOT)).toEqual([]);
  });

  it("activateSkill throws when SKILL.md file is missing", () => {
    const ghost: SkillMeta = {
      name: "ghost",
      description: "does not exist",
      allowedTools: [],
      filePath: path.join(NONEXISTENT_ROOT, "ghost.md"),
    };
    expect(() => activateSkill(ghost)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6 — Idempotency
// ---------------------------------------------------------------------------

describe("skill-router — idempotency", () => {
  it("discoverSkills returns identical sorted names on two successive calls", () => {
    const first = discoverSkills(REPO_ROOT).map((s) => s.name).sort();
    const second = discoverSkills(REPO_ROOT).map((s) => s.name).sort();
    expect(first).toEqual(second);
  });

  it("routeIntent returns the same winner on repeated calls with the same input", () => {
    const intent = "which skill should I use for my task";
    const r1 = routeIntent(intent, realSkills);
    const r2 = routeIntent(intent, realSkills);
    expect(r1?.name).toBe(r2?.name);
  });
});

// ---------------------------------------------------------------------------
// 7 — Routing margin verification (5 queries)
// ---------------------------------------------------------------------------

describe("skill-router — routing margin verification (5 queries)", () => {
  const cases: { query: string; expectedWinner: string | null }[] = [
    { query: "which skill should I use for my task", expectedWinner: "skill-router" },
    { query: "create a new git commit message",       expectedWinner: null },
    { query: "what skill matches my intent",          expectedWinner: "skill-router" },
    { query: "find the right skill for my request",   expectedWinner: "skill-router" },
    { query: "create a new database migration",       expectedWinner: null },
  ];

  test.each(cases)('query: "$query"', ({ query, expectedWinner }) => {
    const sorted = scoreAll(query, preTokenisedDescs);
    const winner = sorted[0];
    const runnerUp = sorted[1];

    if (expectedWinner === "skill-router") {
      expect(winner.name).toBe("skill-router");
      expect(winner.score - runnerUp.score).toBeGreaterThanOrEqual(ROUTING_MARGIN_THRESHOLD);
    } else {
      expect(winner.name).not.toBe("skill-router");
    }
  });
});
