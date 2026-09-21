# Ticket 23 / Slice 248 — opponent-prediction lifecycle repair

## Defect evidence

The corrected Omega continuation branch `20260921204159763` legally applied
Omega Network at revision 9. The selected exact placement `(20000,12000)`,
source-card exhaustion, Omega Worm effect and Replay were correct. Its public
counterplay hypothesis nevertheless predicted that `player1-goliath-1` might
move again during the current Movement Phase. The public Authority journal
shows that the same Goliath had already completed its Movement activation at
revision 5. The action remains legal Authority evidence, but its strategy prose
and derived plan memory are not training truth.

The spatial observation already carried `activatedPhases`; the defect was that
the prompt merely exposed this fact and no Host semantic gate required the
prediction's named actor/action/horizon to respect it.

## Repair

`inspectStarcraftTmgOpponentPredictionFeasibilityV1` now binds a typed opponent
prediction to the current player-view observation. For visible named actors it:

- rejects an own/allied Unit presented as the opponent actor;
- maps ordinary Move/Deploy, Run/Charge/Ranged and Fight classes to their Rules
  phase;
- rejects a current-phase action whose class belongs to another phase; and
- rejects a current/next-opponent/current-round ordinary action when that Unit
  already activated in the predicted phase.

Unknown actors and unclassified action types remain explicit hypotheses rather
than being guessed illegal. Reactions are not collapsed into ordinary Unit
activation. Prompt v19 tells the model to use activation status when choosing
counterplay; Action local normalization v23 applies the same gate to cached paid
outputs before reuse.

## Focused verification

The concrete r9 Goliath-moves-again case was added to the existing formation and
threat semantic gate. It failed before the export existed and passed once after
the repair. An unactivated Marine reserve deployment remains consistent. The
existing threat-claim and three-round-convergence checks also stayed green.
Provider calls / cost: `0 / ¥0`.

## Continuation boundary

Fork from revision 8 and regenerate the Omega decision so the accepted plan
contains only lifecycle-possible opponent responses. Do not replay or promote
the first r9 prose. The failed strategy attempt cost `6 calls / 271,979 units /
¥0.378876`; it did not cross the ¥100 notification threshold.

## Typed actor/location follow-up

The first repaired retry correctly stopped the already-activated Goliath move,
but exposed two adjacent typed inconsistencies in the accepted response list:
an off-table Marine was named with `actionClass: move` while the prose described
Deploy, and the side-level `phase_control` response named the Goliath as its
Unit actor. The lifecycle inspector now treats on-table Units and
`offTableUnits` as one typed actor catalogue: a live Reserve actor requires
`deploy`, an on-table actor cannot use Reserve Deploy, a destroyed actor cannot
act, and Pass / choose-first-actor / phase-control must leave
`likelyActorUnitId` empty. Prompt v20 and Action normalization v24 expose and
enforce the same contract.

Both exact persisted shapes were added to the existing focused gate. They
failed before the follow-up and passed once after it; a real Reserve Marine
Deploy remains accepted. Provider calls / cost for the repair: `0 / ¥0`. The
accepted but internally inconsistent retry branch `20260921205840768` remains
non-training strategy evidence (`6 calls / 296,013 units / ¥0.415465`). This is
the second lifecycle repair round; the next live retry is the third and final
convergence attempt for this defect class.
