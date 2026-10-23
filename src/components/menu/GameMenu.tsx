import React, { useState } from 'react';
import { Player } from '../../types/game';
import { ArrowLeft, PlusCircle, LogIn, Copy, Check, Hash } from 'lucide-react';

interface GameMenuProps {
  player: Player;
  onJoinRoom: (code: string) => void;
  onCreateRoom: (roomName: string) => void;
  onBack: () => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({
  player,
  onJoinRoom,
  onCreateRoom,
  onBack
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [roomName, setRoomName] = useState(`${player.name}'s Room`);
  const [copiedCode, setCopiedCode] = useState(false);
  const [previewCode] = useState(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(previewCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim());
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(roomName.trim() || `${player.name}'s Room`);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Start Menu</span>
        </button>

        <h2 className="text-xl sm:text-2xl font-bold font-arcade text-amber-400">
          GAME MENU
        </h2>

        <div className="w-20" />
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-3xl">
        {/* OPTION 1: JOIN WITH CODE */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2.5 text-cyan-400 mb-6">
              <LogIn className="w-5 h-5" />
              <h3 className="text-xl font-bold font-chakra text-white">
                Join With Code
              </h3>
            </div>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  Enter The Code
                </label>
                <div className="relative">
                  <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="ENTER CODE (e.g. DINO88)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 pl-10 pr-4 py-3 rounded-xl text-white font-mono font-bold text-lg tracking-widest uppercase focus:outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="w-full py-4 px-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-arcade text-xs rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>ENTER TO LOBBY</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center font-mono">
            Directly enters the host&apos;s multiplayer lobby
          </div>
        </div>

        {/* OPTION 2: CREATE A ROOM */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center gap-2.5 text-amber-400 mb-6">
              <PlusCircle className="w-5 h-5" />
              <h3 className="text-xl font-bold font-chakra text-white">
                Create A Room
              </h3>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Step 1: Name The Room */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  Name The Room
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={24}
                  placeholder="Enter Room Name..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 px-4 py-3 rounded-xl text-white font-chakra text-base focus:outline-none"
                />
              </div>

              {/* Step 2: Copy */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  Generated Room Code
                </label>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-base font-bold font-mono text-amber-400 tracking-widest pl-2">
                    {previewCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-mono transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
              </div>

              {/* Step 3: Create Lobby */}
              <button
                type="submit"
                className="w-full py-4 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-arcade text-xs rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>CREATE LOBBY</span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center font-mono">
            You will become the Owner of the room
          </div>
        </div>
      </div>
    </div>
  );
};
