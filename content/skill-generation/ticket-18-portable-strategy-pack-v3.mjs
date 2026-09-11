import { seal } from "../../packages/skill-production/common.mjs";

const ROOT = "content/strategy-skills/ticket-18-foundational-v1";

export const STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V3 = seal({
  schema: "ticket18_portable_strategy_pack_manifest_v3",
  gameId: "starcraft-tmg",
  predecessorManifest: {
    schema: "ticket18_portable_strategy_pack_manifest_v2",
    hash: "47ed51cb716563d46179695f6c76d789242eff158be9fad554cba5fcd2935bc8",
    strictlyFrozen: true,
  },
  sourceBinding: {
    core: "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1",
    faq: "2881adb2a4e0475f07bb17aebf02e64f35c9073f274cec2cf0a8f770f8647226",
    rules: "f069451ab987d7951231a336d2b2318b74dc19a8fc6998860f14bcd584d06c13",
    dataset: "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067",
  },
  fullMatchEvolution: {
    episodes: {
      path: `${ROOT}/evolution/fullmatch-episodes.json`,
      hash: "13a0850d709fe80a86b3c3ff9fd5a376b2b002930926bada5cd4f3f160dab4ef",
    },
    reflection: {
      path: `${ROOT}/evolution/fullmatch-reflection.json`,
      hash: "e7275f83cfb7987d7ed32905c54faad8b789285ef34a49574235cf3f2bead72b",
    },
    positionEvaluations: {
      path: `${ROOT}/evolution/fullmatch-position-evaluations.json`,
      hash: "38ea08dfa9fb7085ea5381b360fd1511f0f83a52fc2d6618cebb6d9b03d990b0",
    },
    candidates: [
      {
        skillId: "starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm",
        path: `${ROOT}/evolution/fullmatch-skillopt-terran-to-zerg.json`,
        hash: "41d024e663f350f3a3fef4a8a8726c6a4f5d16a856c3a97dc2335cfb8da06dc2",
      },
      {
        skillId: "starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces",
        path: `${ROOT}/evolution/fullmatch-skillopt-zerg-to-terran.json`,
        hash: "ce0969b81b7de79668126ec58a668540ead54c992b6a83458972765c8dccada1",
      },
    ],
    promotionRecords: {
      path: `${ROOT}/evolution/fullmatch-promotion-records.json`,
      hash: "df5d90c50a8e6dd4a53fb9f9d3d3f330a43c125d5538e7a5d96f4f9ddae01e63",
    },
    finalEvidence: {
      slice: 182,
      path: `${ROOT}/evidence/slice-182-real-match-evolution-report.json`,
      hash: "6e42d3158eb5fe0674fb904680383ef12d69818404ec4a666fb58032c0656b60",
    },
  },
  selectionPolicy:
    "exact_v2_foundational_parents_plus_exact_v3_fullmatch_candidates_no_highest_version",
  automaticPromotion: false,
  buildPathDependencies: false,
  sourceRefreshPerformed: false,
  runtimeAccepted: false,
  eligibleForTraining: false,
  trainingTruth: false,
});
