// Search/pagination is over the SAME immutable evidence directory, preserving
// stable numbers and exact read access. No relevance model or strategic filter.
export function projectRosterCatalogueEntryV1({number,id,title,kind,access,validity,outline}) {
  // Existing immutable publications used opaque "Support source N" labels.
  // Expose their already-bound record identity, without changing stable numeric
  // handles, loading the body, or implying that the source has been read.
  const sourceRecordKey=/^(?:support-source|unit-source):(.+):[a-f0-9]{64}$/u.exec(id??'')?.[1];
  return {number,title:sourceRecordKey&&!title?.includes(sourceRecordKey)
      ?`${title} (${sourceRecordKey})`:title,
    kind,access,validity,outline,...(sourceRecordKey?{sourceRecordKey}:{})};
}
export function searchRosterWorkflowCatalogueV1(directory,query){
  const needle=query.query.trim().toLocaleLowerCase();
  const matches=directory.filter(entry=>(query.validity==='all'
      ||(entry.validity==='current'?'current':'historical')===query.validity)
    &&(!query.kind||entry.kind===query.kind)
    &&(!needle||`${entry.id}\n${entry.title}`.toLocaleLowerCase().includes(needle)));
  const entries=matches.slice(query.offset,query.offset+query.limit).map(projectRosterCatalogueEntryV1);
  return {schema:'roster_workflow_catalogue_page_v1',query:structuredClone(query),
    totalMatches:matches.length,entries,
    nextPage:query.offset+entries.length<matches.length?{...query,offset:query.offset+entries.length}:null,
    evidenceBodiesRead:false,ordering:'original_stable_evidence_number',
    scope:'Directory metadata only, not proof of any claim. Read selected evidenceNumber through the existing reader.'};
}
const normalizeSourceText=value=>value.replace(/<[^>]*>/gu,' ').replace(/&nbsp;|&#160;/giu,' ')
  .replace(/\s+/gu,' ').trim().toLocaleLowerCase();
function indexSourceText(value,pointer='',rows=[]){
  if(typeof value==='string')rows.push({pointer,text:normalizeSourceText(value)});
  else if(value&&typeof value==='object')for(const [key,child]of Object.entries(value))
    indexSourceText(child,pointer+'/'+key.replace(/~/gu,'~0').replace(/\//gu,'~1'),rows);
  return rows;
}
// Frozen artifacts already belong to this directory. Index their actual text,
// not LLM summaries or tactical keywords, and keep the original numeric handles.
// Host indexing does not constitute body delivery/read access for the model.
export async function searchRosterWorkflowSourceCatalogueV1(directory,query,{store,indexCache=new Map()}){
  const needle=normalizeSourceText(query.query),availableKinds=[...new Set(directory.map(e=>e.kind))];
  const eligible=directory.filter(entry=>(query.validity==='all'
    ||(entry.validity==='current'?'current':'historical')===query.validity)&&(!query.kind||entry.kind===query.kind));
  const matches=[];
  for(const entry of eligible){
    const metadataMatch=!needle||normalizeSourceText(`${entry.id}\n${entry.title}`).includes(needle);
    let sourceMatches=[];
    if(needle){
      let index=indexCache.get(entry.artifactRef);
      if(!index){index=indexSourceText(await store.get(entry.artifactRef));indexCache.set(entry.artifactRef,index);}
      sourceMatches=index.filter(row=>row.text.includes(needle)).slice(0,8).map(row=>({pointer:row.pointer}));
    }
    if(metadataMatch||sourceMatches.length)matches.push({...entry,sourceMatches,metadataMatch});
  }
  const page=matches.slice(query.offset,query.offset+query.limit);
  return {schema:'roster_workflow_catalogue_page_v2',query:structuredClone(query),totalMatches:matches.length,
    entries:page.map(entry=>({...projectRosterCatalogueEntryV1(entry),metadataMatch:entry.metadataMatch,
      sourceMatches:entry.sourceMatches,matchingPointersAreReadHandles:true})),
    nextPage:query.offset+page.length<matches.length?{...query,offset:query.offset+page.length}:null,
    queryDiagnostics:{unknownKind:query.kind&&!availableKinds.includes(query.kind)?query.kind:null,availableKinds,
      zeroMatchesDoesNotProveSourceAbsence:true},
    evidenceBodiesRead:false,sourceIndexReadByHost:true,ordering:'original_stable_evidence_number',
    scope:'Literal metadata and normalized text search of registered immutable artifacts. Matching pointers are navigation only: read the chosen evidenceNumber/pointer before citing its content. A Plan/Skill match retains its original non-Rules authority. No match does not establish source unavailability.'};
}
export function describeRosterWorkflowCatalogueV1(directory){
  const groups=new Map();
  for(const entry of directory){
    const validity=entry.validity==='current'?'current':'historical',key=`${validity}:${entry.kind}`;
    if(!groups.has(key))groups.set(key,{validity,kind:entry.kind,count:0});
    groups.get(key).count++;
  }
  return {schema:'roster_workflow_catalogue_index_v1',totalEntries:directory.length,groups:[...groups.values()],
    instruction:'Use action=catalogue with catalogueQueries to search literal title/ID AND normalized text in registered frozen artifacts, kind, current/historical/all and offset/limit. Use the actual kind names in groups; an unknown kind is reported, never silently corrected. Empty query and kind browse all matches. Results preserve original evidence numbers, matching JSON Pointer read handles and nextPage; then action=read retrieves exact bodies. Catalogue results are not read evidence or authority approval. Previously known evidence numbers still work. Old metadata-only zero-match results did not search source text and cannot prove the original is unavailable. No source was deleted or hidden behind a relevance score.'};
}
