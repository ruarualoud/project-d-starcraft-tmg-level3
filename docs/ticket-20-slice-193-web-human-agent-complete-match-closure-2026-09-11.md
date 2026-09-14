# Ticket 20 / Slice 193：Web 人机完整局后端闭环与产品验收

日期：2026-09-11；最终产品与双 Agent 收口：2026-09-14。状态：完成。
Ticket 20：`10/10`；项目：`18/22`。下文保留各轮历史检查点；末尾最终结果覆盖其
当时的开放状态。

## 2026-09-13 产品入口修正

2026-09-11 的完整局门只证明 Room、Hosted Bot、Rules、Skill、Preview/Apply/Replay
与 Battle Lab 诊断投影接通，不能代替产品 UI 验收。用户实际打开后发现演示服务器
把内部 Battle Lab 当成根入口，且根相对 CSS/JS 没有完整静态映射，页面表现为不可
操作的裸黑 HTML。Slice 193 因此重新打开。

当前根入口已改为原 StarCraft TMG Expo 产品 App，Web 顶部恢复 `数据库 / 军表 /
计算 / 对战 / 设置` 五个产品 Tab；对战页内部再分 `战桌 / 副官 / 房间与规则`。
现有军表、单位资料、伤害/对抗计算器继续复用原 TMG 实现；现有权威 SVG 战桌保留
中央地图、缩放/平移、模型选择和右侧单位/行动/威胁/战局/标记/裁判面板。Battle Lab
移到 `/dev/battle-lab/`，只作为诊断入口。

Expo 本地静态导出增加显式开发模式，生产 HTTPS App Link 约束未放宽。Metro 监听
范围从会溢出的全仓扫描收敛到运行时闭包 `packages/ + assets/ + content/`。Web 导出
通过：`1343` 个浏览器模块、`14` 条静态路由。一次同源 HTTP 冒烟确认产品 5 路由、
动态房间路由、CSS/JS、诊断页资源和 manifest 全部为 `200`。一次本机 Chrome 验收
确认五个 Tab 可见，军表与对战可切换，战桌入口可见且控制台无错误；该浏览器验收
没有消费真人一次性席位能力。用户真实操作验收尚未完成，因此不得恢复 `8/10`。

## 交付结果

Slice 193 在冻结的当前官方数据绑定下交付 Marine 对 Zergling、Hold Position 的
Web 人机完整局开发入口。房间加载 Ticket 18 的总规则策略、Terran、Zerg、T→Z、
Z→T 五个正式基础 Skill。人类控制 `player1`；Hosted Bot 控制 `player2`，但其
SeatGrant 只由人类授权的宿主 supervisor 持有，DecisionPort 不接触凭据。

诊断用 Battle Lab 继续保持 `bootstrap/read/dispatch/subscribe` 四操作 Interface。绑定后
读取只读 Hosted Bot 状态；Bot 的权威 revision 超过浏览器 revision 时自动刷新
Room、LegalSpace 和 battle workbench。Hosted opponent 面板显示生命周期、动作数、
决策理由、空间/连续性/计划/意图 hash、Replay 结果和模型 Confirm/Apply=`0`，不显示
SeatGrant、原始 Prompt、私有 reasoning 或 Provider 凭据。

普通阶段和 cleanup 现在共用
`resolveStarcraftTmgEffectiveActingSideV1`：先取 `activeSideKey`，为空时按当前规则器
合同回退 `firstPlayerSideKey`。Hosted Bot 与 TurnPlan 不再各自解释行动方。

本地产品入口：

```sh
npm run dev:ticket-20-human-agent-web
```

命令输出的 `url` 是一次性真人席位产品链接；`diagnosticUrl` 才是 Battle Lab。

## 唯一收口门

针对上一轮具体 cleanup bug，只运行一次完整局复现门并通过：

- 五轮终局；人类席位 `43` 个动作，Bot `37` 个动作；
- 最终 Replay 与当前权威状态一致；
- 精确加载五个基础 Skill；
- Bot trace 含空间 Observation、TurnPlan 和 ActionIntent 证据；
- 模型 Confirm=`0`、Apply=`0`；
- Provider 调用、来源刷新与费用均为 `0`。

先前已通过的 S192 恢复门和 UI 语法门没有重复执行。

## 诚实覆盖边界

该入口为 `current_official_bounded_complete_match_development`。它证明当前有界
Marine/Zergling Hold Position 生命周期可完成，不证明任意军表、交互式建军/部署、
完整 LegalSpace 或真实模型胜率；因此仍保留：

- `legalSpaceComplete=false`
- `productionRoomEligible=false`
- `arbitraryArmyBuilderSupported=false`
- `interactiveDeploymentSupported=false`
- `trainingTruth=false`

## Harness 证据

- `harnessLoopUsed: true`
- `targetGames: [starcraft-tmg]`
- `promptPackRoutes: [opponent_prompt]`
- tools：Room、LegalSpace、spatial observation/action space、same-match memory、
  TurnPlan、Preview、host confirmation、ControlLease、Apply、Replay、Web projection
- `uiTraceEvidence: battle_lab_hosted_opponent_card_and_revision_sync`
- `agentDecisionEvidence: 37 applied-and-replay-verified bot traces`
- `memoryTraceEvidence: continuity/turnPlan/actionIntent hashes`
- `trainingTraceCandidates: []`
- 回滚/降级：关闭 Hosted Bot；Critical/High block；Medium pause；旧 Room 权威不被
  Web 或模型替代

产品人工操作通过后，Slice 194 才开始凯瑞甘 companion 的公开动作/空间差分/意图
推断、多局复盘和反事实控制台；本 Slice 不提前宣称该能力。

## 2026-09-14 产品功能恢复与集成验收检查点

用户指出仅能看到页面外壳、数据库与其他 Tab 不可实际使用，且副官不应占据对战页
内的固定面板。针对这个可复现问题，本轮完成以下产品接线：

- 从已经冻结并校验的官方产品快照生成 `26` 单位、`37` 卡牌、`193` 任务/部署的
  产品目录；精确印刷战斗值保留在 `printedStats`，计算器使用规范化数值。该目录只
  服务浏览/写表/估算，不替代 Rules、房间或训练权威，也不会在开发中自动刷新。
- 军表草稿使用独立产品存储，可创建、保存和删除；Damage、Matchup、Versus、Roster
  四个原有计算面板恢复可操作，设置页显示快照版本与边界。
- 凯瑞甘 companion 改为全局右下悬浮通讯窗；对战页保留 `战桌 / 房间与规则 /
  复盘与 Skill`，不再为副官占一个固定 Tab。
- Slice 194/195 的公开局势分析、人工多局复盘与增量 Skill 保鲜预演已接入产品 Web；
  所有候选仍隔离，发布/回滚需显式操作。
- 写表必须先选指挥卡才允许添加单位。空编队页现在说明该规则并提供返回指挥卡入口，
  避免用户陷入无按钮死路。

受影响 TypeScript 门已通过一次。第一次 Web 导出命令因误用生产模式、缺 App Link
域名而在编译前退出；改用显式本地 `--dev` 模式后静态构建完成并成功启动同源服务。
完整浏览器旅程已验证数据库搜索/单位详情并进入写表合法选卡和加单位页，随后因验收
脚本的宽泛 placeholder 同时命中后台数据库搜索框与当前单位搜索框而停止，产品控制台
没有对应异常。选择器现已收窄为完整 placeholder。

该完整门此前已进行三轮验收夹具收敛。按用户规则，不在没有新一轮授权时继续第 4 次
完整验证，也不把未执行的余下计算器、战桌、Replay、复盘与保鲜旅程标成已通过。
当前仍为 Slice 193 开放、Ticket 20 `7/10`、项目 `17/22`；下一具体交付物是修正后
完整旅程收据，而不是用户先行验收。

### 2026-09-14 长任务恢复后的三轮收敛结果

新长任务按修正后的旅程继续三轮：第一轮证明搜索框已准确进入当前单位选择页，随后
发现 React Native `Pressable` 的编队规格不应由 Marine 标题父节点定位；第二轮改用
按钮 role 后仍未获得稳定 accessible name；在第三轮前统一把文本点击改成“遍历全部
匹配并点击首个可见节点”，同时对齐实际中文产品文案。第三轮已经成功添加 6 模型
Marine 小队并点击保存，只因断言期待历史文案“支军表”，而当前产品正确显示
“1 份军表”而停止。只读源码定位确认军表列表使用 `{armyLists.length} 份军表`，该
断言现已修正为当前真实文案。

本轮没有继续第 4 次执行。下一轮只允许一次完整旅程；如再失败，必须按新的具体失败
决定修产品或登记 blocker，不能重复已通过的数据库/选卡/加单位定位调查。当前统计
仍不变：Ticket 20 `7/10`、项目 `17/22`、Provider/模型调用和费用 `0`。

### 2026-09-14 当前表层命中与计算器检查点

下一收敛周期的完整旅程确认此前军表断言已修复：数据库/详情、创建军表、选指挥卡、
添加 Marine 和保存后持久化均通过。伤害计算器攻击方下拉展开时，Playwright 点击了
数据库页保留挂载的中文“陆战队员”，并被当前工具页 Goliath 行拦截。失败截图与
坐标证明当前下拉本身没有视觉压盖：Goliath、Jim Raynor、Marauder、Marine 四行正常
排列；问题是底层导航节点虽被覆盖仍有 layout box，普通 `isVisible()` 不能表示当前
表层可点击。

验收 helper 已改为通过 `elementFromPoint` 验证候选中心确为当前表层，再点击实际工具
页 Marine。随后攻击方选择成功；第三轮停在防御方，因为该入口仍使用 DOM `.last()`
而不是新 helper，故 Zergling 下拉没有真正打开。两个入口现统一使用同一表层 helper。
同时保留一个待定位产品告警：伤害计算器产生两条 React Native Web
`Unexpected text node` 控制台错误；下轮将记录脚本 URL/行列，不能将它加入 HMR 噪声
白名单。依照三轮上限没有执行第 4 次。Ticket 20 仍 `7/10`，项目 `17/22`。

### 2026-09-14 伤害计算器可用性修复

新周期第 1 轮截图证明攻击方详情会把防御方选择器推到内部 ScrollView 的长列表下方，
用户必须越过所有升级才能选择目标。Damage 面板现把攻击方和防御方的阵营、单位与
编队规模并排置顶，窄屏自动换行但双方基础选择仍先于升级/武器详情；双方 UnitPicker
具备独立 testID、按钮 role 和精确 accessible name。验收不再跨页面查找节点。

Marine 的空 `keywords` 以前由字符串短路直接成为 `<View>` 的空文本子节点，造成两条
React Native Web `Unexpected text node`。武器 `surge/keywords` 现先转 Boolean；唯一
TypeScript 门和 1420/1428 模块、14 路由 Web 导出通过。第 2 轮确认控制台产品错误为
`0`，双方布局可见；只因 `Marine` 的非精确 accessible name 同时匹配
`Raynor's Raider (Marine)` 而停止，随后收窄为 exact。

第 3 轮已精确选择 Marine 与 Zergling 并计算结果，失败仅因 Damage 面板真实标签是
`总伤害 / Total Damage`，而验收沿用了 Matchup 面板的 `总期望伤害 / Total Expected
Damage`。断言现按所属面板修正。依三轮上限不再运行第 4 次；当前 Ticket 20 `7/10`、
项目 `17/22`，下一周期从已生成的当前 Web 包执行一次完整旅程。

### 2026-09-14 对抗计算器真实操作与第三轮停止点

新周期第 1 轮确认 Damage 的所属面板断言已正确，但原旅程只切换到 Matchup Tab 就
要求结果标题；产品只有在双方单位都被选中后才会产生该分析。Matchup 现与 Damage
一样将双方阵营、单位、规模置于响应式双列选择区，并为 A/B UnitPicker 提供独立
testID 与 accessible button。门禁改为真实选择 Marine 和 Zergling 后检查双向三池结果。
唯一受影响 TypeScript 门通过，1419/1428 模块、14 路由的本地 Web 导出通过；第一次
导出曾因命令误把 `build/` CSS 传入 Ticket20 有意收窄的 Metro watchFolders 而失败，
改用 Expo 根内默认 `global.css` 后成功，没有修改依赖或扩大监听范围。

第 2 轮截图证明 Marine→Zergling、Zergling→Marine、武器拆解、预计伤害/击杀与结论
均实际渲染；失败仅为 verifier 使用了不存在的中文“预计每轮总伤害”，现对齐产品
“总期望伤害”。第 3 轮继续通过此前功能并停在 Versus：原门禁仍在没有选择双方单位
时要求条件渲染的“武器概览”。产品控制台与 page errors 均为 `0`，只有本地静态服务
没有 HMR endpoint 的 `/hot`、`/message` WebSocket 404 开发噪声。

依照同一 review/audit/验证循环最多三轮的要求，本周期到此停止，不修后继续重跑。
下一具体交付物是让 Versus A/B 选择器具备稳定作用域并真实选择双方单位，再用一个
新周期完成剩余 Calculator、Settings/语言、全局悬浮副官、房间/地图/模型/威胁、
Preview/Apply/Replay、四局合并复盘与五个受影响 Skill 保鲜预览。Slice193–195 继续
保持集成未收口，Ticket20 `7/10`，项目 `17/22`；Provider/模型/来源刷新/费用均为 0。

### 2026-09-14 Versus、骰子与语言切换第三轮停止点

新周期将 Versus 的双方基础选择同时提升到顶部响应式双列，A/B 均保留从军表导入、
阵营、单位和规模入口，避免先滚过 A 方完整升级/状态/武器详情才能选择 B 方。两方
UnitPicker 和面板均有独立可访问作用域，产品旅程真实选择 Marine/Zergling 后通过
武器概览、阶段对比和详细对抗。首轮发现面板 testID 被补丁误放在 DicePanel，截图
证明产品布局正确；归属修复后，TypeScript 与 Web 导出各通过一次。

第 2 轮继续通过 Versus 和军表分析，停在现有骰子 Pressable 缺少 accessibilityRole；
按钮现有正式 button role 和包含当前骰池的 label。对应 TypeScript 与 Web 导出各通过
一次。第 3 轮完整通过数据库/详情、军表创建与持久化、Damage、Matchup、Versus、
军表分析、真实投掷和投掷历史，随后停在语言断言。失败截图明确页面已切换为英文并
显示大写 `OFFICIAL SOURCE INTEGRATION`，但 verifier 使用大小写敏感的字符串
`includes("Official source integration")`，因此这是验收断言错误，不是语言功能失败。
产品 console/page errors 仍为 0；只有本地静态服务 HMR WebSocket 404 开发噪声。

按三轮收敛上限，本周期不再修断言或运行第 4 轮。下一周期只把语言断言改为大小写
不敏感，然后继续全局悬浮副官、一次性房间恢复、地图/模型/威胁、Preview/Apply/
Replay、四局合并复盘和五个受影响 Skill 保鲜预览。Ticket20 保持 `7/10`、项目
`17/22`，外部模型/Provider tokens 与费用仍为 0。

### 2026-09-14 设置、副官与战桌公开单位身份停止点

新周期先将英文来源标题断言改为大小写不敏感，未重跑 TypeScript/Web export。第 1 轮
完整通过设置中英切换和全局悬浮副官，并用一次性 recovery token 进入权威房间；随后
暴露角色展示 endpoint 404 和地图下模型无法按 `Marine · player1` 选择。Demo 房间现
显式开启已有 `development_internal` Character Presentation Runtime，第 2 轮确认该
404 消失、产品 console/page errors 为 0。模型选择也从仅检查当前 viewport 的文本
helper 改为精确模型列表项自动滚动，但第 3 轮仍没有该标签。

停止后的只读权威房间查询给出根因：player1/player2 棋子的安全 viewer projection 中
`name` 都为 `null`。V3 投影有意只允许公开 `unitName`、`unitId`、
`officialUnitRecordKey`，而 Demo fixture 只设置了会被丢弃的 `name`，未设置 unitId；
因此 Battlefield Presentation 回退到技术 pieceId，并且媒体目录无法解析 Marine/
Zergling 头像。这是产品投影数据合同缺口，不能靠放宽 selector 掩盖。

本周期三轮已满，未继续修复。下一具体交付物是在 fixture 的公开棋子字段中同时写入
`unitName=profile.name` 与 `unitId=profile.recordKey`，保留现有官方 record/hash 绑定，
再验证战桌显示真实名称、头像、模型选择和威胁。其后继续 Preview/Apply/Replay、四局
合并复盘和五 Skill 保鲜。Ticket20 保持 `7/10`，项目 `17/22`；Provider/模型/来源
刷新/tokens/费用均为 0。

### 2026-09-14 公开单位身份、权威时钟与异步 Bot 回放停止点

新周期确认官方战斗档案的名称字段实际为 `profile.unitName`，不是不存在的
`profile.name`。Demo fixture 现把 `unitName` 与允许公开的 `unitId` 一并写入棋子；真实
产品旅程已显示、滚动并选择 `Marine · player1`，Marine 通讯头像、威胁开关和 Actions
面板均可操作。

第 2 轮暴露真实 `PREVIEW_RESPONSE_INVALID`：外接 Rules Runtime 成功返回 Hold，但
权威引擎未像内置执行器一样统一推进 `postGameClock.transition`。权威接缝现在对所有
Rules Runtime 结果统一写入下一 revision 的确定性日志/时钟身份；第 3 轮已生成有效
Preview、由真人确认并应用。应用后产品停在 `REPLAY_RESPONSE_INVALID`。停止后的只读
回放证明房间已经依次接受 Marine 与自动 Bot Zergling 两个 Hold，权威状态为 revision
2、`appliedCount=2`、`matchesCurrent=true`；因此当前明确剩余缺口是异步 Bot 在人类 Apply
后的客户端投影/Replay 对齐，而非动作未写入或规则器失败。按三轮上限不再运行第 4 轮。

下一具体交付物是让 `readReplay` 在服务端回放 revision 超前于本地投影时先做一次权威
投影 catch-up，再按既有严格合同验证同一回放；不能放宽 Replay 完整性。随后继续四局
合并复盘、两个隔离 SkillOpt 候选和五 Skill 增量保鲜旅程。Ticket20 保持 `7/10`、项目
`17/22`；本周期 Provider/模型/来源刷新/token/费用均为 0。

## 2026-09-14 最终产品旅程与原始范围收口

客户端 `readReplay` 现只在返回的 Room/game/match binding 全部匹配且服务端
`stateRevision` 严格领先于当前投影时做一次权威 projection catch-up，然后仍执行原有
严格 Replay 校验；不会接受旧回放、错房间或错绑定。对战页的 `战桌 / 房间与规则 /
复盘与 Skill` 子导航已移出纵向滚动区，保持战桌优先且无需滚到底部切换。

最终一次真实 Playwright 产品旅程全部通过：

- Database 搜索与详情；
- 军表创建、指挥卡、Marine 加入、保存与刷新后持久化；
- Damage、Matchup、Versus、Roster 与真实骰子历史；
- 设置中的中英文与官方来源信息；
- 全局右下悬浮凯瑞甘副官；
- 一次性席位恢复、地图/Marine 头像与模型选择、威胁开关；
- 人类 Preview→确认→Apply、异步 Bot Apply 与严格 Replay；
- 四局人工合并复盘、两个隔离 SkillOpt 候选、五项 Skill 增量保鲜预览。

产品 `consoleErrors=[]`、`pageErrors=[]`；仅本地静态服务器没有 HMR endpoint 的
`/hot`、`/message` WebSocket 404，不属于产品错误。最终截图：
`build/ticket-20-product-web-user-journey-v1/final.png`。

原始 Ticket 20 还要求 A-A 编排，不能由上述 H-A 产品旅程冒充。新增深编排模块后，
独立聚焦门又完成 `1/1` 双 Agent 五回合终局：80 个原子动作（Terran 43 / Zerg 37）、
第 8 动作暂停、同局重连后续跑、每动作与最终 Replay 一致、双向三 Skill 路由、空间/
记忆/计划/意图证据齐全、阻塞发现 0、自动晋升 false。详见
`ticket-20-slice-193-agent-agent-complete-match-closure-2026-09-14.md`。

因此 Slices 193、194、195 同时完成，Ticket 20 为 `10/10`，项目为 `18/22`。本次
最终收口没有刷新来源或调用模型，token `0`、费用 `¥0`；真实模型胜率、任意军表和
生产资格仍明确留给后续 Ticket，不能从开发用确定性决策端口推导。
