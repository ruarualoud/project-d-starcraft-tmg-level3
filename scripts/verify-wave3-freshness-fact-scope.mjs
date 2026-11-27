import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftTmgIncrementalSkillFreshnessRuntimeV1,restoreStarcraftTmgSkillFreshnessCheckpointV1}
  from '../packages/strategy-skills/incremental-skill-freshness-runtime-v1.mjs';
import {createSqliteStarcraftTmgStrategyReleaseStoreV1} from '../packages/strategy-skills/sqlite-strategy-release-store-v1.mjs';
import {hash} from '../packages/skill-production/common.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const dir=path.resolve('build/ticket-28-wave3-freshness-fact-scope');
await fs.mkdir(dir,{recursive:true});
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const manifest=await read('content/source-releases/wave3-20261126-human-match-v2.json');
const geometry=await read(manifest.components.deploymentCardGeometry.ref);
const {bundleHash,...body}=geometry;
assert.equal(hash(body),manifest.components.deploymentCardGeometry.integrity.value);
const [bridge,meeting]=geometry.cards.filter(card=>card.engagementScale==='Standard');
const source='Standard:deployment';
const facts=card=>({dimensions:card.geometry.dimensions,markers:card.geometry.markers,
  zones:[card.geometry.red,card.geometry.blue],art:card.evidence.sourceContentHash});
const a=facts(bridge),b={...a, art:'engineering-visual-change'},c=facts(meeting);
const stamp='2026-11-26T00:00:00.000Z';
const rows=[a,b,c].map((value,i)=>({artifactId:source,kind:'source',version:hash(value),createdAt:stamp,
  contentRef:{facts:value},activate:i===0}));
const [first,second,third]=rows.map(r=>r.version);
const add=(artifactId,kind,ref,fieldKeys)=>rows.push({artifactId,kind,version:'1',createdAt:stamp,activate:true,
  dependencies:[{artifactId:ref,version:ref===source?first:'1',...(fieldKeys?{factKeys:fieldKeys}:{})}]});
add('claim:route','claim',source,['zones','markers']);
add('plan:route','section','claim:route');
add('fact:size','fact',source,['dimensions']);
add('ui:art','section',source,['art']);
add('old:unindexed','claim',source);
add('unknown:field','claim',source,['unrecorded']);
function plan(gate,fromVersion,toVersion) {
  return gate.planRefresh({confirmedByHuman:true,changes:[{artifactId:source,fromVersion,toVersion}]});
}
const ids=result=>result.affectedVersions.map(x=>x.artifactId).sort();
const gate=createStarcraftTmgIncrementalSkillFreshnessRuntimeV1({releaseManifestHash:manifest.manifestHash,artifacts:rows});
const visual=plan(gate,first,second);
assert.deepEqual(ids(visual),[source,'ui:art','old:unindexed','unknown:field'].sort());
gate.publishSelective({planId:visual.planId,confirmedByHuman:true,replacements:visual.changes});
let store=createSqliteStarcraftTmgStrategyReleaseStoreV1({filename:path.join(dir,'isolated.sqlite')});
const checkpoint=await gate.saveCheckpoint({store,createdAt:stamp});
await store.close();
store=createSqliteStarcraftTmgStrategyReleaseStoreV1({filename:path.join(dir,'isolated.sqlite')});
try {
  const loaded=await restoreStarcraftTmgSkillFreshnessCheckpointV1({store,checkpointHash:checkpoint.record.artifactHash,
    releaseManifestHash:manifest.manifestHash});
  const moved=plan(loaded,second,third);
  assert(ids(moved).includes('plan:route') && ids(moved).includes('claim:route'));
  assert(!ids(moved).includes('fact:size'));
  const result={cosmeticInput:'injected art-only change',cosmeticReview:ids(visual),
    actualLayoutComparison:[bridge.recordKey,meeting.recordKey],layoutReview:ids(moved),
    retainedBoardDimensions:a.dimensions,oldClaimStillTracked:true,missingEvidenceRequiresReview:true,
    coldVerified:true,productionPublications:0,externalModelCalls:0};
  await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await store.close();}
