import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, Pressable, ScrollView, TextInput, Alert, StyleSheet, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useData } from '@/lib/data-context';
import { useI18n } from '@/lib/i18n';
import type {
  MatchRecord, RoundRecord, ArmyList, BattleUnit, BuildingEnergy,
  PlayerBattleState, StatusEffect, UnitStatus, TacticalCard, UnitCard,
  TimelineEvent, TimelineEventType,
} from '@/lib/types';
import { FACTION_COLORS } from '@/lib/types';

const ALL_STATUSES: StatusEffect[] = [
  'BUFF_SPEED', 'DEBUFF_SPEED', 'TOUGH', 'HIDDEN', 'PINNED',
  'ENGAGED', 'STUNNED', 'REGENERATE', 'SHIELD_REGEN', 'CUSTOM',
];

type MatchStep = 'list' | 'setup' | 'play' | 'summary';
type PlayTab = 'round' | 'units' | 'buildings' | 'supply' | 'log';
type GamePhase = 'movement' | 'assault' | 'combat' | 'scoring';
const PHASES: GamePhase[] = ['movement', 'assault', 'combat', 'scoring'];
const PHASE_LABELS: Record<GamePhase, string> = { movement: 'Movement', assault: 'Assault', combat: 'Combat', scoring: 'Scoring' };
const PHASE_COLORS: Record<GamePhase, string> = { movement: '#38bdf8', assault: '#f59e0b', combat: '#ef4444', scoring: '#22c55e' };

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Timeline event colors by type */
const TIMELINE_COLORS: Record<TimelineEventType, string> = {
  deploy: '#22c55e',
  withdraw: '#f59e0b',
  destroy: '#ef4444',
  revive: '#a78bfa',
  damage: '#f87171',
  heal: '#86efac',
  status_add: '#fbbf24',
  status_remove: '#94a3b8',
  phase: '#38bdf8',
  round: '#e5e7eb',
  note: '#64748b',
};

/** Timeline event icons by type */
const TIMELINE_ICONS: Record<TimelineEventType, string> = {
  deploy: '▶',
  withdraw: '◀',
  destroy: '☠',
  revive: '♥',
  damage: '☠',
  heal: '✚',
  status_add: '▲',
  status_remove: '▼',
  phase: '◆',
  round: '★',
  note: '✎',
};

function createEmptyMatch(t: (k: any) => string): MatchRecord {
  return {
    id: uid(),
    name: t('newMatchName'),
    date: Date.now(),
    player1Name: t('player1'),
    player2Name: t('player2'),
    player1ArmyId: null,
    player2ArmyId: null,
    rounds: [],
    player1TotalScore: 0,
    player2TotalScore: 0,
    winner: '',
    notes: '',
  };
}

function createEmptyRound(num: number): RoundRecord {
  return {
    roundNumber: num,
    player1Damage: 0,
    player2Damage: 0,
    player1Kills: [],
    player2Kills: [],
    player1Score: 0,
    player2Score: 0,
    player1MissionProgress: '',
    player2MissionProgress: '',
    notes: '',
  };
}

/** Create BattleUnit instances from an army's roster */
function initBattleUnits(army: ArmyList, unitCards: UnitCard[]): BattleUnit[] {
  return army.roster.map((ru, idx) => {
    // Look up the UnitCard to get accurate model count from squad profile
    const card = unitCards.find(c => c.id === ru.unitId);
    const profile = ru.size === 'small' ? card?.smallProfile : card?.largeProfile;
    const models = profile?.models ?? 1;
    const hp = ru.stats.hp || 1;
    const shield = ru.stats.shield || 0;
    return {
      instanceId: uid(),
      unitId: ru.unitId,
      rosterIndex: idx,
      name: ru.name,
      customName: '',
      faction: army.faction,
      unitType: ru.unitType,
      size: ru.size,
      supply: ru.supply || 0,
      maxHp: hp,
      currentHp: hp,
      maxShield: shield,
      currentShield: shield,
      maxModels: models,
      currentModels: models,
      hasActivated: false,
      hasReacted: false,
      isOnField: false,
      isDestroyed: false,
      statuses: [],
    };
  });
}

/** Create BuildingEnergy entries from army's tactical cards */
function initBuildings(army: ArmyList, cards: TacticalCard[]): BuildingEnergy[] {
  const buildings: BuildingEnergy[] = [];
  // Faction card
  if (army.factionCardId) {
    const fc = cards.find(c => c.id === army.factionCardId);
    if (fc && fc.resource && fc.resource > 0) {
      buildings.push({
        cardId: fc.id,
        cardName: fc.name,
        maxEnergy: fc.resource,
        currentEnergy: fc.resource,
        usedThisRound: false,
      });
    }
  }
  // Tactical cards with resource
  army.tacticalCardIds.forEach(tid => {
    const tc = cards.find(c => c.id === tid);
    if (tc && tc.resource && tc.resource > 0) {
      buildings.push({
        cardId: tc.id,
        cardName: tc.name,
        maxEnergy: tc.resource,
        currentEnergy: tc.resource,
        usedThisRound: false,
      });
    }
  });
  return buildings;
}

/** Parse extraSupply string like "2 per round" or "+2" to a number */
function parseExtraSupply(s?: string): number {
  if (!s) return 0;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

// ============================================================
// Main Component
// ============================================================
export default function MatchScreen() {
  const { t, unitName } = useI18n();
  const router = useRouter();
  const { matches, armyLists, units: unitCards, cards, gameCards, saveMatchRecord, deleteMatchRecord } = useData();
  const [step, setStep] = useState<MatchStep>('list');
  const [currentMatch, setCurrentMatch] = useState<MatchRecord | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [playTab, setPlayTab] = useState<PlayTab>('round');
  // Status add modal state
  const [statusTarget, setStatusTarget] = useState<{ player: 1 | 2; unitIdx: number } | null>(null);
  const [statusPick, setStatusPick] = useState<StatusEffect>('TOUGH');
  const [statusVal, setStatusVal] = useState('');
  const [statusCustomLabel, setStatusCustomLabel] = useState('');
  // Current game phase for activation tracking
  const [currentPhase, setCurrentPhase] = useState<GamePhase>('movement');
  // Note input for timeline
  const [noteText, setNoteText] = useState('');
  // Current round number (derived from currentRound index)
  const currentRoundNumber = currentMatch?.rounds[currentRound]?.roundNumber ?? 1;

  /** Add a timeline event to the current match */
  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, 'id' | 'timestamp' | 'round'>) => {
    if (!currentMatch) return;
    const newEvent: TimelineEvent = {
      ...event,
      id: uid(),
      timestamp: Date.now(),
      round: currentMatch.rounds[currentRound]?.roundNumber ?? 1,
    };
    setCurrentMatch(prev => prev ? {
      ...prev,
      timeline: [...(prev.timeline || []), newEvent],
    } : prev);
  }, [currentMatch, currentRound]);

  // Helper to update battle state
  const updateBattle = useCallback((player: 1 | 2, updater: (state: PlayerBattleState) => PlayerBattleState) => {
    if (!currentMatch) return;
    const key = player === 1 ? 'player1Battle' : 'player2Battle';
    const current = currentMatch[key] || { units: [], buildings: [], totalSupply: 0, usedSupply: 0 };
    setCurrentMatch({ ...currentMatch, [key]: updater(current) });
  }, [currentMatch]);

  const updateUnit = useCallback((player: 1 | 2, unitIdx: number, updater: (u: BattleUnit) => BattleUnit) => {
    updateBattle(player, state => {
      const units = [...state.units];
      units[unitIdx] = updater({ ...units[unitIdx] });
      // Recalculate used supply
      const usedSupply = units.filter(u => u.isOnField && !u.isDestroyed).reduce((s, u) => s + u.supply, 0);
      return { ...state, units, usedSupply };
    });
  }, [updateBattle]);

  const updateBuilding = useCallback((player: 1 | 2, bldIdx: number, updater: (b: BuildingEnergy) => BuildingEnergy) => {
    updateBattle(player, state => {
      const buildings = [...state.buildings];
      buildings[bldIdx] = updater({ ...buildings[bldIdx] });
      return { ...state, buildings };
    });
  }, [updateBattle]);

  // ============================================================
  // Match List
  // ============================================================
  if (step === 'list') {
    // ---- Compute history stats ----
    const finishedMatches = matches.filter(m => m.winner);
    const totalFinished = finishedMatches.length;
    // Faction win counts
    const factionWins: Record<string, number> = {};
    const factionPlayed: Record<string, number> = {};
    finishedMatches.forEach(m => {
      const p1Army = armyLists.find(a => a.id === m.player1ArmyId);
      const p2Army = armyLists.find(a => a.id === m.player2ArmyId);
      const factions = [p1Army?.faction, p2Army?.faction].filter(Boolean) as string[];
      factions.forEach(f => { factionPlayed[f] = (factionPlayed[f] || 0) + 1; });
      if (m.winner && m.winner !== 'Draw' && m.winner !== t('draw')) {
        const winnerArmy = m.player1TotalScore > m.player2TotalScore ? p1Army : p2Army;
        if (winnerArmy?.faction) factionWins[winnerArmy.faction] = (factionWins[winnerArmy.faction] || 0) + 1;
      }
    });
    const factionOrder = ['Terran', 'Zerg', 'Protoss'];
    const factionColors: Record<string, string> = { Terran: '#38bdf8', Zerg: '#a78bfa', Protoss: '#fbbf24' };

    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={ms.header}>
          <Text style={ms.headerTitle}>{t('matchRecordTitle')}</Text>
          <Text style={ms.headerSub}>{matches.length} {t('matchCount')}</Text>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {/* ---- Stats Panel ---- */}
          {matches.length > 0 && (
            <View style={ms.statPanel}>
              {/* Overview row */}
              <View style={ms.statRow}>
                <View style={ms.statItem}>
                  <Text style={ms.statNum}>{matches.length}</Text>
                  <Text style={ms.statLabel}>{t('statTotal')}</Text>
                </View>
                <View style={ms.statItem}>
                  <Text style={ms.statNum}>{totalFinished}</Text>
                  <Text style={ms.statLabel}>{t('statFinished')}</Text>
                </View>
                <View style={ms.statItem}>
                  <Text style={ms.statNum}>{matches.length - totalFinished}</Text>
                  <Text style={ms.statLabel}>{t('statOngoing')}</Text>
                </View>
              </View>
              {/* Faction win rate */}
              {totalFinished > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={ms.statSectionTitle}>{t('statFactionWinRate')}</Text>
                  {factionOrder.filter(f => factionPlayed[f]).map(f => {
                    const wins = factionWins[f] || 0;
                    const played = factionPlayed[f] || 0;
                    const rate = played > 0 ? Math.round((wins / played) * 100) : 0;
                    const barWidth = Math.max(rate, 4);
                    return (
                      <View key={f} style={ms.factionRow}>
                        <Text style={[ms.factionName, { color: factionColors[f] || '#94a3b8' }]}>{f}</Text>
                        <View style={ms.factionBarBg}>
                          <View style={[ms.factionBarFill, { width: `${barWidth}%` as any, backgroundColor: factionColors[f] || '#94a3b8' }]} />
                        </View>
                        <Text style={ms.factionStat}>{wins}/{played} ({rate}%)</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          {matches.length === 0 ? (
            <View style={ms.emptyBox}>
              <Text style={ms.emptyText}>{t('noMatches')}</Text>
            </View>
          ) : (
            matches.map(m => (
              <Pressable
                key={m.id}
                onPress={() => { setCurrentMatch({ ...m }); setStep(m.rounds.length > 0 ? 'play' : 'setup'); }}
                onLongPress={() => {
                  Alert.alert(t('deleteMatch'), t('deleteMatchConfirm'), [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('delete'), style: 'destructive', onPress: () => deleteMatchRecord(m.id) },
                  ]);
                }}
                style={({ pressed }) => [ms.matchCard, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={ms.matchName}>{m.name}</Text>
                  <Text style={ms.matchSub}>
                    {m.player1Name} vs {m.player2Name} · {m.rounds.length} {t('roundN')}
                    {m.winner ? ` · ${t('winner')}: ${m.winner}` : ''}
                  </Text>
                  {/* Army faction info */}
                  {(m.player1ArmyId || m.player2ArmyId) && (() => {
                    const a1 = armyLists.find(a => a.id === m.player1ArmyId);
                    const a2 = armyLists.find(a => a.id === m.player2ArmyId);
                    return (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                        {a1 && <Text style={[ms.matchDate, { color: FACTION_COLORS[a1.faction] || '#94a3b8' }]}>{a1.name} ({a1.faction})</Text>}
                        {a1 && a2 && <Text style={ms.matchDate}>·</Text>}
                        {a2 && <Text style={[ms.matchDate, { color: FACTION_COLORS[a2.faction] || '#94a3b8' }]}>{a2.name} ({a2.faction})</Text>}
                      </View>
                    );
                  })()}
                  <Text style={ms.matchDate}>{new Date(m.date).toLocaleDateString()}</Text>
                </View>
                <View style={ms.scoreBox}>
                  <Text style={ms.scoreText}>{m.player1TotalScore} : {m.player2TotalScore}</Text>
                </View>
              </Pressable>
            ))
          )}
          <Text style={ms.hintText}>{t('deleteMatch')}: {Platform.OS === 'web' ? 'Right-click' : 'Long press'}</Text>
          <View style={{ height: 100 }} />
        </ScrollView>
        <View style={ms.bottomBar}>
          <Pressable
            onPress={() => { setCurrentMatch(createEmptyMatch(t)); setStep('setup'); }}
            style={({ pressed }) => [ms.newBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={ms.newBtnText}>{t('newMatch')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ============================================================
  // Setup
  // ============================================================
  if (step === 'setup' && currentMatch) {
    const initializeBattle = () => {
      let p1Battle: PlayerBattleState | undefined;
      let p2Battle: PlayerBattleState | undefined;
      let supply1 = 0;
      let supply2 = 0;

      const p1Army = armyLists.find(a => a.id === currentMatch.player1ArmyId);
      const p2Army = armyLists.find(a => a.id === currentMatch.player2ArmyId);

      if (p1Army) {
        const units = initBattleUnits(p1Army, unitCards);
        const buildings = initBuildings(p1Army, cards);
        // Get starting supply from mission card
        if (p1Army.missionId) {
          const mc = gameCards.find(g => g.id === p1Army.missionId);
          if (mc) supply1 = mc.startingSupply || 0;
        }
        p1Battle = { units, buildings, totalSupply: supply1, usedSupply: 0 };
      }
      if (p2Army) {
        const units = initBattleUnits(p2Army, unitCards);
        const buildings = initBuildings(p2Army, cards);
        if (p2Army.missionId) {
          const mc = gameCards.find(g => g.id === p2Army.missionId);
          if (mc) supply2 = mc.startingSupply || 0;
        }
        p2Battle = { units, buildings, totalSupply: supply2, usedSupply: 0 };
      }

      const updated: MatchRecord = {
        ...currentMatch,
        player1Battle: p1Battle,
        player2Battle: p2Battle,
        currentRoundSupply1: supply1,
        currentRoundSupply2: supply2,
        rounds: currentMatch.rounds.length ? currentMatch.rounds : [createEmptyRound(1)],
      };
      setCurrentMatch(updated);
      setCurrentRound(0);
      setPlayTab('round');
      setStep('play');
    };

    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={ms.header}>
          <Pressable onPress={() => setStep('list')} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={ms.backBtn}>{t('back')}</Text>
          </Pressable>
          <Text style={ms.headerTitle}>{t('matchSetup')}</Text>
        </View>
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={ms.label}>{t('matchName')}</Text>
          <TextInput
            style={ms.input}
            value={currentMatch.name}
            onChangeText={txt => setCurrentMatch({ ...currentMatch, name: txt })}
            returnKeyType="done"
          />

          <Text style={ms.label}>{t('player1Name')}</Text>
          <TextInput
            style={ms.input}
            value={currentMatch.player1Name}
            onChangeText={txt => setCurrentMatch({ ...currentMatch, player1Name: txt })}
            returnKeyType="done"
          />
          <Text style={ms.label}>{t('player1Army')}</Text>
          <ArmyPicker
            armies={armyLists}
            value={currentMatch.player1ArmyId}
            onChange={id => setCurrentMatch({ ...currentMatch, player1ArmyId: id })}
          />

          <Text style={[ms.label, { marginTop: 16 }]}>{t('player2Name')}</Text>
          <TextInput
            style={ms.input}
            value={currentMatch.player2Name}
            onChangeText={txt => setCurrentMatch({ ...currentMatch, player2Name: txt })}
            returnKeyType="done"
          />
          <Text style={ms.label}>{t('player2Army')}</Text>
          <ArmyPicker
            armies={armyLists}
            value={currentMatch.player2ArmyId}
            onChange={id => setCurrentMatch({ ...currentMatch, player2ArmyId: id })}
          />

          <Pressable
            onPress={initializeBattle}
            style={({ pressed }) => [ms.startBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={ms.startBtnText}>{t('startMatch')}</Text>
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ============================================================
  // Play
  // ============================================================
  if (step === 'play' && currentMatch) {
    const round = currentMatch.rounds[currentRound];
    const p1Total = currentMatch.rounds.reduce((s, r) => s + r.player1Score, 0);
    const p2Total = currentMatch.rounds.reduce((s, r) => s + r.player2Score, 0);
    const p1Battle = currentMatch.player1Battle;
    const p2Battle = currentMatch.player2Battle;

    const updateRound = (updates: Partial<RoundRecord>) => {
      const newRounds = [...currentMatch.rounds];
      newRounds[currentRound] = { ...newRounds[currentRound], ...updates };
      setCurrentMatch({ ...currentMatch, rounds: newRounds });
    };

    // Switch phase: reset activation flags (but not react, which is per-round)
    const switchPhase = (phase: GamePhase) => {
      const resetActivation = (state?: PlayerBattleState): PlayerBattleState | undefined => {
        if (!state) return state;
        return { ...state, units: state.units.map(u => ({ ...u, hasActivated: false })) };
      };
      const roundNum = currentMatch.rounds[currentRound]?.roundNumber ?? 1;
      const newEvent: TimelineEvent = {
        id: uid(), timestamp: Date.now(), round: roundNum,
        type: 'phase', phase, detail: `${PHASE_LABELS[phase]}`,
      };
      let updated = { ...currentMatch };
      updated.player1Battle = resetActivation(updated.player1Battle);
      updated.player2Battle = resetActivation(updated.player2Battle);
      updated.timeline = [...(updated.timeline || []), newEvent];
      setCurrentMatch(updated);
      setCurrentPhase(phase);
    };

    // New round: reset ALL action flags, add supply
    const addNewRound = () => {
      const newRoundNum = currentMatch.rounds.length + 1;
      const newRound = createEmptyRound(newRoundNum);
      const roundEvent: TimelineEvent = {
        id: uid(), timestamp: Date.now(), round: newRoundNum,
        type: 'round', detail: `Round ${newRoundNum}`,
      };
      let updated = { ...currentMatch, rounds: [...currentMatch.rounds, newRound], timeline: [...(currentMatch.timeline || []), roundEvent] };

      // Reset action flags for all units (both activated and reacted)
      const resetActions = (state?: PlayerBattleState): PlayerBattleState | undefined => {
        if (!state) return state;
        return {
          ...state,
          units: state.units.map(u => ({ ...u, hasActivated: false, hasReacted: false })),
          buildings: state.buildings.map(b => ({ ...b, usedThisRound: false })),
        };
      };
      updated.player1Battle = resetActions(updated.player1Battle);
      updated.player2Battle = resetActions(updated.player2Battle);
      setCurrentPhase('movement'); // Reset to first phase

      // Add supply per round from mission cards
      const p1Army = armyLists.find(a => a.id === currentMatch.player1ArmyId);
      const p2Army = armyLists.find(a => a.id === currentMatch.player2ArmyId);
      if (p1Army?.missionId && updated.player1Battle) {
        const mc = gameCards.find(g => g.id === p1Army.missionId);
        if (mc) {
          const extra = parseExtraSupply(mc.extraSupply);
          updated.player1Battle = { ...updated.player1Battle, totalSupply: updated.player1Battle.totalSupply + extra };
        }
      }
      if (p2Army?.missionId && updated.player2Battle) {
        const mc = gameCards.find(g => g.id === p2Army.missionId);
        if (mc) {
          const extra = parseExtraSupply(mc.extraSupply);
          updated.player2Battle = { ...updated.player2Battle, totalSupply: updated.player2Battle.totalSupply + extra };
        }
      }

      setCurrentMatch(updated);
      setCurrentRound(currentMatch.rounds.length);
    };

    // ---- Render Unit Card ----
    const renderUnitCard = (bu: BattleUnit, player: 1 | 2, idx: number) => {
      const fColor = FACTION_COLORS[bu.faction] || '#94a3b8';
      const displayName = bu.customName || unitName(bu.name);
      const isProtoss = bu.faction === 'Protoss';

      return (
        <View key={bu.instanceId} style={[ms.unitCard, bu.isDestroyed && ms.unitDestroyed, !bu.isOnField && !bu.isDestroyed && ms.unitOffField]}>
          {/* Header: name + status badges */}
          <View style={ms.unitHeader}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[ms.unitName, { color: fColor }]}
                value={bu.customName}
                onChangeText={txt => updateUnit(player, idx, u => ({ ...u, customName: txt }))}
                placeholder={unitName(bu.name)}
                placeholderTextColor="#64748b"
                returnKeyType="done"
              />
              <Text style={ms.unitSub}>{unitName(bu.name)} · {bu.size === 'small' ? 'S' : 'L'} · {bu.supply} sup</Text>
            </View>
            <View style={ms.unitBadges}>
              {bu.isDestroyed ? (
                <Text style={[ms.badge, { backgroundColor: '#7f1d1d' }]}>{t('destroyed')}</Text>
              ) : bu.isOnField ? (
                <Text style={[ms.badge, { backgroundColor: '#14532d' }]}>{t('onField')}</Text>
              ) : (
                <Text style={[ms.badge, { backgroundColor: '#1e293b' }]}>{t('offField')}</Text>
              )}
            </View>
          </View>

          {/* Damage button: shield-first then HP */}
          {!bu.isDestroyed && (
            <View style={ms.dmgRow}>
              <Pressable
                onPress={() => {
                  updateUnit(player, idx, u => {
                    if (u.currentShield > 0) return { ...u, currentShield: u.currentShield - 1 };
                    return { ...u, currentHp: Math.max(0, u.currentHp - 1) };
                  });
                  addTimelineEvent({ type: 'damage', player, unitName: bu.customName || bu.name, detail: `P${player}: ${bu.customName || bu.name} ${t('timelineEventDamage')} -1`, value: 1, phase: currentPhase });
                }}
                style={({ pressed }) => [ms.dmgBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={ms.dmgBtnText}>{t('takeDamage')} -1</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  updateUnit(player, idx, u => {
                    if (u.currentHp < u.maxHp) return { ...u, currentHp: u.currentHp + 1 };
                    if (isProtoss && u.currentShield < u.maxShield) return { ...u, currentShield: u.currentShield + 1 };
                    return u;
                  });
                  addTimelineEvent({ type: 'heal', player, unitName: bu.customName || bu.name, detail: `P${player}: ${bu.customName || bu.name} ${t('timelineEventHeal')} +1`, value: 1, phase: currentPhase });
                }}
                style={({ pressed }) => [ms.healBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={ms.healBtnText}>{t('heal')} +1</Text>
              </Pressable>
            </View>
          )}

          {/* HP / Shield / Models bar */}
          <View style={ms.hpRow}>
            {isProtoss && (
              <View style={ms.hpBlock}>
                <Text style={[ms.hpLabel, { color: '#38bdf8' }]}>{t('shieldLabel')}</Text>
                <View style={ms.hpControls}>
                  <Pressable onPress={() => updateUnit(player, idx, u => ({ ...u, currentShield: Math.max(0, u.currentShield - 1) }))} style={({ pressed }) => [ms.hpBtn, pressed && { opacity: 0.6 }]}>
                    <Text style={ms.hpBtnText}>-</Text>
                  </Pressable>
                  <Text style={[ms.hpValue, { color: '#38bdf8' }]}>{bu.currentShield}/{bu.maxShield}</Text>
                  <Pressable onPress={() => updateUnit(player, idx, u => ({ ...u, currentShield: Math.min(u.maxShield, u.currentShield + 1) }))} style={({ pressed }) => [ms.hpBtn, pressed && { opacity: 0.6 }]}>
                    <Text style={ms.hpBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
            )}
            <View style={ms.hpBlock}>
              <Text style={[ms.hpLabel, { color: '#ef4444' }]}>{t('hpLabel')}</Text>
              <View style={ms.hpControls}>
                <Pressable onPress={() => updateUnit(player, idx, u => ({ ...u, currentHp: Math.max(0, u.currentHp - 1) }))} style={({ pressed }) => [ms.hpBtn, pressed && { opacity: 0.6 }]}>
                  <Text style={ms.hpBtnText}>-</Text>
                </Pressable>
                <Text style={[ms.hpValue, { color: '#ef4444' }]}>{bu.currentHp}/{bu.maxHp}</Text>
                <Pressable onPress={() => updateUnit(player, idx, u => ({ ...u, currentHp: Math.min(u.maxHp, u.currentHp + 1) }))} style={({ pressed }) => [ms.hpBtn, pressed && { opacity: 0.6 }]}>
                  <Text style={ms.hpBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
            <View style={ms.hpBlock}>
              <Text style={ms.hpLabel}>{t('modelsLabel')}</Text>
              <View style={ms.hpControls}>
                <Pressable onPress={() => updateUnit(player, idx, u => ({ ...u, currentModels: Math.max(0, u.currentModels - 1) }))} style={({ pressed }) => [ms.hpBtn, pressed && { opacity: 0.6 }]}>
                  <Text style={ms.hpBtnText}>-</Text>
                </Pressable>
                <Text style={ms.hpValue}>{bu.currentModels}/{bu.maxModels}</Text>
                <Pressable onPress={() => updateUnit(player, idx, u => ({ ...u, currentModels: Math.min(u.maxModels, u.currentModels + 1) }))} style={({ pressed }) => [ms.hpBtn, pressed && { opacity: 0.6 }]}>
                  <Text style={ms.hpBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Action toggles */}
          <View style={ms.actionRow}>
            <Pressable
              onPress={() => updateUnit(player, idx, u => ({ ...u, hasActivated: !u.hasActivated }))}
              style={({ pressed }) => [ms.actionBtn, bu.hasActivated && ms.actionActive, pressed && { opacity: 0.7 }]}
            >
              <Text style={[ms.actionText, bu.hasActivated && { color: '#fbbf24' }]}>Active</Text>
            </Pressable>
            <Pressable
              onPress={() => updateUnit(player, idx, u => ({ ...u, hasReacted: !u.hasReacted }))}
              style={({ pressed }) => [ms.actionBtn, bu.hasReacted && ms.actionActive, pressed && { opacity: 0.7 }]}
            >
              <Text style={[ms.actionText, bu.hasReacted && { color: '#fbbf24' }]}>React</Text>
            </Pressable>

            {/* Deploy / Withdraw / Destroy buttons */}
            {!bu.isDestroyed && !bu.isOnField && (
              <Pressable
                onPress={() => {
                  updateUnit(player, idx, u => ({ ...u, isOnField: true }));
                  addTimelineEvent({ type: 'deploy', player, unitName: bu.customName || bu.name, detail: `P${player}: ${bu.customName || bu.name} ${t('timelineEventDeploy')}`, phase: currentPhase });
                }}
                style={({ pressed }) => [ms.actionBtn, { borderColor: '#22c55e' }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[ms.actionText, { color: '#22c55e' }]}>{t('deploy')}</Text>
              </Pressable>
            )}
            {bu.isOnField && !bu.isDestroyed && (
              <Pressable
                onPress={() => {
                  updateUnit(player, idx, u => ({ ...u, isOnField: false }));
                  addTimelineEvent({ type: 'withdraw', player, unitName: bu.customName || bu.name, detail: `P${player}: ${bu.customName || bu.name} ${t('timelineEventWithdraw')}`, phase: currentPhase });
                }}
                style={({ pressed }) => [ms.actionBtn, { borderColor: '#f59e0b' }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[ms.actionText, { color: '#f59e0b' }]}>{t('withdraw')}</Text>
              </Pressable>
            )}
            {!bu.isDestroyed && (
              <Pressable
                onPress={() => {
                  updateUnit(player, idx, u => ({ ...u, isDestroyed: true, isOnField: false, currentHp: 0, currentShield: 0, currentModels: 0 }));
                  addTimelineEvent({ type: 'destroy', player, unitName: bu.customName || bu.name, detail: `P${player}: ${bu.customName || bu.name} ${t('timelineEventDestroy')}`, phase: currentPhase });
                }}
                style={({ pressed }) => [ms.actionBtn, { borderColor: '#ef4444' }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[ms.actionText, { color: '#ef4444' }]}>{t('markDestroyed')}</Text>
              </Pressable>
            )}
            {bu.isDestroyed && (
              <Pressable
                onPress={() => {
                  updateUnit(player, idx, u => ({ ...u, isDestroyed: false, currentHp: u.maxHp, currentShield: u.maxShield, currentModels: u.maxModels }));
                  addTimelineEvent({ type: 'revive', player, unitName: bu.customName || bu.name, detail: `P${player}: ${bu.customName || bu.name} ${t('timelineEventRevive')}`, phase: currentPhase });
                }}
                style={({ pressed }) => [ms.actionBtn, { borderColor: '#22c55e' }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[ms.actionText, { color: '#22c55e' }]}>{t('revive')}</Text>
              </Pressable>
            )}
          </View>

          {/* Quick status toggles + custom statuses */}
          {!bu.isDestroyed && (
            <View>
              {/* Quick-toggle row for common statuses */}
              <View style={ms.quickStatusRow}>
                {(['TOUGH','PINNED','HIDDEN','STUNNED','ENGAGED'] as StatusEffect[]).map(se => {
                  const active = bu.statuses.some(s => s.effect === se);
                  return (
                    <Pressable
                      key={se}
                      onPress={() => updateUnit(player, idx, u => ({
                        ...u,
                        statuses: active
                          ? u.statuses.filter(s => s.effect !== se)
                          : [...u.statuses, { effect: se }],
                      }))}
                      style={({ pressed }) => [ms.quickStatusBtn, active && ms.quickStatusActive, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={[ms.quickStatusText, active && ms.quickStatusTextActive]}>
                        {t(('status' + se) as any)}
                      </Text>
                    </Pressable>
                  );
                })}
                {/* More button for custom/other statuses */}
                <Pressable
                  onPress={() => { setStatusTarget({ player, unitIdx: idx }); setStatusPick('BUFF_SPEED'); setStatusVal(''); setStatusCustomLabel(''); }}
                  style={({ pressed }) => [ms.quickStatusBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={ms.quickStatusText}>···</Text>
                </Pressable>
              </View>
              {/* Show custom/value statuses as chips */}
              {bu.statuses.filter(s => !['TOUGH','PINNED','HIDDEN','STUNNED','ENGAGED'].includes(s.effect) || s.value).length > 0 && (
                <View style={ms.statusRow}>
                  {bu.statuses
                    .filter(s => !['TOUGH','PINNED','HIDDEN','STUNNED','ENGAGED'].includes(s.effect) || s.value)
                    .map((st, si) => (
                      <Pressable
                        key={si}
                        onPress={() => updateUnit(player, idx, u => ({ ...u, statuses: u.statuses.filter((_, i) => i !== si) }))}
                        style={({ pressed }) => [ms.statusChip, pressed && { opacity: 0.6 }]}
                      >
                        <Text style={ms.statusChipText}>
                          {st.effect === 'CUSTOM' ? (st.label || t('statusCUSTOM')) : t(('status' + st.effect) as any)}
                          {st.value ? `(${st.value})` : ''} ×
                        </Text>
                      </Pressable>
                    ))}
                </View>
              )}
            </View>
          )}
        </View>
      );
    };

    // ---- Render Building Card ----
    const renderBuildingCard = (bld: BuildingEnergy, player: 1 | 2, idx: number) => (
      <View key={bld.cardId + idx} style={ms.buildingCard}>
        <Text style={ms.buildingName}>{bld.cardName}</Text>
        <View style={ms.hpControls}>
          <Pressable onPress={() => updateBuilding(player, idx, b => ({ ...b, currentEnergy: Math.max(0, b.currentEnergy - 1), usedThisRound: true }))} style={({ pressed }) => [ms.hpBtn, pressed && { opacity: 0.6 }]}>
            <Text style={ms.hpBtnText}>-</Text>
          </Pressable>
          <Text style={[ms.hpValue, { color: '#fbbf24' }]}>{bld.currentEnergy}/{bld.maxEnergy}</Text>
          <Pressable onPress={() => updateBuilding(player, idx, b => ({ ...b, currentEnergy: Math.min(b.maxEnergy, b.currentEnergy + 1) }))} style={({ pressed }) => [ms.hpBtn, pressed && { opacity: 0.6 }]}>
            <Text style={ms.hpBtnText}>+</Text>
          </Pressable>
        </View>
        {bld.usedThisRound && <Text style={ms.usedBadge}>{t('usedEnergy')}</Text>}
      </View>
    );

    // ---- Supply Summary ----
    const renderSupply = (battle: PlayerBattleState | undefined, playerName: string, color: string) => {
      if (!battle) return null;
      const onField = battle.units.filter(u => u.isOnField && !u.isDestroyed);
      const offField = battle.units.filter(u => !u.isOnField && !u.isDestroyed);
      const destroyed = battle.units.filter(u => u.isDestroyed);
      const usedSupply = onField.reduce((s, u) => s + u.supply, 0);

      return (
        <View style={ms.supplySection}>
          <Text style={[ms.playerLabel, { color }]}>{playerName}</Text>
          <View style={ms.supplyBar}>
            <Text style={ms.supplyText}>{t('totalSupplyLabel')}: <Text style={{ color: '#fbbf24', fontWeight: '700' }}>{battle.totalSupply}</Text></Text>
            <Text style={ms.supplyText}>{t('usedSupplyLabel')}: <Text style={{ color: usedSupply > battle.totalSupply ? '#ef4444' : '#22c55e', fontWeight: '700' }}>{usedSupply}</Text></Text>
            <Text style={ms.supplyText}>{t('availableSupply')}: <Text style={{ fontWeight: '700' }}>{battle.totalSupply - usedSupply}</Text></Text>
          </View>
          {onField.length > 0 && (
            <View style={ms.supplyGroup}>
              <Text style={[ms.supplyGroupLabel, { color: '#22c55e' }]}>{t('onField')} ({onField.length})</Text>
              {onField.map(u => (
                <Text key={u.instanceId} style={ms.supplyUnitText}>
                  {u.customName || unitName(u.name)} ({u.size === 'small' ? 'S' : 'L'}) — {u.supply} sup
                </Text>
              ))}
            </View>
          )}
          {offField.length > 0 && (
            <View style={ms.supplyGroup}>
              <Text style={[ms.supplyGroupLabel, { color: '#94a3b8' }]}>{t('offField')} ({offField.length})</Text>
              {offField.map(u => (
                <Text key={u.instanceId} style={ms.supplyUnitText}>
                  {u.customName || unitName(u.name)} ({u.size === 'small' ? 'S' : 'L'}) — {u.supply} sup
                </Text>
              ))}
            </View>
          )}
          {destroyed.length > 0 && (
            <View style={ms.supplyGroup}>
              <Text style={[ms.supplyGroupLabel, { color: '#ef4444' }]}>{t('destroyed')} ({destroyed.length})</Text>
              {destroyed.map(u => (
                <Text key={u.instanceId} style={[ms.supplyUnitText, { textDecorationLine: 'line-through' }]}>
                  {u.customName || unitName(u.name)} ({u.size === 'small' ? 'S' : 'L'}) — {u.supply} sup
                </Text>
              ))}
            </View>
          )}
        </View>
      );
    };

    return (
      <ScreenContainer containerClassName="bg-background">
        {/* Top bar */}
        <View style={ms.playHeader}>
          <Pressable onPress={() => setStep('setup')} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Text style={ms.backBtn}>{t('backToSetup')}</Text>
          </Pressable>
          <Text style={ms.playTitle}>{currentMatch.name}</Text>
          <View style={ms.playHeaderActions}>
            {!!currentMatch.player1ArmyId && !!currentMatch.player2ArmyId && (
              <Pressable
                onPress={() => router.push({ pathname: '/tools', params: { tab: 'roster', armyAId: currentMatch.player1ArmyId!, armyBId: currentMatch.player2ArmyId! } })}
                style={({ pressed }) => [ms.analysisBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={ms.analysisBtnText}>分析当前对阵</Text>
              </Pressable>
            )}
            <Pressable
              onPress={async () => {
                const updated = { ...currentMatch, player1TotalScore: p1Total, player2TotalScore: p2Total };
                await saveMatchRecord(updated);
                Alert.alert(t('saved'), t('matchSaved'));
              }}
              style={({ pressed }) => [ms.saveBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={ms.saveBtnText}>{t('saveMatch')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Score Bar */}
        <View style={ms.scoreBar}>
          <View style={ms.scorePlayer}>
            <Text style={ms.scorePlayerName}>{currentMatch.player1Name}</Text>
            <Text style={[ms.scoreBig, { color: '#38bdf8' }]}>{p1Total}</Text>
          </View>
          <Text style={ms.scoreVs}>VS</Text>
          <View style={ms.scorePlayer}>
            <Text style={ms.scorePlayerName}>{currentMatch.player2Name}</Text>
            <Text style={[ms.scoreBig, { color: '#ef4444' }]}>{p2Total}</Text>
          </View>
        </View>

        {/* Play Tabs: Round / Units / Buildings / Supply / Log */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.playTabs}>
          {(['round', 'units', 'buildings', 'supply', 'log'] as PlayTab[]).map(tab => (
            <Pressable
              key={tab}
              onPress={() => setPlayTab(tab)}
              style={({ pressed }) => [ms.playTabBtn, playTab === tab && ms.playTabActive, pressed && { opacity: 0.7 }]}
            >
              <Text style={[ms.playTabText, playTab === tab && ms.playTabTextActive]}>
                {tab === 'round' ? t('roundN') : tab === 'units' ? t('unitTracker') : tab === 'buildings' ? t('buildingTracker') : tab === 'supply' ? t('supplyTracker') : t('timelineTab')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ---- Tab: Round ---- */}
        {playTab === 'round' && (
          <>
            {/* Round Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.roundTabs}>
              {currentMatch.rounds.map((r, i) => (
                <Pressable
                  key={i}
                  onPress={() => setCurrentRound(i)}
                  style={({ pressed }) => [ms.roundTab, currentRound === i && ms.roundTabActive, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[ms.roundTabText, currentRound === i && ms.roundTabTextActive]}>R{r.roundNumber}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={addNewRound}
                style={({ pressed }) => [ms.roundTab, { borderColor: '#22c55e' }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[ms.roundTabText, { color: '#22c55e' }]}>+</Text>
              </Pressable>
            </ScrollView>

            {round && (
              <ScrollView style={{ flex: 1, padding: 16 }}>
                <Text style={ms.roundTitle}>{t('roundN')} {round.roundNumber}</Text>

                {/* Player 1 */}
                <View style={ms.playerSection}>
                  <Text style={[ms.playerLabel, { color: '#38bdf8' }]}>{currentMatch.player1Name}</Text>
                  <View style={ms.fieldRow}>
                    <Text style={ms.fieldLabel}>{t('dealDamage')}</Text>
                    <TextInput style={ms.fieldInput} keyboardType="numeric" value={String(round.player1Damage)} onChangeText={txt => updateRound({ player1Damage: parseInt(txt) || 0 })} returnKeyType="done" />
                  </View>
                  <View style={ms.fieldRow}>
                    <Text style={ms.fieldLabel}>{t('score')}</Text>
                    <TextInput style={ms.fieldInput} keyboardType="numeric" value={String(round.player1Score)} onChangeText={txt => updateRound({ player1Score: parseInt(txt) || 0 })} returnKeyType="done" />
                  </View>
                  <View style={ms.fieldRow}>
                    <Text style={ms.fieldLabel}>{t('missionProgress')}</Text>
                    <TextInput style={[ms.fieldInput, { flex: 1 }]} value={round.player1MissionProgress} onChangeText={txt => updateRound({ player1MissionProgress: txt })} returnKeyType="done" />
                  </View>
                </View>

                {/* Player 2 */}
                <View style={ms.playerSection}>
                  <Text style={[ms.playerLabel, { color: '#ef4444' }]}>{currentMatch.player2Name}</Text>
                  <View style={ms.fieldRow}>
                    <Text style={ms.fieldLabel}>{t('dealDamage')}</Text>
                    <TextInput style={ms.fieldInput} keyboardType="numeric" value={String(round.player2Damage)} onChangeText={txt => updateRound({ player2Damage: parseInt(txt) || 0 })} returnKeyType="done" />
                  </View>
                  <View style={ms.fieldRow}>
                    <Text style={ms.fieldLabel}>{t('score')}</Text>
                    <TextInput style={ms.fieldInput} keyboardType="numeric" value={String(round.player2Score)} onChangeText={txt => updateRound({ player2Score: parseInt(txt) || 0 })} returnKeyType="done" />
                  </View>
                  <View style={ms.fieldRow}>
                    <Text style={ms.fieldLabel}>{t('missionProgress')}</Text>
                    <TextInput style={[ms.fieldInput, { flex: 1 }]} value={round.player2MissionProgress} onChangeText={txt => updateRound({ player2MissionProgress: txt })} returnKeyType="done" />
                  </View>
                </View>

                {/* Notes */}
                <Text style={ms.label}>{t('roundNotes')}</Text>
                <TextInput
                  style={[ms.input, { height: 60, textAlignVertical: 'top' }]}
                  multiline
                  value={round.notes}
                  onChangeText={txt => updateRound({ notes: txt })}
                  placeholder={t('roundNotesPlaceholder')}
                  placeholderTextColor="#64748b"
                />

                {/* End Match */}
                <Pressable
                  onPress={() => {
                    const winner = p1Total > p2Total ? currentMatch.player1Name : p2Total > p1Total ? currentMatch.player2Name : t('draw');
                    const updated = { ...currentMatch, player1TotalScore: p1Total, player2TotalScore: p2Total, winner };
                    setCurrentMatch(updated);
                    setStep('summary');
                  }}
                  style={({ pressed }) => [ms.endBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={ms.endBtnText}>{t('endMatch')}</Text>
                </Pressable>
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </>
        )}

        {/* ---- Tab: Units ---- */}
        {playTab === 'units' && (
          <>
          {/* Phase indicator bar */}
          <View style={ms.phaseBar}>
            {PHASES.map(ph => (
              <Pressable
                key={ph}
                onPress={() => switchPhase(ph)}
                style={({ pressed }) => [ms.phaseBtn, currentPhase === ph && [ms.phaseActive, { borderColor: PHASE_COLORS[ph] }], pressed && { opacity: 0.7 }]}
              >
                <Text style={[ms.phaseText, currentPhase === ph && [ms.phaseTextActive, { color: PHASE_COLORS[ph] }]]}>{PHASE_LABELS[ph]}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {/* Player 1 units */}
            {p1Battle && p1Battle.units.length > 0 && (
              <View>
                <Text style={[ms.playerLabel, { color: '#38bdf8', marginBottom: 8 }]}>{currentMatch.player1Name}</Text>
                {p1Battle.units.map((u, i) => renderUnitCard(u, 1, i))}
              </View>
            )}
            {/* Player 2 units */}
            {p2Battle && p2Battle.units.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[ms.playerLabel, { color: '#ef4444', marginBottom: 8 }]}>{currentMatch.player2Name}</Text>
                {p2Battle.units.map((u, i) => renderUnitCard(u, 2, i))}
              </View>
            )}
            {!p1Battle && !p2Battle && (
              <View style={ms.emptyBox}>
                <Text style={ms.emptyText}>{t('noBattleState')}</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
          </>
        )}

        {/* ---- Tab: Buildings ---- */}
        {playTab === 'buildings' && (
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {p1Battle && p1Battle.buildings.length > 0 && (
              <View>
                <Text style={[ms.playerLabel, { color: '#38bdf8', marginBottom: 8 }]}>{currentMatch.player1Name}</Text>
                {p1Battle.buildings.map((b, i) => renderBuildingCard(b, 1, i))}
              </View>
            )}
            {p2Battle && p2Battle.buildings.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={[ms.playerLabel, { color: '#ef4444', marginBottom: 8 }]}>{currentMatch.player2Name}</Text>
                {p2Battle.buildings.map((b, i) => renderBuildingCard(b, 2, i))}
              </View>
            )}
            {(!p1Battle || p1Battle.buildings.length === 0) && (!p2Battle || p2Battle.buildings.length === 0) && (
              <View style={ms.emptyBox}>
                <Text style={ms.emptyText}>{t('noBattleState')}</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ---- Tab: Supply ---- */}
        {playTab === 'supply' && (
          <ScrollView style={{ flex: 1, padding: 16 }}>
            {renderSupply(p1Battle, currentMatch.player1Name, '#38bdf8')}
            {renderSupply(p2Battle, currentMatch.player2Name, '#ef4444')}
            {!p1Battle && !p2Battle && (
              <View style={ms.emptyBox}>
                <Text style={ms.emptyText}>{t('noBattleState')}</Text>
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ---- Tab: Log (Timeline) ---- */}
        {playTab === 'log' && (
          <>
          <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={ms.sectionLabel}>{t('timelineTitle')}</Text>
            {/* Add note input */}
            <View style={[ms.fieldRow, { marginBottom: 12 }]}>
              <TextInput
                style={[ms.input, { flex: 1, marginRight: 8 }]}
                value={noteText}
                onChangeText={setNoteText}
                placeholder={t('timelineNotePlaceholder')}
                placeholderTextColor="#64748b"
                returnKeyType="done"
              />
              <Pressable
                onPress={() => {
                  if (!noteText.trim()) return;
                  addTimelineEvent({ type: 'note', detail: noteText.trim() });
                  setNoteText('');
                }}
                style={({ pressed }) => [ms.actionBtn, { borderColor: '#64748b', paddingHorizontal: 14 }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[ms.actionText, { color: '#94a3b8' }]}>{t('timelineAddNote')}</Text>
              </Pressable>
            </View>
            {/* Timeline events (reversed: newest first) */}
            {(!currentMatch.timeline || currentMatch.timeline.length === 0) ? (
              <View style={ms.emptyBox}>
                <Text style={ms.emptyText}>{t('timelineEmpty')}</Text>
              </View>
            ) : (
              [...(currentMatch.timeline)].reverse().map(ev => {
                const color = TIMELINE_COLORS[ev.type] || '#94a3b8';
                const icon = TIMELINE_ICONS[ev.type] || '●';
                const isRound = ev.type === 'round';
                const isPhase = ev.type === 'phase';
                return (
                  <View key={ev.id} style={[
                    ms.timelineItem,
                    isRound && ms.timelineRoundMarker,
                    isPhase && ms.timelinePhaseMarker,
                  ]}>
                    {/* Left: icon + line */}
                    <View style={ms.timelineDot}>
                      <View style={[ms.timelineDotCircle, { backgroundColor: color }]}>
                        <Text style={ms.timelineDotIcon}>{icon}</Text>
                      </View>
                    </View>
                    {/* Right: content */}
                    <View style={{ flex: 1 }}>
                      {isRound ? (
                        <Text style={[ms.timelineRoundText, { color }]}>—— {t('timelineRound')} {ev.round} ——</Text>
                      ) : isPhase ? (
                        <Text style={[ms.timelinePhaseText, { color }]}>{ev.detail}</Text>
                      ) : (
                        <>
                          <Text style={[ms.timelineDetail, { color }]}>{ev.detail}</Text>
                          <Text style={ms.timelineMeta}>
                            R{ev.round}{ev.phase ? ` · ${ev.phase}` : ''}
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
          </>
        )}

        {/* ---- Status Add Modal ---- */}
        {statusTarget && (
          <View style={ms.modalOverlay}>
            <View style={ms.modalBox}>
              <Text style={ms.modalTitle}>{t('addStatus')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {ALL_STATUSES.map(se => (
                  <Pressable
                    key={se}
                    onPress={() => setStatusPick(se)}
                    style={({ pressed }) => [ms.statusPickBtn, statusPick === se && ms.statusPickActive, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[ms.statusPickText, statusPick === se && { color: '#fbbf24' }]}>{t(('status' + se) as any)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {statusPick === 'CUSTOM' && (
                <TextInput
                  style={ms.input}
                  value={statusCustomLabel}
                  onChangeText={setStatusCustomLabel}
                  placeholder={t('customStatusLabel')}
                  placeholderTextColor="#64748b"
                  returnKeyType="done"
                />
              )}
              {['BUFF_SPEED', 'DEBUFF_SPEED', 'TOUGH', 'REGENERATE'].includes(statusPick) && (
                <View style={[ms.fieldRow, { marginTop: 8 }]}>
                  <Text style={ms.fieldLabel}>{t('statusValue')}</Text>
                  <TextInput style={ms.fieldInput} keyboardType="numeric" value={statusVal} onChangeText={setStatusVal} returnKeyType="done" />
                </View>
              )}
              <View style={[ms.fieldRow, { marginTop: 12, justifyContent: 'flex-end', gap: 8 }]}>
                <Pressable onPress={() => setStatusTarget(null)} style={({ pressed }) => [ms.actionBtn, pressed && { opacity: 0.7 }]}>
                  <Text style={ms.actionText}>{t('cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const newStatus: UnitStatus = {
                      effect: statusPick,
                      value: statusVal ? parseInt(statusVal) || undefined : undefined,
                      label: statusPick === 'CUSTOM' ? statusCustomLabel : undefined,
                    };
                    updateUnit(statusTarget.player, statusTarget.unitIdx, u => ({
                      ...u,
                      statuses: [...u.statuses, newStatus],
                    }));
                    setStatusTarget(null);
                  }}
                  style={({ pressed }) => [ms.actionBtn, { borderColor: '#22c55e' }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[ms.actionText, { color: '#22c55e' }]}>{t('confirm')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </ScreenContainer>
    );
  }

  // ============================================================
  // Summary
  // ============================================================
  if (step === 'summary' && currentMatch) {
    const p1Total = currentMatch.player1TotalScore;
    const p2Total = currentMatch.player2TotalScore;
    const totalDmg1 = currentMatch.rounds.reduce((s, r) => s + r.player1Damage, 0);
    const totalDmg2 = currentMatch.rounds.reduce((s, r) => s + r.player2Damage, 0);

    return (
      <ScreenContainer containerClassName="bg-background">
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={ms.summaryTitle}>{t('matchEnd')}</Text>
          <Text style={ms.summaryName}>{currentMatch.name}</Text>

          {/* Army info row */}
          {(currentMatch.player1ArmyId || currentMatch.player2ArmyId) && (() => {
            const a1 = armyLists.find(a => a.id === currentMatch.player1ArmyId);
            const a2 = armyLists.find(a => a.id === currentMatch.player2ArmyId);
            return (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 4, marginBottom: 4 }}>
                {a1 && <Text style={{ fontSize: 12, color: FACTION_COLORS[a1.faction] || '#94a3b8' }}>{a1.name} ({a1.faction})</Text>}
                {a1 && a2 && <Text style={{ fontSize: 12, color: '#64748b' }}>vs</Text>}
                {a2 && <Text style={{ fontSize: 12, color: FACTION_COLORS[a2.faction] || '#94a3b8' }}>{a2.name} ({a2.faction})</Text>}
              </View>
            );
          })()}

          <View style={ms.summaryScoreBox}>
            <View style={ms.summaryPlayer}>
              <Text style={ms.summaryPlayerName}>{currentMatch.player1Name}</Text>
              <Text style={[ms.summaryScore, { color: '#38bdf8' }]}>{p1Total}</Text>
            </View>
            <Text style={ms.summaryVs}>VS</Text>
            <View style={ms.summaryPlayer}>
              <Text style={ms.summaryPlayerName}>{currentMatch.player2Name}</Text>
              <Text style={[ms.summaryScore, { color: '#ef4444' }]}>{p2Total}</Text>
            </View>
          </View>

          <View style={ms.summaryWinner}>
            <Text style={ms.summaryWinnerText}>
              {currentMatch.winner === t('draw') ? t('drawResult') : `${t('winner')}: ${currentMatch.winner}`}
            </Text>
          </View>

          <View style={ms.summaryStats}>
            <View style={ms.summaryStatRow}>
              <Text style={ms.summaryStatLabel}>{t('totalRounds')}</Text>
              <Text style={ms.summaryStatValue}>{currentMatch.rounds.length}</Text>
            </View>
            <View style={ms.summaryStatRow}>
              <Text style={ms.summaryStatLabel}>{currentMatch.player1Name} {t('totalDamageP')}</Text>
              <Text style={[ms.summaryStatValue, { color: '#38bdf8' }]}>{totalDmg1}</Text>
            </View>
            <View style={ms.summaryStatRow}>
              <Text style={ms.summaryStatLabel}>{currentMatch.player2Name} {t('totalDamageP')}</Text>
              <Text style={[ms.summaryStatValue, { color: '#ef4444' }]}>{totalDmg2}</Text>
            </View>
          </View>

          <Text style={ms.sectionLabel}>{t('roundDetails')}</Text>
          {currentMatch.rounds.map((r, i) => (
            <View key={i} style={ms.roundSummary}>
              <Text style={ms.roundSummaryTitle}>{t('roundN')} {r.roundNumber}</Text>
              <Text style={ms.roundSummaryText}>
                {currentMatch.player1Name}: {r.player1Damage} {t('dmgUnit')} {r.player1Score} {t('scoreUnit')}
                {r.player1MissionProgress ? ` · ${r.player1MissionProgress}` : ''}
              </Text>
              <Text style={ms.roundSummaryText}>
                {currentMatch.player2Name}: {r.player2Damage} {t('dmgUnit')} {r.player2Score} {t('scoreUnit')}
                {r.player2MissionProgress ? ` · ${r.player2MissionProgress}` : ''}
              </Text>
              {r.notes ? <Text style={ms.roundSummaryNote}>{r.notes}</Text> : null}
            </View>
          ))}

          {/* Timeline recap */}
          {currentMatch.timeline && currentMatch.timeline.length > 0 && (
            <>
              <Text style={ms.sectionLabel}>{t('timelineTitle')}</Text>
              {currentMatch.timeline.map(ev => {
                const color = TIMELINE_COLORS[ev.type] || '#94a3b8';
                const icon = TIMELINE_ICONS[ev.type] || '●';
                const isRound = ev.type === 'round';
                const isPhase = ev.type === 'phase';
                return (
                  <View key={ev.id} style={[
                    ms.timelineItem,
                    isRound && ms.timelineRoundMarker,
                    isPhase && ms.timelinePhaseMarker,
                  ]}>
                    <View style={ms.timelineDot}>
                      <View style={[ms.timelineDotCircle, { backgroundColor: color }]}>
                        <Text style={ms.timelineDotIcon}>{icon}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      {isRound ? (
                        <Text style={[ms.timelineRoundText, { color }]}>—— {t('timelineRound')} {ev.round} ——</Text>
                      ) : isPhase ? (
                        <Text style={[ms.timelinePhaseText, { color }]}>{ev.detail}</Text>
                      ) : (
                        <>
                          <Text style={[ms.timelineDetail, { color }]}>{ev.detail}</Text>
                          <Text style={ms.timelineMeta}>R{ev.round}{ev.phase ? ` · ${ev.phase}` : ''}</Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <Pressable
            onPress={async () => {
              await saveMatchRecord(currentMatch);
              setStep('list');
              Alert.alert(t('saved'), t('matchSaved'));
            }}
            style={({ pressed }) => [ms.startBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={ms.startBtnText}>{t('saveAndReturn')}</Text>
          </Pressable>
          <View style={{ height: 40 }} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return null;
}

// ============================================================
// ArmyPicker sub-component
// ============================================================
function ArmyPicker({ armies, value, onChange }: { armies: ArmyList[]; value: string | null; onChange: (id: string | null) => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const selected = armies.find(a => a.id === value);

  return (
    <View>
      <Pressable onPress={() => setExpanded(!expanded)} style={({ pressed }) => [ms.pickerBtn, pressed && { opacity: 0.7 }]}>
        <Text style={ms.pickerText}>{selected ? `${selected.name} (${selected.faction})` : t('selectArmy')}</Text>
        <Text style={ms.pickerChevron}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>
      {expanded && (
        <View style={ms.pickerDropdown}>
          <Pressable onPress={() => { onChange(null); setExpanded(false); }} style={({ pressed }) => [ms.pickerItem, pressed && { backgroundColor: '#1e293b' }]}>
            <Text style={ms.pickerItemText}>{t('noArmyOption')}</Text>
          </Pressable>
          {armies.map(a => (
            <Pressable key={a.id} onPress={() => { onChange(a.id); setExpanded(false); }} style={({ pressed }) => [ms.pickerItem, pressed && { backgroundColor: '#1e293b' }]}>
              <Text style={[ms.pickerItemText, { color: FACTION_COLORS[a.faction] }]}>{a.name}</Text>
              <Text style={ms.pickerItemSub}>{a.faction} · {a.roster.length} {t('unitsCount')}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================================
// Styles
// ============================================================
const ms = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#e5e7eb' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  backBtn: { color: '#38bdf8', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 16 },
  hintText: { color: '#475569', fontSize: 11, textAlign: 'center', marginTop: 12 },
  matchCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginTop: 8, padding: 14, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  matchName: { fontSize: 15, fontWeight: '700', color: '#e5e7eb' },
  matchSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  matchDate: { fontSize: 10, color: '#475569', marginTop: 2 },
  scoreBox: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#1e293b', borderRadius: 6 },
  scoreText: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#0f172a' },
  newBtn: { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  newBtnText: { fontSize: 15, fontWeight: '700', color: '#38bdf8' },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#0f172a', borderRadius: 8, padding: 12, color: '#e5e7eb', fontSize: 15, borderWidth: 1, borderColor: '#334155' },
  startBtn: { marginTop: 24, backgroundColor: '#0a7ea4', borderRadius: 10, padding: 14, alignItems: 'center' },
  startBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  playHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  playTitle: { fontSize: 16, fontWeight: '700', color: '#e5e7eb', flex: 1, textAlign: 'center' },
  playHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analysisBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#082f49', borderRadius: 6, borderWidth: 1, borderColor: '#38bdf8' },
  analysisBtnText: { fontSize: 12, fontWeight: '700', color: '#38bdf8' },
  saveBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1e293b', borderRadius: 6 },
  saveBtnText: { fontSize: 13, fontWeight: '600', color: '#22c55e' },
  scoreBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 16 },
  scorePlayer: { alignItems: 'center' },
  scorePlayerName: { fontSize: 12, color: '#94a3b8' },
  scoreBig: { fontSize: 24, fontWeight: '800' },
  scoreVs: { fontSize: 14, color: '#64748b', fontWeight: '700' },
  // Play tabs
  playTabs: { paddingHorizontal: 12, maxHeight: 40, marginBottom: 4 },
  playTabBtn: { paddingHorizontal: 14, paddingVertical: 6, marginRight: 6, borderRadius: 6, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  playTabActive: { backgroundColor: '#1e293b', borderColor: '#0a7ea4' },
  playTabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  playTabTextActive: { color: '#0a7ea4' },
  // Round tabs
  roundTabs: { paddingHorizontal: 12, maxHeight: 40, marginBottom: 4 },
  roundTab: { paddingHorizontal: 14, paddingVertical: 6, marginRight: 6, borderRadius: 6, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  roundTabActive: { backgroundColor: '#1e293b', borderColor: '#38bdf8' },
  roundTabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  roundTabTextActive: { color: '#38bdf8' },
  roundTitle: { fontSize: 16, fontWeight: '700', color: '#e5e7eb', marginBottom: 12 },
  playerSection: { marginBottom: 16, padding: 12, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  playerLabel: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  fieldLabel: { fontSize: 13, color: '#94a3b8', width: 80 },
  fieldInput: { backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, color: '#e5e7eb', fontSize: 14, minWidth: 60, borderWidth: 1, borderColor: '#334155' },
  endBtn: { marginTop: 16, backgroundColor: '#ef444420', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  endBtnText: { fontSize: 14, fontWeight: '700', color: '#ef4444' },
  // Unit card
  unitCard: { marginBottom: 10, padding: 12, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  unitDestroyed: { opacity: 0.5, borderColor: '#7f1d1d' },
  unitOffField: { borderStyle: 'dashed' as any, borderColor: '#475569' },
  unitHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  unitName: { fontSize: 15, fontWeight: '700', padding: 0, margin: 0, minHeight: 20 },
  unitSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  unitBadges: { flexDirection: 'row', gap: 4 },
  badge: { fontSize: 10, color: '#e5e7eb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', fontWeight: '600' },
  // HP controls
  hpRow: { flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  hpBlock: { alignItems: 'center', minWidth: 80 },
  hpLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginBottom: 2 },
  hpControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hpBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  hpBtnText: { fontSize: 16, color: '#e5e7eb', fontWeight: '700', lineHeight: 20 },
  hpValue: { fontSize: 14, fontWeight: '700', color: '#e5e7eb', minWidth: 40, textAlign: 'center' },
  // Action buttons
  actionRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  actionActive: { backgroundColor: '#1e293b', borderColor: '#fbbf24' },
  actionText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  // Status
  statusRow: { flexDirection: 'row', gap: 4, marginBottom: 6, flexWrap: 'wrap' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: '#1e293b' },
  statusChipText: { fontSize: 10, color: '#fbbf24', fontWeight: '600' },
  addStatusBtn: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#334155' },
  addStatusText: { fontSize: 11, color: '#64748b' },
  // Quick status toggle row
  quickStatusRow: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 4, marginTop: 6 },
  quickStatusBtn: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  quickStatusActive: { borderColor: '#fbbf24', backgroundColor: '#451a03' },
  quickStatusText: { fontSize: 10, color: '#64748b', fontWeight: '600' as const },
  quickStatusTextActive: { color: '#fbbf24' },
  // Damage / Heal buttons
  dmgRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  dmgBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: '#7f1d1d', alignItems: 'center' as const },
  dmgBtnText: { fontSize: 12, fontWeight: '700' as const, color: '#fca5a5' },
  healBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: '#14532d', alignItems: 'center' as const },
  healBtnText: { fontSize: 12, fontWeight: '700' as const, color: '#86efac' },
  // Phase bar
  phaseBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, gap: 4, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#334155' },
  phaseBtn: { flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#334155', alignItems: 'center' as const, backgroundColor: '#0f172a' },
  phaseActive: { borderWidth: 2 },
  phaseText: { fontSize: 11, fontWeight: '600' as const, color: '#64748b' },
  phaseTextActive: { fontWeight: '700' as const },
  // Building card
  buildingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: 12, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  buildingName: { fontSize: 14, fontWeight: '700', color: '#fbbf24', flex: 1 },
  usedBadge: { fontSize: 10, color: '#ef4444', fontWeight: '600', marginLeft: 8 },
  // Supply
  supplySection: { marginBottom: 16, padding: 12, backgroundColor: '#0f172a', borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  supplyBar: { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
  supplyText: { fontSize: 13, color: '#94a3b8' },
  supplyGroup: { marginTop: 6 },
  supplyGroupLabel: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  supplyUnitText: { fontSize: 11, color: '#94a3b8', marginLeft: 8, marginBottom: 1 },
  // Modal
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  modalBox: { width: '90%', maxWidth: 400, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#e5e7eb', marginBottom: 12 },
  statusPickBtn: { paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, borderRadius: 6, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0f172a' },
  statusPickActive: { borderColor: '#fbbf24', backgroundColor: '#1e293b' },
  statusPickText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  // Summary
  summaryTitle: { fontSize: 22, fontWeight: '800', color: '#e5e7eb', textAlign: 'center', marginTop: 8 },
  summaryName: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
  summaryScoreBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 20 },
  summaryPlayer: { alignItems: 'center' },
  summaryPlayerName: { fontSize: 13, color: '#94a3b8' },
  summaryScore: { fontSize: 36, fontWeight: '800' },
  summaryVs: { fontSize: 16, color: '#64748b', fontWeight: '700' },
  summaryWinner: { alignItems: 'center', paddingVertical: 12, backgroundColor: '#0f172a', borderRadius: 10, marginHorizontal: 20 },
  summaryWinnerText: { fontSize: 16, fontWeight: '700', color: '#fbbf24' },
  summaryStats: { marginTop: 16 },
  summaryStatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  summaryStatLabel: { fontSize: 13, color: '#94a3b8' },
  summaryStatValue: { fontSize: 14, fontWeight: '700', color: '#e5e7eb' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#e5e7eb', marginTop: 16, marginBottom: 8 },
  roundSummary: { padding: 12, backgroundColor: '#0f172a', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  roundSummaryTitle: { fontSize: 13, fontWeight: '700', color: '#e5e7eb', marginBottom: 4 },
  roundSummaryText: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  roundSummaryNote: { fontSize: 11, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  // Picker
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f172a', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#334155' },
  pickerText: { fontSize: 14, color: '#e5e7eb' },
  pickerChevron: { fontSize: 12, color: '#64748b' },
  pickerDropdown: { backgroundColor: '#0f172a', borderRadius: 8, borderWidth: 1, borderColor: '#334155', marginTop: 4 },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  pickerItemText: { fontSize: 14, color: '#e5e7eb' },
  pickerItemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  // Timeline
  timelineItem: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, marginBottom: 10, paddingLeft: 4 },
  timelineRoundMarker: { marginVertical: 6 },
  timelinePhaseMarker: { marginVertical: 2 },
  timelineDot: { width: 28, alignItems: 'center' as const, marginRight: 10 },
  timelineDotCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center' as const, justifyContent: 'center' as const },
  timelineDotIcon: { fontSize: 10, color: '#000', fontWeight: '700' as const },
  timelineRoundText: { fontSize: 13, fontWeight: '800' as const, textAlign: 'center' as const, flex: 1, marginTop: 2 },
  timelinePhaseText: { fontSize: 12, fontWeight: '700' as const, marginTop: 3 },
  timelineDetail: { fontSize: 13, fontWeight: '600' as const, marginTop: 2 },
  timelineMeta: { fontSize: 10, color: '#64748b', marginTop: 1 },
  // Stats panel
  statPanel: { margin: 16, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  statRow: { flexDirection: 'row' as const, justifyContent: 'space-around' as const },
  statItem: { alignItems: 'center' as const },
  statNum: { fontSize: 22, fontWeight: '800' as const, color: '#f1f5f9' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },
  statSectionTitle: { fontSize: 12, fontWeight: '700' as const, color: '#94a3b8', marginBottom: 6 },
  factionRow: { flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 6, gap: 6 },
  factionName: { fontSize: 12, fontWeight: '700' as const, width: 60 },
  factionBarBg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#0f172a', overflow: 'hidden' as const },
  factionBarFill: { height: 8, borderRadius: 4 },
  factionStat: { fontSize: 11, color: '#94a3b8', width: 72, textAlign: 'right' as const },
});
