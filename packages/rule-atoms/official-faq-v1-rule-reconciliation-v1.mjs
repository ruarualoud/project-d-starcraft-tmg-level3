import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1 } from
  "../../content/official-faq-v1-rule-reconciliation-binding-v1.mjs";
import {
  OFFICIAL_FAQ_V1_SOURCE_LOCK_SCHEMA,
} from "../source-data/official-faq-v1-source-lock-v1.mjs";
import { verifyRuleAtomCatalogue } from "./rule-atom-catalogue-v1.mjs";

export const OFFICIAL_FAQ_V1_RULE_RECONCILIATION_SCHEMA =
  "starcraft_tmg_official_faq_v1_rule_reconciliation_v1";
export const OFFICIAL_FAQ_V1_SOURCE_LOCK_HASH =
  "2881adb2a4e0475f07bb17aebf02e64f35c9073f274cec2cf0a8f770f8647226";
export const OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH =
  "5b3bd5d65a6e3478e98536e7fb71133fd0624c99cccbc47c886c96f731c16d46";
export const OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH =
  "6e3527cea5b9a005bb5462eb33bc8f2a7a3a93636778ae9a6daec2d8fab903b9";
export const OFFICIAL_FAQ_V1_BASE_GRAPH_HASH =
  "63f37c40a54006ab67096df72b9e2e9f6b6836c38d82aad3ee10d6d41017e44c";

const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const DISPOSITIONS = Object.freeze([
  "confirm", "refine", "supersede", "conflict", "new",
]);
const IMPLEMENTATION_SLICES = Object.freeze(["F3", "F4", "F5"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function validateSourceLock(lock) {
  if (!object(lock) || lock.schema !== OFFICIAL_FAQ_V1_SOURCE_LOCK_SCHEMA
    || lock.lockHash !== OFFICIAL_FAQ_V1_SOURCE_LOCK_HASH
    || hashStarcraftTmgContract(without(lock, ["lockHash"])) !== lock.lockHash
    || lock.semanticIndex?.entryCount !== 68
    || !Array.isArray(lock.semanticIndex?.entryIndex)
    || lock.semanticIndex.entryIndex.length !== 68) {
    fail("OFFICIAL_FAQ_V1_RECONCILIATION_SOURCE_LOCK_INVALID");
  }
}

function validateBaseRules(catalogue, graph, runtimeHash) {
  const audit = verifyRuleAtomCatalogue(catalogue);
  if (catalogue.catalogueHash !== OFFICIAL_FAQ_V1_BASE_CATALOGUE_HASH
    || runtimeHash !== OFFICIAL_FAQ_V1_BASE_RUNTIME_HASH
    || graph.graphHash !== OFFICIAL_FAQ_V1_BASE_GRAPH_HASH
    || hashStarcraftTmgContract(without(graph, ["graphHash"])) !== graph.graphHash
    || graph.catalogueHash !== catalogue.catalogueHash
    || audit.counts.atoms !== 1026
    || audit.counts.byDisposition.executable !== 912
    || audit.counts.byDisposition.display_only !== 114
    || audit.counts.byDisposition.review_required !== 0
    || graph.nodes?.length !== 12292
    || graph.edges?.length !== 33644
    || graph.catalogueIndex?.atomNodeIds?.length !== 1026
    || graph.catalogueIndex?.executableAtomNodeIds?.length !== 912) {
    fail("OFFICIAL_FAQ_V1_RECONCILIATION_BASE_RULES_INVALID");
  }
}

function normalizeBinding(binding, sourceLock, catalogue, graph) {
  if (!Array.isArray(binding) || binding.length !== 68) {
    fail("OFFICIAL_FAQ_V1_RECONCILIATION_DENOMINATOR_INVALID");
  }
  const sourceById = new Map(sourceLock.semanticIndex.entryIndex.map((entry) => [
    entry.entryId, entry,
  ]));
  const atomById = new Map(catalogue.atoms.map((atom) => [atom.atomId, atom]));
  const graphNodeIds = new Set(graph.nodes.map((node) => node.nodeId));
  const seen = new Set();
  return binding.map((raw, index) => {
    if (!object(raw)) fail("OFFICIAL_FAQ_V1_RECONCILIATION_ENTRY_INVALID");
    const expectedId = `faq-v1:${String(index + 1).padStart(2, "0")}`;
    if (raw.entryId !== expectedId || seen.has(raw.entryId)) {
      fail("OFFICIAL_FAQ_V1_RECONCILIATION_ENTRY_ID_INVALID", String(raw.entryId));
    }
    seen.add(raw.entryId);
    if (!DISPOSITIONS.includes(raw.disposition)) {
      fail("OFFICIAL_FAQ_V1_RECONCILIATION_DISPOSITION_INVALID", raw.entryId);
    }
    if (!IMPLEMENTATION_SLICES.includes(raw.implementationSlice)) {
      fail("OFFICIAL_FAQ_V1_RECONCILIATION_SLICE_INVALID", raw.entryId);
    }
    if (typeof raw.tokenMarkerImpact !== "boolean"
      || typeof raw.deltaSummary !== "string" || !raw.deltaSummary.trim()
      || !Array.isArray(raw.atomIds)
      || new Set(raw.atomIds).size !== raw.atomIds.length) {
      fail("OFFICIAL_FAQ_V1_RECONCILIATION_ENTRY_SHAPE_INVALID", raw.entryId);
    }
    if (raw.disposition !== "new" && raw.disposition !== "conflict"
      && raw.atomIds.length === 0) {
      fail("OFFICIAL_FAQ_V1_RECONCILIATION_ATOM_REFERENCE_REQUIRED", raw.entryId);
    }
    for (const atomId of raw.atomIds) {
      const atom = atomById.get(atomId);
      if (!atom || atom.disposition !== "executable") {
        fail("OFFICIAL_FAQ_V1_RECONCILIATION_ATOM_REFERENCE_INVALID",
          `${raw.entryId}:${atomId}`);
      }
      if (!graphNodeIds.has(`rule_atom:${atomId}`)) {
        fail("OFFICIAL_FAQ_V1_RECONCILIATION_GRAPH_REFERENCE_MISSING",
          `${raw.entryId}:${atomId}`);
      }
    }
    const source = sourceById.get(raw.entryId);
    if (!source || !HASH_PATTERN.test(source.questionHash)
      || !HASH_PATTERN.test(source.answerHash)) {
      fail("OFFICIAL_FAQ_V1_RECONCILIATION_SOURCE_ENTRY_INVALID", raw.entryId);
    }
    return {
      entryId: raw.entryId,
      section: source.section,
      questionHash: source.questionHash,
      answerHash: source.answerHash,
      disposition: raw.disposition,
      implementationSlice: raw.implementationSlice,
      tokenMarkerImpact: raw.tokenMarkerImpact,
      deltaSummary: raw.deltaSummary.trim(),
      atomIds: [...raw.atomIds],
      graphNodeIds: raw.atomIds.map((atomId) => `rule_atom:${atomId}`),
      implementationStatus: raw.disposition === "confirm"
        ? "reverification_required"
        : "rules_change_required",
    };
  });
}

export function createOfficialFaqV1RuleReconciliationV1(input = {}) {
  validateSourceLock(input.sourceLock);
  validateBaseRules(input.currentCatalogue, input.currentGraph, input.currentRuntimeHash);
  const entries = normalizeBinding(
    input.binding || OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1,
    input.sourceLock,
    input.currentCatalogue,
    input.currentGraph,
  );
  const byDisposition = Object.fromEntries(DISPOSITIONS.map((disposition) => [
    disposition, entries.filter((entry) => entry.disposition === disposition).length,
  ]));
  const byImplementationSlice = Object.fromEntries(IMPLEMENTATION_SLICES.map((slice) => [
    slice, entries.filter((entry) => entry.implementationSlice === slice).length,
  ]));
  const tokenMarkerImpactEntryIds = entries.filter((entry) => entry.tokenMarkerImpact)
    .map((entry) => entry.entryId);
  const body = {
    schema: OFFICIAL_FAQ_V1_RULE_RECONCILIATION_SCHEMA,
    gameId: "starcraft-tmg",
    sourceLockHash: input.sourceLock.lockHash,
    sourceEntryIndexHash: input.sourceLock.semanticIndex.entryIndexHash,
    baseRules: {
      catalogueHash: input.currentCatalogue.catalogueHash,
      runtimeHash: input.currentRuntimeHash,
      graphHash: input.currentGraph.graphHash,
      atomCount: 1026,
      executableAtomCount: 912,
      displayOnlyAtomCount: 114,
      executorCount: input.currentCatalogue.executorManifest.length,
      immutable: true,
    },
    entryCount: entries.length,
    unclassifiedEntryCount: 0,
    byDisposition,
    byImplementationSlice,
    tokenMarkerImpactEntryIds,
    tokenMarkerImpactEntryCount: tokenMarkerImpactEntryIds.length,
    entries,
    review: {
      preparedBy: "codex_rule_reconciliation",
      humanReviewed: false,
      exactEntryCoverage: true,
      sourceProseEmbedded: false,
    },
    precedence: "faq_v1_clarifies_current_rules_only_after_versioned_executor_proof",
    implementationStatus: "classified_pending_f3_f4_f5",
    supersededBaseBehaviorEntryIds: entries.filter((entry) => (
      entry.disposition === "supersede"
    )).map((entry) => entry.entryId),
    conflictEntryIds: entries.filter((entry) => entry.disposition === "conflict")
      .map((entry) => entry.entryId),
    rulesEligible: false,
    productionRoomEligible: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    blocks: [
      "faq_f3_f4_f5_versioned_rules_implementation_pending",
      "faq_reconciliation_human_review_not_claimed",
      "current_rooms_remain_on_immutable_pre_faq_catalogue",
      "skill_dsh_muzero_selfplay_and_training_promotion_not_run",
    ],
  };
  return freeze({
    ...body,
    reconciliationHash: hashStarcraftTmgContract(body),
  });
}

export function verifyOfficialFaqV1RuleReconciliationV1(reconciliation, input = {}) {
  if (!object(reconciliation)
    || reconciliation.schema !== OFFICIAL_FAQ_V1_RULE_RECONCILIATION_SCHEMA
    || !HASH_PATTERN.test(String(reconciliation.reconciliationHash || ""))) {
    fail("OFFICIAL_FAQ_V1_RECONCILIATION_INVALID");
  }
  const expected = createOfficialFaqV1RuleReconciliationV1(input);
  if (hashStarcraftTmgContract(reconciliation) !== hashStarcraftTmgContract(expected)) {
    fail("OFFICIAL_FAQ_V1_RECONCILIATION_MISMATCH");
  }
  return true;
}
