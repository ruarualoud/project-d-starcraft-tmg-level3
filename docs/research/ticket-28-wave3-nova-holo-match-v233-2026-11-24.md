# Wave3 · Nova 诱饵在正式 Match 中的回合末选择

Ticket28 / W3-08 / M01、M07。候选运行时 2.33.0。

## 为什么需要这次接线

独立组件已经能处理诱饵的 Surprise! 与 Timed Life。正式 Match 的回合末另有运输卡等机会，同一方可能有多个效果可选。增加军表注册还需要让主房间保留选择顺序，尤其是移除诱饵会使这枚诱饵的摆放机会消失。

## 正式工厂

| 标准军表 | 可执行定义 | 产品结果 |
|---|---:|---|
| 突击 Nova，2.32.0 对照 | 23/26 | 旧工厂拒绝建房，列出原三项缺口 |
| 突击 Nova，2.33.0 | 26/26 | 正式开局，出现首回合任务动作 |
| 潜行 Nova，2.33.0 | 25/27 | 工厂列出 Head Shot、Operational Efficiency 两项缺口 |
| 突击 Nova，双方各携一张运输卡 | 30/30 | 正式开局 |

新增接入的突击能力是 Holo Decoy、Devastating Charge 和 Phase Reactor Suit。两种形态共用已验证的诱饵摆放与来源校验。

## 验收场景

使用同一正式军表工厂产出的状态，预先声明双方各一队在场，以便首回合进入有关窗口。房间以自身公开菜单、预览和提交回执推进。三条对照从同一回合末状态分支，分别选择摆放、主动放弃和先移除。

## 证据

- [nova_assault_mode](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-holo-standard-v233/nova_assault_mode/admission.json)
- [nova_stealth_mode](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-holo-standard-v233/nova_stealth_mode/admission.json)
- [assets](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-holo-standard-v233/assets/admission.json)
- [legacy-v232](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-holo-standard-v233/legacy-v232/admission.json)


首回合 r16 清理阶段由先手席位接管；在原房继续到 r20，已完成占点、任务记分和胜负检查。r20 回合末同时存在双方运输机会和诱饵。2.33 房间权威菜单拒绝，查明执行器目录缺少 resolve_unit_timed_life。修订版 2.34 单独绑定回合末移除动作，保留 2.33 原签名。

2.34 用原房 r20 的状态通过正式 Room 菜单。两条有限动作是放弃运输、Timed Life；两个参数入口是 Surprise!、运输后续。旧 2.33 运行时描述符逐字段一致。证据见 [r20 菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-holo-standard-v233/catalogue-v234/menu/public-menu.json)。

## 回合末结果

以 r20 为共同起点。选择摆放时 Nova 的横坐标由 10 变为 13.018 英寸，随后诱饵移除。选择放弃时 Nova 保持在 10 英寸。先移除诱饵时，摆放失去场上来源，Nova 仍在原位。三房分别以 5、5、4 份原生回执精确重建最终权威状态。
