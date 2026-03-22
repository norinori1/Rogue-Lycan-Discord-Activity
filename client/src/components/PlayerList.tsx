import type { PublicPlayer } from '@shared/types';
import { useGameStore } from '../stores/gameStore';

interface Props {
  selectable?: boolean;
  onSelect?: (playerId: string) => void;
  selectedId?: string | null;
  showVotes?: boolean;
}

export function PlayerList({ selectable, onSelect, selectedId, showVotes }: Props) {
  const publicState = useGameStore((s) => s.publicState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const voteCounts = useGameStore((s) => s.voteCounts);

  if (!publicState) return null;

  const alivePlayers = publicState.players.filter(
    (p) => p.isAlive && p.id !== myPlayerId
  );

  return (
    <div className="space-y-2">
      {alivePlayers.map((player) => (
        <PlayerRow
          key={player.id}
          player={player}
          isMe={player.id === myPlayerId}
          selectable={selectable}
          selected={selectedId === player.id}
          onClick={() => onSelect?.(player.id)}
          votes={showVotes ? voteCounts[player.id] || 0 : undefined}
        />
      ))}
    </div>
  );
}

interface RowProps {
  player: PublicPlayer;
  isMe?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  votes?: number;
}

function PlayerRow({ player, isMe, selectable, selected, onClick, votes }: RowProps) {
  const hpPercent = Math.max(0, (player.hp / 3) * 100);
  const hpColor =
    player.hp > 1 ? 'bg-green-500' : player.hp === 1 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div
      onClick={selectable ? onClick : undefined}
      className={`flex items-center gap-3 p-3 rounded-lg border transition ${
        selected
          ? 'border-wolf-gold bg-wolf-gold/10'
          : selectable
          ? 'border-wolf-light bg-wolf-dark/50 hover:border-wolf-accent cursor-pointer'
          : 'border-wolf-light/30 bg-wolf-dark/30'
      } ${!player.isAlive ? 'opacity-40' : ''}`}
    >
      <div className="w-8 h-8 rounded-full bg-wolf-light flex items-center justify-center text-sm font-bold">
        {player.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{player.name}</span>
          {isMe && <span className="text-xs text-wolf-gold">(あなた)</span>}
          {!player.isAlive && <span className="text-xs text-red-400">脱落</span>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-gray-700 rounded-full h-1.5">
            <div
              className={`hp-bar ${hpColor}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">HP:{player.hp}</span>
          <span className="text-xs text-gray-500">手札:{player.stackCount}</span>
        </div>
      </div>
      {votes !== undefined && (
        <div className="text-center">
          <div className="text-lg font-bold text-wolf-gold">{votes}</div>
          <div className="text-xs text-gray-500">票</div>
        </div>
      )}
      {selectable && (
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-wolf-gold' : 'border-gray-600'
        }`}>
          {selected && <div className="w-2.5 h-2.5 rounded-full bg-wolf-gold" />}
        </div>
      )}
    </div>
  );
}
