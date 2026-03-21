import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { emitBuildSelect } from '../discord/socket';
import { CardDefDisplay } from './CardDisplay';
import { CardInstanceDisplay } from './CardDisplay';
import { GAME_CONSTANTS, type CardId } from '@shared/types';

export function NightBuild() {
  const buildOptions = useGameStore((s) => s.buildOptions);
  const privateState = useGameStore((s) => s.privateState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSelect = (cardId: string) => {
    if (submitted) return;
    setSelectedId(cardId);
  };

  const handleConfirm = () => {
    if (!selectedId || submitted) return;
    emitBuildSelect(selectedId);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="text-2xl mb-2">✅</div>
          <p className="text-gray-400">カードを選択しました</p>
          <p className="text-gray-500 text-sm mt-1">他のプレイヤーを待っています...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <h2 className="text-xl font-bold mb-1">カードを1枚選んでください</h2>
      <p className="text-gray-400 text-sm mb-6">選んだカードが手札に追加されます</p>

      {/* Card choices */}
      <div className="flex gap-4 mb-8 flex-wrap justify-center">
        {buildOptions?.map((card) => (
          <CardDefDisplay
            key={card.id}
            cardId={card.id}
            selected={selectedId === card.id}
            onClick={() => handleSelect(card.id)}
            size="lg"
          />
        ))}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedId}
        className="px-8 py-3 rounded-lg font-bold bg-wolf-accent hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition"
      >
        選択を確定
      </button>

      {/* Current hand */}
      {privateState && privateState.stack.length > 0 && (
        <div className="mt-8 w-full max-w-lg">
          <h3 className="text-sm text-gray-400 mb-2">
            現在の手札 ({privateState.stack.length}/{GAME_CONSTANTS.MAX_STACK_SIZE}枚)
          </h3>
          <div className="flex gap-2 flex-wrap justify-center">
            {privateState.stack.map((card) => (
              <CardInstanceDisplay key={card.instanceId} card={card} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
