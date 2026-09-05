#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { loadFrozenSkillEvidence } from "../packages/skill-production/evidence.mjs";
import { createMechanicsVerifier } from "../packages/skill-production/mechanics.mjs";
import { verifyProductionReadiness } from "../packages/skill-production/recipe.mjs";
import { createSemanticDrills } from "../packages/skill-evaluation/semantic-drills.mjs";
import { evaluateFrozenChapter } from "../packages/skill-evaluation/evaluate-chapter.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
import { createAccountedModel } from "../packages/skill-production/model.mjs";
import { seal, verifySeal, sha256, fail, hash } from "../packages/skill-production/common.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV2 } from "../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from "../content/skill-generation/offline-provider-profile-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [mode, parentId, ...extra] = process.argv.slice(2);
if (mode !== "--live-evaluation" || !/^pilot-[a-f0-9]{20}$/.test(parentId || "") || extra.length) fail("EVALUATION_ARGUMENTS_INVALID");
const BASE = path.join(ROOT, "build/ticket-17-production-redesign-v1");
const catalogue = await loadFrozenSkillEvidence(ROOT), productionReadiness = await verifyProductionReadiness(ROOT, catalogue);
const readiness = verifySeal(JSON.parse(await readFile(path.join(BASE, "semantic-drills-readiness.json"), "utf8")));
if (!readiness.passed || readiness.catalogueHash !== catalogue.hash) fail("EVALUATION_READINESS_MISSING");
for (const row of readiness.codeHashes) if (sha256(await readFile(path.join(ROOT, row.file))) !== row.hash) fail("EVALUATION_CODE_DRIFT");
const parentRecipe = verifySeal(JSON.parse(await readFile(path.join(BASE, parentId, "recipe.json"), "utf8")));
const parent = verifySeal(JSON.parse(await readFile(path.join(BASE, parentId, "report.json"), "utf8")));
if (parent.recipeHash !== parentRecipe.hash || parentId !== "pilot-" + parentRecipe.hash.slice(0, 20)
  || parentRecipe.catalogueHash !== catalogue.hash || parent.completedChapters !== 20 || parent.failure
  || parent.chapters.length !== 20 || new Set(parent.chapters.map((c) => c.arm + "." + c.chapterId)).size !== 20) fail("EVALUATION_PARENT_INCOMPLETE");
const verifier = await createMechanicsVerifier(catalogue), drills = createSemanticDrills(verifier);
const limits = { maxCalls: 80, maxCostMicros: 5_000_000, maxTokens: 1_000_000 };
const recipe = seal({ parentId, parentReportHash: parent.hash, catalogueHash: catalogue.hash,
  productionReadinessHash: productionReadiness.hash, readinessHash: readiness.hash, manifestHash: drills.manifest.hash,
  candidateHashes: parent.chapters.map((c) => verifySeal(c).hash), limits,
  kind: "post_hoc_question_clarification_not_new_generation", originalMetricOverwritten: false, trainingTruth: false });
const runId = "evaluation-" + recipe.hash.slice(0, 20), OUT = path.join(BASE, runId);
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "recipe.json"), JSON.stringify(recipe, null, 2));
const store = openProductionStore(path.join(BASE, "production.sqlite"), { runId, recipeHash: recipe.hash, ...limits });
const priorCost = parentRecipe.knownPriorEstimatedCostMicros + parentRecipe.priorUnknownCallReserveMicros;
if (store.globalSummary().attempts.some((a) => a.code === "PROVIDER_PAYMENT_REQUIRED")) fail("API_BALANCE_EXHAUSTED_STOP_ALL_WORK");
if (priorCost + store.globalSummary().reservedOrSettledMicros + limits.maxCostMicros >= 100_000_000) fail("CNY_100_NOTIFICATION_REQUIRED");
const start = store.acquire("evaluation-start", { recipeHash: recipe.hash });
const began = start.cached ? start.artifact.began : store.finish(start, { began: Date.now() }).began;
let worker = null, attached = null, failure = null;
const results = [];
try {
  const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: "/chat/completions" }],
    allowedProviders: ["deepseek-openai-compatible-direct"] });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try { attached = await worker.attachCredential({ attachmentId: "semantic-eval-" + randomUUID(), providerProfile: profile, credentialBytes: ingress.credentialBytes }); }
  finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail("PROVIDER_ATTACHMENT_FAILED");
  const model = createAccountedModel({ store, complete: (providerRequest, { signal } = {}) => {
    if (Date.now() - began > 60 * 60 * 1000) fail("EVALUATION_WALL_TIME_EXHAUSTED");
    return worker.complete({ workerRef: attached.workerRef, providerRequest, signal });
  } });
  for (const artifact of parent.chapters) {
    const result = await evaluateFrozenChapter({ artifact, drills, store, model });
    results.push(result);
    await writeFile(path.join(OUT, result.arm + "." + result.chapterId + ".json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ event: "evaluation", arm: result.arm, chapter: result.chapterId, completed: results.length,
      correct: result.correct, cases: result.cases, tokens: store.summary().knownTokens,
      cumulativeCnyEstimatedOrReserved: (priorCost + store.globalSummary().reservedOrSettledMicros) / 1e6 }));
  }
} catch (error) { failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || "") ? error.code : "EVALUATION_FAILURE", diagnosticHash: hash(String(error.message)) }; }
finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: "evaluation_finished" }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary(), global = store.globalSummary();
  const report = seal({ recipeHash: recipe.hash, parentReportHash: parent.hash, results, failure, ledger,
    originalArmSummary: parent.armSummary,
    supplementaryArmSummary: ["dsh", "direct"].map((arm) => ({ arm, chapters: results.filter((r) => r.arm === arm).length,
      correct: results.filter((r) => r.arm === arm).reduce((n, r) => n + r.correct, 0),
      cases: results.filter((r) => r.arm === arm).reduce((n, r) => n + r.cases, 0) })),
    cumulativeKnownTokensLowerBound: parentRecipe.knownPriorTokensLowerBound + global.knownTokens,
    cumulativeEstimatedOrReservedCny: (priorCost + global.reservedOrSettledMicros) / 1e6,
    originalMetricOverwritten: false, postHoc: true, dshBenefitProven: false, skillRegenerated: false,
    roomReplayPerformed: false, trainingTruth: false });
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ event: "report", path: path.relative(ROOT, path.join(OUT, "report.json")),
    failure, results: results.length, summary: report.supplementaryArmSummary, tokens: ledger.knownTokens, cny: ledger.reservedOrSettledMicros / 1e6, hash: report.hash }));
  store.close();
}
if (failure) process.exitCode = 1;
