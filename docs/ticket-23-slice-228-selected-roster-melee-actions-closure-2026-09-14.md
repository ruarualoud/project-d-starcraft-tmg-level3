# Ticket 23 / Slice 228 — 500 分所选阵容冲锋与近战收口

日期：2026-09-14

## 交付结果

500 分 Skirmish 房间现在具有所选五个 Unit 的参数化 Charge、IMPACT 和 Fight Runtime：

- 五个 Unit 各有一条 Charge 与一条 Fight 路由；Kerrigan、Kerrigan Swarm Raptor 另有
  Devastating Charge IMPACT 路由，共 `5 + 5 + 2 = 12` 条，selected unsupported 为零；
- Charge 分成声明、D6 揭示和成功/失败结算三个权威阶段。声明时固定 leading model，并为
  每个目标 Unit 指定一个目标模型；成功路径检查完整底座扫掠、地形、高低差、编队、所有
  已声明目标接战、禁止未声明接战和尽可能靠近；失败需要距离不足或目标分散的确定性证明；
- 冲锋与 Close Ranks 复用 Slice 226 的位置权威，但允许合法敌方接战；最终位置仍单独检查
  任何模型底座重叠，不能借接战穿模；
- Kerrigan 与 Raptor 冲锋成功后必须先结算 `IMPACT 4 @ 4+` / `IMPACT 2 @ 5+`，随后才交替
  激活；Impact 骰池可在多个已声明目标间精确分配；
- Fight 可拒绝或执行最多 3 英寸 Close Ranks；已底座接触的模型不得移动，leading model
  必须更靠近敌人，原有接战必须保留且不能新增未接战敌方 Unit；
- 攻击池完整计算 Fighting Rank（距敌方底座 1 英寸内）与 Supporting Rank（与 Fighting
  model 底座接触），按模型数乘 printed RoA，并在掷 Hit 前分配到各目标；
- Kerrigan `Critical Hit 2` 只把已有命中骰移过 Armour，不生成额外命中；Raptor 的 Surge
  D6 只绑定一个目标骰池，`INSTANT` 从声明到结算禁止敌方 Reaction；
- Hit、Surge、Armour、Damage、多模型伤亡选择、damage marker、Current Models、Current
  Supply、销毁、激活交替、Supply Loss Ledger 与动作日志均由同一 Apply 原子更新；
- LegalSpace domain、Instantiate、Preview、只读 chance/casualty query 与 Apply 共用规范化
  计划，Agent 与 Web 不复制近战规则。

Room Factory 升级为 `1.3.0`，接入 Attack Profile Catalogue V2 与 melee descriptor，并在
Factory 自检中强制验证 descriptor 和 composition evidence 的 hash 绑定。完整动作延迟清单
由 `[228,229,230]` 收窄为 `[229,230]`。

## 聚焦门

只执行了一次受本片影响的聚焦门，直接使用冻结官方 source-lock 构造 500 分房间：

```text
status                         passed
factory version                1.3.0
selected melee routes          12
Charge / Fight / IMPACT        5 / 5 / 2
unsupported selected routes    0
Kerrigan Charge + IMPACT       passed
Marine Close Ranks             3 fighting + 3 supporting
Kerrigan Critical Hit          6 hits / 2 existing dice bypassed
Raptor Surge + INSTANT         D6 bypass / enemy reaction false
Supply credited in Fight       1
source refresh                 false
Provider calls/tokens/cost      0 / 0 / ¥0
```

没有运行其他 Slice 或历史全量门禁；已通过门不重复执行。

## 精确边界

本片只声称当前冻结 500 分阵容、认证棋盘和未激活卡面修正时的 Charge/IMPACT/Fight 闭包。
Marine Stimpack/Combat Shield、Kerrigan/Raptor Leap/Adrenal Overload、阵营资源、Creep 与
Token/Marker 生命周期由 Slice 229 接入；任意 roster 和产品正式可用仍不在本片冒充完成。

