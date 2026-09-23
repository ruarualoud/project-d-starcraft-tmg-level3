// Ticket 27 / Slice 271 — roster-planning workspace client (Web/App).
// Talks to the additive same-origin workspace API. Network failures surface
// as the explicit `disconnected` state; an origin that answers without
// speaking the workspace JSON protocol (for example a static-only host with
// no planning API mounted) is the same honest disconnected state. Typed
// server reasons are preserved verbatim so the UI can render honest
// error/unavailable states. No credential, seat token or Room mutation ever
// passes through this client.

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

async function request<T>(method: string, subpath: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await globalThis.fetch(`${baseUrl()}${ROSTER_PLANNING_API_PREFIX}/${subpath}`, {
      method,
      headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
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
      String(payload?.reason || 'ROSTER_WORKSPACE_REQUEST_FAILED'),
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

export const rosterPlanningClient = {
  health: () => request<{ descriptor: any }>('GET', 'health'),
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
  deleteSession: (sessionId: string) =>
    request<{ result: any }>('DELETE', `sessions/${encodeURIComponent(sessionId)}`),
  generate: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/generate`, {}),
  resumeReplay: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/generate`, {
      resume: true,
      replayOnly: true,
    }),
  cancel: (sessionId: string) =>
    request<{ session: any }>('POST', `sessions/${encodeURIComponent(sessionId)}/cancel`, {}),
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
