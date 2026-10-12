import ManaSymbol from '@/components/ManaSymbol'

const MANA_COLOR: Record<string, string> = {
  W: '#f5f0dc',
  U: '#4a90d9',
  B: '#a29cad',
  R: '#e05c3a',
  G: '#3a9e5c',
  C: '#9ca3af',
}

export default function ManaPip({
  color,
  size = 32,
  className = '',
}: {
  color: string
  size?: number
  className?: string
}) {
  const bg = MANA_COLOR[color]
  if (!bg) return null
  const symbolSize = Math.round(size * 0.69)
  return (
    <div
      className={`rounded-full flex items-center justify-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        boxShadow: `0 0 ${Math.round(size * 0.375)}px ${bg}88`,
        flexShrink: 0,
      }}
    >
      <ManaSymbol color={color} size={symbolSize} />
    </div>
  )
}
