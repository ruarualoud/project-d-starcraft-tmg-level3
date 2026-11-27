import assert from 'node:assert/strict';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/transition-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { savedPosition, savedRoom, manifestRef } from './support/wave3-faq-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { spatialQueryReceiptRejectionV1 } from '../packages/online-agent-session/spatial-query-receipt-contract-v1.mjs';
import { compactQueryReceiptForPrompt } from '../packages/online-agent-session/live-flash-decision-port-v1.mjs';
import { planStarcraftTmgParameterFailureRecoveryV1 } from '../packages/online-agent-session/action-parameter-contract-v1.mjs';

const source = 'build/ticket-28-wave3-premade-flight-and-platform';
const output = 'build/ticket-28-wave3-spatial-candidate-rejections';
const cases = [
  {name:'formation',dir:source+'/daybreak/mixed-coherency',unit:'raynor_s_raider__marine_',query:'coherency_after_candidate_placement'},
  {name:'raven',dir:source,unit:'raven',query:'legal_full_path_movement'},
  {name:'hydralisk',dir:source,unit:'hydralisk',query:'legal_full_path_movement'},
];
async function runCase({name,dir,unit,query}) {
  const prior = await read(dir+'/result.public.json');
  const mixed = name === 'formation';
  const log = await read(dir+'/'+(mixed ? 'comparison' : name)+'.public.json');
  const revision = mixed ? log.sourceRevision : log.revision;
  const sourceId = prior.roomId;
  const saved = await savedPosition({dir,id:sourceId,version:prior.version,revision});
  const {initial} = await savedRoom(dir,sourceId);
  const bound = await bindWave3StandardActionRoom({manifestRef,initial:initial.state,dir,
    candidateVersion:prior.version,frozenRuntimeRef:dir+'/runtime.json'});
  // Reopen the exact board for an independent seat query without writing to the source Room.
  const app = openWave3EngineeringRoomV1({directory:output,filename:':memory:',rulesRuntime:bound.rulesRuntime});
  try {
    const roomId = 'wave3-verdict-'+name;
    const seats = await app.create(roomId,bound.authorityFor(saved.state,{sourceId,revision}));
    const side = saved.state.activeSideKey;
    const seat = {roomId,seatToken:seats[side].seatToken};
    const h = (await app.store.loadRoom(roomId)).envelope;
    assert.deepEqual(h.state,saved.state);
    const {projection:roomProjection} = await app.room.readRoom(seat);
    const {legalSpace} = await app.room.legalSpace(seat);
    const input = {roomProjection,legalSpace};
    const domain = legalSpace.parameterDomains.find(d=>d.actionType==='move' && d.pieceId===unit);
    assert(domain);
    const models = h.state.pieces.find(p=>p.id===unit).models;
    const parameters = positions => ({leadingModelId:models[0].id,path:[positions[0]],
      placements:positions.slice(1).map((p,i)=>({...p,modelId:models[i+1].id}))});
    const allow = parameters(mixed ? log.open.geometry.positions : log.positions);
    const deny = mixed ? parameters(log.denied.geometry.positions) : {...allow,path:log.invalidPath};
    const expectedReason = (mixed ? log.denied : log.invalid).reason;
    assert.equal((mixed ? log.denied : log.invalid).status,'unknown');
    const args = p => ({domainId:domain.domainId,parameters:p});
    const adapter = (rulesRuntime=bound.rulesRuntime) => createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
      roomStore:app.store,rulesRuntime,seatKey:side});
    const native = adapter();
    const queryTool = (rulesQuery=q=>native.query(q)) => {
      const tools = createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery});
      return (queryKind,parameters) => tools.query({...input,request:{queryKind,arguments:parameters}});
    };
    const run = queryTool();
    const preview = p=>app.room.previewAction({...seat,expectedStateRevision:h.stateRevision,expectedStateHash:h.stateHash,
      expectedMatchBindingHash:h.matchBindingHash,expectedLegalSpaceHash:legalSpace.legalSpaceHash,
      proposal:{kind:'parameterized',domainId:domain.domainId,parameters:p}});
    const no = await run(query,args(deny)), yes = await run(query,args(allow));
    const blocked = await preview(deny), admitted = await preview(allow);
    assert.equal(blocked.ok,false);
    assert.equal(blocked.message.split(':')[0],expectedReason);
    assert.equal(no.status,'rejected',JSON.stringify([no.reason,no.failureStage]));
    assert.equal(no.reason,expectedReason);
    assert.equal(no.result.scope,'supplied_candidate_only');
    assert.equal(no.result.proposalAccepted,false);
    assert(!no.result.actionHash && !no.mayApply);
    assert.equal(spatialQueryReceiptRejectionV1({input,request:{queryKind:query},receipt:no}),null);
    const prompt = compactQueryReceiptForPrompt(no);
    assert.equal(prompt.result.scope,no.result.scope);
    assert.equal(prompt.status,'rejected');
    assert.equal(prompt.reason,no.reason);
    assert(admitted.ok && yes.status==='exact' && yes.result.proposalAccepted);
    assert.equal(yes.result.actionHash,hashStarcraftTmgContract(admitted.preview.core.action));
    const controls = {};
    if (mixed) {
      const action = await run('instantiate_parameterized_action',args(deny));
      assert.equal(action.status,'rejected');
      assert.equal(action.result.proposalHash,no.result.proposalHash);
      const recovery = planStarcraftTmgParameterFailureRecoveryV1({domain,parameters:deny,receipt:action});
      assert(recovery.feedback && !recovery.mayApply);
      const wrong = queryTool(async q=>{
        const response = await native.query(q);
        return {...response,result:{...response.result,proposalHash:'0'.repeat(64)}};
      });
      const mismatch = await wrong(query,args(deny));
      const missing = await run(query,{domainId:'not-a-current-domain',parameters:deny});
      const faulty = adapter({...bound.rulesRuntime,instantiate(){throw new TypeError(expectedReason);}});
      const fault = await queryTool(q=>faulty.query(q))(query,args(deny));
      assert.equal(mismatch.reason,'rules_query_proposal_mismatch');
      assert.equal(missing.reason,'CURRENT_ACTION_QUERY_DOMAIN_UNKNOWN');
      assert.equal(fault.safeFailureClass,'type_error');
      for (const r of [mismatch,missing,fault]) assert.equal(r.status,'unknown');

      // Give the real finite search just one test candidate, the known wall proposal.
      // It cannot conclude anything about the other positions in the same Room.
      const wallOnly = adapter({...bound.rulesRuntime,instantiate(state,d,_parameters,options){
        return bound.rulesRuntime.instantiate(state,d,deny,options);
      }});
      const search = await queryTool(q=>wallOnly.query(q))('legal_formation_options',{
        domainId:domain.domainId,maximumOptions:1,maximumCandidateAttempts:1});
      assert.equal(search.status,'unknown');
      assert.equal(search.reason,'RULES_QUERY_NO_LEGAL_FORMATION_OPTION');
      assert.equal(search.repairContext.kind,'bounded_placement_search');
      controls.actionBoundary = {status:action.status,recovery:recovery.action};
      controls.wrongProposal = mismatch.reason;
      controls.staleDomain = missing.reason;
      controls.injectedAdapterFailure = {status:fault.status,failureClass:fault.safeFailureClass};
      controls.singleCandidateSearch = {status:search.status,reason:search.reason,
        attempts:search.repairContext.attemptedCandidateCount,scope:search.repairContext.kind};
    }
    const after = (await app.store.loadRoom(roomId)).envelope;
    assert.equal(after.stateHash,h.stateHash);
    assert.equal(after.stateRevision,h.stateRevision);
    return {name,sourceId,revision,sourceStateHash:saved.stateHash,queryKind:query,oldStatus:'unknown',
      rejected:{status:no.status,reason:no.reason,scope:no.result.scope,queryReceiptHash:no.queryReceiptHash,
        proposalHash:no.result.proposalHash,roomReason:blocked.message},
      accepted:{status:yes.status,queryReceiptHash:yes.queryReceiptHash,postStateHash:admitted.preview.core.result.postStateHash},
      promptDelivered:true,roomUnchanged:true,...controls};
  } finally {app.close();}
}
for (const c of cases.filter(c=>process.argv.length===2 || process.argv.slice(2).includes(c.name))) {
  try {
    const result = await runCase(c);
    await save(output+'/'+c.name+'.public.json',result);
  } catch(error) {
    await save(output+'/'+c.name+'-stop-'+Date.now()+'.public.json',{message:error.message,stack:error.stack.split('\n').slice(1,5)});
    throw error;
  }
}
const all = await Promise.all(cases.map(c=>read(output+'/'+c.name+'.public.json')));
await save(output+'/result.public.json',{cases:all,providerCalls:0});
