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
  createOfficialUnitCompositionUpgradeDataBundleV1,
  verifyOfficialUnitCompositionUpgradeDataBundleV1,
} from "./official-unit-composition-upgrade-data-bundle-v1.mjs";

export const OFFICIAL_ROSTER_DISCLOSURE_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_roster_disclosure_data_bundle_v1";

const PART9 = Object.freeze({
  recordKey: "rules_sections:Rj6sMyNODPQ8OHUc9Clp",
  title: "PART 9: PREPARING FOR BATTLE",
  sourceRecordHash: "8c91884a93418869ca6878fdf0f3868278008728f1d28995f3f6e3bf8e85e282",
  payloadHash: "3197f311085315cabe06dcda95a0e2ab3a744d7c97571c9df02d27a27186dc2a",
});

const SECTION_EXPECTATIONS = Object.freeze([
  Object.freeze({ title: "9.1.8 Team Games",
    sectionHash: "b1d72365f79e6cd3f20da1f0eb2557d67d0fc51d55a1edca765fd62d8efe698b",
    contentHash: "d80023120dd837eb4772522ccd6ccc0ff6c52490957182956ab534eb208e3e5c" }),
  Object.freeze({ title: "9.1.10 Army Roster Visibility",
    sectionHash: "6178914f37f13f097b4b578b1131ea49eb547e002d1efa0300a9f00dd82b304d",
    contentHash: "9c2847b79b178c0a10d94d865db8b43de2dd941c68dcd844a15dfdacdcfc454f" }),
  Object.freeze({ title: "9.1.11 Representation and Disclosure",
    sectionHash: "1f2597a70e74733b7e2b013e0482c4e582e4325a0f358a6f2b83c95d7afd30bf",
    contentHash: "870dd59ff856be91aea775dd0bce30787ae4e132559fea94a1ba0ee92eee7cab" }),
]);

function clause(atomId, clauseId, sourceTextHash) {
  const body = { atomId, clauseIds: Object.freeze([clauseId]),
    sourceTextHashes: Object.freeze([sourceTextHash]) };
  return Object.freeze({ ...body,
    candidateSequenceHash: hashStarcraftTmgContract(body) });
}

const RULE_CLAUSES = Object.freeze([
  clause("rule-atom:closed-list-faction-and-tactical-card-visibility",
    "core:9.1.10:closed-list-face-up-cards",
    "25273d17e1db91afb7ede4fc8f9b0afdede3d77700bbbda31d5e0570a2c5cc58"),
  clause("rule-atom:singleton:core-9-1-10-closed-list-agreement:3a2b6a1daafa",
    "core:9.1.10:closed-list-agreement",
    "ac76cd9057abad3d7c34c105b675d1447e1b327faf370656d5a3fb8aba20548a"),
  clause("rule-atom:singleton:core-9-1-10-closed-list-roster-secrecy:de47ad1eb2f1",
    "core:9.1.10:closed-list-roster-secrecy",
    "fbddc197c32b6a61e102dee7949ec28f1fe1acc30507276b4ad8ce709104628e"),
  clause("rule-atom:singleton:core-9-1-10-default-open-list-disclosure:5afe0eff433e",
    "core:9.1.10:default-open-list-disclosure",
    "1f3b3ee9bdb04ee4f377e92cfc690d90d63a397b6bdee6f01993034f349e8f3e"),
  clause("rule-atom:singleton:core-9-1-10-deployed-unit-upgrade-disclosure:bd72883d19b4",
    "core:9.1.10:deployed-unit-upgrade-disclosure",
    "d239b5678d31718a848bb48d0c06549765cbd517050e0faff58fb1e598d762ca"),
  clause("rule-atom:singleton:core-9-1-10-on-table-unit-inspection-right:271479053551",
    "core:9.1.10:on-table-unit-inspection-right",
    "f404f35c7c315bd55ca0d66d3f42ac03659947850ddc3d4c6a5175d22fb6fedf"),
  clause("rule-atom:singleton:core-9-1-10-tournament-roster-visibility-override:f41a3117b826",
    "core:9.1.10:tournament-roster-visibility-override",
    "ae2e991ea641bbc3029856125b2be217a8aa518604f68e6308b76a86b4abd649"),
  clause("rule-atom:singleton:core-9-1-11-accurate-equipment-modelling:696f66138b23",
    "core:9.1.11:accurate-equipment-modelling",
    "79b4c4c260224aa21e48b50dfef09961f553e3a455a0d4b4ae615f46baa0b213"),
  clause("rule-atom:singleton:core-9-1-11-full-equipment-knowledge:32e46eafb231",
    "core:9.1.11:full-equipment-knowledge",
    "1cdb8946ac2fcb66bbb1a1391e8b44c6695f35e49786872d5591f2cf80f92ecc"),
  clause("rule-atom:singleton:core-9-1-11-nondisclosure-unsportsmanlike:ce3b2e1afb19",
    "core:9.1.11:nondisclosure-unsportsmanlike",
    "76b9c9cfcd97f52ea6906b4b670b36a50e43677b0e7a08aa008ac5ef9f5b39d3"),
  clause("rule-atom:singleton:core-9-1-11-nonrepresented-loadout-deployment-disclosure:674f84f8ffcd",
    "core:9.1.11:nonrepresented-loadout-deployment-disclosure",
    "75e9dde685f59f2f252de6751be1c06b422e50c54ed0cb5a312e4dc3981cf9ba"),
  clause("rule-atom:singleton:core-9-1-11-relevant-action-reminder:ef019e037df7",
    "core:9.1.11:relevant-action-reminder",
    "34748a401258fd6e7b7dd1aa4e2673e0883bb2b4df018c2fc4d8a140747218e2"),
  clause("rule-atom:singleton:core-9-1-8-independent-team-rosters:1acaaaa5e34f",
    "core:9.1.8:independent-team-rosters",
    "6d110802c43b82615e85582e3fabe3bf6fb3c7e5c845cfa5eb768f7385a15c39"),
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
function normalizedName(value) {
  return String(value || "").normalize("NFKC").replace(/[’‘]/gu, "'")
    .replace(/[\p{Z}\p{Cf}]+/gu, " ").trim().toLocaleLowerCase("en-US");
}

function exactPart9Sections(dataset) {
  const record = dataset.recordsByKey[PART9.recordKey];
  const index = dataset.recordIndex.find((entry) => entry.recordKey === PART9.recordKey);
  if (!object(record) || !object(index)
    || index.authorityDisposition !== "official_rule_prose_review_required"
    || record.payload?.title !== PART9.title
    || record.sourceRecordHash !== PART9.sourceRecordHash
    || record.payloadHash !== PART9.payloadHash) {
    fail("ROSTER_DISCLOSURE_PART9_RECORD_DRIFT");
  }
  const armyBuilding = record.payload.items?.find((entry) => (
    entry?.title === "9.1 Army Building"));
  if (!object(armyBuilding) || !Array.isArray(armyBuilding.subItems)) {
    fail("ROSTER_DISCLOSURE_PART9_STRUCTURE_DRIFT");
  }
  const sections = SECTION_EXPECTATIONS.map((expected) => {
    const section = armyBuilding.subItems.find((entry) => entry?.title === expected.title);
    if (!object(section) || hashStarcraftTmgContract(section) !== expected.sectionHash
      || hashStarcraftTmgContract(section.content) !== expected.contentHash) {
      fail("ROSTER_DISCLOSURE_SECTION_DRIFT", expected.title);
    }
    return { title: section.title, content: structuredClone(section.content),
      sectionHash: expected.sectionHash, contentHash: expected.contentHash,
      sourceRecordKey: PART9.recordKey, sourceRecordHash: PART9.sourceRecordHash,
      payloadHash: PART9.payloadHash };
  });
  return { record: { ...PART9,
    authorityDisposition: index.authorityDisposition,
    sourceVersion: dataset.dataVersions?.rulesVersion }, sections };
}

function compileUnitCardInspectionProfiles(dataset, unitBundle) {
  return unitBundle.unitCompositionProfiles.map((unit) => {
    const record = getOfficialCurrentProductRecord(dataset, unit.recordKey);
    const definitions = record.payload?.upgrades;
    if (!Array.isArray(definitions)) {
      fail("ROSTER_DISCLOSURE_UNIT_CARD_EQUIPMENT_INVALID", unit.recordKey);
    }
    const purchasableIndices = new Set(unitBundle.purchasableUpgradeProfiles
      .filter((entry) => entry.recordKey === unit.recordKey)
      .map((entry) => entry.upgradeIndex));
    const defaultEquipment = definitions.map((definition, upgradeIndex) => ({
      definition, upgradeIndex,
    })).filter(({ definition, upgradeIndex }) => (
      /^\s*RANGE\s*:/iu.test(String(definition?.description || ""))
        && !purchasableIndices.has(upgradeIndex)
    )).map(({ definition, upgradeIndex }) => {
      const body = { equipmentProfileId: `${unit.recordKey}:default-equipment:${upgradeIndex}`,
        recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
        equipmentName: String(definition.name || "").normalize("NFC").trim(),
        normalizedEquipmentName: normalizedName(definition.name), upgradeIndex,
        phase: String(definition.phase || ""), activation: String(definition.activation || ""),
        description: String(definition.description || ""),
        sourceDefinitionHash: hashStarcraftTmgContract(definition),
        sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
        sourceUnitProfileHash: unit.sourceUnitProfileHash,
        equipmentSourceKind: "default_unit_card_weapon", trainingTruth: false };
      return { ...body, profileHash: hashStarcraftTmgContract(body) };
    });
    const body = { schema: "starcraft_tmg_official_unit_card_inspection_profile_v1",
      recordKey: unit.recordKey, unitId: unit.unitId, unitName: unit.unitName,
      sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
      sourceUnitProfileHash: unit.sourceUnitProfileHash,
      unitCompositionReferenceProfileHash: unit.profileHash,
      unitCardPayload: structuredClone(record.payload),
      unitCardPayloadHash: hashStarcraftTmgContract(record.payload),
      defaultEquipment, defaultEquipmentCount: defaultEquipment.length,
      completeCurrentUnitCardInspectable: true, trainingTruth: false };
    return { ...body, profileHash: hashStarcraftTmgContract(body) };
  }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
}

export function createOfficialRosterDisclosureDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("ROSTER_DISCLOSURE_DATASET_INVALID");
  const unitCompositionUpgradeDataBundle =
    createOfficialUnitCompositionUpgradeDataBundleV1({ dataset });
  const part9 = exactPart9Sections(dataset);
  const unitCardInspectionProfiles = compileUnitCardInspectionProfiles(
    dataset, unitCompositionUpgradeDataBundle);
  const audit = { ruleClauseCount: RULE_CLAUSES.length,
    part9SectionCount: part9.sections.length,
    unitCardInspectionProfileCount: unitCardInspectionProfiles.length,
    defaultEquipmentProfileCount: unitCardInspectionProfiles.reduce((sum, entry) => (
      sum + entry.defaultEquipmentCount), 0),
    purchasableUpgradeProfileCount:
      unitCompositionUpgradeDataBundle.purchasableUpgradeProfiles.length };
  const expectedAudit = { ruleClauseCount: 13, part9SectionCount: 3,
    unitCardInspectionProfileCount: 22, defaultEquipmentProfileCount: 41,
    purchasableUpgradeProfileCount: 52 };
  if (hashStarcraftTmgContract(audit) !== hashStarcraftTmgContract(expectedAudit)) {
    fail("ROSTER_DISCLOSURE_DENOMINATOR_DRIFT");
  }
  const body = { schema: OFFICIAL_ROSTER_DISCLOSURE_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    officialRulesVersion: "48", officialUnitsVersion: "71", officialCardsVersion: "69",
    ruleSectionRecord: part9.record, ruleSections: part9.sections,
    ruleSectionIndexHash: hashStarcraftTmgContract(part9.sections),
    ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    unitCardInspectionProfiles,
    unitCardInspectionProfileIndexHash:
      hashStarcraftTmgContract(unitCardInspectionProfiles),
    unitCompositionUpgradeDataBundle, audit,
    rosterVisibilityPolicy: {
      tournamentRulesPackOverridesCoreDefault: true,
      coreDefaultMode: "open", closedModeRequiresEveryPlayerAgreement: true,
      anyPlayerDeclinesClosedMode: "open", closedRosterPreGameVisibility: "hidden",
      factionAndTacticalCardsAlwaysFaceUp: true,
      deployedUnitIdentityUpgradesAndWeaponSwapsImmediatelyPublic: true,
      onTableUnitCardAndAssociatedTacticalCardsInspectable: true,
      viewerProjectionMustNotContainUndeployedOpponentRosterEntries: true,
    },
    equipmentDisclosurePolicy: {
      accurateRepresentationExpectedWherePossible: true,
      unrepresentedEquipmentDeclaredAtDeployment: true,
      unrepresentedEquipmentRepeatedBeforeRelevantAction: true,
      fullOnTableEquipmentKnowledgeRight: true,
      missingDisclosureConduct: "unsportsmanlike_conduct",
      authorityDerivesExpectedLoadoutFromDefaultEquipmentAndSelectedUpgrades: true,
      clientSuppliedExpectedLoadoutAccepted: false,
    },
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      commandCenterRole: "current_unit_card_and_selected_upgrade_equipment_identity",
      pdfRole: "primary_normative_roster_visibility_representation_disclosure_source" },
    productionRoomEligible: false,
    rulesTruth: "official_team_roster_visibility_equipment_disclosure_source_index",
    trainingTruth: false };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialRosterDisclosureDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_ROSTER_DISCLOSURE_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.officialRulesVersion !== "48" || bundle.officialUnitsVersion !== "71"
    || bundle.officialCardsVersion !== "69" || bundle.ruleClauses?.length !== 13
    || bundle.ruleSections?.length !== 3 || bundle.unitCardInspectionProfiles?.length !== 22
    || bundle.audit?.defaultEquipmentProfileCount !== 41
    || bundle.ruleSectionIndexHash !== hashStarcraftTmgContract(bundle.ruleSections)
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.unitCardInspectionProfileIndexHash
      !== hashStarcraftTmgContract(bundle.unitCardInspectionProfiles)
    || bundle.rosterVisibilityPolicy?.coreDefaultMode !== "open"
    || bundle.rosterVisibilityPolicy?.closedModeRequiresEveryPlayerAgreement !== true
    || bundle.rosterVisibilityPolicy?.factionAndTacticalCardsAlwaysFaceUp !== true
    || bundle.equipmentDisclosurePolicy?.missingDisclosureConduct
      !== "unsportsmanlike_conduct"
    || bundle.equipmentDisclosurePolicy?.clientSuppliedExpectedLoadoutAccepted !== false
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("ROSTER_DISCLOSURE_DATA_BUNDLE_INVALID");
  }
  verifyOfficialUnitCompositionUpgradeDataBundleV1(
    bundle.unitCompositionUpgradeDataBundle);
  const profileIds = new Set();
  for (const profile of bundle.unitCardInspectionProfiles) {
    if (!object(profile) || profile.profileHash
      !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
      || profile.unitCardPayloadHash !== hashStarcraftTmgContract(profile.unitCardPayload)) {
      fail("ROSTER_DISCLOSURE_UNIT_CARD_PROFILE_INVALID", profile?.recordKey);
    }
    for (const equipment of profile.defaultEquipment || []) {
      if (profileIds.has(equipment.equipmentProfileId)
        || equipment.profileHash
          !== hashStarcraftTmgContract(without(equipment, ["profileHash"]))) {
        fail("ROSTER_DISCLOSURE_EQUIPMENT_PROFILE_INVALID",
          equipment?.equipmentProfileId);
      }
      profileIds.add(equipment.equipmentProfileId);
    }
  }
  if (profileIds.size !== 41
    || new Set(bundle.ruleClauses.map((entry) => entry.atomId)).size !== 13
    || bundle.ruleClauses.some((entry) => !/^[a-f0-9]{64}$/u.test(
      entry.candidateSequenceHash))) fail("ROSTER_DISCLOSURE_DENOMINATOR_INVALID");
  return true;
}

export function getOfficialUnitCardInspectionProfileV1(bundle, recordKey) {
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  const value = bundle.unitCardInspectionProfiles.find((entry) => (
    entry.recordKey === String(recordKey || "")));
  if (!value) fail("ROSTER_DISCLOSURE_UNIT_CARD_PROFILE_REQUIRED",
    String(recordKey || ""));
  return value;
}
