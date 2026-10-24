// Ticket 24 / Slice 254-R7 — Fighting Spirit authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const FIGHTING_SPIRIT_1_4_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_fighting_spirit_1_4_v1",
  displayName: "Fighting Spirit",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/fighting-spirit-display-v2.png",
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
      regionId: "third_ramp_cliffs_1",
      label: "Standable high ground — paired defendable third-gas ridges",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:third_ramp_cliffs:1: centre (300,300), extent 135x80, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 248,
              y: 270
            },
            {
              x: 258,
              y: 246
            },
            {
              x: 290,
              y: 250
            },
            {
              x: 332,
              y: 274
            },
            {
              x: 353,
              y: 311
            },
            {
              x: 350,
              y: 345
            },
            {
              x: 326,
              y: 355
            },
            {
              x: 289,
              y: 343
            },
            {
              x: 251,
              y: 305
            }
          ]
        ]
      }
    },
    {
      regionId: "third_ramp_cliffs_2",
      label: "Standable high ground — paired defendable third-gas ridges",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:third_ramp_cliffs:2: centre (700,700), extent 135x80, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 734,
              y: 750
            },
            {
              x: 697,
              y: 748
            },
            {
              x: 669,
              y: 730
            },
            {
              x: 645,
              y: 691
            },
            {
              x: 647,
              y: 660
            },
            {
              x: 668,
              y: 642
            },
            {
              x: 698,
              y: 649
            },
            {
              x: 734,
              y: 674
            },
            {
              x: 756,
              y: 710
            },
            {
              x: 756,
              y: 742
            }
          ]
        ]
      }
    },
    {
      regionId: "central_risk_1",
      label: "Ordinary cover — risky middle expansion analogue",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:central_risk:1: centre (500,500), extent 150x110, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 439,
              y: 496
            },
            {
              x: 442,
              y: 453
            },
            {
              x: 466,
              y: 431
            },
            {
              x: 519,
              y: 441
            },
            {
              x: 557,
              y: 484
            },
            {
              x: 565,
              y: 529
            },
            {
              x: 553,
              y: 559
            },
            {
              x: 505,
              y: 568
            },
            {
              x: 465,
              y: 539
            }
          ]
        ]
      }
    },
    {
      regionId: "corner_foliage_1",
      label: "Grass sight break — four quadrant jungle sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:corner_foliage:1: centre (235,520), extent 90x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 230,
              y: 554
            },
            {
              x: 210,
              y: 548
            },
            {
              x: 194,
              y: 535
            },
            {
              x: 194,
              y: 516
            },
            {
              x: 197,
              y: 501
            },
            {
              x: 217,
              y: 487
            },
            {
              x: 237,
              y: 485
            },
            {
              x: 260,
              y: 490
            },
            {
              x: 273,
              y: 507
            },
            {
              x: 282,
              y: 523
            },
            {
              x: 272,
              y: 540
            },
            {
              x: 253,
              y: 551
            }
          ]
        ]
      }
    },
    {
      regionId: "corner_foliage_2",
      label: "Grass sight break — four quadrant jungle sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:corner_foliage:2: centre (480,765), extent 90x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 528,
              y: 770
            },
            {
              x: 511,
              y: 788
            },
            {
              x: 489,
              y: 802
            },
            {
              x: 461,
              y: 795
            },
            {
              x: 440,
              y: 783
            },
            {
              x: 432,
              y: 763
            },
            {
              x: 447,
              y: 739
            },
            {
              x: 470,
              y: 732
            },
            {
              x: 494,
              y: 732
            },
            {
              x: 518,
              y: 746
            }
          ]
        ]
      }
    },
    {
      regionId: "corner_foliage_3",
      label: "Grass sight break — four quadrant jungle sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:corner_foliage:3: centre (520,235), extent 90x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 548,
              y: 259
            },
            {
              x: 522,
              y: 271
            },
            {
              x: 504,
              y: 268
            },
            {
              x: 485,
              y: 253
            },
            {
              x: 475,
              y: 239
            },
            {
              x: 478,
              y: 220
            },
            {
              x: 493,
              y: 210
            },
            {
              x: 512,
              y: 200
            },
            {
              x: 534,
              y: 202
            },
            {
              x: 557,
              y: 214
            },
            {
              x: 563,
              y: 233
            },
            {
              x: 562,
              y: 250
            }
          ]
        ]
      }
    },
    {
      regionId: "corner_foliage_4",
      label: "Grass sight break — four quadrant jungle sight breaks",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:corner_foliage:4: centre (765,480), extent 90x70, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 730,
              y: 503
            },
            {
              x: 721,
              y: 481
            },
            {
              x: 729,
              y: 459
            },
            {
              x: 757,
              y: 448
            },
            {
              x: 780,
              y: 450
            },
            {
              x: 807,
              y: 465
            },
            {
              x: 810,
              y: 488
            },
            {
              x: 791,
              y: 509
            },
            {
              x: 760,
              y: 517
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_exposure_1",
      label: "Ordinary cover — light cover beside exposed naturals",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:natural_exposure:1: centre (205,205), extent 85x55, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 192,
              y: 233
            },
            {
              x: 173,
              y: 206
            },
            {
              x: 167,
              y: 187
            },
            {
              x: 180,
              y: 175
            },
            {
              x: 199,
              y: 170
            },
            {
              x: 221,
              y: 182
            },
            {
              x: 233,
              y: 201
            },
            {
              x: 238,
              y: 223
            },
            {
              x: 235,
              y: 237
            },
            {
              x: 212,
              y: 239
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_exposure_2",
      label: "Ordinary cover — light cover beside exposed naturals",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_fighting_spirit_1_4_v1:natural_exposure:2: centre (795,795), extent 85x55, rotation 45deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 782,
              y: 818
            },
            {
              x: 764,
              y: 795
            },
            {
              x: 761,
              y: 772
            },
            {
              x: 775,
              y: 763
            },
            {
              x: 796,
              y: 762
            },
            {
              x: 818,
              y: 783
            },
            {
              x: 831,
              y: 808
            },
            {
              x: 828,
              y: 826
            },
            {
              x: 808,
              y: 830
            }
          ]
        ]
      }
    },
    {
      regionId: "third_ramp_cliffs_1_cliff_edge",
      label: "Cliff edge (third ramp cliffs 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "third_ramp_cliffs_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 248,
            y: 270
          },
          {
            x: 258,
            y: 246
          },
          {
            x: 290,
            y: 250
          },
          {
            x: 332,
            y: 274
          },
          {
            x: 353,
            y: 311
          },
          {
            x: 350,
            y: 345
          },
          {
            x: 326,
            y: 355
          },
          {
            x: 289,
            y: 343
          },
          {
            x: 251,
            y: 305
          }
        ]
      }
    },
    {
      regionId: "third_ramp_cliffs_1_ramp_1",
      label: "Ramp 1 (third ramp cliffs 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "third_ramp_cliffs_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 231,
            y: 231
          },
          {
            x: 259,
            y: 259
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
      regionId: "third_ramp_cliffs_1_ramp_2",
      label: "Ramp 2 (third ramp cliffs 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "third_ramp_cliffs_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 369,
            y: 369
          },
          {
            x: 341,
            y: 341
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
      regionId: "third_ramp_cliffs_2_cliff_edge",
      label: "Cliff edge (third ramp cliffs 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "third_ramp_cliffs_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 734,
            y: 750
          },
          {
            x: 697,
            y: 748
          },
          {
            x: 669,
            y: 730
          },
          {
            x: 645,
            y: 691
          },
          {
            x: 647,
            y: 660
          },
          {
            x: 668,
            y: 642
          },
          {
            x: 698,
            y: 649
          },
          {
            x: 734,
            y: 674
          },
          {
            x: 756,
            y: 710
          },
          {
            x: 756,
            y: 742
          }
        ]
      }
    },
    {
      regionId: "third_ramp_cliffs_2_ramp_1",
      label: "Ramp 1 (third ramp cliffs 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "third_ramp_cliffs_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 631,
            y: 631
          },
          {
            x: 659,
            y: 659
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
      regionId: "third_ramp_cliffs_2_ramp_2",
      label: "Ramp 2 (third ramp cliffs 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "third_ramp_cliffs_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 769,
            y: 769
          },
          {
            x: 741,
            y: 741
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
      "sc1_fighting_spirit_1_4_v1:third_ramp_cliffs:1 (high_ground/standable_high_ground) -> third_ramp_cliffs_1 (standable_high_ground)",
      "sc1_fighting_spirit_1_4_v1:third_ramp_cliffs:2 (high_ground/standable_high_ground) -> third_ramp_cliffs_2 (standable_high_ground)",
      "sc1_fighting_spirit_1_4_v1:central_risk:1 (cover/cover) -> central_risk_1 (ordinary_cover)",
      "sc1_fighting_spirit_1_4_v1:corner_foliage:1 (sight/grass_sight) -> corner_foliage_1 (grass_sight)",
      "sc1_fighting_spirit_1_4_v1:corner_foliage:2 (sight/grass_sight) -> corner_foliage_2 (grass_sight)",
      "sc1_fighting_spirit_1_4_v1:corner_foliage:3 (sight/grass_sight) -> corner_foliage_3 (grass_sight)",
      "sc1_fighting_spirit_1_4_v1:corner_foliage:4 (sight/grass_sight) -> corner_foliage_4 (grass_sight)",
      "sc1_fighting_spirit_1_4_v1:natural_exposure:1 (cover/passable_difficult) -> natural_exposure_1 (ordinary_cover)",
      "sc1_fighting_spirit_1_4_v1:natural_exposure:2 (cover/passable_difficult) -> natural_exposure_2 (ordinary_cover)",
      "ramp portal -> third_ramp_cliffs_1_ramp_1 faces deployment zone p1",
      "ramp portal -> third_ramp_cliffs_1_ramp_2 faces deployment zone p2",
      "ramp portal -> third_ramp_cliffs_2_ramp_1 faces deployment zone p1",
      "ramp portal -> third_ramp_cliffs_2_ramp_2 faces deployment zone p2"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes.",
      "Ramp connectors face the deployment zones declared in this map's reviewed topology record; their exact rim positions carry the declared contour tolerance."
    ]
  },
  counts: {
    regions: 15,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 0,
      standable_high_ground: 2,
      cliff_edge: 2,
      ramp_access: 4,
      grass_sight: 4,
      ordinary_cover: 3
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "67c182a25f993af7f02cd9f3db1fb2b6f6c82d13793481da27bca29babc737a4",
  bindingHash: "b772d7061a69446e4de8cab27d23b9b042b746f65915a065b67fcf19d294ad27"
});
