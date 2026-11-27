# 02 — 原子接线与工具升级的实施规范

适用于每个新增或修改的能力、FAQ条款、任务行为。路径均相对活动工作树。登记用于开发覆盖，不是新增在线审核角色或模型必须填写的证明。

## 1. “原子接好”到底证明什么

每条变化按下面链条登记实际位置：

~~~mermaid
flowchart TD
  S[冻结原文与字段] --> D[能力定义/任务定义]
  D --> A[复用原子或新增语义原子]
  A --> R[Kernel与Executor/Family Adapter]
  R --> C[正式Runtime Composition]
  C --> L[动作域/反应窗口/自动时序]
  L --> P[Host实例化与权威Preview]
  P --> X[Room Apply与事件提交]
  X --> N[下一动作/下一阶段/终局]
  X --> Q[同事实查询/概率/控制/路线]
  X --> V[持久化/冷恢复/回放/UI]
  Q --> B[写表/Teach/Plan/在线决策/副官/复盘]
~~~

**覆盖单位有三种，分别统计**：规则语义原子；产品定义绑定；产品入口。一个原子可被多个定义使用，一个定义也可组合多个原子。能力已出现在目录、模型读过文字或注册器报告数量相等，都不足以证明执行。

建议登记行（扩展 new-definition-inventory.json，不重复建多份状态）：

| 字段 | 填什么 |
|---|---|
| observationId / sourceRef | 本次原件定位；observationId仅本快照有效，不作新runtime身份 |
| semanticId / semanticVersion | 稳定能力／事实身份；02确定别名 |
| disposition | 复用、参数变化、新组合、新语义、明确展示；说明来源理由 |
| atomRefs | 真正读取／变更该条件的原子ID，未映射为未完成 |
| ownerModule / ownerExport | Kernel、executor或adapter真实路径与函数 |
| runtimeRegistration | compose函数及注册键，不只写owner模块名 |
| entryKind | action、reaction、automatic_consumer、system_lifecycle、display |
| queryConsumers / productConsumers | 具体函数与Web/Builder/Planner等入口 |
| effectsAndLifetime | 改哪些状态、支付、次数、到期与来源死亡规则 |
| evidenceRefs / uncovered | 实际保存的产品输入、回执、后态、下一步、冷恢复；未证明的边界 |

仅合法的规则解释／展示条款可标display。主动／被动／反应／生命周期能力不能因没有按钮就标display通过。

## 2. 从源码哪几处接

- 原子事实与计算：packages/rule-atoms/ 的对应 kernel/executor。先查既有逻辑，不从定义名称新写另一份公式。
- 定义编译：packages/source-data/official-ability-effect-ir-v1.mjs / createOfficialAbilityEffectIrCatalogueV1。
- 定义归属：packages/product-composition/official-current-product-ability-denominator-v1.mjs / createOfficialCurrentProductAbilityDenominatorV1。
- 组合与覆盖：同目录 official-current-product-action-runtime-composition-v1.mjs / composeOfficialCurrentProductActionRuntimeV1，official-current-product-ability-coverage-release-v1.mjs / createOfficialCurrentProductAbilityCoverageReleaseV1。
- 原有选表能力入口：official-selected-roster-ability-runtime-v1.mjs 的 enumerate / instantiate / preview / apply / modifiers / afterAction / cleanup；新通用实现优先归所属family，不能同时在两个adapter重复触发。
- 对局生命周期：official-current-product-match-runtime-v1.mjs / createOfficialCurrentProductMatchRuntimeV1；任务交给 packages/rule-atoms/official-mission-runtime-v2.mjs。
- 权威引擎：createStarcraftTmgAuthoritativeEngine；房间：createStarcraftTmgRoomRuntime。正式写入路径为 legalSpace → previewAction → confirmPreview（按既有确认策略）→ applyAction → replayRoom。

确认策略不改变规则：机器席位按产品授权自动确认合法动作，人类席位按UI处理自己的选择。新增能力不能要求用户每个AI动作再手工确认。

## 3. 四类能力分别如何验证

| 类型 | 必须经过的路径 | 关键断言 |
|---|---|---|
| 主动/武器 | 正式菜单→选择／实例化→preview→apply | 出现在正确阶段；目标、支付、实际损伤／位置／次数准确；后继可继续 |
| 反应 | 触发事件→反应窗口→选／放弃→父动作续行 | 正确玩家、一次窗口、支付一次、父动作保存并且不重掷／重执行 |
| 被动 | 条件前／中／后实际查询与动作 | 条件成立时生效，失效时撤销；叠加／替换有依据，非只显示标签 |
| 生命周期 | 阶段／回合边界或来源变化→结算→下一边界 | 延迟效果按时执行一次，去除正确对象，到期与持久化后相同 |

选择反例必须来自本项规则：不合法阶段、边缘越界、支付不足、来源已失效、目标资格冲突。不能只有“好路径能走”或只有“错误会被拒绝”。如果规则允许越界悬边等特例，采用明确来源条件，不把棋盘边界和高地悬边规则混成一个中心点测试。

## 4. 工具更新流程

每一项按一次闭合变更处理：

1. 读 packages/online-agent-session/spatial-query-contracts-v1.mjs 中现有能力与排除范围。已有queryKind能准确表达就扩其同版本兼容语义；改变结果含义时版本化，不另起同名计算器。
2. 写模型输入字段、Host绑定字段、Rules输出字段表；工具Schema、说明、投影、调用校验同源生成／复用。
3. 在 room-backed-spatial-rules-query-adapter-v1.mjs 和 spatial-action-query-runtime-v1.mjs 绑定当前房间发布、实体和动作域，调用同规则准备／计算函数。
4. 更新 readonly-query-kinds-v1.mjs、readonly-query-worker-v1.mjs、readonly-query-worker-batch-v1.mjs 的允许项、版本与反序列化；同步路径与worker路径语义等价。
5. 更新 spatial-query-prompt-projection-v1.mjs、spatial-query-receipt-contract-v1.mjs 以及实际live-flash-decision-port消费者；只投影模型需要的语义与句柄。
6. 写表端 pregame-scene-laboratory-v1.mjs、pregame-map-evidence-port-v1.mjs、army-builder-query-port-v1.mjs 复用同计算实现；候选实验必须标声明场景而非真实战史。
7. 贯穿首次请求、编辑、纠错、保存答恢复；若新增工具或字段未在某入口接线，登记缺口而不是放行该入口。
8. 通过实际产品调用到结果被父级／Planner接收，再冷恢复。只调用工具函数返回一个JSON不是完成。

## 5. 现有工具的正确作用范围

| 现有工具/契约 | Wave3需接入的事实 | 不能替它证明什么 |
|---|---|---|
| base_edge_distance / within_and_wholly_within | 新底座／token的真实几何 | 控制、LOS、合法移动 |
| contextual_supply_projection | 新单位、变形、增益与上下文 | 能控制点、未来伤亡 |
| mission_marker_control | 新任务、飞行/结构/状态资格、所有竞争者、候选后态 | 已授予VP或未来必达 |
| map.inspect / map.route_access | 新部署区、入口、底座、飞行和地形例外 | 采样没找到不等于不可达；路线见证不是当前完整动作 |
| space.solve_formation / legal_full_path_movement | 当前动作域、地形规则、全队底座和连续性 | 全局最优、所有骰子都会成功 |
| legal_asset_placement_options | 新炮台／墙／模板合法域 | 战略最佳位置或必然安全 |
| action_specific_threat | 实际武器、目标资格、移动／冲锋当前条件 | 必然伤害或对手必然回应 |
| attack_probability | 新防御、状态和武器组合，目标损失与Supply分布 | 反向承伤、自身存活、全激活串联 |
| ranged_activation_probability | 多武器批次后的实际幸存者、条件政策、采样方法 | 未覆盖反应或全局最优顺序 |
| fire_zone_exchange | 新武器/飞行/候选移动后的条件攻击 | 把各攻击独立期望相加当真实连射或自动反击 |

已有工具确实无法回答当前决策需要时，先提出最小接口扩展，例如“给定已授权延迟效果，预测其具名触发时点与覆盖对象”。它必须使用同生命周期准备函数，输出条件和未测部分；不把它扩成模型模拟整场对局。对应能力的必需工具尚未实现时，先关闭该范围的工程缺口再调用模型。

## 6. 查询与执行一致，如何比较

共同条件必须包括release、当前revision、双方可见性、单位/模型、配置/状态、地图、阶段、实际动作候选以及已选的支付/防守政策。

- 几何／合法性：query准备的同一候选必须能被权威preview接受；给Apply同样输入与状态。检查实际模型位置与范围判定，不能换成另一个“差不多”的候选。
- 随机行动：查询陈述条件概率或分布。比较合法性与实际用于掷骰的参数，不要求一次骰子结果等于期望。简单分支用独立枚举作为算术oracle；复杂采样声明种子／样本／容差，不伪装精确值。
- 计分：查询可给当前控制和条件预计分；真实得分只在任务规定阶段由同计分内核提交。分别检查第一回合、后续回合、特殊行动与终局。
- Query无写入：从同房间存储读执行前后revision、journal、资源、随机游标，确认查询不消耗资源／改变骰子／提交分数。仅比较显示projection不够。
- 过期：读查询期间另一席Apply，则原结果变历史／过期；重取当前域。不能重复支付、强行接受旧路线或从空结果自动pass。

结果状态要有可执行分流：成功、明确非法、缺参数、缺能力／来源、过期、有限搜索未找到、外部暂时故障；映射到现有状态合同再扩最少字段。来源已知的缺能力是工程待补；策略尚未验证是条件未知，两者不要混用一个unknown。

## 7. 两个实际接线范例

### 调价：Marine小规模160→170

旧release查询/旧表仍160；新release170。人工Builder与AI菜单同170，完整军表合法性用新总价；旧表导入产生副本而非修改原表。成本相关Teach／Skill章节待重估，但未变化的射击原子与武器语义不变。验证同记录、两release、两入口和保存后冷读；无需重测全部战斗。

### 新能力：Raven生成Auto-Turret

按本次冻结原件，基础未带折扣场景在移动阶段使用对应能力：选择合法摆放→Host绑定Raven与支付→Rules设置友方炮台→Room提交→对手后续激活可能触发炮台反应→回合末到期。

一张验收卡检查：

- 使用正确底座，目标区域与敌方接战限制由同几何函数判断；资料不足则缺件，不用默认32mm。
- 基础消耗从冻结资料编译；另列Corvid等费用修正分支，不把基础成本写死为所有情况。
- 生成实体保留来源、所属方、能力继承、唯一ID和到期记录；UI、Agent查询、回放都看见同一对象。
- 炮台没有普通激活不等于其反应不可用；根据正式触发打开正确反应窗口，放弃和执行两分支恢复父动作。
- 按结构规则计算人口／控制，回合末清理一次；关闭进程再打开，生成、支付、反应和到期不重复。

断言取自本次原件及规则审计，具名场景只覆盖其条件。不能以这个例子替代Raven其它能力或所有结构单位的验收。

## 8. 性能与模型策略边界

事实缓存与worker并行不改变候选集合、武器组合或模型可读的范围。缓存复用由release/revision/查询条件控制，不能因名称相同返回旧数据。性能病例复用历史相关类别，受影响的中位/长尾/短请求各按类型选一组；不另跑所有历史实验。

工程提供合法选项和实际收益分布，不给内置“冲锋扣分”“远离敌人加分”等战略排名。模型仍可选保守或进攻；记录公开理由，复盘评价选择。新机制显著拉长某查询时，分清CPU计算／模型请求／排队／恢复，改算法前保持能力完整。
