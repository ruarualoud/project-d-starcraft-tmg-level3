import assert from 'node:assert/strict';
import { access, readdir } from 'node:fs/promises';
import { base, manifestRef, savedPosition, savedRoom, signedBranch } from './support/wave3-faq-room-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { officialReleaseRosterIncrementOptionsV2, prepareOfficialReleaseRoomNativeActionsV2 } from '../packages/product-composition/official-release-room-native-actions-v2.mjs';
import { inspectStarcraftTmgActionParametersV1 } from '../packages/online-agent-session/action-parameter-contract-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const output = 'build/ticket-28-wave3-gap-input';
const version = '2.99.6';
const fields = ['gapMouths','coherencyGapMouths'];
const cases = {
  fight: {dir:'build/ticket-28-wave3-human-lobby-v1/incremental-pass/split-fight',
    id:'standard-split-fight-w3',version:'2.88.0',prefix:'operation-1d4b'},
  move: {dir:'build/ticket-28-wave3-premade-flight-and-platform',
    id:'wave3-flight-and-platform',version:'2.99.5',prefix:'operation-d9cc'},
  charge: {dir:base+'/creep-charge-v262',id:'creep-charge-v262',version:'2.62.0',prefix:'operation-c65a'},
};
let context;
async function checkInputs({app,bound,head,space,side,seat,h,domain,args}) {
  const adapter=createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({roomStore:app.store,rulesRuntime:bound.rulesRuntime,seatKey:side});
  const mcp=createStarcraftTmgSpatialActionQueryRuntimeV1({rulesQuery:q=>adapter.query(q)});
  const {projection}=await app.room.readRoom(seat);
  const query=parameters=>mcp.query({roomProjection:projection,legalSpace:space,request:{
    queryKind:'instantiate_parameterized_action',arguments:{domainId:domain.domainId,parameters}}});
  const preview=parameters=>app.room.previewAction({...seat,expectedStateRevision:h.stateRevision,expectedStateHash:h.stateHash,
    expectedMatchBindingHash:h.matchBindingHash,expectedLegalSpaceHash:space.legalSpaceHash,
    proposal:{kind:'parameterized',domainId:domain.domainId,parameters}});
  const denials=[];
  for(const [field,supplied] of [[fields[0],[{widthMilliInches:1}]],[fields[1],[]]]) {
    const params={...args,[field]:supplied};
    const checked=inspectStarcraftTmgActionParametersV1(domain,params);
    const issue=i=>i.fieldPath==='parameters.'+field && i.code==='field_computed_by_rules';
    assert(checked.fieldIssues.some(issue),JSON.stringify(checked.fieldIssues));
    const result=await query(params), denied=await preview(params);
    assert.equal(result.status,'rejected',result.reason);
    assert.equal(result.reason,'SELECTED_SPATIAL_GAP_INPUT_HOST_DERIVED');
    assert(result.repairContext?.fieldIssues?.some(issue),JSON.stringify(result.repairContext));
    assert(!denied.ok);
    assert.match(denied.message??denied.reason,new RegExp(result.reason+':'+field));
    assert.equal((await head()).stateHash,h.stateHash);
    assert.equal(result.result.scope,'supplied_candidate_only');
    assert.equal(result.result.proposalHash,hash({kind:'parameterized',domainId:domain.domainId,parameters:params}));
    assert(!result.mayApply && !result.result.actionHash);
    denials.push({status:result.status,receipt:result.queryReceiptHash,field,issue:checked.fieldIssues.find(issue),queryReason:result.reason,roomReason:denied.message??denied.reason});
  }
  return {query,preview,denials};
}

const receiptsOnly=process.argv.includes('--receipt-only');
const selected=process.argv.slice(2).filter(key=>key!=='--receipt-only');
if (!receiptsOnly && (!selected.length || selected.includes('legacy'))) {
  const source = cases.move;
  const operations = (await readdir(source.dir)).filter(name => name.startsWith(source.prefix));
  assert.equal(operations.length,1);
  const {preview:{core}} = await read(source.dir+'/'+operations[0]);
  for(const field of fields) assert.deepEqual(core.proposal.parameters[field],[]);
  const restored = await savedPosition({...source,revision:core.expectedStateRevision+1});
  assert.equal(restored.stateHash,core.result.postStateHash);
  await save(output+'/legacy.public.json',{room:source.id,version:source.version,revision:restored.stateRevision,
    stateHash:restored.stateHash,source:operations[0],restoredFromSignedJournal:true,fields,providerCalls:0});
}
for (const key of (selected.length ? selected : Object.keys(cases)).filter(k=>k!=='legacy')) {
  const source = cases[key], dir = output+'/'+key, id = 'wave3-host-gap-'+key;
  if (receiptsOnly) {
    const prior=await read(dir+'/result.public.json');
    const {initial,journal:[signed]}=await savedRoom(dir,id);
    const bound=await bindWave3StandardActionRoom({manifestRef,initial:initial.state,dir,candidateVersion:version,frozenRuntimeRef:dir+'/runtime.json'});
    const app=openWave3EngineeringRoomV1({directory:dir,filename:':memory:',rulesRuntime:bound.rulesRuntime});
    try {
      const seats=await app.create(id,bound.authorityFor(initial.state,prior.scene));
      const side=initial.state.activeSideKey, seat={roomId:id,seatToken:seats[side].seatToken};
      const head=async()=>(await app.store.loadRoom(id)).envelope;
      const h=await head(), {legalSpace:space}=await app.room.legalSpace(seat);
      assert.equal(h.stateHash,initial.stateHash);
      const domain=space.parameterDomains.find(d=>d.domainId===prior.check.domainId);
      assert(domain);
      const args=signed.proposal.parameters;
      const {query,denials}=await checkInputs({app,bound,head,space,side,seat,h,domain,args});
      const legal=await query(args);
      assert.equal(legal.result?.actionHash,hash(signed.action),legal.reason);
      await save(dir+'/final-receipts.public.json',{id,stateHash:h.stateHash,domainId:domain.domainId,denials,
        legalActionHash:legal.result.actionHash,signedPostStateHash:signed.postStateHash,coldResult:dir+'/result.public.json',providerCalls:0});
    } finally {app.close();}
    console.log(key+' receipts passed');
    continue;
  }
  if (await access(dir+'/result.public.json').then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;})) continue;
  const files = (await readdir(source.dir)).filter(name=>name.startsWith(source.prefix));
  assert.equal(files.length,1);
  const original = await read(source.dir+'/'+files[0]), before = original.preview.core;
  const position = await savedPosition({...source,revision:before.expectedStateRevision});
  assert.equal(position.stateHash,before.preStateHash);
  context ??= await resolveWave3StandardContext(await read(manifestRef), 'area_ability_inputs');
  const assembly = prepareOfficialReleaseRoomNativeActionsV2({context,state:position.state,
    ...officialReleaseRosterIncrementOptionsV2(version),useEquippedWeapons:true,includeReleasePhaseControl:true});
  assert.equal(assembly.state.officialHostDerivedGapInputs,true);
  const state = assembly.state;
  const args = structuredClone(before.proposal.parameters);
  for (const field of fields) delete args[field];
  const scene = {sourceRoom:source.id,sourceRevision:position.stateRevision,sourceStateHash:position.stateHash,
    purpose:'Replay the saved player choice with rule-derived gap inputs'};
  await signedBranch({dir,id,version,initial:state,state,scene,async perform({head,menu,app,seats,bound,commit}) {
    const h=await head();
    if(h.stateRevision===1)return;
    assert.equal(h.stateRevision,0);
    const space=await menu(), side=h.state.activeSideKey, seat={roomId:id,seatToken:seats[side].seatToken};
    const options=space.parameterDomains.filter(d=>d.actionType===original.domain.actionType &&
      d.pieceId===original.domain.pieceId && d.weaponName===original.domain.weaponName);
    assert.equal(options.length,1,JSON.stringify(space.parameterDomains.map(d=>[d.actionType,d.pieceId,d.weaponName])));
    const domain=options[0], schema=domain.parameterSchema;
    assert.deepEqual(schema.hostDerivedFields,fields);
    for(const f of fields)assert(!(schema.optional??[]).includes(f) && !Object.hasOwn(schema.properties??{},f));
    const {query,preview,denials}=await checkInputs({app,bound,head,space,side,seat,h,domain,args});
    const yes=await query(args), admit=await preview(args);
    assert(admit.ok,admit.message??admit.reason);
    assert.equal(yes.status,'exact',JSON.stringify([yes.reason,yes.details]));
    assert.equal(yes.result.actionHash,hash(admit.preview.core.action));
    for(const f of fields)assert(!Object.hasOwn(yes.result.canonicalParameters,f));
    await save(dir+'/query.public.json',{action:domain.actionType,actor:domain.pieceId,source:scene,
      domainId:domain.domainId,denials,actionHash:yes.result.actionHash,receipt:yes.queryReceiptHash});
    await commit(domain,args);
    if (!admit.preview.core.result.chancePending) {
      assert.equal((await head()).stateHash,admit.preview.core.result.postStateHash);
    }
  }, async verify(h,{menu}){
    assert.equal(h.stateRevision,1);
    const successor=await menu();
    assert(successor.parameterDomains.length+successor.finiteActions.length>0);
    const check=await read(dir+'/query.public.json');
    const {journal:[receipt]}=await savedRoom(dir,id);
    assert.equal(hash(receipt.action),check.actionHash);
    assert.equal(receipt.postStateHash,h.stateHash);
    return {check,appliedActionHash:hash(receipt.action),successorMenu:successor.legalSpaceHash};
  }});
  console.log(key+' passed');
}
