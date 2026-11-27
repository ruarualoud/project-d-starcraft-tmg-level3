import {ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1} from './army-builder-query-port-v1.mjs';

// Provider strict schemas require null placeholders for Native OPTIONAL fields.
// Native omission and this null mean the same thing; neither selects a profile,
// a model count or an upgrade. Derive the bridge from Native, not a field list.
const nativeUnit=ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1.properties.units.items;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const escape=key=>key.replaceAll('~','~0').replaceAll('/','~1');
function selectedSchema(value,schema){
  if(!schema)return null;
  const variants=schema.anyOf??schema.oneOf;
  if(!variants)return schema;
  const matches=variants.filter(s=>s.type==='null'?value===null:s.type==='array'?Array.isArray(value)
    :s.type==='object'?object(value)&&Object.entries(s.properties??{}).every(([key,p])=>
      !Object.hasOwn(value,key)||(!p.enum||p.enum.includes(value[key]))&&(!Object.hasOwn(p,'const')||p.const===value[key]))
      :typeof value===s.type);
  return matches.length===1?selectedSchema(value,matches[0]):null;
}
export function projectRosterParticipantOptionalFieldsV1({request,output}){
  const value=structuredClone(output),projection=[];
  function fill(row,native,provider,path){
    if(!object(row)||!native?.properties||!provider?.properties)return;
    for(const [key,field]of Object.entries(native.properties)){
      const wire=provider.properties[key];if(!wire)continue;
      if(!Object.hasOwn(row,key)){
        if(!native.required?.includes(key)&&wire.anyOf?.some(s=>s.type==='null')){
          row[key]=null;projection.push({rule:'native_optional_participant_field_v1',to:path+'/'+escape(key),
            value:null,nativeOptional:true,selectionChanged:false,semanticApprovalGranted:false});
        }
        continue;
      }
      if(field.type==='array'&&Array.isArray(row[key])){
        const array=selectedSchema(row[key],wire);
        row[key].forEach((entry,index)=>fill(entry,field.items,selectedSchema(entry,array?.items),path+'/'+escape(key)+'/'+index));
      }else if(field.type==='object')fill(row[key],field,selectedSchema(row[key],wire),path+'/'+escape(key));
    }
  }
  function visit(row,raw,path){
    const schema=selectedSchema(row,raw);if(!schema)return;
    if(Array.isArray(row)){row.forEach((entry,index)=>visit(entry,schema.items,path+'/'+index));return;}
    if(!object(row)||!schema.properties)return;
    for(const [key,entry]of Object.entries(row)){
      const field=schema.properties[key];if(!field)continue;
      const next=path+'/'+escape(key);
      if(key==='participantConfigurations'&&Array.isArray(entry)){
        const array=selectedSchema(entry,field);
        entry.forEach((unit,index)=>{
          const wire=selectedSchema(unit,array?.items);
          if(wire?.properties?.unitInstanceId&&wire.properties.recordKey&&wire.properties.compositionProfileId
            &&wire.properties.compositionKind&&wire.properties.upgrades)fill(unit,nativeUnit,wire,next+'/'+index);
        });
      }else visit(entry,field,next);
    }
  }
  visit(value,request?.responseFormat?.schema,'');return {output:projection.length?value:output,projection};
}
