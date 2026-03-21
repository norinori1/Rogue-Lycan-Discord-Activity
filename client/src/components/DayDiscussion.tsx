import { useGameStore } from '../stores/gameStore';

export function DayDiscussion() {
  const publicState = useGameStore((s) => s.publicState);
  const privateState = useGameStore((s) => s.privateState);

  if (!publicState) return null;

  const alivePlayers = publicState.players.filter((p) => p.isAlive);
  const deadPlayers = publicState.players.filter((p) => !p.isAlive);

  return (
    <div className="flex-1 flex flex-col p-6 animate-fade-in">
      <h2 className="text-xl font-bold mb-1 text-center">議論フェーズ</h2>
      <p className="text-gray-400 text-sm mb-6 text-center">
        ボイスチャットで話し合ってください
      </p>

      {/* Player status */}
      <div className="max-w-md mx-auto w-full space-y-2 mb-6">
        {alivePlayers.map((player) => {
          const hpPercent = Math.max(0, (player.hp / 3) * 100);
          const hpColor =
            player.hp > 1
              ? 'bg-green-500'
              : player.hp === 1
              ? 'bg-yellow-500'
              : 'bg-red-500';

          return (
            <div
              key={player.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-wolf-light/30 bg-wolf-dark/30"
            >
              <div className="w-8 h-8 rounded-full bg-wolf-light flex items-center justify-center text-sm font-bold">
                {player.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-medium">{player.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-700 rounded-full h-1.5 max-w-[100px]">
                    <div
                      className={`hp-bar ${hpColor}`}
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">HP:{player.hp}</span>
                  <span className="text-xs text-gray-500">
                    手札:{player.stackCount}
                  </span>
                  {player.voteWeight !== 1 && (
                    <span className="text-xs text-wolf-gold">
                      投票権:{player.voteWeight}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {deadPlayers.length > 0 && (
          <div className="text-gray-600 text-sm mt-2 pt-2 border-t border-gray-800">
            脱落者:{' '}
            {deadPlayers.map((p) => p.name).join(', ')}
          </div>
        )}
      </div>

      {/* Game log */}
      <div className="max-w-md mx-auto w-full">
        <h3 className="text-sm text-gray-400 mb-2">ログ</h3>
        <div className="bg-wolf-dark/50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
          {publicState.logs.length === 0 ? (
            <p className="text-gray-600 text-sm">ログはまだありません</p>
          ) : (
            publicState.logs
              .slice(-10)
              .reverse()
              .map((log, i) => (
                <div key={i} className="text-sm text-gray-400">
                  <span className="text-gray-600">[{log.turn}日目]</span>{' '}
                  {log.message}
                </div>
              ))
          )}
        </div>
      </div>

      <p className="text-center text-gray-500 text-sm mt-auto pt-4">
        まもなく投票フェーズに移行します...
      </p>
    </div>
  );
}
