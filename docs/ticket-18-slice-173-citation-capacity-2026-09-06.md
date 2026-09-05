# Slice 173 — bounded multi-claim citation recovery

Ticket18 remains1/8, project16/22, formal first-five acceptance0/5.
The latest overall Skill checkpoint has13/37 source-reviewed reading packets,24 remaining.
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

## Actual recovery checkpoint

Continuation `overall-v3-d3b0b227f5464ead27ff` reused001–012 without new
Provider calls. Packet013 reused its original draft/reviews, added exactly four
source associations, and passed two NEW real Provider source reviews. All24
claim texts remain byte-identical. It has zero open issues, one metadata patch,
two review rounds, and no new model editor/diagnosis call. Candidate hash:
`60653da42e0ae39011d01b7943bf8ce0debd32a8ea389fa9d9c3dab9929308bb`.
The new review hashes are
`3e1926a475a0355d62003402e87114a8be7a762a4a051474b81e8f1342c5515a`
and `733e1ff64d29f5b6c369b7c173c14cd68b8157b90892e4d2906d1870c5215503`.

At this checkpoint014 Tutor and Generator had also returned:4 new calls,
507,513 known tokens; cumulative14,982,813 known tokens and¥39.258233
estimate/historical reserve. No payment-stop records. The live process is
continuing, not restarting; the continuation retains38 ancestor calls,
4,781,027 tokens,¥0.691860 and the original six-hour start.

Independent reading of006–012 also identified *questions to test*, not yet
proven additional failures: distinguish Flying path proximity from endpoint
separation; retained marker ownership when supply is tied; Spillover secondary
affected Units versus a declared primary target; and the INDIRECT FIRE/FAQ56
casualty exception versus the quick reference's ordinary visible-casualty cap.
These must be evaluated using the complete assembled Skill. The original
rule/source distinctions and any ambiguity must remain visible; do not invent
source precedence or label unrun probes as independent passing evidence.

The prior run is immutable. Continuation must reuse only exact-input raw roles,
recompute final acceptance, preserve the original start/budget and retain all
paid failures. Full37-section14-known-error regression and105-case exam,
two factions, two directed matchups, real Room play and reflection/upgrade/
rollback remain unfinished. No source refresh, Codex subagents, Rules mutation,
registry publication or training-truth promotion occurred.
