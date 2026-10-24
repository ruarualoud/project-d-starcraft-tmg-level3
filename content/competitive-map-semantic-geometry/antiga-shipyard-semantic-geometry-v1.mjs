// Ticket 24 / Slice 254-R7 — Antiga Shipyard authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const ANTIGA_SHIPYARD_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_antiga_shipyard_v1",
  displayName: "Antiga Shipyard",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/antiga-shipyard-display-v1.png",
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
      regionId: "safe_high_thirds_1",
      label: "Standable high ground — safe high-ground third choices",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_antiga_shipyard_v1:safe_high_thirds:1: centre (270,330), extent 135x90, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 325,
              y: 356
            },
            {
              x: 310,
              y: 379
            },
            {
              x: 285,
              y: 391
            },
            {
              x: 253,
              y: 375
            },
            {
              x: 230,
              y: 350
            },
            {
              x: 213,
              y: 318
            },
            {
              x: 212,
              y: 288
            },
            {
              x: 237,
              y: 269
            },
            {
              x: 273,
              y: 274
            },
            {
              x: 298,
              y: 293
            },
            {
              x: 322,
              y: 332
            }
          ]
        ]
      }
    },
    {
      regionId: "safe_high_thirds_2",
      label: "Standable high ground — safe high-ground third choices",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_antiga_shipyard_v1:safe_high_thirds:2: centre (730,670), extent 135x90, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 751,
              y: 726
            },
            {
              x: 725,
              y: 720
            },
            {
              x: 697,
              y: 696
            },
            {
              x: 676,
              y: 667
            },
            {
              x: 675,
              y: 637
            },
            {
              x: 685,
              y: 623
            },
            {
              x: 709,
              y: 612
            },
            {
              x: 742,
              y: 621
            },
            {
              x: 769,
              y: 644
            },
            {
              x: 785,
              y: 673
            },
            {
              x: 791,
              y: 700
            },
            {
              x: 776,
              y: 725
            }
          ]
        ]
      }
    },
    {
      regionId: "risky_reward_cover_1",
      label: "Ordinary cover — exposed reward-zone cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_antiga_shipyard_v1:risky_reward_cover:1: centre (260,650), extent 110x75, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 217,
              y: 668
            },
            {
              x: 201,
              y: 649
            },
            {
              x: 212,
              y: 627
            },
            {
              x: 242,
              y: 617
            },
            {
              x: 266,
              y: 611
            },
            {
              x: 294,
              y: 624
            },
            {
              x: 311,
              y: 642
            },
            {
              x: 312,
              y: 661
            },
            {
              x: 299,
              y: 681
            },
            {
              x: 265,
              y: 685
            },
            {
              x: 234,
              y: 680
            }
          ]
        ]
      }
    },
    {
      regionId: "risky_reward_cover_2",
      label: "Ordinary cover — exposed reward-zone cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_antiga_shipyard_v1:risky_reward_cover:2: centre (740,350), extent 110x75, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 788,
              y: 335
            },
            {
              x: 792,
              y: 363
            },
            {
              x: 774,
              y: 383
            },
            {
              x: 735,
              y: 388
            },
            {
              x: 698,
              y: 373
            },
            {
              x: 686,
              y: 353
            },
            {
              x: 692,
              y: 327
            },
            {
              x: 729,
              y: 312
            },
            {
              x: 767,
              y: 319
            }
          ]
        ]
      }
    },
    {
      regionId: "third_attack_sight_1",
      label: "Grass sight break — sight breaks on third attack routes",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_antiga_shipyard_v1:third_attack_sight:1: centre (360,580), extent 80x65, rotation -20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 360,
              y: 547
            },
            {
              x: 384,
              y: 555
            },
            {
              x: 401,
              y: 567
            },
            {
              x: 393,
              y: 591
            },
            {
              x: 376,
              y: 610
            },
            {
              x: 345,
              y: 614
            },
            {
              x: 327,
              y: 600
            },
            {
              x: 321,
              y: 579
            },
            {
              x: 336,
              y: 556
            }
          ]
        ]
      }
    },
    {
      regionId: "third_attack_sight_2",
      label: "Grass sight break — sight breaks on third attack routes",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_antiga_shipyard_v1:third_attack_sight:2: centre (640,420), extent 80x65, rotation -20deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 634,
              y: 455
            },
            {
              x: 614,
              y: 446
            },
            {
              x: 600,
              y: 428
            },
            {
              x: 610,
              y: 406
            },
            {
              x: 632,
              y: 386
            },
            {
              x: 659,
              y: 388
            },
            {
              x: 679,
              y: 400
            },
            {
              x: 675,
              y: 425
            },
            {
              x: 662,
              y: 441
            }
          ]
        ]
      }
    },
    {
      regionId: "shipyard_rubble_1",
      label: "Ordinary cover — industrial central rubble",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_antiga_shipyard_v1:shipyard_rubble:1: centre (450,500), extent 75x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 450,
              y: 468
            },
            {
              x: 477,
              y: 477
            },
            {
              x: 488,
              y: 494
            },
            {
              x: 479,
              y: 519
            },
            {
              x: 463,
              y: 534
            },
            {
              x: 434,
              y: 533
            },
            {
              x: 418,
              y: 513
            },
            {
              x: 413,
              y: 489
            },
            {
              x: 430,
              y: 471
            }
          ]
        ]
      }
    },
    {
      regionId: "shipyard_rubble_2",
      label: "Ordinary cover — industrial central rubble",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_antiga_shipyard_v1:shipyard_rubble:2: centre (550,500), extent 75x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 554,
              y: 537
            },
            {
              x: 529,
              y: 530
            },
            {
              x: 513,
              y: 511
            },
            {
              x: 511,
              y: 489
            },
            {
              x: 525,
              y: 475
            },
            {
              x: 550,
              y: 464
            },
            {
              x: 572,
              y: 470
            },
            {
              x: 582,
              y: 487
            },
            {
              x: 587,
              y: 510
            },
            {
              x: 573,
              y: 526
            }
          ]
        ]
      }
    },
    {
      regionId: "safe_high_thirds_1_cliff_edge",
      label: "Cliff edge (safe high thirds 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "safe_high_thirds_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 325,
            y: 356
          },
          {
            x: 310,
            y: 379
          },
          {
            x: 285,
            y: 391
          },
          {
            x: 253,
            y: 375
          },
          {
            x: 230,
            y: 350
          },
          {
            x: 213,
            y: 318
          },
          {
            x: 212,
            y: 288
          },
          {
            x: 237,
            y: 269
          },
          {
            x: 273,
            y: 274
          },
          {
            x: 298,
            y: 293
          },
          {
            x: 322,
            y: 332
          }
        ]
      }
    },
    {
      regionId: "safe_high_thirds_1_ramp_1",
      label: "Ramp 1 (safe high thirds 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "safe_high_thirds_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 213,
            y: 249
          },
          {
            x: 236,
            y: 282
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
      regionId: "safe_high_thirds_1_ramp_2",
      label: "Ramp 2 (safe high thirds 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "safe_high_thirds_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 343,
            y: 395
          },
          {
            x: 313,
            y: 369
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
      regionId: "safe_high_thirds_2_cliff_edge",
      label: "Cliff edge (safe high thirds 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "safe_high_thirds_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 751,
            y: 726
          },
          {
            x: 725,
            y: 720
          },
          {
            x: 697,
            y: 696
          },
          {
            x: 676,
            y: 667
          },
          {
            x: 675,
            y: 637
          },
          {
            x: 685,
            y: 623
          },
          {
            x: 709,
            y: 612
          },
          {
            x: 742,
            y: 621
          },
          {
            x: 769,
            y: 644
          },
          {
            x: 785,
            y: 673
          },
          {
            x: 791,
            y: 700
          },
          {
            x: 776,
            y: 725
          }
        ]
      }
    },
    {
      regionId: "safe_high_thirds_2_ramp_1",
      label: "Ramp 1 (safe high thirds 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "safe_high_thirds_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 657,
            y: 605
          },
          {
            x: 687,
            y: 631
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
      regionId: "safe_high_thirds_2_ramp_2",
      label: "Ramp 2 (safe high thirds 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "safe_high_thirds_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 787,
            y: 751
          },
          {
            x: 764,
            y: 718
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
      "sc2_antiga_shipyard_v1:safe_high_thirds:1 (high_ground/standable_high_ground) -> safe_high_thirds_1 (standable_high_ground)",
      "sc2_antiga_shipyard_v1:safe_high_thirds:2 (high_ground/standable_high_ground) -> safe_high_thirds_2 (standable_high_ground)",
      "sc2_antiga_shipyard_v1:risky_reward_cover:1 (cover/cover) -> risky_reward_cover_1 (ordinary_cover)",
      "sc2_antiga_shipyard_v1:risky_reward_cover:2 (cover/cover) -> risky_reward_cover_2 (ordinary_cover)",
      "sc2_antiga_shipyard_v1:third_attack_sight:1 (sight/grass_sight) -> third_attack_sight_1 (grass_sight)",
      "sc2_antiga_shipyard_v1:third_attack_sight:2 (sight/grass_sight) -> third_attack_sight_2 (grass_sight)",
      "sc2_antiga_shipyard_v1:shipyard_rubble:1 (blocking/passable_difficult) -> shipyard_rubble_1 (ordinary_cover)",
      "sc2_antiga_shipyard_v1:shipyard_rubble:2 (blocking/passable_difficult) -> shipyard_rubble_2 (ordinary_cover)",
      "ramp portal -> safe_high_thirds_1_ramp_1 faces deployment zone p1",
      "ramp portal -> safe_high_thirds_1_ramp_2 faces deployment zone p2",
      "ramp portal -> safe_high_thirds_2_ramp_1 faces deployment zone p1",
      "ramp portal -> safe_high_thirds_2_ramp_2 faces deployment zone p2"
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
  geometryHash: "6997ec8f4c984122845d2880ef924d275becf3775058faae94b637c6750936e3",
  bindingHash: "9be755d40cc13f1ed13baee58081c494236764d98c9729bc6342da1294a11513"
});
