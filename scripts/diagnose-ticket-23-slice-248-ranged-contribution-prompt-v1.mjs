#!/usr/bin/env node

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { projectStarcraftTmgPlanningActionSpaceForPromptV1 } from
  "../packages/online-agent-session/live-flash-decision-port-v1.mjs";
import { projectStarcraftTmgSpatialParameterDomainsV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_RUN = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1/20260916223306152");

function ensure(condition, code) {
  if (!condition) throw new Error(code);
}

function loadChoice(runDirectory) {
  const database = new DatabaseSync(path.join(runDirectory,
    "seats/player1/provider/live-decisions.sqlite"), { readOnly: true });
  try {
    const row = database.prepare(`
      SELECT record_json
        FROM sc_live_decision_records
       ORDER BY updated_at DESC
       LIMIT 1
    `).get();
    const record = JSON.parse(String(row?.record_json || "{}"));
    return Object.values(record.decisions || {}).find((entry) =>
      entry?.authority?.stateRevision === 32);
  } finally {
    database.close();
  }
}

function main() {
  const runDirectory = path.resolve(process.argv[2] || DEFAULT_RUN);
  const choice = loadChoice(runDirectory);
  ensure(choice, "DIAGNOSIS_REVISION_32_CHOICE_MISSING");
  const sourceDomains = choice.actionIndex.filter((entry) =>
    entry.kind === "parameterized").map((entry) => {
    const domain = structuredClone(entry.action);
    if (domain.pieceId !== "player1-marine-1"
      || domain.actionType !== "ranged_attack") return domain;
    const firstLayout = domain.constraints?.targetPlans?.[0]?.chance?.layout || {};
    if (firstLayout.hit === 4 && firstLayout.surge === 0) {
      domain.profileKey = "army_units:marine::assault::Rocket Launcher";
      domain.weaponName = "Rocket Launcher";
    } else if (firstLayout.hit === 2 && firstLayout.surge === 1) {
      domain.profileKey = "army_units:marine::assault::AGG-12";
      domain.weaponName = "AGG-12";
    }
    return domain;
  });
  const actionSpace = {
    authority: choice.authority,
    finiteActions: choice.actionIndex.filter((entry) =>
      entry.kind === "finite").map((entry) => ({
      candidateId: entry.id,
      action: entry.action,
    })),
    parameterDomains: projectStarcraftTmgSpatialParameterDomainsV1({
      parameterDomains: sourceDomains,
    }),
  };
  const modelIds = Array.from({ length: 9 }, (_, index) =>
    `player1-marine-1-model-${index + 1}`);
  const projected = projectStarcraftTmgPlanningActionSpaceForPromptV1(
    actionSpace, { units: [{
      unitId: "player1-marine-1",
      currentModels: 9,
      modelIds,
    }] },
  );
  const overview = (projected.rangedContributionOverview || []).find((entry) =>
    entry.pieceId === "player1-marine-1"
      && entry.targetUnitId === "player2-swarmling");
  ensure(overview, "RANGED_CONTRIBUTION_OVERVIEW_MISSING");
  ensure(overview.currentLiveModelCount === 9,
    "RANGED_CONTRIBUTION_LIVE_COUNT_WRONG");
  ensure(overview.contributingModelCount === 2,
    "RANGED_CONTRIBUTION_ATTACKER_COUNT_WRONG");
  ensure(overview.nonContributingModelCount === 7,
    "RANGED_CONTRIBUTION_NON_ATTACKER_COUNT_WRONG");
  ensure(overview.totalCurrentHitDice === 6,
    "RANGED_CONTRIBUTION_HIT_DICE_WRONG");
  ensure(overview.weaponBatches.some((entry) =>
    entry.weaponName === "Rocket Launcher"
      && entry.eligibleAttackerModelCount === 1
      && entry.currentHitDice === 4),
  "RANGED_CONTRIBUTION_ROCKET_BATCH_MISSING");
  ensure(overview.weaponBatches.some((entry) =>
    entry.weaponName === "AGG-12"
      && entry.eligibleAttackerModelCount === 1
      && entry.currentHitDice === 2),
  "RANGED_CONTRIBUTION_AGG12_BATCH_MISSING");
  process.stdout.write(`${JSON.stringify({
    schemaVersion:
      "ticket23_slice248_ranged_contribution_prompt_diagnosis_v1",
    stateRevision: choice.authority.stateRevision,
    pieceId: overview.pieceId,
    targetUnitId: overview.targetUnitId,
    currentLiveModelCount: overview.currentLiveModelCount,
    contributingModelCount: overview.contributingModelCount,
    nonContributingModelCount: overview.nonContributingModelCount,
    totalCurrentHitDice: overview.totalCurrentHitDice,
    weaponBatches: overview.weaponBatches,
    providerCalls: 0,
    roomMutationCount: 0,
    trainingTruth: false,
  }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${JSON.stringify({
    code: String(error?.code || error?.message || error),
    message: String(error?.message || error),
  })}\n`);
  process.exitCode = 1;
}
