export const TILE_SIZE = 32;
export const TICK_RATE = 20; // server ticks per second
export const MAX_PLAYERS_PER_ROOM = 80;

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface InputMessage {
  seq: number;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export const MAP = {
  width: 96,
  height: 96
};

export enum Tile {
  Water = 0,
  Land = 1,
  Rock = 2
}
