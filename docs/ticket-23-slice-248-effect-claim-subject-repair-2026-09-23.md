# T23 / S248 — effect declaration versus an existing threatened asset

## Observed engineering fault

The live Flash decision at revision 51 correctly selected Swarmling Creep
Spread, `creep_token_place`, Hatchery `player2-tactical-2`. Its placement reason
then described Goliath fire covering an **existing** Omega Worm and Roachling.
The identity checker scanned every asset noun in that field and treated the
Omega Worm mention as a claim that the selected action creates one. The actual
structured candidate and placement subject were correct.

The preserved paid attempt is
`provider-attempt-763c47f3f03430d38cb442c7288fdaeb9ce3f27159f5ed88dc0a624a62564e09`,
under run `20260922172710914`, player2 Provider SQLite, decision revision 51.
It was followed by one automatic semantic correction. That correction already
converged and the actual Creep Tumor was applied/replayed at r52. There was no
operator reroll, rollback or need to stop the running match for this repair.

The extra correction request took 27.387s, with 124,884 input + 6,052 output
= 130,936 reported units. Its projected reservation is not an actual invoice;
the normal persisted match cost ledger remains authoritative for estimates.

## Diagnosis and change

Three candidates were distinguished: an unscoped keyword matcher, a wrongly
bound candidate during normalization, and negation/clause handling. The real
response reproduced the precise rejection. A minimal noun substitution probe
kept the same selected candidate: “The Goliath covers the Omega Worm” was
rejected, while replacing only Omega Worm with Raptor passed. Neither sentence
contains a negation. This isolates the unscoped effect-noun matcher.

The checker now requires an affirmative result-producing predicate associated
with the effect reference (including a passive result), not merely the asset
name. Another already named effect or a positional preposition separates the
asset being placed from an existing neighboring asset. Existing negation
handling remains. A risk label does not exempt a wrong declaration such as
“Accepted exposure: we place an Omega Worm”.

This is a bounded narrative contradiction check, not a complete natural-language
parser and never Rules authority. Ambiguous prose does not become an illegal
action: the typed candidate, exact placement, Preview, Apply and Replay still
enforce actual legal behavior. No Prompt, Skill, model selection, output capacity,
official snapshot, spatial solver or Rules transition changed. Completed paid
decisions are not invalidated via a normalization-version bump.

## Focused verification

```
node scripts/verify-ticket-23-slice-248-effect-claim-subject-v1.mjs --run-directory=build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914
```

Original saved response: exact red, then one post-change green. Eleven relevant
counterexamples distinguish real incorrect result declarations, passive results,
a wrong effect after a comma/risk label, negation, nearby existing assets,
enemy fire and Chinese descriptions. No previously passed gate or build was
rerun. Provider calls / Room mutations / cost: **0 / 0 / ¥0**.

The response's independent “largest standoff” claim was numerically wrong
(12,874 is less than another option's 14,099) and disappeared in the accepted
correction. This test only validates effect identity; it does not certify all
prose or the strategy as optimal. Preserve that claim as S249 review evidence.

## Live checkpoint and loading boundary

Runner 51562 remains alive. At 21:16:48.718Z r53 deployed Kerrigan through the
Omega Worm, with Rules Apply/Replay and screenshot
`screenshots/0403-r053-player2-resolve_unit_lifecycle_consumer-complete-board-applied.png`.
46 new accepted actions + 7 explicit prefix actions = r53. The checkpoint has
119 calls / 12,511,581 accounted units / estimated ¥16.823985, including the
previously disclosed unknown-usage reservation. Both configured seats remain
Flash; provider responses do not report a separate model name.

This pure checker repair is committed on disk but **not yet loaded into the
existing server process**. Use the next safe reload; do not disrupt an active
paid request or regenerate r52/r53 just to load it. T23 remains 33/36, with
S248 full match, S249 review and S250 synthesis open.

## Harness evidence

- harnessLoopUsed: true; targetGames: StarCraft TMG.
- promptPackRoutes: existing self-play Planner → queries → Action, unchanged.
- harnessToolsCalled: saved native terminal response replay into the real
  selected-action identity inspector; read-only SQLite and Web screenshot.
- uiTraceEvidence: r52 Creep placement and r53 Kerrigan deployment images.
- agentDecisionEvidence: original and corrected public reasons retained.
- memoryTraceEvidence: match memory unchanged by this local repair.
- trainingTraceCandidates: none promoted; trainingTruth remains false.
- rollbackOrDemotionRules: if a true incorrect result declaration is allowed
  by this changed branch, fix/demote the checker without altering Rules truth.
- userVisibleChecks: no spurious identity rejection for the saved threat
  description; the live match kept progressing without a restart.
