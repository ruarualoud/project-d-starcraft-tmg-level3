# Ticket 28 · W3-10／11 · 旧能力接线缺口归因

## 发生在哪一层

| 缺口 | 现象 | 根因与证据 |
|---|---|---|
| Wave3 发布装配遗漏 | 官方数据和旧能力都在，正式工厂却报告所选能力未登记。 | Wave3 为隔离冻结发布建立了新装配。别名只迁移定义身份，执行归属仍由各能力族显式选择。旧权威目录的 27 个抽样定义均已登记为 `executable_exact`。Standard 与 Skirmish 使用同一个新版装配器，换军表或入口只会改变暴露项。Queen Psionic Link 还暴露了第二次装配的问题：第一层已登记，但 Native Match 重建目录时漏掉 Queen 自动消费者，v2.11 已补。 |
| 旧执行缺陷被升级暴露 | 旧能力有登记，特定局面下仍可能漏校验。 | 旧 Omega Network 落点用可激活目标筛选，漏掉敌方 Structure。旧 Ventral Sacs 的通用信标落点要求领队中心重合，且该分支没有接同一部署 Supply 与影响区审计。旧 Roachling 专用召唤绕过部分通用 SUMMON 校验，召唤物还缺后继识别的来源字段。三项在各自报告单独留证。 |
| 提交后规则遗漏 | v2.11 隔离 Match 完成 Ventral Sacs 落地试算，敌方菌毯仍在。 | 普通空间动作会调用菌毯后继。特殊 Deploy 经战场资产适配器回到 Match，跳过了这个调用。v2.12 复用同一后继，检查实际入场事件后再清理。近端移除、超距保留、放弃保留和签名冷恢复已有证据。 |
| 覆盖统计误报 | 主样例一度显示 Marine Strike、Goliath Hellfire 为有效义务。 | 按卡面默认装备和购买的升级取并集，会把已完全替换的默认武器留下。v2.4 起按实际逐模型装备统计。主样例 Strike 已被 Bayonet 替换，Hellfire 已被 Haywire／Scatter 替换。原装 C-14 仍使用既有射击执行器。 |

这些工程缺口与验收输入应分开归因。验收夹具也曾有独立错误，例如摆位越出队形圈，以及直接调用 Match 漏传开房绑定。这些错误解释对应的验证停顿。Ventral 菌毯问题在修正这两处夹具并使用真实开房绑定后仍然复现。失效因果来自 v2.11 保存状态和 v2.12 签名回执。

## 同类影响追踪

| 范围 | 实际结论 |
|---|---|
| 两种规模与其他可选军表 | 已保存的 27 项对账跨九类执行归属，涉及 Armed and Ready、Go! Go! Go!、Timing Push、Field Repair、Ancillary Carapace、Supply Depot、阵营能力、反应与召唤。已登记的主 Standard 为 114/115，剩 Hydralisk Lunge。该数字以当前主样例为分母，全冻结发布仍需逐条对账。 |
| Ready For Dust-off、战术卡 Warp Conduit | 源码把两者接到与旧 Ventral 共用的回合末部署信标族。通用消费者仍检查中心重合，并发出特殊 Deploy 事件。v2.12 的菌毯交接只匹配 Ventral 的定义 ID。两张卡应按各自冻结文本核对接触、Supply、影响区和后继，并在可开房发布上验证。 |
| Pylon 的 Warp Conduit | 旧 Pylon 部署分支走生命周期执行器，具体动作与单位底盘接触，不读取信标中心。该分支也发相同特殊 Deploy 事件，源码未见调用通用菌毯后继。新版实际选用路径、入场近端／远端的行为还需要签名对照。 |
| Omega Worm、Rapid Ingress、Adept Shade | 新版虫洞入口已走普通 Deploy 并有每轮 2 Supply 门，旧落点跳过建筑的问题另行修正。Rapid Ingress 使用其他生命周期入口，尚欠合成验证。旧 Shade 发的是 PLACE 后继，规则明示 PLACE 不触发该菌毯移除。不要把入场补丁扩到所有棋位变化。 |
| Lunge 与其他反应 | Lunge 在旧目录有精确登记，但已查旧正式远程路径未见射击结算后打开窗口的证据。当前只有真实远程计划的 10 英寸资格与组件开窗证据，尚无正式守方菜单、最短 Move、恢复激活和冷回放。Vile Saliva 的投骰前父子链已有签名证明，其和模板／Overwatch 的叠加仍待。 |
| 生成物、被动及独立资料缺件 | Queen、Omega Worm、Roachling 和 Supply Depot 表明开局军表覆盖无法替代自动效果、生成物和后继证明。三张部署卡缺真实几何，系来源缺件，另行追踪。 |

## 后续验收

1. 以本次冻结发布和原发布的稳定定义 ID 对账，明确每条继承者的实际执行器、装配位置及待接义务。若数据没有变化，沿用旧原子。把换装排除的义务和未实现项分别记录。
2. 对普通 Deploy、特殊 Deploy、PLACE 先按规则和同发布实际路由分类。确认实际提交和对象身份后复用公共后继。正向近端、远端、放弃、不触发的 PLACE 及重复提交各自检查，确保生效一次。历史运行时按已存绑定重建。
3. 正式开房检查登记、Native 目录、父事件、合法菜单、实际应用、后继和冷恢复。按执行族补齐可到达的自动效果及生成物，现有已通过边界可引用。在 W3-11 核心内容收口后，再验证 Web/App 与 Agent 消费。

本轮做源码和已有证据交叉核对，未修改规则代码、未重跑验证、未调用模型。Ticket28 / W3-10、11，实施 2/16，剩 02、03、05–16。

- [27 项旧目录对账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-hydralisk-inherited-binding-audit.public.json)及[两个工厂和旧执行分支](ticket-28-wave3-inherited-ability-admission-audit-2026-11-22.md)。
- [实际装备分母](ticket-28-wave3-effective-equipment-admission-2026-11-22.md)及[Queen Native 目录](ticket-28-wave3-queen-native-creep-deploy-2026-11-23.md)。
- [旧 Ventral 信标消费者](ticket-28-wave3-ventral-sacs-2026-11-23.md)、[Ventral 菌毯前后对照](ticket-28-wave3-ventral-creep-deploy-2026-11-23.md)及[Lunge 资格证据](ticket-28-wave3-lunge-trigger-2026-11-23.md)。
- [发布准入与执行绑定](../../packages/product-composition/official-release-room-ability-admission-v2.mjs#L255)、[普通空间动作后继](../../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs#L2389)、[Match 特殊 Deploy](../../packages/product-composition/official-current-product-match-runtime-v1.mjs#L1141)及[旧信标和 Pylon 的特殊 Deploy](../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs#L1922)。

## Lunge 源头复核与模板射击补齐

旧 Slice 236 把 Lunge 编译为 `after_ranged_attack_resolved` 与 `followup_move_towards_attacker`，但验收由调用方构造触发，具体演示是 Dae’Uhl 减伤。Slice 243 的 252 条聚合门核对了登记，并选 Marine 的 C-14 和 Strike 做实际提交与重放。聚合门未要求每个触发族由正式父动作发起。按这两个触发和效果的代码标识核到正式消费端后，Lunge 当前只有适配器及数值射击回执的资格事实。缺少正式射击后开窗和位移消费属于旧开发与验收缺口；最近四次夹具失败是独立问题。

新版数值射击和模板射击各有结算入口。模板中每个批次都发出 `ranged_attack`，中间还可能挂起选伤亡。直接以该事件开窗会提前触发。现从实际模板声明提取主目标、声明哈希和符合 10 英寸条件的 Hydralisk，把事实保存到模板检查点，直到最后一个批次结算才在 `ranged_weapon_completed` 上发布一次，并关联主批次的攻击与伤亡结算哈希。溅射批次未被纳入主目标资格。

复用实际 Siege Tank 的棋位与冻结规则。在隔离组件中用正式菜单声明，先结算 Corpser 主批次，再序列化待处理状态，续到 Queen 溅射完成。主批次没有发布触发事实，最终事件只发布一次。超距和未选 Lunge 的对照均不产生资格。测试中的对照运行时与新分支使用相同选项；历史保存的 1.5.0 房间没有重跑。旧动作和无新版 Lunge 来源的模板仍走原描述符分支。此项止于原生攻击组件的实际结算，守方正式菜单、支付与放弃、§4.5 最短合法路径及队形、交还射手、签名冷恢复仍待。

| 进一步核对的路径 | 结论 |
|---|---|
| Zealot Charge、Queen Psionic Link | 已确认的两层迁移漏接。Zealot 同源执行器未被新版准入纳入，v2.14 补绑定并签名验证双骰。Queen 已通过准入却在 Native 目录重建时遗失自动消费者，v2.11 补齐。 |
| Debilitating Saliva | 射前反应使用独立的声明拦截器。数值射击已有签名。源码也为已启用的模板攻击保留声明拦截入口，组合用例与 Overwatch 仍需具体验证。 |
| Nova Operational Efficiency | 同样在射后处理，但组件明确调用独立的卡牌刷新消费者；Lunge 的窗口缺失不能推导出 Nova 同失效。 |
| Warp Prism Warp Conduit | 前表的风险已在 v2.15 的实际回合末部署与下一轮 Phase 中验证，涵盖近／远菌毯、放弃、Supply 及六条签名冷恢复。Ready For Dust-off 和 Pylon 仍需按各自路径对照。 |
| Dropship Ready For Dust-off／Strap in! | v2.16 已验证信标边界、落地、Supply、收回时序和 17 条签名冷恢复。客观测试还确认旧的通用能力窗口允许行动后能力，现对这条「替代行动」路径增加专用限制。Pylon 仍待其独立分支。[实测](ticket-28-wave3-dropship-signed-lifecycle-2026-11-23.md) |
| 生成单位 | Roachling 已有新版候选的联动、Claws、禁止 Burrow 与相应签名片段。Omega Worm 的落点与回收已有候选证据，部署和 Detection 的正式组合尚待核定。 |

后续验收按每个触发族关联正式父动作和真实消费者。任何组件层的 `executable_exact` 保留为登记证据。合并军表、生成物以及自动后继仍须走同发布的真实合法域、试算、提交、交权和重放。

- [原反应组件验收](../ticket-23-slice-236-current-product-reaction-family-closure-2026-09-14.md)、[旧聚合准出依据](../ticket-23-slice-243-current-product-ability-aggregate-closure-2026-09-15.md)。
- [模板两批次的实际结算证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-template-completion-component.public.json)、[模板结算源码](../../packages/product-composition/official-blast-template-attack-runtime-v1.mjs)与[射击资格快照](../../packages/product-composition/official-reaction-family-adapter-v1.mjs#L1225)。
- [Warp Prism v2.15](ticket-28-wave3-warp-prism-signed-continuation-2026-11-23.md)、[Roachling 后继](ticket-28-wave3-roachling-linked-actions-2026-11-22.md)、[Vile 射前反应](ticket-28-wave3-debilitating-saliva-2026-11-23.md)。

## Khalai 整卡和旧付款覆盖

正式 v2.17 已验证 Pylon 生成限制、同房回合解锁、Cleanup、Bound 连锁、Pylon 入场及 25 条签名冷回放。另有一处经产品复现的旧付款覆盖问题：组件的 Pylon 报价函数正确，Blink 的移位适配器此前绕过该函数。统一报价和消费后，本轮 0 PE、同轮下一笔 1 PE 的实际回执均正确。按七条付款消费路径核对影响，记录未验证的组合，不将同族全部记为通过。[Khalai 原因、影响面和签名证据](ticket-28-wave3-khalai-signed-lifecycle-2026-11-23.md)。

## 射后反应交接的定点反例

**两个独立工程原因。** 旧版 Slice 236 的反应结果由调用方构造触发，代表用例是 Dae’Uhl。Slice 243 把注册完整与 Marine 的两个原生动作通过合并为聚合准出。Lunge 的真实射击父事件和最终 Move 未参加该准出。Wave3 的独立装配另有依赖遗漏，两个问题在同一个开房失败中汇合。

当前候选 3.191.0 另有可复现的交接缺口。Lunge 在最终装配中只认最后一条日志，也要求没有别的未关反应窗。利用已保存的真实数值伤亡结算，原样能开反应窗。增加已保存的后续日志后，合法攻击事件仍在当前提交区间，但原逻辑返回空。单独置入一个已挂起的反应窗口，原逻辑也返回空且未保留原射击绑定，关窗以后无法再触发。以上是隔离组件反例，验证夹具以已存结果构造条件，没有将人工重叠当成真实对局。

隔离绑定 3.192.0 在本次提交范围核对原生日志和攻击结算，将等待中的触发、原攻防和激活绑定一并保存。原窗口仍由原消费者接管，结束即以当前棋位和资源重判 Lunge。用已保存的单模型条件和原攻击事实，原适配器两方放弃后，JSON 冷读保留触发且只打开一次。失去资格时清除等待，篡改哈希时拒绝。旧 3.191.0 描述符与签名原件一致。隔离诊断修正了跨执行环境、两模型与重复变量等工具问题；未增加真实房回执。正式组合签名及冷恢复仍待。

| 同链路核对 | 结论 |
|---|---|
| Siege Tank 模板与 Queen Transfusion | 早于射后触发。真实签名已证明等两批结束。同方已用反应时 Lunge 不再出现。属于有证据的原顺序，不需要补跑。 |
| Vile Debilitating Saliva | 数值攻击前的原生声明和命中减益已签名。与同次攻击的 Restoration、模板及 Overwatch 组合仍无同房证据。 |
| Nova Operational Efficiency | 单独已有真实射后刷新，使用独立待办。与 Lunge 同时满足时，Lunge 在菜单和执行上先被选择，而刷新在存在普通反应窗时主动等待。总规则 §10.3／10.4 分别规定同类被动和反应的优先权。本次未将这条混合组合算作规则错误或通过。 |
| Auto-Turret Overwatch | 已验独立激活外射击。完成时追加自身结算日志，且需要沿激活外身份使用每阶段额度及先手标记。原 Lunge 按常规射手激活解析身份。先保留本组合为未覆盖，不能只放宽日志匹配就开放。 |
| 生成或特殊部署 | Omega Network 的旧建筑距离遗漏、Roachling 召唤的通用审计与身份遗漏、Ventral Sacs 的菌毯后继遗漏均有独立反例。Warp Prism、Dropship、Khalai Pylon 已分别有签名正例，尚待为缺覆盖的近端／远端菌毯叠加和生成物被动逐条登记。 |
| Marine | C-14 与未换装时的 Strike 已有原生证据。主样例换装结论由逐模型装备得出，把已替换武器和真缺口一起计数会误导。 |

发布准入继续要求区分来源、继承装配、产品实际触发和持久后继。自动效果／反应记录真实父事件、唯一消费者、同次可共存待办和后继证据。不同效果可以复用已验证的同一边界。仅标为 `executable_exact` 或组件手工造窗不能填正式通过。此项不提高 Standard 114/115 或整体 2/16。

[定点前后证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-deferred-owner-component.public.json)、[3.191.0 原签名报告](ticket-28-wave3-lunge-template-signed-room-2026-11-23.md)、[Nova 独立验收](../../build/ticket-28-terran-wave3-20261117-v1/nova-operational-efficiency/REPORT.zh-CN.md)及[Overwatch 独立验收](../../build/ticket-28-terran-wave3-20261117-v1/auto-turret-overwatch/REPORT.zh-CN.md)。

Overwatch 此后已在隔离原生 3.193.0 用真实签名验证激活外身份、先手顺序、付款位移和冷回放。组合另发现独占授权期间原普通模板枚举抢跑，已修其入口归属。[实测](ticket-28-wave3-overwatch-lunge-signed-2026-11-23.md)。

Nova Operational Efficiency 与 Lunge 的同次结算后来已在原生 3.192.0 实签五步。守方反应、Nova 刷新及激活交接各自完成，冷回放一致。[实测](ticket-28-wave3-nova-lunge-signed-2026-11-23.md)。

## Lunge 受阻搜索精度复验

已复现新版候选的尺寸通行不一致与解析圆弧接点取整。修正后，原生 Move 在同一隔离状态接受两侧 4.995 英寸路线，下界 4.993 英寸。引用检查确认折线生成只被 Lunge 搜索使用。普通空间动作仍用公用权威执行。保留最短证明和正式 Match 为未过项。[复现与影响面](ticket-28-wave3-lunge-ground-clearance-detour-2026-11-23.md)。
