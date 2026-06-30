# 更新日志

所有版本都按"用户可感知的能力"写，不写重构。

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
