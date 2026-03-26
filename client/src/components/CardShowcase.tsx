import { useEffect, useRef, useState } from 'react';
import { CARD_DEFINITIONS, type CardId } from '@shared/types';

const ALL_CARD_IDS = Object.keys(CARD_DEFINITIONS) as CardId[];
const CARD_INTERVAL_MS = 4500;
const CARD_FADE_MS = 500;

const ATTR_COLORS: Record<string, { border: string; bg: string; text: string; shadow: string }> = {
  attack:       { border: 'border-red-500',    bg: 'bg-red-950/60',    text: 'text-red-400',    shadow: '0 0 40px rgba(239,68,68,0.45)' },
  defense:      { border: 'border-blue-500',   bg: 'bg-blue-950/60',   text: 'text-blue-400',   shadow: '0 0 40px rgba(59,130,246,0.45)' },
  heal:         { border: 'border-green-500',  bg: 'bg-green-950/60',  text: 'text-green-400',  shadow: '0 0 40px rgba(34,197,94,0.45)' },
  investigate:  { border: 'border-purple-500', bg: 'bg-purple-950/60', text: 'text-purple-400', shadow: '0 0 40px rgba(168,85,247,0.45)' },
  political:    { border: 'border-yellow-500', bg: 'bg-yellow-950/60', text: 'text-yellow-400', shadow: '0 0 40px rgba(234,179,8,0.45)' },
  distribution: { border: 'border-cyan-500',   bg: 'bg-cyan-950/60',   text: 'text-cyan-400',   shadow: '0 0 40px rgba(6,182,212,0.45)' },
  sabotage:     { border: 'border-orange-500', bg: 'bg-orange-950/60', text: 'text-orange-400', shadow: '0 0 40px rgba(249,115,22,0.45)' },
};

const ATTR_LABELS: Record<string, string> = {
  attack: '攻撃',
  defense: '防御',
  heal: '回復',
  investigate: '調査',
  political: '政治',
  distribution: '流通',
  sabotage: '妨害',
};

const ATTR_ICONS: Record<string, string> = {
  attack: '⚔️',
  defense: '🛡️',
  heal: '💊',
  investigate: '🔮',
  political: '🗳️',
  distribution: '📦',
  sabotage: '🎭',
};

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function CardShowcase() {
  const queueRef = useRef<CardId[]>(shuffleArray(ALL_CARD_IDS));
  const [cardIndex, setCardIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCardIndex((prev) => {
          const next = prev + 1;
          if (next >= queueRef.current.length) {
            queueRef.current = shuffleArray(ALL_CARD_IDS);
            return 0;
          }
          return next;
        });
        setVisible(true);
      }, CARD_FADE_MS);
    }, CARD_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const cardId = queueRef.current[cardIndex];
  const def = CARD_DEFINITIONS[cardId];
  if (!def) return null;

  const mainAttr = def.attribute[0];
  const c = ATTR_COLORS[mainAttr] ?? ATTR_COLORS.attack;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <span className="text-xs tracking-[0.3em] text-gray-500 uppercase">カード紹介</span>

      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
          transition: `opacity ${CARD_FADE_MS}ms ease, transform ${CARD_FADE_MS}ms ease`,
          boxShadow: visible ? c.shadow : 'none',
        }}
        className={`w-44 rounded-2xl border-2 flex flex-col items-center gap-2 overflow-hidden ${c.border} ${c.bg}`}
      >
        <div className="w-full h-36 flex items-center justify-center bg-black/30 border-b border-white/10 text-6xl">
          {ATTR_ICONS[mainAttr] ?? '🃏'}
        </div>

        <div className="w-full px-4 pb-4 flex flex-col items-center gap-2">
          <div className="font-bold text-lg text-center text-white leading-tight">{def.name}</div>

          <div className="flex flex-wrap gap-1 justify-center">
            {def.attribute.map((a) => (
              <span
                key={a}
                className={`text-xs px-2 py-0.5 rounded-full border ${c.border} ${c.text} bg-black/20`}
              >
                {ATTR_LABELS[a]}
              </span>
            ))}
          </div>

          <div className="w-full h-px bg-white/10" />
          <div className="text-xs text-gray-300 text-center leading-relaxed">{def.description}</div>
          <span
            className={`text-xs px-2 py-0.5 rounded border font-bold ${
              def.rarity === 'UR'
                ? 'border-wolf-gold text-wolf-gold bg-yellow-900/20'
                : def.rarity === 'R'
                ? 'border-purple-400 text-purple-400 bg-purple-900/20'
                : 'border-gray-600 text-gray-500'
            }`}
          >
            {def.rarity}
          </span>
        </div>
      </div>

      <div className="flex gap-1">
        {queueRef.current.map((id, i) => (
          <div
            key={`${id}-${i}`}
            className={`rounded-full transition-all duration-300 ${
              i === cardIndex ? 'w-4 h-1.5 bg-wolf-accent' : 'w-1.5 h-1.5 bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
