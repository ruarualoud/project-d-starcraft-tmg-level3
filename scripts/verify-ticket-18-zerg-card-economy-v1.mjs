import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { validateFactionDraftV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { inspectFactionZergCardEconomyDebtV1, assertNoFactionZergCardEconomyDebtV1,
  proposeFactionZergCardEconomyCorrectionV1, FACTION_ZERG_CARD_ECONOMY_BINDING_V1 as binding
} from '../packages/skill-evaluation/faction-zerg-card-economy-audit-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-9200d037cfa6a1c4a388';
const input = verifySeal(JSON.parse(await readFile(base + runId + '/zerg_swarm-input.json', 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let section;
try { section = verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
  .get(runId, 'faction.zerg_swarm.army_resources.1.result').artifact)).value); }
finally { db.close(); }

let checks = 0;
const check = (name, fn) => { fn(); checks++; };
const draft = section.draft, originalHash = hash(draft), audit = inspectFactionZergCardEconomyDebtV1({ input, draft });
check('actual original seven plus six same-premise fields', () => assert.deepEqual(
  audit.findings.map(f => f.index + ':' + f.path).sort(), [
    '0:reviseIf.0', '1:when.0', '1:procedure.0', '1:alternatives.0', '1:alternatives.2', '1:reviseIf.0',
    '3:alternatives.0', '3:reviseIf.0', '4:when.0', '4:when.1', '4:alternatives.0', '4:risk', '4:reviseIf.0',
  ].sort()));
check('three source classes', () => assert.equal(new Set(audit.findings.map(f => f.id)).size, 3));
check('actual reviewed source result not independent truth', () => assert.throws(() =>
  assertNoFactionZergCardEconomyDebtV1({ input, candidate: { sections: [section] } }), { code: 'FACTION_CANDIDATE_ZERG_CARD_ECONOMY_DEBT' }));
const proposal = proposeFactionZergCardEconomyCorrectionV1({ input, draft });
check('schema remains valid', () => validateFactionDraftV1(proposal.proposedDraft, input));
check('all thirteen fields corrected', () => assert.equal(proposal.changes.length, 13));
check('known debt removed', () => assert.equal(inspectFactionZergCardEconomyDebtV1({ input, draft: proposal.proposedDraft }).findings.length, 0));
check('does not mutate paid parent', () => assert.equal(hash(draft), originalHash));
check('does not inherit acceptance', () => assert.deepEqual([
  proposal.productionApplied, proposal.semanticAcceptanceInherited, proposal.independentEvaluationPassed,
  proposal.runtimeAccepted, proposal.canAffectRules, proposal.trainingTruth, proposal.freshWholeSectionReviewRequired,
], [false, false, false, false, false, false, true]));
const reverted = structuredClone(proposal.proposedDraft);
for (const f of audit.findings) {
  const [key, n] = f.path.split('.');
  if (n === undefined) reverted.recommendations[f.index][key] = f.text;
  else reverted.recommendations[f.index][key][Number(n)] = f.text;
}
check('all unflagged values and citation order preserved', () => assert.deepEqual(reverted, draft));
check('Queen real BM abilities not rewritten', () => assert.equal(proposal.proposedDraft.recommendations[1].alternatives[3], draft.recommendations[1].alternatives[3]));
check('slot and cost corrections retained', () => assert.deepEqual(proposal.proposedDraft.recommendations[5], draft.recommendations[5]));
check('same advice external resource payment retained', () => assert.deepEqual(proposal.proposedDraft.recommendations[4].procedure, draft.recommendations[4].procedure));

for (const key of ['title', 'when', 'procedure', 'alternatives', 'risk', 'reviseIf', 'unproven']) {
  const moved = structuredClone(proposal.proposedDraft), value = audit.findings[0].text;
  if (Array.isArray(moved.recommendations[0][key])) moved.recommendations[0][key][0] = value;
  else moved.recommendations[0][key] = value;
  check('counterexample moved to ' + key, () => assert.equal(inspectFactionZergCardEconomyDebtV1({ input, draft: moved }).findings.length, 1));
}
for (const value of ['错误观点：“' + audit.findings[0].text + '”', '不能认为' + audit.findings[0].text]) {
  const quoted = structuredClone(proposal.proposedDraft); quoted.recommendations[0].reviseIf[0] = value;
  check('quoted/negated text not treated as assertion', () => assert.equal(inspectFactionZergCardEconomyDebtV1({ input, draft: quoted }).findings.length, 0));
}
for (const ref of audit.sourceEvidence.map(e => e.source.ref)) {
  const changed = structuredClone(input); delete changed.hash;
  const row = changed.frozenSources.prompt.sources.find(s => s.ref === ref);
  row.passages = [{ spanId: 'p1', text: ref.startsWith('source:') ? '{"isFactionCard":true,"resource":2,"boosts":[]}' : 'drift' }];
  check('source drift rejected ' + ref, () => assert.throws(() =>
    inspectFactionZergCardEconomyDebtV1({ input: seal(changed), draft }), { code: 'FACTION_ZERG_CARD_SOURCE_DRIFT' }));
}
const terran = verifySeal(JSON.parse(await readFile(base + runId + '/terran_armed_forces-input.json', 'utf8')));
check('no cross-faction rewriting', () => assert.equal(inspectFactionZergCardEconomyDebtV1({ input: terran, draft }).findings.length, 0));
check('empty repair rejected', () => assert.throws(() => proposeFactionZergCardEconomyCorrectionV1({ input, draft: proposal.proposedDraft }),
  { code: 'FACTION_ZERG_CARD_CORRECTION_NO_TARGET' }));
check('absence is never general truth', () => assert.equal(audit.absenceProvesGeneralCorrectness, false));
const files = ['packages/skill-evaluation/faction-zerg-card-economy-audit-v1.mjs', 'scripts/verify-ticket-18-zerg-card-economy-v1.mjs'];
const report = seal({ passed: true, checks, binding, originRunId: runId, sourceSectionHash: section.hash,
  inputHash: input.hash, audit, proposal, sourceReviewModelAgreementNotAuthority: true,
  productionApplied: false, newProviderCalls: 0, independentFactionAccepted: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'zerg-card-economy-readiness.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualSourceFindings: audit.findings.length,
  proposedCorrectionHash: proposal.hash, newProviderCalls: 0, productionApplied: false, hash: report.hash }));
