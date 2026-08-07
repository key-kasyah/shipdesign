import { ProjectHistory, ValidationResult, ReadinessResult } from "../types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `API request failed with status: ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        message = errorJson.detail;
      }
    } catch (_) {}
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Projects
  async listProjects(): Promise<any[]> {
    return request<any[]>("/api/projects");
  },

  async createProject(payload: {
    project_id: string;
    project_name: string;
    owner: string;
    organization?: string;
    creator: string;
    vessel_type?: string;
    target_dwt_ton?: number;
    service_speed_knots?: number;
    route_name?: string;
    route_distance_nm?: number;
  }): Promise<ProjectHistory> {
    return request<ProjectHistory>("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getProject(projectId: string): Promise<ProjectHistory> {
    return request<ProjectHistory>(`/api/projects/${projectId}`);
  },

  async updateProject(
    projectId: string,
    payload: any
  ): Promise<ProjectHistory> {
    return request<ProjectHistory>(`/api/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteProject(projectId: string): Promise<any> {
    return request<any>(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
  },

  // Validation
  async validateProject(projectId: string): Promise<ValidationResult> {
    return request<ValidationResult>(`/api/projects/${projectId}/validate`, {
      method: "POST",
    });
  },

  // Revisions
  async createRevision(
    projectId: string,
    payload: { parent_revision_id: string; creator: string; reason: string }
  ): Promise<ProjectHistory> {
    return request<ProjectHistory>(`/api/projects/${projectId}/revisions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async submitRevision(
    projectId: string,
    revisionId: string,
    actor: string
  ): Promise<ProjectHistory> {
    return request<ProjectHistory>(
      `/api/projects/${projectId}/revisions/${revisionId}/submit`,
      {
        method: "POST",
        body: JSON.stringify({ actor }),
      }
    );
  },

  async approveRevision(
    projectId: string,
    revisionId: string,
    payload: { reviewer: string; note: string }
  ): Promise<ProjectHistory> {
    return request<ProjectHistory>(
      `/api/projects/${projectId}/revisions/${revisionId}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ ...payload, decision: "APPROVED" }),
      }
    );
  },

  async rejectRevision(
    projectId: string,
    revisionId: string,
    payload: { reviewer: string; note: string }
  ): Promise<ProjectHistory> {
    return request<ProjectHistory>(
      `/api/projects/${projectId}/revisions/${revisionId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ ...payload, decision: "REJECTED" }),
      }
    );
  },

  // Readiness
  async getReadiness(projectId: string): Promise<ReadinessResult> {
    return request<ReadinessResult>(`/api/projects/${projectId}/readiness`);
  },

  // AI Assistant
  async askAI(
    projectId: string,
    payload: { question: string; mode: string; revision_id: string }
  ): Promise<{ answer: string; safety_blocked?: boolean }> {
    return request<{ answer: string; safety_blocked?: boolean }>(
      `/api/projects/${projectId}/assistant`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  async askStage2AI(
    projectId: string,
    payload: { question: string; mode: string; stage2_data?: any }
  ): Promise<{ answer: string; safety_blocked?: boolean }> {
    return request<{ answer: string; safety_blocked?: boolean }>(
      `/api/projects/${projectId}/stage2/assistant`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  // Import / Export
  async importProject(data: any): Promise<{ success: boolean; project_id: string; preview: any }> {
    return request<{ success: boolean; project_id: string; preview: any }>("/api/projects/import", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async exportProject(projectId: string): Promise<any> {
    return request<any>(`/api/projects/${projectId}/export`);
  },

  async exportBaseline(projectId: string, version: string): Promise<any> {
    return request<any>(`/api/projects/${projectId}/export-baseline?version=${version}`);
  },

  // Stage 2 Preliminary Design
  async getStage2History(projectId: string): Promise<any> {
    return request<any>(`/api/projects/${projectId}/stage2/history`);
  },

  async createStage2Scenario(
    projectId: string,
    payload: { scenario_name: string; creator: string; primary_comparable_ship?: any }
  ): Promise<any> {
    return request<any>(`/api/projects/${projectId}/stage2/scenarios`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateStage2Scenario(
    projectId: string,
    revisionId: string,
    payload: any
  ): Promise<any> {
    return request<any>(`/api/projects/${projectId}/stage2/scenarios/${revisionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async submitStage2Scenario(
    projectId: string,
    revisionId: string,
    actor: string
  ): Promise<any> {
    return request<any>(`/api/projects/${projectId}/stage2/scenarios/${revisionId}/submit`, {
      method: "POST",
      body: JSON.stringify({ actor }),
    });
  },

  async reviewStage2Scenario(
    projectId: string,
    revisionId: string,
    payload: { reviewer: string; decision: string; note: string }
  ): Promise<any> {
    return request<any>(`/api/projects/${projectId}/stage2/scenarios/${revisionId}/review`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async validateStage2Scenario(
    projectId: string,
    revisionId: string
  ): Promise<any> {
    return request<any>(`/api/projects/${projectId}/stage2/scenarios/${revisionId}/validate`);
  },

  // Ports Database & Route Calculator
  async getPorts(): Promise<any[]> {
    return request<any[]>("/api/ports");
  },

  async calculateRoute(portIds: number[]): Promise<{
    route_name: string;
    legs: Array<{
      origin_id: number;
      origin_name: string;
      destination_id: number;
      destination_name: string;
      distance_nm: number;
    }>;
    max_leg_nm: number;
    total_distance_nm: number;
  }> {
    return request<any>("/api/ports/calculate-route", {
      method: "POST",
      body: JSON.stringify({ port_ids: portIds }),
    });
  },
};

