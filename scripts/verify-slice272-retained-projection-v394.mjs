import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectRosterTeachPromptEvidenceV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const draft=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
function find(value){
  if(!value||typeof value!=='object')return null;
  if(value.allTerrainCellsPreserved&&value.fullGeometryAvailable&&value.terrainGroups)return value;
  for(const child of Object.values(value)){const result=find(child);if(result)return result;}
  return null;
}
const view=find(draft.teachFramework.state.pendingModelCall);
assert(view,'actual paid172 pending request contains already-projected geometry');
assert(view.terrainGroups.some(group=>!group.rectangles));
const archive=new Map();
assert.deepEqual(projectRosterTeachPromptEvidenceV1(view,archive),view,'a retained view must preserve its original geometry reference');
assert.equal(archive.has(view.evidenceObjectHash),false,'do not overwrite original full geometry with its summary');
assert.doesNotThrow(()=>projectRosterTeachPromptEvidenceV1([draft.teachFramework.context,draft.teachFramework.state],archive),
  'exact persisted pending request must survive complete restart projection');
console.log(JSON.stringify({passed:true,actualReply:172,fullRestartProjection:true,originalGeometryReferencePreserved:true,providerCalls:0}));
