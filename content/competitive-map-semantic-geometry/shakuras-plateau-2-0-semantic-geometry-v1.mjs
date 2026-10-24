// Ticket 24 / Slice 254-R7 — Shakuras Plateau authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const SHAKURAS_PLATEAU_2_0_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_shakuras_plateau_2_0_v1",
  displayName: "Shakuras Plateau",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/shakuras-plateau-display-v1.png",
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
      regionId: "corridor_ledges_1",
      label: "Standable high ground — area-control ledges beside the main corridor",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_shakuras_plateau_2_0_v1:corridor_ledges:1: centre (390,350), extent 145x75, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 351,
              y: 385
            },
            {
              x: 330,
              y: 371
            },
            {
              x: 313,
              y: 353
            },
            {
              x: 321,
              y: 332
            },
            {
              x: 351,
              y: 317
            },
            {
              x: 388,
              y: 309
            },
            {
              x: 423,
              y: 316
            },
            {
              x: 457,
              y: 331
            },
            {
              x: 462,
              y: 351
            },
            {
              x: 456,
              y: 369
            },
            {
              x: 423,
              y: 381
            },
            {
              x: 390,
              y: 390
            }
          ]
        ]
      }
    },
    {
      regionId: "corridor_ledges_2",
      label: "Standable high ground — area-control ledges beside the main corridor",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_shakuras_plateau_2_0_v1:corridor_ledges:2: centre (610,650), extent 145x75, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 543,
              y: 667
            },
            {
              x: 533,
              y: 645
            },
            {
              x: 545,
              y: 630
            },
            {
              x: 576,
              y: 617
            },
            {
              x: 613,
              y: 610
            },
            {
              x: 651,
              y: 620
            },
            {
              x: 672,
              y: 633
            },
            {
              x: 677,
              y: 651
            },
            {
              x: 669,
              y: 668
            },
            {
              x: 642,
              y: 684
            },
            {
              x: 606,
              y: 685
            },
            {
              x: 563,
              y: 681
            }
          ]
        ]
      }
    },
    {
      regionId: "rear_rocks_1",
      label: "Impassable structure — rock-blocked rear routes",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_shakuras_plateau_2_0_v1:rear_rocks:1: centre (210,760), extent 100x70, rotation 30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 236,
              y: 800
            },
            {
              x: 207,
              y: 793
            },
            {
              x: 180,
              y: 777
            },
            {
              x: 167,
              y: 752
            },
            {
              x: 174,
              y: 731
            },
            {
              x: 201,
              y: 724
            },
            {
              x: 227,
              y: 727
            },
            {
              x: 250,
              y: 754
            },
            {
              x: 254,
              y: 779
            }
          ]
        ]
      }
    },
    {
      regionId: "rear_rocks_2",
      label: "Impassable structure — rock-blocked rear routes",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_shakuras_plateau_2_0_v1:rear_rocks:2: centre (790,240), extent 100x70, rotation 30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 817,
              y: 274
            },
            {
              x: 794,
              y: 276
            },
            {
              x: 774,
              y: 271
            },
            {
              x: 752,
              y: 254
            },
            {
              x: 744,
              y: 235
            },
            {
              x: 748,
              y: 215
            },
            {
              x: 765,
              y: 203
            },
            {
              x: 787,
              y: 202
            },
            {
              x: 812,
              y: 209
            },
            {
              x: 825,
              y: 227
            },
            {
              x: 837,
              y: 249
            },
            {
              x: 832,
              y: 264
            }
          ]
        ]
      }
    },
    {
      regionId: "watch_terrain_1",
      label: "Grass sight break — watch-tower sight zones",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_shakuras_plateau_2_0_v1:watch_terrain:1: centre (500,410), extent 85x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 498,
              y: 380
            },
            {
              x: 526,
              y: 383
            },
            {
              x: 541,
              y: 398
            },
            {
              x: 540,
              y: 416
            },
            {
              x: 534,
              y: 433
            },
            {
              x: 512,
              y: 444
            },
            {
              x: 485,
              y: 440
            },
            {
              x: 466,
              y: 434
            },
            {
              x: 458,
              y: 417
            },
            {
              x: 461,
              y: 397
            },
            {
              x: 475,
              y: 384
            }
          ]
        ]
      }
    },
    {
      regionId: "watch_terrain_2",
      label: "Grass sight break — watch-tower sight zones",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_shakuras_plateau_2_0_v1:watch_terrain:2: centre (500,590), extent 85x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 497,
              y: 556
            },
            {
              x: 527,
              y: 564
            },
            {
              x: 542,
              y: 584
            },
            {
              x: 538,
              y: 604
            },
            {
              x: 519,
              y: 622
            },
            {
              x: 489,
              y: 620
            },
            {
              x: 463,
              y: 609
            },
            {
              x: 461,
              y: 587
            },
            {
              x: 469,
              y: 566
            }
          ]
        ]
      }
    },
    {
      regionId: "inside_expansion_cover_1",
      label: "Ordinary cover — inside expansion vulnerabilities",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_shakuras_plateau_2_0_v1:inside_expansion_cover:1: centre (275,430), extent 90x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 238,
              y: 446
            },
            {
              x: 229,
              y: 428
            },
            {
              x: 237,
              y: 415
            },
            {
              x: 252,
              y: 401
            },
            {
              x: 274,
              y: 395
            },
            {
              x: 299,
              y: 403
            },
            {
              x: 316,
              y: 413
            },
            {
              x: 316,
              y: 428
            },
            {
              x: 316,
              y: 444
            },
            {
              x: 300,
              y: 456
            },
            {
              x: 278,
              y: 464
            },
            {
              x: 253,
              y: 461
            }
          ]
        ]
      }
    },
    {
      regionId: "inside_expansion_cover_2",
      label: "Ordinary cover — inside expansion vulnerabilities",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_shakuras_plateau_2_0_v1:inside_expansion_cover:2: centre (725,570), extent 90x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 688,
              y: 588
            },
            {
              x: 681,
              y: 571
            },
            {
              x: 685,
              y: 555
            },
            {
              x: 702,
              y: 540
            },
            {
              x: 723,
              y: 539
            },
            {
              x: 745,
              y: 541
            },
            {
              x: 763,
              y: 552
            },
            {
              x: 772,
              y: 570
            },
            {
              x: 765,
              y: 582
            },
            {
              x: 750,
              y: 599
            },
            {
              x: 725,
              y: 603
            },
            {
              x: 705,
              y: 598
            }
          ]
        ]
      }
    },
    {
      regionId: "corridor_ledges_1_cliff_edge",
      label: "Cliff edge (corridor ledges 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "corridor_ledges_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 351,
            y: 385
          },
          {
            x: 330,
            y: 371
          },
          {
            x: 313,
            y: 353
          },
          {
            x: 321,
            y: 332
          },
          {
            x: 351,
            y: 317
          },
          {
            x: 388,
            y: 309
          },
          {
            x: 423,
            y: 316
          },
          {
            x: 457,
            y: 331
          },
          {
            x: 462,
            y: 351
          },
          {
            x: 456,
            y: 369
          },
          {
            x: 423,
            y: 381
          },
          {
            x: 390,
            y: 390
          }
        ]
      }
    },
    {
      regionId: "corridor_ledges_1_ramp_1",
      label: "Ramp 1 (corridor ledges 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "corridor_ledges_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 290,
            y: 398
          },
          {
            x: 327,
            y: 381
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
      regionId: "corridor_ledges_1_ramp_2",
      label: "Ramp 2 (corridor ledges 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "corridor_ledges_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 491,
            y: 379
          },
          {
            x: 453,
            y: 368
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
      regionId: "corridor_ledges_2_cliff_edge",
      label: "Cliff edge (corridor ledges 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "corridor_ledges_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 543,
            y: 667
          },
          {
            x: 533,
            y: 645
          },
          {
            x: 545,
            y: 630
          },
          {
            x: 576,
            y: 617
          },
          {
            x: 613,
            y: 610
          },
          {
            x: 651,
            y: 620
          },
          {
            x: 672,
            y: 633
          },
          {
            x: 677,
            y: 651
          },
          {
            x: 669,
            y: 668
          },
          {
            x: 642,
            y: 684
          },
          {
            x: 606,
            y: 685
          },
          {
            x: 563,
            y: 681
          }
        ]
      }
    },
    {
      regionId: "corridor_ledges_2_ramp_1",
      label: "Ramp 1 (corridor ledges 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "corridor_ledges_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 509,
            y: 621
          },
          {
            x: 547,
            y: 632
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
      regionId: "corridor_ledges_2_ramp_2",
      label: "Ramp 2 (corridor ledges 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "corridor_ledges_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 710,
            y: 602
          },
          {
            x: 673,
            y: 619
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
      "sc2_shakuras_plateau_2_0_v1:corridor_ledges:1 (high_ground/standable_high_ground) -> corridor_ledges_1 (standable_high_ground)",
      "sc2_shakuras_plateau_2_0_v1:corridor_ledges:2 (high_ground/standable_high_ground) -> corridor_ledges_2 (standable_high_ground)",
      "sc2_shakuras_plateau_2_0_v1:rear_rocks:1 (blocking/blocking) -> rear_rocks_1 (impassable_structure)",
      "sc2_shakuras_plateau_2_0_v1:rear_rocks:2 (blocking/blocking) -> rear_rocks_2 (impassable_structure)",
      "sc2_shakuras_plateau_2_0_v1:watch_terrain:1 (sight/grass_sight) -> watch_terrain_1 (grass_sight)",
      "sc2_shakuras_plateau_2_0_v1:watch_terrain:2 (sight/grass_sight) -> watch_terrain_2 (grass_sight)",
      "sc2_shakuras_plateau_2_0_v1:inside_expansion_cover:1 (cover/cover) -> inside_expansion_cover_1 (ordinary_cover)",
      "sc2_shakuras_plateau_2_0_v1:inside_expansion_cover:2 (cover/cover) -> inside_expansion_cover_2 (ordinary_cover)",
      "ramp portal -> corridor_ledges_1_ramp_1 faces deployment zone p1",
      "ramp portal -> corridor_ledges_1_ramp_2 faces deployment zone p2",
      "ramp portal -> corridor_ledges_2_ramp_1 faces deployment zone p1",
      "ramp portal -> corridor_ledges_2_ramp_2 faces deployment zone p2"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes.",
      "Ramp connectors face the deployment zones declared in this map's reviewed topology record; their exact rim positions carry the declared contour tolerance."
    ]
  },
  counts: {
    regions: 14,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 2,
      standable_high_ground: 2,
      cliff_edge: 2,
      ramp_access: 4,
      grass_sight: 2,
      ordinary_cover: 2
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "845cf341e2560468a3c6e3f2dc60318ad26a0304bd41be2ccf7df307d5992a2e",
  bindingHash: "296c067a63102b279258681557bbd43e33e3fb77400da5c74ba5908183dba66d"
});
