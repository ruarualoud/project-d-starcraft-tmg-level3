// Ticket 24 / Slice 254-R7 — Blue Storm authored semantic-map geometry.
//
// TOPOLOGY-ANCHORED authored build asset (offline tool: scripts/support/ticket-24-semantic-topology-authoring-v1.mjs,
// reviewed 2026-09-23). Unlike Lost Temple's mask-traced contours (254-R6), these
// contours follow this map's own reviewed source-topology element footprints with
// deterministic per-instance silhouettes; art-mask refinement can tighten them later
// without changing the binding interface. Runtime pixel inference is forbidden.
// Coordinates are normalized [0,1000] x [0,1000], origin bottom-left.

export const BLUE_STORM_1_2_SEMANTIC_GEOMETRY_BINDING_V1 = Object.freeze({
  schema: "starcraft_tmg_official_competitive_map_semantic_geometry_v1",
  version: "1.0.0",
  seedId: "sc1_blue_storm_1_2_v1",
  displayName: "Blue Storm",
  gameEra: "brood_war",
  art: {
    assetPath: "/assets/client/battlefield/maps/brood-war/blue-storm-display-v3.png",
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
      regionId: "central_ravine_north_arm",
      label: "Impassable structure — ravine dividing the battlefield",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc1_blue_storm_1_2_v1:central_ravine:1: centre (500,425), extent 110x90, rotation 0deg in the map's reviewed topology record",
      reviewNote: "REVIEW CORRECTION: the raw ravine footprint (110x310 @ (500,520)) covers both the declared short_route control zone (500,375) and the contest centre (500,500); the reviewed contour is split into a north and a south arm so the map's own declared control/contest zones stay on open ground, matching the bridge/shortcut motif of the source map",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 527,
              y: 389
            },
            {
              x: 548,
              y: 411
            },
            {
              x: 552,
              y: 443
            },
            {
              x: 525,
              y: 468
            },
            {
              x: 488,
              y: 472
            },
            {
              x: 461,
              y: 454
            },
            {
              x: 442,
              y: 423
            },
            {
              x: 458,
              y: 399
            },
            {
              x: 493,
              y: 383
            }
          ]
        ]
      }
    },
    {
      regionId: "central_ravine_south_arm",
      label: "Impassable structure — ravine dividing the battlefield",
      semanticClass: "impassable_structure",
      rulesSemantics: "blocks_movement_and_placement",
      artEvidence: "topology element sc1_blue_storm_1_2_v1:central_ravine:1: centre (500,615), extent 110x90, rotation 0deg in the map's reviewed topology record",
      reviewNote: "REVIEW CORRECTION: the raw ravine footprint (110x310 @ (500,520)) covers both the declared short_route control zone (500,375) and the contest centre (500,500); the reviewed contour is split into a north and a south arm so the map's own declared control/contest zones stay on open ground, matching the bridge/shortcut motif of the source map",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 552,
              y: 623
            },
            {
              x: 544,
              y: 646
            },
            {
              x: 513,
              y: 662
            },
            {
              x: 484,
              y: 656
            },
            {
              x: 461,
              y: 646
            },
            {
              x: 448,
              y: 628
            },
            {
              x: 442,
              y: 606
            },
            {
              x: 461,
              y: 585
            },
            {
              x: 480,
              y: 572
            },
            {
              x: 513,
              y: 569
            },
            {
              x: 537,
              y: 582
            },
            {
              x: 558,
              y: 604
            }
          ]
        ]
      }
    },
    {
      regionId: "high_basilica_1",
      label: "Standable high ground — central-north positional basilica",
      semanticClass: "standable_high_ground",
      rulesSemantics: "standable_high_ground_surface",
      artEvidence: "topology element sc1_blue_storm_1_2_v1:high_basilica:1: centre (500,215), extent 175x105, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; high_ground/standable_high_ground maps to standable_high_ground.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 443,
              y: 257
            },
            {
              x: 416,
              y: 233
            },
            {
              x: 421,
              y: 204
            },
            {
              x: 431,
              y: 177
            },
            {
              x: 475,
              y: 165
            },
            {
              x: 534,
              y: 166
            },
            {
              x: 562,
              y: 184
            },
            {
              x: 585,
              y: 214
            },
            {
              x: 581,
              y: 242
            },
            {
              x: 548,
              y: 261
            },
            {
              x: 495,
              y: 263
            }
          ]
        ]
      }
    },
    {
      regionId: "small_route_gates_1",
      label: "Ordinary cover — small-unit shortcut mouths",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_blue_storm_1_2_v1:small_route_gates:1: centre (330,375), extent 70x75, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 343,
              y: 407
            },
            {
              x: 322,
              y: 410
            },
            {
              x: 301,
              y: 398
            },
            {
              x: 296,
              y: 370
            },
            {
              x: 305,
              y: 349
            },
            {
              x: 325,
              y: 341
            },
            {
              x: 350,
              y: 341
            },
            {
              x: 365,
              y: 364
            },
            {
              x: 362,
              y: 391
            }
          ]
        ]
      }
    },
    {
      regionId: "small_route_gates_2",
      label: "Ordinary cover — small-unit shortcut mouths",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_blue_storm_1_2_v1:small_route_gates:2: centre (670,375), extent 70x75, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; blocking/passable_difficult maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 685,
              y: 340
            },
            {
              x: 698,
              y: 354
            },
            {
              x: 705,
              y: 370
            },
            {
              x: 704,
              y: 390
            },
            {
              x: 690,
              y: 409
            },
            {
              x: 672,
              y: 413
            },
            {
              x: 654,
              y: 411
            },
            {
              x: 643,
              y: 400
            },
            {
              x: 636,
              y: 377
            },
            {
              x: 640,
              y: 359
            },
            {
              x: 648,
              y: 345
            },
            {
              x: 668,
              y: 336
            }
          ]
        ]
      }
    },
    {
      regionId: "main_route_cover_1",
      label: "Ordinary cover — main-route defensive shoulders",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_blue_storm_1_2_v1:main_route_cover:1: centre (365,690), extent 90x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 355,
              y: 720
            },
            {
              x: 330,
              y: 714
            },
            {
              x: 323,
              y: 698
            },
            {
              x: 323,
              y: 683
            },
            {
              x: 330,
              y: 666
            },
            {
              x: 355,
              y: 661
            },
            {
              x: 379,
              y: 659
            },
            {
              x: 398,
              y: 664
            },
            {
              x: 407,
              y: 681
            },
            {
              x: 406,
              y: 696
            },
            {
              x: 400,
              y: 711
            },
            {
              x: 379,
              y: 719
            }
          ]
        ]
      }
    },
    {
      regionId: "main_route_cover_2",
      label: "Ordinary cover — main-route defensive shoulders",
      semanticClass: "ordinary_cover",
      rulesSemantics: "passable_light_cover",
      artEvidence: "topology element sc1_blue_storm_1_2_v1:main_route_cover:2: centre (635,690), extent 90x65, rotation 0deg in the map's reviewed topology record",
      reviewNote: "Silhouette sampled from the element's own rotated footprint with a deterministic per-element perturbation; cover/cover maps to ordinary_cover.",
      linkedRegionId: null,
      geometry: {
        kind: "polygon",
        rings: [
          [
            {
              x: 667,
              y: 717
            },
            {
              x: 641,
              y: 722
            },
            {
              x: 613,
              y: 717
            },
            {
              x: 596,
              y: 706
            },
            {
              x: 589,
              y: 685
            },
            {
              x: 606,
              y: 668
            },
            {
              x: 632,
              y: 659
            },
            {
              x: 655,
              y: 663
            },
            {
              x: 675,
              y: 679
            },
            {
              x: 677,
              y: 694
            }
          ]
        ]
      }
    },
    {
      regionId: "high_basilica_1_cliff_edge",
      label: "Cliff edge (high basilica 1)",
      semanticClass: "cliff_edge",
      rulesSemantics: "blocks_elevation_crossing_except_at_linked_ramps",
      artEvidence: "follows the standable region's authored rim",
      reviewNote: "Elevation-crossing boundary of the linked standable surface; compiled into that region's access contract.",
      linkedRegionId: "high_basilica_1",
      geometry: {
        kind: "polyline",
        path: [
          {
            x: 443,
            y: 257
          },
          {
            x: 416,
            y: 233
          },
          {
            x: 421,
            y: 204
          },
          {
            x: 431,
            y: 177
          },
          {
            x: 475,
            y: 165
          },
          {
            x: 534,
            y: 166
          },
          {
            x: 562,
            y: 184
          },
          {
            x: 585,
            y: 214
          },
          {
            x: 581,
            y: 242
          },
          {
            x: 548,
            y: 261
          },
          {
            x: 495,
            y: 263
          }
        ]
      }
    },
    {
      regionId: "high_basilica_1_ramp_1",
      label: "Ramp 1 (high basilica 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p1 with a directly clear approach.",
      linkedRegionId: "high_basilica_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 400,
            y: 285
          },
          {
            x: 433,
            y: 262
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
      regionId: "high_basilica_1_ramp_2",
      label: "Ramp 2 (high basilica 1)",
      semanticClass: "ramp_access",
      rulesSemantics: "ground_high_access_connector",
      artEvidence: "topology-anchored ramp: faces the deployment zone declared in the map's own reviewed topology record",
      reviewNote: "Deployment-facing rim ramp toward zone p2 with a directly clear approach.",
      linkedRegionId: "high_basilica_1",
      geometry: {
        kind: "connector",
        path: [
          {
            x: 600,
            y: 285
          },
          {
            x: 567,
            y: 262
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
      "sc1_blue_storm_1_2_v1:central_ravine:1 (blocking/blocking) -> central_ravine_north_arm (impassable_structure)",
      "sc1_blue_storm_1_2_v1:central_ravine:1 (blocking/blocking) -> central_ravine_south_arm (impassable_structure)",
      "sc1_blue_storm_1_2_v1:high_basilica:1 (high_ground/standable_high_ground) -> high_basilica_1 (standable_high_ground)",
      "sc1_blue_storm_1_2_v1:small_route_gates:1 (blocking/passable_difficult) -> small_route_gates_1 (ordinary_cover)",
      "sc1_blue_storm_1_2_v1:small_route_gates:2 (blocking/passable_difficult) -> small_route_gates_2 (ordinary_cover)",
      "sc1_blue_storm_1_2_v1:main_route_cover:1 (cover/cover) -> main_route_cover_1 (ordinary_cover)",
      "sc1_blue_storm_1_2_v1:main_route_cover:2 (cover/cover) -> main_route_cover_2 (ordinary_cover)",
      "ramp portal -> high_basilica_1_ramp_1 faces deployment zone p1",
      "ramp portal -> high_basilica_1_ramp_2 faces deployment zone p2"
    ],
    ambiguities: [
      "Contours are anchored to this map's own reviewed source-topology element footprints (centre/extent/rotation) with deterministic per-instance silhouettes; they are NOT art-mask traced. Only Lost Temple currently has mask-traced contours (254-R6). An art-mask review can refine any contour here without changing the binding interface; the declared tolerance is +/-24 normalized units.",
      "Review corrections applied to raw source footprints: sc1_blue_storm_1_2_v1:central_ravine:1: the raw ravine footprint (110x310 @ (500,520)) covers both the declared short_route control zone (500,375) and the contest centre (500,500); the reviewed contour is split into a north and a south arm so the map's own declared control/contest zones stay on open ground, matching the bridge/shortcut motif of the source map.",
      "passable_difficult and cover-mode elements map to ordinary_cover (passable light cover), the closest current semantic class; a future difficult-terrain class can split them without changing certified geometry of other classes.",
      "Ramp connectors face the deployment zones declared in this map's reviewed topology record; their exact rim positions carry the declared contour tolerance."
    ]
  },
  counts: {
    regions: 10,
    byClass: {
      impassable_water: 0,
      impassable_void: 0,
      impassable_structure: 2,
      standable_high_ground: 1,
      cliff_edge: 1,
      ramp_access: 2,
      grass_sight: 0,
      ordinary_cover: 4
    }
  },
  runtimePixelInferenceAllowed: false,
  rulesAuthorityBeforeIntegration: false,
  rulesTruth: "authored_semantic_geometry_pending_rules_integration",
  trainingTruth: false,
  geometryHash: "a517332cd5f62e1aebca2a3f2e7535bf1286d2f03e1eb9cd31b98ba4ead03ad6",
  bindingHash: "64c7f1a941fb2cb282818748d302ee58f5d7cf4e673c16856bced6312ea7dfc4"
});
