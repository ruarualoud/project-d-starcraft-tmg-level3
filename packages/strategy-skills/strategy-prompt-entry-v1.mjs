import {clone} from '../skill-production/common.mjs';
// Shared exact projection used by live prompts and offline delivery evidence.
export function compactStrategyEntry(entry) {
  const fields = [
    "axis", "title", "when", "objective", "steps", "procedure",
    "alternatives", "opponentBranches", "risk", "reviseIf",
    "requiredQueries",
  ];
  return Object.fromEntries(fields.filter((field) => entry?.[field] !== undefined)
    .map((field) => [field, clone(entry[field])]));
}
