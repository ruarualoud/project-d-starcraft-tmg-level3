import { hash, seal, verifySeal, exact, text, safe, fail } from '../skill-production/common.mjs';
import { runDirectLoop, LOOP_LIMITS } from '../skill-production/loops.mjs';
import { modelEvidence } from '../skill-production/spans.mjs';
import { compileGlobalTask } from './context.mjs';
import { DRAFT_SHAPE, inspectDraft, validateReview, reconcileReviews, applyIssuePatch } from './contracts.mjs';
import { DIAGNOSIS_KINDS, validateDiagnosis, advanceIssueJournal, persistIssueJournal } from './issues.mjs';
import { planAddressBoundCitationRepair } from './citation-repair.mjs';

const REVIEW_INSTRUCTION = `Independently inspect EVERY claim and EVERY assigned passage against the complete official source background.
Check subjects, timing, dependencies, costs, boundaries, quantities, exceptions and FAQ precedence. Do not accept citation existence as proof.
Distinguish missing content from missing citation. For each normative passage identify the claims covering it, or the exact missing subject/condition/consequence.
For non-normative designer rationale only, use non_normative and explain why it establishes no game condition; never hide an actual rule as rationale.
Read adjacent full-source passages to interpret sentence fragments. Conditional strategy is an inference, not a demonstrated win.
Return {"verdicts":[{"claimId":"claims.0","verdict":"supported","reason":"specific concise explanation","evidence":[{"ref":"source ID","spanId":"p1"}]}],"passageCoverage":[{"ref":"assigned source ID","spanId":"p1","verdict":"covered","reason":"conditions preserved or exact omission","claimIds":["claims.0"]}]}.
Claim verdict enum: supported, unsupported, unknown. Passage verdict enum: covered, non_normative, omission, unknown.
Cover every claim and assigned passage exactly once. Use claimIds:[] for non_normative; for omissions list any existing claims that need conditions repaired.
Keep reasons concise (normally under 100 Chinese characters) without dropping material findings. Unknown/negative is valid; never approve just to finish.`;

const EDIT_INSTRUCTION = `Repair only the recorded issues using their evidence and the full sources. Diagnoses are hypotheses, not authority.
Preserve all unaffected claims byte-for-byte. Fix conditions in exactly flagged claims; add omitted conditions only where an issue identifies the missing passage.
If content is already correct and only a citation is absent, use citationAdditions without changing text. Do not duplicate rules merely to satisfy citation counting.
Return {"parentHash":"copy exact hash","replacements":[{"claimId":"claims.N","value":{"kind":"rule","text":"corrected claim","evidence":[{"ref":"source ID","spanId":"p1"}]}}],"additions":[],"citationAdditions":[{"claimId":"claims.N","evidence":[{"ref":"source ID","spanId":"p1"}]}]}.
Remove unused example entries. Replacements allowed only for claim issues or claims explicitly linked to a source omission/disagreement. Additions must cite an issue's missing passage.
If no justified edit exists, return empty arrays. That triggers recorded diagnosis/recheck or quarantine, never a format retry or silent success.`;

export function createGlobalTools({ reader, context, verifier, developmentProbeIds = [] }) {
  verifySeal(context);
  const sources = new Map(context.prompt.sources.map(s => [s.ref, s])), reads = new Set(), trace = [];
  return { readRefs: () => [...reads], trace: () => [...trace],
    async execute(name, args) {
      let result;
      try {
        if (name === 'read') {
          exact(args, ['refs']);
          if (!Array.isArray(args.refs) || !args.refs.length || args.refs.length > 12
            || args.refs.some(ref => !sources.has(ref))) fail('V3_TOOL_READ_SCOPE_INVALID');
          result = modelEvidence(reader.read({ refs: args.refs, maxChars: 48000 }));
          args.refs.forEach(ref => reads.add(ref));
        } else if (name === 'query') {
          exact(args, ['query']); text(args.query, 200);
          const query = args.query.toLowerCase();
          const matches = [...sources.values()].filter(s => s.title.toLowerCase().includes(query)
            || s.ref.toLowerCase().includes(query) || s.passages.some(p => p.text.toLowerCase().includes(query)));
          result = { matches: matches.slice(0, 20).map(s => ({ ref: s.ref, title: s.title })),
            totalMatches: matches.length, completeSourceAlreadyInPrompt: true };
        } else if (name === 'probe') {
          exact(args, ['id']);
          if (!developmentProbeIds.includes(args.id)) fail('V3_TOOL_PROBE_SCOPE_INVALID');
          result = verifier.run(args.id);
        } else fail('V3_TOOL_FORBIDDEN');
      } catch (error) { result = { error: error.code || 'V3_TOOL_INPUT_INVALID' }; }
      trace.push(seal({ name, args, result })); return result;
    } };
}

export function createProductionRuntimeV3({ store, reader, context, verifier, model, dsh,
  maxRevisions = 3, onProgress = () => {} }) {
  verifySeal(context);
  if (!Number.isInteger(maxRevisions) || maxRevisions < 1 || maxRevisions > 4) fail('V3_REVISION_LIMIT_INVALID');
  async function role({ packet, roleId, instruction, workspace, maxOutput = 4096, arm = 'dsh' }) {
    verifySeal(packet);
    const id = packet.id + '.' + roleId, task = compileGlobalTask(context, instruction, workspace);
    const lease = store.acquire(id, { packetHash: packet.hash, contextHash: context.hash, task, maxOutput, arm, limits: LOOP_LIMITS });
    if (lease.cached) return verifySeal(lease.artifact);
    const port = createGlobalTools({ reader, context, verifier });
    onProgress({ packet: packet.id, role: roleId, state: 'running' });
    try {
      const input = { task, toolPort: port, callModel: request => model({ ...request, stageId: id, maxOutput }) };
      const result = await (arm === 'dsh' ? dsh.run(input) : runDirectLoop(input));
      return store.finish(lease, seal({ output: result.final, contextHash: context.hash,
        fullSourcePromptHash: hash(context.prompt), sourceDelivery: 'host_materialized_in_every_role_prompt',
        toolReadRefs: port.readRefs(), toolTrace: port.trace(), loop: result, roleId: id, trainingTruth: false }));
    } catch (error) { store.release(lease); throw error; }
  }
  async function checkedRole(input, validate) {
    let result = await role(input);
    try { return { artifact: result, validated: validate(result.output, result) }; }
    catch (error) {
      // Only structural/address repair. A negative valid judgment never enters
      // this branch, and a no-op edit is a typed outcome, not invalid syntax.
      if (!/^(V3_|OUTPUT_|TEXT_|REVIEW_|EVIDENCE_|SOURCE_SPAN)/.test(error.code || '')) throw error;
      result = await role({ ...input, roleId: input.roleId + '.schema',
        instruction: input.instruction + '\nYour previous output violated the declared schema/address contract. Repair only that violation; preserve negative judgments, uncertainty, content and unaffected paths.',
        workspace: { ...input.workspace, rejectedOutput: result.output, contractError: error.code } });
      return { artifact: result, validated: validate(result.output, result) };
    }
  }
  async function produce(packet, seed = null) {
    verifySeal(packet);
    if (seed) {
      verifySeal(seed);
      if (seed.packetHash !== packet.hash || seed.catalogueHash !== context.catalogueHash
        || seed.draftHash !== hash(seed.draft) || seed.semanticAcceptanceInherited !== false) fail('V3_SEED_BINDING_INVALID');
    }
    const finalId = packet.id + '.candidate';
    const finalInput = { packetHash: packet.hash, contextHash: context.hash, seedHash: seed?.hash || null, maxRevisions };
    const existing = store.artifact(finalId);
    if (existing) {
      verifySeal(existing);
      if (existing.inputHash !== hash(finalInput)) fail('V3_CANDIDATE_CHECKPOINT_DRIFT');
      return existing;
    }
    const assignment = { packetId: packet.id, assignedPassages: packet.passages.map(p => ({ ref: p.ref, spanId: p.spanId })),
      writingScope: 'One packet of the overall rules Skill, not a separate Skill. All global sources remain readable.' };
    let draft, seedReceipt = null;
    if (seed) {
      const lease = store.acquire(packet.id + '.imported-seed', { seedHash: seed.hash });
      seedReceipt = lease.cached ? lease.artifact : store.finish(lease, seed);
      draft = seedReceipt.draft;
    } else {
      const tutor = await checkedRole({ packet, roleId: 'tutor', maxOutput: 1400,
        instruction: 'Tutor: use the complete official source background to teach the assigned passage decision procedures, dependencies, exceptions and FAQ overrides. Sources are already delivered; use read/query only if useful. Return {"lesson":["source-grounded teaching point"],"uncertainties":[]}. No invented rules or tests.',
        workspace: assignment }, output => {
        exact(output, ['lesson', 'uncertainties']);
        if (![output.lesson, output.uncertainties].every(Array.isArray) || !output.lesson.length
          || output.lesson.length > 20 || output.uncertainties.length > 20) fail('V3_TUTOR_SCHEMA_INVALID');
        [...output.lesson, ...output.uncertainties].forEach(t => text(t, 1000)); return output;
      });
      const generated = await checkedRole({ packet, roleId: 'generator',
        instruction: 'Student/Generator: write this assigned part of ONE overall rules Skill in Chinese using the complete sources. Preserve every material condition, dependency and exception; do not reduce a rule to its heading. Cite exact ref/spanId from any global source as needed (1..4 each). 1..24 claims, each at most 1500 characters; kind rule/strategy/caution. Do not force a fixed number of strategies or cautions. Non-normative rationale needs no invented rule claim. Never invent quotation text, results or rule authority. Return ' + JSON.stringify(DRAFT_SHAPE),
        workspace: { ...assignment, unverifiedTutor: tutor.validated } }, output => inspectDraft(output, { packet, context, reader }));
      draft = generated.artifact.output;
    }
    let inventory;
    try { inventory = inspectDraft(draft, { packet, context, reader }); }
    catch (error) {
      const fixed = await checkedRole({ packet, roleId: 'seed-schema-editor',
        instruction: 'Repair only the imported draft schema/addresses against the complete sources. Preserve meaning and all material conditions. Output ' + JSON.stringify(DRAFT_SHAPE) + '. 1..24 claims; 1..4 evidence addresses per claim; max 1500 characters per claim.',
        workspace: { ...assignment, importedDraft: draft, failure: error.code } }, output => inspectDraft(output, { packet, context, reader }));
      draft = fixed.artifact.output; inventory = fixed.validated;
    }
    const rounds = [], revisions = [], diagnostics = [], repairStops = [];
    let journal = null, recheck = null, recheckUsed = false, transition = { kind: seed ? 'imported_untrusted_draft' : 'generated_draft' };
    const seenDrafts = new Set([hash(draft)]);
    for (let revision = 0; revision <= maxRevisions; revision += 1) {
      const reviews = [];
      for (const route of ['supportive_reviewer', 'adversarial_reviewer']) {
        const reviewed = await checkedRole({ packet, roleId: route + '.' + revision,
          instruction: 'Role: ' + route + '. Fresh independent context; you do not see the other reviewer.\n' + REVIEW_INSTRUCTION,
          workspace: { ...assignment, claims: inventory.claims.map(c => ({ claimId: c.claimId, kind: c.field, text: c.text,
            evidence: c.evidence.map(e => ({ ref: e.ref, spanId: e.spanId })) })),
          evidenceRecheckRequest: recheck } }, (output, artifact) => validateReview(output, inventory,
          { packet, context, reader, reviewId: artifact.roleId, role: route }));
        reviews.push(reviewed.validated);
      }
      const combined = reconcileReviews(inventory, packet, reviews);
      journal = persistIssueJournal(store, packet.id, advanceIssueJournal(journal, combined,
        { packetHash: packet.hash, revision, transition }));
      rounds.push({ inventory, reviews, combined, journalHash: journal.hash });
      onProgress({ packet: packet.id, revision, state: 'reviewed', issues: combined.issues.length, passed: combined.passed });
      if (combined.passed || revision === maxRevisions) break;
      const addressBound = planAddressBoundCitationRepair(draft, combined, { reader, context });
      if (addressBound) {
        if (seenDrafts.has(addressBound.resultHash)) { repairStops.push({ revision, code: 'REPAIR_CYCLE_DETECTED' }); break; }
        seenDrafts.add(addressBound.resultHash);
        transition = { kind: 'host_address_bound_citation_patch', parentDraftHash: hash(draft),
          resultHash: addressBound.resultHash, patchHash: hash(addressBound.patch), evidenceHash: addressBound.hash };
        revisions.push({ ...transition, patch: addressBound.patch, resolvedSourceEvidence: addressBound.evidence });
        draft = addressBound.draft; inventory = inspectDraft(draft, { packet, context, reader }); recheck = null;
        onProgress({ packet: packet.id, revision, state: 'citation_metadata_repaired', changedProse: false,
          correctedAddresses: addressBound.evidence.length, semanticReReviewStillRequired: true });
        continue;
      }
      const diagnosis = await checkedRole({ packet, roleId: 'diagnosis.' + revision, maxOutput: 3072,
        instruction: 'Diagnose every recorded issue against the complete sources. Distinguish content mistakes, citation-only mistakes, missing dependencies, verifier/reviewer mistakes and uncertain source. Do not silently dismiss negative judgments or rewrite the draft. Return {"issues":[{"fingerprint":"exact issue fingerprint","kind":"one enum","reason":"specific evidence-based cause","repairPlan":"localized repair or specific recheck question","evidence":[{"ref":"source ID","spanId":"p1"}]}]}. Exactly one entry per issue; kind enum: ' + DIAGNOSIS_KINDS.join(', ') + '. Diagnostics cannot authorize promotion.',
        workspace: { ...assignment, draft, issues: combined.issues } }, output => validateDiagnosis(output, combined, { reader, context }));
      diagnostics.push(diagnosis.validated);
      if (diagnosis.validated.issues.some(i => i.kind === 'source_uncertain')) {
        repairStops.push({ revision, code: 'SOURCE_UNCERTAIN_REQUIRES_EXTERNAL_EVIDENCE', diagnosisHash: diagnosis.validated.hash }); break;
      }
      const edited = await checkedRole({ packet, roleId: 'editor.' + revision, instruction: EDIT_INSTRUCTION,
        workspace: { ...assignment, parentHash: hash(draft), draft, issues: combined.issues, diagnosis: diagnosis.validated } }, output => {
        const result = applyIssuePatch(draft, output, combined.issues);
        if (result.changed) inspectDraft(result.draft, { packet, context, reader });
        return result;
      });
      if (!edited.validated.changed) {
        const verdictDisputes = diagnosis.validated.issues.filter(i => i.kind === 'verifier_error');
        if (recheckUsed || verdictDisputes.length !== combined.issues.length) {
          repairStops.push({ revision, code: 'NO_PROGRESS_AFTER_TYPED_DIAGNOSIS', diagnosisHash: diagnosis.validated.hash }); break;
        }
        // A single evidence-backed calibration request, not resampling until
        // lucky. Both new reviews must explain source coverage/claim support;
        // all original negative judgments remain in rounds and the journal.
        recheck = { diagnosisHash: diagnosis.validated.hash, questions: verdictDisputes.map(i => ({
          question: i.repairPlan, evidence: i.evidence })), authority: 'untrusted_evidence_question_not_verdict_override' };
        recheckUsed = true;
        transition = { kind: 'bounded_evidence_recheck', parentDraftHash: hash(draft), diagnosisHash: diagnosis.validated.hash };
        continue;
      }
      const next = edited.validated.draft;
      if (seenDrafts.has(hash(next))) { repairStops.push({ revision, code: 'REPAIR_CYCLE_DETECTED' }); break; }
      seenDrafts.add(hash(next));
      transition = { kind: 'localized_patch', parentDraftHash: hash(draft), resultHash: hash(next),
        patchHash: hash(edited.artifact.output), diagnosisHash: diagnosis.validated.hash };
      revisions.push({ ...transition, patch: edited.artifact.output });
      draft = next; inventory = inspectDraft(draft, { packet, context, reader }); recheck = null;
    }
    const result = seal(safe({ schema: 'starcraft_production_packet_candidate_v3', inputHash: hash(finalInput),
      packetId: packet.id, packetHash: packet.hash, contextHash: context.hash, seedHash: seedReceipt?.hash || null,
      draft, rounds, revisions, diagnostics, repairStops, issueJournal: journal,
      semanticPassed: rounds.at(-1).combined.passed && journal.openIssues === 0,
      sourceBinding: packet.sourceBinding, actualRoomReplayPerformed: false, heldoutPassed: false,
      independentContextsNotIndependentModels: true, candidateOnly: true, runtimeAccepted: false, trainingTruth: false }));
    const lease = store.acquire(finalId, finalInput);
    return lease.cached ? lease.artifact : store.finish(lease, result);
  }
  return Object.freeze({ role, produce });
}
