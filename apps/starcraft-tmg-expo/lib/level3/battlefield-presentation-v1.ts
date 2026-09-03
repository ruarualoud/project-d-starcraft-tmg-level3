// Expo and Battle Lab intentionally share the same executable projection.
// This TypeScript facade preserves the product import path and exported types.
export {
  createBattlefieldPresentationV1,
  projectStarcraftTmgBattlefieldPresentationV1,
  projectStarcraftTmgBattlefieldViewportV1,
} from "../../../../packages/client-domain/battlefield-presentation-v1.mjs";

export type {
  BattlefieldActionV1,
  BattlefieldAreaV1,
  BattlefieldBaseShape,
  BattlefieldModelV1,
  BattlefieldParameterDomainV1,
  BattlefieldParameterSupport,
  BattlefieldPlacementV1,
  BattlefieldPointV1,
  BattlefieldSceneV1,
  BattlefieldUnitAnchorV1,
  BattlefieldViewportV1,
} from "../../../../packages/client-domain/battlefield-presentation-v1.mjs";
