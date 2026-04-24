/**
 * E2E tests for auto-merge on fallback PRs in enrolled repos with strict branch protection.
 *
 * Tests the fix introduced in PR #157 (distribute-skills.yml):
 * When a direct push to an enrolled repo's default branch is blocked (HTTP 409/422),
 * the distribute job opens a PR on a `sync/distribute-<skill>-<date>` branch and
 * immediately enables GitHub native auto-merge via `gh pr merge --auto --squash`.
 *
 * This prevents the cascading "behind" problem that occurred in project-life-130
 * (strict: true branch protection) where every distribution PR went stale because
 * auto-merge was never enabled and required manual intervention.
 *
 * Two test layers:
 *  - Local YAML assertions: structural checks that always run (no token required).
 *  - Live API tests: verify the workflow dispatch endpoint accepts from `main`
 *    (token required via PUSH_TARGET_TOKEN / GH_TOKEN / GITHUB_TOKEN).
 */

import * as fs from "fs";
import * as https from "https";
import * as path from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REPO = "edri2or/ripo-skills-main";
const WORKFLOW_FILE = "distribute-skills.yml";
const WORKFLOW_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  ".github",
  "workflows",
  WORKFLOW_FILE,
);
const TOKEN =
  process.env.PUSH_TARGET_TOKEN ||
  process.env.GH_TOKEN ||
  process.env.GITHUB_TOKEN ||
  "";

// ---------------------------------------------------------------------------
// GitHub API helper
// ---------------------------------------------------------------------------

interface GHResponse {
  status: number;
  data: unknown;
}

function ghRequest(
  method: string,
  apiPath: string,
  body?: object,
): Promise<GHResponse> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = https.request(
      {
        hostname: "api.github.com",
        path: apiPath,
        method,
        headers: {
          Authorization: `token ${TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "ripo-skills-main-e2e-tests",
          ...(payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let data: unknown = raw;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            /* keep raw string */
          }
          resolve({ status: res.statusCode ?? 0, data });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Helpers to extract blocks from the YAML file
// ---------------------------------------------------------------------------

function getDistributePyBlock(content: string): string {
  // The distribute job uses `python3 << 'EOF'` (self-install uses 'PYEOF')
  return content.split("python3 << 'EOF'")[1] ?? "";
}

// ---------------------------------------------------------------------------
// Local YAML structural assertions (always run — no token needed)
// ---------------------------------------------------------------------------

describe("distribute-skills.yml — auto-merge hardening (PR #157)", () => {
  let content: string;
  let pyBlock: string;

  beforeAll(() => {
    content = fs.readFileSync(WORKFLOW_PATH, "utf-8");
    pyBlock = getDistributePyBlock(content);
  });

  it("fallback branch name uses sync/ prefix (required for auto-merge-sync.yml eligibility)", () => {
    // auto-merge-sync.yml only enables auto-merge on branches starting with sync/
    // If the prefix is wrong the PR sits open forever
    expect(content).toContain("sync/distribute-");
  });

  it("calls gh pr merge with --auto and --squash flags", () => {
    expect(content).toContain("'--auto'");
    expect(content).toContain("'--squash'");
  });

  it("passes --repo flag to gh pr merge (required when GH_TOKEN is injected via env)", () => {
    expect(content).toContain("'--repo'");
  });

  it("subprocess is imported at top level of the distribute Python script (not deferred)", () => {
    // Was the root cause of the hardening: if subprocess were imported inside a function
    // or deferred, a NameError at runtime would silently skip the auto-merge call.
    const subprocessIdx = pyBlock.indexOf("subprocess");
    const firstDefIdx = pyBlock.indexOf("def ");
    expect(subprocessIdx).toBeGreaterThan(-1);
    // subprocess must appear (as an import) before the first function definition
    expect(subprocessIdx).toBeLessThan(firstDefIdx);
  });

  it("sets timeout=30 on the subprocess auto-merge call", () => {
    // Without a timeout, a hung gh CLI call blocks the runner indefinitely
    expect(content).toContain("timeout=30");
  });

  it("gh_env is assigned exactly once at the top of the Python script", () => {
    // Must not be re-assigned per-repo or per-skill — single source of truth
    const assignments = (content.match(/gh_env\s*=/g) ?? []).length;
    expect(assignments).toBe(1);
  });

  it("checks returncode to distinguish auto-merge success from failure", () => {
    expect(content).toContain("returncode");
  });

  it("auto-merge failure uses ⚠️ status (soft warning, not a hard failure)", () => {
    // If auto-merge can't be enabled the PR is still open — distribution succeeded.
    // Only a write or PR-open failure is a hard error (❌).
    const mergeResultBlock =
      content.match(/if _merge\.returncode == 0:([\s\S]*?)elif pr_err/)?.[0] ?? "";
    expect(mergeResultBlock).toContain("⚠️");
  });

  it("auto-merge failure does NOT increment hard_failures counter", () => {
    // hard_failures is only incremented for ref-fetch / branch-write / pr-open errors
    const mergeResultBlock =
      content.match(/if _merge\.returncode == 0:([\s\S]*?)elif pr_err/)?.[0] ?? "";
    expect(mergeResultBlock).not.toContain("hard_failures");
  });

  it("gh_env dict is passed as env= to the subprocess call", () => {
    expect(content).toContain("env=gh_env");
  });

  it("fallback branch date tag uses UTC to avoid timezone drift across runners", () => {
    expect(content).toContain("timezone.utc");
  });
});

// ---------------------------------------------------------------------------
// Live API tests — dispatch from main
// ---------------------------------------------------------------------------

describe("distribute-skills.yml — live dispatch from main (auto-merge path)", () => {
  it("token is available in test environment", () => {
    expect(TOKEN).toBeTruthy();
  });

  it("workflow is listed as active on main", async () => {
    const { status, data } = await ghRequest(
      "GET",
      `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}`,
    );
    expect(status).toBe(200);
    const wf = data as { state: string; path: string };
    expect(wf.state).toBe("active");
    expect(wf.path).toContain(WORKFLOW_FILE);
  });

  it("dispatch from main with single skill + target_repo returns 204", async () => {
    // Dispatch a single skill back to ripo-skills-main itself (safe: self-install only).
    // This verifies the workflow_dispatch trigger is wired on main and the inputs are valid.
    const { status, data } = await ghRequest(
      "POST",
      `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        ref: "main",
        inputs: { skills: "git-commit", target_repo: REPO },
      },
    );
    if (status !== 204) {
      console.warn("Dispatch response (expected 204):", JSON.stringify(data));
    }
    expect(status).toBe(204);
  });

  it("dispatch to a non-existent ref is rejected with 422", async () => {
    const { status } = await ghRequest(
      "POST",
      `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      { ref: "this-branch-does-not-exist-zzz999", inputs: {} },
    );
    expect(status).toBe(422);
  });
});
