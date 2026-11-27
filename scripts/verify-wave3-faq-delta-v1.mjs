import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { parseOfficialFaqDocumentV1, compileOfficialFaqVersionDeltaV1,
  alignOfficialFaqQuestionsV1, officialFaqTextHashV1 } from '../packages/source-data/official-faq-version-delta-v1.mjs';
import { parseOfficialFaqV1SemanticIndexV1, OFFICIAL_FAQ_V1_PDF_HASH,
  OFFICIAL_FAQ_V1_RAW_TEXT_HASH, OFFICIAL_FAQ_V1_SEMANTIC_INDEX_HASH } from '../packages/source-data/official-faq-v1-source-lock-v1.mjs';
import { OFFICIAL_FAQ_F3_ATOM_BINDING_V1 } from '../content/official-faq-f3-movement-battlefield-deployment-binding-v1.mjs';
import { OFFICIAL_FAQ_F4_ATOM_BINDING_V1 } from '../content/official-faq-f4-ability-tactical-keyword-binding-v1.mjs';
import { OFFICIAL_FAQ_F5_ATOM_BINDING_V1 } from '../content/official-faq-f5-attack-scoring-template-binding-v1.mjs';
import { OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1 } from '../content/official-faq-v1-rule-reconciliation-binding-v1.mjs';
import { evaluateOfficialFaqF4RuleV1 } from '../packages/rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs';
import { WAVE3_FAQ_REVIEW_V1 } from '../content/source-releases/wave3-20261112-faq-review-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(root, '../..');
const oldDirectory = path.join(sourceRoot, 'build/source-intake/official-rules/faq-v1-2026-09-03');
const directory = path.join(root, 'build/ticket-28-wave3-faq-delta-20261112-v1');
const ledgerRef = 'content/source-releases/wave3-20261112-faq-delta-v1.json';
const worklistRef = 'coordination/wave3/faq-implementation-worklist.json';
const read = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));
const save = async (name, value) => {
  const target = path.join(directory, name);
  await atomicWrite(target, JSON.stringify(value, null, 2) + '\n');
  return target;
};
const previousAtoms = [...OFFICIAL_FAQ_F3_ATOM_BINDING_V1, ...OFFICIAL_FAQ_F4_ATOM_BINDING_V1,
  ...OFFICIAL_FAQ_F5_ATOM_BINDING_V1];
async function inputs() {
  const previousRaw = await fs.readFile(path.join(oldDirectory, 'StarCraft-TMG-FAQ_EN.raw.txt'), 'utf8');
  const currentRaw = await fs.readFile(path.join(directory, 'faq-v1.3.raw.txt'), 'utf8');
  return { previous: parseOfficialFaqDocumentV1({ rawText: previousRaw, version: '1' }),
    current: parseOfficialFaqDocumentV1({ rawText: currentRaw, version: '1.3' }),
    previousRaw, currentRaw, review: WAVE3_FAQ_REVIEW_V1, previousAtoms,
    previousReconciliation: OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1,
    featureRegistry: await read('content/source-releases/wave3-20261112-feature-registry-v2.json'),
    consumers: await read('coordination/wave3/faq-consumers.json'),
    sourceBinding: await read(path.relative(root, path.join(directory, 'sources.json'))) };
}
const check = await runProductBoundaryCheck({
  directory: path.join(directory, 'verification'),
  identity: { factoryModule: 'packages/source-data/official-faq-version-delta-v1.mjs',
    factoryExport: 'compileOfficialFaqVersionDeltaV1',
    sourceRef: 'content/source-releases/wave3-20261112-faq-review-v1.mjs', contractVersion: 'T28-W3-04-faq-source-ledger-v1' },
  steps: [
    { name: 'read', repairRef: 'T28-W3-04-explicit-legacy-page-decoration-bridge', openProduct: async () => ({
      previousPdf: await fs.readFile(path.join(oldDirectory, 'StarCraft-TMG-FAQ_EN.pdf')),
      previousRaw: await fs.readFile(path.join(oldDirectory, 'StarCraft-TMG-FAQ_EN.raw.txt'), 'utf8'),
      currentPdf: await fs.readFile(path.join(root, 'build/ticket-28-wave3-assessment-20261112/faq-v1.3.pdf')),
      currentRaw: await fs.readFile(path.join(directory, 'faq-v1.3.raw.txt'), 'utf8'),
    }), check: async source => {
      assert.equal(officialFaqTextHashV1(source.previousPdf), OFFICIAL_FAQ_V1_PDF_HASH);
      assert.equal(source.previousPdf.length, 333711);
      assert.equal(officialFaqTextHashV1(source.previousRaw), OFFICIAL_FAQ_V1_RAW_TEXT_HASH);
      assert.equal(officialFaqTextHashV1(source.currentPdf), WAVE3_FAQ_REVIEW_V1.currentPdfHash);
      assert.equal(source.currentPdf.length, 936781);
      const previous = parseOfficialFaqDocumentV1({ rawText: source.previousRaw, version: '1' });
      const oldIndex = parseOfficialFaqV1SemanticIndexV1(source.previousRaw);
      assert.equal(hash(oldIndex), OFFICIAL_FAQ_V1_SEMANTIC_INDEX_HASH);
      for (const entry of previous.entries) {
        const frozen = oldIndex.find(row => row.entryId === entry.entryId);
        assert.equal(entry.questionHash, frozen.questionHash, entry.entryId + ':question');
        assert.equal(entry.section, frozen.section, entry.entryId + ':section');
        const noise = WAVE3_FAQ_REVIEW_V1.legacyExtractionNoise.find(row => row.entryId === entry.entryId);
        const indexedAnswer = !noise ? entry.answer : noise.placement === 'suffix'
          ? entry.answer + ' ' + noise.decoration
          : entry.answer.replace(noise.beforeText, noise.decoration + ' ' + noise.beforeText);
        assert.equal(officialFaqTextHashV1(indexedAnswer), frozen.answerHash, entry.entryId + ':answer');
      }
      const current = parseOfficialFaqDocumentV1({ rawText: source.currentRaw, version: '1.3' });
      assert.equal(previous.entries.length, 68);
      assert.equal(current.entries.length, 98);
      const lock = await read('content/official-development-tranche-s75-111-source-lock-v1.json');
      const intake = await read('build/ticket-28-wave3-source-candidate-20261112-v1/source-index.json');
      const currentCore = intake.entries.find(row => row.sourceId === 'core_rulebook');
      assert.ok(currentCore, 'core source entry');
      assert.equal(currentCore.byteHash, lock.binaries.core_rulebook.byteHash);
      assert.equal(currentCore.byteLength, lock.binaries.core_rulebook.byteLength);
      const visualEvidence = [];
      for (const visual of WAVE3_FAQ_REVIEW_V1.visualPages) {
        const filename = `page-${visual.page}.png`;
        const imageBytes = await fs.readFile(path.join(directory, filename));
        assert.equal(imageBytes.subarray(1, 4).toString(), 'PNG');
        visualEvidence.push({ ...visual, image: filename, imageHash: officialFaqTextHashV1(imageBytes),
          reviewMethod: 'assistant_visual_page_inspection', renderDpi: 110 });
      }
      const sourceBinding = {
        previous: { version: '1.0', pdfPath: path.relative(root, path.join(oldDirectory, 'StarCraft-TMG-FAQ_EN.pdf')),
          byteHash: OFFICIAL_FAQ_V1_PDF_HASH, rawTextHash: OFFICIAL_FAQ_V1_RAW_TEXT_HASH },
        current: { version: '1.3', pdfPath: 'build/ticket-28-wave3-assessment-20261112/faq-v1.3.pdf',
          byteHash: WAVE3_FAQ_REVIEW_V1.currentPdfHash, rawTextHash: officialFaqTextHashV1(source.currentRaw), printedDate: '11.11.2026' },
        core: { previousHash: lock.binaries.core_rulebook.byteHash, currentHash: currentCore.byteHash,
          byteLength: currentCore.byteLength, bytesUnchanged: true,
          reusedEvidenceRef: 'build/ticket-28-wave3-source-candidate-20261112-v1/source-index.json' },
        visualEvidence,
        legacyExtractionNoise: WAVE3_FAQ_REVIEW_V1.legacyExtractionNoise,
      };
      await save('sources.json', sourceBinding);
      await save('previous-index.json', previous);
      await save('current-index.json', current);
      const evidenceRef = await save('read.json', { oldEntries: 68, newEntries: 98,
        previousIdentitiesAndExplicitDecorationBridgesVerified: true, sourceBinding });
      return { evidenceRef, checkpointRef: path.join(directory, 'sources.json') };
    } },
    { name: 'compile', openProduct: inputs, check: async input => {
      const ledger = compileOfficialFaqVersionDeltaV1(input);
      assert.deepEqual(ledger.summary, { previousEntries: 68, currentEntries: 98,
        retainedQuestions: 65, revisedQuestions: 3, addedQuestions: 30, removedQuestions: 0,
        existingFaqAtoms: 137, retainedFaqAtoms: 134, revisedFaqAtoms: 3,
        proposedAdditionalAtoms: 13, newRuntimeAtomsImplementedByThisItem: 0 });
      assert.deepEqual(ledger.rows.filter(row => row.disposition === 'revised').map(row => row.currentEntryId),
        ['faq-v1.3:55', 'faq-v1.3:56', 'faq-v1.3:58']);
      assert.equal(new Set(ledger.previousEntryMap.map(row => row.currentEntryId)).size, 68);
      const teleport = ledger.rows.find(row => row.currentEntryId === 'faq-v1.3:58');
      assert.equal(teleport.previousEntryId, 'faq-v1:52');
      assert.ok(teleport.rawAnswer.includes('No.'));
      assert.ok(!teleport.effectiveAnswer.includes('No.'));
      assert.ok(teleport.effectiveAnswer.startsWith('Yes, but the Mission Marker must be dropped first.'));
      assert.ok(ledger.rows.find(row => row.currentEntryId === 'faq-v1.3:23').existingAtomIds
        .includes('rule-atom:singleton:core-7-1-3-high-ground-evade:0711eafb82c1'));
      const record = { ...ledger, ledgerHash: hash(ledger) };
      await atomicWrite(path.join(root, ledgerRef), JSON.stringify(record, null, 2) + '\n');
      const evidenceRef = await save('compile.json', { summary: record.summary, ledgerHash: record.ledgerHash,
        ledgerRef, sourceScopeQuestions: record.sourceScopeQuestions,
        proposedAtomsAreNotExecutables: true });
      return { evidenceRef, checkpointRef: ledgerRef };
    } },
    { name: 'consume', openProduct: inputs, check: async input => {
      // Concrete omissions must fail before this ledger is used to plan implementation.
      const omitted = structuredClone(input.review);
      omitted.impacts = omitted.impacts.filter(row => row.current !== 70);
      assert.throws(() => compileOfficialFaqVersionDeltaV1({ ...input, review: omitted }), /FAQ_IMPACT_REQUIRED/);
      const wrongSource = structuredClone(input.sourceBinding);
      wrongSource.current.byteHash = '0'.repeat(64);
      assert.throws(() => compileOfficialFaqVersionDeltaV1({ ...input, sourceBinding: wrongSource }), /FAQ_REVIEW_SOURCE_MISMATCH/);
      assert.throws(() => alignOfficialFaqQuestionsV1({ previous: input.previous, current: input.current,
        reviewedMatches: [...input.review.reviewedMatches, { currentEntryId: 'faq-v1.3:59', previousEntryId: 'faq-v1:52' }] }),
      /FAQ_PREVIOUS_ENTRY_REUSED/);
      assert.throws(() => parseOfficialFaqDocumentV1({ rawText: 'Units & Characteristics\nQ: Missing answer', version: 'fixture' }),
        /FAQ_DOCUMENT_INCOMPLETE_ENTRY/);
      const refs = [...Object.values(input.consumers.shared), ...Object.values(input.consumers.families).flatMap(row => row.rules)];
      for (const ref of refs) {
        const code = await fs.readFile(path.join(root, ref.path), 'utf8');
        if (ref.export) assert.match(code, new RegExp(`export\\s+(?:async\\s+)?function\\s+${ref.export}\\b`), ref.path);
      }
      const explicitIds = [...new Set(input.review.impacts.flatMap(row => row.reuseAtoms || []))];
      const atomFiles = ['official-standard-move-executor-v1.mjs', 'official-elevation-effective-size-rules-executor-v1.mjs',
        'official-close-combat-attack-executor-v7.mjs', 'official-dodge-resolution-kernel-v1.mjs',
        'official-movement-hold-executor-v1.mjs', 'official-activation-pass-executor-v1.mjs',
        'official-impact-executor-v1.mjs', 'official-attack-pool-edge-executor-v1.mjs', 'official-template-weapon-executor-v1.mjs'];
      const atomSources = await Promise.all(atomFiles.map(name => fs.readFile(path.join(root, 'packages/rule-atoms', name), 'utf8')));
      for (const id of explicitIds) assert.ok(atomSources.some(code => code.includes(JSON.stringify(id))), id);
      const legacyObservations = [
        evaluateOfficialFaqF4RuleV1('faq-v1:49', { timing: 'outside_activation', usesForTrigger: 0, simultaneous: false, seatIsFirstPlayer: true }),
        evaluateOfficialFaqF4RuleV1('faq-v1:50', { targetType: 'structure', effectTargetScope: 'unit', explicitlyExcludesStructure: false }),
        evaluateOfficialFaqF4RuleV1('faq-v1:52', { unitIsAdept: true, carryingClaimedArtefact: true, usesPsionicTransfer: true }),
      ];
      assert.deepEqual(legacyObservations.map(row => row.legal), [true, true, false]);
      const evidenceRef = await save('consume.json', { missingReviewRejected: true, wrongSourceRejected: true,
        duplicatePreviousMatchRejected: true, incompleteEntryRejected: true,
        codeReferenceCount: refs.length, explicitExistingAtomsVerified: explicitIds,
        legacyObservations, runtimeModified: false });
      return { evidenceRef, checkpointRef: evidenceRef };
    } },
    { name: 'successor', openProduct: async () => ({ ledger: await read(ledgerRef) }), check: async ({ ledger }) => {
      const changed = ledger.rows.filter(row => row.impact);
      const owners = [...new Set(changed.flatMap(row => row.impact.consumers.owners))].sort();
      const worklist = { schema: 'starcraft_tmg_wave3_faq_implementation_worklist_v1',
        fromLedgerRef: ledgerRef, fromLedgerHash: ledger.ledgerHash,
        scope: '04交给05及能力包的实施计划，所有产品验证尚待执行',
        owners: owners.map(itemId => ({ itemId, currentEntryIds: changed
          .filter(row => row.impact.consumers.owners.includes(itemId)).map(row => row.currentEntryId) })),
        revisions: WAVE3_FAQ_REVIEW_V1.revisions, proposedAtoms: ledger.proposedAtoms,
        cases: changed.map(row => ({ entryId: row.currentEntryId, title: row.impact.title,
          action: row.impact.action, existingAtomIds: row.existingAtomIds, featureRefs: row.featureRefs,
          proposedAtomIds: row.proposedAtomIds, revision: row.revision,
          reads: row.impact.reads, writes: row.impact.writes, expected: row.impact.decision,
          witness: row.impact.witness, consumers: row.impact.consumers, validationStatus: 'not_run' })),
        sourceScopeQuestions: ledger.sourceScopeQuestions,
        retainedDependencyCases: ledger.dependentRetainedEntries,
        requiredOrder: ['05冻结三项改写的新版本合同', '05通用判定与源条件', '06几何及token高度',
          '07～10能力声明/执行/恢复', '11任务与开始阶段', '12统一Query/Plan/Teach/在线/复盘消费者'],
        sourceRoles: '模型选择语义和策略；Host绑定身份/位置/次数；Rules返回事实；本表的字段是语义要求，实施时对齐实际Native字段',
        trainingTruth: false };
      assert.equal(worklist.cases.length, 33);
      await atomicWrite(path.join(root, worklistRef), JSON.stringify(worklist, null, 2) + '\n');
      const lines = ['# Wave3 FAQ逐问台账', '', '来源为冻结FAQ v1.0与v1.3。原子计划尚待05及后续执行接线。', '',
        '| 新版 | 原页 | 旧版 | 差分 | 说明 |', '|---|---|---|---|---|'];
      for (const row of ledger.rows) lines.push(`| ${row.currentEntryId} | ${row.page} | ${row.previousEntryId || '新增'} | ${row.disposition} | ${(row.impact?.title || '问答保持，复用原绑定').replaceAll('|', '/')} |`);
      lines.push('', '## 三项改写', '');
      for (const row of ledger.rows.filter(row => row.disposition === 'revised')) lines.push(
        `### ${row.currentEntryId} ${row.impact.title}`, '', `旧答复为 ${row.previousAnswer}`, '',
        `新版有效答复为 ${row.effectiveAnswer}`, '', row.impact.decision, '', `验证场景为 ${row.impact.witness}`, '');
      lines.push('## 新增和改写的执行清单', '');
      for (const row of changed) lines.push(`### ${row.currentEntryId} ${row.impact.title}`, '',
        row.impact.decision, '', `验证场景为 ${row.impact.witness}`, '',
        `归属 ${row.impact.consumers.owners.join('、')}。原子处置为 ${row.impact.action}。`, '');
      await atomicWrite(path.join(directory, 'LEDGER.zh-CN.md'), lines.join('\n') + '\n');
      const evidenceRef = await save('successor.json', { worklistRef, cases: worklist.cases.length,
        owners, successor: 'T28-W3-05 engineering implementation, no model dispatch' });
      return { evidenceRef, checkpointRef: worklistRef };
    } },
    { name: 'coldRecovery', openProduct: async () => ({ ledger: await read(ledgerRef), worklist: await read(worklistRef) }),
      check: async ({ ledger, worklist }) => {
        const { ledgerHash, ...body } = ledger;
        assert.equal(hash(body), ledgerHash);
        assert.equal(worklist.fromLedgerHash, ledgerHash);
        assert.equal(ledger.rows.length, 98);
        assert.equal(ledger.previousEntryMap.length, 68);
        for (const row of worklist.cases) assert.ok(ledger.rows.some(entry => entry.currentEntryId === row.entryId && entry.impact));
        const rebuilt = compileOfficialFaqVersionDeltaV1(await inputs());
        assert.deepEqual(rebuilt, body);
        const evidenceRef = await save('cold.json', { immutableSourceAndLedgerMatch: true, worklistBindingMatch: true,
          rebuiltLedgerByteEquivalent: true, oldEntriesAccounted: 68, currentEntriesAccounted: 98,
          modelCalls: 0, nativeGameActions: 0, productionPromotion: false });
        return { evidenceRef, checkpointRef: evidenceRef };
      } },
  ],
});
console.log(JSON.stringify({ status: check.status, passed: Object.keys(check.passed), failures: check.failures }));
