import Image from 'next/image'

const MANA_SVG: Record<string, string> = {
  W: '/land/plains.svg',
  U: '/land/island.svg',
  B: '/land/swamp.svg',
  R: '/land/mountain.svg',
  G: '/land/forest.svg',
}

export default function ManaSymbol({ color, size = 20 }: { color: string; size?: number }) {
  const src = MANA_SVG[color]
  if (!src) return null
  return <Image src={src} alt={color} width={size} height={size} />
}
