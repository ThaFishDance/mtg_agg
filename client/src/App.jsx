import { useState } from 'react'
import GameSetup from './components/GameSetup'
import Dashboard from './components/Dashboard'
import GameHistory from './components/GameHistory'
import LandingPage from './components/LandingPage'

export default function App() {
  const [view, setView] = useState('landing') // 'landing' | 'setup' | 'dashboard' | 'history'
  const [players, setPlayers] = useState([])
  const [gameId, setGameId] = useState(null)
  const [gameStartTime, setGameStartTime] = useState(null)

  function handleGameStart({ gameId, players, startTime }) {
    setGameId(gameId)
    setPlayers(players)
    setGameStartTime(startTime)
    setView('dashboard')
  }

  function handleGameEnd() {
    setGameId(null)
    setPlayers([])
    setGameStartTime(null)
    setView('history')
  }

  function handleNewGame() {
    setView('setup')
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0d1117' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: '#161b22', borderColor: '#c9a84c33' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-cinzel text-xl font-bold" style={{ color: '#c9a84c' }}>
            MTG Game Manager
          </h1>
          <nav className="flex gap-2">
            <button
              onClick={() => setView('landing')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${view === 'landing' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              style={view === 'landing' ? { backgroundColor: '#c9a84c', color: '#0d1117' } : {}}
            >
              Home
            </button>
            <button
              onClick={handleNewGame}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${view === 'setup' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              style={view === 'setup' ? { backgroundColor: '#c9a84c', color: '#0d1117' } : {}}
            >
              New Game
            </button>
            {view === 'dashboard' && (
              <button
                className="px-3 py-1.5 rounded text-sm font-medium text-gray-400 hover:text-white transition-all"
                disabled
                style={{ opacity: 0.5, cursor: 'default' }}
              >
                Dashboard
              </button>
            )}
            <button
              onClick={() => setView('history')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${view === 'history' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
              style={view === 'history' ? { backgroundColor: '#c9a84c', color: '#0d1117' } : {}}
            >
              History
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className={view === 'landing' ? '' : 'max-w-7xl mx-auto px-4 py-6'}>
        {view === 'landing' && (
          <LandingPage
            onStartGame={handleNewGame}
            onViewHistory={() => setView('history')}
          />
        )}
        {view === 'setup' && (
          <GameSetup onGameStart={handleGameStart} />
        )}
        {view === 'dashboard' && (
          <Dashboard
            players={players}
            setPlayers={setPlayers}
            gameId={gameId}
            gameStartTime={gameStartTime}
            onGameEnd={handleGameEnd}
          />
        )}
        {view === 'history' && (
          <GameHistory onNewGame={handleNewGame} />
        )}
      </main>
    </div>
  )
}
