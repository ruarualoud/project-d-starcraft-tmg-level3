// Ticket 24 / Slice 254-R7 — Whirlwind authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const WHIRLWIND_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_whirlwind_v1",
  displayName: "Whirlwind",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/whirlwind-display-v1.png",
    pixelSize: {
      width: 1774,
      height: 887
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
    widthInches: 72,
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
      width: 1774,
      height: 887
    },
    artOrigin: "top_left",
    battlefieldInches: {
      widthInches: 72,
      heightInches: 36,
      origin: "bottom_left"
    },
    mapping: "normalized[x,y] bottom-left origin -> artPixel[x * artWidth / 1000, (1000 - y) * artHeight / 1000] top-left origin -> inches[x * boardWidth / 1000, y * boardHeight / 1000] bottom-left origin"
  },
  regions: [
    {
      regionId: "central_watch_1",
      label: "Ordinary cover — single central vision node",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_whirlwind_v1:central_watch:1: centre (500,500), extent 125x95, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 542,
              y: 466
            },
            {
              x: 558,
              y: 494
            },
            {
              x: 554,
              y: 522
            },
            {
              x: 526,
              y: 542
            },
            {
              x: 491,
              y: 551
            },
            {
              x: 454,
              y: 534
            },
            {
              x: 443,
              y: 508
            },
            {
              x: 449,
              y: 480
            },
            {
              x: 468,
              y: 464
            },
            {
              x: 509,
              y: 456
            }
          ]
        ]
      }
    },
    {
      regionId: "second_rocks_1",
      label: "Impassable structure — optional rocks at second expansions",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_whirlwind_v1:second_rocks:1: centre (280,300), extent 95x70, rotation 35deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 304,
              y: 338
            },
            {
              x: 275,
              y: 334
            },
            {
              x: 254,
              y: 327
            },
            {
              x: 238,
              y: 304
            },
            {
              x: 238,
              y: 283
            },
            {
              x: 250,
              y: 265
            },
            {
              x: 272,
              y: 261
            },
            {
              x: 292,
              y: 268
            },
            {
              x: 318,
              y: 286
            },
            {
              x: 321,
              y: 308
            },
            {
              x: 324,
              y: 328
            }
          ]
        ]
      }
    },
    {
      regionId: "second_rocks_2",
      label: "Impassable structure — optional rocks at second expansions",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_whirlwind_v1:second_rocks:2: centre (720,700), extent 95x70, rotation 35deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 761,
              y: 707
            },
            {
              x: 753,
              y: 730
            },
            {
              x: 730,
              y: 742
            },
            {
              x: 698,
              y: 724
            },
            {
              x: 684,
              y: 706
            },
            {
              x: 675,
              y: 675
            },
            {
              x: 695,
              y: 664
            },
            {
              x: 729,
              y: 666
            },
            {
              x: 750,
              y: 683
            }
          ]
        ]
      }
    },
    {
      regionId: "entrance_depots_1",
      label: "Ordinary cover — entrance depot analogues",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_whirlwind_v1:entrance_depots:1: centre (200,205), extent 80x60, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 225,
              y: 239
            },
            {
              x: 206,
              y: 239
            },
            {
              x: 188,
              y: 234
            },
            {
              x: 171,
              y: 215
            },
            {
              x: 167,
              y: 197
            },
            {
              x: 168,
              y: 177
            },
            {
              x: 183,
              y: 170
            },
            {
              x: 202,
              y: 169
            },
            {
              x: 225,
              y: 187
            },
            {
              x: 236,
              y: 203
            },
            {
              x: 230,
              y: 224
            }
          ]
        ]
      }
    },
    {
      regionId: "entrance_depots_2",
      label: "Ordinary cover — entrance depot analogues",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_whirlwind_v1:entrance_depots:2: centre (800,795), extent 80x60, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 824,
              y: 780
            },
            {
              x: 833,
              y: 798
            },
            {
              x: 832,
              y: 817
            },
            {
              x: 818,
              y: 827
            },
            {
              x: 796,
              y: 830
            },
            {
              x: 775,
              y: 814
            },
            {
              x: 763,
              y: 791
            },
            {
              x: 770,
              y: 774
            },
            {
              x: 783,
              y: 759
            },
            {
              x: 804,
              y: 764
            }
          ]
        ]
      }
    },
    {
      regionId: "macro_sight_1",
      label: "Grass sight break — widely spaced macro sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_whirlwind_v1:macro_sight:1: centre (300,650), extent 85x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 306,
              y: 683
            },
            {
              x: 279,
              y: 679
            },
            {
              x: 259,
              y: 664
            },
            {
              x: 260,
              y: 643
            },
            {
              x: 272,
              y: 627
            },
            {
              x: 294,
              y: 617
            },
            {
              x: 320,
              y: 620
            },
            {
              x: 336,
              y: 636
            },
            {
              x: 340,
              y: 655
            },
            {
              x: 331,
              y: 674
            }
          ]
        ]
      }
    },
    {
      regionId: "macro_sight_2",
      label: "Grass sight break — widely spaced macro sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_whirlwind_v1:macro_sight:2: centre (700,350), extent 85x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 678,
              y: 321
            },
            {
              x: 703,
              y: 316
            },
            {
              x: 734,
              y: 328
            },
            {
              x: 744,
              y: 347
            },
            {
              x: 737,
              y: 370
            },
            {
              x: 707,
              y: 381
            },
            {
              x: 680,
              y: 380
            },
            {
              x: 659,
              y: 365
            },
            {
              x: 660,
              y: 338
            }
          ]
        ]
      }
    },
    {
      regionId: "macro_sight_3",
      label: "Grass sight break — widely spaced macro sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_whirlwind_v1:macro_sight:3: centre (500,760), extent 85x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 482,
              y: 733
            },
            {
              x: 507,
              y: 726
            },
            {
              x: 526,
              y: 731
            },
            {
              x: 541,
              y: 747
            },
            {
              x: 544,
              y: 765
            },
            {
              x: 532,
              y: 778
            },
            {
              x: 517,
              y: 792
            },
            {
              x: 497,
              y: 792
            },
            {
              x: 472,
              y: 787
            },
            {
              x: 459,
              y: 773
            },
            {
              x: 458,
              y: 757
            },
            {
              x: 466,
              y: 740
            }
          ]
        ]
      }
    },
    {
      regionId: "macro_sight_4",
      label: "Grass sight break — widely spaced macro sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_whirlwind_v1:macro_sight:4: centre (500,240), extent 85x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 460,
              y: 248
            },
            {
              x: 464,
              y: 227
            },
            {
              x: 475,
              y: 210
            },
            {
              x: 498,
              y: 208
            },
            {
              x: 519,
              y: 214
            },
            {
              x: 537,
              y: 224
            },
            {
              x: 545,
              y: 245
            },
            {
              x: 533,
              y: 259
            },
            {
              x: 512,
              y: 273
            },
            {
              x: 491,
              y: 273
            },
            {
              x: 465,
              y: 262
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
      "sc2_whirlwind_v1:central_watch:1 (high_ground/cover) -> central_watch_1 (ordinary_cover)",
      "sc2_whirlwind_v1:second_rocks:1 (blocking/blocking) -> second_rocks_1 (impassable_structure)",
      "sc2_whirlwind_v1:second_rocks:2 (blocking/blocking) -> second_rocks_2 (impassable_structure)",
      "sc2_whirlwind_v1:entrance_depots:1 (blocking/passable_difficult) -> entrance_depots_1 (ordinary_cover)",
      "sc2_whirlwind_v1:entrance_depots:2 (blocking/passable_difficult) -> entrance_depots_2 (ordinary_cover)",
      "sc2_whirlwind_v1:macro_sight:1 (sight/grass_sight) -> macro_sight_1 (grass_sight)",
      "sc2_whirlwind_v1:macro_sight:2 (sight/grass_sight) -> macro_sight_2 (grass_sight)",
      "sc2_whirlwind_v1:macro_sight:3 (sight/grass_sight) -> macro_sight_3 (grass_sight)",
      "sc2_whirlwind_v1:macro_sight:4 (sight/grass_sight) -> macro_sight_4 (grass_sight)"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes."
    ]
  },
  counts: {
    regions: 9,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 2,
      standable_high_ground: 0,
      cliff_edge: 0,
      ramp_access: 0,
      grass_sight: 4,
      ordinary_cover: 3
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "5cabd38db9fc21c4094c8e3ee6f075a54e844be1413a9f9bbf128ad08bebbdd9",
  bindingHash: "919f058905548f22a31927c0d25f83fe4c79c07c0ef881fb82d95cddaae6e541"
});
