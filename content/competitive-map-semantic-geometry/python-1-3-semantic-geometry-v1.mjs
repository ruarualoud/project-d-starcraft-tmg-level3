// Ticket 24 / Slice 254-R7 — Python authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const PYTHON_1_3_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_python_1_3_v1",
  displayName: "Python",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/python-display-v2.png",
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
      regionId: "corner_island_blocks_1",
      label: "Impassable void — mineral-blocked corner island analogues",
      semanticClass: "impassable_void",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc1_python_1_3_v1:corner_island_blocks:1: centre (125,820), extent 100x120, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_void.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 109,
              y: 765
            },
            {
              x: 135,
              y: 765
            },
            {
              x: 162,
              y: 775
            },
            {
              x: 174,
              y: 808
            },
            {
              x: 170,
              y: 836
            },
            {
              x: 156,
              y: 874
            },
            {
              x: 132,
              y: 877
            },
            {
              x: 104,
              y: 873
            },
            {
              x: 80,
              y: 850
            },
            {
              x: 72,
              y: 814
            },
            {
              x: 86,
              y: 787
            }
          ]
        ]
      }
    },
    {
      regionId: "corner_island_blocks_2",
      label: "Impassable void — mineral-blocked corner island analogues",
      semanticClass: "impassable_void",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc1_python_1_3_v1:corner_island_blocks:2: centre (875,180), extent 100x120, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_void.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 877,
              y: 121
            },
            {
              x: 905,
              y: 137
            },
            {
              x: 921,
              y: 167
            },
            {
              x: 921,
              y: 202
            },
            {
              x: 900,
              y: 236
            },
            {
              x: 866,
              y: 240
            },
            {
              x: 844,
              y: 224
            },
            {
              x: 824,
              y: 191
            },
            {
              x: 829,
              y: 156
            },
            {
              x: 849,
              y: 130
            }
          ]
        ]
      }
    },
    {
      regionId: "wide_third_ridges_1",
      label: "Ordinary cover — ridges behind wide third approaches",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_python_1_3_v1:wide_third_ridges:1: centre (275,640), extent 145x80, rotation 25deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 333,
              y: 672
            },
            {
              x: 301,
              y: 685
            },
            {
              x: 253,
              y: 671
            },
            {
              x: 219,
              y: 646
            },
            {
              x: 208,
              y: 615
            },
            {
              x: 233,
              y: 595
            },
            {
              x: 268,
              y: 594
            },
            {
              x: 315,
              y: 618
            },
            {
              x: 343,
              y: 652
            }
          ]
        ]
      }
    },
    {
      regionId: "wide_third_ridges_2",
      label: "Ordinary cover — ridges behind wide third approaches",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_python_1_3_v1:wide_third_ridges:2: centre (725,360), extent 145x80, rotation 25deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 724,
              y: 319
            },
            {
              x: 768,
              y: 340
            },
            {
              x: 789,
              y: 375
            },
            {
              x: 782,
              y: 397
            },
            {
              x: 751,
              y: 410
            },
            {
              x: 700,
              y: 394
            },
            {
              x: 669,
              y: 362
            },
            {
              x: 657,
              y: 329
            },
            {
              x: 685,
              y: 316
            }
          ]
        ]
      }
    },
    {
      regionId: "python_centre_1",
      label: "Grass sight break — open-centre serpent motif",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_python_1_3_v1:python_centre:1: centre (430,470), extent 95x65, rotation -25deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 443,
              y: 435
            },
            {
              x: 466,
              y: 441
            },
            {
              x: 472,
              y: 456
            },
            {
              x: 474,
              y: 469
            },
            {
              x: 459,
              y: 490
            },
            {
              x: 441,
              y: 499
            },
            {
              x: 414,
              y: 505
            },
            {
              x: 394,
              y: 501
            },
            {
              x: 387,
              y: 487
            },
            {
              x: 385,
              y: 469
            },
            {
              x: 401,
              y: 453
            },
            {
              x: 425,
              y: 437
            }
          ]
        ]
      }
    },
    {
      regionId: "python_centre_2",
      label: "Grass sight break — open-centre serpent motif",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_python_1_3_v1:python_centre:2: centre (570,530), extent 95x65, rotation -25deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 551,
              y: 565
            },
            {
              x: 533,
              y: 563
            },
            {
              x: 526,
              y: 545
            },
            {
              x: 525,
              y: 526
            },
            {
              x: 544,
              y: 507
            },
            {
              x: 563,
              y: 496
            },
            {
              x: 586,
              y: 495
            },
            {
              x: 603,
              y: 503
            },
            {
              x: 613,
              y: 518
            },
            {
              x: 614,
              y: 532
            },
            {
              x: 599,
              y: 550
            },
            {
              x: 575,
              y: 560
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_cliffs_1",
      label: "Ordinary cover — natural cliff pressure pockets",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_python_1_3_v1:natural_cliffs:1: centre (260,235), extent 90x60, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 235,
              y: 250
            },
            {
              x: 222,
              y: 226
            },
            {
              x: 229,
              y: 204
            },
            {
              x: 245,
              y: 194
            },
            {
              x: 272,
              y: 209
            },
            {
              x: 295,
              y: 231
            },
            {
              x: 296,
              y: 254
            },
            {
              x: 285,
              y: 271
            },
            {
              x: 259,
              y: 272
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_cliffs_2",
      label: "Ordinary cover — natural cliff pressure pockets",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_python_1_3_v1:natural_cliffs:2: centre (740,765), extent 90x60, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 769,
              y: 752
            },
            {
              x: 778,
              y: 779
            },
            {
              x: 767,
              y: 797
            },
            {
              x: 751,
              y: 805
            },
            {
              x: 721,
              y: 788
            },
            {
              x: 703,
              y: 767
            },
            {
              x: 703,
              y: 737
            },
            {
              x: 719,
              y: 730
            },
            {
              x: 744,
              y: 734
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
      "sc1_python_1_3_v1:corner_island_blocks:1 (blocking/blocking) -> corner_island_blocks_1 (impassable_void)",
      "sc1_python_1_3_v1:corner_island_blocks:2 (blocking/blocking) -> corner_island_blocks_2 (impassable_void)",
      "sc1_python_1_3_v1:wide_third_ridges:1 (high_ground/cover) -> wide_third_ridges_1 (ordinary_cover)",
      "sc1_python_1_3_v1:wide_third_ridges:2 (high_ground/cover) -> wide_third_ridges_2 (ordinary_cover)",
      "sc1_python_1_3_v1:python_centre:1 (sight/grass_sight) -> python_centre_1 (grass_sight)",
      "sc1_python_1_3_v1:python_centre:2 (sight/grass_sight) -> python_centre_2 (grass_sight)",
      "sc1_python_1_3_v1:natural_cliffs:1 (cover/cover) -> natural_cliffs_1 (ordinary_cover)",
      "sc1_python_1_3_v1:natural_cliffs:2 (cover/cover) -> natural_cliffs_2 (ordinary_cover)"
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
      impassable_void: 2,
      impassable_structure: 0,
      standable_high_ground: 0,
      cliff_edge: 0,
      ramp_access: 0,
      grass_sight: 2,
      ordinary_cover: 4
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "a793cfb26725a093ce816f791f0c761f6dc4fc7123d72e9baff23b0690472d29",
  bindingHash: "60ff6979a2549350bd0b6e3d331af4cb8880634647ebdd56c06c0a08bc1ffd8d"
});
