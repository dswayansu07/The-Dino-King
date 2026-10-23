/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Player, Room, GameSettings, ViewState, DinoType, DinoAccessory } from './types/game';
import { multiplayerService } from './services/multiplayer';
import { soundEngine } from './utils/audio';
import { StartMenu } from './components/menu/StartMenu';
import { CharacterSelection } from './components/menu/CharacterSelection';
import { GameMenu } from './components/menu/GameMenu';
import { LobbyView } from './components/menu/LobbyView';
import { DinoCanvas } from './components/game/DinoCanvas';
import { DeadLeaderboard } from './components/menu/DeadLeaderboard';
import { SettingsModal } from './components/menu/SettingsModal';
import { DINO_COLORS } from './utils/colors';

const STORAGE_PLAYER_KEY = 'the_dino_king_player_profile';
const STORAGE_SETTINGS_KEY = 'the_dino_king_user_settings';

export default function App() {
  // Load saved player profile or generate fresh
  const [localPlayer, setLocalPlayer] = useState<Player>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PLAYER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const id = parsed.id || `DK-${Math.floor(1000 + Math.random() * 9000)}`;
          const name = (parsed.name && typeof parsed.name === 'string' && parsed.name.trim())
            ? parsed.name.trim().slice(0, 18)
            : `Rex#${Math.floor(10 + Math.random() * 89)}`;
          const colorInfo = DINO_COLORS.find(c => c.hex.toLowerCase() === (parsed.colorHex || '').toLowerCase()) || DINO_COLORS[0];
          const dinoType = ['trex', 'raptor', 'tricera', 'stego', 'pterodactyl'].includes(parsed.dinoType)
            ? parsed.dinoType
            : 'trex';
          const accessory = ['crown', 'shades', 'goggles', 'bandana', 'none'].includes(parsed.accessory)
            ? parsed.accessory
            : 'crown';

          return {
            id,
            name,
            dinoType,
            colorHex: colorInfo.hex,
            colorName: colorInfo.name,
            accessory,
            isHost: false,
            isReady: true,
            isBot: false,
            score: 0,
            distance: 0,
            status: 'waiting',
            xOffset: 0
          };
        }
      }
    } catch {}

    const randomId = `DK-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomColor = DINO_COLORS[0]; // Emerald
    const initialPlayer: Player = {
      id: randomId,
      name: `Rex#${Math.floor(10 + Math.random() * 89)}`,
      dinoType: 'trex',
      colorHex: randomColor.hex,
      colorName: randomColor.name,
      accessory: 'crown', // The Dino King default!
      isHost: false,
      isReady: true,
      isBot: false,
      score: 0,
      distance: 0,
      status: 'waiting',
      xOffset: 0
    };
    try {
      localStorage.setItem(STORAGE_PLAYER_KEY, JSON.stringify(initialPlayer));
    } catch {}
    return initialPlayer;
  });

  // Restore saved character preferences when returning to menu or leaving room
  const restoreSavedProfile = React.useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PLAYER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const colorInfo = DINO_COLORS.find(c => c.hex.toLowerCase() === (parsed.colorHex || '').toLowerCase()) || DINO_COLORS[0];
          setLocalPlayer(prev => ({
            ...prev,
            id: parsed.id || prev.id,
            name: (parsed.name && typeof parsed.name === 'string' && parsed.name.trim()) ? parsed.name.trim().slice(0, 18) : prev.name,
            dinoType: parsed.dinoType || prev.dinoType,
            colorHex: colorInfo.hex,
            colorName: colorInfo.name,
            accessory: parsed.accessory || prev.accessory,
            status: 'waiting',
            score: 0,
            distance: 0
          }));
        }
      }
    } catch {}
  }, []);

  // Load saved settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      soundEnabled: true,
      soundVolume: 80,
      musicEnabled: true,
      musicVolume: 50,
      theme: 'auto',
      scanlines: false
    };
  });

  // Current view and room state
  const [viewState, setViewState] = useState<ViewState>('start_menu');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSpectating, setIsSpectating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const countdownIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const startCountdown = React.useCallback(() => {
    if (countdownIntervalRef.current) return;
    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setViewState('game');
          return null;
        }
        return prev - 1;
      });
    }, 800);
  }, []);

  // Sync player profile with multiplayer service (room session)
  useEffect(() => {
    multiplayerService.setLocalPlayer(localPlayer);
  }, [localPlayer]);

  // Sync settings to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // Cleanup countdown timer on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  // Show temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Subscribe to multiplayer network events
  useEffect(() => {
    multiplayerService.setLocalPlayer(localPlayer);

    const unsubscribe = multiplayerService.subscribe((room) => {
      setCurrentRoom(room);

      if (room) {
        // Check if room transitions to playing
        if (room.status === 'playing' && viewState === 'lobby') {
          startCountdown();
        } else if (room.status === 'gameover' && viewState === 'game') {
          setViewState('dead_leaderboard');
        } else if (room.status === 'lobby' && (viewState === 'dead_leaderboard' || viewState === 'game')) {
          setViewState('lobby');
          setIsSpectating(false);
        }

        // Keep local player's room color and host status in sync
        const meInRoom = room.players.find(p => p.id === localPlayer.id);
        if (meInRoom) {
          if (meInRoom.colorHex !== localPlayer.colorHex || meInRoom.isHost !== localPlayer.isHost) {
            setLocalPlayer(prev => ({
              ...prev,
              colorHex: meInRoom.colorHex,
              colorName: meInRoom.colorName,
              isHost: meInRoom.isHost
            }));
            if (meInRoom.colorHex !== localPlayer.colorHex) {
              showToast(`Color adjusted to ${meInRoom.colorName} to avoid conflict!`);
            }
          }
        }
      }
    });

    const unsubscribeNotifications = multiplayerService.onNotification((msg) => {
      showToast(msg);
    });

    return () => {
      unsubscribe();
      unsubscribeNotifications();
    };
  }, [viewState, localPlayer, startCountdown]);

  // --- ACTIONS ---

  const handleStartSolo = async () => {
    soundEngine.playClick(settings);
    // Create quick offline singleplayer room
    const soloRoom = await multiplayerService.createRoom('Solo Practice Track', localPlayer);
    setCurrentRoom(soloRoom);
    await multiplayerService.startGame();
    setViewState('game');
  };

  const handleCreateRoom = async (roomName: string) => {
    soundEngine.playClick(settings);
    const room = await multiplayerService.createRoom(roomName, localPlayer);
    setCurrentRoom(room);
    setViewState('lobby');
    showToast(`Room created: ${room.code}!`);
  };

  const handleJoinRoom = async (code: string) => {
    soundEngine.playClick(settings);
    const res = await multiplayerService.joinRoom(code, localPlayer);
    if (res.success && res.room) {
      setCurrentRoom(res.room);
      if (res.room.status === 'playing') {
        setIsSpectating(true);
        setViewState('game');
        showToast(`Match in progress! Spectating room ${res.room.code}...`);
      } else {
        setViewState('lobby');
        showToast(`Joined lobby: ${res.room.code}!`);
      }
    } else {
      showToast(res.error || 'Failed to join room');
    }
  };

  const handleStartGameFromLobby = async () => {
    if (!currentRoom) return;
    if (currentRoom.hostId !== localPlayer.id) {
      showToast('Only the owner of the room can start the game!');
      return;
    }
    soundEngine.playClick(settings);
    const started = await multiplayerService.startGame();
    if (started) {
      startCountdown();
    }
  };

  const handleRestartGame = async () => {
    soundEngine.playClick(settings);
    await multiplayerService.restartGame();
    setViewState('lobby');
    setIsSpectating(false);
  };

  const handlePlayerDead = (finalScore: number, finalDistance: number) => {
    multiplayerService.broadcastDeath(finalDistance, finalScore);
    setLocalPlayer(prev => ({
      ...prev,
      status: 'dead',
      score: finalScore,
      distance: finalDistance,
      deathDistance: finalDistance
    }));

    // Show Dead Leaderboard
    setViewState('dead_leaderboard');
  };

  const handleUpdateAction = (y: number, isDucking: boolean, distance: number, score: number) => {
    multiplayerService.broadcastAction(y, isDucking, distance, score);
  };

  const handleSaveCharacter = (name: string, dinoType: DinoType, colorHex: string, accessory: DinoAccessory) => {
    const cleanName = name.trim().slice(0, 18) || localPlayer.name || `Rex#${Math.floor(10 + Math.random() * 89)}`;
    const colorInfo = DINO_COLORS.find(c => c.hex.toLowerCase() === colorHex.toLowerCase()) || DINO_COLORS[0];

    const savedProfile = {
      id: localPlayer.id, // Explicitly preserve unique ID across sessions
      name: cleanName,
      dinoType,
      colorHex: colorInfo.hex,
      colorName: colorInfo.name,
      accessory
    };

    try {
      localStorage.setItem(STORAGE_PLAYER_KEY, JSON.stringify(savedProfile));
    } catch {}

    const updated: Player = {
      ...localPlayer,
      name: cleanName,
      dinoType,
      colorHex: colorInfo.hex,
      colorName: colorInfo.name,
      accessory
    };

    setLocalPlayer(updated);
    multiplayerService.updatePlayerDetails(cleanName, dinoType, accessory);
    multiplayerService.updatePlayerColor(colorInfo.hex);
    soundEngine.playClick(settings);
    showToast('Character saved!');
  };

  const handleSelectLobbyColor = async (colorHex: string) => {
    const res = await multiplayerService.updatePlayerColor(colorHex);
    if (!res.success && res.error) {
      showToast(res.error);
      return;
    }
    const colorInfo = DINO_COLORS.find(c => c.hex.toLowerCase() === colorHex.toLowerCase());
    if (colorInfo) {
      setLocalPlayer(prev => ({ ...prev, colorHex: colorInfo.hex, colorName: colorInfo.name }));
    }
    soundEngine.playClick(settings);
  };

  const handleLeaveLobby = () => {
    soundEngine.playClick(settings);
    multiplayerService.leaveRoom();
    setCurrentRoom(null);
    restoreSavedProfile();
    setViewState('start_menu');
  };

  return (
    <div className="relative min-h-screen w-full bg-[#090d16] text-slate-100 flex flex-col justify-between overflow-x-hidden">
      {/* Optional CRT Scanlines Effect Overlay */}
      {settings.scanlines && <div className="fixed inset-0 crt-overlay z-40 pointer-events-none" />}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-amber-500/60 text-amber-300 px-5 py-2.5 rounded-xl shadow-2xl text-xs font-mono font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          {toastMessage}
        </div>
      )}

      {/* 3... 2... 1... Countdown Overlay when race starts */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-100">
          <div className="text-center">
            <span className="font-mono text-sm uppercase tracking-widest text-amber-400 block mb-2">
              GET READY!
            </span>
            <div className="text-8xl sm:text-9xl font-black font-arcade text-white animate-bounce drop-shadow-[0_10px_35px_rgba(245,158,11,0.5)]">
              {countdown === 1 ? 'RUN!' : countdown}
            </div>
            <span className="text-xs text-slate-400 mt-4 block">
              Race starting synchronously...
            </span>
          </div>
        </div>
      )}

      {/* MAIN VIEW ROUTER */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 w-full max-w-7xl mx-auto">
        {viewState === 'start_menu' && (
          <StartMenu
            player={localPlayer}
            onPlay={() => {
              soundEngine.playClick(settings);
              setViewState('game_menu');
            }}
            onOpenCharacterSelection={() => {
              soundEngine.playClick(settings);
              setViewState('character_selection');
            }}
            onOpenSettings={() => {
              soundEngine.playClick(settings);
              setIsSettingsOpen(true);
            }}
          />
        )}

        {viewState === 'character_selection' && (
          <CharacterSelection
            player={localPlayer}
            onSave={handleSaveCharacter}
            onBack={() => {
              soundEngine.playClick(settings);
              setViewState('start_menu');
            }}
          />
        )}

        {viewState === 'game_menu' && (
          <GameMenu
            player={localPlayer}
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
            onBack={() => {
              soundEngine.playClick(settings);
              setViewState('start_menu');
            }}
          />
        )}

        {viewState === 'lobby' && currentRoom && (
          <LobbyView
            room={currentRoom}
            localPlayer={localPlayer}
            onStartGame={handleStartGameFromLobby}
            onLeaveLobby={handleLeaveLobby}
            onAddBot={() => multiplayerService.addAIBot()}
            onRemoveBot={(id) => multiplayerService.removeBot(id)}
            onSelectColor={handleSelectLobbyColor}
          />
        )}

        {viewState === 'game' && (
          <div className="w-full h-full flex flex-col items-center">
            <DinoCanvas
              localPlayer={localPlayer}
              players={currentRoom ? currentRoom.players : [localPlayer]}
              roomSeed={currentRoom ? currentRoom.seed : 42}
              settings={settings}
              onPlayerDead={handlePlayerDead}
              onUpdateAction={handleUpdateAction}
              onToggleSound={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
              isSpectating={isSpectating}
            />
          </div>
        )}

        {viewState === 'dead_leaderboard' && (
          <DeadLeaderboard
            room={currentRoom}
            localPlayer={localPlayer}
            onRestart={handleRestartGame}
            onReturnToLobby={() => {
              soundEngine.playClick(settings);
              setViewState('lobby');
              setIsSpectating(false);
            }}
            onMainMenu={() => {
              soundEngine.playClick(settings);
              multiplayerService.leaveRoom();
              restoreSavedProfile();
              setViewState('start_menu');
              setIsSpectating(false);
            }}
            onSpectate={() => {
              soundEngine.playClick(settings);
              setIsSpectating(true);
              setViewState('game');
            }}
            isSpectating={isSpectating}
          />
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={setSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Quiet Footer */}
      <footer className="w-full py-3 px-6 text-center text-xs text-slate-500 font-mono border-t border-slate-900/60">
        <div className="flex items-center justify-center gap-3">
          <span>The Dino King 2D Runner</span>
          <span aria-hidden="true">·</span>
          <span>Desktop & Mobile Ready</span>
          <span aria-hidden="true">·</span>
          <span>Multiplayer Room Sync</span>
        </div>
      </footer>
    </div>
  );
}
