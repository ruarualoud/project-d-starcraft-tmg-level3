import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';

// Read-only source adjudication of actual paid prose. Never modifies a running
// producer, its verdicts, candidate, accepted count or frozen official inputs.
const base = 'build/ticket-18-faction-production-v1/', runId = 'faction-v1-9200d037cfa6a1c4a388';
const input = verifySeal(JSON.parse(await readFile(base + runId + '/zerg_swarm-input.json', 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let section;
try {
  const row = db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, 'faction.zerg_swarm.army_resources.1.result');
  section = verifySeal(verifySeal(JSON.parse(row.artifact)).value);
} finally { db.close(); }
const source = ref => {
  const row = input.frozenSources.prompt.sources.find(s => s.ref === ref);
  assert.ok(row, ref); return { ref, hash: hash(row), passages: row.passages };
};
const purchase = source('core.u3zNStKpd5XegMjmJfMS.items.3');
const resources = source('core.H3Fn8YSvEvpJZpT57qw1.items.5.subItems.0');
const cardState = source('core.H3Fn8YSvEvpJZpT57qw1.items.5.subItems.1');
const faction = source('source:tactical_cards:zerg_swarm');
const text = s => s.passages.map(p => p.text).join('\n');
assert.ok(text(purchase).includes('Tactical Cards are purchased with Vespene Gas during Army Building (Part 9.1.4).'));
assert.ok(text(resources).includes('Resources generated to activate one ability can not be saved or spent on another ability.'));
assert.ok(text(cardState).includes('the player Exhausts it to use a Active or Reaction Special Ability printed directly on the card'));
assert.ok(text(cardState).includes('until it is Refreshed'));
const record = JSON.parse(text(faction));
assert.equal(record.resource, 1);
assert.equal(record.boosts.find(b => b.name === 'Rapid Burrowing').description,
  'Rapid Burrowing <Active> <Movement Phase>: Select one Friendly, Unengaged Ground Zerg Unit on the battlefield. That Unit gains the Burrowed Status, even if it has already been Activated this Round.');
assert.equal(record.boosts.find(b => b.name === 'Brood Instinct').description,
  'Brood Instinct <Reaction> <Any Phase>: Use before a Friendly Unit makes an Evade Roll. Apply a +1 Modifier to that roll.');
const recommendations = section.draft.recommendations;
const findings = [];
const add = (id, index, path, marker, sources, reason, correctionScope) => {
  const [field, ordinal] = path.split('.');
  const observed = ordinal === undefined ? recommendations[index][field] : recommendations[index][field][Number(ordinal)];
  assert.equal(typeof observed, 'string'); assert.ok(observed.includes(marker), path);
  findings.push({ id, index, path, recommendationHash: hash(recommendations[index]), text: observed, textHash: hash(observed),
    sourceRefs: sources.map(s => s.ref), reason, correctionScope, sourceBackedCounterexample: true });
};
for (const index of [0, 3]) add('pregame-purchase-not-round-supply-action', index, 'reviseIf.0', '推迟Hydralisk Den购买', [purchase],
  '当前建议将第1回合补给/部署与推迟购买战术卡相连；卡牌购买属于战前Army Building，不能在这一局随回合补给增长补购。',
  '区分战前改军表与局内延后已编入单位的部署；保留具体任务和可用补给的条件。');
add('printed-card-ability-not-portable-bm-cost', 1, 'when.0', 'Rapid Burrowing 1 BM、Brood Instinct 1 BM', [faction, cardState, resources],
  '这两项印在Zerg Swarm阵营卡上，使用它们耗尽该卡；resource=1是改为支付别处能力时产生的BM，不是这两项可由任意Ready卡支付的1 BM费用。',
  '将阵营卡自身Ready/Exhausted选择与单位卡列明Cost的资源支付分开；不要把机会成本改写为官方Cost。');
for (const [path, marker] of [['when.0', 'Rapid Burrowing 的 1 BM'], ['when.1', 'Brood Instinct 的 1 BM'], ['risk', 'Brood Instinct']])
  add('printed-card-ability-not-portable-bm-cost', 4, path, marker, [faction, cardState, resources],
    '阵营卡已经Exhausted时，耗尽另一张卡产生BM不能恢复或代替该阵营卡使用Brood Instinct；必须保留该卡Ready或等待适用Refresh。',
    '保留其他Ready卡支付真正列明BM Cost的能力这一规则，删除将其用于已耗尽阵营卡自身能力的推论。');
add('no-biomass-prestock-across-abilities', 1, 'alternatives.0', '为多次单位能力支付做准备', [resources],
  '耗尽产生的资源用于当前一次能力支付，剩余不能存储或用于另一次能力；不能预先耗尽多张卡为多次未来支付备存BM。',
  '应规划并保留Ready卡，在各次能力实际支付时分别耗尽，不预存跨能力资源。');
assert.equal(findings.length, 7);
const report = seal({ version: 'zerg_resource_source_debt_inspection_v1', passed: true, runId, sectionHash: section.hash,
  inputHash: input.hash, draftHash: hash(section.draft), sourceEvidence: [purchase, resources, cardState, faction], findings,
  sourceWorkflowCompletionUnchanged: true, independentSemanticQualification: false,
  sourceReviewModelAgreementNotAuthority: true, producerMutated: false, officialSourceRefresh: false,
  providerCalls: 0, trainingTruth: false, codeHash: sha256(await readFile(import.meta.filename)) });
await writeFile(base + 'zerg-resource-source-debt-inspection.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, findings: findings.length, categories: new Set(findings.map(f => f.id)).size,
  providerCalls: 0, producerMutated: false, hash: report.hash }));
