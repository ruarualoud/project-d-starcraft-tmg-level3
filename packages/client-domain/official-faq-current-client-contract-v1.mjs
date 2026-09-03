import { OFFICIAL_FAQ_F3_ATOM_BINDING_V1 } from
  "../../content/official-faq-f3-movement-battlefield-deployment-binding-v1.mjs";
import { OFFICIAL_FAQ_F4_ATOM_BINDING_V1 } from
  "../../content/official-faq-f4-ability-tactical-keyword-binding-v1.mjs";
import { hashStarcraftTmgClientContract } from "./portable-contract-hash-v1.mjs";

export const STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_VERSION =
  "starcraft_tmg_official_faq_current_client_contract_v1";

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

const tokenMarkerAtoms = [...OFFICIAL_FAQ_F3_ATOM_BINDING_V1,
  ...OFFICIAL_FAQ_F4_ATOM_BINDING_V1]
  .filter((atom) => atom.tokenMarkerImpact === true)
  .map((atom) => ({
    atomId: atom.atomId,
    entryId: atom.entryId,
    behaviorKey: atom.behaviorKey,
    primitive: atom.primitive,
    kind: atom.kind,
    reads: [...atom.reads],
    writes: [...atom.writes],
  }))
  .sort((left, right) => left.atomId.localeCompare(right.atomId));

const body = {
  schemaVersion: STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_VERSION,
  gameId: "starcraft-tmg",
  rulesVersion: "official-faq-v1.0-current",
  sourceLockHash: "2881adb2a4e0475f07bb17aebf02e64f35c9073f274cec2cf0a8f770f8647226",
  reconciliationHash: "081f95c49917d8545a36b74a0f4e5479754453349d288ef369d53170195eac68",
  aggregateHash: "cc3ab3d151d96af101aecb249422c816076ee251f66326659830743fbe6b4d2e",
  catalogueHash: "c2ed9b51482c2d83767fd1e2d41b5cfc5a3f9db97e6c408e4579d7ee2aab208f",
  runtimeHash: "82d436a60751a82dfb1a2ad7686cb47d6855883709460128e50baa72c1dbb6fd",
  graphHash: "ac3b6d556cca6ec0ae42bef78c276289954084c248e996a6d00d7d1261d1659a",
  tokenMarkerContractHash:
    "f42f79c57d7fda3581a678b14a9d603d9630c1f7178aecf9f08acbb40f912c49",
  counts: {
    atomCount: 1163,
    executableAtomCount: 1049,
    displayOnlyAtomCount: 114,
    executorCount: 83,
    faqEntryCount: 68,
    faqAtomCount: 137,
  },
  relationshipGraph: {
    compositionNodeCount: 567,
    compositionEdgeCount: 1308,
    referencedBaseGraphHash:
      "63f37c40a54006ab67096df72b9e2e9f6b6836c38d82aad3ee10d6d41017e44c",
    referencedBaseNodeCount: 12292,
    referencedBaseEdgeCount: 33644,
  },
  tokenMarker: {
    entryIds: [...new Set(tokenMarkerAtoms.map((atom) => atom.entryId))].sort(),
    atomIds: tokenMarkerAtoms.map((atom) => atom.atomId),
    entries: 12,
    faqAtoms: tokenMarkerAtoms.length,
    directlyNamedBaseAtoms: 69,
    genericBasePrimitives: 11,
    denominatorPolicy:
      "base_direct_names_generic_primitives_and_faq_impacts_overlap_and_must_not_be_summed_as_actions",
    rulesOwnedWriteOnly: true,
    unclassifiedActionPolicy: "fail_closed",
    atoms: tokenMarkerAtoms,
  },
  roomBindings: {
    current: {
      catalogueHash: "c2ed9b51482c2d83767fd1e2d41b5cfc5a3f9db97e6c408e4579d7ee2aab208f",
      runtimeHash: "82d436a60751a82dfb1a2ad7686cb47d6855883709460128e50baa72c1dbb6fd",
      executableRuleAtomCount: 1049,
      nonExecutableRuleAtomCount: 114,
    },
    historicalPreFaq: {
      rulesVersion: "official-pre-faq-ticket11",
      sourceLockHash:
        "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1",
      catalogueHash: "5b3bd5d65a6e3478e98536e7fb71133fd0624c99cccbc47c886c96f731c16d46",
      runtimeHash: "6e3527cea5b9a005bb5462eb33bc8f2a7a3a93636778ae9a6daec2d8fab903b9",
      graphHash: "63f37c40a54006ab67096df72b9e2e9f6b6836c38d82aad3ee10d6d41017e44c",
      executableRuleAtomCount: 912,
      nonExecutableRuleAtomCount: 114,
      displayRetained: true,
      replayRetained: true,
    },
  },
  directClientMutationAllowed: false,
  productionRoomTruth: false,
  trainingTruth: false,
};

export const STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1 = freeze({
  ...body,
  clientContractHash: hashStarcraftTmgClientContract(body),
});
