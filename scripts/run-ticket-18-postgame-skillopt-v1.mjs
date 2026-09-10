#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1 } from
  "../content/skill-generation/ticket-18-foundational-strategy-pack-v1.mjs";
import { loadFormalFoundationalStrategyPackV1 } from
  "../packages/strategy-skills/formal-foundational-skill-pack-loader-v1.mjs";
import {
  compileStarcraftTmgCompletedStrategyEpisodeV1,
  createInMemoryStarcraftTmgSkillOptStoreV1,
  createStarcraftTmgPostgameSkillOptWorkflowV1,
} from "../packages/strategy-skills/postgame-skillopt-workflow-v1.mjs";
import { clone, hash, seal, verifySeal } from
  "../packages/skill-production/common.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "build/ticket-18-directed-matchup-v1/matchup-final-v1-73e96a3db3be82d1b0bf";
const OUTPUT = path.join(ROOT, "build/ticket-18-postgame-skillopt-v1");
const RUN_ID = "ticket18-s177-first-five-reflection-v1";

async function json(relative) {
  return verifySeal(JSON.parse(await readFile(path.join(ROOT, relative), "utf8")));
}

function ensure(condition, code) {
  if (!condition) throw Object.assign(new Error(code), { code });
}

const pack = await loadFormalFoundationalStrategyPackV1({
  root: ROOT,
  manifest: STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1,
});
const arenaReport = await json("build/ticket-18-online-strategy-arena-v1/report.json");
ensure(arenaReport.status === "passed" && arenaReport.runtimeAcceptedSkills === 5,
  "SKILLOPT_ACCEPTED_PARENT_REGISTRY_EVIDENCE_MISSING");
const corpus = await json(`${BASE}/case-corpus.json`);
const resultPaths = [
  `${BASE}/terran-to-zerg/case-results/matchup.terran_to_zerg.initiative.development.json`,
  `${BASE}/terran-to-zerg/case-results/matchup.terran_to_zerg.initiative.heldout.json`,
  `${BASE}/zerg-to-terran/case-results/matchup.zerg_to_terran.initiative.development.json`,
  `${BASE}/zerg-to-terran/case-results-v2/matchup.zerg_to_terran.initiative.heldout.json`,
];
const results = await Promise.all(resultPaths.map(json));
const cases = new Map(corpus.cases.map((entry) => [entry.prompt.caseId, entry]));
const episodes = results.map((result) =>
  compileStarcraftTmgCompletedStrategyEpisodeV1({
    compiledCase: cases.get(result.caseId),
    caseResult: result,
  }));
ensure(episodes.length === 4
  && episodes.every((episode) =>
    episode.hindsightBoundary.outcomeAvailableToOriginalDecision === false
    && episode.preAction.outcomesVisibleAtDecisionTime === false),
"SKILLOPT_HINDSIGHT_BOUNDARY_MISSING");
const targetSkills = pack.entries
  .filter((entry) => entry.role === "matchup")
  .map((entry) => entry.skill);

let injectedReflectionCalls = 0;
const reflectionProvider = {
  async reflect(request) {
    injectedReflectionCalls += 1;
    const directions = ["terran_to_zerg", "zerg_to_terran"];
    const findings = directions.map((direction) => {
      const rows = request.episodes.filter((episode) =>
        episode.direction === direction);
      ensure(rows.length === 2, "SKILLOPT_DIRECTION_SAMPLE_INCOMPLETE");
      const selected = new Set(rows.map((row) =>
        row.actualOutcome.selectedCandidateId));
      ensure(selected.size === 2
        && rows.every((row) => row.actualOutcome.preferredByFrozenObjective),
      "SKILLOPT_CONDITIONAL_POLICY_NOT_OBSERVED");
      return {
        findingId: `finding.${direction}.conditional_initiative`,
        direction,
        caseIds: rows.map((row) => row.episodeId),
        claimType: "conditional_policy",
        claim:
          "The preferred first actor changes across the two bound observations; no fixed race-level first-player preference is supported.",
        preActionRefHashes: rows.map((row) => row.preAction.hash),
        outcomeRefHashes: rows.map((row) => row.actualOutcome.hash),
        limitations: [
          "Only two rules-executed initiative branches are available for this direction.",
          "The traces are not full games and do not prove win-rate improvement.",
        ],
      };
    });
    const patches = directions.map((direction) => {
      const targetId = direction === "terran_to_zerg"
        ? "starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm"
        : "starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces";
      const target = request.targetSkillRefs.find((skill) =>
        skill.id === targetId);
      ensure(target, "SKILLOPT_TARGET_DIRECTION_MISSING");
      return {
        targetSkillHash: target.hash,
        targetSkillId: target.id,
        operation: "append_advisory_strategy_note",
        axis: "opening_branches",
        lesson: {
          title: "Treat first-actor choice as state-conditional, never faction-fixed",
          when: [
            "The current phase asks the marker holder to choose the first actor.",
            "Both first-player candidates remain legal in the current LegalSpace.",
          ],
          guidance:
            "Compare the current objective vector and visible positional tempo for both candidates. Do not hard-code Terran-first or Zerg-first; the preferred actor changed between the two evaluated observations.",
          risk:
            "This lesson is supported only by two small initiative branches and cannot be generalized to whole-match strength.",
          reviseIf: [
            "New visible deployment, score, threat or activation information changes the objective ordering.",
            "Independent held-out or full-match comparison contradicts this conditional policy.",
          ],
        },
        evidenceFindingIds: [`finding.${direction}.conditional_initiative`],
      };
    });
    return {
      schema: "starcraft_tmg_postgame_strategy_reflection_v1",
      findings,
      patches,
      trainingTruth: false,
    };
  },
};

const firstStore = createInMemoryStarcraftTmgSkillOptStoreV1();
const firstWorkflow = createStarcraftTmgPostgameSkillOptWorkflowV1({
  store: firstStore,
  reflectionProvider,
});
const paused = await firstWorkflow.run({
  runId: RUN_ID,
  episodes,
  targetSkills,
  pauseAfterStep: "reflection",
});
ensure(paused.status === "paused_after_completed_reflection"
  && paused.providerCalls === 1 && injectedReflectionCalls === 1,
"SKILLOPT_CONTROLLED_PAUSE_FAILED");
const checkpoint = firstStore.snapshot();
const resumedStore = createInMemoryStarcraftTmgSkillOptStoreV1({ snapshot: checkpoint });
const resumedWorkflow = createStarcraftTmgPostgameSkillOptWorkflowV1({
  store: resumedStore,
  reflectionProvider,
});
const completed = await resumedWorkflow.run({
  runId: RUN_ID,
  episodes,
  targetSkills,
});
ensure(completed.ok === true && completed.providerCalls === 0
  && injectedReflectionCalls === 1 && completed.candidates.length === 2
  && completed.candidates.every((candidate) =>
    candidate.status === "quarantined_candidate"
    && candidate.mayReplaceAcceptedVersion === false
    && candidate.runtimeAccepted === false),
"SKILLOPT_RESUME_OR_QUARANTINE_FAILED");

await mkdir(path.join(OUTPUT, "episodes"), { recursive: true });
for (const episode of episodes) {
  await writeFile(path.join(OUTPUT, "episodes", `${episode.episodeId}.json`),
    `${JSON.stringify(episode, null, 2)}\n`, { mode: 0o600 });
}
await writeFile(path.join(OUTPUT, "reflection.json"),
  `${JSON.stringify(completed.reflection, null, 2)}\n`, { mode: 0o600 });
await writeFile(path.join(OUTPUT, "skillopt-candidates.json"),
  `${JSON.stringify(completed.candidates, null, 2)}\n`, { mode: 0o600 });
await writeFile(path.join(OUTPUT, "resume-checkpoint.json"),
  `${JSON.stringify(checkpoint, null, 2)}\n`, { mode: 0o600 });

const report = seal({
  schema: "ticket18_slice177_postgame_skillopt_report_v1",
  ticket: 18,
  slice: 177,
  status: "passed",
  predecessorArenaReportHash: arenaReport.hash,
  foundationalPackHash: pack.manifest.hash,
  acceptedParentSkillHashes: targetSkills.map((skill) => skill.hash),
  episodeCount: episodes.length,
  directionCount: new Set(episodes.map((episode) => episode.direction)).size,
  developmentEpisodes: episodes.filter((episode) =>
    episode.evaluationSplit === "development").length,
  heldoutEpisodes: episodes.filter((episode) =>
    episode.evaluationSplit === "heldout").length,
  allRulesReplayPassed: episodes.every((episode) =>
    episode.actualOutcome.rulesReplayPassed),
  hindsightBoundaryPassed: episodes.every((episode) =>
    episode.hindsightBoundary.outcomeAvailableToOriginalDecision === false),
  controlledPause: {
    status: paused.status,
    resumeCursor: paused.resumeCursor,
    checkpointHash: checkpoint.hash,
  },
  resumedWithoutDuplicateReflectionCall: completed.providerCalls === 0,
  injectedReflectionCalls,
  reflectionHash: completed.reflection.hash,
  skillOptCandidateHashes: completed.candidates.map((candidate) => candidate.hash),
  skillOptCandidates: completed.candidates.map((candidate) => ({
    candidateId: candidate.candidateId,
    parentSkillRef: clone(candidate.parentSkillRef),
    proposedVersion: candidate.proposedVersion,
    status: candidate.status,
    runtimeAccepted: candidate.runtimeAccepted,
  })),
  currentlyAcceptedRuntimeSkillsPreserved: arenaReport.runtimeAcceptedSkills,
  automaticPromotion: false,
  harnessLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  promptPackRoutes: ["reflection_prompt", "skillopt_prompt"],
  harnessToolsCalled: [
    "read_episode_trace",
    "read_rules_skills",
    "read_strategy_skills",
    "write_skillopt_candidate",
  ],
  uiTraceEvidence: [{
    arenaReportHash: arenaReport.hash,
    visualTraceCount: arenaReport.uiTraceEvidence.length,
    threatCoverage: [...new Set(arenaReport.uiTraceEvidence.map((entry) =>
      entry.threatCoverage))],
  }],
  agentDecisionEvidence: episodes.map((episode) => ({
    episodeHash: episode.hash,
    preActionHash: episode.preActionHash,
    actualOutcomeHash: episode.actualOutcomeHash,
    selectedCandidateId: episode.actualOutcome.selectedCandidateId,
    evaluationSplit: episode.evaluationSplit,
  })),
  memoryTraceEvidence: {
    writesPerformed: 0,
    reflectionPromotedToMemory: false,
  },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: {
    acceptedParentsRemainActive: true,
    skillOptCandidatesStartQuarantined: true,
    independentHeldoutRequired: true,
    arenaComparisonRequired: true,
    silentLiveUpgradeAllowed: false,
  },
  userVisibleChecks: [
    "Review shows decision-time evidence separately from later outcome evidence.",
    "Both directions merge two completed transition episodes without losing room/case identity.",
    "A completed reflection resumes from checkpoint without a second Provider call.",
    "SkillOpt output is visibly quarantined and does not replace the accepted Skill.",
  ],
  limitations: [
    "The four source episodes are rules-executed synthetic transitions, not full games.",
    "The reflection adapter is deterministic and injected, not a paid language model.",
    "Candidate utility and regression safety remain unproven until Slice 178.",
  ],
  modelCalls: 0,
  paidProviderUsed: false,
  sourceRefreshPerformed: false,
  fullGameStrategyEffectivenessProven: false,
  runtimeAccepted: false,
  eligibleForTraining: false,
  trainingTruth: false,
});
await writeFile(path.join(OUTPUT, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });

console.log(JSON.stringify({
  ok: true,
  output: path.relative(ROOT, path.join(OUTPUT, "report.json")),
  reportHash: report.hash,
  episodeCount: report.episodeCount,
  skillOptCandidates: report.skillOptCandidateHashes.length,
  resumedWithoutDuplicateReflectionCall:
    report.resumedWithoutDuplicateReflectionCall,
  runtimeAccepted: report.runtimeAccepted,
  modelCalls: report.modelCalls,
}, null, 2));
