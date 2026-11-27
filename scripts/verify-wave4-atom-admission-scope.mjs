import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8'));
const inventory=await read('content/source-releases/wave4-20261127/abilities/ability-diff.json'),progress=await read('coordination/wave4/ability-wiring-progress.json');
assert.equal(inventory.inventoryHash,progress.inventoryHash);
const builderRef='build/wave4-web/stukov-units/candidate/armyBuilder.json',builder=await read(builderRef);
const heldIds=new Set(progress.sourceHeldDefinitions.map(d=>d.definitionId));
const heldRecords=[...new Set([...heldIds].map(id=>inventory.definitions.find(d=>d.definitionId===id).recordKey))].sort();
assert.equal(heldIds.size,39);assert.equal(heldRecords.length,4);
for(const key of heldRecords){assert.ok(builder.catalogueSelection.excludedRecordKeys.includes(key));assert.ok(!builder.catalogueSelection.selectedRecordKeys.includes(key));}
const indirect=inventory.definitions.filter(d=>heldRecords.includes(d.recordKey)&&!heldIds.has(d.definitionId)).map(d=>d.definitionId);
assert.equal(indirect.length,7);assert.ok(indirect.every(id=>id.startsWith('unit:alarak/')));
const atoms=inventory.newAtoms.filter(a=>!a.withdrawnOnly),blockedOnly=atoms.filter(a=>a.requiredByDefinitionIds.every(id=>heldRecords.includes(inventory.definitions.find(d=>d.definitionId===id).recordKey)));
assert.equal(atoms.length,18);assert.equal(blockedOnly.length,2);
const pendingRecords=builder.catalogueSelection.excludedRecordKeys.filter(key=>!heldRecords.includes(key));assert.equal(pendingRecords.length,13);
const result={schema:'starcraft_tmg_wave4_atom_admission_scope_v1',status:'passed_read_only_analysis',scope:'planned_reviewed_Wave4_human_admission_with_held_records_excluded',
 inventoryHash:inventory.inventoryHash,sourceReviewHash:progress.sourceReviewHash,builderRef,builderHash:builder.bundleHash,
 currentBuilderSelectedRecords:builder.catalogueSelection.selectedRecordKeys.length,fullSourceRecords:builder.catalogueSelection.sourceRecordCount,
 sourceHeldDefinitions:39,sourceHeldRecordKeys:heldRecords,indirectlyUnavailableDefinitionIds:indirect,
 reviewedPendingRuntimeRecordKeys:pendingRecords,allRequiredNewAtoms:18,requiredByNonHeldRecords:16,heldRecordOnlyAtoms:blockedOnly.map(a=>({atomId:a.atomId,requiredByDefinitionIds:a.requiredByDefinitionIds})),
 implementedNewGameAtoms:progress.analysis.implementedNewGameAtoms,remainingNonHeldAtoms:16-progress.analysis.implementedNewGameAtoms,
 frozenDenominatorUnchanged:true,nativeActionsAdded:0,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/atom-admission-scope.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,requiredByNonHeldRecords:16,heldRecordOnlyAtoms:blockedOnly.length,remainingNonHeldAtoms:result.remainingNonHeldAtoms,reviewedPendingRecords:pendingRecords.length}));
