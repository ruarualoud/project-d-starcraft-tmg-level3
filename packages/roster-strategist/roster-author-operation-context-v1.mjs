// The question ledger is delivered separately. Preserve the rest of the last
// authored operation as unapproved context across both author command formats.
export function projectRosterPriorOperationV1(decision){
  const {dataQuestions,...operation}=decision;
  return structuredClone(operation);
}
