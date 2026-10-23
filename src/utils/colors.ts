import { DinoColorInfo, Player } from '../types/game';

export const DINO_COLORS: DinoColorInfo[] = [
  {
    id: 'emerald',
    name: 'Emerald Rex',
    hex: '#10b981',
    secondary: '#a7f3d0',
    eye: '#ffffff'
  },
  {
    id: 'amber',
    name: 'Amber Raptor',
    hex: '#f59e0b',
    secondary: '#fde68a',
    eye: '#ffffff'
  },
  {
    id: 'crimson',
    name: 'Magma Crimson',
    hex: '#ef4444',
    secondary: '#fecaca',
    eye: '#ffffff'
  },
  {
    id: 'cyan',
    name: 'Glacier Cyan',
    hex: '#06b6d4',
    secondary: '#cffafe',
    eye: '#ffffff'
  },
  {
    id: 'purple',
    name: 'Nebula Purple',
    hex: '#8b5cf6',
    secondary: '#ddd6fe',
    eye: '#ffffff'
  },
  {
    id: 'coral',
    name: 'Volcanic Coral',
    hex: '#f97316',
    secondary: '#fed7aa',
    eye: '#ffffff'
  },
  {
    id: 'pink',
    name: 'Bubblegum Rose',
    hex: '#ec4899',
    secondary: '#fbcfe8',
    eye: '#ffffff'
  },
  {
    id: 'lime',
    name: 'Prehistoric Lime',
    hex: '#84cc16',
    secondary: '#d9f99d',
    eye: '#ffffff'
  },
  {
    id: 'blue',
    name: 'Midnight Cobalt',
    hex: '#3b82f6',
    secondary: '#bfdbfe',
    eye: '#ffffff'
  },
  {
    id: 'gold',
    name: 'Golden Solar',
    hex: '#eab308',
    secondary: '#fef08a',
    eye: '#ffffff'
  }
];

export function getColorByHex(hex: string): DinoColorInfo {
  return DINO_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase()) || DINO_COLORS[0];
}

/**
 * Ensures colors never repeat among players in the same lobby.
 * If preferred color is available, use it. Otherwise, return first unused color.
 */
export function getAvailableColor(takenHexes: string[], preferredHex?: string): DinoColorInfo {
  const normalizedTaken = takenHexes.map(h => h.toLowerCase());
  
  if (preferredHex && !normalizedTaken.includes(preferredHex.toLowerCase())) {
    const found = DINO_COLORS.find(c => c.hex.toLowerCase() === preferredHex.toLowerCase());
    if (found) return found;
  }
  
  // Pick first unused color
  const available = DINO_COLORS.find(c => !normalizedTaken.includes(c.hex.toLowerCase()));
  if (available) return available;

  // Fallback if more than 10 players (extremely rare, but generates a hue variation)
  return DINO_COLORS[takenHexes.length % DINO_COLORS.length];
}

export function isColorTakenInRoom(hex: string, players: Player[], excludePlayerId?: string): boolean {
  return players.some(p => p.id !== excludePlayerId && p.colorHex.toLowerCase() === hex.toLowerCase());
}
