# P3/P5 原生动作队形查询的授权修复 v957

T27/S272；T27 5/6、T23 33/36。剩余S272/S248/S249/S250共4片；正式Plan0/6、新局0/12不变。本轮继续新P0–P6产品流程，不恢复旧调查。

## 具体失败与原因

原B `slice272-product-generation-v645-8aBuEV` / `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac` 停在event10296/r21，PID58149已退出，0在途。

1. Native部署错误回执已经明确推荐：在相同父状态和动作域使用 `space.solve_formation`，随后选择完整canonicalParameters。
2. 共享 `rosterWorkflowChoiceContractV1` 却只给包括native_action在内的纠错角色开放 `space.solve_static_formation`。工具目录按同一授权过滤，实际角色不能调用建议中的动态求解器。不是“有工具但模型自由决定不用”这么简单。
3. 模型使用静态查询，实际 `e2d2af7682a69f6e9988b8eb5d2d57eb9045d58389e59b94168c0b361d0d07db` 返回6个完整候选。其中(12,33)候选9个模型的合法静态摆位与模型后续手工提交的坐标不同。静态结果只证底盘/连续性，不证进场路径。
4. 下一选择实际输入 `58bdcdaa41793b09dfd244f0d20568406bca75c480a76d28f9ba28c3ceacd495`、请求 `cf91b714ddffafc05004c1e2d1d3b70a0fc656af93977a7aee3381fcb61007d2` 中，摘要只介绍候选锚点并明确细节尚未读取。模型读取了部署域与stateRef，却手写8个剩余模型坐标。
5. 末回执 `531ffc005adebddada89b110aeb7f8696f339b24d291cb3a2848afeed8dda3ac`：第7模型与 `wall-3-nw:profile-cell-34` 重叠。领队路径3630/4000长度可用，不等于全队摆位合法。三轮纠错后没有可运行工作。

所以此处同时有明确的工程授权缺口和模型未消费完整静态候选的行为。不能据此断言求解器几何算法错误，不能把静态成功改标成进场成功。

## 修复

- `roster-workflow-graph-v1.mjs`：仅native_action的前置空间查询增加 `space.solve_formation` 与 `legal_formation_options`；保留原静态查询。其他角色不扩权。
- 共享合同说明：同父状态/当前domainId求解完整动作参数，读取候选后显式选择 `kind:formation`；Host按保存原件复制canonicalParameters，原Native仍检验。查询不自动完成动作，不追加射击、计分、换单位或整场模拟。
- 工具目录及编译器已消费同一共享合同，不再各写一份许可名单。
- `roster-workflow-tool-return-v1.mjs`：对明确的当前Native部署/路径/剩余摆位实例化失败，按用户已有“明确修复后可追加一次”授权创建具名 `native_action_formation_delegation_v957` 续行。原代数3→4，旧结果/费用不清；同谱系不会第二次追加，其他失败不复活。
- v956增量工作单代码一并随新进程载入；不是重新初始化房间或重发旧成功请求。

## 定点验证

脚本 `scripts/verify-slice272-native-formation-delegation-v957.mjs`。

- 有效RED（83375）：实际图合同不允许Native回执推荐的动态队形工具。
- 修改后第一遍（83978）：共享授权、完整/目录两种投影通过；测试读取适配器未提供原本必要的保存stateRef读取而失败，未到真实请求断言。是夹具缺口，非生产失败。
- 补齐精确保存读取，使用 `--remaining` 只跑尚未通过项（84772）：实际角色请求、真实编译器前置查询、无关战斗拒绝、一次具名恢复、冷恢复不重复、下一代不再次追加均通过。
- 0Provider/Native/生产写入。已过部分未复跑，旧门禁未跑。只证明该工程合同，不证明实际部署/最终Plan。

## 真实续行

确认58149不存在、无另一同B运行器、检查点无在途后，PID85184启动同一产品HTTP入口：

`node scripts/run-slice272-product-generation-v645.mjs --resume build/slice272-product-generation-v645-8aBuEV --mode editable`

日志：`build/slice272-v957-native-formation-1792762374430.log`。不加Provider重试标志、不建新房。

首次观察event10297已登记具名恢复，原结果531ffc00保留，generation4。85184当时存活。实际模型调用、动态求解及Native消费尚待，不能因入队宣称恢复成功。

技能影响：按harness观测和diagnose流程，从真实建议/权限/回执/模型公开理由定位共享授权错误，用实际角色输入验证；未用额外战略提示替模型选站位。

## 真实消费与原任务续接（event10412/r21）

同一PID85184继续运行，无新房、无重放旧成功验证。以下覆盖上一节“实际消费尚待”的历史状态，不覆盖原失败记录。

1. 模型选择动态求解，但首次把内层argumentsJson返回为对象，编译拒绝且未发送工具。v956局部纠错实际返回 `stepEdits`，只更新 `solve-formation`，范围保留、删除列表为空；结果 `28fa5df856d7d51c4889a9939984086d291eb833aae3fe1498939c70521ccf3a`。这是实际增量纠错证据，不是Host手补参数。
2. `space.solve_formation` 在原父状态和原部署domain执行，结果 `37ff98c506af4000e318b2ce01be43a953965f6d0dc380e0c7ab42f565c7a7be` 返回4个完整合法候选。整包读取过大时仍标为未交付；选择角色随后分别读取0–3项，没有重新计算。
3. 模型显式选择保存证据2041的第3个formation，结果 `fcdce776a848056d639d3a358edb0cf5a6cebaecec7794735a6c48b84b12dd02`。Host从保存候选复制canonicalParameters，没有让模型重写9个坐标。
4. Native结果 `39ea9c3a16d6f3f44395554a7fb70c0de9a48fdfa3e824ccb6d8a2a3af994912` 为completed/ok，实际1个deploy转换：父状态 `6d0595f469306ed376d1fa2d51c64157424caeba0c25a74f8abca007f21d2971` → 后继 `30ff27f86454652dd69bb246446d8c50d8993ca51a6337832f51b3c0b98b1344`。Marine1的9个模型、4英寸路径、完整底盘边界、扫掠路径、编队及地形访问检查通过。
5. 成功结果沿纠错关系返回原 `order0:select-marine1-deploy`，结果 `9f610f35b771c00dc171b1f6a83d3e707f2b75129c2fb05c416e02c642821c67`。原本待执行的 `inspect-successor` 自动读取上述30ff后继，结果 `d38dcb457c3977b6223683c90e31acf9ed183e2576262c4936dc10be98ca78e0`；原 `summary` 随后完成，结果 `ac30f160fdcb4196a39881ea3b40bfdc1b2a9b3bc6d1f4b4aa7ca65440ab51af`。三者均evidence_ready，未丢失原任务尾部、未重复Native。

### 已证明与未证明

- 已证明当前分支的“局部纠错 → 保存候选选择 → 原生合法部署 → 原任务后继/汇总”实际接通。
- 只在私有条件场景中执行，非正式对局。尚未证明到marker1、控点得分、最佳路线或最终Plan准出。
- 模型这次未传preferredAnchor，选择理由主要引用solverScore，不能据合法部署宣称战略改善；后续需看原地图目标调查如何消费这段证据，不向其注入手工战略结论。
- 增量原则仍是：稳定步骤身份、未提及保留、显式更新/删除；成功结果可追溯复用，依赖改变则局部失效。工具能力目录与查询账本分离。本分支成功不等于全部角色、Plan改版后的查询迁移均已验收。
- 未增加测试或复跑已通过门；T27 5/6、T23 33/36、正式Plan0/6、新局0/12、剩余4片不变。
