# Slice 173 — bounded multi-claim citation recovery

Ticket18 remains1/8, project16/22, formal first-five acceptance0/5.
The overall Skill has12/37 source-reviewed reading packets,25 remaining.
Reading packets are not separate Skills.

## Actual failure and diagnosis

`overall-v3-993702fcad1780fb75d7` completed006–012 after importing the
previously repaired001–005. Packet013's two source reviewers accepted its24
claims but linked four uncited example passages to several existing claims.
The host could previously auto-repair only a single unambiguous claim address.
Diagnosis therefore reached the model editor. Both its original output and its
one schema correction appended all four addresses to seven different claims,
each of which already had two citations. Reinspection correctly stopped at
`V3_EVIDENCE_COUNT_INVALID`; the four-citation limit was not waived.

The run's34 physical calls,4,282,987 known tokens and¥0.628966 are retained.
Cumulative known Provider usage is14,475,300 tokens; estimate plus historical
unknown-call reserve is¥39.166688, not an invoice. Its inherited4 calls,
498,040 tokens and¥0.062894 remain charged to the original overall budget.
Report hash: `ab926da0dbb53ab0eb61354966473a331eec73dd90bd3b145b89d502951f55ce`.

Hypotheses tested: missing multi-claim association handling; undisclosed
post-addition citation capacity; invalid source addresses. Real saved outputs
reproduce the first two. The addresses resolve correctly, ruling out the third.

## Necessary change

`citation-repair.mjs` now intersects the two exact-hash-bound reviewers'
existing supported claim associations and matches each missing address to an
available citation slot. It uses augmenting assignments so an early flexible
choice need not consume the only slot usable by a later issue. This is a
metadata association, not a new semantic judgment. It never invents a link,
deletes old evidence, edits prose, raises the four-citation limit, or promotes
a candidate. Missing agreement/capacity stays for diagnosis or quarantine.
The editor also receives the complete post-patch size/citation limits.

## Verification and limits

- Real saved failures reproduce RED before the fix.
-18 citation checks include both old003 and new013 failures, unchanged prose,
  exact review bindings, deterministic assignment and exhausted capacity.
- The real24-claim013 draft traverses an injected runtime replay: two original
  reviews, host metadata repair, two subsequent reviews; no editor/diagnosis,
  zero real Provider calls. This is engineering regression, not live acceptance.
-10 v3 contract groups,12 overall-continuation checks and8 output-capacity
  checks pass. Source and semantic acceptance contracts are unchanged.
- Two actual DSH isolated sessions revalidated full-source delivery with
  injected HTTPS responses, zero real Provider calls. Binding report:
  `06728ffbdfeb0924cf2b9186de3691b7a3ebb5a416b9de0d2d67538f12195743`.
  The current contract report is
  `a4002771434d2fd02e84abb7986965c8c3892b1eac601ec3260915e67581ba84`;
  output-capacity report is
  `d5a8ae695a651ffde89647e61ca797444c2d8c5a4f36d66a341821072ae4f62d`.
  Paid exact-input continuation is next.

The prior run is immutable. Continuation must reuse only exact-input raw roles,
recompute final acceptance, preserve the original start/budget and retain all
paid failures. Full37-section14-known-error regression and105-case exam,
two factions, two directed matchups, real Room play and reflection/upgrade/
rollback remain unfinished. No source refresh, Codex subagents, Rules mutation,
registry publication or training-truth promotion occurred.
