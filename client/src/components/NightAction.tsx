import { useGameStore } from '../stores/gameStore';
import { emitActionSubmit, emitActionSkip } from '../discord/socket';
import { CardInstanceDisplay } from './CardDisplay';
import { PlayerList } from './PlayerList';
import { CARD_DEFINITIONS } from '@shared/types';

export function NightAction() {
  const privateState = useGameStore((s) => s.privateState);
  const selectedCard = useGameStore((s) => s.selectedCard);
  const selectedTarget = useGameStore((s) => s.selectedTarget);
  const actionSubmitted = useGameStore((s) => s.actionSubmitted);
  const selectCard = useGameStore((s) => s.selectCard);
  const selectTarget = useGameStore((s) => s.selectTarget);
  const setActionSubmitted = useGameStore((s) => s.setActionSubmitted);

  const handleSubmit = () => {
    if (!selectedCard) return;
    const def = CARD_DEFINITIONS[selectedCard.cardId];
    if (def.targetType === 'player' && !selectedTarget) return;

    emitActionSubmit(
      selectedCard.instanceId,
      def.targetType === 'player' ? selectedTarget : null
    );
    setActionSubmitted(true);
  };

  const handleSkip = () => {
    emitActionSkip();
    setActionSubmitted(true);
  };

  if (actionSubmitted) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="text-2xl mb-2">🌙</div>
          <p className="text-gray-400">行動を確定しました</p>
          <p className="text-gray-500 text-sm mt-1">夜が明けるのを待っています...</p>
        </div>
      </div>
    );
  }

  const usableCards = privateState?.stack.filter((c) => !c.isDisabled) ?? [];
  const selectedDef = selectedCard
    ? CARD_DEFINITIONS[selectedCard.cardId]
    : null;
  const needsTarget = selectedDef?.targetType === 'player';

  return (
    <div className="flex-1 flex flex-col p-6 animate-fade-in">
      <h2 className="text-xl font-bold mb-1 text-center">アクション</h2>
      <p className="text-gray-400 text-sm mb-6 text-center">
        手札からカードを1枚使用できます
      </p>

      {/* Card selection */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-400 mb-2">手札</h3>
        <div className="flex gap-2 flex-wrap justify-center">
          {privateState?.stack.map((card) => (
            <CardInstanceDisplay
              key={card.instanceId}
              card={card}
              selected={selectedCard?.instanceId === card.instanceId}
              onClick={() =>
                !card.isDisabled &&
                selectCard(
                  selectedCard?.instanceId === card.instanceId ? null : card
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Target selection */}
      {selectedCard && needsTarget && (
        <div className="mb-6 max-w-md mx-auto w-full">
          <h3 className="text-sm text-gray-400 mb-2">
            対象プレイヤー（{selectedDef?.name}を使用）
          </h3>
          <PlayerList
            selectable
            onSelect={(id) =>
              selectTarget(selectedTarget === id ? null : id)
            }
            selectedId={selectedTarget}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center mt-auto">
        <button
          onClick={handleSubmit}
          disabled={!selectedCard || (needsTarget && !selectedTarget)}
          className="px-6 py-3 rounded-lg font-bold bg-wolf-accent hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 transition"
        >
          使用する
        </button>
        <button
          onClick={handleSkip}
          className="px-6 py-3 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 transition"
        >
          スキップ
        </button>
      </div>
    </div>
  );
}
