# Ticket 23 / Slice 230 — 通用 Ability Effect IR 与统一 Runtime 收口

日期：2026-09-14。状态：完成。Ticket 23 为 `16/36`，剩余 `20` 片。

## 交付结果

本片建立了一个深模块，避免 Web、Agent、Room 分别解释卡面文本：

- Module：`official-ability-effect-runtime-v1`；
- Interface：单一 `dispatch(operation, state, request)`；
- Seam：definition IR 到 runtime Adapter 的版本化绑定；
- Adapters：已证明的参考阵容 exact Adapter，以及只产生类型化诊断、永不产生可执行
  candidate 的 pending-family Adapter。

冻结官方数据中的 `26` 个 Unit 和 `37` 张 Faction/Tactical Card 被编译为 `252`
条 definition：

| 维度 | 数量 |
| --- | ---: |
| Active | 87 |
| Passive | 90 |
| Reaction | 24 |
| Weapon | 51 |
| Action runtime role | 138 |
| Reaction runtime role | 24 |
| Automatic Consumer runtime role | 51 |
| System Lifecycle runtime role | 39 |

每条 IR 保留来源文本/记录 lineage、阶段、timing hooks、effect families、typed operation
requirements 与 runtime role；精确参数只有已绑定 Runtime Adapter 才能成为 Rules authority。
编译器同步建立关系图，当前为 `252` 个 definition node、`1,762` 条
`defined_by / routes_as / available_in / observes / requires_family / bound_to` 边。后续
family slice 更新 Adapter 绑定时，图由同一编译器自动重建，不手填第二份清单。

当前参考阵容覆盖折叠到产品 definition 后为 `20` 条 exact definition；其余 `232`
条处于 `pending_family_adapter`。这不等于只接两个势力，也不冒充全卡池已执行；
Slices 232–242 逐族/逐势力提供精确 Adapter，Slice 243 要求 `252/252`、pending/unsupported
均为零。

500 Room Factory 升至 `1.5.0`，状态和组合证据绑定 IR catalogue 与统一 Runtime
descriptor。内容 hash 只负责不可变 lineage/replay identity；兼容性由 semantic version
与显式 Adapter 决定，不以历史 hash 漂移阻塞主动生成/对战主流程。

## 统一调用合同

统一入口支持：

- `legal_space`：返回 exact Adapter 的可执行 domain，并把 pending 独立放入诊断；
- `preview` / `apply` / `replay`：保持 Rules-owned
  `LegalSpace -> Preview -> Apply -> Replay`；
- `query`：供 Agent/Web 查询被动修正和场面状态；
- `lifecycle`：处理 `activation_end / phase_end / cleanup_and_refresh` 的过期效果与卡牌刷新。

`scope: "catalogue"` 可读取全产品 pending 分母；默认仍只显示当前场上/卡组/阶段相关
诊断，不污染玩家的可执行动作空间。

## 聚焦验证

只运行本片唯一相关门，没有重跑移动、射击、近战或历史聚合门：

1. 第 1 轮在进入新代码前失败：夹具误用了 `normalized_pending_certification` dataset，
   Room 正确报 `ROSTER_DISCLOSURE_DATASET_INVALID`；改用已有 development-tranche source
   lock fixture。
2. 第 2 轮证明 252 编译和 Room/Adapter 绑定已通过，但暴露统一入口不能请求全产品
   pending；补 `scope: "catalogue"`。
3. 第 3 轮通过：`252 = 20 exact + 232 pending`、1,762 edges、Factory `1.5.0`、
   catalogue diagnostics `232`、Tactical Retreat Preview/Apply/Replay exact match、
   phase-end 仅清除对应到期效果。

符合三轮收敛上限。无其他验证循环。

## Harness 可观测性

- `harnessLoopUsed: true`；
- prompt route：未改动，本片无模型调用；
- harness tools：统一六操作 dispatch；
- decision evidence：definition role、Adapter identity、exact/pending 分母与类型化诊断；
- memory trace：未修改 Agent 记忆；
- UI trace：无，产品 Web 接入与用户旅程在 Slice 245；
- training candidate：无，所有结果保持 `trainingTruth:false`；
- rollback/demotion：旧 selected runtime 仍可独立使用，新 Runtime 通过显式版本 Adapter
  包装；pending 不能晋升为可执行 truth。

## 非声称与下一步

本片证明的是“所有定义都有机器可读分类和统一接线位置”，不是“所有语义已执行”。
Slice 231 将冻结 252 条逐项产品分母、family owner 和缺口清单；Slice 232 起按该清单
落地 exact runtime，Slice 243 完成全量接线，Slices 244–250 完成 2000 分最终验收。

Provider 调用 `0`，Provider token `0`，费用 `¥0`；来源刷新 `false`。
