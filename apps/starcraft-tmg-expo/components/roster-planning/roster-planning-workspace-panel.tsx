// Ticket 27 / Slice 271 — roster-planning workspace panel (Web/App).
// Chinese-first bilingual UI over the isolated roster-planning workspace API.
// Renders real Strategist/Builder/laboratory evidence only: plan sections,
// candidate legality verdicts and diffs, tool receipts, provenance and
// redacted usage all come from server projections. Empty, disconnected,
// unavailable, running, failed and stale states are explicit. The manual
// army builder is untouched; this panel is an additive workspace view.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useI18n } from '@/lib/i18n';
import {
  rosterPlanningClient,
  RosterPlanningClientError,
} from '@/lib/roster-planning/roster-planning-client-v1';

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
  candidate_proposals: { zh: '候选方案', en: 'Candidate proposals' },
  comparison_selection: { zh: '比较选定', en: 'Comparison & selection' },
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
  const { lang } = useI18n();
  const L = lang as Lang;
  const [connection, setConnection] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [catalogue, setCatalogue] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [planningBusy, setPlanningBusy] = useState(false);
  const [deliberation, setDeliberation] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<{ code: string; detail?: string } | null>(null);
  const [view, setView] = useState<'sessions' | 'setup' | 'session'>('sessions');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const list = await rosterPlanningClient.listSessions();
    setSessions(list.sessions || []);
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

  // Poll while the session is running (asynchronous planning progress).
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (session?.status === 'running') {
      pollRef.current = setInterval(async () => {
        try {
          const result = await rosterPlanningClient.readSession(session.sessionId);
          setSession(result.session);
          if (result.session.status !== 'running' && pollRef.current) {
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
  }, [session?.sessionId, session?.status, refreshSessions]);

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
          <Pressable onPress={() => { setView('sessions'); setSession(null); void refreshSessions(); }}
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
          deliberation={deliberation}
          onNew={() => setView('setup')}
          onOpen={openSession}
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
          onCancel={() => setView('sessions')}
          onCreated={(created: any) => { setSession(created); setView('session'); }}
          onError={applyError} />
      )}
      {view === 'session' && session && (
        <SessionView L={L} session={session} catalogue={catalogue}
          deliberation={deliberation}
          onSession={setSession} onError={applyError}
          onRefreshSessions={refreshSessions} />
      )}
    </View>
  );
}

// ── Sessions list ──────────────────────────────────────────────────────────
function SessionsView({ L, catalogue, sessions, deliberation, onNew, onOpen, onDelete, onImport }: any) {
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
      {sessions.length === 0 ? (
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
function SetupView({ L, catalogue, deliberation, onCancel, onCreated, onError }: any) {
  const defaults = catalogue.defaults;
  const [own, setOwn] = useState(defaults.factionRecordKey);
  const [opponent, setOpponent] = useState(defaults.opponentFactionRecordKey);
  const [boundary, setBoundary] = useState(defaults.opponentInformationBoundary);
  const [budgetText, setBudgetText] = useState(String(defaults.mineralBudget));
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
                : ui(L, '未知军表', 'Unknown roster')}
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
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <Pressable onPress={onCancel} style={({ pressed }) => [st.btn, pressed && { opacity: 0.7 }]}>
          <Text style={st.btnText}>{ui(L, '取消', 'Cancel')}</Text>
        </Pressable>
        <Pressable
          disabled={!routeAvailable || !Number.isSafeInteger(budget) || budget < 1 || busy}
          onPress={async () => {
            setBusy(true);
            try {
              const result = await rosterPlanningClient.createSession({
                factionRecordKey: own,
                opponentFactionRecordKey: opponent,
                engagementScale: 'Standard',
                mineralBudget: budget,
                opponentInformationBoundary: boundary,
              });
              onCreated(result.session);
            } catch (e) {
              onError(e);
            } finally {
              setBusy(false);
            }
          }}
          style={({ pressed }) => [st.primaryBtn, { flex: 1, marginTop: 0 },
            (!routeAvailable || busy) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
          testID="setup-create-session">
          <Text style={st.primaryBtnText}>{ui(L, '创建会话', 'Create session')}</Text>
        </Pressable>
      </View>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ── Session view ───────────────────────────────────────────────────────────
function SessionView({ L, session, catalogue, deliberation, onSession, onError, onRefreshSessions }: any) {
  const [exportText, setExportText] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [revisionSections, setRevisionSections] = useState<string[]>(['scoreRoute', 'deploymentConcept']);
  const [showRevise, setShowRevise] = useState(false);
  const running = session.status === 'running';
  const plan = session.plan;

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
            <Pressable onPress={() => act(() => rosterPlanningClient.cancel(session.sessionId))}
              style={({ pressed }) => [st.btn, { borderColor: RED, alignSelf: 'flex-start', marginTop: 6 }, pressed && { opacity: 0.7 }]}
              testID="session-cancel">
              <Text style={[st.btnText, { color: RED }]}>{ui(L, '取消规划', 'Cancel planning')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Generate / resume controls */}
      {!running && !plan && (
        <View style={{ gap: 8 }} >
          <Pressable
            onPress={() => act(() => rosterPlanningClient.generate(session.sessionId))}
            style={({ pressed }) => [st.primaryBtn, !deliberation?.available && { opacity: 0.4 },
              pressed && { opacity: 0.7 }]}
            testID="session-generate">
            <Text style={st.primaryBtnText}>
              {ui(L, '生成规划(真实付费 Flash 调用)', 'Generate plan (real paid Flash calls)')}
            </Text>
          </Pressable>
          {session.resumeAvailable && (
            <Pressable
              onPress={() => act(() => rosterPlanningClient.resumeReplay(session.sessionId))}
              style={({ pressed }) => [st.btn, { borderColor: BLUE }, pressed && { opacity: 0.7 }]}
              testID="session-resume-replay">
              <Text style={[st.btnText, { color: BLUE }]}>
                {ui(L, `本地回放恢复(${session.retainedReplyCount} 条已保留回复 · 0 新调用)`,
                  `Resume from ${session.retainedReplyCount} retained replies · 0 new calls`)}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Plan */}
      {plan && <PlanView L={L} session={session} catalogue={catalogue} />}

      {/* Candidates compare */}
      {session.candidates.length > 0 && (
        <CandidatesView L={L} session={session} catalogue={catalogue} />
      )}

      {/* Working list / manual override */}
      {session.working && plan && (
        <WorkingListEditor L={L} session={session} catalogue={catalogue}
          onSession={onSession} onError={onError} act={act} />
      )}

      {/* Stale banner + revision */}
      {session.planEvidenceStale && plan && !running && (
        <View style={st.staleBanner} testID="session-stale-banner">
          <Text style={[st.cardName, { color: AMBER }]}>
            {ui(L, '手动修改后计划证据已过期', 'Plan evidence is stale after manual edits')}
          </Text>
          <Text style={st.hint}>
            {ui(L, '工作清单已不同于计划选定候选;显式修订前,得分路线/反制等证据不再对应当前清单。',
              'The working list differs from the plan candidate; score route/counters no longer match until an explicit revision.')}
          </Text>
          <Pressable onPress={() => setShowRevise(!showRevise)}
            style={({ pressed }) => [st.btn, { borderColor: AMBER, alignSelf: 'flex-start', marginTop: 6 }, pressed && { opacity: 0.7 }]}
            testID="session-show-revise">
            <Text style={[st.btnText, { color: AMBER }]}>
              {ui(L, '请求修订(1 次付费调用)', 'Request revision (1 paid call)')}
            </Text>
          </Pressable>
        </View>
      )}
      {showRevise && !running && (
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
              ['deploymentConcept', ui(L, '部署构想', 'Deployment concept')],
              ['publicSummaryText', ui(L, '公开摘要', 'Public summary')],
            ].map(([key, label]) => (
              <Pressable key={key} onPress={() => {
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
                revisedSectionKeys: revisionSections,
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
