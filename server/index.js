import express from 'express'
import cors from 'cors'
import pool from './db.js'
import gamesRouter from './routes/games.js'
import cardsRouter from './routes/cards.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/games', gamesRouter)
app.use('/api/cards', cardsRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

async function start() {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log(`✓ Database connected (${result.rows[0].now})`)
  } catch (err) {
    console.warn(`⚠ Database connection failed: ${err.message}`)
    console.warn('  Server will still start — check DB_* env vars or run schema.sql first')
  }

  app.listen(PORT, () => {
    console.log(`✓ MTG App server listening on http://localhost:${PORT}`)
  })
}

start()
