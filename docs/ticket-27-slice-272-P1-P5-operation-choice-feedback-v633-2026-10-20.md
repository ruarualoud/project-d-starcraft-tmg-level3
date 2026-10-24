# P1／P5：实验操作互斥与可执行纠错反馈

T27 / S272，2026-10-20。属于新流程实际三轮停点，不是旧调查恢复。

## 真实停点

实际 1238、1241、1245 的战斗事实角色均提交：`action=finish`、非空待执行 `workOrders`，同时包含 `conclusion.status=strategy_required`。这把“执行下一实验”和“现在回交总体策略”混成一次操作。产品应拒绝混合，但旧反馈仅有 `experiment_conclusion_requires_conclude_action` 错误码；作者连续三轮没有修改。

三轮后产品实际停为 `needs_repair`／`ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED`，原进程 99957 终止，旧回复、调用、未知项和费用保留。没有无界增加次数。

## 修改内容

- 共享实验输出合同明确：`finish` 保留必要实验、`conclusion=null`；`conclude` 回答／阻塞／回交问题、`workOrders=[]`。部分已知事实和待选策略仍保存在公开理由／未知清单中，不能为格式而删掉。
- 纠错反馈同时提供冲突字段 `/conclusion`、实际操作／结论状态、两种合法下一操作及具体改法。新错误产生和旧停点的下一请求均使用同一反馈，原 paid reply 不改。
- 产品客户端新增极窄的 `--resume-operation-choice <workId>`：只接受这个已完成但三轮失败的混合输出；用已有产品 `resumeRoleCorrection` 追加一次作者修订，不复验旧错误原文凑通过，同一 v633 修复不能重复追加。

Host 不替模型选择继续实验还是回交；并未允许混合操作，也未将未解事实批准。

## 一条具体门禁的三次结果

`scripts/verify-slice272-experiment-operation-feedback-v633.mjs`，0 Provider／0 Native／0 主生产写：

1. RED：真实 1245 停点的下一产品请求无冲突字段，只有错误码。
2. 本次代码首次验证失败：现有 Provider Schema 子集不允许 nullable `anyOf` 外层同时放 description。这是新增描述位置的工程错误，不是模型／网络问题。
3. 仅把描述移到现有子集支持的分支字段后，一次 GREEN；未重跑 P2/v631、v632 或其它已通过门禁。

GREEN 验证旧停点与新校验错误均有具体反馈，原输出／未知未被 Host 改写，混合操作仍被拒绝。

## 实际恢复及待验收范围

PID 7736、日志 `build/slice272-live-product-review-v633.log`，同 Run `build/slice272-projection-owner-v565-inlKbk`、r8，使用原产品客户端及上述一次恢复参数。按照用户已有“具体修复后可追加一次”授权，不重开军表／房间、不清旧计数或费用。

**实际 1247 恢复成功**：作者自行选择 `finish`／保留 `r8-combat-coverage`／`conclusion=null`，两条原未知均保留。产品工作实际为 `evidence_ready`，`correction=null`；记录 `completedCorrectionRecoveries`（`historyReset:false`），验证回复 `46e878da95ae7fedb765235a5d521300884602f3e3e5b3896efc4394c2c7292d`，恢复正常独立纠错限 3。没有 Host 修改 paid 回复，没有第二次追加。来源：`1247.request.json`、`1247.reply.json` 及产品工作断点。

这证明该停点作者修订／产品接受闭环成立，不证明工作单后续 Native 实验成功或全 Plan 已收敛。实际 1248 还由地图修复角色根据已读原件取消不存在的 deploy 选择，改成 inspect／控制查询，并保留到达与路线未知；这同样不能充当进场成功证据。

费用补记至 1246：主 Run 61,839,366 Tokens，可计价估算 USD 10.729276104；项目已知 168,516,296 Tokens（含隔离 P2 对照）。1229–1246 新增 1,693,618 Tokens／USD 0.174109260。原 830,187 Tokens 未计价及历史未知费用保留；1247 以后未含，不按估算当账单。

1241 已真实收到 v632 的事实准备窗口并提交实验而非继续读，但同时触发既有重复读取回交逻辑且输出混合无效；不能把它单独宣称为新窗口因果收益或成功 Native 实验。

若追加仍失败，保留该有界停点并报告，不再自动重试。完整策略证明、Teach 收口、P6 正式产物仍未通过。正式 Plan 0/6，对局 0/12；相关余 4 Slice，T27 5/6，T23 33/36。

## 原产品后续实际工具轨迹（至 1263）

- 1247 的战斗场景和 inspect 已实际返回；随后火力查询返回 `PREGAME_LAB_HYPOTHETICAL_FORMATION_NOT_FOUND`，原因是所选锚点不能形成完整队形。产品保留失败分支并转位置选择，没有伪造攻击期望或把 unknown 当 0。
- 1254 作者自行选择四个 `anchorRegions`，不是 Host 代选位置。四个真实 `space.solve_static_formation` 结果依次为 Goliath 3、Marine 1、Medic 0、Queen 3 个候选。Goliath 回执明确 `agentSuppliedAnchorRegions=true`、`hostExpandedModelChosenRegions=true`，25 个指定网格点已评估。全部仍标记 `noLegalFormationProven=false`、`arrivalOrMovementLegalityProven=false`。
- 候选可通过原工具记录精确取得：`review-resolution:r8:combat_and_losses:order0:exchange-coverage:input-repair:order0:solve-{goliath,marine,medic,queen}`。这是区域查询的真实采用证明；不是完整组合摆放／进场／火力实验成功。Medic 0 候选只证明本有限区域未找到，不能说全局无解。
- 1252 的地图事实汇总保留“当前只有 Goliath 的能力／结束激活域、五标记均未控制”的范围；1258 将原分支未回答的进场／路线问题明确回交，没有宣布整个游戏不能部署。原生初始化与选择先手这条平行链已取得包含全部九个部署域的实际 inspect；1253 明确尚未解决并应用新部署。
- 1256 的下一工作单仍错误绑定 `selection.fromStepId`；产品执行前报告选择来源错误并自动建工作单修复角色，未执行错误动作。此时仍走产品自动纠错，没有人工修改模型工作单。
- 1260 的中间方法回交明确尚未得到火力估计，不可用静态候选替换原 threat_exchange 的成功结果。后续必须完成候选选择／修复场景和实际火力查询。

本观察会话曾因长期保留多个完整工作流对象达到 4GiB 堆上限而退出；独立生成 PID7736 未因此退出或重发。读取会话已重建，改为短作用域读取、计费事件流式扫描。此事件是观察侧故障，不冒充产品自动恢复证明。

截至 1263：主 Run 62,998,892 Tokens，可计价估 USD 10.887764742；项目已知 169,675,822 Tokens。1247–1263 新增 1,159,526 Tokens／USD 0.158488638；旧 830,187 未计价 Tokens／未知费用保留，1264 以后未计。正式产物计数不变。
