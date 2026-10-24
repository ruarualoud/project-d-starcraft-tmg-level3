// Actual Teach anchors: the old three-column filler intersects frozen walls.
// Exercise the real laboratory and Native footprint/coherency validator.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const base=process.argv[2];
const state=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const config=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
const row=config.rows.find(r=>r.arm==='A');
const draft=JSON.parse(await fs.readFile(row.dataDirectory+'/drafts/'+row.sessionId+'.json','utf8'));
const captured=draft.teachFramework.state.investigation.rounds.flatMap(r=>r.output.queries||[])
  .find(q=>q.queryId==='inv4-1-scenario-marine-movement');
assert(captured,'exact paid failing scenario retained');
const request=JSON.parse(captured.toolRequestJson);
const before=hash(state),terrainHash=hash(state.board.terrain);
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const lab=createPregameSceneLaboratoryV1({sourceState:state,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){throw Error('geometry never executes or enumerates actions');},
    instantiate(){throw Error('no execution');},apply(){throw Error('no mutation');}}});
const branch=lab.runScenarioBranch({branchId:'actual-teach-anchors',spec:request.spec});
console.log(JSON.stringify({check:'captured-three-marine-anchors',assessment:branch.hypotheticalPlacementAssessment}));
assert(branch.hypotheticalPlacementAssessment.units.every(u=>u.resultStatus==='ok'&&u.coherencyStatus.status==='in_coherency'),
  'fixed anchors must fit coherent formations without the artificial three-column wall collision');
for(const placement of request.spec.placements){
  const placed=branch.hypotheticalPlacements.find(p=>p.pieceId===placement.pieceId);
  const piece=state.pieces.find(p=>p.id===placement.pieceId);
  assert.equal(placed.modelPositions.length,piece.models.filter(m=>!m.isDestroyed).length);
  assert.equal(placed.modelPositions[0].xInches,placement.xInches);
  assert.equal(placed.modelPositions[0].yInches,placement.yInches);
  assert.equal(placed.layoutSource,'shared_geometry_solver_fixed_anchor');
}
// Explicit model-owned layouts must NOT be silently changed into nicer ones.
const explicit=request.spec.placements.map(p=>({pieceId:p.pieceId,modelPositions:
  branch.hypotheticalPlacements.find(q=>q.pieceId===p.pieceId).modelPositions}));
const explicitBranch=lab.runScenarioBranch({branchId:'explicit-preserved',spec:{...request.spec,placements:explicit}});
assert.deepEqual(explicitBranch.hypotheticalPlacements.map(p=>p.modelPositions),branch.hypotheticalPlacements.map(p=>p.modelPositions));
assert.throws(()=>lab.runScenarioBranch({branchId:'illegal-anchor-not-moved',spec:{...request.spec,
  placements:[{pieceId:request.spec.placements[0].pieceId,xInches:.01,yInches:.01}]}}),/HYPOTHETICAL_FORMATION_NOT_FOUND/);
assert.equal(hash(state),before);assert.equal(hash(state.board.terrain),terrainHash);
assert(lab.proveMutationZero().sourceStateHashUnchanged);
assert.equal(branch.authorityClaim,'advisory_hypothetical_geometry_not_rules_legality');
console.log(JSON.stringify({status:'PASS',providerCalls:0,roomActions:0,terrainPreserved:true,anchorsUnchanged:true,
  explicitLayoutsPreserved:true,illegalAnchorNotRelocated:true,arrivalLegalityProven:false}));
