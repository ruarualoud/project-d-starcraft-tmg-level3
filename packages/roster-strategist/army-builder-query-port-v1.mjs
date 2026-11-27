import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialEngagementScaleV1,
} from "../source-data/official-faction-army-eligibility-data-bundle-v1.mjs";
import {
  verifyOfficialUnitCompositionUpgradeDataBundleV1,
} from "../source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import {
  resolveOfficialCompleteArmyCompositionUpgradeAuditV1,
  verifyOfficialUnitCompositionUpgradeResultV1,
} from "../rule-atoms/official-unit-composition-upgrade-rules-kernel-v1.mjs";
import { verifyOfficialUnitCardSupplyDataBundleV1 } from
  "../source-data/official-unit-card-supply-data-bundle-v1.mjs";
import { resolveOfficialUnitCardLayoutV1, resolveOfficialCurrentSupplyValueV1,
  resolveOfficialStartingSupplySlotsV1 } from
  "../rule-atoms/official-unit-card-supply-rules-kernel-v1.mjs";

export const ARMY_BUILDER_QUERY_PORT_MODULE =
  "packages/roster-strategist/army-builder-query-port-v1.mjs";
export const ARMY_BUILDER_QUERY_PORT_VERSION = "1.0.2";
// One scope for newly enumerated menus and read-only legacy menu navigation.
// An eligibility projection must not imply that omitted gameplay is absent.
export const ARMY_BUILDER_MENU_SOURCE_COVERAGE_V1 = Object.freeze({
  version:1,completeGameplayRules:false,
  includedDimensions:Object.freeze(['purchase_identity','eligibility','cost','composition','army_slots']),
  omittedRuleDimensions:Object.freeze(['card_abilities_and_payment','unit_and_upgrade_effects','weapons_and_timing']),
  instruction:'This menu enumerates purchase addresses, costs, compositions and slots, NOT complete gameplay effects. Missing effects in a row do not mean the component has no effect. In particular, a tactical card cannot be assessed as slot capacity only from armySlotsAdded. For a choice whose benefit depends on an omitted effect, read that component\'s exact frozen rule source, including its conditions/payment/timing. A relevant source-backed conditional trade-off is enough; no exhaustive card scan or experiment is required. Sources do not rank strategy, and this boundary neither mandates purchase nor certifies a tactical effect as executable.'
});
export function projectArmyBuilderMenuSourceCoverageV1(directory=[]){
  const menu=directory.find(e=>e.id==='product:builder-menu');
  if(!menu)return null;
  const ruleSources=directory.flatMap(e=>{
    const match=/^support-source:(tactical_cards:[^:]+):([a-f0-9]{64})$/u.exec(e.id);
    return match?[{recordKey:match[1],sourceRecordHash:match[2],
      evidenceNumber:e.number,artifactRef:e.artifactRef,pointer:'/rule',bodyRead:false}]:[];
  });
  return {kind:'builder_menu_source_coverage',...ARMY_BUILDER_MENU_SOURCE_COVERAGE_V1,
    menuEvidenceId:menu.id,menuArtifactRef:menu.artifactRef,ruleSources,
    navigationOnly:true,originalReceiptModified:false,
    sourceBoundary:'Use the existing read_evidence interface and delivered directory. These are exact source handles, not new observations, proof of having read a body, or permission to cite an unread rule. An empty source index is not proof that an effect does not exist.'};
}
// Deterministic purchase-space facts. These are not an audit of the extended
// army and never rank a card's effect. Selected rows cannot masquerade as the
// whole menu; a second copy of a selected card is deliberately not suggested.
export function projectArmyBuilderResourceOptionsV1({menu,candidateInput,amounts,menuSource=null}){
  if(menu?.faction?.recordKey!==candidateInput?.factionRecordKey
    ||menu?.scale?.scaleId!==candidateInput?.scaleId||menu?.mineralBudget!==candidateInput?.mineralBudget
    ||!Array.isArray(menu?.tacticalCandidates)||!Array.isArray(candidateInput?.tacticalCardRecordKeys)
    ||!['limit','spent','unspent'].every(k=>Number.isFinite(amounts?.[k])&&amounts[k]>=0))return null;
  const selected=new Set(candidateInput.tacticalCardRecordKeys),rows=menu.tacticalCandidates;
  const unselected=rows.filter(c=>!selected.has(c.recordKey));
  return {kind:'builder_unselected_card_budget_facts',version:2,source:structuredClone(menuSource),
    factionRecordKey:candidateInput.factionRecordKey,scaleId:candidateInput.scaleId,
    gasAmounts:structuredClone(amounts),selectedCardRecordKeys:[...selected],
    unselectedWithinGasBudget:unselected.filter(c=>Number.isFinite(c.vespeneGasCost)&&c.vespeneGasCost>=0&&c.vespeneGasCost<=amounts.unspent)
      .map(c=>{
        const pointer='/tacticalCandidates/'+rows.indexOf(c);
        const sourceAt=field=>menuSource?{...structuredClone(menuSource),pointer:pointer+'/'+field}:null;
        const grants=c.armySlotsAdded;
        const validGrants=object(grants)&&Object.keys(grants).length>0
          &&Object.values(grants).every(value=>Number.isInteger(value)&&value>=0);
        // The Native menu deliberately calls this armySlotsAdded. Preserve
        // that direction through the compact role view; it is NOT slot usage
        // or a purchase prerequisite. Missing source data stays unknown.
        return {recordKey:c.recordKey,cardName:c.cardName,vespeneGasCost:c.vespeneGasCost,
          gasAfterAddition:amounts.spent+c.vespeneGasCost,sourceCardProfileHash:c.sourceCardProfileHash,
          purchaseCost:{amount:c.vespeneGasCost,unit:'vespene_gas'},
          slotCapacityGranted:validGrants?clone(grants):null,
          factSources:{purchaseCost:sourceAt('vespeneGasCost'),
            slotCapacityGranted:validGrants?sourceAt('armySlotsAdded'):null},
          factCoverage:{slotCapacity:validGrants?'native_menu_capacity_grant'
            :grants===undefined||grants===null?'missing_source_field':'invalid_source_field',
            abilityUseCost:'not_provided_by_menu',purchaseRequirements:'requires_candidate_audit'}};
      }),
    unknownCostRecordKeys:unselected.filter(c=>!Number.isFinite(c.vespeneGasCost)).map(c=>c.recordKey),
    menuTruncated:menu.bounds?.truncated!==false,legalityApproved:false,strategyRanked:false,
    instruction:'These UNSELECTED frozen-menu cards fit the remaining gas by arithmetic only. Native Builder must audit an actual addition; other restrictions/effects/payment/timing are not proved by this list. Read the exact card sources from builder_menu_source_coverage before weighing their role. Selected cards are listed separately; judging only them cannot establish no relevant addition. No forced purchase, no assertion of a winning card, no duplicate-card permission and no new observation/accepted Plan.'};
}
export const ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1 = freezeDeep({
  type:'object',required:['sideKey','scaleId','mineralBudget','factionRecordKey','tacticalCardRecordKeys','units'],
  properties:{sideKey:{type:'string',minLength:1},scaleId:{type:'string',minLength:1,description:'Exact scaleId from the frozen scale catalogue'},
    mineralBudget:{type:'integer',minimum:0},factionRecordKey:{type:'string',minLength:1},
    tacticalCardRecordKeys:{type:'array',items:{type:'string',minLength:1}},
    units:{type:'array',minItems:1,maxItems:256,items:{type:'object',required:['unitInstanceId','recordKey','upgrades'],
      anyOf:[{required:['compositionProfileId']},{required:['compositionKind']}],
      properties:{unitInstanceId:{type:'string',minLength:1,description:'Choose an explicit unit identity, distinct within this candidate; used by the Plan and returned audit'},
        recordKey:{type:'string',minLength:1,description:'Exact unitCandidates[].recordKey'},
        compositionProfileId:{type:'string',minLength:1,description:'Select ONE exact unitCandidates[].compositionOptions[].compositionProfileId, not the array'},
        compositionKind:{type:'string',minLength:1,description:'Alternative: exact compositionKind from this unit\'s options'},
        startingModelIds:{type:'array',items:{type:'string',minLength:1},description:'Optional explicit model identities; omitted IDs are generated by the existing port'},
        upgrades:{type:'array',description:'Required even when empty. NOT purchasableUpgradeProfileIds: each selected upgrade is an object.',
          items:{type:'object',anyOf:[{required:['purchasableUpgradeProfileId']},{required:['upgradeName']}],
            properties:{purchasableUpgradeProfileId:{type:'string',minLength:1,description:'Exact unitCandidates[].purchasableUpgrades[].purchasableUpgradeProfileId'},
              upgradeName:{type:'string',minLength:1},upgradeInstanceId:{type:'string',minLength:1},nominatedModelId:{type:'string',minLength:1}}}}}}}},
  instruction:'This is candidate ADDRESSING, not a legality verdict. Keep all chosen cards/units/upgrades explicit; Native kernels alone judge eligibility, costs and slots. No missing identity/upgrade field is silently repaired.'
});
// Canonical selector values; query identity and defaults remain Host-owned.
export const ARMY_BUILDER_CHOICE_PARAMETERS_V1=Object.freeze({type:'object',additionalProperties:false,required:[],properties:{
 scaleId:{type:'string',minLength:1},factionRecordKey:{type:'string',minLength:1},mineralBudget:{type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER}
}});

export const ARMY_BUILDER_QUERY_PORT_DESCRIPTOR_SCHEMA =
  "starcraft_tmg_army_builder_query_port_descriptor_v1";
export const ARMY_BUILDER_ROSTER_VERDICT_SCHEMA =
  "starcraft_tmg_army_builder_roster_verdict_v1";
export const ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA =
  "starcraft_tmg_army_builder_rejection_receipt_v1";
export const armyBuilderConstraintDiagnosticEvidenceIdV1=originalArtifactRef=>
  'builder-constraint-diagnostic:'+hashStarcraftTmgContract({originalArtifactRef,version:1});
export const ARMY_BUILDER_SCALE_CATALOGUE_RECEIPT_SCHEMA =
  "starcraft_tmg_army_builder_scale_catalogue_receipt_v1";
export const ARMY_BUILDER_FACTION_CATALOGUE_RECEIPT_SCHEMA =
  "starcraft_tmg_army_builder_faction_catalogue_receipt_v1";
export const ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA =
  "starcraft_tmg_army_builder_choice_enumeration_receipt_v1";

export const ARMY_BUILDER_LEGALITY_AUTHORITY = Object.freeze({
  completeArmyAudit:
    "official-unit-composition-upgrade-rules-kernel-v1:resolveOfficialCompleteArmyCompositionUpgradeAuditV1",
  compositionUpgradeKernel: "official-unit-composition-upgrade-rules-kernel-v1",
  armyResourceBudgetKernel: "official-army-resource-budget-rules-kernel-v1",
  factionArmyEligibilityKernel: "official-faction-army-eligibility-rules-kernel-v1",
  cardBuildPaymentKernel: "official-card-build-payment-rules-kernel-v1",
});

const COMPLETE_ARMY_AUDIT_RESULT_SCHEMA =
  "starcraft_tmg_official_complete_army_composition_upgrade_audit_v1";
const DEFAULT_MAXIMUM_CANDIDATES_PER_FAMILY = 256;
const ABSOLUTE_MAXIMUM_CANDIDATES_PER_FAMILY = 1024;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const RULES_ERROR_PATTERN = /^([A-Z][A-Z0-9_]*)(?::([\s\S]*))?$/u;

const REJECTION_CLASSIFICATIONS = Object.freeze([
  { pattern: /^UNIQUE_UNIT_COPY_LIMIT_EXCEEDED/u, rejectionKind: "unique_unit" },
  { pattern: /^ARMY_MUTUALLY_EXCLUSIVE_UNITS/u, rejectionKind: "unit_variant" },
  { pattern: /^ARMY_EXACTLY_ONE_TACTICAL_GROUP_REQUIRED/u, rejectionKind: "tactical_group" },
  { pattern: /^FACTION_TAG_MISMATCH/u, rejectionKind: "faction_eligibility" },
  { pattern: /^EXACTLY_ONE_FACTION_CARD_REQUIRED/u, rejectionKind: "faction_card" },
  { pattern: /^SELECTED_FACTION_CARD_/u, rejectionKind: "faction_card" },
  { pattern: /^ARMY_SLOT_/u, rejectionKind: "army_slot_capacity" },
  { pattern: /^ARMY_MINERAL_BUDGET_/u, rejectionKind: "resource_budget" },
  { pattern: /^ARMY_VESPENE_BUDGET_/u, rejectionKind: "resource_budget" },
  { pattern: /^TEAM_MINERAL_BUDGET_/u, rejectionKind: "resource_budget" },
  { pattern: /^UNIT_SPECIALIST_/u, rejectionKind: "specialist_assignment" },
  { pattern: /^UNIT_COMPOSITION_/u, rejectionKind: "unit_composition" },
  { pattern: /^UNIT_UPGRADE_/u, rejectionKind: "unit_upgrade" },
  { pattern: /^UNIT_PURCHASABLE_/u, rejectionKind: "unit_upgrade" },
  { pattern: /^PURCHASABLE_UPGRADE_PROFILE_/u, rejectionKind: "unit_upgrade" },
  { pattern: /^COMPLETE_ARMY_UNIT_NOT_FIELDABLE/u, rejectionKind: "fieldability" },
  { pattern: /_REQUEST_INVALID$/u, rejectionKind: "request_shape" },
]);

export function classifyArmyBuilderRulesErrorV1(rulesErrorCode) {
  const code = String(rulesErrorCode || "");
  for (const entry of REJECTION_CLASSIFICATIONS) {
    if (entry.pattern.test(code)) {
      return Object.freeze({ status: "illegal", rejectionKind: entry.rejectionKind });
    }
  }
  return Object.freeze({ status: "unknown", rejectionKind: "unknown_rules_outcome" });
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function nonNegativeInteger(value, code) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) fail(code);
  return number;
}
function hashedReceipt(body, hashField) {
  return freezeDeep({ ...body, [hashField]: hashStarcraftTmgContract(body) });
}

class CandidateAddressingFault extends Error {
  constructor(code, detail = "") {
    super(detail ? `${code}:${detail}` : code);
    this.candidateFaultCode = code;
    this.candidateFaultDetail = detail;
  }
}
function candidateFail(code, detail = "") {
  throw new CandidateAddressingFault(code, detail);
}
function candidateUnitAddressIssues(unit,index){
  const path='/units/'+index,contract=ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1.properties.units.items;
  if(!object(unit))return [{path,expected:contract,receivedType:typeof unit}];
  const issues=[];
  for(const key of ['unitInstanceId','recordKey'])if(!String(unit[key]||'').trim())
    issues.push({path:path+'/'+key,expected:contract.properties[key],receivedKeys:Object.keys(unit)});
  if(!Array.isArray(unit.upgrades))issues.push({path:path+'/upgrades',expected:contract.properties.upgrades,receivedKeys:Object.keys(unit)});
  if(unit.compositionProfileId==null&&!String(unit.compositionKind||'').trim())
    issues.push({path,expected:contract.anyOf,receivedKeys:Object.keys(unit)});
  return issues;
}

function factionLayout(profile) {
  return { recordKey: profile.recordKey, cardId: profile.cardId,
    factionName: profile.factionName, raceTag: profile.raceTag,
    factionTags: [...profile.factionTags], subFactionTags: [...profile.subFactionTags],
    startingArmySlots: clone(profile.startingArmySlots),
    profileHash: profile.profileHash };
}

// The design preflight consumes the frozen Builder menu; execution consumes
// the full frozen bundle. Both must resolve purchase identities identically.
// This only addresses a selection. Rules still judge eligibility/cost/slots.
export function resolveArmyBuilderPurchasableUpgradeV1(profiles,recordKey,rawUpgrade) {
  if (rawUpgrade.purchasableUpgradeProfileId !== undefined
    && rawUpgrade.purchasableUpgradeProfileId !== null) {
    return profiles.find(entry => entry.purchasableUpgradeProfileId
      === String(rawUpgrade.purchasableUpgradeProfileId)) || null;
  }
  const upgradeName = nonEmpty(rawUpgrade.upgradeName,
    'ARMY_BUILDER_CANDIDATE_UPGRADE_UNKNOWN');
  const profile = profiles.find(entry => entry.recordKey === recordKey
    && entry.upgradeName === upgradeName) || null;
  if (!profile) candidateFail('ARMY_BUILDER_CANDIDATE_UPGRADE_UNKNOWN',`${recordKey}:${upgradeName}`);
  return profile;
}

export function createOfficialArmyBuilderQueryPortV1(input = {}) {
  const bundle = input.unitCompositionUpgradeDataBundle;
  verifyOfficialUnitCompositionUpgradeDataBundleV1(bundle);
  const manifest = input.releaseContext?.manifest;
  let releaseBinding = null;
  if (manifest) {
    if (manifest.source?.snapshotHash !== bundle.sourceSnapshotHash
      || manifest.source?.datasetHash !== bundle.normalizedDatasetHash) {
      fail('ARMY_BUILDER_RELEASE_SOURCE_MISMATCH');
    }
    releaseBinding = { releaseId: manifest.releaseId, manifestHash: manifest.manifestHash,
      sourceSnapshotHash: bundle.sourceSnapshotHash, normalizedDatasetHash: bundle.normalizedDatasetHash };
  }
  if (!Object.isFrozen(bundle)) {
    fail("ARMY_BUILDER_PORT_BUNDLE_NOT_FROZEN");
  }
  const portId = nonEmpty(input.portId || "official-army-builder-query-port-v1",
    "ARMY_BUILDER_PORT_INVALID");
  const armyBundle = bundle.armyResourceBudgetDataBundle;
  const factionBundle = armyBundle.factionArmyEligibilityDataBundle;
  const unitFacts = input.unitCardSupplyDataBundle
    || input.releaseContext?.resources?.unitCharacteristics || null;
  if (unitFacts) {
    verifyOfficialUnitCardSupplyDataBundleV1(unitFacts);
    const purchaseUnits = factionBundle.unitDataBundle;
    if (unitFacts.sourceSnapshotHash !== bundle.sourceSnapshotHash
      || unitFacts.normalizedDatasetHash !== bundle.normalizedDatasetHash
      || unitFacts.unitProfiles.length !== purchaseUnits.unitProfiles.length
      || (input.releaseContext?.resources?.unitCharacteristics
        && input.releaseContext.resources.unitCharacteristics.bundleHash !== unitFacts.bundleHash)) {
      fail("ARMY_BUILDER_UNIT_FACTS_SOURCE_MISMATCH");
    }
    for (const facts of unitFacts.unitProfiles) {
      const purchase = purchaseUnits.unitProfiles.find(row => row.recordKey === facts.recordKey);
      if (!purchase || purchase.sourceRecordHash !== facts.sourceRecordHash
        || purchase.payloadHash !== facts.payloadHash
        || hashStarcraftTmgContract(purchase.compositions) !== hashStarcraftTmgContract(facts.compositions)
        || hashStarcraftTmgContract(purchase.supplyProfile) !== hashStarcraftTmgContract(facts.supplyProfile)) {
        fail("ARMY_BUILDER_UNIT_FACTS_CONTENT_MISMATCH", facts.recordKey);
      }
    }
  }
  const descriptorBody = {
    schema: ARMY_BUILDER_QUERY_PORT_DESCRIPTOR_SCHEMA,
    portId,
    version: ARMY_BUILDER_QUERY_PORT_VERSION,
    readOnly: true,
    mutatesRoomState: false,
    mutatesSourceData: false,
    reimplementsRules: false,
    silentRepairOrFallback: false,
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
    unknownStaysUnknown: true,
    legalityAuthority: { ...ARMY_BUILDER_LEGALITY_AUTHORITY },
    candidateInputContract: clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1),
    unitCompositionUpgradeDataBundleHash: bundle.bundleHash,
    armyResourceBudgetDataBundleHash: armyBundle.bundleHash,
    factionArmyEligibilityDataBundleHash: factionBundle.bundleHash,
    providerCalls: 0,
    trainingTruth: false,
    ...(releaseBinding ? { releaseBinding } : {}),
    ...(bundle.sourceBinding ? { sourceBinding: clone(bundle.sourceBinding), usageScope: 'army_building' } : {}),
    ...(unitFacts ? { unitCardSupplyDataBundleHash: unitFacts.bundleHash,
      unitFactsQuery: "inspectUnitCardSupply" } : {}),
  };
  const descriptor = freezeDeep({ ...descriptorBody,
    descriptorHash: hashStarcraftTmgContract(descriptorBody) });

  function sharedReceiptFields() {
    return { portId, portVersion: ARMY_BUILDER_QUERY_PORT_VERSION,
      ...(releaseBinding ? { releaseBinding: clone(releaseBinding) } : {}),
      ...(bundle.sourceBinding ? { sourceBinding: clone(bundle.sourceBinding) } : {}),
      candidateInputContract: clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1),
      unitCompositionUpgradeDataBundleHash: bundle.bundleHash,
      readOnly: true, providerCalls: 0, trainingTruth: false };
  }

  function findFactionProfile(recordKey, code) {
    const profile = factionBundle.factionProfiles.find((entry) => (
      entry.recordKey === recordKey));
    if (!profile) candidateFail(code, String(recordKey || ""));
    return profile;
  }

  function inspectUnitCardSupply(request = {}) {
    if (!unitFacts) fail("ARMY_BUILDER_UNIT_FACTS_NOT_BOUND");
    if (!object(request) || Object.keys(request).some(key => !["recordKey", "currentModels"].includes(key))
      || typeof request.recordKey !== "string" || !request.recordKey
      || !Number.isSafeInteger(request.currentModels) || request.currentModels < 0) {
      fail("ARMY_BUILDER_UNIT_FACTS_REQUEST_INVALID");
    }
    const shared = { unitCardSupplyDataBundle: unitFacts, recordKey: request.recordKey };
    const layout = resolveOfficialUnitCardLayoutV1({ ...shared, rulesOwnedLayoutRequested: true });
    const profile = unitFacts.unitProfiles.find(row => row.recordKey === request.recordKey);
    return hashedReceipt({ schema: "starcraft_tmg_army_builder_unit_supply_receipt_v2",
      ...sharedReceiptFields(), unitCardSupplyDataBundleHash: unitFacts.bundleHash,
      declaredModelCount: request.currentModels, actualRoomStateRead: false,
      layout, currentSupply: resolveOfficialCurrentSupplyValueV1({ ...shared,
        currentModels: request.currentModels, isDestroyed: request.currentModels === 0,
        rulesOwnedCurrentModelCountRequested: true }),
      startingCompositions: profile.compositions.map(row => resolveOfficialStartingSupplySlotsV1({
        ...shared, compositionKind: row.kind, rulesOwnedCompositionRequested: true })),
      provesMovementLegality: false, provesMarkerControl: false,
    }, "receiptHash");
  }

  function listEngagementScales() {
    const body = { schema: ARMY_BUILDER_SCALE_CATALOGUE_RECEIPT_SCHEMA,
      ...sharedReceiptFields(),
      scales: factionBundle.engagementScales.map((entry) => clone(entry)),
      scaleCount: factionBundle.engagementScales.length };
    return hashedReceipt(body, "receiptHash");
  }

  function listFactionChoices() {
    const factions = factionBundle.factionProfiles.map((entry) => factionLayout(entry))
      .sort((left, right) => left.recordKey.localeCompare(right.recordKey));
    const body = { schema: ARMY_BUILDER_FACTION_CATALOGUE_RECEIPT_SCHEMA,
      ...sharedReceiptFields(), factions, factionCount: factions.length };
    return hashedReceipt(body, "receiptHash");
  }

  function enumerateArmyBuildingChoices(query = {}) {
    if (!object(query)) fail("ARMY_BUILDER_ENUMERATION_REQUEST_INVALID");
    const scaleId = nonEmpty(query.scaleId, "ARMY_BUILDER_ENUMERATION_SCALE_REQUIRED");
    const scale = factionBundle.engagementScales.find((entry) => (
      entry.scaleId === scaleId));
    if (!scale) fail("ARMY_BUILDER_ENUMERATION_SCALE_UNKNOWN", scaleId);
    const faction = findFactionProfile(nonEmpty(query.factionRecordKey,
      "ARMY_BUILDER_ENUMERATION_FACTION_REQUIRED"),
      "ARMY_BUILDER_ENUMERATION_FACTION_UNKNOWN");
    const bound = query.maximumCandidatesPerFamily === undefined
      ? DEFAULT_MAXIMUM_CANDIDATES_PER_FAMILY
      : nonNegativeInteger(query.maximumCandidatesPerFamily,
        "ARMY_BUILDER_ENUMERATION_BOUND_INVALID");
    if (bound < 1 || bound > ABSOLUTE_MAXIMUM_CANDIDATES_PER_FAMILY) {
      fail("ARMY_BUILDER_ENUMERATION_BOUND_INVALID", String(bound));
    }
    let mineralBudget = null;
    if (query.mineralBudget !== undefined && query.mineralBudget !== null) {
      mineralBudget = nonNegativeInteger(query.mineralBudget,
        "ARMY_BUILDER_ENUMERATION_BUDGET_INVALID");
    }
    const eligibleRows = factionBundle.eligibilityMatrix.filter((entry) => (
      entry.factionRecordKey === faction.recordKey && entry.eligible));
    const tacticalCandidates = eligibleRows
      .filter((entry) => entry.candidateKind === "tactical")
      .map((row) => {
        const budgetProfile = armyBundle.tacticalBudgetProfiles.find((entry) => (
          entry.recordKey === row.candidateRecordKey));
        if (!budgetProfile) {
          fail("ARMY_BUILDER_ENUMERATION_SOURCE_INCOMPLETE", row.candidateRecordKey);
        }
        return { recordKey: row.candidateRecordKey, cardId: budgetProfile.cardId,
          cardName: budgetProfile.cardName, vespeneGasCost: budgetProfile.vespeneGasCost,
          armySlotsAdded: clone(budgetProfile.armySlotsAdded),
          sourceCardProfileHash: budgetProfile.sourceCardProfileHash,
          budgetProfileHash: budgetProfile.budgetProfileHash };
      }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
    const unitCandidates = eligibleRows
      .filter((entry) => entry.candidateKind === "unit")
      .map((row) => {
        const unit = bundle.unitCompositionProfiles.find((entry) => (
          entry.recordKey === row.candidateRecordKey));
        if (!unit) {
          fail("ARMY_BUILDER_ENUMERATION_SOURCE_INCOMPLETE", row.candidateRecordKey);
        }
        const upgrades = bundle.purchasableUpgradeProfiles
          .filter((entry) => entry.recordKey === unit.recordKey)
          .map((entry) => ({
            purchasableUpgradeProfileId: entry.purchasableUpgradeProfileId,
            upgradeName: entry.upgradeName,
            applicationKind: entry.applicationKind,
            specialistAssignmentRequired: entry.specialistAssignmentRequired,
            replacementTargetName: entry.replacementTargetName,
            mineralCostByComposition: clone(entry.mineralCostByComposition),
            profileHash: entry.profileHash }));
        return { recordKey: unit.recordKey, unitId: unit.unitId,
          unitName: unit.unitName, factionTag: unit.factionTag,
          ...(bundle.sourceBinding ? { isUnique: factionBundle.armyCandidateProfiles
            .find(entry => entry.recordKey === unit.recordKey)?.isUnique === true } : {}),
          armySlotType: unit.armySlotType,
          unitCompositionReferenceProfileHash: unit.profileHash,
          compositionOptions: unit.compositionOptions.map((option) => ({
            compositionProfileId: option.compositionProfileId,
            compositionKind: option.compositionKind,
            startingModels: option.startingModels,
            startingSupply: option.startingSupply,
            occupiedArmySlots: option.occupiedArmySlots,
            mineralCost: option.mineralCost,
            mineralCostReconciliation: option.mineralCostReconciliation,
            profileHash: option.profileHash })),
          purchasableUpgrades: upgrades };
      }).sort((left, right) => left.recordKey.localeCompare(right.recordKey));
    if (tacticalCandidates.length > bound || unitCandidates.length > bound) {
      fail("ARMY_BUILDER_ENUMERATION_BOUND_EXCEEDED", String(bound));
    }
    const compositionOptionCount = unitCandidates.reduce((sum, entry) => (
      sum + entry.compositionOptions.length), 0);
    const purchasableUpgradeCount = unitCandidates.reduce((sum, entry) => (
      sum + entry.purchasableUpgrades.length), 0);
    const body = { schema: ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA,
      ...sharedReceiptFields(),
      faction: factionLayout(faction), scale: clone(scale),
      ...(bundle.sourceBinding ? { armyBuildingConstraints: clone(factionBundle.armyBuildingConstraints) } : {}),
      mineralBudget,
      vespeneLimitForBudget: mineralBudget === null ? null : {
        numerator: mineralBudget * scale.vespeneRatio.numerator,
        denominator: scale.vespeneRatio.denominator },
      tacticalCandidates, unitCandidates,
      sourceCoverage: clone(ARMY_BUILDER_MENU_SOURCE_COVERAGE_V1),
      denominators: { eligibleTacticalCount: tacticalCandidates.length,
        eligibleUnitCount: unitCandidates.length, compositionOptionCount,
        purchasableUpgradeCount,
        specialistUpgradeCount: unitCandidates.reduce((sum, entry) => sum
          + entry.purchasableUpgrades.filter((upgrade) => (
            upgrade.specialistAssignmentRequired)).length, 0) },
      bounds: { maximumCandidatesPerFamily: bound, truncated: false },
      legalityNote: "choices_are_eligibility_candidates_only_rules_kernels_remain_sole_legality_authority" };
    return hashedReceipt(body, "receiptHash");
  }

  function resolveCandidateKernelInput(candidate) {
    if (!object(candidate)) candidateFail("ARMY_BUILDER_CANDIDATE_INVALID");
    const sideKey = nonEmpty(candidate.sideKey, "ARMY_BUILDER_CANDIDATE_SIDE_REQUIRED");
    const scaleId = nonEmpty(candidate.scaleId, "ARMY_BUILDER_CANDIDATE_SCALE_REQUIRED");
    if (!factionBundle.engagementScales.some((entry) => entry.scaleId === scaleId)) {
      candidateFail("ARMY_BUILDER_CANDIDATE_SCALE_UNKNOWN", scaleId);
    }
    const mineralBudget = nonNegativeInteger(candidate.mineralBudget,
      "ARMY_BUILDER_CANDIDATE_BUDGET_INVALID");
    const faction = findFactionProfile(nonEmpty(candidate.factionRecordKey,
      "ARMY_BUILDER_CANDIDATE_FACTION_REQUIRED"),
      "ARMY_BUILDER_CANDIDATE_FACTION_UNKNOWN");
    const factionCard = { cardInstanceId: `${sideKey}-faction`,
      recordKey: faction.recordKey, sourceRecordHash: faction.sourceRecordHash,
      payloadHash: faction.payloadHash, profileHash: faction.profileHash };
    if (!Array.isArray(candidate.tacticalCardRecordKeys)) {
      candidateFail("ARMY_BUILDER_CANDIDATE_TACTICAL_LIST_INVALID");
    }
    const tacticalCardInstances = candidate.tacticalCardRecordKeys
      .map((rawKey, index) => {
        const recordKey = nonEmpty(rawKey,
          "ARMY_BUILDER_CANDIDATE_TACTICAL_CARD_UNKNOWN");
        const profile = armyBundle.tacticalBudgetProfiles.find((entry) => (
          entry.recordKey === recordKey));
        if (!profile) {
          candidateFail("ARMY_BUILDER_CANDIDATE_TACTICAL_CARD_UNKNOWN", recordKey);
        }
        return { cardInstanceId: `${sideKey}-tactical-${index + 1}`, recordKey,
          sourceRecordHash: profile.sourceRecordHash, payloadHash: profile.payloadHash,
          budgetProfileHash: profile.budgetProfileHash };
      });
    if (!Array.isArray(candidate.units) || candidate.units.length === 0
      || candidate.units.length > 256) {
      candidateFail("ARMY_BUILDER_CANDIDATE_UNIT_LIST_INVALID");
    }
    const addressIssues=candidate.units.flatMap(candidateUnitAddressIssues);
    if(addressIssues.length)candidateFail('ARMY_BUILDER_CANDIDATE_UNIT_INVALID',{issues:addressIssues,
      correctionInstruction:'Use candidateInputContract. Supply explicit unitInstanceId and upgrades objects (or []), and one composition selection. Do not guess another profile ID to repair a missing field; selected values are not changed by Host.'});
    const allCompositionOptions = bundle.unitCompositionProfiles
      .flatMap((entry) => entry.compositionOptions);
    const unitSelections = candidate.units.map((rawUnit) => {
      if (!object(rawUnit)) candidateFail("ARMY_BUILDER_CANDIDATE_UNIT_INVALID");
      const unitInstanceId = nonEmpty(rawUnit.unitInstanceId,
        "ARMY_BUILDER_CANDIDATE_UNIT_INVALID");
      const recordKey = nonEmpty(rawUnit.recordKey,
        "ARMY_BUILDER_CANDIDATE_UNIT_UNKNOWN");
      const unit = bundle.unitCompositionProfiles.find((entry) => (
        entry.recordKey === recordKey));
      if (!unit) candidateFail("ARMY_BUILDER_CANDIDATE_UNIT_UNKNOWN", recordKey);
      let option;
      if (rawUnit.compositionProfileId !== undefined
        && rawUnit.compositionProfileId !== null) {
        option = allCompositionOptions.find((entry) => (
          entry.compositionProfileId === String(rawUnit.compositionProfileId)));
        if (!option) {
          candidateFail("ARMY_BUILDER_CANDIDATE_COMPOSITION_PROFILE_UNKNOWN",
            String(rawUnit.compositionProfileId));
        }
      } else {
        const compositionKind = nonEmpty(rawUnit.compositionKind,
          "ARMY_BUILDER_CANDIDATE_COMPOSITION_UNKNOWN");
        option = unit.compositionOptions.find((entry) => (
          entry.compositionKind === compositionKind));
        if (!option) {
          candidateFail("ARMY_BUILDER_CANDIDATE_COMPOSITION_UNKNOWN",
            `${recordKey}:${compositionKind}`);
        }
      }
      let startingModelIds;
      if (rawUnit.startingModelIds !== undefined) {
        if (!Array.isArray(rawUnit.startingModelIds)
          || rawUnit.startingModelIds.some((entry) => typeof entry !== "string"
            || !entry.trim())) {
          candidateFail("ARMY_BUILDER_CANDIDATE_MODEL_IDS_INVALID", unitInstanceId);
        }
        startingModelIds = [...rawUnit.startingModelIds];
      } else {
        startingModelIds = Array.from({ length: option.startingModels },
          (_unused, index) => `${unitInstanceId}-model-${index + 1}`);
      }
      if (!Array.isArray(rawUnit.upgrades)) {
        candidateFail("ARMY_BUILDER_CANDIDATE_UPGRADE_LIST_INVALID", unitInstanceId);
      }
      const assignedSpecialistModelIds = new Set();
      const selectedUpgrades = rawUnit.upgrades.map((rawUpgrade, index) => {
        if (!object(rawUpgrade)) {
          candidateFail("ARMY_BUILDER_CANDIDATE_UPGRADE_INVALID", unitInstanceId);
        }
        const profile = resolveArmyBuilderPurchasableUpgradeV1(
          bundle.purchasableUpgradeProfiles, recordKey, rawUpgrade);
        const entry = {
          upgradeInstanceId: rawUpgrade.upgradeInstanceId === undefined
            ? `${unitInstanceId}-upgrade-${index + 1}`
            : nonEmpty(rawUpgrade.upgradeInstanceId,
              "ARMY_BUILDER_CANDIDATE_UPGRADE_INVALID"),
          purchasableUpgradeProfileId: profile
            ? profile.purchasableUpgradeProfileId
            : String(rawUpgrade.purchasableUpgradeProfileId),
          profileHash: profile ? profile.profileHash : null,
          sourceDefinitionHash: profile ? profile.sourceDefinitionHash : null,
          sourceBudgetProfileHash: profile ? profile.sourceBudgetProfileHash : null,
        };
        if (Object.hasOwn(rawUpgrade, "nominatedModelId")) {
          entry.nominatedModelId = rawUpgrade.nominatedModelId;
        } else if (profile?.specialistAssignmentRequired) {
          const available = startingModelIds.filter((modelId) => (
            !assignedSpecialistModelIds.has(modelId)));
          if (available.length === 0) {
            candidateFail("ARMY_BUILDER_CANDIDATE_SPECIALIST_MODEL_UNAVAILABLE",
              unitInstanceId);
          }
          entry.nominatedModelId = available[0];
        }
        if (entry.nominatedModelId !== undefined && entry.nominatedModelId !== null) {
          assignedSpecialistModelIds.add(String(entry.nominatedModelId));
        }
        return entry;
      });
      return { unitCompositionInput: {
        unitInstanceId, recordKey,
        compositionProfileId: option.compositionProfileId, startingModelIds,
        sourceRecordHash: unit.sourceRecordHash, payloadHash: unit.payloadHash,
        sourceUnitProfileHash: unit.sourceUnitProfileHash,
        unitCompositionReferenceProfileHash: unit.profileHash,
        compositionProfileHash: option.profileHash,
        rulesOwnedCompositionRequested: true, exactlyOneCompositionSelected: true,
      }, selectedUpgrades, upgradeSelectionSetComplete: true };
    });
    return { procedureKind: "complete_army_composition_upgrade_audit",
      unitCompositionUpgradeDataBundle: bundle,
      compositionUpgradeUnitSetComplete: true,
      rulesOwnedCompleteArmyAuditRequested: true,
      unitSelections,
      armyResourceBudgetInput: {
        sideKey, scaleId, mineralBudget, factionCard, tacticalCardInstances,
        armyPurchaseSetComplete: true, rulesOwnedResourceArithmeticRequested: true,
        unspentResourceDisposition: "lost", resourceConversionRequested: false,
      } };
  }

  function rejectionReceipt(body) {
    return hashedReceipt({ schema: ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA,
      ...sharedReceiptFields(), silentRepairAttempted: false,
      fallbackApplied: false, sourceRefreshPerformed: false, ...body },
      "receiptHash");
  }

  function evaluateRosterCandidate(candidateInput = {}) {
    const candidateHash = hashStarcraftTmgContract(clone(candidateInput));
    let kernelInput;
    try {
      kernelInput = resolveCandidateKernelInput(candidateInput);
    } catch (error) {
      // Shared scalar/profile validators use ordinary Error, unlike the
      // candidate-specific guards. Both describe model-owned input here.
      // Source/configuration faults and arbitrary exceptions still propagate.
      const scalarFault = /^(ARMY_BUILDER_CANDIDATE_[A-Z0-9_]+)(?::([\s\S]*))?$/u
        .exec(String(error?.message || ''));
      if (error instanceof CandidateAddressingFault || scalarFault) {
        return rejectionReceipt({ status: "invalid_candidate",
          rejectionKind: "candidate_addressing",
          portErrorCode: error.candidateFaultCode || scalarFault[1],
          portErrorDetail: error.candidateFaultDetail || scalarFault?.[2] || "",
          rulesErrorCode: null, rulesErrorDetail: null,
          rulesAuthority: null, candidateHash });
      }
      throw error;
    }
    let audit;
    try {
      audit = resolveOfficialCompleteArmyCompositionUpgradeAuditV1(kernelInput);
    } catch (error) {
      const message = String(error?.message || error || "");
      const parsed = RULES_ERROR_PATTERN.exec(message);
      const rulesErrorCode = parsed ? parsed[1] : "UNSTRUCTURED_RULES_ERROR";
      const rulesErrorDetail = parsed?.[2] ?? null;
      const classification = classifyArmyBuilderRulesErrorV1(rulesErrorCode);
      return rejectionReceipt({ status: classification.status,
        rejectionKind: classification.rejectionKind,
        portErrorCode: null, portErrorDetail: null,
        rulesErrorCode, rulesErrorDetail,
        ...(error.constraintDiagnostics?{constraintDiagnostics:clone(error.constraintDiagnostics)}:{}),
        rawRulesErrorMessage: message,
        rulesAuthority: ARMY_BUILDER_LEGALITY_AUTHORITY.completeArmyAudit,
        candidateHash });
    }
    verifyOfficialUnitCompositionUpgradeResultV1(audit,
      COMPLETE_ARMY_AUDIT_RESULT_SCHEMA);
    const body = { schema: ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
      ...sharedReceiptFields(), status: "legal",
      candidateHash, auditResultHash: audit.resultHash, audit: clone(audit),
      summary: { sideKey: audit.sideKey, unitCount: audit.unitCount,
        startingModelCount: audit.startingModelCount,
        startingSupply: audit.startingSupply,
        selectedUpgradeCount: audit.selectedUpgradeCount,
        mineralBudget: audit.armyResourceBudgetResult.mineralBudget,
        mineralSpent: audit.armyResourceBudgetResult.mineralSpent,
        mineralUnspent: audit.armyResourceBudgetResult.mineralUnspent,
        vespeneSpent: audit.armyResourceBudgetResult.vespeneSpent,
        scaleId: audit.armyResourceBudgetResult.scale.scaleId },
      rulesAuthority: ARMY_BUILDER_LEGALITY_AUTHORITY.completeArmyAudit,
      portReimplementedRules: false, clientSuppliedLegalityAccepted: false };
    return hashedReceipt(body, "verdictHash");
  }

  return freezeDeep({
    portDescriptor: () => descriptor,
    listEngagementScales,
    listFactionChoices,
    enumerateArmyBuildingChoices,
    evaluateRosterCandidate,
    ...(unitFacts ? { inspectUnitCardSupply } : {}),
  });
}

export function verifyOfficialArmyBuilderQueryPortDescriptorV1(descriptor) {
  if (!object(descriptor) || descriptor.schema !== ARMY_BUILDER_QUERY_PORT_DESCRIPTOR_SCHEMA
    || descriptor.descriptorHash !== hashStarcraftTmgContract(
      without(descriptor, ["descriptorHash"]))
    || descriptor.readOnly !== true || descriptor.mutatesRoomState !== false
    || descriptor.mutatesSourceData !== false || descriptor.reimplementsRules !== false
    || descriptor.silentRepairOrFallback !== false
    || descriptor.sourceRefreshPerformed !== false
    || descriptor.repositoryFallbackUsed !== false
    || descriptor.unknownStaysUnknown !== true
    || descriptor.providerCalls !== 0 || descriptor.trainingTruth !== false
    || !HASH_PATTERN.test(String(descriptor.unitCompositionUpgradeDataBundleHash))
    || !HASH_PATTERN.test(String(descriptor.armyResourceBudgetDataBundleHash))
    || !HASH_PATTERN.test(String(descriptor.factionArmyEligibilityDataBundleHash))) {
    fail("ARMY_BUILDER_PORT_DESCRIPTOR_INVALID");
  }
  return true;
}

export function verifyArmyBuilderRosterVerdictV1(verdict) {
  if (!object(verdict) || verdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA
    || verdict.status !== "legal"
    || verdict.verdictHash !== hashStarcraftTmgContract(
      without(verdict, ["verdictHash"]))
    || !HASH_PATTERN.test(String(verdict.auditResultHash))
    || verdict.portReimplementedRules !== false
    || verdict.clientSuppliedLegalityAccepted !== false
    || verdict.providerCalls !== 0 || verdict.trainingTruth !== false) {
    fail("ARMY_BUILDER_ROSTER_VERDICT_INVALID");
  }
  verifyOfficialUnitCompositionUpgradeResultV1(verdict.audit,
    COMPLETE_ARMY_AUDIT_RESULT_SCHEMA);
  if (verdict.audit.resultHash !== verdict.auditResultHash) {
    fail("ARMY_BUILDER_ROSTER_VERDICT_INVALID");
  }
  return true;
}

export function verifyArmyBuilderRejectionReceiptV1(receipt) {
  if (!object(receipt) || receipt.schema !== ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA
    || receipt.receiptHash !== hashStarcraftTmgContract(
      without(receipt, ["receiptHash"]))
    || !["illegal", "unknown", "invalid_candidate"].includes(receipt.status)
    || receipt.silentRepairAttempted !== false || receipt.fallbackApplied !== false
    || receipt.sourceRefreshPerformed !== false
    || receipt.providerCalls !== 0 || receipt.trainingTruth !== false) {
    fail("ARMY_BUILDER_REJECTION_RECEIPT_INVALID");
  }
  if (receipt.status === "invalid_candidate") {
    if (!receipt.portErrorCode || receipt.rulesErrorCode !== null) {
      fail("ARMY_BUILDER_REJECTION_RECEIPT_INVALID");
    }
  } else if (!receipt.rulesErrorCode || !receipt.rulesAuthority) {
    fail("ARMY_BUILDER_REJECTION_RECEIPT_INVALID");
  }
  return true;
}
