import { OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1 } from
  '../packages/product-composition/official-standard-room-factory-v1.mjs';

// Public benchmark assumptions, NOT an observed enemy list or a strategic
// optimum. The normal product Rules factory must audit every recipe before
// any model request. Never replace the planning Agent's own candidate with one.
export const ROSTER_PLAN_EXPERIMENT_MATRIX_V274 = 'roster-plan-matrix-v274';
const clone = value => structuredClone(value);
const rebind = (recipe, from, to) => ({ ...clone(recipe), units: recipe.units.map(
  unit => ({ ...clone(unit), unitInstanceId: unit.unitInstanceId.replace(from, to) })) });

export function rosterPlanExperimentGroupV274(arm) {
  if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(arm)) throw Error('UNKNOWN_PLANNING_EXPERIMENT_ARM');
  const recipes = clone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
  if (arm === 'C') {
    recipes.player2.factionRecordKey = 'tactical_cards:zerg_swarm';
    recipes.player2.units = recipes.player2.units.map(unit =>
      unit.recordKey === 'army_units:kerrigan_swarm_raptor__zergling_'
        ? { unitInstanceId: 'player2-zergling', recordKey: 'army_units:zergling',
          compositionKind: 'large', upgradeNames: ['Adrenal Glands', 'Shredding Claws'] }
        : unit);
  }
  if (arm === 'D') {
    recipes.player2 = {
      factionRecordKey: 'tactical_cards:daelaam',
      tacticalCardRecordKeys: ['power_field', 'gate_chronoboosted', 'twilight_council', 'warp_gate']
        .map(key => `tactical_cards:${key}`),
      units: [
        ['artanis', 'small', []],
        ...Array.from({ length: 2 }, () => ['stalker', 'large', ['Path of Shadows']]),
        ...Array.from({ length: 2 }, () => ['zealot', 'small', ['Leg Enhancements']]),
        ...Array.from({ length: 3 }, () => ['adept', 'small', ['Resonating Glaives']]),
        ...Array.from({ length: 2 }, () => ['sentry', 'small', []]),
      ].map(([key, compositionKind, upgradeNames], index) => ({
        unitInstanceId: `player2-${key}-${index + 1}`, recordKey: `army_units:${key}`,
        compositionKind, upgradeNames,
      })),
    };
  }
  if (arm === 'F') {
    recipes.player1 = rebind(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2, 'player2', 'player1');
    recipes.player2 = rebind(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1, 'player1', 'player2');
  }
  return {
    matrixId: ROSTER_PLAN_EXPERIMENT_MATRIX_V274, arm,
    mode: arm === 'A' ? 'fixed_roster_plan_teach' : 'fresh_roster_plan_coevolution',
    sideKey: 'player1', engagementScale: 'Standard', mineralBudget: 2000,
    factionRecordKey: recipes.player1.factionRecordKey,
    opponentFactionRecordKey: recipes.player2.factionRecordKey,
    referenceArmyRecipes: recipes,
    referenceRole: 'public_reference_not_observed_enemy_roster',
    mapRole: arm === 'E' ? 'accepted_alternate_topology_required' : 'same_as_baseline_B',
    battleLaunchAuthorized: false,
  };
}
