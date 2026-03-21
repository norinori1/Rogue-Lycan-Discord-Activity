import { useGameStore } from '../stores/gameStore';

export function MorningReport() {
  const morningEvents = useGameStore((s) => s.morningEvents);
  const publicState = useGameStore((s) => s.publicState);
  const privateState = useGameStore((s) => s.privateState);

  const events = morningEvents ?? [];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <h2 className="text-xl font-bold mb-6">朝がやってきた</h2>

      <div className="w-full max-w-md space-y-3 mb-6">
        {events.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            平穏な夜だった...
          </div>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${
                event.type === 'death'
                  ? 'border-red-800 bg-red-900/20 text-red-300'
                  : event.type === 'protected'
                  ? 'border-blue-800 bg-blue-900/20 text-blue-300'
                  : event.type === 'healed'
                  ? 'border-green-800 bg-green-900/20 text-green-300'
                  : 'border-gray-700 bg-gray-800/30 text-gray-300'
              }`}
            >
              {event.message}
            </div>
          ))
        )}
      </div>

      {/* Oracle results (private) */}
      {privateState && privateState.oracleResults.length > 0 && (
        <div className="w-full max-w-md mb-6">
          <h3 className="text-sm text-purple-400 mb-2">占い結果</h3>
          <div className="space-y-2">
            {privateState.oracleResults
              .filter((r) => r.turn === publicState?.turn)
              .map((result, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg border border-purple-800 bg-purple-900/20"
                >
                  <span className="font-bold">{result.targetName}</span> は{' '}
                  <span
                    className={
                      result.faction === 'werewolf'
                        ? 'text-red-400 font-bold'
                        : 'text-blue-400 font-bold'
                    }
                  >
                    {result.faction === 'werewolf' ? '人狼' : '市民'}
                  </span>{' '}
                  だった
                </div>
              ))}
          </div>
        </div>
      )}

      <p className="text-gray-500 text-sm">まもなく議論フェーズに移行します...</p>
    </div>
  );
}
