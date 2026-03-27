import {
  Player,
  PlayerAction,
  MorningEvent,
  GameLog,
  CARD_DEFINITIONS,
  GAME_CONSTANTS,
  CardId,
} from '../../../shared/types.js';
import { drawRandomCardInstance } from './CardEngine.js';

interface ResolveResult {
  events: MorningEvent[];
  logs: GameLog[];
  oracleResults: Map<string, { targetId: string; targetName: string; faction: string }>;
}

export function resolveActions(
  players: Player[],
  actions: PlayerAction[],
  turn: number,
  enabledCards?: Record<CardId, boolean>
): ResolveResult {
  const events: MorningEvent[] = [];
  const logs: GameLog[] = [];
  const oracleResults = new Map<string, { targetId: string; targetName: string; faction: string }>();

  const playerMap = new Map(players.map((p) => [p.id, p]));
  const protectedPlayers = new Set<string>();
  const killTargets = new Map<string, string[]>(); // targetId -> attackerIds

  // Sort actions by priority
  const sorted = [...actions].sort((a, b) => getPriority(a.cardId) - getPriority(b.cardId));

  for (const action of sorted) {
    const actor = playerMap.get(action.playerId);
    if (!actor || !actor.isAlive) continue;

    // Remove used card from stack
    const cardIdx = actor.stack.findIndex((c) => c.instanceId === action.cardInstanceId);
    if (cardIdx === -1) continue;
    const usedCard = actor.stack[cardIdx];
    if (usedCard.isDisabled) {
      events.push({
        type: 'info',
        message: `${actor.name} のカードは無効化されていた`,
      });
      actor.stack.splice(cardIdx, 1);
      continue;
    }
    actor.stack.splice(cardIdx, 1);

    const target = action.targetId ? playerMap.get(action.targetId) : null;

    switch (action.cardId) {
      case 'TRANSFER': {
        if (!target || !target.isAlive) break;
        const transferIdx = actor.stack.findIndex(
          (c) => c.instanceId === action.transferCardInstanceId
        );
        if (transferIdx === -1) break;
        const transferCard = actor.stack.splice(transferIdx, 1)[0];
        if (target.stack.length < GAME_CONSTANTS.MAX_STACK_SIZE) {
          target.stack.push(transferCard);
          logs.push({
            turn,
            phase: 'NIGHT_ACTION',
            message: `${actor.name} が ${target.name} にカードを譲渡した`,
            isPrivate: false,
          });
        }
        break;
      }

      case 'FORGERY': {
        if (!target || !target.isAlive) break;
        // Disable a random card in target's hand
        const enabledCards = target.stack.filter((c) => !c.isDisabled);
        if (enabledCards.length > 0) {
          const randomCard = enabledCards[Math.floor(Math.random() * enabledCards.length)];
          randomCard.isDisabled = true;
          logs.push({
            turn,
            phase: 'NIGHT_ACTION',
            message: `${actor.name} が ${target.name} にカードを譲渡した`,
            isPrivate: false,
          });
        }
        break;
      }

      case 'KNIGHT': {
        if (!target) break;
        protectedPlayers.add(target.id);
        logs.push({
          turn,
          phase: 'NIGHT_ACTION',
          message: `誰かが護衛を行った`,
          isPrivate: false,
        });
        break;
      }

      case 'KILL': {
        if (!target) break;
        if (!killTargets.has(target.id)) {
          killTargets.set(target.id, []);
        }
        killTargets.get(target.id)!.push(actor.id);
        break;
      }

      case 'DOCTOR': {
        if (!target || !target.isAlive) break;
        target.hp += 1;
        if (target.hp > target.maxHp) {
          target.maxHp = target.hp;
          target.tempHpBoostExpiry = turn + GAME_CONSTANTS.TEMP_HP_BOOST_DURATION;
        }
        events.push({
          type: 'healed',
          message: `${target.name} は治療を受けた`,
          playerId: target.id,
        });
        break;
      }

      case 'ORACLE': {
        if (!target) break;
        oracleResults.set(actor.id, {
          targetId: target.id,
          targetName: target.name,
          faction: target.faction,
        });
        logs.push({
          turn,
          phase: 'NIGHT_ACTION',
          message: `誰かが占いを行った`,
          isPrivate: false,
        });
        break;
      }

      case 'ELECTION': {
        if (!target || !target.isAlive) break;
        target.voteWeight = 0;
        logs.push({
          turn,
          phase: 'NIGHT_ACTION',
          message: `選挙干渉が行われた`,
          isPrivate: false,
        });
        break;
      }

      case 'ELITE': {
        actor.voteWeight += 1;
        logs.push({
          turn,
          phase: 'NIGHT_ACTION',
          message: `誰かが政治力を行使した`,
          isPrivate: false,
        });
        break;
      }

      case 'GREED': {
        const cardsToAdd = 2;
        for (let i = 0; i < cardsToAdd; i++) {
          if (actor.stack.length < GAME_CONSTANTS.MAX_STACK_SIZE) {
            actor.stack.push(drawRandomCardInstance(enabledCards));
          }
        }
        logs.push({
          turn,
          phase: 'NIGHT_ACTION',
          message: `${actor.name} はカードを引いた`,
          isPrivate: false,
        });
        break;
      }
    }
  }

  // Resolve kills vs protection
  for (const [targetId, attackerIds] of killTargets) {
    const target = playerMap.get(targetId);
    if (!target) continue;

    if (protectedPlayers.has(targetId)) {
      events.push({
        type: 'protected',
        message: `${target.name} は護衛により守られた`,
        playerId: targetId,
      });
    } else {
      target.hp -= attackerIds.length;
      if (target.hp <= 0) {
        target.isAlive = false;
        events.push({
          type: 'death',
          message: `${target.name} は無残な姿で発見された`,
          playerId: targetId,
        });
      } else {
        events.push({
          type: 'info',
          message: `${target.name} は攻撃を受けたが生き延びた`,
          playerId: targetId,
        });
      }
    }
  }

  // Check temp HP boost expiry
  for (const player of players) {
    if (player.tempHpBoostExpiry && player.tempHpBoostExpiry <= turn) {
      if (player.hp > GAME_CONSTANTS.STARTING_MAX_HP) {
        player.hp = GAME_CONSTANTS.STARTING_MAX_HP;
      }
      player.maxHp = GAME_CONSTANTS.STARTING_MAX_HP;
      player.tempHpBoostExpiry = undefined;
    }
  }

  return { events, logs, oracleResults };
}

function getPriority(cardId: string): number {
  switch (cardId) {
    case 'TRANSFER':
    case 'FORGERY':
      return 1;
    case 'KNIGHT':
      return 2;
    case 'KILL':
    case 'DOCTOR':
      return 3;
    case 'ORACLE':
      return 4;
    case 'ELECTION':
    case 'ELITE':
      return 5;
    case 'GREED':
      return 6;
    default:
      return 99;
  }
}
