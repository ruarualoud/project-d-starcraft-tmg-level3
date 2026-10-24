// Ticket 24 / Slice 254-R7 — Match Point authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const MATCH_POINT_1_4_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_match_point_1_4_v1",
  displayName: "Match Point",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/match-point-display-v2.png",
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
      regionId: "raised_plateaus_1",
      label: "Standable high ground — paired map-control plateaus",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_match_point_1_4_v1:raised_plateaus:1: centre (260,500), extent 160x120, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 325,
              y: 472
            },
            {
              x: 342,
              y: 502
            },
            {
              x: 309,
              y: 545
            },
            {
              x: 264,
              y: 565
            },
            {
              x: 210,
              y: 545
            },
            {
              x: 188,
              y: 513
            },
            {
              x: 184,
              y: 471
            },
            {
              x: 233,
              y: 448
            },
            {
              x: 281,
              y: 446
            }
          ]
        ]
      }
    },
    {
      regionId: "raised_plateaus_2",
      label: "Standable high ground — paired map-control plateaus",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_match_point_1_4_v1:raised_plateaus:2: centre (740,500), extent 160x120, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 821,
              y: 509
            },
            {
              x: 803,
              y: 540
            },
            {
              x: 771,
              y: 557
            },
            {
              x: 725,
              y: 564
            },
            {
              x: 683,
              y: 545
            },
            {
              x: 672,
              y: 523
            },
            {
              x: 656,
              y: 492
            },
            {
              x: 678,
              y: 459
            },
            {
              x: 712,
              y: 439
            },
            {
              x: 753,
              y: 446
            },
            {
              x: 791,
              y: 458
            },
            {
              x: 820,
              y: 478
            }
          ]
        ]
      }
    },
    {
      regionId: "seep_route_cover_1",
      label: "Ordinary cover — small seep and counterattack routes",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_match_point_1_4_v1:seep_route_cover:1: centre (150,390), extent 85x65, rotation -20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 153,
              y: 355
            },
            {
              x: 173,
              y: 362
            },
            {
              x: 189,
              y: 368
            },
            {
              x: 188,
              y: 389
            },
            {
              x: 181,
              y: 409
            },
            {
              x: 159,
              y: 423
            },
            {
              x: 137,
              y: 424
            },
            {
              x: 118,
              y: 417
            },
            {
              x: 106,
              y: 402
            },
            {
              x: 109,
              y: 381
            },
            {
              x: 127,
              y: 368
            }
          ]
        ]
      }
    },
    {
      regionId: "seep_route_cover_2",
      label: "Ordinary cover — small seep and counterattack routes",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_match_point_1_4_v1:seep_route_cover:2: centre (150,610), extent 85x65, rotation 20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 181,
              y: 634
            },
            {
              x: 167,
              y: 645
            },
            {
              x: 143,
              y: 643
            },
            {
              x: 117,
              y: 627
            },
            {
              x: 108,
              y: 613
            },
            {
              x: 107,
              y: 593
            },
            {
              x: 128,
              y: 577
            },
            {
              x: 146,
              y: 577
            },
            {
              x: 172,
              y: 583
            },
            {
              x: 188,
              y: 602
            },
            {
              x: 192,
              y: 617
            }
          ]
        ]
      }
    },
    {
      regionId: "seep_route_cover_3",
      label: "Ordinary cover — small seep and counterattack routes",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_match_point_1_4_v1:seep_route_cover:3: centre (850,390), extent 85x65, rotation 20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 814,
              y: 365
            },
            {
              x: 844,
              y: 359
            },
            {
              x: 871,
              y: 364
            },
            {
              x: 888,
              y: 384
            },
            {
              x: 893,
              y: 406
            },
            {
              x: 874,
              y: 424
            },
            {
              x: 847,
              y: 424
            },
            {
              x: 819,
              y: 410
            },
            {
              x: 812,
              y: 388
            }
          ]
        ]
      }
    },
    {
      regionId: "seep_route_cover_4",
      label: "Ordinary cover — small seep and counterattack routes",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_match_point_1_4_v1:seep_route_cover:4: centre (850,610), extent 85x65, rotation -20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 877,
              y: 632
            },
            {
              x: 850,
              y: 642
            },
            {
              x: 824,
              y: 641
            },
            {
              x: 812,
              y: 622
            },
            {
              x: 809,
              y: 601
            },
            {
              x: 831,
              y: 582
            },
            {
              x: 858,
              y: 578
            },
            {
              x: 884,
              y: 583
            },
            {
              x: 889,
              y: 610
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_cliff_edges_1",
      label: "Ordinary cover — harassable natural cliff edges",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_match_point_1_4_v1:natural_cliff_edges:1: centre (380,220), extent 115x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 326,
              y: 210
            },
            {
              x: 338,
              y: 195
            },
            {
              x: 368,
              y: 186
            },
            {
              x: 397,
              y: 186
            },
            {
              x: 418,
              y: 200
            },
            {
              x: 432,
              y: 216
            },
            {
              x: 433,
              y: 228
            },
            {
              x: 420,
              y: 243
            },
            {
              x: 391,
              y: 250
            },
            {
              x: 357,
              y: 252
            },
            {
              x: 330,
              y: 241
            },
            {
              x: 328,
              y: 223
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_cliff_edges_2",
      label: "Ordinary cover — harassable natural cliff edges",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_match_point_1_4_v1:natural_cliff_edges:2: centre (620,780), extent 115x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 576,
              y: 803
            },
            {
              x: 564,
              y: 782
            },
            {
              x: 565,
              y: 765
            },
            {
              x: 588,
              y: 755
            },
            {
              x: 616,
              y: 745
            },
            {
              x: 655,
              y: 753
            },
            {
              x: 670,
              y: 768
            },
            {
              x: 680,
              y: 785
            },
            {
              x: 659,
              y: 802
            },
            {
              x: 634,
              y: 810
            },
            {
              x: 598,
              y: 811
            }
          ]
        ]
      }
    },
    {
      regionId: "middle_sight_1",
      label: "Grass sight break — sight breaks on the short middle",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_match_point_1_4_v1:middle_sight:1: centre (500,430), extent 70x55, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 507,
              y: 455
            },
            {
              x: 486,
              y: 457
            },
            {
              x: 471,
              y: 442
            },
            {
              x: 463,
              y: 429
            },
            {
              x: 475,
              y: 411
            },
            {
              x: 492,
              y: 406
            },
            {
              x: 514,
              y: 402
            },
            {
              x: 529,
              y: 414
            },
            {
              x: 535,
              y: 433
            },
            {
              x: 527,
              y: 447
            }
          ]
        ]
      }
    },
    {
      regionId: "middle_sight_2",
      label: "Grass sight break — sight breaks on the short middle",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_match_point_1_4_v1:middle_sight:2: centre (500,570), extent 70x55, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 505,
              y: 595
            },
            {
              x: 488,
              y: 596
            },
            {
              x: 474,
              y: 585
            },
            {
              x: 462,
              y: 569
            },
            {
              x: 471,
              y: 555
            },
            {
              x: 487,
              y: 544
            },
            {
              x: 506,
              y: 541
            },
            {
              x: 524,
              y: 548
            },
            {
              x: 533,
              y: 559
            },
            {
              x: 536,
              y: 576
            },
            {
              x: 521,
              y: 589
            }
          ]
        ]
      }
    },
    {
      regionId: "raised_plateaus_1_cliff_edge",
      label: "Cliff edge (raised plateaus 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "raised_plateaus_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 325,
            y: 472
          },
          {
            x: 342,
            y: 502
          },
          {
            x: 309,
            y: 545
          },
          {
            x: 264,
            y: 565
          },
          {
            x: 210,
            y: 545
          },
          {
            x: 188,
            y: 513
          },
          {
            x: 184,
            y: 471
          },
          {
            x: 233,
            y: 448
          },
          {
            x: 281,
            y: 446
          }
        ]
      }
    },
    {
      regionId: "raised_plateaus_1_ramp_1",
      label: "Ramp 1 (raised plateaus 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "raised_plateaus_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 309,
            y: 414
          },
          {
            x: 289,
            y: 449
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
      regionId: "raised_plateaus_1_ramp_2",
      label: "Ramp 2 (raised plateaus 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "raised_plateaus_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 309,
            y: 586
          },
          {
            x: 289,
            y: 551
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
      regionId: "raised_plateaus_2_cliff_edge",
      label: "Cliff edge (raised plateaus 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "raised_plateaus_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 821,
            y: 509
          },
          {
            x: 803,
            y: 540
          },
          {
            x: 771,
            y: 557
          },
          {
            x: 725,
            y: 564
          },
          {
            x: 683,
            y: 545
          },
          {
            x: 672,
            y: 523
          },
          {
            x: 656,
            y: 492
          },
          {
            x: 678,
            y: 459
          },
          {
            x: 712,
            y: 439
          },
          {
            x: 753,
            y: 446
          },
          {
            x: 791,
            y: 458
          },
          {
            x: 820,
            y: 478
          }
        ]
      }
    },
    {
      regionId: "raised_plateaus_2_ramp_1",
      label: "Ramp 1 (raised plateaus 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "raised_plateaus_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 691,
            y: 414
          },
          {
            x: 711,
            y: 449
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
      regionId: "raised_plateaus_2_ramp_2",
      label: "Ramp 2 (raised plateaus 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "raised_plateaus_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 691,
            y: 586
          },
          {
            x: 711,
            y: 551
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
      "sc1_match_point_1_4_v1:raised_plateaus:1 (high_ground/standable_high_ground) -> raised_plateaus_1 (standable_high_ground)",
      "sc1_match_point_1_4_v1:raised_plateaus:2 (high_ground/standable_high_ground) -> raised_plateaus_2 (standable_high_ground)",
      "sc1_match_point_1_4_v1:seep_route_cover:1 (cover/passable_difficult) -> seep_route_cover_1 (ordinary_cover)",
      "sc1_match_point_1_4_v1:seep_route_cover:2 (cover/passable_difficult) -> seep_route_cover_2 (ordinary_cover)",
      "sc1_match_point_1_4_v1:seep_route_cover:3 (cover/passable_difficult) -> seep_route_cover_3 (ordinary_cover)",
      "sc1_match_point_1_4_v1:seep_route_cover:4 (cover/passable_difficult) -> seep_route_cover_4 (ordinary_cover)",
      "sc1_match_point_1_4_v1:natural_cliff_edges:1 (high_ground/cover) -> natural_cliff_edges_1 (ordinary_cover)",
      "sc1_match_point_1_4_v1:natural_cliff_edges:2 (high_ground/cover) -> natural_cliff_edges_2 (ordinary_cover)",
      "sc1_match_point_1_4_v1:middle_sight:1 (sight/grass_sight) -> middle_sight_1 (grass_sight)",
      "sc1_match_point_1_4_v1:middle_sight:2 (sight/grass_sight) -> middle_sight_2 (grass_sight)",
      "ramp portal -> raised_plateaus_1_ramp_1 faces deployment zone p1",
      "ramp portal -> raised_plateaus_1_ramp_2 faces deployment zone p2",
      "ramp portal -> raised_plateaus_2_ramp_1 faces deployment zone p1",
      "ramp portal -> raised_plateaus_2_ramp_2 faces deployment zone p2"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes.",
      "Ramp connectors face the deployment zones declared in this map's reviewed topology record; their exact rim positions carry the declared contour tolerance."
    ]
  },
  counts: {
    regions: 16,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 0,
      standable_high_ground: 2,
      cliff_edge: 2,
      ramp_access: 4,
      grass_sight: 2,
      ordinary_cover: 6
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "43bae7aa42f4fc693d6778b36c76377afc6e197c063c615aca03182be8ffc05b",
  bindingHash: "776db3ca7e038551e6c6f574ea92cadfc057f387e7da243a1a192a46e9eda270"
});
