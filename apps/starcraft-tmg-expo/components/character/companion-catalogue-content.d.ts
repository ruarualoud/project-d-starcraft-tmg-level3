/**
 * Type declarations for the Ticket 26 / Slice 265 presentation-only
 * companion content modules (content/characters/*.mjs). These mirror the
 * frozen pack/portrait-state shapes; the .mjs files remain the source of
 * truth.
 */

declare module "*/content/characters/companion-catalogue-v1.mjs" {
  export interface CompanionPackEra {
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
  export interface CompanionPackFact {
    factId: string;
    summary: string;
    sourceRefs: string[];
    provenanceClass: string;
  }
  export interface CompanionPackWorldbookEntry {
    entryId: string;
    title: string;
    titleZh: string;
    content: string;
    canonStatus: string;
    sourceRefs: string[];
    activation: { always: boolean; modes: string[] };
  }
  export interface CompanionPack {
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
      facts: CompanionPackFact[];
    };
    eras: CompanionPackEra[];
    relationships: { subject: string; object: string; relation: string; canonStatus: string; sourceRefs: string[] }[];
    knowledgeBoundaries: {
      spoilerCeilingDefaultRank: number;
      blocksLaterTimeline: boolean;
      crossEraMerge: string;
      unresolvedContradictions: string[];
    };
    worldbookEntries: CompanionPackWorldbookEntry[];
    tacticalIdentity: {
      tmgAlignment: string;
      factionTagStatus: string;
      doctrineHints: string[];
      authoringClass: string;
      rulesAuthority: string;
      matchStateSource: string;
    };
    packHash: string;
  }
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
    eraCount: number;
    defaultPersonaState: string;
    portraitStatesRef: string;
    portraitStatus: string;
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
  stateContractHash: string;
}
