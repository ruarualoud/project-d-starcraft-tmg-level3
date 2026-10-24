// Ticket 24 / Slices 254-R3–254-R7 — authored semantic-map geometry index.
//
// Each entry is a hand-authored/reviewed build asset pairing one classic map's
// art asset and coordinate transform to normalized multipolygon/ring geometry.
// Lost Temple is mask-traced and hand-reviewed (254-R6); the other nineteen
// are topology-anchored offline-authored bindings (254-R7, tool:
// scripts/support/ticket-24-semantic-topology-authoring-v1.mjs) whose review
// blocks disclose provenance and every correction. Maps without an authored
// binding are NOT listed here; the product-composition catalogue derives their
// honest `pending_semantic_authoring` status from the seed catalogue. Never
// invent a binding for a map that has not been reviewed.

import { LOST_TEMPLE_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./lost-temple-semantic-geometry-v1.mjs";
import { FIGHTING_SPIRIT_1_4_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./fighting-spirit-1-4-semantic-geometry-v1.mjs";
import { CIRCUIT_BREAKERS_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./circuit-breakers-semantic-geometry-v1.mjs";
import { PYTHON_1_3_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./python-1-3-semantic-geometry-v1.mjs";
import { BLUE_STORM_1_2_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./blue-storm-1-2-semantic-geometry-v1.mjs";
import { TAU_CROSS_1_1_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./tau-cross-1-1-semantic-geometry-v1.mjs";
import { DESTINATION_1_1_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./destination-1-1-semantic-geometry-v1.mjs";
import { HEARTBREAK_RIDGE_2_2_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./heartbreak-ridge-2-2-semantic-geometry-v1.mjs";
import { ANDROMEDA_1_2_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./andromeda-1-2-semantic-geometry-v1.mjs";
import { MATCH_POINT_1_4_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./match-point-1-4-semantic-geometry-v1.mjs";
import { METALOPOLIS_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./metalopolis-semantic-geometry-v1.mjs";
import { SHAKURAS_PLATEAU_2_0_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./shakuras-plateau-2-0-semantic-geometry-v1.mjs";
import { XELNAGA_CAVERNS_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./xelnaga-caverns-semantic-geometry-v1.mjs";
import { DAYBREAK_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./daybreak-semantic-geometry-v1.mjs";
import { CLOUD_KINGDOM_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./cloud-kingdom-semantic-geometry-v1.mjs";
import { ANTIGA_SHIPYARD_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./antiga-shipyard-semantic-geometry-v1.mjs";
import { OHANA_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./ohana-semantic-geometry-v1.mjs";
import { WHIRLWIND_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./whirlwind-semantic-geometry-v1.mjs";
import { FROST_LE_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./frost-le-semantic-geometry-v1.mjs";
import { ABYSSAL_REEF_LE_SEMANTIC_GEOMETRY_BINDING_V1 } from
  "./abyssal-reef-le-semantic-geometry-v1.mjs";

export const COMPETITIVE_MAP_SEMANTIC_GEOMETRY_BINDINGS_V1 = Object.freeze([
  LOST_TEMPLE_SEMANTIC_GEOMETRY_BINDING_V1,
  FIGHTING_SPIRIT_1_4_SEMANTIC_GEOMETRY_BINDING_V1,
  CIRCUIT_BREAKERS_SEMANTIC_GEOMETRY_BINDING_V1,
  PYTHON_1_3_SEMANTIC_GEOMETRY_BINDING_V1,
  BLUE_STORM_1_2_SEMANTIC_GEOMETRY_BINDING_V1,
  TAU_CROSS_1_1_SEMANTIC_GEOMETRY_BINDING_V1,
  DESTINATION_1_1_SEMANTIC_GEOMETRY_BINDING_V1,
  HEARTBREAK_RIDGE_2_2_SEMANTIC_GEOMETRY_BINDING_V1,
  ANDROMEDA_1_2_SEMANTIC_GEOMETRY_BINDING_V1,
  MATCH_POINT_1_4_SEMANTIC_GEOMETRY_BINDING_V1,
  METALOPOLIS_SEMANTIC_GEOMETRY_BINDING_V1,
  SHAKURAS_PLATEAU_2_0_SEMANTIC_GEOMETRY_BINDING_V1,
  XELNAGA_CAVERNS_SEMANTIC_GEOMETRY_BINDING_V1,
  DAYBREAK_SEMANTIC_GEOMETRY_BINDING_V1,
  CLOUD_KINGDOM_SEMANTIC_GEOMETRY_BINDING_V1,
  ANTIGA_SHIPYARD_SEMANTIC_GEOMETRY_BINDING_V1,
  OHANA_SEMANTIC_GEOMETRY_BINDING_V1,
  WHIRLWIND_SEMANTIC_GEOMETRY_BINDING_V1,
  FROST_LE_SEMANTIC_GEOMETRY_BINDING_V1,
  ABYSSAL_REEF_LE_SEMANTIC_GEOMETRY_BINDING_V1,
]);
