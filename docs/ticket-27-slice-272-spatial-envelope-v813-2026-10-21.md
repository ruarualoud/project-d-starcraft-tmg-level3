# T27 / S272：状态信封与 Native 查询字段分层

P2/P3/P5，新P0–P6主线。T27 5/6、T23 33/36，相关剩余4片，最终Plan0/6、对局0/12。

## 实际失败与假设排除

v812真实模型已改好候选选择器，但候选来自初始状态，而应用目标为b26eef突击分支，Native准确拒绝。模型随后明确选择在b26eef重新求解，证明并非“不知道父场景”。实际请求却把stateRef放入queryArguments；编译器只检查Native必填项，未检查状态信封层级。执行器读取外层stateRef，遂用默认根场景，Native再报stateRef未知字段。既不是父场景不存在，也不是几何无解。

真实失败结果：`32e740be7e62a06d2d3f64b4520af57c4d6f276d84a3977b7354960413db3670`。原参数、请求、默认根场景和`STATIC_FORMATION_ARGUMENTS_INVALID:unrecognized_fields:stateRef`均保留。工作单编译通过不能算正确父场景实际执行成功；v812报告中的“重新求解”仍为模型意图，未完成Native事实。

## 修复

- 共同typed空间入口明确两层：外层stateRef/base/contextRef/seatKey选择世界；内层queryArguments仅放unitId/anchorRegions/jointUnits等Native查询字段。编译和实际派发使用同一检查。
- 发现错层立即返回`ROSTER_WORKFLOW_SPATIAL_ENVELOPE_INVALID`，带已有值、准确目的层级及保留选择要求；不自动移动字段、不丢父场景、不强制指定其他世界。
- 原失败回执经同一诊断投影获得准确纠错，而不是要求模型重复照Native字段说明填写。类型错误返回也保留专用诊断。
- 当前链已到3代；只针对真实旧适配器错层回执给一次命名`spatial_envelope_v813`恢复。相同链已有此恢复、重复子工作或其他耗尽错误不获额外机会，历史代数/费用/原答不重置。

## 一次定点红绿

`scripts/verify-slice272-spatial-envelope-v813.mjs <原Run工作流目录>`：实际工作单RED（编译未拒绝）→源修复后唯一GREEN，退出0、约1.9秒。校验共享编译拒绝错层、夹具显式纠正后原父状态和Native参数逐值不变、有意根场景仍支持、旧回执相同诊断、额外恢复仅一次、其他耗尽链仍停。Provider0、Native0、生产写0；旧门未跑。

## 实际续行

33413安全退出e6903/r4，pending/running空。43363同Run `slice272-product-generation-v645-lqMWaS`加载新码，日志`build/slice272-v813-live-1792564752733.log`。实际模型改参数、Native几何、基线/反事实测量、战略取舍和最终发布仍待。原合法2000矿170气军表/Plan不手改。

## 本轮 diff 与证据边界

### 实际模型和Native已通过（e6915）

- 请求`16dc38b7de691cab96324a2a3d6698a2317b3bfffae5cf25b1d0ff64ae5fe42f`→回复`315ee944448aa74b3678127966c579e1de5d88735be4da8156ae458190e50977`：模型一次自行把stateRef放外层，原b26eef父场景、两个参测单位和区域逐值保留。无手改答复。
- 本回复44283 units，Provider6.997秒；不含旧账，也不是全部墙钟。
- 实际工具结果`5d95eaad3c3e40df33b393a5374726c9270715911747d97a8344ceb00366fe32`，status=completed、resultStatus=ok、baseStateHash确为b26eef，6联合候选。已发布视图`bd50978cddaf5f1e4054577ec4c82b8c268c7bf79c2462e1d32f0b1bc4c222e3`。
- 这补强P3/P5正确场景的真实纠错证明。候选应用、火力比较和战略采用尚未完成，不能增记最终Plan数量。
- e6979已回到候选选择角色，按真实来源读取候选0。另观察到同比较旧v1/v2 source-revision仍可排队发起调查；作为P2版本隔离待查，尚未判定全部影响范围，不为此改当前测量或删除历史。
- e6987实际应用成功：模型`29687176adab5423a903ccd29941e6f9d300e52e3397b1689846c04a2eb04cbc`（请求`fbc5e58415288585f1b3782e0cca84ff5c058029c1af772b071dd663e92ca3c3`）自主选择候选。工具结果`927a6b958f1c77f04e1d5ccad0597ad788f5a9508fb5642b6d4af791406c36ad` completed，新分支`7ac261b03db6b53d983f9ad648233a8d927f2525430f676bbf56ed63f8014df8`已登记；Goliath与Raptor静态底盘/不重叠/连续性均passed。它是条件快照，不是进场行动或真实比赛；火力／策略尚待。该选择回复56806 units、Provider6.614秒，不能当全流程用量。

源文件仅`roster-workflow-laboratory-v1.mjs`共享分层诊断、`roster-workflow-tool-return-v1.mjs`明确来源缺陷恢复；新增实际失败回放门和本报告，更新入口/TASKS/MEMORY。未提交、未删数据、未开对局、未刷新规则。

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=method→input repair→Native→strategy。工具是既有静态队形接口；agentDecisionEvidence为原工作单/回执。uiTraceEvidence本次无浏览器；memoryTraceEvidence保留原父任务与错误，trainingTraceCandidates=false。回滚/降级条件：任何静默换父场景、自动选参数或重复授同恢复。userVisibleChecks：正式Plan未准出，不能称策略更优。
