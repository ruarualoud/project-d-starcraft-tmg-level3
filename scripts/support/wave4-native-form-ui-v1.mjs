import assert from 'node:assert/strict';
import {describeNativeActionFormV1} from '../../packages/client-domain/native-action-form-v1.mjs';
const labels={activeUnitId:'行动单位',targetUnitId:'目标单位',targetPieceId:'目标单位',leadingModelId:'领队模型',modelId:'模型',
  paymentCardInstanceIds:'支付卡牌',choice:'能力选项',placements:'模型最终站位',path:'领队路径',coordinate:'位置',
  xMilliInches:'横向位置（英寸）',yMilliInches:'纵向位置（英寸）',rotationDegrees:'朝向（度）',elevation:'高度层',supportTerrainIds:'支撑地形',
  casualtyModelIds:'移除模型（按顺序）',casualtySelectionHash:'伤亡方案',convertedFailedHitDieIndices:'用 PRECISION 转为命中的骰'};
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

// Populate the existing UI from Native intent parameters and the public form
// descriptor. No coordinate, payment, target or Rules choice is inferred here.
export async function fillWave4NativeFormUiV1(form,domain,parameters,state){
  const actor=state.pieces.find(p=>p.id===domain.pieceId),modelIds=actor?.models.filter(m=>!m.isDestroyed&&m.isOnField!==false).map(m=>m.id)||[],
    description=describeNativeActionFormV1(domain,{modelIds,tokenIds:(state.board.tokens||[]).map(t=>t.tokenId)});
  assert.equal(description.supported,true,JSON.stringify(description.missing));
  async function fill(scope,name,descriptor,value){
    const title=descriptor.title||labels[name]||name;
    if(Object.hasOwn(descriptor,'const')){assert.deepEqual(value,descriptor.const);return;}
    if(descriptor.enum){const index=descriptor.enum.findIndex(v=>JSON.stringify(v)===JSON.stringify(value));
      assert.ok(index>=0,'NATIVE_UI_ENUM_VALUE_MISSING:'+name);await scope.getByTestId('native-choice-'+name+'-'+index).click();return;}
    if(descriptor.type==='object'){
      for(const [key,child]of Object.entries(descriptor.properties||{}))if(value?.[key]!==undefined)await fill(scope,key,child,value[key]);return;
    }
    if(descriptor.type==='array'){
      assert.ok(Array.isArray(value));const array=scope.getByText(new RegExp('^'+escape(title)+' · \\d')).locator('..');
      if(!value.length){await array.getByRole('button',{name:'选择空列表',exact:true}).click();return;}
      for(const [index,item]of value.entries()){
        await array.getByRole('button',{name:'添加'+title,exact:true}).click();
        const row=array.getByText('第 '+(index+1)+' 项',{exact:true}).locator('..');
        await fill(row,name==='casualtyModelIds'?'modelId':name,descriptor.items,item);
      }return;
    }
    if(descriptor.type==='boolean'){await scope.getByRole('button',{name:value?'是':'否',exact:true}).click();return;}
    await scope.getByLabel(title,{exact:true}).fill(String(name.endsWith('MilliInches')?value/1000:value));
  }
  for(const name of description.required){
    const value=parameters[name];assert.notEqual(value,undefined,'NATIVE_UI_REQUIRED_INTENT_MISSING:'+name);
    let descriptor=description.fields[name];
    if(name==='paymentCardInstanceIds'&&description.paymentsByChoice)descriptor={enum:description.paymentsByChoice[parameters.choice??'default']||[]};
    await fill(form,name,descriptor,value);
  }
  return{requiredFields:description.required,modelCount:modelIds.length};
}
