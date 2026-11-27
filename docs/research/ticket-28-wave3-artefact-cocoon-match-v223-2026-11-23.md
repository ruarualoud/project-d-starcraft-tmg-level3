# Ticket 28 / W3-11 · Cocoon 与 Artefact 移除归因

## 原因和方案

Wave2 的 Cocoon 两能力已在具名组件中签验。Wave3 Match 2.22.0 没有注册它们，也没有从生成物合同登记 Ravager 默认武器的消费路径。Cocoon 原组件只接受本卡的生命周期，实际军表还选了 Swarmling 的 Zergling Reconstitution。

隔离 Match 2.23.0 共用生命周期与复生来源，保留各能力的独立资格与支付。Ranged 和 Melee 以真实生成物来源的记录、散列与默认配装绑定新 Ravager 武器。完整 Morph 使用原生 `model_morphed` 回执验证末模型身份、整队实际移除及零击杀。Artefact 以该模型撤离前的底座触发非阵亡移除。正常伤亡及撤回保留各自触发路径。

## 产品证据

| 关口 | 实际结果 |
| --- | --- |
| 严格开房 | Kerrigan’s Swarm 的合法军表通过。原 Zerg Swarm 的军表待注册从 5 条减至 3 条，剩 Brood Instinct、Rapid Burrowing 和 Zerg Creep。游戏规则、预算及阵营资格仍由同一工厂校验。 |
| Standard Artefact | 声明第二回合 Cleanup 棋位及 Vile 既有损失，邻近的 Swarmling 提供控制 Supply，Vile 签名拾取。另从该状态声明 Movement，实际消耗 Cocoon 并生成 Ravager。对手以 Vile 的旧底座为参照完成摆放，恢复常规行动。回执敌方击杀为 0，整个 Supply 损失账一致。 |
| Spawn Larva | 独立声明 Swarmling 已有损失，同房菜单也提供其 Zergling Reconstitution。玩家从 Cocoon 实际复生一枚模型，5 → 6，Supply 保持 0，原单位的 Move 可继续。 |
| 兼容 | 三间 2.23.0 隔离房共五签，逐间冷回放一致。旧 Dropship 2.22.0 房按保存绑定重新组装，原描述符逐字段一致。本轮未重放旧房。 |

本轮保留一次摆位夹具失败。修正为不重叠的紧凑摆位后验收通过。模型调用 0。

范围为正式 Match 候选和隔离房。任务分数结算尚未连续走到对应 Cleanup，已签零击杀回执及其账本。Ravager 的默认射击、近战定义已注册，生成物战斗后继和其他固有能力还需按正式路径验证。Skirmish 工厂接同一开关，尚无使用 Cocoon 的 Skirmish 实签。Web/App 的整体发布准入仍待。

- [控制与拾取](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-artefact-cocoon-v223-v1/claim/result.public.json) · [Morph 与对手放置](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-artefact-cocoon-v223-v1/morph/result.public.json) · [复生](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-artefact-cocoon-v223-v1/spawn/result.public.json)
- [旧版描述符](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-artefact-cocoon-v223-v1/legacy-v222-reconstruction.public.json) · [军表准入对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-artefact-cocoon-v223-v1/factory-preflight.public.json) · [原底座与损失账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-artefact-cocoon-v223-v1/morph/custody-proof.public.json) · [夹具停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-artefact-cocoon-v223-v1/stop-1.public.json)

## 修改文件

- [official-respawn-morph-data-bundle-v1.mjs](../../packages/source-data/official-respawn-morph-data-bundle-v1.mjs)
- [official-unit-lifecycle-family-adapter-v1.mjs](../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs)
- [official-characteristic-status-component-runtime-v2.mjs](../../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs)
- [official-release-room-ability-admission-v2.mjs](../../packages/product-composition/official-release-room-ability-admission-v2.mjs)
- [official-release-room-native-actions-v2.mjs](../../packages/product-composition/official-release-room-native-actions-v2.mjs)
- [official-standard-room-factory-v1.mjs](../../packages/product-composition/official-standard-room-factory-v1.mjs)
- [official-skirmish-500-room-factory-v1.mjs](../../packages/product-composition/official-skirmish-500-room-factory-v1.mjs)
- [official-current-product-match-runtime-v1.mjs](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)
- [official-artefact-hunt-drop-continuation-v1.mjs](../../packages/product-composition/official-artefact-hunt-drop-continuation-v1.mjs)
- [official-selected-roster-ranged-action-runtime-v1.mjs](../../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs)
- [official-selected-roster-melee-action-runtime-v1.mjs](../../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs)
- [official-artefact-hunt-kernel-v1.mjs](../../packages/rule-atoms/official-artefact-hunt-kernel-v1.mjs)
