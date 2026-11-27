// Ticket 27 / Slice 271 — HTTP adapter for the roster-planning workspace.
// Pure additive mounting surface: a fixed API prefix, JSON in/out, typed
// error codes. The adapter exposes no Room mutation route and no credential
// route; it only forwards to the injected workspace service. Existing
// product API responses are untouched.

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_PLANNING_WORKSPACE_HTTP_MODULE =
  "packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs";
export const ROSTER_PLANNING_WORKSPACE_API_PREFIX =
  "/starcraft-tmg-level3/roster-planning/v1";
export const ROSTER_PLANNING_WORKSPACE_HTTP_VERSION =
  "starcraft_tmg_roster_planning_workspace_http_v1";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function statusFor(error) {
  if (Number.isSafeInteger(error?.httpStatus)) return error.httpStatus;
  const code = String(error?.code || "");
  if (/NOT_FOUND/u.test(code)) return 404;
  if (/UNAVAILABLE|STARTUP_FAILED|PROCESS_FAILED/u.test(code)) return 503;
  if (/BUSY|RUNNING|ALREADY_PLANNED|NOT_PLANNED|NOT_RUNNING|MISSING|RECOVERY_REQUIRED/u
    .test(code)) return 409;
  return 400;
}

export function createRosterPlanningWorkspaceHttpAdapterV1(input = {}) {
  const service = input.service;
  const iterativeJourney = input.iterativeJourney || null;
  const decisionJourney = input.decisionJourney || null;
  const launchRoom = input.launchRoom || null;
  const launchPresetRoom = input.launchPresetRoom || null;
  const launchDecisionWorkflowRoom = input.launchDecisionWorkflowRoom || null;
  if (typeof service?.descriptor !== "function"
    || typeof service?.startPlanning !== "function") {
    throw Object.assign(new Error("ROSTER_WORKSPACE_HTTP_SERVICE_INVALID"),
      { code: "ROSTER_WORKSPACE_HTTP_SERVICE_INVALID" });
  }

  function ok(response, status = 200) {
    return { status, response: {
      schemaVersion: ROSTER_PLANNING_WORKSPACE_HTTP_VERSION,
      ok: true,
      ...response,
    } };
  }
  function rejected(status, reason, detail = null) {
    return { status, response: {
      schemaVersion: ROSTER_PLANNING_WORKSPACE_HTTP_VERSION,
      ok: false,
      reason,
      detail: detail === null ? null : String(detail).slice(0, 300),
      automaticRetry: false,
      trainingTruth: false,
    } };
  }

  async function handle(request = {}) {
    const method = String(request.method || "GET").toUpperCase();
    const pathname = String(request.pathname || "");
    if (!pathname.startsWith(ROSTER_PLANNING_WORKSPACE_API_PREFIX)) {
      return rejected(404, "ROSTER_WORKSPACE_ROUTE_UNKNOWN");
    }
    const subpath = pathname.slice(ROSTER_PLANNING_WORKSPACE_API_PREFIX.length)
      .replace(/^\/+|\/+$/gu, "");
    const segments = subpath.split("/").filter(Boolean);
    const query = request.query instanceof URLSearchParams
      ? Object.fromEntries(request.query) : (request.query || {});
    const body = typeof request.body === "object" && request.body !== null
      ? request.body : {};

    try {
      // GET /health — module descriptor and live-deliberation availability
      // (never a credential, never a Room handle).
      if (method === "GET" && segments.length === 1
        && segments[0] === "health") {
        return ok({ descriptor: { ...service.descriptor(),
          iterativeJourney: iterativeJourney?.descriptor() || null,
          decisionJourney: decisionJourney?.descriptor() || null,
          roomLaunchAvailable: typeof launchRoom === "function" } });
      }
      if(segments.length===1&&segments[0]==='conditional-experiences'&&method==='GET'){
        if(!decisionJourney)return rejected(503,'ROSTER_DECISION_JOURNEY_UNAVAILABLE');
        return ok({experiences:await decisionJourney.searchConditionalExperiences(query.q??'')});
      }
      if(segments[0]==='workflows'){
        if(!decisionJourney)return rejected(503,'ROSTER_DECISION_JOURNEY_UNAVAILABLE');
        if(segments.length===1){
          if(method==='GET')return ok({workflows:await decisionJourney.list()});
          if(method==='POST')return ok({workflow:await decisionJourney.create(body)},201);
        }
        const id=segments[1];
        if(segments.length===2&&method==='GET')return ok({workflow:await decisionJourney.read(id)});
        if(segments.length===3){
          if(method==='POST'&&segments[2]==='launch-room'){
            if(typeof launchDecisionWorkflowRoom!=='function')return rejected(503,'ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE');
            return ok({match:await launchDecisionWorkflowRoom(id,body)},201);
          }
          if(method==='POST'&&segments[2]==='accept')return ok(await decisionJourney.accept(id,body));
          if(method==='POST'&&segments[2]==='run')return ok({workflow:await decisionJourney.start(id)},202);
          if(method==='POST'&&segments[2]==='reprepare-incomplete-output')return ok(await decisionJourney.reprepareIncompleteOutput(id,body),202);
          if(method==='POST'&&segments[2]==='recover-provider')return ok(await decisionJourney.recoverProvider(id,body),202);
          if(method==='POST'&&segments[2]==='recover-comparison')return ok(await decisionJourney.recoverComparison(id,body),202);
          if(method==='POST'&&segments[2]==='reconsider-capabilities')return ok(await decisionJourney.reconsiderCapabilities(id,body),202);
          if(method==='POST'&&segments[2]==='handoff-no-progress')return ok(await decisionJourney.handoffNoProgress(id,body),202);
          if(method==='POST'&&segments[2]==='pause')return ok({workflow:await decisionJourney.pause(id)});
          if(method==='GET'&&segments[2]==='trace')return ok({trace:await decisionJourney.trace(id)});
          if(method==='POST'&&segments[2]==='conditional-experiences')
            return ok({imported:await decisionJourney.importConditionalExperience(id,body)});
          if(method==='GET'&&segments[2]==='conditional-experiences')
            return ok({experiences:await decisionJourney.conditionalExperiences(id,query.q??'')});
        }
        if(segments.length===4&&method==='GET'){
          if(segments[2]==='trace')return ok({trace:await decisionJourney.readTrace(id,segments[3])});
          if(segments[2]==='evidence')return ok({evidence:await decisionJourney.readEvidence(id,Number(segments[3]))});
        }
        return rejected(404,'ROSTER_WORKSPACE_ROUTE_UNKNOWN');
      }
      if (segments[0] === "iterative") {
        if (!iterativeJourney) {
          return rejected(503, "ROSTER_WORKSPACE_ITERATIVE_UNAVAILABLE");
        }
        if (segments.length === 2 && segments[1] === "sessions") {
          if (method === "GET") {
            return ok({ journeys: await iterativeJourney.list() });
          }
          if (method === "POST") {
            return ok({ journey: await iterativeJourney.create(
              body.setup || body) }, 201);
          }
        }
        if (segments.length === 3 && segments[1] === "sessions"
          && method === "GET") {
          return ok({ journey: await iterativeJourney.read(segments[2]) });
        }
        if (segments.length === 4 && segments[1] === "sessions"
          && segments[3] === "experience" && method === "GET") {
          return ok({ experience: await iterativeJourney.exportExperience(segments[2]) });
        }
        if (segments.length === 4 && segments[1] === "sessions"
          && method === "POST") {
          if (segments[3] === "launch-room") {
            if (typeof launchRoom !== "function") {
              return rejected(503, "ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE");
            }
            return ok({ match: await launchRoom(segments[2], body) }, 201);
          }
          if (segments[3] === "run") {
            return ok({ journey: await iterativeJourney.run(segments[2], body) },
              202);
          }
          if (segments[3] === "pause") {
            return ok({ journey: await iterativeJourney.pause(segments[2]) });
          }
        }
        return rejected(404, "ROSTER_WORKSPACE_ROUTE_UNKNOWN");
      }
      if (method === "GET" && segments.length === 1
        && segments[0] === "catalogue") {
        return ok({ catalogue: await service.readCatalogue() });
      }
      if (method === "GET" && segments.length === 1
        && segments[0] === "enumeration") {
        return ok({ enumeration: service.readEnumeration(query) });
      }
      if (method === "GET" && segments.length === 1
        && segments[0] === "sessions") {
        return ok({ ...(await service.listSessions()) });
      }
      if (method === "POST" && segments.length === 1
        && segments[0] === "sessions") {
        return ok({ session: await service.createSession(body.setup || body) },
          201);
      }
      if (method === "POST" && segments.length === 2
        && segments[0] === "sessions" && segments[1] === "import") {
        return ok({
          session: await service.importSession(body),
        }, 201);
      }
      if (method === "POST" && segments.length === 2
        && segments[0] === "sessions" && segments[1] === "preset") {
        return ok({ session: await service.createPresetSession(body) }, 201);
      }
      const sessionMatch = segments.length >= 2
        && segments[0] === "sessions" ? segments[1] : null;
      if (sessionMatch && segments.length === 2) {
        if (method === "GET") {
          return ok({ session: service.readSession(sessionMatch) });
        }
        if (method === "DELETE") {
          return ok({ result: await service.deleteSession(sessionMatch) });
        }
        return rejected(405, "METHOD_NOT_ALLOWED");
      }
      if (sessionMatch && segments.length === 3) {
        const operation = segments[2];
        if (method === "GET" && operation === "experience") {
          return ok({ experience: service.readPlanningExperience(sessionMatch) });
        }
        if (method !== "POST") return rejected(405, "METHOD_NOT_ALLOWED");
        if (operation === 'launch-room') {
          if (typeof launchPresetRoom !== 'function') return rejected(503, 'ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE');
          return ok({ match: await launchPresetRoom(sessionMatch, body) }, 201);
        }
        if (operation === 'run') {
          return ok({ session: await service.runPresetJourney(sessionMatch, body) }, 202);
        }
        if (operation === "teach-framework") {
          return ok({ session: await service.teachPlanFramework(sessionMatch, body) }, 202);
        }
        if (operation === "generate") {
          // Asynchronous: 202 returns the running projection immediately;
          // the client polls GET /sessions/:id for round progress.
          return ok({ session: await service.startPlanning(sessionMatch, {
            resume: body.resume === true,
            replayOnly: body.replayOnly === true,
          }) }, 202);
        }
        if (operation === "cancel") {
          return ok({ session: await service.cancelPlanning(sessionMatch) });
        }
        if (operation === "pause") {
          return ok({ session: await service.pausePlanning(sessionMatch) });
        }
        if (operation === "revise") {
          return ok({ session: await service.revisePlan(sessionMatch, body) },
            202);
        }
        if (operation === "review") {
          return ok({ session: await service.reviewFinalPlan(sessionMatch,
            body) }, 202);
        }
        if (operation === "repair-reviewed") {
          return ok({ session: await service.repairReviewedPlan(sessionMatch,
            body) }, 202);
        }
        if (operation === "reconcile-dispatch") {
          return ok(await service.reconcileProviderDispatch(sessionMatch));
        }
        if (operation === "override") {
          return ok({
            session: await service.applyManualOverride(sessionMatch, body),
          });
        }
        if (operation === "budget-branches") {
          return ok({ budgetBranches: service.readBudgetBranches(
            sessionMatch, body) });
        }
        if (operation === "lock-and-replan") {
          return ok({ session: await service.createLockedReplanSession(
            sessionMatch) }, 201);
        }
        if (operation === "replan-fixed") {
          return ok({ session: await service.createLockedReplanSession(
            sessionMatch, { strategicReplan: true, reasonText: body.reasonText }) }, 201);
        }
        if (operation === "export") {
          return ok({ export: service.exportSession(sessionMatch) });
        }
        return rejected(404, "ROSTER_WORKSPACE_ROUTE_UNKNOWN");
      }
      return rejected(404, "ROSTER_WORKSPACE_ROUTE_UNKNOWN");
    } catch (error) {
      const code = String(error?.code || "ROSTER_WORKSPACE_INTERNAL_FAILURE");
      return rejected(statusFor(error), code, error?.message);
    }
  }

  return Object.freeze({
    httpDescriptor: () => Object.freeze({
      schema: "starcraft_tmg_roster_workspace_http_descriptor_v1",
      module: ROSTER_PLANNING_WORKSPACE_HTTP_MODULE,
      apiPrefix: ROSTER_PLANNING_WORKSPACE_API_PREFIX,
      version: ROSTER_PLANNING_WORKSPACE_HTTP_VERSION,
      exposesRoomMutationRoutes: typeof launchRoom === "function",
      exposesCredentialRoutes: false,
      additiveMountOnly: true,
      descriptorHash: hashStarcraftTmgContract({
        apiPrefix: ROSTER_PLANNING_WORKSPACE_API_PREFIX,
        version: ROSTER_PLANNING_WORKSPACE_HTTP_VERSION,
      }),
      trainingTruth: false,
    }),
    handle,
  });
}

export function cloneForHttp(value) {
  return clone(value);
}
