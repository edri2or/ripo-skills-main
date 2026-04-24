/**
 * E2E tests for the workflow_dispatch trigger added to distribute-skills.yml.
 *
 * Content assertions read from the local filesystem (testing the actual changes).
 * Live API tests use PUSH_TARGET_TOKEN to hit the GitHub API.
 *
 * Note: dispatch acceptance tests require the branch to exist on GitHub and the
 * workflow_dispatch trigger to be present on the branch being tested.
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

// Use main — workflow_dispatch has been on main since PR #76 was merged.
const FEATURE_BRANCH = "main";

// ---------------------------------------------------------------------------
// GitHub API helper (node:https — no extra deps)
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
// Local workflow content (tests the actual local changes)
// ---------------------------------------------------------------------------

describe("distribute-skills.yml — local YAML content", () => {
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(WORKFLOW_PATH, "utf-8");
  });

  it("file path resolves to the expected workflow filename", () => {
    expect(path.basename(WORKFLOW_PATH)).toBe(WORKFLOW_FILE);
  });

  it("contains workflow_dispatch trigger", () => {
    expect(content).toContain("workflow_dispatch:");
  });

  it("declares 'skills' input", () => {
    expect(content).toContain("skills:");
  });

  it("declares 'target_repo' input", () => {
    expect(content).toContain("target_repo:");
  });

  it("both inputs are optional (no 'required: true' in dispatch block)", () => {
    const dispatchBlock = content
      .split("workflow_dispatch:")[1]
      ?.split(/^jobs:/m)[0];
    expect(dispatchBlock).toBeDefined();
    expect(dispatchBlock).not.toContain("required: true");
  });

  it("both inputs default to empty string", () => {
    const dispatchBlock = content
      .split("workflow_dispatch:")[1]
      ?.split(/^jobs:/m)[0];
    const emptyDefaults = (dispatchBlock ?? "").match(/default:\s*''/g);
    expect(emptyDefaults).not.toBeNull();
    expect(emptyDefaults!.length).toBeGreaterThanOrEqual(2);
  });

  it("self-install job has push-only guard", () => {
    expect(content).toContain("if: github.event_name == 'push'");
  });

  it("distribute job detect step branches on event_name", () => {
    expect(content).toContain("github.event_name");
    expect(content).toContain("workflow_dispatch");
  });

  it("blank skills input iterates all exported-skills/ directories", () => {
    expect(content).toContain("exported-skills/*/");
  });

  it("TARGET_REPO env var is passed from input to python script", () => {
    expect(content).toContain("TARGET_REPO:");
    expect(content).toContain("TARGET_REPO: ${{ inputs.target_repo }}");
  });

  it("python script uses TARGET_REPO to short-circuit enrolled repo discovery", () => {
    expect(content).toContain("target_repo = os.environ.get('TARGET_REPO'");
    // When set, skips the org scan
    expect(content).toContain("enrolled = [target_repo]");
  });

  it("push trigger is still present (regression check)", () => {
    expect(content).toContain("push:");
    expect(content).toContain("branches: [main]");
    expect(content).toContain("exported-skills/*/SKILL.md");
  });
});

// ---------------------------------------------------------------------------
// GitHub API — repo & workflow metadata
// ---------------------------------------------------------------------------

describe("distribute-skills.yml — GitHub API metadata", () => {
  it("token is available in test environment", () => {
    expect(TOKEN).toBeTruthy();
  });

  it("repo is accessible with the token", async () => {
    const { status } = await ghRequest("GET", `/repos/${REPO}`);
    expect(status).toBe(200);
  });

  it("workflow is listed as active", async () => {
    const { status, data } = await ghRequest(
      "GET",
      `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}`,
    );
    expect(status).toBe(200);
    const wf = data as { state: string; path: string };
    expect(wf.state).toBe("active");
    expect(wf.path).toContain(WORKFLOW_FILE);
  });

  it("main branch exists on GitHub", async () => {
    const { status } = await ghRequest(
      "GET",
      `/repos/${REPO}/git/refs/heads/${FEATURE_BRANCH}`,
    );
    expect(status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Live dispatch API — tests the workflow_dispatch trigger from main
// ---------------------------------------------------------------------------

describe("distribute-skills.yml — live workflow_dispatch API", () => {
  it("API rejects dispatch to a non-existent ref with 422", async () => {
    const { status, data } = await ghRequest(
      "POST",
      `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      { ref: "this-branch-does-not-exist-zzz999", inputs: {} },
    );
    expect(status).toBe(422);
    expect((data as { message: string }).message).toBeTruthy();
  });

  it("API accepts dispatch from feature branch with empty inputs (returns 204)", async () => {
    const { status, data } = await ghRequest(
      "POST",
      `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        ref: FEATURE_BRANCH,
        inputs: { skills: "", target_repo: "" },
      },
    );
    // 204 = queued. If 422, workflow_dispatch is not yet present on this ref.
    if (status !== 204) {
      console.warn(
        "Dispatch response (expected 204):",
        JSON.stringify(data),
      );
    }
    expect(status).toBe(204);
  });

  it("API accepts dispatch with explicit skill name", async () => {
    const { status } = await ghRequest(
      "POST",
      `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        ref: FEATURE_BRANCH,
        inputs: { skills: "git-commit", target_repo: "" },
      },
    );
    expect(status).toBe(204);
  });

  it("API accepts dispatch targeting a specific repo", async () => {
    const { status } = await ghRequest(
      "POST",
      `/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        ref: FEATURE_BRANCH,
        inputs: { skills: "git-commit", target_repo: "edri2or/ripo-skills-main" },
      },
    );
    expect(status).toBe(204);
  });
});
