// Temporary test route to isolate overhead
import express from 'express';

const app = express();

app.get('/api/v1/posts', async (req, res) => {
  const t0 = process.hrtime.bigint()

  const fakeData = Array(3).fill({
    id: 1,
    title: "test",
    body: "x".repeat(1000),
    author: {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      role: "USER",
      profileImage: null
    },
    commentsCount: 0,
    likesCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const tBeforeSerialize = process.hrtime.bigint()
  const json = JSON.stringify(fakeData)
  const tAfterSerialize = process.hrtime.bigint()

  res.setHeader('Content-Type', 'application/json')
  res.send(json)

  const tEnd = process.hrtime.bigint()

  console.log({
    serializeMs: Number(tAfterSerialize - tBeforeSerialize) / 1e6,
    totalHandlerMs: Number(tEnd - t0) / 1e6,
    payloadBytes: Buffer.byteLength(json)
  })
})

// Add lifecycle timing middleware
app.use((req, res, next) => {
  const start = process.hrtime.bigint()

  res.on('finish', () => {
    const end = process.hrtime.bigint()
    console.log('Lifecycle ms:', Number(end - start) / 1e6)
  })

  next()
})

// Event loop blocking detector
setInterval(() => {
  const start = process.hrtime.bigint()
  setImmediate(() => {
    const end = process.hrtime.bigint()
    const delayMs = Number(end - start) / 1e6
    if (delayMs > 50) {
      console.log('🚨 Event loop delay:', delayMs.toFixed(2) + 'ms')
    }
  })
}, 1000)

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`🧪 Isolation test server running on port ${PORT}`)
  console.log(`📍 Test endpoint: http://localhost:${PORT}/api/v1/posts`)
})
