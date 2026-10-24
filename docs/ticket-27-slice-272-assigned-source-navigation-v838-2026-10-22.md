# T27 / S272 — P2/P5 局部纠错的来源导航修复

日期：2026-10-22。此文是施工记录，不是最终军表／Plan交付。T27 5/6；最终 Plan 0/6；相关剩余4片。

## 实际推进

同一 `slice272-product-generation-v645-lqMWaS`，没有新建流程、房间或清账。

1. e8759 方法角色收到 v837 的独立覆盖反馈后，提出 Ares 有／无双组实验。实际候选与 r4 逐值比较，唯一变化为 `/units/2/upgrades` 删除 `Ares-Class Targeting System`；其余单位、升级、卡牌不变。原生 Builder 判候选合法，1980矿／170气。它是私有对照臂，不是正式改表；正式 r4 仍2000矿／170气。
2. e8764 场景构造返回：两支单位在模型指定锚点上未找到静态队形。构造回执已保存，但几何未就绪；两个火力测量都保持等待，没有把 unknown 当0或成功。
3. e8772 自动纠错选择已有1174号队形资料，却把 `selections` 数组写成 `selection` 对象。编译器正确拒绝，未执行错误选项。
4. e8776 后的局部纠错收到原错误，但精简目录漏掉失败参数中明确引用的1174。模型连续搜索并误称来源不在目录，最终改为重新申请同场景求解。这不是资料丢失：1174实际存在且仍属当前资料；它未进入该角色的可导航目录。

## 根因与改动

原目录收集器只识别 `sourceEvidenceId`／`evidenceId` 字符串，不识别工具协议使用的数字编号，也不解析已声明的 `argumentsJson`。这使局部纠错丢了原提案已有的来源地址。

- `roster-workflow-repair-dependencies-v1.mjs` 增加共享、只读的来源导航提取：识别已有正整数来源编号、引用列表，以及工具 JSON 参数里的同类字段。
- `roster-workflow-read-role-v1.mjs` 使用该提取器补齐精简目录。
- 只匹配实际目录中存在的编号，保留原编号和 current/historical 身份。不从自由文本、哈希、optionIndex 推断引用；0、负数、字符串数字、未知编号、损坏JSON不变成来源。
- 不修写模型工作单，不自动读取或批准来源，不决定选哪个队形，不更改模型轮限或旧费用。

## 一次定点红绿

命令：`node scripts/verify-slice272-assigned-source-navigation-v838.mjs <原workflow目录>`。

- RED：使用真实 e8776 assignment，经过实际共享角色构造器，断言1174导航存在失败。
- 改动后一次 GREEN：相同调用接缝包含1174；模拟模型显式读取真实 `/formationOptionDirectory` 成功；原 task/error逐值不变；没有自动已读／批准。补充同一提取器的错误编号、自由文本和历史资料边界。
- 1次模拟回复，0真实 Provider，0 Native，0生产状态写入。其他已通过测试未重跑。
- 只证明信息交付修复，不证明真实模型必然正确选择、火力测量已完成或最终策略更优。

## 不可变证据

均位于原 workflow 的 `artifacts/<ref>.json`：

| 内容 | ref |
|---|---|
| 新双组实验提案 | `a2174c32bf86b0b10ecc430245b21825e511abde2232ccea19c08a7c05d10eda` |
| 场景几何未就绪 | `83999723ebf8a015a96f8dfeeb4aac469dddf49e98e7ac1c14fc3d4c7a4728f3` |
| Ares-absent合法候选 | `9d1478ff0d4753306120bc061337cfcb1837725aa3e7a9a6f7a0217aacc9ba45` |
| 失败选择与真实编译诊断 | `99068d7c071957c834b9dfda1ddf42dcd946d4f48f07d1cac62528cec538a754` |
| 回归使用的真实assignment | `478f8db6f4bbf8330bb124e7e5a73e1bde04d5df372862865b1240c260e6a3da` |
| 原实际prompt | `a450d227b1212ad4005a3497377b74ce2438179410abf50914412e134bdac11d` |
| 1174真实资料 | `a7d5ad26d11acdfa931f21b6990c7796e5ea5d120c1f3d601c8fafbbc46dde6a` |
| 旧输入下最终再求解提案 | `683d52928dc94a3138f5734cf6ee6e9f6fbf9094cbf0b718a67816ef416e2f84` |

本次新方法分支截至e8795：6次真实Flash、365151 units、Provider累计36514ms；不含此前覆盖审核，全部旧账保留。这不是端到端墙钟耗时。

一次1秒原进程采样捕获到事件等待（内存约2.7GiB），不足以证明CPU热点；未据此修改性能代码或宣称性能改善。采样：`build/slice272-v838-active-scheduler-sample-1792611078767.txt`。

## 恢复边界

原15734在e8795保存后正常退出，无在途。原位加载v838：36259，存储守护36260；日志 `build/slice272-v838-source-navigation-resume-1792611372223.log`。下一执行已由模型提交的局部准备工作，读取真实后继再继续双组测量；不能手选队形或把准备成功当整题完成。恢复时先核进程与最新状态，勿盲目另起一份。

### 实际续行至 e8799

36259已越过恢复初始化：原已排队的 `space.solve_static_formation` 真正完成，2次几何评估取得1个两单位联合队形，`jointGeometryProven=true`、`hostSelectedOption=false`、无miss。结果 `8e0807063b5e4784cece7676bbc9887a4d99fda4ec714619824f252bc6f81680` 已发布；下一摘要／显式选择，尚未应用队形、未完成两臂火力比较。新增1次Native查询，无新增Provider。此结果证明续跑没有停在初始化，不是对新目录修复的模型效果验收。
