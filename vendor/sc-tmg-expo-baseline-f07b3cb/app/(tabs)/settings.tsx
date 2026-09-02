import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Alert, StyleSheet, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useData } from '@/lib/data-context';
import type { DataPackage } from '@/lib/types';
import { RULES_VERSION } from '@/lib/combat-rules';
import { useI18n } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

export default function SettingsScreen() {
  const { dataVersion, isSyncing, syncError, syncFromServer, importPackage, units, cards, gameCards } = useData();
  const { lang, setLang, t, unitTranslations, setUnitTranslations, resetUnitTranslations } = useI18n();
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showTransEditor, setShowTransEditor] = useState(false);
  const [editingTrans, setEditingTrans] = useState<Record<string, string>>({});

  const handleSync = async () => {
    try {
      await syncFromServer();
      Alert.alert(t('syncSuccess'), t('syncSuccessMsg'));
    } catch (e: any) {
      Alert.alert(t('syncFail'), e.message || t('syncFailMsg'));
    }
  };

  const handleImportPackage = () => {
    try {
      let pkg: DataPackage;
      const raw = JSON.parse(importJson);
      if (raw.data && raw.data.units) {
        pkg = {
          version: Date.now(),
          exportedAt: Date.now(),
          units: raw.data.units || [],
          cards: [...(raw.data.factionCards || []), ...(raw.data.tacticCards || [])],
          gameCards: raw.data.upgradeCards || [],
        };
      } else if (raw.units) {
        pkg = raw as DataPackage;
      } else {
        Alert.alert(t('formatError'), t('formatErrorMsg'));
        return;
      }
      if (!pkg.units || pkg.units.length === 0) {
        Alert.alert(t('emptyData'), t('emptyDataMsg'));
        return;
      }
      importPackage(pkg);
      setImportJson('');
      setShowImport(false);
      Alert.alert(t('importSuccess'), `${pkg.units.length} units, ${pkg.cards.length} cards`);
    } catch (e) {
      Alert.alert(t('parseError'), t('parseErrorMsg'));
    }
  };

  // Build translation list from loaded units
  const unitNamesList = useMemo(() => {
    const names = units.map(u => u.name).sort();
    return [...new Set(names)];
  }, [units]);

  const openTransEditor = () => {
    // Initialize editing state from current translations
    const trans: Record<string, string> = {};
    unitNamesList.forEach(name => {
      trans[name] = unitTranslations[name] || '';
    });
    setEditingTrans(trans);
    setShowTransEditor(true);
  };

  const saveTranslations = () => {
    // Merge with existing translations (keep entries for units not currently loaded)
    const merged = { ...unitTranslations, ...editingTrans };
    setUnitTranslations(merged);
    setShowTransEditor(false);
    Alert.alert(t('save'), t('transSavedMsg'));
  };

  const handleResetTrans = () => {
    Alert.alert(
      t('resetDefaults'),
      t('resetConfirmMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('confirm'), onPress: () => resetUnitTranslations() },
      ]
    );
  };

  // Translation editor view
  if (showTransEditor) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={st.header}>
          <Text style={st.headerTitle}>{t('unitTranslations')}</Text>
        </View>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={st.hint}>{t('unitTransHint')}</Text>
          {unitNamesList.map(name => (
            <View key={name} style={st.transRow}>
              <Text style={st.transEnName}>{name}</Text>
              <TextInput
                style={st.transInput}
                value={editingTrans[name] || ''}
                onChangeText={(text) => setEditingTrans(prev => ({ ...prev, [name]: text }))}
                placeholder={t('transPlaceholder')}
                placeholderTextColor="#475569"
                returnKeyType="done"
              />
            </View>
          ))}
          <View style={st.transActions}>
            <Pressable
              onPress={() => setShowTransEditor(false)}
              style={({ pressed }) => [st.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={st.cancelBtnText}>{t('cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleResetTrans}
              style={({ pressed }) => [st.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={[st.cancelBtnText, { color: '#f59e0b' }]}>{t('resetDefaults')}</Text>
            </Pressable>
            <Pressable
              onPress={saveTranslations}
              style={({ pressed }) => [st.confirmBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={st.confirmBtnText}>{t('save')}</Text>
            </Pressable>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={st.header}>
        <Text style={st.headerTitle}>{t('settings')}</Text>
      </View>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Language */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>{t('language')}</Text>
          <Text style={st.hint}>{t('languageHint')}</Text>
          <View style={st.langRow}>
            {(['zh', 'en'] as Language[]).map(l => (
              <Pressable
                key={l}
                onPress={() => setLang(l)}
                style={({ pressed }) => [
                  st.langBtn,
                  lang === l && st.langBtnActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[st.langBtnText, lang === l && st.langBtnTextActive]}>
                  {l === 'zh' ? '中文' : 'English'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Unit Translations (only show in Chinese mode) */}
        {lang === 'zh' && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>{t('unitTranslations')}</Text>
            <Text style={st.hint}>{t('unitTransHint')}</Text>
            <Pressable
              onPress={openTransEditor}
              style={({ pressed }) => [st.secondaryBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={st.secondaryBtnText}>{t('editTranslations')}</Text>
            </Pressable>
          </View>
        )}

        {/* Data Status */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>{t('dataStatus')}</Text>
          <View style={st.infoGrid}>
            <InfoRow label={t('dataVersion')} value={dataVersion > 0 ? `v${dataVersion}` : t('notSynced')} />
            <InfoRow label={t('unitCount')} value={`${units.length}`} />
            <InfoRow label={t('cardCount')} value={`${cards.length}`} />
            <InfoRow label={t('missionCount')} value={`${gameCards.filter(c => c.type === 'mission' || c.type === 'community_mission').length}`} />
            <InfoRow label={t('deploymentCount')} value={`${gameCards.filter(c => c.type === 'deployment' || c.type === 'community_deployment').length}`} />
          </View>
        </View>

        {/* Online Sync */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>{t('onlineSync')}</Text>
          <Text style={st.hint}>{t('syncHint')}</Text>
          <Pressable
            onPress={handleSync}
            disabled={isSyncing}
            style={({ pressed }) => [st.primaryBtn, isSyncing && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <Text style={st.primaryBtnText}>{isSyncing ? t('syncing') : t('syncData')}</Text>
          </Pressable>
          {syncError && <Text style={st.errorText}>{syncError}</Text>}
        </View>

        {/* Offline Import */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>{t('offlineImport')}</Text>
          <Text style={st.hint}>{t('offlineHint')}{'\n\n'}{'  '}node tools/export-data-pack.js</Text>
          {!showImport ? (
            <Pressable
              onPress={() => setShowImport(true)}
              style={({ pressed }) => [st.secondaryBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={st.secondaryBtnText}>{t('pasteImport')}</Text>
            </Pressable>
          ) : (
            <View>
              <TextInput
                style={st.jsonInput}
                multiline
                value={importJson}
                onChangeText={setImportJson}
                placeholder={lang === 'zh' ? '粘贴PC工具导出的JSON数据...' : 'Paste exported JSON data...'}
                placeholderTextColor="#64748b"
                returnKeyType="done"
              />
              <View style={st.importActions}>
                <Pressable
                  onPress={() => { setShowImport(false); setImportJson(''); }}
                  style={({ pressed }) => [st.cancelBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={st.cancelBtnText}>{t('cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleImportPackage}
                  style={({ pressed }) => [st.confirmBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={st.confirmBtnText}>{t('import')}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Combat Rules Info */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>{t('combatRules')}</Text>
          <View style={st.infoGrid}>
            <InfoRow label={t('rulesVersion')} value={RULES_VERSION.version} />
            <InfoRow label={t('rulesUpdated')} value={RULES_VERSION.lastUpdated} />
            <InfoRow label={t('rulesSource')} value={RULES_VERSION.source} />
          </View>
        </View>

        {/* About */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>{t('about')}</Text>
          <Text style={st.aboutText}>{t('aboutText')}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.infoRow}>
      <Text style={st.infoLabel}>{label}</Text>
      <Text style={st.infoValue}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#e5e7eb' },
  section: { marginBottom: 24, backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  hint: { fontSize: 12, color: '#94a3b8', lineHeight: 20, marginBottom: 12 },
  infoGrid: { gap: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  infoLabel: { fontSize: 13, color: '#94a3b8' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#e5e7eb' },
  primaryBtn: { backgroundColor: '#38bdf8', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontSize: 14, fontWeight: '800', color: '#020617' },
  secondaryBtn: { paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center', backgroundColor: '#1e293b' },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  jsonInput: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, color: '#e5e7eb', fontSize: 12, borderWidth: 1, borderColor: '#334155', height: 200, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  importActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  confirmBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center' },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#020617' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 8 },
  aboutText: { fontSize: 12, color: '#94a3b8', lineHeight: 20 },

  // Language
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center', backgroundColor: '#1e293b' },
  langBtnActive: { borderColor: '#38bdf8', backgroundColor: '#0c4a6e' },
  langBtnText: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  langBtnTextActive: { color: '#38bdf8' },

  // Translation editor
  transRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b', gap: 12 },
  transEnName: { fontSize: 13, fontWeight: '600', color: '#e5e7eb', width: 140 },
  transInput: { flex: 1, backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: '#334155' },
  transActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
