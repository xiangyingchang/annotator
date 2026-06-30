# 标注与修订 (Annotator)

A zero-dependency, single-file HTML tool for marking up text — selections, mark boxes, arrows, comments — and exporting them in a format an AI can act on directly.

零依赖、单文件 HTML 标注工具。圈选、箭头、批注、删除建议一站搞定，导出格式让 AI 秒级定位。

## 特性

- **零依赖**：单文件 HTML，可直接 `python3 -m http.server` 本地起服务，或下载后双击打开
- **6 种标注类型**：批注 / 替换 / 删除 / 插入 / 圈选（矩形/箭头） / 提问 AI
- **AI 导出友好**：默认导出格式（`标注 #N @"锚点" → 修改说明`）是按"让 AI 拿到后能秒级定位"设计的，避开坐标黑盒
- **多会话管理**：所有数据存 localStorage，可同时维护多份独立 PRD / 文档 / 草稿
- **本地工作区**（v2.1+）：File System Access API 直连本地文件夹，修改实时落盘
- **Markdown / HTML / URL 三种输入**：粘贴、加载示例、抓取远程页（CORS 受限则自动降级为 iframe）
- **AI 回应回贴**：把 AI 的修改粘回，工具自动识别并勾选完成项

## 快速开始

```bash
# 方式 1：本地起服务（推荐，可启用 File System Access API）
cd annotator
python3 -m http.server 8765
# 浏览器打开 http://localhost:8765/index.html

# 方式 2：直接打开
# 双击 index.html（File System Access API 不可用，演示模式可正常用）
```

> 浏览器端权限（File System Access、localStorage 持久化、剪贴板）要求本地或 https，CloudStudio 远端托管版只跑 demo。

## 5 分钟上手

1. 打开页面 → 选「加载示例」（虚构的「智能书签 PRD v1.2」，含标题/列表/引用/加粗）或「粘贴内容」
2. 选中文本 → 弹小工具条 → 点「+」→ 选类型 → 写说明 → 保存
3. 想用箭头/矩形？→ 底部浮动工具栏点 ▭ 矩形 / ↗ 箭头 → 拖拽
4. 改完 → 右上「导出给 AI」→ 复制到对话 → AI 修改粘回 → 自动勾选完成

## 导出格式说明

工具默认按下面这种"极简格式"输出，每条一行，省 token 且 AI 拿到直接能改：

```
标注 #1 @"让用户在 5 秒" → 5 秒太主观，建议改成可量化的指标
标注 #2 @矩形 @"本期仅做 Web" → 移动端 v1.3 跟进 — 写明是哪个月
标注 #3 @箭头 从@"目标" → 指向@"范围" → 目标要从背景推导出来，不要直接列
```

锚点规则：

- **优先用原文片段**（≤8 字，能在文中搜到），不用坐标
- 避开"的/在/和/了"等高频词
- 实在锚不定（如表格、图表）才用「第 N 个表格 / 第 N 行 / 标题 X」位置描述
- 不输出 context/details 折叠块、使用说明、统计

## 架构

```
index.html   ←—— 全部代码（HTML + CSS + JS in one file，约 3500 行 / 116KB）
README.md
LICENSE      ←—— MIT
CHANGELOG.md
```

无构建步骤、无 npm install、无依赖。打开就能用，改完保存刷新就生效。

## 浏览器要求

| 能力 | 必需度 | 备注 |
|---|---|---|
| 现代浏览器（Chrome / Edge / Arc） | 必须 | File System Access API |
| Safari / Firefox | 可用 | 仅缺本地工作区，其他功能正常 |
| localStorage 持久化 | 建议 | 浏览器默认开启；隐私/无痕模式可能不持久 |

## 设计原则

- **正文 = 焦点**：右侧常驻侧栏可折叠（左上箭头），正文区永远是主角
- **签名元素 = 焦糖棕 3px 左线**：每张标注卡片左侧 3px 焦糖粗线是 signature element，让眼睛先锁住"哪里有批注"再读内容
- **避 AI Slop 默认**：warm off-white 底（不是 cream）+ 焦糖棕 accent（不是 terracotta），3px 粗线（不是 hairline），高对比信息层级
- **可导出 = 可协作**：导出格式是按"另一台机器的 AI 拿过去能直接改"反推设计的，不是给人眼读的

## 路线图

- v2.7：把 mark 端点"线性插值"补上（同行箭头 endAnchor 跟 startAnchor 重合的问题）
- v3.0：拆分 index.html 为 src/ + build.js（当前单文件结构有好处也有边界）
- 协作模式（多端同步、批注 review 工作流）

## 贡献

Issues / PRs 都欢迎。第一次跑前请：

```bash
# 跑端到端验证
python3 -m http.server 8765
# 在 Chrome 里打开 http://localhost:8765/index.html
# 走完一遍：欢迎页 → 加载示例 → 选文字 → 标 comment → 圈选画矩形 → 标箭头 → 导出
# 0 报错 0 残留 = OK
```

## 许可证

MIT © 2026 xiangyingchang

---

**Why this exists**: every AI coding session needs a "bridge" — a place to write what's wrong with the current draft, in a format the AI can act on. Word comments won't copy. Notion comments include noise. Google Docs requires login. This is the alternative.
