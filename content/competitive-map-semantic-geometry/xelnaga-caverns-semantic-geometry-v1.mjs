// Ticket 24 / Slice 254-R7 — Xel'Naga Caverns authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const XELNAGA_CAVERNS_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_xelnaga_caverns_v1",
  displayName: "Xel'Naga Caverns",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/xelnaga-caverns-display-v1.png",
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
      regionId: "natural_backdoor_sight_1",
      label: "Grass sight break — sight-blocked natural back doors",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_xelnaga_caverns_v1:natural_backdoor_sight:1: centre (210,330), extent 90x70, rotation 35deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 235,
              y: 363
            },
            {
              x: 208,
              y: 366
            },
            {
              x: 185,
              y: 353
            },
            {
              x: 169,
              y: 334
            },
            {
              x: 168,
              y: 310
            },
            {
              x: 184,
              y: 293
            },
            {
              x: 213,
              y: 292
            },
            {
              x: 236,
              y: 307
            },
            {
              x: 253,
              y: 329
            },
            {
              x: 251,
              y: 349
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_backdoor_sight_2",
      label: "Grass sight break — sight-blocked natural back doors",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_xelnaga_caverns_v1:natural_backdoor_sight:2: centre (790,670), extent 90x70, rotation 35deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 759,
              y: 638
            },
            {
              x: 789,
              y: 632
            },
            {
              x: 816,
              y: 649
            },
            {
              x: 829,
              y: 672
            },
            {
              x: 826,
              y: 693
            },
            {
              x: 808,
              y: 707
            },
            {
              x: 780,
              y: 707
            },
            {
              x: 755,
              y: 686
            },
            {
              x: 748,
              y: 657
            }
          ]
        ]
      }
    },
    {
      regionId: "third_rocks_1",
      label: "Impassable structure — rocks leading to alternate thirds",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_xelnaga_caverns_v1:third_rocks:1: centre (305,690), extent 95x70, rotation -30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 267,
              y: 712
            },
            {
              x: 264,
              y: 695
            },
            {
              x: 272,
              y: 674
            },
            {
              x: 289,
              y: 661
            },
            {
              x: 313,
              y: 655
            },
            {
              x: 343,
              y: 657
            },
            {
              x: 347,
              y: 674
            },
            {
              x: 342,
              y: 697
            },
            {
              x: 329,
              y: 713
            },
            {
              x: 307,
              y: 728
            },
            {
              x: 279,
              y: 726
            }
          ]
        ]
      }
    },
    {
      regionId: "third_rocks_2",
      label: "Impassable structure — rocks leading to alternate thirds",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_xelnaga_caverns_v1:third_rocks:2: centre (695,310), extent 95x70, rotation -30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 741,
              y: 291
            },
            {
              x: 736,
              y: 314
            },
            {
              x: 722,
              y: 331
            },
            {
              x: 706,
              y: 345
            },
            {
              x: 679,
              y: 349
            },
            {
              x: 664,
              y: 343
            },
            {
              x: 651,
              y: 329
            },
            {
              x: 648,
              y: 310
            },
            {
              x: 667,
              y: 286
            },
            {
              x: 685,
              y: 273
            },
            {
              x: 709,
              y: 275
            },
            {
              x: 726,
              y: 278
            }
          ]
        ]
      }
    },
    {
      regionId: "tower_platforms_1",
      label: "Ordinary cover — paired Xel'Naga sight platforms",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_xelnaga_caverns_v1:tower_platforms:1: centre (370,500), extent 100x80, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 372,
              y: 544
            },
            {
              x: 337,
              y: 534
            },
            {
              x: 324,
              y: 507
            },
            {
              x: 326,
              y: 481
            },
            {
              x: 350,
              y: 461
            },
            {
              x: 391,
              y: 460
            },
            {
              x: 411,
              y: 480
            },
            {
              x: 422,
              y: 512
            },
            {
              x: 402,
              y: 530
            }
          ]
        ]
      }
    },
    {
      regionId: "tower_platforms_2",
      label: "Ordinary cover — paired Xel'Naga sight platforms",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_xelnaga_caverns_v1:tower_platforms:2: centre (630,500), extent 100x80, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 673,
              y: 518
            },
            {
              x: 651,
              y: 537
            },
            {
              x: 621,
              y: 542
            },
            {
              x: 597,
              y: 530
            },
            {
              x: 584,
              y: 510
            },
            {
              x: 583,
              y: 492
            },
            {
              x: 596,
              y: 471
            },
            {
              x: 625,
              y: 462
            },
            {
              x: 649,
              y: 464
            },
            {
              x: 670,
              y: 477
            },
            {
              x: 682,
              y: 499
            }
          ]
        ]
      }
    },
    {
      regionId: "third_overlooks_1",
      label: "Standable high ground — high ground behind third lines",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_xelnaga_caverns_v1:third_overlooks:1: centre (240,620), extent 125x75, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 204,
              y: 654
            },
            {
              x: 179,
              y: 636
            },
            {
              x: 182,
              y: 616
            },
            {
              x: 188,
              y: 594
            },
            {
              x: 211,
              y: 586
            },
            {
              x: 250,
              y: 585
            },
            {
              x: 280,
              y: 588
            },
            {
              x: 293,
              y: 606
            },
            {
              x: 300,
              y: 621
            },
            {
              x: 291,
              y: 640
            },
            {
              x: 270,
              y: 655
            },
            {
              x: 233,
              y: 654
            }
          ]
        ]
      }
    },
    {
      regionId: "third_overlooks_2",
      label: "Standable high ground — high ground behind third lines",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_xelnaga_caverns_v1:third_overlooks:2: centre (760,380), extent 125x75, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 816,
              y: 391
            },
            {
              x: 792,
              y: 409
            },
            {
              x: 767,
              y: 415
            },
            {
              x: 731,
              y: 411
            },
            {
              x: 704,
              y: 402
            },
            {
              x: 693,
              y: 378
            },
            {
              x: 712,
              y: 361
            },
            {
              x: 737,
              y: 343
            },
            {
              x: 769,
              y: 342
            },
            {
              x: 804,
              y: 352
            },
            {
              x: 818,
              y: 374
            }
          ]
        ]
      }
    },
    {
      regionId: "third_overlooks_1_cliff_edge",
      label: "Cliff edge (third overlooks 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "third_overlooks_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 204,
            y: 654
          },
          {
            x: 179,
            y: 636
          },
          {
            x: 182,
            y: 616
          },
          {
            x: 188,
            y: 594
          },
          {
            x: 211,
            y: 586
          },
          {
            x: 250,
            y: 585
          },
          {
            x: 280,
            y: 588
          },
          {
            x: 293,
            y: 606
          },
          {
            x: 300,
            y: 621
          },
          {
            x: 291,
            y: 640
          },
          {
            x: 270,
            y: 655
          },
          {
            x: 233,
            y: 654
          }
        ]
      }
    },
    {
      regionId: "third_overlooks_1_ramp_1",
      label: "Ramp 1 (third overlooks 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "third_overlooks_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 225,
            y: 553
          },
          {
            x: 234,
            y: 592
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
      regionId: "third_overlooks_1_ramp_2",
      label: "Ramp 2 (third overlooks 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2, rotated -25deg from the direct zone bearing so the approach stays clear of impassable geometry (deterministic clearance search).",
      linkedRegionId: "third_overlooks_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 332,
            y: 615
          },
          {
            x: 293,
            y: 617
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
      regionId: "third_overlooks_2_cliff_edge",
      label: "Cliff edge (third overlooks 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "third_overlooks_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 816,
            y: 391
          },
          {
            x: 792,
            y: 409
          },
          {
            x: 767,
            y: 415
          },
          {
            x: 731,
            y: 411
          },
          {
            x: 704,
            y: 402
          },
          {
            x: 693,
            y: 378
          },
          {
            x: 712,
            y: 361
          },
          {
            x: 737,
            y: 343
          },
          {
            x: 769,
            y: 342
          },
          {
            x: 804,
            y: 352
          },
          {
            x: 818,
            y: 374
          }
        ]
      }
    },
    {
      regionId: "third_overlooks_2_ramp_1",
      label: "Ramp 1 (third overlooks 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1, rotated -25deg from the direct zone bearing so the approach stays clear of impassable geometry (deterministic clearance search).",
      linkedRegionId: "third_overlooks_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 668,
            y: 385
          },
          {
            x: 707,
            y: 383
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
      regionId: "third_overlooks_2_ramp_2",
      label: "Ramp 2 (third overlooks 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "third_overlooks_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 775,
            y: 447
          },
          {
            x: 766,
            y: 408
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
      "sc2_xelnaga_caverns_v1:natural_backdoor_sight:1 (sight/grass_sight) -> natural_backdoor_sight_1 (grass_sight)",
      "sc2_xelnaga_caverns_v1:natural_backdoor_sight:2 (sight/grass_sight) -> natural_backdoor_sight_2 (grass_sight)",
      "sc2_xelnaga_caverns_v1:third_rocks:1 (blocking/blocking) -> third_rocks_1 (impassable_structure)",
      "sc2_xelnaga_caverns_v1:third_rocks:2 (blocking/blocking) -> third_rocks_2 (impassable_structure)",
      "sc2_xelnaga_caverns_v1:tower_platforms:1 (high_ground/cover) -> tower_platforms_1 (ordinary_cover)",
      "sc2_xelnaga_caverns_v1:tower_platforms:2 (high_ground/cover) -> tower_platforms_2 (ordinary_cover)",
      "sc2_xelnaga_caverns_v1:third_overlooks:1 (high_ground/standable_high_ground) -> third_overlooks_1 (standable_high_ground)",
      "sc2_xelnaga_caverns_v1:third_overlooks:2 (high_ground/standable_high_ground) -> third_overlooks_2 (standable_high_ground)",
      "ramp portal -> third_overlooks_1_ramp_1 faces deployment zone p1",
      "ramp portal -> third_overlooks_1_ramp_2 faces deployment zone p2 (rotated -25deg)",
      "ramp portal -> third_overlooks_2_ramp_1 faces deployment zone p1 (rotated -25deg)",
      "ramp portal -> third_overlooks_2_ramp_2 faces deployment zone p2"
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
  geometryHash: "51449b0bd2008533b2162b44e57051daf3bf14984cadec408726e75fa1b5a026",
  bindingHash: "2c17b60e3e0e65a50f46381b738eb958e1bafa35ad344b5304e4bbea6e9e8654"
});
