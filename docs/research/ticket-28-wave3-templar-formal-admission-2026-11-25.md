# T28-W3-10 M09 · 圣堂军表的正式开房准入

使用冻结 U83/C84/R50 + FAQ 1.3。人族为此前已验证的 Nova 军表，神族选择 Templar Caste 及 Templar Archives，四个单位为 Tassadar、购买 Farsight 的 High Templar、Sentry 和 Zealot。沿用相同的 Standard 任务及部署。从正式开房工厂读取双方所有能力状态。

| 候选 | 已登记 / 所选 | 新版待接 | 继承规则待接 |
|---|---|---|---|
| 2.63.0 | 27 / 41 | 11 | 3 |
| 2.64.0 | 28 / 41 | 10 | 3 |
| 2.65.0 | 30 / 41 | 8 | 3 |
| 2.66.0 | 31 / 41 | 7 | 3 |
| 2.67.0 | 33 / 41 | 5 | 3 |
| 2.68.0 | 36 / 41 | 2 | 3 |
| 2.69.0 | 37 / 41 | 1 | 3 |
| 2.70.0 | 38 / 41 | 1 | 2 |
| 2.71.0 | 39 / 41 | 1 | 1 |
| 2.72.0 | 40 / 41 | 1 | 0 |
| 2.73.0 | 41 / 41 | 0 | 0 |

Farsight 的组件已有施法、视线、闪避与清理证据，但正式房间原先只从所选定义中装载一部分；本军表里已购买的 Farsight 落在名单之外。2.64 将其纳入同一来源目录，用正式能力适配器编译目标与卡牌支付，保留已装载的其他特性，并为选择了相应能力的自动命中执行器接入闪避资格。同一军表的 41 个定义逐项比较，来源哈希全部相同，只有 Farsight 从待接变为可执行。本次实际验证为开房前准入。整张军表仍有 13 条待接，尚未从这版完整房间签出 Farsight。

下一组关注该 High Templar 同时拥有的 Our Minds as One 与 Feedback。需在当前 Supply 满足及不满足卡面条件时，分别核对首个特殊能力的 PE 成本、已支付状态、下一动作和回合重置。其余新定义包含阵营卡、Tassadar 能力；三个旧定义均来自 Sentry。逐项名称在两份准入记录中。

[2.63 基线](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.63.0/coverage.json) · [2.64 的唯一增量与剩余 13 项](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.64.0/coverage.json) · [Farsight 原组件结果](../../build/ticket-28-protoss-wave3-20261120-v1/farsight/REPORT.zh-CN.md) · [正式工厂核对入口](../../scripts/inspect-wave3-templar-standard.mjs)

2.65.0 同表新增 Feedback、Our Minds as One 的正式工厂准入；41 个定义的来源哈希与 2.64 全部相同。尚待在正式房间签出人口条件、支付、结算后继与恢复。[2.65 同表对照与 11 个待接定义](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.65.0/coverage.json)

2.66.0 同表新增 Templar Archives 的 Ancestral Wisdom。正式军表对照保留全部 41 个来源哈希。大队圣堂实际占 2 个支援格，Daelaam 阵营卡提供 1 格；支付实验为大队购买档案馆获得额外 2 格，小队沿用基础阵营卡。一次正式开房进一步发现，当已选能力全部由专用组件执行时，正式工厂遗漏了激活收尾仍依赖的空能力集；该集合由同一来源编译，通过原校验后供新候选使用。[2.66 同表准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.66.0/coverage.json)

2.67.0 登记 Tassadar 的 Khala’s Gift 和 Executor’s Will，来源及其余定义保持同表一致。前者允许另一友方生物在距离与视线条件内获得首次技能减费，后者由独立执行器标记两个敌军并在突击阶段处理后继。[2.67 的两项增量](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.67.0/coverage.json)

2.66.0 的单独合法镜像军表实际签出了支付对照。开场摆位作为测试条件，优先权及其后行动由正式 Room 执行。大队人口 2 的 Farsight 实付 0 PE，接着给对方小队施放 Feedback 实付 1。人口 1 的小队第一次 Farsight 实付 1，效果生效后才收到 3 点非致命伤害，同一回执中零模型移除。[签名回执摘录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-payment-v265/round-1-casts.json)

2.68 至 2.72 在相同阵营、军表、任务、部署和 41 项来源哈希上逐次比较。新增准入 7 项，33/41 → 40/41。塔萨达的 Force Wall、Psi Lightning、Telekinetic Push 使用原双墙、伤害和推动组件。Our Duty is Unending 使用每局一次、最多刷新两张已横置战术卡的规则。哨兵 Guardian Shield 复用四寸、不需视线的友方远程防护及其回合清除；Restoration 使用 1 PE，正式施法分发补接光学闪光弹产生的真实减益；其 Force Field 采用冻结的 80 mm 圆形令牌，按完整底盘和地形检验占用。唯一仍缺正式准入的是 Khassar de Templari 的额外行动和结算后 3 点非致命伤。上述同表数字衡量工厂准入；未用它推算整局或策略表现。

[2.68 双墙三项](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.68.0/coverage.json) · [2.69 种姓刷新](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.69.0/coverage.json) · [2.70 守护之盾](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.70.0/coverage.json) · [2.71 恢复术](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.71.0/coverage.json) · [2.72 力场与唯一余项](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.72.0/coverage.json)

原 2.66 双席支付房签至 r29。双方在 Combat Pass 后进入系统结算，此时没有激活单位，回合收尾由先手席提交。已修正验证驱动对席位的假设。第二回合大队 Farsight 再次实付 0 PE，随后档案馆授权减免，Feedback 实付 0；档案馆仍就绪。结束激活后轮到 player2。[第二回合支付](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-payment-v265/r28.json) · [激活后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-payment-v265/r29.json)

2.66 支付房已从初始信封逐笔重放 29 个签名动作，恢复出的完整 r29 与运行时一致。跨两回合的五次施法实际支付依次为 0、1、1、0、0 PE，控制权归 player2。[双席终态与逐笔支付](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-payment-v265/result.json)

2.73 将 Khassar 的原生委派执行器同时装入军表能力注册和正式动作菜单。付款与解除光学闪光的技能反应分别由各自消费者处理，Nova 的 Head Shot 限定在可成为射手的单位，Suppression Shells 仍走声明冲锋的独立窗口。原同表 41 项来源哈希逐项一致，唯一新增准入项为 Khassar，达到 41/41。双席实际使用仍独立验收。[同表逐项对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-standard-2.73.0/coverage.json)

2.72 哨兵双席房在 r3 明确拒绝了与模型重叠的位置，状态哈希保持原值，随后 80 mm 力场在 (12, 9) 英寸签出。守护之盾和力场各实际支付 1 PE，结束激活后轮到对手。五个动作从初始信封冷重放一致。2.73 同表已进入开房工厂，41 个定义在原生执行器中的未接清单为空。[哨兵完整结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/sentry-field-standard-2.72/result.json) · [重叠拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/sentry-field-standard-2.72/rejected-overlap.json) · [Khassar 原表开房](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-standard-2.73/opening.json)

同表双席验证的 r0 显式声明双方三个已部署单位。首版夹具只改了位置和预备队标记，保留了原始全预备队人口；召唤物所需的正式人口校验准确拒绝了这个快照。夹具改为调用同回合的权威人口重算，保留原任务和上限，得到 player1 占 1、player2 占 2；之后按 2.73 绑定成功。没有改动人口规则。[初态原件](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-standard-2.73/opening.json) · [候选绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-standard-2.73/runtime.json)

另用雷诺的渡鸦（Corvid Reactor、Seeker）对阵已购 Storm 的高阶圣堂武士及自带 Gale 的暮光圣堂武士。2.74 工厂已将自动炮塔的警戒限定在突击阶段结束激活的时点，军表 28 项中正式准入 24 项；剩余为 Storm、Gale、暮光单位的 Bound by the Khala 和 Warp In。本表独立计数，尚待验证两张卡的实战配合。[逐项回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-gale-standard-2.74.0/coverage.json)

2.73 同表双席走完 r0→r8，先后完成双方普通激活、委派额外半英寸移动、对受领单位结算 3 点非致命伤和激活交接。高阶圣堂武士仍有 2 模型、人口 1，指挥者原地，卡牌耗竭。8 个动作逐笔冷恢复一致。[双席结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-standard-2.73/result.json)

另一张含渡鸦的军表在 2.75 从 24/28 到 26/28，全部来源哈希一致。新增暮光跃迁和友军人口下降后的整备反应。为使后者和 Khassar 委派在同一房间成立，已接通父动作对人口反应窗口的等待和回交。准入已通过，两者实际嵌套的对局回执待补。[同军表能力变化](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-gale-standard-2.75.0/coverage.json)

2.76 同表升至 28/28，唯一变化为已购 Psionic Storm 和暮光自带 Psionic Gale。二者共享选中来源、施法菜单、权威阶段末和覆盖查询。修正两处正式组合问题：按施法单位和首项能力报价；只有探测而没有丢失 Hidden 的反应来源时，回合清理仍应完成。工程施法对照在独立双席房运行。[逐项来源与准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-gale-standard-2.76.0/coverage.json)

2.76 施法验证的两次停止均在签名以前。首个场景将第六个 Marine 放到领队连续范围之外；改为围绕领队的三列实位后，该门已通过。第二次是夹具假设所有军表在任务开始之前都有人口账：此前 Nova 召唤军表有预绑定，此次渡鸦／圣堂军表由原生任务开局建立。夹具在无前账时仅按冻结任务验算场上人口，保留正式任务动作负责发放；有前账则只刷新占用。两次原始停止记录均保留。[连续性](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-payment-standard-2.76/stop-1795563711956.json) · [人口时点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-payment-standard-2.76/stop-1795563863782.json)

2.76 正式双席房从任务开局签至 r4。大队高阶圣堂武士首次风暴印刷 2 PE，查询和实际均为 1 PE，一张卡横置；再次查询为 2 PE。小队暮光的烈风报价 2 PE。覆盖查询列出三个 Marine（1、2、5 号），阈值 4+。施法完成后由 player1 接手，四次签名从初态冷重放与运行状态一致。[施法原件](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-payment-standard-2.76/signed-cast.json) · [支付与回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-payment-standard-2.76/result.json)

奈拉齐姆采用此前组件验收的实际双方军表：一侧泽拉图＋追猎者（机械研究所、传送门），另一侧守望者＋追猎者（机械研究所）。2.76 正式准入 8/21，2.77 接通虚空闪烁和虚空禁锢后为 10/21，21 个定义的来源哈希逐项一致。禁锢选点、PE 支付、范围减速和清理由原消费者负责，尚待这张军表的双席操作验收。[同表初始清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.76.0/coverage.json) · [两项差分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.77.0/coverage.json)

风暴房从已签 r4 保留完整支付前缀，双方依次 Pass。r7 由原生移动末动作结算，进入 Assault。之前查询覆盖的 Marine 1、2、5 与实际覆盖完全一致；实际掷骰 6、1、4、4、6、2，闪避 0，记录 4 点非致命伤，移除 0 模型。仅重放 r4 后的三次签名，完整信封一致。[阶段末结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/templar-storm-payment-standard-2.76/movement-result.json)

奈拉齐姆 2.78 增加泽拉图冲锋 IMPACT 和死亡宣告的近战定向暴击（12/21）；2.79 增加守望者主动潜隐与泽拉图行动结束后潜隐（14/21）。两次逐项核对均只有这两条登记改变。[2.78 差分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.78.0/coverage.json) · [2.79 差分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.79.0/coverage.json)

2.80 将 40 mm 幽影、六寸内去除潜隐、位移、来源移除及回合末可选换位接入共同工厂。首次与 Native 逐项核对时，早已登记的 Shadow Strike 缺少 HITS 消费者而被拒绝；从已选暗影打击的来源启用该消费者后通过 16/21。2.81 加入传送门 Quick Strikes、两项阵营卡、机械研究所 Plasma Shields 和泽拉图 Prophetic Vision，达到 21/21。取得准入的每一项都同正式原生目录比对；双席后继仍独立记录。[真实拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.80.0/stop-1795565005941.json) · [幽影组合](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.80.0/coverage.json) · [21 项同表对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-2.81.0/coverage.json)

新标准军表同时选择两台不朽者（原装光子／换装双相位）、狂热者，以及对席的虚空寻觅者。首次缺两个精英槽，正式写表器正确拒绝；按冻结数据选择机器人设施后同表合法。13 个此前三份军表未选中的神族新增效果全部在场。2.81 的 39 项已准入 29 项；2.82 复用原生个人运输及 Anakh Su’n，在相同 39 个来源哈希下增为 31 项。卡的本局实际运输和重部署仍另验。[原基线](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/immortal-transport-standard-2.81.0/coverage.json) · [同表新增两项](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/immortal-transport-standard-2.82.0/coverage.json)

守望者正式双席在 r3 实付 1 PE 生成幽影；r5 泽拉图主动移动，幽影使其失去隐身；r6 泽拉图所属的 player1 使用 Might of the Nerazim，另一席放弃后 r8 交回 player2。全部八步从初始信封重放，最终状态一致。[签名与冷重放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nerazim-standard-hidden-loss-2.81/result.json)

2.83 将不朽者原装双光子炮、冲锋冲击、三种条件被动以及两种防御反应接入已有执行器，新标准军表 39/39。四份军表按冻结定义 ID 去重后覆盖 52/52 个新增神族效果；同一效果出现于多份军表时逐份核对来源哈希。逐项开房准入与棋盘上实际触发分别记账。[39 项同表差分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/immortal-transport-standard-2.83.0/coverage.json) · [52 项逐项来源](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/protoss-formal-coverage-four-rosters.json)

独立对照：另一侧只带 Marine，卡莱侧只带狂热者、原装不朽者（购买护盾过载和两个射击被动），没有机械设施、泽拉图或虚空寻觅者。正式准入 19/19，含该不朽者所选的 9 个新增定义；未买的双相位炮和运输卡不在清单。[去除外部能力的独立军表](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/immortal-stock-standard-2.83.0/coverage.json)

Khassar 人口场景的军表在 2.83 缺普通使徒的两项基础能力。2.84 正式工厂以相同军表、相同 21 个来源哈希重建，准确补齐 Psionic Presence 和 Psionic Transfer（19/21 → 21/21）。首次准入选择了只适合主动资产的适配器而被拒绝；改为根据实际动作类型选择被动消费者。实际残影范围与暮光圣堂人口反应各有独立验收。[原清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.83.0/coverage.json) · [两项差分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/khassar-supply-standard-2.84.0/coverage.json)
