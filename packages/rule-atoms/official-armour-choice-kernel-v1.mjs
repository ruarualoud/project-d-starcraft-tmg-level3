// Shared deterministic Armour facts. Native owns the rolls and Source owns the
// threshold/grant; a player chooses only indices of actual failed results.
export function inspectOfficialArmourChoiceV1({ rolls, threshold, tough }) {
  if (!Array.isArray(rolls) || rolls.some(value => !Number.isSafeInteger(value) || value < 1 || value > 6)
    || !Number.isSafeInteger(threshold) || threshold < 2 || threshold > 6
    || !Number.isSafeInteger(tough) || tough < 0) throw Error('ARMOUR_CHOICE_FACTS_INVALID');
  const failedDieIndices = rolls.flatMap((roll, index) =>
    roll === 1 || roll !== 6 && roll < threshold ? [index] : []);
  return Object.freeze({ originalSaves: rolls.length - failedDieIndices.length,
    failedDieIndices: Object.freeze(failedDieIndices), toughValue: tough,
    maximumConvertedDice: Math.min(tough, failedDieIndices.length) });
}

export function resolveOfficialArmourChoiceV1({ rolls, threshold, tough, convertedFailedDieIndices }) {
  const facts = inspectOfficialArmourChoiceV1({ rolls, threshold, tough });
  const selected = convertedFailedDieIndices;
  if (!Array.isArray(selected) || selected.length > facts.maximumConvertedDice
    || new Set(selected).size !== selected.length
    || selected.some(index => !Number.isSafeInteger(index) || !facts.failedDieIndices.includes(index))) {
    throw Error('ARMOUR_SELECTION_INVALID');
  }
  return Object.freeze({ saves: facts.originalSaves + selected.length,
    originalSaves: facts.originalSaves, failedDieIndices: facts.failedDieIndices,
    convertedFailedDieIndices: Object.freeze([...selected].sort((a, b) => a - b)), toughValue: tough });
}
