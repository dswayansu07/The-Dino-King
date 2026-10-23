import React, { useEffect } from 'react';
import { Player, Room } from '../../types/game';
import { DinoAvatar } from '../dino/DinoAvatar';
import { Crown, RotateCcw, ArrowLeft, Eye } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DeadLeaderboardProps {
  room: Room | null;
  localPlayer: Player;
  onRestart: () => void;
  onReturnToLobby: () => void;
  onMainMenu: () => void;
  onSpectate: () => void;
  isSpectating: boolean;
}

export const DeadLeaderboard: React.FC<DeadLeaderboardProps> = ({
  room,
  localPlayer,
  onRestart,
  onReturnToLobby,
  onMainMenu,
  onSpectate,
  isSpectating
}) => {
  // Merge local player state to ensure instant dead status & score update
  const rawPlayers = room ? room.players : [localPlayer];
  const players: Player[] = rawPlayers.map(p => {
    if (p.id === localPlayer.id) {
      return {
        ...p,
        status: localPlayer.status === 'dead' ? 'dead' : p.status,
        score: Math.max(p.score || 0, localPlayer.score || 0),
        distance: Math.max(p.distance || 0, localPlayer.distance || 0),
        deathDistance: p.deathDistance || localPlayer.deathDistance || localPlayer.distance
      };
    }
    return p;
  });

  // Rank players consistently by final score descending, death distance descending, then player ID ascending (deterministic tie-breaking rule)
  const rankedPlayers = [...players].sort((a, b) => {
    const scoreDiff = (b.score || 0) - (a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const distA = a.deathDistance ?? a.distance ?? 0;
    const distB = b.deathDistance ?? b.distance ?? 0;
    if (distB !== distA) return distB - distA;

    return a.id.localeCompare(b.id);
  });

  const isOwner = room ? room.hostId === localPlayer.id : true;
  const anyStillPlaying = rankedPlayers.some(p => p.status === 'playing');
  const winner = rankedPlayers[0];
  const isLocalWinner = winner && winner.id === localPlayer.id;

  useEffect(() => {
    if (!anyStillPlaying && isLocalWinner) {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [anyStillPlaying, isLocalWinner]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col items-center select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Title */}
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-2 shadow-lg">
          <Crown className="w-8 h-8 fill-amber-400 stroke-amber-600 animate-pulse" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black font-arcade text-amber-400">
          DEAD LEADERBOARD VIEW
        </h2>

        {/* Number Of Players */}
        <div className="mt-3 px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-slate-300">
          Number Of Players: <strong className="text-amber-400 font-bold">{rankedPlayers.length}</strong>
        </div>
      </div>

      {/* Dead Leaderboard Table */}
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl mb-6">
        {/* Table Headers */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 font-mono">
          <div className="flex items-center gap-4">
            <span className="w-12 text-center">Rank</span>
            <span>Player (Dino Color)</span>
          </div>
          <div className="flex items-center gap-8">
            <span className="w-24 text-center">Status</span>
            <span className="w-16 text-right">Score</span>
          </div>
        </div>

        {/* Table Rows */}
        <div className="space-y-2.5 mt-3">
          {rankedPlayers.map((p, idx) => {
            const isLocal = p.id === localPlayer.id;
            const rank = idx + 1;
            const isAlive = p.status === 'playing';

            return (
              <div
                key={p.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isLocal
                    ? 'bg-slate-800/90 border-amber-500/50 shadow-md'
                    : 'bg-slate-950/70 border-slate-800/80'
                }`}
              >
                {/* Rank & Player */}
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-12 flex items-center justify-center font-arcade font-bold text-xs">
                    {rank === 1 ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Crown className="w-4 h-4 fill-amber-400 inline" />
                        <span>#1</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">#{rank}</span>
                    )}
                  </div>

                  {/* Dino Avatar */}
                  <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                    <DinoAvatar
                      type={p.dinoType}
                      colorHex={p.colorHex}
                      accessory={p.accessory}
                      size={36}
                      isDead={p.status === 'dead'}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-chakra font-bold text-sm text-white">
                        {p.name}
                      </span>
                      {isLocal && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold font-mono">
                          YOU
                        </span>
                      )}
                    </div>
                    {/* Dino Color */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: p.colorHex }}
                      />
                      <span className="text-[11px] font-semibold" style={{ color: p.colorHex }}>
                        {p.colorName} <span className="text-[10px] opacity-80 font-mono">({p.colorHex})</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status -> Playing, Dead & Score */}
                <div className="flex items-center gap-8">
                  {/* Status -> Playing, Dead */}
                  <div className="w-24 text-center">
                    {isAlive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-600/50 text-emerald-400 text-xs font-bold font-mono animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Playing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs font-bold font-mono">
                        <span>💀</span>
                        Dead
                      </span>
                    )}
                  </div>

                  {/* Score */}
                  <div className="w-16 text-right font-arcade text-xs text-amber-400 font-bold">
                    {p.score || 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-xl flex flex-col sm:flex-row items-center gap-3">
        {anyStillPlaying && !isSpectating && (
          <button
            onClick={onSpectate}
            className="w-full sm:flex-1 py-3.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-arcade text-xs rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>SPECTATE MATCH</span>
          </button>
        )}

        {isOwner ? (
          <button
            onClick={onRestart}
            className="w-full sm:flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-arcade text-xs rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>
        ) : (
          <button
            onClick={onReturnToLobby}
            className="w-full sm:flex-1 py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-chakra font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO LOBBY</span>
          </button>
        )}

        <button
          onClick={onMainMenu}
          className="w-full sm:flex-1 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-chakra text-xs font-semibold rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>START MENU</span>
        </button>
      </div>
    </div>
  );
};
