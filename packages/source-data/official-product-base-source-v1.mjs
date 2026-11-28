import {createHash} from 'node:crypto';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
const productUrl='https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-firebat-terran-expansion-set';
const sha=b=>createHash('sha256').update(b).digest('hex');
export function verifyOfficialProductBaseSourceV1(source){
  const {sourceHash,...body}=source||{};
  if(source?.schema!=='starcraft_tmg_official_product_base_source_v1'||sourceHash!==hash(body)
    ||source.recordKey!=='army_units:firebat'||source.productCode!=='SCMG0051'||source.productPage?.url!==productUrl
    ||source.shape!=='round'||source.widthMillimetres!==40||source.depthMillimetres!==40
    ||source.visuallyReviewed!==true||source.association!=='six_round_miniature_bases_and_one_long_fire_wall'
    ||source.dimensionAuthority!=='official_product_contents'||source.templateDimensionsVerified!==false
    ||source.trainingTruth!==false||![source.productPage,source.productImage].every(s=>s?.ref
      &&Number.isSafeInteger(s.byteLength)&&s.byteLength>0&&/^[a-f0-9]{64}$/u.test(s.byteHash))
    ||!source.productImage.url.startsWith('https://archon-studio.com/files/'))
    throw Error('OFFICIAL_PRODUCT_BASE_SOURCE_INVALID');
  return true;
}
export function createOfficialProductBaseSourceV1({record,productPage,productImage,pageBytes,imageBytes,visuallyReviewed}={}){
  const text=Buffer.from(pageBytes).toString('utf8').replace(/<[^>]*>/gu,' ').replace(/\s+/gu,' ');
  if(record?.recordKey!=='army_units:firebat'||record.payload?.name!=='Firebat'||visuallyReviewed!==true
    ||sha(pageBytes)!==productPage?.byteHash||pageBytes.length!==productPage.byteLength
    ||sha(imageBytes)!==productImage?.byteHash||imageBytes.length!==productImage.byteLength
    ||!text.includes('SCMG0051')||!/6 x Firebat Miniatures/iu.test(text)
    ||!/Bases\s+40x100 mm\s+40mm/iu.test(text))throw Error('OFFICIAL_PRODUCT_BASE_CAPTURE_MISMATCH');
  const body={schema:'starcraft_tmg_official_product_base_source_v1',recordKey:record.recordKey,
    sourceRecordHash:record.sourceRecordHash,payloadHash:record.payloadHash,productCode:'SCMG0051',productPage,productImage,
    shape:'round',widthMillimetres:40,depthMillimetres:40,visuallyReviewed:true,
    association:'six_round_miniature_bases_and_one_long_fire_wall',dimensionAuthority:'official_product_contents',
    templateDimensionsVerified:false,trainingTruth:false};
  const source={...body,sourceHash:hash(body)};verifyOfficialProductBaseSourceV1(source);return source;
}
