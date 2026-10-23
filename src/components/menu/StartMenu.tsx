import React, { useState } from 'react';
import { Player } from '../../types/game';
import { DinoAvatar } from '../dino/DinoAvatar';
import { Play, UserCheck, Settings as SettingsIcon, Crown, Copy, Check } from 'lucide-react';

interface StartMenuProps {
  player: Player;
  onPlay: () => void;
  onOpenCharacterSelection: () => void;
  onOpenSettings: () => void;
}

export const StartMenu: React.FC<StartMenuProps> = ({
  player,
  onPlay,
  onOpenCharacterSelection,
  onOpenSettings
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(player.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-6 text-center select-none">
      {/* Title & Crown */}
      <div className="flex items-center gap-2 text-amber-400 mb-2 animate-bounce">
        <Crown className="w-9 h-9 fill-amber-400 stroke-amber-500" />
      </div>

      <h1 className="text-4xl sm:text-5xl font-black font-arcade tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 drop-shadow-md">
        THE DINO KING
      </h1>
      <p className="mt-2 text-xs uppercase tracking-widest text-slate-400 font-mono">
        Infinite Runner 2D Game (Multiplayer)
      </p>

      {/* Current Player Preview Card */}
      <div className="mt-8 mb-6 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col items-center shadow-xl w-full">
        <div className="relative p-2">
          <DinoAvatar
            type={player.dinoType}
            colorHex={player.colorHex}
            accessory={player.accessory}
            size={110}
            frame={1}
          />
        </div>

        <div className="mt-3 text-center">
          <span className="text-xl font-bold font-chakra text-white tracking-wide block">
            {player.name}
          </span>
          <div className="flex items-center justify-center gap-2 mt-1.5 text-xs text-slate-400">
            <span className="font-mono text-slate-400">Player Id: <strong className="text-slate-200">{player.id}</strong></span>
            <button
              onClick={handleCopyId}
              className="p-1 hover:text-amber-400 text-slate-500 transition-colors"
              title="Copy Player Id"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span
              className="w-3 h-3 rounded-full border border-white/30"
              style={{ backgroundColor: player.colorHex }}
            />
            <span className="text-xs font-semibold" style={{ color: player.colorHex }}>
              {player.colorName}
            </span>
          </div>
        </div>
      </div>

      {/* Start Menu Options exactly matching specification: Play, Character Selection, Settings */}
      <div className="w-full space-y-3.5">
        {/* Play -> Enters Game Menu */}
        <button
          onClick={onPlay}
          className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-arcade text-sm rounded-xl border border-emerald-400/40 shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-white" />
          <span>PLAY</span>
        </button>

        {/* Character Selection */}
        <button
          onClick={onOpenCharacterSelection}
          className="w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-slate-200 font-chakra font-semibold text-sm rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <UserCheck className="w-4 h-4 text-cyan-400" />
          <span>CHARACTER SELECTION</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="w-full py-3 px-6 bg-slate-900/70 hover:bg-slate-800/70 text-slate-400 hover:text-slate-200 font-chakra text-xs rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <SettingsIcon className="w-4 h-4 text-slate-400" />
          <span>SETTINGS</span>
        </button>
      </div>
    </div>
  );
};
