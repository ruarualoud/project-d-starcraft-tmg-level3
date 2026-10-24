// Ticket 24 / Slice 254-R7 — Cloud Kingdom authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const CLOUD_KINGDOM_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_cloud_kingdom_v1",
  displayName: "Cloud Kingdom",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/cloud-kingdom-display-v1.png",
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
      regionId: "direct_ramp_rocks_1",
      label: "Ordinary cover — rocks narrowing the direct ramps",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_cloud_kingdom_v1:direct_ramp_rocks:1: centre (390,430), extent 90x65, rotation 35deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 428,
              y: 447
            },
            {
              x: 419,
              y: 463
            },
            {
              x: 391,
              y: 463
            },
            {
              x: 366,
              y: 452
            },
            {
              x: 352,
              y: 431
            },
            {
              x: 353,
              y: 411
            },
            {
              x: 362,
              y: 395
            },
            {
              x: 385,
              y: 391
            },
            {
              x: 410,
              y: 407
            },
            {
              x: 431,
              y: 425
            }
          ]
        ]
      }
    },
    {
      regionId: "direct_ramp_rocks_2",
      label: "Ordinary cover — rocks narrowing the direct ramps",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_cloud_kingdom_v1:direct_ramp_rocks:2: centre (610,570), extent 90x65, rotation 35deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 598,
              y: 536
            },
            {
              x: 620,
              y: 537
            },
            {
              x: 638,
              y: 554
            },
            {
              x: 648,
              y: 577
            },
            {
              x: 648,
              y: 598
            },
            {
              x: 628,
              y: 608
            },
            {
              x: 600,
              y: 605
            },
            {
              x: 580,
              y: 586
            },
            {
              x: 570,
              y: 560
            },
            {
              x: 574,
              y: 539
            }
          ]
        ]
      }
    },
    {
      regionId: "long_route_highs_1",
      label: "Standable high ground — superior-position long-route high ground",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_cloud_kingdom_v1:long_route_highs:1: centre (350,760), extent 140x85, rotation -20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 352,
              y: 800
            },
            {
              x: 315,
              y: 810
            },
            {
              x: 295,
              y: 791
            },
            {
              x: 277,
              y: 776
            },
            {
              x: 298,
              y: 743
            },
            {
              x: 325,
              y: 725
            },
            {
              x: 366,
              y: 710
            },
            {
              x: 401,
              y: 719
            },
            {
              x: 422,
              y: 735
            },
            {
              x: 411,
              y: 764
            },
            {
              x: 390,
              y: 789
            }
          ]
        ]
      }
    },
    {
      regionId: "long_route_highs_2",
      label: "Standable high ground — superior-position long-route high ground",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_cloud_kingdom_v1:long_route_highs:2: centre (650,240), extent 140x85, rotation -20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 692,
              y: 263
            },
            {
              x: 650,
              y: 286
            },
            {
              x: 604,
              y: 278
            },
            {
              x: 589,
              y: 256
            },
            {
              x: 595,
              y: 226
            },
            {
              x: 633,
              y: 204
            },
            {
              x: 680,
              y: 191
            },
            {
              x: 712,
              y: 209
            },
            {
              x: 710,
              y: 238
            }
          ]
        ]
      }
    },
    {
      regionId: "wide_zone_cover_1",
      label: "Ordinary cover — cover beside wide engagement zones",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_cloud_kingdom_v1:wide_zone_cover:1: centre (280,520), extent 100x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 323,
              y: 499
            },
            {
              x: 327,
              y: 514
            },
            {
              x: 327,
              y: 538
            },
            {
              x: 308,
              y: 550
            },
            {
              x: 277,
              y: 552
            },
            {
              x: 251,
              y: 551
            },
            {
              x: 233,
              y: 533
            },
            {
              x: 230,
              y: 515
            },
            {
              x: 245,
              y: 498
            },
            {
              x: 266,
              y: 488
            },
            {
              x: 293,
              y: 488
            }
          ]
        ]
      }
    },
    {
      regionId: "wide_zone_cover_2",
      label: "Ordinary cover — cover beside wide engagement zones",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_cloud_kingdom_v1:wide_zone_cover:2: centre (720,480), extent 100x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 774,
              y: 479
            },
            {
              x: 760,
              y: 500
            },
            {
              x: 732,
              y: 517
            },
            {
              x: 697,
              y: 510
            },
            {
              x: 671,
              y: 494
            },
            {
              x: 675,
              y: 469
            },
            {
              x: 689,
              y: 453
            },
            {
              x: 727,
              y: 448
            },
            {
              x: 756,
              y: 455
            }
          ]
        ]
      }
    },
    {
      regionId: "cloud_sight_1",
      label: "Grass sight break — central sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_cloud_kingdom_v1:cloud_sight:1: centre (450,500), extent 70x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 472,
              y: 521
            },
            {
              x: 455,
              y: 530
            },
            {
              x: 430,
              y: 526
            },
            {
              x: 418,
              y: 505
            },
            {
              x: 419,
              y: 486
            },
            {
              x: 438,
              y: 472
            },
            {
              x: 461,
              y: 470
            },
            {
              x: 478,
              y: 481
            },
            {
              x: 485,
              y: 504
            }
          ]
        ]
      }
    },
    {
      regionId: "cloud_sight_2",
      label: "Grass sight break — central sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_cloud_kingdom_v1:cloud_sight:2: centre (550,500), extent 70x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 587,
              y: 506
            },
            {
              x: 573,
              y: 522
            },
            {
              x: 554,
              y: 530
            },
            {
              x: 533,
              y: 526
            },
            {
              x: 517,
              y: 513
            },
            {
              x: 517,
              y: 494
            },
            {
              x: 528,
              y: 475
            },
            {
              x: 550,
              y: 473
            },
            {
              x: 565,
              y: 474
            },
            {
              x: 583,
              y: 488
            }
          ]
        ]
      }
    },
    {
      regionId: "long_route_highs_1_cliff_edge",
      label: "Cliff edge (long route highs 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "long_route_highs_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 352,
            y: 800
          },
          {
            x: 315,
            y: 810
          },
          {
            x: 295,
            y: 791
          },
          {
            x: 277,
            y: 776
          },
          {
            x: 298,
            y: 743
          },
          {
            x: 325,
            y: 725
          },
          {
            x: 366,
            y: 710
          },
          {
            x: 401,
            y: 719
          },
          {
            x: 422,
            y: 735
          },
          {
            x: 411,
            y: 764
          },
          {
            x: 390,
            y: 789
          }
        ]
      }
    },
    {
      regionId: "long_route_highs_1_ramp_1",
      label: "Ramp 1 (long route highs 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "long_route_highs_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 326,
            y: 692
          },
          {
            x: 339,
            y: 729
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
      regionId: "long_route_highs_1_ramp_2",
      label: "Ramp 2 (long route highs 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "long_route_highs_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 460,
            y: 781
          },
          {
            x: 420,
            y: 774
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
      regionId: "long_route_highs_2_cliff_edge",
      label: "Cliff edge (long route highs 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "long_route_highs_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 692,
            y: 263
          },
          {
            x: 650,
            y: 286
          },
          {
            x: 604,
            y: 278
          },
          {
            x: 589,
            y: 256
          },
          {
            x: 595,
            y: 226
          },
          {
            x: 633,
            y: 204
          },
          {
            x: 680,
            y: 191
          },
          {
            x: 712,
            y: 209
          },
          {
            x: 710,
            y: 238
          }
        ]
      }
    },
    {
      regionId: "long_route_highs_2_ramp_1",
      label: "Ramp 1 (long route highs 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "long_route_highs_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 540,
            y: 219
          },
          {
            x: 580,
            y: 226
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
      regionId: "long_route_highs_2_ramp_2",
      label: "Ramp 2 (long route highs 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "long_route_highs_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 674,
            y: 308
          },
          {
            x: 661,
            y: 271
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
      "sc2_cloud_kingdom_v1:direct_ramp_rocks:1 (blocking/passable_difficult) -> direct_ramp_rocks_1 (ordinary_cover)",
      "sc2_cloud_kingdom_v1:direct_ramp_rocks:2 (blocking/passable_difficult) -> direct_ramp_rocks_2 (ordinary_cover)",
      "sc2_cloud_kingdom_v1:long_route_highs:1 (high_ground/standable_high_ground) -> long_route_highs_1 (standable_high_ground)",
      "sc2_cloud_kingdom_v1:long_route_highs:2 (high_ground/standable_high_ground) -> long_route_highs_2 (standable_high_ground)",
      "sc2_cloud_kingdom_v1:wide_zone_cover:1 (cover/cover) -> wide_zone_cover_1 (ordinary_cover)",
      "sc2_cloud_kingdom_v1:wide_zone_cover:2 (cover/cover) -> wide_zone_cover_2 (ordinary_cover)",
      "sc2_cloud_kingdom_v1:cloud_sight:1 (sight/grass_sight) -> cloud_sight_1 (grass_sight)",
      "sc2_cloud_kingdom_v1:cloud_sight:2 (sight/grass_sight) -> cloud_sight_2 (grass_sight)",
      "ramp portal -> long_route_highs_1_ramp_1 faces deployment zone p1",
      "ramp portal -> long_route_highs_1_ramp_2 faces deployment zone p2",
      "ramp portal -> long_route_highs_2_ramp_1 faces deployment zone p1",
      "ramp portal -> long_route_highs_2_ramp_2 faces deployment zone p2"
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
  geometryHash: "919d4e0c2e9bc95bb39cfeb331e788c5dd70775a635574c0289e6eb59b0bc8cc",
  bindingHash: "814771358cff84247dd1b9c7475831e24b0e7dca0a045577672fe9a3fcc095cb"
});
