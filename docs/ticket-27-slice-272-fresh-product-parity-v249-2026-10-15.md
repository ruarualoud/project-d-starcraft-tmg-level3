# S272 v249：全新生成与端上同链路验收

## 用户最新决定

1. 流程修改较大，A/B均从头生成验证稳定性，不采用旧修补结果作为新鲜通过证明。
2. 后续 Web/App 启动对局必须使用同一产品链路，不能只把实验编排做通。

## 当前真实状态

- 旧A v248仅补完原Plan3来源审核，保持原PlanHash `9623101ce791638be8a099c949d66842f8ee29898a8c093b6bb1711a3062ceec`。新增3调用83607tokens，累计23调用2936088tokens。原10个已完成分片复用，缺失11–13完成。返回24High/157Medium/11Low是**未来源资格复核**的审核意见，不代表已证实缺陷，也没有通过。PID36149已终态，不续此旧方案。
- 旧B v248从原r29完成方法学习；首答把字符串字段写成嵌套对象，现有纠错自行修好，随后进入议题和调查，不需要改代码手写答案。用户要求全新生成后，发送暂停标记并等待当前调用/查询保存。09:40:42Z终态 `ITERATIVE_DRAFT_TEACH_PAUSED`，为用户暂停，非服务中断。新增4调用275057tokens，累计32调用13274396tokens。旧未知费用保留，未生成新正式军表，不作为新实验通过证据。
- 新A `fresh-generation-v249`：PID43257，09:37:08Z启动；新会话 `rws-8d1ff678-3b59-40d7-b282-4c38d4eafa46`，固定相同军表但无旧Plan/Teach导入。09:39:34Z进入真实Foundation，首调用214757tokens。
- 新B `fresh-generation-v249`：旧B确认终态后09:42:14Z启动PID49676；使用同产品迭代创建+Run入口，从空军表开始。不导入旧决策/Teach。读取其progress获取后续会话ID。
- 新运行报告保留 `previousProduction`，新用量单列，`cumulativeReportedUsage`继续累计旧账；未知费留在原账。不要重复启动任何仍存活runner。期间一次只读目录枚举超时导致观察工具重置；已确认生产进程独立存活，没有重发请求。

## 已查证的端上差异（尚未全部修复）

**B从头写表：** Web/App client `createIterativeSession → runIterativeSession` 调用 `/iterative/sessions/.../run`；实验也经同一HTTP Adapter、`createAgentSelectedRosterJourneyV1`和相同Builder/Teach/审核。这部分不是独立实验执行器。

**A固定表：** 端上目前只创建preset，再由用户点击generate/review/revise；client没有完整自动Teach/纠错编排。当前实验runner却依次调用generate、review、资格复核、repair-reviewed、teach-framework。因此底层方法相同，但整体产品编排**并不等价**，不能声称端上已经跑通。

**开局：** 当前迭代UI按钮只对Web开放，调用launch-room；产品启动方法写死`agent_vs_agent`。固定表有服务器端 `preparePregamePlanForRoom`，但没有与该UI等价的完整启动入口。该桥检查合法表/地图/来源审核，但不在此处显式检查本轮要求的完整Teach闭环。现状不足以证明Web/App人机入口与实验完整等价。

对应代码位置：
- `apps/starcraft-tmg-expo/components/roster-planning/roster-planning-workspace-panel.tsx`：572–585 preset/iterative分流；637–645开局限制。
- `apps/starcraft-tmg-expo/lib/roster-planning/roster-planning-client-v1.ts`：迭代Run/launch、preset及手动操作接口。
- `packages/product-composition/roster-planning-product-module-v1.mjs`：744迭代开局；824固定表房间桥。
- `scripts/run-slice272-fresh-generation-v240.mjs`：A实验侧编排仍在脚本内。

## 后续具体交付物（先产品编排，再宣称完整验收）

1. 固定表产品工作流：把A的生成、调查、Plan修订、来源审核／纠错编排放到后端可恢复入口，复用现有workspace方法；端上和实验都调用此入口。固定表仍不能改军表，策略审视与B等价。不要另造Builder/Rules/Teach。
2. 统一准入和启动：对固定表、从头写表使用明确的当前Plan/Teach/地图/来源状态；未解工程问题不能通过。核对人机与机机只在席位控制上不同，Bot实际执行器一致；App入口差异须显式处理，不能用Web-only按钮冒称双端可用。
3. 实验观察器只启动、观察、记录，不再私自挑选纠错路径或代替产品推进；新A现有结果可作诊断，但产品编排与端上操作未证明前不计端到端完成。
4. 端上真实验证：分别通过用户入口生成A/B并启动合法对局，保存流程/失败恢复/首个Bot动作的证据；证明双方地图、军表与Plan实际绑定。仅模型返回或脚本成功不算通过。

本轮没有声称这些待办已实现。先监控正在执行的新A/B，保留费用和暂停能力，不把未完成Teach的产物启动对局。T27/S272 5/6；T23 33/36；主线剩272/248/249/250共4片，完整实验0/12。新增工作归入原S272/S248，不另增计数掩盖产品缺口。
