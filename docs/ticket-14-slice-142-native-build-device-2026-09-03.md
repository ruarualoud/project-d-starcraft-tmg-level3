# Ticket 14 Slice 142 — native build and deferred device acceptance

Status: build-ready; physical-device acceptance deferred by user. Ticket 14
remains 14/16 and the project remains 13/22.

## Delivered build boundary

The Expo application now has a reproducible Android native build path pinned to
pnpm 9.12.0, Expo 54.0.37, React Native 0.81.5, JDK 17, Android SDK 36,
Build Tools 36.0.0, NDK 27.1.12297006 and CMake 3.22.1. The build runs Expo
prebuild without dependency installation, proves that Metro resolves the shared
workspace graph, builds the native package and emits a content-addressed receipt.

Two artifacts have intentionally different purposes:

- `app-debug.apk` is the development package and requires Metro;
- `app-release.apk` is an installable standalone internal preview with the JS
  bundle embedded. It uses the Android debug key and the reserved
  `starcraft-tmg-preview.invalid` App Link origin, so it is not a store or
  production-distribution artifact.

Both packages use `app.projectd.starcrafttmg`, min SDK 24, target/compile SDK
36 and the arm64-v8a plus armeabi-v7a ABIs. The final merged manifests exclude
microphone, read-external-storage and write-external-storage permissions.
Audio playback, haptics, file sharing and network access remain available.

The client manifest is aligned with the installed Expo SDK. Expo Doctor passes
18/18 checks, the Expo TypeScript check passes, and the relevant Slice 141
regression gates pass. Two independent Android development Metro exports match
at 11,132,078 bytes with SHA-256
`0a72a1c879d5a6b1e5388e7100a4cb6f1d028abd3918504656b7caa9b1efb882`.
The debug APK is 95,841,830 bytes with SHA-256
`27ddf9c57177c6d2f6cf38b2982e3f5de138b57d08f628296fc5b99e32b4635d`.
The standalone preview APK is 52,079,936 bytes with SHA-256
`17a38c8010d0fc5fcd598d69da59a5e79173ff9c21d8e9d4487c3ab240960dbe`.
The complete native-build verifier passes 16/16 with receipt
`70e0b107c1f5eb17bc6309717939fd9370e03119356fb5648b09a793e4dc4691`.

## Explicitly deferred evidence

No physical Android device is currently connected. At the user's direction,
installation, cold launch, foreground/background lifecycle, persisted
viewer-projection storage, public/invite deep links, haptics, file sharing,
BGM/voice playback, Preview → human Confirm → Apply and offline/online reconnect
are deferred until the complete development batch is ready for device testing.
The `verify:ticket-14-native-device` gate remains fail-closed until a physical
device and validated receipt are present.

The host has Apple Command Line Tools but not full Xcode, so no iOS native build
is claimed. Final iOS packaging and device acceptance require a full Xcode host
and Apple signing configuration.

## Authority and AI boundary

These packages contain no BYOK credential, Provider secret, DSH runtime,
generated Skill, MuZero trajectory or training truth. The current Character
package and Adjutant presentation are client features only. Ticket 15 mounts
online role-Agent sessions; Ticket 16 adds isolated secure BYOK Provider
execution; Tickets 17–18 add real DSH candidate generation and durable Skill
evaluation/promotion. Completing those client surfaces will require a later
package rebuild, while the credentials and Skill runtime remain server-side.

No official-source refresh was performed.
