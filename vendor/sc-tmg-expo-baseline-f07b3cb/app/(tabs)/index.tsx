import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useData } from '@/lib/data-context';
import type { Faction, UnitCard, TacticalCard, GameCard, GameCardType } from '@/lib/types';
import { FACTION_COLORS } from '@/lib/types';
import { useI18n } from '@/lib/i18n';

const FACTIONS: Faction[] = ['Terran', 'Zerg', 'Protoss'];
const FACTION_CN: Record<Faction, string> = { Terran: '人族', Zerg: '虫族', Protoss: '星灵' };
const FACTION_EN: Record<Faction, string> = { Terran: 'Terran', Zerg: 'Zerg', Protoss: 'Protoss' };

type BrowseTab = 'factions' | 'missions' | 'deployments';

/* ──── Shared detail components ──── */

function StatBadge({ label, value, color }: { label: string; value: string | number | undefined; color?: string }) {
  if (value === undefined || value === null) return null;
  return (
    <View style={s.statBadge}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function WeaponRow({ upg, t }: { upg: any; t: (k: any) => string }) {
  if (!upg.weapon) return null;
  const w = upg.weapon;
  return (
    <View style={s.weaponRow}>
      <Text style={s.weaponName}>{w.name || upg.name}</Text>
      <View style={s.weaponStats}>
        <Text style={s.weaponStat}>{t('range')}:{w.range}</Text>
        <Text style={s.weaponStat}>{t('target')}:{w.target}</Text>
        <Text style={s.weaponStat}>{t('attack')}:{w.roa}</Text>
        <Text style={s.weaponStat}>{t('hit')}:{w.hit}</Text>
        <Text style={s.weaponStat}>{t('damage')}:{w.dmg}</Text>
        {w.surge ? <Text style={s.weaponStat}>{t('surge')}:{w.surge}</Text> : null}
      </View>
    </View>
  );
}

/* ──── Unit Detail ──── */

function UnitDetail({ unit, onClose }: { unit: UnitCard; onClose: () => void }) {
  const { t } = useI18n();
  const fColor = FACTION_COLORS[unit.faction];
  const weapons = unit.upgrades.filter(u => u.weapon);
  const abilities = unit.upgrades.filter(u => !u.weapon);

  return (
    <ScrollView style={s.detailContainer}>
      <View style={s.detailHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.detailName, { color: fColor }]}>{unit.name}</Text>
          <Text style={s.detailSub}>{unit.unitType} · {unit.faction} {unit.isUnique ? '· Unique' : ''}</Text>
        </View>
        <Pressable onPress={onClose} style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}>
          <Text style={s.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      <View style={s.statsRow}>
        <StatBadge label="HP" value={unit.stats.hp} color="#ef4444" />
        <StatBadge label={t('shieldStat')} value={unit.stats.shield} color="#38bdf8" />
        <StatBadge label={t('armorStat')} value={unit.stats.armor} color="#94a3b8" />
        <StatBadge label={t('evadeStat')} value={unit.stats.evade} color="#eab308" />
        <StatBadge label={t('speedStat')} value={unit.stats.speed} color="#22c55e" />
      </View>

      {/* Tags (Armor Type: Light/Armored/Massive etc.) */}
      {unit.tags ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('tags')}</Text>
          <View style={s.keywordsRow}>
            {unit.tags.split(',').map((tag: string, i: number) => (
              <View key={i} style={[s.keyword, { backgroundColor: '#1e3a5f' }]}>
                <Text style={[s.keywordText, { color: '#60a5fa' }]}>{tag.trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {unit.keywords ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('keywords')}</Text>
          <View style={s.keywordsRow}>
            {unit.keywords.split(',').map((kw, i) => (
              <View key={i} style={s.keyword}>
                <Text style={s.keywordText}>{kw.trim()}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t('squadConfig')}</Text>
        {unit.smallProfile ? (
          <View style={s.profileRow}>
            <Text style={s.profileLabel}>{t('smallSquad')}</Text>
            <Text style={s.profileValue}>{unit.smallProfile.models} {t('models')} · {unit.smallProfile.cost} {t('minerals')} · {unit.smallProfile.supply} {t('supply')}</Text>
          </View>
        ) : null}
        {unit.largeProfile ? (
          <View style={s.profileRow}>
            <Text style={s.profileLabel}>{t('largeSquad')}</Text>
            <Text style={s.profileValue}>{unit.largeProfile.models} {t('models')} · {unit.largeProfile.cost} {t('minerals')} · {unit.largeProfile.supply} {t('supply')}</Text>
          </View>
        ) : null}
      </View>

      {weapons.length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('weapons')}</Text>
          {weapons.map((w, i) => <WeaponRow key={i} upg={w} t={t} />)}
        </View>
      ) : null}

      {abilities.length > 0 ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('abilities')}</Text>
          {abilities.map((a, i) => (
            <View key={i} style={s.abilityRow}>
              <View style={s.abilityHeader}>
                <Text style={s.abilityName}>{a.name}</Text>
                {a.phase ? <Text style={s.abilityPhase}>{a.phase}</Text> : null}
                {(a.costS > 0 || a.costL > 0) ? (
                  <Text style={s.abilityCost}>{a.costS}/{a.costL} {t('minerals')}</Text>
                ) : null}
              </View>
              <Text style={s.abilityDesc}>{a.description}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ──── Card Detail ──── */

function CardDetail({ card, onClose }: { card: TacticalCard; onClose: () => void }) {
  const { t } = useI18n();
  const fColor = FACTION_COLORS[card.faction as keyof typeof FACTION_COLORS] || '#888';
  return (
    <ScrollView style={s.detailContainer}>
      <View style={s.detailHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.detailName, { color: fColor }]}>{card.name}</Text>
          <Text style={s.detailSub}>
            {card.isFactionCard ? t('factionCard') : `${t('tacticalCard')} · ${card.cost} ${t('gas')}`}
            {card.isUnique ? ` · ${t('unique')}` : ''}
          </Text>
        </View>
        <Pressable onPress={onClose} style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}>
          <Text style={s.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      {card.resource != null && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('resourceOutput')}</Text>
          <Text style={s.resourceValue}>+{card.resource}</Text>
        </View>
      )}

      {card.slots && Object.keys(card.slots).length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providedSlots')}</Text>
          <View style={s.slotsRow}>
            {Object.entries(card.slots).map(([k, v]) => v > 0 ? (
              <View key={k} style={s.slotBadge}>
                <Text style={s.slotText}>{v}x {k}</Text>
              </View>
            ) : null)}
          </View>
        </View>
      )}

      {card.boosts && card.boosts.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('cardAbilities')}</Text>
          {card.boosts.map((b, i) => (
            <View key={i} style={s.abilityRow}>
              <Text style={s.abilityName}>{b.name}</Text>
              <Text style={s.abilityDesc}>{b.description}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

/* ──── Mission Detail ──── */

// TYPE_LABELS now uses i18n - defined inline in MissionDetail

function MissionDetail({ card, onClose }: { card: GameCard; onClose: () => void }) {
  const { t } = useI18n();
  const TYPE_LABELS: Record<GameCardType, string> = {
    mission: t('officialMission'),
    deployment: t('officialDeployment'),
    community_mission: t('communityMission'),
    community_deployment: t('communityDeployment'),
  };
  const isMission = card.type === 'mission' || card.type === 'community_mission';
  const isCommunity = card.type.startsWith('community_');
  const accentColor = isMission ? '#f59e0b' : '#8b5cf6';

  return (
    <ScrollView style={s.detailContainer}>
      <View style={s.detailHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.detailName, { color: accentColor }]}>{card.name}</Text>
          <Text style={s.detailSub}>
            {TYPE_LABELS[card.type]}
            {card.format ? ` · ${card.format}` : ''}
            {card.gameSize ? ` · ${card.gameSize}` : ''}
          </Text>
        </View>
        <Pressable onPress={onClose} style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}>
          <Text style={s.closeBtnText}>✕</Text>
        </Pressable>
      </View>

      {/* Mission Parameters */}
      {isMission && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('missionParams')}</Text>
          <View style={s.missionParamsGrid}>
            {card.startingSupply != null && (
              <View style={s.missionParam}>
                <Text style={s.missionParamLabel}>{t('startingSupply')}</Text>
                <Text style={s.missionParamValue}>{card.startingSupply}</Text>
              </View>
            )}
            {card.extraSupply && (
              <View style={s.missionParam}>
                <Text style={s.missionParamLabel}>{t('extraSupply')}</Text>
                <Text style={s.missionParamValue}>{card.extraSupply}</Text>
              </View>
            )}
            {card.gameLength != null && (
              <View style={s.missionParam}>
                <Text style={s.missionParamLabel}>{t('gameRounds')}</Text>
                <Text style={s.missionParamValue}>{card.gameLength}</Text>
              </View>
            )}
            {card.refId != null && (
              <View style={s.missionParam}>
                <Text style={s.missionParamLabel}>{t('markerId')}</Text>
                <Text style={s.missionParamValue}>{card.refId}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Mission Params Text */}
      {card.missionParams ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('missionMarkers')}</Text>
          <Text style={s.missionText}>{card.missionParams}</Text>
        </View>
      ) : null}

      {/* Scoring Conditions */}
      {card.scoringConditions ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('scoringConditions')}</Text>
          <Text style={s.missionText}>{card.scoringConditions}</Text>
        </View>
      ) : null}

      {/* Additional Conditions */}
      {card.additionalConditions ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('additionalConditions')}</Text>
          <Text style={s.missionText}>{card.additionalConditions}</Text>
        </View>
      ) : null}

      {/* Deployment Map Image */}
      {!isMission && card.frontUrl ? (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('deploymentMap')}</Text>
          <Image
            source={{ uri: card.frontUrl }}
            style={s.deploymentMap}
            resizeMode="contain"
          />
        </View>
      ) : null}

      {/* Community Info */}
      {isCommunity && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('communityInfo')}</Text>
          {card.authorName ? (
            <View style={s.communityRow}>
              <Text style={s.communityLabel}>{t('author')}</Text>
              <Text style={s.communityValue}>{card.authorName}</Text>
            </View>
          ) : null}
          {card.status ? (
            <View style={s.communityRow}>
              <Text style={s.communityLabel}>{t('status')}</Text>
              <View style={[s.statusBadge, card.status === 'approved' && { backgroundColor: '#166534' }]}>
                <Text style={s.statusText}>{card.status}</Text>
              </View>
            </View>
          ) : null}
          {card.upvotes ? (
            <View style={s.communityRow}>
              <Text style={s.communityLabel}>{t('votes')}</Text>
              <Text style={s.communityValue}>{card.upvotes.length}</Text>
            </View>
          ) : null}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

/* ──── Main Screen ──── */

export default function DatabaseScreen() {
  const { units, cards, gameCards, isLoading } = useData();
  const { t, unitName, lang } = useI18n();
  const factionLabel = (f: Faction) => lang === 'zh' ? FACTION_CN[f] : FACTION_EN[f];
  const [browseTab, setBrowseTab] = useState<BrowseTab>('factions');
  const [faction, setFaction] = useState<Faction>('Terran');
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<UnitCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<TacticalCard | null>(null);
  const [selectedGameCard, setSelectedGameCard] = useState<GameCard | null>(null);
  const [expandedCat, setExpandedCat] = useState<string>('units');
  const [missionFilter, setMissionFilter] = useState<'all' | 'official' | 'community'>('all');

  const fColor = FACTION_COLORS[faction];

  // Faction-based filtering
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const fUnits = units.filter(u => u.faction === faction && (!q || (u.name + ' ' + (u.keywords || '')).toLowerCase().includes(q)));
    const fFactionCards = cards.filter(c => c.faction === faction && c.isFactionCard && (!q || c.name.toLowerCase().includes(q)));
    const fTacticalCards = cards.filter(c => c.faction === faction && !c.isFactionCard && (!q || c.name.toLowerCase().includes(q)));
    return { units: fUnits, factionCards: fFactionCards, tacticalCards: fTacticalCards };
  }, [units, cards, faction, search]);

  // Mission filtering
  const filteredMissions = useMemo(() => {
    const q = search.toLowerCase();
    let list = gameCards.filter(c => c.type === 'mission' || c.type === 'community_mission');
    if (missionFilter === 'official') list = list.filter(c => c.type === 'mission');
    else if (missionFilter === 'community') list = list.filter(c => c.type === 'community_mission');
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || (c.authorName || '').toLowerCase().includes(q));
    return list;
  }, [gameCards, search, missionFilter]);

  // Deployment filtering
  const filteredDeployments = useMemo(() => {
    const q = search.toLowerCase();
    let list = gameCards.filter(c => c.type === 'deployment' || c.type === 'community_deployment');
    if (missionFilter === 'official') list = list.filter(c => c.type === 'deployment');
    else if (missionFilter === 'community') list = list.filter(c => c.type === 'community_deployment');
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q) || (c.authorName || '').toLowerCase().includes(q));
    return list;
  }, [gameCards, search, missionFilter]);

  // Detail views
  if (selectedUnit) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <UnitDetail unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
      </ScreenContainer>
    );
  }
  if (selectedCard) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <CardDetail card={selectedCard} onClose={() => setSelectedCard(null)} />
      </ScreenContainer>
    );
  }
  if (selectedGameCard) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <MissionDetail card={selectedGameCard} onClose={() => setSelectedGameCard(null)} />
      </ScreenContainer>
    );
  }

  const renderCategory = (title: string, catKey: string, count: number, color: string, content: React.ReactNode) => {
    const isOpen = expandedCat === catKey;
    return (
      <View key={catKey} style={s.catWrapper}>
        <Pressable
          onPress={() => setExpandedCat(isOpen ? '' : catKey)}
          style={({ pressed }) => [s.catHeader, { borderLeftColor: color }, pressed && { opacity: 0.8 }]}
        >
          <Text style={[s.catTitle, { color }]}>{title} ({count})</Text>
          <Text style={s.catChevron}>{isOpen ? '▼' : '▶'}</Text>
        </Pressable>
        {isOpen && content}
      </View>
    );
  };

  const totalMissions = gameCards.filter(c => c.type === 'mission' || c.type === 'community_mission').length;
  const totalDeployments = gameCards.filter(c => c.type === 'deployment' || c.type === 'community_deployment').length;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('database')}</Text>
        <Text style={s.headerSub}>{units.length} {t('unitCount')} · {cards.length} {t('cardCount')} · {gameCards.length} {t('missions')}/{t('deployments')}</Text>
      </View>

      {/* Browse Tabs: Factions / Missions / Deployments */}
      <View style={s.browseTabs}>
        {([
          { key: 'factions' as BrowseTab, label: t('factions'), count: units.length },
          { key: 'missions' as BrowseTab, label: t('missions'), count: totalMissions },
          { key: 'deployments' as BrowseTab, label: t('deployments'), count: totalDeployments },
        ]).map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => { setBrowseTab(tab.key); setSearch(''); }}
            style={({ pressed }) => [
              s.browseTab,
              browseTab === tab.key && s.browseTabActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[s.browseTabText, browseTab === tab.key && s.browseTabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sub-tabs for Factions */}
      {browseTab === 'factions' && (
        <View style={s.factionTabs}>
          {FACTIONS.map(f => (
            <Pressable
              key={f}
              onPress={() => setFaction(f)}
              style={({ pressed }) => [
                s.factionTab,
                faction === f && { borderBottomColor: FACTION_COLORS[f], borderBottomWidth: 2 },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[s.factionTabText, faction === f && { color: FACTION_COLORS[f] }]}>
                {factionLabel(f)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Filter tabs for Missions/Deployments */}
      {(browseTab === 'missions' || browseTab === 'deployments') && (
        <View style={s.filterTabs}>
          {(['all', 'official', 'community'] as const).map(f => (
            <Pressable
              key={f}
              onPress={() => setMissionFilter(f)}
              style={({ pressed }) => [
                s.filterTab,
                missionFilter === f && s.filterTabActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[s.filterTabText, missionFilter === f && s.filterTabTextActive]}>
                {f === 'all' ? t('all') : f === 'official' ? t('official') : t('community')}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={s.searchBar}>
        <TextInput
          style={s.searchInput}
          placeholder={browseTab === 'factions' ? t('searchUnitsCards') : t('searchMissionsDeploy')}
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
          returnKeyType="done"
        />
      </View>

      {isLoading ? (
        <View style={s.center}>
          <Text style={s.loadingText}>{t('loading')}</Text>
        </View>
      ) : units.length === 0 && gameCards.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyText}>{t('noData')}</Text>
          <Text style={s.emptyHint}>{t('goToSettings')}</Text>
        </View>
      ) : browseTab === 'factions' ? (
        /* ──── Factions Tab ──── */
        <ScrollView style={s.listContainer}>
          {renderCategory(t('factionCards'), 'factionCards', filtered.factionCards.length, '#22c55e',
            <View>
              {filtered.factionCards.map(c => (
                <Pressable key={c.id} onPress={() => setSelectedCard(c)} style={({ pressed }) => [s.itemRow, pressed && { opacity: 0.7 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{c.name}</Text>
                    <Text style={s.itemSub}>
                      {c.resource != null ? `+${c.resource}资源` : ''}{c.slots ? ` · ${Object.entries(c.slots).filter(([, v]) => v > 0).map(([k, v]) => `${v}x${k}`).join(' ')}` : ''}
                    </Text>
                  </View>
                  <Text style={[s.itemBadge, { color: '#22c55e' }]}>{t('faction')}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {renderCategory(t('unitCards'), 'units', filtered.units.length, fColor,
            <View>
              {filtered.units.map(u => (
                <Pressable key={u.id} onPress={() => setSelectedUnit(u)} style={({ pressed }) => [s.itemRow, pressed && { opacity: 0.7 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>
                      {unitName(u.name)}
                      {u.isUnique ? <Text style={s.uniqueBadge}> ★</Text> : null}
                    </Text>
                    <Text style={s.itemSub}>{u.unitType} · HP:{u.stats.hp || '?'}</Text>
                  </View>
                  <Text style={[s.itemBadge, { color: fColor }]}>{u.unitType}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {renderCategory(t('tacticalCards'), 'tacticalCards', filtered.tacticalCards.length, '#ff9204',
            <View>
              {filtered.tacticalCards.map(c => (
                <Pressable key={c.id} onPress={() => setSelectedCard(c)} style={({ pressed }) => [s.itemRow, pressed && { opacity: 0.7 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{c.name}</Text>
                    <Text style={s.itemSub}>{c.cost} {t('gas')}</Text>
                  </View>
                  <Text style={[s.itemBadge, { color: '#ff9204' }]}>{c.cost} {t('gas')}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      ) : browseTab === 'missions' ? (
        /* ──── Missions Tab ──── */
        <ScrollView style={s.listContainer}>
          {filteredMissions.length === 0 ? (
            <View style={s.center}><Text style={s.emptyText}>{t('noMatch')}</Text></View>
          ) : (
            filteredMissions.map(m => (
              <Pressable
                key={m.id}
                onPress={() => setSelectedGameCard(m)}
                style={({ pressed }) => [s.missionItem, pressed && { opacity: 0.7 }]}
              >
                <View style={{ flex: 1 }}>
                  <View style={s.missionItemHeader}>
                    <Text style={s.itemName}>{m.name}</Text>
                    {m.type === 'community_mission' && (
                      <View style={s.communityBadge}><Text style={s.communityBadgeText}>{t('community')}</Text></View>
                    )}
                  </View>
                  <Text style={s.itemSub}>
                    {m.format || ''}{m.startingSupply != null ? ` · ${m.startingSupply} ${t('supply')}` : ''}{m.gameLength ? ` · ${m.gameLength} ${lang === 'zh' ? '回合' : 'rounds'}` : ''}
                    {m.authorName ? ` · by ${m.authorName}` : ''}
                  </Text>
                </View>
                <Text style={s.chevron}>▶</Text>
              </Pressable>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      ) : (
        /* ──── Deployments Tab ──── */
        <ScrollView style={s.listContainer}>
          {filteredDeployments.length === 0 ? (
            <View style={s.center}><Text style={s.emptyText}>{t('noMatch')}</Text></View>
          ) : (
            filteredDeployments.map(d => (
              <Pressable
                key={d.id}
                onPress={() => setSelectedGameCard(d)}
                style={({ pressed }) => [s.missionItem, pressed && { opacity: 0.7 }]}
              >
                {d.frontUrl ? (
                  <Image source={{ uri: d.frontUrl }} style={s.deploymentThumb} resizeMode="cover" />
                ) : (
                  <View style={[s.deploymentThumb, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#64748b', fontSize: 10 }}>{lang === 'zh' ? '无图' : 'N/A'}</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={s.missionItemHeader}>
                    <Text style={s.itemName}>{d.name}</Text>
                    {d.type === 'community_deployment' && (
                      <View style={s.communityBadge}><Text style={s.communityBadgeText}>{t('community')}</Text></View>
                    )}
                  </View>
                  <Text style={s.itemSub}>
                    {d.gameSize || ''}{d.authorName ? ` · by ${d.authorName}` : ''}
                  </Text>
                </View>
                <Text style={s.chevron}>▶</Text>
              </Pressable>
            ))
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#e5e7eb' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  // Browse tabs (top level)
  browseTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155', backgroundColor: '#0f172a' },
  browseTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  browseTabActive: { borderBottomWidth: 2, borderBottomColor: '#38bdf8' },
  browseTabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  browseTabTextActive: { color: '#38bdf8' },

  // Faction sub-tabs
  factionTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155' },
  factionTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  factionTabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },

  // Filter tabs (official/community)
  filterTabs: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1e293b' },
  filterTabActive: { backgroundColor: '#334155' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterTabTextActive: { color: '#e5e7eb' },

  searchBar: { paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#e5e7eb', fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  listContainer: { flex: 1 },
  catWrapper: { marginBottom: 2 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0f172a', borderLeftWidth: 3 },
  catTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  catChevron: { color: '#64748b', fontSize: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#e5e7eb' },
  itemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  itemBadge: { fontSize: 11, fontWeight: '700' },
  uniqueBadge: { color: '#eab308', fontSize: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: '#38bdf8', fontSize: 16 },
  emptyText: { color: '#64748b', fontSize: 16, marginBottom: 8 },
  emptyHint: { color: '#475569', fontSize: 13 },

  // Mission/Deployment list items
  missionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  missionItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  communityBadge: { backgroundColor: '#7c3aed', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  communityBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  chevron: { color: '#475569', fontSize: 12 },
  deploymentThumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#1e293b' },

  // Detail styles
  detailContainer: { flex: 1, backgroundColor: '#020617' },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, borderBottomWidth: 1, borderBottomColor: '#334155' },
  detailName: { fontSize: 22, fontWeight: '800' },
  detailSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { color: '#94a3b8', fontSize: 18 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statBadge: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 60 },
  statLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#e5e7eb', marginTop: 2 },
  section: { padding: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  keywordsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  keyword: { backgroundColor: '#1e293b', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  keywordText: { fontSize: 11, color: '#94a3b8' },
  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  profileLabel: { fontSize: 12, fontWeight: '700', color: '#38bdf8', width: 40 },
  profileValue: { fontSize: 12, color: '#e5e7eb' },
  resourceValue: { fontSize: 20, fontWeight: '800', color: '#22c55e' },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBadge: { backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#334155' },
  slotText: { fontSize: 12, fontWeight: '700', color: '#e5e7eb' },
  weaponRow: { backgroundColor: '#1e293b', borderRadius: 8, padding: 10, marginBottom: 8 },
  weaponName: { fontSize: 13, fontWeight: '700', color: '#ef4444', marginBottom: 4 },
  weaponStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  weaponStat: { fontSize: 11, color: '#94a3b8' },
  abilityRow: { backgroundColor: '#0f172a', borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#1e293b' },
  abilityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  abilityName: { fontSize: 13, fontWeight: '700', color: '#22d3ee' },
  abilityPhase: { fontSize: 10, color: '#64748b', backgroundColor: '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  abilityCost: { fontSize: 10, color: '#eab308' },
  abilityDesc: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },

  // Mission detail styles
  missionParamsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  missionParam: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', minWidth: 80 },
  missionParamLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  missionParamValue: { fontSize: 18, fontWeight: '800', color: '#f59e0b', marginTop: 2 },
  missionText: { fontSize: 13, color: '#cbd5e1', lineHeight: 20 },
  deploymentMap: { width: '100%', height: 300, borderRadius: 8, backgroundColor: '#1e293b' },

  // Community detail
  communityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  communityLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', width: 50 },
  communityValue: { fontSize: 13, color: '#e5e7eb' },
  statusBadge: { backgroundColor: '#334155', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#e5e7eb' },
});
