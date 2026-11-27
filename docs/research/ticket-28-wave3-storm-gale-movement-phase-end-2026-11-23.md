# Ticket 28 / W3-10 · Storm 与 Gale 阶段末组件

本边界以用户选定的 127 mm 外圈和隔离房中声明的已确认中心为输入。中心标记实物直径只用于落标及边缘测距。本轮没有代填这一尺寸，也没有执行施放或扣费。

共用目标点模板覆盖按底盘、高度和 Size 2+ 遮挡分批。正式 Room 从当前棋位编译每支受影响单位的骰池，再消费签名骰。修改前 Storm 预览使用未注册的骰池键，权威房在 r0 拒绝。修复映射后从原 r0 续验。两场隔离房与旧版都使用 U83/C84/R50 + FAQ 1.3。

| 已签分支 | 覆盖和实际结算 | 冷恢复 |
| --- | --- | --- |
| Storm，施术者 Supply 2 | 敌军、己方大队各覆盖一个模型。各掷 4 骰，实际为 2 点与 1 点非致命伤害，模型数及 Supply 精确。 | 1 条签名冷回放，重复结算被挡 |
| Gale | 己方两模型被覆盖，5 骰，实际 3 点非致命伤害，模型数及 Supply 精确。 | 1 条签名冷回放 |

两种能力的突击阶段覆盖与骰池也可读取，结算合同输出标准伤害。Storm 施术者消失后，原中心仍能产生覆盖，失去加值回到 5+。无效坐标请求和改动后的中心摘要拒绝。旧 Our Minds 3.153.0 描述符完全一致。目标点覆盖提取前后的 Plague 真场景对照覆盖 4 模型、3 批次，完整结果一致。

首轮目标点视线投影漏带棋盘边界，接回既有字段后通过。Gale 的两次预检停在旧反应与近战消费者的夹具配置，保留两条记录后复用原装配。其他已过的签名回执没有重新提交。

组件证据仍为 146/162，Protoss 17/23，Ticket 28 整体 2/16。待完成突击阶段的防御或伤亡后继、同阶段多个效果的顺序、实物中心标记及施放。零模型调用。

- [Storm 真实骰、签名与冷回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-community-v3200/storm/result.public.json)
- [Gale 真实骰、签名与冷回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-community-v3200/gale/result.public.json)
- [Plague 共享覆盖前后对照](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-community-v3200/plague-equivalence.public.json)

## Combat Shield 闪避 · 3.201.0

当前 Storm／Gale 共用社区外圈直径 127 mm（半径 63.5 mm）。120 mm 为可替换备选。中心标记采用独立配置。

冻结 FAQ 1.3 的 Combat Shield 答复确认可闪避风暴。隔离产品房复用旧签名房 r2 的已激活护盾，使用同版编译的九模型 Marine。模板覆盖六个底盘，Marine 对 9 颗风暴骰承受 4 次成功，5+ 闪避抵消 1 点，最终记 3 点非致命伤害，九模型及 Supply 2 保持。去掉护盾后查询中无该闪避。突击预览给出同一防御资格。

真实 Room 从公开 LegalSpace 消费 1 条签名，关闭重开后的回放与 r1 完全一致。新版只在显式注册时启用，旧 3.200.0 运行时描述符一致。两次场景准备问题分别为领头模型坐标和护盾写入层级，均发生在签名之前。突击标准伤害、伤亡及中心标记施放待验，计数维持不变。

[产品证据](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-defence-v3201/result.public.json)

## 突击末标准伤害 · 3.202.0

本轮用已确认的 127 mm 外圈和既有中心状态。成功骰及闪避先由风暴结算记录，再把剩余标准伤害交给共用消费者。它负责伤害反应、防守方选伤亡和 Supply。原 3.201.0 描述符逐字段一致。

- Marine 房从已签移动末状态带入 3 点非致命标记。突击有 4 个成功骰，Combat Shield 抵消 2 点，剩 2 点标准伤害。防守方选择 2 个阵亡模型，保留 1 点标记，随后归还阶段控制。两条签名精确冷回放。
- Zagara 房的来源方和阶段驱动方不同。首位玩家通过，Zagara 支付一张 Biomass 卡执行 Transfusion，将 Defiler 的 1 点标准伤害减到 0。无重复掷骰，控制回到阶段驱动方。三条签名精确冷回放。
- 首次 Transfusion 预览发现军表工厂没有为这一接线绑定 FAQ 1.3 的激活外反应策略，因而拒绝开窗。现已从工厂绑定，根运行时预先校验；保留原 r0 和失败记录。

尚待执行 8.9.4 同阶段编排。持有先手标记者先处理其效果，同一玩家通过产品动作选择自身效果次序，每个效果走完其反应及伤亡后再进入下一项。中心标记实物直径、权威施放、正式 Match 准入仍待完成。本轮零模型调用。

- [Marine 伤亡与回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-assault-v3202/result.public.json)
- [Transfusion 与回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-assault-v3202/transfusion-faq-bound/result.public.json)
- [首次反应预览停止记录](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-assault-v3202/transfusion/verification-stop.public.json)

## Storm／Gale 排序与近战推进 · 3.203.0

冻结 U83/C84/R50 的规则 8.9.4 来自 rules_sections:iuUyObNTQ2M8xK4IUqzC 的 /payload/items/9/subItems/5。突击末复用该顺序，先手标记持有方先处理，同一位玩家选择自己的效果。Pass 调用原权威执行器，第二次 Pass 延迟推进，全部结算后用相同阶段收尾函数进入近战。

真实隔离产品房用确认中心开局。r1 和 r2 是两次实际 Pass，r2 仍为突击阶段，仅先手可见它的两个风暴。先手选择了列表中第二个。r3 因伤亡转给防守方，下一项风暴与推进均不可见；r4 处理伤亡后交还。随后 r5 结算先手余项，r6 结算对手 Gale，r7 进入近战。共 7 条签名，独立打开数据库后完整回放一致，3.202.0 描述符逐字段一致，零模型调用。

首次到 r0 时 Pass 动作的原有原子编号未加入组件目录，Authority 正确拒绝菜单。修复组件登记后验证通过。保留该拒绝记录及原房，无已签动作被重放。

本次顺序仅包含 Storm 和 Gale。跨家族同阶段效果的统一编排、移动末的 Pass 接线、中心标记实物尺寸及权威施放仍待验证。正式 Match 尚未开启该候选。

- [真实房间 r0→r7 与冷回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-order-v3203/catalogue-bound/result.public.json)
- [原 r0 的原子登记拒绝](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-order-v3203/verification-stop-r0.public.json)

## Corrosive Bile 与 Storm 共用顺序 · 3.204.0

Corrosive Bile 现在可以作为一个已施放效果逐项提交。共有顺序只提供当前控制方的合法效果，一项效果的装甲、闪避、反应和伤亡仍由原消费者负责。毒液每个来源自己的全部命中处理完毕后才归还顺序控制。旧 3.203.0 的 Storm／Gale 描述符逐字段一致。

同一隔离产品房重用同版签名放置的原毒液及已确认风暴中心。两次真实 Pass 后先手 Zerg 仅可选 Bile。r3 至 r5 执行命中、装甲骰和闪避，毒液移除后才开放对方 Storm。r6 结算风暴，r7 进入近战。7 条签名冷回放完全一致。组装时曾缺同版任务 Supply 资料，失败发生在创建房间前，已改用真实同版任务资料。

本证据覆盖 Bile 与 Storm 两个家族的对方席位交接。同方多能力、Seeker、Sabotage Drone 与 Poisonous Essence 的混合效果，以及正式 Match 准入仍待验证。零模型调用。

- [两场 Pass 到 r7 回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-shared-order-v3204/result.public.json)
- [场景组装失败与修复](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-shared-order-v3204/verification-stops.public.json)

## 扩展共享顺序 · 3.205.0

在 Storm 或 Bile 引用 8.9.4 的突击末窗口，Seeker、Sabotage Drone、Poisonous Essence 可作为逐项效果参加同一顺序。未触发该窗口时，各独立运行时继续执行原顺序。生成物的源姿态、毒性标记、受伤与伤亡仍由现有执行器校验；Poisonous Essence 已受其同名效果伤害的单位不重复受伤。

- Drone 房用真实生成物工厂和同版确认风暴中心。双方实际 Pass 后验证两段命中链，直到 r7 才开放风暴；r8 风暴后完成实际防守伤亡，r10 进入近战。10 签冷回放一致。
- Poisonous Essence 房复用原签名来源 r2 的标记及耗卡。胶着的高阶圣堂实际获得 2 点非致命标记，随后交给风暴，r5 进入近战。5 签冷回放一致。首轮夹具编译前军表非法，改回原 Zagara 势力及卡组后通过。
- Seeker 同版编译及双方 Pass 后未付款无动作的产品运行时检查通过。已有完成的独立 Seeker 后继仍可引用。完整 Raven 未入场，本轮没有真实付费 Seeker 正向签名。两条支架臂宽待补。

旧 3.204.0 描述符逐项一致，复用了此前 Bile 的签名。下一项为移动末 Pass 与实际下一阶段，随后补中心标记尺寸和施放。Web/App、正式 Match、模型与策略效果均未在本轮执行。

- [Drone 签名及回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-expanded-order-v3205/sabotage/result.public.json)
- [Poisonous Essence 签名及回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-expanded-order-v3205/poisonous/result.public.json)
- [Seeker 同版准入及付费限制](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-expanded-order-v3205/sabotage/seeker-without-paid-declaration.public.json)

## 移动末 Pass 与同房两阶段续行 · 3.206.0

冻结 8.4.2 绑定通过后的先手标记。两次实际 Pass 后移动末窗口接管结算。Storm 和 Gale 从同一份阶段末状态计算覆盖与骰池，本轮三个既有中心合计 26 颗伤害骰。r3 完成非致命伤害和阶段推进，没有提前移除模型或扣 Supply。原标记继续保留。

从原 r3 续行，未重提已通过动作。r4、r5 是突击 Pass，三个标记按控制者选择依次进入标准伤害；中间完成三个防守方伤亡选择。r12 进入近战，12 条签名冷回放完全一致。3.205.0 原描述符逐字段一致。

首次验证把来源状态里一条既有移动末历史误计入本轮，断言已改为核对原前缀与三条新增记录。修复验证从原 r3 和 r2 签名前缀恢复，无重复提交。

冻结 10.1 禁止同名效果同时叠加。移动末两个同名模板覆盖同一单位时，运行时保留结算窗口并明确拒绝未定的伤害选择。当前冻结资料没有指明选哪一个实例，仍需闭合该规则。中心标记实物直径未填，中心保留为已确认的隔离场景输入。权威施放和正式 Match 准入待验。零模型调用。

- [移动末 r3 和冷回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-movement-pass-v3206/result.public.json)
- [同房 r3→r12 与完整回放](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-movement-pass-v3206/movement-to-combat.public.json)
- [同名覆盖重叠的拒绝](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-movement-pass-v3206/same-named-overlap.public.json)
- [首次断言与续验记录](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-movement-pass-v3206/verification-stops.public.json)
