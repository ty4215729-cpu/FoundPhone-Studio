# 剧情脚本 v1

机器可读规范：schemas/story.schema.json。权威校验器：src/story-engine/compiler.ts，输出继续使用现有 Work formatVersion1，不更换运行时结构。

|字段|用途|
|---|---|
|scriptVersion/id/title/revision|脚本版本1、稳定作品ID、标题、正整数内容修订号|
|description/phone|简介；机主owner、date、time、passcode、wallpaper、theme等|
|installedApps|注册 App ID，或完整 App 配置（名称、图标、文件夹、Dock、visible、installed）；顺序即桌面顺序|
|contacts|id、name、phone、avatar、bio；owner 保留给机主|
|chats|稳定会话id、app、title、participants、messages；消息需要id/body，可带senderId、time、media、kind等|
|content|按 App ID 保存 Item 数组；记录id/title/body/time、hidden、password、unlock、folder、meta等|
|variables|字符串/数字/布尔初值|
|events|节点id/label/type/event/target、conditions、actions、next、delayMs；参见原 WORK_FORMAT|
|tests|name、steps、ending、expectUnlocked；所有ending节点至少一个通过的实际引擎路径|

各ID全局唯一且稳定；不要使用随机UUID。默认值由编译器补齐，未知字段拒绝，不会执行脚本。时间线使用 time 事件、delay节点及 date/time动作；来电使用call动作，接听callAnswered。条件使用变量以及 read:/visited:/unlocked:/completed:/clue:/ui: 等原引擎作用域。unlock动作解锁隐藏内容；password是内容密码，测试read前必须提供正确password。玩家选择用choice节点的next或choice动作关联目标节点。商店/账单/社交/通话/日历使用对应 App 的content与meta字段，详见APP_DEVELOPMENT.md。

测试step支持event/target、password、advanceMs、choose。测试是指定路径的可达性证据，不是对任意用户自定义条件的数学穷举证明。未知密码、隐藏内容、悬空引用、无测试结局会失败。

媒体仅支持safeMedia允许的内嵌data URL格式。禁止HTML/JS脚本；富文本为安全结构化JSON。作品脚本是公开静态数据，谜题密码不属于安全保密机制。

默认空白模板：stories/blank/story.json。引擎回归样例位于tests/fixtures/story-example，不作为内置作品。自然语言原稿：tests/fixtures/story-example/STORY.md。只改故事数据就能改变手机内容。

连续体验而未设置结局的章节，测试可将 `ending` 设为空字符串，仍通过 `expectUnlocked` 和步骤可达性验证。本章可用 `variables.replyApp="kakao"`、`replyThread` 指定聊天内选项；消息 `meta.autoRead="true"` 在打开会话时触发原有 read 事件。选项由故事节点提供，剩余选项由后续节点重新发出。

KKT 聊天中实际发送非空消息会更新 `ui:kakao:sent:联系人名`，可用同名 variable 事件和已解锁邀请条件触发后续回复。消息 `meta.replyToTyped="true"` 使用此前玩家消息的时间；本地发送记录的第四字段保存当时最后一条作者消息 ID，以维持收到回复前后的显示顺序。旧三字段记录仍可读取。

章节动作 `checkpoint` 的 key 是检查点 ID；`archive` 的 key 是路线记录 ID，value 是显示标签。快照写入玩家 Runtime，不写回作品数据，排除嵌套检查点与历史。恢复检查点由现有播放器中的章节控件调用；只读回看不触发作者事件。`resume` 是加载兼容旧存档后的一次事件。

测试 step 可指定字符串 `value`，仅用于 `event="variable"` 且 target 为 `ui:App:键` 时设置对应 UI 值并派发事件，便于重放指定键盘回复。

通知 `value` 使用「App 显示名：通知正文」指定来源，例如 `KakaoTalk：李柱延：早安`、`Instagram：李柱延发布了新动态`。横幅、锁屏和通知中心共用来源解析；旧存档中未带 App 前缀的通知，可通过当前脚本中相同正文的明确通知来源恢复显示，无需清除进度。通知中心点击后打开对应的已安装 App。
