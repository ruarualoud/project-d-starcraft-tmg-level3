# T23 / S248：统一合同修复与地图验收结论保留

## 交付与边界

按用户“合同都按照统一标准更新”实施四个接缝的统一修复。
T23 **33/36**，T27 **5/6**；开放 Slice **248、272、249、250**。
新12组启动2/12、终局0/12。ABC仍在用户要求的共同暂停点，本次没有正式续跑。
这不是重新生成地图、全面原子规则复验，也不是宣布完整对局已通过。

本次共修改10个生产文件、新增2个共享生产模块、2个具体故障复现脚本。
审核、地图/预算、查询回执三个定点门最终均exit0。已绿门不重跑。
实际Provider调用0，原Room写入0，新增费用0；无代理/K3、全量构建、性能重测或提交。

## 九张地图为什么保留通过

实际保留的官方选定配置验收记录为9/9，先前六张没有重跑，含庙台的三张通过实际
Client Domain→HTTP→原生Room→SQLite→Web动作与自动Replay验收；并非只看静态图片。
这是已选任务/规模/布局的通过，不代表所有任务、所有规模以及全部经典图集通过。
两张优先经典图已有独立记录；其余十八张仍按原优先级推后。

证据：

- `../../ticket-24-semantic-map-integration/docs/ticket-24-official-premade-maps-electronic-conversion-2026-10-06.md`
- `../../ticket-24-semantic-map-integration/build/official-native-temple-web-k1qyXi/temple-three-selected-recipe-acceptance.json`

本次只读取这些原记录，没有再跑其已通过的地图门禁。可编辑电子属性仍明确标注
电子桌面约定，不能当成官方逐件数值。

## 同一个事实，只采用同一种解释

| 接缝 | 原问题 | 统一后的生产合同 |
| --- | --- | --- |
| 来源审核→欠账/纠错/阶段/准入（High） | 已验证反证把High降为Medium，但若干消费者仍读取原始High | 共用`effectiveRosterFinalPlanReviewFindingsV1`；原付费记录不改，原严重度可见，只有既有有效仲裁改变有效严重度 |
| 冻结地图→公开摘要→Plan准入（High） | 地图已按必要连通性通过，入口却要求每种底盘都可进场 | 共用`competitive-map-admission-contract-v1`；双方可进场、必要目标可达、双方连通均按至少一种当前底盘；全底盘通行仅为诊断 |
| 所选规模→Agent表准入（Medium） | 入口写死2000分，500分合法精确预算也拒绝 | 所选预算、军表预算、实际消费必须相等；2000目标花1870仍不能完成，不降低满预算要求 |
| 工具回复→Planner事实（Medium） | 只看hash外观，不在接收边界确认是否同一查询/当前状态 | 共用轻量回执合同；比较查询类型、可用requestId、Room/席位/版本/状态/LegalSpace绑定；错配回复不作为模型证据 |

### 审核

公开投影、自动纠错、三轮停止、阶段与High计数、历史欠账和策略修订请求都读取
同一个有效严重度。保留原`review.findings`及既有仲裁验证器，不手工把付费审核改成绿。
Critical不能被此机制降级；Medium继续记录但不触发High修复。
未替换或未完成覆盖复审的历史欠账仍保留，审核未再次提到不等于已解决。
旧审核的版本陈旧检查也保留，严重度统一不等于强行批准陈旧计划。

### 地图

Standard与Skirmish工厂、公共Viewer投影、Plan启动准入共用一份摘要政策。
新摘要携带明确的政策与三条必要事实；`everyEntrySegmentUsable`继续公开，但不再
在语义地图入口作为全底盘硬条件。原冻结几何/任务审核的hash和房间不可修改规则保留。

旧房可由其已有、hash匹配的原冻结记录投影出新摘要，不修改存储中的Room、状态hash
或地图。已公开的摘要再次投影保持相同结构；未持有原冻结的旧通用通过摘要可读，
旧false/unknown摘要不能凭空推断为通过。缺少事实不伪造；不增加地图重生成要求。

### 回执

接收边界只比较少量标识与状态字段，不再扫描1804行几何或追加签名门。
原生缓存回执没有requestId是正常合同，不能要求补字段导致所有缓存失效；若有该字段
则必须与请求相同。`exact`、`advisory_estimate`、`unknown`保持各自含义。
錯配回复隔离并产生带原因的`QUERY_RESULT_REJECTED`警告，不能成为当前模型事实，
也不因此重发未知付费请求。合法Host-deferred工具保留既有非权威延后通道。
最终动作合法性仍由Rules→LegalSpace→Preview→Apply→Receipt→Replay决定。

## 具体故障验证（没有全量回归）

1. **有效严重度**：保留的真实历史计划和来源审核，3条原High已通过来源仲裁、
   unresolvedHigh=0、欠账0；真实workspace读取此前仍报blockingHigh=true，RED exit1。
   统一消费者后一次GREEN exit0，blockingHigh=false；原3条High仍未改，0保存/0规则或
   Provider调用。这份历史审核仍stale=true，所以不把本例宣称为当前Room全链准入成功。
2. **地图/预算**：真实生产准入判据此前语义地图与精确500预算均false，RED exit1。
   修复后两者true；错误绑定、必要连通性false、1870/2000、预算错配仍拒绝。
   追加相关公共投影断言时发现生产摘要有两个undefined键，第一次GREEN未完成；
   只从摘要生产端去掉undefined键，再跑尚未通过的这一门一次，最终exit0。
   原状态/地形/hash未改、私有冻结不泄露、二次投影相同，generic旧模式仍可用。
   先前内联复现有一回正则夹具SyntaxError，保留但不当成生产RED证据。
3. **回执错配**：通过实际Live decision port、假Provider停在诊断点；有有效hash的
   不同queryKind回复此前进入模型事实，RED exit1。修复后一次GREEN exit0，错类型和
   陈旧stateHash均隔离。匹配的缓存回复、unknown/advisory均允许，各权威字段错配与
   错requestId拒绝。没有真实Provider调用或原Room操作。

命令均用批准的原生Node（shell:false）；只为上述具体bug新增复现，不重跑已有绿门。
复现脚本：`scripts/verify-ticket-27-map-budget-admission-contract-v1.mjs`、
`scripts/verify-ticket-23-mismatched-query-receipt-v1.mjs`。严重度用原保留计划的内联复现。
相关工厂/journey/产品/策略/Live模块随对应门加载；没有另开无关导入或构建循环。

## 最终diff摘要

- `packages/roster-strategist/roster-final-plan-review-v1.mjs`：唯一有效严重度投影。
- `packages/roster-strategist/roster-claim-repair-backlog-v1.mjs`：历史欠账使用同一投影。
- `packages/roster-strategist/roster-strategist-runtime-v1.mjs`：修订目标挑战同一严重度。
- `packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs`：投影/准入
  标记读取有效结果，原记录保留，并公开effectiveFindings。
- `packages/roster-planning-workspace/agent-selected-roster-journey-v1.mjs`：阶段、计数、
  纠错和三轮停止一致，不清空旧轮次。
- 新`packages/client-domain/competitive-map-admission-contract-v1.mjs`：唯一地图摘要政策。
- `packages/client-domain/viewer-projection-v3.mjs`：原房只读适配、投影形状稳定。
- `packages/product-composition/official-standard-room-factory-v1.mjs`、
  `official-skirmish-500-room-factory-v1.mjs`：不再分别手写地图摘要。
- `packages/product-composition/roster-planning-product-module-v1.mjs`：同一地图政策与精确
  所选预算准入，不取消原地图/Plan绑定。
- 新`packages/online-agent-session/spatial-query-receipt-contract-v1.mjs`：轻量查询关联检查。
- `packages/online-agent-session/live-flash-decision-port-v1.mjs`：一次接收检查与原因警告。
- 两个具体故障复现脚本及本报告；根TASKS/MEMORY、当前交接入口同步更新。

## 共同版本与后续交付物

下一次ABC共同使用`s248-unified-contract-v2-20261010`工作树。
生产清单1103项（1101个packages模块+两个正式Web运行脚本），aggregate SHA
`a630b135626b2d65f0e46792e2afee37eefdd5011cfd49bdcd46c9ad664a3592`。
这是来源记录，不是每动作hash门、兼容旧产物的额外门或新的加密要求。
私有证据：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`
内`common-code-contract-recovery-v2.private.json`、`contract-boundary-bug-validation-v2.private.json`。
旧v1文件保留。

1. A：真实模型修订剩余2High，交付修订后的可读固定表Plan与最终来源审核。
   原三轮审核已用完；没有清空或偷偷执行第四轮，追加复审需按既有收敛规则处理。
2. C：新版合同本地重验已付Planner，交付该原草稿的实际恢复结果；本次未伪造其完整
   上下文来冒充恢复通过。
3. B：原房权威r8/8提交，而Web记录r7/7；交付第8步Receipt/截图补录，不能重做动作。
4. 同一工作树按原房/地图/Rules/Skill继续ABC，交付完整对局与回合计时/截图；A/B/C
   差异仅预定军表/Plan条件，不因本次修改重建B/C或再跑性能基线。

停点及累计费用不变：A未开局，B第1回合Movement r8，C同阶段r7；累计
A¥96.904048/B¥144.798322/C¥127.640253，各¥200分账，未知预留和原打开预算上限保留。

Harness：harnessLoopUsed=true；targetGames=StarCraft TMG；routes=fact_probe_prompt/
harness_optimizer_prompt；source=retained actual reviews/map acceptance + concrete receive/admission
repro；tools=shared projection/severity/authority seams；UI新验证=无；memory=原局不修改；
trainingTruth=false；回退条件=军表/schedule/VP/地形/冻结源事实发生非预期变化。
