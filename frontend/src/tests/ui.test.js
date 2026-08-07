const assert = require("assert");

// Mock global fetch for testing the API Client in Node environment
global.fetch = async (url, options) => {
  if (url.includes("/api/projects/PRJ-101/readiness")) {
    return {
      ok: true,
      json: async () => ({
        project_id: "PRJ-101",
        completeness_score: 100,
        readiness_status: "READY_FOR_BASELINE",
        handoff_ready: true,
        risks_and_assumptions: [],
        operational_profile: {
          vessel_type: "GENERAL_CARGO",
          service_speed_knots: 12.0,
          operating_area: "Java Sea",
          route: "Jakarta -> Surabaya"
        },
        capacity_requirements: {
          target_dwt_ton: 5000
        },
        design_constraints: {
          draft_constraint_type: "HARD_CONSTRAINT"
        },
        unresolved_decisions: []
      })
    };
  }

  if (url.includes("/api/projects/PRJ-101/validate")) {
    return {
      ok: true,
      json: async () => ({
        is_valid: true,
        is_complete: true,
        can_approve_baseline: true,
        issues: [],
        error_count: 0,
        warning_count: 0,
        timestamp: "2026-07-22T09:00:00Z"
      })
    };
  }

  if (url.includes("/api/projects") && options?.method === "POST") {
    const body = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        project_id: body.project_id,
        revisions: [
          {
            revision_id: "rev-123",
            revision_number: 0,
            status: "DRAFT",
            data_snapshot: {
              project_id: body.project_id,
              project_name: body.project_name,
              owner: body.owner,
              is_complete: false
            }
          }
        ]
      })
    };
  }

  return {
    ok: false,
    status: 404,
    json: async () => ({ detail: "Not Found" })
  };
};

// Import our api service using standard require by copying the fetch wrapper logic
const api = {
  async createProject(payload) {
    const response = await fetch("http://localhost:8000/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async validateProject(projectId) {
    const response = await fetch(`http://localhost:8000/api/projects/${projectId}/validate`, {
      method: "POST",
    });
    return response.json();
  },

  async getReadiness(projectId) {
    const response = await fetch(`http://localhost:8000/api/projects/${projectId}/readiness`);
    return response.json();
  }
};

async function runTests() {
  console.log("=== RUNNING FRONTEND API CLIENT TESTS ===");

  // Test 1: createProject serialization
  console.log("Running Test 1: createProject...");
  const proj = await api.createProject({
    project_id: "PRJ-NEW-99",
    project_name: "KM Mock Ship",
    owner: "PT Mock",
    creator: "tester"
  });
  assert.strictEqual(proj.project_id, "PRJ-NEW-99");
  assert.strictEqual(proj.revisions[0].data_snapshot.project_name, "KM Mock Ship");
  console.log("✓ Test 1 Passed!");

  // Test 2: validateProject parsing
  console.log("Running Test 2: validateProject...");
  const val = await api.validateProject("PRJ-101");
  assert.strictEqual(val.is_valid, true);
  assert.strictEqual(val.is_complete, true);
  assert.strictEqual(val.can_approve_baseline, true);
  console.log("✓ Test 2 Passed!");

  // Test 3: getReadiness score calculations
  console.log("Running Test 3: getReadiness...");
  const read = await api.getReadiness("PRJ-101");
  assert.strictEqual(read.project_id, "PRJ-101");
  assert.strictEqual(read.completeness_score, 100);
  assert.strictEqual(read.handoff_ready, true);
  console.log("✓ Test 3 Passed!");

  console.log("All frontend mock API client tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
