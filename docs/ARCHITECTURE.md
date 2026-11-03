# Architecture

正式入口 index.html → src/runtime/StoryPlayer.tsx → Phone。构建只包含玩家入口，不暴露可视化创作器。原有作者模块保留兼容，但不进入正式依赖图。

stories/template/story.json 是可替换的中性演示；stories/blank/story.json 是纯空白起点。scripts/story.mjs 通过 src/story-engine/compiler.ts 编译为 Work v1，校验稳定 ID、引用、安全素材和剧情图。testStory.ts 重放测试路径，检查密码、隐藏内容和结局。

src/engine.ts 是纯状态转移引擎。Work 在游玩中保持不可变，Runtime 保存玩家进度、事件、来电、通知和选择。src/persistence.ts 使用 IndexedDB，作者数据与玩家存档分表存储。

src/registry.ts 注册 App；Phone、AppSkins、skins 与 src/apps 等现有组件负责页面呈现。桌面安装状态与布局由现有 App 管理和 launcher 模块处理。App 注册数量不代表每个 App 的全部原生页面均已完成。

正式构建生成 dist/，使用相对资源路径，支持静态托管。图标资源随源码保存在 assets/app-icons，正式构建自动打包，Fork 后无需另行下载。正式构建同时生成 work.json 与 test-work.json，默认模板使用完整 App 测试配置；纯空白作品独立保留。纯空白入口为 ?template=blank。

作者媒体采用经过校验的内嵌数据，不执行任意 HTML 或脚本。大型媒体和大作品会增加 JSON、内存与快照开销，尚未针对超大作品优化。许可与版权通知保留在源文件和分发文件中。

正式打包时由 runtime/media.ts 将主作品的相同内嵌媒体去重到 public/work-media.json；StoryPlayer 加载后验证媒体并还原 Work，再交给原有运行时。源故事仍使用同一 Schema；blank/test 入口保持原格式。发布需同时包含 work.json 和 work-media.json。

章节回看仅扩展 Runtime：`checkpoint` 动作保存不含嵌套历史的状态快照；`archive` 保存带标签的独立只读路线。`restoreCheckpoint` 恢复快照并保留历史与检查点，可传入重玩路线变量。快照无媒体副本，作者 Work 不变。AppContent 以选中历史呈现消息与专属 INS，禁用输入、选择与读事件；返回当前剧情不改变实时 Runtime。`resume` 用于同修订号追加章节的明确迁移入口，普通不兼容脚本改动仍使用 revision 重置。
