import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useData } from '@/lib/data-context';
import { useI18n } from '@/lib/i18n';
import { computeArmyState, createRosterUnit, createEmptyArmy, armyToText, textToArmy } from '@/lib/army-calc';
import type { Faction, ArmyList, UnitCard, TacticalCard, RosterUnit, UnitType, Upgrade, GameCard } from '@/lib/types';
import { FACTION_COLORS, RESOURCE_META } from '@/lib/types';
import * as Clipboard from 'expo-clipboard';

const FACTIONS: Faction[] = ['Terran', 'Zerg', 'Protoss'];

/** Check if a unit has a valid large profile (cost > 0 and models > 0) */
function hasValidLargeProfile(unit: UnitCard): boolean {
  return !!(unit.largeProfile && unit.largeProfile.cost > 0 && unit.largeProfile.models > 0);
}

/** Check if a unit has a valid small profile (cost > 0 or it's the only option) */
function hasValidSmallProfile(unit: UnitCard): boolean {
  return !!(unit.smallProfile && unit.smallProfile.cost > 0);
}

/** Filter upgrades: only show those with cost > 0 for the given size (purchasable upgrades) */
function getPurchasableUpgrades(upgrades: Upgrade[], size: 'small' | 'large'): { upg: Upgrade; idx: number }[] {
  return upgrades
    .map((upg, idx) => ({ upg, idx }))
    .filter(({ upg }) => (size === 'small' ? upg.costS : upg.costL) > 0);
}

/** Get innate abilities (cost = 0 for the given size) */
function getInnateAbilities(upgrades: Upgrade[], size: 'small' | 'large'): Upgrade[] {
  return upgrades.filter(upg => (size === 'small' ? upg.costS : upg.costL) === 0);
}

type AbilityLike = Pick<Upgrade, 'name' | 'description' | 'phase' | 'activation' | 'abilityKind' | 'resourceCost'> & {
  kind?: string;
};

function uiText(lang: 'en' | 'zh', en: string, zh: string): string {
  return lang === 'en' ? en : zh;
}

function resourceShortName(value = ''): string {
  const text = String(value || '').toLowerCase();
  if (/command|cp\b/.test(text)) return 'CP';
  if (/biomass|bm\b/.test(text)) return 'BM';
  if (/psionic|energy|pe\b/.test(text)) return 'PE';
  return value ? String(value).toUpperCase() : '';
}

function abilityKindFromText(item: AbilityLike): 'active' | 'reaction' | 'passive' | '' {
  const explicit = String(item.abilityKind || item.kind || '').toLowerCase();
  if (explicit === 'active' || explicit === 'reaction' || explicit === 'passive') return explicit;
  const text = `${item.activation || ''} ${item.description || ''}`;
  if (/<\s*reaction\s*>/i.test(text)) return 'reaction';
  if (/<\s*active\s*>/i.test(text)) return 'active';
  if (/<\s*passive\s*>/i.test(text)) return 'passive';
  return '';
}

function abilityKindLabel(item: AbilityLike): string {
  const kind = abilityKindFromText(item);
  if (kind === 'reaction') return 'React';
  if (kind === 'active') return 'Act';
  if (kind === 'passive') return 'Passive';
  return '';
}

function abilityPhaseText(item: AbilityLike): string {
  if (item.phase) return item.phase;
  const text = `${item.activation || ''} ${item.description || ''}`;
  const match = text.match(/<\s*([^<>]*Phase|Any Phase|Start of the Round|End of the Round)\s*>/i);
  return match?.[1]?.trim() || '';
}

function abilityResourceCost(item: AbilityLike): { amount: number | string; type: string } | null {
  if (item.resourceCost && item.resourceCost.type) {
    return { amount: item.resourceCost.amount, type: resourceShortName(item.resourceCost.type) };
  }
  const text = `${item.activation || ''} ${item.description || ''}`;
  const match = text.match(/\((\d+|X)\s+(Command Point|Biomass|Psionic Energy|CP|BM|PE)\)/i);
  if (!match) return null;
  return { amount: match[1], type: resourceShortName(match[2]) };
}

function abilityTimingCostText(item: AbilityLike, lang: 'en' | 'zh'): string {
  const parts = [abilityKindLabel(item), abilityPhaseText(item)].filter(Boolean);
  const cost = abilityResourceCost(item);
  if (cost && String(cost.amount) !== '') {
    parts.push(uiText(lang, `Cost ${cost.amount} ${cost.type}`, `消耗 ${cost.amount} ${cost.type}`));
  }
  return parts.join(' · ');
}

function selectedResourceCards(army: ArmyList, cards: TacticalCard[]) {
  const selectedIds = [army.factionCardId, ...army.tacticalCardIds].filter(Boolean) as string[];
  const counts = new Map<string, number>();
  selectedIds.forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
  return Array.from(counts.entries())
    .map(([id, count]) => ({ card: cards.find(c => c.id === id), count }))
    .filter((row): row is { card: TacticalCard; count: number } => Boolean(row.card))
    .filter(({ card }) => Number(card.resource || 0) > 0);
}

function cardResourceProvidedText(card: TacticalCard, fallbackShort: string, lang: 'en' | 'zh', count = 1): string {
  const perCard = Number(card.resource || 0);
  if (perCard <= 0) return '';
  const total = perCard * Math.max(1, count);
  const type = resourceShortName(card.resourceType || fallbackShort);
  const amount = count > 1 ? `${perCard}x${count}=${total}` : `${total}`;
  return uiText(lang, `Provides +${amount} ${type}`, `提供 +${amount} ${type}`);
}

function resourceSourceSummary(army: ArmyList, cards: TacticalCard[], fallbackShort: string, lang: 'en' | 'zh'): string {
  const rows = selectedResourceCards(army, cards);
  if (!rows.length) return uiText(lang, `No ${fallbackShort} building/card source selected`, `未选择 ${fallbackShort} 建筑/卡牌来源`);
  const total = rows.reduce((sum, row) => sum + Number(row.card.resource || 0) * row.count, 0);
  const sources = rows.map(({ card, count }) => {
    const amount = Number(card.resource || 0) * count;
    return `${card.name}${count > 1 ? ` x${count}` : ''} +${amount}`;
  }).join(' · ');
  return uiText(lang, `${fallbackShort} building/card sources: ${sources} (total ${total})`, `${fallbackShort} 建筑/卡牌来源：${sources}（合计 ${total}）`);
}

function abilityCostSourceText(item: AbilityLike, army: ArmyList, cards: TacticalCard[], fallbackShort: string, lang: 'en' | 'zh'): string {
  const cost = abilityResourceCost(item);
  if (!cost) return '';
  const sourceRows = selectedResourceCards(army, cards).filter(({ card }) => resourceShortName(card.resourceType || fallbackShort) === cost.type);
  if (!sourceRows.length) return uiText(lang, `No ${cost.type} building/card source selected`, `未选择 ${cost.type} 建筑/卡牌来源`);
  const total = sourceRows.reduce((sum, row) => sum + Number(row.card.resource || 0) * row.count, 0);
  const names = sourceRows.map(({ card, count }) => `${card.name}${count > 1 ? ` x${count}` : ''}`).join(' · ');
  return uiText(lang, `${cost.type} from ${names} (${total} available)`, `${cost.type} 由 ${names} 提供（可用 ${total}）`);
}

function compactAbilityPreview(upgrades: Upgrade[], lang: 'en' | 'zh'): string {
  return upgrades
    .filter(upg => !upg.weapon && (upg.activation || abilityKindFromText(upg)))
    .slice(0, 3)
    .map(upg => [upg.name, abilityTimingCostText(upg, lang)].filter(Boolean).join(' · '))
    .join(' / ');
}

type BuilderStep = 'list' | 'edit' | 'addUnit' | 'import';

export default function ArmyScreen() {
  const { t, factionName } = useI18n();
  const {
    units,
    cards,
    gameCards,
    armyLists,
    saveArmy,
    deleteArmy,
    officialCatalogueAvailable,
    officialSourceMetadataVerified,
  } = useData();
  const [step, setStep] = useState<BuilderStep>('list');
  const [currentArmy, setCurrentArmy] = useState<ArmyList | null>(null);
  const [importText, setImportText] = useState('');
  // Track which tab to show in edit view (persists across addUnit navigation)
  const [editTab, setEditTab] = useState<'command' | 'roster'>('command');

  if (!officialCatalogueAvailable) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={s.header}>
          <Text style={s.headerTitle}>{t('armyManage')}</Text>
          <Text style={s.headerSub}>Project D · official source gate</Text>
        </View>
        <View style={{ flex: 1, padding: 16 }}>
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>Official catalogue body unavailable</Text>
            <Text style={s.emptyHint}>
              {officialSourceMetadataVerified
                ? 'Source hashes and versions are verified, but card text and images are withheld until redistribution review passes. Legacy drafts can be explicitly sanitized in Settings; they remain quarantined and cannot seed a room.'
                : 'Source metadata is not verified on this device. Refresh it explicitly in Settings. No legacy catalogue or draft can be used as a fallback.'}
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // --- Army List View ---
  if (step === 'list') {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={s.header}>
          <Text style={s.headerTitle}>{t('armyManage')}</Text>
          <Text style={s.headerSub}>{armyLists.length} {t('armyCount')}</Text>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {armyLists.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>{t('noArmy')}</Text>
              <Text style={s.emptyHint}>{t('noArmyHint')}</Text>
            </View>
          ) : (
            armyLists.map(army => {
              const state = computeArmyState(army, cards);
              const fColor = FACTION_COLORS[army.faction];
              return (
                <Pressable
                  key={army.id}
                  onPress={() => { setCurrentArmy({ ...army }); setEditTab('roster'); setStep('edit'); }}
                  style={({ pressed }) => [s.armyCard, { borderLeftColor: fColor }, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.armyName, { color: fColor }]}>{army.name}</Text>
                    <Text style={s.armySub}>{factionName(army.faction)} · {army.roster.length} · {state.mineralsUsed}/{army.mineralsLimit}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      Alert.alert(t('deleteArmy'), `${t('deleteArmyConfirm')} "${army.name}"?`, [
                        { text: t('back') },
                        { text: t('delete'), style: 'destructive', onPress: () => deleteArmy(army.id) },
                      ]);
                    }}
                    style={({ pressed }) => [s.deleteBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={s.deleteBtnText}>✕</Text>
                  </Pressable>
                </Pressable>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Actions */}
        <View style={s.bottomBar}>
          {FACTIONS.map(f => (
            <Pressable
              key={f}
              onPress={() => {
                const army = createEmptyArmy(f, `${t('newArmyPrefix')} ${factionName(f)} ${t('armyPostfix')}`);
                setCurrentArmy(army);
                setEditTab('command');
                setStep('edit');
              }}
              style={({ pressed }) => [s.newBtn, { backgroundColor: FACTION_COLORS[f] + '20', borderColor: FACTION_COLORS[f] }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[s.newBtnText, { color: FACTION_COLORS[f] }]}>+{factionName(f)}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => { setImportText(''); setStep('import'); }}
            style={({ pressed }) => [s.newBtn, { backgroundColor: '#22c55e20', borderColor: '#22c55e' }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[s.newBtnText, { color: '#22c55e' }]}>{t('importArmy')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // --- Import View ---
  if (step === 'import') {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={s.header}>
          <Pressable onPress={() => setStep('list')} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={s.backBtn}>{t('back')}</Text>
          </Pressable>
          <Text style={s.headerTitle}>{t('importArmyTitle')}</Text>
        </View>
        <View style={{ padding: 16, flex: 1 }}>
          <Text style={s.label}>{t('importLabel')}</Text>
          <TextInput
            style={s.importInput}
            multiline
            value={importText}
            onChangeText={setImportText}
            placeholder={t('importPlaceholder')}
            placeholderTextColor="#64748b"
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Pressable
              onPress={async () => {
                const text = await Clipboard.getStringAsync();
                setImportText(text);
              }}
              style={({ pressed }) => [s.actionBtn, { backgroundColor: '#1e293b' }, pressed && { opacity: 0.7 }]}
            >
              <Text style={s.actionBtnText}>{t('pasteFromClipboard')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const army = textToArmy(importText, cards, units);
                if (army) {
                  saveArmy(army);
                  setStep('list');
                  Alert.alert(t('importSuccess'), t('armyImported'));
                } else {
                  Alert.alert(t('importError'), t('importParseFail'));
                }
              }}
              style={({ pressed }) => [s.actionBtn, { backgroundColor: '#22c55e20', borderColor: '#22c55e', borderWidth: 1 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={[s.actionBtnText, { color: '#22c55e' }]}>{t('importArmy')}</Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // --- Add Unit View ---
  if (step === 'addUnit' && currentArmy) {
    return <AddUnitView army={currentArmy} units={units} allCards={cards} onAdd={(ru) => {
      const updated = { ...currentArmy, roster: [...currentArmy.roster, ru], updatedAt: Date.now() };
      setCurrentArmy(updated);
      setEditTab('roster');
      setStep('edit');
    }} onBack={() => setStep('edit')} />;
  }

  // --- Edit View ---
  if (step === 'edit' && currentArmy) {
    return <ArmyEditView
      army={currentArmy}
      cards={cards}
      units={units}
      allCards={cards}
      gameCards={gameCards}
      tab={editTab}
      onTabChange={setEditTab}
      onUpdate={(updated) => setCurrentArmy(updated)}
      onSave={async (forceOverride?: boolean) => {
        if (!forceOverride) {
          // Compute legality issues
          const st = computeArmyState(currentArmy, cards);
          const gLimit = Math.floor(currentArmy.mineralsLimit * 0.1);
          const issues: string[] = [];
          if (st.mineralsUsed > currentArmy.mineralsLimit) issues.push(`${t('mineralsOverDetail')}: ${st.mineralsUsed}/${currentArmy.mineralsLimit}`);
          if (st.gasUsed > gLimit) issues.push(`${t('gasOverDetail')}: ${st.gasUsed}/${gLimit}`);
          const hasSlotBudget = Boolean(currentArmy.factionCardId || currentArmy.tacticalCardIds.length);
          const slotTypes = ['Core', 'Elite', 'Support', 'Hero', 'Air'] as const;
          slotTypes.forEach(type => {
            const avail = st.slotsAvailable[type];
            const used = st.slotsUsed[type];
            if (hasSlotBudget && used > avail) issues.push(`${type} ${t('slotOverDetail')}: ${used}/${avail}`);
          });
          if (issues.length > 0) {
            Alert.alert(
              t('legalityCheck'),
              `${t('armyHasIssues')}\n\n${issues.map(i => `\u26a0 ${i}`).join('\n')}`,
              [
                { text: t('back') },
                { text: t('saveAnyway'), style: 'destructive', onPress: () => {
                  // Re-call with force override
                  (async () => {
                    await saveArmy({ ...currentArmy, updatedAt: Date.now() });
                    setStep('list');
                  })();
                }},
              ]
            );
            return;
          }
        }
        await saveArmy({ ...currentArmy, updatedAt: Date.now() });
        setStep('list');
      }}
      onBack={() => setStep('list')}
      onAddUnit={() => {
        setEditTab('roster');
        setStep('addUnit');
      }}
      onShare={async () => {
        const text = armyToText(currentArmy, cards, units, gameCards);
        await Clipboard.setStringAsync(text);
        Alert.alert(t('copied'), t('armyCopied'));
      }}
    />;
  }

  return null;
}

// --- Minerals Input (does not reset on clear) ---
function MineralsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState(String(value));
  React.useEffect(() => {
    setText(String(value));
  }, [value]);

  const handleChangeText = (t: string) => {
    setText(t);
    const num = parseInt(t);
    if (!isNaN(num) && num > 0) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseInt(text);
    if (isNaN(num) || num <= 0) {
      setText(String(value));
    }
  };

  return (
    <View style={s.minRow}>
      <Text style={s.minLabel}>{t('mineralLimit')}:</Text>
      <TextInput
        style={s.minInput}
        keyboardType="numeric"
        value={text}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        returnKeyType="done"
        selectTextOnFocus
      />
    </View>
  );
}

// --- Army Edit View ---
function ArmyEditView({ army, cards, units, allCards, gameCards, tab, onTabChange, onUpdate, onSave, onBack, onAddUnit, onShare }: {
  army: ArmyList;
  cards: TacticalCard[];
  units: UnitCard[];
  allCards: TacticalCard[];
  gameCards: GameCard[];
  tab: 'command' | 'roster';
  onTabChange: (t: 'command' | 'roster') => void;
  onUpdate: (a: ArmyList) => void;
  onSave: () => void;
  onBack: () => void;
  onAddUnit: () => void;
  onShare: () => void;
}) {
  const { t, lang, rulesText } = useI18n();
  // Scroll position preservation
  const scrollRef = React.useRef<ScrollView>(null);
  const scrollYRef = React.useRef(0);
  const prevRosterLenRef = React.useRef(army.roster.length);
  const [showCardDetails, setShowCardDetails] = useState(false);

  // When roster changes (add/remove), restore scroll position
  React.useEffect(() => {
    if (tab === 'roster' && scrollRef.current) {
      // Small delay to let layout settle
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: scrollYRef.current, animated: false });
      }, 50);
      prevRosterLenRef.current = army.roster.length;
      return () => clearTimeout(timer);
    }
    prevRosterLenRef.current = army.roster.length;
  }, [army.roster.length, tab]);
  const state = computeArmyState(army, allCards);
  const fColor = FACTION_COLORS[army.faction];
  const resMeta = RESOURCE_META[army.faction];
  const resourceSummary = resourceSourceSummary(army, allCards, resMeta.short, lang);

  // Get selected faction card to determine unit keyword restrictions
  const selectedFactionCard = army.factionCardId ? allCards.find(c => c.id === army.factionCardId) : null;
  const factionCards = allCards.filter(c => c.faction === army.faction && c.isFactionCard);
  const tacticalCards = allCards.filter(c => c.faction === army.faction && !c.isFactionCard);
  const hasSlotBudget = Boolean(army.factionCardId || army.tacticalCardIds.length);

  const mineralsOver = state.mineralsUsed > army.mineralsLimit;
  const gasLimit = Math.floor(army.mineralsLimit * 0.1);
  const gasOver = state.gasUsed > gasLimit;

  // Mission/Deployment filter state
  const [missionFilter, setMissionFilter] = useState<'official' | 'all'>('official');
  const [deployFilter, setDeployFilter] = useState<'official' | 'all'>('official');

  // Filter missions and deployments
  const missions = useMemo(() => {
    let list = gameCards.filter(c => c.type === 'mission' || c.type === 'community_mission');
    if (missionFilter === 'official') list = list.filter(c => c.type === 'mission');
    return list;
  }, [gameCards, missionFilter]);

  const deployments = useMemo(() => {
    let list = gameCards.filter(c => c.type === 'deployment' || c.type === 'community_deployment');
    if (deployFilter === 'official') list = list.filter(c => c.type === 'deployment');
    return list;
  }, [gameCards, deployFilter]);

  // Selected mission/deployment cards
  const selectedMission = army.missionId ? gameCards.find(c => c.id === army.missionId) : null;
  const selectedDeployment = army.deploymentId ? gameCards.find(c => c.id === army.deploymentId) : null;

  // Check slot over-limit
  const hasSlotOver = useMemo(() => {
    return (['Core', 'Elite', 'Support', 'Hero', 'Air'] as UnitType[]).some(type => {
      const avail = state.slotsAvailable[type];
      const used = state.slotsUsed[type];
      return hasSlotBudget && used > avail;
    });
  }, [hasSlotBudget, state]);

  // Switch size for a roster unit
  const handleSizeSwitch = (idx: number) => {
    const ru = army.roster[idx];
    const unit = units.find(u => u.id === ru.unitId);
    if (!unit) return;

    const newSize = ru.size === 'small' ? 'large' : 'small';
    if (newSize === 'large' && !hasValidLargeProfile(unit)) return;
    if (newSize === 'small' && !hasValidSmallProfile(unit)) return;

    const newRu = createRosterUnit(unit, newSize);
    newRu.activeUpgrades = ru.activeUpgrades.filter(i => {
      const upg = newRu.availableUpgrades[i];
      if (!upg) return false;
      return (newSize === 'small' ? upg.costS : upg.costL) > 0;
    });

    const newRoster = [...army.roster];
    newRoster[idx] = newRu;
    onUpdate({ ...army, roster: newRoster });
  };

  // Clear all roster units
  const handleClearRoster = () => {
    Alert.alert(t('clearAll'), t('deleteArmyConfirm') + '?', [
      { text: t('back') },
      { text: t('clearAll'), style: 'destructive', onPress: () => onUpdate({ ...army, roster: [] }) },
    ]);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Top Bar */}
      <View style={s.editTopBar}>
        <Pressable onPress={onBack} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Text style={s.backBtn}>{t('back')}</Text>
        </Pressable>
        <TextInput
          style={[s.armyNameInput, { color: fColor }]}
          value={army.name}
          onChangeText={(txt) => onUpdate({ ...army, name: txt })}
          returnKeyType="done"
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onShare} style={({ pressed }) => [s.topBtn, pressed && { opacity: 0.7 }]}>
            <Text style={s.topBtnText}>{t('share')}</Text>
          </Pressable>
          <Pressable onPress={onSave} style={({ pressed }) => [s.topBtn, { backgroundColor: '#22c55e20', borderColor: '#22c55e' }, pressed && { opacity: 0.7 }]}>
            <Text style={[s.topBtnText, { color: '#22c55e' }]}>{t('save')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Resources Bar with gas over-limit warning */}
      <View style={s.resBar}>
        <View style={[s.resBox, { borderColor: fColor }]}>
          <ResItem label={t('mineralsLabel')} value={`${state.mineralsUsed}/${army.mineralsLimit}`} error={mineralsOver} />
          <ResItem label={t('gasLabel')} value={`${state.gasUsed}/${gasLimit}`} error={gasOver} />
          <ResItem label={resMeta.name} value={`${state.resourceTotal}`} />
          <ResItem label={t('supplyLabel')} value={`${state.supplyUsed}`} />
          {(['Core', 'Elite', 'Support', 'Hero', 'Air'] as UnitType[]).map(type => {
            const avail = state.slotsAvailable[type];
            const used = state.slotsUsed[type];
            if (avail === 0 && used === 0) return null;
            return (
              <ResItem key={type} label={type} value={`${used}/${avail}`} error={hasSlotBudget && used > avail} />
            );
          })}
        </View>
        <Text style={s.resourceSourceLine}>{resourceSummary}</Text>
      </View>

      {/* Legality Warning Banner */}
      {(mineralsOver || gasOver || hasSlotOver) && (
        <View style={s.warningBanner}>
          <Text style={s.warningText}>
            {mineralsOver ? t('mineralsOverWarning') + ' ' : ''}
            {gasOver ? t('gasOverWarning') + ' ' : ''}
            {hasSlotOver ? t('slotOverWarning') + ' ' : ''}
          </Text>
        </View>
      )}

      {/* Minerals Input */}
      <MineralsInput
        value={army.mineralsLimit}
        onChange={(v) => onUpdate({ ...army, mineralsLimit: v })}
      />

      {/* Tabs */}
      <View style={s.tabBar}>
        <Pressable onPress={() => onTabChange('command')} style={({ pressed }) => [s.tabBtn, tab === 'command' && { borderBottomColor: fColor, borderBottomWidth: 2 }, pressed && { opacity: 0.7 }]}>
          <Text style={[s.tabText, tab === 'command' && { color: fColor }]}>{t('commandTab')}</Text>
        </Pressable>
        <Pressable onPress={() => onTabChange('roster')} style={({ pressed }) => [s.tabBtn, tab === 'roster' && { borderBottomColor: fColor, borderBottomWidth: 2 }, pressed && { opacity: 0.7 }]}>
          <Text style={[s.tabText, tab === 'roster' && { color: fColor }]}>{t('rosterTab')} ({army.roster.length})</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {tab === 'command' ? (
          <View style={{ padding: 12 }}>
            <View style={s.cardToolsRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardToolsTitle}>卡牌</Text>
                <Text style={s.cardToolsMeta}>
                  {army.factionCardId ? '已选阵营' : '未选阵营'} · {army.tacticalCardIds.length} 战术
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCardDetails(!showCardDetails)}
                style={({ pressed }) => [s.cardDetailsBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.cardDetailsText}>{showCardDetails ? '收起文本' : '展开文本'}</Text>
              </Pressable>
            </View>
            {/* ── 1. Faction Cards ── */}
            <Text style={s.sectionLabel}>{t('selectFactionCard')}</Text>
            {factionCards.map(fc => {
              const selected = army.factionCardId === fc.id;
              return (
                <View key={fc.id}>
                  <Pressable
                    onPress={() => {
                      if (selected) {
                        onUpdate({ ...army, factionCardId: null, tacticalCardIds: [], roster: [] });
                      } else {
                        onUpdate({ ...army, factionCardId: fc.id, tacticalCardIds: [], roster: [] });
                      }
                    }}
                    style={({ pressed }) => [s.cardRow, selected && { borderColor: fColor, backgroundColor: fColor + '10' }, pressed && { opacity: 0.7 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cardName, selected && { color: fColor }]}>{fc.name}</Text>
                      <Text style={s.cardSub}>
                        {fc.resource != null ? `${cardResourceProvidedText(fc, resMeta.short, lang)} ` : ''}
                        {fc.slots ? Object.entries(fc.slots).filter(([,v]) => v > 0).map(([k,v]) => `${v}x${k}`).join(' ') : ''}
                      </Text>
                      {/* Boosts display for faction card */}
                      {showCardDetails && fc.boosts && fc.boosts.length > 0 && (
                        <View style={s.boostsContainer}>
                          {fc.boosts.map((b, i) => (
                            <View key={i} style={s.boostRow}>
                              <Text style={s.boostName}>{b.name}</Text>
                              {!!abilityTimingCostText(b, lang) && <Text style={s.abilityMeta}>{abilityTimingCostText(b, lang)}</Text>}
                              <Text style={s.boostDesc}>{rulesText(b.description)}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <Text style={[s.cardBadge, { color: '#22c55e' }]}>{t('factionBadge')}</Text>
                  </Pressable>
                </View>
              );
            })}

            {/* ── 2. Tactical Cards ── */}
            <Text style={[s.sectionLabel, { marginTop: 16 }]}>{t('selectTacticalCards')}</Text>
            {!army.factionCardId ? (
              <Text style={s.hint}>{t('selectFactionFirst')}</Text>
            ) : (
              tacticalCards.map(tc => {
                const selectedCount = army.tacticalCardIds.filter(id => id === tc.id).length;
                const selected = selectedCount > 0;
                const tcFaction = tc.faction;
                const factionCardFactionTags = selectedFactionCard?.factionTags || [];
                const isFactionSpecificCard = tcFaction !== army.faction;
                const showCard = !isFactionSpecificCard || factionCardFactionTags.includes(tcFaction as string);
                if (!showCard) return null;

                return (
                  <View key={tc.id} style={[s.cardRow, selected && { borderColor: '#ff9204', backgroundColor: '#ff920410' }]}>
                    <Pressable
                      onPress={() => {
                        if (tc.isUnique) {
                          // Unique cards: toggle on/off
                          if (selected) {
                            const idx = army.tacticalCardIds.indexOf(tc.id);
                            const newIds = [...army.tacticalCardIds];
                            newIds.splice(idx, 1);
                            onUpdate({ ...army, tacticalCardIds: newIds });
                          } else {
                            onUpdate({ ...army, tacticalCardIds: [...army.tacticalCardIds, tc.id] });
                          }
                        } else {
                          // Non-unique cards: tap body to add one more copy
                          onUpdate({ ...army, tacticalCardIds: [...army.tacticalCardIds, tc.id] });
                        }
                      }}
                      style={({ pressed }) => [{ flex: 1, paddingVertical: 4 }, pressed && { opacity: 0.7 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.cardName, selected && { color: '#ff9204' }]}>
                            {tc.name}
                            {selectedCount > 1 ? ` \u00d7${selectedCount}` : ''}
                            {tc.isUnique ? ' (U)' : ''}
                          </Text>
                          <Text style={s.cardSub}>
                            {tc.cost} {t('gasUnit')} {tc.resource != null ? `\u00b7 ${cardResourceProvidedText(tc, resMeta.short, lang)}` : ''}
                            {tc.slots ? ' \u00b7 ' + Object.entries(tc.slots).filter(([,v]) => v > 0).map(([k,v]) => `${v}x${k}`).join(' ') : ''}
                          </Text>
                          {/* Boosts display for tactical card */}
                          {showCardDetails && tc.boosts && tc.boosts.length > 0 && (
                            <View style={s.boostsContainer}>
                              {tc.boosts.map((b, i) => (
                                <View key={i} style={s.boostRow}>
                                  <Text style={s.boostName}>{b.name}</Text>
                                  {!!abilityTimingCostText(b, lang) && <Text style={s.abilityMeta}>{abilityTimingCostText(b, lang)}</Text>}
                                  <Text style={s.boostDesc}>{rulesText(b.description)}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                        {/* Gas cost badge */}
                        <Text style={[s.cardBadge, { color: '#ff9204' }]}>{tc.cost * (selectedCount || 1)} {t('gasUnit')}</Text>
                      </View>
                    </Pressable>
                    {/* +/- controls for non-unique cards when selected */}
                    {!tc.isUnique && selectedCount > 0 && (
                      <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, marginLeft: 4 }}>
                        <Pressable
                          onPress={() => {
                            onUpdate({ ...army, tacticalCardIds: [...army.tacticalCardIds, tc.id] });
                          }}
                          style={({ pressed }) => [s.tcControlBtn, { backgroundColor: '#22c55e20', borderColor: '#22c55e' }, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={{ color: '#22c55e', fontSize: 14, fontWeight: '800', lineHeight: 16 }}>+</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            const idx = army.tacticalCardIds.lastIndexOf(tc.id);
                            if (idx >= 0) {
                              const newIds = [...army.tacticalCardIds];
                              newIds.splice(idx, 1);
                              onUpdate({ ...army, tacticalCardIds: newIds });
                            }
                          }}
                          style={({ pressed }) => [s.tcControlBtn, { backgroundColor: '#ef444420', borderColor: '#ef4444' }, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '800', lineHeight: 16 }}>{'-'}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* ── 3. Mission Card Selection ── */}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t('selectMission')}</Text>
            {/* Filter toggle */}
            <View style={s.filterRow}>
              {(['official', 'all'] as const).map(f => (
                <Pressable
                  key={f}
                  onPress={() => setMissionFilter(f)}
                  style={({ pressed }) => [
                    s.filterChip,
                    missionFilter === f && s.filterChipActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[s.filterChipText, missionFilter === f && s.filterChipTextActive]}>
                    {f === 'official' ? t('officialOnly') : t('communityIncluded')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/* Selected mission info */}
            {selectedMission && (
              <Pressable
                onPress={() => onUpdate({ ...army, missionId: null })}
                style={({ pressed }) => [s.selectedGameCard, { borderColor: '#f59e0b' }, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardName, { color: '#f59e0b' }]}>{selectedMission.name}</Text>
                  <Text style={s.cardSub}>
                    {selectedMission.format ? `${t('missionFormatLabel')}: ${selectedMission.format}` : ''}
                    {selectedMission.gameLength ? ` · ${t('missionLengthLabel')}: ${selectedMission.gameLength}` : ''}
                    {selectedMission.startingSupply != null ? ` · ${t('missionSupplyLabel')}: ${selectedMission.startingSupply}` : ''}
                  </Text>
                  {selectedMission.type?.startsWith('community') && selectedMission.authorName && (
                    <Text style={s.communityAuthor}>{selectedMission.authorName}</Text>
                  )}
                </View>
                <Text style={s.deselectHint}>{t('tapToDeselect')}</Text>
              </Pressable>
            )}
            {/* Mission list */}
            {!selectedMission && (
              missions.length > 0 ? (
                missions.map(m => (
                  <Pressable
                    key={m.id}
                    onPress={() => onUpdate({ ...army, missionId: m.id })}
                    style={({ pressed }) => [s.gameCardRow, pressed && { opacity: 0.7 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.cardName}>{m.name}</Text>
                        {m.type === 'community_mission' && (
                          <View style={s.communityTag}><Text style={s.communityTagText}>{t('community')}</Text></View>
                        )}
                      </View>
                      <Text style={s.cardSub}>
                        {m.format || ''}{m.gameLength ? ` · ${m.gameLength}R` : ''}{m.startingSupply != null ? ` · ${m.startingSupply}S` : ''}
                      </Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={s.hint}>{t('noMissionSelected')}</Text>
              )
            )}

            {/* ── 4. Deployment Card Selection ── */}
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>{t('selectDeployment')}</Text>
            {/* Filter toggle */}
            <View style={s.filterRow}>
              {(['official', 'all'] as const).map(f => (
                <Pressable
                  key={f}
                  onPress={() => setDeployFilter(f)}
                  style={({ pressed }) => [
                    s.filterChip,
                    deployFilter === f && [s.filterChipActive, { borderColor: '#8b5cf6', backgroundColor: '#8b5cf620' }],
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[s.filterChipText, deployFilter === f && [s.filterChipTextActive, { color: '#8b5cf6' }]]}>
                    {f === 'official' ? t('officialOnly') : t('communityIncluded')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/* Selected deployment info */}
            {selectedDeployment && (
              <Pressable
                onPress={() => onUpdate({ ...army, deploymentId: null })}
                style={({ pressed }) => [s.selectedGameCard, { borderColor: '#8b5cf6' }, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardName, { color: '#8b5cf6' }]}>{selectedDeployment.name}</Text>
                  <Text style={s.cardSub}>
                    {selectedDeployment.gameSize ? `${t('deploymentSizeLabel')}: ${selectedDeployment.gameSize}` : ''}
                  </Text>
                  {selectedDeployment.type?.startsWith('community') && selectedDeployment.authorName && (
                    <Text style={s.communityAuthor}>{selectedDeployment.authorName}</Text>
                  )}
                </View>
                <Text style={s.deselectHint}>{t('tapToDeselect')}</Text>
              </Pressable>
            )}
            {/* Deployment list */}
            {!selectedDeployment && (
              deployments.length > 0 ? (
                deployments.map(d => (
                  <Pressable
                    key={d.id}
                    onPress={() => onUpdate({ ...army, deploymentId: d.id })}
                    style={({ pressed }) => [s.gameCardRow, pressed && { opacity: 0.7 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.cardName}>{d.name}</Text>
                        {d.type === 'community_deployment' && (
                          <View style={[s.communityTag, { backgroundColor: '#8b5cf620' }]}><Text style={[s.communityTagText, { color: '#8b5cf6' }]}>{t('community')}</Text></View>
                        )}
                      </View>
                      <Text style={s.cardSub}>
                        {d.gameSize || ''}
                      </Text>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Text style={s.hint}>{t('noDeploymentSelected')}</Text>
              )
            )}
          </View>
        ) : (
          <View style={{ padding: 12 }}>
            {/* Clear all button */}
            {army.roster.length > 0 && (
              <Pressable
                onPress={handleClearRoster}
                style={({ pressed }) => [s.clearAllBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.clearAllBtnText}>{t('clearAll')} ({army.roster.length})</Text>
              </Pressable>
            )}

            {/* Roster */}
            {army.roster.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyText}>{t('rosterEmpty')}</Text>
              </View>
            ) : (
              army.roster.map((ru, idx) => {
                const unit = units.find(u => u.id === ru.unitId);
                const canSwitchToLarge = unit ? hasValidLargeProfile(unit) : false;
                const canSwitchToSmall = unit ? hasValidSmallProfile(unit) : false;
                const canSwitch = (ru.size === 'small' && canSwitchToLarge) || (ru.size === 'large' && canSwitchToSmall);
                const purchasableUpgrades = getPurchasableUpgrades(ru.availableUpgrades, ru.size);
                const innateAbilities = getInnateAbilities(ru.availableUpgrades, ru.size);

                return (
                  <View key={idx} style={s.rosterCard}>
                    <View style={s.rosterHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.rosterName}>{ru.name}</Text>
                        <Text style={s.rosterSub}>
                          {ru.unitType} · {ru.size === 'small' ? t('smallLabel') : t('largeLabel')} · {ru.baseCost}M · {ru.supply} slot/supply
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {canSwitch && (
                          <Pressable
                            onPress={() => handleSizeSwitch(idx)}
                            style={({ pressed }) => [s.switchBtn, pressed && { opacity: 0.7 }]}
                          >
                            <Text style={s.switchBtnText}>
                              {ru.size === 'small' ? t('toLarge') : t('toSmall')}
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => {
                            const newRoster = [...army.roster];
                            newRoster.splice(idx, 1);
                            onUpdate({ ...army, roster: newRoster });
                          }}
                          style={({ pressed }) => [s.removeBtn, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={s.removeBtnText}>{t('remove')}</Text>
                        </Pressable>
                      </View>
                    </View>

                    {/* Innate abilities (non-selectable, cost = 0) */}
                    {innateAbilities.length > 0 && (
                      <View style={s.innateSection}>
                        <Text style={s.innateSectionLabel}>{t('innateAbilities')}</Text>
                        {innateAbilities.map((a, abilityIndex) => (
                          <View key={`${a.name}-${abilityIndex}`} style={s.abilityRow}>
                            <Text style={s.innateText}>{a.name}</Text>
                            {!!abilityTimingCostText(a, lang) && <Text style={s.abilityMeta}>{abilityTimingCostText(a, lang)}</Text>}
                            {!!abilityCostSourceText(a, army, allCards, resMeta.short, lang) && (
                              <Text style={s.abilitySource}>{abilityCostSourceText(a, army, allCards, resMeta.short, lang)}</Text>
                            )}
                            {!!a.description && <Text style={s.boostDesc}>{rulesText(a.description)}</Text>}
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Purchasable upgrades (cost > 0) */}
                    {purchasableUpgrades.length > 0 && (
                      <View style={s.upgradesSection}>
                        <Text style={s.upgSectionLabel}>{t('optionalUpgrades')}</Text>
                        {purchasableUpgrades.map(({ upg, idx: ui }) => {
                          const active = ru.activeUpgrades.includes(ui);
                          const cost = ru.size === 'small' ? upg.costS : upg.costL;
                          return (
                            <Pressable
                              key={ui}
                              onPress={() => {
                                const newRoster = [...army.roster];
                                const newRu = { ...newRoster[idx] };
                                if (active) {
                                  newRu.activeUpgrades = newRu.activeUpgrades.filter(i => i !== ui);
                                } else {
                                  newRu.activeUpgrades = [...newRu.activeUpgrades, ui];
                                }
                                newRoster[idx] = newRu;
                                onUpdate({ ...army, roster: newRoster });
                              }}
                              style={({ pressed }) => [s.upgRow, active && { borderColor: '#22d3ee', backgroundColor: '#22d3ee10' }, pressed && { opacity: 0.7 }]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[s.upgName, active && { color: '#22d3ee' }]}>{upg.name}</Text>
                                {!!abilityTimingCostText(upg, lang) && <Text style={s.abilityMeta}>{abilityTimingCostText(upg, lang)}</Text>}
                                {!!abilityCostSourceText(upg, army, allCards, resMeta.short, lang) && (
                                  <Text style={s.abilitySource}>{abilityCostSourceText(upg, army, allCards, resMeta.short, lang)}</Text>
                                )}
                              </View>
                              <Text style={s.upgCost}>+{cost}M</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Add Unit Button */}
            {army.factionCardId && (
              <Pressable
                onPress={onAddUnit}
                style={({ pressed }) => [s.addUnitBtn, { borderColor: fColor }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[s.addUnitBtnText, { color: fColor }]}>{t('addUnit')}</Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

function ResItem({ label, value, error }: { label: string; value: string; error?: boolean }) {
  return (
    <View style={s.resItem}>
      <Text style={s.resLabel}>{label}</Text>
      <Text style={[s.resValue, error && { color: '#ef4444' }]}>{value}</Text>
    </View>
  );
}

// --- Add Unit View ---
function AddUnitView({ army, units, allCards, onAdd, onBack }: {
  army: ArmyList;
  units: UnitCard[];
  allCards: TacticalCard[];
  onAdd: (ru: RosterUnit) => void;
  onBack: () => void;
}) {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState('');

  const selectedFactionCard = army.factionCardId ? allCards.find(c => c.id === army.factionCardId) : null;
  const factionTags = selectedFactionCard?.factionTags || [];

  const factionUnits = useMemo(() => {
    const q = search.toLowerCase();
    return units.filter(u => {
      if (u.faction !== army.faction) return false;
      if (q && !u.name.toLowerCase().includes(q)) return false;
      if (u.keywords) {
        const unitKeywords = u.keywords.split(',').map(k => k.trim());
        if (factionTags.length > 0) {
          const matches = unitKeywords.some(kw => factionTags.includes(kw));
          if (!matches) return false;
        }
      }
      return true;
    });
  }, [units, army.faction, search, factionTags]);

  const fColor = FACTION_COLORS[army.faction];
  const resMeta = RESOURCE_META[army.faction];
  const resourceSummary = resourceSourceSummary(army, allCards, resMeta.short, lang);

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={s.header}>
        <Pressable onPress={onBack} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Text style={s.backBtn}>{t('backToRoster')}</Text>
        </Pressable>
        <Text style={s.headerTitle}>{t('addUnitTitle')}</Text>
      </View>
      <View style={s.searchBarInner}>
        <TextInput
          style={s.searchInput}
          placeholder={t('searchUnit')}
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
          returnKeyType="done"
        />
        <Text style={s.resourceSourceLine}>{resourceSummary}</Text>
      </View>
      <FlatList
        data={factionUnits}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const showSmall = hasValidSmallProfile(item);
          const showLarge = hasValidLargeProfile(item);
          if (!showSmall && !showLarge) return null;
          const abilityPreview = compactAbilityPreview(item.upgrades || [], lang);

          return (
            <View style={s.unitPickCard}>
              <Text style={[s.unitPickName, { color: fColor }]}>{item.name}</Text>
              <Text style={s.unitPickSub}>{item.unitType} · HP:{item.stats.hp || '?'} {item.keywords || ''}</Text>
              {!!abilityPreview && <Text style={s.unitAbilityPreview}>{abilityPreview}</Text>}
              <View style={s.unitPickActions}>
                {showSmall && (
                  <Pressable
                    onPress={() => onAdd(createRosterUnit(item, 'small'))}
                    style={({ pressed }) => [s.sizeBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={s.sizeBtnText}>
                      {t('smallLabel')} {item.smallProfile!.models} {t('models')} {item.smallProfile!.cost}
                    </Text>
                  </Pressable>
                )}
                {showLarge && (
                  <Pressable
                    onPress={() => onAdd(createRosterUnit(item, 'large'))}
                    style={({ pressed }) => [s.sizeBtn, { borderColor: '#a855f7' }, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[s.sizeBtnText, { color: '#a855f7' }]}>
                      {t('largeLabel')} {item.largeProfile!.models} {t('models')} {item.largeProfile!.cost}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={s.emptyBox}><Text style={s.emptyText}>{t('noMatchUnit')}</Text></View>}
      />
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#e5e7eb' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  backBtn: { color: '#38bdf8', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 16 },
  emptyHint: { color: '#475569', fontSize: 13, marginTop: 4 },
  armyCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 8, padding: 14, backgroundColor: '#0f172a', borderRadius: 10, borderLeftWidth: 3 },
  armyName: { fontSize: 16, fontWeight: '700' },
  armySub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
  bottomBar: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#334155', backgroundColor: '#0f172a' },
  newBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  newBtnText: { fontSize: 13, fontWeight: '700' },

  // Edit view
  editTopBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  armyNameInput: { flex: 1, fontSize: 16, fontWeight: '700', paddingVertical: 4 },
  topBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  topBtnText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  resBar: { borderBottomWidth: 1, borderBottomColor: '#334155' },
  resBox: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, margin: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, backgroundColor: '#020617' },
  resItem: { alignItems: 'center', minWidth: 52, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 6, backgroundColor: '#0f172a' },
  resLabel: { fontSize: 8, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  resValue: { fontSize: 15, fontWeight: '800', color: '#22c55e', marginTop: 1 },
  resDivider: { width: 1, height: 24, backgroundColor: '#334155' },
  resourceSourceLine: { color: '#94a3b8', fontSize: 10, fontWeight: '700', paddingHorizontal: 10, paddingBottom: 6, lineHeight: 14 },
  minRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  minLabel: { fontSize: 12, color: '#64748b' },
  minInput: { backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, color: '#e5e7eb', fontSize: 14, borderWidth: 1, borderColor: '#334155', width: 80, textAlign: 'center' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155' },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 8 },
  hint: { fontSize: 12, color: '#475569', fontStyle: 'italic', padding: 12 },
  cardRow: { padding: 12, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
  cardSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  cardBadge: { fontSize: 11, fontWeight: '700' },
  cardToolsRow: { marginBottom: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#020617', flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardToolsTitle: { color: '#e5e7eb', fontSize: 13, fontWeight: '900' },
  cardToolsMeta: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  cardDetailsBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: '#475569', backgroundColor: '#1e293b' },
  cardDetailsText: { color: '#e5e7eb', fontSize: 11, fontWeight: '800' },

  // Boosts
  boostsContainer: { marginTop: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#1e293b' },
  boostRow: { marginBottom: 3 },
  boostName: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  boostDesc: { fontSize: 10, color: '#64748b', lineHeight: 14, marginTop: 1 },
  abilityRow: { paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#1e293b' },
  abilityMeta: { fontSize: 10, color: '#38bdf8', fontWeight: '800', marginTop: 2, lineHeight: 14 },
  abilitySource: { fontSize: 10, color: '#fbbf24', fontWeight: '700', marginTop: 2, lineHeight: 14 },

  // Warning banner
  warningBanner: { backgroundColor: '#ef444420', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#ef4444' },
  warningText: { fontSize: 12, fontWeight: '700', color: '#ef4444', textAlign: 'center' },

  // Game card selection
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  filterChipActive: { borderColor: '#f59e0b', backgroundColor: '#f59e0b20' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  filterChipTextActive: { color: '#f59e0b' },
  gameCardRow: { padding: 10, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 4 },
  selectedGameCard: { padding: 12, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1.5, marginBottom: 6, flexDirection: 'row', alignItems: 'center' },
  communityTag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: '#f59e0b20' },
  communityTagText: { fontSize: 9, fontWeight: '700', color: '#f59e0b' },
  communityAuthor: { fontSize: 10, color: '#64748b', marginTop: 2, fontStyle: 'italic' },
  deselectHint: { fontSize: 10, color: '#64748b', fontStyle: 'italic' },

  // Roster
  rosterCard: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginBottom: 8, overflow: 'hidden' },
  rosterHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  rosterName: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
  rosterSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: '#ef444420' },
  removeBtnText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  switchBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: '#a855f720', borderWidth: 1, borderColor: '#a855f7' },
  switchBtnText: { fontSize: 11, fontWeight: '700', color: '#a855f7' },
  clearAllBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', marginBottom: 8 },
  clearAllBtnText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  innateSection: { paddingHorizontal: 12, paddingBottom: 6 },
  innateSectionLabel: { fontSize: 9, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 2 },
  innateText: { fontSize: 11, color: '#64748b', lineHeight: 16 },
  upgradesSection: { padding: 8, paddingTop: 0, gap: 4 },
  upgSectionLabel: { fontSize: 9, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0, marginBottom: 4, paddingHorizontal: 2 },
  upgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#334155', backgroundColor: '#1e293b' },
  upgName: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  upgCost: { fontSize: 11, color: '#eab308' },
  addUnitBtn: { padding: 14, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  addUnitBtnText: { fontSize: 14, fontWeight: '700' },

  // Add unit
  searchBarInner: { paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#e5e7eb', fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  unitPickCard: { marginHorizontal: 12, marginTop: 8, padding: 12, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  unitPickName: { fontSize: 15, fontWeight: '700' },
  unitPickSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  unitAbilityPreview: { color: '#38bdf8', fontSize: 10, lineHeight: 14, marginTop: 5, fontWeight: '700' },
  unitPickActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sizeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#38bdf8' },
  sizeBtnText: { fontSize: 12, fontWeight: '700', color: '#38bdf8' },

  // Import
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 8 },
  importInput: { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: '#334155', height: 200, textAlignVertical: 'top' },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },

  // Tactical card +/- control buttons
  tcControlBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const },
});
