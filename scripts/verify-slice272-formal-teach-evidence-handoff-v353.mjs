import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from '../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { prepareIterativeRosterTeachHandoffV1, verifyIterativeRosterTeachHandoffV1 } from '../packages/roster-strategist/iterative-roster-teach-handoff-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialStandardRoomInitialStateAuthorityV1 } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [directory,stateFile,fixtureRoot] = process.argv.slice(2);
let state=JSON.parse(await fs.readFile(stateFile,'utf8')).value;
const request=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-056.product-request.json.gz`)));
const missionProfile=request.promptNodes[0].content.missionEvidence.scoring.missionScoringProfile;
const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:fixtureRoot});
const native=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:
  createOfficialUnitCompositionUpgradeDataBundleV1({dataset:source.dataset})});
const cache=new Map();
const armyBuilderPort={...native,evaluateRosterCandidate(input){const key=JSON.stringify(input);
  if(!cache.has(key)) cache.set(key,native.evaluateRosterCandidate(input));return structuredClone(cache.get(key));}};
const handoff=prepareIterativeRosterTeachHandoffV1({state,armyBuilderPort,missionProfile});
const branch='3dcb7637d7bba3324456c229e709dee1eae8d0fb0d8a1d29b27867520d1ade9d';
const evidence=handoff.selectionEvidence;
assert(evidence?.scenarios.some(row=>row.receipt.sourceReceipt.branchStateHash===branch),
  'Actual selector scene is lost at formal Teach handoff');
const actual=state.observations.find(row=>row.query?.kind==='scene_query'&&row.query.branchStateHash===branch);
assert(evidence.queries.some(row=>row.receipt.receiptHash===actual.receipt.sourceReceiptHash),
  'The actual marker-control result must survive, not just model prose');
const saved=evidence.scenarios.find(row=>row.receipt.sourceReceipt.branchStateHash===branch);
let restores=0;
const receipt=saved.receipt.sourceReceipt;
const pins=path.resolve(directory,'../workspace/laboratory-sources');
let authority;
for(const name of await fs.readdir(pins)){
  const entry=JSON.parse(gunzipSync(await fs.readFile(path.join(pins,name))));
  if(hash(entry.authority.state)!==receipt.sourceStateHash)continue;
  assert.equal(hash(entry.scope),name.replace('.json.gz',''));
  verifyOfficialStandardRoomInitialStateAuthorityV1(entry.authority);
  authority=entry.authority;break;
}
assert(authority,'Use the exact product-pinned source, never a newly reconstructed fixture');
assert.equal(hash(authority.state),receipt.sourceStateHash);
const runtime=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state:structuredClone(authority.state)})});
const nativeLab=createPregameSceneLaboratoryV1({laboratoryId:'ticket27-s271-roster-workspace-lab',
  sourceState:authority.state,armyBuilderPort:native,matchBinding:authority.matchBinding,
  sourceRoomRef:{roomId:'ticket27-slice-271-roster-workspace-isolated-lab',stateRevision:0},rulesRuntime:runtime});
const lab={...nativeLab,runScenarioBranch(){throw Error('NO_RECOMPUTATION');},
  restoreHypotheticalBranch(input){restores++;assert.deepEqual(input.receipt,receipt);
    assert.deepEqual(input.spec,saved.request.toolRequest.spec);return nativeLab.restoreHypotheticalBranch(input);}};
createRosterTeachEvidencePortV1(lab,{retainedScenarios:evidence.scenarios}).restoreScenarioBranch(saved.challengeId);
assert.equal(restores,1);
const control=await nativeLab.queryScene({queryId:'v353-restored-control',base:{kind:'branch',branchStateHash:branch},
  seatKey:state.frozenContext.sideKey,queryKind:actual.query.queryKind,argumentsJson:actual.query.argumentsJson});
assert.deepEqual(control.queryReceipt,actual.receipt.queryReceipt);
assert.equal(hash(authority.state),receipt.sourceStateHash);
const changed=structuredClone(handoff);changed.selectionEvidence.candidateHash='different-army';
assert.throws(()=>verifyIterativeRosterTeachHandoffV1(changed,armyBuilderPort,missionProfile));
const legacy={...handoff};delete legacy.selectionEvidence;
assert.equal(verifyIterativeRosterTeachHandoffV1(legacy,armyBuilderPort,missionProfile),true);
console.log(JSON.stringify({pass:true,checks:5,scenarios:evidence.scenarios.length,queries:evidence.queries.length,
  actualSceneAndQueryPreserved:true,exactRestoration:true,changedArmyRejected:true,legacyReadable:true,
  providerCalls:0,roomWrites:0}));
