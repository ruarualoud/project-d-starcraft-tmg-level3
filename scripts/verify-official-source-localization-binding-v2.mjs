#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1 } from
  "../content/localization/zh-cn-core-v1.mjs";
import { createStarcraftTmgLocalizationHttpAdapter } from
  "../packages/localization/http-handler-v1.mjs";
import { createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2 } from
  "../packages/product-composition/source-localization-factory-v2.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(
  LEVEL3_ROOT,
  "build/official-source-localization-binding-v2/report.json",
);
const CREATED_AT = "2026-09-02T12:00:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function main() {
  const checks = [];
  const failures = [];
  let providerCalls = 0;
  const frozen = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: LEVEL3_ROOT });
  const officialDatasetBefore = JSON.stringify(frozen.dataset);
  const composition = createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2({
    sourceLock: frozen.lock,
    sourceLockAudit: frozen.audit,
    snapshot: frozen.snapshot,
    dataset: frozen.dataset,
    glossaries: [STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1],
    translationAdapter: {
      async translate(request) {
        providerCalls += 1;
        assert(request.intent.providerClass === "direct_translation_provider", "forbidden Provider class selected");
        assert(request.intent.datasetRef.datasetHash === composition.datasetManifest.datasetHash, "Provider intent lost official localization dataset binding");
        assert(request.canonicalText === "Adept", "Provider received unexpected canonical source text");
        return {
          translatedText: "使徒",
          providerReceipt: {
            provider: "injected-official-source-verifier",
            model: "fake-translation-model-v2",
            requestId: `official-source-translation-${providerCalls}`,
            usage: { inputTokens: 12, outputTokens: 2 },
          },
          qualitySignals: { glossaryHash: request.glossary.glossaryHash },
          createdAt: CREATED_AT,
        };
      },
    },
    resolveProviderProfile(profileId) {
      if (profileId === "translation-admin-default") {
        return {
          id: profileId,
          version: "1",
          providerClass: "direct_translation_provider",
          promptTemplateVersion: "starcraft-tmg-translation-prompt-v1",
        };
      }
      if (profileId === "forbidden-dsh") {
        return {
          id: profileId,
          version: "1",
          providerClass: "deepseek-harness",
          promptTemplateVersion: "forbidden",
        };
      }
      return null;
    },
    now: () => CREATED_AT,
  });
  const runtime = composition.runtime;
  const http = createStarcraftTmgLocalizationHttpAdapter({ runtime });

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

  await check("frozen_official_71_69_48_chain_is_the_only_v2_source", () => {
    const binding = composition.sourceBinding;
    assert(binding.sourceId === "starcraft-tmg.official.command-center", "official source id mismatch");
    assert(binding.sourceLockHash === "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1", "source lock mismatch");
    assert(binding.sourceSnapshotHash === "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105", "snapshot mismatch");
    assert(binding.officialDatasetHash === "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067", "official dataset mismatch");
    assert(JSON.stringify(binding.dataVersions) === JSON.stringify({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }), "version tuple mismatch");
    assert(binding.sourceRefreshPolicy === "explicit_user_command_only" && binding.repositoryFallbackAllowed === false, "source refresh/fallback policy widened");
  });

  await check("official_dataset_projects_complete_display_lineage_without_rules_authority", () => {
    const inspection = runtime.inspect();
    assert(inspection.sourceRegistry.length === 9, "v2 source registry denominator mismatch");
    assert(inspection.dataset.recordCount === 271 && inspection.dataset.fieldCount === 1440, "official localization denominator mismatch");
    assert(inspection.dataset.lineageComplete === true, "captured official lineage was not closed");
    assert(inspection.dataset.rulesEligible === false && inspection.dataset.redistributionAllowed === false, "display projection overclaimed rules or redistribution authority");
    assert(inspection.fieldProvenance.countsByAuthorityDisposition.official_current_product_candidate === 617, "official product field count mismatch");
    assert(inspection.fieldProvenance.countsByAuthorityDisposition.official_rule_prose_review_required === 269, "rule prose field count mismatch");
    assert(inspection.fieldProvenance.countsByAuthorityDisposition.community_display_only === 554, "community field count mismatch");
    assert(!JSON.stringify(inspection).includes("Adept"), "inspection leaked canonical record content");
  });

  await check("official_product_field_renders_with_exact_source_provenance", () => {
    const result = runtime.render({
      recordType: "unit",
      canonicalId: "adept",
      fieldPath: "army_units[].name",
      targetLocale: "zh-CN",
    });
    assert(result.ok && result.text === "Adept" && result.source === "canonical_fallback", "official canonical fallback failed");
    assert(result.sourceProvenance.recordKey === "army_units:adept", "record provenance mismatch");
    assert(result.sourceProvenance.authorityDisposition === "official_current_product_candidate", "official product authority label missing");
    assert(result.sourceBindingRef.officialDatasetHash === frozen.dataset.datasetHash, "field lost official dataset binding");
    assert(result.canonicalSourceUnchanged === true && result.translationMayAffectRules === false, "localization gained canonical authority");
  });

  await check("community_and_rule_prose_records_cannot_claim_current_product_authority", () => {
    const community = runtime.render({
      recordType: "community_mission",
      canonicalId: "jvkHAaXJGa91Sbt751F1",
      fieldPath: "faction_cards[].name",
      targetLocale: "zh-CN",
    });
    assert(community.ok && community.text === "Ghosts In the Fog", "community display field missing");
    assert(community.sourceProvenance.authorityLabel === "community_display_only", "community content claimed official status");
    const ruleIndex = frozen.dataset.recordIndex.find((entry) => entry.authorityDisposition === "official_rule_prose_review_required");
    const rule = runtime.render({
      recordType: ruleIndex.recordType,
      canonicalId: ruleIndex.documentId,
      fieldPath: `${ruleIndex.collectionId}[].title`,
      targetLocale: "zh-CN",
    });
    assert(rule.ok && rule.sourceProvenance.authorityLabel === "official_rule_prose_pending_rulebook_precedence", "rule prose bypassed precedence review");
    assert(rule.mayAffectRules === false && rule.trainingTruth === false, "display source changed Rules/training truth");
  });

  await check("legacy_and_repository_fallback_inputs_fail_closed", () => {
    let rejected = false;
    try {
      createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2({
        sourceLock: frozen.lock,
        sourceLockAudit: frozen.audit,
        snapshot: frozen.snapshot,
        dataset: frozen.dataset,
        legacyPack: {},
      });
    } catch (error) {
      rejected = String(error?.message || error).includes("legacy localization input is forbidden");
    }
    assert(rejected, "legacy pack entered official localization v2");
    assert(runtime.inspect().sourcePolicy.repositoryFallbackAllowed === false, "repository fallback became available");
  });

  await check("tampered_official_dataset_is_rejected_before_catalogue_build", () => {
    const tampered = clone(frozen.dataset);
    tampered.recordsByKey["army_units:adept"].payload.name = "Repository Adept";
    let rejected = false;
    try {
      createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2({
        sourceLock: frozen.lock,
        sourceLockAudit: frozen.audit,
        snapshot: frozen.snapshot,
        dataset: tampered,
      });
    } catch {
      rejected = true;
    }
    assert(rejected, "tampered official data entered localization runtime");
  });

  await check("tampered_source_lock_is_rejected_without_network_recovery", () => {
    const tamperedLock = clone(frozen.lock);
    tamperedLock.policy.automaticRefreshAllowed = true;
    let rejected = false;
    try {
      createConfiguredStarcraftTmgOfficialSourceLocalizationRuntimeV2({
        sourceLock: tamperedLock,
        sourceLockAudit: frozen.audit,
        snapshot: frozen.snapshot,
        dataset: frozen.dataset,
      });
    } catch {
      rejected = true;
    }
    assert(rejected, "tampered source lock entered localization runtime");
    assert(frozen.lock.policy.automaticRefreshAllowed === false, "factory attempted to mutate or recover the frozen lock");
  });

  await check("dsh_is_rejected_before_translation_provider_invocation", async () => {
    const result = await runtime.requestMachineTranslation({
      recordType: "unit",
      canonicalId: "adept",
      fieldPath: "army_units[].name",
      targetLocale: "zh-CN",
      providerProfileId: "forbidden-dsh",
      createdAt: CREATED_AT,
    });
    assert(!result.ok && result.reason === "translation_intent_rejected", "DSH translation profile was accepted");
    assert(providerCalls === 0, "DSH rejection happened after Provider invocation");
  });

  let candidateHash = null;
  await check("machine_draft_binds_official_source_and_stays_admin_only", async () => {
    const created = await http.handle({
      method: "POST",
      pathname: "/starcraft-tmg-level3/source/api/v1/translations",
      adminAuthorized: true,
      body: {
        recordType: "unit",
        canonicalId: "adept",
        fieldPath: "army_units[].name",
        targetLocale: "zh-CN",
        providerProfileId: "translation-admin-default",
        createdAt: CREATED_AT,
      },
    });
    assert(created.status === 200 && providerCalls === 1, "machine draft Provider call mismatch");
    candidateHash = created.response.result.candidate.candidateHash;
    assert(created.response.result.sourceProvenance.officialDatasetHash === frozen.dataset.datasetHash, "machine draft lost official source provenance");
    assert(created.response.result.candidate.datasetRef.datasetHash === composition.datasetManifest.datasetHash, "candidate dataset binding mismatch");
    const ordinary = await http.handle({
      method: "GET",
      pathname: "/starcraft-tmg-level3/source/api/v1/fields/unit/adept",
      query: { fieldPath: "army_units[].name", targetLocale: "zh-CN", allowMachineDraft: "true" },
    });
    assert(ordinary.response.result.text === "Adept", "ordinary client saw unreviewed machine draft");
  });

  await check("human_correction_changes_sidecar_only_and_keeps_official_payload_byte_stable", async () => {
    const reviewed = await http.handle({
      method: "POST",
      pathname: `/starcraft-tmg-level3/source/api/v1/translations/${candidateHash}/review`,
      adminAuthorized: true,
      principal: { id: "translation-admin-1", role: "translation_admin" },
      body: {
        decision: "approve_with_correction",
        correctedText: "使徒单位",
        reviewedAt: "2026-09-02T12:05:00.000Z",
      },
    });
    assert(reviewed.status === 200 && reviewed.response.result.localizedField.text === "使徒单位", "reviewed correction did not render");
    assert(reviewed.response.result.sourceProvenance.recordKey === "army_units:adept", "review lost exact source provenance");
    assert(reviewed.response.result.canonicalSourceUnchanged === true, "review mutated canonical source");
    assert(JSON.stringify(frozen.dataset) === officialDatasetBefore, "official dataset changed after translation review");
  });

  await check("http_metadata_exposes_hashes_and_authority_counts_not_raw_payloads", async () => {
    const response = await http.handle({
      method: "GET",
      pathname: "/starcraft-tmg-level3/source/api/v1/metadata",
    });
    assert(response.status === 200, "metadata endpoint failed");
    assert(response.response.result.sourceBinding.bindingHash === composition.sourceBinding.bindingHash, "metadata source binding mismatch");
    assert(response.response.result.fieldProvenance.fieldCount === 1440, "metadata field denominator mismatch");
    assert(!JSON.stringify(response).includes("Psionic Presence"), "metadata leaked official payload text");
  });

  const report = {
    schemaVersion: "starcraft_tmg_official_source_localization_binding_verifier_v2",
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    checks,
    failures,
    evidence: {
      sourceLockHash: composition.sourceBinding.sourceLockHash,
      sourceSnapshotHash: composition.sourceBinding.sourceSnapshotHash,
      officialDatasetHash: composition.sourceBinding.officialDatasetHash,
      localizationDatasetHash: composition.datasetManifest.datasetHash,
      sourceBindingHash: composition.sourceBinding.bindingHash,
      fieldCatalogueHash: composition.fieldCatalogue.catalogueHash,
      fieldProvenanceCatalogueHash: composition.fieldProvenanceCatalogue.catalogueHash,
      recordCount: composition.datasetManifest.recordCount,
      fieldCount: composition.fieldCatalogue.fieldCount,
      countsByAuthorityDisposition: composition.fieldProvenanceCatalogue.countsByAuthorityDisposition,
      providerCalls,
      providerEvidence: "injected_fake_adapter_only_not_live_provider",
      sourceRefreshPerformed: false,
      legacyOrRepositoryFallbackUsed: false,
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
