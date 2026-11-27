import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite } from './lib/development-context.mjs';
import { loadWave3MatchBoardFactoryV1, wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';
import { declareWave3EngineeringCoherencyV1, createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { createStarcraftTmgSceneQueryServiceV1 } from '../packages/online-agent-session/scene-query-service-v1.mjs';
import { describeNativeActionFormV1, compileNativeActionFormValuesV1 } from '../packages/client-domain/native-action-form-v1.mjs';
import { createRosterPlanningBoardLaboratoryV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createOfficialRoomRosterDisclosureDataBundleV1 } from '../packages/source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { isOfficialUnitVisibleForActiveAbilityV1 } from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { evaluateOfficialWithinWhollyWithinV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';

const root = process.cwd();
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const version = process.argv[2] ?? '2.99.1';
const legacy = version === '2.99.0';
assert(legacy || version === '2.99.1');
const out = path.join(root,'build','ticket-28-wave3-optical-target-query',version);
await mkdir(out,{recursive:true});
const write = (name, data) => atomicWrite(path.join(out,name+'.public.json'), JSON.stringify(data,null,2)+'\n');
const prior = await read('build/ticket-28-wave3-human-lobby-v1/remaining-six/web-openings/support-weapons-2.94.0.public.json');
const selected = (await read('content/wave3-human-match-setups-v1.json')).find(s => s.scale === 'Standard');
const setup = {...selected, version};
const board = await loadWave3MatchBoardFactoryV1({root,setup});
const opening = board.prepare({roomId:'w3-optical-study', recipes:prior.recipes, mapConfiguration:wave3HumanMapConfiguration(setup)});
assert.deepEqual(opening.pendingNativeDefinitionIds, []);
const {rulesRuntime,releaseContext} = board.bind(opening.state);
const first = rulesRuntime.enumerate(opening.state).candidates.find(c => c.isEnabled && c.actionType === 'resolve_mission_start_of_round');
const template = rulesRuntime.apply(opening.state,first,{sideKey:opening.state.firstPlayerSideKey}).state;
const side = 'player1';
const {unitCompositionUpgradeDataBundle} = createOfficialRoomRosterDisclosureDataBundleV1({
  releaseContext:releaseContext, dataset:releaseContext.dataset, snapshot:releaseContext.snapshot});
const armyBuilderPort = createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle,releaseContext});
function place(state, unit, positions) {
  const entry = state.reserveManifestBySide[unit.sideKey].find(e => e.pieceId === unit.id);
  entry.deploymentStatus = 'deployed';
  Object.assign(unit,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:unit.models[0].id,
    xInches:positions[0][0],yInches:positions[0][1]});
  assert.equal(unit.models.length,positions.length);
  unit.models.forEach((model,i) => Object.assign(model,{isOnField:true,xInches:positions[i][0],yInches:positions[i][1]}));
}
function conditioned(distance, hidden, visible) {
  const state = structuredClone(template);
  state.activeSideKey = side;
  state.firstPlayerSideKey = side;
  state.phaseFirstActorByRound[state.round+':movement'] = {
    round:state.round, phase:'movement', chosenFirstActorSideKey:side, markerHolderSideKey:side,
  };
  const caster = state.pieces.find(u => u.id === 'medic');
  const target = state.pieces.find(u => u.id === 'siege_tank');
  const spacing = caster.models[0].baseWidthInches + 0.12;
  const separation = distance + (caster.models[0].baseWidthInches + target.models[0].baseWidthInches)/2;
  // The negative control crosses the existing east–west wall-5-sw. Keep
  // the entire tank south of it and the whole Medic unit on its north side.
  const x = visible ? 6 : 9.2;
  const y = visible ? 3 : 3.7 + separation;
  const formation = visible ? [[x,y],[x-spacing,y],[x-spacing,y+spacing]]
    : [[x,y],[x-spacing,y],[x+spacing,y]];
  const targetPosition = visible ? [x+separation,y] : [x,3.7];
  place(state,caster,formation);
  place(state,target,[targetPosition]);
  if (hidden) target.statuses.push('HIDDEN');
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'optical-reference-'});
  const actualVisibility = isOfficialUnitVisibleForActiveAbilityV1(state,caster,target);
  assert.equal(actualVisibility,visible,'declared visibility must come from the loaded map');
  state.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({
    state,expectedRulesRuntimeHash:state.supplyLossLedger.rulesRuntimeHash,
  });
  const within = inches => caster.models.some(model => evaluateOfficialWithinWhollyWithinV1({
    state, dataBundle:state.officialModelBaseGeometryDataBundle,
    source:{kind:'model',unitId:caster.id,modelId:model.id}, targetUnitId:target.id,
    rangeMilliInches:inches*1000,
  }).unitWithin);
  return {state,geometry:{positions:[[x,y],targetPosition],within4:within(4),
    within12:within(12),within16:within(16),visible:actualVisibility,hidden}};
}
const rows = [
  {name:'upgrade-only-band',distance:14,hidden:false,visible:true,expected:true},
  {name:'hidden-far',distance:6,hidden:true,visible:true,expected:false},
  {name:'hidden-near',distance:3,hidden:true,visible:true,expected:true},
  {name:'beyond-upgrade',distance:18,hidden:false,visible:true,expected:false},
  {name:'blocked-line',distance:8,hidden:false,visible:false,expected:false},
];
const results = [];
for(const spec of rows.filter((_, index) => !legacy || index === 0)) {
  const name = legacy ? 'compatibility' : spec.name;
  const previous = await read(path.join(out,name+'.public.json')).catch(error => {
    if(error.code !== 'ENOENT') throw error;
    return null;
  });
  if(previous?.verified && previous.releaseHash === rulesRuntime.releaseBinding.manifestHash) {
    results.push(previous);
    continue;
  }
  const {state,geometry} = conditioned(spec.distance,spec.hidden,spec.visible);
  const roomId = 'optical-'+spec.name;
  const authority = createWave3ComponentEngineeringAuthorityV1({context:releaseContext,state,scenario:{kind:'conditioned-targeting',...geometry}});
  const signed = !legacy && spec.name === 'upgrade-only-band';
  const roomOptions = {directory:out,filename:signed ? 'positive.sqlite' : ':memory:',rulesRuntime};
  const native = openWave3EngineeringRoomV1(roomOptions);
  try {
    const seats = await native.create(roomId,authority);
    const input = {roomId,seatToken:seats[side].seatToken};
    const {projection} = await native.room.readRoom(input);
    const {legalSpace} = await native.room.legalSpace(input);
    const service = createStarcraftTmgSceneQueryServiceV1({roomStore:native.store,rulesRuntime,seatKey:side});
    const space = service.actionSpace({roomProjection:projection,legalSpace});
    assert.deepEqual(space.authority.releaseBinding,rulesRuntime.releaseBinding);
    const find = domains => domains.find(d => d.abilityName === 'Optical Flare');
    const domain = find(legalSpace.parameterDomains), projected = find(space.parameterDomains);
    const targets = domain?.parameterSchema.targetUnitId?.enum ?? [];
    assert.deepEqual(projected?.parameterSchema.targetUnitId?.enum??[],targets);
    if(domain) {
      assert.equal(projected.domainId,domain.domainId);
      assert.deepEqual(describeNativeActionFormV1(domain).fields.targetUnitId.enum,targets);
    }
    const result = {name:spec.name,geometry,targets,reportedRange:projected?.constraints?.rangeMilliInches??null,
      domainId:domain?.domainId??null,revision:projection.room.stateRevision,paidModelCalls:0};
    const head = await native.store.loadRoom(roomId);
    const lab = createRosterPlanningBoardLaboratoryV1({rulesRuntime,armyBuilderPort,sourceState:state,
      sourceRoomRef:{roomId,stateRevision:0},matchBinding:head.envelope.matchBinding});
    const planSpace = lab.describeQueryContext({seatKey:side}).actionSpace;
    const planning = find(planSpace.parameterDomains);
    assert.deepEqual(planning?.parameterSchema.targetUnitId?.enum??[],targets);
    assert.equal(planning?.constraints?.rangeMilliInches??null,result.reportedRange);
    result.planningScope = planSpace.authority.sceneScope.kind;
    assert.equal(targets.includes('siege_tank'),spec.expected, JSON.stringify(result));
    if(spec.name==='upgrade-only-band') {
      assert.equal(geometry.within12,false);
      assert.equal(geometry.within16,true);
      const old = await read(path.join(root,'build/ticket-28-wave3-optical-target-query/2.99.0/upgrade-only-band.public.json'));
      if(legacy) {
        assert.equal(domain.domainId,old.domainId);
        assert.equal(result.reportedRange,old.reportedRange);
      } else {
        assert.equal(result.reportedRange,16000,'A-13 Native target options and consumer range must agree');
        const form = describeNativeActionFormV1(domain);
        const values = compileNativeActionFormValuesV1(form,{activeUnitId:'medic',targetUnitId:'siege_tank',
          paymentCardInstanceIds:domain.parameterSchema.paymentCardInstanceIds.enum[0]});
        assert(values.complete,JSON.stringify(values));
        await native.commit({roomId,credential:seats[side],operationKey:'optical-upgrade-range',
          select:d=>d.domainId===projected.domainId,parameters:()=>values.parameters});
        const applied = (await native.store.loadRoom(roomId)).envelope;
        assert.equal(applied.stateRevision,1);
        const target = applied.state.pieces.find(u=>u.id==='siege_tank');
        const status = target.statuses.find(s => s.sourceDefinitionId===domain.definitionId);
        const effects = applied.state.log.flatMap(row=>row.events??[]).filter(e=>e.type?.includes('optical')||e.type?.includes('debuff'));
        assert(status || effects.length, JSON.stringify({statuses:target.statuses,events:applied.state.log.at(-1)?.events}));
        const cold = openWave3EngineeringRoomV1({...roomOptions,readOnly:true});
        try {
          await cold.restoreDependencies(roomId,authority);
          const bundle = await cold.store.loadReplayBundle(roomId);
          const journal = bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
          assert.equal(journal.length,1);
          const replay = cold.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});
          assert(replay.ok,replay.reason);
          assert.deepEqual(replay.envelope,applied);
          Object.assign(result,{appliedAction:journal[0].action.actionType,targetId:target.id,
            effects:effects.map(e=>e.type),coldStateHash:applied.stateHash});
        } finally {cold.close();}
      }
    }
    result.verified = true;
    result.releaseHash = rulesRuntime.releaseBinding.manifestHash;
    await write(name,result);
    results.push(result);
  } finally {native.close();}
}
await write('result',{version,releaseBinding:rulesRuntime.releaseBinding,results,scope:'conditioned movement phase',paidModelCalls:0});
console.log(out);
