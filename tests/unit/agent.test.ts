import * as fs from "fs";
import * as os from "os";
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

function makeSkillFile(
  dir: string,
  name: string,
  fm: Record<string, string | string[]>,
  body = "# Body\n",
): void {
  const skillDir = path.join(dir, ".claude", "plugins", "test", "skills", name);
  fs.mkdirSync(skillDir, { recursive: true });
  const fmLines = Object.entries(fm).flatMap(([k, v]) =>
    Array.isArray(v) ? [`${k}:`, ...v.map((i) => `  - ${i}`)] : [`${k}: ${v}`],
  );
  const content = `---\n${fmLines.join("\n")}\n---\n\n${body}`;
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), content);
}

// ---------------------------------------------------------------------------
// discoverSkills
// ---------------------------------------------------------------------------

describe("discoverSkills", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-discover-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("returns [] when .claude/plugins does not exist", () => {
    expect(discoverSkills(tmp)).toEqual([]);
  });

  it("returns [] when plugins dir exists but is empty", () => {
    fs.mkdirSync(path.join(tmp, ".claude", "plugins"), { recursive: true });
    expect(discoverSkills(tmp)).toEqual([]);
  });

  it("discovers a single skill with all frontmatter fields", () => {
    makeSkillFile(
      tmp,
      "my-skill",
      {
        name: "my-skill",
        description: "A test skill",
        "allowed-tools": ["Read", "Write"],
      },
      "# My Skill\n",
    );
    const result = discoverSkills(tmp);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("my-skill");
    expect(result[0].description).toBe("A test skill");
    expect(result[0].allowedTools).toEqual(["Read", "Write"]);
    expect(result[0].filePath).toMatch(/SKILL\.md$/);
  });

  it("falls back to directory name when frontmatter has no name field", () => {
    makeSkillFile(tmp, "fallback-name", { description: "no name field" });
    const result = discoverSkills(tmp);
    expect(result[0].name).toBe("fallback-name");
  });

  it("discovers skills across multiple plugins", () => {
    for (const [plugin, skill] of [
      ["p1", "skill-a"],
      ["p2", "skill-b"],
      ["p2", "skill-c"],
    ] as [string, string][]) {
      const dir = path.join(
        tmp,
        ".claude",
        "plugins",
        plugin,
        "skills",
        skill,
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "SKILL.md"),
        `---\nname: ${skill}\ndescription: ${skill}\n---\n`,
      );
    }
    const names = discoverSkills(tmp)
      .map((s) => s.name)
      .sort();
    expect(names).toEqual(["skill-a", "skill-b", "skill-c"]);
  });

  it("ignores files that are not named SKILL.md", () => {
    const dir = path.join(
      tmp,
      ".claude",
      "plugins",
      "p",
      "skills",
      "my-skill",
    );
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "README.md"),
      "---\nname: fake\ndescription: fake\n---\n",
    );
    fs.writeFileSync(
      path.join(dir, "SKILL.md"),
      "---\nname: real\ndescription: real\n---\n",
    );
    const result = discoverSkills(tmp);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("real");
  });

  it("returns empty allowedTools when frontmatter field is absent", () => {
    makeSkillFile(tmp, "no-tools", { name: "no-tools", description: "d" });
    expect(discoverSkills(tmp)[0].allowedTools).toEqual([]);
  });

  it("integrates with real repo — discovers skills and each has a valid filePath", () => {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const skills = discoverSkills(repoRoot);
    expect(skills.length).toBeGreaterThan(0);
    for (const s of skills) {
      expect(s.name).toBeTruthy();
      expect(fs.existsSync(s.filePath)).toBe(true);
      expect(s.filePath).toMatch(/SKILL\.md$/);
    }
  });
});

// ---------------------------------------------------------------------------
// routeIntent
// ---------------------------------------------------------------------------

describe("routeIntent", () => {
  const skills: SkillMeta[] = [
    {
      name: "git-commit",
      description:
        "Creates a properly formatted conventional commit message for git",
      allowedTools: [],
      filePath: "/fake/git-commit/SKILL.md",
    },
    {
      name: "db-migration",
      description: "Creates and runs database schema migrations with TypeORM",
      allowedTools: [],
      filePath: "/fake/db-migration/SKILL.md",
    },
    {
      name: "doc-updater",
      description:
        "Updates markdown documentation to match source code changes",
      allowedTools: [],
      filePath: "/fake/doc-updater/SKILL.md",
    },
  ];

  it("returns the best matching skill for a clear intent", () => {
    expect(routeIntent("write a conventional commit message for git", skills)?.name).toBe(
      "git-commit",
    );
  });

  it("routes database intent to db-migration", () => {
    expect(routeIntent("run a database migration", skills)?.name).toBe(
      "db-migration",
    );
  });

  it("routes documentation intent to doc-updater", () => {
    expect(
      routeIntent("update the documentation after source changes", skills)
        ?.name,
    ).toBe("doc-updater");
  });

  it("returns null when no skill clears the default threshold", () => {
    expect(routeIntent("zzzqqqxxx unrelated gibberish xyz", skills)).toBeNull();
  });

  it("returns null for an empty intent string", () => {
    expect(routeIntent("", skills)).toBeNull();
  });

  it("returns null when the skills list is empty", () => {
    expect(routeIntent("commit my changes", [])).toBeNull();
  });

  it("returns immediately on a perfect-match skill (score 1.0)", () => {
    const perfect: SkillMeta = {
      name: "exact",
      description: "commit message conventional git",
      allowedTools: [],
      filePath: "/fake/exact/SKILL.md",
    };
    const result = routeIntent("commit message conventional git", [
      perfect,
      ...skills,
    ]);
    expect(result?.name).toBe("exact");
  });

  it("respects a higher custom threshold — excludes weak matches", () => {
    const weak = routeIntent("some code work", skills, 0.01);
    const strict = routeIntent("some code work", skills, 0.99);
    expect(weak).not.toBeNull();
    expect(strict).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(routeIntent("WRITE A CONVENTIONAL COMMIT MESSAGE FOR GIT", skills)?.name).toBe(
      "git-commit",
    );
  });
});

// ---------------------------------------------------------------------------
// activateSkill
// ---------------------------------------------------------------------------

describe("activateSkill", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "skills-activate-"));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function writeMockSkill(name: string, body: string): SkillMeta {
    const p = path.join(tmp, `${name}.md`);
    fs.writeFileSync(
      p,
      `---\nname: ${name}\ndescription: test\nallowed-tools:\n  - Read\n---\n\n${body}`,
    );
    return {
      name,
      description: "test",
      allowedTools: ["Read"],
      filePath: p,
    };
  }

  it("returns SkillFull with body content", () => {
    const skill = writeMockSkill("s", "# Title\n\nSome body text.");
    const full = activateSkill(skill);
    expect(full.body).toContain("# Title");
    expect(full.body).toContain("Some body text.");
  });

  it("body does not contain frontmatter delimiters", () => {
    const skill = writeMockSkill("s", "# Body Only");
    const full = activateSkill(skill);
    expect(full.body).not.toContain("---");
    expect(full.body).not.toContain("name:");
  });

  it("preserves all SkillMeta fields in the returned SkillFull", () => {
    const skill = writeMockSkill("preserve", "# Body");
    const full = activateSkill(skill);
    expect(full.name).toBe("preserve");
    expect(full.description).toBe("test");
    expect(full.allowedTools).toEqual(["Read"]);
    expect(full.filePath).toBe(skill.filePath);
  });

  it("throws when the file does not exist", () => {
    const missing: SkillMeta = {
      name: "missing",
      description: "",
      allowedTools: [],
      filePath: path.join(tmp, "does-not-exist.md"),
    };
    expect(() => activateSkill(missing)).toThrow();
  });

  it("handles a skill file with no frontmatter — entire content becomes body", () => {
    const p = path.join(tmp, "no-fm.md");
    fs.writeFileSync(p, "# No Frontmatter\n\nJust content.");
    const skill: SkillMeta = {
      name: "no-fm",
      description: "",
      allowedTools: [],
      filePath: p,
    };
    const full = activateSkill(skill);
    expect(full.body).toContain("# No Frontmatter");
  });

  it("integrates with real repo — activates git-commit and body is non-empty", () => {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const skills = discoverSkills(repoRoot);
    const gitCommit = skills.find((s) => s.name === "git-commit");
    if (!gitCommit) return;
    const full = activateSkill(gitCommit);
    expect(full.body.length).toBeGreaterThan(100);
    expect(full.body).toMatch(/#+\s+/);
  });

  it("integrates with real repo — discover → route → activate pipeline", () => {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const skills = discoverSkills(repoRoot);
    expect(skills.length).toBeGreaterThan(0);
    const match = routeIntent("commit my changes to git", skills);
    expect(match).not.toBeNull();
    const full = activateSkill(match!);
    expect(full.body.length).toBeGreaterThan(50);
  });
});
