// v326 call014 requested kind:"objective". It must not silently become balanced.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { queryStarcraftTmgStaticFormationV1 } from '../packages/online-agent-session/static-formation-query-v1.mjs';
import { STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 as contracts } from '../packages/online-agent-session/spatial-query-contracts-v1.mjs';
const [sourceFile, replyFile, outputFile] = process.argv.slice(2);
const report={providerCalls:0,checks:[]};
try {
 const state=JSON.parse(gunzipSync(await fs.readFile(sourceFile))).authority.state;
 const reply=JSON.parse(gunzipSync(await fs.readFile(replyFile))).output;
 const query=reply.queries.find(q=>q.queryId==='q-capability-marker-control-near-marker2-repair');
 const args=JSON.parse(JSON.parse(query.toolRequestJson).argumentsJson);
 assert.equal(args.formationObjectives[0].kind,'objective');
 assert.throws(()=>queryStarcraftTmgStaticFormationV1({state,arguments:args}),
   error=>error.code==='STATIC_FORMATION_ARGUMENTS_INVALID' && error.message.includes('control_objective'),
   'Unsupported strategic intent was silently discarded instead of returning the supported contract');
 report.checks.push('actual_unsupported_model_intent_rejected_before_search_with_valid_enum');
 const description=contracts['space.solve_static_formation'].arguments.formationObjectives;
 assert(description.kind.includes('control_objective'));
 assert(!description.kind.includes('objective'));
 report.checks.push('the_same_valid_objective_enum_is_exposed_before_model_selection');report.ok=true;
}catch(error){report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
