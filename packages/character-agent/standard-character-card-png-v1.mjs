import {embedStarcraftTmgCharacterCardV2JsonInPng} from './character-card-v2-png-adapter-v2.mjs';
import {readStandardCharacterCardV1} from '../companion-backend-module-v1/standard-roleplay-v1.mjs';

// Reuse the existing strict image/CRC/APNG validation. V3 transport has its
// own ccv3 chunk; it is never relabelled or reduced to the older V2 shape.
const validationCard={spec:'chara_card_v2',spec_version:'2.0',data:{}};
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const fail=reason=>{throw Object.assign(new Error(reason),{code:reason});};
function chunks(bytes){
  const result=[];
  for(let offset=8;offset<bytes.length;){
    const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),end=offset+length+12;
    const data=bytes.subarray(offset+8,offset+8+length);
    result.push({type,data,raw:bytes.subarray(offset,end),keyword:type==='tEXt'?data.subarray(0,data.indexOf(0)).toString('latin1'):null});
    offset=end;
  }
  return result;
}
function crc32(bytes){
  let value=0xffffffff;
  for(const byte of bytes){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}
  return (value^0xffffffff)>>>0;
}
function textChunk(keyword,serialized){
  const data=Buffer.from(keyword+'\0'+Buffer.from(serialized,'utf8').toString('base64'),'latin1');
  const type=Buffer.from('tEXt'),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));
  return Buffer.concat([length,type,data,crc]);
}
function validatedChunks(input){
  const bytes=Buffer.from(input);
  embedStarcraftTmgCharacterCardV2JsonInPng(bytes,validationCard);
  return chunks(bytes);
}
export function exportStandardCharacterCardPngV1(pngInput,cardInput){
  const snapshot=readStandardCharacterCardV1(cardInput?.serialized||cardInput);
  const imageChunks=validatedChunks(pngInput).filter(chunk=>!['chara','ccv3'].includes(chunk.keyword));
  const before=imageChunks.findIndex(chunk=>chunk.type==='IDAT');
  const cardChunk=textChunk(snapshot.spec==='chara_card_v3'?'ccv3':'chara',snapshot.serialized);
  const png=Buffer.concat([signature,...imageChunks.slice(0,before).map(chunk=>chunk.raw),cardChunk,...imageChunks.slice(before).map(chunk=>chunk.raw)]);
  // Roundtrip the written bytes before returning a purported export.
  const read=importStandardCharacterCardPngV1(png);
  if(read.snapshot.cardHash!==snapshot.cardHash||read.snapshot.serialized!==snapshot.serialized)fail('STANDARD_CARD_PNG_ROUNDTRIP_FAILED');
  return {png,snapshot,imageBytesPreserved:true,keyword:snapshot.spec==='chara_card_v3'?'ccv3':'chara'};
}
export function importStandardCharacterCardPngV1(pngInput){
  const all=validatedChunks(pngInput),v3=all.filter(chunk=>chunk.keyword==='ccv3'),v2=all.filter(chunk=>chunk.keyword==='chara');
  const preferred=v3.length?v3:v2;
  if(preferred.length!==1)fail('STANDARD_CARD_PNG_CHUNK_CARDINALITY_INVALID');
  const chunk=preferred[0],raw=chunk.data.subarray(chunk.data.indexOf(0)+1);
  if(raw.some(byte=>byte>127))fail('STANDARD_CARD_PNG_BASE64_INVALID');
  const encoded=raw.toString('ascii');
  const bytes=Buffer.from(encoded,'base64');
  if(bytes.toString('base64')!==encoded)fail('STANDARD_CARD_PNG_BASE64_INVALID');
  let serialized;try{serialized=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('STANDARD_CARD_PNG_UTF8_INVALID');}
  const snapshot=readStandardCharacterCardV1(serialized);
  if((v3.length&&snapshot.spec!=='chara_card_v3')||(!v3.length&&snapshot.spec!=='chara_card_v2'))fail('STANDARD_CARD_PNG_SPEC_MISMATCH');
  const carrierPng=Buffer.concat([signature,...all.filter(chunk=>!['chara','ccv3'].includes(chunk.keyword)).map(chunk=>chunk.raw)]);
  return {snapshot,carrierPng,preferredKeyword:v3.length?'ccv3':'chara',unknownImageChunksPreserved:true};
}
