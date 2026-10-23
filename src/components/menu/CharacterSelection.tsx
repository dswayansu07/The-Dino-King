import React, { useState } from 'react';
import { Player, DinoType, DinoAccessory } from '../../types/game';
import { DinoAvatar } from '../dino/DinoAvatar';
import { DINO_COLORS } from '../../utils/colors';
import { Copy, Check, ArrowLeft, RefreshCw, UserCheck, Sparkles } from 'lucide-react';

interface CharacterSelectionProps {
  player: Player;
  onSave: (name: string, dinoType: DinoType, colorHex: string, accessory: DinoAccessory) => void;
  onBack: () => void;
}

export const CharacterSelection: React.FC<CharacterSelectionProps> = ({
  player,
  onSave,
  onBack
}) => {
  const [name, setName] = useState(player.name);
  const [dinoType, setDinoType] = useState<DinoType>(player.dinoType);
  const [colorHex, setColorHex] = useState(player.colorHex);
  const [accessory, setAccessory] = useState<DinoAccessory>(player.accessory);
  const [copied, setCopied] = useState(false);

  const dinoTypes: { id: DinoType; label: string; desc: string }[] = [
    { id: 'trex', label: 'T-Rex', desc: 'Apex predator with legendary bite & jumps' },
    { id: 'raptor', label: 'Velociraptor', desc: 'Agile & razor sharp reflexes' },
    { id: 'tricera', label: 'Triceratops', desc: 'Armored horned prehistoric titan' },
    { id: 'stego', label: 'Stegosaurus', desc: 'Spiked plate defender' },
    { id: 'pterodactyl', label: 'Pterodactyl', desc: 'Glider of the ancient skies' }
  ];

  const accessories: { id: DinoAccessory; label: string }[] = [
    { id: 'crown', label: '👑 King Crown' },
    { id: 'shades', label: '🕶️ Pixel Shades' },
    { id: 'goggles', label: '🥽 Aviator Goggles' },
    { id: 'bandana', label: '🧣 Dino Bandana' },
    { id: 'none', label: '❌ Clean' }
  ];

  const randomNames = [
    'ThunderRex', 'MeteorRunner', 'SpikeKing', 'DinoMaster', 
    'PrehistoricDash', 'RaptorAce', 'KingSaur', 'VelocityRex', 'AmberDash'
  ];

  const handleRandomName = () => {
    const picked = randomNames[Math.floor(Math.random() * randomNames.length)];
    const num = Math.floor(10 + Math.random() * 89);
    setName(`${picked}#${num}`);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(player.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const trimmed = name.trim().slice(0, 18);
    const finalName = trimmed.length > 0 ? trimmed : (player.name || `Rex#${Math.floor(10 + Math.random() * 89)}`);
    onSave(finalName, dinoType, colorHex, accessory);
    onBack();
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 flex flex-col items-center select-none">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Start Menu</span>
        </button>

        <h2 className="text-xl sm:text-2xl font-bold font-arcade text-amber-400">
          CHARACTER SELECTION
        </h2>

        <div className="w-20" />
      </div>

      {/* Main Container */}
      <div className="w-full space-y-6">
        {/* Live Preview Card */}
        <div className="w-full bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col items-center shadow-xl">
          <div className="relative w-36 h-36 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-center justify-center overflow-hidden mb-3">
            <DinoAvatar
              type={dinoType}
              colorHex={colorHex}
              accessory={accessory}
              size={96}
              frame={1}
            />
            <div className="absolute bottom-3 left-0 right-0 h-0.5 bg-slate-800" />
          </div>

          <span className="font-chakra font-bold text-lg text-white">
            {name || 'Unnamed Dino'}
          </span>
          <span className="text-xs text-slate-400 capitalize mt-0.5">
            {dinoType} · <span style={{ color: colorHex }} className="font-semibold">{DINO_COLORS.find(c => c.hex.toLowerCase() === colorHex.toLowerCase())?.name}</span>
          </span>
        </div>

        {/* 1. CHANGE CHARACTER */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 text-amber-400 mb-4 pb-2 border-b border-slate-800">
            <UserCheck className="w-5 h-5" />
            <h3 className="font-chakra font-bold text-base text-white uppercase tracking-wider">
              Change Character
            </h3>
          </div>

          {/* Species Picker */}
          <div className="mb-5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
              Select Species
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {dinoTypes.map((dt) => {
                const isSelected = dinoType === dt.id;
                return (
                  <button
                    key={dt.id}
                    onClick={() => setDinoType(dt.id)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400 text-amber-300 shadow-md font-bold'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <span className="font-chakra text-sm block">
                      {dt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Dino Color
              </label>
              <span className="text-xs font-mono text-slate-400">
                {DINO_COLORS.find(c => c.hex.toLowerCase() === colorHex.toLowerCase())?.name}
              </span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {DINO_COLORS.map((c) => {
                const isSelected = colorHex.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    onClick={() => setColorHex(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`h-9 rounded-lg flex items-center justify-center transition-all ${
                      isSelected ? 'ring-3 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-105 opacity-85'
                    }`}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accessories */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
              Headwear & Accessories
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {accessories.map((acc) => {
                const isSelected = accessory === acc.id;
                return (
                  <button
                    key={acc.id}
                    onClick={() => setAccessory(acc.id)}
                    className={`py-2 px-3 rounded-lg border text-xs font-chakra transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    {acc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. NAME */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <label className="font-chakra font-bold text-base text-white uppercase tracking-wider block mb-3">
            Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              maxLength={18}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter player name..."
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-400 px-4 py-3 rounded-xl text-white font-chakra text-base focus:outline-none"
            />
            <button
              type="button"
              onClick={handleRandomName}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold"
              title="Generate Random Name"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Random</span>
            </button>
          </div>
        </div>

        {/* 3. PLAYER ID */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <span className="font-chakra font-bold text-base text-white uppercase tracking-wider block">
              Player Id
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">
              Unique identifier for multiplayer lobbies
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
            <span className="font-mono font-bold text-amber-400 text-base">
              {player.id}
            </span>
            <button
              onClick={handleCopyId}
              className="p-1 hover:text-white text-slate-400 transition-colors cursor-pointer"
              title="Copy Player Id"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Save & Return */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-arcade text-sm rounded-xl font-bold shadow-lg shadow-amber-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
          <span>SAVE CHARACTER</span>
        </button>
      </div>
    </div>
  );
};
