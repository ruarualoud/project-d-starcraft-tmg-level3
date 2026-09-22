# T23 / S248 — Hosted Opponent read amplification repair

## Actual interruption

Runner 72606 exited with a 60-second `refreshObservedRoom` UI wait timeout
after r51 was already applied and replayed. The server and its owned browser
also exited through the runner's cleanup. This is a confirmed terminal handle,
not a reason inferred merely from an old progress timestamp.

The failure snapshot is preserved at
`build/ticket-23-slice-248-standard-2000-aa-live-v1/20260922172710914/r51-observer-timeout-evidence.json`.
It records repeated GETs to `/starcraft-tmg-level3/bot/api/v1/rooms/<room>`
starting every 1.5 seconds while prior responses were pending. The retained
window contains 63 completed Hosted Opponent reads taking 72.981–394.101
seconds, plus six still pending. The visible page was still recovering r50 although the server
had accepted r51. r51's manifest alone took 40.351 seconds.

This is a second, independent poll lane: the earlier repaired A-A status
control uses `/__ticket23/a2a/ui-status` and a 2.5-second interval. It did not
protect Hosted Opponent's 1.5-second timer. Both original fixes are required;
the earlier narrow gate never claimed coverage of this separate component.

At the stopped boundary: both seats `deepseek-flash`, no unfinished Provider
decisions, no pending Apply. Bot records have 17 + 27 applied/replayed actions;
with the seven explicit replay-prefix actions the Room is r51. Total usage:
111 calls / 11,487,277 accounted units / estimated ¥15.447569, including the
previous unknown-usage reservation. Preserve all of it on resume.

## Cause and bounded repair

Ranked explanations were unbounded same-component concurrent reads, duplicate
mounted panels, and intrinsically slow server projection. The first is
directly reproduced by the actual component callback: one initial read plus a
timer tick and manual refresh created three pending HTTP requests. Multiple
mounts are not required to explain that failure. Slow server work can amplify
it but its independent timing remains unproven.

`HostedOpponentOperationsPanel` now keeps one pending read per current room
URL. Timer/manual callers share that pending promise. Success or failure
releases the slot. A room change aborts the obsolete request; a late obsolete
response cannot overwrite the new room. Effect cleanup also aborts its read.
No complete projection, physical task, memory, plan or public decision field
is dropped. Mutation POST handling, strategy inputs, Skill context, output
capacity and legal action execution are unchanged.

## Focused verification

```sh
node scripts/verify-ticket-23-slice-248-hosted-poll-single-flight-v1.mjs
```

Actual callback, concrete bug only: red 3 requests; one post-change green
0.372 seconds, one pending request. It also checks full physical-task/decision
projection retention, failure release, room-switch cancellation and ignoring
the old response. Zero Provider calls and zero Room mutations. No prior
passed gate was repeated.

One `npm run export:web:local` is required because this TSX component must be
compiled into the static Web bundle loaded by the real runner. This is a
directly affected build, not a generic regression sweep. Build/resume outcome
is appended below when observed.

The one export completed successfully: Web 198.016 seconds / 1424 modules,
SSR 190.879 seconds / 1432 modules / 14 routes. Actual Web bundle:
`entry-6d5decda720334ef05afd14ea8b7c0e2.js`. Existing node-linker/Browserslist
warnings were not treated as new blockers or reasons to install/update data.
The same-directory resume has been launched; capture/latency evidence is
still required before claiming the live observation recovered.

## Recovery and acceptance boundary

Resume the same directory, capture the already accepted r51 and continue.
This normal recovery also loads the tested summoned-subject backend fix from
`8458a81`. Do not regenerate the r51 model choice or discard its accounting.
Observe the real browser read history and action evidence before claiming the
whole performance problem solved. No whole-match or classic-map acceptance
is implied. All traces remain `trainingTruth: false`.

Harness loop: StarCraft TMG / `selfplay_agent_prompt`; unchanged authoritative
action pipeline and memory; repair is only read-side observation scheduling.
User-visible criterion: the existing room reconnects and displays the latest
accepted revision, without an accumulating queue of Hosted Opponent GETs.
