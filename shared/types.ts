// ===== Card System =====

export type CardId =
  | 'KILL'
  | 'KNIGHT'
  | 'DOCTOR'
  | 'ORACLE'
  | 'ELITE'
  | 'ELECTION'
  | 'TRANSFER'
  | 'FORGERY'
  | 'GREED';

export type CardAttribute =
  | 'attack'
  | 'defense'
  | 'heal'
  | 'investigate'
  | 'political'
  | 'distribution'
  | 'sabotage';

export interface CardDefinition {
  id: CardId;
  name: string;
  nameEn: string;
  attribute: CardAttribute[];
  rarity: 'N' | 'R' | 'UR';
  targetType: 'player' | 'self' | 'none';
  description: string;
}

export interface CardInstance {
  instanceId: string;
  cardId: CardId;
  isDisabled: boolean;
}

export const CARD_WEIGHTS: Record<CardId, number> = {
  KILL: 7,
  KNIGHT: 3,
  DOCTOR: 3,
  ORACLE: 3,
  ELITE: 2,
  ELECTION: 2,
  TRANSFER: 2,
  FORGERY: 1,
  GREED: 2,
};

export const CARD_DEFINITIONS: Record<CardId, CardDefinition> = {
  KILL: {
    id: 'KILL',
    name: '殺害',
    nameEn: 'Kill',
    attribute: ['attack'],
    rarity: 'N',
    targetType: 'player',
    description: '対象のHPを1減らす',
  },
  KNIGHT: {
    id: 'KNIGHT',
    name: '騎士',
    nameEn: 'Knight',
    attribute: ['defense'],
    rarity: 'N',
    targetType: 'player',
    description: '対象をその夜の殺害から保護する',
  },
  DOCTOR: {
    id: 'DOCTOR',
    name: '医者',
    nameEn: 'Doctor',
    attribute: ['heal'],
    rarity: 'N',
    targetType: 'player',
    description: '対象のHPを1回復する（上限突破可、2日間）',
  },
  ORACLE: {
    id: 'ORACLE',
    name: '占い',
    nameEn: 'Oracle',
    attribute: ['investigate'],
    rarity: 'N',
    targetType: 'player',
    description: '対象の陣営を判別する',
  },
  ELITE: {
    id: 'ELITE',
    name: '上級国民',
    nameEn: 'Elite',
    attribute: ['political'],
    rarity: 'N',
    targetType: 'self',
    description: '翌昼の自分の投票権を+1する',
  },
  ELECTION: {
    id: 'ELECTION',
    name: '選挙干渉',
    nameEn: 'Election Rigging',
    attribute: ['political'],
    rarity: 'N',
    targetType: 'player',
    description: '対象の翌昼の投票権を無効化する',
  },
  TRANSFER: {
    id: 'TRANSFER',
    name: '譲渡',
    nameEn: 'Transfer',
    attribute: ['distribution'],
    rarity: 'N',
    targetType: 'player',
    description: '自分の手札1枚を対象に渡す',
  },
  FORGERY: {
    id: 'FORGERY',
    name: '偽札',
    nameEn: 'Forgery',
    attribute: ['sabotage'],
    rarity: 'N',
    targetType: 'player',
    description: '譲渡に見せかけてカードを無効化する',
  },
  GREED: {
    id: 'GREED',
    name: '強欲な壺',
    nameEn: 'Pot of Greed',
    attribute: ['distribution'],
    rarity: 'N',
    targetType: 'self',
    description: 'ランダムにカードを2枚手札に加える',
  },
};

// ===== Game State =====

export type Faction = 'citizen' | 'werewolf';
export type Phase =
  | 'LOBBY'
  | 'NIGHT_BUILD'
  | 'NIGHT_ACTION'
  | 'MORNING_RESOLVE'
  | 'DAY_DISCUSSION'
  | 'DAY_VOTE'
  | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  avatarUrl: string;
  hp: number;
  maxHp: number;
  faction: Faction;
  stack: CardInstance[];
  voteWeight: number;
  isAlive: boolean;
  tempHpBoostExpiry?: number;
}

export interface GameLog {
  turn: number;
  phase: Phase;
  message: string;
  isPrivate: boolean;
  targetPlayerId?: string;
}

export interface GameState {
  roomId: string;
  phase: Phase;
  turn: number;
  players: Player[];
  logs: GameLog[];
  phaseDeadline: number;
}

// ===== Public / Private State =====

export interface PublicPlayer {
  id: string;
  name: string;
  avatarUrl: string;
  hp: number;
  isAlive: boolean;
  stackCount: number;
  voteWeight: number;
}

export interface PublicGameState {
  phase: Phase;
  turn: number;
  phaseDeadline: number;
  players: PublicPlayer[];
  logs: GameLog[];
}

export interface OracleResult {
  targetId: string;
  targetName: string;
  faction: Faction;
  turn: number;
}

export interface PrivatePlayerState {
  myPlayerId: string;
  faction: Faction;
  stack: CardInstance[];
  oracleResults: OracleResult[];
}

// ===== Socket Events =====

export interface MorningEvent {
  type: 'death' | 'protected' | 'healed' | 'info';
  message: string;
  playerId?: string;
}

export interface VoteResult {
  targetId: string;
  targetName: string;
  votes: number;
}

export interface WinResult {
  winner: Faction;
}

// ===== Action Types =====

export interface PlayerAction {
  playerId: string;
  cardInstanceId: string;
  cardId: CardId;
  targetId: string | null;
  // For TRANSFER: which card from stack to send
  transferCardInstanceId?: string;
}

// ===== Game Config =====

export interface GameConfig {
  werewolfCount: number | null; // null = auto (floor(players/3))
  enabledCards: Record<CardId, boolean>;
}

export function defaultGameConfig(): GameConfig {
  return {
    werewolfCount: null,
    enabledCards: Object.fromEntries(
      (Object.keys(CARD_DEFINITIONS) as CardId[]).map((k) => [k, true])
    ) as Record<CardId, boolean>,
  };
}

// ===== Constants =====

export const GAME_CONSTANTS = {
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 6,
  MAX_STACK_SIZE: 5,
  STARTING_HP: 2,
  STARTING_MAX_HP: 2,
  BUILD_CHOICES: 3,
  NIGHT_BUILD_TIME: 60_000,
  NIGHT_ACTION_TIME: 60_000,
  DAY_DISCUSSION_TIME: 90_000,
  DAY_VOTE_TIME: 30_000,
  MORNING_RESOLVE_TIME: 10_000,
  FACTION_REVEAL_TIME: 5_000,
  TEMP_HP_BOOST_DURATION: 2,
} as const;
