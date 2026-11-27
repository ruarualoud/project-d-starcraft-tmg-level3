// Ticket 27 / Slice 271 — roster-planning workspace client (Web/App).
// Talks to the additive same-origin workspace API. Network failures surface
// as the explicit `disconnected` state; an origin that answers without
// speaking the workspace JSON protocol (for example a static-only host with
// no planning API mounted) is the same honest disconnected state. Typed
// server reasons are preserved verbatim so the UI can render honest
// error/unavailable states. No credential, seat token or Room mutation ever
// passes through this client.

import type { DataPackage } from '../types';

export const ROSTER_PLANNING_API_PREFIX = '/starcraft-tmg-level3/roster-planning/v1';

export type WorkspaceErrorKind = 'disconnected' | 'typed';

export class RosterPlanningClientError extends Error {
  kind: WorkspaceErrorKind;
  code: string;
  httpStatus: number | null;
  constructor(kind: WorkspaceErrorKind, code: string, httpStatus: number | null, detail?: string) {
    super(detail || code);
    this.kind = kind;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type RosterWorkspaceEnvelope<T> = {
  ok: boolean;
  reason?: string;
  detail?: string | null;
} & T;

function baseUrl(): string {
  return process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || '';
}

async function send<T>(method: string, subpath: string, body?: unknown, setupId?: string): Promise<T> {
  let response: Response;
  try {
    response = await globalThis.fetch(`${baseUrl()}${ROSTER_PLANNING_API_PREFIX}/${subpath}`, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(setupId ? { 'x-starcraft-match-setup':setupId } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new RosterPlanningClientError('disconnected', 'ROSTER_WORKSPACE_DISCONNECTED', null);
  }
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    throw new RosterPlanningClientError('disconnected', 'ROSTER_WORKSPACE_DISCONNECTED', response.status);
  }
  if (!payload?.ok) {
    throw new RosterPlanningClientError('typed',
      String(payload?.reason || payload?.error || 'ROSTER_WORKSPACE_REQUEST_FAILED'),
      response.status, payload?.detail || undefined);
  }
  return payload as T;
}

export interface WorkspaceSessionSetup {
  factionRecordKey: string;
  opponentFactionRecordKey: string;
  engagementScale: string;
  mineralBudget: number;
  opponentInformationBoundary: string;
}

export type RosterMatchSetup = {
  id:string; mission:string; deployment:string; scale:string; minerals:number;
  mapBinding:{missionRecordKey:string;deploymentRecordKey:string;seedId:string};
  missionMarkers:{targetId:string}[];
};

function clientOperations(request: <T>(method:string, subpath:string, body?:unknown) => Promise<T>) {
  return {
  previewSkillRefresh: () => request<{previewHash:string;existingSkills:number;sectionCount:number;affected:number;
    unrepresentedFactions:string[]}>('POST','skill-refresh-preview',{}),
  matchSetup: () => request<{setup:RosterMatchSetup; catalogue:DataPackage & {
    source:{officialDatasetHash:string;dataVersions:{unitsVersion:string;cardsVersion:string;rulesVersion:string}}
  }}>('GET','match-setup'),
  launchWorkflowRoom: (id: string, matchMode: 'user_vs_agent' | 'human_vs_human' | 'agent_vs_agent') =>
    request<{ match: { roomId: string; joinUrl: string } }>('POST',
      'workflows/' + encodeURIComponent(id) + '/launch-room', { matchMode }),
  health: () => request<{ descriptor: any }>('GET', 'health'),
  listWorkflows: () => request<{ workflows: any[] }>('GET', 'workflows'),
  createWorkflow: (setup: WorkspaceSessionSetup, candidateInput?: unknown, planningEntry: 'balanced' | 'card_synergy' | 'restructure' = 'balanced') =>
    request<{ workflow: any }>('POST', 'workflows', { setup, planningEntry,
      ...(candidateInput ? { candidateInput, mode: planningEntry === 'restructure' ? 'editable' : 'fixed' } : { mode: 'editable' }) }),
  readWorkflow: (id: string) => request<{ workflow: any }>('GET', `workflows/${encodeURIComponent(id)}`),
  runWorkflow: (id: string) => request<{ workflow: any }>('POST', `workflows/${encodeURIComponent(id)}/run`, {}),
  pauseWorkflow: (id: string) => request<{ workflow: any }>('POST', `workflows/${encodeURIComponent(id)}/pause`, {}),
  workflowTrace: (id: string) => request<{ trace: any[] }>('GET', `workflows/${encodeURIComponent(id)}/trace`),
  readWorkflowTrace: (id: string, traceId: string) => request<{ trace: any }>('GET',
    `workflows/${encodeURIComponent(id)}/trace/${encodeURIComponent(traceId)}`),
  readWorkflowEvidence: (id: string, number: number) => request<{ evidence: any }>('GET',
    `workflows/${encodeURIComponent(id)}/evidence/${number}`),
  listIterativeSessions: () =>
    request<{ journeys: any[] }>('GET', 'iterative/sessions'),
  createIterativeSession: (setup: WorkspaceSessionSetup) =>
    request<{ journey: any }>('POST', 'iterative/sessions', { setup }),
  readIterativeSession: (sessionId: string) =>
    request<{ journey: any }>('GET',
      `iterative/sessions/${encodeURIComponent(sessionId)}`),
  runIterativeSession: (sessionId: string) =>
    request<{ journey: any }>('POST',
      `iterative/sessions/${encodeURIComponent(sessionId)}/run`, {}),
  pauseIterativeSession: (sessionId: string) =>
    request<{ journey: any }>('POST',
      `iterative/sessions/${encodeURIComponent(sessionId)}/pause`, {}),
  launchIterativeRoom: (sessionId: string) =>
    request<{ match: { roomId: string; joinUrl: string;
      matchMode: 'agent_vs_agent'; planHash: string } }>('POST',
      `iterative/sessions/${encodeURIComponent(sessionId)}/launch-room`, {}),
  catalogue: () => request<{ catalogue: any }>('GET', 'catalogue'),
  enumeration: (query: { factionRecordKey: string; scaleId?: string; mineralBudget?: number }) =>
    request<{ enumeration: any }>(
      'GET',
      `enumeration?factionRecordKey=${encodeURIComponent(query.factionRecordKey)}`
        + `&scaleId=${encodeURIComponent(query.scaleId || 'Standard')}`
        + `&mineralBudget=${encodeURIComponent(String(query.mineralBudget ?? 2000))}`,
    ),
  listSessions: () => request<{ sessions: any[]; planningBusy: boolean; deliberation: any }>('GET', 'sessions'),
  createSession: (setup: WorkspaceSessionSetup) =>
    request<{ session: any }>('POST', 'sessions', { setup }),
  createPresetSession: (setup: WorkspaceSessionSetup, candidateInput: unknown) =>
    request<{ session: any }>('POST', 'sessions/preset', { setup, candidateInput }),
  readSession: (sessionId: string) =>
    request<{ session: any }>('GET', `sessions/${encodeURIComponent(sessionId)}`),
  runPresetSession: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/run`, {}),
  launchPresetRoom: (sessionId: string) =>
    request<{ match: { roomId: string; joinUrl: string; matchMode: 'agent_vs_agent'; planHash: string } }>(
      'POST', `sessions/${encodeURIComponent(sessionId)}/launch-room`, {}),
  deleteSession: (sessionId: string) =>
    request<{ result: any }>('DELETE', `sessions/${encodeURIComponent(sessionId)}`),
  generate: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/generate`, {}),
  resumeLive: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/generate`, {
      resume: true,
    }),
  resumeReplay: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/generate`, {
      resume: true,
      replayOnly: true,
    }),
  reviewFinalPlan: (sessionId: string) =>
    request<{ session: any }>('POST',
      `sessions/${encodeURIComponent(sessionId)}/review`, {}),
  cancel: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/cancel`, {}),
  pause: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/pause`, {}),
  revise: (sessionId: string, input: {
    reasonText: string;
    triggerIds?: string[];
    revisedSectionKeys: string[];
  }) => request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/revise`, input),
  override: (sessionId: string, candidateInput: unknown) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/override`, {
      candidateInput,
    }),
  lockAndReplan: (sessionId: string) =>
    request<{ session: any }>('POST',
      `sessions/${encodeURIComponent(sessionId)}/lock-and-replan`, {}),
  exportSession: (sessionId: string) =>
    request<{ export: { exportDocument: any; exportHash: string; exportBytes: number } }>(
      'POST', `sessions/${encodeURIComponent(sessionId)}/export`, {}),
  importSession: (exportDocument: unknown) =>
    request<{ session: any }>('POST', 'sessions/import', { exportDocument }),
  };
}

export function createRosterPlanningClient(setupId?: string) {
  return clientOperations(<T>(method: string, subpath: string, body?: unknown) =>
    send<T>(method,subpath,body,setupId));
}
export const rosterPlanningClient = createRosterPlanningClient();
