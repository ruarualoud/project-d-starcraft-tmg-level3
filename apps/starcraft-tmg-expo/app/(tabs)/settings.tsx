import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useData } from '@/lib/data-context';
import { useI18n } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import { CharacterPersonaSettingsPanel } from '@/components/character/character-persona-settings-panel';

export default function SettingsScreen() {
  const { dataVersion, dataClassification, units, cards, gameCards, armyLists } = useData();
  const { lang, setLang, t, unitTranslations, setUnitTranslations, resetUnitTranslations } = useI18n();
  const [showTransEditor, setShowTransEditor] = useState(false);
  const [editingTrans, setEditingTrans] = useState<Record<string, string>>({});
  const zh = lang === 'zh';

  const copy = useMemo(() => ({
    compatibilityTitle: zh ? '兼容资料状态' : 'Compatibility data status',
    compatibilityNotice: zh
      ? '这些内置资料来自冻结的旧版产品，仅用于浏览和本地编军草稿。它不是官方最新数据、规则真值或房间状态来源。'
      : 'This frozen legacy bundle is for browsing and local army drafts only. It is not current official data, Rules truth, or room state.',
    classification: zh ? '分类' : 'Classification',
    legacyVersion: zh ? '旧版包版本' : 'Legacy package version',
    unitCount: zh ? '单位' : 'Units',
    cardCount: zh ? '卡牌' : 'Cards',
    gameCardCount: zh ? '任务与部署' : 'Missions & deployments',
    armyDrafts: zh ? '本地编军草稿' : 'Local army drafts',
    authority: zh ? '房间/规则权威' : 'Room / Rules authority',
    noAuthority: zh ? '否（只读兼容资料）' : 'No (display-only compatibility)',
    sourceTitle: zh ? '官方资料接入' : 'Official source integration',
    sourceNotice: zh
      ? '直接 Firebase 同步和任意 JSON 导入已从产品路径移除。Slice 134 将接入经过来源、版本和翻译溯源验证的官方投影。'
      : 'Direct Firebase sync and arbitrary JSON import have been removed from the product path. Slice 134 will mount provenance- and version-verified official projections.',
    historyTitle: zh ? '历史对战记录' : 'Historical match records',
    historyNotice: zh
      ? '旧版 AsyncStorage 对战记录保持原样但已隔离：当前客户端不会读取、写入或删除它们。Slice 134 将提供显式迁移/检疫流程。'
      : 'Legacy AsyncStorage match records remain untouched but quarantined: this client does not read, write, or delete them. Slice 134 will provide explicit migration and quarantine.',
    localPrefsTitle: zh ? '本地可写范围' : 'Local writable scope',
    localPrefsNotice: zh
      ? '本地存储仅保留显示偏好、翻译修正、工具历史和编军草稿；权威对战只能经 Project D 房间服务写入。'
      : 'Local storage is limited to display preferences, translation corrections, tool history, and army drafts. Authoritative play is written only through the Project D room service.',
  }), [zh]);

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

        {lang === 'zh' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('unitTranslations')}</Text>
            <Text style={styles.hint}>{t('unitTransHint')}</Text>
            <Pressable onPress={openTransEditor} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>{t('editTranslations')}</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{copy.compatibilityTitle}</Text>
          <Text style={styles.warningText}>{copy.compatibilityNotice}</Text>
          <View style={styles.infoGrid}>
            <InfoRow label={copy.classification} value={dataClassification.classification} />
            <InfoRow label={copy.legacyVersion} value={dataVersion > 0 ? `v${dataVersion}` : '—'} />
            <InfoRow label={copy.unitCount} value={`${units.length}`} />
            <InfoRow label={copy.cardCount} value={`${cards.length}`} />
            <InfoRow label={copy.gameCardCount} value={`${gameCards.length}`} />
            <InfoRow label={copy.armyDrafts} value={`${armyLists.length}`} />
            <InfoRow label={copy.authority} value={copy.noAuthority} />
          </View>
        </View>

        <NoticeSection title={copy.sourceTitle} body={copy.sourceNotice} />
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
