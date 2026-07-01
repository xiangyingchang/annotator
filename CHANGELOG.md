# 更新日志

所有版本都按"用户可感知的能力"写，不写重构。

## v2.6.4 · 2026-07-01

**标注模态框按 Enter 直接保存**：模态框里 4 个 textarea（说明/评论、给 AI 的具体问题、建议替换为、如何验证）默认按 Enter 键就保存标注，不再是换行。

- Enter → 保存
- Shift+Enter → 换行（保留多行能力）
- Cmd/Ctrl+Enter → 也保存（向后兼容）
- 中文/日文 IME 组合输入时按 Enter 不会误触保存
- 模态框 footer 左侧加 hint：`Enter 保存 · Shift+Enter 换行 · Esc 取消`

## v2.6.3 · 2026-07-01

**跨 text node 选区正常显示**：用户从 inline 元素（**加粗**/`代码`/[链接]）**内部**选到元素**外**时，标注的高亮序号不再消失，点"定位"不再误报"原文已变动"。

之前是单 text node 里 `indexOf` 匹配，跨节点就完全失败 → 持久 mark 不创建 → 定位走模糊兜底 → 误命中上下文末 30 字到别处。现在用虚拟全文 indexOf + 跨节点 range 拆包。

## v2.6.2 · 2026-07-01

**定位按钮三步降级**：
1. 精确匹配（原文没动）
2. 模糊匹配：用 contextBefore 末 30 字 / selectedText 前后各 12 字做种子（原文小改）
3. 失败 → toast 提示按 ⌘+F 搜「标注 #N + 关键文字」

toast 文案不再提不存在的"人工查找"功能。

## v2.6.1 · 2026-06-30

**导出锚点反查**：mark 类型标注导出时不再用内部归一化坐标，改用端点附近原文片段。AI 拿到直接能定位，不用反查坐标语义。

## v2.6 · 2026-06-30 · 校对纸风格

**视觉重做**：
- 焦糖棕 `#b45309` 作为唯一 accent（signature element）
- warm off-white 底（避开 cream AI 默认）
- Inter 字体 + JetBrains Mono，带 `cv11/ss01` 特性
- 侧栏移到右侧，加可折叠机制
- mark 工具栏从 source-bar 移到底部 floating 胶囊
- 6 类标注改用 design token 弱化配色

**顺带修复 3 个 pre-existing bug**：
- `renderContent` 用 innerHTML 覆盖掉静态 markOverlay 节点
- markOverlay 重建后 mousedown 监听丢失
- 全局 mouseup setTimeout 抹掉 mark 的 currentSelection

## v2.5 · 多会话模式

- `wb-annotator-records` (list) + `wb-annotator-current` (id) 双 key 模式
- 旧单 key 数据自动迁移
- 切换 session 不清 current，刷新自动恢复

## v2.1 · 本地工作区

- File System Access API 直连本地文件夹
- 自动备份到 `.wb-annotator-backup.json`
- 60 秒自动落盘

## v2.0 · 6 类标注

新增：圈选（mark）/ 提问 AI（question）两类标注

## v1.0 · MVP

- 4 类标注：批注 / 替换 / 删除 / 插入
- localStorage 持久化
- 单 session 模式
