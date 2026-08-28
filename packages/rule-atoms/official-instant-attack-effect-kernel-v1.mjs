import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const OFFICIAL_INSTANT_ATTACK_EFFECT_KERNEL_ID =
  "authority.instant-attack-effect-kernel-v1";
export const OFFICIAL_INSTANT_ATTACK_EFFECT_KERNEL_VERSION = "1.0.0";
export const OFFICIAL_INSTANT_ATTACK_EFFECT_ATOM_ID = "attack-effect:instant-v1";

const CORE_RULE_CONTENT_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function instantEffect(profile) {
  if (!object(profile)
    || profile.schema !== "starcraft_tmg_official_attack_profile_v2"
    || profile.profileHash !== hashStarcraftTmgContract(without(profile, ["profileHash"]))
    || !Array.isArray(profile.effects)
    || profile.canAffectRules !== false
    || profile.trainingTruth !== false) {
    fail("INSTANT_EFFECT_PROFILE_INVALID");
  }
  const effects = profile.effects.filter((entry) => (
    entry.effectAtomId === OFFICIAL_INSTANT_ATTACK_EFFECT_ATOM_ID
  ));
  if (effects.length === 0) fail("INSTANT_EFFECT_REQUIRED");
  if (effects.length !== 1
    || effects[0].sourceKind !== "weapon_keyword"
    || !object(effects[0].parameters)
    || Object.keys(effects[0].parameters).length !== 0) {
    fail("INSTANT_EFFECT_PROFILE_INVALID");
  }
  return effects[0];
}

function plan(input = {}) {
  const profile = input.profile;
  instantEffect(profile);
  const body = {
    schema: "starcraft_tmg_official_instant_attack_effect_plan_v1",
    kernelId: OFFICIAL_INSTANT_ATTACK_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_INSTANT_ATTACK_EFFECT_KERNEL_VERSION,
    effectAtomId: OFFICIAL_INSTANT_ATTACK_EFFECT_ATOM_ID,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    enemyReactionDeclarationAllowed: false,
    enemyReactionResolutionAllowed: false,
    appliesOnlyInResponseToThisAttack: true,
    timing: "from_attack_declaration_through_attack_completion",
    sourceRuleText:
      "Enemy Units cannot declare or resolve Reaction abilities in response to attacks made with this weapon.",
    sourceRuleTextHash:
      "553b151fdb23ffffc94091bededce1faa82f926dbed0a37ceb4e0340df625f99",
    coreRuleContentHash: CORE_RULE_CONTENT_HASH,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

function verify(planValue) {
  if (!object(planValue)
    || planValue.schema !== "starcraft_tmg_official_instant_attack_effect_plan_v1"
    || planValue.kernelId !== OFFICIAL_INSTANT_ATTACK_EFFECT_KERNEL_ID
    || planValue.kernelVersion !== OFFICIAL_INSTANT_ATTACK_EFFECT_KERNEL_VERSION
    || planValue.effectAtomId !== OFFICIAL_INSTANT_ATTACK_EFFECT_ATOM_ID
    || planValue.enemyReactionDeclarationAllowed !== false
    || planValue.enemyReactionResolutionAllowed !== false
    || planValue.appliesOnlyInResponseToThisAttack !== true
    || planValue.coreRuleContentHash !== CORE_RULE_CONTENT_HASH
    || planValue.trainingTruth !== false
    || planValue.planHash
      !== hashStarcraftTmgContract(without(planValue, ["planHash"]))) {
    fail("INSTANT_EFFECT_PLAN_INVALID");
  }
  return planValue;
}

export function createOfficialInstantAttackEffectKernelV1() {
  const descriptorBody = {
    schema: "starcraft_tmg_official_instant_attack_effect_kernel_descriptor_v1",
    kernelId: OFFICIAL_INSTANT_ATTACK_EFFECT_KERNEL_ID,
    kernelVersion: OFFICIAL_INSTANT_ATTACK_EFFECT_KERNEL_VERSION,
    effectAtomId: OFFICIAL_INSTANT_ATTACK_EFFECT_ATOM_ID,
    sourceRuleTextHash:
      "553b151fdb23ffffc94091bededce1faa82f926dbed0a37ceb4e0340df625f99",
    coreRuleContentHash: CORE_RULE_CONTENT_HASH,
    reactionPolicy: {
      enemyDeclarationAllowed: false,
      enemyResolutionAllowed: false,
      scope: "this_attack_only",
    },
    unknownEffectPolicy: "fail_closed",
    trainingTruth: false,
  };
  const descriptor = freezeDeep({
    ...descriptorBody,
    kernelHash: hashStarcraftTmgContract(descriptorBody),
  });
  return freezeDeep({ descriptor, plan, verify });
}
