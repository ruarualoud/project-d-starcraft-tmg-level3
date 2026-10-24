import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {reviewRosterFinalPlanV3} from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const old=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[3]+'/call-321.product-request.json.gz')));
const reply=JSON.parse(zlib.gunzipSync(await fs.readFile(process.argv[3]+'/call-321.reply.json.gz'))).output;
const oldFacts=old.promptNodes.find(n=>n.kind==='verified-structured-facts').sourceFacts;
assert.equal(oldFacts.supplyValueContexts.poolSupply.replacesCurrentSupply,false);
assert(old.promptNodes[0].sources.some(s=>s.text.includes('should never be counted as marker supply')));
assert(!reply.findings.some(f=>f.severity==='high'));
let seen;
await assert.rejects(()=>reviewRosterFinalPlanV3({plan:JSON.parse(d.planSerialized),sessionId:d.sessionId,
  toolReceipts:d.toolReceipts,armyAudit:d.working.verdict.audit,
  selectionUnitRules:d.teachFramework.context.sourceFacts.selectionUnitRules,
  selectionSupportRules:d.teachFramework.context.sourceFacts.selectionSupportRules,
  selectionJustificationPolicyVersion:d.agentSelectedStrategySource.selectionJustificationPolicyVersion,
  selectedCandidateInputHash:d.teachFramework.context.selectedCandidateInputHash,
  teachState:d.teachFramework.state,adaptiveReview:true,
  deliberation:{deliberate:async request=>{seen=request;throw Error('CAPTURED_FACT_SCOPE_INPUT');}}}),
  /CAPTURED_FACT_SCOPE_INPUT/);
const scope=seen.promptNodes.find(n=>n.kind==='source-fact-scope-audit');
assert(scope,'Real321 missed a hard scope contradiction: the audit must explicitly distinguish factual contradictions from caution/style');
assert.equal(scope.rulesForSupplyContexts.poolSupply.replacesCurrentSupply,false);
assert.equal(scope.rulesForSupplyContexts.missionControl.inferFromPoolSupply,false);
assert.deepEqual(seen.promptNodes.find(n=>n.kind==='frozen-plan-claims').sources,
  old.promptNodes.find(n=>n.kind==='frozen-plan-claims').sources);
assert(scope.method.includes('marginal'));
assert(scope.method.includes('conditional'));
assert.notEqual(seen.contextHash,old.contextHash,'Changed audit input must not replay the known deficient review');
console.log(JSON.stringify({pass:true,actualBug:321,sourceAndClaimsPreserved:true,
  auditScopeExplicit:true,semanticDetectionStillNeedsLiveReply:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
