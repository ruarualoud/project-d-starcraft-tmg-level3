// Workflow authority, not game strategy. Shared by design, preflight and method;
// a delegation authorizes selection within declared bounds, never its result.
export function rosterComparisonStageOwnershipV1(){
  return {version:1,
    design:{owner:'comparison_design_author',owns:['decision_question','arms_and_change_factors','participants',
      'scenario_conditions_and_bounds','metrics','effect_endpoint','decision_consequences'],
    missingBounds:'Return a concrete missing strategic assumption to the design author; method must not change the hypothesis or invent an unbounded scenario.'},
    preflight:{owner:'comparison_preflight_reviewer',executionApproved:false,
      checks:['frozen_facts','current_arm_and_observation_identity','bounded_method_capability'],
      instruction:'Assess whether the declared bounded comparison CAN be realized with the available tools, not whether an unrun method already succeeded. If the design explicitly delegates exact realization within meaningful stated bounds, cite that declaration as authored_choice and preserve its conditions; delegation is NOT answered_fact or a measured legal position. Missing strategic bounds remain author_decision, missing Native capabilities/sources remain necessary_fact. An optional tool setting with a documented default is not automatically a missing design choice. Read the actual tool contract before requiring a parameter. No classification is changed by Host.'},
    realization:{owner:'experiment_method',requiresExplicitWorkOrder:true,mayChangeDesign:false,
      owns:['exact_legal_coordinates_within_declared_region_or_range','native_phase_and_attack_domain_matching_the_declared_endpoint',
        'common_query_settings_and_optional_sampler_settings'],
      instruction:'Before measuring, choose and record exact scene, range/cover, phase, legal domain and effective settings in the normal structured workOrder. Use the same relevant controls across arms; optional sampler values follow the tool contract/default, and actual receipts retain effective values. Native must validate all placements/actions. A region or delegation is not a successful geometry result. If no legal realization exists or meaningful bounds are absent, return the concrete gap rather than invent a result or widen into a full game. Stop at the declared local endpoint and return observations, not a roster winner.'},
    adoption:{owner:'strategic_decision_author',after:'source_checked_comparison_observations',
      owns:['evidence_backed_retain_or_joint_roster_plan_revision']},
    acceptanceGranted:false};
}
