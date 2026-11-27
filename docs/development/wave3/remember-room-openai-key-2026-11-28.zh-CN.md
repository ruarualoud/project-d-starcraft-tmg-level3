# 本房 OpenAI Key 显式保存与重启恢复（2026-11-28）

## 用户授权与行为

用户在两问试聊前明确要求“后续就用这个apikey，不要每次都让我操作”。此前版本只保留进程内存；当前增加按房间／席位显式保存，点击“启用并保存本房 AI”才落盘，未传 remember 的既有 API 调用仍为临时凭据。保存不会启动模型、改变模型配置、增加额度或重置调用日志。

支持范围是 OpenAI 直接接入、人人对战中的本房本席。机器对手／DeepSeek 沿用原有临时或独立的凭据接入。不会把一位玩家的 Key 借给对方，不从本机全局环境或其他项目寻找替代钥匙。

## 存储和恢复

路径在原有本机房间数据下：build/playtest-web/host/rooms/<roomId>/companion-credentials/<seat>.sealed.json。整个 build 已由 Git 忽略。使用该房间既有 private payload codec 的 AES-256-GCM 加密，AAD 同时绑定 roomId、seatKey、providerId；独立目录 0700、文件 0600，写入临时文件并同步后原子替换。Key 内容及其 base64 都不出现在落盘 JSON 明文中。加密所需的房间密钥继续由现有本机 room.private.json 管理，不宣称隔离于同一系统用户或已被控制的主机。

重启后房间恢复时加载本席密文，尚未发起 Provider 时即可显示“已加密保存 · 重启自动恢复”。错误密文、被交换的房间／席位／Provider、符号链接均不作为可用 Key；没有全局或其他席位回退。保存失败保留当前可用的运行内存 Key。更换 Key 会关闭原 Provider；“移除”会清空内存与已保存副本。正常关闭服务只清理运行内存，保留用户要求保存的密文。

请求 API 沿用席位 Bearer 验证，仅 POST provider-key 新增布尔 remember。GET、导出和日志只给是否已保存、恢复状态和既有用量元数据，不提供 Key 导出接口。隔离 Provider worker 的 memory-only/no-credential-export 合同保持；持久化只位于显式产品 credential ingress。Key 保存无需也不会绕过请求上限。

旧进程没有 Key 导出接口，因此先完成已启用配置的两问，再部署保存功能，用户已完成最后一次页面录入以写入新存储；未从进程、浏览器密码框或调试请求里提取旧 Key。

## 验证

- node scripts/verify-wave3-persistent-room-key.mjs 通过：真实文件加密／权限、显式保存、关闭后恢复、房间／席位／Provider 隔离、篡改与符号链接拒绝、更换和移除、保存失败保留旧 Key、上限保持 9；真实 Provider／网络调用 0。证据 build/playtest-web/persistent-room-key/7cfb66bc-b276-4765-98b5-af820115ced3/report.public.json。
- node scripts/verify-wave3-openai-companion.mjs 通过：旧临时凭据语义、显式模型／端点、输出合同、前置超大请求拒绝、持久请求锁、无机器凭据回退等兼容；真实调用 0。
- UI 与 HEAD 对比类型诊断 43→43，新增 0；不声称全库无诊断。
- Web 离线导出通过：entry-ced78b9d8b47db65e8812f9a791856e6.js，未安装依赖。
- 真人保存与实际重启恢复通过：用户点击“启用并保存本房 AI”后，页面显示已加密保存，实际密文文件 851 字节、0600、AES-256-GCM。随后关闭 PID 34608，以同一原 host 数据、模型和累计上限 9 启动 PID 36335。页面全新加载后自动显示“已加密保存 · 重启自动恢复”，期间没有手动录入 Key；棋盘 r0，累计 9/9。真实 Provider 物理请求保持 9 行，usage 保持 11 行，没有新增调用。
- 现场证据：build/playtest-web/standard-roleplay/live-two-question-2026-11-28/key-cold-restore.public.json、key-cold-restore.png、saved-key-metadata.public.json。冷恢复证据来源为新进程后的新加载 UI；未声称抓取了本次 provider-key HTTP 回执。

harnessLoopUsed: true；targetGames: starcraft-tmg；harnessToolsCalled: configure_room_provider, restore_saved_room_credential, inspect_provider_status；trainingTraceCandidates: []；trainingTruth: false。授权 Provider 次数仅为当前累计 9 次；保存功能不授权任何新实调。
