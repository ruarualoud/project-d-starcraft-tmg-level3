export type StarcraftTmgPresentationCueKindV1 =
  | "operation_confirmed"
  | "attack_confirmed"
  | "target_damaged"
  | "model_destroyed";
export type StarcraftTmgPresentationVoiceIntentV1 =
  | "confirm"
  | "damaged"
  | "destroyed";
export interface StarcraftTmgPresentationCueV1 {
  schemaVersion: "starcraft_tmg_presentation_cue_v1";
  cueId: string;
  kind: StarcraftTmgPresentationCueKindV1;
  voiceIntent: StarcraftTmgPresentationVoiceIntentV1;
  sourceEventIndex: number;
  sourceEventType: string;
  actorPieceId: string | null;
  targetPieceId: string | null;
  actorModelId: string | null;
  targetModelId: string | null;
  receiptJournalHash: string | null;
  sourceEventsHash: string | null;
  authority: "validated_apply_receipt";
  trainingTruth: false;
}
export interface StarcraftTmgPresentationCueBatchV1 {
  schemaVersion: "starcraft_tmg_presentation_cue_batch_v1";
  receiptJournalHash: string | null;
  sourceEventsHash: string | null;
  cues: readonly StarcraftTmgPresentationCueV1[];
  authoritativeEffect: false;
  eligibleForTraining: false;
  trainingTruth: false;
  cueBatchHash: string;
}
export function projectStarcraftTmgValidatedReceiptCuesV1(
  receipt: unknown,
): StarcraftTmgPresentationCueBatchV1;
