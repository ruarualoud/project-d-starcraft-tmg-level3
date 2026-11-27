# 交给 sol 的开工指令

交接更新于2026-11-12，Ticket28实施1/16。01来源冻结已准出，下一项02。不要把交接文件存在当作用户已经授权启动模型或生产发布。

## 可直接复制到新会话

~~~text
继续Project D的Ticket28：把Wave1冻结数据增量升级到本次已观察的Wave3，保持人人/人机/机机使用同一产品规则与工具链路。

工作区：/Users/rualoud/Downloads/codex_project/project-d

先读根AGENTS.md及 starcraft-tmg-level3/CURRENT_WORK.md，按它路由到当前活动工作树；不要另建空仓库、切分支或恢复历史实验。优先使用已有有限上下文读取工具，不全文读取巨大的TASKS、PROJECT_MEMORY、旧workflow或整个build。

然后读活动工作树内：
1. docs/development/wave3/README.md
2. docs/development/wave3/01-release-and-data-contracts.md
3. coordination/wave3/implementation-plan.json
4. 当前子项所在分片文档；改工具再读02，验证再读06。

先读取 CURRENT_WORK 和 implementation-plan.json 的 deliveryGoal，按当前执行编号与已保存证据继续。长期顺序为 Wave3 → Wave4 → 复盘与 AI 对战 → 其余 Ticket。两版新增单位的图标、头像、语音和战桌 BGM 均按长期路线图验收。沿已有16项，不回到旧Teach问题修复。每项做原因→方案→影响面→旧版本无损证明；源码真实入口看code-entry-map.json，先核实仍存在。手册中明确标“拟新增”的模块不是已有能力。

最重要的接线要求：来源→稳定能力ID→原子/组合→runtime注册→合法菜单/反应/生命周期→Host实例化→权威preview/apply→后继→保存恢复→Query与UI；同一release事实供人工写表、AI从头写表、固定表Plan、Teach、实战与复盘使用。模型选语义与策略，工程填身份/状态绑定及确定性事实。

先工程单步，后真实调用。只验证这次变更影响的边界一次；保存后继检查点，不重复已通过门，不新写无关测试。具体Bug先复现；产品外层入口自动到后继才算通过，内部helper通过不算。遵守已有三轮收敛及定点补验授权，明确区分生产Bug、夹具Bug、网络、模型策略。

现有旧发布U71/C69/R48 + FAQv1.0保持原绑定。观察候选为U83/C84/R50 + FAQv1.3；已观察新增19单位记录、8战术卡、4势力、162效果定义、4任务记录、3部署卡。162不是新原子数量。核心PDF已确认与旧锁字节一致。FAQ逐问差分和新几何由04/06闭合。单位、卡、费用、槽位和资格以官方写表器API为主，PDF作为参考。冻结一次后开发期间不要自动追新版。

旧共享Rules实际位于主仓库scripts/starcraft-tmg-rules-v0.mjs；活动树相对import经符号链接指向它。按当前只读依赖边界处理，优先经options.rulesRuntime注入；不要直接覆盖旧共享数据。写表产品构造器目前直接加载旧fixture，需要统一release注入，不只更新UI卡表。

复盘与付费模型当前仍暂停等待充值；不恢复原研究、旧对局或定时提醒，不新增子代理/K3。先完成不依赖模型的工程。14和16真实调用边界等明确恢复指令；不把等待当成所有工作都停。安装、迁移、清理、提交和推送按当前授权，不因本交接新增权限。网络只做本任务获准的官方缺件取得，不能替换已经冻结的原件。

每项一张验收卡，按模板填实际证据；更新implementation-plan.json、当前状态和短TASKS。汇报Ticket/子项、具体工作与子边界、完成x/16、剩余编号、四层状态（实现/产品接线/真实产出/策略效果）。主Ticket23/Slice249当前33/36且复盘效果未证，不因写完方案提高完成率。

依赖项完成再继续下一项，不为普通可逆开发反复询问。遇到真正缺规则材料/授权或达到停止边界，准确列出缺口及独立可继续工作。严禁用fallback/mock规则、删失败、清计数、放宽事实校验来制造通过。
~~~

## 接收后应当能定位的材料

- 活动工作树：当前路由为 /Users/rualoud/Downloads/codex_project/project-d/starcraft-tmg-level3/.worktrees/ticket-27-slice-271-codex-integration；未来以CURRENT_WORK为准。
- 原冻结：content/official-development-tranche-s75-111-source-lock-v1.json；fixture在主StarCraft目录build/source-intake/official-rules/development-tranches/official-development-tranche-s75-111-v1。不要把活动树自己的build当作当然存在同一fixture。
- 本次观察：活动树build/ticket-28-wave3-assessment-20261112；counts.json、normalized-diff.json、原公共API文件、pdf-observations.json、FAQ与Protoss W3已存PDF。该目录是研究证据，不是已发布生产数据。
- 可追踪实施：coordination/wave3/implementation-plan.json；新增定义目录new-definition-inventory.json；真实入口code-entry-map.json。只有第一份登记子项状态，其余为静态索引/逐定义证据映射。
- 方案总评：docs/ticket-28-wave3-incremental-update-plan-v2-2026-11-12.md；原粗估27～44人日。不是对代理时长承诺，01/04后根据复用比例和FAQ差分收窄。

当前冻结候选在活动树 build/ticket-28-wave3-source-candidate-20261112-v1，source-index.json记录主数据来源，compiled/dataset.json供02读取，verification.json及persistence-verification.json为01通过证据。

## 需要特别纠正的历史惯性

不要在模型出错后反复让它填写hash、状态引用、完整原生回执；这些应Host编译。不要把审核者对策略的偏好当事实错误。不要用目录完整/候选产出/测试数代替产品能玩，也不要用一局胜利证明新版更强。

后续汇报按当前真实进度填写。以下保留01开始时的历史格式示例。

“Ticket28 / T28-W3-01：已核对本次原件，缺核心PDF与若干尺寸来源；正完成一次冻结及差分。实施0/16，01未准出。当前未调用模型，复盘仍暂停。下一步完成原件清单后接统一release。”

示例中的缺件需要当时重新读取实际清单，不照抄为现状。
