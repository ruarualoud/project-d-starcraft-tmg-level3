#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";
import { loadFrozenSkillEvidence, createEvidenceReader, CHAPTERS } from "../packages/skill-production/evidence.mjs";
import { createMechanicsVerifier } from "../packages/skill-production/mechanics.mjs";
import { inspectChapterDraft, validateSemanticReview, combineSemanticReviews, applyTargetedPatch } from "../packages/skill-production/validation.mjs";
import { openProductionStore } from "../packages/skill-production/store.mjs";
import { chapterScope, createProductionRuntime } from "../packages/skill-production/runtime.mjs";
import { createAccountedModel } from "../packages/skill-production/model.mjs";
import { createToolPort, runDirectLoop, prepareDshLoop } from "../packages/skill-production/loops.mjs";
import { hash, seal, verifySeal, sha256 } from "../packages/skill-production/common.mjs";
import { createStarcraftTmgProviderEgressTransportV1 } from "../packages/secure-provider-runtime/provider-egress-transport-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from "../content/skill-generation/offline-provider-profile-v1.mjs";
import { normalizeSingleJsonFenceV1, normalizeProviderJsonDocumentV1 } from "../packages/secure-provider-runtime/provider-response-outcome-v1.mjs";
import { assertStarcraftTmgProviderWorkerSuccessV1 } from "../packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs";
import { sourceSpans, resolveSpan } from "../packages/skill-production/spans.mjs";
import { inspectContinuation, withCheckpointContinuation } from "../packages/skill-production/continuation.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "build/ticket-17-production-redesign-v1");
await mkdir(OUT, { recursive: true });
const temporary = await mkdtemp(path.join(OUT, "tests-"));
const checks = [];
const check = async (id, fn) => {
  try { await fn(); checks.push({ id, passed: true }); console.log("PASS " + id); }
  catch (error) { checks.push({ id, passed: false, code: error.code || error.message, detail: error.message, diagnostic: error.diagnostic || null }); console.log("FAIL " + id + " " + error.message + " " + (error.diagnostic || "")); }
};
const catalogue = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(catalogue);
const verifier = await createMechanicsVerifier(catalogue);
await check("B_frozen_text_current_faq_and_1163_atom_inventory", () => {
  assert.equal(catalogue.counts.atoms, 1163);
  assert.equal(catalogue.rows.filter((r) => r.sourceClass === "official_faq_current_reconciled").length, 68);
  assert.equal(catalogue.sourceRefreshPerformed, false);
  assert(catalogue.rows.some((r) => r.quarantined));
  CHAPTERS.forEach((c) => assert(chapterScope(catalogue, c).requiredRefs.length >= 3));
  const row = reader.read({ refs: ["faq-v1:06"] }).rows[0];
  assert(row.text.includes("moving model"));
  assert(reader.verifyQuote({ ref: row.id, quote: row.text.slice(0, 60), evidenceHash: row.hash }).passed);
  assert(!reader.verifyQuote({ ref: row.id, quote: "All units always move twenty inches.", evidenceHash: row.hash }).passed);
  assert.throws(() => reader.read({ refs: [catalogue.rows.find((r) => r.quarantined).id] }));
  assert.throws(() => createEvidenceReader({ ...catalogue, counts: {} }));
});
await check("B_72_real_kernel_drills_and_no_fake_fixture_or_false_prediction", () => {
  const cases = CHAPTERS.flatMap((c) => ["development", "heldout"].flatMap((split) => verifier.list(c.id, split).map((t) => ({ ...t, split }))));
  assert.equal(cases.length, 72);
  assert.equal(new Set(cases.map((t) => hash({ entryId: t.entryId, input: t.input }))).size, 72);
  cases.forEach((t) => assert(verifier.run(t.id, { allowHeldout: true }).passed, t.id));
  assert.throws(() => verifier.run("invented-fixture"));
  assert.throws(() => verifier.run("heldout.movement.1"));
  assert(!verifier.verifyPrediction("development.movement.1", { legal: false }).passed);
  assert(verifier.verifyPrediction("development.movement.1", { legal: true }).passed);
});
let crossTime = null;
await check("B_serialized_mechanics_journal_replays_in_new_verifier_and_rejects_drift", async () => {
  const journal = JSON.parse(JSON.stringify(verifier.trace().slice(0, 72)));
  const fresh = await createMechanicsVerifier(catalogue);
  crossTime = fresh.replayJournal(journal);
  assert(crossTime.passed); assert.equal(crossTime.receiptCount, 72);
  assert.throws(() => fresh.replayJournal([{ ...journal[0], observed: {} }]));
  const { hash: ignored, ...body } = journal[0];
  assert.throws(() => fresh.replayJournal([seal({ ...body, currentRulesReceiptHash: hash("missing-old-rules") })]), /DEPENDENCY/);
});
const source = reader.read({ refs: ["faq-v1:06"] }).rows[0];
const entry = { text: "Size three models require the wider model/terrain gap, subject to the stated geometry.",
  evidence: [{ ref: source.id, spanId: "p1" }] };
const draft = { rules: Array.from({ length: 4 }, () => structuredClone(entry)),
  strategy: Array.from({ length: 2 }, () => structuredClone(entry)),
  cautions: Array.from({ length: 2 }, () => structuredClone(entry)) };
let inventory;
await check("B_inventory_covers_every_rendered_claim_and_provenance_failure", () => {
  inventory = inspectChapterDraft(draft, { reader, chapterId: "movement", readRefs: [source.id], requiredRefs: [source.id] });
  assert.equal(inventory.claims.length, 8); assert(inventory.structuralAndProvenancePassed);
  assert.equal(inventory.factsVerified, false);
  assert(!inspectChapterDraft(draft, { reader, chapterId: "movement", readRefs: [] }).structuralAndProvenancePassed);
  assert(!inspectChapterDraft(draft, { reader, chapterId: "movement", readRefs: [source.id], requiredRefs: ["faq-v1:11"] }).structuralAndProvenancePassed);
  assert.throws(() => inspectChapterDraft({ ...draft, hiddenRule: "invented" }, { reader }));
});
const review = (role, id, verdict = "supported") => validateSemanticReview({ verdicts: inventory.claims.map((c) => ({
  claimId: c.claimId, verdict, reason: "Injected judge test; live semantic calibration is separate.", evidence: entry.evidence,
})) }, inventory, { reader, reviewId: id, role });
await check("B_review_denominator_disagreement_arbitration_and_tamper_fail_closed", () => {
  const a = review("supportive_reviewer", "review-A"), b = review("adversarial_reviewer", "review-B");
  assert(combineSemanticReviews(inventory, a, b).passed);
  const unsafe = review("adversarial_reviewer", "review-C", "unsupported");
  assert(!combineSemanticReviews(inventory, a, unsafe).passed);
  assert(!combineSemanticReviews(inventory, a, unsafe, review("arbitrator", "review-D", "unknown")).passed);
  assert.throws(() => combineSemanticReviews(inventory, a, { ...b, candidateHash: "false" }));
  assert.throws(() => validateSemanticReview({ verdicts: [] }, inventory, { reader, reviewId: "short", role: "supportive_reviewer" }));
});
await check("B_targeted_patch_parent_and_allowed_path_are_enforced", () => {
  const findings = [{ claimId: "rules.0", code: "UNSAFE" }];
  const patch = { parentHash: hash(draft), replacements: [{ claimId: "rules.0", value: entry }] };
  assert.deepEqual(applyTargetedPatch(draft, patch, findings), draft);
  assert.throws(() => applyTargetedPatch(draft, { ...patch, parentHash: "old" }, findings));
  assert.throws(() => applyTargetedPatch(draft, { ...patch, replacements: [{ claimId: "rules.1", value: entry }] }, findings));
});
const storeArgs = { runId: "test-run", recipeHash: hash("recipe"), maxCostMicros: 5_000_000, maxCalls: 8 };
await check("C_durable_body_CAS_lease_resume_without_duplicate_egress", () => {
  const filename = path.join(temporary, "resume.sqlite"); let instant = 100;
  let db = openProductionStore(filename, { ...storeArgs, now: () => instant });
  const lease = db.acquire("chapter", { input: 1 }, 20);
  assert.throws(() => db.acquire("chapter", { input: 1 }, 20));
  instant = 121;
  const next = db.acquire("chapter", { input: 1 }, 20);
  assert.throws(() => db.finish(lease, { result: "stale" }));
  db.finish(next, { result: "body survives" });
  db.reserve("call", { request: 1 }, 10000);
  db.settle("call", { usage: { inputUnits: 10, outputUnits: 2, totalUnits: 12 }, costMicros: 12, response: { answer: 3 } });
  db.close(); db = openProductionStore(filename, storeArgs);
  assert.equal(db.acquire("chapter", { input: 1 }).artifact.result, "body survives");
  assert.equal(db.reserve("call", { request: 1 }, 10000).response.answer, 3);
  assert.equal(db.summary().calls, 1); assert.equal(db.summary().knownTokens, 12);
  assert.throws(() => db.acquire("chapter", { input: 2 }));
  db.close();
});
await check("C_ambiguous_intent_never_retried_and_unknown_cost_not_zero", () => {
  const filename = path.join(temporary, "ambiguous.sqlite");
  let db = openProductionStore(filename, storeArgs);
  db.reserve("ambiguous", { input: 1 }, 4000); db.close();
  db = openProductionStore(filename, storeArgs);
  assert.throws(() => db.reserve("ambiguous", { input: 1 }, 4000), /AMBIGUOUS/);
  assert.equal(db.summary().unknownCalls, 1); assert.equal(db.summary().reservedOrSettledMicros, 4000); db.close();
});
const registry = createStarcraftTmgProviderProfileRegistryV1({
  entries: [{ providerProfile: profile, completionPath: "/chat/completions" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const { egressBinding } = await registry.resolveEgressBinding({ profileRef: {
  id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash,
} });
function fakeTransport(payload) {
  return createStarcraftTmgProviderEgressTransportV1({ captureResponseOutcome: true,
    resolveAddresses: async () => [{ address: "93.184.216.34", family: 4 }],
    requestImplementation(_options, callback) {
      const request = new EventEmitter(); request.destroy = () => {}; request.setTimeout = () => {};
      request.end = () => queueMicrotask(() => {
        const response = new EventEmitter(); response.statusCode = 200;
        response.headers = { "content-type": "application/json" }; response.destroy = () => {}; response.resume = () => {};
        callback(response); queueMicrotask(() => { response.emit("data", Buffer.from(JSON.stringify(payload))); response.emit("end"); });
      });
      return request;
    },
  });
}
await check("C_bad_JSON_and_length_with_valid_JSON_preserve_actual_usage", async () => {
  for (const [content, finish] of [["{bad", "stop"], ['{"channels":{}}', "length"], ["", "stop"]]) {
    const db = openProductionStore(path.join(temporary, hash({ content, finish }) + ".sqlite"), storeArgs);
    const payload = { model: profile.model, choices: [{ message: { content }, finish_reason: finish }],
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 100 } };
    const transport = fakeTransport(payload);
    const model = createAccountedModel({ store: db,
      complete: (request) => transport.complete({ egressBinding, credentialBytes: Buffer.from("fixture-nonlive-only"), providerRequest: request }) });
    await assert.rejects(model({ stageId: "invalid-shape", call: 1, observed: { system: "", messages: [], tools: [] } }));
    assert.equal(db.summary().knownTokens, 240);
    assert.equal(db.summary().calls, 2); // One bounded schema repair, no retry storm.
    assert(db.summary().reservedOrSettledMicros > 0); db.close();
  }
});
await check("C_exact_JSON_fence_only_no_prose_extraction_or_content_rewrite", () => {
  const f = String.fromCharCode(96).repeat(3), json = JSON.stringify({ text: "quotation remains exact" });
  assert.equal(normalizeSingleJsonFenceV1(f + "json\n" + json + "\n" + f).text, json);
  assert.equal(normalizeSingleJsonFenceV1("Narrative before " + f + "json\n" + json + "\n" + f).changed, false);
  assert.equal(normalizeSingleJsonFenceV1(json).text, json);
});
await check("C_observed_missing_outer_brace_repaired_without_changing_content", async () => {
  const original = JSON.stringify({ channels: { skill: { action: "finish", content: { verdicts: [{ claimId: "x", text: "a literal } stays unchanged" }] } } } });
  const broken = original.slice(0, -1);
  const normalized = normalizeProviderJsonDocumentV1(broken);
  assert.equal(normalized.kind, "outer_object_close"); assert.equal(normalized.text, original);
  assert(normalized.text.startsWith(broken)); assert.deepEqual(JSON.parse(normalized.text), JSON.parse(original));
  for (const unsafe of ['{"a":"unfinished', '{"a":1 "b":2}', '{"a":[1,2}', '{"a":{"b":1', '{"a":}', '{"a":1}trailing']) {
    assert.equal(normalizeProviderJsonDocumentV1(unsafe).text, unsafe);
  }
  const db = openProductionStore(path.join(temporary, "outer-brace.sqlite"), storeArgs);
  const transport = fakeTransport({ model: profile.model,
    choices: [{ message: { content: broken }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 } });
  const model = createAccountedModel({ store: db, complete: async (request) => {
    const result = await transport.complete({ egressBinding, credentialBytes: Buffer.from("fixture-nonlive-only"), providerRequest: request });
    assertStarcraftTmgProviderWorkerSuccessV1(result, { egressBinding, providerRequestId: request.requestId });
    assert.equal(result.usageReceipt.responseNormalization, "outer_object_close");
    return result;
  } });
  const result = await model({ stageId: "outer-brace", call: 1, observed: { system: "", messages: [], tools: [] } });
  assert.equal(result.command.content.verdicts[0].text, "a literal } stays unchanged");
  assert.equal(db.summary().calls, 1); db.close();
});
await check("C_success_usage_is_committed_before_output_schema_rejection", async () => {
  const db = openProductionStore(path.join(temporary, "shape.sqlite"), storeArgs);
  const model = createAccountedModel({ store: db, complete: async () => ({ output: { bad: true }, usageReceipt: {
    usage: { inputUnits: 10, outputUnits: 5, totalUnits: 15 }, requestedModel: profile.model, reportedModel: profile.model,
    startedAt: "2026-09-05T00:00:00Z", receiptHash: hash("receipt") } }) });
  await assert.rejects(model({ stageId: "shape", call: 1, observed: { system: "", messages: [], tools: [] } }));
  assert.equal(db.summary().knownTokens, 30); assert.equal(db.summary().calls, 2); db.close();
});
await check("C_chapter_semantic_local_patch_rechecks_and_reuses_durable_completed_stage", async () => {
  const chapter = CHAPTERS.find((c) => c.id === "movement");
  const scope = chapterScope(catalogue, chapter);
  const evidence = reader.read({ refs: scope.requiredRefs, maxChars: 48000 }).rows;
  const extraSource = catalogue.rows.find((r) => !r.quarantined && r.chapterIds.includes(chapter.id) && !scope.requiredRefs.includes(r.id));
  const rows = Array.from({ length: 8 }, (_, i) => {
    const s = evidence[i % evidence.length];
    return { text: i === 0 ? "Injected incorrect claim." : "Engineering fixture, not a live truth judgement.",
      evidence: [{ ref: i === 0 ? "invented.source" : s.id, spanId: "p1" }] };
  });
  const generated = { rules: rows.slice(0, 4), strategy: rows.slice(4, 6), cautions: rows.slice(6) };
  // The Student reads an extra real source; a later shape-only Editor reads
  // requiredRefs only but must not erase the Student's actual read lineage.
  generated.rules[1].evidence.push({ ref: extraSource.id, spanId: "p1" });
  const overflowing = { ...generated, rules: [...generated.rules, ...rows.slice(0, 5)] };
  const ids = ["rules.0", "rules.1", "rules.2", "rules.3", "strategy.0", "strategy.1", "cautions.0", "cautions.1"];
  let calls = 0;
  const db = openProductionStore(path.join(temporary, "chapter.sqlite"), storeArgs);
  const model = async ({ stageId, call, observed }) => {
    calls += 1; let command;
    if (stageId.endsWith(".tutor")) command = call === 1
      ? { action: "read", args: { refs: scope.requiredRefs } }
      : call === 2 ? { action: "probe", args: { id: "development.movement.1" } }
      : { action: "finish", content: { lesson: ["fixture"], uncertainties: [] } };
    else if (stageId.endsWith(".student")) command = call === 1
      ? { action: "read", args: { refs: [...scope.requiredRefs, extraSource.id] } }
      : { action: "finish", content: overflowing };
    else if (stageId.endsWith(".chapter-schema-repair")) {
      assert(JSON.stringify(observed).includes("observedCounts"));
      assert(observed.messages[0].content.includes('"observedCounts":{"rules":9'));
      assert(observed.messages[0].content.includes('"field":"rules"'));
      command = call === 1 ? { action: "read", args: { refs: scope.requiredRefs } }
        : { action: "finish", content: generated };
    }
    else if (/supportive-|adversarial-/.test(stageId)) command = { action: "finish", content: {
      verdicts: ids.map((id, i) => ({ claimId: id, verdict: stageId.endsWith("-0") && i === 0 ? "unsupported" : "supported",
        reason: "Injected role fixture; correctness of live model not asserted.",
        evidence: i === 0 ? [{ ref: evidence[0].id, spanId: "p1" }] : rows[i].evidence })),
    } };
    else if (stageId.includes("editor")) command = { action: "finish", content: {
      parentHash: hash(generated), replacements: [{ claimId: "rules.0", value: { ...rows[0], text: "Corrected engineering fixture.",
        evidence: [{ ref: evidence[0].id, spanId: "p1" }] } }],
    } };
    else if (stageId.includes("heldout-student")) command = { action: "finish", content: {
      predictions: verifier.list(chapter.id, "heldout", { includeExpected: true }).map((t) => ({ id: t.id, values: t.expected })),
    } };
    else throw new Error("unexpected role " + stageId);
    return { command, usage: { inputUnits: 0, outputUnits: 0 }, receiptHash: hash(stageId + call) };
  };
  const runtime = createProductionRuntime({ catalogue, reader, verifier, store: db, model });
  const result = await runtime.chapter("direct", chapter);
  assert(result.semanticPassed); assert(result.heldoutPassed); assert.equal(result.revisions.length, 1);
  assert(!result.semanticRounds[0].inventory.findings.some((r) => r.ref === extraSource.id));
  const priorCalls = calls, recovered = await runtime.chapter("direct", chapter);
  assert.equal(recovered.hash, result.hash); assert.equal(calls, priorCalls); db.close();
});
await check("C_explicit_continuation_reuses_only_exact_inputs_and_preserves_parent_cost", () => {
  const file = path.join(temporary, "continuation.sqlite");
  const prior = seal({ source: "frozen", codeHashes: [{ file: "packages/skill-production/runtime.mjs", hash: hash("before") }] });
  const next = seal({ source: "frozen", codeHashes: [{ file: "packages/skill-production/runtime.mjs", hash: hash("after") }] });
  const id = "pilot-" + prior.hash.slice(0, 20);
  const db = openProductionStore(file, { ...storeArgs, runId: id, recipeHash: prior.hash });
  db.finish(db.acquire("pilot-start", {}), { began: 1 });
  db.finish(db.acquire("student", { prompt: "same" }), { output: "body" });
  db.finish(db.acquire("repair", { prompt: "old" }), { output: "invalid old" });
  db.reserve("paid", { request: 1 }, 1000, 10);
  db.settle("paid", { usage: { inputUnits: 8, outputUnits: 2, totalUnits: 10 }, costMicros: 20, response: { ok: true } });
  db.close();
  const continuation = inspectContinuation(file, id, prior, next);
  assert.equal(continuation.manifest.accounting.costMicros, 20);
  const local = openProductionStore(file, { ...storeArgs, runId: "child-run", recipeHash: next.hash });
  const child = withCheckpointContinuation(local, continuation);
  assert.equal(child.acquire("student", { prompt: "same" }).artifact.output, "body");
  const changed = child.acquire("repair", { prompt: "new" }); assert(!changed.cached); child.release(changed);
  assert.equal(child.summary().calls, 0); assert.equal(child.globalSummary().knownTokens, 10);
  assert(child.artifact("inherited.student")); child.close();
  assert.throws(() => inspectContinuation(file, id, prior, seal({ source: "changed", codeHashes: next.codeHashes })), /CONTRACT_DRIFT/);
  assert.throws(() => inspectContinuation(file, id, prior, seal({ source: "frozen", codeHashes: [
    ...next.codeHashes, { file: "packages/skill-production/validation.mjs", hash: hash("changed gate") },
  ] })), /DEPENDENCY_DRIFT/);
  const tampered = structuredClone(continuation); tampered.steps.find((r) => r.id === "student").artifact.output = "tampered";
  const other = openProductionStore(file, { ...storeArgs, runId: "tamper-run", recipeHash: next.hash });
  assert.throws(() => withCheckpointContinuation(other, tampered).acquire("student", { prompt: "same" }), /TAMPERED/);
  other.close();
  const { hash: nextHash, ...nextBody } = next;
  const childRecipe = seal({ ...nextBody, continuation: continuation.manifest });
  const chainedId = "pilot-" + childRecipe.hash.slice(0, 20);
  const chained = openProductionStore(file, { ...storeArgs, runId: chainedId, recipeHash: childRecipe.hash });
  chained.finish(chained.acquire("pilot-start", {}), { began: 1 });
  chained.reserve("paid-second", { request: 2 }, 100, 5);
  chained.settle("paid-second", { usage: { inputUnits: 3, outputUnits: 2, totalUnits: 5 }, costMicros: 10, response: { ok: true } });
  chained.close();
  const continuation2 = inspectContinuation(file, chainedId, childRecipe, next);
  assert.deepEqual(continuation2.manifest.accounting, { calls: 2, costMicros: 30, tokens: 15 });
});
await check("C_calibration_uses_same_bounded_review_schema_repair_without_approving_negative", async () => {
  const db = openProductionStore(path.join(temporary, "calibration-schema.sqlite"), storeArgs);
  let calls = 0;
  const runtime = createProductionRuntime({ catalogue, reader, verifier, store: db, model: async () => {
    calls += 1;
    return { command: { action: "finish", content: { verdicts: inventory.claims.map((claim) => ({
      claimId: claim.claimId, verdict: calls === 1 ? "invalid_label" : "unsupported",
      reason: "Injected schema-only repair retains negative meaning.", evidence: entry.evidence,
    })) } }, usage: { inputUnits: 0, outputUnits: 0 }, receiptHash: hash("calibration" + calls) };
  } });
  const result = await runtime.review("direct", CHAPTERS.find((c) => c.id === "movement"), "calibration",
    "Fixture review.", inventory, "adversarial_reviewer");
  assert.equal(calls, 2); assert(result.verdicts.every((v) => v.verdict === "unsupported")); db.close();
});
await check("B_host_materializes_all_frozen_spans_exactly_and_rejects_invented_addresses", () => {
  for (const row of catalogue.rows.filter((r) => !r.quarantined)) {
    const spans = sourceSpans(row);
    assert.equal(spans.map((s) => s.text).join(""), row.text);
    assert.equal(new Set(spans.map((s) => s.spanId)).size, spans.length);
  }
  const span = resolveSpan(reader, entry.evidence[0]);
  assert.equal(span.quote, source.text); assert.equal(span.evidenceHash, source.hash);
  assert.throws(() => resolveSpan(reader, { ref: source.id, spanId: "invented" }), /SPAN_UNKNOWN/);
  assert.throws(() => resolveSpan(reader, { ref: source.id, spanId: "p1", quote: "model invented quotation" }));
});
let dshBinding = null, dshProof = null;
let cachedDshEvidence = null;
const selfSource = await readFile(fileURLToPath(import.meta.url), "utf8");
const testStart = selfSource.indexOf('\nawait check("D_actual_DSH_tool_error_recovery_read_probe_and_direct_control"');
const testEnd = selfSource.indexOf('\nawait check("D_tools_cannot_read_other_chapter_or_heldout_or_execute_writes"');
const dshTestDefinitionHash = sha256(selfSource.slice(testStart, testEnd));
try {
  const previous = verifySeal(JSON.parse(await readFile(path.join(OUT, "readiness.json"), "utf8")));
  await writeFile(path.join(OUT, "readiness-" + previous.hash + ".json"), JSON.stringify(previous, null, 2), { flag: "wx" })
    .catch((error) => { if (error.code !== "EEXIST") throw error; });
  const dependencies = ["common", "evidence", "spans", "mechanics", "validation", "store", "model", "loops", "dsh-worker"].map((name) => "packages/skill-production/" + name + ".mjs");
  const bound = await Promise.all(dependencies.map(async (file) => {
    const observed = sha256(await readFile(path.join(ROOT, file)));
    return previous.codeHashes.some((r) => r.file === file && r.hash === observed);
  }));
  if (previous.passed && previous.dshProof && previous.dshTestDefinitionHash === dshTestDefinitionHash
    && previous.catalogueHash === catalogue.hash && bound.every(Boolean)
    && previous.checks.some((c) => c.id === "D_actual_DSH_tool_error_recovery_read_probe_and_direct_control" && c.passed)) cachedDshEvidence = previous;
} catch {}
await check("D_actual_DSH_tool_error_recovery_read_probe_and_direct_control", async () => {
  if (cachedDshEvidence) {
    dshBinding = cachedDshEvidence.dshBinding; dshProof = cachedDshEvidence.dshProof;
    console.log("REUSE content-bound actual DSH engineering evidence " + cachedDshEvidence.hash);
    return;
  }
  const dsh = await prepareDshLoop(ROOT); dshBinding = dsh.binding;
  for (const arm of ["direct", "dsh"]) {
    const observed = []; const port = createToolPort(reader, verifier, "movement");
    const commands = [
      { action: "read", args: { refs: ["nonexistent-source"] } },
      { action: "read", args: { refs: ["faq-v1:06"] } },
      { action: "probe", args: { id: "development.movement.1" } },
      { action: "finish", content: { fixtureOnly: true } },
    ];
    const input = { task: "Injected engineering test. Read evidence and probe before final.",
      toolPort: port, callModel: async (request) => {
        observed.push(request.observed);
        return { command: commands[request.call - 1], usage: { inputUnits: 0, outputUnits: 0 },
          receiptHash: hash("fixture-" + request.call) };
      } };
    const result = await (arm === "dsh" ? dsh.run(input) : runDirectLoop(input));
    assert.equal(result.calls, 4); assert.equal(result.toolTrace.length, 3);
    assert(JSON.stringify(observed[1]).includes("EVIDENCE_UNAVAILABLE"));
    assert(JSON.stringify(observed[2]).includes("faq-v1:06"));
    assert(JSON.stringify(observed[3]).includes("actual_current_rules_kernel_twice"));
    if (arm === "dsh") {
      assert(result.events.some((e) => e.type === "tool/call"));
      assert.equal(result.sandboxReceipt.execution.cleanupVerified, true);
      dshProof = result;
    }
  }
  // Re-create the actual DSH Session twice: stable inputs must reuse the paid
  // request checkpoint despite fresh session/message IDs and sandbox paths.
  const db = openProductionStore(path.join(temporary, "dsh-resume.sqlite"), storeArgs);
  let physical = 0;
  const account = createAccountedModel({ store: db, complete: async () => {
    physical += 1;
    return { output: { channels: { skill: physical === 1
      ? { action: "read", args: { refs: ["faq-v1:06"] } }
      : { action: "finish", content: { fixtureOnly: true } } } },
      usageReceipt: { requestedModel: profile.model, reportedModel: profile.model,
        startedAt: "2026-09-05T00:00:00Z", usage: { inputUnits: 10, outputUnits: 2, totalUnits: 12 }, receiptHash: hash("fixture" + physical) } };
  } });
  for (let restart = 0; restart < 2; restart += 1) {
    await dsh.run({ task: "Stable resume fixture.", toolPort: createToolPort(reader, verifier, "movement"),
      callModel: (request) => account({ ...request, stageId: "dsh-stable-resume" }) });
  }
  assert.equal(physical, 2); assert.equal(db.summary().calls, 2); db.close();
});
await check("D_tools_cannot_read_other_chapter_or_heldout_or_execute_writes", async () => {
  const port = createToolPort(reader, verifier, "movement");
  assert((await port.execute("probe", { id: "heldout.movement.1" })).error);
  assert((await port.execute("read", { refs: ["faq-v1:17"] })).error);
  assert((await port.execute("apply", {})).error);
});
// Readiness binds the implementation, not a stale hand-written boolean.
const codeFiles = (await readdir(path.join(ROOT, "packages/skill-production"))).filter((f) => f.endsWith(".mjs"))
  .map((f) => "packages/skill-production/" + f);
codeFiles.push("scripts/verify-ticket-17-production-redesign-v1.mjs",
  "scripts/run-ticket-17-production-pilot-v1.mjs",
  "packages/secure-provider-runtime/provider-egress-transport-v1.mjs",
  "packages/secure-provider-runtime/provider-egress-contract-v1.mjs",
  "packages/secure-provider-runtime/provider-egress-worker-port-v2.mjs",
  "packages/secure-provider-runtime/provider-egress-worker-child-v1-classified.mjs",
  "packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs",
  "packages/secure-provider-runtime/provider-response-outcome-v1.mjs");
const codeHashes = await Promise.all(codeFiles.sort().map(async (file) => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const report = seal({ checks, passed: checks.every((c) => c.passed), catalogueHash: catalogue.hash,
  codeHashes, dshBinding, dshProof, dshTestDefinitionHash, dshEvidenceReusedFrom: cachedDshEvidence?.hash || null,
  mechanics: verifier.manifest, kernelExecutions: verifier.trace(),
  ctx2skillLoopUsed: true, targetGames: ["starcraft-tmg"], roleRoutes: ["Tutor", "Student", "supportive", "adversarial", "arbitrator", "Editor"],
  skillsRead: [], skillsGenerated: [], judgeTestsRun: checks.length,
  crossTimeReplayResult: crossTime,
  promotions: [], blocks: ["Live semantic calibration and chapter pilot still required"],
  remainingRuleGaps: ["Core prose requires review; no full-rule semantic coverage claimed"],
  harnessLoopUsed: true, promptPackRoutes: ["offline-production"], harnessToolsCalled: ["read", "query", "probe"],
  uiTraceEvidence: [], agentDecisionEvidence: dshProof?.hash || null, memoryTraceEvidence: [],
  trainingTraceCandidates: [], rollbackOrDemotionRules: ["never auto-publish"], userVisibleChecks: [],
  paidCalls: 0, semanticEffectivenessProven: false, trainingTruth: false });
await writeFile(path.join(OUT, "readiness.json"), JSON.stringify(report, null, 2));
await writeFile(path.join(OUT, "readiness-" + report.hash + ".json"), JSON.stringify(report, null, 2), { flag: "wx" })
  .catch((error) => { if (error.code !== "EEXIST") throw error; });
console.log(JSON.stringify({ passed: report.passed, checks: checks.length, failures: checks.filter((c) => !c.passed), hash: report.hash }));
if (!report.passed) process.exitCode = 1;
