import path from "node:path";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createIterativeRosterBuilderAdapterV1 } from
  "./iterative-roster-builder-adapter-v1.mjs";
import { createIterativeRosterFileStoreV1 } from
  "./iterative-roster-file-store-v1.mjs";
import { createIterativeRosterFlashModelPortV1 } from
  "./iterative-roster-flash-model-port-v1.mjs";
import { createIterativeRosterPlanSessionV1 } from
  "./iterative-roster-plan-session-v1.mjs";
import { createIterativeRosterToolPortV1 } from
  "./iterative-roster-tool-port-v1.mjs";

export const ITERATIVE_ROSTER_PRODUCT_PORT_V1 =
  "starcraft_tmg_iterative_roster_product_port_v1";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

export function createIterativeRosterProductPortV1({ directory,
  deliberationFactory, armyBuilderPort, mapEvidencePort, strategist,
  missionScoringAuthority } = {}) {
  if (typeof directory !== "string" || !path.isAbsolute(directory)
    || typeof deliberationFactory?.createForRun !== "function"
    || typeof armyBuilderPort?.evaluateRosterCandidate !== "function"
    || typeof mapEvidencePort?.summarizeMap !== "function"
    || typeof strategist?.selectSkillRoute !== "function"
    || !missionScoringAuthority) fail("ITERATIVE_ROSTER_PRODUCT_PORT_MISSING");

  const mapSummary = mapEvidencePort.summarizeMap({
    queryId: "iterative-roster-frozen-map-summary" });
  const binding = mapSummary.mapBinding;
  if (mapSummary.resultStatus !== "certified_map_summary"
    || !binding?.roomFreezeHash
    || !binding?.officialSourceSnapshotHash
    || !binding?.missionRecordKey || !binding?.deploymentRecordKey) {
    fail("ITERATIVE_ROSTER_CERTIFIED_MAP_REQUIRED");
  }
  const store = createIterativeRosterFileStoreV1({ directory });
  const tools = createIterativeRosterToolPortV1({ armyBuilderPort,
    mapEvidencePort });
  const builder = createIterativeRosterBuilderAdapterV1(armyBuilderPort);
  const modelFor = (state) => {
    const route = strategist.selectSkillRoute({
      ownFactionRecordKey: state.frozenContext.factionRecordKey,
      opponentFactionRecordKey:
        state.frozenContext.opponentFactionRecordKey,
    });
    return createIterativeRosterFlashModelPortV1({ deliberationFactory,
      replyStore: store,
      skillGuidance: { selection: route.receipt,
        projections: route.projections },
      missionEvidence: { scoring: missionScoringAuthority,
        map: mapSummary },
    });
  };
  const session = createIterativeRosterPlanSessionV1({
    store,
    model: {
      decide: ({ requestKey, state }) => modelFor(state).decide({
        requestKey, state }),
      recover: ({ requestKey, sourceRequestKey, state }) =>
        modelFor(state).recover({ requestKey, sourceRequestKey, state }),
      reconcile: ({ requestKey, sourceRequestKey, state }) =>
        modelFor(state).reconcile({ requestKey, sourceRequestKey, state }),
    },
    builder, tools,
    review: {
      final: async (state) => {
        // Draft selection is not a complete RosterPlan. In particular the
        // model's `arrivalScheduleStatus` is not Rules supply evidence.
        const blockingFindings = [
          "OPENING_ARRIVAL_SCHEDULE_NOT_RULES_AUDITED",
          "FULL_ROSTER_PLAN_AND_TEACH_REVIEW_NOT_COMPLETED",
        ];
        return { blockingFindings,
          reviewHash: hashStarcraftTmgContract({
            stateContextHash: state.contextHash,
            candidateHash: state.currentCandidate?.candidateHash || null,
            plan: state.plan, blockingFindings,
          }) };
      },
    },
  });
  return Object.freeze({
    descriptor: () => Object.freeze({
      schema: ITERATIVE_ROSTER_PRODUCT_PORT_V1,
      mapSeedId: binding.seedId,
      roomFreezeHash: binding.roomFreezeHash,
      draftOnly: true, providerCallsAtConstruction: 0,
      rulesAuthority: "official_army_builder_only",
      trainingTruth: false,
    }),
    start: (input = {}) => {
      if (!String(input.sideKey || "").trim()
        || !String(input.factionRecordKey || "").trim()
        || !String(input.opponentFactionRecordKey || "").trim()
        || !String(input.scaleId || "").trim()) {
        fail("ITERATIVE_ROSTER_PRODUCT_CONTEXT_INVALID");
      }
      const frozenContext = {
        sideKey: input.sideKey,
        factionRecordKey: input.factionRecordKey,
        opponentFactionRecordKey: input.opponentFactionRecordKey,
        scaleId: input.scaleId,
        mapHash: binding.roomFreezeHash,
        taskHash: hashStarcraftTmgContract({
          missionRecordKey: binding.missionRecordKey,
          deploymentRecordKey: binding.deploymentRecordKey,
        }),
        sourceHash: binding.officialSourceSnapshotHash,
      };
      strategist.selectSkillRoute({
        ownFactionRecordKey: frozenContext.factionRecordKey,
        opponentFactionRecordKey:
          frozenContext.opponentFactionRecordKey,
      });
      return session.start({ sessionId: input.sessionId,
        mineralBudget: input.mineralBudget, frozenContext });
    },
    resume: session.resume, pause: session.pause, read: session.read,
  });
}
