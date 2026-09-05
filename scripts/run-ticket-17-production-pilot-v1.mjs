#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadFrozenSkillEvidence, createEvidenceReader, CHAPTERS } from "../packages/skill-production/evidence.mjs";
import { createMechanicsVerifier } from "../packages/skill-production/mechanics.mjs";
import { prepareDshLoop } from "../packages/skill-production/loops.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
import { createAccountedModel } from "../packages/skill-production/model.mjs";
import { createProductionRuntime } from "../packages/skill-production/runtime.mjs";
import { validateSemanticReview } from "../packages/skill-production/validation.mjs";
import { modelEvidence } from "../packages/skill-production/spans.mjs";
import { inspectContinuation, withCheckpointContinuation } from "../packages/skill-production/continuation.mjs";
import { verifyProductionReadiness, createPilotRecipe, PILOT_LIMITS } from "../packages/skill-production/recipe.mjs";
import { hash, seal, safe, fail } from "../packages/skill-production/common.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderEgressWorkerPortV2 } from "../packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs";
import { readStarcraftTmgDeepSeekCredentialFromKeychainV1 } from "../packages/secure-provider-runtime/keychain-credential-ingress-v1.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from "../content/skill-generation/offline-provider-profile-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogue = await loadFrozenSkillEvidence(ROOT);
const readiness = await verifyProductionReadiness(ROOT, catalogue);
const baseRecipe = createPilotRecipe(catalogue, readiness);
const args = process.argv.slice(2);
if (args.length && !(args[0] === "--live-pilot" && (args.length === 1 || args.length === 3 && args[1] === "--continue" && /^pilot-[a-f0-9]{20}$/.test(args[2])))) fail("PILOT_ARGUMENTS_INVALID");
const filename = path.join(ROOT, "build/ticket-17-production-redesign-v1/production.sqlite");
const continuation = args[2] ? inspectContinuation(filename, args[2],
  JSON.parse(await readFile(path.join(ROOT, "build/ticket-17-production-redesign-v1", args[2], "recipe.json"), "utf8")), baseRecipe) : null;
const { hash: baseHash, ...baseBody } = baseRecipe;
const recipe = continuation ? seal({ ...baseBody, continuation: continuation.manifest }) : baseRecipe;
if (!args.length) {
  console.log(JSON.stringify({ readinessPassed: true, recipe, paidCalls: 0 }, null, 2));
  process.exit(0);
}
// New reviewed entrypoint. Legacy production-review-hold remains unconditional.
const runId = "pilot-" + recipe.hash.slice(0, 20);
const OUT = path.join(ROOT, "build/ticket-17-production-redesign-v1", runId);
await mkdir(OUT, { recursive: true });
const parentUsage = continuation?.manifest.accounting || { calls: 0, costMicros: 0, tokens: 0 };
const remainingLimits = { ...PILOT_LIMITS, maxCalls: PILOT_LIMITS.maxCalls - parentUsage.calls,
  maxCostMicros: PILOT_LIMITS.maxCostMicros - parentUsage.costMicros, maxTokens: PILOT_LIMITS.maxTokens - parentUsage.tokens };
const localStore = openProductionStore(filename, { runId, recipeHash: recipe.hash, ...remainingLimits });
const store = continuation ? withCheckpointContinuation(localStore, continuation) : localStore;
const existingLedger = store.globalSummary();
if (existingLedger.attempts.some((a) => a.code === "PROVIDER_PAYMENT_REQUIRED")) fail("API_BALANCE_EXHAUSTED_STOP_ALL_WORK");
const before = recipe.knownPriorEstimatedCostMicros + recipe.priorUnknownCallReserveMicros;
if (before + existingLedger.reservedOrSettledMicros + PILOT_LIMITS.maxCostMicros >= 100_000_000) fail("CNY_100_NOTIFICATION_REQUIRED");
await writeFile(path.join(OUT, "recipe.json"), JSON.stringify(recipe, null, 2));
let worker = null, attached = null, failure = null;
const chapters = [], calibrations = [];
const started = store.acquire("pilot-start", { recipeHash: recipe.hash });
const began = started.cached ? started.artifact.began : store.finish(started, { began: continuation?.manifest.parentStart || Date.now() }).began;
try {
  if (Date.now() - began > PILOT_LIMITS.maxWallMs) fail("PILOT_WALL_TIME_EXHAUSTED");
  const dsh = await prepareDshLoop(ROOT);
  const registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile: profile, completionPath: "/chat/completions" }],
    allowedProviders: ["deepseek-openai-compatible-direct"],
  });
  worker = createStarcraftTmgProviderEgressWorkerPortV2({ providerProfileRegistry: registry, maxWorkers: 1, maxOutputBytes: 256 * 1024 });
  const ingress = await readStarcraftTmgDeepSeekCredentialFromKeychainV1();
  try {
    attached = await worker.attachCredential({ attachmentId: "production-" + randomUUID(),
      providerProfile: profile, credentialBytes: ingress.credentialBytes });
  } finally { ingress.credentialBytes.fill(0); }
  if (!attached.ok) fail("PROVIDER_ATTACHMENT_FAILED");
  const model = createAccountedModel({ store,
    complete: (providerRequest) => {
      if (Date.now() - began > PILOT_LIMITS.maxWallMs) fail("PILOT_WALL_TIME_EXHAUSTED");
      return worker.complete({ workerRef: attached.workerRef, providerRequest });
    },
    onUsage: (totals) => console.log(JSON.stringify({ event: "usage", calls: totals.calls, knownTokens: totals.knownTokens,
      currentCnyEstimatedOrReserved: totals.reservedOrSettledMicros / 1e6,
      cumulativeCnyEstimatedOrReserved: (before + store.globalSummary().reservedOrSettledMicros) / 1e6 })),
  });
  const reader = createEvidenceReader(catalogue), verifier = await createMechanicsVerifier(catalogue);
  const runtime = createProductionRuntime({ catalogue, reader, verifier, store, model, dsh,
    onProgress: (row) => console.log(JSON.stringify({ event: "progress", ticket: 17, slice: 170, workPoint: "E", ...row })) });
  const source = reader.read({ refs: ["faq-v1:06"] }).rows[0];
  const claims = [
    { claimId: "positive", field: "rules", text: "Gap clearance applies to gaps between models as well as terrain.",
      evidence: [{ ref: source.id, spanId: "p1", quote: source.text, evidenceHash: source.hash }] },
    { claimId: "contradiction", field: "rules", text: "Gap clearance applies only to terrain and never to gaps between models.",
      evidence: [{ ref: source.id, spanId: "p1", quote: source.text, evidenceHash: source.hash }] },
  ];
  const inventory = seal({ chapterId: "movement", draftHash: hash(claims), claims, findings: [],
    structuralAndProvenancePassed: true, factsVerified: false, trainingTruth: false });
  for (const arm of recipe.arms) for (const role of ["supportive_reviewer", "adversarial_reviewer"]) {
    const judged = await runtime.review(arm, CHAPTERS.find((c) => c.id === "movement"), "calibration-" + role,
      "Role " + role + ". Independently judge every claim against the complete source, not the existence of a citation. " +
      "Finish with this JSON content shape: " + JSON.stringify({ verdicts: [{ claimId: "claim ID", verdict: "unknown",
        reason: "specific explanation", evidence: [{ ref: source.id, spanId: "p1" }] }] }) +
      ". Verdict must be exactly supported, unsupported or unknown. Include each claim exactly once. " +
      "Cite existing passage IDs; do not output quotation text. Do not assume either claim is true.\n" +
      JSON.stringify({ claims, source: modelEvidence(reader.read({ refs: [source.id] })) }), inventory, role);
    const passed = judged.verdicts.find((v) => v.claimId === "positive").verdict === "supported"
      && judged.verdicts.find((v) => v.claimId === "contradiction").verdict === "unsupported";
    calibrations.push({ arm, role, passed, judged });
    if (!passed) fail("LIVE_SEMANTIC_CALIBRATION_FAILED");
  }
  for (const [index, chapter] of CHAPTERS.entries()) {
    // Counterbalance order. Arms retain separate artifacts; no cross-arm feedback.
    const arms = index % 2 ? [...recipe.arms].reverse() : recipe.arms;
    for (const arm of arms) {
      const result = await runtime.chapter(arm, chapter);
      chapters.push(result);
      await writeFile(path.join(OUT, arm + "." + chapter.id + ".json"), JSON.stringify(result, null, 2));
      await writeFile(path.join(OUT, arm + ".how-to-play.md"), "# How-to-Play — 有界候选，未发布\n\n" +
        chapters.filter((r) => r.arm === arm).map((r) => r.markdown).join("\n\n"));
    }
  }
} catch (error) {
  failure = { code: /^[A-Z0-9_]{3,100}$/.test(error.code || "") ? error.code : "PILOT_UNCLASSIFIED_FAILURE",
    diagnosticHash: hash(String(error.message)), diagnostic: error.diagnostic || null };
  console.log(JSON.stringify({ event: "blocked", ...failure }));
} finally {
  if (attached?.workerRef) await worker.detachCredential({ workerRef: attached.workerRef, reason: "production_pilot_finished" }).catch(() => {});
  await worker?.close().catch(() => {});
  const ledger = store.summary();
  const report = seal(safe({ recipeHash: recipe.hash, readinessHash: readiness.hash,
    completedChapters: chapters.length, plannedChaptersAcrossArms: 20, calibrations, chapters, ledger, failure,
    continuation: continuation?.manifest || null,
    armSummary: recipe.arms.map((arm) => ({ arm, chapters: chapters.filter((c) => c.arm === arm).length,
      semanticallyPassed: chapters.filter((c) => c.arm === arm && c.semanticPassed).length,
      heldoutPredictions: chapters.filter((c) => c.arm === arm).flatMap((c) => c.predictions).length,
      heldoutCorrect: chapters.filter((c) => c.arm === arm).flatMap((c) => c.predictions).filter((p) => p.passed).length })),
    cumulativeKnownTokensLowerBound: recipe.knownPriorTokensLowerBound + store.globalSummary().knownTokens,
    cumulativeEstimatedOrReservedCny: (before + store.globalSummary().reservedOrSettledMicros) / 1e6,
    ctx2skillLoopUsed: true, harnessLoopUsed: true, targetGames: ["starcraft-tmg"],
    roles: ["Tutor", "Student", "supportive_reviewer", "adversarial_reviewer", "arbitrator", "Editor", "heldout Student"],
    crossTimeReplayResult: readiness.crossTimeReplayResult, roomReplayPerformed: false,
    empiricalStrategyEffectivenessProven: false, dshBenefitProven: false,
    published: false, promotions: [], trainingTruth: false, elapsedMs: Date.now() - began }));
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ event: "report", path: path.relative(ROOT, path.join(OUT, "report.json")),
    completedChapters: report.completedChapters, failure, ledger: { calls: ledger.calls, knownTokens: ledger.knownTokens,
      currentCny: ledger.reservedOrSettledMicros / 1e6 }, hash: report.hash }));
  store.close();
}
if (failure) process.exitCode = 1;
