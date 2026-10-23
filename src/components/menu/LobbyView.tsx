import React, { useState } from 'react';
import { Room, Player } from '../../types/game';
import { DinoAvatar } from '../dino/DinoAvatar';
import { DINO_COLORS } from '../../utils/colors';
import { Crown, Copy, Check, Users, Play, Bot, ArrowLeft, Lock } from 'lucide-react';

interface LobbyViewProps {
  room: Room;
  localPlayer: Player;
  onStartGame: () => void;
  onLeaveLobby: () => void;
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onSelectColor: (colorHex: string) => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  room,
  localPlayer,
  onStartGame,
  onLeaveLobby,
  onAddBot,
  onRemoveBot,
  onSelectColor
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const isOwner = room.hostId === localPlayer.id;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Taken colors by other players in this room to enforce non-repetition
  const takenColorsByOthers = room.players
    .filter(p => p.id !== localPlayer.id)
    .map(p => p.colorHex.toLowerCase());

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col items-center select-none">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <button
          onClick={onLeaveLobby}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Leave Lobby</span>
        </button>

        <h2 className="text-xl sm:text-2xl font-bold font-arcade text-amber-400">
          LOBBY VIEW
        </h2>

        {/* Room Code Badge */}
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">
              ROOM CODE
            </span>
            <span className="font-mono font-black text-lg text-amber-400 tracking-widest">
              {room.code}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
            title="Copy Room Code"
          >
            {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Room Details */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-black font-chakra text-white">
          {room.name}
        </h3>
        <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-400 font-mono">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Owner Of Room: <strong className="text-white">{room.hostName}</strong></span>
        </div>
      </div>

      {/* LEADERBOARD SECTION */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-amber-400" />
            <h4 className="font-chakra font-bold text-lg text-white">
              Leaderboard
            </h4>
          </div>
          <div className="text-xs text-amber-300 font-mono">
            Scores (By Default Zero)
          </div>
        </div>

        {/* Number Of Players With There Dino Color */}
        <div className="mb-4 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Number Of Players With There Dino Color: <strong className="text-white">{room.players.length}</strong></span>
        </div>

        {/* Players List in Leaderboard */}
        <div className="space-y-3">
          {room.players.map((p, idx) => {
            const isLocal = p.id === localPlayer.id;
            const isRoomOwner = p.id === room.hostId;

            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isLocal
                    ? 'bg-slate-800/90 border-amber-500/60 shadow-md'
                    : 'bg-slate-950/70 border-slate-800/80'
                }`}
              >
                {/* Left: Avatar, Name, Dino Color */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-slate-500 w-4">
                    #{idx + 1}
                  </span>
                  <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800 shrink-0">
                    <DinoAvatar
                      type={p.dinoType}
                      colorHex={p.colorHex}
                      accessory={p.accessory}
                      size={44}
                      frame={0}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-chakra font-bold text-base text-white">
                        {p.name}
                      </span>
                      {isLocal && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                          YOU
                        </span>
                      )}
                      {isRoomOwner && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold flex items-center gap-1 font-mono">
                          <Crown className="w-3 h-3 fill-yellow-400 stroke-yellow-500" />
                          OWNER
                        </span>
                      )}
                      {p.isBot && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold font-mono">
                          COMPUTER DINO
                        </span>
                      )}
                      {/* Player Status */}
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                        {p.status === 'playing' ? 'PLAYING' : 'READY'}
                      </span>
                    </div>

                    {/* Player ID, Dinosaur Species, Unique Color */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono flex-wrap">
                      <span className="text-slate-300">ID: <strong className="text-slate-200">{p.id}</strong></span>
                      <span className="text-slate-600">·</span>
                      <span>Species: <strong className="text-slate-200 capitalize font-chakra font-semibold">{p.dinoType === 'trex' ? 'T-Rex' : p.dinoType === 'raptor' ? 'Velociraptor' : p.dinoType === 'tricera' ? 'Triceratops' : p.dinoType === 'stego' ? 'Stegosaurus' : 'Pterodactyl'}</strong></span>
                      <span className="text-slate-600">·</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full border border-white/40 shadow-sm shrink-0"
                          style={{ backgroundColor: p.colorHex }}
                        />
                        <span
                          className="text-xs font-semibold"
                          style={{ color: p.colorHex }}
                        >
                          {p.colorName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Scores (By Default Zero) */}
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Score</span>
                    <span className="font-arcade text-xs text-amber-400 font-bold">
                      {p.score || 0}
                    </span>
                  </div>

                  {isOwner && p.isBot && (
                    <button
                      onClick={() => onRemoveBot(p.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Change Color in Lobby */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Pick Your Dino Color
            </span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {DINO_COLORS.map((c) => {
              const isSelected = localPlayer.colorHex.toLowerCase() === c.hex.toLowerCase();
              const occupyingPlayer = room.players.find(
                p => p.id !== localPlayer.id && p.colorHex.toLowerCase() === c.hex.toLowerCase()
              );
              const isOccupied = !!occupyingPlayer;

              return (
                <button
                  key={c.id}
                  disabled={isOccupied}
                  onClick={() => onSelectColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg z-10'
                      : isOccupied
                      ? 'opacity-35 cursor-not-allowed ring-1 ring-slate-800 brightness-75'
                      : 'hover:scale-105 cursor-pointer hover:ring-2 hover:ring-white/50'
                  }`}
                  title={isOccupied ? `${c.name} (Occupied by ${occupyingPlayer.name})` : c.name}
                >
                  {isSelected && <Check className="w-4 h-4 text-white stroke-[3] drop-shadow" />}
                  {isOccupied && (
                    <div className="absolute inset-0 bg-slate-950/60 rounded-lg flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5 text-slate-300 drop-shadow" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Color Counters */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>
              Available: <strong className="text-emerald-400">{Math.max(0, 10 - room.players.length)}</strong> / 10
            </span>
            <span>
              Occupied: <strong className="text-amber-400">{room.players.length}</strong> / 10
            </span>
          </div>
        </div>
      </div>

      {/* START GAME: ONLY HANDLED BY THE OWNER OF THE ROOM */}
      <div className="w-full max-w-xl flex flex-col items-center gap-3">
        {isOwner ? (
          <>
            <button
              onClick={onStartGame}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-arcade text-sm rounded-xl font-bold shadow-xl shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>START GAME</span>
            </button>

            {room.players.length < 8 && (
              <button
                onClick={onAddBot}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-cyan-400 font-chakra text-xs rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Bot className="w-4 h-4" />
                <span>Computer Dino</span>
              </button>
            )}
          </>
        ) : (
          <>
            <button
              disabled
              className="w-full py-4 px-6 bg-slate-800/80 text-slate-500 font-arcade text-sm rounded-xl font-bold border border-slate-700/60 cursor-not-allowed flex items-center justify-center gap-3 opacity-60"
              title="Only the room owner can start the game"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>START GAME</span>
            </button>

            <div className="w-full p-4 bg-slate-900 border border-slate-800 rounded-xl text-center flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-slate-400 font-chakra font-semibold text-sm">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Waiting for Owner of Room (<strong className="text-white">{room.hostName}</strong>) to start the game...</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Connected to Lobby · Ready</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
