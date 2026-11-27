# Ticket 28 / W3-11 · 菌毯位移共享查询与签名提交

原 Match 2.21.0 的 Run 动作域已带菌毯位移参数，Native 已有位移查询。正式 Match 缺少查询出口，共享工具因此无法取得当前动作域的落点证明。2.22.0 对已绑定新版来源的房间提供此出口。Host 从当前席位 LegalSpace 绑定动作域，Native 负责原生路径和落点计算。回执保留原生证据哈希，并核对动作域、菌毯、移动单位、控制席位和棋位哈希。

验证使用冻结 U83/C84/R50 + FAQ 1.3 的 Standard Fire in the Sky。三场复用保存的来源棋位和原来已验证的路径，并从同一任务、同一部署的正式场景复用任务目录。实际角色是两个人工席位。共享工具用当前真实房间投影和 LegalSpace 取得落点证据，提交使用同一房间的公开入口。已保存生产前缀单独引用。

| 来源 | 签名动作与结果 | 冷回放 |
| --- | --- | --- |
| Queen | Queen Move。己方菌毯移动到 (28.726, 6.800) 英寸，保留在棋盘上。 | r1，1 签 |
| Hatchery | 先由来源方 Pass，Goliath Move。敌方菌毯先移动到 (20.026, 4.000) 英寸，再移除一次。 | r2，2 签 |
| Overlord | Goliath Run。敌方菌毯先移动到 (25.726, 2.800) 英寸，再移除一次，较远的 Hatchery 菌毯保留。 | r1，1 签 |

Overlord 另验证了缺选点时权威预览拒绝，以及过期修订返回未决；实际提交的幂等重送返回原回执。首次共享 Host 因回执少顶层动作域而拒绝，补齐后原 r0 得到精确回执。测试曾把未决回执当作传输失败，并只看最后一项状态日志。最终以签名回执核对位移与移除顺序，从已签 r1 冷恢复，保留原失败记录。

旧 2.18.0 使用原发布重建为同一个签名运行时哈希。2.22 的只读证明针对指定普通移动和指定菌毯，完整动作仍须预览。该版签名涵盖 Move 和 Run。2.61 已补普通桌边 Deploy 的查询、签名与冷回放，见文末。2.61 的 [Disengage 正式组合](ticket-28-wave3-creep-disengage-v261-2026-11-25.md)已通过；[2.62 原骰冲锋的完整产品验收](ticket-28-wave3-creep-charge-and-combat-preview-2026-11-25.md)已通过。收拢队形已完成原攻击；Kerrigan 特殊位移、支付、强制 Pass 与下一阶段先手已通过[同棋位正式验证](ticket-28-wave3-creep-close-ranks-and-leaping-strike-v262-2026-11-25.md)。Web/App 双席流程尚待。

本轮零模型调用。组件累计 149/162，Ticket 28 整体 2/16。

- [Queen 回执与冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-creep-displacement-v222-queen-signed-v1/result.public.json)
- [Hatchery 回执与冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-creep-displacement-v222-hatchery-signed-v1/result.public.json)
- [Overlord 回执与冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-creep-displacement-v222-overlord-signed-v1/result.public.json)
- [共享工具回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-creep-displacement-v222-overlord-signed-v1/shared-query.public.json) · [遗漏选点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-creep-displacement-v222-overlord-signed-v1/omitted-choice.public.json) · [过期修订](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-creep-displacement-v222-overlord-signed-v1/stale.public.json) · [旧版绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-creep-displacement-v222-overlord-signed-v1/legacy-bound-recovery.public.json)

## Web/App 人工移动编辑器（2026-11-25）

此前，正式房间已要求在移动终点与菌毯重叠的领队指定标记落点，人工编辑器却只发送移动路径和队形。已在公开动作域声明 `tokenDisplacements` 的情况下开放标记选择。界面按原标记的位置区分同名菌毯，提交席位看到的正式标记 ID 和玩家指定的千分之一英寸坐标。重选领队或更改路径、队形会清空旧落点。选择在场领队时保留行动面板。

对三个来源分别挂载共享战桌、选择领队并填写落点。三份提案的领队、路径、队形、标记和坐标都与上表的签名动作一致。确认面板只使用正式预览里返回的事件，在 Queen 场景显示位移，在两项 Goliath 场景按原回执顺序显示位移、移除。Queen 和 Hatchery 使用宽屏，Overlord 使用窄屏。首次检查发现确认面板缺少逐事件显示，修复后这三项均通过。

[三组公开输入和结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-human-editor-v1/editor-checkpoint.json) · [定点界面测试](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-human-editor-v1/preview-result.json) · [首次测试与停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-human-editor-v1/result.json)

另用原 2.22.0 Manifest 与正式运行时，在两个隔离内存 Room 从 r0 直接预览界面生成的参数。Queen Move 和 Goliath Run 的规范化参数、权威动作逐字段一致，事件哈希分别命中原签名；两间房预览后仍为 r0。Hatchery 使用已有 r1 → r2 签名核对，未重发此前的 Pass。验收覆盖 Web/App 共用组件及上述正式房间预览；尚未做两台真机从建房到重连的整体验收。核对脚本首次按仓库根目录读取房间局部 `runtime.json`，已按照原 Manifest 位置读取原文件并检查其哈希。
 
[Queen 正式预览](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-human-editor-v1/queen-room-preview.json) · [Overlord 正式预览](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-human-editor-v1/overlord-room-preview.json) · [隔离验证入口](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-human-editor-v1/check-room-preview.mjs) · [夹具路径诊断](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-human-editor-v1/room-preview-fixture-diagnostic.json)

[2.61 普通桌边进场的领队起点与菌毯位移记录](ticket-28-wave3-standard-creep-entry-v261-2026-11-25.md)
