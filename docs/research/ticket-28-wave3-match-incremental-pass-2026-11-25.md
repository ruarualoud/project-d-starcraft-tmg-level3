# Ticket28 / T28-W3-11　正式对战增量验收

[执行细则](../development/wave3/match-incremental-acceptance.zh-CN.md) · [逐项来源与机读结果](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/summary.public.json)

## 旧功能可以继承到什么程度

从旧发布的 252 个稳定定义出发，240 个的来源字段相同，12 个有差异。已核对的 Standard 正式军表覆盖 164 个旧定义，其中 42 个还能核对到相同来源、适配器、能力及消费者。这些数字描述不同强度的证据，同一项可以出现在多个数字中。本轮未逐个重新操作这 252 项。[逐定义清单](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/inheritance.public.json)

12 个差异涉及 10 个升级的费用、雷诺的 C-14 替换说明和使徒投影。10 个升级共有 14 个适用编制，用正式写表工厂分别购买前后比较，14 个总价差均与冻结数据相符。使徒沿用已签的投影放置和激活交接记录；仅凭该记录无法判断所有结束阶段的换位。[使徒原房](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/adept-own-shade-standard-2.84/result.json)

## 多目标近战与控制　M12

在 Standard 正式军表上预设已接战的棋位，狂热者把 12 颗近战骰分给使徒和高阶圣堂，各 6 颗。完整编制分支分别造成 3、1 点伤害，r7 交回行动权。预先受伤的对照分支分别造成 5、1 点，防守席位通过公开动作选择移除一名使徒，4 个模型剩 3 个，人口仍为 1；高阶圣堂剩 2 个模型。两批都完成结算，r8 关闭并重新打开房间后复算一致。该棋位只验证功能，无策略效果推论。[完整编制](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/split-fight/result.public.json) · [受伤分支](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/split-fight-wounded/result.public.json)

另从已签 Nova 冲击前的位置取独立分支，将目标预设为 7 模型。四个签名步骤后实际剩 4 个，人口 1→0，4 号点只有虫族符合争点资格。冲击前后的控制查询都返回虫族。验收初稿误以为降到零就失去控制，经冻结规则对照表 §8.9.1 核实，唯一争点方在零人口时也控制该点。工程断言已纠正，原判定逻辑保留。该读数是当下结算控制的预测，未执行新的回合计分。[冲击前后及独立恢复](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/impact-threshold/result.public.json)

## 双规模特殊进场　M14

| 对战能力 | Skirmish 500 分 | Standard 2000 分 |
|---|---|---|
| Warp-In | 暮光圣堂支付 1 点，完成折跃与激活；同房继续到 r5 | 同一能力支付、折跃，r4 交回对方 |
| 运输 | Void Seeker 将泽拉图从 (4, 3) 撤备，再部署至 (20.700, 34.962)，释放并重新占用 1 人口；另有运输机接走 Medic 的回执 | Void Seeker 将追猎者撤备并重新部署，核对释放与重新占用人口 |
| 棋盘生成物 | 凯瑞甘发动 Omega Network，r3 产生虫洞，规则禁止虫洞争点 | Roachling Infestation 产生 3 个有身份的 Roachling 模型 |
| 特殊部署 | Corpser 由预备队整队伏击进场，记录三个底盘落点 | 带潜地伏击升级的破坏者完成进场与恢复 |

两种规模都操作了同一张 Void Seeker，500 分 r4、2000 分 r6 均完成冷恢复。[500 分运输](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/t28-personal-transport-skirmish/result.public.json) · [2000 分运输](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/immortal-void-seeker-standard-2.83/result.json)

表中的证据分别取自允许该能力的合法军表。500 和 2000 是房间预算，Standard 验收可按正式规则损失未用资源。每格均有真实房间动作与恢复，来源、版本及复用方式列于机读清单。

## 同一棋位的战桌和工具　M24、M25

在 r7，人工席位的共享战桌投影与权威状态逐一核对了 9 个模型的坐标。实战与赛前查询读取同一局面，5 个任务点的完整结果相同。此前，合法近战可在房间执行，但查询把中间的组件当成原生武器，返回 unknown。修正查询的动作解包后，两入口均返回伤亡概率估计，完整结果分布一致。占点是确定性规则结论，伤亡分布是估计。正式写表菜单也核对了发布和来源快照；完整 Plan、Teach 和实战决策的路线与火力调用仍需逐入口取证。[同棋位记录](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/same-board.public.json)

两种规模复用此前的真实双浏览器建房、双席、重连和第 5 回合终局记录。各自的移动网页与桌面终局同为 r81，房间身份及状态哈希分别相等。原生 App 的设备验收仍待完成。上述两份终局记录是界面功能证据。[500 分移动网页](../../build/ticket-28-wave3-human-lobby-v1/skirmish-mobile-outcome.public.json) · [2000 分移动网页](../../build/ticket-28-wave3-human-lobby-v1/standard-mobile-outcome.public.json)

## 雷诺无补给站　M01、M07

在 2.88，两份雷诺军表均被正式工厂拒绝，标准步枪与免费 C-14 都无法进入武器选择。原因可以精确到 Freedom Fighters 的消费端：准入装配会创建独立的 2.0 来源包，执行器只接收含补给站的 2.1 组合包。新候选 2.89 在持有独立包时用冻结来源重建并核对它，再注册已有的消费者。两份军表重新通过正式工厂，待注册数均为零。射击菜单分别提供 Commando Rifle 和 C-14 Rifle，均可实例化为对使徒的合法射击，且未选的另一把步枪均未出现。此项验证到正式射击实例化；未发布新版本。[修前](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/raynor-menu.public.json) · [修后两份军表](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/raynor-menu-2.89.0.public.json)

## 进度及剩余工作

组件 162/162。正式 Match 本轮由 18/26 至 20/26，新增 M12、M14。六项尚有以下明确边界。

| 编号 | 仍需补的证据 |
|---|---|
| M01、M07 | 完成继承定义到正式执行器的差分映射，并补人族生成物及相关消费者。雷诺这两份选择已验证。 |
| M08 | 虫洞额外部署。此次验证了生成虫洞及其不能争点的约束。 |
| M09 | 神族继承能力未覆盖的消费者，包括使徒投影的完整换位后继。 |
| M24 | 将同一任务、路线和火力问题分别交给各实际入口，验证其读取同一发布、合法动作和结果。 |
| M25 | 原生设备上的双席、切后台重连和结局。桌面与移动网页沿用同一房间的真实终局回执。 |

Wave3 大项 2/16。实现已有两处源修复；产品接线以本表各行计；产生了真实房间动作与离线查询回执；本轮未测策略提升，模型费用为零。
