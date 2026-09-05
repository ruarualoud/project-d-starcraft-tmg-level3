# Ticket 17 Slice 170 — total How-to-Play Skill paired proof

Updated: 2026-09-05

Status: paused for design repair after Attempt10. The former Attempt8 waiting
status and cost totals below are historical, not the current run instruction.
See [the 2026-09-05 audit and replacement plan](skill-production-play-evolution-redesign-2026-09-05.md)
for code-backed semantic gaps, the 9/9 falsification/hold checks and the updated
ledger: 2,864,424 known tokens, approximately CNY 5.052393 from known usage plus
unknown-call risk reservations, CNY 34.013743 conservatively combined. Neither
number is a Provider invoice. No Attempt11 ran; both old paid CLIs are held.
The old Fact Judge/Cross-Time/keyword scores are not semantic or gameplay
validation. The chronological material below is retained without rewriting
historical evidence.

Ticket progress is 7/9 complete. Slice 170 is active; Slice 171 remains. Project
progress is 15/22 Tickets complete. None of the first five production-unlock
Skills has been promoted yet.

## Production catalogue and dependency order

The production catalogue contains 53 loadable Skills, not 1,101 Skills:

- one total `skill.starcraft-tmg.how-to-play` rules-routing Skill;
- 10 mission Skills;
- 6 faction Skills;
- 36 directed faction-matchup Skills, including mirrors.

The 1,215 curriculum tasks are internal source, generation and evaluation work
units. Exactly 1,101 can seed current candidates. The remaining 114 historical
display-only rule rows stay readable but cannot seed a current claim.

Generation is dependency-gated. The How-to-Play Skill must be accepted before
mission or faction generation. A matchup Skill additionally requires accepted
own- and opponent-faction dependencies. The initial downstream-development
unlock is five promoted Skills: one How-to-Play, two factions and the two
directions of one matchup.

## Total rules Skill boundary

The How-to-Play Skill is one hierarchical operational router, not one Skill per
RuleAtom. Its frozen input contains 10 non-empty chapters and all 1,163 current
rule references exactly once:

- 1,049 executable/current RuleAtoms;
- 114 display-only historical RuleAtoms.

The trusted host retains every full entry and verifies its evidence ID, content
hash, locator hash and current composite Rules-receipt hash. The model-facing
projection carries chapter counts and commitments rather than repeating the
778 KB index in every role. During play the Skill must route by phase/topic,
retrieve the exact current RuleAtom, ask authoritative Rules/Referee LegalSpace,
and preserve `Preview -> human confirmation -> Apply -> AcceptedReceipt ->
Replay`. Summaries, strategy, character text and historical rows never acquire
Rules authority.

## Paired harness and promotion boundary

The formal proof generates one DSH candidate and one DSH-off direct-Provider
control candidate using the same frozen staged input, prompt pack, model,
sampling values, seven roles and budgets. Only the execution harness differs:

- `dsh`: pinned `@deepseek-ai/dsh@0.1.1-rc.2`, seven isolated role Sessions and
  one exactly-once candidate-tool Session;
- `direct_provider_control`: the same host Broker and Provider Worker without
  DSH, with a reconstructable direct-control Session.

Planner, Tutor, Student, Challenger, Reasoner, Proposer and Generator are model
roles. Fact Judge and Cross-Time remain independent deterministic gates. The
blind evaluator sees neither arm identity nor usage/cost. Both outputs stay
`candidate_unreviewed`; Slice 170 grants zero Rules, strategy, publication,
Memory, self-play, MuZero or training authority. Ticket 18 owns held-out
evaluation, correction, human review and promotion.

## Why the live attempts failed

The failures were different boundary defects, but the recurring engineering
gap was that the original fake Provider tests did not traverse the real parent
Worker -> IPC -> child Worker -> parent validation chain.

| Evidence | Physical calls | Known tokens | Conservative CNY | Result |
| --- | ---: | ---: | ---: | --- |
| Ticket 16 baseline | 1 | 2,468 | 0.004499 | successful transport tracer |
| obsolete FAQ v1:11 | 1 maybe billed | unknown | 0.714814 | wrong single-atom target; immutable failed evidence |
| How-to-Play Attempt 1 | 0 | 0 | 0 | host-only denied field reached the model projection; stopped before egress |
| Attempt 2 | 1 | unknown | 3.530814 | optional reasoning-usage field was incorrectly required |
| Attempt 3 | 3 | 880,861 | 1.552187 | Student returned one `answers` object instead of a one-item array |
| Attempt 4 | 4 | 881,491 successful minimum | 5.083318 | fourth Challenger boundary failed; old Broker lost the underlying class |
| Attempt 5 | 4 | 881,624 successful minimum | 5.083791 | same boundary; added safe transport observation but frozen parent remained opaque |
| Attempt 6 | 4 | 19,175 successful minimum | 3.565905 | compact projection ruled out context size; frozen parent returned generic validation rejection |
| Attempt 7 | 4 | 19,102 successful minimum | 3.565626 | classified child accepted the Challenger success, frozen parent V1 rejected it again |
| live Challenger canary | 1 | 7,369 | 0.013150 | independent parent V2 passed and role graph advanced to Reasoner |

The conservative ledger through the canary is `$2.889261440 / ¥23.114104`.
The known successful-token minimum is 2,692,090. Six possibly billed calls have
unknown usage: the obsolete FAQ call, Attempt 2, and the failed Challenger calls
from Attempts 4–7. Provider invoices remain authoritative.

## Boundary correction and early whole-chain checks

The frozen parent V1 was not modified. An independent Worker Port V2 now owns
the parent IPC contract and uses the same success classifier as the fixed child.
It exposes payload-free category errors and quarantines unsafe success results.

Before another formal request, the following offline checks now run:

1. source/input/catalogue/credential contracts;
2. a real Node child IPC pair covering both arms and all seven roles (14 local
   fixture requests);
3. ten injected result failures: shape, output size, receipt hash, request
   binding, profile binding, Provider identity, usage, network proof, attempt
   proof and safety;
4. pinned DSH executor, bridge cardinality, Session and candidate-tool gates;
5. immutable Attempt 1–7 and canary lineage, cost ledger and one-shot target;
6. source hashes binding the live runner and applicable implementations.

The previous duplicated fake full-pair pass was removed. The real-IPC paired
result now feeds all downstream assertions, reducing this heavy gate from about
nine minutes to about three and a half without reducing coverage. Focused
checks remain the normal development loop; the heavy aggregate is a Slice/live
run gate.

## Live Challenger canary

The one-shot canary used local deterministic Planner/Tutor/Student receipts and
made exactly one live Challenger request. It stopped intentionally before
Reasoner and emitted no candidate.

- run: `slice170.canary.7c2b2966-b2a2-4654-bb02-27592e6a039d`;
- physical calls/retries: `1 / 0`;
- input/output/total: `7,194 / 175 / 7,369` tokens;
- calculated cost: `$0.001643652 / ¥0.013150`;
- report:
  `a71e65a3a9f004742e4aecc188d4c7b8b617d60eebed00f7c7794da81e433712`;
- one-shot lock:
  `facfa7740a33538bbc0ed60fa06b622ed5f4bb12b6727ad9bb98c838050108f2`;
- candidate emissions/promotions: `0 / 0`.

The canary cap was 32,000 input and 1,024 output tokens, with a worst-case
`¥0.123454` forecast. Its output passed child classification, parent V2
classification, Broker V5 normalization and the role graph Challenger contract.

## Attempt 8 cost and authority

Attempt 8 permits at most 14 physical requests, seven per arm, with zero
automatic retry. Its frozen worst-case forecast is
`$6.178923520 / ¥49.431389`. Starting at `¥23.114104`, the maximum cumulative
ledger is `¥72.545493`, below the first `¥100` notification threshold.

The runner accepts only the exact five flags frozen in the V8 execution
contract. It claims a new immutable Attempt 8 directory before reading the
credential. The credential is read only from the fixed macOS login-Keychain
item through the attested `/usr/bin/security` binary; it is never accepted from
chat, argv, environment or repository files. Parent bytes are zeroed after
Worker attachment. Raw prompts, responses and reasoning are never persisted.

## Current gates and hashes

- production catalogue: `8/8`, catalogue
  `f71864cf7b27536290f323420f3812608724e3831ef942feb2ea58d90cbb18ba`;
- How-to-Play staged input: `6/6`, staged input
  `f82df99098ab2739f026e8736b62b2a3c6374c2d2727562c9a0c7c16582510cd`;
- Keychain ingress: `6/6`, report
  `8e8c6e04832ed7294ea337406837b9c5483c4144b1e408abf5ce4ec94c603234`;
- current real-IPC paired preflight: `21/21`, report
  `b498a640971ab7402a07add94b5546d1daa51e41b6db9064237fe0650781e2ef`;
- pinned DSH executor: `19/19`, report
  `8a0bd0433e399aa5e6c1bf07dee80493d7c871b7fc0dd8c427ad1e036bc699a7`;
- Attempt 8 recovery readiness: `13/13`, report
  `51f602c701298b740335e5eddc15f356d1b11f09ded3ef25dd887ce543e1e09e`;
- paired-proof contract:
  `dd38347fa65b92ef1ce3a3864e6fdce51b249c9b9bcd5b107f46af7055106b36`;
- Attempt 8 execution contract:
  `c41aa67d0c97f50a3dcc88c145fefbfc929edfea6d56abbb7556eb4c30049111`;
- source refresh, production candidates and promotions: all zero before
  Attempt 8.
