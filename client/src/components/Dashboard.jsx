import { useState, useEffect } from 'react'
import PlayerCard from './PlayerCard'
import CardFlashOverlay from './CardFlashOverlay'
import useVoiceCardRecognition from '../hooks/useVoiceCardRecognition'

function formatTime(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Dashboard({ players, setPlayers, gameId, gameStartTime, onGameEnd }) {
  const [elapsed, setElapsed] = useState(0)
  const [turn, setTurn] = useState(1)
  const [showEndModal, setShowEndModal] = useState(false)
  const [selectedWinner, setSelectedWinner] = useState('')
  const [ending, setEnding] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  const {
    isSupported: voiceSupported,
    isListening,
    error: voiceError,
    lastTranscript,
    activeFlash,
    lastMatchedName,
  } = useVoiceCardRecognition({ enabled: voiceEnabled })

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - gameStartTime)
    }, 1000)
    return () => clearInterval(interval)
  }, [gameStartTime])

  function updatePlayer(id, updates) {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  function handleLifeChange(playerId, newLife) {
    updatePlayer(playerId, { life: newLife })
  }

  function handlePoisonChange(playerId, newPoison) {
    updatePlayer(playerId, { poison: newPoison })
  }

  function handleCommanderDamageChange(playerId, fromId, newDmg) {
    setPlayers(prev => prev.map(p => {
      if (p.id !== playerId) return p
      return { ...p, commanderDamage: { ...p.commanderDamage, [fromId]: newDmg } }
    }))
  }

  function handleToggleEliminated(playerId, eliminated) {
    updatePlayer(playerId, { eliminated })
  }

  async function handleEndGame() {
    if (!selectedWinner) return
    setEnding(true)
    try {
      const finalPlayers = players.map(p => ({
        id: p.id,
        finalLife: p.life,
        finalPoison: p.poison,
        eliminated: p.eliminated,
        commanderDamageDealt: Object.values(p.commanderDamage || {}).reduce((a, b) => a + b, 0),
      }))
      await fetch(`/api/games/${gameId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerName: selectedWinner, players: finalPlayers }),
      })
      onGameEnd()
    } catch (err) {
      console.error('Failed to end game:', err)
    } finally {
      setEnding(false)
    }
  }

  const activePlayers = players.filter(p => !p.eliminated)
  const cols = players.length <= 2 ? 2 : players.length <= 4 ? 2 : 3
  const voiceStatus = !voiceSupported
    ? 'Voice unavailable in this browser'
    : voiceError || (voiceEnabled ? (isListening ? 'Listening for “I cast …” or “activate …”' : 'Starting mic…') : 'Voice off')

  return (
    <div>
      <CardFlashOverlay flash={activeFlash} />

      {/* Sticky top bar */}
      <div className="sticky top-[57px] z-40 rounded-xl px-4 py-3 mb-6" style={{ backgroundColor: '#161b22', border: '1px solid #c9a84c33' }}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <div className="text-xs text-gray-400">Time</div>
              <div className="font-cinzel font-semibold text-lg" style={{ color: '#c9a84c' }}>{formatTime(elapsed)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400">Turn</div>
              <div className="flex items-center gap-1">
                <button onClick={() => setTurn(t => Math.max(1, t - 1))} className="text-gray-400 hover:text-white px-1">−</button>
                <span className="font-cinzel font-semibold text-lg" style={{ color: '#c9a84c' }}>{turn}</span>
                <button onClick={() => setTurn(t => t + 1)} className="text-gray-400 hover:text-white px-1">+</button>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {activePlayers.length}/{players.length} active
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => voiceSupported && setVoiceEnabled(current => !current)}
              disabled={!voiceSupported}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
              style={voiceEnabled
                ? { backgroundColor: '#3a9e5c', color: '#07110a' }
                : !voiceSupported
                  ? { backgroundColor: '#374151', color: '#6b7280', cursor: 'not-allowed' }
                  : { backgroundColor: '#1f2937', color: '#c9a84c', border: '1px solid #c9a84c55' }
              }
            >
              {voiceEnabled ? 'Voice On' : 'Voice Off'}
            </button>
            <button
              onClick={() => setShowEndModal(true)}
              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
              style={{ backgroundColor: '#e05c3a', color: 'white' }}
            >
              End Game
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-1">
          <div className="text-xs" style={{ color: voiceEnabled && isListening ? '#86efac' : '#9ca3af' }}>
            {voiceStatus}
          </div>
          <div className="text-xs" style={{ color: '#6b7280' }}>
            Try: “I cast Sol Ring” or “I pay 1 and activate Sensei's Divining Top”
          </div>
          {lastTranscript && (
            <div className="text-xs truncate" style={{ color: '#6b7280' }}>
              Last heard: “{lastTranscript}”
            </div>
          )}
          {lastMatchedName && (
            <div className="text-xs truncate" style={{ color: '#c9a84c' }}>
              Last matched card: {lastMatchedName}
            </div>
          )}
        </div>
      </div>

      {/* Player grid */}
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {players.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            allPlayers={players}
            onLifeChange={life => handleLifeChange(player.id, life)}
            onPoisonChange={poison => handlePoisonChange(player.id, poison)}
            onCommanderDamageChange={(fromId, dmg) => handleCommanderDamageChange(player.id, fromId, dmg)}
            onToggleEliminated={eliminated => handleToggleEliminated(player.id, eliminated)}
          />
        ))}
      </div>

      {/* End Game Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: '#000000bb' }}>
          <div className="rounded-2xl p-6 w-full max-w-md space-y-4" style={{ backgroundColor: '#1c2230', border: '2px solid #c9a84c44' }}>
            <h2 className="font-cinzel text-xl font-bold" style={{ color: '#c9a84c' }}>Declare the Victor</h2>
            <p className="text-gray-400 text-sm">Select the winner of this game:</p>
            <div className="space-y-2">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedWinner(p.name)}
                  className="w-full text-left px-4 py-3 rounded-lg transition-all"
                  style={selectedWinner === p.name
                    ? { backgroundColor: '#c9a84c22', border: '1px solid #c9a84c', color: 'white' }
                    : { backgroundColor: '#161b22', border: '1px solid #374151', color: '#9ca3af' }
                  }
                >
                  <span className="font-medium">{p.name}</span>
                  {p.eliminated && <span className="ml-2 text-xs" style={{ color: '#e05c3a' }}>(eliminated)</span>}
                  <span className="ml-auto float-right text-sm">{p.life} life</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowEndModal(false); setSelectedWinner('') }}
                className="flex-1 py-2 rounded-lg font-semibold text-sm"
                style={{ backgroundColor: '#161b22', border: '1px solid #374151', color: '#9ca3af' }}
              >
                Cancel
              </button>
              <button
                onClick={handleEndGame}
                disabled={!selectedWinner || ending}
                className="flex-1 py-2 rounded-lg font-semibold text-sm transition-all"
                style={{ backgroundColor: selectedWinner ? '#c9a84c' : '#374151', color: selectedWinner ? '#0d1117' : '#6b7280', opacity: ending ? 0.7 : 1 }}
              >
                {ending ? 'Saving...' : 'End Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
