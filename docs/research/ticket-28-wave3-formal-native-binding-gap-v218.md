# Ticket 28 / W3-11 · 旧能力为何在 Wave3 正式房间失效

## 原因与修复

| 层级 | 可复现事实 | 工程原因 |
| --- | --- | --- |
| 旧版 Lunge | 原冻结能力目录有精确适配器绑定。旧正式远程路径没有找到触发后续反应窗口的证据。 | 当时组件登记被当成阶段性成果，真实父动作开窗、移动时的领队和路线证明、原射手续行属于独立边界。3.197 已在隔离签名房证明普通射击中的受限提前停点。 |
| Wave3 第一层 | 同一 16 单位 Standard 主样例关闭继承 Lunge 后，覆盖门明确给出 114/115，唯一缺项是 Lunge。 | Wave3 按发布建立显式装配。稳定 ID 别名只证明定义的继承关系，各执行族仍需要把同源定义和消费者放进正式运行时。新版为实际编入的同源反应复用原适配器。 |
| Wave3 第二层 | 仅接 Lunge 后，第一层已越过，Native 门拒绝 Queen 的 Domineering Presence。 | 较早的 Queen 组件已能付款并增加任务 Supply。第一层创建了能力适配器，却未将同版来源交给正式 Native 构造器。现将冻结来源、目录、菜单、预览、提交及回放身份接到原 Queen 适配器。 |
| 验收夹具 | 3.197 的签名组件棋位没有正式任务效果目录，直接交给 Match 会报任务目录无效。 | 本轮对照补用之前通过的同一快照、同一任务的正式 Fire in the Sky 目录，棋位、军表和发布来源均取保存原件。这个输入错误与两道能力装配缺口独立。 |

## 同类影响

- Standard 与 Skirmish 共用发布装配。历史两个样例合计对账 27 项唯一缺口，覆盖 9 个原能力执行族。该数量是历史样本，分母随实际选表和装备变动。Armed and Ready、Timing Push、Field Repair、Additional Supply Depots、Debilitating Saliva、Zergling Reconstitution、Zealot Charge 均有单独的接线或消费证据。
- 第二层缺口还有 Queen 的 Psionic Link。它在 v2.11 已补。Domineering Presence 是这次同军表复现的新发现，两条能力分别绑定。Pylon 折扣的已确认反例是 Blink 共用支付未消费 Pylon，另见 Khalai 报告。
- 部署和召唤还要核对提交后的效果。Ventral Sacs 之前跳过普通 Deploy 移除敌方菌毯的后继，Warp Prism 已有签名正反对照。Dropship 与敌方菌毯叠加、特定 Pylon 部署组合仍缺签名对照。Omega Worm 漏算敌方建筑和 Roachling 绕过部分通用召唤校验属于旧执行缺陷。Marine Strike 与 Goliath Hellfire 一度因覆盖统计读错默认装备被误报，已按实际换装纠正。
- 正式 Match 本次只装配 Lunge 的普通远程路线。模板、Overwatch、Nova 等隔离组件证据需要各自正式父动作后继。查询自动提供领队比较路线、其他几何、生成单位后继、全发布对账仍有独立验收边界。

下一道发布检查应按冻结定义及现有执行归属对账，再核对同一正式 Native 目录和真实后继。主动、反应、被动、生成物、回合末后继分别取对应证据。旧绑定用保存的版本和原描述符验证。

## 此轮验证

同一军表 2.18 的正式 Match 候选登记 115/115。隔离签名 Room r1 Goliath 射击，r2 进守方反应菜单，r3 支付 1 Biomass 并移动两枚 Hydralisk。实际落点为 (12.622, 3.800) 与 (13.290, 6.629) 英寸。射手完成原射击和激活，r5 交回 player2。五张签名冷回放与保存的状态哈希一致。旧 Khalai 2.17 运行时按原清单重新构建，哈希完全一致。

首次 r2 提交的夹具只按技能与单位筛选，匹配到 14 种可支付方案。第二次选用原方案的具体卡，直接从原 r2 续验。该停止属于夹具选择，规则菜单可区分合法支付。

Queen 已进入同版正式 Native 目录，真实 Movement 付款、受益单位占点和完整回合到期仍要单独验证。整体验收 2/16。模型调用 0。

- [本轮对照和当前候选快照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-formal-native-binding-gap-v218.public.json)
- [历史 27 项归属对账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-hydralisk-inherited-binding-audit.public.json)
- [旧能力归因](ticket-28-wave3-inherited-capability-gap-audit-2026-11-23.md)
- [Queen 组件行为](ticket-28-wave3-queen-psionic-link-and-domineering-2026-11-22.md)及 [Khalai 支付和部署](ticket-28-wave3-khalai-signed-lifecycle-2026-11-23.md)
- [正式开房装配](../../packages/product-composition/official-release-room-native-actions-v2.mjs)及 [Native 消费](../../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs)
