// Ticket 27 / Slice 271 — roster-planning workspace panel (Web/App).
// Chinese-first bilingual UI over the isolated roster-planning workspace API.
// Renders real Strategist/Builder/laboratory evidence only: plan sections,
// candidate legality verdicts and diffs, tool receipts, provenance and
// redacted usage all come from server projections. Empty, disconnected,
// unavailable, running, failed and stale states are explicit. The manual
// army builder is untouched; this panel is an additive workspace view.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert, Linking, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { RosterDecisionWorkflowPanel } from './roster-decision-workflow-panel';
import { useMatchPlanningClient } from '@/lib/roster-planning/match-setup-context';
import { useI18n } from '@/lib/i18n';
import { RosterPlanningClientError } from '@/lib/roster-planning/roster-planning-client-v1';

type Lang = 'en' | 'zh';
function ui(lang: Lang, zh: string, en: string): string {
  return lang === 'en' ? en : zh;
}

const CYAN = '#22d3ee';
const BLUE = '#38bdf8';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const GREEN = '#22c55e';

const ROUND_LABELS: Record<string, { zh: string; en: string }> = {
  strategy_foundation: { zh: '战略基础', en: 'Strategy foundation' },
  teach_challenge: { zh: '质询小计划', en: 'Challenge the small plan' },
  teach_revision: { zh: '修订小计划', en: 'Revise the small plan' },
  candidate_proposals: { zh: '候选方案', en: 'Candidate proposals' },
  comparison_selection: { zh: '比较选定', en: 'Comparison & selection' },
  preset_plan_deepening: { zh: '深化锁定军表的计划', en: 'Deepen the locked roster plan' },
  revision: { zh: '修订', en: 'Revision' },
};

function factionShort(recordKey: string | null | undefined, catalogue: any): string {
  if (!recordKey) return '—';
  const hit = catalogue?.factions?.find((f: any) => f.recordKey === recordKey);
  return hit?.factionName || recordKey.replace('tactical_cards:', '');
}

function costText(verdict: any): string {
  if (!verdict || verdict.status !== 'legal') return '—';
  return `${verdict.mineralSpent}/${verdict.mineralBudget} 矿物 · ${verdict.vespeneSpent} 瓦斯`;
}

export function RosterPlanningWorkspacePanel() {
  const rosterPlanningClient = useMatchPlanningClient();
  const { lang } = useI18n();
  const L = lang as Lang;
  const [connection, setConnection] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [catalogue, setCatalogue] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [iterativeSessions, setIterativeSessions] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflow, setWorkflow] = useState<any>(null);
  const [decisionAvailable, setDecisionAvailable] = useState(false);
  const decisionAvailableRef = useRef(false);
  const [iterativeAvailable, setIterativeAvailable] = useState(false);
  const [roomLaunchAvailable, setRoomLaunchAvailable] = useState(false);
  const iterativeAvailableRef = useRef(false);
  const [planningBusy, setPlanningBusy] = useState(false);
  const [deliberation, setDeliberation] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [journey, setJourney] = useState<any>(null);
  const [error, setError] = useState<{ code: string; detail?: string } | null>(null);
  const [view, setView] = useState<'sessions' | 'setup' | 'session' | 'iterative' | 'workflow'>('sessions');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iterativePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const applyError = useCallback((e: unknown) => {
    if (!e) {
      setError(null);
      return;
    }
    if (e instanceof RosterPlanningClientError) {
      if (e.kind === 'disconnected') {
        setConnection('disconnected');
        setError({ code: e.code });
      } else {
        setError({ code: e.code, detail: e.message });
      }
    } else {
      setError({ code: 'ROSTER_WORKSPACE_UNKNOWN_ERROR', detail: String(e) });
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    const [list, iterative, decisions] = await Promise.all([
      rosterPlanningClient.listSessions(),
      iterativeAvailableRef.current
        ? rosterPlanningClient.listIterativeSessions() : Promise.resolve(null),
      decisionAvailableRef.current ? rosterPlanningClient.listWorkflows() : Promise.resolve(null),
    ]);
    setSessions(list.sessions || []);
    setIterativeSessions(iterative?.journeys || []);
    setWorkflows(decisions?.workflows || []);
    setPlanningBusy(list.planningBusy === true);
    setDeliberation(list.deliberation || null);
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      const [health, cat] = await Promise.all([
        rosterPlanningClient.health(),
        rosterPlanningClient.catalogue(),
      ]);
      setCatalogue(cat.catalogue);
      setDeliberation(health.descriptor?.deliberation || null);
      decisionAvailableRef.current = health.descriptor?.decisionJourney?.sameDecisionRun === true;
      setDecisionAvailable(decisionAvailableRef.current);
      iterativeAvailableRef.current =
        health.descriptor?.iterativeJourney?.draftAndTeachAvailable === true;
      setIterativeAvailable(iterativeAvailableRef.current);
      setRoomLaunchAvailable(health.descriptor?.roomLaunchAvailable === true);
      await refreshSessions();
      setConnection('connected');
      setError(null);
    } catch (e) {
      applyError(e);
    }
  }, [applyError, refreshSessions]);

  useEffect(() => {
    void loadInitial();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (iterativePollRef.current) clearInterval(iterativePollRef.current);
    };
  }, [loadInitial]);

  const openSession = useCallback(async (sessionId: string) => {
    try {
      const result = await rosterPlanningClient.readSession(sessionId);
      setSession(result.session);
      setView('session');
      setError(null);
    } catch (e) {
      applyError(e);
    }
  }, [applyError]);

  const openIterativeSession = useCallback(async (sessionId: string) => {
    try {
      const result = await rosterPlanningClient.readIterativeSession(sessionId);
      setJourney(result.journey);
      setView('iterative');
      setError(null);
    } catch (e) { applyError(e); }
  }, [applyError]);

  const openWorkflow = useCallback(async (id: string) => {
    try {
      setWorkflow((await rosterPlanningClient.readWorkflow(id)).workflow);
      setView('workflow'); setError(null);
    } catch (error) { applyError(error); }
  }, [applyError]);

  // Planning and final review are separate asynchronous jobs. A planned
  // session must keep polling while its final review shards are running.
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (session?.status === 'running'
      || session?.planReview?.status === 'running'
      || session?.presetJourney?.status === 'running') {
      pollRef.current = setInterval(async () => {
        try {
          const result = await rosterPlanningClient.readSession(session.sessionId);
          setSession(result.session);
          if (result.session.status !== 'running'
            && result.session.planReview?.status !== 'running'
            && result.session.presetJourney?.status !== 'running'
            && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            void refreshSessions();
          }
        } catch {
          // Transient read failure while a run is active: keep polling; the
          // explicit disconnected state appears on the next user action.
        }
      }, 1500);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session?.sessionId, session?.status,
    session?.planReview?.status, session?.presetJourney?.status, refreshSessions]);

  useEffect(() => {
    if (iterativePollRef.current) {
      clearInterval(iterativePollRef.current);
      iterativePollRef.current = null;
    }
    if (view === 'iterative' && journey?.sessionId
      && (journey.running || journey.stage === 'teaching')) {
      iterativePollRef.current = setInterval(async () => {
        try {
          const result = await rosterPlanningClient.readIterativeSession(
            journey.sessionId);
          setJourney(result.journey);
          if (!result.journey.running
            && result.journey.stage !== 'teaching') {
            void refreshSessions();
          }
        } catch { /* Keep the visible last state until the next user action. */ }
      }, 1500);
    }
    return () => {
      if (iterativePollRef.current) clearInterval(iterativePollRef.current);
    };
  }, [view, journey?.sessionId, journey?.running, journey?.stage,
    refreshSessions]);

  // ── Disconnected / loading states ──────────────────────────────────────
  if (connection === 'loading') {
    return (
      <View style={st.stateBox} testID="roster-workspace-loading">
        <Text style={st.stateText}>{ui(L, '正在连接规划服务…', 'Connecting to the planning service…')}</Text>
      </View>
    );
  }
  if (connection === 'disconnected') {
    return (
      <View style={st.stateBox} testID="roster-workspace-disconnected">
        <Text style={[st.stateText, { color: RED }]}>
          {ui(L, '无法连接规划服务(服务不可达)', 'Planning service unreachable (disconnected)')}
        </Text>
        <Text style={st.stateHint}>
          {ui(L,
            '军表规划需要本机产品服务器提供 /roster-planning 接口。手动建表不受影响。',
            'Roster planning needs the local product server API. The manual builder is unaffected.')}
        </Text>
        <Pressable onPress={() => { setConnection('loading'); void loadInitial(); }}
          style={({ pressed }) => [st.btn, { borderColor: CYAN }, pressed && { opacity: 0.7 }]}
          testID="roster-workspace-retry-connect">
          <Text style={[st.btnText, { color: CYAN }]}>{ui(L, '重新连接', 'Reconnect')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} testID="roster-planning-workspace">
      {/* Header */}
      <View style={st.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{ui(L, '智能军表规划', 'AI Roster Planning')}</Text>
          <Text style={st.headerSub}>
            {deliberation?.available
              ? ui(L, `实时规划:${deliberation.modelVersion || '已附加'} · 付费调用`, `Live planning: ${deliberation.modelVersion || 'attached'} · paid calls`)
              : ui(L, '实时规划不可用(未附加安全凭据)', 'Live planning unavailable (no secure credential attached)')}
            {planningBusy ? ui(L, ' · 有规划正在进行', ' · a run is active') : ''}
          </Text>
        </View>
        {view !== 'sessions' && (
          <Pressable onPress={() => { setView('sessions'); setSession(null); setJourney(null); setWorkflow(null); void refreshSessions(); }}
            style={({ pressed }) => [st.btn, pressed && { opacity: 0.7 }]} testID="roster-workspace-back">
            <Text style={st.btnText}>{ui(L, '返回列表', 'Back')}</Text>
          </Pressable>
        )}
      </View>

      {error && (
        <View style={st.errorBanner} testID="roster-workspace-error">
          <Text style={st.errorText}>{error.code}</Text>
          {!!error.detail && <Text style={st.errorDetail}>{error.detail}</Text>}
          <Pressable onPress={() => setError(null)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={[st.btnText, { color: BLUE }]}>{ui(L, '知道了', 'Dismiss')}</Text>
          </Pressable>
        </View>
      )}

      {view === 'sessions' && (
        <SessionsView L={L} catalogue={catalogue} sessions={sessions}
          iterativeSessions={iterativeSessions}
          workflows={workflows} onOpenWorkflow={openWorkflow}
          deliberation={deliberation}
          onNew={() => setView('setup')}
          onOpen={openSession}
          onOpenIterative={openIterativeSession}
          onDelete={async (id: string) => {
            try {
              await rosterPlanningClient.deleteSession(id);
              await refreshSessions();
            } catch (e) { applyError(e); }
          }}
          onImport={async (document: any) => {
            try {
              const result = await rosterPlanningClient.importSession(document);
              setSession(result.session);
              setView('session');
              setError(null);
            } catch (e) { applyError(e); }
          }} />
      )}
      {view === 'setup' && catalogue && (
        <SetupView L={L} catalogue={catalogue} deliberation={deliberation}
          iterativeAvailable={iterativeAvailable}
          decisionAvailable={decisionAvailable}
          onCreatedWorkflow={(created: any) => { setWorkflow(created); setView('workflow'); void refreshSessions(); }}
          onCancel={() => setView('sessions')}
          onCreated={(created: any) => { setSession(created); setView('session'); }}
          onCreatedIterative={(created: any) => {
            setJourney(created); setView('iterative'); void refreshSessions();
          }}
          onError={applyError} />
      )}
      {view === 'session' && session && (
        <SessionView L={L} session={session} catalogue={catalogue}
          deliberation={deliberation}
          roomLaunchAvailable={roomLaunchAvailable}
          onSession={setSession} onError={applyError}
          onRefreshSessions={refreshSessions} />
      )}
      {view === 'iterative' && journey && (
        <IterativeSessionView L={L} journey={journey}
          catalogue={catalogue} onJourney={setJourney}
          roomLaunchAvailable={roomLaunchAvailable}
          onOpenTeach={openSession}
          onError={applyError} onRefreshSessions={refreshSessions} />
      )}
      {view === 'workflow' && workflow && (
        <RosterDecisionWorkflowPanel initialWorkflow={workflow} lang={L}
          onError={applyError} onChanged={refreshSessions} />
      )}
    </View>
  );
}

// ── Sessions list ──────────────────────────────────────────────────────────
function SessionsView({ L, catalogue, sessions, iterativeSessions, workflows = [], onOpenWorkflow,
  deliberation, onNew, onOpen, onOpenIterative, onDelete, onImport }: any) {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <Pressable onPress={onNew} style={({ pressed }) => [st.primaryBtn, { marginTop: 0 }, pressed && { opacity: 0.7 }]}
        testID="roster-workspace-new-session">
        <Text style={st.primaryBtnText}>{ui(L, '+ 新建规划会话', '+ New planning session')}</Text>
      </Pressable>
      <Pressable onPress={() => setShowImport(!showImport)}
        style={({ pressed }) => [st.btn, { marginTop: 8, alignSelf: 'flex-start', borderColor: BLUE }, pressed && { opacity: 0.7 }]}
        testID="roster-workspace-show-import">
        <Text style={[st.btnText, { color: BLUE }]}>{ui(L, '导入规划(粘贴导出文本)', 'Import plan (paste export)')}</Text>
      </Pressable>
      {!deliberation?.available && (
        <View style={[st.unavailableBox, { marginTop: 10 }]} testID="roster-workspace-unavailable">
          <Text style={[st.cardName, { color: AMBER }]}>
            {ui(L, '实时规划当前不可用', 'Live planning currently unavailable')}
          </Text>
          <Text style={st.hint}>
            {ui(L,
              '未附加安全模型凭据:可以浏览目录、恢复草稿、手动校验军表与导入导出,但“生成规划/修订”需要授权的安全 Flash 通道。',
              'No secure model credential attached: catalogue, drafts, manual validation and import/export work; generate/revise need the authorized secure Flash lane.')}
          </Text>
        </View>
      )}
      {workflows.length > 0 && <View style={{ marginTop: 12 }} testID="decision-workflow-list">
        <Text style={st.sectionTitle}>{ui(L, '军表＋Plan＋Teach · 新流程', 'Roster + Plan + Teach · scoped workflow')}</Text>
        {workflows.map((entry: any) => <Pressable key={entry.workflowId} onPress={() => onOpenWorkflow(entry.workflowId)}
          style={st.sessionCard} testID={`decision-workflow-${entry.workflowId}`}>
          <Text style={st.cardName}>{factionShort(entry.setup.factionRecordKey, catalogue)} vs {factionShort(entry.setup.opponentFactionRecordKey, catalogue)}</Text>
          <Text style={st.cardSub}>{entry.status} · r{entry.draftRevision} · {entry.setup.mineralBudget}M · {entry.mode}</Text>
        </Pressable>)}
      </View>}
      {iterativeSessions.length > 0 && (
        <View style={{ marginTop: 12 }} testID="iterative-roster-session-list">
          <Text style={st.sectionTitle}>
            {ui(L, 'AI 从头写表 · 多轮 Builder 裁决',
              'AI roster from scratch · iterative Builder verdicts')}
          </Text>
          {iterativeSessions.map((entry: any) => (
            <Pressable key={entry.sessionId}
              onPress={() => onOpenIterative(entry.sessionId)}
              style={({ pressed }) => [st.sessionCard,
                pressed && { opacity: 0.7 }]}
              testID={`iterative-roster-${entry.sessionId.slice(0, 12)}`}>
              <Text style={st.cardName}>
                {factionShort(entry.factionRecordKey, catalogue)} vs{' '}
                {factionShort(entry.opponentFactionRecordKey, catalogue)}
              </Text>
              <Text style={st.cardSub}>
                {entry.stage} · {entry.mineralSpent ?? '—'}/{entry.mineralBudget}
                {' · '}r{entry.revision}
              </Text>
              <Text style={st.hashLine}>{entry.sessionId}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {sessions.length === 0 && iterativeSessions.length === 0 && workflows.length === 0 ? (
        <View style={st.emptyBox} testID="roster-workspace-empty">
          <Text style={st.emptyText}>{ui(L, '还没有规划会话', 'No planning sessions yet')}</Text>
          <Text style={st.hint}>
            {ui(L, '新建一个会话,由策略智能体在规则合法性约束下生成 2000 分军表方案。',
              'Create a session and let the strategist produce a Rules-legal 2000-point plan.')}
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          {sessions.map((entry: any) => (
          <View key={entry.sessionId} style={st.sessionCard} testID={`roster-session-${entry.sessionId.slice(0, 12)}`}>
            <Pressable onPress={() => onOpen(entry.sessionId)} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}>
              <Text style={st.cardName}>
                {factionShort(entry.factionRecordKey, catalogue)} vs {factionShort(entry.opponentFactionRecordKey, catalogue)}
                {' · '}{entry.engagementScale} {entry.mineralBudget}
              </Text>
              <Text style={st.cardSub}>
                {ui(L, '状态', 'status')}: {entry.status}
                {entry.planVersion ? ` · v${entry.planVersion}` : ''}
                {entry.planEvidenceStale ? ui(L, ' · 证据已过期', ' · evidence stale') : ''}
                {entry.providerCalls ? ui(L, ` · ${entry.providerCalls} 次付费调用`, ` · ${entry.providerCalls} paid calls`) : ''}
                {entry.failureCode ? ` · ${entry.failureCode}` : ''}
              </Text>
              <Text style={st.cardSub}>{entry.sessionId}</Text>
            </Pressable>
            <Pressable onPress={() => {
              Alert.alert(ui(L, '删除草稿', 'Delete draft'), entry.sessionId, [
                { text: ui(L, '取消', 'Cancel') },
                { text: ui(L, '删除', 'Delete'), style: 'destructive', onPress: () => onDelete(entry.sessionId) },
              ]);
            }} style={({ pressed }) => [st.deleteBtn, pressed && { opacity: 0.7 }]}>
              <Text style={{ color: RED, fontWeight: '700' }}>✕</Text>
            </Pressable>
          </View>
          ))}
        </View>
      )}
      {showImport && (
        <View style={{ marginTop: 8 }}>
          <TextInput style={st.importInput} multiline value={importText} onChangeText={setImportText}
            placeholder={ui(L, '粘贴导出的 JSON 文档(不含任何凭据)', 'Paste the exported JSON document (no credentials)')}
            placeholderTextColor="#64748b" testID="roster-workspace-import-input" />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Pressable onPress={async () => {
              const text = await Clipboard.getStringAsync();
              setImportText(text);
            }} style={({ pressed }) => [st.btn, pressed && { opacity: 0.7 }]}>
              <Text style={st.btnText}>{ui(L, '从剪贴板粘贴', 'Paste')}</Text>
            </Pressable>
            <Pressable onPress={() => {
              try {
                onImport(JSON.parse(importText));
              } catch {
                Alert.alert(ui(L, '导入失败', 'Import failed'),
                  ui(L, '导出文本不是有效的 JSON。', 'The export text is not valid JSON.'));
              }
            }} style={({ pressed }) => [st.btn, { borderColor: GREEN }, pressed && { opacity: 0.7 }]}
              testID="roster-workspace-import-submit">
              <Text style={[st.btnText, { color: GREEN }]}>{ui(L, '导入', 'Import')}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ── Setup view ─────────────────────────────────────────────────────────────
function SetupView({ L, catalogue, deliberation, iterativeAvailable, decisionAvailable,
  onCancel, onCreated, onCreatedIterative, onCreatedWorkflow, onError }: any) {
  const rosterPlanningClient = useMatchPlanningClient();
  const defaults = catalogue.defaults;
  const [own, setOwn] = useState(defaults.factionRecordKey);
  const [opponent, setOpponent] = useState(defaults.opponentFactionRecordKey);
  const [boundary, setBoundary] = useState(defaults.opponentInformationBoundary);
  const [budgetText, setBudgetText] = useState(String(defaults.mineralBudget));
  const [presetText, setPresetText] = useState('');
  const [planningEntry, setPlanningEntry] = useState<'balanced' | 'card_synergy' | 'restructure'>('balanced');
  const [busy, setBusy] = useState(false);
  const matchups = catalogue.matchupRoutes || [];
  const routeAvailable = matchups.some((m: any) => (
    m.ownFactionRecordKey === own && m.opponentFactionRecordKey === opponent));
  const opponents = useMemo(() => {
    const set = new Set<string>();
    matchups.filter((m: any) => m.ownFactionRecordKey === own)
      .forEach((m: any) => set.add(m.opponentFactionRecordKey));
    return [...set];
  }, [matchups, own]);
  const ownFactions = (catalogue.factions || []).filter((f: any) => f.skillRouteAvailable);
  const budget = parseInt(budgetText, 10);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <Text style={st.sectionTitle}>{ui(L, '对战设置', 'Match setup')}</Text>
      <Text style={st.label}>{ui(L, '我方阵营', 'Own faction')}</Text>
      <View style={st.chipRow}>
        {ownFactions.map((f: any) => (
          <Pressable key={f.recordKey} onPress={() => setOwn(f.recordKey)}
            style={[st.chip, own === f.recordKey && st.chipActive]}
            testID={`setup-own-${f.raceTag}`}>
            <Text style={[st.chipText, own === f.recordKey && st.chipTextActive]}>{f.factionName}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={st.label}>{ui(L, '对手阵营(由可用对阵 Skill 决定)', 'Opponent faction (driven by available matchup Skills)')}</Text>
      <View style={st.chipRow}>
        {opponents.map((recordKey) => (
          <Pressable key={recordKey} onPress={() => setOpponent(recordKey)}
            style={[st.chip, opponent === recordKey && st.chipActive]}
            testID={`setup-opponent-${recordKey.replace('tactical_cards:', '')}`}>
            <Text style={[st.chipText, opponent === recordKey && st.chipTextActive]}>
              {factionShort(recordKey, catalogue)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={st.label}>{ui(L, '对手信息边界', 'Opponent information boundary')}</Text>
      <View style={st.chipRow}>
        {(catalogue.opponentInformationBoundaries || []).map((value: string) => (
          <Pressable key={value} onPress={() => setBoundary(value)}
            style={[st.chip, boundary === value && st.chipActive]}
            testID={`setup-boundary-${value}`}>
            <Text style={[st.chipText, boundary === value && st.chipTextActive]}>
              {value === 'open_roster'
                ? ui(L, '公开军表', 'Open roster')
                : ui(L, '仅知对手子势力', 'Faction only · roster unknown')}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Text style={st.label}>{ui(L, '矿物预算', 'Mineral budget')}</Text>
        <TextInput style={st.budgetInput} keyboardType="numeric" value={budgetText}
          onChangeText={setBudgetText} testID="setup-budget" />
        <Text style={st.hint}>Standard · {ui(L, '交战规模冻结', 'scale frozen')}</Text>
      </View>
      {catalogue.budgetContract && (
        <View style={st.card} testID="setup-budget-contract">
          <Text style={st.cardSub}>
            {ui(L, '正式预算合同', 'Formal budget contract')}: {ui(L, '矿物利用率下限', 'mineral utilization floor')}{' '}
            {(catalogue.budgetContract.utilizationFloorBasisPoints / 100).toFixed(0)}%
            {` · ${ui(L, '贴近上限豁免', 'near-cap exemption')} <${catalogue.budgetContract.nearCapThresholdMinerals}M`}
            {` · ${ui(L, '瓦斯上限', 'vespene cap')} ${catalogue.budgetContract.vespeneFormalCap}`}
          </Text>
          <Text style={st.hint}>
            {ui(L, catalogue.budgetContract.toleranceDisplayTextZh,
              catalogue.budgetContract.toleranceDisplayTextEn)}
          </Text>
        </View>
      )}

      <Text style={st.sectionTitle}>{ui(L, '冻结任务/地图溯源', 'Frozen mission/map provenance')}</Text>
      <View style={st.card}>
        <Text style={st.cardSub}>
          {ui(L, '任务', 'Mission')}: {catalogue.mission.missionRecordKey}
          {' · '}{ui(L, '部署', 'Deployment')}: {catalogue.mission.deploymentRecordKey}
        </Text>
        <Text style={st.cardSub}>
          {ui(L, '计分权威', 'Scoring authority')}: {catalogue.mission.scoringAuthorityStatus}
          {catalogue.mission.scoringProfile?.roundCount
            ? ` · ${catalogue.mission.scoringProfile.roundCount}R` : ''}
        </Text>
        <Text style={st.hashLine}>map {catalogue.mission.mapTopologyHash?.slice(0, 16)}…</Text>
        <Text style={st.hint}>
          {ui(L, '实验室绑定冻结的 Standard-2000 源状态;任务/地图不可在此更改。',
            'The laboratory is bound to the frozen Standard-2000 source state; mission/map cannot change here.')}
        </Text>
      </View>

      {!routeAvailable && (
        <Text style={[st.errorText, { marginTop: 8 }]}>
          {ui(L, '该对阵没有可用 Skill 路线,无法创建。', 'No Skill route for this matchup; cannot create.')}
        </Text>
      )}
      <Text style={st.label}>
        {ui(L, '已有军表(可选；粘贴 Army Builder 候选 JSON)',
          'Existing roster (optional; paste Army Builder candidate JSON)')}
      </Text>
      <TextInput style={st.importInputSmall} multiline value={presetText}
        onChangeText={setPresetText}
        placeholder={ui(L, '留空则从头写表；填入默认锁表写计划，选择“替换与重构”则允许改表',
          'Leave empty to build a roster; a provided roster stays fixed unless you select Roster alternatives')}
        placeholderTextColor="#64748b" testID="setup-preset-candidate-json" />
      {decisionAvailable && <View testID="setup-planning-entry">
        <Text style={st.label}>{ui(L, '规划起点', 'Planning approach')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['balanced', 'card_synergy', 'restructure'] as const).map(key => <Pressable
            key={key} testID={`planning-entry-${key}`} onPress={() => setPlanningEntry(key)}
            accessibilityRole="radio" accessibilityState={{ checked: planningEntry === key }}
            style={[st.btn, planningEntry === key && { borderColor: '#55b9dd', backgroundColor: '#12364b' }]}>
            <Text style={st.btnText}>{ui(L, { balanced: '综合规划', card_synergy: '卡牌能力组合', restructure: '替换与重构' }[key],
              { balanced: 'Balanced', card_synergy: 'Card synergies', restructure: 'Roster alternatives' }[key])}</Text>
          </Pressable>)}
        </View>
        <Text style={st.hint}>{presetText.trim() && planningEntry !== 'restructure'
          ? ui(L, '已提供军表：保留全部单位与配装，只规划其能力配合和行动。', 'Provided roster stays fixed; plan its synergies and actions.')
          : ui(L, '从选定角度形成候选，再与原思路比较；不会强制买卡或替换单位。', 'Explore the selected approach, then compare; no forced purchases or swaps.')}</Text>
      </View>}
      {decisionAvailable && <Text style={st.hint} testID="setup-decision-workflow-route">
        {ui(L, '使用新分块流程：形成军表与初步计划 → 工具查证 → 局部 Teach → 同步修订 → 来源与发布审核。不会转回旧规划链路。',
          'Scoped workflow: roster + initial plan → tool evidence → local Teach → joint revision → release review. No fallback to the legacy planner.')}
      </Text>}
      {!presetText.trim() && !iterativeAvailable && !decisionAvailable && (
        <Text style={[st.hint, { color: AMBER }]} testID="setup-iterative-unavailable">
          {ui(L, '从头写表需要已认证的地图和安全 Flash 通道；当前服务未接通，不能以旧规划冒充完整 2000 分军表。',
            'From-scratch planning requires a certified map and secure Flash lane; the legacy planner is not an exact-2000 substitute.')}
        </Text>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <Pressable onPress={onCancel} style={({ pressed }) => [st.btn, pressed && { opacity: 0.7 }]}>
          <Text style={st.btnText}>{ui(L, '取消', 'Cancel')}</Text>
        </Pressable>
        <Pressable
          disabled={!routeAvailable || !Number.isSafeInteger(budget)
            || budget < 1 || busy || (!presetText.trim()
              && ((!iterativeAvailable && !decisionAvailable) || budget !== 2000))}
          onPress={async () => {
            setBusy(true);
            try {
              const setup = {
                factionRecordKey: own,
                opponentFactionRecordKey: opponent,
                engagementScale: 'Standard',
                mineralBudget: budget,
                opponentInformationBoundary: boundary,
              };
              let result;
              if (decisionAvailable) {
                let candidateInput;
                if (presetText.trim()) {
                  try { candidateInput = JSON.parse(presetText); }
                  catch { throw new Error(ui(L, '预制军表不是有效 JSON', 'Preset roster is not valid JSON')); }
                }
                const created = await rosterPlanningClient.createWorkflow(setup, candidateInput, planningEntry);
                onCreatedWorkflow(created.workflow);
                const started = await rosterPlanningClient.runWorkflow(created.workflow.workflowId);
                onCreatedWorkflow(started.workflow);
                return;
              }
              if (presetText.trim()) {
                let candidateInput;
                try { candidateInput = JSON.parse(presetText); }
                catch { throw new Error(ui(L, '预制军表不是有效 JSON',
                  'Preset roster is not valid JSON')); }
                result = await rosterPlanningClient.createPresetSession(setup,
                  candidateInput);
                onCreated(result.session);
                result = await rosterPlanningClient.runPresetSession(result.session.sessionId);
                onCreated(result.session);
              } else {
                const created = await rosterPlanningClient
                  .createIterativeSession(setup);
                result = await rosterPlanningClient.runIterativeSession(
                  created.journey.sessionId);
                onCreatedIterative(result.journey);
              }
            } catch (e) {
              onError(e);
            } finally {
              setBusy(false);
            }
          }}
          style={({ pressed }) => [st.primaryBtn, { flex: 1, marginTop: 0 },
            (!routeAvailable || busy || (!presetText.trim()
              && ((!iterativeAvailable && !decisionAvailable) || budget !== 2000)))
              && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
          testID="setup-create-session">
          <Text style={st.primaryBtnText}>{presetText.trim()
            ? ui(L, '锁表并创建计划', 'Lock roster and plan')
            : ui(L, 'AI 从头写表并深化计划', 'AI build roster and deepen plan')}</Text>
        </Pressable>
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// The iterative AI route is a separate evidence chain from the older
// workspace's bounded planner. Show every gate honestly; a legal roster or
// Teach plan is not yet an admitted Room plan.
function IterativeSessionView({ L, journey, catalogue, onJourney, onError,
  onOpenTeach, onRefreshSessions, roomLaunchAvailable }: any) {
  const rosterPlanningClient = useMatchPlanningClient();
  const [busy, setBusy] = useState(false);
  const [launching, setLaunching] = useState(false);
  const operate = async (operation: 'run' | 'pause') => {
    setBusy(true);
    try {
      const result = operation === 'run'
        ? await rosterPlanningClient.runIterativeSession(journey.sessionId)
        : await rosterPlanningClient.pauseIterativeSession(journey.sessionId);
      onJourney(result.journey);
      onError(null);
      void onRefreshSessions();
    } catch (error) { onError(error); }
    finally { setBusy(false); }
  };
  const resumable = !journey.running && !busy
    && journey.sourceReviewFailure
      !== 'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP'
    && journey.stoppedReason
      !== 'AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_NONCONVERGENT'
    && !['teaching', 'reviewing_source',
      'source_review_completed_clean',
      'source_review_completed_with_findings',
      'source_review_nonconvergent',
      'reconciliation_required'].includes(journey.stage);
  const launchable = Platform.OS === 'web' && roomLaunchAvailable
    && journey.stage === 'source_review_completed_clean'
    && journey.sourceReviewHighCount === 0;
  const launch = async () => {
    if (!launchable || launching) return;
    setLaunching(true);
    try {
      const result = await rosterPlanningClient.launchIterativeRoom(
        journey.sessionId);
      if (!result.match?.roomId || !result.match?.joinUrl) {
        throw new Error('ROSTER_ROOM_LAUNCH_RESPONSE_INVALID');
      }
      await Linking.openURL(result.match.joinUrl);
      onError(null);
    } catch (error) { onError(error); }
    finally { setLaunching(false); }
  };
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}
      testID="iterative-roster-session">
      <View style={st.card}>
        <Text style={st.sectionTitle}>
          {ui(L, 'AI 从头写表与计划', 'AI roster and plan from scratch')}
        </Text>
        <Text style={st.cardName}>
          {factionShort(journey.factionRecordKey, catalogue)} vs{' '}
          {factionShort(journey.opponentFactionRecordKey, catalogue)}
        </Text>
        <Text style={st.cardSub} testID="iterative-roster-progress">
          {ui(L, '阶段', 'Stage')}: {journey.stage}
          {' · '}r{journey.revision}
          {' · '}{journey.mineralSpent ?? '—'}/{journey.mineralBudget}
          {journey.exactBudget ? ui(L, ' · Builder 满额合法',
            ' · exact Builder budget') : ''}
        </Text>
        <Text style={st.hashLine}>{journey.sessionId}</Text>
        {journey.stoppedReason && (
          <Text style={[st.cardSub, { color: RED }]}>
            {journey.stoppedReason
              === 'AGENT_SELECTED_JOURNEY_SOURCE_REVIEW_NONCONVERGENT'
              ? ui(L, '三轮来源审核仍有高风险问题；已停止模型调用，不能继续自动审核或开局',
                'Three source reviews still have High findings; model calls and room entry are stopped')
              : ui(L, '已停止；未自动重发模型请求',
                'Stopped; no automatic model retry')}: {journey.stoppedReason}
          </Text>
        )}
        {journey.blockingFinding && (
          <Text style={[st.cardSub, { color: AMBER }]}>
            {journey.blockingFinding}
          </Text>
        )}
        <View style={st.chipRow}>
          {resumable && (
            <Pressable onPress={() => void operate('run')}
              style={({ pressed }) => [st.btn, { borderColor: BLUE },
                pressed && { opacity: 0.7 }]}
              testID="iterative-roster-resume">
              <Text style={[st.btnText, { color: BLUE }]}>
                {journey.stage === 'source_review_required'
                  ? ui(L, '继续审查这份计划的来源',
                    'Continue this plan’s source review')
                  : ui(L, '继续写表与规则审核',
                    'Continue roster and Rules audit')}
              </Text>
            </Pressable>
          )}
          {journey.running && (
            <Pressable onPress={() => void operate('pause')}
              style={({ pressed }) => [st.btn, pressed && { opacity: 0.7 }]}
              testID="iterative-roster-pause">
              <Text style={st.btnText}>
                {ui(L, '在当前模型回合后暂停',
                  'Pause after current model decision')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      {journey.decisions?.length > 0 && (
        <View style={st.card} testID="iterative-roster-decisions">
          <Text style={st.sectionTitle}>
            {ui(L, '模型决策与规则裁决', 'Model decisions and Rules verdicts')}
          </Text>
          {journey.decisions.map((decision: any) => (
            <Text key={decision.revision} style={st.cardSub}>
              r{decision.revision} · {decision.decisionKind}
              {decision.rulesVerdictStatus
                ? ` · Builder: ${decision.rulesVerdictStatus}` : ''}
            </Text>
          ))}
        </View>
      )}
      {journey.selectedUnits?.length > 0 && (
        <View style={st.card} testID="iterative-roster-selected-units">
          <Text style={st.sectionTitle}>
            {ui(L, '当前已选军表', 'Current selected roster')}
          </Text>
          {journey.selectedUnits.map((unit: any) => (
            <Text key={unit.unitInstanceId} style={st.cardSub}>
              {unit.unitInstanceId} · {unit.recordKey}
              {' · '}{unit.compositionKind}
            </Text>
          ))}
        </View>
      )}
      {journey.publicPlan && (
        <View style={st.card} testID="iterative-roster-public-plan">
          <Text style={st.sectionTitle}>
            {ui(L, '胜利路线草稿', 'Victory-route draft')}
          </Text>
          <Text style={st.cardSub}>{journey.publicPlan.victoryRoute}</Text>
          <Text style={st.cardSub}>
            {ui(L, '地图证据', 'Map evidence')}: {' '}
            {journey.publicPlan.mapEvidenceHash || '—'}
          </Text>
        </View>
      )}
      {journey.arrivalSchedule && (
        <View style={st.card} testID="iterative-roster-arrival-schedule">
          <Text style={st.sectionTitle}>
            {ui(L, '进场安排 · 规则审核',
              'Arrival schedule · Rules-audited')}
          </Text>
          {journey.arrivalSchedule.entries?.map((entry: any) => (
            <Text key={entry.unitInstanceId} style={st.cardSub}>
              R{entry.round} · {entry.unitInstanceId}
              {' · '}{entry.publicReasonText}
            </Text>
          ))}
          <Text style={st.cardSub}>
            {journey.arrivalPublicAudit?.status || '—'}
          </Text>
        </View>
      )}
      {journey.teachSessionId && (
        <View style={st.card} testID="iterative-roster-teach-link">
          <Text style={st.sectionTitle}>
            {ui(L, '锁表 Teach', 'Locked-roster Teach')}
          </Text>
          <Text style={st.cardSub}>
            {journey.teachStatus} · {journey.teachSessionId}
          </Text>
          {journey.teachPlanHash && (
            <Text style={st.hashLine}>plan {journey.teachPlanHash}</Text>
          )}
          <Text style={st.cardSub}>
            {ui(L, '来源审查', 'Source review')}: {' '}
            {journey.sourceReviewStatus || 'required'}
            {typeof journey.sourceReviewHighCount === 'number'
              ? ` · High/Critical ${journey.sourceReviewHighCount}` : ''}
          </Text>
          {journey.sourceReviewFailure && (
            <Text style={[st.cardSub, { color: AMBER }]}>
              {journey.sourceReviewFailure}
            </Text>
          )}
          <Pressable onPress={() => void onOpenTeach(journey.teachSessionId)}
            style={({ pressed }) => [st.btn, { borderColor: BLUE,
              alignSelf: 'flex-start', marginTop: 8 },
              pressed && { opacity: 0.7 }]}
            testID="iterative-roster-open-teach">
            <Text style={[st.btnText, { color: BLUE }]}>
              {ui(L, '查看计划、审查结果与修订',
                'Inspect plan, review findings and revise')}
            </Text>
          </Pressable>
        </View>
      )}
      {launchable && (
        <View style={[st.card, { marginTop: 10 }]}
          testID="iterative-roster-room-launch-ready">
          <Text style={st.sectionTitle}>
            {ui(L, '计划已通过来源审查', 'Plan passed source review')}
          </Text>
          <Text style={st.cardSub}>
            {ui(L, '开局时服务器将再次核对军表、地图与计划，并创建可恢复的正式对局。',
              'The server rechecks roster, map and plan before creating a recoverable authoritative match.')}
          </Text>
          <Pressable onPress={() => void launch()}
            disabled={launching}
            style={({ pressed }) => [st.primaryBtn,
              { alignSelf: 'flex-start', marginTop: 8 },
              (pressed || launching) && { opacity: 0.7 }]}
            testID="iterative-roster-launch-room">
            <Text style={st.primaryBtnText}>
              {launching
                ? ui(L, '正在创建正式对局…', 'Creating the match…')
                : ui(L, '用此军表开始 AI 对局', 'Start AI match with this roster')}
            </Text>
          </Pressable>
        </View>
      )}
      {!launchable && <View style={[st.unavailableBox, { marginTop: 10 }]}
        testID="iterative-roster-not-room-admitted">
        <Text style={[st.cardName, { color: AMBER }]}>
          {ui(L, '尚不可用此表开局',
            'This roster is not yet admitted to a match')}
        </Text>
        <Text style={st.hint}>
          {ui(L, '即使军表满 2000 分并完成 Teach，仍需审查晋升后的计划、处理 High 问题，再绑定正式房间。当前页面绝不把草稿当作可对局结果。',
            'Even after exact budget and Teach, the promoted plan needs source review, High-finding resolution and formal Room binding.')}
        </Text>
      </View>}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ── Session view ───────────────────────────────────────────────────────────
function SessionView({ L, session, catalogue, deliberation, roomLaunchAvailable, onSession, onError, onRefreshSessions }: any) {
  const rosterPlanningClient = useMatchPlanningClient();
  const [exportText, setExportText] = useState('');
  const [launching, setLaunching] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionSections, setRevisionSections] = useState<string[]>(['scoreRoute', 'deploymentConcept']);
  const [showRevise, setShowRevise] = useState(false);
  const running = session.status === 'running'
    || session.presetJourney?.status === 'running';
  const plan = session.plan;
  const agentSelectedPlan = plan?.schema
    === 'starcraft_tmg_agent_scheduled_roster_plan_v1';
  const plannedPresetPlan = plan?.schema
    === 'starcraft_tmg_roster_plan_v2';
  const canRevisePlan = !!plan && !session.planEvidenceStale && !running
    && (!session.lockedRoster || agentSelectedPlan || plannedPresetPlan);
  // This only enables the control. The product service rechecks the persisted
  // current Plan, Teach, Builder verdict and map before creating any Room.
  const presetLaunchable = Platform.OS === 'web' && roomLaunchAvailable
    && !!session.lockedRoster && !session.agentSelectionHandoffHash && !running
    && session.presetJourney?.status === 'completed' && !!plan?.planHash
    && session.presetJourney.acceptedPlanHash === plan.planHash
    && !session.planEvidenceStale && !session.planReviewRequiredForHandoff
    && !session.planReviewBlockingHighFindings;
  const launchPreset = async () => {
    setLaunching(true);
    try {
      const result = await rosterPlanningClient.launchPresetRoom(session.sessionId);
      onError(null);
      await Linking.openURL(result.match.joinUrl);
    } catch (error) { onError(error); }
    finally { setLaunching(false); }
  };

  const act = useCallback(async (fn: () => Promise<any>) => {
    try {
      const result = await fn();
      if (result?.session) onSession(result.session);
      onError(null);
    } catch (e) {
      onError(e);
    }
  }, [onSession, onError]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      {/* Setup summary */}
      <View style={st.card} testID="session-setup-summary">
        <Text style={st.cardName}>
          {factionShort(session.setup.factionRecordKey, catalogue)} vs{' '}
          {factionShort(session.setup.opponentFactionRecordKey, catalogue)}
          {' · '}{session.setup.engagementScale} {session.setup.mineralBudget}
        </Text>
        <Text style={st.cardSub}>
          {ui(L, '对手信息', 'Opponent info')}: {session.setup.opponentInformationBoundary === 'open_roster'
            ? ui(L, '公开军表', 'open roster') : ui(L, '未知军表', 'unknown roster')}
          {' · '}{ui(L, '任务', 'Mission')}: {session.setup.missionBinding?.missionRecordKey}
        </Text>
        <Text style={st.hashLine}>session {session.sessionId}</Text>
        <Text style={st.cardSub}>
          {session.planningMode === 'locked_roster_teach_v1'
            ? ui(L, `军表已锁定 · ${session.lockedRoster?.unitCount || 0} 个单位；Teach 只规划用法，不重新选模型`,
              `Roster locked · ${session.lockedRoster?.unitCount || 0} units; Teach plans its use without reselecting models`)
            : ui(L, 'Skill → 小计划 → Teach 质询 → 选模型 → 深化计划',
              'Skill → small plan → Teach challenge → model selection → deep plan')}
        </Text>
        {!!session.sourcePlanHash && (
          <Text style={st.hashLine}>{ui(L, '源计划', 'Source plan')} {session.sourcePlanHash}</Text>
        )}
      </View>

      {/* Failure banner */}
      {session.failure && (
        <View style={st.errorBanner} testID="session-failure">
          <Text style={st.errorText}>
            {session.status === 'cancelled'
              ? ui(L, '规划已取消(未发送的请求不会产生重复调用)', 'Planning cancelled (unsent rounds never reach the provider)')
              : `${ui(L, '规划失败', 'Planning failed')}: ${session.failure.code}`}
          </Text>
          {!!session.failure.detail && <Text style={st.errorDetail}>{session.failure.detail}</Text>}
        </View>
      )}
      {session.status === 'paused' && (
        <View style={st.errorBanner} testID="session-paused">
          <Text style={st.errorText}>
            {ui(L, '已在模型回合边界暂停，可续接，不会重付已保存的回复',
              'Paused at a model-round boundary; retained replies are reused on resume')}
          </Text>
          <Text style={st.errorDetail}>
            {ui(L, `已保存 ${session.pauseReceipt?.retainedReplyCount || 0} 条回复`,
              `${session.pauseReceipt?.retainedReplyCount || 0} replies retained`)}
          </Text>
        </View>
      )}

      {/* Progress timeline */}
      {(session.progress.rounds.length > 0 || running) && (
        <View style={st.card} testID="session-progress">
          <Text style={st.sectionTitle}>{ui(L, '规划进度', 'Planning progress')}</Text>
          {session.progress.rounds.map((round: any, index: number) => (
            <View key={`${round.roundKind}-${round.roundIndex}-${index}`} style={st.roundRow}>
              <Text style={[st.roundStatus, {
                color: round.status === 'completed' ? GREEN
                  : round.status === 'replayed' ? BLUE
                  : round.status === 'failed' ? RED : AMBER,
              }]}>
                {round.status === 'completed' ? '✓'
                  : round.status === 'replayed' ? '⟲'
                  : round.status === 'failed' ? '✗' : '…'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={st.cardName}>
                  {ROUND_LABELS[round.roundKind]
                    ? ui(L, ROUND_LABELS[round.roundKind].zh, ROUND_LABELS[round.roundKind].en)
                    : round.roundKind}
                  {round.status === 'replayed' ? ui(L, '(本地回放 · 0 调用)', ' (local replay · 0 calls)') : ''}
                </Text>
                <Text style={st.cardSub}>
                  {round.usage
                    ? `${round.usage.inputUnits}→${round.usage.outputUnits} 单元 · ${Math.round((round.latencyMs || 0) / 1000)}s`
                    : round.status === 'running' ? ui(L, '进行中…', 'running…') : '—'}
                </Text>
              </View>
            </View>
          ))}
          {running && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              <Pressable onPress={() => act(() => rosterPlanningClient.pause(session.sessionId))}
                disabled={session.pauseRequested === true}
                style={({ pressed }) => [st.btn, { borderColor: BLUE }, pressed && { opacity: 0.7 }]}
                testID="session-pause">
                <Text style={[st.btnText, { color: BLUE }]}>
                  {session.pauseRequested
                    ? ui(L, '等待当前回合结算…', 'Waiting for the current round…')
                    : ui(L, '暂停并保存断点', 'Pause and save checkpoint')}
                </Text>
              </Pressable>
              <Pressable onPress={() => act(() => rosterPlanningClient.cancel(session.sessionId))}
                style={({ pressed }) => [st.btn, { borderColor: RED }, pressed && { opacity: 0.7 }]}
                testID="session-cancel">
                <Text style={[st.btnText, { color: RED }]}>{ui(L, '取消规划', 'Cancel planning')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Generate / resume controls */}
      {session.lockedRoster && !session.agentSelectionHandoffHash && (
        <View style={st.card} testID="preset-product-journey">
          <Text style={st.sectionTitle}>{ui(L, '固定军表 · 完整计划与 Teach', 'Fixed army · complete Plan and Teach')}</Text>
          <Text style={st.cardSub}>{session.presetJourney?.stage || ui(L, '尚未启动', 'Not started')}</Text>
          {!!session.presetJourney?.failure?.code && <Text style={st.hint}>{session.presetJourney.failure.code}</Text>}
          {!running && <Pressable
            onPress={() => act(() => rosterPlanningClient.runPresetSession(session.sessionId))}
            disabled={!deliberation?.available}
            style={st.primaryBtn} testID="preset-product-run">
            <Text style={st.primaryBtnText}>{ui(L, '生成／续接完整计划流程', 'Generate / resume complete planning')}</Text>
          </Pressable>}
          <Text style={st.hint}>{ui(L, '自动完成计划、进场、来源审核、Teach 与修订；断点复用已付费回复。开局仍需正式房间准入。',
            'Plan, arrival, source review, Teach and revision use one product workflow. Paid replies survive restart; Room admission is still required.')}</Text>
          {presetLaunchable && <Pressable onPress={() => void launchPreset()}
            disabled={launching} style={[st.primaryBtn, launching && { opacity: 0.7 }]}
            testID="preset-roster-launch-room">
            <Text style={st.primaryBtnText}>{launching
              ? ui(L, '正在创建正式对局…', 'Creating the match…')
              : ui(L, '用此军表与计划开始 AI 对局', 'Start AI match with this roster and plan')}</Text>
          </Pressable>}
          {session.presetJourney?.status === 'completed' && Platform.OS !== 'web'
            && <Text style={st.hint}>{ui(L, '计划流程已完成；App 内对局导航尚未开放，请勿视为已开始对局。',
              'Planning is complete; in-app match navigation is not available yet. No match has started.')}</Text>}
        </View>
      )}
      {!running && !plan && !session.lockedRoster && (
        <View style={{ gap: 8 }} >
          <Pressable
            onPress={() => act(() => rosterPlanningClient.generate(session.sessionId))}
            style={({ pressed }) => [st.primaryBtn, !deliberation?.available && { opacity: 0.4 },
              pressed && { opacity: 0.7 }]}
            testID="session-generate">
            <Text style={st.primaryBtnText}>
              {session.planningMode === 'locked_roster_teach_v1'
                ? session.resumeAvailable
                  ? ui(L, '从头重生成锁表计划(不复用旧回复，重新计费)',
                    'Restart locked-roster plan (old replies not reused; paid again)')
                  : ui(L, '为锁定军表生成计划(真实付费 Flash 调用)',
                    'Plan this locked roster (real paid Flash calls)')
                : session.resumeAvailable
                  ? ui(L, '从头重生成军表(不复用旧回复，重新计费)',
                    'Restart roster generation (old replies not reused; paid again)')
                  : ui(L, 'Teach 写表并生成计划(真实付费 Flash 调用)',
                    'Teach-build roster and plan (real paid Flash calls)')}
            </Text>
          </Pressable>
          {session.resumeAvailable && (
            <>
              {deliberation?.available && (
                <Pressable
                  onPress={() => act(() => rosterPlanningClient.resumeLive(session.sessionId))}
                  style={({ pressed }) => [st.btn, { borderColor: BLUE }, pressed && { opacity: 0.7 }]}
                  testID="session-resume-live">
                  <Text style={[st.btnText, { color: BLUE }]}>
                    {ui(L, `续接规划(复用 ${session.retainedReplyCount} 条已付费回复；仅缺失轮调用 Flash)`,
                      `Continue planning (${session.retainedReplyCount} paid replies retained; Flash only for missing rounds)`)}
                  </Text>
                </Pressable>
              )}
              {session.retainedReplyCount > 0 && (
                <Pressable
                  onPress={() => act(() => rosterPlanningClient.resumeReplay(session.sessionId))}
                  style={({ pressed }) => [st.btn, { borderColor: BLUE }, pressed && { opacity: 0.7 }]}
                  testID="session-resume-replay">
                  <Text style={[st.btnText, { color: BLUE }]}>
                    {ui(L, `仅本地回放(${session.retainedReplyCount} 条已保留回复 · 0 新调用)`,
                      `Local replay only (${session.retainedReplyCount} retained replies · 0 new calls)`)}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}

      {/* Plan */}
      {plan && <PlanView L={L} session={session} catalogue={catalogue} />}

      {/* Candidates compare */}
      {session.candidates.length > 0 && (
        <CandidatesView L={L} session={session} catalogue={catalogue} />
      )}

      {/* Immutable Slice-272 preset comparison arm identities */}
      {session.presetComparison && (
        <PresetComparisonView L={L} comparison={session.presetComparison} />
      )}

      {/* Working list / manual override */}
      {session.working && plan && !session.lockedRoster && (
        <WorkingListEditor L={L} session={session} catalogue={catalogue}
          onSession={onSession} onError={onError} act={act} />
      )}

      {/* An edited list invalidates the old candidate and its prose. */}
      {session.planEvidenceStale && plan && !running && (
        <View style={st.staleBanner} testID="session-stale-banner">
          <Text style={[st.cardName, { color: AMBER }]}>
            {ui(L, '手动修改后计划证据已过期', 'Plan evidence is stale after manual edits')}
          </Text>
          <Text style={st.hint}>
            {ui(L, '当前清单与旧计划的规则审查不一致。旧计划仅供历史参考；恢复原名单或为当前名单重新生成完整计划，不能只改得分文字。',
              'The current roster no longer matches the old plan’s Rules audit. Keep that plan as history; restore its roster or generate a complete new plan for this list. Editing score text alone is unsafe.')}
          </Text>
          {session.working?.verdictSummary?.status === 'legal' && (
            <Pressable onPress={() => act(() => rosterPlanningClient.lockAndReplan(session.sessionId))}
              style={({ pressed }) => [st.btn, { borderColor: BLUE, alignSelf: 'flex-start', marginTop: 8 }, pressed && { opacity: 0.7 }]}
              testID="session-lock-and-replan">
              <Text style={[st.btnText, { color: BLUE }]}>
                {ui(L, '锁定当前军表，重新 Teach 生成计划',
                  'Lock this roster and Teach a new plan')}
              </Text>
            </Pressable>
          )}
        </View>
      )}
      {canRevisePlan && (
        <View style={{ marginBottom: 8 }}>
          <Pressable onPress={() => setShowRevise(!showRevise)}
            style={({ pressed }) => [st.btn, { borderColor: AMBER, alignSelf: 'flex-start', marginTop: 6 }, pressed && { opacity: 0.7 }]}
            testID="session-show-revise">
            <Text style={[st.btnText, { color: AMBER }]}>
              {ui(L, '修订当前名单的策略(1 次付费调用)', 'Revise strategy for this unchanged roster (1 paid call)')}
            </Text>
          </Pressable>
        </View>
      )}
      {showRevise && canRevisePlan && (
        <View style={st.card} testID="session-revise-form">
          <Text style={st.sectionTitle}>{ui(L, '修订计划', 'Revise plan')}</Text>
          <TextInput style={st.importInputSmall} multiline value={revisionReason}
            onChangeText={setRevisionReason}
            placeholder={ui(L, '修订原因(公开)', 'Revision reason (public)')}
            placeholderTextColor="#64748b" testID="revision-reason" />
          <Text style={st.label}>{ui(L, '修订的章节', 'Sections to revise')}</Text>
          <View style={st.chipRow}>
            {[
              ['scoreRoute', ui(L, '得分路线', 'Score route')],
              ['componentPurposes', ui(L, '角色、组件用途', 'Roles and component purposes')],
              ['deploymentConcept', ui(L, '部署构想', 'Deployment concept')],
              ['publicSummaryText', ui(L, '公开摘要', 'Public summary')],
            ].map(([key, label]) => (
              <Pressable key={key} onPress={() => {
                if ((agentSelectedPlan || plannedPresetPlan)
                  && key === 'deploymentConcept') return;
                setRevisionSections((current) => current.includes(key)
                  ? current.filter((entry) => entry !== key)
                  : [...current, key]);
              }} style={[st.chip, revisionSections.includes(key) && st.chipActive]}
                testID={`revision-section-${key}`}>
                <Text style={[st.chipText, revisionSections.includes(key) && st.chipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => act(async () => {
              const result = await rosterPlanningClient.revise(session.sessionId, {
                reasonText: revisionReason,
                triggerIds: [],
                revisedSectionKeys: agentSelectedPlan || plannedPresetPlan
                  ? [...new Set([...revisionSections, 'deploymentConcept'])]
                  : revisionSections,
              });
              setShowRevise(false);
              return result;
            })}
            style={({ pressed }) => [st.primaryBtn,
              (!revisionReason.trim() || revisionSections.length === 0 || !deliberation?.available) && { opacity: 0.4 },
              pressed && { opacity: 0.7 }]}
            testID="revision-submit">
            <Text style={st.primaryBtnText}>{ui(L, '提交修订', 'Submit revision')}</Text>
          </Pressable>
        </View>
      )}

      {/* Usage / provenance / export */}
      {plan && (
        <View style={st.card} testID="session-provenance">
          <Text style={st.sectionTitle}>{ui(L, '溯源与成本', 'Provenance & cost')}</Text>
          <Text style={st.cardSub} testID="session-final-review-status">
            {ui(L, '最终计划审查', 'Final plan review')}: {' '}
            {session.planReview?.status === 'completed' && !session.planReview?.stale
              ? ui(L,
                `完成 · ${session.planReview.review?.reviewedClaimCount ?? '—'} 条主张 / ${session.planReview.review?.shardCount ?? '—'} 片 · High ${session.planReview.review?.findings?.filter((finding: any) => finding.severity === 'high').length ?? 0}`,
                `Complete · ${session.planReview.review?.reviewedClaimCount ?? '—'} claims / ${session.planReview.review?.shardCount ?? '—'} shards · High ${session.planReview.review?.findings?.filter((finding: any) => finding.severity === 'high').length ?? 0}`)
              : session.planReview?.status === 'running'
                ? ui(L, '进行中；已完成片段会保存', 'Running; completed shards are retained')
                : session.planReview?.status === 'failed'
                  ? `${ui(L, '未完成', 'Incomplete')}: ${session.planReview.failure?.code || '—'}`
                  : ui(L, '尚未审查；不能据此视作可开局计划',
                    'Not reviewed; not yet an admitted match plan')}
          </Text>
          {session.planReview?.status === 'completed'
            && !session.planReview?.stale
            && session.planReview.review?.findings?.filter(
              (finding: any) => finding.severity === 'high').slice(0, 5)
                .map((finding: any, index: number) => (
                  <Text key={`${finding.claimPath}-${index}`} style={[st.cardSub, { color: RED }]}>
                    High · {finding.claimPath}: {finding.publicReason}
                  </Text>
                ))}
          {session.status === 'planned'
            && session.planReview?.status !== 'running'
            && session.planReview?.failure?.code
              !== 'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP'
            && (session.planReview?.status !== 'completed'
              || session.planReview?.stale) && (
                <Pressable
                  onPress={() => act(() => rosterPlanningClient.reviewFinalPlan(session.sessionId))}
                  style={({ pressed }) => [st.btn, { borderColor: BLUE, alignSelf: 'flex-start', marginTop: 6 },
                    pressed && { opacity: 0.7 }]}
                  testID="session-review-final-plan">
                  <Text style={[st.btnText, { color: BLUE }]}>
                    {ui(L, '审查最终计划（分片调用模型；已保存回复可续接）',
                      'Review final plan (sharded model calls; saved replies resume)')}
                  </Text>
                </Pressable>
              )}
          {session.planReview?.failure?.code
            === 'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP' && (
              <Text style={[st.cardSub, { color: AMBER }]}>
                {ui(L, '请求可能已发送但没有用量回执；已停止自动重发，请先核对这次调用。',
                  'The request may have been sent without a usage receipt. Automatic resend is stopped pending reconciliation.')}
              </Text>
            )}
          <Text style={st.cardSub}>
            {ui(L, '模型', 'Model')}: {session.usage?.modelVersion || '—'}
            {' · '}{ui(L, '付费调用', 'Paid calls')}: {session.usage?.calls ?? 0}
          </Text>
          <Text style={st.cardSub}>
            {ui(L, '报告单元', 'Reported units')}: {session.usage
              ? `${session.usage.inputUnits} 输入 / ${session.usage.outputUnits} 输出 / ${session.usage.totalUnits} 合计`
              : '—'}
          </Text>
          <Text style={st.cardSub}>
            {ui(L, '估算成本', 'Estimated cost')}: {session.usage?.estimatedCost
              ? `¥${(session.usage.estimatedCost.calculatedCostCnyMicros / 1_000_000).toFixed(6)} (${ui(L, '保守全未命中缓存', 'conservative all-miss')})`
              : ui(L, '无付费用量', 'no paid usage')}
          </Text>
          <Text style={st.hashLine}>plan {plan.planHash?.slice(0, 20)}… · v{plan.planVersion} · {plan.planStatus}</Text>
          <Text style={st.hashLine}>
            audit {session.evidence?.sessionReceipt?.finalAuditResultHash?.slice(0, 20)}… ·{' '}
            {ui(L, '源状态变异', 'source mutations')}: {session.evidence?.mutationZeroProof?.sourceStateMutationCount ?? '—'}
          </Text>
          {!!session.evidence?.sessionReceipt?.teachReview && (
            <Text style={[st.cardSub, {
              color: session.evidence.sessionReceipt.teachReview.unsupportedEvidenceReferences
                || session.evidence.sessionReceipt.teachReview.unsupportedAnswerDemotions
                || session.evidence.sessionReceipt.teachReview.retainedTargetChangeWarnings?.length
                ? AMBER : GREEN,
            }]}>
              {ui(L, 'Teach 复核', 'Teach review')}: {' '}
              {session.evidence.sessionReceipt.teachReview.unsupportedEvidenceReferences} {' '}
              {ui(L, '条无效引用', 'unsupported references')} · {' '}
              {session.evidence.sessionReceipt.teachReview.unsupportedAnswerDemotions} {' '}
              {ui(L, '条证据不足降为未决', 'claims demoted to unresolved')} · {' '}
              {session.evidence.sessionReceipt.teachReview.retainedTargetChangeWarnings?.length || 0} {' '}
              {ui(L, '条需人工复核', 'need human review')}
            </Text>
          )}
          <Pressable onPress={() => act(async () => {
            const result = await rosterPlanningClient.exportSession(session.sessionId);
            const text = JSON.stringify(result.export.exportDocument, null, 2);
            setExportText(text);
            // Clipboard is best-effort (headless/permission-gated browsers
            // may refuse); the export text itself is already displayed.
            try { await Clipboard.setStringAsync(text); } catch { /* best-effort */ }
            return result;
          })} style={({ pressed }) => [st.btn, { borderColor: GREEN, alignSelf: 'flex-start', marginTop: 6 }, pressed && { opacity: 0.7 }]}
            testID="session-export">
            <Text style={[st.btnText, { color: GREEN }]}>
              {ui(L, '导出军表+计划(不含凭据,已复制)', 'Export list+plan (no secrets, copied)')}
            </Text>
          </Pressable>
          {!!exportText && (
            <ScrollView style={st.exportBox} testID="session-export-text">
              <Text style={st.exportText}>{exportText.slice(0, 4000)}</Text>
            </ScrollView>
          )}
        </View>
      )}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

// ── Plan sections ──────────────────────────────────────────────────────────
function PlanView({ L, session, catalogue }: any) {
  const plan = session.plan;
  const receipt = session.evidence?.sessionReceipt;
  return (
    <View style={{ gap: 8 }} testID="session-plan">
      <View style={st.card}>
        <Text style={st.sectionTitle}>{ui(L, '胜利路线 / 得分路线', 'Win / score route')}</Text>
        <Text style={st.cardName}>
          {plan.scoreRoute?.routeKind}
          {receipt?.scoreRouteAuthorityStatus ? ` · ${receipt.scoreRouteAuthorityStatus}` : ''}
          {plan.scoreRoute?.scheduleStatus ? ` · ${ui(L, '时间表', 'schedule')}: ${plan.scoreRoute.scheduleStatus}` : ''}
        </Text>
        <Text style={st.bodyText}>{plan.scoreRoute?.routeText}</Text>
        {(plan.scoreRoute?.targetVpSchedule || []).map((entry: any) => (
          <Text key={entry.window} style={st.cardSub}>
            · {entry.window}: VP {entry.plannedCumulativeVp}
          </Text>
        ))}
        {!!plan.scoreRoute?.fallbackRouteText && plan.scoreRoute.fallbackRouteText !== 'unknown' && (
          <Text style={st.cardSub}>{ui(L, '备选路线', 'Fallback')}: {plan.scoreRoute.fallbackRouteText}</Text>
        )}
      </View>

      <View style={st.card}>
        <Text style={st.sectionTitle}>{ui(L, '预算与损失', 'Budget & losses')}</Text>
        <Text style={st.cardSub}>
          {ui(L, '矿物花费意图', 'Mineral spend intent')}: {plan.lossResourceBudget?.mineralSpendIntent?.status}
          {plan.lossResourceBudget?.mineralSpendIntent?.plannedMineralSpend != null
            ? ` · ${plan.lossResourceBudget.mineralSpendIntent.plannedMineralSpend}/${plan.lossResourceBudget.mineralSpendIntent.mineralBudget}`
            : ''}
          {' · '}{ui(L, '未用资源', 'Unspent')}: {ui(L, '作废', 'lost')}
        </Text>
        {(plan.lossResourceBudget?.plannedLossBudget || []).map((entry: any, index: number) => (
          <Text key={`${entry.window}-${entry.resourceKind}-${index}`} style={st.cardSub}>
            · {entry.window} · {entry.resourceKind}: ≤{entry.plannedMaximumLoss}
          </Text>
        ))}
      </View>

      {/* Formal budget contract (Slice 272): the versioned product-contract
          tolerance, the Rules/Builder-derived threshold/cap and the actual
          acceptance outcome — displayed exactly as the chain enforces it. */}
      {(plan.budgetAcceptance || session.budgetContract) && (
        <View style={st.card} testID="session-budget-contract">
          <Text style={st.sectionTitle}>{ui(L, '正式预算合同', 'Formal budget contract')}</Text>
          {plan.budgetAcceptance ? (
            <>
              <Text style={[st.cardName, {
                color: plan.budgetAcceptance.status === 'unmet_severe_underspend' ? RED
                  : plan.budgetAcceptance.status === 'met_near_cap_exemption' ? BLUE : GREEN,
              }]}>
                {plan.budgetAcceptance.status === 'met'
                  ? ui(L, '✓ 满足(利用率下限)', '✓ Met (utilization floor)')
                  : plan.budgetAcceptance.status === 'met_near_cap_exemption'
                    ? ui(L, '✓ 满足(贴近上限豁免)', '✓ Met (near-cap exemption)')
                    : ui(L, '✗ 未满足:严重欠花费 — 仅以草稿收口,非最终正式成功',
                        '✗ Unmet: severe underspend — closes as draft, never a final formal success')}
              </Text>
              <Text style={st.cardSub}>
                {ui(L, '矿物', 'Minerals')}: {plan.budgetAcceptance.mineralSpent}/{plan.budgetAcceptance.mineralBudget}
                {` · ${ui(L, '利用率', 'utilization')} ${(plan.budgetAcceptance.utilizationBasisPoints / 100).toFixed(1)}%`}
                {` · ${ui(L, '未用(作废)', 'unspent (lost)')} ${plan.budgetAcceptance.mineralUnspent}`}
              </Text>
              <Text style={st.cardSub}>
                {ui(L, '瓦斯', 'Vespene')}: {plan.budgetAcceptance.vespeneSpent}/{plan.budgetAcceptance.vespeneFormalCap}
                {plan.budgetAcceptance.vespeneWithinFormalCap
                  ? ui(L, ' · 正式上限内', ' · within formal cap')
                  : ui(L, ' · 超出正式上限', ' · OVER formal cap')}
              </Text>
            </>
          ) : (
            <Text style={st.cardSub}>
              {ui(L, '该计划早于预算合同 1.1.0 生成,未携带验收块(历史证据)。',
                'This plan predates budget contract 1.1.0 (legacy evidence, no acceptance block).')}
            </Text>
          )}
          {session.budgetContract && (
            <>
              <Text style={st.cardSub}>
                {ui(L, '合同容差', 'Contract tolerance')}: {ui(L, '矿物利用率下限', 'mineral utilization floor')}{' '}
                {(session.budgetContract.utilizationFloorBasisPoints / 100).toFixed(0)}%
                ({session.budgetContract.mineralUtilizationFloor.numerator}/{session.budgetContract.mineralUtilizationFloor.denominator})
                {` · ${ui(L, '贴近上限豁免阈值', 'near-cap exemption')} <${session.budgetContract.nearCapThresholdMinerals}M`}
                {` · ${ui(L, '瓦斯正式上限', 'vespene formal cap')} ${session.budgetContract.vespeneFormalCap}`}
              </Text>
              <Text style={st.hint}>
                {ui(L, session.budgetContract.toleranceDisplayTextZh,
                  session.budgetContract.toleranceDisplayTextEn)}
              </Text>
              <Text style={st.hashLine}>
                contract {String(session.budgetContract.contractHash || '').slice(0, 20)}… · v{session.budgetContract.contractVersion}
                {plan.planStatus === 'draft' && plan.budgetAcceptance?.status === 'unmet_severe_underspend'
                  ? ui(L, ' · 计划状态:草稿(预算合同未达标)', ' · plan status: draft (budget contract unmet)')
                  : ''}
              </Text>
            </>
          )}
        </View>
      )}

      <View style={st.card}>
        <Text style={st.sectionTitle}>{ui(L, '部署构想', 'Deployment concept')}</Text>
        <Text style={st.bodyText}>{plan.deploymentConcept?.deploymentConceptText}</Text>
        {plan.deploymentConcept?.activationOrderStatus === 'declared' && (
          <>
            <Text style={st.label}>{ui(L, '激活顺序', 'Activation order')}</Text>
            {plan.deploymentConcept.activationOrder.map((entry: any) => (
              <Text key={entry.ordinal} style={st.cardSub}>
                {entry.ordinal}. {entry.unitInstanceId} · {entry.phase}
              </Text>
            ))}
          </>
        )}
        {!!plan.deploymentConcept?.reinforcementPolicyText && (
          <Text style={st.cardSub}>{ui(L, '增援策略', 'Reinforcement')}: {plan.deploymentConcept.reinforcementPolicyText}</Text>
        )}
      </View>

      <View style={st.card}>
        <Text style={st.sectionTitle}>{ui(L, '组件用途', 'Component purposes')}</Text>
        {(plan.componentPurposes || []).map((purpose: any) => (
          <View key={`${purpose.componentKind}:${purpose.instanceId}`} style={{ marginBottom: 4 }}>
            <Text style={st.cardName}>
              {purpose.instanceId} <Text style={st.cardSub}>({purpose.componentKind} · {purpose.scoringRole})</Text>
            </Text>
            <Text style={st.cardSub}>{purpose.publicPurposeText}</Text>
          </View>
        ))}
      </View>

      <View style={st.card}>
        <Text style={st.sectionTitle}>{ui(L, '对手假设与预测反制', 'Opponent hypotheses & predicted counters')}</Text>
        {(plan.opponentHypotheses || []).map((hypothesis: any) => (
          <View key={hypothesis.hypothesisId} style={{ marginBottom: 6 }}>
            <Text style={st.cardName}>{hypothesis.archetypeLabel} <Text style={st.cardSub}>({hypothesis.confidence})</Text></Text>
            <Text style={st.cardSub}>{hypothesis.hypothesisText}</Text>
            {(hypothesis.expectedCounterTexts || []).map((text: string, index: number) => (
              <Text key={index} style={st.counterText}>↳ {ui(L, '对手反制', 'counter')}: {text}</Text>
            ))}
          </View>
        ))}
        {(plan.counterResponses || []).map((response: any) => (
          <View key={response.responseId} style={{ marginBottom: 4 }}>
            <Text style={st.cardName}>{response.responseId}</Text>
            <Text style={st.cardSub}>{response.triggerText} → {response.responseText}</Text>
          </View>
        ))}
      </View>

      <View style={st.card}>
        <Text style={st.sectionTitle}>{ui(L, '失效触发器', 'Invalidation triggers')}</Text>
        {(plan.invalidationTriggers || []).map((trigger: any) => (
          <Text key={trigger.triggerId} style={st.cardSub}>
            · {trigger.triggerId} ({trigger.observationKind}): {trigger.triggerText}
          </Text>
        ))}
      </View>

      <View style={st.card} testID="session-tool-evidence">
        <Text style={st.sectionTitle}>{ui(L, '查询/模拟证据', 'Query / simulation evidence')}</Text>
        {(plan.toolReceiptReferences || []).map((reference: any) => (
          <Text key={reference.referenceId} style={st.cardSub}>
            · {reference.receiptKind} [{reference.status === 'attached'
              ? ui(L, '已附', 'attached') : ui(L, '未知(绝不当作 0)', 'unknown (never zero)')}]
            {reference.toolId !== 'unknown' ? ` · ${reference.toolId}` : ''}: {reference.querySummaryText}
          </Text>
        ))}
        {(session.evidence?.toolReceipts || []).length > 0 && (
          <Text style={st.hashLine}>
            {ui(L, '实验室收据', 'lab receipts')}: {session.evidence.toolReceipts.length}
            {' · '}{ui(L, '源状态变异', 'source mutations')}: {session.evidence.mutationZeroProof?.sourceStateMutationCount ?? 0}
          </Text>
        )}
      </View>

      {!!plan.publicSummaryText && (
        <View style={st.card}>
          <Text style={st.sectionTitle}>{ui(L, '公开摘要', 'Public summary')}</Text>
          <Text style={st.bodyText}>{plan.publicSummaryText}</Text>
        </View>
      )}

      {(plan.revisions || []).length > 0 && (
        <View style={st.card} testID="session-revisions">
          <Text style={st.sectionTitle}>{ui(L, '修订历史', 'Revision history')}</Text>
          {plan.revisions.map((revision: any) => (
            <Text key={revision.revisionId} style={st.cardSub}>
              · v{revision.fromPlanVersion}→v{revision.toPlanVersion}: {revision.reasonText}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Immutable Slice-272 preset comparison ─────────────────────────────────
function PresetComparisonView({ L, comparison }: any) {
  const agent = comparison.agentArm || {};
  const preset = comparison.presetArm || {};
  return (
    <View style={st.card} testID="session-preset-comparison">
      <Text style={st.sectionTitle}>
        {ui(L, '对照臂(不可变 · 仅写表对照,未进行对局)', 'Comparison arms (immutable · pregame only, no match played)')}
      </Text>
      <Text style={[st.cardName, { color: CYAN }]}>
        {ui(L, 'Agent 臂(公开 RosterPlan)', 'Agent arm (public RosterPlan)')}
      </Text>
      <Text style={st.cardSub}>
        {ui(L, '计划状态', 'planStatus')}: {agent.planStatus}
        {agent.budgetAcceptanceStatus ? ` · ${ui(L, '预算合同', 'budget')}: ${agent.budgetAcceptanceStatus}` : ''}
        {agent.mineralSpent != null ? ` · ${agent.mineralSpent}M/${agent.vespeneSpent}V` : ''}
      </Text>
      <Text style={st.hashLine}>
        plan {String(agent.planHash || '').slice(0, 20)}… · audit {String(agent.armyAuditResultHash || '').slice(0, 20)}…
      </Text>
      <Text style={[st.cardName, { color: AMBER, marginTop: 6 }]}>
        {ui(L, '预制军表臂(明确无赛前计划)', 'Preset roster arm (explicitly no pregame plan)')}
      </Text>
      <Text style={st.cardSub}>
        {ui(L, '计划状态', 'planStatus')}: {preset.planStatus}
        {preset.mineralSpent != null ? ` · ${preset.mineralSpent}M/${preset.vespeneSpent}V` : ''}
        {preset.presetSource ? ` · ${preset.presetSource}` : ''}
      </Text>
      <Text style={st.hashLine}>
        plan {String(preset.planHash || '').slice(0, 20)}… · audit {String(preset.armyAuditResultHash || '').slice(0, 20)}…
      </Text>
      <Text style={st.hint}>
        {ui(L,
          '两臂在任务/部署/地图/规模/预算/对手阵营上对齐;两臂均携带后续对局与复盘所需的军表输入与规则审计哈希。列表质量与对局质量分离。',
          'Arms matched on mission/deployment/map/scale/budget/opponent; both carry the roster inputs and Rules audit hashes a later match and postgame review consume. List quality is separated from play quality.')}
      </Text>
    </View>
  );
}

// ── Candidates compare ─────────────────────────────────────────────────────
function CandidatesView({ L, session, catalogue }: any) {
  const selectedId = session.plan?.rosterCandidate?.candidateId;
  return (
    <View style={st.card} testID="session-candidates">
      <Text style={st.sectionTitle}>{ui(L, '候选比较(合法性由规则内核裁定)', 'Candidate compare (Rules kernel legality)')}</Text>
      {session.candidates.map((entry: any) => {
        const verdict = entry.verdictSummary;
        const selected = entry.candidate.candidateId === selectedId;
        const legal = entry.candidate.legalityStatus === 'legal';
        return (
          <View key={entry.candidate.candidateId}
            style={[st.candidateCard, selected && { borderColor: CYAN }]}
            testID={`candidate-${entry.candidate.candidateId}`}>
            <Text style={[st.cardName, { color: legal ? GREEN : RED }]}>
              {selected ? '★ ' : ''}{entry.candidate.candidateId}
              {' · '}{legal ? ui(L, '合法', 'LEGAL') : ui(L, '非法', 'ILLEGAL')}
            </Text>
            <Text style={st.cardSub}>
              {legal ? costText(verdict) : `${entry.candidate.legalityReceipt?.rulesErrorCode || '—'}`}
              {legal && verdict ? ` · ${entry.candidate.units.length} ${ui(L, '单位', 'units')}` : ''}
            </Text>
            {legal && verdict?.utilizationBasisPoints != null && (
              <Text style={[st.cardSub, {
                color: verdict.meetsFormalBudgetFloor ? GREEN : RED,
              }]}>
                {ui(L, '利用率', 'utilization')} {(verdict.utilizationBasisPoints / 100).toFixed(1)}%
                {verdict.meetsFormalBudgetFloor
                  ? (verdict.nearCap
                    ? ui(L, ' · ✓ 达标(贴近上限豁免)', ' · ✓ floor met (near-cap exemption)')
                    : ui(L, ' · ✓ 达标(预算合同)', ' · ✓ floor met (budget contract)'))
                  : ui(L, ' · ✗ 严重欠花费(低于合同下限)', ' · ✗ severe underspend (below contract floor)')}
                {verdict.vespeneWithinFormalCap === false
                  ? ui(L, ' · 瓦斯超上限', ' · vespene over cap') : ''}
              </Text>
            )}
            {!legal && !!entry.candidate.legalityReceipt?.rejectionKind && (
              <Text style={st.cardSub}>{ui(L, '驳回类别', 'rejection')}: {entry.candidate.legalityReceipt.rejectionKind}</Text>
            )}
            {entry.diffFromSelected && (
              <CandidateDiff L={L} diff={entry.diffFromSelected} catalogue={catalogue}
                session={session} candidate={entry.candidate} />
            )}
          </View>
        );
      })}
      {(session.rejections || []).length > 0 && (
        <Text style={st.cardSub}>
          {ui(L, '规则驳回记录', 'Rules rejections')}: {session.rejections.length}
        </Text>
      )}
      {session.comparison && (
        <Text style={st.hashLine}>
          {ui(L, '比较收据', 'comparison')}: {String(session.comparison.comparisonHash || '').slice(0, 20)}…
        </Text>
      )}
    </View>
  );
}

function CandidateDiff({ L, diff, session, candidate }: any) {
  const nameOf = (recordKey: string) => {
    const unit = session.candidates
      .flatMap((c: any) => c.candidate.units)
      .find((u: any) => u.recordKey === recordKey);
    return unit ? unit.recordKey.replace(/^unit_composition:/, '') : recordKey;
  };
  const parts: string[] = [];
  for (const entry of diff.unitsAdded || []) {
    parts.push(`+ ${nameOf(entry.unitKey.split('|')[0])} (${entry.unitKey.split('|')[1]})`);
  }
  for (const entry of diff.unitsRemoved || []) {
    parts.push(`− ${nameOf(entry.unitKey.split('|')[0])} (${entry.unitKey.split('|')[1]})`);
  }
  for (const entry of diff.unitsChanged || []) {
    parts.push(`± ${nameOf(entry.unitKey.split('|')[0])} ${ui(L, '升级不同', 'upgrades differ')}`);
  }
  for (const entry of diff.tacticalCardsAdded || []) {
    parts.push(`+${ui(L, '战术卡', 'tactical')} ${entry.recordKey.replace(/^tactical_cards:/, '')}${entry.count > 1 ? `×${entry.count}` : ''}`);
  }
  for (const entry of diff.tacticalCardsRemoved || []) {
    parts.push(`−${ui(L, '战术卡', 'tactical')} ${entry.recordKey.replace(/^tactical_cards:/, '')}${entry.count > 1 ? `×${entry.count}` : ''}`);
  }
  const selectedSummary = session.candidates.find((c: any) => c.candidate.candidateId === session.plan?.rosterCandidate?.candidateId)?.verdictSummary;
  const selfSummary = candidate ? session.candidates.find((c: any) => c.candidate.candidateId === candidate.candidateId)?.verdictSummary : null;
  return (
    <View style={{ marginTop: 4 }}>
      {parts.length === 0
        ? <Text style={st.cardSub}>{ui(L, '与选定候选组件相同', 'Same components as the selected candidate')}</Text>
        : parts.map((text, index) => <Text key={index} style={st.cardSub}>{text}</Text>)}
      {selectedSummary?.mineralSpent != null && selfSummary?.mineralSpent != null && (
        <Text style={st.cardSub}>
          {ui(L, '矿物差异', 'mineral delta')}: {selfSummary.mineralSpent - selectedSummary.mineralSpent}
        </Text>
      )}
    </View>
  );
}

// ── Working list editor (manual override via the authoritative Builder port)
function WorkingListEditor({ L, session, catalogue, act }: any) {
  const rosterPlanningClient = useMatchPlanningClient();
  const [showAdd, setShowAdd] = useState(false);
  const [menu, setMenu] = useState<any>(null);
  const working = session.working;
  const verdict = working.verdictSummary;
  const units = working.candidateInput.units || [];

  const loadMenu = async () => {
    const result = await rosterPlanningClient.enumeration({
      factionRecordKey: session.setup.factionRecordKey,
      scaleId: session.setup.engagementScale,
      mineralBudget: session.setup.mineralBudget,
    });
    setMenu(result.enumeration);
    setShowAdd(true);
  };

  const submitOverride = (candidateInput: any) => act(() => rosterPlanningClient.override(session.sessionId, candidateInput));

  return (
    <View style={st.card} testID="session-working-list">
      <Text style={st.sectionTitle}>
        {ui(L, '工作清单(手动调整 → 规则内核校验)', 'Working list (manual edits → Rules kernel verdict)')}
      </Text>
      <Text style={[st.cardName, { color: verdict?.status === 'legal' ? GREEN : RED }]}>
        {verdict?.status === 'legal'
          ? `${ui(L, '合法', 'LEGAL')} · ${costText(verdict)}`
          : `${ui(L, '非法/未知', 'ILLEGAL/UNKNOWN')} · ${verdict?.rulesErrorCode || verdict?.status || '—'}`}
      </Text>
      {verdict?.status === 'legal' && verdict?.utilizationBasisPoints != null && (
        <Text style={[st.cardSub, { color: verdict.meetsFormalBudgetFloor ? GREEN : RED }]}>
          {ui(L, '利用率', 'utilization')} {(verdict.utilizationBasisPoints / 100).toFixed(1)}%
          {verdict.meetsFormalBudgetFloor
            ? ui(L, ' · ✓ 预算合同达标', ' · ✓ budget contract met')
            : ui(L, ' · ✗ 严重欠花费(低于合同下限)', ' · ✗ severe underspend (below contract floor)')}
        </Text>
      )}
      {units.map((unit: any, index: number) => (
        <View key={`${unit.unitInstanceId}-${index}`} style={st.workingUnitRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.cardName}>{unit.unitInstanceId}</Text>
            <Text style={st.cardSub}>
              {unit.recordKey.replace(/^unit_composition:/, '')} · {unit.compositionKind}
              {(unit.upgrades || []).length > 0
                ? ` · +${unit.upgrades.map((u: any) => u.upgradeName || u.purchasableUpgradeProfileId).join(', ')}`
                : ''}
            </Text>
          </View>
          <Pressable onPress={() => {
            const next = { ...working.candidateInput, units: units.filter((_: any, i: number) => i !== index) };
            if (next.units.length === 0) return;
            submitOverride(next);
          }} style={({ pressed }) => [st.deleteBtn, pressed && { opacity: 0.7 }]}
            testID={`working-remove-${index}`}>
            <Text style={{ color: RED, fontWeight: '700' }}>✕</Text>
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => { if (showAdd) { setShowAdd(false); } else { void loadMenu().catch(() => {}); } }}
        style={({ pressed }) => [st.btn, { borderColor: CYAN, alignSelf: 'flex-start', marginTop: 6 }, pressed && { opacity: 0.7 }]}
        testID="working-add-unit">
        <Text style={[st.btnText, { color: CYAN }]}>{showAdd ? ui(L, '收起菜单', 'Hide menu') : ui(L, '从规则菜单添加单位', 'Add unit from Rules menu')}</Text>
      </Pressable>
      {showAdd && menu && (
        <MenuPicker L={L} menu={menu} working={working}
          onPick={(unit: any) => {
            const next = {
              ...working.candidateInput,
              units: [...units, unit],
            };
            setShowAdd(false);
            submitOverride(next);
          }}
          onPickTactical={(recordKey: string) => {
            const tactical = [...(working.candidateInput.tacticalCardRecordKeys || [])];
            const existing = tactical.indexOf(recordKey);
            if (existing >= 0) tactical.splice(existing, 1);
            else tactical.push(recordKey);
            submitOverride({ ...working.candidateInput, tacticalCardRecordKeys: tactical });
          }} />
      )}
    </View>
  );
}

function MenuPicker({ L, menu, working, onPick, onPickTactical }: any) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const usedTactical = working.candidateInput.tacticalCardRecordKeys || [];
  return (
    <View style={{ marginTop: 8 }} testID="working-menu-picker">
      <Text style={st.label}>{ui(L, '单位(规则菜单)', 'Units (Rules menu)')}</Text>
      {(menu.unitCandidates || []).slice(0, 40).map((unit: any) => (
        <View key={unit.recordKey} style={st.menuRow}>
          <Pressable onPress={() => setExpanded(expanded === unit.recordKey ? null : unit.recordKey)}
            style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}>
            <Text style={st.cardName}>{unit.unitName}</Text>
            <Text style={st.cardSub}>{unit.armySlotType} · {unit.compositionOptions.length} {ui(L, '种编成', 'compositions')}</Text>
          </Pressable>
          {(expanded === unit.recordKey) && (
            <View>
              {unit.compositionOptions.map((option: any) => (
                <Pressable key={option.compositionProfileId} onPress={() => onPick({
                  unitInstanceId: `manual-unit-${Date.now() % 100000}`,
                  recordKey: unit.recordKey,
                  compositionKind: option.compositionKind,
                  upgrades: [],
                })} style={({ pressed }) => [st.btn, { marginVertical: 2, borderColor: BLUE }, pressed && { opacity: 0.7 }]}
                  testID={`menu-add-${unit.unitId}-${option.compositionKind}`}>
                  <Text style={[st.btnText, { color: BLUE }]}>
                    {option.compositionKind} · {option.startingModels}{ui(L, ' 模型', ' models')} · {option.mineralCost}M
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}
      <Text style={st.label}>{ui(L, '战术卡', 'Tactical cards')}</Text>
      {(menu.tacticalCandidates || []).slice(0, 20).map((card: any) => (
        <Pressable key={card.recordKey} onPress={() => onPickTactical(card.recordKey)} style={({ pressed }) => [st.menuRow, pressed && { opacity: 0.7 }]}
          testID={`menu-tactical-${card.cardId}`}>
          <View style={{ flex: 1 }}>
            <Text style={st.cardName}>{card.cardName}</Text>
            <Text style={st.cardSub}>{card.vespeneGasCost} {ui(L, '瓦斯', 'vespene')}</Text>
          </View>
          <Text style={[st.btnText, { color: usedTactical.includes(card.recordKey) ? AMBER : GREEN }]}>
            {usedTactical.includes(card.recordKey) ? ui(L, '已选', 'selected') : '+'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  stateBox: { padding: 32, alignItems: 'center', gap: 10 },
  stateText: { color: '#e5e7eb', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  stateHint: { color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#e5e7eb' },
  headerSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: CYAN, marginBottom: 6, marginTop: 4 },
  label: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 8, marginBottom: 4 },
  hint: { fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 4, lineHeight: 16 },
  card: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', padding: 12, marginBottom: 8 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#e5e7eb' },
  cardSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 16 },
  bodyText: { fontSize: 12, color: '#cbd5e1', lineHeight: 18, marginTop: 2 },
  hashLine: { fontSize: 10, color: '#475569', marginTop: 4, fontFamily: 'monospace' as any },
  counterText: { fontSize: 11, color: '#fbbf24', marginTop: 1, lineHeight: 16 },
  emptyBox: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  unavailableBox: { backgroundColor: '#f59e0b15', borderWidth: 1, borderColor: AMBER, borderRadius: 8, padding: 12, marginBottom: 10 },
  errorBanner: { backgroundColor: '#ef444420', borderBottomWidth: 1, borderBottomColor: RED, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
  errorText: { color: RED, fontSize: 12, fontWeight: '700' },
  errorDetail: { color: '#fca5a5', fontSize: 11 },
  staleBanner: { backgroundColor: '#f59e0b15', borderWidth: 1, borderColor: AMBER, borderRadius: 8, padding: 12, marginBottom: 8 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', padding: 12, marginBottom: 6 },
  deleteBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  btn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  btnText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  primaryBtn: { backgroundColor: '#0c4a6e', borderWidth: 1, borderColor: CYAN, borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: CYAN, fontSize: 14, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  chipActive: { borderColor: CYAN, backgroundColor: '#22d3ee20' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: CYAN },
  budgetInput: { backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, color: '#e5e7eb', fontSize: 14, borderWidth: 1, borderColor: '#334155', width: 90, textAlign: 'center' },
  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  roundStatus: { fontSize: 16, fontWeight: '800', width: 20, textAlign: 'center' },
  candidateCard: { borderWidth: 1, borderColor: '#334155', borderRadius: 8, padding: 10, marginBottom: 6, backgroundColor: '#020617' },
  workingUnitRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingVertical: 6, gap: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingVertical: 6, gap: 8 },
  importInput: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, color: '#e5e7eb', fontSize: 12, borderWidth: 1, borderColor: '#334155', height: 140, textAlignVertical: 'top' },
  importInputSmall: { backgroundColor: '#1e293b', borderRadius: 8, padding: 10, color: '#e5e7eb', fontSize: 12, borderWidth: 1, borderColor: '#334155', height: 60, textAlignVertical: 'top' },
  exportBox: { maxHeight: 180, backgroundColor: '#020617', borderRadius: 8, borderWidth: 1, borderColor: '#334155', padding: 8, marginTop: 8 },
  exportText: { color: '#94a3b8', fontSize: 9, fontFamily: 'monospace' as any },
});
