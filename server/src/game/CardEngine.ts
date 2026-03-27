import {
  CardId,
  CardInstance,
  CARD_WEIGHTS,
  CARD_DEFINITIONS,
  CardDefinition,
} from '../../../shared/types.js';
import { randomUUID } from 'crypto';

// Build weighted pool for random draws
function buildWeightedPool(enabledCards?: Record<CardId, boolean>): CardId[] {
  const pool: CardId[] = [];
  for (const [cardId, weight] of Object.entries(CARD_WEIGHTS)) {
    if (enabledCards && enabledCards[cardId as CardId] === false) continue;
    for (let i = 0; i < weight; i++) {
      pool.push(cardId as CardId);
    }
  }
  return pool;
}

const defaultWeightedPool = buildWeightedPool();

export function drawCards(count: number, enabledCards?: Record<CardId, boolean>): CardDefinition[] {
  const pool = enabledCards ? buildWeightedPool(enabledCards) : defaultWeightedPool;
  // Fallback to full pool if all cards are disabled
  const activePool = pool.length > 0 ? pool : defaultWeightedPool;

  const drawn: CardDefinition[] = [];
  const usedIndices = new Set<number>();

  // Try to draw unique pool-slot cards first
  while (drawn.length < count && usedIndices.size < activePool.length) {
    const idx = Math.floor(Math.random() * activePool.length);
    // Allow duplicate card types but not the exact same pool index
    if (usedIndices.has(idx)) continue;
    usedIndices.add(idx);
    drawn.push(CARD_DEFINITIONS[activePool[idx]]);
  }

  // If pool was smaller than count, fill remainder with random picks (duplicates ok)
  while (drawn.length < count) {
    const idx = Math.floor(Math.random() * activePool.length);
    drawn.push(CARD_DEFINITIONS[activePool[idx]]);
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

export function drawRandomCardInstance(enabledCards?: Record<CardId, boolean>): CardInstance {
  const pool = enabledCards ? buildWeightedPool(enabledCards) : defaultWeightedPool;
  const activePool = pool.length > 0 ? pool : defaultWeightedPool;
  const idx = Math.floor(Math.random() * activePool.length);
  return createCardInstance(activePool[idx]);
}
