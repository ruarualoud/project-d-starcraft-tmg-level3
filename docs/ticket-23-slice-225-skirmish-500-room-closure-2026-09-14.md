# Ticket 23 / Slice 225 — 500 分 Skirmish Room Factory 收口

日期：2026-09-14

## 交付结果

`official-skirmish-500-room-factory-v1` 现在从冻结的当前官方数据创建独立的
500 分 Skirmish 权威房间，而不是改写或伪装旧 2000 分 Standard 房间：

- Player 1：三队 Small Marine，其中一队购买 Combat Shield，精确 500 Minerals；
- Player 2：Kerrigan 与 Kerrigan Swarm Raptor，绑定必需的零费 Accelerating
  Creep，精确 500 Minerals；
- Hold Position (Skirmish)、CHAR PLAINS、36×36 英寸战场；
- 七件通过比例计数、四象限、中心地形、通行见证、Entry Edge 火力线与高地入口
  检查的平衡地形；
- 五个 Unit 实例、二十五个模型全部从场外 reserve 开始；
- Viewer V3 公共投影不含双方私有卡资源，玩家投影只含本席资源，任何投影都不含
  Authority roster registry。

新 `official-match-gameplay-data-bundle-v2` 直接绑定所选十任务 IR 中的当前任务与入局
单位 Combat Profile。语义版本是兼容权威，内容 Hash 仅用于身份和漂移诊断；它不会把
旧 Standard mission profile 冒充 Skirmish。

## 直接修复

本片暴露并修复两个实际组合缺口：

1. Mission/Deployment 双卡提交按集合比较，不再依赖枚举顺序；
2. 十任务 Runtime 的任务标记分母按 Engagement Scale 读取：Standard 为 1–5，
   Skirmish 为 1/2/5；Control receipt 使用同一实际分母。

CHAR PLAINS 的两条六英寸火力线最终固定为 `x=22` 与 `x=28`，两端均位于真实的
Player Entry Edge 段上，避开 Size 2+ 地形，并满足中心线至少六英寸的独立性要求。

## 聚焦门结果

唯一 Slice 225 门最终通过：

```text
status                         passed
authority receipt              9532d04109d9e974849c1e5d2095f70ecbbc15e97e64085ea924793813f5dda7
unit instances / models        5 / 25
mineral spent                  player1 500 / player2 500
vespene spent                  player1 0 / player2 0
battlefield                    36x36
terrain / clear fire lanes     7 / 2
mission markers                1,2,5
mission                        Hold Position (Skirmish)
deployment                     CHAR PLAINS
public private-resource sides  0
source refresh                 false
training truth                 false
```

没有调用 Provider，没有新增 API Token 或费用。完整动作 Runtime 仍明确留给
Slices 226–230，本片不会以合法初始房间冒充完整可玩对局。
