# Ticket 28 / W3-10、11 Wave3 Goliath

Target Lock 在冻结总规则 10.1 下需要可见目标。旧规则器只检查敌方距离。Wave3 绑定改用同一底盘见证的距离和 LoS；旧版分支保留原合同。Ares-Class、Indomitable 与 Target Lock 接入已有特性运行时。武器能力统计读取射击执行器实际支持的源档案；具体装备是否可用仍由规则菜单按实际军表、替换、目标及状态判定。

| 边界 | 实际结果 |
|---|---|
| Ares-Class | Autocannon 和 Underbelly Machine Gun 的权威攻击计划均为 Precision 1，Haywire 不继承。 |
| Target Lock | 从 Movement 菜单消耗 1 CP、标记可见目标；完整底盘被 Size 4 墙遮掉时无目标，同一目标清晰可见后恢复。实际进入 Assault，另一台友军 Goliath 的 Autocannon 只对标记目标取得 Light/Armoured、D3+1，并在可复现骰子下结算 4 点绕甲伤害。回读后伤害一致，Cleanup 清掉标记。 |
| Indomitable | 双方向直射合法性均靠规则明确开放；关闭后都不可选。Kerrigan 获得 Evade 骰，Goliath 的档案没有 Evade 值，反方向仍为零骰。此证据覆盖直射，不含模板武器。 |
| Hellfire | 全部 Goliath 都换装时隐藏 Hellfire。另用通过军表审计的备用装备组合，原生特殊单位工厂生成冻结 32 mm 的 Point Defense Drone 作为飞行目标，宣告于隔离 Assault 场景中；地面 Goliath 被菜单排除。Hellfire 的 6 枚射击骰、Anti-Evade 1、对 Light 的 D3 档案正确，实际提交并冷读通过。Raven 正式底盘仍缺十字臂宽，本次没有以任意外框假装其底盘。 |

本轮加入四条 Goliath 注册，通过定点行为验证。通用武器档案注册同时识别 Raynor 的 Commando Rifle；同一冻结名册显示零费 C-14 的替换关系，Raynor 原始档案能在哪些合法装备条件下显现仍待单独验证。Standard 能力注册 66/117（待51），Skirmish 17/33（待16）。这是注册统计。正式整局、模板波及和上述 Raynor 实战未准出。旧 V6 原生描述符与存档逐字段相同。零模型调用。

- [付费、LoS 和射击修正](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-goliath-targeting.public.json)
- [Autocannon 绕甲结算](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-goliath-autocannon-lock-consume.public.json)
- [双方向 Indomitable](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-goliath-indomitable.public.json)
- [原生 Hellfire 提交](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-goliath-hellfire.public.json)
- [登记和旧合同核对](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-goliath-admission.public.json)
- [Standard 余项](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-pending-abilities-after-goliath.public.json)
