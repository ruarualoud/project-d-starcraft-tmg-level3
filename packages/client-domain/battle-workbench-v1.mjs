import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";
import { projectStarcraftTmgThreatWorkbenchV1 } from "./battle-workbench-threat-v1.mjs";
import { projectStarcraftTmgProbabilityWorkbenchV1 } from "./battle-workbench-probability-v1.mjs";
import { projectStarcraftTmgWritePaletteV1 } from "./battle-workbench-write-palette-v1.mjs";

export const STARCRAFT_TMG_BATTLE_WORKBENCH_VERSION =
  "starcraft_tmg_battle_workbench_snapshot_v1";

const COVERAGE = new Set(["exact", "partial", "unknown", "quarantined", "not_loaded"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value) {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : null;
}

function rows(value) {
  return Array.isArray(value) ? value.filter(object) : [];
}

function stringRows(value) {
  return Array.isArray(value)
    ? value.map((entry) => text(object(entry) ? entry.name ?? entry.id ?? entry.effect : entry))
      .filter(Boolean)
    : [];
}

function tokenRows(value) {
  const entries = Array.isArray(value) ? stringRows(value) : [text(value)].filter(Boolean);
  return [...new Set(entries.flatMap((entry) => entry.split(",").map((token) => token.trim()).filter(Boolean)))];
}

function weaponRows(piece) {
  return rows(piece.weapons).map((weapon, index) => ({
    id: text(weapon.id) || `${text(piece.id) || "piece"}:weapon:${index + 1}`,
    name: text(weapon.name ?? weapon.weaponName) || `Weapon ${index + 1}`,
    range: weapon.range ?? null,
    roa: weapon.roa ?? null,
    hit: weapon.hit ?? null,
    dmg: weapon.dmg ?? null,
    surge: weapon.surge ?? null,
    target: weapon.target ?? null,
    keywords: weapon.keywords ?? null,
    sourceUpgradeName: text(weapon.sourceUpgradeName) || null,
  }));
}

function upgradeRows(piece) {
  const selectedNames = new Set([
    ...stringRows(piece.selectedUpgradeNames),
    ...rows(piece.selectedUpgrades).map((entry) => text(entry.name)).filter(Boolean),
  ]);
  return rows(piece.upgrades).map((upgrade, index) => ({
    id: text(upgrade.id) || `${text(piece.id) || "piece"}:upgrade:${index + 1}`,
    name: text(upgrade.name) || `Upgrade ${index + 1}`,
    selected: selectedNames.has(text(upgrade.name)),
    costSmall: number(upgrade.costS),
    costLarge: number(upgrade.costL),
    specialist: upgrade.specialist === true || text(upgrade.compositionKind) === "specialist",
    description: text(upgrade.description ?? upgrade.text ?? upgrade.rulesText) || null,
  }));
}

function modelRows(piece) {
  const explicit = rows(piece.models);
  if (explicit.length) return explicit.map((model, index) => ({
    id: text(model.id) || `${text(piece.id)}:model:${index + 1}`,
    isOnField: model.isOnField !== false && model.isRemoved !== true,
    isDestroyed: model.isDestroyed === true || model.isRemoved === true,
    xInches: number(model.xInches),
    yInches: number(model.yInches),
    damage: number(model.damage ?? model.damageMarker) ?? 0,
    remainingWounds: number(model.remainingWounds),
    statuses: stringRows(model.statuses),
  }));
  const count = Math.max(0, Math.trunc(number(piece.currentModels) ?? 0));
  return Array.from({ length: count }, (_, index) => ({
    id: `${text(piece.id)}:aggregate-model:${index + 1}`,
    isOnField: piece.isOnField === true || piece.isOnBattlefield === true,
    isDestroyed: piece.isDestroyed === true,
    xInches: index === 0 ? number(piece.xInches) : null,
    yInches: index === 0 ? number(piece.yInches) : null,
    damage: index === 0 ? number(piece.damageMarker ?? piece.damage) ?? 0 : 0,
    remainingWounds: null,
    statuses: index === 0 ? stringRows(piece.statuses) : [],
  }));
}

function locationFor(piece, models) {
  if (piece.isDestroyed === true || (number(piece.currentModels) ?? 1) <= 0) return "destroyed";
  if (piece.isInReserves === true) return "reserve";
  if (piece.isOnField === true || piece.isOnBattlefield === true
    || models.some((model) => model.isOnField && !model.isDestroyed)) return "battlefield";
  return "undeployed";
}

function unitRows(state) {
  return rows(state.pieces).map((piece, index) => {
    const id = text(piece.id) || `piece-${index + 1}`;
    const models = modelRows({ ...piece, id });
    const hpPerModel = number(piece.stats?.hp ?? piece.hp ?? piece.hitPoints);
    const shieldPerModel = number(piece.stats?.shield ?? piece.shield) ?? 0;
    const currentModels = Math.max(0, Math.trunc(number(piece.currentModels) ?? models.length));
    const damage = number(piece.damageMarker ?? piece.damage) ?? 0;
    const totalDurability = hpPerModel === null
      ? null
      : Math.max(0, (hpPerModel + shieldPerModel) * currentModels);
    const location = locationFor(piece, models);
    const weapons = weaponRows(piece);
    return {
      id,
      unitId: text(piece.unitId) || null,
      name: text(piece.name ?? piece.unitName) || id,
      sideKey: text(piece.sideKey ?? piece.controllerSideKey) || "unknown_side",
      faction: text(piece.faction) || null,
      unitType: text(piece.unitType) || null,
      profileSize: text(piece.profileSize) || null,
      armySlotType: text(piece.armySlotType) || null,
      base: {
        shape: text(piece.baseShape) || null,
        widthMm: number(piece.baseWidthMm ?? piece.baseMm),
        depthMm: number(piece.baseDepthMm ?? piece.baseMm),
        source: text(piece.baseSource) || null,
      },
      currentModels,
      maxModels: Math.max(currentModels, Math.trunc(number(piece.maxModels) ?? currentModels)),
      currentSupply: number(piece.currentSupply ?? piece.supply),
      mineralCost: number(piece.mineralCost ?? piece.cost),
      location,
      damage,
      hpPerModel,
      shieldPerModel,
      totalDurability,
      remainingDurability: totalDurability === null ? null : Math.max(0, totalDurability - damage),
      stats: object(piece.stats) ? clone(piece.stats) : {},
      tags: tokenRows(piece.tags),
      keywords: tokenRows(piece.keywords),
      statuses: stringRows(piece.statuses),
      upgrades: upgradeRows(piece),
      selectedUpgrades: rows(piece.selectedUpgrades).map((entry) => clone(entry)),
      weapons,
      abilities: rows(piece.abilities).map((entry) => clone(entry)),
      models,
      inspectionCoverage: hpPerModel === null || weapons.length === 0 ? "partial" : "exact",
    };
  });
}

function scenarioView(state) {
  const board = object(state.board) ? state.board : {};
  const mission = object(state.selectedMission) ? state.selectedMission
    : object(state.mission) ? state.mission : null;
  const deployment = object(state.selectedDeployment) ? state.selectedDeployment : null;
  return {
    mission: mission ? clone(mission) : null,
    deployment: deployment ? clone(deployment) : {
      id: text(board.deploymentId) || null,
      name: text(board.deploymentName) || null,
    },
    map: {
      id: text(board.scenarioMapId) || null,
      name: text(board.scenarioMapName) || null,
      widthInches: number(board.widthInches),
      heightInches: number(board.heightInches),
      terrainCount: rows(board.terrain).length,
      markerCount: rows(board.centerMarkers).length
        + rows(board.markers).length + rows(board.missionMarkers).length,
      tokenCount: rows(board.tokens).length + rows(board.effectMarkers).length,
    },
    round: number(state.round),
    phase: text(state.phase) || null,
    stage: text(state.stage) || null,
    activeSideKey: text(state.activeSideKey) || null,
    omittedRules: Array.isArray(state.omittedRules) ? clone(state.omittedRules) : [],
  };
}

function scoreView(state) {
  const players = object(state.players) ? state.players : {};
  const scoreKeys = new Set([
    ...Object.keys(players),
    ...Object.keys(object(state.scores) ? state.scores : {}),
  ]);
  return [...scoreKeys].sort().map((sideKey) => ({
    sideKey,
    playerName: text(players[sideKey]?.name ?? players[sideKey]?.label) || sideKey,
    faction: text(players[sideKey]?.faction ?? players[sideKey]?.factionName) || null,
    score: number(state.scores?.[sideKey] ?? players[sideKey]?.score) ?? 0,
    commandPoints: number(players[sideKey]?.commandPoints),
    minerals: number(players[sideKey]?.minerals),
    supply: number(players[sideKey]?.supply),
  }));
}

function placeholder(schemaVersion, reason) {
  return { schemaVersion, coverage: "not_loaded", reason, trainingTruth: false };
}

function coverageEntry(status, evidence = []) {
  return { status: COVERAGE.has(status) ? status : "unknown", evidence: [...evidence] };
}

function snapshotCore(input) {
  const projection = object(input.roomProjection) ? input.roomProjection : {};
  const room = object(projection.room) ? projection.room : {};
  const state = object(projection.state) ? projection.state : {};
  const matchBinding = object(projection.matchBinding) ? projection.matchBinding : {};
  const units = unitRows(state);
  const deployment = {
    battlefield: units.filter((unit) => unit.location === "battlefield").map((unit) => unit.id),
    reserve: units.filter((unit) => unit.location === "reserve").map((unit) => unit.id),
    undeployed: units.filter((unit) => unit.location === "undeployed").map((unit) => unit.id),
    destroyed: units.filter((unit) => unit.location === "destroyed").map((unit) => unit.id),
  };
  const unitCoverage = units.length > 0 && units.every((unit) => unit.inspectionCoverage === "exact")
    ? "exact" : units.length > 0 ? "partial" : "unknown";
  const threat = clone(input.threat) || (input.includeThreat === true
    ? projectStarcraftTmgThreatWorkbenchV1({
        roomProjection: projection,
        units,
        legalSpace: input.legalSpace,
      })
    : placeholder("starcraft_tmg_threat_workbench_v1", "slice_138_not_loaded"));
  const probability = clone(input.probability) || (input.includeProbability === true
    ? projectStarcraftTmgProbabilityWorkbenchV1({ roomProjection: projection, units })
    : placeholder("starcraft_tmg_probability_workbench_v1", "slice_139_not_loaded"));
  const writePalette = clone(input.tokenMarkerActions) || (input.includeWritePalette === true
    ? projectStarcraftTmgWritePaletteV1({ legalSpace: input.legalSpace })
    : placeholder("starcraft_tmg_battle_workbench_write_palette_v1", "slice_140_not_loaded"));
  return {
    schemaVersion: STARCRAFT_TMG_BATTLE_WORKBENCH_VERSION,
    roomId: text(room.roomId) || null,
    matchBindingHash: text(matchBinding.bindingHash ?? room.matchBindingHash) || null,
    stateRevision: Number.isSafeInteger(room.stateRevision) ? room.stateRevision : null,
    stateHash: text(room.stateHash) || null,
    viewerSideKey: text(projection.viewer?.seatKey) || null,
    generatedFrom: "viewer_scoped_authoritative_projection",
    scenario: scenarioView(state),
    units,
    deployment,
    scoreboard: scoreView(state),
    threat,
    probability,
    tokenMarkerActions: writePalette,
    writeSheet: clone(writePalette.writeSheet)
      || placeholder("starcraft_tmg_authoritative_battle_write_sheet_v1", "slice_140_not_loaded"),
    scoreForecast: clone(input.scoreForecast)
      || placeholder("starcraft_tmg_score_forecast_v1", "slice_141_not_loaded"),
    rulesQuickView: clone(input.rulesQuickView)
      || placeholder("starcraft_tmg_rules_quick_view_v1", "slice_141_not_loaded"),
    coverage: {
      unit: coverageEntry(unitCoverage, ["viewer_projection.pieces"]),
      scenario: coverageEntry(state.mission || state.selectedMission ? "exact" : "partial", ["viewer_projection.mission", "viewer_projection.board"]),
      deployment: coverageEntry("exact", ["viewer_projection.pieces.location"]),
      score: coverageEntry("exact", ["viewer_projection.scores"]),
      threat: coverageEntry(threat.coverage || "not_loaded", threat.sourceActionRefs || []),
      probability: coverageEntry(probability.coverage || "not_loaded", probability.matrix || []),
      markers: coverageEntry(writePalette.coverage || "not_loaded", [writePalette.paletteHash].filter(Boolean)),
      rules: coverageEntry(input.rulesQuickView?.coverage || "not_loaded"),
    },
    authority: {
      readOnly: true,
      clientMutationAllowed: false,
      legalSpaceHash: text(input.legalSpace?.legalSpaceHash) || null,
      rulesRuntimeBinding: object(input.legalSpace?.rulesRuntimeBinding)
        ? clone(input.legalSpace.rulesRuntimeBinding) : null,
    },
    eligibleForTraining: false,
    trainingTruth: false,
  };
}

export function projectStarcraftTmgBattleWorkbenchV1(input = {}) {
  const core = snapshotCore(input);
  return freeze({ ...core, snapshotHash: hashStarcraftTmgClientContract(core) });
}

export function isStarcraftTmgBattleWorkbenchSnapshotV1(value, expected = {}) {
  if (!object(value) || value.schemaVersion !== STARCRAFT_TMG_BATTLE_WORKBENCH_VERSION
    || typeof value.snapshotHash !== "string" || !/^[a-f0-9]{64}$/u.test(value.snapshotHash)
    || !Array.isArray(value.units) || !object(value.deployment) || !Array.isArray(value.scoreboard)
    || !object(value.scenario) || !object(value.writeSheet)
    || !object(value.scoreForecast) || !object(value.rulesQuickView)
    || !object(value.coverage) || !object(value.authority)
    || value.authority.readOnly !== true || value.authority.clientMutationAllowed !== false
    || value.trainingTruth !== false || value.eligibleForTraining !== false) return false;
  const { snapshotHash, ...core } = value;
  if (hashStarcraftTmgClientContract(core) !== snapshotHash) return false;
  if (expected.roomId && value.roomId !== expected.roomId) return false;
  if (expected.matchBindingHash && value.matchBindingHash !== expected.matchBindingHash) return false;
  if (Number.isSafeInteger(expected.stateRevision)
    && value.stateRevision !== expected.stateRevision) return false;
  if (expected.stateHash && value.stateHash !== expected.stateHash) return false;
  return Object.values(value.coverage).every((entry) => (
    object(entry) && COVERAGE.has(entry.status) && Array.isArray(entry.evidence)
  ));
}
