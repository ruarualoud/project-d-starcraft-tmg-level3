# T27/S272 · P1/P3/P5：比较方向与历史事实消费合同

2026-10-23。本项是新 P0–P6 工作流的实际失败修复，不是完整 Teach 准出。T27 5/6、T23 33/36，剩余 S272/S248/S249/S250 四片；正式 Plan 0/6、对局 0/12。

## 实际问题与修正

B 原件 `b5412c95567c93fbd2835e2427e810670af2ecce9a38be099601ea877e459ad6`：

| 身份 | 对象/武器 | 原保存期望伤害 |
|---|---|---:|
| left/reference | marauder-2 → player2-hydralisk / Quad K12 | 2.5833333333333335 |
| right/candidate | goliath-1 → player2-hydralisk / Underbelly Machine Gun | 2.0555555555555554 |

工具问题是 **Goliath − Marauder 是否 > 0.5**，结果 −0.5277777777777781 / false 正确。模型及一次来源审核却把负差解释成第二 Marauder 不如 Goliath。这是接口的语义歧义暴露了模型解释错误，不是伤害原子算错，也不能把两方向任意改名后宣布策略通过。

一个共享的纯投影现在提供具名 subject/reference、目标/武器/原值/源指针、原问题与反向问题、实际差和严格阈值结论。新工具产物、当前视图、旧不可变视图的只读升级和所有来源事实投影共用它。未知保持 unknown；身份、量纲、原值/差值/谓词冲突返回 invalid_contract，不编造新结论。旧原件和模型原答复均未修改。

这不是“哪支单位更好”的自动策略判断。实际第二 Marauder 配置与实验宣称的 large/升级配置不一致，仍须由原流程解决；样本点估计不证明同条件、因果、统计显著性或整表优势。本例禁止直接晋升经验 Skill。

## 逐边检查发现的第二处接线遗漏

旧来源投影虽然仍是 v6，但结构保留版本已经是最新；角色组装器原只检查结构版本，因此可绕过新增的具名比较解释。实际保留 v6 原件的 literal/evidence 两条入口均复现。现在同时核对来源投影版本，从注册原件派生当前读视图，不改旧文件、不授已读或通过；已当前版本不重复注入。

## 验证（两项各一次红、一次绿，未重跑已通过门）

1. `scripts/debug-slice272-comparison-meaning-v903.mjs`
   - 原 B 原件复现缺少具名语义；修后 fresh/new view/old view/source facts 一致。
   - 实际 workflow 的 read_evidence 端口和冷恢复，规划/决策/审核消费一致；原 `/receipt/predicate` 逐值不变。
   - 两种运算方向、交换两侧、等值/恰好阈值、未知、身份/数值/单位/谓词冲突；无策略批准。
   - 证据：`build/slice272-comparison-meaning-v903-red.json`、`...-green.json`。
2. `scripts/debug-slice272-comparison-context-v903.mjs`
   - 实际旧 v6 别名没有获得新合同的接线复现；修后两种角色输入正确补齐，当前投影不重复，旧原件不变。
   - 证据：`build/slice272-comparison-context-v903-red.json`、`...-green.json`。

均为保存原件＋真实纯函数/核心读取接缝，0 Provider、0 Native 调用、0 生产写；不宣称真实模型已经理解，需后续生产消费证据。

## 本次文件

- `packages/roster-strategist/roster-measured-comparison-v1.mjs`：共享具名比较语义，生产回执接入。
- `packages/roster-strategist/roster-workflow-receipt-view-v1.mjs`：新旧视图同源只读解释。
- `packages/roster-strategist/roster-experiment-source-facts-v1.mjs`：来源投影 v7。
- `packages/roster-strategist/roster-workflow-read-context-v1.mjs`：旧事实版本消费升级。
- 上述两个具体失败探针；本报告、当前入口和根 TASKS 更新。

未提交、未删除、未刷新来源、未创建子代理、未改规则/军表/Plan/旧回复。

## 用户新增经验要求的实施边界

目前 `scenarioExperienceRef` 只指向 `roster_conditional_scenario_origin_v1`，保存问题、条件和版本来源；原生结果另在工作图。**这不等于具备独立、审核后可检索的经验 Skill。** 当前不存在对此新增要求的整体验收。

应沿同一原件补成：实验身份/条件及实际配置 → 被比较方案/指标/原生结果 → 公开结论（支持/反驳/不足）→ 来源与适用性审核 → 条件检索。记录必须区分声明条件和实际验证条件；版本失效可发现，不自动沿用；保存负结论和失败诊断但不当成有效策略。检索结果仅 advisory，不能改 Rules 或真实本局记忆。推理只记录公开理由，不记录隐含思维链。

### 后继合同检查与交付清单（仍属原 P0–P6，不新增 Ticket）

| 交接边 | 唯一负责模块/数据 | 必须核实 | 当前证据/缺口 |
|---|---|---|---|
| 模型答复 → 角色 | role-communication/read-role | 请求/角色/来源编号来自同次请求；格式错误与结果未知分开 | 既有统一模块；本轮未重测，不宣称全链通过 |
| 工作单 → Native | workflow-laboratory/state-reference | 源状态、参与者、工具语义、待选择与失败分开 | v902 实际场景完成；其他族按具体合同检查 |
| Native → 存储/查询 | workflow store/receipt-view | 原件不可变；查询和执行同源 | v903 比较及历史视图读取通过；不是全部工具认证 |
| 查询 → 解释/审核 | source-facts/read-context | 具名身份、量纲、方向、证明范围及版本一致 | v903 两处具体失败已修/定点验收 |
| 审核 → 决策/提交 | experiment-owner/joint draft | 来源通过不等于策略更好；必要未知不放行，A不改表，B表Plan原子联动 | 继续现产品审核，不人工改理由或清未知 |
| 结果 → 条件经验 | 同一已保存结果和最终审核引用 | 不能仅保存origin；实际配置/条件/结论/原件和未证边界完整 | **待实现并验证可恢复记录及索引** |
| 经验 → 写表/对局 | 共享 advisory 查询接口 | 明确适用性/版本依赖；未审/失效/错场景不得当已证经验 | **待接线；不能用日志可读冒充已完成** |

异常验证沿这些边覆盖正常、未知、错误、待选择、恢复五类。只为具体失败补相应探针；同一已通过门不重跑。不再用某个字段存在或几个局部门禁代替产品稳定性与策略优越性。

## 运行停点

源修改前 A8026/B8043 均已优雅 exit0；A事件5422/r3，B事件5202/r5，0 running/pending。A下一项是正常输入修复，B下一项是来源修订的引用纠正。原目录、费用、版本和回复保留。续行句柄另记当前入口；不重建房间或重演成功测量。
