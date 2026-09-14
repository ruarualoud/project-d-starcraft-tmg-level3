# Ticket 23 / Slice 226 — 500 分所选阵容空间动作收口

日期：2026-09-14

## 交付结果

500 分 Skirmish 房间的五个 Unit 现在共享一个参数化空间动作 Runtime：

- 三个 Marine Unit、Kerrigan 与 Kerrigan Swarm Raptor 均具有 Deploy、Move、Run、
  Disengage 四类路由，共 `5 × 4 = 20` 条，所选空间路由 `unsupported=0`；
- Speed 按当前存活模型数和官方 profile 读取，门禁观察到 Marine `4`、Kerrigan `7`、
  Raptor `5` 英寸；
- 每个模型使用官方 32/40mm 圆底，路径按 leading model 完整底座扫掠，最终编队检查
  完整底座边界、模型碰撞、敌我间距以及所有非 leader 底座处于 leader 的 3/4 英寸
  coherency 范围内；
- Deploy 绑定当前玩家 Entry Edge、进场方向与 Round Supply；移动、奔跑及脱离绑定
  phase、initiative、activation 与 engagement；
- 地形 Adapter 处理 Grass 移除、普通/不可通行地形、高地支撑面、access point 和当前
  Raptor Strain 路径例外；
- Disengage 在声明时计算 Commander 修正后的 Tactical Mass，并产生后续 Assault 限制；
- LegalSpace parameter domain、实例化、Preview、Apply 与只读 spatial query 共用同一条
  规范化路径，Web 或 Agent 不再自行推算另一套合法性。

Room Factory 升级到 `1.1.0`，把官方 terrain/LOS bundle、special-terrain agreement 和
空间 Runtime descriptor 一并装入 Authority state；剩余动作延迟清单从
`[226,227,228,229,230]` 收窄为 `[227,228,229,230]`。

## 精确边界

本片只声称当前冻结的 500 分五 Unit 与 CHAR PLAINS 认证地形上的成功空间路径精确，
不声称任意 roster。Disengage 的“确实不存在合法编队落点，因而移除其余模型”仍要求
Rules-owned 完整搜索证书接口；本片没有用启发式搜索冒充该证明。搜索和策略排序均不
属于 Rules Authority。

旧 Deploy/Move/Run/Disengage、底座与特殊地形规则核保持冻结；本片通过产品 Adapter
组合它们的规则事实，没有把 32mm Marine 旧执行器静默扩成任意单位。

## 聚焦门

收敛过程只处理本 Slice：第一轮发现新模块的嵌套条件语法错误；第二轮发现验证夹具把
编队排成超出 leader coherency 的长行；Runtime 随后显式公开该 coherency 约束，最终
聚焦门通过：

```text
status                         passed
selected units / routes        5 / 20
unsupported spatial routes     0
deployed models                Marine 6 / Kerrigan 1 / Raptor 6
current speed inches           Marine 4 / Kerrigan 7 / Raptor 5
high-ground access             passed
Disengage Tactical Mass        passed
full-base board boundary       passed
source refresh                 false
Provider calls/tokens/cost     0 / 0 / ¥0
```

没有运行无关 Slice 或历史全量门禁。

