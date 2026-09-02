import { STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1 } from "./source-registry-v1.mjs";
import { createStarcraftTmgSourceDescriptor } from "../packages/source-data/source-registry-v1.mjs";

export const STARCRAFT_TMG_OFFICIAL_COMMAND_CENTER_SOURCE_DESCRIPTOR_V2 =
  createStarcraftTmgSourceDescriptor({
    sourceId: "starcraft-tmg.official.command-center",
    displayName: "StarCraft TMG official Command Center",
    publisher: "Archon Studio / StarCraft TMG product",
    sourceClass: "official_product_backend_candidate",
    authorityClass: "canonical_product_data_candidate",
    canonicalScopes: [
      "current_unit_profiles_candidate",
      "current_tactical_card_profiles_candidate",
      "current_mission_profiles_candidate",
      "current_deployment_profiles_candidate",
      "official_rule_prose_review_input",
    ],
    prohibitedScopes: [
      "canonical_rules_without_rulebook_precedence",
      "community_content_as_official",
      "repository_or_legacy_fallback",
      "translation_as_canonical",
      "training_truth",
    ],
    sourceUrl: "https://sc.starcraft-tmg.com/",
    transport: {
      kind: "command_center_plus_named_firestore_rest",
      firestoreProjectId: "starcrafttmgbeta",
      firestoreDatabaseId: "starcrafttmgbeta",
      collections: ["army_units", "faction_cards", "rules_sections", "tactical_cards"],
      frozenDevelopmentLockHash: "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1",
      frozenDataVersions: { unitsVersion: "71", cardsVersion: "69", rulesVersion: "48" },
    },
    license: {
      status: "official_product_copyright_independent_redistribution_review_required",
      redistributionAllowed: false,
    },
    review: {
      status: "captured_and_contract_verified_independent_production_review_pending",
      reviewerRequired: true,
    },
    snapshotPolicy: {
      rawSnapshotRequired: true,
      immutable: true,
      perDocumentHashRequired: true,
      explicitUserCommandRequiredForRefresh: true,
      roomSnapshotPinRequired: true,
    },
    notes: [
      "This v2 descriptor binds the captured official Command Center source used by the rules kernel.",
      "The historical v1 product-firestore descriptor remains displayable but is never a runtime fallback.",
      "Community records remain display-only even when transported by the same Firestore collection.",
      "Translation may add provenance-bearing display text only and cannot change the captured payload.",
    ],
  });

export const STARCRAFT_TMG_SOURCE_DESCRIPTORS_V2 = Object.freeze([
  ...STARCRAFT_TMG_SOURCE_DESCRIPTORS_V1,
  STARCRAFT_TMG_OFFICIAL_COMMAND_CENTER_SOURCE_DESCRIPTOR_V2,
]);
