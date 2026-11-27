import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useData } from '@/lib/data-context';
import { useLevel3ClientDomain } from '@/lib/level3/client-domain-provider';
import { useI18n } from '@/lib/i18n';
import type { ArmyList } from '@/lib/types';

type MatchSetup = { id: string; scale: string; minerals: number; seedId: string; mission: string; deployment: string; officialDatasetHash:string; presets: { id: string; label: string }[] };
const prefix = '/starcraft-tmg-level3/product/v1';
async function product(path: string, body?: unknown) {
  const response = await fetch((process.env.EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN || '') + prefix + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok || !value.ok) throw Error(value.reason || value.error || '服务暂不可用');
  return value;
}
export function ProductMatchLobby({ onEntered }: { onEntered?: () => void }) {
  const { armyLists, saveArmy, catalogueSource } = useData();
  const { ingestRoomUrl } = useLevel3ClientDomain();
  const { lang } = useI18n(), zh = lang !== 'en';
  const router = useRouter();
  const [mode, setMode] = useState<'user_vs_agent' | 'human_vs_human'>('human_vs_human');
  const [setupId, setSetupId] = useState('legacy-standard');
  const [own, setOwn] = useState('');
  const [opponent, setOpponent] = useState('');
  const [catalogue, setCatalogue] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    Promise.all([product('/catalogue'), product('/rooms')]).then(([c, r]) => {
      if (alive) { setCatalogue(c); setRooms(r.rooms); if(c.setups.some((s:MatchSetup)=>s.id==='wave3-standard-v1'))setSetupId('wave3-standard-v1'); }
    }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);
  async function enter(match: any) {
    const result = await ingestRoomUrl(match.joinUrl);
    if (!result.ok) throw Error(result.rejection?.code || '房间连接失败');
    onEntered?.();
  }
  async function run(operation: () => Promise<void>) {
    setBusy(true); setError('');
    try { await operation(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }
  const setups: MatchSetup[] = catalogue?.setups || [];
  const setup = mode === 'human_vs_human' ? setups.find(item => item.id === setupId) : undefined;
  const expectedHash = setup?.officialDatasetHash ?? catalogueSource.officialDatasetHash;
  const availableArmies = armyLists.filter(a => a.mineralsLimit === (setup?.minerals ?? 2000)
    && (a.officialDatasetHash ?? catalogueSource.officialDatasetHash) === expectedHash);
  const selected = availableArmies.find(a => a.id === own);
  const opponentArmy = availableArmies.find(a => a.id === opponent);
  const ownPreset = setup?.presets.find(p => p.id === own);
  const opponentPreset = setup?.presets.find(p => p.id === opponent);
  const ready = Boolean(catalogue && (selected || ownPreset) && (!setup || opponentArmy || opponentPreset));
  function selectSetup(value?: MatchSetup) {
    setSetupId(value?.id ?? 'legacy-standard');
    setOwn(value?.presets[0]?.id ?? '');
    setOpponent(value?.presets[1]?.id ?? '');
  }
  return <View style={s.shell} testID="product-match-lobby">
    <Text style={s.eyebrow}>STARCRAFT TMG // COMMAND CENTER</Text>
    <Text style={s.title}>{zh ? '准备你的下一场对战' : 'Prepare your next match'}</Text>
    <Text style={s.body}>{zh ? '选择对战配置。人人对战由两位玩家分别提交自己的军表。' : 'Choose a setup. In a two-player match, each player submits their own roster.'}</Text>
    <View style={s.row}>{([
      ['user_vs_agent', zh ? '人机对战' : 'Human vs AI'],
      ['human_vs_human', zh ? '人人对战' : 'Two players'],
    ] as const).map(([value, label]) => <Pressable key={value} testID={'product-mode-' + value}
      onPress={() => { if (value !== mode) { setMode(value); selectSetup(value==='human_vs_human'?setups.find(item=>item.id==='wave3-standard-v1'):undefined); } }} style={[s.choice, mode === value && s.selected]}>
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>)}</View>
    {mode === 'human_vs_human' && <><Text style={s.label}>{zh ? '对战配置' : 'Match setup'}</Text>
      <View style={s.row}>
        <Pressable onPress={() => selectSetup()} style={[s.choice, !setup && s.selected]} testID="product-setup-legacy-standard">
          <Text style={s.buttonText}>Standard 2000 · Hold Position · Gauntlet</Text>
        </Pressable>
        {setups.map(item => <Pressable key={item.id} testID={'product-setup-'+item.id}
          onPress={() => selectSetup(item)} style={[s.choice, setup?.id===item.id && s.selected]}>
          <Text style={s.buttonText}>{item.scale} {item.minerals} · {item.mission}</Text>
          <Text style={s.small}>{item.deployment} · {item.seedId}</Text>
        </Pressable>)}
      </View></>}
    {mode==='human_vs_human' ? <View style={s.row}>
      <Pressable accessibilityRole="button" testID="product-create-lineup" disabled={busy||!catalogue}
        style={s.start} onPress={()=>void run(async()=>{
          const r=await product('/lineups',{setupId});router.push({pathname:'/prepare',params:{lineup:r.lineup.id}});
        })}><Text style={s.buttonText}>{zh?'创建准备房间，邀请对手':'Create lobby and invite opponent'}</Text></Pressable>
      {typeof window!=='undefined'&&window.sessionStorage?.getItem('sc-last-lineup')&&<Pressable style={s.button}
        onPress={()=>router.push({pathname:'/prepare',params:{lineup:window.sessionStorage.getItem('sc-last-lineup')!}})}>
        <Text style={s.buttonText}>{zh?'返回我的准备房间':'Resume my roster lobby'}</Text></Pressable>}
    </View> : <>
    <Text style={s.label}>{zh ? '我的军表' : 'My roster'}</Text>
    <View style={s.row}>{setup?.presets.map(p => <Pressable key={p.id} onPress={() => setOwn(p.id)}
      style={[s.choice, own === p.id && s.selected]} testID={'product-preset-'+p.id}><Text style={s.buttonText}>{p.label}</Text></Pressable>)}
      {availableArmies.map(army => <Pressable key={army.id}
      testID={'product-roster-' + army.id} onPress={() => setOwn(army.id)}
      style={[s.choice, own === army.id && s.selected]}>
      <Text style={s.buttonText}>{army.name}</Text>
      <Text style={s.small}>{army.mineralsLimit} · {army.roster.length} {zh ? '单位' : 'units'}</Text>
    </Pressable>)}</View>
    <View style={s.row}>{(setup ? [] : catalogue?.presets || []).map((army: ArmyList) => <Pressable
      key={army.id} disabled={busy} style={s.button} testID={'product-copy-' + army.id}
      onPress={() => void run(async () => {
        const copy = { ...army, id: army.id + '-' + Date.now(), name: army.name + (zh ? ' · 我的副本' : ' · my copy') };
        await saveArmy(copy); setOwn(copy.id);
      })}><Text style={s.buttonText}>{zh ? '复制示例：' : 'Copy example: '}{army.name}</Text></Pressable>)}
      <Pressable style={s.button} onPress={() => router.push(setup
        ? {pathname:'/army',params:{matchSetupId:setup.id}} : '/army')} testID="product-edit-roster">
        <Text style={s.buttonText}>{zh ? '进入军表编辑／AI 规划' : 'Army builder / AI planning'}</Text>
      </Pressable>
      {setup && <Pressable style={s.button} testID="product-view-database"
        onPress={() => router.push({pathname:'/',params:{matchSetupId:setup.id}})}>
        <Text style={s.buttonText}>{zh ? '查看本场卡表' : 'Browse match cards'}</Text>
      </Pressable>}
    </View>
    <Text style={s.label}>{zh ? '对手军表' : 'Opponent roster'}</Text>
    <View style={s.row}>
      {!setup && <Pressable onPress={() => setOpponent('')} style={[s.choice, !opponent && s.selected]}>
        <Text style={s.buttonText}>{zh ? '标准虫群 · 2000 分' : 'Standard Swarm · 2000'}</Text>
      </Pressable>}
      {setup?.presets.map(p => <Pressable key={p.id} onPress={() => setOpponent(p.id)}
        style={[s.choice, opponent === p.id && s.selected]} testID={'opponent-preset-'+p.id}><Text style={s.buttonText}>{p.label}</Text></Pressable>)}
      {availableArmies.map(army => <Pressable key={army.id} onPress={() => setOpponent(army.id)}
        style={[s.choice, opponent === army.id && s.selected]}>
        <Text style={s.buttonText}>{army.name}</Text>
      </Pressable>)}
    </View>
    <Text style={s.small}>{setup ? [setup.scale, setup.minerals, setup.mission, setup.deployment, setup.seedId].join(' · ') : (zh ? '当前配置：Standard 2000 分 · Hold Position · Gauntlet · ' : 'Current setup: Standard 2000 · Hold Position · Gauntlet · ') + (catalogue?.map?.name || '…')}</Text>
    <Text style={s.small}>{zh ? '地图使用已验收的真实地形规则。未花完的资源按规则作废；非法军表会给出原因。' : 'Reviewed terrain rules apply. Unspent resources are lost; illegal rosters are rejected with a reason.'}</Text>
    <Pressable testID="product-start-match" disabled={busy || !ready}
      style={[s.start, (busy || !ready) && s.disabled]}
      onPress={() => void run(async () => {
        const result = await product('/rooms', { army: selected, opponentArmy, matchMode: mode,
          ...(setup ? {setupId: setup.id, ownPreset: ownPreset?.id, opponentPreset: opponentPreset?.id} : {}) });
        await enter(result.match);
      })}><Text style={s.buttonText}>{busy ? (zh ? '正在校验并准备…' : 'Preparing…') : (zh ? '开始对战' : 'Start match')}</Text></Pressable>
    </>}
    {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    {rooms.length > 0 && <><Text style={s.label}>{zh ? '继续已有对局' : 'Continue a match'}</Text>
      {rooms.slice().reverse().map(room => <Pressable key={room.roomId} testID={'product-resume-'+room.roomId} disabled={busy} style={s.choice}
        onPress={() => void run(async () => {
          const result = await product('/rooms/' + room.roomId + '/open', {}); await enter(result.match);
        })}><Text style={s.buttonText}>{room.title}</Text><Text style={s.small}>{room.createdAt} · {room.mapName}</Text></Pressable>)}</>}
  </View>;
}
const s = StyleSheet.create({
  shell: { padding: 20, gap: 14, borderWidth: 1, borderColor: '#285568', borderRadius: 12, backgroundColor: '#071823' },
  eyebrow: { color: '#6bd4e9', fontSize: 11, letterSpacing: 2 }, title: { color: '#e1f3fa', fontSize: 24, fontWeight: '700' },
  body: { color: '#aec7d2', fontSize: 14, lineHeight: 22 }, label: { color: '#b4e6f1', fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  button: { padding: 11, borderRadius: 6, borderWidth: 1, borderColor: '#315269' },
  choice: { padding: 13, gap: 5, borderRadius: 7, borderWidth: 1, borderColor: '#254354', backgroundColor: '#0c202d' },
  selected: { borderColor: '#59bbd1', backgroundColor: '#163d4d' }, buttonText: { color: '#cceaf4', fontSize: 14, fontWeight: '600' },
  small: { color: '#8eacbb', fontSize: 12, lineHeight: 19 }, start: { backgroundColor: '#12576b', padding: 16, borderRadius: 7, alignItems: 'center' },
  disabled: { opacity: 0.45 }, error: { color: '#ffb3a7', fontSize: 13, lineHeight: 21 },
});
