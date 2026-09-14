# T18 / S174：实际审查坏 JSON、分类缺口与接口能力核验

## 最新状态：27ef 正式批次已停止，转入统一执行层改造

唯一live `85888` / PID `99537` 已exit1，不应继续轮询或原样重启。
实际runId为 `faction-v1-27ef94cd6f32462ec36a`；之前一次手拼ID多一位造成“未创建批次”的
状态误报，已根据实际数据库纠正。正式报告hash
`49d631d2ff0a212e57dc90206b0f245f6404e9ebb4bf7e65c79ad06e84779784`。

Terran首片认证恢复已实际完成，后续请求7b7d33发送结果不明，保留¥0.80预留；
Zerg恢复会话超时。全局174,218,845已知tokens / ¥153.764087估算与预留，0实际402。
五包离线1/5、runtime0/5。用户要求收敛共用链路，当前四项改造与真实单通道耗时证据见
[统一生产执行层计划](ticket-18-slice-174-unified-production-recovery-plan-2026-09-08.md)。
双通道40590与共用准备缓存接线后的实际复用诊断83481均已exit0，当前无活动会话或新的正式生成。
复用实测冷准备102,780ms、再次准备30,527ms、实际Zerg恢复52,864ms成功；
属于统一执行层第一项部分实现，不是四项整体验收。最新证据及剩余工作见上述统一计划。

## 当前入口：正式预检通过，已启动同参数 live 续跑

2026-09-08 20:10（Asia/Shanghai）确认预检 `62865` 已 exit0：`ready=true`、
`providerCalls=0`，recipe
`27ef94cd6f32462ec36aac10458b7f7ee9e85baafc56e4e832dfd9df95827ef0`。
复用356角色，继承510 calls / 103,696,191 tokens / ¥86.657825；
首个缺失角色仍为 Terran 末节 supportive.0.0 的显式完整上下文分解审核。

已启动唯一正式会话 `85888` / PID `99537`：

```sh
node scripts/run-ticket-18-faction-strategy-production-v1.mjs --live \
  --overall-run guide-repair-bab46109030e9073f739 \
  --continue-from faction-v1-6d345a142fa24636bab7
```

此记录时正在入口核验，尚未确认新run在数据库中创建或收到新Provider结果。
预检recipe是已证明的计划身份，不提前把它冒认成新产物；继续跟踪唯一 `85888`，
不要轮询终态 `62865`，不要更改生产依赖或重复启动。Terran认证首子片恢复后仍需实际余片审核，
Zerg独立通道继续已纠正草稿的来源审核；本次启动不等于任何新Skill通过验收。

启动前全局账本174,218,845 API tokens / ¥152.964087，下一提醒¥200。
五包离线1/5、runtime0/5；T来源流程6/7、Z1/8；T18 2/8、项目16/22。
沿用安全BYOK、冻结官方源、既有预算；实际402停止所有开发。完整目标仍active。

### 等待期间的下一入口只读核对

会话 `85888` / PID `99537` 已再次确认为运行中；仅有入口能力续期提示，
账本仍0intent/0实际402、174,218,845 tokens / ¥152.964087，没有新增付费结果。

已完整读取种族独立消费者、最终封存及正反对抗生产入口。种族消费者每族计划8请求，
包括编表选择与22道规则使用题的每组3次重复，但独立held-out局面数仍为0；
不能将这一步称为完整对战实力证明。最终封存还要独立重建生产/消费者证据，之后才能作为对抗依赖。

对抗入口三个专项现有报告（input、case-component、production）代码hash均无漂移。
但 `build/ticket-18-strategy-preexecution-v1/unified-readiness.json` 的4个依赖已漂移：
`package.json`、旧editor/review两个测试脚本，以及当前种族主CLI。
当前统一验证脚本还固定调用历史父 `faction-v1-f037c375d47fc41a5121` 并断言190可复用角色和
旧editor切换点；本轮仅确认代码，尚未执行它，不能声称新版全入口已通过或假定原样重跑可行。
进入S175前需处理这一明确的历史入口契约与当前依赖关系，不能手改报告hash。
当前不启动重型验证、不修改任何生产依赖，以免与真实种族生产争用资源或产生代码漂移。

## 当前入口：全部相关门通过，已启动 6d345 的正式断点预检

尾队列 `39122` 已全 exit0：slot63、native44 / 1DSH、capacity29 / 1DSH、
Teach uncertainty33 / 1DSH、review focus25 均通过。最后四份报告hash分别是
`58e4aaf083722736c7af96ac4ba488a4fdae9bc328fc0c1866d56bf8b11520b6`、
`683513ad4b3bf8ad93d8d17a5385c1d5ab860ba1e2ca77aee280058711d6e8f9`、
`5775d97981309193b518288becbcbd2c96bfee15cae9c308d2b9271ef58ab243`、
`387b1e13d7b95dab9473738be3ad35e915725cf0716c28baf1751f277d7b570d`。

启动快检实际结果：**41 门 / 186 个代码文件 / 0 issues / ready=true**。
主入口额外使用的 wire-address、observed、planning、bounded、draft-policy 五个聚合门
也已逐项核对 passed 及当前代码hash，均无漂移。不是手动改报告hash。

唯一当前进程为正式预检 `62865` / PID `85049`：

```sh
node scripts/run-ticket-18-faction-strategy-production-v1.mjs --preflight \
  --overall-run guide-repair-bab46109030e9073f739 \
  --continue-from faction-v1-6d345a142fa24636bab7
```

它仍须执行真实历史/来源/预算/新恢复身份的完整入口检查；此时尚无新的正式付费 run，
不要根据预期recipe猜测已创建的runId。预检通过后同参数 `--live`；不从3241重抽、不改冻结依赖。

本goal续轮新增两个测试层修正、各项真实专项/旧版本回放验证及正式预检启动；
无新Provider消费，无新五包资格。五包1/5、runtime0/5；T18 2/8、项目16/22不变，目标active。

## 验证续轮：两项测试层修正已复验；启动前剩四组相关检查

当前仅队列 `39122` 仍在运行，顺序为 native production → native output capacity →
Teach uncertainty → review focus capacity。C `50393` 已全 exit0：planning26、migration18、
bounded144 / 5 DSH 均通过，主入口的五个额外聚合报告代码哈希实查无漂移。
未启动新的正式付费 run；完成尾验后从 `6d345…` 单次 preflight/live。

本轮仅修改两份测试脚本，未改生产依赖：

1. 目标补全的两个 DSH 用例改顺序执行后，完整 **16 项 / 3 DSH / 0 Provider** 通过，
   `025086c35b1cd316cd28f3151e3d019e9be464f721bbfbab023c719680a0909b`。
   全部断言及180秒生产时限不变；这支持资源争用假说，但不是所有正式并行性能的证明。
2. 随后 slot 测试在旧静态接线断言停止（`90941` exit1）：它要求主入口直接选V4，
   与本次显式V5恢复迁移不符。更新为同时检查V4历史binding/import保留、V5新入口和显式迁移，
   保留旧样本/旧回执/负例/预算/迁移检查，且新增版本化接线断言。
   **63 项 / 1 DSH / 0 Provider** 通过，
   `3b3f10bce8ff04eca96c2dd7682ce367e73322c37acecb1ce95e9d3d8ff73510`。

此前targetID25 / 1DSH也已通过。以上均不计为新的正式Skill或模型复审产出。

### 超时的原始证据与隔离方式

原队列 B `62210` 在目标补全接线测试的 `reviewCase` 出现
`SESSION_WALL_TIME_EXHAUSTED`，已 exit1。堆栈停在 DSH operation 返回后的
会话 deadline 检查；该用例导入已付费响应，Provider 方法显式禁用，真实账本无新增请求。
不能据此称模型又生成了错误答案，也不能把超时报告改成通过。

当前假说依次是本机并发文件准备争用、恢复逻辑执行滞留、意外外部调用。
既有只读采样显示 DSH 投影的本地链接操作开销；目标补全测试又把 native/review
两个真实 DSH 用例用 `Promise.all` 同时启动。仅将该测试改为顺序运行来区分第一项，
**未改变生产代码、180 秒时限、任何断言或双种族生产并行**。随后 `90941`
在该项完成上述16项复验，之后因另一条静态接线断言终止；不要重新轮询旧会话。

本续轮已有独立新证据：

- editor-envelope 83 / 2 DSH、unique 17、draft-policy 313、observed-source 26 / 9 Rules、
  proposer-native 42 / 3 DSH 当前源码复验通过；C `50393` 继续 planning → bounded。
- 后续独立消费者入口的 4 个受影响报告也已重验通过（`41012` exit0）：
  production-replay 15、unit-debt 8、cross-field 11、structured 实际旧角色 1。
  这不是新种族产物的真实独立评估，不能计作 Skill 验收。

五包离线 1/5、runtime 0/5，T 来源流程 6/7、Z 1/8；T18 2/8、项目16/22仍不变。
尚无新付费生成，174,218,845 API tokens / ¥152.964087；0intent/0实际402，下一提醒 ¥200。
下一保持生产依赖冻结，等待这两条相关验证队列，再从 `6d345…` 单次预检和正式续跑。

## 最新接线：正式入口、版本迁移与独立消费者已实现，相关启动验证进行中

本轮将既有真实恢复组件接入正式 CLI：recipe 显式记录 opening-fence 与双坐标绑定、
原 run/attempt/capsule/候选身份，保持预算及旧回执不变。Zerg 主入口导入实际 `cf21c5…`
付费输出并采用 V5 Host 地址映射；Terran 分解运行时接认证恢复环境，不重新发送 `cf543e…`。
完整 continuation 将认证环境传入分解 collector，新的迁移合同校验首迁父为 `6d345…`、
后继保留同一原始身份及预算，原 attempts 不复制成新计费记录。

独立 candidate 入口会自行重建并认证原始密文，而非借用生产者内存证明；
structured/production replay 检查当前 input、显式 recipe 身份和祖先链。Zerg-only 消费
不读取 Terran 私有密文。原版本未声明新绑定时不静默启用新恢复；原文过期仍拒收。

当前新增证据：

- Terran 专项 **46 项 / 3 真实 DSH / 0 Provider** 通过，
  `f39353d39d7d74dc97ca4e910479f6d61733d9d6f875d369ced5d2eebba13490`。
  覆盖外层审核包装器、独立 structured consumer、真实生产 replay 接口、SQLite 重启、
  跨 run/孙 run 全缓存、缺绑定拒收及负判断保留。
  首片为认证的实际付费输出，余两片是明确标记的注入 transport；生产 replay 使用隔离
  fixture journal，复制的历史证据保持原始 owner/receipt，不写实际生产库，不作为新 Skill 资格。
- Zerg 实际 wrapper/consumer **21 项 / 1 真实 DSH / 0 Provider** 当前源码重验通过，
  `aec5c490b3b2132e819d50a61f10d16f27c14b9c96c7cdfb1f9f7795d0560720`。
- 联合接线/迁移 **74 项 / 0 Provider** 通过，gate
  `ca4984a6af6f3da706ecf29540a57f95fa55985b2fa7edf85af03fdea783ec4f`，
  verification `e9b620f8780beeeda3907ff09452a6bf2b3768284a19a562100c52cbef334218`。
  来源、绑定缺失/漂移、首迁父、预算/输入改变、Z-only 不读 T 密文及原库不变均验证。
- continuation 40、预算 59、双通道、catalogue、审核预算 12、旧 editor 5、review 19、
  wire 29 / 1 DSH、Z 单位时机 73 已重验通过。A 队列 `80892` 与联合门 `19242` 已 exit0。
  快检 41 门中 32 门已对应当前代码，余 9 门以及 main 的聚合门由 B `62210`、C `50393`
  继续执行。随后旧分解 40 与接线18/迁移5通过，旧五章独立回放 5/5 通过
  `57017af3cb67358aaf5838a062da8ace82270a98bb867551b424ca6fcb7224d2`，
  draft-envelope 92 / 4 DSH 通过 `33d0f8565b89c80841057ee6d96170bbc8a0b192ff943fca45248fe81cfe494e`。
  B 当前进入 metadata-recovery-wiring，C 当前进入 editor-draft-envelope，仍须继续尾队列。
  **尚未启动新的正式付费 run**。

新增 `faction-wire-address-recovery-v1.mjs`、`faction-wire-address-recovery-migration-v1.mjs`
及 `verify-ticket-18-wire-address-recovery-wiring-v1.mjs`；修改范围仅正式 runner、续跑/分解迁移、
structured/production/candidate 消费入口、快检与相关专项测试。源码暂冻结，后续从
`faction-v1-6d345a142fa24636bab7` 做唯一 preflight/live，不从旧 `3241…` 重抽。

当前计数未变：五包离线 1/5、runtime 0/5；T 来源流程 6/7、Z 1/8；
T18 2/8 slices、项目 16/22 tickets。无新 API，累计 174,218,845 tokens / ¥152.964087，下一提醒 ¥200。
使用 diagnose 的实际故障回放与 ctx2skill/offline/harness 的独立验收边界；测试通过不升级为规则或训练真值。

## 当前实现：认证恢复、审查子片与跨 run 组件通过；正式入口尚未接完

本轮新增了实际修复代码，不是只重述上轮诊断。当前没有活动测试或付费生产；
1191、77111、82360、35654、61650均已exit0，勿继续轮询。
最后61650包含新增跨run检查；其34项结果覆盖此前35654的22项中间结果。

| 范围 | 实际证据 | 当前结果 |
| --- | --- | --- |
| Terran认证格式恢复 | 原2274-byte密文、完整真实capsule与failed attempt、真实OS钥匙串 | 45项，1真实DSH，0Provider；`68f49e6791f2158edd77d910fdf83cd6cea4821da30f951d04129e43b56df2aa` |
| Zerg双坐标组件 | 实际cf21c5候选、整节6建议、真实Host来源目录 | 44项，0Provider；`55f830dddaa10f4dddb82c749a5c1b6354c174966879396dca7c170a0b4322a3` |
| Zerg真实review wrapper及独立消费者 | 原付费输出不改理由/判断、原请求重建、SQLite关闭重开 | 21项，1真实DSH，0Provider；`c3e38a68e7423444813ba24b7697fa281cac7e8d1813b1b00f3dd4c5d3b31bdc` |
| Terran审查子片与跨run | 实际失败首片零Provider恢复；中断后子run仅执行其余两片；孙run全缓存 | 34项，3真实DSH，剩余两次transport均注入，0Provider；`72410b948a777f3ebb0e37d1f96ca1a399ea56a29c38edf5209471af60f68b84` |

测试输出文件分别为 `authenticated-opening-fence-component-v1.json`、
`dual-coordinate-coverage-component-v1.json`、`dual-coordinate-review-runtime-component-v1.json`、
`fragment-opening-fence-runtime-component-v1.json`，均在 `build/ticket-18-faction-production-v1/`。
前三份实际hash复查无漂移，最后一份已由最终34项源码运行生成。
这些测试写入隔离SQLite，**未把正式6d345改成成功，也未产生新的正式种族Skill**。

### 实现边界

- `authenticated-opening-fence-recovery-v1` 委托已有V2深接口，重新读取真实原账单、
  从完整注册capsule重建请求、认证密文和过期时间，再调用既有opening-fence解码器。
  新增重复对象键（包括转义同名键）及深度拒收，防止JSON.parse静默丢值；无标量改写。
  原failed记录不改成received；恢复用独立产物/DSH记录表达，额外Provider次数明确为0。
  每次恢复/缓存读取及独立回放仍须认证原文。访问UUID/时间留在审计，不进入稳定checkpoint身份。
  原文过期即拒收，不能延期、用旧passed标志代替认证或自动重新购买判断。
- `faction-fragment-opening-fence-v1` 与 `faction-opening-fence-environment-v1` 将这一记录接入实际子片运行时。
  入口环境只读原生产库、Provider出口禁用；独立消费者加载自己的认证证明集合。
  当前完整上下文下，首片17字段/19来源的实际响应通过子片及组装验证；其余两片是工程注入，
  `uncertain`判断保持在组装结果中，不能借组装成功变成来源审查通过。
- `faction-review-decomposition-continuation-v1` 的collector增加显式认证恢复分支。
  原6d345未物化失败只有精确匹配认证证明时才生成“0新Provider”的待恢复许可；无证明/intent仍阻断。
  已恢复子片可以跨run携带内嵌恢复记录，不复制attempt、不重算费用；缺显式恢复配置仍拒收。
- `faction-review-coverage-address-v5` 以Host来源目录、明确global/local配对和完整建议hash共同判定地址。
  新V5导入绑定与review wrapper、独立structured consumer已接；不改V1–V4绑定或模型原理由。
  不依靠实体名相似度，矛盾、重复、歧义或错误来源拒收，负判断保持原样。

新增5个模块、4个专项脚本；仅增量修改现有review导入/runtime/consumer以及decomposition runtime/collector。
没有改Rules、游戏源、预算、BYOK存储或旧账单；git diff --check与新增文件syntax通过。

### 下一实际工作（不可直接重启旧命令）

1. 将两类恢复的显式binding/origins/readiness接入主CLI、recipe和完整迁移校验。
   当前 `validateFactionReviewDecompositionMigrationV1` 尚未把opening配置传入collector，
   因此从6d345仍会按旧边界拒绝未物化失败；这是明确待接入口，不应绕过。
2. 将正式decomposition外层structured consumer/production replay/candidate入口接入独立认证环境。
   现有T专项验证的是直接decomposition消费者；不能冒充外层wrapper/正式consumer已接。
   Z wrapper/consumer已能接受新binding，但主CLI尚未声明该binding或导入cf21c5。
3. 对完整迁移、实际outer wrapper/consumer、能力续期、过期/402与旧版本路径做相关验证，
   源码冻结后统一刷新受影响启动报告，不手写新hash或提前重复跑随后还会过期的门。
4. 从 `faction-v1-6d345a142fa24636bab7` 显式新recipe预检，再正式live。
   不从3241重抽、不把工程注入的两次后续审查当作真实生成。

账本复查仍174,218,845 API tokens / ¥152.964087、0intent/0实际402，下一提醒¥200。
五包离线1/5、runtime0/5；T源6/7、Z1/8；T18完成2/8 slices、项目16/22 tickets，S174仍进行中。
整体目标保持active；本轮为代码/真实样本/持久恢复证据的实质progress。

## 当前结论：6d345 已实际生成并终态；两类失败已零 API 复现

以下状态覆盖后面的历史进程记录。正式 live `59599` / PID `27710` 已 exit1，
实际 run 为 `faction-v1-6d345a142fa24636bab7`，不得继续轮询或原样重启。
最终报告 `e66c41ede2e82032fa0ca9dcb7357a707ca599a0b0abaa725e5547485add76f7`。
本轮 6 次实际请求（2 次能力探测、4 次审查），546,986 API tokens，估算 ¥1.986202。
全项目累计 174,218,845 API tokens / ¥152.964087；下一提醒 ¥200；0 intent、0实际402。
既有族生产链累计 510 calls / 103,696,191 tokens / ¥86.657825，原预算不重置。

Terran 前六节是历史证据复用，不是重新付费生成。第七节正文 8/8 已齐，
新的三子任务审查在 `target.0` 第一次发送后停止，尚无完成的审查子任务。
Zerg 首节历史成果复用；第二节五字段修正已真实应用，随后收到三批新 supportive 审查；
前两批物化完成，第三批在覆盖项地址校验处停止。不能将模型 supported 当成全节验收。

### 确定原因及实际证据

只读诊断 `scripts/diagnose-ticket-18-faction-resume-6d345-v1.mjs` 已 exit0；会话4476终态。
报告位于实际 run 目录下 `actual-resume-diagnosis-7fb9531534ff84cd30f0.json`，
完整哈希 `7fb9531534ff84cd30f07ee014d8f46da90618d9984633f3561ff2e7b8ec288e`。
原账本按只读方式打开，前后所有该run attempts哈希一致，0 Provider / 0真实DSH，未刷新游戏数据。

1. Terran `structured-cf543e3f34ea6ee7e94966ddf63814727db2a0cfc46a77b0`：
   HTTP200、完整611输出tokens、未截断。新V2隔离已成功保存2274-byte加密原文；
   通过真实OS钥匙串解密认证后，已有 `decodeOpeningFenceV1` 只去掉开头8字符代码围栏，
   无字符追加、无字段或标量改写，即通过原target合同。
   正规化回执 `c0ee7a59050eb55114606b692380e6e2dfcc3e974b9cd2e1de8ba340a323dc9c`，
   解码值哈希 `007c9f8db12957250f580c8c0ef4706cdcabbf28dccd26937207b157263f578e`；
   supported，17字段路径、19来源slot。原文未打印/明文持久化，解码值尚未保存为生产候选。
   这证明格式可恢复，不证明来源判断正确，也不是正式DSH片完成。
2. Zerg `structured-cf21c5c2213bc1114903808f866c4d4936e1987320cd5dea`：
   只读回放当前run首节及五字段修正，重建实际supportive.1.4完整请求，capsule哈希匹配真实候选。
   两个coverage行均返回数组 `[1]`，理由明确 `recommendation index 5 (target slot 1)`；
   真实targets的local1确为global5，整条建议含对应Corpser/Kerrigan来源。
   V4额外要求理由中逐字含括号包裹的sourceRef；这两个理由没有，因此必然拒收。
   原错误连续复现两次；仅在隔离克隆理由中添加这个字面引用即映射为 `[5]`，确定触发条件。
   **该克隆仅用于定位，不是可导入修复结果；不得添加引用来冒充模型原话。**

### 紧接着做什么

- Terran：把已认证原文的现有opening-fence解码接到版本化恢复产物、DSH子片、跨run续跑及独立消费者。
  必须绑定实际失败/request/capsule/合同/账单，保留原failed attempt，不能伪造完整wire或received记录。
  格式恢复后保留原判断与理由，再走未完成审查；不重新购买target.0的同一判断。
- Zerg：新版本地址恢复以实际coverageSlot绑定来源、明确的global/local对应及整条建议哈希共同证明归属；
  不要求模型在自然语言理由重复内部sourceRef，不更改原判断/理由，矛盾或歧义仍拒收，旧V4冻结。
- 两项都需先证明真实回执复用、SQLite重启、独立消费者、歧义/漂移拒收与402停止，再从本run显式续跑。
  此时尚未实施正式恢复，不能把诊断通过算作主流水线修好。

当前没有付费生成进程。五包离线1/5、runtime0/5；T源流程6/7、Z1/8；
Ticket18完成2/8 slices、项目16/22 tickets，S174仍未完成；空间Harness及真实反思升级链也未验收。
`ctx2skillLoopUsed=true; harnessLoopUsed=true; roleRoutes=[rule_skill_builder,harness_optimizer];`
`skillsGenerated=[]; promotions=[]; providerCallsDuringDiagnosis=0; trainingTruth=false`。

## 当前续进：分解审查完整接线，Z2 五字段来源纠错已通过专项验证

当前唯一live句柄为59599、PID27710，已实际核实进程活跃，正在入口依赖核验。
尚无新模型结果；下轮先轮询该句柄，不重启、不改生产依赖，实际runId等待DB/报告确认。

正式预检3920已exit0/ready，recipe
`6d345a142fa24636bab7097f5263c5061e0c5f03786959be59e83b070990fd4c`。
复用358历史角色，完整继承504calls/103,149,205tokens/¥84.671623原族生产链账本和原上限；
第一缺项为T7 supportive.0.0，路线`explicit_decomposed_full_context_review`，
plan`705c456f4041dc37f277008f1046544d1a216de0ee8ac197f9bacdcfd5c77eda`，3个任务及2种新合同能力探测。
总规则依赖资格通过，未调用Provider。对慢预检尝试只读sample时主进程已正常结束，未获得性能证据，不能据此认定崩溃或具体性能根因。
现在已按相同父3241/overall参数启动唯一正式live；须继续跟踪实际会话，先入口核验/能力探测，
再T末章审查与Z独立lane。live启动本身不证明模型调用或Skill产出，费用/完成数须据后续实际账本更新。

最新：最后bounded专项15949已exit0，144项/5真实DSH/0Provider报告
`60b2b1ab3967366bdfd4c4e0a45b39153b38edc397d6bc1159e0c777d0930458`。
已从3241启动唯一正式预检3920/PID14257，overall为guide-repair-bab46109030e9073f739；
先轮询该预检，不重启旧验证进程，不改运行依赖，预检通过后同参数live。
此刻仍未发出新付费生成请求，不能把预检启动算作真实Skill生产。

下一goal续轮的当前状态：60561终态exit0，显式slot61/1DSH报告
`2e8cfe3b95a0cc35322f75a925d94e4657c207fc9422ef3d385726d938f26b2b`。
observed26/9Rules、proposer-native42/3DSH、planning-workflow26、planning-migration18也均已通过；
planning迁移报告`e9c0709a93781302d25710a8687a3290f7559f75ae458cec1c94462cccadd8d3`。
独立验收入口5份受影响报告在14979刷新后全部exit0（15/14/8/11检查及1旧角色结构回放），无真实Provider。
快检66336终态exit0，40门/173文件全一致；main额外observed/planning/draft-policy报告无漂移。
仅15949/PID7300的最后bounded-generation-v2专项尚活跃，实际进程已核实；不重复启动。
上述不是新种族资格，正式preflight/live仍未执行；最后专项结束即从3241执行预检和生产，不追加功能。
本轮复查费用与验收计数均保持下文数值，0intent/0actual402。完整目标仍未实现，保持active。

最新终态覆盖下述中间进程状态：编辑器原83专项已通过，
`169d996e7f62ae8245675c2adce27dfead9c248e3f3d34ad44f03490ab280488`（2真实DSH/9注入传输/0Provider）。
原负例现在恢复预期DSH错误，新机制恢复/独立消费者/原子patch/重启和负面用例均过；未放宽断言。
修后旧editor5与wire29也全过，wire报告
`dd65636ca77d9ccbdee6f9e0c3a0c196c87274405e2cb0ea18d8c68577483248`。
分解接线18+迁移5当前报告`85ebb3db3f24d26095a1826584932f456d17b591a7c86ea03b6ee56b1a36c3b3`。
联合draft-policy因Unique报告包含旧candidate-evidence指纹而停止一次，只重跑该17项再聚合，
313项/6DSH引用/0Provider通过`7b32fd370acbc2fd0136f13693b50392bf6c091d8aaf67c6feaead1707491ced`。
上述指纹过期不是新的模型或功能失败，原失败报告未手工改写。
现在仅B15949（observed→proposer→planning→bounded）和C60561（Teach uncertainty→focus→explicit-slot）仍活跃。
86905/2406/41045/72343/43201均终态，不再轮询。快检40门/173文件剩4份过期报告待C，另main聚合门待B。
账本重查173,671,859API tokens/估算¥150.977885，0intent/0actual402，本轮0新付费、下一¥200。
正式preflight/live尚未启动，T源流程6/7、T7正文8/8；不等Zerg成品，门齐即从3241恢复既有隔离双lane。

启动尾验追加：41045在editor-envelope旧边界负例终态exit1，原测试期待
`STRUCTURED_DSH_MODEL_OUTCOME_NOT_ACCEPTED`，实际返回`STRUCTURED_PROVIDER_SCHEMA_INVALID`。
真实配置尚未付费执行；这是注入负例抓到的历史合同回归，不是新模型失败。
三个假设为observer泄漏旧路径、DSH桥接变化、fixture合同错配；源码和原失败断言支持第一项：
新selector需要保留observer，但editor无条件记录providerFailure，导致未启用新绑定的旧caller也改变抛错。
仅将捕获限定到`editorEnvelopeBinding`，原DSH桥接和schema合同不改、测试期待不放宽。
新B尾验72343从原83项开始复验；A2406/C60561继续未受影响的测试，A旧editor5及wire29在尾部需针对性刷新。
用户要求优先Terran：不等Zerg成品；但正式入口共享门禁须通过，当前不能称已启动生成。

以下取代下方历史段落中的“main未接线/仅23项runtime”状态，不修改旧失败记录。
原3241仍为终态；新合同的真实能力探测和正式付费生产尚未恢复。

- 分解审查已接真实review wrapper、独立structured/production consumer、main dry/live、recipe与跨run续跑。
  runtime最终40项、3真实DSH、3注入传输、0真实Provider：
  `3d2cee013dab38708d4e5cbb6e2082d80aabfc09dc52e6409c3811942fd5f614`。
  第一片落盘后，新的子run只执行余两片；再开孙run继承完整五记录（3片、组装、外层角色）零发送。
  无单一DSH loop的外层角色不能再被旧单loop过滤器漏掉；缓存组装读取前须触发冻结续跑store的懒加载。
  子片必须独立复验真实请求、能力、候选、回执与DSH证据；发送但未物化的尝试阻止跨run静默重发。
- 首轮主接线18项+迁移5项：`12e4be9ad49bd4a2b988b31ad5569c62fddcad99d6ceea04d0064c6616d44755`；
  wire接线29项刷新为`0a5f61e5525554bf8612801e49f600c57b0092a05a5a5f4b969e1329ebaa7b6e`。
  本轮新增Z2接线后，这两个涉及main/continuation的报告需重跑，不以旧hash冒充当前准备完成。

### Z2：已证实的5字段，不是模型自评通过

真实来源上下文及原付费回执已重新核对，origin证明
`1e2b9f47a82b3bb3136ad1249ca48e191e056ed49cefcbe99cb7f7f8c1485789`。
新增`faction-zerg-unit-timing-audit-v1`和显式迁移；旧V2首章13字段纠错保持原绑定及记录。

1. index4 alternatives.3：Raptor在1–6模型时Supply0，不能写成仅“6以下”。
2. index4 risk：Supply0的贡献为0，不等于不具备争夺资格；无敌方争夺且满足条件时仍可控制。
3. index4 alternatives.1：两个Supply1对敌方总和2仅平局，不能据此夺走其控制权。
4. index5 when.4：Regeneration前提补齐Assault Phase。
5. index5 procedure.2：移除“移动阶段Burrow立即触发回血”，保留突击阶段变为Activated且已Burrowed的真实触发。

纠错为显式Host事实修正；只替换实际命中的字段，保存整章原稿、完整来源、原付费候选和回执。
未标记字段与引用保持逐字一致，既有耐久/部署比较不因此成为已证明策略。
在已知错误正文进入新付费审查前原子应用，占用原有一次revision，不重置上限；随后两个路线各审完整章节。
负判断仍进入原修复链，不能由“已知错误计数为0”豁免。独立候选入口另有语义债拒收。

专项`verify-ticket-18-zerg-unit-timing-v1.mjs`终态exit0：73项（69组件/工作流/重启/接线，4迁移），
12注入新审查，0真实Provider、0真实DSH；准备报告
`82d1399cb48ddeb5bed38e3d2c2909f000490502e3ffd1ed44ff91e45fc3a430`。
实际测试关闭重开SQLite后复用原生成结果和已落盘纠错，不重写六条建议；完整双路审查覆盖0–5。
这些是修复机制证据，`actualProductionApplied=false`、`semanticAcceptance=false`。

当前已启动三条受影响验证流水线：2406、41045、60561；不是Codex子agent，均0真实Provider测试。
启动快检40门中27门因共享源码变化待重验，另有main聚合门；这是准备报告过期，不是27个新功能失败。
源码暂冻结，先轮询唯一句柄，不重复启动或手工改hash。后续从3241唯一正式preflight，再live。
未来密文payload自动有界修复尚未实现；捕获/隔离/不自动重试已接，旧Terran无raw不能恢复。

五包离线1/5、runtime0/5；T源流程6/7、Z1/8；T18为2/8 slices、项目16/22 tickets。
整体五包独立评估、空间Harness、真实复盘反思/升级/回归/回滚仍未完成。
本goal轮有实际代码与真实来源证据进展；上一个战术卡问答轮仅澄清，不计开发推进。
`ctx2skillLoopUsed=true; harnessLoopUsed=true; roleRoutes=[rule_skill_builder,harness_optimizer];`
`skillsGenerated=[]; promotions=[]; sourceRefreshPerformed=false; runtimeAccepted=false; trainingTruth=false`。

## 最新：传输运行时已接线，显式分解审查通过持久执行与消费者组件验证

原3241付费生产仍为终态，没有启动新live。旧34009句柄已不存在且没有同名进程；
实际落盘报告证明上一轮三项尾验已完成，不应重新启动这些测试来猜测状态：

- `wire-runtime-readiness-v2.json`：29项、1真实DSH、0Provider，
  `e60492f665e7699897857289fdabf5547f63d9dd41d01e55922e661183c510bd`。
  使用Terran真实付费失败的完整请求，在独立SQLite影子账本通过实际review wrapper；
  新wire issue与原失败/费用分开保存。其余三个caller为静态接线检查，不声称都有动态端到端证明。
- `wire-runtime-component-v2.json`：86项、真实OS钥匙串、0Provider，
  `582b0c9d94295abdfc11a6ca5a99332320729b4dbfe76f37ca1cf68db82bc558`。
  验证关闭重开、三处部分日志中断、上下文漂移、原密文访问、并发隔离与全局付款停止。
  四种caller通过统一显式selector接V2；V1和旧日志冻结。原classifier的观察回调保留，
  避免native/Teach/editor丢失暂存失败正文。
- 加密组件重验21项`b9f122d78540bd890173bbb3928b79dfc7248eedf21b709c4580105c7fcbe524`；
  Adapter重验24项`6171d6944a64ef66d18f451e358213905d6e6f78c83c8103c14b53bbc1ee8258`。
  测试原文为注入；这些绿门不代表旧Terran丢失raw已恢复。

真实Terran六章历史和最后首审的完整请求已只读重建：
`terran-wire-context-diagnosis-v2.json`，
`e0ad8a961b9902debbc9ab2c93b66b2d33ba9e0b2e45e04703e9127e3a2e6eb1`。
429,098-byte完整capsule和invocation均与实际attempt/receipt一致，0新Provider。

新增两个单项输出合同与`faction-review-decomposition-v1`：
实际失败包含两条建议和一项来源覆盖，显式计划分成三个新审查任务。
每个任务仍带完整Core/FAQ、当前族产品、8条整章建议及原reviewTask；只划分输出职责。
目标身份、来源身份和精确字段摘录由Host绑定，模型选择字段路径并给出判断/理由；
覆盖项使用整章专属目录，不与当前批target slot混用。程序生成摘录不证明模型正确理解目标。
缺项/重复项/陌生字段/错来源/上下文漂移拒收，unsupported/uncertain不得在合并中消失。
最终51项组件检查通过，`review-decomposition-component-v1.json`：
`308f4b894c8c989483297acd7a77dc07a5d1e4134b2cc9dc8b964c07a896ba78`。

新`faction-review-decomposition-runtime-v1`实现每个子任务单独持久保存、失败不自动重抽、
整批合同能力预检、完整paid-request/transport/candidate/DSH消费者重建，尚未接正式main。
首次实际DSH测试51405终态失败：注入transport漏`startedAt`，消费者正确拒绝能力有效期检查；
没有放宽生产验证，仅补测试回执。复验71974/PID14209和组件82008/PID14258均已exit0。
`review-decomposition-runtime-component-v1.json`：23项、3真实DSH、3注入传输、0真实Provider，
`216d65c77f74b4494054895606bb9538f0cf491b7616f925311f85401cb0ce97`。
实际先完成target.0，然后模拟中断、关闭并重开SQLite；target.0缓存复用，仅执行target.1和coverage.0。
三个结果连同原失败共四个Provider回执进入独立证明；消费者重建原输入、每次新Provider请求、
实际transport body、schema/capability、candidate及DSH command，改请求或洗掉负判断都会拒绝。
全部结果缓存复用不增加发送；模拟402阻止缓存入口，模拟记录只在独立test DB，正式账本仍0个402。
这些新判断和新能力回执均为注入测试，不能算正式能力探测、真实模型复审或新种族资格。
当前无活动测试/付费进程，不再轮询上述终态句柄。`git diff --check`通过，三个准备报告所列代码指纹无漂移。

仍待：分解审查正式入口/recipe/跨run失败导入和独立生产消费者接线、真实新合同探测；
未来有密文的wire错误的有界修复；Z2已知来源错误修正；受影响门统一刷新后从3241预检/live。
五包离线1/5、runtime0/5，T18 2/8、项目16/22不变；本轮尚0新付费，下一费用通知¥200。
规则Skill和Harness规范要求将上述工程检查与独立规则/策略/完整对战验收分开记录，未产生新晋升。

本轮改动：新增两个片段输出合同、分解计划/完整capsule/合并模块、持久DSH执行和独立消费者模块，
以及两份专项验证脚本；另更新本报告和根TASKS/PROJECT_MEMORY。未修改游戏规则或冻结来源。
ctx2skillLoopUsed=true；harnessLoopUsed=true；targetGames=[starcraft-tmg]；
roleRoutes/promptPackRoutes=[rule_skill_builder,harness_optimizer]；skillsGenerated=0；promotions=[]；
judgeTestsRun=0（新判断为注入）；crossTimeReplayResult=真实旧请求绑定及新任务断点/消费者组件通过；
harnessToolsCalled=[]；uiTraceEvidence=[]；agentDecisionEvidence=[]；memoryTraceEvidence=[]；trainingTraceCandidates=[]；
rollbackOrDemotionRules=缺失或漂移的来源/任务/回执/DSH证据均拒收，负判断不豁免；userVisibleChecks=[]；
remainingRuleGaps=Z2已知语义债与后续独立规则、策略、实际空间对战和反思升级验证仍待完成。

## 当前检查点：明确编号恢复已接线，传输加密捕获尚待运行时接入

`faction-v1-3241bb0aff2eda69e7c9`已结束，两条lane均rejected、active0；会话36012不再轮询或重启。
最终报告`8c77f2654328620a0ef7291bf4fb6e431398b77fb7c942b874782125981e31de`：
19次实际尝试、2,415,785 tokens、估算/预留¥5.119400，无未知用量。
全球累计173,671,859已知API tokens、¥150.977885，下一费用通知¥200；0余额耗尽记录。
本检查点所有新增模型Provider调用均为0，测试DSH不等于模型重新生成。

Z2失败是已保存的完整JSON在Host转换coverage地址时失败：
`structured-686b1584cab5543e1679878a7917529d4141f00aabd67730`。
实际回复明确写`recommendation index 0 (target slot 0)`，并精确列出`(source:army_units:queen)`。
只读重建完整请求和上下文后证明该批slot0对应整章index2；不是靠Queen名称推测映射。
诊断`zerg-explicit-slot-address-diagnosis-v4.json`，
`b65c3545540b3ee9b56ed89685e1c24c47114f9c8e0cebb1d4718a0eea8f553e`。

新增`faction-review-coverage-address-v4`要求明确局部编号声明、完整建议hash和同来源，
拒绝局部/全局双重解释、冲突身份、缺失声明、重复编号和篡改目标；不改判断、理由、来源和正文。
旧V1/V2/V3未改，既有无歧义结果仍保留原回执。已接runtime materialization、完整付费输出导入、
独立consumer、正式main参数/recipe、显式continuation及启动检查。
`explicit-slot-review-readiness-v1.json`最终61项、1真实DSH、0Provider：
`c4f05b7c21618c49870050227509e41171cc2a6f496d2af429d5f0aa71fd775d`。
测试使用真实付费输出和实际SQLite测试日志，关闭重开后不重复DSH/计费；它尚未在正式生产续跑应用。
旧target-ID路径25项/1DSH仍通过`1821f65e…`，续跑40项`4fc98a99…`、structured consumer回放`b9f65ebc…`通过。

坏JSON分类V2已用实际T/Z两类回执通过11项，未改旧失败记录：
`wire-classification-component-v2.json`，`fd0ab414a3fb85b54f62d46c9a05f05e4a54221138886d40538b9031ba5312f2`。
加密隔离组件21项实际macOS钥匙串测试通过，独立随机密钥、AES-256-GCM、请求/上下文/合同绑定、
有效期及访问回执；`raw-quarantine-component-readiness-v1.json`，`20a74c5d…`。
密文及编译helper仅放Git忽略的build；BYOK不作加密密钥，未安装新依赖。

新`deepseek-responses-json-schema-v2`组合原V1解析器，按实际invocation独立捕获完整不可解析输出，
在隔离I/O失败时仍保留原Provider错误及用量，仅附独立安全失败状态。
`provider-wire-quarantine-component-v2.json`24项、0Provider、真实钥匙串：
`c328f67f9621eaf1cb0b622a973cf29ee3f7f40761ab01a982636f43cbcbc5c6`。
测试原文为明确注入样本，不冒充旧Terran丢失的原文；并发反序完成、重启解密、付款停止与schema失败分流均验证。
**分类器及新Adapter尚未接入正式structured runtime日志/recipe；不能宣称未来失败已完整可恢复。**

下一顺序：

1. 贯通新Adapter与实际invocation、失败分类、版本化加密证据日志及持久恢复；保持原费用和失败回执。
2. 对有原文的未来wire失败提供有界、可审计的修复；旧Terran没有原文，采用显式更强/输出分解的新审查任务，不将同一请求原样重抽。
3. 处理Z2已知来源语义债，再统一重跑受影响准备门，从3241单一preflight/live；不回退b624、不重置预算。
4. 两族独立验收、正反对抗、空间Harness、真实回放反思与版本化升级/回归/回滚。

启动检查现37门中12门因本次真实源码变化需重验，尚未ready；主程序额外的聚合门也需最后统一检查。
不改写旧报告hash，不在传输接线仍变更时反复跑全部门。当前无活动测试或付费生产进程。
五包离线1/5、runtime0/5；T源流程6/7、Z1/8；T18仍2/8（174执行中，175–179未收口）、项目16/22。

本轮技能流程字段：ctx2skillLoopUsed=true；harnessLoopUsed=true；targetGames=[starcraft-tmg]；
roleRoutes/promptPackRoutes=[rule_skill_builder,harness_optimizer]；skillsGenerated=0；promotions=[]；
judgeTestsRun=0（没有新增语义评审）；crossTimeReplayResult=旧地址/续跑/独立consumer专项通过；
harnessToolsCalled=[]、uiTraceEvidence=[]、agentDecisionEvidence=[]、memoryTraceEvidence=[]、trainingTraceCandidates=[]；
rollbackOrDemotionRules=新绑定缺失、证据冲突或独立规则反例均拒收；userVisibleChecks=[]（无UI验收）；
blocks=Terran旧raw缺失及运行时接线未齐；remainingRuleGaps=Z2已知Supply/争夺资格/Regeneration及后续独立语义评估。

## 实际生产证据

已结束的`faction-v1-3241bb0aff2eda69e7c9`（旧会话36012）保留所有原付费失败。
Terran最后一章8/8正文已齐，最后两条从b624旧失败零Provider恢复。
Zerg首章13字段源修正已实际应用，后续新审发现一项槽位措辞争议；实际editor
`937995a9c7614a9dc89de4dc4418fa7efe202d854f3cc88337de15467b8107cf`
将“补足1 Elite缺口”明确为“提供至少1 Elite槽”，保留`1+2-2=1`及战前购买边界。
revision2六批完整来源审查已全部完成、openIssues=0、首章重新完成；这不是独立种族策略验收。

Terran首批审查`structured-34d5da73ed13d7fd4aca86335286d223031ab2d7d27c71d6`：

- HTTP200、completed、3,627输出tokens，未到4,096上限，无自动重试。
- 唯一错误为`$.provider_json_not_parseable`；原文hash
  `6a80c89d1a04f401c464f2899dcd065966804e3b366880fadd8817f97f24a32b`。
- 原回执`a28a5b733ef366b7d834e455e6abf73fa9c51691e83c834e9f22bc8f2590662f`。
- 原issue没有parsed candidate、rawPayloadPersisted=false；不能从hash恢复丢失原文。
- Adapter把语法失败也编码为`STRUCTURED_PROVIDER_SCHEMA_INVALID`；classifier只看该code，
  导致存储为schema_instance/local_semantic_regeneration_with_capsule，未按真实wire_syntax分类。
  这是已复现的分类缺陷，不是修改旧付费回执的理由。

另一个Zerg审查失败是合法JSON内focus数组17>16，已保留parsed candidate；
现有focus-capacity恢复实际零Provider导入并保留全部判断。它与坏JSON不可混为同一类。

证据脚本`scripts/diagnose-ticket-18-faction-current-review-wire-v1.mjs`只读生产DB，
验证回执、issue、attempt绑定及两类区别。报告
`build/ticket-18-faction-production-v1/faction-v1-3241bb0aff2eda69e7c9/review-wire-diagnosis-418345a67b86b0917a5f.json`，
hash `418345a67b86b0917a5fd2dba767a105f1786a86669a39f4c9ccacd9c845f309`。
`diagnosisReproduced=true`、`productionFixed=false`，0新Provider；不是通过验收报告。

## 官方接口核验（2026-09-08，只查API文档，游戏数据未刷新）

DeepSeek Responses参考确实列出`text.format`的`json_schema`、`name`、`schema`；
当前Adapter发送了这些字段。该页面未列`text.format.strict`，所以**没有证据认定失败仅因
少传strict:true**，不能把别家兼容接口参数直接套入这里。
API同时声明无服务端对话存储；客户端仍须管理上下文和续跑。
[DeepSeek Responses API参考](https://api-docs.deepseek.com/api/create-response/)

同一参考对普通function-call参数要求客户端验证，明确存在无效JSON/参数风险。
因此“换成普通工具调用”也不能直接视作解决方案；若采用另一严格协议，需要独立能力实测。
[DeepSeek Responses工具输出说明](https://api-docs.deepseek.com/api/create-response/)

本次读取的Tool Calls文档展示普通工具调用；未找到strict对应条款。
旧手册提到的beta严格模式不能仅凭旧描述当作当前已验证能力。
[DeepSeek Tool Calls](https://api-docs.deepseek.com/guides/tool_calls/)

Responses Guide本次两次抓取超时；未以它支持任何新结论。
上述是接口文档与实际回执对照，尚未执行新的收费能力探针，未修改当前Provider路径。

## 下一实施边界

1. 让当前Zerg lane正常完成或进入终态；不改共享运行代码，不因Terran先失败中断它。
2. 修复语法/结构分类传递，保留原code/旧回执；针对已保存实际回执做回归。
3. 按既有可靠性手册补加密原文隔离：AES-GCM、OS credential key、attempt/context/contract绑定、
   过期与访问回执、密文不入Git；不能明文打印或用API Key当作加密密钥。
4. 对新保存的坏输出做唯一可证明的确定性或payload-only恢复，不能猜测/改写未指明语义字段。
   旧Terran这份没有原文，必须如实保留不可恢复，改走显式能力验证后的更强/更细审查任务；
   不能原样重试整段上下文，不能假称导入成功。
5. 新协议保持全来源、完整章节与否定审查上下文，只拆审查输出职责；独立重建、预算与费用继承。
   能力探针须加入引号/换行、拒绝额外字段和约束违反挑战，成功样例本身不是强约束证明。

这是明确待实施工作，不是已经补齐的稳定生产闭环。Z2已知3项单位/计分/回血时机问题仍须独立处理。
最终五件套、独立评估、真实空间Harness、复盘反思/升级/回归/回滚范围没有缩减。

`ctx2skillLoopUsed=true`；`harnessLoopUsed=true`；角色为`rule_skill_builder/harness_optimizer`。
`promotions=[]`；`sourceRefreshPerformed=false`；`runtimeAccepted=false`；`trainingTruth=false`。
research按用户要求由主agent完成，无Codex子agent。
