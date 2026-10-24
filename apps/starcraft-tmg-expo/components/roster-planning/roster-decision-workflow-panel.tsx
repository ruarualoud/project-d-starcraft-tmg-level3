// P6: real new-Run projection. No local fake progress, model text or Plan.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { rosterPlanningClient } from '@/lib/roster-planning/roster-planning-client-v1';

const statusZh: Record<string, string> = {
  draft: '未启动', running: '执行中', interrupted: '执行中断，可从断点继续', paused: '已安全暂停', blocked: '需处理停点', ready_for_release: '发布审核通过',
};
const sectionZh: Record<string, string> = {
  publicSummaryText: '总体获胜思路', scoreRoute: '计分路线', deploymentConcept: '部署、进场与地图计划',
  componentPurposes: '单位／卡牌用途', lossResourceBudget: '预算与可接受损失', opponentHypotheses: '对手假设',
  counterResponses: '预设反制', invalidationTriggers: '何时重新规划',
};
export function RosterDecisionWorkflowPanel({ initialWorkflow, lang, onError, onChanged }: any) {
  const [workflow, setWorkflow] = useState(initialWorkflow);
  const [tab, setTab] = useState<'plan' | 'roster' | 'trace'>('plan');
  const [trace, setTrace] = useState<any[]>([]);
  const [openedTrace, setOpenedTrace] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState('publicSummaryText');
  const zh = lang !== 'en', id = workflow.workflowId;
  useEffect(() => {
    let alive = true, reading = false;
    const poll = async () => {
      if (reading) return; reading = true;
      try {
        const result = await rosterPlanningClient.readWorkflow(id);
        if (alive) setWorkflow(result.workflow);
      } catch (error) { if (alive) onError(error); }
      finally { reading = false; }
    };
    const timer = setInterval(poll, 2000);
    return () => { alive = false; clearInterval(timer); };
  }, [id, onError]);
  async function act(operation: 'run' | 'pause') {
    setBusy(true);
    try {
      const result = await (operation === 'run' ? rosterPlanningClient.runWorkflow(id) : rosterPlanningClient.pauseWorkflow(id));
      setWorkflow(result.workflow); onChanged?.();
    } catch (error) { onError(error); }
    finally { setBusy(false); }
  }
  async function showTrace() {
    setTab('trace');
    try { setTrace((await rosterPlanningClient.workflowTrace(id)).trace); }
    catch (error) { onError(error); }
  }
  const plan = workflow.draft?.plan;
  const active = (workflow.work || []).filter((work: any) => !['evidence_ready', 'superseded', 'returned_to_owner'].includes(work.status));
  return <View style={s.shell} testID="decision-workflow-panel">
    <View style={s.toolbar}>
      <View style={{ flex: 1, minWidth: 180 }}>
        <Text style={s.title}>{zh ? '军表与战略计划 · 新流程' : 'Roster & strategy · scoped workflow'}</Text>
        <Text style={s.muted}>{zh ? (statusZh[workflow.status] || workflow.status) : workflow.status}
          {` · ${zh ? '草稿' : 'draft'} r${workflow.draftRevision ?? 0} · ${workflow.mode === 'fixed' ? (zh ? '军表锁定' : 'fixed roster') : (zh ? '允许改表' : 'editable roster')}`}</Text>
      </View>
      <Pressable testID="decision-workflow-run" disabled={busy || workflow.running || workflow.readyForRelease}
        onPress={() => void act('run')} style={[s.button, (busy || workflow.running || workflow.readyForRelease) && s.disabled]}>
        <Text style={s.buttonText}>{zh ? '启动／继续' : 'Start / resume'}</Text>
      </Pressable>
      <Pressable testID="decision-workflow-pause" disabled={busy || !workflow.running || workflow.pauseRequested}
        onPress={() => void act('pause')} style={[s.button, (!workflow.running || busy || workflow.pauseRequested) && s.disabled]}>
        <Text style={s.buttonText}>{workflow.pauseRequested ? (zh ? '等待当前操作结束' : 'Waiting for boundary') : (zh ? '安全暂停' : 'Pause safely')}</Text>
      </Pressable>
    </View>
    {workflow.interrupted && <Text style={s.warning}>{zh ? '此前执行已中断；继续会读取保存断点，不会重建军表。未知派发仍需原生恢复判断。' : 'Interrupted run. Resume uses saved checkpoints; uncertain dispatch is not silently replayed.'}</Text>}
    {workflow.failure && <Text selectable style={s.warning}>{workflow.failure.code}</Text>}
    <View style={s.tabs}>
      {(['plan', 'roster', 'trace'] as const).map(key => <Pressable key={key} testID={`decision-tab-${key}`}
        onPress={() => key === 'trace' ? void showTrace() : setTab(key)} style={[s.tab, key === tab && s.selected]}>
        <Text style={s.buttonText}>{zh ? ({ plan: '战略计划', roster: '当前军表', trace: '执行与 Prompt' })[key] : key}</Text>
      </Pressable>)}
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 12 }}>
      {tab === 'plan' && <>
        <Text style={s.muted}>{zh ? '合法军表不等于最终策略通过。以下只展示当前实际版本，必要事实与来源审核仍由服务端控制。' : 'Rules legality is not strategy acceptance. This is the actual draft; source and release gates remain on the server.'}</Text>
        {!plan ? <Text style={s.body}>{zh ? '还没有模型生成的 Plan。启动后从初步目标、选表和查证开始。' : 'No generated Plan yet. Start to form intent, roster and evidence.'}</Text> : <>
          <View style={s.tabs}>{Object.keys(sectionZh).map(key => <Pressable key={key} onPress={() => setSection(key)}
            style={[s.tab, key === section && s.selected]}><Text style={s.small}>{zh ? sectionZh[key] : key}</Text></Pressable>)}</View>
          <Text selectable style={s.body} testID="decision-plan-section">{typeof plan[section] === 'string' ? plan[section] : JSON.stringify(plan[section] ?? null, null, 2)}</Text>
        </>}
      </>}
      {tab === 'roster' && <>
        <Text style={s.title}>{workflow.setup.mineralBudget} {zh ? '矿目标' : 'mineral target'}</Text>
        {(workflow.draft?.candidateInput?.units || []).map((unit: any) => <View key={unit.unitInstanceId} style={s.card}>
          <Text style={s.body}>{unit.unitInstanceId} · {unit.recordKey}</Text>
          <Text style={s.muted}>{unit.compositionKind} · {(unit.upgrades || []).map((upgrade: any) => upgrade.upgradeName).join(' / ') || (zh ? '无升级' : 'no upgrades')}</Text>
        </View>)}
        <Text selectable style={s.muted}>{(workflow.draft?.candidateInput?.tacticalCardRecordKeys || []).join(' / ') || (zh ? '尚未选择战术卡' : 'No tactical cards selected')}</Text>
      </>}
      {tab === 'trace' && <>
        <Text style={s.muted}>{zh ? '点击单条查看完整脱敏 Prompt 或公开回复；不展示隐藏思维链。原生证据与模型意见保持分离。' : 'Open an exact sanitized prompt or public reply. Hidden chain of thought is not requested. Model claims are separate from Native evidence.'}</Text>
        {openedTrace && <View style={s.card}>
          <Pressable onPress={() => setOpenedTrace(null)}><Text style={s.buttonText}>{zh ? '收起原文' : 'Close original'}</Text></Pressable>
          <Text selectable style={s.original} testID="decision-workflow-trace-original">{JSON.stringify(openedTrace, null, 2)}</Text>
        </View>}
        {trace.filter(row => row.traceId || row.kind === 'tool' || row.kind === 'job_boundary').map((row, index) => <Pressable key={row.traceId || `${row.at}-${index}`}
          disabled={!row.traceId} onPress={async () => {
            try { setOpenedTrace((await rosterPlanningClient.readWorkflowTrace(id, row.traceId)).trace); }
            catch (error) { onError(error); }
          }} style={s.card}>
          <Text style={s.body}>{index + 1}. {row.kind} · {row.role || row.operation || row.status || ''}</Text>
          <Text style={s.muted}>{row.at}{row.usage?.totalUnits ? ` · ${row.usage.totalUnits} Tokens` : ''}</Text>
        </Pressable>)}
        <Text style={s.title}>{zh ? '实际来源与工具原件' : 'Actual sources & tool artifacts'}</Text>
        {(workflow.evidenceDirectory || []).map((source: any) => <Pressable key={source.number} style={s.card}
          onPress={async () => {
            try { setOpenedTrace((await rosterPlanningClient.readWorkflowEvidence(id, source.number)).evidence); }
            catch (error) { onError(error); }
          }}><Text style={s.small}>{source.number}. {source.title} · {source.kind}</Text></Pressable>)}
      </>}
      <Text style={s.muted}>{zh ? `待处理工作 ${active.length} · 实际证据 ${workflow.evidenceCount}` : `${active.length} pending · ${workflow.evidenceCount} evidence records`}</Text>
      {active.slice(0, 8).map((work: any) => <Text key={work.id} style={s.small}>{work.role} · {work.status}</Text>)}
      <Text style={s.muted}>{workflow.readyForRelease ? (zh ? '当前版本发布审核通过，等待最终验收；尚未启动对战房间。' : 'Current version passed release review and awaits acceptance; no room started.') : (zh ? '尚未正式准出，不会自动启动对战。' : 'Not admitted; battle will not start automatically.')}</Text>
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({
  shell: { flex: 1, minHeight: 360, backgroundColor: '#07121e', borderWidth: 1, borderColor: '#21485b', borderRadius: 10, overflow: 'hidden' },
  toolbar: { padding: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, backgroundColor: '#0b1e2d' },
  title: { color: '#d7eff9', fontSize: 16, fontWeight: '700' }, body: { color: '#c7dce7', fontSize: 13, lineHeight: 21 },
  muted: { color: '#8faebb', fontSize: 12, lineHeight: 19 }, small: { color: '#b7d1dd', fontSize: 11, lineHeight: 17 },
  warning: { color: '#f6c87e', fontSize: 12, lineHeight: 19, padding: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 8 },
  tab: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#254453', borderRadius: 5 },
  selected: { backgroundColor: '#12384b', borderColor: '#3889a7' },
  button: { padding: 10, borderWidth: 1, borderColor: '#397c96', borderRadius: 6, backgroundColor: '#113347' },
  buttonText: { color: '#b9e7f8', fontSize: 12, fontWeight: '600' }, disabled: { opacity: 0.4 },
  card: { borderWidth: 1, borderColor: '#213e50', borderRadius: 7, padding: 11, gap: 5, backgroundColor: '#0b1b29' },
  original: { color: '#b6d6e5', fontFamily: 'monospace', fontSize: 11, lineHeight: 17 },
});
