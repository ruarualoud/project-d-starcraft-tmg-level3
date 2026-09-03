const row = (ordinal, disposition, implementationSlice, tokenMarkerImpact,
  deltaSummary, atomIds = []) => Object.freeze({
  entryId: `faq-v1:${String(ordinal).padStart(2, "0")}`,
  disposition,
  implementationSlice,
  tokenMarkerImpact,
  deltaSummary,
  atomIds: Object.freeze(atomIds),
});

export const OFFICIAL_FAQ_V1_RULE_RECONCILIATION_BINDING_V1 = Object.freeze([
  row(1, "refine", "F5", false, "Shield capacity is one unit damage pool and Heal reduces that pool", [
    "rule-atom:shield-value-initial-hit-points-and-status",
    "rule-atom:singleton:core-11-heal-damage-reduction:727c6a4fc5a5",
  ]),
  row(2, "confirm", "F5", false, "Shielded ends at its existing damage or first-model-loss threshold", [
    "rule-atom:shielded-loss-conditions",
  ]),
  row(3, "confirm", "F5", false, "Non-lethal damage contributes to the Shielded loss check without removing models", [
    "rule-atom:shielded-loss-conditions",
    "rule-atom:singleton:core-11-non-lethal-no-casualty-removal:cb98ebd1c290",
  ]),
  row(4, "confirm", "F5", false, "Destroyed units do not return except through an explicit return rule", [
    "rule-atom:singleton:core-7-4-return-to-play:7ad8b444e6de",
  ]),
  row(5, "refine", "F3", false, "Mission capability uses the last completed movement coherency check even after later casualties", [
    "rule-atom:singleton:core-4-4-coherency-check-trigger:ceb8cf652a11",
    "rule-atom:singleton:core-4-4-in-coherency-mission-capability:79a5b599e9a1",
  ]),
  row(6, "confirm", "F3", false, "Gap width is measured between the obstructing models or terrain", [
    "rule-atom:singleton:core-4-6-gap-definition:3ce7a04079f3",
  ]),
  row(7, "new", "F3", false, "Charge and Close Ranks placement may cross an engaged enemy when no gap traversal occurs"),
  row(8, "confirm", "F3", false, "A coherency link may follow any route legal for the leading model", [
    "rule-atom:singleton:core-4-4-coherency-link-path:3992d3a92cb6",
  ]),
  row(9, "confirm", "F3", false, "A coherency link can change elevation through an Access Point", [
    "rule-atom:singleton:core-8-5-3-access-point-definition:3eebc06b9e1f",
    "rule-atom:singleton:core-8-5-3-elevation-access-point:a3733adda9c6",
  ]),
  row(10, "confirm", "F3", false, "Move and Run require displacement; zero displacement is represented by Hold", [
    "rule-atom:movement-phase-hold-action",
    "rule-atom:singleton:core-8-7-1-run-action-definition:7462efd93e26",
  ]),
  row(11, "refine", "F3", false, "Directly toward or away movement must maximize legal distance within the effect allowance", [
    "rule-atom:singleton:core-4-5-direct-movement-vector:db58894d82f0",
    "rule-atom:singleton:core-4-5-direct-movement-endpoints:b14ff7361c01",
  ]),
  row(12, "confirm", "F3", false, "Wobbly permits an agreed legal position when a model cannot stand securely", [
    "rule-atom:singleton:core-2-3-wobbly-model-position:d968118c812d",
  ]),
  row(13, "refine", "F3", false, "High Ground edges are impassable gap boundaries with size-specific clearance", [
    "rule-atom:singleton:core-4-6-gap-definition:3ce7a04079f3",
    "rule-atom:singleton:core-11-impassable-terrain-definition:a200351f5530",
  ]),
  row(14, "confirm", "F3", false, "Ground movement cannot change elevation between disconnected High Grounds", [
    "rule-atom:singleton:core-11-access-point-elevation-change:a5c3fcad63e9",
    "rule-atom:singleton:core-11-impassable-terrain-definition:a200351f5530",
  ]),
  row(15, "refine", "F3", false, "Direct Cover uses any qualifying part of the shared nearby terrain on the sight trace", [
    "rule-atom:line-of-sight-direct-cover",
  ]),
  row(16, "refine", "F3", true, "A deactivated objective marker retains its separately tracked control state", [
    "rule-atom:singleton:core-8-9-1-control-faction-indicator:36d792891bee",
  ]),
  row(17, "new", "F3", false, "Draft uniqueness limits a physical card copy rather than every card sharing its name"),
  row(18, "new", "F3", false, "Each component of an official long wall is an independent terrain piece"),
  row(19, "new", "F3", true, "Artefact claiming is distinct from mission-marker control for Flying and Burrowed units", [
    "rule-atom:flying-mission-control-prohibition",
    "rule-atom:burrowed-mission-control-prohibition",
  ]),
  row(20, "refine", "F3", false, "A touching Entry Edge can authorize direct deployment onto High Ground", [
    "rule-atom:singleton:core-11-entry-edge-reserve-deployment:4fcc890f1383",
    "rule-atom:singleton:core-11-access-point-elevation-change:a5c3fcad63e9",
  ]),
  row(21, "new", "F3", true, "Omega Worm and Pylon bases can act as friendly Entry Edges without enemy denial"),
  row(22, "new", "F3", true, "Pylon deployment consumes the Activation and places an Activation Marker"),
  row(23, "new", "F3", true, "Omega Network Entry Edges do not generate a Zone of Influence"),
  row(24, "new", "F3", true, "End-round marker deployment has leading-model, coherency, engagement and failure-consumption rules"),
  row(25, "confirm", "F3", false, "Reserve abilities remain unavailable unless their text explicitly permits reserve or deployment use", [
    "rule-atom:all-ability-types-reserve-inactivity",
  ]),
  row(26, "refine", "F3", false, "Nominated to deploy covers every Deploy action regardless of its source", [
    "rule-atom:singleton:core-8-5-5-deploy-definition:3a2e76760879",
  ]),
  row(27, "refine", "F3", true, "Reserve deployment uses printed Speed and cannot receive an on-battlefield Creep movement bonus", [
    "rule-atom:singleton:core-11-on-creep-condition:71f40e4e561b",
    "rule-atom:singleton:core-11-entry-edge-reserve-deployment:4fcc890f1383",
  ]),
  row(28, "confirm", "F5", false, "Evade applies after the final attack Damage Pool including Surge", [
    "rule-atom:singleton:core-8-7-4-evade-before-damage:91d84abadc6a",
  ]),
  row(29, "refine", "F5", false, "Modifiers cannot erase a test and the modified target number remains within two through six", [
    "rule-atom:modified-target-number-bounds",
  ]),
  row(30, "confirm", "F5", false, "Ranged casualty count is visibility-capped but chosen casualties need not themselves be visible or in range", [
    "rule-atom:singleton:core-8-7-4-casualty-visible-cap:d235242004ed",
  ]),
  row(31, "refine", "F5", false, "Close Ranks is unavailable when no leading model can finish closer", [
    "rule-atom:singleton:core-8-8-1-close-ranks-leading-move:d88aca04a84f",
  ]),
  row(32, "refine", "F5", false, "Multi-enemy casualty selection preserves engagement with every enemy when an alternative exists", [
    "rule-atom:singleton:core-8-7-5-preserve-specific-engagement:b8e418206537",
  ]),
  row(33, "confirm", "F5", false, "Different ranged weapon profiles declare and resolve as sequential batches", [
    "rule-atom:singleton:core-8-7-3-sequential-batch-declaration:48523e04ae11",
  ]),
  row(34, "confirm", "F4", false, "Ability cost is paid by exhausting ready matching cards and excess resources are lost", [
    "rule-atom:singleton:core-10-5-1-resources-from-exhaustion:e5bb4b1fa3be",
    "rule-atom:singleton:core-10-5-1-excess-resources-lost:fed773fb7d33",
  ]),
  row(35, "new", "F4", false, "A unit is within range of itself unless an effect explicitly excludes itself"),
  row(36, "confirm", "F4", false, "An Active ability requires an active unit on the battlefield", [
    "rule-atom:singleton:core-10-2-active-requires-activation:dbe149746c16",
  ]),
  row(37, "confirm", "F4", false, "Different named paid abilities are uncapped while named Active and Reaction frequency limits remain", [
    "rule-atom:named-active-ability-per-unit-round-limit",
    "rule-atom:per-activation-reaction-limit",
  ]),
  row(38, "new", "F4", false, "Concussive Shells requires line of sight only to the friendly charged unit"),
  row(39, "confirm", "F4", false, "Differently named Raptor impact modifiers stack", [
    "rule-atom:singleton:core-11-modifier-source-stacking:1266faa4a54d",
  ]),
  row(40, "confirm", "F4", false, "Differently named Speed modifiers stack while duplicate keyword effects do not", [
    "rule-atom:singleton:core-11-modifier-source-stacking:1266faa4a54d",
    "rule-atom:singleton:core-2-6-1-keyword-no-stack:5af3766b661b",
  ]),
  row(41, "new", "F4", true, "An opponent may block an end-round Faction Indicator deployment and a failed indicator expires"),
  row(42, "new", "F4", false, "Phase Prism PLACE zero puts Artanis in base contact with a selected target-unit model", [
    "rule-atom:singleton:core-11-place-leading-model-range:9ad753ad3c88",
  ]),
  row(43, "confirm", "F4", false, "Life Support removes damage from the combined existing and newly added total", [
    "rule-atom:singleton:core-8-7-4-accumulated-total-damage:12bfa0943024",
    "rule-atom:singleton:core-11-heal-damage-reduction:727c6a4fc5a5",
  ]),
  row(44, "new", "F4", false, "Tunnelling Claws cannot cross Force Field terrain"),
  row(45, "confirm", "F4", false, "PLACE is not movement and therefore does not remove a Force Field", [
    "rule-atom:singleton:core-11-place-nonmovement-geometry:eec5afaa1eb1",
  ]),
  row(46, "new", "F4", false, "Raptors cannot cross a Force Field because its permission is limited by model size"),
  row(47, "refine", "F4", true, "On Creep is checked at movement start and its bonus persists for that whole move", [
    "rule-atom:singleton:core-11-on-creep-condition:71f40e4e561b",
    "rule-atom:singleton:core-11-on-creep-rule-uses:173b9839db96",
  ]),
  row(48, "confirm", "F4", false, "An exhausted Academy cannot pay Advanced Training until Cleanup refreshes it", [
    "rule-atom:exhausted-card-lockout-until-refresh",
  ]),
  row(49, "refine", "F4", false, "Outside activations each trigger permits one Reaction and simultaneous priority belongs to First Player", [
    "rule-atom:reaction-exact-trigger-declaration-window",
    "rule-atom:simultaneous-reaction-active-player-priority",
  ]),
  row(50, "refine", "F4", false, "A Structure can be selected by effects that target an area or unit unless excluded", [
    "rule-atom:singleton:core-10-1-special-ability-universal-structure:5a816d600530",
  ]),
  row(51, "new", "F4", false, "Select and target are equivalent rules terms unless text distinguishes them"),
  row(52, "new", "F4", true, "Psionic Transfer cannot move an Adept carrying a claimed Artefact marker"),
  row(53, "refine", "F4", false, "PINPOINT permits shooting into combat but does not permit an engaged attacker to shoot out", [
    "rule-atom:singleton:core-11-pinpoint-engaged-ranged-targeting:593cfa7216ad",
  ]),
  row(54, "confirm", "F4", true, "PLACE is not one of the movement or deployment events that removes Creep", [
    "rule-atom:singleton:core-11-place-nonmovement-geometry:eec5afaa1eb1",
    "rule-atom:singleton:core-11-on-creep-condition:71f40e4e561b",
  ]),
  row(55, "confirm", "F4", false, "LOCKED IN checks whether the target is Stationary", [
    "rule-atom:singleton:core-11-locked-in-stationary-roa:615deb544566",
  ]),
  row(56, "supersede", "F4", false, "An unseen Indirect Fire target receives no Evade and casualty selection may include unseen models", [
    "rule-atom:singleton:core-11-indirect-fire-off-los-evade:8de63a970f7f",
    "rule-atom:singleton:core-11-indirect-fire-los-ignore:06c39713e53e",
  ]),
  row(57, "new", "F4", true, "Detection abilities select a location and place a Faction Indicator without Hidden range gating"),
  row(58, "new", "F4", false, "While-within conditions are checked at the start and end of every action or ability"),
  row(59, "refine", "F4", false, "REPEATABLE does not remove the one-Reaction-per-activation or one-per-trigger boundary", [
    "rule-atom:singleton:core-11-repeatable-use-permission:202261e65742",
    "rule-atom:per-activation-reaction-limit",
  ]),
  row(60, "refine", "F5", false, "PRECISION, SURGE and CRIT modify a weapon batch rather than individual models", [
    "rule-atom:singleton:core-11-precision-failed-dice-conversion:b540b4f0a7c2",
    "rule-atom:singleton:core-11-critical-hit-resolution:7501d86a7392",
  ]),
  row(61, "refine", "F5", false, "One Precision weapon profile split across enemies remains one simultaneous batch with allocated pools", [
    "rule-atom:singleton:core-8-7-3-profile-target-splitting:9e95cfd9a838",
    "rule-atom:singleton:core-8-7-3-same-profile-batch:39a85daa0988",
  ]),
  row(62, "refine", "F5", false, "Morph-driven current Supply reduction awards the opponent the lost Supply as victory points", [
    "rule-atom:singleton:core-11-morph-available-supply:332943c395d8",
    "rule-atom:singleton:core-6-2-destroyed-supply-scoring:2ff9059f5259",
  ]),
  row(63, "refine", "F5", false, "A Morphed unit's Supply reduction follows the same opponent victory-point rule", [
    "rule-atom:singleton:core-11-morph-available-supply:332943c395d8",
    "rule-atom:singleton:core-6-2-destroyed-supply-scoring:2ff9059f5259",
  ]),
  row(64, "refine", "F4", false, "Removing the Specialist carrier removes its specialist weapon without transferring it", [
    "rule-atom:singleton:core-9-1-7-specialist-single-carrier:81a9cd2746ac",
  ]),
  row(65, "refine", "F5", false, "A model-less blast uses the acting unit as attacker and a ground point as an untagged same-elevation target", [
    "rule-atom:singleton:core-8-7-6-blast-template-alignment:480abe551c04",
    "rule-atom:singleton:core-8-7-6-template-target-elevation:e7dcf6bf993d",
    "rule-atom:singleton:core-8-7-6-template-target-type:ff5eb006ea8a",
  ]),
  row(66, "refine", "F5", false, "Spillover requires a shared combat tag and matching elevation; Flying is not standard elevation", [
    "rule-atom:singleton:core-8-7-6-template-spillover:7686b7910494",
    "rule-atom:singleton:core-8-7-6-flying-template-elevation:40330cc7e08d",
  ]),
  row(67, "new", "F5", false, "Guardian Shield reduces each spillover batch separately"),
  row(68, "refine", "F5", false, "Precision and Critical apply only to the main template target and never to spillover", [
    "rule-atom:singleton:core-8-7-6-template-surge-application:bec5add22266",
    "rule-atom:singleton:core-11-critical-hit-resolution:7501d86a7392",
    "rule-atom:singleton:core-11-precision-failed-dice-conversion:b540b4f0a7c2",
  ]),
]);
