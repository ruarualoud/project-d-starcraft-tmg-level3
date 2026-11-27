import assert from 'node:assert/strict';
import path from 'node:path';
import {read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom, assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {createOfficialCurrentProductCasualtyDomainV1, resolveOfficialCurrentProductCasualtyDomainV1,
  applyOfficialSelectedRosterResolvedDamageV1} from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import {deriveOfficialEngagementGraphV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {refreshOfficialRoundSupplyOccupancyV1} from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import {hash} from '../packages/skill-production/common.mjs';
import {poolParameters} from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const original = base+'/raven-seeker-standard-v229/stationary';
const manifestRef = base+'/tabletop-raven-m01-v1/manifest.json';
const dir = 'build/ticket-28-wave3-dead-raven/stationary';
const sourceId = 'seeker-v229-stationary', roomId = 'wave3-dead-raven-stationary';
const expected = (await read(original+'/trace.json')).find(row=>row.revision===7);
const known = await read(original+'/impact.json');
let room, stage = 'recover original paid declaration', revision = 0;
try {
  const archive = openWave3EngineeringStoreV1({directory:path.resolve(original),filename:'room.sqlite',readOnly:true});
  let saved;
  try {saved=await archive.loadReplayBundle(sourceId);}finally{archive.close();}
  const baseline = saved.initialEnvelope.state;
  const old = await bindWave3StandardActionRoom({manifestRef, initial:baseline, dir:original,
    candidateVersion:'2.29.0', frozenRuntimeRef:original+'/runtime.json', scenario:{sourceId}});
  const reader = old.open({readOnly:true});
  let prior;
  try {
    await reader.restoreDependencies(sourceId,old.authority);
    const receipts=saved.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
    const replay=reader.engine.replay({initialEnvelope:saved.initialEnvelope,journal:receipts.slice(0,7)});
    assert(replay.ok,replay.reason); prior=replay.envelope;
    assert.equal(prior.stateHash,expected.stateHash);
  } finally {reader.close();}
  stage='condition source loss';
  const initial=structuredClone(prior.state),raven=initial.pieces.find(p=>p.id==='raven');
  const profile=resolveOfficialEffectiveCombatProfileV1(initial,raven);
  assert.equal(raven.currentModels,1);
  const scenario={sourceRoom:sourceId,sourceRevision:7,sourceStateHash:prior.stateHash,condition:'Raven removed after real payment, before impact; stationary target',trainingTruth:false};
  const loss=createOfficialCurrentProductCasualtyDomainV1({targetPiece:raven,targetProfile:profile,
    incomingDamage:profile.hitPoints+profile.shield,visibleModelIds:raven.models.map(model=>model.id),
    engagementGraph:deriveOfficialEngagementGraphV2(initial),attackResolutionHash:hash(scenario),
    rulesRuntimeHash:initial.officialMissionRuntimeDescriptor.runtimeHash});
  const selected=loss.legalSelections.find(selection=>selection.casualtyModelIds.length===1);
  assert(selected,'condition requires the one Raven model to be removed');
  applyOfficialSelectedRosterResolvedDamageV1(initial,raven,profile,resolveOfficialCurrentProductCasualtyDomainV1(loss,selected.selectionHash));
  initial.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state:initial,expectedRulesRuntimeHash:initial.supplyLossLedger.rulesRuntimeHash});
  assert(raven.isDestroyed && !raven.isOnField && raven.currentSupply===0);
  // This branch conditions the source loss. It does not invent an enemy attack or a kill credit.
  const bound=await bindWave3StandardActionRoom({manifestRef,initial,dir,candidateVersion:'2.29.0',scenario});
  room=bound.open();
  const seats=await room.create(roomId,bound.authority);
  const paid=bound.runtime.querySeekerImpact(initial,known.declaration.planHash).result;
  assert.deepEqual(paid.declaration,known.declaration);
  assert(paid.impact.stationary && paid.impact.qualifies && paid.impact.declarationOrPaymentVerified);
  assert.equal(paid.impact.distanceMilliInches,null);

  for(;;){
    const {envelope}=await room.store.loadRoom(roomId);
    revision=envelope.stateRevision;
    const state=envelope.state;
    if(state.phase==='combat'){
      const history=state.officialRavenSeekerPhaseEndHistory.filter(e=>e.planHash===paid.declaration.planHash);
      assert.equal(history.length,1);assert.equal(history[0].outcome,'resolved');
      const journal=await assertWave3StandardRoomColdReplayV1(bound,bound.authority,roomId,envelope);
      assert.equal(journal.filter(type=>type==='resolve_raven_seeker_phase_end').length,1);
      await save(dir+'/result.public.json',{source:scenario,roomId,runtime:bound.runtime.descriptor.runtimeVersion,
        paid:paid.declaration.paidCommandPoints,originalPlanHash:paid.declaration.planHash,sourceSupply:0,
        target:paid.declaration.targetUnitId,sourceDistance:null,automaticHits:paid.impact.automaticHits,
        modelsBefore:initial.pieces.find(p=>p.id==='zergling').currentModels,
        modelsAfter:state.pieces.find(p=>p.id==='zergling').currentModels,history,journal,
        idempotentActionCount:revision,coldExact:true,providerCalls:0}); break;
    }
    assert(revision<10,'expected phase successor');
    const side=state.activeSideKey;
    const {legalSpace}=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    const finite=legalSpace.finiteActions,domains=legalSpace.parameterDomains;
    const chosen=finite.find(row=>row.action.actionType==='resolve_raven_seeker_phase_end')
      ??finite.find(row=>row.action.actionType==='pass_reaction_family_window')
      ??(finite.length===1 ? finite[0] : null);
    const domain=domains.find(d=>d.parameterSchema.required.some(k=>['casualtySelectionHash','casualtyModelIds','convertedFailedArmourDieIndices'].includes(k)));
    assert(chosen||domain,JSON.stringify({finite:finite.map(r=>r.action.actionType),domains:domains.map(r=>r.actionType)}));
    stage=(chosen?.action??domain).actionType;
    const commit=await room.commit({roomId,credential:seats[side],operationKey:'r'+revision,
      ...(chosen?{kind:'finite',select:r=>r.actionKey===chosen.actionKey}:{select:r=>r.domainId===domain.domainId,parameters:poolParameters})});
    assert(commit.idempotentReplayVerified);
  }
} catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,revision,reason:error.message.slice(0,1200)});throw error;}
finally{room?.close();}
