# Ticket 23 / Slice 233 — 当前官方产品特征与状态能力族收口

日期：2026-09-14。状态：完成。Ticket 23 为 `19/36`，剩余 `17` 片。

## 交付结果

冻结官方来源保持 `units=71 / cards=69 / rules=48`，本片没有网络刷新。owner 233 的
`60` 条 pending definition 全部通过确切名称与原文模式编译，未把任意 prose 当规则。
加上 Slice 229 已覆盖的 Marine/Kerrigan/Kerrigan-Raptor 五条 definition，该 owner 为
`65/65 executable_exact`；全产品分母现为：

```text
105 executable_exact + 147 pending_family_adapter = 252
```

新增 `official-characteristic-status-family-adapter-v1` 是一个深 Module。Web、Room、Agent
和后续战斗 Module 仍只接触统一的 `legal_space / preview / apply / query / lifecycle`
Interface；内部把 60 条定义归并为 28 个语义族：

| 范围 | Definition | 代表语义 |
| --- | ---: | --- |
| 主动 Action | 34 | 资源支付、Burrow 切换、HEAL、Stimpack、BUFF/DEBUFF、首把武器增益、Guardian Shield、Target Lock |
| 自动 Consumer | 19 | 武器关键词、首次 Armour Roll、Detection、HP、Coherency、Evade 与接战权限 |
| 系统/攻击触发 | 7 | Regeneration、Slugthrower、Titan Killers、We Stand as One |

所有同名数字关键词采用最高值、不叠加。Unit upgrade 的 army-building cost 与每次能力的
CP/Biomass/Energy 支付是两个字段：前者只判断能力是否随当前编成入场，后者由 Ready
Card 集合进行 Rules-owned 精确支付。Tactical Card 的 Active 能力耗竭来源卡，不伪造
第二次支付。

## 状态、空间与生命周期

- Medpack 按 Medic 中实际处于目标 Unit 四英寸内的模型数计算 `HEAL (X)`；Field Repair
  与 Regeneration 使用固定 `HEAL (2)`。HEAL 只移除累计 Damage，不复活模型或恢复
  Shielded。
- `Within` 查询复用完整圆/矩形底座的官方几何 Module；Optical Flare、Target Lock、
  Guardian Shield、Detection 和 Slugthrower 不读取屏幕像素或棋子中心近似。
- Burrowed 同时投影 Hidden，并在失去 Burrowed 时一起清理；Underdeveloped Claws 会在
  LegalSpace 阶段阻止获得 Burrowed。Path of Shadows 在该 Unit 下一个动作后移除 Hidden。
- Active Ability 默认到当前 Round 结束；现有状态在 cleanup-and-refresh 清理。统一 Ability
  Runtime 新增 `activation_start` 与 `action_performed`，从而让 Regeneration 和 Path of
  Shadows 不依赖 UI 自行修改状态。
- Consumer query 返回 Speed/Range/RoA/HP/IMPACT/Precision/Anti-Evade/Critical Hit/Tough、
  Evade、Detection、Charge 2D6 取高、Guardian attack-pool、Target Lock Surge 和条件式
  melee Damage。后续 Slice 234/235 通过这一 Seam 提交首把武器消费，规则不重复实现。

## 当前剩余分母

| Owner Slice | 当前 pending |
| ---: | ---: |
| 232 | 0 |
| 233 | 0 |
| 234 | 30 |
| 235 | 40 |
| 236 | 24 |
| 237 | 30 |
| 238 | 11 |
| 239 | 2 |
| 240 | 4 |
| 241 | 2 |
| 242 | 4 |

本片只证明能力注册与状态/特征执行；产品 Room 仍有 147 条后续 owner 债务。只有 Slice 243
可以声称 `252/252`，Standard 2000 完整对局仍由 Slices 244–250 验收。

## Harness / Agent 证据

- `harnessLoopUsed: true`；targetGames：StarCraft TMG。
- promptPackRoutes：未修改；本片修改的是 Rules/Tool contract。
- harnessToolsCalled：Ability Runtime 的 LegalSpace、Preview、Apply、Query、Lifecycle、
  Replay；无 Provider 工具调用。
- uiTraceEvidence：无；Web 用户旅程属于 Slice 245。
- agentDecisionEvidence：Agent 能看到规则拥有的资源支付集、目标集和精确 modifier
  projection；模型不能改写 Rules 结果。
- memoryTraceEvidence：新增权威 ability/lifecycle history，不改变同局 Agent 工作记忆。
- trainingTraceCandidates：无；全部输出保持 `trainingTruth:false`。
- rollbackOrDemotionRules：移除或降级显式 Adapter binding 会让相应 definition 回到
  pending；语义版本与 Adapter 决定兼容，内容 hash 只作 lineage。
- userVisibleChecks：状态/效果/marker 已进入权威 state，具体 Web 面板和完整用户操作在
  Slice 245 集中验收。

## 聚焦验证

唯一 causal gate 首轮通过（`1/3`），不再重跑。通过项：60 条确切来源编译、28 个语义族、
`105/147` 总账、Raptor Adrenal Overload 的 Biomass 支付、Preview→Apply→Replay，以及
IMPACT `+1` 和 Squadron 四英寸 Coherency 投影。没有新增测试文件，没有运行历史规则、
远程/近战、Web 或全量门。Provider 调用/token/费用为 `0 / 0 / ¥0`。
