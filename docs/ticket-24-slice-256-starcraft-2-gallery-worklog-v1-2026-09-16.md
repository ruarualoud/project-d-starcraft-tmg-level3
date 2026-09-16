# Ticket 24 / Slice 256 — StarCraft II gallery worklog v1

Date: 2026-09-16
Status: complete, `10/10` generated-original display assets and compiled recipes
Provider usage: image generation only. DeepSeek increment `0`; the existing
optimized-match ledger remains `144` calls / `6,191,121` reported units /
`¥11.833541`. Image-generation price telemetry is not exposed by the tool.

## Visual direction

Each asset uses its own reviewed competitive-map reference and topology. The
shared rendering vocabulary is classic StarCraft II top-down 2D with a matte
printed-table treatment, crisp traversable silhouettes and deliberately quiet
micro-detail beneath the high-resolution circular Unit pieces. The gallery
does not use modern PBR, an isometric camera, anime rendering, a cinematic
paint-over, or one repeated four-corner layout.

The source screenshots were research inputs only and are not redistributed.
Every promoted PNG is generated-original and display-only. Runtime geometry is
never inferred from the image.

## Formal gallery

| Seed | Scale / table | Asset | Preserved identity |
| --- | --- | --- | --- |
| Metalopolis | Grand / 72×36 | `metalopolis-display-v1.png` | four plateaus, central Korhal crossroads and watch pockets |
| Shakuras Plateau | Grand / 72×36 | `shakuras-plateau-display-v1.png` | long shared twilight corridor, ledges and rear routes |
| Xel'Naga Caverns | Skirmish / 36×36 | `xelnaga-caverns-display-v1.png` | compact diagonal pressure, central void and alternate thirds |
| Daybreak | Standard / 54×36 | `daybreak-display-v1.png` | industrial north/south staging, central rocks and side run-bys |
| Cloud Kingdom | Standard / 54×36 | `cloud-kingdom-display-v1.png` | two diagonal primary plateaus, short centre and long positional arcs |
| Antiga Shipyard | Standard / 54×36 | `antiga-shipyard-display-v1.png` | cross-spawn shipyard, open centre, safe and risky third choices |
| Ohana | Skirmish / 36×36 | `ohana-display-v1.png` | compact tropical engagement field and constrained side routes |
| Whirlwind | Grand / 72×36 | `whirlwind-display-v1.png` | broad four-start macro orbit and single central vision node |
| Frost | Grand / 72×36 | `frost-display-v1.png` | wide four-start ice field with paired flank choices |
| Abyssal Reef | Grand / 72×36 | `abyssal-reef-display-v1.png` | diagonal reef shelves, broad centre and rock-timed flanks |

Cloud Kingdom's first generated candidate was rejected before promotion because
it invented four equal corner bases. The promoted asset restores the reviewed
two-player lower-left/upper-right diagonal composition.

## Rules and mission geometry

`official-starcraft-2-map-gallery-v1` binds every asset to its unique seed,
topology hash, engagement scale, complete current-base passage audit and
default two-layer Rules compilation. The complete base denominator remains
32/40/50/80mm round plus 40×100mm rectangle.

The separate mission-geometry gate also covers the ten Brood War maps. It
passed `20/20` map topology previews, `75/75` exact map/deployment audits and
`375/375` current map/mission/deployment combinations. Every Entry Edge segment
is usable by every current base; both sides remain connected for every base;
every Mission Marker and Divide and Conquer Quarter is reachable from both
sides by at least one current legal base. Standable-high-ground markers require
an access point and enough platform area for the specific base.

Five StarCraft II Grand maps retain their correct 72×36 scale and pass the map
topology gate, but remain formal-task preview only because the current official
card bundle contains no Grand mission/deployment geometry. Standard or
Skirmish cards are not stretched to manufacture authority.

## Focused validation

The Slice 256 gallery closure command ran once and passed:

- `10` entries = `3` Standard + `2` Skirmish + `5` Grand Offensive;
- `10/10` PNGs exist and match their declared dimensions;
- `10` distinct build-time SHA-256 asset values and `10` distinct topology
  hashes;
- every default recipe is officially count-eligible and has a universal route
  for current bases;
- all five exact-geometry maps are room-certification eligible;
- all five Grand maps remain blocked from formal task rooms.

The previously passed mission matrix was not rerun after gallery-only code and
asset changes. No match, Skill, DeepSeek Provider, browser, unrelated test
suite or official-source refresh ran. Gallery contract hash:
`95b99bdc2b1364d45eca010dadbec7cecbc81f206540726bceaabaddf0b05233`.

## Closure and handoff

Slice 256 is complete. Ticket 24 is `6/8`. Slice 257 mounts both galleries,
mission-readiness states and per-element art/Rules/passage controls in Web/App.
Slice 258 then runs the terrain-visible low-token Standard-2000 browser match
and evidence report.
