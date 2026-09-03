#!/usr/bin/env node

import http from "node:http";
import { randomBytes } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgLevel3HttpAdapter,
  STARCRAFT_TMG_LEVEL3_API_PREFIX,
} from "../packages/http-adapter/handler-v1.mjs";
import {
  createStarcraftTmgOnlineAgentHttpEventsV1,
  STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX,
} from "../packages/online-agent-session/http-events-v1.mjs";
import {
  createInMemoryStarcraftTmgPromptArtifactStoreV1,
} from "../packages/online-agent-session/prompt-artifact-store-v1.mjs";
import {
  createStarcraftTmgProviderGatewaySupervisorV1,
  createStarcraftTmgProviderGatewayUsageReceiptV1,
} from "../packages/online-agent-session/provider-gateway-supervisor-v1.mjs";
import {
  createStarcraftTmgOnlineMemorySnapshotV1,
  createStarcraftTmgOnlineRuleSkillSnapshotV1,
} from "../packages/online-agent-session/role-context-contracts-v1.mjs";
import {
  createStarcraftTmgOnlineRoleTurnRuntimeV1,
  STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
} from "../packages/online-agent-session/role-output-runtime-v1.mjs";
import {
  createStarcraftTmgOnlineAgentSessionLifecycleV1,
  createStarcraftTmgOnlinePrincipalBindingV1,
} from "../packages/online-agent-session/session-lifecycle-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const ROOM_ID = "slice-152-browser-room";
const OCCURRED_AT = "2026-09-04T12:00:00.000Z";
const COOKIE_NAME = "starcraft_tmg_agent_acceptance";
const RAW_PROVIDER_SENTINEL = "RAW_PROVIDER_OUTPUT_152_MUST_NOT_REACH_TRACE";
const USER_MESSAGE_SENTINEL = "USER_CONVERSATION_152_MUST_NOT_REACH_TRACE";
const bundle = createKerriganPrimalProductBundleV1();
const characterPackage = bundle.characterPackage;

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});
const PUBLIC_BROWSER_CONTENT_MODULES = new Set([
  "official-faq-f3-movement-battlefield-deployment-binding-v1.mjs",
  "official-faq-f4-ability-tactical-keyword-binding-v1.mjs",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeFile(root, relativePath) {
  const target = path.resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

function staticCandidate(pathname) {
  if (pathname === "/" || pathname === "/apps/starcraft-tmg-battle-lab") {
    return {
      root: path.join(ROOT, "apps/starcraft-tmg-battle-lab"),
      relativePath: "index.html",
    };
  }
  if (pathname.startsWith("/apps/starcraft-tmg-battle-lab/")) {
    return {
      root: path.join(ROOT, "apps/starcraft-tmg-battle-lab"),
      relativePath: pathname.slice("/apps/starcraft-tmg-battle-lab/".length)
        || "index.html",
    };
  }
  if (pathname.startsWith("/packages/")) {
    return {
      root: path.join(ROOT, "packages"),
      relativePath: pathname.slice("/packages/".length),
    };
  }
  if (pathname.startsWith("/content/")) {
    const relativePath = pathname.slice("/content/".length);
    if (!PUBLIC_BROWSER_CONTENT_MODULES.has(relativePath)) return null;
    return { root: path.join(ROOT, "content"), relativePath };
  }
  if (pathname.startsWith("/assets/client/")) {
    return {
      root: path.join(ROOT, "assets/client"),
      relativePath: pathname.slice("/assets/client/".length),
    };
  }
  return null;
}

async function serveFile(response, descriptor) {
  if (!descriptor) return false;
  let target;
  try {
    target = safeFile(descriptor.root, decodeURIComponent(descriptor.relativePath));
  } catch {
    target = null;
  }
  if (!target) return false;
  try {
    const fileStat = await stat(target);
    if (!fileStat.isFile()) return false;
    const body = await readFile(target);
    response.writeHead(200, {
      "cache-control": "no-store, max-age=0",
      "content-length": String(body.byteLength),
      "content-type": MIME_TYPES[path.extname(target).toLowerCase()]
        || "application/octet-stream",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    });
    response.end(body);
    return true;
  } catch {
    return false;
  }
}

async function readRequestBody(request) {
  const chunks = [];
  let bodyBytes = 0;
  for await (const chunk of request) {
    bodyBytes += chunk.byteLength;
    if (bodyBytes > 256 * 1024) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  return { rawBody, body: rawBody ? JSON.parse(rawBody) : {}, bodyBytes };
}

function cookieValue(headers) {
  const cookie = String(headers?.cookie || "");
  for (const segment of cookie.split(";")) {
    const [name, ...rest] = segment.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function roomBinding(createdRoom) {
  const binding = createdRoom.matchBinding;
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: binding.rulesVersion,
    dataVersion: binding.dataVersion,
    matchBindingHash: binding.bindingHash,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    dataSnapshotHash: binding.dataSnapshotHash,
    rulesArtifactHash: binding.rulesArtifactHash,
    executorArtifactHash: binding.executorArtifactHash,
    geometryArtifactHash: binding.geometryArtifactHash,
    actionSchemaHash: binding.actionSchemaHash,
  };
}

function skillArtifact(binding) {
  return {
    schema: "project_d_game_skill_v1",
    gameId: "starcraft-tmg",
    rulesVersion: binding.rulesVersion,
    skillId: "starcraft-tmg.current-turn-flow.accepted.v1",
    version: "1.0.0",
    skillType: "turn_flow",
    sourceRefs: [{
      sourceId: "archon.starcraft-tmg-rules.en",
      snapshotId: binding.dataVersion,
      snapshotHash: binding.sourceSnapshotHash,
      authorityStatus: "official_game_rules",
      rulesEligible: true,
    }],
    appRuleEndpoints: ["GET /api/v1/rooms/:roomId/legal-space"],
    phase: "all",
    preconditions: ["Read the current viewer-scoped room projection."],
    procedure: ["Select only a current enabled LegalSpace candidate."],
    legalityChecks: ["Rules and room receipts outrank strategy memory."],
    illegalPatterns: ["Never use a candidate from another revision."],
    examples: [],
    counterExamples: [],
    judgeTests: [{ id: "current-candidate", expected: "reject_stale" }],
    confidence: "source_backed",
    trustTier: "human_reviewed_source_backed",
    status: "human_reviewed",
    humanReviewed: true,
    canAffectStrategy: false,
    canAffectRules: false,
    trainingTruth: false,
  };
}

function ruleSkillSnapshot(input) {
  return createStarcraftTmgOnlineRuleSkillSnapshotV1({
    gameId: "starcraft-tmg",
    roomId: input.roomId,
    roomBindingHash: input.roomBinding.roomBindingHash,
    rulesVersion: input.roomBinding.rulesVersion,
    dataVersion: input.roomBinding.dataVersion,
    sourceSnapshotHash: input.roomBinding.sourceSnapshotHash,
    skillEntries: [{ skillArtifact: skillArtifact(input.roomBinding) }],
  });
}

const namespaceByMode = Object.freeze({
  tutor: "teaching_memory",
  opponent: "strategy_memory",
  commentator: "battle_public_events",
  companion: "user_character_relation",
});

function memorySnapshot(input) {
  return createStarcraftTmgOnlineMemorySnapshotV1({
    gameId: "starcraft-tmg",
    roomId: input.roomId,
    principalScopeHash: input.principalScopeHash,
    sessionBindingHash: input.sessionBindingHash,
    mode: input.mode,
    entries: [{
      namespace: namespaceByMode[input.mode],
      refId: `${input.mode}-acceptance-memory`,
      version: "1.0.0",
      content: { note: "accepted advisory browser-fixture memory" },
      status: "accepted",
      advisoryOnly: true,
      canAffectRules: false,
      trainingTruth: false,
    }],
  });
}

function requiredEvidenceRefs(contract) {
  return contract.requiredEvidenceKinds.map((kind) => {
    const entry = contract.evidenceRefs.find((candidate) => candidate.kind === kind);
    assert(entry, `MISSING_REQUIRED_EVIDENCE:${kind}`);
    return entry.evidenceId;
  });
}

function opponentDecision(artifact) {
  const legalNode = artifact.nodes.find((entry) => entry.nodeType === "legal-space");
  const enabled = legalNode.content.candidates.filter((entry) => entry.isEnabled);
  assert(enabled.length > 1, "OPPONENT_REQUIRES_TWO_ENABLED_CANDIDATES");
  const memoryRef = artifact.responseContract.strategyMemoryRefs[0];
  return {
    candidateId: enabled[0].candidateId,
    selectedReason: "This current legal action preserves the strongest position.",
    scoreOrPositionValue: "It improves position without surrendering initiative.",
    risk: "The opposing force retains a legal counter-action.",
    memoryInfluence: memoryRef
      ? { kind: "advisory_strategy_memory", refIds: [memoryRef.refId] }
      : { kind: "none", refIds: [] },
    rejectedAlternatives: [{
      candidateId: enabled[1].candidateId,
      reason: "This alternative has less immediate positional value.",
    }],
  };
}

function validRoleOutput(artifact) {
  const contract = artifact.responseContract;
  const output = {
    schemaVersion: STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
    channels: {},
    visualCue: contract.mode === "tutor" ? "explain"
      : contract.mode === "opponent" ? "challenge"
        : contract.mode === "commentator" ? "announce" : "reflect",
    evidenceRefIds: requiredEvidenceRefs(contract),
  };
  if (contract.mode === "tutor") {
    output.channels.teaching = {
      text: `${RAW_PROVIDER_SENTINEL}: verify rules before acting.`,
    };
  } else if (contract.mode === "opponent" && contract.intent === "take_turn") {
    output.channels.decision = opponentDecision(artifact);
    output.channels.speech = { text: `${RAW_PROVIDER_SENTINEL}: preview ready.` };
  } else if (contract.mode === "commentator") {
    output.channels.speech = { text: `${RAW_PROVIDER_SENTINEL}: public state checked.` };
  } else {
    output.channels.speech = { text: `${RAW_PROVIDER_SENTINEL}: scoped advice ready.` };
  }
  return output;
}

function waitForAbort(signal) {
  return new Promise((resolve, reject) => {
    const abort = () => reject(Object.assign(new Error("cancelled fixture request"), {
      code: "provider_request_aborted",
    }));
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

async function createFixture() {
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  state.activeSideKey = "player1";
  const authorityEngine = createStarcraftTmgAuthoritativeEngine({
    now: () => OCCURRED_AT,
  });
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine,
    characterReleaseChannel: "development_internal",
    now: () => OCCURRED_AT,
  });
  const serverSeatPlan = [
    { label: "host", seatKey: "player1", roleMode: "player", principalType: "human" },
    { label: "tutor", seatKey: "player1", roleMode: "tutor", principalType: "model" },
    { label: "opponent", seatKey: "player1", roleMode: "opponent", principalType: "model" },
    { label: "opponentSupervisor", seatKey: "player1", roleMode: "supervisor", principalType: "human" },
    { label: "commentator", seatKey: "observer", roleMode: "commentator", principalType: "model" },
    { label: "companion", seatKey: "player1", roleMode: "companion", principalType: "model" },
  ];
  const createdRoom = await roomRuntime.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    surfaceMode: "classic",
    title: "Ticket 15 Slice 152 real-browser acceptance",
    initialStateAuthority: {
      source: "server_factory",
      state,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({
        source: "ticket-15-slice-152-browser-acceptance",
        roomId: ROOM_ID,
        state,
      }),
      serverSeatPlan,
    },
    serverSeatPlan,
  });
  assert(createdRoom.ok, `ROOM_CREATE_FAILED:${createdRoom.reason || "unknown"}`);

  const binding = roomBinding(createdRoom);
  const characterSelectionHash = hashStarcraftTmgContract({
    characterId: characterPackage.characterId,
    persona: "hots.primal_queen.post_zerus",
    roomId: ROOM_ID,
  });
  const cookies = Object.freeze({
    configured: randomBytes(32).toString("base64url"),
    noProvider: randomBytes(32).toString("base64url"),
    lowBudget: randomBytes(32).toString("base64url"),
  });
  const metrics = {
    gatewayCalls: { configured: 0, noProvider: 0, lowBudget: 0 },
    modes: { tutor: 0, opponent: 0, commentator: 0, companion: 0 },
    cancelledGatewayCalls: 0,
  };
  const modeCredential = {
    tutor: createdRoom.credentials.tutor.seatToken,
    opponent: createdRoom.credentials.opponent.seatToken,
    companion: createdRoom.credentials.companion.seatToken,
  };

  function createPipeline(name, options = {}) {
    const principalSessionRef = `slice-152-${name}-principal`;
    const scopeHash = hashStarcraftTmgContract({
      roomId: ROOM_ID,
      pipeline: name,
      authority: "browser-cookie",
    });
    const principalBinding = createStarcraftTmgOnlinePrincipalBindingV1({
      roomId: ROOM_ID,
      principalScopeHash: scopeHash,
      seatKey: "player1",
      principalType: "human",
      principalRoleMode: "player",
      bindingRevision: 1,
      allowedAgentModes: ["tutor", "opponent", "commentator", "companion"],
      characterId: characterPackage.characterId,
      characterPackageHash: characterPackage.integrity.hash,
      characterSelectionHash,
      roomBinding: binding,
    });
    let sessionSequence = 0;
    const lifecycle = createStarcraftTmgOnlineAgentSessionLifecycleV1({
      principalAuthority: {
        async resolve(input) {
          return input.roomId === ROOM_ID
            && input.principalSessionRef === principalSessionRef
            ? { ok: true, binding: principalBinding }
            : { ok: false, reason: "principal_not_authenticated" };
        },
      },
      characterCatalog: {
        async resolve(input) {
          return input.characterId === characterPackage.characterId
            && input.characterPackageHash === characterPackage.integrity.hash
            ? { ok: true, characterPackage }
            : { ok: false, reason: "character_not_found" };
        },
      },
      createId() {
        sessionSequence += 1;
        return `slice-152-${name}-session-${String(sessionSequence).padStart(3, "0")}`;
      },
      now: () => OCCURRED_AT,
    });
    let promptSequence = 0;
    const promptStore = createInMemoryStarcraftTmgPromptArtifactStoreV1({
      createId() {
        promptSequence += 1;
        return `slice-152-${name}-prompt-${String(promptSequence).padStart(3, "0")}`;
      },
      maxArtifacts: 64,
      maxArtifactBytes: 2 * 1024 * 1024,
    });
    const providerGateway = options.providerConfigured === false ? undefined : {
      async complete(input) {
        metrics.gatewayCalls[name] += 1;
        const resolved = promptStore.resolve(input.promptAssemblyRef);
        assert(resolved.ok, "PROMPT_RESOLVE_FAILED");
        const artifact = resolved.artifact;
        const userNode = artifact.nodes.find((entry) => entry.nodeType === "user-message");
        const userMessage = userNode.content.text;
        metrics.modes[artifact.responseContract.mode] += 1;
        if (userMessage.includes("provider failure")) {
          throw Object.assign(new Error("deterministic Provider failure"), {
            code: "provider_failed",
          });
        }
        if (userMessage.includes("slow cancel")) {
          try {
            await waitForAbort(input.signal);
          } catch (error) {
            metrics.cancelledGatewayCalls += 1;
            throw error;
          }
        }
        return {
          output: validRoleOutput(artifact),
          usageReceipt: createStarcraftTmgProviderGatewayUsageReceiptV1({
            reservation: input.budgetReservation,
            inputUnits: input.boundedRequest.inputUnits,
            outputUnits: 1,
            providerRequestIdHash: hashStarcraftTmgContract({
              turnId: input.budgetReservation.turnId,
              promptHash: input.promptAssemblyRef.hash,
            }),
            finishedAt: OCCURRED_AT,
          }),
        };
      },
    };
    let turnSequence = 0;
    const providerSupervisor = createStarcraftTmgProviderGatewaySupervisorV1({
      sessionLifecycle: lifecycle,
      ...(providerGateway ? { providerGateway } : {}),
      gatewayEvidence: providerGateway
        ? "injected_deterministic_browser_acceptance_gateway"
        : undefined,
      budgetPolicy: options.lowBudget ? {
        maxTotalUnits: 2,
        maxTurns: 8,
        maxInputUnitsPerTurn: 1,
        maxOutputUnitsPerTurn: 1,
        timeoutMs: 5_000,
      } : {
        maxTotalUnits: 2_000_000,
        maxTurns: 128,
        maxInputUnitsPerTurn: 200_000,
        maxOutputUnitsPerTurn: 4_096,
        timeoutMs: 5_000,
      },
      createId() {
        turnSequence += 1;
        return `slice-152-${name}-turn-${String(turnSequence).padStart(3, "0")}`;
      },
      now: () => OCCURRED_AT,
    });
    const roomTools = {
      async readBoardState(input) {
        return roomRuntime.readRoom({
          roomId: input.roomId,
          ...(input.mode === "commentator"
            ? {} : { seatToken: modeCredential[input.mode] }),
        });
      },
      async listLegalActions(input) {
        return roomRuntime.legalSpace({
          roomId: input.roomId,
          seatToken: modeCredential[input.mode],
        });
      },
      async readPublicEvents(input) {
        const read = await roomRuntime.readRoom({
          roomId: input.roomId,
          includeJournal: true,
        });
        const events = read.projection.publicJournal || [];
        return {
          ok: true,
          events: {
            schemaVersion: "starcraft_tmg_public_events_v1",
            roomId: input.roomId,
            matchBindingHash: binding.matchBindingHash,
            events,
            eventsHash: hashStarcraftTmgContract(events),
          },
        };
      },
      async readRulesSkills(input) {
        return { ok: true, snapshot: ruleSkillSnapshot(input) };
      },
      async previewAction(input) {
        return roomRuntime.previewAction({
          roomId: input.roomId,
          seatToken: modeCredential[input.mode],
          candidateId: input.candidateId,
          expectedMatchBindingHash: input.expectedMatchBindingHash,
          expectedLegalSpaceHash: input.expectedLegalSpaceHash,
          expectedStateRevision: input.expectedStateRevision,
          expectedStateHash: input.expectedStateHash,
          occurredAt: input.occurredAt,
        });
      },
      async confirmPreview() {
        throw new Error("MODEL_CONFIRM_FORBIDDEN");
      },
      async applyAction() {
        throw new Error("MODEL_APPLY_FORBIDDEN");
      },
    };
    const roleTurnRuntime = createStarcraftTmgOnlineRoleTurnRuntimeV1({
      sessionLifecycle: lifecycle,
      providerSupervisor,
      materialCatalog: {
        async resolve(input) {
          return {
            ok: true,
            characterPackage: bundle.characterPackage,
            roleSkillPack: bundle.roleSkillPacks[input.mode],
            conversationProfile: bundle.conversationProfile,
            providerProfile: bundle.providerProfile,
            worldbooks: bundle.worldbooks,
            spoilerCeilingRank: 60,
            knowledgeCeilingRank: 60,
            allowFanon: false,
          };
        },
      },
      roomTools,
      memoryStore: {
        async read(input) {
          return { ok: true, snapshot: memorySnapshot(input) };
        },
      },
      promptArtifactStore: promptStore,
      historyPolicy: { maxEntries: 64, maxBytes: 512 * 1024 },
      maxUserMessageBytes: 4_096,
      maxOutputUnits: options.lowBudget ? 1 : 1_024,
      now: () => OCCURRED_AT,
    });
    const principalAuthenticator = {
      async authenticate(input) {
        if (cookieValue(input.headers) !== cookies[name]) return { ok: false };
        return {
          ok: true,
          principalSessionRef,
          authenticationScopeHash: scopeHash,
        };
      },
    };
    return createStarcraftTmgOnlineAgentHttpEventsV1({
      sessionLifecycle: lifecycle,
      roleTurnRuntime,
      providerSupervisor,
      principalAuthenticator,
      now: () => OCCURRED_AT,
    });
  }

  const agentHttp = {
    configured: createPipeline("configured"),
    noProvider: createPipeline("noProvider", { providerConfigured: false }),
    lowBudget: createPipeline("lowBudget", { lowBudget: true }),
  };
  const cookieToPipeline = new Map(Object.entries(cookies)
    .map(([name, value]) => [value, name]));
  return {
    roomAdapter: createStarcraftTmgLevel3HttpAdapter({
      roomRuntime,
      assetRoot: ROOT,
    }),
    roomRuntime,
    createdRoom,
    cookies,
    metrics,
    async handleAgent(input) {
      const name = cookieToPipeline.get(cookieValue(input.headers)) || "configured";
      return agentHttp[name].handle(input);
    },
  };
}

function sendJson(response, result) {
  const body = Buffer.from(JSON.stringify(result.response), "utf8");
  response.writeHead(result.status, {
    ...result.headers,
    "cache-control": "private, no-store, max-age=0",
    "content-length": String(body.byteLength),
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

async function main() {
  const fixture = await createFixture();
  const server = http.createServer(async (request, response) => {
    try {
      const origin = `http://${request.headers.host || "127.0.0.1"}`;
      const url = new URL(request.url || "/", origin);
      const hasBody = ["POST", "PUT", "PATCH"].includes(request.method || "GET");
      const requestBody = hasBody
        ? await readRequestBody(request)
        : { rawBody: "", body: {}, bodyBytes: 0 };
      if (url.pathname.startsWith(STARCRAFT_TMG_ONLINE_AGENT_API_PREFIX)) {
        const result = await fixture.handleAgent({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          ...requestBody,
        });
        sendJson(response, result);
        return;
      }
      if (url.pathname.startsWith(STARCRAFT_TMG_LEVEL3_API_PREFIX)
        || url.pathname.startsWith("/starcraft-tmg-level3/assets/v1/character/")) {
        const result = await fixture.roomAdapter.handle({
          method: request.method,
          pathname: url.pathname,
          query: url.searchParams,
          headers: request.headers,
          ...requestBody,
        });
        if (result.binary) {
          response.writeHead(result.status, result.headers);
          response.end(result.body);
          return;
        }
        sendJson(response, result);
        return;
      }
      if (url.pathname === "/__ticket15/metrics") {
        const read = await fixture.roomRuntime.readRoom({ roomId: ROOM_ID });
        sendJson(response, {
          status: 200,
          response: {
            ok: true,
            metrics: fixture.metrics,
            roomRevision: read.projection.room.stateRevision,
            deterministicGateway: true,
            liveProviderCalled: false,
            apiKeyAccepted: false,
          },
        });
        return;
      }
      if (await serveFile(response, staticCandidate(url.pathname))) return;
      const body = Buffer.from("Not found", "utf8");
      response.writeHead(404, {
        "content-length": String(body.byteLength),
        "content-type": "text/plain; charset=utf-8",
      });
      response.end(body);
    } catch (error) {
      const body = Buffer.from(JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }), "utf8");
      response.writeHead(500, {
        "content-length": String(body.byteLength),
        "content-type": "application/json; charset=utf-8",
      });
      response.end(body);
    }
  });
  server.on("error", (error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
    process.exitCode = 1;
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object", "FIXTURE_LISTEN_FAILED");
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "starcraft_tmg_ticket_15_slice_152_browser_fixture_v1",
    origin: `http://127.0.0.1:${address.port}`,
    roomId: ROOM_ID,
    seatToken: fixture.createdRoom.credentials.host.seatToken,
    agentAuth: {
      cookieName: COOKIE_NAME,
      values: fixture.cookies,
    },
    sentinels: {
      rawProviderOutput: RAW_PROVIDER_SENTINEL,
      userConversation: USER_MESSAGE_SENTINEL,
    },
  })}\n`);
  const close = () => server.close(() => process.exit(0));
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  process.exitCode = 1;
});
