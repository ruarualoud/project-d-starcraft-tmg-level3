# T27 / S272：条件经验产品检索与交接合同检查

日期：2026-10-23。所属 P1/P3/P4/P5/P6，施工主线仍为 P0–P6。

## 本轮交付

已有条件经验过去只能由 Run 内部查询，产品 HTTP 没有读取入口。实际复现 GET 返回 404 后，补齐：

`GET /starcraft-tmg-level3/roster-planning/v1/workflows/:id/conditional-experiences?q=关键词`

数据流：产品 HTTP → 同一个 Decision Journey → 同一个 Run 的 `conditionalExperiences` → 已存观察／已审结论。

- `experiences.entries`：原始条件观察，保留声明条件与实际请求／结果的区别。
- `experiences.conclusions`：已通过既有来源与条件比较审核的局部结论，保留条件、原观察、作者取舍及审核引用。
- 不重新实验、不调用模型、不改军表、Plan 或房间，不新增一套发布判定。
- `sourceBindingsMatchCurrent=false` 明示依赖不匹配；检索成功不代表允许跨规则／地图／军表套用。
- 此入口不发布 Skill。已审候选仍须适用性及 held-out 验证，才可接入对局 advisory Skill；这项后续接线尚未完成。
- `q` 是目录关键词检索，不是语义匹配，也不是逐几何条件的适用性求解。

## 对应验证——只跑本次门

脚本：`scripts/debug-slice272-experience-product-read-v915.mjs`。

1. **RED**：真实 HTTP Adapter 对已存经验读取返回 404。
2. 修改两个生产文件后 **一次 GREEN**：同 HTTP→Journey→Run 查询交接保持记录身份；观察与结论分开；非法查询／作业身份拒绝；不存在写入或晋级路由；冷读取和规则变化标记保留。

证据：[RED](../build/slice272-experience-product-read-v915-red.json)、[GREEN](../build/slice272-experience-product-read-v915-green.json)。

夹具用真实保存的观察，已审结论是明确标注的注入数据；复用真实查询函数。产品 Run 为只读接口替身，不启动 Native／Provider。**0 新模型调用、0 Native、0 生产状态写入；不能把这项验证当成真实策略审核通过或浏览器验收。**旧通过测试未重跑。

## 本轮逐边核对

下表区分代码约束、实际生效证据与剩余问题。不把“有字段”当作“模型正确理解”，也不声称已穷尽所有异常。

| 交接边 | 单一事实／状态来源 | 已核对的行为 | 仍未关闭 |
|---|---|---|---|
| 角色输入→当前配置 | `projectRosterWorkflowRoleSourceInputsV1`、保存的 Native Builder summary 和 candidateInput | 当前编成与历史 Plan 意图分开；B 已实际收到 small／Kinetic Foam | 历史错误论述仍可能干扰理解；尚未证明简化输入后策略无损，不盲目删来源 |
| 原件／局部读取→来源解释 | 共用 read-context，v913 比较方向投影 | 原始比较和视图同方向，不改旧原件 | 正确送达不保证第一次解释正确 |
| 实验意图→Native 场景 | participant configuration 检查，实际 candidate context | B6257 预期 large＋双升级而实际 small＋单升级，执行前返回 `ROSTER_EXPERIMENT_PARTICIPANT_CONFIGURATION_MISMATCH`；`executed=false/nativeSuccess=false` | 新的正确 candidate context 尚未完成该比较；不能拿旧小编成结果替代 |
| 动作能力→当前合法菜单 | 实际 `inspect.actionSpace.actionAvailability` | A1033/1034 给出 `SELECTED_MELEE_CHARGE_REQUIRES_UNENGAGED`，汇总及后继准确读到 | A 新几何仍同原已接战状态，生存轴未测；工具说明正确≠实验完成 |
| 局部结论→原问题覆盖 | `assessRosterExperimentConclusionV1` | B 较窄的 answered 被覆盖审核退回，未宣布原大编成假设完成 | 仍需真实补测或有依据的作者处置；不能静默降低问题标准 |
| 分项来源审核→总审核 | `assessRosterSourceClaimReviewV1` | 逐项结果、绑定、引用和 checkId 一致才聚合；原子失败不能由父级覆盖通过来豁免 | 本轮为代码核对及现有真实案例，不代表全部 source shape 重新验收 |
| 必要事实／选择→战略负责人 | 原实验 owner 与 strategy frontier | B 的真实 `strategy_required` 保留缺口，战略角色授权补测，没有手填表或测量 | r6 仍有旧 purpose 解释，未证明最终修订／批准 |
| Plan-only 提交→冻结实验 | v914 同一核心 `reconcile_plan_revision_handoffs` | 已从真实提交恢复原问题 owner；不同事实版本、在途请求等不能沿此边复用 | 该边恢复运行不授予 Plan 正确性 |
| 原观察→已审经验 | v912 沿用 cycle 及来源／比较／作者判定 | 待审和必要未知不会归档为已审结论，原观察可保留 | 实际 A/B 尚无已审条件结论；不生成假“成功经验” |
| 已存经验→产品读取 | 本轮 v915 两层薄适配，原 Run 查询不变 | RED→一次 GREEN；无额外模型、版本重写或发布判定 | 正式 Skill 适用性／held-out／对局检索及 UI 展示待接入 |

这些证据支持“具体错误能够被正确拒绝并交回”，**尚不支持“所有合同均无错误”或“整条 Teach 已稳定收敛”**。下一步继续追踪上述拒绝后的实际纠正结果，而不是再次运行已通过的局部门禁。

## A/B 实际推进（本轮观察点）

仍为原目录、原 PID A13462/B13469；未重建房间、未清账、未因只读接口改动中断正在执行的模型任务。

### B：纠正了测量身份，尚未完成正确替代臂

- `5a15493a…`：事实角色最终明确 862 是 small／Kinetic Foam，原指定 large／双升级没有测到；返回 `strategy_required`。
- `b1817028…`：战略角色授权一次有界补测，军表与 Plan 未改，其他未解问题保留。
- `67321974…`：新工作单明确填写 intended participantConfigurations，但未绑定新的候选 context。
- `e869a500…`／原始失败 `1cc30125…`（事件6257）：配置检查在 Native 执行前拒绝，并同时给出 expected、actual、differences 和候选上下文修法。
- `070e29f7…`（事件6270）：模型已自主改为先建 candidate_context；该回复又进入工作单纠错，不能称已实际测量或通过。

### A：诊断传递正确，生存测量仍未执行

- 新场景与旧场景同状态，不算新的成功生存实验。
- `682c6e8f…` 明确读到 Raptor 已接战导致不能冲锋，没有把无法执行当作零伤害。
- `ed716c7f…` 覆盖审核仍要求实际生存结果。
- `af188d99…`（事件6331）正在读取场景／菜单，准备纠正为合法未接战冲锋位置，尚未提交新的成功测量。

实际档案快照：A6339 有 **106 条条件观察、0 条已审条件结论**；B6272 有 **13 条条件观察、0 条已审条件结论**。观察数不是成功实验数或 Skill 数。

追加状态：A6354 仍在只读准备，没有新生存测量；B6291 已返回父问题汇总。B 的 `d499a66e…` 明确记录：局部 scene 修复角色无 `candidate_context` 方法权限，因此不擅自扩权，也不声称工具不存在，而是将原提案交回上级授权。候选上下文**尚未创建**。这是一个实际控制回交，能否由上级正确接续仍待观察。两进程均存活，未发生本轮新系统终止。

## 进度与剩余交付

- T27：5/6；T23：33/36。剩余 S272／S248／S249／S250，共4片。
- 正式 Plan 0/6；新实验对局0/12；本轮不增加正式通过数。
- P1/P3/P5：继续验证配置纠正、场景纠正、来源审核和战略回交的实际闭环。
- P4/P6：只有符合原条件的有效结论才存入已审层；随后完成适用性／held-out 与 Skill 检索接线。
- 最终仍需有效军表＋Plan、中文完整逐步报告和约定对局；本文件是施工证据，不替代最终交付。
