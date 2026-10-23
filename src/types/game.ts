export type DinoType = 'trex' | 'raptor' | 'tricera' | 'stego' | 'pterodactyl';

export type DinoAccessory = 'crown' | 'goggles' | 'bandana' | 'shades' | 'none';

export interface DinoColorInfo {
  id: string;
  name: string;
  hex: string;
  secondary: string; // belly / accent color
  eye: string;
}

export interface Player {
  id: string;
  name: string;
  dinoType: DinoType;
  colorHex: string;
  colorName: string;
  accessory: DinoAccessory;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  score: number;
  distance: number;
  status: 'waiting' | 'playing' | 'dead';
  rank?: number;
  deathDistance?: number;
  // Live multiplayer sync coords
  xOffset?: number; // small visual offset so dinos don't 100% overlap
  y?: number;
  isDucking?: boolean;
}

export interface Room {
  code: string;
  name: string;
  hostId: string;
  hostName: string;
  players: Player[];
  status: 'lobby' | 'starting' | 'playing' | 'gameover';
  seed: number;
  createdAt: number;
  startedAt?: number;
}

export type ObstacleType = 'cactus_small' | 'cactus_double' | 'cactus_triple' | 'pterodactyl_low' | 'pterodactyl_high' | 'rock';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  wingFrame?: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  soundVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  theme: 'auto' | 'day' | 'sunset' | 'night';
  scanlines: boolean;
}

export type ViewState = 
  | 'start_menu'
  | 'character_selection'
  | 'game_menu'
  | 'lobby'
  | 'game'
  | 'dead_leaderboard';
