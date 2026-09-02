// ============================================================
// StarCraft TMG Data Types
// ============================================================

export type Faction = 'Terran' | 'Zerg' | 'Protoss';

export type UnitType = 'Core' | 'Elite' | 'Support' | 'Hero' | 'Air' | 'Other';

export type SlotMap = Record<UnitType, number>;

// --- Unit Data ---
export interface UnitStats {
  shield?: number;
  speed?: number;
  evade?: number;
  armor?: number;
  hp?: number;
  size?: string;
}

export interface WeaponProfile {
  name: string;
  range: string;
  target: string;
  roa: string;      // Rate of Attack
  hit: string;      // e.g. "3+"
  dmg: string;
  surge?: string;
  phase?: string;
  keywords?: string; // 武器级关键词 (BURST FIRE, PIERCE等)
}

export interface Upgrade {
  name: string;
  description: string;
  phase?: string;
  costS: number;     // cost for small squad
  costL: number;     // cost for large squad
  activation?: string;
  abilityKind?: 'active' | 'reaction' | 'passive' | string;
  resourceCost?: { amount: number | string; type: string } | null;
  linkedTo?: string;
  weapon?: WeaponProfile;  // parsed from description
}

export interface SquadProfile {
  size: 'small' | 'large';
  models: number;
  supply: number;
  cost: number;
}

export interface UnitCard {
  id: string;
  name: string;
  faction: Faction;
  unitType: UnitType;
  stats: UnitStats;
  keywords?: string;
  tags?: string;
  upgrades: Upgrade[];
  smallProfile?: SquadProfile;
  largeProfile?: SquadProfile;
  frontUrl?: string;
  isUnique?: boolean;
}

// --- Tactical / Faction Card ---
export interface CardBoost {
  name: string;
  description: string;
  kind?: 'active' | 'reaction' | 'passive' | string;
  phase?: string;
  resourceCost?: { amount: number | string; type: string } | null;
}

export interface TacticalCard {
  id: string;
  name: string;
  faction: Faction | string;
  cost: number;        // gas cost
  resource?: number;   // CP/BM/PE provided
  resourceType?: string;
  slots?: Partial<SlotMap>;
  boosts?: CardBoost[];
  isFactionCard?: boolean;
  isUnique?: boolean;
  factionTags?: string[];  // faction restriction tags (e.g. ["Khalai"])
  frontUrl?: string;
}

// --- Game Cards (Mission / Deployment / Community) ---
export type GameCardType = 'mission' | 'deployment' | 'community_mission' | 'community_deployment';

export interface GameCard {
  id: string;
  name: string;
  faction: string;
  type: GameCardType;
  frontUrl?: string;
  backUrl?: string;

  // Mission fields
  format?: string;           // 'Standard Engagement' | 'Skirmish' | 'Grand Offensive'
  startingSupply?: number;
  extraSupply?: string;      // e.g. '2 per round', '+2'
  gameLength?: number;
  missionParams?: string;
  scoringConditions?: string;
  additionalConditions?: string;
  refId?: string | number;   // reference marker ID

  // Deployment fields
  gameSize?: string;         // 'Standard' | 'Skirmish'
  isManual?: boolean;

  // Community fields
  authorId?: string;
  authorName?: string;
  status?: string;           // 'approved' | 'pending' etc.
  upvotes?: string[];        // array of user IDs
  isOfficial?: boolean;
  isArchonFavorite?: boolean;
  isOfTheWeek?: boolean;
}

// --- Army List ---
export interface RosterUnit {
  unitId: string;
  name: string;
  unitType: UnitType;
  size: 'small' | 'large';
  baseCost: number;
  supply: number;
  activeUpgrades: number[];    // indices into availableUpgrades
  availableUpgrades: Upgrade[];
  stats: UnitStats;
  keywords?: string;
}

export interface ArmyList {
  id: string;
  name: string;
  faction: Faction;
  mineralsLimit: number;
  gasLimit: number;
  factionCardId: string | null;
  tacticalCardIds: string[];
  roster: RosterUnit[];
  missionId: string | null;
  deploymentId: string | null;
  createdAt: number;
  updatedAt: number;
}

// --- Computed Army State ---
export interface ArmyState {
  mineralsUsed: number;
  gasUsed: number;
  supplyUsed: number;
  resourceTotal: number;
  slotsAvailable: SlotMap;
  slotsUsed: SlotMap;
}

// --- Battle Status Effects ---
export type StatusEffect =
  | 'BUFF_SPEED'     // +X Speed
  | 'DEBUFF_SPEED'   // -X Speed
  | 'TOUGH'          // Tough (X)
  | 'HIDDEN'         // Hidden
  | 'PINNED'         // Pinned (cannot move)
  | 'ENGAGED'        // In melee engagement
  | 'STUNNED'        // Stunned
  | 'REGENERATE'     // Regenerate (X)
  | 'SHIELD_REGEN'   // Shield regeneration
  | 'CUSTOM';        // User-defined status

export interface UnitStatus {
  effect: StatusEffect;
  value?: number;       // parameter value (e.g. TOUGH(2) → value=2)
  label?: string;       // custom label for CUSTOM type
}

// --- Battle Unit (in-match unit instance) ---
export interface BattleUnit {
  instanceId: string;          // unique per match instance
  unitId: string;              // reference to UnitCard.id
  rosterIndex: number;         // index in army roster
  name: string;                // original unit name
  customName: string;          // user-given nickname
  faction: Faction;
  unitType: UnitType;
  size: 'small' | 'large';
  supply: number;              // supply cost
  // HP tracking
  maxHp: number;
  currentHp: number;
  // Shield tracking (Protoss)
  maxShield: number;
  currentShield: number;
  // Models tracking
  maxModels: number;
  currentModels: number;
  // Action tracking per round
  hasActivated: boolean;       // used Active action this round
  hasReacted: boolean;         // used React action this round
  // Deployment status
  isOnField: boolean;          // currently on the battlefield
  isDestroyed: boolean;        // permanently removed
  // Status effects
  statuses: UnitStatus[];
}

// --- Building Energy (per tactical card / faction card) ---
export interface BuildingEnergy {
  cardId: string;
  cardName: string;
  maxEnergy: number;           // from card.resource value
  currentEnergy: number;
  usedThisRound: boolean;
}

// --- Player Battle State (per player per match) ---
export interface PlayerBattleState {
  units: BattleUnit[];
  buildings: BuildingEnergy[];
  // Supply tracking
  totalSupply: number;         // total supply available this round
  usedSupply: number;          // supply used by on-field units
}

// --- Timeline Event ---
export type TimelineEventType =
  | 'deploy'       // unit deployed to field
  | 'withdraw'     // unit withdrawn from field
  | 'destroy'      // unit destroyed
  | 'revive'       // unit revived
  | 'damage'       // unit took damage
  | 'heal'         // unit healed
  | 'status_add'   // status effect added
  | 'status_remove'// status effect removed
  | 'phase'        // game phase changed
  | 'round'        // new round started
  | 'note';        // manual note

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  timestamp: number;
  round: number;           // which round this happened
  phase?: string;          // which phase (movement/assault/combat/scoring)
  player?: 1 | 2;          // which player (null = system event)
  unitName?: string;       // unit display name
  detail: string;          // human-readable description
  value?: number;          // numeric value (damage amount, etc.)
}

// --- Match / Battle ---
export interface RoundRecord {
  roundNumber: number;
  player1Damage: number;
  player2Damage: number;
  player1Kills: string[];
  player2Kills: string[];
  player1Score: number;
  player2Score: number;
  player1MissionProgress: string;
  player2MissionProgress: string;
  notes: string;
}

export interface MatchRecord {
  id: string;
  name: string;
  date: number;
  player1Name: string;
  player2Name: string;
  player1ArmyId: string | null;
  player2ArmyId: string | null;
  battleMissionId?: string | null;
  battleDeploymentId?: string | null;
  battleScenarioMapId?: string | null;
  rounds: RoundRecord[];
  player1TotalScore: number;
  player2TotalScore: number;
  winner: string;
  notes: string;
  // Battle state tracking (new)
  player1Battle?: PlayerBattleState;
  player2Battle?: PlayerBattleState;
  currentRoundSupply1?: number;  // supply available this round for P1
  currentRoundSupply2?: number;  // supply available this round for P2
  battleTable?: unknown;         // StarCraft TMG executable battle table state
  remoteRoomId?: string;         // Project-D StarCraft room service room id
  remoteRoomBaseUrl?: string;    // room service origin for app/web sync
  remoteRoomVersion?: number;    // last synced room version
  remoteRoomSideKey?: 'player1' | 'player2';
  remoteInviteUrl?: string;
  // Timeline log
  timeline?: TimelineEvent[];
}

// --- Dice ---
export interface DiceResult {
  value: number;
  sides: number;
  timestamp: number;
}

export interface DiceRoll {
  id: string;
  dice: DiceResult[];
  total: number;
  timestamp: number;
  label?: string;
}

// --- Data Package ---
export interface DataPackage {
  version: number;
  exportedAt: number;
  units: UnitCard[];
  cards: TacticalCard[];
  gameCards: GameCard[];
}

// --- Resource Meta ---
export const RESOURCE_META: Record<Faction, { short: string; name: string }> = {
  Terran: { short: 'CP', name: '指挥点' },
  Zerg: { short: 'BM', name: '生物质' },
  Protoss: { short: 'PE', name: '灵能' },
};

export const FACTION_COLORS: Record<Faction, string> = {
  Terran: '#38bdf8',
  Zerg: '#a855f7',
  Protoss: '#eab308',
};
