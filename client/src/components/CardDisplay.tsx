import { CARD_DEFINITIONS, type CardId, type CardInstance } from '@shared/types';

interface CardDefProps {
  cardId: CardId;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const ATTR_COLORS: Record<string, string> = {
  attack: 'border-red-500 bg-red-900/20',
  defense: 'border-blue-500 bg-blue-900/20',
  heal: 'border-green-500 bg-green-900/20',
  investigate: 'border-purple-500 bg-purple-900/20',
  political: 'border-yellow-500 bg-yellow-900/20',
  distribution: 'border-cyan-500 bg-cyan-900/20',
  sabotage: 'border-orange-500 bg-orange-900/20',
  environment: 'border-wolf-gold bg-wolf-gold/20',
};

const ATTR_LABELS: Record<string, string> = {
  attack: '攻撃',
  defense: '防御',
  heal: '回復',
  investigate: '調査',
  political: '政治',
  distribution: '流通',
  sabotage: '妨害',
  environment: '環境',
};

export function CardDefDisplay({ cardId, selected, onClick, size = 'md' }: CardDefProps) {
  const def = CARD_DEFINITIONS[cardId];
  if (!def) return null;

  const colorClass = ATTR_COLORS[def.attribute[0]] || 'border-gray-500 bg-gray-900/20';
  const sizeClasses = {
    sm: 'w-20 p-2 text-xs',
    md: 'w-28 p-3',
    lg: 'w-36 p-4',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border-2 card-hover ${colorClass} ${sizeClasses[size]} ${
        selected ? 'ring-2 ring-wolf-gold scale-105' : ''
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="font-bold text-center mb-1">{def.name}</div>
      <div className="text-center text-gray-400 text-xs mb-2">
        {def.attribute.map((a) => ATTR_LABELS[a]).join('・')}
      </div>
      {size !== 'sm' && (
        <div className="text-xs text-gray-300 text-center">{def.description}</div>
      )}
    </div>
  );
}

interface CardInstanceProps {
  card: CardInstance;
  selected?: boolean;
  onClick?: () => void;
}

export function CardInstanceDisplay({ card, selected, onClick }: CardInstanceProps) {
  if (card.isDisabled) {
    return (
      <div className="w-28 p-3 rounded-lg border-2 border-gray-700 bg-gray-900/50 opacity-50">
        <div className="font-bold text-center text-gray-500 mb-1">無効化</div>
        <div className="text-xs text-gray-600 text-center">このカードは使えない</div>
      </div>
    );
  }

  return (
    <CardDefDisplay
      cardId={card.cardId}
      selected={selected}
      onClick={onClick}
      size="md"
    />
  );
}
