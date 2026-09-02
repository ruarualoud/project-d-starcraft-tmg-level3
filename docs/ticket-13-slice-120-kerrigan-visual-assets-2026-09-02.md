# Ticket 13 Slice 120 — Kerrigan visual assets

Slice 120 captures one official Blizzard Kerrigan Hero Week image into the
ignored local evidence area and uses it only as a development identity/material
reference. The source is a `779×274` PNG, 264,898 bytes, SHA-256
`6ec9eda12b14242fd32aa3a053e7a37fef4a3ed06af3fc55bf34893b2ac52ad9`.
The raw source is not stored in Git.

Built-in image generation produced two product-facing development assets:

- square avatar `1254×1254`;
- 2:3 character-card portrait `1024×1536`.

Each has a complete prompt, ordered input lineage, output hash/size/dimensions,
manual visual review and content-hashed generation receipt. The card consumes
the avatar as an identity anchor. The outputs preserve one
face/material/palette language and contain no embedded text, logo or watermark.

An exploratory `1024×1535` full-body image was generated before the user fixed
the runtime around dialogue portraits. It has been moved to ignored local
design evidence, removed from product receipts, quarantined in the immutable
plan's realized catalogue, and cannot be selected by development or public UI.
Its optional local byte hash is still checked so demotion cannot hide drift.

The two runtime images are development-only Kerrigan derivatives. They are selectable in the
development environment but remain `publicReleaseAllowed=false`; public
selection falls back explicitly until independent rights evidence exists.

No CharacterPackage facts, Rules, room state, Skills, memory or training truth
were changed. No DSH, paid external Provider, MuZero or self-play run occurred.

Verification:

```sh
npm run verify:character-visual-assets
```
