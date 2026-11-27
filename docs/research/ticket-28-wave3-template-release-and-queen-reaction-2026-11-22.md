# Ticket 28 / W3-10、11 · Siege Tank 模板与 Queen 反应

同一冻结来源的隔离候选把已核验的 Shock Cannon 模板尺寸纳入发布清单。含 Siege Tank 的合法 2000 矿军表经过现有 Standard 房间工厂，随后进入隔离结算棋位。Mode Transformation 和 Shock Cannon 在这份军表均成为可执行能力。继续使用原生模板覆盖、投骰、伤害池和防守方分伤规则，新增规则原子为零。

- 地形默认配置原来固定按 100 mm 通道，装入 150 mm 坦克后触发机动通道认证拒绝。现由工厂从所选军表的底盘规则读取最低宽度，实际四条通道均通过 5906 milli-inch 认证。旧布局样本保持原 3937 milli-inch。
- 完成模式切换、真实 Shock Cannon 声明并保存受伤反应停点。主目标为 Corpser，Queen 在溅射批次。
- 从同一序列化停点选择付费或放弃。Queen 在主批次支付 1 BM 减少 2 点伤害，放弃分支减免为 0。两条分支复用原骰子并继续模板溅射批次。挂起期间只显示当前反应或模板接续。
- 旧 Wave1 V6 描述符逐字段相同。验收军表能进入规则组件，完整房间准入继续受其余能力约束。

基准军表未选 Siege Tank，Standard 仍为 77/117、Skirmish 仍为 22/33。两个坦克定义记入这份专项军表的覆盖。直接 Hits 尚需接入 Wave3 当前房间组装。

- [含模板的新候选清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-template-release-bound-manifest.json)
- [模板结算回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-template-release-proof.public.json)
- [Standard 工厂与地形证书](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-template-release-factory-checkpoint.json)
- [Skirmish 及旧版兼容](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-template-release-compatibility.public.json)
