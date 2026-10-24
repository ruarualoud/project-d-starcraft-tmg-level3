// Read-only active-chain inventory, not a Plan acceptance test or model call.
// Reports identities and missing links; never rewrites production artifacts.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { unresolvedStarcraftTmgProviderDispatchesV1 } from '../packages/secure-provider-runtime/provider-dispatch-recovery-v1.mjs';
const base = process.argv[2];
const selectedArms = process.argv[3] ? process.argv[3].split(',') : ['A', 'B', 'C', 'D', 'E', 'F'];
if (selectedArms.some(arm => !['A', 'B', 'C', 'D', 'E', 'F'].includes(arm))) {
  throw new Error('Unknown planning arm');
}
const rows = [];
for (const arm of selectedArms) {
  const directory = `${base}/${['A','B'].includes(arm) ? `${arm}/fresh-generation-v264`
    : `roster-plan-matrix-v274/${arm}/fresh-generation-v274`}`;
  const progress = JSON.parse(await fs.readFile(`${directory}/progress.private.json`, 'utf8'));
  const findings = [];
  const check = (condition, code, detail) => { if (!condition) findings.push({ code, detail }); };
  if (arm === 'A') {
    const file = `${directory}/workspace/drafts/${progress.sessionId}.json`;
    const raw = JSON.parse(await fs.readFile(file, 'utf8'));
    const state = raw.value || raw;
    const plan = typeof state.planSerialized === 'string'
      ? JSON.parse(state.planSerialized) : state.planSerialized;
    check(state.sessionId === progress.sessionId, 'SESSION_IDENTITY_MISMATCH');
    // Generation is an immutable replay identity, not the latest revision.
    const versions = [plan, ...(state.planVersionHistory || []).map(value =>
      typeof value === 'string' ? JSON.parse(value) : value)];
    const generationReferenceFound = !state.generatedPlanHash || versions.some(value =>
      value?.planHash === state.generatedPlanHash);
    check(generationReferenceFound, 'GENERATED_PLAN_REFERENCE_MISSING');
    const pending = unresolvedStarcraftTmgProviderDispatchesV1(state.providerDispatches || []);
    rows.push({ arm, file, bytes: (await fs.stat(file)).size, status: state.status,
      planVersion: plan?.planVersion, planHash: plan?.planHash,
      generatedPlanHash: state.generatedPlanHash, generationReferenceFound,
      latestReviewPlanHash: state.planReview?.planHash || null,
      reviewAppliesToCurrentPlan: Boolean(plan?.planHash && state.planReview?.planHash === plan.planHash),
      planReviewStatus: state.planReview?.status, teachPhase: state.teachFramework?.state?.phase,
      unresolvedDispatches: pending.map(x => ({ requestId: x.requestId, status: x.status })),
      currentFailure: state.failure || null, findings });
    continue;
  }
  const folder = `${directory}/workspace/iterative-draft/sessions`;
  const name = (await fs.readdir(folder)).find(name => /^[a-f0-9]{64}\.json$/.test(name));
  const file = `${folder}/${name}`;
  const state = JSON.parse(await fs.readFile(file, 'utf8')).value;
  check(state.sessionId === progress.sessionId, 'SESSION_IDENTITY_MISMATCH');
  check(hash(state.currentCandidate.input) === state.currentCandidate.candidateHash, 'CANDIDATE_INPUT_IDENTITY_MISMATCH');
  check(state.plan.candidateHash === state.currentCandidate.candidateHash, 'PLAN_ARMY_IDENTITY_MISMATCH');
  const snapshots = state.draftTeachSnapshots || [];
  const snapshotRows = snapshots.map(snapshot => {
    check(hash(snapshot.candidateInput) === snapshot.candidateHash, 'TEACH_ARMY_INPUT_MISMATCH', snapshot.snapshotId);
    check(snapshot.plan.candidateHash === snapshot.candidateHash, 'TEACH_PLAN_ARMY_MISMATCH', snapshot.snapshotId);
    check(snapshot.sourcePlanHash === snapshot.plan.planHash, 'TEACH_PLAN_REFERENCE_MISMATCH', snapshot.snapshotId);
    check(hash(snapshot.context.frozenContext) === hash(state.frozenContext), 'FROZEN_CONTEXT_CHANGED', snapshot.snapshotId);
    check(snapshot.context.mission.map.mapBinding.roomFreezeHash === state.frozenContext.mapHash,
      'TEACH_MAP_HANDOFF_MISMATCH', snapshot.snapshotId);
    return { snapshotId: snapshot.snapshotId, status: snapshot.status,
      currentArmy: snapshot.candidateHash === state.currentCandidate.candidateHash,
      currentPlan: snapshot.sourcePlanHash === hash(state.plan),
      phase: snapshot.state?.phase,
      unresolvedDispatchCount: unresolvedStarcraftTmgProviderDispatchesV1(snapshot.dispatches || []).length };
  });
  let repliesChecked = 0;
  for (const iteration of state.iterations) {
    if (!iteration.requestKey) continue;
    const replyFile = createHash('sha256').update(iteration.requestKey).digest('hex') + '.json';
    let reply;
    try { reply = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/replies/${replyFile}`, 'utf8')).value; }
    catch (error) { if (error.code !== 'ENOENT') throw error;
      findings.push({ code: 'SETTLED_REPLY_MISSING', revision: iteration.revision }); continue; }
    repliesChecked++;
    check(reply.requestKey === iteration.requestKey && reply.receiptHash === iteration.modelReceiptHash,
      'SETTLED_REPLY_LINK_MISMATCH', iteration.revision);
  }
  const route = state.observations.findLast(row => row.query?.kind === 'map_route'
    && row.query.candidateHash === state.currentCandidate.candidateHash
    && row.receipt?.candidateHash === state.currentCandidate.candidateHash
    && row.receipt?.mapBinding?.roomFreezeHash === state.frozenContext.mapHash
    && row.receipt.status === 'certified');
  rows.push({ arm, file, bytes: (await fs.stat(file)).size, sessionId: state.sessionId,
    status: state.status, revision: state.revision, frozenContext: state.frozenContext,
    mineralSpent: state.currentCandidate.mineralSpent, candidateHash: state.currentCandidate.candidateHash,
    mapBinding: { planReference: state.plan.mapEvidenceHash, currentRoute: route?.receipt.receiptHash || null,
      same: Boolean(route && state.plan.mapEvidenceHash === route.receipt.receiptHash) },
    repliesChecked, snapshots: snapshotRows,
    pendingDecision: Boolean(state.pendingDecision), blockingFinding: state.blockingFinding, findings });
}
console.log(JSON.stringify({ observedAt: new Date().toISOString(), mode: 'read_only_lineage_inventory', rows,
  limitations: ['Not semantic strategy verification', 'Not final Plan admission',
    'Historical snapshots may intentionally differ from the current army/Plan',
    'Map reference absence in a draft is not proof that the source map is absent'],
  providerCalls: 0, nativeActions: 0, productionWrites: 0 }, null, 2));
