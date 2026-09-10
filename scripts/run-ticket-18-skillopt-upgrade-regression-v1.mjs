#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1 } from
  "../content/skill-generation/ticket-18-foundational-strategy-pack-v1.mjs";
import { loadFormalFoundationalStrategyPackV1 } from
  "../packages/strategy-skills/formal-foundational-skill-pack-loader-v1.mjs";
import { createStarcraftTmgOnlineStrategySkillRegistryV1 } from
  "../packages/strategy-skills/online-strategy-skill-registry-v1.mjs";
import {
  compileStarcraftTmgSkillOptCandidateSkillV1,
  createStarcraftTmgSkillOptNegativeControlV1,
  evaluateStarcraftTmgSkillOnStrategyCaseV1,
  summarizeStarcraftTmgSkillOptEvaluationV1,
} from "../packages/strategy-skills/skillopt-candidate-evaluation-v1.mjs";
import { clone, hash, seal, verifySeal } from
  "../packages/skill-production/common.mjs";
import { compileSkillOptIndependentHeldoutCasesV1 } from
  "./support/skillopt-heldout-case-corpus-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MATCHUP_BASE =
  "build/ticket-18-directed-matchup-v1/matchup-final-v1-73e96a3db3be82d1b0bf";
const SKILLOPT_BASE = "build/ticket-18-postgame-skillopt-v1";
const OUTPUT = path.join(ROOT, "build/ticket-18-skillopt-upgrade-regression-v1");

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, details });
}

async function json(relative) {
  return verifySeal(JSON.parse(await readFile(path.join(ROOT, relative), "utf8")));
}

async function rawJson(relative) {
  return JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
}

function directionForCase(caseId) {
  return caseId.includes("terran_to_zerg")
    ? "terran_to_zerg"
    : "zerg_to_terran";
}

function skillIdForDirection(direction) {
  return direction === "terran_to_zerg"
    ? "starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm"
    : "starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces";
}

function routeForDirection(direction) {
  return direction === "terran_to_zerg"
    ? ["tactical_cards:terran_armed_forces", "tactical_cards:zerg_swarm"]
    : ["tactical_cards:zerg_swarm", "tactical_cards:terran_armed_forces"];
}

function roomBinding(sourceBinding, suffix) {
  return {
    roomId: `ticket18-s178-${suffix}`,
    roomBindingHash: hash({ suffix, sourceBinding }),
    rulesVersion: sourceBinding.rules,
    dataVersion: sourceBinding.dataset,
    sourceSnapshotHash: hash(sourceBinding),
  };
}

const pack = await loadFormalFoundationalStrategyPackV1({
  root: ROOT,
  manifest: STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1,
});
const slice176 = await json("build/ticket-18-online-strategy-arena-v1/report.json");
const slice177 = await json(`${SKILLOPT_BASE}/report.json`);
ensure(slice176.status === "passed" && slice176.runtimeAcceptedSkills === 5,
  "SKILLOPT_PREDECESSOR_ARENA_MISSING");
ensure(slice177.status === "passed"
  && slice177.skillOptCandidateHashes.length === 2,
"SKILLOPT_PREDECESSOR_REFLECTION_MISSING");

const patches = await rawJson(`${SKILLOPT_BASE}/skillopt-candidates.json`);
const parents = new Map(pack.entries.filter((entry) => entry.role === "matchup")
  .map((entry) => [entry.skill.skillId, entry.skill]));
ensure(patches.length === 2, "SKILLOPT_PATCH_DENOMINATOR_INVALID");
const candidates = patches.map((patch) => {
  ensure(slice177.skillOptCandidateHashes.includes(patch.hash),
    "SKILLOPT_PATCH_NOT_IN_REFLECTION_REPORT");
  return compileStarcraftTmgSkillOptCandidateSkillV1({
    parentSkill: parents.get(patch.parentSkillRef.id),
    skillOptCandidate: patch,
  });
});
const negativeControls = candidates.map((candidate) => {
  const parent = parents.get(candidate.skillId);
  const fixedCandidateId = candidate.skillId.includes("terran_armed_forces-to")
    ? "first-player1" : "first-player2";
  return createStarcraftTmgSkillOptNegativeControlV1({
    parentSkill: parent,
    fixedCandidateId,
  });
});

const originalCorpus = await json(`${MATCHUP_BASE}/case-corpus.json`);
const independentCorpus = await compileSkillOptIndependentHeldoutCasesV1(ROOT);
const originalStateHashes = new Set(originalCorpus.cases.map((entry) =>
  entry.prompt.binding.stateHash));
const originalFamilyIds = new Set(originalCorpus.cases.map((entry) =>
  entry.prompt.familyId));
ensure(independentCorpus.cases.length === 4
  && independentCorpus.cases.every((entry) =>
    entry.evaluation.split === "heldout"
    && !originalStateHashes.has(entry.prompt.binding.stateHash)
    && !originalFamilyIds.has(entry.prompt.familyId)),
"SKILLOPT_INDEPENDENT_HELDOUT_LEAKAGE");

const historicalFailure = await json(
  `${MATCHUP_BASE}/zerg-to-terran/case-results/`
  + "matchup.zerg_to_terran.initiative.heldout.json");
ensure(historicalFailure.grade.legalCandidateSelected === true
  && historicalFailure.grade.decisionPreferencePassed === false
  && historicalFailure.rulesReplayPassed === true,
"SKILLOPT_HISTORICAL_FAILURE_NOT_REPRODUCED");

const regressionCases = [...originalCorpus.cases, ...independentCorpus.cases];
const candidateEvaluations = candidates.map((candidate) => {
  const expectedSkillId = candidate.skillId;
  const cases = regressionCases.filter((entry) =>
    skillIdForDirection(directionForCase(entry.prompt.caseId)) === expectedSkillId);
  const results = cases.map((compiledCase) =>
    evaluateStarcraftTmgSkillOnStrategyCaseV1({
      skill: candidate,
      expectedSkillId,
      compiledCase,
    }));
  return {
    skill: candidate,
    results,
    summary: summarizeStarcraftTmgSkillOptEvaluationV1({
      skill: candidate,
      results,
    }),
  };
});
const negativeEvaluations = negativeControls.map((candidate) => {
  const expectedSkillId = candidate.skillId;
  const cases = independentCorpus.cases.filter((entry) =>
    skillIdForDirection(directionForCase(entry.prompt.caseId)) === expectedSkillId);
  const results = cases.map((compiledCase) =>
    evaluateStarcraftTmgSkillOnStrategyCaseV1({
      skill: candidate,
      expectedSkillId,
      compiledCase,
    }));
  return {
    skill: candidate,
    results,
    summary: summarizeStarcraftTmgSkillOptEvaluationV1({
      skill: candidate,
      results,
    }),
  };
});
ensure(candidateEvaluations.every((entry) =>
  entry.summary.status === "promotable_manual_approval_required"
  && entry.summary.failedCases === 0)
  && negativeEvaluations.every((entry) =>
    entry.summary.status === "quarantined_regression"
    && entry.summary.failedCases === 1),
"SKILLOPT_REGRESSION_GATE_DID_NOT_DISCRIMINATE");

const registry = createStarcraftTmgOnlineStrategySkillRegistryV1({
  sourceBinding: pack.manifest.sourceBinding,
  now: () => "2026-09-11T00:00:00.000Z",
});
const baseRegistration = registry.registerCandidates({
  expectedCatalogRevision: 0,
  entries: pack.entries.map((entry) => ({
    skill: entry.skill,
    qualificationRef: {
      kind: "foundational_pack",
      hash: entry.qualificationRef.hash,
    },
  })),
});
const baseAcceptance = registry.acceptSet({
  expectedRuntimeRevision: 0,
  skillHashes: pack.entries.map((entry) => entry.skill.hash),
  evaluationRef: { kind: "slice176_arena", hash: slice176.hash },
});
const candidateRegistration = registry.registerCandidates({
  expectedCatalogRevision: baseRegistration.catalogRevision,
  entries: [
    ...candidateEvaluations.map((entry) => ({
      skill: entry.skill,
      qualificationRef: { kind: "skillopt_regression", hash: entry.summary.hash },
    })),
    ...negativeEvaluations.map((entry) => ({
      skill: entry.skill,
      qualificationRef: { kind: "negative_control", hash: entry.summary.hash },
    })),
  ],
});

const arenaComparisons = candidateEvaluations.map((entry) => {
  const direction = entry.skill.skillId.includes("terran_armed_forces-to")
    ? "terran_to_zerg" : "zerg_to_terran";
  const [ownFaction, opponentFaction] = routeForDirection(direction);
  const parent = parents.get(entry.skill.skillId);
  const negative = negativeEvaluations.find((row) =>
    row.skill.skillId === entry.skill.skillId);
  const request = {
    ownFaction,
    opponentFaction,
    roomBinding: roomBinding(pack.manifest.sourceBinding, direction),
  };
  const parentRoute = registry.readAcceptedRoute(request);
  const candidateRoute = registry.readEvaluationRoute({
    ...request,
    candidateSkillHashes: [entry.skill.hash],
  });
  const negativeRoute = registry.readEvaluationRoute({
    ...request,
    candidateSkillHashes: [negative.skill.hash],
  });
  ensure(parentRoute.skillRefs.at(-1).hash === parent.hash
    && candidateRoute.skillRefs.at(-1).hash === entry.skill.hash
    && negativeRoute.skillRefs.at(-1).hash === negative.skill.hash
    && parentRoute.skillEntries.at(-1).promptGuidance.skillOptAdvisories
      === undefined
    && candidateRoute.skillEntries.at(-1).promptGuidance
      .skillOptAdvisories?.at(-1)?.advisoryHash
      === entry.skill.skillOptAdvisories.at(-1).hash
    && negativeRoute.skillEntries.at(-1).promptGuidance
      .skillOptAdvisories?.at(-1)?.advisoryHash
      === negative.skill.skillOptAdvisories.at(-1).hash,
  "SKILLOPT_ARENA_EXACT_SELECTION_FAILED");
  return seal({
    schema: "starcraft_tmg_skillopt_isolated_arena_comparison_v1",
    direction,
    parentSnapshotHash: parentRoute.snapshotHash,
    candidateSnapshotHash: candidateRoute.snapshotHash,
    negativeControlSnapshotHash: negativeRoute.snapshotHash,
    candidateEvaluationHash: entry.summary.hash,
    negativeControlEvaluationHash: negative.summary.hash,
    candidateNonRegressionPassed: entry.summary.failedCases === 0,
    negativeControlRejected: negative.summary.failedCases > 0,
    fullGameStrategyEffectivenessProven: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
});

const isolatedAcceptance = registry.acceptSet({
  expectedRuntimeRevision: baseAcceptance.runtimeRevision,
  skillHashes: candidateEvaluations.map((entry) => entry.skill.hash),
  evaluationRef: {
    kind: "slice178_isolated_candidate_comparison",
    hash: hash(arenaComparisons),
  },
});
const candidateAcceptedRoutes = candidateEvaluations.map((entry) => {
  const direction = entry.skill.skillId.includes("terran_armed_forces-to")
    ? "terran_to_zerg" : "zerg_to_terran";
  const [ownFaction, opponentFaction] = routeForDirection(direction);
  return registry.readAcceptedRoute({
    ownFaction,
    opponentFaction,
    roomBinding: roomBinding(pack.manifest.sourceBinding, `candidate-${direction}`),
  });
});
ensure(candidateAcceptedRoutes.every((route) =>
  candidates.some((candidate) => candidate.hash === route.skillRefs.at(-1).hash)),
"SKILLOPT_ISOLATED_ACCEPTANCE_FAILED");
const rollback = registry.rollback({
  expectedRuntimeRevision: isolatedAcceptance.runtimeRevision,
  targetRuntimeRevision: baseAcceptance.runtimeRevision,
  rollbackRef: {
    kind: "slice178_non_live_rollback_probe",
    hash: hash(candidateAcceptedRoutes.map((route) => route.snapshotHash)),
  },
});
const finalRegistryState = registry.state();
const baseHashes = pack.entries.map((entry) => entry.skill.hash).sort();
ensure(hash(finalRegistryState.activeSkillHashes) === hash(baseHashes)
  && rollback.rollbackCreatedNewRevision === true
  && finalRegistryState.runtimeRevision === 3,
"SKILLOPT_ACCEPTED_PARENT_ROLLBACK_FAILED");

await mkdir(path.join(OUTPUT, "candidates"), { recursive: true });
await mkdir(path.join(OUTPUT, "case-results"), { recursive: true });
for (const entry of [...candidateEvaluations, ...negativeEvaluations]) {
  const filename = `${entry.skill.skillId}.${entry.skill.version}`
    .replaceAll("/", "_");
  await writeFile(path.join(OUTPUT, "candidates", `${filename}.json`),
    `${JSON.stringify(entry.skill, null, 2)}\n`, { mode: 0o600 });
  await writeFile(path.join(OUTPUT, "case-results", `${filename}.json`),
    `${JSON.stringify({ summary: entry.summary, results: entry.results }, null, 2)}\n`,
    { mode: 0o600 });
}
await writeFile(path.join(OUTPUT, "independent-heldout-corpus.json"),
  `${JSON.stringify(independentCorpus, null, 2)}\n`, { mode: 0o600 });

const promotionRecords = candidateEvaluations.map((entry) => seal({
  schema: "starcraft_tmg_skillopt_promotion_record_v1",
  candidateSkillId: entry.skill.skillId,
  candidateSkillHash: entry.skill.hash,
  parentSkillHash: entry.skill.evolution.parentSkillRef.hash,
  evaluationHash: entry.summary.hash,
  arenaComparisonHash: arenaComparisons.find((comparison) =>
    comparison.direction === (entry.skill.skillId.includes("terran_armed_forces-to")
      ? "terran_to_zerg" : "zerg_to_terran")).hash,
  status: "promotable_manual_approval_required",
  criticalHighFindings: [],
  nonBlockingFindings: clone(entry.summary.nonBlockingFindings),
  automaticPromotion: false,
  currentlyLive: false,
  rollbackTargetRuntimeRevision: baseAcceptance.runtimeRevision,
  runtimeAccepted: false,
  eligibleForTraining: false,
  trainingTruth: false,
}));
await writeFile(path.join(OUTPUT, "promotion-records.json"),
  `${JSON.stringify(promotionRecords, null, 2)}\n`, { mode: 0o600 });

const report = seal({
  schema: "ticket18_slice178_skillopt_upgrade_regression_report_v1",
  ticket: 18,
  slice: 178,
  status: "passed",
  predecessorArenaReportHash: slice176.hash,
  predecessorSkillOptReportHash: slice177.hash,
  foundationalPackHash: pack.manifest.hash,
  compiledCandidateSkillHashes: candidates.map((candidate) => candidate.hash),
  negativeControlSkillHashes: negativeControls.map((candidate) => candidate.hash),
  historicalFailureRegression: {
    caseId: historicalFailure.caseId,
    resultHash: historicalFailure.hash,
    priorPreferencePassed: historicalFailure.grade.decisionPreferencePassed,
    retainedAsRegressionInput: true,
  },
  originalRegressionCases: originalCorpus.cases.length,
  independentHeldoutCases: independentCorpus.cases.length,
  independentStateAndFamilyHashes: true,
  rulesExecutedBranches: regressionCases.reduce((count, entry) =>
    count + entry.evaluation.outcomes.length, 0),
  candidateEvaluations: candidateEvaluations.map((entry) => ({
    skillId: entry.skill.skillId,
    skillHash: entry.skill.hash,
    evaluationHash: entry.summary.hash,
    passedCases: entry.summary.passedCases,
    totalCases: entry.summary.totalCases,
    status: entry.summary.status,
  })),
  negativeControlEvaluations: negativeEvaluations.map((entry) => ({
    skillId: entry.skill.skillId,
    skillHash: entry.skill.hash,
    evaluationHash: entry.summary.hash,
    passedCases: entry.summary.passedCases,
    failedCases: entry.summary.failedCases,
    status: entry.summary.status,
  })),
  arenaComparisonHashes: arenaComparisons.map((entry) => entry.hash),
  promotionRecordHashes: promotionRecords.map((entry) => entry.hash),
  isolatedRegistry: {
    candidateRegistrationHash: candidateRegistration.hash,
    baseRuntimeRevision: baseAcceptance.runtimeRevision,
    candidateProbeRuntimeRevision: isolatedAcceptance.runtimeRevision,
    rollbackRuntimeRevision: rollback.runtimeRevision,
    activeParentHashesRestored: true,
    negativeControlsEverAccepted: false,
  },
  onlyCriticalHighBlockIntegration: true,
  candidateCriticalHighFindings: 0,
  candidateNonBlockingMediumFindings: candidateEvaluations.reduce((count, entry) =>
    count + entry.summary.nonBlockingFindings.length, 0),
  automaticPromotion: false,
  silentLiveReplacement: false,
  harnessLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  promptPackRoutes: [
    "accepted_parent_route",
    "skillopt_candidate_route",
    "fixed_actor_negative_control_route",
  ],
  harnessToolsCalled: [
    "read_strategy_skills",
    "read_viewer_state",
    "read_legal_space",
    "preview",
    "confirm",
    "apply",
    "replay",
    "read_skillopt_evaluation",
  ],
  uiTraceEvidence: arenaComparisons.map((entry) => ({
    direction: entry.direction,
    candidateSnapshotHash: entry.candidateSnapshotHash,
    negativeControlSnapshotHash: entry.negativeControlSnapshotHash,
    visualTraceProduced: false,
    reason: "Slice178 evaluates Rules transitions and registry routes; Slice176 owns rendered Room traces.",
  })),
  agentDecisionEvidence: candidateEvaluations.flatMap((entry) =>
    entry.results.map((result) => ({
      skillHash: entry.skill.hash,
      caseId: result.caseId,
      caseResultHash: result.hash,
      passed: result.passed,
    }))),
  memoryTraceEvidence: {
    writesPerformed: 0,
    candidatesPromotedToMemory: false,
  },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: {
    acceptedParentsRemainLiveAfterProbe: true,
    criticalOrHighFindingQuarantinesCandidate: true,
    mediumFindingTrackedWithoutBlocking: true,
    manualPublicationRequired: true,
    rollbackCreatesNewRuntimeRevision: true,
  },
  userVisibleChecks: [
    "Two complete SkillOpt candidate versions are inspectable beside their accepted parents.",
    "A fixed-first-actor negative control fails one independent held-out case per direction and remains quarantined.",
    "Exact-hash arena routing compares parent, candidate, and negative control without latest-version guessing.",
    "The isolated candidate acceptance is rolled back to the five accepted parent hashes; no live publication occurs.",
  ],
  limitations: [
    "All evaluation positions are Rules-executed synthetic single-transition fixtures, not complete games.",
    "The bounded deterministic decision consumer proves gate discrimination and non-regression, not model win-rate improvement.",
    "Only opening_branches is exercised; four matchup axes remain unproven and are Medium non-blocking findings.",
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
  candidateSkills: report.compiledCandidateSkillHashes.length,
  independentHeldoutCases: report.independentHeldoutCases,
  negativeControlsQuarantined: report.negativeControlEvaluations.every((entry) =>
    entry.status === "quarantined_regression"),
  acceptedParentsRestored:
    report.isolatedRegistry.activeParentHashesRestored,
  modelCalls: report.modelCalls,
}, null, 2));
