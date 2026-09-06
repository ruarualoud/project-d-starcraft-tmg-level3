import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { produceFactionStrategyV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { inspectFactionRegisteredSourceDebtV2 } from '../packages/skill-production-v3/faction-source-field-repair-v2.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const [input, knownRulePolicy, sourceSection, candidate, evidence] = await Promise.all([
  json('terran_armed_forces-input'), json('terran_armed_forces-known-rule-policy'),
  json('field-repair-d393a7c3884ae5104f96/source-section'), json('field-repair-d393a7c3884ae5104f96/candidate'),
  json('field-repair-d393a7c3884ae5104f96/verified-evidence')]);
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let actualRoles;
try { actualRoles = new Map(db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete'")
  .all('faction-v1-907961cf3b449dd64c64').map(r => [r.id, verifySeal(JSON.parse(r.artifact)).value])); }
finally { db.close(); }
const temp = await mkdtemp(path.join(base, 'source-field-workflow-v2-'));
const sectionId = 'faction.terran_armed_forces.unit_roles.1';
const replacements = ['对空保留Hellfire；Haywire仅打Ground，不用于对Flying目标的替换。',
  'Orders只能作用于8英寸内另一友方Biological单位；Goliath非Biological，不可选择。',
  'Restoration与Life Support是不同具名反应，各自每轮一次；同一激活每玩家仍只能结算一个反应。'];
let allFreshCalls = 0;
async function run(negative) {
  const store = openProductionStore(path.join(temp, negative ? 'negative.sqlite' : 'positive.sqlite'),
    { runId: 'unit-fields-' + negative, recipeHash: hash({ negative }) });
  let repairs = 0, freshReviews = 0, completed = null, repairedHash = null;
  const runtime = { async role(request) {
    const id = request.packet.id + '.' + request.roleId;
    if (request.roleId.startsWith(sectionId + '.registered-source-fields-v2.')) {
      repairs++; assert.equal(request.workspace.draft.recommendations.length, 7);
      assert.equal(request.workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
      return seal({ roleId: id, fixtureOnly: true, output: { replacements: request.workspace.editTargetsAtEnd.map((t, n) =>
        ({ targetId: t.targetId, text: t.findings.map(f => f.reason).join(' ') })) } });
    }
    if (request.roleId.startsWith(sectionId + '.review-target-batch-v1.') && request.roleId.includes('.1.')) {
      // The section's suffix itself contains .1.; route/revision is explicit.
      const suffix = request.roleId.slice((sectionId + '.review-target-batch-v1.').length);
      if (/^(supportive|adversarial)\.2\./.test(suffix)) {
        freshReviews++; allFreshCalls++; repairedHash = hash(request.workspace.draft);
        assert.equal(inspectFactionRegisteredSourceDebtV2({ input, draft: request.workspace.draft }).findings.length, 0);
        const targets = request.workspace.outputRequestAtEnd.targetContract.targets;
        return seal({ roleId: id, fixtureOnly: true, output: { verdicts: targets.map(t => ({ targetId: t.targetId, title: t.title,
          focus: [{ path: t.fields[0].path, quote: t.fields[0].text.slice(0, 120) }],
          verdict: negative && t.index === 5 ? 'unsupported' : 'supported', reason: 'Injected complete corrected section review, not a real judgment.',
          sourceRefs: t.recommendation.sourceRefs.slice(0, 1) })), coverage: request.workspace.coverageRequiredSourceRefs.map(sourceRef =>
          ({ sourceRef, verdict: 'covered', recommendationIndices: request.workspace.draft.recommendations.flatMap((r, n) => r.sourceRefs.includes(sourceRef) ? [n] : []),
            reason: 'Injected coverage only.' })) } });
      }
    }
    if (request.roleId.startsWith(sectionId + '.editor.2.')) fail('INJECTED_UNIT_FRESH_NEGATIVE_RETAINED');
    const saved = actualRoles.get(id); assert(saved?.roleId === id, id); return saved;
  } };
  try {
    await assert.rejects(produceFactionStrategyV1({ input, knownRulePolicy, registeredSourceFieldRepair: true, fieldRepairSeed: { sourceSection, candidate, evidence }, runtime, store,
      onProgress(row) { if (row.stage === 'section_complete' && row.section === sectionId) { completed = row; fail('INJECTED_UNIT_SECTION_CAPTURED'); } } }),
    { code: negative ? 'INJECTED_UNIT_FRESH_NEGATIVE_RETAINED' : 'INJECTED_UNIT_SECTION_CAPTURED' });
    assert.equal(repairs, 2); assert.equal(freshReviews, 8);
    const result = store.artifact(sectionId + '.result');
    if (negative) { assert.equal(completed, null); assert.equal(result, null); }
    else {
      assert(completed.passed); assert.equal(result.rounds.length, 3); assert.equal(hash(result.draft), repairedHash);
      assert.equal(result.edits.length, 2); assert.equal(result.edits[1].patch.changes.length, 4);
      assert.equal(result.edits[1].sourceReviewPassed, false); assert.equal(result.rounds.at(-1).draftHash, repairedHash);
      assert.equal(result.runtimeAccepted, false);
    }
  } finally { store.close(); }
}
await run(false); await run(true);
const files = ['packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/faction-unit-role-field-repair-v1.mjs',
  'packages/skill-evaluation/faction-unit-role-debt-v1.mjs', 'packages/skill-evaluation/faction-cross-field-source-audit-v1.mjs', 'packages/skill-production-v3/faction-source-field-repair-v2.mjs', 'scripts/verify-ticket-18-faction-source-repair-workflow-v2.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, checks: 8, codeHashes, inputHash: input.hash, knownCounterexamples: 4,
  repairsIntegrated: true, freshWholeSectionReviews: allFreshCalls, freshNegativeRetained: true,
  actualProviderCalls: 0, actualModelRepairPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'source-repair-workflow-v2-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 8, injectedFreshReviews: allFreshCalls, providerCalls: 0, hash: report.hash }));
