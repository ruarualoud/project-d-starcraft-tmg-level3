// Old experiences may be inspected under any release. Only label their sources
// as current when the recorded dependencies and the target manifest agree.
export const rosterExperienceFactKeysV1 = Object.freeze(['army', 'rules', 'map', 'source']);

export function rosterExperienceApplicabilityV1(source = {}, target = {}, keys = Object.keys(source)) {
  const dependencies = new Set(keys);
  if (Object.hasOwn(source, 'releaseManifest') || Object.hasOwn(target, 'releaseManifest')) {
    dependencies.add('releaseManifest');
  }
  const bindingDifferences = [...dependencies].filter(key =>
    !Object.hasOwn(source, key) || !Object.hasOwn(target, key) ||
    source[key] == null || source[key] !== target[key] || source[key] === '');
  return {sourceBindingsMatchCurrent: bindingDifferences.length === 0, bindingDifferences};
}
