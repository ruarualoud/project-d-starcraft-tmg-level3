// Extract prose assertions, then compare them with the CURRENT Native audit.
// No strategy ranking, new Rules calculation, Plan edit or model verdict here.
import {isDeepStrictEqual as equal} from 'node:util';
import {projectRosterBuilderAuditNumericFactsV1} from './roster-builder-candidate-facts-v1.mjs';
import {projectRosterPlanTextLeavesV1} from './roster-plan-synchronization-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {createStarcraftTmgOutputContractV1,outputContractRefStarcraftTmgV1,
  validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const copy=structuredClone,checkId='component_facts:selected_inventory';
export const ROSTER_INVENTORY_COMPARISON_VERSION=9;
const str={type:'string',minLength:0,maxLength:65536},arr=items=>({type:'array',minItems:0,items}),obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const fields=['startingModels','startingSupply','compositionKind','baseMineralCost','upgradeMineralCost','totalMineralCost','upgrades',
  'unitCount','startingModelCount','selectedUpgradeCount','mineralBudget','mineralSpent','mineralUnspent','vespeneLimit','vespeneSpent','vespeneUnspent','vespeneGasCost'];
// Static domains, not inferred from present values: an absent legitimate Native
// field remains a source problem; a wrong-kind field is an extraction problem.
const fieldsByKind={
  unit:['startingModels','startingModelCount','startingSupply','compositionKind','baseMineralCost','upgradeMineralCost','totalMineralCost','upgrades'],
  roster:['unitCount','startingModelCount','startingModels','startingSupply','selectedUpgradeCount','mineralBudget','mineralSpent','mineralUnspent','vespeneLimit','vespeneSpent','vespeneUnspent'],
  card:['vespeneGasCost'],faction:[]
};
// Paragraph ownership does not change an assertion's explicit subject. Only
// whole-roster-exclusive fields may cross a component paragraph's binding;
// shared count fields still require the bound unit and cannot imply aggregates.
const rosterOnlyFields=fieldsByKind.roster.filter(field=>!fieldsByKind.unit.includes(field)&&!fieldsByKind.card.includes(field));
const allowsClaimSubject=(passage,subject,field)=>!passage.boundSubject
  ||passage.boundSubject===subject.handle
  ||subject.kind==='roster'&&rosterOnlyFields.includes(field);
const resourceBudgetSemantics={
  mineralBudget:'Total mineral allowance, not spending or remaining minerals.',
  mineralSpent:'Minerals already spent on the current roster.',
  mineralUnspent:'Remaining/unspent minerals, not the amount already spent.',
  vespeneLimit:'Total vespene allowance, not spending or remaining gas.',
  vespeneSpent:'Vespene already spent on the current roster.',
  vespeneUnspent:'Remaining/unspent vespene (gas), not the amount already spent.'
};
// Only reject an explicitly incompatible accounting label. Ambiguous sentences
// remain the extractor's responsibility; Host never changes a quote or number.
function explicitResourceAccountingField(quote){
  // A used/allowance ratio expressly names multiple quantities. The lexical
  // guard may reject only single-quantity labels, never reinterpret the ratio.
  if(/\d[\d,.]*\s*\/\s*\d[\d,.]*/u.test(quote))return null;
  const mineral=/\bminerals?\b|矿(?:物|石)?/iu.test(quote),gas=/\b(?:vespene|gas)\b|气体|瓦斯/iu.test(quote);
  if(mineral===gas)return null;
  const unspent=/\b(?:unspent|remaining|leftover)\b|剩余|未花(?:费)?|未使用/iu.test(quote);
  const spent=/\b(?:spent|spending|paid)\b|已花(?:费)?|已消耗|已支付/iu.test(quote);
  const limit=/\b(?:budget|allowance|limit|target)\b|预算|额度|上限|目标/iu.test(quote);
  if(Number(unspent)+Number(spent)+Number(limit)!==1)return null;
  return mineral?(unspent?'mineralUnspent':spent?'mineralSpent':'mineralBudget')
    :(unspent?'vespeneUnspent':spent?'vespeneSpent':'vespeneLimit');
}


const budgetRatioPattern=/(?<![0-9.,/])([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*\/\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*(minerals?\b|vespene\b|gas\b|矿(?:物|石)?|瓦斯|气体|气)(?=$|[\s,.;:!?，。；：！？）)\]】])/giu;
function explicitBudgetRatio(quote){
  const [ratio,other]=quote.matchAll(budgetRatioPattern);
  if(!ratio||other)return null;
  const [,spentText,limitText,resource]=ratio;
  const spent=Number(spentText.replaceAll(',','')),limit=Number(limitText.replaceAll(',',''));
  if(!Number.isSafeInteger(spent)||!Number.isSafeInteger(limit))return null;
  return /minerals?|矿/iu.test(resource)?{mineralSpent:spent,mineralBudget:limit}:{vespeneSpent:spent,vespeneLimit:limit};
}

// The model identifies a current claim. The exact quote owns both values;
// copying Native into the extraction or listing only the limit cannot pass it.
function expandExplicitBudgetRatios(claims,passages,normalizations){
  const expanded=[],seen=new Set();
  for(const [index,claim] of claims.entries()){
    const passage=passages.get(claim.passageId);
    const ratio=passage?.text.includes(claim.quote)&&claim.subject==='roster'&&claim.operator==='equals'
      &&Object.hasOwn(resourceBudgetSemantics,claim.field)?explicitBudgetRatio(claim.quote):null;
    if(!ratio||!Object.hasOwn(ratio,claim.field)){
      expanded.push({index,claim});
      continue;
    }
    const key=JSON.stringify([claim.passageId,claim.quote]);
    if(seen.has(key))continue;
    seen.add(key);
    normalizations.push({rule:'literal_budget_ratio_v1',to:'/claims/'+index,quote:claim.quote,
      originalField:claim.field,originalValue:claim.expectedValueJson,assertedFromQuote:ratio,originalReplyUnchanged:true});
    for(const [field,value] of Object.entries(ratio))
      expanded.push({index,claim:{...claim,field,expectedValueJson:JSON.stringify(value)}});
  }
  return expanded;
}

// Exact cardinality notation names a unit type (and optionally composition),
// not the whole army. Resolve that explicit scope from current Native rows;
// never expand a group into model counts, upgrades, or per-unit assertions.
function explicitUnitCardinality(quote,state){
  const escaped=value=>value.replace(/[.*+?^$\{\}()|[\]\\]/gu,'\\$&');
  const aliases={small:['small','小','小型'],medium:['medium','中','中型'],large:['large','大','大型']};
  const units=state.subjects.filter(s=>s.kind==='unit'),choices=new Map();
  for(const u of units){
    const composition=state.values[u.handle]?.compositionKind;
    choices.set(u.recordKey+'|',{name:u.name,recordKey:u.recordKey,compositionKind:null});
    if(typeof composition==='string')choices.set(u.recordKey+'|'+composition,{name:u.name,recordKey:u.recordKey,compositionKind:composition});
  }
  const matches=[];
  for(const choice of choices.values()){
    const tokens=choice.compositionKind?(aliases[choice.compositionKind]??[choice.compositionKind]):[''];
    for(const token of tokens){
      const suffix=token?'\\s*(?:'+escaped(token)+'|\\('+escaped(token)+'\\))':'';
      const match=new RegExp('^'+escaped(choice.name)+suffix+'\\s*[×x*]\\s*(\\d+)\\s*$','iu').exec(quote.trim());
      if(!match)continue;
      const members=units.filter(u=>u.recordKey===choice.recordKey&&(!choice.compositionKind||state.values[u.handle]?.compositionKind===choice.compositionKind));
      matches.push({...choice,asserted:Number(match[1]),members});break;
    }
  }
  return matches.length===1?matches[0]:null;
}

// Exact lifecycle allowance labels do not assert purchased inventory. This
// identifies the quantity's domain, NOT its truth. Keep the independent
// deployment review responsible even when the quoted amount is wrong. Mixed
// sentences or named unit/whole-roster totals do not match this narrow guard.
function explicitDeploymentSupplyClaim(quote){
  const text=quote.trim();
  return /^(?:第[0-9一二三四五六七八九十]+(?:轮|回合)|首轮|首回合)\s*(?:起始|初始|开始时(?:的)?|可用|上限)\s*(?:Supply(?:\s*Pool)?|补给(?:池|额度)?)(?:\s*(?:为|是|=|：|:))?\s*\d+(?:\.\d+)?[。.]?$/iu.test(text)
    || /^(?:round\s*\d+|first\s+round)\s+(?:starting|initial|available)\s+supply(?:\s+pool)?(?:\s*(?:is|of|=|:))?\s+\d+(?:\.\d+)?[.]?$/iu.test(text)
    || /^(?:mission(?:\s+card)?[’']?s?\s+starting\s+supply|任务(?:卡)?(?:的)?起始\s*(?:Supply|补给))(?:\s*(?:is|of|为|是|=|：|:))?\s*\d+(?:\.\d+)?[。.]?$/iu.test(text);
}

const supplySemantics={
  unitStartingSupply:'Supply of ONE selected unit at its purchased full-strength composition, not its current on-board or future surviving Supply.',
  rosterStartingSupply:'Sum of full-strength Supply over ALL units in the selected roster, including reserves. It is NOT mission startingSupply, a round Supply Pool, available deployment Supply or an allowance.',
  deploymentSupply:'Mission/round starting or available Supply is outside purchased inventory. Do not extract it as roster.startingSupply; leave it to deployment_facts:initial_reserves_and_supply. Out of this check never means factually correct.'
};

const schema=obj({action:{...str,enum:['finish']},publicReason:str,
  coverage:arr(obj({passageId:str,status:{...str,enum:['claims','no_claim','ambiguous']},publicReason:str})),
  claims:arr(obj({passageId:str,quote:str,subject:str,field:{...str,enum:fields},
    operator:{...str,enum:['equals','includes_all','excludes_all']},expectedValueJson:str}))});
const contract=createStarcraftTmgOutputContractV1({id:'roster.inventory_claim_extraction',version:'1.8.0',
  schemaName:'roster_inventory_claim_extraction_v1',providerSchema:schema,modelOwnedFields:Object.keys(schema.properties),
  hostOwnedFields:['verdict','inventoryVerification','acceptanceGranted'],
  mapperRef:{id:'roster.inventory_claim_mapper',version:'1.0.0',hash:hash('roster.inventory_claim_mapper.v1')},
  semanticValidatorRef:{id:'roster.inventory_claim_semantics',version:'1.8.0',hash:hash('roster.inventory_claim_semantics.literal_budget_ratio_v9')},
  description:'Extract current-inventory assertions from exact Plan text. Host compares Native values; this is not strategic approval.'});
const fail=detail=>{throw Object.assign(Error('ROSTER_INVENTORY_SOURCE_UNAVAILABLE'),{detail,dispatchOutcome:'not_dispatched'});};
export function isRosterInventoryClaimAssignmentV1(assignment){
  return assignment?.role==='roster_workflow_final_review'
    &&assignment.inputs?.atomicReviewItem?.value?.checkId===checkId;
}
// One inventory identity resolver for the live request and unissued recovery.
// Composition and upgrade purposes refer to their owning current Native unit;
// child identities must be present, not inferred from names or prose.
function inventoryUnitSubjects(units){
  return units.map((unit,i)=>({handle:'unit'+i,kind:'unit',unitInstanceId:unit.unitInstanceId,
    recordKey:unit.recordKey,name:unit.unitName,compositionInstanceId:unit.unitInstanceId+'-composition',
    upgradeInstanceIds:(unit.upgrades??[]).map(u=>u.upgradeInstanceId)}));
}
export function resolveRosterInventoryComponentSubjectV1(purpose,subjects){
  if(['composition','upgrade'].includes(purpose?.componentKind)){
    const matches=subjects.filter(s=>s.kind==='unit'&&s.recordKey===purpose.recordKey
      &&(purpose.componentKind==='composition'
        ?[s.unitInstanceId,s.compositionInstanceId].includes(purpose.instanceId)
        :s.upgradeInstanceIds?.length>0&&(purpose.instanceId===s.unitInstanceId||s.upgradeInstanceIds.includes(purpose.instanceId))));
    if(matches.length!==1)return null;
    const subject=matches[0];
    return {kind:'selected_unit_component_identity_v1',componentKind:purpose.componentKind,
      subject:subject.handle,fromInstanceId:purpose.instanceId,toInstanceId:subject.unitInstanceId,
      recordKey:purpose.recordKey};
  }
  const kind=purpose?.componentKind==='tactical_card'?'card':purpose?.componentKind==='unit'?'unit':purpose?.componentKind==='faction_card'?'faction':null;
  if(kind==='faction'){const matches=subjects.filter(s=>s.kind===kind&&s.recordKey===purpose.recordKey
    &&[s.recordKey,s.factionId].includes(purpose.instanceId));return matches.length===1?{kind:'selected_faction_identity',subject:matches[0].handle,fromInstanceId:purpose.instanceId,toInstanceId:matches[0].factionId,recordKey:purpose.recordKey}:null;}
  if(!kind)return null;
  const exact=subjects.filter(s=>(s.unitInstanceId??s.cardInstanceId)===purpose.instanceId);
  if(exact.length)return exact.length===1&&exact[0].kind===kind&&exact[0].recordKey===purpose.recordKey
    ?{kind:'exact_instance',subject:exact[0].handle,fromInstanceId:purpose.instanceId,toInstanceId:purpose.instanceId,recordKey:purpose.recordKey}:null;
  if(kind!=='card'||purpose.instanceId!==purpose.recordKey)return null;
  const matches=subjects.filter(s=>s.kind==='card'&&s.recordKey===purpose.recordKey);
  return matches.length===1?{kind:'unique_card_record_alias',subject:matches[0].handle,
    fromInstanceId:purpose.instanceId,toInstanceId:matches[0].cardInstanceId,recordKey:purpose.recordKey}:null;
}
export async function rosterInventoryRequestIdentityRecoveryV1({work,readArtifact}){
  const kind='inventory_unique_card_identity_v1';
  if(!isRosterInventoryClaimAssignmentV1(work)||work.status!=='needs_repair'||!work.inputRef
    ||work.operationState?.pending||work.operationState?.calls?.length||work.resultRef
    ||work.failure?.code!=='ROSTER_INVENTORY_SOURCE_UNAVAILABLE'||work.failure.dispatchOutcome!=='not_dispatched'
    ||typeof work.failure.detail!=='string'||!work.failure.detail.startsWith('Plan component does not exist in the current inventory: '))return null;
  const saved=await readArtifact(work.inputRef),input=saved.inputs?.currentCards;
  if(saved.workId!==work.id||saved.role!==work.role||!equal(saved.bindings,work.bindings)
    ||input?.status!=='read'||input.source!=='evidence'||input.evidenceId!==work.inputs.currentCards?.id
    ||input.pointer!=='/audit/armyResourceBudgetResult/tacticalCardRows'||!Array.isArray(input.value))return null;
  const source=saved.evidenceDirectory?.find(e=>e.id===input.evidenceId);if(!source)return null;
  const native=await readArtifact(source.artifactRef);
  if(!equal(native.audit?.armyResourceBudgetResult?.tacticalCardRows,input.value))return null;
  const unitKind='inventory_selected_unit_component_identity_v1';
  if(!work.requestShapeRecoveries?.some(r=>r.kind===unitKind)){
    const unitFacts=projectRosterBuilderAuditNumericFactsV1({value:native});
    const unitSubjects=inventoryUnitSubjects(unitFacts?.units??[]);
    const unitPurposes=Object.values(saved.inputs).filter(x=>x.source==='evidence'&&x.status==='read'
      &&['composition','upgrade'].includes(x.value?.componentKind));
    const unitBindings=unitPurposes.map(x=>resolveRosterInventoryComponentSubjectV1(x.value,unitSubjects));
    if(unitBindings.length&&unitBindings.every(Boolean)&&unitBindings.some(b=>work.failure.detail.endsWith(': '+b.fromInstanceId)))
      return {kind:unitKind,originalFailure:copy(work.failure),originalInputRef:work.inputRef,
        nativeInventoryRef:source.artifactRef,identityBindings:unitBindings,historyReset:false,
        providerReplayed:false,nativeReplayed:false,planRewritten:false};
  }
  const faction=native.audit?.armyResourceBudgetResult?.factionCard;
  const factionPurposes=Object.values(saved.inputs).filter(x=>x.source==='evidence'&&x.status==='read'&&x.value?.componentKind==='faction_card');
  const factionSubjects=faction?[{handle:'faction',kind:'faction',recordKey:faction.recordKey,factionId:faction.cardId}]:[];
  const factionBindings=factionPurposes.map(x=>resolveRosterInventoryComponentSubjectV1(x.value,factionSubjects));
  if(factionBindings.length&&factionBindings.every(Boolean)&&factionBindings.some(b=>work.failure.detail.endsWith(': '+b.fromInstanceId))
    &&!work.requestShapeRecoveries?.some(r=>r.kind==='inventory_selected_faction_identity_v1'))return {kind:'inventory_selected_faction_identity_v1',originalFailure:copy(work.failure),originalInputRef:work.inputRef,nativeInventoryRef:source.artifactRef,identityBindings:factionBindings,historyReset:false,providerReplayed:false,nativeReplayed:false,planRewritten:false};
  const subjects=input.value.map((c,i)=>({handle:'card'+i,kind:'card',cardInstanceId:c.cardInstanceId,recordKey:c.recordKey}));
  const purposes=Object.values(saved.inputs).filter(x=>x.source==='evidence'&&x.status==='read'&&x.value?.componentKind==='tactical_card');
  const bindings=purposes.map(x=>resolveRosterInventoryComponentSubjectV1(x.value,subjects));
  if(!bindings.length||bindings.some(b=>!b))return null;
  const aliases=bindings.filter(b=>b.kind==='unique_card_record_alias');
  if(work.requestShapeRecoveries?.some(r=>r.kind===kind)||!aliases.some(b=>work.failure.detail.endsWith(': '+b.fromInstanceId)))return null;
  return {kind,originalFailure:copy(work.failure),originalInputRef:work.inputRef,nativeInventoryRef:source.artifactRef,
    identityBindings:aliases,historyReset:false,providerReplayed:false,nativeReplayed:false,planRewritten:false};
}
export function prepareRosterInventoryClaimsV1(request,{assignment,directory,correction=null,originalOutput=null}={}){
  if(!isRosterInventoryClaimAssignmentV1(assignment))return request;
  const builderId=assignment.inputs.currentBuilder?.evidenceId;
  const facts=request.promptNodes.find(n=>n.kind==='builder_audit_numeric_facts')?.audits?.find(a=>a.source.evidenceId===builderId);
  if(!facts?.units?.length||facts.source.validity!=='current')fail('Current Native unit projection required');
  const evidence=directory.find(e=>e.id===builderId);
  if(!evidence||evidence.artifactRef!==facts.source.artifactRef)fail('Native source identity mismatch');
  const cards=assignment.inputs.currentCards?.value;if(!Array.isArray(cards))fail('Current card inventory required');
  const rosterValues=copy(facts.summary),rosterPointers=Object.fromEntries(Object.keys(rosterValues).map(k=>[k,facts.summaryPointer+'/'+k]));
  const budgetValueProjections={};
  for(const [field,raw]of Object.entries(facts.budget??{})){
    // Native may encode gas allowance/balance as exact rationals. This is a
    // representation conversion, not a new budget calculation or rounding.
    const rational=raw&&typeof raw==='object'&&Number.isSafeInteger(raw.numerator)
      &&Number.isSafeInteger(raw.denominator)&&raw.denominator>0;
    const value=rational?raw.numerator/raw.denominator:raw;
    if(typeof value!=='number'||!Number.isFinite(value)||value<0)fail('Invalid Native budget quantity: '+field);
    if(Object.hasOwn(rosterValues,field)&&!equal(rosterValues[field],value))fail('Conflicting Native summary/budget quantity: '+field);
    rosterValues[field]=value;rosterPointers[field]=facts.budgetPointer+'/'+field;
    budgetValueProjections[field]={nativeValue:copy(raw),operation:rational?'rational_quotient':'identity',rounded:false};
  }
  const subjects=[{handle:'roster',kind:'roster',name:'Current whole roster'}],values={roster:rosterValues};
  subjects.push(...inventoryUnitSubjects(facts.units));
  for(const [i,unit]of facts.units.entries()){
    const handle='unit'+i;
    values[handle]=copy(unit);
  }
  for(const [i,card]of cards.entries()){
    const handle='card'+i;subjects.push({handle,kind:'card',cardInstanceId:card.cardInstanceId,recordKey:card.recordKey,name:card.cardName});
    values[handle]={...copy(card),sourcePointer:assignment.inputs.currentCards.pointer+'/'+i};
  }
  if(facts.factionCard?.recordKey){subjects.push({handle:'faction',kind:'faction',recordKey:facts.factionCard.recordKey,factionId:facts.factionCard.cardId,name:facts.factionCard.factionName});
    values.faction={...copy(facts.factionCard),sourcePointer:facts.factionCardPointer};}
  for(const subject of subjects)subject.allowedFields=copy(fieldsByKind[subject.kind]);
  const upgrades=[...new Set(facts.units.flatMap(u=>(u.upgrades??[]).map(a=>a.upgradeName)))].sort()
    .map((name,i)=>({handle:'upgrade'+i,name}));
  const passages=[],identityBindings=[],seen=new Set();
  for(const input of Object.values(assignment.inputs)){
    if(input.source!=='evidence'||input.status!=='read'||!input.evidenceId?.startsWith(`draft:r${assignment.draftRevision??assignment.inputs.atomicReviewItem.value.parentRevision}:plan:`))continue;
    const source=directory.find(e=>e.id===input.evidenceId);if(!source)fail('Plan source missing');
    for(const leaf of projectRosterPlanTextLeavesV1(input.value,input.pointer??'')){
      const key=input.evidenceId+leaf.pointer;if(seen.has(key))continue;seen.add(key);
      const binding=leaf.component?resolveRosterInventoryComponentSubjectV1(leaf.component,subjects):null;
      if(leaf.component&&!binding)fail('Plan component does not exist in the current inventory: '+leaf.component.instanceId);
      if(binding)identityBindings.push({...binding,passageId:'passage'+passages.length});
      passages.push({id:'passage'+passages.length,text:leaf.text,boundSubject:binding?.subject??null,
        source:{evidenceId:source.id,evidenceNumber:source.number,artifactRef:source.artifactRef,pointer:leaf.pointer}});
    }
  }
  if(!passages.length)fail('No current Plan text delivered');
  const sent=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const instruction='Extract what the exact CURRENT text CLAIMS, even when wrong. Do not correct, approve, evaluate strategy, or infer an unmentioned purchase. Cover every passage once: claims, no_claim (no current inventory assertion), or ambiguous (cannot map its assertion precisely). '
    +'Quote an exact nonempty substring for each assertion. Each claim uses a Host subject and field. Component-local inventory claims use boundSubject. A component rationale may also explicitly state whole-roster-exclusive quantities (the listed rosterOnlyFields); extract those with subject roster, without changing their quoted values. Shared model/supply counts and other-component assertions may not silently switch scope: mark an unclear referent ambiguous. Summary claims may use any explicit subject. '
    +'Use one explicit unit/card subject per claim, repeating the exact quote for each explicitly included unit. There are NO implicit all-units-of-type subjects: "two Marines" must not include a third Marine. Use the component passages to resolve identities; if the precise subset or a subgroup aggregate is not expressible, mark that passage ambiguous instead of guessing its members or comparing it as the whole roster. Claims about historical/hypothetical future states or tactical benefits are not current purchased inventory. '
    +'Exception for unitCount only: exact named cardinality notation such as a catalogue unit name plus optional composition plus ×N denotes that named subgroup, never the whole army. Host resolves its record/composition and counts Native unit rows; do not infer upgrades or per-model quantities from it. '
    +'expectedValueJson is the value ASSERTED IN THE QUOTE: JSON number for counts/costs, a plain composition word or JSON-quoted string for compositionKind, array of upgrade HANDLES for upgrades. equals compares the complete set; includes_all permits other upgrades; excludes_all asserts absence of its listed NONEMPTY set. "No upgrades" uses equals with []; empty includes_all/excludes_all prove nothing and are rejected. Numeric/string fields use equals. '
    +'Supply quantities are distinct: unit startingSupply is purchased full-strength unit Supply; roster startingSupply is the full-roster sum. Mission/round Supply Pool and deployment allowance belong to deployment review, not this inventory check. '
    +'Budget quantities are distinct: total allowance, already spent, and remaining/unspent. Select the field matching the quote; never substitute spending for a balance. If current spending is written as a used/allowance ratio with a resource unit, quote the complete ratio. Host binds both literal numbers. Missing source data is not zero. '
    +'Only the listed purchased-inventory fields belong to this check. Rules effects, slot-grant rules, tactical benefits, purchase restrictions and future performance belong to other review obligations; they are not missing inventory fields to investigate here. '
    +'Each subject lists its allowedFields. The selected faction has identity only and no purchased-inventory quantity fields here; its slot grants and abilities belong to rules review. Tactical cards have only vespeneGasCost here: a card that "supplies slots" does not have a startingSupply count. Do not turn a verb, slot grant or benefit into an unstated numeric inventory claim. Out-of-domain assertions belong to other obligations, not ambiguous inventory or necessary-fact requests. '
    +'The upgrade vocabulary lists names, not who owns them. An unknown inventory name or unresolved inventory referent is ambiguous. Never return supported/checks or a Plan patch. Public reasons only.';
  return {...request,responseFormat:{kind:'provider_strict_json_schema',schemaName:contract.schemaName,
    outputContractRef:outputContractRefStarcraftTmgV1(contract),schema:contract.providerSchema},
    inventoryVerificationState:{version:1,accountingSentenceVersion:2,claimSubjectVersion:2,extractionStageVersion:2,checkId,originalResponseFormat:copy(request.responseFormat),
      source:copy(facts.source),values,fieldPointers:{roster:rosterPointers},fieldValueProjections:{roster:budgetValueProjections},subjects:copy(subjects),upgrades:copy(upgrades),passages:copy(passages),identityBindings:copy(identityBindings)},
    promptNodes:[{...sent,inputs:Object.fromEntries(['review','reviewScope','atomicReviewItem'].map(key=>[key,copy(sent.inputs[key])]))},
      {kind:'inventory_claim_extraction',version:1,passages,subjects,upgrades,rosterOnlyFields:copy(rosterOnlyFields),instruction,
        fieldSemantics:{resourceBudget:copy(resourceBudgetSemantics),supply:copy(supplySemantics),unitModels:'startingModels is the count in ONE unit; startingModelCount is accepted as the same count for a unit subject.',
          rosterModels:'startingModelCount is the total over the whole roster; startingModels is accepted as the same total only for roster.',
          subjects:'Only explicit unit/card or the whole roster. Never substitute a type-wide group for a subset.'},
        ...(correction?{repair:{errors:copy(correction.errors),originalOutput:copy(originalOutput),
          instruction:'Correct only the rejected extraction parameters. Keep the same passages and scopes. Do not switch to reviewer checks or invent facts.'}}:{})}],
    userMessage:instruction};
}
export function projectRosterInventoryClaimsV1({request,output}){
  const state=request.inventoryVerificationState;
  if(state?.version!==1)return {output,errors:[],projection:[],verification:null};
  const errors=[],comparisons=[],questions=[],normalizations=[],outOfDomainClaims=[];
  const empty={action:'finish',publicReason:'Inventory extraction could not be interpreted.',reads:[],checks:[],
    ...(state.originalResponseFormat.schema.properties.catalogueQueries?{catalogueQueries:[]}:{} )};
  const invalid=validate(request.responseFormat.schema,output);
  if(!invalid.ok)return {output:empty,errors:[{code:'inventory_extraction_schema',detail:invalid.errors}],projection:[],verification:null};
  const byPassage=new Map(state.passages.map(p=>[p.id,p])),bySubject=new Map(state.subjects.map(s=>[s.handle,s]));
  const expectedIds=state.passages.map(p=>p.id),received=output.coverage.map(p=>p.passageId);
  if(received.length!==expectedIds.length||new Set(received).size!==received.length||expectedIds.some(id=>!received.includes(id)))
    errors.push({code:'inventory_passage_coverage',required:expectedIds,received});
  for(const row of output.coverage){
    const claims=output.claims.filter(c=>c.passageId===row.passageId);
    if(!byPassage.has(row.passageId)||row.status==='claims'&&!claims.length||row.status==='no_claim'&&claims.length)
      errors.push({code:'inventory_coverage_claim_mismatch',passageId:row.passageId});
    if(row.status==='ambiguous'&&byPassage.has(row.passageId))questions.push({classification:'author_decision',
      question:`Clarify the inventory referent/assertion in ${row.passageId}: ${byPassage.get(row.passageId).text}`,
      publicReason:row.publicReason||'The original wording could not be mapped; it has not passed inventory checking.',
      evidenceNumbers:[byPassage.get(row.passageId).source.evidenceNumber]});
  }
  for(const {index,claim} of expandExplicitBudgetRatios(output.claims,byPassage,normalizations)){
    const p=byPassage.get(claim.passageId),subject=bySubject.get(claim.subject);
    if(!p||!subject||!allowsClaimSubject(p,subject,claim.field)){errors.push({code:'inventory_claim_subject',index});continue;}
    if(!claim.quote.trim()||!p.text.includes(claim.quote)){errors.push({code:'inventory_claim_quote',index});continue;}
    if(subject.kind==='all_units_of_type'){
      errors.push({code:'inventory_explicit_subject_required',index,quote:claim.quote,
        instruction:'Extract each explicitly included unit separately. A type-wide group cannot resolve a subset. Preserve the exact text; use ambiguous if its members cannot be identified.'});continue;
    }
    if(!fieldsByKind[subject.kind]?.includes(claim.field)){
      errors.push({code:'inventory_subject_field',index,subject:claim.subject,subjectKind:subject.kind,field:claim.field,
        allowedFields:copy(fieldsByKind[subject.kind]??[]),quote:claim.quote,
        instruction:'Correct the extraction, not the Plan. Use only the explicit subject\'s inventory fields. Slot grants, rules effects and tactical benefits are outside this obligation; do not invent a numeric value or request a nonexistent field.'});continue;
    }
    const accountingField=subject.kind==='roster'&&Object.hasOwn(resourceBudgetSemantics,claim.field)
      ?explicitResourceAccountingField(claim.quote):null;
    if(accountingField&&accountingField!==claim.field){
      errors.push({code:'inventory_resource_accounting_field',index,quote:claim.quote,field:claim.field,expectedField:accountingField,
        instruction:'This quote names a different accounting quantity. Correct only the extracted field after checking the original quote; do not change the Plan or infer a new amount.'});continue;
    }
    let expected;try{expected=JSON.parse(claim.expectedValueJson);}catch{
      // The field already identifies a string-valued composition. A plain
      // word is unambiguous; preserve it, never infer/correct from Native.
      // Damaged quoted JSON, lists and numeric claims keep their strict path.
      if(claim.field==='compositionKind'&&/^[A-Za-z][A-Za-z0-9_-]*$/u.test(claim.expectedValueJson)){
        expected=claim.expectedValueJson;
        normalizations.push({to:'/claims/'+index+'/expectedValueJson',original:claim.expectedValueJson,
          value:JSON.stringify(expected),rule:'literal_composition_string_v1',semanticValueChanged:false});
      }else{errors.push({code:'inventory_claim_value_json',index});continue;}
    }
    const isSet=claim.field==='upgrades',isString=claim.field==='compositionKind';
    if(isSet){
      if(!Array.isArray(expected)||new Set(expected).size!==expected.length||expected.some(h=>!state.upgrades.some(u=>u.handle===h))){
        errors.push({code:'inventory_claim_upgrade_handles',index});continue;
      }
      if(!expected.length&&claim.operator!=='equals'){
        errors.push({code:'inventory_empty_set_operator',index,
          instruction:'An assertion of no upgrades requires equals with []. Empty includes_all/excludes_all is vacuous, not inventory evidence.'});continue;
      }
      expected=expected.map(h=>state.upgrades.find(u=>u.handle===h).name).sort();
    }else if(claim.operator!=='equals'||(isString?typeof expected!=='string':!Number.isSafeInteger(expected)||expected<0)){
      errors.push({code:'inventory_claim_value_type',index});continue;
    }
    if(subject.kind==='roster'&&claim.field==='startingSupply'&&explicitDeploymentSupplyClaim(claim.quote)){
      outOfDomainClaims.push({passageId:p.id,quote:claim.quote,subject:claim.subject,field:claim.field,
        assertedValue:copy(expected),planSource:copy(p.source),domain:'deployment_supply',
        targetCheckId:'deployment_facts:initial_reserves_and_supply',factApproved:false,
        reason:'This exact quote names a mission/round Supply allowance, not the full-strength purchased roster sum.'});
      continue;
    }
    const cardinality=claim.field==='unitCount'&&subject.kind==='roster'?explicitUnitCardinality(claim.quote,state):null;
    if(cardinality&&cardinality.asserted!==expected){errors.push({code:'inventory_claim_literal_quantity',index,quote:claim.quote,asserted:cardinality.asserted,received:expected});continue;}
    const members=subject.kind==='all_units_of_type'&&claim.field!=='unitCount'?subject.members:[subject.handle];
    for(const handle of members){
      const member=bySubject.get(handle),value=state.values[handle];
      // One count concept, different Native projection field names. Resolve by
      // the explicit subject kind, never infer a value or sum group members.
      const nativeField=member.kind==='unit'&&claim.field==='startingModelCount'?'startingModels'
        :member.kind==='roster'&&claim.field==='startingModels'?'startingModelCount':claim.field;
      let actual=cardinality?cardinality.members.length:claim.field==='unitCount'&&subject.kind==='all_units_of_type'?subject.members.length:value?.[nativeField];
      if(isSet)actual=Array.isArray(actual)?actual.map(u=>u.upgradeName).sort():null;
      const available=actual!==undefined&&actual!==null;
      const matches=available&&(isSet?(claim.operator==='equals'?equal(actual,expected):claim.operator==='includes_all'
        ?expected.every(u=>actual.includes(u)):expected.every(u=>!actual.includes(u))):equal(actual,expected));
      const status=!available?'unavailable':matches?'matched':'contradiction';
      const comparison={passageId:p.id,quote:claim.quote,subject:claim.subject,unitInstanceId:member.unitInstanceId??null,
        cardInstanceId:member.cardInstanceId??null,field:claim.field,nativeField,operator:claim.operator,expected:copy(expected),actual:actual??null,status,
        planSource:copy(p.source),nativeSource:copy(state.source),nativeValueProjection:copy(state.fieldValueProjections?.[handle]?.[nativeField]??null),nativePointer:state.fieldPointers?.[handle]?.[nativeField]??value?.sourcePointer??null};
      if(cardinality){
        comparison.sourceSubject=claim.subject;
        comparison.subject='unit_group:'+cardinality.recordKey+':'+(cardinality.compositionKind??'all_compositions');
        comparison.nativePointer=null;
        comparison.nativeCountProjection={operation:'count_native_unit_rows',recordKey:cardinality.recordKey,compositionKind:cardinality.compositionKind,
          memberPointers:cardinality.members.map(u=>state.values[u.handle].sourcePointer),memberInstanceIds:cardinality.members.map(u=>u.unitInstanceId)};
      }
      comparisons.push(comparison);
      if(status!=='matched')questions.push({classification:available?'author_decision':'necessary_fact',
        question:available?`Correct ${p.source.evidenceId}${p.source.pointer}: ${cardinality?comparison.subject:member.unitInstanceId??member.cardInstanceId??member.handle} ${claim.field} asserts ${JSON.stringify(expected)} but current Native inventory is ${JSON.stringify(actual)}.`
          :`Resolve unavailable Native field ${claim.field} for ${member.unitInstanceId??member.cardInstanceId??member.handle}; do not assume zero.`,
        publicReason:`Exact Plan quote: ${claim.quote}. ${available?'This is a current-inventory contradiction, not a new strategy comparison.':'The received Native projection cannot establish this field.'}`,
        evidenceNumbers:[p.source.evidenceNumber,state.source.evidenceNumber]});
    }
  }
  if(errors.length)return {output:empty,errors,projection:[],verification:null};
  const verification={version:1,comparisonVersion:ROSTER_INVENTORY_COMPARISON_VERSION,comparisons,outOfDomainClaims,coverage:copy(output.coverage),extractionPublicReason:output.publicReason,
    source:copy(state.source),newRulesExecution:false,modelExtractedClaims:true,hostComparedValues:true,
    extractionCompletenessProven:false,strategyApproved:false};
  const verdict=questions.some(q=>q.classification==='author_decision')?'requires_revision':questions.length?'needs_evidence':'supported';
  const evidenceNumbers=[...new Set([state.source.evidenceNumber,...state.passages.map(p=>p.source.evidenceNumber)])];
  return {output:{...empty,publicReason:'Host compared the extracted assertions with current Native inventory; extraction itself remains fallible.',
    checks:[{checkId:state.checkId,verdict,
      ...(request.finalFactReviewState?.version===1?{assessment:{kind:verdict==='requires_revision'?'current_fact_conflict':verdict==='needs_evidence'?'current_fact_gap':'consistent',
        claimQuote:questions.length?(comparisons.find(c=>c.status!=='matched')?.quote??state.passages.find(p=>output.coverage.find(c=>c.passageId===p.id)?.status==='ambiguous')?.text??state.passages[0].text):''}}:{}),publicReason:questions.length?questions.map(q=>q.question).join('\n')
      :'All extracted current-inventory assertions match. This does not independently prove extraction completeness or strategic quality.',
      evidenceNumbers,conditions:[],dataQuestions:questions}]},errors:[],
    projection:[...normalizations,{rule:'native_inventory_claim_comparison_v1',modelVerdictUsed:false,originalReplyUnchanged:true}],verification};
}

// Shared Product/transition eligibility. Reconsume exact saved claims after a
// known deterministic guard repair; never buy another extraction or guess values.
export async function projectRosterInventoryClaimRecoveryV1({state,work,readArtifact}){
  const op=work?.operationState,errors=op?.correction?.errors??[],ref=op?.correction?.originalReplyRef;
  if(!isRosterInventoryClaimAssignmentV1(work)||!['ready','needs_model_choice','needs_repair'].includes(work.status)
    ||op?.pending||op?.retryProviderDispatch||op?.revalidateReplyRef||op?.noProgressStop
    ||work.failure&&work.failure.dispatchOutcome!=='completed_invalid'
    ||!equal(work.bindings,state.scope)||!ref||op.calls?.at(-1)?.replyRef!==ref)return null;
  const subjectFix=errors.length>0&&errors.every(e=>e.code==='inventory_claim_subject');
  const accountingFix=errors.some(e=>e.code==='inventory_resource_accounting_field')
    &&errors.every(e=>['inventory_resource_accounting_field','finish_requires_role_decisions_only','review_obligation_coverage'].includes(e.code));
  if(!subjectFix&&!accountingFix)return null;
  const kind=subjectFix?'inventory_assertion_scope_v1':'inventory_compound_accounting_v1';
  if([...(work.inventoryClaimRecoveryHistory??[]),...(work.inventoryAccountingRecoveryHistory??[])].some(r=>r.kind===kind))return null;
  for(const call of subjectFix?[op.calls.at(-1)]:op.calls??[]){
    const request=await readArtifact(call.requestRef),extraction=request.promptNodes?.find(n=>n.kind==='inventory_claim_extraction');
    const assigned=request.promptNodes?.find(n=>n.kind==='workflow_role_assignment');
    if(!extraction||extraction.repair||request.inventoryVerificationState?.[subjectFix?'claimSubjectVersion':'accountingSentenceVersion']>=2
      ||request.roleCommunication?.workId!==work.id||assigned?.workId!==work.id
      ||!equal(assigned.scope,work.bindings))continue;
    const inventory=request.inventoryVerificationState,entry=state.evidence.find(e=>e.id===inventory.source.evidenceId);
    if(entry?.artifactRef!==inventory.source.artifactRef||inventory.passages.some(p=>
      state.evidence.find(e=>e.id===p.source.evidenceId)?.artifactRef!==p.source.artifactRef))continue;
    const reply=await readArtifact(call.replyRef),mapped=projectRosterInventoryClaimsV1({request,output:reply.output});
    if(mapped.errors.length||!mapped.verification)continue;
    return {kind,repairKind:subjectFix?'inventory_assertion_scope':'inventory_compound_accounting',workId:work.id,requestRef:call.requestRef,
      replyRef:call.replyRef,originalReplyRef:call.replyRef,originalResultRef:work.resultRef,
      revalidationKey:hash({kind,requestRef:call.requestRef,replyRef:call.replyRef}),
      providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
  }
  return null;
}
// Existing external callers retain the old entry; there is one implementation.
export const projectRosterInventoryAccountingRecoveryV1=projectRosterInventoryClaimRecoveryV1;

// Reinterpret only a stale, unaggregated extraction whose exact quote now has
// a deterministic subgroup cardinality. It is not a new review or Plan edit.
export async function projectRosterInventoryInterpretationRecoveryV1({state,work,readArtifact}){
  const parent=state.work.find(w=>w.id===work?.atomicReviewParentId),call=work?.operationState?.calls?.at(-1);
  if(!isRosterInventoryClaimAssignmentV1(work)||work.status!=='evidence_ready'||!work.resultRef
    ||work.operationState?.pending||!call?.replyRef||!equal(work.bindings,state.scope)
    ||!parent||!equal(parent.bindings,state.scope)||!['ready','waiting_dependency'].includes(parent.status)
    ||parent.resultRef||parent.operationState?.pending||parent.operationState?.calls?.length)return null;
  const prior=await readArtifact(work.resultRef),verification=prior.value?.inventoryVerification;
  if(verification?.version!==1||(verification.comparisonVersion??1)>=ROSTER_INVENTORY_COMPARISON_VERSION)return null;
  const request=await readArtifact(call.requestRef),reply=await readArtifact(call.replyRef),inventory=request.inventoryVerificationState;
  if(!inventory||request.roleCommunication?.workId!==work.id
    ||state.evidence.find(e=>e.id===inventory.source.evidenceId)?.artifactRef!==inventory.source.artifactRef
    ||inventory.passages.some(p=>state.evidence.find(e=>e.id===p.source.evidenceId)?.artifactRef!==p.source.artifactRef))return null;
  const projected=projectRosterInventoryClaimsV1({request,output:reply.output});
  if(projected.errors.length||!projected.verification)return null;
  const wasContradiction=c=>verification.comparisons.some(old=>old.status==='contradiction'&&old.quote===c.quote&&old.passageId===c.passageId);
  const cardinalityFixed=projected.verification.comparisons.some(c=>c.nativeCountProjection&&wasContradiction(c));
  const supplySeparated=projected.verification.outOfDomainClaims.filter(wasContradiction);
  // Reuse only while the original deployment obligation still exists in the
  // current binding. It is neither waived nor replaced by this inventory fix.
  const deploymentOwner=supplySeparated.length&&state.work.some(w=>equal(w.bindings,state.scope)
    &&w.inputs?.reviewScope?.value?.obligations?.some(o=>o.checkId==='deployment_facts:initial_reserves_and_supply'));
  if(!cardinalityFixed&&!deploymentOwner)return null;
  return {workId:work.id,expectedResultRef:work.resultRef,expectedReplyRef:call.replyRef,
    reason:deploymentOwner?'Exact mission/round Supply belongs to the existing deployment obligation, not purchased roster totals. Reconsume the original paid extraction, preserve all other inventory assertions, the unchanged deployment review, Plan and history. This does not approve the mission value; no Provider or Native replay.':'Exact named unit cardinality is a subgroup, not whole-army size. Reconsume the original paid extraction with Native record/composition row counts; preserve quote, asserted value, Plan, all other checks and history. No Provider or Native replay.',
    providerReplayed:false,nativeReplayed:false,finalApprovalGranted:false};
}
