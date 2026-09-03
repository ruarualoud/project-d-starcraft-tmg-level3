export const STARCRAFT_TMG_BATTLEFIELD_MEDIA_PROVENANCE_V1 = Object.freeze({
  schemaVersion: "starcraft_tmg_battlefield_media_provenance_v1",
  frozenAt: "2026-09-03T12:00:00+08:00",
  inventory: Object.freeze({
    root: "assets/client/battlefield",
    fileCount: 67,
    byteLength: 8_225_970,
    sortedSha256InventoryHash:
      "203e6b9434e394194949e450db5445d6bdd9cba271e2408f87da940995146bba",
  }),
  generatedOriginals: Object.freeze({
    toolMode: "built_in_image_generation",
    promptSet: Object.freeze([
      "A clean 4x2 atlas of eight square StarCraft-inspired grim military sci-fi communications portraits: Marine, Marauder, Medic, Goliath, Zergling, Roach, Hydralisk, Queen; late-1990s RTS briefing-screen lighting, readable at token scale, no text or logos.",
      "Edit the same 4x2 communications portrait atlas into subtle active-dialogue variants with restrained mouth, eye, and monitor-light changes; preserve identity, layout, proportions, and non-anime late-1990s RTS style.",
      "A 3:2 top-down alien temple battlefield map, dark stone platforms, ramps, ruins, sparse vegetation and teal/amber tactical lighting; no grid, units, labels, logos, UI, or copyrighted characters.",
    ]),
    outputs: Object.freeze([
      Object.freeze({ path: "assets/client/battlefield/unit-comms-neutral-atlas-v1.webp", sha256: "a4463675540a80edb61fd5a6aaba5e678de5911dea4d8b513bfef7f19afcb621" }),
      Object.freeze({ path: "assets/client/battlefield/unit-comms-active-atlas-v1.webp", sha256: "d2b0288422accd486370e6e6b46dc654eea7bac158d8fdda5385d287e49a5c1a" }),
      Object.freeze({ path: "assets/client/battlefield/alien-temple-map-v1.webp", sha256: "9c7dcd35999b0a78083099c8d69fa495830b89337e42ca579ea303c1c1b132f2" }),
    ]),
    publicFallbackCropInventoryHash:
      "553d3d0687214a271faf00739a1b3a3bbbf4566cbc046b4b3ddb06936f79d916",
    publicDistributionAllowed: true,
  }),
  developmentInternalOriginalGameMedia: Object.freeze({
    releaseChannel: "development_internal",
    publicDistributionAllowed: false,
    runtimeDefaultEnabled: false,
    sourceSite: "StarCraft Wiki on Fandom",
    sourceApi: "https://starcraft.fandom.com/api.php",
    portraitDescriptionPages: Object.freeze({
      marine: "https://starcraft.fandom.com/wiki/File:Marine_SCR_HeadAnim.gif",
      medic: "https://starcraft.fandom.com/wiki/File:Medic_SCR_HeadAnim.gif",
      goliath: "https://starcraft.fandom.com/wiki/File:Goliath_SCR_HeadAnim.gif",
      zergling: "https://starcraft.fandom.com/wiki/File:Zergling_SCR_HeadAnim.gif",
      hydralisk: "https://starcraft.fandom.com/wiki/File:Hydralisk_SCR_HeadAnim.gif",
      queen: "https://starcraft.fandom.com/wiki/File:Queen_SCR_HeadAnim.gif",
    }),
    portraitInventoryHash:
      "3f224da32042d27586bd5b65ba8441dfb64ade749cdf5852700be3706e5f102f",
    voiceFamilies: Object.freeze({
      units: Object.freeze(["marine", "medic", "goliath", "zergling", "hydralisk", "queen"]),
      cues: Object.freeze(["What00", "What01", "Yes00", "Yes01", "Pissed00", "Pissed01", "Death00"]),
      codec: "Ogg Vorbis mono 22050Hz",
      voiceInventoryHash:
        "e7ff8cb2e4aa014b835ed207a26b708718d91b9fcb1b067f802b49b8e71ae763",
    }),
    rightsStatus: "rights_review_required_before_public_distribution",
  }),
  userAuthorizedPublicProjectUse: Object.freeze({
    releaseChannel: "public_user_authorized",
    recordedAt: "2026-09-03",
    scope: "current_battlefield_unit_portraits_and_voice_cues",
    authorizationBasis: "explicit_user_instruction_to_treat_material_as_public_project_material",
    sourceProvenancePreserved: true,
    independentThirdPartyRightsReviewCompleted: false,
    legalLicenseDeterminationMadeByProject: false,
    fallbackForMissingOriginals: "generated_original_public_fallback",
  }),
  bgm: Object.freeze({
    bundledClassicTracks: false,
    input: "user_selected_local_audio",
    startsMuted: true,
    userGestureRequired: true,
    officialContextUrl:
      "https://news.blizzard.com/en-us/article/20722027/the-sounds-of-koprulu",
  }),
  authorityBoundary: Object.freeze({
    affectsRules: false,
    affectsRandomness: false,
    affectsReceipts: false,
    affectsTraining: false,
    applyEventCuesRequireValidatedReceipt: true,
    previewMayTriggerCombatAudio: false,
  }),
  trainingTruth: false,
});
