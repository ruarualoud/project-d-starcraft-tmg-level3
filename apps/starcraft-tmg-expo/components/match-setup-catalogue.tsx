import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, Text} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {ScreenContainer} from '@/components/screen-container';
import {useI18n} from '@/lib/i18n';
import {createRosterPlanningClient} from '@/lib/roster-planning/roster-planning-client-v1';
import {normalizeDataPackage} from '@/lib/weapon-profile';

type Client = ReturnType<typeof createRosterPlanningClient>;
export type SetupCatalogue = Awaited<ReturnType<Client['matchSetup']>>;
type Content = (data: SetupCatalogue | undefined, client: Client) => React.ReactNode;

export function MatchSetupCatalogue({children}: {children: Content}) {
  const {matchSetupId} = useLocalSearchParams<{matchSetupId?: string}>();
  return <SelectedCatalogue key={matchSetupId || 'legacy'} setupId={matchSetupId}>{children}</SelectedCatalogue>;
}

function SelectedCatalogue({setupId,children}: {setupId?: string; children: Content}) {
  const {lang} = useI18n();
  const client = useMemo(() => createRosterPlanningClient(setupId), [setupId]);
  const [data,setData] = useState<SetupCatalogue>();
  const [failure,setFailure] = useState('');
  const [attempt,retry] = useState(0);
  useEffect(() => {
    if (!setupId) return;
    let active = true;
    client.matchSetup().then(result => {
      if (result.setup.id !== setupId) throw Error('PRODUCT_SETUP_PLAN_BINDING_MISMATCH');
      if (active) setData({...result,catalogue:{...result.catalogue,...normalizeDataPackage(result.catalogue)}});
    }).catch(error => {if (active) setFailure(String(error.message || error));});
    return () => {active = false;};
  }, [client,setupId,attempt]);
  if (setupId && !data) return <ScreenContainer containerClassName="bg-background">
    <Text style={{color:'#b4d4e3',padding:16}}>{failure || (lang==='zh'?'正在读取所选对局的数据…':'Loading match data…')}</Text>
    {failure ? <Pressable accessibilityRole="button" onPress={()=>{setFailure('');retry(n=>n+1);}}>
      <Text style={{color:'#64cfe2',padding:16}}>{lang==='zh'?'重试':'Retry'}</Text></Pressable> : null}
  </ScreenContainer>;
  return <>{children(data,client)}</>;
}
