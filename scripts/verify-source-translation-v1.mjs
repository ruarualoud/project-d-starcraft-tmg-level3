#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1 } from "../content/source-registry-v1.mjs";
import { adaptStarcraftTmgLegacyDataPack } from "../packages/source-data/legacy-pack-adapter-v1.mjs";
import {
  createStarcraftTmgSourceRegistry,
  sealStarcraftTmgSourceSnapshot,
} from "../packages/source-data/source-registry-v1.mjs";
import {
  createStarcraftTmgMachineTranslationCandidate,
  createStarcraftTmgTranslationGlossary,
  createStarcraftTmgTranslationIntent,
  createStarcraftTmgTranslationSidecarManifest,
  renderStarcraftTmgLocalizedField,
  reviewStarcraftTmgTranslationCandidate,
} from "../packages/localization/translation-sidecar-v1.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const LEGACY_PACK_PATH = path.join(PROJECT_ROOT, "starcraft-tmg-local", "data", "starcraft-tmg-data.json");
const REPORT_PATH = path.join(LEVEL3_ROOT, "build", "source-translation-v1", "report.json");
const CAPTURED_AT = "2026-08-24T05:00:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const checks = [];
  const failures = [];
  const registry = createStarcraftTmgSourceRegistry({ sources: STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1 });
  const legacyRaw = await readFile(LEGACY_PACK_PATH, "utf8");
  const legacyPack = JSON.parse(legacyRaw);
  const legacyDescriptor = registry.get("project-d.starcraft-tmg.legacy-data-pack-v0");
  const packSnapshot = sealStarcraftTmgSourceSnapshot({
    source: legacyDescriptor,
    rawContent: legacyRaw,
    capturedAt: CAPTURED_AT,
    mediaType: "application/json",
    rawContentStored: true,
    reviewStatus: "legacy_adapter_unreviewed",
    retrieval: { kind: "workspace_file", relativePath: "starcraft-tmg-local/data/starcraft-tmg-data.json" },
  });
  let adapted = null;
  let glossary = null;
  let intent = null;
  let candidate = null;
  let approved = null;
  let corrected = null;
  let sidecar = null;

  async function check(id, fn) {
    try {
      await fn();
      checks.push({ id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, ok: false, error: message });
      failures.push(`${id}: ${message}`);
    }
  }

  await check("source_registry_keeps_authority_and_rights_scopes_separate", () => {
    assert(registry.list().length === 8, "source registry count mismatch");
    const firestoreCandidate = registry.requireScope("starcraft-tmg.product.firestore", "unit_profiles_candidate");
    assert(firestoreCandidate.ok, "Firestore candidate scope was not registered");
    const unreviewed = registry.requireScope("starcraft-tmg.product.firestore", "unit_profiles_candidate", { requireReviewed: true });
    assert(!unreviewed.ok && unreviewed.reason === "source_review_required", "unreviewed product backend became canonical");
    const fandom = registry.requireScope("starcraft-wiki.fandom.cached-assets", "official_product_asset");
    assert(!fandom.ok && fandom.reason === "scope_explicitly_prohibited", "Fandom asset became an official product asset");
    const rulebook = registry.requireScope("starcraft-tmg.archon.rulebook.en", "rules_text", { requireReviewed: true });
    assert(!rulebook.ok && rulebook.reason === "source_review_required", "uncaptured rulebook became reviewed rule truth");
  });

  await check("raw_snapshot_hash_is_content_bound_and_contains_no_raw_payload", () => {
    const changed = sealStarcraftTmgSourceSnapshot({
      source: legacyDescriptor,
      rawContent: `${legacyRaw}\n`,
      capturedAt: CAPTURED_AT,
      mediaType: "application/json",
      rawContentStored: true,
      reviewStatus: "legacy_adapter_unreviewed",
      retrieval: { kind: "workspace_file", relativePath: "starcraft-tmg-local/data/starcraft-tmg-data.json" },
    });
    assert(packSnapshot.rawSha256 !== changed.rawSha256, "raw snapshot hash ignored content change");
    assert(packSnapshot.snapshotHash !== changed.snapshotHash, "snapshot receipt ignored content change");
    assert(!JSON.stringify(packSnapshot).includes(legacyPack.units[0].upgrades[0].description), "snapshot receipt embedded raw content");
  });

  await check("legacy_pack_is_inventory_bound_but_not_promoted_to_official_truth", () => {
    adapted = adaptStarcraftTmgLegacyDataPack({ pack: legacyPack, packSnapshot, generatedAt: CAPTURED_AT });
    assert(adapted.ok, "legacy pack adapter failed");
    assert(adapted.audit.countMismatches.length === 0, "legacy declared/observed counts mismatch");
    assert(adapted.audit.observedCounts.units === 26 && adapted.audit.observedCounts.cards === 37, "legacy pack core counts mismatch");
    assert(adapted.audit.observedCounts.officialMissions === 10 && adapted.audit.observedCounts.officialDeployments === 10, "legacy pack official-candidate counts mismatch");
    assert(adapted.manifest.lineage.complete === false && adapted.manifest.lineage.upstreamRawSnapshotsBound === false, "legacy pack overclaimed upstream lineage");
    assert(adapted.manifest.exactness.rulesEligible === false && adapted.manifest.training.eligible === false, "legacy pack overclaimed rules/training eligibility");
    assert(adapted.audit.officialDataStatus === "candidate_unreviewed", "legacy pack was mislabeled official");
    assert(adapted.manifest.recordIndex.some((record) => record.authorityStatus === "community_display_only"), "community records were not separated");
    assert(adapted.manifest.recordIndex.some((record) => record.authorityStatus === "experimental_derived"), "Project D-derived records were not separated");
  });

  await check("translation_intent_binds_dataset_record_field_text_glossary_and_provider", () => {
    const unit = legacyPack.units.find((record) => record.id === "adept") || legacyPack.units[0];
    const unitRef = adapted.manifest.recordIndex.find((record) => record.recordType === "unit" && record.canonicalId === unit.id);
    glossary = createStarcraftTmgTranslationGlossary({
      glossaryId: "starcraft-tmg.zh-cn.core.v1",
      version: "1.0.0",
      sourceLocale: "en",
      targetLocale: "zh-CN",
      entries: [
        { termId: "unit", sourceTerm: "Unit", targetTerm: "单位" },
        { termId: "movement-phase", sourceTerm: "Movement Phase", targetTerm: "移动阶段" },
        { termId: "adept-protected", sourceTerm: "Adept", targetTerm: "使徒", protectedIdentifier: false },
      ],
    });
    intent = createStarcraftTmgTranslationIntent({
      datasetId: adapted.manifest.datasetId,
      datasetVersion: adapted.manifest.datasetVersion,
      datasetHash: adapted.manifest.datasetHash,
      recordType: "unit",
      canonicalId: unit.id,
      recordHash: unitRef.recordHash,
      fieldPath: "units[].name",
      canonicalText: unit.name,
      sourceLocale: "en",
      targetLocale: "zh-CN",
      glossary,
      providerClass: "direct_translation_provider",
      providerProfileRef: { id: "translation-provider.admin-default.v1", version: "1" },
      promptTemplateVersion: "starcraft-tmg-translation-prompt-v1",
      createdAt: CAPTURED_AT,
    });
    assert(intent.mayOverwriteCanonical === false && intent.mayAffectRules === false, "translation intent gained canonical authority");
    let numericRejected = false;
    try {
      createStarcraftTmgTranslationIntent({
        datasetId: intent.datasetRef.datasetId,
        datasetVersion: intent.datasetRef.datasetVersion,
        datasetHash: intent.datasetRef.datasetHash,
        recordType: intent.recordRef.recordType,
        canonicalId: intent.recordRef.canonicalId,
        recordHash: intent.recordRef.recordHash,
        fieldPath: "units[].stats.speed",
        canonicalText: String(unit.stats.speed),
        sourceLocale: intent.sourceLocale,
        targetLocale: intent.targetLocale,
        glossary,
        providerClass: "direct_translation_provider",
        promptTemplateVersion: intent.promptTemplateVersion,
        createdAt: CAPTURED_AT,
      });
    } catch (error) {
      numericRejected = String(error?.message || error).includes("field is not eligible for display translation");
    }
    assert(numericRejected, "numeric rules field was accepted for display translation");
    let dshRejected = false;
    try {
      createStarcraftTmgTranslationIntent({
        datasetId: intent.datasetRef.datasetId,
        datasetVersion: intent.datasetRef.datasetVersion,
        datasetHash: intent.datasetRef.datasetHash,
        recordType: intent.recordRef.recordType,
        canonicalId: intent.recordRef.canonicalId,
        recordHash: intent.recordRef.recordHash,
        fieldPath: intent.recordRef.fieldPath,
        canonicalText: unit.name,
        sourceLocale: intent.sourceLocale,
        targetLocale: intent.targetLocale,
        glossary,
        providerClass: "deepseek-harness",
        promptTemplateVersion: intent.promptTemplateVersion,
        createdAt: CAPTURED_AT,
      });
    } catch (error) {
      dshRejected = String(error?.message || error).includes("DSH is forbidden in translation runtime");
    }
    assert(dshRejected, "DSH entered translation runtime");
  });

  await check("machine_translation_is_a_visible_draft_not_canonical_data", () => {
    candidate = createStarcraftTmgMachineTranslationCandidate({
      intent,
      translatedText: "使徒",
      providerReceipt: {
        provider: "verifier_fake_translation_transport",
        model: "fake-model-v1",
        requestId: "translation-verifier-request-1",
        usage: { inputTokens: 10, outputTokens: 2 },
      },
      qualitySignals: { glossaryTermsChecked: 3, sourceLanguageDetected: "en" },
      createdAt: CAPTURED_AT,
    });
    assert(candidate.status === "machine_draft" && candidate.mayAffectRules === false && candidate.trainingTruth === false, "machine translation draft overclaimed authority");
    const canonicalText = legacyPack.units.find((record) => record.id === intent.recordRef.canonicalId).name;
    const hiddenDraft = renderStarcraftTmgLocalizedField({
      canonicalText,
      datasetHash: adapted.manifest.datasetHash,
      recordType: intent.recordRef.recordType,
      canonicalId: intent.recordRef.canonicalId,
      fieldPath: intent.recordRef.fieldPath,
      targetLocale: "zh-CN",
      entries: [],
      machineCandidates: [candidate],
    });
    assert(hiddenDraft.text === canonicalText && hiddenDraft.source === "canonical_fallback", "unreviewed machine draft displayed without opt-in");
    const visibleDraft = renderStarcraftTmgLocalizedField({
      canonicalText,
      datasetHash: adapted.manifest.datasetHash,
      recordType: intent.recordRef.recordType,
      canonicalId: intent.recordRef.canonicalId,
      fieldPath: intent.recordRef.fieldPath,
      targetLocale: "zh-CN",
      entries: [],
      machineCandidates: [candidate],
      allowMachineDraft: true,
    });
    assert(visibleDraft.text === "使徒" && visibleDraft.source === "machine_translation_draft", "opt-in machine draft did not render");
    assert(visibleDraft.provenance.warning && visibleDraft.canonicalUnchanged, "machine draft missed warning or canonical immutability");
    assert(legacyPack.units.find((record) => record.id === intent.recordRef.canonicalId).name === canonicalText, "translation mutated canonical data");
  });

  await check("human_reviewed_sidecar_renders_and_stale_source_fails_closed", () => {
    approved = reviewStarcraftTmgTranslationCandidate({
      candidate,
      decision: "approve",
      reviewerId: "translation-verifier-human",
      reviewedAt: "2026-08-24T05:10:00.000Z",
      notes: "Verifier approval only; not production review evidence.",
    });
    corrected = reviewStarcraftTmgTranslationCandidate({
      candidate,
      decision: "approve_with_correction",
      correctedText: "使徒单位",
      reviewerId: "translation-verifier-human",
      reviewedAt: "2026-08-24T05:11:00.000Z",
      notes: "Later correction should win display selection.",
    });
    sidecar = createStarcraftTmgTranslationSidecarManifest({
      sidecarId: "starcraft-tmg.zh-cn.legacy-adapter.v1",
      version: "1.0.0",
      datasetRef: intent.datasetRef,
      targetLocale: "zh-CN",
      entries: [approved, corrected],
      generatedAt: "2026-08-24T05:12:00.000Z",
    });
    const rendered = renderStarcraftTmgLocalizedField({
      canonicalText: "Adept",
      datasetHash: adapted.manifest.datasetHash,
      recordType: intent.recordRef.recordType,
      canonicalId: intent.recordRef.canonicalId,
      fieldPath: intent.recordRef.fieldPath,
      targetLocale: "zh-CN",
      entries: sidecar.entries,
    });
    assert(rendered.text === "使徒单位" && rendered.source === "translation_sidecar", "latest approved correction did not render");
    assert(rendered.provenance.provenanceClass === "human_corrected_machine_translation", "correction provenance was lost");
    assert(rendered.mayAffectRules === false && rendered.canonicalUnchanged === true, "reviewed translation gained rule authority");
    const stale = renderStarcraftTmgLocalizedField({
      canonicalText: "Adept Updated",
      datasetHash: adapted.manifest.datasetHash,
      recordType: intent.recordRef.recordType,
      canonicalId: intent.recordRef.canonicalId,
      fieldPath: intent.recordRef.fieldPath,
      targetLocale: "zh-CN",
      entries: sidecar.entries,
    });
    assert(stale.text === "Adept Updated" && stale.provenance.reason === "translation_stale_after_canonical_change", "stale translation did not fail closed");
    assert(sidecar.rulesEligible === false && sidecar.trainingTruth === false, "translation sidecar overclaimed authority");
  });

  const report = {
    schemaVersion: "starcraft_tmg_source_translation_verifier_v1",
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    checks,
    failures,
    evidence: {
      sourceDescriptorHashes: registry.list().map((source) => source.descriptorHash),
      legacyPackRawSha256: packSnapshot.rawSha256,
      legacyPackSnapshotHash: packSnapshot.snapshotHash,
      normalizedDatasetHash: adapted?.manifest?.datasetHash || null,
      sourceAuditHash: adapted?.audit?.auditHash || null,
      officialDataStatus: adapted?.audit?.officialDataStatus || null,
      lineageComplete: adapted?.manifest?.lineage?.complete ?? false,
      glossaryHash: glossary?.glossaryHash || null,
      translationIntentHash: intent?.intentHash || null,
      machineCandidateHash: candidate?.candidateHash || null,
      approvedEntryHash: approved?.entryHash || null,
      correctedEntryHash: corrected?.entryHash || null,
      sidecarHash: sidecar?.sidecarHash || null,
      translationProviderEvidence: "injected_fake_transport_receipt_only_not_real_provider",
      rulesEligible: false,
      redistributionAllowed: false,
      productionReady: false,
      trainingTruth: false,
    },
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.ok) throw new Error(failures.join("\n"));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
