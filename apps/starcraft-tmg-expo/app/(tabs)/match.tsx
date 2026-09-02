import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useI18n } from '@/lib/i18n';
import { useLevel3ClientDomain } from '@/lib/level3/client-domain-provider';

const STATUS_COLOR: Record<string, string> = {
  room_required: '#94a3b8',
  connecting: '#38bdf8',
  connected: '#22c55e',
  applying: '#f59e0b',
  recovering: '#f59e0b',
  offline_read_only: '#fbbf24',
  blocked: '#ef4444',
  unavailable: '#ef4444',
};

export default function MatchScreen() {
  const { lang } = useI18n();
  const { view, connection, refresh } = useLevel3ClientDomain();
  const [refreshing, setRefreshing] = useState(false);
  const zh = lang === 'zh';
  const statusColor = STATUS_COLOR[connection.status] || '#94a3b8';
  const canRefresh = Boolean(connection.roomId && connection.online && connection.visible && !refreshing);

  const statusLabel = useMemo(() => {
    const labels: Record<string, [string, string]> = {
      room_required: ['等待房间', 'Room required'],
      connecting: ['正在连接', 'Connecting'],
      connected: ['已连接权威房间', 'Authoritative room connected'],
      applying: ['正在提交确认动作', 'Applying confirmed action'],
      recovering: ['正在恢复权威状态', 'Recovering authoritative state'],
      offline_read_only: ['离线只读', 'Offline read-only'],
      blocked: ['连接被拒绝', 'Connection blocked'],
      unavailable: ['暂时不可用', 'Temporarily unavailable'],
    };
    return labels[connection.status]?.[zh ? 0 : 1] || connection.status;
  }, [connection.status, zh]);

  const handleRefresh = async () => {
    if (!canRefresh) return;
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const roomRevision = connection.stateRevision === null ? '—' : `${connection.stateRevision}`;
  const recoverySource = String(view.recovery?.source || 'none');
  const cacheStatus = String(view.recovery?.cacheStatus || 'not_checked');

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{zh ? '对战房间' : 'Battle Room'}</Text>
          <Text style={styles.headerSub}>Project D Level-3 · Ticket 14 / Slice 130</Text>
        </View>
        <View style={[styles.statusPill, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View accessibilityRole="summary" accessibilityLiveRegion="polite" style={styles.heroCard}>
          <Text style={styles.eyebrow}>{zh ? '共享客户端域' : 'SHARED CLIENT DOMAIN'}</Text>
          <Text style={styles.heroTitle}>
            {connection.roomId
              ? (zh ? '当前视图来自房间服务' : 'Current view comes from the room service')
              : (zh ? '通过邀请或深链进入房间' : 'Enter through an invite or deep link')}
          </Text>
          <Text style={styles.heroBody}>
            {connection.roomId
              ? (zh
                ? '本页只投影服务器状态。规则判断、随机结果、席位能力和对战写入都不在本地执行。'
                : 'This page projects server state only. Rules, randomness, seat capabilities, and match writes do not execute locally.')
              : (zh
                ? '房间定位、SeatGrant 与恢复流程将在 Slice 131 挂载；本页不会创建本地对局或把旧记录当成房间。'
                : 'Room locator, SeatGrant, and recovery mount in Slice 131. This page never creates a local match or treats legacy records as a room.')}
          </Text>

          {connection.roomId && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canRefresh }}
              disabled={!canRefresh}
              onPress={handleRefresh}
              style={[styles.primaryButton, !canRefresh && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {refreshing
                  ? (zh ? '刷新中…' : 'Refreshing…')
                  : (zh ? '从权威房间刷新' : 'Refresh from authority')}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.grid}>
          <InfoCard
            title={zh ? '连接' : 'Connection'}
            rows={[
              [zh ? '状态' : 'Status', statusLabel],
              ['Room ID', connection.roomId || '—'],
              [zh ? '状态修订' : 'State revision', roomRevision],
              [zh ? '网络' : 'Network', connection.online ? (zh ? '在线' : 'Online') : (zh ? '离线' : 'Offline')],
              [zh ? '可见性' : 'Visibility', connection.visible ? (zh ? '前台' : 'Foreground') : (zh ? '后台' : 'Background')],
            ]}
          />
          <InfoCard
            title={zh ? '恢复' : 'Recovery'}
            rows={[
              [zh ? '缓存状态' : 'Cache status', cacheStatus],
              [zh ? '投影来源' : 'Projection source', recoverySource],
              [zh ? '只读' : 'Read-only', connection.readOnly ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No')],
              [zh ? '结果不确定' : 'Outcome uncertain', connection.outcomeUncertain ? (zh ? '是' : 'Yes') : (zh ? '否' : 'No')],
              [zh ? '拒绝代码' : 'Rejection code', connection.rejectionCode || '—'],
            ]}
          />
        </View>

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryTitle}>{zh ? '客户端权威边界' : 'Client authority boundary'}</Text>
          <BoundaryRow
            label={zh ? '房间状态' : 'Room state'}
            value={zh ? '服务器权威；本地仅缓存观察者投影' : 'Server authority; local viewer projection cache only'}
          />
          <BoundaryRow
            label={zh ? '动作流程' : 'Action flow'}
            value="LegalSpace → Preview → human confirmation → Apply → Receipt → Replay"
          />
          <BoundaryRow
            label={zh ? '离线行为' : 'Offline behavior'}
            value={zh ? '只读；不会排队或伪造权威写入' : 'Read-only; no queued or fabricated authoritative writes'}
          />
          <BoundaryRow
            label={zh ? '训练真值' : 'Training truth'}
            value="false"
          />
        </View>

        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>{zh ? '可观测客户端视图' : 'Observable client view'}</Text>
          <Text selectable style={styles.mono}>phase: {view.phase}</Text>
          <Text selectable style={styles.mono}>surface: {view.surface || '—'}</Text>
          <Text selectable style={styles.mono}>clientRevision: {view.clientRevision}</Text>
          <Text selectable style={styles.mono}>viewHash: {view.viewHash}</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text selectable style={styles.infoValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function BoundaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.boundaryRow}>
      <Text style={styles.boundaryLabel}>{label}</Text>
      <Text style={styles.boundaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#e5e7eb' },
  headerSub: { marginTop: 3, fontSize: 11, color: '#64748b' },
  statusPill: { maxWidth: '48%', minHeight: 32, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  statusPillText: { flexShrink: 1, fontSize: 11, fontWeight: '800' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 6, paddingBottom: 48, gap: 14 },
  heroCard: { borderRadius: 16, padding: 20, backgroundColor: '#0c1e33', borderWidth: 1, borderColor: '#0ea5e9' },
  eyebrow: { color: '#38bdf8', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: '#f8fafc', fontSize: 21, fontWeight: '800', lineHeight: 29, marginTop: 8 },
  heroBody: { color: '#cbd5e1', fontSize: 13, lineHeight: 21, marginTop: 9 },
  primaryButton: { minHeight: 44, marginTop: 16, borderRadius: 9, justifyContent: 'center', alignItems: 'center', backgroundColor: '#38bdf8' },
  buttonDisabled: { opacity: 0.45 },
  primaryButtonText: { color: '#020617', fontSize: 13, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  infoCard: { flexGrow: 1, flexBasis: 280, borderRadius: 12, padding: 16, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  cardTitle: { color: '#38bdf8', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  infoRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  infoLabel: { flex: 1, color: '#94a3b8', fontSize: 12 },
  infoValue: { flex: 1, color: '#e2e8f0', fontSize: 12, fontWeight: '700', textAlign: 'right' },
  boundaryCard: { borderRadius: 12, padding: 16, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155' },
  boundaryTitle: { color: '#fbbf24', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  boundaryRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  boundaryLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800', marginBottom: 4 },
  boundaryValue: { color: '#e2e8f0', fontSize: 12, lineHeight: 19 },
  debugCard: { borderRadius: 12, padding: 16, backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b' },
  debugTitle: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  mono: { color: '#94a3b8', fontSize: 11, lineHeight: 18, fontFamily: 'monospace' },
});
