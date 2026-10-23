import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- TYPES ---
export interface Player {
  id: string;
  name: string;
  dinoType: 'trex' | 'raptor' | 'tricera' | 'stego' | 'pterodactyl';
  colorHex: string;
  colorName: string;
  accessory: 'crown' | 'goggles' | 'bandana' | 'shades' | 'none';
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  score: number;
  distance: number;
  status: 'waiting' | 'playing' | 'dead';
  rank?: number;
  deathDistance?: number;
  xOffset?: number;
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

export const DINO_COLORS = [
  { id: 'emerald', name: 'Emerald Rex', hex: '#10b981', secondary: '#a7f3d0' },
  { id: 'amber', name: 'Amber Raptor', hex: '#f59e0b', secondary: '#fde68a' },
  { id: 'crimson', name: 'Magma Crimson', hex: '#ef4444', secondary: '#fecaca' },
  { id: 'cyan', name: 'Glacier Cyan', hex: '#06b6d4', secondary: '#cffafe' },
  { id: 'purple', name: 'Nebula Purple', hex: '#8b5cf6', secondary: '#ddd6fe' },
  { id: 'coral', name: 'Volcanic Coral', hex: '#f97316', secondary: '#fed7aa' },
  { id: 'pink', name: 'Bubblegum Rose', hex: '#ec4899', secondary: '#fbcfe8' },
  { id: 'lime', name: 'Prehistoric Lime', hex: '#84cc16', secondary: '#d9f99d' },
  { id: 'blue', name: 'Midnight Cobalt', hex: '#3b82f6', secondary: '#bfdbfe' },
  { id: 'gold', name: 'Golden Solar', hex: '#eab308', secondary: '#fef08a' }
];

function getAvailableColor(takenHexes: string[], preferredHex?: string) {
  const normalizedTaken = takenHexes.map(h => h.toLowerCase());
  if (preferredHex && !normalizedTaken.includes(preferredHex.toLowerCase())) {
    const found = DINO_COLORS.find(c => c.hex.toLowerCase() === preferredHex.toLowerCase());
    if (found) return found;
  }
  const available = DINO_COLORS.find(c => !normalizedTaken.includes(c.hex.toLowerCase()));
  if (available) return available;
  return DINO_COLORS[takenHexes.length % DINO_COLORS.length];
}

// In-memory Server State
const rooms = new Map<string, Room>();
// Map of roomCode -> Set of WebSocket clients
const roomClients = new Map<string, Set<WebSocket>>();
// Map of roomCode -> Set of Express SSE responses
const roomSSEResponses = new Map<string, Set<express.Response>>();
// Map WebSocket -> { roomCode, playerId }
const clientMetadata = new Map<WebSocket, { roomCode: string; playerId: string }>();
// Map of playerId -> Disconnect Grace Timeout
const disconnectTimers = new Map<string, NodeJS.Timeout>();
// Map of roomCode -> Bot Simulation Interval
const roomBotIntervals = new Map<string, NodeJS.Timeout>();

function broadcastRoom(room: Room, excludeWs?: WebSocket) {
  const payload = JSON.stringify({ type: 'ROOM_SYNC_RESPONSE', room });

  // 1. WebSocket Broadcast
  const clients = roomClients.get(room.code);
  if (clients) {
    for (const ws of clients) {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {
          // ignore dead socket
        }
      }
    }
  }

  // 2. Server-Sent Events Broadcast
  const sseSet = roomSSEResponses.get(room.code);
  if (sseSet) {
    const sseData = `data: ${payload}\n\n`;
    for (const res of sseSet) {
      try {
        res.write(sseData);
      } catch {
        sseSet.delete(res);
      }
    }
  }
}

function stopRoomBots(roomCode: string) {
  const existing = roomBotIntervals.get(roomCode);
  if (existing) {
    clearInterval(existing);
    roomBotIntervals.delete(roomCode);
  }
}

function startRoomBots(room: Room) {
  stopRoomBots(room.code);

  const botInterval = setInterval(() => {
    const r = rooms.get(room.code);
    if (!r || r.status !== 'playing') {
      stopRoomBots(room.code);
      return;
    }

    const bots = r.players.filter(p => p.isBot && p.status === 'playing');
    if (bots.length === 0) return;

    let updated = false;
    for (const bot of bots) {
      bot.distance += 4.5 + Math.random() * 1.5;
      bot.score = Math.floor(bot.distance);

      if (!bot.y || bot.y === 0) {
        if (Math.random() < 0.05) {
          bot.y = 80;
          bot.isDucking = false;
        } else if (Math.random() < 0.03) {
          bot.isDucking = true;
        } else {
          bot.isDucking = false;
        }
      } else {
        bot.y = Math.max(0, bot.y - 12);
      }

      const deathChance = 0.0005 + (bot.distance / 90000);
      if (bot.distance > 350 && Math.random() < deathChance) {
        bot.status = 'dead';
        bot.deathDistance = bot.distance;
        updated = true;
      }
    }

    // Calculate live ranks
    const sorted = [...r.players].sort((a, b) => (b.distance || 0) - (a.distance || 0));
    sorted.forEach((p, idx) => {
      const match = r.players.find(x => x.id === p.id);
      if (match) match.rank = idx + 1;
    });

    // Check if all players are dead
    const allDead = r.players.every(p => p.status === 'dead');
    if (allDead) {
      r.status = 'gameover';
      stopRoomBots(r.code);
      broadcastRoom(r);
      return;
    }

    broadcastRoom(r);
  }, 90);

  roomBotIntervals.set(room.code, botInterval);
}

function broadcastRoomNotification(roomCode: string, message: string, targetPlayerId?: string | null) {
  const payload = JSON.stringify({
    type: 'ROOM_NOTIFICATION',
    targetPlayerId: targetPlayerId || null,
    message
  });

  const clients = roomClients.get(roomCode);
  if (clients) {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {}
      }
    }
  }

  const sseSet = roomSSEResponses.get(roomCode);
  if (sseSet) {
    const sseData = `data: ${payload}\n\n`;
    for (const res of sseSet) {
      try {
        res.write(sseData);
      } catch {
        sseSet.delete(res);
      }
    }
  }
}

function transferRoomOwnership(room: Room, departingOwnerId: string): Player | null {
  room.players = room.players.filter(p => p.id !== departingOwnerId);

  if (room.players.length === 0) {
    stopRoomBots(room.code);
    rooms.delete(room.code);
    roomClients.delete(room.code);
    return null;
  }

  // Consistent Policy:
  // 1. Next human player (non-bot) in chronological join order
  // 2. If no humans remain, first bot
  let newOwner = room.players.find(p => !p.isBot);
  if (!newOwner) {
    newOwner = room.players[0];
  }

  room.hostId = newOwner.id;
  room.hostName = newOwner.name;

  // Set isHost strictly on the new owner and false on all others
  room.players.forEach(p => {
    p.isHost = (p.id === newOwner!.id);
  });

  return newOwner;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.use(express.json());

  // --- REST API ENDPOINTS ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', activeRooms: rooms.size });
  });

  // Get Room Details
  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({ room });
  });

  // Create Room
  app.post('/api/rooms', (req, res) => {
    const { name, player } = req.body;
    if (!player || !player.id) {
      res.status(400).json({ error: 'Invalid player data' });
      return;
    }

    // Generate unique 6-character code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (rooms.has(code));

    const safeColor = getAvailableColor([], player.colorHex);
    const host: Player = {
      ...player,
      colorHex: safeColor.hex,
      colorName: safeColor.name,
      isHost: true,
      isReady: true,
      score: 0,
      distance: 0,
      status: 'waiting',
      xOffset: 0
    };

    const newRoom: Room = {
      code,
      name: name?.trim() || `Dino Cup #${code}`,
      hostId: host.id,
      hostName: host.name,
      players: [host],
      status: 'lobby',
      seed: Math.floor(Math.random() * 1000000),
      createdAt: Date.now()
    };

    rooms.set(code, newRoom);
    broadcastRoom(newRoom);
    res.json({ success: true, room: newRoom });
  });

  // Join Room
  app.post('/api/rooms/:code/join', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { player } = req.body;
    if (!player || !player.id) {
      res.status(400).json({ error: 'Invalid player' });
      return;
    }

    let room = rooms.get(code);
    if (!room) {
      // Auto-provision if room code given by user
      const safeColor = getAvailableColor([], player.colorHex);
      room = {
        code,
        name: `Dino Track #${code}`,
        hostId: player.id,
        hostName: player.name,
        players: [{
          ...player,
          colorHex: safeColor.hex,
          colorName: safeColor.name,
          isHost: true,
          isReady: true,
          score: 0,
          distance: 0,
          status: 'waiting',
          xOffset: 0
        }],
        status: 'lobby',
        seed: Math.floor(Math.random() * 1000000),
        createdAt: Date.now()
      };
      rooms.set(code, room);
      broadcastRoom(room);
      res.json({ success: true, room });
      return;
    }

    // Check if player already in room
    const existingIdx = room.players.findIndex(p => p.id === player.id);
    if (existingIdx >= 0) {
      // Refresh details but preserve valid color
      const current = room.players[existingIdx];
      room.players[existingIdx] = {
        ...current,
        name: player.name || current.name,
        dinoType: player.dinoType || current.dinoType,
        accessory: player.accessory || current.accessory
      };
      broadcastRoom(room);
      res.json({ success: true, room });
      return;
    }

    // Assign strictly unique color that is not currently occupied
    const takenHexes = room.players.map(p => p.colorHex);
    const safeColor = getAvailableColor(takenHexes, player.colorHex);

    const newPlayer: Player = {
      ...player,
      colorHex: safeColor.hex,
      colorName: safeColor.name,
      isHost: false,
      isReady: true,
      score: 0,
      distance: 0,
      status: 'waiting',
      xOffset: (room.players.length % 4) * -22
    };

    room.players.push(newPlayer);
    broadcastRoom(room);
    res.json({ success: true, room, assignedColor: safeColor });
  });

  // Server-Authoritative Atomic Color Reservation
  app.post('/api/rooms/:code/color', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { playerId, colorHex } = req.body;

    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ success: false, error: 'Room not found' });
      return;
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      res.status(404).json({ success: false, error: 'Player not in room' });
      return;
    }

    const colorInfo = DINO_COLORS.find(c => c.hex.toLowerCase() === colorHex.toLowerCase());
    if (!colorInfo) {
      res.status(400).json({ success: false, error: 'Invalid color hex' });
      return;
    }

    // ATOMIC RESERVATION CHECK:
    // Check if another player in this room already holds this color
    const occupyingPlayer = room.players.find(
      p => p.id !== playerId && p.colorHex.toLowerCase() === colorHex.toLowerCase()
    );

    if (occupyingPlayer) {
      // SIMULTANEOUS / CONFLICT: REJECT and notify player
      res.status(409).json({
        success: false,
        error: `Color ${colorInfo.name} is already occupied by ${occupyingPlayer.name}!`,
        occupiedBy: occupyingPlayer.name
      });
      return;
    }

    // Color is free: RESERVE for this player
    player.colorHex = colorInfo.hex;
    player.colorName = colorInfo.name;

    // Broadcast updated state to all connected clients immediately
    broadcastRoom(room);

    res.json({
      success: true,
      colorHex: colorInfo.hex,
      colorName: colorInfo.name,
      room
    });
  });

  // Update Player Details (Name, Dino Species, Accessory, Status)
  app.post('/api/rooms/:code/player', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { player } = req.body;

    const room = rooms.get(code);
    if (!room || !player) {
      res.status(404).json({ error: 'Room or player not found' });
      return;
    }

    const idx = room.players.findIndex(p => p.id === player.id);
    if (idx >= 0) {
      room.players[idx] = {
        ...room.players[idx],
        name: player.name || room.players[idx].name,
        dinoType: player.dinoType || room.players[idx].dinoType,
        accessory: player.accessory || room.players[idx].accessory,
        status: player.status || room.players[idx].status,
        isReady: typeof player.isReady === 'boolean' ? player.isReady : room.players[idx].isReady
      };
      broadcastRoom(room);
      res.json({ success: true, room });
    } else {
      res.status(404).json({ error: 'Player not found in room' });
    }
  });

  // Leave Room (releases color immediately and transfers ownership if host left)
  app.post('/api/rooms/:code/leave', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { playerId } = req.body;

    const room = rooms.get(code);
    if (!room) {
      res.json({ success: true });
      return;
    }

    if (room.hostId === playerId) {
      const newOwner = transferRoomOwnership(room, playerId);
      if (newOwner) {
        broadcastRoom(room);
        broadcastRoomNotification(room.code, `Room host left. Ownership transferred to ${newOwner.name}!`);
      }
    } else {
      room.players = room.players.filter(p => p.id !== playerId);
      if (room.players.length === 0) {
        rooms.delete(code);
        roomClients.delete(code);
      } else {
        broadcastRoom(room);
      }
    }

    res.json({ success: true });
  });

  // Add Computer Dino (with unique non-repeated color)
  app.post('/api/rooms/:code/bot', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.players.length >= 8) {
      res.status(400).json({ error: 'Room is full' });
      return;
    }

    const existingBots = room.players.filter(p => p.isBot);
    const botIndex = existingBots.length;
    const botNumber = botIndex + 1;

    const dinoTypes: Player['dinoType'][] = ['raptor', 'tricera', 'stego', 'pterodactyl', 'trex'];
    const botDinoType = dinoTypes[botIndex % dinoTypes.length];

    const takenHexes = room.players.map(p => p.colorHex);
    const botColor = getAvailableColor(takenHexes);

    const botAccessories: Player['accessory'][] = ['crown', 'shades', 'goggles', 'bandana', 'none'];
    const botAccessory = botAccessories[botIndex % botAccessories.length];

    const botPlayer: Player = {
      id: `bot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: `Computer Dino ${botNumber}`,
      dinoType: botDinoType,
      colorHex: botColor.hex,
      colorName: botColor.name,
      accessory: botAccessory,
      isHost: false,
      isReady: true,
      isBot: true,
      score: 0,
      distance: 0,
      status: 'waiting',
      xOffset: (room.players.length % 4) * -22
    };

    room.players.push(botPlayer);
    broadcastRoom(room);
    res.json({ success: true, room, bot: botPlayer });
  });

  // Remove Computer Dino (releases color)
  app.post('/api/rooms/:code/remove-bot', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { botId } = req.body;
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    room.players = room.players.filter(p => p.id !== botId);
    broadcastRoom(room);
    res.json({ success: true, room });
  });

  // Start Game (owner only)
  app.post('/api/rooms/:code/start', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { playerId } = req.body;
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== playerId) {
      res.status(403).json({ error: 'Only the room owner can start the game' });
      return;
    }

    room.status = 'playing';
    room.seed = Math.floor(Math.random() * 1000000);
    room.startedAt = Date.now();
    room.players.forEach(p => {
      p.status = 'playing';
      p.distance = 0;
      p.score = 0;
      p.rank = undefined;
      p.deathDistance = undefined;
    });

    startRoomBots(room);
    broadcastRoom(room);
    broadcastRoomNotification(room.code, `The room owner ${room.hostName} started the race!`);
    res.json({ success: true, room });
  });

  // Restart Game (owner only)
  app.post('/api/rooms/:code/restart', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { playerId } = req.body;
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (room.hostId !== playerId) {
      res.status(403).json({ error: 'Only owner can restart the game' });
      return;
    }

    stopRoomBots(code);
    room.status = 'lobby';
    room.seed = Math.floor(Math.random() * 1000000);
    room.players.forEach(p => {
      p.status = 'waiting';
      p.distance = 0;
      p.score = 0;
      p.rank = undefined;
      p.deathDistance = undefined;
    });

    broadcastRoom(room);
    res.json({ success: true, room });
  });

  // Player Died REST Endpoint
  app.post('/api/rooms/:code/death', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const { playerId, distance, score } = req.body;
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const p = room.players.find(x => x.id === playerId);
    if (p) {
      p.status = 'dead';
      p.distance = distance;
      p.score = score;
      p.deathDistance = distance;

      const allDead = room.players.every(pl => pl.status === 'dead');
      if (allDead) {
        room.status = 'gameover';
        stopRoomBots(code);
      }
      broadcastRoom(room);
    }
    res.json({ success: true, room });
  });

  // Server-Sent Events (SSE) Stream for room updates
  app.get('/api/rooms/:code/events', (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!roomSSEResponses.has(code)) {
      roomSSEResponses.set(code, new Set());
    }
    const sseSet = roomSSEResponses.get(code)!;
    sseSet.add(res);

    // Send initial room state if exists
    const room = rooms.get(code);
    if (room) {
      res.write(`data: ${JSON.stringify({ type: 'ROOM_SYNC_RESPONSE', room })}\n\n`);
    }

    req.on('close', () => {
      sseSet.delete(res);
    });
  });

  // --- WEBSOCKET HANDLING ---
  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data: Buffer | string) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'SUBSCRIBE_ROOM') {
          const roomCode = msg.roomCode?.trim().toUpperCase();
          const playerId = msg.playerId;
          if (roomCode) {
            if (!roomClients.has(roomCode)) {
              roomClients.set(roomCode, new Set());
            }
            roomClients.get(roomCode)!.add(ws);
            clientMetadata.set(ws, { roomCode, playerId });

            // Cancel any pending disconnect grace timer for this player
            if (playerId && disconnectTimers.has(playerId)) {
              clearTimeout(disconnectTimers.get(playerId)!);
              disconnectTimers.delete(playerId);
            }

            // Send immediate room state
            const room = rooms.get(roomCode);
            if (room) {
              ws.send(JSON.stringify({ type: 'ROOM_SYNC_RESPONSE', room }));
            }
          }
        } else if (msg.type === 'SELECT_COLOR') {
          const { roomCode, playerId, colorHex } = msg;
          const cleanCode = roomCode?.trim().toUpperCase();
          const room = rooms.get(cleanCode);
          if (room) {
            const player = room.players.find(p => p.id === playerId);
            const colorInfo = DINO_COLORS.find(c => c.hex.toLowerCase() === colorHex?.toLowerCase());

            if (player && colorInfo) {
              const occupying = room.players.find(
                p => p.id !== playerId && p.colorHex.toLowerCase() === colorHex.toLowerCase()
              );

              if (occupying) {
                // Reject color reservation and notify this player
                ws.send(JSON.stringify({
                  type: 'COLOR_REJECTED',
                  playerId,
                  colorHex,
                  colorName: colorInfo.name,
                  message: `Color ${colorInfo.name} is already occupied by ${occupying.name}!`
                }));
              } else {
                // Reserve color
                player.colorHex = colorInfo.hex;
                player.colorName = colorInfo.name;
                broadcastRoom(room);
              }
            }
          }
        } else if (msg.type === 'PLAYER_UPDATED') {
          const { roomCode, player } = msg;
          const cleanCode = roomCode?.trim().toUpperCase();
          const room = rooms.get(cleanCode);
          if (room && player) {
            const idx = room.players.findIndex(p => p.id === player.id);
            if (idx >= 0) {
              room.players[idx] = { ...room.players[idx], ...player };
              broadcastRoom(room);
            }
          }
        } else if (msg.type === 'PLAYER_ACTION') {
          const { roomCode, playerId, y, isDucking, distance, score } = msg;
          const cleanCode = roomCode?.trim().toUpperCase();
          const room = rooms.get(cleanCode);
          if (room) {
            const p = room.players.find(x => x.id === playerId);
            if (p && p.status === 'playing') {
              p.y = y;
              p.isDucking = isDucking;
              p.distance = distance;
              p.score = score;
            }
            // Broadcast live coords to other clients in room
            const clients = roomClients.get(cleanCode);
            if (clients) {
              const payload = JSON.stringify(msg);
              for (const c of clients) {
                if (c !== ws && c.readyState === WebSocket.OPEN) {
                  c.send(payload);
                }
              }
            }
          }
        } else if (msg.type === 'PLAYER_DIED') {
          const { roomCode, playerId, distance, score } = msg;
          const cleanCode = roomCode?.trim().toUpperCase();
          const room = rooms.get(cleanCode);
          if (room) {
            const p = room.players.find(x => x.id === playerId);
            if (p) {
              p.status = 'dead';
              p.distance = distance;
              p.score = score;
              p.deathDistance = distance;

              const allDead = room.players.every(pl => pl.status === 'dead');
              if (allDead) {
                room.status = 'gameover';
                stopRoomBots(cleanCode);
              }
            }
            broadcastRoom(room);
          }
        } else if (msg.type === 'START_GAME') {
          const { roomCode, playerId } = msg;
          const cleanCode = roomCode?.trim().toUpperCase();
          const room = rooms.get(cleanCode);
          if (room) {
            if (room.hostId !== playerId) {
              // Reject: non-owner cannot start game
              ws.send(JSON.stringify({
                type: 'ROOM_NOTIFICATION',
                targetPlayerId: playerId,
                message: 'Only the room owner can start the game!'
              }));
            } else {
              room.status = 'playing';
              room.seed = Math.floor(Math.random() * 1000000);
              room.startedAt = Date.now();
              room.players.forEach(p => {
                p.status = 'playing';
                p.distance = 0;
                p.score = 0;
                p.rank = undefined;
                p.deathDistance = undefined;
              });
              startRoomBots(room);
              broadcastRoom(room);
              broadcastRoomNotification(room.code, `The room owner ${room.hostName} started the race!`);
            }
          }
        }
      } catch {
        // parse error
      }
    });

    ws.on('close', () => {
      const meta = clientMetadata.get(ws);
      if (meta) {
        const { roomCode, playerId } = meta;
        const clients = roomClients.get(roomCode);
        if (clients) {
          clients.delete(ws);
        }
        clientMetadata.delete(ws);

        if (!playerId) return;

        // Disconnect grace period: wait 6 seconds before removing player
        if (disconnectTimers.has(playerId)) {
          clearTimeout(disconnectTimers.get(playerId)!);
        }

        const timer = setTimeout(() => {
          disconnectTimers.delete(playerId);
          const room = rooms.get(roomCode);
          if (room) {
            const leavingPlayer = room.players.find(p => p.id === playerId);
            if (leavingPlayer) {
              if (room.hostId === playerId) {
                const newOwner = transferRoomOwnership(room, playerId);
                if (newOwner) {
                  broadcastRoom(room);
                  broadcastRoomNotification(room.code, `Room host disconnected. Ownership transferred to ${newOwner.name}!`);
                }
              } else {
                room.players = room.players.filter(p => p.id !== playerId);
                if (room.players.length === 0) {
                  stopRoomBots(roomCode);
                  rooms.delete(roomCode);
                  roomClients.delete(roomCode);
                } else {
                  broadcastRoom(room);
                }
              }
            }
          }
        }, 6000);

        disconnectTimers.set(playerId, timer);
      }
    });
  });

  // --- VITE MIDDLEWARES / STATIC SERVING ---
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
