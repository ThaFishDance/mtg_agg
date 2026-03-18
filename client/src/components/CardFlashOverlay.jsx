export default function CardFlashOverlay({ flash }) {
  if (!flash) return null

  return (
    <div className="fixed inset-x-0 top-24 z-[70] flex justify-center pointer-events-none px-4">
      <div
        className="card-flash-overlay w-full max-w-2xl rounded-2xl border p-4 shadow-2xl backdrop-blur-sm"
        style={{
          backgroundColor: '#0d1117ee',
          borderColor: '#c9a84c88',
          boxShadow: '0 18px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-center gap-4">
          <img
            src={flash.imageUrl}
            alt={flash.name}
            className="w-28 rounded-xl border shrink-0"
            style={{ borderColor: '#c9a84c55' }}
          />
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.25em] mb-1" style={{ color: '#c9a84c' }}>
              Voice detected
            </div>
            <div className="font-cinzel text-2xl font-bold text-white truncate">{flash.name}</div>
            <div className="text-sm mt-1 text-gray-300">{flash.subtitle}</div>
            <div className="text-xs mt-3 text-gray-400 italic truncate">
              Heard: “{flash.transcript}”
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
