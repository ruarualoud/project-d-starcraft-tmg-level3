import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgSpatialPlayerPlanningCaseSuiteV1 } from
  "./spatial-player-planning-case-suite-v1.mjs";
import { createStarcraftTmgSpatialPlayerPlanningCaseSuiteBV1 } from
  "./spatial-player-planning-case-suite-b-v1.mjs";

export const STARCRAFT_TMG_SPATIAL_PLAYER_PLANNING_CASE_CATALOGUE_VERSION =
  "starcraft_tmg_spatial_player_planning_case_catalogue_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return deepFreeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

export function createStarcraftTmgSpatialPlayerPlanningCaseCatalogueV1(
  options = {}) {
  const suites = [
    createStarcraftTmgSpatialPlayerPlanningCaseSuiteV1(options),
    createStarcraftTmgSpatialPlayerPlanningCaseSuiteBV1(options),
  ];
  const manifests = suites.map((suite) => suite.manifest());
  const route = new Map();
  manifests.forEach((manifest, suiteIndex) => manifest.cases.forEach((entry) => {
    if (route.has(entry.caseId)) {
      throw new TypeError(`duplicate spatial planning case: ${entry.caseId}`);
    }
    route.set(entry.caseId, suiteIndex);
  }));
  const familyCounts = {};
  for (const manifest of manifests) {
    for (const [familyId, counts] of Object.entries(manifest.familyCounts)) {
      familyCounts[familyId] = clone(counts);
    }
  }
  if (route.size !== 24 || Object.keys(familyCounts).length !== 6
    || Object.values(familyCounts).some((counts) =>
      counts.development !== 2 || counts.heldout !== 2)) {
    throw new TypeError("the 24-case spatial planning catalogue is incomplete");
  }

  function suiteFor(caseId) {
    const suiteIndex = route.get(String(caseId || ""));
    if (suiteIndex === undefined) {
      throw new TypeError("spatial planning case is unavailable");
    }
    return suites[suiteIndex];
  }

  function project(input = {}) {
    return suiteFor(input.caseId).project(input);
  }

  function evaluate(input = {}) {
    return suiteFor(input.caseId).evaluate(input);
  }

  function manifest() {
    return seal({
      schemaVersion:
        `${STARCRAFT_TMG_SPATIAL_PLAYER_PLANNING_CASE_CATALOGUE_VERSION}.manifest`,
      sourceBinding: clone(manifests[0].sourceBinding),
      caseCount: route.size,
      developmentCases: manifests.reduce((total, manifest) => total
        + manifest.cases.filter((entry) => entry.split === "development").length, 0),
      heldoutCases: manifests.reduce((total, manifest) => total
        + manifest.cases.filter((entry) => entry.split === "heldout").length, 0),
      familyCounts,
      suiteRefs: manifests.map((entry) => ({
        manifestHash: entry.manifestHash,
        caseCount: entry.caseCount,
      })),
      cases: manifests.flatMap((entry) => clone(entry.cases)),
      heldoutOracleExcludedFromProject: true,
      realProviderRuns: 0,
      fullMatchEvidence: false,
      trainingTruth: false,
    }, "catalogueHash");
  }

  return Object.freeze({
    metadata: Object.freeze({
      schemaVersion:
        `${STARCRAFT_TMG_SPATIAL_PLAYER_PLANNING_CASE_CATALOGUE_VERSION}.metadata`,
      interface: ["project", "evaluate", "manifest"],
      cases: 24,
      families: 6,
      oracleIsolation: "server_side_evaluator_not_agent_projection",
      mutationAuthority: false,
      trainingTruth: false,
    }),
    project,
    evaluate,
    manifest,
  });
}

