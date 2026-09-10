#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1 } from
  "../content/skill-generation/ticket-18-foundational-strategy-pack-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgOnlineAgentSessionLifecycleV1,
  createStarcraftTmgOnlinePrincipalBindingV1,
} from "../packages/online-agent-session/session-lifecycle-v1.mjs";
import { createInMemoryStarcraftTmgPromptArtifactStoreV1 } from
  "../packages/online-agent-session/prompt-artifact-store-v1.mjs";
import {
  createStarcraftTmgOnlineMemorySnapshotV1,
  createStarcraftTmgOnlineRuleSkillSnapshotV1,
} from "../packages/online-agent-session/role-context-contracts-v1.mjs";
import {
  createStarcraftTmgOnlineRoleTurnRuntimeV1,
  STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
} from "../packages/online-agent-session/role-output-runtime-v1.mjs";
import { loadFormalFoundationalStrategyPackV1 } from
  "../packages/strategy-skills/formal-foundational-skill-pack-loader-v1.mjs";
import { createStarcraftTmgOnlineStrategySkillRegistryV1 } from
  "../packages/strategy-skills/online-strategy-skill-registry-v1.mjs";
import { createStarcraftTmgOnlineStrategyArenaV1 } from
  "../packages/strategy-skills/online-strategy-arena-v1.mjs";
import { seal } from "../packages/skill-production/common.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-18-online-strategy-arena-v1/report.json");
const OCCURRED_AT = "2026-09-11T08:00:00.000Z";
const TERRAN = "tactical_cards:terran_armed_forces";
const ZERG = "tactical_cards:zerg_swarm";

function ensure(condition, code, fields = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...fields });
}

function roomBinding(matchBinding) {
  return {
    schemaVersion: "starcraft_tmg_match_room_binding_v1",
    rulesVersion: matchBinding.rulesVersion,
    dataVersion: matchBinding.dataVersion,
    matchBindingHash: matchBinding.bindingHash,
    sourceSnapshotHash: matchBinding.sourceSnapshotHash,
    dataSnapshotHash: matchBinding.dataSnapshotHash,
    rulesArtifactHash: matchBinding.rulesArtifactHash,
    executorArtifactHash: matchBinding.executorArtifactHash,
    geometryArtifactHash: matchBinding.geometryArtifactHash,
    actionSchemaHash: matchBinding.actionSchemaHash,
  };
}

function acceptedRuleSkill(binding) {
  return {
    schema: "project_d_game_skill_v1",
    gameId: "starcraft-tmg",
    rulesVersion: binding.rulesVersion,
    skillId: "starcraft-tmg.current-legal-action-flow.accepted.v1",
    version: "1.0.0",
    skillType: "turn_flow",
    sourceRefs: [{
      sourceId: "ticket18.frozen-official-source-set",
      snapshotId: binding.dataVersion,
      snapshotHash: binding.sourceSnapshotHash,
    }],
    appRuleEndpoints: ["GET /api/v1/rooms/:roomId/legal-space"],
    phase: "all",
    preconditions: ["Read the current viewer-scoped state."],
    procedure: ["Select only an enabled candidate from current LegalSpace."],
    legalityChecks: ["Rules and referee receipts outrank strategy."],
    illegalPatterns: ["Reusing a candidate after state revision changes."],
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

function requiredEvidenceIds(contract) {
  const ids = [];
  for (const kind of contract.requiredEvidenceKinds) {
    const ref = contract.evidenceRefs.find((entry) => entry.kind === kind);
    ensure(ref, "ARENA_REQUIRED_EVIDENCE_MISSING", { kind });
    ids.push(ref.evidenceId);
  }
  for (const ref of contract.evidenceRefs.filter((entry) =>
    entry.kind === "strategy_skill")) {
    if (!ids.includes(ref.evidenceId)) ids.push(ref.evidenceId);
  }
  return ids;
}

function providerOutput(artifact) {
  const legal = artifact.nodes.find((entry) => entry.nodeType === "legal-space")
    ?.content;
  const strategy = artifact.nodes.find((entry) =>
    entry.nodeType === "runtime-strategy-skills")?.content;
  ensure(strategy?.refs?.length === 4, "ARENA_STRATEGY_ROUTE_NOT_IN_PROMPT");
  const candidates = (legal?.candidates || []).filter((entry) => entry.isEnabled);
  ensure(candidates.length > 0, "ARENA_NO_ENABLED_LEGAL_ACTION");
  const selected = candidates[0];
  const alternative = candidates[1];
  return {
    schemaVersion: STARCRAFT_TMG_ONLINE_ROLE_OUTPUT_VERSION,
    channels: {
      decision: {
        candidateId: selected.candidateId,
        selectedReason:
          `Use the current ${strategy.refs.at(-1).id} route, then defer legality to LegalSpace.`,
        scoreOrPositionValue:
          "This is a current legal transition; its strategic value remains provisional in the isolated arena.",
        risk:
          "The small arena proves wiring and authority flow, not whole-game optimality.",
        memoryInfluence: { kind: "none", refIds: [] },
        rejectedAlternatives: alternative ? [{
          candidateId: alternative.candidateId,
          reason: "The selected transition provides the deterministic first comparison branch.",
        }] : [],
      },
      speech: { text: "已生成合法动作预览，等待人类控制者确认。" },
    },
    visualCue: "challenge",
    evidenceRefIds: requiredEvidenceIds(artifact.responseContract),
  };
}

const loaded = await loadFormalFoundationalStrategyPackV1({
  root: ROOT,
  manifest: STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1,
});
const registry = createStarcraftTmgOnlineStrategySkillRegistryV1({
  sourceBinding: loaded.manifest.sourceBinding,
  now: () => OCCURRED_AT,
});
const registration = registry.registerCandidates({
  expectedCatalogRevision: 0,
  entries: loaded.entries.map((entry) => ({
    skill: entry.skill,
    qualificationRef: {
      kind: entry.qualificationRef.schema,
      hash: entry.qualificationRef.hash,
    },
  })),
});
ensure(registry.state().candidateCount === 5
  && registry.state().activeCount === 0,
"ARENA_CANDIDATE_ACCEPTED_WITHOUT_EVALUATION");

const data = await loadStarcraftTmgData(PROJECT_ROOT);
const bundle = createKerriganPrimalProductBundleV1();
let roomSequence = 0;
let promptSequence = 0;
let sessionSequence = 0;
let turnSequence = 0;
let forbiddenModelConfirmCalls = 0;
let forbiddenModelApplyCalls = 0;

async function runRoute({ ownFaction, opponentFaction, publicationState,
  pinnedRuntimeRevision }) {
  roomSequence += 1;
  const roomId = `ticket18-s176-${publicationState}-${roomSequence}`;
  const authorityEngine = createStarcraftTmgAuthoritativeEngine({
    rulesVersion: loaded.manifest.sourceBinding.rules,
    dataVersion: loaded.manifest.sourceBinding.dataset,
    now: () => OCCURRED_AT,
  });
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine,
    now: () => OCCURRED_AT,
  });
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  state.activeSideKey = "player1";
  const serverSeatPlan = [
    {
      label: "opponent",
      seatKey: "player1",
      roleMode: "opponent",
      principalType: "model",
    },
    {
      label: "humanSupervisor",
      seatKey: "player1",
      roleMode: "supervisor",
      principalType: "human",
    },
  ];
  const created = await roomRuntime.createRoom({
    roomId,
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state,
      dataVersion: loaded.manifest.sourceBinding.dataset,
      dependencies: {
        sourceSnapshot: {
          artifactId: "ticket18-foundational-strategy-source-binding-v1",
          content: loaded.manifest.sourceBinding,
        },
        dataSnapshot: {
          artifactId: "ticket18-frozen-official-dataset-v1",
          content: { officialDatasetHash: loaded.manifest.sourceBinding.dataset },
        },
      },
      receiptHash: hashStarcraftTmgContract({
        source: "ticket18-slice176-server-fixture",
        state,
      }),
      serverSeatPlan,
    },
    serverSeatPlan,
  });
  ensure(created.ok === true, "ARENA_ROOM_CREATE_FAILED", {
    reason: created.reason,
  });
  const binding = roomBinding(created.matchBinding);
  const characterSelectionHash = hashStarcraftTmgContract({
    roomId,
    characterId: bundle.characterPackage.characterId,
    persona: "hots.primal_queen.post_zerus",
  });
  const principal = createStarcraftTmgOnlinePrincipalBindingV1({
    roomId,
    principalScopeHash: hashStarcraftTmgContract({ roomId, scope: "opponent" }),
    seatKey: "player1",
    principalType: "model",
    principalRoleMode: "opponent",
    bindingRevision: 1,
    allowedAgentModes: ["opponent"],
    characterId: bundle.characterPackage.characterId,
    characterPackageHash: bundle.characterPackage.integrity.hash,
    characterSelectionHash,
    roomBinding: binding,
  });
  const strategySnapshot = publicationState === "evaluation_candidate"
    ? registry.readEvaluationRoute({
      roomBinding: { roomId, ...principal.roomBinding }, ownFaction, opponentFaction,
    })
    : registry.readAcceptedRoute({
      roomBinding: { roomId, ...principal.roomBinding }, ownFaction, opponentFaction,
      ...(pinnedRuntimeRevision === undefined ? {} : { pinnedRuntimeRevision }),
    });
  ensure(strategySnapshot.sourceBindingHash === created.matchBinding.sourceSnapshotHash,
    "ARENA_SOURCE_BINDING_NOT_FROZEN_IN_ROOM");
  const lifecycle = createStarcraftTmgOnlineAgentSessionLifecycleV1({
    principalAuthority: {
      async resolve(input) {
        return input.roomId === roomId && input.principalSessionRef === roomId
          ? { ok: true, binding: principal }
          : { ok: false, reason: "principal_not_authenticated" };
      },
    },
    characterCatalog: {
      async resolve(input) {
        return input.characterId === bundle.characterPackage.characterId
          ? { ok: true, characterPackage: bundle.characterPackage }
          : { ok: false, reason: "character_not_found" };
      },
    },
    createId() {
      sessionSequence += 1;
      return `ticket18-s176-session-${sessionSequence}`;
    },
    now: () => OCCURRED_AT,
  });
  const agentContext = { principalSessionRef: roomId };
  const createdSession = await lifecycle.createSession({
    roomId,
    mode: "opponent",
    characterId: bundle.characterPackage.characterId,
  }, agentContext);
  ensure(createdSession.ok === true, "ARENA_SESSION_CREATE_FAILED");

  const promptStore = createInMemoryStarcraftTmgPromptArtifactStoreV1({
    createId() {
      promptSequence += 1;
      return `ticket18-s176-prompt-${promptSequence}`;
    },
    maxArtifacts: 16,
    maxArtifactBytes: 2 * 1024 * 1024,
  });
  const roomTools = {
    async readBoardState() {
      return roomRuntime.readRoom({
        roomId,
        seatToken: created.credentials.opponent.seatToken,
      });
    },
    async listLegalActions() {
      return roomRuntime.legalSpace({
        roomId,
        seatToken: created.credentials.opponent.seatToken,
      });
    },
    async readPublicEvents() {
      const read = await roomRuntime.readRoom({ roomId, includeJournal: true });
      const events = read.projection.publicJournal || [];
      return {
        ok: true,
        events: {
          schemaVersion: "starcraft_tmg_public_events_v1",
          roomId,
          matchBindingHash: binding.matchBindingHash,
          events,
          eventsHash: hashStarcraftTmgContract(events),
        },
      };
    },
    async readRulesSkills(input) {
      return {
        ok: true,
        snapshot: createStarcraftTmgOnlineRuleSkillSnapshotV1({
          gameId: "starcraft-tmg",
          roomId,
          roomBindingHash: input.roomBinding.roomBindingHash,
          rulesVersion: binding.rulesVersion,
          dataVersion: binding.dataVersion,
          sourceSnapshotHash: binding.sourceSnapshotHash,
          skillEntries: [{ skillArtifact: acceptedRuleSkill(binding) }],
        }),
      };
    },
    async readStrategySkills() {
      return { ok: true, snapshot: strategySnapshot };
    },
    async previewAction(input) {
      return roomRuntime.previewAction({
        roomId,
        seatToken: created.credentials.opponent.seatToken,
        candidateId: input.candidateId,
        expectedMatchBindingHash: input.expectedMatchBindingHash,
        expectedLegalSpaceHash: input.expectedLegalSpaceHash,
        expectedStateRevision: input.expectedStateRevision,
        expectedStateHash: input.expectedStateHash,
        occurredAt: OCCURRED_AT,
      });
    },
    async confirmPreview() {
      forbiddenModelConfirmCalls += 1;
      throw new Error("model confirmation is forbidden");
    },
    async applyAction() {
      forbiddenModelApplyCalls += 1;
      throw new Error("model apply is forbidden");
    },
  };
  const providerSupervisor = {
    async readState() {
      return {
        ok: true,
        state: {
          provider: { state: "connected", model: "injected-deterministic-arena-v1" },
          trainingTruth: false,
        },
      };
    },
    async sendTurn(input) {
      const resolved = promptStore.resolve(input.promptAssemblyRef);
      ensure(resolved.ok === true, "ARENA_PROMPT_RESOLUTION_FAILED");
      const output = providerOutput(resolved.artifact);
      turnSequence += 1;
      const outputHash = hashStarcraftTmgContract(output);
      const receiptBody = {
        schemaVersion: "ticket18_s176_injected_provider_receipt_v1",
        turnId: `ticket18-s176-turn-${turnSequence}`,
        promptHash: input.promptAssemblyRef.hash,
        outputHash,
        providerCalls: 0,
        paidProviderUsed: false,
        trainingTruth: false,
      };
      return {
        ok: true,
        output,
        turn: { turnId: receiptBody.turnId, outputHash },
        receipt: {
          ...receiptBody,
          receiptHash: hashStarcraftTmgContract(receiptBody),
        },
        state: {
          provider: { state: "connected", model: "injected-deterministic-arena-v1" },
          trainingTruth: false,
        },
      };
    },
  };
  const memoryStore = {
    async read(input) {
      return {
        ok: true,
        snapshot: createStarcraftTmgOnlineMemorySnapshotV1({
          gameId: "starcraft-tmg",
          roomId,
          principalScopeHash: input.principalScopeHash,
          sessionBindingHash: input.sessionBindingHash,
          mode: input.mode,
          entries: [],
        }),
      };
    },
  };
  const materialCatalog = {
    async resolve() {
      return {
        ok: true,
        characterPackage: bundle.characterPackage,
        roleSkillPack: bundle.roleSkillPacks.opponent,
        conversationProfile: bundle.conversationProfile,
        providerProfile: bundle.providerProfile,
        worldbooks: bundle.worldbooks,
        spoilerCeilingRank: 60,
        knowledgeCeilingRank: 60,
        allowFanon: false,
      };
    },
  };
  const roleRuntime = createStarcraftTmgOnlineRoleTurnRuntimeV1({
    sessionLifecycle: lifecycle,
    providerSupervisor,
    materialCatalog,
    roomTools,
    memoryStore,
    promptArtifactStore: promptStore,
    historyPolicy: { maxEntries: 8, maxBytes: 256 * 1024 },
    maxUserMessageBytes: 4096,
    maxOutputUnits: 1024,
    now: () => OCCURRED_AT,
  });
  const arena = createStarcraftTmgOnlineStrategyArenaV1({
    agentRuntime: roleRuntime,
    roomRuntime,
    now: () => OCCURRED_AT,
  });
  const trace = await arena.runSupervisedTurn({
    roomId,
    session: createdSession.session,
    agentContext,
    humanSeatToken: created.credentials.humanSupervisor.seatToken,
    humanControllerSessionId: `ticket18-s176-human-${roomSequence}`,
    idempotencyKey: `ticket18-s176-apply-${roomSequence}`,
  });
  const workbench = await roomRuntime.readBattleWorkbench({
    roomId,
    seatToken: created.credentials.humanSupervisor.seatToken,
  });
  ensure(workbench.ok === true, "ARENA_WORKBENCH_READ_FAILED");
  return {
    trace,
    strategySnapshot,
    visualProjectionHash: workbench.snapshot.snapshotHash,
    threatCoverage: workbench.snapshot.threat?.coverage || "unknown",
  };
}

const candidateRuns = [
  await runRoute({
    ownFaction: TERRAN,
    opponentFaction: ZERG,
    publicationState: "evaluation_candidate",
  }),
  await runRoute({
    ownFaction: ZERG,
    opponentFaction: TERRAN,
    publicationState: "evaluation_candidate",
  }),
];
const evaluation = seal({
  schema: "ticket18_s176_candidate_arena_evaluation_v1",
  routeTraceHashes: candidateRuns.map((run) => run.trace.hash),
  directions: candidateRuns.map((run) => ({
    ownFaction: run.strategySnapshot.ownFaction,
    opponentFaction: run.strategySnapshot.opponentFaction,
    skillSetHash: run.strategySnapshot.skillSetHash,
  })),
  actualPreviewApplyReplayPassed: true,
  fullGameStrategyEffectivenessProven: false,
  providerCalls: 0,
  trainingTruth: false,
});
const acceptance = registry.acceptSet({
  expectedRuntimeRevision: 0,
  skillHashes: loaded.entries.map((entry) => entry.skill.hash),
  evaluationRef: { kind: evaluation.schema, hash: evaluation.hash },
});
let staleCasReason = null;
try {
  registry.acceptSet({
    expectedRuntimeRevision: 0,
    skillHashes: [loaded.entries[0].skill.hash],
    evaluationRef: { kind: evaluation.schema, hash: evaluation.hash },
  });
} catch (error) {
  staleCasReason = error.code;
}
ensure(staleCasReason === "STRATEGY_REGISTRY_RUNTIME_CAS_CONFLICT",
  "ARENA_STALE_CAS_WAS_NOT_REJECTED");
const rollbackToEmpty = registry.rollback({
  expectedRuntimeRevision: 1,
  targetRuntimeRevision: 0,
  rollbackRef: { kind: "ticket18_s176_rollback_drill", hash: evaluation.hash },
});
ensure(registry.state().activeCount === 0, "ARENA_ROLLBACK_DID_NOT_RESTORE_EMPTY");
const restoreAccepted = registry.rollback({
  expectedRuntimeRevision: 2,
  targetRuntimeRevision: 1,
  rollbackRef: { kind: "ticket18_s176_restore_drill", hash: acceptance.hash },
});
ensure(registry.state().activeCount === 5, "ARENA_ACCEPTED_SET_NOT_RESTORED");

const acceptedRuns = [
  await runRoute({
    ownFaction: TERRAN,
    opponentFaction: ZERG,
    publicationState: "accepted",
  }),
  await runRoute({
    ownFaction: ZERG,
    opponentFaction: TERRAN,
    publicationState: "accepted",
  }),
];
ensure(forbiddenModelConfirmCalls === 0 && forbiddenModelApplyCalls === 0,
  "ARENA_MODEL_MUTATION_ATTEMPTED");
const pinned = registry.readAcceptedRoute({
  roomBinding: {
    roomId: acceptedRuns[0].strategySnapshot.roomId,
    roomBindingHash: acceptedRuns[0].strategySnapshot.roomBindingHash,
    rulesVersion: acceptedRuns[0].strategySnapshot.rulesVersion,
    dataVersion: acceptedRuns[0].strategySnapshot.dataVersion,
    sourceSnapshotHash: acceptedRuns[0].strategySnapshot.sourceSnapshotHash,
  },
  ownFaction: TERRAN,
  opponentFaction: ZERG,
  pinnedRuntimeRevision: 1,
});
ensure(pinned.registryRuntimeRevision === 1
  && pinned.skillSetHash === acceptedRuns[0].strategySnapshot.skillSetHash,
"ARENA_PINNED_REVISION_DRIFTED");

const allRuns = [...candidateRuns, ...acceptedRuns];
const report = seal({
  schema: "ticket18_slice176_online_strategy_arena_report_v1",
  ticket: 18,
  slice: 176,
  status: "passed",
  manifestHash: loaded.manifest.hash,
  packLoadReceiptHash: loaded.receipt.hash,
  registrationReceiptHash: registration.hash,
  evaluationReceiptHash: evaluation.hash,
  acceptanceReceiptHash: acceptance.hash,
  rollbackReceiptHashes: [rollbackToEmpty.hash, restoreAccepted.hash],
  registryState: registry.state(),
  foundationalOfflineSkills: 5,
  runtimeAcceptedSkills: 5,
  candidateArenaRoutes: candidateRuns.length,
  acceptedArenaRoutes: acceptedRuns.length,
  staleCasReason,
  pinnedRevision: pinned.registryRuntimeRevision,
  pinnedSkillSetHash: pinned.skillSetHash,
  exactDependencyOrder: pinned.dependencyOrder,
  harnessLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  promptPackRoutes: ["opponent_prompt"],
  harnessToolsCalled: [...new Set(allRuns.flatMap((run) =>
    run.trace.harnessToolsCalled))],
  uiTraceEvidence: allRuns.map((run) => ({
    roomId: run.trace.roomId,
    visualProjectionHash: run.visualProjectionHash,
    previewProjectionHash: run.trace.previewProjectionHash,
    threatCoverage: run.threatCoverage,
    screenPixelGeometryUsedForRules: false,
  })),
  agentDecisionEvidence: allRuns.map((run) => ({
    traceHash: run.trace.hash,
    decisionReceiptHash: run.trace.agentDecisionReceiptHash,
    strategySkillHashes: run.trace.strategySkillRefs.map((ref) => ref.hash),
    applyReceiptHash: run.trace.applyReceiptHash,
    replayStateHash: run.trace.replayStateHash,
  })),
  memoryTraceEvidence: {
    refsRead: 0,
    writesPerformed: 0,
    liveMemoryPromotionPerformed: false,
  },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: {
    activationRequiresExplicitCas: true,
    candidateRegistrationChangesActiveVersion: false,
    staleRevisionRejected: true,
    rollbackCreatesNewRuntimeRevision: true,
    roomMayPinOldAcceptedRevision: true,
    silentReplacementAllowed: false,
  },
  userVisibleChecks: [
    "Both directed seats show four ordered strategy dependencies.",
    "The agent stops at Preview and displays human confirmation required.",
    "Only the human supervisor confirms and applies the action.",
    "Replay matches the applied room state.",
    "Candidate, accepted, rollback and pinned versions remain distinguishable.",
  ],
  limitations: [
    "The provider is deterministic and injected; no model quality claim is made.",
    "The current workbench threat overlay remains partial, not an exact spatial oracle.",
    "These one-transition traces do not prove whole-game strategy effectiveness.",
  ],
  modelCalls: 0,
  paidProviderUsed: false,
  sourceRefreshPerformed: false,
  fullGameStrategyEffectivenessProven: false,
  rulesAuthority: "external_rules_service",
  eligibleForTraining: false,
  trainingTruth: false,
});

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({
  ok: true,
  output: path.relative(ROOT, OUTPUT),
  reportHash: report.hash,
  runtimeAcceptedSkills: report.runtimeAcceptedSkills,
  candidateArenaRoutes: report.candidateArenaRoutes,
  acceptedArenaRoutes: report.acceptedArenaRoutes,
  runtimeRevision: report.registryState.runtimeRevision,
  harnessToolsCalled: report.harnessToolsCalled,
}, null, 2));
