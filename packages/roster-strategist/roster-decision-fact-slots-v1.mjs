// Host-owned values. A model selects a slot; neither author nor reviewer supplies truth.
import {isDeepStrictEqual} from 'node:util';
const copy=structuredClone;
function pointerValue(body,pointer){if(pointer==='')return body;if(typeof pointer!=='string'||!pointer.startsWith('/'))return undefined;let v=body;for(const p of pointer.slice(1).split('/').map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~'))){if(!v||typeof v!=='object'||!Object.hasOwn(v,p))return undefined;v=v[p];}return v;}
const evidenceBody=body=>body?.kind==='tool_receipt'?body.value:body;
export const ROSTER_FACT_POLICY_V1={version:1,factsOwnedBy:'host',strategyOwnedBy:'author',
  strategyQualityBlocks:false,confirmedMaterialContradictionsBlock:true,
  instruction:'明确的(fact 事实ID, 数值及单位)摘要属于原件断言，Host直接核对，不可将假设值写在这个摘要里。审核必须提取所有事实声明，包括自己认为正确的声明；不得因为supported就省略factClaims。事实由Host从当前原件填入；模型只选factId，不填写actual/value/成本/Supply/槽位。事实槽不是策略建议。卡牌 resourceEffect=provides_capacity 是提供容量，单位 occupiedArmySlots 是占用；两者不可互换。卡牌数量一致只证明数量，不能批准作者句子的提供/消耗解释。阈值、优先级和风险取舍是作者判断，不要求最优证明。批评策略、偏好不同和未测假设不等于事实冲突。若理由依赖错误事实，必须引用原句和真实事实槽，由Host确认差异，再把具体诊断交回作者；作者可保留或改变选择。未知不能补成零，旧来源不能当当前值。'};
export async function projectRosterDecisionFactSlotsV1({state,readArtifact,reads=[]}){
  const id='draft:r'+state.draftRevision+':builder',entry=state.evidence.find(e=>e.id===id);
  const packet={kind:'authoritative_decision_facts',version:1,draftRef:state.draftRef,
    bindings:copy(state.scope),policy:copy(ROSTER_FACT_POLICY_V1),slots:[],missing:[]};
  if(!entry||Object.entries(entry.bindings??{}).some(([k,v])=>state.scope[k]!==v)){
    packet.missing.push({source:id,reason:'current_builder_not_available'});return packet;}
  const audit=await readArtifact(entry.artifactRef);
  if(!Array.isArray(audit?.audit?.units)||audit.readOnly!==true||audit.clientSuppliedLegalityAccepted!==false){
    packet.missing.push({source:id,reason:'not_native_builder_audit'});return packet;}
  const source={evidenceId:entry.id,evidenceNumber:state.evidence.indexOf(entry)+1,artifactRef:entry.artifactRef};
  const add=(factId,value,unit,pointer,subject,extra={})=>{
    if(value===undefined||value===null){packet.missing.push({factId,reason:'source_value_missing'});return;}
    packet.slots.push({factId,value:copy(value),unit,subject,source:{...source,pointer},...extra});};
  for(const [key,unit]of Object.entries({unitCount:'units',startingModelCount:'models',startingSupply:'supply',mineralBudget:'minerals',mineralSpent:'minerals',mineralUnspent:'minerals',vespeneSpent:'vespene'}))
    add('builder.army.'+key,audit.summary?.[key],unit,'/summary/'+key,'current army');
  // The Native builder distinguishes purchased-card capacity from unit occupancy.
  // Project its fields verbatim; no catalogue prices, inferred zeros or rule math here.
  const cards=audit.audit.armyResourceBudgetResult?.tacticalCardRows;
  if(!Array.isArray(cards))packet.missing.push({source:id,reason:'selected_tactical_card_rows_missing'});
  else{
    const categories=[...new Set(cards.flatMap(card=>Object.keys(card.armySlotsAdded??{})))];
    const escapePointer=value=>String(value).replaceAll('~','~0').replaceAll('/','~1');
    for(const [index,card]of cards.entries()){
      if(!card.cardInstanceId){packet.missing.push({source:id,reason:'selected_tactical_card_identity_missing',index});continue;}
      const subject=card.cardInstanceId,base='builder.card.'+subject+'.',p='/audit/armyResourceBudgetResult/tacticalCardRows/'+index;
      const cardIdentity={cardInstanceId:subject,recordKey:card.recordKey,cardName:card.cardName};
      add(base+'vespeneGasCost',card.vespeneGasCost,'vespene',p+'/vespeneGasCost',subject,
        {cardIdentity:copy(cardIdentity),resourceEffect:'purchase_cost'});
      if(!card.armySlotsAdded||typeof card.armySlotsAdded!=='object'){
        packet.missing.push({subject,reason:'slot_capacity_source_missing'});continue;
      }
      for(const category of categories){
        if(!Object.hasOwn(card.armySlotsAdded,category)||card.armySlotsAdded[category]==null){
          packet.missing.push({subject,category,reason:'slot_capacity_source_missing'});continue;
        }
        add(base+'slotCapacityGranted.'+category,card.armySlotsAdded[category],'army slot capacity',
          p+'/armySlotsAdded/'+escapePointer(category),subject,
          {cardIdentity:copy(cardIdentity),slotCategory:category,resourceEffect:'provides_capacity'});
      }
    }
  }
  for(const [i,u]of audit.audit.units.entries()){
    const c=u.unitCompositionResult,p='/audit/units/'+i,base='builder.unit.'+u.unitInstanceId+'.';
    for(const [key,unit]of Object.entries({startingModelCount:'models',startingSupply:'supply',occupiedArmySlots:'army slots',armySlotType:'slot category',mineralCost:'minerals'}))
      add(base+key,c?.[key],unit,p+'/unitCompositionResult/'+key,u.unitInstanceId);
    add(base+'upgradeCost',u.mineralCost,'minerals',p+'/mineralCost',u.unitInstanceId);
    if(Number.isFinite(c?.mineralCost)&&Number.isFinite(u.mineralCost))add(base+'totalMineralCost',c.mineralCost+u.mineralCost,'minerals',p,u.unitInstanceId,
      {derivation:{operation:'sum',pointers:[p+'/unitCompositionResult/mineralCost',p+'/mineralCost']}});
  }
  // Group operands are sums of actual selected members, including each one's
  // own upgrades. Never multiply an arbitrary instance by a narrative count.
  const groups=new Map();
  for(const u of audit.audit.units){
    const type=u.recordKey??u.unitId;
    if(!type||!u.unitName)continue;
    for(const slot of packet.slots.filter(s=>s.subject===u.unitInstanceId))
      slot.quantityScope={kind:'unit_instance',unitType:type,unitName:u.unitName,memberSubjects:[u.unitInstanceId]};
    const members=groups.get(type)??[];members.push(u);groups.set(type,members);
  }
  for(const [type,members]of groups){
    if(members.length<2)continue;
    const memberSubjects=members.map(u=>u.unitInstanceId),subject='current_group:'+type;
    const quantityScope={kind:'current_unit_group',unitType:type,unitName:members[0].unitName,memberSubjects};
    for(const field of ['startingModelCount','startingSupply','occupiedArmySlots','mineralCost','upgradeCost','totalMineralCost']){
      const operands=memberSubjects.map(id=>packet.slots.find(s=>s.factId==='builder.unit.'+id+'.'+field));
      if(operands.some(s=>!Number.isFinite(s?.value)))continue;
      add('builder.group.'+encodeURIComponent(type)+'.'+field,operands.reduce((sum,s)=>sum+s.value,0),operands[0].unit,'/audit/units',subject,
        {quantityScope:copy(quantityScope),derivation:{operation:'sum',memberSubjects,operands:operands.map(s=>({factId:s.factId,value:s.value,source:copy(s.source),...(s.derivation?{derivation:copy(s.derivation)}:{})}))}});
    }
    const categories=members.map(u=>u.unitCompositionResult?.armySlotType);
    if(categories[0]&&categories.every(c=>c===categories[0]))add('builder.group.'+encodeURIComponent(type)+'.armySlotType',categories[0],'slot category','/audit/units',subject,{quantityScope:copy(quantityScope)});
  }
  for(const row of reads){
    const entry=state.evidence.find(e=>e.id===row.evidenceId);
    if(row.status!=='read'||!entry||entry.kind!=='tool_receipt'
      ||Object.entries(entry.bindings??{}).some(([k,v])=>state.scope[k]!==v)
      ||row.value===undefined||row.value===null||typeof row.value==='object')continue;
    const raw=await readArtifact(entry.artifactRef);
    if(!isDeepStrictEqual(pointerValue(evidenceBody(raw),row.pointer),row.value))continue;
    const factId='read:'+row.evidenceNumber+':'+row.pointer;
    if(!packet.slots.some(s=>s.factId===factId))packet.slots.push({factId,value:copy(row.value),unit:'source scalar',subject:entry.id,
      conditions:copy(entry.conditions??[]),source:{evidenceId:entry.id,evidenceNumber:row.evidenceNumber,artifactRef:entry.artifactRef,pointer:row.pointer,pointerKind:'workflow_evidence_value'}});
  }
  return packet;
}
export function bindRosterDecisionFactSlotsV1({factIds,packet}){
  const errors=[],slots=[];
  if(!Array.isArray(factIds)||!factIds.length)return {slots,errors:[{code:'comparison_fact_selection_required'}]};
  for(const factId of factIds){const matches=packet?.slots?.filter(f=>f.factId===factId)??[];
    if(matches.length!==1)errors.push({code:'comparison_fact_not_current',factId,instruction:'选择当前只读事实槽；缺事实则先读取原件，不手填数值。'});
    else if(!slots.some(f=>f.factId===factId))slots.push(copy(matches[0]));}
  return {slots,errors};
}
// A token is an extraction from an immutable AUTHOR QUOTE, never a source value.
const counts={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,一:1,二:2,两:2,三:3,四:4,五:5,六:6};
export function interpretRosterFactClaimTokenV1(token,value){
  if(typeof value==='number'){
    const s=token.trim().toLowerCase();if(Object.hasOwn(counts,s))return {known:true,value:counts[s]};
    if(/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return {known:true,value:Number(s)};
    return {known:false};
  }
  if(typeof value==='boolean'&&['true','false'].includes(token))return {known:true,value:token==='true'};
  if(typeof value==='string')return {known:true,value:token.trim()};
  return {known:false};
}
// Extraction must preserve a whole token: 1 inside 12 or one inside someone is not an authored claim.
function isWholeClaimToken(quote,token,value){
  const selected=token.trim();
  if(typeof value==='number'){
    const numeric=/[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?/g;
    if(/^[+.-]?\d/.test(selected))return [...quote.matchAll(numeric)].some(m=>m[0]===selected
      &&!/[A-Za-z0-9_.+-]/.test(quote[m.index-1]??'')&&!/[A-Za-z0-9_]/.test(quote[m.index+m[0].length]??''));
    return (quote.match(/[A-Za-z]+|[零〇一二两三四五六七八九十百千万亿]+/g)??[]).includes(selected);
  }
  let from=0,index;while((index=quote.indexOf(selected,from))!==-1){
    if(!/[A-Za-z0-9_]/.test(quote[index-1]??'')&&!/[A-Za-z0-9_]/.test(quote[index+selected.length]??''))return true;
    from=index+selected.length;
  }return false;
}

// Accept a complete authored quantity, not just a bare number. Units come from
// the selected Host slot; "280 supply" is never a mineral-cost assertion.
function categorySlotLabels(category){return typeof category==='string'
  ?['slot','slots','army slot','army slots'].map(noun=>category.toLowerCase()+' '+noun):[];}
function interpretFactQuantity(token,fact,packet){
  const plain=interpretRosterFactClaimTokenV1(token,fact.value);
  if(plain.known)return {...plain,magnitudeToken:token.trim(),unitQualified:false};
  if(typeof fact.value!=='number')return {known:false};
  const match=token.trim().match(/^([-+]?(?:\d+(?:\.\d+)?|\.\d+))[\s-]+(.+)$/);
  if(!match)return {known:false};
  const label=match[2].trim().toLowerCase().replace(/[-_\s]+/g,' ');
  const labels={minerals:['mineral','minerals','矿','矿物'],vespene:['vespene','gas','气'],
    supply:['supply','人口','补给'],models:['model','models','模型'],units:['unit','units','单位'],
    'army slots':['army slot','army slots','slot','slots','槽','槽位'],
    'army slot capacity':['army slot capacity','capacity slots','槽位容量']}[fact.unit]??[];
  if(fact.unit==='army slots'||fact.unit==='army slot capacity'){
    const category=fact.slotCategory??packet.slots.find(s=>s.subject===fact.subject&&s.factId.endsWith('.armySlotType'))?.value;
    labels.push(...categorySlotLabels(category));
  }
  if(!labels.includes(label))return {known:false,unitMismatch:true};
  return {known:true,value:Number(match[1]),magnitudeToken:match[1],unitQualified:true};
}
function selectedQuantityIsAuthored(quote,token,fact,interpreted){
  if(!interpreted.unitQualified)return isWholeClaimToken(quote,token,fact.value);
  // Both the complete supplied text and its signed magnitude must exist.
  return isWholeClaimToken(quote,token,'quantity')&&isWholeClaimToken(quote,interpreted.magnitudeToken,fact.value);
}
// A model has already selected an exact quote and its unit-instance source.
// Audit unique Supply/category-slot quantities inside THAT quote as well. Do
// not bind general prose, aggregate totals, model counts or another unit by name.
function extractSelectedQuoteFactClaims({packet,premise,claims}){
  const result=[];
  for(const claim of claims??[]){
    const anchor=packet.slots.find(s=>s.factId===claim.factId);
    if(!anchor?.factId.startsWith('builder.unit.')||!claim.quote?.trim()||!premise.text.includes(claim.quote))continue;
    const interpreted=interpretFactQuantity(claim.token??'',anchor,packet);
    if(!interpreted.known||!selectedQuantityIsAuthored(claim.quote,claim.token,anchor,interpreted))continue;
    const siblings=packet.slots.filter(s=>s.subject===anchor.subject&&s.factId.startsWith('builder.unit.'));
    const category=siblings.find(s=>s.factId.endsWith('.armySlotType'))?.value;
    for(const [field,labels]of [['startingSupply',['supply','人口','补给']],
      ['occupiedArmySlots',categorySlotLabels(category)]]){
      const fact=siblings.find(s=>s.factId.endsWith('.'+field));if(!fact||!labels.length)continue;
      const quantities=[];
      for(const match of claim.quote.matchAll(/[-+]?(?:\d+(?:\.\d+)?|\.\d+)[\s-]+[A-Za-z\u3400-\u9fff]+(?:[\s-]+(?:army[\s-]+)?slots?)?/g)){
        const parsed=interpretFactQuantity(match[0],fact,packet);
        const label=match[0].replace(/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)[\s-]+/,'').toLowerCase().replace(/[-_\s]+/g,' ');
        if(parsed.known&&labels.includes(label)&&selectedQuantityIsAuthored(claim.quote,match[0],fact,parsed))quantities.push(parsed.magnitudeToken);
      }
      // A quote containing multiple quantities of the same domain is ambiguous.
      if(quantities.length!==1)continue;
      if(!result.some(c=>c.factId===fact.factId&&c.quote===claim.quote&&c.token===quantities[0]))
        result.push({factId:fact.factId,quote:claim.quote,token:quantities[0],extraction:'host_selected_quote_quantity',anchorFactId:anchor.factId});
    }
  }
  return result;
}

function hasAuthoredFactReference(quote,factId){
  if(quote.includes(factId))return true;
  for(const m of quote.matchAll(/facts?\s+([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)/g)){
    const [first,...rest]=m[1].split('/'),prefix=first.slice(0,first.lastIndexOf('.')+1);
    if([first,...rest.map(part=>prefix+part)].includes(factId))return true;
  }return false;
}
// This is a deliberately narrow scope recognizer, not a strategy/NLP judge.
// Only an explicit count + canonical unit name (optional 'fully upgraded')
// resolves a whole current group. Ambiguous/subset counts stay unconfirmed.
function resolveClaimQuantityScope({packet,fact,quote}){
  if(!fact.quantityScope||hasAuthoredFactReference(quote,fact.factId))return {fact};
  const basis=fact.quantityScope;
  const escaped=[...basis.unitName].map(c=>'\\^$.*+?()[]{}|'.includes(c)?'\\'+c:c).join('');
  const matches=[...quote.matchAll(new RegExp('\\b(\\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(?:fully\\s+upgraded\\s+)?'+escaped+'s?\\b','gi'))];
  if(!matches.length)return {fact};
  const quantities=matches.map(m=>interpretRosterFactClaimTokenV1(m[1],0).value);
  if(quantities.length!==1)return {reason:'ambiguous_unit_quantity_scope'};
  const count=quantities[0];
  if(/\beach\b|\bper[- ](?:unit|model)\b|每台|每个单位/i.test(quote)){
    if(basis.kind==='unit_instance')return {fact};
    return {reason:'per_unit_quote_selected_aggregate'};
  }
  if(count===1&&basis.kind==='unit_instance')return {fact};
  const group=packet.slots.find(s=>s.quantityScope?.kind==='current_unit_group'
    &&s.quantityScope.unitType===basis.unitType&&s.factId.endsWith('.'+fact.factId.split('.').at(-1)));
  if(!group||group.quantityScope.memberSubjects.length!==count)return {reason:'quantity_not_unique_current_group'};
  return {fact:group};
}
// A selected source label is not an authored numeric quantity. Require the
// registered source AND the review's explicit citation; never suppress a number
// occurring outside a bare parenthetical reference or alongside a unit.
function isRegisteredSourceReference({fact,claim,citedEvidenceNumbers}){
  const token=claim.token.trim(),number=fact.source?.evidenceNumber;
  if(!/^\d+$/.test(token)||String(number)!==token||!citedEvidenceNumbers.some(n=>String(n)===token))return false;
  const occurrences=[...claim.quote.matchAll(new RegExp('(?<![\\w.])'+token+'(?![\\w.])','g'))];
  if(!occurrences.length)return false;
  const groups=[...claim.quote.matchAll(/\(\s*\d+(?:\s*,\s*\d+)*\s*\)/g)];
  return occurrences.every(m=>groups.some(g=>m.index>=g.index&&m.index+token.length<=g.index+g[0].length));
}
export function confirmRosterFactClaimsV1({packet,premise,claims,citedEvidenceNumbers=[]}){
  const errors=[],confirmed=[],unconfirmed=[];
  for(const claim of claims??[]){const fact=packet?.slots?.find(f=>f.factId===claim.factId);
    if(!fact){errors.push({code:'fact_claim_source_missing',premiseId:premise.premiseId,factId:claim.factId});continue;}
    if(claim.token===fact.factId&&claim.quote?.trim()&&premise.text.includes(claim.quote)
      &&hasAuthoredFactReference(claim.quote,fact.factId)){
      confirmed.push({premiseId:premise.premiseId,factId:fact.factId,quote:claim.quote,claimToken:claim.token,
        claimed:null,actual:copy(fact.value),unit:fact.unit,source:copy(fact.source),contradiction:false,
        referenceOnly:true,interpretationApproved:false,hostConfirmed:true});continue;
    }
    if(!claim.quote?.trim()||!premise.text.includes(claim.quote)||!claim.token?.trim()){
      errors.push({code:'fact_claim_quote_not_authored',premiseId:premise.premiseId});continue;}
    if(isRegisteredSourceReference({fact,claim,citedEvidenceNumbers})){
      unconfirmed.push({premiseId:premise.premiseId,factId:fact.factId,quote:claim.quote,claimToken:claim.token,
        source:copy(fact.source),hostConfirmed:false,contradiction:false,
        reason:'registered_source_reference_not_quantity',disposition:'reference_selection_not_fact'});continue;
    }
    const interpreted=interpretFactQuantity(claim.token,fact,packet);
    if(!interpreted.known){errors.push({code:interpreted.unitMismatch?'fact_claim_unit_mismatch':'fact_claim_token_not_interpretable',premiseId:premise.premiseId,factId:fact.factId});continue;}
    if(!selectedQuantityIsAuthored(claim.quote,claim.token,fact,interpreted)){
      errors.push({code:'fact_claim_quote_not_authored',premiseId:premise.premiseId,factId:fact.factId});continue;}
    const scope=resolveClaimQuantityScope({packet,fact,quote:claim.quote});
    if(scope.reason){unconfirmed.push({premiseId:premise.premiseId,factId:fact.factId,quote:claim.quote,claimToken:claim.token,
      claimed:interpreted.value,hostConfirmed:false,contradiction:false,reason:scope.reason,disposition:'scope_unverified_not_fact'});continue;}
    const resolved=scope.fact;
    const difference={premiseId:premise.premiseId,factId:resolved.factId,selectedFactId:fact.factId,quote:claim.quote,claimToken:claim.token,
      claimed:interpreted.value,actual:copy(resolved.value),unit:resolved.unit,source:copy(resolved.source),
      ...(resolved.resourceEffect==='provides_capacity'?{comparisonScope:'numeric_quantity_only',interpretationApproved:false,resourceEffect:resolved.resourceEffect,slotCategory:resolved.slotCategory}:{}),
      ...(resolved.quantityScope?{quantityScope:copy(resolved.quantityScope)}:{}),...(resolved.derivation?{derivation:copy(resolved.derivation)}:{}),
      contradiction:!isDeepStrictEqual(interpreted.value,resolved.value),hostConfirmed:true};
    // A CURRENT Builder fact does not establish the price of a hypothetical
    // alternative. Different contexts are not a confirmed author contradiction.
    if(difference.contradiction&&fact.factId.startsWith('builder.')
      &&/\balternative\b|\bcounterfactual\b|备选|替代/.test(claim.quote)
      &&!hasAuthoredFactReference(claim.quote,fact.factId)){
      unconfirmed.push({...difference,contradiction:false,hostConfirmed:false,reason:'alternative_not_current_builder',
        disposition:'scope_unverified_not_fact',instruction:'Use an actual alternative Builder/candidate receipt before presenting a cost difference as proven; current total and alternative incremental cost are not comparable operands.'});continue;
    }
    confirmed.push(difference);
  }
  return {errors,confirmed,unconfirmed};
}
export const ROSTER_FACT_CLAIM_SCHEMA_V1={type:'object',properties:{
  factId:{type:'string',minLength:1,maxLength:65536},quote:{type:'string',minLength:1,maxLength:65536},
  token:{type:'string',minLength:1,maxLength:65536}},required:['factId','quote','token'],additionalProperties:false};
// Explicit parenthetical source summaries have an engineering-defined meaning.
// Only bind a whole typed quantity inside the same (fact <exact ID>, ...) group;
// do not infer a subject from general strategy prose, forecasts or unit names.
export function extractAnchoredRosterFactClaimsV1({packet,premise}){
  const claims=[];
  for(const match of premise.text.matchAll(/\(fact\s+([^,()\s]+)\s*,([^()]*)\)/g)){
    const anchor=packet?.slots?.find(s=>s.factId===match[1]);
    if(!anchor?.factId.startsWith('builder.unit.'))continue;
    const siblings=packet.slots.filter(s=>s.subject===anchor.subject&&s.factId.startsWith('builder.unit.'));
    const category=siblings.find(s=>s.factId.endsWith('.armySlotType'))?.value;
    for(const raw of match[2].split(',')){
      const part=raw.trim(),quantity=part.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\s+(.+)$/);
      if(!quantity)continue;
      const label=quantity[2].toLowerCase();let field;
      if(label==='supply'||label==='人口')field='startingSupply';
      else if(['model','models','模型'].includes(label))field='startingModelCount';
      else if(typeof category==='string'&&[category.toLowerCase()+' slot',category.toLowerCase()+' slots',category.toLowerCase()+'-slot'].includes(label))field='occupiedArmySlots';
      const fact=field?siblings.find(s=>s.factId.endsWith('.'+field)):null;
      if(fact)claims.push({factId:fact.factId,quote:match[0],token:quantity[1],extraction:'host_explicit_fact_summary',anchorFactId:anchor.factId});
    }
  }return claims;
}
export function assessRosterFactOnlyPremisesV1({contract,audit}){
  const errors=[],confirmed=[],advisories=[],unconfirmedClaims=[];
  const rows=audit?.rows??[];
  for(const premise of contract.premises){const matches=rows.filter(r=>r.premiseId===premise.premiseId);
    if(matches.length!==1){errors.push({code:'fact_premise_coverage',premiseId:premise.premiseId});continue;}
    const row=matches[0];if(!Array.isArray(row.factClaims)){errors.push({code:'fact_claims_required',premiseId:premise.premiseId});continue;}
    const automatic=[...extractAnchoredRosterFactClaimsV1({packet:contract.factSlots,premise}),
      ...extractSelectedQuoteFactClaims({packet:contract.factSlots,premise,claims:row.factClaims})];
    const result=confirmRosterFactClaimsV1({packet:contract.factSlots,premise,claims:[...automatic,...row.factClaims],citedEvidenceNumbers:row.evidenceNumbers??[]});
    errors.push(...result.errors);unconfirmedClaims.push(...result.unconfirmed);confirmed.push(...result.confirmed.map(c=>({...c,
      authoredLocations:copy(premise.authoredLocations??[]),
      ...{extraction:automatic.find(a=>a.factId===c.factId&&a.quote===c.quote&&a.token===c.claimToken)?.extraction??'model_selected_author_claim'}})));
    for(const assertion of row.sourceAssertions??[]){
      const fact=contract.ruleFacts?.find(f=>f.factKey===assertion.factKey);
      if(!fact||!['activationKind','phase','resourceType','resourceCost'].includes(assertion.field)){errors.push({code:'fact_native_source_missing',premiseId:premise.premiseId});continue;}
      const actual=fact[assertion.field]===null?null:String(fact[assertion.field]);
      confirmed.push({premiseId:premise.premiseId,factId:assertion.factKey+'.'+assertion.field,quote:premise.text,claimed:assertion.claimedValue,actual,
        authoredLocations:copy(premise.authoredLocations??[]),
        source:{kind:'native_definition',sourceBundle:fact.sourceBundle,routeHash:fact.routeHash,field:assertion.field},contradiction:assertion.claimedValue!==actual,hostConfirmed:true});
    }
    if(row.verdict!=='supported')advisories.push({premiseId:row.premiseId,publicReason:row.publicReason,
      disposition:result.confirmed.some(c=>c.contradiction)?'confirmed_fact_correction':'advisory_not_fact_proof'});
  }
  const contradictions=confirmed.filter(c=>c.contradiction);
  return {accepted:!errors.length&&!contradictions.length,errors,confirmedFacts:confirmed,
    rejectedPremises:contradictions.map(c=>({...c,verdict:'requires_revision',publicReason:'原句值与当前原件冲突；修前提后由作者选择。'})),
    advisories,unconfirmedClaims,tradeoff:audit?.tradeoff?copy(audit.tradeoff):null,aggregateConflict:false};
}

export async function restoreRosterSelectedFactSlotsV1({packet,boundFacts,state,readArtifact}){
  const result=copy(packet);
  for(const slot of boundFacts??[]){
    if(result.slots.some(s=>s.factId===slot.factId))continue;
    if(slot.source?.pointerKind!=='workflow_evidence_value')continue;
    const e=state.evidence.find(e=>e.id===slot.source.evidenceId&&e.artifactRef===slot.source.artifactRef);
    if(!e||e.kind!=='tool_receipt'||Object.entries(e.bindings??{}).some(([k,v])=>state.scope[k]!==v))continue;
    const raw=await readArtifact(e.artifactRef),value=pointerValue(evidenceBody(raw),slot.source.pointer);
    if(!isDeepStrictEqual(value,slot.value)||value===null||typeof value==='object'||value===undefined)continue;
    result.slots.push({...copy(slot),value:copy(value)});
  }
  return result;
}

// Read-time repair of an old Host assessment, using the SAME immutable source.
// The paid reply and queued work inputs remain unchanged; no acceptance is granted.
export function projectRosterFactScopeInputsV1({inputs,packet}){
  const prior=inputs?.comparisonOwnerReturn?.value,assessment=prior?.premiseAssessment;
  if(!assessment?.confirmedFacts?.length)return inputs;
  const confirmed=[],unconfirmed=[...(assessment.unconfirmedClaims??[])],changes=[];
  for(const old of assessment.confirmedFacts){
    const selectedId=old.selectedFactId??old.factId,slot=packet.slots.find(s=>s.factId===selectedId);
    if(!slot?.quantityScope||!old.claimToken||old.referenceOnly
      ||slot.source.artifactRef!==old.source?.artifactRef||slot.source.pointer!==old.source?.pointer){confirmed.push(copy(old));continue;}
    const checked=confirmRosterFactClaimsV1({packet,premise:{premiseId:old.premiseId,text:old.quote},
      claims:[{factId:selectedId,quote:old.quote,token:old.claimToken}]});
    if(checked.errors.length){confirmed.push(copy(old));continue;}
    for(const fresh of checked.confirmed)confirmed.push({...copy(old),...fresh});
    unconfirmed.push(...checked.unconfirmed.map(c=>({...c,authoredLocations:copy(old.authoredLocations??[])})));
    if(checked.unconfirmed.length||checked.confirmed.some(c=>c.factId!==old.factId||c.contradiction!==old.contradiction||!isDeepStrictEqual(c.actual,old.actual)))
      changes.push({premiseId:old.premiseId,quote:old.quote,selectedFactId:selectedId,priorActual:old.actual,
        current:copy(checked.confirmed),unconfirmed:copy(checked.unconfirmed)});
  }
  if(!changes.length)return inputs;
  const unique=confirmed.filter((c,i,a)=>a.findIndex(v=>v.premiseId===c.premiseId&&v.factId===c.factId&&v.quote===c.quote&&isDeepStrictEqual(v.claimed,c.claimed))===i);
  const rejected=unique.filter(c=>c.contradiction).map(c=>({...c,verdict:'requires_revision',publicReason:'原句值与同主体、同计量范围原件冲突；修前提后由作者选择。'}));
  const findings=copy(prior.findings),cost=findings.find(c=>c.checkId==='decision_opportunity_cost');
  const diagnostic=c=>'Confirmed fact contradiction: '+c.factId+'; author token '+JSON.stringify(c.claimed)+'; source value '+JSON.stringify(c.actual)+'. Correct the factual premise, then freely retain or change the strategy.';
  if(cost){
    const obsolete=new Set((assessment.rejectedPremises??[]).map(diagnostic));
    cost.requiredDecisions=[...(cost.requiredDecisions??[]).filter(t=>!obsolete.has(t)),...rejected.map(diagnostic)];
    if(rejected.length){cost.verdict='requires_revision';cost.publicReason='Host按实际成员与同一Builder来源重核数量范围。只纠正确认的事实差异；策略仍由作者决定。';}
    else if(!cost.requiredDecisions.length&&!cost.requiredData?.length)cost.verdict='supported';
  }
  return {...inputs,comparisonOwnerReturn:{...inputs.comparisonOwnerReturn,value:{...copy(prior),findings,
    premiseAssessment:{...copy(assessment),confirmedFacts:unique,rejectedPremises:rejected,unconfirmedClaims:unconfirmed,
      accepted:!(assessment.errors??[]).length&&!rejected.length},
    quantityScopeReconciliation:{version:1,draftRef:packet.draftRef,reviewResultRef:prior.decisionValueResultRef,
      changes,priorArtifactsUnchanged:true,acceptanceGranted:false}}}};
}
