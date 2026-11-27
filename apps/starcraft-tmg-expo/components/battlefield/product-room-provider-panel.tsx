import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useLevel3ClientDomain} from '@/lib/level3/client-domain-provider';
import {useI18n} from '@/lib/i18n';

export function ProductRoomProviderPanel() {
  const {productRoomKey}=useLevel3ClientDomain();
  const {lang}=useI18n();const zh=lang==='zh';
  const [status,setStatus]=useState<any>(null),[key,setKey]=useState('');
  const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let mounted=true;void productRoomKey.read().then(r=>{
    if(mounted&&r.ok){setStatus(r.provider);setEditing(!r.provider.configured);}
    else if(mounted)setError(zh?'无法读取本席 AI 设置，请重新连接房间。':'Reconnect to read your AI settings.');
  }).catch(()=>{if(mounted)setError(zh?'连接失败，请稍后重试。':'Connection failed. Try again.');});
  return()=>{mounted=false;};},[productRoomKey,zh]);
  async function operate(remove=false) {
    if(busy)return;setBusy(true);setError('');
    const entered=key;setKey('');
    try {
      const r=remove?await productRoomKey.revoke():await productRoomKey.replace(entered);
      if(!r.ok)throw Error('rejected');
      setStatus(r.provider);setEditing(!r.provider.configured);
    }catch{setError(zh?'保存失败，请确认 Key 和房间连接后重试。':'Could not save. Check your key and room connection.');}
    finally{setBusy(false);}
  }
  const button=(label:string,action:()=>void,disabled=false)=><Pressable accessibilityRole="button"
    disabled={disabled||busy} accessibilityState={{disabled:disabled||busy}} onPress={action}
    style={[styles.button,(disabled||busy)&&{opacity:.45}]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
  return <View style={styles.panel} testID="product-room-provider-panel">
    <View style={styles.row}><Text style={styles.title}>{zh?'本房 AI · DeepSeek':'Room AI · DeepSeek'}</Text>
      <Text style={styles.detail}>{status?.configured?(zh?'已设置你的 Key':'Your key is set'):(zh?'等待你的 Key':'Your key is needed')}</Text>
      {status?.configured&&button(zh?'更换':'Change',()=>setEditing(!editing))}
      {status?.configured&&button(zh?'移除':'Remove',()=>void operate(true))}</View>
    {(editing||!status?.configured)&&<><Text style={styles.detail}>{status?.usedFor?.includes('opponent')
      ?(zh?'你的副官和机器对手使用这份 Key。':'Your adjutant and AI opponent use this key.')
      :(zh?'仅供你自己的副官使用，对方使用自己的 Key。':'Only your adjutant uses this key. Your opponent uses their own.')}
      {zh?' 仅在本次服务运行期间保留；关闭服务后需重新输入。':' Kept for this server session only.'}</Text>
      <View style={styles.row}><TextInput secureTextEntry autoCapitalize="none" autoCorrect={false}
        value={key} onChangeText={setKey} editable={!busy} placeholder={zh?'输入你的 DeepSeek API Key':'Enter your DeepSeek API key'}
        accessibilityLabel={zh?'DeepSeek API Key':'DeepSeek API key'} placeholderTextColor="#71899d" style={styles.input}/>
        {button(busy?(zh?'正在保存…':'Saving…'):(zh?'启用本房 AI':'Enable room AI'),()=>void operate(),!key.trim())}</View></>}
    {busy&&<Text style={styles.detail}>{zh?'已开始的请求结束后会应用更改。':'Changes apply after any current request finishes.'}</Text>}
    {!!error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const styles=StyleSheet.create({panel:{margin:12,padding:14,backgroundColor:'#091c2b',borderColor:'#23546a',borderWidth:1,borderRadius:10,gap:10},
  row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10},title:{color:'#89deef',fontWeight:'700',fontSize:15},detail:{color:'#b2c5d3',fontSize:12,flexShrink:1},
  input:{flexGrow:1,minWidth:180,color:'#e1f3fc',backgroundColor:'#06131f',borderColor:'#2b5269',borderWidth:1,borderRadius:6,padding:10},
  button:{paddingHorizontal:14,paddingVertical:10,borderRadius:6,backgroundColor:'#154b62'},buttonText:{color:'#d8f4ff',fontSize:13},error:{color:'#fca5a5',fontSize:12}});
