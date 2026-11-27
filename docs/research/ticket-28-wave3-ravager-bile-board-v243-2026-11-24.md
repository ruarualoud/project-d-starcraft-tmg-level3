# Ravager 腐蚀胆汁与实际地形轮廓

Ticket28 / W3-09 · M08。冻结能力规定每个模型可在 14 英寸内的战场上投放一枚标记，官方装配册给胆汁标记规定 32 mm 圆形底座。

## 验收场景

2.42 的原移动房间中，单位位于 (10, 10)，对 (0.1, 10) 的查询已经由正式标记构造器以 BATTLEFIELD_TOKEN_COORDINATE_INVALID 拒绝。它在创建圆形标记时会将半径计入桌沿检查。此项沿用原规则。

余项使用同一已保存的移动房间初态和先前真正施放的两枚 100 × 40 mm 椭圆力墙，分别旋转 90° 和 0°。为隔离摆位，本场景声明 Ravager 在 (18,18)，并把原地图西侧普通区域在隔离场景中明确设成阻挡摆放的两条墙，并将条带轮廓放入产品既有的 footprintCells 字段。该设置用来检验形状交互。[力墙原件](../../build/ticket-28-protoss-wave3-20261120-v1/force-wall-cast/checkpoint-r1.json)

应允许胆汁放在横向力墙旁的空地和 1.6 英寸宽的开口；压住纵向力墙或实体条带时应拒绝。旧发布从原签名绑定复现。候选通过同一权威几何供查询和 Room 预览取数，随后实际支付、提交、检查后继并冷恢复。单位卡、射程、伤害和支付数值沿用冻结版本。

## 2.42 对照

| 声明的坐标（英寸） | 布置 | 原 2.42 查询 |
|---|---|---|
| (24, 26.65) | 横向椭圆力墙旁，标记与墙分离 | 读取力墙时错误要求圆形底座 |
| (22, 30) | 标记压在纵向椭圆力墙上 | 同一个形状错误，未能给出重叠原因 |
| (15, 17) | 标记可放进两条障碍之间 | 将外接矩形当作实心障碍并拒绝 |
| (14.3, 17) | 标记压在左侧实体条带上 | 正确拒绝地形重叠 |

前两项沿用实战规则创建的两枚力墙。后两项在旧版对照中单独保留地形，以免力墙的解析错误遮挡地形问题。[修前四次查询](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-placement-v243/baseline.json)

2.43 的胆汁执行器复用战场标记的实际底盘、朝向与地形的分片轮廓。2.42 从原冻结的执行器哈希重现以上结果。曾有一次夹具在签名前比较原始对象和旧房间的标准化对象；现改为建房后对照完整地形，只允许上述受控场景所声明的改变。[夹具停止记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-placement-v243/factory-comparison-stop.json)

## 2.43 正式房间结果

同一份军表从正式工厂编译，签名后的地形逐字段对照原房，只包含该隔离场景声明的墙段改动。查询和房间预览四项一致。前表第一、三行允许摆放，第二行拒绝力墙重叠，第四行拒绝地形重叠。所有预览均保留原棋盘状态。

在 (24, 26.65) 实际消耗虫族阵营牌支付 1 Biomass，生成一枚胆汁标记。原有两枚力墙完整保留，玩家随后可选择移动。重复提交复用同一回执；关闭并重新打开规则器和存储后，用一份签名回执重放，最终完整状态与原房一致。零模型调用。

[四次公开预览](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-placement-v243/previews.json) · [实际支付与移动后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-placement-v243/placed.json) · [冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-placement-v243/result.json)

## 射击衔接的地图边界

把上述隔离摆放场景原样带入有射击目标的突击阶段，视线消费者拒绝西侧地形。夹具增加了普通地形的分片，但原来的地形约定与哈希仍指向正式地图原件。四个样本证明摆放判定、支付和回放；该分片场景不能证明一张正式地图可完整对战。射击实验逐字段核对其余地形，从同一军表原房还原西侧的正式签名地形，保留已放置的力墙和胆汁，在单独的房间履行真实射击流程。[首次视线拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-plasma-v243/stop-1795520785051.json)

正式地图冻结器把普通墙和不可通行区域的每个实体矩形分别编译成地形件，带签名的多矩形轮廓用于预制图的实体坡道。因此，当前直接证实会误判的真实资产是椭圆力墙。单件普通墙携带两条未签名墙段只证明旧算法对该输入使用了外接矩形；不能据此判断官方地图的墙间通道曾全部被封。[地图冻结器](../../packages/product-composition/official-competitive-map-semantic-room-freeze-v1.mjs) · [地形签名校验](../../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs)

## 正式地图上的 Plasma Discharge

直接入表的 Ravager 在恢复原地图约定的突击阶段获得 Plasma Discharge。真实房间对两模型的 Spec Ops Marauder 单位射击，4 骰、3+，本次 3 命中、2 次护甲成功、0 次闪避、1 伤害，无模型移除。对装甲目标未触发反轻甲穿甲。随后虫族结束激活，玩家一的掠夺者可射击、冲锋或使用其能力。两份签名回执冷回放与 r2 完全一致。这是一次原生掷骰，不代表平均伤害。[动作菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-plasma-v243/menu-r0.json) · [对方菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-plasma-v243/menu-r2.json) · [回放与伤害](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-plasma-v243/result.json)
