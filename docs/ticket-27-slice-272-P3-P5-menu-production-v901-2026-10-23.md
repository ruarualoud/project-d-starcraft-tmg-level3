# T27 / S272 — P3/P5 候选来源生产与读取状态 v901

## 实际停点，不是模型策略结论

A 的原工作 `…method:c44635edd3b4ec25:…order-repair0:order-repair0:order-repair0` 已到12次返回，反复读取 formation_scene 原件790，寻找其不存在的 formationOptions。当前尚无 Raptor 组合场景/火力比较成功证明。

根因有三个相连的工程缺口：

1. `formation_scene` 选择没有填写 Native action 的 selection.kind，恢复诊断丢失“静态队形候选”类型。
2. 所有缺失菜单都要求查找 inspect/actionSpace；但 inspect 不产生静态 formationOptions，后者由 `space.solve_static_formation` 产生。
3. 必读阶段不论候选是否存在都禁止 finish/workOrders，并覆盖已经结束的资料准备窗口，造成“必须读到尚未允许生成的东西”循环。

## 修复后的流转

```text
选择来源不含候选
  → 按选择类型确定 producer（静态求解 / 行动队形求解 / inspect）
  → 已定位正确结果：实际读取，或有依据交回负责人
  → 未定位结果：在有限窗口检索，或提交相应 producer 的准备查询
  → 准备单只查询，不应用候选、不测量、不声称原任务完成
  → 收到实际结果 → 模型读取 → 模型明确选择 → 原执行器校验/应用
```

持久化旧诊断根据原模型选择重新派生，不修改旧请求/回复。已结束的资料窗口不能因为菜单缺失无限重开。来源缺失不批准事实；模型仍决定查询参数与策略，Host 不选位置。

## 具体复现与验收

`scripts/debug-slice272-menu-production-stage-v901.mjs` 使用当前真实角色断点，在内存里注入模型回复：

- RED：`build/slice272-menu-production-stage-v901-red.json`，当前 schema 没有 finish，无法提出生成候选的准备查询。
- 修后一次 GREEN：`build/slice272-menu-production-stage-v901-green.json`。
- 冷恢复实际 prompt 明确 producer=`spatial/space.solve_static_formation`，不再要求 inspect 生成静态候选。
- 实际产品角色接受同原始意图的单步准备查询，未调用 Native，也不授予完成。
- 提前 formation_scene 应用仍拒绝；关闭窗口后重复 read 仍拒绝，原记录不变。

此门只证明调度/消息合同，不证明真实模型一定执行成功、几何存在解或策略更好。没有重跑已经通过的门。

## B 的独立传输恢复

原请求 `roster-teach-framework-d80c5939-5942-4f7a-8867-fb313ced0d85` 已收到 HTTP200，但48,039ms后正文仍0字节，ECONNRESET。未知费用保留；通过现有产品 recover-provider 入口仅重试原请求一次，没有重新初始化或改变 prompt。实际审核返回 `235a1785…`：旧 marauder-1 的数值有效，但不可冒称新的第二实例测量，要求修订。恢复成功不等于策略审核通过。

## 当前恢复点

A73915/B78723 均已exit0、事件5279/4895，0运行/0在途后，同目录同版启动：A86082/B86114，REPL `activeRuns1189`。日志分别为 `build/slice272-v901-menu-fixed-1792690864886.log`、`build/slice272-v901-menu-editable-1792690865610.log`。

A r3/B r5，正式Plan0/6、对局0/12；T27 5/6、T23 33/36、余4片。待真实模型跨过来源生产边界并完成受控比较与策略决策；不以本报告替代最终中文生成报告。
