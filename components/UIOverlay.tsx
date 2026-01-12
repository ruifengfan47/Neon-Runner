import React from 'react';
import { GameState, GameScore, Perk } from '../types';
import { Play, RotateCcw, Shield, Trophy, Zap, ArrowUp, Magnet, Feather, Clock, Heart, Crosshair, MoveLeft, MoveRight, ChevronUp, RefreshCw, Flame } from 'lucide-react';

interface UIOverlayProps {
  gameState: GameState;
  score: GameScore;
  playerHp: number;
  playerMaxHp: number;
  onStart: () => void;
  onRestart: () => void;
  perkOptions: Perk[];
  onSelectPerk: (perk: Perk) => void;
  // Touch Handlers
  onJumpPress: () => void;
  onShootToggle: (active: boolean) => void;
  onMoveLeft: (active: boolean) => void;
  onMoveRight: (active: boolean) => void;
}

const getIcon = (name: string, size = 24) => {
  switch (name) {
    case 'Shield': return <Shield size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'ArrowUp': return <ArrowUp size={size} />;
    case 'Magnet': return <Magnet size={size} />;
    case 'Feather': return <Feather size={size} />;
    case 'Clock': return <Clock size={size} />;
    case 'Crosshair': return <Crosshair size={size} />;
    case 'Heart': return <Heart size={size} />;
    case 'Flame': return <Flame size={size} />;
    default: return <Zap size={size} />;
  }
};

export const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  score,
  playerHp,
  playerMaxHp,
  onStart,
  onRestart,
  perkOptions,
  onSelectPerk,
  onJumpPress,
  onShootToggle,
  onMoveLeft,
  onMoveRight
}) => {
  
  // HUD
  const renderHUD = () => (
    <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start z-10">
      <div className="flex flex-col gap-2">
        {/* Score */}
        <div className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white tracking-widest drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">
          {Math.floor(score.current).toString().padStart(6, '0')}
        </div>
        
        {/* HP Bar */}
        <div className="flex items-center gap-2 group">
            <div className="relative">
                <Heart size={24} className="text-red-500 fill-red-500 animate-pulse" />
                <div className="absolute inset-0 blur-sm bg-red-500 opacity-50"></div>
            </div>
            <div className="w-56 h-6 bg-zinc-900/80 border-2 border-zinc-600 skew-x-[-15deg] overflow-hidden backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <div 
                    className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300 relative"
                    style={{ width: `${Math.max(0, (playerHp / playerMaxHp) * 100)}%` }}
                >
                    <div className="absolute top-0 right-0 w-full h-[2px] bg-white/50"></div>
                </div>
            </div>
            <span className="font-display text-sm text-red-400 font-bold">{Math.ceil(playerHp)}</span>
        </div>
      </div>
      
      {/* XP/Shards */}
      <div className="flex flex-col items-end gap-2">
        <div className="text-sm text-yellow-400 font-display tracking-[0.2em] shadow-black drop-shadow-md">THREAT LEVEL {score.level}</div>
        <div className="flex items-center gap-2">
          <div className="w-56 h-3 bg-zinc-900 border border-yellow-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-400 shadow-[0_0_10px_#facc15]"
              style={{ width: `${(score.shards / score.shardTarget) * 100}%` }}
            />
          </div>
          <Zap className="text-yellow-400" size={18} />
        </div>
      </div>
    </div>
  );

  // Mobile Controls (Styled)
  const renderControls = () => {
    if (gameState !== GameState.PLAYING && gameState !== GameState.BOSS_FIGHT) return null;
    return (
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-end pb-8 px-8">
        <div className="flex justify-between items-end w-full">
            <div className="pointer-events-auto flex gap-6">
                <button 
                    className="w-20 h-20 bg-zinc-900/40 backdrop-blur-md border border-cyan-500/30 rounded-full flex items-center justify-center active:bg-cyan-500/40 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                    onTouchStart={() => onMoveLeft(true)}
                    onTouchEnd={() => onMoveLeft(false)}
                    onMouseDown={() => onMoveLeft(true)}
                    onMouseUp={() => onMoveLeft(false)}
                >
                    <MoveLeft className="text-cyan-400" size={32} />
                </button>
                <button 
                    className="w-20 h-20 bg-zinc-900/40 backdrop-blur-md border border-cyan-500/30 rounded-full flex items-center justify-center active:bg-cyan-500/40 transition-all active:scale-95 shadow-[0_0_15px_rgba(0,255,255,0.1)]"
                    onTouchStart={() => onMoveRight(true)}
                    onTouchEnd={() => onMoveRight(false)}
                    onMouseDown={() => onMoveRight(true)}
                    onMouseUp={() => onMoveRight(false)}
                >
                    <MoveRight className="text-cyan-400" size={32} />
                </button>
            </div>

            <div className="pointer-events-auto flex gap-6 items-end">
                <button 
                    className="w-24 h-24 bg-red-900/30 backdrop-blur-md border-2 border-red-500/50 rounded-full flex items-center justify-center active:bg-red-500/60 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,0,0,0.2)]"
                    onTouchStart={() => onShootToggle(true)}
                    onTouchEnd={() => onShootToggle(false)}
                    onMouseDown={() => onShootToggle(true)}
                    onMouseUp={() => onShootToggle(false)}
                >
                    <Crosshair className="text-red-400" size={40} />
                </button>
                <button 
                    className="w-28 h-28 bg-blue-900/30 backdrop-blur-md border-2 border-blue-500/50 rounded-full flex items-center justify-center active:bg-blue-500/60 transition-all active:scale-95 shadow-[0_0_20px_rgba(0,0,255,0.2)] mb-4"
                    onTouchStart={onJumpPress}
                    onClick={onJumpPress}
                >
                    <ChevronUp className="text-blue-400" size={48} />
                </button>
            </div>
        </div>
      </div>
    );
  };

  if (gameState === GameState.PLAYING || gameState === GameState.BOSS_FIGHT) {
    return (
        <>
            {renderHUD()}
            {renderControls()}
        </>
    );
  }

  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
        <div className="scanlines absolute inset-0 opacity-40"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 to-black pointer-events-none"></div>
        
        <h1 className="text-6xl md:text-9xl font-black font-display text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-700 mb-4 drop-shadow-[0_0_35px_rgba(34,211,238,0.8)] skew-x-[-10deg] tracking-tighter">
          NEON<br/>STRIKE
        </h1>
        <div className="text-red-500 mb-12 text-2xl font-display tracking-[0.5em] uppercase drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">2077 EDITION</div>
        
        <button 
          onClick={onStart}
          className="group relative px-16 py-6 bg-cyan-600/20 text-cyan-400 font-black font-display text-3xl uppercase tracking-widest hover:bg-cyan-500 hover:text-black transition-all skew-x-[-10deg] border-2 border-cyan-500"
        >
          <span className="flex items-center gap-3 skew-x-[10deg]">
            <Play fill="currentColor" size={32} /> MISSION START
          </span>
          <div className="absolute inset-0 bg-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    );
  }

  if (gameState === GameState.PAUSED) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-30 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 to-black pointer-events-none"></div>
        <h2 className="text-5xl font-display font-bold text-yellow-400 mb-2 tracking-widest drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">CYBERNETIC UPGRADE</h2>
        <p className="text-zinc-500 mb-12 font-mono text-lg uppercase tracking-wider">Select Augmentation</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
          {perkOptions.map((perk) => (
            <button
              key={perk.id}
              onClick={() => onSelectPerk(perk)}
              className="relative group bg-zinc-900/80 border border-zinc-700 p-8 hover:border-cyan-400 hover:bg-zinc-800 transition-all text-left flex flex-col gap-6 overflow-hidden hover:-translate-y-2 duration-300"
            >
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cyan-900/10 pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity" />
              
              <div className={`absolute top-0 right-0 px-4 py-2 text-xs font-bold uppercase tracking-wider
                ${perk.rarity === 'legendary' ? 'bg-purple-600 text-white shadow-[0_0_15px_#9333ea]' : 
                  perk.rarity === 'rare' ? 'bg-cyan-600 text-white shadow-[0_0_10px_#0891b2]' : 'bg-zinc-700 text-zinc-300'}
              `}>
                {perk.rarity}
              </div>
              
              <div className={`p-4 rounded-lg w-fit border-2 ${
                 perk.rarity === 'legendary' ? 'border-purple-500 text-purple-400 bg-purple-900/20' : 
                 perk.rarity === 'rare' ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20' : 'border-zinc-500 text-zinc-400 bg-zinc-800/50'
              }`}>
                {getIcon(perk.icon, 48)}
              </div>
              
              <div className="z-10">
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors font-display uppercase tracking-wide">{perk.name}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-mono">{perk.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 backdrop-blur-lg z-30">
        <h2 className="text-7xl font-display font-black text-red-600 mb-4 drop-shadow-[0_0_40px_rgba(220,38,38,0.9)] animate-pulse tracking-widest">FLATLINED</h2>
        
        <div className="bg-black/90 border-2 border-red-600/50 p-12 flex flex-col items-center gap-8 mb-12 min-w-[400px] skew-x-[-5deg] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col items-center skew-x-[5deg]">
            <span className="text-zinc-500 text-sm font-mono mb-2 uppercase tracking-[0.4em]">Final Score</span>
            <span className="text-6xl font-bold text-white font-display">{Math.floor(score.current)}</span>
          </div>
          
          {score.current > score.high && (
            <div className="flex items-center gap-3 text-yellow-400 animate-bounce skew-x-[5deg]">
              <Trophy size={28} />
              <span className="font-bold font-display tracking-wider text-xl">NEW RECORD</span>
            </div>
          )}
        </div>
        
        <button 
          onClick={onRestart}
          className="group px-12 py-5 bg-white hover:bg-red-600 hover:text-white text-black font-bold font-display uppercase tracking-widest transition-all skew-x-[-10deg] shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          <span className="flex items-center gap-3 skew-x-[10deg]">
            <RefreshCw size={24} /> SYSTEM REBOOT
          </span>
        </button>
      </div>
    );
  }

  return null;
};