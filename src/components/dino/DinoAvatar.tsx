import React from 'react';
import { DinoType, DinoAccessory } from '../../types/game';
import { getColorByHex } from '../../utils/colors';

interface DinoAvatarProps {
  type: DinoType;
  colorHex: string;
  accessory?: DinoAccessory;
  size?: number;
  isAnimated?: boolean;
  isDucking?: boolean;
  isJumping?: boolean;
  isDead?: boolean;
  className?: string;
  frame?: number; // 0 to 3 for run cycle
}

export const DinoAvatar: React.FC<DinoAvatarProps> = ({
  type = 'trex',
  colorHex,
  accessory = 'none',
  size = 80,
  isDucking = false,
  isJumping = false,
  isDead = false,
  className = '',
  frame = 0
}) => {
  const colorInfo = getColorByHex(colorHex);
  const mainColor = colorInfo.hex;
  const bellyColor = colorInfo.secondary;

  // Running leg alternation
  const legCycle = frame % 4;
  const leftLegOffset = isJumping ? 4 : legCycle === 1 ? -4 : legCycle === 3 ? 4 : 0;
  const rightLegOffset = isJumping ? -2 : legCycle === 1 ? 4 : legCycle === 3 ? -4 : 0;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="overflow-visible"
      >
        <defs>
          <filter id={`dino-glow-${mainColor.replace('#', '')}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>

        <g filter={`url(#dino-glow-${mainColor.replace('#', '')})`}>
          {/* T-REX */}
          {type === 'trex' && (
            <g>
              {!isDucking ? (
                <>
                  {/* Tail */}
                  <path
                    d="M 28 62 C 16 58, 8 46, 6 40 C 14 44, 22 50, 32 56 Z"
                    fill={mainColor}
                  />
                  {/* Body */}
                  <path
                    d="M 28 54 C 28 42, 42 38, 52 42 C 60 45, 64 52, 62 68 C 60 74, 46 76, 34 72 C 28 70, 26 62, 28 54 Z"
                    fill={mainColor}
                  />
                  {/* Belly accent */}
                  <path
                    d="M 44 48 C 50 50, 54 56, 52 68 C 48 72, 40 70, 38 66 C 42 60, 42 54, 44 48 Z"
                    fill={bellyColor}
                  />
                  {/* Neck & Head */}
                  <path
                    d="M 48 44 L 56 26 L 76 26 C 82 26, 84 32, 84 36 L 68 36 C 68 40, 78 40, 76 44 L 58 46 Z"
                    fill={mainColor}
                  />
                  {/* Tiny Arms */}
                  <path
                    d="M 60 52 L 68 54 L 66 58 L 58 56 Z"
                    fill={mainColor}
                  />
                  {/* Eye */}
                  {isDead ? (
                    <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
                      <line x1="68" y1="28" x2="74" y2="34" />
                      <line x1="74" y1="28" x2="68" y2="34" />
                    </g>
                  ) : (
                    <circle cx="70" cy="30" r="3" fill="#ffffff">
                      <circle cx="71" cy="30" r="1.5" fill="#0f172a" />
                    </circle>
                  )}
                  {/* Legs */}
                  {/* Left Leg */}
                  <path
                    d={`M 38 70 L ${36 + leftLegOffset} 84 L ${44 + leftLegOffset} 84 L 42 72 Z`}
                    fill={mainColor}
                  />
                  {/* Right Leg */}
                  <path
                    d={`M 48 70 L ${46 + rightLegOffset} 84 L ${54 + rightLegOffset} 84 L 52 72 Z`}
                    fill={mainColor}
                    opacity="0.85"
                  />
                </>
              ) : (
                /* Ducking T-Rex */
                <>
                  {/* Tail stretched */}
                  <path d="M 20 66 C 10 64, 4 58, 2 54 C 10 56, 18 60, 24 64 Z" fill={mainColor} />
                  {/* Crouched Body */}
                  <path d="M 22 62 C 24 54, 38 52, 54 54 C 66 56, 76 60, 72 70 C 66 76, 36 78, 26 74 Z" fill={mainColor} />
                  {/* Belly */}
                  <path d="M 40 58 C 48 58, 56 62, 54 70 C 48 72, 36 72, 34 68 Z" fill={bellyColor} />
                  {/* Low Head */}
                  <path d="M 64 56 L 86 56 C 90 56, 92 60, 92 64 L 78 64 C 78 68, 86 68, 84 72 L 66 72 Z" fill={mainColor} />
                  {/* Tiny arms */}
                  <path d="M 66 66 L 72 68 L 70 70 Z" fill={mainColor} />
                  {/* Eye */}
                  {isDead ? (
                    <g stroke="#ffffff" strokeWidth="2">
                      <line x1="80" y1="58" x2="86" y2="62" />
                      <line x1="86" y1="58" x2="80" y2="62" />
                    </g>
                  ) : (
                    <circle cx="82" cy="60" r="2.5" fill="#ffffff" />
                  )}
                  {/* Crouched legs */}
                  <path d="M 32 72 L 30 82 L 38 82 Z" fill={mainColor} />
                  <path d="M 48 72 L 46 82 L 54 82 Z" fill={mainColor} opacity="0.85" />
                </>
              )}
            </g>
          )}

          {/* RAPTOR */}
          {type === 'raptor' && (
            <g>
              {!isDucking ? (
                <>
                  {/* Long agile tail */}
                  <path d="M 24 64 C 12 56, 4 42, 2 34 C 12 40, 20 48, 30 58 Z" fill={mainColor} />
                  {/* Slender body */}
                  <path d="M 28 56 C 30 46, 44 42, 54 46 C 62 50, 64 58, 60 70 C 54 76, 38 76, 30 70 Z" fill={mainColor} />
                  {/* Belly */}
                  <path d="M 42 50 C 48 52, 52 58, 50 68 C 44 72, 38 70, 36 64 Z" fill={bellyColor} />
                  {/* Sleek head with crest */}
                  <path d="M 48 46 L 58 24 L 62 18 L 66 24 L 84 26 C 88 28, 88 34, 82 36 L 70 36 L 76 40 L 56 46 Z" fill={mainColor} />
                  {/* Feathered arms */}
                  <path d="M 58 52 L 70 54 L 64 62 L 56 56 Z" fill={mainColor} />
                  {/* Eye */}
                  {isDead ? (
                    <g stroke="#ffffff" strokeWidth="2">
                      <line x1="72" y1="28" x2="78" y2="34" />
                      <line x1="78" y1="28" x2="72" y2="34" />
                    </g>
                  ) : (
                    <circle cx="74" cy="30" r="3" fill="#ffffff">
                      <circle cx="75" cy="30" r="1.5" fill="#0f172a" />
                    </circle>
                  )}
                  {/* High sickle claw leg */}
                  <path d={`M 36 68 L ${32 + leftLegOffset} 84 L ${42 + leftLegOffset} 84 L 40 72 Z`} fill={mainColor} />
                  <path d={`M 46 68 L ${42 + rightLegOffset} 84 L ${52 + rightLegOffset} 84 L 50 72 Z`} fill={mainColor} opacity="0.85" />
                </>
              ) : (
                <>
                  <path d="M 18 64 C 8 60, 2 52, 0 46 C 8 50, 16 56, 24 62 Z" fill={mainColor} />
                  <path d="M 24 60 C 26 52, 40 50, 56 52 C 68 54, 76 60, 72 70 C 66 76, 36 76, 26 72 Z" fill={mainColor} />
                  <path d="M 64 54 L 92 54 L 90 62 L 72 64 Z" fill={mainColor} />
                  <circle cx="82" cy="58" r="2.5" fill="#ffffff" />
                  <path d="M 32 70 L 30 82 L 38 82 Z" fill={mainColor} />
                  <path d="M 48 70 L 46 82 L 54 82 Z" fill={mainColor} opacity="0.85" />
                </>
              )}
            </g>
          )}

          {/* TRICERATOPS */}
          {type === 'tricera' && (
            <g>
              {/* Sturdy body */}
              <path d="M 22 58 C 24 46, 44 42, 60 48 C 66 54, 68 64, 64 72 C 56 78, 30 78, 22 68 Z" fill={mainColor} />
              <path d="M 36 54 C 44 54, 52 58, 52 68 C 44 72, 34 70, 32 64 Z" fill={bellyColor} />
              {/* Frill & Head */}
              <path d="M 54 36 C 54 28, 66 22, 70 28 C 72 32, 70 42, 66 48 L 84 52 C 86 56, 82 62, 74 64 L 62 62 Z" fill={mainColor} />
              {/* Horns */}
              <polygon points="66,28 72,16 70,30" fill="#f8fafc" />
              <polygon points="78,48 88,42 80,52" fill="#f8fafc" />
              {/* Eye */}
              {isDead ? (
                <g stroke="#ffffff" strokeWidth="2">
                  <line x1="70" y1="46" x2="76" y2="52" />
                  <line x1="76" y1="46" x2="70" y2="52" />
                </g>
              ) : (
                <circle cx="72" cy="48" r="2.5" fill="#ffffff" />
              )}
              {/* Robust legs */}
              <rect x={28 + leftLegOffset * 0.5} y="70" width="8" height="14" rx="2" fill={mainColor} />
              <rect x={50 + rightLegOffset * 0.5} y="70" width="8" height="14" rx="2" fill={mainColor} opacity="0.9" />
            </g>
          )}

          {/* STEGOSAURUS */}
          {type === 'stego' && (
            <g>
              {/* Dorsal Back Plates */}
              <polygon points="28,48 32,36 36,48" fill={bellyColor} />
              <polygon points="38,44 44,30 48,44" fill={bellyColor} />
              <polygon points="50,44 56,32 60,46" fill={bellyColor} />
              {/* Body */}
              <path d="M 20 62 C 22 48, 42 44, 62 50 C 68 56, 68 66, 62 72 C 54 78, 28 78, 20 70 Z" fill={mainColor} />
              {/* Spiked Tail */}
              <path d="M 20 64 L 6 56 L 2 54 L 8 62 Z" fill={mainColor} />
              <polygon points="4,54 0,48 6,52" fill="#f8fafc" />
              <polygon points="8,52 6,44 10,50" fill="#f8fafc" />
              {/* Low Head */}
              <path d="M 60 54 L 76 56 C 80 58, 80 64, 74 66 L 62 66 Z" fill={mainColor} />
              {/* Eye */}
              {isDead ? (
                <g stroke="#ffffff" strokeWidth="2">
                  <line x1="70" y1="56" x2="74" y2="62" />
                  <line x1="74" y1="56" x2="70" y2="62" />
                </g>
              ) : (
                <circle cx="72" cy="58" r="2" fill="#ffffff" />
              )}
              {/* 4 Heavy Legs */}
              <rect x={26 + leftLegOffset * 0.5} y="70" width="7" height="14" rx="2" fill={mainColor} />
              <rect x={48 + rightLegOffset * 0.5} y="70" width="7" height="14" rx="2" fill={mainColor} opacity="0.9" />
            </g>
          )}

          {/* PTERODACTYL */}
          {type === 'pterodactyl' && (
            <g>
              {/* Wings animated flapping */}
              <path
                d={
                  frame % 2 === 0
                    ? "M 22 52 C 14 36, 32 30, 48 44 C 64 32, 82 38, 76 52 C 64 48, 54 52, 48 56 C 42 52, 32 48, 22 52 Z"
                    : "M 22 48 C 14 62, 32 60, 48 52 C 64 60, 82 62, 76 48 C 64 44, 54 46, 48 48 C 42 46, 32 44, 22 48 Z"
                }
                fill={mainColor}
              />
              {/* Body */}
              <ellipse cx="48" cy="50" rx="8" ry="14" fill={mainColor} />
              <ellipse cx="48" cy="50" rx="4" ry="9" fill={bellyColor} />
              {/* Head with Long Beak and Crest */}
              <path d="M 44 40 L 40 26 L 46 34 L 56 36 L 74 38 L 56 42 Z" fill={mainColor} />
              {/* Eye */}
              {isDead ? (
                <g stroke="#ffffff" strokeWidth="2">
                  <line x1="48" y1="36" x2="52" y2="40" />
                  <line x1="52" y1="36" x2="48" y2="40" />
                </g>
              ) : (
                <circle cx="50" cy="38" r="2" fill="#ffffff" />
              )}
            </g>
          )}

          {/* ACCESSORIES */}
          {accessory === 'crown' && (
            /* The Dino King Crown */
            <g transform={type === 'pterodactyl' ? 'translate(44, 20) scale(0.65)' : isDucking ? 'translate(74, 44) scale(0.65)' : 'translate(60, 14) scale(0.75)'}>
              <polygon points="0,16 6,0 12,8 18,0 24,16" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
              {/* Jewels */}
              <circle cx="6" cy="4" r="1.5" fill="#ef4444" />
              <circle cx="12" cy="10" r="1.5" fill="#3b82f6" />
              <circle cx="18" cy="4" r="1.5" fill="#ef4444" />
              <rect x="0" y="14" width="24" height="3" fill="#ca8a04" />
            </g>
          )}

          {accessory === 'goggles' && (
            <g transform={type === 'pterodactyl' ? 'translate(44, 34) scale(0.7)' : isDucking ? 'translate(74, 56) scale(0.7)' : 'translate(64, 26) scale(0.75)'}>
              <rect x="0" y="0" width="18" height="8" rx="3" fill="#78350f" />
              <circle cx="4" cy="4" r="3.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1" />
              <circle cx="14" cy="4" r="3.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1" />
              <line x1="-12" y1="4" x2="0" y2="4" stroke="#78350f" strokeWidth="2" />
            </g>
          )}

          {accessory === 'shades' && (
            <g transform={type === 'pterodactyl' ? 'translate(44, 34) scale(0.75)' : isDucking ? 'translate(74, 56) scale(0.75)' : 'translate(64, 27) scale(0.8)'}>
              <rect x="0" y="0" width="10" height="6" fill="#0f172a" />
              <rect x="11" y="0" width="10" height="6" fill="#0f172a" />
              <rect x="9" y="1" width="3" height="2" fill="#0f172a" />
              <line x1="2" y1="2" x2="8" y2="2" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
              <line x1="13" y1="2" x2="19" y2="2" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
            </g>
          )}

          {accessory === 'bandana' && (
            <g transform={type === 'pterodactyl' ? 'translate(42, 42) scale(0.75)' : isDucking ? 'translate(62, 60) scale(0.75)' : 'translate(52, 42) scale(0.8)'}>
              <polygon points="0,0 16,0 8,14" fill="#dc2626" />
              <circle cx="8" cy="4" r="1" fill="#ffffff" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
