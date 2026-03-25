import {
  CardId,
  CardInstance,
  CARD_WEIGHTS,
  CARD_DEFINITIONS,
  CardDefinition,
} from '../../../shared/types.js';
import { randomUUID } from 'crypto';

// Build weighted pool for random draws
function buildWeightedPool(): CardId[] {
  const pool: CardId[] = [];
  for (const [cardId, weight] of Object.entries(CARD_WEIGHTS)) {
    for (let i = 0; i < weight; i++) {
      pool.push(cardId as CardId);
    }
  }
  return pool;
}

const weightedPool = buildWeightedPool();

export function drawCards(count: number): CardDefinition[] {
  const drawn: CardDefinition[] = [];
  const usedIndices = new Set<number>();

  while (drawn.length < count) {
    const idx = Math.floor(Math.random() * weightedPool.length);
    // Allow duplicate card types but not the exact same pool index
    if (usedIndices.has(idx)) continue;
    usedIndices.add(idx);
    drawn.push(CARD_DEFINITIONS[weightedPool[idx]]);
  }

  return drawn;
}

export function createCardInstance(cardId: CardId): CardInstance {
  return {
    instanceId: randomUUID(),
    cardId,
    isDisabled: false,
  };
}

export function drawRandomCardInstance(): CardInstance {
  const idx = Math.floor(Math.random() * weightedPool.length);
  return createCardInstance(weightedPool[idx]);
}
