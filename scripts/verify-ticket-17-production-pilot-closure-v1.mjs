#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFrozenSkillEvidence, createEvidenceReader, CHAPTERS } from "../packages/skill-production/evidence.mjs";
import { createMechanicsVerifier } from "../packages/skill-production/mechanics.mjs";
import { createSemanticDrills } from "../packages/skill-evaluation/semantic-drills.mjs";
import { combineSemanticReviews, inspectChapterDraft } from "../packages/skill-production/validation.mjs";
import { seal, verifySeal, hash, sha256 } from "../packages/skill-production/common.mjs";
import { resolveSpan } from "../packages/skill-production/spans.mjs";
import { candidateDisposition } from "../packages/skill-evaluation/candidate-disposition.mjs";
import { POST_PILOT_FINDINGS } from "../content/skill-generation/ticket-17-slice-170-post-pilot-findings-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = path.join(ROOT, "build/ticket-17-production-redesign-v1");
const [pilotId, evaluationId, ...extra] = process.argv.slice(2);
assert(/^pilot-[a-f0-9]{20}$/.test(pilotId || "") && /^evaluation-[a-f0-9]{20}$/.test(evaluationId || "") && !extra.length);
const read = async (id, name) => verifySeal(JSON.parse(await readFile(path.join(BASE, id, name + ".json"), "utf8")));
const recipe = await read(pilotId, "recipe"), pilot = await read(pilotId, "report");
const evalRecipe = await read(evaluationId, "recipe"), evaluation = await read(evaluationId, "report");
assert.equal(pilotId, "pilot-" + recipe.hash.slice(0, 20));
assert.equal(evaluationId, "evaluation-" + evalRecipe.hash.slice(0, 20));
assert.equal(pilot.recipeHash, recipe.hash); assert.equal(evaluation.recipeHash, evalRecipe.hash);
assert.equal(evalRecipe.parentReportHash, pilot.hash); assert.equal(evaluation.parentReportHash, pilot.hash);
assert.equal(pilot.failure, null); assert.equal(evaluation.failure, null);
assert.equal(pilot.completedChapters, 20); assert.equal(pilot.chapters.length, 20); assert.equal(evaluation.results.length, 20);
assert.equal(pilot.calibrations.length, 4); assert(pilot.calibrations.every((c) => c.passed));
for (const calibration of pilot.calibrations) {
  verifySeal(calibration.judged);
  assert.equal(calibration.judged.verdicts.find((v) => v.claimId === "positive").verdict, "supported");
  assert.equal(calibration.judged.verdicts.find((v) => v.claimId === "contradiction").verdict, "unsupported");
}
const catalogue = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(catalogue);
assert.equal(catalogue.hash, recipe.catalogueHash); assert.equal(hash(recipe.sourceBinding), hash(catalogue.sourceBinding));
const verifier = await createMechanicsVerifier(catalogue), drills = createSemanticDrills(verifier);
const knownFindings = POST_PILOT_FINDINGS.map((finding) => {
  const source = resolveSpan(reader, finding.source);
  assert.equal(source.evidenceHash, finding.expectedSourceHash);
  assert(source.quote.includes('Requires a gap at least 3" wide.'));
  const execution = verifier.run(finding.counterexampleId, { allowHeldout: true });
  assert.equal(execution.observed.legal, true);
  return seal({ ...finding, evidenceHash: source.evidenceHash, sourceQuote: source.quote,
    counterexampleReceiptHash: execution.hash, authority: "quarantine_only" });
});
assert(knownFindings.every((finding) => pilot.chapters.some((c) => c.hash === finding.candidateHash)));
assert.equal(evalRecipe.manifestHash, drills.manifest.hash);
const db = new DatabaseSync(path.join(BASE, "production.sqlite"), { readOnly: true });
const artifact = (run, id) => verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(run, id).artifact)).value;
const seen = new Set(), chapters = [];
for (const candidate of pilot.chapters) {
  verifySeal(candidate); verifySeal(candidate.scope);
  const key = candidate.arm + "." + candidate.chapterId;
  assert(["dsh", "direct"].includes(candidate.arm)); assert(CHAPTERS.some((c) => c.id === candidate.chapterId));
  assert(!seen.has(key)); seen.add(key);
  const last = candidate.semanticRounds.at(-1);
  const finalInventory = inspectChapterDraft(candidate.draft, { reader, chapterId: candidate.chapterId,
    readRefs: last.inventory.claims.flatMap((c) => c.evidence.map((e) => e.ref)), requiredRefs: candidate.scope.requiredRefs });
  assert.equal(finalInventory.hash, last.inventory.hash);
  for (const round of candidate.semanticRounds) {
    assert.equal(hash(round.inventory.currentBinding), hash(catalogue.sourceBinding));
    const combined = combineSemanticReviews(round.inventory, round.supportive, round.adversarial, round.arbitration);
    assert.equal(combined.hash, round.combined.hash);
  }
  assert.equal(candidate.semanticPassed, last.combined.passed);
  const raw = artifact(pilotId, key + ".heldout-student"); verifySeal(raw); assert.equal(raw.toolTrace.length, 0);
  const rerun = raw.output.predictions.map((p) => verifier.verifyPrediction(p.id, p.values, { allowHeldout: true }));
  assert.equal(hash(rerun), hash(candidate.predictions));
  const followup = evaluation.results.find((r) => r.arm === candidate.arm && r.chapterId === candidate.chapterId);
  verifySeal(followup); assert.equal(followup.candidateHash, candidate.hash);
  assert.equal(followup.cases, verifier.list(candidate.chapterId, "heldout").length);
  assert.equal(followup.predictions.length, followup.cases);
  assert.equal(new Set(followup.predictions.map((p) => p.id)).size, followup.cases);
  const clarified = followup.predictions.map((p) => drills.judge(candidate.chapterId, p.prediction));
  assert.equal(hash(clarified), hash(followup.predictions));
  assert.equal(followup.correct, clarified.filter((p) => p.passed).length);
  assert.equal(candidate.published, false); assert.equal(candidate.trainingTruth, false);
  chapters.push({ arm: candidate.arm, chapterId: candidate.chapterId, candidateHash: candidate.hash,
    claims: last.inventory.claims.length, semanticPassed: candidate.semanticPassed,
    semanticRevisions: candidate.revisions.length, semanticFindings: last.combined.findings,
    disposition: candidateDisposition({ candidate, supplemental: followup, findings: knownFindings.filter((f) => f.candidateHash === candidate.hash) }),
    rawCorrect: rerun.filter((p) => p.passed).length, clarifiedCorrect: followup.correct, cases: followup.cases,
    requiredSourceRefs: candidate.scope.requiredRefs.length, remainingSourceRefs: candidate.scope.remainingRefs.length });
}
assert.equal(seen.size, 20);
const cutoff = db.prepare("SELECT rowid AS ordinal FROM runs WHERE id=?").get(evaluationId).ordinal;
const attempts = db.prepare("SELECT run,id,state,usage,reserve,settled,code FROM attempts WHERE run IN (SELECT id FROM runs WHERE rowid<=?)").all(cutoff);
assert(!attempts.some((r) => r.state === "intent"));
const knownTokens = attempts.reduce((n, r) => n + (r.usage ? verifySeal(JSON.parse(r.usage)).value.totalUnits : 0), 0);
const costMicros = attempts.reduce((n, r) => n + (r.settled ?? r.reserve), 0);
const knownUsageCostMicros = attempts.reduce((n, r) => n + (r.usage && r.settled !== null ? r.settled : 0), 0);
const parentUsage = pilot.continuation?.accounting || { calls: 0, costMicros: 0, tokens: 0 };
assert(pilot.ledger.calls + parentUsage.calls <= recipe.limits.maxCalls);
assert(pilot.ledger.reservedOrSettledMicros + parentUsage.costMicros <= recipe.limits.maxCostMicros);
assert(pilot.ledger.reservedOrSettledTokens + parentUsage.tokens <= recipe.limits.maxTokens);
const steps = db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'").all(pilotId);
const stageBodies = steps.filter((r) => !r.id.startsWith("inherited.")).map((r) => ({ id: r.id, value: verifySeal(JSON.parse(r.artifact)).value }));
const armStats = ["dsh", "direct"].map((arm) => {
  const rows = chapters.filter((c) => c.arm === arm);
  const stages = stageBodies.filter((s) => s.id.startsWith(arm + ".") && s.value.loop);
  return { arm, chapters: rows.length, claims: rows.reduce((n, c) => n + c.claims, 0),
    semanticPassed: rows.filter((c) => c.semanticPassed).length,
    rawCorrect: rows.reduce((n, c) => n + c.rawCorrect, 0), clarifiedCorrect: rows.reduce((n, c) => n + c.clarifiedCorrect, 0),
    cases: rows.reduce((n, c) => n + c.cases, 0), semanticRevisions: rows.reduce((n, c) => n + c.semanticRevisions, 0),
    modelStages: stages.length, toolCalls: stages.reduce((n, s) => n + s.value.toolTrace.length, 0),
    inheritedStages: steps.filter((s) => s.id.startsWith("inherited." + arm + ".")).length,
    actualDshSessions: stages.filter((s) => s.value.loop.sandboxReceipt?.execution.cleanupVerified).length };
});
assert(armStats.find((r) => r.arm === "dsh").actualDshSessions > 0);
for (const row of armStats) {
  const original = pilot.armSummary.find((r) => r.arm === row.arm);
  const supplement = evaluation.supplementaryArmSummary.find((r) => r.arm === row.arm);
  assert.equal(row.cases, 36); assert.equal(original.heldoutPredictions, row.cases);
  assert.equal(original.heldoutCorrect, row.rawCorrect); assert.equal(supplement.correct, row.clarifiedCorrect);
}
const result = seal({ passed: true, ticket: 17, slice: 170, workPoints: ["B", "C", "D", "E"],
  verificationCodeHashes: await Promise.all([
    "scripts/verify-ticket-17-production-pilot-closure-v1.mjs", "packages/skill-evaluation/candidate-disposition.mjs",
    "content/skill-generation/ticket-17-slice-170-post-pilot-findings-v1.mjs",
    "scripts/verify-ticket-17-candidate-disposition-v1.mjs",
  ].map(async (file) => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) }))),
  pilotId, evaluationId, recipeHash: recipe.hash, pilotHash: pilot.hash, evaluationHash: evaluation.hash,
  catalogueHash: catalogue.hash, chapters, armStats, knownReviewerMisses: knownFindings,
  newKnownTokens: knownTokens, newKnownUsageEstimatedCny: knownUsageCostMicros / 1e6, newEstimatedOrReservedCny: costMicros / 1e6,
  totalKnownTokensLowerBound: recipe.knownPriorTokensLowerBound + knownTokens,
  totalKnownUsageEstimateCny: (recipe.knownPriorEstimatedCostMicros + knownUsageCostMicros) / 1e6,
  totalEstimateWithHistoricalReservesCny: (recipe.knownPriorEstimatedCostMicros + recipe.priorUnknownCallReserveMicros + costMicros) / 1e6,
  historicalUnknownReserveCny: recipe.priorUnknownCallReserveMicros / 1e6,
  newUnknownCalls: attempts.filter((r) => !r.usage && r.state !== "not_sent").length,
  cnyPerUsdFrozen: recipe.cnyPerUsdFrozen, invoice: false,
  validation: "chapter_source_bindings_reviews_and_both_kernel_metrics_reexecuted",
  scope: "bounded_candidate_pipeline_acceptance_not_all_rules_or_play_effectiveness",
  fullRuleCoverage: false, dshBenefitProven: false, roomReplayPerformed: false,
  formalSkillsPublished: 0, trainingTruth: false, paidCallsByThisVerifier: 0 });
db.close();
await writeFile(path.join(BASE, "closure-" + pilotId + ".json"), JSON.stringify(result, null, 2));
// Small, credential-free handoff in Git. Detailed runtime/usage bodies remain
// in the durable local journal; generated prose is explicitly not published.
const SNAPSHOT = path.join(ROOT, "docs/evidence/ticket-17-slice-170");
await mkdir(SNAPSHOT, { recursive: true });
for (const [name, value] of [["closure", result], ["pilot-recipe", recipe], ["evaluation-recipe", evalRecipe]]) {
  await writeFile(path.join(SNAPSHOT, name + ".json"), JSON.stringify(value, null, 2));
}
for (const arm of ["dsh", "direct"]) {
  const text = "# How-to-Play 候选 — " + arm + "\n\n" +
    "隔离候选；留出题有错误，direct 移动章 cautions.3 另有已确认的边界解释错误。原文为实验留档，未改写答案。\n\n" +
    "未发布；仅覆盖选定原文。策略未获对局验证，不能作为规则权威或训练真值。\n\n" +
    "生产 recipe: " + recipe.hash + "\n\n" + pilot.chapters.filter((c) => c.arm === arm).map((c) => c.markdown).join("\n\n");
  await writeFile(path.join(SNAPSHOT, arm + ".how-to-play.md"), text);
}
console.log(JSON.stringify(result, null, 2));
