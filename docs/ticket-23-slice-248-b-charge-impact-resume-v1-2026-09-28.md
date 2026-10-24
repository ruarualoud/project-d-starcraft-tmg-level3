# Ticket 23 / Slice 248 — B 冲锋冲击结算恢复

日期：2026-09-28。B 是**不同军表的带计划对局**，不是与 A 同军表、仅改变预赛计划的因果对照。

## 具体故障与修复

B 原房间在第 3 回合 Assault、r62 的 Kerrigan Swarm Raptor 冲锋后待决结算处停止。权威预览报 `PROPOSAL_INVALID: Cannot read properties of undefined (reading 'impactHitModifier')`，随后相同预览重试被阻断，最终 `BOT_PREVIEW_DID_NOT_CONVERGE`（High）。没有把重复失败当成合法动作。

`resolve_charge` 动作携带 `chargeResolutionPlan`，不携带原宣告动作的 `chargePlan`；原代码在成功冲锋触发冲击时读 `action.chargePlan.impactHitModifier`。原宣告计划实际封存在 Rules 的 `resolve_charge_after_roll` 待决状态中。现从该已验证的 `current.chargePlan` 读取一次命中修正，供冲击待决状态的命中修正和有效阈值共同使用。未更改模型 Prompt、Skill、地图或骰子。

## 一次聚焦真实验证

旧 B 进程退出后，使用原 `--resume-directory` 启动一次；未重建房间。原 r62 的 `resolve_charge` 被接受为动作 62，权威后态 r63；Apply 回执 `f07734e28a9668ad10b68a344325c225e061091cd6049ffd595e5ee1dc4a69c2`，`replayMatchesCurrent=true`，本次修复验证未新增 Provider 调用。截图：[r63 冲锋结算后的 Web 战桌](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d/screenshots/0395-r063-player2-resolve_charge-applied.png)。这只证明该故障点通过，不证明整局完成或策略优越。

截至 13:00 UTC 的分账快照：B 原房间冻结基线 ¥43.187439；分叉前累计 ¥49.137530，B v2 分支估费 ¥39.996130，故本窗口 B 增量估费 **¥45.946221**。A、C、D 不并入 B，四条线各自在新增 ¥100 时单独通知；这些数是估算，不代替供应商账单。

## Harness 留证边界

- `harnessLoopUsed`: true；`targetGames`: StarCraft TMG；`promptPackRoutes`: B 双席 `selfplay_agent_prompt`，本次没有修改 Prompt。
- `harnessToolsCalled`: 原房间 LegalSpace → Preview → Apply → Replay；`uiTraceEvidence`: 上述 r63 Web 截图。
- `agentDecisionEvidence`: B 动作 62 的公开意图、权威回执与 Replay；`memoryTraceEvidence`: 本次未验证记忆输入。
- `trainingTraceCandidates`: false；该版本化开发分支尚非生产/训练真值。
- `rollbackOrDemotionRules`: 若后续相同状态预览再次报错或 Replay 不一致，保持 B 非生产并停在最后合法回执；不自动改骰子或重复提交。
- `userVisibleChecks`: 截图中 r63 战桌可见；不能据此宣称地图美术对应的全部地形具有 Rules 权威。

## r63 强制冲击分配与权威预览恢复

r63 只有一名被冲锋目标 Goliath，五个合格 Raptor 模型各有固定 2 枚冲击骰。此前模型的 12 次付费回复反复写 `impactDice` 而非合同字段 `dice`，最终 `SELECTED_MELEE_IMPACT_ALLOCATION_INVALID`；本次仅对**唯一目标且每模型骰数已由 Rules 固定**的域采用确定性 Host 分配，多目标仍由 Agent 选择。多目标域同时明确向 Agent 展示 `modelId`／`targetUnitId`／`dice` 的字段合同。修复后的原 B 房重放没有新增模型调用。

之后同一 r63 又暴露两层工程错误。首先冲击与近战的 `chance.count` 没有匹配的权威 `chance.layout`，故预览报 `CHANCE_SPEC_INVALID`；现按每目标命中／护甲／闪避（近战另含 surge）骰数构造同一布局。其次冲击计划中的 `targetProfileHash` 在该官方资料下为 `undefined`：规则器原动作带该键，权威预览的 JSON 复制删掉它，严格动作比较错误地报 `SELECTED_MELEE_ACTION_STALE`。只读 r63 差分证明直接 Rules Apply 通过动作身份检查、JSON 复制后失败；仅在资料实际提供此值时才输出该键，未放宽过期检查。相同差分在修复后 JSON 往返严格相等，权威 Preview 成功。聚焦脚本为 `scripts/diagnose-ticket-23-slice-248-impact-action-stale-v1.mjs`；失败／修复验证均未产生 Provider 费用或修改房间。

随后原 B 房只续**一个**动作：`resolve_impact` Apply 到 r64，回执 `529260a21c9d027db2d3bbe6b3c25ccb616aa6e95653cd1e517565f8819e8b21`，`replayMatchesCurrent=true`，仍为第 3 回合 Assault、player2。Web 截图：[冲击结算后的战桌](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d/screenshots/0428-r064-player2-resolve_impact-applied.png)；[完整棋盘](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d/screenshots/0429-r064-player2-resolve_impact-complete-board-applied.png)。检查点 `build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d/checkpoint.json` 记 63 动作／r64／203 Provider calls；本次定向续跑新增 0 calls。B 单独计费窗口按原房基线 ¥43.187439、分叉前 ¥49.137530、分叉内 ¥41.237282，累计新增估费 **¥47.187373**；A/C/D 不并账。仍须继续同房后续动作与整局；本记录不将 deterministic Host 结算当作模型策略证据，也不标记训练真值。

## r64→r68 同房续跑与新 High

沿同一 B Room 继续至第 3 回合 Assault、动作 67／r68。最近一个合法动作是 Kerrigan 对 Goliath 1 宣告 Charge，回执 `546f1d1e81be360f6f869e68293060b27e48aaedf43864e1c`、Replay 一致。下一步 `resolve_charge_after_roll` 只有一个结算域，掷 1 后最大移动 8 寸；底座边距约 7.071 寸，因此不能以 `distance_shortfall` 伪造失败。模型要求 Host 搜索合法队形，有限候选搜索报告 `RULES_QUERY_NO_LEGAL_FORMATION_OPTION`，程序按 `LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE` High 停止，**没有 Apply r68**。

只读连续落点覆盖器对这一冻结局面返回 `allPosesExcluded=false`、`continuous_round_domain_unresolved`：261 个检查单元里仍有 1 个未排除单元、16 个待细分单元。这与“没有找到有限搜索候选”不是同一命题；目前不能证明冲锋必败，也不能在无合法位置时擅自判成功。下一步仅针对这个 r68 结算域定位未排除几何区域、搜索权威合法路径或取得保守全域不可行证明，然后从原 Room 恢复。B 独立窗口此时新增估费 **¥50.962620**，未到其自己的 ¥100 阈值；C 的新窗口仍独立为 ¥0。

## r68 完整路径证明候选

原 v2 终点覆盖剩下的窄区域约为 `(35983.862,23233.327)` milli-inch。它几乎同时贴着 8 寸移动边界和友方 Raptor 底座：终点可放并不意味着**移动路径**可走。对整数落点的只读扫描找到了少量不重叠终点；从凯瑞甘 `(41000,17000)` 直达这些终点会扫过 Raptor，围绕单枚 Raptor 的数值最短路约 8.37 寸。这些扫描只是定位问题，不单独作为失败证明。

新增独立版本的 Rules 候选 `official-charge-round-path-infeasibility-proof-v1.mjs`：枚举精确整数 milli-inch 落点的保守矩形覆盖，允许规则器路径取整与 1 milli-inch 余量；对每格用目标接敌范围、实物底座重叠和**绕单个圆底座的最短连续路径下界**排除。路径下界忽略其他模型、地形、队形与支撑要求，因而只能扩大可能合法的集合，不会凭空制造失败。底座几乎相切的单个整数点用精确平方距离比较，不把浮点保守余量误当可行证据。该纯函数不会更改冻结 v2 的规则身份。

冻结 B r68 定向门确认 743 个单元全排除：终点与占位底座重叠 196、直接超移动距离 16、超目标接敌范围 9、绕占位底座路径过长 151；移除六个挡路 Raptor 的反事实返回 `allIntegerEndpointsExcluded=false`。新的 `official-current-product-match-runtime-v5.mjs` 在原 v2 运行时之上显式增补此证书，不修改旧 descriptor；只读真局面 `enumerate→instantiate→apply` 获得规则所有的 `resolve_charge` 失败动作，凯瑞甘坐标不变，事件 `charge_failed`。聚焦验证 `scripts/verify-ticket-23-slice-248-round-charge-path-v1.mjs` 一次完成，`0` Provider／`0` Room mutation。v5 非生产、训练真值关闭。实际持久 Room 分叉及 Preview→Confirm→Apply→Replay 正在单独验证，未完成前不能把 B r68 High 标为解决。

持久分叉现已通过：源 B v2 房保留 r68、68 个原回执及原 MatchBinding，目标新房 `20260927061507239-Bjkc7d-QA3VXs` 明确标注 `charge_round_path_v5`，从该冻结状态开始，LegalSpace→Preview→Confirm→Apply 后为目标 r1，规则事件 `charge_failed`，原凯瑞甘位置不变，目标 Replay 一致。目标 MatchBinding `8bbb2b17…e74556d7`、规则运行时 `1f3754d3…ecbb81960`；[分叉回执](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d-QA3VXs/fork-receipt.json)。脚本验收耗时约十分钟，主要为源房回放与目标房校验；这条性能债不影响结论，但后续应避免每动作重建。此步 0 Provider 调用，旧 r68 High 只在**新规则分支**有可执行结算，源房没有被静默修补。新房后续 Agent 行动及整局仍待继续，仍非生产或训练真值。

## 新房 r1：凯瑞甘跳跃突袭位置参数 High

目标新房的赛前快照读取最初错误地查了直接父目录，实际上快照保存在分叉祖先目录；修正为按分叉祖先解析后，房间可以加载。第一次真实 Web/Agent 续动停在 `LIVE_DECISION_PARAMETERIZED_PROPOSAL_DID_NOT_CONVERGE`，没有新 Apply。曾怀疑是 v5 强制失败域未被确定性动作分类器识别；确实补了类型化分类并以已接受的失败回执聚焦通过，但**这不是 r1 当前 High 的根因**。之后一次真实续动仍停在 r1，不能将分类修复冒充续局成功。

保存的真实决策记录表明模型选择了凯瑞甘 `Leaping Strike`，计划向 marker 2 调位，同时预设敌方火力；但 Action 四次回传的是 `placements:{modelIds:[...],maxDistanceMilliInches:6000}`——把参数域的说明对象当作实际落点。Rules 需要包含每个模型 `modelId,xMilliInches,yMilliInches` 的**数组**，故精确返回 `SELECTED_ABILITY_PLACE_MODEL_DENOMINATOR_INVALID`。旧 Host 空间求解器没有识别 `use_active_ability/self_place`，只让模型在错误的格式提示里重试。

现只针对 `effectContract.targetKind=self_place` 把主动技能接入现有位置意图→Rules 实例化→多选项流程；模型仍决定战术意图与最终落点，不注入固定 marker 或坐标。新增保存 r1 的只读故障复现：旧代码先以 `LEGAL_FORMATION_ACTION_TYPE_UNSUPPORTED` 失败；修复后同一命令产生 4 个带完整模型落点的 Rules 合法选项，0 Provider、0 Room mutation。此处只证明候选生成，真实 Web→Agent→Apply→Replay 续动仍待结果。B 此时独立新增估费 **¥52.270119**；A/C/D 独立，C 新窗口仍 ¥0。

## r1→r2 真实续动与策略反例

真实 Web 恢复随后完成一次模型动作：凯瑞甘 `use_active_ability / Leaping Strike`，Host 提供 `space.solve_formation` 精确收据，Agent 选择一个完整落点，权威 Apply 至 r2、Replay 一致。回执 `1dbda7e27dfc8f8ac899f99149ac8c634ce59e5246bda2e94188a60d1c57f2ff`；[r2 完整战桌截图](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d-QA3VXs/screenshots/0016-r002-player2-use_active_ability-complete-board-applied.png)；[单动作检查点](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d-QA3VXs/checkpoint.json)。这证明新能力的前端／Agent／规则器接线可执行，不证明策略正确或整局完成。B 独立新增估费更新至 **¥52.496568**，新动作仅 1 次模型调用；C 仍独立 ¥0。

关键反例：该房 r1 断点保存的 Planner 结果生成于自放置能力纳入空间意图合同**之前**，`formationSearchRequest=null`。恢复时 Host 把缺失意图默认为 `balanced`，给出 `(35000,17000)`；模型在 Action 阶段选中它，却错误声称这点位于 marker 2 的 3 寸控制环。权威地图中 marker 2 中心是 `(42000,12000)`，该落点不仅不在 3 寸环内，反而比原位 `(41000,17000)` 更远；凯瑞甘的 Assault 激活也在此动作后标为已使用，计划中“随后 Energy Blast”的同回合设想不成立。这个合法动作必须作为**低策略反例**，不能计入高策略对局质量通过。

针对旧决策恢复补了失效保护：凡空间动作的保存 Planner 缺少 `tacticalPurpose` 或加权 `formationObjectives`，Host 回到 Planning、丢弃该候选旧空间查询缓存，不再静默均衡摆放。保存 r1 的针对性检查先红后绿、0 Provider／0 Room mutation。已接受 r2 是不可逆权威历史；若要从 r1 做高策略对照，需显式创建另一个 v5 开发分支，不能改写此房回执。新鲜 Planner 是否给出正确控制目标、模型是否兑现计分与是否误信同回合二次射击，留给后续同局面版本化对照与 S249 策略复盘验证；此修复本身不虚称已经改善策略。

## Harness 留证更新

- `harnessLoopUsed`: true；`targetGames`: StarCraft TMG；`promptPackRoutes`: 双席 `selfplay_agent_prompt`，未改动 Prompt Pack 或 Skill。
- `harnessToolsCalled`: `space.solve_formation`、`instantiate_parameterized_action`、真实 Room Apply/Replay；`uiTraceEvidence`: 上述 r2 战桌与动作前截图。
- `agentDecisionEvidence`: Planner 的 marker-2 意图、Action 选中均衡落点及相互矛盾的公开理由、权威后态；`memoryTraceEvidence`: 失败冲锋进入续局计划，但尚未证明下一动作的记忆校准。
- `trainingTraceCandidates`: false；该 r2 仅保留为非生产负面复盘样本。
- `rollbackOrDemotionRules`: 不回写源 v2 或已接受 r2；下一次高策略对照须新建显式 v5 分支，从同一冻结 r68/r1 来源重新 Planning。
- `userVisibleChecks`: r2 Web 截图可见凯瑞甘已移动；落点不在目标控制环是权威坐标核对结论，不以模型措辞为真值。

## 第二个 v5 分支：空间与支付独立选择的真实对照

从同一冻结 B v2 r68 显式建立新的 v5 开发房 `20260927061507239-Bjkc7d-Zj4Cax`；源房与先前 `QA3VXs` 房均未改写。分叉在目标 r1 重做 `charge_failed` 的 LegalSpace→Preview→Confirm→Apply→Replay，目标绑定 `c211534d…b24d6b2`，Replay 一致，新增 Provider ¥0。

保存 r1 的只读诊断揭示前一个落点问题之外的真实候选饥饿：`Leaping Strike` 支付域有 **62** 组合法卡牌组合，原求解器先把每个落点乘以全部支付组合；4 个选项上限都被相同落点的不同付款占用。现把空间选项与支付选项分开：空间候选用一组合法代表付款进行 Rules 实例化，公开 5 组无多余耗卡的支付方案；Agent 独立选择付款，Host 对照完整 62 组 Rules 域验合法，再把实际付款与选定坐标重新精确实例化。该修改未改变任何卡牌成本或空间规则。定向真局面诊断先红，修复后一次通过：4 个不同落点全部进入 marker 2 的 3 寸控制环；另一个合法付款与所选落点的组合可精确实例化，伪造卡号拒绝；0 Provider／0 Room mutation。诊断脚本 `scripts/diagnose-ticket-23-slice-248-self-place-objective-options-v1.mjs`。首个修后运行只因测试断言错误地匹配异常 message（实际 code 正确）而红，修正断言后通过；不把它算产品失败。

真实 Web/Agent 在新房 r1→r2 限定执行一个动作：凯瑞甘 `Leaping Strike` 选 `(41000,13000)`，到底盘边缘 marker 2 的距离为 **0**，付 `faction:player2` 一张卡的 1 BM；权威回执 `ce97ad28…d49e65`，Replay 一致。[动作前全图](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d-Zj4Cax/screenshots/0003-r001-room-next-agent-decision-complete-board-before.png)、[动作后全图](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d-Zj4Cax/screenshots/0006-r002-player2-use_active_ability-complete-board-applied.png)、[单动作检查点](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260927061507239-Bjkc7d-Zj4Cax/checkpoint.json)。Planner 的目标是 marker 2 控制（权重 5）、避开威胁（3）、保留 marker 3 路线（2）；它承认 Goliath 当前火力暴露，并把 Energy Blast 置于**下回合条件计划**，没有复现前一分支的同回合误用。动作耗 10 次模型调用、1,521,791 input／26,335 output、估费 ¥1.952561，耗时仍高；`attack_probability` 和 `fire_zone_exchange` 均 0 次，模型明确标注伤亡概率未知。marker 2 在动作前已经由 player2 控制，新增一个 Supply-1 单位的实际边际 VP 与暴露交换尚未证明，故这是**工程接线通过、策略仅部分改善**，不是高策略整局验收或训练真值。

费用分别记：A 新增估费 ¥10.425727；B 的旧窗口已含先前分支 ¥52.496568，加本分支 ¥1.952561，合计新增 **¥54.449129**；C 自 `2026-09-28T17:44:12Z` 单独重置后新增 ¥0；D 不变。分支运行器的 B 值只继承单一祖先，未计另一兄弟分支，人工总账按实际已付兄弟分支求和，不清除原始付费记录。各线各自新增 ¥100 才提醒。

Harness：`harnessLoopUsed=true`；`targetGames=[starcraft-tmg]`；`promptPackRoutes=[selfplay_agent_prompt]`；`harnessToolsCalled=[space.solve_formation, Rules instantiate, Room Apply, Replay]`；`uiTraceEvidence=前后 Web 全图`；`agentDecisionEvidence=目标/付款/落点/公开理由/回执`；`memoryTraceEvidence=失败冲锋被本轮计划引用`；`trainingTraceCandidates=false`；`rollbackOrDemotionRules=保持两分支独立且非生产，未证明边际 VP/伤亡前不晋升策略`；`userVisibleChecks=r2 marker 接触、付款与 Replay 可逐项核对`。
