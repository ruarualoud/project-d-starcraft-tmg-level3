// Ticket 24 / Slice 254-R7 — Metalopolis authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const METALOPOLIS_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_metalopolis_v1",
  displayName: "Metalopolis",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/metalopolis-display-v1.png",
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
      regionId: "watch_platforms_1",
      label: "Standable high ground — paired watch platforms",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_metalopolis_v1:watch_platforms:1: centre (420,650), extent 115x85, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 404,
              y: 607
            },
            {
              x: 443,
              y: 609
            },
            {
              x: 470,
              y: 626
            },
            {
              x: 476,
              y: 651
            },
            {
              x: 468,
              y: 678
            },
            {
              x: 434,
              y: 694
            },
            {
              x: 397,
              y: 692
            },
            {
              x: 372,
              y: 673
            },
            {
              x: 368,
              y: 649
            },
            {
              x: 373,
              y: 624
            }
          ]
        ]
      }
    },
    {
      regionId: "watch_platforms_2",
      label: "Standable high ground — paired watch platforms",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_metalopolis_v1:watch_platforms:2: centre (580,350), extent 115x85, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 596,
              y: 308
            },
            {
              x: 627,
              y: 322
            },
            {
              x: 639,
              y: 349
            },
            {
              x: 621,
              y: 375
            },
            {
              x: 598,
              y: 394
            },
            {
              x: 557,
              y: 392
            },
            {
              x: 538,
              y: 374
            },
            {
              x: 521,
              y: 351
            },
            {
              x: 533,
              y: 328
            },
            {
              x: 563,
              y: 313
            }
          ]
        ]
      }
    },
    {
      regionId: "gold_zone_cover_1",
      label: "Ordinary cover — contested centre-side resource platforms",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_metalopolis_v1:gold_zone_cover:1: centre (275,500), extent 120x85, rotation 90deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 260,
              y: 559
            },
            {
              x: 241,
              y: 528
            },
            {
              x: 231,
              y: 486
            },
            {
              x: 251,
              y: 452
            },
            {
              x: 278,
              y: 445
            },
            {
              x: 301,
              y: 452
            },
            {
              x: 318,
              y: 486
            },
            {
              x: 311,
              y: 528
            },
            {
              x: 285,
              y: 554
            }
          ]
        ]
      }
    },
    {
      regionId: "gold_zone_cover_2",
      label: "Ordinary cover — contested centre-side resource platforms",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_metalopolis_v1:gold_zone_cover:2: centre (725,500), extent 120x85, rotation 90deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 693,
              y: 464
            },
            {
              x: 715,
              y: 447
            },
            {
              x: 737,
              y: 444
            },
            {
              x: 756,
              y: 465
            },
            {
              x: 767,
              y: 496
            },
            {
              x: 758,
              y: 536
            },
            {
              x: 736,
              y: 555
            },
            {
              x: 711,
              y: 554
            },
            {
              x: 691,
              y: 536
            },
            {
              x: 684,
              y: 502
            }
          ]
        ]
      }
    },
    {
      regionId: "base_smoke_1",
      label: "Grass sight break — smoke sight blockers",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_metalopolis_v1:base_smoke:1: centre (230,215), extent 80x65, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 210,
              y: 184
            },
            {
              x: 229,
              y: 177
            },
            {
              x: 253,
              y: 192
            },
            {
              x: 265,
              y: 212
            },
            {
              x: 267,
              y: 232
            },
            {
              x: 250,
              y: 251
            },
            {
              x: 227,
              y: 253
            },
            {
              x: 210,
              y: 240
            },
            {
              x: 199,
              y: 221
            },
            {
              x: 198,
              y: 196
            }
          ]
        ]
      }
    },
    {
      regionId: "base_smoke_2",
      label: "Grass sight break — smoke sight blockers",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_metalopolis_v1:base_smoke:2: centre (770,785), extent 80x65, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 734,
              y: 786
            },
            {
              x: 737,
              y: 766
            },
            {
              x: 752,
              y: 747
            },
            {
              x: 775,
              y: 754
            },
            {
              x: 795,
              y: 769
            },
            {
              x: 806,
              y: 795
            },
            {
              x: 795,
              y: 817
            },
            {
              x: 774,
              y: 822
            },
            {
              x: 754,
              y: 811
            }
          ]
        ]
      }
    },
    {
      regionId: "crossroad_rubble_1",
      label: "Ordinary cover — ruined-city crossroad blockers",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_metalopolis_v1:crossroad_rubble:1: centre (430,500), extent 70x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 407,
              y: 528
            },
            {
              x: 397,
              y: 514
            },
            {
              x: 395,
              y: 499
            },
            {
              x: 404,
              y: 479
            },
            {
              x: 413,
              y: 467
            },
            {
              x: 432,
              y: 464
            },
            {
              x: 452,
              y: 473
            },
            {
              x: 463,
              y: 486
            },
            {
              x: 466,
              y: 505
            },
            {
              x: 455,
              y: 521
            },
            {
              x: 443,
              y: 532
            },
            {
              x: 426,
              y: 536
            }
          ]
        ]
      }
    },
    {
      regionId: "crossroad_rubble_2",
      label: "Ordinary cover — ruined-city crossroad blockers",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_metalopolis_v1:crossroad_rubble:2: centre (570,500), extent 70x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 566,
              y: 533
            },
            {
              x: 545,
              y: 524
            },
            {
              x: 536,
              y: 504
            },
            {
              x: 541,
              y: 484
            },
            {
              x: 555,
              y: 470
            },
            {
              x: 576,
              y: 463
            },
            {
              x: 598,
              y: 475
            },
            {
              x: 606,
              y: 495
            },
            {
              x: 603,
              y: 518
            },
            {
              x: 586,
              y: 532
            }
          ]
        ]
      }
    },
    {
      regionId: "watch_platforms_1_cliff_edge",
      label: "Cliff edge (watch platforms 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "watch_platforms_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 404,
            y: 607
          },
          {
            x: 443,
            y: 609
          },
          {
            x: 470,
            y: 626
          },
          {
            x: 476,
            y: 651
          },
          {
            x: 468,
            y: 678
          },
          {
            x: 434,
            y: 694
          },
          {
            x: 397,
            y: 692
          },
          {
            x: 372,
            y: 673
          },
          {
            x: 368,
            y: 649
          },
          {
            x: 373,
            y: 624
          }
        ]
      }
    },
    {
      regionId: "watch_platforms_1_ramp_1",
      label: "Ramp 1 (watch platforms 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "watch_platforms_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 380,
            y: 582
          },
          {
            x: 400,
            y: 616
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
      regionId: "watch_platforms_1_ramp_2",
      label: "Ramp 2 (watch platforms 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "watch_platforms_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 505,
            y: 689
          },
          {
            x: 468,
            y: 672
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
      regionId: "watch_platforms_2_cliff_edge",
      label: "Cliff edge (watch platforms 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "watch_platforms_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 596,
            y: 308
          },
          {
            x: 627,
            y: 322
          },
          {
            x: 639,
            y: 349
          },
          {
            x: 621,
            y: 375
          },
          {
            x: 598,
            y: 394
          },
          {
            x: 557,
            y: 392
          },
          {
            x: 538,
            y: 374
          },
          {
            x: 521,
            y: 351
          },
          {
            x: 533,
            y: 328
          },
          {
            x: 563,
            y: 313
          }
        ]
      }
    },
    {
      regionId: "watch_platforms_2_ramp_1",
      label: "Ramp 1 (watch platforms 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "watch_platforms_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 495,
            y: 311
          },
          {
            x: 532,
            y: 328
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
      regionId: "watch_platforms_2_ramp_2",
      label: "Ramp 2 (watch platforms 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "watch_platforms_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 620,
            y: 418
          },
          {
            x: 600,
            y: 384
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
      "sc2_metalopolis_v1:watch_platforms:1 (high_ground/standable_high_ground) -> watch_platforms_1 (standable_high_ground)",
      "sc2_metalopolis_v1:watch_platforms:2 (high_ground/standable_high_ground) -> watch_platforms_2 (standable_high_ground)",
      "sc2_metalopolis_v1:gold_zone_cover:1 (cover/cover) -> gold_zone_cover_1 (ordinary_cover)",
      "sc2_metalopolis_v1:gold_zone_cover:2 (cover/cover) -> gold_zone_cover_2 (ordinary_cover)",
      "sc2_metalopolis_v1:base_smoke:1 (sight/grass_sight) -> base_smoke_1 (grass_sight)",
      "sc2_metalopolis_v1:base_smoke:2 (sight/grass_sight) -> base_smoke_2 (grass_sight)",
      "sc2_metalopolis_v1:crossroad_rubble:1 (blocking/passable_difficult) -> crossroad_rubble_1 (ordinary_cover)",
      "sc2_metalopolis_v1:crossroad_rubble:2 (blocking/passable_difficult) -> crossroad_rubble_2 (ordinary_cover)",
      "ramp portal -> watch_platforms_1_ramp_1 faces deployment zone p1",
      "ramp portal -> watch_platforms_1_ramp_2 faces deployment zone p2",
      "ramp portal -> watch_platforms_2_ramp_1 faces deployment zone p1",
      "ramp portal -> watch_platforms_2_ramp_2 faces deployment zone p2"
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
      impassable_structure: 0,
      standable_high_ground: 2,
      cliff_edge: 2,
      ramp_access: 4,
      grass_sight: 2,
      ordinary_cover: 4
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "a3ba2df00e0b3daee760e3542e83f1dd61bdf41e5f1389c143693028f522490d",
  bindingHash: "b2ab712da907200bbb83326c31b2202f72fbd629f0d5909a2b5d4089d58f023e"
});
