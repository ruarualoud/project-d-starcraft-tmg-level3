// Ticket 24 / Slice 254-R7 — Daybreak authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const DAYBREAK_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_daybreak_v1",
  displayName: "Daybreak",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/daybreak-display-v1.png",
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
      regionId: "central_rocks_1",
      label: "Impassable structure — rocks dividing the central route",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_daybreak_v1:central_rocks:1: centre (500,430), extent 105x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 554,
              y: 438
            },
            {
              x: 530,
              y: 455
            },
            {
              x: 493,
              y: 464
            },
            {
              x: 463,
              y: 451
            },
            {
              x: 452,
              y: 431
            },
            {
              x: 453,
              y: 410
            },
            {
              x: 486,
              y: 399
            },
            {
              x: 522,
              y: 396
            },
            {
              x: 549,
              y: 416
            }
          ]
        ]
      }
    },
    {
      regionId: "central_rocks_2",
      label: "Impassable structure — rocks dividing the central route",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_daybreak_v1:central_rocks:2: centre (500,570), extent 105x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 527,
              y: 597
            },
            {
              x: 501,
              y: 606
            },
            {
              x: 464,
              y: 599
            },
            {
              x: 449,
              y: 577
            },
            {
              x: 450,
              y: 552
            },
            {
              x: 481,
              y: 534
            },
            {
              x: 520,
              y: 536
            },
            {
              x: 544,
              y: 556
            },
            {
              x: 550,
              y: 574
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_ramp_rocks_1",
      label: "Ordinary cover — rocks narrowing natural ramps",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_daybreak_v1:natural_ramp_rocks:1: centre (390,235), extent 85x60, rotation 15deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 425,
              y: 258
            },
            {
              x: 406,
              y: 263
            },
            {
              x: 385,
              y: 265
            },
            {
              x: 369,
              y: 256
            },
            {
              x: 356,
              y: 243
            },
            {
              x: 347,
              y: 228
            },
            {
              x: 356,
              y: 212
            },
            {
              x: 369,
              y: 203
            },
            {
              x: 392,
              y: 203
            },
            {
              x: 415,
              y: 212
            },
            {
              x: 425,
              y: 226
            },
            {
              x: 430,
              y: 241
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_ramp_rocks_2",
      label: "Ordinary cover — rocks narrowing natural ramps",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_daybreak_v1:natural_ramp_rocks:2: centre (610,765), extent 85x60, rotation 15deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 650,
              y: 757
            },
            {
              x: 651,
              y: 780
            },
            {
              x: 630,
              y: 793
            },
            {
              x: 605,
              y: 792
            },
            {
              x: 580,
              y: 779
            },
            {
              x: 571,
              y: 758
            },
            {
              x: 578,
              y: 744
            },
            {
              x: 600,
              y: 732
            },
            {
              x: 627,
              y: 741
            }
          ]
        ]
      }
    },
    {
      regionId: "tower_sight_1",
      label: "Grass sight break — two central tower control zones",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_daybreak_v1:tower_sight:1: centre (340,500), extent 85x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 352,
              y: 468
            },
            {
              x: 370,
              y: 480
            },
            {
              x: 383,
              y: 502
            },
            {
              x: 372,
              y: 522
            },
            {
              x: 353,
              y: 532
            },
            {
              x: 324,
              y: 533
            },
            {
              x: 308,
              y: 521
            },
            {
              x: 296,
              y: 503
            },
            {
              x: 306,
              y: 479
            },
            {
              x: 328,
              y: 465
            }
          ]
        ]
      }
    },
    {
      regionId: "tower_sight_2",
      label: "Grass sight break — two central tower control zones",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_daybreak_v1:tower_sight:2: centre (660,500), extent 85x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 655,
              y: 463
            },
            {
              x: 679,
              y: 471
            },
            {
              x: 703,
              y: 488
            },
            {
              x: 696,
              y: 511
            },
            {
              x: 681,
              y: 534
            },
            {
              x: 652,
              y: 532
            },
            {
              x: 628,
              y: 520
            },
            {
              x: 615,
              y: 498
            },
            {
              x: 630,
              y: 476
            }
          ]
        ]
      }
    },
    {
      regionId: "third_cover_1",
      label: "Ordinary cover — defensible third-base shoulders",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_daybreak_v1:third_cover:1: centre (300,300), extent 105x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 342,
              y: 284
            },
            {
              x: 346,
              y: 309
            },
            {
              x: 329,
              y: 328
            },
            {
              x: 301,
              y: 335
            },
            {
              x: 266,
              y: 328
            },
            {
              x: 251,
              y: 302
            },
            {
              x: 258,
              y: 284
            },
            {
              x: 284,
              y: 268
            },
            {
              x: 322,
              y: 266
            }
          ]
        ]
      }
    },
    {
      regionId: "third_cover_2",
      label: "Ordinary cover — defensible third-base shoulders",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_daybreak_v1:third_cover:2: centre (700,700), extent 105x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 648,
              y: 702
            },
            {
              x: 654,
              y: 679
            },
            {
              x: 677,
              y: 667
            },
            {
              x: 703,
              y: 663
            },
            {
              x: 728,
              y: 672
            },
            {
              x: 751,
              y: 684
            },
            {
              x: 757,
              y: 702
            },
            {
              x: 742,
              y: 716
            },
            {
              x: 726,
              y: 734
            },
            {
              x: 700,
              y: 733
            },
            {
              x: 678,
              y: 729
            },
            {
              x: 651,
              y: 715
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
      "sc2_daybreak_v1:central_rocks:1 (blocking/blocking) -> central_rocks_1 (impassable_structure)",
      "sc2_daybreak_v1:central_rocks:2 (blocking/blocking) -> central_rocks_2 (impassable_structure)",
      "sc2_daybreak_v1:natural_ramp_rocks:1 (blocking/passable_difficult) -> natural_ramp_rocks_1 (ordinary_cover)",
      "sc2_daybreak_v1:natural_ramp_rocks:2 (blocking/passable_difficult) -> natural_ramp_rocks_2 (ordinary_cover)",
      "sc2_daybreak_v1:tower_sight:1 (sight/grass_sight) -> tower_sight_1 (grass_sight)",
      "sc2_daybreak_v1:tower_sight:2 (sight/grass_sight) -> tower_sight_2 (grass_sight)",
      "sc2_daybreak_v1:third_cover:1 (cover/cover) -> third_cover_1 (ordinary_cover)",
      "sc2_daybreak_v1:third_cover:2 (cover/cover) -> third_cover_2 (ordinary_cover)"
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
      impassable_structure: 2,
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
  geometryHash: "2ed28710c48d7f7744a1147e7053ca3133ca8a6f1a972273511376a55754773c",
  bindingHash: "57219c7ccc0f6c78d8c9c74900d21ad2f4bdd7cb79287278e5929b88a39ffa31"
});
