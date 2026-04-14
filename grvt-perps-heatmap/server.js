import express from 'express'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3456
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH)
const GRVT_BASE = 'https://market-data.grvt.io/full/v1'
const publicDir = path.join(__dirname, 'public')
const routePrefixes = BASE_PATH ? [BASE_PATH, ''] : ['']
const staticMounts = BASE_PATH ? [BASE_PATH, '/'] : ['/']

function normalizeBasePath(value) {
  if (!value || value === '/') return ''
  return `/${String(value).replace(/^\/+|\/+$/g, '')}`
}

app.disable('x-powered-by')
app.use(express.json())

app.get(routePrefixes.map(prefix => `${prefix}/health` || '/health'), (_req, res) => {
  res.json({ status: 'ok' })
})

for (const mount of staticMounts) {
  app.use(mount, express.static(publicDir))
}

app.post(routePrefixes.map(prefix => `${prefix}/api/:endpoint` || '/api/:endpoint'), async (req, res) => {
  const { endpoint } = req.params

  try {
    const upstream = await fetch(`${GRVT_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    })

    const text = await upstream.text()
    let data

    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text || `Upstream request failed with ${upstream.status}` }
    }

    res.status(upstream.status).json(data)
  } catch (err) {
    res.status(502).json({ error: String(err.message) })
  }
})

app.listen(PORT, () => {
  const urls = BASE_PATH
    ? [`http://localhost:${PORT}/`, `http://localhost:${PORT}${BASE_PATH}/`]
    : [`http://localhost:${PORT}/`]
  console.log(`GRVT Perps Heatmap -> ${urls.join(' | ')}`)
})
