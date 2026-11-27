// Reviewed semantic decomposition of the frozen capture. These declarations are
// engineering work obligations, never an execution permission or prose parser.
const consumer = (file, exportName) => ({ file: 'packages/' + file, exportName });
export const WAVE4_CONSUMERS = {
  attack: consumer('source-data/official-attack-profile-catalogue-v2.mjs', 'createOfficialAttackProfileCatalogueV2'),
  characteristic: consumer('product-composition/official-characteristic-status-family-adapter-v1.mjs', 'createOfficialCharacteristicStatusFamilySourceBundleV2'),
  reaction: consumer('product-composition/official-reaction-family-adapter-v1.mjs', 'createOfficialReactionFamilySourceBundleV2'),
  reactionRuntime: consumer('product-composition/official-reaction-family-adapter-v1.mjs', 'createOfficialReactionFamilyAdapterV1'),
  relocation: consumer('product-composition/official-relocation-family-adapter-v1.mjs', 'createOfficialRelocationFamilySourceBundleV2'),
  lifecycle: consumer('product-composition/official-unit-lifecycle-family-adapter-v1.mjs', 'createOfficialUnitLifecycleFamilySourceBundleV2'),
  asset: consumer('product-composition/official-battlefield-asset-family-adapter-v1.mjs', 'createOfficialBattlefieldAssetFamilySourceBundleV2'),
  roundEnd: consumer('product-composition/official-holo-round-end-runtime-v1.mjs', 'createOfficialHoloRoundEndRuntimeV1'),
  supply: consumer('rule-atoms/official-contextual-supply-projection-v1.mjs', 'projectOfficialContextualSupplyValueV1'),
  supplyLoss: consumer('product-composition/official-friendly-supply-loss-reaction-v1.mjs', 'createOfficialFriendlySupplyLossReactionRuntimeV1'),
  refresh: consumer('product-composition/official-ranged-card-refresh-runtime-v1.mjs', 'createOfficialRangedCardRefreshRuntimeV1'),
  builder: consumer('source-data/official-army-builder-catalogue-v2.mjs', 'createOfficialArmyBuilderCatalogueV2'),
  nonlethal: consumer('rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs', 'resolveOfficialNonLethalDamageV1'),
  payment: consumer('product-composition/official-unit-ability-payment-modifiers-v1.mjs', 'quoteOfficialUnitAbilityModifiersV1'),
};

// One new atom means one absent executable transition/policy contract, counted
// once across all definition IDs. New source IDs, numeric profiles, text edits,
// predicates and compositions of existing contracts do not each create atoms.
export const WAVE4_NEW_ATOMS = {
  'friendly-lost-supply-threshold': ['Project sum(initial-current Supply) across all friendly army units, including reserves and destroyed units; evaluate cumulative thresholds without conflating mission Supply or kill credit.', ['supply', 'supplyLoss']],
  'friendly-damage-payment': ['Choose another visible friendly Biological unit and resolve its actual 2 Damage before the promised Run/HITS/BUFF continuation; retain paid-cost lineage.', ['characteristic', 'payment']],
  'incoming-damage-sacrifice': ['Interrupt pending incoming Damage, resolve damage to a different friendly recipient, then reduce the original batch by the normal or empowered amount before allocation.', ['reaction', 'characteristic']],
  'pre-movement-fire-wall': ['Before movement commits, test leading path and all final model positions against a Fire Wall; remove the token, resolve HITS, suppress charge IMPACT, then resume or terminate the same movement.', ['asset', 'relocation']],
  'per-model-flamer-substitution': ['Player selects permitted individual models to replace numeric weapon attacks with FT coverage, including the melee variant; do not duplicate those models in numeric pools.', ['attack']],
  'before-casualty-batch-detonation': ['Retain the pending casualty batch and its pre-removal geometry; optional paid reaction deals HITS per model about to die, then removes those models exactly once.', ['reaction', 'supplyLoss']],
  'parent-scoped-summon-capacity': ['Reject another summon while any living summoned child of this parent exists, independent of child type and of other parents.', ['lifecycle']],
  'round-once-game-override': ['Grant a round-scoped permission to reuse an already-used summon without erasing the original once-per-game record or granting other summon types.', ['lifecycle']],
  'summoned-child-action-continuation': ['After summon, or a parent ability targeting its own child, let the controller perform the specified child movement and return to the suspended parent ownership.', ['lifecycle', 'relocation']],
  'round-end-reserve-deploy': ['Store a marker while the parent is in reserves; at round end offer optional base-contact deployment with current legality, then consume the once-game scheduled effect.', ['roundEnd', 'lifecycle']],
  'triggered-melee-self-removal': ['On enemy activation end or successful charge, resolve a mandatory melee attack against the qualifying enemy, including defence/casualty choices, then remove the source and restore the parent continuation.', ['reaction', 'lifecycle']],
  'before-place-direction-and-target-buff': ['Before each PLACE, optionally choose an enemy; constrain that placement directly towards it and bind the RoA bonus exclusively to attacks against that target.', ['relocation', 'characteristic']],
  'infestation-activation-exchange': ['Consume the enemy INFESTATION after marking that enemy activated; optionally select a nearby non-Unique friendly Infested unit and remove its activation marker, preserving phase ownership.', ['characteristic']],
  'infestation-reaction-lock': ['For an infected enemy, block its own enemy reactions and enemy reactions targeting it, while retaining the explicit Restoration exception and controller-relative allegiance.', ['reaction']],
  'infestation-placement-reserve-lock': ['For an infected enemy, reject PLACE, set effects and return-to-reserves across all movement/lifecycle entry points; ordinary legal movement remains available.', ['relocation', 'lifecycle']],
  'foreign-faction-army-eligibility': ['Permit Terran Ground Mechanical purchases only under the Stukov faction while applying costs, slots, uniqueness and upgrade rules to the original source identity.', ['builder']],
  'faction-unit-runtime-conversion': ['Bind the imported units to Infested tag addition, CP-to-BM payment conversion and BURROWED prohibition without changing unrelated units or rewriting the source records.', ['builder', 'payment', 'characteristic']],
  'spawn-round-ability-lock': ['When the faction sets its structure, suppress its abilities except Structure for that round, then restore the correct abilities after cleanup; do not silently grant SUMMON semantics.', ['lifecycle', 'characteristic']],
  'shield-scaled-effect-value': ['Use remaining shield points to derive attack/IMPACT dice or detonation damage with each printed rounding rule. Withdrawn Archon source only.', ['characteristic', 'attack']],
  'shield-reservoir-damage-payment': ['Reduce a friendly pending damage batch by spending this source shield reservoir with the exact optional/fixed amount and shielded requirements. Conflicting withdrawn Archon drafts.', ['reaction', 'characteristic']],
  'target-card-exhaustion-waiver': ['Once per round, waive exhaustion of a non-Faction card targeting the carrier, without readying an already exhausted card or changing other payment requirements. Withdrawn Archon source only.', ['payment']],
};

const row = (classification, consumers, trigger, choice, settlement, cleanup, newAtoms = []) =>
  ({ classification, consumers, trigger, choice, settlement, cleanup, newAtoms });
const combo = (consumers, trigger, choice, settlement, cleanup = 'normal cleanup_and_refresh unless the printed source says otherwise') =>
  row('existing_atoms_new_combination', consumers, trigger, choice, settlement, cleanup);
const novel = (atoms, consumers, trigger, choice, settlement, cleanup) =>
  row('new_semantics', consumers, trigger, choice, settlement, cleanup, atoms);

export const WAVE4_NAMED_REVIEWS = {
  "Highlord of the Tal'darim": novel(['friendly-lost-supply-threshold'], ['supply', 'characteristic'], 'live friendly lost-Supply total >=2 / >=4 / >=6', 'automatic cumulative thresholds', '+3 IMPACT dice / weapons INSTANT / empowered ability parameters', 'recompute from current army state'),
  Sacrifice: novel(['friendly-damage-payment', 'incoming-damage-sacrifice'], ['reaction', 'characteristic'], 'source receives Damage, before allocation', 'source controller selects another friendly Biological unit Within 8; pays 1 PE', 'other unit suffers 2 Damage; original batch -2, or -3 empowered', 'consume this damage window once; preserve parent damage continuation'),
  'Wrath of the Highlord': novel(['friendly-damage-payment'], ['characteristic', 'relocation'], 'Assault active ability', 'friendly Biological target Within 8 and legal Run destination', 'target suffers 2 Damage; actor Runs 4, or 6 empowered', 'end bonus movement and return to source activation'),
  'Destruction Wave': novel(['friendly-damage-payment'], ['characteristic'], 'Assault active ability', 'friendly Biological payer and separate enemy target, both Within 8', 'pay 2 Damage then HITS 4(1), or 6(1) empowered', 'finish pending HITS and restore acting player'),
  'Empower Me': novel(['friendly-damage-payment'], ['characteristic'], 'Assault active ability', 'another friendly Biological payer Within 8', 'pay 2 Damage; Bane Blades BUFF RoA 4 or 6 empowered', 'round cleanup of BUFF'),
  'Stand as One!': novel(['shield-reservoir-damage-payment'], ['reaction'], 'another friendly Shielded unit suffers Damage Within 4', 'printed reaction costs 1 PE; fixed reduction conflicts with Wip option', 'reduce pending batch by 3, source loses corresponding shields', 'finish original allocation; withdrawn record'),
  Wip: novel(['shield-reservoir-damage-payment'], ['reaction'], 'another friendly unit suffers Damage Within 4 while both Shielded', 'controller may spend up to 3 shield points; conflicts with named version', 'damage reduction equals selected shield payment', 'finish original allocation; withdrawn record'),
  'Psionic Entity': novel(['shield-scaled-effect-value'], ['characteristic', 'attack'], 'source resolves any Attack', 'automatic ceil(remaining shields /3)', 'add corresponding attack dice', 'recompute each attack; withdrawn record'),
  Wip2: novel(['shield-scaled-effect-value'], ['characteristic', 'attack'], 'source makes Ranged/Close Combat Attack action', 'automatic shield scaling; action wording differs from named version', 'add ceil(remaining shields /3) dice', 'per attack; withdrawn record'),
  'Burning Radiance': combo(['reaction', 'characteristic'], 'after Ranged Attack against source fully resolves', 'REPEATABLE, 1 PE; named text affects all engaged units', 'each engaged unit suffers 2 Damage', 'complete triggered damage batches; withdrawn record'),
  Wip3: combo(['reaction', 'characteristic'], 'after Ranged Attack action affects source, including Spillover', 'REPEATABLE; draft instead affects enemy engaged units', 'each enemy engaged unit suffers 2 Damage', 'finish triggered damage; withdrawn record'),
  'Khaydarin Amulet': novel(['target-card-exhaustion-waiver'], ['payment'], 'non-Faction card special ability targets carrier', 'controller optional once per Round', 'resolve ability without exhausting that ready card', 'waiver usage resets per round; withdrawn record'),
  Feedback: combo(['characteristic'], 'Movement active, 1 PE', 'enemy Mechanical or Psionic target Within 8', 'after target resolves unit Active/Reaction, NON-LETHAL 3; exclude card abilities', 'end of round; unlike old version, target tag scope differs'),
  "Mak Thor'idan!": novel(['shield-scaled-effect-value'], ['characteristic', 'attack'], 'source resolves Devastating Charge', 'automatic ceil(remaining shields/3)', 'add corresponding IMPACT dice', 'this IMPACT roll; withdrawn record'),
  'Wip 4': novel(['shield-scaled-effect-value'], ['characteristic', 'attack'], 'Devastating Charge IMPACT Hit Roll', 'automatic ceil(shields/3); draft duplicate', 'add corresponding IMPACT dice', 'this roll; withdrawn record'),
  'Power Overwhelming': novel(['shield-scaled-effect-value'], ['characteristic', 'lifecycle'], 'Combat active, 0 PE', 'enemy Within 2', 'Damage equal to remaining shield points, then destroy actor', 'complete damage before actor destruction; withdrawn record'),
  Stimpack: combo(['characteristic'], 'Movement active, 1 CP', 'controlling player activates ability', 'NON-LETHAL 2; Speed +3, flamethrower and melee PRECISION 3', 'round BUFF cleanup; weapon selection differs from old Stimpack'),
  'Incinerator Gauntlets': novel(['pre-movement-fire-wall'], ['asset', 'relocation'], 'Movement placement, later leading-path/final-position movement event', 'controller sets unoccupied Fire Wall Within 4; 1 CP', 'pre-move removal and HITS 5(1); charge cannot IMPACT', 'consume token once; standard token cleanup and creator-loss policy must be verified'),
  'Fire it Up': novel(['per-model-flamer-substitution'], ['attack'], 'Perdition Flamethrower ranged attack declaration', 'choose <=1 model, or <=2 if current Supply=2, for FT substitution', 'FT and remaining numeric attacks use disjoint model sets', 'this attack sequence only'),
  'Need A Light?': novel(['per-model-flamer-substitution'], ['attack'], 'Flame Strike melee attack declaration', 'choose one model to replace regular RoA by FT', 'resolve selected FT and remaining normal melee attacks', 'this melee sequence only'),
  'Live for the Swarm!': combo(['characteristic', 'asset'], 'attack against infected target OR target Within 6 of any creep source/tumor', 'automatic conditional weapon modifier', 'Infested C-14 Rifle and all melee PRECISION 2', 'recompute target condition for each attack'),
  Detonation: novel(['before-casualty-batch-detonation'], ['reaction', 'supplyLoss'], 'immediately before source models are destroyed', 'controller may pay 1 BM', 'nearby enemy units Within 2 suffer HITS 1 per pending casualty; per-hit Damage 1 Marine /2 Trooper', 'remove original casualties once after nested resolution'),
  'Plagued Munitions': combo(['characteristic', 'nonlethal'], 'after Infested C-14 Rifle attack that inflicted actual Damage', 'automatic if qualified', 'additional NON-LETHAL 1, not for other weapon names', 'resolve once per qualifying attack'),
  Detection: combo(['characteristic'], 'enemy Within 8 of source', 'automatic aura', 'remove HIDDEN', 'recompute visibility, no automatic restoration of lost HIDDEN'),
  Infestation: combo(['supplyLoss', 'characteristic'], 'infected enemy reaches Supply 0 or is destroyed', 'turret controller may choose another enemy Within 8 of the fallen enemy; 0 BM', 'apply INFESTATION as DEBUFF from preserved trigger location', 'one casualty event/opportunity; ordinary debuff lifetime'),
  'Ocular Overwatch': combo(['reaction', 'attack'], 'enemy Flying unit ends Assault activation Within 14', 'controller may use 0 BM reaction', 'perform ranged attack against that enemy', 'finish attack and resume previous activation ownership'),
  Nimble: combo(['characteristic'], 'source is affected by Attack or Special Ability', 'automatic Evade eligibility', 'grant eligibility, retain roll and modifier rules', 'per defence; no immunity to damage'),
  'Proximity Detonation': novel(['triggered-melee-self-removal'], ['reaction', 'lifecycle', 'attack'], 'enemy Ground unit ends Assault activation Within 2', 'mandatory melee attack against that enemy', 'resolve attack then remove source', 'remove once; restore parent activation continuation'),
  'Explosive Charge': novel(['triggered-melee-self-removal'], ['reaction', 'lifecycle', 'attack'], 'source successfully charges in Assault', 'controller selects one target of that same Charge', 'resolve melee attack then remove source', 'one charge trigger; restore parent continuation'),
  'Limited Artificial Intelligence': novel(['parent-scoped-summon-capacity'], ['lifecycle'], 'source attempts SUMMON', 'automatic parent-child guard', 'reject while any summoned child of this parent remains', 'capacity released on actual child removal'),
  Microfactory: novel(['round-once-game-override'], ['lifecycle', 'payment'], 'Movement active, 2 PE', 'controller authorizes printed Scarab ability reuse', 'round-only bypass of prior game usage; no implicit reuse of all upgraded summon abilities', 'round expiry; preserve original once-game history'),
  Scarab: novel(['summoned-child-action-continuation'], ['lifecycle', 'relocation'], 'Movement active, 0 PE, once per Game', 'SUMMON Scarab then optional immediate child Move', 'create child under parent, resolve optional Move before returning control', 'per-name once-game flag and independent child lifetime'),
  'Solarite Scarab': novel(['summoned-child-action-continuation'], ['lifecycle', 'relocation'], 'Movement active, purchased upgrade, once per Game', 'SUMMON Solarite Scarab then optional child Move', 'same summon continuation with distinct child record and once-game key', 'independent child lifetime and once-game flag'),
  'Phasing Scarab': novel(['summoned-child-action-continuation'], ['lifecycle', 'relocation'], 'Movement active, purchased upgrade, once per Game', 'SUMMON Phasing Scarab then optional child Move', 'same summon continuation with distinct child record and once-game key', 'independent child lifetime and once-game flag'),
  Shuttle: novel(['round-end-reserve-deploy'], ['asset', 'roundEnd', 'lifecycle'], 'Movement, also usable in Reserves, once per Game', 'set marker >10 from all enemies; optional deployment at round end', 'deploy parent in base contact with marker; activation ends', 'consume scheduled deployment opportunity; source/marker loss branch must be verified'),
  'Siege Triangulation': novel(['summoned-child-action-continuation'], ['relocation', 'lifecycle'], 'Assault active, 1 PE', 'choose Scarab variant created by this parent and legal destination <=5', 'move chosen child', 'return to parent activation; preserve parent-child scope'),
  'Seek Bloodshed': combo(['supplyLoss', 'reaction', 'relocation'], 'another friendly unit Within 12 loses current Supply', 'unengaged controller may pay 1 PE and choose legal Move directly towards that unit', 'execute constrained Move from retained loss event', 'resume parent event and previous active side'),
  'Bloodshard Blink': novel(['before-place-direction-and-target-buff'], ['relocation', 'characteristic'], 'immediately before any PLACE by source', 'controller optionally selects one enemy', 'PLACE directly towards it, weapons BUFF RoA 1 only against that target', 'BUFF round cleanup; placement constraint ends with this PLACE'),
  'Plague Warden': combo(['supply', 'characteristic'], 'infected enemy Within 6 of Stukov', 'automatic aura', 'mission/objective Supply -1, minimum 0; do not change roster Supply or Disengage Supply', 'recompute aura and INFESTATION condition'),
  'Spread Infestation': combo(['characteristic'], 'Stukov Movement or Trooper Any Phase active, 1 BM', 'enemy Within 8 subject to ordinary visibility and DEBUFF reactions', 'apply INFESTATION as DEBUFF', 'ordinary round DEBUFF cleanup and explicit consumption/removal'),
  'Admiral of the Infested': novel(['infestation-activation-exchange'], ['characteristic'], 'Movement active, 1 BM', 'infected enemy Within 8, then optional non-Unique friendly Infested Within 8 of that enemy', 'mark enemy activated; consume INFESTATION; optionally ready friendly activation', 'phase activation markers and pending continuation ownership'),
  'Bio-Kill Switch': combo(['characteristic'], 'Assault active, 0 BM', 'all infected enemy battlefield units, no arbitrary target pruning', 'Damage 2 to each; remove INFESTATION from those that actually suffered Damage', 'finish damage/reactions before conditional status removal'),
  'Corrode Armor': combo(['reaction', 'characteristic'], 'immediately after source ranged attack resolves', 'controller may pay 1 BM', 'target receives Armour DEBUFF 1', 'round cleanup and Restoration opportunity'),
  'Warp Conduit': combo(['asset', 'lifecycle'], 'friendly Ground unit deploys from Reserves', 'controller may use this Pylon base as Entry Edge once per round', 'perform actual deployment, then end deploying unit activation', 'per-source round usage resets'),
  'Bloodshard Monument': combo(['supplyLoss', 'refresh'], 'any unit Within 8 loses current Supply', 'controller selects one non-Unique exhausted Tactical Card', 'ready exactly that card', 'consume one opportunity per committed loss event'),
  'Overwatch': combo(['reaction', 'attack'], 'enemy ends Assault activation Within 8', 'controller may pay 1 PE', 'ranged attack against same trigger target', 'finish attack and return parent ownership'),
  'Terran Charge': combo(['reaction', 'attack'], 'immediately after friendly Biological successful Charge', 'controller uses Tactical Card reaction', 'additional IMPACT 1 at 4+, separate from own Devastating Charge', 'this post-charge effect; exhaust card by standard rule'),
  'Universal Carrier': combo(['supplyLoss', 'characteristic'], 'infected enemy loses Supply or is destroyed', 'controller chooses friendly Biological unit Within 12 of trigger', 'HEAL 2 using actual model/wound rules', 'complete loss opportunity once; ordinary healing cap'),
  "Stukov's Creep": combo(['asset'], 'enemy Move/Deploy/Run/Charge/Disengage ends Within 1 of friendly tumor', 'automatic token consumer', 'remove touched token; token has STAY IN PLAY and DISPLACEMENT', 'removal once per token; no extra damage inferred'),
  'Brutal Instinct': combo(['reaction', 'characteristic'], 'enemy ends Movement activation Within 12 of friendly Ground unit', 'controller selects friendly recipient, card reaction', 'recipient gains or loses BURROWED', 'normal status/activation lifecycle; no free movement inferred'),
  'For the Swarm!': combo(['relocation'], 'Movement active card ability', 'active actor must be both Biological and Ground; choose 2-inch Move', 'extra Move without consuming action limit', 'return to same activation and exhaust card'),
  'Parasitic Bio-Toxins': combo(['reaction', 'characteristic'], 'friendly Infested unit completes Movement action Within 8 of enemy', 'controller chooses qualifying enemy; card reaction', 'apply INFESTATION as DEBUFF', 'round debuff cleanup and Restoration'),
  'Scanner Sweep': combo(['asset', 'characteristic'], 'Movement active card ability', 'controller sets indicator anywhere', 'enemy Within 6 lose HIDDEN', 'normal marker cleanup; do not silently add a range restriction'),
  'Master of Robotics': combo(['characteristic'], 'Movement active card ability', 'active Mechanical unit', 'HEAL 2', 'normal wound cap; exhaust card'),
  'Growing Infestation': novel(['infestation-reaction-lock'], ['reaction'], 'infected enemy attempts reaction or is target of enemy reaction', 'automatic restriction; explicit Restoration exception', 'reject both forbidden use and forbidden recipient, relative to card controller', 'ends when INFESTATION or source effect ceases'),
  'Fetid Touch': novel(['infestation-placement-reserve-lock'], ['relocation', 'lifecycle'], 'infected enemy attempts PLACE, set or return-to-reserves', 'automatic restriction', 'reject across all relevant consumers', 'ends with INFESTATION/source effect; regular moves remain legal'),
  'Ashes of the UED': novel(['foreign-faction-army-eligibility', 'faction-unit-runtime-conversion'], ['builder', 'payment', 'characteristic'], 'Stukov army construction and imported unit runtime', 'Terran units with both Ground and Mechanical; normal costs/slots', 'add Infested; convert their CP costs to BM; prohibit BURROWED', 'scoped to these imported units throughout this army'),
  'Hostile Incubation': novel(['spawn-round-ability-lock'], ['lifecycle', 'characteristic'], 'Movement active faction ability; no friendly Infested Turret on battlefield', 'set Ground Level unit >10 from all enemy models', 'set matching structure and suppress abilities except Structure for current round', 'suppression expires after round; source uniqueness rechecked'),
  'Proxy Pylon': novel(['spawn-round-ability-lock'], ['lifecycle', 'characteristic'], 'Movement active faction ability; no friendly Tal Pylon on battlefield', 'set Ground Level unit >10 from all enemy models', 'set matching structure with current-round ability suppression except Structure', 'round expiry and ordinary permanent structure lifetime'),
  'Chain of Ascension': novel(['friendly-lost-supply-threshold'], ['supply', 'characteristic'], 'live friendly lost-Supply total; header for next two source fragments', 'automatic cumulative threshold group, not three separate activated abilities', 'combine header with reviewed 4 and 6 threshold fragments', 'recompute from current army state'),
  '4 or more': novel(['friendly-lost-supply-threshold'], ['supply', 'characteristic'], 'same Chain of Ascension total >=4', 'automatic supporting source fragment', 'all own units first used weapons PRECISION 1', 'round first-weapon consumption and live threshold'),
  '6 or more': novel(['friendly-lost-supply-threshold'], ['supply', 'characteristic'], 'same Chain of Ascension total >=6', 'automatic supporting source fragment', 'all own units first used weapons CRITICAL HIT 1', 'round first-weapon consumption and live threshold'),
};

export const WAVE4_EXISTING_NAMED_CONSUMERS = {
  Commander: ['supply'], 'Devastating Charge': ['attack'], Indomitable: ['characteristic'],
  'Ares-Class Targeting System': ['characteristic'], 'Target Lock': ['characteristic'],
  'Burrow Ambush': ['relocation'], 'Source of Creep': ['asset'], Structure: ['lifecycle'],
  Large: ['characteristic'], 'Heavy Plating': ['characteristic'], 'Mode Transformation': ['characteristic'],
  'Coordinated Strike': ['characteristic'], 'Point Blank': ['characteristic'], 'Aftershock Rounds': ['characteristic'],
  'Shaped Blast': ['reaction'], 'Smart Shells': ['reaction'], 'Timed Life': ['roundEnd'], Squadron: ['characteristic'],
  Blink: ['relocation'], 'Go! Go! Go!': ['relocation'], 'Creep Spread': ['asset'],
};

export const WAVE4_TIMING_REACTION_RECORDS = [
  'armory', 'engineering_bay', 'evolution_chamber', 'forge', 'observer', 'overseer',
  'power_field', 'robotics_facility', 'twilight_council', 'vanadium_plating', 'zerg_swarm',
];

// Exact reviewed revisions only. The prior spec is reusable; accepting arbitrary
// text normalization or aliasing the changed @1 identity would hide new sources.
export const WAVE4_REACTION_REVISIONS = [
  ['card:armory/vehicle-plating-any', 'Vehicle Plating <Reaction> <Any Phase>: Immediately before a Friendly Mechanical Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll.'],
  ['card:engineering_bay/infantry-armor-any', 'Infantry Armor <Reaction> <Any Phase>: Immediately before a Friendly Biological Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll.'],
  ['card:evolution_chamber/carapace-any', 'Carapace <Reaction> <Any Phase>: Use Immediately before a Friendly Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll.'],
  ['card:forge/ground-armor-any', 'Ground Armor <Reaction> <Any Phase>: Use Immediately before a Friendly Ground Unit makes an Armour Roll. That Unit gains TOUGH (1) for this roll.'],
  ['card:observer/gravitic-boosters-any', 'Gravitic Boosters <Reaction> <Assault Phase>: Use immediately after a Friendly Unit rolls a D6 for Charge Distance. Add 1 to the Charge Distance for this Unit.'],
  ['card:overseer/pneumatized-carapace-any', 'Pneumatized Carapace <Reaction> <Assault Phase>: Use Immediately after a Friendly Unit rolls a D6 for Charge Distance. Roll an additional D6 and use the higher result to calculate the total Charge Distance.'],
  ['card:power_field/guardian-shell-any', 'Guardian Shell <Reaction> <Any Phase>: Use Immediately before a Friendly Ground Unit makes an Armour Roll. That Unit gains DODGE (2) for this roll.'],
  ['card:robotics_facility/plasma-shields-any', 'Plasma Shields <Reaction> <Any Phase>: Use Immediately before a Friendly Mechanical Ground Unit makes an Armour Roll. If this Unit has the Shielded Status, it gains TOUGH (1) and DODGE (1) for this roll.'],
  ['card:twilight_council/veil-of-shadows-any', 'Veil of Shadows <Reaction> <Any Phase>: Use Immediately after a Friendly Unit resolves a PLACE effect. That Unit immediately resolves the HEAL (2) effect.'],
  ['card:vanadium_plating/crystalline-alloy-any', 'Crystalline Alloy <Reaction> <Any Phase>: Immediately before a Friendly Mechanical Unit makes an Armour Roll. That Unit gains DODGE (2) for this roll.'],
  ['card:zerg_swarm/brood-instinct-any', 'Brood Instinct <Reaction> <Any Phase>: Use Immediately before a Friendly Unit makes an Evade Roll. Apply a +1 Modifier to that roll.'],
].map(([semanticId, sourceText]) => ({ previousDefinitionId: semanticId + '@1', definitionId: semanticId + '@2', sourceText }));
