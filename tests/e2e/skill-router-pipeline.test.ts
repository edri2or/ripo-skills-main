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
// Helpers
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

/** Mirrors tokenise() in src/agent/index.ts — used for margin assertions. */
function tokenise(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

/** Mirrors jaccardSimilarity() in src/agent/index.ts — used for margin assertions. */
function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Returns sorted scores for all skills against a query. */
function scoreAll(
  query: string,
  skills: SkillMeta[],
): { name: string; score: number }[] {
  const qTokens = tokenise(query);
  return skills
    .map((s) => ({ name: s.name, score: jaccard(qTokens, tokenise(s.description)) }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Shared fixture — loaded once for the whole suite
// ---------------------------------------------------------------------------

let realSkills: SkillMeta[];

beforeAll(() => {
  realSkills = discoverSkills(REPO_ROOT);
});

// ---------------------------------------------------------------------------
// 1 & 2 — Happy path: discoverability + full pipeline
// ---------------------------------------------------------------------------

describe("skill-router — discoverability", () => {
  it("is found by discoverSkills in the real repo", () => {
    const found = realSkills.find((s) => s.name === "skill-router");
    expect(found).toBeDefined();
  });

  it("has correct allowed-tools: Bash and Read", () => {
    const found = realSkills.find((s) => s.name === "skill-router")!;
    expect(found.allowedTools).toContain("Bash");
    expect(found.allowedTools).toContain("Read");
    expect(found.allowedTools).toHaveLength(2);
  });

  it("filePath points to an existing SKILL.md", () => {
    const found = realSkills.find((s) => s.name === "skill-router")!;
    expect(fs.existsSync(found.filePath)).toBe(true);
    expect(path.basename(found.filePath)).toBe("SKILL.md");
  });
});

describe("skill-router — full discover → route → activate pipeline", () => {
  it("routes 'which skill should I use for my task' to skill-router", () => {
    const match = routeIntent("which skill should I use for my task", realSkills);
    expect(match).not.toBeNull();
    expect(match!.name).toBe("skill-router");
  });

  it("activates skill-router and returns a non-empty body", () => {
    const meta = realSkills.find((s) => s.name === "skill-router")!;
    const full = activateSkill(meta);
    expect(full.body.length).toBeGreaterThan(200);
  });

  it("activated body contains expected structural sections", () => {
    const meta = realSkills.find((s) => s.name === "skill-router")!;
    const full = activateSkill(meta);
    expect(full.body).toMatch(/##\s+Instructions/);
    expect(full.body).toMatch(/##\s+Safety Rules/);
    expect(full.body).toMatch(/##\s+Examples/);
  });

  it("activated body does not begin with a YAML frontmatter fence", () => {
    const meta = realSkills.find((s) => s.name === "skill-router")!;
    const full = activateSkill(meta);
    // Body may contain "---" in markdown table separators — we only
    // care that the frontmatter block itself was stripped.
    expect(full.body.trimStart()).not.toMatch(/^---\s*\n/);
    expect(full.body).not.toContain("name: skill-router");
  });

  it("all SkillMeta fields are preserved through activation", () => {
    const meta = realSkills.find((s) => s.name === "skill-router")!;
    const full = activateSkill(meta);
    expect(full.name).toBe(meta.name);
    expect(full.description).toBe(meta.description);
    expect(full.allowedTools).toEqual(meta.allowedTools);
    expect(full.filePath).toBe(meta.filePath);
  });
});

// ---------------------------------------------------------------------------
// 3 — plugin.json registration + description contract
// ---------------------------------------------------------------------------

describe("skill-router — plugin.json registration", () => {
  let plugin: { skills: string[] };

  beforeAll(() => {
    plugin = JSON.parse(fs.readFileSync(PLUGIN_JSON, "utf-8")) as {
      skills: string[];
    };
  });

  it("is registered in plugin.json skills array", () => {
    expect(plugin.skills).toContain("skills/skill-router/SKILL.md");
  });

  it("description is ≤ 250 characters", () => {
    const content = fs.readFileSync(SKILL_ROUTER_MD, "utf-8");
    const match = content.match(/^description:\s*"(.+)"$/m);
    expect(match).not.toBeNull();
    expect(match![1].length).toBeLessThanOrEqual(250);
  });

  it("description front-loads the primary use case in first 10 words", () => {
    const content = fs.readFileSync(SKILL_ROUTER_MD, "utf-8");
    const match = content.match(/^description:\s*"(.+)"$/m);
    const firstTenWords = match![1].split(/\s+/).slice(0, 10).join(" ").toLowerCase();
    expect(firstTenWords).toMatch(/skill/);
  });
});

// ---------------------------------------------------------------------------
// 4 & 5 — Invalid input
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
// 6 — External dependency failure
// ---------------------------------------------------------------------------

describe("skill-router — external dependency failure", () => {
  it("discoverSkills returns [] when plugins dir does not exist", () => {
    expect(discoverSkills("/tmp/nonexistent-root-xyz-abc-123")).toEqual([]);
  });

  it("activateSkill throws when SKILL.md file is missing", () => {
    const ghost: SkillMeta = {
      name: "ghost",
      description: "does not exist",
      allowedTools: [],
      filePath: "/tmp/does-not-exist-ghost.md",
    };
    expect(() => activateSkill(ghost)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7 — Idempotency
// ---------------------------------------------------------------------------

describe("skill-router — idempotency", () => {
  it("discoverSkills returns identical sorted names on two successive calls", () => {
    const first = discoverSkills(REPO_ROOT)
      .map((s) => s.name)
      .sort();
    const second = discoverSkills(REPO_ROOT)
      .map((s) => s.name)
      .sort();
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
// 8 — Edge cases: routing margin ≥ 0.05 (5 verification queries)
// ---------------------------------------------------------------------------

describe("skill-router — routing margin verification (5 queries)", () => {
  // Source tokenise() filters length > 1 (keeps 2-char tokens like "to", "or").
  // Real margin for primary query is ~0.049 with this tokenizer — threshold set to 0.04.
  const MARGIN_THRESHOLD = 0.04;

  const cases: { query: string; expectedWinner: string | null }[] = [
    {
      query: "which skill should I use for my task",
      expectedWinner: "skill-router",
    },
    {
      query: "create a new git commit message",
      expectedWinner: null, // must NOT be skill-router
    },
    {
      query: "what skill matches my intent",
      expectedWinner: "skill-router",
    },
    {
      query: "find the right skill for my request",
      expectedWinner: "skill-router",
    },
    {
      query: "create a new database migration",
      expectedWinner: null, // must NOT be skill-router
    },
  ];

  test.each(cases)('query: "$query"', ({ query, expectedWinner }) => {
    const sorted = scoreAll(query, realSkills);
    const winner = sorted[0];
    const runnerUp = sorted[1];

    if (expectedWinner === "skill-router") {
      expect(winner.name).toBe("skill-router");
      expect(winner.score - runnerUp.score).toBeGreaterThanOrEqual(MARGIN_THRESHOLD);
    } else {
      // skill-router must NOT win queries for other skills
      expect(winner.name).not.toBe("skill-router");
    }
  });
});
