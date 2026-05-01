'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import ManaPip from '@/components/ManaPip'

const MANA_COLORS: Record<string, string> = {
  W: '#f5f0dc',
  U: '#4a90d9',
  B: '#a29cad',
  R: '#e05c3a',
  G: '#3a9e5c',
}

function getGlowColor(colorIdentity: string[]): string {
  if (!colorIdentity || colorIdentity.length === 0) return '#c9a84c'
  if (colorIdentity.length === 1) return MANA_COLORS[colorIdentity[0]] || '#c9a84c'
  return '#c9a84c'
}

function getLifeColor(lifePct: number): string {
  if (lifePct > 0.5) return '#3a9e5c'
  if (lifePct > 0.25) return '#c9a84c'
  return '#e05c3a'
}

function getEffectSize(count: number): number {
  if (count <= 3) return 84
  if (count <= 6) return 68
  if (count <= 10) return 54
  if (count <= 20) return 42
  return 34
}

export interface PlayerData {
  id: number
  name: string
  commanderName: string
  colorIdentity: string[]
  life: number
  startingLife: number
  poison: number
  commanderDamage: Record<number, number>
  eliminated: boolean
}

interface PlayerCardProps {
  player: PlayerData
  allPlayers: PlayerData[]
  onLifeChange: (newLife: number) => void
  onPoisonChange: (newPoison: number) => void
  onCommanderDamageChange: (fromId: number, dmg: number) => void
  onToggleEliminated: (eliminated: boolean) => void
}

interface LifeEffect {
  id: string
  type: 'gain' | 'damage'
  image: string
  size: number
  left: number
  top: number
  rotation: number
  delay: number
  duration: number
}

export default function PlayerCard({
  player,
  allPlayers,
  onLifeChange,
  onPoisonChange,
  onCommanderDamageChange,
  onToggleEliminated,
}: PlayerCardProps) {
  const [editingLife, setEditingLife] = useState(false)
  const [lifeInput, setLifeInput] = useState('')
  const [lifeEffects, setLifeEffects] = useState<LifeEffect[]>([])
  const [flipped, setFlipped] = useState(false)
  const effectIdRef = useRef(0)

  const lifePct = Math.max(0, player.life / player.startingLife)
  const opponents = allPlayers.filter((p) => p.id !== player.id)
  const glowColor = getGlowColor(player.colorIdentity)
  const lifeBarColor = getLifeColor(lifePct)
  const isMarcoPlayer = player.name.trim().toLowerCase() === 'marco'

  function triggerLifeEffects(delta: number) {
    if (!delta) return

    const count = Math.abs(delta)
    const type = delta > 0 ? 'gain' : 'damage'
    const image = isMarcoPlayer
      ? '/marco.png'
      : delta > 0
      ? '/health_gain.png'
      : '/damage_taken.png'
    const baseSize = getEffectSize(count)

    const nextEffects: LifeEffect[] = Array.from({ length: count }, (_, index) => ({
      id: `${type}-${effectIdRef.current++}`,
      type,
      image,
      size: Math.max(24, baseSize - Math.floor(index / 8) * 4),
      left: 10 + Math.random() * 78,
      top: 14 + Math.random() * 58,
      rotation: (Math.random() - 0.5) * 34,
      delay: Math.random() * 0.24,
      duration: 1.15 + Math.random() * 0.4,
    }))

    setLifeEffects((prev) => [...prev, ...nextEffects])

    window.setTimeout(() => {
      setLifeEffects((prev) =>
        prev.filter((effect) => !nextEffects.some((next) => next.id === effect.id))
      )
    }, 1800)
  }

  function submitLifeChange(newLife: number) {
    const delta = newLife - player.life
    if (!delta) return
    triggerLifeEffects(delta)
    onLifeChange(newLife)
  }

  function handleLifeClick() {
    setLifeInput(String(player.life))
    setEditingLife(true)
  }

  function handleLifeSubmit() {
    const val = parseInt(lifeInput, 10)
    if (!isNaN(val)) submitLifeChange(val)
    setEditingLife(false)
  }

  function handleLifeKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLifeSubmit()
    if (e.key === 'Escape') setEditingLife(false)
  }

  const totalCmdDmgReceived = opponents.reduce((sum, opp) => {
    return sum + (player.commanderDamage[opp.id] || 0)
  }, 0)

  return (
    <div
      className="relative rounded-2xl p-4 flex flex-col gap-3 transition-all overflow-hidden"
      style={{
        backgroundColor: '#1c2230',
        border: `2px solid ${glowColor}44`,
        boxShadow: player.eliminated ? 'none' : `0 0 20px ${glowColor}22`,
        opacity: player.eliminated ? 0.6 : 1,
        transform: flipped ? 'rotate(180deg)' : undefined,
      }}
    >
      {/* Life effects layer */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {lifeEffects.map((effect) => (
          <Image
            key={effect.id}
            src={effect.image}
            alt=""
            width={effect.size}
            height={effect.size}
            aria-hidden="true"
            unoptimized
            className={`life-effect-sprite life-effect-${effect.type}`}
            style={{
              position: 'absolute',
              left: `${effect.left}%`,
              top: `${effect.top}%`,
              width: `${effect.size}px`,
              height: `${effect.size}px`,
              ['--effect-rotation' as string]: `${effect.rotation}deg`,
              animationDelay: `${effect.delay}s`,
              animationDuration: `${effect.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Eliminated overlay */}
      {player.eliminated && (
        <div
          className="absolute inset-0 rounded-2xl flex items-center justify-center z-30"
          style={{ backgroundColor: '#0d111788' }}
        >
          <div
            className="font-cinzel font-bold text-2xl tracking-widest"
            style={{ color: '#e05c3a', textShadow: '0 0 20px #e05c3a' }}
          >
            ELIMINATED
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="font-semibold text-white text-base">{player.name}</div>
          {player.commanderName && (
            <div className="text-xs mt-0.5" style={{ color: '#c9a84c' }}>
              {player.commanderName}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFlipped((f) => !f)}
            className="w-7 h-7 rounded flex items-center justify-center text-base transition-colors"
            style={{ backgroundColor: '#ffffff11', color: '#9ca3af' }}
            title="Flip card"
          >
            ⟳
          </button>
          <div className="flex gap-1">
            {(player.colorIdentity?.length ? player.colorIdentity : ['C']).map((c) => (
              <ManaPip key={c} color={c} size={24} />
            ))}
          </div>
        </div>
      </div>

      {/* Life total */}
      <div className="flex items-center justify-center gap-2 sm:gap-6 relative z-10">
        <div className="flex flex-row gap-1.5 sm:gap-3">
          <button
            onClick={() => submitLifeChange(player.life + 5)}
            className="w-12 h-10 sm:w-16 sm:h-12 rounded-lg text-sm sm:text-base font-semibold"
            style={{ backgroundColor: '#3a9e5c22', color: '#3a9e5c', border: '1px solid #3a9e5c44' }}
          >
            +5
          </button>
          <button
            onClick={() => submitLifeChange(player.life + 1)}
            className="w-12 h-10 sm:w-16 sm:h-12 rounded-lg text-sm sm:text-base font-semibold"
            style={{ backgroundColor: '#3a9e5c22', color: '#3a9e5c', border: '1px solid #3a9e5c44' }}
          >
            +1
          </button>
        </div>

        <div className="text-center cursor-pointer select-none" onClick={handleLifeClick}>
          {editingLife ? (
            <input
              autoFocus
              type="number"
              value={lifeInput}
              onChange={(e) => setLifeInput(e.target.value)}
              onBlur={handleLifeSubmit}
              onKeyDown={handleLifeKey}
              className="w-24 text-center text-4xl font-bold rounded bg-transparent outline-none"
              style={{ color: lifeBarColor, borderBottom: `2px solid ${lifeBarColor}` }}
            />
          ) : (
            <div
              className="text-5xl font-bold font-cinzel"
              style={{ color: lifeBarColor, minWidth: '4rem' }}
            >
              {player.life}
            </div>
          )}
          {/* <div className="text-xs text-gray-500 mt-1">life</div> */}
        </div>

        <div className="flex flex-row gap-1.5 sm:gap-3">
          <button
            onClick={() => submitLifeChange(player.life - 1)}
            className="w-12 h-10 sm:w-16 sm:h-12 rounded-lg text-sm sm:text-base font-semibold"
            style={{ backgroundColor: '#e05c3a22', color: '#e05c3a', border: '1px solid #e05c3a44' }}
          >
            -1
          </button>
          <button
            onClick={() => submitLifeChange(player.life - 5)}
            className="w-12 h-10 sm:w-16 sm:h-12 rounded-lg text-sm sm:text-base font-semibold"
            style={{ backgroundColor: '#e05c3a22', color: '#e05c3a', border: '1px solid #e05c3a44' }}
          >
            -5
          </button>
        </div>
      </div>

      {/* Health bar */}
      <div
        className="w-full h-2 rounded-full overflow-hidden relative z-10"
        style={{ backgroundColor: '#374151' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(0, Math.min(100, lifePct * 100))}%`,
            backgroundColor: lifeBarColor,
          }}
        />
      </div>

      {/* Poison counters */}
      <div className="flex items-center gap-2 relative z-10">
        <div className="flex gap-0.5 flex-wrap">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className="w-4 h-4 rounded-full text-xs flex items-center justify-center"
              style={{ backgroundColor: idx < player.poison ? '#7c3aed' : '#374151' }}
            >
              {idx < player.poison ? '☠' : ''}
            </div>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => onPoisonChange(Math.max(0, player.poison - 1))}
            className="w-6 h-6 rounded text-xs font-bold"
            style={{ backgroundColor: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed44' }}
          >
            -
          </button>
          <span className="text-xs text-gray-400 w-4 text-center self-center">
            {player.poison}
          </span>
          <button
            onClick={() => onPoisonChange(Math.min(10, player.poison + 1))}
            className="w-6 h-6 rounded text-xs font-bold"
            style={{ backgroundColor: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed44' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Commander damage matrix */}
      {opponents.length > 0 && (
        <div className="relative z-10">
          <div className="text-xs text-gray-500 mb-1">Commander Damage Received</div>
          <div className="flex flex-col gap-1">
            {opponents.map((opp) => {
              const dmg = player.commanderDamage[opp.id] || 0
              return (
                <div key={opp.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex-1 truncate">{opp.name}</span>
                  <button
                    onClick={() => onCommanderDamageChange(opp.id, Math.max(0, dmg - 1))}
                    className="w-5 h-5 rounded text-xs"
                    style={{ backgroundColor: '#374151', color: '#9ca3af' }}
                  >
                    -
                  </button>
                  <span
                    className="text-xs font-semibold w-5 text-center"
                    style={{
                      color: dmg >= 21 ? '#e05c3a' : dmg >= 10 ? '#c9a84c' : '#9ca3af',
                    }}
                  >
                    {dmg}
                  </span>
                  <button
                    onClick={() => onCommanderDamageChange(opp.id, dmg + 1)}
                    className="w-5 h-5 rounded text-xs"
                    style={{ backgroundColor: '#374151', color: '#9ca3af' }}
                  >
                    +
                  </button>
                </div>
              )
            })}
          </div>
          {totalCmdDmgReceived >= 21 && (
            <div className="text-xs mt-1 font-semibold" style={{ color: '#e05c3a' }}>
              ⚠ 21+ commander damage!
            </div>
          )}
        </div>
      )}

      {/* Eliminate button */}
      <button
        onClick={() => onToggleEliminated(!player.eliminated)}
        className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all mt-auto relative z-10"
        style={
          player.eliminated
            ? { backgroundColor: '#3a9e5c22', color: '#3a9e5c', border: '1px solid #3a9e5c44' }
            : { backgroundColor: '#e05c3a22', color: '#e05c3a', border: '1px solid #e05c3a44' }
        }
      >
        {player.eliminated ? 'Restore Player' : 'Eliminate Player'}
      </button>
    </div>
  )
}
