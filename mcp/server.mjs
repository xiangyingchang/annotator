#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SESSIONS_DIR = path.join(ROOT_DIR, 'sessions')
const REVISIONS_DIR = path.join(ROOT_DIR, 'revisions')
const HTTP_PORT = parseInt(process.env.ANNOTATOR_PORT || '43218', 10)

fs.mkdirSync(SESSIONS_DIR, { recursive: true })
fs.mkdirSync(REVISIONS_DIR, { recursive: true })

function log(msg) {
  process.stderr.write(`[annotator-mcp] ${msg}\n`)
}

function readSessionFile(file) {
  const raw = fs.readFileSync(file, 'utf-8')
  return JSON.parse(raw)
}

function safeReadSession(sessionId) {
  const file = sessionId
    ? path.join(SESSIONS_DIR, `${sessionId}.json`)
    : path.join(SESSIONS_DIR, 'latest.json')
  if (!fs.existsSync(file)) return null
  return readSessionFile(file)
}

function listSessionFiles() {
  return fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'latest.json')
    .sort((a, b) => {
      const ta = readSessionFile(path.join(SESSIONS_DIR, a))?.updatedAt || 0
      const tb = readSessionFile(path.join(SESSIONS_DIR, b))?.updatedAt || 0
      return tb - ta
    })
}

function buildStructuredSummary(session) {
  const anns = session.annotations || []
  const open = anns.filter(a => a.status === 'open')
  const resolved = anns.filter(a => a.status === 'resolved')
  const src = session.source || {}

  const annotationList = anns.map(a => {
    const entry = {
      order: a.order,
      type: a.type,
      status: a.status,
      selectedText: a.selectedText || '',
      comment: a.comment || '',
      proposedText: a.proposedText || '',
      verify: a.verify || '',
      contextBefore: a.contextBefore || '',
      contextAfter: a.contextAfter || ''
    }
    if (a.type === 'mark' && a.markBox) {
      entry.markBox = a.markBox
      entry.areaAnchor = a.areaAnchor || ''
    }
    return entry
  })

  return {
    sessionId: session.id,
    source: {
      type: src.type,
      title: src.title || '',
      url: src.url || ''
    },
    stats: { total: anns.length, open: open.length, resolved: resolved.length },
    annotations: annotationList,
    revisions: session.revisions || [],
    updatedAt: session.updatedAt
  }
}

function buildAIPrompt(session) {
  const summary = buildStructuredSummary(session)
  const open = summary.annotations.filter(a => a.status === 'open')
  if (open.length === 0) return '（无待处理标注）'

  const lines = []
  lines.push(`# 标注修订请求`)
  lines.push(``)
  lines.push(`文档来源：${summary.source.title || summary.source.type}`)
  lines.push(`待处理标注：${open.length} 条`)
  lines.push(``)
  lines.push(`## 标注列表`)
  lines.push(``)

  open.forEach(a => {
    const anchor = a.type === 'mark'
      ? `矩形 @"${a.areaAnchor || '区域'}"`
      : `"${(a.selectedText || '').slice(0, 20)}"`
    lines.push(`### 标注 #${a.order} [${a.type}]`)
    lines.push(`- 锚点：${anchor}`)
    if (a.selectedText) lines.push(`- 原文：${a.selectedText}`)
    if (a.contextBefore) lines.push(`- 前文：${a.contextBefore}`)
    if (a.contextAfter) lines.push(`- 后文：${a.contextAfter}`)
    if (a.comment) lines.push(`- 批注：${a.comment}`)
    if (a.proposedText) lines.push(`- 建议替换为：${a.proposedText}`)
    if (a.verify) lines.push(`- 验证要求：${a.verify}`)
    if (a.markBox) lines.push(`- 圈选位置：x=${a.markBox.x?.toFixed(2)},y=${a.markBox.y?.toFixed(2)},w=${a.markBox.w?.toFixed(2)},h=${a.markBox.h?.toFixed(2)}`)
    lines.push(``)
  })

  lines.push(`## 修订要求`)
  lines.push(`1. 按标注编号逐条处理`)
  lines.push(`2. 回复格式："标注 #N：[修订内容]"`)
  lines.push(`3. 如标注有冲突，说明冲突并给出综合建议`)
  lines.push(``)
  lines.push(`## 结构化数据（JSON）`)
  lines.push('```json')
  lines.push(JSON.stringify(summary, null, 2))
  lines.push('```')

  return lines.join('\n')
}

const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'annotator-mcp', port: HTTP_PORT }))
    return
  }

  if (req.method === 'PUT' && req.url === '/api/session') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const session = JSON.parse(body)
        const json = JSON.stringify(session, null, 2)
        fs.writeFileSync(path.join(SESSIONS_DIR, 'latest.json'), json)
        if (session.id) {
          fs.writeFileSync(path.join(SESSIONS_DIR, `${session.id}.json`), json)
        }
        log(`session saved: ${session.id || '(no id)'}, ${session.annotations?.length || 0} annotations`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, sessionId: session.id }))
      } catch (e) {
        log(`save error: ${e.message}`)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: e.message }))
      }
    })
    return
  }

  if (req.method === 'GET' && req.url === '/api/session/latest') {
    const session = safeReadSession(null)
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'no session' }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(session))
    return
  }

  res.writeHead(404)
  res.end()
})

httpServer.listen(HTTP_PORT, '127.0.0.1', () => {
  log(`HTTP bridge on http://127.0.0.1:${HTTP_PORT}`)
})

const server = new Server(
  { name: 'annotator', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_annotation_session',
      description: '读取最新或指定的标注会话。返回结构化 JSON：文档来源、标注列表（含原文/上下文/批注/建议/圈选位置）、修订记录。AI 可直接消费此数据执行修订。',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: '会话 ID。不传则返回最新的会话。' }
        }
      }
    },
    {
      name: 'get_annotation_prompt',
      description: '生成发送给 AI 的修订请求 prompt（含标注列表 + 结构化 JSON）。可直接用于 AI 对话。',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: '会话 ID。不传则用最新会话。' }
        }
      }
    },
    {
      name: 'list_annotation_sessions',
      description: '列出所有历史标注会话（ID、标题、标注数、更新时间）。',
      inputSchema: { type: 'object', properties: {} }
    },
    {
      name: 'send_annotation_revision',
      description: 'AI 提交标注修订结果。修订内容保存到 revisions/ 目录，标注状态可标记为已处理。',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: '会话 ID' },
          revision: { type: 'string', description: '修订内容（文本或 JSON）' },
          resolvedOrders: {
            type: 'array',
            items: { type: 'number' },
            description: '已处理的标注编号列表'
          }
        },
        required: ['sessionId', 'revision']
      }
    }
  ]
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === 'get_annotation_session') {
      const session = safeReadSession(args?.sessionId)
      if (!session) {
        return {
          content: [{ type: 'text', text: '未找到标注会话。请先在 Annotator 中标注并点击「推送」按钮保存到 MCP server。' }]
        }
      }
      const summary = buildStructuredSummary(session)
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }]
      }
    }

    if (name === 'get_annotation_prompt') {
      const session = safeReadSession(args?.sessionId)
      if (!session) {
        return {
          content: [{ type: 'text', text: '未找到标注会话。' }]
        }
      }
      const prompt = buildAIPrompt(session)
      return {
        content: [{ type: 'text', text: prompt }]
      }
    }

    if (name === 'list_annotation_sessions') {
      const files = listSessionFiles()
      if (files.length === 0) {
        return { content: [{ type: 'text', text: '暂无标注会话。' }] }
      }
      const sessions = files.map(f => {
        try {
          const data = readSessionFile(path.join(SESSIONS_DIR, f))
          return {
            id: data.id,
            title: data.source?.title || '未命名',
            annotations: data.annotations?.length || 0,
            open: data.annotations?.filter(a => a.status === 'open').length || 0,
            updatedAt: data.updatedAt
          }
        } catch { return null }
      }).filter(Boolean)
      return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] }
    }

    if (name === 'send_annotation_revision') {
      const { sessionId, revision, resolvedOrders } = args
      if (!sessionId) {
        return { content: [{ type: 'text', text: '缺少 sessionId' }] }
      }
      const revFile = path.join(REVISIONS_DIR, `${sessionId}-${Date.now()}.json`)
      const revData = {
        sessionId,
        revision,
        resolvedOrders: resolvedOrders || [],
        at: Date.now()
      }
      fs.writeFileSync(revFile, JSON.stringify(revData, null, 2))
      log(`revision saved: ${revFile}`)

      if (resolvedOrders && resolvedOrders.length > 0) {
        const sessionFile = path.join(SESSIONS_DIR, `${sessionId}.json`)
        if (fs.existsSync(sessionFile)) {
          const session = readSessionFile(sessionFile)
          let changed = false
          for (const ann of session.annotations || []) {
            if (resolvedOrders.includes(ann.order) && ann.status === 'open') {
              ann.status = 'resolved'
              ann.resolvedAt = Date.now()
              changed = true
            }
          }
          if (changed) {
            session.updatedAt = Date.now()
            fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2))
            fs.writeFileSync(path.join(SESSIONS_DIR, 'latest.json'), JSON.stringify(session, null, 2))
            log(`session ${sessionId} updated: ${resolvedOrders.length} annotations resolved`)
          }
        }
      }

      return {
        content: [{ type: 'text', text: `修订结果已保存到 ${path.basename(revFile)}。${resolvedOrders?.length || 0} 条标注已标记为已处理。` }]
      }
    }

    return { content: [{ type: 'text', text: `未知工具: ${name}` }] }
  } catch (e) {
    log(`tool error: ${e.message}`)
    return { content: [{ type: 'text', text: `错误: ${e.message}` }] }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
log('MCP server ready')
