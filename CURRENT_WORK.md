# StarCraft 当前工作

## Active phase

当前执行 T28-W4-02。
Ticket 23 / Slice 249；整体 33/36；剩余 248、249、250。
状态日期：2026-11-27T14:30:17.742Z。本页由 coordination/current-development.json 生成，不追加历史。

整版Wave4新数据尚未接完。156条差分完成；11条旧卡时点原生68主链回执、Web局部11/11；另3条Creep建军修订通过同源Builder/工厂审核/军表卡资源与5组冷导入。18个新游戏原子实现0，新单位/势力与完整Builder/大厅待接；39条来源阻断隔离，Wave3仍9/16。

运行限制：仅 codex/wave4-web-pvp；服务端口 5484、数据 build/wave4-web/host。本轮已授权离线工程验收及按成果提交推送。5483 Wave3 玩家房与主线保留；付费模型、K3、AI 对局、复盘与生产发布继续暂停。

| 工作 | 实现 | 产品交接 | 真实产出 | 策略效果 |
|---|---|---|---|---|
| Wave4 W4-02：旧卡14条修订局部接线；整版数据未完 | 部分完成 | 部分完成 | 不适用 | 不适用 |
| Wave4 W4-01 候选与旧版兼容 | 已实现 | 已通过 | 已产出 | 不适用 |
| 开发环境六项改进 | 已实现 | 已通过 | 不适用 | 不适用 |
| WikiSkill | 已实现 | 部分完成 | 已产出 | 未能证明 |
| SkillOpt | 已实现 | 已通过 | 部分完成 | 未测效果 |
| Memento / 轨迹价值v1 | 已实现 | 已通过 | 已产出 | 未测效果 |
| VISTA | 已实现 | 已通过 | 暂停/阻塞 | 未测效果 |
| Wave3增量更新9/16，四组组件55+44+40+23均有工程证据 | 部分完成 | 部分完成 | 未执行 | 未测效果 |
| T27/S272 军表与 Plan／Teach，P0–P6 验收 3/7 | 部分完成 | 部分完成 | 部分完成 | 未测效果 |

下一步：
1. W4-02：三条Creep建军消费者已验；下一批实现Stukov跨种族建军及运行时转换合同，按18个新合同依赖接新单位/势力。
2. 39条来源继续阻断：Archon撤下、原生感染机械CP语义及Alarak阶段拼写，不以旧单位定点验收代替准入。
3. 能力准入后推进W4-03完整发布选择、Builder/工厂/查询与媒体，再做W4-04双浏览器500/2000分新军表验收；付费模型、K3、AI、复盘、生产发布保持暂停。

## Navigation

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
