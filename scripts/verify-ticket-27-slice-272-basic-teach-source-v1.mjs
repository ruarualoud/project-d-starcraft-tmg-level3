import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { buildRosterFinalPlanVerifiedFactsV1 }
  from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg('input'), 'utf8'));
const original = JSON.stringify(raw);
let report;
try {
  const facts = buildRosterFinalPlanVerifiedFactsV1({ plan: JSON.parse(raw.planSerialized),
    toolReceipts: raw.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput) }).sourceFacts;
  assert(facts.missionMarkerScoringByActor, 'basic Teach D must receive the same two-actor scoring source');
  const pair = facts.missionMarkerScoringByActor.markers.filter(m => [2, 4].includes(m.number));
  assert.equal(pair.reduce((n, m) => n + m.vpByScoringActor.player2, 0), 2);
  assert.equal(pair.reduce((n, m) => n + m.vpByScoringActor.player1, 0), 4);
  assert.equal(JSON.stringify(raw), original);
  report = { ok: true, basicTeachTwoActorSourcePresent: true, providerCalls: 0, originalWrites: 0 };
  console.log('BASIC_TEACH_SOURCE_OK');
} catch (error) { report = { ok: false, failure: error.message }; throw error; }
finally { await writeFile(arg('report'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
