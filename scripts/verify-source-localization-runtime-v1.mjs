#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1 } from "../content/localization/zh-cn-core-v1.mjs";
import { STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1 } from "../content/source-registry-v1.mjs";
import { createStarcraftTmgLocalizationHttpAdapter } from "../packages/localization/http-handler-v1.mjs";
import { createConfiguredStarcraftTmgSourceLocalizationRuntime } from "../packages/product-composition/source-localization-factory-v1.mjs";
import {
  createStarcraftTmgSourceRegistry,
  sealStarcraftTmgSourceSnapshot,
} from "../packages/source-data/source-registry-v1.mjs";

const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const LEGACY_PACK_PATH = path.join(PROJECT_ROOT, "starcraft-tmg-local", "data", "starcraft-tmg-data.json");
const REPORT_PATH = path.join(LEVEL3_ROOT, "build", "source-localization-runtime-v1", "report.json");
const CREATED_AT = "2026-08-24T06:00:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const checks = [];
  const failures = [];
  let providerCalls = 0;
  const raw = await readFile(LEGACY_PACK_PATH, "utf8");
  const pack = JSON.parse(raw);
  const registry = createStarcraftTmgSourceRegistry({ sources: STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1 });
  const snapshot = sealStarcraftTmgSourceSnapshot({
    source: registry.get("project-d.starcraft-tmg.legacy-data-pack-v0"),
    rawContent: raw,
    capturedAt: CREATED_AT,
    mediaType: "application/json",
    rawContentStored: true,
    reviewStatus: "legacy_adapter_unreviewed",
    retrieval: { kind: "workspace_file", relativePath: "starcraft-tmg-local/data/starcraft-tmg-data.json" },
  });
  const composition = createConfiguredStarcraftTmgSourceLocalizationRuntime({
    legacyPack: pack,
    legacyPackSnapshot: snapshot,
    generatedAt: CREATED_AT,
    glossaries: [STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1],
    translationAdapter: {
      async translate(request) {
        providerCalls += 1;
        assert(request.intent.providerClass === "direct_translation_provider", "runtime selected a forbidden translation provider class");
        assert(request.canonicalText === "Adept", "fake adapter received unexpected canonical text");
        return {
          translatedText: "使徒",
          providerReceipt: {
            provider: "injected_verifier_translation_adapter",
            model: "fake-translation-model-v1",
            requestId: `fake-translation-request-${providerCalls}`,
            usage: { inputTokens: 12, outputTokens: 2 },
          },
          qualitySignals: { glossaryHash: request.glossary.glossaryHash },
          createdAt: CREATED_AT,
        };
      },
    },
    resolveProviderProfile(profileId) {
      if (profileId !== "translation-admin-default") return null;
      return {
        id: "translation-admin-default",
        version: "1",
        providerClass: "direct_translation_provider",
        promptTemplateVersion: "starcraft-tmg-translation-prompt-v1",
      };
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

  await check("deep_module_hides_source_and_translation_authority_complexity", () => {
    const inspection = runtime.inspect();
    assert(inspection.sourceRegistry.length === 8, "source registry projection mismatch");
    assert(inspection.dataset.recordCount === composition.adapted.manifest.recordCount, "dataset projection mismatch");
    assert(inspection.dataset.fieldCount > 0, "display field catalogue is empty");
    assert(inspection.dataset.lineageComplete === false, "legacy dataset overclaimed complete lineage");
    assert(inspection.dataset.rulesEligible === false && inspection.dataset.trainingEligible === false, "legacy dataset overclaimed authority");
    assert(inspection.translation.dshAllowed === false && inspection.translation.canonicalOverwriteAllowed === false, "translation authority widened");
    assert(!JSON.stringify(inspection).includes("Adept"), "inspection leaked canonical record payloads");
  });

  await check("canonical_render_is_default_and_unknown_fields_fail_closed", () => {
    const canonical = runtime.render({ recordType: "unit", canonicalId: "adept", fieldPath: "units[].name", targetLocale: "zh-CN" });
    assert(canonical.ok && canonical.text === "Adept" && canonical.source === "canonical_fallback", "canonical fallback failed");
    const missing = runtime.render({ recordType: "unit", canonicalId: "adept", fieldPath: "units[].stats.speed", targetLocale: "zh-CN" });
    assert(!missing.ok && missing.reason === "display_field_not_found", "rules/numeric field was exposed through localization runtime");
  });

  await check("http_requires_admin_and_never_accepts_provider_credentials", async () => {
    const unauthorized = await http.handle({
      method: "POST",
      pathname: "/starcraft-tmg-level3/source/api/v1/translations",
      body: { recordType: "unit", canonicalId: "adept", fieldPath: "units[].name", targetLocale: "zh-CN", providerProfileId: "translation-admin-default" },
    });
    assert(unauthorized.status === 403 && providerCalls === 0, "unauthorized request reached Provider adapter");
    const credential = await http.handle({
      method: "POST",
      pathname: "/starcraft-tmg-level3/source/api/v1/translations",
      adminAuthorized: true,
      body: { recordType: "unit", canonicalId: "adept", fieldPath: "units[].name", targetLocale: "zh-CN", providerProfileId: "translation-admin-default", apiKey: "must-not-enter" },
    });
    assert(credential.status === 400 && credential.response.error === "credential_wrong_endpoint" && providerCalls === 0, "credential material entered translation endpoint");
  });

  let candidateHash = null;
  await check("authorized_machine_draft_is_noncanonical_and_admin_opt_in_only", async () => {
    const created = await http.handle({
      method: "POST",
      pathname: "/starcraft-tmg-level3/source/api/v1/translations",
      adminAuthorized: true,
      body: {
        recordType: "unit",
        canonicalId: "adept",
        fieldPath: "units[].name",
        targetLocale: "zh-CN",
        providerProfileId: "translation-admin-default",
        createdAt: CREATED_AT,
      },
    });
    assert(created.status === 200 && providerCalls === 1, "authorized request did not produce exactly one Provider call");
    candidateHash = created.response.result.candidate.candidateHash;
    assert(created.response.result.candidate.status === "machine_draft", "Provider output bypassed machine-draft state");
    assert(created.response.result.canonicalUnchanged && !created.response.result.trainingTruth, "machine draft overclaimed authority");

    const ordinary = await http.handle({
      method: "GET",
      pathname: "/starcraft-tmg-level3/source/api/v1/fields/unit/adept",
      query: { fieldPath: "units[].name", targetLocale: "zh-CN", allowMachineDraft: "true" },
    });
    assert(ordinary.response.result.text === "Adept" && ordinary.response.result.source === "canonical_fallback", "ordinary client saw unreviewed draft");
    const admin = await http.handle({
      method: "GET",
      pathname: "/starcraft-tmg-level3/source/api/v1/fields/unit/adept",
      adminAuthorized: true,
      query: { fieldPath: "units[].name", targetLocale: "zh-CN", allowMachineDraft: "true" },
    });
    assert(admin.response.result.text === "使徒" && admin.response.result.source === "machine_translation_draft", "admin could not inspect machine draft");
  });

  await check("human_review_uses_authenticated_principal_and_publishes_sidecar_only", async () => {
    const wrongRole = await http.handle({
      method: "POST",
      pathname: `/starcraft-tmg-level3/source/api/v1/translations/${candidateHash}/review`,
      adminAuthorized: true,
      principal: { id: "observer-1", role: "observer" },
      body: { decision: "approve", reviewedAt: CREATED_AT },
    });
    assert(wrongRole.status === 403, "non-translation admin reviewed a candidate");
    const approved = await http.handle({
      method: "POST",
      pathname: `/starcraft-tmg-level3/source/api/v1/translations/${candidateHash}/review`,
      adminAuthorized: true,
      principal: { id: "translation-admin-1", role: "translation_admin" },
      body: { decision: "approve_with_correction", correctedText: "使徒单位", reviewedAt: "2026-08-24T06:10:00.000Z" },
    });
    assert(approved.status === 200, "translation admin review failed");
    assert(approved.response.result.entry.review.reviewerId === "translation-admin-1", "reviewer identity came from request body");
    assert(approved.response.result.localizedField.text === "使徒单位", "approved correction did not publish through sidecar");
    assert(approved.response.result.localizedField.canonicalUnchanged, "reviewed sidecar mutated canonical data");

    const publicField = await http.handle({
      method: "GET",
      pathname: "/starcraft-tmg-level3/source/api/v1/fields/unit/adept",
      query: { fieldPath: "units[].name", targetLocale: "zh-CN" },
    });
    assert(publicField.response.result.text === "使徒单位" && publicField.response.result.source === "translation_sidecar", "reviewed display sidecar was not readable");
    assert(pack.units.find((unit) => unit.id === "adept").name === "Adept", "canonical legacy pack was mutated");
  });

  const report = {
    schemaVersion: "starcraft_tmg_source_localization_runtime_verifier_v1",
    generatedAt: new Date().toISOString(),
    ok: failures.length === 0,
    checks,
    failures,
    evidence: {
      datasetHash: composition.adapted.manifest.datasetHash,
      catalogueHash: composition.fieldCatalogue.catalogueHash,
      glossaryHash: STARCRAFT_TMG_ZH_CN_CORE_GLOSSARY_V1.glossaryHash,
      candidateHash,
      providerCalls,
      providerEvidence: "injected_fake_adapter_only_not_live_provider",
      sourceLineageComplete: false,
      officialDataStatus: "candidate_unreviewed",
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
