export type GameErrorCode =
  | 'NOT_YOUR_TURN'
  | 'TILE_NOT_IN_HAND'
  | 'ILLEGAL_MOVE'
  | 'CANNOT_DRAW_IN_TEAM_MODE'
  | 'CANNOT_PASS_WHEN_MOVE_EXISTS'
  | 'CANNOT_DRAW_WHEN_MOVE_EXISTS'
  | 'BONEYARD_EMPTY'
  | 'INVALID_TARGET_END'
  | 'INVALID_SEAT'
  | 'INVALID_PHASE'
  | 'GAME_ALREADY_FINISHED'
  | 'STALE_STATE'
  | 'ROOM_FULL'
  | 'ROOM_NOT_FOUND'
  | 'SEAT_TAKEN'
  | 'PLAYER_NOT_FOUND'
  | 'ROUND_IN_PROGRESS'
  | 'UNAUTHORIZED_ACTION';

export class GameError extends Error {
  public readonly code: GameErrorCode;
  public readonly details?: unknown;

  constructor(code: GameErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.details = details;
  }
}
