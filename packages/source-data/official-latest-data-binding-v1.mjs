import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyCommandCenterSnapshot } from "../rule-atoms/official-live-source-snapshots-v1.mjs";
import { verifyOfficialCommandCenterDataset } from "./official-command-center-adapter-v1.mjs";
import { verifyOfficialSameVersionDisplayOnlyDriftReceipt } from "./official-command-center-snapshot-delta-v1.mjs";
import { verifyOfficialDataReviewEvidenceBundle } from "./official-p2p-alias-index-v1.mjs";

export const OFFICIAL_DATA_SOURCE_ID = "starcraft-tmg.official.command-center";
export const OFFICIAL_DATA_CERTIFICATION_PURPOSE = "official_data_certification";

const VERSION_FIELDS = Object.freeze(["cardsVersion", "rulesVersion", "unitsVersion"]);
const REVIEW_EVIDENCE_FIELDS = Object.freeze([
  "recordSchemaReviewHash",
  "officialScopeReviewHash",
  "communityIsolationReviewHash",
  "p2pPrecedenceReviewHash",
]);
const REVIEW_ENVIRONMENTS = new Set(["contract_fixture", "production_review"]);
const HASH_PATTERN = /^[a-f0-9]{64}$/u;

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function isoInstant(value, code) {
  try {
    const normalized = new Date(value).toISOString();
    if (normalized !== value) fail(code);
    return normalized;
  } catch {
    fail(code);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function normalizedVersions(value) {
  if (!object(value)) fail("official_data_versions_required");
  return Object.fromEntries(VERSION_FIELDS.map((field) => {
    const version = String(value[field] || "");
    if (!/^\d+$/u.test(version)) fail("official_data_version_invalid", field);
    return [field, version];
  }));
}

function numericVersions(value) {
  const normalized = normalizedVersions(value);
  return VERSION_FIELDS.map((field) => BigInt(normalized[field]));
}

function sameVersions(left, right) {
  return VERSION_FIELDS.every((field) => String(left?.[field]) === String(right?.[field]));
}

function dominates(left, right) {
  const a = numericVersions(left);
  const b = numericVersions(right);
  return a.every((version, index) => version >= b[index])
    && a.some((version, index) => version > b[index]);
}

function assertOfficialSnapshot(snapshot) {
  verifyCommandCenterSnapshot(snapshot);
  if (snapshot.sourceId !== OFFICIAL_DATA_SOURCE_ID) fail("non_official_current_data_source_forbidden");
  normalizedVersions(snapshot.dataVersions);
  return snapshot;
}

function assertHash(value, code) {
  if (!HASH_PATTERN.test(String(value || ""))) fail(code);
  return value;
}

function certificationBody(certification) {
  return without(certification, ["certificationHash", "proof"]);
}

function selectionBody(selection) {
  return without(selection, ["selectionHash"]);
}

function bindingBody(binding) {
  return without(binding, ["bindingHash"]);
}

export function certifyOfficialDataSnapshot(input = {}) {
  const snapshot = assertOfficialSnapshot(input.snapshot);
  const dataset = input.dataset;
  if (!dataset) fail("official_normalized_dataset_required");
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  verifyOfficialDataReviewEvidenceBundle({
    snapshot,
    dataset,
    datasetAudit: input.datasetAudit,
    aliasIndex: input.aliasIndex,
    evidenceBundle: input.reviewEvidenceBundle,
  });
  const signer = input.signer;
  if (!signer || typeof signer.sign !== "function" || !object(signer.descriptor)) {
    fail("official_data_certification_signer_required");
  }
  const reviewEnvironment = requiredText(input.reviewEnvironment, "official_data_review_environment_required");
  if (!REVIEW_ENVIRONMENTS.has(reviewEnvironment)) fail("official_data_review_environment_invalid");
  if (reviewEnvironment === "production_review"
    && (signer.descriptor.productionReady !== true || signer.descriptor.trustLevel !== "externally_managed")) {
    fail("official_data_production_reviewer_key_required");
  }
  const evidence = Object.fromEntries(REVIEW_EVIDENCE_FIELDS.map((field) => {
    const hash = input.reviewEvidenceBundle?.[field];
    if (!HASH_PATTERN.test(String(hash || ""))) fail("official_data_review_evidence_incomplete", field);
    return [field, hash];
  }));
  const audit = verifyCommandCenterSnapshot(snapshot);
  const body = {
    schema: "starcraft_tmg_official_data_certification_v1",
    sourceId: OFFICIAL_DATA_SOURCE_ID,
    snapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    dataVersions: normalizedVersions(snapshot.dataVersions),
    snapshotStatus: snapshot.snapshotStatus,
    reviewEnvironment,
    reviewedAt: isoInstant(input.reviewedAt, "official_data_reviewed_at_invalid"),
    reviewerPrincipal: requiredText(input.reviewerPrincipal, "official_data_reviewer_principal_required"),
    reviewerKey: signer.descriptor,
    evidence,
    evidenceBundleHash: input.reviewEvidenceBundle.evidenceBundleHash,
    recordCount: audit.counts.documents,
    canAffectRules: false,
    trainingTruth: false,
  };
  const proof = signer.sign(body, OFFICIAL_DATA_CERTIFICATION_PURPOSE);
  return deepFreeze({
    ...body,
    proof,
    certificationHash: hashStarcraftTmgContract({ body, proof }),
  });
}

export function verifyOfficialDataCertification(input = {}) {
  const snapshot = assertOfficialSnapshot(input.snapshot);
  const dataset = input.dataset;
  if (!dataset) fail("official_normalized_dataset_required");
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  const certification = input.certification;
  const signer = input.signer;
  if (!object(certification) || certification.schema !== "starcraft_tmg_official_data_certification_v1") {
    fail("official_data_certification_schema_invalid");
  }
  if (!signer || typeof signer.verify !== "function") fail("official_data_certification_verifier_required");
  const body = certificationBody(certification);
  if (certification.sourceId !== OFFICIAL_DATA_SOURCE_ID
    || certification.snapshotHash !== snapshot.snapshotHash
    || certification.normalizedDatasetHash !== dataset.datasetHash
    || !sameVersions(certification.dataVersions, snapshot.dataVersions)
    || certification.snapshotStatus !== snapshot.snapshotStatus
    || certification.canAffectRules !== false
    || certification.trainingTruth !== false) {
    fail("official_data_certification_snapshot_mismatch");
  }
  if (!REVIEW_ENVIRONMENTS.has(certification.reviewEnvironment)) {
    fail("official_data_review_environment_invalid");
  }
  for (const field of REVIEW_EVIDENCE_FIELDS) {
    assertHash(certification.evidence?.[field], "official_data_review_evidence_incomplete");
  }
  assertHash(certification.evidenceBundleHash, "official_data_review_evidence_bundle_hash_required");
  const expectedHash = hashStarcraftTmgContract({ body, proof: certification.proof });
  if (certification.certificationHash !== expectedHash) fail("official_data_certification_hash_mismatch");
  if (!signer.verify(body, certification.proof, OFFICIAL_DATA_CERTIFICATION_PURPOSE)) {
    fail("official_data_certification_signature_invalid");
  }
  return true;
}

export function selectOfficialLatestDataSnapshot(input = {}) {
  if (!Array.isArray(input.snapshots) || input.snapshots.length === 0) {
    fail("official_data_snapshot_candidate_required");
  }
  const snapshots = input.snapshots.map(assertOfficialSnapshot);
  const byHash = new Map();
  for (const snapshot of snapshots) {
    const existing = byHash.get(snapshot.snapshotHash);
    if (existing && !sameVersions(existing.dataVersions, snapshot.dataVersions)) {
      fail("official_data_snapshot_hash_collision");
    }
    byHash.set(snapshot.snapshotHash, snapshot);
  }
  const candidates = [...byHash.values()];
  const datasetBySnapshotHash = new Map();
  for (const dataset of input.datasets || []) {
    const snapshot = byHash.get(dataset?.sourceSnapshotHash);
    if (!snapshot) fail("official_normalized_dataset_snapshot_not_selected");
    verifyOfficialCommandCenterDataset({ snapshot, dataset });
    const existing = datasetBySnapshotHash.get(snapshot.snapshotHash);
    if (existing && existing.datasetHash !== dataset.datasetHash) {
      fail("official_normalized_dataset_conflict", snapshot.snapshotHash);
    }
    datasetBySnapshotHash.set(snapshot.snapshotHash, dataset);
  }
  const receiptCandidates = input.sameVersionDriftReceipts || [];
  if (!Array.isArray(receiptCandidates)) fail("official_same_version_drift_receipts_invalid");
  const consumedReceiptHashes = new Set();
  const supersededSnapshotHashes = new Set();
  const driftChainByLatestSnapshot = new Map();
  const versionGroups = new Map();
  for (const candidate of candidates) {
    const key = VERSION_FIELDS.map((field) => String(candidate.dataVersions[field])).join("/");
    if (!versionGroups.has(key)) versionGroups.set(key, []);
    versionGroups.get(key).push(candidate);
  }
  for (const group of versionGroups.values()) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((left, right) => {
      const leftTime = Date.parse(isoInstant(left.capturedAt, "official_data_snapshot_capture_time_invalid"));
      const rightTime = Date.parse(isoInstant(right.capturedAt, "official_data_snapshot_capture_time_invalid"));
      return leftTime - rightTime || left.snapshotHash.localeCompare(right.snapshotHash);
    });
    const chain = [];
    for (let index = 1; index < ordered.length; index += 1) {
      const baseSnapshot = ordered[index - 1];
      const resultSnapshot = ordered[index];
      if (Date.parse(baseSnapshot.capturedAt) === Date.parse(resultSnapshot.capturedAt)) {
        fail("official_data_same_version_conflict");
      }
      const matchingReceipts = receiptCandidates.filter((receipt) => (
        receipt?.baseSnapshotHash === baseSnapshot.snapshotHash
          && receipt?.resultSnapshotHash === resultSnapshot.snapshotHash
      ));
      if (matchingReceipts.length !== 1) fail("official_data_same_version_conflict");
      const baseDataset = datasetBySnapshotHash.get(baseSnapshot.snapshotHash);
      const resultDataset = datasetBySnapshotHash.get(resultSnapshot.snapshotHash);
      if (!baseDataset || !resultDataset) fail("official_normalized_dataset_required");
      const receipt = matchingReceipts[0];
      verifyOfficialSameVersionDisplayOnlyDriftReceipt({
        receipt,
        baseSnapshot,
        resultSnapshot,
        baseDataset,
        resultDataset,
        firestoreDeltaReceipt: receipt.firestoreDeltaReceipt,
      });
      consumedReceiptHashes.add(receipt.receiptHash);
      supersededSnapshotHashes.add(baseSnapshot.snapshotHash);
      chain.push(receipt.receiptHash);
    }
    driftChainByLatestSnapshot.set(ordered.at(-1).snapshotHash, chain);
  }
  if (consumedReceiptHashes.size !== receiptCandidates.length) {
    fail("official_same_version_drift_receipt_unbound");
  }
  const eligibleCandidates = candidates.filter((candidate) => !supersededSnapshotHashes.has(candidate.snapshotHash));
  const maximal = eligibleCandidates.filter((candidate) => !eligibleCandidates.some((other) => (
    other.snapshotHash !== candidate.snapshotHash && dominates(other.dataVersions, candidate.dataVersions)
  )));
  if (maximal.length !== 1) fail("official_data_version_conflict");
  const selected = maximal[0];
  const selectedDataset = datasetBySnapshotHash.get(selected.snapshotHash);
  if (!selectedDataset) fail("official_normalized_dataset_required");
  const environment = String(input.environment || "production_review");
  if (!REVIEW_ENVIRONMENTS.has(environment)) fail("official_data_selection_environment_invalid");

  const matching = (input.certifications || []).filter((entry) => entry?.snapshotHash === selected.snapshotHash);
  if (matching.length > 1) fail("official_data_certification_conflict");
  let certificationHash = null;
  let roomBindingEligible = false;
  if (matching.length === 1) {
    verifyOfficialDataCertification({
      snapshot: selected,
      dataset: selectedDataset,
      certification: matching[0],
      signer: input.certificationSigner,
    });
    certificationHash = matching[0].certificationHash;
    roomBindingEligible = matching[0].reviewEnvironment === environment
      && (environment !== "production_review"
        || (input.certificationSigner?.descriptor?.productionReady === true
          && input.certificationSigner?.descriptor?.trustLevel === "externally_managed"));
  }
  const body = {
    schema: "starcraft_tmg_official_latest_data_selection_v1",
    sourceId: OFFICIAL_DATA_SOURCE_ID,
    selectedSnapshotHash: selected.snapshotHash,
    selectedDatasetHash: selectedDataset.datasetHash,
    selectedDataVersions: normalizedVersions(selected.dataVersions),
    ...(driftChainByLatestSnapshot.has(selected.snapshotHash) ? {
      sameVersionDriftReceiptHashes: driftChainByLatestSnapshot.get(selected.snapshotHash),
    } : {}),
    selectedAt: isoInstant(input.selectedAt, "official_data_selected_at_invalid"),
    environment,
    certificationHash,
    status: roomBindingEligible ? "selected_certified_exact_snapshot" : "selected_but_certification_required",
    roomBindingEligible,
    updatePolicy: "new_official_snapshots_apply_to_new_rooms_only",
    repositoryFallbackAllowed: false,
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, selectionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialRoomDataBinding(input = {}) {
  const selection = input.selection;
  if (!object(selection) || selection.schema !== "starcraft_tmg_official_latest_data_selection_v1") {
    fail("official_latest_data_selection_invalid");
  }
  if (hashStarcraftTmgContract(selectionBody(selection)) !== selection.selectionHash) {
    fail("official_latest_data_selection_hash_mismatch");
  }
  if (selection.sourceId !== OFFICIAL_DATA_SOURCE_ID || selection.repositoryFallbackAllowed !== false) {
    fail("non_official_current_data_source_forbidden");
  }
  if (selection.roomBindingEligible !== true
    || selection.status !== "selected_certified_exact_snapshot"
    || !selection.certificationHash) {
    fail("official_latest_data_snapshot_not_room_eligible");
  }
  const body = {
    schema: "starcraft_tmg_official_room_data_binding_v1",
    roomId: requiredText(input.roomId, "official_data_room_id_required"),
    sourceId: OFFICIAL_DATA_SOURCE_ID,
    dataSnapshotHash: assertHash(selection.selectedSnapshotHash, "official_data_snapshot_hash_invalid"),
    normalizedDatasetHash: assertHash(selection.selectedDatasetHash, "official_normalized_dataset_hash_invalid"),
    dataVersions: normalizedVersions(selection.selectedDataVersions),
    certificationHash: assertHash(selection.certificationHash, "official_data_certification_hash_invalid"),
    selectionHash: selection.selectionHash,
    boundAt: isoInstant(input.boundAt, "official_data_bound_at_invalid"),
    updatePolicy: "frozen_for_room_lifetime",
    repositoryFallbackAllowed: false,
    canAffectRules: false,
    trainingTruth: false,
  };
  return deepFreeze({ ...body, bindingHash: hashStarcraftTmgContract(body) });
}

export function resolveHistoricalRoomDataBinding(input = {}) {
  const binding = input.binding;
  if (!object(binding) || binding.schema !== "starcraft_tmg_official_room_data_binding_v1") {
    fail("official_room_data_binding_invalid");
  }
  if (hashStarcraftTmgContract(bindingBody(binding)) !== binding.bindingHash) {
    fail("official_room_data_binding_hash_mismatch");
  }
  const snapshot = input.snapshotsByHash instanceof Map
    ? input.snapshotsByHash.get(binding.dataSnapshotHash)
    : input.snapshotsByHash?.[binding.dataSnapshotHash];
  if (!snapshot) fail("historical_official_data_snapshot_missing", binding.dataSnapshotHash);
  assertOfficialSnapshot(snapshot);
  const dataset = input.datasetsByHash instanceof Map
    ? input.datasetsByHash.get(binding.normalizedDatasetHash)
    : input.datasetsByHash?.[binding.normalizedDatasetHash];
  if (!dataset) fail("historical_official_normalized_dataset_missing", binding.normalizedDatasetHash);
  verifyOfficialCommandCenterDataset({ snapshot, dataset });
  if (snapshot.snapshotHash !== binding.dataSnapshotHash
    || dataset.datasetHash !== binding.normalizedDatasetHash
    || !sameVersions(snapshot.dataVersions, binding.dataVersions)) {
    fail("historical_official_data_snapshot_binding_mismatch");
  }
  return deepFreeze({
    schema: "starcraft_tmg_historical_room_data_resolution_v1",
    roomId: binding.roomId,
    bindingHash: binding.bindingHash,
    snapshotHash: snapshot.snapshotHash,
    normalizedDatasetHash: dataset.datasetHash,
    dataVersions: normalizedVersions(snapshot.dataVersions),
    resolutionPolicy: "exact_frozen_snapshot_only",
    repositoryFallbackAllowed: false,
    canAffectRules: false,
    trainingTruth: false,
  });
}
