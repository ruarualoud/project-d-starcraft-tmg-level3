import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/lib/i18n';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, Platform, Switch, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useData } from '@/lib/data-context';
import { calculateCombatExpectation, calculateMatchup, type CombatInput, type CombatResult, type MatchupResult, type MatchupInput } from '@/lib/combat-engine';
import { deriveCombatEffects, deriveUnitCombatEffects, getOptionalUpgrades, getWeaponLoadout } from '@/lib/combat-loadout';
import type { Faction, UnitCard, WeaponProfile, UnitStats, ArmyList, RosterUnit } from '@/lib/types';
import { FACTION_COLORS } from '@/lib/types';
import * as storage from '@/lib/storage';
import type { DiceRoll } from '@/lib/types';
import { RosterAnalysisPanel } from '@/components/roster-analysis-panel';

type ToolTab = 'dice' | 'damage' | 'matchup' | 'versus' | 'roster';
const LEGACY_CALCULATOR_EXECUTION_ENABLED = false;


// ============================================================
// Helper: classify weapon as melee or ranged
// ============================================================
function isWeaponMelee(w: WeaponProfile): boolean {
  const r = (w.range || '').toLowerCase().trim();
  if (r === 'melee' || r === '0' || r === '-' || r === '') return true;
  const phase = (w.phase || '').toLowerCase();
  if (phase === 'combat') return true;
  return false;
}

function isWeaponRanged(w: WeaponProfile): boolean {
  return !isWeaponMelee(w);
}

function getUnitWeapons(unit: UnitCard): WeaponProfile[] {
  return unit.upgrades.filter(u => u.weapon).map(u => u.weapon!);
}

function getUnitMeleeWeapons(unit: UnitCard): WeaponProfile[] {
  return getUnitWeapons(unit).filter(isWeaponMelee);
}

function getUnitRangedWeapons(unit: UnitCard): WeaponProfile[] {
  return getUnitWeapons(unit).filter(isWeaponRanged);
}

// --- Dice ---
function rollDice(sides: number, count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

function DicePanel() {
  const { t } = useI18n();
  const [sides, setSides] = useState(6);
  const [count, setCount] = useState(1);
  const [results, setResults] = useState<number[]>([]);
  const [history, setHistory] = useState<{ sides: number; results: number[]; total: number }[]>([]);

  const doRoll = useCallback(() => {
    const r = rollDice(sides, count);
    setResults(r);
    const entry = { sides, results: r, total: r.reduce((a, b) => a + b, 0) };
    setHistory(prev => [entry, ...prev.slice(0, 49)]);

    const roll: DiceRoll = {
      id: Date.now().toString(36),
      dice: r.map(v => ({ value: v, sides, timestamp: Date.now() })),
      total: entry.total,
      timestamp: Date.now(),
      label: `${count}d${sides}`,
    };
    storage.addDiceRoll(roll);
  }, [sides, count]);

  const total = results.reduce((a, b) => a + b, 0);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <View style={st.configRow}>
        <View style={st.configItem}>
          <Text style={st.configLabel}>{t('diceSides')}</Text>
          <View style={st.diceOptions}>
            {[4, 6, 8, 10, 12, 20].map(d => (
              <Pressable
                key={d}
                onPress={() => setSides(d)}
                style={({ pressed }) => [st.diceOption, sides === d && st.diceOptionActive, pressed && { opacity: 0.7 }]}
              >
                <Text style={[st.diceOptionText, sides === d && st.diceOptionTextActive]}>d{d}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={st.configItem}>
          <Text style={st.configLabel}>{t('diceCount')}</Text>
          <View style={st.countRow}>
            <Pressable onPress={() => setCount(Math.max(1, count - 1))} style={({ pressed }) => [st.countBtn, pressed && { opacity: 0.7 }]}>
              <Text style={st.countBtnText}>-</Text>
            </Pressable>
            <Text style={st.countValue}>{count}</Text>
            <Pressable onPress={() => setCount(Math.min(20, count + 1))} style={({ pressed }) => [st.countBtn, pressed && { opacity: 0.7 }]}>
              <Text style={st.countBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable onPress={doRoll} style={({ pressed }) => [st.rollBtn, pressed && { transform: [{ scale: 0.97 }] }]}>
        <Text style={st.rollBtnText}>{t('rollDice')} {count}d{sides}</Text>
      </Pressable>

      {results.length > 0 && (
        <View style={st.resultBox}>
          <View style={st.diceResults}>
            {results.map((v, i) => (
              <View key={i} style={st.dieResult}>
                <Text style={st.dieValue}>{v}</Text>
              </View>
            ))}
          </View>
          <Text style={st.totalText}>{t('total')}: {total}</Text>
        </View>
      )}

      {history.length > 0 && (
        <View style={st.historySection}>
          <Text style={st.historyTitle}>{t('rollHistory')}</Text>
          {history.map((h, i) => (
            <View key={i} style={st.historyRow}>
              <Text style={st.historyLabel}>{h.results.length}d{h.sides}</Text>
              <Text style={st.historyValues}>[{h.results.join(', ')}]</Text>
              <Text style={st.historyTotal}>= {h.total}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// --- Damage Calculator (New Engine) ---
function DamagePanel() {
  const { t, unitName: uName, factionName: fName } = useI18n();
  const { units } = useData();
  const [attackerFaction, setAttackerFaction] = useState<Faction>('Terran');
  const [defenderFaction, setDefenderFaction] = useState<Faction>('Zerg');
  const [attackerId, setAttackerId] = useState<string>('');
  const [defenderId, setDefenderId] = useState<string>('');
  const [selectedWeaponIdx, setSelectedWeaponIdx] = useState(0);
  const [attackerSize, setAttackerSize] = useState<'small' | 'large'>('small');
  const [defenderSize, setDefenderSize] = useState<'small' | 'large'>('small');
  const [hitModifier, setHitModifier] = useState(0);
  const [inBurstRange, setInBurstRange] = useState(false);
  const [isCharge, setIsCharge] = useState(false);
  const [defenderCanEvade, setDefenderCanEvade] = useState(false);
  const [attackerSelectedUpgrades, setAttackerSelectedUpgrades] = useState<number[]>([]);
  const [defenderSelectedUpgrades, setDefenderSelectedUpgrades] = useState<number[]>([]);
  const [attackerEngaged, setAttackerEngaged] = useState(false);
  const [defenderEngaged, setDefenderEngaged] = useState(false);
  const [defenderVisible, setDefenderVisible] = useState(true);
  const [defenderMovedThisRound, setDefenderMovedThisRound] = useState(false);

  const attackerUnits = useMemo(() => units.filter(u => u.faction === attackerFaction), [units, attackerFaction]);
  const defenderUnits = useMemo(() => units.filter(u => u.faction === defenderFaction), [units, defenderFaction]);

  const attacker = units.find(u => u.id === attackerId);
  const defender = units.find(u => u.id === defenderId);

  const weaponLoadout = useMemo(() => {
    if (!attacker) return [];
    return getWeaponLoadout(attacker, attackerSelectedUpgrades);
  }, [attacker, attackerSelectedUpgrades]);

  const weapons = useMemo(() => {
    if (!attacker) return [];
    return weaponLoadout.map(item => {
      const attackKind = isWeaponMelee(item.weapon) ? 'melee' as const : 'ranged' as const;
      const derived = deriveCombatEffects({
        unit: attacker,
        selectedUpgradeIndexes: attackerSelectedUpgrades,
        selectedWeapon: item.weapon,
        attackKind,
        sourceUnitEngaged: attackerEngaged,
      });
      return { ...item.weapon, keywords: derived.weaponKeywords };
    });
  }, [attacker, weaponLoadout, attackerSelectedUpgrades, attackerEngaged]);

  const weapon = weapons[selectedWeaponIdx];
  const attackerEffects = useMemo(() => {
    if (!attacker || !weapon) return null;
    return deriveCombatEffects({
      unit: attacker,
      selectedUpgradeIndexes: attackerSelectedUpgrades,
      selectedWeapon: weapon,
      attackKind: isWeaponMelee(weapon) ? 'melee' : 'ranged',
      sourceUnitEngaged: attackerEngaged,
    });
  }, [attacker, weapon, attackerSelectedUpgrades, attackerEngaged]);

  const defenderEffects = useMemo(() => {
    if (!defender || !weapon) return null;
    return deriveUnitCombatEffects({
      unit: defender,
      selectedUpgradeIndexes: defenderSelectedUpgrades,
      attackKind: isWeaponMelee(weapon) ? 'melee' : 'ranged',
      sourceUnitEngaged: defenderEngaged,
    });
  }, [defender, weapon, defenderSelectedUpgrades, defenderEngaged]);

  const attackerModels = useMemo(() => {
    if (!attacker) return 1;
    const profile = attackerSize === 'small' ? attacker.smallProfile : attacker.largeProfile;
    return profile?.models || 1;
  }, [attacker, attackerSize]);

  const defenderModels = useMemo(() => {
    if (!defender) return 1;
    const profile = defenderSize === 'small' ? defender.smallProfile : defender.largeProfile;
    return profile?.models || 1;
  }, [defender, defenderSize]);

  const result = useMemo<CombatResult | null>(() => {
    if (!weapon || !defender) return null;
      const input: CombatInput = {
        weapon,
        attackerModels,
        attackerKeywords: attackerEffects?.unitKeywords || attacker?.keywords || '',
        weaponKeywords: attackerEffects?.weaponKeywords || weapon.keywords || '',
        defenderStats: defender.stats,
        defenderKeywords: defenderEffects?.unitKeywords || defender.keywords || '',
        defenderTags: defender.tags || '',
        defenderModels,
        hitModifier,
        inBurstRange,
        isCharge,
        defenderCanEvade: defenderCanEvade || defenderEffects?.explicitEvade || false,
        attackKind: isWeaponMelee(weapon) ? 'melee' : 'ranged',
        targetEngaged: defenderEngaged,
        targetVisible: defenderVisible,
        targetMovedThisRound: defenderMovedThisRound,
      };

    return calculateCombatExpectation(input);
  }, [weapon, defender, attacker, attackerEffects, defenderEffects, attackerModels, defenderModels, hitModifier, inBurstRange, isCharge, defenderCanEvade, defenderEngaged, defenderVisible, defenderMovedThisRound]);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* Attacker */}
      <Text style={st.sectionLabel}>{t('attacker')}</Text>
      <FactionPicker value={attackerFaction} onChange={f => { setAttackerFaction(f); setAttackerId(''); setAttackerSelectedUpgrades([]); }} />
      <UnitPicker units={attackerUnits} value={attackerId} onChange={id => { setAttackerId(id); setSelectedWeaponIdx(0); setAttackerSelectedUpgrades([]); }} />

      {attacker && (
        <SizePicker
          unit={attacker}
          value={attackerSize}
          onChange={setAttackerSize}
          label={`${t('attackerSquad')} (${attackerModels} ${t('models')})`}
        />
      )}
      {attacker && (
        <UpgradeSelector
          unit={attacker}
          selected={attackerSelectedUpgrades}
          onChange={setAttackerSelectedUpgrades}
          title={t('attackerUpgrades')}
        />
      )}

      {weapons.length > 0 && (
        <View style={st.weaponPicker}>
          <Text style={st.subLabel}>{t('selectWeapon')}</Text>
          {weapons.map((w, i) => (
            <Pressable
              key={i}
              onPress={() => setSelectedWeaponIdx(i)}
              style={({ pressed }) => [st.weaponOption, selectedWeaponIdx === i && st.weaponOptionActive, pressed && { opacity: 0.7 }]}
            >
              <Text style={[st.weaponOptionText, selectedWeaponIdx === i && { color: '#ef4444' }]}>
                {w.name || `${t('weaponN')}${i + 1}`} ({t('hitLabel')}:{w.hit} {t('dmgLabel')}:{w.dmg} RoA:{w.roa})
              </Text>
              {w.surge && <Text style={st.weaponSurgeText}>Surge: {w.surge}</Text>}
              {w.keywords && <Text style={st.weaponKwText}>{t('kwLabel')}: {w.keywords}</Text>}
            </Pressable>
          ))}
        </View>
      )}

      {/* Defender */}
      <Text style={[st.sectionLabel, { marginTop: 16 }]}>{t('defender')}</Text>
      <FactionPicker value={defenderFaction} onChange={f => { setDefenderFaction(f); setDefenderId(''); setDefenderSelectedUpgrades([]); }} />
      <UnitPicker units={defenderUnits} value={defenderId} onChange={id => { setDefenderId(id); setDefenderSelectedUpgrades([]); }} />

      {defender && (
        <SizePicker
          unit={defender}
          value={defenderSize}
          onChange={setDefenderSize}
          label={`${t('defenderSquad')} (${defenderModels} ${t('models')})`}
        />
      )}
      {defender && (
        <UpgradeSelector
          unit={defender}
          selected={defenderSelectedUpgrades}
          onChange={setDefenderSelectedUpgrades}
          title={t('defenderUpgrades')}
        />
      )}

      {/* Combat Modifiers */}
      {weapon && defender && (
        <View style={st.modifierSection}>
          <Text style={st.subLabel}>{t('combatModifiers')}</Text>
          <View style={st.modifierRow}>
            <Text style={st.modifierLabel}>{t('hitModifier')}</Text>
            <View style={st.countRow}>
              <Pressable onPress={() => setHitModifier(hitModifier - 1)} style={({ pressed }) => [st.countBtn, pressed && { opacity: 0.7 }]}>
                <Text style={st.countBtnText}>-</Text>
              </Pressable>
              <Text style={[st.countValue, { color: hitModifier > 0 ? '#22c55e' : hitModifier < 0 ? '#ef4444' : '#e5e7eb' }]}>
                {hitModifier > 0 ? `+${hitModifier}` : hitModifier}
              </Text>
              <Pressable onPress={() => setHitModifier(hitModifier + 1)} style={({ pressed }) => [st.countBtn, pressed && { opacity: 0.7 }]}>
                <Text style={st.countBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
          <ToggleRow label={t('burstFireRange')} value={inBurstRange} onToggle={setInBurstRange} />
          <ToggleRow label={t('chargeAttack')} value={isCharge} onToggle={setIsCharge} />
          <ToggleRow label={t('defenderCanEvade')} value={defenderCanEvade || defenderEffects?.explicitEvade || false} onToggle={setDefenderCanEvade} />
          <ToggleRow label={t('attackerEngagedState')} value={attackerEngaged} onToggle={setAttackerEngaged} />
          <ToggleRow label={t('defenderEngagedState')} value={defenderEngaged} onToggle={setDefenderEngaged} />
          <ToggleRow label={t('targetVisible')} value={defenderVisible} onToggle={setDefenderVisible} />
          <ToggleRow label={t('targetMovedThisRound')} value={defenderMovedThisRound} onToggle={setDefenderMovedThisRound} />
          {attackerEffects?.notes?.length ? (
            <Text style={st.weaponListKw}>{t('attackerEffectsLabel')}: {attackerEffects.notes.join(' | ')}</Text>
          ) : null}
          {defenderEffects?.notes?.length ? (
            <Text style={st.weaponListKw}>{t('defenderEffectsLabel')}: {defenderEffects.notes.join(' | ')}</Text>
          ) : null}
        </View>
      )}

      {/* Result */}
      {result && weapon && (
        <View style={st.resultPanel}>
          <Text style={st.resultTitle}>{t('threePoolResult')}</Text>

          {/* Step-by-step breakdown */}
          {result.steps.map((step, i) => (
            <View key={i} style={st.stepRow}>
              <View style={st.stepHeader}>
                <Text style={st.stepLabel}>{step.label}</Text>
                <Text style={[st.stepValue, { color: stepColor(step.step) }]}>{step.value.toFixed(1)}</Text>
              </View>
              <Text style={st.stepDesc}>{step.description}</Text>
            </View>
          ))}

          {/* Summary stats */}
          <View style={st.resultGrid}>
            <ResultItem label={t('hitRate')} value={`${(result.hitProbability * 100).toFixed(0)}%`} color="#eab308" />
            <ResultItem label={t('expectedHits')} value={result.expectedHits.toFixed(1)} color="#38bdf8" />
            <ResultItem label={t('surgeBypass')} value={result.expectedSurgeBypassed.toFixed(1)} color="#a855f7" />
            <ResultItem label={t('armourSaves')} value={result.expectedArmourSaves.toFixed(1)} color="#22c55e" />
            <ResultItem label={t('evadeSaves')} value={result.expectedEvadeSaves.toFixed(1)} color="#06b6d4" />
            <ResultItem label={t('damagePoolDice')} value={result.expectedDamagePoolDice.toFixed(1)} color="#f97316" />
            <ResultItem label={t('totalDamage')} value={result.expectedTotalDamage.toFixed(1)} color="#ef4444" />
            <ResultItem label={t('expectedKills')} value={result.expectedKills.toFixed(1)} color="#dc2626" />
          </View>

          {/* Active Keywords */}
          {result.activeKeywords.length > 0 && (
            <View style={st.kwSection}>
              <Text style={st.kwTitle}>{t('activeKeywords')}</Text>
              {result.activeKeywords.map((kw, i) => (
                <View key={i} style={st.kwRow}>
                  <Text style={st.kwName}>{kw.name}</Text>
                  <Text style={st.kwEffect}>{kw.effect}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Target info */}
          {defender && (
            <View style={st.targetInfo}>
              <Text style={st.targetInfoText}>
                {t('targetInfo')}: {defender.name} (HP:{defender.stats.hp || '?'}{(defender.stats.shield || 0) > 0 ? ` ${t('shield')}:${defender.stats.shield}` : ''} {t('armor')}:{defender.stats.armor || 0} {t('evade')}:{defender.stats.evade || '-'})
              </Text>
              <Text style={st.targetInfoText}>
                {t('tagsInfo')}: {defender.tags || t('none')} | {t('kwLabel')}: {defender.keywords || t('none')}
              </Text>
            </View>
          )}
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// --- Matchup Analysis (Quick) ---
function MatchupPanel() {
  const { t } = useI18n();
  const { units } = useData();
  const [factionA, setFactionA] = useState<Faction>('Terran');
  const [factionB, setFactionB] = useState<Faction>('Zerg');
  const [unitAId, setUnitAId] = useState('');
  const [unitBId, setUnitBId] = useState('');
  const [sizeA, setSizeA] = useState<'small' | 'large'>('small');
  const [sizeB, setSizeB] = useState<'small' | 'large'>('small');

  const unitsA = useMemo(() => units.filter(u => u.faction === factionA), [units, factionA]);
  const unitsB = useMemo(() => units.filter(u => u.faction === factionB), [units, factionB]);

  const unitA = units.find(u => u.id === unitAId);
  const unitB = units.find(u => u.id === unitBId);

  const modelsA = useMemo(() => {
    if (!unitA) return 1;
    return (sizeA === 'small' ? unitA.smallProfile : unitA.largeProfile)?.models || 1;
  }, [unitA, sizeA]);

  const modelsB = useMemo(() => {
    if (!unitB) return 1;
    return (sizeB === 'small' ? unitB.smallProfile : unitB.largeProfile)?.models || 1;
  }, [unitB, sizeB]);

  const unitAEffects = useMemo(() => {
    if (!unitA) return null;
    return deriveUnitCombatEffects({
      unit: unitA,
      selectedUpgradeIndexes: [],
      attackKind: 'ranged',
      sourceUnitEngaged: false,
    });
  }, [unitA]);

  const unitBEffects = useMemo(() => {
    if (!unitB) return null;
    return deriveUnitCombatEffects({
      unit: unitB,
      selectedUpgradeIndexes: [],
      attackKind: 'ranged',
      sourceUnitEngaged: false,
    });
  }, [unitB]);

  const weaponsA = useMemo(() => {
    if (!unitA) return [];
    return getWeaponLoadout(unitA, []).map(item => {
      const attackKind = isWeaponMelee(item.weapon) ? 'melee' as const : 'ranged' as const;
      const derived = deriveCombatEffects({
        unit: unitA,
        selectedUpgradeIndexes: [],
        selectedWeapon: item.weapon,
        attackKind,
        sourceUnitEngaged: false,
      });
      return { ...item.weapon, keywords: derived.weaponKeywords };
    });
  }, [unitA]);

  const weaponsB = useMemo(() => {
    if (!unitB) return [];
    return getWeaponLoadout(unitB, []).map(item => {
      const attackKind = isWeaponMelee(item.weapon) ? 'melee' as const : 'ranged' as const;
      const derived = deriveCombatEffects({
        unit: unitB,
        selectedUpgradeIndexes: [],
        selectedWeapon: item.weapon,
        attackKind,
        sourceUnitEngaged: false,
      });
      return { ...item.weapon, keywords: derived.weaponKeywords };
    });
  }, [unitB]);

  const analysis = useMemo<MatchupResult | null>(() => {
    if (!unitA || !unitB) return null;
    if (weaponsA.length === 0 && weaponsB.length === 0) return null;

    return calculateMatchup({
      unitAName: unitA.name,
      unitAWeapons: weaponsA,
      unitAModels: modelsA,
      unitAStats: unitA.stats,
      unitAKeywords: unitAEffects?.unitKeywords || unitA.keywords || '',
      unitATags: unitA.tags || '',
      unitBName: unitB.name,
      unitBWeapons: weaponsB,
      unitBModels: modelsB,
      unitBStats: unitB.stats,
      unitBKeywords: unitBEffects?.unitKeywords || unitB.keywords || '',
      unitBTags: unitB.tags || '',
    });
  }, [unitA, unitB, weaponsA, weaponsB, modelsA, modelsB, unitAEffects, unitBEffects]);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={st.sectionLabel}>{t('unitA')}</Text>
      <FactionPicker value={factionA} onChange={f => { setFactionA(f); setUnitAId(''); }} />
      <UnitPicker units={unitsA} value={unitAId} onChange={setUnitAId} />
      {unitA && <SizePicker unit={unitA} value={sizeA} onChange={setSizeA} label={`${t('squadA')} (${modelsA} ${t('models')})`} />}

      <Text style={[st.sectionLabel, { marginTop: 16 }]}>{t('unitB')}</Text>
      <FactionPicker value={factionB} onChange={f => { setFactionB(f); setUnitBId(''); }} />
      <UnitPicker units={unitsB} value={unitBId} onChange={setUnitBId} />
      {unitB && <SizePicker unit={unitB} value={sizeB} onChange={setSizeB} label={`${t('squadB')} (${modelsB} ${t('models')})`} />}

      {analysis && unitA && unitB && (
        <View style={st.matchupResult}>
          <Text style={st.resultTitle}>{t('matchupAnalysis')}</Text>

          {/* A → B */}
          <View style={st.matchupSection}>
            <Text style={[st.matchupHeader, { color: FACTION_COLORS[unitA.faction] }]}>
              {unitA.name} ({modelsA} {t('models')}) → {unitB.name}
            </Text>
            <Text style={st.matchupStat}>{t('totalExpDmg')}: {analysis.totalDmgAtoB.toFixed(1)}{t('perRound')}</Text>
            <Text style={st.matchupStat}>{t('expKillsPerRound')}: {analysis.totalKillsAtoB.toFixed(1)} {t('modelsPerRound')}</Text>
            <Text style={st.matchupStat}>{t('estRoundsToKill')}: {analysis.roundsToKillB === Infinity ? t('infinity') : analysis.roundsToKillB.toFixed(1)}</Text>
            {analysis.aToBResults.map((r, i) => (
              <View key={i} style={st.matchupWeapon}>
                <Text style={st.matchupWeaponName}>{r.weaponName}</Text>
                <Text style={st.matchupWeaponDetail}>
                  {r.result.totalAttackDice} {t('diceArrow')} {r.result.expectedHits.toFixed(1)} {t('hitsArrow')} {r.result.expectedTotalDamage.toFixed(1)} {t('dmgArrow')} {r.result.expectedKills.toFixed(1)} {t('killsArrow')}
                </Text>
                <Text style={st.weaponStepText}>
                  命中构成：{r.result.expectedHits.toFixed(1)} = {r.result.baseExpectedHits.toFixed(1)} 自然命中{r.result.bonusExpectedHits > 0 ? ` + ${r.result.bonusExpectedHits.toFixed(1)} 调整` : ''}
                </Text>
                <Text style={st.weaponStepText}>
                  伤害池构成：{r.result.expectedDamagePoolDice.toFixed(1)} = {r.result.expectedBypassedDamagePoolDice.toFixed(1)} 绕过护甲 + {r.result.expectedDamagePoolFromArmour.toFixed(1)} 护甲失败{r.result.expectedEvadeSaves > 0 ? ` - ${r.result.expectedEvadeSaves.toFixed(1)} 闪避` : ''}
                </Text>
                {r.result.activeKeywords.length > 0 && (
                  <Text style={st.matchupKwText}>
                    {t('kwLabel')}: {r.result.activeKeywords.map(k => k.name).join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* B → A */}
          <View style={st.matchupSection}>
            <Text style={[st.matchupHeader, { color: FACTION_COLORS[unitB.faction] }]}>
              {unitB.name} ({modelsB} {t('models')}) → {unitA.name}
            </Text>
            <Text style={st.matchupStat}>{t('totalExpDmg')}: {analysis.totalDmgBtoA.toFixed(1)}{t('perRound')}</Text>
            <Text style={st.matchupStat}>{t('expKillsPerRound')}: {analysis.totalKillsBtoA.toFixed(1)} {t('modelsPerRound')}</Text>
            <Text style={st.matchupStat}>{t('estRoundsToKill')}: {analysis.roundsToKillA === Infinity ? t('infinity') : analysis.roundsToKillA.toFixed(1)}</Text>
            {analysis.bToAResults.map((r, i) => (
              <View key={i} style={st.matchupWeapon}>
                <Text style={st.matchupWeaponName}>{r.weaponName}</Text>
                <Text style={st.matchupWeaponDetail}>
                  {r.result.totalAttackDice} {t('diceArrow')} {r.result.expectedHits.toFixed(1)} {t('hitsArrow')} {r.result.expectedTotalDamage.toFixed(1)} {t('dmgArrow')} {r.result.expectedKills.toFixed(1)} {t('killsArrow')}
                </Text>
                <Text style={st.weaponStepText}>
                  命中构成：{r.result.expectedHits.toFixed(1)} = {r.result.baseExpectedHits.toFixed(1)} 自然命中{r.result.bonusExpectedHits > 0 ? ` + ${r.result.bonusExpectedHits.toFixed(1)} 调整` : ''}
                </Text>
                <Text style={st.weaponStepText}>
                  伤害池构成：{r.result.expectedDamagePoolDice.toFixed(1)} = {r.result.expectedBypassedDamagePoolDice.toFixed(1)} 绕过护甲 + {r.result.expectedDamagePoolFromArmour.toFixed(1)} 护甲失败{r.result.expectedEvadeSaves > 0 ? ` - ${r.result.expectedEvadeSaves.toFixed(1)} 闪避` : ''}
                </Text>
                {r.result.activeKeywords.length > 0 && (
                  <Text style={st.matchupKwText}>
                    {t('kwLabel')}: {r.result.activeKeywords.map(k => k.name).join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={[st.matchupSummary, {
            borderColor: analysis.advantage === 'A' ? FACTION_COLORS[unitA.faction] + '50'
              : analysis.advantage === 'B' ? FACTION_COLORS[unitB.faction] + '50'
              : '#22c55e30'
          }]}>
            <Text style={[st.matchupSummaryTitle, {
              color: analysis.advantage === 'A' ? FACTION_COLORS[unitA.faction]
                : analysis.advantage === 'B' ? FACTION_COLORS[unitB.faction]
                : '#22c55e'
            }]}>{t('conclusion')}</Text>
            <Text style={st.matchupSummaryText}>{analysis.summary}</Text>
          </View>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ============================================================
// Versus Panel: 单位对抗（区分近战/远程）
// ============================================================
type CombatPhaseFilter = 'all' | 'ranged' | 'melee';

function VersusPanel() {
  const { t } = useI18n();
  const { units, armyLists } = useData();
  const [factionA, setFactionA] = useState<Faction>('Terran');
  const [factionB, setFactionB] = useState<Faction>('Zerg');
  const [unitAId, setUnitAId] = useState('');
  const [unitBId, setUnitBId] = useState('');
  const [sizeA, setSizeA] = useState<'small' | 'large'>('small');
  const [sizeB, setSizeB] = useState<'small' | 'large'>('small');
  const [phaseFilter, setPhaseFilter] = useState<CombatPhaseFilter>('all');
  const [selectedUpgradesA, setSelectedUpgradesA] = useState<number[]>([]);
  const [selectedUpgradesB, setSelectedUpgradesB] = useState<number[]>([]);
  const [engagedA, setEngagedA] = useState(false);
  const [engagedB, setEngagedB] = useState(false);
  const [chargeA, setChargeA] = useState(false);
  const [chargeB, setChargeB] = useState(false);
  const [visibleA, setVisibleA] = useState(true);
  const [visibleB, setVisibleB] = useState(true);
  const [movedA, setMovedA] = useState(false);
  const [movedB, setMovedB] = useState(false);
  const [manualEvadeA, setManualEvadeA] = useState(false);
  const [manualEvadeB, setManualEvadeB] = useState(false);
  // Custom model count overrides (0 = use default from profile)
  const [customModelsA, setCustomModelsA] = useState(0);
  const [customModelsB, setCustomModelsB] = useState(0);
  // Army import state
  const [showArmyPickerFor, setShowArmyPickerFor] = useState<'A' | 'B' | null>(null);
  const [selectedArmyId, setSelectedArmyId] = useState<string | null>(null);

  const unitsA = useMemo(() => units.filter(u => u.faction === factionA), [units, factionA]);
  const unitsB = useMemo(() => units.filter(u => u.faction === factionB), [units, factionB]);

  const unitA = units.find(u => u.id === unitAId);
  const unitB = units.find(u => u.id === unitBId);

  const defaultModelsA = useMemo(() => {
    if (!unitA) return 1;
    return (sizeA === 'small' ? unitA.smallProfile : unitA.largeProfile)?.models || 1;
  }, [unitA, sizeA]);

  const defaultModelsB = useMemo(() => {
    if (!unitB) return 1;
    return (sizeB === 'small' ? unitB.smallProfile : unitB.largeProfile)?.models || 1;
  }, [unitB, sizeB]);

  const modelsA = customModelsA > 0 ? customModelsA : defaultModelsA;
  const modelsB = customModelsB > 0 ? customModelsB : defaultModelsB;

  // Classify weapons for both units
  const weaponInfoA = useMemo(() => {
    if (!unitA) return { all: [], ranged: [], melee: [] };
    const all = getWeaponLoadout(unitA, selectedUpgradesA).map(item => {
      const derived = deriveCombatEffects({
        unit: unitA,
        selectedUpgradeIndexes: selectedUpgradesA,
        selectedWeapon: item.weapon,
        attackKind: isWeaponMelee(item.weapon) ? 'melee' : 'ranged',
        sourceUnitEngaged: engagedA,
      });
      return { ...item.weapon, keywords: derived.weaponKeywords };
    });
    return { all, ranged: all.filter(isWeaponRanged), melee: all.filter(isWeaponMelee) };
  }, [unitA, selectedUpgradesA, engagedA]);

  const weaponInfoB = useMemo(() => {
    if (!unitB) return { all: [], ranged: [], melee: [] };
    const all = getWeaponLoadout(unitB, selectedUpgradesB).map(item => {
      const derived = deriveCombatEffects({
        unit: unitB,
        selectedUpgradeIndexes: selectedUpgradesB,
        selectedWeapon: item.weapon,
        attackKind: isWeaponMelee(item.weapon) ? 'melee' : 'ranged',
        sourceUnitEngaged: engagedB,
      });
      return { ...item.weapon, keywords: derived.weaponKeywords };
    });
    return { all, ranged: all.filter(isWeaponRanged), melee: all.filter(isWeaponMelee) };
  }, [unitB, selectedUpgradesB, engagedB]);

  const unitAEffects = useMemo(() => {
    if (!unitA) return null;
    return deriveUnitCombatEffects({
      unit: unitA,
      selectedUpgradeIndexes: selectedUpgradesA,
      attackKind: phaseFilter === 'melee' ? 'melee' : 'ranged',
      sourceUnitEngaged: engagedA,
    });
  }, [unitA, selectedUpgradesA, phaseFilter, engagedA]);

  const unitBEffects = useMemo(() => {
    if (!unitB) return null;
    return deriveUnitCombatEffects({
      unit: unitB,
      selectedUpgradeIndexes: selectedUpgradesB,
      attackKind: phaseFilter === 'melee' ? 'melee' : 'ranged',
      sourceUnitEngaged: engagedB,
    });
  }, [unitB, selectedUpgradesB, phaseFilter, engagedB]);

  // Get filtered weapons based on phase
  const getFilteredWeapons = useCallback((info: { all: WeaponProfile[]; ranged: WeaponProfile[]; melee: WeaponProfile[] }) => {
    if (phaseFilter === 'ranged') return info.ranged;
    if (phaseFilter === 'melee') return info.melee;
    return info.all;
  }, [phaseFilter]);

  // Compute matchup results for each phase
  const computeMatchup = useCallback((
    uA: UnitCard, uB: UnitCard, wA: WeaponProfile[], wB: WeaponProfile[], mA: number, mB: number
  ): MatchupResult | null => {
    if (wA.length === 0 && wB.length === 0) return null;
    return calculateMatchup({
      unitAName: uA.name,
      unitAWeapons: wA,
      unitAModels: mA,
      unitAStats: uA.stats,
      unitAKeywords: unitAEffects?.unitKeywords || uA.keywords || '',
      unitATags: uA.tags || '',
      unitAConfig: {
        isCharge: chargeA,
        defenderCanEvade: manualEvadeB || unitBEffects?.explicitEvade || false,
        targetEngaged: engagedB,
        targetVisible: visibleB,
        targetMovedThisRound: movedB,
      },
      unitBName: uB.name,
      unitBWeapons: wB,
      unitBModels: mB,
      unitBStats: uB.stats,
      unitBKeywords: unitBEffects?.unitKeywords || uB.keywords || '',
      unitBTags: uB.tags || '',
      unitBConfig: {
        isCharge: chargeB,
        defenderCanEvade: manualEvadeA || unitAEffects?.explicitEvade || false,
        targetEngaged: engagedA,
        targetVisible: visibleA,
        targetMovedThisRound: movedA,
      },
    });
  }, [unitAEffects, unitBEffects, chargeA, chargeB, manualEvadeA, manualEvadeB, engagedA, engagedB, visibleA, visibleB, movedA, movedB]);

  // Results for current filter
  const currentResult = useMemo(() => {
    if (!unitA || !unitB) return null;
    const wA = getFilteredWeapons(weaponInfoA);
    const wB = getFilteredWeapons(weaponInfoB);
    return computeMatchup(unitA, unitB, wA, wB, modelsA, modelsB);
  }, [unitA, unitB, weaponInfoA, weaponInfoB, modelsA, modelsB, phaseFilter, getFilteredWeapons, computeMatchup]);

  // Results for all three phases (for comparison table)
  const allPhaseResults = useMemo(() => {
    if (!unitA || !unitB) return null;
    const rangedResult = computeMatchup(unitA, unitB, weaponInfoA.ranged, weaponInfoB.ranged, modelsA, modelsB);
    const meleeResult = computeMatchup(unitA, unitB, weaponInfoA.melee, weaponInfoB.melee, modelsA, modelsB);
    const allResult = computeMatchup(unitA, unitB, weaponInfoA.all, weaponInfoB.all, modelsA, modelsB);
    return { ranged: rangedResult, melee: meleeResult, all: allResult };
  }, [unitA, unitB, weaponInfoA, weaponInfoB, modelsA, modelsB, computeMatchup]);

  // Handle importing a roster unit from a saved army
  const handleImportFromArmy = (side: 'A' | 'B', ru: RosterUnit, armyFaction: Faction) => {
    // Find the matching unit card
    const unitCard = units.find(u => u.id === ru.unitId);
    if (!unitCard) return;
    if (side === 'A') {
      setFactionA(armyFaction);
      setUnitAId(unitCard.id);
      setSizeA(ru.size);
      setSelectedUpgradesA(ru.activeUpgrades || []);
      setCustomModelsA(0);
    } else {
      setFactionB(armyFaction);
      setUnitBId(unitCard.id);
      setSizeB(ru.size);
      setSelectedUpgradesB(ru.activeUpgrades || []);
      setCustomModelsB(0);
    }
    setShowArmyPickerFor(null);
    setSelectedArmyId(null);
  };

  const pickerArmy = selectedArmyId ? armyLists.find(a => a.id === selectedArmyId) : null;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      {/* Army Import Overlay */}
      {showArmyPickerFor && (
        <View style={st.armyImportOverlay}>
          <View style={st.armyImportHeader}>
            <Text style={st.armyImportTitle}>
              {selectedArmyId ? t('selectRosterUnit') : t('selectSavedArmy')} ({showArmyPickerFor})
            </Text>
            <Pressable
              onPress={() => { setShowArmyPickerFor(null); setSelectedArmyId(null); }}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Text style={st.armyImportClose}>{t('cancel')}</Text>
            </Pressable>
          </View>
          {!selectedArmyId ? (
            // Step 1: Select an army
            armyLists.length === 0 ? (
              <Text style={st.armyImportEmpty}>{t('noSavedArmy')}</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                {armyLists.map(a => (
                  <Pressable
                    key={a.id}
                    onPress={() => setSelectedArmyId(a.id)}
                    style={({ pressed }) => [st.armyImportItem, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[st.armyImportFactionDot, { backgroundColor: FACTION_COLORS[a.faction] }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={st.armyImportItemName}>{a.name}</Text>
                      <Text style={st.armyImportItemSub}>{a.faction} · {a.roster.length} {t('unitsCount')} · {a.mineralsLimit}M</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )
          ) : (
            // Step 2: Select a roster unit from the army
            <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
              <Pressable
                onPress={() => setSelectedArmyId(null)}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Text style={st.armyImportBack}>{t('back')}</Text>
              </Pressable>
              {pickerArmy && pickerArmy.roster.length === 0 && (
                <Text style={st.armyImportEmpty}>{t('rosterEmpty')}</Text>
              )}
              {pickerArmy && pickerArmy.roster.map((ru, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleImportFromArmy(showArmyPickerFor, ru, pickerArmy.faction)}
                  style={({ pressed }) => [st.armyImportItem, pressed && { opacity: 0.7 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={st.armyImportItemName}>{ru.name}</Text>
                    <Text style={st.armyImportItemSub}>
                      {ru.unitType} · {ru.size === 'small' ? t('smallLabel') : t('largeLabel')} · {ru.baseCost}M
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Unit A Selection */}
      <View style={st.unitSectionHeader}>
        <Text style={st.sectionLabel}>{t('unitA')}</Text>
        <Pressable
          onPress={() => { setShowArmyPickerFor('A'); setSelectedArmyId(null); }}
          style={({ pressed }) => [st.armyImportBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={st.armyImportBtnText}>{t('importFromArmy')}</Text>
        </Pressable>
      </View>
      <FactionPicker value={factionA} onChange={f => { setFactionA(f); setUnitAId(''); setCustomModelsA(0); setSelectedUpgradesA([]); }} />
      <UnitPicker units={unitsA} value={unitAId} onChange={id => { setUnitAId(id); setCustomModelsA(0); setSelectedUpgradesA([]); }} />
      {unitA && <SizePicker unit={unitA} value={sizeA} onChange={s => { setSizeA(s); setCustomModelsA(0); }} label={`${t('squadA')} (${modelsA} ${t('models')})`} />}
      {unitA && (
        <ModelCountPicker
          defaultCount={defaultModelsA}
          customCount={customModelsA}
          onChange={setCustomModelsA}
          label={`A ${t('modelCountLabel')}`}
        />
      )}
      {unitA && (
        <UpgradeSelector
          unit={unitA}
          selected={selectedUpgradesA}
          onChange={setSelectedUpgradesA}
          title={t('unitAUpgrades')}
        />
      )}
      {unitA && (
        <View style={st.modifierSection}>
          <Text style={st.subLabel}>{t('unitAState')}</Text>
          <ToggleRow label={t('unitAEngagedState')} value={engagedA} onToggle={setEngagedA} />
          <ToggleRow label={t('chargeAttack')} value={chargeA} onToggle={setChargeA} />
          <ToggleRow label={t('unitAExplicitEvade')} value={manualEvadeA || unitAEffects?.explicitEvade || false} onToggle={setManualEvadeA} />
          <ToggleRow label={t('unitAVisible')} value={visibleA} onToggle={setVisibleA} />
          <ToggleRow label={t('unitAMovedThisRound')} value={movedA} onToggle={setMovedA} />
          {unitAEffects?.notes?.length ? <Text style={st.weaponListKw}>{unitAEffects.notes.join(' | ')}</Text> : null}
        </View>
      )}

      {/* Unit A Weapon Summary */}
      {unitA && (
        <View style={st.weaponSummaryBox}>
          <Text style={st.weaponSummaryTitle}>{unitA.name} {t('weaponOverview')}</Text>
          <View style={st.weaponSummaryRow}>
            <View style={st.weaponCountBadge}>
              <Text style={st.weaponCountNum}>{weaponInfoA.ranged.length}</Text>
              <Text style={st.weaponCountLabel}>{t('rangedCount')}</Text>
            </View>
            <View style={[st.weaponCountBadge, { borderColor: '#ef4444' }]}>
              <Text style={[st.weaponCountNum, { color: '#ef4444' }]}>{weaponInfoA.melee.length}</Text>
              <Text style={st.weaponCountLabel}>{t('meleeCount')}</Text>
            </View>
            <View style={[st.weaponCountBadge, { borderColor: '#eab308' }]}>
              <Text style={[st.weaponCountNum, { color: '#eab308' }]}>{weaponInfoA.all.length}</Text>
              <Text style={st.weaponCountLabel}>{t('totalCount')}</Text>
            </View>
          </View>
          {weaponInfoA.all.map((w, i) => (
            <View key={i} style={st.weaponListItem}>
              <View style={st.weaponListHeader}>
                <Text style={st.weaponListName}>{w.name || `${t('weaponN')}${i + 1}`}</Text>
                <View style={[st.phaseTag, isWeaponMelee(w) ? st.phaseTagMelee : st.phaseTagRanged]}>
                  <Text style={st.phaseTagText}>{isWeaponMelee(w) ? t('melee') : t('ranged')}</Text>
                </View>
              </View>
              <Text style={st.weaponListDetail}>
                {t('range')}:{w.range} | {t('hit')}:{w.hit} | RoA:{w.roa} | {t('damage')}:{w.dmg}{w.surge ? ` | Surge:${w.surge}` : ''}
              </Text>
              {w.keywords ? <Text style={st.weaponListKw}>{w.keywords}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {/* Unit B Selection */}
      <View style={[st.unitSectionHeader, { marginTop: 16 }]}>
        <Text style={st.sectionLabel}>{t('unitB')}</Text>
        <Pressable
          onPress={() => { setShowArmyPickerFor('B'); setSelectedArmyId(null); }}
          style={({ pressed }) => [st.armyImportBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={st.armyImportBtnText}>{t('importFromArmy')}</Text>
        </Pressable>
      </View>
      <FactionPicker value={factionB} onChange={f => { setFactionB(f); setUnitBId(''); setCustomModelsB(0); setSelectedUpgradesB([]); }} />
      <UnitPicker units={unitsB} value={unitBId} onChange={id => { setUnitBId(id); setCustomModelsB(0); setSelectedUpgradesB([]); }} />
      {unitB && <SizePicker unit={unitB} value={sizeB} onChange={s => { setSizeB(s); setCustomModelsB(0); }} label={`${t('squadB')} (${modelsB} ${t('models')})`} />}
      {unitB && (
        <ModelCountPicker
          defaultCount={defaultModelsB}
          customCount={customModelsB}
          onChange={setCustomModelsB}
          label={`B ${t('modelCountLabel')}`}
        />
      )}
      {unitB && (
        <UpgradeSelector
          unit={unitB}
          selected={selectedUpgradesB}
          onChange={setSelectedUpgradesB}
          title={t('unitBUpgrades')}
        />
      )}
      {unitB && (
        <View style={st.modifierSection}>
          <Text style={st.subLabel}>{t('unitBState')}</Text>
          <ToggleRow label={t('unitBEngagedState')} value={engagedB} onToggle={setEngagedB} />
          <ToggleRow label={t('chargeAttack')} value={chargeB} onToggle={setChargeB} />
          <ToggleRow label={t('unitBExplicitEvade')} value={manualEvadeB || unitBEffects?.explicitEvade || false} onToggle={setManualEvadeB} />
          <ToggleRow label={t('unitBVisible')} value={visibleB} onToggle={setVisibleB} />
          <ToggleRow label={t('unitBMovedThisRound')} value={movedB} onToggle={setMovedB} />
          {unitBEffects?.notes?.length ? <Text style={st.weaponListKw}>{unitBEffects.notes.join(' | ')}</Text> : null}
        </View>
      )}

      {/* Unit B Weapon Summary */}
      {unitB && (
        <View style={st.weaponSummaryBox}>
          <Text style={st.weaponSummaryTitle}>{unitB.name} {t('weaponOverview')}</Text>
          <View style={st.weaponSummaryRow}>
            <View style={st.weaponCountBadge}>
              <Text style={st.weaponCountNum}>{weaponInfoB.ranged.length}</Text>
              <Text style={st.weaponCountLabel}>{t('rangedCount')}</Text>
            </View>
            <View style={[st.weaponCountBadge, { borderColor: '#ef4444' }]}>
              <Text style={[st.weaponCountNum, { color: '#ef4444' }]}>{weaponInfoB.melee.length}</Text>
              <Text style={st.weaponCountLabel}>{t('meleeCount')}</Text>
            </View>
            <View style={[st.weaponCountBadge, { borderColor: '#eab308' }]}>
              <Text style={[st.weaponCountNum, { color: '#eab308' }]}>{weaponInfoB.all.length}</Text>
              <Text style={st.weaponCountLabel}>{t('totalCount')}</Text>
            </View>
          </View>
          {weaponInfoB.all.map((w, i) => (
            <View key={i} style={st.weaponListItem}>
              <View style={st.weaponListHeader}>
                <Text style={st.weaponListName}>{w.name || `${t('weaponN')}${i + 1}`}</Text>
                <View style={[st.phaseTag, isWeaponMelee(w) ? st.phaseTagMelee : st.phaseTagRanged]}>
                  <Text style={st.phaseTagText}>{isWeaponMelee(w) ? t('melee') : t('ranged')}</Text>
                </View>
              </View>
              <Text style={st.weaponListDetail}>
                {t('range')}:{w.range} | {t('hit')}:{w.hit} | RoA:{w.roa} | {t('damage')}:{w.dmg}{w.surge ? ` | Surge:${w.surge}` : ''}
              </Text>
              {w.keywords ? <Text style={st.weaponListKw}>{w.keywords}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {/* Phase Filter */}
      {unitA && unitB && (
        <View style={st.phaseFilterSection}>
          <Text style={st.subLabel}>{t('phaseFilter')}</Text>
          <View style={st.phaseFilterRow}>
            {([
              ['all', t('allWeapons')],
              ['ranged', t('rangedAssault')],
              ['melee', t('meleeCombat')],
            ] as [CombatPhaseFilter, string][]).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setPhaseFilter(key)}
                style={({ pressed }) => [
                  st.phaseFilterBtn,
                  phaseFilter === key && (key === 'ranged' ? st.phaseFilterBtnRanged : key === 'melee' ? st.phaseFilterBtnMelee : st.phaseFilterBtnAll),
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[
                  st.phaseFilterBtnText,
                  phaseFilter === key && st.phaseFilterBtnTextActive,
                ]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Phase Comparison Table */}
      {allPhaseResults && unitA && unitB && (
        <View style={st.comparisonTable}>
          <Text style={st.resultTitle}>{t('phaseCompare')}</Text>
          <View style={st.compTableHeader}>
            <Text style={[st.compTableCell, st.compTableHeaderCell, { flex: 1.2 }]}>{t('phaseCol')}</Text>
            <Text style={[st.compTableCell, st.compTableHeaderCell, { color: FACTION_COLORS[unitA.faction] }]}>A→B {t('damage')}</Text>
            <Text style={[st.compTableCell, st.compTableHeaderCell, { color: FACTION_COLORS[unitB.faction] }]}>B→A {t('damage')}</Text>
            <Text style={[st.compTableCell, st.compTableHeaderCell]}>{t('advantage')}</Text>
          </View>
          {([
            [t('ranged'), allPhaseResults.ranged],
            [t('melee'), allPhaseResults.melee],
            [t('allWeapons'), allPhaseResults.all],
          ] as [string, MatchupResult | null][]).map(([label, res]) => (
            <View key={label} style={st.compTableRow}>
              <Text style={[st.compTableCell, { flex: 1.2, color: '#94a3b8', fontWeight: '700' as const }]}>{label}</Text>
              <Text style={[st.compTableCell, { color: '#ef4444' }]}>
                {res ? res.totalDmgAtoB.toFixed(1) : '-'}
              </Text>
              <Text style={[st.compTableCell, { color: '#ef4444' }]}>
                {res ? res.totalDmgBtoA.toFixed(1) : '-'}
              </Text>
              <Text style={[st.compTableCell, {
                color: !res ? '#64748b' : res.advantage === 'A' ? FACTION_COLORS[unitA.faction] : res.advantage === 'B' ? FACTION_COLORS[unitB.faction] : '#22c55e',
                fontWeight: '800' as const,
              }]}>
                {!res ? '-' : res.advantage === 'A' ? 'A' : res.advantage === 'B' ? 'B' : '='}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Detailed Result for Current Phase Filter */}
      {currentResult && unitA && unitB && (
        <View style={st.matchupResult}>
          <Text style={st.resultTitle}>
            {phaseFilter === 'ranged' ? t('rangedPhase') : phaseFilter === 'melee' ? t('meleePhase') : t('allWeapons')} {t('detailedMatchup')}
          </Text>

          {/* A → B */}
          <View style={st.matchupSection}>
            <Text style={[st.matchupHeader, { color: FACTION_COLORS[unitA.faction] }]}>
              {unitA.name} ({modelsA} {t('models')}) → {unitB.name}
            </Text>
            {currentResult.aToBResults.length === 0 ? (
              <Text style={st.noWeaponText}>{t('noWeaponPhase')}</Text>
            ) : (
              <>
                <View style={st.dmgSummaryRow}>
                  <View style={st.dmgSummaryItem}>
                    <Text style={st.dmgSummaryLabel}>{t('dmgPerRound')}</Text>
                    <Text style={[st.dmgSummaryValue, { color: '#ef4444' }]}>{currentResult.totalDmgAtoB.toFixed(1)}</Text>
                  </View>
                  <View style={st.dmgSummaryItem}>
                    <Text style={st.dmgSummaryLabel}>{t('killsPerRound')}</Text>
                    <Text style={[st.dmgSummaryValue, { color: '#dc2626' }]}>{currentResult.totalKillsAtoB.toFixed(1)}</Text>
                  </View>
                  <View style={st.dmgSummaryItem}>
                    <Text style={st.dmgSummaryLabel}>{t('roundsToKill')}</Text>
                    <Text style={[st.dmgSummaryValue, { color: '#f97316' }]}>
                      {currentResult.roundsToKillB === Infinity ? '∞' : currentResult.roundsToKillB.toFixed(1)}
                    </Text>
                  </View>
                </View>
                {currentResult.aToBResults.map((r, i) => (
                  <View key={i} style={st.matchupWeapon}>
                    <View style={st.weaponResultHeader}>
                      <Text style={st.matchupWeaponName}>{r.weaponName}</Text>
                      <Text style={[st.weaponDmgBadge, { color: '#ef4444' }]}>{r.result.expectedTotalDamage.toFixed(1)} {t('dmgBadge')}</Text>
                    </View>
                    <Text style={st.matchupWeaponDetail}>
                      {r.result.totalAttackDice} {t('diceFlow')} {r.result.expectedHits.toFixed(1)} {t('hitsFlow')} {r.result.expectedDamagePoolDice.toFixed(1)} {t('poolFlow')} {r.result.expectedTotalDamage.toFixed(1)} {t('dmgFlow')}
                    </Text>
                    <Text style={st.weaponStepText}>
                      命中构成：{r.result.expectedHits.toFixed(1)} = {r.result.baseExpectedHits.toFixed(1)} 自然命中{r.result.bonusExpectedHits > 0 ? ` + ${r.result.bonusExpectedHits.toFixed(1)} 调整` : ''}
                    </Text>
                    <Text style={st.weaponStepText}>
                      伤害池构成：{r.result.expectedDamagePoolDice.toFixed(1)} = {r.result.expectedBypassedDamagePoolDice.toFixed(1)} 绕过护甲{r.result.expectedSurgeBypassed > 0 ? `（Surge ${r.result.expectedSurgeBypassed.toFixed(1)}` : ''}{r.result.expectedCriticalBypassed > 0 ? `${r.result.expectedSurgeBypassed > 0 ? ' + ' : '（'}Critical ${r.result.expectedCriticalBypassed.toFixed(1)}` : ''}{r.result.expectedBypassedDamagePoolDice > 0 ? '）' : ''} + {r.result.expectedDamagePoolFromArmour.toFixed(1)} 护甲失败{r.result.expectedEvadeSaves > 0 ? ` - ${r.result.expectedEvadeSaves.toFixed(1)} 闪避` : ''}
                    </Text>
                    {r.result.activeKeywords.length > 0 && (
                      <View style={st.kwSection}>
                        <Text style={st.kwTitle}>{t('activeKeywords')}</Text>
                        {r.result.activeKeywords.map((kw, kwi) => (
                          <View key={kwi} style={st.kwRow}>
                            <Text style={st.kwName}>{kw.name}</Text>
                            <Text style={st.kwEffect}>{kw.effect}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {/* Step details */}
                    {r.result.steps.map((step, si) => (
                      <Text key={si} style={st.weaponStepText}>
                        {step.label}: {step.value.toFixed(1)} - {step.description}
                      </Text>
                    ))}
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Divider */}
          <View style={st.vsDivider}>
            <View style={st.vsDividerLine} />
            <Text style={st.vsDividerText}>VS</Text>
            <View style={st.vsDividerLine} />
          </View>

          {/* B → A */}
          <View style={st.matchupSection}>
            <Text style={[st.matchupHeader, { color: FACTION_COLORS[unitB.faction] }]}>
              {unitB.name} ({modelsB} {t('models')}) → {unitA.name}
            </Text>
            {currentResult.bToAResults.length === 0 ? (
              <Text style={st.noWeaponText}>{t('noWeaponPhase')}</Text>
            ) : (
              <>
                <View style={st.dmgSummaryRow}>
                  <View style={st.dmgSummaryItem}>
                    <Text style={st.dmgSummaryLabel}>{t('dmgPerRound')}</Text>
                    <Text style={[st.dmgSummaryValue, { color: '#ef4444' }]}>{currentResult.totalDmgBtoA.toFixed(1)}</Text>
                  </View>
                  <View style={st.dmgSummaryItem}>
                    <Text style={st.dmgSummaryLabel}>{t('killsPerRound')}</Text>
                    <Text style={[st.dmgSummaryValue, { color: '#dc2626' }]}>{currentResult.totalKillsBtoA.toFixed(1)}</Text>
                  </View>
                  <View style={st.dmgSummaryItem}>
                    <Text style={st.dmgSummaryLabel}>{t('roundsToKill')}</Text>
                    <Text style={[st.dmgSummaryValue, { color: '#f97316' }]}>
                      {currentResult.roundsToKillA === Infinity ? '∞' : currentResult.roundsToKillA.toFixed(1)}
                    </Text>
                  </View>
                </View>
                {currentResult.bToAResults.map((r, i) => (
                  <View key={i} style={st.matchupWeapon}>
                    <View style={st.weaponResultHeader}>
                      <Text style={st.matchupWeaponName}>{r.weaponName}</Text>
                      <Text style={[st.weaponDmgBadge, { color: '#ef4444' }]}>{r.result.expectedTotalDamage.toFixed(1)} {t('dmgBadge')}</Text>
                    </View>
                    <Text style={st.matchupWeaponDetail}>
                      {r.result.totalAttackDice} {t('diceFlow')} {r.result.expectedHits.toFixed(1)} {t('hitsFlow')} {r.result.expectedDamagePoolDice.toFixed(1)} {t('poolFlow')} {r.result.expectedTotalDamage.toFixed(1)} {t('dmgFlow')}
                    </Text>
                    <Text style={st.weaponStepText}>
                      命中构成：{r.result.expectedHits.toFixed(1)} = {r.result.baseExpectedHits.toFixed(1)} 自然命中{r.result.bonusExpectedHits > 0 ? ` + ${r.result.bonusExpectedHits.toFixed(1)} 调整` : ''}
                    </Text>
                    <Text style={st.weaponStepText}>
                      伤害池构成：{r.result.expectedDamagePoolDice.toFixed(1)} = {r.result.expectedBypassedDamagePoolDice.toFixed(1)} 绕过护甲{r.result.expectedSurgeBypassed > 0 ? `（Surge ${r.result.expectedSurgeBypassed.toFixed(1)}` : ''}{r.result.expectedCriticalBypassed > 0 ? `${r.result.expectedSurgeBypassed > 0 ? ' + ' : '（'}Critical ${r.result.expectedCriticalBypassed.toFixed(1)}` : ''}{r.result.expectedBypassedDamagePoolDice > 0 ? '）' : ''} + {r.result.expectedDamagePoolFromArmour.toFixed(1)} 护甲失败{r.result.expectedEvadeSaves > 0 ? ` - ${r.result.expectedEvadeSaves.toFixed(1)} 闪避` : ''}
                    </Text>
                    {r.result.activeKeywords.length > 0 && (
                      <View style={st.kwSection}>
                        <Text style={st.kwTitle}>{t('activeKeywords')}</Text>
                        {r.result.activeKeywords.map((kw, kwi) => (
                          <View key={kwi} style={st.kwRow}>
                            <Text style={st.kwName}>{kw.name}</Text>
                            <Text style={st.kwEffect}>{kw.effect}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {r.result.steps.map((step, si) => (
                      <Text key={si} style={st.weaponStepText}>
                        {step.label}: {step.value.toFixed(1)} - {step.description}
                      </Text>
                    ))}
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Summary */}
          <View style={[st.matchupSummary, {
            borderColor: currentResult.advantage === 'A' ? FACTION_COLORS[unitA.faction] + '50'
              : currentResult.advantage === 'B' ? FACTION_COLORS[unitB.faction] + '50'
              : '#22c55e30'
          }]}>
            <Text style={[st.matchupSummaryTitle, {
              color: currentResult.advantage === 'A' ? FACTION_COLORS[unitA.faction]
                : currentResult.advantage === 'B' ? FACTION_COLORS[unitB.faction]
                : '#22c55e'
            }]}>{t('conclusion')}</Text>
            <Text style={st.matchupSummaryText}>{currentResult.summary}</Text>
          </View>

          {/* Unit Stats Comparison */}
          <View style={st.statsCompare}>
            <Text style={st.statsCompareTitle}>{t('statsCompare')}</Text>
            <View style={st.statsCompareHeader}>
              <Text style={[st.statsCompareCell, { flex: 1.5 }]}>{t('statAttr')}</Text>
              <Text style={[st.statsCompareCell, { color: FACTION_COLORS[unitA.faction] }]}>{unitA.name}</Text>
              <Text style={[st.statsCompareCell, { color: FACTION_COLORS[unitB.faction] }]}>{unitB.name}</Text>
            </View>
            {([
              ['HP', unitA.stats.hp, unitB.stats.hp],
              [t('armorStat'), unitA.stats.armor, unitB.stats.armor],
              ...((unitA.stats.shield || 0) > 0 || (unitB.stats.shield || 0) > 0 ? [[t('shieldStat'), unitA.stats.shield || 0, unitB.stats.shield || 0]] : []),
              [t('evadeStat'), unitA.stats.evade, unitB.stats.evade],
              [t('speedStat'), unitA.stats.speed, unitB.stats.speed],
              [t('modelCountLabel'), modelsA, modelsB],
              [t('totalHP'), (unitA.stats.hp || 0) * modelsA, (unitB.stats.hp || 0) * modelsB],
            ] as [string, any, any][]).map(([label, valA, valB]) => (
              <View key={label} style={st.statsCompareRow}>
                <Text style={[st.statsCompareCell, { flex: 1.5, color: '#94a3b8' }]}>{label}</Text>
                <Text style={st.statsCompareCell}>{valA ?? '-'}</Text>
                <Text style={st.statsCompareCell}>{valB ?? '-'}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// --- Shared Components ---
function FactionPicker({ value, onChange }: { value: Faction; onChange: (f: Faction) => void }) {
  const { factionName: fName } = useI18n();
  const factions: Faction[] = ['Terran', 'Zerg', 'Protoss'];
  return (
    <View style={st.factionPicker}>
      {factions.map(f => (
        <Pressable
          key={f}
          onPress={() => onChange(f)}
          style={({ pressed }) => [st.factionBtn, value === f && { backgroundColor: FACTION_COLORS[f] + '20', borderColor: FACTION_COLORS[f] }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[st.factionBtnText, value === f && { color: FACTION_COLORS[f] }]}>{fName(f)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function UnitPicker({ units, value, onChange }: { units: UnitCard[]; value: string; onChange: (id: string) => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return units.filter(u => !q || u.name.toLowerCase().includes(q));
  }, [units, search]);

  const selected = units.find(u => u.id === value);

  return (
    <View style={st.unitPicker}>
      <Pressable onPress={() => setExpanded(!expanded)} style={({ pressed }) => [st.unitPickerBtn, pressed && { opacity: 0.7 }]}>
        <Text style={st.unitPickerText}>{selected ? selected.name : t('selectUnit')}</Text>
        <Text style={st.unitPickerChevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && (
        <View style={st.unitPickerDropdown}>
          <TextInput
            style={st.unitPickerSearch}
            placeholder={t('search')}
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
            returnKeyType="done"
          />
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {filtered.map(u => (
              <Pressable
                key={u.id}
                onPress={() => { onChange(u.id); setExpanded(false); setSearch(''); }}
                style={({ pressed }) => [st.unitPickerItem, pressed && { backgroundColor: '#1e293b' }]}
              >
                <Text style={st.unitPickerItemText}>{u.name}</Text>
                <Text style={st.unitPickerItemSub}>{u.unitType} HP:{u.stats.hp || '?'} {t('armorStat')}:{u.stats.armor || 0}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function SizePicker({ unit, value, onChange, label }: { unit: UnitCard; value: 'small' | 'large'; onChange: (s: 'small' | 'large') => void; label: string }) {
  const { t } = useI18n();
  const hasSmall = !!(unit.smallProfile && unit.smallProfile.cost > 0);
  const hasLarge = !!(unit.largeProfile && unit.largeProfile.cost > 0 && unit.largeProfile.models > 0);
  if (!hasSmall && !hasLarge) return null;

  return (
    <View style={st.sizePickerRow}>
      <Text style={st.sizePickerLabel}>{label}</Text>
      <View style={st.sizePickerBtns}>
        {hasSmall && (
          <Pressable
            onPress={() => onChange('small')}
            style={({ pressed }) => [st.sizeBtn, value === 'small' && st.sizeBtnActive, pressed && { opacity: 0.7 }]}
          >
            <Text style={[st.sizeBtnText, value === 'small' && st.sizeBtnTextActive]}>
              {t('smallSquad')} ({unit.smallProfile!.models})
            </Text>
          </Pressable>
        )}
        {hasLarge && (
          <Pressable
            onPress={() => onChange('large')}
            style={({ pressed }) => [st.sizeBtn, value === 'large' && st.sizeBtnActive, pressed && { opacity: 0.7 }]}
          >
            <Text style={[st.sizeBtnText, value === 'large' && st.sizeBtnTextActive]}>
              {t('largeSquad')} ({unit.largeProfile!.models})
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ModelCountPicker({ defaultCount, customCount, onChange, label }: {
  defaultCount: number;
  customCount: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const { t } = useI18n();
  const isCustom = customCount > 0;
  const displayCount = isCustom ? customCount : defaultCount;

  return (
    <View style={st.modelCountRow}>
      <Text style={st.modelCountLabel}>{label}: {displayCount}</Text>
      <View style={st.modelCountBtns}>
        <Pressable
          onPress={() => {
            const current = isCustom ? customCount : defaultCount;
            if (current > 1) onChange(current - 1);
          }}
          style={({ pressed }) => [st.modelCountBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={st.modelCountBtnText}>-</Text>
        </Pressable>
        <Text style={[st.modelCountValue, isCustom && { color: '#eab308' }]}>{displayCount}</Text>
        <Pressable
          onPress={() => {
            const current = isCustom ? customCount : defaultCount;
            onChange(current + 1);
          }}
          style={({ pressed }) => [st.modelCountBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={st.modelCountBtnText}>+</Text>
        </Pressable>
        {isCustom && (
          <Pressable
            onPress={() => onChange(0)}
            style={({ pressed }) => [st.modelCountResetBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={st.modelCountResetText}>{t('resetCount')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function UpgradeSelector({
  unit,
  selected,
  onChange,
  title,
}: {
  unit: UnitCard;
  selected: number[];
  onChange: (value: number[]) => void;
  title: string;
}) {
  const { t } = useI18n();
  const options = getOptionalUpgrades(unit);
  if (options.length === 0) return null;

  return (
    <View style={st.weaponPicker}>
      <Text style={st.subLabel}>{title}</Text>
      {options.map(({ upgrade, index }) => {
        const active = selected.includes(index);
        return (
          <Pressable
            key={index}
            onPress={() => onChange(active ? selected.filter(v => v !== index) : [...selected, index])}
            style={({ pressed }) => [st.weaponOption, active && st.weaponOptionActive, pressed && { opacity: 0.7 }]}
          >
            <Text style={[st.weaponOptionText, active && { color: '#38bdf8' }]}>
              {active ? '✓ ' : ''}{upgrade.name}
            </Text>
            <Text style={st.weaponKwText}>{upgrade.costS || upgrade.costL ? `S:${upgrade.costS || 0} / L:${upgrade.costL || 0}` : t('optionalUpgrade')}</Text>
            {upgrade.description ? <Text style={st.weaponSurgeText}>{upgrade.description}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={st.toggleRow}>
      <Text style={st.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#334155', true: '#38bdf840' }}
        thumbColor={value ? '#38bdf8' : '#64748b'}
      />
    </View>
  );
}

function ResultItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={st.resultItem}>
      <Text style={st.resultItemLabel}>{label}</Text>
      <Text style={[st.resultItemValue, { color }]}>{value}</Text>
    </View>
  );
}

function stepColor(step: string): string {
  switch (step) {
    case 'attack_roll': return '#38bdf8';
    case 'surge_resolve': return '#a855f7';
    case 'armour_roll': return '#22c55e';
    case 'evade_roll': return '#06b6d4';
    case 'damage_resolve': return '#ef4444';
    default: return '#e5e7eb';
  }
}

// --- Main ---
export default function ToolsScreen() {
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ tab?: string; armyAId?: string; armyBId?: string }>();
  const [tab, setTab] = useState<ToolTab>('dice');

  useEffect(() => {
    if (LEGACY_CALCULATOR_EXECUTION_ENABLED && params.tab === 'roster') setTab('roster');
  }, [params.tab]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={st.header}>
        <Text style={st.headerTitle}>{t('toolbox')}</Text>
      </View>
      <View style={st.tabs}>
        {([
          ['dice', t('diceRoller')],
          ['damage', t('damageCalc')],
          ['matchup', t('matchupCalc')],
          ['versus', t('versusCalc')],
          ['roster', '军表分析'],
        ] as [ToolTab, string][]).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityState={{ disabled: key !== 'dice' }}
            disabled={key !== 'dice'}
            onPress={() => {
              if (key === 'dice') setTab(key);
            }}
            style={({ pressed }) => [
              st.tabBtn,
              tab === key && st.tabBtnActive,
              key !== 'dice' && st.tabBtnDisabled,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[st.tabBtnText, tab === key && st.tabBtnTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View accessibilityRole="alert" style={st.legacyToolNotice}>
        <Text style={st.legacyToolNoticeText}>
          {lang === 'zh'
            ? '伤害、对位、VS 与军表分析仍绑定旧 beta 规则，仅保留为历史界面证据，当前不可执行。骰子是本地非权威工具，可继续使用。'
            : 'Damage, Matchup, Versus, and Roster Analysis remain bound to legacy beta rules. Their historical UI is retained but execution is isolated. Dice remains available as a local, non-authoritative tool.'}
        </Text>
      </View>
      {tab === 'dice' && <DicePanel />}
      {LEGACY_CALCULATOR_EXECUTION_ENABLED && tab === 'damage' && <DamagePanel />}
      {LEGACY_CALCULATOR_EXECUTION_ENABLED && tab === 'matchup' && <MatchupPanel />}
      {LEGACY_CALCULATOR_EXECUTION_ENABLED && tab === 'versus' && <VersusPanel />}
      {LEGACY_CALCULATOR_EXECUTION_ENABLED && tab === 'roster' && <RosterAnalysisPanel initialArmyAId={typeof params.armyAId === 'string' ? params.armyAId : undefined} initialArmyBId={typeof params.armyBId === 'string' ? params.armyBId : undefined} />}
    </ScreenContainer>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#e5e7eb' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#38bdf8' },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#38bdf8' },
  tabBtnDisabled: { opacity: 0.35 },
  legacyToolNotice: { margin: 12, marginBottom: 0, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#475569', backgroundColor: '#111827' },
  legacyToolNoticeText: { fontSize: 12, lineHeight: 18, color: '#cbd5e1' },

  // Dice
  configRow: { gap: 16, marginBottom: 16 },
  configItem: {},
  configLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  diceOptions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  diceOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  diceOptionActive: { borderColor: '#38bdf8', backgroundColor: '#38bdf810' },
  diceOptionText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  diceOptionTextActive: { color: '#38bdf8' },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  countBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  countBtnText: { fontSize: 18, fontWeight: '700', color: '#e5e7eb' },
  countValue: { fontSize: 20, fontWeight: '800', color: '#e5e7eb', minWidth: 30, textAlign: 'center' },
  rollBtn: { backgroundColor: '#38bdf8', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginBottom: 16 },
  rollBtnText: { fontSize: 16, fontWeight: '800', color: '#020617' },
  resultBox: { backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  diceResults: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 12 },
  dieResult: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#38bdf8' },
  dieValue: { fontSize: 20, fontWeight: '800', color: '#38bdf8' },
  totalText: { fontSize: 18, fontWeight: '800', color: '#22c55e', textAlign: 'center' },
  historySection: { marginTop: 8 },
  historyTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  historyLabel: { fontSize: 12, fontWeight: '700', color: '#38bdf8', width: 40 },
  historyValues: { fontSize: 12, color: '#94a3b8', flex: 1 },
  historyTotal: { fontSize: 12, fontWeight: '700', color: '#22c55e' },

  // Damage / Matchup shared
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  subLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  factionPicker: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  factionBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#334155', alignItems: 'center', backgroundColor: '#0f172a' },
  factionBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  unitPicker: { marginBottom: 8 },
  unitPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  unitPickerText: { fontSize: 14, color: '#e5e7eb' },
  unitPickerChevron: { color: '#64748b', fontSize: 12 },
  unitPickerDropdown: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginTop: 4 },
  unitPickerSearch: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#334155', color: '#e5e7eb', fontSize: 13 },
  unitPickerItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  unitPickerItemText: { fontSize: 13, fontWeight: '600', color: '#e5e7eb' },
  unitPickerItemSub: { fontSize: 10, color: '#64748b', marginTop: 1 },
  weaponPicker: { marginTop: 8 },
  weaponOption: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#334155', marginBottom: 4, backgroundColor: '#0f172a' },
  weaponOptionActive: { borderColor: '#ef4444', backgroundColor: '#ef444410' },
  weaponOptionText: { fontSize: 12, color: '#94a3b8' },
  weaponSurgeText: { fontSize: 10, color: '#a855f7', marginTop: 2 },
  weaponKwText: { fontSize: 10, color: '#eab308', marginTop: 2 },

  // Size picker
  sizePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sizePickerLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  sizePickerBtns: { flexDirection: 'row', gap: 6 },
  sizeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  sizeBtnActive: { borderColor: '#38bdf8', backgroundColor: '#38bdf810' },
  sizeBtnText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  sizeBtnTextActive: { color: '#38bdf8' },

  // Modifier section
  modifierSection: { marginTop: 12, padding: 12, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  modifierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modifierLabel: { fontSize: 12, color: '#94a3b8' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  toggleLabel: { fontSize: 12, color: '#94a3b8' },

  // Results
  resultPanel: { marginTop: 16, backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  resultTitle: { fontSize: 14, fontWeight: '800', color: '#e5e7eb', marginBottom: 12 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultItem: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 65, flex: 1 },
  resultItemLabel: { fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' },
  resultItemValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  // Step breakdown
  stepRow: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: '#e5e7eb' },
  stepValue: { fontSize: 16, fontWeight: '800' },
  stepDesc: { fontSize: 10, color: '#64748b', lineHeight: 16 },

  // Keywords
  kwSection: { marginTop: 12, padding: 10, backgroundColor: '#1e293b', borderRadius: 8 },
  kwTitle: { fontSize: 11, fontWeight: '700', color: '#eab308', marginBottom: 6 },
  kwRow: { marginBottom: 4 },
  kwName: { fontSize: 11, fontWeight: '700', color: '#f97316' },
  kwEffect: { fontSize: 10, color: '#94a3b8' },

  targetInfo: { marginTop: 8, padding: 8, backgroundColor: '#1e293b', borderRadius: 6 },
  targetInfoText: { fontSize: 11, color: '#64748b', lineHeight: 16 },

  // Matchup
  matchupResult: { marginTop: 16, backgroundColor: '#0f172a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  matchupSection: { marginBottom: 16 },
  matchupHeader: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  matchupStat: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  matchupWeapon: { marginTop: 6, padding: 10, backgroundColor: '#1e293b', borderRadius: 8 },
  matchupWeaponName: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  matchupWeaponDetail: { fontSize: 11, color: '#64748b', marginTop: 2 },
  matchupKwText: { fontSize: 10, color: '#eab308', marginTop: 2 },
  matchupSummary: { marginTop: 8, padding: 12, backgroundColor: '#22c55e10', borderRadius: 8, borderWidth: 1, borderColor: '#22c55e30' },
  matchupSummaryTitle: { fontSize: 12, fontWeight: '800', color: '#22c55e', marginBottom: 4 },
  matchupSummaryText: { fontSize: 13, color: '#e5e7eb' },

  // Versus Panel specific
  weaponSummaryBox: { marginTop: 8, padding: 12, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  weaponSummaryTitle: { fontSize: 12, fontWeight: '700', color: '#e5e7eb', marginBottom: 8 },
  weaponSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  weaponCountBadge: { flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#38bdf8', alignItems: 'center', backgroundColor: '#0a0e1a' },
  weaponCountNum: { fontSize: 18, fontWeight: '800', color: '#38bdf8' },
  weaponCountLabel: { fontSize: 9, fontWeight: '600', color: '#64748b', marginTop: 2 },
  weaponListItem: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  weaponListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weaponListName: { fontSize: 12, fontWeight: '700', color: '#e5e7eb', flex: 1 },
  weaponListDetail: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  weaponListKw: { fontSize: 9, color: '#eab308', marginTop: 2 },
  phaseTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  phaseTagRanged: { backgroundColor: '#38bdf820' },
  phaseTagMelee: { backgroundColor: '#ef444420' },
  phaseTagText: { fontSize: 9, fontWeight: '700', color: '#e5e7eb' },

  // Phase filter
  phaseFilterSection: { marginTop: 16 },
  phaseFilterRow: { flexDirection: 'row', gap: 6 },
  phaseFilterBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center', backgroundColor: '#0f172a' },
  phaseFilterBtnAll: { borderColor: '#eab308', backgroundColor: '#eab30810' },
  phaseFilterBtnRanged: { borderColor: '#38bdf8', backgroundColor: '#38bdf810' },
  phaseFilterBtnMelee: { borderColor: '#ef4444', backgroundColor: '#ef444410' },
  phaseFilterBtnText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  phaseFilterBtnTextActive: { color: '#e5e7eb' },

  // Comparison table
  comparisonTable: { marginTop: 16, backgroundColor: '#0f172a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#334155' },
  compTableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  compTableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  compTableCell: { flex: 1, fontSize: 11, fontWeight: '600', color: '#e5e7eb', textAlign: 'center' },
  compTableHeaderCell: { fontWeight: '700', color: '#64748b', textTransform: 'uppercase', fontSize: 10 },

  // Damage summary row
  dmgSummaryRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dmgSummaryItem: { flex: 1, alignItems: 'center', padding: 8, backgroundColor: '#0a0e1a', borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
  dmgSummaryLabel: { fontSize: 9, fontWeight: '600', color: '#64748b' },
  dmgSummaryValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },

  // Weapon result header
  weaponResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weaponDmgBadge: { fontSize: 12, fontWeight: '800' },
  weaponStepText: { fontSize: 9, color: '#475569', marginTop: 2, lineHeight: 14 },

  // VS divider
  vsDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  vsDividerLine: { flex: 1, height: 1, backgroundColor: '#334155' },
  vsDividerText: { paddingHorizontal: 12, fontSize: 14, fontWeight: '800', color: '#ef4444' },

  // No weapon text
  noWeaponText: { fontSize: 12, color: '#64748b', fontStyle: 'italic', paddingVertical: 8 },

  // Stats comparison
  statsCompare: { marginTop: 16, padding: 12, backgroundColor: '#1e293b', borderRadius: 10 },
  statsCompareTitle: { fontSize: 12, fontWeight: '700', color: '#e5e7eb', marginBottom: 8 },
  statsCompareHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#334155' },
  statsCompareRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  statsCompareCell: { flex: 1, fontSize: 11, fontWeight: '600', color: '#e5e7eb', textAlign: 'center' },

  // ModelCountPicker
  modelCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6, marginTop: 4, backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  modelCountLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  modelCountBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modelCountBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  modelCountBtnText: { fontSize: 16, fontWeight: '700', color: '#e5e7eb' },
  modelCountValue: { fontSize: 16, fontWeight: '800', color: '#e5e7eb', minWidth: 24, textAlign: 'center' },
  modelCountResetBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#eab30820', borderWidth: 1, borderColor: '#eab308' },
  modelCountResetText: { fontSize: 10, fontWeight: '700', color: '#eab308' },

  // Army import
  unitSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  armyImportBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#22c55e', backgroundColor: '#22c55e10' },
  armyImportBtnText: { fontSize: 10, fontWeight: '700', color: '#22c55e' },
  armyImportOverlay: { backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', padding: 12, marginBottom: 16 },
  armyImportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  armyImportTitle: { fontSize: 13, fontWeight: '700', color: '#e5e7eb' },
  armyImportClose: { fontSize: 12, fontWeight: '600', color: '#ef4444' },
  armyImportBack: { fontSize: 12, fontWeight: '600', color: '#38bdf8', marginBottom: 8 },
  armyImportEmpty: { fontSize: 12, color: '#64748b', fontStyle: 'italic', padding: 12, textAlign: 'center' },
  armyImportItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  armyImportFactionDot: { width: 8, height: 8, borderRadius: 4 },
  armyImportItemName: { fontSize: 13, fontWeight: '700', color: '#e5e7eb' },
  armyImportItemSub: { fontSize: 10, color: '#64748b', marginTop: 1 },
});
