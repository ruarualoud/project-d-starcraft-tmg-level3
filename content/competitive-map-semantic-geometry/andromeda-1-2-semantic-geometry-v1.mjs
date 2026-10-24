// Ticket 24 / Slice 254-R7 — Andromeda authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const ANDROMEDA_1_2_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_andromeda_1_2_v1",
  displayName: "Andromeda",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/andromeda-display-v2.png",
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
      regionId: "protected_inner_cover_1",
      label: "Ordinary cover — protected inner expansion analogues",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_andromeda_1_2_v1:protected_inner_cover:1: centre (300,300), extent 120x80, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 272,
              y: 328
            },
            {
              x: 256,
              y: 296
            },
            {
              x: 252,
              y: 260
            },
            {
              x: 283,
              y: 248
            },
            {
              x: 315,
              y: 256
            },
            {
              x: 339,
              y: 288
            },
            {
              x: 355,
              y: 324
            },
            {
              x: 332,
              y: 348
            },
            {
              x: 308,
              y: 354
            }
          ]
        ]
      }
    },
    {
      regionId: "protected_inner_cover_2",
      label: "Ordinary cover — protected inner expansion analogues",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_andromeda_1_2_v1:protected_inner_cover:2: centre (700,700), extent 120x80, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 751,
              y: 727
            },
            {
              x: 733,
              y: 746
            },
            {
              x: 697,
              y: 748
            },
            {
              x: 670,
              y: 725
            },
            {
              x: 649,
              y: 690
            },
            {
              x: 657,
              y: 658
            },
            {
              x: 685,
              y: 653
            },
            {
              x: 715,
              y: 664
            },
            {
              x: 749,
              y: 695
            }
          ]
        ]
      }
    },
    {
      regionId: "neutral_drop_cliffs_1",
      label: "Standable high ground — neutral-building drop cliffs",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_andromeda_1_2_v1:neutral_drop_cliffs:1: centre (350,650), extent 115x75, rotation -30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 399,
              y: 632
            },
            {
              x: 400,
              y: 657
            },
            {
              x: 378,
              y: 677
            },
            {
              x: 346,
              y: 694
            },
            {
              x: 320,
              y: 691
            },
            {
              x: 301,
              y: 682
            },
            {
              x: 300,
              y: 655
            },
            {
              x: 316,
              y: 633
            },
            {
              x: 335,
              y: 617
            },
            {
              x: 367,
              y: 606
            },
            {
              x: 393,
              y: 610
            }
          ]
        ]
      }
    },
    {
      regionId: "neutral_drop_cliffs_2",
      label: "Standable high ground — neutral-building drop cliffs",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_andromeda_1_2_v1:neutral_drop_cliffs:2: centre (650,350), extent 115x75, rotation -30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 597,
              y: 376
            },
            {
              x: 602,
              y: 354
            },
            {
              x: 615,
              y: 331
            },
            {
              x: 637,
              y: 314
            },
            {
              x: 665,
              y: 307
            },
            {
              x: 690,
              y: 313
            },
            {
              x: 704,
              y: 327
            },
            {
              x: 695,
              y: 350
            },
            {
              x: 687,
              y: 369
            },
            {
              x: 661,
              y: 389
            },
            {
              x: 632,
              y: 393
            },
            {
              x: 610,
              y: 393
            }
          ]
        ]
      }
    },
    {
      regionId: "open_centre_sight_1",
      label: "Grass sight break — sparse open-centre sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_andromeda_1_2_v1:open_centre_sight:1: centre (440,500), extent 70x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 467,
              y: 522
            },
            {
              x: 444,
              y: 527
            },
            {
              x: 426,
              y: 525
            },
            {
              x: 410,
              y: 513
            },
            {
              x: 408,
              y: 493
            },
            {
              x: 417,
              y: 480
            },
            {
              x: 436,
              y: 470
            },
            {
              x: 460,
              y: 473
            },
            {
              x: 475,
              y: 486
            },
            {
              x: 477,
              y: 506
            }
          ]
        ]
      }
    },
    {
      regionId: "open_centre_sight_2",
      label: "Grass sight break — sparse open-centre sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_andromeda_1_2_v1:open_centre_sight:2: centre (560,500), extent 70x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 592,
              y: 486
            },
            {
              x: 595,
              y: 508
            },
            {
              x: 582,
              y: 526
            },
            {
              x: 562,
              y: 531
            },
            {
              x: 543,
              y: 524
            },
            {
              x: 529,
              y: 509
            },
            {
              x: 528,
              y: 495
            },
            {
              x: 537,
              y: 477
            },
            {
              x: 557,
              y: 471
            },
            {
              x: 575,
              y: 475
            }
          ]
        ]
      }
    },
    {
      regionId: "neutral_drop_cliffs_1_cliff_edge",
      label: "Cliff edge (neutral drop cliffs 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "neutral_drop_cliffs_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 399,
            y: 632
          },
          {
            x: 400,
            y: 657
          },
          {
            x: 378,
            y: 677
          },
          {
            x: 346,
            y: 694
          },
          {
            x: 320,
            y: 691
          },
          {
            x: 301,
            y: 682
          },
          {
            x: 300,
            y: 655
          },
          {
            x: 316,
            y: 633
          },
          {
            x: 335,
            y: 617
          },
          {
            x: 367,
            y: 606
          },
          {
            x: 393,
            y: 610
          }
        ]
      }
    },
    {
      regionId: "neutral_drop_cliffs_1_ramp_1",
      label: "Ramp 1 (neutral drop cliffs 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "neutral_drop_cliffs_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 322,
            y: 589
          },
          {
            x: 338,
            y: 625
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
      regionId: "neutral_drop_cliffs_1_ramp_2",
      label: "Ramp 2 (neutral drop cliffs 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "neutral_drop_cliffs_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 423,
            y: 678
          },
          {
            x: 386,
            y: 664
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
      regionId: "neutral_drop_cliffs_2_cliff_edge",
      label: "Cliff edge (neutral drop cliffs 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "neutral_drop_cliffs_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 597,
            y: 376
          },
          {
            x: 602,
            y: 354
          },
          {
            x: 615,
            y: 331
          },
          {
            x: 637,
            y: 314
          },
          {
            x: 665,
            y: 307
          },
          {
            x: 690,
            y: 313
          },
          {
            x: 704,
            y: 327
          },
          {
            x: 695,
            y: 350
          },
          {
            x: 687,
            y: 369
          },
          {
            x: 661,
            y: 389
          },
          {
            x: 632,
            y: 393
          },
          {
            x: 610,
            y: 393
          }
        ]
      }
    },
    {
      regionId: "neutral_drop_cliffs_2_ramp_1",
      label: "Ramp 1 (neutral drop cliffs 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "neutral_drop_cliffs_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 577,
            y: 322
          },
          {
            x: 614,
            y: 336
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
      regionId: "neutral_drop_cliffs_2_ramp_2",
      label: "Ramp 2 (neutral drop cliffs 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "neutral_drop_cliffs_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 678,
            y: 411
          },
          {
            x: 662,
            y: 375
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
      "sc1_andromeda_1_2_v1:protected_inner_cover:1 (cover/cover) -> protected_inner_cover_1 (ordinary_cover)",
      "sc1_andromeda_1_2_v1:protected_inner_cover:2 (cover/cover) -> protected_inner_cover_2 (ordinary_cover)",
      "sc1_andromeda_1_2_v1:neutral_drop_cliffs:1 (high_ground/standable_high_ground) -> neutral_drop_cliffs_1 (standable_high_ground)",
      "sc1_andromeda_1_2_v1:neutral_drop_cliffs:2 (high_ground/standable_high_ground) -> neutral_drop_cliffs_2 (standable_high_ground)",
      "sc1_andromeda_1_2_v1:open_centre_sight:1 (sight/grass_sight) -> open_centre_sight_1 (grass_sight)",
      "sc1_andromeda_1_2_v1:open_centre_sight:2 (sight/grass_sight) -> open_centre_sight_2 (grass_sight)",
      "ramp portal -> neutral_drop_cliffs_1_ramp_1 faces deployment zone p1",
      "ramp portal -> neutral_drop_cliffs_1_ramp_2 faces deployment zone p2",
      "ramp portal -> neutral_drop_cliffs_2_ramp_1 faces deployment zone p1",
      "ramp portal -> neutral_drop_cliffs_2_ramp_2 faces deployment zone p2"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "visual_only topology elements carry no Rules geometry by their own contract and are excluded: sc1_andromeda_1_2_v1:island_expansions:1 (opposed island expansion motifs, visual_only); sc1_andromeda_1_2_v1:island_expansions:2 (opposed island expansion motifs, visual_only).",
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
  geometryHash: "7480a3f28e880299dca5bf7b7583e6b9e0bce3e316d4fd31c4fb5164280ef954",
  bindingHash: "82b7e7a8d63116b192181a367a5a78b076712584c5d7cab710f6e0e7ff425835"
});
