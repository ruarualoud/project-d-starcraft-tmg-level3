# SC TMG Official Rules Notes (from Beta Rules v0.1 Feb 28 2026)

## Part 2: Core Concepts

### 2.7 Ability Types

**2.7.1 Active Abilities:**
- Require unit to be Activated
- Triggered immediately before declaring an Action or immediately after one fully resolves
- Cannot interrupt an Action mid-flow
- Unit in Reserves cannot use Active Abilities unless ability explicitly says otherwise
- Each named Active Ability: **once per Round** per specific Unit (unless REPEATABLE keyword)
- Effects granted by Active Abilities expire at End of Current Round unless stated otherwise

**2.7.2 Passive Abilities:**
- Always on, as long as Unit is on battlefield
- Inactive while Unit is in Reserves (unless stated otherwise)

**2.7.3 Reaction Abilities:**
- Fire in response to specific trigger (incoming attack, enemy Charge, model destroyed)
- Must be declared at the **exact moment** trigger occurs
- **One Reaction per Activation** (each player may resolve only one)
- Each named Reaction: **once per Round** per specific Unit (across all Phases and all Activations)
- Cannot use same named Reaction more than once per Round, even on different triggers
- Different Units may each use same named Reaction once per Round
- If both players react to same trigger, Active Player resolves first

## Key Conclusions for App:

### Activation System:
- Units activate in each phase (Movement, Assault, Combat) via alternating activation
- Each unit can be activated once per phase
- So tracking should be: activated per PHASE, not per round

### Active/React Tracking:
- Active Abilities: once per ROUND per named ability per unit
- Reaction Abilities: once per ROUND per named reaction per unit
- One Reaction per Activation (per player)

## Part 8: Round Structure (Official Rules)

### 8.3.1 Supply Pool
- Round 1: Supply Pool = Mission Card's Starting Supply
- Later Rounds: increases by Supply Escalation each round
- Final Round: Supply Pool becomes UNLIMITED
- Hard Cap: Total Current Supply of on-table Units may NEVER exceed Supply Pool

### 8.3.2 Available Supply
- Available Supply = Supply Pool - Total Supply of Friendly Units on Battlefield
- A Unit may be fielded only if its Current Supply <= Available Supply
- Destroyed/reduced units free up supply

### 8.4 Phase 1: Movement Phase
- At start: Resolve all "Start of Round" abilities
- 8.4.1 Activations: Alternating activation
  - Active Player chooses: Activate a Unit on battlefield (Move/Hold/Disengage) OR Activate a Unit in Reserves (Deploy)
  - After action: place Activation Marker (Movement side) next to Unit
- 8.4.2 Passing: First player to Pass takes First Player Marker for Phase 2
  - Place Activation Markers next to all on-table Units that did not activate

### KEY FINDING: Activation is PER PHASE
- Each unit gets activated once per phase (Movement, Assault, Combat)
- Activation Markers are placed per phase
- When a player Passes, all their remaining units get markers too
- So tracking should be: activated per PHASE, not per round

### What to track per unit per phase:
- Has been activated this phase? (reset each phase transition)

### What to track per unit per round:
- Which named Active Abilities used this round? (each named ability once per round)
- Which named Reaction Abilities used this round? (each named reaction once per round)
- One Reaction per Activation (per player)

## Part 6: The Supply System

### 6.1 Supply Profile
- Every Unit Card has a Supply Profile in top-right corner
- Links number of remaining models to a Current Supply Value
- Supply is DYNAMIC: as Unit takes casualties, Supply drops
- Example: 9 Marines = Supply 2, 6 Marines = Supply 2, 3 Marines = Supply 1, 0 = Supply 0

### 6.2 How Supply Is Used
- Supply Pool = starting supply from Mission Card + escalation per round
- Units on battlefield consume supply equal to their Current Supply Value
- To deploy a new unit from Reserves, must have enough free supply
- Destroyed units free up their supply

### Mission Card Supply Fields:
- Starting Supply: Supply Pool available in Round 1
- Supply Escalation: Amount Supply Pool increases each subsequent Round
- Game Length: Number of Rounds (usually 5)

## Part 5: Card Types

### Tactical Cards:
- Resource Type and Value: CP (Terran), BM (Zerg), PE (Protoss)
- When Exhausted, generates that resource amount
- Has Special Abilities (Active/Passive/Reaction)

### Faction Cards:
- Resource Type and Value: same as Tactical
- Starting Army Slots
- Special Abilities

## Damage & Casualty Rules (from Official Rules)

### 8.7.4 Resolve Damage and Casualties
- Total Damage = (Damage Pool dice count) x weapon's Damage characteristic + accumulated Damage Markers
- While Total Damage >= model's HP: remove one Visible model, reduce Total Damage by that model's HP
- If Total Damage remains but cannot kill next model: record with Damage Marker (D6)
- Damage carries over between attacks via Damage Markers

### Damage Tracking for App:
- Track damage per unit (accumulated damage marker)
- Track models remaining per unit
- For Protoss: track shield status per model (binary: has shield or lost shield)

## Shield Rules (from user):
- Protoss units have shields = extra HP pool (treated as extra HP before main HP)
- Shields are lost BEFORE HP
- If unit returns to Reserves, shields do NOT recover

## Assault Phase (8.6)
- Same alternating activation as Movement Phase
- Activate a Unit without Activation Marker (Assault side)
- Actions: Hold, Shoot, or Charge
- After action: place Activation Marker (Assault side)
- Passing: same as Movement Phase, first to pass gets First Player for Combat Phase

## Combat Phase (8.8)
- Same alternating activation
- Activate an ENGAGED Unit without Activation Marker (Combat side)
- Actions: Fight (close combat)
- After action: place Activation Marker (Combat side)
- Non-Engaged units are automatically passed

## Summary: 3 Phases with Activation
1. Movement Phase: Move/Hold/Disengage/Deploy
2. Assault Phase: Hold/Shoot/Charge
3. Combat Phase: Fight (only Engaged units)
- Each unit can be activated ONCE per phase
- Scoring Phase (Phase 4): no activations, just score objectives
