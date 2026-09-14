import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../source-data/official-command-center-adapter-v1.mjs";

export const OFFICIAL_STANDARD_ACTION_ROUTE_CATALOGUE_SCHEMA =
  "starcraft_tmg_official_standard_action_route_catalogue_v1";
export const OFFICIAL_STANDARD_ACTION_ROUTE_CATALOGUE_VERSION = "1.0.0";

const PHASES = new Set(["any", "movement", "assault", "combat"]);
const BOUNDED_FEATURE_ROUTES = new Map([
  ["army_units:marine", new Map([
    ["Stimpack", "authority.marine-multi-model-stimpack-active-v3"],
    ["C-14 rifle", "authority.stimpack-ranged-consumer-v2"],
    ["AGG-12", "authority.specialist-ranged-batch-v2"],
    ["Rocket Launcher", "authority.specialist-ranged-batch-v2"],
    ["Slugthrower", "authority.specialist-ranged-batch-v2"],
    ["Grenades - Frag", "authority.specialist-ranged-batch-v2"],
    ["Strike", "authority.marine-multi-model-stimpack-close-combat-v2"],
    ["Bayonet", "authority.marine-multi-model-stimpack-close-combat-v2"],
  ])],
  ["army_units:goliath", new Map([
    ["Underbelly Machine Gun", "authority.sidearm-pinpoint-ranged-batch-v2"],
    ["Scatter Missiles", "authority.goliath-scatter-ranged-batch-v2"],
    ["Haywire Missiles", "authority.sidearm-pinpoint-ranged-batch-v2"],
    ["Devastating Charge", "authority.goliath-charge-v1"],
  ])],
  ["army_units:medic", new Map([
    ["Life Support", "authority.medic-life-support-reaction-v2"],
    ["Restoration", "authority.medic-restoration-reaction-v2"],
    ["Stabilizer Medpacks", "authority.medic-medpack-active-v2"],
    ["Medpack", "authority.medic-medpack-active-v2"],
    ["Optical Flare", "authority.academy-medic-ability-v2"],
  ])],
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function normalizedName(value) {
  return String(value || "").trim().replace(/\s+/gu, " ").toLowerCase();
}
function phaseKind(value) {
  const phase = String(value || "any").toLowerCase();
  if (phase.includes("movement")) return "movement";
  if (phase.includes("assault")) return "assault";
  if (phase.includes("combat")) return "combat";
  return "any";
}
function activationKind(feature) {
  const activation = String(feature?.activation || "").toLowerCase();
  const description = String(feature?.description || "").trim();
  if (/^range\s*:/iu.test(description)) return "weapon";
  if (activation.includes("reaction")) return "reaction";
  if (activation.includes("active")) return "active";
  if (activation.includes("passive")) return "passive";
  return "unclassified";
}
function speedProfile(payload, modelCount) {
  const sourceValue = String(payload?.stats?.speed || "").trim();
  const values = [...sourceValue.matchAll(/\d+(?:\.\d+)?/gu)]
    .map((match) => Number(match[0]));
  if (values.length < 1 || values.some((value) => !Number.isFinite(value) || value <= 0)) {
    fail("STANDARD_ACTION_ROUTE_SPEED_INVALID", sourceValue);
  }
  const multiModelSpeedInches = values[0];
  const singleModelSpeedInches = values[1] ?? values[0];
  return {
    sourceValue,
    multiModelSpeedInches,
    singleModelSpeedInches,
    currentDeploySpeedInches: modelCount > 1
      ? multiModelSpeedInches : singleModelSpeedInches,
  };
}
function fieldedFeature(piece, feature) {
  const equipmentNames = new Set((piece.equipment || []).map((entry) => (
    normalizedName(entry.equipmentName || entry.name)
  )).filter(Boolean));
  const selectedNames = new Set((piece.selectedUpgradeNames || []).map(normalizedName));
  const featureName = normalizedName(feature?.name);
  const kind = activationKind(feature);
  const cost = piece.compositionKind === "large"
    ? Number(feature?.costL || 0) : Number(feature?.costS || 0);
  if (equipmentNames.has(featureName)) return true;
  if (kind === "weapon") return false;
  return cost === 0 || selectedNames.has(featureName);
}
function boundedRoute(recordKey, featureName) {
  const routes = BOUNDED_FEATURE_ROUTES.get(recordKey);
  if (!routes) return null;
  const target = normalizedName(featureName);
  return [...routes.entries()].find(([name]) => normalizedName(name) === target)?.[1]
    || null;
}
function coreRoutes(piece) {
  const recordKey = piece.officialUnitRecordKey;
  const bounded = recordKey === "army_units:marine";
  return [
    {
      routeId: `${piece.id}:core:deploy`, pieceId: piece.id,
      sourceKind: "core_action", featureName: "Deploy", phase: "movement",
      activationKind: "action", routeStatus: "executable_exact",
      executorId: "authority.reserve-deploy-v5", executorVersion: "5.0.0",
      adapterId: "official-standard-reserve-deploy-adapter-v1",
      reasonCode: null,
    },
    ...["Move", "Run", "Charge", "Fight"].map((featureName) => {
      const phase = featureName === "Move" ? "movement"
        : featureName === "Fight" ? "combat" : "assault";
      const knownBounded = bounded || (recordKey === "army_units:goliath"
        && featureName === "Charge");
      return {
        routeId: `${piece.id}:core:${featureName.toLowerCase()}`,
        pieceId: piece.id, sourceKind: "core_action", featureName, phase,
        activationKind: "action",
        routeStatus: knownBounded
          ? "existing_bounded_runtime" : "unsupported_explicit",
        executorId: null,
        executorSelector: knownBounded ? "catalogue_runtime_selected_at_state" : null,
        executorVersion: null, adapterId: null,
        reasonCode: knownBounded ? "EXISTING_SUBSET_REQUIRES_STATE_GATE"
          : "OFFICIAL_UNIT_ACTION_ROUTE_NOT_IMPLEMENTED",
      };
    }),
  ];
}

export function createOfficialStandardActionRouteCatalogueV1(input = {}) {
  const { dataset, state } = input;
  if (!object(dataset) || !object(state) || !Array.isArray(state.pieces)) {
    fail("STANDARD_ACTION_ROUTE_INPUT_INVALID");
  }
  const units = state.pieces.map((piece) => {
    const record = getOfficialCurrentProductRecord(dataset, piece.officialUnitRecordKey);
    if (piece.sourceRecordHash !== record.sourceRecordHash
      || piece.officialPayloadHash !== record.payloadHash) {
      fail("STANDARD_ACTION_ROUTE_SOURCE_DRIFT", String(piece.id || ""));
    }
    const fielded = (record.payload.upgrades || []).filter((feature) => (
      fieldedFeature(piece, feature)
    )).map((feature, index) => {
      const featureName = String(feature?.name || "").trim();
      const existingExecutorId = boundedRoute(record.recordKey, featureName);
      const sourceFeatureHash = hashStarcraftTmgContract({
        recordKey: record.recordKey, sourceRecordHash: record.sourceRecordHash,
        payloadHash: record.payloadHash, index, feature,
      });
      return {
        routeId: `${piece.id}:card:${sourceFeatureHash.slice(0, 16)}`,
        pieceId: piece.id, sourceKind: "official_card_feature",
        featureName, phase: phaseKind(feature.phase),
        activationKind: activationKind(feature), sourceFeatureHash,
        routeStatus: existingExecutorId
          ? "existing_bounded_runtime" : "unsupported_explicit",
        executorId: existingExecutorId, executorVersion: null, adapterId: null,
        reasonCode: existingExecutorId ? "EXISTING_SUBSET_REQUIRES_STATE_GATE"
          : "OFFICIAL_CARD_FEATURE_ROUTE_NOT_IMPLEMENTED",
      };
    });
    const squadron = fielded.some((entry) => entry.featureName === "Squadron");
    const routes = [...coreRoutes(piece), ...fielded]
      .sort((left, right) => left.routeId.localeCompare(right.routeId));
    const body = {
      pieceId: piece.id, sideKey: piece.sideKey,
      recordKey: record.recordKey, unitName: String(record.payload.name || piece.name),
      sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
      modelCount: Number(piece.currentModels),
      movementProfile: {
        ...speedProfile(record.payload, Number(piece.currentModels)),
        horizontalCoherencyInches: squadron ? 4 : 3,
        horizontalCoherencySource: squadron
          ? "fielded_official_squadron_feature" : "core_rule_4_4",
      },
      routes,
      allFieldedFeaturesAccounted: true,
      trainingTruth: false,
    };
    return { ...body, unitRouteHash: hashStarcraftTmgContract(body) };
  }).sort((left, right) => left.pieceId.localeCompare(right.pieceId));
  const routes = units.flatMap((unit) => unit.routes);
  const body = {
    schema: OFFICIAL_STANDARD_ACTION_ROUTE_CATALOGUE_SCHEMA,
    version: OFFICIAL_STANDARD_ACTION_ROUTE_CATALOGUE_VERSION,
    sourceSnapshotHash: dataset.sourceSnapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    unitCount: units.length, routeCount: routes.length,
    routeStatusCounts: Object.fromEntries([
      "executable_exact", "existing_bounded_runtime", "unsupported_explicit",
    ].map((status) => [status, routes.filter((route) => (
      route.routeStatus === status)).length])),
    units,
    routeDenominatorComplete: true,
    unsupportedRoutesAreObservableAndNonExecutable: true,
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    productionRoomEligible: false,
    rulesTruth: "official_standard_roster_fielded_action_route_accounting",
    trainingTruth: false,
  };
  const catalogue = deepFreeze({ ...body,
    catalogueHash: hashStarcraftTmgContract(body) });
  verifyOfficialStandardActionRouteCatalogueV1(catalogue);
  return catalogue;
}

export function verifyOfficialStandardActionRouteCatalogueV1(catalogue) {
  if (!object(catalogue)
    || catalogue.schema !== OFFICIAL_STANDARD_ACTION_ROUTE_CATALOGUE_SCHEMA
    || catalogue.version !== OFFICIAL_STANDARD_ACTION_ROUTE_CATALOGUE_VERSION
    || catalogue.catalogueHash !== hashStarcraftTmgContract(
      without(catalogue, ["catalogueHash"]))
    || !Number.isSafeInteger(catalogue.unitCount) || catalogue.unitCount < 1
    || !Array.isArray(catalogue.units) || catalogue.units.length !== catalogue.unitCount
    || catalogue.routeDenominatorComplete !== true
    || catalogue.unsupportedRoutesAreObservableAndNonExecutable !== true
    || catalogue.sourceRefreshPerformed !== false
    || catalogue.repositoryFallbackUsed !== false
    || catalogue.productionRoomEligible !== false
    || catalogue.trainingTruth !== false) {
    fail("STANDARD_ACTION_ROUTE_CATALOGUE_INVALID");
  }
  const routes = catalogue.units.flatMap((unit) => unit.routes || []);
  const observedStatusCounts = Object.fromEntries([
    "executable_exact", "existing_bounded_runtime", "unsupported_explicit",
  ].map((status) => [status, routes.filter((route) => (
    route.routeStatus === status)).length]));
  if (routes.length !== catalogue.routeCount
    || new Set(routes.map((route) => route.routeId)).size !== routes.length
    || hashStarcraftTmgContract(observedStatusCounts)
      !== hashStarcraftTmgContract(catalogue.routeStatusCounts)
    || routes.some((route) => !PHASES.has(route.phase)
      || !["executable_exact", "existing_bounded_runtime", "unsupported_explicit"]
        .includes(route.routeStatus)
      || (route.routeStatus === "unsupported_explicit"
        && (route.executorId !== null || route.adapterId !== null)))
    || catalogue.units.some((unit) => unit.allFieldedFeaturesAccounted !== true
      || unit.trainingTruth !== false
      || unit.unitRouteHash !== hashStarcraftTmgContract(
        without(unit, ["unitRouteHash"])))
    || catalogue.units.some((unit) => !unit.routes.some((route) => (
      route.featureName === "Deploy"
        && route.routeStatus === "executable_exact"
        && route.executorId === "authority.reserve-deploy-v5"
        && route.adapterId === "official-standard-reserve-deploy-adapter-v1"
    )))) {
    fail("STANDARD_ACTION_ROUTE_DENOMINATOR_INVALID");
  }
  return true;
}

export function listOfficialUnsupportedActionRoutesV1(catalogue, input = {}) {
  verifyOfficialStandardActionRouteCatalogueV1(catalogue);
  const sideKey = String(input.sideKey || "");
  const phase = String(input.phase || "");
  return catalogue.units.filter((unit) => !sideKey || unit.sideKey === sideKey)
    .flatMap((unit) => unit.routes.map((route) => ({ unit, route })))
    .filter(({ route }) => route.routeStatus === "unsupported_explicit"
      && (!phase || route.phase === "any" || route.phase === phase))
    .map(({ unit, route }) => deepFreeze({
      schema: "starcraft_tmg_official_unsupported_action_diagnostic_v1",
      action: {
        actionType: "official_feature_unavailable", sideKey: unit.sideKey,
        phase: route.phase, pieceId: unit.pieceId, abilityName: route.featureName,
      },
      disabledReason: route.reasonCode,
      details: {
        routeId: route.routeId, routeStatus: route.routeStatus,
        sourceKind: route.sourceKind, activationKind: route.activationKind,
        sourceFeatureHash: route.sourceFeatureHash || null,
        officialUnitRecordKey: unit.recordKey,
        remediationOwner: "ticket_23_post_slice_220_rule_executor_expansion",
        trainingTruth: false,
      },
    }));
}
