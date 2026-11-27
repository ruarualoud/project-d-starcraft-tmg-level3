# W4-02 逐 ID 能力差分与首批组件验收

2026-11-27；`codex/wave4-web-pvp`。逐定义差分完成；整版接线仍在进行。

**分母：38 个记录、156 条定义。** 新增记录内有 142 条；13 张旧卡实际变更 14 条。完整身份目录为 556 条：保留 400 条旧语义身份、将 14 条变更定义升为 @2、加入 142 条新身份。数组序号仅作原件定位，重排不改变语义 ID；改过语义的 @1 不被别名映射到 @2。

| 分类 | 定义数 | 含义 |
|---|---:|---|
| 数据变化 | 31 | 新数值或武器档案；仍需新来源绑定 |
| 已有原子 | 50 | 已有语义合同；须核对新 ID 与准入门 |
| 已有原子新组合 | 34 | 已有合同的触发、目标、作用域或顺序新组合 |
| 新增语义 | 41 | 至少依赖一个当前缺失的执行合同 |

**新增原子需求为 18 个，当前新增游戏原子实现为 0。** 同一缺失执行合同跨多个来源 ID 只计一次；新武器名字、数值档案和既有合同的新组合不分别增加原子数。另有 3 个只属于 Archon 撤下记录的候选合同，单独保留，未计入这 18 个。该数值是本次冻结范围的工程分解，不是已实现能力数。

逐定义原件、源字段哈希、触发、选择权、结算、清除、消费者函数和未覆盖项见 [完整机器清单](../../../content/source-releases/wave4-20261127/abilities/ability-diff.json)；[身份登记表](../../../content/source-releases/wave4-20261127/abilities/feature-registry.json) 与 [来源别名目录](../../../content/source-releases/wave4-20261127/abilities/identity-catalogue.json) 可离线重建。

## 实际消费者与首批接线

下列均为仓库真实存在并经导出检查的消费者。清单中的 consumerRefs 表示现有消费端或需要扩展的接入缝；每条另列 consumerBindingStatus。存在消费者函数不表示新的 Wave4 来源已准入。

| 简称 | 实际文件 | 导出 |
|---|---|---|
| attack | [official-attack-profile-catalogue-v2.mjs](../../../packages/source-data/official-attack-profile-catalogue-v2.mjs) | `createOfficialAttackProfileCatalogueV2` |
| characteristic | [official-characteristic-status-family-adapter-v1.mjs](../../../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs) | `createOfficialCharacteristicStatusFamilySourceBundleV2` |
| reaction | [official-reaction-family-adapter-v1.mjs](../../../packages/product-composition/official-reaction-family-adapter-v1.mjs) | `createOfficialReactionFamilySourceBundleV2` |
| reactionRuntime | [official-reaction-family-adapter-v1.mjs](../../../packages/product-composition/official-reaction-family-adapter-v1.mjs) | `createOfficialReactionFamilyAdapterV1` |
| relocation | [official-relocation-family-adapter-v1.mjs](../../../packages/product-composition/official-relocation-family-adapter-v1.mjs) | `createOfficialRelocationFamilySourceBundleV2` |
| lifecycle | [official-unit-lifecycle-family-adapter-v1.mjs](../../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs) | `createOfficialUnitLifecycleFamilySourceBundleV2` |
| asset | [official-battlefield-asset-family-adapter-v1.mjs](../../../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs) | `createOfficialBattlefieldAssetFamilySourceBundleV2` |
| roundEnd | [official-holo-round-end-runtime-v1.mjs](../../../packages/product-composition/official-holo-round-end-runtime-v1.mjs) | `createOfficialHoloRoundEndRuntimeV1` |
| supply | [official-contextual-supply-projection-v1.mjs](../../../packages/rule-atoms/official-contextual-supply-projection-v1.mjs) | `projectOfficialContextualSupplyValueV1` |
| supplyLoss | [official-friendly-supply-loss-reaction-v1.mjs](../../../packages/product-composition/official-friendly-supply-loss-reaction-v1.mjs) | `createOfficialFriendlySupplyLossReactionRuntimeV1` |
| refresh | [official-ranged-card-refresh-runtime-v1.mjs](../../../packages/product-composition/official-ranged-card-refresh-runtime-v1.mjs) | `createOfficialRangedCardRefreshRuntimeV1` |
| builder | [official-army-builder-catalogue-v2.mjs](../../../packages/source-data/official-army-builder-catalogue-v2.mjs) | `createOfficialArmyBuilderCatalogueV2` |
| nonlethal | [official-non-lethal-damage-rules-kernel-v1.mjs](../../../packages/rule-atoms/official-non-lethal-damage-rules-kernel-v1.mjs) | `resolveOfficialNonLethalDamageV1` |
| payment | [official-unit-ability-payment-modifiers-v1.mjs](../../../packages/product-composition/official-unit-ability-payment-modifiers-v1.mjs) | `quoteOfficialUnitAbilityModifiersV1` |

11 条时点修订已按精确新文字和 @2 身份接入现有反应编译器，效果 spec 与 @1 逐字段相同。旧文字绑定到新身份被拒绝。由于 Archon 的 Wip 无法分类且 Alarak 有不支持的显式阶段，完整目录编译仍明确失败；新增的显式定义范围编译保留 556 条完整来源分母，并使 scoped router 永远不具有整版生产准入资格。没有给未分类来源推断激活类型。

卡牌事实可由 `createOfficialReleaseCardCatalogueV2` 单独编译，仍复用完整 Builder 的来源绑定和规则章节核对。W4 得到 59 张同哈希卡牌；旧版卡束经该入口重编与原件逐字段相同。新单位购买约束、完整 Builder 和正式房间准入没有因此被绕过。

**7/11 条时点反应获得首批原生组件证据，共 14 条签名回执。** Vehicle Plating、Infantry Armor、Carapace、Ground Armor、Guardian Shell、Plasma Shields、Crystalline Alloy 在声明的护甲触发窗口中，通过真实 Room legalSpace → preview → confirm（如需）→ apply，核对 TOUGH/DODGE、耗卡、幂等、恢复原 activeSide 和冷回放。单位事实及桌面取自实际 500/2000 分房间工厂，原件字段经 Wave3/Wave4 对照一致。

这批是声明触发的组件验收：场景显式允许条件棋位，不证明混合势力卡组合能通过正式编军；也没有把护甲修改量误记为完整射击／近战／HITS／IMPACT 的真实护甲骰消费。真实攻击生产者、选择后继和 Web 仍是下一门。其余四条时点（Observer、Overseer、Veil of Shadows、Brood Instinct）仅完成来源编译；三条 Zerg Creep 主语修订仍待同版 Builder/房间消费者接线。

[差分和来源编译回执](evidence/ability-diff.public.json) · [7 组件原生回执](evidence/armour-reaction-components.public.json) · [旧房冷读](evidence/ability-wave3-cold-read.public.json)

## 官方复核与准入阻断

[11 月 26 日官方介绍](https://starcraft-tmg.com/news/rules/double-the-action-with-the-new-starcraft-tabletop-miniatures-game-2-player-starter-set) 明确三张 Virus 卡为 Healing Pathogen、Weighted Pustule、Hungering Infestation，并说明 Ashes 的对象是引入的人族地面机械单位。该公开来源用于消除选卡组歧义，未替换冻结候选。

经用户授权只读核对官方：单位集合现在为 59 条，Archon 单记录返回 404；版本元数据仍是 U98/C88/R50。保留原来 60 条的冻结原件和候选，不覆盖、重签或静默换成现行集合。[复核原件与决定](../../../content/source-releases/wave4-20261127/review/source-review.json)。

| 暂停准入范围 | 定义数 | 原因与下一条件 |
|---|---:|---|
| Archon | 15 | 当前官方集合不再包含该记录。冻结记录内四组 Wip 差异仍可审计，但全部保留为未准入；等待明确发布的替代来源。 |
| Infested Goliath / Infested Siege Tank | 23 | 原生 Zerg 记录仍印 CP。Ashes 明确转换的是引入的 Terran 单位，未据此擅自改这两条原生记录；等待同记录适用的资源说明或修正。 |
| Alarak / Bane Blades | 1 | 显式阶段为 Cobmbat Phase，严格阶段编译拒绝；保留原文，等待有来源的显式归一或修订。 |

合计 39 条来源阻断。其余定义也须完成自己的合同和消费验收，才能提高运行时准出数。15 个规则章节和 45 个旧单位仍引用未变原文及旧版证据，不要求重新实现。

## 新增原子合同清单

| 原子 ID | 缺失的执行合同 | 状态 |
|---|---|---|
| `rule-atom:wave4/friendly-lost-supply-threshold@1` | Project sum(initial-current Supply) across all friendly army units, including reserves and destroyed units; evaluate cumulative thresholds without conflating mission Supply or kill credit. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/friendly-damage-payment@1` | Choose another visible friendly Biological unit and resolve its actual 2 Damage before the promised Run/HITS/BUFF continuation; retain paid-cost lineage. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/incoming-damage-sacrifice@1` | Interrupt pending incoming Damage, resolve damage to a different friendly recipient, then reduce the original batch by the normal or empowered amount before allocation. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/pre-movement-fire-wall@1` | Before movement commits, test leading path and all final model positions against a Fire Wall; remove the token, resolve HITS, suppress charge IMPACT, then resume or terminate the same movement. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/per-model-flamer-substitution@1` | Player selects permitted individual models to replace numeric weapon attacks with FT coverage, including the melee variant; do not duplicate those models in numeric pools. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/before-casualty-batch-detonation@1` | Retain the pending casualty batch and its pre-removal geometry; optional paid reaction deals HITS per model about to die, then removes those models exactly once. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/parent-scoped-summon-capacity@1` | Reject another summon while any living summoned child of this parent exists, independent of child type and of other parents. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/round-once-game-override@1` | Grant a round-scoped permission to reuse an already-used summon without erasing the original once-per-game record or granting other summon types. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/summoned-child-action-continuation@1` | After summon, or a parent ability targeting its own child, let the controller perform the specified child movement and return to the suspended parent ownership. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/round-end-reserve-deploy@1` | Store a marker while the parent is in reserves; at round end offer optional base-contact deployment with current legality, then consume the once-game scheduled effect. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/triggered-melee-self-removal@1` | On enemy activation end or successful charge, resolve a mandatory melee attack against the qualifying enemy, including defence/casualty choices, then remove the source and restore the parent continuation. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/before-place-direction-and-target-buff@1` | Before each PLACE, optionally choose an enemy; constrain that placement directly towards it and bind the RoA bonus exclusively to attacks against that target. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/infestation-activation-exchange@1` | Consume the enemy INFESTATION after marking that enemy activated; optionally select a nearby non-Unique friendly Infested unit and remove its activation marker, preserving phase ownership. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/infestation-reaction-lock@1` | For an infected enemy, block its own enemy reactions and enemy reactions targeting it, while retaining the explicit Restoration exception and controller-relative allegiance. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/infestation-placement-reserve-lock@1` | For an infected enemy, reject PLACE, set effects and return-to-reserves across all movement/lifecycle entry points; ordinary legal movement remains available. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/foreign-faction-army-eligibility@1` | Permit Terran Ground Mechanical purchases only under the Stukov faction while applying costs, slots, uniqueness and upgrade rules to the original source identity. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/faction-unit-runtime-conversion@1` | Bind the imported units to Infested tag addition, CP-to-BM payment conversion and BURROWED prohibition without changing unrelated units or rewriting the source records. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/spawn-round-ability-lock@1` | When the faction sets its structure, suppress its abilities except Structure for that round, then restore the correct abilities after cleanup; do not silently grant SUMMON semantics. | 需求已拆分，尚未实现 |
| `rule-atom:wave4/shield-scaled-effect-value@1` | Use remaining shield points to derive attack/IMPACT dice or detonation damage with each printed rounding rule. Withdrawn Archon source only. | Archon 撤下来源专属，暂不实施 |
| `rule-atom:wave4/shield-reservoir-damage-payment@1` | Reduce a friendly pending damage batch by spending this source shield reservoir with the exact optional/fixed amount and shielded requirements. Conflicting withdrawn Archon drafts. | Archon 撤下来源专属，暂不实施 |
| `rule-atom:wave4/target-card-exhaustion-waiver@1` | Once per round, waive exhaustion of a non-Faction card targeting the carrier, without readying an already exhausted card or changing other payment requirements. Withdrawn Archon source only. | Archon 撤下来源专属，暂不实施 |

## 逐定义映射

所有行均可由稳定 definitionId 回到完整 JSON 的字段来源、选择、结算和清除描述。以下状态仅表示源级分析；首批组件准出由独立回执覆盖。

| 稳定 ID | 分类 | 消费者 | 新原子数 | 来源阻断 |
|---|---|---|---:|---|
| `unit:alarak/commander-any-phase@1` | 已有原子 | supply | 0 | 无源级阻断；接线待验 |
| `unit:alarak/highlord-of-the-tal-darim-any-phase@1` | 新增语义 | supply / characteristic | 1 | 无源级阻断；接线待验 |
| `unit:alarak/sacrifice-any-phase@1` | 新增语义 | reaction / characteristic | 2 | 无源级阻断；接线待验 |
| `unit:alarak/wrath-of-the-highlord-assault-phase@1` | 新增语义 | characteristic / relocation | 1 | 无源级阻断；接线待验 |
| `unit:alarak/destruction-wave-assault-phase@1` | 新增语义 | characteristic | 1 | 无源级阻断；接线待验 |
| `unit:alarak/empower-me-assault-phase@1` | 新增语义 | characteristic | 1 | 无源级阻断；接线待验 |
| `unit:alarak/devastating-charge-assault-phase@1` | 已有原子 | attack | 0 | 无源级阻断；接线待验 |
| `unit:alarak/bane-blades-cobmbat-phase@1` | 数据变化 | attack | 0 | EXPLICIT_SOURCE_PHASE_UNSUPPORTED |
| `unit:archon/stand-as-one-any-phase@1` | 新增语义 | reaction | 1 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/wip-any-phase@1` | 新增语义 | reaction | 1 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/psionic-entity-any-phase@1` | 新增语义 | characteristic / attack | 1 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/wip2-any-phase@1` | 新增语义 | characteristic / attack | 1 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/burning-radiance-any-phase@1` | 已有原子新组合 | reaction / characteristic | 0 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/wip3-any-phase@1` | 已有原子新组合 | reaction / characteristic | 0 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/khaydarin-amulet-any-phase@1` | 新增语义 | payment | 1 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/feedback-movement-phase@1` | 已有原子新组合 | characteristic | 0 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/indomitable-assault-phase@1` | 已有原子 | characteristic | 0 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/psionic-shockwave-assault-phase@1` | 数据变化 | attack | 0 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/devastating-charge-assault-phase@1` | 已有原子 | attack | 0 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/mak-thor-idan-assault-phase@1` | 新增语义 | characteristic / attack | 1 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/wip-4-assault-phase@1` | 新增语义 | characteristic / attack | 1 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/power-overwhelming-combat-phase@1` | 新增语义 | characteristic / lifecycle | 1 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:archon/psychic-ripple-combat-phase@1` | 数据变化 | attack | 0 | ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION |
| `unit:firebat/stimpack-movement-phase@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:firebat/incinerator-gauntlets-movement-phase@1` | 新增语义 | asset / relocation | 1 | 无源级阻断；接线待验 |
| `unit:firebat/perdition-flamethrower-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:firebat/fire-it-up-assault-phase@1` | 新增语义 | attack | 1 | 无源级阻断；接线待验 |
| `unit:firebat/flame-strike-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:firebat/need-a-light-combat-phase@1` | 新增语义 | attack | 1 | 无源级阻断；接线待验 |
| `unit:infested_goliath/ares-class-targeting-system-any-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/target-lock-movement-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/indomitable-assault-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/autocannon-assault-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/underbelly-machine-gun-assault-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/hellfire-missiles-assault-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/scatter-missiles-assault-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/haywire-missiles-assault-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/devastating-charge-assault-phase@1` | 已有原子 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_goliath/stomp-combat-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_marine/live-for-the-swarm-any-phase@1` | 已有原子新组合 | characteristic / asset | 0 | 无源级阻断；接线待验 |
| `unit:infested_marine/detonation-any-phase@1` | 新增语义 | reaction / supplyLoss | 1 | 无源级阻断；接线待验 |
| `unit:infested_marine/burrow-ambush-movement-phase@1` | 已有原子 | relocation | 0 | 无源级阻断；接线待验 |
| `unit:infested_marine/plagued-munitions-assault-phase@1` | 已有原子新组合 | characteristic / nonlethal | 0 | 无源级阻断；接线待验 |
| `unit:infested_marine/infested-c-14-rifle-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_marine/infested-missile-launcher-acid-blast-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_marine/infested-missile-launcher-scourgeshot-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_marine/devastating-charge-assault-phase@1` | 已有原子 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_marine/wild-mutation-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_marine/strike-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_missile_turret/detection-any-phase@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:infested_missile_turret/source-of-creep-any-phase@1` | 已有原子 | asset | 0 | 无源级阻断；接线待验 |
| `unit:infested_missile_turret/infestation-any-phase@1` | 已有原子新组合 | supplyLoss / characteristic | 0 | 无源级阻断；接线待验 |
| `unit:infested_missile_turret/structure-any-phase@1` | 已有原子 | lifecycle | 0 | 无源级阻断；接线待验 |
| `unit:infested_missile_turret/firefly-missiles-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_missile_turret/ocular-overwatch-assault-phase@1` | 已有原子新组合 | reaction / attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_siege_tank/large-any-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/heavy-plating-any-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/mode-transformation-movement-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/coordinated-strike-movement-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/twin-cannon-assault-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/shock-cannon-assault-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/indomitable-assault-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/point-blank-assault-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/aftershock-rounds-assault-phase@1` | 已有原子 | characteristic | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/shaped-blast-assault-phase@1` | 已有原子 | reaction | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/smart-shells-assault-phase@1` | 已有原子 | reaction | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/devastating-charge-assault-phase@1` | 已有原子 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_siege_tank/rolling-over-combat-phase@1` | 数据变化 | attack | 0 | NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED |
| `unit:infested_trooper/live-for-the-swarm-any-phase@1` | 已有原子新组合 | characteristic / asset | 0 | 无源级阻断；接线待验 |
| `unit:infested_trooper/detonation-any-phase@1` | 新增语义 | reaction / supplyLoss | 1 | 无源级阻断；接线待验 |
| `unit:infested_trooper/spread-infestation-any-phase@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:infested_trooper/burrow-ambush-movement-phase@1` | 已有原子 | relocation | 0 | 无源级阻断；接线待验 |
| `unit:infested_trooper/plagued-munitions-assault-phase@1` | 已有原子新组合 | characteristic / nonlethal | 0 | 无源级阻断；接线待验 |
| `unit:infested_trooper/infested-c-14-rifle-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_trooper/devastating-charge-assault-phase@1` | 已有原子 | attack | 0 | 无源级阻断；接线待验 |
| `unit:infested_trooper/bayonet-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:phasing_scarab/timed-life-any-phase@1` | 已有原子 | roundEnd | 0 | 无源级阻断；接线待验 |
| `unit:phasing_scarab/nimble-any-phase@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:phasing_scarab/proximity-detonation-assault-phase@1` | 新增语义 | reaction / lifecycle / attack | 1 | 无源级阻断；接线待验 |
| `unit:phasing_scarab/explosive-charge-assault-phase@1` | 新增语义 | reaction / lifecycle / attack | 1 | 无源级阻断；接线待验 |
| `unit:phasing_scarab/phase-blast-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:reaver/large-any-phase@1` | 已有原子 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:reaver/limited-artificial-intelligence-any-phase@1` | 新增语义 | lifecycle | 1 | 无源级阻断；接线待验 |
| `unit:reaver/microfactory-movement-phase@1` | 新增语义 | lifecycle / payment | 1 | 无源级阻断；接线待验 |
| `unit:reaver/scarab-movement-phase@1` | 新增语义 | lifecycle / relocation | 1 | 无源级阻断；接线待验 |
| `unit:reaver/solarite-scarab-movement-phase@1` | 新增语义 | lifecycle / relocation | 1 | 无源级阻断；接线待验 |
| `unit:reaver/phasing-scarab-movement-phase@1` | 新增语义 | lifecycle / relocation | 1 | 无源级阻断；接线待验 |
| `unit:reaver/shuttle-movement-phase@1` | 新增语义 | asset / roundEnd / lifecycle | 1 | 无源级阻断；接线待验 |
| `unit:reaver/siege-triangulation-assault-phase@1` | 新增语义 | relocation / lifecycle | 1 | 无源级阻断；接线待验 |
| `unit:reaver/indomitable-assault-phase@1` | 已有原子 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:reaver/crawl-over-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:scarab/timed-life-any-phase@1` | 已有原子 | roundEnd | 0 | 无源级阻断；接线待验 |
| `unit:scarab/nimble-any-phase@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:scarab/proximity-detonation-assault-phase@1` | 新增语义 | reaction / lifecycle / attack | 1 | 无源级阻断；接线待验 |
| `unit:scarab/explosive-charge-assault-phase@1` | 新增语义 | reaction / lifecycle / attack | 1 | 无源级阻断；接线待验 |
| `unit:scarab/scarab-detonation-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:slayer__stalker_/squadron-any-phase@1` | 已有原子 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:slayer__stalker_/seek-bloodshed-any-phase@1` | 已有原子新组合 | supplyLoss / reaction / relocation | 0 | 无源级阻断；接线待验 |
| `unit:slayer__stalker_/bloodshard-blink-any-phase@1` | 新增语义 | relocation / characteristic | 1 | 无源级阻断；接线待验 |
| `unit:slayer__stalker_/blink-movement-phase@1` | 已有原子 | relocation | 0 | 无源级阻断；接线待验 |
| `unit:slayer__stalker_/particle-disruptors-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:slayer__stalker_/stomp-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:solarite_scarab/timed-life-any-phase@1` | 已有原子 | roundEnd | 0 | 无源级阻断；接线待验 |
| `unit:solarite_scarab/nimble-any-phase@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:solarite_scarab/proximity-detonation-assault-phase@1` | 新增语义 | reaction / lifecycle / attack | 1 | 无源级阻断；接线待验 |
| `unit:solarite_scarab/explosive-charge-assault-phase@1` | 新增语义 | reaction / lifecycle / attack | 1 | 无源级阻断；接线待验 |
| `unit:solarite_scarab/solarite-blast-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:stukov/commander-any-phase@1` | 已有原子 | supply | 0 | 无源级阻断；接线待验 |
| `unit:stukov/plague-warden-any-phase@1` | 已有原子新组合 | supply / characteristic | 0 | 无源级阻断；接线待验 |
| `unit:stukov/spread-infestation-movement-phase@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:stukov/admiral-of-the-infested-movement-phase@1` | 新增语义 | characteristic | 1 | 无源级阻断；接线待验 |
| `unit:stukov/bio-kill-switch-assault-phase@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `unit:stukov/corrosive-blast-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:stukov/corrode-armor-assault-phase@1` | 已有原子新组合 | reaction / characteristic | 0 | 无源级阻断；接线待验 |
| `unit:stukov/devastating-charge-assault-phase@1` | 已有原子 | attack | 0 | 无源级阻断；接线待验 |
| `unit:stukov/infested-arm-combat-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `unit:tal_darim_pylon/structure-any-phase@1` | 已有原子 | lifecycle | 0 | 无源级阻断；接线待验 |
| `unit:tal_darim_pylon/warp-conduit-any-phase@1` | 已有原子新组合 | asset / lifecycle | 0 | 无源级阻断；接线待验 |
| `unit:tal_darim_pylon/bloodshard-monument-any-phase@1` | 已有原子新组合 | supplyLoss / refresh | 0 | 无源级阻断；接线待验 |
| `unit:tal_darim_pylon/overwatch-assault-phase@1` | 已有原子新组合 | reaction / attack | 0 | 无源级阻断；接线待验 |
| `unit:tal_darim_pylon/overcharged-pylon-assault-phase@1` | 数据变化 | attack | 0 | 无源级阻断；接线待验 |
| `card:armory/vehicle-plating-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:barracks__reactor_/go-go-go-any@1` | 已有原子 | relocation | 0 | 无源级阻断；接线待验 |
| `card:barracks__reactor_/terran-charge-any@1` | 已有原子新组合 | reaction / attack | 0 | 无源级阻断；接线待验 |
| `card:engineering_bay/infantry-armor-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:evolution_chamber/carapace-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:forge/ground-armor-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:healing_pathogen/universal-carrier-any@1` | 已有原子新组合 | supplyLoss / characteristic | 0 | 无源级阻断；接线待验 |
| `card:healing_pathogen/stukov-s-creep-any@1` | 已有原子新组合 | asset | 0 | 无源级阻断；接线待验 |
| `card:hive/brutal-instinct-any@1` | 已有原子新组合 | reaction / characteristic | 0 | 无源级阻断；接线待验 |
| `card:hive/creep-spread-any@1` | 已有原子 | asset | 0 | 无源级阻断；接线待验 |
| `card:hungering_infestation/growing-infestation-any@1` | 新增语义 | reaction | 1 | 无源级阻断；接线待验 |
| `card:hungering_infestation/stukov-s-creep-any@1` | 已有原子新组合 | asset | 0 | 无源级阻断；接线待验 |
| `card:infested_barracks/for-the-swarm-any@1` | 已有原子新组合 | relocation | 0 | 无源级阻断；接线待验 |
| `card:infested_command_center/parasitic-bio-toxins-any@1` | 已有原子新组合 | reaction / characteristic | 0 | 无源级阻断；接线待验 |
| `card:infested_command_center/scanner-sweep-any@1` | 已有原子新组合 | asset / characteristic | 0 | 无源级阻断；接线待验 |
| `card:kerrigan_s_swarm/zerg-creep-any@2` | 已有原子 | builder | 0 | 无源级阻断；接线待验 |
| `card:observer/gravitic-boosters-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:overseer/pneumatized-carapace-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:power_field/guardian-shell-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:robotics_facility/plasma-shields-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:robotics_support_bay/master-of-robotics-any@1` | 已有原子新组合 | characteristic | 0 | 无源级阻断；接线待验 |
| `card:stukov_s_forces/ashes-of-the-ued-any@1` | 新增语义 | builder / payment / characteristic | 2 | 无源级阻断；接线待验 |
| `card:stukov_s_forces/infestation-any@1` | 已有原子新组合 | builder | 0 | 无源级阻断；接线待验 |
| `card:stukov_s_forces/hostile-incubation-any@1` | 新增语义 | lifecycle / characteristic | 1 | 无源级阻断；接线待验 |
| `card:tal_darim/proxy-pylon-any@1` | 新增语义 | lifecycle / characteristic | 1 | 无源级阻断；接线待验 |
| `card:tal_darim/chain-of-ascension-any@1` | 新增语义 | supply / characteristic | 1 | 无源级阻断；接线待验 |
| `card:tal_darim/4-or-more-any@1` | 新增语义 | supply / characteristic | 1 | 无源级阻断；接线待验 |
| `card:tal_darim/6-or-more-any@1` | 新增语义 | supply / characteristic | 1 | 无源级阻断；接线待验 |
| `card:twilight_council/veil-of-shadows-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:vanadium_plating/crystalline-alloy-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:weighted_pustule/fetid-touch-any@1` | 新增语义 | relocation / lifecycle | 1 | 无源级阻断；接线待验 |
| `card:weighted_pustule/stukov-s-creep-any@1` | 已有原子新组合 | asset | 0 | 无源级阻断；接线待验 |
| `card:zagara_s_swarm/zerg-creep-any@2` | 已有原子 | builder | 0 | 无源级阻断；接线待验 |
| `card:zerg_swarm/brood-instinct-any@2` | 已有原子 | reaction / reactionRuntime | 0 | 无源级阻断；接线待验 |
| `card:zerg_swarm/zerg-creep-any@2` | 已有原子 | builder | 0 | 无源级阻断；接线待验 |

## 复核与接续

在 `/Users/rualoud/Downloads/codex_project/project-d/.worktrees/wave4-web/starcraft-tmg-level3` 执行：

```sh
node scripts/compile-wave4-ability-diff.mjs
node scripts/verify-wave4-ability-diff.mjs
node scripts/verify-wave4-armour-reaction-components.mjs
node scripts/verify-wave4-wave3-cold-read.mjs build/wave4-web/host/run-qI3May
```

组件验收和旧房冷读复用本树已备的 Wave3 冻结缓存与 W4-01 隔离房；这些命令不读 5483 玩家服务。旧房的状态、绑定、完整回放和元数据字节均匹配 W4-01 原证据，没有新增动作。

下一步先把已验 7 条反应接到真实攻击生产者和护甲骰后继，再接四条其余时点、三条 Creep 编军主体语义，并依赖顺序实现这 18 个新合同。按语义组复用证据，分别报告组件、正式房间与 Web 准出。付费模型、K3、AI 对局、复盘与生产发布继续暂停。
