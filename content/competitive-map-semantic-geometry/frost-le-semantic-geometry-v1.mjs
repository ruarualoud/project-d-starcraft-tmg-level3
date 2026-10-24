// Ticket 24 / Slice 254-R7 — Frost authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const FROST_LE_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_frost_le_v1",
  displayName: "Frost",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/frost-display-v1.png",
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
      regionId: "central_towers_1",
      label: "Ordinary cover — paired central watch positions",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_frost_le_v1:central_towers:1: centre (420,620), extent 105x80, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 401,
              y: 583
            },
            {
              x: 425,
              y: 578
            },
            {
              x: 449,
              y: 587
            },
            {
              x: 468,
              y: 602
            },
            {
              x: 468,
              y: 626
            },
            {
              x: 459,
              y: 646
            },
            {
              x: 442,
              y: 657
            },
            {
              x: 415,
              y: 661
            },
            {
              x: 390,
              y: 649
            },
            {
              x: 375,
              y: 636
            },
            {
              x: 370,
              y: 613
            },
            {
              x: 379,
              y: 598
            }
          ]
        ]
      }
    },
    {
      regionId: "central_towers_2",
      label: "Ordinary cover — paired central watch positions",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_frost_le_v1:central_towers:2: centre (580,380), extent 105x80, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 544,
              y: 350
            },
            {
              x: 573,
              y: 343
            },
            {
              x: 602,
              y: 344
            },
            {
              x: 622,
              y: 357
            },
            {
              x: 630,
              y: 377
            },
            {
              x: 623,
              y: 400
            },
            {
              x: 600,
              y: 417
            },
            {
              x: 575,
              y: 421
            },
            {
              x: 549,
              y: 408
            },
            {
              x: 529,
              y: 394
            },
            {
              x: 528,
              y: 371
            }
          ]
        ]
      }
    },
    {
      regionId: "third_choice_highs_1",
      label: "Standable high ground — high ground influencing alternate thirds",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_frost_le_v1:third_choice_highs:1: centre (260,560), extent 135x85, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 194,
              y: 551
            },
            {
              x: 216,
              y: 532
            },
            {
              x: 245,
              y: 516
            },
            {
              x: 276,
              y: 516
            },
            {
              x: 307,
              y: 530
            },
            {
              x: 329,
              y: 548
            },
            {
              x: 326,
              y: 575
            },
            {
              x: 312,
              y: 593
            },
            {
              x: 275,
              y: 605
            },
            {
              x: 235,
              y: 603
            },
            {
              x: 210,
              y: 590
            },
            {
              x: 198,
              y: 569
            }
          ]
        ]
      }
    },
    {
      regionId: "third_choice_highs_2",
      label: "Standable high ground — high ground influencing alternate thirds",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_frost_le_v1:third_choice_highs:2: centre (740,440), extent 135x85, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 694,
              y: 410
            },
            {
              x: 723,
              y: 397
            },
            {
              x: 763,
              y: 402
            },
            {
              x: 791,
              y: 418
            },
            {
              x: 813,
              y: 438
            },
            {
              x: 796,
              y: 462
            },
            {
              x: 770,
              y: 477
            },
            {
              x: 736,
              y: 484
            },
            {
              x: 699,
              y: 473
            },
            {
              x: 672,
              y: 454
            },
            {
              x: 677,
              y: 428
            }
          ]
        ]
      }
    },
    {
      regionId: "frost_sight_1",
      label: "Grass sight break — snowfield sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_frost_le_v1:frost_sight:1: centre (350,450), extent 80x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 387,
              y: 440
            },
            {
              x: 386,
              y: 461
            },
            {
              x: 376,
              y: 478
            },
            {
              x: 350,
              y: 484
            },
            {
              x: 328,
              y: 479
            },
            {
              x: 315,
              y: 458
            },
            {
              x: 309,
              y: 440
            },
            {
              x: 328,
              y: 425
            },
            {
              x: 349,
              y: 419
            },
            {
              x: 374,
              y: 423
            }
          ]
        ]
      }
    },
    {
      regionId: "frost_sight_2",
      label: "Grass sight break — snowfield sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_frost_le_v1:frost_sight:2: centre (650,550), extent 80x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 608,
              y: 552
            },
            {
              x: 619,
              y: 534
            },
            {
              x: 632,
              y: 521
            },
            {
              x: 657,
              y: 520
            },
            {
              x: 676,
              y: 524
            },
            {
              x: 688,
              y: 541
            },
            {
              x: 686,
              y: 559
            },
            {
              x: 677,
              y: 574
            },
            {
              x: 657,
              y: 581
            },
            {
              x: 634,
              y: 582
            },
            {
              x: 613,
              y: 567
            }
          ]
        ]
      }
    },
    {
      regionId: "third_choice_highs_1_cliff_edge",
      label: "Cliff edge (third choice highs 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "third_choice_highs_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 194,
            y: 551
          },
          {
            x: 216,
            y: 532
          },
          {
            x: 245,
            y: 516
          },
          {
            x: 276,
            y: 516
          },
          {
            x: 307,
            y: 530
          },
          {
            x: 329,
            y: 548
          },
          {
            x: 326,
            y: 575
          },
          {
            x: 312,
            y: 593
          },
          {
            x: 275,
            y: 605
          },
          {
            x: 235,
            y: 603
          },
          {
            x: 210,
            y: 590
          },
          {
            x: 198,
            y: 569
          }
        ]
      }
    },
    {
      regionId: "third_choice_highs_1_ramp_1",
      label: "Ramp 1 (third choice highs 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "third_choice_highs_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 235,
            y: 489
          },
          {
            x: 248,
            y: 527
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
      regionId: "third_choice_highs_1_ramp_2",
      label: "Ramp 2 (third choice highs 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "third_choice_highs_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 354,
            y: 606
          },
          {
            x: 319,
            y: 589
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
      regionId: "third_choice_highs_2_cliff_edge",
      label: "Cliff edge (third choice highs 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "third_choice_highs_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 694,
            y: 410
          },
          {
            x: 723,
            y: 397
          },
          {
            x: 763,
            y: 402
          },
          {
            x: 791,
            y: 418
          },
          {
            x: 813,
            y: 438
          },
          {
            x: 796,
            y: 462
          },
          {
            x: 770,
            y: 477
          },
          {
            x: 736,
            y: 484
          },
          {
            x: 699,
            y: 473
          },
          {
            x: 672,
            y: 454
          },
          {
            x: 677,
            y: 428
          }
        ]
      }
    },
    {
      regionId: "third_choice_highs_2_ramp_1",
      label: "Ramp 1 (third choice highs 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "third_choice_highs_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 646,
            y: 394
          },
          {
            x: 681,
            y: 411
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
      regionId: "third_choice_highs_2_ramp_2",
      label: "Ramp 2 (third choice highs 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "third_choice_highs_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 765,
            y: 511
          },
          {
            x: 752,
            y: 473
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
      "sc2_frost_le_v1:central_towers:1 (high_ground/cover) -> central_towers_1 (ordinary_cover)",
      "sc2_frost_le_v1:central_towers:2 (high_ground/cover) -> central_towers_2 (ordinary_cover)",
      "sc2_frost_le_v1:third_choice_highs:1 (high_ground/standable_high_ground) -> third_choice_highs_1 (standable_high_ground)",
      "sc2_frost_le_v1:third_choice_highs:2 (high_ground/standable_high_ground) -> third_choice_highs_2 (standable_high_ground)",
      "sc2_frost_le_v1:frost_sight:1 (sight/grass_sight) -> frost_sight_1 (grass_sight)",
      "sc2_frost_le_v1:frost_sight:2 (sight/grass_sight) -> frost_sight_2 (grass_sight)",
      "ramp portal -> third_choice_highs_1_ramp_1 faces deployment zone p1",
      "ramp portal -> third_choice_highs_1_ramp_2 faces deployment zone p2",
      "ramp portal -> third_choice_highs_2_ramp_1 faces deployment zone p1",
      "ramp portal -> third_choice_highs_2_ramp_2 faces deployment zone p2"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "visual_only topology elements carry no Rules geometry by their own contract and are excluded: sc2_frost_le_v1:harassment_deadspace:1 (air dead-space motifs, visual_only); sc2_frost_le_v1:harassment_deadspace:2 (air dead-space motifs, visual_only).",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes.",
      "Ramp connectors face the deployment zones declared in this map's reviewed topology record; their exact rim positions carry the declared contour tolerance."
    ]
  },
  counts: {
    regions: 12,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 0,
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
  geometryHash: "06feb17911a78d0f50186012351b3e7d652c3093b959751108f5f5dbeffe610d",
  bindingHash: "d7fd5ed8f981b67d3072bb0d402c7d0caca3856fecf21bc2f1d65649b59afb28"
});
