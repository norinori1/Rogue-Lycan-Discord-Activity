import type { Faction } from '@shared/types';

interface Props {
  faction: Faction;
}

export function FactionReveal({ faction }: Props) {
  const isWolf = faction === 'werewolf';

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/90 z-50 animate-fade-in">
      <div className="text-center">
        <div className="text-8xl mb-6">{isWolf ? '🐺' : '🏘️'}</div>
        <h2
          className={`text-4xl font-bold mb-2 ${
            isWolf ? 'text-red-400' : 'text-blue-400'
          }`}
        >
          {isWolf ? '人狼' : '市民'}
        </h2>
        <p className="text-gray-400">
          {isWolf
            ? '市民を排除して勝利を掴め'
            : '人狼を見つけ出し、追放せよ'}
        </p>
        <p className="text-gray-600 text-sm mt-4">まもなくゲーム開始...</p>
      </div>
    </div>
  );
}
