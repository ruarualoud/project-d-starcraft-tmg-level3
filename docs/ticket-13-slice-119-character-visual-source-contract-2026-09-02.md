# Ticket 13 Slice 119 — character visual source contract

Slice 119 freezes the first visual-asset boundary before any network capture or
image generation occurs. It records the user's development authorization,
official publisher page/image locators, per-source rights state, three planned
asset roles, normalized visual direction, output paths, and explicit public
fallback behavior.

The manifest distinguishes authorization to acquire and transform a reference
inside the development workspace from an independent public-release license.
The Blizzard references and every Kerrigan derivative therefore remain
`publicReleaseAllowed=false` until separate evidence closes that gate. The
resolver may select a realized derivative in development, but public selection
fails closed to the Project D-original tactical Adjutant.

No source bytes were downloaded and no image, Skill, DSH run, MuZero record,
self-play trace, memory update or training candidate was produced in this
slice. Visual assets cannot modify Rules, room state, replay or training truth.

Verification:

```sh
npm run verify:character-visual-asset-plan
```

The report is written to
`build/character-visual-asset-plan-v1/report.json` and includes the required
external Harness observability fields.
