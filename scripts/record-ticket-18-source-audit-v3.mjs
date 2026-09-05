import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createExternalClaimFinding, recordExternalClaimFinding } from '../packages/skill-production-v3/external-findings.mjs';
import { seal, hash } from '../packages/skill-production/common.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'build/ticket-18-production-v3');
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue), reader = createEvidenceReader(catalogue);
const ref = (ref, spanId = 'p1') => ({ ref, spanId });
const cases = [
  { packet: 2, claimId: 'claims.8', kind: 'unsupported_permission',
    reason: 'The statement generalizes ignoring Full Cover into Flying models being always visible and without cover. Core explicitly retains Direct Cover and Elevation Dead Zone for the other model. This also contradicts claims.2 and claims.14 in the same draft. State only the specific Full Cover exemption, preserving the other visibility tests.',
    evidence: [ref('core.cB7X7UfOMHh3Wxn79ASF.items.1.subItems.3'), ref('core.cB7X7UfOMHh3Wxn79ASF.items.1.subItems.5', 'p3')] },
  { packet: 2, claimId: 'claims.12', kind: 'invented_precedence',
    reason: 'The sources contain an actual wording conflict between any part of the base and Wholly Within. Neither citation grants the summary table priority over prose. The Skill must preserve the conflict and defer this unresolved edge case to bound Rules/referee handling, not invent a table-first precedence rule.',
    evidence: [ref('core.cB7X7UfOMHh3Wxn79ASF.items.1.subItems.2'), ref('core.cB7X7UfOMHh3Wxn79ASF.items.1.subItems.5', 'p2')] },
  { packet: 3, claimId: 'claims.4', kind: 'unsupported_permission',
    reason: 'Access Points permit elevation changes; FAQ09 additionally permits Coherency Links through them. Neither grants Line of Sight through them. Blocking Terrain expressly separates LoS and movement, and the footprint rule normally blocks openings unless agreed otherwise. Remove the unsupported LoS permission; distinguish movement, Coherency and visibility.',
    evidence: [ref('core.FuahgilWtc8nccVSp2Vv.items.0.subItems.0'), ref('faq-v1:09'),
      ref('core.FuahgilWtc8nccVSp2Vv.items.0.subItems.5'), ref('core.cB7X7UfOMHh3Wxn79ASF.items.1', 'p2')] },
  { packet: 3, claimId: 'claims.6', kind: 'omitted_conditions',
    reason: 'The assigned Army Slot source explains that the Faction Card supplies the initial slots and buying Tactical Cards with Vespene Gas unlocks additional slots. No claim in this packet preserves that decision-relevant mechanism; the summary covers only type, usage and waste. Include the source of initial and additional slots.',
    evidence: [ref('core.FuahgilWtc8nccVSp2Vv.items.0.subItems.3')] },
  { packet: 5, claimId: 'claims.2', kind: 'ambiguous_procedure',
    reason: 'The phrase any listed movement types has no list in this claim or elsewhere in the packet. Explicitly preserve Move, Deploy, Run, Charge, Disengage, Close Ranks and Special Ability moves. Identify the overlapping Token/model as the displaced object, distinguish it from the Leading Model, and name the Leading Model controlling player as the operator; otherwise the Chinese pronoun can imply placing a model in contact with itself.',
    evidence: [ref('core.FuahgilWtc8nccVSp2Vv.items.0.subItems.16')] },
];
const store = openProductionStore(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), {
  runId: 'source-audit-v3-' + hash({ cases, contextHash: context.hash }).slice(0, 20), recipeHash: hash({ cases, contextHash: context.hash }),
  maxCalls: 1, maxCostMicros: 1, maxTokens: 1 });
const findings = [];
for (const entry of cases) {
  const candidate = JSON.parse(await readFile(path.join(out, 'rules-v3-1dc2feb6d351a65c83be', 'rules-reading-' + String(entry.packet).padStart(3, '0') + '.json'), 'utf8'));
  const finding = createExternalClaimFinding({ candidate, context, reader, ...entry });
  findings.push(recordExternalClaimFinding(store, finding));
}
store.close();
const report = seal({ sourceAuditPerformed: true, catalogueHash: catalogue.hash, contextHash: context.hash,
  findings, blockedPacketIds: [...new Set(findings.map(f => f.packetId))],
  previousSemanticReviewsPreserved: true, providerCalls: 0, formalSkillsAccepted: 0, trainingTruth: false });
await writeFile(path.join(out, 'external-source-audit.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ recorded: findings.length, blockedPackets: report.blockedPacketIds, providerCalls: 0, hash: report.hash }));
