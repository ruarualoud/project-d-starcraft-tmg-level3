// Ticket 24 / Slice 254-R7 — Circuit Breakers authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const CIRCUIT_BREAKERS_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_circuit_breakers_v1",
  displayName: "Circuit Breakers",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/circuit-breakers-display-v2.png",
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
      regionId: "third_high_ground_1",
      label: "Standable high ground — large high ground before each third",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_circuit_breakers_v1:third_high_ground:1: centre (285,500), extent 150x105, rotation 90deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 340,
              y: 500
            },
            {
              x: 328,
              y: 535
            },
            {
              x: 313,
              y: 560
            },
            {
              x: 285,
              y: 573
            },
            {
              x: 250,
              y: 559
            },
            {
              x: 241,
              y: 529
            },
            {
              x: 232,
              y: 484
            },
            {
              x: 251,
              y: 444
            },
            {
              x: 272,
              y: 430
            },
            {
              x: 308,
              y: 431
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
      regionId: "third_high_ground_2",
      label: "Standable high ground — large high ground before each third",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_circuit_breakers_v1:third_high_ground:2: centre (715,500), extent 150x105, rotation 90deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 659,
              y: 498
            },
            {
              x: 671,
              y: 464
            },
            {
              x: 685,
              y: 431
            },
            {
              x: 712,
              y: 428
            },
            {
              x: 743,
              y: 436
            },
            {
              x: 758,
              y: 460
            },
            {
              x: 767,
              y: 498
            },
            {
              x: 759,
              y: 531
            },
            {
              x: 740,
              y: 565
            },
            {
              x: 715,
              y: 577
            },
            {
              x: 691,
              y: 562
            },
            {
              x: 666,
              y: 535
            }
          ]
        ]
      }
    },
    {
      regionId: "bridge_shoulders_1",
      label: "Ordinary cover — paired bridge shoulder cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_circuit_breakers_v1:bridge_shoulders:1: centre (410,285), extent 80x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 416,
              y: 256
            },
            {
              x: 437,
              y: 264
            },
            {
              x: 453,
              y: 280
            },
            {
              x: 444,
              y: 299
            },
            {
              x: 427,
              y: 311
            },
            {
              x: 403,
              y: 313
            },
            {
              x: 376,
              y: 304
            },
            {
              x: 371,
              y: 289
            },
            {
              x: 375,
              y: 267
            },
            {
              x: 391,
              y: 257
            }
          ]
        ]
      }
    },
    {
      regionId: "bridge_shoulders_2",
      label: "Ordinary cover — paired bridge shoulder cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_circuit_breakers_v1:bridge_shoulders:2: centre (590,285), extent 80x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 562,
              y: 308
            },
            {
              x: 549,
              y: 295
            },
            {
              x: 555,
              y: 273
            },
            {
              x: 567,
              y: 258
            },
            {
              x: 589,
              y: 258
            },
            {
              x: 615,
              y: 260
            },
            {
              x: 627,
              y: 280
            },
            {
              x: 630,
              y: 296
            },
            {
              x: 612,
              y: 311
            },
            {
              x: 589,
              y: 314
            }
          ]
        ]
      }
    },
    {
      regionId: "bridge_shoulders_3",
      label: "Ordinary cover — paired bridge shoulder cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_circuit_breakers_v1:bridge_shoulders:3: centre (410,715), extent 80x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 422,
              y: 744
            },
            {
              x: 399,
              y: 742
            },
            {
              x: 376,
              y: 732
            },
            {
              x: 370,
              y: 712
            },
            {
              x: 383,
              y: 694
            },
            {
              x: 410,
              y: 684
            },
            {
              x: 436,
              y: 693
            },
            {
              x: 452,
              y: 708
            },
            {
              x: 445,
              y: 727
            }
          ]
        ]
      }
    },
    {
      regionId: "bridge_shoulders_4",
      label: "Ordinary cover — paired bridge shoulder cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_circuit_breakers_v1:bridge_shoulders:4: centre (590,715), extent 80x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 612,
              y: 693
            },
            {
              x: 627,
              y: 711
            },
            {
              x: 622,
              y: 728
            },
            {
              x: 606,
              y: 742
            },
            {
              x: 579,
              y: 743
            },
            {
              x: 554,
              y: 733
            },
            {
              x: 548,
              y: 713
            },
            {
              x: 566,
              y: 692
            },
            {
              x: 590,
              y: 684
            }
          ]
        ]
      }
    },
    {
      regionId: "central_buildable_1",
      label: "Grass sight break — partially buildable centre analogue",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_circuit_breakers_v1:central_buildable:1: centre (500,440), extent 80x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 521,
              y: 407
            },
            {
              x: 535,
              y: 426
            },
            {
              x: 540,
              y: 443
            },
            {
              x: 529,
              y: 464
            },
            {
              x: 504,
              y: 476
            },
            {
              x: 482,
              y: 469
            },
            {
              x: 461,
              y: 455
            },
            {
              x: 462,
              y: 437
            },
            {
              x: 468,
              y: 415
            },
            {
              x: 495,
              y: 405
            }
          ]
        ]
      }
    },
    {
      regionId: "central_buildable_2",
      label: "Grass sight break — partially buildable centre analogue",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_circuit_breakers_v1:central_buildable:2: centre (500,560), extent 80x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 493,
              y: 526
            },
            {
              x: 515,
              y: 529
            },
            {
              x: 532,
              y: 540
            },
            {
              x: 539,
              y: 557
            },
            {
              x: 536,
              y: 573
            },
            {
              x: 522,
              y: 588
            },
            {
              x: 504,
              y: 593
            },
            {
              x: 486,
              y: 593
            },
            {
              x: 468,
              y: 579
            },
            {
              x: 462,
              y: 561
            },
            {
              x: 463,
              y: 543
            },
            {
              x: 475,
              y: 529
            }
          ]
        ]
      }
    },
    {
      regionId: "third_high_ground_1_cliff_edge",
      label: "Cliff edge (third high ground 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "third_high_ground_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 340,
            y: 500
          },
          {
            x: 328,
            y: 535
          },
          {
            x: 313,
            y: 560
          },
          {
            x: 285,
            y: 573
          },
          {
            x: 250,
            y: 559
          },
          {
            x: 241,
            y: 529
          },
          {
            x: 232,
            y: 484
          },
          {
            x: 251,
            y: 444
          },
          {
            x: 272,
            y: 430
          },
          {
            x: 308,
            y: 431
          },
          {
            x: 325,
            y: 457
          }
        ]
      }
    },
    {
      regionId: "third_high_ground_1_ramp_1",
      label: "Ramp 1 (third high ground 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "third_high_ground_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 203,
            y: 500
          },
          {
            x: 243,
            y: 500
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
      regionId: "third_high_ground_1_ramp_2",
      label: "Ramp 2 (third high ground 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "third_high_ground_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 368,
            y: 500
          },
          {
            x: 328,
            y: 500
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
      regionId: "third_high_ground_2_cliff_edge",
      label: "Cliff edge (third high ground 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "third_high_ground_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 659,
            y: 498
          },
          {
            x: 671,
            y: 464
          },
          {
            x: 685,
            y: 431
          },
          {
            x: 712,
            y: 428
          },
          {
            x: 743,
            y: 436
          },
          {
            x: 758,
            y: 460
          },
          {
            x: 767,
            y: 498
          },
          {
            x: 759,
            y: 531
          },
          {
            x: 740,
            y: 565
          },
          {
            x: 715,
            y: 577
          },
          {
            x: 691,
            y: 562
          },
          {
            x: 666,
            y: 535
          }
        ]
      }
    },
    {
      regionId: "third_high_ground_2_ramp_1",
      label: "Ramp 1 (third high ground 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "third_high_ground_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 633,
            y: 500
          },
          {
            x: 673,
            y: 500
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
      regionId: "third_high_ground_2_ramp_2",
      label: "Ramp 2 (third high ground 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "third_high_ground_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 798,
            y: 500
          },
          {
            x: 758,
            y: 500
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
      "sc1_circuit_breakers_v1:third_high_ground:1 (high_ground/standable_high_ground) -> third_high_ground_1 (standable_high_ground)",
      "sc1_circuit_breakers_v1:third_high_ground:2 (high_ground/standable_high_ground) -> third_high_ground_2 (standable_high_ground)",
      "sc1_circuit_breakers_v1:bridge_shoulders:1 (cover/cover) -> bridge_shoulders_1 (ordinary_cover)",
      "sc1_circuit_breakers_v1:bridge_shoulders:2 (cover/cover) -> bridge_shoulders_2 (ordinary_cover)",
      "sc1_circuit_breakers_v1:bridge_shoulders:3 (cover/cover) -> bridge_shoulders_3 (ordinary_cover)",
      "sc1_circuit_breakers_v1:bridge_shoulders:4 (cover/cover) -> bridge_shoulders_4 (ordinary_cover)",
      "sc1_circuit_breakers_v1:central_buildable:1 (sight/grass_sight) -> central_buildable_1 (grass_sight)",
      "sc1_circuit_breakers_v1:central_buildable:2 (sight/grass_sight) -> central_buildable_2 (grass_sight)",
      "ramp portal -> third_high_ground_1_ramp_1 faces deployment zone p1",
      "ramp portal -> third_high_ground_1_ramp_2 faces deployment zone p2",
      "ramp portal -> third_high_ground_2_ramp_1 faces deployment zone p1",
      "ramp portal -> third_high_ground_2_ramp_2 faces deployment zone p2"
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
  geometryHash: "8bb79ed24b9dde763dcb09797b4e6d051dfee03986a3dd4a2d95b42f692fb3eb",
  bindingHash: "02b619d20c8d58cd0de39c997304e91d52801970825f2ef99b4e95eeefab7429"
});
