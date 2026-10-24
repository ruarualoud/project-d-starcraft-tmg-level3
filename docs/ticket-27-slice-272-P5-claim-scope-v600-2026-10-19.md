# P5：格式、局部职责与已过审核复用

T27/S272。实际原子审核运行发现工程问题，仍属新流程P5，不恢复旧调查。最终Plan0/6、对局0/12、剩余4片。

## 真实失败

第一版原子分段保留了所有字符，但把4段纯换行也排入事实审核。实际claim14把换行判成缺少证明，要求作者提供“具体主张”；不能把这种任务制造的缺失当作规则/策略未知。

实际claim4审核Medic能力句时又审其章节标题的受控对比，claim9在核对正确单攻击者数值后要求为普通“第二火力源”偏好补全全局边际实验。局部审核仍收到了整个原调查question与事实性章节标题，职责没有真正隔离。

## 修正

- 原字符与span完整保留在materialSegments；materialClaims只含非空白句。格式不是待补事实。
- 新子任务question固定为one_material_source_assertion，不再给整个调查goal；不把章节标题作为另一个被审主张。代词不明时可按需读原回答作上下文，不把其他句子的主张混进当前判定。
- 整体覆盖仍保留完整原question、回答与实际子检查，不放松真正数值/机制/条件的来源要求。
- 旧版已通过、且文本/原问题/来源/绑定未变的6条结果保留；仅8条受局部职责变化影响的检查重新安排。旧失败及空白任务原样留作历史，不改成成功。
- 显式替换旧的未继续派发覆盖任务：同回答、同绑定、更高主张合同版本、无运行中/未知请求才可supersede；已完成原件不改，无Provider重放。

## 定点门（旧门不重跑）

`verify-slice272-claim-scope-v600.mjs`以实际claim4/9/14先RED；修后一次GREEN：格式/全文保存、局部职责、6条实际通过结果复用、8条重新安排、未知请求不能退役。Core真实enqueue接缝用内存fixture验证，0Provider/生产写。旧v598门的全文断言改为读取materialSegments以保持合同一致，但未重跑已通过命令。

## 实际加载与模型修改

PID68636完成654/当前advance后优雅退出。PID82856以`--recheck-component-claim-scope`继续同一`inlKbk/projection-owner`，日志`build/slice272-live-p5-v600.log`。事件7745保留旧root的resultRef后，仅把其needs_model_choice控制任务superseded；新root为14条实质主张、复用6条、等待新8条。正式军表与Plan仍r2。

实际675的[完整prompt](../build/slice272-projection-owner-v565-inlKbk/675.request.json)和[公开回复](../build/slice272-projection-owner-v565-inlKbk/675.reply.json)表明作者已采纳具体反馈：撤回三单位合计，10.056/61.11%明确归Marauder1；Marauder2行单列；不再把未模拟Medic反应的采样差异当作收益。该答复还需确认来源/再验，不能算最终事实域或策略通过。

地图实际671已改为start_of_round场景并由工具构造/inspect，而非继续仅切movement等待Supply。仍须显式选择Native任务开始/先手/部署等动作，不能把准备状态当成进场。

## 账与范围

主Run至654：25,536,919 Tokens／冻结价估USD5.932991868；两个隔离原型49,457 Tokens／估USD0.014868900。项目已知132,152,842 Tokens。655+未包含在此小计，旧未知费用保留。所有原文/来源/费用不清零。

harnessLoopUsed:true；角色：局部source_fidelity→父question_coverage→原作者修订；无UI/新Web生成/对局/训练准入。来源数字正确、语义合理与策略优越性仍分别验收，本文不替代最终产物和中文完整流程报告。
