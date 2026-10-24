import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {assessRosterTeachEvidenceReadinessV1} from '../packages/roster-strategist/roster-teach-evidence-readiness-v1.mjs';
const source=JSON.parse(await fs.readFile(process.argv[2]+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const before=hash(source);
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
let inspected;
const make=()=>createPregameSceneLaboratoryV1({sourceState:source,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(source.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(state){inspected=structuredClone(state);return {candidates:[],parameterDomains:[],searchSuggestions:[]};},
    instantiate(){throw Error('NO_ACTION_ALLOWED');},apply(){throw Error('NO_ACTION_ALLOWED');}}});
const lab=make();
const spec={kind:'hypothetical_geometry',phase:'assault',activeSideKey:'player2',preservePositions:true,placements:[]};
const receipt=lab.runScenarioBranch({branchId:'same-positions-other-activation',spec});
const context=lab.describeQueryContext({base:{kind:'branch',branchStateHash:receipt.branchStateHash},seatKey:'player2'});
assert.equal(context.phase,'assault','explicit phase-only hypothesis must not silently remain in original phase');
assert.equal(context.activeSideKey,'player2');
assert.deepEqual(inspected.pieces,source.pieces,'must not place reserve units or alter formation');
assert.deepEqual(inspected.board,source.board,'terrain and marker positions must remain exact');
assert.equal(receipt.hypotheticalActivation.positionsPreserved,true);
assert.equal(receipt.hypotheticalActivation.arrivalHistoryProven,false);
assert.equal(assessRosterTeachEvidenceReadinessV1(receipt).usableForClaim,true);
assert.equal(hash(source),before);
const restored=make();
assert.equal(restored.restoreHypotheticalBranch({receipt,spec}).branchStateHash,receipt.branchStateHash);
for(const extra of [{clearTerrain:true},{isolateToPlacedPieces:true},{placements:[{pieceId:source.pieces[0].id,xInches:1,yInches:1}]},{phase:'setup'}])
  assert.throws(()=>lab.runScenarioBranch({branchId:'rejected-mixed',spec:{...spec,...extra}}));
assert.equal(lab.proveMutationZero().sourceStateHashUnchanged,true);
console.log(JSON.stringify({passed:true,preservedPieces:source.pieces.length,terrainPreserved:true,exactRestore:true,providerCalls:0,nativeActions:0}));
