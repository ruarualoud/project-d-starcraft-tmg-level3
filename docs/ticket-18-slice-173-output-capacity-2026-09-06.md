# Slice173 — output capacity and complete Tutor artifacts

Ticket18 remains1/8; project16/22; overall rules5/37 packets; formal Skills0/5.
The five previously repaired source defects and14/14 known-error regression
remain valid. This work fixes production mechanics, not source truth.

## Two observed, separately diagnosed failures

1. `overall-v3-58ddd1273138b8da321f` stopped at006 Tutor. Both paid responses
   had outputUnits exactly1400 and Provider finishReason `length`. The old
   format retry repeated the same output ceiling. Source context was not
   shortened or lost. This run cost248,153 tokens/¥0.029576.
2. `overall-v3-64bb34fd54b622ede911` used4096 and returned complete responses,
   but a1397-character Flying teaching note violated the hidden1000-character
   per-item Tutor limit. The schema response copied the same note. This was
   an overrestrictive intermediate artifact contract, not a malformed rule
   or an accepted final Skill. It added249,887 tokens/¥0.033318.

Current cumulative known lower bound10,192,313 tokens; known estimate plus
historical unknown-call reserve¥38.537722, not an invoice. No payment-required
or ambiguous attempts were present after these terminal runs.

## Implemented changes

- Current full production opts into `outputRecoveryLimit:4096`. A known
  truncated response at a lower cap can receive one capacity-specific
  recovery request with a larger reserved output budget and the same source
  context. At the maximum, it stops without a futile same-capacity retry.
  Unknown usage, ambiguity, cancellation and exhausted budget cannot enable
  this recovery. Ordinary schema correction remains separately bounded.
  Historical callers retain their recorded policy unless explicitly opted in.
- Tutor initially receives the existing Provider profile's4096-token ceiling.
  That is a ceiling, not a charge for4096 output tokens.
- Tutor is unverified teaching context, not final rule claims. It now has a
  whole-artifact64KB limit, fixed keys, bounded arrays and nonempty safe text.
  Its long paragraphs are preserved byte-for-byte. Final claims retain their
  existing1500-character/evidence limits and independent source review gates.
- Explicit overall continuation keeps the original¥20/30M-token/600-call/
  six-hour allowance and start, subtracting all ancestor calls and costs.
  It may reuse exact-input raw Tutor/review artifacts but not final acceptance
  or Provider attempts. Changed source/model/gates still require explicit
  handling; this does not silently upgrade old rule versions.

## Verification

- Both failures reproduced RED from actual saved Provider/role artifacts.
- Eight output-capacity checks: increased-cap recovery, identical context,
  durable failure/success reuse, cap stop, unknown-usage stop and schema bounds.
- Eight complete-Tutor checks, including the actual1397-character item reaching
  Generator unchanged without another Tutor repair; this uses an injected
  Generator boundary and is not a semantic quality result.
- Ten v3 groups; twelve ordinary and twelve overall continuation checks.
- Eighteen affected legacy groups including real isolated DSH tool execution.
- Two real DSH full-source sessions with injected HTTPS show470128/471743-byte
  wire requests and successful exact request reuse; no Provider fees for tests.
- After the Tutor contract adjustment, the affected DSH transport binding is
  being rechecked before the next paid continuation. No overall exam yet.

Skills used: offline Skill evolution and ctx2skill require preserved source
context and independent acceptance; the Harness loop requires actual transport
and recovery evidence; diagnose required saved-sample reproduction before
changing the failure handling. `trainingTruth=false`; no official refresh,
Codex agents, Room mutation, Skill promotion or memory promotion.
