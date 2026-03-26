import { useGameStore } from '../stores/gameStore';

const PHASE_LABELS: Record<string, string> = {
  NIGHT_BUILD: '夜・構築',
  NIGHT_ACTION: '夜・アクション',
  MORNING_RESOLVE: '朝・結果確認',
  DAY_DISCUSSION: '昼・議論',
  DAY_VOTE: '昼・投票',
};

// Visual max HP for the HP bar (DOCTOR can temporarily exceed STARTING_MAX_HP)
const HP_BAR_MAX = 3;

export function SpectatorView() {
  const publicState = useGameStore((s) => s.publicState);

  if (!publicState) return null;

  const alivePlayers = publicState.players.filter((p) => p.isAlive);
  const deadPlayers = publicState.players.filter((p) => !p.isAlive);
  const phaseLabel = PHASE_LABELS[publicState.phase] ?? publicState.phase;

  return (
    <div className="flex-1 flex flex-col p-6 animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 text-gray-400 text-sm mb-1">
          <span>🔭</span>
          <span>観戦中</span>
        </div>
        <h2 className="text-xl font-bold">{phaseLabel}</h2>
        <p className="text-gray-500 text-sm mt-1">
          プレイヤーたちが行動しています...
        </p>
      </div>

      <div className="max-w-md mx-auto w-full space-y-2 mb-6">
        {alivePlayers.map((player) => {
          const hpPercent = Math.max(0, (player.hp / HP_BAR_MAX) * 100);
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
                </div>
              </div>
            </div>
          );
        })}

        {deadPlayers.length > 0 && (
          <div className="text-gray-600 text-sm mt-2 pt-2 border-t border-gray-800">
            脱落者: {deadPlayers.map((p) => p.name).join(', ')}
          </div>
        )}
      </div>

      {publicState.logs.length > 0 && (
        <div className="max-w-md mx-auto w-full">
          <h3 className="text-sm text-gray-400 mb-2">ログ</h3>
          <div className="bg-wolf-dark/50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
            {publicState.logs
              .slice(-10)
              .reverse()
              .map((log, i) => (
                <div key={i} className="text-sm text-gray-400">
                  <span className="text-gray-600">[{log.turn}日目]</span>{' '}
                  {log.message}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
