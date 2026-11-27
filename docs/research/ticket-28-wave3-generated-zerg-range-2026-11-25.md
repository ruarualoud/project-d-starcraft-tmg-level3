# Wave3 生成虫洞与菌毯范围

## 正式召唤及侦测

2.57 已登记凯瑞甘的召唤卡，尚未注册生成后的侦测。2.58 复用现有侦测规则。正式召唤预览暴露第二个问题，冻结模板有 Size 3，生成实例却漏传。修正后生成虫洞 Size 3、人口 0，首个签名动作及完整状态冷恢复一致。

同一虫洞在生成回合距离 6.000 英寸时侦测关闭；第二回合在 5.999、6.000、6.001 英寸生效，6.002 英寸关闭。统一几何内核的容差为 0.001 英寸。次回合场景单独声明，未推进整个第一回合。目前尚待 Nova 实际移入后移除 Hidden、下一选择和冷恢复。该场景已改用正式对局初始化人口和损失账本。

[2.57 对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-detection-v258/before.json) · [召唤与冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-detection-v258/summon.json) · [五个真实查询](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-detection-v258/sampled-boundaries.json)

## 矩形底盘与菌毯

旧实现把 40×100 mm 刺蛇绕成长边直径的圆。刺蛇离虫洞 6.401 英寸，另一个场景离肿瘤 6.402 英寸，旧查询均给出 ON CREEP；分别去除对应来源就恢复为 false。2.59 按冻结规则登记生成虫洞的菌毯来源，并让肿瘤与单位光环调用同一实际底盘边缘几何。旧版保留原绑定。

[虫洞反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-detection-v258/omega-hydralisk-creep-geometry-before.json) · [肿瘤反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-detection-v258/tumor-hydralisk-creep-geometry-before.json)

## 混合军表正式开房

Nova 与刺蛇同时出现时，自动命中运行器把刺蛇的“远程攻击结算后”反应视作无人消费，阻止正式建房。2.59 只在已构造远程射击与刺蛇 Lunge 消费方时登记这个所有者；自动命中继续原样检查其它触发。两种范围各有独立双人工房间，最终准出以实际动作、下一菜单和冷恢复为准。

[首次开房拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-footprints-v259/stop-1795542044435.json)

## 两席正式房间结果

2.59 两支均通过。第一支在实际移动前后，刺蛇与虫洞边缘间距从 6.401 变为 5.801 英寸，公开查询由 false 变为 true。第二支由凯瑞甘实际放置肿瘤，在 6.402 英寸判为外，条件位置 5.802 英寸判为内。第二个位置是场景查询。两支均有后继菜单，签名动作完整冷恢复。

[两支结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-footprints-v259/result.json)

## 单独虫洞控制任务点的旧版错误

使用同一只已签名生成的虫洞与原任务点 1，条件位置为 (14.5, 24) 英寸，底盘到目标边缘实际相距 0.295 英寸。2.58 将单独的零人口虫洞记为唯一争夺者，并认定 player2 获得控制。冻结的 Structure 明确禁止这一例外。2.60 把召唤来源接到已有建筑适配器，使用同一位置做正式召唤与任务结算。

[原版本条件实测](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-structure-v260/before.json)

### 回合末正式结算结果

2.60 已通过。双人工席房间实际完成任务开始、选择先手与召唤虫洞三个动作。生成物禁止激活、常规行动、控制和争夺任务点，人口为 0。以该签名状态派生明确标注的第一回合末场景，执行官方判定后任务点 1 仍无归属，排除原因是建筑，下一步为任务计分。召唤房间与回合末场景冷读重放均一致，模型调用为 0。

[召唤与建筑约束](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-structure-v260/summon.json) · [任务点结算和冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-structure-v260/result.json)

## 虫洞回收的正式房间

沿用 2.60 已签名召唤的虫洞与同一坐标。隔离的第二回合移动阶段给虫后与虫洞留出 1 英寸的底盘间隙，移动前不能回收。虫后实际移动至底盘接触后，公开菜单出现一次可选回收。玩家提交后虫后及其模型离场，预备队名册同步，场上人口从 2 降至 1，人族获得移动、技能和 pass 等选择。关闭后重放 move 和 resolve_unit_lifecycle_consumer 两条签名动作，完整状态一致。这个验证覆盖回收；虫洞进场的每回合 2 人口额度仍需单独消费。

[移动后菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-return-v260/contact.json) · [回收、对手菜单和冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-return-v260/result.json)

## Corpser 在正式军表里召唤 Roachling

沿用已登记的完整凯瑞甘军表与 Nova 对手，只从旧组件证据读取三枚模型的目标坐标和母体起点。隔离的 Standard 第一回合移动阶段由玩家从实际菜单使用 Corpser 的 Roachling Infestation，Six Pool 卡支付 2 Biomass 后耗尽。房间新生成三枚模型，人口 0；来源、母体、第一回合移动激活锁均保留。母体随后可以移动，召唤物在同阶段不能再次移动。规则读取到了 Underdeveloped Claws 禁止潜地，完整签名状态冷恢复一致。次回合同卡对照和真正进入近战是两个后继。

[真实召唤和阶段锁](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/roachling-standard-v260/summon.json)

## 同一张孵化场卡的对照

从上一步正式产生的三枚小蟑螂派生第二回合条件场景，明确母体在预备队。Roachling 有正常移动，在同一玩家的同一孵化场卡下没有潜地动作；凯瑞甘的 Raptor 有该动作，提交后确实获得 Burrowed。来源为 Underdeveloped Claws，产物有后继菜单，关闭重放整态一致。

[第二回合同卡正反对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/roachling-burrow-v260/result.json)

## 近战接触与原武器

另从同一签名召唤物建立第一回合近战条件场景，母体在预备队，Nova 与一枚小蟑螂的底盘接触；权威接战图认定双方接战。公开菜单给出本单位冻结的 Claws，稳定 ID、来源哈希和武器档案均与冻结组件相符。三枚 Roachling 可投 6 颗命中骰，本次护甲和闪避后 Nova 受到 1 点伤害，移除 0 个模型，行动权回到人族。4 条签名动作重放后整态一致。具体骰子只描述这一次工程验收。

[武器来源对应](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/roachling-claws-v260/source-binding.json) · [近战、防守与交权](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/roachling-claws-v260/result.json)

## 预备队部署菜单被敌方侦测吞掉

在 2.60 的第二回合条件房间，凯瑞甘阵营场上 1 人口、人口池 8、可用 7。虫洞自身已能作为入口。敌方 Nova 在场时，7 支虫族预备队的普通及虫洞部署都没有出现在公开菜单。诊断显示，构造移动速度时，特性投影尝试测量敌方侦测源到尚无棋盘坐标的预备队，底盘内核按约拒绝，枚举器将整项部署排除。刺蛇和 Queen 各需 2 和 1 人口，额度不是这次菜单缺项的原因。

修复从 2.61 候选开始：特性范围判断遇到登记在预备队且离场的端点返回范围外；场内单位仍使用同一底盘内核。保留 2.60 已签名的原房间和失败。第二回合房间采用完整凯瑞甘军表，虫洞单位取自已签名的正式召唤，坐标取自旧记录（6,12 英寸）。这一局面是声明的工程条件；没有把两个来源拼作同一局的行动历史。

[原房停止、7 支受影响单位与调用栈](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v260/before.json) · [原横排队形预检](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-lifecycle-deploy-horizontal-formation-preflight.public.json)

2.61 双人工正式房间采用同一军表和摆位，原失败清单的普通桌边部署选项 **7/7 恢复**。同一方公开菜单给两只刺蛇的单位标示 2 人口，给 Queen 标示 1 人口，两者均可选择同一虫洞入口；该入口本回合额度 2、已用 0，全军可用 7。已核对原横排队形引用、两个模型 ID、底盘尺寸、入口来源，读取前后均为 r0 且状态哈希一致。本次验证止于读取菜单，实际部署、人口扣减、额外进场拒绝和行动后冷恢复沿用原补验边界。

[2.61 正式菜单、入口来源和两席房间断点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261/prepared.json) · [修订候选运行时](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261/runtime.json)

## 正式菜单到战桌部署编辑器

2.61 房间向两只刺蛇和 Queen 同时提供桌边与虫洞周界。原客户端仅接受有桌边方向的入口，丢弃了房间给出的虫洞；编辑预备队的多段路径时也会覆盖第一个路径点。战桌现保留两种入口、来源模型和各自的人口数据，可以沿虫洞周界输入英寸偏移，连续编辑路径，再摆放其余模型。更换入口会清空旧摆位。

使用同一 r0 的公开菜单，挂载 Web/App 共用组件。宽屏 1440 的刺蛇和窄屏 390 的 Queen 均能选择入口、输入 0.125 英寸、设置两个路径点，并在队形齐备后启用预览。两项通过。测试截止在发送预览之前，未部署单位。

[原房间的两个公开部署域](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261/editor-input.json) · [修前投影](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261/editor-before.json) · [两种宽度的组件交互结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261/editor-render.json)

## 虫洞入口的队形查询与路径纠错

在正式部署域同时给出桌边与圆形底盘周界时，原队形求解器给所有入口读桌边起止坐标。虫洞没有这两个字段，导致采样轴为空。原路径纠错也只认识四条桌边，无法报告虫洞出发点与已提交的路程。

规则器原有的周界起点计算现同时供动作、队形查询和纠错使用。查询沿给定入口采样，在有限步数内优先尝试玩家指定的落点和若干放射方向，由同一运行时确定整支单位的队形是否合法。求解器不改入口人口上限。对没有特殊入口的桌边，保留既有采样顺序。

同一正式房间、席位、状态和菜单哈希，按目标坐标运行只读 `space.solve_formation`。两次虫洞查询与一次普通桌边对照均返回运行时已校验的完整队形。

| 查询单位与目标（英寸） | 修前返回的入口与领队落点 | 修后返回的入口与领队落点 |
|---|---|---|
| 刺蛇 (10.5, 12) | 普通桌边 (10.5, 2.031) | 虫洞 (10.5, 12) |
| Queen (10.5, 12) | 普通桌边 (10.5, 2.425) | 虫洞 (10.5, 12) |
| Queen (32, 1.2) | 对照项 | 普通桌边 (31, 1.575) |

虫洞右端起步时，路径纠错上下文给刺蛇与 Queen 返回的领队中心分别为 (8.363,12) 和 (9.150,12) 英寸，到同一目标的距离为 2.137 和 1.350 英寸。修前两个起点和距离均为空。此距离是特定偏移的路径说明。所有查询结束时房间仍为 r0，未向房间发送预览或部署，尚无真实人口扣减与行动后继。

[修前结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261/formation-query-before.json) · [修后三次正式工具结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261/formation-query-after.json) · [定点验证入口](../../scripts/verify-wave3-omega-formation-query-v261.mjs)
