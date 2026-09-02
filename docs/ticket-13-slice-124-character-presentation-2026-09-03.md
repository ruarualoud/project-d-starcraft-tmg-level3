# Ticket 13 / Slice 124 — shared Web/App character presentation

Status: complete.

## Outcome

Slice 124 converts the sealed CharacterPackage, Slice 123 selector view and an
optional server-owned dialogue-portrait view into a shared semantic content
model. The Web and App projections have different surface hashes but one exact
`sharedContentHash`; they cannot reinterpret persona, timeline, portrait,
rights, offline or selection state independently.

The deliverable is a mountable renderer contract plus inspectable Web and App
artifacts. It is not represented as an Expo/Web framework mount: that remains
Ticket 14.

## Rendering and interaction

- Web renders a labelled region, one eight-option radio group, responsive CSS,
  a square `cover` portrait and a bounded frame scheduler that respects
  `prefers-reduced-motion`.
- App renders a native accessibility tree with the same image/animation hashes,
  one mutually exclusive radio group, explicit labels and 44px targets.
- A persona selection control emits only `{worldbookId, expectedRevision}`
  intent metadata. Slice 123 remains the CAS state owner.
- Static-only eras render their own anchor and reject a foreign dynamic view.
  The post-Zerus primal era consumes the server-owned mode, phase, cue and frame
  schedule from Slice 121.
- At rank 60, rank 70/80 options may be visibly locked but their thumbnails are
  withheld so the visual itself does not leak later-era spoilers.
- Offline sealed views remain visible and fully read-only. Public views contain
  no Kerrigan-derived asset path and show the Project D-original fallback.

## Scale and accessibility

Desktop, tablet and mobile layouts are explicit. Portrait aspect ratio is 1:1,
object-fit is `cover`, browser image rendering remains `auto`, controls are at
least 44 CSS pixels, and narrow layouts avoid horizontal overflow. The character
panel declares that it changes none of world-to-CSS scale, board fit, pan/zoom,
base/token geometry or Rules collision.

## Evidence

- Focused verifier: 12/12.
- Ticket 13 foundations: 69/69.
- Personas/surfaces/layouts: 8 / 2 / 3.
- Minimum touch target: 44px.
- Selector catalogue: `f4dad5c90405580ec40428d993e0e144f50cac844e65e40f8491d48ad7ff3f81`.
- Dynamic manifest: `5d117dbe1e21ab89129027e31f3c21ca46923bd6f7a0d5dfa55009b458b82f36`.
- Shared semantic content: `5567f51acb3a8fb90d24399bf5c289fcbbbd243af88ad3f00565501fbd4163cc`.
- Web/App model: `12897dbb...c34e` / `f0979989...d533`.
- Public/offline/reduced-motion model: `97aba9da...20e5` / `d57dd8cb...f8e7` / `96b6d470...57f`.
- Report: `475c39042181c06f6a8bb0fc5e99fce3105216859cd3498b8039404ffaf0480c`.
- Web preview: `build/character-presentation-v1/preview.html`.
- App native tree: `build/character-presentation-v1/app-native-tree.json`.

## Authority

The presentation layer cannot apply a room action, change Rules, call a
Provider, write memory, generate or promote a Skill, invoke DSH, or create
MuZero/self-play/training truth. Hash, path, character, selector or dynamic-view
drift rejects before rendering.
