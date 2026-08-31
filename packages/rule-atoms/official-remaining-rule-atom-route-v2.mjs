import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

export const OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_SCHEMA =
  "starcraft_tmg_official_remaining_rule_atom_route_v2";
export const OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_VERSION = "2.0.0";
export const OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_BASE_SLICE_HASH =
  "dc981da46cbae384449dbc9bf3213775a5fbd18a2b016ec4f9fa6a05994eae81";
export const OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_BASE_CATALOGUE_HASH =
  "216398a685146230140a56481dd031dff9f7c9f3f3a650b94165701a9e966e1f";
export const OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_SOURCE_LOCK_HASH =
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1";
export const OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH =
  "3b0f0b0a75d6a07b807a037941c1246736a69b35b8898ec7309295316bacacc2";

export const OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_RECOVERED_DEBT_ATOM_IDS =
  Object.freeze([
    "rule-atom:singleton:core-11-leading-model-gap-clearance:16a27136f699",
    "rule-atom:singleton:core-11-leading-model-nomination-duration:79d886f8c086",
    "rule-atom:singleton:core-11-size-zero-one-terrain-pass:9899398e5428",
    "rule-atom:singleton:core-8-5-3-gap-clearance-reference:dcfe3acc7ac7",
    "rule-atom:singleton:core-8-5-3-ramp-movement:058a7cee7079",
  ].sort());

// Indices resolve against the source-sorted, atomId-tiebroken review set of the
// exact Slice 85 catalogue hash above. The emitted route contains the resolved
// atom IDs and is content-hashed; an index cannot silently follow another
// catalogue because catalogue identity is checked first.
const ASSIGNMENT_INDICES = Object.freeze({
  86: Object.freeze([13, 45, 46, 47, 52, 53, 55, 86, 229, 230, 231, 232, 233]),
  87: Object.freeze([56, 108, 109, 110, 111, 129, 130, 131, 133, 136, 137, 138,
    139, 163, 164, 165, 166, 167, 168, 169, 170]),
  88: Object.freeze([14, 31, 32, 33, 35, 36, 42, 43, 44, 132, 135, 141, 142,
    143, 148]),
  89: Object.freeze([17, 34, 58, 59, 67, 150, 151, 152, 153, 154, 155, 156,
    157, 158, 159, 160, 161, 162]),
  90: Object.freeze([0, 1, 2, 3, 69, 80, 87, 88, 144, 145, 146, 147, 149]),
  91: Object.freeze([4, 5, 6, 7, 8, 246]),
  92: Object.freeze([9, 10, 11, 12, 179, 180, 181]),
  93: Object.freeze([101, 102, 103, 171, 172, 173, 174, 175, 176, 177, 178, 194]),
  94: Object.freeze([121, 213, 214, 219, 220, 221, 228]),
  95: Object.freeze([223, 224, 225, 226, 227]),
  96: Object.freeze([70, 71, 72, 73, 74, 112, 215, 222, 234, 235, 236, 237,
    238, 239, 240, 241, 242]),
  97: Object.freeze([208, 209, 210, 211, 212]),
  98: Object.freeze([64, 65, 66, 81, 82, 83, 84, 85, 89, 90, 91, 92]),
  99: Object.freeze([18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 48,
    49, 50, 51, 107]),
  100: Object.freeze([94, 95, 96, 97, 98, 99, 100, 291, 292, 293, 294, 295, 296]),
  101: Object.freeze([60, 61, 62, 63, 75, 76, 77, 78, 79]),
  102: Object.freeze([15, 16, 37, 38, 39, 68, 93, 104, 105, 106, 140, 182,
    183, 184, 185, 248, 261, 262, 263, 264, 265, 266, 267, 271]),
  103: Object.freeze([247, 268, 269, 270, 272, 273, 274, 275, 276, 277, 290]),
  104: Object.freeze([117, 118, 119, 120, 134, 278, 279, 280, 281, 282, 283,
    284, 285, 286, 287, 288]),
  105: Object.freeze([249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259,
    260, 289]),
  106: Object.freeze([114, 186, 187, 188, 189, 190, 191, 192, 193, 297, 298,
    299, 300, 301, 302, 303, 304, 305, 306, 307, 308]),
  107: Object.freeze([57, 116, 205, 309, 311, 312, 318, 319, 320, 331, 332, 333]),
  108: Object.freeze([115, 310, 313, 314, 315, 316, 317, 321, 322, 323, 324,
    325, 326, 327, 328, 329, 330]),
  109: Object.freeze([196, 197, 198, 199, 200, 201, 202, 203, 204, 206, 207]),
  110: Object.freeze([40, 41, 54, 113, 122, 123, 124, 195, 216, 217, 218, 243,
    244, 245]),
  111: Object.freeze([125, 126, 127, 128]),
});

const CLUSTERS = Object.freeze({
  86: "special terrain, access points, ramps, and residual gap references",
  87: "model/base geometry, measurement, coherency, within, and wholly within",
  88: "player, controller, unit ownership, friendly/enemy/team, and precedence",
  89: "dice, rerolls, tests, generated values, buffs, debuffs, and modifiers",
  90: "keywords and special-ability primitives, targeting, nonstacking, repeatable",
  91: "passive/reaction timing, simultaneous priority, and end-round order",
  92: "faction/tactical card layout, uniqueness, purchase, and excess resources",
  93: "unit-card fields and current supply-value projection",
  94: "round/phase order and alternating unit activation",
  95: "supply pool, casualty release, deployment reference, and availability",
  96: "reserve lifecycle, retained state, final-round destruction, and arrival",
  97: "unit destruction lifecycle, cleanup, outward effects, and return",
  98: "status/stay-in-play, shielded dependencies, siege mode, and on creep",
  99: "hidden and burrowed lifecycle, targeting, movement, and combat",
  100: "summon list, supply, placement, activation, scoring, and reserve boundary",
  101: "respawn and morph placement, supply, and activation lifecycle",
  102: "faction/race tags, faction-card schema, army slots, scale, eligibility",
  103: "army resource budgets and tactical-card purchase/open information",
  104: "unit composition, model counts, starting supply, upgrades, and costs",
  105: "team rosters, open/closed lists, equipment disclosure, and inspection",
  106: "mission/deployment card draft, selection, and card contract",
  107: "battlefield dimensions, entry edges, mission markers, and FAQ setup",
  108: "balanced terrain counts, effects, lanes, quadrants, centre, and scaling",
  109: "battlefield token and marker primitives",
  110: "first player, mission control, elimination, final scoring, and tiebreak",
  111: "unresolved dispute protocol and post-match verification",
});

const EXPECTED_COUNTS = Object.freeze({
  86: 13, 87: 21, 88: 15, 89: 18, 90: 13, 91: 6, 92: 7, 93: 12,
  94: 7, 95: 5, 96: 17, 97: 5, 98: 12, 99: 18, 100: 13, 101: 9,
  102: 24, 103: 11, 104: 16, 105: 13, 106: 21, 107: 12, 108: 17,
  109: 11, 110: 14, 111: 4,
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function compareReviewAtoms(left, right) {
  return String(left.clauseIds?.[0] || "").localeCompare(
    String(right.clauseIds?.[0] || ""),
  ) || left.atomId.localeCompare(right.atomId);
}

export function createOfficialRemainingRuleAtomRouteV2(catalogue) {
  const audit = verifyRuleAtomCatalogue(catalogue);
  if (catalogue.catalogueHash !== OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_BASE_CATALOGUE_HASH
    || audit.counts.byDisposition.executable !== 578
    || audit.counts.byDisposition.review_required !== 334
    || audit.counts.byDisposition.display_only !== 114) {
    fail("REMAINING_ROUTE_BASE_CATALOGUE_INVALID");
  }
  const reviewAtoms = catalogue.atoms
    .filter((atom) => atom.disposition === "review_required")
    .sort(compareReviewAtoms);
  const seen = new Set();
  let executableAfter = 578;
  let reviewAfter = 334;
  const assignments = Object.entries(ASSIGNMENT_INDICES).map(([sliceText, indices]) => {
    const slice = Number(sliceText);
    const atomIds = indices.map((index) => {
      const atomId = reviewAtoms[index]?.atomId;
      if (!atomId) fail("REMAINING_ROUTE_INDEX_INVALID", `${slice}:${index}`);
      if (seen.has(atomId)) fail("REMAINING_ROUTE_DUPLICATE_ATOM", atomId);
      seen.add(atomId);
      return atomId;
    }).sort();
    if (atomIds.length !== EXPECTED_COUNTS[slice]) {
      fail("REMAINING_ROUTE_SLICE_COUNT_INVALID", String(slice));
    }
    executableAfter += atomIds.length;
    reviewAfter -= atomIds.length;
    return {
      slice,
      cluster: CLUSTERS[slice],
      atomCount: atomIds.length,
      executableAfter,
      reviewRequiredAfter: reviewAfter,
      atomIds,
    };
  });
  const reviewIds = new Set(reviewAtoms.map((atom) => atom.atomId));
  const missingAtomIds = [...reviewIds].filter((atomId) => !seen.has(atomId)).sort();
  const unknownAtomIds = [...seen].filter((atomId) => !reviewIds.has(atomId)).sort();
  if (assignments.length !== 26 || seen.size !== 334
    || missingAtomIds.length !== 0 || unknownAtomIds.length !== 0
    || executableAfter !== 912 || reviewAfter !== 0) {
    fail("REMAINING_ROUTE_PARTITION_INCOMPLETE");
  }
  for (const atomId of OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_RECOVERED_DEBT_ATOM_IDS) {
    if (!seen.has(atomId)) fail("REMAINING_ROUTE_RECOVERED_DEBT_MISSING", atomId);
  }
  const body = {
    schema: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_SCHEMA,
    routeVersion: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_VERSION,
    gameId: "starcraft_tmg",
    baseSliceHash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_BASE_SLICE_HASH,
    baseCatalogueHash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_BASE_CATALOGUE_HASH,
    sourceLockHash: OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_SOURCE_LOCK_HASH,
    baseCounts: { executable: 578, reviewRequired: 334, displayOnly: 114 },
    recoveredDebtAtomIds:
      OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_RECOVERED_DEBT_ATOM_IDS,
    assignments,
    partition: {
      assignedReviewRequiredAtoms: seen.size,
      totalReviewRequiredAtoms: reviewIds.size,
      duplicateAtomIds: [],
      missingAtomIds,
      unknownAtomIds,
      finalExecutableAtoms: executableAfter,
      finalReviewRequiredAtoms: reviewAfter,
    },
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
    ctx2skill: {
      loopUsed: true,
      roleRoutes: ["rule_skill_builder"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 0,
      crossTimeReplayResult: "not_run_route_planning_only",
      promotions: [],
      blocks: ["all_route_atoms_require_executable_rule_and_replay_evidence"],
      remainingRuleGaps: 334,
    },
    harness: {
      loopUsed: true,
      harnessToolsCalled: [],
      userVisibleChecks: ["exact_remaining_atom_partition_is_visible"],
      rollbackOrDemotionRules: ["invalidate_route_on_catalogue_hash_change"],
      trainingTraceCandidates: [],
    },
    rulesTruth: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, routeHash: hashStarcraftTmgContract(body) });
}

export function auditOfficialRemainingRuleAtomRouteV2(route, catalogue) {
  const expected = createOfficialRemainingRuleAtomRouteV2(catalogue);
  if (route?.routeHash !== hashStarcraftTmgContract(without(route || {}, ["routeHash"]))) {
    fail("REMAINING_ROUTE_HASH_INVALID");
  }
  if (route.routeHash !== OFFICIAL_REMAINING_RULE_ATOM_ROUTE_V2_HASH
    || !isDeepStrictEqual(route, expected)) {
    fail("REMAINING_ROUTE_DRIFT");
  }
  return freezeDeep({
    valid: true,
    routeHash: route.routeHash,
    assignmentCount: route.assignments.length,
    assignedAtomCount: route.partition.assignedReviewRequiredAtoms,
    recoveredDebtAtomCount: route.recoveredDebtAtomIds.length,
    finalExecutableAtoms: route.partition.finalExecutableAtoms,
    finalReviewRequiredAtoms: route.partition.finalReviewRequiredAtoms,
    trainingTruth: false,
  });
}
