# T27/S272 P1/P3/P5：产品交接同源与原生拒绝分型 v910–911

## 对应新流程验收失败

本轮继续 P0–P6 主线，不恢复旧大上下文调查。v909 已补原生动作资格信息，但实际 A 产品启动仍因 `ROSTER_WORKFLOW_CONFIGURATION_RECONSIDERATION_INVALID` 停在事件5973/r3。这不是模型请求失败，也不是语义审核轮数耗尽。

B 的两条实际大编制第二 Marauder 候选失败分别为 `1c28f4cb…` / `e5241aa1…`，Native 都返回 `ARMY_SLOT_CAPACITY_EXCEEDED:Core`。构造正确的大编制候选尚未成功，不能用旧小编制概率代替，也不能把这两个拒绝算作两次格式幻觉。

## v910：生成与校验使用同一个完整产品合同

诊断时排列了三种可能：产品额外拼接、持久化字段差异、通知生成/校验间状态变化。实际产品入口复现第一种：`reconsiderParticipantConfiguration` 先调用纯来源投影，再追加当前 `tools`、`requirements`；核心只按未追加的投影生成预期。v909 的裸核心门不能覆盖这层真实产品拼接，因此不能据它宣称产品恢复已通过。

修复没有退回字段白名单或跳过完整校验。产品现在只有一个 `projectReconsideration`，同时负责来源通知和当前工具/准出上下文；生产入队与核心校验调用同一个构造器。核心默认构造器仍供无额外上下文的隔离调用，实际产品显式注入产品构造器。

证据：`scripts/debug-slice272-product-handoff-v910.mjs` 从实际 A 冻结状态进入真实 `createRosterDecisionWorkspaceRunV1`，隔离存储中排除无关 Native 历史重建，不执行或修改原源。RED 复现实际错误；修改后一次 GREEN，3项：

- 实际产品核心仍拒绝被修改的工具描述/准出数据；
- 真实产品通知完整输入正确入队，当前工具/要求未被省略；
- 冷恢复保留同一负责人、同一输入，不再次通知。

`build/slice272-product-handoff-v910-red.json`、`...-green.json`。0 Provider、0 Native、0生产写。v909已通过的门未重跑。本门证明实际产品接线，不证明后续模型结论。

## v911：合法性否定不是输入格式错误

已有 `projectRosterCandidateFailureV1` 能区分 `rules_rejection`、`input_addressing`、`capability_or_execution`，但实际工具实例 `projectRepair` 的 candidate_context 提前返回分支覆盖了这一分类。新错误的 `reject` 又直接创建通用输入反馈。因此“已有分类器”不等于真实调用链已使用。

已将通用候选输入反馈归到共享分类函数，在真实原生拒绝之后才使用；删掉实例上的重复提前返回。候选上下文源头拒绝也调用同一个分类器。原始 Native audit、候选和问题保持，不自动换卡/单位或手改 Plan。

| 实际结果 | 谁继续处理 | 证据边界 |
|---|---|---|
| Native 明确候选非法 | 返回实验/战略负责人选择不同候选，或据证结束此方法 | 精确候选合法性已回答；战斗未测，不能用别的配置结果顶替 |
| 输入寻址字段错误 | 原方法按来源字段纠正 | 尚无合法性或战斗结论 |
| 服务/能力返回未知 | 返回明确工程/能力阻塞 | unknown 不等于非法或合法，不靠改军表掩盖 |

新工具失败落盘与后继条件文字明确说明“合法性已回答、无战斗结果”；复用旧失败时只重派生当前反馈，原记录不改。

证据：`scripts/debug-slice272-candidate-outcome-v911.mjs` 用两份 B 原件在真实实例和实际 role-source-input seam 复现 RED。后修验证前两项通过，新执行夹具漏了工作单 `bindings` 字段；改用实际完整工作单，只补尚未通过两项，未重跑前两项。共4项：两份实际失败分类/原生回执原值到达角色；新执行与保存失败同分类；注入输入错误/unknown不误作合法性否定。

`build/slice272-candidate-outcome-v911-red.json`、`...-green.json`（前两项）、`...-final.json`（后两项）。新执行用捕获的 Native audit 返回值测试传递，不重算官方军表算法；0真实Provider/Native、0生产写，非法候选没有建立私有场景。

## 运行恢复与尚未完成

修复前 A61662 已自然退出；B61669 收到定点 TERM，在事件5653/r5、0在途安全退出。之后同原目录同版 A75529/B75536 启动：

- A：`build/slice272-product-generation-v645-hsxEYu`，日志 `build/slice272-v910-v911-contract-fixed-1792702571170.log`。
- B：`build/slice272-product-generation-v645-8aBuEV`，日志 `build/slice272-v910-v911-contract-editable-1792702571172.log`。

不重建房间、不重置费用、不重放成功查询、不手写模型答复。实际模型对原生诊断/候选拒绝的消费与最终原问题闭环仍待；不要据入队或上述7项门禁宣布完成。

条件观察仍需最终假设结论、适用性/失效条件审核与对局 advisory 检索；现有保存记录不是已准出的策略Skill。后续同源合同比较/来源审核还须观察自然语言方向是否正确，不因单字段结构正确放行策略主张。

T27 5/6、T23 33/36；余 S272/S248/S249/S250 四片；正式Plan 0/6、对局0/12。没有提交、删除、安装、新代理、官方数据刷新。

## 修改文件和Harness记录

生产：`roster-decision-workflow-v1.mjs` 与 `roster-decision-workspace-run-v1.mjs` 共用完整通知构造；`roster-workflow-candidate-context-v1.mjs` 与 `roster-workflow-laboratory-v1.mjs` 共用失败分类。两个debug脚本只针对上述具体失败。更新CURRENT_WORK、TASKS和耐久合同知识。

harnessLoopUsed:true；targetGames:StarCraft TMG；promptPackRoutes:策略作者/事实实验/来源读取现有角色；harnessToolsCalled:候选上下文与恢复入队的隔离接线（真实Provider/Native 0）；uiTraceEvidence:本轮无UI验收；agentDecisionEvidence:原A/B实际付费结果保留，后续实际采用待核；memoryTraceEvidence:原条件观察不晋升；trainingTraceCandidates:无；rollbackOrDemotionRules:完整输入不一致或合法性结果被误当战斗结果仍拒绝发布；userVisibleChecks:只按最终实际Plan及可读报告验收，不以本门代替。
