// Ticket 24 / Slice 254-R7 — Ohana authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const OHANA_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc2_ohana_v1",
  displayName: "Ohana",
  gameEra: "starcraft_2",
  art: {
    assetPath: "/assets/client/battlefield/maps/starcraft-2/ohana-display-v1.png",
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
      regionId: "central_tower_pair_1",
      label: "Ordinary cover — paired central vision positions",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_ohana_v1:central_tower_pair:1: centre (385,500), extent 100x80, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 430,
              y: 489
            },
            {
              x: 434,
              y: 516
            },
            {
              x: 409,
              y: 535
            },
            {
              x: 373,
              y: 542
            },
            {
              x: 340,
              y: 524
            },
            {
              x: 337,
              y: 496
            },
            {
              x: 349,
              y: 469
            },
            {
              x: 379,
              y: 463
            },
            {
              x: 412,
              y: 467
            }
          ]
        ]
      }
    },
    {
      regionId: "central_tower_pair_2",
      label: "Ordinary cover — paired central vision positions",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_ohana_v1:central_tower_pair:2: centre (615,500), extent 100x80, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 592,
              y: 539
            },
            {
              x: 570,
              y: 523
            },
            {
              x: 569,
              y: 501
            },
            {
              x: 571,
              y: 479
            },
            {
              x: 595,
              y: 462
            },
            {
              x: 620,
              y: 460
            },
            {
              x: 643,
              y: 470
            },
            {
              x: 665,
              y: 487
            },
            {
              x: 663,
              y: 507
            },
            {
              x: 648,
              y: 526
            },
            {
              x: 622,
              y: 541
            }
          ]
        ]
      }
    },
    {
      regionId: "compact_choke_shoulders_1",
      label: "Ordinary cover — compact direct-engagement shoulders",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_ohana_v1:compact_choke_shoulders:1: centre (430,360), extent 85x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 412,
              y: 389
            },
            {
              x: 388,
              y: 376
            },
            {
              x: 390,
              y: 351
            },
            {
              x: 407,
              y: 330
            },
            {
              x: 435,
              y: 326
            },
            {
              x: 463,
              y: 335
            },
            {
              x: 476,
              y: 356
            },
            {
              x: 464,
              y: 380
            },
            {
              x: 439,
              y: 395
            }
          ]
        ]
      }
    },
    {
      regionId: "compact_choke_shoulders_2",
      label: "Ordinary cover — compact direct-engagement shoulders",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_ohana_v1:compact_choke_shoulders:2: centre (570,640), extent 85x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 560,
              y: 609
            },
            {
              x: 587,
              y: 607
            },
            {
              x: 610,
              y: 623
            },
            {
              x: 612,
              y: 649
            },
            {
              x: 597,
              y: 670
            },
            {
              x: 564,
              y: 676
            },
            {
              x: 538,
              y: 666
            },
            {
              x: 525,
              y: 640
            },
            {
              x: 539,
              y: 620
            }
          ]
        ]
      }
    },
    {
      regionId: "edge_sight_1",
      label: "Grass sight break — limited counterattack edge sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_ohana_v1:edge_sight:1: centre (175,430), extent 75x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 166,
              y: 401
            },
            {
              x: 188,
              y: 401
            },
            {
              x: 203,
              y: 406
            },
            {
              x: 214,
              y: 421
            },
            {
              x: 213,
              y: 437
            },
            {
              x: 197,
              y: 451
            },
            {
              x: 185,
              y: 458
            },
            {
              x: 163,
              y: 459
            },
            {
              x: 146,
              y: 452
            },
            {
              x: 141,
              y: 437
            },
            {
              x: 138,
              y: 422
            },
            {
              x: 149,
              y: 411
            }
          ]
        ]
      }
    },
    {
      regionId: "edge_sight_2",
      label: "Grass sight break — limited counterattack edge sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc2_ohana_v1:edge_sight:2: centre (825,570), extent 75x60, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 813,
              y: 600
            },
            {
              x: 793,
              y: 589
            },
            {
              x: 785,
              y: 564
            },
            {
              x: 798,
              y: 549
            },
            {
              x: 823,
              y: 542
            },
            {
              x: 845,
              y: 547
            },
            {
              x: 864,
              y: 563
            },
            {
              x: 858,
              y: 584
            },
            {
              x: 840,
              y: 596
            }
          ]
        ]
      }
    },
    {
      regionId: "third_cover_1",
      label: "Ordinary cover — hard-to-hold third cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_ohana_v1:third_cover:1: centre (300,280), extent 100x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 341,
              y: 301
            },
            {
              x: 313,
              y: 311
            },
            {
              x: 288,
              y: 310
            },
            {
              x: 259,
              y: 302
            },
            {
              x: 254,
              y: 280
            },
            {
              x: 259,
              y: 260
            },
            {
              x: 283,
              y: 248
            },
            {
              x: 317,
              y: 251
            },
            {
              x: 339,
              y: 262
            },
            {
              x: 349,
              y: 280
            }
          ]
        ]
      }
    },
    {
      regionId: "third_cover_2",
      label: "Ordinary cover — hard-to-hold third cover",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc2_ohana_v1:third_cover:2: centre (700,720), extent 100x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 742,
              y: 740
            },
            {
              x: 713,
              y: 750
            },
            {
              x: 689,
              y: 754
            },
            {
              x: 664,
              y: 739
            },
            {
              x: 646,
              y: 723
            },
            {
              x: 656,
              y: 709
            },
            {
              x: 671,
              y: 695
            },
            {
              x: 695,
              y: 686
            },
            {
              x: 725,
              y: 690
            },
            {
              x: 749,
              y: 708
            },
            {
              x: 751,
              y: 722
            }
          ]
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
      "sc2_ohana_v1:central_tower_pair:1 (high_ground/cover) -> central_tower_pair_1 (ordinary_cover)",
      "sc2_ohana_v1:central_tower_pair:2 (high_ground/cover) -> central_tower_pair_2 (ordinary_cover)",
      "sc2_ohana_v1:compact_choke_shoulders:1 (blocking/passable_difficult) -> compact_choke_shoulders_1 (ordinary_cover)",
      "sc2_ohana_v1:compact_choke_shoulders:2 (blocking/passable_difficult) -> compact_choke_shoulders_2 (ordinary_cover)",
      "sc2_ohana_v1:edge_sight:1 (sight/grass_sight) -> edge_sight_1 (grass_sight)",
      "sc2_ohana_v1:edge_sight:2 (sight/grass_sight) -> edge_sight_2 (grass_sight)",
      "sc2_ohana_v1:third_cover:1 (cover/cover) -> third_cover_1 (ordinary_cover)",
      "sc2_ohana_v1:third_cover:2 (cover/cover) -> third_cover_2 (ordinary_cover)"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes."
    ]
  },
  counts: {
    regions: 8,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 0,
      standable_high_ground: 0,
      cliff_edge: 0,
      ramp_access: 0,
      grass_sight: 2,
      ordinary_cover: 6
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "f65a1f357355585cbd96b926c050b2f2ef566e5a676912b9464fa8147fae35a6",
  bindingHash: "fd42e261cd1080ccea2f3723bf47bdd8e8180d419924b052c10267c682eea533"
});
