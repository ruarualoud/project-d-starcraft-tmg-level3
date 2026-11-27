import {useEffect, useMemo, useState} from 'react';
import type {ArmyList, TacticalCard} from './types';

export function rosterValidationMessage(reason:string, cards:TacticalCard[], lang:'zh'|'en'):string {
  const required=reason.match(/^FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID:tactical_cards:([^:]+):([^:]+):(\d+)$/);
  if(required) {
    const faction=cards.find(c=>c.id===required[1])?.name || required[1];
    const group=required[2]==='Creep' ? (lang==='zh'?'菌毯（Creep）': 'Creep') : required[2];
    return lang==='zh'
      ? `${faction} 必须选择恰好 1 张${group}战术卡，当前已选 ${required[3]} 张。请到「指挥 → 战术卡」补选或移除多余的卡。`
      : `${faction} requires exactly 1 ${group} tactical card; ${required[3]} selected. Update your selection in Command → Tactical cards.`;
  }
  if(reason==='ROSTER_VALIDATION_UNAVAILABLE') return lang==='zh'
    ? '暂时无法连接军表校验服务，请稍后重试。草稿仍可保存。'
    : 'Roster validation is unavailable. Try again shortly; you can still save your draft.';
  if(reason==='LINEUP_RELEASE_CHANGED'||reason==='PRODUCT_ROSTER_SELECTION_SOURCE_MISMATCH') return lang==='zh'
    ? '这份军表与准备房间的版本不一致，请从本房间重新打开军表编辑。'
    : 'This roster uses a different release. Reopen the builder from this lobby.';
  if(reason.startsWith('BATTLEFIELD_')||reason.startsWith('CHARACTERISTIC_')||reason.startsWith('PRODUCT_ROOM_')) return lang==='zh'
    ? '开局服务暂时无法准备战桌。请保留现有军表，稍后刷新双方状态重试。'
    : 'The match service could not prepare the battlefield. Keep your rosters and refresh the seats to retry.';
  if(!/^[A-Z][A-Z_]+(?::|$)/.test(reason)) return reason;
  return lang==='zh' ? `军表未通过本场规则校验，请检查指挥卡、单位名额及升级。详情：${reason}`
    : `Roster validation failed. Check command cards, slots and upgrades. Details: ${reason}`;
}

// A debounced read-only audit. The key prevents an older response enabling submission of a newer draft.
export function useRosterValidation(lineupId:string|undefined, army?:ArmyList|null, preset?:string) {
  const payload=useMemo(()=>army?JSON.stringify({army}):preset?JSON.stringify({preset}):'', [army,preset]);
  const key=lineupId&&payload ? lineupId+'\n'+payload : '';
  const [result,setResult]=useState({key:'',reason:''});
  useEffect(()=>{
    if(!lineupId||!payload)return;
    const controller=new AbortController();let active=true;
    const timer=setTimeout(async()=>{
      try {
        const response=await fetch((process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN||'')
          +'/starcraft-tmg-level3/product/v1/lineups/'+encodeURIComponent(lineupId)+'/validate',{
          method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:payload,signal:controller.signal});
        const value=await response.json();
        const reason=response.ok&&value.ok?'':String(value.reason||value.error||'ROSTER_VALIDATION_UNAVAILABLE');
        if(active)setResult({key,reason});
      } catch {if(active)setResult({key,reason:'ROSTER_VALIDATION_UNAVAILABLE'});}
    },300);
    return ()=>{active=false;clearTimeout(timer);controller.abort();};
  },[lineupId,payload,key]);
  return {checking:Boolean(key&&result.key!==key),reason:result.key===key?result.reason:'',
    valid:Boolean(key&&result.key===key&&!result.reason)};
}
