import { CHAPTERS } from "./evidence.mjs";
import { createToolPort, runDirectLoop, LOOP_LIMITS } from "./loops.mjs";
import { CHAPTER_OUTPUT_SCHEMA, inspectChapterDraft, validateSemanticReview, combineSemanticReviews,
  applyTargetedPatch, renderChapter } from "./validation.mjs";
import { hash, seal, safe, exact, fail } from "./common.mjs";
import { modelEvidence } from "./spans.mjs";

export function chapterScope(catalogue, chapter) {
  const available = catalogue.rows.filter((row) => !row.quarantined && row.chapterIds.includes(chapter.id));
  // Explicit bounded pilot coverage: at least core context plus reconciled FAQ.
  // The full inventory is reported separately; selected refs != all rules covered.
  const selectors = {
    setup: [/9\.1\.1 Engagement Scale$/, /9\.2 Mission Selection and the Draft$/],
    round: [/8\.1 Rounds and Phases$/, /8\.2 The Activation System$/],
    movement: [/4\.1 Measuring Distances$/, /4\.4 Unit Coherency$/, /4\.6 Gap Clearance and Model Size$/],
    assault: [/8\.7\.7 Charge$/, /8\.8\.1 The Close Combat Attack$/],
    combat: [/8\.7\.4 Ranged Attack Resolution$/, /8\.8\.1 The Close Combat Attack$/],
    terrain: [/7\.1 Line of Sight$/, /7\.1\.1 Cover$/],
    abilities: [/10\.2 Active Abilities \(Full Rules\)$/, /10\.4 Reaction Abilities \(Full Rules\)$/],
    tokens: [/7\.3\.1 Tokens$/, /7\.3\.2 Markers$/, /5\.1 Unit Cards$/],
    scoring: [/8\.9\.1 Determine Mission Marker Control$/, /8\.10 The Final Score$/],
    exceptions: [/2\.6\.2 The Priority$/, /12\.9 Dispute Resolution$/],
  };
  const primary = selectors[chapter.id].map((selector) => {
    const matches = available.filter((row) => row.id.startsWith("core.") && selector.test(row.title));
    if (matches.length !== 1) fail("CHAPTER_CORE_SELECTOR_INVALID", { chapter: chapter.id });
    return matches[0];
  });
  const requiredRefs = [...primary.map((row) => row.id),
    ...chapter.faq.slice(0, 2).map((n) => "faq-v1:" + String(n).padStart(2, "0"))];
  if (!primary.length) fail("CHAPTER_CORE_SOURCE_MISSING", { chapter: chapter.id });
  return seal({ chapterId: chapter.id, requiredRefs, availableRefs: available.map((row) => row.id),
    pilotSubset: true, allRulesCovered: false, remainingRefs: available.filter((row) => !requiredRefs.includes(row.id)).map((row) => row.id) });
}
const reviewShape = { verdicts: [{ claimId: "rules.0", verdict: "unknown",
  reason: "specific entailment or missing condition, not a generic approval",
  evidence: [{ ref: "exact source ID", spanId: "p1" }] }] };

export function createProductionRuntime({ catalogue, reader, verifier, store, model, dsh, onProgress = () => {} }) {
  async function stage(arm, chapter, name, task, { maxOutput = 4096, requireRead = false, requireProbe = false } = {}) {
    const id = arm + "." + chapter.id + "." + name;
    const lease = store.acquire(id, { task, maxOutput, limits: LOOP_LIMITS, catalogue: catalogue.hash });
    if (lease.cached) return lease.artifact;
    const port = createToolPort(reader, verifier, chapter.id);
    const callModel = (request) => model({ ...request, stageId: id, maxOutput });
    try {
      onProgress({ arm, chapter: chapter.id, stage: name, state: "running" });
      const result = await (arm === "dsh" ? dsh.run({ task, callModel, toolPort: port })
        : runDirectLoop({ task, callModel, toolPort: port }));
      if (requireRead && !port.readRefs().length || requireProbe && !port.trace().some((row) => row.name === "probe" && row.result.passed)) fail("REQUIRED_TOOL_EVIDENCE_MISSING");
      const artifact = seal({ output: result.final, readRefs: port.readRefs(), toolTrace: port.trace(),
        loop: result, freshContextId: id, trainingTruth: false });
      return store.finish(lease, artifact);
    } catch (error) { store.release(lease); throw error; }
  }
  async function review(arm, chapter, name, task, inventory, role) {
    let output = await stage(arm, chapter, name, task);
    try { return validateSemanticReview(output.output, inventory, { reader, reviewId: output.freshContextId, role }); }
    catch (error) {
      output = await stage(arm, chapter, name + ".schema-repair", task +
        "\nRepair ONLY this review's JSON schema and citations, not the candidate chapter. " +
        "The verdict enum is exactly supported, unsupported, unknown. " +
        "A source contradiction should be unsupported, insufficient evidence should be unknown. " +
        "Preserve each claim ID and recheck against source. Do not change a negative judgement merely to pass schema.\n" +
        JSON.stringify({ prior: output.output, errorCode: error.code || "REVIEW_SHAPE_INVALID" }));
      return validateSemanticReview(output.output, inventory, { reader, reviewId: output.freshContextId, role });
    }
  }
  async function chapter(arm, chapter) {
    const completed = store.artifact(arm + "." + chapter.id + ".chapter");
    if (completed) return completed;
    const scope = chapterScope(catalogue, chapter);
    const shared = JSON.stringify({ chapter: chapter.title, scope,
      sources: reader.query({ chapterId: chapter.id, limit: 40 }).rows,
      developmentProbes: verifier.list(chapter.id), sourcePolicy: "Core prose is review-required. Current reconciled FAQ overrides conflicting core prose. Never treat a quotation as proof of a strategy's success. No RTS facts." });
    const tutor = await stage(arm, chapter, "tutor",
      "Role Tutor. Read all requiredRefs using the read tool (can batch them). Run at least one listed development probe. " +
      "Then finish with this content shape: " + JSON.stringify({ lesson: ["up to 5 concise priorities"], uncertainties: ["real gaps, or empty array"] }) + ". " +
      "Do not invent missing content; retain source caveats. This lesson is an unverified teaching aid.\n" + shared,
      { maxOutput: 1024, requireRead: true, requireProbe: true });
    let draft = (await stage(arm, chapter, "student",
      "Role Student/Generator. Produce this chapter of ONE overall How-to-Play skill in Chinese. " +
      "Read all requiredRefs yourself before writing. Cover each required source with at least one meaningful claim. " +
      "Return content shaped as " + JSON.stringify(CHAPTER_OUTPUT_SCHEMA) + ". rules:4..8;strategy:2..8;cautions:2..8. " +
      "Each claim <=1000 characters with 1..4 evidence addresses: ref plus spanId from the retrieved passages. " +
      "Do NOT copy or generate quotation text; the host materializes the exact frozen passage. " +
      "Do not include headings, overall verdicts, fabricated examples, invented numbers or authorities. " +
      "Strategy must be conditional and source-grounded; cautions must identify real limitations, not unrelated warnings. " +
      "The tutor may be wrong; trust retrieved sources over tutor notes.\n" + shared + "\nUnverified tutor: " + JSON.stringify(tutor.output),
      { requireRead: true }));
    const revisions = [], semanticRounds = [];
    async function reviewStage(name, task, inventory, role) {
      return review(arm, chapter, name, task, inventory, role);
    }
    for (let revision = 0; revision <= 2; revision += 1) {
      let inventory;
      try { inventory = inspectChapterDraft(draft.output, { reader, chapterId: chapter.id,
        readRefs: draft.readRefs, requiredRefs: scope.requiredRefs }); }
      catch (error) {
        // One schema repair, not seven-role regeneration. Store both artifacts.
        if (revision !== 0) throw error;
        const previousDraft = draft;
        const repaired = await stage(arm, chapter, "chapter-schema-repair",
          "Role Editor. Repair this chapter's schema without inventing claims. First read required sources. Shape: " +
          JSON.stringify(CHAPTER_OUTPUT_SCHEMA) + ". rules 4..8, strategy 2..8, cautions 2..8. Use existing ref/spanId addresses only, no quote field. " +
          "If an array has too many items, merge related claims without losing conditions or required-source coverage. " +
          "Count all three arrays before finishing; returning the unchanged invalid draft is not a repair. " +
          JSON.stringify({ scope, draft: draft.output, finding: { code: error.code || "INVALID_SHAPE",
            field: error.field || null, observedCounts: Object.fromEntries(["rules", "strategy", "cautions"].map((field) =>
              [field, Array.isArray(draft.output?.[field]) ? draft.output[field].length : null])),
            requiredCounts: { rules: { min: 4, max: 8 }, strategy: { min: 2, max: 8 }, cautions: { min: 2, max: 8 } } } }), { requireRead: true });
        // Chapter-lineage provenance survives a structural edit. Do not label
        // these as reads by the Editor: each contributing stage retains its
        // own exact tool trace. Newly invented refs remain unproven and every
        // final claim is independently reviewed against its frozen passages.
        draft = { ...repaired, readRefs: [...new Set([...previousDraft.readRefs, ...repaired.readRefs])] };
        inventory = inspectChapterDraft(draft.output, { reader, chapterId: chapter.id, readRefs: draft.readRefs, requiredRefs: scope.requiredRefs });
      }
      // Each judge starts a fresh role session. Neither sees the other review.
      const availableRefs = new Set(catalogue.rows.filter((r) => !r.quarantined).map((r) => r.id));
      const reviewRefs = [...new Set([...scope.requiredRefs,
        ...inventory.claims.flatMap((claim) => claim.evidence.map((row) => row.ref)).filter((ref) => availableRefs.has(ref))])].slice(0, 12);
      // A fabricated reference is a finding to repair, not an exception that
      // discards a chapter before its reviewers/editor can inspect it.
      const evidence = modelEvidence(reader.read({ refs: reviewRefs, maxChars: 48000 }));
      const claimProjection = inventory.claims.map((claim) => ({ claimId: claim.claimId, field: claim.field,
        text: claim.text, evidence: claim.evidence.map(({ ref, spanId }) => ({ ref, spanId })) }));
      const reviewTask = "Review EVERY inventory claim exactly once. Use the complete source text, not quote existence alone. " +
        "Check all conditions, ranges, timing, exceptions, missing dependencies, and separation of strategy from rule. " +
        "A fabricated rule with a genuine source is unsupported. Verdict must be exactly supported, unsupported, or unknown. If uncertain choose unknown, never force approval. " +
        "Strategy may be a defensible conditional inference, NOT empirically proven. Select exact ref/spanId addresses; do not output a quote field. Return " + JSON.stringify(reviewShape) + ".\n" +
        JSON.stringify({ claims: claimProjection, sourceText: evidence, scope });
      const supportive = await reviewStage("supportive-" + revision, "Role supportive_reviewer. Independently check support. " + reviewTask, inventory, "supportive_reviewer");
      const adversarial = await reviewStage("adversarial-" + revision, "Role adversarial_reviewer. Try to falsify each claim and find omitted caveats. " + reviewTask, inventory, "adversarial_reviewer");
      let combined = combineSemanticReviews(inventory, supportive, adversarial);
      let arbitration = null;
      if (combined.disagreements.length) {
        arbitration = await reviewStage("arbitrator-" + revision,
          "Role arbitrator. Resolve disagreement by independently checking source text, not majority voting. " + reviewTask +
          "\nPrior reviews: " + JSON.stringify({ supportive, adversarial }), inventory, "arbitrator");
        combined = combineSemanticReviews(inventory, supportive, adversarial, arbitration);
      }
      semanticRounds.push({ inventory, supportive, adversarial, arbitration, combined });
      if (combined.passed || revision === 2 || combined.findings.some((row) => row.claimId === "coverage")) break;
      const editor = await stage(arm, chapter, "editor-" + revision,
        "Role Editor. Finish with this JSON content shape: " + JSON.stringify({ parentHash: hash(draft.output),
          replacements: [{ claimId: "flagged claim ID", value: { text: "corrected claim", evidence: [{ ref: "source ID", spanId: "p1" }] } }] }) + ". " +
        "Replace only flagged claim IDs; unchanged claims must remain untouched. Use existing source passage addresses. " +
        JSON.stringify({ parentHash: hash(draft.output), draft: draft.output, findings: combined.findings,
          reviews: { supportive, adversarial, arbitration }, sourceText: evidence }));
      const patched = applyTargetedPatch(draft.output, editor.output, combined.findings);
      revisions.push({ parentHash: hash(draft.output), patch: editor.output, patchedHash: hash(patched) });
      draft = { ...draft, output: patched, readRefs: [...new Set([...draft.readRefs, ...editor.readRefs,
        ...evidence.rows.map((row) => row.id)])] }; // Exact source passages were also exposed in the editor's prompt.
    }
    const finalRound = semanticRounds.at(-1);
    const drills = verifier.list(chapter.id, "heldout");
    const heldout = await stage(arm, chapter, "heldout-student",
      "Role heldout Student. Answer these NEW mechanics cases using the candidate skill below. " +
      "No tools: do not call query/read/probe. Expected answers are not provided. " +
      "Finish with JSON content shaped as " + JSON.stringify({ predictions: [{ id: drills[0].id,
        values: Object.fromEntries(drills[0].answerFields.map((field) => [field, "replace with boolean or number"])) }] }) + ". Cover all cases. " +
      "Do not invent a receipt or claim you executed a test.\n" + JSON.stringify({ skill: draft.output, cases: drills }));
    exact(heldout.output, ["predictions"]);
    if (heldout.toolTrace.length || !Array.isArray(heldout.output.predictions) || heldout.output.predictions.length !== drills.length) fail("HELDOUT_DENOMINATOR_INVALID");
    const remaining = new Set(drills.map((test) => test.id));
    const predictions = heldout.output.predictions.map((prediction) => {
      exact(prediction, ["id", "values"]); if (!remaining.delete(prediction.id)) fail("HELDOUT_CASE_INVALID");
      return verifier.verifyPrediction(prediction.id, prediction.values, { allowHeldout: true });
    });
    const result = seal({ arm, chapterId: chapter.id, draft: draft.output, markdown: renderChapter(chapter, draft.output),
      scope, revisions, semanticRounds, predictions, semanticPassed: finalRound.combined.passed,
      heldoutPassed: predictions.every((p) => p.passed), roomReplayPerformed: false,
      candidateOnly: true, published: false, trainingTruth: false });
    const lease = store.acquire(arm + "." + chapter.id + ".chapter", { scopeHash: scope.hash });
    const saved = lease.cached ? lease.artifact : store.finish(lease, result);
    onProgress({ arm, chapter: chapter.id, stage: "chapter", state: "complete",
      semanticPassed: result.semanticPassed, heldoutPassed: result.heldoutPassed });
    return saved;
  }
  return Object.freeze({ chapter, stage, review });
}
