// Ticket 24 / Slice 254-R7 — Tau Cross authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const TAU_CROSS_1_1_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_tau_cross_1_1_v1",
  displayName: "Tau Cross",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/tau-cross-display-v2.png",
    pixelSize: {
      width: 1536,
      height: 1024
    },
    origin: "top_left",
    generatedOriginal: true
  },
  normalizedSpace: {
    width: 1000,
    height: 1000,
    origin: "bottom_left"
  },
  battlefield: {
    widthInches: 54,
    heightInches: 36,
    origin: "bottom_left"
  },
  transform: {
    normalizedSpace: {
      width: 1000,
      height: 1000,
      origin: "bottom_left"
    },
    artPixelSize: {
      width: 1536,
      height: 1024
    },
    artOrigin: "top_left",
    battlefieldInches: {
      widthInches: 54,
      heightInches: 36,
      origin: "bottom_left"
    },
    mapping: "normalized[x,y] bottom-left origin -> artPixel[x * artWidth / 1000, (1000 - y) * artHeight / 1000] top-left origin -> inches[x * boardWidth / 1000, y * boardHeight / 1000] bottom-left origin"
  },
  regions: [
    {
      regionId: "natural_mouths_1",
      label: "Ordinary cover — small blockable natural mouths",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_tau_cross_1_1_v1:natural_mouths:1: centre (255,270), extent 80x55, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 282,
              y: 301
            },
            {
              x: 262,
              y: 302
            },
            {
              x: 245,
              y: 294
            },
            {
              x: 230,
              y: 283
            },
            {
              x: 221,
              y: 262
            },
            {
              x: 222,
              y: 243
            },
            {
              x: 236,
              y: 239
            },
            {
              x: 252,
              y: 236
            },
            {
              x: 272,
              y: 246
            },
            {
              x: 282,
              y: 266
            },
            {
              x: 288,
              y: 288
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_mouths_2",
      label: "Ordinary cover — small blockable natural mouths",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_tau_cross_1_1_v1:natural_mouths:2: centre (745,730), extent 80x55, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 779,
              y: 751
            },
            {
              x: 765,
              y: 763
            },
            {
              x: 752,
              y: 764
            },
            {
              x: 734,
              y: 756
            },
            {
              x: 721,
              y: 741
            },
            {
              x: 711,
              y: 723
            },
            {
              x: 715,
              y: 710
            },
            {
              x: 722,
              y: 699
            },
            {
              x: 739,
              y: 699
            },
            {
              x: 758,
              y: 704
            },
            {
              x: 774,
              y: 720
            },
            {
              x: 781,
              y: 738
            }
          ]
        ]
      }
    },
    {
      regionId: "cliffed_naturals_1",
      label: "Ordinary cover — cliffed natural sides",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_tau_cross_1_1_v1:cliffed_naturals:1: centre (210,330), extent 120x70, rotation 20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 168,
              y: 343
            },
            {
              x: 158,
              y: 322
            },
            {
              x: 162,
              y: 297
            },
            {
              x: 200,
              y: 294
            },
            {
              x: 239,
              y: 306
            },
            {
              x: 265,
              y: 326
            },
            {
              x: 265,
              y: 355
            },
            {
              x: 245,
              y: 371
            },
            {
              x: 207,
              y: 367
            }
          ]
        ]
      }
    },
    {
      regionId: "cliffed_naturals_2",
      label: "Ordinary cover — cliffed natural sides",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_tau_cross_1_1_v1:cliffed_naturals:2: centre (790,670), extent 120x70, rotation 20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 849,
              y: 694
            },
            {
              x: 826,
              y: 706
            },
            {
              x: 794,
              y: 709
            },
            {
              x: 762,
              y: 694
            },
            {
              x: 740,
              y: 672
            },
            {
              x: 729,
              y: 648
            },
            {
              x: 752,
              y: 633
            },
            {
              x: 789,
              y: 630
            },
            {
              x: 818,
              y: 647
            },
            {
              x: 849,
              y: 672
            }
          ]
        ]
      }
    },
    {
      regionId: "open_centre_breaks_1",
      label: "Grass sight break — sparse sight breaks in the open centre",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_tau_cross_1_1_v1:open_centre_breaks:1: centre (410,455), extent 80x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 429,
              y: 482
            },
            {
              x: 409,
              y: 489
            },
            {
              x: 385,
              y: 480
            },
            {
              x: 373,
              y: 470
            },
            {
              x: 371,
              y: 450
            },
            {
              x: 374,
              y: 436
            },
            {
              x: 390,
              y: 426
            },
            {
              x: 413,
              y: 425
            },
            {
              x: 433,
              y: 427
            },
            {
              x: 449,
              y: 442
            },
            {
              x: 448,
              y: 460
            },
            {
              x: 443,
              y: 474
            }
          ]
        ]
      }
    },
    {
      regionId: "open_centre_breaks_2",
      label: "Grass sight break — sparse sight breaks in the open centre",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_tau_cross_1_1_v1:open_centre_breaks:2: centre (590,545), extent 80x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 588,
              y: 514
            },
            {
              x: 604,
              y: 513
            },
            {
              x: 622,
              y: 527
            },
            {
              x: 629,
              y: 541
            },
            {
              x: 624,
              y: 560
            },
            {
              x: 613,
              y: 569
            },
            {
              x: 596,
              y: 575
            },
            {
              x: 573,
              y: 577
            },
            {
              x: 560,
              y: 565
            },
            {
              x: 552,
              y: 550
            },
            {
              x: 556,
              y: 533
            },
            {
              x: 568,
              y: 520
            }
          ]
        ]
      }
    },
    {
      regionId: "outer_arc_cover_1",
      label: "Ordinary cover — macro-arc cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_tau_cross_1_1_v1:outer_arc_cover:1: centre (500,790), extent 105x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 546,
              y: 777
            },
            {
              x: 553,
              y: 802
            },
            {
              x: 524,
              y: 821
            },
            {
              x: 493,
              y: 823
            },
            {
              x: 458,
              y: 815
            },
            {
              x: 444,
              y: 791
            },
            {
              x: 460,
              y: 767
            },
            {
              x: 495,
              y: 753
            },
            {
              x: 525,
              y: 760
            }
          ]
        ]
      }
    },
    {
      regionId: "outer_arc_cover_2",
      label: "Ordinary cover — macro-arc cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_tau_cross_1_1_v1:outer_arc_cover:2: centre (500,210), extent 105x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 454,
              y: 228
            },
            {
              x: 447,
              y: 207
            },
            {
              x: 468,
              y: 186
            },
            {
              x: 492,
              y: 178
            },
            {
              x: 520,
              y: 179
            },
            {
              x: 548,
              y: 192
            },
            {
              x: 549,
              y: 213
            },
            {
              x: 542,
              y: 234
            },
            {
              x: 513,
              y: 246
            },
            {
              x: 479,
              y: 239
            }
          ]
        ]
      }
    }
  ],
  review: {
    authoredAt: "2026-09-23",
    author: "kimi-project-d-ui-lead",
    method: "topology_anchor_offline_authoring_reviewed_by_agent",
    runtimePixelInference: false,
    contourToleranceNormalized: 24,
    sourceTopologyAnchors: [
      "sc1_tau_cross_1_1_v1:natural_mouths:1 (blocking/passable_difficult) -> natural_mouths_1 (ordinary_cover)",
      "sc1_tau_cross_1_1_v1:natural_mouths:2 (blocking/passable_difficult) -> natural_mouths_2 (ordinary_cover)",
      "sc1_tau_cross_1_1_v1:cliffed_naturals:1 (high_ground/cover) -> cliffed_naturals_1 (ordinary_cover)",
      "sc1_tau_cross_1_1_v1:cliffed_naturals:2 (high_ground/cover) -> cliffed_naturals_2 (ordinary_cover)",
      "sc1_tau_cross_1_1_v1:open_centre_breaks:1 (sight/grass_sight) -> open_centre_breaks_1 (grass_sight)",
      "sc1_tau_cross_1_1_v1:open_centre_breaks:2 (sight/grass_sight) -> open_centre_breaks_2 (grass_sight)",
      "sc1_tau_cross_1_1_v1:outer_arc_cover:1 (cover/cover) -> outer_arc_cover_1 (ordinary_cover)",
      "sc1_tau_cross_1_1_v1:outer_arc_cover:2 (cover/cover) -> outer_arc_cover_2 (ordinary_cover)"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes."
    ]
  },
  counts: {
    regions: 8,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 0,
      standable_high_ground: 0,
      cliff_edge: 0,
      ramp_access: 0,
      grass_sight: 2,
      ordinary_cover: 6
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "831d8e96b4dbfb40af7ba38b6b4aecdea3aa3d9ace38c6a8ea62eeeb90505e71",
  bindingHash: "5623c67b730f5a4bd69e5809811f08684fbbb54f77cdfd62036886166fb541e1"
});
