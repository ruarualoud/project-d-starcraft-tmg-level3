import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "./official-command-center-adapter-v1.mjs";
import {
  createOfficialCardBuildPaymentDataBundleV1,
  verifyOfficialCardBuildPaymentDataBundleV1,
} from "./official-card-build-payment-data-bundle-v1.mjs";
import {
  createOfficialUnitCardSupplyDataBundleV1,
  verifyOfficialUnitCardSupplyDataBundleV1,
} from "./official-unit-card-supply-data-bundle-v1.mjs";

export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_faction_army_eligibility_data_bundle_v1";
export const OFFICIAL_FACTION_ARMY_ELIGIBILITY_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RACES = Object.freeze(["Protoss", "Terran", "Zerg"]);
const RACE_SET = new Set(RACES);
const SLOT_TYPES = Object.freeze(["Air", "Core", "Elite", "Hero", "Support"]);
const RULE_RECORDS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:QX7B9DFpviRo84fVCBIj",
    title: "PART 2: CORE CONCEPTS",
    sourceRecordHash: "f7fce5a24ed1962598abb556f43a7cfffcfb541404c6bb705d119379b4094964",
    payloadHash: "615c599d401b8457266c56d1033a4259c0d1f353ba686becab05876a3af66acb" }),
  Object.freeze({ recordKey: "rules_sections:u3zNStKpd5XegMjmJfMS",
    title: "PART 5: CARDS AND CHARACTERISTICS",
    sourceRecordHash: "026a4a9b0f3c0bae10a76ee28e48655cbf117cc01e304c57d7dfc2f5522f1175",
    payloadHash: "bd1eb44d676bac9a2a2643122f3af1fb90625c29e905aef56b9417f5733f86c5" }),
  Object.freeze({ recordKey: "rules_sections:Rj6sMyNODPQ8OHUc9Clp",
    title: "PART 9: PREPARING FOR BATTLE",
    sourceRecordHash: "8c91884a93418869ca6878fdf0f3868278008728f1d28995f3f6e3bf8e85e282",
    payloadHash: "3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a" }),
  Object.freeze({ recordKey: "rules_sections:FuahgilWtc8nccVSp2Vv",
    title: "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
    sourceRecordHash: "985e79f70c48caf1b1085e620e92be23f5b4468ffe07fdc5f84cb01a28fa59b7",
    payloadHash: "4a6aa9e55e3b4197666b0f4fed633269dc42327af16f5b5a5422b7533d7d8973" }),
]);

function clause(atomId, clauseIds, sourceTextHashes) {
  const body = { atomId, clauseIds: Object.freeze(clauseIds),
    sourceTextHashes: Object.freeze(sourceTextHashes) };
  return Object.freeze({ ...body,
    candidateSequenceHash: hashStarcraftTmgContract(body) });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:army-building-faction-tag-eligibility",
    ["core:11:faction-tag-army-building-eligibility",
      "core:2.4.1:army-building-faction-match"],
    ["aac6f6b27f9a3c1c2723fc5110b2acb2a6d49f4f68ce8450328c2ae98590a4ff",
      "9b98b29f048ac129d1bad790f4ce9b89db1e1f5e8615513ecd317df9481a5fd5"]),
  clause("rule-atom:faction-card-special-ability-field",
    ["core:5.4:faction-card-abilities"],
    ["dae7c881d3757cf2c8f9f083dc95ac71968fe92c34664551984bda2f48453c31"]),
  clause("rule-atom:faction-card-tag-eligibility",
    ["core:9.1.2:faction-tag-definition"],
    ["e2da8a1c71a56d7bce27dfad6b8e759a67f8c36354f290910a53e0868ebf650d"]),
  clause("rule-atom:faction-tag-unit-allegiance",
    ["core:2.4.1:faction-tag-definition"],
    ["45ca99f5f6a85da8faa636330a41fdfccdc82e7b8739e30e37006c632b4d742a"]),
  clause("rule-atom:race-faction-tag-set",
    ["core:11:race-tag-set", "core:2.4.1:race-tags"],
    ["429630cdd00e26ead0a98e8d70a9c6d8ae2d4dc6a8141f2ec4f9c88cbc14c1f6",
      "48bda1c588e7a021eaf7c39331b103317d8101f714332c2557e7652ac71beae6"]),
  clause("rule-atom:singleton:core-11-army-slot-capacity:1fc66d359039",
    ["core:11:army-slot-capacity"],
    ["3226b75a094a715ad1dd4f629d6171bde1246bead8ba93763e7dbc9a6a378f44"]),
  clause("rule-atom:singleton:core-11-army-slot-types:fdea1de495a6",
    ["core:11:army-slot-types"],
    ["d8f51d4a37bdd1287348b5bdac1143552cf4dd7243cfa3735406493527cbcd4e"]),
  clause("rule-atom:singleton:core-11-faction-initial-army-slots:d85ff42c4c18",
    ["core:11:faction-initial-army-slots"],
    ["649c50cf7d1e7dc5c8b9e4b08eb41b1548d91f49731ef79cb4239278913e9e5b"]),
  clause("rule-atom:singleton:core-11-faction-tags-definition:3a2df61a250b",
    ["core:11:faction-tags-definition"],
    ["616976ba0a4a60dbd39d4b224240e47ce068c8c1b46c5103e2afda6d8aefc225"]),
  clause("rule-atom:singleton:core-11-tactical-extra-army-slots:0c4f9de1e102",
    ["core:11:tactical-extra-army-slots"],
    ["f90181a47b1c1d2a9f32ec26c3825df3efc592632e6184fe7c83c6c58d619451"]),
  clause("rule-atom:singleton:core-11-unit-army-slot-occupancy:7aeaa6a98a16",
    ["core:11:unit-army-slot-occupancy"],
    ["e0c129612e527b16d220d1e56e68b501b2541883e9016c725da9042816a56a55"]),
  clause("rule-atom:singleton:core-5-4-faction-card-identity:bd1d9ade39d2",
    ["core:5.4:faction-card-identity"],
    ["d559be8f8ffa4503e4f23454d4edd5a8f9a26c040756606decbca7a4e6731f14"]),
  clause("rule-atom:singleton:core-5-4-faction-card-slots:375d8114dd4b",
    ["core:5.4:faction-card-slots"],
    ["78131fac3da317d7015a45c6fb3d631f35a0b1a335aaa3526ed00f3d2de41f28"]),
  clause("rule-atom:singleton:core-5-4-faction-card-tags:87c0f823d785",
    ["core:5.4:faction-card-tags"],
    ["eb3a6cfbb0bf8990f8ed5091f07a96f67a42e777217b4a8a1f529070234f25cf"]),
  clause("rule-atom:singleton:core-9-1-1-engagement-scale-agreement:972897dc93d1",
    ["core:9.1.1:engagement-scale-agreement"],
    ["95fd983009bd55a664d04d18e7c0afbf05f637fbab739701e8f91c31493fb6a8"]),
  clause("rule-atom:singleton:core-9-1-2-all-tags-must-match:7cc09e31867e",
    ["core:9.1.2:all-tags-must-match"],
    ["82ff84d7f442c7c499e293f9471871caa6923146d32655fb5214c6965e6c8051"]),
  clause("rule-atom:singleton:core-9-1-2-any-tag-mismatch:6ddbccb04328",
    ["core:9.1.2:any-tag-mismatch"],
    ["3e6cd2b1f20048e9b2fa781f45079bacc4e93e2675d7a90c97ba132fd79bda39"]),
  clause("rule-atom:singleton:core-9-1-2-card-faction-tags:00c9a7d2275c",
    ["core:9.1.2:card-faction-tags"],
    ["cef8c0fd6c0d706267d8bac990789c5558adbf5b996593b960d50b733b3c2016"]),
  clause("rule-atom:singleton:core-9-1-2-faction-card-basis:bf8f5368125d",
    ["core:9.1.2:faction-card-basis"],
    ["5f077c4147b5be553a0692458c71a547b3caa10f27a54f347af62632781590f7"]),
  clause("rule-atom:singleton:core-9-1-2-fewer-tags-eligible:ba35ea81600d",
    ["core:9.1.2:fewer-tags-eligible"],
    ["81c1a8d11268208fe96097045cf8705f0ac9ecdefa8d2a003911cc97dfca73e3"]),
  clause("rule-atom:singleton:core-9-1-2-race-faction-selection:d17616e3b627",
    ["core:9.1.2:race-faction-selection"],
    ["06495ea987dd9e99dc2dabd0f7dd5d23785bfdfc57d7842020d979fe9766c465"]),
  clause("rule-atom:singleton:core-9-1-4-engagement-scale-table:9f348270c2b7",
    ["core:9.1.4:engagement-scale-table"],
    ["edde9804458d499d9ba2a619266abb56d950feceb53b2ce196cc9f8883b397ad"]),
  clause("rule-atom:sub-faction-tag-classification",
    ["core:11:sub-faction-tags", "core:2.4.1:sub-faction-tags"],
    ["a2f4c3783d075745def59ba5eaf74b0832d72f7c8ee722864f5bf13ebab91ac0",
      "820901a444028c6276113a39a1d7c23355b9f671888261b47a7379ab7e1d0654"]),
  clause("rule-atom:unused-army-slots-lost",
    ["core:11:unused-army-slots-lost", "core:9.1.6:unused-army-slots-lost"],
    ["aaa9cf5c4a75882e664cede64e6ec4ab348cfc091c0026aead2de2520c2f7163",
      "61dbe0bfeb493e0fac4ed9e4833deb5651d1a2d567f66d9d29a4e9b543e752ac"]),
]);

const ENGAGEMENT_SCALES = Object.freeze([
  Object.freeze({ scaleId: "Skirmish", mineralLimit: {
    kind: "maximum", maximumInclusive: 1000 }, vespeneRatio: {
    numerator: 1, denominator: 10 }, battlefield: {
    widthMilliInches: 36000, lengthMilliInches: 36000 } }),
  Object.freeze({ scaleId: "Standard", mineralLimit: {
    kind: "maximum", maximumInclusive: 2000 }, vespeneRatio: {
    numerator: 1, denominator: 10 }, battlefield: {
    widthMilliInches: 36000, lengthMilliInches: 54000 } }),
  Object.freeze({ scaleId: "Grand Offensive", mineralLimit: {
    kind: "minimum_open", minimumInclusive: 2001 }, vespeneRatio: {
    numerator: 1, denominator: 10 }, battlefield: {
    widthMilliInches: 36000, lengthMilliInches: 72000 } }),
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}
function splitKeywords(value) {
  return uniqueStrings(String(value || "").split(","));
}
function exactRuleSectionRecords(dataset) {
  return RULE_RECORDS.map((expected) => {
    const record = dataset.recordsByKey[expected.recordKey];
    const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || !object(index)
      || index.authorityDisposition !== "official_rule_prose_review_required"
      || record.payload?.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash) {
      fail("FACTION_ARMY_ELIGIBILITY_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected, authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}
function compileProfiles(dataset, cardBundle, unitBundle) {
  const factionCards = cardBundle.cardProfiles.filter((entry) => entry.isFactionCard);
  const subFactionRace = new Map();
  for (const profile of factionCards) {
    for (const tag of profile.subFactionTags) {
      const existing = subFactionRace.get(tag);
      if (existing && existing !== profile.raceTag) {
        fail("FACTION_ARMY_SUB_FACTION_AMBIGUOUS", tag);
      }
      subFactionRace.set(tag, profile.raceTag);
    }
  }
  if (subFactionRace.size !== 3) fail("FACTION_ARMY_SUB_FACTION_DENOMINATOR_DRIFT");
  const factionProfiles = factionCards.map((profile) => {
    const body = { schema: "starcraft_tmg_official_faction_profile_v1",
      recordKey: profile.recordKey, cardId: profile.cardId, factionName: profile.cardName,
      sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
      sourceCardProfileHash: profile.profileHash, raceTag: profile.raceTag,
      subFactionTags: [...profile.subFactionTags], factionTags: [...profile.factionTags],
      startingArmySlots: structuredClone(profile.slots),
      specialAbilities: { count: profile.abilityCount,
        definitionsHash: profile.abilityDefinitionsHash }, trainingTruth: false };
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const tacticalProfiles = cardBundle.cardProfiles.filter((entry) => !entry.isFactionCard)
    .map((profile) => {
      const body = { schema: "starcraft_tmg_official_army_candidate_profile_v1",
        candidateKind: "tactical", recordKey: profile.recordKey,
        candidateId: profile.cardId, candidateName: profile.cardName,
        sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
        sourceProfileHash: profile.profileHash, raceTag: profile.raceTag,
        subFactionTags: [...profile.subFactionTags], factionTags: [...profile.factionTags],
        armySlotType: null, compositionSlots: [],
        tacticalArmySlots: structuredClone(profile.slots), fieldableDuringArmyBuilding: true,
        trainingTruth: false };
      return { ...body, profileHash: hashStarcraftTmgContract(body) };
    });
  const unitProfiles = unitBundle.unitProfiles.map((profile) => {
    const record = getOfficialCurrentProductRecord(dataset, profile.recordKey);
    const subFactionTags = splitKeywords(record.payload.keywords);
    if (subFactionTags.some((tag) => subFactionRace.get(tag) !== profile.factionTag)) {
      fail("FACTION_ARMY_UNIT_SUB_FACTION_INVALID", profile.recordKey);
    }
    const body = { schema: "starcraft_tmg_official_army_candidate_profile_v1",
      candidateKind: "unit", recordKey: profile.recordKey,
      candidateId: profile.unitId, candidateName: profile.unitName,
      sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
      sourceProfileHash: profile.profileHash, raceTag: profile.factionTag,
      subFactionTags, factionTags: uniqueStrings([profile.factionTag, ...subFactionTags]),
      sourceKeywordText: String(record.payload.keywords || ""),
      armySlotType: profile.armySlotType,
      compositionSlots: profile.compositions.map((entry) => ({
        compositionKind: entry.kind, startingModels: entry.startingModels,
        startingSupply: entry.startingSupply, occupiedArmySlots: entry.startingSupply })),
      tacticalArmySlots: null,
      fieldableDuringArmyBuilding: profile.fieldableDuringArmyBuilding,
      trainingTruth: false };
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  });
  const armyCandidateProfiles = [...tacticalProfiles,
    ...unitProfiles.filter((entry) => entry.fieldableDuringArmyBuilding)]
    .sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const nonArmyBuildingUnitProfiles = unitProfiles
    .filter((entry) => !entry.fieldableDuringArmyBuilding)
    .sort((left, right) => left.recordKey.localeCompare(right.recordKey));
  const eligibilityMatrix = factionProfiles.flatMap((faction) => (
    armyCandidateProfiles.map((candidate) => {
      const missingTags = candidate.factionTags.filter((tag) => (
        !faction.factionTags.includes(tag)));
      const body = { factionRecordKey: faction.recordKey,
        candidateRecordKey: candidate.recordKey, candidateKind: candidate.candidateKind,
        candidateFactionTags: [...candidate.factionTags],
        factionCardTags: [...faction.factionTags], missingTags,
        eligible: missingTags.length === 0 };
      return { ...body, rowHash: hashStarcraftTmgContract(body) };
    })
  )).sort((left, right) => (`${left.factionRecordKey}:${left.candidateRecordKey}`)
    .localeCompare(`${right.factionRecordKey}:${right.candidateRecordKey}`));
  return { factionProfiles, unitProfiles, tacticalProfiles, armyCandidateProfiles,
    nonArmyBuildingUnitProfiles, eligibilityMatrix,
    subFactionTags: [...subFactionRace.entries()].map(([tag, raceTag]) => ({ tag, raceTag }))
      .sort((left, right) => left.tag.localeCompare(right.tag)) };
}

export function createOfficialFactionArmyEligibilityDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("FACTION_ARMY_ELIGIBILITY_DATASET_INVALID");
  const cardDataBundle = createOfficialCardBuildPaymentDataBundleV1({ dataset });
  const unitDataBundle = createOfficialUnitCardSupplyDataBundleV1({ dataset });
  const compiled = compileProfiles(dataset, cardDataBundle, unitDataBundle);
  const eligibleCountsByFaction = Object.fromEntries(compiled.factionProfiles.map((faction) => [
    faction.factionName, compiled.eligibilityMatrix.filter((entry) => (
      entry.factionRecordKey === faction.recordKey && entry.eligible)).length,
  ]));
  const audit = { factionCardCount: compiled.factionProfiles.length,
    raceTagCount: RACES.length, subFactionTagCount: compiled.subFactionTags.length,
    tacticalCandidateCount: compiled.tacticalProfiles.length,
    unitProfileCount: compiled.unitProfiles.length,
    fieldableUnitCount: compiled.unitProfiles.filter((entry) => (
      entry.fieldableDuringArmyBuilding)).length,
    nonArmyBuildingUnitCount: compiled.nonArmyBuildingUnitProfiles.length,
    armyCandidateCount: compiled.armyCandidateProfiles.length,
    eligibilityRowCount: compiled.eligibilityMatrix.length,
    eligibleCountsByFaction,
    subFactionTaggedFieldableUnitCount: compiled.armyCandidateProfiles.filter((entry) => (
      entry.candidateKind === "unit" && entry.subFactionTags.length > 0)).length,
    subFactionTaggedTacticalCount: compiled.tacticalProfiles.filter((entry) => (
      entry.subFactionTags.length > 0)).length };
  const expectedAudit = { factionCardCount: 6, raceTagCount: 3, subFactionTagCount: 3,
    tacticalCandidateCount: 31, unitProfileCount: 26, fieldableUnitCount: 22,
    nonArmyBuildingUnitCount: 4, armyCandidateCount: 53, eligibilityRowCount: 318,
    eligibleCountsByFaction: { Daelaam: 15, "Kerrigan's Swarm": 21, Khalai: 16,
      "Raynor's Raiders": 16, "Terran Armed Forces": 15, "Zerg Swarm": 19 },
    subFactionTaggedFieldableUnitCount: 3, subFactionTaggedTacticalCount: 1 };
  if (hashStarcraftTmgContract(audit) !== hashStarcraftTmgContract(expectedAudit)) {
    fail("FACTION_ARMY_ELIGIBILITY_AUDIT_DRIFT");
  }
  const body = { schema: OFFICIAL_FACTION_ARMY_ELIGIBILITY_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_FACTION_ARMY_ELIGIBILITY_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", officialUnitsVersion: "71", officialCardsVersion: "69",
    ruleSectionRecords: exactRuleSectionRecords(dataset), ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    raceTags: RACES, subFactionTags: compiled.subFactionTags,
    armySlotTypes: SLOT_TYPES, engagementScales: ENGAGEMENT_SCALES,
    engagementScaleIndexHash: hashStarcraftTmgContract(ENGAGEMENT_SCALES),
    factionProfiles: compiled.factionProfiles,
    factionProfileIndexHash: hashStarcraftTmgContract(compiled.factionProfiles),
    armyCandidateProfiles: compiled.armyCandidateProfiles,
    armyCandidateProfileIndexHash: hashStarcraftTmgContract(compiled.armyCandidateProfiles),
    nonArmyBuildingUnitProfiles: compiled.nonArmyBuildingUnitProfiles,
    eligibilityMatrix: compiled.eligibilityMatrix,
    eligibilityMatrixHash: hashStarcraftTmgContract(compiled.eligibilityMatrix),
    cardDataBundle, unitDataBundle, audit,
    sourceReconciliation: { unitSubFactionSourceField: "keywords",
      oldUnitCardSupplyProjectionRaceOnly: true,
      oldUnitCardSupplyExecutorFrozen: true,
      summonedAndOtherUnitsExcludedFromArmyBuilding: true },
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      commandCenterRole: "current_faction_card_tactical_card_and_unit_tag_identity",
      pdfRole: "primary_normative_faction_slot_scale_and_eligibility_source" },
    deferredRules: { completeMineralAndVespeneBudget: "slice_103",
      completeUnitCompositionCostAndUpgradePurchase: "slice_104",
      teamRosterAndDisclosure: "slice_105" },
    productionRoomEligible: false,
    rulesTruth: "official_faction_army_slot_scale_and_eligibility_source_index",
    trainingTruth: false };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialFactionArmyEligibilityDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_FACTION_ARMY_ELIGIBILITY_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_FACTION_ARMY_ELIGIBILITY_CORE_RULEBOOK_HASH
    || bundle.ruleSectionRecords?.length !== 4 || bundle.ruleClauses?.length !== 24
    || bundle.factionProfiles?.length !== 6 || bundle.armyCandidateProfiles?.length !== 53
    || bundle.nonArmyBuildingUnitProfiles?.length !== 4
    || bundle.eligibilityMatrix?.length !== 318 || bundle.audit?.fieldableUnitCount !== 22
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.engagementScaleIndexHash !== hashStarcraftTmgContract(bundle.engagementScales)
    || bundle.factionProfileIndexHash !== hashStarcraftTmgContract(bundle.factionProfiles)
    || bundle.armyCandidateProfileIndexHash
      !== hashStarcraftTmgContract(bundle.armyCandidateProfiles)
    || bundle.eligibilityMatrixHash !== hashStarcraftTmgContract(bundle.eligibilityMatrix)
    || bundle.sourceReconciliation?.unitSubFactionSourceField !== "keywords"
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("FACTION_ARMY_ELIGIBILITY_DATA_BUNDLE_INVALID");
  }
  verifyOfficialCardBuildPaymentDataBundleV1(bundle.cardDataBundle);
  verifyOfficialUnitCardSupplyDataBundleV1(bundle.unitDataBundle);
  if (!bundle.raceTags.every((tag) => RACE_SET.has(tag))
    || bundle.armySlotTypes.join("|") !== SLOT_TYPES.join("|")
    || new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 24
    || bundle.ruleClauses.some((entry) => !entry.sourceTextHashes?.length
      || entry.sourceTextHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))
      || !/^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash))) {
    fail("FACTION_ARMY_ELIGIBILITY_DENOMINATOR_INVALID");
  }
  return true;
}

export function getOfficialFactionProfileV1(bundle, recordKey) {
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  const profile = bundle.factionProfiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("FACTION_PROFILE_REQUIRED", String(recordKey || ""));
  return profile;
}

export function getOfficialArmyCandidateProfileV1(bundle, recordKey) {
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  const profile = bundle.armyCandidateProfiles.find((entry) => entry.recordKey === recordKey);
  if (!profile) fail("ARMY_CANDIDATE_PROFILE_REQUIRED", String(recordKey || ""));
  return profile;
}

export function getOfficialEngagementScaleV1(bundle, scaleId) {
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  const profile = bundle.engagementScales.find((entry) => entry.scaleId === scaleId);
  if (!profile) fail("ENGAGEMENT_SCALE_REQUIRED", String(scaleId || ""));
  return profile;
}
