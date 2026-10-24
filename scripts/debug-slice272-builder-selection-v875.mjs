// Reproduce actual B's profile-ID candidate being treated as unselected by
// branch discovery. Frozen Native baseline/menu, captured (NOT audited) branches.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as branchModule from '../packages/roster-strategist/roster-budget-branch-query-v1.mjs';
const [root,out,previous]=process.argv.slice(2),copy=structuredClone;
const get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const w=state.work.find(w=>w.id.endsWith(':audit-baseline3'));
const actual=(await get(w.resultRef)).value,baseline=actual.receipt,candidate=actual.request.candidateInput;
const menu=await get(state.evidence.find(e=>e.id==='product:builder-menu').artifactRef);
const named=copy(candidate);
for(const u of named.units){const row=baseline.audit.units.find(row=>row.unitInstanceId===u.unitInstanceId);
  u.compositionKind=row.unitCompositionResult.compositionKind;delete u.compositionProfileId;
  u.upgrades=u.upgrades.map((upgrade,i)=>({...upgrade,upgradeName:row.selectedUpgrades[i].upgradeName}));
  u.upgrades.forEach(upgrade=>delete upgrade.purchasableUpgradeProfileId);}
const policy=branchModule.ROSTER_BUDGET_CURRENT_GENERATION_POLICY??'breadth_first_v2';
function inspect(input,generationPolicy=policy,audit=baseline){let calls=0;const captured=[];
  const result=branchModule.queryRosterBudgetBranchesV1({candidateInput:input,generationPolicy,
    maximumEvaluations:256,maximumMutationDepth:2,armyBuilderPort:{enumerateArmyBuildingChoices:()=>copy(menu),
      evaluateRosterCandidate:draft=>{if(!calls++)return copy(audit);captured.push(copy(draft));
        return {status:'unknown',rejectionKind:'offline_generation_capture_not_native_verdict'};}}});
  return {result,captured};}
const prior=previous?JSON.parse(await fs.readFile(previous,'utf8')):null,checks=[];
async function check(name,fn){const old=prior?.checks.find(c=>c.name===name&&c.pass);
  if(old){checks.push({...old,inheritedFrom:previous});return;}
  try{checks.push({name,pass:true,...await fn()});}catch(e){checks.push({name,pass:false,error:e.message});}
  await fs.writeFile(out,JSON.stringify({complete:false,checks},null,2)+'\n');
  const last=checks.at(-1);console.log(JSON.stringify({...last,...(last.error?{error:last.error.slice(0,350)}:{})}));}
await check('actual-id-and-name-inputs-use-identical-native-selected-units',()=>{
  const before=JSON.stringify(candidate),a=inspect(candidate),b=inspect(named);
  const selected=new Map(baseline.audit.units.map(u=>[u.unitInstanceId,u]));
  const duplicate=a.result.rejectedBranches.flatMap(row=>row.steps).filter(step=>
    step.mutationKind==='add_upgrade'&&selected.get(step.subjectId)?.selectedUpgrades.some(u=>u.purchasableUpgradeProfileId===step.detailId)
    ||step.mutationKind==='change_composition'&&selected.get(step.subjectId)?.unitCompositionResult.compositionProfileId===step.detailId);
  assert.deepEqual(duplicate,[],'Already selected composition/upgrades must not be offered again');
  assert.deepEqual(a.result.rejectedBranches.map(r=>r.branchId),b.result.rejectedBranches.map(r=>r.branchId));
  assert.deepEqual(a.result.capacityDirections,b.result.capacityDirections);
  assert.equal(JSON.stringify(candidate),before);assert.equal(a.result.branches.length,0);
  return {generationPolicy:policy,capturedBranches:a.captured.length,sourceUnchanged:true,noLegalityClaimFromFixture:true};
});
await check('native-selection-missing-fails-instead-of-inventing-selection',()=>{
  const broken=copy(baseline);broken.audit.units=broken.audit.units.slice(1);
  assert.throws(()=>inspect(candidate,policy,broken),/ROSTER_BUDGET_NATIVE_SELECTION_MISSING/);
});
await check('old-page-policy-retained-and-new-page-identifies-generation',()=>{
  assert.equal(policy,'breadth_first_v3');
  const old=inspect(candidate,'breadth_first_v2'),current=inspect(candidate);
  assert(old.result.totalOneStepMutations>current.result.totalOneStepMutations);
  assert.equal(old.result.generationPolicy,'breadth_first_v2');
  assert.equal(current.result.generationPolicy,'breadth_first_v3');
  assert.equal(current.result.exactBudgetImpossibilityClaimed,false);
  assert.deepEqual(current.result.searchScope.excludedOperations,['remove_unit','remove_upgrade','replace_tactical_card']);
  return {oldPopulationPreserved:true,newLegalityStillRequiresNativeAudit:true};
});
await fs.writeFile(out,JSON.stringify({pass:checks.every(c=>c.pass),complete:true,checks,
  source:{root,workId:w.id,baselineResultRef:w.resultRef,menuRef:state.evidence.find(e=>e.id==='product:builder-menu').artifactRef},
  actualProviderCalls:0,newNativeAudits:0,productionWrites:0,trainingTruth:false},null,2)+'\n');
process.exitCode=checks.every(c=>c.pass)?0:1;
