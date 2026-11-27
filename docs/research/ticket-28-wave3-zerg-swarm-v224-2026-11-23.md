# Ticket 28 / W3-11 · Zerg Swarm 2.24.0

恢复原 Zerg Swarm／Cocoon 军表。从原 2.22.0 的 19/24 到 2.23.0 的 21/24，本轮正式准入 23/24。严格开房和只读军表检查均只报 Brood Instinct。冻结发布为 U83/C84/R50 + FAQ 1.3。

| 条目 | 事实、接线及签名 |
| --- | --- |
| Zerg Creep | 军表已经通过收录冻结文字的通用 `exactly_one_tactical_group` 校验。现在准入登记也识别 Zerg Swarm 的同一份被动来源。含 Accelerating Creep 时军表通过本层，零张及增加 Malignant Creep 到两张均被正式工厂用规则错误拒绝。本能力不在场内提供可点击动作。 |
| Rapid Burrowing | 复用特征／状态执行器，版本显式接上冻结角色、移动阶段和选中阵营。隔离组件签验由已激活的 Vile 获得 Burrowed、Hidden。军表夹具保留另一队 Swarmling 的原激活窗，卡耗竭，敌方席位和重复施放无此选项。后续 Move 可见。一签冷回放一致。 |
| Brood Instinct | 以冻结文字编译精确反应来源，已证明是合格 Evade Roll 之前、本次 +1。消费者未接，仍在严格开房门内列为未执行。 |

开房与只读检查接同一组版本选项，复用原 Cocoon 版本能力。2.23.0 原 Match 的绑定与描述符只读重建精确一致。Rapid 使用原有签名军表和声明激活状态，用 2.24.0 的正式组装器构造原生组件房。完整 Zerg Swarm Match 仍待 Brood Instinct，整票与组件计数不因这组房间准入变化而调整。工程模型调用 0。

## Brood Instinct 接续

判定必须在护甲和可选掷骰修正后，使用实际剩余伤害骰和合格目标开启一次窗口。反应提交给对手后恢复同一攻击和同一目标，保留已签结果；没有闪避资格、无剩余骰或不可调整的阈值各需按冻结规则核对。现有生产边界是射击的 ranged precision evasion 阶段、近战与自动 HITS 的 melee pool evade 阶段。模板的分批路径由同一目标防御语义验收。仍须检查默认合并掷骰路径是否正确进入分阶段消费者，再允许正式开房。证据需包括接受、放弃、共享卡耗竭以及不提前揭示闪避骰，最后做同版本后继和冷恢复。

## 证据与失败记录

- [严格开房和两个军表反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/official-factory.public.json) · [同版只读覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/matching-read-only-coverage.public.json)
- [Rapid Burrowing 签名](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/rapid/result.public.json) · [Brood Instinct 冻结来源](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/brood-instinct-source.public.json) · [2.23.0 原描述符](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/v223-binding-reconstruction.public.json)
- 首次发现原卡过滤器忽略 Zerg Swarm，已修。其他停止为拒绝码断言、旧武器目录夹具、兼容诊断变量重名，均保留原记录。 [卡过滤](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/stop-1.public.json) · [拒绝码](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/stop-2.public.json) · [组件夹具](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/rapid-stop-1.public.json) · [兼容诊断](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-v224-v1/legacy-fixture-stop-1.public.json)

## 修改文件

- [official-release-room-ability-admission-v2.mjs](../../packages/product-composition/official-release-room-ability-admission-v2.mjs)
- [official-characteristic-status-family-adapter-v1.mjs](../../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs)
- [official-selected-roster-ability-runtime-v1.mjs](../../packages/product-composition/official-selected-roster-ability-runtime-v1.mjs)
- [official-release-room-native-actions-v2.mjs](../../packages/product-composition/official-release-room-native-actions-v2.mjs)
- [official-standard-room-factory-v1.mjs](../../packages/product-composition/official-standard-room-factory-v1.mjs)
- [official-skirmish-500-room-factory-v1.mjs](../../packages/product-composition/official-skirmish-500-room-factory-v1.mjs)
- [official-current-product-match-runtime-v1.mjs](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)
- [official-reaction-family-adapter-v1.mjs](../../packages/product-composition/official-reaction-family-adapter-v1.mjs)
