import assert from 'node:assert/strict';
import {rosterTeachRecoveryContractV1,rosterTeachFrameworkContractV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const kind='teach_framework_query_delta_recovery';
const missing=rosterTeachRecoveryContractV1(kind,false).providerSchema.properties.kind.enum;
assert.equal(missing.includes('patch'),false,'Actual229 forbids handwritten geometry yet its schema still offered patch');
assert.deepEqual([...missing].sort(),['inspect','prerequisite_query','retained_evidence']);
const available=rosterTeachRecoveryContractV1(kind,true).providerSchema.properties.kind.enum;
assert.equal(available.includes('candidate_parameters'),true);
assert.equal(available.includes('patch'),false);
assert.equal(rosterTeachFrameworkContractV1(kind).providerSchema.properties.kind.enum.includes('patch'),true,
 'Ordinary non-geometry deltas remain available');
console.log(JSON.stringify({passed:true,actualInput:229,noContradictoryGeometryActions:true,ordinaryDeltaUnchanged:true,providerCalls:0}));
