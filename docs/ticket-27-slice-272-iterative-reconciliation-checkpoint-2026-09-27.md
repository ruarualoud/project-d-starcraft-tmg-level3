# Ticket 27 / Slice 272 — 迭代写表断点与已付回复复用

2026-09-27。状态：**进行中，不是正式 2000 分军表准出**。固定来源、认证
Lost Temple + Hold Position、Terran Armed Forces 对 Kerrigan's Swarm；真实
Flash 会话 `iterative-standard-2000-live-v1` 保存在
`build/ticket-27-slice-272-iterative-live-v1/iterative-draft`。源数据未刷新。

## 具体故障与修法

1. 首次查询同时含合法 `candidate_menu` / `map_summary` 与过早的
   `budget_branches`。现在只忽略不满足前置条件的子查询，保留其余权威工具回执，
   忽略项写观察记录；不把模型声称当 Rules 事实。
2. 三次付费提案的显式 `assumptionDisposition` 被放进 `plan`，严格顶层
   校验全部误判缺字段。现在仅将这个显式值类型化搬到决策层，不生成默认值；
   三份原付费输出的结构零费用复验均通过。
3. 初次提案已引用认证地图摘要的 room-freeze hash，但旧校验要求候选专属
   `map_route` 回执，而该回执只有 Builder 判出合法候选后才能取得。初稿可引用
   已认证摘要，最终 `finish` 仍必须绑定当前候选的真实 route 回执。
4. 模型另一份提案携带未见于任何地图回执的 hash。现在保留可交给 Builder
   的候选与公开计划，将该 hash 置为未绑定并单独记录警告；绝不认证该 hash。
5. `requires_reconciliation` 可从同会话已付费回复生成零 Provider 的派生回执
   并重新验证，保留来源 request key；主动 `--reconcile-last=true` 也可复放
   `active` 状态最后一次被拒的付费回复。相同源的派生复验至多三次，不会无限转。
6. Builder 否决保留类型化细节；当前明确为 `ARMY_SLOT_CAPACITY_EXCEEDED:Core`。
   上述修复不放宽 Rules 合法性，也不自动修改模型选的军表。

## 真实进度与成本

- revision 7：复用第五次已付费输出，Builder 判 Core 槽位非法。
- revision 9：复用第六次已付费输出，忽略无来源地图 hash，Builder 再次判
  Core 槽位非法；这证明两次模型的 Core 算术确有策略/写表错误，而非仅格式错。
- revision 10：第七次真实回复首次取得 Builder `legal`，但仅 **920/2000**；
  它是中间候选，不是最终表。Host 自动给出 16 个经 Builder 检验的预算邻域分支，
  目前所见最高约 1130，不能据此声称不存在精确 2000 分解。
- 七次实际付费回复共 194,419 输入 / 12,693 输出 units，冻结价格快照按峰/谷
  两档估算 **¥0.282488–¥0.564976**；这是估算，不是提供商账单。
- revision 10 之后的新真实模型续轮已在原会话启动；尚未得到精确 2000、
  候选专属地图路线、Rules 进场日程、完整 Teach 审核或对战接入。

预算分支性能缺陷另定位为：排序前对最多 20,000 条组合逐条深拷贝全表再计算
槽位溢出。已改成在同一官方菜单上计算操作增量，**只改变建议排序的计算方法**，
每个返回分支仍由完整 Builder 核验。真实新续轮的耗时和分支内容仍待观察。

局部验证：`verify-ticket-27-slice-272-iterative-session-v1.mjs` 在会话核心修订后
一次通过，0 Provider/0 Room；三份保留的模型原答结构复放 3/3 通过；正式
Builder 对两份修复候选分别给出非法回执、对第三份给出合法 920 回执。
`trainingTruth=false`，不能把初稿或邻域提示用于复盘升级。
