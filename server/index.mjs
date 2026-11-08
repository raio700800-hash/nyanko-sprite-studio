import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json({ limit: '40mb' }))

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '')
  if (!match) return null
  return { mimeType: match[1], base64: match[2] }
}

async function urlToDataUrl(url, fallbackMime = 'image/png') {
  if (!url) return null
  if (url.startsWith('data:')) return url
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`生成画像の取得に失敗しました (${resp.status})`)
  }
  const contentType = resp.headers.get('content-type') || fallbackMime
  const arrayBuf = await resp.arrayBuffer()
  const b64 = Buffer.from(arrayBuf).toString('base64')
  return `data:${contentType.split(';')[0]};base64,${b64}`
}

function getEffectiveKey(provider, headerKey) {
  if (headerKey && headerKey.trim()) return headerKey.trim()
  if (provider === 'openrouter') return process.env.OPENROUTER_API_KEY || ''
  if (provider === 'gemini') return process.env.GEMINI_API_KEY || ''
  if (provider === 'fal') return process.env.FAL_KEY || ''
  return ''
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    envKeys: {
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      fal: Boolean(process.env.FAL_KEY),
    },
  })
})

app.get('/api/openrouter-models', async (req, res) => {
  try {
    const apiKey = getEffectiveKey('openrouter', req.get('x-api-key'))
    const headers = { 'Content-Type': 'application/json' }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    const resp = await fetch('https://openrouter.ai/api/v1/images/models', { headers })
    if (!resp.ok) {
      const txt = await resp.text()
      return res.status(resp.status).json({ error: txt || 'OpenRouterモデル一覧の取得に失敗しました' })
    }
    const json = await resp.json()
    return res.json(json)
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/translate-prompt', async (req, res) => {
  try {
    const { japaneseText, provider = 'openrouter' } = req.body || {}
    if (!japaneseText || !String(japaneseText).trim()) {
      return res.json({ englishText: '' })
    }

    const openrouterKey = getEffectiveKey('openrouter', req.get('x-openrouter-key') || (provider === 'openrouter' ? req.get('x-api-key') : ''))
    const geminiKey = getEffectiveKey('gemini', req.get('x-gemini-key') || (provider === 'gemini' ? req.get('x-api-key') : ''))

    const instruction =
      'Translate and condense the following Japanese character animation / visual effect description into clear, concise English keywords and phrases suitable for a 2D game sprite sheet image generation prompt. Return ONLY the English phrase, no quotes or commentary.'

    if (openrouterKey) {
      const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Nyanko Sprite Studio',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: instruction },
            { role: 'user', content: String(japaneseText) },
          ],
          max_tokens: 180,
          temperature: 0.2,
        }),
      })
      if (resp.ok) {
        const data = await resp.json()
        const text = data?.choices?.[0]?.message?.content?.trim()
        if (text) return res.json({ englishText: text, source: 'openrouter' })
      }
    }

    if (geminiKey) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${instruction}\n\n${String(japaneseText)}` }] }],
          }),
        }
      )
      if (resp.ok) {
        const data = await resp.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        if (text) return res.json({ englishText: text, source: 'gemini' })
      }
    }

    return res.status(400).json({
      error: '翻訳用のAPIキー（OpenRouter または Gemini）が未設定です。0円簡易変換または英語で直接入力できます。',
    })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

app.post('/api/generate-sheet', async (req, res) => {
  try {
    const {
      provider = 'openrouter',
      model,
      prompt,
      masterImageDataUrl,
      extraReferenceDataUrl,
      aspectRatio = '16:9',
      resolution = '1K',
      seed,
    } = req.body || {}

    if (!prompt || !masterImageDataUrl) {
      return res.status(400).json({ error: '3面図Master画像とプロンプトが必要です。' })
    }

    const apiKey = getEffectiveKey(provider, req.get('x-api-key'))
    if (!apiKey) {
      return res.status(401).json({
        error: `${provider} のAPIキーが設定されていません。右上の「API設定」または .env を確認してください。`,
      })
    }

    if (provider === 'openrouter') {
      const targetModel = model || 'black-forest-labs/flux-3-image-klein'
      const inputReferences = [{ image_url: masterImageDataUrl }]
      if (extraReferenceDataUrl) {
        inputReferences.push({ image_url: extraReferenceDataUrl })
      }

      const body = {
        model: targetModel,
        prompt,
        aspect_ratio: aspectRatio,
        resolution,
        input_references: inputReferences,
      }
      if (typeof seed === 'number' && Number.isFinite(seed)) {
        body.seed = seed
      }

      const resp = await fetch('https://openrouter.ai/api/v1/images', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Nyanko Sprite Studio',
        },
        body: JSON.stringify(body),
      })

      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const msg = json?.error?.message || json?.message || JSON.stringify(json)
        return res.status(resp.status).json({ error: `OpenRouter APIエラー: ${msg}` })
      }

      const firstItem = json?.data?.[0]
      let imageDataUrl = null
      if (firstItem?.b64_json) {
        const mime = firstItem.media_type || 'image/png'
        imageDataUrl = `data:${mime};base64,${firstItem.b64_json}`
      } else if (firstItem?.url) {
        imageDataUrl = await urlToDataUrl(firstItem.url)
      }

      if (!imageDataUrl) {
        return res.status(502).json({ error: 'OpenRouterから画像データが返却されませんでした。', raw: json })
      }

      return res.json({
        imageDataUrl,
        provider: 'openrouter',
        model: targetModel,
        costUsd: typeof json?.usage?.cost === 'number' ? json.usage.cost : null,
        usage: json?.usage || null,
      })
    }

    if (provider === 'gemini') {
      const targetModel = model || 'gemini-3.1-flash-image'
      const parts = []
      const masterParsed = parseDataUrl(masterImageDataUrl)
      if (!masterParsed) {
        return res.status(400).json({ error: '3面図Master画像の形式が不正です。' })
      }
      parts.push({
        inline_data: {
          mime_type: masterParsed.mimeType,
          data: masterParsed.base64,
        },
      })
      if (extraReferenceDataUrl) {
        const extraParsed = parseDataUrl(extraReferenceDataUrl)
        if (extraParsed) {
          parts.push({
            inline_data: {
              mime_type: extraParsed.mimeType,
              data: extraParsed.base64,
            },
          })
        }
      }
      parts.push({ text: prompt })

      const imageConfig = { aspectRatio }
      if (resolution && ['512', '0.5K', '1K', '2K', '4K'].includes(resolution)) {
        imageConfig.imageSize = resolution === '512' ? '0.5K' : resolution
      }

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseModalities: ['IMAGE'],
              imageConfig,
            },
          }),
        }
      )

      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const msg = json?.error?.message || JSON.stringify(json)
        return res.status(resp.status).json({ error: `Gemini APIエラー: ${msg}` })
      }

      const outParts = json?.candidates?.[0]?.content?.parts || []
      const imgPart = outParts.find((p) => p?.inlineData?.data || p?.inline_data?.data)
      const inline = imgPart?.inlineData || imgPart?.inline_data
      if (!inline?.data) {
        return res.status(502).json({ error: 'Geminiから画像データが返却されませんでした。', raw: json })
      }
      const mime = inline.mimeType || inline.mime_type || 'image/png'
      return res.json({
        imageDataUrl: `data:${mime};base64,${inline.data}`,
        provider: 'gemini',
        model: targetModel,
        costUsd: null,
        usage: json?.usageMetadata || null,
      })
    }

    if (provider === 'fal') {
      const targetModel = model || 'blackforestlabs/flux-3/edit-image'
      const imageUrls = [masterImageDataUrl]
      if (extraReferenceDataUrl) imageUrls.push(extraReferenceDataUrl)

      const body = targetModel.includes('kontext')
        ? {
            prompt,
            image_url: masterImageDataUrl,
            aspect_ratio: aspectRatio,
            sync_mode: true,
          }
        : {
            prompt,
            image_urls: imageUrls,
            aspect_ratio: aspectRatio,
            sync_mode: true,
          }

      if (typeof seed === 'number' && Number.isFinite(seed)) {
        body.seed = seed
      }

      const resp = await fetch(`https://fal.run/${targetModel}`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const json = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const msg = json?.detail || json?.error || JSON.stringify(json)
        return res.status(resp.status).json({ error: `fal.ai APIエラー: ${msg}` })
      }

      const outUrl = json?.images?.[0]?.url || json?.image?.url
      if (!outUrl) {
        return res.status(502).json({ error: 'fal.aiから画像URLが返却されませんでした。', raw: json })
      }

      const imageDataUrl = await urlToDataUrl(outUrl)
      return res.json({
        imageDataUrl,
        provider: 'fal',
        model: targetModel,
        costUsd: null,
        usage: null,
      })
    }

    return res.status(400).json({ error: `未対応のプロバイダです: ${provider}` })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
})

if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../dist')
  app.use(express.static(distDir))
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[nyanko-sprite-studio API] listening on http://127.0.0.1:${PORT}`)
})
