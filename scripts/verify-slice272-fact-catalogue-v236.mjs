// Concrete v234 regression: a duplicated flat index consumed 782705 bytes and
// the model invented a hash-shaped fact reference. Verify lossless short handles
// at the actual Plan tool seam; do not rerun unrelated workspace gates.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import * as tools from '../packages/roster-strategist/roster-plan-edit-tools-v1.mjs';
const [base, phase] = process.argv.slice(2);
assert.ok(base && ['red','green'].includes(phase));
const dest = `${base}/common-v236-fact-catalogue-${phase}.private.json`;
await (await fs.open(dest,'wx',0o600)).close();
const request = JSON.parse(gunzipSync(await fs.readFile(
  `${base}/B/structured-plan-tools-v234/request-01.private.json.gz`)).toString());
const old = request.promptNodes.find(n=>n.nodeType==='plan-edit-tools').content;
const facts = old.facts;
const report = { phase, ok:false, providerCalls:0, nativeCalls:0,
  actualSavedFactCount:facts.length, oldIndexBytes:Buffer.byteLength(JSON.stringify(facts)) };
try {
  assert.equal(typeof tools.buildRosterPlanFactCatalogueV2,'function',
    'ACTUAL_PLAN_FACT_DELIVERY_IS_DUPLICATED_FLAT_HASH_INDEX');
  const catalogue = tools.buildRosterPlanFactCatalogueV2(facts);
  const decoded = [];
  const visit = (node, segments=[]) => {
    for(const ref of node.$text || []) decoded.push({ref, kind:'text', sourcePath:segments.join('.')});
    for(const row of node.$number || []) decoded.push({...row,kind:'number',sourcePath:segments.join('.')});
    for(const [key,value] of Object.entries(node)) if(!['$text','$number'].includes(key)) visit(value,[...segments,key]);
  };
  visit(catalogue.tree);
  const byRef = new Map(decoded.map(row=>[row.ref,row]));
  assert.equal(byRef.size,facts.length);
  facts.forEach((fact,i)=>{
    const {ref,...rest}=byRef.get(`F${i+1}`);
    assert.deepEqual({...rest,factId:fact.factId},fact,'Every original path/value/scope must survive');
  });
  report.newIndexBytes=Buffer.byteLength(JSON.stringify(catalogue));
  assert.ok(report.newIndexBytes<report.oldIndexBytes,'No claimed optimization without lower actual bytes');
  const originalNumber=facts.find(f=>f.kind==='number'&&f.value===20&&/costS/.test(f.sourcePath));
  assert.ok(originalNumber);
  const {kind,sourcePath,factId,...numericRow}=originalNumber;
  const packet={premiseFacts:{numbers:[{...numericRow,factId:sourcePath}],texts:[]}};
  const port=tools.createRosterPlanEditToolsV1({plan:{planHash:'a'.repeat(64),planVersion:20},
    paths:['publicSummaryText'],factPacket:packet,protocol:tools.STRUCTURED_PLAN_TOOLS_PROTOCOL_V2});
  assert.equal(port.descriptor().protocol,tools.STRUCTURED_PLAN_TOOLS_PROTOCOL_V2);
  assert.ok(port.descriptor().factCatalogue && !port.descriptor().facts);
  const call={name:'plan.fill_argument',arguments:{claimPath:'publicSummaryText',
    intentText:'规则来源绑定测试',actionsText:'保留原游戏策略',reasonText:'这里只检验事实交付',
    alternativesText:'不把引用成功当作策略通过',conditionsText:'独立语义审核仍需完成',factIds:['F1']}};
  assert.equal(port.callTool(call).isError,false);
  const bound=port.snapshot().edits[0].facts[0];
  assert.equal(bound.value,originalNumber.value);
  assert.equal(bound.sourcePath,originalNumber.sourcePath);
  assert.equal(bound.factId,originalNumber.factId,'Stored binding stays canonical, not a short mutable label');
  const invalid=structuredClone(call);invalid.arguments.factIds=['F99999'];
  assert.equal(port.callTool(invalid).structuredContent.code,'PLAN_EDIT_FACT_UNKNOWN');
  const legacy=tools.createRosterPlanEditToolsV1({plan:{planHash:'a'.repeat(64),planVersion:20},
    paths:['publicSummaryText'],factPacket:packet});
  assert.equal(legacy.descriptor().protocol,'structured_plan_tools_v1');
  assert.deepEqual(legacy.descriptor().facts,[originalNumber]);
  call.arguments.factIds=[originalNumber.factId];
  assert.equal(legacy.callTool(call).isError,false,'Retained legacy hash references still bind');
  report.ok=true;report.losslessRows=decoded.length;report.hostBoundSourceUnchanged=true;
  report.legacyDeliveryUnchanged=true;report.strategyEquivalenceNotClaimed=true;
}catch(error){report.failure=String(error.stack||error.message);process.exitCode=1;}
await fs.writeFile(dest,JSON.stringify(report,null,2),{mode:0o600});
console.log(JSON.stringify(report));
