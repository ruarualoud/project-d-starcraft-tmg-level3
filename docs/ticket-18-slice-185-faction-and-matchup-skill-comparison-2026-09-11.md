# Ticket 18 / Slice 185：势力与对抗 Skill 差异分析

日期：2026-09-11  
来源状态：沿用本开发批次冻结的官方来源绑定，没有刷新数据。  
结论等级：离线来源约束下的策略差异分析，不是完整对局胜率或最优策略证明。

## 1. 结论

Zerg Swarm 与 Kerrigan's Swarm 两份本族 Skill 存在显著、可执行的策略差异，而且关键差异主要由势力规则直接造成：起始槽位不同、合法池不同、势力卡能力不同，因此组军、空间机动、Creep 卡选择和能力资源保留顺序都不同。

但两份成品来自不同代的生成合同。Zerg Swarm 是旧式 8 个知识切片、53 条 recommendation；Kerrigan's Swarm 是新版 6 轴完整 Policy。篇幅、字段结构、风险声明密度和审查等级的差异不能归因于势力规则，也不能拿来判断哪个势力更强。

## 2. 官方规则硬差异

| 维度 | Zerg Swarm | Kerrigan's Swarm | 直接策略影响 |
| --- | --- | --- | --- |
| 标签 | `Zerg` | `Zerg` + `Kerrigan's Swarm` | 后者可合法使用带子势力标签的专属项 |
| 起始槽位 | Core 3 / Elite 1 / Hero 0 / Support 1 / Air 0 | Core 3 / Elite 2 / Hero 1 / Support 0 / Air 0 | 前者天然支持 Support、Hero 需解锁；后者天然支持 Hero 与更多 Elite、Support 需解锁 |
| 共同合法池 | 19 项 | 同一批 19 项 | 两者共享 Zerg 基础单位与卡，因此基础 Creep、Biomass、目标争夺逻辑应有重叠 |
| 额外合法项 | 无 | Kerrigan Swarm Raptor、Malignant Creep | 后者多一个专属 Elite 角色和一个冲锋导向 Creep 选项 |
| 势力能力 | Rapid Burrowing、Brood Instinct、Zerg Creep | Omega Network、Wild Mutation、Zerg Creep | 前者偏埋地/闪避防护；后者偏空间投送和 Creep 上的速度、精度增益 |

规则证据：

- `build/ticket-18-faction-evidence-v1/zerg_swarm.json`
- `build/ticket-18-extra-faction-v1/kerrigan_s_swarm-evidence.json`

两份证据的 Core、FAQ、Rules、Dataset 绑定一致，且都记录 `sourceRefreshPerformed=false`，所以比较没有混入一次新的数据拉取。

## 3. 两份 Zerg 本族 Skill 的策略差异

### 3.1 高置信度：由势力规则直接造成

1. **组军骨架不同**
   - Zerg Swarm 的 Hero 0 让 Kerrigan 必须依赖 Overlord 等解锁路径；Support 1 允许 Queen 直接竞争既有 Support 槽。
   - Kerrigan's Swarm 的 Hero 1 允许直接编入 Kerrigan，Elite 2 支持 Hydralisk small 或两个低占用 Elite；但 Support 0 让 Queen 必须先购买 Hatchery/Overseer 等补槽卡。

2. **空间计划不同**
   - Zerg Swarm Skill 围绕 Rapid Burrowing 的合法对象、任务标记控制代价和 Brood Instinct 的闪避反应窗口建立条件分支。
   - Kerrigan's Swarm Skill 围绕 Omega Worm 的合法落点、敌军 10 英寸排斥区、Omega 通道是否仍可兑现，以及 ON CREEP 条件是否成立建立分支。

3. **Creep 与进攻增益不同**
   - 两者都必须恰好选择一张 Creep Card，这是共同约束。
   - Kerrigan's Swarm 可以在 Accelerating Creep 与专属 Malignant Creep 间选择，并将 Wild Mutation 的 Speed/Precision 增益纳入动作计划；普通 Zerg Swarm 没有这一专属选择。

4. **能力卡机会成本不同**
   - Zerg Swarm 要在同一势力卡的 Rapid Burrowing、Brood Instinct 与资源保留之间比较窗口价值。
   - Kerrigan's Swarm 要判断 Omega Network、Wild Mutation 的前提能否兑现，同时为缺失的 Support 槽预留战术卡预算。

### 3.2 中等置信度：规则驱动，但尚缺完整对局证明

- Zerg Swarm 更偏“保存关键单位、埋地换生存、依赖反应窗口”；Kerrigan's Swarm 更偏“用 Omega Worm 改写入场空间、用 Creep 条件换机动/火力”。这是从能力文本和 Skill 分支推导出的合理战术侧重。
- 目前不能据此证明哪一套在特定任务或对手下胜率更高，也不能证明某一套固定卡包最优。Kerrigan's Swarm 本轮没有真实决策 case；两份 Skill 之间也没有完整对局 A/B。

### 3.3 不能归因于势力规则

| 观察到的差异 | 实际原因 |
| --- | --- |
| Zerg Swarm 为 8 个知识切片、53 条 recommendation；Kerrigan's Swarm 为 6 个 Policy | 生成合同版本不同 |
| Zerg Swarm 为 `offline_evaluated_advisory`，Kerrigan's Swarm 为 `offline_source_reviewed_advisory` | 两轮验证深度不同 |
| Kerrigan's Swarm 风险、查询、对手回应字段更规整 | 新版 Strategy Policy schema 的结构优势 |
| 两份文本长度和引用数不同（62 vs 98） | 生成颗粒度与来源展开方式不同，不代表势力复杂度或强度 |

## 4. Terran 对三个对手的对抗 Skill 差异

三份 Skill 共用五轴骨架：对手画像、开局分支、反制、资源交换、终局。差异集中在每个对手真正能改变局面的规则窗口。

| Terran 对手 | 对抗 Skill 的主要识别对象 | Terran 主要反制问题 |
| --- | --- | --- |
| Zerg Swarm | Rapid Burrowing、Brood Instinct、通用 Creep 与埋地单位 | 是否需要侦测/封锁；何时消耗单次反应窗口；是否能在对手埋地前兑现攻击或任务优势 |
| Daelaam | Shield、PE 资源、Force Field、Blink/Psionic Transfer 等 Protoss 位移与保护窗口 | 先确认 PE 与能力是否真实可用；保留回火/减伤窗口；避免把静态射程当作对手最终位置 |
| Kerrigan's Swarm | Omega Network、Omega 落点、ON CREEP、Wild Mutation、专属 Creep 选择 | 切断 ON CREEP 前提、封锁合法 Omega 落点、不要在对手节奏工具未公开时臆测固定打法 |

因此这三份不是仅替换阵营名：Zerg Swarm 对抗偏埋地与反应预算，Daelaam 对抗偏护盾/PE/位移能力，Kerrigan's Swarm 对抗偏 Creep 条件与空间投送。

## 5. 两个 Zerg 势力对 Terran 的对抗 Skill 差异

- **Zerg Swarm → Terran**：开局与反制围绕 Rapid Burrowing、Brood Instinct、通用 Creep 和 BM 卡牌机会成本；空间变化主要来自埋地/部署能力。
- **Kerrigan's Swarm → Terran**：在同一 Terran 威胁基础上，明确比较巩固任务标记与放置 Omega Worm，持续重算 10 英寸合法落点、ON CREEP 状态、Wild Mutation 与 Malignant Creep 的条件收益。
- 共同部分（Terran Tenacity、Terran 资源/反应窗口、任务计分与终局部署）来自相同对手与总规则，不应被误当作重复生成失败。

这组差异与本族 Skill 的差异一致，说明对抗生产确实把势力专属规则传递到了定向计划，而不是只使用种族标签。

## 6. 当前可用性判定

- 4 个新增定向对抗 Skill 已完成独立来源审核和 Rules 执行的 development/heldout 决策验证：8/8 case 均选中合法候选且满足预期偏好。
- 成品可用于后续 Harness 的候选排序、查询计划和条件分支；所有动作合法性仍必须由 Rules service 裁决。
- 这些成品仍是 `offline_candidate`，不是训练真值，也未证明完整对局策略效果。
- 下一阶段应在真实房间/自博弈记录中比较：合法动作率、任务净分、空间查询调用质量、对手回应后的改计划率，再决定 Skill 晋级或局部修订。

## 7. 本 Slice 成品

- 新增对抗：Terran→Daelaam、Daelaam→Terran、Terran→Kerrigan's Swarm、Kerrigan's Swarm→Terran。
- 便携包现含：总规则 1、本族 4、定向对抗 6。
- 定向清单装载检查通过：11/11 文件存在且 Skill hash 与清单一致，方向无重复；manifest hash `9d3253ca7decc775878a65f7cc33d2b02e0dc40c2a375b4d4417f0fed30d8209`。
- 本轮额外对抗生成与收口：63,199,798 tokens，约 ¥26.399260；未达到本周期首次 ¥100 通知阈值。
