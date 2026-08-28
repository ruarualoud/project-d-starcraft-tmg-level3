import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

export const RULE_ATOM_CATALOGUE_SCHEMA = "starcraft_tmg_rule_atom_catalogue_v1";

const DISPOSITIONS = Object.freeze([
  "executable",
  "display_only",
  "review_required",
  "quarantined",
]);
const EVIDENCE_KEYS = Object.freeze([
  "positiveFixtureIds",
  "negativeFixtureIds",
  "interactionFixtureIds",
  "lifecycleFixtureIds",
  "replayFixtureIds",
  "sourceDriftFixtureIds",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function hash(value, code) {
  const normalized = text(value, code).toLowerCase();
  if (!HASH_PATTERN.test(normalized)) fail(code);
  return normalized;
}

function uniqueSortedStrings(values, code, { allowEmpty = false } = {}) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) fail(code);
  const normalized = values.map((value) => text(value, code));
  if (new Set(normalized).size !== normalized.length) fail(`${code}_duplicate`);
  return normalized.sort((left, right) => left.localeCompare(right));
}

function normalizeSnapshot(raw) {
  if (!object(raw)) fail("invalid_source_snapshot");
  return {
    sourceSnapshotId: text(raw.sourceSnapshotId, "invalid_source_snapshot_id"),
    authority: text(raw.authority, "invalid_source_snapshot_authority"),
    immutableLocator: text(raw.immutableLocator, "invalid_source_snapshot_locator"),
    contentHash: hash(raw.contentHash, "invalid_source_snapshot_hash"),
    mediaType: text(raw.mediaType, "invalid_source_snapshot_media_type"),
    language: text(raw.language, "invalid_source_snapshot_language"),
    capturedAt: text(raw.capturedAt, "invalid_source_snapshot_captured_at"),
  };
}

function normalizeLocator(raw, authority, clauseId) {
  if (!object(raw)) fail("invalid_clause_locator");
  const kind = String(raw.kind || "pdf_page").trim();
  const section = text(raw.section, "invalid_clause_locator_section");
  if (kind === "pdf_page") {
    const page = Number(raw.page);
    if (!Number.isInteger(page) || page < 1) {
      fail("official_clause_locator_incomplete", clauseId);
    }
    const locator = { kind, page, section };
    if (raw.anchorId !== undefined) {
      locator.anchorId = text(raw.anchorId, "invalid_clause_locator_anchor");
    }
    if (raw.lineOrdinal !== undefined) {
      const lineOrdinal = Number(raw.lineOrdinal);
      if (!Number.isInteger(lineOrdinal) || lineOrdinal < 1) {
        fail("invalid_clause_locator_line_ordinal", clauseId);
      }
      locator.lineOrdinal = lineOrdinal;
    }
    for (const key of ["candidateOrdinalStart", "candidateOrdinalEnd"]) {
      if (raw[key] === undefined) continue;
      const value = Number(raw[key]);
      if (!Number.isInteger(value) || value < 1) {
        fail("invalid_clause_locator_candidate_ordinal", clauseId);
      }
      locator[key] = value;
    }
    if (locator.candidateOrdinalStart !== undefined
      && locator.candidateOrdinalEnd !== undefined
      && locator.candidateOrdinalStart > locator.candidateOrdinalEnd) {
      fail("invalid_clause_locator_candidate_range", clauseId);
    }
    return locator;
  }
  if (kind === "faq_entry") {
    const entryOrdinal = Number(raw.entryOrdinal);
    if (!Number.isInteger(entryOrdinal) || entryOrdinal < 1) {
      fail("official_faq_locator_incomplete", clauseId);
    }
    return {
      kind,
      section,
      entryId: text(raw.entryId, "official_faq_locator_incomplete"),
      entryOrdinal,
    };
  }
  fail("invalid_clause_locator_kind", kind || authority);
}

function normalizeClause(raw, snapshots) {
  if (!object(raw)) fail("invalid_source_clause");
  const sourceSnapshotId = text(raw.sourceSnapshotId, "invalid_clause_source_snapshot_id");
  const snapshot = snapshots.get(sourceSnapshotId);
  if (!snapshot) fail("unknown_clause_source_snapshot", sourceSnapshotId);
  const sourceContentHash = hash(raw.sourceContentHash, "invalid_clause_source_content_hash");
  if (sourceContentHash !== snapshot.contentHash) fail("clause_source_content_hash_mismatch", sourceSnapshotId);
  const authority = text(raw.authority, "invalid_clause_authority");
  if (authority !== snapshot.authority) fail("clause_source_authority_mismatch", sourceSnapshotId);
  const clauseId = text(raw.clauseId, "invalid_clause_id");
  const locator = normalizeLocator(raw.locator, authority, clauseId);
  return {
    clauseId,
    sourceSnapshotId,
    sourceContentHash,
    locator,
    textHash: hash(raw.textHash, "invalid_clause_text_hash"),
    language: text(raw.language, "invalid_clause_language"),
    authority,
  };
}

function normalizeExecutor(raw) {
  if (!object(raw)) fail("invalid_executor_manifest_entry");
  return {
    executorId: text(raw.executorId, "invalid_executor_id"),
    executorVersion: text(raw.executorVersion, "invalid_executor_version"),
    actionTypes: uniqueSortedStrings(raw.actionTypes, "invalid_executor_action_types"),
    transitionSchema: text(raw.transitionSchema, "invalid_executor_transition_schema"),
  };
}

function normalizeEvidence(raw, atomId) {
  if (!object(raw)) fail("executable_evidence_required", atomId);
  return Object.fromEntries(EVIDENCE_KEYS.map((key) => [
    key,
    uniqueSortedStrings(raw[key], `executable_evidence_${key}_required`),
  ]));
}

function normalizeExecutableAtom(raw) {
  if (!object(raw.owner)
    || raw.owner.authority !== "rules"
    || !String(raw.owner.actor || "").trim()) fail("invalid_executable_owner", raw.atomId);
  if (!object(raw.timing)
    || !String(raw.timing.phase || "").trim()
    || !String(raw.timing.window || "").trim()
    || !Number.isInteger(raw.timing.priority)) fail("invalid_executable_timing", raw.atomId);
  if (!Array.isArray(raw.preconditions) || raw.preconditions.length === 0) {
    fail("invalid_executable_preconditions", raw.atomId);
  }
  const preconditions = raw.preconditions.map((entry) => {
    if (!object(entry)) fail("invalid_executable_precondition", raw.atomId);
    return {
      predicateId: text(entry.predicateId, "invalid_executable_predicate_id"),
      inputSchema: text(entry.inputSchema, "invalid_executable_predicate_schema"),
      failureCode: text(entry.failureCode, "invalid_executable_predicate_failure"),
    };
  }).sort((left, right) => left.predicateId.localeCompare(right.predicateId));
  if (!object(raw.legalSpace)
    || !["finite", "parameter_domain"].includes(raw.legalSpace.kind)
    || !String(raw.legalSpace.actionType || "").trim()) fail("invalid_executable_legal_space", raw.atomId);
  const legalSpace = {
    kind: raw.legalSpace.kind,
    actionType: text(raw.legalSpace.actionType, "invalid_executable_action_type"),
  };
  if (legalSpace.kind === "parameter_domain") {
    legalSpace.parameterSchema = text(raw.legalSpace.parameterSchema, "invalid_parameter_domain_schema");
  }
  if (!object(raw.effect)) fail("invalid_executable_effect", raw.atomId);
  const effect = {
    executorId: text(raw.effect.executorId, "invalid_executable_effect_executor"),
    transitionSchema: text(raw.effect.transitionSchema, "invalid_executable_effect_schema"),
  };
  if (!object(raw.chance) || !["none", "chance_ticket"].includes(raw.chance.kind)) {
    fail("invalid_executable_chance", raw.atomId);
  }
  const chance = { kind: raw.chance.kind };
  if (chance.kind === "chance_ticket") {
    chance.ticketSchema = text(raw.chance.ticketSchema, "invalid_chance_ticket_schema");
  }
  if (!object(raw.dependencies)) fail("invalid_executable_dependencies", raw.atomId);
  return {
    owner: {
      authority: "rules",
      actor: String(raw.owner.actor).trim(),
    },
    timing: {
      phase: String(raw.timing.phase).trim(),
      window: String(raw.timing.window).trim(),
      priority: raw.timing.priority,
    },
    preconditions,
    legalSpace,
    effect,
    chance,
    rejectionCodes: uniqueSortedStrings(raw.rejectionCodes, "invalid_executable_rejection_codes"),
    dependencies: {
      rulesVersion: text(raw.dependencies.rulesVersion, "invalid_atom_rules_version"),
      sourceSnapshotIds: uniqueSortedStrings(
        raw.dependencies.sourceSnapshotIds,
        "invalid_atom_source_dependencies",
      ),
      atomIds: uniqueSortedStrings(raw.dependencies.atomIds, "invalid_atom_dependencies", { allowEmpty: true }),
    },
    evidence: normalizeEvidence(raw.evidence, raw.atomId),
  };
}

function normalizeAtom(raw) {
  if (!object(raw)) fail("invalid_rule_atom");
  const disposition = text(raw.disposition, "invalid_rule_atom_disposition");
  if (!DISPOSITIONS.includes(disposition)) fail("invalid_rule_atom_disposition", disposition);
  const base = {
    atomId: text(raw.atomId, "invalid_rule_atom_id"),
    atomVersion: text(raw.atomVersion, "invalid_rule_atom_version"),
    clauseIds: uniqueSortedStrings(raw.clauseIds, "invalid_rule_atom_clause_ids"),
    disposition,
    title: text(raw.title, "invalid_rule_atom_title"),
  };
  if (raw.canonicalClauseId !== undefined) {
    base.canonicalClauseId = text(raw.canonicalClauseId, "invalid_canonical_clause_id");
  }
  if (disposition === "executable") return { ...base, ...normalizeExecutableAtom(raw) };
  if (raw.legalSpace !== undefined || raw.effect !== undefined || raw.owner?.authority === "rules") {
    fail("non_executable_authority_forbidden", base.atomId);
  }
  return {
    ...base,
    reasonCode: text(raw.reasonCode, "non_executable_reason_required"),
  };
}

function normalizeSourceDenominatorBinding(raw, sourceDenominatorStatus) {
  if ((raw === undefined || raw === null) && sourceDenominatorStatus === "contract_fixture") return null;
  if (!object(raw)) fail("source_denominator_binding_required");
  return {
    schema: text(raw.schema, "invalid_source_denominator_binding_schema"),
    sourceManifestHash: hash(raw.sourceManifestHash, "invalid_source_manifest_hash"),
    canonicalFinalizationHash: hash(
      raw.canonicalFinalizationHash,
      "invalid_canonical_finalization_hash",
    ),
    canonicalCatalogueHash: hash(raw.canonicalCatalogueHash, "invalid_canonical_catalogue_hash"),
    localToCanonicalIndexHash: hash(
      raw.localToCanonicalIndexHash,
      "invalid_local_to_canonical_index_hash",
    ),
    faqReceiptHash: hash(raw.faqReceiptHash, "invalid_faq_receipt_hash"),
    mappingMode: text(raw.mappingMode, "invalid_source_denominator_mapping_mode"),
  };
}

function assertUnique(entries, key, code) {
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry[key])) fail(code, entry[key]);
    seen.add(entry[key]);
  }
}

function assertAcyclic(atomsById) {
  const visiting = new Set();
  const visited = new Set();
  function visit(atomId) {
    if (visiting.has(atomId)) fail("rule_atom_dependency_cycle", atomId);
    if (visited.has(atomId)) return;
    const atom = atomsById.get(atomId);
    if (!atom) fail("unknown_rule_atom_dependency", atomId);
    visiting.add(atomId);
    for (const dependencyId of atom.dependencies?.atomIds || []) visit(dependencyId);
    visiting.delete(atomId);
    visited.add(atomId);
  }
  for (const atomId of atomsById.keys()) visit(atomId);
}

function validateCrossReferences({ sourceSnapshots, sourceClauses, atoms, executorManifest, rulesVersion }) {
  const snapshots = new Map(sourceSnapshots.map((entry) => [entry.sourceSnapshotId, entry]));
  const clauses = new Map(sourceClauses.map((entry) => [entry.clauseId, entry]));
  const atomsById = new Map(atoms.map((entry) => [entry.atomId, entry]));
  const executors = new Map(executorManifest.map((entry) => [entry.executorId, entry]));
  const clauseOwners = new Map();

  for (const atom of atoms) {
    for (const clauseId of atom.clauseIds) {
      if (!clauses.has(clauseId)) fail("unknown_source_clause", clauseId);
      if (clauseOwners.has(clauseId)) fail("source_clause_mapped_more_than_once", clauseId);
      clauseOwners.set(clauseId, atom.atomId);
    }
    if (atom.disposition !== "executable") continue;
    if (atom.dependencies.rulesVersion !== rulesVersion) fail("atom_rules_version_mismatch", atom.atomId);
    for (const sourceSnapshotId of atom.dependencies.sourceSnapshotIds) {
      if (!snapshots.has(sourceSnapshotId)) fail("unknown_atom_source_snapshot", sourceSnapshotId);
      const clauseSnapshotIds = new Set(atom.clauseIds.map((clauseId) => clauses.get(clauseId).sourceSnapshotId));
      if (!clauseSnapshotIds.has(sourceSnapshotId)) fail("atom_unbound_source_dependency", sourceSnapshotId);
    }
    const executor = executors.get(atom.effect.executorId);
    if (!executor) fail("executor_not_registered", atom.effect.executorId);
    if (executor.transitionSchema !== atom.effect.transitionSchema) {
      fail("executor_transition_schema_mismatch", atom.effect.executorId);
    }
    if (!executor.actionTypes.includes(atom.legalSpace.actionType)) {
      fail("executor_action_type_mismatch", atom.effect.executorId);
    }
  }
  assertAcyclic(atomsById);
  return {
    unclassifiedClauseIds: [...clauses.keys()].filter((clauseId) => !clauseOwners.has(clauseId)).sort(),
  };
}

function freezeDeep(value) {
  if (!object(value) && !Array.isArray(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function catalogueBody(input) {
  if (!object(input)) fail("invalid_rule_atom_catalogue_input");
  const gameId = text(input.gameId, "invalid_catalogue_game_id");
  const catalogueVersion = text(input.catalogueVersion, "invalid_catalogue_version");
  const rulesVersion = text(input.rulesVersion, "invalid_catalogue_rules_version");
  const sourceDenominatorStatus = text(
    input.sourceDenominatorStatus || "contract_fixture",
    "invalid_source_denominator_status",
  );
  const sourceDenominatorBinding = normalizeSourceDenominatorBinding(
    input.sourceDenominatorBinding,
    sourceDenominatorStatus,
  );
  const sourceSnapshots = (input.sourceSnapshots || []).map(normalizeSnapshot)
    .sort((left, right) => left.sourceSnapshotId.localeCompare(right.sourceSnapshotId));
  assertUnique(sourceSnapshots, "sourceSnapshotId", "duplicate_source_snapshot_id");
  const snapshots = new Map(sourceSnapshots.map((entry) => [entry.sourceSnapshotId, entry]));
  const sourceClauses = (input.sourceClauses || []).map((entry) => normalizeClause(entry, snapshots))
    .sort((left, right) => left.clauseId.localeCompare(right.clauseId));
  assertUnique(sourceClauses, "clauseId", "duplicate_source_clause_id");
  const atoms = (input.atoms || []).map(normalizeAtom)
    .sort((left, right) => left.atomId.localeCompare(right.atomId));
  assertUnique(atoms, "atomId", "duplicate_rule_atom_id");
  const executorManifest = (input.executorManifest || []).map(normalizeExecutor)
    .sort((left, right) => left.executorId.localeCompare(right.executorId));
  assertUnique(executorManifest, "executorId", "duplicate_executor_id");
  const crossReferences = validateCrossReferences({
    sourceSnapshots,
    sourceClauses,
    atoms,
    executorManifest,
    rulesVersion,
  });
  return {
    schema: RULE_ATOM_CATALOGUE_SCHEMA,
    gameId,
    catalogueVersion,
    rulesVersion,
    sourceDenominatorStatus,
    sourceDenominatorBinding,
    sourceSnapshots,
    sourceClauses,
    atoms,
    executorManifest,
    unclassifiedClauseIds: crossReferences.unclassifiedClauseIds,
    trainingTruth: false,
  };
}

export function createRuleAtomCatalogue(input) {
  const body = catalogueBody(input);
  return freezeDeep({
    ...body,
    catalogueHash: hashStarcraftTmgContract(body),
  });
}

export function verifyRuleAtomCatalogue(catalogue) {
  if (!object(catalogue) || catalogue.schema !== RULE_ATOM_CATALOGUE_SCHEMA) fail("invalid_catalogue_schema");
  const body = catalogueBody(catalogue);
  const catalogueHash = hashStarcraftTmgContract(body);
  if (catalogueHash !== catalogue.catalogueHash) fail("catalogue_hash_mismatch");
  const byDisposition = Object.fromEntries(DISPOSITIONS.map((disposition) => [
    disposition,
    body.atoms.filter((atom) => atom.disposition === disposition).length,
  ]));
  const executableContractGaps = [];
  const evidenceGaps = [];
  for (const atom of body.atoms.filter((entry) => entry.disposition === "executable")) {
    if (!atom.owner || !atom.timing || !atom.preconditions || !atom.legalSpace
      || !atom.effect || !atom.chance || !atom.rejectionCodes || !atom.dependencies) {
      executableContractGaps.push(atom.atomId);
    }
    if (!atom.evidence || EVIDENCE_KEYS.some((key) => !atom.evidence[key]?.length)) {
      evidenceGaps.push(atom.atomId);
    }
  }
  const remainingRuleGaps = body.atoms.length - byDisposition.executable;
  const ctx2skillBlocks = body.sourceDenominatorStatus === "official_complete"
    ? (remainingRuleGaps > 0 ? ["executor_legal_space_judge_and_replay_evidence_pending"] : [])
    : ["official_source_denominator_not_bound"];
  return freezeDeep({
    schema: "starcraft_tmg_rule_atom_catalogue_verification_v1",
    catalogueHash,
    counts: {
      sourceSnapshots: body.sourceSnapshots.length,
      sourceClauses: body.sourceClauses.length,
      atoms: body.atoms.length,
      unclassifiedClauses: body.unclassifiedClauseIds.length,
      byDisposition,
    },
    unclassifiedClauseIds: [...body.unclassifiedClauseIds],
    executableContractGaps,
    evidenceGaps,
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: [body.gameId],
      roleRoutes: ["rule_skill_builder", "referee"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: EVIDENCE_KEYS.length,
      crossTimeReplayResult: byDisposition.executable === 0
        ? "not_run_no_executable_atoms"
        : (evidenceGaps.length === 0 ? "contract_fixture_passed" : "blocked"),
      promotions: [],
      blocks: ctx2skillBlocks,
      remainingRuleGaps,
    },
    trainingTruth: false,
  });
}

export function resolveExecutableRuleAtoms(catalogue, dependencySet) {
  const verification = verifyRuleAtomCatalogue(catalogue);
  if (!object(dependencySet)) fail("dependency_set_required");
  if (dependencySet.rulesVersion !== catalogue.rulesVersion) fail("rules_version_mismatch");
  const sourceSnapshotHashes = object(dependencySet.sourceSnapshotHashes)
    ? dependencySet.sourceSnapshotHashes
    : {};
  for (const snapshot of catalogue.sourceSnapshots) {
    if (sourceSnapshotHashes[snapshot.sourceSnapshotId] !== snapshot.contentHash) {
      fail("source_snapshot_hash_mismatch", snapshot.sourceSnapshotId);
    }
  }
  const executorVersions = object(dependencySet.executorVersions) ? dependencySet.executorVersions : {};
  for (const executor of catalogue.executorManifest) {
    if (executorVersions[executor.executorId] !== executor.executorVersion) {
      fail("executor_version_mismatch", executor.executorId);
    }
  }
  if (verification.unclassifiedClauseIds.length > 0
    || verification.executableContractGaps.length > 0
    || verification.evidenceGaps.length > 0) fail("rule_atom_catalogue_not_executable");
  const executableAtoms = catalogue.atoms.filter((atom) => atom.disposition === "executable");
  if (executableAtoms.length === 0) fail("no_executable_rule_atoms");
  return freezeDeep({
    schema: "starcraft_tmg_resolved_rule_atom_set_v1",
    catalogueHash: catalogue.catalogueHash,
    rulesVersion: catalogue.rulesVersion,
    atomIds: executableAtoms.map((atom) => atom.atomId),
    atomVersions: Object.fromEntries(executableAtoms.map((atom) => [atom.atomId, atom.atomVersion])),
    trainingTruth: false,
  });
}
