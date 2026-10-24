# P2/P5：停止边界与增量作者协议连续性

## 目标和验收范围

所属 T27/S272，服务于 P0–P6 新流程，不新增 Ticket。修复实际模型请求中的协议切换和停止后仍派发下一请求的问题；不把局部测试当成正式生成完成。当前正式 Plan 0/6、新对局 0/12；T27 5/6、T23 33/36，关联剩余 S272/S248/S249/S250 共4片。

## v980 实际两次调用

同 B `slice272-product-generation-v645-8aBuEV`，r23，不初始化房间。

| 步骤 | 实际输入与返回 | 观察 |
|---|---|---|
| 作者命令 | 请求 `9b24254213d291cff0e1bab90a28d560ab755bd8ef1274220a30967c5af3408a` → 回复 `15eb2ba3d7d609e97c7b53f72cbb46853901b8abe64aae287fde289a2bcaf7ff` | v980结构化命令真实启用；仍重复论述旧到达调查并声称控点范围无本地查询。原引用缺少当前合同2202，产品补读，未立即批准决定。 |
| 来源确认 | 请求 `a633efe8322c7ed04d4ebcc62ab66839f96a08946692e2a6b83700e5f2d96b1e` → 回复 `9c0bbc03381c2fb81465c9701d85de9bf5b24cb0123681afae6cbb42310017bd` | 发现来源返回又使用整段旧格式，pendingProposal还是原始decide命令，未按其原请求恢复完整问题台账。作者增加deploy/move路线说明，但控点范围误解仍在；产品排出尚未执行的单Marine到达调查。 |

两调用合计 **486,649 units**，Provider用时 **29.509秒**，不是端到端耗时。费用保留原账，不清零。军表/Plan未变，0新Native测量或房间。第一个回复后即发送安全停止信号；后台仍发出第二个请求，待原件保存后PID37368退出。停止点 **r23/event11634/0在途**，新调查ready、未执行。

当前工具能力说明确实已在第二请求的workflow_role_assignment中列出`contestRangeMilliInches`，但完整大合同的相关正文不是全部内联。不能把“目录说明送达”当作实际控点测量，也不能把作者的“无工具”当作工具事实。该误解仍未解决，未批准Plan。

## 工程修复及定点证据

### v980：只对已确认旧协议开放一次恢复

沿现有产品恢复控制识别：实际作者职责、结构有效的旧决定、混合来源诊断导致命令失效，且停在无进展状态。新命令请求、在途调用、无关故障或畸形原输出不能续领。原调用、停止历史、问题和费用全部保留。

`verify-slice272-author-protocol-recovery-v980.mjs`：真实停点 **RED36943 → 一次GREEN**，0Provider/Native/生产写入。该门不证明策略收敛。

### v981：停止要到达调度器，而非只停观察器

实际客户端SIGTERM原先仅设置观察循环标志，等耗时状态读取返回才close；产品循环也只在while顶部检查停止，准备期间收到停止仍可能派发下一操作。

- 客户端收到停止立即调用原产品close，先设置调度停止标志，再等待当前操作保存，不丢弃已付费回执。
- 产品准备、排阶段、派发前以及本步结果保存后检查停止，避免新派发/恢复。
- 不强杀已在途Provider，不把未知费用清零。

`verify-slice272-product-pause-boundary-v981.mjs`：真实产品Journey＋受控Run，在prepareContext等待中暂停。**RED41078（仍advance一次）→ 一次GREEN**：0后继派发、0新阶段入队、paused持久保存。测试不调用Provider/Native，不修改生产断点。客户端真实信号端到端效果尚待下一次实际暂停观察，不能仅凭该门声称已全覆盖。

### v982：纠错与正常来源确认使用同一增量作者协议

原始模型回复保留真实wire格式。来源交回时，先找到它的**原请求**，用同一原映射器恢复领域提案及完整问题台账；不把decide命令直接塞进要求finish的提示。

- 作者命令既处理有具体错误的纠错，也处理正常来源确认；二者分别标记correction/source_confirmation。
- 正常确认不捏造local_contract_feedback，不自动批准原提案。
- 问题更新只覆盖显式指定项，未提及的原问题保持原值；读取不能隐式改军表或Plan。
- 原请求、原回复和映射来源均可追溯；来源、规则及最终准出检查不放宽。

`verify-slice272-author-read-continuity-v982.mjs` 使用实际第五次回复和第六次输入重建边界，调用真实角色构造器。首次夹具缺store.load，补齐后 **RED42605 → 一次GREEN**：正常确认仍是作者命令、原映射完整恢复四问题、仅显式问题更新、其余未知保留、无伪造错误/原件改写。0Provider/Native/生产写入。旧已过门未重跑。

## 下一步与停止边界

重新核对：新单Marine调查只有ready授权，尚无调用或Native执行，不是重放成功实验。修复后推进这条原授权的有限事实调查，比再次反复问作者更接近取得必要证据。它不能扩成全军/整场预演，控点和其它未解项保留。

同B PID44331，日志`build/slice272-v982-source-confirmation-1792785161214.log`，加载v981/v982；不加恢复额度参数、不重建房间、不重做已闭比较。启动不是事实成功或策略改善证明。发现无事实/决策/状态进展的重复即停，不能仅改措辞解除；现有自动门主要识别确定性相同授权，不宣称识别所有语义改写。实际新执行结果须追加，不能沿本段旧PID盲启。

### v982 已实际推进至资料返回边界

截至 r23/event11664，PID44331仍存活，无needs_repair；context/scoring前置已保存。事实角色与r23只读Teach各完成一次正常read，尚未得到到达实验结论或提交新Plan：

- 事实角色请求 `e8fa815527d376c5fba7d5673a043d45cc00c8794f06293a218dca6fbf128dca` → `c3dfd03da5b39064def7e27946858e999276d45c672619e19730ed0784ae2bf8`，142,801 units/7.407秒Provider。实际只派所选necessary_fact，其余事实/作者选择在pendingNotAuthorized；原假设明确为未验证前提。模型选择读取2202的operations/arguments/laboratory及保存后态，未直接重放动作。结果 `b88c4b09e04bd96bd791c3faab31f53d606aacdedf6349670654b776c42aa7cf`，needs_model_choice、correction=null。
- 只读Teach请求 `e484b16752d8a802e286949d561f4c7049c85088739ea33f2b0bdc96e08a82d0` → `3f1dc169b0a07b0dd39259d442050c4138ee1a9db9f5d9a0e91a26fcd6cb10f7`，166,349 units/6.966秒Provider。选择读取r23用途/部署/得分及比较原件，没有Teach结论或Plan修改。结果 `6961578a50e46baeff787161c4fb124da5efd43a386afa273e768a6520fca645`，needs_model_choice、correction=null。

两条共309,150 units/14.373秒Provider，不含初始化及Host时间。这是正常新材料准备，不是策略收敛证明。下一观察同进程的明确工作单/有范围结论或Teach提案；先核PID与最新事件，不能因为暂时没有pending请求便重启。无进展循环照停。

追加：Teach第二回复 `9d58a1bf761349d9c57f29e57c7a7425d227f36c5cf6f68bd04f166f8e7a031c`（请求`debbaf35ea0b6a61dcd13ba8b94d021912b205a240044cdeb4356ced4401813b`）提出保留已修的Goliath用途，明确说继续挑战同一事实没有价值；另将到达与控点作为待查项，并在requiredData承认可用Native mission_marker_control查询。新增195,534 units/12.567秒Provider；目前还在补读其引用，不能当作已接受Teach或正式Plan。事实角色第二请求 `3c9e15c8fd6f834ca3a7e4f6e4a8885500219473346a81941e3b691c47399307` 已在途，不重发。截至event11687，仍r23，无新工程失败；本PID已完成3调用504,684 units/26.940秒Provider，未计在途请求。

再追加：事实第二请求已返回`d97bffdd20d454f9af8c8ff1293ff8749883961afc46bd2a4bea1dfab0a5b453`，继续读取具体操作与marine-1路线子地址，不是重放初始化/移动动作；尚未提交工作单。新增195,243 units/12.660秒Provider，本PID累计4完成调用699,927 units/39.600秒Provider；截至r23/event11696、turn2/needs_model_choice，无新needs_repair。下一核所读子地址真实状态，再观察明确工作单或有依据的返回；不能把读取数量当策略进展。

Harness：`harnessLoopUsed=true`；targetGames=StarCraft；promptPackRoutes=roster_workflow_strategy_decision/roster_workflow_experiment_planner/roster_workflow_local_teach；实际证据为保存请求/回复及产品读取、保存、排队事件。0真实对局操作、0训练晋级；原场景实验与真实战史保持隔离。若新协议继续丢问题、混角色或无进展，则保持停止并修复，不以门禁数量晋级产品完成度。
