// Ticket 24 / Slice 254-R7 — Heartbreak Ridge authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const HEARTBREAK_RIDGE_2_2_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_heartbreak_ridge_2_2_v1",
  displayName: "Heartbreak Ridge",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/heartbreak-ridge-display-v2.png",
    pixelSize: {
      width: 1254,
      height: 1254
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
    widthInches: 36,
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
      width: 1254,
      height: 1254
    },
    artOrigin: "top_left",
    battlefieldInches: {
      widthInches: 36,
      heightInches: 36,
      origin: "bottom_left"
    },
    mapping: "normalized[x,y] bottom-left origin -> artPixel[x * artWidth / 1000, (1000 - y) * artHeight / 1000] top-left origin -> inches[x * boardWidth / 1000, y * boardHeight / 1000] bottom-left origin"
  },
  regions: [
    {
      regionId: "parallel_ridges_1",
      label: "Standable high ground — three defensive fallback ridges",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:parallel_ridges:1: centre (350,420), extent 135x70, rotation -20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 298,
              y: 454
            },
            {
              x: 286,
              y: 438
            },
            {
              x: 298,
              y: 415
            },
            {
              x: 324,
              y: 396
            },
            {
              x: 355,
              y: 382
            },
            {
              x: 388,
              y: 382
            },
            {
              x: 408,
              y: 396
            },
            {
              x: 417,
              y: 411
            },
            {
              x: 389,
              y: 438
            },
            {
              x: 355,
              y: 453
            },
            {
              x: 325,
              y: 457
            }
          ]
        ]
      }
    },
    {
      regionId: "parallel_ridges_2",
      label: "Standable high ground — three defensive fallback ridges",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:parallel_ridges:2: centre (500,580), extent 135x70, rotation 20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 473,
              y: 608
            },
            {
              x: 447,
              y: 586
            },
            {
              x: 436,
              y: 560
            },
            {
              x: 455,
              y: 539
            },
            {
              x: 503,
              y: 544
            },
            {
              x: 539,
              y: 560
            },
            {
              x: 559,
              y: 589
            },
            {
              x: 559,
              y: 614
            },
            {
              x: 525,
              y: 618
            }
          ]
        ]
      }
    },
    {
      regionId: "parallel_ridges_3",
      label: "Standable high ground — three defensive fallback ridges",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:parallel_ridges:3: centre (650,420), extent 135x70, rotation -20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 714,
              y: 401
            },
            {
              x: 702,
              y: 423
            },
            {
              x: 686,
              y: 442
            },
            {
              x: 655,
              y: 453
            },
            {
              x: 622,
              y: 458
            },
            {
              x: 595,
              y: 454
            },
            {
              x: 580,
              y: 442
            },
            {
              x: 592,
              y: 421
            },
            {
              x: 615,
              y: 397
            },
            {
              x: 644,
              y: 383
            },
            {
              x: 675,
              y: 380
            },
            {
              x: 706,
              y: 384
            }
          ]
        ]
      }
    },
    {
      regionId: "rear_blocks_1",
      label: "Impassable structure — neutral/mineral rear-route blocks",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:rear_blocks:1: centre (190,720), extent 90x60, rotation 30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 231,
              y: 726
            },
            {
              x: 232,
              y: 741
            },
            {
              x: 218,
              y: 750
            },
            {
              x: 198,
              y: 756
            },
            {
              x: 178,
              y: 748
            },
            {
              x: 161,
              y: 734
            },
            {
              x: 151,
              y: 715
            },
            {
              x: 151,
              y: 701
            },
            {
              x: 163,
              y: 685
            },
            {
              x: 180,
              y: 687
            },
            {
              x: 206,
              y: 692
            },
            {
              x: 224,
              y: 709
            }
          ]
        ]
      }
    },
    {
      regionId: "rear_blocks_2",
      label: "Impassable structure — neutral/mineral rear-route blocks",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:rear_blocks:2: centre (810,280), extent 90x60, rotation 30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 773,
              y: 290
            },
            {
              x: 766,
              y: 271
            },
            {
              x: 769,
              y: 257
            },
            {
              x: 785,
              y: 244
            },
            {
              x: 806,
              y: 250
            },
            {
              x: 827,
              y: 255
            },
            {
              x: 841,
              y: 272
            },
            {
              x: 852,
              y: 287
            },
            {
              x: 848,
              y: 303
            },
            {
              x: 834,
              y: 314
            },
            {
              x: 817,
              y: 312
            },
            {
              x: 795,
              y: 308
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_overlooks_1",
      label: "Ordinary cover — high ground behind naturals",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:natural_overlooks:1: centre (220,380), extent 115x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 208,
              y: 348
            },
            {
              x: 236,
              y: 344
            },
            {
              x: 263,
              y: 357
            },
            {
              x: 280,
              y: 373
            },
            {
              x: 272,
              y: 391
            },
            {
              x: 257,
              y: 405
            },
            {
              x: 230,
              y: 416
            },
            {
              x: 198,
              y: 416
            },
            {
              x: 178,
              y: 405
            },
            {
              x: 166,
              y: 389
            },
            {
              x: 167,
              y: 370
            },
            {
              x: 181,
              y: 355
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_overlooks_2",
      label: "Ordinary cover — high ground behind naturals",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:natural_overlooks:2: centre (780,620), extent 115x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 770,
              y: 657
            },
            {
              x: 743,
              y: 644
            },
            {
              x: 722,
              y: 622
            },
            {
              x: 732,
              y: 600
            },
            {
              x: 766,
              y: 587
            },
            {
              x: 804,
              y: 587
            },
            {
              x: 833,
              y: 604
            },
            {
              x: 837,
              y: 631
            },
            {
              x: 813,
              y: 647
            }
          ]
        ]
      }
    },
    {
      regionId: "ridge_brush_1",
      label: "Grass sight break — brush between fallback lines",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:ridge_brush:1: centre (430,430), extent 75x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 404,
              y: 450
            },
            {
              x: 393,
              y: 434
            },
            {
              x: 401,
              y: 413
            },
            {
              x: 416,
              y: 402
            },
            {
              x: 440,
              y: 401
            },
            {
              x: 457,
              y: 409
            },
            {
              x: 470,
              y: 427
            },
            {
              x: 462,
              y: 446
            },
            {
              x: 443,
              y: 461
            },
            {
              x: 420,
              y: 459
            }
          ]
        ]
      }
    },
    {
      regionId: "ridge_brush_2",
      label: "Grass sight break — brush between fallback lines",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_heartbreak_ridge_2_2_v1:ridge_brush:2: centre (570,570), extent 75x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 604,
              y: 558
            },
            {
              x: 604,
              y: 578
            },
            {
              x: 599,
              y: 592
            },
            {
              x: 576,
              y: 597
            },
            {
              x: 559,
              y: 600
            },
            {
              x: 539,
              y: 588
            },
            {
              x: 535,
              y: 572
            },
            {
              x: 538,
              y: 553
            },
            {
              x: 556,
              y: 545
            },
            {
              x: 572,
              y: 538
            },
            {
              x: 593,
              y: 545
            }
          ]
        ]
      }
    },
    {
      regionId: "parallel_ridges_1_cliff_edge",
      label: "Cliff edge (parallel ridges 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "parallel_ridges_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 298,
            y: 454
          },
          {
            x: 286,
            y: 438
          },
          {
            x: 298,
            y: 415
          },
          {
            x: 324,
            y: 396
          },
          {
            x: 355,
            y: 382
          },
          {
            x: 388,
            y: 382
          },
          {
            x: 408,
            y: 396
          },
          {
            x: 417,
            y: 411
          },
          {
            x: 389,
            y: 438
          },
          {
            x: 355,
            y: 453
          },
          {
            x: 325,
            y: 457
          }
        ]
      }
    },
    {
      regionId: "parallel_ridges_1_ramp_1",
      label: "Ramp 1 (parallel ridges 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "parallel_ridges_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 256,
            y: 448
          },
          {
            x: 295,
            y: 436
          }
        ],
        widthNormalized: 26,
        connects: [
          "ground",
          "high"
        ]
      }
    },
    {
      regionId: "parallel_ridges_1_ramp_2",
      label: "Ramp 2 (parallel ridges 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "parallel_ridges_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 454,
            y: 435
          },
          {
            x: 414,
            y: 429
          }
        ],
        widthNormalized: 26,
        connects: [
          "ground",
          "high"
        ]
      }
    },
    {
      regionId: "parallel_ridges_2_cliff_edge",
      label: "Cliff edge (parallel ridges 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "parallel_ridges_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 473,
            y: 608
          },
          {
            x: 447,
            y: 586
          },
          {
            x: 436,
            y: 560
          },
          {
            x: 455,
            y: 539
          },
          {
            x: 503,
            y: 544
          },
          {
            x: 539,
            y: 560
          },
          {
            x: 559,
            y: 589
          },
          {
            x: 559,
            y: 614
          },
          {
            x: 525,
            y: 618
          }
        ]
      }
    },
    {
      regionId: "parallel_ridges_2_ramp_1",
      label: "Ramp 1 (parallel ridges 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "parallel_ridges_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 403,
            y: 562
          },
          {
            x: 443,
            y: 569
          }
        ],
        widthNormalized: 26,
        connects: [
          "ground",
          "high"
        ]
      }
    },
    {
      regionId: "parallel_ridges_2_ramp_2",
      label: "Ramp 2 (parallel ridges 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "parallel_ridges_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 597,
            y: 562
          },
          {
            x: 557,
            y: 569
          }
        ],
        widthNormalized: 26,
        connects: [
          "ground",
          "high"
        ]
      }
    },
    {
      regionId: "parallel_ridges_3_cliff_edge",
      label: "Cliff edge (parallel ridges 3)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "parallel_ridges_3",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 714,
            y: 401
          },
          {
            x: 702,
            y: 423
          },
          {
            x: 686,
            y: 442
          },
          {
            x: 655,
            y: 453
          },
          {
            x: 622,
            y: 458
          },
          {
            x: 595,
            y: 454
          },
          {
            x: 580,
            y: 442
          },
          {
            x: 592,
            y: 421
          },
          {
            x: 615,
            y: 397
          },
          {
            x: 644,
            y: 383
          },
          {
            x: 675,
            y: 380
          },
          {
            x: 706,
            y: 384
          }
        ]
      }
    },
    {
      regionId: "parallel_ridges_3_ramp_1",
      label: "Ramp 1 (parallel ridges 3)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "parallel_ridges_3",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 552,
            y: 434
          },
          {
            x: 592,
            y: 428
          }
        ],
        widthNormalized: 26,
        connects: [
          "ground",
          "high"
        ]
      }
    },
    {
      regionId: "parallel_ridges_3_ramp_2",
      label: "Ramp 2 (parallel ridges 3)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "parallel_ridges_3",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 735,
            y: 445
          },
          {
            x: 697,
            y: 434
          }
        ],
        widthNormalized: 26,
        connects: [
          "ground",
          "high"
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
      "sc1_heartbreak_ridge_2_2_v1:parallel_ridges:1 (high_ground/standable_high_ground) -> parallel_ridges_1 (standable_high_ground)",
      "sc1_heartbreak_ridge_2_2_v1:parallel_ridges:2 (high_ground/standable_high_ground) -> parallel_ridges_2 (standable_high_ground)",
      "sc1_heartbreak_ridge_2_2_v1:parallel_ridges:3 (high_ground/standable_high_ground) -> parallel_ridges_3 (standable_high_ground)",
      "sc1_heartbreak_ridge_2_2_v1:rear_blocks:1 (blocking/blocking) -> rear_blocks_1 (impassable_structure)",
      "sc1_heartbreak_ridge_2_2_v1:rear_blocks:2 (blocking/blocking) -> rear_blocks_2 (impassable_structure)",
      "sc1_heartbreak_ridge_2_2_v1:natural_overlooks:1 (high_ground/cover) -> natural_overlooks_1 (ordinary_cover)",
      "sc1_heartbreak_ridge_2_2_v1:natural_overlooks:2 (high_ground/cover) -> natural_overlooks_2 (ordinary_cover)",
      "sc1_heartbreak_ridge_2_2_v1:ridge_brush:1 (sight/grass_sight) -> ridge_brush_1 (grass_sight)",
      "sc1_heartbreak_ridge_2_2_v1:ridge_brush:2 (sight/grass_sight) -> ridge_brush_2 (grass_sight)",
      "ramp portal -> parallel_ridges_1_ramp_1 faces deployment zone p1",
      "ramp portal -> parallel_ridges_1_ramp_2 faces deployment zone p2",
      "ramp portal -> parallel_ridges_2_ramp_1 faces deployment zone p1",
      "ramp portal -> parallel_ridges_2_ramp_2 faces deployment zone p2",
      "ramp portal -> parallel_ridges_3_ramp_1 faces deployment zone p1",
      "ramp portal -> parallel_ridges_3_ramp_2 faces deployment zone p2"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes.",
      "Ramp connectors face the deployment zones declared in this map's reviewed topology record; their exact rim positions carry the declared contour tolerance."
    ]
  },
  counts: {
    regions: 18,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 2,
      standable_high_ground: 3,
      cliff_edge: 3,
      ramp_access: 6,
      grass_sight: 2,
      ordinary_cover: 2
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "7ab1cd7de2de1609a6feebc161c58b7dacb1926aa02887daaad8c963c59627dc",
  bindingHash: "540f846cfc8d2252c5c5f1000484ca8e122d43489795b99a47b1f81f5a3106b7"
});
