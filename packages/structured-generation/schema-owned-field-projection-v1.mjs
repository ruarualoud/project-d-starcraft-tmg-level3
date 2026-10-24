// One-hop, schema-owned relocation; not semantic repair or a recursive search.
// Values are copied exactly. A field already owned by the nested schema, an
// unknown parent field, or an occupied parent slot remains untouched/invalid.
export function projectSchemaOwnedSiblingFieldsV1(input,schema,{recordField,nestedField}){
  const output=structuredClone(input),projection=[];
  const parent=schema?.properties?.[recordField]?.items;
  const nested=parent?.properties?.[nestedField];
  if(!parent?.properties||!nested?.properties||!Array.isArray(output?.[recordField]))return {output,projection};
  const escape=key=>key.replaceAll('~','~0').replaceAll('/','~1');
  output[recordField].forEach((row,index)=>{
    const child=row?.[nestedField];
    if(!child||typeof child!=='object'||Array.isArray(child))return;
    for(const key of Object.keys(child)){
      if(Object.hasOwn(nested.properties,key)||!Object.hasOwn(parent.properties,key)||Object.hasOwn(row,key))continue;
      row[key]=child[key];delete child[key];
      const root=`/${escape(recordField)}/${index}`;
      projection.push({rule:'schema_owned_sibling_field_relocation_v1',
        from:`${root}/${escape(nestedField)}/${escape(key)}`,to:`${root}/${escape(key)}`,
        valuePreserved:true,semanticApprovalGranted:false});
    }
  });
  return {output,projection};
}

// The inverse one-hop error: a root field has ONE declared child-object owner.
// No union guessing, recursive search, missing object synthesis or overwrites.
export function projectSchemaOwnedChildFieldsV1(input,schema){
  const output=structuredClone(input),projection=[];
  if(!output||typeof output!=='object'||Array.isArray(output)||schema?.additionalProperties!==false||!schema.properties)
    return {output,projection};
  const escape=key=>key.replaceAll('~','~0').replaceAll('/','~1');
  for(const key of Object.keys(output)){
    if(Object.hasOwn(schema.properties,key))continue;
    const owners=Object.entries(schema.properties).filter(([,s])=>s.type==='object'&&s.additionalProperties===false
      &&Object.hasOwn(s.properties??{},key));
    if(owners.length!==1)continue;
    const [name]=owners[0],child=output[name];
    if(!child||typeof child!=='object'||Array.isArray(child)||Object.hasOwn(child,key))continue;
    child[key]=output[key];delete output[key];
    projection.push({rule:'schema_owned_child_field_relocation_v1',from:'/'+escape(key),
      to:'/'+escape(name)+'/'+escape(key),valuePreserved:true,semanticApprovalGranted:false});
  }
  return {output,projection};
}

// Closed contracts may safely ignore a redundant extra string only when the
// identical nonempty value already occupies ONE canonical sibling field.
// Unknown unique content, conflicts and ambiguous unions remain validation
// errors. Preserve the raw paid document separately and record each projection.
export function projectSchemaDuplicateFieldsV1(input,schema){
  const output=structuredClone(input),projection=[];
  const escape=key=>key.replaceAll('~','~0').replaceAll('/','~1');
  const matches=(value,s)=>{
    if(!s||typeof s!=='object')return false;
    if(s.enum&&!s.enum.includes(value)||Object.hasOwn(s,'const')&&s.const!==value)return false;
    return s.type==='null'?value===null:s.type==='array'?Array.isArray(value):s.type==='object'
      ?value!==null&&typeof value==='object'&&!Array.isArray(value):s.type==='integer'
      ?Number.isInteger(value):s.type===undefined||typeof value===s.type;
  };
  function visit(value,s,path){
    if(!s||typeof s!=='object'||value===null||typeof value!=='object')return;
    const alternatives=s.anyOf??s.oneOf;
    if(alternatives){const selected=alternatives.filter(option=>matches(value,option));
      if(selected.length!==1)return;return visit(value,selected[0],path);}
    if(Array.isArray(value)){if(s.items&&!Array.isArray(s.items))value.forEach((v,i)=>visit(v,s.items,path+'/'+i));return;}
    if(!s.properties)return;
    if(s.additionalProperties===false&&!s.patternProperties){
      for(const key of Object.keys(value)){
        if(Object.hasOwn(s.properties,key)||typeof value[key]!=='string'||!value[key].trim())continue;
        const owners=Object.keys(s.properties).filter(known=>Object.hasOwn(value,known)&&value[known]===value[key]);
        if(owners.length!==1)continue;
        projection.push({rule:'schema_duplicate_field_projection_v1',from:path+'/'+escape(key),
          retainedAt:path+'/'+escape(owners[0]),valuePreserved:true,semanticApprovalGranted:false});
        delete value[key];
      }
    }
    for(const key of Object.keys(value))if(Object.hasOwn(s.properties,key))visit(value[key],s.properties[key],path+'/'+escape(key));
  }
  visit(output,schema,'');return {output,projection};
}
