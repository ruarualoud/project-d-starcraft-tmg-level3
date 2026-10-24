# P2/P5：当前六域审核使用按需目录（v616）

## 具体失败与修复范围

v615之后，真实Plan已为r3；检查当前六域审核构造器时，发现它仍会发送全部历史资料目录。这会让分块后的审核重新受历史体积影响。此次只改变带`domainId`、使用现有分类合同的六域审核，不改规则/Builder/审核义务/已通过的原子来源复核。

- 给这类审核开放现有只读`catalogue`动作与稳定编号搜索，不另建事实来源。
- 首次只展示已分配、已读或明确引用的资料；其他资料依然可搜索/分页，再按需读取原件。
- 搜索结果只是目录元数据，不视为已读证据或准出。
- 旧输出缺空的`catalogueQueries`仅作无损运输默认，原文保留；不改其战略判断。

## 定点实证

`scripts/verify-slice272-domain-review-catalogue-v616.mjs`使用真实当前r3，调用产品的审核任务构造器、共同reader与同一目录搜索实现，仅内存保存。

- RED74011：当前地图审核仍注入全历史目录，断言失败。
- GREEN74637：一次通过。原目录1567条，首轮显示4条；`marker`、`tool_receipt`、全部scope的搜索实际有174条匹配，首8条保持原编号和原标题。
- 0真实Provider、0Native、0生产写；源状态原样，未重跑v614/v615或无关已通过门。

这不证明审核结论正确，只证明审核所需的资料访问能力和分块输入没有退化为全历史注入。仍须观察真实模型的读取、判断和后续闭环。

## 同产品实际执行

客户端：`scripts/run-slice272-product-review-cycle-v616.mjs`。它只调用同一产品`openDecisionWorkflow`、`requestFinalReviews`、`advance`等现有Interface，不实现第二套军表、规则或Plan流程。

原Run `build/slice272-projection-owner-v565-inlKbk`，session `projection-owner`，原r3；PID75794，日志`build/slice272-live-product-review-v616.log`。不重建房间、不创建原来的大域调查、不重演已执行Native动作、不清原文/次数/账单。

实际已创建r3六域审核，机械阻塞为空。v615继承的3条原问题已真实传到`plan_continuity`审核义务：全表条件到达、标记2/4控制、首到/VP。其中可能有已被旧证据回答或不属于必要工程事实的部分，须逐项核对，不能因模型曾称unknown就自动认定确缺，也不能因requiredData为空而丢失。

真实审核仍在运行；未据启动或局部门禁宣布正式Plan通过。最终Plan0/6、游戏0/12、相关余4片、T27 5/6、T23 33/36。固定表新鲜生成、最终逐步中文报告及战略效果比较仍未完成。
