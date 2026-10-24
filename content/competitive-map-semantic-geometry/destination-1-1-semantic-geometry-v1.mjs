// Ticket 24 / Slice 254-R7 — Destination authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const DESTINATION_1_1_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_destination_1_1_v1",
  displayName: "Destination",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/destination-display-v2.png",
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
      regionId: "natural_bridge_banks_1",
      label: "Ordinary cover — banks around the paired natural bridges",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_destination_1_1_v1:natural_bridge_banks:1: centre (285,330), extent 95x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 249,
              y: 347
            },
            {
              x: 241,
              y: 330
            },
            {
              x: 245,
              y: 309
            },
            {
              x: 274,
              y: 296
            },
            {
              x: 302,
              y: 299
            },
            {
              x: 328,
              y: 314
            },
            {
              x: 330,
              y: 330
            },
            {
              x: 318,
              y: 349
            },
            {
              x: 294,
              y: 360
            },
            {
              x: 264,
              y: 362
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_bridge_banks_2",
      label: "Ordinary cover — banks around the paired natural bridges",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_destination_1_1_v1:natural_bridge_banks:2: centre (715,330), extent 95x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 744,
              y: 356
            },
            {
              x: 707,
              y: 363
            },
            {
              x: 682,
              y: 353
            },
            {
              x: 672,
              y: 334
            },
            {
              x: 676,
              y: 310
            },
            {
              x: 707,
              y: 299
            },
            {
              x: 736,
              y: 301
            },
            {
              x: 757,
              y: 319
            },
            {
              x: 759,
              y: 340
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_bridge_banks_3",
      label: "Ordinary cover — banks around the paired natural bridges",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_destination_1_1_v1:natural_bridge_banks:3: centre (285,670), extent 95x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 265,
              y: 642
            },
            {
              x: 299,
              y: 640
            },
            {
              x: 320,
              y: 648
            },
            {
              x: 329,
              y: 668
            },
            {
              x: 326,
              y: 688
            },
            {
              x: 301,
              y: 700
            },
            {
              x: 277,
              y: 702
            },
            {
              x: 250,
              y: 689
            },
            {
              x: 238,
              y: 673
            },
            {
              x: 241,
              y: 654
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_bridge_banks_4",
      label: "Ordinary cover — banks around the paired natural bridges",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_destination_1_1_v1:natural_bridge_banks:4: centre (715,670), extent 95x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 746,
              y: 697
            },
            {
              x: 722,
              y: 704
            },
            {
              x: 694,
              y: 697
            },
            {
              x: 669,
              y: 684
            },
            {
              x: 669,
              y: 661
            },
            {
              x: 682,
              y: 648
            },
            {
              x: 709,
              y: 638
            },
            {
              x: 744,
              y: 641
            },
            {
              x: 758,
              y: 659
            },
            {
              x: 763,
              y: 680
            }
          ]
        ]
      }
    },
    {
      regionId: "mineral_backdoor_blocks_1",
      label: "Impassable structure — mineable back-door analogues",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc1_destination_1_1_v1:mineral_backdoor_blocks:1: centre (760,220), extent 90x60, rotation -30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 751,
              y: 194
            },
            {
              x: 772,
              y: 186
            },
            {
              x: 790,
              y: 190
            },
            {
              x: 798,
              y: 203
            },
            {
              x: 799,
              y: 224
            },
            {
              x: 782,
              y: 244
            },
            {
              x: 760,
              y: 252
            },
            {
              x: 739,
              y: 254
            },
            {
              x: 724,
              y: 241
            },
            {
              x: 715,
              y: 226
            },
            {
              x: 727,
              y: 210
            }
          ]
        ]
      }
    },
    {
      regionId: "mineral_backdoor_blocks_2",
      label: "Impassable structure — mineable back-door analogues",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc1_destination_1_1_v1:mineral_backdoor_blocks:2: centre (240,780), extent 90x60, rotation -30deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/blocking maps to impassable_structure.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 284,
              y: 771
            },
            {
              x: 264,
              y: 798
            },
            {
              x: 242,
              y: 814
            },
            {
              x: 215,
              y: 812
            },
            {
              x: 200,
              y: 796
            },
            {
              x: 201,
              y: 776
            },
            {
              x: 222,
              y: 754
            },
            {
              x: 251,
              y: 748
            },
            {
              x: 273,
              y: 754
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_overlooks_1",
      label: "Standable high ground — cliffs behind naturals",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_destination_1_1_v1:natural_overlooks:1: centre (360,205), extent 145x80, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 337,
              y: 166
            },
            {
              x: 385,
              y: 166
            },
            {
              x: 426,
              y: 184
            },
            {
              x: 435,
              y: 211
            },
            {
              x: 411,
              y: 237
            },
            {
              x: 361,
              y: 247
            },
            {
              x: 311,
              y: 238
            },
            {
              x: 295,
              y: 214
            },
            {
              x: 299,
              y: 190
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_overlooks_2",
      label: "Standable high ground — cliffs behind naturals",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_destination_1_1_v1:natural_overlooks:2: centre (640,795), extent 145x80, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 570,
              y: 785
            },
            {
              x: 592,
              y: 766
            },
            {
              x: 623,
              y: 754
            },
            {
              x: 667,
              y: 759
            },
            {
              x: 698,
              y: 768
            },
            {
              x: 711,
              y: 793
            },
            {
              x: 700,
              y: 811
            },
            {
              x: 679,
              y: 830
            },
            {
              x: 638,
              y: 836
            },
            {
              x: 595,
              y: 826
            },
            {
              x: 579,
              y: 810
            }
          ]
        ]
      }
    },
    {
      regionId: "centre_bridge_sight_1",
      label: "Grass sight break — sight breaks between central bridges",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_destination_1_1_v1:centre_bridge_sight:1: centre (430,500), extent 75x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 464,
              y: 515
            },
            {
              x: 449,
              y: 530
            },
            {
              x: 425,
              y: 531
            },
            {
              x: 405,
              y: 521
            },
            {
              x: 395,
              y: 503
            },
            {
              x: 396,
              y: 482
            },
            {
              x: 412,
              y: 470
            },
            {
              x: 438,
              y: 471
            },
            {
              x: 453,
              y: 478
            },
            {
              x: 466,
              y: 496
            }
          ]
        ]
      }
    },
    {
      regionId: "centre_bridge_sight_2",
      label: "Grass sight break — sight breaks between central bridges",
      semanticClass: "grass_sight",
      rulesSemantics: "breaks_sight_does_not_block_movement",
      artEvidence: "topology element sc1_destination_1_1_v1:centre_bridge_sight:2: centre (570,500), extent 75x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; sight/grass_sight maps to grass_sight.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 569,
              y: 467
            },
            {
              x: 593,
              y: 476
            },
            {
              x: 606,
              y: 493
            },
            {
              x: 608,
              y: 509
            },
            {
              x: 595,
              y: 528
            },
            {
              x: 571,
              y: 533
            },
            {
              x: 549,
              y: 529
            },
            {
              x: 536,
              y: 507
            },
            {
              x: 535,
              y: 492
            },
            {
              x: 551,
              y: 472
            }
          ]
        ]
      }
    },
    {
      regionId: "natural_overlooks_1_cliff_edge",
      label: "Cliff edge (natural overlooks 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "natural_overlooks_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 337,
            y: 166
          },
          {
            x: 385,
            y: 166
          },
          {
            x: 426,
            y: 184
          },
          {
            x: 435,
            y: 211
          },
          {
            x: 411,
            y: 237
          },
          {
            x: 361,
            y: 247
          },
          {
            x: 311,
            y: 238
          },
          {
            x: 295,
            y: 214
          },
          {
            x: 299,
            y: 190
          }
        ]
      }
    },
    {
      regionId: "natural_overlooks_1_ramp_1",
      label: "Ramp 1 (natural overlooks 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "natural_overlooks_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 429,
            y: 145
          },
          {
            x: 399,
            y: 172
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
      regionId: "natural_overlooks_1_ramp_2",
      label: "Ramp 2 (natural overlooks 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "natural_overlooks_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 374,
            y: 274
          },
          {
            x: 366,
            y: 235
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
      regionId: "natural_overlooks_2_cliff_edge",
      label: "Cliff edge (natural overlooks 2)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "natural_overlooks_2",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 570,
            y: 785
          },
          {
            x: 592,
            y: 766
          },
          {
            x: 623,
            y: 754
          },
          {
            x: 667,
            y: 759
          },
          {
            x: 698,
            y: 768
          },
          {
            x: 711,
            y: 793
          },
          {
            x: 700,
            y: 811
          },
          {
            x: 679,
            y: 830
          },
          {
            x: 638,
            y: 836
          },
          {
            x: 595,
            y: 826
          },
          {
            x: 579,
            y: 810
          }
        ]
      }
    },
    {
      regionId: "natural_overlooks_2_ramp_1",
      label: "Ramp 1 (natural overlooks 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "natural_overlooks_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 626,
            y: 726
          },
          {
            x: 634,
            y: 765
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
      regionId: "natural_overlooks_2_ramp_2",
      label: "Ramp 2 (natural overlooks 2)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "natural_overlooks_2",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 571,
            y: 855
          },
          {
            x: 601,
            y: 828
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
      "sc1_destination_1_1_v1:natural_bridge_banks:1 (cover/cover) -> natural_bridge_banks_1 (ordinary_cover)",
      "sc1_destination_1_1_v1:natural_bridge_banks:2 (cover/cover) -> natural_bridge_banks_2 (ordinary_cover)",
      "sc1_destination_1_1_v1:natural_bridge_banks:3 (cover/cover) -> natural_bridge_banks_3 (ordinary_cover)",
      "sc1_destination_1_1_v1:natural_bridge_banks:4 (cover/cover) -> natural_bridge_banks_4 (ordinary_cover)",
      "sc1_destination_1_1_v1:mineral_backdoor_blocks:1 (blocking/blocking) -> mineral_backdoor_blocks_1 (impassable_structure)",
      "sc1_destination_1_1_v1:mineral_backdoor_blocks:2 (blocking/blocking) -> mineral_backdoor_blocks_2 (impassable_structure)",
      "sc1_destination_1_1_v1:natural_overlooks:1 (high_ground/standable_high_ground) -> natural_overlooks_1 (standable_high_ground)",
      "sc1_destination_1_1_v1:natural_overlooks:2 (high_ground/standable_high_ground) -> natural_overlooks_2 (standable_high_ground)",
      "sc1_destination_1_1_v1:centre_bridge_sight:1 (sight/grass_sight) -> centre_bridge_sight_1 (grass_sight)",
      "sc1_destination_1_1_v1:centre_bridge_sight:2 (sight/grass_sight) -> centre_bridge_sight_2 (grass_sight)",
      "ramp portal -> natural_overlooks_1_ramp_1 faces deployment zone p1",
      "ramp portal -> natural_overlooks_1_ramp_2 faces deployment zone p2",
      "ramp portal -> natural_overlooks_2_ramp_1 faces deployment zone p1",
      "ramp portal -> natural_overlooks_2_ramp_2 faces deployment zone p2"
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
      impassable_structure: 2,
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
  geometryHash: "a2abfd89ebdb49df6bccccc6aa9322bd3884b1329a83a6ab77d15792193bb795",
  bindingHash: "38cefb034cd6256ec85448741b8fc31dd3ac4347c965545986ce672efc69cec6"
});
