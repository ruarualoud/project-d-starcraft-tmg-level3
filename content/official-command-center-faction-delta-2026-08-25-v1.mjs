import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";

const body = {
  schema: "starcraft_tmg_official_command_center_firestore_delta_v1",
  sourceId: "starcraft-tmg.official.command-center",
  sourceUrl: "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/faction_cards?pageSize=1000",
  capturedAt: "2026-08-25T00:00:00.000Z",
  collectionId: "faction_cards",
  authorityScope: "community_display_only",
  baseDocumentCount: 191,
  resultDocumentCount: 191,
  baseRawResponseHash: "836f9e8c5dcf3b572e34ed9bbbb4b42457b2309049543bc4794d1cfe5740060a",
  resultRawResponseHash: "d04c40cbd79ccc85bacdd5c241679d294ba8d58d98009c53262f955a6348d30e",
  baseSemanticContentHash: "08b93ee71ccef1d8b7adf34bddfe6f30c344d8c80dec50f08d666a07d98a1e45",
  resultSemanticContentHash: "395e1394895f764b635244a4c5a7a12b08a327df418b80884f975ddccfb93bac",
  changes: [
    {
      documentId: "3TLSupHClPWA8DGwSkhm",
      recordType: "community_mission",
      oldUpdateTime: "2026-08-23T05:32:16.846040Z",
      newUpdateTime: "2026-08-24T16:21:32.661613Z",
      oldFieldHash: "2efddf52e775b224d0f8fbe3a41c14a73caa4e15f0ca264bdd337d25a6c3af1f",
      newFieldHash: "1888d13551d48cc2df46a2ffdad457f3fe2cc87e9f19be64127622e18fda9464",
      oldRecordHash: "9729726f7c6e69b5f80ba83795ac4a624251cd7308c447ddea9d3af047e0ee12",
      newRecordHash: "df89523558a9a1a9b87d396779c9c3ce134e9343c9ff782a3b77af35784bc8bf",
      operations: [
        {
          operation: "append_unique_string_array",
          field: "upvotes",
          value: "USpc35AN92OkDVLweR8fU145ADg2",
          oldLength: 58,
          newLength: 59,
        },
      ],
    },
    {
      documentId: "qbBhCOE79NqHUC1lz8eK",
      recordType: "community_mission",
      oldUpdateTime: "2026-08-10T15:39:44.904110Z",
      newUpdateTime: "2026-08-24T16:22:50.084324Z",
      oldFieldHash: "03facffad6814e96428d55f7bdc8de9195f61b7d0bfe5eb109cc73fcffad7761",
      newFieldHash: "52579a2445718f6d6008434dff9878d5977e89459fe4291ec8c5f370458ff49a",
      oldRecordHash: "93907ec88599a4b2896dc013a291fb4bc77437b063abac58f93cedd1e9253bc5",
      newRecordHash: "3c77b9ef08be8f0df8936bce375b9830c6a0b7586f221b9a96dcde7909b572ab",
      operations: [
        {
          operation: "append_unique_string_array",
          field: "upvotes",
          value: "USpc35AN92OkDVLweR8fU145ADg2",
          oldLength: 8,
          newLength: 9,
        },
      ],
    },
  ],
  officialProductChanges: 0,
  ruleProseChanges: 0,
  repositoryFallbackAllowed: false,
  canAffectRules: false,
  trainingTruth: false,
};

export const OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 = Object.freeze({
  ...body,
  deltaHash: hashStarcraftTmgContract(body),
});
