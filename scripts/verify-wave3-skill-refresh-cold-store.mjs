import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStarcraftTmgIncrementalSkillFreshnessRuntimeV1, restoreStarcraftTmgSkillFreshnessCheckpointV1 } from '../packages/strategy-skills/incremental-skill-freshness-runtime-v1.mjs';
import { createSqliteStarcraftTmgStrategyReleaseStoreV1 } from '../packages/strategy-skills/sqlite-strategy-release-store-v1.mjs';

const read = file => JSON.parse(readFileSync(file,'utf8'));
const pilot = read('build/ticket-28-wave3-skill-refresh-v1/terran-pilot-input.public.json');
const release = read('content/source-releases/wave3-20261125-human-match-v1.json');
const releaseManifestHash = release.manifestHash;
assert.match(releaseManifestHash, /^[a-f0-9]{64}$/);
assert.equal(pilot.binding.candidateDatasetHash, release.source.datasetHash);
const unit = 'army_units:goliath';
const oldVersion = pilot.binding.originalDatasetHash;
const newVersion = pilot.binding.candidateDatasetHash;
const delta = pilot.changedFacts.find(row => row.ref === unit).fields.find(field => field.field === 'small.cost');
const regressionId = 'budget-review:' + pilot.skillId;
const request = {confirmedByHuman:true, changes:[{artifactId:unit, fromVersion:oldVersion, toVersion:newVersion}]};
const [step, suppliedDir, checkpointHash] = process.argv.slice(2);
const dir = suppliedDir ?? mkdtempSync('build/ticket-28-wave3-freshness-cold-');
const store = createSqliteStarcraftTmgStrategyReleaseStoreV1({filename:join(dir,'refresh.sqlite')});
const resume = hash => restoreStarcraftTmgSkillFreshnessCheckpointV1({store,checkpointHash:hash,releaseManifestHash});
const stamp = new Date().toISOString();
const save = (gate, time = stamp) => gate.saveCheckpoint({store,createdAt:time});
function nextProcess(name, hash) {
  const child = spawnSync(process.execPath,[fileURLToPath(import.meta.url),name,dir,hash],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr || child.stdout);
}
try {
  if (step === undefined) {
    const section = pilot.skillId + '/' + pilot.section;
    const gate = createStarcraftTmgIncrementalSkillFreshnessRuntimeV1({releaseManifestHash, artifacts:[
      {kind:'source',artifactId:unit,version:oldVersion,activate:true,contentRef:{cost:delta.before}},
      {kind:'source',artifactId:unit,version:newVersion,contentRef:{cost:delta.after}},
      {kind:'section',artifactId:section,version:pilot.parentHash,activate:true,
        dependencies:[{artifactId:unit,version:oldVersion}]},
      {kind:'regression',artifactId:regressionId,version:'1',activate:true,
        dependencies:[{artifactId:section,version:pilot.parentHash}]},
    ]});
    const plan = gate.planRefresh(request);
    gate.recordRegression({planId:plan.planId,regressionId,severity:'high',status:'failed',evidenceRef:'engineering-high'});
    const result = await save(gate);
    assert.equal((await save(gate)).cached,true);
    await store.close();
    nextProcess('resume-high',result.record.artifactHash);
    console.log(dir);
  } else if (step === 'resume-high') {
    await assert.rejects(() => restoreStarcraftTmgSkillFreshnessCheckpointV1({store,checkpointHash,releaseManifestHash:'0'.repeat(64)}),
      /SKILL_FRESHNESS_CHECKPOINT_RELEASE_MISMATCH/);
    const gate = await resume(checkpointHash);
    const plan = gate.planRefresh(request);
    assert.equal(plan.affectedVersions.length,3);
    const publish = {planId:plan.planId,confirmedByHuman:true,replacements:request.changes};
    assert.throws(() => gate.publishSelective(publish), error => {
      assert.deepEqual(error.blockingRegressionIds,[regressionId]);
      assert.deepEqual(error.missingRegressionIds,[]);
      return true;
    });
    gate.recordRegression({planId:plan.planId,regressionId,severity:'high',status:'passed',evidenceRef:'engineering-reviewed'});
    gate.publishSelective(publish);
    const result = await save(gate);
    await store.close();
    nextProcess('resume-selected',result.record.artifactHash);
  } else {
    assert.equal(step,'resume-selected');
    const gate = await resume(checkpointHash);
    assert.equal(gate.read().activeVersions[unit],newVersion);
    assert.equal(gate.readVersion({artifactId:unit,version:oldVersion}).contentRef.cost,delta.before);
    assert.equal(gate.readVersion({artifactId:unit,version:newVersion}).contentRef.cost,delta.after);
    const rollback = gate.rollback({confirmedByHuman:true,targetRegistryRevision:0});
    assert.equal(rollback.activeVersions[unit],oldVersion);
    const result = {releaseManifestHash,oldCost:delta.before,newCost:delta.after,
      recoveredHighInFreshProcess:true,recoveredSelectedVersionInFreshProcess:true,
      wrongReleaseRejected:true,rollbackRevision:rollback.registryRevision,
      selectedCheckpoint:checkpointHash,providerCalls:0,productionWrites:0};
    writeFileSync(join(dir,'result.public.json'),JSON.stringify(result,null,2)+'\n');
    await store.close();
  }
} finally { await store.close(); }
