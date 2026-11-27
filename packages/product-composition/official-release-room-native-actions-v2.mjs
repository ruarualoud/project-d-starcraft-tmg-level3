import { OFFICIAL_EXPLICIT_PHASE_PASS_HANDOFF_V1 } from '../rule-atoms/official-phase-activation-availability-v1.mjs';
import { WAVE3_FAQ_V13_BYTE_HASH } from '../rule-atoms/official-wave3-faq-clarifications-v1.mjs';
import { OFFICIAL_HOLD_ACTION_FAQ_V13, OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V3 }
  from '../rule-atoms/official-action-status-lifecycle-policy-v1.mjs';
import { OFFICIAL_RAVEN_DESTROYED_SOURCE_FAQ_V13, OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID }
  from './official-characteristic-status-family-adapter-v1.mjs';
import { createOfficialReleaseRoomAbilityRuntimeV2, prepareOfficialReleaseRoomAbilityAssemblyV2 }
  from './official-release-room-ability-admission-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from './official-characteristic-status-component-runtime-v2.mjs';
import { OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID } from './official-targeted-active-ability-policy-v1.mjs';
import { OFFICIAL_POINT_DEFENSE_LASER_DEFINITION_ID } from './official-unit-lifecycle-family-adapter-v1.mjs';
import { OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 }
  from '../rule-atoms/official-movement-clearance-contract-v13.mjs';

import { prepareOfficialCurrentProductFirstRoundV1 } from './official-first-round-setup-v1.mjs';
import { OFFICIAL_EVOLUTION_CARAPACE_ID, OFFICIAL_BROOD_INSTINCT_DEFINITION_ID, OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID } from './official-reaction-family-adapter-v1.mjs';

const weaponComponentAdapterId = 'official-roster-weapon-component-adapter-v1';

const currentAbilityOptions = Object.freeze({
  useEquippedWeapons: true,
  includeInheritedMovementCards: true,
  includeInheritedCharacteristics: true,
  includeInheritedMissionSupply: true,
  includeInheritedRangedHitDebuff: true,
  includeInheritedRespawn: true,
  includeInheritedVentralSacs: true,
  includeWarpPrism: true,
  includeZealotCharge: true,
  includeDropship: true,
  includeKhalai: true,
  includeInheritedLunge: true,
  includeQueenDomineering: true,
  includeWave3Vileling: true,
  includeCocoonMorph: false,
  includeZergSwarmBurrow: false,
  includeZergSwarmBroodInstinct: false,
  includeSiegeTankCoverage: false,
  includeRaynorFactionCards: false,
  includeRaven: false,
  includeRavenSeeker: false,
  includeNovaShared: false,
  includeNovaModes: false,
  includeScheduledRemovalAction: false,
  includeNovaHolo: false,
  includeNovaStealthShooting: false,
  includeZagaraMeleeAndArmour: false,
  includeZagaraCreep: false,
  includeZagaraArmyAbilities: false,
  includeZergTargetReactions: false,
  includeRavagerImpact: false,
  includeRavagerBile: false,
  includeRavagerTunnel: false,
  includeBilePhysicalPlacement: false,
  includeBileLauncherPassives: false,
  includeBombard: false,
  includeBombardPhysicalPlacement: false,
  includeDefilerBite: false,
  includeDefilerMound: false,
  includeReactiveCreep: false,
  includePlague: false,
  includeInheritedReserveAmbush: false,
  includeSelectedReserveAmbush: false,
  includeStandaloneFreedomFighters: false,
  includeInheritedTerranInfantry: false,
  includeInheritedReserveAndKhalai: false,
  includeArtanisReactions: false,
  includeTankCoordinatedStrike: false,
  includeSupportWeapons: false,
  reportEffectiveAbilityRange: false,
  useReleaseWideAbilityPhases: false,
  includeDestroyedRavenShrapnel: false,
  includeFaqHoldStatusExpiry: false,
  includeRemainingFaqClarifications: false,
  hostDerivedGapInputs: false,
  creatorTokenLifecycle: false,
  includeStormTokenMatchCleanup: false,
  includeBombardCreatorLoss: false,
  includeIndependentSupportReactions: false,
  includeAttachedEffectLoss: false,
  seatOwnedWebMenu: false,
  includeTerranSupportCards: false,
  includeDroneGliding: false,
  includeArtanisStand: false,
  includeRedirectSelection: false,
  includeProtossSupport: false,
  includeMalignantCreep: false,
  includeReleaseInheritedHitsReactions: false,
  includeInheritedSwarmUpgrades: false,
  includeSwarmDefenceCards: false,
  includeLairPredation: false,
  includeOverseerChargeReaction: false,
  includeOmegaWormDetection: false,
  includeCreepFootprintGeometry: false,
  includeOmegaWormStructure: false,
  excludeReserveUnitsFromSpatialAuras: false,
  includeAdept: false,
  includeMixedRosterReactions: false,
  includeHighGroundFinalPlacement: false,
  includeLungeAxisLeaderBound: false,
  includeImmortal: false,
  includeVoidSeeker: false,
  includeNerazimSupport: false,
  includeNerazimNative: false,
  includeNerazimConcealment: false,
  includeZeratulCombat: false,
  includeZeratulMobility: false,
  includeReleaseStorm: false,
  includeTwilightTemplar: false,
  includeKhassarEndActivationOverwatch: false,
  includeReleaseKhassar: false,
  includeSentryForceField: false,
  includeSentryRestoration: false,
  includeSentryGuardianShield: false,
  includeTemplarCasteRefresh: false,
  includeTassadarWalls: false,
  includeTassadarSupport: false,
  bindEmptyActivationSource: false,
  includeAncestralWisdom: false,
  includeTemplarAbilityPayment: false,
  includeTemplarFarsight: false,
  includeExplicitPhasePassHandoff: false,
  includeCreepMovementQueries: false,
  includeIndependentRangedLungeOwner: false,
  includeSignedRampSight: false,
  includeWave3SupportAmbush: false,
  exclusiveRangedContinuation: false,
});

export function officialReleaseRosterIncrementOptionsV2(version) {
  const seatOwnedWebMenu = version === '2.99.12';
  const includeAttachedEffectLoss = version === '2.99.11' || seatOwnedWebMenu;
  const includeIndependentSupportReactions = version === '2.99.10' || includeAttachedEffectLoss;
  const includeBombardCreatorLoss = version === '2.99.9' || includeIndependentSupportReactions;
  const includeStormTokenMatchCleanup = version === '2.99.8' || includeBombardCreatorLoss;
  const creatorTokenLifecycle = version === '2.99.7' || includeStormTokenMatchCleanup;
  const hostDerivedGapInputs = version === '2.99.6' || creatorTokenLifecycle;
  const includeRemainingFaqClarifications = version === '2.99.5' || hostDerivedGapInputs;
  const includeFaqHoldStatusExpiry = version === '2.99.4' || includeRemainingFaqClarifications;
  const includeDestroyedRavenShrapnel = version === '2.99.3' || includeFaqHoldStatusExpiry;
  const useReleaseWideAbilityPhases = version === '2.99.2' || includeDestroyedRavenShrapnel;
  const reportEffectiveAbilityRange = version === '2.99.1' || useReleaseWideAbilityPhases;
  const includeProtossSupport = version === '2.99.0' || reportEffectiveAbilityRange;
  const includeRedirectSelection = version === '2.98.0' || includeProtossSupport;
  const includeArtanisStand = version === '2.97.0' || includeRedirectSelection;
  const includeDroneGliding = version === '2.96.0' || includeArtanisStand;
  const includeTerranSupportCards = version === '2.95.0' || includeDroneGliding;
  const includeSupportWeapons = version === '2.94.0' || includeTerranSupportCards;
  const includeTankCoordinatedStrike = version === '2.93.0' || includeSupportWeapons;
  const includeArtanisReactions = version === '2.92.0' || includeTankCoordinatedStrike;
  const includeInheritedReserveAndKhalai = version === '2.91.0' || includeArtanisReactions;
  const includeInheritedTerranInfantry = version === '2.90.0' || includeInheritedReserveAndKhalai;
  const includeStandaloneFreedomFighters = version === '2.89.0' || includeInheritedTerranInfantry;
  const includeSelectedReserveAmbush = version === '2.88.0' || includeStandaloneFreedomFighters;
  const includeLungeAxisLeaderBound = version === '2.87.0' || includeSelectedReserveAmbush;
  const includeHighGroundFinalPlacement = version === '2.86.0' || includeLungeAxisLeaderBound;
  const includeMixedRosterReactions = version === '2.85.0' || includeHighGroundFinalPlacement;
  const includeAdept = version === '2.84.0' || includeMixedRosterReactions;
  const includeImmortal = version === '2.83.0' || includeAdept;
  const includeVoidSeeker = version === '2.82.0' || includeImmortal;
  const includeNerazimSupport = version === '2.81.0' || includeVoidSeeker;
  const includeNerazimNative = version === '2.80.0' || includeNerazimSupport;
  const includeNerazimConcealment = version === '2.79.0' || includeNerazimNative;
  const includeZeratulCombat = version === '2.78.0' || includeNerazimConcealment;
  const includeZeratulMobility = version === '2.77.0' || includeZeratulCombat;
  const includeReleaseStorm = version === '2.76.0' || includeZeratulMobility;
  const includeTwilightTemplar = version === '2.75.0' || includeReleaseStorm;
  const includeKhassarEndActivationOverwatch = version === '2.74.0' || includeTwilightTemplar;
  const includeReleaseKhassar = version === '2.73.0' || includeKhassarEndActivationOverwatch;
  const includeSentryForceField = version === '2.72.0' || includeReleaseKhassar;
  const includeSentryRestoration = version === '2.71.0' || includeSentryForceField;
  const includeSentryGuardianShield = version === '2.70.0' || includeSentryRestoration;
  const includeTemplarCasteRefresh = version === '2.69.0' || includeSentryGuardianShield;
  const includeTassadarWalls = version === '2.68.0' || includeTemplarCasteRefresh;
  const includeTassadarSupport = version === '2.67.0' || includeTassadarWalls;
  const includeAncestralWisdom = version === '2.66.0' || includeTassadarSupport;
  const includeTemplarAbilityPayment = version === '2.65.0' || includeAncestralWisdom;
  const includeTemplarFarsight = version === '2.64.0' || includeTemplarAbilityPayment;
  const includeExplicitPhasePassHandoff = version === '2.63.0' || includeTemplarFarsight;
  const includeCreepMovementQueries = version === '2.62.0' || includeExplicitPhasePassHandoff;
  const excludeReserveUnitsFromSpatialAuras = version === '2.61.0' || includeCreepMovementQueries;
  const includeOmegaWormStructure = version === '2.60.0' || excludeReserveUnitsFromSpatialAuras;
  const includeCreepFootprintGeometry = version === '2.59.0' || includeOmegaWormStructure;
  const includeOmegaWormDetection = version === '2.58.0' || includeCreepFootprintGeometry;
  const includeOverseerChargeReaction = version === '2.57.0' || includeOmegaWormDetection;
  const includeLairPredation = version === '2.56.0' || includeOverseerChargeReaction;
  const includeSwarmDefenceCards = version === '2.55.0' || includeLairPredation;
  const includeInheritedSwarmUpgrades = version === '2.54.0' || includeSwarmDefenceCards;
  const includeMalignantCreep = version === '2.53.0' || includeInheritedSwarmUpgrades;
  const includeInheritedReserveAmbush = version === '2.52.0' || includeMalignantCreep;
  const includePlague = version === '2.51.0' || includeInheritedReserveAmbush;
  const includeReactiveCreep = version === '2.50.0' || includePlague;
  const includeDefilerMound = version === '2.49.0' || includeReactiveCreep;
  const includeDefilerBite = version === '2.48.0' || includeDefilerMound;
  const includeBombardPhysicalPlacement = version === '2.47.0' || includeDefilerBite;
  const includeBombard = version === '2.46.0' || includeBombardPhysicalPlacement;
  const includeBileLauncherPassives = version === '2.45.0' || includeBombard;
  const includeWave3SupportAmbush = version === '2.44.0' || includeBileLauncherPassives;
  const includeBilePhysicalPlacement = version === '2.43.0' || includeWave3SupportAmbush;
  const includeRavagerTunnel = version === '2.42.0' || includeBilePhysicalPlacement;
  const includeRavagerBile = version === '2.41.0' || includeRavagerTunnel;
  const includeRavagerImpact = version === '2.40.0' || includeRavagerBile;
  const includeZergTargetReactions = version === '2.39.0' || includeRavagerImpact;
  const includeZagaraArmyAbilities = version === '2.38.0' || includeZergTargetReactions;
  const includeZagaraCreep = version === '2.37.0' || includeZagaraArmyAbilities;
  const includeZagaraMeleeAndArmour = version === '2.36.0' || includeZagaraCreep;
  const includeNovaStealthShooting = version === '2.35.0' || includeZagaraMeleeAndArmour;
  const includeScheduledRemovalAction = version === '2.34.0' || includeNovaStealthShooting;
  const includeNovaHolo = version === '2.33.0' || includeScheduledRemovalAction;
  const includeNovaModes = version === '2.32.0' || includeNovaHolo;
  const exclusiveRangedContinuation = version === '2.31.0' || includeNovaModes;
  const includeNovaShared = version === '2.30.0' || exclusiveRangedContinuation;
  const includeRavenSeeker = version === '2.29.0' || includeNovaShared;
  const includeRaven = version === '2.28.0' || includeRavenSeeker;
  const includeRaynorFactionCards = version === '2.27.0' || includeRaven;
  const includeSiegeTankCoverage = version === '2.26.0' || includeRaynorFactionCards;
  const includeZergSwarmBroodInstinct = version === '2.25.0' || includeSiegeTankCoverage;
  const includeZergSwarmBurrow = version === '2.24.0' || includeZergSwarmBroodInstinct;
  return { includeCocoonMorph: version === '2.23.0' || includeZergSwarmBurrow,
    includeZergSwarmBurrow, includeZergSwarmBroodInstinct, includeSiegeTankCoverage, includeRaynorFactionCards, includeRaven, includeRavenSeeker, includeNovaShared, includeNovaModes, includeNovaHolo, includeScheduledRemovalAction, includeNovaStealthShooting, includeZagaraMeleeAndArmour, includeZagaraCreep, includeZagaraArmyAbilities, includeZergTargetReactions, includeRavagerImpact, includeRavagerBile, includeRavagerTunnel, includeBilePhysicalPlacement, includeWave3SupportAmbush, includeBileLauncherPassives, includeBombard, includeBombardPhysicalPlacement, ...(includeDefilerBite ? { includeDefilerBite, includeSignedRampSight: true } : {}),
    ...(includeDefilerMound ? { includeDefilerMound } : {}), ...(includeReactiveCreep ? { includeReactiveCreep } : {}),
    ...(includePlague ? { includePlague } : {}),
    ...(includeInheritedReserveAmbush ? { includeInheritedReserveAmbush } : {}),
    ...(includeSelectedReserveAmbush ? { includeSelectedReserveAmbush } : {}),
    ...(includeStandaloneFreedomFighters ? { includeStandaloneFreedomFighters } : {}),
    ...(includeInheritedTerranInfantry ? { includeInheritedTerranInfantry } : {}),
    ...(includeInheritedReserveAndKhalai ? { includeInheritedReserveAndKhalai } : {}),
    ...(includeArtanisReactions ? { includeArtanisReactions } : {}),
    ...(includeTankCoordinatedStrike ? { includeTankCoordinatedStrike } : {}),
    ...(includeSupportWeapons ? { includeSupportWeapons } : {}),
    ...(includeTerranSupportCards ? { includeTerranSupportCards } : {}),
    ...(includeDroneGliding ? { includeDroneGliding } : {}),
    ...(includeArtanisStand ? { includeArtanisStand } : {}),
    ...(includeRedirectSelection ? { includeRedirectSelection } : {}),
    ...(includeProtossSupport ? { includeProtossSupport } : {}),
    ...(reportEffectiveAbilityRange ? { reportEffectiveAbilityRange } : {}),
    ...(useReleaseWideAbilityPhases ? { useReleaseWideAbilityPhases } : {}),
    ...(includeDestroyedRavenShrapnel ? { includeDestroyedRavenShrapnel } : {}),
    ...(includeFaqHoldStatusExpiry ? { includeFaqHoldStatusExpiry } : {}),
    ...(includeRemainingFaqClarifications ? { includeRemainingFaqClarifications } : {}),
    ...(hostDerivedGapInputs ? { hostDerivedGapInputs } : {}),
    ...(creatorTokenLifecycle ? { creatorTokenLifecycle } : {}),
    ...(includeStormTokenMatchCleanup ? { includeStormTokenMatchCleanup } : {}),
    ...(includeBombardCreatorLoss ? { includeBombardCreatorLoss } : {}),
    ...(includeIndependentSupportReactions ? { includeIndependentSupportReactions } : {}),
    ...(includeAttachedEffectLoss ? { includeAttachedEffectLoss } : {}),
    ...(seatOwnedWebMenu ? { seatOwnedWebMenu } : {}),
    ...(includeMalignantCreep ? { includeMalignantCreep, includeReleaseInheritedHitsReactions: true } : {}),
    ...(includeInheritedSwarmUpgrades ? { includeInheritedSwarmUpgrades } : {}),
    ...(includeSwarmDefenceCards ? { includeSwarmDefenceCards } : {}),
    ...(includeLairPredation ? { includeLairPredation } : {}),
    ...(includeOverseerChargeReaction ? { includeOverseerChargeReaction } : {}),
    ...(includeOmegaWormDetection ? { includeOmegaWormDetection } : {}),
    ...(includeCreepFootprintGeometry ? { includeCreepFootprintGeometry, includeIndependentRangedLungeOwner: true } : {}),
    ...(includeOmegaWormStructure ? { includeOmegaWormStructure } : {}),
    ...(excludeReserveUnitsFromSpatialAuras ? { excludeReserveUnitsFromSpatialAuras } : {}),
    ...(includeCreepMovementQueries ? { includeCreepMovementQueries } : {}),
    ...(includeExplicitPhasePassHandoff ? { includeExplicitPhasePassHandoff } : {}),
    ...(includeTemplarFarsight ? { includeTemplarFarsight } : {}),
    ...(includeTemplarAbilityPayment ? { includeTemplarAbilityPayment } : {}),
    ...(includeAdept ? { includeAdept } : {}),
    ...(includeMixedRosterReactions ? { includeMixedRosterReactions } : {}),
    ...(includeHighGroundFinalPlacement ? { includeHighGroundFinalPlacement } : {}),
    ...(includeLungeAxisLeaderBound ? { includeLungeAxisLeaderBound } : {}),
    ...(includeImmortal ? { includeImmortal } : {}),
    ...(includeVoidSeeker ? { includeVoidSeeker } : {}),
    ...(includeNerazimSupport ? { includeNerazimSupport } : {}),
    ...(includeNerazimNative ? { includeNerazimNative } : {}),
    ...(includeNerazimConcealment ? { includeNerazimConcealment } : {}),
    ...(includeZeratulCombat ? { includeZeratulCombat } : {}),
    ...(includeZeratulMobility ? { includeZeratulMobility } : {}),
    ...(includeReleaseStorm ? { includeReleaseStorm } : {}),
    ...(includeTwilightTemplar ? { includeTwilightTemplar } : {}),
    ...(includeKhassarEndActivationOverwatch ? { includeKhassarEndActivationOverwatch } : {}),
    ...(includeReleaseKhassar ? { includeReleaseKhassar } : {}),
    ...(includeSentryForceField ? { includeSentryForceField } : {}),
    ...(includeSentryRestoration ? { includeSentryRestoration } : {}),
    ...(includeSentryGuardianShield ? { includeSentryGuardianShield } : {}),
    ...(includeTemplarCasteRefresh ? { includeTemplarCasteRefresh } : {}),
    ...(includeTassadarWalls ? { includeTassadarWalls } : {}),
    ...(includeTassadarSupport ? { includeTassadarSupport } : {}),
    ...(includeAncestralWisdom ? { includeAncestralWisdom, bindEmptyActivationSource: true } : {}), exclusiveRangedContinuation };
}

function resolveRoomAbilityOptions(overrides) {
  const options = { ...currentAbilityOptions };
  for (const [key, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(options, key)) throw Error('OFFICIAL_RELEASE_ROOM_OPTION_UNKNOWN:' + key);
    if (value !== undefined) options[key] = value;
  }
  return options;
}

export function inspectOfficialReleaseRoomRosterCoverageV2({ context, state, releaseMatchVersion }) {
  const options = resolveRoomAbilityOptions(officialReleaseRosterIncrementOptionsV2(releaseMatchVersion));
  return createOfficialReleaseRoomAbilityRuntimeV2({ ...options, context, state,
    ...(options.includeReleaseKhassar ? { composeSelectedNative: (prepared, weapons, selected) =>
      buildReleaseNativeActions(context, prepared, weapons, options, selected) } : {}),
  }).coverage;
}

export function prepareOfficialReleaseRoomNativeActionsV2({ context, state, includeReleasePhaseControl = false,
  includeReleaseQueenPsionicLink = true, includeReleaseMissionOpening = true,
  includeLungeJointObstacleProof = false, ...abilityOptions }) {
  const options = resolveRoomAbilityOptions(abilityOptions);
  // A signed release opening must start its mission before either player moves.
  const openingState = includeReleaseMissionOpening && state?.phase === 'setup'
    ? prepareOfficialCurrentProductFirstRoundV1(state) : state;
  const settings = { includeReleasePhaseControl, includeReleaseQueenPsionicLink, includeLungeJointObstacleProof };
  const assembly = prepareOfficialReleaseRoomAbilityAssemblyV2({ ...options, context, state: openingState,
    ...(options.includeReleaseKhassar ? { composeSelectedNative: (prepared, weapons, selected) =>
      buildReleaseNativeActions(context, prepared, weapons, options, { ...settings, ...selected }) } : {}),
  });
  const weaponDefinitionIds = assembly.catalogue.definitions.filter(row => row.phase === 'assault'
    && row.activationKind === 'weapon' && row.execution.adapterId === weaponComponentAdapterId).map(row => row.definitionId);
  const prepared = assembly.composedNative ?? buildReleaseNativeActions(context, assembly.state, weaponDefinitionIds, options, settings);
  const registered = new Map(prepared.nativeActions.catalogue.definitions.map(row => [row.definitionId, row.execution.status]));
  const pendingNativeDefinitionIds = assembly.coverage.definitions
    .filter(row => registered.get(row.definitionId) !== 'executable_exact').map(row => row.definitionId);
  return Object.freeze({ ...prepared, abilityRuntime: assembly.runtime, openingRosterCoverage: assembly.coverage,
    pendingNativeDefinitionIds: Object.freeze(pendingNativeDefinitionIds), releaseId: context.manifest.releaseId,
    releaseManifestHash: context.manifest.manifestHash, fullMatchAdmitted: false });
}

function buildReleaseNativeActions(context, state, weaponDefinitionIds, options, { khassar = false, stormIds = [],
  includeReleasePhaseControl = false, includeReleaseQueenPsionicLink = true, includeLungeJointObstacleProof = false }) {
  const spatialState = { ...state, officialModelGapTransitPolicy: OFFICIAL_PHYSICAL_GAP_TRANSIT_POLICY_V13 };
  if (options.hostDerivedGapInputs) spatialState.officialHostDerivedGapInputs = true;
  if (options.creatorTokenLifecycle) spatialState.officialCreatorTokenLifecycle = true;
  if (options.includeRemainingFaqClarifications) {
    const faqHash = context.manifest.source.references.faq?.byteHash;
    if (faqHash !== WAVE3_FAQ_V13_BYTE_HASH) throw Error('WAVE3_FAQ_V13_SOURCE_REQUIRED');
    spatialState.officialWave3FaqClarificationsHash = faqHash;
  }
  if (options.includeExplicitPhasePassHandoff) spatialState.officialPhasePassHandoff = OFFICIAL_EXPLICIT_PHASE_PASS_HANDOFF_V1;
  if (options.excludeReserveUnitsFromSpatialAuras) spatialState.officialSpatialAuraScope = 'battlefield_only_v1';
  if (options.includeSignedRampSight) spatialState.officialReleaseRangedSightProjection = 'signed_compound_ramp_v1';
  const statusRoutes = spatialState.officialCharacteristicStatusFamilySourceBundle?.routes ?? [];
  if (options.includeFaqHoldStatusExpiry && (spatialState.officialActionStatusLifecyclePolicy
    || statusRoutes.some(route => route.expiresAt === 'action_performed'))) {
    if (context.manifest.source.references.faq?.byteHash !== OFFICIAL_HOLD_ACTION_FAQ_V13.byteHash) {
      throw Error('HOLD_ACTION_STATUS_FAQ_REQUIRED');
    }
    spatialState.officialActionStatusLifecyclePolicy ??= OFFICIAL_ACTION_STATUS_LIFECYCLE_POLICY_V3;
    spatialState.officialHoldActionFaq = OFFICIAL_HOLD_ACTION_FAQ_V13.entry;
  }
  const definitionIds = spatialState.officialCharacteristicStatusFamilySourceBundle?.definitionIds || [];
  if (options.includeDestroyedRavenShrapnel && definitionIds.includes(OFFICIAL_RAVEN_SHRAPNEL_SHELLS_DEFINITION_ID)) {
    if (context.manifest.source.references.faq?.byteHash !== OFFICIAL_RAVEN_DESTROYED_SOURCE_FAQ_V13.byteHash) {
      throw Error('RAVEN_DESTROYED_SOURCE_FAQ_REQUIRED');
    }
    spatialState.officialRavenDestroyedSourceFaq = OFFICIAL_RAVEN_DESTROYED_SOURCE_FAQ_V13.entry;
  }
  const lunge = options.includeInheritedLunge
    && spatialState.officialReactionFamilySourceBundle?.definitionIds.includes(OFFICIAL_HYDRALISK_LUNGE_DEFINITION_ID) === true;
  const broodInstinct = options.includeZergSwarmBroodInstinct
    && spatialState.officialReactionFamilySourceBundle?.definitionIds.includes(OFFICIAL_BROOD_INSTINCT_DEFINITION_ID) === true;
  const weaponTemplateGeometry = Boolean(spatialState.officialBlastTemplateGeometryAsset)
    && (!spatialState.officialPlagueResolutionPolicy || Boolean(spatialState.officialSiegeModeDataBundle));
  const tankTemplate = options.includeSiegeTankCoverage && weaponTemplateGeometry;
  const template = (broodInstinct || tankTemplate) && weaponTemplateGeometry;
  const evolutionCarapace = options.includeSwarmDefenceCards
    && spatialState.officialReactionFamilySourceBundle?.definitionIds.includes(OFFICIAL_EVOLUTION_CARAPACE_ID);
  const tankDefence = options.includeSiegeTankCoverage && spatialState.officialCharacteristicStatusFamilySourceBundle?.routes
    .some(route => route.effectKind === 'conditional_tough' || (route.effectKind === 'first_weapon_keyword'
      && route.definitionId === 'card:factory__tech_lab_/pound-em-flat-any@1')) === true;
  const broodHits = broodInstinct && spatialState.officialCharacteristicStatusFamilySourceBundle?.routes
    .some(route => route.effectKind === 'automatic_hits_engaged') === true;
  const pointDefense = options.includeRaynorFactionCards && spatialState.officialUnitLifecycleFamilySourceBundle
    ?.generatedRangedDefinitionIds?.includes(OFFICIAL_POINT_DEFENSE_LASER_DEFINITION_ID) === true;
  const vision = options.includeNerazimSupport && spatialState.officialReactionFamilySourceBundle?.routes
    .some(route => route.effectKind === 'fixed_evade_characteristic');
  const plasma = options.includeNerazimSupport && spatialState.officialReactionFamilySourceBundle?.definitionIds
    .includes('card:robotics_facility/plasma-shields-any@1');
  const immortal = options.includeImmortal && spatialState.pieces.some(piece => piece.officialUnitRecordKey === 'army_units:immortal');
  const barrier = immortal && spatialState.officialReactionFamilySourceBundle?.definitionIds.includes('unit:immortal/improved-barrier-any-phase@1');
  const shieldOvercharge = immortal && spatialState.officialReactionFamilySourceBundle?.definitionIds.includes('unit:immortal/shield-overcharge-any-phase@1');
  const supportArmour = options.includeTerranSupportCards && spatialState.officialReactionFamilySourceBundle?.routes.some(
    route => route.triggerKind === 'before_armour_roll');
  const photonEntry = options.includeProtossSupport && spatialState.officialReactionFamilySourceBundle?.routes.some(r=>r.effectKind==='reserve_entry_hits');
  const hallucination = options.includeProtossSupport && spatialState.officialReactionFamilySourceBundle?.routes.some(r=>r.rangedDeclarationOnly);
  const gatewayPrecision = options.includeNerazimSupport && definitionIds.includes('card:gateway/quick-strikes-any@1')
    || options.includeProtossSupport && definitionIds.some(id => ['card:gate_chronoboosted/quick-strikes-any@1',
      'card:warp_gate/quick-strikes-any@1','unit:zealot/we-stand-as-one-combat-phase@1'].includes(id));
  const shadowStrike = options.includeNerazimNative && definitionIds.includes('unit:zeratul/shadow-strike-combat-phase@1');
  const ravenSeeker = options.includeRavenSeeker && definitionIds.includes(OFFICIAL_RAVEN_SEEKER_MISSILE_DEFINITION_ID);
  const ravenOverwatch = options.includeRaven && Boolean(spatialState.officialUnitRoundEndSourceBundle);
  const griffinSupport = options.includeNovaShared && Boolean(spatialState.officialSabotageDronePhaseEndPolicy);
  const novaWeapons = options.includeNovaShared && (griffinSupport || spatialState.pieces.some(piece => piece.officialUnitRecordKey === 'army_units:spec_ops_marauder__marauder_'));
  const infantryPrecision = options.includeInheritedTerranInfantry && spatialState.officialCharacteristicStatusFamilySourceBundle?.routes
    .some(route => route.abilityName === 'Stimpack' && route.effectKind === 'stimpack');
  const zagaraArmyCombat = options.includeZagaraArmyAbilities && spatialState.officialCharacteristicStatusFamilySourceBundle?.routes
    .some(route => route.effectKind === 'broodmother_army_buff' || route.effectKind === 'scourge_queen');
  const zergTargetReactions = options.includeZergTargetReactions && spatialState.officialReactionFamilySourceBundle?.routes
    .some(route => route.meleeDeclarationOnly || route.requiresSharedFriendlyDarkSwarmToken);
  const ravagerBile = options.includeRavagerBile && Boolean(spatialState.officialCorrosiveBileDamagePolicy);
  const bileBomb = options.includeBileLauncherPassives && weaponDefinitionIds.includes('unit:bile_launcher/bile-bomb-assault-phase@1');
  const storm = stormIds.length > 0;
  const stormSharedOrder = storm && (ravenSeeker || griffinSupport || ravagerBile || spatialState.officialPoisonousEssencePolicy);
  const nativeActions = createOfficialCharacteristicStatusComponentRuntimeV2({
    includeStandaloneFreedomFighters: options.includeStandaloneFreedomFighters,
    context, spatialState, definitionIds, weaponDefinitionIds, exclusiveRangedContinuation: options.exclusiveRangedContinuation, includeMelee: true, includeRanged: true, includeReleaseRosterActions: true,
    ...(storm ? { selectedStormDefinitionIds: stormIds, includePsionicStormSourceRules: true,
      includePsionicStormGeometryEvidence: true, includePsionicStormPhaseEnd: true, includePsionicStormPhaseEndDefence: true,
      includePsionicStormAssaultDamage: true, includePsionicStormAssaultOrder: true, includePsionicStormMovementPass: true,
      includePsionicStormEquivalentNameOverlap: true, includePsionicStormNamedOverlapChoices: true,
      includePsionicStormAssaultSameName: true, includePsionicStormCast: true, includePsionicStormTokenCleanup: true,
      includeSharedAssaultEffectOrder: Boolean(stormSharedOrder), includeAdditionalAssaultEffectOrder: Boolean(stormSharedOrder),
    } : {}),
    ...(khassar ? { includeReleaseKhassar: true, includeKhassarRegisteredExecution: true, includeKhassarFight: true,
      includeKhassarEndActivationOverwatch: options.includeKhassarEndActivationOverwatch,
      includeKhassarSupplyLoss: options.includeTwilightTemplar,
      includeKhassarChargeDeclaration: spatialState.officialReactionFamilySourceBundle?.routes.some(
        route => route.chargeDeclarationOwner === 'current_source_v1'),
      includeKhassarTargetReactions: Boolean(zergTargetReactions || barrier),
      includeKhassarArmourReactions: Boolean(evolutionCarapace || barrier || shieldOvercharge),
      includeKhassarDamageReactions: spatialState.officialReactionFamilySourceBundle?.definitionIds.some(id =>
        id === 'unit:zagara/transfusion-any-phase@1' || options.includeMixedRosterReactions && id === 'unit:medic/life-support-any-phase@1'),
    } : {}),
    includeReleaseSentryGuardianShield: options.includeSentryGuardianShield,
    includeReleaseOpticalFlareRestoration: options.includeSentryRestoration,
    includeReleasePhaseControl, includeReleaseBeaconLifecycle: options.includeInheritedVentralSacs, includeReleaseQueenPsionicLink,
    includeReleaseQueenDomineering: options.includeQueenDomineering, includeReleaseLairPredation: options.includeLairPredation,
    includeReleaseOverseerChargeReaction: options.includeOverseerChargeReaction,
    includeIndependentRangedLungeOwner: options.includeIndependentRangedLungeOwner,
    includeArmourOrdinals: options.includeInheritedCharacteristics && Boolean(spatialState.officialArmourRollOrdinalPolicy),
    ...(zergTargetReactions ? { includeTargetReactions: true, includeArmourReactions: true, includeReleaseZergTargetReactions: true } : {}),
    ...(pointDefense ? { includePointDefenseChoices: true } : {}),
    ...(vision || barrier || hallucination ? { includeTargetReactions: true } : {}),
    ...(supportArmour || hallucination || evolutionCarapace || plasma || vision || barrier || shieldOvercharge ? { includeArmourReactions: true } : {}),
    ...(supportArmour || hallucination || immortal || plasma || vision || gatewayPrecision || evolutionCarapace || broodInstinct || tankTemplate || tankDefence || pointDefense || ravenOverwatch || novaWeapons || infantryPrecision || zagaraArmyCombat || zergTargetReactions || bileBomb ? { includePrecisionChoices: true, includeArmourChoices: true } : {}),
    ...(broodInstinct ? { includeBeforeRangedEvadeReaction: true, includeBeforeMeleeEvadeReaction: true } : {}),
    ...(template ? { includeTemplateAttacks: true, includeTemplateBatchOrder: true,
      includeBeforeTemplateEvadeReaction: broodInstinct } : {}),
    ...(griffinSupport || shadowStrike || photonEntry ? { includeHits: true } : {}),
    includeReleaseInheritedHitsReactions: options.includeReleaseInheritedHitsReactions,
    includeMixedRosterReactions: options.includeMixedRosterReactions,
    includeIndependentSupportReactions: options.includeIndependentSupportReactions,
    ...(options.includeReactiveCreep && spatialState.officialBattlefieldAssetFamilySourceBundle?.routes.some(route => route.recordKey === 'tactical_cards:reactive_creep') ? { includeReleaseReactiveCreep: true } : {}),
    ...(options.includeMalignantCreep && spatialState.officialBattlefieldAssetFamilySourceBundle?.routes.some(route => route.recordKey === 'tactical_cards:malignant_creep') ? { includeReleaseMalignantCreep: true } : {}),
    ...(options.includeDefilerMound && spatialState.officialPoisonousEssencePolicy ? { includeReleaseMoundAssaultOrder: !storm } : {}),
    ...(ravagerBile ? { includeHits: true, includeReleaseBileAssaultOrder: !storm,
      includeBilePhysicalPlacement: options.includeBilePhysicalPlacement } : {}),
    ...(ravenSeeker ? { includeRavenSeekerMissileRules: true, includeRavenSeekerPaidImpact: true, includeRavenSeekerPhaseEnd: true, includeHits: true } : {}),
    ...(broodHits || (broodInstinct && (ravenSeeker || griffinSupport || ravagerBile || storm)) ? { includeHits: true, includeBeforeHitsEvadeReaction: true,
      includeAutomaticHitsDefenceContinuation: true } : {}),
    ...(lunge && ravenOverwatch ? { includeLungeOverwatchContinuation: true } : {}),
    ...(lunge ? { includeLungeDirectContinuation: true, includeLungeDeferredReaction: true,
      includeLungeCertifiedFormation: true, includeLungeCertifiedForwardDetour: true,
      includeLungeCertifiedMultiModelDetour: true, includeLungeCertifiedLeaderWitness: true, includeLungeJointObstacleProof,
      includeLungeAxisLeaderBound: options.includeLungeAxisLeaderBound } : {}),
  });
  return Object.freeze({ state: spatialState, nativeActions });
}
