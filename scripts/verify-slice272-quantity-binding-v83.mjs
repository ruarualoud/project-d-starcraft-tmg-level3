// Reproduce the saved B13 false subtotal contradiction and A6 missing timing facts.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { buildRosterReviewFactPacketV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { rosterReviewPremiseIssuesV1 } from '../packages/roster-strategist/roster-review-premises-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base = process.argv[2];
const config = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const failures = [], evidence = [];
function check(name, fn) { try { fn(); evidence.push({name, passed:true}); } catch (e) { failures.push({name,error:e.message}); } }
for (const row of config.rows) {
  const filename = row.dataDirectory + '/drafts/' + row.sessionId + '.json';
  const bytes = await fs.readFile(filename, 'utf8'), d = JSON.parse(bytes);
  const plan = row.arm === 'B' ? d.planVersionHistory.map(JSON.parse).find(p => p.planVersion === 13) : JSON.parse(d.planSerialized);
  const packet = buildRosterReviewFactPacketV1({plan, toolReceipts:d.toolReceipts,
    selectedCandidateInputHash:hash(d.selectedCandidateInput),
    selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules,
    selectionJustificationPolicyVersion:d.agentSelectedStrategySource?.selectionJustificationPolicyVersion,
    armyAudit:d.working.verdict.audit});
  const facts = packet.premiseFacts;
  if (row.arm === 'B') {
    const saved = structuredClone(d.publicOutputs.filter(o => o.roundKind === 'final_review_reconciliation').at(-1).sanitizedOutput);
    for (const j of saved.judgments) j.sourceEvidence = j.sourceEvidence.map(e => {
      const f = packet.evidenceCatalogue.find(f => f.evidenceId === e.evidenceId);
      assert(f,'saved evidence ID resolves to the same exact source');
      return {sourcePath:f.sourcePath,sourceQuote:f.text};
    });
    const review = d.planReviewHistory.findLast(r => r.review?.planHash === plan.planHash).review;
    const j = saved.judgments[0], target = {...review.findings[j.findingIndex],findingIndex:j.findingIndex,
      claimText:plan.scoreRoute.routeText};
    const issues = rosterReviewPremiseIssuesV1({output:saved,targets:[target],facts});
    check('saved subtotal contradiction is a reviewer error, not Plan correction', () =>
      assert(issues.some(i => i.code === 'SCORING_QUANTITY_REQUIRED')));
    const quantity = {kind:'marker_total',scoringActorId:'player1',markerNumbers:[1,3,5],
      opposingActorId:'',opposingMarkerNumbers:[]};
    const correct = {...j,claimAssessment:'source_supported',factChecks:[{factId:'',claimedValue:'3',
      claimValueQuote:'3 VP per scoring round',calculation:{operation:'identity',factIds:[]},quantity}]};
    check('same saved claim is supported by the exact actor/control-set total', () =>
      assert.deepEqual(rosterReviewPremiseIssuesV1({output:{judgments:[correct]},targets:[target],facts}),[]));
    const wrong = structuredClone(correct); wrong.factChecks[0].quantity.markerNumbers = [1,3];
    check('wrong controlled set does not support the same total', () =>
      assert(rosterReviewPremiseIssuesV1({output:{judgments:[wrong]},targets:[target],facts}).length));
    const badTotal = structuredClone(correct);badTotal.factChecks[0].claimedValue='4';badTotal.factChecks[0].claimValueQuote='4 VP per scoring round';
    const wrongTarget = {...target,claimQuote:target.claimQuote.replace('3 VP per scoring round','4 VP per scoring round')};
    check('genuine incorrect total is still rejected', () =>
      assert(rosterReviewPremiseIssuesV1({output:{judgments:[badTotal]},targets:[wrongTarget],facts}).length));
    correct.factChecks[0].quantity.scoringActorId='missing-player';
    check('unknown actor is unknown, not zero', () =>
      assert(rosterReviewPremiseIssuesV1({output:{judgments:[correct]},targets:[target],facts}).length));
  } else {
    check('existing roster arrival numbers are delivered, not fabricated', () => {
      assert.equal(facts.numbers.find(f => f.factId === 'rosterUnits.2.firstArrivalRound')?.value,4);
      assert.equal(facts.numbers.find(f => f.factId === 'rosterUnits.6.firstArrivalRound')?.value,5);
    });
    const q = {kind:'marker_margin',scoringActorId:'player1',markerNumbers:[1,3,5],
      opposingActorId:'player2',opposingMarkerNumbers:[2,4]};
    const target={findingIndex:0,category:'scoring',claimQuote:'a +1 VP/round edge for me',claimText:'a +1 VP/round edge for me'};
    const j={findingIndex:0,claimAssessment:'source_supported',evidenceScope:'settled_fact',sourceEvidence:[],
      factChecks:[{factId:'',claimedValue:'1',claimValueQuote:'a +1 VP/round edge for me',
        calculation:{operation:'identity',factIds:[]},quantity:q}]};
    check('source computes sum-minus-sum without ambiguous three-operand difference', () =>
      assert.deepEqual(rosterReviewPremiseIssuesV1({output:{judgments:[j]},targets:[target],facts}),[]));
    j.factChecks[0].quantity={...q,kind:'marker_per_marker',scoringActorId:'player2',markerNumbers:[2,4],
      opposingActorId:'',opposingMarkerNumbers:[]};
    j.factChecks[0].claimValueQuote='worth 1 VP each';target.claimQuote=target.claimText='worth 1 VP each';
    check('per-marker amount is not the group subtotal', () =>
      assert.deepEqual(rosterReviewPremiseIssuesV1({output:{judgments:[j]},targets:[target],facts}),[]));
    j.factChecks[0].quantity.markerNumbers=[1,2];
    check('heterogeneous per-marker values are not silently averaged', () =>
      assert(rosterReviewPremiseIssuesV1({output:{judgments:[j]},targets:[target],facts}).length));
  }
  assert.equal(await fs.readFile(filename,'utf8'),bytes,'original paid draft is immutable');
}
console.log(JSON.stringify({evidence,failures,providerCalls:0,roomActions:0,originalDraftsUnchanged:true},null,2));
assert.equal(failures.length,0);
