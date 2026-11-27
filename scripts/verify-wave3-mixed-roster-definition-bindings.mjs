import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, inspectOfficialStandardReleaseOpeningCoverageV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';
const setup=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Standard');
const context=await resolveWave3StandardContext(await read(setup.releaseRef),'area_ability_inputs');
const base='build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/';
for(const kind of ['khassar','medic']){
  const dir=base+kind, approved=await read(dir+'/opening.public.json');
  const args=await read(approved.sourceRef);
  const parameters={roomId:approved.roomId,releaseContext:context,dataset:context.dataset,snapshot:context.snapshot,
    releaseMatchVersion:approved.version,recipes:args.recipes,missionRecordKey:args.mission??setup.missionRecordKey,
    deploymentRecordKey:setup.deploymentRecordKey,mapConfiguration:wave3HumanMapConfiguration(setup),armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY};
  const inspected=inspectOfficialStandardReleaseOpeningCoverageV2(parameters);
  const built=prepareOfficialStandardReleaseOpeningV2(parameters);
  assert.deepEqual(inspected,built.openingRosterCoverage);
  const definitions=inspected.definitions.map(row=>{
    const native=built.nativeActions.catalogue.definitions.find(d=>d.definitionId===row.definitionId);
    assert.equal(native.sourceFeatureHash,row.sourceFeatureHash);
    assert.equal(row.registrationStatus,'executable_exact');assert.equal(native.execution.status,row.registrationStatus);
    assert(row.owners.length && native.execution.adapterId);
    return {id:row.definitionId,record:row.recordKey,hash:row.sourceFeatureHash,owners:row.owners,adapterId:native.execution.adapterId,capability:native.execution.capability};
  });
  assert.equal(definitions.length,approved.definitionCount);
  assert.equal(new Set(definitions.map(d=>d.id)).size,definitions.length);
  await save(dir+'/definition-bindings.public.json',{source:approved.manifestHash,version:approved.version,compared:'read-only admission / formal roster factory / registered native consumer',definitions,paidCalls:0});
}
