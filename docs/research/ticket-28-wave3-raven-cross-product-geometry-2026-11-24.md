# Ticket 28 / W3-08 · Raven 十字底盘发布与军表接线

**当前采用的几何**已按用户提供的 100 × 100 mm 标定图和渐缩臂宽版本化，七项 Raven 组件已完成产品验证。下文按时间保留此前的实物资料调查。继续开发时使用[已验几何与组件清单](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/component-closeout.public.json)和[当前正式军表准入](ticket-28-wave3-raynor-formal-match-v227-2026-11-24.md)。

冻结 Command Center 公告确认 Raven 十字外廓 **100 × 100 mm**。总规则 §2.3 以接地底面为尺度。官方装配与盒装信息的 40 mm 属于 Auto-Turret。新查画师和社区实物图仍不足以读出两条臂宽及完整接地轮廓。 [官方装配下载](https://archon-studio.com/downloads/starcraft-tabletop-miniatures-game) [底盘规则](https://archon-studio.com/files/manuals/sc/StarCraft-TMG_EN.pdf) [实物照片](https://www.reddit.com/r/StarCraftTMG/comments/1xvcsag/wave_3_is_ready_and_the_wave_4_is_just_around_the/)

## 源头、影响面与旧版

- 几何目录 2.1.0 在原外廓资料上补充有来源的十字臂宽；发布同时绑定目录与社区参数。缺原资料和交换其他参数继续拒绝。工程控制尺寸仅允许候选发布。
- 兵卡重用原编译器，随新目录重新计算绑定哈希；军表生成相应十字模型。空间动作、接战、高差和视线沿用原有十字几何内核。合法域显式提供两条臂宽。
- 隔离参数为 14／22 mm，专用于判断两条不同宽度是否误换或丢失。已保存的 **44 个原几何档**和原兵卡除 Raven 外逐条一致。正式实际尺寸待有来源的实测或定标。
- [目录、兵卡与恢复检查点](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/cross-product-geometry-v21/source-checkpoint.public.json) · [下一次原生门入口](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/cross-product-geometry-v21/resume-room.mjs)

## 实际验证与剩余

| 次数 | 停点 |
|---|---|
| 1 | 测试夹具要求 `available` 时漏传任务发布，未进入军表。 |
| 2 | 夹具选错了任务组件，未进入军表。改用真实已绑定的退役产品记录校验候选限制。 |
| 3 | 新目录未重新编译依赖几何的数据，军表供应资料哈希明确拦截。复用原编译器并补充真实十字来源字段。 |
| 4 | 新目录、兵卡和军表实例化已通过，空间运行时前置仍限制圆形／矩形。该检查及同类几何消费者已修；模块加载通过，后续动作尚未签。 |

当前三轮加一次补验已用完。本项停在候选的原生空间运行时，保存 1–4 次原记录。完成定点补验需从已编译检查点验证合法域→飞行移动→Detection→后继→冷回放。之后再用实物接地轮廓完成 Raven 的八项组件准出。当前组件 **154/162**，待补 8；正式 Match **3/26**，整票 **2/16**。零模型调用。

## 客户端投影与实物复核

冻结装配册 12 页，SHA256 `1444373de1db0180388a19accc6643532a72e8ccd0883b0179e09ce2a5653cfd`。第 2 页是透明料架 1001 的两个支架零件，第 9 页第 26–27 步拼成十字，第 9–10 页的各角度仍遮住部分接地底面，不能用已知 100 mm 跨度还原完整轮廓。第 11 页的 Ø40 mm 明确标在 Auto-Turret 配件上。社区实物帖补充了外廓与组装角度，仍缺两臂实测或带比例尺的接地面正拍。 [冻结官方装配册](../../build/ticket-28-wave3-source-candidate-20261112-v1/raw/StarCraft-Terran-Raven_EN.pdf) [社区外廓讨论](https://www.reddit.com/r/StarCraftTMG/comments/1x2btav/the_raven_stand_looks_unsafe/) [社区实物图](https://www.reddit.com/r/StarCraftTMG/comments/1xwy159/ravens/)

公开投影原先会滤掉两条臂宽。Viewer、共用棋盘投影和 Web/App 绘制现保留同一组权威尺寸与旋转，用于棋子、手动摆位及密封预览。只读核对了六个角度的 12 个顶点、预备队落点预览、缺任一臂宽时的不可绘制状态，以及一份旧房间 11 模型投影的序列化逐字节一致。测试使用工程对照尺寸。实际浏览器渲染、源尺寸和原生动作仍分别待验。 [只读投影结果](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/cross-product-geometry-v21/public-projection-cross-geometry.public.json)

## 接地轮廓的实物与官方图交叉核对

官方装配册第 9 页步骤 28、29 显示向外伸出的同一侧接地脚臂。对页面截图作多阈值逐行取样：步骤 28 露出的脚臂从 24–25 px 缩到 8–9 px；步骤 29 从 21–22 px 缩到 9–10 px。新社区实物照片也显示脚臂朝末端收窄。上述是带角度图中的像素宽度，不用于给出毫米轮廓。两份图有遮挡和透视，仍需要完整接地面的正拍或平扫（毫米格纸须与接地面同平面），或厂商接地正投影／CAD。 [实物原帖](https://www.reddit.com/r/StarCraftTMG/comments/1xlm15f/raven_online/) [图像检查记录](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/cross-product-geometry-v21/physical-outline-source-review.public.json)

2.1.0 等宽十字及 14／22 mm 控制输入仅能验证接线。仅给两条固定臂宽不足以表达这件实物；准入时须取得四臂根部、末端与边界的完整轮廓。后续让军表、规则原子和客户端使用同一份局部轮廓，针对靠近臂端与臂根的接触、测距和移动验证，旧等宽输入和已绑定回放按原版本保留。

## 接地多边形原子

源证据排除等宽十字后，底盘原子增加 `measured_contour`。输入是相对测量中心的闭合顶点序列，固定为 milli-inch，并校验声明尺寸、顶点顺序和以中心为可见核的简单轮廓。凹形分解用于最近点、碰撞、视线线段与固定角度平移扫掠。全包含核对目标边线或圆边在轮廓偏移边界上的全部区间，覆盖“端点都在里面，中间穿过凹口”的情况。旋转扫掠仍明确为保守包络。

对照中的收窄轮廓在一处留出 55 milli-inch 间距，同外廓的等宽十字在该点会误报重叠。新原子还检查了只在路径中途才发生的碰撞、圆和椭圆范围、旋转贴边、轮廓调包与 malformed 输入。旧圆、矩形、椭圆及工程十字共五个形状的实用输出按序列化核对一致。最初的距离断言手估为 56，后改为斜边的法向距离并通过。现有原生停点不重跑。 [原子凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/cross-product-geometry-v21/measured-contact-contour-atom.public.json)

当前结果限于几何原子。正式 Raven 仍需实际接地轮廓，以及编译目录、军表、合法空间、客户端预览、原生后继与冷恢复对同一轮廓的消费证据。组件数保持 154/162。

## 轮廓候选进入兵卡、军表与棋盘投影

新候选目录 2.2.0 从同一 U83/C84/R50 冻结发布绑定轮廓来源 SHA256、规范化顶点、兵卡及预备模型。官方 100×100 mm 只约束外廓；工程顶点仅在候选版本使用。缺来源字节、内容不符、替换已绑定轮廓、模型漏传或改传顶点均被拒。旧 2.1.0 几何目录重编逐字段一致，其他 44 个几何档及兵卡未产生差异，对照军表的三支其他单位一致。首次读候选用了不加载旧发布社区资料的通用几何用途，改用现有发布解析器的组件用途后通过。 [军表凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/release-to-roster.public.json)

棋盘公开模型字段只投影 x／y 顶点。已核对七个角度下的绘图顶点与权威原子完全一致，并覆盖预备队密封预览、手动摆位参数及缺失或损坏轮廓。旧比赛快照的公开状态与 11 个模型的棋盘投影逐字节一致。前端绘制共享同一轨迹。此次验证限于投影与数据，不包含浏览器实渲或 Native 提交。 [投影凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/public-projection.public.json)

## 轮廓进入实际规则查询与预览

空间合法域、规则预览、视线、接战、高差直接消费 2.2.0 工程候选的发布顶点。模型和合法域顶点篡改均被拒；按轮廓测得边距 6.635 英寸，同一 100 mm 外廓取矩形会得到 6.264 英寸。普通视线和高差查验都从兵卡、真实底座和地图构造。高差视线单次、公共批量、内部按地图复用的批量一致，覆盖先查地面单位再查同地图 Raven。

首轮只读查验墙体缺显式高差分类，修正场景。随后真实移动预览把飞越误判为地面路径阻断。按冻结总规则 PDF 第 60、87 页，将 2.2.0 的飞行路由改为水平点到点，允许越过地形和模型；仍用完整底座核对终点，地面与飞行可接触但不重叠，敌我飞行保留 1 英寸间距。通过案例中，带绕路点的请求产生同一条直飞预览，越墙合法、落在墙内被拒。地面旧发布的移动菜单、普通／高差视线、接战图前后完整序列一致。 [规则查询凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/native-rule-consumers-read-only.public.json)

本次只读结果没有执行签名 Native 提交。研发使用的是工程对照轮廓。正式部署、含特殊标记的飞行组合、签名动作后继和冷回放仍需相应验收。保留 2.1.0 的四次记录和授权边界。

## 预备队部署与 Internal Tech Module

从已绑定的候选发布和既有用户级军表工厂实际购买 Internal Tech Module，使用已冻结的 Standard 两席部署边与任务 Supply。己方顶部入口保留，对手底部入口被拒，左右中立边因购买而开放。左边入场从完整轮廓刚好离桌的位置起飞，行程 6.769 寸，飞越墙和草丛；落在墙内和底座越出入口的请求拒绝。仅飞过草丛时不移除。规则查询、先导模型预检查和完整动作预览均接受同一条路线，状态保持不变。

实边测得距敌 8.000、8.001 寸的中立边落点被拒；8.002 寸通过，验证既有 Within 边界的 1 milli-inch 容差。未购买升级时仅己方入口，直接填中立边 ID 也会被拒。同阶段已激活后无部署域。首次只读夹具用的解析用途漏掉审阅过的能力目录，切到现有组件发布用途后通过。此结果仍为工程轮廓的只读证据，实物准出和签名动作待验。 [预备队入场凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/reserve-entry-read-only.public.json)

## 公开尺寸复查

Command Center 冻结公告给出十字两轴 100×100 mm。官方产品清单与装配册、两帖实物展示、组装讨论和高度讨论补足外观及配件信息。可见资料未给出完整接地边线或可恢复两轴的同平面定标。仍只缺支架接地面的带尺正拍或平扫，或厂商接地面尺寸图／CAD。Storm／Gale 的中心与外圈已另有官方数据和候选产品证据。 [官方资料入口](https://starcraft-tmg.com/downloads) [实物展示](https://www.reddit.com/r/StarCraftTMG/comments/1xwy159/ravens/) [另一实物展示](https://www.reddit.com/r/StarCraftTMG/comments/1xhqxo0/my_loot_from_spiel_2026_the_raven/) [高度讨论](https://www.reddit.com/r/StarCraftTMG/comments/1xf49ls/odd_question_approximate_height_of_raven_model/) [风暴 32 mm 凭据](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-official-marker-32mm-v3/cast-preview.public.json)

## 反装甲飞弹与 Corvid Reactor 的实际 Room 预览

2.2.0 的军表轮廓进入组合运行时后，近战构造器因仍只接受圆形和矩形，报 SELECTED_MELEE_BASE_SCOPE_UNSUPPORTED，连移动阶段的飞弹菜单也打不开。近战现从发布校验模型轮廓，再由共用几何原子计算精确底盘间距。将已绑定的轮廓改成矩形，或改写任一轮廓顶点，均被拒。与修改前代码比较，真实旧版 2.0.0 场景的近战描述符及突击和近战菜单序列完全一致。

同场对照中，候选轮廓测得 Stalker 距 Raven 5.056 寸、Zeratul 6.341 寸。误套矩形外廓会反过来把 Zeratul 判为最近。隔离 Room 的 0 CP 选项只允许 Stalker，1 CP 菜单允许两者。实际预览以 0 CP 选 Stalker、以 1 CP 选 Zeratul，均与规则查询动作逐字段一致；用 0 CP 选 Zeratul 被房间拒绝。两次成功预览后仍为 r0。使用工程轮廓，实物轮廓、实际扣费与减甲、首用历史及冷回放仍待。 [Room 凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/anti-armour-corvid-room-preview.public.json)

## 反装甲飞弹实际扣费、激活交接与 Cleanup

同一2.2.0工程轮廓的两间隔离 Room 均从 r0 使用上一轮已保存的预览动作。0 CP 瞄准 Stalker，无卡耗尽，护甲骰门槛从 4+ 到 5+；1 CP 瞄准 Zeratul，耗尽一张阵营卡，护甲从 5+ 到 6+。两房只记一次使用，另一单位状态不变，原签名冷回放精确。免费分支从 r1 实际 finish_activation 到 r2，移交第二席，减甲仍在。一次断言误把缺省字段当 null，直接读取已签 r2 补验，未重复提交。 [付款回执](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/anti-armour-corvid-signed-v1/result.public.json) [r2 冷回放](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/anti-armour-corvid-signed-v1/discount/r2-cold-replay.public.json)

原组合军表与根运行时只认可既有能力名单，Raven 单独无法加载 Cleanup。将反装甲飞弹的已绑定定义纳入同一个清理流程，保留已有隐藏反应前置。用签名 r2 中的实效和使用历史建立隔离 Cleanup 阶段，执行一次真实房间清理。护甲从 5+ 恢复 4+，减甲及标记移除，首次能力记录保留，下一步为先手判定。该房冷回放精确。原付款发布的运行时与发布哈希均精确重建。此场景单独声明 Cleanup 阶段，尚无同房连续跨阶段／跨回合或实物尺寸证据。 [Cleanup 凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/anti-armour-corvid-signed-v1/cleanup/result.public.json)

## 再下一回合的 Corvid 使用历史

从已保存的 Cleanup r1 执行真实先手判定，原房至 r2、第 2 回合 Start of Round，重新打开持久存储后签名回放一致。当前组件房不持有正式 Match 的任务开局，因此在任务动作前查询行动菜单，触发旧轮供给账本拦截。正式 Match 从任务阶段进入移动时才用冻结任务重建供给及损失账本。原房保持在 Start of Round。 [先手签名与停点](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/anti-armour-corvid-signed-v1/cleanup/initiative-cold-replay.public.json)

用原签名 r2 状态和未改动的首用历史建立已完成任务开局条件的独立轮二移动房。轮二供给由冻结任务原子生成，行动方由正式阶段选择原子生成。菜单对最近的 Stalker 只提供 1 CP。房间实际耗一张卡，护甲门槛再次从 4+ 变成 5+，保存第 1、2 回合使用历史，签名冷回放一致。第一次场景读取夹具把阶段选择的数组当成对象，修正后复用已过的先手冷回放结果。此证据使用工程轮廓，含声明的任务开局条件。 [第二回合实际施放](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/anti-armour-corvid-signed-v1/round-2-movement/result.public.json)

## Detection 的六寸边界及反应后继

沿用候选 2.2.0 与冻结能力数据，实际由 Zeratul 移动获得隐匿并结束激活。使用当时同一状态计算两个相距 0.001 寸的 Raven 落点。权威工程轮廓最近边距为 6.002 和 6.001 寸，分别保留及移除 HIDDEN。前一个落点若误用矩形外廓会测得 4.587 寸并误触探测。两种条件预览不改变原状态。

选择内侧落点签名完成飞越地形，确实移除 Zeratul 的 HIDDEN。Nerazim 使用 Might 反应并耗尽阵营卡，随后恢复 Raven 激活，结束后交回第二席。检测历史只记录一次。六条房间签名冷回放精确。该验证使用工程控制轮廓。2.1.0 历史原生门保持原计数。 [六寸、反应及回放证据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/detection-edge-signed-v1/result.public.json)

## Railguns 从签名探测状态进入射击

读取已保存的 Detection r6，并从原回执提取探测前 r2。两者保留原状态，分别在独立验收中声明突击阶段。探测前 Zeratul 仍隐匿，底盘边距 9.828 寸，射击查询没有可用域。探测后边距 6.001 寸，房间签名预览与规则查询逐字段一致。

本次实际四颗 3+ 命中骰为 4、2、1、3，命中两次。一次护甲成功，造成 1 点伤害，无模型移除。结束激活后交回第二席，两条新签名在重新打开的房间中精确回放。结论覆盖工程轮廓下的射击、伤害和交接。实际实物轮廓与正式 Match 的阶段连续性分别保留为未验。 [签名及实骰](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/railguns-assault-signed-v1/result.public.json)

## Internal Tech Module 签名入场与供给更新

原 2.2.0 组件预览允许 Raven 从左侧中立边入场。使用同一 Room 状态计算后继发现 Raven 已列为在场，但账本仍停在桌面 0、预备 2、可用 6。来源是部署提交仅为既有两个特殊入口刷新占用，普通及 Raven 入口漏接。修复复用权威回合占用函数，适用于已绑定 2.2.0 的部署。旧几何的分支条件保留。 [修前反例](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/neutral-entry-signed-v1/before-native-supply-preflight.public.json)

同一 2.2.0 发布分别执行普通入口及左中立边。两者桌面 Supply 0→1、预备 2→1、可用 6→5，同步退出预备队。中立边从签名的 6.769 寸路径飞越墙和草丛，草丛保留；事件附上 Internal Tech Module 的冻结定义。两房均消耗 Movement，菜单不允许再次移动或部署，结束后交回对手。四条签名冷回放精确。实物接地轮廓与正式连续 Match 仍待。 [四签及供给前后](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/neutral-entry-signed-v1/result.public.json)

## Raven 入场后部署炮台

候选生成单位已经有冻结档案，射击运行时却只读取在场军表和 Morph 能力，导致无炮台的初始房无法注册 Gauss Cannon。修复让射击能力注册读取已核验的生成单位档案，并匹配武器来源哈希与默认配装。具体动作菜单继续由房间状态、真实单位与反应时窗产生。

在同时购买 Internal Tech Module、Explosive Shrapnel Shells 的军表上，从中立边入场。最初 4.800 寸的落点距敌方模型仅 7.768 寸，按规则正确拒绝；在原 r0 改用 4.500 寸落点，最近边距 8.068 寸。到原签 r1 后，根据查询合同移除夹具多给的 definitionId，复用已通过入场。实际支付 1 CP，签名生成归属 Raven 的炮台，炮台 Supply 0；靠友方 Marine、远离施放 Raven 的点被拒。生成后本回合不能重复施放。结束激活后交回对方，三签冷回放精确。下一步以该 r3 验证炮台警戒和升级。 [生成凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/raven-turret-from-entry-v1/result.public.json) [停点记录](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/raven-turret-from-entry-v1/attempts.public.json)

## 实生炮台的 Overwatch、破片弹和到期移除

原生成房从 r3 签名走到 r5。Zealot 移动并结束激活，移动阶段无警戒，新增两条冷回放精确。由该签名后继建立突击条件，Zealot 用合法 Run 并结束激活。真实房间打开灯塔外的炮台 Overwatch 时窗，炮台通过 0 CP 反应授权使用 Gauss Cannon。

Raven 选装的 Explosive Shrapnel Shells 确实进入本次射击。六颗 3+ 命中骰分别为 5、3、2、2、1、1。Light 目标触发 D3+1 容量 2，两次命中穿过护甲，最终造成 2 点伤害，无人员移除。射击预览与规则查询一致，恢复原行动顺序，炮台激活标志不改变，四签冷回放精确。 [突击凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/raven-turret-from-entry-v1/overwatch-assault/result.public.json)

使用已完成射击的签名状态建立回合末条件。真实 Room 在 Timed Life 移除炮台，保留 Raven，没有给敌方击杀或供给损失记账。完成 Cleanup 后进入先手判定，并验证四签冷回放。突击与回合末均声明阶段条件，仍待整局连续接线与实物接地轮廓。 [移动前缀](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/raven-turret-from-entry-v1/overwatch-prereq-r5-cold-replay.public.json) [Timed Life 凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/contact-contour-geometry-v22/raven-turret-from-entry-v1/timed-life/result.public.json)

## 尺寸缺口与续行顺序复核

冻结 Command Center 公告原件 SHA256 为 `c5fe1cf4b776d445a392c0a9b09f81c137f018913dcf87c9609f18741044a5cb`。同一公告列出 Raven 十字外廓 100 × 100 mm、Psi Storm 中心标记直径 32 mm、Psi Blast 范围模板直径 5 英寸（127 mm，半径 63.5 mm）。5 英寸同时符合此前确定的开发参数。 [冻结公告](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/official-geometry-lookup-20261117/wave3-bases-official-news.json)

Storm 与 Gale 已在 32 mm 的候选发布中核对规则查询和真实 Room 预览，两个入口都读到 32 mm，外圈仍为 127 mm。保存的 30 mm 工程候选已有旧签名，仅用于历史复现。32 mm 候选还需要原生提交、后继与冷恢复。 [参数配置](../../content/source-releases/wave3-20261124-storm-marker-official-geometry-settings-v3.json) [候选预览](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-official-marker-32mm-v3/cast-preview.public.json)

复查官方 Raven 介绍、官方装配资料、盒装清单和玩家实物资料。现有图片有遮挡或斜视，玩家分享的额外实测为整机高度，未找到可定标的完整接地轮廓。后续目标是取得接地面的正拍、平扫或厂商接地平面图，其中照片或扫描的标尺与底面同平面。轮廓补齐后，从军表绑定和受影响的距离、入场、接战等 Room 消费节点继续验证。 [官方 Raven 介绍](https://starcraft-tmg.com/news/rules/starcraft-miniatures-game-raven-nova-terra-wave-3) [官方测距规则](https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf)

原 T28-W3-08 的子项续行仍建议另做 W3-09，与组件优先、先解决当前未知的要求冲突。该指针已改为接地轮廓查证，并更新当前状态。此轮核对证据，统计仍为组件 154/162（Raven 八项待准出）、正式 Match 3/26、总项 2/16。

## 原始装配图层核查

从冻结装配册提取第 9 页独立 JPEG 714 和透明遮罩 908。原图 387 × 762 px，保留页面缩放前的边缘。四个脚端可见，按两轴 100 mm 做四点配准。四点恰好决定配准，缺少能独立检查底面投影的第五点。靠内的背侧边线及两片支架的交叠处被立柱遮挡，亮侧壁也跨出了接地边线。 [图层、原件哈希与脚端像素记录](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/cross-product-geometry-v21/assembly-original-layer-assessment.public.json)

第 2 页透明料架图显示未拼装件的侧面。第 9、10 页其余装配图仍有立柱遮挡，不能补齐那一段底面。产品接线继续等待完整实测或厂商底面图。已完成的候选证据从原停点保留。

## 资料取得状态

厂家 SCMG0040 批发页列四张产品图，未提供技术尺寸图。直接读取这些大图受限；已定位 10 月 9 日官方 Wave 3 AMA，视频获取受限，未核实是否有完整底面帧。涂装工作室的清单确认使用透明飞行架，未提供可定标底面。当前缺件仍是完整接地面及同平面的毫米尺度。 [厂家产品资料](https://b2b.archon-studio.com/en/starcraft-r-raven/3-54-1611) [官方 Wave 3 AMA](https://www.youtube.com/live/m4z0iEUh2U4) [涂装工作室实物清单](https://minisforwar.com/store/painted-raven-starcraft/)

厂商总询问入口已定位。需要向官方索取 `SCMG0040` 透明飞行支架（料架 1001）按总规则 §2.3 使用的接地面尺寸图，或一张完整底面带同平面毫米尺的正拍。已知十字外廓 100 × 100 mm。询问聚焦背侧内角、四臂轮廓和两片交叠处。需要用户提供资料或授权向外发送询问后继续。 [Archon Studio 官方联系表单](https://archon-studio.com/contact-form-page)

## 附件图估轮廓候选

用户提供的新图给出单条支脚沿长度的四档宽度估读：根部 9–10 mm、半臂 5–6 mm、四分之三 4 mm、端部附近 2 mm。采用 9.5、5.5、4、2 mm。候选在已知 100 × 100 mm 外廓内使用四臂对称与分段线性插值。背侧轮廓没有独立测量。原图和源参数均按哈希绑定，发布使用已有 engineering_control 限制。 [原图](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/user-annotated-assembly-step28.png) [来源与假设](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/source.public.json)

正式编译器生成 28 顶点，发布冷读后，兵卡查询与真实军表模型使用相同顶点。同一对角测点距候选轮廓 0.889 寸、旧工程轮廓 0.680 寸，沿轴尖端测点均为 0.031 寸。新发布拒绝传入旧轮廓，其余 44 个几何档及兵卡逐项一致。复用 32 mm 中心及 127 mm Storm／Gale 模板配置。未签原生 Room 动作。 [发布](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/manifest.json) [消费凭据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/result.public.json)

## 四臂间隙与地面模型移动

按附件候选轮廓计算，圆底盘完整放在 100 × 100 mm 外廓中的一个空隙时，四个象限的极限约 47.2–47.3 mm。25、32、40、45、46、47 mm 均有合法几何位置，50 mm 与 80 mm 在该条件下无位置。同一图估模型使用四臂对称，极小象限差异来自千分之一英寸量化。本计算不涵盖实物的竖向净高。 [几何容量](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/ground-base-fit-v1/circle-fit.public.json)

Raven 固定在 (20, 15) 寸，Zeratul 的 40 mm 底盘从 (17, 16.038) 寸移动到 (21.038, 16.038) 寸。路径穿过支脚，落点完全位于外廓内空隙。把终点设在路径中穿过支脚的位置时，权威房间拒绝重叠。同一标准规则实例化与房间预览动作一致。移动打开 HIDDEN 丢失反应，双方依次放弃，结束激活正交给对方。保存的四条原生回执冷回放一致；场景和图估几何仅用于隔离候选。 [原生验收](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/ground-base-fit-v1/classified-wall/room-result.public.json)

验证先后停在远端测试墙缺少 elevationSurface、未按反应窗口顺序选择、以及误判第一次放弃已关闭窗口。已从合法域和保存的 r1、r2 逐次纠正验收，没有重跑已签动作。 [初始停点](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/ground-base-fit-v1/initial-stop.public.json) [反应停点](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/ground-base-fit-v1/classified-wall/finish-stop.public.json) [交接停点](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/ground-base-fit-v1/classified-wall/first-pass-checkpoint-stop.public.json)

规则依据为官方总规则 §2.3、§4.1、§8.5.3。移动中的飞行／地面底座穿过许可与终点重叠禁令同时成立。 [官方总规则](https://archon-studio.com/files/manuals/sc/StarCraft-TMG_EN.pdf)

## Seeker Missile 施放与延迟结算

冻结兵卡将 Seeker 列为 20 矿选装。未选装的 Raven 菜单只有移动。选装后的真实军表在移动阶段支付 1 CP，耗竭人族势力卡并锁定 Stalker，远处 Zeratul 未进目标菜单。立即伤害、同轮重复宣告和提早触发均没有发生。施放后结束激活，移动房两签从原 r0 冷回放一致。 [选装及付款](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/cast-result.public.json) [未选装对照](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/unequipped-control.public.json)

用已签移动后继中的原付费日志建立两个隔离突击末状态。近距 6.456 寸时，该目标得到四个 2 伤的自动命中，零 Surge。护甲后总伤害 4，3 点盾与 1 点本体伤害对账，Stalker 由 6 至 5 HP。远距场景先在原移动房从 r2 实际签名让 Stalker 移至 (36, 15) 寸并结束激活，保留同一付款与目标。突击末距离 12.456 寸且无 Stationary，签名记录跳过，血量不变。两支结算均关闭自身窗口，冷回放一致。  [近距](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/assault-end/assault-end-result.public.json) [护盾对账](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/assault-end/damage-accounting.public.json) [远离移动](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/stalker-reposition-result.public.json) [离圈跳过](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/assault-end-range-skip/skip-result.public.json)

本次共八条权威签名，无生产代码改动、无模型调用。首个施放夹具预期漏了选装，阶段末夹具首次在运行时文件落盘前读取，已纠正并保留诊断。正式 Match 顺序、同房跨阶段、接战规避和实物底面仍有明确边界。

## Seeker 单源条件收口与护盾初态

两个隔离突击末场景使用同一条已经签名的 1 CP 飞弹记录。Stationary 场景声明目标本轮未移，Raven 在 16 寸横坐标，底边距 10.456 寸。尽管超出复测 8 寸，仍启动 HITS 4 (2)。接战场景放入合法连续的 Marine 队形，权威接战图确认 Stalker 接战。实际签名规避动作绑定 4 个规避骰，两支各三签并冷回放一致。 [Stationary](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/assault-end-stationary-v1/assault-end-result.public.json) [接战规避](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/assault-end-engaged-v1/assault-end-result.public.json)

接战审计发现 Seeker 组件初态缺 Shielded 同步。工厂先记录 Stalker 本体 6 HP 与首次模型护盾 3，旧初值只投影本体；部分耗盾后才计算有效剩余血量。仅加入 Seeker 组件构造分支，复用已有 Shielded 生命周期与计算。新建 r0 验证 9、无盾 Marine 仍按本体，冷读一致。旧结算回执保留。 [代码](../../packages/product-composition/official-release-roster-state-v2.mjs) [初值验收](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-missile-signed-v1/equipped/shielded-hp-init-v1/shielded-init-result.public.json)

Seeker 单源累计十四签，仍待共享突击末窗口、实物轮廓和正式连续 Match。


## Seeker 与 Storm 的同房连续结算

合并 Raven 图估底盘和 32 mm Storm 数据时，旧战场组件快照绑定旧底盘版本。用原编译器和装配册引用、Deep Tunnel 用户确认及 Force Wall 原件，重新编译同版战场组件。逐项比较证据及未解条目一致，只改变与几何关联的绑定。只带 Storm 的初态也缺两项非致死政策，原因是先前验收军表中的其他能力提供了政策。军表构造器现按冻结核心规则注入 Storm 所需政策，旧房不重编。 [修复](../../packages/product-composition/official-release-roster-state-v2.mjs)

新隔离 Room 的人族在移动阶段支付 1 CP 锁定 Stalker，神族支付 2 PE 放置 32 mm Storm。移动末以 127 mm 模板结算非致死伤害。突击末第一玩家先执行 Seeker，自动命中完成后交给第二玩家执行 Storm。守方实际选择伤亡并登记 Supply 损失。r15 进入战斗，15 条原生回执全部冷回放等同。 [完整证据](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-storm-shared-order-v1-registered-passive/phase-successor-result.public.json) [排序快照](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-storm-shared-order-v1-registered-passive/shared-order.public.json) [验收停点](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-storm-shared-order-v1-registered-passive/continuation-stops.public.json)

Raven 使用附件图估底盘。八项实体准入仍待完整接地轮廓，组件记录维持 154/162。32 mm 原生执行只覆盖此 Storm 场景，Gale 仍为旧尺寸原生证据加新版预览。正式 Match 尚待，模型调用为 0。

复查 Archon Studio 公开零售页和 Raven 设计说明。零售页只有包装尺寸、炮台圆底清单和产品图。设计说明确认支架特意留出地面通行空间，仍未给出完整接地面尺寸图。 [厂商零售页](https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-raven) [厂商设计说明](https://archon-studio.com/blog/starcraft-tmg/starcraft-miniatures-game-raven-nova-terra-wave-3)

## Raven 轮廓换版校验

在隔离 SQLite 注册两份真实候选，故意把第一份的几何目录与第二份的轮廓配置放进同一发布。修前两个文件各自通过哈希，但产品绑定 API 写入了房间绑定，兵卡随后才报轮廓不一致。发布解析器现复用已有底盘校验，在 2.1／2.2 加载阶段检查目录与配置是否同源。修后得到同一个明确拒绝，数据库没有写下绑定。两份原 2.2 候选和原 2.0 的 44 条记录均按原清单绑定和重读，原哈希一致。 [修复](../../packages/source-data/official-release-context-v2.mjs) [修前与修后结果](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/raven-linked-geometry-bindings-20261124.public.json)

该校验为接入实物轮廓提供更早的失败反馈。物理资料仍缺完整带尺底面。正式 Match、历史房间和费用状态保持原停点。

## Raven 轮廓替换编译入口

旧候选分别写出几何和兵卡，战场组件仍绑定旧几何；混合房间先前需要单独重编。新脚本从冻结外廓、轮廓配置与其证据字节开始，用既有编译器一次生成底盘、兵卡和战场组件，最后写候选清单。保留实际战场组件事实，运行时留给规则工厂按新绑定重新编译。现有清单、数据与签名不修改。

使用已有附件图估来源验证了统一入口，新输出与原候选 28 顶点完全一致。真实发布解析器冷读了 45 张兵卡属性和 8 个战场组件，另 44 个底盘档保持原值。错误的来源 SHA256 在创建输出前被拒绝。该结果未覆盖实物轮廓或正式房间。 [编译入口](../../scripts/compile-wave3-raven-geometry-v1.mjs) [验证记录](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/replacement-compiler-v1/result.public.json)

取得实测底面后，把其数字轮廓和实际来源字节登记在与现有等结构的几何配置。运行入口依次接受配置文件、当前战场组件的参考发布清单、全新 build 输出目录和全新发布 ID。输出清单用作接续规则工厂的输入。

## 电子桌面 v1 与 Seeker Missile 组件准出

此前的续行记录把物理测绘作为组件验收前提，导致同一附件反复被报缺。官方说明确认飞行支架允许地面单位在下方通行，装配图与用户提供的标注支持电子桌面的近似轮廓。采用 100 × 100 mm 外廓和四臂相同的渐窄轮廓，根部、半臂、四分之三及末端按 9.5、5.5、4、2 mm 取值。实物校准精度单列。若有新测量，另建版本，原房间仍按原哈希回放。[原图与来源](../../content/source-releases/wave3-20261124-raven-assembly/source.json) [官方设计说明](https://archon-studio.com/blog/starcraft-tmg/starcraft-miniatures-game-raven-nova-terra-wave-3)

编译入口默认选用此版本并核验图像字节和顶点。新发布先读取构造规则所需数据，注册运行时后才可进入能力房间。一次工程验证在构造前误取执行用途，暴露了此依赖顺序。旧候选仍可按旧来源读取，缺运行时的执行入口继续拒绝。

新版房间实际支付 1 CP 并锁定 Stalker，结束激活交给对手，关闭并重开数据库后两条签名回放一致。新旧 28 个顶点相等，其余 44 个底盘档逐项相等。已核对同一声明哈希对应的近距、离圈、静止及接战条件，以及相同轮廓上 Seeker 与 Storm 同房次序的 15 条签名回放。该 15 步来自既有实验。本次增加一项 Seeker Missile 组件准出，合计 155/162，正式 Match 3/26。[本次结果](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/component-closeout.public.json)

## 桌面 v1 探测与显形后的射击

军表重新构造了 Raven、Zeratul 和奈拉齐姆势力卡。两模型最近边距为 6.003 寸时不触发，6.000、5.997 寸时触发。移动到边界后真实移除 HIDDEN，开放反应并回到 Raven 激活，6 签冷回放。射击场景沿动作 r6 保存的位置和状态单独声明突击阶段，Railguns 使用四颗 3+ 命中骰，实际四个 2，无命中。结束激活后交对方，2 签冷回放。两个房间均是零模型的组件实验。

[detection/result.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/detection-railguns/detection/result.json) [railguns/result.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/detection-railguns/railguns/result.json) [detection-railguns/cold-replay.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/detection-railguns/cold-replay.json)

## 渡鸦反应堆与反装甲导弹

同一军表、同一摆位。零费只能选距底座 5.056 英寸的追猎者，其护甲从 4+ 变为 5+；普通选项消费 1 CP，命中距底座 6.408 英寸的泽拉图，其护甲从 5+ 变为 6+。两支分别保留另一目标护甲，使用后公开菜单移除重复使用，各自结束激活并完成冷恢复。

[corvid-discount/result.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/anti-armour-corvid/corvid-discount/result.json) [corvid-regular/result.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/anti-armour-corvid/corvid-regular/result.json) [anti-armour-corvid/cold-replay.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/anti-armour-corvid/cold-replay.json)

## 普通／中立边增援、自动炮塔和爆炸弹片收口

公开菜单实际部署原先在预备队的渡鸦，两边进场对照均使在场人口 1→2、预备队 1→0、可用 5→4。中立边来源为已购买的 Internal Tech Module，敌方排除距离 8 英寸。渡鸦支付 1 CP 后生成 40 mm、零人口的炮塔。突击取自上述真实后继，显式声明阶段后，狂热者 Run 触发同一炮塔的警戒。真实机炮射击六骰命中阈值均为 3+，对轻甲命中升级条件并出现 3 点伤害标记。三间隔离 Room 的 2、5、4 份回执均冷回放完全一致。

[compile/result.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/entry-turret/compile/result.json) [raven-ordinary/result.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/entry-turret/raven-ordinary/result.json) [raven-neutral/result.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/entry-turret/raven-neutral/result.json) [turret-assault/result.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/entry-turret/turret-assault/result.json) [entry-turret/cold-replay.json](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/tabletop-assembly-v1/entry-turret/cold-replay.json)

## 正式 Standard 开局准入对照

同一 Fire in the Sky 任务和虫族对手，坦克对照 27/27，公开菜单给出回合开始动作。雷诺 Marine 表 13/15，缺 Rapid Ingress 与 Ready for Pickup。加入装有 Internal Tech Module 和 Explosive Shrapnel Shells 的渡鸦后为 14/21，新增五个缺口为反装甲导弹、部署炮塔、侦测、弹片与科技模块。只读覆盖与实际开局的七个缺失 ID 完全相同。 [正式开局证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/tabletop-raven-m01-v1/admission.json)
