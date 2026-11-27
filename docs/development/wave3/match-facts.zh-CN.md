# 正式对战事实清单

本页记录产品能力的适用条件、变更原因和证据。进度数字统一从[实施清单的 matchWiring](../../../coordination/wave3/implementation-plan.json)读取。两局当前动作分别见 [500 分原房](../../../build/ticket-28-wave3-human-lobby-v1/skirmish.public.json)和 [2000 分原房](../../../build/ticket-28-wave3-human-lobby-v1/standard.public.json)。

| 编号 | 可核对的事实和适用范围 | 证据 |
|---|---|---|
| F01 | 11 月 9 日的产品已经支持从网页建房。旧入口接官方 Standard 2000 工厂，当时展示 Hold Position、Gauntlet、standard-d6-1。旧双人房的第二席合法 Pass 后，第一页实际从 r2 显示到 r3。 | [原始集成约定](../../ticket-23-slice-248-product-integration-2026-11-09.md) · [双客户端观察](../../../build/starcraft-product-integration-20261109/ui-revision-sync-result.json) · [旧大厅实测](../../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/lobby-ui.public.json) |
| F02 | 旧产品入口对 500 分请求返回 HTTP 500，房间数量仍为 0。这次拒绝发生在军表规模校验。Wave3 的规模配置标识现由大厅提交，Host 据此选择工厂；显式选择的两个新预设用于双人模式。 | [修改前请求与房数](../../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/lobby-api.public.json) · [大厅](../../../apps/starcraft-tmg-expo/components/battlefield/product-match-lobby.tsx) · [服务端分流](../../../scripts/support/starcraft-product-room-host-v1.mjs) |
| F03 | 原生 Room 已创建时，客户端还会分别核对房间编号、签名绑定标识、席位可见范围和精确字段。Wave3 给公开绑定增加了发布、来源、数据与运行规则的摘要；旧客户端的静态字段表未收入 releaseBinding，因而可拒绝服务端成功返回的棋盘。这个拒绝发生在进入战桌时。 | [权威发布绑定生产者](../../../packages/source-data/official-release-context-v2.mjs) · [客户端核对](../../../packages/client-domain/client-domain-v1.mjs) · [原房正反例](../../../build/ticket-28-wave3-human-lobby-v1/viewer-contract.public.json) |
| F04 | 新房构造还曾遗漏角色展示读取能力，造成共用副官适配器装配失败。Wave3 房间现沿用旧产品的角色读取配置。这个证据只覆盖装配和进入战桌，副官真实对话另行验收。 | [房间装配](../../../packages/product-composition/wave3-human-match-v1.mjs) · [具名失败与随后玩家进入](../../../build/ticket-28-wave3-human-lobby-v1/skirmish.public.json) |
| F05 | 两个 Wave3 双人预设分别绑定 Skirmish 500／Gather the Resources／Power Lines 和 Standard 2000／Fire in the Sky／One Bridge Too Close。两个独立浏览器取得两个席位，房主刷新复入，双席凭证分别提交部署。实测地图有 1,031 和 1,804 条地形。Standard 的 2000 是预算，上场示例双方分别花 290 和 400 矿。 | [预设](../../../content/wave3-human-match-setups-v1.json) · [玩家入口与两房证据](../../research/ticket-28-wave3-human-lobby-and-match-coverage-2026-11-25.md) |
| F06 | 房主在浏览器进入并刷新，第二个浏览器用邀请链接进入。邀请签发、部署和阶段推进走各自人类席位的正式 HTTP 接口。部署后，脚本在允许处选择 Pass，逐次签名推进回合。覆盖回合交替与任务清理；只有实际记录到的破坏、取得资源、战斗或得分效果才计入对应专项。互斥任务、未出战的单位、原生移动端、AI 消费者分别登记。 | [端到端执行脚本](../../../scripts/verify-wave3-human-match-lobby.mjs) · [26 项准出要求](../../../coordination/wave3/implementation-plan.json) |
| F07 | 同一冻结数据可对应不同的执行版本。抽查的 2.3、2.19、2.84 三个候选中六张任务卡内容相同，任务运行时摘要有差异。每次复用旧计分或特殊动作证据时，保留原版本和覆盖的具体行为。 | [冻结来源和行为边界对照](../../../build/ticket-28-wave3-human-lobby-v1/mission-compatibility.public.json) |
| F08 | Room 发布公开绑定和 Web/App 客户端验证顶层字段共用一份清单。旧房可以没有 releaseBinding；有这个字段时，客户端还检查六个内层字段、四个摘要的格式，以及运行时摘要与房间规则绑定相等。 | [共用公开字段](../../../packages/client-domain/viewer-projection-v3.mjs) · [房间生产者](../../../packages/room-runtime/in-memory-room-v1.mjs) · [实际棋盘与三个拒绝对照](../../../build/ticket-28-wave3-human-lobby-v1/shared-binding-contract.public.json) |

| F09 | 清理阶段允许 activeSideKey 为空。原双规模验收在 r14 按这个字段找凭证而退出。现在按当前 revision 读取两席的公开合法菜单，由有资格的一席预览和提交。两间原房均已签 r15 判定控制和 r16 计分，可按动作序号复核。 | [逐席执行](../../../scripts/verify-wave3-human-match-lobby.mjs) · [Skirmish 原房](../../../build/ticket-28-wave3-human-lobby-v1/skirmish.public.json) · [Standard 原房](../../../build/ticket-28-wave3-human-lobby-v1/standard.public.json) |

| F10 | 11 月 9 日的双人房在 r3 绑定旧 Standard 执行器。原始来源、军表数据和地图依赖通过核对；服务端重连时重新装配的执行器清单不同，首次失败于 executorArtifact。只还原旧入口仍然不同；从 aa4e3ac 取回入口及依赖时，能力清单和房间规则摘要均精确匹配。仅用该 Git 版本时，前两步精确，第三步 Pass 的棋盘、事件和所选动作相同，但当时可选动作的摘要不同。11 月 9 日的部署菜单逐单位返回人口是否足够。加入当天留存且校验值匹配的空间执行器后，原三步的菜单、动作、棋盘和事件全部吻合。产品在开放此类旧房前校验原签名动作。隔离副本已通过现版产品重连和客户端回放，原席位、r3、规则、状态及链尾与只读原房相同。归档随服务端交付，由现有仓库和指定留存源码可重复构建，用户重连时无需 Git。 | [同名执行器对照](../../../build/ticket-28-wave3-human-lobby-v1/existing-product-room/historical-runtime-diagnostic.public.json) · [仅还原入口](../../../build/ticket-28-wave3-human-lobby-v1/existing-product-room/archived-runtime-diagnostic.public.json) · [冻结依赖核对](../../../build/ticket-28-wave3-human-lobby-v1/existing-product-room/archived-closure-diagnostic.public.json) · [旧包逐步回放差异](../../../build/ticket-28-wave3-human-lobby-v1/existing-product-room/october-only-replay.public.json) · [11 月 9 日部署源码清单](../../../build/systematic-repair-20261109/four-room-rewind/code-snapshot.json) · [归档构建及指纹](../../../scripts/build-legacy-standard-room-runtime.mjs) · [修复后三步复算](../../../build/ticket-28-wave3-human-lobby-v1/existing-product-room/replay-diagnostic.public.json) · [产品重连及回放结果](../../../build/ticket-28-wave3-human-lobby-v1/existing-product-room/result.public.json) |

## 玩家操作与工具对照

| 编号 | 实际操作及可复用的范围 | 证据 |
|---|---|---|
| F11 | 在 2.84 的两个隔离签名房中，从双方部署后的 r6 推到突击选择。500 分由三名 Medic 集体 Run，2000 分由两名 High Templar 集体 Run。玩家提交前，实战空间工具核对全路径和队形。两组工具给出的动作摘要均与 r10 原生签名一致，各底座按预期平移 0.5 英寸。两房之后都能结束激活。该操作走人工席位的 Room 接口。大厅连续性脚本此前优先 Pass，其原房记录仅覆盖实际发生的动作。 | [500 分签名与落点](../../../build/ticket-28-wave3-human-lobby-v1/signed-movement/skirmish/applied.public.json) · [2000 分签名与落点](../../../build/ticket-28-wave3-human-lobby-v1/signed-movement/standard/applied.public.json) · [验收选项优先级](../../../build/ticket-28-wave3-human-lobby-v1/signed-movement/functional-menu.public.json) |
| F12 | 2.66 的圣堂武士两回合五次施法，逐次支付 0、1、1、0、0 PE，29 签冷回放一致。2.72 的哨兵守护之盾和力场各扣 1 PE，五签后交还对手。两项均可复用来核对对应版本的支付条件。新卡、触发顺序或消费端有差异时，在受影响的支付边界补验。 | [圣堂五次支付](../../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-payment-v265/result.json) · [哨兵施法](../../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/sentry-field-standard-2.72/result.json) |

两房均已用原 r6 签名检查点冷重放到 r10，并核对验收脚本在实际 r9 菜单中选出的走位。第一次冷验给回放器传了状态信封，随后在小规模对照中发现验收脚本直接比较了玩家输入与含默认字段的原生回执。修正检查点类型及参数比较后，只读已提交的动作完成恢复核对。[500 分冷回放](../../../build/ticket-28-wave3-human-lobby-v1/signed-movement/skirmish/result.public.json) · [2000 分冷回放](../../../build/ticket-28-wave3-human-lobby-v1/signed-movement/standard/result.public.json)

### F13–F15 · 2.84.0

- F13　两个双人工原房各 81 步，第 5 回合 0–0 平局，冷回放及桌面、手机网页赛果一致。
- F14　M15～M19 在有单位的条件场景中直接检验控制、携带与掉落、破坏、收集及任务阈值。
- F15　Standard 的五组势力抽样中四组进入移动阶段。Khassar 三种反应和 Medic 在敌方自动命中时的反应分别有正式工厂拒绝记录。

[逐房、条件场景和拒绝详情](../../research/ticket-28-wave3-match-functional-coverage-2026-11-25.md)

## 维护方式

变更产品入口、版本绑定、席位可见性、任务或判定范围时，先找到对应编号。验收后在原行写清适用发布、规模、模式、生产者、实际消费者和原始证据。新能力或独立故障另增编号；推翻旧结论时保留旧证据并标出由哪一项取代。正在运行的轮次只链接原房。需要宣称准出时，同步更新实施清单中的对应 M 项，并写明仍缺的动作或消费者。

## 候选 2.85 的混合军表

五个 Standard 对阵覆盖十个势力，原先两份被拒军表均可开局。正式地图的奇数宽度地形格原会误拒风暴投放，已与移动规则共用整数坐标转换。M06 跨版本签名证据含真实选购、主动支付、反应耗卡和回合刷新。[建房、支付及混合反应进度](../../research/ticket-28-wave3-mixed-reaction-match-285-2026-11-25.md)

- F16　使徒受委派射击蟑螂后，旁边刺蛇实际取得 Lunge 资格。2.85 的放弃分支在 r7 通过冷恢复。2.87 在同一 r6 的发布运行时验证发动，按实际提交移动两只刺蛇，再结算使徒的 3 点非致命伤害。签名状态分别登记。[原 r6 放弃](../../../build/ticket-28-wave3-human-lobby-v1/mixed-reactions-285/khassar/qualified-action/pass.public.json) · [2.87 发动结算](../../../build/ticket-28-wave3-human-lobby-v1/khassar-grid-leader-287/product-step.public.json)

### F16 后继与 F17 施法顺序

Khassar 在候选 2.87 的同一 r6 来源正式签出一次发动，完整冷回放通过。M13 的同一施法席位在 r12 同时看到 Gale 与 Storm，先选 Gale，20 笔签名经冷回放到近战阶段。[Khassar 回执](../../../build/ticket-28-wave3-human-lobby-v1/khassar-grid-leader-287/signed-use.public.json) · [两种法术的顺序](../../../build/ticket-28-wave3-human-lobby-v1/simultaneous-storm-gale-287/result.public.json)

### F18 委派射击中的人口反应与 F19 破坏者入场

- F18　使徒击杀两名狂热者，人口 2→0。防守方暮光圣堂武士据此刷新 Gateway，使徒再受 3 点非致命伤害，原高阶圣堂武士恢复激活。四签冷回放一致。[2.87 房间](../../../build/ticket-28-wave3-human-lobby-v1/khassar-supply-287/result.public.json)
- F19　选购 Burrow Ambush 的破坏者在 2.87 建房时被拒；2.88 按已审核的来源补入入场能力。原军表 47 项全部准入，破坏者从预备队实际部署，行动权交给对手，三签冷回放一致。三张军表合计覆盖 51/51 个虫族新增定义。[入场和覆盖明细](../../research/ticket-28-wave3-khassar-supply-and-reserve-ambush-2026-11-25.md)

## 2026-11-25 Ticket28 / T28-W3-11 正式对战增量验收

两规模特殊入场与多目标近战已验证。唯一争点方即使人口为零仍可控制任务点。新的 2.89 候选可接收雷诺单独的 Freedom Fighters。赛前及实战概率查询读同一局面可得到相同分布。 [逐项记录](../../research/ticket-28-wave3-match-incremental-pass-2026-11-25.md)

## 2026-11-26 虫洞、冲锋减速与投影换位

虫洞本地额度耗尽时全局仍可有剩余额度。其侦测从后续回合生效，Nova 实际移入后已被移除隐形。普通劫掠者减速 2 的实际冲锋后继、使徒整队换位后的清除与先手后继均已冷恢复。正式对战 21/26。[逐项证据及剩余缺口](../../research/ticket-28-wave3-match-remaining-six-2026-11-26.md)

## 11 月 26 日 · 增量事实与正式工厂

新增逐定义事实索引：240 条来源相同，12 条有字段变化，162 条新增。两份同名清单的部署几何有差异，涉及地图的证据必须关联清单哈希。 [详细验收](../../research/ticket-28-wave3-match-increment-facts-2026-11-26.md)

- F20　2.99 隔离人人候选通过 47 项神族正式军表建房；从预备队特殊入场能触发过载星核，3 次自动命中经护甲结算，原房 r5 冷恢复一致。[实签回执](../../../build/ticket-28-wave3-human-lobby-v1/remaining-six/photon-reserve-on-human-map-299/result.public.json)
- F21　正式 Match 25/26。414 条稳定定义可逐项追溯。人工、决策工具和独立规划使用绑定的发布与地图。M25 原生设备另列。[本次证据与范围](../../research/ticket-28-wave3-match-increment-facts-2026-11-26.md)
- F22　2.99.12 本机网页双人测试通过。两席使用同一套规则，自编军表保留升级，结束激活只交给该单位所属席位。500 分房间可开；2000 分房间操作至 r4 并由两端重连。M25 仍等设备。[双人验收](evidence/T28-W3-web-human-staging.zh-CN.md)
