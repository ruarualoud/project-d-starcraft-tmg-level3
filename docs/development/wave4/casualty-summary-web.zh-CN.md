# Web伤亡方案摘要

本项产品可用性准则通过；W4-03和整版Wave4人人对战仍未完成，完整原子仍6/18。

原表单把casualtySelectionHash直接当按钮标题，390px下横向溢出，玩家无法判断移除哪些模型。现从防守方Native LegalSpace公开的legalSelections投影移除顺序与剩余模型，按钮显示例如“Zealot 1 → Zealot 2 → Zealot 3 · 剩余0模型”。显示名称不参与规则判断，提交仍使用原权威哈希。长按钮在卡片内换行。

[390px实际截图](evidence/casualty-summary-web-390.png)已核看。表单clientWidth与scrollWidth均为298px；原哈希没有出现在伤亡选项标签。新离线Web V2绑定[编译字节及源文件哈希](evidence/casualty-summary-build.public.json)，没有安装依赖、调用模型或生产发布。

[双席Web](evidence/casualty-summary-web.public.json)从原Photon房26个签名动作的真实断点进入，1500px／390px独立席位完成Detonation后继5次实际确认。预览只读、选择提交、双方可见状态、恢复重入、回放均通过；完成记录重读新增动作0。后端Native运行时描述符与此前Photon Web完全相同。本回归不重复增加Detonation功能验收汇总。

[实际消费者](evidence/casualty-summary-consumers.public.json)是client-domain的nativeCasualtyOptionLabelsV1与应用NativeActionForm；[工具闭环](evidence/casualty-summary-harness.public.json)保存前后截图与状态范围。驱动旧bundle仍可按哈希定位；--readable-casualties明确要求新按钮、可读标签、手机宽度和原提交值，不能用旧截图代替。

构建使用PROJECT_D_LOCAL_WEB_EXPORT=1、EXPO_PUBLIC_STARCRAFT_TMG_LOCAL_WEB_EXPORT=1、EXPO_OFFLINE=1及Expo本地export，产物位于build/wave4-web/stukov-units/web-bundle-v2。验收入口：serve-wave4-virus-web.mjs加载原Photon证明、新bundle与相同specs；verify-wave4-virus-web.mjs附--readable-casualties。恢复时读取同一完成记录，不重发确认。

后续仍需Disengage失败摆位的Web发起表单、Consume与其他未接消费者、13个已审核记录、完整发布／Builder／大厅／媒体和500／2000分双席。39条来源阻断、80mm工程估算和所有暂停项保持。
