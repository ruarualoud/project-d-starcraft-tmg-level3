import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useLocalSearchParams, useRouter} from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {useData} from '@/lib/data-context';
import {useLevel3ClientDomain} from '@/lib/level3/client-domain-provider';
import {useI18n} from '@/lib/i18n';
import {ScreenContainer} from '@/components/screen-container';

const prefix='/starcraft-tmg-level3/product/v1';
type Lineup = {id:string;setupId:string;side:string;ready:boolean;submitted:boolean;otherSubmitted:boolean;label:string|null;invite?:string};
type Preset = {id:string;label:string};
type Setup = {id:string;minerals:number;scale:string;mission:string;officialDatasetHash:string;presets:Preset[]};
async function api(route:string,body?:unknown){
  const r=await fetch((process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || '')+prefix+route,{
    credentials:'include',method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},
    body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json();if(!r.ok||!data.ok)throw Error(data.reason||data.error||String(r.status));return data;
}
export default function PrepareMatch(){
  const {lineup:routeId}=useLocalSearchParams<{lineup?:string}>();
  const [invitedId,setInvitedId]=useState('');
  useEffect(()=>{
    if(typeof window==='undefined') return;
    const invite=new URLSearchParams(window.location.hash.slice(1)).get('rosterJoin');
    if(invite)setInvitedId(invite.split('.')[0]);
  },[]);
  const id=routeId || invitedId;
  const {armyLists,catalogueSource}=useData(), {ingestRoomUrl}=useLevel3ClientDomain(), router=useRouter();
  const zh=useI18n().lang!=='en';
  const [state,setState]=useState<Lineup>(),[setup,setSetup]=useState<Setup>();
  const [choice,setChoice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const base='/lineups/'+encodeURIComponent(id || '');
  useEffect(()=>{
    if(!id)return;let active=true;
    async function load(){
      const invite=typeof window!=='undefined'?new URLSearchParams(window.location.hash.slice(1)).get('rosterJoin'):null;
      const a=invite?await api(base+'/join',{invite:invite.split('.')[1]}):await api(base);
      if(invite && typeof window!=='undefined')window.history.replaceState(window.history.state,'',window.location.pathname+'?lineup='+encodeURIComponent(id));
      const c=await api('/catalogue');
      const s=c.setups.find((v:Setup)=>v.id===a.lineup.setupId)??{id:'legacy-standard',minerals:2000,scale:'Standard',mission:'Hold Position',
        officialDatasetHash:catalogueSource.officialDatasetHash,presets:c.presets.map((p:{id:string;name:string})=>({id:p.id,label:p.name}))};
      if(active){if(typeof window!=='undefined')window.sessionStorage?.setItem('sc-last-lineup',id);setSetup(s);setState(a.lineup);}
    }
    load().catch(e=>{if(active)setError(e.message);});return ()=>{active=false;};
  },[id,catalogueSource.officialDatasetHash]);
  async function perform(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}
  const own=armyLists.filter(a=>a.mineralsLimit===setup?.minerals && (a.officialDatasetHash??catalogueSource.officialDatasetHash)===setup?.officialDatasetHash);
  const share=state?.invite && typeof window!=='undefined'?window.location.origin+'/prepare#rosterJoin='+encodeURIComponent(id+'.'+state.invite):'';
  function button(label:string,action:()=>void,testID:string,disabled=false,selected=false){
    return <Pressable accessibilityRole="button" accessibilityState={{disabled,selected}} key={testID} testID={testID} onPress={action} disabled={disabled||busy}
      style={[s.button,selected&&s.selected,(disabled||busy)&&s.disabled]}><Text style={s.label}>{label}</Text></Pressable>;
  }
  return <ScreenContainer containerClassName="bg-background"><ScrollView contentContainerStyle={s.panel}>
    <Text style={s.heading}>{zh?'赛前提交军表':'Submit your roster'}</Text>
    {state&&setup&&<>
      <Text style={s.text}>{setup.scale} · {setup.minerals} · {setup.mission} · {state.side==='player1'?(zh?'玩家一':'Player 1'):(zh?'玩家二':'Player 2')}</Text>
      {share&&<><Text style={s.text}>{zh?'让另一位玩家打开此链接，提交自己的军表。':'Invite the other player to submit their roster.'}</Text>
        <Text selectable testID="lineup-invite-link" style={s.link}>{share}</Text>
        {button(zh?'复制邀请':'Copy invitation',()=>void perform(()=>Clipboard.setStringAsync(share)),'lineup-copy')}</>}
      <Text style={s.text} testID="lineup-status">{zh?'我的军表':'My roster'} · {state.submitted?state.label:(zh?'待提交':'Pending')}　{zh?'对方':'Opponent'} · {state.otherSubmitted?(zh?'已提交':'Submitted'):(zh?'待提交':'Pending')}</Text>
      {!state.ready&&<>
        {button(zh?'编写／导入我的军表':'Build / import my roster',()=>router.push({pathname:'/army',params:{lineupId:id,...(setup.id==='legacy-standard'?{}:{matchSetupId:setup.id})}}),'lineup-edit')}
        <Text style={s.text}>{zh?'我保存的同版军表':'My saved rosters for this setup'}</Text>
        {own.length===0&&<Text style={s.text}>{zh?'此设备还没有符合本场版本和分数的军表。':'No saved roster matches this release and points limit on this device.'}</Text>}
        {own.map(a=>button(a.name,()=>setChoice(a.id),'lineup-army-'+a.id,false,choice===a.id))}
        <Text style={s.text}>{zh?'也可以使用预设':'Or choose a preset'}</Text>
        {setup.presets.map(p=>button(p.label,()=>setChoice(p.id),'lineup-preset-'+p.id,false,choice===p.id))}
        {button(zh?'提交我的军表':'Submit my roster',()=>void perform(async()=>{
          const army=own.find(a=>a.id===choice);setState((await api(base+'/submit',army?{army}:{preset:choice})).lineup);
        }),'lineup-submit',!choice)}
      </>}
      {button(zh?'查看双方状态':'Refresh seats',()=>void perform(async()=>setState((await api(base)).lineup)),'lineup-refresh')}
      {state.ready&&button(zh?'以我的席位进入对战':'Enter as my seat',()=>void perform(async()=>{
        const {joinUrl}=await api(base+'/enter',{});const result=await ingestRoomUrl(joinUrl);
        if(!result.ok)throw Error(result.rejection?.code||'ROOM_JOIN_FAILED');router.dismissTo('/match');
      }),'lineup-enter')}
    </>}
    {!!error&&<Text selectable accessibilityRole="alert" style={s.err}>{error}</Text>}
  </ScrollView></ScreenContainer>;
}
const s=StyleSheet.create({panel:{padding:22,gap:12,maxWidth:800,width:'100%',alignSelf:'center'},heading:{fontSize:23,fontWeight:'700',color:'#def3fb'},label:{color:'#dcf3fc'},text:{color:'#a8c3d5'},link:{color:'#6dd7ed'},err:{color:'#ffb5a0'},button:{borderColor:'#335a70',borderWidth:1,padding:12,borderRadius:6,backgroundColor:'#0e2332'},selected:{borderColor:'#62d8ec',backgroundColor:'#123a4b'},disabled:{opacity:0.45}});
