# Ticket 23 / Slice 248 — C108 冲锋结算停点

## 当前事实与准入边界

本记录覆盖此前“原三房运行中”的快照。原共同版本是
`s248-v17-correctness-worker-deadline-v36-20261011`，没有加载 v19/v20/v21
性能候选。C108 出现 `LIVE_DECISION_ALL_CURRENT_CANDIDATES_UNAVAILABLE`
High；独立监控13:23:41.897Z请求全部停，13:42:02.315Z闭合。
原生头为 A107/B108/C108，均第3回合突击阶段。

A107/B108 分别比最近完整 UI 动作106/107多一步，是已接受动作的捕获缺口，
不是重新执行的许可。三 Host 正常退出；B 的残留观察驱动34173在核对
出生时间、原房命令、Host均退出、六席 reserved/dispatched 全为0后定点结束。
没有删除、重建、重掷骰子或改写原房数据库；旧未知用量仍原样保留。

**性能代码推广**沿用用户最新要求：每组至少一个完整同版本回合，按实际
动作/查询类型固定短、中位、超长原请求；中位及超长均提速至少40%，所有
被测 case 无劣化、完整输出相同，才在三组共同动作/截图封口加载一轮。
当前第3回合中途恢复余段不能充当完整同版本回合。正确性停点修复不是
性能候选准入，更不能借停机夹带推广未测候选。

T23 33/36、T27 5/6；主线仍余248/272/249/250四片，完整实验0/12。

## 已完成的离线样本提取修复

上游 collector 已捕获真实 A99 无查询结束激活的 Preview/Apply/Replay，
下游 real-performance extractor 却只提取空间查询，因此仍漏掉整条动作。
具体真实保留样本 RED9535/exit1，修正后唯一 GREEN10970/exit0：

- `scripts/support/ticket23-authority-performance-case-extraction-v1.mjs`：
  只读原库、复用原认证与签名验证，保留 proposal/chanceReveal/完整 receipt。
- `scripts/collect-ticket-23-real-performance-cases-v1.mjs`：原空间 cases
  不变，新增 Authority cases/coverage 和动作窗口口径。
- `scripts/verify-ticket-23-slice-248-authority-case-extraction-v1.mjs`：
  仅复现本次具体遗漏，真实 A99 原记录、RAM输出，不写原房。

三个权威阶段选择合并到同一原动作 case；缺失或身份不符保持 pending，
不重新挑快样本。0 Provider、0 Rules execution、0原房写。
证据在三组 evidence 根的 `authority-case-extraction-A99-red.private.json`
和 `authority-case-extraction-A99-green.private.json`。
完整回合分支、完整 Authority 配对执行和墙钟40%门仍未验收；不重跑旧绿。

## C108 的具体症状

Marine3 对凯瑞甘的声明已经在原房接受：领队
`player1-marine-3-model-1`，7个存活模型，Speed7 + 原骰子6 = 13英寸。
下一步必须结算原声明，不能重新选目标、改骰子或跳过。

同一 choice 已付费的四条返回均完成，保留原样。最后返回请求完整队形，
目的为接敌凯瑞甘/继续争夺 marker5；不是网络没返回。原查询约75.324秒，
生成约69.880秒：57个锚点、399次意图尝试，294次领队被阻、105次跟随
摆放未完成、最多摆出4个跟随；0完整生成、0 Rules实例化。
Harness 随后排除了唯一的强制结算域，造成当前 High。

捕获 `C/actual-C108-charge-solver-state.private.json.gz` 保存完整原状态及
原付费 choice（无密钥），约1.867MB；具体复现
`scripts/verify-ticket-23-slice-248-charge-solver-C108-v1.mjs` 的唯一 RED
16726/exit1保持同一失败，约39.261秒。它证明当前搜索不能给出结算，不证明
一定存在成功队形；若规则结论实际需要失败证书，不得伪造成功让测试变绿。

## 已查清与仍未查清

源码显示现有 Charge 生成先使用锚定领队的固定六角网格贪心摆跟随，后只给
领队一个直线终点。一个手工完整候选在原 Rules instantiate 中报
`SELECTED_SPATIAL_PATH_MODEL_COLLISION:player1-marine-1-model-1`。
因此“摆放容量”和“实际领队路径”要分开证明；手工候选也不是合法见证。

局部数值探查发现目标附近还有采样可摆中心，不能宣布完全不可达。另一个
地形/友军连通障碍 cut 探查未形成所需的完整障碍链，其结果为无证书，
`C/C108-connected-obstacle-cut-diagnostic.private.json` 明确
`rulesAuthority:false`。所有零选项/采样图都只是诊断。

还发现一条需核实的动作合同接缝：底盘 coherency kernel 支持有完整
Rules-owned 不可摆放证书的非领队 casualty；selected spatial adapter 的
canonicalPlacements 要求全部坐标，validateFinalGeometry 又统一强制
`outcome:"placed"`。源码缺口已定位，但尚未用当前 C108 证明它是根因，
也未据此改判冲锋失败或自动移除棋子。旧证书的 hash 并不代替完整几何分母。

## 剩余交付物与顺序

1. **C108 真实结算证据**：保留原滚骰状态，确定能否提出原 Rules 接受的
   完整路径/队形；若不可摆，使用正确版本、完整几何证明及原规则结算语义。
   正式修复前先确定来源，不能用“零采样”代替失败证明。
2. **唯一受影响门与共同恢复记录**：只改必要生成/合同接线、验证一次，
   收齐 A107/B108 的原动作 UI，再用同版正确性修复恢复三个原房。
   四条 C108 付费输出、旧费用/骰子/计划全部保留；不盲重发。
3. **完整回合性能输入**：各组真正满一同版本回合后，固定原请求/结果，
   补齐无查询动作和 Authority 配对执行，不改选择分位的身份。
4. **隔离性能验收与推广证据**：v19仅LOS、v20回放锚点、v21就绪派发，
   都需实际完整输出/墙钟/三房并发测量。v21目录含测试 worker，不能整体加载；
   只有40%/零劣化条件全部满足才推广。

没有新子代理/K3、规则数据更新、策略 Prompt/Skill 改动、旧绿重跑、全量门禁
或提交。以上为原停点；当前修复与恢复状态见下文，长任务仍开放。

## 原状态的完整失败证明与定点修复

新增 `packages/rule-atoms/official-charge-composite-cross-section-proof-v1.mjs`，
并接入原 occupied-cross-section proof 的未知分支；原有成功证书返回保持不变。
证明组合真实地形与真实模型的底盘膨胀障碍，不以有限队形搜索失败作结论。
对原 C108，18寸横截面的阻挡区间为15.606至38.357寸；左右绕行的保守
路径下界均超过13寸，最小下界21.062寸。同侧所有可能接敌终点另做完整
整数区域覆盖，排除“不穿横截面但仍能接敌”的漏项。证书只覆盖支持的平面
圆底盘/普通障碍；传送入口、可站立高地等未支持路径保持 unknown。

具体 bug 复现 `scripts/verify-ticket-23-slice-248-C108-composite-cut-v1.mjs`：
RED78616/exit1；首次修后80877仅夹具把已删除 pendingAction 错认作 null；
定点修正该断言后唯一 GREEN81788/exit0、2.717秒。移开障碍、扩大距离、
加入入口均不冒称必败。v4/v5/v6实际结算适配保留7个存活模型、位置、Supply
和原骰子6，结束失败冲锋的激活；这还不是完整在线 Host/Replay 验收。
三个证据文件保存在三组 evidence 根的 `C/C108-composite-cut-*.private.json`。
旧 RED16726 的“必须生成成功队形”假设仍保留，不伪装成通过。

共同正确性源版本为
`s248-v17-correctness-composite-charge-cut-v37-20261011`；36项源码在启动前
与 `common-v17c3-source-manifest.private.json` 同一清单匹配。
首次恢复准备因 A 未传原 `A/plan-workspace` 路径失败，三个准备进程均退出，
0新动作/Provider派发；原计划 hash 与旧入口匹配后补回原目录，未改计划内容。
15:02:58Z原 Host95825/95826/95827全部就绪，原 Web驱动5952/5955/5960
接入、出生身份绑定监控5961启动。原roomId/dataDirectory不变，不新建房或
epoch；驱动先补捕获A107/B108旧动作，不重演。首次15:03:09Z观察三组无新
job失败，旧 failed progress 仍是原停点，不冒充新失败。首个新接受动作、
C原房冲锋结算及在线Replay尚待；没有加载性能候选。
操作恢复产物 `common-v17c3-owned-startup*.private.*` 自动等原Host就绪后
调用既有Web驱动与既有独立监控，不包含新Rules/模型恢复实现。

## 声明前为何仍选择冲锋：模型理由与输入缺口

原 C107 决策（接受后成为 C108）公开理由使用“单位最近底盘距6.971寸，
最大距离13寸”，据此称可冲锋凯瑞甘；同时风险栏明确写路径未确认。
它查了关系图和声明合法性，没有获得实际绕行路径可达证据。
`inspectStarcraftTmgSelectedChargeReachabilityV1` 的 exact 指直线单位底盘
距离，不是选定领队的实际路径；名称/状态容易混淆两者。关系图也明确
`chanceAndPathUnresolved:true`，但模型仍将距离下界当成成功证据。

必须区分两件事：官方规则允许声明最终失败的冲锋，因此不能把此声明改成
非法；Agent 的成功判断缺少路径证据则是输入/决策缺口。后续应提供中立的
实际路径必败证据，并把“精确距离、可达未知、已证不可达”分开表达；没有
证书不能凭采样或直线距离称可达/不可达。本次没有改策略权重、Prompt 或
Skill，也尚未补上声明前路径证据。当前修复解决的是强制结算卡死。

路径证明只绑定此次已经声明的领队model1与目标，不能未经验证便断言换领队
也必败，更不能移除整个单位的合法冲锋声明域。继续原骰结算与后续声明证据
完善是两个不同交付物。

## 真实父层接线缺口与修复

此节覆盖上文v37“等待在线结算”的快照，不改写此前测试范围。
正式工厂 `ticket20-human-agent-demo-fixture-v1.mjs` 实际先构造基础V1，
再给 `singleton_identity_v6` 包装；不是此前具体复现的V4/V5父层。
因此v37没有把证书接进实际普通结算域。模型又完成三条付费返回、重复旧的
已排除域，最终 `PLANNER_CANDIDATE_NOT_CURRENT` 三轮不收敛：
661039 units，估算新增¥0.815928。七条已付费输出全部保存，未盲重发。
监控15:05:52.694Z请求全部停，15:22:33.015Z共同闭合。原生A108/B109/C108；
A108/B109比最新完整截图各领先一步，只补捕获。六席在途派发全部封口后，
仅对已核对出生/命令的残留A5952观察进程定点结束，不写原库或改原动作。

必要生产修改仅为
`packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs`：

- 对原单目标、支持的平面路径，基础域补入既有完整占用横截面必败证书；
  已支持的直线距离必败域形状保持。没有完整证书仍保持成功/失败待结算。
- 证书域仅允许失败结算；复用既有singleton参数绑定，原骰子不重掷。
- Rules在实例化时重算证书并匹配当前域的证书hash，保留所有模型/位置/Supply。
  不把采样失败当规则证明，不改声明合法性或策略Prompt/Skill。

新增的唯一具体bug复现
`scripts/verify-ticket-23-slice-248-C108-base-parent-wiring-v1.mjs`
读取原C108状态和原始初始Envelope，构造**真实V1→V6工厂**，验证真实descriptor
hash `c6a7e2b6d4cca71653a069a160458d1d0ec72959d31564d196fe4b1ff94cc52a`，
再走正式单例绑定和Rules实例化。RED21881/exit1证实实际父层仍给成功/失败双域；
唯一GREEN25700/exit0、16.760秒确认强制失败域/原骰6/全部模型Supply保持，
不支持入口仍unknown。证据为 `C/C108-base-parent-wiring-{red,green}.private.json`
及日志。0Provider/0原房写。此前GREEN81788只证明中间包装层，未重跑；
此GREEN也不冒称在线Host/Apply/签名Replay已验收。

共同正确性版本
`s248-v17-correctness-base-charge-proof-wiring-v38-20261011`，清单
`common-v17c4-source-manifest.private.json` 在原36项基础上加入必要melee源。
原Host28426/28427/28428已经启动，出生绑定观察33031等待其就绪，再调用既有
Web驱动和独立监控。A/B原Plan目录保持，C无预游戏Plan；所有原存储/骰子/费用
保留，不新建房、epoch或重演旧成功动作。**在线C109失败冲锋Apply/Replay/截图
尚待观察**，首步先收齐A108/B109旧动作截图。

性能候选未加载；只将同一必要melee正确性修改机械同步至完整LOS隔离源码视图，
v20/v21最小测试视图未变，不称实际性能已测或40%门已过。
下一交付依次是原房结算闭合、声明前中立路径证据、各组完整同版本回合、
固定按类型短/中位/超长请求配对墙钟与完整结果验收。仍33/36、余四片、完整0/12。

## 原C109正式结算闭合与B111新停点

本节覆盖上述“在线尚待”的旧快照。C109在**原房、原骰6**用既有横截面
证书失败结算：`charge_failed`、模型位置不变、全部Supply保持。
原生journalHash与UI receiptHash均为f172b062…，签名Replay为true；不能把
包含额外审计字段的完整receipt再hash而冒称同一个journal身份。
`common-v17c4-first-original-sealed-actions-C109.private.json` 保存原生回执、
证书和A109/B110/C109首次共同续接记录。两图已实际查看：

- [C109战场](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/performance-baseline-C-singleton-identity-v13-20261011/screenshots/0687-r109-player1-resolve_charge-complete-board-applied.png)
- [C109控制台](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/performance-baseline-C-singleton-identity-v13-20261011/screenshots/0688-r109-player1-resolve_charge-agent-control-applied.png)

0新Provider请求；上述仅证明原失败结算Apply/Replay/UI闭合，**声明前中立路径
证据尚未修好**，也没有改变冲锋声明合法性、策略Prompt/Skill或性能版本。

随后B111 Raptor冲锋原Marine单个幸存model3，保留骰6、Speed6、最大12寸。
单位最近底盘距7.559寸；实际指定领队的直线接敌下界10.147寸，因此不能像C
那样仅凭已知距离断定“骰满也到不了”。原Raptor有独立地形/高差路径能力，
不能套用普通平面必败证书。三条已完成付费返回都保留；最终队形查询0选项，
`RULES_QUERY_NO_LEGAL_FORMATION_OPTION`之后排除唯一强制结算候选，导致High。
当前paid receipt只保存null result，没有生成器failureCounts，原因尚未证实。

共同停请求15:48:11.442Z、闭合15:49:36.656Z，原生A/B/C均111、第3回合突击。
七个原进程已实际退出，六席reserved/dispatched均0，原存储/骰子/Plan保留。
`all-stop-common-v17c4.private.json`及`common-v17c4-B111-stopped-state.private.json`
为事实来源。不是C109修复失败，也不是独立新房/性能候选上线。

具体bug复现 `scripts/verify-ticket-23-slice-248-B111-charge-continuation-v1.mjs`
只读原状态/原付费意图、真实V1→V6、Rules实例化与结算；策略comparison明确
不在此几何门范围。三轮在夹具阶段失败，尚未执行真实求解器：

1. 60621用立即父fork的中途初始状态构造军表，包含召唤单位；已改为沿原Web
   工厂祖先链找原审定军表，不改当前B111状态。
2. 63076错借C/A的runtimeHash；同代码而不同军表的B冻结hash实际是68465152…，
   已改为原B111 Envelope的冻结binding。
3. 69644额外把扩展公共binding的通用hash当原生matchBindingHash；这不是原生
   合同。该多余断言已去掉，**按三轮收敛规则停止，未重跑、未称通过**。

对应 `B/B111-charge-continuation-red{,-native,-bound}.private.json` 全保留；
`B/actual-B111-charge-solver-state-bound.private.json.gz` 保存原生111状态及
冻结binding，不含API密钥。0模型/原库写。接下来须明确真实生成/路径/实例化
原因与Rules认可的结算见证，不能用0采样造失败或再次盲重决策。

完整回合、性能推广、完整对局仍未完成；T23 33/36、余四片、完整0/12不变。
