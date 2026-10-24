# P1/P3/P5：动作域修复的父状态继承（v963）

T27/S272；T27 5/6、T23 33/36、余4片。正式Plan0/6、新局0/12。这里只证明具体状态交接修复，不是完整生成或策略改善。

## 实际发现

原B8aBuEV r21，原位移Native结果 `e2663191836829e1988a50acfef82f04196d12358017394c91c150dbf3084f6d` 正确拒绝 `RELOCATION_PATH_EXCEEDS_DISTANCE`。模型随后自行改用 `space.solve_formation`，经过局部增量纠错修好嵌套JSON和候选引用；完整两步被保存并入队，未人工补参数。

| 步骤 | 实际输出与结果 |
|---|---|
| 选求解器 | 请求`c9900359cbfaba605e0e6a6544ea11c1fed10972592a5f5d9ff94be90e9c0b3e`→回复`b0b0be1693a2bfb270a91b35a581d0df92383d5f3843ba51300fbfecc1ebefd5`；113902units/Provider13.063秒；嵌套argumentsJson类型错误，未执行 |
| 改查询编码 | `31d4b0148bf6089df52da605b2c08d1b9e62a55aeaedd47b870bd44625495f04`→`eba22d5ba8454ada1be3d3bde0335c598c0a7bce9b5f3cce1473f960340ae5b6`；98309units/7.345秒；查询修好，候选引用仍错 |
| 改候选引用 | `a8150645ed1502d5f87ab65b1d608826a7497320c038f2968bc103fe68bda1bb`→`adf522d44b3d323402d598dcd01d5c2c608fd3545df68f3fccbd067d15189bfb`；98473units/8.054秒；仍混合两种来源 |
| 保留查询、只改选择步骤 | `1861ed3eb154a07fce7c86f1e14a83fc62018853f117a7684b2b2785c0c31015`→`4d3c2490c2eb9b1a8b7819237582480695bd3d8188384c4ce35f488d31e34b2d`；98331units/7.949秒；两步编译入队，实际选择仍须观察候选 |
| 实际查询 | `7c1ec6dc403e5b11be8df49e9969aa8dd771bad7fe5428bf0e89a2bc9ab079c3`：`CURRENT_ACTION_QUERY_DOMAIN_UNKNOWN`。不是不可达：请求遗漏父状态，实际查询用了初始`adabe1…`，而原动作域来自已部署后`30ff27…` |

这些调用仍不是策略进步；前三类是模型参数错误。最后一类有工程根因：委派场景投影只读模型原始submittedArguments.stateRef，但Native选择器的父状态实际由已保存菜单绑定在inputBindings里。模型未重复抄写状态时，修复用的前置查询回落初始场景。

## 统一修复边界

- `roster-workflow-state-reference-v1.mjs`：沿真实repair/choice边读取已解析的`/selection`绑定，保留完整stateRef、所选domainId及回执来源。失败动作可证明输入身份，但不能证明动作成功。
- 同动作域的`space.solve_formation`/`legal_formation_options`只读前置查询缺省父状态时，从唯一已选绑定继承；不是按自然语言或单位名猜场景。没有来源则不猜；域不一致或来源冲突明确退回。
- `roster-workflow-laboratory-v1.mjs`：实际工具调用处接同一绑定函数，保留submittedArguments原文及inputBindings记录。
- `roster-workflow-graph-v1.mjs`：给修复角色说明相同的继承合同。显式stateRef/context/base依旧不被静默替换；不自动选队形、改坐标或重放成功动作。

## 单步验证

`scripts/verify-slice272-domain-parent-v963.mjs` 使用真实工作图、真实请求与原Native失败回执，仅注入Native端口检查路由，不造合法队形结论。

- RED PID68108：真实执行器送到查询端口的base为undefined，复现丢父状态。
- GREEN PID68912（一次）：送入原`30ff27…`分支、原域/锚点逐值不变、原始参数未改、绑定来源可追溯；显式父状态保持、无来源不猜、不同域/歧义拒绝。0真实Provider/Native/生产写；旧门未跑。

## 恢复

59691优雅退出前，模型已排入另一域的`solve-formation-corrected-domain`，不能因为队列已创建就认定修复正确。保留该请求，交新的同域约束判定，不人工改成原域。

确认event10633/r21、59691退出且0运行/在途后，同B产品PID69382恢复；log `build/slice272-v963-domain-parent-1792768823231.log`。下一观察模型按实际父状态/域纠正后能否得到候选、真实执行并续接原inspect。最终Plan、策略改善及整链自动收敛仍未验收。

## v963真实结果与v964读取交接修复

同一原B队列实际推进到了event10677/r21。没有新建场景或重放部署。

1. 旧队列选错域被新合同拒绝：`aae587aadf2802fc4c54668bcf79fde070297ac3b2d70f26179c196c9fd1de8d`。没有替模型改域或执行查询。
2. 模型自行恢复原域和完整父状态：请求`af85856d5df0d8b7f4e9992d6519b415f15e733b7a052f01fd3a8133fe95a560`→回复`3d6a90b85a4036544e13ae12bb35cd2e5768fabe87c8f495536b86b85db4b9ad`→方法`1743f3b042a09d7fb95527ab341dedd05ed4fdece7f10da893de11c232918b39`。104309units，Provider11.556秒。
3. `504e93fe164d97c463e25f73b8bf9e32c674b7c1dea41543557e9b3dab87b7b2`实际查询原`30ff27…`父态，resultStatus=ok，返回4个完整9模型队形。原solver经replacement结算到`c07c9efa17ba7ce111b8d7ead24288f46639fae4b8ecf23624484c14b3dbc1da`，原select-formation接续，不丢尾部。
4. 四个队形均未进入marker1控制范围。第一候选最近底盘距离11700 milli-inch、eligibleToContest=false；合法队形不是到达/控点/最终策略已证明。
5. 新真实缺口：模型选择角色反复要求读取formationOptions。读取结果`afcee572e4b4bfaa7f7d6fb8e569783471bf384085e1fa7363c7c2e5413a20cf`保存完整4候选，数组70034字符；运输层按既有规则要求读取子项，但Native小命令过滤器丢弃了`fetched_source_read_navigation`。因此送给模型的是空exact_read_results，且没有下一子项地址。不是工具没算出结果，也不是模型拒绝已看到的候选。

### v964修复与定点证明

P1/P2/P5的具体失败门：读取记录已保留，但下一角色请求必须包含真实交付内容或其未交付导航，不能把“已存”当成“模型已看”。

- `roster-native-choice-command-v1.mjs`保留分块导航、先前已交付事实及对应原生/来源补充；不改变模型选择、候选和原始回执。
- `roster-workflow-read-role-v1.mjs`对旧小命令漏导航、且已耗尽窗口的精确停点，登记一次来源交接恢复。新窗口仍有界，旧调用/错误/次数/读取全部保留；同作用域冷恢复不重复续额。没有隐式重新计算、事实准出或自动选择。
- `verify-slice272-choice-read-handoff-v964.mjs`采用真实角色执行器和上述真实断点。首次观察接口1秒超时，未获得测试结论；增加捕获诊断及持久日志后RED PID78203证明deliveredRows=0/navigationPresent=false。修复后一次GREEN PID79697通过：导航保留、子项精确参数交付、原读/调用账本保留、先前事实不丢、一次恢复冷启动幂等；0真实Provider/Native/生产写。旧门未重跑。日志`build/slice272-v964-red.log`、`build/slice272-v964-green.log`。

读取阶段4次真实请求分别为603e8543→a6b5f8ba、499b2b47→381b157f、06c771cc→4cea26a5、d3371d2f→6d78be0c；共214120units/Provider22.995秒。加本节第一条纠域请求，新增5次共318429units/34.551秒，仅Provider时长，不是全链耗时或全项目总账。费用原件保留，不清零。

69382已安全退出；event10677/r21、0运行/0在途确认后，**同产品PID80370**使用v964继续原B。log `build/slice272-v964-read-navigation-1792769679433.log`。下一仅观察真实子项读取、模型选择、Native应用及原后继inspect；正式Plan0/6、新局0/12不变，不能将此修复等同整链收敛。

harnessLoopUsed=true；route=roster_workflow_experiment_planner/native_choice_command；tools=原space.solve_formation与保存证据读取；UI本轮未操作；实际选择/Native应用尚待；经验仍conditional、trainingTruth=false，不写真实对局记忆。若读取仍丢失、重复恢复或改变候选/旧回执，停止该停点并撤回完成声明。

### v964真实读取、动作与父任务返回（event10696）

同PID80370继续，未重启。一次具名恢复已持久保存startedAtCallIndex=4及旧两次纠错，旧记录未清。

| 环节 | 真实证据 | 结论 |
|---|---|---|
| 读取 | `6006e008a38a3a6d23bd60a45a484cdcbaad4696e393e38079eca6b1bc67469c`→`8795853505c3aaa2905c07211f442a91d5f242fa57f323b0c0be771ba8375d3b`；63182units/5.268秒 | 模型识别数组已保存但未交付，主动改读`/receipt/queryReceipt/result/formationOptions/0`；结果`c37671cf…`，newReadCount=1，不再重复父数组 |
| 选择 | `b36921d42fa8c0fa69306b8d9a02d81e9c98ec4a0acefd00dcba3035c5f4bca6`→`0ba01308f8aa4c94a5914694ec78a7cf7f255c9857f8152b3d0ddb862b4fb106`；80787units/4.532秒 | 模型选择2084/formation/index0，parametersJson=null，无手写坐标。`f9f8a2f1…`无failedWorkOrders，编译入队 |
| 真实应用 | `87398e0c59d413a29dd5f5ef66c603ff043b0f615f136b6de48e4af1720c9e20` | Native resultStatus=ok、unknownReason=null、1 transition。Go! Go! Go!位移1912/2000 milli-inch，9模型完整落位；父30ff27→后14d0b408 |
| 原任务返回 | event10694–10696，原select-marine1-relocation结果`1b654e59134607ffefc58475a4b17fa62d191dac0fcdf57c378ae7c46bc0a344` | 原失败动作被成功回执结算，原inspect-relocation-successor已ready、summary等待；不是只新增孤立成功子任务 |

这两次新增模型请求合计143969units/Provider9.800秒；连本节v963阶段共7次462398units/44.351秒，仍非全链时间或全项目总账。真实修复已推进到合法动作，证明这段“保留查询→纠错→读取→选择→应用→回接”可用；**不证明到达marker1、整轮最优、正式Plan或完整Teach已收敛**。继续原后继读取与总结，不重跑已成功动作/测试。

### 后继读取与事实→综合决策交接（同PID80370，event10746）

- 原`inspect-relocation-successor`实际完成：`f6a1f2b404ac76d953f40089bc130eba5d9114e7abceefb0f9ee39187747782a`。绑定真实后态14d0b408，R1 movement/player1；finiteActions=0，5个参数域为Combat Shield、Tactical Retreat、Stimpack、Terran Tenacity、finish_activation。没有新的普通移动域。不是重新初始化或重放动作。
- 原summary正常两步：`b653277d2f3cdd7cebf5de076e6a95a824ca4c4dd17ddfd7b76c20b700f3ceec`→`6bab9d2fdd43fcf7575db34b9e0f592b782af287a39d9f110f3195f106bd9a98`（25183units/8.990秒），引用原件触发自动补读；随后`c345656aa7469044e9392bf051bdf3a8c2c39f2502629f6a62e82e59747ae806`→`8b413e486b6f0228b9f5cd918b85511e0581dc86841b3955b7704a67cd1ce6a6`（83514units/7.564秒），结果`05b93608008191838ec77b3dc036f90fe11a6dcd56f2ba6a58977786ca3a9628`已发布。
- 总结如实区分：实际26000/31000而非旧假设25000/30630；9模型/1.912英寸实际执行、卡牌耗尽，但未证明到达/占点/最早回合。未把这一步当策略优化，未修改Plan。
- 原问题3批窗口后确实交给综合决策，不由纠错角色续授权。新作者请求`6cc5bd5ac488372e827362eea326895271067f4e418bc3bd7b6b45520c36b615`→`a2dd1c27540797800eded001fcfc200935464414764eec247ef8d8b45619dccc`（202080units/21.639秒），提案继续同后态执行finish_activation再inspect；理由是当前无更多Marine移动且卡已耗尽。明确不扩展其他单位完整回合、对手回合或整场模拟，不改军表/Plan。
- **该作者提案尚未授权执行**：引用的其他来源已自动补读，结果`3b746274bcd3ff5918f4a07109eda04a7076551a2b4da8b3ffdee9147807604b`为待作者再确认。不要把模型首回复当成实际已入队或成功。下一观察确认及范围内的执行/明确返回。

本轮新增3请求310777units/Provider38.193秒；旧费用和未知不清。无新代码修改/测试/新房间，未重跑任何已过验证。Plan仍r21、正式0/6、新局0/12，T27 5/6、T23 33/36、余4片。当前为真实接续证据，不是P4策略改善或P6最终交付。

### 作者确认、来源否决与自动修订（2026-10-24，原PID80370）

以下均为同一B产品运行的实际后继，没有重启、新建房间、重放已成功Native动作或手改模型输出。

1. 综合作者确认：`ee85a39c86e5810916ae4325a8ff1a217d1d28d71b2892610740c5e4cd2b29ad`→`6247fc02867461d668497d09cfdeb007ec152930b284ac82bd7dcb4081da5861`，结果`d402af11dd299b0087632565c180e804d883fad7db34d06f63c4260c1ea4884b`。继续有界同场景调查，不修改军表/Plan，不授权其他单位或对手完整回合。
2. 事实角色先读取现有材料，随后提出blocked控制返回；原件确认后的结果为`8a52f7ea8c29b447eab67f4686aa9af60813103a41769c9ffd9085a41740a8d6`。它保留“最早到达回合未测”，但声称没有继续移动能力。该状态只是模型提出的结论，不是来源审核通过或整题结束。作者确认加此事实角色三次请求共789813units/Provider49.309秒，不是全流程耗时或总账。
3. 独立来源审核实际否决：`451e1d325fc4860f314b8990e81bdddc31d92f554fefbb6ad7f8aafcb80482bc`→`8d275d79ca97086bc2e3166ee9d822c53290bdf0b2147442e82d86685f334c1e`，结果`4f2e8a8c307589426a63f93e51271cf2dba24dc1f1231828eba85754b5408fdb`，发布体`6ffb0116741159223302d1807b4492d75e05d8990eabd8a64d9d15a6d0410883`。两个requires_revision分别要求核对实际菜单正文，以及核对授权范围内的后继是否执行完毕。审核意见仍是可错的解释，不因否决自动变成规则真值。
4. 产品自动交回同一事实负责人，保留原问题、已成功位移与全部读取。第一轮`b11c9083…`→`8ad7227f…`读取4项，结果`7f818209…`；第二轮`ba37113b…`→`26ee8c07…`补5项菜单/不可用原因，结果`179f86af…`；第三轮`1bee6d79…`→`f435ec4e…`补3项原菜单/能力路由，结果`e20753f8…`。是已有证据的读取，不是新的部署或对局。
5. 第四轮`5a9e166b8f1c00ce605f5df0aa78df1894e137c5fb34f3cce11c2fcdfcfaeb9d`→`21c053e06864862affa92dd2f429dc64043869f7d861c0f3ca56f71e6c14fa70`提出再次inspect同状态。未执行：结果`75ed5dff38efc840855e4af03d4ccb4137f79ffc09439e9fe82bf899467d8048`因participantConfigurations缺compositionProfileId、startingModelIds及升级身份字段等8处格式缺项进入自动局部纠错。event10850第五次请求已派发；尚不能宣称修订成功或全链收敛。

本次没有改生产代码、没有新测试或重跑已过门。要继续观察：模型是否自动修正配置，是否只是重复已有inspect，以及当前菜单结论与原“最早回合”问题的范围差异如何交回作者。不得把额外读取/字段修正记为策略提升。原Plan r21、军表2000矿/145气不变；P5只有局部自动回交证据，P4/P6仍未验收，正式Plan0/6、新局0/12。
