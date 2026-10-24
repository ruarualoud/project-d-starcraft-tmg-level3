# T27 / S272：来源审核表示与纠错交接 v824–v825

## 当前结论

这是新 P2/P5 流程的具体输入/恢复接缝修复，不是最终军表或策略验收。T27 5/6；T23 33/36；剩余关联 S272/S248/S249/S250 四片；最终 Plan 0/6、对局 0/12。正式 r4 的合法 2000 矿/170 气军表没有被修改。

## 本轮逐步记录

| 步骤 | 实际输入与操作 | 结论与边界 |
|---|---|---|
| 1：检查停点 | e7627，逐项失败审核 `73cfa542`、`d6b63fc9`；原 Native 1233/1242 | 两份候选原始回执均 completed；去重标记只存在于发送给模型的请求，不是测量结果 |
| 2：复现表示错误 | 实际请求 `d70efa849866a91ca185ca080b237c74535cd91c6bb3a7b97a859f9dd5d8cb48`，通过真实角色执行器截获发送边界 | RED：发送内容有 12 个跨来源传输引用对象，来源审核把它们解释成“未独立测量” |
| 3：修来源视图 | 仅来源审核使用 verbatim；将 Host 未审批/整态身份比较移出场景事实，保留原件位置、实际坐标比较、兼容性与未测量范围 | GREEN：真实新请求原值完整，原件不改；旧请求编码/原已发引用保持可恢复；0 模型/Native/生产写 |
| 4：复现恢复缺口 | e7627 的最新 v4 审核，使用原流程构造下一审核 | RED：旧恢复入口只识别比较合同变更，不能识别本次表示修复，返回 null |
| 5：修受控接续 | 用实际旧请求缺少表示版本这一证据，仅接续两条失败项；语义合同版本不变 | GREEN：四条通过项复用；在途拒绝；原请求/计数/结果保留；冷恢复幂等；生产断点不变 |
| 6：真实产品恢复 | 同一 `slice272-product-generation-v645-lqMWaS`，从 e7627 续行；PID 41724 | 已启动，待观察模型对原事实的正确解释及后续方法/战略交接；没有创建房间或改答案 |

完整请求/回复仍在同 Run 的 `workspace/decision-workflows/decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c/artifacts/`，未另做整库副本。

## 不能混为一谈的两类问题

工程表示问题：不同军表导致整态/runtime 标识不同，并不证明坐标、规则版本不同；请求压缩引用也不证明没有独立运行。现在来源审核读取独立完整原值。

真实证据边界：单武器条件期望不自动等于组合齐射或顺序伤亡；未测可选反应效果不自动为零。这两类必要缺口不能由本次修复代填。后续必须由方法/战略角色依据原目标决定有效局部测量或有依据的假设修订，再由原审核检验。

## 唯一对应门禁

- v824 RED：`build/slice272-v824-gate-1792578772914.json`。
- v824 GREEN：`build/slice272-v824-gate-1792578873362.json`，本轮仅读取结果，没有重跑。
- v825 RED：`build/slice272-v825-gate-1792579234667.json`。
- v825 GREEN：`build/slice272-v825-gate-1792579304987.json`。
- 真实恢复日志：`build/slice272-v825-live-1792579357177.log`。

## 代码差异范围

- `roster-source-review-presentation-v1.mjs`：新来源审核派生视图；明确独立原值与未测量范围。
- `roster-prompt-evidence-encoding-v1.mjs`、`roster-workflow-read-role-v1.mjs`、产品 `roster-planning-secure-deliberation-factory-v1.mjs`、`roster-decision-product-journey-v1.mjs`：实际发送、记录和引用解码使用同一编码选择；旧请求保持原编码。
- `roster-source-review-repair-handoff-v1.mjs`、`roster-workflow-experiment-owner-v1.mjs`、`roster-decision-workflow-v1.mjs`、产品 `roster-decision-workspace-run-v1.mjs`：识别实际旧输入缺陷，按独立表示版本恢复；不提高事实/语义合同版本来重买已通过审核。
- 两份 `verify-slice272-*-v824/v825.mjs`：仅具体故障的内存复现和对应一次修后验证。

原始模型回复、费用、未知费用与工作计数不清零；未提交 Git、未删除文件、未恢复旧 A–F/对局。

## 真实 v825 结果与 v826 独立重审修复

v825 实际请求 `5b6a65c4`、`9e6cf0b9` 已逐项核实 verbatim、表示版本 1、同坐标 true、无 Host 未审批标记。真实结构化假设审核 `c14ddfc289585df5ec68639f0954d71b124ef3a54035d107be3f6f6cc994b146` 转为 supported：能区分独立分武器测量与未测组合齐射/可选反应，后者不能据此变成零或全局优越。

但 prose claim 3 的新回复 `25dc79dff3ad02cc57bf0a59584b07c36a2db191cb03453ae1896d15768997b0` 逐字重复旧审核的错误几何理由。读取实际发送请求 `df57e380c0ab958abf10f5d58036e93d907dfe764b1532d227dda7d507c14bff` 后，发现 `priorQuestionJudgement` 自动注入整个旧否定正文，标为当前已读输入；模型本轮没有主动读取这份历史判断。原请求将旧回答作为模板的接缝并未被前一个原值修复消除。

41724 已在 e7671 安全退出，0 在途；父汇总仅完成读取，未放行。v825 共 5 次真实调用，259,718 units、Provider 用时 31.237 秒；这是这一段调用量，不是累计账或墙钟时间。

v826 将来源表示升级为独立的版本 2：

- 保留 `originalDataQuestions` 全部原问题，不删问题或替模型分类。
- 旧判断正文不再自动灌入；`priorReviewHistory` 保留原证据地址和历史属性，必要时可查。
- 所有明确请求的 Native 原件、当前断言、来源目录与 Host 原问题覆盖检查不变。
- 借已验证的恢复接缝只重接此一条失败项；刚通过的结构化假设及另外四条保持复用。

具体实际请求 RED：`build/slice272-v826-gate-1792579952719.json`；唯一 GREEN：`build/slice272-v826-gate-1792579993794.json`。0 Provider/Native/生产写。此修复只消除旧结论锚定，不保证新判断一定通过，也不把确实未测的组合伤亡伪装为已测。

51104 从同 Run/e7671 载版本 2，日志 `build/slice272-v826-live-1792580034395.log`。真实独立判断、必要方法/战略修订及最终 Plan 仍待完成。未恢复已通过门禁。

## v826 实际交接与模型自行修订（e7686–e7741）

1. 新请求 `00d11f88202ca79f0f0e66cebb8cd037e9c2c61b2b4cf1fe7db02f088cd160a2` 实际不含旧审核正文，保留原问题、历史地址和当前来源。
2. 独立判断 `cf02ca6c586311ff3efd75adad7980d544d81b3c4faf1a1e757553083e060f1d` 明确承认三组相同坐标/目标/阶段，不再因整态标识不同要求重测；原混合问题被模型据证回答。仍拒绝把分武器条件分布当成组合总伤亡，此限制正确。
3. 覆盖审核 `8e680e5d4b13ada88983d10ff05d4270c0fc3511b9ff563dd95ed8ee2fdd1f9b` 接受狭义比较，但 Host 没有因此覆盖未通过的逐项来源判断。e7702 按产品调度自动交回 `source-revision:review-v7:presentation-v2`。
4. 方法角色真实请求 `005d29dd794fb3b2e55d256df44b3591fc6070a65ed38a09e4dd7e4f1b77aa44`，回复 `853a695dd1950a060811d9e773f488421647994053e78187eaf78ef4994d2b4a`：主动读 1213/1233/1242 的 `/receipt`，没有要求重摆或重测。
5. 下一请求 `888f43c3b527840732567a0c2f947078b23eaa4bab3b035bafc9afb2e8000b85`，原回复 `87c5d9d58a63d3539272a4b7ff7cbe0ac27fdccfb29574818805d21fcc23ebed`：模型自己撤回总量优势，将原假设由 supported 改为 inconclusive；保留逐武器差异，并明确不能单凭本测量决定保留升级。没有人工补字段或改答案。
6. e7728 保存修订 `2e3005b53abcdc2ae624678c8d15b9128f7522fd8ef7ec7652241f47fc6f6a0a`。这段方法修订 2 calls、177,558 units、Provider 16.223 秒；无新 Native 测量。e7741 已进入修订文本的独立来源审核，尚未最终战略采纳。

这证明“审核发现过度结论 → 返回原责任角色 → 主动读取既有原件 → 自行修订”的实际链条，不证明原战略假设成立、最终 Plan 完成或对战效果提升。原必要战略比较仍须由责任角色处理，inconclusive 不能变成自动完成。

本轮遵循 harness 可观测与离线 Teach 技能：`harnessLoopUsed=true`；游戏 StarCraft；角色路由 `roster_workflow_final_review → roster_workflow_experiment_planner`；工具仅原件读取；同 Web/App 产品 HTTP 流程，未新增浏览器可用性验收；memory/Skill promotion 为零，`trainingTruth=false`。若后续又将未测结论提升为事实，拒绝晋升并保留原回复，不删除证据或手写策略答案。
