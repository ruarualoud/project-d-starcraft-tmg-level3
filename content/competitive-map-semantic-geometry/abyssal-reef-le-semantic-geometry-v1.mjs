// Ticket 24 / Slice 254-R7 — Abyssal Reef authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const ABYSSAL_REEF_LE_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_abyssal_reef_le_v1",
  displayName: "Abyssal Reef",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/abyssal-reef-display-v1.png",
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
      regionId: "flank_rocks_1",
      label: "Impassable structure — rocks securing territory but exposing flanks",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_abyssal_reef_le_v1:flank_rocks:1: centre (300,600), extent 95x70, rotation -25deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 344,
              y: 577
            },
            {
              x: 347,
              y: 603
            },
            {
              x: 328,
              y: 620
            },
            {
              x: 300,
              y: 633
            },
            {
              x: 278,
              y: 634
            },
            {
              x: 255,
              y: 622
            },
            {
              x: 259,
              y: 601
            },
            {
              x: 275,
              y: 577
            },
            {
              x: 297,
              y: 565
            },
            {
              x: 325,
              y: 568
            }
          ]
        ]
      }
    },
    {
      regionId: "flank_rocks_2",
      label: "Impassable structure — rocks securing territory but exposing flanks",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc2_abyssal_reef_le_v1:flank_rocks:2: centre (700,400), extent 95x70, rotation -25deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 694,
              y: 367
            },
            {
              x: 717,
              y: 366
            },
            {
              x: 739,
              y: 370
            },
            {
              x: 745,
              y: 391
            },
            {
              x: 740,
              y: 412
            },
            {
              x: 720,
              y: 429
            },
            {
              x: 694,
              y: 434
            },
            {
              x: 673,
              y: 434
            },
            {
              x: 658,
              y: 418
            },
            {
              x: 654,
              y: 397
            },
            {
              x: 666,
              y: 379
            }
          ]
        ]
      }
    },
    {
      regionId: "reef_shelves_1",
      label: "Standable high ground — opposed reef-shelf high ground",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_abyssal_reef_le_v1:reef_shelves:1: centre (400,720), extent 140x90, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 363,
              y: 758
            },
            {
              x: 336,
              y: 738
            },
            {
              x: 334,
              y: 710
            },
            {
              x: 345,
              y: 692
            },
            {
              x: 381,
              y: 673
            },
            {
              x: 420,
              y: 679
            },
            {
              x: 457,
              y: 689
            },
            {
              x: 464,
              y: 712
            },
            {
              x: 465,
              y: 737
            },
            {
              x: 436,
              y: 759
            },
            {
              x: 399,
              y: 765
            }
          ]
        ]
      }
    },
    {
      regionId: "reef_shelves_2",
      label: "Standable high ground — opposed reef-shelf high ground",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc2_abyssal_reef_le_v1:reef_shelves:2: centre (600,280), extent 140x90, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 667,
              y: 290
            },
            {
              x: 642,
              y: 315
            },
            {
              x: 608,
              y: 326
            },
            {
              x: 558,
              y: 320
            },
            {
              x: 539,
              y: 298
            },
            {
              x: 528,
              y: 267
            },
            {
              x: 556,
              y: 246
            },
            {
              x: 593,
              y: 233
            },
            {
              x: 633,
              y: 243
            },
            {
              x: 664,
              y: 262
            }
          ]
        ]
      }
    },
    {
      regionId: "coral_sight_1",
      label: "Grass sight break — luminous coral sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_abyssal_reef_le_v1:coral_sight:1: centre (410,500), extent 80x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 444,
              y: 519
            },
            {
              x: 432,
              y: 533
            },
            {
              x: 408,
              y: 536
            },
            {
              x: 389,
              y: 527
            },
            {
              x: 373,
              y: 515
            },
            {
              x: 373,
              y: 497
            },
            {
              x: 376,
              y: 483
            },
            {
              x: 394,
              y: 470
            },
            {
              x: 414,
              y: 468
            },
            {
              x: 434,
              y: 470
            },
            {
              x: 443,
              y: 486
            },
            {
              x: 453,
              y: 502
            }
          ]
        ]
      }
    },
    {
      regionId: "coral_sight_2",
      label: "Grass sight break — luminous coral sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_abyssal_reef_le_v1:coral_sight:2: centre (590,500), extent 80x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 570,
              y: 472
            },
            {
              x: 599,
              y: 464
            },
            {
              x: 623,
              y: 477
            },
            {
              x: 631,
              y: 498
            },
            {
              x: 621,
              y: 525
            },
            {
              x: 597,
              y: 536
            },
            {
              x: 568,
              y: 532
            },
            {
              x: 553,
              y: 514
            },
            {
              x: 553,
              y: 489
            }
          ]
        ]
      }
    },
    {
      regionId: "centre_reef_cover_1",
      label: "Ordinary cover — broad-centre reef outcrops",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_abyssal_reef_le_v1:centre_reef_cover:1: centre (500,420), extent 90x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 486,
              y: 451
            },
            {
              x: 464,
              y: 441
            },
            {
              x: 452,
              y: 419
            },
            {
              x: 463,
              y: 402
            },
            {
              x: 489,
              y: 390
            },
            {
              x: 517,
              y: 391
            },
            {
              x: 539,
              y: 402
            },
            {
              x: 547,
              y: 421
            },
            {
              x: 535,
              y: 437
            },
            {
              x: 516,
              y: 450
            }
          ]
        ]
      }
    },
    {
      regionId: "centre_reef_cover_2",
      label: "Ordinary cover — broad-centre reef outcrops",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_abyssal_reef_le_v1:centre_reef_cover:2: centre (500,580), extent 90x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 464,
              y: 562
            },
            {
              x: 484,
              y: 550
            },
            {
              x: 503,
              y: 550
            },
            {
              x: 529,
              y: 553
            },
            {
              x: 545,
              y: 566
            },
            {
              x: 549,
              y: 581
            },
            {
              x: 539,
              y: 600
            },
            {
              x: 519,
              y: 611
            },
            {
              x: 498,
              y: 613
            },
            {
              x: 474,
              y: 609
            },
            {
              x: 462,
              y: 592
            },
            {
              x: 452,
              y: 578
            }
          ]
        ]
      }
    },
    {
      regionId: "reef_shelves_1_cliff_edge",
      label: "Cliff edge (reef shelves 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "reef_shelves_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 363,
            y: 758
          },
          {
            x: 336,
            y: 738
          },
          {
            x: 334,
            y: 710
          },
          {
            x: 345,
            y: 692
          },
          {
            x: 381,
            y: 673
          },
          {
            x: 420,
            y: 679
          },
          {
            x: 457,
            y: 689
          },
          {
            x: 464,
            y: 712
          },
          {
            x: 465,
            y: 737
          },
          {
            x: 436,
            y: 759
          },
          {
            x: 399,
            y: 765
          }
        ]
      }
    },
    {
      regionId: "reef_shelves_1_ramp_1",
      label: "Ramp 1 (reef shelves 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1, rotated 25deg from the direct zone bearing so the approach stays clear of impassable geometry (deterministic clearance search).",
      linkedRegionId: "reef_shelves_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 400,
            y: 645
          },
          {
            x: 400,
            y: 685
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
      regionId: "reef_shelves_1_ramp_2",
      label: "Ramp 2 (reef shelves 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "reef_shelves_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 499,
            y: 747
          },
          {
            x: 460,
            y: 737
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
      regionId: "reef_shelves_2_cliff_edge",
      label: "Cliff edge (reef shelves 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "reef_shelves_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 667,
            y: 290
          },
          {
            x: 642,
            y: 315
          },
          {
            x: 608,
            y: 326
          },
          {
            x: 558,
            y: 320
          },
          {
            x: 539,
            y: 298
          },
          {
            x: 528,
            y: 267
          },
          {
            x: 556,
            y: 246
          },
          {
            x: 593,
            y: 233
          },
          {
            x: 633,
            y: 243
          },
          {
            x: 664,
            y: 262
          }
        ]
      }
    },
    {
      regionId: "reef_shelves_2_ramp_1",
      label: "Ramp 1 (reef shelves 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "reef_shelves_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 501,
            y: 253
          },
          {
            x: 540,
            y: 263
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
      regionId: "reef_shelves_2_ramp_2",
      label: "Ramp 2 (reef shelves 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2, rotated 25deg from the direct zone bearing so the approach stays clear of impassable geometry (deterministic clearance search).",
      linkedRegionId: "reef_shelves_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 600,
            y: 355
          },
          {
            x: 600,
            y: 315
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
      "sc2_abyssal_reef_le_v1:flank_rocks:1 (blocking/blocking) -> flank_rocks_1 (impassable_structure)",
      "sc2_abyssal_reef_le_v1:flank_rocks:2 (blocking/blocking) -> flank_rocks_2 (impassable_structure)",
      "sc2_abyssal_reef_le_v1:reef_shelves:1 (high_ground/standable_high_ground) -> reef_shelves_1 (standable_high_ground)",
      "sc2_abyssal_reef_le_v1:reef_shelves:2 (high_ground/standable_high_ground) -> reef_shelves_2 (standable_high_ground)",
      "sc2_abyssal_reef_le_v1:coral_sight:1 (sight/grass_sight) -> coral_sight_1 (grass_sight)",
      "sc2_abyssal_reef_le_v1:coral_sight:2 (sight/grass_sight) -> coral_sight_2 (grass_sight)",
      "sc2_abyssal_reef_le_v1:centre_reef_cover:1 (cover/cover) -> centre_reef_cover_1 (ordinary_cover)",
      "sc2_abyssal_reef_le_v1:centre_reef_cover:2 (cover/cover) -> centre_reef_cover_2 (ordinary_cover)",
      "ramp portal -> reef_shelves_1_ramp_1 faces deployment zone p1 (rotated 25deg)",
      "ramp portal -> reef_shelves_1_ramp_2 faces deployment zone p2",
      "ramp portal -> reef_shelves_2_ramp_1 faces deployment zone p1",
      "ramp portal -> reef_shelves_2_ramp_2 faces deployment zone p2 (rotated 25deg)"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "visual_only topology elements carry no Rules geometry by their own contract and are excluded: sc2_abyssal_reef_le_v1:water_gaps:1 (water-channel gaps, visual_only); sc2_abyssal_reef_le_v1:water_gaps:2 (water-channel gaps, visual_only).",
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
  geometryHash: "7254ce4f7e84875568844f6899bdb5c7b5482af9326c241b7253e0955107a63a",
  bindingHash: "8768defd17ad9f0cf49d343588d6e74486a5851ea14be9d5a2fe5ce261078b3d"
});
