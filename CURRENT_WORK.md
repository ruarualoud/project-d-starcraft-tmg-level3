# StarCraft 当前工作

## Active phase

当前执行 T28-W3-15。
Ticket 23 / Slice 249；整体 33/36；剩余 248、249、250。
状态日期：2026-11-27T09:48:20Z。本页由 coordination/current-development.json 生成，不追加历史。

Wave3 9/16。2.99.12 标记为「待测试人人对战」。Web 已验证 500／2000 分建房和双席重连，45 个单位有独立识别图，25 种游戏动态通讯头像，三族 BGM 与选中反馈已验。

运行限制：长期顺序：Ticket28 Wave3 → 独立 Wave4 增量更新 → F7复盘与AI对战 → 其余Ticket。当前继续 Wave3；两版均需单位图标/头像/语音与战桌BGM验收。付费模型、旧实验及生产发布沿用暂停边界。

| 工作 | 实现 | 产品交接 | 真实产出 | 策略效果 |
|---|---|---|---|---|
| 开发环境六项改进 | 已实现 | 已通过 | 不适用 | 不适用 |
| WikiSkill | 已实现 | 部分完成 | 已产出 | 未能证明 |
| SkillOpt | 已实现 | 已通过 | 部分完成 | 未测效果 |
| Memento / 轨迹价值v1 | 已实现 | 已通过 | 已产出 | 未测效果 |
| VISTA | 已实现 | 已通过 | 暂停/阻塞 | 未测效果 |
| Wave3增量更新9/16，四组组件55+44+40+23均有工程证据 | 部分完成 | 部分完成 | 未执行 | 未测效果 |
| T27/S272 军表与 Plan／Teach，P0–P6 验收 3/7 | 部分完成 | 部分完成 | 部分完成 | 未测效果 |

下一步：
1. 玩家从 /match 验收 Web 人人对战。M25 等待原生测试机。
2. W3-03/02 优先把现有棋盘的真实工厂、规则和任务接入规划发布，保留策略包来源检查；随后用离线答复验两类 Journey。
3. W3-12 按消费者核对持续光环与召唤物的适用规则，再针对有差异的能力做席位查询和房间后继验证。
4. W3-14 已准备 17 份 Skill 的 70 个输入；真实生成、副官实答和人机／机机等待用户指定模型。M25 等设备，PostgreSQL 等实库。

## Navigation

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
