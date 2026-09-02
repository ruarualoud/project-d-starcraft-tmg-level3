import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { useData } from '@/lib/data-context';
import { useI18n } from '@/lib/i18n';
import { calculateMatchup, type CombatResult, type MatchupResult } from '@/lib/combat-engine';
import { deriveCombatEffects, deriveUnitCombatEffects, getWeaponLoadout } from '@/lib/combat-loadout';
import { applyCardCombatEffects, parseCardCombatEffects, type CardCombatEffect } from '@/lib/card-combat-effects';
import type { ArmyList, RosterUnit, TacticalCard, UnitCard, WeaponProfile } from '@/lib/types';
import { FACTION_COLORS } from '@/lib/types';

type CombatPhaseFilter = 'all' | 'ranged' | 'melee';
type AnalysisMode = 'unit_to_roster' | 'roster_to_unit' | 'matrix';

type GroupedRosterUnit = {
  id: string;
  representative: RosterUnit;
  members: RosterUnit[];
  count: number;
  name: string;
  unitId: string;
  size: 'small' | 'large';
  upgradeSignature: string;
};

type WeaponWithSources = {
  weapon: WeaponProfile;
  upgradeNotes: string[];
  cardNotes: string[];
};

type DirectionAnalysis = {
  attackerUnitNotes: string[];
  attackerCardNotes: string[];
  defenderUnitNotes: string[];
  defenderCardNotes: string[];
  weaponSources: Record<string, { upgradeNotes: string[]; cardNotes: string[] }>;
};

type PairAnalysis = {
  aToB: DirectionAnalysis;
  bToA: DirectionAnalysis;
};

type PairRowBase = {
  id: string;
  result: MatchupResult;
  analysis: PairAnalysis;
  advantage: number;
};

type UnitToRosterRow = PairRowBase & { target: GroupedRosterUnit };
type RosterToUnitRow = PairRowBase & { source: GroupedRosterUnit };
type MatrixRow = PairRowBase & { source: GroupedRosterUnit; target: GroupedRosterUnit };

function uniq(items: string[]): string[] {
  return items.filter((item, index) => !!item && items.indexOf(item) === index);
}

function formatNum(value: number): string {
  return value.toFixed(1);
}

function safeRounds(value: number): number {
  return Number.isFinite(value) ? value : 9999;
}

function isWeaponMelee(w: WeaponProfile): boolean {
  const range = (w.range || '').toLowerCase().trim();
  if (range === 'melee' || range === '0' || range === '-' || range === '') return true;
  return (w.phase || '').toLowerCase() === 'combat';
}

function isWeaponRanged(w: WeaponProfile): boolean {
  return !isWeaponMelee(w);
}

function getFilteredWeapons(all: WeaponProfile[], phaseFilter: CombatPhaseFilter): WeaponProfile[] {
  if (phaseFilter === 'ranged') return all.filter(isWeaponRanged);
  if (phaseFilter === 'melee') return all.filter(isWeaponMelee);
  return all;
}

function normalizeUpgradeSignature(activeUpgrades: number[]): string {
  return [...activeUpgrades].sort((a, b) => a - b).join(',');
}

function groupRosterUnits(army: ArmyList | null): GroupedRosterUnit[] {
  if (!army) return [];
  const grouped = new Map<string, GroupedRosterUnit>();
  army.roster.forEach((ru, index) => {
    const upgradeSignature = normalizeUpgradeSignature(ru.activeUpgrades || []);
    const key = `${ru.unitId}__${ru.size}__${upgradeSignature}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.members.push(ru);
      existing.count += 1;
      return;
    }
    grouped.set(key, {
      id: `${key}__${index}`,
      representative: ru,
      members: [ru],
      count: 1,
      name: ru.name,
      unitId: ru.unitId,
      size: ru.size,
      upgradeSignature,
    });
  });

  return [...grouped.values()].sort((a, b) => {
    const nameCmp = a.name.localeCompare(b.name);
    if (nameCmp !== 0) return nameCmp;
    if (a.size !== b.size) return a.size.localeCompare(b.size);
    return a.upgradeSignature.localeCompare(b.upgradeSignature);
  });
}

function formatGroupedName(group: GroupedRosterUnit | null | undefined): string {
  if (!group) return '';
  return group.count > 1 ? `${group.name} ×${group.count}` : group.name;
}

function getProfileModels(unit: UnitCard, size: 'small' | 'large'): number {
  return (size === 'small' ? unit.smallProfile : unit.largeProfile)?.models || 1;
}

function computeAdvantage(result: MatchupResult): number {
  return safeRounds(result.roundsToKillA) - safeRounds(result.roundsToKillB);
}

function formatRoundsLabel(value: number, infinityLabel: string): string {
  return Number.isFinite(value) ? value.toFixed(1) : infinityLabel;
}

function resultTone(advantage: number) {
  if (advantage >= 1) return styles.resultGood;
  if (advantage <= -1) return styles.resultBad;
  return styles.resultNeutral;
}

function getArmyCards(army: ArmyList | null, cards: TacticalCard[]): TacticalCard[] {
  if (!army) return [];
  const ids = [army.factionCardId, ...army.tacticalCardIds].filter(Boolean) as string[];
  return ids.map(id => cards.find(card => card.id === id)).filter(Boolean) as TacticalCard[];
}

function toWeaponSourceMap(weapons: WeaponWithSources[]): Record<string, { upgradeNotes: string[]; cardNotes: string[] }> {
  return Object.fromEntries(
    weapons.map(item => [item.weapon.name || 'Unnamed Weapon', { upgradeNotes: item.upgradeNotes, cardNotes: item.cardNotes }]),
  );
}

function ArmyPicker({ label, placeholder, armies, value, onChange }: {
  label: string;
  placeholder: string;
  armies: ArmyList[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = armies.find(army => army.id === value);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Pressable onPress={() => setExpanded(prev => !prev)} style={({ pressed }) => [styles.pickerBtn, pressed && styles.pressed]}>
        <Text style={styles.pickerText}>{selected ? `${selected.name} (${selected.faction})` : placeholder}</Text>
        <Text style={styles.pickerChevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.pickerDropdown}>
          {armies.map(army => (
            <Pressable key={army.id} onPress={() => { onChange(army.id); setExpanded(false); }} style={({ pressed }) => [styles.pickerItem, pressed && styles.pickerPressed]}>
              <Text style={[styles.pickerItemText, { color: FACTION_COLORS[army.faction] }]}>{army.name}</Text>
              <Text style={styles.pickerItemSub}>{army.faction} · {army.roster.length}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function RosterUnitPicker({ label, placeholder, groups, value, onChange }: {
  label: string;
  placeholder: string;
  groups: GroupedRosterUnit[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = groups.find(group => group.id === value);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Pressable onPress={() => setExpanded(prev => !prev)} style={({ pressed }) => [styles.pickerBtn, pressed && styles.pressed]}>
        <Text style={styles.pickerText}>{selected ? `${formatGroupedName(selected)} (${selected.size})` : placeholder}</Text>
        <Text style={styles.pickerChevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.pickerDropdown}>
          {groups.map(group => (
            <Pressable key={group.id} onPress={() => { onChange(group.id); setExpanded(false); }} style={({ pressed }) => [styles.pickerItem, pressed && styles.pickerPressed]}>
              <View style={styles.groupTitleRow}>
                <Text style={styles.pickerItemText}>{formatGroupedName(group)}</Text>
                {group.count > 1 && <Text style={styles.groupCountText}>×{group.count}</Text>}
              </View>
              <Text style={styles.pickerItemSub}>{group.representative.unitType} · {group.size} · {group.representative.activeUpgrades.length}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function SourceBadge({ text, tone }: { text: string; tone: 'upgrade' | 'card' | 'attacker' | 'defender' | 'weapon' | 'count' }) {
  const toneStyle = tone === 'upgrade'
    ? styles.badgeUpgrade
    : tone === 'card'
    ? styles.badgeCard
    : tone === 'attacker'
    ? styles.badgeAttacker
    : tone === 'defender'
    ? styles.badgeDefender
    : tone === 'count'
    ? styles.badgeCount
    : styles.badgeWeapon;

  return (
    <View style={[styles.badge, toneStyle]}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function SourceNotesBlock({ title, notes, badgeText, badgeTone }: {
  title: string;
  notes: string[];
  badgeText: string;
  badgeTone: 'upgrade' | 'card' | 'attacker' | 'defender' | 'weapon' | 'count';
}) {
  if (notes.length === 0) return null;

  const toneStyle = badgeTone === 'upgrade'
    ? styles.sourceBlockUpgrade
    : badgeTone === 'card'
    ? styles.sourceBlockCard
    : styles.sourceBlockNeutral;

  return (
    <View style={[styles.sourceBlock, toneStyle]}>
      <View style={styles.sourceHeader}>
        <Text style={styles.sourceBlockTitle}>{title}</Text>
        <SourceBadge text={badgeText} tone={badgeTone} />
      </View>
      {notes.map((note, index) => (
        <Text key={`${title}-${index}`} style={styles.sourceBlockLine}>• {note}</Text>
      ))}
    </View>
  );
}

function WeaponBreakdown({ weaponName, result, upgradeNotes, cardNotes, t }: {
  weaponName: string;
  result: CombatResult;
  upgradeNotes: string[];
  cardNotes: string[];
  t: (key: any) => string;
}) {
  const hasSourceNotes = upgradeNotes.length > 0 || cardNotes.length > 0;

  return (
    <View style={styles.weaponBox}>
      <View style={styles.weaponHeader}>
        <Text style={styles.weaponTitle}>{weaponName}</Text>
        <View style={styles.weaponHeaderRight}>
          <SourceBadge text={t('sourceTagWeapon')} tone="weapon" />
          <Text style={styles.weaponDamage}>{formatNum(result.expectedTotalDamage)} {t('damageUnitLabel')}</Text>
        </View>
      </View>

      <Text style={styles.weaponFormula}>
        {t('hitBreakdown')} = {formatNum(result.expectedHits)} = {formatNum(result.baseExpectedHits)} {t('naturalLabel')} + {formatNum(result.bonusExpectedHits)} {t('adjustmentLabel')}
      </Text>
      <Text style={styles.weaponFormula}>
        {t('damagePoolLabel')} = {formatNum(result.expectedDamagePoolDice)} = {formatNum(result.expectedBypassedDamagePoolDice)} {t('bypassArmorLabel')} + {formatNum(result.expectedDamagePoolFromArmour)} {t('failedArmorLabel')} - {formatNum(result.expectedEvadeSaves)} {t('evadeLabelLower')}
      </Text>
      <Text style={styles.weaponFormula}>
        {t('totalDamage')} = {formatNum(result.expectedTotalDamage)} = {formatNum(result.expectedDamagePoolDice)} {t('damagePoolLabel')} × {formatNum(result.damagePerDie)} {t('damagePerDieLabel')}
      </Text>
      <Text style={styles.weaponFormula}>
        {t('bypassBreakdownLabel')} = {formatNum(result.expectedBypassedDamagePoolDice)} = {formatNum(result.expectedSurgeBypassed)} Surge + {formatNum(result.expectedCriticalBypassed)} Critical
      </Text>

      {hasSourceNotes && (
        <View style={styles.weaponSourceRow}>
          <SourceNotesBlock title={t('weaponUnitUpgradeSource')} notes={upgradeNotes} badgeText={t('sourceTagUnitUpgrade')} badgeTone="upgrade" />
          <SourceNotesBlock title={t('weaponCardBuildingSource')} notes={cardNotes} badgeText={t('sourceTagCardBuilding')} badgeTone="card" />
        </View>
      )}

      {result.activeKeywords.length > 0 && (
        <View style={styles.keywordBox}>
          <Text style={styles.keywordTitle}>{t('activeKeywordSection')}</Text>
          {result.activeKeywords.map((keyword, index) => (
            <Text key={`${keyword.name}-${index}`} style={styles.keywordLine}>{keyword.name}: {keyword.effect}</Text>
          ))}
        </View>
      )}

      <View style={styles.stepBox}>
        {result.steps.map((step, index) => (
          <Text key={`${step.step}-${index}`} style={styles.stepLine}>{step.label}: {step.description}</Text>
        ))}
      </View>
    </View>
  );
}

function DirectionPanel({ title, subtitle, direction, weaponResults, t }: {
  title: string;
  subtitle: string;
  direction: DirectionAnalysis;
  weaponResults: { weaponName: string; result: CombatResult }[];
  t: (key: any) => string;
}) {
  const hasDirectionSources =
    direction.attackerUnitNotes.length > 0 ||
    direction.attackerCardNotes.length > 0 ||
    direction.defenderUnitNotes.length > 0 ||
    direction.defenderCardNotes.length > 0;

  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>{title}</Text>
      <Text style={styles.detailSectionSub}>{subtitle}</Text>

      {hasDirectionSources && (
        <View style={styles.directionSources}>
          <SourceNotesBlock title={t('attackerUnitUpgradeSource')} notes={direction.attackerUnitNotes} badgeText={`${t('sourceTagAttacker')} · ${t('sourceTagUnitUpgrade')}`} badgeTone="attacker" />
          <SourceNotesBlock title={t('attackerCardBuildingSource')} notes={direction.attackerCardNotes} badgeText={`${t('sourceTagAttacker')} · ${t('sourceTagCardBuilding')}`} badgeTone="card" />
          <SourceNotesBlock title={t('defenderUnitUpgradeSource')} notes={direction.defenderUnitNotes} badgeText={`${t('sourceTagDefender')} · ${t('sourceTagUnitUpgrade')}`} badgeTone="defender" />
          <SourceNotesBlock title={t('defenderCardBuildingSource')} notes={direction.defenderCardNotes} badgeText={`${t('sourceTagDefender')} · ${t('sourceTagCardBuilding')}`} badgeTone="card" />
        </View>
      )}

      {weaponResults.map(item => {
        const sources = direction.weaponSources[item.weaponName] || { upgradeNotes: [], cardNotes: [] };
        return (
          <WeaponBreakdown
            key={`${title}-${item.weaponName}`}
            weaponName={item.weaponName}
            result={item.result}
            upgradeNotes={sources.upgradeNotes}
            cardNotes={sources.cardNotes}
            t={t}
          />
        );
      })}
    </View>
  );
}

function PairDetailPanel({ title, result, analysis, t }: {
  title: string;
  result: MatchupResult;
  analysis: PairAnalysis;
  t: (key: any) => string;
}) {
  const infinityLabel = t('infinity');
  return (
    <View style={styles.detailPanel}>
      <Text style={styles.detailTitle}>{title}</Text>
      <Text style={styles.detailSummary}>{result.summary}</Text>

      <DirectionPanel
        title={`${result.unitAName} → ${result.unitBName}`}
        subtitle={`${t('totalDamage')} ${formatNum(result.totalDmgAtoB)} ${t('perRound')} · ${t('killsPerRoundShort')} ${formatNum(result.totalKillsAtoB)} ${t('perRound')} · ${t('roundsToKillShort')} ${formatRoundsLabel(result.roundsToKillB, infinityLabel)}`}
        direction={analysis.aToB}
        weaponResults={result.aToBResults}
        t={t}
      />
      <DirectionPanel
        title={`${result.unitBName} → ${result.unitAName}`}
        subtitle={`${t('totalDamage')} ${formatNum(result.totalDmgBtoA)} ${t('perRound')} · ${t('killsPerRoundShort')} ${formatNum(result.totalKillsBtoA)} ${t('perRound')} · ${t('roundsToKillShort')} ${formatRoundsLabel(result.roundsToKillA, infinityLabel)}`}
        direction={analysis.bToA}
        weaponResults={result.bToAResults}
        t={t}
      />
    </View>
  );
}

export function RosterAnalysisPanel({ initialArmyAId, initialArmyBId }: { initialArmyAId?: string; initialArmyBId?: string }) {
  const { armyLists, units, cards } = useData();
  const { t } = useI18n();

  const [armyAId, setArmyAId] = useState(initialArmyAId || '');
  const [armyBId, setArmyBId] = useState(initialArmyBId || '');
  const [mode, setMode] = useState<AnalysisMode>('unit_to_roster');
  const [phaseFilter, setPhaseFilter] = useState<CombatPhaseFilter>('all');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [chargeA, setChargeA] = useState(false);
  const [chargeB, setChargeB] = useState(false);
  const [targetVisible, setTargetVisible] = useState(true);
  const [targetEngaged, setTargetEngaged] = useState(false);
  const [targetMoved, setTargetMoved] = useState(false);
  const [manualEvadeA, setManualEvadeA] = useState(false);
  const [manualEvadeB, setManualEvadeB] = useState(false);
  const [selectedCardEffectsA, setSelectedCardEffectsA] = useState<string[]>([]);
  const [selectedCardEffectsB, setSelectedCardEffectsB] = useState<string[]>([]);
  const [expandedPairId, setExpandedPairId] = useState<string | null>(null);
  const [selectedMatrixPairId, setSelectedMatrixPairId] = useState<string | null>(null);

  useEffect(() => {
    if (initialArmyAId) setArmyAId(initialArmyAId);
    if (initialArmyBId) setArmyBId(initialArmyBId);
  }, [initialArmyAId, initialArmyBId]);

  const armyA = useMemo(() => armyLists.find(army => army.id === armyAId) || null, [armyLists, armyAId]);
  const armyB = useMemo(() => armyLists.find(army => army.id === armyBId) || null, [armyLists, armyBId]);
  const groupedArmyA = useMemo(() => groupRosterUnits(armyA), [armyA]);
  const groupedArmyB = useMemo(() => groupRosterUnits(armyB), [armyB]);

  useEffect(() => {
    if (!selectedSourceId && groupedArmyA[0]) setSelectedSourceId(groupedArmyA[0].id);
    if (selectedSourceId && !groupedArmyA.find(group => group.id === selectedSourceId)) setSelectedSourceId(groupedArmyA[0]?.id || '');
  }, [groupedArmyA, selectedSourceId]);

  useEffect(() => {
    if (!selectedTargetId && groupedArmyB[0]) setSelectedTargetId(groupedArmyB[0].id);
    if (selectedTargetId && !groupedArmyB.find(group => group.id === selectedTargetId)) setSelectedTargetId(groupedArmyB[0]?.id || '');
  }, [groupedArmyB, selectedTargetId]);

  const cardsA = useMemo(() => getArmyCards(armyA, cards), [armyA, cards]);
  const cardsB = useMemo(() => getArmyCards(armyB, cards), [armyB, cards]);
  const effectsA = useMemo(() => parseCardCombatEffects(cardsA), [cardsA]);
  const effectsB = useMemo(() => parseCardCombatEffects(cardsB), [cardsB]);
  const enabledEffectsA = useMemo(() => effectsA.filter(effect => selectedCardEffectsA.includes(effect.id)), [effectsA, selectedCardEffectsA]);
  const enabledEffectsB = useMemo(() => effectsB.filter(effect => selectedCardEffectsB.includes(effect.id)), [effectsB, selectedCardEffectsB]);

  const effectLabel = (effect: CardCombatEffect): string => {
    const phase = effect.attackKinds.length === 1 ? (effect.attackKinds[0] === 'ranged' ? t('ranged') : t('melee')) : t('all');
    const impact = effect.weaponKeywords?.join(', ') || effect.unitKeywords?.join(', ') || effect.description;
    return `${effect.sourceCardName} / ${effect.boostName} · ${phase} · ${impact}`;
  };

  function resolveCombatSide(group: GroupedRosterUnit, side: 'A' | 'B') {
    const unit = units.find(item => item.id === group.unitId);
    if (!unit) return null;
    const rosterUnit = group.representative;
    const selectedUpgrades = rosterUnit.activeUpgrades || [];
    const attackEffects = side === 'A' ? enabledEffectsA.filter(effect => effect.appliesTo === 'attacker') : enabledEffectsB.filter(effect => effect.appliesTo === 'attacker');

    const unitEffects = deriveUnitCombatEffects({
      unit,
      selectedUpgradeIndexes: selectedUpgrades,
      attackKind: phaseFilter === 'melee' ? 'melee' : 'ranged',
      sourceUnitEngaged: targetEngaged,
    });

    const boostedUnit = applyCardCombatEffects({
      baseUnitKeywords: unitEffects.unitKeywords || unit.keywords || '',
      baseWeaponKeywords: '',
      selectedEffects: attackEffects,
      unit,
      attackKind: phaseFilter === 'melee' ? 'melee' : 'ranged',
    });

    const allWeapons = getWeaponLoadout(unit, selectedUpgrades).map(item => {
      const attackKind = isWeaponMelee(item.weapon) ? 'melee' as const : 'ranged' as const;
      const derived = deriveCombatEffects({
        unit,
        selectedUpgradeIndexes: selectedUpgrades,
        selectedWeapon: item.weapon,
        attackKind,
        sourceUnitEngaged: targetEngaged,
      });
      const boostedWeapon = applyCardCombatEffects({
        baseUnitKeywords: boostedUnit.unitKeywords,
        baseWeaponKeywords: derived.weaponKeywords,
        selectedEffects: attackEffects,
        unit,
        attackKind,
      });
      return {
        weapon: { ...item.weapon, keywords: boostedWeapon.weaponKeywords },
        upgradeNotes: uniq(derived.notes.filter(note => !unitEffects.notes.includes(note))),
        cardNotes: boostedWeapon.notes,
      };
    });

    const filteredWeapons = getFilteredWeapons(allWeapons.map(item => item.weapon), phaseFilter);
    const filteredWeaponSources = filteredWeapons.map(weapon => {
      const source = allWeapons.find(item => item.weapon.name === weapon.name && item.weapon.range === weapon.range) || { upgradeNotes: [], cardNotes: [] };
      return { weapon, upgradeNotes: source.upgradeNotes, cardNotes: source.cardNotes };
    });

    return {
      unit,
      group,
      models: getProfileModels(unit, rosterUnit.size),
      unitKeywords: boostedUnit.unitKeywords,
      explicitEvade: unitEffects.explicitEvade,
      weapons: filteredWeapons,
      weaponSources: filteredWeaponSources,
      unitEffectNotes: unitEffects.notes,
      attackCardNotes: boostedUnit.notes,
    };
  }

  function computePair(sourceGroup: GroupedRosterUnit, targetGroup: GroupedRosterUnit): { result: MatchupResult; analysis: PairAnalysis } | null {
    const source = resolveCombatSide(sourceGroup, 'A');
    const target = resolveCombatSide(targetGroup, 'B');
    if (!source || !target) return null;

    const defenderBoost = applyCardCombatEffects({
      baseUnitKeywords: target.unitKeywords,
      baseWeaponKeywords: '',
      selectedEffects: enabledEffectsB.filter(effect => effect.appliesTo === 'defender'),
      unit: target.unit,
      attackKind: phaseFilter === 'melee' ? 'melee' : 'ranged',
    });
    const attackerDefenderBoost = applyCardCombatEffects({
      baseUnitKeywords: source.unitKeywords,
      baseWeaponKeywords: '',
      selectedEffects: enabledEffectsA.filter(effect => effect.appliesTo === 'defender'),
      unit: source.unit,
      attackKind: phaseFilter === 'melee' ? 'melee' : 'ranged',
    });

    const result = calculateMatchup({
      unitAName: formatGroupedName(sourceGroup),
      unitAWeapons: source.weapons,
      unitAModels: source.models,
      unitAStats: source.unit.stats,
      unitAKeywords: attackerDefenderBoost.unitKeywords,
      unitATags: source.unit.tags || '',
      unitAConfig: {
        isCharge: chargeA,
        defenderCanEvade: manualEvadeB || target.explicitEvade,
        targetEngaged,
        targetVisible,
        targetMovedThisRound: targetMoved,
      },
      unitBName: formatGroupedName(targetGroup),
      unitBWeapons: target.weapons,
      unitBModels: target.models,
      unitBStats: target.unit.stats,
      unitBKeywords: defenderBoost.unitKeywords,
      unitBTags: target.unit.tags || '',
      unitBConfig: {
        isCharge: chargeB,
        defenderCanEvade: manualEvadeA || source.explicitEvade,
        targetEngaged,
        targetVisible,
        targetMovedThisRound: targetMoved,
      },
    });

    return {
      result,
      analysis: {
        aToB: {
          attackerUnitNotes: source.unitEffectNotes,
          attackerCardNotes: source.attackCardNotes,
          defenderUnitNotes: target.unitEffectNotes,
          defenderCardNotes: defenderBoost.notes,
          weaponSources: toWeaponSourceMap(source.weaponSources),
        },
        bToA: {
          attackerUnitNotes: target.unitEffectNotes,
          attackerCardNotes: target.attackCardNotes,
          defenderUnitNotes: source.unitEffectNotes,
          defenderCardNotes: attackerDefenderBoost.notes,
          weaponSources: toWeaponSourceMap(target.weaponSources),
        },
      },
    };
  }

  const selectedSourceGroup = useMemo(() => groupedArmyA.find(group => group.id === selectedSourceId) || null, [groupedArmyA, selectedSourceId]);
  const selectedTargetGroup = useMemo(() => groupedArmyB.find(group => group.id === selectedTargetId) || null, [groupedArmyB, selectedTargetId]);

  const unitToRosterRows = useMemo(() => {
    if (!selectedSourceGroup) return [] as UnitToRosterRow[];
    return groupedArmyB.map(target => {
      const pair = computePair(selectedSourceGroup, target);
      if (!pair) return null;
      return {
        id: `${selectedSourceGroup.id}__${target.id}`,
        target,
        result: pair.result,
        analysis: pair.analysis,
        advantage: computeAdvantage(pair.result),
      };
    }).filter(Boolean).sort((a, b) => safeRounds(a!.result.roundsToKillB) - safeRounds(b!.result.roundsToKillB)) as UnitToRosterRow[];
  }, [selectedSourceGroup, groupedArmyB, phaseFilter, chargeA, chargeB, targetVisible, targetEngaged, targetMoved, manualEvadeA, manualEvadeB, enabledEffectsA, enabledEffectsB, units]);

  const rosterToUnitRows = useMemo(() => {
    if (!selectedTargetGroup) return [] as RosterToUnitRow[];
    return groupedArmyA.map(source => {
      const pair = computePair(source, selectedTargetGroup);
      if (!pair) return null;
      return {
        id: `${source.id}__${selectedTargetGroup.id}`,
        source,
        result: pair.result,
        analysis: pair.analysis,
        advantage: computeAdvantage(pair.result),
      };
    }).filter(Boolean).sort((a, b) => b!.advantage - a!.advantage) as RosterToUnitRow[];
  }, [selectedTargetGroup, groupedArmyA, phaseFilter, chargeA, chargeB, targetVisible, targetEngaged, targetMoved, manualEvadeA, manualEvadeB, enabledEffectsA, enabledEffectsB, units]);

  const matrixRows = useMemo(() => {
    const rows: MatrixRow[] = [];
    groupedArmyA.forEach(source => {
      groupedArmyB.forEach(target => {
        const pair = computePair(source, target);
        if (!pair) return;
        rows.push({ id: `${source.id}__${target.id}`, source, target, result: pair.result, analysis: pair.analysis, advantage: computeAdvantage(pair.result) });
      });
    });
    return rows;
  }, [groupedArmyA, groupedArmyB, phaseFilter, chargeA, chargeB, targetVisible, targetEngaged, targetMoved, manualEvadeA, manualEvadeB, enabledEffectsA, enabledEffectsB, units]);

  const bestOverallSource = useMemo(() => {
    if (matrixRows.length === 0) return null;
    return groupedArmyA
      .map(group => {
        const rows = matrixRows.filter(row => row.source.id === group.id);
        const averageAdvantage = rows.reduce((sum, row) => sum + row.advantage, 0) / Math.max(rows.length, 1);
        return { group, averageAdvantage };
      })
      .sort((a, b) => b.averageAdvantage - a.averageAdvantage)[0] || null;
  }, [groupedArmyA, matrixRows]);

  const mostDangerousToSelected = useMemo(() => {
    if (mode !== 'unit_to_roster' || unitToRosterRows.length === 0) return null;
    return [...unitToRosterRows].sort((a, b) => safeRounds(a.result.roundsToKillA) - safeRounds(b.result.roundsToKillA))[0] || null;
  }, [mode, unitToRosterRows]);

  const bestCounterToSelectedTarget = useMemo(() => {
    if (mode !== 'roster_to_unit' || rosterToUnitRows.length === 0) return null;
    return [...rosterToUnitRows].sort((a, b) => safeRounds(a.result.roundsToKillB) - safeRounds(b.result.roundsToKillB))[0] || null;
  }, [mode, rosterToUnitRows]);

  const highestDamageToSelectedTarget = useMemo(() => {
    if (mode !== 'roster_to_unit' || rosterToUnitRows.length === 0) return null;
    return [...rosterToUnitRows].sort((a, b) => b.result.totalDmgAtoB - a.result.totalDmgAtoB)[0] || null;
  }, [mode, rosterToUnitRows]);

  const selectedMatrixRow = useMemo(() => matrixRows.find(row => row.id === selectedMatrixPairId) || null, [matrixRows, selectedMatrixPairId]);

  const toggleEffect = (side: 'A' | 'B', effectId: string) => {
    if (side === 'A') {
      setSelectedCardEffectsA(prev => prev.includes(effectId) ? prev.filter(id => id !== effectId) : [...prev, effectId]);
      return;
    }
    setSelectedCardEffectsB(prev => prev.includes(effectId) ? prev.filter(id => id !== effectId) : [...prev, effectId]);
  };

  const infinityLabel = t('infinity');

  return (
    <ScrollView style={styles.container}>
      <ArmyPicker label={t('myArmyRoster')} placeholder={t('chooseArmy')} armies={armyLists} value={armyAId} onChange={setArmyAId} />
      <ArmyPicker label={t('enemyArmyRoster')} placeholder={t('chooseArmy')} armies={armyLists} value={armyBId} onChange={setArmyBId} />

      <View style={styles.modeRow}>
        {([
          ['unit_to_roster', t('unitToRoster')],
          ['roster_to_unit', t('rosterToUnit')],
          ['matrix', t('rosterToRoster')],
        ] as Array<[AnalysisMode, string]>).map(([key, label]) => (
          <Pressable key={key} onPress={() => setMode(key)} style={({ pressed }) => [styles.modeBtn, mode === key && styles.modeBtnActive, pressed && styles.pressed]}>
            <Text style={[styles.modeBtnText, mode === key && styles.modeBtnTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.modeRow}>
        {([
          ['all', t('all')],
          ['ranged', t('ranged')],
          ['melee', t('melee')],
        ] as Array<[CombatPhaseFilter, string]>).map(([key, label]) => (
          <Pressable key={key} onPress={() => setPhaseFilter(key)} style={({ pressed }) => [styles.modeBtn, phaseFilter === key && styles.modeBtnActive, pressed && styles.pressed]}>
            <Text style={[styles.modeBtnText, phaseFilter === key && styles.modeBtnTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.toggleGrid}>
        <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{t('treatAAsCharging')}</Text><Switch value={chargeA} onValueChange={setChargeA} /></View>
        <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{t('treatBAsCharging')}</Text><Switch value={chargeB} onValueChange={setChargeB} /></View>
        <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{t('targetVisible')}</Text><Switch value={targetVisible} onValueChange={setTargetVisible} /></View>
        <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{t('targetEngagedShort')}</Text><Switch value={targetEngaged} onValueChange={setTargetEngaged} /></View>
        <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{t('targetMovedThisRound')}</Text><Switch value={targetMoved} onValueChange={setTargetMoved} /></View>
        <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{t('manualEvadeA')}</Text><Switch value={manualEvadeA} onValueChange={setManualEvadeA} /></View>
        <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{t('manualEvadeB')}</Text><Switch value={manualEvadeB} onValueChange={setManualEvadeB} /></View>
      </View>

      {!!armyA && !!armyB && (
        <>
          {mode === 'unit_to_roster' && <RosterUnitPicker label={t('chooseSourceUnit')} placeholder={t('chooseUnit')} groups={groupedArmyA} value={selectedSourceId} onChange={setSelectedSourceId} />}
          {mode === 'roster_to_unit' && <RosterUnitPicker label={t('chooseTargetUnit')} placeholder={t('chooseUnit')} groups={groupedArmyB} value={selectedTargetId} onChange={setSelectedTargetId} />}

          <View style={styles.effectsSection}>
            <Text style={styles.effectsTitle}>{t('tacticalBuildingEffects')}</Text>
            <Text style={styles.effectsHint}>{t('layerOneEffectsHint')}</Text>
            <Text style={styles.effectsSideTitle}>{t('availableEffectsA')}</Text>
            {effectsA.length === 0 && <Text style={styles.effectsEmpty}>{t('noLayerOneEffects')}</Text>}
            {effectsA.map(effect => (
              <Pressable key={effect.id} onPress={() => toggleEffect('A', effect.id)} style={({ pressed }) => [styles.effectItem, pressed && styles.pressed]}>
                <View style={styles.effectTextWrap}>
                  <Text style={styles.effectItemTitle}>{effectLabel(effect)}</Text>
                  <Text style={styles.effectItemDesc}>{effect.description}</Text>
                </View>
                <Switch value={selectedCardEffectsA.includes(effect.id)} onValueChange={() => toggleEffect('A', effect.id)} />
              </Pressable>
            ))}
            <Text style={styles.effectsSideTitle}>{t('availableEffectsB')}</Text>
            {effectsB.length === 0 && <Text style={styles.effectsEmpty}>{t('noLayerOneEffects')}</Text>}
            {effectsB.map(effect => (
              <Pressable key={effect.id} onPress={() => toggleEffect('B', effect.id)} style={({ pressed }) => [styles.effectItem, pressed && styles.pressed]}>
                <View style={styles.effectTextWrap}>
                  <Text style={styles.effectItemTitle}>{effectLabel(effect)}</Text>
                  <Text style={styles.effectItemDesc}>{effect.description}</Text>
                </View>
                <Switch value={selectedCardEffectsB.includes(effect.id)} onValueChange={() => toggleEffect('B', effect.id)} />
              </Pressable>
            ))}
          </View>

          <View style={styles.summaryRow}>
            {bestOverallSource && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('bestOverallRosterUnit')}</Text>
                <Text style={styles.summaryValue}>{formatGroupedName(bestOverallSource.group)}</Text>
              </View>
            )}
            {bestCounterToSelectedTarget && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('bestVsCurrentTarget')}</Text>
                <Text style={styles.summaryValue}>{formatGroupedName(bestCounterToSelectedTarget.source)}</Text>
              </View>
            )}
            {highestDamageToSelectedTarget && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('highestDamageVsCurrentTarget')}</Text>
                <Text style={styles.summaryValue}>{formatGroupedName(highestDamageToSelectedTarget.source)}</Text>
              </View>
            )}
            {mostDangerousToSelected && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>{t('mostDangerousEnemyToCurrent')}</Text>
                <Text style={styles.summaryValue}>{formatGroupedName(mostDangerousToSelected.target)}</Text>
              </View>
            )}
          </View>

          {mode === 'unit_to_roster' && unitToRosterRows.map(row => {
            const expanded = expandedPairId === row.id;
            return (
              <View key={row.id} style={[styles.resultCard, resultTone(row.advantage)]}>
                <View style={styles.resultTitleRow}>
                  <Text style={styles.resultTitle}>{formatGroupedName(selectedSourceGroup)} → {formatGroupedName(row.target)}</Text>
                  {row.target.count > 1 && <SourceBadge text={`×${row.target.count}`} tone="count" />}
                </View>
                <Text style={styles.resultLine}>{t('outputPerRound')} {formatNum(row.result.totalDmgAtoB)} {t('perRound')} · {t('killsPerRoundShort')} {formatNum(row.result.totalKillsAtoB)} {t('perRound')} · {t('roundsToKillShort')} {formatRoundsLabel(row.result.roundsToKillB, infinityLabel)}</Text>
                <Text style={styles.resultLine}>{t('reverseThreat')}: {formatGroupedName(row.target)} {t('enemyCounterattack')} {formatNum(row.result.totalDmgBtoA)} {t('perRound')} · {t('myDeathClock')} {formatRoundsLabel(row.result.roundsToKillA, infinityLabel)}</Text>
                <Text style={styles.resultHint}>{row.advantage >= 0 ? t('advantageLabel') : t('disadvantageLabel')} {t('ratingLabel')}: {formatNum(row.advantage)}</Text>
                <Pressable onPress={() => setExpandedPairId(prev => prev === row.id ? null : row.id)} style={({ pressed }) => [styles.expandBtn, pressed && styles.pressed]}>
                  <Text style={styles.expandBtnText}>{expanded ? t('collapseThreePool') : t('expandThreePool')}</Text>
                </Pressable>
                {expanded && <PairDetailPanel title={`${formatGroupedName(selectedSourceGroup)} vs ${formatGroupedName(row.target)}`} result={row.result} analysis={row.analysis} t={t} />}
              </View>
            );
          })}

          {mode === 'roster_to_unit' && rosterToUnitRows.map(row => {
            const expanded = expandedPairId === row.id;
            return (
              <View key={row.id} style={[styles.resultCard, resultTone(row.advantage)]}>
                <View style={styles.resultTitleRow}>
                  <Text style={styles.resultTitle}>{formatGroupedName(row.source)} → {formatGroupedName(selectedTargetGroup)}</Text>
                  {row.source.count > 1 && <SourceBadge text={`×${row.source.count}`} tone="count" />}
                </View>
                <Text style={styles.resultLine}>{t('outputPerRound')} {formatNum(row.result.totalDmgAtoB)} {t('perRound')} · {t('killsPerRoundShort')} {formatNum(row.result.totalKillsAtoB)} {t('perRound')} · {t('roundsToKillShort')} {formatRoundsLabel(row.result.roundsToKillB, infinityLabel)}</Text>
                <Text style={styles.resultLine}>{t('reverseThreat')}: {formatGroupedName(selectedTargetGroup)} {t('enemyCounterattack')} {formatNum(row.result.totalDmgBtoA)} {t('perRound')} · {t('myDeathClock')} {formatRoundsLabel(row.result.roundsToKillA, infinityLabel)}</Text>
                <Text style={styles.resultHint}>{row.advantage >= 0 ? t('advantageLabel') : t('disadvantageLabel')} {t('ratingLabel')}: {formatNum(row.advantage)}</Text>
                <Pressable onPress={() => setExpandedPairId(prev => prev === row.id ? null : row.id)} style={({ pressed }) => [styles.expandBtn, pressed && styles.pressed]}>
                  <Text style={styles.expandBtnText}>{expanded ? t('collapseThreePool') : t('expandThreePool')}</Text>
                </Pressable>
                {expanded && <PairDetailPanel title={`${formatGroupedName(row.source)} vs ${formatGroupedName(selectedTargetGroup)}`} result={row.result} analysis={row.analysis} t={t} />}
              </View>
            );
          })}

          {mode === 'matrix' && (
            <>
              <ScrollView horizontal>
                <View>
                  <View style={styles.matrixHeaderRow}>
                    <Text style={[styles.matrixCell, styles.matrixCorner]}>{`${t('myArmyRoster')}\\${t('enemyArmyRoster')}`}</Text>
                    {groupedArmyB.map(target => (
                      <Text key={target.id} style={[styles.matrixCell, styles.matrixHeader]}>{formatGroupedName(target)}</Text>
                    ))}
                  </View>
                  {groupedArmyA.map(source => (
                    <View key={source.id} style={styles.matrixHeaderRow}>
                      <Text style={[styles.matrixCell, styles.matrixHeader]}>{formatGroupedName(source)}</Text>
                      {groupedArmyB.map(target => {
                        const row = matrixRows.find(item => item.source.id === source.id && item.target.id === target.id);
                        const selected = selectedMatrixPairId === row?.id;
                        return (
                          <Pressable
                            key={target.id}
                            onPress={() => row && setSelectedMatrixPairId(row.id)}
                            style={({ pressed }) => [styles.matrixCell, row && row.advantage >= 0 ? styles.matrixGood : styles.matrixBad, selected && styles.matrixSelected, pressed && styles.pressed]}
                          >
                            <Text style={styles.matrixValue}>{row ? formatNum(row.advantage) : '-'}</Text>
                            <Text style={styles.matrixSub}>{row ? `${formatNum(row.result.totalDmgAtoB)} ${t('damageUnitLabel')}` : ''}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              {selectedMatrixRow && <PairDetailPanel title={`${formatGroupedName(selectedMatrixRow.source)} vs ${formatGroupedName(selectedMatrixRow.target)}`} result={selectedMatrixRow.result} analysis={selectedMatrixRow.analysis} t={t} />}
            </>
          )}
        </>
      )}

      {(!armyA || !armyB) && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('noArmyLinked')}</Text>
          <Text style={styles.effectsHint}>{t('chooseArmy')}</Text>
        </View>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  bottomSpacer: { height: 40 },
  fieldWrap: { marginBottom: 10 },
  pressed: { opacity: 0.75 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  pickerText: { fontSize: 14, color: '#e5e7eb' },
  pickerChevron: { color: '#64748b', fontSize: 12 },
  pickerDropdown: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginTop: 4 },
  pickerPressed: { backgroundColor: '#1e293b' },
  pickerItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  pickerItemText: { fontSize: 14, color: '#e5e7eb', fontWeight: '600' },
  pickerItemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  groupTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  groupCountText: { fontSize: 11, fontWeight: '800', color: '#93c5fd' },
  modeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  modeBtnActive: { borderColor: '#38bdf8', backgroundColor: '#38bdf810' },
  modeBtnText: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  modeBtnTextActive: { color: '#38bdf8' },
  toggleGrid: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', padding: 12, marginBottom: 12, gap: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  toggleLabel: { fontSize: 12, color: '#cbd5e1', flex: 1 },
  effectsSection: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', padding: 12, marginBottom: 12 },
  effectsTitle: { fontSize: 15, fontWeight: '800', color: '#e5e7eb' },
  effectsHint: { fontSize: 11, color: '#64748b', marginTop: 4 },
  effectsSideTitle: { fontSize: 12, fontWeight: '700', color: '#38bdf8', marginTop: 12, marginBottom: 6 },
  effectsEmpty: { fontSize: 11, color: '#64748b', marginBottom: 6 },
  effectItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#1e293b' },
  effectTextWrap: { flex: 1 },
  effectItemTitle: { fontSize: 12, fontWeight: '700', color: '#e5e7eb' },
  effectItemDesc: { fontSize: 10, color: '#64748b', marginTop: 2 },
  summaryRow: { gap: 8, marginBottom: 12 },
  summaryCard: { backgroundColor: '#082f49', borderRadius: 10, borderWidth: 1, borderColor: '#0ea5e9', padding: 12 },
  summaryLabel: { fontSize: 11, color: '#7dd3fc', fontWeight: '700' },
  summaryValue: { fontSize: 16, color: '#e0f2fe', fontWeight: '800', marginTop: 4 },
  resultCard: { backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155', padding: 12, marginBottom: 10 },
  resultGood: { borderColor: '#22c55e' },
  resultBad: { borderColor: '#ef4444' },
  resultNeutral: { borderColor: '#475569' },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  resultTitle: { fontSize: 15, fontWeight: '800', color: '#e5e7eb', flex: 1 },
  resultLine: { fontSize: 12, color: '#cbd5e1', marginTop: 4 },
  resultHint: { fontSize: 11, color: '#fbbf24', marginTop: 6 },
  expandBtn: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#082f49', borderRadius: 8, borderWidth: 1, borderColor: '#38bdf8' },
  expandBtnText: { fontSize: 11, fontWeight: '700', color: '#7dd3fc' },
  detailPanel: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12, gap: 10 },
  detailTitle: { fontSize: 14, fontWeight: '800', color: '#e2e8f0' },
  detailSummary: { fontSize: 11, color: '#94a3b8' },
  detailSection: { backgroundColor: '#020617', borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', padding: 10 },
  detailSectionTitle: { fontSize: 13, fontWeight: '800', color: '#f8fafc' },
  detailSectionSub: { fontSize: 11, color: '#94a3b8', marginTop: 3, marginBottom: 8 },
  directionSources: { gap: 8, marginBottom: 8 },
  sourceBlock: { borderRadius: 8, borderWidth: 1, padding: 8 },
  sourceBlockNeutral: { backgroundColor: '#0f172a', borderColor: '#334155' },
  sourceBlockUpgrade: { backgroundColor: '#172554', borderColor: '#60a5fa' },
  sourceBlockCard: { backgroundColor: '#3f1d0d', borderColor: '#fb923c' },
  sourceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  sourceBlockTitle: { fontSize: 11, fontWeight: '700', color: '#e2e8f0', flex: 1 },
  sourceBlockLine: { fontSize: 10, color: '#f8fafc', lineHeight: 15, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeUpgrade: { backgroundColor: '#1d4ed8', borderColor: '#93c5fd' },
  badgeCard: { backgroundColor: '#9a3412', borderColor: '#fdba74' },
  badgeAttacker: { backgroundColor: '#065f46', borderColor: '#6ee7b7' },
  badgeDefender: { backgroundColor: '#7c2d12', borderColor: '#fdba74' },
  badgeWeapon: { backgroundColor: '#7f1d1d', borderColor: '#fca5a5' },
  badgeCount: { backgroundColor: '#1e3a8a', borderColor: '#93c5fd' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#f8fafc' },
  weaponBox: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', padding: 10, marginTop: 8 },
  weaponHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  weaponHeaderRight: { alignItems: 'flex-end', gap: 4 },
  weaponTitle: { fontSize: 13, fontWeight: '800', color: '#fca5a5', flex: 1 },
  weaponDamage: { fontSize: 13, fontWeight: '800', color: '#fda4af' },
  weaponFormula: { fontSize: 11, color: '#cbd5e1', marginTop: 4, lineHeight: 16 },
  weaponSourceRow: { gap: 8, marginTop: 8 },
  keywordBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1e293b' },
  keywordTitle: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  keywordLine: { fontSize: 10, color: '#f8fafc', marginTop: 3, lineHeight: 15 },
  stepBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1e293b' },
  stepLine: { fontSize: 10, color: '#94a3b8', marginTop: 3, lineHeight: 15 },
  matrixHeaderRow: { flexDirection: 'row' },
  matrixCell: { width: 110, minHeight: 54, padding: 6, borderWidth: 1, borderColor: '#334155', justifyContent: 'center' },
  matrixCorner: { backgroundColor: '#0f172a', color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  matrixHeader: { backgroundColor: '#0f172a', color: '#e5e7eb', fontSize: 11, fontWeight: '700' },
  matrixGood: { backgroundColor: '#14532d' },
  matrixBad: { backgroundColor: '#3f0d12' },
  matrixSelected: { borderColor: '#f8fafc', borderWidth: 2 },
  matrixValue: { color: '#f8fafc', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  matrixSub: { color: '#cbd5e1', fontSize: 10, textAlign: 'center', marginTop: 2 },
  emptyBox: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '700' },
});
