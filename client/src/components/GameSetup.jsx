import { useState } from 'react'

const MANA_COLORS = [
  { id: 'W', label: 'W', color: '#f5f0dc', textColor: '#1a1a1a' },
  { id: 'U', label: 'U', color: '#4a90d9', textColor: '#fff' },
  { id: 'B', label: 'B', color: '#a29cad', textColor: '#fff' },
  { id: 'R', label: 'R', color: '#e05c3a', textColor: '#fff' },
  { id: 'G', label: 'G', color: '#3a9e5c', textColor: '#fff' },
]

function createPlayer(index) {
  return {
    name: `Player ${index + 1}`,
    commanderName: '',
    colorIdentity: [],
  }
}

export default function GameSetup({ onGameStart }) {
  const [playerCount, setPlayerCount] = useState(4)
  const [players, setPlayers] = useState(() => Array.from({ length: 4 }, (_, i) => createPlayer(i)))
  const [startingLife, setStartingLife] = useState(40)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handlePlayerCountChange(count) {
    setPlayerCount(count)
    setPlayers(prev => {
      if (count > prev.length) {
        return [...prev, ...Array.from({ length: count - prev.length }, (_, i) => createPlayer(prev.length + i))]
      }
      return prev.slice(0, count)
    })
  }

  function updatePlayer(index, field, value) {
    setPlayers(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  function toggleColor(playerIndex, colorId) {
    setPlayers(prev => prev.map((p, i) => {
      if (i !== playerIndex) return p
      const colors = p.colorIdentity.includes(colorId)
        ? p.colorIdentity.filter(c => c !== colorId)
        : [...p.colorIdentity, colorId]
      return { ...p, colorIdentity: colors }
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const missingCommander = players.map((p, i) => !p.commanderName?.trim() ? i + 1 : null).filter(Boolean)
    if (missingCommander.length > 0) {
      setError(`Player${missingCommander.length > 1 ? 's' : ''} ${missingCommander.join(', ')} must enter a commander name`)
      return
    }
    const missing = players.map((p, i) => p.colorIdentity.length === 0 ? i + 1 : null).filter(Boolean)
    if (missing.length > 0) {
      setError(`Player${missing.length > 1 ? 's' : ''} ${missing.join(', ')} must select at least one color`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players, startingLife }),
      })
      if (!res.ok) throw new Error('Failed to create game')
      const data = await res.json()
      const enrichedPlayers = players.map((p, i) => ({
        ...p,
        id: data.players[i].id,
        life: startingLife,
        startingLife,
        poison: 0,
        commanderDamage: {},
        eliminated: false,
      }))
      onGameStart({ gameId: data.gameId, players: enrichedPlayers, startTime: Date.now() })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="font-cinzel text-3xl font-bold mb-2" style={{ color: '#c9a84c' }}>
          New Game Setup
        </h2>
        <p className="text-gray-400">Configure your game before battle begins</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Player count + starting life */}
        <div className="rounded-xl p-6 space-y-4" style={{ backgroundColor: '#1c2230' }}>
          <h3 className="font-cinzel font-semibold text-lg" style={{ color: '#c9a84c' }}>Game Settings</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Number of Players</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handlePlayerCountChange(n)}
                    className="w-10 h-10 rounded-lg font-semibold text-sm transition-all"
                    style={playerCount === n
                      ? { backgroundColor: '#c9a84c', color: '#0d1117' }
                      : { backgroundColor: '#161b22', color: '#9ca3af', border: '1px solid #374151' }
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Starting Life Total</label>
              <div className="flex gap-2">
                {[20, 30, 40].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStartingLife(n)}
                    className="px-3 h-10 rounded-lg font-semibold text-sm transition-all"
                    style={startingLife === n
                      ? { backgroundColor: '#c9a84c', color: '#0d1117' }
                      : { backgroundColor: '#161b22', color: '#9ca3af', border: '1px solid #374151' }
                    }
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={startingLife}
                  onChange={e => setStartingLife(Number(e.target.value))}
                  className="w-16 h-10 rounded-lg px-2 text-sm text-center font-semibold"
                  style={{ backgroundColor: '#161b22', border: '1px solid #374151', color: 'white' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Player fields */}
        <div className="space-y-4">
          {players.map((player, i) => (
            <div key={i} className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#1c2230' }}>
              <h3 className="font-semibold text-gray-200">Player {i + 1}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Player Name</label>
                  <input
                    type="text"
                    value={player.name}
                    onChange={e => updatePlayer(i, 'name', e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: '#161b22', border: '1px solid #374151', color: 'white' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: !player.commanderName?.trim() ? '#e05c3a' : '#9ca3af' }}>
                    Commander Name <span style={{ color: '#e05c3a' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={player.commanderName}
                    onChange={e => updatePlayer(i, 'commanderName', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: '#161b22', border: `1px solid ${!player.commanderName?.trim() ? '#e05c3a55' : '#374151'}`, color: 'white' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-2" style={{ color: player.colorIdentity.length === 0 ? '#e05c3a' : '#9ca3af' }}>
                  Color Identity <span style={{ color: '#e05c3a' }}>*</span>
                </label>
                <div className="flex gap-2">
                  {MANA_COLORS.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleColor(i, c.id)}
                      className="w-8 h-8 rounded-full text-xs font-bold transition-all"
                      style={{
                        backgroundColor: player.colorIdentity.includes(c.id) ? c.color : '#374151',
                        color: player.colorIdentity.includes(c.id) ? c.textColor : '#9ca3af',
                        transform: player.colorIdentity.includes(c.id) ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: player.colorIdentity.includes(c.id) ? `0 0 8px ${c.color}88` : 'none',
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ backgroundColor: '#e05c3a22', border: '1px solid #e05c3a55', color: '#e05c3a' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-cinzel font-semibold text-lg transition-all"
          style={{ backgroundColor: '#c9a84c', color: '#0d1117', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Starting...' : 'Begin the Battle'}
        </button>
      </form>
    </div>
  )
}
