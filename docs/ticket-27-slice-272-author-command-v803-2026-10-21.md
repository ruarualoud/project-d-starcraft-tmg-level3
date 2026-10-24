# T27 / S272 v803：分块作者修改操作

## 起点与目标

v802 真实调用在 e6049 / w576 / r3 逐值复读原调查。已确认有类型作者职责进入请求，但该修复不足以促成实际决策。当前 1490/2000，最终 Plan 0/6；不把输入修复或单测当产品生成成功。

本次属于新 P2/P4/P5：将这个作者停点改成可执行、可恢复的局部操作接口，不重开旧实验。

## 输入、操作与合并

1. 当前作者职责、完整当前军表/Plan、真实 Builder 权威与可读证据继续交付。
2. 模型只返回 `read` / `catalogue` / `decide`。读取时不夹带修改；决定时不夹带读取。
3. `decide.decision` 明确下一操作、公开理由、备选、来源、修改参数和战略变化；`questionUpdates` 按原问题编号更新分类/理由/来源，`newQuestions` 显式新增。
4. 未修改的问题逐值保留，不能删掉未知。Host 只合并模型明确提交的字段，不选候选、不修正事实、不批准策略。
5. 被拒的完整旧回复留在不可变原件和 Host 投影状态中，不再作为当前纠错的完整答案模板发出。旧完整上下文仍通过同一读取入口可查。
6. 合并后的决定继续通过原语义、已读来源、重复调查、Builder、Plan 联动和最终审核；没有新放行捷径。

原一次性冷恢复机制只向旧完整回复协议追加一次；带新命令协议的请求不能再次领此恢复。旧账、错误、计数、模型原文均保留。

## 已完成的具体 bug 门禁

脚本 `scripts/verify-slice272-author-command-v803.mjs` 使用真实请求42e7180a与回复39c7a24c。

- RED：旧协议没有分块 `decide` 操作，准确复现。
- 首次修后执行因新增 action Schema 缺少项目要求的 minLength/maxLength 而在合同注册时失败；已改为复用原 action 基础 Schema。这是本轮新增的工程错误，不算模型失败。
- 修正后单次对应门通过：8,927 ms。
- 验证逐题修改/追加、未动问题保留、真实修改参数投影、读写互斥、重复问题拒绝、Host投影状态不进入Provider输入。
- 通过共享 workflow/executor 回放同样错误决定，原重复调查门仍拒绝，正式草案不变。
- 0真实Provider、0 Native、0生产状态写入。此前通过的门禁均未重跑。

日志：`build/slice272-v803-red-20261021.log`、`build/slice272-v803-green-20261021.log`（新增Schema失败）、`build/slice272-v803-green-schema-20261021.log`（通过）。

## 真实运行

PID32021 从原 `build/slice272-product-generation-v645-lqMWaS` e6049 续行，日志 `build/slice272-v803-author-command-live-20261021.log`。真实选择、实际Builder提交、受影响审核仍待观察，不能提前宣布军表/Plan收敛。

T27 5/6、T23 33/36，余 S272/S248/S249/S250 共4片；最终 Plan0/6、对局0/12。

### 真实结果：作者已提交联合修改，尚未落库

请求 `ed909a6c062e2d8657554f5fdc37ca1bbefa17c7b5e8df367cb6896982c96684`，回复 `1d5fc120b23f17596681b43a3756d2a7e92b669d40a7a49221f6650af4811dfe`。

模型实际选择 `decide` / `revise`，不再逐值复读旧调查：选择证据472的已有2000分候选，同步修改Plan摘要和预算意图，保留其它条件计划；公开说明保留Goliath和局部比较的范围，未来对手行为仍列条件。Host没有替它填写选择。

用量162,689输入＋2,304输出＝164,993 units；Provider14.432秒。该次显式修改已到达原候选解析器，但因只读候选预算摘要、没有读完整配置，被 `ROSTER_WORKFLOW_BRANCH_CANDIDATE_NOT_DELIVERED` 拦下。e6056 / r3，PID32021退出；未采用候选，不记正式2000或策略胜出。

这一结果支持“显式分块修改接口能让该样本走出整答复读”，不证明所有情况稳定。后续 v804 只修补读恢复接线，保留本次已付费原件并要求读后确认；不会重买同一个选择或自动落库。

## 改动范围与证据边界

- `roster-workflow-author-command-v1.mjs`：显式作者操作与无策略推断的合并器。
- `roster-workflow-semantic-repair-v1.mjs`：接入新命令，兼容原修复节点，统一原输出合同读取。
- `roster-workflow-read-role-v1.mjs` / `roster-workflow-author-handoff-v1.mjs`：仍按原合同验证投影结果、一次旧协议恢复。
- `roster-decision-role-instructions-v1.mjs`：独立作者操作职责。
- `roster-decision-product-journey-v1.mjs`：产品同链路恢复原因。
- 具体 bug 脚本与进度记录。

Harness技能用于保持真实调用/操作/来源可观察；离线Teach技能要求解释/提案与正式策略验收分开。本轮无UI操作、记忆晋级、Skill修改或训练候选晋级。若模型仍复读、遗漏必要问题或改表未实际执行，本次真实验收即不通过；不以测试替代。
