import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOfficialExecutableRuleRuntimeV1 } from
  "../../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID,
} from
  "../../packages/rule-atoms/official-marine-multi-model-stimpack-active-executor-v3.mjs";
import { getOfficialCurrentProductRecord } from
  "../../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialMarineMultiEnemyCasualtyFixtureV2 } from
  "./official-marine-multi-enemy-casualty-fixture-v2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(HERE, "..", "..", "build", "ticket-11-rule-atoms-v1");

function action(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...result
  } = candidate;
  return result;
}

export async function createOfficialMarineMultiEnemyStimpackCasualtyFixtureV3(
  input = {},
) {
  const previousReport = JSON.parse(await readFile(path.join(
    OUTPUT_DIR,
    "official-marine-multi-enemy-casualty-v4-report.json",
  ), "utf8"));
  const previousRuntime = createOfficialExecutableRuleRuntimeV1({
    catalogue: previousReport.slice.catalogue,
  });
  const fixture = await createOfficialMarineMultiEnemyCasualtyFixtureV2({
    attackerSideKey: input.attackerSideKey || "player1",
    attackerUpgradeNames: input.attackerUpgradeNames || ["Bayonet", "Stimpack"],
  });
  const resource = getOfficialCurrentProductRecord(
    fixture.dataset,
    "tactical_cards:terran_armed_forces",
  );
  fixture.state.phase = "movement";
  fixture.state.phaseFirstActorByRound["2:movement"] = {
    round: 2,
    phase: "movement",
    markerHolderSideKey: fixture.attackerSideKey,
    chosenFirstActorSideKey: fixture.attackerSideKey,
  };
  fixture.state.cardResources[fixture.attackerSideKey] = [{
    id: `${fixture.attackerSideKey}-terran-armed-forces`,
    sideKey: fixture.attackerSideKey,
    officialCardRecordKey: "tactical_cards:terran_armed_forces",
    cardKind: "faction",
    sourceRecordHash: resource.sourceRecordHash,
    resource: 1,
    resourceType: "CP",
    readiness: "ready",
    face: "up",
    activeEffects: [],
  }];
  const coEngager = structuredClone(fixture.state.pieces.find((piece) => (
    piece.id === fixture.coEngagerPieceId
  )));
  fixture.state.pieces = fixture.state.pieces.filter((piece) => (
    piece.id !== fixture.coEngagerPieceId
  ));
  const previousBinding = fixture.createMatchBinding(previousRuntime.descriptor.runtimeHash);
  const activeCandidate = previousRuntime.enumerate(fixture.state, {
    sideKey: fixture.attackerSideKey,
    matchBinding: previousBinding,
  }).candidates.find((candidate) => (
    candidate.executorId === OFFICIAL_MARINE_MULTI_MODEL_STIMPACK_ACTIVE_EXECUTOR_ID
      && candidate.abilityWindow === "before_action"
      && candidate.pieceId === fixture.attackerPieceId
  ));
  if (!activeCandidate) throw new Error("MULTI_ENEMY_STIMPACK_FIXTURE_ACTIVE_MISSING");
  const activated = previousRuntime.apply(
    fixture.state,
    action(activeCandidate),
    { matchBinding: previousBinding },
  );
  const state = structuredClone(activated.state);
  state.pieces.splice(1, 0, coEngager);
  state.phase = "combat";
  state.activeSideKey = fixture.attackerSideKey;
  state.firstPlayerSideKey = fixture.attackerSideKey;
  state.phaseFirstActorByRound["2:combat"] = {
    round: 2,
    phase: "combat",
    markerHolderSideKey: fixture.attackerSideKey,
    chosenFirstActorSideKey: fixture.attackerSideKey,
  };
  state.players.player1.passedPhases = {};
  state.players.player2.passedPhases = {};
  state.pieces.forEach((piece) => { piece.activatedPhases.combat = false; });
  delete state.pendingAction;
  return {
    ...fixture,
    state,
    activationTransition: activated,
    previousRuntimeHash: previousRuntime.descriptor.runtimeHash,
    previousCatalogueHash: previousRuntime.descriptor.catalogueHash,
  };
}
