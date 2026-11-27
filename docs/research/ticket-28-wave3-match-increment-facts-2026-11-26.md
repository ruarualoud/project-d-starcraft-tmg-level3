# Ticket28 / T28-W3-11 · 正式对战增量事实

## 来源与变动

按冻结的官方写表器数据与旧能力 IR 比较，414 条可识别能力中，240 条沿用旧来源，12 条有字段变化，162 条新增。12 条里有十条改选购费，一条改名称（雷诺 C-14），一条改规则文字（使徒的 Psionic Transfer）。选购费与激活支付分别记录。每条可查单位或卡、稳定 ID、来源哈希、旧执行器、费用、阶段、原文和引用。判定单位是否属于 Wave3 新增看来源差分，判定这份军表能否对战看所选定义与候选版本的正式工厂结果。[逐条事实 JSON](../../coordination/wave3/match-increment-facts.json)

网页和较早的桌面验收都用了发布名 `wave3-standard-tabletop-admission-inputs-v1`。两份清单绑定相同的数据快照、规则和能力身份，其中 `deploymentCardGeometry` 的内容不同。网页清单为 `696469a3…`，早期桌面清单为 `6ead817f…`。一条记录如果只有原文或稳定 ID，只能用于核对来源；涉及部署边界时应指定清单哈希、部署卡和地图。入口校验还核对具体房间的运行时哈希。

## 本次四项工程验收

| 编号 | 已验证的产品行为 |
|---|---|
| M01 建房 | 将发布、军表来源和原生处理器逐定义关联。网页建房接口读取两张真实选购军表，在隔离版本 2.99 建成 Standard 房间，并返回首个任务动作。详见下方来源统计。 |
| M07 人族 | 130 个定义均已定位。支援军表 34/34，游骑兵从预备队进场后完成激活。人口池和争点人口分别按各自规则取值。 |
| M09 神族 | 阿塔尼斯的代受攻击和第二次冲锋已有实签。支援军表 47/47，光子过载的进场、自动命中、护甲和交还行动权已有原房回执。 |
| M24 跨入口 | 正式规划棋盘与签名房共享同一规则和状态。Skirmish 接收指定军表和地图，从两席读取决策查询，错误版本被拒绝，重复启动返回同房。 |

M25 的桌面和窄屏浏览器已有验收。原生设备留待后续。


- [2.91 网页来源的具名建房结果](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/web-openings)
- [游骑兵原房与阵形来源](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/raider-reserve-on-human-map)
- [规划与实战实际回执对照](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/planning-board-binding.public.json)
- [同一网页房间的地形与路线回执](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/planning-web-map.public.json)
- [两种规模的网页重连及结局](../../build/ticket-28-wave3-human-lobby-v1/incremental-pass/summary.public.json)

已发布的两套网页预设绑定 2.84.0。在隔离产品服务中使用 `--offline --wave3-match-candidate=2.99.0` 可由同一网页入口建立候选房。房间保存自己的版本，重开沿用原绑定。Wave3 的四个组件工作项分别记录 55、44、40、23 条通过；总数与逐条正式 Match 接线是两个验收层次。全程外部模型调用 0 次。

## 攻城坦克的增量记录

Coordinated Strike 在这份冻结数据中是 20 矿的选购升级，使用费为 0 CP。早期组件房间已保存选定友军后的 6 个射击观察位置、r2 行动权交接和两条签名回执的冷恢复。到网页的 Standard 建房工厂，2.91 的只读清单把这条已选升级列为待接，严格建房据此拒绝。原因在正式工厂选择特性执行器的清单；原有坦克执行器、Shock Cannon 射击来源和 FAQ 最近指定者逻辑均可复用。[组件实际选择回执](../../build/ticket-28-wave2-capabilities-20261113-v1/tank-coordinated-strike/source-projection-consume.json) · [2.91 建房原始拒绝](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/web-openings/armour-2.91.0.public.json)

2.93 以相同双方军表、清单哈希、地图、任务和部署重新进入正式工厂，23/23 项已注册，菜单产生进入第一回合的动作。比较两张清单，唯一变化的能力是 Coordinated Strike。[2.93 正式军表与开局菜单](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/web-openings/armour-2.93.0.public.json)

另外用医疗兵、坦克和支援卡组合核对 2.93。正式清单共选中 34 项，其中 19 项已注册，15 项被明确拒绝。按冻结来源逐 ID 回查，15 项中 12 项沿用旧文字，3 项为本期新增。按持有者分为 11 项卡牌、2 项医疗兵升级和 2 项坦克弹药。这些是特定军表在该候选版本上的接线缺口；其余暂未归并的定义分别列在事实清单的 `terranMatchEvidence.stillToReconcile`。[34 项军表及拒绝明细](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/web-openings/support-2.93.0.public.json)

随后对其中三个武器升级做了针对性修复。坦克的 Shaped Blast、Smart Shells 接入已有的射击声明选择；医疗兵的 A-13 接入 Optical Flare 原有的 16 英寸范围计算。2.94 的独立医疗兵／坦克军表通过 24/24 项严格准入，开放第一回合动作。此处验证的是选购升级经过正式工厂并进入对战的边界。[2.94 的军表、所选能力和菜单](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/web-openings/support-weapons-2.94.0.public.json)

## 人族支援军表与召唤来源

同一份支援军表由 19/34 到 34/34。医疗设施使医疗兵占用人口池 0，正式第一回合下的争点人口仍为 1。渡鸦和 Nova 混编暴露了炮台警戒被自动命中模块误拦，现由激活结束反应处理。在实际召唤的点防无人机上查到 Gliding。六条补录证据逐条注明是武器注册、建房被动绑定还是签名召唤后的查询。逐定义来源合计为 130/130。[正式验收回执](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/terran-generated-296.public.json)

## 阿塔尼斯与独立规划棋盘

Hierarch’s Stand 的放弃与发动分别在 r4、r5 完成。发动方支付 1 PE，将攻击改向阿塔尼斯，闪避资格随改后的目标生效。Lightning Dash 的实签记录到 r11，先冲第一支 Marine，再支付 1 PE 冲第二支。两次冲锋成功，Devastating Charge 只触发一次，行动权交回对手，关闭重开后恢复相同状态。

独立启动的写表查询使用正式 Standard 建房工厂。规划棋盘的完整状态、规则运行时与已保存的网页房间 r0 哈希相同；Teach 查到同一部署几何、1,804 项地形和 5 个任务点。完整计划和模型策略效果属于后续独立验收。

[standUse](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/artanis-stand-use-298/result.public.json) · [standPass](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/artanis-stand-pass-297/result.public.json) · [secondCharge](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/artanis-dash-298/result.public.json) · [independentBoard](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/independent-planning-board.public.json) · [support](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/web-openings/protoss-support-2.99.0.public.json)

## 2.99 隔离候选的最终验收

三族逐定义均有可追溯的正式建房或生成物证据。人族 130，神族 118，虫族 166。405 条有已准入房间的来源或原生注册记录，另 9 条由生成物消费回执单列（水晶塔 3，虫洞及蟑螂衍生单位 6）。记录保留各自的军表、版本、来源和适用范围。覆盖数字统计稳定定义，单个定义可对应多个实际动作。

在同一 Standard 配置中，支援组合 47/47、不含过载星核的对照 45/45、不朽者运输 39/39、圣堂 41/41、风暴与烈风 28/28，均给出首回合任务动作。网页建房接口以人工军表的真实输入格式提交支援组合，签名建房与只读准入的菜单一致。[网页建房回执](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/offline-standard-299/result.public.json) · [逐定义清单](../../coordination/wave3/match-increment-facts.json)

光子过载在特殊进场后产生守方反应窗口。r3 发动，r4 掷护甲，r5 结算。3 次命中，护甲救下 2 次，实伤 1，行动权交还第二席，冷恢复一致。水晶塔的原始进场回执另行核对，普通入场与已在场单位都被排除。[实签五步](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/photon-reserve-on-human-map-299/result.public.json) · [进场正反对照](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/photon-reserve-on-human-map-299/entry-kinds.public.json)

规划转建房现在传递版本、冻结来源、两席军表和地图。Skirmish 产品 Host 接受自定义军表，重复启动返回同房，两个席位在同一规则上读取 1,031 项地形、3 个任务点。Standard 的独立规划棋盘读取 1,804 项地形、5 个点。W3-13/14 负责策略包和模型产出。[规划交接](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/plan-host-boundary/result.public.json) · [第二席冷启动](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/plan-host-boundary/second-seat.public.json)
