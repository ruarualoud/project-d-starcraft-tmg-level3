// Minimise the separate joint-search miss exposed after the v780 contact fix.
// No Provider, scene actions, production write or passed v780 assertions rerun.
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {queryStarcraftTmgStaticFormationV1 as query} from '../packages/online-agent-session/static-formation-query-v1.mjs';
const root=path.join(path.resolve(process.argv[2]),'workspace/laboratory-sources');
let state;
for(const f of await fs.readdir(root)){
  if(!f.endsWith('.json.gz'))continue;
  const candidate=JSON.parse(gunzipSync(await fs.readFile(path.join(root,f)))).authority.state;
  if(hash(candidate)==='a70c5ae3cad610092b9185831193b8f9dfdf7a92977f1273040a9c492b0daef9'){state=candidate;break;}
}
if(!state)throw Error('FROZEN_SOURCE_REQUIRED');
state.board.terrain=[];state.terrain=[];
for(const p of state.pieces){p.isOnField=false;for(const m of p.models)m.isOnField=false;}
const result=query({state,arguments:{unitId:'player2-raptor',anchors:[{xInches:15,yInches:15}],
  jointUnits:[{unitId:'marine-1',anchors:[{xInches:19,yInches:15}]}],maximumJointEvaluations:2,maximumJointOptions:1}});
console.log(JSON.stringify({optionCount:result.optionCount,search:result.search,misses:result.misses,
  actionsApplied:0,productionWrites:0,providerCalls:0}));
