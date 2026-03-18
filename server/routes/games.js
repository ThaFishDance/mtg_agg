import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// POST /api/games — create a new game with players
router.post('/', async (req, res) => {
  const { players, startingLife = 40 } = req.body
  if (!players || players.length < 2) {
    return res.status(400).json({ error: 'At least 2 players required' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const gameResult = await client.query(
      'INSERT INTO games (starting_life, player_count) VALUES ($1, $2) RETURNING id',
      [startingLife, players.length]
    )
    const gameId = gameResult.rows[0].id

    const insertedPlayers = []
    for (const player of players) {
      const pr = await client.query(
        'INSERT INTO game_players (game_id, player_name, commander_name, commander_colors) VALUES ($1, $2, $3, $4) RETURNING id',
        [gameId, player.name, player.commanderName || null, player.colorIdentity || []]
      )
      insertedPlayers.push({ id: pr.rows[0].id, name: player.name })
    }

    await client.query('COMMIT')
    res.status(201).json({ gameId, players: insertedPlayers })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error creating game:', err)
    res.status(500).json({ error: 'Failed to create game' })
  } finally {
    client.release()
  }
})

// GET /api/games — list completed games with player summaries
router.get('/', async (req, res) => {
  try {
    const gamesResult = await pool.query(
      `SELECT g.*,
        json_agg(json_build_object('player_name', gp.player_name) ORDER BY gp.id) AS players
       FROM games g
       LEFT JOIN game_players gp ON gp.game_id = g.id
       WHERE g.completed_at IS NOT NULL
       GROUP BY g.id
       ORDER BY g.started_at DESC`
    )
    res.json(gamesResult.rows)
  } catch (err) {
    console.error('Error fetching games:', err)
    res.status(500).json({ error: 'Failed to fetch games' })
  }
})

// GET /api/games/:id — full game details
router.get('/:id', async (req, res) => {
  const { id } = req.params
  try {
    const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [id])
    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found' })

    const playersResult = await pool.query(
      'SELECT * FROM game_players WHERE game_id = $1 ORDER BY id',
      [id]
    )
    res.json({ ...gameResult.rows[0], players: playersResult.rows })
  } catch (err) {
    console.error('Error fetching game:', err)
    res.status(500).json({ error: 'Failed to fetch game' })
  }
})

// POST /api/games/:id/complete — finalize game with results
router.post('/:id/complete', async (req, res) => {
  const { id } = req.params
  const { winnerName, players } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const gameResult = await client.query('SELECT started_at FROM games WHERE id = $1', [id])
    if (gameResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Game not found' })
    }

    const startedAt = gameResult.rows[0].started_at
    const completedAt = new Date()
    const durationSeconds = Math.floor((completedAt - new Date(startedAt)) / 1000)

    await client.query(
      'UPDATE games SET completed_at = $1, duration_seconds = $2, winner_name = $3 WHERE id = $4',
      [completedAt, durationSeconds, winnerName, id]
    )

    for (const player of players) {
      await client.query(
        `UPDATE game_players
         SET final_life = $1, final_poison = $2, eliminated = $3, commander_damage_dealt = $4
         WHERE id = $5 AND game_id = $6`,
        [player.finalLife, player.finalPoison, player.eliminated, player.commanderDamageDealt || 0, player.id, id]
      )
    }

    await client.query('COMMIT')
    res.json({ success: true, durationSeconds })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Error completing game:', err)
    res.status(500).json({ error: 'Failed to complete game' })
  } finally {
    client.release()
  }
})

export default router
