// The same command Interface is exposed by the compiler and local edit role.
// Historical failure snapshots remain unchanged; they do not freeze a repaired
// executable Interface forever. This module contains no source/option choice.
export const ROSTER_FORMATION_SELECTOR_COMMAND_INTERFACE_V1=Object.freeze({
  argumentLocation:'step.argumentsJson.selections',selectionBindingsAllowed:false,
  savedSource:{sourceEvidenceNumber:'positive integer from the existing evidence directory',optionIndex:'your explicit zero-based integer choice'},
  precedingStepSource:{fromStepId:'exact earlier solver step ID in this work order',optionIndex:'your explicit zero-based integer choice'},
  instruction:'Serialize {selections:[one or more explicit selector objects]} as argumentsJson. These are commands, NOT fields to read from the solver. Do not bind /selection, /selections, or their children. A complete canonicalPlacement is not a selector. Leave bindings empty unless unrelated dynamic inputs actually require bindings. The Host neither chooses an option nor converts your publicReason into a selection.'
});
