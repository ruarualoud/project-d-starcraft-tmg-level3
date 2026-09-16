# Ticket 25 / Slice 263 — live browser recovery blocker

Date: 2026-09-17

Status: live proof started; browser recovery validation stopped after three
non-converging cycles. S262 remains open for its first natural post-change
formation canary. S263 is not accepted.

## Authoritative progress

The existing Standard-2000 Room resumed from revision 126 without replaying an
accepted transition.

- Action 127: the Agent closed the already-spent Swarmling Movement activation
  with `finish_activation`. Rules Apply and Replay equality passed. Screenshot:
  `screenshots/0159-r127-player2-sc-domain-1b675f711953bf9d1306b97b1aa53152115587bc35b2ee414194ec002da6fee1-applied.png`.
- Action 128: the Agent selected Movement `pass` after comparing the remaining
  action space. Rules Apply and Replay equality passed. Screenshot:
  `screenshots/0160-r128-player2-sc-finite-b30bb38e56f9897bc71ea98cbcb4db4eda6bb5b179092a09ee6930cc69e07ea5-applied.png`.
- A later authority transition advanced the Room to revision 129 while the
  runner was preparing the human UI operation. It remains authoritative but is
  not yet appended to `actions.ndjson`; the next successful resume must recover
  it exactly once.

Neither new recorded decision used a formation option, so neither is valid
evidence for the S262 Pareto-prompt canary.

## Concrete browser defect

The initial failure occurred while the runner waited for `Load LegalSpace`.
The screenshot proved that the Room had already advanced to revision 129 and
the workspace had returned to the Referee panel. A stale human UI operation was
waiting on a control that had been removed by a newer authority projection.

The focused runner repair now:

1. binds LegalSpace preparation to the baseline Room revision and Bot action
   count;
2. cancels the stale human operation when authority advances before dispatch;
3. skips a redundant explicit refresh when the page projection already equals
   the authoritative manifest;
4. requests a new control fence for a new browser session before write work;
5. accepts a missed refresh network event only when projection and manifest
   independently agree.

Syntax validation passed after every affected code change. No Provider call was
made by any failed recovery cycle.

## Three-cycle convergence record

1. The first resume reproduced a disappearing `Load LegalSpace` locator after
   authority advanced. This produced the revision-bound stale-operation repair.
2. The second resume showed the new browser was fenced. The server successfully
   incremented the Room/recovery ledger when `Take control here` was clicked,
   but the transient success message disappeared during remount, so waiting on
   that message caused a false failure.
3. The third resume again proved server-side control acquisition by advancing
   the room/recovery revisions without advancing game state. However, the
   response-observer projection never exposed `control.ownedByViewer=true`, so
   `SLICE247_CONTROL_CLAIM_PROJECTION_MISSING` stopped the run.

No fourth retry or further repair is permitted in this validation cycle.

## Blocker and next concrete deliverable

The remaining blocker is a missing stable, typed completion signal across the
control-acquisition seam. Server-side lease creation succeeds, while the runner
can observe only an ephemeral UI notice or a public projection that does not
prove the new private lease belongs to the current browser session.

The next implementation cycle must expose one durable, secret-free claim result
to the browser harness—for example the typed `claim_control` response containing
the new fence plus the client view's persistent `control.status=claimed`—and
bind it to the current client session. The runner must validate that response,
not infer ownership from a toast, DOM remount or public Room projection. It then
recovers revision 129 exactly once and continues the same Room.

## Model usage and cost

This live interval made five new Provider calls: 379,085 reported input units,
19,294 output units and 398,379 total units. The prior recovery-normalized
ledger therefore advances from 404 calls / 22,282,926 units to 409 calls /
22,681,305 units. The latest recorded match cost is CNY 35.306404. The CNY 100
notification threshold is not reached.

## Typed claim repair cycle

The next implementation cycle replaced the public-projection inference with a
private, session-bound claim contract:

- Client Domain now rejects a returned ControlLease unless its `sessionId`
  equals the Domain's private `clientSessionId`.
- The accepted result exposes only a secret-free claim receipt: status, fence,
  room revision and a one-way session-binding hash. The lease ID and session ID
  remain private.
- The same authoritative claim response updates the local Room summary and
  projected control fence atomically. Explicit claim no longer performs a
  redundant full projection/character refresh before returning.
- `load_battle_workbench`, an optional read-only panel request, no longer
  occupies the write/control operation queue.
- The Web Room panel displays persistent local-session fence and binding
  evidence. The exported bundle contains the new claim receipt and display
  fields.

Three focused recovery validations were then run against the same r129 Room.
None made a Provider call or applied a game action:

1. The first run proved that waiting for the raw `control-lease` browser event
   could still time out before request dispatch while the UI was initializing.
   Screenshot: `screenshots/0165-r128-runner-failure-failure.png`.
2. The second run displayed the persistent successful-claim notice, but the
   raw network-event observer still timed out. Screenshot:
   `screenshots/0166-r128-runner-failure-failure.png`.
3. The third run advanced authoritative Room revision 496 -> 497, proving the
   ControlLease claim committed, and again displayed `本设备已取得控制权`.
   The harness then timed out because its combined DOM assertion did not see
   all three new fields together. Screenshot:
   `screenshots/0167-r128-runner-failure-failure.png`.

The three-round limit is reached. Product-side claim acquisition is now proven;
the remaining blocker is narrower: capture the Room panel's actual post-claim
DOM/accessibility text once, then make the harness consume that stable typed
claim projection without guessing label whitespace or requiring a raw network
event. Revision 129 remains authoritative and absent from `actions.ndjson`,
which remains at 128 records. The partial repair is intentionally uncommitted
until that single acceptance assertion passes.

## Post-cycle typed-receipt result

After the preceding cycle had stopped, the implementation was narrowed again
without rerunning the old assertion:

- a timed-out `claim_control` mutation can no longer inherit the generic
  `cached_projection_recovered` success outcome;
- uncertain mutation completion now returns
  `CONTROL_LEASE_OUTCOME_UNKNOWN` and remains offline/read-only;
- the Match surface clears a stale success notice unless the private view is
  both connected and claimed;
- successful control UI now requires the exact `control_claimed` outcome plus
  a local fence and session-binding hash;
- Standard-2000 transport receives a 120-second request budget, while the
  private typed receipt remains the acceptance authority.

The one post-change browser validation ended with screenshot
`screenshots/0170-r128-runner-SLICE247_CONTROL_CLAIM_PRIVATE_RECEIPT_INVALID-failure.png`.
It proves the product repair succeeded:

- visible machine receipt:
  `control-claim-receipt status=claimed fence=13 session=438e5756622b`;
- visible private control state: `claimed`, local fence `13`, session binding
  `438e5756622b`;
- authoritative room revision `505`, game-state revision still `129`;
- no console error, page error, Provider call or game Apply.

The runner nevertheless reported `leaseFence: null` because its anchored
regular expression accepted only a value beginning with `status=`, while React
Native Web exposed the element's visible, versioned prefix
`control-claim-receipt ` before the same valid fields. This is a deterministic
harness parser false negative, not a failed product claim and not a strategy
regression.

No additional patch or retry is performed in this convergence cycle. The next
cycle's concrete deliverable is a label-independent typed-receipt parser that
normalizes the optional versioned display prefix, followed by one focused
acceptance run from the same revision-129 room. Only after that persistent
client-view assertion may the runner recover action 129 exactly once and resume
the H-A match.

## Next-cycle acceptance and terminal continuation

The next cycle implemented only that parser change: the harness now locates the
machine receipt by stable test ID and accepts the explicit
`control-claim-receipt ` display prefix while retaining the strict claimed,
positive-fence and 12-hex session-binding contract. Its only syntax gate passed,
and the only browser acceptance run succeeded.

The same Room then recovered action 129 exactly once, applied actions 130–137,
and reached a Rules-terminal round-5 result. The final evidence is 137 actions,
181 screenshots, 419 Provider calls, 23,582,097 total units and CNY 36.496241.
Every Agent replay matched; Critical/High, console errors and page errors are
all zero. Ticket 24 / Slice 258 and Ticket 23 / Slice 247 therefore close.

This terminal tail selected finite Pass candidates rather than a
formation-bearing action. It proves the control/recovery seam and shows no
general prompt-scheduling regression, but it does not satisfy S262's natural
post-change formation canary. Action 131 also disclosed a Medium lifecycle
projection inconsistency by describing the same Raptor through on-board
relationships and reserve policy. S262 remains `3/4` accepted and S263 remains
open for the independent A-A/review path.
