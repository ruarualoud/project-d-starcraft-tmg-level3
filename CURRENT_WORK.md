# StarCraft 当前工作

## Active phase

当前执行 T28-W4-02。
Ticket 23 / Slice 249；整体 33/36；剩余 248、249、250。
状态日期：2026-11-27T18:56:20.326Z。本页由 coordination/current-development.json 生成，不追加历史。

Wave4人人对战长任务进行中。156条逐ID差分完成；新增原子累计5/18。Universal Carrier与三张Virus菌毯新增组合接线通过原生8分支43动作、1完整回合和Web4房8动作。继续新单位／势力，再完成整版发布、建军、房间、媒体与500／2000分Web；39来源隔离，炮塔80mm仅工程估算。

运行限制：本分支仅推进Wave4人人对战，按Wave3模式补齐数据、规则、建军、房间、媒体和Web双席；使用5484及build/wave4-web，按可验证成果提交推送。其他同步开发线不在本分支展开；付费模型、K3、AI对局、复盘与生产发布继续暂停。

| 工作 | 实现 | 产品交接 | 真实产出 | 策略效果 |
|---|---|---|---|---|
| Wave4人人更新：5/18原子；Virus HEAL／菌毯后继已验 | 部分完成 | 部分完成 | 不适用 | 不适用 |
| Wave4 W4-01 候选与旧版兼容 | 已实现 | 已通过 | 已产出 | 不适用 |
| 开发环境六项改进 | 已实现 | 已通过 | 不适用 | 不适用 |
| WikiSkill | 已实现 | 部分完成 | 已产出 | 未能证明 |
| SkillOpt | 已实现 | 已通过 | 部分完成 | 未测效果 |
| Memento / 轨迹价值v1 | 已实现 | 已通过 | 已产出 | 未测效果 |
| VISTA | 已实现 | 已通过 | 暂停/阻塞 | 未测效果 |
| Wave3增量更新9/16，四组组件55+44+40+23均有工程证据 | 部分完成 | 部分完成 | 未执行 | 未测效果 |
| T27/S272 军表与 Plan／Teach，P0–P6 验收 3/7 | 部分完成 | 部分完成 | 部分完成 | 未测效果 |

下一步：
1. W4-02：接Stukov／Infested Marine／Infested Trooper的完整规则与实际消费者。
2. 按逐ID账补其余13个候选合同（含3个仅撤回Archon来源合同）及其他新增单位／势力；39条来源隔离。
3. 按Wave3模式完成W4-03整版发布选择、Builder／大厅、玩家查询与媒体，再验W4-04的500／2000分Web双席。

## Navigation

- 查看Virus HEAL、菌毯与原生回合／Web后继：[Virus完整后继接线](docs/development/wave4/virus-successors-wiring.zh-CN.md)
- 继续Wave4人人对战长任务的下一验收出口：[Wave4更新总清单](coordination/wave4/implementation-plan.json)
- 查看Virus新增2原子、实际消费者和原生／Web范围：[Virus限制接线](docs/development/wave4/virus-restrictions-wiring.zh-CN.md)
- 查看Firefly来源适配、两种反应完整后继及原生回合／Web边界：[炮塔完整后继与局部验收](docs/development/wave4/turret-combat-wiring.zh-CN.md)
- 查看Hostile新增原子、炮塔截图估算与原生准入边界：[Hostile与炮塔条件几何接线](docs/development/wave4/hostile-incubation-wiring.zh-CN.md)
- 查看新增2原子、进口单位BM支付与源阻断边界：[Stukov建军与运行时接线](docs/development/wave4/stukov-army-wiring.zh-CN.md)
- 查看11条旧卡局部接线；区分整版新数据未完成项：[原生时点与Web局部验收](docs/development/wave4/native-timing-wiring.zh-CN.md)
- 查看三条Creep主体、消费者与新增记录排除范围：[Creep同源建军验收](docs/development/wave4/creep-builder-wiring.zh-CN.md)
- 查看Wave4逐ID能力、原子需求与接线边界：[W4-02能力差分与首批组件](docs/development/wave4/ability-diff.zh-CN.md)
- 继续首条未通过的Wave4能力接线：[W4接线进度](coordination/wave4/ability-wiring-progress.json)
- Wave4 本分支验收与接续：[候选发布与兼容结果](docs/development/wave4/candidate-acceptance.zh-CN.md)
- Wave4 范围、顺序与暂停边界：[Wave4 人人对战交接](docs/development/wave4/human-playtest-and-agent-handoff.zh-CN.md)
- 查询旧版与 Wave3 建房、战桌拦截的原因、适用范围和证据：[正式对战事实清单](docs/development/wave3/match-facts.zh-CN.md)
- 查看 Wave3 前后长任务、顺序和恢复条件：[Project D 长任务路线图](docs/development/wave3/project-continuation-roadmap-2026-11-22.zh-CN.md)
- 版本更新全部子项与后续汇报编号：[Ticket28完整工作清单](docs/development/wave3/work-breakdown-2026-11-15.zh-CN.md)
- 由sol逐项开发Wave3：[Wave3详细开发与接线手册](docs/development/wave3/README.md)
- Wave3更新范围、开发量与验收：[Ticket28增量方案v2](docs/ticket-28-wave3-incremental-update-plan-v2-2026-11-12.md)
- 日常读取：[有限当前上下文](scripts/inspect-development-context.mjs)
- 查看进度各层证据：[唯一当前状态源](coordination/current-development.json)
- 本轮环境工具与续验用法：[开发工作台](docs/development/workbench.md)
- 查看本轮改动与验证：[环境改进交付记录](docs/development/retro-20261112.md)
- 实验范围与比较条件：[学习评价范围登记](coordination/learning-evaluation-scopes.json)
- 复盘业务后续：[原方法开发计划](docs/research/ticket-23-slice-249-faithful-method-development-plan-2026-11-10.md)
- 确实需要历史停点：[归档入口](docs/history/development-context-20261112/README.md)
- 新增角色或恢复路径：[工程先行](docs/ticket-27-slice-272-engineering-first-role-dataflow-v1-2026-10-29.md)
- 声明产品完成：[消费端与验收标准](docs/ticket-27-slice-272-implementation-standard-2026-11-04.md)
- T27 当前证据：[r3 共用准备恢复及实际后继菜单](docs/ticket-27-slice-272-p3-p4-r3-native-preparation-recovery-2026-11-22.md)
- 四组当前 P6 产品入口：[首轮待发 Prompt 与开局校验](docs/ticket-27-slice-272-p6-current-product-egress-2026-11-22.md)

状态、证据范围与未覆盖消费者见 JSON 的各分项；文档状态不代表进程仍在运行。
