import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useData } from '@/lib/data-context';
import { useI18n } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import { CharacterPersonaSettingsPanel } from '@/components/character/character-persona-settings-panel';
import { useLevel3ClientDomain } from '@/lib/level3/client-domain-provider';

export default function SettingsScreen() {
  const {
    dataVersion,
    dataClassification,
    units,
    migration,
    scanLegacyData,
    confirmLegacyMigration,
  } = useData();
  const { view, dispatch } = useLevel3ClientDomain();
  const { lang, setLang, t, unitTranslations, setUnitTranslations, resetUnitTranslations } = useI18n();
  const [showTransEditor, setShowTransEditor] = useState(false);
  const [editingTrans, setEditingTrans] = useState<Record<string, string>>({});
  const [migrationConfirmationScanHash, setMigrationConfirmationScanHash] =
    useState<string | null>(null);
  const zh = lang === 'zh';
  const source = view.sourceLocalization;
  const sourceStatus = view.sourceLocalizationStatus;

  const copy = useMemo(() => ({
    compatibilityTitle: zh ? '本机兼容迁移' : 'On-device compatibility migration',
    compatibilityNotice: zh
      ? '仅在你点击扫描后读取固定的旧键；确认后只导入净化摘要。旧字节不会修改或删除，也不会恢复成房间。'
      : 'Fixed legacy keys are read only after you request a scan. Confirmation imports sanitized summaries only; original bytes are never changed, deleted, or restored as a room.',
    classification: zh ? '分类' : 'Classification',
    legacyVersion: zh ? '官方单位版本' : 'Official units version',
    authority: zh ? '房间/规则权威' : 'Room / Rules authority',
    noAuthority: zh ? '否（来源元数据只读）' : 'No (source metadata is read-only)',
    sourceTitle: zh ? '官方资料接入' : 'Official source integration',
    sourceNotice: source
      ? zh
        ? '已校验服务端冻结来源投影。Command Center 官方玩法数据仍匹配 71/69/48，但官方 FAQ V1.0 尚未纳入冻结锁，不能称为完整最新规则语料。当前仅展示 hash、版本、覆盖率和审核状态，不下发正文、译文或图片。'
        : 'The server-generated frozen source projection is verified. Command Center gameplay still matches 71/69/48, but official FAQ V1.0 is not yet in the frozen lock, so this is not the complete latest rules corpus. Only hashes, versions, coverage, and review status are delivered—never text, translations, or images.'
      : zh
        ? '尚未取得可验证的来源投影。请显式刷新来源元数据；在成功前不声明版本、完整性或再分发状态。'
        : 'No verifiable source projection is loaded. Refresh source metadata explicitly; version, completeness, and redistribution status remain unverified until it succeeds.',
    historyTitle: zh ? '历史对战记录' : 'Historical match records',
    historyNotice: zh
      ? '旧对局只可净化成只读比分/回合摘要；玩家名、备注、battleTable、远端地址、side/revision 与邀请能力全部丢弃。'
      : 'Legacy matches can only become read-only score/round summaries. Names, notes, battleTable, remote origins, side/revision claims, and invite capabilities are discarded.',
    historyEmpty: zh ? '没有可展示的净化历史摘要。' : 'No sanitized historical summaries to display.',
    historyRecord: zh ? '旧对局只读摘要' : 'Read-only legacy match',
    localPrefsTitle: zh ? '本地可写范围' : 'Local writable scope',
    localPrefsNotice: zh
      ? '本地只保存显示偏好、未审核标签、工具历史、检疫草稿和 viewer 投影；权威对战只能经 Project D 房间服务写入。'
      : 'Local storage is limited to display preferences, unreviewed labels, tool history, quarantined drafts, and viewer projections. Authoritative play is written only through the Project D room service.',
    scan: zh ? '扫描旧数据' : 'Scan legacy data',
    scanAgain: zh ? '重新扫描' : 'Scan again',
    confirmImport: zh ? '确认净化导入' : 'Confirm sanitized import',
    executeImport: zh ? '执行净化导入' : 'Run sanitized import',
    refreshSource: zh ? '刷新来源元数据' : 'Refresh source metadata',
    present: zh ? '发现旧键' : 'Legacy keys found',
    eligible: zh ? '可净化导入' : 'Eligible for sanitizing',
    quarantined: zh ? '检疫项' : 'Quarantined',
    originalBytes: zh ? '旧字节' : 'Original bytes',
    preserved: zh ? '未修改' : 'Unchanged',
    unverified: zh ? '未验证' : 'Unverified',
  }), [source, zh]);

  const unitNamesList = useMemo(() => {
    const names = units.map((unit) => unit.name).sort();
    return [...new Set(names)];
  }, [units]);

  const openTransEditor = () => {
    const next: Record<string, string> = {};
    unitNamesList.forEach((name) => {
      next[name] = unitTranslations[name] || '';
    });
    setEditingTrans(next);
    setShowTransEditor(true);
  };

  const saveTranslations = () => {
    setUnitTranslations({ ...unitTranslations, ...editingTrans });
    setShowTransEditor(false);
    Alert.alert(t('save'), t('transSavedMsg'));
  };

  const handleResetTrans = () => {
    Alert.alert(t('resetDefaults'), t('resetConfirmMsg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('confirm'), onPress: () => resetUnitTranslations() },
    ]);
  };

  if (showTransEditor) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('unitTranslations')}</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.hint}>{t('unitTransHint')}</Text>
          {unitNamesList.map((name) => (
            <View key={name} style={styles.transRow}>
              <Text style={styles.transEnName}>{name}</Text>
              <TextInput
                accessibilityLabel={`${name} translation`}
                style={styles.transInput}
                value={editingTrans[name] || ''}
                onChangeText={(text) => setEditingTrans((previous) => ({ ...previous, [name]: text }))}
                placeholder={t('transPlaceholder')}
                placeholderTextColor="#475569"
                returnKeyType="done"
              />
            </View>
          ))}
          <View style={styles.transActions}>
            <Pressable onPress={() => setShowTransEditor(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleResetTrans} style={styles.cancelBtn}>
              <Text style={styles.resetBtnText}>{t('resetDefaults')}</Text>
            </Pressable>
            <Pressable onPress={saveTranslations} style={styles.confirmBtn}>
              <Text style={styles.confirmBtnText}>{t('save')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <CharacterPersonaSettingsPanel />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          <Text style={styles.hint}>{t('languageHint')}</Text>
          <View style={styles.langRow}>
            {(['zh', 'en'] as Language[]).map((language) => (
              <Pressable
                key={language}
                accessibilityRole="radio"
                accessibilityState={{ checked: lang === language }}
                onPress={() => setLang(language)}
                style={[styles.langBtn, lang === language && styles.langBtnActive]}
              >
                <Text style={[styles.langBtnText, lang === language && styles.langBtnTextActive]}>
                  {language === 'zh' ? '中文' : 'English'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {lang === 'zh' && units.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('unitTranslations')}</Text>
            <Text style={styles.hint}>{t('unitTransHint')}</Text>
            <Pressable onPress={openTransEditor} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>{t('editTranslations')}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.sourceTitle}</Text>
          <Text style={styles.noticeText}>{copy.sourceNotice}</Text>
          <View style={styles.infoGrid}>
            <InfoRow label="status" value={sourceStatus.status} />
            <InfoRow label={copy.classification} value={source ? dataClassification.classification : copy.unverified} />
            <InfoRow label={copy.legacyVersion} value={dataVersion > 0 ? `v${dataVersion}` : '—'} />
            <InfoRow label="cards / rules" value={source ? `v${source.source.dataVersions.cardsVersion} / v${source.source.dataVersions.rulesVersion}` : '—'} />
            <InfoRow label="records / fields" value={source ? `${source.coverage.records} / ${source.coverage.fields}` : '—'} />
            <InfoRow label="full latest corpus" value={source ? (source.freshness.completeLatestOfficialRulesCorpus ? 'yes' : 'no — FAQ V1.0 pending refresh/review') : copy.unverified} />
            <InfoRow label="snapshot" value={source?.source.sourceSnapshotHash || '—'} mono />
            <InfoRow label="official dataset" value={source?.source.officialDatasetHash || '—'} mono />
            <InfoRow label="localization" value={source?.source.localizationDatasetHash || '—'} mono />
            <InfoRow label="room pin" value={sourceStatus.roomBinding} />
            <InfoRow label="rights" value={source ? (source.rights.publicReleaseGatePassed ? 'released' : 'pending / metadata only') : copy.unverified} />
            <InfoRow label="legacy fallback" value={source ? (sourceStatus.legacyFallbackUsed ? 'invalid' : 'disabled') : copy.unverified} />
            <InfoRow label={copy.authority} value={copy.noAuthority} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch({ type: 'refresh_source_localization' })}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>{copy.refreshSource}</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.compatibilityTitle}</Text>
          <Text style={styles.warningText}>{copy.compatibilityNotice}</Text>
          <View style={styles.infoGrid}>
            <InfoRow label="stage" value={migration.phase} />
            <InfoRow label={copy.present} value={`${migration.scan?.presentCount ?? 0}`} />
            <InfoRow label={copy.eligible} value={`${migration.scan?.eligibleCount ?? 0}`} />
            <InfoRow label={copy.quarantined} value={`${migration.scan?.quarantinedCount ?? 0}`} />
            <InfoRow label={copy.originalBytes} value={copy.preserved} />
            {migration.manifest && (
              <>
                <InfoRow label="army draft quarantine" value={`${migration.manifest.counts.armyDraftsQuarantined}`} />
                <InfoRow label="read-only history" value={`${migration.manifest.counts.historyRecordsImportedReadOnly}`} />
                <InfoRow label="manifest" value={migration.manifest.manifestHash} mono />
              </>
            )}
            {migration.errorCode && <InfoRow label="error" value={migration.errorCode} />}
          </View>
          {migration.scan?.entries.map((entry) => (
            <View key={entry.policyName} style={styles.migrationEntry}>
              <Text style={styles.migrationEntryTitle}>{entry.policyName}</Text>
              <Text style={styles.migrationEntryDetail}>
                {entry.disposition} · {entry.itemCount ?? '—'} item(s) · {entry.byteLength} B
                {entry.reason ? ` · ${entry.reason}` : ''}
              </Text>
            </View>
          ))}
          {migration.manifest && (migration.history?.records.length ? (
            migration.history.records.map((record, index) => (
              <View key={record.summaryHash} style={styles.migrationEntry}>
                <Text style={styles.migrationEntryTitle}>
                  {copy.historyRecord} {index + 1}
                </Text>
                <Text style={styles.migrationEntryDetail}>
                  {record.occurredAtMs > 0
                    ? new Date(record.occurredAtMs).toISOString().slice(0, 10)
                    : '—'}
                  {' · '}{record.player1TotalScore}–{record.player2TotalScore}
                  {' · '}{record.roundCount} round(s) · {record.winnerClass}
                </Text>
                <Text style={styles.migrationEntryDetail}>
                  read-only · room restore false · replay false · MuZero false
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.hint}>{copy.historyEmpty}</Text>
          ))}
          <View style={styles.actionStack}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMigrationConfirmationScanHash(null);
                void scanLegacyData();
              }}
              disabled={migration.phase === 'scanning' || migration.phase === 'importing' || Boolean(migration.manifest)}
              style={[
                styles.secondaryBtn,
                (migration.phase === 'scanning' || migration.phase === 'importing' || Boolean(migration.manifest))
                  && styles.disabledBtn,
              ]}
            >
              <Text style={styles.secondaryBtnText}>
                {migration.scan ? copy.scanAgain : copy.scan}
              </Text>
            </Pressable>
            {migration.scan && !migration.manifest && (
              <Pressable
                accessibilityRole="button"
                disabled={!source || migration.phase !== 'classified'}
                onPress={() => {
                  setMigrationConfirmationScanHash(migration.scan?.scanHash || null);
                }}
                style={[styles.confirmBtn, (!source || migration.phase !== 'classified') && styles.disabledBtn]}
              >
                <Text style={styles.confirmBtnText}>{copy.confirmImport}</Text>
              </Pressable>
            )}
          </View>
          {migrationConfirmationScanHash && migration.scan && !migration.manifest && (
            <View accessibilityRole="alert" style={styles.confirmationPanel}>
              <Text style={styles.warningText}>
                {zh
                  ? '仅发布一个净化后的、内容寻址的兼容世代；旧键和新版偏好/骰子保持原样，检疫军表不能用于房间。'
                  : 'This publishes one sanitized, content-addressed compatibility generation. Legacy keys and current preferences/dice remain unchanged; quarantined drafts cannot seed rooms.'}
              </Text>
              <View style={styles.transActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setMigrationConfirmationScanHash(null)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={migration.phase !== 'classified'
                    || migration.scan.scanHash !== migrationConfirmationScanHash}
                  onPress={() => {
                    const expectedScanHash = migrationConfirmationScanHash;
                    setMigrationConfirmationScanHash(null);
                    void confirmLegacyMigration(expectedScanHash);
                  }}
                  style={[
                    styles.confirmBtn,
                    (migration.phase !== 'classified'
                      || migration.scan.scanHash !== migrationConfirmationScanHash)
                      && styles.disabledBtn,
                  ]}
                >
                  <Text style={styles.confirmBtnText}>{copy.executeImport}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        <NoticeSection title={copy.historyTitle} body={copy.historyNotice} />
        <NoticeSection title={copy.localPrefsTitle} body={copy.localPrefsNotice} />
      </ScrollView>
    </ScreenContainer>
  );
}

function NoticeSection({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.noticeText}>{body}</Text>
    </View>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={[styles.infoValue, mono && styles.monoValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#e5e7eb' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  section: { marginBottom: 20, backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  hint: { fontSize: 12, color: '#94a3b8', lineHeight: 20, marginBottom: 12 },
  noticeText: { fontSize: 13, color: '#cbd5e1', lineHeight: 21 },
  warningText: { fontSize: 13, color: '#fbbf24', lineHeight: 21, marginBottom: 12 },
  infoGrid: { gap: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  infoLabel: { flex: 1, fontSize: 13, color: '#94a3b8' },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '700', color: '#e5e7eb', textAlign: 'right' },
  monoValue: { fontFamily: 'monospace', fontSize: 10 },
  actionStack: { gap: 10, marginTop: 14 },
  migrationEntry: { marginTop: 8, padding: 10, borderRadius: 8, backgroundColor: '#111827' },
  migrationEntryTitle: { fontSize: 12, fontWeight: '700', color: '#cbd5e1' },
  migrationEntryDetail: { marginTop: 4, fontSize: 11, lineHeight: 17, color: '#94a3b8' },
  confirmationPanel: { marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#f59e0b', borderRadius: 8, backgroundColor: '#1c1917' },
  disabledBtn: { opacity: 0.45 },
  secondaryBtn: { minHeight: 44, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center', backgroundColor: '#1e293b' },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: '#cbd5e1' },
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: { flex: 1, minHeight: 44, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center', backgroundColor: '#1e293b' },
  langBtnActive: { borderColor: '#38bdf8', backgroundColor: '#0c4a6e' },
  langBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  langBtnTextActive: { color: '#e0f2fe' },
  transRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b', gap: 12 },
  transEnName: { fontSize: 13, fontWeight: '600', color: '#e5e7eb', width: 140 },
  transInput: { flex: 1, minHeight: 44, backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: '#334155' },
  transActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, minHeight: 44, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  resetBtnText: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  confirmBtn: { flex: 1, minHeight: 44, justifyContent: 'center', borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center' },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#020617' },
});
