# Ticket 23 / Slice 227 — 500 分所选阵容远程战斗收口

日期：2026-09-14

## 交付结果

500 分 Skirmish 房间现在具有所选阵容的参数化远程攻击 Runtime：

- 三个 Marine Unit 的 `C-14 rifle` 与 Kerrigan 的 `Energy Blast` 共四条远程路由；
  Kerrigan Swarm Raptor 没有 Assault 远程武器，被明确记录为合法无动作，所选远程路由
  `unsupported=0`；
- 付费但未购买的 `Rocket Launcher` 不会因其 `linkedTo: "-"` 被误当成默认武器，
  `Combat Shield` 也不会被误送入武器替换合同；
- 对攻击方与目标 Unit 的完整模型对逐一计算圆底边缘距离、射程、认证矩形地形 LoS、
  Grass Size 2 cover、高地 effective Size、dead zone 与 high-ground Evade；
- 未接战攻击者不能射击已接战 Unit，已接战攻击者只能射击与自己接战的 Unit；Bulky
  仍在随机数分配前阻断；
- 同武器 Unit 批次按符合射程/可见性的模型数乘以 printed RoA 构造攻击池，并依序结算
  Hit、Surge、Armour、Evade、Damage；公开 Evade 原因区分接战、高地或两者；
- 多模型伤亡使用完整可见模型上限、接战优先级和保留特定接战关系的选择域；Apply 更新
  模型、伤害标记、Current Models、Current Supply、Unit 销毁状态和激活交替；
- Ranged Attack 现在进入 round-scoped Supply Loss Ledger，可被任务计分使用；骰子、攻击
  池、伤亡域、选择、补给变化和权威 hash 均进入动作日志；
- LegalSpace parameter domain、实例化、Preview、chance/casualty query 与 Apply 共用同一
  条规范化计划，不由 Web 或 Agent 复制规则。

Room Factory 升级到 `1.2.0`，装入官方 Attack Profile Catalogue、terrain elevation
agreement、Supply Loss Ledger 和 ranged Runtime descriptor；完整动作延迟清单由
`[227,228,229,230]` 收窄为 `[228,229,230]`。交战图同时接受认证数据使用的规范化
矩形 footprint 与 `accessPointId/connects` 形式，但 Ground/High 仍不会因此直接接战。

## 精确边界

本片只声称冻结 500 分阵容中的四条实际远程路由与当前认证棋盘。五个 Unit 当前均为
Shield 0，实际选中远程 profile 也没有混合距离敏感效果；任意 roster、未来装备组合和
Slice 229 产生的卡面状态修正不在本片冒充为已完成。Raptor 没有远程武器不是缺口。
产品 `productionRoomEligible` 仍为 false，须等 Slice 228–230 补齐近战、卡面能力和总组合。

## 聚焦门

第一次门禁发现产品 Adapter 仍把 Marine 未购买的 Rocket Launcher 计入 active loadout；
修正为“免费默认武器或已购买武器”后，主链通过。高地分支初始夹具漏填 spatial Apply
本会写入的梯子邻接字段，因此在交战图自检处被正确拒绝；补齐夹具事实后该分支通过，
没有为绕过门禁放宽模型几何。

最终聚焦结果：

```text
status                         passed
selected ranged routes         4
legitimate no-ranged Units      1 (Kerrigan Swarm Raptor)
unsupported ranged routes       0
eligible attackers / targets    6 / 6
resolved damage / casualties    12 / 6
Supply credited to attacker     1
high-ground Evade               passed
Grass cover Adapter             passed
source refresh                  false
Provider calls/tokens/cost      0 / 0 / ¥0
```

没有运行无关 Slice 或历史全量门禁。
