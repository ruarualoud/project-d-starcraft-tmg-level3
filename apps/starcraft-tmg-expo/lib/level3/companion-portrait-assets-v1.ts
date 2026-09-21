/**
 * Companion portrait asset bindings — Ticket 26 / Slice 266b SS-2.
 *
 * PRESENTATION-ONLY bridge between the committed, audit-admitted portrait
 * keyframes under `assets/characters/` and the Web/App companion catalogue /
 * floating companion UI. Every binding records the repo-relative asset path,
 * the audit-pinned sha256 content hash, and an honest availability class:
 *
 *   - `admitted_keyframe`      — a real committed per-state keyframe.
 *   - `shared_approved_frame`  — the state intentionally reuses another
 *                                approved frame (Kerrigan `damaged_concerned`
 *                                binds the approved `warning` frame); the UI
 *                                must label this, never pretend a dedicated
 *                                frame exists.
 *   - `missing`                — no committed asset; the UI must render the
 *                                labelled unavailable fallback, never another
 *                                character's frame and never a fabricated one.
 *
 * The registry is data-driven: a seventh companion appends one record to
 * COMPANION_PORTRAIT_ASSETS_V1 (plus its catalogue entry); UI control flow
 * never changes. Metro bundles the assets through static `require` literals;
 * the factories are invoked lazily and fail closed to `null` outside the
 * Metro runtime (e.g. Node-side component tests), where the honest fallback
 * renders instead of a crash.
 *
 * The six semantic states are admitted STATIC keyframes, not a proven
 * continuous animation (visual audits 2026-09-21 / 2026-09-22). Nothing here
 * plays them as a loop, and nothing here is gameplay truth.
 */

export type CompanionPortraitStateId =
  | "idle"
  | "speaking"
  | "listening"
  | "alert_combat"
  | "damaged_concerned"
  | "reflective";

export type CompanionPortraitAvailability =
  | "admitted_keyframe"
  | "shared_approved_frame"
  | "missing";

export interface CompanionPortraitFrameAsset {
  stateId: CompanionPortraitStateId;
  /** Repo-relative committed asset path (truthful label shown in UI). */
  assetPath: string;
  /** Audit/receipt-pinned sha256 of the committed file. */
  contentHash: string;
  availability: CompanionPortraitAvailability;
  /** Set when availability === "shared_approved_frame". */
  sharedWithStateId?: CompanionPortraitStateId;
  /** Audit document or receipt contract that admits this frame. */
  admissionRef: string;
}

export interface CompanionPortraitAssetSet {
  characterId: string;
  assetDirectory: string;
  admissionClass:
    | "audit_admitted_static_keyframes"
    | "receipted_dynamic_contract_frames";
  /** Honest animation status shared by every set in this slice. */
  animationStatus: "keyframe_only_continuous_animation_not_proven";
  states: readonly CompanionPortraitFrameAsset[];
}

const RAYNOR_AUDIT =
  "docs/ticket-26-slice-266-raynor-nova-visual-audit-v1-2026-09-22.md";
const OFFICIAL_AUDIT =
  "docs/ticket-26-slice-266-official-companion-visual-audit-v1-2026-09-21.md";
const KERRIGAN_RECEIPTS =
  "content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs";

/**
 * Static Metro requires, one per committed frame, keyed
 * `${characterId}/${stateId}`. Never call at module scope.
 */
const SOURCE_FACTORIES: Record<string, () => number> = {
  "starcraft.jim_raynor/idle": () =>
    require("../../../../assets/characters/raynor-adjutant/idle-v1.png"),
  "starcraft.jim_raynor/speaking": () =>
    require("../../../../assets/characters/raynor-adjutant/speaking-v1.png"),
  "starcraft.jim_raynor/listening": () =>
    require("../../../../assets/characters/raynor-adjutant/listening-v1.png"),
  "starcraft.jim_raynor/alert_combat": () =>
    require("../../../../assets/characters/raynor-adjutant/alert-combat-v1.png"),
  "starcraft.jim_raynor/damaged_concerned": () =>
    require("../../../../assets/characters/raynor-adjutant/damaged-concerned-v1.png"),
  "starcraft.jim_raynor/reflective": () =>
    require("../../../../assets/characters/raynor-adjutant/reflective-v1.png"),
  "starcraft.nova_terra/idle": () =>
    require("../../../../assets/characters/nova-adjutant/idle-v1.png"),
  "starcraft.nova_terra/speaking": () =>
    require("../../../../assets/characters/nova-adjutant/speaking-v1.png"),
  "starcraft.nova_terra/listening": () =>
    require("../../../../assets/characters/nova-adjutant/listening-v1.png"),
  "starcraft.nova_terra/alert_combat": () =>
    require("../../../../assets/characters/nova-adjutant/alert-combat-v1.png"),
  "starcraft.nova_terra/damaged_concerned": () =>
    require("../../../../assets/characters/nova-adjutant/damaged-concerned-v1.png"),
  "starcraft.nova_terra/reflective": () =>
    require("../../../../assets/characters/nova-adjutant/reflective-v1.png"),
  "starcraft.artanis/idle": () =>
    require("../../../../assets/characters/artanis-adjutant/idle-v2.png"),
  "starcraft.artanis/speaking": () =>
    require("../../../../assets/characters/artanis-adjutant/speaking-v3.png"),
  "starcraft.artanis/listening": () =>
    require("../../../../assets/characters/artanis-adjutant/listening-v3.png"),
  "starcraft.artanis/alert_combat": () =>
    require("../../../../assets/characters/artanis-adjutant/alert-combat-v3.png"),
  "starcraft.artanis/damaged_concerned": () =>
    require("../../../../assets/characters/artanis-adjutant/damaged-concerned-v3.png"),
  "starcraft.artanis/reflective": () =>
    require("../../../../assets/characters/artanis-adjutant/reflective-v3.png"),
  "starcraft.zeratul/idle": () =>
    require("../../../../assets/characters/zeratul-adjutant/idle-v2.png"),
  "starcraft.zeratul/speaking": () =>
    require("../../../../assets/characters/zeratul-adjutant/speaking-v3.png"),
  "starcraft.zeratul/listening": () =>
    require("../../../../assets/characters/zeratul-adjutant/listening-v3.png"),
  "starcraft.zeratul/alert_combat": () =>
    require("../../../../assets/characters/zeratul-adjutant/alert-combat-v3.png"),
  "starcraft.zeratul/damaged_concerned": () =>
    require("../../../../assets/characters/zeratul-adjutant/damaged-concerned-v3.png"),
  "starcraft.zeratul/reflective": () =>
    require("../../../../assets/characters/zeratul-adjutant/reflective-v3.png"),
  "starcraft.zagara/idle": () =>
    require("../../../../assets/characters/zagara-adjutant/idle-v2.png"),
  "starcraft.zagara/speaking": () =>
    require("../../../../assets/characters/zagara-adjutant/speaking-v3.png"),
  "starcraft.zagara/listening": () =>
    require("../../../../assets/characters/zagara-adjutant/listening-v3.png"),
  "starcraft.zagara/alert_combat": () =>
    require("../../../../assets/characters/zagara-adjutant/alert-combat-v3.png"),
  "starcraft.zagara/damaged_concerned": () =>
    require("../../../../assets/characters/zagara-adjutant/damaged-concerned-v3.png"),
  "starcraft.zagara/reflective": () =>
    require("../../../../assets/characters/zagara-adjutant/reflective-v3.png"),
  // Kerrigan: approved dynamic portrait contract frames (receipt-bound). The
  // six semantic states map onto five receipted frames; damaged_concerned
  // honestly shares the warning frame (shared_approved_frame below).
  "starcraft.sarah_kerrigan/idle": () =>
    require("../../../../assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-neutral-v1.png"),
  "starcraft.sarah_kerrigan/speaking": () =>
    require("../../../../assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-speaking-v1.png"),
  "starcraft.sarah_kerrigan/listening": () =>
    require("../../../../assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-blink-v1.png"),
  "starcraft.sarah_kerrigan/alert_combat": () =>
    require("../../../../assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-warning-v1.png"),
  "starcraft.sarah_kerrigan/damaged_concerned": () =>
    require("../../../../assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-warning-v1.png"),
  "starcraft.sarah_kerrigan/reflective": () =>
    require("../../../../assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-reflect-v1.png"),
};

function frame(
  characterId: string,
  directory: string,
  stateId: CompanionPortraitStateId,
  file: string,
  contentHash: string,
  admissionRef: string,
  extra: Partial<CompanionPortraitFrameAsset> = {},
): CompanionPortraitFrameAsset {
  return {
    stateId,
    assetPath: `${directory}/${file}`,
    contentHash,
    availability: "admitted_keyframe",
    admissionRef,
    ...extra,
  };
}

function admittedSet(
  characterId: string,
  directory: string,
  files: Record<CompanionPortraitStateId, [string, string]>,
  admissionRef: string,
): CompanionPortraitAssetSet {
  return {
    characterId,
    assetDirectory: directory,
    admissionClass: "audit_admitted_static_keyframes",
    animationStatus: "keyframe_only_continuous_animation_not_proven",
    states: (Object.entries(files) as [CompanionPortraitStateId, [string, string]][])
      .map(([stateId, [file, hash]]) => frame(
        characterId, directory, stateId, file, hash, admissionRef,
      )),
  };
}

/**
 * Registration order matches the catalogue roster (Kerrigan first). A
 * seventh companion appends one record here — no UI control-flow change.
 */
export const COMPANION_PORTRAIT_ASSETS_V1: readonly CompanionPortraitAssetSet[] = [
  {
    characterId: "starcraft.sarah_kerrigan",
    assetDirectory: "assets/characters/kerrigan-primal-adjutant",
    admissionClass: "receipted_dynamic_contract_frames",
    animationStatus: "keyframe_only_continuous_animation_not_proven",
    states: [
      frame("starcraft.sarah_kerrigan", "assets/characters/kerrigan-primal-adjutant",
        "idle", "kerrigan-sc1-dialogue-neutral-v1.png",
        "40ecb9bf87cdbcf15b42a8cb910d5142a128490a43043433cc469c5efec53edd", KERRIGAN_RECEIPTS),
      frame("starcraft.sarah_kerrigan", "assets/characters/kerrigan-primal-adjutant",
        "speaking", "kerrigan-sc1-dialogue-speaking-v1.png",
        "d64aa639b0ced17fbef9ba811a6093298a404517ae09eb4c1392de4167444c7e", KERRIGAN_RECEIPTS),
      frame("starcraft.sarah_kerrigan", "assets/characters/kerrigan-primal-adjutant",
        "listening", "kerrigan-sc1-dialogue-blink-v1.png",
        "4b1b1b9fb76f7448c2bfed97dadbb41d7da2d37cd56bdb1863ac37a7062324f0", KERRIGAN_RECEIPTS),
      frame("starcraft.sarah_kerrigan", "assets/characters/kerrigan-primal-adjutant",
        "alert_combat", "kerrigan-sc1-dialogue-warning-v1.png",
        "77baaba304278c8d1de88f4d4c2c6b634ef00340230da5e2de2412f6c8823b0d", KERRIGAN_RECEIPTS),
      frame("starcraft.sarah_kerrigan", "assets/characters/kerrigan-primal-adjutant",
        "damaged_concerned", "kerrigan-sc1-dialogue-warning-v1.png",
        "77baaba304278c8d1de88f4d4c2c6b634ef00340230da5e2de2412f6c8823b0d", KERRIGAN_RECEIPTS, {
          availability: "shared_approved_frame",
          sharedWithStateId: "alert_combat",
        }),
      frame("starcraft.sarah_kerrigan", "assets/characters/kerrigan-primal-adjutant",
        "reflective", "kerrigan-sc1-dialogue-reflect-v1.png",
        "7938ecc1aab4aa4eee7f86d12e473a3903fade7dcbde1c0d7e92ba8154b9989b", KERRIGAN_RECEIPTS),
    ],
  },
  admittedSet("starcraft.zagara", "assets/characters/zagara-adjutant", {
    idle: ["idle-v2.png", "909339fa55bde0d4a2ce256bbddfb519baf7eacd814a0deab5bb19f96aabc36e"],
    speaking: ["speaking-v3.png", "511b8531935efff11bc828cb154d9609fe248e66ddb7b7330319d90c6ed4e9f0"],
    listening: ["listening-v3.png", "e2b83b61a45fc148549efb902be5843e3868662408c73c4f118f06c156e624a1"],
    alert_combat: ["alert-combat-v3.png", "c40a4f2a1a901acdd6368d3ac0cb5fd832ffc73fc8cdf6db65e6f4242072ad00"],
    damaged_concerned: ["damaged-concerned-v3.png", "b239e87268f4cc00ae32f5eba31211e0367458f6287e4f6fe62cc49d146b8f88"],
    reflective: ["reflective-v3.png", "2dbe9b192ba91168037804447e804e3dd051cb3cf27ada0d8e11a7e63479a3db"],
  }, OFFICIAL_AUDIT),
  admittedSet("starcraft.jim_raynor", "assets/characters/raynor-adjutant", {
    idle: ["idle-v1.png", "7ccea1bc8e16851c0c990ac1bccb428accde52ff91172c9e0b46aa395b17f012"],
    speaking: ["speaking-v1.png", "00b6b055e5172882f3e1d1c0c8312cc3f8335caf3ffabd0bc1715f9b5cd3e5f1"],
    listening: ["listening-v1.png", "046684054fd26db951b639bb7507db14cc9499c7b474ae42031ec29ffd37175e"],
    alert_combat: ["alert-combat-v1.png", "dc0b59b6f30d09fb715b513e3fbd9e02d94ad51dd20f642c44356f5f6a5629cf"],
    damaged_concerned: ["damaged-concerned-v1.png", "a31c350799ecf92340b28d3f64bd93954b7057f308fc8e8369030bcb6616243b"],
    reflective: ["reflective-v1.png", "cff0f1546988f96a17106aad2b1ddee578c1306b591efa000695c605bd830ace"],
  }, RAYNOR_AUDIT),
  admittedSet("starcraft.nova_terra", "assets/characters/nova-adjutant", {
    idle: ["idle-v1.png", "b2ac717e1dce78bd95dc1ed22d2a24522e46754047b5890e46ca65bb335cc477"],
    speaking: ["speaking-v1.png", "cae2e9474306d4e88af98c25eeaee37e9c8aa11d2d8fc9d8d9fb756a3432ea6a"],
    listening: ["listening-v1.png", "5a72890e1f6c2d5931036cbd498c939ab15d6a36fb3443030d774c583a284633"],
    alert_combat: ["alert-combat-v1.png", "ab1b267bccef3faa030425ff0f85978186d0f80271a4e9a8e61596839efc5644"],
    damaged_concerned: ["damaged-concerned-v1.png", "831c968de1649959e3691a053b1ec1404f26195c4744276805d98d45ca2bf5ba"],
    reflective: ["reflective-v1.png", "30b1a0559a187f2aee68a6938872d69fdad04f79a98c66c0fa08aa05a78686f6"],
  }, RAYNOR_AUDIT),
  admittedSet("starcraft.artanis", "assets/characters/artanis-adjutant", {
    idle: ["idle-v2.png", "e4e93c4e7c7d38270554873598ac8599b8b38d3739b9524b003f44e040b56fde"],
    speaking: ["speaking-v3.png", "98613331e8d5134a125a83fa7287caea9fd8efdeb086b18951a3658c0fdf61e9"],
    listening: ["listening-v3.png", "05d508c9c6b54e864f3cda1740ee4c1c54c94e4c045f02c0ea84cd43d049de24"],
    alert_combat: ["alert-combat-v3.png", "2ee959368494f9b09eae21ed988766d604448a484aad11a90f2fbf761489e101"],
    damaged_concerned: ["damaged-concerned-v3.png", "0c778fdb01222408c463ec75e213efb9e50006e09d59b9afe832b79a127f5ee6"],
    reflective: ["reflective-v3.png", "11564352a232c2f10e9520f3aa46eb81e598b6c398834b199da035d3f35bf5d4"],
  }, OFFICIAL_AUDIT),
  admittedSet("starcraft.zeratul", "assets/characters/zeratul-adjutant", {
    idle: ["idle-v2.png", "a0a07788bae197979542a5ac02da370a23d09ca5e8bd54d19d7bf56ac47f80ba"],
    speaking: ["speaking-v3.png", "9470436399bd495060c30cccd4f002470214713ceb980d2ff30bbe52d81a8738"],
    listening: ["listening-v3.png", "461d86bc3bb602fcef1e3b1c3ed7a251732bb6685429ee1f579f1b0696895a3a"],
    alert_combat: ["alert-combat-v3.png", "807eece5b0eb4ef37497e2872089cb9857f1e9df58b34b3c4e328d23e074c28e"],
    damaged_concerned: ["damaged-concerned-v3.png", "f8fdf78c3ec51752f470bf44db2ef31d97d837c33217027c1bd18ea92acd9ed6"],
    reflective: ["reflective-v3.png", "8f2c3f7754c2182d21d694364459629e5b35ef23f4917bf54dff692b3923738f"],
  }, OFFICIAL_AUDIT),
];

const sourceCache = new Map<string, number | null>();

/**
 * Resolve the Metro-bundled asset for one character/state. Returns `null`
 * when no binding exists or when the Metro runtime is unavailable (Node-side
 * tests) — callers render the labelled unavailable fallback, never another
 * character's frame.
 */
export function resolveCompanionPortraitAssetSourceV1(
  characterId: string,
  stateId: CompanionPortraitStateId,
): number | null {
  const key = `${characterId}/${stateId}`;
  if (!sourceCache.has(key)) {
    const factory = SOURCE_FACTORIES[key];
    let resolved: number | null = null;
    if (factory) {
      try {
        resolved = factory();
      } catch {
        resolved = null;
      }
    }
    sourceCache.set(key, resolved);
  }
  return sourceCache.get(key) ?? null;
}

export function companionPortraitAssetSetV1(
  characterId: string,
): CompanionPortraitAssetSet | null {
  return COMPANION_PORTRAIT_ASSETS_V1.find((set) => set.characterId === characterId) || null;
}

export function companionPortraitFrameAssetV1(
  characterId: string,
  stateId: CompanionPortraitStateId,
): CompanionPortraitFrameAsset | null {
  return companionPortraitAssetSetV1(characterId)
    ?.states.find((state) => state.stateId === stateId) || null;
}
