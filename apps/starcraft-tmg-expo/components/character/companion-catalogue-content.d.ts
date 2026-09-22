/**
 * Type declarations for the Ticket 26 / Slices 265+266b presentation-only
 * companion content modules (content/characters/*.mjs). These mirror the
 * frozen pack/portrait-state shapes; the .mjs files remain the source of
 * truth.
 */

/** Shared pack shape (global so each pack module declaration can use it). */
interface CompanionPresentationPackV1 {
  schemaVersion: string;
  packId: string;
  characterId: string;
  version: string;
  presentationOnly: boolean;
  backendPromotionStatus: string;
  identity: {
    displayName: string;
    displayNameZh: string;
    aliases: string[];
    factionAlignment: string;
    factionColor: string;
    productRole: string;
    productRoleIsCanon: boolean;
    tagline: string;
    taglineZh: string;
  };
  biography: {
    authoringClass: string;
    summary: string;
    summaryZh: string;
    facts: CompanionPresentationPackFactV1[];
  };
  voiceTone: Record<string, unknown>;
  eras: CompanionPresentationPackEraV1[];
  relationships: { subject: string; object: string; relation: string; canonStatus: string; sourceRefs: string[] }[];
  knowledgeBoundaries: {
    spoilerCeilingDefaultRank: number;
    blocksLaterTimeline: boolean;
    crossEraMerge: string;
    unresolvedContradictions: string[];
  };
  worldbookEntries: CompanionPresentationPackWorldbookEntryV1[];
  authorNote: CompanionPresentationPackAuthorNoteV1;
  tacticalIdentity: {
    tmgAlignment: string;
    factionTagStatus: string;
    doctrineHints: string[];
    authoringClass: string;
    rulesAuthority: string;
    matchStateSource: string;
  };
  visualAssets: {
    status: string;
    admissionClass?: string;
    stateContractRef: string;
    auditRef?: string;
    generationBriefsRef?: string;
    receiptPolicy: string;
    interimPresentation: string;
  };
  authority: Record<string, unknown>;
  sources: Record<string, unknown>;
  tags: string[];
  packHash: string;
}
interface CompanionPresentationPackEraV1 {
  personaState: string;
  worldbookId: string;
  title: string;
  titleZh: string;
  timeline: { start: string; end: string };
  knowledgeCutoff: string;
  knowledgeRank: number;
  spoilerLevel: string;
  spoilerRank: number;
  defaultSelected?: boolean;
}
interface CompanionPresentationPackFactV1 {
  factId: string;
  summary: string;
  sourceRefs: string[];
  provenanceClass: string;
}
interface CompanionPresentationPackWorldbookEntryV1 {
  entryId: string;
  title: string;
  titleZh: string;
  content: string;
  canonStatus: string;
  sourceRefs: string[];
  activation: { always: boolean; modes: string[] };
}
interface CompanionPresentationPackAuthorNoteV1 {
  authoringClass: string;
  note: string;
  noteZh: string;
  depth: number;
  frequency: number;
  sourceRefs: string[];
}

declare module "*/content/characters/companion-catalogue-v1.mjs" {
  export interface CompanionPackEra extends CompanionPresentationPackEraV1 {}
  export interface CompanionPackFact extends CompanionPresentationPackFactV1 {}
  export interface CompanionPackWorldbookEntry extends CompanionPresentationPackWorldbookEntryV1 {}
  export interface CompanionPack extends CompanionPresentationPackV1 {}
  export interface CompanionCatalogueEntry {
    characterId: string;
    displayName: string;
    displayNameZh: string;
    factionAlignment: string;
    factionColor: string;
    roleLabel: string;
    roleLabelZh: string;
    packStatus: string;
    pack?: CompanionPack;
    referencePointer?: { packageFile: string; worldbookCatalogFile: string; note: string; noteZh: string };
    defaultCompanion?: boolean;
    eraCount: number;
    defaultPersonaState: string;
    portraitStatesRef: string;
    portraitStatus: string;
    portraitAdmissionClass?: string;
    portraitSharedStates?: string;
    portraitAuditRef?: string;
  }
  export const COMPANION_CATALOGUE_V1: {
    schemaVersion: string;
    catalogueId: string;
    version: string;
    presentationOnly: boolean;
    entries: CompanionCatalogueEntry[];
    honestyNotes: string[];
    catalogueHash: string;
  };
}

declare module "*/content/characters/raynor-portrait-states-v1.mjs" {
  export const RAYNOR_PORTRAIT_STATE_CONTRACT_V1: CompanionPortraitStateContract;
}

declare module "*/content/characters/artanis-portrait-states-v1.mjs" {
  export const ARTANIS_PORTRAIT_STATE_CONTRACT_V1: CompanionPortraitStateContract;
}

declare module "*/content/characters/nova-companion-pack-v1.mjs" {
  export const NOVA_COMPANION_PACK_V1: CompanionPresentationPackV1;
}

declare module "*/content/characters/kerrigan-companion-pack-v1.mjs" {
  export const KERRIGAN_COMPANION_PACK_V1: CompanionPresentationPackV1;
}

declare module "*/content/characters/zagara-companion-pack-v1.mjs" {
  export const ZAGARA_COMPANION_PACK_V1: CompanionPresentationPackV1;
}

declare module "*/content/characters/zeratul-companion-pack-v1.mjs" {
  export const ZERATUL_COMPANION_PACK_V1: CompanionPresentationPackV1;
}

declare module "*/content/characters/nova-portrait-states-v1.mjs" {
  export const NOVA_PORTRAIT_STATE_CONTRACT_V1: CompanionPortraitStateContract;
}

declare module "*/content/characters/zagara-portrait-states-v1.mjs" {
  export const ZAGARA_PORTRAIT_STATE_CONTRACT_V1: CompanionPortraitStateContract;
}

declare module "*/content/characters/zeratul-portrait-states-v1.mjs" {
  export const ZERATUL_PORTRAIT_STATE_CONTRACT_V1: CompanionPortraitStateContract;
}

declare module "*/content/characters/companion-portrait-animation-binding-v1.mjs" {
  export const COMPANION_PORTRAIT_ANIMATION_STATE_IDS: readonly string[];
  export const COMPANION_PORTRAIT_ANIMATION_SIGNAL_PRIORITY: readonly string[];
  export function resolveCompanionPortraitAnimationStateV1(signals?: {
    sessionError?: boolean;
    interrupted?: boolean;
    thinking?: boolean;
    speaking?: boolean;
    composing?: boolean;
  }): string;
  export function companionPortraitAnimationTransitionV1(
    stateId: string,
    options?: { reducedMotion?: boolean },
  ): {
    stateId: string;
    requestedStateId: string;
    failClosedToIdle: boolean;
    durationMs: number;
    curve: string;
    motion: string;
    reducedMotionStatic: boolean;
    reducedMotion: string;
  };
  export function companionPortraitAnimationStatesV1(
    characterId: string,
  ): readonly string[] | null;
  export const COMPANION_PORTRAIT_ANIMATION_BINDING_V1: {
    schemaVersion: string;
    bindingId: string;
    version: string;
    presentationOnly: boolean;
    bindingHash: string;
    entries: {
      characterId: string;
      packageId: string;
      boundStateIds: string[];
      complete: boolean;
    }[];
    honestyNotes: string[];
  };
}

interface CompanionPortraitStateContract {
  schemaVersion: string;
  contractId: string;
  characterId: string;
  version: string;
  presentationOnly: boolean;
  states: {
    stateId: string;
    frameRole: string;
    phase: string;
    trigger: string;
    reducedMotion: string;
    deterministicFallback: string;
  }[];
  animationStatus?: string;
  frameBindings?: {
    stateId: string;
    frameRole: string;
    assetRef: string;
    contentHash: string | null;
    admissionClass?: string;
    admissionRef?: string;
    generationReceiptHash: string | null;
  }[];
  reducedMotionPolicy?: string;
  stateContractHash: string;
}
