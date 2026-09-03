# Ticket 14 Slice 136 — pinned Web build and browser acceptance

Status: complete. Ticket 14 is 9/16; seven slices remain. Overall project status
is 13/22 Tickets complete.

## Delivered build boundary

Slice 136 turns the tracked Expo Web product into a reproducible static export
and exercises that export plus Battle Lab in a real Chromium browser against
the actual RoomRuntime and HTTP Adapter.

- The build uses `pnpm@9.12.0`, the frozen Expo lock hash
  `3a1bab78...2089`, offline dependency resolution, a clean Metro cache and a
  fixed production App Link origin.
- Two clean-export races in `react-native-css-interop@0.2.1` were reproduced
  and minimized. First, its generated `node_modules/.../.cache/web.css` path
  could appear after Metro's initial crawl. Then Web and SSR were shown to
  produce two different bundles depending on which graph wrote/read that
  shared file first, even with one worker. The build now precompiles Tailwind
  once to content hash `fb80dc18...60708`; a workspace-confined Metro resolver
  makes both static graphs read that immutable file. Native development/device
  builds retain the ordinary NativeWind path.
- Two independent production runs are identical across receipt hash, output
  tree, file count, byte length, full file manifest and lock hash. The fixed
  output is 54 files / 4,226,632 bytes with tree
  `caa75c59...f8e8` and receipt `eccbe6ba...6705`.
- The acceptance export is a development-only static build so loopback may
  exercise a real one-shot recovery capability. Its HMR attempts are limited
  to the two known `/hot` and `/message` WebSocket paths; any other console or
  page error fails the evidence. It is not a production artifact.

## Browser denominator and authority

The browser gate contains seven named checks:

1. one production public-observer deep link;
2. Expo desktop, tablet and mobile authenticated recovery links;
3. one Expo keyboard LegalSpace → Preview → Confirm → Apply → Replay flow;
4. one Expo offline/read-only/reconnect flow;
5. Battle Lab desktop and mobile shared-domain mounts, including one second
   authoritative apply/replay flow.

The fixture binds only `127.0.0.1` on a random port. It creates rooms through
the real authoritative engine, in-memory RoomRuntime and Level-3 HTTP Adapter;
there is no browser mock transport. Production loopback is deliberately tested
without a bearer because production capabilities require the configured HTTPS
App Link origin.

The test exposed a real Expo Web deep-link race. `RNLinking.web` resolves
`getInitialURL()` asynchronously from the then-current location, while Expo
Router may already have normalized query/search state behind the fragment. A
valid 43-character recovery token therefore acquired `?side=player2` and was
correctly rejected. `app/+html.tsx` now captures the original room URL in a
non-enumerable memory-only property before the Router bundle executes. The
Provider consumes and deletes it on first render before awaiting transport.
Every viewport proves the fragment and untrusted `side`/`role` claims are
scrubbed, the bootstrap property is deleted, and neither localStorage nor
sessionStorage contains the capability.

## Scale, responsive and accessibility evidence

- Desktop `1440×1000`, tablet `1024×1366` and mobile `390×844` all preserve the
  authoritative `0 0 54000 36000` viewBox and `xMidYMid meet` policy.
- `getScreenCTM()` proves identical X/Y physical scale within `0.000001`; page
  and board widths remain inside each viewport.
- The room fixture renders 30 individually positioned models using the sample
  roster's rules-facing base-shape and millimetre/inch fields. This makes base
  size versus the 54×36-inch board visible in the screenshot rather than
  substituting generic icon size or unit anchors.
- Every rotated circular/rectangular base stays wholly inside the board; the
  fixture packs complete formation bounds with a 0.6-inch visual margin and
  proves zero pairwise base-bound overlap rather than checking model centres.
- All 30 tokens use a footprint-matched SVG clip and `xMidYMid slice`, so
  irregular bases are filled by cover-cropping instead of stretching the
  portrait. Public builds use 16 generated fallback frames; the explicit
  development-internal channel can use six original animated communication
  portraits and 42 unit voice clips, never in production output.
- Expo uses top-level Battlefield/Adjutant/Room-and-rules surfaces and a
  mutually exclusive Actions/Referee workbench. Battle Lab uses four mutually
  exclusive Referee/Actions/Adjutant/Harness panels. The board stays primary
  without stacking every tool into one long desktop page.
- Critical Expo targets and every visible Battle Lab button are at least
  44×44 pixels. LegalSpace is activated with the keyboard Enter key.
- Battle Lab's responsive grid uses `minmax(0,1fr)` plus explicit child
  `min-width:0`, preventing long referee hashes or room titles from expanding
  the mobile track.
- `react-native-svg` rotation now uses standard SVG `transform=rotate(...)`;
  invalid Web `transform-origin` and boolean `accessible` DOM attributes were
  removed without changing world geometry.

## Evidence and security

- Browser acceptance: 7/7.
- Evidence artifacts: 10/10 indexed and SHA-256 bound: five screenshots, three
  videos, one production screenshot and one unauthenticated production trace.
- Capability scan: 10/10 artifacts contain no recovery or seat token.
- Authenticated network traces are prohibited because request headers contain
  the SeatGrant. Authenticated evidence uses viewport-only screenshots/video;
  the trace is public-observer only.
- Static/build/security contract: 18/18.
- Shared battlefield runtime: 4/4; room access/recovery: 18/18; Battle Lab:
  23/23; Expo TypeScript: zero errors.
- Ticket 14 Slice 128–135 regression: 290/290.

Generated screenshots, videos, manifests and reports live under the ignored
`build/ticket-14-slice-136-web-static-v1` tree and are regenerated by the
tracked commands. The hash-sealed contract is
`content/client/web-static-browser-acceptance-v1.mjs`.

The browser report is `c3c78f92...42e8c8`, reproducibility report is
`0fb81e72...53ea3`, and static/security report is `a25fd169...ad293`.

No official source refresh, Provider call, Skill generation, DSH run, MuZero
export, self-play, memory promotion or training promotion occurred.
`trainingTruth` and `productionReady` remain false.

## Handoff

The battle-workbench audit expands Ticket 14 before native closure. Slice 137
adds the shared workbench read model, Unit/Scenario/Deployment/Reserve/current
score views; Slice 138 adds multi-mode threat; Slice 139 adds current-rules
probability; Slice 140 adds the complete LegalSpace-classified Token/Marker
palette; Slice 141 adds score forecasting and contextual rules; Slice 142 owns
native builds/devices; Slice 143 runs the cross-surface aggregate and closes
Ticket 14. FAQ F1–F5 remains next, before Ticket 15.
