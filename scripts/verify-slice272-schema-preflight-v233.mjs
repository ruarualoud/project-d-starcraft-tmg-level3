// Concrete v233 failure: malformed local schema was discovered AFTER billing.
// Exercise the actual secure factory with an injected physical Worker; no key,
// network, Provider or game operation is used by this red/green reproduction.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3 as profile } from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
const [base, phase] = process.argv.slice(2);
assert.ok(base && ['red','green','green2'].includes(phase));
const dest = base + '/common-v233-schema-preflight-' + phase + '.private.json';
await (await fs.open(dest,'wx',0o600)).close();
const report = { phase, ok:false, providerCalls:0, localWorkerCalls:0, events:[] };
let secure;
try {
  secure = await createRosterPlanningSecureDeliberationFactoryV1({ profile,
    readCredential: async () => ({ credentialBytes: Buffer.from('local-fixture-not-a-credential') }),
    createWorker: () => ({ attachCredential: async () => ({ok:true,workerRef:'local-fixture'}),
      close:async()=>{}, send:async()=>{
        report.localWorkerCalls++;
        return {status:200,payload:{status:'completed',model:profile.model,
          usage:{input_tokens:1,output_tokens:1,total_tokens:2},output:[{type:'message',role:'assistant',status:'completed',
            content:[{type:'output_text',text:'{"schemaVersion":"minimal_probe_v1","roundKind":"connectivity_probe","ok":true}'}]}]}};
      } }),
  });
  const port = await secure.factory.createForRun({sessionId:'local-schema-check',runKind:'probe',onEvent:async e=>report.events.push(e)});
  const schema={type:'object',properties:{schemaVersion:{type:'string',enum:['minimal_probe_v1']},
    roundKind:{type:'string',enum:['connectivity_probe']},ok:{type:'boolean',enum:[true]}},
    required:['schemaVersion','roundKind','ok'],additionalProperties:false};
  const request={roundKind:'connectivity_probe',roundIndex:1,contextHash:'a'.repeat(64),promptPack:'local-test',promptNodes:[],
    userMessage:'local fixture',responseContract:{},responseFormat:{kind:'provider_strict_json_schema',schemaName:'minimal_probe_v1',schema,
      outputContractRef:{id:'minimal-provider-probe',version:'1',hash:'b'.repeat(64)}}};
  await assert.rejects(port.deliberate(request));
  assert.equal(report.localWorkerCalls,0,'BAD_LOCAL_SCHEMA_MUST_BE_REJECTED_BEFORE_ANY_PAID_WORKER_SEND');
  assert.ok(!report.events.some(e=>e.type==='provider_dispatch'));
  const repaired=structuredClone(request);
  for(const field of ['schemaVersion','roundKind'])Object.assign(repaired.responseFormat.schema.properties[field],{minLength:1,maxLength:80});
  delete repaired.responseFormat.schema.properties.ok.enum;
  const result=await port.deliberate(repaired);
  assert.equal(result.output.ok,true);assert.equal(result.receipt.providerSchemaValid,true);
  assert.equal(report.localWorkerCalls,1); report.ok=true;
} catch(error){report.failure=String(error.message);process.exitCode=1;}
finally{await secure?.close();}
await fs.writeFile(dest,JSON.stringify(report,null,2),{mode:0o600});
console.log(JSON.stringify({ok:report.ok,phase,failure:report.failure,localWorkerCalls:report.localWorkerCalls,providerCalls:0}));
