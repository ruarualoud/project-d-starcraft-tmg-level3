# P3／P5：来源绑定的查询与原生候选执行实证

本记录是新 P0–P6 流程的局部可用性证明，不是最终军表／Plan 验收报告。所属 T27／S272；仍为 Plan r2、合法 2000 矿／120 气／9 单位／29 模型，最终 Plan 0/6、对局 0/12。

## 问题与改动

真实地图调查先手填 Marine 2 的位置，分别撞到 Marine 1、向场外进场。模型随后主动选择正确的 `space.solve_formation`，但将动作域 ID 绑定到整段 `argumentsJson`，把锚点／意图对象覆盖成一个字符串，Native 返回 `SCENE_QUERY_ARGUMENTS_JSON_INVALID`。

这不是求解器算错。旧 Interface 要求模型同时维护外层 JSON、嵌套 JSON 字符串、来源编号、父状态、席位和动作域，且容易把静态摆放与原生行动候选混为一谈。现在仍调用同一个 Native 实现，没有新规则或第二套求解器：

- `spatial` 接受结构化 `queryArguments`，不要求模型手工拼嵌套字符串。
- 当前动作域可通过已读 inspect 的 `selection` 唯一选择；Host 从同一原件绑定父状态、席位、domainId，再序列化一次。模型指定的锚点和队形意图不变。
- `native_action` 的 `kind: "formation"` 显式选择已读 Native 候选，原样传入其 `canonicalParameters`。不会先静态放上棋子再重复部署。
- 静态队形、歧义匹配、未观察未来菜单不能冒充原生行动候选。Native 校验仍是最终权威。
- 静态选择的编号 0 在编译阶段拒绝；同批前序求解器使用 `fromStepId`，已保存结果使用真实正整数编号。纠错输入附该批真实前序结果，不从全局“最新结果”猜来源。

## 实际发生的步骤

运行目录为 `build/slice272-projection-owner-v565-inlKbk`，同一 Run 持续恢复，没有重置费用、计数或改写旧模型回复。

1. **旧失败**：`...deploy-marine2:input-repair:order0:deploy-marine2:input-repair:order0:deploy-marine2:input-repair:order0:solve-formation` 的 `inputBindings` 保存原 JSON 对象和被覆盖后的 domainId 字符串，错误原件保留。
2. **实际 356–357**：模型读取真实 inspect，改用结构化查询。所选单位仍为 `u_marine_2`，锚点仍为 `(27000,34000)` milli-inches，`advance`／`compact` 权重各 3，最多返回 6 项；不是 Host 代选策略。
3. **真实 Native 求解**：返回 6 个完整合法候选，每个携带 Rules 实例化后的规范参数。父态为 `ec2e9b9ca953cbf4921233189187d165d3f7f9b57e21e6623d71abe771b792eb`。求解工作名以 `solve-formation-typed` 结尾，完整回执在 workflow 的原件库。
4. **实际 362–364 的方法错误**：模型把原生候选交给 `formation_scene`；静态工具正确拒绝它。没有把这个拒绝伪造成进场成功。
5. **实际 365–366**：模型读取来源，明确纠正为单次 `native_action`，选的是第二项（零基序号 1），不是 Host 默认第一项。所选 ID 为 `58857086d7e3fd45fd92c1b7678f162a7b620c71e11e3ed21e40cae38cdec38f`，锚点 `(24000,34000)`。
6. **Native 接受与后态检查**：真实原生进场成功，后继 `95b22a8ce300c8e904a9e70163c5ebde2ef573341faa398dac9aea521921ad13`；Marine 2 为 `onTable=true`／`deploymentStatus=deployed`，保留 6 模型、Current Supply 1。部署池由 capacity/committed/available **6/3/3 → 6/4/2**，对手仍 6/0/6。实际送入 Native 的参数和 Native 返回的规范参数均与模型所选候选完整相等。
7. **回交**：后态及事实汇总交回原地图问题负责人，随后进入真实 marker-control／剩余路线查询；并没有因此批准整张 Plan。

原生动作完整结果：`workspace/decision-workflows/projection-owner/artifacts/b43de070d5fc3361d2a142a5114fc3ed36324a41d95aeded67bf7181236e9e6e.json`。后态 inspect：`artifacts/c7fbaa07855f276c6cbeb1c2941ba5a0e8e1c4e9418533ecba2f67fee96cbee8.json`。均相对上述运行目录。

## 可以打开的 prompt 与回复

- [357 完整请求](../build/slice272-projection-owner-v565-inlKbk/357.request.json)／[回复](../build/slice272-projection-owner-v565-inlKbk/357.reply.json)：结构化查询与模型选择的实验意图。
- [366 完整请求](../build/slice272-projection-owner-v565-inlKbk/366.request.json)／[回复](../build/slice272-projection-owner-v565-inlKbk/366.reply.json)：选择第二候选、纠正方法、请求原生后态。
- [370 回复](../build/slice272-projection-owner-v565-inlKbk/370.reply.json)：后态事实解释。回复仍是模型解释，原生原件才证明操作和状态。

请求记录含实际 Provider 指令及脱敏完整输入；只记录公开理由，不含隐含思维链或 API Key。

## 验证范围与尚欠

- v585：实际嵌套 JSON 停点复现红→绿一次；同源父状态／席位／动作域、原始意图无损、未知未来菜单不执行。隔离 Adapter 验证，随后由实际 357 和 Native 六候选证明真实调用。
- v586：实际六候选复现红→绿一次；规范参数原样交接、静态及歧义来源拒绝、未来菜单不提前执行。隔离执行器不是 Rules 验证；真实 366 与上述原生回执另外证明执行成功。
- v587：组件调查的三个零号来源复现红→绿一次，错误在 Native 前拒绝。实际组件受控恢复尚在运行，不能提前称通过。

本轮有工程修复与受控恢复，不能称“全程无人干预稳定生产”。本记录只证明明确父态和假设下的条件原生进场；不证明真实完整对局历史、全军最早到达、全部控制点、全局最优或策略胜率。最终新鲜生产／受影响 Teach 复审／Web 同链路仍属于 P5／P6 待完成项。

## Harness 记录

- `harnessLoopUsed: true`；`targetGames: [starcraft_tmg]`。
- `promptPackRoutes`：`roster_workflow_experiment_planner`、`roster_workflow_fact_summary`，之后独立来源审核仍需完成。
- `harnessToolsCalled`：inspect、来源绑定 spatial、native_action、后态 inspect；同一冻结 Rules／Builder／地图源。
- `agentDecisionEvidence`：357 与 366；模型选意图和候选，Host 仅做来源绑定。
- `memoryTraceEvidence`：同 Run 的 workflow、reads、events、不可变 requests/replies/artifacts。
- `uiTraceEvidence`：新流程 Web 尚未接通，不能拿本次 CLI 实证代替网页验收。
- `trainingTraceCandidates: []`；`trainingTruth: false`；不推广 Skill 或规则。
- `rollbackOrDemotionRules`：若父态／席位／候选参数错配，或静态结果被当原生行动，立即停止该来源交接；保留原件，定点修复，不靠清空未解项放行。
- `userVisibleChecks`：本地实验已证；最终中文可视报告和真实 Web 启动仍待 P6。
