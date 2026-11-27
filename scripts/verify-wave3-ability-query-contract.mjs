import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createStarcraftProductRoomHostV1} from './support/starcraft-product-room-host-v1.mjs';
import {createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {createStarcraftTmgNativeSpatialQueryToolV1} from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import {STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1} from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
import {compactQueryReceiptForPrompt} from '../packages/online-agent-session/live-flash-decision-port-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd(),dataDirectory=path.join(root,'build/ticket-28-wave3-release-wide-phases');
const {roomId}=JSON.parse(await readFile(path.join(dataDirectory,'room.public.json'),'utf8'));
const host=await createStarcraftProductRoomHostV1({root,dataDirectory,liveEnabled:false,
  offlineWave3MatchVersion:'2.99.2',mapConfiguration:{seedId:'standard-d6-1'}});
try {
  const item=await host.get(roomId),runtime=item.fixture.rulesRuntime, api=item.fixture.roomRuntime;
  const seat={roomId,seatToken:item.record.credentials.human.seatToken};
  const [{projection:roomProjection},{legalSpace}]=await Promise.all([api.readRoom(seat),api.legalSpace(seat)]);
  const kind='ability.timing',recordKey='tactical_cards:terran_armed_forces';
  const tool=createStarcraftTmgNativeSpatialQueryToolV1({name:'rules',queryKinds:STARCRAFT_TMG_SPATIAL_QUERY_KINDS_V1});
  const schema=tool.function.parameters.properties;
  assert(schema.queryKind.enum.includes(kind));
  assert(schema.argumentsJson.description.includes('tactical_cards: record key'));
  const request={queryKind:kind,arguments:{recordKey}};
  const input={roomProjection,legalSpace};
  const scene=rulesRuntime=>createStarcraftTmgSceneQueryServiceV1({roomStore:item.roomStore,rulesRuntime,seatKey:roomProjection.viewer.seatKey});
  const normal=scene(runtime);
  const [valid,wrongArgs]=await normal.queryBatch({...input,requests:[request,{queryKind:kind,arguments:{unitId:'marine'}}]});
  assert.equal(valid.status,'exact',JSON.stringify(valid.details));
  const promptResult=compactQueryReceiptForPrompt(valid);
  assert.deepEqual(promptResult.result.definitions,valid.result.definitions);
  assert.equal(promptResult.result.executionEligibilityProven,false);
  assert.equal(wrongArgs.reason,'ABILITY_TIMING_RECORD_KEY_REQUIRED');
  assert.deepEqual(wrongArgs.repairContext.expectedArguments.required,['recordKey']);
  const rejected={};
  for(const key of ['recordKey','normalizedDatasetHash','sourceSnapshotHash']){
    const injected={...runtime,queryAbilityTiming:requested=>({...runtime.queryAbilityTiming(requested),[key]:'different-source'})};
    const receipt=await scene(injected).query({...input,request});
    assert.equal(receipt.status,'unknown');
    assert.equal(receipt.reason,'ABILITY_TIMING_SOURCE_MISMATCH');
    rejected[key]=receipt.reason;
  }
  const out={roomId,recordKey,definitions:valid.result.definitions.length,receiptHash:valid.queryReceiptHash,
    hostBatch:true,promptRetainsTiming:true,modelToolDescribesArguments:true,wrongArgument:wrongArgs.reason,
    injectedMismatches:rejected,providerCalls:0};
  await atomicWrite(path.join(dataDirectory,'ability-contract.public.json'),JSON.stringify(out,null,2)+'\n');
  console.log(JSON.stringify(out));
} finally {await host.close();}
