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
