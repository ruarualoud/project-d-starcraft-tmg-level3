// Engineering-review finding: not a human approval, model answer rewrite or
// new official source. Preserve the original experiment and attach a veto.
export const POST_PILOT_FINDINGS = Object.freeze([{
  candidateHash: "647ec4352ee62dbd033a0dab23b34af4ee700ef5ebb49880ac328bfbafc763d2",
  claimId: "cautions.3", code: "INCLUSIVE_MINIMUM_MISLABELLED_AS_UNSPECIFIED",
  source: { ref: "core.I03mzBYujgXw6xN2qXhH.items.6", spanId: "p1" },
  expectedSourceHash: "b470136ba1537aaca0c44797dfbf7599b6beb42ed892e1a92b0a1adb665ee6d9",
  explanation: "The source says at least 3 inches for Size 3 or larger. Exactly 3 satisfies this clearance constraint; this does not assert complete movement or endpoint legality.",
  counterexampleId: "heldout.movement.3", reviewKind: "codex_engineering_review_not_human_approval",
}]);
