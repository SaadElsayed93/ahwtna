import type { BoardEnd } from './game.js';
import type { SeatIndex } from './player.js';
import type { TileId } from './tile.js';

export interface BaseCommand {
  readonly clientCommandId: string;
  readonly expectedStateVersion: number;
  readonly seat: SeatIndex;
}

export interface PlayTileCommand extends BaseCommand {
  readonly type: 'PLAY_TILE';
  readonly tileId: TileId;
  readonly targetEnd: BoardEnd;
}

export interface DrawTileCommand extends BaseCommand {
  readonly type: 'DRAW_TILE';
}

export interface PassCommand extends BaseCommand {
  readonly type: 'PASS';
}

export type GameCommand = PlayTileCommand | DrawTileCommand | PassCommand;
