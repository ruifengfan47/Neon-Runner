import React, { useState, useEffect, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { GameState, GameScore, Perk } from './types';
import { PERKS, CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<GameScore>({ current: 0, high: 0, shards: 0, level: 1, shardTarget: 10 });
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  
  const [perkOptions, setPerkOptions] = useState<Perk[]>([]);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Input State Ref
  const inputStateRef = useRef({
    left: false,
    right: false,
    jump: false,
    shoot: false,
    interact: false, // New Interaction Key
    mouseX: 0,
    mouseY: 0
  });

  const handleStart = () => {
    setResetTrigger(prev => prev + 1);
    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalScore: number) => {
    setGameState(GameState.GAME_OVER);
    const savedHigh = Number(localStorage.getItem('neon_runner_highscore') || 0);
    if (finalScore > savedHigh) {
      localStorage.setItem('neon_runner_highscore', finalScore.toString());
    }
  };

  const handleLevelUp = () => {
    const shuffled = [...PERKS].sort(() => 0.5 - Math.random());
    setPerkOptions(shuffled.slice(0, 3));
    setGameState(GameState.PAUSED);
  };

  const handleScoreUpdate = (newScore: GameScore, hp: number, maxHp: number) => {
    setScore(newScore);
    setPlayerHp(hp);
    setPlayerMaxHp(maxHp);
  };

  const handleSelectPerk = (perk: Perk) => {
    setSelectedPerk(perk);
    setTimeout(() => {
        setGameState(GameState.PLAYING);
        setSelectedPerk(null);
    }, 50);
  };

  // --- Keyboard & Mouse Input ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'a' || e.key === 'ArrowLeft') inputStateRef.current.left = true;
        if (e.key === 'd' || e.key === 'ArrowRight') inputStateRef.current.right = true;
        if (e.code === 'Space' || e.key === 'w' || e.key === 'ArrowUp') inputStateRef.current.jump = true;
        if (e.key === 'e' || e.key === 'E') inputStateRef.current.interact = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'a' || e.key === 'ArrowLeft') inputStateRef.current.left = false;
        if (e.key === 'd' || e.key === 'ArrowRight') inputStateRef.current.right = false;
        if (e.code === 'Space' || e.key === 'w' || e.key === 'ArrowUp') inputStateRef.current.jump = false;
        if (e.key === 'e' || e.key === 'E') inputStateRef.current.interact = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
        inputStateRef.current.mouseX = e.clientX;
        inputStateRef.current.mouseY = e.clientY;
    };
    
    const handleMouseDown = () => { inputStateRef.current.shoot = true; };
    const handleMouseUp = () => { inputStateRef.current.shoot = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // --- Touch Controls Handlers ---
  const handleTouchJump = () => {
      inputStateRef.current.jump = true;
      setTimeout(() => { inputStateRef.current.jump = false; }, 150);
  };
  
  const handleTouchShoot = (active: boolean) => {
      inputStateRef.current.shoot = active;
  };
  
  const handleMoveLeft = (active: boolean) => { inputStateRef.current.left = active; };
  const handleMoveRight = (active: boolean) => { inputStateRef.current.right = active; };

  return (
    <div className="relative w-screen h-screen bg-zinc-950 overflow-hidden flex items-center justify-center select-none">
      <div id="game-container" className="relative w-full h-full md:max-w-[1200px] md:max-h-[600px] bg-black shadow-2xl border-y md:border border-zinc-800 overflow-hidden cursor-crosshair">
        <GameCanvas 
          gameState={gameState}
          onGameOver={handleGameOver}
          onLevelUp={handleLevelUp}
          onScoreUpdate={handleScoreUpdate}
          selectedPerk={selectedPerk}
          resetTrigger={resetTrigger}
          inputStateRef={inputStateRef}
        />
        
        <UIOverlay 
          gameState={gameState}
          score={score}
          playerHp={playerHp}
          playerMaxHp={playerMaxHp}
          onStart={handleStart}
          onRestart={handleStart}
          perkOptions={perkOptions}
          onSelectPerk={handleSelectPerk}
          onJumpPress={handleTouchJump}
          onShootToggle={handleTouchShoot}
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
        />
      </div>
    </div>
  );
};

export default App;