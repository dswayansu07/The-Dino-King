import { Player, Room, DinoType, DinoAccessory } from '../types/game';
import { getAvailableColor, DINO_COLORS } from '../utils/colors';

const CHANNEL_NAME = 'the_dino_king_multiplayer_bus';
const STORAGE_ROOMS_KEY = 'dino_king_active_rooms';

type NetworkMessage =
  | { type: 'ROOM_CREATED'; room: Room }
  | { type: 'PLAYER_JOINED'; roomCode: string; player: Player }
  | { type: 'PLAYER_UPDATED'; roomCode: string; player: Player }
  | { type: 'PLAYER_LEFT'; roomCode: string; playerId: string }
  | { type: 'START_GAME'; roomCode: string; playerId: string }
  | { type: 'GAME_STARTED'; roomCode: string; seed: number; startTime: number }
  | { type: 'PLAYER_ACTION'; roomCode: string; playerId: string; y: number; isDucking: boolean; distance: number; score: number }
  | { type: 'PLAYER_DIED'; roomCode: string; playerId: string; distance: number; score: number }
  | { type: 'RESTART_GAME'; roomCode: string; seed: number }
  | { type: 'COLOR_REJECTED'; playerId: string; colorHex: string; colorName: string; message: string }
  | { type: 'ROOM_NOTIFICATION'; targetPlayerId?: string | null; message: string }
  | { type: 'ROOM_SYNC_REQUEST'; roomCode: string }
  | { type: 'ROOM_SYNC_RESPONSE'; room: Room };

class MultiplayerService {
  private channel: BroadcastChannel | null = null;
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private currentRoom: Room | null = null;
  private localPlayer: Player | null = null;
  private listeners: Set<(room: Room | null) => void> = new Set();
  private notificationListeners: Set<(message: string) => void> = new Set();
  private botInterval: number | null = null;

  constructor() {
    // 1. BroadcastChannel for fast local cross-tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => this.handleMessage(event.data);
      } catch {}
    }

    // 2. Storage event listener fallback
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_ROOMS_KEY && this.currentRoom) {
          const fresh = this.getStoredRoom(this.currentRoom.code);
          if (fresh) {
            this.currentRoom = fresh;
            this.notify();
          }
        }
      });

      // 3. Release color immediately if tab is closed/unloaded
      window.addEventListener('beforeunload', () => {
        if (this.currentRoom && this.localPlayer) {
          try {
            navigator.sendBeacon(
              `/api/rooms/${this.currentRoom.code}/leave`,
              JSON.stringify({ playerId: this.localPlayer.id })
            );
          } catch {}
          this.broadcast({
            type: 'PLAYER_LEFT',
            roomCode: this.currentRoom.code,
            playerId: this.localPlayer.id
          });
        }
      });
    }
  }

  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;

  // Connect to server WebSocket
  private connectWebSocket(roomCode: string) {
    if (typeof window === 'undefined') return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'SUBSCRIBE_ROOM',
            roomCode,
            playerId: this.localPlayer?.id
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch {}
      };

      this.ws.onerror = () => {
        this.connectSSE(roomCode);
      };

      this.ws.onclose = () => {
        // Auto-reconnect with exponential backoff if room active
        if (this.currentRoom && this.currentRoom.code === roomCode) {
          const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 5000);
          this.reconnectAttempts++;
          this.reconnectTimer = window.setTimeout(() => {
            this.connectWebSocket(roomCode);
          }, delay);
        }
      };
    } catch {
      this.connectSSE(roomCode);
    }
  }

  // Fallback Server-Sent Events (SSE)
  private connectSSE(roomCode: string) {
    if (typeof window === 'undefined' || !window.EventSource) return;
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    try {
      this.eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
      this.eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.handleMessage(data);
        } catch {}
      };
    } catch {}
  }

  // Subscribe to room updates
  subscribe(callback: (room: Room | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentRoom);
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Subscribe to error/conflict notifications
  onNotification(callback: (msg: string) => void): () => void {
    this.notificationListeners.add(callback);
    return () => {
      this.notificationListeners.delete(callback);
    };
  }

  private notify() {
    this.saveCurrentRoomToStorage();
    for (const cb of this.listeners) {
      cb(this.currentRoom ? { ...this.currentRoom } : null);
    }
  }

  private notifyError(message: string) {
    for (const cb of this.notificationListeners) {
      cb(message);
    }
  }

  private broadcast(msg: NetworkMessage) {
    // Send to local BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {}
    }

    // Send to server WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch {}
    }
  }

  private handleMessage(msg: NetworkMessage) {
    switch (msg.type) {
      case 'ROOM_SYNC_RESPONSE':
        if (msg.room) {
          // If viewing this room, apply authoritative server state
          if (!this.currentRoom || this.currentRoom.code === msg.room.code) {
            this.currentRoom = msg.room;

            // Sync local player if updated on server
            if (this.localPlayer) {
              const matched = msg.room.players.find(p => p.id === this.localPlayer!.id);
              if (matched) {
                this.localPlayer.colorHex = matched.colorHex;
                this.localPlayer.colorName = matched.colorName;
                this.localPlayer.isHost = matched.isHost;
              }
            }

            this.notify();
          }
        }
        break;

      case 'COLOR_REJECTED':
        if (this.localPlayer && msg.playerId === this.localPlayer.id) {
          this.notifyError(msg.message);
        }
        break;

      case 'ROOM_NOTIFICATION':
        // If targetPlayerId is empty/null, or matches local player ID, notify
        if (!msg.targetPlayerId || (this.localPlayer && msg.targetPlayerId === this.localPlayer.id)) {
          this.notifyError(msg.message);
        }
        break;

      case 'PLAYER_ACTION':
        if (this.currentRoom && this.currentRoom.code === msg.roomCode) {
          const p = this.currentRoom.players.find(x => x.id === msg.playerId);
          if (p && p.status === 'playing') {
            p.y = msg.y;
            p.isDucking = msg.isDucking;
            p.distance = msg.distance;
            p.score = msg.score;
            this.updateLiveRanks();
            this.notify();
          }
        }
        break;

      case 'PLAYER_DIED':
        if (this.currentRoom && this.currentRoom.code === msg.roomCode) {
          const p = this.currentRoom.players.find(x => x.id === msg.playerId);
          if (p) {
            p.status = 'dead';
            p.distance = msg.distance;
            p.score = msg.score;
            p.deathDistance = msg.distance;
            this.finalizeDeadLeaderboard();
            this.notify();
          }
        }
        break;

      case 'PLAYER_JOINED':
        if (this.currentRoom && this.currentRoom.code === msg.roomCode) {
          const exists = this.currentRoom.players.some(p => p.id === msg.player.id);
          if (!exists) {
            this.currentRoom.players.push(msg.player);
            this.notify();
          }
        }
        break;

      case 'PLAYER_LEFT':
        if (this.currentRoom && this.currentRoom.code === msg.roomCode) {
          // Release player's color immediately
          this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== msg.playerId);
          if (this.currentRoom.hostId === msg.playerId && this.currentRoom.players.length > 0) {
            // Consistent ownership transfer policy: earliest human player, or first bot
            let newOwner = this.currentRoom.players.find(p => !p.isBot);
            if (!newOwner) newOwner = this.currentRoom.players[0];
            this.currentRoom.hostId = newOwner.id;
            this.currentRoom.hostName = newOwner.name;
            this.currentRoom.players.forEach(p => {
              p.isHost = (p.id === newOwner!.id);
            });
            if (this.localPlayer && this.localPlayer.id === newOwner.id) {
              this.localPlayer.isHost = true;
            }
            this.notifyError(`Room owner left. ${newOwner.name} is now the host!`);
          }
          this.notify();
        }
        break;

      case 'GAME_STARTED':
        if (this.currentRoom && this.currentRoom.code === msg.roomCode) {
          this.currentRoom.status = 'playing';
          this.currentRoom.seed = msg.seed;
          this.currentRoom.startedAt = msg.startTime;
          this.currentRoom.players.forEach(p => {
            p.status = 'playing';
            p.distance = 0;
            p.score = 0;
          });
          this.startBotSimulation();
          this.notify();
        }
        break;

      case 'RESTART_GAME':
        if (this.currentRoom && this.currentRoom.code === msg.roomCode) {
          this.currentRoom.status = 'lobby';
          this.currentRoom.seed = msg.seed;
          this.currentRoom.players.forEach(p => {
            p.status = 'waiting';
            p.distance = 0;
            p.score = 0;
          });
          this.stopBotSimulation();
          this.notify();
        }
        break;
    }
  }

  // --- ROOM MANAGEMENT ---

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createRoom(roomName: string, hostPlayer: Player): Promise<Room> {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, player: hostPlayer })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentRoom = data.room;
        this.localPlayer = data.room.players[0];
        this.connectWebSocket(data.room.code);
        this.notify();
        return data.room;
      }
    } catch {}

    // Fallback if offline
    const code = this.generateRoomCode();
    const safeColor = getAvailableColor([], hostPlayer.colorHex);
    const verifiedHost: Player = {
      ...hostPlayer,
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
      name: roomName.trim() || `Dino Cup #${code}`,
      hostId: verifiedHost.id,
      hostName: verifiedHost.name,
      players: [verifiedHost],
      status: 'lobby',
      seed: Math.floor(Math.random() * 1000000),
      createdAt: Date.now()
    };

    this.currentRoom = newRoom;
    this.localPlayer = verifiedHost;
    this.saveRoomToRegistry(newRoom);
    this.connectWebSocket(code);
    this.broadcast({ type: 'ROOM_CREATED', room: newRoom });
    this.notify();
    return newRoom;
  }

  async joinRoom(code: string, joiningPlayer: Player): Promise<{ success: boolean; room?: Room; error?: string }> {
    const cleanCode = code.trim().toUpperCase();

    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: joiningPlayer })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentRoom = data.room;
        const me = data.room.players.find((p: Player) => p.id === joiningPlayer.id);
        if (me) {
          this.localPlayer = me;
        }
        this.connectWebSocket(cleanCode);
        this.notify();
        return { success: true, room: data.room };
      }
    } catch {}

    // Fallback if offline
    let targetRoom = this.getStoredRoom(cleanCode) || (this.currentRoom?.code === cleanCode ? this.currentRoom : null);
    if (!targetRoom) {
      const safeColor = getAvailableColor([], joiningPlayer.colorHex);
      const host: Player = {
        ...joiningPlayer,
        colorHex: safeColor.hex,
        colorName: safeColor.name,
        isHost: true,
        isReady: true,
        score: 0,
        distance: 0,
        status: 'waiting',
        xOffset: 0
      };
      targetRoom = {
        code: cleanCode,
        name: `Dino Track #${cleanCode}`,
        hostId: host.id,
        hostName: host.name,
        players: [host],
        status: 'lobby',
        seed: Math.floor(Math.random() * 1000000),
        createdAt: Date.now()
      };
    }

    const takenHexes = targetRoom.players.map(p => p.colorHex);
    const safeColor = getAvailableColor(takenHexes, joiningPlayer.colorHex);

    const verifiedPlayer: Player = {
      ...joiningPlayer,
      colorHex: safeColor.hex,
      colorName: safeColor.name,
      isHost: false,
      isReady: true,
      score: 0,
      distance: 0,
      status: 'waiting',
      xOffset: (targetRoom.players.length % 4) * -22
    };

    const existingIdx = targetRoom.players.findIndex(p => p.id === verifiedPlayer.id);
    if (existingIdx >= 0) {
      targetRoom.players[existingIdx] = verifiedPlayer;
    } else {
      targetRoom.players.push(verifiedPlayer);
    }

    this.currentRoom = targetRoom;
    this.localPlayer = verifiedPlayer;
    this.saveRoomToRegistry(targetRoom);
    this.connectWebSocket(cleanCode);
    this.broadcast({ type: 'PLAYER_JOINED', roomCode: cleanCode, player: verifiedPlayer });
    this.notify();

    return { success: true, room: targetRoom };
  }

  // --- SERVER-AUTHORITATIVE ATOMIC COLOR RESERVATION ---
  async updatePlayerColor(colorHex: string): Promise<{ success: boolean; error?: string }> {
    if (!this.currentRoom || !this.localPlayer) {
      return { success: false, error: 'Not in a room' };
    }

    const colorInfo = DINO_COLORS.find(c => c.hex.toLowerCase() === colorHex.toLowerCase());
    if (!colorInfo) {
      return { success: false, error: 'Invalid color' };
    }

    // 1. Client-Side Quick Check: Is color currently occupied in local view?
    const occupying = this.currentRoom.players.find(
      p => p.id !== this.localPlayer!.id && p.colorHex.toLowerCase() === colorHex.toLowerCase()
    );
    if (occupying) {
      const err = `Color ${colorInfo.name} is already occupied by ${occupying.name}!`;
      this.notifyError(err);
      return { success: false, error: err };
    }

    // 2. Server-Authoritative Atomic Reservation Request
    try {
      const res = await fetch(`/api/rooms/${this.currentRoom.code}/color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.localPlayer.id,
          colorHex: colorInfo.hex
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Race condition / simultaneous selection: someone else reserved it first!
        const err = data.error || `Color ${colorInfo.name} is already occupied!`;
        this.notifyError(err);
        return { success: false, error: err };
      }

      // Success: Server reserved the color
      this.localPlayer.colorHex = colorInfo.hex;
      this.localPlayer.colorName = colorInfo.name;
      this.currentRoom = data.room;
      this.notify();
      return { success: true };
    } catch {
      // Offline fallback: update locally and broadcast
      if (!this.currentRoom || !this.localPlayer) return { success: false, error: 'Room unavailable' };
      this.localPlayer.colorHex = colorInfo.hex;
      this.localPlayer.colorName = colorInfo.name;

      this.currentRoom.players = this.currentRoom.players.map(p =>
        p.id === this.localPlayer!.id ? { ...this.localPlayer! } : p
      );

      this.broadcast({
        type: 'PLAYER_UPDATED',
        roomCode: this.currentRoom.code,
        player: this.localPlayer
      });
      this.notify();
      return { success: true };
    }
  }

  updatePlayerDetails(name: string, dinoType: DinoType, accessory: DinoAccessory) {
    if (!this.localPlayer) return;
    this.localPlayer.name = name.trim() || this.localPlayer.name;
    this.localPlayer.dinoType = dinoType;
    this.localPlayer.accessory = accessory;

    if (this.currentRoom) {
      this.currentRoom.players = this.currentRoom.players.map(p => 
        p.id === this.localPlayer!.id ? { ...this.localPlayer! } : p
      );
      this.broadcast({
        type: 'PLAYER_UPDATED',
        roomCode: this.currentRoom.code,
        player: this.localPlayer
      });
      try {
        fetch(`/api/rooms/${this.currentRoom.code}/player`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player: this.localPlayer })
        }).catch(() => {});
      } catch {}
      this.notify();
    }
  }

  // --- COMPUTER DINO GENERATION (RESERVES UNIQUE COLOR) ---

  async addAIBot() {
    if (!this.currentRoom) return;
    if (this.currentRoom.players.length >= 8) return;

    try {
      const res = await fetch(`/api/rooms/${this.currentRoom.code}/bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        this.currentRoom = data.room;
        this.notify();
        return;
      }
    } catch {}

    if (!this.currentRoom) return;

    // Offline fallback
    const existingBots = this.currentRoom.players.filter(p => p.isBot);
    const botIndex = existingBots.length;
    const botNumber = botIndex + 1;

    const dinoTypes: DinoType[] = ['raptor', 'tricera', 'stego', 'pterodactyl', 'trex'];
    const botDinoType = dinoTypes[botIndex % dinoTypes.length];

    const takenHexes = this.currentRoom.players.map(p => p.colorHex);
    const botColor = getAvailableColor(takenHexes);

    const botAccessories: DinoAccessory[] = ['crown', 'shades', 'goggles', 'bandana', 'none'];
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
      xOffset: (this.currentRoom.players.length % 4) * -22
    };

    this.currentRoom.players.push(botPlayer);
    this.saveCurrentRoomToStorage();
    this.broadcast({
      type: 'PLAYER_JOINED',
      roomCode: this.currentRoom.code,
      player: botPlayer
    });
    this.notify();
  }

  async removeBot(botId: string) {
    if (!this.currentRoom) return;

    try {
      const res = await fetch(`/api/rooms/${this.currentRoom.code}/remove-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentRoom = data.room;
        this.notify();
        return;
      }
    } catch {}

    if (!this.currentRoom) return;

    // Offline fallback: release bot color
    this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== botId);
    this.saveCurrentRoomToStorage();
    this.broadcast({
      type: 'PLAYER_LEFT',
      roomCode: this.currentRoom.code,
      playerId: botId
    });
    this.notify();
  }

  // --- GAME START & RESTART ---

  async startGame(): Promise<boolean> {
    if (!this.currentRoom || !this.localPlayer) return false;
    if (this.currentRoom.hostId !== this.localPlayer.id) {
      this.notifyError('Only the room owner can start the game!');
      return false;
    }

    try {
      // Also send through WebSocket channel
      this.broadcast({
        type: 'START_GAME',
        roomCode: this.currentRoom.code,
        playerId: this.localPlayer.id
      });

      const res = await fetch(`/api/rooms/${this.currentRoom.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.localPlayer.id })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentRoom = data.room;
        this.startBotSimulation();
        this.notify();
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        this.notifyError(data.error || 'Only the room owner can start the game!');
        return false;
      }
    } catch {}

    if (!this.currentRoom || !this.localPlayer) return false;

    // Offline fallback
    const seed = Math.floor(Math.random() * 1000000);
    const startTime = Date.now();

    this.currentRoom.status = 'playing';
    this.currentRoom.seed = seed;
    this.currentRoom.startedAt = startTime;
    this.currentRoom.players.forEach(p => {
      p.status = 'playing';
      p.distance = 0;
      p.score = 0;
      p.rank = undefined;
      p.deathDistance = undefined;
    });

    this.saveCurrentRoomToStorage();
    this.broadcast({
      type: 'GAME_STARTED',
      roomCode: this.currentRoom.code,
      seed,
      startTime
    });

    this.startBotSimulation();
    this.notify();
    return true;
  }

  async restartGame(): Promise<boolean> {
    if (!this.currentRoom || !this.localPlayer) return false;
    if (this.currentRoom.hostId !== this.localPlayer.id) return false;

    try {
      const res = await fetch(`/api/rooms/${this.currentRoom.code}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: this.localPlayer.id })
      });
      if (res.ok) {
        const data = await res.json();
        this.currentRoom = data.room;
        this.stopBotSimulation();
        this.notify();
        return true;
      }
    } catch {}

    if (!this.currentRoom || !this.localPlayer) return false;

    const seed = Math.floor(Math.random() * 1000000);
    this.currentRoom.status = 'lobby';
    this.currentRoom.seed = seed;
    this.currentRoom.players.forEach(p => {
      p.status = 'waiting';
      p.distance = 0;
      p.score = 0;
      p.rank = undefined;
      p.deathDistance = undefined;
    });

    this.stopBotSimulation();
    this.saveCurrentRoomToStorage();
    this.broadcast({
      type: 'RESTART_GAME',
      roomCode: this.currentRoom.code,
      seed
    });
    this.notify();
    return true;
  }

  broadcastAction(y: number, isDucking: boolean, distance: number, score: number) {
    if (!this.currentRoom || !this.localPlayer) return;
    this.localPlayer.y = y;
    this.localPlayer.isDucking = isDucking;
    this.localPlayer.distance = distance;
    this.localPlayer.score = score;

    this.broadcast({
      type: 'PLAYER_ACTION',
      roomCode: this.currentRoom.code,
      playerId: this.localPlayer.id,
      y,
      isDucking,
      distance,
      score
    });

    this.updateLiveRanks();
  }

  broadcastDeath(distance: number, score: number) {
    if (!this.currentRoom || !this.localPlayer) return;
    this.localPlayer.status = 'dead';
    this.localPlayer.distance = distance;
    this.localPlayer.score = score;
    this.localPlayer.deathDistance = distance;

    const playerInRoom = this.currentRoom.players.find(p => p.id === this.localPlayer!.id);
    if (playerInRoom) {
      playerInRoom.status = 'dead';
      playerInRoom.distance = distance;
      playerInRoom.score = score;
      playerInRoom.deathDistance = distance;
    }

    this.finalizeDeadLeaderboard();

    this.broadcast({
      type: 'PLAYER_DIED',
      roomCode: this.currentRoom.code,
      playerId: this.localPlayer.id,
      distance,
      score
    });

    // REST Fallback in case WebSocket was momentarily re-connecting
    try {
      fetch(`/api/rooms/${this.currentRoom.code}/death`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: this.localPlayer.id,
          distance,
          score
        })
      }).catch(() => {});
    } catch {}

    this.notify();
  }

  // Leave room: releases color reservation immediately
  async leaveRoom() {
    if (this.currentRoom && this.localPlayer) {
      const code = this.currentRoom.code;
      const pid = this.localPlayer.id;

      try {
        await fetch(`/api/rooms/${code}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: pid })
        });
      } catch {}

      this.broadcast({
        type: 'PLAYER_LEFT',
        roomCode: code,
        playerId: pid
      });
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch {}
      this.eventSource = null;
    }

    this.stopBotSimulation();
    this.currentRoom = null;
    this.notify();
  }

  // --- BOT SIMULATION ---
  private startBotSimulation() {
    this.stopBotSimulation();
    if (!this.currentRoom) return;

    this.botInterval = window.setInterval(() => {
      if (!this.currentRoom || this.currentRoom.status !== 'playing') {
        this.stopBotSimulation();
        return;
      }

      let anyChange = false;
      for (const player of this.currentRoom.players) {
        if (!player.isBot || player.status !== 'playing') continue;

        player.distance += 4.5 + Math.random() * 1.5;
        player.score = Math.floor(player.distance);

        if (!player.y || player.y === 0) {
          if (Math.random() < 0.04) {
            player.y = 80;
            player.isDucking = false;
          } else if (Math.random() < 0.02) {
            player.isDucking = true;
          }
        } else {
          player.y = Math.max(0, player.y - 12);
        }

        const deathChance = 0.0004 + (player.distance / 100000);
        if (player.distance > 300 && Math.random() < deathChance) {
          player.status = 'dead';
          player.deathDistance = player.distance;
          anyChange = true;
        }
      }

      this.updateLiveRanks();
      this.finalizeDeadLeaderboard();
      if (anyChange) {
        this.notify();
      }
    }, 60);
  }

  private stopBotSimulation() {
    if (this.botInterval !== null) {
      clearInterval(this.botInterval);
      this.botInterval = null;
    }
  }

  private updateLiveRanks() {
    if (!this.currentRoom) return;
    const sorted = [...this.currentRoom.players].sort((a, b) => b.distance - a.distance);
    sorted.forEach((p, idx) => {
      const match = this.currentRoom!.players.find(x => x.id === p.id);
      if (match) match.rank = idx + 1;
    });
  }

  private finalizeDeadLeaderboard() {
    if (!this.currentRoom) return;
    this.updateLiveRanks();
    const allDead = this.currentRoom.players.every(p => p.status === 'dead');
    if (allDead && this.currentRoom.status === 'playing') {
      this.currentRoom.status = 'gameover';
      this.stopBotSimulation();
    }
  }

  private getStoredRoom(code: string): Room | null {
    try {
      const data = localStorage.getItem(STORAGE_ROOMS_KEY);
      if (!data) return null;
      const rooms: Record<string, Room> = JSON.parse(data);
      return rooms[code] || null;
    } catch {
      return null;
    }
  }

  private saveRoomToRegistry(room: Room) {
    try {
      const data = localStorage.getItem(STORAGE_ROOMS_KEY);
      const rooms: Record<string, Room> = data ? JSON.parse(data) : {};
      rooms[room.code] = room;
      localStorage.setItem(STORAGE_ROOMS_KEY, JSON.stringify(rooms));
    } catch {}
  }

  private saveCurrentRoomToStorage() {
    if (this.currentRoom) {
      this.saveRoomToRegistry(this.currentRoom);
    }
  }

  getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  getLocalPlayer(): Player | null {
    return this.localPlayer;
  }

  setLocalPlayer(p: Player) {
    this.localPlayer = p;
  }
}

export const multiplayerService = new MultiplayerService();
