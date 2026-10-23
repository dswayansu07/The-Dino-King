import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Obstacle, ObstacleType, GameSettings } from '../../types/game';
import { soundEngine } from '../../utils/audio';
import { getColorByHex } from '../../utils/colors';
import { Volume2, VolumeX, Eye, ArrowUp, ArrowDown } from 'lucide-react';

interface DinoCanvasProps {
  localPlayer: Player;
  players: Player[];
  roomSeed: number;
  settings: GameSettings;
  onPlayerDead: (finalScore: number, finalDistance: number) => void;
  onUpdateAction: (y: number, isDucking: boolean, distance: number, score: number) => void;
  onToggleSound: () => void;
  isSpectating?: boolean;
}

class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

export const DinoCanvas: React.FC<DinoCanvasProps> = ({
  localPlayer,
  players,
  roomSeed,
  settings,
  onPlayerDead,
  onUpdateAction,
  onToggleSound,
  isSpectating = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Gameplay state
  const [currentScore, setCurrentScore] = useState(0);
  const [isDead, setIsDead] = useState(false);
  const [activeDucking, setActiveDucking] = useState(false);

  // State reference for requestAnimationFrame
  const stateRef = useRef({
    distance: 0,
    score: 0,
    baseSpeed: 7.2,
    speed: 7.2,
    y: 0,
    vy: 0,
    gravity: 0.85,
    jumpPower: 16.5,
    isGrounded: true,
    isDucking: false,
    isDead: false,
    obstacles: [] as Obstacle[],
    nextObstacleDist: 400,
    obstacleIdCounter: 1,
    screenShake: 0,
    runFrame: 0,
    frameTimer: 0,
    lastMilestonePing: 0,
    rng: new SeededRandom(roomSeed),
    clouds: [
      { x: 100, y: 50, scale: 1 },
      { x: 380, y: 70, scale: 0.8 },
      { x: 700, y: 40, scale: 1.2 },
      { x: 1050, y: 65, scale: 0.9 }
    ],
    dustParticles: [] as { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[]
  });

  // Jump handler (Desktop => Space Key Press, Mobile => Tap On Screen)
  const handleJump = useCallback(() => {
    const s = stateRef.current;
    if (s.isDead) return;
    if (s.isGrounded) {
      s.vy = s.jumpPower;
      s.isGrounded = false;
      s.isDucking = false;
      soundEngine.playJump(settings);

      // Dust puff
      for (let i = 0; i < 4; i++) {
        s.dustParticles.push({
          x: 100 + (Math.random() - 0.5) * 16,
          y: 20,
          vx: -s.speed * 0.4 - Math.random() * 2,
          vy: 1 + Math.random() * 2,
          life: 1,
          maxLife: 18,
          size: 3 + Math.random() * 3
        });
      }
    }
  }, [settings]);

  // Duck handler
  const handleDuck = useCallback((isDown: boolean) => {
    const s = stateRef.current;
    if (s.isDead) return;
    s.isDucking = isDown;
    setActiveDucking(isDown);

    if (isDown && !s.isGrounded) {
      s.vy = -18; // fast fall
      soundEngine.playDuck(settings);
    }
  }, [settings]);

  // Desktop => Space Key Press (and ArrowUp / W)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        handleJump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        handleDuck(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        handleDuck(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handleJump, handleDuck]);

  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  // Start BGM
  useEffect(() => {
    soundEngine.startMusic(settings, 1);
    return () => {
      soundEngine.stopMusic();
    };
  }, [settings]);

  // 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const spawnObstacle = (targetDist: number) => {
      const s = stateRef.current;
      const roll = s.rng.next();
      let type: ObstacleType = 'cactus_small';
      let w = 24;
      let h = 48;
      let yOffset = 0;

      if (s.distance > 300 && roll > 0.65) {
        if (roll > 0.85) {
          type = 'pterodactyl_low';
          w = 42;
          h = 30;
          yOffset = 30;
        } else {
          type = 'pterodactyl_high';
          w = 44;
          h = 32;
          yOffset = 62;
        }
      } else if (roll > 0.45) {
        type = 'cactus_double';
        w = 46;
        h = 50;
      } else if (roll > 0.25) {
        type = 'cactus_triple';
        w = 64;
        h = 52;
      } else if (roll > 0.12) {
        type = 'rock';
        w = 34;
        h = 28;
      } else {
        type = 'cactus_small';
        w = 26;
        h = 46;
      }

      s.obstacles.push({
        id: s.obstacleIdCounter++,
        type,
        x: canvas.width + 50,
        y: yOffset,
        width: w,
        height: h,
        wingFrame: 0
      });

      const gap = 380 + s.rng.next() * 320 - Math.min(100, s.distance * 0.03);
      s.nextObstacleDist = targetDist + gap;
    };

    const render = (time: number) => {
      const dt = Math.min(32, time - lastTime) / 16.666;
      lastTime = time;
      const s = stateRef.current;

      const W = canvas.width;
      const H = canvas.height;
      const groundY = H - 90;

      // Spectator mode camera tracking
      if (isSpectating) {
        const currentPlayers = playersRef.current;
        const leader = currentPlayers.find(p => p.status === 'playing') || currentPlayers[0];
        if (leader) {
          s.distance = leader.distance || 0;
          s.score = leader.score || 0;
          setCurrentScore(s.score);
        }
      }

      // Update game physics if alive
      if (!s.isDead && !isSpectating) {
        s.speed = s.baseSpeed + Math.min(8.5, Math.floor(s.distance / 120) * 0.45);
        s.distance += (s.speed * 0.7) * dt;
        s.score = Math.floor(s.distance);

        // Jump physics
        if (!s.isGrounded) {
          s.y += s.vy * dt;
          s.vy -= s.gravity * dt;
          if (s.y <= 0) {
            s.y = 0;
            s.vy = 0;
            s.isGrounded = true;
          }
        }

        // Run animation cycle
        s.frameTimer += dt * (s.speed / 6);
        if (s.frameTimer >= 4) {
          s.runFrame = (s.runFrame + 1) % 4;
          s.frameTimer = 0;
        }

        // Milestone audio ping
        const milestone = Math.floor(s.distance / 100);
        if (milestone > s.lastMilestonePing && milestone > 0) {
          s.lastMilestonePing = milestone;
          soundEngine.playScoreMilestone(settings);
        }

        // Spawn obstacles
        if (s.distance >= s.nextObstacleDist) {
          spawnObstacle(s.distance);
        }

        // Move obstacles & test collisions
        for (let i = s.obstacles.length - 1; i >= 0; i--) {
          const obs = s.obstacles[i];
          obs.x -= s.speed * dt;
          if (obs.type.startsWith('pterodactyl')) {
            obs.wingFrame = Math.floor((time / 140) % 2);
          }

          if (obs.x < -100) {
            s.obstacles.splice(i, 1);
            continue;
          }

          // Collision detection
          const dinoX = 100;
          const dinoW = s.isDucking ? 66 : 46;
          const dinoH = s.isDucking ? 30 : 54;
          const dinoY = groundY - s.y - dinoH;

          const obsY = groundY - obs.y - obs.height;
          const pad = 6;

          const collision =
            dinoX + pad < obs.x + obs.width - pad &&
            dinoX + dinoW - pad > obs.x + pad &&
            dinoY + pad < obsY + obs.height - pad &&
            dinoY + dinoH - pad > obsY + pad;

          if (collision) {
            s.isDead = true;
            s.screenShake = 16;
            setIsDead(true);
            soundEngine.playCrash(settings);
            onPlayerDead(s.score, Math.floor(s.distance));
          }
        }

        // Broadcast action for multiplayer sync (clean 25Hz throttle)
        if (Math.floor(time / 40) % 2 === 0) {
          onUpdateAction(s.y, s.isDucking, Math.floor(s.distance), s.score);
        }

        setCurrentScore(s.score);
      }

      // Update screen shake
      if (s.screenShake > 0) {
        s.screenShake *= 0.88;
        if (s.screenShake < 0.2) s.screenShake = 0;
      }

      // Update particles
      for (let i = s.dustParticles.length - 1; i >= 0; i--) {
        const p = s.dustParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        if (p.life >= p.maxLife) {
          s.dustParticles.splice(i, 1);
        }
      }

      // Render
      ctx.save();
      if (s.screenShake > 0) {
        const sx = (Math.random() - 0.5) * s.screenShake;
        const sy = (Math.random() - 0.5) * s.screenShake;
        ctx.translate(sx, sy);
      }

      // Background Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // Distant Parallax Volcanoes
      ctx.fillStyle = 'rgba(24, 28, 38, 0.7)';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      const volcanoOffset = (s.distance * 0.15) % W;
      const vPeakX = (W * 0.7 - volcanoOffset + W) % W;
      ctx.lineTo(vPeakX - 120, groundY);
      ctx.lineTo(vPeakX, groundY - 140);
      ctx.lineTo(vPeakX + 120, groundY);
      ctx.lineTo(W, groundY);
      ctx.fill();

      // Volcano Glowing Crater
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.beginPath();
      ctx.ellipse(vPeakX, groundY - 140, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (const cloud of s.clouds) {
        const cx = (cloud.x - s.distance * 0.1) % (W + 200);
        const drawX = cx < -100 ? cx + W + 200 : cx;
        ctx.beginPath();
        ctx.arc(drawX, cloud.y, 22 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(drawX + 22 * cloud.scale, cloud.y - 6 * cloud.scale, 28 * cloud.scale, 0, Math.PI * 2);
        ctx.arc(drawX + 48 * cloud.scale, cloud.y, 20 * cloud.scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ground Line & Texture
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(W, groundY);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, groundY, W, H - groundY);

      ctx.fillStyle = '#334155';
      const groundOffset = (s.distance * s.speed * 0.3) % 240;
      for (let i = 0; i < 18; i++) {
        const px = ((i * 80 - groundOffset) + W * 2) % W;
        ctx.fillRect(px, groundY + 12 + (i % 3) * 16, (i % 2 === 0 ? 8 : 4), 2);
      }

      // Dust particles
      ctx.fillStyle = '#64748b';
      for (const p of s.dustParticles) {
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, groundY - p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Obstacles
      for (const obs of s.obstacles) {
        const oy = groundY - obs.y - obs.height;
        if (obs.type.startsWith('cactus')) {
          ctx.fillStyle = '#059669';
          ctx.strokeStyle = '#047857';
          ctx.lineWidth = 2;
          ctx.fillRect(obs.x + 8, oy, obs.width - 16, obs.height);
          ctx.strokeRect(obs.x + 8, oy, obs.width - 16, obs.height);
          if (obs.type === 'cactus_double' || obs.type === 'cactus_triple') {
            ctx.fillRect(obs.x, oy + 12, 10, 8);
            ctx.fillRect(obs.x, oy + 4, 8, 16);
            ctx.fillRect(obs.x + obs.width - 10, oy + 16, 10, 8);
            ctx.fillRect(obs.x + obs.width - 8, oy + 8, 8, 16);
          }
          ctx.fillStyle = '#f43f5e';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, oy + 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'rock') {
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.moveTo(obs.x, groundY);
          ctx.lineTo(obs.x + 8, oy);
          ctx.lineTo(obs.x + obs.width - 6, oy + 4);
          ctx.lineTo(obs.x + obs.width, groundY);
          ctx.closePath();
          ctx.fill();
        } else if (obs.type.startsWith('pterodactyl')) {
          ctx.fillStyle = '#e11d48';
          const wingUp = obs.wingFrame === 1;
          ctx.beginPath();
          ctx.ellipse(obs.x + 20, oy + 16, 14, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(obs.x + 8, oy + 16);
          ctx.lineTo(obs.x - 8, oy + 18);
          ctx.lineTo(obs.x + 8, oy + 22);
          ctx.fill();
          ctx.fillStyle = '#be123c';
          ctx.beginPath();
          if (wingUp) {
            ctx.moveTo(obs.x + 12, oy + 14);
            ctx.lineTo(obs.x + 24, oy - 10);
            ctx.lineTo(obs.x + 34, oy + 14);
          } else {
            ctx.moveTo(obs.x + 12, oy + 14);
            ctx.lineTo(obs.x + 24, oy + 32);
            ctx.lineTo(obs.x + 34, oy + 14);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      // Other Multiplayer Players (Ghost Dinos & Tombstones on track)
      playersRef.current.forEach((p) => {
        if (p.id === localPlayer.id) return;

        const colorInfo = getColorByHex(p.colorHex);
        const isDeadP = p.status === 'dead';
        const distVal = isDeadP ? (p.deathDistance ?? p.distance) : p.distance;
        const relDist = distVal - s.distance;
        const relPixels = relDist / 0.7;
        const ghostX = 100 + relPixels + (p.xOffset || 0);
        const ghostY = groundY - (p.y || 0);

        // Off-screen indicator pill for live opponents ahead or behind
        if (!isDeadP && (ghostX > W + 20 || ghostX < -20)) {
          ctx.save();
          ctx.font = '10px "Space Grotesk", sans-serif';
          const isAhead = ghostX > W + 20;
          const label = isAhead ? `▶ ${p.name} +${Math.round(relDist)}m` : `◀ ${p.name} -${Math.round(-relDist)}m`;
          const tw = ctx.measureText(label).width;
          const badgeX = isAhead ? W - tw - 18 : 12;
          const badgeY = 32 + (p.xOffset || 0) % 40;

          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = colorInfo.hex;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, tw + 12, 18, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = colorInfo.hex;
          ctx.fillText(label, badgeX + 6, badgeY + 12);
          ctx.restore();
          return;
        }

        // On-screen player / tombstone
        if (ghostX >= -60 && ghostX <= W + 60) {
          ctx.save();
          ctx.globalAlpha = isDeadP ? 0.55 : 0.85;

          // Name tag
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = colorInfo.hex;
          ctx.lineWidth = 1.5;
          const tagText = `${p.name} (${Math.floor(distVal)}m)`;
          ctx.font = '10px "Space Grotesk", sans-serif';
          const tw = ctx.measureText(tagText).width;

          ctx.beginPath();
          ctx.roundRect(ghostX - tw / 2 + 20, ghostY - 78, tw + 12, 16, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = colorInfo.hex;
          ctx.fillText(tagText, ghostX - tw / 2 + 26, ghostY - 66);

          if (isDeadP) {
            ctx.fillStyle = '#ef4444';
            ctx.font = '18px "Press Start 2P", monospace';
            ctx.fillText('💀', ghostX + 8, groundY - 10);
          } else {
            ctx.fillStyle = colorInfo.hex;
            if (p.isDucking) {
              ctx.fillRect(ghostX, ghostY - 32, 54, 24);
            } else {
              ctx.fillRect(ghostX + 8, ghostY - 56, 36, 42);
              ctx.fillRect(ghostX + 24, ghostY - 70, 24, 24);
            }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ghostX + 38, p.isDucking ? ghostY - 24 : ghostY - 66, 4, 4);
            ctx.fillRect(ghostX + 14, ghostY - 14, 6, 14);
            ctx.fillRect(ghostX + 28, ghostY - 14, 6, 14);
          }
          ctx.restore();
        }
      });

      // Local Player Dino
      const localColor = getColorByHex(localPlayer.colorHex);
      const dinoX = 100;
      const dinoY = groundY - s.y;
      const legCycle = s.runFrame % 4;
      const lLeg = s.isGrounded ? (legCycle === 1 ? -6 : legCycle === 3 ? 6 : 0) : 4;
      const rLeg = s.isGrounded ? (legCycle === 1 ? 6 : legCycle === 3 ? -6 : 0) : -4;

      ctx.save();
      if (!s.isDead) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        const shadowScale = Math.max(0.3, 1 - s.y / 200);
        ctx.beginPath();
        ctx.ellipse(dinoX + 24, groundY - 2, 22 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (s.isDead) {
        ctx.translate(dinoX + 24, dinoY - 20);
        ctx.rotate(0.5);
        ctx.fillStyle = localColor.hex;
        ctx.fillRect(-20, -14, 48, 28);
        ctx.fillRect(18, -26, 22, 22);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(28, -22);
        ctx.lineTo(36, -14);
        ctx.moveTo(36, -22);
        ctx.lineTo(28, -14);
        ctx.stroke();
        ctx.restore();
      } else if (s.isDucking) {
        ctx.fillStyle = localColor.hex;
        ctx.fillRect(dinoX, dinoY - 32, 58, 22);
        ctx.fillRect(dinoX + 48, dinoY - 28, 22, 18);
        ctx.fillStyle = localColor.secondary;
        ctx.fillRect(dinoX + 16, dinoY - 22, 24, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dinoX + 58, dinoY - 24, 5, 5);
        ctx.fillStyle = localColor.hex;
        ctx.fillRect(dinoX + 16 + lLeg * 0.5, dinoY - 10, 8, 10);
        ctx.fillRect(dinoX + 38 + rLeg * 0.5, dinoY - 10, 8, 10);
        ctx.restore();
      } else {
        ctx.fillStyle = localColor.hex;
        ctx.beginPath();
        ctx.moveTo(dinoX, dinoY - 34);
        ctx.lineTo(dinoX - 18, dinoY - 48);
        ctx.lineTo(dinoX + 10, dinoY - 24);
        ctx.closePath();
        ctx.fill();

        ctx.fillRect(dinoX + 6, dinoY - 54, 38, 40);
        ctx.fillStyle = localColor.secondary;
        ctx.fillRect(dinoX + 22, dinoY - 38, 18, 22);

        ctx.fillStyle = localColor.hex;
        ctx.fillRect(dinoX + 24, dinoY - 72, 28, 26);
        ctx.fillRect(dinoX + 42, dinoY - 68, 14, 16);
        ctx.fillRect(dinoX + 38, dinoY - 42, 8, 6);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(dinoX + 38, dinoY - 66, 6, 6);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(dinoX + 41, dinoY - 65, 3, 3);

        ctx.fillStyle = localColor.hex;
        ctx.fillRect(dinoX + 14 + lLeg, dinoY - 14, 8, 14);
        ctx.fillRect(dinoX + 30 + rLeg, dinoY - 14, 8, 14);

        if (localPlayer.accessory === 'crown') {
          ctx.fillStyle = '#facc15';
          ctx.strokeStyle = '#ca8a04';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dinoX + 28, dinoY - 72);
          ctx.lineTo(dinoX + 32, dinoY - 86);
          ctx.lineTo(dinoX + 38, dinoY - 78);
          ctx.lineTo(dinoX + 44, dinoY - 86);
          ctx.lineTo(dinoX + 50, dinoY - 72);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [roomSeed, localPlayer, settings, onPlayerDead, onUpdateAction, isSpectating]);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden select-none cursor-pointer"
      onClick={() => {
        // Mobile => Tap On Screen (as per instruction: Jump on mobile tap)
        if (!isDead) handleJump();
      }}
      onTouchStart={() => {
        // Mobile => Tap On Screen
        if (!isDead) handleJump();
      }}
    >
      {/* Top Game View Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between px-4 py-2 mb-2">
        <h2 className="text-base sm:text-lg font-bold font-arcade text-amber-400">
          GAME VIEW
        </h2>

        {/* Score as per instruction */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-bold font-mono">
            Score
          </span>
          <span className="text-xl sm:text-2xl font-black font-arcade text-amber-400">
            {currentScore}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isSpectating && (
            <div className="flex items-center gap-1.5 bg-rose-950/80 text-rose-300 border border-rose-800 px-3 py-1.5 rounded-lg text-xs font-semibold animate-pulse">
              <Eye className="w-4 h-4" />
              <span>Spectating</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSound();
            }}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition-colors"
            title="Toggle Sound"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        width={1000}
        height={480}
        className="w-full h-auto max-h-[72vh] object-contain shadow-2xl rounded-xl border border-slate-800"
      />

      {/* Jump Control Instructions Box directly from specification */}
      <div className="w-full max-w-xl mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber-400 uppercase">Jump:</span>
          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-200">
            Desktop =&gt; Space Key Press
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-200">
            Mobile =&gt; Tap On Screen
          </span>
        </div>
      </div>

      {/* Tactile On-Screen Buttons (Mobile convenience) */}
      <div className="w-full max-w-md mt-2 flex items-center justify-between px-4 sm:hidden">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDuck(!activeDucking);
          }}
          className={`flex-1 mr-2 py-3.5 rounded-xl font-bold font-arcade text-xs border transition-all ${
            activeDucking
              ? 'bg-amber-600 border-amber-400 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-200'
          }`}
        >
          <ArrowDown className="w-4 h-4 inline mr-1" />
          <span>DUCK</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleJump();
          }}
          className="flex-1 ml-2 py-3.5 rounded-xl font-bold font-arcade text-xs bg-emerald-600 border border-emerald-400 text-white shadow-lg active:scale-95 transition-all"
        >
          <ArrowUp className="w-4 h-4 inline mr-1" />
          <span>JUMP</span>
        </button>
      </div>
    </div>
  );
};
