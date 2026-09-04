import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1 as CURRENT_RULES } from
  "../client-domain/official-faq-current-client-contract-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyRuleAtomCatalogue } from
  "../rule-atoms/rule-atom-catalogue-v1.mjs";

export const CURRENT_OFFICIAL_SKILL_EVIDENCE_SCHEMA =
  "starcraft_tmg_current_official_skill_evidence_catalogue_v1";
export const CURRENT_OFFICIAL_SKILL_CURRICULUM_SCHEMA =
  "starcraft_tmg_current_official_skill_curriculum_v1";
export const CURRENT_OFFICIAL_SKILL_QUESTION_TREE_SCHEMA =
  "starcraft_tmg_current_official_skill_question_tree_v1";
export const CURRENT_OFFICIAL_SKILL_STAGED_INPUT_SCHEMA =
  "starcraft_tmg_current_official_skill_staged_input_v1";
export const CURRENT_OFFICIAL_SKILL_EVIDENCE_CATALOGUE_HASH =
  "8fa844c497429c416fcff354da8707341812cdb7190570175a472eee4846fecd";
export const CURRENT_OFFICIAL_SKILL_CURRICULUM_HASH =
  "fa8602b4e18c27e79c89f05ad6dfdd2b21f3d1ee4eb931da684e45fc920eeb48";
export const CURRENT_OFFICIAL_SKILL_QUESTION_TREE_HASH =
  "2ea00d190e9ffc9054a3112cac730dc899cea91f27da7ec6b2f578214c67a68e";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SOURCE_TYPES = Object.freeze(["unit", "tactical_card", "mission", "deployment"]);
const FAMILIES = Object.freeze(["how_to_play", "mission", "faction", "matchup"]);
const FAMILY_QUESTION_TEMPLATES = Object.freeze({
  how_to_play:
    "Explain this rule atom's timing, legal preconditions, effect, rejection boundaries, and evidence without inventing missing behavior.",
  mission:
    "Explain how to set up, play, score, and finish this mission on compatible deployment maps, citing only staged current evidence.",
  faction:
    "Explain this faction archetype's roster, cards, upgrades, resource plan, unit roles, and rules-bound interactions from staged evidence.",
  matchup:
    "Explain the directed matchup plan for the own archetype against the opponent archetype, including threats, counterplay, uncertainty, and cited evidence.",
});
const ROLE_SEQUENCE = Object.freeze([
  "tutor",
  "student",
  "challenger",
  "reasoner",
  "fact_judge",
  "proposer",
  "generator",
  "cross_time_gate",
]);
const RULE_SELECTORS = Object.freeze({
  mission: /mission|deploy|score|scoring|victory|marker|initiative|game[-_ ]?end|end[-_ ]?game/iu,
  faction: /faction|army|roster|supply|card|upgrade|composition|slot|build|resource/iu,
  matchup: /attack|combat|damage|move|range|line[-_ ]?of[-_ ]?sight|\blos\b|terrain|threat|target|charge|engage|weapon|defen[cs]e/iu,
});

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function hashEnvelope(body, hashKey) {
  return { ...body, [hashKey]: hashStarcraftTmgContract(body) };
}

function assertHashEnvelope(value, hashKey, code) {
  if (!object(value) || !HASH_PATTERN.test(String(value[hashKey] || ""))
    || value[hashKey] !== hashStarcraftTmgContract(without(value, [hashKey]))) {
    fail(code);
  }
}

function assertCurrentDataset(dataset) {
  if (!object(dataset)
    || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.dataVersions?.unitsVersion !== "71"
    || dataset.dataVersions?.cardsVersion !== "69"
    || dataset.dataVersions?.rulesVersion !== "48"
    || dataset.repositoryFallbackAllowed !== false
    || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) {
    fail("CURRENT_OFFICIAL_SKILL_DATASET_INVALID");
  }
}

function assertCurrentRulesAggregate(aggregate) {
  if (!object(aggregate)
    || aggregate.aggregateHash !== CURRENT_RULES.aggregateHash
    || aggregate.catalogue?.catalogueHash !== CURRENT_RULES.catalogueHash
    || aggregate.runtime?.runtimeHash !== CURRENT_RULES.runtimeHash
    || aggregate.graph?.graphHash !== CURRENT_RULES.graphHash
    || aggregate.sourceLockHash !== CURRENT_RULES.sourceLockHash
    || aggregate.reconciliationHash !== CURRENT_RULES.reconciliationHash
    || aggregate.totalAtomCount !== CURRENT_RULES.counts.atomCount
    || aggregate.executableAtomCount !== CURRENT_RULES.counts.executableAtomCount
    || aggregate.displayOnlyAtomCount !== CURRENT_RULES.counts.displayOnlyAtomCount
    || aggregate.trainingTruth !== false) {
    fail("CURRENT_OFFICIAL_SKILL_RULES_AGGREGATE_INVALID");
  }
}

function locatorEnvelope(locator) {
  return freeze(hashEnvelope(locator, "locatorHash"));
}

function sourceEvidenceRows(dataset) {
  const rows = [];
  for (const index of dataset.recordIndex) {
    if (index.authorityDisposition !== "official_current_product_candidate"
      || !SOURCE_TYPES.includes(index.recordType)) continue;
    const record = dataset.recordsByKey[index.recordKey];
    if (!object(record)
      || record.recordKey !== index.recordKey
      || record.recordType !== index.recordType
      || record.sourceRecordHash !== index.sourceRecordHash
      || record.payloadHash !== index.payloadHash
      || record.payloadHash !== hashStarcraftTmgContract(record.payload)) {
      fail("CURRENT_OFFICIAL_SKILL_SOURCE_RECORD_INVALID", index.recordKey);
    }
    const locator = locatorEnvelope({
      kind: "command_center_record",
      sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
      sourceSnapshotHash: dataset.sourceSnapshotHash,
      normalizedDatasetHash: dataset.datasetHash,
      recordKey: record.recordKey,
      sourceRecordHash: record.sourceRecordHash,
    });
    rows.push(freeze({
      evidenceId: `source:${record.recordKey}`,
      kind: "official_product_record",
      recordType: record.recordType,
      authorityDisposition: record.authorityDisposition,
      locator,
      content: record.payload,
      contentHash: record.payloadHash,
      rulesAuthority: "source_evidence_requires_a_current_rules_receipt_for_legality_claims",
      trainingTruth: false,
    }));
  }
  return rows.sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
}

function currentRulesReceipt() {
  const body = {
    rulesVersion: CURRENT_RULES.rulesVersion,
    sourceLockHash: CURRENT_RULES.sourceLockHash,
    reconciliationHash: CURRENT_RULES.reconciliationHash,
    aggregateHash: CURRENT_RULES.aggregateHash,
    catalogueHash: CURRENT_RULES.catalogueHash,
    runtimeHash: CURRENT_RULES.runtimeHash,
    graphHash: CURRENT_RULES.graphHash,
  };
  return freeze(hashEnvelope(body, "receiptHash"));
}

function baseRuleEvidenceRows(baseCatalogue) {
  const verification = verifyRuleAtomCatalogue(baseCatalogue);
  if (baseCatalogue.catalogueHash !== CURRENT_RULES.roomBindings.historicalPreFaq.catalogueHash
    || verification.counts.atoms !== 1026
    || verification.counts.byDisposition.executable !== 912
    || verification.counts.byDisposition.display_only !== 114) {
    fail("CURRENT_OFFICIAL_SKILL_BASE_RULE_CATALOGUE_INVALID");
  }
  return baseCatalogue.atoms.map((atom) => {
    const locator = locatorEnvelope({
      kind: "current_rules_base_atom",
      currentCatalogueHash: CURRENT_RULES.catalogueHash,
      incorporatedBaseCatalogueHash: baseCatalogue.catalogueHash,
      atomId: atom.atomId,
      atomVersion: atom.atomVersion,
      clauseIds: [...atom.clauseIds],
    });
    return freeze({
      evidenceId: `rule:${atom.atomId}`,
      kind: "current_rule_atom",
      ruleLayer: "base_in_current_faq_composite",
      atomId: atom.atomId,
      disposition: atom.disposition,
      generationEligible: atom.disposition === "executable",
      locator,
      content: atom,
      contentHash: hashStarcraftTmgContract(atom),
      rulesReceipt: currentRulesReceipt(),
      trainingTruth: false,
    });
  });
}

function faqRuleEvidenceRows(aggregate, faqAtoms) {
  if (!Array.isArray(faqAtoms) || faqAtoms.length !== 137) {
    fail("CURRENT_OFFICIAL_SKILL_FAQ_ATOM_DENOMINATOR_INVALID");
  }
  const indexById = new Map(aggregate.catalogue.atomIndex.map((row) => [row.atomId, row]));
  const seen = new Set();
  return faqAtoms.map((atom) => {
    const index = indexById.get(atom?.atomId);
    const contentHash = hashStarcraftTmgContract(atom);
    if (!object(atom) || seen.has(atom.atomId) || !index
      || index.atomHash !== contentHash || atom.executable !== true) {
      fail("CURRENT_OFFICIAL_SKILL_FAQ_ATOM_INVALID", String(atom?.atomId || ""));
    }
    seen.add(atom.atomId);
    const locator = locatorEnvelope({
      kind: "current_faq_rule_atom",
      sourceLockHash: aggregate.sourceLockHash,
      reconciliationHash: aggregate.reconciliationHash,
      catalogueHash: aggregate.catalogue.catalogueHash,
      atomId: atom.atomId,
      entryId: atom.entryId,
      sourceEvidence: atom.sourceEvidence,
    });
    return freeze({
      evidenceId: `rule:${atom.atomId}`,
      kind: "current_rule_atom",
      ruleLayer: "faq_v1_current_overlay",
      atomId: atom.atomId,
      disposition: "executable",
      generationEligible: true,
      locator,
      content: atom,
      contentHash,
      rulesReceipt: currentRulesReceipt(),
      trainingTruth: false,
    });
  });
}

function countBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map((row) => row[key]))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => [value, rows.filter((row) => row[key] === value).length]));
}

export function createCurrentOfficialSkillEvidenceCatalogueV1(input = {}) {
  assertCurrentDataset(input.dataset);
  assertCurrentRulesAggregate(input.currentRulesAggregate);
  const sourceEvidence = sourceEvidenceRows(input.dataset);
  const ruleEvidence = [
    ...baseRuleEvidenceRows(input.baseCatalogue),
    ...faqRuleEvidenceRows(input.currentRulesAggregate, input.faqAtoms),
  ].sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  if (sourceEvidence.length !== 83
    || new Set(sourceEvidence.map((row) => row.evidenceId)).size !== 83
    || ruleEvidence.length !== 1163
    || new Set(ruleEvidence.map((row) => row.evidenceId)).size !== 1163) {
    fail("CURRENT_OFFICIAL_SKILL_EVIDENCE_DENOMINATOR_INVALID");
  }
  const sourceCounts = countBy(sourceEvidence, "recordType");
  const ruleCounts = countBy(ruleEvidence, "disposition");
  const excluded = input.dataset.recordIndex.filter((row) => (
    row.authorityDisposition !== "official_current_product_candidate"
  ));
  const body = {
    schemaVersion: CURRENT_OFFICIAL_SKILL_EVIDENCE_SCHEMA,
    gameId: "starcraft-tmg",
    sourceBinding: {
      sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
      sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
      normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
      dataVersions: { units: "71", cards: "69", rules: "48" },
      sourceRefreshPerformed: false,
    },
    rulesBinding: currentRulesReceipt(),
    historicalRulesBoundary: {
      ...CURRENT_RULES.roomBindings.historicalPreFaq,
      displayRetained: true,
      replayRetained: true,
      standaloneCandidateInputAllowed: false,
      baseAtomsAcceptedOnlyUnderCurrentCompositeReceipt: true,
    },
    counts: {
      sourceEvidence: sourceEvidence.length,
      sourceByType: sourceCounts,
      ruleEvidence: ruleEvidence.length,
      ruleByDisposition: ruleCounts,
      generationEligibleRules: ruleEvidence.filter((row) => row.generationEligible).length,
      excludedReviewRequiredRuleProse: excluded.filter((row) => (
        row.authorityDisposition === "official_rule_prose_review_required"
      )).length,
      excludedCommunityDisplayOnly: excluded.filter((row) => (
        row.authorityDisposition === "community_display_only"
      )).length,
    },
    sourceEvidence,
    ruleEvidence,
    policy: {
      workerReceivesOnlyMaterializedTaskEvidence: true,
      rawSourceRegistryMounted: false,
      mutableRulesRuntimeMounted: false,
      communityEvidenceStaged: false,
      reviewRequiredRuleProseStaged: false,
      sourceClaimsNeedSourceHash: true,
      legalityClaimsNeedCurrentRulesReceipt: true,
      generatedClaimsAreRulesTruth: false,
      trainingTruth: false,
    },
    productionReady: false,
    trainingTruth: false,
  };
  return freeze(hashEnvelope(body, "catalogueHash"));
}

export function verifyCurrentOfficialSkillEvidenceCatalogueV1(catalogue) {
  assertHashEnvelope(catalogue, "catalogueHash", "CURRENT_OFFICIAL_SKILL_EVIDENCE_HASH_INVALID");
  if (catalogue.schemaVersion !== CURRENT_OFFICIAL_SKILL_EVIDENCE_SCHEMA
    || catalogue.catalogueHash !== CURRENT_OFFICIAL_SKILL_EVIDENCE_CATALOGUE_HASH
    || catalogue.sourceBinding?.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || catalogue.sourceBinding?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || catalogue.sourceBinding?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || catalogue.rulesBinding?.catalogueHash !== CURRENT_RULES.catalogueHash
    || catalogue.rulesBinding?.runtimeHash !== CURRENT_RULES.runtimeHash
    || catalogue.rulesBinding?.graphHash !== CURRENT_RULES.graphHash
    || catalogue.historicalRulesBoundary?.standaloneCandidateInputAllowed !== false
    || catalogue.historicalRulesBoundary?.baseAtomsAcceptedOnlyUnderCurrentCompositeReceipt !== true
    || catalogue.counts?.sourceEvidence !== 83
    || catalogue.counts?.sourceByType?.unit !== 26
    || catalogue.counts?.sourceByType?.tactical_card !== 37
    || catalogue.counts?.sourceByType?.mission !== 10
    || catalogue.counts?.sourceByType?.deployment !== 10
    || catalogue.counts?.ruleEvidence !== 1163
    || catalogue.counts?.generationEligibleRules !== 1049
    || catalogue.counts?.ruleByDisposition?.executable !== 1049
    || catalogue.counts?.ruleByDisposition?.display_only !== 114
    || catalogue.counts?.excludedReviewRequiredRuleProse !== 15
    || catalogue.counts?.excludedCommunityDisplayOnly !== 173
    || catalogue.policy?.workerReceivesOnlyMaterializedTaskEvidence !== true
    || catalogue.policy?.rawSourceRegistryMounted !== false
    || catalogue.policy?.mutableRulesRuntimeMounted !== false
    || catalogue.policy?.communityEvidenceStaged !== false
    || catalogue.policy?.reviewRequiredRuleProseStaged !== false
    || catalogue.productionReady !== false || catalogue.trainingTruth !== false) {
    fail("CURRENT_OFFICIAL_SKILL_EVIDENCE_INVALID");
  }
  const rows = [...catalogue.sourceEvidence, ...catalogue.ruleEvidence];
  if (rows.length !== 1246
    || new Set(rows.map((row) => row.evidenceId)).size !== rows.length) {
    fail("CURRENT_OFFICIAL_SKILL_EVIDENCE_ID_COLLISION");
  }
  for (const row of rows) {
    assertHashEnvelope(row.locator, "locatorHash", "CURRENT_OFFICIAL_SKILL_LOCATOR_HASH_INVALID");
    if (row.contentHash !== hashStarcraftTmgContract(row.content)
      || row.trainingTruth !== false) {
      fail("CURRENT_OFFICIAL_SKILL_EVIDENCE_ROW_INVALID", row.evidenceId);
    }
    if (row.kind === "current_rule_atom") {
      assertHashEnvelope(row.rulesReceipt, "receiptHash",
        "CURRENT_OFFICIAL_SKILL_RULES_RECEIPT_HASH_INVALID");
      if (row.rulesReceipt.catalogueHash !== CURRENT_RULES.catalogueHash
        || row.rulesReceipt.runtimeHash !== CURRENT_RULES.runtimeHash
        || row.rulesReceipt.graphHash !== CURRENT_RULES.graphHash) {
        fail("CURRENT_OFFICIAL_SKILL_RULES_RECEIPT_INVALID", row.evidenceId);
      }
    }
  }
  return true;
}

function ruleSearchText(row) {
  return JSON.stringify({
    atomId: row.atomId,
    title: row.content?.title,
    primitive: row.content?.primitive,
    behaviorKey: row.content?.behaviorKey,
    timing: row.content?.timing,
    legalSpace: row.content?.legalSpace,
    effect: row.content?.effect,
    reads: row.content?.reads,
    writes: row.content?.writes,
  });
}

function selectedRuleIds(catalogue, selector) {
  return catalogue.ruleEvidence.filter((row) => (
    row.generationEligible && selector.test(ruleSearchText(row))
  )).map((row) => row.evidenceId);
}

function taskEnvelope(body) {
  return freeze(hashEnvelope(body, "taskHash"));
}

function sourceRowsByType(catalogue, recordType) {
  return catalogue.sourceEvidence.filter((row) => row.recordType === recordType);
}

function compatibleDeploymentEvidenceIds(mission, deployments) {
  const format = String(mission.content?.format || "").toLowerCase();
  const size = format.includes("skirmish") ? "Skirmish" : "Standard";
  return deployments.filter((row) => row.content?.gameSize === size)
    .map((row) => row.evidenceId);
}

function factionEvidenceIds(factionCard, catalogue) {
  const parentFaction = factionCard.content.faction;
  const archetype = factionCard.content.name;
  const sources = catalogue.sourceEvidence.filter((row) => {
    if (row.recordType === "unit") return row.content?.faction === parentFaction;
    if (row.recordType !== "tactical_card") return false;
    return row.content?.faction === parentFaction || row.content?.faction === archetype;
  }).map((row) => row.evidenceId);
  return uniqueSorted([factionCard.evidenceId, ...sources]);
}

function makeTask(body) {
  return taskEnvelope({
    ...body,
    requiredEvidenceIds: uniqueSorted(body.requiredEvidenceIds),
    roleSequence: ROLE_SEQUENCE,
    questionTemplate: FAMILY_QUESTION_TEMPLATES[body.family],
    candidateAuthority: "unreviewed_only",
    trainingTruth: false,
  });
}

export function createCurrentOfficialSkillCurriculumV1(input = {}) {
  const catalogue = input.evidenceCatalogue;
  verifyCurrentOfficialSkillEvidenceCatalogueV1(catalogue);
  const missionRuleIds = selectedRuleIds(catalogue, RULE_SELECTORS.mission);
  const factionRuleIds = selectedRuleIds(catalogue, RULE_SELECTORS.faction);
  const matchupRuleIds = selectedRuleIds(catalogue, RULE_SELECTORS.matchup);
  if (missionRuleIds.length === 0 || factionRuleIds.length === 0
    || matchupRuleIds.length === 0) {
    fail("CURRENT_OFFICIAL_SKILL_RULE_SELECTOR_EMPTY");
  }
  const tasks = [];
  for (const rule of catalogue.ruleEvidence) {
    tasks.push(makeTask({
      taskId: `how_to_play:${rule.atomId}`,
      family: "how_to_play",
      subjectId: rule.atomId,
      label: String(rule.content?.title || rule.content?.primitive || rule.atomId),
      generationEligible: rule.generationEligible,
      blockReason: rule.generationEligible ? null : "rule_atom_display_only",
      requiredEvidenceIds: [rule.evidenceId],
      parentTaskIds: [],
    }));
  }
  const deployments = sourceRowsByType(catalogue, "deployment");
  for (const mission of sourceRowsByType(catalogue, "mission")) {
    tasks.push(makeTask({
      taskId: `mission:${mission.locator.recordKey}`,
      family: "mission",
      subjectId: mission.locator.recordKey,
      label: mission.content.name,
      generationEligible: true,
      blockReason: null,
      requiredEvidenceIds: [mission.evidenceId,
        ...compatibleDeploymentEvidenceIds(mission, deployments), ...missionRuleIds],
      parentTaskIds: [],
    }));
  }
  const factionCards = sourceRowsByType(catalogue, "tactical_card")
    .filter((row) => row.content?.isFactionCard === true)
    .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
  const factionTasks = [];
  for (const factionCard of factionCards) {
    const task = makeTask({
      taskId: `faction:${factionCard.locator.recordKey}`,
      family: "faction",
      subjectId: factionCard.locator.recordKey,
      label: factionCard.content.name,
      generationEligible: true,
      blockReason: null,
      requiredEvidenceIds: [...factionEvidenceIds(factionCard, catalogue), ...factionRuleIds],
      parentTaskIds: [],
      faction: factionCard.content.faction,
      factionTag: factionCard.content.factionTags?.[0] || null,
    });
    factionTasks.push(task);
    tasks.push(task);
  }
  for (const own of factionTasks) {
    for (const opponent of factionTasks) {
      tasks.push(makeTask({
        taskId: `matchup:${own.subjectId}->${opponent.subjectId}`,
        family: "matchup",
        subjectId: `${own.subjectId}->${opponent.subjectId}`,
        label: `${own.label} vs ${opponent.label}`,
        generationEligible: true,
        blockReason: null,
        requiredEvidenceIds: [
          ...own.requiredEvidenceIds,
          ...opponent.requiredEvidenceIds,
          ...matchupRuleIds,
        ],
        parentTaskIds: [own.taskId, opponent.taskId],
        ownFactionTaskId: own.taskId,
        opponentFactionTaskId: opponent.taskId,
        mirror: own.taskId === opponent.taskId,
      }));
    }
  }
  tasks.sort((left, right) => left.taskId.localeCompare(right.taskId));
  const countsByFamily = Object.fromEntries(FAMILIES.map((family) => [family,
    tasks.filter((task) => task.family === family).length]));
  const eligibleByFamily = Object.fromEntries(FAMILIES.map((family) => [family,
    tasks.filter((task) => task.family === family && task.generationEligible).length]));
  const body = {
    schemaVersion: CURRENT_OFFICIAL_SKILL_CURRICULUM_SCHEMA,
    gameId: "starcraft-tmg",
    evidenceCatalogueHash: catalogue.catalogueHash,
    generationPolicy: {
      countsAreRegistryDriven: true,
      fixedSmallLimit: null,
      matchupIncludesDirectedMirrors: true,
      displayOnlyRuleTasksRemainVisibleButBlocked: true,
      largeScaleProductionAuthorized: false,
    },
    selectorReceipt: {
      version: "current_official_skill_rule_selector_v1",
      missionRuleEvidenceIds: missionRuleIds,
      factionRuleEvidenceIds: factionRuleIds,
      matchupRuleEvidenceIds: matchupRuleIds,
    },
    counts: {
      tasks: tasks.length,
      byFamily: countsByFamily,
      generationEligible: tasks.filter((task) => task.generationEligible).length,
      generationEligibleByFamily: eligibleByFamily,
      blocked: tasks.filter((task) => !task.generationEligible).length,
      factionArchetypes: factionTasks.length,
      directedMatchups: factionTasks.length ** 2,
      mirrorMatchups: factionTasks.length,
    },
    tasks,
    productionReady: false,
    trainingTruth: false,
  };
  return freeze(hashEnvelope(body, "curriculumHash"));
}

export function verifyCurrentOfficialSkillCurriculumV1(curriculum, evidenceCatalogue) {
  verifyCurrentOfficialSkillEvidenceCatalogueV1(evidenceCatalogue);
  assertHashEnvelope(curriculum, "curriculumHash", "CURRENT_OFFICIAL_SKILL_CURRICULUM_HASH_INVALID");
  if (curriculum.schemaVersion !== CURRENT_OFFICIAL_SKILL_CURRICULUM_SCHEMA
    || curriculum.curriculumHash !== CURRENT_OFFICIAL_SKILL_CURRICULUM_HASH
    || curriculum.evidenceCatalogueHash !== evidenceCatalogue.catalogueHash
    || curriculum.counts?.tasks !== 1215
    || curriculum.counts?.byFamily?.how_to_play !== 1163
    || curriculum.counts?.byFamily?.mission !== 10
    || curriculum.counts?.byFamily?.faction !== 6
    || curriculum.counts?.byFamily?.matchup !== 36
    || curriculum.counts?.generationEligible !== 1101
    || curriculum.counts?.blocked !== 114
    || curriculum.counts?.mirrorMatchups !== 6
    || curriculum.generationPolicy?.largeScaleProductionAuthorized !== false
    || curriculum.productionReady !== false || curriculum.trainingTruth !== false) {
    fail("CURRENT_OFFICIAL_SKILL_CURRICULUM_INVALID");
  }
  const taskIds = new Set(curriculum.tasks.map((task) => task.taskId));
  const evidenceIds = new Set([
    ...evidenceCatalogue.sourceEvidence,
    ...evidenceCatalogue.ruleEvidence,
  ].map((row) => row.evidenceId));
  if (taskIds.size !== curriculum.tasks.length) {
    fail("CURRENT_OFFICIAL_SKILL_TASK_ID_COLLISION");
  }
  for (const task of curriculum.tasks) {
    assertHashEnvelope(task, "taskHash", "CURRENT_OFFICIAL_SKILL_TASK_HASH_INVALID");
    if (!FAMILIES.includes(task.family)
      || task.trainingTruth !== false
      || task.candidateAuthority !== "unreviewed_only"
      || task.requiredEvidenceIds.length === 0
      || task.requiredEvidenceIds.some((id) => !evidenceIds.has(id))
      || task.parentTaskIds.some((id) => !taskIds.has(id))) {
      fail("CURRENT_OFFICIAL_SKILL_TASK_INVALID", task.taskId);
    }
  }
  return true;
}

function treeNode(body) {
  return freeze(hashEnvelope(body, "nodeHash"));
}

export function createCurrentOfficialSkillQuestionTreeV1(input = {}) {
  const { curriculum, evidenceCatalogue } = input;
  verifyCurrentOfficialSkillCurriculumV1(curriculum, evidenceCatalogue);
  const rootNodeId = "skill-question-root:starcraft-tmg";
  const nodes = [treeNode({
    nodeId: rootNodeId,
    kind: "root",
    parentNodeId: null,
    label: "StarCraft TMG current-official Skill curriculum",
    trainingTruth: false,
  })];
  for (const family of FAMILIES) {
    nodes.push(treeNode({
      nodeId: `skill-question-family:${family}`,
      kind: "family",
      parentNodeId: rootNodeId,
      family,
      label: family,
      taskCount: curriculum.counts.byFamily[family],
      generationEligibleTaskCount: curriculum.counts.generationEligibleByFamily[family],
      trainingTruth: false,
    }));
  }
  for (const task of curriculum.tasks) {
    nodes.push(treeNode({
      nodeId: `skill-question-task:${task.taskId}`,
      kind: "task",
      parentNodeId: `skill-question-family:${task.family}`,
      family: task.family,
      taskId: task.taskId,
      taskHash: task.taskHash,
      question: task.questionTemplate,
      generationEligible: task.generationEligible,
      blockReason: task.blockReason,
      evidenceCount: task.requiredEvidenceIds.length,
      roleSequence: task.roleSequence,
      trainingTruth: false,
    }));
  }
  nodes.sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  const body = {
    schemaVersion: CURRENT_OFFICIAL_SKILL_QUESTION_TREE_SCHEMA,
    gameId: "starcraft-tmg",
    curriculumHash: curriculum.curriculumHash,
    evidenceCatalogueHash: evidenceCatalogue.catalogueHash,
    rootNodeId,
    counts: {
      roots: 1,
      familyNodes: FAMILIES.length,
      taskNodes: curriculum.tasks.length,
      totalNodes: nodes.length,
      generationEligibleTaskNodes: curriculum.counts.generationEligible,
      blockedTaskNodes: curriculum.counts.blocked,
    },
    nodes,
    productionReady: false,
    trainingTruth: false,
  };
  return freeze(hashEnvelope(body, "treeHash"));
}

export function verifyCurrentOfficialSkillQuestionTreeV1(tree, curriculum,
  evidenceCatalogue) {
  verifyCurrentOfficialSkillCurriculumV1(curriculum, evidenceCatalogue);
  assertHashEnvelope(tree, "treeHash", "CURRENT_OFFICIAL_SKILL_QUESTION_TREE_HASH_INVALID");
  if (tree.schemaVersion !== CURRENT_OFFICIAL_SKILL_QUESTION_TREE_SCHEMA
    || tree.treeHash !== CURRENT_OFFICIAL_SKILL_QUESTION_TREE_HASH
    || tree.curriculumHash !== curriculum.curriculumHash
    || tree.evidenceCatalogueHash !== evidenceCatalogue.catalogueHash
    || tree.counts?.roots !== 1 || tree.counts?.familyNodes !== 4
    || tree.counts?.taskNodes !== 1215 || tree.counts?.totalNodes !== 1220
    || tree.counts?.generationEligibleTaskNodes !== 1101
    || tree.counts?.blockedTaskNodes !== 114
    || tree.productionReady !== false || tree.trainingTruth !== false) {
    fail("CURRENT_OFFICIAL_SKILL_QUESTION_TREE_INVALID");
  }
  const byId = new Map(tree.nodes.map((node) => [node.nodeId, node]));
  if (byId.size !== tree.nodes.length || !byId.has(tree.rootNodeId)) {
    fail("CURRENT_OFFICIAL_SKILL_QUESTION_TREE_NODE_INVALID");
  }
  for (const node of tree.nodes) {
    assertHashEnvelope(node, "nodeHash", "CURRENT_OFFICIAL_SKILL_QUESTION_NODE_HASH_INVALID");
    if (node.parentNodeId !== null && !byId.has(node.parentNodeId)) {
      fail("CURRENT_OFFICIAL_SKILL_QUESTION_PARENT_MISSING", node.nodeId);
    }
  }
  return true;
}

export function createCurrentOfficialSkillStagedInputV1(input = {}) {
  const { evidenceCatalogue, curriculum, taskId } = input;
  verifyCurrentOfficialSkillCurriculumV1(curriculum, evidenceCatalogue);
  const task = curriculum.tasks.find((row) => row.taskId === taskId);
  if (!task) fail("CURRENT_OFFICIAL_SKILL_TASK_NOT_FOUND", String(taskId || ""));
  if (!task.generationEligible) {
    fail("CURRENT_OFFICIAL_SKILL_TASK_NOT_GENERATION_ELIGIBLE", task.taskId);
  }
  const evidenceById = new Map([
    ...evidenceCatalogue.sourceEvidence,
    ...evidenceCatalogue.ruleEvidence,
  ].map((row) => [row.evidenceId, row]));
  const evidence = task.requiredEvidenceIds.map((id) => evidenceById.get(id));
  if (evidence.some((row) => !row)) fail("CURRENT_OFFICIAL_SKILL_TASK_EVIDENCE_MISSING");
  const body = {
    schemaVersion: CURRENT_OFFICIAL_SKILL_STAGED_INPUT_SCHEMA,
    gameId: "starcraft-tmg",
    task: {
      taskId: task.taskId,
      taskHash: task.taskHash,
      family: task.family,
      subjectId: task.subjectId,
      label: task.label,
      questionTemplate: task.questionTemplate,
      roleSequence: task.roleSequence,
    },
    bindings: {
      evidenceCatalogueHash: evidenceCatalogue.catalogueHash,
      curriculumHash: curriculum.curriculumHash,
      source: evidenceCatalogue.sourceBinding,
      rules: evidenceCatalogue.rulesBinding,
    },
    evidence,
    capabilities: {
      readStagedEvidence: true,
      emitCandidateSkillMaximum: 1,
      network: false,
      sourceRegistry: false,
      mutableRulesRuntime: false,
      room: false,
      onlineAgent: false,
      memoryWrite: false,
      skillPublish: false,
      trainingWrite: false,
    },
    sourceRefreshPerformed: false,
    candidateAuthority: "unreviewed_only",
    productionReady: false,
    trainingTruth: false,
  };
  return freeze(hashEnvelope(body, "stagedInputHash"));
}

export function verifyCurrentOfficialSkillStagedInputV1(stagedInput) {
  assertHashEnvelope(stagedInput, "stagedInputHash",
    "CURRENT_OFFICIAL_SKILL_STAGED_INPUT_HASH_INVALID");
  if (stagedInput.schemaVersion !== CURRENT_OFFICIAL_SKILL_STAGED_INPUT_SCHEMA
    || stagedInput.bindings?.source?.normalizedDatasetHash
      !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || stagedInput.bindings?.rules?.catalogueHash !== CURRENT_RULES.catalogueHash
    || stagedInput.bindings?.rules?.runtimeHash !== CURRENT_RULES.runtimeHash
    || !Array.isArray(stagedInput.evidence) || stagedInput.evidence.length === 0
    || stagedInput.capabilities?.readStagedEvidence !== true
    || stagedInput.capabilities?.emitCandidateSkillMaximum !== 1
    || Object.entries(stagedInput.capabilities).some(([key, value]) => (
      !["readStagedEvidence", "emitCandidateSkillMaximum"].includes(key) && value !== false
    ))
    || stagedInput.sourceRefreshPerformed !== false
    || stagedInput.candidateAuthority !== "unreviewed_only"
    || stagedInput.productionReady !== false || stagedInput.trainingTruth !== false) {
    fail("CURRENT_OFFICIAL_SKILL_STAGED_INPUT_INVALID");
  }
  for (const row of stagedInput.evidence) {
    assertHashEnvelope(row.locator, "locatorHash", "CURRENT_OFFICIAL_SKILL_LOCATOR_HASH_INVALID");
    if (row.contentHash !== hashStarcraftTmgContract(row.content)
      || row.authorityDisposition === "community_display_only"
      || row.authorityDisposition === "official_rule_prose_review_required") {
      fail("CURRENT_OFFICIAL_SKILL_STAGED_EVIDENCE_INVALID", row.evidenceId);
    }
    if (row.kind === "current_rule_atom") {
      assertHashEnvelope(row.rulesReceipt, "receiptHash",
        "CURRENT_OFFICIAL_SKILL_RULES_RECEIPT_HASH_INVALID");
    }
  }
  return true;
}
