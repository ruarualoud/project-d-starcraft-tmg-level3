# S272 v280–v282：重复证据、查询分支与原生骰果纠错

## 本轮结论

六组尚未最终准出，不把启动、局部修复或满分草稿当成完成。
本轮实际修复三类来源问题及其受控恢复边界；所有测试只用保存的真实失败，0真实模型/Native动作/新房间。

1. **E重复查询不被识别**：r18/r19请求完全相同，军表/来源/结果未变，只有空间回执的queryId及派生sourceReceiptHash/receiptHash不同。旧检测只比较回执hash，因此r17–r26持续重复。
   - 对已知只读空间回执，判别信息增量时忽略这三个交付身份字段，保留所有来源、父状态、分支、席位、版本及完整结果。
   - 不改写/重签原始证据，不把缺回执当成重复；来源或结果改变仍正常查询。
   - 沿用原自动输出纠错，不新建策略裁判或替模型选方案。
2. **A原生骰果输入缺修复说明**：模型把kind/faces/count/layout/revealOrder描述对象放入chanceReveals，而该字段要求具体骰面数组。旧运行时拒绝正确，但queryRepair缺失，保存失败也不能获得修复说明。
   - 把原有相同形状检查移入执行与旧回执投影共用的纯输入解析器；新失败和原失败均可获得同一源端说明。
   - 不代填骰面，不生成预期伤亡；骰数、点数范围、Precision和真实结算仍由原生规则器校验。
3. **E查询被无关占位字段误拦截**：真实r28–r30回复缺少纯查询不使用的空军表/空Plan或其他query分支字段，报笼统OUTPUT_INVALID，掩盖重复查询。
   - 解码按模型明确选择的query kind校验该分支必要字段；不补模型字段、不放宽实际参数要求。
   - 真正缺失参数时提供确切validationIssues路径；非query的写表/Plan合同不变。
   - 原始付费输出保留；它们仍然重复，结构能解析不代表允许再次执行。
4. **已明确修复后只追加一次**：正式流程原先在合同升级后可能重新允许三次无效回复。现在advanceAfterKnownInvalid若仍返回repair_needed立即保留停止状态；不重置原历史、军表、Plan或账目。
   - modelContextVersion15记录此次查询解码与证据信息判别修复；只在无pendingDecision的边界迁移。准备本身不启动模型、不接纳旧答案。
   - 同产品Run先尝试本地重验旧回复；不能复用才可按既有政策追加一次。有效新决策后才进入正常流程。

## 定点门禁

| 命令（都带原base参数） | RED与一次GREEN |
|---|---|
| `verify-slice272-query-evidence-identity-v280.mjs` | E r18/r19相同证据被当新结果 → 正确送已有纠错；来源变化/结果变化/缺回执三个反例仍正常查询 |
| `verify-slice272-native-outcome-recovery-v281.mjs` | A原始骰果输入未被共享合同识别 → 新输入及保存失败投影均可修复，原件不变 |
| 第一脚本 `compact_query` | E r28无关占位字段导致OUTPUT_INVALID → 正确识别原重复查询；真正缺argumentsJson给明确路径 |
| 第一脚本 `query_contract_recovery` | 正式prepare仍旧合同14 → 迁移15但继续requires_reconciliation，原表/Plan/迭代/回执/计费数不变 |
| 第一脚本 `corrected_contract_bound` | 追加一次失败仍active → requires_reconciliation，只有一个新失败记录 |

骰果门第一次修复后验证误把调查记录传给“已有纠错重试”的谓词，夹具阶段不符；删除该错误阶段假设，改验真实源端纠错合同与保留回执投影后通过。未重复任何已绿命令、无全量门禁。

## 真实运行及未完成部分

- v280真实E r27已识别重复，随后r28–r30三次结构错误停住。v282唯一追加request102到r31仍选择同一查询，已再次停止，未继续重试。保存的request102确认modelContextVersion15和unchangedQueryEvidence均已送入，不能归因为未加载新prompt。原回复已能解析，但语义没有推进；仍未准出，不能只增轮次。
- A最近调查确实新增Queen和Swarmling摆放候选，不能把全部长调查归咎重复编号；原生骰果、路径/完整队形证据仍需收口。
- B/C/E/F已见合法2000草稿，D仍1150/r6中间稿。A固定表Plan11。这些不是最终版本。
- 六组同版新PID：A50010/B50012/C50014/D50016/E50018/F50020；日志各组`resume-common-recovery-v282-20261017.log`。先核对真实PID和durable session，不因恢复耗时重启。
- 上述是启动PID，不表示六组当前都在运行：E已r31停止；F随后在r7/request56停止`ROSTER_TEACH_RETAINED_BRANCH_SOURCE_CHANGED`，未新增模型调用。A/B/C/D继续原调查/恢复。E累计102次调用、19,509,146 usage units（截至request102）；旧费用不清零，不凭当前牌价反算历史实付。
- F仍2000分，当前draftTeach标记failed。只读检查显示收集的保存分支均同source/runtime/builder、specHash也匹配原请求，尚未定位与当前实验室哪项不同；不能称为规则更新或直接绕过。手工拼接的初始工厂诊断遇到`MISSION_DEPLOYMENT_DRAFT_FACE_UP_ROWS_INVALID`，未到目标恢复边界、0模型/动作，不算复现或验收。下一步通过正式产品组合缝隙定位，不重复整套已绿测试。
- A/B目录仍fresh-generation-v264；C–F仍独立roster-plan-matrix-v274。未重建房间、未改冻结规则/地图/Skill、未刷新官方数据。
- T27 5/6，T23 33/36，剩余S272/S248/S249/S250=4，六组最终验收0/6，完整对局0/12。

## diff边界

- `iterative-roster-flash-model-port-v1.mjs`：来源绑定的证据内容比较、按query分支解码、字段级诊断。
- `pregame-scene-laboratory-v1.mjs`：骰果形状检查统一进入共享输入校验，无规则结算改动。
- `iterative-roster-plan-session-v1.mjs`：合同15、已修复后单次追加仍失败则停止。
- 两个具体失败脚本、CURRENT_WORK、根TASKS及本报告。

工作树已有历史改动，整文件git diff不能全部归入本轮。没有提交/推送、安装或删除记录。

## Harness记录

- harnessLoopUsed: true
- targetGames: starcraft-tmg
- promptPackRoutes: iterative_roster_decision / roster_teach_investigate / source_input_repair
- harnessToolsCalled: 保存的map_route、mission_marker_control、native_action输入校验及正式Run恢复入口
- uiTraceEvidence: 本轮无UI验收，不宣称端到端网页通过
- agentDecisionEvidence: E r18/r19/r27–r30；A q-timing-native-action-marine-c14-raptor-with-outcome
- memoryTraceEvidence: 原session、原迭代与回执保留；没有手工补Plan
- trainingTraceCandidates: 仅工程失败诊断；trainingTruth=false，不晋升Skill
- rollbackOrDemotionRules: 来源/结果差异误判、必要参数被补造、重启清历史或超额重试均阻止准出
- userVisibleChecks: 仍须六组真实Plan/Teach/来源审核闭环；当前0/6
