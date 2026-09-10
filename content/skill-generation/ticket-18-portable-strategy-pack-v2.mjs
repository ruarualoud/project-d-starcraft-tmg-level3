import { seal } from "../../packages/skill-production/common.mjs";

const ROOT = "content/strategy-skills/ticket-18-foundational-v1";

export const STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 = seal({
  schema: "ticket18_portable_strategy_pack_manifest_v2",
  gameId: "starcraft-tmg",
  sourceBinding: {
    core: "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1",
    faq: "2881adb2a4e0475f07bb17aebf02e64f35c9073f274cec2cf0a8f770f8647226",
    rules: "f069451ab987d7951231a336d2b2318b74dc19a8fc6998860f14bcd584d06c13",
    dataset: "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067",
  },
  entries: [
    {
      role: "general",
      skillId: "starcraft-tmg.general-rules-and-strategy",
      skillHash: "e06b28c385c12d278d5e3d6ff2a777ef8d20cd520ea8e27e4449afa26218b10b",
      skillPath: `${ROOT}/skills/general-rules-and-strategy.json`,
      qualificationPath: `${ROOT}/qualifications/general-rules-and-strategy.json`,
      qualificationHash: "2bc23f2b6bbbe69534ac603aa1bab6260b3568ad337553a6fa879b6d5670e967",
    },
    {
      role: "faction",
      factionRecordKey: "tactical_cards:terran_armed_forces",
      skillId: "starcraft-tmg.faction.terran_armed_forces",
      skillHash: "f717d6ffa02433a7d2cce20a937fbaf37c3a6fa83115470fdc4d7fc9cd1ab148",
      skillPath: `${ROOT}/skills/faction-terran_armed_forces.json`,
      qualificationPath: `${ROOT}/qualifications/faction-terran_armed_forces.json`,
      qualificationHash: "083f5d573b06c8254a20d750a94b401e839ea450a5a2de58cf4cf071ad6cb832",
    },
    {
      role: "faction",
      factionRecordKey: "tactical_cards:zerg_swarm",
      skillId: "starcraft-tmg.faction.zerg_swarm",
      skillHash: "7b49063aafbd1d67302a8674249f07dfc5a21892747f95222649af2ff541a960",
      skillPath: `${ROOT}/skills/faction-zerg_swarm.json`,
      qualificationPath: `${ROOT}/qualifications/faction-zerg_swarm.json`,
      qualificationHash: "c39f8ce71705b9fa0bf832584e6496eda07380e9723933a721f06721ea03b0b8",
    },
    {
      role: "matchup",
      ownFaction: "tactical_cards:terran_armed_forces",
      opponentFaction: "tactical_cards:zerg_swarm",
      skillId: "starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm",
      skillHash: "3ddf4221b8e21e36ddc0a59991aae536fe397eaf9107ec61ca70b73bef8fafee",
      skillPath: `${ROOT}/skills/matchup-terran_armed_forces-to-zerg_swarm.json`,
      qualificationPath: `${ROOT}/qualifications/directed-matchups.json`,
      qualificationHash: "d39f30f979bf52aa242e336adb0ab84717a75d80740955e44ef29a22f575469a",
    },
    {
      role: "matchup",
      ownFaction: "tactical_cards:zerg_swarm",
      opponentFaction: "tactical_cards:terran_armed_forces",
      skillId: "starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces",
      skillHash: "f843dd8a3493c0db6a004274c2febd8a179e720cd319ff004e5cba2ccc990a19",
      skillPath: `${ROOT}/skills/matchup-zerg_swarm-to-terran_armed_forces.json`,
      qualificationPath: `${ROOT}/qualifications/directed-matchups.json`,
      qualificationHash: "d39f30f979bf52aa242e336adb0ab84717a75d80740955e44ef29a22f575469a",
    },
  ],
  evolution: {
    candidates: [
      {
        skillId: "starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm",
        path: `${ROOT}/evolution/skillopt-terran-to-zerg.json`,
        hash: "449d4281de792f106de9d7e2b979cb89c9c0c33775422713c1ef6db870b5be27",
      },
      {
        skillId: "starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces",
        path: `${ROOT}/evolution/skillopt-zerg-to-terran.json`,
        hash: "a9d81b552db20d812639b41e764260808a543831c1ddb0ba572bc32f15b8e00d",
      },
    ],
    promotionRecordBundle: {
      path: `${ROOT}/evolution/promotion-records.json`,
      hash: "a232ad99d5e999801f5d0216be30db54c0ea23fa51ceda18a21f729a1732ba27",
    },
    predecessorEvidence: [
      {
        slice: 176,
        path: `${ROOT}/evidence/slice-176-online-arena-report.json`,
        hash: "9e1498bbd9ff88649270dde724fa60df4b4bd07395ab72a1bec32ec68868eca8",
      },
      {
        slice: 177,
        path: `${ROOT}/evidence/slice-177-postgame-skillopt-report.json`,
        hash: "dfc4ef065595db46dbfbf5aa2bd4fca1b7c54b46556cfa306cf5fc81de60c5eb",
      },
      {
        slice: 178,
        path: `${ROOT}/evidence/slice-178-skillopt-regression-report.json`,
        hash: "33792bc949313e9e45fefbd6773b22fab77ed01afbf39ea20e25eb3c21430daa",
      },
    ],
  },
  selectionPolicy: "exact_portable_manifest_only_no_build_path_no_highest_version",
  contentRoot: ROOT,
  buildPathDependencies: false,
  sourceRefreshPerformed: false,
  runtimeAccepted: false,
  trainingTruth: false,
});
