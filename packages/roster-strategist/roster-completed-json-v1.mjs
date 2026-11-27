import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
// Parse before JSON.parse can silently discard duplicate members. Only inactive
// duplicate mutation/strategicChanges placeholders in one explicit revise are
// collapsible. Two nonempty values, other duplicate keys, missing fields and
// scalar syntax errors remain failures. Original paid text is never rewritten.
function parseAuthorDocument(text){
  let at=0;const placeholders=[];
  const ws=()=>{while(at<text.length&&/\s/u.test(text[at]))at++;};
  const fail=()=>{throw Error('ambiguous_author_json');};
  function string(){const begin=at++;let escaped=false;while(at<text.length){const c=text[at++];if(escaped){escaped=false;continue;}if(c==='\\'){escaped=true;continue;}if(c==='"')return JSON.parse(text.slice(begin,at));}fail();}
  function value(path){ws();const c=text[at];
    if(c==='"')return string();
    if(c==='{'){at++;ws();const result=Object.create(null);if(text[at]==='}'){at++;return result;}
      while(true){ws();if(text[at]!=='"')fail();const key=string();ws();if(text[at++]!==':')fail();const child=path+'/'+key,v=value(child);
        if(Object.hasOwn(result,key)){
          const previous=result[key],allowed=/^\/decisions\/\d+\/(mutation|strategicChanges)$/u.test(child);
          const empty=x=>x===null||Array.isArray(x)&&x.length===0;
          if(!allowed||empty(previous)===empty(v))fail();
          placeholders.push({path:child,discarded:empty(v)?v:previous,kept:'explicit_nonempty_value'});
          if(empty(previous))result[key]=v;
        }else result[key]=v;
        ws();const end=text[at++];if(end==='}')return result;if(end!==',')fail();
      }
    }
    if(c==='['){at++;ws();const rows=[];if(text[at]===']'){at++;return rows;}while(true){rows.push(value(path+'/'+rows.length));ws();const end=text[at++];if(end===']')return rows;if(end!==',')fail();}}
    const match=/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u.exec(text.slice(at));if(!match)fail();at+=match[0].length;return JSON.parse(match[0]);
  }
  const document=value('');ws();if(at!==text.length||document?.action!=='finish'||document.decisions?.length!==1
    ||document.decisions[0].disposition!=='revise'||!document.decisions[0].mutation)fail();
  return {document,placeholders};
}
export function recoverRosterCompletedAuthorJsonV1(text){
  if(typeof text!=='string'||text.length>131072||!text.trimStart().startsWith('{')||!text.trimEnd().endsWith('}'))return null;
  let offset;try{JSON.parse(text);return null;}catch(e){offset=Number(/position (\d+)/u.exec(e.message)?.[1]??-1);}
  if(!Number.isSafeInteger(offset)||offset<0)return null;
  const candidates=new Map(),start=Math.max(0,offset-160),end=Math.min(text.length,offset+16);let quoted=false,escaped=false;
  for(let i=0;i<end;i++){
    const c=text[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
    if(c==='"'){quoted=true;continue;}if(i<start||!['}',']'].includes(c))continue;
    const candidate=text.slice(0,i)+text.slice(i+1);
    try{const parsed=parseAuthorDocument(candidate),canonical=JSON.stringify(parsed.document);candidates.set(canonical,{canonical,offset:i,delimiter:c,placeholders:parsed.placeholders});}catch{}
  }
  if(candidates.size!==1)return null;
  const one=candidates.values().next().value;
  return {text:one.canonical,kind:'completed_author_container_v1',evidence:{originalTextHash:hash(text),normalizedTextHash:hash(one.canonical),
    removedDelimiter:one.delimiter,removedUtf16Offset:one.offset,parseErrorUtf16Offset:offset,
    inactiveDuplicateMembers:one.placeholders,scalarValuesUnchanged:true,uniqueInterpretation:true,
    schemaValidated:false,semanticApprovalGranted:false}};
}
