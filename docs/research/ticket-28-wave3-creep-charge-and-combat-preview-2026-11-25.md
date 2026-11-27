# Wave3 菌毯上的冲锋与战桌预览

Ticket28 / W3-09 M08、W3-11、W3-15。冻结数据为 U83/C84/R50 + FAQ 1.3。

## 正式房间与查询

来源是普通部署验收留下的真实 r2：Queen 刚完成激活，Hatchery 菌毯在 (18.126, 2.425) 英寸。隔离场景把预备队 Nova 摆到 (20, 2.425)，其余棋位与原 r2 相同。两个席位各自 Pass，先手席选择人族先行动。Nova 在公开菜单声明冲锋 Queen，权威骰子得到 5。下面的试验针对掷骰后的同一次移动。

2.61 的领队落点 (18.363, 2.425) 接触 Queen 的底盘，也与菌毯重叠。省略菌毯落点时，预览明确要求指定落点并保持 r5。随后同一动作域调用共享查询却返回 unknown。纯菌毯军表构造了普通移动查询；带 Gestate、Deep Tunnel 或 Bombard 的另一分支已经注册了原生多动作查询。修订版将纯菌毯军表接入同一个构造分支。旧版本仍由原 Manifest 选择原构造分支。

[原始声明](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/r3-charge.json) · [原骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/r4-roll_declared_charge.json) · [遗漏落点被拒](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/missing-choice.json) · [查询的原始反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/query.json)

## 玩家表单与棋盘确认

| 验证场景 | 修前 | 修后 |
|---|---|---|
| Ravager 成功冲锋 | 只投影了输入终点，没有可绘制的路径或模型落位 | 显示完整 2.440 英寸路径及一枚底盘。 |
| 四个 Watcher 收拢队形 | 看不到任何模型的新位置 | 显示领队路径及四个模型各自的落位。 |
| Stalker 的 Blink | 看不到模型的新位置，参数表也丢弃了阴影标记的落点 | 只显示瞬移落位。玩家能从房间标记中选择阴影并指定其位置。 |

显示层与规则层共用已有的位移几何读取。失败冲锋不从输入草稿绘制行进线。冲锋表单按掷骰后公开动作域显示成功所需的路径与队形，或者失败所需的规则依据；切换至失败时剔除成功分支的旧参数。标记取自当前席位的棋盘投影，合法性仍由权威预览验证。

实际运行共享战桌组件，4 项图形检查、3 项参数检查通过。另用真实 Blink 参数走完一次人类点击、选标记、填坐标和提交。首次点击夹具按界面顺序选到了模型坐标，已改为明确选择标记自己的输入框，定点补验通过。这些结果覆盖 Web/App 共用组件，独立设备和整局验收仍待。

[修前棋盘投影](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/preview-before.json) · [修前表单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/form-before.json) · [棋盘测试](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/combat-preview-ui.json) · [参数测试](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/combat-input-ui.json) · [Blink 点击复验](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/blink-marker-ui-r2.json)

此项均为工程房间与既有签名样本，未调用模型。

## 版本隔离与恢复

已按旧 Manifest 重建 2.61.0，完整运行时描述与原件逐字段一致，原房仍在 r5，保留原骰 5。修订房使用原 r5 的签名棋位和同一份 Malignant Creep 双席军表。首次重建误读相邻虫洞验收的 Kerrigan 配方；来源哈希检查发现多出 Overlord 卡并拒绝建房，随后已改为读取原部署脚本所用配方，并增加双方军表身份核对。

[旧版绑定和原骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v261/retained-binding.json) · [旧配方错误的保留记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v262/stop-1795554870494.json)

2.62 的共享查询在原骰为 5 的棋位返回精确可行落点。Nova 从 (20, 2.425) 到 (18.363, 2.425)，与 Queen 接触。标记移到 (19.702, 2.425) 后，房间按敌方冲锋的规则将它移除。来自同一提交的事件依次是冲锋成功、标记位移、菌毯移除。后继只开放人族结束激活。修订房 r0 → r1 的签名冷回放与保存状态一致。

[同一棋位和原骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v262/source.json) · [查询落点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v262/choice.json) · [签名、后继及冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v262/result.json)

## 人工确认框

冲锋成功或失败及掷出的数值来自正式预览事件。收拢队形成功时，面板提示原近战攻击待结算；直接放置会显示实际技能名称。使用本次 Nova 的正式事件、原 Watcher 收拢和 Stalker Blink 的已签名样本挂载共享战桌，三个中文显示检查通过。

[三项界面结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v262/combat-confirmation-ui.json)

读取已压缩的旧样本时，原验收辅助器会创建空 SQLite。两份空库已核对无房间并隔离，原压缩件保留。来源读取现可用 SQLite 只读方式打开；实际验证压缩数据缺少未压缩文件时保持原状，同一接口仍可读取有签名的旧 r5。 [只读结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-charge-v262/read-only-source.json)
