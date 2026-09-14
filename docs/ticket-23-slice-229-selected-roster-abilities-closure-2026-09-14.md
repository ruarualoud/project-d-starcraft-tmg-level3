# Ticket 23 / Slice 229 — 参考阵容卡面能力与消费者收口

日期：2026-09-14

## 交付结果

冻结官方 500 分参考阵容的能力现在不再只是卡面展示，而是进入同一条
`LegalSpace -> Instantiate -> Preview -> Apply -> Log/Replay` 产品链：

- 来源编译出 `13` 条主动能力路由：3 个 Marine 的 Stimpack、所选 Combat Shield、
  Kerrigan 的 3 条主动能力、Raptor 的 2 条主动能力，以及 Terran Armed Forces /
  Kerrigan's Swarm 的 4 条阵营卡主动能力；
- 同时绑定 `9` 条被动能力：Commander、两条 Devastating Charge、Squadron、
  Raptor Strain、Zerg Creep 与 Accelerating Creep 的三条被动；selected ability
  `unsupported=0`；
- 主动能力 LegalSpace 固定动作前/动作后窗口、当前激活 Unit、每轮/每局次数、目标 Unit、
  底座边缘距离、完整支付卡集合和 PLACE/Omega Worm 坐标；客户端不能提交能力数值；
- Command Point/Biomass 支付复用 37 张官方卡的通用支付内核，支付或使用卡面主动能力时
  原子 Exhaust，超额资源不保存；Cleanup 入口刷新卡并移除到期效果；
- Stimpack 实际写入 NON-LETHAL DAMAGE (2)、BUFF Speed (3)、PRECISION (3)、状态和
  effect marker；Combat Shield、Mutating Carapace、Wild Mutation、Leap、Adrenal
  Overload、Tactical Retreat 与 Terran Tenacity 都写入类型化效果或权威状态；
- 空间 Runtime 读取 Speed/ON CREEP 与脱离修正；Ranged/Fight 读取 Precision 和 Evade；
  Charge/IMPACT 读取额外距离与命中修正。Precision 的选择域是已揭示失败 Hit die 的索引
  子集，最多使用当前 Precision 值，也允许主动放弃；
- Omega Network 创建真正的 80mm Omega Worm Structure，而不是普通 Token；规则层检查
  完整底座在桌内、与敌方模型严格超过 10 英寸、无模型/地形重叠。无武器 Structure 使用
  独立防御 Profile，只能作为目标，不能被旧武器编译器伪造成持有武器的 Unit；
- Omega Worm 的 Source of Creep 可由只读 query 和消费者读取；同一 Unit 的动作前能力、
  主动作和动作后能力由 activation window 锁定，最终 `finish_activation` 后才交替激活。

Room Factory 升级为 `1.4.0`，绑定支付数据、能力来源 bundle、ability descriptor，并把参考
阵容完整动作延迟清单从 `[229,230]` 收窄到 `[230]`。

## 聚焦门

遵守最多三轮的收敛规则。第 1 轮只发现一项直接缺口：旧 Combat Profile 编译器要求每个
Unit 至少一把武器，因此正确拒绝无武器 Omega Worm。修复没有放宽旧编译器，而是增加
Structure target-only 防御 Profile。第 2 轮通过，未继续重跑：

```text
status                         passed
factory version                1.4.0
selected active routes         13
selected passive bindings      9
unsupported selected ability   0
Stimpack                       damage 2 / multi-model Speed 7 / Precision 3
Combat Shield                  close-combat Evade eligible
Omega Network                  one legal Structure created
source refresh                 false
Provider calls/tokens/cost     0 / 0 / ¥0
```

没有运行任何历史全量门或无关 Slice 门。

## 精确边界

本片只收口参考阵容中的能力和其现有移动/射击/冲锋/近战消费者。Accelerating Creep 不创建
Creep Tumor，它只修正其他来源创建的 Tumor；参考军表中没有 Tumor 创建能力，因此没有
伪造一个来源。统一 Ability/Effect 自动路由及 phase/cleanup 系统生命周期组合属于 Slice
230；26 Unit、37 Card、252 definition 的完整产品分母仍按 Slices 231–243 完成。正式
2000 分 Standard H-A/A-A 验收仍是 Slices 244–250，不由本参考门冒充。
