import React from 'react';
import { GameSettings } from '../../types/game';
import { soundEngine } from '../../utils/audio';
import { X, Volume2, VolumeX, Music, Monitor, Sliders, Smartphone, Keyboard } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose
}) => {
  const handleToggleSound = () => {
    const updated = { ...settings, soundEnabled: !settings.soundEnabled };
    onUpdateSettings(updated);
    if (updated.soundEnabled) soundEngine.playClick(updated);
  };

  const handleToggleMusic = () => {
    const updated = { ...settings, musicEnabled: !settings.musicEnabled };
    onUpdateSettings(updated);
    if (!updated.musicEnabled) {
      soundEngine.stopMusic();
    }
  };

  const handleSoundVolume = (v: number) => {
    onUpdateSettings({ ...settings, soundVolume: v });
  };

  const handleMusicVolume = (v: number) => {
    onUpdateSettings({ ...settings, musicVolume: v });
  };

  const handleTheme = (theme: GameSettings['theme']) => {
    onUpdateSettings({ ...settings, theme });
  };

  const handleScanlines = () => {
    onUpdateSettings({ ...settings, scanlines: !settings.scanlines });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Sliders className="w-5 h-5" />
            <h2 className="font-arcade text-base font-bold text-white">
              GAME SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Sound FX */}
          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-200 font-chakra font-semibold text-sm">
                {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                <span>Sound FX (Jump, Dings, Hits)</span>
              </div>
              <button
                onClick={handleToggleSound}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                  settings.soundEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {settings.soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.soundVolume}
              disabled={!settings.soundEnabled}
              onChange={(e) => handleSoundVolume(Number(e.target.value))}
              className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Music BGM */}
          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-200 font-chakra font-semibold text-sm">
                <Music className="w-4 h-4 text-amber-400" />
                <span>8-Bit Synth Rhythm Music</span>
              </div>
              <button
                onClick={handleToggleMusic}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                  settings.musicEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {settings.musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.musicVolume}
              disabled={!settings.musicEnabled}
              onChange={(e) => handleMusicVolume(Number(e.target.value))}
              className="w-full accent-amber-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Sky Time / Theme */}
          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2.5">
              Prehistoric Sky Atmosphere
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['auto', 'day', 'sunset', 'night'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTheme(t)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-chakra capitalize border transition-all ${
                    settings.theme === t
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Retro CRT Scanlines */}
          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200 font-chakra font-semibold text-sm">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>Retro CRT Scanlines FX</span>
            </div>
            <button
              onClick={handleScanlines}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                settings.scanlines ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-500'
              }`}
            >
              {settings.scanlines ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Controls Reference */}
          <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3">
              Controls Guide
            </span>
            <div className="space-y-2 text-xs text-slate-300 font-mono">
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Keyboard className="w-3.5 h-3.5" /> Desktop Jump:
                </span>
                <span className="text-white font-bold">SPACE / ↑ / W</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-900">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Keyboard className="w-3.5 h-3.5" /> Desktop Duck:
                </span>
                <span className="text-white font-bold">↓ / S</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Smartphone className="w-3.5 h-3.5" /> Mobile:
                </span>
                <span className="text-white font-bold">Tap screen or JUMP/DUCK buttons</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Close */}
        <div className="mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-chakra font-bold text-sm rounded-xl transition-colors cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
